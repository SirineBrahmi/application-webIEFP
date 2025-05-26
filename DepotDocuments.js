import React, { useState } from 'react';
import { set, push, ref } from 'firebase/database';
import { db } from '../firebase';
import { useNavigate, useParams } from 'react-router-dom';

const DepotDocuments = () => {
  const { formationId } = useParams();
  const navigate = useNavigate();
  const etudiant = JSON.parse(localStorage.getItem('etudiant'));
  
  // État pour le profil sélectionné
  const [profil, setProfil] = useState('etudiant');
  
  const [files, setFiles] = useState({
    attestationPresence: null,
    attestationTravail: null,
    cin: null
  });
  
  const [hasCin, setHasCin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e, type) => {
    if (e.target.files[0]) {
      setFiles(prev => ({
        ...prev,
        [type]: e.target.files[0]
      }));
    }
  };

  const handleProfilChange = (e) => {
    setProfil(e.target.value);
    // Réinitialiser les fichiers lors du changement de profil
    setFiles({
      attestationPresence: null,
      attestationTravail: null,
      cin: null
    });
  };

  // Upload vers Cloudinary
  const uploadToCloudinary = async (file) => {
    if (!file) return null;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'IEFPMinyarSirine');

    const response = await fetch('https://api.cloudinary.com/v1_1/demvebwif/raw/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error("Échec de l'upload sur Cloudinary");

    const data = await response.json();
    return data.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Vérification des documents obligatoires selon le profil
      if (profil === 'etudiant' && (!files.attestationPresence || (!files.cin && hasCin))) {
        throw new Error("L'attestation de présence et la CIN sont obligatoires pour les étudiants");
      }
      
      if (profil === 'travailleur' && (!files.attestationTravail || (!files.cin && hasCin))) {
        throw new Error("L'attestation de travail et la CIN sont obligatoires pour les travailleurs");
      }
      
      if (profil === 'eleve' && !files.attestationPresence) {
        throw new Error("L'attestation de présence est obligatoire pour les élèves");
      }

      const uploads = {};

      // Upload des fichiers
      for (const [type, file] of Object.entries(files)) {
        if (file) {
          const url = await uploadToCloudinary(file);
          if (url) uploads[type] = url;
        }
      }

      // Générer un ID unique d'inscription
      const inscriptionId = push(ref(db, `inscriptions/${etudiant.uid}`)).key;

      // Enregistrer dans Firebase Realtime Database
      await set(ref(db, `inscriptions/${etudiant.uid}/${inscriptionId}`), {
        formationId,
        dateInscription: new Date().toISOString(),
        statut: 'en attente',
        profil,
        documents: uploads,
        etudiant: {
          uid: etudiant.uid,
          nom: etudiant.nom,
          prenom: etudiant.prenom,
          email: etudiant.email
        }
      });

      // Redirection après succès
      navigate('/etudiant/espace-personnel');

    } catch (err) {
      console.error("Erreur lors de l'inscription :", err);
      setError(err.message || "Une erreur est survenue lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-container">
      <div className="depot-container">
        <div className="form-header">
          <h1>📄 Dépôt de Documents</h1>
          <div className="subtitle">Complétez votre inscription en déposant les documents requis</div>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="profile-selection">
            <h2>Sélectionnez votre profil</h2>
            <div className="profile-options">
              <div className={`profile-card ${profil === 'etudiant' ? 'active' : ''}`}>
                <label>
                  <input
                    type="radio"
                    name="profil"
                    value="etudiant"
                    checked={profil === 'etudiant'}
                    onChange={handleProfilChange}
                  />
                  <span className="profile-icon">🎓</span>
                  <span className="profile-text">Étudiant</span>
                </label>
              </div>
              
              <div className={`profile-card ${profil === 'eleve' ? 'active' : ''}`}>
                <label>
                  <input
                    type="radio"
                    name="profil"
                    value="eleve"
                    checked={profil === 'eleve'}
                    onChange={handleProfilChange}
                  />
                  <span className="profile-icon">📚</span>
                  <span className="profile-text">Élève</span>
                </label>
              </div>
              
              <div className={`profile-card ${profil === 'travailleur' ? 'active' : ''}`}>
                <label>
                  <input
                    type="radio"
                    name="profil"
                    value="travailleur"
                    checked={profil === 'travailleur'}
                    onChange={handleProfilChange}
                  />
                  <span className="profile-icon">💼</span>
                  <span className="profile-text">Travailleur</span>
                </label>
              </div>
            </div>
          </div>

          <div className="document-section">
            <h2>Documents à déposer</h2>
            <p className="instruction-text">
              {profil === 'etudiant' && "En tant qu'étudiant, vous devez fournir une attestation de présence et votre CIN."}
              {profil === 'eleve' && "En tant qu'élève, vous devez fournir une attestation de présence. La CIN est optionnelle."}
              {profil === 'travailleur' && "En tant que travailleur, vous devez fournir une attestation de travail et votre CIN."}
            </p>

            {/* Documents spécifiques selon le profil */}
            {profil === 'etudiant' && (
              <div className="file-upload-box">
                <div className="file-icon">📋</div>
                <div className="file-details">
                  <h3>Attestation de présence <span className="required-tag">Obligatoire</span></h3>
                  <p>Document prouvant votre présence dans l'établissement éducatif</p>
                  <input 
                    type="file" 
                    onChange={(e) => handleFileChange(e, 'attestationPresence')} 
                    required 
                    id="attestation-presence"
                  />
                  <label htmlFor="attestation-presence" className="file-button">
                    {files.attestationPresence ? 'Fichier sélectionné ✓' : 'Choisir un fichier'}
                  </label>
                  {files.attestationPresence && (
                    <span className="file-name">{files.attestationPresence.name}</span>
                  )}
                </div>
              </div>
            )}

            {profil === 'travailleur' && (
              <div className="file-upload-box">
                <div className="file-icon">📑</div>
                <div className="file-details">
                  <h3>Attestation de travail <span className="required-tag">Obligatoire</span></h3>
                  <p>Document attestant de votre emploi actuel</p>
                  <input 
                    type="file" 
                    onChange={(e) => handleFileChange(e, 'attestationTravail')} 
                    required 
                    id="attestation-travail"
                  />
                  <label htmlFor="attestation-travail" className="file-button">
                    {files.attestationTravail ? 'Fichier sélectionné ✓' : 'Choisir un fichier'}
                  </label>
                  {files.attestationTravail && (
                    <span className="file-name">{files.attestationTravail.name}</span>
                  )}
                </div>
              </div>
            )}

            {profil === 'eleve' && (
              <div className="file-upload-box">
                <div className="file-icon">📜</div>
                <div className="file-details">
                  <h3>Attestation de présence <span className="required-tag">Obligatoire</span></h3>
                  <p>Document prouvant votre présence dans l'établissement scolaire</p>
                  <input 
                    type="file" 
                    onChange={(e) => handleFileChange(e, 'attestationPresence')} 
                    required 
                    id="attestation-presence-eleve"
                  />
                  <label htmlFor="attestation-presence-eleve" className="file-button">
                    {files.attestationPresence ? 'Fichier sélectionné ✓' : 'Choisir un fichier'}
                  </label>
                  {files.attestationPresence && (
                    <span className="file-name">{files.attestationPresence.name}</span>
                  )}
                </div>
              </div>
            )}

            {/* Gestion de la CIN */}
            {profil === 'eleve' ? (
              <div className="cin-section">
                <div className="checkbox-container">
                  <label className="checkbox-label">
                    <input
                      type="checkbox" 
                      checked={hasCin}
                      onChange={() => setHasCin(!hasCin)}
                    />
                    <span className="checkbox-custom"></span>
                    J'ai une carte d'identité nationale (CIN)
                  </label>
                </div>
                
                {hasCin && (
                  <div className="file-upload-box">
                    <div className="file-icon">🪪</div>
                    <div className="file-details">
                      <h3>Carte d'identité nationale <span className="optional-tag">Optionnelle</span></h3>
                      <p>Votre carte d'identité nationale</p>
                      <input 
                        type="file" 
                        onChange={(e) => handleFileChange(e, 'cin')} 
                        id="cin-eleve"
                      />
                      <label htmlFor="cin-eleve" className="file-button">
                        {files.cin ? 'Fichier sélectionné ✓' : 'Choisir un fichier'}
                      </label>
                      {files.cin && (
                        <span className="file-name">{files.cin.name}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="file-upload-box">
                <div className="file-icon">🪪</div>
                <div className="file-details">
                  <h3>Carte d'identité nationale <span className="required-tag">Obligatoire</span></h3>
                  <p>Votre carte d'identité nationale</p>
                  <input 
                    type="file" 
                    onChange={(e) => handleFileChange(e, 'cin')} 
                    required 
                    id="cin"
                  />
                  <label htmlFor="cin" className="file-button">
                    {files.cin ? 'Fichier sélectionné ✓' : 'Choisir un fichier'}
                  </label>
                  {files.cin && (
                    <span className="file-name">{files.cin.name}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="submit-container">
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Envoi en cours...
                </>
              ) : (
                'Soumettre mon inscription'
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .main-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
          padding: 20px;
        }
        
        .depot-container {
          width: 800px;
          max-width: 90%;
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          padding: 30px;
          border: 5px solid #0056b3;
          position: relative;
          overflow: hidden;
        }
        
        .depot-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 8px;
          background: linear-gradient(90deg, #ffcc00 0%, #0056b3 100%);
        }
        
        .form-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f0f0f0;
        }
        
        .form-header h1 {
          color: #0056b3;
          margin: 0;
          font-size: 28px;
        }
        
        .subtitle {
          color: #666;
          margin-top: 8px;
        }
        
        h2 {
          color: #0056b3;
          font-size: 20px;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        
        .profile-selection {
          margin-bottom: 30px;
        }
        
        .profile-options {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .profile-card {
          flex: 1;
          min-width: 150px;
          padding: 15px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .profile-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .profile-card.active {
          border-color: #ffcc00;
          background-color: rgba(255, 204, 0, 0.1);
          box-shadow: 0 5px 15px rgba(255, 204, 0, 0.2);
        }
        
        .profile-card input[type="radio"] {
          display: none;
        }
        
        .profile-icon {
          display: block;
          font-size: 36px;
          margin-bottom: 10px;
        }
        
        .profile-text {
          display: block;
          font-weight: bold;
          color: #333;
        }

        .instruction-text {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          color: #555;
          margin-bottom: 25px;
          border-left: 4px solid #0056b3;
        }
        
        .document-section {
          margin-bottom: 30px;
        }
        
        .file-upload-box {
          display: flex;
          background-color: #f9f9f9;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid #eaeaea;
          transition: all 0.3s ease;
        }
        
        .file-upload-box:hover {
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
          border-color: #ffcc00;
        }
        
        .file-icon {
          font-size: 40px;
          margin-right: 20px;
          display: flex;
          align-items: center;
        }
        
        .file-details {
          flex: 1;
        }
        
        .file-details h3 {
          margin: 0 0 10px 0;
          color: #333;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .required-tag {
          background-color: #ffcc00;
          color: #333;
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: normal;
        }
        
        .optional-tag {
          background-color: #e0e0e0;
          color: #666;
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: normal;
        }
        
        .file-details p {
          color: #666;
          margin: 0 0 15px 0;
          font-size: 14px;
        }
        
        input[type="file"] {
          display: none;
        }
        
        .file-button {
          display: inline-block;
          background-color: #0056b3;
          color: white;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .file-button:hover {
          background-color: #003d82;
        }
        
        .file-name {
          display: block;
          margin-top: 10px;
          color: #0056b3;
          font-size: 14px;
          word-break: break-all;
        }
        
        .cin-section {
          margin-top: 20px;
        }
        
        .checkbox-container {
          margin-bottom: 20px;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          position: relative;
          cursor: pointer;
          user-select: none;
          padding-left: 35px;
          font-size: 16px;
          color: #333;
        }
        
        .checkbox-label input {
          position: absolute;
          opacity: 0;
          cursor: pointer;
        }
        
        .checkbox-custom {
          position: absolute;
          left: 0;
          height: 25px;
          width: 25px;
          background-color: #fff;
          border: 2px solid #ccc;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        
        .checkbox-label:hover input ~ .checkbox-custom {
          border-color: #ffcc00;
        }
        
        .checkbox-label input:checked ~ .checkbox-custom {
          background-color: #ffcc00;
          border-color: #ffcc00;
        }
        
        .checkbox-custom:after {
          content: "";
          position: absolute;
          display: none;
          left: 8px;
          top: 4px;
          width: 6px;
          height: 12px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        
        .checkbox-label input:checked ~ .checkbox-custom:after {
          display: block;
        }
        
        .submit-container {
          text-align: center;
          margin-top: 30px;
        }
        
        .submit-button {
          background: linear-gradient(90deg, #ffcc00 0%, #0056b3 100%);
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 50px;
          cursor: pointer;
          font-size: 18px;
          font-weight: bold;
          min-width: 250px;
          transition: all 0.3s ease;
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .submit-button:hover {
          box-shadow: 0 10px 20px rgba(0, 86, 179, 0.2);
          transform: translateY(-2px);
        }
        
        .submit-button:disabled {
          background: #cccccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        .loading-spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
          margin-right: 10px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .error {
          color: #d32f2f;
          margin-bottom: 20px;
          padding: 15px;
          background-color: #ffebee;
          border-radius: 8px;
          border-left: 5px solid #d32f2f;
          font-weight: 500;
        }
        
        @media (max-width: 768px) {
          .profile-options {
            flex-direction: column;
          }
          
          .file-upload-box {
            flex-direction: column;
          }
          
          .file-icon {
            margin-right: 0;
            margin-bottom: 15px;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default DepotDocuments;