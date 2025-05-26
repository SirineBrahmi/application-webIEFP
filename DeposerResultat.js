
import React, { useState, useEffect } from 'react';
import { ref, onValue, set, get } from 'firebase/database';
import { db } from '../firebase';
import styled from 'styled-components';
import { FaStar } from 'react-icons/fa';

// Styled components (unchanged)
const Container = styled.div`
  padding: 20px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  color: #2c3e50;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h2`
  margin-bottom: 20px;
  color: #1e3b70;
  font-size: 1.8rem;
  text-align: center;
`;

const FormationSelector = styled.div`
  margin-bottom: 20px;
`;

const FormationSelect = styled.select`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  width: 100%;
  font-size: 0.95rem;
`;

const SearchBar = styled.div`
  margin-bottom: 20px;
`;

const SearchInput = styled.input`
  padding: 10px;
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 0.95rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  font-size: 0.95rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const Th = styled.th`
  text-align: left;
  padding: 12px;
  background-color: #1e3b70;
  color: white;
  font-weight: 600;
`;

const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid #eee;
`;

const Tr = styled.tr`
  &:hover {
    background-color: #f5f5f5;
  }
  &:nth-child(even) {
    background-color: #f9f9f9;
  }
`;

const ResultInput = styled.input`
  width: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  font-size: 0.9rem;
`;

const QuizScore = styled.span`
  display: inline-block;
  width: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  font-size: 0.9rem;
  background-color: #f8f9fa;
`;

const StarRating = styled.div`
  display: flex;
  gap: 5px;
`;

const Star = styled(FaStar)`
  cursor: pointer;
  color: ${props => (props.filled ? '#f1c40f' : '#ddd')};
  font-size: 1.2rem;
  transition: color 0.2s;
