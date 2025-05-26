import React from 'react';
import styled from 'styled-components';
import format from 'date-fns/format';
import fr from 'date-fns/locale/fr';

const PersonalSpaceContent = ({ 
  user = {}, 
  enrolledCourses = [], 
  upcomingQuizzes = [], 
  pendingAssignments = [] 
}) => {
  // Statistiques sécurisées
  const stats = [
    { icon: '📚', value: enrolledCourses.length, label: 'Formations en cours' },
    { icon: '📝', value: pendingAssignments.length, label: 'Devoirs à rendre' },
    { icon: '❓', value: upcomingQuizzes.length, label: 'Quiz à passer' },
    { icon: '🎥', value: 1, label: 'Réunions à venir' }
  ];

  // Événements à venir (exemple statique)
  const upcomingEvents = [
    { 
      date: format(new Date(), 'EEE d MMM', { locale: fr }), 
      title: 'Rendu du projet Angular', 
      urgent: true 
    },
    { 
      date: format(new Date(Date.now() + 86400000), 'EEE d MMM', { locale: fr }), 
      title: 'Quiz de mathématiques' 
    },
    { 
      date: format(new Date(Date.now() + 2 * 86400000), 'EEE d MMM', { locale: fr }), 
      title: 'Session de cours en ligne',
      time: '14:00 - 16:00'
    }
  ];

  return (
    <ContentCard>
      <h2>Bienvenue, {user?.displayName || 'Étudiant'}</h2>
      
      <StatsGrid>
        {stats.map((stat, index) => (
          <StatCard key={index}>
            <StatIcon>{stat.icon}</StatIcon>
            <StatValue>{stat.value}</StatValue>
            <StatLabel>{stat.label}</StatLabel>
          </StatCard>
        ))}
      </StatsGrid>
      
      <UpcomingSection>
        <h3>À venir cette semaine</h3>
        <EventList>
          {upcomingEvents.map((event, index) => (
            <EventItem key={index}>
              <EventDate>{event.date}</EventDate>
              <EventTitle>{event.title}</EventTitle>
              {event.time && <EventTime>{event.time}</EventTime>}
              {event.urgent && <EventTag urgent>Urgent</EventTag>}
            </EventItem>
          ))}
        </EventList>
      </UpcomingSection>
    </ContentCard>
  );
};

// Styles (identique à ton code original)
const ContentCard = styled.div`
  background: white;
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
  
  h2 {
    color: #1e3b70;
    border-bottom: 2px solid #dba632;
    padding-bottom: 10px;
    margin-top: 0;
  }
  
  h3 {
    color: #1e3b70;
    margin-top: 25px;
    margin-bottom: 15px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const StatCard = styled.div`
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  transition: transform 0.2s;
  border-top: 4px solid #dba632;

  &:hover {
    transform: translateY(-3px);
  }
`;

const StatIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 10px;
  color: #1e3b70;
`;

const StatValue = styled.h3`
  margin: 0;
  font-size: 1.8rem;
  color: #1e3b70;
`;

const StatLabel = styled.p`
  margin: 5px 0 0;
  color: #7f8c8d;
  font-size: 0.9rem;
`;

const UpcomingSection = styled.div`
  margin-top: 30px;
`;

const EventList = styled.div`
  margin-top: 15px;
`;

const EventItem = styled.div`
  padding: 15px;
  border-left: 4px solid #dba632;
  background: #f9f9f9;
  margin-bottom: 10px;
  border-radius: 0 5px 5px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const EventDate = styled.div`
  font-weight: bold;
  color: #1e3b70;
  width: 120px;
`;

const EventTitle = styled.div`
  flex: 1;
`;

const EventTime = styled.div`
  color: #7f8c8d;
  margin-left: 15px;
`;

const EventTag = styled.div`
  background: ${props => props.urgent ? '#e74c3c' : '#3498db'};
  color: white;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 0.8rem;
  margin-left: 15px;
`;

export default PersonalSpaceContent;