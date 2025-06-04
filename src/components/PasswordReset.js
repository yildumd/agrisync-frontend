// src/components/PasswordReset.js

import React, { useState } from 'react';
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase"; // Import Firebase Auth

const PasswordReset = () => {
  const [email, setEmail] = useState('');

  const handlePasswordReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert('A password reset email has been sent. Please check your inbox.');
    } catch (error) {
      console.error("Error sending password reset email:", error.message);
      alert(error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handlePasswordReset(email);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        placeholder="Enter your email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        required 
      />
      <button type="submit">Send Password Reset Link</button>
    </form>
  );
};

export default PasswordReset;
