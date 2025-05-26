import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { ref, onValue } from 'firebase/database';
import './VoirResultats.css'; // Assurez-vous que le fichier CSS est importé

const VoirResultats = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [quizs, setQuizs] = useState([]);
  const [formateurId, setFormateurId] = useState(null);

  // Utilisation de useEffect pour récupérer les données de Firebase
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setFormateurId(user.uid);
        console.log("Formateur connecté :", user.uid);
      }
    });

    const etudiantsRef = ref(db, 'utilisateurs/etudiants');
    onValue(etudiantsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setEtudiants(list);
      console.log("Étudiants récupérés :", list);
    });

    const quizRef = ref(db, 'quizs');
    onValue(quizRef, (snapshot) => {
      const data = snapshot.val();
      const list = [];
      Object.entries(data || {}).forEach(([key, val]) => {
        list.push({ quizId: key, ...val });
      });
      setQuizs(list);
      console.log("Quizs récupérés :", list);
    });

    const resultsRef = ref(db, 'quiz_results');
    onValue(resultsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setQuizResults(list);
      console.log("Résultats récupérés :", list);
    });

    return () => unsubscribeAuth();
  }, []);

  // Fonction pour récupérer un quiz par son ID
  const getQuizById = (id) => quizs.find((q) => q.quizId === id);

  // Filtrage des résultats
  const filteredResults = quizResults
    .map((res) => {
      const etudiant = etudiants.find((e) => e.id === res.userId);
      const quiz = getQuizById(res.quizId);
      if (!etudiant || !quiz || quiz.formateurId !== formateurId) return null;
      return {
        id: res.id,
        etudiantPrenom: etudiant.prenom,
        etudiantNom: etudiant.nom,
        formation: quiz.nomFormation || 'Non défini',
        titre: quiz.titre || 'Sans titre',
        score: res.score
      };
    })
    .filter((res) => res !== null);

  return (
    <div className="container mt-4">
      <h2>Résultats des étudiants</h2>
      {formateurId ? (
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Prénom</th>
              <th>Nom</th>
              <th>Formation</th>
              <th>Titre du Quiz</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((res) => (
              <tr key={res.id}>
                <td>{res.etudiantPrenom}</td>
                <td>{res.etudiantNom}</td>
                <td>{res.formation}</td>
                <td>{res.titre}</td>
                <td>{res.score} / 20</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Chargement du formateur...</p>
      )}
    </div>
  );
};

export default VoirResultats;
