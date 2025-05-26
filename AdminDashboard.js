import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ref, get, onValue } from 'firebase/database';
import { db } from '../firebase';
import AdminFormations from './AdminFormations';
import UsersContentDetailed from './UsersContent';
import ProfileContent from './ProfileContent';
import AdminInscriptions from './AdminInscriptions';
import AdminFooterSettings from './AdminFooterSettings';
import AdminHomepageSettings from './AdminHomepageSettings';
import DiscussionsContent from './DiscussionsContentAdmin';

// Styled components for the dashboard
const AdminContainer = styled.div`
  display: flex;
  min-height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(#1E3A8A, #2A4A9A);
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

const LogoutMenuItem = styled(MenuItem)`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #274d8a;
  color: #e74c3c;

  &:hover {
    background: rgba(231, 76, 60, 0.1);
  }
`;

const Icon = styled.span`
  font-size: 1.2rem;
`;

const MainContent = styled.div`
  flex: 1;
  padding: 30px;
  background: rgba(241, 240, 240, 0.8);
  backdrop-filter: blur(8px);
  color: #2c3e50;
`;

const ContentCard = styled.div`
  background: rgba(255, 255, 255, 0.8);
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
  background: rgba(255, 255, 255, 0.9);
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

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const RefreshButton = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9rem;
  
  &:hover {
    background: #2980b9;
  }
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 40px;
  color: #2c3e50;
`;

const RecentActivity = styled.div`
  margin-top: 30px;
`;

const ActivityList = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ActivityItem = styled.li`
  display: flex;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  border-left: 4px solid #dba632;
`;

const ActivityIcon = styled.span`
  font-size: 1.2rem;
  color: #2c3e50;
  margin-right: 15px;
`;

const ActivityText = styled.span`
  flex: 1;
  color: #2c3e50;
`;

const ActivityTime = styled.span`
  color: #aaa;
  font-size: 0.8rem;
