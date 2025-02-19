require('dotenv').config();
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session'); // Using express-session instead of cookie-session
const cors = require('cors');
const { google } = require('googleapis');

const app = express();

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