`;

const Button = styled.button`
  background-color: #1e3b70;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  margin-top: 20px;
  
  &:hover {
    background-color: #15294f;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 30px;
  text-align: center;
  color: #777;
  font-style: italic;
  background-color: #f9f9f9;
  border-radius: 8px;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  
  &::after {
    content: "";
    width: 40px;
    height: 40px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid #1e3b70;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  padding: 15px;
  margin-bottom: 20px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 5px;
  border: 1px solid #f5c6cb;
`;

const SuccessMessage = styled.div`
  padding: 15px;
  margin-bottom: 20px;
  background-color: #d4edda;
  color: #155724;
  border-radius: 5px;
  border: 1px solid #c3e6cb;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
  gap: 5px;
`;

const PageButton = styled.button`
  padding: 8px 12px;
  border: 1px solid #ddd;
  background-color: ${props => props.active ? '#1e3b70' : 'white'};
  color: ${props => props.active ? 'white' : '#333'};
  border-radius: 5px;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.active ? '#1e3b70' : '#f5f5f5'};
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const EvaluationSelector = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 5px;
  border: 1px solid #eee;
`;

const EvaluationType = styled.div`
  display: flex;
  align-items: center;
  margin-right: 15px;
`;

const RadioLabel = styled.label`
  margin-left: 5px;
  font-size: 0.95rem;
  margin-right: 15px;
  cursor: pointer;
`;

const WelcomeMessage = styled.div`
  margin-bottom: 20px;
  padding: 15px;
  background-color: #e3f2fd;
  border-radius: 5px;
  border: 1px solid #bbdefb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const WelcomeText = styled.div`
  font-size: 1.1rem;
`;

const ConnectionInfo = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const ResultatsExamens = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [filteredEtudiants, setFilteredEtudiants] = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormation, setSelectedFormation] = useState('all');
  const [resultats, setResultats] = useState({ examen: {}, controle: { quiz: {}, compte_rendu: {} } });
  const [evaluationType, setEvaluationType] = useState('examen');
  const [quizResults, setQuizResults] = useState({});
  const [formateur, setFormateur] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    console.log('Initial useEffect triggered');
    const currentFormateur = JSON.parse(localStorage.getItem('formateur')) || {};
    console.log('Formateur from localStorage:', JSON.stringify(currentFormateur, null, 2));
    if (!currentFormateur || !currentFormateur.uid) {
      setError('Veuillez vous connecter pour accéder à cette page.');
      setLoading(false);
      return;
    }
    setFormateur(currentFormateur);
    fetchFormations(currentFormateur);

    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Loading timeout reached');
        setError('Le chargement a pris trop de temps. Veuillez réessayer.');
        setLoading(false);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, []);

  const fetchFormations = async (formateur) => {
    console.log('fetchFormations started for formateur:', formateur.uid);
    try {
      const categoriesRef = ref(db, 'categories');
      const snapshot = await get(categoriesRef);
      console.log('categories snapshot received:', snapshot.exists());
      if (!snapshot.exists()) {
        console.log('No categories found');
        setError('Aucune catégorie disponible.');
        setLoading(false);
        return;
      }

      const categoriesData = snapshot.val();
      console.log('categoriesData:', JSON.stringify(categoriesData, null, 2));
      let allFormations = [];
      Object.entries(categoriesData).forEach(([categoryId, category]) => {
        const categoryFormations = category.formations || {};
        Object.entries(categoryFormations).forEach(([formationId, formation]) => {
          // Only include published formations (statut: validée or etape: pré-validée) with matching formateurId and valid categorieId
          if (
            formation.formateurId === formateur.uid &&
            formation.categorieId &&
            (formation.statut === 'validée' || formation.etape === 'pré-validée')
          ) {
            const formationData = {
              id: formationId,
              categoryId,
              categoryName: category.nom || categoryId,
              intitule: formation.intitule || formation.titre || formation.specialite || formation.nom || 'Formation sans nom',
              ...formation,
            };
            allFormations.push(formationData);

            // Check for formation matching specific criteria
            if (
              formation.dateDebut === '2025-05-31' &&
              formation.dateFin === '2025-09-19' &&
              formation.description === 'Cette formation a pour objectif d’initier les participants aux principaux outils bureautiques utilisés dans un environnement professionnel. Elle couvre l’utilisation de logiciels comme Microsoft Word, Excel, PowerPoint, ainsi qu’une introduction à Google Workspace.' &&
              formation.duree === '120' &&
              formation.evaluation === 'QCM'
            ) {
              console.log(`Formation matching criteria found: ID=${formationId}, Intitule=${formation.intitule}`);
            }
          } else {
            console.log(`Skipping formation ${formationId}: formateurId=${formation.formateurId}, categorieId=${formation.categorieId}, statut=${formation.statut}, etape=${formation.etape}`);
          }
        });
      });

      console.log('Filtered formations:', JSON.stringify(allFormations, null, 2));
      if (allFormations.length === 0) {
        console.log('No published formations associated with this formateur in categories');
        setError('Aucune formation publiée trouvée pour ce formateur.');
        setLoading(false);
        return;
      }

      setFormations(allFormations);
      fetchInscriptions(allFormations);
    } catch (error) {
      console.error('Erreur lors de la récupération des formations:', error);
      setError('Erreur lors du chargement des formations.');
      setLoading(false);
    }
  };

  const fetchInscriptions = async (formationsList) => {
    console.log('fetchInscriptions started with formations:', formationsList);
    try {
      const inscriptionsRef = ref(db, 'inscriptions');
      const snapshot = await get(inscriptionsRef);
      console.log('inscriptions snapshot received:', snapshot.exists());
      const inscriptionsData = snapshot.val() || {};
      console.log('inscriptionsData:', JSON.stringify(inscriptionsData, null, 2));
      if (!snapshot.exists()) {
        console.log('No inscriptions found');
        setLoading(false);
        return;
      }

      const allInscriptions = [];
      const formationIds = formationsList.map(f => f.id);

      Object.entries(inscriptionsData).forEach(([etudiantId, inscriptions]) => {
        Object.entries(inscriptions).forEach(([inscriptionId, inscriptionData]) => {
          const formationId = inscriptionData.idFormation || inscriptionData.formationId;
          if (formationId && formationIds.includes(formationId)) {
            allInscriptions.push({
              id: `${etudiantId}_${inscriptionId}`,
              idEtudiant: etudiantId,
              idFormation: formationId,
              dateInscription: inscriptionData.dateInscription || 'Non spécifiée',
            });
          }
        });
      });

      console.log('Inscriptions récupérées:', JSON.stringify(allInscriptions, null, 2));
      if (allInscriptions.length === 0) {
        console.log('No inscriptions for these formations');
        setLoading(false);
        return;
      }
      fetchEtudiants(allInscriptions);
    } catch (error) {
      console.error('Erreur lors de la récupération des inscriptions:', error);
      setError('Erreur lors du chargement des inscriptions.');
      setLoading(false);
    }
  };

  const fetchEtudiants = async (inscriptions) => {
    console.log('fetchEtudiants started with inscriptions:', inscriptions);
    try {
      const etudiantsRef = ref(db, 'utilisateurs/etudiants');
      const snapshot = await get(etudiantsRef);
      console.log('etudiants snapshot received:', snapshot.exists());
      const etudiantsData = snapshot.val() || {};
      console.log('etudiantsData:', JSON.stringify(etudiantsData, null, 2));
      if (!snapshot.exists()) {
        console.log('No etudiants found');
        setLoading(false);
        return;
      }

      const etudiantsList = [];
      inscriptions.forEach(inscription => {
        const etudiant = etudiantsData[inscription.idEtudiant];
        if (etudiant) {
          etudiantsList.push({
            id: inscription.idEtudiant,
            inscriptionId: inscription.id,
            nom: etudiant.nom || 'Non spécifié',
            prenom: etudiant.prenom || 'Non spécifié',
            email: etudiant.email || 'Non spécifié',
            numTel: etudiant.numTel || etudiant.numtel || 'Non spécifié',
            niveau: etudiant.niveau || 'Non spécifié',
            formationId: inscription.idFormation,
          });
        }
      });

      console.log('Étudiants récupérés:', JSON.stringify(etudiantsList, null, 2));
      if (etudiantsList.length === 0) {
        console.log('No students found for these inscriptions');
        setLoading(false);
        return;
      }
      fetchQuizResults(etudiantsList);
    } catch (error) {
      console.error('Erreur lors de la récupération des étudiants:', error);
      setError('Erreur lors du chargement des données des étudiants.');
      setLoading(false);
    }
  };

  const fetchQuizResults = (etudiantsList) => {
    console.log('fetchQuizResults started with etudiantsList:', etudiantsList);
    try {
      const quizResultsRef = ref(db, 'quiz_results');
      onValue(quizResultsRef, (snapshot) => {
        console.log('quiz_results snapshot received:', snapshot.exists());
        const quizResultsData = snapshot.val() || {};
        console.log('quizResultsData:', JSON.stringify(quizResultsData, null, 2));
        const quizScores = {};

        etudiantsList.forEach(etudiant => {
          Object.entries(quizResultsData).forEach(([quizId, results]) => {
            if (results[etudiant.id]) {
              const result = results[etudiant.id];
              if (!result.quizInfo || !result.quizInfo.maxPossibleScore) {
                console.warn(`Invalid quiz result for student ${etudiant.id}, quiz ${quizId}:`, result);
                return;
              }
              const formationId = etudiant.formationId;
              quizScores[`${etudiant.id}_${formationId}`] = {
                score: result.score,
                maxPossibleScore: result.quizInfo.maxPossibleScore,
                formationName: result.quizInfo.formationName || 'Unknown',
              };
            }
          });
        });

        console.log('Quiz results récupérés:', JSON.stringify(quizScores, null, 2));
        fetchExistingResults(etudiantsList, quizScores);
      }, (error) => {
        console.error('Quiz results fetch error:', error);
        setQuizResults({});
        fetchExistingResults(etudiantsList, {});
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des quiz results:', error);
      setQuizResults({});
      fetchExistingResults(etudiantsList, {});
    }
  };

  const fetchExistingResults = (etudiantsList, quizScores) => {
    console.log('fetchExistingResults started with etudiantsList:', etudiantsList, 'quizScores:', quizScores);
    try {
      const resultatsRef = ref(db, 'resultats');
      onValue(resultatsRef, (snapshot) => {
        console.log('resultats snapshot received:', snapshot.exists());
        const resultatsData = snapshot.val() || {};
        console.log('resultatsData:', JSON.stringify(resultatsData, null, 2));
        const resultatsExistants = { examen: {}, controle: { quiz: {}, compte_rendu: {} } };

        etudiantsList.forEach(etudiant => {
          const key = `${etudiant.id}_${etudiant.formationId}`;
          if (resultatsData[etudiant.formationId]?.examen?.[etudiant.id]) {
            resultatsExistants.examen[key] = resultatsData[etudiant.formationId].examen[etudiant.id].note.toString();
          }
          if (quizScores[key]) {
            resultatsExistants.controle.quiz[key] = (quizScores[key].score / quizScores[key].maxPossibleScore * 20).toFixed(2);
          }
          if (resultatsData[etudiant.formationId]?.controle?.compte_rendu?.[etudiant.id]) {
            const note = resultatsData[etudiant.formationId].controle.compte_rendu[etudiant.id].note;
            resultatsExistants.controle.compte_rendu[key] = Math.round(note / 4).toString();
          }
        });

        console.log('Résultats existants:', JSON.stringify(resultatsExistants, null, 2));
        setResultats(resultatsExistants);
        setQuizResults(quizScores);
        setEtudiants(etudiantsList);
        setFilteredEtudiants(etudiantsList);
        setLoading(false);
        console.log('Loading set to false');
      }, (error) => {
        console.error('Results fetch error:', error);
        setEtudiants(etudiantsList);
        setFilteredEtudiants(etudiantsList);
        setLoading(false);
        console.log('Loading set to false due to error');
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats existants:', error);
      setEtudiants(etudiantsList);
      setFilteredEtudiants(etudiantsList);
      setLoading(false);
      console.log('Loading set to false due to error');
    }
  };

  useEffect(() => {
    if (etudiants.length > 0) {
      console.log('useEffect for evaluationType or etudiants triggered');
      fetchQuizResults(etudiants);
    }
  }, [evaluationType, etudiants]);

  useEffect(() => {
    console.log('useEffect for filtering triggered');
    let result = [...etudiants];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e =>
        (e.nom && e.nom.toLowerCase().includes(term)) ||
        (e.prenom && e.prenom.toLowerCase().includes(term)) ||
        (e.email && e.email.toLowerCase().includes(term))
      );
    }
    if (selectedFormation !== 'all') {
      result = result.filter(e => e.formationId === selectedFormation);
    }
    setFilteredEtudiants(result);
    setCurrentPage(1);
  }, [searchTerm, selectedFormation, etudiants]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEtudiants.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEtudiants.length / itemsPerPage);

  const getFormationName = (formationId) => {
    const formation = formations.find(f => f.id === formationId);
    if (!formation) {
      console.log(`Formation introuvable pour ID: ${formationId}`);
      return 'Formation inconnue';
    }
    const name = formation.intitule || formation.titre || formation.specialite || formation.nom || 'Formation sans nom';
    console.log(`Formation ID: ${formationId}, Nom: ${name}`);
    return name;
  };

  const handleResultatChange = (etudiantId, formationId, valeur, subType) => {
    console.log('handleResultatChange:', { etudiantId, formationId, valeur, subType });
    if (evaluationType === 'examen') {
      const note = parseFloat(valeur);
      if (isNaN(note) && valeur !== '') return;
      if (note > 20 || note < 0) return;
      setResultats(prev => ({
        ...prev,
        examen: {
          ...prev.examen,
          [`${etudiantId}_${formationId}`]: valeur,
        },
      }));
    } else if (evaluationType === 'controle' && subType === 'compte_rendu') {
      const stars = parseInt(valeur, 10);
      if (isNaN(stars) || stars < 0 || stars > 5) return;
      setResultats(prev => ({
        ...prev,
        controle: {
          ...prev.controle,
          compte_rendu: {
            ...prev.controle.compte_rendu,
            [`${etudiantId}_${formationId}`]: stars.toString(),
          },
        },
      }));
    }
  };

  const handleStarClick = (etudiantId, formationId, stars) => {
    console.log('handleStarClick:', { etudiantId, formationId, stars });
    handleResultatChange(etudiantId, formationId, stars.toString(), 'compte_rendu');
  };

  const enregistrerResultats = async () => {
    console.log('enregistrerResultats called');
    setError(null);
    setSuccess(null);

    if (!formateur?.uid) {
      setError('Vous devez être connecté pour enregistrer les résultats.');
      return;
    }

    const resultatsFiltres = [];
    if (evaluationType === 'examen') {
      Object.entries(resultats.examen).forEach(([key, value]) => {
        if (value !== '' && currentItems.some(e => `${e.id}_${e.formationId}` === key)) {
          resultatsFiltres.push({ key, value, type: 'examen' });
        }
      });
    } else {
      Object.entries(resultats.controle.quiz).forEach(([key, value]) => {
        if (value !== '' && currentItems.some(e => `${e.id}_${e.formationId}` === key)) {
          resultatsFiltres.push({ key, value, type: 'controle', subType: 'quiz' });
        }
      });
      Object.entries(resultats.controle.compte_rendu).forEach(([key, value]) => {
        if (value !== '' && currentItems.some(e => `${e.id}_${e.formationId}` === key)) {
          resultatsFiltres.push({ key, value, type: 'controle', subType: 'compte_rendu' });
        }
      });
    }

    console.log('Résultats à enregistrer:', resultatsFiltres);
    if (resultatsFiltres.length === 0) {
      setError('Veuillez saisir au moins un résultat avant d’enregistrer.');
      return;
    }

    try {
      for (const { key, value, type, subType } of resultatsFiltres) {
        const [etudiantId, formationId] = key.split('_');
        let noteValue = type === 'examen' ? parseFloat(value) : parseInt(value, 10);
        if (type === 'controle' && subType === 'compte_rendu') {
          noteValue = noteValue * 4;
        }

        const resultatRef = ref(db, `resultats/${formationId}/${type}${subType ? `/${subType}` : ''}/${etudiantId}`);
        await set(resultatRef, {
          note: noteValue,
          formateurId: formateur.uid,
          dateEvaluation: new Date().toISOString(),
          formationId: formationId,
        });
      }

      setSuccess(`Les résultats ont été enregistrés avec succès pour ${resultatsFiltres.length} étudiant(s).`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Erreur lors de l’enregistrement des résultats:', error);
      setError('Une erreur est survenue lors de l’enregistrement des résultats.');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container>
      <WelcomeMessage>
        <WelcomeText>
          Bienvenue, {formateur?.prenom || 'Formateur'} {formateur?.nom || ''}
        </WelcomeText>
        <ConnectionInfo>
          Dernière connexion: {formateur?.dernierLogin || 'Première connexion'}
        </ConnectionInfo>
      </WelcomeMessage>

      <Title>Déposer les résultats des étudiants</Title>

      {success && <SuccessMessage>{success}</SuccessMessage>}
      {error && <ErrorMessage>{error}</ErrorMessage>}

      <EvaluationSelector>
        <div>
          <h3>Type d’évaluation:</h3>
          <EvaluationType>
            <input
              type="radio"
              id="examen"
              name="evaluationType"
              value="examen"
              checked={evaluationType === 'examen'}
              onChange={() => setEvaluationType('examen')}
            />
            <RadioLabel htmlFor="examen">Examen</RadioLabel>

            <input
              type="radio"
              id="controle"
              name="evaluationType"
              value="controle"
              checked={evaluationType === 'controle'}
              onChange={() => setEvaluationType('controle')}
            />
            <RadioLabel htmlFor="controle">Contrôle continu</RadioLabel>
          </EvaluationType>
        </div>
      </EvaluationSelector>

      <FormationSelector>
        <FormationSelect
          value={selectedFormation}
          onChange={(e) => setSelectedFormation(e.target.value)}
        >
          <option value="all">Toutes les formations</option>
          {formations.map((formation) => (
            <option key={formation.id} value={formation.id}>
              {getFormationName(formation.id)}
            </option>
          ))}
        </FormationSelect>
      </FormationSelector>

      <SearchBar>
        <SearchInput
          type="text"
          placeholder="Rechercher un étudiant par nom, prénom ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchBar>

      {formateur?.uid ? (
        currentItems.length > 0 ? (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Nom</Th>
                  <Th>Prénom</Th>
                  <Th>Email</Th>
                  <Th>Niveau</Th>
                  <Th>Formation</Th>
                  {evaluationType === 'examen' ? (
                    <Th>Note (sur 20)</Th>
                  ) : (
                    <>
                      <Th>Note Quiz (sur 20)</Th>
                      <Th>Note Compte Rendu (étoiles)</Th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((etudiant) => {
                  const key = `${etudiant.id}_${etudiant.formationId}`;
                  return (
                    <Tr key={key}>
                      <Td>{etudiant.nom}</Td>
                      <Td>{etudiant.prenom}</Td>
                      <Td>{etudiant.email}</Td>
                      <Td>{etudiant.niveau}</Td>
                      <Td>{getFormationName(etudiant.formationId)}</Td>
                      {evaluationType === 'examen' ? (
                        <Td>
                          <ResultInput
                            type="text"
                            value={resultats.examen[key] || ''}
                            onChange={(e) => handleResultatChange(etudiant.id, etudiant.formationId, e.target.value)}
                            placeholder="0-20"
                          />
                        </Td>
                      ) : (
                        <>
                          <Td>
                            <QuizScore>
                              {resultats.controle.quiz[key] || 'Non disponible'}
                            </QuizScore>
                          </Td>
                          <Td>
                            <StarRating>
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                  key={star}
                                  filled={star <= (parseInt(resultats.controle.compte_rendu[key]) || 0)}
                                  onClick={() => handleStarClick(etudiant.id, etudiant.formationId, star)}
                                />
                              ))}
                            </StarRating>
                          </Td>
                        </>
                      )}
                    </Tr>
                  );
                })}
              </tbody>
            </Table>

            <Button onClick={enregistrerResultats}>
              Enregistrer les résultats
            </Button>

            {totalPages > 1 && (
              <Pagination>
                <PageButton
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  «
                </PageButton>

                {[...Array(totalPages).keys()].map(number => (
                  <PageButton
                    key={number + 1}
                    active={currentPage === number + 1}
                    onClick={() => setCurrentPage(number + 1)}
                  >
                    {number + 1}
                  </PageButton>
                ))}

                <PageButton
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  »
                </PageButton>
              </Pagination>
            )}
          </>
        ) : (
          <EmptyState>
            {searchTerm || selectedFormation !== 'all'
              ? 'Aucun étudiant ne correspond aux critères de recherche'
              : 'Aucun étudiant n’est inscrit à vos formations'}
          </EmptyState>
        )
      ) : (
        <ErrorMessage>
          Veuillez vous connecter pour accéder à cette page.
        </ErrorMessage>
      )}
    </Container>
  );
};

export default ResultatsExamens;
