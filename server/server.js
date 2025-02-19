require('dotenv').config();
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session'); // Using express-session instead of cookie-session
const cors = require('cors');
const { google } = require('googleapis');

const app = express();

// In-memory store for ingested examples (for demo purposes)
const examples = [];

// Endpoint to save (ingest) file content
app.post('/ingest', express.json(), (req, res) => {
  if (!req.user) return res.status(401).send('Unauthorized');
  const { fileId, content } = req.body;
  // For simplicity, we push the file content into our in-memory array.
  examples.push({ fileId, content });
  console.log(`Ingested file ${fileId}`);
  res.json({ success: true });
});


app.post('/generate', express.json(), async (req, res) => {
  if (!req.user) return res.status(401).send('Unauthorized');
  const { prompt } = req.body;

  // Combine the incoming prompt with the ingested examples.
  let combinedPrompt = prompt + "\n\nExamples:\n";
  examples.forEach(example => {
    combinedPrompt += example.content + "\n---\n";
  });

  // Here you’d call your LLM API (like OpenAI's) with combinedPrompt.
  // For demonstration, we’ll just return the combined prompt.
  res.json({ generatedContent: combinedPrompt });
});


app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' https://*.google.com https://*.googleapis.com https://www.gstatic.com https://*.googlevideo.com https://csp.withgoogle.com; script-src 'self' https://apis.google.com; style-src 'self' 'unsafe-inline';"
  );
  next();
});

// Allow CORS from our client app
app.use(cors({
  origin: 'http://localhost:5173', // your Vite dev server port
  credentials: true,
}));

// Use express-session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS in production
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport to use Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL, // should be 'http://localhost:5000/auth/google/callback'
  // Request additional scopes for Google Drive access
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/drive.readonly'],
}, (accessToken, refreshToken, profile, done) => {
  // Typically, you would find or create a user in your DB here.
  // For demonstration, we attach the tokens to the profile.
  profile.accessToken = accessToken;
  profile.refreshToken = refreshToken;
  return done(null, profile);
}));

// Serialize user info into the session
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Routes

// Start authentication with Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email', 'https://www.googleapis.com/auth/drive.readonly'] })
);

// Google OAuth callback URL
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to the profile page.
    res.redirect('http://localhost:5173/profile');
  }
);

// Endpoint to simulate connecting Google Drive (optional additional flow)
app.get('/drive/connect', (req, res) => {
  if (!req.user) return res.status(401).send('Unauthorized');
  // You could initiate an additional consent flow here if needed.
  res.redirect('http://localhost:5173/profile');
});

// Endpoint to fetch Google Drive files
app.get('/drive/files', async (req, res) => {
  if (!req.user) return res.status(401).send('Unauthorized');

  try {
    // Create an OAuth2 client with the tokens
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: req.user.accessToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    // List files from the user's drive (modify query as needed)
    const driveResponse = await drive.files.list({
      pageSize: 10,
      fields: 'files(id, name)',
    });
    res.json({ files: driveResponse.data.files });
  } catch (error) {
    console.error('Error fetching drive files:', error);
    res.status(500).json({ error: 'Error fetching files' });
  }
});

// A simple endpoint to check if the user is authenticated
app.get('/auth/status', (req, res) => {
  if (req.user) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});



// Log out route
app.get('/auth/logout', (req, res, next) => {
    req.logout(function(err) {
      if (err) { return next(err); }
      req.session.destroy(() => {
        res.redirect('http://localhost:5173');
      });
    });
  });



// Endpoint to fetch file content by ID
app.get('/drive/file-content/:fileId', async (req, res) => {
  if (!req.user) return res.status(401).send('Unauthorized');

  try {
    // Create an OAuth2 client with the stored access token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: req.user.accessToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const fileId = req.params.fileId;

    // First, get the file metadata so we can check its mime type.
    const metadata = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType'
    });

    let content = '';

    if (metadata.data.mimeType === 'application/vnd.google-apps.document') {
      // If it's a Google Doc, export it as plain text.
      const exportResponse = await drive.files.export(
        { fileId, mimeType: 'text/plain' },
        { responseType: 'stream' }
      );

      // Stream the exported content into a variable.
      await new Promise((resolve, reject) => {
        exportResponse.data.on('data', (chunk) => {
          content += chunk;
        });
        exportResponse.data.on('end', resolve);
        exportResponse.data.on('error', reject);
      });
    } else {
      // For other file types, we could download directly. Here we'll try to get it as text.
      const fileResponse = await drive.files.get({
        fileId,
        alt: 'media'
      }, { responseType: 'stream' });

      await new Promise((resolve, reject) => {
        fileResponse.data.on('data', (chunk) => {
          content += chunk;
        });
        fileResponse.data.on('end', resolve);
        fileResponse.data.on('error', reject);
      });
    }

    res.json({ fileId, content });
  } catch (error) {
    console.error('Error fetching file content:', error);
    res.status(500).json({ error: 'Error fetching file content' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
