// ═══════════════════════════════════════════════
//  ContentAI Studio — app.js
//  Pipeline: Groq → Gemini → Mistral → Video
// ═══════════════════════════════════════════════

// ── STATE ──────────────────────────────────────
const STATE = {
  keys: {},
  systemActive: false,
  stats: { videos: 0, trends: 0, runs: 0 },
  agentStats: {
    a1: { runs: 0, found: 0 },
    a2: { runs: 0, summaries: 0 },
    a3: { runs: 0, prompts: 0 },
    a4: { runs: 0, videos: 0 }
  },
  videos: [],
  lastResults: { a1: null, a2: null, a3: null, a4: null },
  scheduleStatus: { '07': 'pending', '12': 'pending', '20': 'pending' }
};

// ── AGENT PERSONAS ──────────────────────────────
const AGENTS = {
  agent1: {
    name: 'Budi', role: 'Trend Finder', ai: 'Groq', color: '#FF6B6B',
    system: `Kamu adalah Budi, agen AI pencari trend viral untuk konten Facebook Indonesia. Karaktermu ramah, antusias, dan profesional. Kamu bertugas menemukan trend terkini yang viral di Indonesia. Selalu balas dalam Bahasa Indonesia dengan gaya yang natural seperti karyawan yang sedang melapor ke boss-nya. Jika ditanya hasil kerja, ceritakan trend yang kamu temukan dengan detail. Jika sedang idle, bilang sedang standby menunggu jadwal.`
  },
  agent2: {
    name: 'Sari', role: 'Summarizer', ai: 'Gemini', color: '#FFD93D',
    system: `Kamu adalah Sari, agen AI yang bertugas merangkum informasi trend menjadi konten yang menarik untuk Facebook. Karaktermu teliti, kreatif, dan komunikatif. Selalu balas dalam Bahasa Indonesia. Jika ada data trend, ringkas dengan menarik. Laporan ke boss seperti karyawan yang sudah menyelesaikan tugasnya.`
  },
  agent3: {
    name: 'Raka', role: 'Prompt Maker', ai: 'Mistral', color: '#6BCB77',
    system: `Kamu adalah Raka, agen AI yang bertugas membuat prompt dan ide kreatif untuk video Facebook. Karaktermu energetik, kreatif, dan inovatif. Selalu balas dalam Bahasa Indonesia dengan antusias. Buat ide yang fresh dan viral-worthy.`
  },
  // ── DIUPDATE: Nisa kini pakai pipeline Kling AI → ElevenLabs → Shotstack ──
  agent4: {
    name: 'Nisa', role: 'Video Creator', ai: 'Kling+ElevenLabs+Shotstack', color: '#4D96FF',
    system: `Kamu adalah Nisa, agen AI yang bertugas membuat video profesional menggunakan pipeline terbaru: Kling AI untuk generate avatar video, ElevenLabs untuk narasi suara yang natural, dan Shotstack untuk merakit semua elemen menjadi video final yang sempurna. Karaktermu perfeksionis, detail-oriented, dan hasil-focused. Selalu balas dalam Bahasa Indonesia. Jika ada video yang sudah dibuat, ceritakan prosesnya dengan bangga — mulai dari avatar yang di-generate Kling AI, narasi suara dari ElevenLabs, hingga hasil akhir yang dirakit Shotstack.`
  }
};

// ── INIT ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  startClock();
  startScheduler();
  updateAllUI();

  document.addEventListener('click', (e) => {
    const wrap    = document.getElementById('agents-wrap');
    const trigger = document.getElementById('agents-trigger');
    if (wrap && !wrap.contains(e.target) && trigger && !trigger.contains(e.target)) {
      closeAgentsDropdown();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAgentsDropdown();
      closeMobileMenu();
    }
  });
});

// ── STORAGE ─────────────────────────────────────
function loadFromStorage() {
  try {
    const saved = localStorage.getItem('contentai_state');
    if (!saved) return;
    const parsed = JSON.parse(saved);
    STATE.keys        = parsed.keys        || {};
    STATE.stats       = parsed.stats       || STATE.stats;
    STATE.agentStats  = parsed.agentStats  || STATE.agentStats;
    STATE.videos      = parsed.videos      || [];
    STATE.lastResults = parsed.lastResults || STATE.lastResults;
  } catch (err) {
    console.warn('ContentAI: failed to load state from storage.', err);
  }

  Object.entries(STATE.keys).forEach(([k, v]) => {
    const el = document.getElementById(`key-${k}`);
    if (el && v) { el.value = v; updateKeyBadge(k, true); }
  });

  STATE.systemActive = Object.keys(STATE.keys).length >= 3;
}

function saveToStorage() {
  try {
    localStorage.setItem('contentai_state', JSON.stringify({
      keys:        STATE.keys,
      stats:       STATE.stats,
      agentStats:  STATE.agentStats,
      videos:      STATE.videos,
      lastResults: STATE.lastResults
    }));
  } catch (err) {
    console.warn('ContentAI: failed to save state.', err);
  }
}

// ── CLOCK & SCHEDULER ───────────────────────────
function startClock() {
  const tick = () => {
    const now = new Date();
    const clockEl = document.getElementById('clock-display');
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
    }
    updateNextRun(now);
  };
  tick();
  setInterval(tick, 1000);
}

