
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, ref } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";
import styled from "styled-components";
import DepotDocuments from "../DepotDocuments";
const CourseRegistrationContent = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formations, setFormations] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [formateurs, setFormateurs] = useState({});
  const [selectedFormation, setSelectedFormation] = useState(null);

  console.log("[CourseRegistrationContent] Render, user:", user);

  // Fetch inscriptions
  const fetchInscriptions = useCallback(
    async (uid, validFormationIds) => {
      if (!uid) {
        console.log("[CourseRegistrationContent] No UID for inscriptions");
        setError("Identifiant étudiant manquant");
        setInscriptions([]);
        return;
      }

      console.log("[CourseRegistrationContent] Fetching /inscriptions/", uid);
      try {
        const inscriptionsRef = ref(db, `inscriptions/${uid}`);
        const snapshot = await get(inscriptionsRef);
        const inscriptionsData = [];

        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const inscription = {
              id: childSnapshot.key,
              ...childSnapshot.val(),
            };
            const formationId = inscription.formationId || inscription.idFormation;
            if (formationId && validFormationIds.includes(formationId)) {
              inscriptionsData.push(inscription);
            } else {
              console.warn(
                "[CourseRegistrationContent] Skipped invalid inscription:",
                inscription.id,
                "formationId:",
                formationId
              );
            }
          });
        }

        console.log("[CourseRegistrationContent] Valid inscriptions:", inscriptionsData);
        setInscriptions(inscriptionsData);

        if (inscriptionsData.length === 0) {
          setError("Aucune inscription enregistrée pour votre compte.");
        }
      } catch (err) {
        console.error("[CourseRegistrationContent] Inscription error:", err);
        setError(`Erreur lors de la récupération des inscriptions: ${err.message}`);
      }
    },
    []
  );

  useEffect(() => {
    console.log("[CourseRegistrationContent] Auth listener");
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const storedUser = JSON.parse(localStorage.getItem("etudiant") || "{}");
      console.log("[CourseRegistrationContent] Stored user:", storedUser);

      if (firebaseUser) {
        console.log("[CourseRegistrationContent] Authenticated, uid:", firebaseUser.uid);
        const updatedUser = {
          uid: firebaseUser.uid,
          prenom: storedUser.prenom || "",
          nom: storedUser.nom || "",
          email: storedUser.email || firebaseUser.email || "",
          role: "etudiant", // Ensure role is set
          ...storedUser,
        };
        setUser(updatedUser);
        localStorage.setItem("etudiant", JSON.stringify(updatedUser));
      } else {
        console.log("[CourseRegistrationContent] No auth user, checking localStorage");
        if (storedUser.uid) {
          const updatedUser = {
            uid: storedUser.uid,
            prenom: storedUser.prenom || "",
            nom: storedUser.nom || "",
            email: storedUser.email || "",
            role: "etudiant", // Ensure role is set
            ...storedUser,
          };
          setUser(updatedUser);
          localStorage.setItem("etudiant", JSON.stringify(updatedUser));
        } else {
          setUser({});
        }
      }
    });
    return () => {
      console.log("[CourseRegistrationContent] Auth cleanup");
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user === null) {
      console.log("[CourseRegistrationContent] User loading");
      return;
    }

    const fetchData = async () => {
      console.log("[CourseRegistrationContent] fetchData, uid:", user?.uid);
      try {
        setLoading(true);

        // 1. Fetch formateurs
        console.log("[db] Fetching /utilisateurs/formateurs");
        const formateursRef = ref(db, "utilisateurs/formateurs");
        const formateursSnapshot = await get(formateursRef);
        const formateursData = {};

        if (formateursSnapshot.exists()) {
          formateursSnapshot.forEach((childSnapshot) => {
            formateursData[childSnapshot.key] = childSnapshot.val();
            console.log("[Formateur:", childSnapshot.key);
          });
        }
        setFormateurs(formateursData);

        // 2. Fetch categories and formations
        console.log("[db] Fetching /categories");
        const categoriesRef = ref(db, "categories");
        const categoriesSnapshot = await get(categoriesRef);
        const categoriesList = [{ id: "001", nom: "Tous les catégories" }];
        const formationsMap = new Map();

        if (categoriesSnapshot.exists()) {
          categoriesSnapshot.forEach((childSnapshot) => {
            const categoryId = childSnapshot.key;
            const categoryData = childSnapshot.val();
            const categoryName = categoryData.nom || categoryId;

            console.log("[Category:", categoryId, categoryName);
            if (["Toutes les formations", "Mes formations"].includes(categoryName)) {
              return;
            }
            categoriesList.push({ id: categoryId, nom: categoryName });

            if (categoryData.formations) {
              Object.entries(categoryData.formations).forEach(([formationId, formation]) => {
                if (["active", "validée", "publiée"].includes(formation.statut)) {
                  formationsMap.set(formationId, {
                    id: formationId,
                    categoryId,
                    categoryName,
                    formateurId: formation.formateurId || "",
                    titre: formation.titre || formation.intitule || "Sans titre",
                    description: formation.description || "Aucune description",
                    duree: formation.duree || "N/A",
                    dateDebut: formation.dateDebut,
                    ...formation,
                  });
                  console.log("[Formation:", formationId);
                }
              });
            }
          });
        }

        const allFormations = Array.from(formationsMap.values());
        setCategories(categoriesList);
        setFormations(allFormations);
        console.log("[Categories:", categoriesList.length, "Formations:", allFormations.length);

        // 3. Fetch inscriptions
        if (user?.uid) {
          const validFormationIds = allFormations.map((f) => f.id);
          await fetchInscriptions(user.uid, validFormationIds);
        } else {
          console.log("[CourseRegistrationContent] No UID, skipping inscriptions");
          setError("Identifiant étudiant manquant");
          setInscriptions([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("[CourseRegistrationContent] Error:", err.message);
        setError("Erreur lors du chargement des données: " + err.message);
        setLoading(false);
      }
    };

    fetchData();

    // Success message
    const successMessage = localStorage.getItem("inscriptionSuccess");
    if (successMessage) {
      console.log("[Success:", successMessage);
      setSuccess(successMessage);
      localStorage.removeItem("inscriptionSuccess");
      setTimeout(() => setSuccess(""), 5000);
    }
  }, [user, fetchInscriptions]);

  const formatDate = (dateString) => {
    if (!dateString) return "Non spécifiée";
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? dateString : date.toLocaleDateString("fr-FR");
    } catch {
      return dateString;
    }
  };

  const handleEnroll = (formationId) => {
    console.log("Enroll:", formationId, "uid:", user?.uid);
    if (!user?.uid) {
      localStorage.setItem("redirectAfterLogin", `/etudiant/depot-documents/${formationId}`);
      navigate("/etudiant-login");
    } else {
      navigate(`/etudiant/depot-documents/${formationId}`);
    }
  };

  const handleViewDetails = (formation) => {
    console.log("[View details:", formation.id);
    setSelectedFormation(formation);
  };

  const closeDetails = () => {
    setSelectedFormation(null);
  };

  const filteredFormations = selectedCategory === "all"
    ? formations
    : formations.filter((f) => f.categoryId === selectedCategory);
  console.log("[Filtered:", filteredFormations.length);

  const displayedFormations = activeTab === "all"
    ? filteredFormations
    : filteredFormations.filter((f) =>
        inscriptions.some((i) => (i.formationId || i.idFormation) === f.id)
      );
  console.log("[Displayed:", displayedFormations.length);

  if (loading) {
    return <Loading>Chargement des formations...</Loading>;
  }

  return (
    <ContentCard>
      {user?.prenom && user?.nom && (
        <WelcomeMessage>Bienvenue, {user.prenom} {user.nom}</WelcomeMessage>
      )}
      <h2>Formations disponibles</h2>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      <Filters>
        <label htmlFor="category-filter">Filtrer par catégorie:</label>
        <Select
          id="category-filter"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nom}
            </option>
          ))}
        </Select>
      </Filters>

      <Tabs>
        <Tab active={activeTab === "all"} onClick={() => setActiveTab("all")}>
          Toutes les formations
        </Tab>
        <Tab active={activeTab === "my"} onClick={() => setActiveTab("my")}>
          Mes formations ({inscriptions.length})
        </Tab>
      </Tabs>

      <CoursesGrid>
        {displayedFormations.length > 0 ? (
          displayedFormations.map((formation) => {
            const inscription = inscriptions.find(
              (i) => (i.formationId || i.idFormation) === formation.id
            );
            const formateur = formateurs[formation.formateurId] || { prenom: "", nom: "" };
            const formateurNom = formateur
              ? `${formateur.prenom || ""} ${formateur.nom || ""}`.trim()
              : "Non spécifié";
            console.log("[Card:", formation.id);

            return (
              <CourseCard key={formation.id}>
                <CourseHeader>
                  <h3>{formation.titre || formation.intitule || "Sans titre"}</h3>
                  <CategoryBadge>{formation.categoryName}</CategoryBadge>
                  <div>Formateur: {formateurNom}</div>
                </CourseHeader>
                <CourseDescription>
                  {(formation.description || "Aucune description.").substring(0, 100)}
                  {formation.description?.length > 100 ? "..." : ""}
                </CourseDescription>
                <CourseDetails>
                  <div>
                    <span>⏱️</span> {formation.duree || "N/A"} heures
                  </div>
                  <div>
                    <span>🗓️</span> Début: {formatDate(formation.dateDebut)}
                  </div>
                </CourseDetails>
                <CourseActions>
                  <DetailButton onClick={() => handleViewDetails(formation)}>
                    Voir détails
                  </DetailButton>
                  {inscription && (
                    <Status status={inscription.statut}>{inscription.statut}</Status>
                  )}
                </CourseActions>
              </CourseCard>
            );
          })
        ) : (
          <NoCourses>
            {activeTab === "all"
              ? "Aucune formation disponible dans cette catégorie"
              : "Vous n'êtes inscrit à aucune formation dans cette catégorie"}
          </NoCourses>
        )}
      </CoursesGrid>

      {/* Details Modal */}
      {selectedFormation && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <h2>{selectedFormation.titre || selectedFormation.intitule || "Sans titre"}</h2>
              <CloseButton onClick={closeDetails}>×</CloseButton>
            </ModalHeader>
            <CategoryBadge>{selectedFormation.categoryName}</CategoryBadge>
            {selectedFormation.imageUrl && (
              <FormationImage src={selectedFormation.imageUrl} alt="Formation" />
            )}
            <Section>
              <h3>Description</h3>
              <p>{selectedFormation.description || "Aucune description."}</p>
            </Section>
            <Section>
              <h3>Détails</h3>
              <p><strong>Intitulé:</strong> {selectedFormation.intitule || "N/A"}</p>
              <p><strong>Durée:</strong> {selectedFormation.duree || "N/A"} heures</p>
              <p><strong>Date de début:</strong> {formatDate(selectedFormation.dateDebut)}</p>
              <p><strong>Formateur:</strong> {selectedFormation.formateurNom || "Non spécifié"}</p>
              <p><strong>Email formateur:</strong> {selectedFormation.formateurEmail || "N/A"}</p>
              <p><strong>Matériel:</strong> {selectedFormation.materiel || "N/A"}</p>
              <p><strong>Modalité:</strong> {selectedFormation.modalite === "en_ligne" ? "En ligne" : "Présentiel"}</p>
              <p><strong>Places disponibles:</strong> {selectedFormation.places || "N/A"}</p>
              <p><strong>Prix:</strong> {selectedFormation.prix ? `${selectedFormation.prix} TND` : "N/A"}</p>
            </Section>
            <Section>
              <h3>Modules</h3>
              {selectedFormation.modules && Array.isArray(selectedFormation.modules) && selectedFormation.modules.length > 0 ? (
                <ModuleList>
                  {selectedFormation.modules.map((module, index) => (
                    <ModuleItem key={index}>
                      <strong>{module.titre || `Module ${index + 1}`}</strong>
                      <p><strong>Description:</strong> {module.description || "N/A"}</p>
                      <p><strong>Durée:</strong> {module.duree || "N/A"} heures</p>
                    </ModuleItem>
                  ))}
                </ModuleList>
              ) : (
                <p>Aucun module disponible.</p>
              )}
            </Section>
            <ModalActions>
              {inscriptions.some(
                (i) =>
                  (i.formationId || i.idFormation) === selectedFormation.id &&
                  ["en attente", "validé", "validée"].includes(i.statut)
              ) ? (
                <Status
                  status={
                    inscriptions.find(
                      (i) => (i.formationId || i.idFormation) === selectedFormation.id
                    )?.statut
                  }
                >
                  {
                    inscriptions.find(
                      (i) => (i.formationId || i.idFormation) === selectedFormation.id
                    )?.statut
                  }
                </Status>
              ) : (
                <RegisterButton onClick={() => handleEnroll(selectedFormation.id)}>
                  S'inscrire
                </RegisterButton>
              )}
            </ModalActions>
          </ModalContent>
        </Modal>
      )}
    </ContentCard>
  );
};

