import React, { useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import { db } from '../firebase';
import { useNavigate, useParams } from 'react-router-dom';

// Fonction pour formater la date si nécessaire
const formatDate = (dateString) => {
  if (!dateString) return 'Non spécifiée';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString();
  } catch (error) {
    return dateString;
  }
};

const FormationDetails = () => {
  const { formationId } = useParams();
  const [formation, setFormation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formateur, setFormateur] = useState(null);

  useEffect(() => {
    const fetchFormationDetails = async () => {
      try {
        // Vérifier d'abord le localStorage
        const storedFormation = localStorage.getItem('currentFormationDetails');
        if (storedFormation) {
          setFormation(JSON.parse(storedFormation));
          setLoading(false);
          return;
        }

        // Si pas dans le localStorage, chercher dans Firebase
        const categoriesRef = ref(db, 'categories');
        const snapshot = await get(categoriesRef);

        if (snapshot.exists()) {
          const categoriesData = snapshot.val();
          let foundFormation = null;
          let categoryName = '';

          // Parcourir toutes les catégories pour trouver la formation
          for (const categoryId in categoriesData) {
            if (categoriesData[categoryId].formations) {
              for (const fId in categoriesData[categoryId].formations) {
                if (fId === formationId) {
                  foundFormation = categoriesData[categoryId].formations[fId];
                  categoryName = categoriesData[categoryId].nom || categoryId;
                  foundFormation.id = fId;
                  foundFormation.categoryId = categoryId;
                  foundFormation.categoryName = categoryName;
                  break;
                }
              }
              if (foundFormation) break;
            }
          }

          if (foundFormation) {
            setFormation(foundFormation);
            // Stocker dans le localStorage pour un accès ultérieur
            localStorage.setItem('currentFormationDetails', JSON.stringify(foundFormation));
          } else {
            setError('Formation non trouvée');
          }
        }
      } catch (err) {
        console.error("Erreur lors du chargement des détails de la formation :", err);
        setError("Erreur lors du chargement des détails de la formation");
      } finally {
        setLoading(false);
      }
    };

    const fetchFormateur = async () => {
      if (!formation?.formateurId) return;
      
      try {
        const formateurRef = ref(db, `utilisateurs/formateurs/${formation.formateurId}`);
        const snapshot = await get(formateurRef);
        
        if (snapshot.exists()) {
          setFormateur(snapshot.val());
        }
      } catch (err) {
        console.error("Erreur lors du chargement du formateur :", err);
      }
    };

    fetchFormationDetails();
    if (formation) {
      fetchFormateur();
    }
  }, [formationId, formation?.formateurId]);

  if (loading) {
    return <div className="loading">Chargement en cours...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!formation) {
    return <div className="no-formation">Aucune information disponible pour cette formation</div>;
  }

  return (
    <div className="formation-details-container">
      <h1>{formation.titre}</h1>
      
      <div className="formation-header">
        {formation.image && (
          <img src={formation.image} alt={formation.titre} className="formation-image" />
        )}
        
        <div className="formation-meta">
          <p><strong>Catégorie:</strong> {formation.categoryName}</p>
          <p><strong>Formateur:</strong> {formateur ? `${formateur.prenom} ${formateur.nom}` : 'Non spécifié'}</p>
          <p><strong>Date de début:</strong> {formatDate(formation.dateDebut)}</p>
          <p><strong>Date de fin:</strong> {formatDate(formation.dateFin)}</p>
          <p><strong>Durée:</strong> {formation.duree} heures</p>
          <p><strong>Prix:</strong> {formation.prix} DH</p>
          <p><strong>Places disponibles:</strong> {formation.places}</p>
        </div>
      </div>
      
      <div className="formation-content">
        <section>
          <h2>Description</h2>
          <p>{formation.description || 'Non spécifiée'}</p>
        </section>
        
        <section>
          <h2>Objectifs</h2>
          <p>{formation.objectifs || 'Non spécifiés'}</p>
        </section>
        
        <section>
          <h2>Public cible</h2>
          <p>{formation.public || 'Non spécifié'}</p>
        </section>
        
        <section>
          <h2>Prérequis</h2>
          <p>{formation.prerequis || 'Aucun prérequis spécifié'}</p>
        </section>
        
        {formation.modules && formation.modules.length > 0 && (
          <section>
            <h2>Programme</h2>
            <ul className="modules-list">
              {formation.modules.map((module, index) => (
                <li key={module.id || index}>
                  <h3>{module.titre} ({module.duree} heures)</h3>
                  <p>{module.description}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
        
        <section>
          <h2>Méthode d'évaluation</h2>
          <p>{formation.evaluation || 'Non spécifiée'}</p>
        </section>
        
        <section>
          <h2>Certification</h2>
          <p>{formation.certification || 'Non spécifiée'}</p>
        </section>
        
        <section>
          <h2>Matériel nécessaire</h2>
          <p>{formation.materiel || 'Non spécifié'}</p>
        </section>
        
        <section>
          <h2>Horaires</h2>
          <p>{formation.horaires || 'Non spécifiés'}</p>
        </section>
        
        <section>
          <h2>Lieu</h2>
          <p>{formation.location || 'Non spécifié'}</p>
        </section>
      </div>
      
      <style jsx="true">{`
        .formation-details-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
          background-color: #f8f9fa;
        }
        
        h1 {
          color: #1a5276;
          border-bottom: 3px solid #f1c40f;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        
        h2 {
          color: #1a5276;
          border-left: 4px solid #f1c40f;
          padding-left: 10px;
          margin-top: 30px;
        }
        
        .formation-header {
          display: flex;
          gap: 30px;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }
        
        .formation-image {
          max-width: 400px;
          max-height: 300px;
          object-fit: cover;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        
        .formation-meta {
          flex: 1;
          min-width: 300px;
        }
        
        .formation-meta p {
          margin: 10px 0;
          font-size: 1.1em;
        }
        
        .formation-content {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        
        .modules-list {
          list-style-type: none;
          padding: 0;
        }
        
        .modules-list li {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        
        .modules-list li:last-child {
          border-bottom: none;
        }
        
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 1.2em;
          color: #3498db;
        }
        
        .error {
          background-color: #f8d7da;
          color: #721c24;
          padding: 10px;
          border-radius: 4px;
          margin: 20px 0;
        }
        
        .no-formation {
          text-align: center;
          padding: 20px;
          font-size: 1.2em;
          color: #666;
        }
        
        @media (max-width: 768px) {
          .formation-header {
            flex-direction: column;
          }
          
          .formation-image {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

const EspacePersonnelEtudiant = () => {
  const navigate = useNavigate();
  const [formations, setFormations] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formateurs, setFormateurs] = useState({});
  const etudiant = JSON.parse(localStorage.getItem('etudiant'));

  const fetchFormateurs = async () => {
    try {
      const formateursRef = ref(db, 'utilisateurs/formateurs');
      const snapshot = await get(formateursRef);
      
      if (snapshot.exists()) {
        setFormateurs(snapshot.val());
      }
    } catch (err) {
      console.error("Erreur lors du chargement des formateurs :", err);
    }
  };

  const fetchFormations = async () => {
    try {
      const formationsRef = ref(db, 'categories');
      const snapshot = await get(formationsRef);

      if (snapshot.exists()) {
        const categoriesData = snapshot.val();
        let allFormations = [];
        const categoriesList = [{id: 'all', nom: 'Toutes les catégories'}];

        Object.keys(categoriesData).forEach(categoryId => {
          const categoryName = categoriesData[categoryId].nom || categoryId;
          categoriesList.push({id: categoryId, nom: categoryName});

          if (categoriesData[categoryId].formations) {
            Object.keys(categoriesData[categoryId].formations).forEach(formationId => {
              const formation = categoriesData[categoryId].formations[formationId];
              
              if (formation.statut === 'active' || formation.statut === 'validée' || formation.statut === 'publiée') {
                allFormations.push({
                  id: formationId,
                  categoryId,
                  categoryName,
                  formateurId: formation.formateurId,
                  ...formation
                });
              }
            });
          }
        });

        setFormations(allFormations);
        setCategories(categoriesList);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des formations :", err);
      setError("Erreur lors du chargement des formations");
    }
  };

  const fetchInscriptions = async () => {
    try {
      if (!etudiant?.uid) return;
      
      const inscriptionsRef = ref(db, `inscriptions/${etudiant.uid}`);
      const snapshot = await get(inscriptionsRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const listeInscriptions = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          statut: data[key].statut || 'en attente'
        }));
        setInscriptions(listeInscriptions);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des inscriptions :", err);
      setError("Erreur lors du chargement de vos inscriptions");
    }
  };

 const handleInscription = (formationId) => {
  // Vérifier si l'utilisateur est authentifié
  if (!etudiant || !etudiant.uid) {
    // Stocker la formation cible pour redirection après login
    localStorage.setItem('redirectAfterLogin', `/etudiant/depot-documents/${formationId}`);
    // Stocker également l'ID de la formation pour l'utiliser après la connexion
    localStorage.setItem('pendingFormationId', formationId);
    navigate('/connexion/etudiant');
    return;
  }
  
  // Si déjà authentifié, aller directement à la page de dépôt
  navigate(`/etudiant/depot-documents/${formationId}`);
};

  const handleViewDetails = (formationId) => {
    localStorage.setItem('currentFormationId', formationId);
    const formation = formations.find(f => f.id === formationId);
    if (formation) {
      localStorage.setItem('currentFormationDetails', JSON.stringify(formation));
    }
    navigate(`/formation-details/${formationId}`);
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchFormateurs();
      await fetchFormations();
      
      if (etudiant) {
        await fetchInscriptions();
      }
      
      setLoading(false);
    };

    loadData();
  }, []);

  const filteredFormations = selectedCategory === 'all' 
    ? formations 
    : formations.filter(formation => formation.categoryId === selectedCategory);

  if (loading) {
    return <div className="loading">Chargement en cours...</div>;
  }

  return (
    <div className="container">
      <h1>Espace Personnel Étudiant</h1>
      
      {error && <div className="error">{error}</div>}

      <section>
        <h2>Formations Disponibles</h2>
        
        <div className="filters">
          <label htmlFor="category-filter">Filtrer par catégorie:</label>
          <select 
            id="category-filter" 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="table-container">
          <table className="formations-table">
            <thead>
              <tr>
                <th>Formation</th>
                <th>Catégorie</th>
                <th>Formateur</th>
                <th>Date Début</th>
                <th>Date Fin</th>
                <th>Prix (DH)</th>
                <th>Places</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFormations.length > 0 ? (
                filteredFormations.map(formation => {
                  const inscription = inscriptions.find(i => i.formationId === formation.id);
                  const statut = inscription?.statut;
                  
                  let formateurNom = '';
                  
                  if (formation.formateurId) {
                    const formateur = formateurs[formation.formateurId];
                    if (formateur) {
                      formateurNom = `${formateur.prenom || ''} ${formateur.nom || ''}`.trim();
                    }
                  }

                  return (
                    <tr key={formation.id}>
                      <td>{formation.titre}</td>
                      <td>{formation.categoryName}</td>
                      <td>{formateurNom || 'Non spécifié'}</td>
                      <td>{formatDate(formation.dateDebut)}</td>
                      <td>{formatDate(formation.dateFin)}</td>
                      <td>{formation.prix}</td>
                      <td>{formation.places}</td>
                      <td className="actions-cell">
                        <button 
                          onClick={() => handleViewDetails(formation.id)}
                          className="view-btn"
                        >
                          Voir détails
                        </button>
                        {statut ? (
                          <span className={`status ${statut}`}>
                            {statut}
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleInscription(formation.id)}
                            className="inscription-btn"
                          >
                            S'inscrire
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">Aucune formation disponible dans cette catégorie</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {etudiant && (
        <section>
          <h2>Mes Inscriptions</h2>
          {inscriptions.length > 0 ? (
            <div className="table-container">
              <table className="inscriptions-table">
                <thead>
                  <tr>
                    <th>Formation</th>
                    <th>Date d'inscription</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {inscriptions.map(inscription => {
                    const formation = formations.find(f => f.id === inscription.formationId);
                    
                    return (
                      <tr key={inscription.id}>
                        <td>{formation ? formation.titre : 'Formation non disponible'}</td>
                        <td>{formatDate(inscription.dateInscription)}</td>
                        <td><span className={`status ${inscription.statut}`}>{inscription.statut}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Aucune inscription</p>
          )}
        </section>
      )}

      <style jsx="true">{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
          background-color: #f8f9fa;
        }

        h1, h2 {
          color: #2c3e50;
          margin-bottom: 20px;
        }

        h1 {
          color: #1a5276;
          border-bottom: 3px solid #f1c40f;
          padding-bottom: 10px;
        }

        h2 {
          color: #1a5276;
          border-left: 4px solid #f1c40f;
          padding-left: 10px;
        }

        section {
          background-color: #fff;
          padding: 20px;
          margin-bottom: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .filters {
          margin-bottom: 20px;
          display: flex;
          align-items: center;
        }

        .filters label {
          margin-right: 10px;
          font-weight: bold;
        }

        .filters select {
          padding: 8px;
          border-radius: 4px;
          border: 1px solid #ddd;
          background-color: white;
          min-width: 200px;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }

        th, td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        th {
          background-color: #f2f6fa;
          color: #2c3e50;
          font-weight: bold;
        }

        tr:hover {
          background-color: #f5f5f5;
        }

        .no-data {
          text-align: center;
          color: #999;
          padding: 20px;
        }

        .actions-cell {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        button {
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          transition: background-color 0.3s;
        }

        .view-btn {
          background-color: #3498db;
          color: white;
        }

        .view-btn:hover {
          background-color: #2980b9;
        }

        .inscription-btn {
          background-color: #2ecc71;
          color: white;
        }

        .inscription-btn:hover {
          background-color: #27ae60;
        }

        .status {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 0.9em;
          text-transform: capitalize;
        }

        .status.en.attente, .status.en.attente {
          background-color: #f39c12;
          color: white;
        }

        .status.validée, .status.acceptée {
          background-color: #2ecc71;
          color: white;
        }

        .status.refusée {
          background-color: #e74c3c;
          color: white;
        }

        .status.annulée {
          background-color: #95a5a6;
          color: white;
        }

        .error {
          background-color: #f8d7da;
          color: #721c24;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 1.2em;
          color: #3498db;
        }

        @media (max-width: 768px) {
          .container {
            padding: 10px;
          }
          
          th, td {
            padding: 8px;
          }
          
          .actions-cell {
            flex-direction: column;
          }
          
          button {
            width: 100%;
            margin-bottom: 5px;
          }
        }
      `}</style>
    </div>
  );
};

export { EspacePersonnelEtudiant, FormationDetails };