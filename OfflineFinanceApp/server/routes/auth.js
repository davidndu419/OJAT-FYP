const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/firebase');

const router = express.Router();
const usersCollection = db.collection('users');
const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

const normalizeEmail = (email) => email.trim().toLowerCase();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
};

const publicUser = (id, user) => ({
  id,
  name: user.name,
  email: user.email,
});

const verifyGoogleIdToken = async (idToken) => {
  const verifyOptions = {
    idToken,
  };

  if (process.env.GOOGLE_WEB_CLIENT_ID) {
    verifyOptions.audience = process.env.GOOGLE_WEB_CLIENT_ID;
  } else {
    console.warn('[Auth] GOOGLE_WEB_CLIENT_ID is not set. Verifying Google token without audience restriction.');
  }

  const ticket = await googleClient.verifyIdToken(verifyOptions);
  return ticket.getPayload();
};

router.post('/register', async (req, res) => {
  try {
    console.log('[Auth] Register request received for email:', req.body?.email);
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await usersCollection
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (!existingUser.empty) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRef = usersCollection.doc();

    const user = {
      id: userRef.id,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await userRef.set(user);
      console.log('[Auth] Firestore user saved successfully:', user.id);
    } catch (firestoreError) {
      console.error('[Auth] Firestore failed to save user:', firestoreError);
      return res.status(500).json({
        message: 'Failed to save user to Firestore',
        error: firestoreError.message,
      });
    }

    const token = createToken(user);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('[Auth] Registration failed:', error);
    return res.status(500).json({
      message: 'Server error during registration',
      error: error.message,
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const userSnapshot = await usersCollection
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const userDoc = userSnapshot.docs[0];
    const user = userDoc.data();
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = createToken({ id: userDoc.id, email: user.email });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: userDoc.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during login' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Google idToken is required' });
    }

    const payload = await verifyGoogleIdToken(idToken);

    if (!payload?.email) {
      return res.status(400).json({ message: 'Google token did not include an email address' });
    }

    if (payload.email_verified === false) {
      return res.status(401).json({ message: 'Google email address is not verified' });
    }

    const normalizedEmail = normalizeEmail(payload.email);
    const existingUser = await usersCollection
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    let userId;
    let user;
    let statusCode = 200;

    if (existingUser.empty) {
      const userRef = usersCollection.doc();
      const now = new Date().toISOString();

      userId = userRef.id;
      user = {
        id: userId,
        name: payload.name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        authProvider: 'google',
        googleSub: payload.sub,
        picture: payload.picture || null,
        created_at: now,
        updated_at: now,
      };

      await userRef.set(user);
      statusCode = 201;
      console.log('[Auth] Google user created:', userId);
    } else {
      const userDoc = existingUser.docs[0];
      userId = userDoc.id;
      user = userDoc.data();

      const updates = {
        authProvider: user.authProvider || 'google',
        googleSub: user.googleSub || payload.sub,
        picture: payload.picture || user.picture || null,
        updated_at: new Date().toISOString(),
      };

      await usersCollection.doc(userId).set(updates, { merge: true });
      user = {
        ...user,
        ...updates,
        id: userId,
      };
      console.log('[Auth] Google user logged in:', userId);
    }

    const token = createToken({ id: userId, email: user.email });

    return res.status(statusCode).json({
      message: statusCode === 201 ? 'Google registration successful' : 'Google login successful',
      token,
      user: publicUser(userId, user),
      userId,
    });
  } catch (error) {
    console.error('[Auth] Google authentication failed:', error);
    return res.status(401).json({
      message: 'Google authentication failed',
      error: error.message,
    });
  }
});

module.exports = router;
