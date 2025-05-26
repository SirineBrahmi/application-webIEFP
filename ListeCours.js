
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ref, onValue, remove, update } from 'firebase/database';
import { db } from '../firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Button, Card, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  padding: 2.5rem;
  background: linear-gradient(135deg, rgb(240, 243, 216), rgb(215, 227, 241));
`;

const MainTitle = styled.h2`
  color: rgb(11, 44, 116);
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 2rem;
`;

const CategoryTitle = styled.h3`
  color: rgb(11, 44, 116);
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
`;

const FormationTitle = styled.h4`
  color: rgb(11, 44, 116);
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 1rem;
`;

const SemesterTitle = styled.h5`
  color: rgb(11, 44, 116);
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
`;

const CourseCard = styled.div`
  background: rgb(240, 243, 216);
  border: 1px solid #dbeafe;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  transition: transform 0.3s;
  &:hover {
    transform: translateY(-5px);
  }
`;

const CourseTitle = styled.h6`
  color: rgb(11, 44, 116);
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  word-break: break-word;
`;

const CourseText = styled.p`
  color: #1f2937;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  word-break: break-word;
`;

const CourseDate = styled.p`
  color: #6b7280;
  font-size: 0.85rem;
  margin-bottom: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const StyledButton = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
`;

const ViewButton = styled(StyledButton)`
  background: #3b82f6;
  color: white;
  &:hover {
    background: #2563eb;
  }
`;

const EditButton = styled(StyledButton)`
  background: #14b8a6;
  color: white;
  &:hover {
    background: #0d9488;
  }
`;

const DeleteButton = styled(StyledButton)`
  background: #ef4444;
  color: white;
  &:hover {
    background: #dc2626;
  }
`;

const StyledAlert = styled(Alert)`
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  animation: fadeIn 0.3s ease-in;
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalTitle = styled.h5`
  color: #2563eb;
  font-size: 1.25rem;
  font-weight: 600;
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ModalFooter = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
`;

const ModalButton = styled(Button)`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
`;

