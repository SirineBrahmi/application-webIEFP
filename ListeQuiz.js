import React, { useState, useEffect } from 'react';
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

const QuizCard = styled.div`
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

const QuizTitle = styled.h6`
  color: rgb(11, 44, 116);
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const QuizText = styled.p`
  color: #1f2937;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
`;

const QuizDate = styled.p`
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
  color: rgb(11, 44, 116);
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

const QuestionContainer = styled.div`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  background: #f9fafb;
`;

const RemoveButton = styled(StyledButton)`
  background: #ef4444;
  color: white;
  &:hover {
    background: #dc2626;
  }
`;

const AddButton = styled(StyledButton)`
  background: #3b82f6;
  color: white;
  &:hover {
    background: #2563eb;
  }
`;

const ListeQuiz = () => {
  const [quizs, setQuizs] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    date_limite: '',
    questions: []
  });
  const [formateurId, setFormateurId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Handle authentication state
  useEffect(() => {
    try {
      const formateurData = localStorage.getItem('formateur');
      console.log('Raw formateur data from localStorage:', formateurData);
      const currentFormateur = formateurData ? JSON.parse(formateurData) : null;

      if (currentFormateur && currentFormateur.uid && typeof currentFormateur.uid === 'string') {
        console.log('Valid formateur from localStorage:', currentFormateur);
        setFormateurId(currentFormateur.uid);
        setLoading(false);
        return;
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
          role: 'formateur'
        };
        localStorage.setItem('formateur', JSON.stringify(formateur));
      } else {
        console.error('No authenticated user found in Firebase Auth or localStorage.');
        setError('Veuillez vous reconnecter pour voir vos quiz.');
      }
      setLoading(false);
    }, (error) => {
      console.error('Firebase Auth error:', error);
      setError('Erreur d\'authentification: ' + error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch quizzes
  useEffect(() => {
    if (!formateurId) {
      console.log('No formateurId, skipping quiz fetch.');
      return;
    }

    setLoading(true);
    const quizsRef = ref(db, 'quizs');
    const unsubscribe = onValue(
      quizsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const allQuizs = snapshot.val();
          console.log('Raw quizs data:', allQuizs);
          const filteredQuizs = {};

          Object.keys(allQuizs).forEach((category) => {
            const categoryData = allQuizs[category];

            Object.keys(categoryData).forEach((formationOrSemestre) => {
              const formationData = categoryData[formationOrSemestre];

              const isSemester = Object.values(formationData).some(
                (item) => item.formateurId
              );

              if (isSemester) {
                Object.keys(formationData).forEach((quizId) => {
                  const quizItem = formationData[quizId];
                  if (quizItem.formateurId === formateurId) {
                    if (!filteredQuizs[category]) {
                      filteredQuizs[category] = {};
                    }
                    if (!filteredQuizs[category][formationOrSemestre]) {
                      filteredQuizs[category][formationOrSemestre] = {};
                    }
                    filteredQuizs[category][formationOrSemestre][quizId] = {
                      ...quizItem,
                      date_limite: quizItem.date_limite || quizItem.dateLimite,
                      date_soumession: quizItem.date_soumession || quizItem.date,
                      questions: quizItem.questions || []
                    };
                  }
                });
              } else {
                Object.keys(formationData).forEach((semestre) => {
                  const semestreData = formationData[semestre];
                  Object.keys(semestreData).forEach((quizId) => {
                    const quizItem = semestreData[quizId];
                    if (quizItem.formateurId === formateurId) {
                      if (!filteredQuizs[category]) {
                        filteredQuizs[category] = {};
                      }
                      if (!filteredQuizs[category][formationOrSemestre]) {
                        filteredQuizs[category][formationOrSemestre] = {};
                      }
                      if (!filteredQuizs[category][formationOrSemestre][semestre]) {
                        filteredQuizs[category][formationOrSemestre][semestre] = {};
                      }
                      filteredQuizs[category][formationOrSemestre][semestre][quizId] = {
                        ...quizItem,
                        date_limite: quizItem.date_limite || quizItem.dateLimite,
                        date_soumession: quizItem.date_soumession || quizItem.date,
                        questions: quizItem.questions || []
                      };
                    }
                  });
                });
              }
            });
          });

          console.log('Filtered quizs:', filteredQuizs);
          setQuizs(filteredQuizs);
        } else {
          console.log('No quizs found in the database.');
          setQuizs({});
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching quizs:', error);
        setError('Erreur lors de la récupération des quiz: ' + error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [formateurId]);

  const handleEdit = (quizItem, path) => {
    setCurrentQuiz({ ...quizItem, path });
    setFormData({
      titre: quizItem.titre || 'Quiz',
      description: quizItem.description || '',
      date_limite: quizItem.date_limite.split('T')[0],
      questions: quizItem.questions.length > 0 ? quizItem.questions.map(q => ({
        question: q.question || '',
        options: q.options ? [...q.options] : ['', '', '', ''],
        correctAnswer: q.correctAnswer || '',
        points: q.points || '10',
        timeLimit: q.timeLimit || '30'
      })) : [{
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: '10',
        timeLimit: '30'
      }]
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate questions
      for (const q of formData.questions) {
        if (!q.question.trim()) throw new Error('Chaque question doit avoir un texte non vide.');
        if (q.options.some(opt => !opt.trim())) throw new Error('Chaque option doit être non vide.');
        if (!q.correctAnswer.trim() || !q.options.includes(q.correctAnswer)) {
          throw new Error('La réponse correcte doit être l’une des options.');
        }
        if (isNaN(q.points) || Number(q.points) <= 0) throw new Error('Les points doivent être un nombre positif.');
        if (isNaN(q.timeLimit) || Number(q.timeLimit) <= 0) throw new Error('La limite de temps doit être un nombre positif.');
      }

      const { path } = currentQuiz;
      const quizRef = ref(db, `quizs/${path}`);
      const updatedData = {
        titre: formData.titre,
        description: formData.description,
        date_limite: formData.date_limite || new Date().toISOString().split('T')[0],
        questions: formData.questions
      };

      await update(quizRef, updatedData);
      setSuccess('Quiz mis à jour avec succès');
      setShowEditModal(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      setError(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = (quizItem, path) => {
    setCurrentQuiz({ ...quizItem, path });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const { path } = currentQuiz;
      const quizRef = ref(db, `quizs/${path}`);
      await remove(quizRef);
      setSuccess('Suppression faite');
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setError(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChange = (e, questionIndex, field, optionIndex) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (questionIndex === undefined) {
        // Handle top-level fields (titre, description, date_limite)
        return { ...prev, [name]: value };
      }

      const newQuestions = [...prev.questions];
      if (field === 'options') {
        newQuestions[questionIndex].options[optionIndex] = value;
      } else {
        newQuestions[questionIndex][field] = value;
      }
      return { ...prev, questions: newQuestions };
    });
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: '',
          points: '10',
          timeLimit: '30'
        }
      ]
    }));
  };

  const removeQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  return (
    <Container>
      <MainTitle>Liste de Mes Quiz</MainTitle>

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
          <Spinner animation="border" role="status" style={{ color: 'rgb(11, 44, 116)' }}>
            <span className="visually-hidden">Chargement...</span>
          </Spinner>
          <p style={{ color: '#1f2937', marginTop: '0.5rem' }}>Chargement des quiz...</p>
        </div>
      ) : Object.keys(quizs).length === 0 ? (
        <p style={{ color: '#1f2937', textAlign: 'center' }}>Aucun quiz trouvé pour ce formateur.</p>
      ) : (
        Object.keys(quizs).map((category) => (
          <div key={category} style={{ marginBottom: '2.5rem' }}>
            <CategoryTitle>{category}</CategoryTitle>
            {Object.keys(quizs[category]).map((formationName) => (
              <div key={formationName} style={{ marginBottom: '1.5rem' }}>
                <FormationTitle>{formationName}</FormationTitle>
                {Object.keys(quizs[category][formationName]).map((semestre) => (
                  <div key={semestre} style={{ marginBottom: '1rem' }}>
                    <SemesterTitle>{semestre}</SemesterTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                      {Object.keys(quizs[category][formationName][semestre]).map((quizId) => {
                        const quizItem = quizs[category][formationName][semestre][quizId];
                        const path = `${category}/${formationName}/${semestre}/${quizId}`;
                        return (
                          <QuizCard key={quizId}>
                            <QuizTitle>{quizItem.titre || 'Quiz'}</QuizTitle>
                            <QuizText>{quizItem.description}</QuizText>
                            <QuizDate>
                              Date limite: {new Date(quizItem.date_limite).toLocaleDateString()}
                            </QuizDate>
                            <ButtonGroup>
                              <EditButton onClick={() => handleEdit(quizItem, path)}>
                                Modifier
                              </EditButton>
                              <DeleteButton onClick={() => handleDeleteConfirm(quizItem, path)}>
                                Supprimer
                              </DeleteButton>
                            </ButtonGroup>
                          </QuizCard>
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
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <ModalTitle>Modifier le quiz</ModalTitle>
        </Modal.Header>
        <ModalBody>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Titre</Form.Label>
              <Form.Control
                type="text"
                name="titre"
                value={formData.titre}
                onChange={(e) => handleChange(e)}
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
                onChange={(e) => handleChange(e)}
                required
                style={{ borderRadius: '8px', borderColor: '#d1d5db' }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Date limite</Form.Label>
              <Form.Control
                type="date"
                name="date_limite"
                value={formData.date_limite}
                onChange={(e) => handleChange(e)}
                required
                style={{ borderRadius: '8px', borderColor: '#d1d5db' }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Questions</Form.Label>
              {formData.questions.map((q, qIndex) => (
                <QuestionContainer key={qIndex}>
                  <Form.Group className="mb-2">
                    <Form.Label>Question {qIndex + 1}</Form.Label>
                    <Form.Control
                      type="text"
                      value={q.question}
                      onChange={(e) => handleChange(e, qIndex, 'question')}
                      required
                      style={{ borderRadius: '8px', borderColor: '#d1d5db' }}
                    />
                  </Form.Group>
                  {q.options.map((opt, optIndex) => (
                    <Form.Group className="mb-2" key={optIndex}>
                      <Form.Label>Option {optIndex + 1}</Form.Label>
                      <Form.Control
                        type="text"
                        value={opt}
                        onChange={(e) => handleChange(e, qIndex, 'options', optIndex)}
                        required
                        style={{ borderRadius: '8px', borderColor: '#d1d5db' }}
                      />
                    </Form.Group>
                  ))}
                  <Form.Group className="mb-2">
                    <Form.Label>Réponse correcte</Form.Label>
                    <Form.Control
                      as="select"
                      value={q.correctAnswer}
                      onChange={(e) => handleChange(e, qIndex, 'correctAnswer')}
                      required
                      style={{ borderRadius: '8px', borderColor: '#d1d5db' }}
                    >
                      <option value="">Sélectionner</option>
                      {q.options.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </Form.Control>
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>Points</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={q.points}
                      onChange={(e) => handleChange(e, qIndex, 'points')}
                      required
                      style={{ borderRadius: '8px', borderColor: '#d1d5db' }}
                    />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>Limite de temps (secondes)</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={q.timeLimit}
                      onChange={(e) => handleChange(e, qIndex, 'timeLimit')}
                      required
                      style={{ borderRadius: '8px', borderColor: '#d1d5db' }}
                    />
                  </Form.Group>
                  <RemoveButton onClick={() => removeQuestion(qIndex)} disabled={formData.questions.length === 1}>
                    Supprimer la question
                  </RemoveButton>
                </QuestionContainer>
              ))}
              <AddButton onClick={addQuestion}>Ajouter une question</AddButton>
            </Form.Group>
          </Form>
        </ModalBody>
        <ModalFooter>
          <ModalButton
            variant="secondary"
            onClick={() => setShowEditModal(false)}
            disabled={isUpdating}
            style={{ background: '#9ca3af', color: 'white' }}
            onMouseOver={(e) => (e.target.style.background = '#6b7280')}
            onMouseOut={(e) => (e.target.style.background = '#9ca3af')}
          >
            Annuler
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleUpdate}
            disabled={isUpdating}
            style={{ background: '#3b82f6', color: 'white' }}
            onMouseOver={(e) => (e.target.style.background = '#2563eb')}
            onMouseOut={(e) => (e.target.style.background = '#3b82f6')}
          >
            {isUpdating ? (
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
          <p style={{ color: '#1f2937' }}>Voulez-vous vraiment supprimer ce quiz ? Cette action est irréversible.</p>
        </ModalBody>
        <ModalFooter>
          <ModalButton
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={isUpdating}
            style={{ background: '#9ca3af', color: 'white' }}
            onMouseOver={(e) => (e.target.style.background = '#6b7280')}
            onMouseOut={(e) => (e.target.style.background = '#9ca3af')}
          >
            Annuler
          </ModalButton>
          <ModalButton
            variant="danger"
            onClick={handleDelete}
            disabled={isUpdating}
            style={{ background: '#ef4444', color: 'white' }}
            onMouseOver={(e) => (e.target.style.background = '#dc2626')}
            onMouseOut={(e) => (e.target.style.background = '#ef4444')}
          >
            {isUpdating ? (
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

export default ListeQuiz;