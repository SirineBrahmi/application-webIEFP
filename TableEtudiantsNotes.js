
import React, { useState, useEffect } from 'react';
import { ref, onValue, get } from 'firebase/database';
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

const StarRating = styled.div`
  display: flex;
  gap: 5px;
`;

const Star = styled(FaStar)`
  color: ${props => (props.filled ? '#f1c40f' : '#ddd')};
  font-size: 1.2rem;
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

const EmptyState = styled.div`
  padding: 30px;
  text-align: center;
  color: #777;
  font-style: italic;
  background-color: #f9f9f9;
  border-radius: 8px;
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

const TableEtudiantsNotes = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [filteredEtudiants, setFilteredEtudiants] = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormation, setSelectedFormation] = useState('all');
  const [resultats, setResultats] = useState({ examen: {}, controle: { quiz: {}, compte_rendu: {} } });
  const [quizResults, setQuizResults] = useState({});
  const [formateur, setFormateur] = useState(null);
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
      if (!snapshot.exists()) {
        console.log('No categories found');
        setError('Aucune catégorie disponible.');
        setLoading(false);
        return;
      }

      const categoriesData = snapshot.val();
      let allFormations = [];
      Object.entries(categoriesData).forEach(([categoryId, category]) => {
        const categoryFormations = category.formations || {};
        Object.entries(categoryFormations).forEach(([formationId, formation]) => {
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
          }
        });
      });

      if (allFormations.length === 0) {
        console.log('No published formations found');
        setError('Aucune formation publiée trouvée pour ce formateur.');
        setLoading(false);
        return;
      }

      console.log('Formations fetched:', allFormations);
      setFormations(allFormations);
      fetchInscriptions(allFormations);
    } catch (error) {
      console.error('Error fetching formations:', error);
      setError('Erreur lors du chargement des formations.');
      setLoading(false);
    }
  };

  const fetchInscriptions = async (formationsList) => {
    console.log('fetchInscriptions started with formations:', formationsList);
    try {
      const inscriptionsRef = ref(db, 'inscriptions');
      const snapshot = await get(inscriptionsRef);
      const inscriptionsData = snapshot.val() || {};
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

      if (allInscriptions.length === 0) {
        console.log('No inscriptions for these formations');
        setLoading(false);
        return;
      }

      console.log('Inscriptions fetched:', allInscriptions);
      fetchEtudiants(allInscriptions);
    } catch (error) {
      console.error('Error fetching inscriptions:', error);
      setError('Erreur lors du chargement des inscriptions.');
      setLoading(false);
    }
  };

  const fetchEtudiants = async (inscriptions) => {
    console.log('fetchEtudiants started with inscriptions:', inscriptions);
    try {
      const etudiantsRef = ref(db, 'utilisateurs/etudiants');
      const snapshot = await get(etudiantsRef);
      const etudiantsData = snapshot.val() || {};
      if (!snapshot.exists()) {
        console.log('No students found');
        setError('Aucun étudiant trouvé.');
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

      if (etudiantsList.length === 0) {
        console.log('No students found for inscriptions');
        setError('Aucun étudiant inscrit aux formations.');
        setLoading(false);
        return;
      }

      console.log('Students fetched:', etudiantsList);
      fetchQuizResults(etudiantsList);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Erreur lors du chargement des données des étudiants.');
      setLoading(false);
    }
  };

  const fetchQuizResults = (etudiantsList) => {
    console.log('fetchQuizResults started with etudiantsList:', etudiantsList);
    try {
      const quizResultsRef = ref(db, 'quiz_results');
      onValue(quizResultsRef, (snapshot) => {
        const quizResultsData = snapshot.val() || {};
        const quizScores = {};

        etudiantsList.forEach(etudiant => {
          Object.entries(quizResultsData).forEach(([quizId, results]) => {
            if (results[etudiant.id]) {
              const result = results[etudiant.id];
              if (!result.quizInfo || !result.quizInfo.maxPossibleScore) {
                console.warn(`Invalid quiz result for student ${etudiant.id}, quiz ${quizId}`);
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

        console.log('Quiz results fetched:', quizScores);
        fetchExistingResults(etudiantsList, quizScores);
      }, (error) => {
        console.error('Quiz results fetch error:', error);
        setQuizResults({});
        fetchExistingResults(etudiantsList, {});
      });
    } catch (error) {
      console.error('Error fetching quiz results:', error);
      setQuizResults({});
      fetchExistingResults(etudiantsList, {});
    }
  };

  const fetchExistingResults = (etudiantsList, quizScores) => {
    console.log('fetchExistingResults started with etudiantsList:', etudiantsList, 'quizScores:', quizScores);
    try {
      const resultatsRef = ref(db, 'resultats');
      onValue(resultatsRef, (snapshot) => {
        const resultatsData = snapshot.val() || {};
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
            // Handle legacy data: divide by 4 if note is on 0–20 scale
            const starValue = note > 5 ? Math.round(note / 4) : note;
            resultatsExistants.controle.compte_rendu[key] = starValue.toString();
          }
        });

        console.log('Existing results:', resultatsExistants);
        setResultats(resultatsExistants);
        setQuizResults(quizScores);
        setEtudiants(etudiantsList);
        setFilteredEtudiants(etudiantsList);
        setLoading(false);
        console.log('Loading set to false');
      }, (error) => {
        console.error('Results fetch error:', error);
        setError('Erreur lors du chargement des résultats.');
        setEtudiants(etudiantsList);
        setFilteredEtudiants(etudiantsList);
        setLoading(false);
      });
    } catch (error) {
      console.error('Error fetching existing results:', error);
      setError('Erreur lors du chargement des résultats existants.');
      setEtudiants(etudiantsList);
      setFilteredEtudiants(etudiantsList);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Filtering useEffect triggered', { searchTerm, selectedFormation, etudiants });
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
      console.log(`Formation not found for ID: ${formationId}`);
      return 'Formation inconnue';
    }
    const name = formation.intitule || formation.titre || formation.specialite || formation.nom || 'Formation sans nom';
    return name;
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

      <Title>Liste des Étudiants et Résultats</Title>

      {error && <ErrorMessage>{error}</ErrorMessage>}

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
                  <Th>Note Examen (sur 20)</Th>
                  <Th>Note Quiz (sur 20)</Th>
                  <Th>Note Compte Rendu (étoiles)</Th>
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
                      <Td>{resultats.examen[key] || 'Non disponible'}</Td>
                      <Td>{resultats.controle.quiz[key] || 'Non disponible'}</Td>
                      <Td>
                        <StarRating>
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              filled={star <= (parseInt(resultats.controle.compte_rendu[key]) || 0)}
                            />
                          ))}
                        </StarRating>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>

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

export default TableEtudiantsNotes;
