import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getDatabase, ref, get, update } from 'firebase/database';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

const ProfileContent = () => {
  // État pour stocker les données de profil
  const [profileData, setProfileData] = useState({
    nom: '',
    prenom: '',
    email: '',
    numTel: '',
    age: '',
    adresse: '',
    role: '',
    id: ''
  });

  // État pour le formulaire de modification du profil
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    numTel: '',
    age: '',
    adresse: ''
  });

  // État pour le formulaire de modification du mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // États pour les messages de feedback
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // État pour le mode d'édition et chargement
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Récupération des données depuis Firebase
  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const db = getDatabase();
        // Correction: Chemin correct pour accéder directement à l'admin
        const userRef = ref(db, 'utilisateurs/admin');
        
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          console.log("Données récupérées:", userData); // Pour débogage
          
          setProfileData(userData);
          setFormData({
            nom: userData.nom || '',
            prenom: userData.prenom || '',
            numTel: userData.numTel || '',
            age: userData.age || '',
            adresse: userData.adresse || ''
          });
          setProfileMessage({ type: '', text: '' });
        } else {
          console.log("Aucune donnée trouvée pour l'administrateur");
          setProfileMessage({ type: 'error', text: 'Profil non trouvé.' });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setProfileMessage({ type: 'error', text: 'Erreur lors de la récupération des données.' });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfileData();
  }, []);

  // Gestion des changements dans le formulaire de profil
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Gestion des changements dans le formulaire de mot de passe
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Soumission du formulaire de profil
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setProfileMessage({ type: '', text: '' }); // Effacer les messages précédents
    
    try {
      const db = getDatabase();
      // Correction: Chemin correct pour accéder directement à l'admin
      const userRef = ref(db, 'utilisateurs/admin');
      
      // Mise à jour des données dans Firebase
      await update(userRef, {
        nom: formData.nom,
        prenom: formData.prenom,
        numTel: formData.numTel,
        age: formData.age,
        adresse: formData.adresse
      });
      
      // Mise à jour du state local
      setProfileData(prev => ({
        ...prev,
        ...formData
      }));
      
      setProfileMessage({ type: 'success', text: 'Profil mis à jour avec succès!' });
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      setProfileMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Soumission du formulaire de mot de passe
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPasswordMessage({ type: '', text: '' }); // Effacer les messages précédents
    
    // Validation des mots de passe
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      setIsSubmitting(false);
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' });
      setIsSubmitting(false);
      return;
    }
    
    try {
      const db = getDatabase();
      // Correction: Chemin correct pour accéder directement à l'admin
      const userRef = ref(db, 'utilisateurs/admin');
      
      // Vérifier d'abord si le mot de passe actuel correspond à celui dans la base
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Vérifier si le mot de passe actuel correspond à celui stocké dans la base
        if (userData.motDePasse !== passwordData.currentPassword) {
          setPasswordMessage({ type: 'error', text: 'Le mot de passe actuel est incorrect.' });
          setIsSubmitting(false);
          return;
        }
        
        // Le mot de passe correspond, on peut le mettre à jour
        await update(userRef, { motDePasse: passwordData.newPassword });
        
        // Tenter également de mettre à jour Firebase Auth (si possible)
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          try {
            const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passwordData.newPassword);
          } catch (firebaseAuthError) {
            console.warn('Impossible de mettre à jour Firebase Auth, mais la base a été mise à jour:', firebaseAuthError);
            // On ne génère pas d'erreur ici car la base a été mise à jour
          }
        }
        
        setPasswordMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès!' });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordMessage({ type: 'error', text: 'Impossible de trouver vos informations utilisateur.' });
      }
    } catch (error) {
      console.error('Erreur générale:', error);
      setPasswordMessage({ type: 'error', text: 'Une erreur s\'est produite lors de la modification du mot de passe.' });
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

  return (
    <ProfileContainer>
      <ProfileHeader>
        <h2>Mon Profil</h2>
        <ProfileSubtitle>Gérez vos informations personnelles et votre sécurité</ProfileSubtitle>
      </ProfileHeader>

      <ProfileSections>
        {/* Section des informations personnelles */}
        <ProfileSection>
          <SectionHeader>
            <h3>Informations Personnelles</h3>
            {!isEditing && (
              <EditButton onClick={() => setIsEditing(true)}>
                <ButtonIcon>✏️</ButtonIcon>
                Modifier
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
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    type="text"
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleProfileChange}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    type="text"
                    id="prenom"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleProfileChange}
                    required
                  />
                </FormGroup>
              </FormRow>

              <FormRow>
                <FormGroup>
                  <Label htmlFor="age">Âge</Label>
                  <Input
                    type="number"
                    id="age"
                    name="age"
                    value={formData.age}
                    onChange={handleProfileChange}
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="numTel">Numéro de téléphone</Label>
                  <Input
                    type="text"
                    id="numTel"
                    name="numTel"
                    value={formData.numTel}
                    onChange={handleProfileChange}
                  />
                </FormGroup>
              </FormRow>

              <FormGroup fullWidth>
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  type="text"
                  id="adresse"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleProfileChange}
                />
              </FormGroup>

              <ButtonGroup>
                <Button type="submit" primary disabled={isSubmitting}>
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button type="button" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
                  Annuler
                </Button>
              </ButtonGroup>
            </ProfileForm>
          ) : (
            <ProfileInfo>
              <ProfileAvatar>
                {profileData.prenom?.charAt(0)}{profileData.nom?.charAt(0)}
              </ProfileAvatar>
              <ProfileDetails>
                <ProfileRow>
                  <ProfileField>
                    <FieldLabel>Nom complet</FieldLabel>
                    <FieldValue>{profileData.prenom} {profileData.nom}</FieldValue>
                  </ProfileField>
                  <ProfileField>
                    <FieldLabel>Email</FieldLabel>
                    <FieldValue>{profileData.email}</FieldValue>
                  </ProfileField>
                </ProfileRow>
                <ProfileRow>
                  <ProfileField>
                    <FieldLabel>Téléphone</FieldLabel>
                    <FieldValue>{profileData.numTel || '—'}</FieldValue>
                  </ProfileField>
                  <ProfileField>
                    <FieldLabel>Âge</FieldLabel>
                    <FieldValue>{profileData.age || '—'}</FieldValue>
                  </ProfileField>
                </ProfileRow>
                <ProfileRow>
                  <ProfileField>
                    <FieldLabel>Adresse</FieldLabel>
                    <FieldValue>{profileData.adresse || '—'}</FieldValue>
                  </ProfileField>
                  <ProfileField>
                    <FieldLabel>Rôle</FieldLabel>
                    <RoleBadge>{profileData.role}</RoleBadge>
                  </ProfileField>
                </ProfileRow>
              </ProfileDetails>
            </ProfileInfo>
          )}
        </ProfileSection>

        {/* Section du mot de passe */}
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
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <PasswordInput
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
              />
            </FormGroup>

            <FormRow>
              <FormGroup>
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <PasswordInput
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <PasswordInput
                  type="password"
                  id="confirmPassword"
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

            <Button type="submit" primary disabled={isSubmitting}>
              {isSubmitting ? 'Modification...' : 'Modifier le mot de passe'}
            </Button>
          </ProfileForm>
        </ProfileSection>
      </ProfileSections>
    </ProfileContainer>
  );
};

// Styles
const ProfileContainer = styled.div`
  background: white;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
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

const ProfileSections = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
`;

const ProfileSection = styled.section`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.03);
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
  
  @media (max-width: 768px) {
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

const RoleBadge = styled.span`
  display: inline-block;
  background: #2ecc71;
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
  
  @media (max-width: 768px) {
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

const PasswordInput = styled(Input)`
  padding-right: 40px;
  position: relative;
`;

const PasswordHint = styled.p`
  font-size: 0.8rem;
  color: #7f8c8d;
  margin: 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
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

const EditButton = styled.button`
  background: transparent;
  border: 1px solid #3498db;
  color: #3498db;
  border-radius: 6px;
  padding: 6px 15px;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
  
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

export default ProfileContent;