import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

// Firebase imports
import {
  getAuth,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';

import {
  getDatabase,
  ref,
  get,
  update
} from 'firebase/database';

import { sha256 } from 'js-sha256';

// Styles
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border-left-color: #3498db;
  animation: spin 1s linear infinite;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: #7f8c8d;
  margin-top: 15px;
`;

const NotFoundContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
`;

const NotFoundText = styled.p`
  color: #e74c3c;
  font-size: 1.2rem;
`;

const ProfileContainer = styled.div`
  background: white;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  max-width: 800px;
  margin: 0 auto;
`;

const ProfileHeader = styled.div`
  margin-bottom: 30px;
  h2 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.8rem;
  }
`;

const ProfileSubtitle = styled.p`
  color: #7f8c8d;
  margin: 5px 0 0;
`;

const ProfileSection = styled.section`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.03);
  margin-bottom: 20px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  h3 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.3rem;
  }
`;

const ProfileInfo = styled.div`
  display: flex;
  gap: 30px;
  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const ProfileAvatar = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #3498db;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  flex-shrink: 0;
`;

const ProfileDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ProfileRow = styled.div`
  display: flex;
  gap: 30px;
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 15px;
  }
`;

const ProfileField = styled.div`
  flex: 1;
`;

const FieldLabel = styled.div`
  font-size: 0.85rem;
  color: #7f8c8d;
  margin-bottom: 5px;
`;

const FieldValue = styled.div`
  font-size: 1rem;
  color: #2c3e50;
`;

const DocumentLink = styled.a`
  color: #3498db;
  text-decoration: none;
  display: inline-block;
  margin-top: 5px;
  &:hover {
    text-decoration: underline;
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  background: ${props => props.status === 'active' ? '#2ecc71' : '#e74c3c'};
  color: white;
  font-size: 0.8rem;
  padding: 3px 10px;
  border-radius: 15px;
  text-transform: capitalize;
`;

const ProfileForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormRow = styled.div`
  display: flex;
  gap: 20px;
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 15px;
  }
`;

const FormGroup = styled.div`
  flex: ${props => props.fullWidth ? '1' : '1'};
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-size: 0.9rem;
  color: #34495e;
  margin-bottom: 5px;
`;

const Input = styled.input`
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border 0.2s;
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const PasswordInput = styled(Input).attrs({ type: 'password' })``;

const FileInput = styled(Input).attrs({ type: 'file' })`
  padding: 8px;
`;

const PasswordHint = styled.p`
  font-size: 0.8rem;
  color: #7f8c8d;
  margin: 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  font-weight: 600;
  transition: all 0.2s;
  background: ${props => props.primary ? '#3498db' : '#e0e0e0'};
  color: ${props => props.primary ? 'white' : '#333'};
  &:hover {
    background: ${props => props.primary ? '#2980b9' : '#d0d0d0'};
  }
  &:disabled {
    background: ${props => props.primary ? '#7cb9e8' : '#f0f0f0'};
    cursor: not-allowed;
  }
`;

const EditButton = styled(Button)`
  background: transparent;
  border: 1px solid #3498db;
  color: #3498db;
  padding: 6px 15px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 5px;
  &:hover {
    background: #3498db;
    color: white;
  }
`;

const ButtonIcon = styled.span`
  font-size: 1rem;
`;

const MessageBox = styled.div`
  background: ${props => props.type === 'success' ? '#d4edda' : '#f8d7da'};
  color: ${props => props.type === 'success' ? '#155724' : '#721c24'};
  padding: 10px 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  animation: fadeIn 0.3s;
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ProgressBar = styled.div`
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  margin-top: 8px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #3498db;
  width: ${props => props.width}%;
  transition: width 0.3s ease;
`;

const ProfileContentFormateur = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUpload, setCurrentUpload] = useState('');

  const [currentUserId, setCurrentUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [formateur, setFormateur] = useState({
    nom: '',
    prenom: '',
    email: '',
    numtel: '',
    adresse: '',
    age: '',
    biographie: '',
    diplome: '',
    cin: '',
    cinUrl: '',
    cvUrl: '',
    diplomeUrl: '',
    status: ''
  });

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    numtel: '',
    adresse: '',
    age: '',
    biographie: '',
    diplome: '',
    cin: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  const formateurLocalStorage = JSON.parse(localStorage.getItem('formateur'));

  useEffect(() => {
    if (formateurLocalStorage?.uid) {
      setCurrentUserId(formateurLocalStorage.uid);
      setUserEmail(formateurLocalStorage.email || '');
      fetchProfileData(formateurLocalStorage.uid);
    } else {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
        if (authUser) {
          setCurrentUserId(authUser.uid);
          setUserEmail(authUser.email || '');
          await fetchProfileData(authUser.uid);
        } else {
          setProfileMessage({ type: 'error', text: 'Vous devez être connecté' });
          setIsLoading(false);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const fetchProfileData = async (userId) => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const db = getDatabase();
      const userRef = ref(db, `utilisateurs/formateurs/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();

        const mergedData = {
          ...userData,
          nom: formateurLocalStorage?.nom || userData.nom || '',
          prenom: formateurLocalStorage?.prenom || userData.prenom || '',
          email: formateurLocalStorage?.email || userEmail || userData.email || '',
          numtel: formateurLocalStorage?.numtel || userData.numtel || '',
          adresse: formateurLocalStorage?.adresse || userData.adresse || '',
          age: formateurLocalStorage?.age || userData.age || '',
          biographie: formateurLocalStorage?.biographie || userData.biographie || '',
          diplome: formateurLocalStorage?.diplome || userData.diplome || '',
          cin: formateurLocalStorage?.cin || userData.cin || '',
          status: formateurLocalStorage?.status || userData.status || 'En attente',
          cinUrl: userData.cinUrl || '',
          cvUrl: userData.cvUrl || '',
          diplomeUrl: userData.diplomeUrl || '',
          createdAt: userData.createdAt || new Date().toISOString()
        };

        setFormateur(mergedData);
        setFormData({
          nom: mergedData.nom,
          prenom: mergedData.prenom,
          numtel: mergedData.numtel,
          adresse: mergedData.adresse,
          age: mergedData.age,
          biographie: mergedData.biographie,
          diplome: mergedData.diplome,
          cin: mergedData.cin
        });
      } else {
        if (formateurLocalStorage) {
          setFormateur(formateurLocalStorage);
          setFormData({
            nom: formateurLocalStorage.nom || '',
            prenom: formateurLocalStorage.prenom || '',
            numtel: formateurLocalStorage.numtel || '',
            adresse: formateurLocalStorage.adresse || '',
            age: formateurLocalStorage.age || '',
            biographie: formateurLocalStorage.biographie || '',
            diplome: formateurLocalStorage.diplome || '',
            cin: formateurLocalStorage.cin || ''
          });
        } else {
          setProfileMessage({ type: 'error', text: 'Profil non trouvé.' });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération:', error);
      setProfileMessage({ type: 'error', text: 'Erreur lors du chargement.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (file, fieldName) => {
    if (!file) return;
    
    setCurrentUpload(fieldName);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'IEFPMinyarSirine');

      const response = await axios.post(
        'https://api.cloudinary.com/v1_1/demvebwif/raw/upload',
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          },
        }
      );

      const fileUrl = response.data.secure_url;
      
      // Mettre à jour l'URL dans Firebase
      const db = getDatabase();
      const updates = {};
      updates[`utilisateurs/formateurs/${currentUserId}/${fieldName}Url`] = fileUrl;
      
      await update(ref(db), updates);
      
      // Mettre à jour le state local
      setFormateur(prev => ({
        ...prev,
        [`${fieldName}Url`]: fileUrl
      }));
      
      // Mettre à jour localStorage si nécessaire
      if (formateurLocalStorage) {
        const updatedFormateur = {
          ...formateurLocalStorage,
          [`${fieldName}Url`]: fileUrl
        };
        localStorage.setItem('formateur', JSON.stringify(updatedFormateur));
      }
      
      return fileUrl;
    } catch (error) {
      console.error(`Erreur lors de l'upload du ${fieldName}:`, error);
      setProfileMessage({ type: 'error', text: `Erreur lors de l'upload du fichier` });
      return null;
    } finally {
      setUploadProgress(0);
      setCurrentUpload('');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const db = getDatabase();
      const userRef = ref(db, `utilisateurs/formateurs/${currentUserId}`);

      await update(userRef, formData);

      const updatedFormateur = { ...formateur, ...formData };
      setFormateur(updatedFormateur);

      if (formateurLocalStorage) {
        localStorage.setItem('formateur', JSON.stringify(updatedFormateur));
      }

      setProfileMessage({ type: 'success', text: 'Profil mis à jour avec succès!' });
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      setProfileMessage({ type: 'error', text: 'Erreur lors de la mise à jour.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPasswordMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      setIsSubmitting(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Le mot de passe doit faire au moins 6 caractères.' });
      setIsSubmitting(false);
      return;
    }

    try {
      const db = getDatabase();
      const userRef = ref(db, `utilisateurs/formateurs/${currentUserId}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        throw new Error("Utilisateur non trouvé");
      }

      const userData = snapshot.val();
      const hashedCurrentPassword = sha256(passwordData.currentPassword);

      if (userData.motDePasse !== hashedCurrentPassword) {
        setPasswordMessage({ type: 'error', text: 'Mot de passe actuel incorrect.' });
        setIsSubmitting(false);
        return;
      }

      const hashedNewPassword = sha256(passwordData.newPassword);
      await update(userRef, { motDePasse: hashedNewPassword });

      const auth = getAuth();
      const firebaseUser = auth.currentUser;

      if (firebaseUser && firebaseUser.email === formateur.email) {
        const credential = EmailAuthProvider.credential(firebaseUser.email, passwordData.currentPassword);
        await reauthenticateWithCredential(firebaseUser, credential);
        await updatePassword(firebaseUser, passwordData.newPassword);
      }

      if (formateurLocalStorage) {
        const updatedFormateur = { ...formateurLocalStorage, motDePasse: hashedNewPassword };
        localStorage.setItem('formateur', JSON.stringify(updatedFormateur));
      }

      setPasswordMessage({ type: 'success', text: 'Mot de passe modifié avec succès !' });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Erreur lors de la modification du mot de passe:', error);
      setPasswordMessage({ type: 'error', text: 'Erreur lors de la modification du mot de passe.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <LoadingText>Chargement de votre profil...</LoadingText>
      </LoadingContainer>
    );
  }

  if (!currentUserId && !formateurLocalStorage) {
    return (
      <NotFoundContainer>
        <NotFoundText>Vous devez être connecté pour accéder à cette page</NotFoundText>
      </NotFoundContainer>
    );
  }

  return (
    <ProfileContainer>
      <ProfileHeader>
        <h2>Mon Profil Formateur</h2>
        <ProfileSubtitle>Gérez vos informations personnelles et documents</ProfileSubtitle>
      </ProfileHeader>

      {/* Informations Personnelles */}
      <ProfileSection>
        <SectionHeader>
          <h3>Informations Personnelles</h3>
          {!isEditing && (
            <EditButton onClick={() => setIsEditing(true)}>
              <ButtonIcon>✏️</ButtonIcon> Modifier
            </EditButton>
          )}
        </SectionHeader>

        {profileMessage.text && (
          <MessageBox type={profileMessage.type}>
            {profileMessage.type === 'success' ? '✅ ' : '❌ '}
            {profileMessage.text}
          </MessageBox>
        )}

        {isEditing ? (
          <ProfileForm onSubmit={handleProfileSubmit}>
            <FormRow>
              <FormGroup>
                <Label>Nom</Label>
                <Input
                  name="nom"
                  value={formData.nom}
                  onChange={handleProfileChange}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Prénom</Label>
                <Input
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleProfileChange}
                  required
                />
              </FormGroup>
            </FormRow>
            <FormRow>
              <FormGroup>
                <Label>Email</Label>
                <Input
                  name="email"
                  value={formateur.email}
                  disabled
                />
              </FormGroup>
              <FormGroup>
                <Label>Téléphone</Label>
                <Input
                  name="numtel"
                  value={formData.numtel}
                  onChange={handleProfileChange}
                />
              </FormGroup>
            </FormRow>
            <FormRow>
              <FormGroup>
                <Label>Âge</Label>
                <Input
                  name="age"
                  value={formData.age}
                  onChange={handleProfileChange}
                  min="18"
                  max="99"
                />
              </FormGroup>
              <FormGroup>
                <Label>CIN</Label>
                <Input
                  name="cin"
                  value={formData.cin}
                  onChange={handleProfileChange}
                />
              </FormGroup>
            </FormRow>
            <FormGroup fullWidth>
              <Label>Biographie</Label>
              <Input as="textarea" rows="4" name="biographie" value={formData.biographie} onChange={handleProfileChange} />
            </FormGroup>
            <FormGroup fullWidth>
              <Label>Diplôme</Label>
              <Input name="diplome" value={formData.diplome} onChange={handleProfileChange} />
            </FormGroup>

            {/* Section Documents */}
            <FormGroup fullWidth>
              <Label>CIN (Fichier)</Label>
              <FileInput
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e.target.files[0], 'cin')}
              />
              {currentUpload === 'cin' && uploadProgress > 0 && (
                <ProgressBar>
                  <ProgressFill width={uploadProgress} />
                </ProgressBar>
              )}
              {formateur.cinUrl && (
                <DocumentLink href={formateur.cinUrl} target="_blank" rel="noopener noreferrer">
                  Voir le document actuel
                </DocumentLink>
              )}
            </FormGroup>

            <FormGroup fullWidth>
              <Label>CV (Fichier)</Label>
              <FileInput
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e.target.files[0], 'cv')}
              />
              {currentUpload === 'cv' && uploadProgress > 0 && (
                <ProgressBar>
                  <ProgressFill width={uploadProgress} />
                </ProgressBar>
              )}
              {formateur.cvUrl && (
                <DocumentLink href={formateur.cvUrl} target="_blank" rel="noopener noreferrer">
                  Voir le document actuel
                </DocumentLink>
              )}
            </FormGroup>

            <FormGroup fullWidth>
              <Label>Diplôme (Fichier)</Label>
              <FileInput
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e.target.files[0], 'diplome')}
              />
              {currentUpload === 'diplome' && uploadProgress > 0 && (
                <ProgressBar>
                  <ProgressFill width={uploadProgress} />
                </ProgressBar>
              )}
              {formateur.diplomeUrl && (
                <DocumentLink href={formateur.diplomeUrl} target="_blank" rel="noopener noreferrer">
                  Voir le document actuel
                </DocumentLink>
              )}
            </FormGroup>

            <ButtonGroup>
              <Button primary type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button type="button" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
                Annuler
              </Button>
            </ButtonGroup>
          </ProfileForm>
        ) : (
          <ProfileInfo>
            <ProfileAvatar>{formateur.prenom?.charAt(0)}{formateur.nom?.charAt(0)}</ProfileAvatar>
            <ProfileDetails>
              <ProfileRow>
                <ProfileField>
                  <FieldLabel>Nom complet</FieldLabel>
                  <FieldValue>{formateur.prenom} {formateur.nom}</FieldValue>
                </ProfileField>
                <ProfileField>
                  <FieldLabel>Email</FieldLabel>
                  <FieldValue>{formateur.email}</FieldValue>
                </ProfileField>
              </ProfileRow>
              <ProfileRow>
                <ProfileField>
                  <FieldLabel>Téléphone</FieldLabel>
                  <FieldValue>{formateur.numtel || '—'}</FieldValue>
                </ProfileField>
                <ProfileField>
                  <FieldLabel>Âge</FieldLabel>
                  <FieldValue>{formateur.age || '—'}</FieldValue>
                </ProfileField>
              </ProfileRow>
              <ProfileRow>
                <ProfileField>
                  <FieldLabel>Diplôme</FieldLabel>
                  <FieldValue>{formateur.diplome || '—'}</FieldValue>
                </ProfileField>
                <ProfileField>
                  <FieldLabel>CIN</FieldLabel>
                  <FieldValue>{formateur.cin || '—'}</FieldValue>
                </ProfileField>
              </ProfileRow>
              <ProfileRow>
                <ProfileField>
                  <FieldLabel>Statut</FieldLabel>
                  <FieldValue>
                    <StatusBadge status={formateur.status === 'active' ? 'active' : 'inactive'}>
                      {formateur.status || 'En attente'}
                    </StatusBadge>
                  </FieldValue>
                </ProfileField>
              </ProfileRow>
              <ProfileRow>
                <ProfileField>
                  <FieldLabel>Biographie</FieldLabel>
                  <FieldValue>{formateur.biographie || '—'}</FieldValue>
                </ProfileField>
              </ProfileRow>
              <ProfileRow>
                <ProfileField>
                  <FieldLabel>CIN (Document)</FieldLabel>
                  <FieldValue>
                    {formateur.cinUrl ? (
                      <DocumentLink href={formateur.cinUrl} target="_blank" rel="noopener noreferrer">
                        Voir le document
                      </DocumentLink>
                    ) : (
                      'Non fourni'
                    )}
                  </FieldValue>
                </ProfileField>
                <ProfileField>
                  <FieldLabel>CV</FieldLabel>
                  <FieldValue>
                    {formateur.cvUrl ? (
                      <DocumentLink href={formateur.cvUrl} target="_blank" rel="noopener noreferrer">
                        Voir le document
                      </DocumentLink>
                    ) : (
                      'Non fourni'
                    )}
                  </FieldValue>
                </ProfileField>
              </ProfileRow>
              <ProfileRow>
                <ProfileField>
                  <FieldLabel>Diplôme (Document)</FieldLabel>
                  <FieldValue>
                    {formateur.diplomeUrl ? (
                      <DocumentLink href={formateur.diplomeUrl} target="_blank" rel="noopener noreferrer">
                        Voir le document
                      </DocumentLink>
                    ) : (
                      'Non fourni'
                    )}
                  </FieldValue>
                </ProfileField>
              </ProfileRow>
            </ProfileDetails>
          </ProfileInfo>
        )}
      </ProfileSection>

      {/* Sécurité - Mot de Passe */}
      <ProfileSection>
        <SectionHeader>
          <h3>Sécurité</h3>
        </SectionHeader>

        {passwordMessage.text && (
          <MessageBox type={passwordMessage.type}>
            {passwordMessage.type === 'success' ? '✅ ' : '❌ '}
            {passwordMessage.text}
          </MessageBox>
        )}

        <ProfileForm onSubmit={handlePasswordSubmit}>
          <FormGroup>
            <Label>Mot de passe actuel</Label>
            <PasswordInput
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
            />
          </FormGroup>
          <FormRow>
            <FormGroup>
              <Label>Nouveau mot de passe</Label>
              <PasswordInput
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Confirmer le mot de passe</Label>
              <PasswordInput
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
              />
            </FormGroup>
          </FormRow>
          <FormGroup>
            <PasswordHint>
              Le mot de passe doit contenir au moins 6 caractères.
            </PasswordHint>
          </FormGroup>
          <Button primary type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Modification...' : 'Modifier le mot de passe'}
          </Button>
        </ProfileForm>
      </ProfileSection>
    </ProfileContainer>
  );
};

export default ProfileContentFormateur;