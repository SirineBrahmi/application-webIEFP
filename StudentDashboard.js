import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { ref, get, set, serverTimestamp, onValue } from 'firebase/database';

// Styled components (unchanged)
const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(#1E3A8A);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const StudentContainer = styled.div`
  display: flex;
  min-height: 100vh;
`;

const Sidebar = styled.div`
  width: ${props => props.isOpen ? '250px' : '80px'};
  background: #1e3b70;
  transition: width 0.3s ease;
  color: white;
  overflow-y: auto;
  max-height: 100vh;
  position: sticky;
  top: 0;
  scrollbar-width: thin;
  scrollbar-color: #274d8a #1e3b70;
`;

const SidebarHeader = styled.div`
  padding: 20px;
  font-size: 1.2rem;
  font-weight: bold;
  border-bottom: 1px solid #274d8a;
  white-space: nowrap;
  background-color: #0f2957;
`;

const MenuList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const MenuItem = styled.li`
  padding: 15px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: background 0.2s;
  border-left: 4px solid transparent;
  background: ${({ active }) => active ? '#274d8a' : 'transparent'};

  &:hover {
    background: #274d8a;
  }
`;

const Icon = styled.span`
  font-size: 1.2rem;
`;

const MainContent = styled.div`
  flex: 1;
  padding: 30px;
  background: #ffffffcc;
  backdrop-filter: blur(8px);
  color: white;
`;

const ContentHeader = styled.div`
  margin-bottom: 20px;
`;

const WelcomeMessage = styled.div`
  h1 {
    color: #2c3e50;
    margin: 0;
    font-size: 1.8rem;
  }
  p {
    color: #555;
    margin: 5px 0 0;
    font-size: 0.9rem;
  }
`;

const LoadingMessage = styled.p`
  color: #666;
  font-style: italic;
`;

const ErrorMessage = styled.div`
  color: #ff4d4f;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ff4d4f;
  border-radius: 4px;
  background-color: #fff2f0;
`;

const StudentDashboard = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [lastLoginDate, setLastLoginDate] = useState(null);
  const [stats, setStats] = useState({
    coursInscrits: 0,
    devoirsEnCours: 0,
    quizAvenir: 0,
    resultatsObtenus: 0
  });
  const [activities, setActivities] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const formatLastLoginDate = () => {
    if (!lastLoginDate) return "Première connexion";
    const date = new Date(lastLoginDate);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('etudiant');
      navigate('/connexion/etudiant');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      setError('Erreur lors de la déconnexion');
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  useEffect(() => {
    const currentStudent = JSON.parse(localStorage.getItem('etudiant'));
    if (!currentStudent?.uid) {
      setError('Données étudiant non trouvées. Veuillez vous reconnecter.');
      setLoading(false);
      return;
    }
    setStudentData(currentStudent);

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Update last login
        const lastLoginRef = ref(db, `etudiants/${currentStudent.uid}/lastLogin`);
        const lastLoginSnapshot = await get(lastLoginRef);
        if (lastLoginSnapshot.exists()) {
          setLastLoginDate(lastLoginSnapshot.val());
        }
        await set(lastLoginRef, serverTimestamp());

        // 2. Fetch enrolled courses
        const fetchEnrolledCourses = async () => {
          const inscriptionsRef = ref(db, `inscriptions/${currentStudent.uid}`);
          const snapshot = await get(inscriptionsRef);
          if (snapshot.exists()) {
            const validated = [];
            snapshot.forEach(child => {
              const data = child.val();
              if (data?.statut === 'validé') {
                validated.push({
                  id: child.key,
                  formationId: data.formationId,
                  formation: data.formation || { nomFormation: data.specialite },
                  ...data
                });
              }
            });
            console.log('Enrolled courses fetched:', validated);
            setEnrolledCourses(validated);
            setStats(prev => ({ ...prev, coursInscrits: validated.length }));
          } else {
            console.log('No inscriptions found for student:', currentStudent.uid);
            setEnrolledCourses([]);
            setStats(prev => ({ ...prev, coursInscrits: 0 }));
          }
        };

        // 3. Fetch assignments
        const fetchAssignments = async () => {
          const devoirsRef = ref(db, 'devoirs');
          const snapshot = await get(devoirsRef);
          if (snapshot.exists()) {
            const assignments = [];
            snapshot.forEach(category => {
              category.forEach(formation => {
                formation.forEach(semestre => {
                  semestre.forEach(devoir => {
                    const devoirData = devoir.val();
                    assignments.push({
                      id: devoir.key,
                      ...devoirData,
                      nomFormation: formation.key,
                      semestre: semestre.key,
                      idFormation: devoirData.idFormation || devoirData.formationId
                    });
                  });
                });
              });
            });
            console.log('All assignments fetched:', assignments);
            setPendingAssignments(assignments);
            setStats(prev => ({ ...prev, devoirsEnCours: assignments.length }));
          } else {
            console.log('No assignments found');
            setPendingAssignments([]);
            setStats(prev => ({ ...prev, devoirsEnCours: 0 }));
          }
        };

        // 4. Fetch quizzes
        const fetchQuizzes = async () => {
          const quizRef = ref(db, 'quizs');
          const snapshot = await get(quizRef);
          if (snapshot.exists()) {
            let quizCount = 0;
            snapshot.forEach(category => {
              category.forEach(formation => {
                formation.forEach(semestre => {
                  quizCount += semestre.size;
                });
              });
            });
            setStats(prev => ({ ...prev, quizAvenir: quizCount }));
          } else {
            setStats(prev => ({ ...prev, quizAvenir: 0 }));
          }
        };

        // 5. Fetch results
        const fetchResults = async () => {
          const resultatsRef = ref(db, 'resultats');
          const snapshot = await get(resultatsRef);
          if (snapshot.exists()) {
            let resultCount = 0;
            snapshot.forEach(child => {
              if (child.val().etudiantId === currentStudent.uid) {
                resultCount++;
              }
            });
            setStats(prev => ({ ...prev, resultatsObtenus: resultCount }));
          } else {
            setStats(prev => ({ ...prev, resultatsObtenus: 0 }));
          }
        };

        await Promise.all([
          fetchEnrolledCourses(),
          fetchAssignments(),
          fetchQuizzes(),
          fetchResults()
        ]);

      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
        setError(`Erreur lors du chargement des données: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Realtime subscriptions
    const subscriptions = [];

    const inscriptionsRef = ref(db, `inscriptions/${currentStudent.uid}`);
    const inscriptionSub = onValue(inscriptionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const validated = [];
        snapshot.forEach(child => {
          const data = child.val();
          if (data?.statut === 'validé') {
            validated.push({
              id: child.key,
              formationId: data.formationId,
              formation: data.formation || { nomFormation: data.specialite },
              ...data
            });
          }
        });
        console.log('Real-time enrolled courses update:', validated);
        setEnrolledCourses(validated);
        setStats(prev => ({ ...prev, coursInscrits: validated.length }));
      } else {
        console.log('No real-time inscriptions found for student:', currentStudent.uid);
        setEnrolledCourses([]);
        setStats(prev => ({ ...prev, coursInscrits: 0 }));
      }
    }, (error) => {
      console.error("Erreur d'abonnement:", error);
      setError(`Erreur de connexion en temps réel: ${error.message}`);
    });

    subscriptions.push(() => inscriptionSub());

    return () => subscriptions.forEach(unsubscribe => unsubscribe());
  }, [navigate]);

  return (
    <PageContainer>
      <StudentContainer>
        <Sidebar
          onMouseEnter={() => setIsMenuOpen(true)}
          onMouseLeave={() => setIsMenuOpen(false)}
          isOpen={isMenuOpen}
        >
          <SidebarHeader>Espace Étudiant</SidebarHeader>
          <MenuList>
            <MenuItem
              onClick={() => navigate('/etudiant/dashboard')}
              active={isActive('/etudiant/dashboard')}
            >
              <Icon>🏠</Icon> {isMenuOpen && 'Espace Personnel'}
            </MenuItem>
            <MenuItem
              onClick={() => navigate('/etudiant/dashboard/formations')}
              active={isActive('/etudiant/dashboard/formations')}
            >
              <Icon>📚</Icon> {isMenuOpen && 'Mes Formations'}
            </MenuItem>
            <MenuItem
              onClick={() => navigate('/etudiant/dashboard/voir-cours')}
              active={isActive('/etudiant/dashboard/voir-cours')}
            >
              <Icon>👁️</Icon> {isMenuOpen && 'Voir Cours'}
            </MenuItem>
            <MenuItem
              onClick={() => navigate('/etudiant/dashboard/devoirs')}
              active={isActive('/etudiant/dashboard/devoirs')}
            >
              <Icon>📝</Icon> {isMenuOpen && 'Devoirs'}
            </MenuItem>
            <MenuItem
              onClick={() => navigate('/etudiant/dashboard/quiz')}
              active={isActive('/etudiant/dashboard/quiz')}
            >
              <Icon>❓</Icon> {isMenuOpen && 'Quiz'}
            </MenuItem>
            <MenuItem
              onClick={() => navigate('/etudiant/dashboard/resultats')}
              active={isActive('/etudiant/dashboard/resultats')}
            >
              <Icon>🏆</Icon> {isMenuOpen && 'Résultats'}
            </MenuItem>
            <MenuItem
              onClick={() => navigate('/etudiant/dashboard/discussions')}
              active={isActive('/etudiant/dashboard/discussions')}
            >
              <Icon>💬</Icon> {isMenuOpen && 'Discussions'}
            </MenuItem>
            <MenuItem
              onClick={() => navigate('/etudiant/dashboard/reunions')}
              active={isActive('/etudiant/dashboard/reunions')}
            >
              <Icon>🎥</Icon> {isMenuOpen && 'Réunions'}
            </MenuItem>
            <MenuItem
              onClick={() => navigate('/etudiant/dashboard/profil')}
              active={isActive('/etudiant/dashboard/profil')}
            >
              <Icon>👤</Icon> {isMenuOpen && 'Mon Profil'}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Icon>🚪</Icon> {isMenuOpen && 'Déconnexion'}
            </MenuItem>
          </MenuList>
        </Sidebar>

        <MainContent>
          <ContentHeader>
            {studentData && (
              <WelcomeMessage>
                <h1>Bienvenue, {studentData.prenom} {studentData.nom}</h1>
                {loading && <LoadingMessage>Chargement des données en cours...</LoadingMessage>}
                {error && <ErrorMessage>{error}</ErrorMessage>}
              </WelcomeMessage>
            )}
          </ContentHeader>
          <Outlet context={{
            studentData,
            stats,
            activities,
            enrolledCourses,
            pendingAssignments,
            userId: studentData?.uid,
            userNom: studentData?.nom,
            userPrenom: studentData?.prenom,
            loading,
            error
          }} />
        </MainContent>
      </StudentContainer>
    </PageContainer>
  );
};

export default StudentDashboard;