import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { ref, onValue, remove } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

const MesCours = () => {
  const [mesCours, setMesCours] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    const formations = ['Français', 'Italien'];
    const semestres = ['semestre1', 'semestre2'];
    const allCourses = [];

    formations.forEach((formation) => {
      semestres.forEach((semestre) => {
        const coursRef = ref(db, `cours/${formation}/${semestre}`);
        onValue(coursRef, (snapshot) => {
          snapshot.forEach((child) => {
            const data = child.val();
            if (data.formateurId === userId) {
              allCourses.push({
                id: child.key,
                ...data,
                formation,
                semestre,
              });
            }
          });
          setMesCours([...allCourses]);
          setLoading(false);
        });
      });
    });
  }, [userId]);

  const supprimerCours = (formation, semestre, id) => {
    const coursRef = ref(db, `cours/${formation}/${semestre}/${id}`);
    remove(coursRef).then(() => {
      setMesCours((prev) =>
        prev.filter((cours) => cours.id !== id)
      );
    });
  };

  if (loading) return <div>Chargement des cours...</div>;

  return (
    <div className="container mt-4">
      <h2>Mes Cours</h2>
      {mesCours.length === 0 ? (
        <p>Aucun cours déposé pour le moment.</p>
      ) : (
        <div className="list-group">
          {mesCours.map((cours) => (
            <div
              key={cours.id}
              className="list-group-item d-flex justify-content-between align-items-start"
            >
              <div>
                <h5>{cours.titre}</h5>
                <p>{cours.description}</p>
                <p>
                  Formation : <strong>{cours.formation}</strong> | Semestre :{' '}
                  <strong>{cours.semestre}</strong>
                </p>
                <a href={cours.fichierUrl} target="_blank" rel="noreferrer">
                  Voir le fichier
                </a>
              </div>
              <div>
                <button
                  className="btn btn-warning btn-sm me-2"
                  onClick={() =>
                    navigate('/formateur/modifier-cours', { state: cours })
                  }
                >
                  Modifier
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() =>
                    supprimerCours(cours.formation, cours.semestre, cours.id)
                  }
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MesCours;
