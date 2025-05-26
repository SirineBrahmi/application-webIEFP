import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const PrivateRoute = ({ children, requiredRole }) => {
  const location = useLocation();

  // Récupération des données d'authentification
  const formateurData = localStorage.getItem('formateur');
  const adminData = localStorage.getItem('admin');
  const etudiantData = localStorage.getItem('etudiant');

  console.log('PrivateRoute check:', {
    formateurData: formateurData ? 'exists' : 'null',
    adminData: adminData ? 'exists' : 'null',
    etudiantData: etudiantData ? 'exists' : 'null',
    requiredRole,
  });

  let isAuthenticated = false;
  let role = '';

  // Vérifier si l'utilisateur a le bon rôle
  if (requiredRole === 'admin' && adminData) {
    isAuthenticated = true;
    role = 'admin';
    console.log('User is admin (required role)');
  } else if (requiredRole === 'formateur' && formateurData) {
    isAuthenticated = true;
    role = 'formateur';
    console.log('User is formateur (required role)');
  } else if (requiredRole === 'etudiant' && etudiantData) {
    isAuthenticated = true;
    role = 'etudiant';
    console.log('User is étudiant (required role)');
  }

  // Si non authentifié, rediriger
  if (!isAuthenticated) {
    console.log('User not authenticated with required role, redirecting to login');

    // Si déjà connecté avec un autre rôle
    if (adminData || formateurData || etudiantData) {
      if (adminData) {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (formateurData) {
        return <Navigate to="/formateur/dashboard" replace />;
      } else if (etudiantData) {
        return <Navigate to="/etudiant/espace-personnel" replace />;
      }
    }

    // Sinon, vers la page de connexion
    return <Navigate to="/formateur-login" state={{ from: location }} replace />;
  }

  // Accès autorisé
  console.log(`User authenticated with correct role: ${role}`);
  return children;
};

export default PrivateRoute;