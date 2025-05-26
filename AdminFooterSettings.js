import React, { useState, useEffect } from 'react';
import { ref, get, update, getDatabase } from 'firebase/database';
import styled from 'styled-components';

const ContentCard = styled.div`
  background: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  margin-bottom: 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #2c3e50;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  min-height: 100px;
`;

const Button = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 10px;
  
  &:hover {
    background: #2980b9;
  }
`;

const SocialLinkContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
`;

const AdminFooterSettings = () => {
  const [footerData, setFooterData] = useState({
    contacts: {
      phone1: '+212522123456',
      phone2: '+212522654321',
      email: 'contact@iefp.ma',
      address: '123 Avenue Mohammed V, Casablanca'
    },
    socialLinks: [
      { name: 'Facebook', url: 'https://facebook.com' },
      { name: 'Instagram', url: 'https://instagram.com' },
      { name: 'LinkedIn', url: 'https://linkedin.com' }
    ],
    copyright: "Centre de Formation IEFP - Tous droits réservés"
  });
  const [loading, setLoading] = useState(true);

  const db = getDatabase();

  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        const footerRef = ref(db, 'footerSettings');
        const snapshot = await get(footerRef);
        
        if (snapshot.exists()) {
          setFooterData(snapshot.val());
        }
      } catch (error) {
        console.error("Error fetching footer data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFooterData();
  }, [db]);

  const handleInputChange = (e, field, subField = null) => {
    const { name, value } = e.target;
    
    if (subField) {
      setFooterData(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [subField]: value
        }
      }));
    } else {
      setFooterData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSocialLinkChange = (e, index, field) => {
    const { value } = e.target;
    
    setFooterData(prev => {
      const updatedLinks = [...prev.socialLinks];
      updatedLinks[index] = {
        ...updatedLinks[index],
        [field]: value
      };
      return {
        ...prev,
        socialLinks: updatedLinks
      };
    });
  };

  const addSocialLink = () => {
    setFooterData(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { name: '', url: '' }]
    }));
  };

  const removeSocialLink = (index) => {
    setFooterData(prev => {
      const updatedLinks = [...prev.socialLinks];
      updatedLinks.splice(index, 1);
      return {
        ...prev,
        socialLinks: updatedLinks
      };
    });
  };

  const saveFooterData = async () => {
    try {
      const footerRef = ref(db, 'footerSettings');
      await update(footerRef, footerData);
      alert('Paramètres du footer mis à jour avec succès!');
    } catch (error) {
      console.error("Error saving footer data:", error);
      alert('Erreur lors de la mise à jour des paramètres');
    }
  };

  if (loading) {
    return <ContentCard>Chargement des paramètres du footer...</ContentCard>;
  }

  return (
    <div>
      <ContentCard>
        <h2>Paramètres du Footer - Informations de Contact</h2>
        
        <FormGroup>
          <Label>Téléphone 1</Label>
          <Input 
            type="text" 
            value={footerData.contacts.phone1} 
            onChange={(e) => handleInputChange(e, 'contacts', 'phone1')}
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Téléphone 2</Label>
          <Input 
            type="text" 
            value={footerData.contacts.phone2} 
            onChange={(e) => handleInputChange(e, 'contacts', 'phone2')}
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Email</Label>
          <Input 
            type="email" 
            value={footerData.contacts.email} 
            onChange={(e) => handleInputChange(e, 'contacts', 'email')}
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Adresse</Label>
          <TextArea 
            value={footerData.contacts.address} 
            onChange={(e) => handleInputChange(e, 'contacts', 'address')}
          />
        </FormGroup>
      </ContentCard>

      <ContentCard>
        <h2>Paramètres du Footer - Réseaux Sociaux</h2>
        
        {footerData.socialLinks.map((link, index) => (
          <div key={index}>
            <FormGroup>
              <Label>Nom du réseau social</Label>
              <Input 
                type="text" 
                value={link.name}
                onChange={(e) => handleSocialLinkChange(e, index, 'name')}
              />
            </FormGroup>
            
            <FormGroup>
              <Label>URL</Label>
              <Input 
                type="url" 
                value={link.url}
                onChange={(e) => handleSocialLinkChange(e, index, 'url')}
              />
            </FormGroup>
            
            <Button 
              onClick={() => removeSocialLink(index)}
              style={{ backgroundColor: '#e74c3c' }}
            >
              Supprimer
            </Button>
            <hr style={{ margin: '20px 0' }} />
          </div>
        ))}
        
        <Button onClick={addSocialLink}>
          Ajouter un réseau social
        </Button>
      </ContentCard>

      <ContentCard>
        <h2>Paramètres du Footer - Copyright</h2>
        
        <FormGroup>
          <Label>Texte de copyright</Label>
          <Input 
            type="text" 
            value={footerData.copyright} 
            onChange={(e) => handleInputChange(e, 'copyright')}
          />
        </FormGroup>
      </ContentCard>

      <Button onClick={saveFooterData} style={{ marginTop: '20px' }}>
        Enregistrer les modifications
      </Button>
    </div>
  );
};

export default AdminFooterSettings;