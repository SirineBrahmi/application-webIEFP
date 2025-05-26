import React, { useEffect, useState, useCallback } from 'react';
import { get, ref } from 'firebase/database';
import { db } from '../../firebase';
import { useOutletContext } from 'react-router-dom';
import styled from 'styled-components';
import { FaStar } from 'react-icons/fa';

const ResultsContent = () => {
  const { studentData, enrolledCourses, userId } = useOutletContext();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formateurs, setFormateurs] = useState({});
  const [formationDetails, setFormationDetails] = useState({});

  // Fonction pour récupérer les détails des formations depuis les catégories
  const fetchFormationDetails = useCallback(async (formationIds) => {
    try {
      const details = {};
      const categoriesRef = ref(db, 'categories');
      const categoriesSnapshot = await get(categoriesRef);

      if (categoriesSnapshot.exists()) {
        const categories = categoriesSnapshot.val();
        for (const formationId of formationIds) {
          let formationFound = false;
          for (const [categoryId, categoryData] of Object.entries(categories)) {
            if (categoryData.formations?.[formationId]) {
              details[formationId] = {
                ...categoryData.formations[formationId],
                titre: categoryData.formations[formationId].intitule || 
                      categoryData.formations[formationId].titre || 
                      formationId,
                categorieId: categoryId,
                categorieNom: categoryData.nom || 'Catégorie inconnue'
              };
              formationFound = true;
              break;
            }
          }
          if (!formationFound) {
            details[formationId] = { 
              titre: formationId, 
              categorieId: 'unknown', 
              categorieNom: 'Inconnu' 
            };
          }
        }
      }
      return details;
    } catch (err) {
      console.error('Erreur lors de la récupération des détails des formations:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // 1. Récupérer tous les formateurs
        const formateursRef = ref(db, 'utilisateurs/formateurs');
        const formateursSnapshot = await get(formateursRef);
        const formateursData = {};
        
        if (formateursSnapshot.exists()) {
          formateursSnapshot.forEach((formateur) => {
            formateursData[formateur.key] = {
              nom: formateur.val().nom,
              prenom: formateur.val().prenom
            };
          });
        }
        setFormateurs(formateursData);

        // 2. Récupérer les résultats et collecter les IDs de formation
        const resultsRef = ref(db, 'resultats');
        const resultsSnapshot = await get(resultsRef);
        const resultsData = [];
        const formationIds = new Set();

        if (resultsSnapshot.exists()) {
          const allResults = resultsSnapshot.val();
          
          Object.entries(allResults).forEach(([formationId, formationResults]) => {
            formationIds.add(formationId);

            // Examens
            if (formationResults.examen?.[userId]) {
              const examData = formationResults.examen[userId];
              resultsData.push({
                id: `${formationId}-examen-${userId}`,
                formationId,
                type: 'Examen',
                note: examData.note,
                dateEvaluation: examData.dateEvaluation,
                formateurId: examData.formateurId,
                details: examData
              });
            }

            // Contrôles et Quiz
            if (formationResults.controle) {
              // Compte-rendu
              if (formationResults.controle.compte_rendu?.[userId]) {
                const controleData = formationResults.controle.compte_rendu[userId];
                resultsData.push({
                  id: `${formationId}-controle-${userId}`,
                  formationId,
                  type: 'Contrôle',
                  note: controleData.note,
                  dateEvaluation: controleData.dateEvaluation,
                  formateurId: controleData.formateurId,
                  details: controleData
                });
              }

              // Quiz
              if (formationResults.controle.quiz?.[userId]) {
                const quizData = formationResults.controle.quiz[userId];
                resultsData.push({
                  id: `${formationId}-quiz-${userId}`,
                  formationId,
                  type: 'Quiz',
                  note: quizData.note,
                  stars: Math.round((quizData.note / 20) * 5),
                  dateEvaluation: quizData.dateEvaluation,
                  formateurId: quizData.formateurId,
                  details: quizData,
                  isStars: true
                });
              }
            }
          });
        }

        // 3. Récupérer les détails des formations
        if (formationIds.size > 0) {
          const details = await fetchFormationDetails(Array.from(formationIds));
          setFormationDetails(details);
        }

        // Trier les résultats par date
        resultsData.sort((a, b) => new Date(b.dateEvaluation) - new Date(a.dateEvaluation));
        setResults(resultsData);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Erreur lors de la récupération des résultats');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, fetchFormationDetails]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getCourseName = (formationId) => {
    // Vérifier d'abord dans enrolledCourses
    if (enrolledCourses && Array.isArray(enrolledCourses)) {
      const course = enrolledCourses.find(c => 
        c.formationId === formationId || 
        c.id === formationId ||
        (c.formation && c.formation.id === formationId)
      );
      if (course) {
        return course.formation?.intitule || 
               course.formation?.titre || 
               course.intitule || 
               course.nomFormation || 
               'Formation inconnue';
      }
    }
    
    // Sinon vérifier dans formationDetails
    if (formationDetails[formationId]) {
      return formationDetails[formationId].titre || 'Formation inconnue';
    }
    
    return 'Formation inconnue';
  };

  const getFormateurName = (formateurId) => {
    if (!formateurId) return 'N/A';
    const formateur = formateurs[formateurId];
    return formateur ? `${formateur.prenom} ${formateur.nom}` : 'Formateur inconnu';
  };

  const renderNote = (result) => {
    if (result.isStars) {
      return (
        <StarContainer>
          <StarRating>
            {[1, 2, 3, 4, 5].map(star => (
              <Star 
                key={star} 
                color={star <= result.stars ? '#FFD700' : '#ddd'}
              />
            ))}
          </StarRating>
          <NoteText>({result.note.toFixed(2)}/20)</NoteText>
        </StarContainer>
      );
    }
    return (
      <Score $good={result.note >= 10}>
        {result.note.toFixed(2)}/20
      </Score>
    );
  };

  const calculateAverage = () => {
    const validResults = results.filter(r => typeof r.note === 'number');
    if (validResults.length === 0) return 0;
    return validResults.reduce((total, result) => total + result.note, 0) / validResults.length;
  };

  const calculateSuccessRate = () => {
    const validResults = results.filter(r => typeof r.note === 'number');
    return validResults.filter(r => r.note >= 10).length;
  };

  if (loading) {
    return <Loading>Chargement des résultats...</Loading>;
  }

  return (
    <Container>
      <Header>
        <Title>Vos résultats</Title>
        {studentData && (
          <StudentInfo>
            
          </StudentInfo>
        )}
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <ResultsTable>
        <TableHeader>
          <HeaderCell width="25%">Formation</HeaderCell>
          <HeaderCell width="15%">Type</HeaderCell>
          <HeaderCell width="20%">Note</HeaderCell>
          <HeaderCell width="20%">Date</HeaderCell>
          <HeaderCell width="20%">Formateur</HeaderCell>
        </TableHeader>

        <TableBody>
          {results.length > 0 ? (
            results.map((result) => {
              const formation = formationDetails[result.formationId] || {};
              return (
                <ResultRow key={result.id}>
                  <TableCell width="25%">
                    <FormationContainer>
                      <FormationTitle>{formation.titre || 'Formation inconnue'}</FormationTitle>
                      {formation.categorieNom && (
                        <FormationCategory>{formation.categorieNom}</FormationCategory>
                      )}
                    </FormationContainer>
                  </TableCell>
                  <TableCell width="15%">
                    <ResultType type={result.type.toLowerCase()}>
                      {result.type}
                    </ResultType>
                  </TableCell>
                  <TableCell width="20%">
                    {renderNote(result)}
                  </TableCell>
                  <TableCell width="20%">
                    <DateText>{formatDate(result.dateEvaluation)}</DateText>
                  </TableCell>
                  <TableCell width="20%">
                    <FormateurText>{getFormateurName(result.formateurId)}</FormateurText>
                  </TableCell>
                </ResultRow>
              );
            })
          ) : (
            <NoResults>
              <td colSpan="5">Aucun résultat disponible</td>
            </NoResults>
          )}
        </TableBody>
      </ResultsTable>

      {results.length > 0 && (
        <StatsContainer>
          <StatCard>
            <StatValue>
              {calculateAverage().toFixed(2)}/20
            </StatValue>
            <StatLabel>Moyenne générale</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>
              {calculateSuccessRate()}/{results.length}
            </StatValue>
            <StatLabel>Résultats validés</StatLabel>
          </StatCard>
        </StatsContainer>
      )}
    </Container>
  );
};

// Styles (inchangés)
const Container = styled.div`
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e1e5eb;
`;

const Title = styled.h2`
  color: #1e3b70;
  margin: 0 0 10px 0;
  font-size: 1.8rem;
  text-align: center;
`;

const StudentInfo = styled.div`
  color: #4a5568;
  font-size: 1rem;
  text-align: center;
`;

const ErrorMessage = styled.div`
  background-color: #fff5f5;
  color: #c53030;
  padding: 12px 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  border: 1px solid #fed7d7;
  text-align: center;
`;

const ResultsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const TableHeader = styled.thead`
  background-color: #1e3b70;
  color: white;
`;

const HeaderCell = styled.th`
  padding: 15px;
  text-align: left;
  width: ${props => props.width || 'auto'};
  font-weight: 600;
`;

const TableBody = styled.tbody`
  tr:nth-child(even) {
    background-color: #f8fafc;
  }
`;

const ResultRow = styled.tr`
  &:hover {
    background-color: #f1f5f9 !important;
  }
`;

const TableCell = styled.td`
  padding: 15px;
  border-bottom: 1px solid #e2e8f0;
  width: ${props => props.width || 'auto'};
  vertical-align: middle;
`;

const FormationContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const FormationTitle = styled.span`
  color: #2d3748;
  font-weight: 600;
  font-size: 1rem;
`;

const FormationCategory = styled.span`
  color: #4a5568;
  font-size: 0.85rem;
  margin-top: 4px;
`;

const DateText = styled.span`
  color: #2d3748;
`;

const FormateurText = styled.span`
  color: #2d3748;
`;

const ResultType = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  background-color: ${props => 
    props.type === 'quiz' ? '#ebf8ff' : 
    props.type === 'contrôle' ? '#ebfaf1' : 
    props.type === 'examen' ? '#f0f5ff' : '#f5f0ff'};
  color: ${props => 
    props.type === 'quiz' ? '#3182ce' : 
    props.type === 'contrôle' ? '#38a169' : 
    props.type === 'examen' ? '#4c51bf' : '#6b46c1'};
`;

const StarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const StarRating = styled.div`
  display: flex;
  gap: 3px;
`;

const Star = styled(FaStar)`
  color: ${props => props.color || '#ddd'};
  font-size: 1.2rem;
`;

const NoteText = styled.span`
  font-size: 0.9rem;
  color: #666;
`;

const Score = styled.span`
  font-weight: bold;
  color: ${props => props.$good ? '#38a169' : '#e53e3e'};
`;

const NoResults = styled.tr`
  td {
    padding: 30px;
    text-align: center;
    color: #718096;
    font-style: italic;
  }
`;

const Loading = styled.div`
  padding: 30px;
  text-align: center;
  color: #4a5568;
  font-size: 1.1rem;
`;

const StatsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
  flex-wrap: wrap;
`;

const StatCard = styled.div`
  flex: 1;
  min-width: 200px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.8rem;
  font-weight: bold;
  color: #1e3b70;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  color: #718096;
  font-size: 0.9rem;
`;

export default ResultsContent;