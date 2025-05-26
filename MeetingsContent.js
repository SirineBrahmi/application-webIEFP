import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const MeetingsContent = ({ enrolledCourses, userId }) => {
  const [meetings, setMeetings] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        // Récupérer les séances pour les formations auxquelles l'étudiant est inscrit
        const courseIds = enrolledCourses.map(course => course.formationId);
        const q = query(collection(db, 'seances'), where('formationId', 'in', courseIds));
        const querySnapshot = await getDocs(q);
        
        const meetingsData = [];
        querySnapshot.forEach((doc) => {
          meetingsData.push({ id: doc.id, ...doc.data() });
        });
        
        setMeetings(meetingsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching meetings:", error);
        setLoading(false);
      }
    };

    fetchMeetings();
  }, [enrolledCourses]);

  const handleJoinMeeting = (meetingId) => {
    // Implémenter la jonction à la réunion
    console.log(`Rejoindre la réunion ${meetingId}`);
  };

  const filteredMeetings = meetings.filter(meeting => 
    activeTab === 'upcoming' ? meeting.statut === 'en_cours' : meeting.statut === 'terminee'
  );

  if (loading) {
    return <Loading>Chargement des réunions...</Loading>;
  }

  return (
    <ContentCard>
      <h2>Réunions</h2>
      
      <MeetingTabs>
        <MeetingTab 
          active={activeTab === 'upcoming'}
          onClick={() => setActiveTab('upcoming')}
        >
          À venir
        </MeetingTab>
        <MeetingTab 
          active={activeTab === 'past'}
          onClick={() => setActiveTab('past')}
        >
          Passées
        </MeetingTab>
      </MeetingTabs>
      
      <MeetingsList>
        {filteredMeetings.map((meeting) => (
          <MeetingItem key={meeting.id} active={meeting.statut === 'en_cours'}>
            <MeetingInfo>
              <MeetingTitle>{meeting.roomName || 'Réunion'}</MeetingTitle>
              <MeetingDescription>
                Séance de cours pour la formation {meeting.formationId}
              </MeetingDescription>
            </MeetingInfo>
            <MeetingActions>
              <JoinMeetingButton 
                onClick={() => handleJoinMeeting(meeting.id)}
                disabled={meeting.statut !== 'en_cours'}
              >
                {meeting.statut === 'en_cours' ? 'Rejoindre' : 'Terminée'}
              </JoinMeetingButton>
            </MeetingActions>
          </MeetingItem>
        ))}
      </MeetingsList>
    </ContentCard>
  );
};

// Styles
const ContentCard = styled.div`
  background: white;
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  
  h2 {
    color: #1e3b70;
    border-bottom: 2px solid #dba632;
    padding-bottom: 10px;
    margin-top: 0;
  }
`;

const MeetingTabs = styled.div`
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #dee2e6;
`;

const MeetingTab = styled.div`
  padding: 10px 20px;
  cursor: pointer;
  border-bottom: ${props => props.active ? '3px solid #dba632' : '3px solid transparent'};
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  color: ${props => props.active ? '#1e3b70' : '#6c757d'};
`;

const MeetingsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const MeetingItem = styled.div`
  display: flex;
  justify-content: space-between;
  background: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  padding: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  border-left: ${props => props.active ? '4px solid #dba632' : '1px solid #e9ecef'};
`;

const MeetingInfo = styled.div`
  flex: 1;
`;

const MeetingTitle = styled.h3`
  margin: 0 0 10px 0;
  color: #1e3b70;
`;

const MeetingDescription = styled.div`
  color: #495057;
`;

const MeetingActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
  padding-left: 15px;
`;

const JoinMeetingButton = styled.button`
  background-color: ${props => props.disabled ? '#6c757d' : '#1e3b70'};
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-weight: bold;
  opacity: ${props => props.disabled ? '0.7' : '1'};
  
  &:hover {
    background-color: ${props => props.disabled ? '#6c757d' : '#dba632'};
  }
`;

const Loading = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
`;

export default MeetingsContent;