// server.js — NeuroChat AI main server
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const rateLimit = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3000;

// debug
console.log('AI_PROVIDER from env =', process.env.AI_PROVIDER);

// ── Middleware ──
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Rate limiting ──
app.use('/api/chat', rateLimit({
  windowMs: 60 * 1000, max: 20,
  message: { error: 'Too many requests. Please slow down.' }
}));
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { error: 'Too many auth attempts. Try again later.' }
}));

// ── Routes ──
app.use('/api/auth', require('./src/authRoutes'));
app.use('/api/chat', require('./src/chatRoutes'));

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'NeuroChat AI',
    provider: process.env.AI_PROVIDER || 'gemini',
    version: '1.0.0'
  });
});

// ── Auth page ──
app.get('/auth.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

// ── SPA fallback ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ──
app.listen(PORT, () => {
  const provider = (process.env.AI_PROVIDER || 'gemini').toUpperCase();

  console.log(`
╔══════════════════════════════════════════╗
║        🧠  NeuroChat AI  🧠              ║
║  Think Smart. Chat Smarter.              ║
║  ─────────────────────────────────────  ║
║  Server  : http://localhost:${PORT}          ║
║  Provider: ${provider.padEnd(30)}║
║  Built by: Aasik — UoM, Sri Lanka        ║
╚══════════════════════════════════════════╝
  `);
});