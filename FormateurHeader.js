// src/components/FormateurHeader.jsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const FormateurHeader = () => {
  const { currentUser, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="flex justify-between items-center p-4">
        <h1 className="text-xl font-semibold">Formateur Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span className="text-gray-700">{currentUser?.email}</span>
          <button 
            onClick={logout}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default FormateurHeader;