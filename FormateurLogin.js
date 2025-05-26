import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref, get, query, orderByChild, equalTo, update } from 'firebase/database';
import { getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { sha256 } from 'js-sha256';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './LoginPage.css';

const LoginPage = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [newPasswordMode, setNewPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempUser, setTempUser] = useState(null);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [footerData, setFooterData] = useState(null);
  const navigate = useNavigate();
  
  const einsteinQuotes = [
    { quote: "L'imagination est plus importante que le savoir.", author: "Albert Einstein" },
    { quote: "La vie, c'est comme une bicyclette, il faut avancer pour ne pas perdre l'équilibre.", author: "Albert Einstein" },
    { quote: "La logique vous conduira d'un point A à un point B. L'imagination vous conduira partout.", author: "Albert Einstein" },
    { quote: "La folie, c'est de faire toujours la même chose et de s'attendre à un résultat différent.", author: "Albert Einstein" },
    { quote: "Tout le monde est un génie. Mais si vous jugez un poisson sur sa capacité à grimper à un arbre, il passera sa vie à croire qu'il est stupide.", author: "Albert Einstein" }
  ];

  useEffect(() => {
    let interval;
    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentQuote((prev) => (prev + 1) % einsteinQuotes.length);
      }, 7000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, einsteinQuotes.length]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const email = user.email;
        const userType = await determineUserType(email);
        if (userType) {
          setTempUser({ email, userType });
          setNewPasswordMode(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Effet pour récupérer les données du footer
  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        const footerRef = ref(getDatabase(), 'footerSettings');
        const snapshot = await get(footerRef);
        
        if (snapshot.exists()) {
          setFooterData(snapshot.val());
        }
      } catch (error) {
        console.error("Error fetching footer data:", error);
      }
    };

    fetchFooterData();
  }, []);

  const determineUserType = async (email) => {
    const db = getDatabase();
    const adminRef = ref(db, 'utilisateurs/admin');
    const adminSnap = await get(adminRef);
    if (adminSnap.exists() && adminSnap.val().email === email) return 'admin';

    const formateursRef = query(ref(db, 'utilisateurs/formateurs'), orderByChild('email'), equalTo(email));
    const formateursSnap = await get(formateursRef);
    if (formateursSnap.exists()) return 'formateur';

    const etudiantsRef = query(ref(db, 'utilisateurs/etudiants'), orderByChild('email'), equalTo(email));
    const etudiantsSnap = await get(etudiantsRef);
    if (etudiantsSnap.exists()) return 'etudiant';

    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleNewPasswordChange = (e) => {
    const { name, value } = e.target;
    if (name === 'newPassword') setNewPassword(value);
    if (name === 'confirmPassword') setConfirmPassword(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!navigator.onLine) {
      setError('Pas de connexion Internet détectée');
      setIsLoading(false);
      return;
    }

    if (resetPasswordMode) {
      await handleResetPassword();
      return;
    }

    if (!credentials.email || !credentials.password) {
      setError('Veuillez remplir tous les champs');
      setIsLoading(false);
      return;
    }

    try {
      const email = credentials.email.trim().toLowerCase();
      const userType = await determineUserType(email);
      
      if (!userType) throw new Error('Email ou mot de passe incorrect');
      
      if (userType === 'admin') {
        const admin = await verifyAdmin(email, credentials.password);
        if (admin) {
          localStorage.setItem('admin', JSON.stringify({ uid: admin.uid, email: admin.email }));
          navigate('/admin/dashboard');
        } else throw new Error('Email ou mot de passe incorrect');
      } else if (userType === 'formateur') {
        const formateur = await verifyFormateur(email, credentials.password);
        if (!formateur) throw new Error('Email ou mot de passe incorrect');
        if (formateur.status !== 'active') throw new Error('Votre compte n\'est pas encore activé');

        localStorage.setItem('formateur', JSON.stringify({
          uid: formateur.uid,
          email: formateur.email,
          nom: formateur.nom,
          prenom: formateur.prenom,
          status: formateur.status
        }));
        navigate('/formateur/dashboard');
      } else if (userType === 'etudiant') {
        const etudiant = await verifyEtudiant(email, credentials.password);
        if (!etudiant) throw new Error('Email ou mot de passe incorrect');
        if (etudiant.status !== 'active') throw new Error('Votre compte n\'est pas encore activé');

        localStorage.setItem('etudiant', JSON.stringify({
          uid: etudiant.uid,
          email: etudiant.email,
          nom: etudiant.nom,
          prenom: etudiant.prenom,
          niveau: etudiant.niveau,
          status: etudiant.status
        }));
        navigate('/etudiant/dashboard');
      }
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError(err.message || 'Erreur lors de la connexion');
      localStorage.removeItem('formateur');
      localStorage.removeItem('admin');
      localStorage.removeItem('etudiant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPasswordSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { email, userType } = tempUser;
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, newPassword);
      const user = userCredential.user;

      const db = getDatabase();
      let userPath = '';
      let updateData = {};
      let userId = null;
      let snapshot = null;

      if (userType === 'admin') {
        userPath = 'utilisateurs/admin';
        updateData = { motDePasse: newPassword, resetPasswordNeeded: false };
      } else {
        const usersRef = ref(db, `utilisateurs/${userType === 'formateur' ? 'formateurs' : 'etudiants'}`);
        const userQuery = query(usersRef, orderByChild('email'), equalTo(email));
        snapshot = await get(userQuery);

        if (!snapshot.exists()) throw new Error('Utilisateur non trouvé dans la base de données');
        const users = snapshot.val();
        userId = Object.keys(users)[0];
        userPath = `utilisateurs/${userType === 'formateur' ? 'formateurs' : 'etudiants'}/${userId}`;
        updateData = { motDePasse: sha256(newPassword), resetPasswordNeeded: false };
      }

      await update(ref(db, userPath), updateData);
      setSuccess('Mot de passe mis à jour avec succès ! Redirection...');
      
      setTimeout(() => {
        if (userType === 'admin') {
          localStorage.setItem('admin', JSON.stringify({ uid: 'admin', email }));
          navigate('/admin/dashboard');
        } else if (userType === 'formateur') {
          const userData = snapshot.val()[userId];
          localStorage.setItem('formateur', JSON.stringify({
            uid: userId,
            email,
            nom: userData.nom,
            prenom: userData.prenom,
            status: userData.status
          }));
          navigate('/formateur/dashboard');
        } else if (userType === 'etudiant') {
          const userData = snapshot.val()[userId];
          localStorage.setItem('etudiant', JSON.stringify({
            uid: userId,
            email,
            nom: userData.nom,
            prenom: userData.prenom,
            niveau: userData.niveau,
            status: userData.status
          }));
          navigate('/etudiant/dashboard');
        }
      }, 2000);
    } catch (error) {
      console.error('Erreur mise à jour mot de passe:', error);
      setError(error.message || 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setSuccess('');
    if (!credentials.email) {
      setError('Veuillez saisir votre adresse email');
      setIsLoading(false);
      return;
    }

    try {
      const email = credentials.email.trim().toLowerCase();
      const userType = await determineUserType(email);
      if (!userType) throw new Error('Aucun compte associé à cette adresse email');

      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      
      if (userType === 'admin') {
        await update(ref(getDatabase(), 'utilisateurs/admin'), { resetPasswordNeeded: true });
      } else {
        const usersRef = ref(getDatabase(), `utilisateurs/${userType === 'formateur' ? 'formateurs' : 'etudiants'}`);
        const emailQuery = query(usersRef, orderByChild('email'), equalTo(email));
        const snapshot = await get(emailQuery);
        
        if (snapshot.exists()) {
          const users = snapshot.val();
          const userId = Object.keys(users)[0];
          const userPath = `utilisateurs/${userType === 'formateur' ? 'formateurs' : 'etudiants'}/${userId}`;
          await update(ref(getDatabase(), userPath), { resetPasswordNeeded: true });
        }
      }
      
      setSuccess('Un email de réinitialisation vous a été envoyé. Veuillez vérifier votre boîte de réception.');
      setTimeout(() => setResetPasswordMode(false), 5000);
    } catch (err) {
      console.error('Erreur lors de la réinitialisation du mot de passe:', err);
      setError(err.message || 'Erreur lors de l\'envoi de l\'email de réinitialisation');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleResetPasswordMode = () => {
    setResetPasswordMode(!resetPasswordMode);
    setError('');
    setSuccess('');
  };

  const verifyAdmin = async (email, password) => {
    try {
      const adminRef = ref(getDatabase(), 'utilisateurs/admin');
      const snapshot = await get(adminRef);
      if (snapshot.exists()) {
        const admin = snapshot.val();
        if (admin.email && admin.email.toLowerCase() === email.toLowerCase() && admin.motDePasse === password) {
          return { uid: 'admin', email: admin.email };
        }
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la vérification admin:', error);
      return null;
    }
  };

  const verifyFormateur = async (email, password) => {
    try {
      const inputHash = sha256(password);
      const formateursRef = ref(getDatabase(), 'utilisateurs/formateurs');
      const emailQuery = query(formateursRef, orderByChild('email'), equalTo(email.toLowerCase()));
      const snapshot = await get(emailQuery);
      
      if (!snapshot.exists()) return null;
      const formateurs = snapshot.val();
      
      for (const uid in formateurs) {
        const formateur = formateurs[uid];
        if (formateur.motDePasse === inputHash) {
          return { uid, ...formateur, motDePasse: undefined };
        }
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la vérification formateur:', error);
      throw error;
    }
  };

  const verifyEtudiant = async (email, password) => {
    try {
      const inputHash = sha256(password);
      const etudiantsRef = ref(getDatabase(), 'utilisateurs/etudiants');
      const emailQuery = query(etudiantsRef, orderByChild('email'), equalTo(email.toLowerCase()));
      const snapshot = await get(emailQuery);
      
      if (!snapshot.exists()) return null;
      const etudiants = snapshot.val();
      
      for (const uid in etudiants) {
        const etudiant = etudiants[uid];
        if (etudiant.motDePasse === inputHash) {
          return { uid, ...etudiant, motDePasse: undefined };
        }
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la vérification étudiant:', error);
      throw error;
    }
  };

  const goToPrevQuote = () => {
    setIsAutoPlaying(false);
    setCurrentQuote((prev) => (prev - 1 + einsteinQuotes.length) % einsteinQuotes.length);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNextQuote = () => {
    setIsAutoPlaying(false);
    setCurrentQuote((prev) => (prev + 1) % einsteinQuotes.length);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToQuote = (index) => {
    setIsAutoPlaying(false);
    setCurrentQuote(index);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  if (newPasswordMode && tempUser) {
    return (
      <div className="login-container">
        <div className="login-background" 
             style={{backgroundImage: `url(${process.env.PUBLIC_URL + '/images/einstein-background.jpg'})`}} />
         <div className="login-background-overlay"></div>
        <div className="login-content">
          <div className="login-card">
            <div className="login-header">
              <img src={process.env.PUBLIC_URL + '/images/logo1.jpg'} alt="Logo" className="login-logo" />
              <h2>Définir un nouveau mot de passe</h2>
              <p>Veuillez saisir votre nouveau mot de passe</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleNewPasswordSubmit(); }} className="login-form">
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <div className="form-group">
                <label>Nouveau mot de passe</label>
                <input
                  type="password"
                  name="newPassword"
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label>Confirmer le mot de passe</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={handleNewPasswordChange}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>

              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe'}
              </button>

              <p className="back-link" onClick={() => { setNewPasswordMode(false); setTempUser(null); }}>
                Retour à la connexion
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="login-container">
        <div className="login-background" 
             style={{backgroundImage: `url(${process.env.PUBLIC_URL + '/images/einstein-background.jpg'})`}} />
        
        <div className="quote-carousel-container">
          <div className="quote-carousel" onMouseEnter={() => setIsAutoPlaying(false)} onMouseLeave={() => setIsAutoPlaying(true)}>
            <div className="carousel-content">
              <button onClick={goToPrevQuote} className="carousel-button" aria-label="Citation précédente">
                <ChevronLeft className="carousel-icon" />
              </button>
              
              <div className="quote-wrapper">
                <div className="quote-slider">
                  {einsteinQuotes.map((quoteObj, index) => (
                    <div key={index} className={`quote-slide ${currentQuote === index ? 'active' : ''}`}>
                      <p className="quote-text">"{quoteObj.quote}"</p>
                      <p className="quote-author">— {quoteObj.author}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <button onClick={goToNextQuote} className="carousel-button" aria-label="Citation suivante">
                <ChevronRight className="carousel-icon" />
              </button>
            </div>
            
            <div className="carousel-indicators">
              {einsteinQuotes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToQuote(index)}
                  className={`indicator ${currentQuote === index ? 'active' : ''}`}
                  aria-label={`Aller à la citation ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="login-main-content">
          <div className="login-card">
            <div className="login-header">
              <img src={process.env.PUBLIC_URL + '/images/logo1.jpg'} alt="Logo" className="login-logo" />
              <h2>{resetPasswordMode ? 'Réinitialisation du mot de passe' : 'Connexion à IEFP'}</h2>
              <p>
                {resetPasswordMode 
                  ? 'Entrez votre email pour recevoir un lien de réinitialisation' 
                  : 'Connectez-vous avec vos identifiants'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={credentials.email}
                  onChange={handleChange}
                  placeholder="exemple@email.com"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              {!resetPasswordMode && (
                <div className="form-group">
                  <label>Mot de passe</label>
                  <input
                    type="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              )}

              <button type="submit" disabled={isLoading}>
                {isLoading 
                  ? (resetPasswordMode ? 'Envoi en cours...' : 'Connexion en cours...') 
                  : (resetPasswordMode ? 'Réinitialiser le mot de passe' : 'Se connecter')}
              </button>

              <p className="toggle-mode" onClick={toggleResetPasswordMode}>
                {resetPasswordMode ? 'Retour à la connexion' : 'Mot de passe oublié ?'}
              </p>

              {!resetPasswordMode && (
                <div className="register-links">
                  Vous n'avez pas de compte ?{' '}
                  <a href="/etudiant-register">S'inscrire comme étudiant</a>
                  {' ou '}
                  <a href="/formateur-register">S'inscrire comme formateur</a>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <footer className="center-footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-column">
              <h3>Contact</h3>
              <div className="contact-item">
                <i className="fas fa-phone-alt"></i>
                <div>
                  <a href={`tel:${footerData?.contacts?.phone1 || '+212522123456'}`}>
                    {footerData?.contacts?.phone1 || '+212 522 123 456'}
                  </a>
                  <span className="separator"> / </span>
                  <a href={`tel:${footerData?.contacts?.phone2 || '+212522654321'}`}>
                    {footerData?.contacts?.phone2 || '+212 522 654 321'}
                  </a>
                </div>
              </div>
              <div className="contact-item">
                <i className="fas fa-envelope"></i>
                <a href={`mailto:${footerData?.contacts?.email || 'contact@iefp.ma'}`}>
                  {footerData?.contacts?.email || 'contact@iefp.ma'}
                </a>
              </div>
              <div className="contact-item">
                <i className="fas fa-map-marker-alt"></i>
                <span>{footerData?.contacts?.address || '123 Avenue Mohammed V, Casablanca'}</span>
              </div>
            </div>

            <div className="footer-column">
              <h3>Réseaux sociaux</h3>
              <div className="social-links">
                {footerData?.socialLinks?.map((link, index) => (
                  <a key={index} href={link.url} target="_blank" rel="noopener noreferrer">
                    <i className={`fab fa-${link.name.toLowerCase()}`}></i> {link.name}
                  </a>
                )) || (
                  <>
                    <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-facebook-f"></i> Facebook
                    </a>
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-instagram"></i> Instagram
                    </a>
                    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-linkedin-in"></i> LinkedIn
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} {footerData?.copyright || 'Centre de Formation IEFP - Tous droits réservés'}</p>
          </div>
        </div>
      </footer>   
    </div>
  );
};

export default LoginPage;