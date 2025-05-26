// src/components/TestFirebase.js
import React, { useEffect, useState } from 'react';
import { db, ref, get } from '../firebase';  // Importer les fonctions nécessaires
import { child } from 'firebase/database';

const TestFirebase = () => {
  const [formateur, setFormateur] = useState(null);
  const [loading, setLoading] = useState(true); // Etat pour savoir si les données sont en chargement

  useEffect(() => {
    const fetchFormateur = async () => {
      try {
        const dbRef = ref(db);  // Créer une référence à la base de données
        const snapshot = await get(child(dbRef, 'utilisateurs/formateurs/25HBWtztDvaNWQr6to0codRwyaO2')); // Accéder à l'id du formateur dans 'utilisateurs/formateurs'
        if (snapshot.exists()) {
          setFormateur(snapshot.val());  // Stocker les données dans l'état
        } else {
          setFormateur(null); // Aucun formateur trouvé
        }
      } catch (error) {
        console.error('Erreur de récupération des données:', error);
      } finally {
        setLoading(false); // Mettre à jour l'état de chargement une fois que la récupération est terminée
      }
    };

    fetchFormateur();
  }, []);

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!formateur) {
    return <div>Aucun formateur trouvé.</div>;
  }

  return (
    <div>
      <h1>Bienvenue sur le site Institut Einstein 🌟</h1>
      <h2>👨‍🏫 Détails Formateur</h2>
      <p>Nom: {formateur.nom}</p>
      <p>Email: {formateur.email}</p>
      <p>Numéro de téléphone: {formateur.numTel}</p>
      <p>Spécialité: {formateur.specialite}</p>
      <p>Adresse: {formateur.adresse}</p>
    </div>
  );
};

export default TestFirebase;
