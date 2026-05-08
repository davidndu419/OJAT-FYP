const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/firebase');

const router = express.Router();
const usersCollection = db.collection('users');

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

router.post('/register', async (req, res) => {
  try {
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

    await userRef.set(user);

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
    return res.status(500).json({ message: 'Server error during registration' });
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

module.exports = router;
