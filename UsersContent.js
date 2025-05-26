import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../firebase';

const UsersContent = () => {
  const [users, setUsers] = useState({
    etudiants: {},
    formateurs: {},
    admin: {}
  });
  const [loading, setLoading] = useState(true);
  const [studentFilter, setStudentFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const usersRef = ref(db, 'utilisateurs');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsers({
          etudiants: data.etudiants || {},
          formateurs: data.formateurs || {},
          admin: data.admin || {}
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleUserStatus = async (userId, userType, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
      const updates = {};
      updates[`utilisateurs/${userType}/${userId}/status`] = newStatus;
      
      await update(ref(db), updates);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
    }
  };

  const filteredStudents = Object.entries(users.etudiants || {})
    .filter(([_, student]) => {
      const matchesFilter = studentFilter === 'all' || 
                          (studentFilter === 'active' && student.status === 'active') || 
                          (studentFilter === 'pending' && student.status === 'pending') || 
                          (studentFilter === 'blocked' && student.status === 'blocked');
      
      const matchesSearch = searchTerm === '' || 
                          student.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.prenom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });

  const filteredTeachers = Object.entries(users.formateurs || {})
    .filter(([_, teacher]) => {
      const matchesFilter = teacherFilter === 'all' || 
                          (teacherFilter === 'active' && teacher.status === 'active') || 
                          (teacherFilter === 'pending' && teacher.status === 'pending') || 
                          (teacherFilter === 'blocked' && teacher.status === 'blocked');
      
      const matchesSearch = searchTerm === '' || 
                          teacher.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          teacher.prenom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });

  if (loading) {
    return <LoadingContainer>Chargement des utilisateurs...</LoadingContainer>;
  }

  return (
    <UsersContainer>
      <SearchBar>
        <SearchInput
          type="text"
          placeholder="Rechercher par nom, prénom ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchBar>

      <Section>
        <SectionHeader>
          <h2>Étudiants</h2>
          <FilterGroup>
            <FilterLabel>Filtrer :</FilterLabel>
            <FilterSelect 
              value={studentFilter} 
              onChange={(e) => setStudentFilter(e.target.value)}
            >
              <option value="all">Tous</option>
              <option value="active">Actifs</option>
              <option value="pending">En attente</option>
              <option value="blocked">Bloqués</option>
            </FilterSelect>
          </FilterGroup>
        </SectionHeader>
        
        <UserTable>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Niveau</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map(([id, student]) => (
                <tr key={id}>
                  <td>{student.nom}</td>
                  <td>{student.prenom}</td>
                  <td>{student.email}</td>
                  <td>{student.numTel}</td>
                  <td>{student.niveau}</td>
                  <td>
                    <StatusBadge status={student.status || 'pending'}>
                      {student.status === 'active' ? 'Actif' : 
                       student.status === 'blocked' ? 'Bloqué' : 'En attente'}
                    </StatusBadge>
                  </td>
                  <td>
                    <ActionButton 
                      onClick={() => toggleUserStatus(id, 'etudiants', student.status || 'pending')}
                      status={student.status || 'pending'}
                    >
                      {student.status === 'active' ? 'Bloquer' : 
                       student.status === 'blocked' ? 'Activer' : 'Approuver'}
                    </ActionButton>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>Aucun étudiant trouvé</td>
              </tr>
            )}
          </tbody>
        </UserTable>
      </Section>

      <Section>
        <SectionHeader>
          <h2>Formateurs</h2>
          <FilterGroup>
            <FilterLabel>Filtrer :</FilterLabel>
            <FilterSelect 
              value={teacherFilter} 
              onChange={(e) => setTeacherFilter(e.target.value)}
            >
              <option value="all">Tous</option>
              <option value="active">Actifs</option>
              <option value="pending">En attente</option>
              <option value="blocked">Bloqués</option>
            </FilterSelect>
          </FilterGroup>
        </SectionHeader>
        
        <UserTable>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Email</th>
              <th>Spécialité</th>
              <th>CIN</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map(([id, teacher]) => (
                <tr key={id}>
                  <td>{teacher.nom}</td>
                  <td>{teacher.prenom}</td>
                  <td>{teacher.email}</td>
                  <td>{teacher.diplome || 'Non spécifié'}</td>
                  <td>{teacher.cin || 'Non spécifié'}</td>
                  <td>
                    <StatusBadge status={teacher.status || 'pending'}>
                      {teacher.status === 'active' ? 'Actif' : 
                       teacher.status === 'blocked' ? 'Bloqué' : 'En attente'}
                    </StatusBadge>
                  </td>
                  <td>
                    <ActionButton 
                      onClick={() => toggleUserStatus(id, 'formateurs', teacher.status || 'pending')}
                      status={teacher.status || 'pending'}
                    >
                      {teacher.status === 'active' ? 'Bloquer' : 
                       teacher.status === 'blocked' ? 'Activer' : 'Approuver'}
                    </ActionButton>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>Aucun formateur trouvé</td>
              </tr>
            )}
          </tbody>
        </UserTable>
      </Section>
    </UsersContainer>
  );
};

const UsersContainer = styled.div`
  padding: 30px;
  background: linear-gradient(135deg,rgb(227, 236, 239),rgb(227, 242, 244));
  min-height: 100vh;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.2rem;
  color: #263238;
  font-weight: 500;
`;

const SearchBar = styled.div`
  margin-bottom: 30px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 20px;
  border: 2px solid #00acc1;
  border-radius: 8px;
  font-size: 1.1rem;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #4caf50;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;

const Section = styled.div`
  margin-bottom: 50px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  border-bottom: 3px solid transparent;
  background: linear-gradient(90deg, #00acc1, #4caf50);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;

  h2 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const FilterLabel = styled.label`
  font-size: 1rem;
  color: #263238;
  font-weight: 500;
`;

const FilterSelect = styled.select`
  padding: 8px 15px;
  border: 2px solid #00acc1;
  border-radius: 8px;
  font-size: 1rem;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4caf50;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const UserTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 15px 20px;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
    color: #263238;
  }
  
  th {
    background-color:rgb(86, 153, 241);
    font-weight: 600;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  tr {
    transition: all 0.3s ease;
  }
  
  tr:hover {
    background-color: #f1f8ff;
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: 500;
  
  background-color: ${props => 
    props.status === 'active' ? '#e8f5e9' : 
    props.status === 'blocked' ? '#ffebee' : '#fff3e0'};
  
  color: ${props => 
    props.status === 'active' ? '#4caf50' : 
    props.status === 'blocked' ? '#d32f2f' : '#ff9800'};
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  background-color: ${props => 
    props.status === 'active' ? '#d32f2f' : 
    props.status === 'blocked' ? '#4caf50' : '#00acc1'};
  
  color: #ffffff;
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;

export default UsersContent;