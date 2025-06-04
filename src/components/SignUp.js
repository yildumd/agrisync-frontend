// src/components/SignUp.js
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase"; // Import Firebase Auth

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async (email, password) => {
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Send email verification
      await sendEmailVerification(user);

      alert("Verification email sent! Please check your inbox.");
      // Optionally, disable login until email is verified by checking later in the app
    } catch (error) {
      console.error("Error signing up:", error.message);
      alert(error.message); // Display error message if something goes wrong
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSignUp(email, password); // Call the sign-up function
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        placeholder="Email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        required 
      />
      <input 
        type="password" 
        placeholder="Password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        required 
      />
      <button type="submit">Sign Up</button>
    </form>
  );
};

export default SignUp;
