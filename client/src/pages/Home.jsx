import React from 'react';

const Home = () => {
  const handleGoogleSignUp = () => {
    // Redirect the user to your backend endpoint to start the Google OAuth flow.
    window.location.href = 'http://localhost:5000/auth/google';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome to the School District App</h1>
      <p>Sign up with your Google account to get started.</p>
      <button onClick={handleGoogleSignUp}>Sign Up with Google</button>
    </div>
  );
};

export default Home;
