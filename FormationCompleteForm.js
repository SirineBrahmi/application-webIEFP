
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, get, update } from 'firebase/database';
import axios from 'axios';

const CompleteFormation = () => {
  const { formationId } = useParams();
  const navigate = useNavigate();
  const [formation, setFormation] = useState(null);
  const [categories, setCategories] = useState([]);
  const [modules, setModules] = useState([{ titre: '', description: '', duree: '' }]);
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
    modalite: 'présentiel',
    materiel: '',
    evaluation: '',
    certification: '',
    imageUrl: '',
    places: '',
  });

  // Charger la formation et les catégories
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Récupérer la formation
        const formationRef = ref(db, `formations/${formationId}`);
        const formationSnap = await get(formationRef);
        if (formationSnap.exists()) {
          const formationData = formationSnap.val();
          console.log('Formation récupérée:', formationData); // Débogage
          setFormation(formationData);
          setFormData({
            intitule: formationData.intitule || '',
            description: formationData.description || '',
            duree: formationData.duree || '',
            prix: formationData.prix || '',
            dateDebut: formationData.dateDebut || '',
            dateFin: formationData.dateFin || '',
            categorieId: formationData.categorieId || '',
            modalite: formationData.modalite || 'présentiel',
            materiel: formationData.materiel || '',
            evaluation: formationData.evaluation || '',
            certification: formationData.certification || '',
            imageUrl: formationData.imageUrl || '',
            places: formationData.places || '',
          });
          if (formationData.modules) {
            setModules(formationData.modules);
          }
        } else {
          setError('Formation non trouvée');
          navigate('/formateur/espace-personnel');
        }

        // Récupérer les catégories
        const categoriesRef = ref(db, 'categories');
        const categoriesSnap = await get(categoriesRef);
        if (categoriesSnap.exists()) {
          const categoriesList = Object.keys(categoriesSnap.val()).map((key) => ({
            id: key,
            ...categoriesSnap.val()[key],
          }));
          console.log('Catégories récupérées:', categoriesList); // Débogage
          setCategories(categoriesList);
          if (categoriesList.length === 0) {
            setError('Aucune catégorie disponible. Veuillez contacter l’administrateur.');
          }
        } else {
          setError('Aucune catégorie disponible. Veuillez contacter l’administrateur.');
          setCategories([]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setError('Erreur lors du chargement: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formationId, navigate]);

  // Trouver le nom de la catégorie à partir de l'ID
  const getCategoryName = (categorieId) => {
    console.log('Recherche catégorie pour ID:', categorieId); // Débogage
    const category = categories.find((cat) => cat.id === categorieId);
    if (!category) {
      console.log('Catégorie non trouvée pour ID:', categorieId);
      return 'Catégorie non spécifiée';
    }
    const categoryName = category.nom || category.name || 'Catégorie sans nom';
    console.log('Nom de la catégorie:', categoryName); // Débogage
    return categoryName;
  };

  // Gérer les changements dans les champs du formulaire
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Gérer les changements dans les modules
  const handleModuleChange = (index, field, value) => {
    const updatedModules = [...modules];
    updatedModules[index][field] = value;
    setModules(updatedModules);
  };

  // Ajouter un nouveau module
  const addModule = () => {
    setModules([...modules, { titre: '', description: '', duree: '' }]);
  };

  // Supprimer un module
  const removeModule = (index) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  // Soumettre les modifications
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!formData.intitule || !formData.description || !formData.duree || 
          !formData.dateDebut || !formData.dateFin || !formData.categorieId || !formData.places) {
        setError('Tous les champs obligatoires doivent être remplis, y compris le nombre de places');
        return;
      }

      if (new Date(formData.dateFin) <= new Date(formData.dateDebut)) {
        setError('La date de fin doit être postérieure à la date de début');
        return;
      }

      if (parseInt(formData.places, 10) <= 0) {
        setError('Le nombre de places doit être supérieur à 0');
        return;
      }

      if (modules.some((module) => !module.titre || !module.description || !module.duree)) {
        setError('Tous les modules doivent avoir un titre, une description et une durée');
        return;
      }

      const updatedFormation = {
        ...formData,
        modules,
        places: parseInt(formData.places, 10), // Ensure places is an integer
        statut: 'validée',
        etape: 'complétée',
        dateMaj: new Date().toISOString(),
      };

      // Mettre à jour la formation
      const formationRef = ref(db, `formations/${formationId}`);
      await update(formationRef, updatedFormation);

      // Mettre à jour le nœud categories/:categorieId/formations/:formationId
      const categorieRef = ref(db, `categories/${formData.categorieId}/formations/${formationId}`);
      await update(categorieRef, {
        ...updatedFormation,
        dateMaj: new Date().toISOString(),
      });

      // Envoyer une notification par email
      const formateurData = JSON.parse(localStorage.getItem('formateur'));
      if (formateurData && formateurData.email) {
        await axios.post('http://localhost:5000/send-email', {
          to: formateurData.email,
          subject: 'Formation soumise pour validation',
          text: `Votre formation "${formData.intitule}" a été soumise avec succès pour validation finale. Vous serez notifié lorsque l'administrateur aura examiné votre proposition.`,
        });
      }

      setSuccess('Formation complétée avec succès !');
      setTimeout(() => navigate('/formateur/espace-personnel'), 2000);
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

  if (!formation) {
    return <div className="error-message">Formation non trouvée</div>;
  }

  return (
    <div className="complete-formation-container">
      <h1>Compléter la Formation</h1>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="formation-form">
        <div className="form-section">
          <h2>Informations de base</h2>
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
              <input
                type="text"
                id="categorieId"
                value={getCategoryName(formData.categorieId)}
                readOnly
                className="read-only"
              />
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
        </div>

        <div className="form-section">
          <h2>Organisation</h2>
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
              <label htmlFor="places">Nombre de places*</label>
              <input
                type="number"
                id="places"
                name="places"
                value={formData.places}
                onChange={handleChange}
                required
                min="1"
                placeholder="Ex: 20"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Modules de la Formation</h2>
          {modules.map((module, index) => (
            <div key={index} className="module-group">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor={`module-titre-${index}`}>Titre du module*</label>
                  <input
                    type="text"
                    id={`module-titre-${index}`}
                    value={module.titre}
                    onChange={(e) => handleModuleChange(index, 'titre', e.target.value)}
                    required
                    placeholder="Ex: Introduction au JavaScript"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`module-duree-${index}`}>Durée (heures)*</label>
                  <input
                    type="number"
                    id={`module-duree-${index}`}
                    value={module.duree}
                    onChange={(e) => handleModuleChange(index, 'duree', e.target.value)}
                    required
                    min="1"
                    placeholder="Ex: 10"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor={`module-description-${index}`}>Description*</label>
                <textarea
                  id={`module-description-${index}`}
                  value={module.description}
                  onChange={(e) => handleModuleChange(index, 'description', e.target.value)}
                  rows="3"
                  required
                  placeholder="Décrivez le contenu du module"
                ></textarea>
              </div>

              {modules.length > 1 && (
                <button
                  type="button"
                  className="remove-module-btn"
                  onClick={() => removeModule(index)}
                >
                  Supprimer le module
                </button>
              )}
            </div>
          ))}

          <button type="button" className="add-module-btn" onClick={addModule}>
            Ajouter un module
          </button>
        </div>

        <div className="form-section">
          <h2>Informations complémentaires</h2>
          <div className="form-group">
            <label htmlFor="materiel">Matériel nécessaire</label>
            <input
              type="text"
              id="materiel"
              name="materiel"
              value={formData.materiel}
              onChange={handleChange}
              placeholder="Ex: Ordinateur portable, logiciels spécifiques..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="evaluation">Méthode d'évaluation</label>
              <input
                type="text"
                id="evaluation"
                name="evaluation"
                value={formData.evaluation}
                onChange={handleChange}
                placeholder="Ex: Projet final, QCM, Examen pratique..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="certification">Certification</label>
              <input
                type="text"
                id="certification"
                name="certification"
                value={formData.certification}
                onChange={handleChange}
                placeholder="Ex: Attestation de réussite, Certificat..."
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="imageUrl">URL de l'image de présentation</label>
            <input
              type="url"
              id="imageUrl"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate('/formateur/espace-personnel')}
          >
            Annuler
          </button>
          <button type="submit" className="submit-btn" disabled={categories.length === 0}>
            Soumettre la formation complétée
          </button>
        </div>
      </form>

      <style jsx>{`
        .complete-formation-container {
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

        .formation-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-section {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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

        .form-group input, .form-group select, .form-group textarea {
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1rem;
          width: 100%;
        }

        .form-group input.read-only {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .form-group select:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .form-group textarea {
          resize: vertical;
        }

        .module-group {
          border: 1px solid #e0e0e0;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .add-module-btn, .remove-module-btn, .cancel-btn, .submit-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .add-module-btn {
          background: #0288d1;
          color: white;
          align-self: flex-start;
        }

        .add-module-btn:hover {
          background: #0277bd;
        }

        .remove-module-btn {
          background: #d32f2f;
          color: white;
        }

        .remove-module-btn:hover {
          background: #c62828;
        }

        .cancel-btn {
          background: #eceff1;
          color: #455a64;
        }

        .cancel-btn:hover {
          background: #cfd8dc;
        }

        .submit-btn {
          background: #4caf50;
          color: white;
        }

        .submit-btn:disabled {
          background: #b0bec5;
          cursor: not-allowed;
        }

        .submit-btn:hover:not(:disabled) {
          background: #43a047;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
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

export default CompleteFormation;
