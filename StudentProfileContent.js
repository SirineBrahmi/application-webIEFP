import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getDatabase, ref, get, update } from 'firebase/database';
import { getAuth, onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { sha256 } from 'js-sha256'; // Importation de sha256

const StudentProfileContent = () => {
  // États pour les données du profil
  const [profileData, setProfileData] = useState({
    nom: '',
    prenom: '',
    email: '',
    numTel: '',
    age: '',
    niveau: '',
    status: '',
    role: ''
  });

  // États pour le formulaire d'édition
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    numTel: '',
    age: '',
    niveau: ''
  });

  // États pour le changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // États pour les messages et le chargement
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  // Récupérer l'utilisateur depuis localStorage (comme dans StudentDashboard)
  const user = JSON.parse(localStorage.getItem('etudiant'));

  // Utiliser les données de l'utilisateur du localStorage
  useEffect(() => {
    if (user?.uid) {
      setCurrentUserId(user.uid);
      setUserEmail(user.email || '');
      fetchProfileData(user.uid);
    } else {
      // Utiliser Firebase Auth comme fallback si localStorage n'a pas les données
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, (authUser) => {
        if (authUser) {
          setCurrentUserId(authUser.uid);
          setUserEmail(authUser.email || '');
          fetchProfileData(authUser.uid);
        } else {
          setProfileMessage({ type: 'error', text: 'Aucun utilisateur connecté' });
          setIsLoading(false);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // Récupérer les données du profil
  const fetchProfileData = async (userId) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const db = getDatabase();
      const userRef = ref(db, `utilisateurs/etudiants/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Utiliser les données du localStorage si disponibles, sinon utiliser celles de la base de données
        const mergedData = {
          ...userData,
          nom: user?.nom || userData.nom || '',
          prenom: user?.prenom || userData.prenom || '',
          email: user?.email || userEmail || userData.email || '',
          numTel: user?.numTel || userData.numTel || '',
          age: user?.age || userData.age || '',
          niveau: user?.niveau || userData.niveau || '',
          status: user?.status || userData.status || 'active',
          role: user?.role || userData.role || 'etudiant'
        };
        
        setProfileData(mergedData);
        setFormData({
          nom: mergedData.nom,
          prenom: mergedData.prenom,
          numTel: mergedData.numTel,
          age: mergedData.age,
          niveau: mergedData.niveau
        });
      } else {
        // Si l'utilisateur existe dans localStorage mais pas dans la base de données
        if (user) {
          setProfileData({
            nom: user.nom || '',
            prenom: user.prenom || '',
            email: user.email || '',
            numTel: user.numTel || '',
            age: user.age || '',
            niveau: user.niveau || '',
            status: user.status || 'active',
            role: user.role || 'etudiant'
          });
          
          setFormData({
            nom: user.nom || '',
            prenom: user.prenom || '',
            numTel: user.numTel || '',
            age: user.age || '',
            niveau: user.niveau || ''
          });
        } else {
          setProfileMessage({ type: 'error', text: 'Profil étudiant non trouvé.' });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setProfileMessage({ type: 'error', text: 'Erreur lors de la récupération des données.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Gestion des changements de formulaire
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  // Soumission du formulaire de profil
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const db = getDatabase();
      const userRef = ref(db, `utilisateurs/etudiants/${currentUserId}`);

      // Préparer les données mises à jour
      const updatedData = {
        nom: formData.nom,
        prenom: formData.prenom,
        numTel: formData.numTel,
        age: formData.age,
        niveau: formData.niveau
      };

      // Mettre à jour dans la base de données
      await update(userRef, updatedData);

      // Mettre à jour l'état local
      setProfileData(prev => ({
        ...prev,
        ...updatedData
      }));

      // Mettre à jour localStorage pour synchroniser les changements
      if (user) {
        const updatedUser = {
          ...user,
          ...updatedData
        };
        localStorage.setItem('etudiant', JSON.stringify(updatedUser));
      }

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
    setPasswordMessage({ type: '', text: '' });

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
      const auth = getAuth();
      const user = auth.currentUser;
      const db = getDatabase();
      const userRef = ref(db, `utilisateurs/etudiants/${currentUserId}`);

      // Vérification du mot de passe actuel dans la base de données
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Hash le mot de passe saisi pour comparer avec celui stocké dans la base
        const hashedCurrentPassword = sha256(passwordData.currentPassword);
        
        if (userData.motDePasse !== hashedCurrentPassword) {
          setPasswordMessage({ type: 'error', text: 'Le mot de passe actuel est incorrect.' });
          setIsSubmitting(false);
          return;
        }

        // Hash le nouveau mot de passe pour l'enregistrer dans la base
        const hashedNewPassword = sha256(passwordData.newPassword);
        
        // Mise à jour du mot de passe dans la base de données
        await update(userRef, { motDePasse: hashedNewPassword });

        // Mise à jour du mot de passe dans Firebase Auth
        if (user) {
          try {
            const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passwordData.newPassword);
          } catch (authError) {
            console.warn('Mise à jour Firebase Auth échouée:', authError);
          }
        }

        // Mise à jour du localStorage si nécessaire
        const storedUser = JSON.parse(localStorage.getItem('etudiant'));
        if (storedUser) {
          storedUser.motDePasse = hashedNewPassword;
          localStorage.setItem('etudiant', JSON.stringify(storedUser));
        }

        setPasswordMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès!' });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du mot de passe:', error);
      setPasswordMessage({ type: 'error', text: 'Erreur lors de la mise à jour du mot de passe.' });
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

  if (!currentUserId && !user) {
    return (
      <NotFoundContainer>
        <NotFoundText>Vous devez être connecté pour accéder à cette page</NotFoundText>
      </NotFoundContainer>
    );
  }

  return (
    <ProfileContainer>
      <ProfileHeader>
        <h2>Mon Profil Étudiant</h2>
        <ProfileSubtitle>Gérez vos informations personnelles et votre sécurité</ProfileSubtitle>
      </ProfileHeader>

      <ProfileSections>
        {/* Section Informations Personnelles */}
        <ProfileSection>
          <SectionHeader>
            <h3>Informations Personnelles</h3>
            {!isEditing ? (
              <EditButton onClick={() => setIsEditing(true)}>
                <ButtonIcon>✏️</ButtonIcon>
                Modifier
              </EditButton>
            ) : null}
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
                    min="16"
                    max="99"
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="numTel">Téléphone</Label>
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
                <Label htmlFor="niveau">Niveau d'études</Label>
                <Select
                  id="niveau"
                  name="niveau"
                  value={formData.niveau}
                  onChange={handleProfileChange}
                >
                  <option value="">Sélectionner un niveau</option>
                  <option value="Bac">Bac</option>
                  <option value="Bac+1">Bac+1</option>
                  <option value="Bac+2">Bac+2</option>
                  <option value="Bac+3">Bac+3</option>
                  <option value="Bac+4">Bac+4</option>
                  <option value="Bac+5">Bac+5</option>
                </Select>
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
                    <FieldLabel>Niveau d'études</FieldLabel>
                    <FieldValue>{profileData.niveau || '—'}</FieldValue>
                  </ProfileField>
                  <ProfileField>
                    <FieldLabel>Statut</FieldLabel>
                    <StatusBadge status={profileData.status || 'active'}>
                      {profileData.status === 'active' ? 'Actif' : 'Inactif'}
                    </StatusBadge>
                  </ProfileField>
                </ProfileRow>
              </ProfileDetails>
            </ProfileInfo>
          )}
        </ProfileSection>

        {/* Section Sécurité */}
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

const Select = styled.select`
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

export default StudentProfileContent;