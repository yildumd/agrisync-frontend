// src/components/ProtectedRoute.js

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // User is authenticated
        console.log('User is authenticated:', currentUser);

        try {
          // Fetch user data from Firestore
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            console.log('User data from Firestore:', userData);
            setUser(currentUser);
            setRole(userData.role);

            // If the user role does not match the allowed roles, redirect them
            if (allowedRoles && !allowedRoles.includes(userData.role)) {
              console.log('Role not authorized, redirecting...');
              navigate('/dashboard'); // Redirect to a safe route (you can customize this)
            }
          } else {
            console.log('No user data found in Firestore.');
            navigate('/login');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          navigate('/login');
        }
      } else {
        // No user is authenticated
        console.log('No user authenticated');
        setUser(null);
        setRole(null);
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate, allowedRoles]);

  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect if user or role is not found
  if (!user || !role) {
    console.log('User or role not set, redirecting to login');
    navigate('/login');
    return null;
  }

  // If the user has the correct role, render the children components
  console.log('Rendering children:', children);
  return children;
};

export default ProtectedRoute;
