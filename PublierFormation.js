import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, get, update } from 'firebase/database';
import axios from 'axios';

const PublierFormation = () => {
  const { formationId } = useParams();
  const navigate = useNavigate();
  const [formation, setFormation] = useState(null);
  const [formateur, setFormateur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch formation
        const formationRef = ref(db, `formations/${formationId}`);
        const formationSnapshot = await get(formationRef);
        if (!formationSnapshot.exists()) {
          setError('Formation non trouvée');
          setLoading(false);
          return;
        }
        const formationData = formationSnapshot.val();
        setFormation({ id: formationId, ...formationData });

        // Fetch formateur
        const formateurRef = ref(db, `utilisateurs/formateurs/${formationData.formateurId}`);
        const formateurSnapshot = await get(formateurRef);
        if (formateurSnapshot.exists()) {
          setFormateur(formateurSnapshot.val());
        } else {
          setError('Formateur non trouvé');
        }
      } catch (err) {
        setError('Erreur de chargement: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formationId]);

  const handlePublish = async () => {
    setError('');
    setSuccess('');
    try {
      const updates = {
        statut: 'publiée',
        etape: 'publiée',
        datePublication: new Date().toISOString(),
        dateMaj: new Date().toISOString(),
      };
      await update(ref(db, `formations/${formationId}`), updates);

      // Send email to formateur
      await axios.post('http://localhost:5000/send-email', {
        to: formateur.email,
        subject: 'Formation publiée',
        text: `Votre formation "${formation.titre}" a été publiée et est maintenant visible sur la plateforme.`,
      });

      setSuccess('Formation publiée avec succès!');
      setTimeout(() => navigate('/admin/formations'), 2000);
    } catch (err) {
      setError('Erreur lors de la publication: ' + err.message);
    }
  };

  const handleReject = async () => {
    setError('');
    setSuccess('');
    try {
      const updates = {
        statut: 'refusée',
        etape: 'refusée',
        dateMaj: new Date().toISOString(),
      };
      await update(ref(db, `formations/${formationId}`), updates);

      // Send email to formateur
      await axios.post('http://localhost:5000/send-email', {
        to: formateur.email,
        subject: 'Formation refusée',
        text: `Votre proposition de formation "${formation.titre}" a été refusée. Merci pour votre proposition.`,
      });

      setSuccess('Formation refusée avec succès.');
      setTimeout(() => navigate('/admin/formations'), 2000);
    } catch (err) {
      setError('Erreur lors du refus: ' + err.message);
    }
  };

  if (loading) {
    return <div className="loading">Chargement en cours...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/admin/formations')} className="back-btn">
          Retour
        </button>
      </div>
    );
  }

  if (!formation) {
    return null;
  }

  return (
    <div className="publier-formation-container">
      <h1>Publier la Formation</h1>
      <p className="subtitle">Vérifiez les détails de la formation avant de publier ou refuser.</p>

      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="formation-details">
        <h2>{formation.titre}</h2>
        <div className="details-grid">
          <div className="detail-item">
            <label>Formateur</label>
            <p>{formateur ? `${formateur.prenom} ${formateur.nom}` : 'Non attribué'}</p>
          </div>
          <div className="detail-item">
            <label>Catégorie</label>
            <p>{formation.categorie || 'Non spécifiée'}</p>
          </div>
          <div className="detail-item">
            <label>Statut</label>
            <p>{formation.statut}</p>
          </div>
          <div className="detail-item">
            <label>Durée</label>
            <p>{formation.duree ? `${formation.duree} heures` : 'Non spécifiée'}</p>
          </div>
          <div className="detail-item">
            <label>Prix</label>
            <p>{formation.prix ? `${formation.prix} DT` : 'Non spécifié'}</p>
          </div>
          <div className="detail-item">
            <label>Dates</label>
            <p>
              {formation.dateDebut ? new Date(formation.dateDebut).toLocaleDateString() : 'Non définie'} - 
              {formation.dateFin ? new Date(formation.dateFin).toLocaleDateString() : 'Non définie'}
            </p>
          </div>
          <div className="detail-item">
            <label>Horaires</label>
            <p>{formation.horaires || 'Non spécifié'}</p>
          </div>
          <div className="detail-item">
            <label>Lieu</label>
            <p>{formation.lieu || 'Non spécifié'}</p>
          </div>
          <div className="detail-item">
            <label>Places disponibles</label>
            <p>{formation.placesDisponibles || 'Non spécifié'}</p>
          </div>
          <div className="detail-item">
            <label>Modalité</label>
            <p>{formation.modalite || 'Non spécifiée'}</p>
          </div>
          <div className="detail-item">
            <label>Public cible</label>
            <p>{formation.publicCible || 'Non spécifié'}</p>
          </div>
          <div className="detail-item">
            <label>Matériel nécessaire</label>
            <p>{formation.materiel || 'Non spécifié'}</p>
          </div>
          <div className="detail-item">
            <label>Méthode d'évaluation</label>
            <p>{formation.evaluation || 'Non spécifié'}</p>
          </div>
          <div className="detail-item">
            <label>Certification</label>
            <p>{formation.certification || 'Non spécifié'}</p>
          </div>
        </div>

        <div className="description-section">
          <label>Description</label>
          <div className="description-text">{formation.description || 'Aucune description fournie.'}</div>
        </div>

        <div className="description-section">
          <label>Objectifs pédagogiques</label>
          <div className="description-text">{formation.objectifs || 'Aucun objectif fourni.'}</div>
        </div>

        <div className="description-section">
          <label>Prérequis</label>
          <div className="description-text">{formation.prerequis || 'Aucun prérequis fourni.'}</div>
        </div>

        {formation.modules && formation.modules.length > 0 && (
          <div className="modules-section">
            <label>Modules</label>
            <div className="modules-list">
              {formation.modules.map((module, index) => (
                <div key={index} className="module-item">
                  <h4>Module {index + 1}: {module.titre}</h4>
                  <p><strong>Durée:</strong> {module.duree || 'Non spécifiée'} heures</p>
                  <p><strong>Description:</strong> {module.description || 'Aucune description'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="actions">
        <button className="cancel-btn" onClick={() => navigate('/admin/formations')}>
          Annuler
        </button>
        <button className="reject-btn" onClick={handleReject}>
          Refuser
        </button>
        <button className="publish-btn" onClick={handlePublish}>
          Publier
        </button>
      </div>

      <style jsx>{`
        .publier-formation-container {
          max-width: 900px;
          margin: 2rem auto;
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        h1 {
          color: #2c3e50;
          text-align: center;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          text-align: center;
          color: #7f8c8d;
          margin-bottom: 2rem;
        }

        .formation-details {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        h2 {
          color: #3498db;
          margin-bottom: 1.5rem;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .detail-item {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 6px;
        }

        .detail-item label {
          display: block;
          font-size: 0.8rem;
          color: #7f8c8d;
          margin-bottom: 0.25rem;
        }

        .detail-item p {
          margin: 0;
          font-weight: 500;
          color: #2c3e50;
        }

        .description-section {
          margin-bottom: 1.5rem;
        }

        .description-section label {
          display: block;
          font-size: 0.8rem;
          color: #7f8c8d;
          margin-bottom: 0.25rem;
        }

        .description-text {
          white-space: pre-line;
          line-height: 1.6;
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 6px;
        }

        .modules-section {
          margin-top: 1.5rem;
        }

        .modules-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .module-item {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 6px;
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }

        .cancel-btn,
        .reject-btn,
        .publish-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }

        .cancel-btn {
          background: #f8f9fa;
          border: 1px solid #ddd;
        }

        .reject-btn {
          background: #e74c3c;
          color: white;
        }

        .publish-btn {
          background: #27ae60;
          color: white;
        }

        .success-message {
          background: #e8f8f5;
          color: #27ae60;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .error-message {
          background: #fee;
          color: #e74c3c;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          font-size: 1.2rem;
          color: #666;
        }

        .error-container {
          text-align: center;
          padding: 2rem;
        }

        .back-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default PublierFormation;