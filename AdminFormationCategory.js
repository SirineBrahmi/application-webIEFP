import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, get, update, set } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

const AdminFormationCategory = () => {
  const { category, formationId } = useParams();
  const navigate = useNavigate();
  
  const [formation, setFormation] = useState(null);
  const [formateur, setFormateur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    objectifs: '',
    prerequis: '',
    public: '',
    duree: '',
    prix: '',
    dateDebut: '',
    dateFin: '',
    horaires: '',
    location: '',
    places: '',
    modules: [{ id: uuidv4(), titre: '', description: '', duree: '' }],
    materiel: '',
    evaluation: '',
    certification: '',
    image: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchFormationData();
  }, [formationId]);

  const fetchFormationData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Récupération des données de la formation
      const formationRef = ref(db, `formations/${formationId}`);
      const formationSnap = await get(formationRef);
      
      if (!formationSnap.exists()) {
        throw new Error("Formation introuvable");
      }
      
      const formationData = formationSnap.val();
      setFormation(formationData);
      
      // Récupération des données du formateur
      const formateurId = formationData.formateurId || formationData.idFormateur;
      if (formateurId) {
        const formateurRef = ref(db, `utilisateurs/formateurs/${formateurId}`);
        const formateurSnap = await get(formateurRef);
        
        if (formateurSnap.exists()) {
          setFormateur(formateurSnap.val());
        }
      }
      
      // Tentative de récupération des données de catégorie
      const categoryRef = ref(db, `categories/${category}/formations/${formationId}`);
      const categorySnap = await get(categoryRef);
      
      if (categorySnap.exists()) {
        const categoryData = categorySnap.val();
        setFormData(prev => ({
          ...prev,
          ...categoryData,
          modules: categoryData.modules || [{ id: uuidv4(), titre: '', description: '', duree: '' }]
        }));
      } else {
        // Initialisation avec les données de base de la formation
        setFormData(prev => ({
          ...prev,
          titre: formationData.specialite || '',
          description: formationData.description || '',
          prix: formationData.prix || '',
          dateDebut: formationData.dateDebut || '',
          dateFin: formationData.dateFin || '',
          duree: formationData.duree || '',
        }));
      }
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
      setError(err.message || "Une erreur est survenue lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleModuleChange = (index, field, value) => {
    const updatedModules = [...formData.modules];
    updatedModules[index] = {
      ...updatedModules[index],
      [field]: value
    };
    setFormData({
      ...formData,
      modules: updatedModules
    });
  };

  const addModule = () => {
    setFormData({
      ...formData,
      modules: [...formData.modules, { id: uuidv4(), titre: '', description: '', duree: '' }]
    });
  };

  const removeModule = (index) => {
    const updatedModules = [...formData.modules];
    updatedModules.splice(index, 1);
    setFormData({
      ...formData,
      modules: updatedModules.length > 0 ? updatedModules : [{ id: uuidv4(), titre: '', description: '', duree: '' }]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Validation des données requises
      if (!formData.titre || !formData.description || !formData.prix) {
        throw new Error("Les champs Titre, Description et Prix sont obligatoires");
      }

      // Sauvegarde des données de catégorie
      const categoryRef = ref(db, `categories/${category}/formations/${formationId}`);
      const formateurId = formation.formateurId || formation.idFormateur;
      
      await set(categoryRef, {
        ...formData,
        formateurId: formateurId,
        dateCreation: new Date().toISOString(),
        statut: 'active'
      });
      
      // Mise à jour de la formation principale
      const formationRef = ref(db, `formations/${formationId}`);
      await update(formationRef, {
        categorie: category
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);
      setError(err.message || "Une erreur est survenue lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryName = () => {
    const categoryNames = {
      'langue': 'Langue',
      'accelerer': 'Accélérer',
      'logiciel': 'Logiciel',
      'certificats-interne': 'Certificats Internes'
    };
    return categoryNames[category] || category;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement des données...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-alert">{error}</div>
        <button 
          className="back-button"
          onClick={() => navigate('/admin/dashboard')}
        >
          ← Retour aux formations
        </button>
      </div>
    );
  }

  return (
    <div className="admin-formation-category">
      <div className="category-header">
        <button 
          className="back-button"
          onClick={() => navigate('/admin/dashboard')}
        >
          ← Retour aux formations
        </button>
        
        <h2>Configuration de formation - {getCategoryName()}</h2>
        
        {formation && (
          <div className="formation-badge">
            Formation: <span>{formation.specialite}</span>
          </div>
        )}
      </div>
      
      <div className="category-content">
        <div className="formateur-overview">
          <h3>Formateur</h3>
          {formateur ? (
            <div className="formateur-card">
              {formateur.photoURL && (
                <img 
                  src={formateur.photoURL} 
                  alt={`${formateur.prenom} ${formateur.nom}`} 
                  className="formateur-photo"
                />
              )}
              <div className="formateur-info">
                <h4>{formateur.prenom} {formateur.nom}</h4>
                <p>{formateur.email}</p>
                <p>{formateur.numtel}</p>
              </div>
            </div>
          ) : (
            <p>Informations du formateur non disponibles</p>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="category-form">
          <div className="form-section">
            <h3>Informations générales</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="titre">Titre*</label>
                <input
                  type="text"
                  id="titre"
                  name="titre"
                  value={formData.titre}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="prix">Prix (DH)*</label>
                <input
                  type="number"
                  id="prix"
                  name="prix"
                  value={formData.prix}
                  onChange={handleChange}
                  required
                  min="0"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description*</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                required
              ></textarea>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="objectifs">Objectifs</label>
                <textarea
                  id="objectifs"
                  name="objectifs"
                  value={formData.objectifs}
                  onChange={handleChange}
                  rows="3"
                ></textarea>
              </div>
              
              <div className="form-group">
                <label htmlFor="prerequis">Prérequis</label>
                <textarea
                  id="prerequis"
                  name="prerequis"
                  value={formData.prerequis}
                  onChange={handleChange}
                  rows="3"
                ></textarea>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="public">Public cible</label>
              <input
                type="text"
                id="public"
                name="public"
                value={formData.public}
                onChange={handleChange}
                placeholder="Ex: Débutants, Professionnels..."
              />
            </div>
          </div>
          
          <div className="form-section">
            <h3>Planning et logistique</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dateDebut">Date de début</label>
                <input
                  type="date"
                  id="dateDebut"
                  name="dateDebut"
                  value={formData.dateDebut}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="dateFin">Date de fin</label>
                <input
                  type="date"
                  id="dateFin"
                  name="dateFin"
                  value={formData.dateFin}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="duree">Durée (mois)</label>
                <input
                  type="number"
                  id="duree"
                  name="duree"
                  value={formData.duree}
                  onChange={handleChange}
                  min="1"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="horaires">Horaires</label>
                <input
                  type="text"
                  id="horaires"
                  name="horaires"
                  value={formData.horaires}
                  onChange={handleChange}
                  placeholder="Ex: Lundi-Vendredi, 18h-20h"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="location">Lieu</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Ex: Centre de formation, Salle 5"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="places">Nombre de places</label>
                <input
                  type="number"
                  id="places"
                  name="places"
                  value={formData.places}
                  onChange={handleChange}
                  min="1"
                />
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <h3>Modules de formation</h3>
            <p className="section-description">
              Définissez les différents modules qui composent cette formation
            </p>
            
            {formData.modules.map((module, index) => (
              <div key={module.id} className="module-item">
                <div className="module-header">
                  <h4>Module {index + 1}</h4>
                  {formData.modules.length > 1 && (
                    <button 
                      type="button" 
                      className="remove-module-btn"
                      onClick={() => removeModule(index)}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`module-${index}-titre`}>Titre du module*</label>
                    <input
                      type="text"
                      id={`module-${index}-titre`}
                      value={module.titre}
                      onChange={(e) => handleModuleChange(index, 'titre', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group module-duration">
                    <label htmlFor={`module-${index}-duree`}>Durée (heures)</label>
                    <input
                      type="number"
                      id={`module-${index}-duree`}
                      value={module.duree}
                      onChange={(e) => handleModuleChange(index, 'duree', e.target.value)}
                      min="1"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor={`module-${index}-description`}>Description</label>
                  <textarea
                    id={`module-${index}-description`}
                    value={module.description}
                    onChange={(e) => handleModuleChange(index, 'description', e.target.value)}
                    rows="3"
                  ></textarea>
                </div>
              </div>
            ))}
            
            <button 
              type="button" 
              className="add-module-btn"
              onClick={addModule}
            >
              + Ajouter un module
            </button>
          </div>
          
          <div className="form-section">
            <h3>Informations complémentaires</h3>
            
            <div className="form-group">
              <label htmlFor="materiel">Matériel nécessaire</label>
              <textarea
                id="materiel"
                name="materiel"
                value={formData.materiel}
                onChange={handleChange}
                rows="2"
                placeholder="Ex: Ordinateur portable, calculatrice..."
              ></textarea>
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
                  placeholder="Ex: Examen final, contrôle continu..."
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
                  placeholder="Ex: Certificat de réussite, diplôme..."
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="image">URL de l'image (bannière)</label>
              <input
                type="url"
                id="image"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
          
          {error && <div className="error-alert">{error}</div>}
          {success && (
            <div className="success-alert">
              Configuration enregistrée avec succès! 
              <button onClick={() => navigate('/admin/formations')} className="back-to-list">
                Retour à la liste
              </button>
            </div>
          )}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => navigate('/admin/formations')}
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="save-btn"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner small-spinner"></span>
                  Enregistrement...
                </>
              ) : 'Enregistrer la configuration'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .admin-formation-category {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .loading-container,
        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          gap: 1rem;
        }
        
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top: 4px solid #3498db;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .category-header {
          margin-bottom: 2rem;
          position: relative;
        }
        
        .back-button {
          background: none;
          border: none;
          color: #3498db;
          cursor: pointer;
          font-size: 1rem;
          padding: 0.5rem 0;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .back-button:hover {
          text-decoration: underline;
        }
        
        .category-header h2 {
          font-size: 1.8rem;
          color: #2c3e50;
          margin: 0.5rem 0;
        }
        
        .formation-badge {
          background: #e8f4fd;
          color: #2980b9;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          display: inline-block;
          font-size: 0.9rem;
        }
        
        .formation-badge span {
          font-weight: 600;
        }
        
        .category-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        
        .formateur-overview {
          padding: 1.5rem;
          border-bottom: 1px solid #eee;
        }
        
        .formateur-overview h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.2rem;
          color: #2c3e50;
        }
        
        .formateur-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
        }
        
        .formateur-photo {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .formateur-info h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
        }
        
        .formateur-info p {
          margin: 0.25rem 0;
          color: #666;
        }
        
        .category-form {
          padding: 1.5rem;
        }
        
        .form-section {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #eee;
        }
        
        .form-section h3 {
          font-size: 1.2rem;
          color: #2c3e50;
          margin-bottom: 1rem;
        }
        
        .section-description {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        
        .form-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        @media (max-width: 768px) {
          .form-row {
            flex-direction: column;
          }
        }
        
        .form-group {
          flex: 1;
          margin-bottom: 1rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }
        
        .module-item {
          background: #f8f9fa;
          padding: 1.25rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        
        .module-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .module-header h4 {
          margin: 0;
          font-size: 1.1rem;
        }
        
        .remove-module-btn {
          background: #fff;
          border: 1px solid #e74c3c;
          color: #e74c3c;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .remove-module-btn:hover {
          background: #fee;
        }
        
        .add-module-btn {
          background: #f8f9fa;
          border: 1px dashed #ccc;
          width: 100%;
          padding: 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          margin-bottom: 1rem;
        }
        
        .add-module-btn:hover {
          background: #e9ecef;
        }
        
        .error-alert {
          background: #fee;
          color: #e74c3c;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          border-left: 4px solid #e74c3c;
        }
        
        .success-alert {
          background: #e8f8f5;
          color: #27ae60;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          border-left: 4px solid #27ae60;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .back-to-list {
          background: none;
          border: none;
          color: #27ae60;
          text-decoration: underline;
          cursor: pointer;
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }
        
        .cancel-btn {
          background: #f8f9fa;
          border: 1px solid #ddd;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .cancel-btn:hover {
          background: #e9ecef;
        }
        
        .save-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .save-btn:hover {
          background: #2980b9;
        }
        
        .save-btn:disabled {
          background: #95a5a6;
          cursor: not-allowed;
        }
        
        .small-spinner {
          width: 16px;
          height: 16px;
          border-width: 2px;
        }
      `}</style>
    </div>
  );
};

export default AdminFormationCategory;