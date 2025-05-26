
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, get, update, set, remove } from 'firebase/database';
import axios from 'axios';

const AdminFormations = () => {
  const [formations, setFormations] = useState([]);
  const [formateurs, setFormateurs] = useState({});
  const [categories, setCategories] = useState({});
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [formateurDetail, setFormateurDetail] = useState(null);
  const [formationDetail, setFormationDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const formationsRef = ref(db, 'formations/');
    const formateursRef = ref(db, 'utilisateurs/formateurs/');
    const categoriesRef = ref(db, 'categories/');
    
    try {
      const [formationsSnap, formateursSnap, categoriesSnap] = await Promise.all([
        get(formationsRef),
        get(formateursRef),
        get(categoriesRef),
      ]);

      const formationsList = formationsSnap.exists() ? formationsSnap.val() : {};
      const formateursList = formateursSnap.exists() ? formateursSnap.val() : {};
      const categoriesList = categoriesSnap.exists() ? categoriesSnap.val() : {};
      
      const formattedFormations = Object.keys(formationsList).map((key) => {
        const formation = formationsList[key];
        if (formation.statut === 'en_attente' || formation.statut === 'pré-validée') {
          return {
            id: key,
            ...formation,
            categorie: categoriesList[formation.categorieId]?.nom || 'Non spécifiée',
          };
        }
        if (formation.dateFin && new Date(formation.dateFin) < new Date() && formation.statut === 'publiée') {
          update(ref(db, `formations/${key}`), { statut: 'archivée' });
          return {
            id: key,
            ...formation,
            statut: 'archivée',
            categorie: categoriesList[formation.categorieId]?.nom || 'Non spécifiée',
          };
        }
        return {
          id: key,
          ...formation,
          categorie: categoriesList[formation.categorieId]?.nom || 'Non spécifiée',
        };
      });

      setFormations(formattedFormations);
      setFormateurs(formateursList);
      setCategories(categoriesList);
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
      setError(`Erreur lors du chargement des formations: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setError('Le nom de la catégorie est requis');
      return;
    }
    if (Object.values(categories).some(cat => cat.nom.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Cette catégorie existe déjà');
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const categoryId = Date.now().toString();
      await set(ref(db, `categories/${categoryId}`), {
        nom: trimmedName,
        dateCreation: new Date().toISOString(),
      });
      setNewCategoryName('');
      fetchData();
      setSuccess('Catégorie ajoutée avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Erreur lors de l’ajout de la catégorie:', error);
      setError('Erreur lors de l’ajout de la catégorie: ' + error.message);
    }
  };

  const handleEditCategory = async (categoryId) => {
    if (!editCategoryName.trim()) {
      setError('Le nom de la catégorie est requis');
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await update(ref(db, `categories/${categoryId}`), {
        nom: editCategoryName.trim(),
        dateMaj: new Date().toISOString(),
      });
      setEditCategoryId(null);
      setEditCategoryName('');
      fetchData();
      setSuccess('Catégorie modifiée avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Erreur lors de la modification de la catégorie:', error);
      setError('Erreur lors de la modification de la catégorie: ' + error.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const formationsUsingCategory = formations.filter((f) => f.categorieId === categoryId);
    if (formationsUsingCategory.length > 0) {
      setError('Impossible de supprimer cette catégorie car elle est utilisée par des formations');
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await remove(ref(db, `categories/${categoryId}`));
      fetchData();
      setSuccess('Catégorie supprimée avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error);
      setError('Erreur lors de la suppression de la catégorie: ' + error.message);
    }
  };

  const handleStatusChange = async (id, newStatus, formateurId, formationIntitule) => {
    setLoading(true);
    setError(null);
    const formationRef = ref(db, `formations/${id}`);
    
    try {
      // Fetch the formation to ensure we have the correct intitule
      const formationSnap = await get(formationRef);
      if (!formationSnap.exists()) {
        throw new Error('Formation non trouvée');
      }
      const formationData = formationSnap.val();
      const validIntitule = formationData.intitule || formationData.titre || 'Formation sans titre';
      
      await update(formationRef, { 
        statut: newStatus,
        ...(newStatus === 'pré-validée' && { etape: 'pré-validée' }),
        ...(newStatus === 'validée' && { etape: 'validée' }),
        ...(newStatus === 'publiée' && { etape: 'publiée' }),
        dateMaj: new Date().toISOString(),
      });

      if (newStatus === 'validée' || newStatus === 'publiée') {
        const formation = formations.find((f) => f.id === id);
        const categorieRef = ref(db, `categories/${formation.categorieId}/formations/${id}`);
        await update(categorieRef, {
          ...formation,
          intitule: validIntitule,
          statut: newStatus,
          dateMaj: new Date().toISOString(),
        });
      }

      if (formateurId && formateurs[formateurId]) {
        let subject = '';
        let message = '';
        
        console.log(`Status change for formation ${id} to ${newStatus}, intitule: ${validIntitule}`);

        if (newStatus === 'pré-validée') {
          subject = 'Compléter votre proposition de formation';
          message = `Votre proposition de formation "${validIntitule}" a été pré-approuvée. Veuillez compléter les détails de la formation dans votre espace formateur.`;
        } else if (newStatus === 'validée') {
          subject = 'Formation validée';
          message = `Votre formation "${validIntitule}" a été validée et enregistrée dans la catégorie.`;
        } else if (newStatus === 'publiée') {
          subject = 'Formation publiée';
          message = `Votre formation "${validIntitule}" a été publiée et est maintenant visible sur la plateforme.`;
        } else if (newStatus === 'refusée') {
          subject = 'Formation refusée';
          message = `Votre proposition de formation "${validIntitule}" a été refusée. Merci pour votre proposition.`;
        }

        if (subject && message) {
          try {
            await axios.post('http://localhost:5000/send-email', {
              to: formateurs[formateurId].email,
              subject: subject,
              html: `<p>${message}</p><p>Merci,<br>L'équipe de la plateforme</p>`,
            });
            console.log(`Email envoyé à ${formateurs[formateurId].email} pour statut ${newStatus} avec intitulée: ${validIntitule}`);
          } catch (emailError) {
            console.error('Erreur lors de l\'envoi de l\'email:', emailError);
            setError('Erreur lors de l\'envoi de l\'email: ' + emailError.message);
          }
        }
      }
      
      fetchData();
      setSuccess(`Statut de la formation mis à jour: ${newStatus}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      setError(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminUpdate = async (formationId, updatedData) => {
    setLoading(true);
    setError(null);
    
    try {
      const formationRef = ref(db, `formations/${formationId}`);
      const validIntitule = updatedData.intitule || updatedData.titre || 'Formation sans titre';
      await update(formationRef, {
        ...updatedData,
        intitule: validIntitule,
        dateMaj: new Date().toISOString(),
      });
      
      if (updatedData.statut === 'validée' || updatedData.statut === 'publiée') {
        const categorieRef = ref(db, `categories/${updatedData.categorieId}/formations/${formationId}`);
        await update(categorieRef, {
          ...updatedData,
          intitule: validIntitule,
          dateMaj: new Date().toISOString(),
        });
      }
      
      fetchData();
      setSuccess('Formation mise à jour avec succès');
      setTimeout(() => setSuccess(null), 3000);
      setFormationDetail(null);
    } catch (error) {
      setError('Erreur lors de la mise à jour: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openFileModal = (formateur) => {
    if (!formateur) return;
    
    setFormateurDetail({
      ...formateur,
      dateNaissance: formateur.age || 'Non spécifié',
      specialite: formateur.biographie || 'Non spécifié',
      ville: formateur.adresse || 'Non spécifié',
      experience: formateur.experience || 'Non spécifié',
    });
    
    const files = [];
    if (formateur.cinUrl) files.push({ type: 'CIN', url: formateur.cinUrl });
    if (formateur.cvUrl) files.push({ type: 'CV', url: formateur.cinUrl });
    if (formateur.diplomeUrl) files.push({ type: 'Diplôme', url: formateur.diplomeUrl });
    setSelectedFiles(files);
  };

  const openFormationModal = (formation) => {
    setFormationDetail({
      ...formation,
      intitule: formation.intitule || formation.titre || 'Formation sans titre',
      categorie: formation.categorie || 'Non spécifiée',
    });
    setFormateurDetail(null);
  };

  const navigateToPublish = (formationId) => {
    navigate(`/admin/publier-formation/${formationId}`);
  };

  const startEditCategory = (categoryId, currentName) => {
    setEditCategoryId(categoryId);
    setEditCategoryName(currentName);
  };

  const cancelEditCategory = () => {
    setEditCategoryId(null);
    setEditCategoryName('');
  };

  const formationsFiltrées = filtreStatut === 'tous'
    ? formations
    : formations.filter((f) => f.statut === filtreStatut);

  return (
    <div className="admin-formations-container">
      <div className="admin-header">
        <h2>Gestion des Formations</h2>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="categories-section">
        <h2>Gestion des Catégories</h2>
        <form onSubmit={handleAddCategory} className="category-form">
          <div className="form-group">
            <label htmlFor="newCategoryName">Nouvelle catégorie*</label>
            <input
              type="text"
              id="newCategoryName"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Ex: Développement Web"
              required
            />
          </div>
          <button type="submit" className="add-category-btn">
            Ajouter
          </button>
        </form>

        <div className="categories-list">
          <h3>Catégories existantes</h3>
          {Object.keys(categories).length > 0 ? (
            <ul>
              {Object.keys(categories).map((categoryId) => (
                <li key={categoryId} className="category-item">
                  {editCategoryId === categoryId ? (
                    <div className="edit-category-form">
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        placeholder="Nouveau nom"
                        required
                      />
                      <button
                        className="save-btn"
                        onClick={() => handleEditCategory(categoryId)}
                      >
                        Enregistrer
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={cancelEditCategory}
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <div className="category-details">
                      <span>{categories[categoryId].nom}</span>
                      <div className="category-actions">
                        <button
                          className="edit-btn"
                          onClick={() => startEditCategory(categoryId, categories[categoryId].nom)}
                        >
                          Modifier
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteCategory(categoryId)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>Aucune catégorie disponible. Ajoutez-en une ci-dessus.</p>
          )}
        </div>
      </div>

      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="filtre-statut">Filtrer par statut :</label>
          <select
            id="filtre-statut"
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
          >
            <option value="tous">Tous</option>
            <option value="en_attente">En attente</option>
            <option value="pré-validée">Pré-validée</option>
            <option value="validée">Validée</option>
            <option value="publiée">Publiée</option>
            <option value="archivée">Archivée</option>
            <option value="refusée">Refusée</option>
          </select>
        </div>

        <button
          className="refresh-btn"
          onClick={fetchData}
          disabled={loading}
        >
          {loading ? <span className="spinner"></span> : 'Actualiser'}
        </button>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <span className="spinner"></span>
          <p>Chargement en cours...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="formations-table">
            <thead>
              <tr>
                <th>Intitulé</th>
                <th>Formateur</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Dates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {formationsFiltrées.map((formation) => {
                const formateur = formation.formateurId ? formateurs[formation.formateurId] : null;
                return (
                  <tr key={formation.id}>
                    <td>
                      <div className="formation-title" onClick={() => openFormationModal(formation)}>
                        {formation.intitule || formation.titre || 'Formation sans titre'}
                      </div>
                    </td>
                    <td>
                      {formateur ? (
                        <div className="formateur-info" onClick={() => openFileModal(formateur)}>
                          {formateur.photoURL && (
                            <img
                              src={formateur.photoURL}
                              alt={`${formateur.prenom} ${formateur.nom}`}
                              className="formateur-avatar"
                            />
                          )}
                          <div>
                            <div className="formateur-name">
                              {formateur.prenom} {formateur.nom}
                            </div>
                            <div className="formateur-email">
                              {formateur.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="not-applicable">Non attribué</div>
                      )}
                    </td>
                    <td>
                      {formation.categorie ? (
                        <span className="categorie-badge">{formation.categorie}</span>
                      ) : (
                        <span className="not-applicable">Non spécifiée</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${formation.statut.replace(' ', '-')}`}>
                        {formation.statut}
                      </span>
                    </td>
                    <td>
                      {formation.dateDebut && formation.dateFin ? (
                        <div className="dates-container">
                          <div>{new Date(formation.dateDebut).toLocaleDateString()}</div>
                          <div>au</div>
                          <div>{new Date(formation.dateFin).toLocaleDateString()}</div>
                        </div>
                      ) : (
                        <span className="not-applicable">Non définies</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <div className="actions-container">
                        {formation.statut === 'en_attente' && (
                          <>
                            <button
                              className="action-btn approve-btn"
                              onClick={() => handleStatusChange(formation.id, 'pré-validée', formation.formateurId, formation.intitule || formation.titre)}
                            >
                              Pré-valider
                            </button>
                            <button
                              className="action-btn reject-btn"
                              onClick={() => handleStatusChange(formation.id, 'refusée', formation.formateurId, formation.intitule || formation.titre)}
                            >
                              Refuser
                            </button>
                          </>
                        )}
                        {formation.statut === 'pré-validée' && (
                          <>
                            <button
                              className="action-btn approve-btn"
                              onClick={() => handleStatusChange(formation.id, 'validée', formation.formateurId, formation.intitule || formation.titre)}
                            >
                              Valider
                            </button>
                            <button
                              className="action-btn modify-btn"
                              onClick={() => openFormationModal(formation)}
                            >
                              Modifier
                            </button>
                          </>
                        )}
                        {formation.statut === 'validée' && (
                          <button
                            className="action-btn approve-btn"
                            onClick={() => navigateToPublish(formation.id)}
                          >
                            Publier
                          </button>
                        )}
                        {formation.statut === 'publiée' && (
                          <button
                            className="action-btn archive-btn"
                            onClick={() => handleStatusChange(formation.id, 'archivée', formation.formateurId, formation.intitule || formation.titre)}
                          >
                            Archiver
                          </button>
                        )}
                        <button
                          className="action-btn details-btn"
                          onClick={() => openFormationModal(formation)}
                        >
                          Détails
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {formateurDetail && (
        <div className="modal-overlay">
          <div className="formateur-modal">
            <div className="modal-header">
              <h3>Détails du formateur</h3>
              <button className="close-btn" onClick={() => setFormateurDetail(null)}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="formateur-photo-section">
                {formateurDetail.photoURL && (
                  <img
                    src={formateurDetail.photoURL}
                    alt={`${formateurDetail.prenom} ${formateurDetail.nom}`}
                    className="formateur-photo"
                  />
                )}
                <div className="documents-section">
                  <h4>Documents</h4>
                  <div className="documents-list">
                    {selectedFiles.map((file, index) => (
                      <a
                        key={index}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="document-link"
                      >
                        <span>{file.type}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              <div className="formateur-details">
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Nom complet</label>
                    <p>{formateurDetail.prenom} {formateurDetail.nom}</p>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <a href={`mailto:${formateurDetail.email}`}>{formateurDetail.email}</a>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone</label>
                    <a href={`tel:${formateurDetail.numtel}`}>{formateurDetail.numtel}</a>
                  </div>
                  <div className="detail-item">
                    <label>Date de naissance</label>
                    <p>{formateurDetail.dateNaissance}</p>
                  </div>
                  <div className="detail-item">
                    <label>Diplôme</label>
                    <p>{formateurDetail.diplome || 'Non spécifié'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Spécialité</label>
                    <p>{formateurDetail.specialite}</p>
                  </div>
                  <div className="detail-item">
                    <label>Expérience</label>
                    <p>{formateurDetail.experience}</p>
                  </div>
                  <div className="detail-item">
                    <label>Ville</label>
                    <p>{formateurDetail.ville}</p>
                  </div>
                </div>
                <div className="biography-section">
                  <label>Biographie</label>
                  <div className="biography-text">
                    {formateurDetail.biographie || 'Aucune biographie fournie.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {formationDetail && (
        <div className="modal-overlay">
          <div className="formation-modal">
            <div className="modal-header">
              <h3>Détails de la formation</h3>
              <button className="close-btn" onClick={() => setFormationDetail(null)}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="formation-details">
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Intitulé*</label>
                    <input
                      value={formationDetail.intitule || ''}
                      onChange={(e) => setFormationDetail({ ...formationDetail, intitule: e.target.value })}
                      required
                    />
                  </div>
                  <div className="detail-item">
                    <label>Catégorie*</label>
                    <select
                      value={formationDetail.categorieId || ''}
                      onChange={(e) => setFormationDetail({
                        ...formationDetail,
                        categorieId: e.target.value,
                        categorie: categories[e.target.value]?.nom || 'Non spécifiée',
                      })}
                      required
                    >
                      <option value="">Sélectionnez une catégorie</option>
                      {Object.keys(categories).map((categoryId) => (
                        <option key={categoryId} value={categoryId}>
                          {categories[categoryId].nom || 'Catégorie sans nom'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="detail-item">
                    <label>Statut</label>
                    <input
                      value={formationDetail.statut || ''}
                      readOnly
                    />
                  </div>
                  <div className="detail-item">
                    <label>Date de création</label>
                    <input
                      value={formationDetail.dateCreation ? new Date(formationDetail.dateCreation).toLocaleDateString() : 'Non spécifiée'}
                      readOnly
                    />
                  </div>
                  <div className="detail-item">
                    <label>Date de début*</label>
                    <input
                      type="date"
                      value={formationDetail.dateDebut || ''}
                      onChange={(e) => setFormationDetail({ ...formationDetail, dateDebut: e.target.value })}
                      required
                    />
                  </div>
                  <div className="detail-item">
                    <label>Date de fin*</label>
                    <input
                      type="date"
                      value={formationDetail.dateFin || ''}
                      onChange={(e) => setFormationDetail({ ...formationDetail, dateFin: e.target.value })}
                      required
                    />
                  </div>
                  <div className="detail-item">
                    <label>Durée (heures)*</label>
                    <input
                      type="number"
                      value={formationDetail.duree || ''}
                      onChange={(e) => setFormationDetail({ ...formationDetail, duree: e.target.value })}
                      min="1"
                      required
                    />
                  </div>
                  <div className="detail-item">
                    <label>Prix (DT)*</label>
                    <input
                      type="number"
                      value={formationDetail.prix || ''}
                      onChange={(e) => setFormationDetail({ ...formationDetail, prix: e.target.value })}
                      min="0"
                      required
                    />
                  </div>
                  <div className="detail-item">
                    <label>Modalité</label>
                    <select
                      value={formationDetail.modalite || 'présentiel'}
                      onChange={(e) => setFormationDetail({ ...formationDetail, modalite: e.target.value })}
                    >
                      <option value="présentiel">Présentiel</option>
                      <option value="en_ligne">En ligne</option>
                      <option value="hybride">Hybride</option>
                    </select>
                  </div>
                  <div className="detail-item">
                    <label>Matériel nécessaire</label>
                    <input
                      value={formationDetail.materiel || ''}
                      onChange={(e) => setFormationDetail({ ...formationDetail, materiel: e.target.value })}
                      placeholder="Ex: Ordinateur portable, logiciels spécifiques..."
                    />
                  </div>
                  <div className="detail-item">
                    <label>Méthode d'évaluation</label>
                    <input
                      value={formationDetail.evaluation || ''}
                      onChange={(e) => setFormationDetail({ ...formationDetail, evaluation: e.target.value })}
                      placeholder="Ex: Projet final, QCM, Examen pratique..."
                    />
                  </div>
                  <div className="detail-item">
                    <label>Certification</label>
                    <input
                      value={formationDetail.certification || ''}
                      onChange={(e) => setFormationDetail({ ...formationDetail, certification: e.target.value })}
                      placeholder="Ex: Attestation de réussite, Certificat..."
                    />
                  </div>
                  <div className="detail-item">
                    <label>URL de l'image de présentation</label>
                    <input
                      type="url"
                      value={formationDetail.imageUrl || ''}
                      onChange={(e) => setFormationDetail({ ...formationDetail, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
                <div className="description-section">
                  <label>Description*</label>
                  <textarea
                    value={formationDetail.description || ''}
                    onChange={(e) => setFormationDetail({ ...formationDetail, description: e.target.value })}
                    rows="5"
                    required
                  />
                </div>
                {formationDetail.modules && formationDetail.modules.length > 0 && (
                  <div className="modules-section">
                    <label>Modules</label>
                    <div className="modules-list">
                      {formationDetail.modules.map((module, index) => (
                        <div key={index} className="module-item">
                          <h4>Module {index + 1}: {module.titre}</h4>
                          <p><strong>Durée:</strong> {module.duree} heures</p>
                          <p><strong>Description:</strong> {module.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="form-actions">
                  <button
                    className="save-btn"
                    onClick={() => handleAdminUpdate(formationDetail.id, formationDetail)}
                  >
                    Enregistrer les modifications
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-formations-container {
          padding: 2rem;
          background: #f5f7fa;
          min-height: 100vh;
          font-family: Arial, sans-serif;
        }

        .admin-header {
          margin-bottom: 2rem;
          text-align: center;
        }

        .admin-header h2 {
          font-size: 1.8rem;
          color: #333;
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

        .categories-section {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 2rem;
        }

        .categories-section h2 {
          font-size: 1.5rem;
          color: #333;
          margin-bottom: 1rem;
        }

        .category-form {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          margin-bottom: 1.5rem;
          max-width: 600px;
        }

        .form-group {
          flex: 1;
          min-width: 200px;
        }

        .form-group label {
          font-weight: bold;
          color: #555;
          margin-bottom: 0.5rem;
          display: block;
        }

        .form-group input {
          width: 100%;
          max-width: 400px;
          padding: 0.6rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1rem;
        }

        .add-category-btn {
          padding: 0.6rem 1.5rem;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          align-self: flex-end;
        }

        .add-category-btn:hover {
          background: #43a047;
        }

        .categories-list h3 {
          font-size: 1.2rem;
          color: #333;
          margin-bottom: 1rem;
        }

        .categories-list ul {
          list-style: none;
          padding: 0;
        }

        .category-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e0e0e0;
        }

        .category-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .category-details span {
          font-size: 1rem;
          color: #333;
        }

        .category-actions {
          display: flex;
          gap: 0.5rem;
        }

        .edit-btn, .delete-btn, .save-btn, .cancel-btn {
          padding: 0.4rem 0.8rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .edit-btn {
          background: #0288d1;
          color: white;
        }

        .edit-btn:hover {
          background: #0277bd;
        }

        .delete-btn {
          background: #d32f2f;
          color: white;
        }

        .delete-btn:hover {
          background: #c62828;
        }

        .save-btn {
          background: #4caf50;
          color: white;
        }

        .save-btn:hover {
          background: #43a047;
        }

        .cancel-btn {
          background: #eceff1;
          color: #455a64;
        }

        .cancel-btn:hover {
          background: #cfd8dc;
        }

        .edit-category-form {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .edit-category-form input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          max-width: 300px;
        }

        .filters-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-group label {
          font-weight: bold;
          color: #555;
        }

        .filter-group select {
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1rem;
        }

        .refresh-btn {
          padding: 0.5rem 1rem;
          background: #0288d1;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .refresh-btn:disabled {
          background: #b0bec5;
          cursor: not-allowed;
        }

        .spinner {
          border: 2px solid #f3f3f3;
          border-top: 2px solid #0288d1;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-overlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 50vh;
          color: #555;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow-x: auto;
        }

        .formations-table {
          width: 100%;
          border-collapse: collapse;
        }

        .formations-table th, .formations-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        .formations-table th {
          background: #f5f7fa;
          font-weight: bold;
          color: #333;
        }

        .formation-title {
          cursor: pointer;
          color: #0288d1;
          font-weight: 500;
        }

        .formation-title:hover {
          text-decoration: underline;
        }

        .formateur-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .formateur-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .formateur-name {
          font-weight: 500;
          color: #333;
        }

        .formateur-email {
          font-size: 0.9rem;
          color: #777;
        }

        .categorie-badge, .status-badge {
          padding: 0.3rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .categorie-badge {
          background: #e3f2fd;
          color: #0288d1;
        }

        .status-badge.en_attente {
          background: #fff3e0;
          color: #f57c00;
        }

        .status-badge.pré-validée {
          background: #e1f5fe;
          color: #0288d1;
        }

        .status-badge.validée {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .status-badge.publiée {
          background: #f3e5f5;
          color: #6a1b9a;
        }

        .status-badge.archivée {
          background: #eceff1;
          color: #455a64;
        }

        .status-badge.refusée {
          background: #ffe6e6;
          color: #d32f2f;
        }

        .not-applicable {
          color: #999;
          font-style: italic;
        }

        .dates-container {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .actions-cell {
          width: 200px;
        }

        .actions-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .action-btn {
          padding: 0.4rem 0.8rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .approve-btn {
          background: #4caf50;
          color: white;
        }

        .reject-btn {
          background: #d32f2f;
          color: white;
        }

        .modify-btn {
          background: #0288d1;
          color: white;
        }

        .archive-btn {
          background: #455a64;
          color: white;
        }

        .details-btn {
          background: #7e57c2;
          color: white;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .formateur-modal, .formation-modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.5rem;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: #555;
        }

        .modal-content {
          padding: 1.5rem;
        }

        .formateur-photo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .formateur-photo {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
        }

        .documents-section h4 {
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
          color: #333;
        }

        .documents-list {
          display: flex;
          gap: 0.5rem;
        }

        .document-link {
          padding: 0.4rem 0.8rem;
          background: #e3f2fd;
          color: #0288d1;
          border-radius: 4px;
          text-decoration: none;
          font-size: 0.9rem;
        }

        .formateur-details {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
        }

        .detail-item label {
          font-weight: bold;
          color: #555;
          margin-bottom: 0.3rem;
        }

        .detail-item p, .detail-item a {
          margin: 0;
          color: #333;
        }

        .detail-item a {
          text-decoration: none;
        }

        .detail-item a:hover {
          text-decoration: underline;
        }

        .detail-item input, .detail-item select, .detail-item textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1rem;
        }

        .detail-item input[readOnly] {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .biography-section {
          margin-top: 1rem;
        }

        .biography-section label {
          font-weight: bold;
          color: #555;
        }

        .biography-text {
          background: #f5f7fa;
          padding: 1rem;
          border-radius: 4px;
          color: #333;
        }

        .formation-details {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .description-section, .modules-section {
          margin-top: 1rem;
        }

        .description-section label, .modules-section label {
          font-weight: bold;
          color: #555;
          display: block;
          margin-bottom: 0.5rem;
        }

        .description-section textarea {
          width: 100%;
          resize: vertical;
        }

        .modules-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .module-item {
          background: #f5f7fa;
          padding: 1rem;
          border-radius: 4px;
        }

        .module-item h4 {
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
          color: #333;
        }

        .module-item p {
          margin: 0.3rem 0;
          color: #555;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }

        .save-btn {
          padding: 0.5rem 1rem;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
};

export default AdminFormations;