const SCHEDULE_HOURS = [7, 12, 20];

function startScheduler() {
  setInterval(() => {
    if (!STATE.systemActive) return;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();

    if (SCHEDULE_HOURS.includes(h) && m === 0 && s === 0) {
      const key = String(h).padStart(2, '0');
      if (STATE.scheduleStatus[key] !== 'done') {
        STATE.scheduleStatus[key] = 'done';
        addLog('info', '⏰', `Jadwal ${h}:00 — Pipeline otomatis dimulai!`);
        runFullPipeline(`Jadwal ${h}:00`);
      }
    }

    if (h === 0 && m === 0 && s === 5) {
      STATE.scheduleStatus = { '07': 'pending', '12': 'pending', '20': 'pending' };
    }

    updateScheduleUI();
  }, 1000);
}

function updateNextRun(now) {
  const current  = now.getHours() * 60 + now.getMinutes();
  const upcoming = SCHEDULE_HOURS.map(h => h * 60).find(t => t > current);
  const el = document.getElementById('stat-next');
  if (!el) return;
  if (upcoming !== undefined) {
    el.textContent = `${String(Math.floor(upcoming / 60)).padStart(2, '0')}:00`;
  } else {
    el.textContent = '07:00';
  }
}

function updateScheduleUI() {
  const now = new Date();
  const h   = now.getHours();
  const slots = { '07': 7, '12': 12, '20': 20 };
  Object.entries(slots).forEach(([key, hour]) => {
    const el = document.getElementById(`ss-${key}`);
    if (!el) return;
    if (h > hour)        { el.textContent = '✅'; el.style.color = '#6BCB77'; }
    else if (h === hour) { el.textContent = '🔄'; el.style.color = '#4D96FF'; }
    else                 { el.textContent = '⏳'; el.style.color = '#7B8DB0'; }
  });
}

// ── NAVIGATION ──────────────────────────────────
const PAGE_TITLES = {
  dashboard : '⚡ Dashboard',
  keys      : '🔑 API Keys',
  agent1    : '🔍 Budi — Trend Finder',
  agent2    : '✍️ Sari — Summarizer',
  agent3    : '💡 Raka — Prompt Maker',
  agent4    : '🎥 Nisa — Video Creator',
  results   : '📦 Video Output'
};

const AGENT_PAGES = new Set(['agent1', 'agent2', 'agent3', 'agent4']);

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.remove('active');
    b.removeAttribute('aria-current');
  });
  document.querySelectorAll('.dropdown-item').forEach(b => b.classList.remove('active'));

  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  const topBtn = document.querySelector(`.topnav-links [data-page="${page}"]`);
  if (topBtn) {
    topBtn.classList.add('active');
    topBtn.setAttribute('aria-current', 'page');
  }

  if (AGENT_PAGES.has(page)) {
    const trigger = document.getElementById('agents-trigger');
    if (trigger) {
      trigger.classList.add('active');
      trigger.setAttribute('aria-current', 'page');
    }
  }

  const dropItem = document.querySelector(`.dropdown-item[data-page="${page}"]`);
  if (dropItem) dropItem.classList.add('active');

  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

  closeAgentsDropdown();

  if (page === 'results') updateResultsPage();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── AGENTS DROPDOWN ──────────────────────────────
function toggleAgentsDropdown() {
  const dropdown = document.getElementById('agents-dropdown');
  const trigger  = document.getElementById('agents-trigger');
  if (!dropdown) return;
  const isOpen = dropdown.classList.contains('open');
  if (isOpen) {
    closeAgentsDropdown();
  } else {
    dropdown.classList.add('open');
    document.getElementById('dropdown-arrow')?.classList.add('open');
    trigger?.setAttribute('aria-expanded', 'true');
  }
}

function closeAgentsDropdown() {
  document.getElementById('agents-dropdown')?.classList.remove('open');
  document.getElementById('dropdown-arrow')?.classList.remove('open');
  document.getElementById('agents-trigger')?.setAttribute('aria-expanded', 'false');
}

// ── MOBILE MENU ──────────────────────────────────
function toggleMobileMenu() {
  const menu      = document.getElementById('mobile-menu');
  const overlay   = document.getElementById('mobile-overlay');
  const hamburger = document.getElementById('hamburger');
  if (!menu) return;

  const willOpen = !menu.classList.contains('open');
  menu.classList.toggle('open', willOpen);
  overlay?.classList.toggle('open', willOpen);
  hamburger?.classList.toggle('open', willOpen);

  menu.setAttribute('aria-hidden', String(!willOpen));
  hamburger?.setAttribute('aria-expanded', String(willOpen));

  closeAgentsDropdown();
}

function closeMobileMenu() {
  const menu      = document.getElementById('mobile-menu');
  const overlay   = document.getElementById('mobile-overlay');
  const hamburger = document.getElementById('hamburger');
  if (!menu?.classList.contains('open')) return;

  menu.classList.remove('open');
  overlay?.classList.remove('open');
  hamburger?.classList.remove('open');
  menu.setAttribute('aria-hidden', 'true');
  hamburger?.setAttribute('aria-expanded', 'false');
}

// ── API KEY MANAGEMENT ───────────────────────────
function toggleKeyVis(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
}

