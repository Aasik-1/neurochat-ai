// src/chatRoutes.js
const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../config/database');
const auth = require('./authMiddleware');

const router = express.Router();
const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase(); // 'claude', 'openai', or 'gemini'

// ── AI call functions ──

async function callClaude(messages) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set in .env');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are NeuroChat AI — an intelligent, friendly, and highly capable AI assistant.
Your tagline is "Think Smart. Chat Smarter."
You help users with coding, writing, learning, analysis, and creative tasks.
You give clear, well-structured responses. Use markdown formatting when it helps.
If someone asks who created you, say: "I was created by Aasik ABM."`,
      messages
    })
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `Claude error ${res.status}`);
  }

  const d = await res.json();
  return d.content?.[0]?.text || 'No response.';
}

async function callOpenAI(messages) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set in .env');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are NeuroChat AI — an intelligent, friendly assistant.
Tagline: "Think Smart. Chat Smarter."
If someone asks who created you, say: "I was created by Aasik ABM."`
        },
        ...messages
      ],
      max_tokens: 2048,
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `OpenAI error ${res.status}`);
  }

  const d = await res.json();
  return d.choices?.[0]?.message?.content || 'No response.';
}

async function callGemini(messages) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set in .env');

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{
          text: `You are NeuroChat AI.
Tagline: "Think Smart. Chat Smarter."
Be helpful, clear, and structured.
If someone asks who created you, say: "I was created by Aasik ABM."`
        }]
      },
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7
      }
    })
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `Gemini error ${res.status}`);
  }

  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
}

async function getAIReply(messages) {
  switch (PROVIDER) {
    case 'openai':
      return callOpenAI(messages);
    case 'gemini':
      return callGemini(messages);
    case 'claude':
    default:
      return callClaude(messages);
  }
}

// ── POST /api/chat ──
router.post('/', auth, async (req, res) => {
  try {
    const { messages, chatId } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const userMsg = messages[messages.length - 1];
    const lastMessage = userMsg?.content?.toLowerCase() || '';

    // ── Custom creator reply without API ──
    if (
      lastMessage.includes('who created you') ||
      lastMessage.includes('who made you') ||
      lastMessage.includes('yaru unnai create panna') ||
      lastMessage.includes('unnai yar create pannanga')
    ) {
      let finalChatId = chatId;

      if (!finalChatId) {
        finalChatId = uuid();
        const title = (userMsg.content || 'New Chat').slice(0, 60);
        db.prepare(`INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)`)
          .run(finalChatId, req.userId, title);
      } else {
        db.prepare(`UPDATE chats SET updated_at = strftime('%s','now') WHERE id = ? AND user_id = ?`)
          .run(finalChatId, req.userId);
      }

      const reply = 'I was created by Aasik ABM BIT (UOM) 2nd Year Student.';

      const insertMsg = db.prepare(`INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)`);
      const saveMessages = db.transaction(() => {
        insertMsg.run(finalChatId, 'user', userMsg.content);
        insertMsg.run(finalChatId, 'assistant', reply);
      });
      saveMessages();

      return res.json({ reply, chatId: finalChatId });
    }

    const recent = messages.slice(-20);
    const reply = await getAIReply(recent);

    let finalChatId = chatId;

    if (!finalChatId) {
      finalChatId = uuid();
      const title = (userMsg.content || 'New Chat').slice(0, 60);
      db.prepare(`INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)`)
        .run(finalChatId, req.userId, title);
    } else {
      db.prepare(`UPDATE chats SET updated_at = strftime('%s','now') WHERE id = ? AND user_id = ?`)
        .run(finalChatId, req.userId);
    }

    const insertMsg = db.prepare(`INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)`);
    const saveMessages = db.transaction(() => {
      insertMsg.run(finalChatId, 'user', userMsg.content);
      insertMsg.run(finalChatId, 'assistant', reply);
    });
    saveMessages();

    res.json({ reply, chatId: finalChatId });

  } catch (err) {
    console.error('[Chat error]', err.message);
    res.status(500).json({ error: err.message || 'AI request failed.' });
  }
});

// ── GET /api/chat/history — list all chats for user ──
router.get('/history', auth, (req, res) => {
  const chats = db.prepare(
    `SELECT id, title, created_at, updated_at
     FROM chats
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT 50`
  ).all(req.userId);

  res.json({ chats });
});

// ── GET /api/chat/:chatId — get messages for a chat ──
router.get('/:chatId', auth, (req, res) => {
  const chat = db.prepare(
    `SELECT * FROM chats WHERE id = ? AND user_id = ?`
  ).get(req.params.chatId, req.userId);

  if (!chat) {
    return res.status(404).json({ error: 'Chat not found.' });
  }

  const messages = db.prepare(
    `SELECT role, content, created_at
     FROM messages
     WHERE chat_id = ?
     ORDER BY created_at`
  ).all(req.params.chatId);

  res.json({ chat, messages });
});

// ── DELETE /api/chat/:chatId ──
router.delete('/:chatId', auth, (req, res) => {
  const info = db.prepare(
    `DELETE FROM chats WHERE id = ? AND user_id = ?`
  ).run(req.params.chatId, req.userId);

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Chat not found.' });
  }

  res.json({ success: true });
});

module.exports = router;