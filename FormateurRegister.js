import React, { useState, useEffect } from 'react';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { sha256 } from 'js-sha256'; // Importation de sha256

export default function FormateurRegister() {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    motDePasse: '',
    adresse: '',
    numtel: '',
    age: '',
    cin: '',
    biographie: '',
    diplome: ''
  });

  const [fieldErrors, setFieldErrors] = useState({
    nom: '',
    prenom: '',
    email: '',
    motDePasse: '',
    adresse: '',
    numtel: '',
    age: '',
    cin: '',
    biographie: '',
    diplome: ''
  });

  const [files, setFiles] = useState({ cin: null, diplome: null, cv: null });
  const [fileErrors, setFileErrors] = useState({ cin: '', diplome: '', cv: '' });
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [formProgress, setFormProgress] = useState(0);
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const filled = Object.values(formData).filter(val => val !== '').length + 
                   Object.values(files).filter(file => file !== null).length;
    const totalFields = Object.keys(formData).length + Object.keys(files).length;
    setFormProgress(Math.floor((filled / totalFields) * 100));
  }, [formData, files]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'nom':
      case 'prenom':
        if (!value.trim()) error = 'Ce champ est requis';
        break;
      case 'email':
        if (!value) error = 'Email requis';
        else if (!validateEmail(value)) error = 'Email invalide';
        break;
      case 'motDePasse':
        if (!value) error = 'Mot de passe requis';
        else if (value.length < 6) error = '6 caractères minimum';
        break;
      case 'numtel':
        if (!value) error = 'Téléphone requis';
        else if (!/^[0-9]{8}$/.test(value)) error = '8 chiffres requis';
        break;
      case 'age':
        if (!value) error = 'Âge requis';
        else if (isNaN(value)) error = 'Doit être un nombre';
        else if (value <= 0) error = 'Âge invalide';
        break;
      case 'cin':
        if (!value) error = 'CIN requis';
        else if (!/^[0-9]{8}$/.test(value)) error = '8 chiffres requis';
        break;
      case 'adresse':
        if (!value.trim()) error = 'Adresse requise';
        break;
      case 'biographie':
        if (!value.trim()) error = 'Biographie requise';
        break;
      case 'diplome':
        if (!value.trim()) error = 'Information sur diplôme requise';
        break;
      default:
        if (!value) error = 'Ce champ est requis';
    }
    
    return error;
  };

  const handleNumericInput = (e, name) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      handleChange(e);
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleChange = e => {
    const { name, value } = e.target;
    
    const error = validateField(name, value);
    
    setFieldErrors(prev => ({
      ...prev,
      [name]: error
    }));
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFile = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    let error = '';
    if (type === 'cin' && !file.type.startsWith('image/')) {
      error = 'Le CIN doit être une image';
    } 
    else if (file.size > 2 * 1024 * 1024) {
      error = 'Fichier trop volumineux (max 2MB)';
    }

    setFileErrors(prev => ({ ...prev, [type]: error }));
    if (error) {
      e.target.value = '';
      return;
    }

    setFiles(prev => ({ ...prev, [type]: file }));
    setGlobalError('');
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};
    const newFileErrors = {};
    let errorMessages = [];

    // Valider tous les champs du formulaire
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      newErrors[key] = error;
      if (error) {
        isValid = false;
        errorMessages.push(`${key}: ${error}`);
      }
    });

    // Valider les fichiers
    Object.keys(files).forEach(key => {
      if (!files[key]) {
        isValid = false;
        newFileErrors[key] = 'Ce fichier est requis';
        errorMessages.push(`${key}: Fichier requis`);
      }
    });

    // Mise à jour des erreurs
    setFieldErrors(newErrors);
    setFileErrors(newFileErrors);
    // Marquer tous les champs comme touchés pour afficher les erreurs
    setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    if (!isValid) {
      setGlobalError('Veuillez corriger les erreurs suivantes:\n' + errorMessages.join('\n'));
    }

    return isValid;
  };

  const uploadFileToCloudinary = async (file) => {
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', 'IEFPMinyarSirine');
    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/demvebwif/raw/upload', {
        method: 'POST',
        body: data
      });
      const result = await res.json();
      return result.secure_url;
    } catch (err) {
      console.error('Erreur lors de l\'upload:', err);
      throw err;
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setGlobalError('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.motDePasse
      );
      const user = userCredential.user;

      await sendEmailVerification(user, {
        url: `${window.location.origin}/VerificationEmail`,
        handleCodeInApp: false
      });

      const [cinUrl, diplomeUrl, cvUrl] = await Promise.all([
        uploadFileToCloudinary(files.cin),
        uploadFileToCloudinary(files.diplome),
        uploadFileToCloudinary(files.cv)
      ]);

      // Hashage du mot de passe avant de le stocker dans la base de données
      const motDePasseHash = sha256(formData.motDePasse);

      const db = getDatabase();
      await set(ref(db, `utilisateurs/formateurs/${user.uid}`), {
        ...formData,
        motDePasse: motDePasseHash, // Stockage du mot de passe hashé
        cinUrl,
        diplomeUrl,
        cvUrl,
        uid: user.uid,
        emailVerified: false,
        role: 'formateur',
        createdAt: new Date().toISOString(),
        status: 'pending'
      });

      alert("Un e-mail de vérification a été envoyé. Veuillez vérifier votre boîte de réception et cliquer sur le lien pour activer votre compte.");
      navigate('/verification-email');
    } catch (err) {
      console.error('Erreur lors de l\'inscription:', err);
      if (err.code === 'auth/email-already-in-use') {
        setGlobalError('Cette adresse e-mail est déjà utilisée.');
      } else if (err.code === 'auth/invalid-email') {
        setGlobalError('Adresse email invalide.');
      } else {
        setGlobalError('Une erreur est survenue lors de l\'inscription: ' + err.message);
      }
    }
    setLoading(false);
  };

  const formFields = [
    { id: 'nom', label: 'Nom', type: 'text', icon: '👤', required: true },
    { id: 'prenom', label: 'Prénom', type: 'text', icon: '👤', required: true },
    { id: 'email', label: 'Email', type: 'email', icon: '✉️', required: true },
    { id: 'motDePasse', label: 'Mot de Passe', type: 'password', icon: '🔒', required: true },
    { id: 'adresse', label: 'Adresse', type: 'text', icon: '🏠', required: true },
    { id: 'numtel', label: 'Numéro de Téléphone', type: 'tel', icon: '📱', required: true },
    { id: 'age', label: 'Âge', type: 'number', icon: '📅', required: true },
    { id: 'cin', label: 'CIN', type: 'text', icon: '🪪', required: true },
    { id: 'biographie', label: 'Biographie', type: 'textarea', icon: '📝', required: true },
    { id: 'diplome', label: 'Diplôme', type: 'text', icon: '🎓', required: true }
  ];

  const fileFields = [
    { id: 'cin', label: 'CIN', icon: '🪪', accept: 'image/*' },
    { id: 'diplome', label: 'Diplôme', icon: '🎓', accept: 'image/*,.pdf' },
    { id: 'cv', label: 'CV', icon: '📄', accept: 'application/pdf,image/*' }
  ];

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '2rem 1rem',
      position: 'relative',
      backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    formCard: {
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem'
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#3a3a3a',
      marginBottom: '0.5rem'
    },
    subtitle: {
      color: '#666',
      marginBottom: '1.5rem'
    },
    progressContainer: {
      width: '100%',
      backgroundColor: '#e0e0e0',
      borderRadius: '999px',
      height: '10px',
      marginBottom: '0.5rem'
    },
    progressBar: {
      height: '10px',
      borderRadius: '999px',
      backgroundColor: '#4a6cf7',
      transition: 'width 0.3s ease-out'
    },
    progressText: {
      fontSize: '0.75rem',
      color: '#666',
      textAlign: 'center'
    },
    errorContainer: {
      backgroundColor: '#FFEBEE',
      borderLeft: '4px solid #F44336',
      color: '#D32F2F',
      padding: '1rem',
      marginBottom: '1.5rem',
      borderRadius: '4px',
      whiteSpace: 'pre-line'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '1.5rem',
       columnGap: '2rem',
    },
    fieldGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '0.5rem',
      color: '#333',
      fontWeight: '500'
    },
    labelIcon: {
      marginRight: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      marginTop: '0.5rem',
      transition: 'border-color 0.3s ease'
    },
    inputError: {
      borderColor: '#F44336',
      backgroundColor: '#FFEBEE'
    },
    errorText: {
      color: '#F44336',
      fontSize: '0.75rem',
      marginTop: '0.25rem'
    },
    fileInput: {
      marginTop: '0.5rem',
      width: '100%'
    },
    button: {
      backgroundColor: '#4a6cf7',
      color: 'white',
      padding: '1rem',
      border: 'none',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      fontSize: '1rem',
      marginTop: '1.5rem',
      width: '100%',
      transition: 'background-color 0.3s'
    },
    buttonDisabled: {
      backgroundColor: '#b0bec5',
      cursor: 'not-allowed'
    },
    footer: {
      textAlign: 'center',
      marginTop: '2rem',
      fontSize: '0.875rem',
      color: '#333'
    },
    requiredStar: {
      color: 'red',
      marginLeft: '4px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <div style={styles.header}>
          <h1 style={styles.title}>Inscription Formateur</h1>
          <p style={styles.subtitle}>Complétez les informations ci-dessous pour vous inscrire en tant que formateur</p>
        </div>
        
        {globalError && (
          <div style={styles.errorContainer}>
            <p>{globalError}</p>
          </div>
        )}

        <div style={styles.progressContainer}>
          <div style={{ ...styles.progressBar, width: `${formProgress}%` }}></div>
        </div>
        <p style={styles.progressText}>{formProgress}% complété</p>

        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div style={styles.formGrid}>
            {formFields.map(field => (
              <div style={styles.fieldGroup} key={field.id}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>{field.icon}</span>
                  {field.label}
                  {field.required && <span style={styles.requiredStar}>*</span>}
                </label>
                {field.id === 'numtel' || field.id === 'age' || field.id === 'cin' ? (
                  <input
                    type="text"
                    id={field.id}
                    name={field.id}
                    value={formData[field.id]}
                    onChange={(e) => handleNumericInput(e, field.id)}
                    onBlur={handleBlur}
                    style={{ 
                      ...styles.input, 
                      ...((touched[field.id] || fieldErrors[field.id]) && fieldErrors[field.id] && styles.inputError)
                    }}
                    required={field.required}
                    inputMode={field.id === 'age' ? 'numeric' : 'tel'}
                    maxLength={field.id === 'cin' || field.id === 'numtel' ? 8 : undefined}
                  />
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={field.id}
                    name={field.id}
                    value={formData[field.id]}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={{ 
                      ...styles.input, 
                      ...((touched[field.id] || fieldErrors[field.id]) && fieldErrors[field.id] && styles.inputError),
                      minHeight: '100px'
                    }}
                    required={field.required}
                  />
                ) : (
                  <input
                    type={field.type}
                    id={field.id}
                    name={field.id}
                    value={formData[field.id]}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={{ 
                      ...styles.input, 
                      ...((touched[field.id] || fieldErrors[field.id]) && fieldErrors[field.id] && styles.inputError)
                    }}
                    required={field.required}
                  />
                )}
                {(touched[field.id] || fieldErrors[field.id]) && fieldErrors[field.id] && (
                  <p style={styles.errorText}>{fieldErrors[field.id]}</p>
                )}
              </div>
            ))}

            {fileFields.map(field => (
              <div style={styles.fieldGroup} key={field.id}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>{field.icon}</span>
                  Téléchargez votre {field.label}
                  <span style={styles.requiredStar}>*</span>
                </label>
                <input
                  type="file"
                  accept={field.accept}
                  onChange={(e) => handleFile(e, field.id)}
                  style={styles.fileInput}
                  required
                />
                {fileErrors[field.id] && (
                  <p style={styles.errorText}>{fileErrors[field.id]}</p>
                )}
              </div>
            ))}

            <button
              type="submit"
              style={{ 
                ...styles.button, 
                ...(loading ? styles.buttonDisabled : {})
              }}
              disabled={loading}
            >
              {loading ? 'Enregistrement en cours...' : 'S\'inscrire'}
            </button>
          </div>
        </form>
        
        <div style={styles.footer}>
          <p>Déjà un compte ? <a href="/connexion">Se connecter</a></p>
        </div>
      </div>
    </div>
  );
}