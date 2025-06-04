// src/components/AdminPanel.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';  // Import the auth instance

const AdminPanel = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut(auth).then(() => {
      navigate('/login');  // Redirect to login page after logout
    }).catch((error) => {
      console.error("Logout Error: ", error);  // Handle error gracefully
    });
  };

  return (
    <div>
      <h1>Admin Panel</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default AdminPanel;
