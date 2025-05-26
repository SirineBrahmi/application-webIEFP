
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getDatabase, ref, onValue, update } from 'firebase/database';

const AdminInscriptions = () => {
  const [inscriptions, setInscriptions] = useState(null);
  const [formations, setFormations] = useState({});
  const [formationsWithPlaces, setFormationsWithPlaces] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInscription, setSelectedInscription] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const db = getDatabase();
    const inscriptionsRef = ref(db, 'inscriptions');
    const categoriesRef = ref(db, 'categories');
    setLoading(true);

    const unsubscribeCategories = onValue(categoriesRef, (snapshot) => {
      try {
        const categoriesData = snapshot.val();
        console.log('AdminInscriptions - Categories snapshot:', categoriesData);
        const allFormations = {};
        if (categoriesData) {
          Object.keys(categoriesData).forEach(categoryKey => {
            const category = categoriesData[categoryKey];
            console.log(`AdminInscriptions - Processing category: ${categoryKey}`, category);
            if (category.formations) {
              Object.keys(category.formations).forEach(formationId => {
                console.log(`AdminInscriptions - Adding formation: ${formationId}`);
                allFormations[formationId] = {
                  ...category.formations[formationId],
                  categorieId: categoryKey,
                  nomCategorie: category.nom || categoryKey,
                };
              });
            }
          });
        } else {
          console.warn('AdminInscriptions - No categories data found');
        }
        setFormations(allFormations);
        console.log('AdminInscriptions - Formations set:', allFormations);
      } catch (err) {
        console.error('AdminInscriptions - Error processing categories:', err);
        setError(err.message);
      }
    }, (error) => {
      console.error('AdminInscriptions - Firebase error (categories):', error);
      setError(error.message);
    });

    const unsubscribeInscriptions = onValue(inscriptionsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        console.log('AdminInscriptions - Inscriptions snapshot:', data);
        setInscriptions(data);
        setLoading(false);
      } catch (err) {
        console.error('AdminInscriptions - Error processing inscriptions:', err);
        setError(err.message);
        setLoading(false);
      }
    }, (error) => {
      console.error('AdminInscriptions - Firebase error (inscriptions):', error);
      setError(error.message);
      setLoading(false);
    });

    return () => {
      unsubscribeInscriptions();
      unsubscribeCategories();
    };
  }, []);

  useEffect(() => {
    if (formations && inscriptions) {
      console.log('AdminInscriptions - Updating formations with places', { formations, inscriptions });
      const formationsWithRemainingPlaces = {};
      Object.keys(formations).forEach(formationId => {
        const formation = formations[formationId];
        formationsWithRemainingPlaces[formationId] = {
          ...formation,
          inscriptionsCount: 0,
          remainingPlaces: parseInt(formation.places || 0, 10),
        };
      });

      if (inscriptions) {
        Object.keys(inscriptions).forEach(userId => {
          Object.keys(inscriptions[userId]).forEach(inscriptionId => {
            const inscription = inscriptions[userId][inscriptionId];
            const formationId = inscription.formationId;
            if (
              formationId &&
              inscription.statut === 'validé' &&
              formationsWithRemainingPlaces[formationId]
            ) {
              formationsWithRemainingPlaces[formationId].inscriptionsCount += 1;
              formationsWithRemainingPlaces[formationId].remainingPlaces -= 1;
            }
          });
        });
      }

      setFormationsWithPlaces(formationsWithRemainingPlaces);
      console.log('AdminInscriptions - Formations with places updated:', formationsWithRemainingPlaces);
    }
  }, [formations, inscriptions]);

  const refreshData = () => {
    setLoading(true);
    const db = getDatabase();
    const inscriptionsRef = ref(db, 'inscriptions');
    const categoriesRef = ref(db, 'categories');

    onValue(categoriesRef, (snapshot) => {
      try {
        const categoriesData = snapshot.val();
        console.log('AdminInscriptions - Refresh categories snapshot:', categoriesData);
        const allFormations = {};
        if (categoriesData) {
          Object.keys(categoriesData).forEach(categoryKey => {
            const category = categoriesData[categoryKey];
            console.log(`AdminInscriptions - Refresh processing category: ${categoryKey}`);
            if (category.formations) {
              Object.keys(category.formations).forEach(formationId => {
                console.log(`AdminInscriptions - Refresh adding formation: ${formationId}`);
                allFormations[formationId] = {
                  ...category.formations[formationId],
                  categorieId: categoryKey,
                  nomCategorie: category.nom || categoryKey,
                };
              });
            }
          });
        } else {
          console.warn('AdminInscriptions - Refresh: No categories data found');
        }
        setFormations(allFormations);
        console.log('AdminInscriptions - Refresh formations set:', allFormations);
      } catch (err) {
        console.error('AdminInscriptions - Refresh error (categories):', err);
        setError(err.message);
      }
    }, (error) => {
      console.error('AdminInscriptions - Refresh Firebase error (categories):', error);
      setError(error.message);
    });

    onValue(inscriptionsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        console.log('AdminInscriptions - Refresh inscriptions snapshot:', data);
        setInscriptions(data);
        setLoading(false);
      } catch (err) {
        console.error('AdminInscriptions - Refresh error (inscriptions):', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('AdminInscriptions - Refresh Firebase error (inscriptions):', error);
      setError(error.message);
      setLoading(false);
    });
  };

  const getFormationTitle = (formationId) => {
    if (!formations) {
      console.warn('AdminInscriptions - getFormationTitle: Formations not loaded yet');
      return 'Chargement...';
    }
    if (formations[formationId]) {
      const title = formations[formationId].titre || formations[formationId].intitule || 'Titre non disponible';
      console.log(`AdminInscriptions - getFormationTitle: ${formationId} -> ${title}`);
      return title;
    }
    console.warn(`AdminInscriptions - getFormationTitle: Formation not found for ID ${formationId}`);
    return 'Formation non trouvée';
  };

  const getRemainingPlaces = (formationId) => {
    if (!formationsWithPlaces || !formationId || !formationsWithPlaces[formationId]) {
      console.warn(`AdminInscriptions - getRemainingPlaces: No data for formation ${formationId}`);
      return 'N/A';
    }
    const places = formationsWithPlaces[formationId].remainingPlaces;
    console.log(`AdminInscriptions - getRemainingPlaces: ${formationId} -> ${places}`);
    return places;
  };

  const isFormationFull = (formationId) => {
    if (!formationsWithPlaces || !formationId || !formationsWithPlaces[formationId]) {
      console.warn(`AdminInscriptions - isFormationFull: No data for formation ${formationId}`);
      return false;
    }
    const isFull = formationsWithPlaces[formationId].remainingPlaces <= 0;
    console.log(`AdminInscriptions - isFormationFull: ${formationId} -> ${isFull}`);
    return isFull;
  };

  const handleStatusChange = async (userId, inscriptionId, newStatus, formationId) => {
    console.log(`AdminInscriptions - handleStatusChange: ${userId}/${inscriptionId} -> ${newStatus}, formation: ${formationId}`);
    if (newStatus === 'validé' && isFormationFull(formationId) && 
        (!selectedInscription || selectedInscription.data.statut !== 'validé')) {
      console.warn('AdminInscriptions - Cannot validate: Formation is full');
      alert('Impossible de valider cette inscription : la formation est complète.');
      return;
    }

    if (window.confirm(`Êtes-vous sûr de vouloir marquer cette inscription comme "${newStatus}" ?`)) {
      setLoading(true);
      try {
        const db = getDatabase();
        const inscriptionRef = ref(db, `inscriptions/${userId}/${inscriptionId}`);
        await update(inscriptionRef, { statut: newStatus });
        console.log('AdminInscriptions - Status updated in Firebase');

        const updatedInscriptions = { ...inscriptions };
        if (!updatedInscriptions[userId]) updatedInscriptions[userId] = {};
        updatedInscriptions[userId][inscriptionId] = {
          ...updatedInscriptions[userId][inscriptionId],
          statut: newStatus,
        };
        setInscriptions(updatedInscriptions);
        console.log('AdminInscriptions - Local inscriptions state updated');

        if (
          selectedInscription &&
          selectedInscription.userId === userId &&
          selectedInscription.inscriptionId === inscriptionId
        ) {
          setSelectedInscription({
            ...selectedInscription,
            data: { ...selectedInscription.data, statut: newStatus },
          });
          console.log('AdminInscriptions - Selected inscription updated');
        }

        alert(`Statut modifié avec succès en "${newStatus}"`);
      } catch (error) {
        console.error('AdminInscriptions - Error updating status:', error);
        alert(`Erreur lors de la mise à jour : ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const prepareInscriptionsData = () => {
    if (!inscriptions) {
      console.warn('AdminInscriptions - prepareInscriptionsData: No inscriptions data');
      return [];
    }
    const flattenedInscriptions = [];

    Object.keys(inscriptions).forEach(userId => {
      if (inscriptions[userId]) {
        Object.keys(inscriptions[userId]).forEach(inscriptionId => {
          const inscriptionData = inscriptions[userId][inscriptionId];
          if (filter === 'all' || inscriptionData.statut === filter) {
            flattenedInscriptions.push({
              userId,
              inscriptionId,
              data: inscriptionData,
            });
          }
        });
      }
    });

    const sorted = flattenedInscriptions.sort(
      (a, b) => new Date(b.data.dateInscription) - new Date(a.data.dateInscription)
    );
    console.log('AdminInscriptions - prepareInscriptionsData: Sorted inscriptions', sorted);
    return sorted;
  };

  const handleShowDetails = (inscription) => {
    console.log('AdminInscriptions - Showing details for inscription:', inscription);
    setSelectedInscription(inscription);
  };

  const formatDate = (dateString) => {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    const formatted = new Date(dateString).toLocaleDateString('fr-FR', options);
    console.log(`AdminInscriptions - formatDate: ${dateString} -> ${formatted}`);
    return formatted;
  };

  const closeDetails = () => {
    console.log('AdminInscriptions - Closing details modal');
    setSelectedInscription(null);
  };

  const inscriptionsData = prepareInscriptionsData();

  return (
    <Container>
      <Header>
        <h2>Gestion des Inscriptions</h2>
        <FilterContainer>
          <FilterLabel>Filtrer par statut :</FilterLabel>
          <FilterSelect value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Tous</option>
            <option value="en attente">En attente</option>
            <option value="validé">Validé</option>
            <option value="refusé">Refusé</option>
          </FilterSelect>
          <RefreshButton onClick={refreshData}>🔄 Actualiser</RefreshButton>
        </FilterContainer>
      </Header>

      {loading ? (
        <LoadingIndicator>Chargement des inscriptions...</LoadingIndicator>
      ) : error ? (
        <ErrorMessage>Erreur : {error}</ErrorMessage>
      ) : inscriptionsData.length === 0 ? (
        <EmptyMessage>
          Aucune inscription {filter !== 'all' ? `avec le statut "${filter}"` : ''} trouvée.
        </EmptyMessage>
      ) : (
        <InscriptionsTable>
          <thead>
            <tr>
              <th>Étudiant</th>
              <th>Formation</th>
              <th>Places Restantes</th>
              <th>Date d'inscription</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inscriptionsData.map((inscription) => (
              <TableRow
                key={inscription.inscriptionId}
                status={inscription.data.statut}
                full={isFormationFull(inscription.data.formationId) && inscription.data.statut !== 'validé'}
              >
                <td>{`${inscription.data.etudiant?.prenom || ''} ${inscription.data.etudiant?.nom || ''}`}</td>
                <td>
                  {inscription.data.formationId
                    ? getFormationTitle(inscription.data.formationId)
                    : 'Formation non spécifiée'}
                </td>
                <td>
                  <PlacesBadge full={isFormationFull(inscription.data.formationId)}>
                    {getRemainingPlaces(inscription.data.formationId)}
                  </PlacesBadge>
                </td>
                <td>{formatDate(inscription.data.dateInscription)}</td>
                <td>
                  <StatusBadge status={inscription.data.statut}>
                    {inscription.data.statut}
                  </StatusBadge>
                </td>
                <td>
                  <ButtonGroup>
                    <ActionButton onClick={() => handleShowDetails(inscription)}>
                      👁️ Détails
                    </ActionButton>
                    {inscription.data.statut === 'en attente' && (
                      <>
                        <ActionButton
                          success
                          disabled={isFormationFull(inscription.data.formationId)}
                          onClick={() =>
                            handleStatusChange(
                              inscription.userId,
                              inscription.inscriptionId,
                              'validé',
                              inscription.data.formationId
                            )
                          }
                        >
                          ✓ Valider
                        </ActionButton>
                        <ActionButton
                          danger
                          onClick={() =>
                            handleStatusChange(
                              inscription.userId,
                              inscription.inscriptionId,
                              'refusé',
                              inscription.data.formationId
                            )
                          }
                        >
                          ✕ Refuser
                        </ActionButton>
                      </>
                    )}
                    {inscription.data.statut === 'validé' && (
                      <ActionButton
                        danger
                        onClick={() =>
                          handleStatusChange(
                            inscription.userId,
                            inscription.inscriptionId,
                            'refusé',
                            inscription.data.formationId
                          )
                        }
                      >
                        ✕ Annuler
                      </ActionButton>
                    )}
                    {inscription.data.statut === 'refusé' && (
                      <ActionButton
                        success
                        disabled={isFormationFull(inscription.data.formationId)}
                        onClick={() =>
                          handleStatusChange(
                            inscription.userId,
                            inscription.inscriptionId,
                            'validé',
                            inscription.data.formationId
                          )
                        }
                      >
                        ✓ Valider
                      </ActionButton>
                    )}
                  </ButtonGroup>
                </td>
              </TableRow>
            ))}
          </tbody>
        </InscriptionsTable>
      )}

      {selectedInscription && (
        <DetailModal>
          <ModalContent>
            <ModalHeader>
              <h3>Détails de l'Inscription</h3>
              <CloseButton onClick={closeDetails}>✕</CloseButton>
            </ModalHeader>
            <ModalBody>
              <DetailSection>
                <SectionTitle>Informations de l'étudiant</SectionTitle>
                <DetailRow>
                  <DetailLabel>Nom :</DetailLabel>
                  <DetailValue>{selectedInscription.data.etudiant?.nom || 'Non spécifié'}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Prénom :</DetailLabel>
                  <DetailValue>{selectedInscription.data.etudiant?.prenom || 'Non spécifié'}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Email :</DetailLabel>
                  <DetailValue>{selectedInscription.data.etudiant?.email || 'Non spécifié'}</DetailValue>
                </DetailRow>
              </DetailSection>
              <DetailSection>
                <SectionTitle>Informations de la formation</SectionTitle>
                <DetailRow>
                  <DetailLabel>Formation :</DetailLabel>
                  <DetailValue>
                    {selectedInscription.data.formationId
                      ? getFormationTitle(selectedInscription.data.formationId)
                      : 'Non spécifié'}
                  </DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Places restantes :</DetailLabel>
                  <DetailValue>
                    <PlacesBadge full={isFormationFull(selectedInscription.data.formationId)}>
                      {getRemainingPlaces(selectedInscription.data.formationId)}
                    </PlacesBadge>
                  </DetailValue>
                </DetailRow>
              </DetailSection>
              <DetailSection>
                <SectionTitle>Détails de l'inscription</SectionTitle>
                <DetailRow>
                  <DetailLabel>Date d'inscription :</DetailLabel>
                  <DetailValue>{formatDate(selectedInscription.data.dateInscription)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Statut actuel :</DetailLabel>
                  <DetailValue>
                    <StatusBadge status={selectedInscription.data.statut}>
                      {selectedInscription.data.statut}
                    </StatusBadge>
                  </DetailValue>
                </DetailRow>
                {selectedInscription.data.profil && (
                  <DetailRow>
                    <DetailLabel>Profil :</DetailLabel>
                    <DetailValue>{selectedInscription.data.profil}</DetailValue>
                  </DetailRow>
                )}
              </DetailSection>
              {selectedInscription.data.documents && (
                <DetailSection>
                  <SectionTitle>Documents fournis</SectionTitle>
                  {Object.entries(selectedInscription.data.documents).map(([docType, docUrl]) => (
                    <DocumentItem key={docType}>
                      <DocumentLabel>{docType} :</DocumentLabel>
                      <DocumentPreview>
                        {docUrl.match(/\.(jpg|png|jpeg)$/i) ? (
                          <img src={docUrl} alt={docType} width="100" />
                        ) : (
                          <DocumentLink href={docUrl} target="_blank" rel="noopener noreferrer">
                            Voir le document
                          </DocumentLink>
                        )}
                      </DocumentPreview>
                    </DocumentItem>
                  ))}
                </DetailSection>
              )}
            </ModalBody>
            <ModalFooter>
              <ButtonGroup>
                {selectedInscription.data.statut === 'en attente' && (
                  <>
                    <ActionButton
                      success
                      disabled={isFormationFull(selectedInscription.data.formationId)}
                      onClick={() =>
                        handleStatusChange(
                          selectedInscription.userId,
                          selectedInscription.inscriptionId,
                          'validé',
                          selectedInscription.data.formationId
                        )
                      }
                    >
                      ✓ Valider cette inscription
                    </ActionButton>
                    <ActionButton
                      danger
                      onClick={() =>
                        handleStatusChange(
                          selectedInscription.userId,
                          selectedInscription.inscriptionId,
                          'refusé',
                          selectedInscription.data.formationId
                        )
                      }
                    >
                      ✕ Refuser cette inscription
                    </ActionButton>
                  </>
                )}
                {selectedInscription.data.statut === 'validé' && (
                  <ActionButton
                    danger
                    onClick={() =>
                      handleStatusChange(
                        selectedInscription.userId,
                        selectedInscription.inscriptionId,
                        'refusé',
                        selectedInscription.data.formationId
                      )
                    }
                  >
                    ✕ Annuler cette inscription
                  </ActionButton>
                )}
                {selectedInscription.data.statut === 'refusé' && (
                  <ActionButton
                    success
                    disabled={isFormationFull(selectedInscription.data.formationId)}
                    onClick={() =>
                      handleStatusChange(
                        selectedInscription.userId,
                        selectedInscription.inscriptionId,
                        'validé',
                        selectedInscription.data.formationId
                      )
                    }
                  >
                    ✓ Valider cette inscription
                  </ActionButton>
                )}
                <ActionButton onClick={closeDetails}>Fermer</ActionButton>
              </ButtonGroup>
            </ModalFooter>
          </ModalContent>
        </DetailModal>
      )}
    </Container>
  );
};

// Styled components (unchanged from original)
const Container = styled.div`
  background: linear-gradient(135deg, rgb(227, 236, 239), rgb(227, 242, 244));
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;

  h2 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    background: linear-gradient(90deg, #00acc1, #4caf50);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const FilterLabel = styled.span`
  font-weight: 500;
  color: #263238;
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

const RefreshButton = styled.button`
  background: rgb(195, 224, 252);
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: rgb(17, 16, 16);
  font-weight: 500;
  transition: all 0.3s ease;

  &:hover {
    background: rgb(146, 141, 137);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 30px;
  font-size: 1.2rem;
  font-weight: 500;
  color: #263238;
`;

const ErrorMessage = styled.div`
  background: #ffebee;
  color: #d32f2f;
  padding: 15px;
  border-radius: 8px;
  margin: 15px 0;
  font-weight: 500;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 40px;
  font-size: 1.1rem;
  font-weight: 500;
  color: #263238;
`;

const InscriptionsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  th {
    background-color: rgb(86, 153, 241);
    padding: 15px 20px;
    text-align: left;
    color: #ffffff;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  td {
    padding: 15px 20px;
    color: #263238;
    border-bottom: 1px solid #e0e0e0;
  }
`;

const TableRow = styled.tr`
  transition: all 0.3s ease;

  background-color: ${(props) => {
    if (props.full && props.status === 'en attente') return '#ffebee';
    if (props.status === 'en attente') return '#fff3e0';
    if (props.status === 'validé') return '#e8f5e9';
    if (props.status === 'refusé') return '#ffebee';
    return '#ffffff';
  }};

  &:hover {
    background-color: ${(props) => {
      if (props.full && props.status === 'en attente') return '#ffcdd2';
      if (props.status === 'en attente') return '#ffe0b2';
      if (props.status === 'validé') return '#c8e6c9';
      if (props.status === 'refusé') return '#ffcdd2';
      return '#f1f8ff';
    }};
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
  text-transform: uppercase;

  background-color: ${(props) =>
    props.status === 'en attente'
      ? '#fff3e0'
      : props.status === 'validé'
      ? '#e8f5e9'
      : '#ffebee'};
  
  color: ${(props) =>
    props.status === 'en attente'
      ? '#ff9800'
      : props.status === 'validé'
      ? '#4caf50'
      : '#d32f2f'};
`;

const PlacesBadge = styled.span`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: 500;
  background-color: ${(props) => (props.full ? '#d32f2f' : '#4caf50')};
  color: #ffffff;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  background: ${(props) => {
    if (props.success) return props.disabled ? '#e0e0e0' : '#4caf50';
    if (props.danger) return '#d32f2f';
    return '#00acc1';
  }};
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};

  &:hover {
    opacity: ${(props) => (props.disabled ? 0.6 : 0.9)};
    transform: ${(props) => (props.disabled ? 'none' : 'translateY(-2px)')};
    box-shadow: ${(props) => (props.disabled ? 'none' : '0 4px 8px rgba(0, 0, 0, 0.15)')};
  }
`;

const DetailModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #ffffff;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;

  h3 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #00acc1;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #263238;
  transition: all 0.3s ease;

  &:hover {
    color: #00acc1;
  }
`;

const ModalBody = styled.div`
  padding: 20px;
  overflow-y: auto;
  max-height: calc(90vh - 130px);
`;

const ModalFooter = styled.div`
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const DetailSection = styled.div`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h4`
  margin: 0 0 15px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid transparent;
  background: linear-gradient(90deg, #00acc1, #4caf50);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-weight: 700;
`;

const DetailRow = styled.div`
  display: flex;
  margin-bottom: 12px;
  align-items: center;
`;

const DetailLabel = styled.span`
  font-weight: 600;
  min-width: 150px;
  color: #263238;
`;

const DetailValue = styled.span`
  color: #263238;
  font-weight: 500;
`;

const DocumentItem = styled.div`
  margin-bottom: 20px;
`;

const DocumentLabel = styled.div`
  font-weight: 600;
  margin-bottom: 8px;
  text-transform: capitalize;
  color: #263238;
`;

const DocumentPreview = styled.div`
  max-width: 300px;

  img {
    max-width: 100%;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 5px;
  }
`;

const DocumentLink = styled.a`
  display: inline-block;
  padding: 8px 16px;
  background: rgb(116, 178, 187);
  color: #ffffff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;

  &:hover {
    background: #00838f;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;

export default AdminInscriptions;
