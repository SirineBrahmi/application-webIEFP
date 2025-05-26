import React, { useState, useEffect, useCallback } from 'react';
import { ref, get, set } from 'firebase/database';
import { db } from '../firebase';
import styled from 'styled-components';

// Styled components
const ContentCard = styled.div`
  background: rgba(215, 136, 136, 0.1);
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);

  h2 {
    color: #2c3e50;
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 1.5rem;
  }
`;

const FilterContainer = styled.div`
  margin-bottom: 20px;
`;

const FilterButton = styled.button`
  padding: 8px 16px;
  background: ${props => props.active ? '#3498db' : '#95a5a6'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-right: 10px;
  &:hover {
    background: ${props => props.active ? '#2980b9' : '#7f8c8d'};
  }
`;

const QuizList = styled.div`
  display: grid;
  gap: 20px;
`;

const QuizCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  color: #2c3e50;
  border-left: 4px solid #3498db;
`;

const QuizHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const QuizTitle = styled.h3`
  font-size: 1.2rem;
  color: #2c3e50;
  margin: 0;
`;

const QuizMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 10px;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 10px;
`;

const DetailButton = styled.button`
  padding: 8px 16px;
  background: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  &:hover {
    background: #27ae60;
  }
`;

const DetailView = styled.div`
  margin-top: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
`;

const QuestionItem = styled.div`
  margin-bottom: 15px;
  background: rgba(255, 255, 255, 0.05);
  padding: 10px;
  border-radius: 4px;
`;

const AnswerText = styled.p`
  margin: 5px 0;
  background: rgba(255, 255, 255, 0.05);
  color: ${props => (props.correct ? '#2ecc71' : props.student ? '#2c3e50' : '#2c3e50')};
  padding: 5px;
`;

const ScoreForm = styled.div`
  margin-top: 15px;
  background: rgba(255, 255, 255, 0.05);
  padding: 10px;
  border-radius: 4px;
`;

const ScoreInput = styled.input`
  width: 100px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #2c3e50;
  margin-right: 10px;
`;

const SubmitButton = styled.button`
  padding: 8px 16px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-right: 10px;
  &:hover {
    background: #2980b9;
  }
  &:disabled {
    background: #95a5a6;
    cursor: not-allowed;
  }
`;

const ResultButton = styled.button`
  padding: 8px 16px;
  background: #f1c40f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  &:hover {
    background: #d4ac0d;
  }
`;

const LoadingMessage = styled.p`
  color: #2c3e50;
  font-style: italic;
`;

const ErrorMessage = styled.p`
  color: #e74c3c;
  padding: 10px;
  background: #fdeaea;
  border-radius: 4px;
`;

const NoQuizzes = styled.div`
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  text-align: center;
  color: #6c757d;
`;

