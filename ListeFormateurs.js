import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import styled from 'styled-components';

// Styled Components (unchanged)
const Container = styled.div`
  padding: 20px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  color: #2c3e50;
`;

const Title = styled.h2`
  margin-bottom: 20px;
  color: #1e3b70;
  font-size: 1.8rem;
`;

const SearchBar = styled.div`
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
`;

const SearchInput = styled.input`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  flex: 1;
  font-size: 0.95rem;
`;

const FormationSelector = styled.div`
  margin-bottom: 20px;
`;

const FormationSelect = styled.select`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  min-width: 250px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  font-size: 0.95rem;
`;

const Th = styled.th`
  text-align: left;
  padding: 12px;
  background-color: #1e3b70;
  color: white;
  font-weight: 600;
`;

const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid #eee;
`;

const Tr = styled.tr`
  &:hover {
    background-color: #f5f5f5;
  }
  &:nth-child(even) {
    background-color: #f9f9f9;
  }
`;

const StatusBadge = styled.span`
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  background-color: #4caf50;
  color: white;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  gap: 5px;
`;

const PageButton = styled.button`
  padding: 8px 12px;
  border: 1px solid #ddd;
  background-color: ${props => props.active ? '#1e3b70' : 'white'};
  color: ${props => props.active ? 'white' : '#333'};
  border-radius: 5px;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.active ? '#1e3b70' : '#f5f5f5'};
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const EmptyState = styled.div`
  padding: 30px;
  text-align: center;
  color: #777;
  font-style: italic;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  
  &::after {
    content: "";
    width: 40px;
    height: 40px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid #1e3b70;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ListeEtudiantsFormateur = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [filteredEtudiants, setFilteredEtudiants] = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormation, setSelectedFormation] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Get logged-in formateur from localStorage
  const formateurConnecte = JSON.parse(localStorage.getItem('formateur')) || {};

  useEffect(() => {
    if (!formateurConnecte.uid) {
      console.error('Aucun formateur connecté trouvé dans le localStorage');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        console.log('ListeEtudiantsFormateur: Fetching data for formateur:', formateurConnecte.uid);

        // 1. Fetch formations from categories
        const categoriesRef = ref(db, 'categories');
        const categoriesSnapshot = await get(categoriesRef);
        console.log('ListeEtudiantsFormateur: Categories snapshot received:', categoriesSnapshot.exists());

        if (!categoriesSnapshot.exists()) {
          console.log('ListeEtudiantsFormateur: No categories found');
          setFormations([]);
          setEtudiants([]);
          setFilteredEtudiants([]);
          setLoading(false);
          return;
        }

        const categoriesData = categoriesSnapshot.val();
        console.log('ListeEtudiantsFormateur: categoriesData:', categoriesData);

        let allFormations = [];
        Object.entries(categoriesData).forEach(([categoryId, category]) => {
          const categoryFormations = category.formations || {};
          Object.entries(categoryFormations).forEach(([formationId, formation]) => {
            if (
              formation.formateurId === formateurConnecte.uid &&
              formation.categorieId &&
              (formation.statut === 'validée' || formation.etape === 'pré-validée')
            ) {
              allFormations.push({
                id: formationId,
                categoryId,
                categoryName: category.nom || categoryId,
                intitule: formation.intitule || formation.titre || formation.specialite || formation.nom || 'Formation sans nom',
                ...formation,
              });
            }
          });
        });

        console.log('ListeEtudiantsFormateur: Filtered formations:', allFormations);
        if (allFormations.length === 0) {
          console.log('ListeEtudiantsFormateur: No formations found for formateur');
          setFormations([]);
          setEtudiants([]);
          setFilteredEtudiants([]);
          setLoading(false);
          return;
        }

        setFormations(allFormations);

        // 2. Fetch inscriptions for formateur's formations
        const formationIds = allFormations.map(f => f.id);
        const inscriptionsRef = ref(db, 'inscriptions');
        const inscriptionsSnapshot = await get(inscriptionsRef);
        console.log('ListeEtudiantsFormateur: Inscriptions snapshot received:', inscriptionsSnapshot.exists());

        const inscriptionsData = inscriptionsSnapshot.val() || {};
        console.log('ListeEtudiantsFormateur: inscriptionsData:', inscriptionsData);

        if (!inscriptionsSnapshot.exists()) {
          console.log('ListeEtudiantsFormateur: No inscriptions found');
          setEtudiants([]);
          setFilteredEtudiants([]);
          setLoading(false);
          return;
        }

        const allInscriptions = [];
        Object.entries(inscriptionsData).forEach(([etudiantId, inscriptions]) => {
          Object.entries(inscriptions).forEach(([inscriptionId, inscriptionData]) => {
            const formationId = inscriptionData.idFormation || inscriptionData.formationId;
            if (formationId && formationIds.includes(formationId)) {
              allInscriptions.push({
                id: `${etudiantId}_${inscriptionId}`,
                idEtudiant: etudiantId,
                idFormation: formationId,
                dateInscription: inscriptionData.dateInscription || 'Non spécifiée',
              });
            }
          });
        });

        console.log('ListeEtudiantsFormateur: Formateur inscriptions:', allInscriptions);
        if (allInscriptions.length === 0) {
          console.log('ListeEtudiantsFormateur: No inscriptions for formateur formations');
          setEtudiants([]);
          setFilteredEtudiants([]);
          setLoading(false);
          return;
        }

        // 3. Fetch student data
        const etudiantsRef = ref(db, 'utilisateurs/etudiants');
        const etudiantsSnapshot = await get(etudiantsRef);
        console.log('ListeEtudiantsFormateur: Etudiants snapshot received:', etudiantsSnapshot.exists());

        const etudiantsData = etudiantsSnapshot.val() || {};
        console.log('ListeEtudiantsFormateur: etudiantsData:', etudiantsData);

        if (!etudiantsSnapshot.exists()) {
          console.log('ListeEtudiantsFormateur: No students found');
          setEtudiants([]);
          setFilteredEtudiants([]);
          setLoading(false);
          return;
        }

        const etudiantsList = allInscriptions.map(inscription => {
          const etudiant = etudiantsData[inscription.idEtudiant] || {};
          return {
            id: inscription.idEtudiant,
            inscriptionId: inscription.id,
            nom: etudiant.nom || 'N/A',
            prenom: etudiant.prenom || 'N/A',
            email: etudiant.email || 'N/A',
            numTel: etudiant.numTel || etudiant.numtel || 'N/A',
            niveau: etudiant.niveau || 'N/A',
            status: etudiant.status || 'active',
            dateInscription: inscription.dateInscription,
            formationId: inscription.idFormation,
          };
        });

        console.log('ListeEtudiantsFormateur: Enrolled students:', etudiantsList);
        setEtudiants(etudiantsList);
        setFilteredEtudiants(etudiantsList);
        setLoading(false);
      } catch (error) {
        console.error('ListeEtudiantsFormateur: General error:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [formateurConnecte.uid]);

  // Filter students based on search and formation
  useEffect(() => {
    let result = [...etudiants];
    
    if (searchTerm) {
      result = result.filter(
        etudiant => 
          (etudiant.nom?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (etudiant.prenom?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (etudiant.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (selectedFormation !== 'all') {
      result = result.filter(etudiant => etudiant.formationId === selectedFormation);
    }
    
    setFilteredEtudiants(result);
    setCurrentPage(1);
  }, [searchTerm, selectedFormation, etudiants]);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEtudiants.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEtudiants.length / itemsPerPage);

  // Get formation name
  const getFormationName = (formationId) => {
    const formation = formations.find(f => f.id === formationId);
    return formation ? (formation.intitule || formation.titre || formation.specialite || formation.nom || 'Formation sans nom') : 'Formation inconnue';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container>
      <Title>Liste des étudiants inscrits à vos formations</Title>

      <SearchBar>
        <SearchInput 
          type="text" 
          placeholder="Rechercher un étudiant..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchBar>

      <FormationSelector>
        <FormationSelect 
          value={selectedFormation}
          onChange={(e) => setSelectedFormation(e.target.value)}
        >
          <option value="all">Toutes les formations</option>
          {formations.map((formation) => (
            <option key={formation.id} value={formation.id}>
              {formation.intitule || formation.titre || formation.specialite || formation.nom || 'Formation sans nom'}
            </option>
          ))}
        </FormationSelect>
      </FormationSelector>

      {currentItems.length > 0 ? (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Nom</Th>
                <Th>Prénom</Th>
                <Th>Email</Th>
                <Th>Téléphone</Th>
                <Th>Niveau</Th>
                <Th>Formation</Th>
                <Th>Date d'inscription</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((etudiant) => (
                <Tr key={etudiant.inscriptionId}>
                  <Td>{etudiant.nom}</Td>
                  <Td>{etudiant.prenom}</Td>
                  <Td>{etudiant.email}</Td>
                  <Td>{etudiant.numTel}</Td>
                  <Td>{etudiant.niveau}</Td>
                  <Td>{getFormationName(etudiant.formationId)}</Td>
                  <Td>{typeof etudiant.dateInscription === 'string' && etudiant.dateInscription.includes('T')
                      ? new Date(etudiant.dateInscription).toLocaleDateString('fr-FR')
                      : etudiant.dateInscription}</Td>
                  <Td>
                    <StatusBadge>Actif</StatusBadge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          
          <Pagination>
            <PageButton 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              «
            </PageButton>
            
            {[...Array(totalPages).keys()].map(number => (
              <PageButton
                key={number + 1}
                active={currentPage === number + 1}
                onClick={() => setCurrentPage(number + 1)}
              >
                {number + 1}
              </PageButton>
            ))}
            
            <PageButton 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              »
            </PageButton>
          </Pagination>
        </>
      ) : (
        <EmptyState>
          {searchTerm || selectedFormation !== 'all' 
            ? "Aucun étudiant ne correspond aux critères de recherche"
            : "Aucun étudiant n'est inscrit à vos formations"}
        </EmptyState>
      )}
    </Container>
  );
};

export default ListeEtudiantsFormateur;