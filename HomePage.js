import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, getDatabase } from 'firebase/database';
import './styles/HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const [homeData, setHomeData] = useState(null);
  const [formations, setFormations] = useState([]);
  const [temoignages, setTemoignages] = useState([]);
  const [currentInstitutImage, setCurrentInstitutImage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = getDatabase();
      
      try {
        // Fetch home data
        const homeRef = ref(db, 'homepageSettings');
        const homeSnapshot = await get(homeRef);
        if (homeSnapshot.exists()) setHomeData(homeSnapshot.val());

        // Fetch formations
        const formationsRef = ref(db, 'categories');
        const formationsSnapshot = await get(formationsRef);
        if (formationsSnapshot.exists()) {
          const formationsList = [];
          formationsSnapshot.forEach(category => {
            const formationsData = category.child('formations');
            if (formationsData.exists()) {
              formationsData.forEach(formation => {
                formationsList.push({
                  id: formation.key,
                  category: category.key,
                  ...formation.val()
                });
              });
            }
          });
          setFormations(formationsList.slice(0, 6));
        }

        // Fetch testimonials
        const temoignagesRef = ref(db, 'temoignages');
        const temoignagesSnapshot = await get(temoignagesRef);
        if (temoignagesSnapshot.exists()) {
          setTemoignages(Object.values(temoignagesSnapshot.val()).slice(0, 3));
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const nextImage = () => {
    setCurrentInstitutImage(prev => 
      prev === (homeData?.institutImages?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentInstitutImage(prev => 
      prev === 0 ? (homeData?.institutImages?.length || 1) - 1 : prev - 1
    );
  };

  if (loading) {
    return <div className="loading-screen">Chargement en cours...</div>;
  }

  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        {homeData?.header?.topBarText && (
          <div className="top-bar">
            <p>{homeData.header.topBarText}</p>
          </div>
        )}
        
        <div className="main-header">
          <div className="logo-container">
            <img 
              src={homeData?.header?.logoUrl || process.env.PUBLIC_URL + '/images/logo1.jpg'} 
              alt={homeData?.header?.logoAlt || "IEFP Formation en Tunisie"} 
              className="logo"
            />
            <span className="logo-text">
              {homeData?.header?.logoText || "IEFP Formation en Tunisie"}
            </span>
          </div>
          
          <nav className="main-nav">
            <ul>
              {homeData?.header?.menuItems?.length > 0 ? (
                homeData.header.menuItems.map((item, index) => (
                  <li key={index}>
                    {item.isButton ? (
                      <button 
                        className="inscription-btn"
                        onClick={() => navigate(item.path || '/formateur-login')}
                      >
                        {item.text}
                      </button>
                    ) : (
                      <a href={item.path || `#${item.text.toLowerCase()}`}>
                        {item.text}
                      </a>
                    )}
                  </li>
                ))
              ) : (
                <>
                  <li><a href="#home">Home</a></li>
                  <li><a href="#institut">Notre institut</a></li>
                  <li><a href="#formations">Formations</a></li>
                  <li><a href="#faq">FAQ</a></li>
                  <li><a href="#temoignages">Témoignage</a></li>
                  <li><a href="#resultats">Résultat</a></li>
                  <li>
                    <button 
                      className="inscription-btn"
                      onClick={() => navigate('/formateur-login')}
                    >
                      Inscription
                    </button>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="video-hero">
        <div className="video-container">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="fullscreen-video"
          >
            <source src={homeData?.hero?.videoUrl || process.env.PUBLIC_URL + '/videos/formation.mp4'} type="video/mp4" />
          </video>
          <div className="video-overlay"></div>
          <div className="video-content">
            <h1>{homeData?.hero?.title || 'Formation Professionnelle de Qualité'}</h1>
            <p>{homeData?.hero?.subtitle || 'Développez vos compétences avec nos formations certifiantes'}</p>
            <button className="cta-button" onClick={() => navigate('/formations')}>
              {homeData?.hero?.buttonText || 'Découvrir nos formations'}
            </button>
          </div>
        </div>
      </section>

      {/* Notre Institut */}
      <section id="institut" className="institut-section">
        <h2>{homeData?.institut?.title || 'Notre Institut'}</h2>
        <div className="institut-content">
          <div className="institut-text">
            <p>
              {homeData?.institut?.description || `IEFP est un centre de formation professionnelle spécialisé dans les métiers 
              du numérique, de la gestion et des langues. Nous offrons des formations 
              adaptées aux besoins du marché tunisien.`}
            </p>
            <ul>
              {homeData?.institut?.features?.length > 0 ? (
                homeData.institut.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))
              ) : (
                <>
                  <li>Formateurs experts dans leur domaine</li>
                  <li>Pédagogie active et pratique</li>
                  <li>Certifications reconnues</li>
                  <li>Suivi personnalisé</li>
                </>
              )}
            </ul>
          </div>
          
          <div className="institut-carousel">
            <div className="carousel-container">
              {homeData?.institut?.images?.length > 0 ? (
                <>
                  <img 
                    src={homeData.institut.images[currentInstitutImage]} 
                    alt={`Institut IEFP ${currentInstitutImage + 1}`}
                    className="carousel-image"
                  />
                  <button className="carousel-btn prev" onClick={prevImage}>
                    &lt;
                  </button>
                  <button className="carousel-btn next" onClick={nextImage}>
                    &gt;
                  </button>
                  <div className="carousel-dots">
                    {homeData.institut.images.map((_, index) => (
                      <span 
                        key={index}
                        className={`dot ${index === currentInstitutImage ? 'active' : ''}`}
                        onClick={() => setCurrentInstitutImage(index)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="default-images">
                  <img 
                    src={process.env.PUBLIC_URL + '/images/institut/institut-1.jpg'} 
                    alt="Institut IEFP"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Formations */}
      <section id="formations" className="formations-section">
        <h2>{homeData?.formations?.title || 'Nos Formations'}</h2>
        <div className="formations-grid">
          {formations.map((formation, index) => (
            <div key={index} className="formation-card">
              <div className="formation-image">
                <img 
                  src={formation.imageUrl || process.env.PUBLIC_URL + '/images/formation-default.jpg'} 
                  alt={formation.titre} 
                />
              </div>
              <div className="formation-content">
                <h3>{formation.titre}</h3>
                <p className="formation-category">{formation.category}</p>
                <p className="formation-description">
                  {formation.description?.substring(0, 100)}...
                </p>
                <button 
                  className="formation-btn"
                  onClick={() => navigate(`/formation/${formation.id}`)}
                >
                  {homeData?.formations?.buttonText || 'En savoir plus'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="faq-section">
        <h2>{homeData?.faq?.title || 'Foire aux Questions'}</h2>
        <div className="faq-container">
          {homeData?.faq?.items?.length > 0 ? (
            homeData.faq.items.map((item, index) => (
              <div key={index} className="faq-item">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))
          ) : (
            <>
              <div className="faq-item">
                <h3>Comment s'inscrire à une formation ?</h3>
                <p>
                  Vous pouvez vous inscrire en ligne via notre plateforme ou vous présenter 
                  directement à notre institut avec les documents nécessaires.
                </p>
              </div>
              <div className="faq-item">
                <h3>Quels sont les modes de paiement acceptés ?</h3>
                <p>
                  Nous acceptons les paiements en espèces, par chèque ou par virement bancaire. 
                  Des facilités de paiement sont possibles.
                </p>
              </div>
              <div className="faq-item">
                <h3>Les formations sont-elles certifiantes ?</h3>
                <p>
                  Toutes nos formations délivrent une attestation de formation. Certaines 
                  préparent à des certifications internationales reconnues.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Témoignages */}
      <section id="temoignages" className="temoignages-section">
        <h2>{homeData?.testimonials?.title || 'Témoignages'}</h2>
        <div className="temoignages-container">
          {temoignages.map((temoignage, index) => (
            <div key={index} className="temoignage-card">
              <div className="temoignage-content">
                <p className="temoignage-text">"{temoignage.contenu}"</p>
                <div className="temoignage-author">
                  <p className="author-name">{temoignage.auteur}</p>
                  <p className="author-title">{temoignage.poste}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Résultats */}
      <section id="resultats" className="results-section">
        <h2>{homeData?.stats?.title || 'Nos Résultats'}</h2>
        <div className="stats-container">
          {homeData?.stats?.items?.length > 0 ? (
            homeData.stats.items.map((stat, index) => (
              <div key={index} className="stat-item">
                <h3>{stat.value}</h3>
                <p>{stat.label}</p>
              </div>
            ))
          ) : (
            <>
              <div className="stat-item">
                <h3>500+</h3>
                <p>Étudiants formés</p>
              </div>
              <div className="stat-item">
                <h3>95%</h3>
                <p>Taux de satisfaction</p>
              </div>
              <div className="stat-item">
                <h3>80%</h3>
                <p>Taux d'insertion professionnelle</p>
              </div>
              <div className="stat-item">
                <h3>20+</h3>
                <p>Formations disponibles</p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="center-footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-column">
              <h3>Contact</h3>
              <div className="contact-item">
                <i className="fas fa-phone-alt"></i>
                <div>
                  <a href={`tel:${homeData?.footer?.phone1 || '+212522123456'}`}>
                    {homeData?.footer?.phone1 || '+212 522 123 456'}
                  </a>
                  {homeData?.footer?.phone2 && (
                    <>
                      <span className="separator"> / </span>
                      <a href={`tel:${homeData.footer.phone2}`}>
                        {homeData.footer.phone2}
                      </a>
                    </>
                  )}
                </div>
              </div>
              <div className="contact-item">
                <i className="fas fa-envelope"></i>
                <a href={`mailto:${homeData?.footer?.email || 'contact@iefp.ma'}`}>
                  {homeData?.footer?.email || 'contact@iefp.ma'}
                </a>
              </div>
              <div className="contact-item">
                <i className="fas fa-map-marker-alt"></i>
                <span>{homeData?.footer?.address || '123 Avenue Mohammed V, Casablanca'}</span>
              </div>
            </div>

            <div className="footer-column">
              <h3>Réseaux sociaux</h3>
              <div className="social-links">
                {homeData?.footer?.socialLinks?.length > 0 ? (
                  homeData.footer.socialLinks.map((link, index) => (
                    <a key={index} href={link.url} target="_blank" rel="noopener noreferrer">
                      <i className={`fab fa-${link.platform.toLowerCase()}`}></i> {link.text}
                    </a>
                  ))
                ) : (
                  <>
                    <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-facebook-f"></i> Facebook
                    </a>
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-instagram"></i> Instagram
                    </a>
                    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-linkedin-in"></i> LinkedIn
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} {homeData?.footer?.copyright || 'Centre de Formation IEFP - Tous droits réservés'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;