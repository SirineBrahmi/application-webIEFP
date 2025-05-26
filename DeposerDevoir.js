
import React, { useEffect, useState } from 'react';
import { ref, set, get } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import styled from 'styled-components';

const DeposerDevoir = () => {
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState('');
  const [selectedFormationName, setSelectedFormationName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [dateLimite, setDateLimite] = useState('');
  const [semester, setSemester] = useState('semestre1');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formateur, setFormateur] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!file) throw new Error('Veuillez ajouter un fichier de devoir');
      if (!selectedFormation) throw new Error('Veuillez sélectionner une formation');
      if (!dateLimite) throw new Error('Veuillez définir une date limite de rendu');
      if (!validateDateLimite()) throw new Error("La date limite doit être ultérieure à aujourd'hui");
      if (!selectedFormationName || !selectedCategoryId) throw new Error('Informations de formation incomplètes');

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('La taille du fichier ne doit pas dépasser 10MB');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'IEFPMinyarSirine');

      const response = await fetch('https://api.cloudinary.com/v1_1/demvebwif/raw/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.error) throw new Error('Erreur lors du téléchargement du fichier: ' + data.error.message);

      const devoirId = uuidv4();
      const submissionDate = new Date().toISOString();
      const deadlineDate = new Date(dateLimite).toISOString();

      const devoirData = {
        id: devoirId,
        titre,
        description,
        date_soumission: submissionDate,
        date_limite: deadlineDate,
        formateurId: formateur.uid,
        formateurNom: formateur.nom || formateur.email,
        formateurPrenom: formateur.prenom || '',
        file_url: data.secure_url,
        createdAt: submissionDate,
        idFormation: selectedFormation,
        nomFormation: selectedFormationName,
      };

      // Use categorieId for the devoir path
      const devoirRef = ref(db, `devoirs/${selectedCategoryId}/${selectedFormation}/${semester}/${devoirId}`);
      await set(devoirRef, devoirData);

      setSuccess('Devoir ajouté avec succès');
      setTitre('');
      setDescription('');
      setFile(null);
      setDateLimite('');
      setSelectedFormation('');
      setSelectedFormationName('');
      setSelectedCategoryId('');
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
          <Title>Déposer un Devoir</Title>
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
              <Label>Titre du devoir</Label>
              <Input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
                placeholder="Entrez le titre du devoir"
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
              placeholder="Décrivez les consignes du devoir"
            />
          </FormGroup>

          <FormGroup>
            <Label>Fichier du devoir</Label>
            <FileInputContainer>
              <FileInput
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.txt"
                onChange={(e) => setFile(e.target.files[0])}
                required
              />
              <FileInfo>{file ? file.name : 'Aucun fichier sélectionné'}</FileInfo>
              <FileButton>Choisir un fichier</FileButton>
            </FileInputContainer>
            <FileHint>Formats acceptés: PDF, DOC, DOCX, PPT, PPTX, ZIP, TXT (Taille max: 10MB)</FileHint>
          </FormGroup>

          <SubmitButton type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner />
                Envoi en cours...
              </>
            ) : (
              'Déposer le Devoir'
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

const FileInputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const FileInput = styled.input`
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
`;

const FileInfo = styled.span`
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px dashed #ddd;
  border-radius: 8px;
  color: #7f8c8d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FileButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 8px;
  color: #2c3e50;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  &:hover {
    background: #e9ecef;
  }
`;

const FileHint = styled.small`
  color: #7f8c8d;
  font-size: 0.85rem;
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

export default DeposerDevoir;
