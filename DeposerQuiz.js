
import React, { useEffect, useState } from 'react';
import { ref, set, get } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import styled from 'styled-components';

const DeposerQuiz = () => {
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState('');
  const [selectedFormationName, setSelectedFormationName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [dateLimite, setDateLimite] = useState('');
  const [semester, setSemester] = useState('semestre1');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formateur, setFormateur] = useState(null);
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correctAnswer: '', timeLimit: '30', points: '10' },
  ]);

  useEffect(() => {
    const currentFormateur = JSON.parse(localStorage.getItem('formateur'));
    if (!currentFormateur || !currentFormateur.uid) {
      setError('Formateur non authentifié. Veuillez vous connecter.');
      return;
    }
    setFormateur(currentFormateur);
    console.log('Formateur connecté:', currentFormateur);

    const fetchFormations = async () => {
      try {
        const categoriesRef = ref(db, 'categories');
        const snapshot = await get(categoriesRef);
        if (!snapshot.exists()) {
          console.log('Aucune catégorie trouvée dans la base de données');
          setError('Aucune catégorie disponible dans la base de données');
          return;
        }

        const categoriesData = snapshot.val();
        console.log('Données catégories:', categoriesData);

        let allFormations = [];
        Object.entries(categoriesData).forEach(([categoryId, category]) => {
          const categoryFormations = category.formations || {};
          Object.entries(categoryFormations).forEach(([formationId, formation]) => {
            allFormations.push({
              id: formationId,
              categoryId,
              categoryName: category.nom || categoryId, // For display
              ...formation,
            });
          });
        });

        console.log('Toutes les formations:', allFormations);

        // Filter formations by formateurId, with fallback to formateur email or name
        const formateurFormations = allFormations.filter((formation) => {
          const hasFormateurId = formation.formateurId === currentFormateur.uid;
          const hasFormateurEmail = formation.formateurNom?.includes(currentFormateur.email);
          const hasFormateurName =
            formation.formateurNom?.includes(currentFormateur.nom) ||
            formation.formateurPrenom?.includes(currentFormateur.prenom);
          return hasFormateurId || hasFormateurEmail || hasFormateurName;
        });

        console.log('Formations du formateur:', formateurFormations);

        if (formateurFormations.length === 0) {
          console.log('Aucune formation associée à ce formateur');
          setError('Aucune formation trouvée pour ce formateur.');
        } else {
          setFormations(formateurFormations);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des formations:', error);
        setError('Erreur lors de la récupération des formations: ' + error.message);
      }
    };

    fetchFormations();
  }, []);

  const handleFormationChange = (e) => {
    const formationId = e.target.value;
    const formation = formations.find((f) => f.id === formationId);
    setSelectedFormation(formationId);
    setSelectedFormationName(formation?.intitule || '');
    setSelectedCategoryId(formation?.categorieId || '');
  };

  const handleSemesterChange = (e) => {
    setSemester(e.target.value);
  };

  const handleDateLimiteChange = (e) => {
    setDateLimite(e.target.value);
  };

  const validateDateLimite = () => {
    if (!dateLimite) return false;
    const aujourdHui = new Date();
    const deadline = new Date(dateLimite);
    return deadline > aujourdHui;
  };

  const handleQuestionChange = (index, event) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][event.target.name] = event.target.value;
    setQuestions(updatedQuestions);
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(updatedQuestions);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { question: '', options: ['', '', '', ''], correctAnswer: '', timeLimit: '30', points: '10' },
    ]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      const updatedQuestions = questions.filter((_, i) => i !== index);
      setQuestions(updatedQuestions);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!selectedFormation) throw new Error('Veuillez sélectionner une formation');
      if (!titre.trim()) throw new Error('Veuillez saisir un titre pour le quiz');
      if (!description.trim()) throw new Error('Veuillez saisir une description pour le quiz');
      if (!dateLimite) throw new Error('Veuillez définir une date limite de rendu');
      if (!validateDateLimite()) throw new Error("La date limite doit être ultérieure à aujourd'hui");
      if (!selectedFormationName || !selectedCategoryId) throw new Error('Informations de formation incomplètes');

      // Validate questions
      if (questions.length === 0) throw new Error('Veuillez ajouter au moins une question');
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question.trim()) throw new Error(`La question ${i + 1} est vide`);
        const emptyOptionIndex = q.options.findIndex((opt) => !opt.trim());
        if (emptyOptionIndex !== -1)
          throw new Error(`L'option ${emptyOptionIndex + 1} de la question ${i + 1} est vide`);
        if (!q.correctAnswer.trim()) throw new Error(`La réponse correcte de la question ${i + 1} est vide`);
        if (!q.timeLimit.trim() || parseInt(q.timeLimit) <= 0)
          throw new Error(`Le temps limite de la question ${i + 1} doit être un nombre positif`);
        if (!q.points.trim() || parseInt(q.points) <= 0)
          throw new Error(`Les points de la question ${i + 1} doivent être un nombre positif`);
      }

      const quizId = uuidv4();
      const submissionDate = new Date().toISOString();
      const deadlineDate = new Date(dateLimite).toISOString();

      const quizData = {
        quizId,
        titre,
        description,
        formateurId: formateur.uid,
        formateurNom: formateur.nom || formateur.email,
        formateurPrenom: formateur.prenom || '',
        date_soumission: submissionDate,
        date_limite: deadlineDate,
        idFormation: selectedFormation,
        nomFormation: selectedFormationName,
        questions: questions.map((q) => ({
          question: q.question.trim(),
          options: q.options.map((opt) => opt.trim()),
          correctAnswer: q.correctAnswer.trim(),
          timeLimit: q.timeLimit.trim(),
          points: q.points.trim(),
        })),
      };

      // Use categorieId for the quiz path
      const quizRef = ref(db, `quizs/${selectedCategoryId}/${selectedFormation}/${semester}/${quizId}`);
      await set(quizRef, quizData);

      setSuccess('Quiz ajouté avec succès');
      setTitre('');
      setDescription('');
      setDateLimite('');
      setSelectedFormation('');
      setSelectedFormationName('');
      setSelectedCategoryId('');
      setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: '', timeLimit: '30', points: '10' }]);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <FormContainer>
        <Header>
          <Title>Déposer un Quiz</Title>
        </Header>

        {selectedFormationName && (
          <SelectedFormation>
            Formation sélectionnée: <strong>{selectedFormationName}</strong>
            {selectedCategoryId && (
              <span> (Catégorie: {formations.find((f) => f.id === selectedFormation)?.categoryName})</span>
            )}
          </SelectedFormation>
        )}

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <StyledForm onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Formation</Label>
            <Select value={selectedFormation} onChange={handleFormationChange} required>
              <option value="">Choisir une formation</option>
              {formations.map((formation) => (
                <option key={formation.id} value={formation.id}>
                  {formation.intitule} {formation.specialite ? `- ${formation.specialite}` : ''} (
                  {formation.categoryName})
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormRow>
            <FormGroup style={{ flex: 1 }}>
              <Label>Semestre</Label>
              <Select value={semester} onChange={handleSemesterChange} required>
                <option value="semestre1">Semestre 1</option>
                <option value="semestre2">Semestre 2</option>
                <option value="semestre3">Semestre 3</option>
                <option value="semestre4">Semestre 4</option>
              </Select>
            </FormGroup>

            <FormGroup style={{ flex: 2 }}>
              <Label>Titre du quiz</Label>
              <Input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
                placeholder="Entrez le titre du quiz"
              />
            </FormGroup>
          </FormRow>

          <FormGroup>
            <Label>Date limite de rendu</Label>
            <Input
              type="date"
              value={dateLimite}
              onChange={handleDateLimiteChange}
              min={new Date().toISOString().split('T')[0]}
              required
              placeholder="Sélectionnez la date limite"
            />
          </FormGroup>

          <FormGroup>
            <Label>Description</Label>
            <TextArea
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Décrivez les consignes du quiz"
            />
          </FormGroup>

          <QuestionsSection>
            <SectionTitle>Questions du Quiz</SectionTitle>

            {questions.map((q, index) => (
              <QuestionCard key={index}>
                <QuestionHeader>
                  <QuestionTitle>Question {index + 1}</QuestionTitle>
                  {questions.length > 1 && (
                    <RemoveButton type="button" onClick={() => removeQuestion(index)}>
                      Supprimer
                    </RemoveButton>
                  )}
                </QuestionHeader>

                <FormGroup>
                  <Label>Question</Label>
                  <Input
                    type="text"
                    name="question"
                    value={q.question}
                    onChange={(e) => handleQuestionChange(index, e)}
                    placeholder="Saisissez votre question..."
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Options</Label>
                  {q.options.map((option, optIndex) => (
                    <Input
                      key={optIndex}
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                      placeholder={`Option ${optIndex + 1}`}
                      className="mb-2"
                      required
                    />
                  ))}
                </FormGroup>

                <FormGroup>
                  <Label>Réponse correcte</Label>
                  <Input
                    type="text"
                    name="correctAnswer"
                    value={q.correctAnswer}
                    onChange={(e) => handleQuestionChange(index, e)}
                    placeholder="Réponse correcte"
                    required
                  />
                </FormGroup>

                <FormRow>
                  <FormGroup style={{ flex: 1 }}>
                    <Label>Temps limite (secondes)</Label>
                    <Input
                      type="number"
                      name="timeLimit"
                      value={q.timeLimit}
                      onChange={(e) => handleQuestionChange(index, e)}
                      placeholder="Temps en secondes"
                      min="1"
                      required
                    />
                  </FormGroup>
                  <FormGroup style={{ flex: 1 }}>
                    <Label>Points</Label>
                    <Input
                      type="number"
                      name="points"
                      value={q.points}
                      onChange={(e) => handleQuestionChange(index, e)}
                      placeholder="Points"
                      min="1"
                      required
                    />
                  </FormGroup>
                </FormRow>
              </QuestionCard>
            ))}

            <AddQuestionButton type="button" onClick={addQuestion}>
              + Ajouter une question
            </AddQuestionButton>
          </QuestionsSection>

          <SubmitButton type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner />
                Envoi en cours...
              </>
            ) : (
              'Déposer le Quiz'
            )}
          </SubmitButton>
        </StyledForm>
      </FormContainer>
    </Container>
  );
};

