/* NeuroChat AI — chat.js */
'use strict';

// ── Auth guard ──
const TOKEN = sessionStorage.getItem('nc_token');
const USER  = JSON.parse(sessionStorage.getItem('nc_user') || 'null');
if (!TOKEN || !USER) { window.location.href = '/auth.html'; }

// ── State ──
let currentChatId = null;
let chatHistory   = [];
let busy          = false;
let allChats      = JSON.parse(localStorage.getItem('nc_chats_' + USER?.id) || '[]');

// ── DOM ──
const welcomeEl   = document.getElementById('welcome');
const msgsEl      = document.getElementById('messages');
const inputEl     = document.getElementById('msgInput');
const sendBtnEl   = document.getElementById('sendBtn');
const histListEl  = document.getElementById('historyList');
const userAvEl    = document.getElementById('userAv');
const userNameEl  = document.getElementById('userName');
const userEmailEl = document.getElementById('userEmail');
const wNameEl     = document.getElementById('wName');
const charCountEl = document.getElementById('charCount');

// ── Init ──
function init() {
  if (!USER) return;
  const initials = ((USER.firstName||'?')[0] + (USER.lastName||'')[0]).toUpperCase();
  userAvEl.textContent = initials;
  userNameEl.textContent = `${USER.firstName} ${USER.lastName || ''}`.trim();
  userEmailEl.textContent = USER.email;
  wNameEl.textContent = USER.firstName;
  renderHistory();
  document.getElementById('newChatBtn').onclick = startNewChat;
  document.getElementById('mobToggle').onclick = () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('mobOverlay').classList.toggle('show');
  };
}

// ── Sidebar ──
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('mobOverlay').classList.remove('show');
}

// ── Chat History ──
function saveChats() {
  localStorage.setItem('nc_chats_' + USER.id, JSON.stringify(allChats));
}

function renderHistory() {
  if (allChats.length === 0) {
    histListEl.innerHTML = '<div class="history-empty">No conversations yet. Start chatting!</div>';
    return;
  }
  histListEl.innerHTML = allChats.map(c => `
    <div class="history-item${c.id===currentChatId?' active':''}" onclick="loadChat('${c.id}')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span>${escHtml(c.title)}</span>
      <button class="del-btn" onclick="deleteChat(event,'${c.id}')" title="Delete">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`).join('');
}

function startNewChat() {
  currentChatId = null;
  chatHistory = [];
  msgsEl.innerHTML = '';
  msgsEl.classList.add('hidden');
  welcomeEl.classList.remove('hidden');
  inputEl.value = '';
  inputEl.style.height = 'auto';
  charCountEl.textContent = '0';
  renderHistory();
  closeSidebar();
}

function loadChat(id) {
  const chat = allChats.find(c => c.id === id);
  if (!chat) return;
  currentChatId = id;
  chatHistory = [...chat.messages];
  msgsEl.innerHTML = '';
  welcomeEl.classList.add('hidden');
  msgsEl.classList.remove('hidden');
  chatHistory.forEach(m => appendBubble(m.role, m.content));
  msgsEl.scrollTop = msgsEl.scrollHeight;
  renderHistory();
  closeSidebar();
}

function deleteChat(e, id) {
  e.stopPropagation();
  allChats = allChats.filter(c => c.id !== id);
  saveChats();
  if (currentChatId === id) startNewChat();
  else renderHistory();
}

// ── Input ──
function onMsgKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
}
function growInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  charCountEl.textContent = el.value.length;
}
function useSuggestion(btn) {
  inputEl.value = btn.querySelector('.sug-text').textContent;
  sendMsg();
}

// ── Send Message ──
async function sendMsg() {
  const text = inputEl.value.trim();
  if (!text || busy) return;

  welcomeEl.classList.add('hidden');
  msgsEl.classList.remove('hidden');

  appendBubble('user', text);
  chatHistory.push({ role: 'user', content: text });

  inputEl.value = '';
  inputEl.style.height = 'auto';
  charCountEl.textContent = '0';
  setBusy(true);

  const typingEl = appendTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + TOKEN
      },
      body: JSON.stringify({
        messages: chatHistory.slice(-20),
        chatId: currentChatId
      })
    });

    if (res.status === 401) {
      logout(); return;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');

    typingEl.remove();
    const reply = data.reply;
    appendBubble('ai', reply);
    chatHistory.push({ role: 'assistant', content: reply });

    // Save chat
    if (!currentChatId) {
      currentChatId = data.chatId || genId();
      const title = text.length > 45 ? text.slice(0, 45) + '…' : text;
      allChats.unshift({ id: currentChatId, title, messages: [...chatHistory], updatedAt: Date.now() });
    } else {
      const existing = allChats.find(c => c.id === currentChatId);
      if (existing) { existing.messages = [...chatHistory]; existing.updatedAt = Date.now(); }
    }
    saveChats();
    renderHistory();

  } catch (err) {
    typingEl.remove();
    appendBubble('ai', '⚠️ ' + err.message, true);
  } finally {
    setBusy(false);
  }
}

