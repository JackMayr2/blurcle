import React, { useEffect, useState } from 'react';

const developerKey = import.meta.env.VITE_DEVELOPER_KEY;

const DrivePicker = ({ accessToken, onSelect }) => {
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);

  // Load the Google Picker API script.
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('picker', { callback: () => setPickerApiLoaded(true) });
    };
    document.body.appendChild(script);
  }, []);

  // Function to create and show the picker.
  const createPicker = () => {
    if (pickerApiLoaded && accessToken) {
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true);

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(developerKey)  // Replace with your Picker API key.
        .setCallback(pickerCallback)
        .build();
      picker.setVisible(true);
    } else {
      console.error('Picker API not loaded or missing access token');
    }
  };

  // Callback when files/folders are selected.
  const pickerCallback = (data) => {
    if (data.action === window.google.picker.Action.PICKED) {
      // data.docs contains the selected files/folders.
      onSelect(data.docs);
    }
  };

  return (
    <button onClick={createPicker}>
      Browse Google Drive
    </button>
  );
};

export default DrivePicker;
