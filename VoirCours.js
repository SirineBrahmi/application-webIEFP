
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db } from '../../firebase';
import styled from 'styled-components';

const PageTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #1e3b70;
`;

const ErrorMessage = styled.p`
  color: #e74c3c;
  padding: 1rem;
  background-color: #fdeaea;
  border-radius: 4px;
  border-left: 4px solid #e74c3c;
`;

const InfoMessage = styled.p`
  color: #3498db;
  padding: 1rem;
  background-color: #e8f4fc;
  border-radius: 4px;
  border-left: 4px solid #3498db;
`;

const FormationSelect = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  background-color: white;
  font-size: 1rem;
`;

const CourseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
`;

const CourseCard = styled.div`
  padding: 1.25rem;
  border: 1px solid #eaeaea;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  background-color: white;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  }
`;

const CourseTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1e3b70;
  word-break: break-word;
`;

const CourseDescription = styled.p`
  color: #555;
  margin-bottom: 1rem;
  line-height: 1.5;
  word-break: break-word;
`;

const CourseInfo = styled.p`
  color: #666;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const DownloadLink = styled.a`
  display: inline-block;
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background-color: #3498db;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.2s;
  &:hover {
    background-color: #2980b9;
  }
`;

const LoadingMessage = styled.p`
  color: #666;
  font-style: italic;
`;

const ButtonContainer = styled.div`
  margin-bottom: 1.5rem;
`;

const Button = styled.button`
  background-color: #3498db;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
  &:hover {
    background-color: #2980b9;
  }
