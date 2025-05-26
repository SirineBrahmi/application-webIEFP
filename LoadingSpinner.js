import React from 'react';
import './LoadingSpinner.css'; // Fichier de style associé

const LoadingSpinner = ({ size = 40, color = '#3498db', text = 'Chargement...' }) => {
  return (
    <div className="loading-spinner-container">
      <div 
        className="loading-spinner"
        style={{
          width: size,
          height: size,
          borderColor: color
        }}
      ></div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;