const ListeCours = () => {
  const [cours, setCours] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentCours, setCurrentCours] = useState(null);
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    file: null,
  });
  const [formateurId, setFormateurId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState({});
  const [formations, setFormations] = useState({});

  // Suivi des requêtes terminées
  const fetchStatus = useRef({ categories: false, courses: false });

  // Référence pour stocker categories sans dépendance
  const categoriesRef = useRef(categories);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  // Compteur de rendus pour diagnostic
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current += 1;
    console.log(`Render count: ${renderCount.current}`);
  });

  // Vérifier si toutes les requêtes sont terminées
  const checkFetchComplete = useCallback(() => {
    if (fetchStatus.current.categories && fetchStatus.current.courses) {
      console.log('All fetches complete, setting loading to false');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const formateurData = localStorage.getItem('formateur');
      console.log('Raw formateur data from localStorage:', formateurData);
      const currentFormateur = formateurData ? JSON.parse(formateurData) : null;

      if (currentFormateur && currentFormateur.uid && typeof currentFormateur.uid === 'string') {
        console.log('Valid formateur from localStorage:', currentFormateur);
        setFormateurId(currentFormateur.uid);
      } else {
        console.warn('Invalid or missing formateur data in localStorage:', currentFormateur);
      }
    } catch (error) {
      console.error('Error parsing localStorage formateur data:', error);
    }

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('Authenticated user from Firebase:', user.uid);
        setFormateurId(user.uid);
        const formateur = {
          uid: user.uid,
          email: user.email,
          nom: user.displayName?.split(' ')[1] || 'Brahmi',
          prenom: user.displayName?.split(' ')[0] || 'Samar',
          role: 'formateur',
        };
        localStorage.setItem('formateur', JSON.stringify(formateur));
      } else {
        console.error('No authenticated user found in Firebase Auth or localStorage.');

        setLoading(false);
      }
    }, (error) => {
      console.error('Firebase Auth error:', error);
      setError('Erreur d\'authentification: ' + error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Comparaison profonde pour éviter les mises à jour inutiles
  const areObjectsEqual = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  };

  // Récupération des catégories
  useEffect(() => {
    if (!formateurId) {
      console.log('No formateurId, skipping categories fetch.');
      fetchStatus.current.categories = true;
      checkFetchComplete();
      return;
    }

    const categoriesRef = ref(db, 'categories');
    const unsubscribeCategories = onValue(
      categoriesRef,
      (snapshot) => {
        console.log('Categories onValue triggered');
        if (snapshot.exists()) {
          const categoriesData = snapshot.val();
          console.log('Categories data fetched:', categoriesData);
          if (!categoriesData['1748100480817']) {
            console.error('Category 1748100480817 not found in /categories');
            setError('Catégorie 1748100480817 manquante dans /categories.');
          } else if (!categoriesData['1748100480817']?.formations?.['-OR3J1d1DB4kAzjqNicC']?.intitule) {
            console.error('Intitule missing for formation -OR3J1d1DB4kAzjqNicC in /categories/1748100480817/formations');
            setError('Intitulé manquant pour la formation -OR3J1d1DB4kAzjqNicC dans /categories/1748100480817.');
          }
          setCategories((prev) => {
            if (areObjectsEqual(prev, categoriesData)) {
              console.log('Categories unchanged, skipping update');
              return prev;
            }
            console.log('Updating categories');
            return categoriesData;
          });
          const formationsData = {};
          Object.entries(categoriesData).forEach(([categoryId, category]) => {
            console.log(`Processing category ${categoryId}:`, category);
            if (category?.formations) {
              Object.entries(category.formations).forEach(([formationId, formation]) => {
                console.log(`Processing formation ${formationId}:`, formation);
                if (formation?.intitule) {
                  formationsData[formationId] = {
                    ...formation,
                    categorieId: categoryId,
                    isAccelerated: formation.isAccelerated || category.nom?.toLowerCase().includes('accélérée') || false,
                  };
                } else {
                  console.warn(`Skipping formation ${formationId}: missing intitule`);
                }
              });
            } else {
              console.warn(`No formations found for category ${categoryId}`);
            }
          });
          setFormations((prev) => {
            if (areObjectsEqual(prev, formationsData)) {
              console.log('Formations unchanged, skipping update');
              return prev;
            }
            console.log('Updating formations');
            return formationsData;
          });
        } else {
          console.error('No categories found in /categories.');
          setError('Aucune catégorie trouvée dans /categories. Vérifiez la base de données.');
          setCategories({});
          setFormations({});
        }
        fetchStatus.current.categories = true;
        checkFetchComplete();
      },
      (error) => {
        console.error('Error fetching /categories:', error);
        setError(`Erreur lors de la récupération des catégories: ${error.message}`);
        fetchStatus.current.categories = true;
        checkFetchComplete();
      }
    );

    // Timeout de secours
    const timeout = setTimeout(() => {
      if (!fetchStatus.current.categories) {
        console.error('Categories fetch timeout');
        setError('Délai dépassé pour la récupération des catégories.');
        fetchStatus.current.categories = true;
        checkFetchComplete();
      }
    }, 10000);

    return () => {
      console.log('Unsubscribing categories listener');
      unsubscribeCategories();
      clearTimeout(timeout);
    };
  }, [formateurId, checkFetchComplete]);

  // Récupération des cours
  const handleCoursUpdate = useCallback((snapshot) => {
    console.log('Courses onValue triggered');
    if (snapshot.exists()) {
      const allCours = snapshot.val();
      console.log('Courses data fetched:', allCours);
      if (!allCours['1748100480817'] || !allCours['1748100480817']['-OR3J1d1DB4kAzjqNicC']) {
        console.error('Course data for 1748100480817/-OR3J1d1DB4kAzjqNicC not found in /cours');
        setError('Cours 1748100480817/-OR3J1d1DB4kAzjqNicC manquant dans /cours.');
      }
      const filteredCours = {};
      Object.entries(allCours).forEach(([categoryId, formations]) => {
        console.log(`Processing courses for category ${categoryId}:`, formations);
        Object.entries(formations || {}).forEach(([formationId, semesters]) => {
          console.log(`Processing formation ${formationId}:`, semesters);
          const currentCategories = categoriesRef.current;
          if (!currentCategories[categoryId]?.formations?.[formationId]?.intitule) {
            console.warn(`Skipping formation ${formationId}: missing intitule in /categories`);
            return;
          }
          Object.entries(semesters || {}).forEach(([semestre, courses]) => {
            console.log(`Processing semester ${semestre}:`, courses);
            Object.entries(courses || {}).forEach(([coursId, coursItem]) => {
              console.log(`Processing course ${coursId}:`, coursItem);
              if (coursItem?.formateurId === formateurId) {
                if (!filteredCours[categoryId]) {
                  filteredCours[categoryId] = {};
                }
                if (!filteredCours[categoryId][formationId]) {
                  filteredCours[categoryId][formationId] = {};
                }
                if (!filteredCours[categoryId][formationId][semestre]) {
                  filteredCours[categoryId][formationId][semestre] = {};
                }
                filteredCours[categoryId][formationId][semestre][coursId] = {
                  ...coursItem,
                  fileURL: coursItem.file_url || coursItem.fileURL || '',
                  date_soumission: coursItem.date_soumission || coursItem.createdAt || new Date().toISOString(),
                  description: coursItem.description || 'Description manquante',
                  titre: coursItem.titre || 'Titre manquant',
                  nomFormation: currentCategories[categoryId]?.formations?.[formationId]?.intitule || 'Formation inconnue',
                  isAccelerated:
                    currentCategories[categoryId]?.formations?.[formationId]?.isAccelerated ||
                    currentCategories[categoryId]?.nom?.toLowerCase().includes('accélérée') ||
                    false,
                };
              } else {
                console.log(`Course ${coursId} skipped: formateurId ${coursItem?.formateurId} does not match ${formateurId}`);
              }
            });
          });
        });
      });
      setCours((prev) => {
        if (areObjectsEqual(prev, filteredCours)) {
          console.log('Cours unchanged, skipping update');
          return prev;
        }
        console.log('Updating cours');
        return filteredCours;
      });
    } else {
      console.error('No courses found in /cours.');
      setError('Aucun cours trouvé dans /cours. Vérifiez la base de données.');
      setCours({});
    }
    fetchStatus.current.courses = true;
    checkFetchComplete();
  }, [formateurId, checkFetchComplete]);

  useEffect(() => {
    if (!formateurId) {
      console.log('No formateurId, skipping courses fetch.');
      fetchStatus.current.courses = true;
      checkFetchComplete();
      return;
    }

    const coursRef = ref(db, 'cours');
    const unsubscribeCours = onValue(
      coursRef,
      handleCoursUpdate,
      (error) => {
        console.error('Error fetching /cours:', error);
        setError(`Erreur lors de la récupération des cours: ${error.message}`);
        fetchStatus.current.courses = true;
        checkFetchComplete();
      }
    );

    // Timeout de secours
    const timeout = setTimeout(() => {
      if (!fetchStatus.current.courses) {
        console.error('Courses fetch timeout');
        setError('Délai dépassé pour la récupération des cours.');
        fetchStatus.current.courses = true;
        checkFetchComplete();
      }
    }, 10000);

    return () => {
      console.log('Unsubscribing courses listener');
      unsubscribeCours();
      clearTimeout(timeout);
    };
  }, [formateurId, handleCoursUpdate]);

  // Mémoriser les données pour éviter les rendus inutiles
  const memoizedCours = useMemo(() => cours, [cours]);
  const memoizedCategories = useMemo(() => categories, [categories]);
  const memoizedFormations = useMemo(() => formations, [formations]);

  const handleEdit = (coursItem, path) => {
    setCurrentCours({ ...coursItem, path });
    setFormData({
      titre: coursItem.titre,
      description: coursItem.description,
      file: null,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.titre.trim()) throw new Error('Le titre est requis');
      if (!formData.description.trim()) throw new Error('La description est requise');

      const { path } = currentCours;
      const coursRef = ref(db, `cours/${path}`);
      let updatedData = {
        titre: formData.titre.trim(),
        description: formData.description.trim(),
        date_soumission: new Date().toISOString(),
      };

      if (formData.file) {
        if (formData.file.size > 10 * 1024 * 1024) {
          throw new Error('La taille du fichier ne doit pas dépasser 10MB');
        }
        const validTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ];
        if (!validTypes.includes(formData.file.type)) {
          throw new Error('Format de fichier non supporté');
        }

        const formDataUpload = new FormData();
        formDataUpload.append('file', formData.file);
        formDataUpload.append('upload_preset', 'IEFPMinyarSirine');

        const response = await fetch('https://api.cloudinary.com/v1_1/demvebwif/raw/upload', {
          method: 'POST',
          body: formDataUpload,
        });

        const data = await response.json();
        if (data.error) throw new Error('Erreur lors du téléchargement du fichier');

        updatedData.file_url = data.secure_url;
      }

      await update(coursRef, updatedData);
      setSuccess('Cours mis à jour avec succès');
      setShowEditModal(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteConfirm = (coursItem, path) => {
    setCurrentCours({ ...coursItem, path });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const { path } = currentCours;
      const coursRef = ref(db, `cours/${path}`);
      await remove(coursRef);
      setSuccess('Cours supprimé avec succès');
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Date non disponible';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Helper function to ensure valid string
  const sanitizeString = (str, fallback = 'Non défini') => {
    return typeof str === 'string' && str.trim() ? str.trim() : fallback;
  };

  return (
    <Container>
      <MainTitle>Liste de Mes Cours</MainTitle>

      {success && (
        <StyledAlert variant="success" onClose={() => setSuccess(null)} dismissible>
          {success}
        </StyledAlert>
      )}
      {error && (
        <StyledAlert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </StyledAlert>
      )}

      {loading ? (
        <div style={{ textAlign: 'center' }}>
          <Spinner animation="border" role="status" style={{ color: '#2563eb' }}>
            <span className="visually-hidden">Chargement...</span>
          </Spinner>
          <p style={{ color: '#1f2937', marginTop: '0.5rem' }}>Chargement des cours...</p>
        </div>
      ) : Object.keys(memoizedCours).length === 0 ? (
        <p style={{ color: '#1f2937', textAlign: 'center' }}>
          Aucun cours trouvé pour ce formateur. Vérifiez /cours et /categories dans Firebase.
        </p>
      ) : (
        Object.entries(memoizedCours).map(([categoryId, formations]) => (
          <div key={categoryId} style={{ marginBottom: '2.5rem' }}>
            <CategoryTitle>
              {sanitizeString(memoizedCategories[categoryId]?.nom, 'Catégorie inconnue')}
              {memoizedCategories[categoryId]?.nom?.toLowerCase().includes('accélérée') ? ' (Accélérée)' : ''}
            </CategoryTitle>
            {Object.entries(formations).map(([formationId, semesters]) => (
              <div key={formationId} style={{ marginBottom: '1.5rem' }}>
                <FormationTitle>
                  {sanitizeString(
                    memoizedCategories[categoryId]?.formations?.[formationId]?.intitule,
                    'Formation inconnue'
                  )}
                </FormationTitle>
                {Object.entries(semesters).map(([semestre, courses]) => (
                  <div key={semestre} style={{ marginBottom: '1rem' }}>
                    <SemesterTitle>{sanitizeString(semestre, 'Semestre inconnu')}</SemesterTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                      {Object.entries(courses).map(([coursId, coursItem]) => {
                        const path = `${categoryId}/${formationId}/${semestre}/${coursId}`;
                        return (
                          <CourseCard key={coursId}>
                            <CourseTitle>{sanitizeString(coursItem.titre, 'Titre manquant')}</CourseTitle>
                            <CourseText>{sanitizeString(coursItem.description, 'Description manquante')}</CourseText>
                            <CourseDate>Date: {formatDate(coursItem.date_soumission)}</CourseDate>
                            {coursItem.isAccelerated && (
                              <p style={{ color: '#2563eb', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                Formation accélérée
                              </p>
                            )}
                            <ButtonGroup>
                              {coursItem.fileURL && (
                                <ViewButton as="a" href={coursItem.fileURL} target="_blank" rel="noopener noreferrer">
                                  Voir le fichier
                                </ViewButton>
                              )}
                              <EditButton onClick={() => handleEdit(coursItem, path)}>Modifier</EditButton>
                              <DeleteButton onClick={() => handleDeleteConfirm(coursItem, path)}>Supprimer</DeleteButton>
                            </ButtonGroup>
                          </CourseCard>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))
      )}

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <ModalTitle>Modifier le cours</ModalTitle>
        </Modal.Header>
        <ModalBody>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Titre</Form.Label>
              <Form.Control
                type="text"
                name="titre"
                value={formData.titre}
                onChange={handleChange}
                required
                style={{ borderRadius: '8px', borderColor: '#d1d5db' }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                style={{ borderRadius: '8px', borderColor: '#d1d5db' }}
              />
              {formData.description.length < 50 && (
                <Form.Text style={{ color: '#ef4444' }}>
                  La description semble incomplète. Ajoutez plus de détails.
                </Form.Text>
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Nouveau fichier (optionnel)</Form.Label>
              <Form.Control
                type="file"
                name="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                onChange={handleChange}
                style={{ borderRadius: '8px', borderColor: '#d1d5db' }}
              />
              <Form.Text style={{ color: '#6b7280' }}>
                Formats acceptés: PDF, DOC, DOCX, PPT, PPTX (max 10MB)
              </Form.Text>
            </Form.Group>
          </Form>
        </ModalBody>
        <ModalFooter>
          <ModalButton
            variant="secondary"
            onClick={() => setShowEditModal(false)}
            disabled={isUploading}
            style={{ background: '#9ca3af', color: 'white' }}
            onMouseOver={(e) => (e.target.style.background = '#6b7280')}
            onMouseOut={(e) => (e.target.style.background = '#9ca3af')}
          >
            Annuler
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleUpdate}
            disabled={isUploading}
            style={{ background: '#3b82f6', color: 'white' }}
            onMouseOver={(e) => (e.target.style.background = '#2563eb')}
            onMouseOut={(e) => (e.target.style.background = '#3b82f6')}
          >
            {isUploading ? (
              <>
                <Spinner size="sm" style={{ marginRight: '0.5rem' }} />
                Enregistrement...
              </>
            ) : 'Enregistrer'}
          </ModalButton>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <ModalTitle>Confirmer la suppression</ModalTitle>
        </Modal.Header>
        <ModalBody>
          <p style={{ color: '#1f2937' }}>Voulez-vous vraiment supprimer ce cours ? Cette action est irréversible.</p>
        </ModalBody>
        <ModalFooter>
          <ModalButton
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={isUploading}
            style={{ background: '#9ca3af', color: 'white' }}
            onMouseOver={(e) => (e.target.style.background = '#6b7280')}
            onMouseOut={(e) => (e.target.style.background = '#9ca3af')}
          >
            Annuler
          </ModalButton>
          <ModalButton
            variant="danger"
            onClick={handleDelete}
            disabled={isUploading}
            style={{ background: '#ef4444', color: 'white' }}
            onMouseOver={(e) => (e.target.style.background = '#dc2626')}
            onMouseOut={(e) => (e.target.style.background = '#ef4444')}
          >
            {isUploading ? (
              <>
                <Spinner size="sm" style={{ marginRight: '0.5rem' }} />
                Suppression...
              </>
            ) : 'Oui'}
          </ModalButton>
        </ModalFooter>
      </Modal>
    </Container>
  );
};

export default ListeCours;
