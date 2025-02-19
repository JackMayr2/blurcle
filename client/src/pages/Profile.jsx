import React, { useState, useEffect } from 'react';

const Profile = () => {
  const [driveConnected, setDriveConnected] = useState(false);
  const [files, setFiles] = useState([]);
  const [user, setUser] = useState(null);

  // Fetch user details from the server on component mount
  useEffect(() => {
    fetch('http://localhost:5000/auth/status', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => setUser(data.user))
      .catch((err) => {
        console.error("Error fetching user data:", err);
        setUser(null);
      });
  }, []);

  const handleConnectDrive = () => {
    // Redirect to the backend endpoint to connect Google Drive.
    window.location.href = 'http://localhost:5000/drive/connect';
  };

  const fetchDriveFiles = async () => {
    try {
      const res = await fetch('http://localhost:5000/drive/files', { credentials: 'include' });
      const data = await res.json();
      setFiles(data.files);
      setDriveConnected(true);
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

  const handleLogout = () => {
    // Redirect to the logout endpoint on your server.
    window.location.href = 'http://localhost:5000/auth/logout';
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Welcome message */}
      {user ? (
        <h1>Welcome, {user.displayName || user.name || (user.emails && user.emails[0]?.value) || 'User'}!</h1>
      ) : (
        <h1>Welcome!</h1>
      )}

      <button onClick={handleLogout}>Log Out</button>
      <hr />

      {/* Google Drive Connection */}
      {!driveConnected ? (
        <>
          <p>Connect your Google Drive to see your files.</p>
          <button onClick={handleConnectDrive}>Connect Google Drive</button>
        </>
      ) : (
        <>
          <button onClick={fetchDriveFiles}>Load My Drive Files</button>
          <ul>
            {files.map((file) => (
              <li key={file.id}>{file.name}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default Profile;