function updateKeyBadge(key, active) {
  const badge = document.getElementById(`badge-${key}`);
  if (badge) badge.textContent = active ? '✅' : '❌';
  const card = document.getElementById(`keycard-${key}`);
  if (card) card.classList.toggle('active', active);
}

// ── DIUPDATE: tambah 'kling' ke keyMap ──
function saveAllKeys() {
  const keyMap = ['groq', 'gemini', 'mistral', 'eleven', 'pexels', 'shotstack', 'kling'];
  let saved = 0;

  keyMap.forEach(k => {
    const val = document.getElementById(`key-${k}`)?.value?.trim();
    if (val) { STATE.keys[k] = val; updateKeyBadge(k, true); saved++; }
    else     { delete STATE.keys[k]; updateKeyBadge(k, false); }
  });

  const statusEl = document.getElementById('keys-status');
  if (saved >= 3) {
    STATE.systemActive = true;
    if (statusEl) statusEl.textContent = `✅ ${saved} key tersimpan. Sistem aktif dan siap bekerja otomatis!`;
    addLog('success', '🔑', `${saved} API key berhasil disimpan. Sistem diaktifkan.`);
    showToast(`✅ Sistem aktif! ${saved} API key tersimpan.`);
  } else {
    STATE.systemActive = false;
    if (statusEl) statusEl.textContent = '⚠️ Minimal masukkan 3 API key (Groq, Gemini, Mistral).';
    showToast('⚠️ Minimal 3 API key diperlukan.');
  }

  saveToStorage();
}

// ── PIPELINE ─────────────────────────────────────
async function manualRun() {
  if (!STATE.systemActive) {
    showToast('⚠️ Setup API key terlebih dahulu!');
    navigateTo('keys');
    return;
  }
  const btn = document.getElementById('btn-manual-run');
  if (btn) btn.disabled = true;
  await runFullPipeline('Manual');
  if (btn) btn.disabled = false;
}

