import React, { useState, useEffect } from 'react';
import { getAuth, sendEmailVerification, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Button, CircularProgress, Typography, Box, Container, Paper } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';



export default function VerificationEmail() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsVerified(currentUser.emailVerified);
        setLoading(false);
      } else {
        navigate('/connexion');
      }
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  const handleResendEmail = async () => {
    try {
      setError('');
      setSent(false);
      await sendEmailVerification(user, {
        url: `${window.location.origin}/dashboardFormateur`,
        handleCodeInApp: false
      });
      setSent(true);
    } catch (err) {
      console.error("Erreur lors de l'envoi de l'email de vérification:", err);
      setError(err.message);
    }
  };

  const checkVerificationStatus = async () => {
    try {
      setCheckingStatus(true);
      await user.reload();
      const updatedUser = auth.currentUser;
      if (updatedUser.emailVerified) {
        setIsVerified(true);
        // Mettre à jour le statut dans la base de données si nécessaire
        // Rediriger après un court délai
        setTimeout(() => navigate('/dashboardFormateur'), 2000);
      }
    } catch (err) {
      console.error("Erreur lors de la vérification du statut:", err);
      setError("Impossible de vérifier le statut. Veuillez rafraîchir la page.");
    } finally {
      setCheckingStatus(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>Chargement...</Typography>
        </Paper>
      </Container>
    );
  }

  if (isVerified) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Email vérifié avec succès!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Votre adresse email a été vérifiée avec succès. Vous allez être redirigé vers votre tableau de bord.
          </Typography>
          <CircularProgress />
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <EmailIcon color="primary" sx={{ fontSize: 60 }} />
          <Typography variant="h4" gutterBottom>
            Vérifiez votre email
          </Typography>
          <Typography variant="body1">
            Nous avons envoyé un email de vérification à <strong>{user?.email}</strong>.
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Veuillez cliquer sur le lien dans l'email pour activer votre compte.
          </Typography>
        </Box>

        {sent && (
          <Box sx={{ backgroundColor: '#e8f5e9', p: 2, borderRadius: 1, mb: 3 }}>
            <Typography color="success.main">
              Un nouvel email de vérification a été envoyé avec succès!
            </Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ backgroundColor: '#ffebee', p: 2, borderRadius: 1, mb: 3, display: 'flex', alignItems: 'center' }}>
            <ErrorIcon color="error" sx={{ mr: 1 }} />
            <Typography color="error.main">
              {error}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
          <Button
            variant="contained"
            onClick={handleResendEmail}
            disabled={sent}
            startIcon={<EmailIcon />}
          >
            {sent ? 'Email envoyé' : 'Renvoyer l\'email'}
          </Button>

          <Button
            variant="outlined"
            onClick={checkVerificationStatus}
            disabled={checkingStatus}
            startIcon={checkingStatus ? <CircularProgress size={20} /> : null}
          >
            {checkingStatus ? 'Vérification...' : 'J\'ai vérifié mon email'}
          </Button>
        </Box>

        <Typography variant="body2" sx={{ mt: 4, textAlign: 'center', color: 'text.secondary' }}>
          Si vous ne voyez pas l'email, vérifiez votre dossier spam ou indésirables.
        </Typography>
      </Paper>
    </Container>
  );
}