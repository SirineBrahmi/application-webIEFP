
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ref, get, set, remove } from 'firebase/database';
import { db } from '../../firebase';
import styled from 'styled-components';

// Styles (unchanged except for CorrectionInfo)
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

const AssignmentList = styled.div`
  display: grid;
  gap: 20px;
`;

const AssignmentCard = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  border-left: 4px solid #3498db;
`;

const AssignmentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const AssignmentTitle = styled.h3`
  font-size: 1.2rem;
  color: #1e3b70;
  margin: 0;
`;

const Deadline = styled.span`
  color: ${(props) => (props.overdue ? '#e74c3c' : '#2ecc71')};
  font-weight: bold;
`;

const AssignmentMeta = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
  font-size: 0.9rem;
  color: #555;
`;

const AssignmentDescription = styled.p`
  color: #333;
  line-height: 1.6;
  margin-bottom: 15px;
`;

const FileLink = styled.a`
  display: inline-block;
  padding: 8px 15px;
  background: #3498db;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  margin-bottom: 15px;
  transition: background 0.2s;
  &:hover {
    background: #2980b9;
  }
`;

const SubmissionForm = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed #ddd;
`;

const FormTitle = styled.h4`
  font-size: 1rem;
  color: #1e3b70;
  margin-bottom: 10px;
`;

const FileInput = styled.input`
  display: block;
  margin-bottom: 10px;
  color: #2c3e50;
  font-size: 0.9rem;
  &::file-selector-button {
    padding: 8px 15px;
    border: none;
    border-radius: 4px;
    background: #3498db;
    color: white;
    cursor: pointer;
    transition: background 0.2s;
    &:hover {
      background: #2980b9;
    }
  }
