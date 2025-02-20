require('dotenv').config();
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();



// CORS configuration – update the origin once deployed
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// Express-session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }, // change to true if using HTTPS in production
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
}, (accessToken, refreshToken, profile, done) => {
  console.log('[DEBUG] GoogleStrategy verify callback triggered.');
  console.log('[DEBUG] accessToken:', accessToken);
  console.log('[DEBUG] refreshToken:', refreshToken);
  console.log('[DEBUG] profile:', profile);

  profile.accessToken = accessToken;
  profile.refreshToken = refreshToken;
  return done(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Define your routes (example)
app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/drive.readonly'] })
);

app.get('/fail', (req, res) => {
  console.log('[DEBUG] OAuth flow failed. Query:', req.query);
  res.send('OAuth failed.');
});

// Then in your callback route:
app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/fail' }),
  (req, res) => {
    console.log('[DEBUG] OAuth callback route reached. User:', req.user);
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  }
);

// A status route for client to check authentication status
app.get('/api/auth/status', (req, res) => {
  if (req.user) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.get('/api/debug', (req, res) => {
  console.log('[DEBUG] /api/debug route called');
  res.json({ message: 'Hello from /api/debug!' });
});

app.get('/api/debug', (req, res) => {
  console.log('[DEBUG] /api/debug route called');
  res.json({ message: 'This definitely worked!' });
});

// ... add your additional routes like /drive/files, /ingest, etc.

module.exports = app;