// ── Bubbles ──
function appendBubble(role, text, isErr = false) {
  const row  = document.createElement('div');
  row.className = `msg-row ${role}`;

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const initials = ((USER?.firstName||'?')[0] + (USER?.lastName||'')[0]).toUpperCase();

  const aiAv = `<div class="msg-av ai-av-msg">
    <svg viewBox="0 0 36 36" fill="none">
      <ellipse cx="18" cy="13" rx="9" ry="7" fill="none" stroke="white" stroke-width="1.3"/>
      <path d="M11 20 H25 Q26.5 20 26.5 21.5 V25 Q26.5 26.5 25 26.5 H18.5 L15 29 L16 26.5 H11 Q9.5 26.5 9.5 25 V21.5 Q9.5 20 11 20Z" fill="rgba(255,255,255,0.12)" stroke="white" stroke-width="1.1"/>
      <circle cx="14" cy="23.5" r="1" fill="white"/><circle cx="18" cy="23.5" r="1" fill="white"/><circle cx="22" cy="23.5" r="1" fill="white"/>
      <defs><linearGradient id="bg1" x1="0" y1="0" x2="36" y2="36"><stop offset="0%" stop-color="#1d4ed8"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient></defs>
    </svg>
  </div>`;

  row.innerHTML = `
    ${role === 'ai' ? aiAv : `<div class="msg-av user-av-msg">${initials}</div>`}
    <div>
      <div class="msg-bubble${isErr ? ' err-bubble' : ''}">${formatText(text)}</div>
      <div class="msg-meta">${now}</div>
    </div>`;

  msgsEl.appendChild(row);
  msgsEl.scrollTop = msgsEl.scrollHeight;
  return row;
}

function appendTyping() {
  const row = document.createElement('div');
  row.className = 'typing-row';
  row.innerHTML = `
    <div class="msg-av ai-av-msg" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0f2050,#2d1260);border:1px solid rgba(59,130,246,0.26)">
      <svg viewBox="0 0 36 36" fill="none" width="18" height="18">
        <ellipse cx="18" cy="13" rx="9" ry="7" fill="none" stroke="white" stroke-width="1.3"/>
        <path d="M11 20 H25 Q26.5 20 26.5 21.5 V25 Q26.5 26.5 25 26.5 H18.5 L15 29 L16 26.5 H11 Q9.5 26.5 9.5 25 V21.5 Q9.5 20 11 20Z" fill="rgba(255,255,255,0.12)" stroke="white" stroke-width="1.1"/>
        <circle cx="14" cy="23.5" r="1" fill="white"/><circle cx="18" cy="23.5" r="1" fill="white"/><circle cx="22" cy="23.5" r="1" fill="white"/>
      </svg>
    </div>
    <div class="typing-bubble">
      <div class="dot"></div><div class="dot"></div><div class="dot"></div>
    </div>`;
  msgsEl.appendChild(row);
  msgsEl.scrollTop = msgsEl.scrollHeight;
  return row;
}

// ── Markdown formatter ──
function formatText(raw) {
  let t = raw
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  t = t.replace(/```(\w+)?\n([\s\S]*?)```/g, (_,l,c) => `<pre><code>${c.trim()}</code></pre>`);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
  t = t.replace(/^### (.+)$/gm, '<strong style="font-size:1rem;color:#c4b5fd">$1</strong>');
  t = t.replace(/^## (.+)$/gm, '<strong style="font-size:1.05rem;color:#93c5fd">$1</strong>');
  t = t.replace(/^- (.+)$/gm, '<li>$1</li>');
  t = t.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  t = t.split('\n\n').filter(p => p.trim()).map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  return t || `<p>${escHtml(raw)}</p>`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Helpers ──
function setBusy(v) { busy = v; sendBtnEl.disabled = v; }
function genId()    { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function logout() {
  sessionStorage.removeItem('nc_token');
  sessionStorage.removeItem('nc_user');
  window.location.href = '/auth.html';
}

init();
inputEl.focus();
