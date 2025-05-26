// src/components/AuthForm.jsx
import React from 'react';

const AuthForm = ({ title, onSubmit, error, isLoading, children }) => {
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4 text-center">{title}</h2>
      
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      
      <form onSubmit={onSubmit}>
        {children}
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition duration-200 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Submit'}
        </button>
      </form>
    </div>
  );
};

export default AuthForm;