// Styles
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, rgb(241, 253, 183) 0%, rgb(146, 184, 246) 100%);
`;

const FormContainer = styled.div`
  width: 100%;
  max-width: 800px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  padding: 2.5rem;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: #2c3e50;
  margin-bottom: 0.5rem;
  font-size: 1.8rem;
`;

const SelectedFormation = styled.div`
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  text-align: center;
  color: #2c3e50;
  span {
    color: #7f8c8d;
    font-size: 0.9rem;
  }
`;

const Alert = styled.div`
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  background: ${(props) => (props.type === 'error' ? '#f8d7da' : '#d4edda')};
  color: ${(props) => (props.type === 'error' ? '#721c24' : '#155724')};
  border: 1px solid ${(props) => (props.type === 'error' ? '#f5c6cb' : '#c3e6cb')};
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FormRow = styled.div`
  display: flex;
  gap: 1.5rem;
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1.5rem;
  }
`;

const Label = styled.label`
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.95rem;
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
  &:focus {
    border-color: #3498db;
    outline: none;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  background-color: white;
  transition: border-color 0.3s;
  &:focus {
    border-color: #3498db;
    outline: none;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  resize: vertical;
  min-height: 120px;
  transition: border-color 0.3s;
  &:focus {
    border-color: #3498db;
    outline: none;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
  }
`;

const QuestionsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SectionTitle = styled.h3`
  color: #2c3e50;
  font-size: 1.3rem;
  margin-bottom: 0.5rem;
  border-bottom: 2px solid #eaeaea;
  padding-bottom: 0.5rem;
`;

const QuestionCard = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  background-color: #f9f9f9;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const QuestionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const QuestionTitle = styled.h4`
  color: #2c3e50;
  margin: 0;
  font-size: 1.1rem;
`;

const RemoveButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.3s;
  &:hover {
    background: #c0392b;
  }
  &:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
`;

const AddQuestionButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #2ecc71;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
  align-self: center;
  &:hover {
    background: #27ae60;
  }
  &:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled.button`
  padding: 1rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  &:hover {
    background: #2980b9;
  }
  &:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
`;

const Spinner = styled.div`
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export default DeposerQuiz;