`;

const SubmitButton = styled.button`
  background: #2ecc71;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: #27ae60;
  }
  &:disabled {
    background: #95a5a6;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.p`
  margin-top: 10px;
  color: ${(props) => (props.error ? '#e74c3c' : '#2ecc71')};
  font-size: 0.9rem;
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

const NoAssignments = styled.div`
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
  color: #6c757d;
`;

const SubmissionInfo = styled.div`
  margin-top: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
  color: #2c3e50;
  p {
    color: #2c3e50;
    margin: 0 0 8px 0;
  }
`;

const CorrectionInfo = styled.div`
  margin-top: 15px;
  padding: 15px;
  background: #e6f3ff;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #2c3e50;
  p {
    margin: 0 0 8px 0;
  }
`;

const ResubmissionForm = styled.div`
  margin-top: 20px;
  padding: 15px;
  background: #fff3e0;
  border-radius: 4px;
`;

const ActionButton = styled.button`
  margin-right: 10px;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    opacity: 0.9;
  }
`;

const EditButton = styled(ActionButton)`
  background: #3498db;
  color: white;
`;

const DeleteButton = styled(ActionButton)`
  background: #e74c3c;
  color: white;
`;

const RefreshButton = styled(ActionButton)`
  background: #6c757d;
  color: white;
  margin-top: 10px;
`;

function ReportSubmissionContent() {
  const context = useOutletContext();
  const { studentData, enrolledCourses } = context || {};
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState({});
  const [file, setFile] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch assignments for the student's enrolled courses
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!studentData?.uid) {
        setLoading(false);
        setError('Veuillez vous connecter pour voir vos devoirs');
        return;
      }

      if (!enrolledCourses || enrolledCourses.length === 0) {
        setLoading(false);
        setError("Vous n'êtes inscrit à aucune formation");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Formations inscrites:', enrolledCourses);

        const assignmentsRef = ref(db, 'devoirs');
        const snapshot = await get(assignmentsRef);

        if (snapshot.exists()) {
          const assignmentsData = [];
          const enrolledFormationIds = enrolledCourses.map((course) => course.formationId);

          console.log('IDs des formations inscrites:', enrolledFormationIds);

          snapshot.forEach((categorySnapshot) => {
            const categoryName = categorySnapshot.key;
            console.log('Vérification dans la catégorie:', categoryName);

            categorySnapshot.forEach((formationSnapshot) => {
              const formationKey = formationSnapshot.key;

              formationSnapshot.forEach((semestreSnapshot) => {
                const semestreName = semestreSnapshot.key;

                semestreSnapshot.forEach((assignmentSnapshot) => {
                  const assignmentData = assignmentSnapshot.val();
                  const assignmentFormationId = assignmentData.idFormation || formationKey;

                  if (enrolledFormationIds.includes(assignmentFormationId)) {
                    console.log('Devoir trouvé pour la formation:', assignmentFormationId);
                    assignmentsData.push({
                      id: assignmentSnapshot.key,
                      category: categoryName,
                      formationId: assignmentFormationId,
                      formationNom: assignmentData.nomFormation || formationKey,
                      semestre: semestreName,
                      ...assignmentData,
                    });
                  }
                });
              });
            });
          });

          console.log('Total des devoirs trouvés:', assignmentsData.length);
          setAssignments(assignmentsData);

          if (assignmentsData.length === 0) {
            console.log('Aucun devoir trouvé pour les formations inscrites');
          }
        } else {
          console.log("Aucun devoir n'existe dans la base de données");
          setAssignments([]);
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des devoirs:', err);
        setError(`Erreur lors du chargement des devoirs: ${err.message}`);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [studentData, enrolledCourses]);

  // Fetch submissions for each assignment
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!studentData?.uid || assignments.length === 0) {
        console.log('Skipping fetchSubmissions: No UID or assignments');
        return;
      }

      try {
        const submissionsData = {};

        for (const assignment of assignments) {
          const submissionRef = ref(db, `Compte rendu/${assignment.id}/${studentData.uid}`);
          const snapshot = await get(submissionRef);

          if (snapshot.exists()) {
            const submissionData = snapshot.val();
            submissionsData[assignment.id] = submissionData;
            console.log(`Submission for ${assignment.id}:`, JSON.stringify(submissionData, null, 2));
          } else {
            console.log(`No submission found for ${assignment.id}`);
          }
        }

        console.log('Soumissions récupérées:', JSON.stringify(submissionsData, null, 2));
        setSubmissions(submissionsData);
      } catch (err) {
        console.error('Erreur lors de la récupération des soumissions:', err);
        setError(`Erreur lors de la récupération des soumissions: ${err.message}`);
      }
    };

    fetchSubmissions();
  }, [studentData, assignments, refreshTrigger]);

  const handleFileChange = (e, assignmentId) => {
    setFile({
      assignmentId,
      file: e.target.files[0],
    });
  };

  const handleSubmit = async (assignmentId) => {
    if (!file || file.assignmentId !== assignmentId) {
      setSubmissionStatus({
        ...submissionStatus,
        [assignmentId]: { error: true, message: 'Veuillez sélectionner un fichier' },
      });
      return;
    }

    try {
      setSubmissionStatus({
        ...submissionStatus,
        [assignmentId]: { loading: true, message: 'Envoi en cours...' },
      });

      const formData = new FormData();
      formData.append('file', file.file);
      formData.append('upload_preset', 'IEFPMinyarSirine');

      const response = await fetch('https://api.cloudinary.com/v1_1/demvebwif/raw/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de l'upload: ${response.statusText}`);
      }

      const uploadResult = await response.json();
      const downloadURL = uploadResult.secure_url;

      const submissionRef = ref(db, `Compte rendu/${assignmentId}/${studentData.uid}`);
      const existingSubmission = submissions[assignmentId] || {};
      const updatedSubmission = {
        ...existingSubmission,
        dateSoumission: new Date().toISOString(),
        fichier: downloadURL,
        etudiantId: studentData.uid,
        etudiantNom: `${studentData.prenom} ${studentData.nom}`,
        statut: 'soumis',
        // Preserve existing fields if they exist
        score: existingSubmission.score || null,
        commentaires: existingSubmission.commentaires || null,
        correctedFile: existingSubmission.correctedFile || null,
        dateCorrection: existingSubmission.dateCorrection || null,
      };

      await set(submissionRef, updatedSubmission);

      setSubmissions({
        ...submissions,
        [assignmentId]: updatedSubmission,
      });

      setSubmissionStatus({
        ...submissionStatus,
        [assignmentId]: { success: true, message: 'Compte rendu soumis avec succès !' },
      });
      setFile(null);
      setEditingSubmission(null);
      setRefreshTrigger(prev => prev + 1); // Trigger refetch
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      setSubmissionStatus({
        ...submissionStatus,
        [assignmentId]: { error: true, message: `Erreur lors de la soumission: ${err.message}` },
      });
    }
  };

  const handleResubmit = useCallback(
    async (assignmentId) => {
      if (!file || file.assignmentId !== assignmentId) {
        setSubmissionStatus({
          ...submissionStatus,
          [assignmentId]: { error: true, message: 'Veuillez sélectionner un fichier pour resoumettre' },
        });
        return;
      }

      try {
        setSubmissionStatus({
          ...submissionStatus,
          [assignmentId]: { loading: true, message: 'Resoumission en cours...' },
        });

        const formData = new FormData();
        formData.append('file', file.file);
        formData.append('upload_preset', 'IEFPMinyarSirine');

        const response = await fetch('https://api.cloudinary.com/v1_1/demvebwif/raw/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Erreur lors de l'upload: ${response.statusText}`);
        }

        const uploadResult = await response.json();
        const downloadURL = uploadResult.secure_url;

        const submissionRef = ref(db, `Compte rendu/${assignmentId}/${studentData.uid}`);
        const existingSubmission = submissions[assignmentId] || {};
        const updatedSubmission = {
          ...existingSubmission,
          dateSoumission: new Date().toISOString(),
          fichier: downloadURL,
          etudiantId: studentData.uid,
          etudiantNom: `${studentData.prenom} ${studentData.nom}`,
          statut: 'soumis',
          // Clear correction fields on resubmission
          score: null,
          commentaires: null,
          correctedFile: null,
          dateCorrection: null,
        };

        await set(submissionRef, updatedSubmission);

        setSubmissions({
          ...submissions,
          [assignmentId]: updatedSubmission,
        });

        setSubmissionStatus({
          ...submissionStatus,
          [assignmentId]: { success: true, message: 'Compte rendu resoumis avec succès !' },
        });
        setFile(null);
        setEditingSubmission(null);
        setRefreshTrigger(prev => prev + 1); // Trigger refetch
      } catch (err) {
        console.error('Erreur lors de la resoumission:', err);
        setSubmissionStatus({
          ...submissionStatus,
          [assignmentId]: { error: true, message: `Erreur lors de la resoumission: ${err.message}` },
        });
      }
    },
    [file, submissions, submissionStatus, studentData]
  );

  const handleEditSubmission = (assignmentId) => {
    setEditingSubmission(assignmentId);
  };

  const handleDeleteSubmission = async (assignmentId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce compte rendu ?')) {
      try {
        setSubmissionStatus({
          ...submissionStatus,
          [assignmentId]: { loading: true, message: 'Suppression en cours...' },
        });

        const submissionRef = ref(db, `Compte rendu/${assignmentId}/${studentData.uid}`);
        await remove(submissionRef);

        const updatedSubmissions = { ...submissions };
        delete updatedSubmissions[assignmentId];
        setSubmissions(updatedSubmissions);

        setSubmissionStatus({
          ...submissionStatus,
          [assignmentId]: { success: true, message: 'Compte rendu supprimé avec succès !' },
        });
        setRefreshTrigger(prev => prev + 1); // Trigger refetch
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        setSubmissionStatus({
          ...submissionStatus,
          [assignmentId]: { error: true, message: `Erreur lors de la suppression: ${err.message}` },
        });
      }
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const isOverdue = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non spécifiée';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Container>
      <Title>Mes Devoirs à Rendre</Title>

      {loading && <LoadingMessage>Chargement des devoirs...</LoadingMessage>}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {!loading && !error && assignments.length === 0 && (
        <NoAssignments>
          <p>Vous n'avez aucun devoir à rendre pour le moment.</p>
        </NoAssignments>
      )}

      <RefreshButton onClick={handleRefresh}>Rafraîchir les soumissions</RefreshButton>

      <AssignmentList>
        {assignments.map((assignment) => {
          const submission = submissions[assignment.id];
          const isDeadlinePassed = isOverdue(assignment.date_limite);
          const canEditDelete = submission && !isDeadlinePassed;
          const isResubmissionRequested = submission?.statut === 'à resoumettre';
          const isCorrected = submission?.statut === 'corrigé';

          return (
            <AssignmentCard key={assignment.id}>
              <AssignmentHeader>
                <AssignmentTitle>{assignment.titre}</AssignmentTitle>
                <Deadline overdue={isDeadlinePassed}>
                  Date limite: {formatDate(assignment.date_limite)}
                  {isDeadlinePassed && ' (En retard)'}
                </Deadline>
              </AssignmentHeader>

              <AssignmentMeta>
                <span>Formation: {assignment.nomFormation || assignment.formationNom}</span>
                <span>Semestre: {assignment.semestre}</span>
                {assignment.formateurPrenom && assignment.formateurNom && (
                  <span>
                    Formateur: {assignment.formateurPrenom} {assignment.formateurNom}
                  </span>
                )}
              </AssignmentMeta>

              <AssignmentDescription>
                {assignment.description || 'Aucune description fournie.'}
              </AssignmentDescription>

              {assignment.file_url && (
                <FileLink href={assignment.file_url} target="_blank" rel="noopener noreferrer">
                  Télécharger le sujet
                </FileLink>
              )}

              {submission && (
                <SubmissionInfo>
                  <p>
                    <strong>Votre compte rendu :</strong>
                  </p>
                  <p>Soumis le: {formatDate(submission.dateSoumission)}</p>
                  <FileLink href={submission.fichier} target="_blank" rel="noopener noreferrer">
                    Voir le fichier soumis
                  </FileLink>

                  {(isCorrected || isResubmissionRequested) && (
                    <CorrectionInfo>
                      <p>
                        <strong>Statut :</strong>{' '}
                        {submission.statut.charAt(0).toUpperCase() + submission.statut.slice(1)}
                      </p>
                      <p>
                        <strong>Note :</strong>{' '}
                        {submission.score !== null && submission.score !== undefined
                          ? `${submission.score}/20`
                          : 'Non attribuée'}
                      </p>
                      <p>
                        <strong>Commentaires :</strong>{' '}
                        {submission.commentaires || 'Aucun commentaire'}
                      </p>
                      <p>
                        <strong>Fichier corrigé :</strong>{' '}
                        {submission.correctedFile ? (
                          <FileLink
                            href={submission.correctedFile}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Télécharger
                          </FileLink>
                        ) : (
                          'Aucun fichier corrigé'
                        )}
                      </p>
                      <p>
                        <strong>Date de correction :</strong>{' '}
                        {submission.dateCorrection
                          ? formatDate(submission.dateCorrection)
                          : 'Non spécifiée'}
                      </p>
                    </CorrectionInfo>
                  )}

                  {canEditDelete && !isResubmissionRequested && !isCorrected && (
                    <div>
                      <EditButton onClick={() => handleEditSubmission(assignment.id)}>
                        Modifier
                      </EditButton>
                      <DeleteButton onClick={() => handleDeleteSubmission(assignment.id)}>
                        Supprimer
                      </DeleteButton>
                    </div>
                  )}
                </SubmissionInfo>
              )}

              {isResubmissionRequested && !isDeadlinePassed && (
                <ResubmissionForm>
                  <FormTitle>Resoumettre votre compte rendu</FormTitle>
                  <FileInput
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileChange(e, assignment.id)}
                  />
                  <SubmitButton
                    onClick={() => handleResubmit(assignment.id)}
                    disabled={
                      !file ||
                      file.assignmentId !== assignment.id ||
                      submissionStatus[assignment.id]?.loading
                    }
                  >
                    {submissionStatus[assignment.id]?.loading ? 'Envoi en cours...' : 'Resoumettre'}
                  </SubmitButton>
                  {submissionStatus[assignment.id] && (
                    <StatusMessage error={submissionStatus[assignment.id].error}>
                      {submissionStatus[assignment.id].message}
                    </StatusMessage>
                  )}
                </ResubmissionForm>
              )}

              {(editingSubmission === assignment.id || !submission) && !isDeadlinePassed && !isResubmissionRequested && (
                <SubmissionForm>
                  <FormTitle>
                    {submission ? 'Modifier votre compte rendu' : 'Soumettre votre compte rendu'}
                  </FormTitle>
                  <FileInput
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileChange(e, assignment.id)}
                  />
                  <SubmitButton
                    onClick={() => handleSubmit(assignment.id)}
                    disabled={
                      !file ||
                      file.assignmentId !== assignment.id ||
                      submissionStatus[assignment.id]?.loading
                    }
                  >
                    {submissionStatus[assignment.id]?.loading
                      ? 'Envoi en cours...'
                      : submission
                      ? 'Mettre à jour'
                      : 'Envoyer'}
                  </SubmitButton>
                  {submissionStatus[assignment.id] && (
                    <StatusMessage error={submissionStatus[assignment.id].error}>
                      {submissionStatus[assignment.id].message}
                    </StatusMessage>
                  )}
                </SubmissionForm>
              )}

              {isDeadlinePassed && !submission && (
                <StatusMessage error>
                  La date limite est dépassée, vous ne pouvez plus soumettre de compte rendu.
                </StatusMessage>
              )}
            </AssignmentCard>
          );
        })}
      </AssignmentList>
    </Container>
  );
}

export default ReportSubmissionContent;