// Styles
const ContentCard = styled.div`
  background: white;
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  max-width: 1200px;
  margin: 0 auto;
`;

const WelcomeMessage = styled.h1`
  font-size: 1.8rem;
  color: #1e3b70;
  margin-bottom: 1rem;
`;

const ErrorMessage = styled.div`
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
  text-align: center;
`;

const SuccessMessage = styled.div`
  background-color: #e6ffed;
  color: #2e7d32;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
  text-align: center;
`;

const Filters = styled.div`
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
  font-size: 1rem;
  min-width: 250px;
`;

const Tabs = styled.div`
  display: flex;
  margin: 20px 0;
  border-bottom: 1px solid #dee2e6;
`;

const Tab = styled.div`
  padding: 10px 20px;
  cursor: pointer;
  border-bottom: 3px solid ${(props) => (props.active ? "#dba632" : "transparent")};
  font-weight: ${(props) => (props.active ? "bold" : "normal")};
  color: ${(props) => (props.active ? "#1e3b70" : "#6c757d")};
  transition: all 0.2s;
  &:hover {
    color: #1e3b70;
  }
`;

const CoursesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const CourseCard = styled.div`
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  border-top: 4px solid #dba632;
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-5px);
  }
`;

const CourseHeader = styled.div`
  padding: 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  h3 {
    margin: 0 0 5px 0;
    color: #1e3b70;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  div {
    color: #6c757d;
    font-size: 0.9rem;
  }
`;

