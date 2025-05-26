import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { ref, get, set } from 'firebase/database';
import { db } from '../../firebase';
import styled from 'styled-components';

// Styles
const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h2`
  font-size: 1.8rem;
  color: #1e3b70;
  margin-bottom: 20px;
`;

const QuizList = styled.div`
  display: grid;
  gap: 20px;
`;

const QuizCard = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 20px;
  border-left: 4px solid #3498db;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: transform 0.2s;
  opacity: ${props => props.disabled ? 0.7 : 1};

  &:hover {
    transform: ${props => props.disabled ? 'none' : 'translateY(-3px)'};
  }
`;

const QuizHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const QuizTitle = styled.h3`
  font-size: 1.2rem;
  color: #1e3b70;
  margin: 0;
`;

const Deadline = styled.span`
  color: ${props => props.overdue ? '#e74c3c' : '#2ecc71'};
  font-weight: bold;
`;

const QuizMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 10px;
  font-size: 0.9rem;
  color: #555;
`;

const QuizDescription = styled.p`
  color: #333;
  line-height: 1.6;
  margin-bottom: 15px;
`;

const StatusLabel = styled.span`
  font-size: 0.9rem;
  color: #2ecc71;
  font-weight: bold;
`;

const LoadingMessage = styled.p`
  color: #666;
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
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
  color: #6c757d;
`;

const QuizContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const QuestionContainer = styled.div`
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
`;

const QuestionText = styled.h3`
  font-size: 1.1rem;
  color: #1e3b70;
  margin-bottom: 15px;
`;

const OptionsList = styled.div`
  display: grid;
  gap: 10px;
`;

const OptionButton = styled.button`
  padding: 10px 15px;
  background: ${props => props.selected ? '#3498db' : '#f8f9fa'};
  color: ${props => props.selected ? 'white' : '#333'};
  border: 1px solid ${props => props.selected ? '#3498db' : '#ddd'};
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.selected ? '#3498db' : '#e9ecef'};
  }
`;

const Timer = styled.div`
  font-size: 1.2rem;
  text-align: center;
  margin: 20px 0;
  color: #e74c3c;
  font-weight: bold;
`;

const NavigationButtons = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
`;

const NavButton = styled.button`
  padding: 10px 20px;
  background: ${props => props.primary ? '#3498db' : '#6c757d'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${props => props.primary ? '#2980b9' : '#5a6268'};
  }

  &:disabled {
    background: #95a5a6;
    cursor: not-allowed;
  }
`;

const ResultsContainer = styled.div`
  text-align: center;
  padding: 30px;
`;

const ScoreText = styled.h2`
  font-size: 2rem;
  color: ${props => props.passed ? '#2ecc71' : '#e74c3c'};
  margin-bottom: 20px;
`;

const FeedbackText = styled.p`
  font-size: 1.1rem;
  color: #333;
  margin-bottom: 20px;
