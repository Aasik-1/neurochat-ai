// src/authRoutes.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db      = require('../config/database');

const router  = express.Router();
const SECRET  = process.env.JWT_SECRET || 'neurochat_dev_secret_change_in_production';
const SALT_ROUNDS = 12;

// ── POST /api/auth/signup ──
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName = '', email, password } = req.body;

    if (!firstName || !email || !password)
      return res.status(400).json({ error: 'First name, email, and password are required.' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ error: 'Please enter a valid email address.' });

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const id       = uuid();
    const hashed   = await bcrypt.hash(password, SALT_ROUNDS);

    db.prepare(`
      INSERT INTO users (id, first_name, last_name, email, password)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, firstName.trim(), lastName.trim(), email.toLowerCase(), hashed);

    const user  = { id, firstName: firstName.trim(), lastName: lastName.trim(), email: email.toLowerCase() };
    const token = jwt.sign({ userId: id }, SECRET, { expiresIn: '7d' });

    console.log(`[Auth] New user registered: ${email}`);
    res.status(201).json({ token, user });

  } catch (err) {
    console.error('[Auth/signup]', err);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// ── POST /api/auth/login ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!row) return res.status(401).json({ error: 'No account found with this email.' });

    const valid = await bcrypt.compare(password, row.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect password. Please try again.' });

    // Update last login
    db.prepare('UPDATE users SET last_login = strftime(\'%s\',\'now\') WHERE id = ?').run(row.id);

    const user  = { id: row.id, firstName: row.first_name, lastName: row.last_name, email: row.email };
    const token = jwt.sign({ userId: row.id }, SECRET, { expiresIn: '7d' });

    console.log(`[Auth] Login: ${email}`);
    res.json({ token, user });

  } catch (err) {
    console.error('[Auth/login]', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── GET /api/auth/me ──
router.get('/me', require('./authMiddleware'), (req, res) => {
  const row = db.prepare('SELECT id, first_name, last_name, email, created_at FROM users WHERE id = ?').get(req.userId);
  if (!row) return res.status(404).json({ error: 'User not found.' });
  res.json({ id: row.id, firstName: row.first_name, lastName: row.last_name, email: row.email, createdAt: row.created_at });
});

module.exports = router;