function QuizPasse({ formateurId }) {
  const [quizResults, setQuizResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [quizDetails, setQuizDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedResult, setSelectedResult] = useState(null);
  const [editScore, setEditScore] = useState({});

  useEffect(() => {
    const fetchQuizData = async () => {
      if (!formateurId) {
        console.error('QuizPasseFormateur - Identifiant du formateur manquant');
        setError('Erreur: Identifiant du formateur manquant. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('QuizPasseFormateur - Récupération des quiz pour formateur:', formateurId);

        // Fetch quizzes created by the formateur
        const quizzesRef = ref(db, 'quizs');
        const quizzesSnapshot = await get(quizzesRef);
        const quizData = {};

        if (quizzesSnapshot.exists()) {
          const snapshotVal = quizzesSnapshot.val();
          console.log('QuizPasseFormateur - Snapshot des quiz:', JSON.stringify(snapshotVal, null, 2));

          Object.values(snapshotVal).forEach(category => {
            Object.values(category).forEach(formation => {
              Object.values(formation).forEach(semestre => {
                Object.entries(semestre).forEach(([quizId, quiz]) => {
                  if (quiz?.formateurId === formateurId) {
                    const questions = (quiz.questions || []).map(q => ({
                      ...q,
                      pointsPossible: Number(q.points) || 10,
                    }));
                    quizData[quizId] = {
                      id: quizId,
                      title: quiz.quizTitle || quiz.titre || `Quiz ${quizId.substring(0, 8)}`,
                      formationName: quiz.nomFormation || 'Inconnue',
                      questions,
                      maxPossibleScore: questions.reduce((sum, q) => sum + q.pointsPossible, 0),
                    };
                  }
                });
              });
            });
          });
        } else {
          console.log('QuizPasseFormateur - Aucun quiz trouvé');
        }

        console.log('QuizPasseFormateur - Données des quiz:', JSON.stringify(quizData, null, 2));
        setQuizDetails(quizData);

        // Fetch quiz results
        const resultsRef = ref(db, 'quiz_results');
        const resultsSnapshot = await get(resultsRef);
        const resultsData = [];

        if (resultsSnapshot.exists()) {
          const resultsVal = resultsSnapshot.val();
          console.log('QuizPasseFormateur - Snapshot des résultats:', JSON.stringify(resultsVal, null, 2));

          Object.entries(resultsVal).forEach(([quizId, quizResults]) => {
            if (quizData[quizId]) {
              Object.entries(quizResults).forEach(([studentId, result]) => {
                console.log(`QuizPasseFormateur - Résultat trouvé: quiz=${quizId}, étudiant=${studentId}, score=${result.score}`);
                resultsData.push({
                  quizId,
                  studentId,
                  quizInfo: quizData[quizId],
                  studentName: result.studentName || `Étudiant ${studentId.substring(0, 8)}`,
                  score: Number(result.score) || 0,
                  passed: result.passed ?? false,
                  dateCompleted: result.dateCompleted || '',
                  answers: result.answers || [],
                });
              });
            }
          });
        } else {
          console.log('QuizPasseFormateur - Aucun résultat de quiz trouvé');
        }

        // Sort results by dateCompleted (newest first)
        resultsData.sort((a, b) => new Date(b.dateCompleted || 0) - new Date(a.dateCompleted || 0));
        console.log('QuizPasseFormateur - Résultats des quiz:', JSON.stringify(resultsData, null, 2));
        setQuizResults(resultsData);
        setFilteredResults(resultsData);

        // Initialize edit score states
        setEditScore(
          resultsData.reduce((acc, result) => ({
            ...acc,
            [`${result.quizId}-${result.studentId}`]: result.score || '',
          }), {})
        );

      } catch (err) {
        console.error('QuizPasseFormateur - Erreur lors de la récupération des données:', err);
        setError(`Erreur lors du chargement des données: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [formateurId]);

  useEffect(() => {
    const filtered = filter === 'passed'
      ? quizResults.filter(r => r.passed)
      : filter === 'failed'
      ? quizResults.filter(r => !r.passed)
      : quizResults;
    console.log('QuizPasseFormateur - Résultats filtrés:', JSON.stringify(filtered, null, 2));
    setFilteredResults(filtered);
  }, [filter, quizResults]);

  const handleViewDetails = useCallback((result) => {
    setSelectedResult(prev =>
      prev?.quizId === result.quizId && prev?.studentId === result.studentId ? null : result
    );
  }, []);

  const handleScoreChange = useCallback((quizId, studentId, value) => {
    setEditScore(prev => ({
      ...prev,
      [`${quizId}-${studentId}`]: value,
    }));
  }, []);

  const handleScoreSubmit = useCallback(async (quizId, studentId, maxPossibleScore) => {
    const key = `${quizId}-${studentId}`;
    const score = editScore[key];

    if (score && (isNaN(score) || score < 0 || score > maxPossibleScore)) {
      alert(`Veuillez entrer une note valide entre 0 et ${maxPossibleScore}.`);
      return;
    }

    try {
      const resultRef = ref(db, `quiz_results/${quizId}/${studentId}`);
      const updatedResult = {
        ...quizResults.find(r => r.quizId === quizId && r.studentId === studentId),
        score: score ? Number(score) : 0,
        passed: score >= (maxPossibleScore * 0.5),
        dateModified: new Date().toISOString(),
      };

      console.log('QuizPasseFormateur - Mise à jour du résultat:', updatedResult);
      await set(resultRef, updatedResult);

      setQuizResults(prev =>
        prev.map(result =>
          result.quizId === quizId && result.studentId === studentId ? updatedResult : result
        )
      );
      setFilteredResults(prev =>
        filter === 'all'
          ? prev.map(r => r.quizId === quizId && r.studentId === studentId ? updatedResult : r)
          : prev.filter(r => {
              if (r.quizId === quizId && r.studentId === studentId) {
                return filter === 'passed' ? updatedResult.passed : !updatedResult.passed;
              }
              return true;
            })
      );

      alert('Note mise à jour avec succès.');
    } catch (err) {
      console.error('QuizPasseFormateur - Erreur lors de la mise à jour de la note:', err);
      alert(`Erreur lors de la mise à jour de la note: ${err.message}`);
    }
  }, [editScore, quizResults, filter]);

  const handleViewResult = useCallback((result) => {
    const summary = result.quizInfo.questions.map((q, index) => {
      const studentAnswer = result.answers && result.answers[index]
        ? (result.answers[index].selectedAnswer || result.answers[index])
        : 'Non répondu';
      const isCorrect = studentAnswer === q.correctAnswer;
      const pointsEarned = isCorrect ? q.pointsPossible : 0;
      return `Question ${index + 1}: ${q.question}\n` +
             `Réponse: ${studentAnswer} (${isCorrect ? 'Correct' : 'Incorrect'})\n` +
             `Points: ${pointsEarned}/${q.pointsPossible}`;
    }).join('\n\n');
    alert(`Résultat de ${result.studentName}:\nScore total: ${result.score}/${result.quizInfo.maxPossibleScore}\n\n${summary}`);
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Non spécifiée';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Date invalide';
    }
  }, []);

  return (
    <ContentCard>
      <h2>Quiz Passés</h2>

      <FilterContainer role="group" aria-label="Filtres des résultats">
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
        >
          Tous
        </FilterButton>
        <FilterButton
          active={filter === 'passed'}
          onClick={() => setFilter('passed')}
          aria-pressed={filter === 'passed'}
        >
          Réussis
        </FilterButton>
        <FilterButton
          active={filter === 'failed'}
          onClick={() => setFilter('failed')}
          aria-pressed={filter === 'failed'}
        >
          Échoués
        </FilterButton>
      </FilterContainer>

      {loading && <LoadingMessage>Chargement des résultats...</LoadingMessage>}

      {error && <ErrorMessage role="alert">{error}</ErrorMessage>}

      {!loading && !error && filteredResults.length === 0 && (
        <NoQuizzes>
          <p>Aucun résultat de quiz {filter === 'passed' ? 'réussi' : filter === 'failed' ? 'échoué' : ''} disponible pour le moment.</p>
        </NoQuizzes>
      )}

      <QuizList>
        {filteredResults.map(result => {
          const key = `${result.quizId}-${result.studentId}`;
          const isSelected = selectedResult?.quizId === result.quizId && selectedResult?.studentId === result.studentId;

          return (
            <QuizCard key={key}>
              <QuizHeader>
                <QuizTitle>{result.quizInfo?.title || 'Quiz inconnu'}</QuizTitle>
                <span style={{ color: result.passed ? '#2ecc71' : '#e74c3c' }}>
                  {result.passed ? 'Réussi' : 'Échoué'}
                </span>
              </QuizHeader>
              <QuizMeta>
                <span>Étudiant: {result.studentName}</span>
                <span>Formation: {result.quizInfo?.formationName || 'Inconnue'}</span>
                <span>Score: {result.score}/{result.quizInfo?.maxPossibleScore || 10}</span>
                <span>Date: {formatDate(result.dateCompleted)}</span>
                <span>Date limite: {formatDate(result.quizInfo?.date_limite)}</span>
              </QuizMeta>
              <DetailButton
                onClick={() => handleViewDetails(result)}
                aria-expanded={isSelected}
                aria-controls={`details-${key}`}
              >
                {isSelected ? 'Masquer les détails' : 'Voir les détails'}
              </DetailButton>
              {isSelected && (
                <DetailView id={`details-${key}`}>
                  <h4>Réponses de l'étudiant</h4>
                  {result.quizInfo?.questions?.length > 0 ? (
                    result.quizInfo.questions.map((question, index) => {
                      const studentAnswer = result.answers && result.answers[index]
                        ? (result.answers[index].selectedAnswer || result.answers[index])
                        : 'Non répondu';
                      const isCorrect = studentAnswer === question.correctAnswer;
                      const pointsPossible = question.pointsPossible || 10;
                      const pointsEarned = isCorrect ? pointsPossible : 0;

                      console.log(`QuizPasseFormateur - Question ${index + 1}: pointsPossible=${pointsPossible}, pointsEarned=${pointsEarned}, isCorrect=${isCorrect}`);

                      return (
                        <QuestionItem key={index}>
                          <p><strong>Question {index + 1}:</strong> {question.question || `Question ${index + 1}`}</p>
                          <AnswerText student={true}>
                            Réponse de l'étudiant: {studentAnswer}
                          </AnswerText>
                          <AnswerText correct={true}>
                            Réponse correcte: {question.correctAnswer || 'Non disponible'}
                          </AnswerText>
                          <p style={{ color: '#2c3e50' }}>
                            Points: {pointsEarned}/{pointsPossible}
                          </p>
                        </QuestionItem>
                      );
                    })
                  ) : (
                    <p>Aucune question disponible pour ce quiz.</p>
                  )}
                  <ScoreForm>
                    <h4>Modifier la note</h4>
                    <ScoreInput
                      type="number"
                      min="0"
                      max={result.quizInfo?.maxPossibleScore || 10}
                      value={editScore[key] ?? ''}
                      onChange={e => handleScoreChange(result.quizId, result.studentId, e.target.value)}
                      placeholder="Nouvelle note"
                      aria-label={`Modifier la note pour ${result.studentName}`}
                    />
                    <SubmitButton
                      onClick={() => handleScoreSubmit(result.quizId, result.studentId, result.quizInfo?.maxPossibleScore || 10)}
                      aria-label="Mettre à jour la note"
                    >
                      Mettre à jour la note
                    </SubmitButton>
                    <ResultButton
                      onClick={() => handleViewResult(result)}
                      aria-label={`Voir le résultat de ${result.studentName}`}
                    >
                      Voir le résultat
                    </ResultButton>
                  </ScoreForm>
                </DetailView>
              )}
            </QuizCard>
          );
        })}
      </QuizList>
    </ContentCard>
  );
}

export default QuizPasse;