`;

function QuizContent() {
  const context = useOutletContext();
  const navigate = useNavigate();
  const { studentData, enrolledCourses } = context || {};
  const [quizzes, setQuizzes] = useState([]);
  const [completedQuizzes, setCompletedQuizzes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);

  // Fetch quizzes and completed quiz results
  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!studentData?.uid) {
        console.error('QuizContent - Aucun étudiant connecté');
        setError('Veuillez vous connecter pour voir vos quiz.');
        navigate('/connexion/etudiant');
        return;
      }

      if (!enrolledCourses || enrolledCourses.length === 0) {
        console.log('QuizContent - Aucune inscription trouvée pour:', studentData.uid);
        setError('Vous n\'êtes inscrit à aucune formation. Inscrivez-vous pour accéder aux quiz.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('QuizContent - Récupération des quiz pour:', studentData.uid, enrolledCourses);

        // Get all quizzes
        const quizzesRef = ref(db, 'quizs');
        const snapshot = await get(quizzesRef);
        const quizzesData = [];

        if (snapshot.exists()) {
          const enrolledFormationIds = enrolledCourses.map(course => course.formationId);
          console.log('QuizContent - Formations inscrites:', enrolledFormationIds);

          // Iterate through each category
          snapshot.forEach(categorySnapshot => {
            const categoryName = categorySnapshot.key;
            categorySnapshot.forEach(formationSnapshot => {
              const formationKey = formationSnapshot.key;
              formationSnapshot.forEach(semestreSnapshot => {
                const semestreName = semestreSnapshot.key;
                semestreSnapshot.forEach(quizSnapshot => {
                  const quizData = quizSnapshot.val();
                  const quizFormationId = quizData.idFormation || formationKey;
                  if (enrolledFormationIds.includes(quizFormationId)) {
                    quizzesData.push({
                      id: quizSnapshot.key,
                      category: categoryName,
                      formationId: quizFormationId,
                      formationNom: quizData.nomFormation || formationKey,
                      semestre: semestreName,
                      titre: quizData.titre || quizData.quizTitle || `Quiz ${quizSnapshot.key.substring(0, 8)}`,
                      description: quizData.description || '',
                      questions: quizData.questions || [],
                      date_limite: quizData.date_limite || '',
                      formateurPrenom: quizData.formateurPrenom || '',
                      formateurNom: quizData.formateurNom || '',
                      passingScore: quizData.passingScore || null,
                    });
                  }
                });
              });
            });
          });

          console.log('QuizContent - Quiz récupérés:', quizzesData);
          setQuizzes(quizzesData);

          // Fetch completed quizzes
          const completedData = {};
          for (const quiz of quizzesData) {
            const resultRef = ref(db, `quiz_results/${quiz.id}/${studentData.uid}`);
            const resultSnapshot = await get(resultRef);
            if (resultSnapshot.exists()) {
              completedData[quiz.id] = resultSnapshot.val();
            }
          }
          console.log('QuizContent - Quiz terminés:', completedData);
          setCompletedQuizzes(completedData);

          if (quizzesData.length === 0) {
            console.log('QuizContent - Aucun quiz trouvé pour les formations inscrites');
          }
        } else {
          console.log('QuizContent - Aucun quiz dans la base de données');
          setQuizzes([]);
        }
      } catch (err) {
        console.error('QuizContent - Erreur lors de la récupération des quiz:', err);
        setError(`Erreur lors du chargement des quiz: ${err.message}`);
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [studentData, enrolledCourses, navigate]);

  // Timer effect
  useEffect(() => {
    if (!quizStarted || !selectedQuiz || timeLeft <= 0 || quizCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, selectedQuiz, timeLeft, quizCompleted]);

  // Handle time running out
  useEffect(() => {
    if (timeLeft === 0 && quizStarted && !quizCompleted) {
      handleQuizCompletion();
    }
  }, [timeLeft, quizStarted, quizCompleted]);

  const isOverdue = useCallback((deadline) => {
    if (!deadline) return false;
    try {
      return new Date(deadline) < new Date();
    } catch {
      console.warn('QuizContent - Date limite invalide:', deadline);
      return false;
    }
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Non spécifiée';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      console.warn('QuizContent - Date invalide:', dateString);
      return 'Date invalide';
    }
  }, []);

  const startQuiz = useCallback((quiz) => {
    if (completedQuizzes[quiz.id] || isOverdue(quiz.date_limite)) {
      console.log('QuizContent - Quiz non démarrable:', { id: quiz.id, completed: !!completedQuizzes[quiz.id], overdue: isOverdue(quiz.date_limite) });
      return;
    }
    console.log('QuizContent - Démarrage du quiz:', quiz.id);
    setSelectedQuiz(quiz);
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setScore(0);
    setQuizCompleted(false);
    setStartTime(new Date());
    const totalTime = quiz.questions.reduce((acc, question) => {
      return acc + (parseInt(question.timeLimit, 10) || 30);
    }, 0);
    setTimeLeft(totalTime);
  }, [completedQuizzes, isOverdue]);

  const handleAnswerSelect = useCallback((questionIndex, option) => {
    console.log('QuizContent - Sélection de réponse:', { questionIndex, option });
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: option,
    }));
  }, []);

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      console.log('QuizContent - Passage à la question suivante:', currentQuestionIndex + 1);
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleQuizCompletion();
    }
  }, [currentQuestionIndex, selectedQuiz]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      console.log('QuizContent - Retour à la question précédente:', currentQuestionIndex - 1);
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const handleQuizCompletion = useCallback(() => {
    console.log('QuizContent - Fin du quiz:', selectedQuiz.id);
    let calculatedScore = 0;
    const answerDetails = selectedQuiz.questions.map((question, index) => {
      const isCorrect = answers[index] === question.correctAnswer;
      const pointsPossible = parseInt(question.points, 10) || 10;
      const pointsEarned = isCorrect ? pointsPossible : 0;
      calculatedScore += pointsEarned;
      return {
        question: question.question || `Question ${index + 1}`,
        selectedAnswer: answers[index] || 'Non répondu',
        correctAnswer: question.correctAnswer || 'Non défini',
        pointsEarned,
        pointsPossible,
      };
    });

    setScore(calculatedScore);
    setQuizCompleted(true);

    const endTime = new Date();
    const timeSpentInSeconds = Math.floor((endTime - startTime) / 1000);

    saveQuizResults(calculatedScore, timeSpentInSeconds, answerDetails);
  }, [selectedQuiz, answers, startTime]);

  const saveQuizResults = useCallback(async (finalScore, timeSpent, answerDetails) => {
    try {
      const resultsRef = ref(db, `quiz_results/${selectedQuiz.id}/${studentData.uid}`);
      const maxPossibleScore = selectedQuiz.questions.reduce((acc, q) => acc + (parseInt(q.points, 10) || 10), 0);
      const passed = finalScore >= (selectedQuiz.passingScore || maxPossibleScore * 0.5);

      const resultData = {
        quizId: selectedQuiz.id,
        quizTitle: selectedQuiz.titre,
        studentId: studentData.uid,
        studentName: `${studentData.prenom || ''} ${studentData.nom || ''}`,
        formationId: selectedQuiz.formationId,
        formationName: selectedQuiz.formationNom,
        score: finalScore,
        maxPossibleScore,
        passed,
        dateCompleted: new Date().toISOString(),
        timeSpent,
        answers: answerDetails,
      };

      console.log('QuizContent - Enregistrement des résultats:', resultData);
      await set(resultsRef, resultData);

      setCompletedQuizzes(prev => ({
        ...prev,
        [selectedQuiz.id]: resultData,
      }));
      console.log('QuizContent - Résultats enregistrés avec succès');
    } catch (err) {
      console.error('QuizContent - Erreur lors de l\'enregistrement des résultats:', err);
      setError(`Erreur lors de l'enregistrement des résultats: ${err.message}`);
    }
  }, [selectedQuiz, studentData]);

  const formatTime = useCallback((seconds) => {
    if (seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const resetQuiz = useCallback(() => {
    console.log('QuizContent - Réinitialisation du quiz');
    setSelectedQuiz(null);
    setQuizStarted(false);
    setQuizCompleted(false);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeft(0);
    setScore(0);
    setStartTime(null);
  }, []);

  if (loading) {
    return (
      <Container>
        <LoadingMessage>Chargement des quiz...</LoadingMessage>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage role="alert">{error}</ErrorMessage>
        {error.includes('inscrit') && (
          <NavButton primary onClick={() => navigate('/etudiant/espace-personnel')}>
            Aller à l'espace personnel
          </NavButton>
        )}
      </Container>
    );
  }

  if (!quizStarted && !selectedQuiz) {
    return (
      <Container>
        <Title>Mes Quiz à Passer</Title>

        {!loading && !error && quizzes.length === 0 && (
          <NoQuizzes>
            <p>Vous n'avez aucun quiz à passer pour le moment. Vérifiez vos inscriptions ou contactez votre formateur.</p>
            <NavButton primary onClick={() => navigate('/etudiant/espace-personnel')}>
              Aller à l'espace personnel
            </NavButton>
          </NoQuizzes>
        )}

        <QuizList>
          {quizzes.map(quiz => {
            const isQuizOverdue = isOverdue(quiz.date_limite);
            const isCompleted = !!completedQuizzes[quiz.id];
            return (
              <QuizCard
                key={quiz.id}
                onClick={() => !isCompleted && !isQuizOverdue && startQuiz(quiz)}
                disabled={isCompleted || isQuizOverdue}
                aria-disabled={isCompleted || isQuizOverdue}
                role="button"
                tabIndex={isCompleted || isQuizOverdue ? -1 : 0}
                onKeyDown={(e) => e.key === 'Enter' && !isCompleted && !isQuizOverdue && startQuiz(quiz)}
              >
                <QuizHeader>
                  <QuizTitle>{quiz.titre}</QuizTitle>
                  <Deadline overdue={isQuizOverdue}>
                    Date limite: {formatDate(quiz.date_limite)}
                    {isQuizOverdue && ' (En retard)'}
                  </Deadline>
                </QuizHeader>

                <QuizMeta>
                  <span>Formation: {quiz.formationNom}</span>
                  <span>Semestre: {quiz.semestre}</span>
                  {quiz.formateurPrenom && quiz.formateurNom && (
                    <span>Formateur: {quiz.formateurPrenom} {quiz.formateurNom}</span>
                  )}
                </QuizMeta>

                <QuizDescription>
                  {quiz.description || 'Aucune description fournie.'}
                </QuizDescription>

                {isCompleted && <StatusLabel>Passé</StatusLabel>}
                {isQuizOverdue && !isCompleted && (
                  <p style={{ color: '#e74c3c' }}>Ce quiz n'est plus disponible</p>
                )}
              </QuizCard>
            );
          })}
        </QuizList>
      </Container>
    );
  }

  if (quizCompleted) {
    const maxScore = selectedQuiz.questions.reduce((acc, q) => acc + (parseInt(q.points, 10) || 10), 0);
    const percentage = Math.round((score / maxScore) * 100);
    const passed = score >= (selectedQuiz.passingScore || maxScore * 0.5);

    return (
      <QuizContainer>
        <ResultsContainer>
          <ScoreText passed={passed}>
            {passed ? 'Quiz Réussi !' : 'Quiz Échoué'}
          </ScoreText>
          <p>Vous avez terminé le quiz : <strong>{selectedQuiz.titre}</strong></p>
          <p>
            Votre score : <strong>{score}/{maxScore}</strong> ({percentage}%)
          </p>
          <FeedbackText>
            {passed
              ? 'Félicitations ! Vous avez réussi ce quiz.'
              : 'Vous n\'avez pas atteint le score minimum requis. Contactez votre formateur pour plus d\'informations.'}
          </FeedbackText>

          <NavButton primary onClick={resetQuiz} aria-label="Retour à la liste des quiz">
            Retour à la liste des quiz
          </NavButton>
        </ResultsContainer>
      </QuizContainer>
    );
  }

  if (quizStarted && selectedQuiz) {
    const currentQuestion = selectedQuiz.questions[currentQuestionIndex] || {};

    return (
      <QuizContainer>
        <h2>{selectedQuiz.titre}</h2>
        <Timer>Temps restant : {formatTime(timeLeft)}</Timer>

        <QuestionContainer>
          <QuestionText>
            Question {currentQuestionIndex + 1}/{selectedQuiz.questions.length} : {currentQuestion.question || 'Question non définie'}
          </QuestionText>

          <OptionsList role="radiogroup" aria-label={`Options pour la question ${currentQuestionIndex + 1}`}>
            {(currentQuestion.options || []).map((option, index) => (
              <OptionButton
                key={index}
                selected={answers[currentQuestionIndex] === option}
                onClick={() => handleAnswerSelect(currentQuestionIndex, option)}
                role="radio"
                aria-checked={answers[currentQuestionIndex] === option}
                aria-label={`Option ${option}`}
              >
                {option || 'Option non définie'}
              </OptionButton>
            ))}
          </OptionsList>
        </QuestionContainer>

        <NavigationButtons>
          <NavButton
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
            aria-disabled={currentQuestionIndex === 0}
            aria-label="Question précédente"
          >
            Question précédente
          </NavButton>

          <NavButton
            primary
            onClick={goToNextQuestion}
            disabled={!answers[currentQuestionIndex]}
            aria-disabled={!answers[currentQuestionIndex]}
            aria-label={currentQuestionIndex === selectedQuiz.questions.length - 1 ? 'Terminer le quiz' : 'Question suivante'}
          >
            {currentQuestionIndex === selectedQuiz.questions.length - 1 ? 'Terminer le quiz' : 'Question suivante'}
          </NavButton>
        </NavigationButtons>
      </QuizContainer>
    );
  }

  return null;
}

export default QuizContent;