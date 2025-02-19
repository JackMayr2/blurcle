import React, { useState, useEffect } from 'react';
import DrivePicker from '../components/DrivePicker';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState('');
  const [selectedDocs, setSelectedDocs] = useState([]);

  // Fetch user details including the access token from the server.
  useEffect(() => {
    fetch('http://localhost:5000/auth/status', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        // For demonstration, assume the access token is provided here.
        setAccessToken(data.user.accessToken);
      })
      .catch((err) => console.error('Error fetching user data:', err));
  }, []);

  // Callback when the user selects files/folders using the Google Picker.
  const handlePickerSelect = (docs) => {
    console.log('Selected docs from Picker:', docs);
    setSelectedDocs(docs);
    // You could also trigger ingestion of the files at this point.
  };

  // Log out the user.
  const handleLogout = () => {
    window.location.href = 'http://localhost:5000/auth/logout';
  };

  return (
    <div style={{ padding: '2rem' }}>
      {user ? (
        <h1>
          Welcome, {user.displayName || user.name || (user.emails && user.emails[0]?.value) || 'User'}!
        </h1>
      ) : (
        <h1>Welcome!</h1>
      )}
      <button onClick={handleLogout}>Log Out</button>
      <hr />

      {/* Google Picker Integration */}
      {accessToken ? (
        <DrivePicker accessToken={accessToken} onSelect={handlePickerSelect} />
      ) : (
        <p>Loading Google Drive access...</p>
      )}

      {/* Display the selected items */}
      {selectedDocs.length > 0 && (
        <div>
          <h2>Selected Files/Folders</h2>
          <ul>
            {selectedDocs.map((doc) => (
              <li key={doc.id}>
                {doc.name} ({doc.mimeType})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Additional UI components (e.g., ingestion, content generation) can be added here */}
    </div>
  );
};

export default Profile;
