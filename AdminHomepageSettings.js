import React, { useState, useEffect } from 'react';
import { ref, get, set, getDatabase } from 'firebase/database';
import styled from 'styled-components';

const AdminHomepageSettings = () => {
  const [homeData, setHomeData] = useState({
    header: {
      topBarText: '',
      logoUrl: '',
      logoAlt: '',
      logoText: '',
      menuItems: []
    },
    hero: {
      title: '',
      subtitle: '',
      buttonText: '',
      videoUrl: ''
    },
    institut: {
      title: '',
      description: '',
      features: [],
      images: []
    },
    formations: {
      title: '',
      buttonText: ''
    },
    faq: {
      title: '',
      items: []
    },
    testimonials: {
      title: ''
    },
    stats: {
      title: '',
      items: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchHomeData = async () => {
      const db = getDatabase();
      const homeRef = ref(db, 'homepageSettings');
      const snapshot = await get(homeRef);
      
      if (snapshot.exists()) {
        setHomeData(prev => ({
          ...prev,
          ...snapshot.val()
        }));
      }
      setLoading(false);
    };

    fetchHomeData();
  }, []);

  const handleUpload = async (file, type = 'image', folder = '') => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'IEFPMinyarSirine');
      if (folder) formData.append('folder', folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/demvebwif/${type === 'video' ? 'video' : 'image'}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      return data.secure_url;
    } finally {
      setUploading(false);
    }
  };

  const handleSectionChange = (section, field, value) => {
    setHomeData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleArrayChange = (section, arrayName, index, field, value) => {
    setHomeData(prev => {
      const newArray = [...prev[section][arrayName]];
      newArray[index] = {
        ...newArray[index],
        [field]: value
      };
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [arrayName]: newArray
        }
      };
    });
  };

  const addArrayItem = (section, arrayName, newItem) => {
    setHomeData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [arrayName]: [
          ...(prev[section][arrayName] || []),
          newItem
        ]
      }
    }));
  };

  const removeArrayItem = (section, arrayName, index) => {
    setHomeData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [arrayName]: prev[section][arrayName].filter((_, i) => i !== index)
      }
    }));
  };

  const saveChanges = async () => {
    const db = getDatabase();
    await set(ref(db, 'homepageSettings'), homeData);
    alert('Modifications enregistrées avec succès!');
  };

  if (loading) return <Loading>Chargement...</Loading>;

  return (
    <AdminContainer>
      <h1>Configuration Complète de la Page d'Accueil</h1>

      {/* Header Section */}
      <Section>
        <h2>En-tête</h2>
        <FormGroup>
          <label>Texte de la barre supérieure</label>
          <input
            type="text"
            value={homeData.header.topBarText || ''}
            onChange={(e) => handleSectionChange('header', 'topBarText', e.target.value)}
            placeholder="Texte d'information en haut de page"
          />
        </FormGroup>

        <FormGroup>
          <label>Logo</label>
          {homeData.header.logoUrl && (
            <ImagePreview>
              <img src={homeData.header.logoUrl} alt="Logo actuel" />
              <button onClick={() => handleSectionChange('header', 'logoUrl', '')}>
                Supprimer
              </button>
            </ImagePreview>
          )}
          <input 
            type="file" 
            accept="image/*" 
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const url = await handleUpload(file, 'image', 'logo');
              handleSectionChange('header', 'logoUrl', url);
            }} 
          />
          {uploading && <UploadStatus>Téléchargement en cours...</UploadStatus>}
        </FormGroup>

        <FormGroup>
          <label>Texte alternatif du logo</label>
          <input
            type="text"
            value={homeData.header.logoAlt || ''}
            onChange={(e) => handleSectionChange('header', 'logoAlt', e.target.value)}
            placeholder="Description du logo pour l'accessibilité"
          />
        </FormGroup>

        <FormGroup>
          <label>Texte accompagnant le logo</label>
          <input
            type="text"
            value={homeData.header.logoText || ''}
            onChange={(e) => handleSectionChange('header', 'logoText', e.target.value)}
            placeholder="Texte affiché à côté du logo"
          />
        </FormGroup>

        <FormGroup>
          <label>Menu de navigation</label>
          {homeData.header.menuItems?.map((item, index) => (
            <MenuItemInput key={index}>
              <input
                type="text"
                value={item.text || ''}
                onChange={(e) => handleArrayChange('header', 'menuItems', index, 'text', e.target.value)}
                placeholder="Texte du menu"
              />
              <input
                type="text"
                value={item.path || ''}
                onChange={(e) => handleArrayChange('header', 'menuItems', index, 'path', e.target.value)}
                placeholder="Lien (ex: #section ou /page)"
              />
              <label>
                <input
                  type="checkbox"
                  checked={item.isButton || false}
                  onChange={(e) => handleArrayChange('header', 'menuItems', index, 'isButton', e.target.checked)}
                />
                Bouton ?
              </label>
              <RemoveButton onClick={() => removeArrayItem('header', 'menuItems', index)}>
                ×
              </RemoveButton>
            </MenuItemInput>
          ))}
          <AddButton onClick={() => addArrayItem('header', 'menuItems', { text: '', path: '', isButton: false })}>
            + Ajouter un élément de menu
          </AddButton>
        </FormGroup>
      </Section>

      {/* Hero Section */}
      <Section>
        <h2>Section Hero</h2>
        <FormGroup>
          <label>Titre principal</label>
          <input
            type="text"
            value={homeData.hero.title || ''}
            onChange={(e) => handleSectionChange('hero', 'title', e.target.value)}
            placeholder="Titre accrocheur"
          />
        </FormGroup>

        <FormGroup>
          <label>Sous-titre</label>
          <input
            type="text"
            value={homeData.hero.subtitle || ''}
            onChange={(e) => handleSectionChange('hero', 'subtitle', e.target.value)}
            placeholder="Sous-titre descriptif"
          />
        </FormGroup>

        <FormGroup>
          <label>Texte du bouton</label>
          <input
            type="text"
            value={homeData.hero.buttonText || ''}
            onChange={(e) => handleSectionChange('hero', 'buttonText', e.target.value)}
            placeholder="Texte du bouton d'action"
          />
        </FormGroup>

        <FormGroup>
          <label>Vidéo de fond</label>
          {homeData.hero.videoUrl && (
            <VideoPreviewContainer>
              <video src={homeData.hero.videoUrl} controls />
              <button onClick={() => handleSectionChange('hero', 'videoUrl', '')}>
                Supprimer
              </button>
            </VideoPreviewContainer>
          )}
          <input 
            type="file" 
            accept="video/*" 
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const url = await handleUpload(file, 'video', 'videos');
              handleSectionChange('hero', 'videoUrl', url);
            }} 
          />
          {uploading && <UploadStatus>Téléchargement en cours...</UploadStatus>}
        </FormGroup>
      </Section>

      {/* Institut Section */}
      <Section>
        <h2>Section Notre Institut</h2>
        <FormGroup>
          <label>Titre de section</label>
          <input
            type="text"
            value={homeData.institut.title || ''}
            onChange={(e) => handleSectionChange('institut', 'title', e.target.value)}
            placeholder="Titre de la section"
          />
        </FormGroup>

        <FormGroup>
          <label>Description</label>
          <textarea
            value={homeData.institut.description || ''}
            onChange={(e) => handleSectionChange('institut', 'description', e.target.value)}
            placeholder="Texte descriptif de l'institut"
            rows="5"
          />
        </FormGroup>

        <FormGroup>
          <label>Caractéristiques</label>
          {homeData.institut.features?.map((feature, index) => (
            <FeatureInput key={index}>
              <input
                type="text"
                value={feature || ''}
                onChange={(e) => handleArrayChange('institut', 'features', index, null, e.target.value)}
                placeholder="Caractéristique à mettre en avant"
              />
              <RemoveButton onClick={() => removeArrayItem('institut', 'features', index)}>
                ×
              </RemoveButton>
            </FeatureInput>
          ))}
          <AddButton onClick={() => addArrayItem('institut', 'features', '')}>
            + Ajouter une caractéristique
          </AddButton>
        </FormGroup>

        <FormGroup>
          <label>Images du carrousel</label>
          <ImageGrid>
            {homeData.institut.images?.map((image, index) => (
              <ImagePreview key={index}>
                <img src={image} alt={`Institut ${index}`} />
                <button onClick={() => removeArrayItem('institut', 'images', index)}>
                  Supprimer
                </button>
              </ImagePreview>
            ))}
          </ImageGrid>
          <input 
            type="file" 
            accept="image/*" 
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const url = await handleUpload(file, 'image', 'institut');
              addArrayItem('institut', 'images', url);
            }} 
          />
          {uploading && <UploadStatus>Téléchargement en cours...</UploadStatus>}
        </FormGroup>
      </Section>

      {/* Formations Section */}
      <Section>
        <h2>Section Formations</h2>
        <FormGroup>
          <label>Titre de section</label>
          <input
            type="text"
            value={homeData.formations.title || ''}
            onChange={(e) => handleSectionChange('formations', 'title', e.target.value)}
            placeholder="Titre de la section formations"
          />
        </FormGroup>

        <FormGroup>
          <label>Texte du bouton</label>
          <input
            type="text"
            value={homeData.formations.buttonText || ''}
            onChange={(e) => handleSectionChange('formations', 'buttonText', e.target.value)}
            placeholder="Texte du bouton 'En savoir plus'"
          />
        </FormGroup>
      </Section>

      {/* FAQ Section */}
      <Section>
        <h2>Section FAQ</h2>
        <FormGroup>
          <label>Titre de section</label>
          <input
            type="text"
            value={homeData.faq.title || ''}
            onChange={(e) => handleSectionChange('faq', 'title', e.target.value)}
            placeholder="Titre de la section FAQ"
          />
        </FormGroup>

        <FormGroup>
          <label>Questions/Réponses</label>
          {homeData.faq.items?.map((item, index) => (
            <FaqItem key={index}>
              <input
                type="text"
                value={item.question || ''}
                onChange={(e) => handleArrayChange('faq', 'items', index, 'question', e.target.value)}
                placeholder="Question fréquente"
              />
              <textarea
                value={item.answer || ''}
                onChange={(e) => handleArrayChange('faq', 'items', index, 'answer', e.target.value)}
                placeholder="Réponse détaillée"
                rows="3"
              />
              <RemoveButton onClick={() => removeArrayItem('faq', 'items', index)}>
                Supprimer cette Q/R
              </RemoveButton>
            </FaqItem>
          ))}
          <AddButton onClick={() => addArrayItem('faq', 'items', { question: '', answer: '' })}>
            + Ajouter une question/réponse
          </AddButton>
        </FormGroup>
      </Section>

      {/* Témoignages Section */}
      <Section>
        <h2>Section Témoignages</h2>
        <FormGroup>
          <label>Titre de section</label>
          <input
            type="text"
            value={homeData.testimonials.title || ''}
            onChange={(e) => handleSectionChange('testimonials', 'title', e.target.value)}
            placeholder="Titre de la section témoignages"
          />
        </FormGroup>
      </Section>

      {/* Statistiques Section */}
      <Section>
        <h2>Section Statistiques</h2>
        <FormGroup>
          <label>Titre de section</label>
          <input
            type="text"
            value={homeData.stats.title || ''}
            onChange={(e) => handleSectionChange('stats', 'title', e.target.value)}
            placeholder="Titre de la section statistiques"
          />
        </FormGroup>

        <FormGroup>
          <label>Statistiques</label>
          {homeData.stats.items?.map((item, index) => (
            <StatItem key={index}>
              <input
                type="text"
                value={item.value || ''}
                onChange={(e) => handleArrayChange('stats', 'items', index, 'value', e.target.value)}
                placeholder="Valeur (ex: 500+)"
              />
              <input
                type="text"
                value={item.label || ''}
                onChange={(e) => handleArrayChange('stats', 'items', index, 'label', e.target.value)}
                placeholder="Libellé (ex: Étudiants formés)"
              />
              <RemoveButton onClick={() => removeArrayItem('stats', 'items', index)}>
                ×
              </RemoveButton>
            </StatItem>
          ))}
          <AddButton onClick={() => addArrayItem('stats', 'items', { value: '', label: '' })}>
            + Ajouter une statistique
          </AddButton>
        </FormGroup>
      </Section>

      <SaveButton onClick={saveChanges}>Enregistrer toutes les modifications</SaveButton>
    </AdminContainer>
  );
};

