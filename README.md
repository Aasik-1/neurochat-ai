# 🧠 NeuroChat AI
### *Think Smart. Chat Smarter.*

> Full-stack AI chatbot with **Login/Signup**, **Chat History**, **Database Storage**, and **AI integration** — Built by **Aasik**, 2nd Year, University of Moratuwa 🎓

---

## 🗂️ Project Structure

```
neurochat-ai/
├── public/                    ← Frontend (static files)
│   ├── index.html             ← Main chat UI
│   ├── auth.html              ← Login / Signup page
│   ├── css/
│   │   └── chat.css           ← Chat page styles
│   └── js/
│       └── chat.js            ← Frontend logic
├── src/
│   ├── authRoutes.js          ← Signup, Login, JWT endpoints
│   ├── authMiddleware.js      ← JWT verification
│   └── chatRoutes.js          ← AI chat + DB storage
├── config/
│   └── database.js            ← SQLite setup & schema
├── data/                      ← Auto-created: neurochat.db lives here
├── server.js                  ← Express app entry point
├── package.json
├── vercel.json                ← Vercel deployment config
├── .env.example               ← Environment template
├── .gitignore
└── README.md
```

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🔐 Auth | Signup / Login with hashed passwords (bcrypt) |
| 🎫 Sessions | JWT tokens (7-day expiry) stored in sessionStorage |
| 💬 Chat | Real-time AI chat (Claude / OpenAI / Gemini) |
| 🗂️ History | Chat conversations saved per user in SQLite |
| 📱 Responsive | Mobile-friendly sidebar with toggle |
| 🌊 Animations | Glowing effects, typing indicator, smooth transitions |
| 🛡️ Security | Rate limiting, auth middleware, SQL injection-safe prepared statements |
| 🗄️ Database | SQLite (file-based, zero config) — users, chats, messages |

---

## 🚀 Local Setup

### Prerequisites
- [Node.js 18+](https://nodejs.org/)

### Step 1 — Install
```bash
cd neurochat-ai
npm install
```

### Step 2 — Get API Key

**Option A — Claude (Anthropic)**
1. Go to https://console.anthropic.com → API Keys → Create
2. Copy the key (`sk-ant-api03-...`)

**Option B — Gemini (Google, FREE)**
1. Go to https://aistudio.google.com/app/apikey → Create API Key
2. Copy the key (`AIza...`)

**Option C — OpenAI**
1. Go to https://platform.openai.com/api-keys → Create
2. Copy the key (`sk-...`)

### Step 3 — Configure
```bash
cp .env.example .env
```
Edit `.env`:
```env
AI_PROVIDER=claude          # or 'gemini' or 'openai'
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=any_long_random_string_here
```

### Step 4 — Run
```bash
npm start
```
Open: **http://localhost:3000** → Create account → Start chatting! 🎉

For auto-restart during development:
```bash
npm run dev
```

---

## ☁️ Deploy to Vercel (Free)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "NeuroChat AI v1.0"
git remote add origin https://github.com/YOUR_USERNAME/neurochat-ai.git
git push -u origin main
```

### Step 2 — Import on Vercel
1. Go to https://vercel.com → Sign in with GitHub
2. **Add New Project** → Import `neurochat-ai`
3. Framework: **Other** (Vercel auto-detects vercel.json)
4. Click **Deploy**

### Step 3 — Add Environment Variables
In Vercel → Project Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `AI_PROVIDER` | `claude` |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
| `JWT_SECRET` | `your_super_secret_here` |

> ⚠️ **Note on SQLite + Vercel**: Vercel has ephemeral storage — the SQLite database resets on each deployment. For production with persistent data, use **Railway** or **Render** (see below).

---

## 🏗️ Deploy to Railway (Recommended for persistent DB)

Railway gives you a real server with persistent storage — perfect for SQLite.

1. Go to https://railway.app → Sign up
2. **New Project** → **Deploy from GitHub repo**
3. Select `neurochat-ai`
4. In **Variables** tab, add your `.env` values
5. Done! Railway gives you a free persistent URL

---

## 🌐 Deploy to Render (Alternative)

1. Go to https://render.com → New → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variables in the dashboard
5. Click **Create Web Service**

---

## 🔑 API Comparison

| Provider | Cost | Free Tier | Quality | Speed |
|----------|------|-----------|---------|-------|
| Claude Sonnet | ~$3/M tokens | $5 credit on signup | ⭐⭐⭐⭐⭐ | Fast |
| GPT-4o-mini | ~$0.15/M tokens | Credit card required | ⭐⭐⭐⭐ | Very Fast |
| Gemini Flash | FREE | 1M tokens/day free | ⭐⭐⭐⭐ | Very Fast |

**Recommendation for students**: Use **Gemini** (free) for development, switch to Claude for production.

---

## 🗄️ Database Schema

```sql
-- Users table
users (id, first_name, last_name, email, password_hash, created_at, last_login)

-- Chat sessions
chats (id, user_id, title, created_at, updated_at)

-- Individual messages
messages (id, chat_id, role, content, created_at)
```

The DB file is automatically created at `data/neurochat.db` on first run.

---

## 🛠️ Customization

**Change AI persona** → Edit system prompt in `src/chatRoutes.js`

**Change colors** → Edit CSS variables in `public/css/chat.css`:
```css
:root {
  --blue:   #3b82f6;
  --purple: #8b5cf6;
  --cyan:   #06b6d4;
}
```

**Change branding** → Edit `public/index.html` and `public/auth.html`

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| `better-sqlite3` build error | Run `npm rebuild better-sqlite3` |
| API key error | Check `.env` — no quotes around the key value |
| Port in use | Change `PORT=3001` in `.env` |
| JWT error on login | Make sure `JWT_SECRET` is set in `.env` |
| Blank page | Open browser console → check for JS errors |

---

*Built with 💙 by Aasik — 2nd Year, University of Moratuwa, Sri Lanka*