const CategoryBadge = styled.span`
  background-color: #e0e0e0;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  color: #555;
`;

const CourseDescription = styled.div`
  padding: 15px;
  flex: 1;
  color: #495057;
  font-size: 0.95rem;
`;

const CourseDetails = styled.div`
  padding: 0 15px 15px;
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #6c757d;
  span {
    margin-right: 5px;
  }
`;

const CourseActions = styled.div`
  padding: 0 15px 15px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const DetailButton = styled.button`
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
  flex: 1;
  &:hover {
    background-color: #2980b9;
  }
`;

const RegisterButton = styled.button`
  background-color: #1e3b70;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background-color: #dba632;
  }
`;

const Status = styled.div`
  padding: 10px 20px;
  border-radius: 4px;
  text-align: center;
  font-weight: bold;
  font-size: 1rem;
  text-transform: capitalize;
  background-color: ${(props) =>
    props.status === "validée" || props.status === "validé"
      ? "#2ecc71"
      : props.status === "en attente"
      ? "#f39c12"
      : props.status === "refusée"
      ? "#e74c3c"
      : "#95a5a6"};
  color: white;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NoCourses = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: #6c757d;
  font-style: italic;
  font-size: 1.1rem;
`;

const Loading = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #1e3b70;
  font-size: 1.2em;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 10px;
  padding: 20px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
`;

const Section = styled.div`
  margin: 15px 0;
  h3 {
    font-size: 1.3rem;
    color: #1e3b70;
    margin-bottom: 10px;
  }
  p {
    color: #495057;
    font-size: 1rem;
  }
`;

const FormationImage = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin-bottom: 15px;
`;

const ModuleList = styled.ul`
  list-style: none;
  padding: 0;
`;

const ModuleItem = styled.li`
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

export default CourseRegistrationContent;