`;

// DashboardContent component
const DashboardContent = ({ stats, loading, error, recentFormations, recentInscriptions, refreshData }) => {
  if (loading) {
    return <LoadingIndicator>Chargement des données...</LoadingIndicator>;
  }

  if (error) {
    return (
      <ContentCard>
        <h2>Erreur</h2>
        <p>{error}</p>
        <RefreshButton onClick={refreshData}>
          <Icon>🔄</Icon> Réessayer
        </RefreshButton>
      </ContentCard>
    );
  }

  return (
    <>
      <DashboardHeader>
        <h2>Tableau de Bord Administrateur</h2>
        <RefreshButton onClick={refreshData}>
          <Icon>🔄</Icon> Actualiser
        </RefreshButton>
      </DashboardHeader>

      <ContentCard>
        <h2>Statistiques Générales</h2>
        <StatsGrid>
          <StatCard>
            <StatIcon>🎓</StatIcon>
            <StatValue>{stats.totalFormations || 0}</StatValue>
            <StatLabel>Formations Totales</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>✅</StatIcon>
            <StatValue>{stats.activeFormations || 0}</StatValue>
            <StatLabel>Formations Actives</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>⏳</StatIcon>
            <StatValue>{stats.pendingFormations || 0}</StatValue>
            <StatLabel>Formations en Attente</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>👨‍🎓</StatIcon>
            <StatValue>{stats.totalStudents || 0}</StatValue>
            <StatLabel>Étudiants Inscrits</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>👨‍🏫</StatIcon>
            <StatValue>{stats.totalFormateurs || 0}</StatValue>
            <StatLabel>Formateurs</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>📝</StatIcon>
            <StatValue>{stats.pendingInscriptions || 0}</StatValue>
            <StatLabel>Inscriptions en Attente</StatLabel>
          </StatCard>
        </StatsGrid>

        <RecentActivity>
          <h3>Formations Récentes</h3>
          <ActivityList>
            {recentFormations && recentFormations.length > 0 ? (
              recentFormations.map((formation, index) => (
                <ActivityItem key={index}>
                  <ActivityIcon>🎓</ActivityIcon>
                  <ActivityText>
                    {formation.titre} - <strong>Statut: {formation.statut || 'Non défini'}</strong>
                  </ActivityText>
                  <ActivityTime>
                    {formation.dateCreation && new Date(formation.dateCreation).toLocaleDateString()}
                  </ActivityTime>
                </ActivityItem>
              ))
            ) : (
              <ActivityItem>
                <ActivityText>Aucune formation récente</ActivityText>
              </ActivityItem>
            )}
          </ActivityList>
        </RecentActivity>

        <RecentActivity>
          <h3>Inscriptions Récentes</h3>
          <ActivityList>
            {recentInscriptions && recentInscriptions.length > 0 ? (
              recentInscriptions.map((inscription, index) => (
                <ActivityItem key={index} style={{borderColor: 
                  inscription.statut === 'accepté' ? '#2ecc71' : 
                  inscription.statut === 'refusé' ? '#e74c3c' : 
                  '#dba632'}}>
                  <ActivityIcon>
                    {inscription.statut === 'accepté' ? '✅' : 
                     inscription.statut === 'refusé' ? '❌' : 
                     '⏳'}
                  </ActivityIcon>
                  <ActivityText>
                    <strong>{inscription.etudiant?.nom} {inscription.etudiant?.prenom}</strong> 
                    {inscription.formationTitre ? ` - Formation: "${inscription.formationTitre}"` : ` - Formation ID: ${inscription.formationId || "Non définie"}`}
                    <div style={{fontSize: '0.85rem', marginTop: '3px'}}>
                      Statut: <span style={{
                        color: inscription.statut === 'accepté' ? '#2ecc71' : 
                               inscription.statut === 'refusé' ? '#e74c3c' : 
                               '#dba632',
                        fontWeight: 'bold'
                      }}>
                        {inscription.statut || "En attente"}
                      </span>
                    </div>
                  </ActivityText>
                  <ActivityTime>
                    {inscription.dateInscription && new Date(inscription.dateInscription).toLocaleDateString()} {inscription.dateInscription && new Date(inscription.dateInscription).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </ActivityTime>
                </ActivityItem>
              ))
            ) : (
              <ActivityItem>
                <ActivityText>Aucune inscription récente</ActivityText>
              </ActivityItem>
            )}
          </ActivityList>
        </RecentActivity>
      </ContentCard>
    </>
  );
};

// Additional content components
const FeedbackContent = () => <ContentCard><h2>Gestion des Feedbacks</h2><p>Contenu de gestion des feedbacks à implémenter...</p></ContentCard>;

// AdminDashboard component
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState({
    totalFormations: 0,
    activeFormations: 0,
    pendingFormations: 0,
    totalStudents: 0,
    totalFormateurs: 0,
    pendingInscriptions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentFormations, setRecentFormations] = useState([]);
  const [recentInscriptions, setRecentInscriptions] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const formationsRef = ref(db, 'categories');
      const formationsSnapshot = await get(formationsRef);
      
      let totalFormations = 0;
      let activeFormations = 0;
      let pendingFormations = 0;
      const formationsList = [];
      
      if (formationsSnapshot.exists()) {
        formationsSnapshot.forEach(category => {
          const formationsData = category.child('formations');
          if (formationsData.exists()) {
            formationsData.forEach(formation => {
              totalFormations++;
              const formationData = formation.val();
              if (formationData.statut === 'active' || formationData.statut === 'publiée') {
                activeFormations++;
              } else if (formationData.statut === 'en attente') {
                pendingFormations++;
              }
              
              formationsList.push({
                id: formation.key,
                ...formationData,
                category: category.key
              });
            });
          }
        });
      }
      
      const sortedFormations = formationsList
        .sort((a, b) => new Date(b.dateCreation || 0) - new Date(a.dateCreation || 0))
        .slice(0, 5);
      
      const formationTitles = {};
      formationsList.forEach(formation => {
        formationTitles[formation.id] = formation.titre;
      });
      
      const usersRef = ref(db, 'utilisateurs');
      const usersSnapshot = await get(usersRef);
      
      let totalStudents = 0;
      let totalFormateurs = 0;
      
      if (usersSnapshot.exists()) {
        const etudiantsData = usersSnapshot.child('etudiants');
        const formateursData = usersSnapshot.child('formateurs');
        
        if (etudiantsData.exists()) {
          const etudiants = etudiantsData.val() || {};
          totalStudents = Object.keys(etudiants).length;
        }
        
        if (formateursData.exists()) {
          const formateurs = formateursData.val() || {};
          totalFormateurs = Object.keys(formateurs).length;
        }
      }
      
      const inscriptionsRef = ref(db, 'inscriptions');
      const inscriptionsSnapshot = await get(inscriptionsRef);
      
      const inscriptionsList = [];
      
      if (inscriptionsSnapshot.exists()) {
        inscriptionsSnapshot.forEach(student => {
          student.forEach(inscription => {
            const inscriptionData = inscription.val();
            
            const etudiantData = inscriptionData.etudiant || {};
            
            inscriptionsList.push({
              id: inscription.key,
              studentId: student.key,
              ...inscriptionData,
              etudiant: {
                nom: etudiantData.nom || "Nom inconnu",
                prenom: etudiantData.prenom || "Prénom inconnu",
                ...etudiantData
              },
              formationTitre: formationTitles[inscriptionData.formationId] || null,
              dateInscription: inscriptionData.dateInscription 
                ? new Date(inscriptionData.dateInscription) 
                : new Date()
            });
          });
        });
      }
      
      const sortedInscriptions = inscriptionsList
        .sort((a, b) => b.dateInscription - a.dateInscription)
        .slice(0, 5);
      
      setDashboardStats({
        totalFormations,
        activeFormations,
        pendingFormations,
        totalStudents,
        totalFormateurs,
        pendingInscriptions: inscriptionsList.filter(i => i.statut === 'en attente').length
      });
      
      setRecentFormations(sortedFormations);
      setRecentInscriptions(sortedInscriptions);
      
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(`Erreur lors du chargement des données: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/formateur-login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent 
          stats={dashboardStats} 
          loading={loading} 
          error={error}
          recentFormations={recentFormations}
          recentInscriptions={recentInscriptions}
          refreshData={fetchDashboardData}
        />;
      case 'formations':
        return <AdminFormations />;
      case 'utilisateurs':
        return <UsersContentDetailed />;
      case 'feedback':
        return <FeedbackContent />;
      case 'inscriptions':
        return <AdminInscriptions />;
      case 'profil':
        return <ProfileContent />;
      case 'discussions':
        return <DiscussionsContent />;
      case 'footerSettings':
        return <AdminFooterSettings />;
      case 'homepageSettings':
        return <AdminHomepageSettings />;
      default:
        return <DashboardContent 
          stats={dashboardStats} 
          loading={loading} 
          error={error}
          recentFormations={recentFormations}
          recentInscriptions={recentInscriptions}
          refreshData={fetchDashboardData}
        />;
    }
  };

  return (
    <AdminContainer>
      <Sidebar 
        onMouseEnter={() => setIsMenuOpen(true)}
        onMouseLeave={() => setIsMenuOpen(false)}
        isOpen={isMenuOpen}
      >
        <SidebarHeader>{isMenuOpen ? 'Menu Admin' : '☰'}</SidebarHeader>
        <MenuList>
          <MenuItem 
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          >
            <Icon>📊</Icon> {isMenuOpen && 'Tableau de Bord'}
          </MenuItem>
          <MenuItem 
            active={activeTab === 'formations'}
            onClick={() => setActiveTab('formations')}
          >
            <Icon>🎓</Icon> {isMenuOpen && 'Gestion Formations'}
          </MenuItem>
          <MenuItem 
            active={activeTab === 'utilisateurs'}
            onClick={() => setActiveTab('utilisateurs')}
          >
            <Icon>👥</Icon> {isMenuOpen && 'Utilisateurs'}
          </MenuItem>
          <MenuItem 
            active={activeTab === 'feedback'}
            onClick={() => setActiveTab('feedback')}
          >
            <Icon>💬</Icon> {isMenuOpen && 'Feedback'}
          </MenuItem>
          <MenuItem 
            active={activeTab === 'inscriptions'}
            onClick={() => setActiveTab('inscriptions')}
          >
            <Icon>📝</Icon> {isMenuOpen && 'Inscriptions'}
          </MenuItem>
          <MenuItem 
            active={activeTab === 'profil'}
            onClick={() => setActiveTab('profil')}
          >
            <Icon>👤</Icon> {isMenuOpen && 'Mon Profil'}
          </MenuItem>
          <MenuItem 
            active={activeTab === 'discussions'}
            onClick={() => setActiveTab('discussions')}
          >
            <Icon>📩</Icon> {isMenuOpen && 'Discussions'}
          </MenuItem>
          <LogoutMenuItem onClick={handleLogout}>
            <Icon>🚪</Icon> {isMenuOpen && 'Déconnexion'}
          </LogoutMenuItem>
          <MenuItem 
            active={activeTab === 'footerSettings'}
            onClick={() => setActiveTab('footerSettings')}
          >
            <Icon>🖥️</Icon> {isMenuOpen && 'Paramètres Footer'}
          </MenuItem>
          <MenuItem 
            active={activeTab === 'homepageSettings'}
            onClick={() => setActiveTab('homepageSettings')}
          >
            <Icon>🏠</Icon> {isMenuOpen && 'Page d\'Accueil'}
          </MenuItem>
        </MenuList>
      </Sidebar>

      <MainContent>
        {renderContent()}
      </MainContent>
    </AdminContainer>
  );
};

export default AdminDashboard;