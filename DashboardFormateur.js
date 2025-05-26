import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, get, query, orderByChild, equalTo } from 'firebase/database';

// Import des composants
import ListeCours from './ListeCours';
import ListeDevoirs from './ListeDevoirs';
import ListeQuiz from './ListeQuiz';
import DeposerCours from './DeposerCours';
import DeposerDevoir from './DeposerDevoir';
import DeposerQuiz from './DeposerQuiz';
import DeposerResultat from './DeposerResultat';
import ListeFormateurs from './ListeFormateurs';
import EspacePersonnel from './espace personnel';
import ProfileContentFormateur from './ProfileContentFormateur';
import CompteRendu from './CompteRendu';
import QuizPasse from './QuizPasse';
import DiscussionsContent from './DiscussionsContent';
import TableEtudiantsNotes from './TableEtudiantsNotes'; // Correct import

// Styled Components (unchanged)
const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(#1E3A8A);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const FormateurContainer = styled.div`
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
  background: ${props => props.active ? '#274d8a' : 'transparent'};
  transition: background 0.2s;
  border-left: 4px solid transparent;

  &:hover {
    background: #274d8a;
  }

  &[aria-current] {
    background: #274d8a;
    border-left: 4px solid #dba632;
  }
`;

const SubMenuItem = styled(MenuItem)`
  padding-left: 35px;
  background: ${props => props.active ? '#2e5a9e' : '#1e3b70'};
`;

const Icon = styled.span`
  font-size: 1.2rem;
`;

const ToggleIcon = styled.span`
  font-size: 1rem;
  margin-left: auto;
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

const ContentCard = styled.div`
  background: rgba(215, 136, 136, 0.1);
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);

  h2 {
    color: #2c3e50;
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 1.5rem;
  }

  h3 {
    color: #2c3e50;
    margin-top: 30px;
    margin-bottom: 15px;
    font-size: 1.3rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: transform 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  }
`;

const StatIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 10px;
  color: #2c3e50;
`;

const StatValue = styled.h3`
  margin: 0;
  font-size: 1.8rem;
  color: #2c3e50;
`;

const StatLabel = styled.p`
  margin: 5px 0 0;
  color: #2c3e50;
  font-size: 0.9rem;
`;

const RecentActivitiesSection = styled.div`
  margin-top: 30px;
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const ActivityItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 15px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 4px solid #dba632;
`;

const ActivityDate = styled.div`
  font-size: 0.8rem;
  color: #aaa;
  margin-bottom: 5px;
`;

const ActivityContent = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ActivityIcon = styled.span`
  font-size: 1.2rem;
  color: #2c3e50;
`;

const ActivityText = styled.div`
  font-size: 0.95rem;
  color: #2c3e50;
`;

// DashboardContent component
const DashboardContent = ({ stats, activities }) => (
  <ContentCard>
    <h2>Votre Tableau de Bord</h2>
    <StatsGrid>
      <StatCard>
        <StatIcon>📚</StatIcon>
        <StatValue>{stats.coursPublies}</StatValue>
        <StatLabel>Cours Publiés</StatLabel>
      </StatCard>
      <StatCard>
        <StatIcon>📝</StatIcon>
        <StatValue>{stats.devoirsPublies}</StatValue>
        <StatLabel>Devoirs Publiés</StatLabel>
      </StatCard>
      <StatCard>
        <StatIcon>❓</StatIcon>
        <StatValue>{stats.quizPublies}</StatValue>
        <StatLabel>Quiz Publiés</StatLabel>
      </StatCard>
      <StatCard>
        <StatIcon>👥</StatIcon>
        <StatValue>{stats.etudiantsActifs}</StatValue>
        <StatLabel>Étudiants Actifs</StatLabel>
      </StatCard>
    </StatsGrid>
    <RecentActivitiesSection>
      <h3>Activités Récentes</h3>
      <ActivityList>
        {activities.length > 0 ? (
          activities.map((activity, index) => (
            <ActivityItem key={activity.id || index}>
              <ActivityDate>
                {new Date(activity.date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </ActivityDate>
              <ActivityContent>
                <ActivityIcon>{activity.icon}</ActivityIcon>
                <ActivityText>{activity.text}</ActivityText>
              </ActivityContent>
            </ActivityItem>
          ))
        ) : (
          <p style={{color: '#2c3e50'}}>Aucune activité récente</p>
        )}
      </ActivityList>
    </RecentActivitiesSection>
  </ContentCard>
);

// FormateurDashboard component
const FormateurDashboard = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [formateurData, setFormateurData] = useState(null);
  const [lastLoginDate, setLastLoginDate] = useState(null);
  const [openSubmenus, setOpenSubmenus] = useState({
    deposerCours: false,
    deposerDevoir: false,
    deposerQuiz: false
  });
  const [stats, setStats] = useState({
    coursPublies: 0,
    devoirsPublies: 0,
    quizPublies: 0,
    etudiantsActifs: 0
  });
  const [activities, setActivities] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const currentFormateur = JSON.parse(localStorage.getItem('formateur'));
    if (!currentFormateur) {
      navigate('/formateur-login');
      return;
    }
    setFormateurData(currentFormateur);

    // Récupérer les formations
    const fetchFormationsData = async () => {
      try {
        const formateurId = currentFormateur.uid || currentFormateur.id;
        const formationsRef = query(
          ref(db, 'formations'),
          orderByChild('formateurId'),
          equalTo(formateurId)
        );

        onValue(formationsRef, (snapshot) => {
          let coursPublies = 0;
          const formationsData = [];
          
          if (snapshot.exists()) {
            snapshot.forEach((formation) => {
              const formationData = formation.val();
              formationData.id = formation.key;
              formationsData.push(formationData);
              
              if (formationData.statut === 'publiée' || formationData.statut === 'validée') {
                coursPublies++;
              }
            });

            const recentActivities = formationsData
              .sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation))
              .slice(0, 5)
              .map(formation => ({
                date: formation.dateCreation,
                icon: '📚',
                text: `Formation "${formation.specialite}" - Statut: ${formation.statut}`,
                id: formation.id
              }));

            setActivities(recentActivities);
            setStats(prevStats => ({
              ...prevStats,
              coursPublies
            }));
          }
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des formations:", error);
      }
    };

    // Récupérer les devoirs
    const fetchDevoirsData = async () => {
      try {
        onValue(ref(db, 'devoirs'), (snapshot) => {
          let devoirsPublies = 0;
          
          if (snapshot.exists()) {
            snapshot.forEach((categorySnapshot) => {
              const category = categorySnapshot.val();
              Object.values(category).forEach(formation => {
                Object.values(formation).forEach(semestre => {
                  Object.values(semestre).forEach(devoir => {
                    if (devoir.formateurId === (currentFormateur.uid || currentFormateur.id)) {
                      devoirsPublies++;
                    }
                  });
                });
              });
            });
            
            setStats(prevStats => ({
              ...prevStats,
              devoirsPublies
            }));
          }
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des devoirs:", error);
      }
    };

    // Récupérer les quiz
    const fetchQuizData = async () => {
      try {
        onValue(ref(db, 'quizs'), (snapshot) => {
          let quizPublies = 0;
          
          if (snapshot.exists()) {
            snapshot.forEach((categorySnapshot) => {
              const category = categorySnapshot.val();
              Object.values(category).forEach(formation => {
                Object.values(formation).forEach(semestre => {
                  Object.values(semestre).forEach(quiz => {
                    if (quiz.formateurId === (currentFormateur.uid || currentFormateur.id)) {
                      quizPublies++;
                    }
                  });
                });
              });
            });
            
            setStats(prevStats => ({
              ...prevStats,
              quizPublies
            }));
          }
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des quiz:", error);
      }
    };

    // Récupérer les étudiants
    const fetchEtudiantsActifs = async () => {
      try {
        const inscriptionsRef = ref(db, 'inscriptions');
        onValue(inscriptionsRef, (snapshot) => {
          if (snapshot.exists()) {
            const formationsQuery = query(
              ref(db, 'formations'),
              orderByChild('formateurId'),
              equalTo(currentFormateur.uid || currentFormateur.id)
            );
            
            get(formationsQuery).then((formationsSnapshot) => {
              let etudiantsMap = new Map();
              
              if (formationsSnapshot.exists()) {
                const formationIds = Object.keys(formationsSnapshot.val());
                
                snapshot.forEach((inscriptionSnapshot) => {
                  const inscription = inscriptionSnapshot.val();
                  
                  if (typeof inscription === 'object' && inscription !== null) {
                    if (inscription.idFormation && formationIds.includes(inscription.idFormation)) {
                      etudiantsMap.set(inscription.idEtudiant, true);
                    } else if (inscription.formationId && formationIds.includes(inscription.formationId)) {
                      etudiantsMap.set(inscriptionSnapshot.key, true);
                    }
                    
                    Object.values(inscription).forEach(inscrDetail => {
                      if (typeof inscrDetail === 'object' && inscrDetail !== null && inscrDetail.formationId) {
                        if (formationIds.includes(inscrDetail.formationId)) {
                          etudiantsMap.set(inscriptionSnapshot.key, true);
                        }
                      }
                    });
                  }
                });
                
                setStats(prevStats => ({
                  ...prevStats,
                  etudiantsActifs: etudiantsMap.size
                }));
              }
            });
          }
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des étudiants:", error);
      }
    };

    fetchFormationsData();
    fetchDevoirsData();
    fetchQuizData();
    fetchEtudiantsActifs();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('formateur');
      navigate('/formateur-login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const toggleSubmenu = (menu) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const renderContent = () => {
    const formateurId = formateurData?.uid || formateurData?.id || formateurData?.formateurId;
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent stats={stats} activities={activities} />;
      case 'deposer-cours':
        return <DeposerCours />;
      case 'liste-cours':
        return <ListeCours />;
      case 'deposer-devoir':
        return <DeposerDevoir />;
      case 'liste-devoirs':
        return <ListeDevoirs />;
      case 'compte-rendu':
        return <CompteRendu formateurId={formateurId} />;
      case 'deposer-quiz':
        return <DeposerQuiz />;
      case 'liste-quiz':
        return <ListeQuiz />;
      case 'quiz-passe':
        return <QuizPasse formateurId={formateurId} />;
      case 'voir-resultat':
        return <TableEtudiantsNotes />; // Fixed to use TableEtudiantsNotes
      case 'deposer-resultat':
        return <DeposerResultat />;
      case 'liste-formateurs':
        return <ListeFormateurs />;
      case 'espace-personnel':
        return <EspacePersonnel />;
      case 'profile':
        return <ProfileContentFormateur formateur={formateurData} />;
      case 'discussions':
        return <DiscussionsContent formateurId={formateurId} />;
      default:
        return <DashboardContent stats={stats} activities={activities} />;
    }
  };

  return (
    <PageContainer>
      <FormateurContainer>
        <Sidebar 
          onMouseEnter={() => setIsMenuOpen(true)}
          onMouseLeave={() => setIsMenuOpen(false)}
          isOpen={isMenuOpen}
        >
          <SidebarHeader>
            {isMenuOpen ? 'Menu Formateur' : '☰'}
          </SidebarHeader>
          <MenuList>
            <MenuItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
              <Icon>📊</Icon> {isMenuOpen && 'Tableau de Bord'}
            </MenuItem>
            <MenuItem 
              active={activeTab === 'deposer-cours' || activeTab === 'liste-cours'}
              onClick={() => toggleSubmenu('deposerCours')}
            >
              <Icon>📚</Icon> {isMenuOpen && 'Cours'}
              {isMenuOpen && (
                <ToggleIcon>
                  {openSubmenus.deposerCours ? '▼' : '▶'}
                </ToggleIcon>
              )}
            </MenuItem>
            {openSubmenus.deposerCours && isMenuOpen && (
              <>
                <SubMenuItem 
                  active={activeTab === 'deposer-cours'} 
                  onClick={() => setActiveTab('deposer-cours')}
                >
                  <Icon>➕</Icon> Déposer des Cours
                </SubMenuItem>
                <SubMenuItem 
                  active={activeTab === 'liste-cours'} 
                  onClick={() => setActiveTab('liste-cours')}
                >
                  <Icon>📋</Icon> Liste des Cours
                </SubMenuItem>
              </>
            )}
            <MenuItem 
              active={activeTab === 'deposer-devoir' || activeTab === 'liste-devoirs' || activeTab === 'compte-rendu'}
              onClick={() => toggleSubmenu('deposerDevoir')}
            >
              <Icon>📝</Icon> {isMenuOpen && 'Devoirs'}
              {isMenuOpen && (
                <ToggleIcon>
                  {openSubmenus.deposerDevoir ? '▼' : '▶'}
                </ToggleIcon>
              )}
            </MenuItem>
            {openSubmenus.deposerDevoir && isMenuOpen && (
              <>
                <SubMenuItem 
                  active={activeTab === 'deposer-devoir'} 
                  onClick={() => setActiveTab('deposer-devoir')}
                >
                  <Icon>➕</Icon> Déposer Devoir
                </SubMenuItem>
                <SubMenuItem 
                  active={activeTab === 'liste-devoirs'} 
                  onClick={() => setActiveTab('liste-devoirs')}
                >
                  <Icon>📋</Icon> Liste des Devoirs
                </SubMenuItem>
                <SubMenuItem 
                  active={activeTab === 'compte-rendu'} 
                  onClick={() => setActiveTab('compte-rendu')}
                >
                  <Icon>📄</Icon> Compte Rendu
                </SubMenuItem>
              </>
            )}
            <MenuItem 
              active={activeTab === 'deposer-quiz' || activeTab === 'liste-quiz' || activeTab === 'quiz-passe'}
              onClick={() => toggleSubmenu('deposerQuiz')}
            >
              <Icon>❓</Icon> {isMenuOpen && 'Quiz'}
              {isMenuOpen && (
                <ToggleIcon>
                  {openSubmenus.deposerQuiz ? '▼' : '▶'}
                </ToggleIcon>
              )}
            </MenuItem>
            {openSubmenus.deposerQuiz && isMenuOpen && (
              <>
                <SubMenuItem 
                  active={activeTab === 'deposer-quiz'} 
                  onClick={() => setActiveTab('deposer-quiz')}
                >
                  <Icon>➕</Icon> Déposer Quiz
                </SubMenuItem>
                <SubMenuItem 
                  active={activeTab === 'liste-quiz'} 
                  onClick={() => setActiveTab('liste-quiz')}
                >
                  <Icon>📋</Icon> Liste des Quiz
                </SubMenuItem>
                <SubMenuItem 
                  active={activeTab === 'quiz-passe'} 
                  onClick={() => setActiveTab('quiz-passe')}
                >
                  <Icon>✅</Icon> Quiz Passé
                </SubMenuItem>
              </>
            )}
            <MenuItem active={activeTab === 'voir-resultat'} onClick={() => setActiveTab('voir-resultat')}>
              <Icon>📊</Icon> {isMenuOpen && 'Voir Résultats'}
            </MenuItem>
            <MenuItem active={activeTab === 'deposer-resultat'} onClick={() => setActiveTab('deposer-resultat')}>
              <Icon>📋</Icon> {isMenuOpen && 'Déposer Résultat'}
            </MenuItem>
            <MenuItem active={activeTab === 'liste-formateurs'} onClick={() => setActiveTab('liste-formateurs')}>
              <Icon>👥</Icon> {isMenuOpen && 'Liste Etudiant'}
            </MenuItem>
            <MenuItem active={activeTab === 'espace-personnel'} onClick={() => setActiveTab('espace-personnel')}>
              <Icon>👤</Icon> {isMenuOpen && 'Proposer une Formation'}
            </MenuItem>
            <MenuItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
              <Icon>👤</Icon> {isMenuOpen && 'Mon Profil'}
            </MenuItem>
            <MenuItem active={activeTab === 'discussions'} onClick={() => setActiveTab('discussions')}>
              <Icon>📩</Icon> {isMenuOpen && 'Discussions'}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Icon>🚪</Icon> {isMenuOpen && 'Déconnexion'}
            </MenuItem>
          </MenuList>
        </Sidebar>

        <MainContent>
          <ContentHeader>
            {formateurData && (
              <WelcomeMessage>
                <h1>Bienvenue, {formateurData.prenom} {formateurData.nom}</h1>
              </WelcomeMessage>
            )}
          </ContentHeader>
          {renderContent()}
        </MainContent>
      </FormateurContainer>
    </PageContainer>
  );
};

export default FormateurDashboard;