`;

function VoirCours() {
  const context = useOutletContext();
  const { studentData, enrolledCourses } = context || {};
  const [selectedFormation, setSelectedFormation] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const [formationDetails, setFormationDetails] = useState({});
  const [debugInfo, setDebugInfo] = useState({
    contextData: false,
    studentData: false,
    inscriptions: [],
    fetchStatus: { inscriptions: false, formations: false, courses: false },
  });

  // Compteur de rendus
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current += 1;
    console.log(`Render count: ${renderCount.current}`);
  });

  // Comparaison profonde
  const areObjectsEqual = useCallback((obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }, []);

  // Vérifier le contexte
  useEffect(() => {
    if (context) {
      setDebugInfo((prev) => ({
        ...prev,
        contextData: true,
        studentData: !!studentData,
        enrolledCourses: enrolledCourses || [],
      }));
    } else {
      setError('Erreur de contexte: données non disponibles');
    }
  }, [context, studentData, enrolledCourses]);

  // Récupérer les inscriptions
  const fetchInscriptions = useCallback(async () => {
    if (!studentData?.uid) {
      setError('Identifiant étudiant manquant');
      setDebugInfo((prev) => ({
        ...prev,
        fetchStatus: { ...prev.fetchStatus, inscriptions: true },
      }));
      return;
    }

    setInfoMessage('Vérification des inscriptions...');
    setLoading(true);

    try {
      const inscriptionsRef = ref(db, `inscriptions/${studentData.uid}`);
      const snapshot = await get(inscriptionsRef);

      const inscriptionsData = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          inscriptionsData.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });
      }

      setDebugInfo((prev) => ({
        ...prev,
        inscriptions: inscriptionsData,
        inscriptionsFound: inscriptionsData.length > 0,
      }));

      if (inscriptionsData.length === 0) {
        setError('Aucune inscription trouvée pour votre compte.');
        return;
      }

      setInfoMessage('Inscriptions trouvées. Extraction des formations...');
    const formationIds = new Set();
      inscriptionsData.forEach((inscription) => {
        if (inscription.formationId) formationIds.add(inscription.formationId);
        if (inscription.idFormation) formationIds.add(inscription.idFormation);
      });

      // Récupérer les détails des formations
      const details = {};
      const categoriesRef = ref(db, 'categories');
      const categoriesSnapshot = await get(categoriesRef);

      if (!categoriesSnapshot.exists()) {
        setError('Aucune catégorie trouvée dans /categories');
        return;
      }

      const categories = categoriesSnapshot.val();
      for (const formationId of formationIds) {
        let formationFound = false;
        for (const [categoryId, categoryData] of Object.entries(categories)) {
          if (categoryData.formations?.[formationId]) {
            details[formationId] = {
              ...categoryData.formations[formationId],
              titre: categoryData.formations[formationId].intitule || categoryData.formations[formationId].titre || formationId,
              categorieId: categoryId,
              categorieNom: categoryData.nom || 'Catégorie inconnue',
            };
            formationFound = true;
            break;
          }
        }
        if (!formationFound) {
          details[formationId] = { titre: formationId, categorieId: 'unknown', categorieNom: 'Inconnu' };
          console.warn(`Formation ${formationId} non trouvée dans /categories`);
        }
      }

      console.log('Formation details récupérées:', details);

      setFormationDetails((prev) => {
        if (areObjectsEqual(prev, details)) {
          console.log('Formation details inchangés, mise à jour ignorée');
          return prev;
        }
        console.log('Mise à jour des formation details');
        return details;
      });

      if (Object.keys(details).length > 0) {
        setSelectedFormation(Object.keys(details)[0]);
        setInfoMessage('Formations trouvées. Sélectionnez une formation pour voir les cours.');
      } else {
        setError('Aucune formation valide trouvée dans vos inscriptions.');
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des inscriptions:', err);
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
      setDebugInfo((prev) => ({
        ...prev,
        fetchStatus: { ...prev.fetchStatus, inscriptions: true },
      }));
    }
  }, [studentData, areObjectsEqual]);

  useEffect(() => {
    if (!enrolledCourses || enrolledCourses.length === 0) {
      fetchInscriptions();
    }
  }, [enrolledCourses, fetchInscriptions]);

  // Récupérer les détails depuis enrolledCourses
  const fetchFormationDetailsFromContext = useCallback(async () => {
    if (!enrolledCourses || enrolledCourses.length === 0) return;

    setInfoMessage('Récupération des détails des formations...');
    setLoading(true);

    try {
      const details = {};
      const categoriesRef = ref(db, 'categories');
      const categoriesSnapshot = await get(categoriesRef);

      if (!categoriesSnapshot.exists()) {
        setError('Aucune catégorie trouvée dans /categories');
        return;
      }

      const categories = categoriesSnapshot.val();
      for (const course of enrolledCourses) {
        const formationId = course.formationId || course.idFormation;
        let formationFound = false;

        for (const [categoryId, categoryData] of Object.entries(categories)) {
          if (categoryData.formations?.[formationId]) {
            details[formationId] = {
              ...categoryData.formations[formationId],
              titre: categoryData.formations[formationId].intitule || categoryData.formations[formationId].titre || formationId,
              categorieId: categoryId,
              categorieNom: categoryData.nom || 'Catégorie inconnue',
            };
            formationFound = true;
            break;
          }
        }

        if (!formationFound) {
          details[formationId] = {
            titre: formationId,
            categorieId: 'unknown',
            categorieNom: 'Inconnu',
          };
          console.warn(`Formation ${formationId} non trouvée dans /categories`);
        }
      }

      console.log('Formation details depuis enrolledCourses:', details);

      setFormationDetails((prev) => {
        if (areObjectsEqual(prev, details)) {
          console.log('Formation details inchangés, mise à jour ignorée');
          return prev;
        }
        console.log('Mise à jour des formation details');
        return details;
      });

      if (enrolledCourses.length > 0) {
        setSelectedFormation(enrolledCourses[0].formationId || enrolledCourses[0].idFormation);
        setInfoMessage(null);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des détails des formations:', err);
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
      setDebugInfo((prev) => ({
        ...prev,
        fetchStatus: { ...prev.fetchStatus, formations: true },
      }));
    }
  }, [enrolledCourses, areObjectsEqual]);

  useEffect(() => {
    if (enrolledCourses?.length > 0) {
      fetchFormationDetailsFromContext();
    }
  }, [enrolledCourses, fetchFormationDetailsFromContext]);

  // Récupérer les cours
  const fetchCourses = useCallback(async () => {
    if (!selectedFormation || !formationDetails[selectedFormation]) {
      setCourses([]);
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage('Chargement des cours...');

    try {
      const formation = formationDetails[selectedFormation];
      const categorieId = formation.categorieId || '1748100480817';
      const coursRef = ref(db, `cours/${categorieId}/${selectedFormation}/semestre1`);
      const snapshot = await get(coursRef);

      if (!snapshot.exists()) {
        setCourses([]);
        setInfoMessage(`Aucun cours trouvé pour la formation ${formation.titre || selectedFormation}.`);
        return;
      }

      const coursList = [];
      snapshot.forEach((childSnapshot) => {
        coursList.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
          formationId: selectedFormation,
        });
      });

      console.log('Cours récupérés:', coursList);

      setCourses(coursList);
      setInfoMessage(coursList.length === 0 ? 'Aucun cours disponible pour cette formation.' : null);
    } catch (error) {
      console.error('Erreur lors de la récupération des cours:', error);
      setCourses([]);
      setError(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
      setDebugInfo((prev) => ({
        ...prev,
        fetchStatus: { ...prev.fetchStatus, courses: true },
      }));
    }
  }, [selectedFormation, formationDetails]);

  useEffect(() => {
    if (selectedFormation && Object.keys(formationDetails).length > 0) {
      fetchCourses();
    }
  }, [selectedFormation, formationDetails, fetchCourses]);

  const handleFormationChange = useCallback((e) => {
    setSelectedFormation(e.target.value);
  }, []);

  const handleDebugClick = useCallback(() => {
    console.log('Données de débogage:', {
      context,
      studentData,
      enrolledCourses,
      formationDetails,
      selectedFormation,
      courses,
      debugInfo,
    });
    alert('Informations de débogage affichées dans la console (F12).');
  }, [context, studentData, enrolledCourses, formationDetails, selectedFormation, courses, debugInfo]);

  // Mémoriser les données
  const memoizedFormationDetails = useMemo(() => formationDetails, [formationDetails]);
  const memoizedCourses = useMemo(() => courses, [courses]);

  // Formater les dates
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Date non disponible';
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? 'Date invalide'
      : date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  }, []);

  // Sanitiser les chaînes
  const sanitizeString = useCallback((formation, fallback = 'Formation inconnue') => {
    if (!formation) return fallback;
    return typeof formation.intitule === 'string' && formation.intitule.trim()
      ? formation.intitule.trim()
      : typeof formation.titre === 'string' && formation.titre.trim()
      ? formation.titre.trim()
      : fallback;
  }, []);

  if (!context) {
    return <ErrorMessage>Erreur de contexte: données non disponibles</ErrorMessage>;
  }

  const hasFormations = Object.keys(memoizedFormationDetails).length > 0;

  return (
    <div>
      <PageTitle>Mes Cours</PageTitle>

      {infoMessage && <InfoMessage>{infoMessage}</InfoMessage>}

      {!hasFormations ? (
        <>
          <ErrorMessage>
            Vous n'êtes inscrit à aucune formation validée. Vérifiez votre inscription ou contactez l'administration.
          </ErrorMessage>
          <ButtonContainer>
            <Button onClick={handleDebugClick}>Déboguer</Button>
          </ButtonContainer>
        </>
      ) : (
        <div>
          <div>
            <label
              htmlFor="formationSelect"
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}
            >
              Sélectionner une formation :
            </label>
            <FormationSelect id="formationSelect" value={selectedFormation} onChange={handleFormationChange}>
              <option value="">-- Choisir une formation --</option>
              {Object.keys(memoizedFormationDetails).map((formationId) => (
                <option key={formationId} value={formationId}>
                  {sanitizeString(memoizedFormationDetails[formationId], formationId)}
                </option>
              ))}
            </FormationSelect>
          </div>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          {loading ? (
            <LoadingMessage>Chargement des cours...</LoadingMessage>
          ) : memoizedCourses.length === 0 && !error ? (
            <InfoMessage>Aucun cours disponible pour cette formation.</InfoMessage>
          ) : (
            <CourseGrid>
              {memoizedCourses.map((course) => (
                <CourseCard key={`${course.formationId}-${course.id}`}>
                  <CourseTitle>{sanitizeString({ titre: course.titre }, 'Cours sans titre')}</CourseTitle>
                  <CourseDescription>{sanitizeString({ titre: course.description }, 'Aucune description')}</CourseDescription>
                  {(course.formateurNom || course.formateurPrenom) && (
                    <CourseInfo>
                      <strong>Formateur :</strong>{' '}
                      {sanitizeString({ titre: course.formateurPrenom })} {sanitizeString({ titre: course.formateurNom })}
                    </CourseInfo>
                  )}
                  {course.date_soumission && (
                    <CourseInfo>
                      <strong>Date de soumission :</strong> {formatDate(course.date_soumission)}
                    </CourseInfo>
                  )}
                  {(course.file_url || course.fileURL) && (
                    <DownloadLink href={course.file_url || course.fileURL} target="_blank" rel="noopener noreferrer">
                      Télécharger le fichier
                    </DownloadLink>
                  )}
                </CourseCard>
              ))}
            </CourseGrid>
          )}
        </div>
      )}
    </div>
  );
}

export default VoirCours;