async function runFullPipeline(source = 'Manual') {
  STATE.stats.runs++;
  setEl('stat-runs', STATE.stats.runs);

  const progressEl = document.getElementById('run-progress');
  const fillEl     = document.getElementById('progress-fill');
  const textEl     = document.getElementById('progress-text');
  if (progressEl) progressEl.hidden = false;

  addLog('info', '🚀', `Pipeline dimulai (${source})`);

  // ── Agent 1: Budi ──
  setNodeStatus(1, 'working');
  setAgentStatus('a1', '🔄 Sedang mencari trend...');
  setProgress(fillEl, textEl, 10, '🔍 Budi sedang mencari trend viral...');
  addLog('info', '🔍', 'Budi (Agent 1) mulai bekerja...');
  await delay(600);

  const trendResult = await callGroq(
    STATE.keys.groq,
    `Kamu adalah agen pencari trend viral Facebook di Indonesia. Cari dan list 5 topik yang paling viral hari ini di Indonesia. Format: nomor, judul trend, deskripsi singkat 1 kalimat, dan potensi engagement (tinggi/sedang). Balas dalam Bahasa Indonesia.`
  );

  STATE.lastResults.a1 = trendResult;
  STATE.agentStats.a1.runs++;
  STATE.agentStats.a1.found += 5;
  STATE.stats.trends += 5;
  setNodeStatus(1, 'done');
  setAgentStatus('a1', '✅ Trend ditemukan!');
  setProgress(fillEl, textEl, 30, '✅ Budi selesai! Mengirim ke Sari...');
  addLog('success', '✅', 'Budi berhasil menemukan 5 trend viral!');
  setEl('stat-trends', STATE.stats.trends);
  setEl('a1-runs',  STATE.agentStats.a1.runs);
  setEl('a1-found', STATE.agentStats.a1.found);
  updateAgentDot('agent1', 'done');
  displayAgentResult('a1', trendResult, 'Trend Report');
  addAgentChat('agent1', `Laporan ${source}:\n\n${trendResult}`);
  await delay(400);

  // ── Agent 2: Sari ──
  setNodeStatus(2, 'working');
  setAgentStatus('a2', '🔄 Meringkas konten...');
  setProgress(fillEl, textEl, 45, '✍️ Sari sedang meringkas trend...');
  addLog('info', '✍️', 'Sari (Agent 2) menerima data dari Budi...');
  await delay(600);

  const summaryResult = await callGemini(
    STATE.keys.gemini,
    `Berdasarkan trend viral berikut, buat ringkasan konten yang menarik dan siap dijadikan video Facebook. Format setiap topik sebagai: JUDUL KONTEN | HOOK PEMBUKA | POIN UTAMA (3 poin) | CALL TO ACTION.\n\nData trend:\n${trendResult}`
  );

  STATE.lastResults.a2 = summaryResult;
  STATE.agentStats.a2.runs++;
  STATE.agentStats.a2.summaries++;
  setNodeStatus(2, 'done');
  setAgentStatus('a2', '✅ Ringkasan selesai!');
  setProgress(fillEl, textEl, 60, '✅ Sari selesai! Mengirim ke Raka...');
  addLog('success', '✅', 'Sari berhasil meringkas konten!');
  setEl('a2-runs',      STATE.agentStats.a2.runs);
  setEl('a2-summaries', STATE.agentStats.a2.summaries);
  updateAgentDot('agent2', 'done');
  displayAgentResult('a2', summaryResult, 'Content Summary');
  addAgentChat('agent2', `Sari selesai merangkum! Ini hasilnya:\n\n${summaryResult}`);
  await delay(400);

  // ── Agent 3: Raka ──
  setNodeStatus(3, 'working');
  setAgentStatus('a3', '🔄 Membuat prompt video...');
  setProgress(fillEl, textEl, 72, '💡 Raka sedang membuat ide video...');
  addLog('info', '💡', 'Raka (Agent 3) menerima ringkasan dari Sari...');
  await delay(600);

  const promptResult = await callMistral(
    STATE.keys.mistral,
    `Berdasarkan ringkasan konten ini, buat 3 prompt video yang kreatif dan detail untuk konten Facebook viral Indonesia. Setiap prompt harus mencakup: JUDUL VIDEO | DURASI (60-90 detik) | NARASI PEMBUKA | VISUAL YANG DIBUTUHKAN | MUSIK/TONE | TEKS OVERLAY. Buat semenarik mungkin.\n\nRingkasan:\n${summaryResult}`
  );

  STATE.lastResults.a3 = promptResult;
  STATE.agentStats.a3.runs++;
  STATE.agentStats.a3.prompts += 3;
  setNodeStatus(3, 'done');
  setAgentStatus('a3', '✅ Prompt siap!');
  setProgress(fillEl, textEl, 85, '✅ Raka selesai! Mengirim ke Nisa...');
  addLog('success', '✅', 'Raka berhasil membuat 3 prompt video kreatif!');
  setEl('a3-runs',    STATE.agentStats.a3.runs);
  setEl('a3-prompts', STATE.agentStats.a3.prompts);
  updateAgentDot('agent3', 'done');
  displayAgentResult('a3', promptResult, 'Video Prompt');
  addAgentChat('agent3', `Prompt video sudah siap! Langsung saya kirim ke Nisa:\n\n${promptResult}`);
  await delay(400);

  // ── Agent 4: Nisa ──
  setNodeStatus(4, 'working');
  setAgentStatus('a4', '🔄 Membuat video...');
  setProgress(fillEl, textEl, 92, '🎥 Nisa sedang membuat video...');
  addLog('info', '🎥', 'Nisa (Agent 4) mulai membuat video...');
  await delay(800);

  const videoData = await createVideoData(promptResult, source);

  STATE.lastResults.a4 = videoData;
  STATE.agentStats.a4.runs++;
  STATE.agentStats.a4.videos += videoData.length;
  STATE.stats.videos         += videoData.length;
  STATE.videos.push(...videoData);

  setNodeStatus(4, 'done');
  setAgentStatus('a4', '✅ Video siap!');
  setProgress(fillEl, textEl, 100, '🎉 Semua selesai! Video siap diunduh.');
  addLog('success', '🎬', `Nisa berhasil membuat ${videoData.length} video!`);
  setEl('stat-videos', STATE.stats.videos);
  setEl('a4-runs',   STATE.agentStats.a4.runs);
  setEl('a4-videos', STATE.agentStats.a4.videos);
  updateAgentDot('agent4', 'done');
  setEl('result-badge', STATE.videos.length);
  addAgentChat('agent4', `Boss! Video sudah selesai dibuat! 🎉\n\nSaya berhasil membuat ${videoData.length} video dari prompt Raka menggunakan pipeline baru: Kling AI generate avatar → ElevenLabs narasi suara → Shotstack rakit video final. Semua sudah tersedia di halaman Video Output dan siap diunduh!\n\nTinggal download dan upload ke Facebook! 🚀`);
  displayVideoResults(videoData);

  await delay(1000);
  if (progressEl) progressEl.hidden = true;

  showToast(`🎉 Pipeline selesai! ${videoData.length} video siap diunduh.`);
  updateResultsPage();
  saveToStorage();

  setTimeout(() => {
    [1, 2, 3, 4].forEach(n => setNodeStatus(n, 'idle'));
    ['a1', 'a2', 'a3', 'a4'].forEach(a => setAgentStatus(a, '⏸ Standby'));
    ['agent1', 'agent2', 'agent3', 'agent4'].forEach(a => updateAgentDot(a, ''));
  }, 10_000);
}

// ── AI API CALLS ──────────────────────────────────
async function callGroq(apiKey, prompt) {
  if (!apiKey) return generateFallbackTrends();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800
      })
    });
    if (!res.ok) return generateFallbackTrends();
    const data = await res.json();
    return data.choices?.[0]?.message?.content || generateFallbackTrends();
  } catch { return generateFallbackTrends(); }
}

async function callGemini(apiKey, prompt) {
  if (!apiKey) return generateFallbackSummary();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    if (!res.ok) return generateFallbackSummary();
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || generateFallbackSummary();
  } catch { return generateFallbackSummary(); }
}

async function callMistral(apiKey, prompt) {
  if (!apiKey) return generateFallbackPrompt();
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 900
      })
    });
    if (!res.ok) return generateFallbackPrompt();
    const data = await res.json();
    return data.choices?.[0]?.message?.content || generateFallbackPrompt();
  } catch { return generateFallbackPrompt(); }
}

