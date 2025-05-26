import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, get, query, orderByChild, equalTo,push,set } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

const EspacePersonnelFormateur = () => {
  const navigate = useNavigate();
  const [formateur, setFormateur] = useState(null);
  const [formations, setFormations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    intitule: '',
    description: '',
    duree: '',
    prix: '',
    dateDebut: '',
    dateFin: '',
    categorieId: '',
    typeCollaboration: 'formation_unique',
    modalite: 'présentiel',
  });

  useEffect(() => {
    const formateurData = localStorage.getItem('formateur');
    if (formateurData) {
      try {
        const parsedData = JSON.parse(formateurData);
        console.log('Formateur data:', parsedData); // Débogage
        setFormateur(parsedData);
        fetchFormations(parsedData.uid);
        fetchCategories();
      } catch (error) {
        console.error('Erreur lors de la récupération des données du formateur:', error);
        setError('Erreur lors de la récupération des données du formateur');
        navigate('/formateur-login');
      }
    } else {
      console.warn('Aucune donnée de formateur trouvée dans localStorage');
      navigate('/formateur-login');
    }
  }, [navigate]);

  const fetchCategories = async () => {
    try {
      const categoriesRef = ref(db, 'categories');
      const snapshot = await get(categoriesRef);
      if (snapshot.exists()) {
        const categoriesList = Object.keys(snapshot.val()).map((key) => ({
          id: key,
          ...snapshot.val()[key],
        }));
        console.log('Catégories récupérées:', categoriesList); // Débogage
        setCategories(categoriesList);
        if (categoriesList.length === 0) {
          setError('Aucune catégorie disponible. Veuillez contacter l’administrateur.');
        }
      } else {
        console.warn('Aucune catégorie trouvée dans la base de données');
        setError('Aucune catégorie disponible. Veuillez contacter l’administrateur.');
        setCategories([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      setError('Erreur lors du chargement des catégories: ' + error.message);
      setCategories([]);
    }
  };

  const fetchFormations = async (formateurId) => {
    try {
      const formationsRef = query(
        ref(db, 'formations'),
        orderByChild('formateurId'),
        equalTo(formateurId)
      );
      const snapshot = await get(formationsRef);
      const formationsList = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          formationsList.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });
      }
      console.log('Formations récupérées:', formationsList); // Débogage
      setFormations(formationsList);
    } catch (error) {
      console.error('Erreur lors du chargement des formations:', error);
      setError('Erreur lors du chargement des formations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!formData.intitule || !formData.description || !formData.duree || 
          !formData.dateDebut || !formData.dateFin || !formData.categorieId) {
        setError('Tous les champs obligatoires doivent être remplis');
        return;
      }

      if (new Date(formData.dateFin) <= new Date(formData.dateDebut)) {
        setError('La date de fin doit être postérieure à la date de début');
        return;
      }

      const newFormation = {
        ...formData,
        formateurId: formateur.uid,
        formateurNom: `${formateur.prenom} ${formateur.nom}`,
        formateurEmail: formateur.email,
        statut: 'en_attente',
        dateCreation: new Date().toISOString(),
        etape: 'proposition_initiale',
      };

      const formationsRef = ref(db, 'formations');
      const newFormationRef = push(formationsRef);
      await set(newFormationRef, newFormation);

      setFormData({
        intitule: '',
        description: '',
        duree: '',
        prix: '',
        dateDebut: '',
        dateFin: '',
        categorieId: '',
        typeCollaboration: 'formation_unique',
        modalite: 'présentiel',
      });

      setSuccess('Votre proposition de formation a été soumise avec succès!');
      fetchFormations(formateur.uid);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      setError('Erreur lors de la soumission: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <span className="spinner"></span>
        Chargement en cours...
      </div>
    );
  }

  return (
    <div className="espace-personnel-container">
      <h1>Espace Personnel Formateur</h1>

      <div className="form-section">
        <h2>Formations à compléter</h2>
        {error && <div className="error-message">{error}</div>}
        {formations.filter((f) => f.statut === 'pré-validée').length > 0 ? (
          <div className="formations-list">
            {formations
              .filter((f) => f.statut === 'pré-validée')
              .map((formation) => (
                <div key={formation.id} className="formation-card">
                  <h3>{formation.intitule || 'Formation sans titre'}</h3>
                  <p>Statut: Pré-validée</p>
                  <button
                    className="complete-btn"
                    onClick={() => navigate(`/formateur/complete-formation/${formation.id}`)}
                  >
                    Compléter la formation
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <p>Aucune formation à compléter pour le moment.</p>
        )}
      </div>

      <div className="form-section">
        <h2>Proposer une Nouvelle Formation</h2>
        {success && <div className="success-message">{success}</div>}
        <form onSubmit={handleSubmit} className="formation-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="intitule">Intitulé de la formation*</label>
              <input
                type="text"
                id="intitule"
                name="intitule"
                value={formData.intitule}
                onChange={handleChange}
                required
                placeholder="Ex: Développement Web Avancé"
              />
            </div>

            <div className="form-group">
              <label htmlFor="categorieId">Catégorie*</label>
              <select
                id="categorieId"
                name="categorieId"
                value={formData.categorieId}
                onChange={handleChange}
                required
                disabled={categories.length === 0}
              >
                <option value="">Sélectionnez une catégorie</option>
                {categories.map((categorie) => (
                  <option key={categorie.id} value={categorie.id}>
                    {categorie.nom || 'Catégorie sans nom'}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="error-message">Aucune catégorie disponible.</p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description détaillée*</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="5"
              required
              placeholder="Décrivez les objectifs, le contenu et les compétences visées"
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dateDebut">Date de début*</label>
              <input
                type="date"
                id="dateDebut"
                name="dateDebut"
                value={formData.dateDebut}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="dateFin">Date de fin*</label>
              <input
                type="date"
                id="dateFin"
                name="dateFin"
                value={formData.dateFin}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="duree">Durée (heures)*</label>
              <input
                type="number"
                id="duree"
                name="duree"
                value={formData.duree}
                onChange={handleChange}
                required
                min="1"
                placeholder="Total heures"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="typeCollaboration">Type de collaboration</label>
              <select
                id="typeCollaboration"
                name="typeCollaboration"
                value={formData.typeCollaboration}
                onChange={handleChange}
              >
                <option value="formation_unique">Formation unique</option>
                <option value="collaboration_continue">Collaboration continue</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="modalite">Modalité</label>
              <select
                id="modalite"
                name="modalite"
                value={formData.modalite}
                onChange={handleChange}
              >
                <option value="présentiel">Présentiel</option>
                <option value="en_ligne">En ligne</option>
                <option value="hybride">Hybride</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="prix">Prix suggéré (DT)</label>
              <input
                type="number"
                id="prix"
                name="prix"
                value={formData.prix}
                onChange={handleChange}
                min="0"
                placeholder="Optionnel"
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={categories.length === 0}>
            Soumettre la proposition
          </button>
        </form>
      </div>

      <style jsx>{`
        .espace-personnel-container {
          max-width: 900px;
          margin: 2rem auto;
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
          font-family: Arial, sans-serif;
        }

        h1 {
          font-size: 2rem;
          color: #333;
          text-align: center;
          margin-bottom: 2rem;
        }

        .form-section {
          margin-bottom: 2rem;
        }

        h2 {
          font-size: 1.5rem;
          color: #333;
          margin-bottom: 1rem;
        }

        .error-message, .success-message {
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 4px;
          text-align: center;
        }

        .error-message {
          background: #ffe6e6;
          color: #d32f2f;
        }

        .success-message {
          background: #e6ffed;
          color: #2e7d32;
        }

        .formations-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .formation-card {
          background: white;
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        }

        .formation-card h3 {
          font-size: 1.2rem;
          color: #333;
          margin: 0 0 0.5rem;
        }

        .formation-card p {
          font-size: 0.9rem;
          color: #555;
          margin: 0 0 1rem;
        }

        .complete-btn {
          padding: 0.5rem 1rem;
          background: #0288d1;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .complete-btn:hover {
          background: #0277bd;
        }

        .formation-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-weight: bold;
          color: #555;
          margin-bottom: 0.5rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1rem;
          width: 100%;
        }

        .form-group select:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .form-group textarea {
          resize: vertical;
        }

        .submit-btn {
          padding: 0.75rem;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          align-self: flex-end;
        }

        .submit-btn:disabled {
          background: #b0bec5;
          cursor: not-allowed;
        }

        .submit-btn:hover:not(:disabled) {
          background: #43a047;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: #555;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }

        .spinner {
          border: 2px solid #f3f3f3;
          border-top: 2px solid #0288d1;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EspacePersonnelFormateur;