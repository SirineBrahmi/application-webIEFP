
import React, { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { db } from '../firebase';
import styled from 'styled-components';

// Styles (unchanged)
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

const SubmissionList = styled.div`
  display: grid;
  gap: 20px;
`;

const SubmissionCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #3498db;
`;

const SubmissionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const SubmissionTitle = styled.h3`
  font-size: 1.2rem;
  color: #2c3e50;
  margin: 0;
`;

const SubmissionMeta = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
  font-size: 0.9rem;
  color: #555;
`;

const FileLink = styled.a`
  color: #3498db;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const CorrectionForm = styled.div`
  margin-top: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 5px;
  font-size: 0.9rem;
  color: #2c3e50;
`;

const ScoreInput = styled.input`
  width: 100px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #2c3e50;
  margin-bottom: 10px;
`;

const FileInput = styled.input`
  padding: 8px;
  font-size: 0.9rem;
  color: #2c3e50;
  margin-bottom: 10px;
`;

const CommentsInput = styled.textarea`
  width: 100%;
  height: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #2c3e50;
  margin-bottom: 10px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const SubmitButton = styled.button`
  padding: 8px 16px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  &:hover {
    background: #2980b9;
  }
  &:disabled {
    background: #95a5a6;
    cursor: not-allowed;
  }
`;

const ResubmitButton = styled(SubmitButton)`
  background: #e67e22;
  &:hover {
    background: #d35400;
  }
`;

const CorrectionDisplay = styled.div`
  margin-top: 15px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 0.9rem;
  color: #2c3e50;
`;

const StatusMessage = styled.p`
  color: #e74c3c;
  font-style: italic;
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

const NoSubmissions = styled.div`
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
  color: #6c757d;
`;

const WarningMessage = styled.p`
  color: #e67e22;
  font-size: 0.9rem;
  font-style: italic;
`;

function CompteRendu({ formateurId }) {
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [correctionStates, setCorrectionStates] = useState({});
  const [assignmentsInfo, setAssignmentsInfo] = useState({});
  const [filter, setFilter] = useState('resoumettre');

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!formateurId) {
        setLoading(false);
        setError('Erreur: Identifiant du formateur manquant. Veuillez vous reconnecter.');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log("Fetching data for formateur ID:", formateurId);

        // 1. Fetch devoirs associated with this formateurId
        const devoirsRef = ref(db, 'devoirs');
        const devoirsSnapshot = await get(devoirsRef);
        const devoirsData = {};
        const formateurDevoirIds = new Set(); // Keep track of devoir IDs associated with this formateur

        if (devoirsSnapshot.exists()) {
          const snapshotVal = devoirsSnapshot.val();
          console.log("Raw devoirs snapshot:", JSON.stringify(snapshotVal, null, 2));

          Object.values(snapshotVal).forEach(category => {
            Object.values(category).forEach(formation => {
              Object.values(formation).forEach(semestre => {
                Object.entries(semestre).forEach(([devoirId, devoirData]) => {
                  console.log(`Processing devoir: ${devoirId}, formateurId: ${devoirData.formateurId || 'missing'}`);
                  
                  // Only include devoirs that belong to this formateur
                  if (devoirData.formateurId === formateurId) {
                    formateurDevoirIds.add(devoirId);
                    devoirsData[devoirId] = {
                      id: devoirId,
                      titre: devoirData.titre || `Devoir ${devoirId.substring(0, 8)}`,
                      description: devoirData.description || '',
                      dateCreation: devoirData.date_soumession || devoirData.createdAt || 'Inconnue',
                      dateLimite: devoirData.date_limite || 'Non spécifiée',
                      nomFormation: devoirData.nomFormation || 'Formation inconnue'
                    };
                  }
                });
              });
            });
          });
        } else {
          console.log('No devoirs found');
        }

        console.log("Devoirs associated with formateur:", JSON.stringify(devoirsData, null, 2));
        console.log("Formateur devoir IDs:", Array.from(formateurDevoirIds));
        setAssignmentsInfo(devoirsData);

        // 2. Fetch compte rendu ONLY for the devoirs that belong to this formateur
        const submissionsData = [];

        // Process each devoir that belongs to this formateur
        for (const devoirId of formateurDevoirIds) {
          try {
            const compteRenduRef = ref(db, `Compte rendu/${devoirId}`);
            const compteRenduSnapshot = await get(compteRenduRef);
            
            if (compteRenduSnapshot.exists()) {
              const devoirSubmissions = compteRenduSnapshot.val();
              
              Object.entries(devoirSubmissions).forEach(([studentId, submissionData]) => {
                console.log(`Found submission: devoir=${devoirId}, student=${studentId}, statut=${submissionData.statut}`);
                submissionsData.push({
                  devoirId,
                  studentId,
                  assignmentInfo: devoirsData[devoirId],
                  ...submissionData
                });
              });
            }
          } catch (err) {
            console.error(`Error fetching compte rendu for devoir ${devoirId}:`, err.message);
            setError(prev => prev ? `${prev}\nErreur pour devoir ${devoirId}: ${err.message}` : `Erreur pour devoir ${devoirId}: ${err.message}`);
          }
        }

        // Sort submissions by dateSoumission (newest first)
        submissionsData.sort((a, b) => new Date(b.dateSoumission) - new Date(a.dateSoumission));
        console.log("Found submissions for formateur:", JSON.stringify(submissionsData, null, 2));
        setSubmissions(submissionsData);

        // Apply initial filter
        const filtered = filter === 'resoumettre'
          ? submissionsData.filter(s => s.statut === 'à resoumettre')
          : submissionsData;
        console.log("Filtered submissions:", JSON.stringify(filtered, null, 2));
        setFilteredSubmissions(filtered);

        setCorrectionStates(
          submissionsData.reduce((acc, submission) => ({
            ...acc,
            [`${submission.devoirId}-${submission.studentId}`]: {
              score: submission.score || '',
              commentaires: submission.commentaires || '',
              correctedFile: null,
              isEditing: submission.statut !== 'corrigé'
            }
          }), {})
        );

      } catch (err) {
        console.error('Erreur lors de la récupération des données:', err);
        setError(`Erreur lors du chargement des données: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [formateurId]);

  useEffect(() => {
    const filtered = filter === 'resoumettre'
      ? submissions.filter(s => s.statut === 'à resoumettre')
      : submissions;
    console.log("Updated filtered submissions:", JSON.stringify(filtered, null, 2));
    setFilteredSubmissions(filtered);
  }, [filter, submissions]);

  const handleCorrectionChange = (devoirId, studentId, field, value) => {
    setCorrectionStates(prev => ({
      ...prev,
      [`${devoirId}-${studentId}`]: {
        ...prev[`${devoirId}-${studentId}`],
        [field]: value
      }
    }));
  };

  const handleCorrectionSubmit = async (devoirId, studentId) => {
    const key = `${devoirId}-${studentId}`;
    const { score, commentaires, correctedFile } = correctionStates[key];

    if (score && (isNaN(score) || score < 0 || score > 20)) {
      alert('Veuillez entrer une note valide entre 0 et 20.');
      return;
    }

    try {
      let correctedFileUrl = null;
      if (correctedFile) {
        const formData = new FormData();
        formData.append('file', correctedFile);
        formData.append('upload_preset', 'IEFPMinyarSirine');

        const response = await fetch('https://api.cloudinary.com/v1_1/demvebwif/raw/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Échec du téléchargement vers Cloudinary');
        }

        const data = await response.json();
        correctedFileUrl = data.secure_url;
      }

      const compteRenduRef = ref(db, `Compte rendu/${devoirId}/${studentId}`);
      const updatedSubmission = {
        ...submissions.find(s => s.devoirId === devoirId && s.studentId === studentId),
        score: score ? Number(score) : null,
        commentaires: commentaires || null,
        statut: 'corrigé',
        dateCorrection: new Date().toISOString(),
        correctedFile: correctedFileUrl || null
      };

      await set(compteRenduRef, updatedSubmission);

      setSubmissions(prev =>
        prev.map(submission =>
          submission.devoirId === devoirId && submission.studentId === studentId
            ? updatedSubmission
            : submission
        )
      );
      setFilteredSubmissions(prev =>
        filter === 'resoumettre'
          ? prev.filter(s => s.devoirId !== devoirId || s.studentId !== studentId)
          : prev.map(s =>
              s.devoirId === devoirId && s.studentId === studentId ? updatedSubmission : s
            )
      );
      setCorrectionStates(prev => ({
        ...prev,
        [key]: {
          score: score || '',
          commentaires: commentaires || '',
          correctedFile: null,
          isEditing: false
        }
      }));
      alert('Correction enregistrée avec succès.');
    } catch (err) {
      console.error('Erreur lors de la correction:', err);
      alert(`Erreur lors de la correction: ${err.message}`);
    }
  };

  const handleRequestResubmission = async (devoirId, studentId) => {
    try {
      const key = `${devoirId}-${studentId}`;
      const { commentaires } = correctionStates[key] || { commentaires: '' };

      const compteRenduRef = ref(db, `Compte rendu/${devoirId}/${studentId}`);
      const updatedSubmission = {
        ...submissions.find(s => s.devoirId === devoirId && s.studentId === studentId),
        statut: 'à resoumettre',
        score: null,
        commentaires: commentaires || null, // Save the comment from correctionStates
        dateCorrection: new Date().toISOString(),
        correctedFile: null
      };

      await set(compteRenduRef, updatedSubmission);

      setSubmissions(prev =>
        prev.map(submission =>
          submission.devoirId === devoirId && submission.studentId === studentId
            ? updatedSubmission
            : submission
        )
      );
      setFilteredSubmissions(prev =>
        prev.map(s =>
          s.devoirId === devoirId && s.studentId === studentId ? updatedSubmission : s
        )
      );
      setCorrectionStates(prev => ({
        ...prev,
        [key]: {
          score: '',
          commentaires: commentaires || '', // Preserve comment in UI
          correctedFile: null,
          isEditing: true // Allow further editing
        }
      }));
      alert('Resoumission demandée avec succès.');
    } catch (err) {
      console.error('Erreur lors de la demande de resoumission:', err);
      alert(`Erreur lors de la demande de resoumission: ${err.message}`);
    }
  };

  const toggleEditCorrection = (devoirId, studentId) => {
    setCorrectionStates(prev => ({
      ...prev,
      [`${devoirId}-${studentId}`]: {
        ...prev[`${devoirId}-${studentId}`],
        isEditing: !prev[`${devoirId}-${studentId}`].isEditing
      }
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non spécifiée';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAssignmentTitle = (devoirId, submission) => {
    if (submission.assignmentInfo && submission.assignmentInfo.titre) {
      return submission.assignmentInfo.titre;
    }
    if (assignmentsInfo[devoirId] && assignmentsInfo[devoirId].titre) {
      return assignmentsInfo[devoirId].titre;
    }
    return `Devoir ${devoirId.substring(0, 8)}...`;
  };

  return (
    <ContentCard>
      <h2>Compte Rendu des Devoirs</h2>

      <FilterContainer>
        <FilterButton
          active={filter === 'resoumettre'}
          onClick={() => setFilter('resoumettre')}
        >
          À Resoumettre
        </FilterButton>
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          Toutes les Soumissions
        </FilterButton>
      </FilterContainer>

      {loading && <LoadingMessage>Chargement des soumissions...</LoadingMessage>}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {!loading && !error && filteredSubmissions.length === 0 && (
        <NoSubmissions>
          <p>Aucune soumission {filter === 'resoumettre' ? 'à resoumettre' : ''} disponible pour le moment.</p>
        </NoSubmissions>
      )}

      <SubmissionList>
        {filteredSubmissions.map(submission => {
          const key = `${submission.devoirId}-${submission.studentId}`;
          const correction = correctionStates[key] || { score: '', commentaires: '', correctedFile: null, isEditing: false };
          const isResubmissionRequested = submission.statut === 'à resoumettre';
          const isCorrected = submission.statut === 'corrigé';
          const isMissingMetadata = !submission.assignmentInfo || !submission.assignmentInfo.titre || submission.assignmentInfo.titre.startsWith('Devoir');

          return (
            <SubmissionCard key={key}>
              <SubmissionHeader>
                <SubmissionTitle>{getAssignmentTitle(submission.devoirId, submission)}</SubmissionTitle>
                <span style={{
                  color: submission.statut === 'soumis' ? '#2ecc71' :
                    submission.statut === 'corrigé' ? '#3498db' : '#e74c3c'
                }}>
                  {submission.statut.charAt(0).toUpperCase() + submission.statut.slice(1)}
                </span>
              </SubmissionHeader>
              <SubmissionMeta>
                <span>Étudiant: {submission.etudiantNom || `Étudiant ${submission.studentId}`}</span>
                <span>Formation: {submission.assignmentInfo?.nomFormation || 'Inconnue'}</span>
                <span>Date de soumission: {formatDate(submission.dateSoumission)}</span>
              </SubmissionMeta>
              <div>
                <strong>Fichier soumis:</strong>{' '}
                <FileLink href={submission.fichier} target="_blank" rel="noopener noreferrer">
                  Télécharger le fichier
                </FileLink>
              </div>
              {isMissingMetadata && (
                <WarningMessage>
                  Attention : Les métadonnées de ce devoir sont incomplètes.
                </WarningMessage>
              )}
              {isResubmissionRequested ? (
                <StatusMessage>En attente de resoumission par l'étudiant.</StatusMessage>
              ) : isCorrected && !correction.isEditing ? (
                <CorrectionDisplay>
                  <strong>Note:</strong> {submission.score !== null ? `${submission.score}/20` : 'Non attribuée'}<br />
                  <strong>Commentaires:</strong> {submission.commentaires || 'Aucun commentaire'}<br />
                  {submission.correctedFile && (
                    <>
                      <strong>Fichier corrigé:</strong>{' '}
                      <FileLink href={submission.correctedFile} target="_blank" rel="noopener noreferrer">
                        Télécharger le fichier corrigé
                      </FileLink><br />
                    </>
                  )}
                  <strong>Date de correction:</strong> {formatDate(submission.dateCorrection)}<br />
                  <SubmitButton onClick={() => toggleEditCorrection(submission.devoirId, submission.studentId)}>
                    Modifier la correction
                  </SubmitButton>
                </CorrectionDisplay>
              ) : (
                <CorrectionForm>
                  <FormLabel>Note (sur 20, facultative):</FormLabel>
                  <ScoreInput
                    type="number"
                    min="0"
                    max="20"
                    value={correction.score}
                    onChange={e => handleCorrectionChange(submission.devoirId, submission.studentId, 'score', e.target.value)}
                    disabled={isResubmissionRequested}
                    placeholder="Optionnel"
                  />
                  <FormLabel>Fichier corrigé (facultatif):</FormLabel>
                  <FileInput
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={e => handleCorrectionChange(submission.devoirId, submission.studentId, 'correctedFile', e.target.files[0])}
                    disabled={isResubmissionRequested}
                  />
                  <FormLabel>Commentaires:</FormLabel>
                  <CommentsInput
                    value={correction.commentaires}
                    onChange={e => handleCorrectionChange(submission.devoirId, submission.studentId, 'commentaires', e.target.value)}
                    disabled={isResubmissionRequested}
                  />
                  <ButtonGroup>
                    <SubmitButton
                      onClick={() => handleCorrectionSubmit(submission.devoirId, submission.studentId)}
                      disabled={isResubmissionRequested}
                    >
                      {isCorrected ? 'Mettre à jour la correction' : 'Corriger'}
                    </SubmitButton>
                    <ResubmitButton
                      onClick={() => handleRequestResubmission(submission.devoirId, submission.studentId)}
                      disabled={isResubmissionRequested}
                    >
                      Demander Resoumission
                    </ResubmitButton>
                  </ButtonGroup>
                </CorrectionForm>
              )}
            </SubmissionCard>
          );
        })}
      </SubmissionList>
    </ContentCard>
  );
}

export default CompteRendu;