// Styles
const AdminContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Loading = styled.div`
  text-align: center;
  padding: 40px;
  font-size: 1.2rem;
`;

const Section = styled.div`
  margin-bottom: 30px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  
  label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  
  input, textarea, select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 10px;
    font-family: inherit;
  }
  
  textarea {
    min-height: 100px;
  }
`;

const ImagePreview = styled.div`
  position: relative;
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
  
  img {
    width: 100%;
    height: 150px;
    object-fit: contain;
    background: #f5f5f5;
  }
  
  button {
    position: absolute;
    bottom: 5px;
    left: 5px;
    background: rgba(255,0,0,0.7);
    color: white;
    border: none;
    padding: 3px 8px;
    border-radius: 3px;
    cursor: pointer;
  }
`;

const VideoPreviewContainer = styled.div`
  position: relative;
  margin-bottom: 10px;
  
  video {
    width: 100%;
    max-height: 200px;
    background: #000;
  }
  
  button {
    position: absolute;
    bottom: 5px;
    left: 5px;
    background: rgba(255,0,0,0.7);
    color: white;
    border: none;
    padding: 3px 8px;
    border-radius: 3px;
    cursor: pointer;
  }
`;

const UploadStatus = styled.div`
  color: #666;
  font-style: italic;
  margin-top: 5px;
`;

const MenuItemInput = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
  
  input {
    flex: 1;
  }
  
  label {
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }
`;

const FeatureInput = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  
  input {
    flex: 1;
  }
`;

const FaqItem = styled.div`
  margin-bottom: 15px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 4px;
`;

const StatItem = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  
  input {
    flex: 1;
  }
`;

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
`;

const AddButton = styled.button`
  background: #4CAF50;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 5px;
  
  &:hover {
    background: #45a049;
  }
`;

const RemoveButton = styled.button`
  background: #f44336;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: #d32f2f;
  }
`;

const SaveButton = styled.button`
  background: #2196F3;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 20px;
  display: block;
  width: 100%;
  
  &:hover {
    background: #0b7dda;
  }
`;

export default AdminHomepageSettings;