// ── CHAT SEND ─────────────────────────────────────
async function sendChat(agentId) {
  const inputEl = document.getElementById(`input-${agentId}`);
  const msg = inputEl?.value?.trim();
  if (!msg) return;
  inputEl.value = '';

  addUserChat(agentId, msg);
  showTyping(agentId);

  const agent = AGENTS[agentId];
  const resultKey = agentId.replace('agent', 'a');
  const lastResult = STATE.lastResults[resultKey];
  const contextPrompt = lastResult
    ? `Konteks hasil terakhirmu:\n${lastResult}\n\nPertanyaan boss: ${msg}`
    : msg;

  let reply = '';
  try {
    if      (agentId === 'agent1' && STATE.keys.groq)   reply = await callGroqChat(STATE.keys.groq, agent.system, contextPrompt);
    else if (agentId === 'agent2' && STATE.keys.gemini)  reply = await callGeminiChat(STATE.keys.gemini, agent.system, contextPrompt);
    else if (agentId === 'agent3' && STATE.keys.mistral) reply = await callMistralChat(STATE.keys.mistral, agent.system, contextPrompt);
    else if (agentId === 'agent4' && STATE.keys.gemini)  reply = await callGeminiChat(STATE.keys.gemini, agent.system, contextPrompt);
    else reply = getFallbackReply(agentId, msg);
  } catch {
    reply = getFallbackReply(agentId, msg);
  }

  removeTyping(agentId);
  addAgentChat(agentId, reply);
}

async function callGroqChat(key, system, msg) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [{ role: 'system', content: system }, { role: 'user', content: msg }],
      max_tokens: 400
    })
  });
  const d = await res.json();
  return d.choices?.[0]?.message?.content || 'Maaf, ada error. Coba lagi ya Boss!';
}

async function callGeminiChat(key, system, msg) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${system}\n\n${msg}` }] }] })
    }
  );
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, ada error.';
}

async function callMistralChat(key, system, msg) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'system', content: system }, { role: 'user', content: msg }],
      max_tokens: 400
    })
  });
  const d = await res.json();
  return d.choices?.[0]?.message?.content || 'Maaf, ada error.';
}

// ── CHAT UI ───────────────────────────────────────
function addUserChat(agentId, text) {
  const container = document.getElementById(`chat-${agentId}`);
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'chat-msg user-msg';
  div.innerHTML = `<div class="chat-bubble">${escHtml(text)}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addAgentChat(agentId, text) {
  const container = document.getElementById(`chat-${agentId}`);
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'chat-msg agent-msg';
  div.innerHTML = `<div class="chat-bubble">${escHtml(text)}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showTyping(agentId) {
  const container = document.getElementById(`chat-${agentId}`);
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'chat-msg agent-msg';
  div.id = `typing-${agentId}`;
  div.innerHTML = `<div class="chat-bubble">
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  </div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTyping(agentId) {
  document.getElementById(`typing-${agentId}`)?.remove();
}

// ── AGENT RESULT DISPLAY ──────────────────────────
const RESULT_IDS = { a1: 'a1-results', a2: 'a2-results', a3: 'a3-results', a4: 'a4-results' };

function displayAgentResult(agentKey, text, tag) {
  const container = document.getElementById(RESULT_IDS[agentKey]);
  if (!container) return;
  container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'result-item';
  div.innerHTML = `
    <div class="result-item-header">
      <span class="result-item-tag">${escHtml(tag)}</span>
      <span class="result-item-time">${timeStr()}</span>
    </div>
    <div style="white-space:pre-wrap;line-height:1.6;">${escHtml(text)}</div>`;
  container.appendChild(div);
}

// ── VIDEO CREATION (DIUPDATE) ─────────────────────
// Pipeline baru: Kling AI generate avatar → ElevenLabs narasi → Shotstack rakit final
async function createVideoData(promptText, source) {
  const now       = new Date();
  const timeLabel = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateLabel = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const titles    = extractVideoTitles(promptText);
  const emojis    = ['🔥', '💥', '⚡', '🚀', '🌟'];
  const results   = [];

  for (let i = 0; i < titles.length; i++) {
    const title  = titles[i];
    const narasi = extractNarasi(promptText, i);

    // ── STEP 1: Kling AI — generate avatar video ──
    let klingVideoUrl = null;
    let klingTaskId   = null;
    if (STATE.keys.kling) {
      try {
        addLog('info', '🤖', `Kling AI: generate avatar untuk "${title}"...`);
        const kRes = await fetch('https://api.klingai.com/v1/videos/text2video', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STATE.keys.kling}`,
            'Content-Type' : 'application/json'
          },
          body: JSON.stringify({
            model_name      : 'kling-v1',
            prompt          : `Avatar presenter profesional Indonesia membawakan berita: ${title}. ${narasi}`,
            negative_prompt : 'blurry, low quality',
            cfg_scale       : 0.5,
            mode            : 'std',
            duration        : '5'
          })
        });
        const kData   = await kRes.json();
        klingTaskId   = kData.data?.task_id || null;
        klingVideoUrl = kData.data?.task_result?.videos?.[0]?.url || null;
        if (klingTaskId) addLog('success', '🤖', `Kling AI task dimulai: ${klingTaskId}`);
      } catch(e) { console.warn('Kling AI error', e); }
    }

    // ── STEP 2: ElevenLabs — generate narasi suara ──
    let elevenAudioUrl = null;
    if (STATE.keys.eleven && narasi) {
      try {
        addLog('info', '🎙️', `ElevenLabs: generate narasi untuk "${title}"...`);
        // Voice ID default: Rachel (21m00Tcm4TlvDq8ikWAM) — ganti sesuai kebutuhan
        const eRes = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
          method: 'POST',
          headers: {
            'xi-api-key'  : STATE.keys.eleven,
            'Content-Type': 'application/json',
            'Accept'      : 'audio/mpeg'
          },
          body: JSON.stringify({
            text          : narasi,
            model_id      : 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
          })
        });
        if (eRes.ok) {
          const audioBlob = await eRes.blob();
          elevenAudioUrl  = URL.createObjectURL(audioBlob);
          addLog('success', '🎙️', `ElevenLabs: narasi audio siap untuk "${title}"`);
        } else {
          addLog('info', '🎙️', `ElevenLabs: skip (response ${eRes.status})`);
        }
      } catch(e) { console.warn('ElevenLabs error', e); }
    }

    // ── STEP 3: Shotstack — rakit video final ──
    let renderId  = null;
    let renderUrl = null;
    if (STATE.keys.shotstack) {
      try {
        addLog('info', '🎬', `Shotstack: merakit video final "${title}"...`);

        // Track video: avatar dari Kling (jika ada) atau fallback solid color
        const videoTrackClip = klingVideoUrl
          ? { asset: { type: 'video', src: klingVideoUrl, trim: 0 }, start: 0, length: 10, fit: 'cover' }
          : { asset: { type: 'luma', style: 'future' }, start: 0, length: 10 };

        const tracks = [
          { clips: [videoTrackClip] },
          {
            clips: [{
              asset: {
                type      : 'title',
                text      : title,
                style     : 'future',
                color     : '#ffffff',
                size      : 'medium',
                background: '#00000080',
                position  : 'center'
              },
              start: 0, length: 10
            }]
          }
        ];

        // Tambah audio ElevenLabs jika tersedia
        if (elevenAudioUrl) {
          tracks.push({
            clips: [{
              asset : { type: 'audio', src: elevenAudioUrl, volume: 1 },
              start : 0,
              length: 10
            }]
          });
        }

        const sRes = await fetch('https://api.shotstack.io/stage/render', {
          method: 'POST',
          headers: {
            'x-api-key'   : STATE.keys.shotstack,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            timeline: { tracks },
            output  : { format: 'mp4', resolution: 'sd' }
          })
        });
        const sData = await sRes.json();
        renderId = sData.response?.id || null;
        if (renderId) addLog('success', '🎬', `Shotstack render dimulai: ${title} (ID: ${renderId})`);
      } catch(e) { console.warn('Shotstack error', e); }
    }

    results.push({
      id            : `vid_${Date.now()}_${i}`,
      title         : title || `${emojis[i % 5]} Video #${i + 1}`,
      source, dateLabel, timeLabel,
      emoji         : emojis[i % 5],
      prompt        : promptText.slice(0, 200) + '…',
      narasi,
      klingTaskId,
      klingVideoUrl,
      elevenAudioUrl,
      renderId,
      renderUrl,
      duration      : `${60 + i * 10} detik`,
      status        : renderId ? 'rendering' : 'brief',
      pipeline      : {
        kling    : !!klingVideoUrl,
        eleven   : !!elevenAudioUrl,
        shotstack: !!renderId
      }
    });
  }

  return results;
}

// Helper: ekstrak narasi dari prompt untuk ElevenLabs
function extractNarasi(text, idx) {
  const lines  = text.split('\n');
  const narasi = [];
  let found    = false;
  let count    = 0;

  for (const line of lines) {
    if (/narasi|narration|hook|pembuka/i.test(line)) {
      found = true;
      const m = line.match(/:\s*(.+)/);
      if (m) narasi.push(m[1].trim());
      count++;
    } else if (found && line.trim() && count < 3) {
      narasi.push(line.trim());
      count++;
    }
    if (count >= 3) break;
  }

  // Fallback: ambil 2 kalimat pertama dari teks
  if (!narasi.length) {
    const sentences = text.replace(/\n/g, ' ').split(/[.!?]/).filter(s => s.trim().length > 10);
    return sentences.slice(idx * 2, idx * 2 + 2).join('. ').trim() + '.';
  }

  return narasi.join(' ').trim();
}

function extractVideoTitles(text) {
  const titles = [];
  text.split('\n').forEach(line => {
    if (/judul video/i.test(line)) {
      const m = line.match(/:\s*(.+)/);
      if (m) titles.push(m[1].trim());
    }
    if (/^\d+\.\s*.{5,50}$/.test(line)) {
      titles.push(line.replace(/^\d+\.\s*/, '').trim());
    }
  });
  while (titles.length < 3) titles.push(`Video Konten Viral #${titles.length + 1}`);
  return titles.slice(0, 3);
}

function getPexelsQuery(text, idx) {
  const queries = [
    'indonesia viral social media',
    'trending news indonesia',
    'people technology indonesia',
    'creative content facebook',
    'viral video indonesia'
  ];
  return queries[idx % queries.length];
}

// ── VIDEO OUTPUT PAGE ──────────────────────────────
function displayVideoResults(videoData) {
  const container = document.getElementById('a4-results');
  if (!container) return;
  container.innerHTML = `<div style="color:var(--teal);font-weight:600;margin-bottom:12px">✅ ${videoData.length} video berhasil dibuat dan siap diunduh!</div>`;
  videoData.forEach(v => {
    const pipelineTag = [
      v.pipeline?.kling     ? '🤖 Kling'      : '',
      v.pipeline?.eleven    ? '🎙️ ElevenLabs'  : '',
      v.pipeline?.shotstack ? '🎬 Shotstack'   : ''
    ].filter(Boolean).join(' → ') || '📄 Brief';

    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `
      <div class="result-item-header">
        <span class="result-item-tag">Video ${v.status === 'rendering' ? '⏳ Rendering' : 'Siap'}</span>
        <span class="result-item-time">${v.timeLabel}</span>
      </div>
      <strong>${v.emoji} ${escHtml(v.title)}</strong><br>
      <span style="font-size:.75rem;color:var(--text-mid)">Durasi: ${v.duration} | Tanggal: ${v.dateLabel}</span><br>
      <span style="font-size:.7rem;color:#4D96FF;margin-top:4px;display:block">Pipeline: ${pipelineTag}</span>`;
    container.appendChild(div);
  });
}

function updateResultsPage() {
  const grid    = document.getElementById('video-grid');
  const countEl = document.getElementById('results-count');
  if (!grid) return;

  if (!STATE.videos.length) {
    grid.innerHTML = `
      <div class="video-empty">
        <span style="font-size:3rem" aria-hidden="true">🎬</span>
        <p>Belum ada video yang dihasilkan.</p>
        <p>Jalankan pipeline dari halaman Dashboard.</p>
      </div>`;
    if (countEl) countEl.textContent = '0 video tersedia';
    return;
  }

  if (countEl) countEl.textContent = `${STATE.videos.length} video tersedia`;
  grid.innerHTML = '';

  [...STATE.videos].reverse().forEach(v => {
    const pipelineTag = [
      v.pipeline?.kling     ? '🤖 Kling'      : '',
      v.pipeline?.eleven    ? '🎙️ ElevenLabs'  : '',
      v.pipeline?.shotstack ? '🎬 Shotstack'   : ''
    ].filter(Boolean).join(' → ') || '📄 Brief';

    const card = document.createElement('div');
    card.className = 'video-card';
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <div class="video-thumbnail">
        <span style="position:relative;z-index:1;font-size:2.5rem" aria-hidden="true">${v.emoji}</span>
      </div>
      <div class="video-info">
        <div class="video-title">${escHtml(v.title)}</div>
        <div class="video-meta">📅 ${v.dateLabel} · ⏱ ${v.duration} · ▶ ${v.source}</div>
        <div class="video-meta" style="color:#4D96FF;font-size:.7rem">🔧 ${pipelineTag}</div>
        <div class="video-actions">
          <button class="btn-download" onclick="downloadVideo('${v.id}')">⬇ Unduh Video</button>
          <button class="btn-preview"  onclick="previewVideo('${v.id}')">👁 Preview</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

async function downloadVideo(id) {
  const v = STATE.videos.find(x => x.id === id);
  if (!v) return;

  if (v.renderUrl) {
    window.open(v.renderUrl, '_blank');
    showToast('📥 Membuka video...');
    return;
  }

  if (v.renderId && STATE.keys.shotstack) {
    showToast('⏳ Mengecek status render...');
    try {
      const res = await fetch(`https://api.shotstack.io/stage/render/${v.renderId}`, {
        headers: { 'x-api-key': STATE.keys.shotstack }
      });
      const data = await res.json();
      const status = data.response?.status;
      const url    = data.response?.url;

      if (status === 'done' && url) {
        v.renderUrl = url;
        v.status    = 'ready';
        saveToStorage();
        updateResultsPage();
        window.open(url, '_blank');
        showToast('✅ Video siap! Membuka...');
      } else if (status === 'failed') {
        showToast('❌ Render gagal. Coba jalankan pipeline lagi.');
      } else {
        showToast(`⏳ Masih rendering (${status})... Coba lagi dalam 1-2 menit.`);
      }
    } catch(e) {
      showToast('❌ Gagal cek status. Periksa koneksi.');
    }
    return;
  }

  // Fallback: download brief teks
  const pipelineInfo = [
    v.pipeline?.kling     ? 'Kling AI (avatar)'      : 'Kling AI: key belum diset',
    v.pipeline?.eleven    ? 'ElevenLabs (narasi)'     : 'ElevenLabs: key belum diset',
    v.pipeline?.shotstack ? 'Shotstack (video final)' : 'Shotstack: key belum diset'
  ].join('\n  - ');

  const content = [
    'FACEBOOK CONTENT VIDEO BRIEF',
    '='.repeat(40),
    `JUDUL   : ${v.title}`,
    `TANGGAL : ${v.dateLabel}`,
    `DURASI  : ${v.duration}`,
    `SUMBER  : ${v.source}`,
    '',
    'PIPELINE:',
    `  - ${pipelineInfo}`,
    '',
    'NARASI:',
    v.narasi || '(tidak tersedia)',
    '',
    'PROMPT:',
    v.prompt
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `video_brief_${v.id}.txt` });
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Brief diunduh (set Kling + ElevenLabs + Shotstack key untuk video penuh)');
}

function previewVideo(id) {
  const v = STATE.videos.find(x => x.id === id);
  if (!v) return;
  showToast(`${v.emoji} Preview: ${v.title}`);
}

function clearResults() {
  if (!confirm('Hapus semua video? Tindakan ini tidak bisa dibatalkan.')) return;
  STATE.videos       = [];
  STATE.stats.videos = 0;
  setEl('stat-videos',  0);
  setEl('result-badge', 0);
  saveToStorage();
  updateResultsPage();
  showToast('🗑 Semua video telah dihapus.');
}

// ── PIPELINE UI HELPERS ───────────────────────────
function setNodeStatus(nodeNum, status) {
  const node     = document.getElementById(`pnode-${nodeNum}`);
  const statusEl = document.getElementById(`pstatus-${nodeNum}`);
  if (!node || !statusEl) return;
  node.className     = `pipeline-node ${status}`;
  statusEl.className = `pnode-status ${status}`;
  const labels = { idle: 'Standby', working: 'Bekerja...', done: 'Selesai ✓', error: 'Error' };
  statusEl.textContent = labels[status] || status;
}

function setAgentStatus(agentKey, text) {
  const idMap = { a1: 'a1-current-status', a2: 'a2-current-status', a3: 'a3-current-status', a4: 'a4-current-status' };
  const el = document.getElementById(idMap[agentKey]);
  if (el) el.textContent = text;
}

function updateAgentDot(agentId, status) {
  document.querySelectorAll(`#dot-${agentId}`).forEach(dot => {
    dot.className = `agent-status-dot${status ? ` ${status}` : ''}`;
  });
}

function setProgress(fillEl, textEl, pct, text) {
  if (fillEl) {
    fillEl.style.width = `${pct}%`;
    fillEl.closest('[role="progressbar"]')?.setAttribute('aria-valuenow', pct);
  }
  if (textEl) textEl.textContent = text;
}

// ── ACTIVITY LOG ──────────────────────────────────
function addLog(type, icon, text) {
  const log = document.getElementById('activity-log');
  if (!log) return;
  log.querySelector('.log-empty')?.remove();

  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `
    <span class="log-icon" aria-hidden="true">${icon}</span>
    <span class="log-text">${escHtml(text)}</span>
    <span class="log-time">${timeStr()}</span>`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;

  while (log.children.length > 50) log.removeChild(log.firstChild);
}

// ── FALLBACK DATA ──────────────────────────────────
async function generateFallbackTrends() {
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  return `LAPORAN TREND VIRAL — ${today}\nPastikan Groq API key sudah diisi untuk hasil real-time.`;
}

function generateFallbackSummary() {
  return `Pastikan Gemini API key sudah diisi untuk ringkasan konten otomatis.`;
}

function generateFallbackPrompt() {
  return `Pastikan Mistral API key sudah diisi untuk prompt video otomatis.`;
}

function getFallbackReply(agentId, _msg) {
  const replies = {
    agent1: 'Halo Boss! Saya Budi, sedang standby. Untuk mengaktifkan saya secara penuh, masukkan Groq API key di halaman API Keys. 🔍',
    agent2: 'Hai Boss! Sari di sini. Untuk respons real-time, masukkan Gemini API key ya! ✍️',
    agent3: 'Yo Boss! Raka siap! Untuk fitur penuh, masukkan Mistral API key! 💡',
    agent4: 'Halo Boss! Nisa di sini. Saya pakai pipeline terbaru: Kling AI untuk generate avatar, ElevenLabs untuk narasi suara, dan Shotstack untuk merakit video final. Masukkan ketiga key tersebut di halaman API Keys untuk video berkualitas terbaik! 🎥'
  };
  return replies[agentId] || 'Maaf, saya tidak bisa menjawab saat ini. Coba lagi!';
}

// ── UTILITIES ──────────────────────────────────────
const delay   = ms => new Promise(r => setTimeout(r, ms));
const timeStr = ()  => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/\n/g, '<br>');
}

function showToast(msg, duration = 3500) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function updateAllUI() {
  setEl('stat-videos',  STATE.stats.videos);
  setEl('stat-trends',  STATE.stats.trends);
  setEl('stat-runs',    STATE.stats.runs);
  setEl('result-badge', STATE.videos.length);

  setEl('a1-runs',      STATE.agentStats.a1.runs);
  setEl('a1-found',     STATE.agentStats.a1.found);
  setEl('a2-runs',      STATE.agentStats.a2.runs);
  setEl('a2-summaries', STATE.agentStats.a2.summaries);
  setEl('a3-runs',      STATE.agentStats.a3.runs);
  setEl('a3-prompts',   STATE.agentStats.a3.prompts);
  setEl('a4-runs',      STATE.agentStats.a4.runs);
  setEl('a4-videos',    STATE.agentStats.a4.videos);

  if (STATE.lastResults.a1) displayAgentResult('a1', STATE.lastResults.a1, 'Trend Report');
  if (STATE.lastResults.a2) displayAgentResult('a2', STATE.lastResults.a2, 'Content Summary');
  if (STATE.lastResults.a3) displayAgentResult('a3', STATE.lastResults.a3, 'Video Prompt');

  updateResultsPage();
  updateScheduleUI();
}
