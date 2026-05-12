// ═══════════════════════════════════════════════
//  ContentAI Studio — app.js
//  Full pipeline: Groq → Gemini → Mistral → Video
// ═══════════════════════════════════════════════

// ── STATE ──────────────────────────────────────
const STATE = {
  keys: {},
  systemActive: false,
  stats: { videos: 0, trends: 0, runs: 0 },
  agentStats: { a1: { runs: 0, found: 0 }, a2: { runs: 0, summaries: 0 }, a3: { runs: 0, prompts: 0 }, a4: { runs: 0, videos: 0 } },
  videos: [],
  lastResults: { a1: null, a2: null, a3: null, a4: null },
  scheduleStatus: { '07': 'pending', '12': 'pending', '20': 'pending' }
};

// ── AGENT PERSONAS ──────────────────────────────
const AGENTS = {
  agent1: { name: 'Budi', role: 'Trend Finder', ai: 'Groq', color: '#FF6B6B', system: `Kamu adalah Budi, agen AI pencari trend viral untuk konten Facebook Indonesia. Karaktermu ramah, antusias, dan profesional. Kamu bertugas menemukan trend terkini yang viral di Indonesia. Selalu balas dalam Bahasa Indonesia dengan gaya yang natural seperti karyawan yang sedang melapor ke boss-nya. Jika ditanya hasil kerja, ceritakan trend yang kamu temukan dengan detail. Jika sedang idle, bilang sedang standby menunggu jadwal.` },
  agent2: { name: 'Sari', role: 'Summarizer', ai: 'Gemini', color: '#FFD93D', system: `Kamu adalah Sari, agen AI yang bertugas merangkum informasi trend menjadi konten yang menarik untuk Facebook. Karaktermu teliti, kreatif, dan komunikatif. Selalu balas dalam Bahasa Indonesia. Jika ada data trend, ringkas dengan menarik. Laporan ke boss seperti karyawan yang sudah menyelesaikan tugasnya.` },
  agent3: { name: 'Raka', role: 'Prompt Maker', ai: 'Mistral', color: '#6BCB77', system: `Kamu adalah Raka, agen AI yang bertugas membuat prompt dan ide kreatif untuk video Facebook. Karaktermu energetik, kreatif, dan inovatif. Selalu balas dalam Bahasa Indonesia dengan antusias. Buat ide yang fresh dan viral-worthy.` },
  agent4: { name: 'Nisa', role: 'Video Creator', ai: 'Canva+Pexels', color: '#4D96FF', system: `Kamu adalah Nisa, agen AI yang bertugas membuat video dari prompt yang diberikan Raka. Karaktermu perfeksionis, detail-oriented, dan hasil-focused. Selalu balas dalam Bahasa Indonesia. Jika ada video yang sudah dibuat, ceritakan prosesnya dengan bangga.` }
};

// ── INIT ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  startClock();
  startScheduler();
  updateAllUI();

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('agents-dropdown');
    const trigger = document.getElementById('agents-trigger');
    if (wrap && !wrap.contains(e.target) && !trigger.contains(e.target)) {
      closeAgentsDropdown();
    }
  });
});

function loadFromStorage() {
  const saved = localStorage.getItem('contentai_state');
  if (saved) {
    const parsed = JSON.parse(saved);
    STATE.keys = parsed.keys || {};
    STATE.stats = parsed.stats || STATE.stats;
    STATE.agentStats = parsed.agentStats || STATE.agentStats;
    STATE.videos = parsed.videos || [];
    STATE.lastResults = parsed.lastResults || STATE.lastResults;
  }
  Object.entries(STATE.keys).forEach(([k, v]) => {
    const el = document.getElementById(`key-${k}`);
    if (el && v) { el.value = v; updateKeyBadge(k, true); }
  });
  STATE.systemActive = Object.keys(STATE.keys).length >= 3;
}

function saveToStorage() {
  localStorage.setItem('contentai_state', JSON.stringify({
    keys: STATE.keys,
    stats: STATE.stats,
    agentStats: STATE.agentStats,
    videos: STATE.videos,
    lastResults: STATE.lastResults
  }));
}

// ── CLOCK & SCHEDULER ───────────────────────────
function startClock() {
  function tick() {
    const now = new Date();
    document.getElementById('clock-display').textContent =
      now.toLocaleTimeString('id-ID', { hour12: false });
    updateNextRun(now);
  }
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
  const h = now.getHours();
  const m = now.getMinutes();
  const current = h * 60 + m;
  const scheduled = SCHEDULE_HOURS.map(hh => hh * 60);
  const next = scheduled.find(t => t > current);
  const el = document.getElementById('stat-next');
  if (el) {
    if (next !== undefined) {
      const nh = Math.floor(next / 60).toString().padStart(2, '0');
      el.textContent = `${nh}:00`;
    } else { el.textContent = '07:00'; }
  }
}

function updateScheduleUI() {
  const now = new Date();
  const h = now.getHours();
  const slots = { '07': 7, '12': 12, '20': 20 };
  Object.entries(slots).forEach(([key, hour]) => {
    const el = document.getElementById(`ss-${key}`);
    if (!el) return;
    if (h > hour) { el.textContent = '✅'; el.style.color = '#6BCB77'; }
    else if (h === hour) { el.textContent = '🔄'; el.style.color = '#4D96FF'; }
    else { el.textContent = '⏳'; el.style.color = '#7B8DB0'; }
  });
}

// ── NAVIGATION ──────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.dropdown-item').forEach(b => b.classList.remove('active'));

  document.getElementById(`page-${page}`)?.classList.add('active');

  // Activate top nav button
  const topBtn = document.querySelector(`.topnav-links [data-page="${page}"]`);
  if (topBtn) topBtn.classList.add('active');

  // Activate agents trigger if an agent page
  const agentPages = ['agent1','agent2','agent3','agent4'];
  if (agentPages.includes(page)) {
    document.getElementById('agents-trigger')?.classList.add('active');
  }

  // Activate dropdown item
  const dropItem = document.querySelector(`.dropdown-item[data-page="${page}"]`);
  if (dropItem) dropItem.classList.add('active');

  // Update page title bar
  const titles = {
    dashboard: '⚡ Dashboard', keys: '🔑 API Keys',
    agent1: '🔍 Budi — Trend Finder', agent2: '✍️ Sari — Summarizer',
    agent3: '💡 Raka — Prompt Maker', agent4: '🎥 Nisa — Video Creator',
    results: '📦 Video Output'
  };
  document.getElementById('page-title').textContent = titles[page] || page;

  // Close dropdown after nav
  closeAgentsDropdown();

  if (page === 'results') updateResultsPage();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── DROPDOWN ─────────────────────────────────────
function toggleAgentsDropdown() {
  const dropdown = document.getElementById('agents-dropdown');
  const arrow = document.getElementById('dropdown-arrow');
  const isOpen = dropdown.classList.contains('open');
  if (isOpen) {
    closeAgentsDropdown();
  } else {
    dropdown.classList.add('open');
    arrow.classList.add('open');
  }
}

function closeAgentsDropdown() {
  document.getElementById('agents-dropdown')?.classList.remove('open');
  document.getElementById('dropdown-arrow')?.classList.remove('open');
}

// ── MOBILE MENU ──────────────────────────────────
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-overlay');
  const hamburger = document.getElementById('hamburger');
  const isOpen = menu.classList.contains('open');
  menu.classList.toggle('open', !isOpen);
  overlay.classList.toggle('open', !isOpen);
  hamburger.classList.toggle('open', !isOpen);
}

// ── API KEY MANAGEMENT ──────────────────────────
function toggleKeyVis(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function updateKeyBadge(key, active) {
  const el = document.getElementById(`badge-${key}`);
  if (el) { el.textContent = active ? '✅' : '❌'; }
  const card = el?.closest('.key-card');
  if (card) { card.classList.toggle('active', active); }
}

function saveAllKeys() {
  const keyMap = ['groq', 'gemini', 'mistral', 'eleven', 'pexels', 'canva'];
  let saved = 0;
  keyMap.forEach(k => {
    const val = document.getElementById(`key-${k}`)?.value?.trim();
    if (val) { STATE.keys[k] = val; updateKeyBadge(k, true); saved++; }
    else { updateKeyBadge(k, false); }
  });
  if (saved >= 3) {
    STATE.systemActive = true;
    document.getElementById('keys-status').textContent = `✅ ${saved} key tersimpan. Sistem aktif dan siap bekerja otomatis!`;
    addLog('success', '🔑', `${saved} API key berhasil disimpan. Sistem diaktifkan.`);
    showToast(`✅ Sistem aktif! ${saved} API key tersimpan.`);
  } else {
    document.getElementById('keys-status').textContent = '⚠️ Minimal masukkan 3 API key (Groq, Gemini, Mistral).';
    showToast('⚠️ Minimal 3 API key diperlukan.');
  }
  saveToStorage();
}

// ── PIPELINE ────────────────────────────────────
async function manualRun() {
  if (!STATE.systemActive) {
    showToast('⚠️ Setup API key terlebih dahulu!');
    navigateTo('keys');
    return;
  }
  const btn = document.getElementById('btn-manual-run');
  btn.disabled = true;
  await runFullPipeline('Manual');
  btn.disabled = false;
}

async function runFullPipeline(source = 'Manual') {
  STATE.stats.runs++;
  document.getElementById('stat-runs').textContent = STATE.stats.runs;
  const progressEl = document.getElementById('run-progress');
  const fillEl = document.getElementById('progress-fill');
  const textEl = document.getElementById('progress-text');
  if (progressEl) { progressEl.style.display = 'block'; }
  addLog('info', '🚀', `Pipeline dimulai (${source})`);

  setNodeStatus(1, 'working');
  setAgentStatus('a1', '🔄 Sedang mencari trend...');
  setProgress(fillEl, textEl, 10, '🔍 Budi sedang mencari trend viral...');
  addLog('info', '🔍', 'Budi (Agent 1) mulai bekerja...');
  await delay(600);

  const trendResult = await callGroq(STATE.keys.groq,
    `Kamu adalah agen pencari trend viral Facebook di Indonesia. Cari dan list 5 topik yang paling viral hari ini di Indonesia. Format: nomor, judul trend, deskripsi singkat 1 kalimat, dan potensi engagement (tinggi/sedang). Balas dalam Bahasa Indonesia.`);

  STATE.lastResults.a1 = trendResult;
  STATE.agentStats.a1.runs++;
  STATE.agentStats.a1.found += 5;
  STATE.stats.trends += 5;
  setNodeStatus(1, 'done');
  setAgentStatus('a1', '✅ Trend ditemukan!');
  setProgress(fillEl, textEl, 30, '✅ Budi selesai! Mengirim ke Sari...');
  addLog('success', '✅', 'Budi berhasil menemukan 5 trend viral!');
  document.getElementById('stat-trends').textContent = STATE.stats.trends;
  document.getElementById('a1-runs').textContent = STATE.agentStats.a1.runs;
  document.getElementById('a1-found').textContent = STATE.agentStats.a1.found;
  updateAgentDot('agent1', 'done');
  displayAgentResult('a1', trendResult, 'Trend Report');
  addAgentChat('agent1', `Laporan ${source}:\n\n${trendResult}`);

  await delay(400);

  setNodeStatus(2, 'working');
  setAgentStatus('a2', '🔄 Meringkas konten...');
  setProgress(fillEl, textEl, 45, '✍️ Sari sedang meringkas trend...');
  addLog('info', '✍️', 'Sari (Agent 2) menerima data dari Budi...');
  await delay(600);

  const summaryResult = await callGemini(STATE.keys.gemini,
    `Berdasarkan trend viral berikut, buat ringkasan konten yang menarik dan siap dijadikan video Facebook. Format setiap topik sebagai: JUDUL KONTEN | HOOK PEMBUKA | POIN UTAMA (3 poin) | CALL TO ACTION.\n\nData trend:\n${trendResult}`);

  STATE.lastResults.a2 = summaryResult;
  STATE.agentStats.a2.runs++;
  STATE.agentStats.a2.summaries++;
  setNodeStatus(2, 'done');
  setAgentStatus('a2', '✅ Ringkasan selesai!');
  setProgress(fillEl, textEl, 60, '✅ Sari selesai! Mengirim ke Raka...');
  addLog('success', '✅', 'Sari berhasil meringkas konten!');
  document.getElementById('a2-runs').textContent = STATE.agentStats.a2.runs;
  document.getElementById('a2-summaries').textContent = STATE.agentStats.a2.summaries;
  updateAgentDot('agent2', 'done');
  displayAgentResult('a2', summaryResult, 'Content Summary');
  addAgentChat('agent2', `Sari selesai merangkum! Ini hasilnya:\n\n${summaryResult}`);

  await delay(400);

  setNodeStatus(3, 'working');
  setAgentStatus('a3', '🔄 Membuat prompt video...');
  setProgress(fillEl, textEl, 72, '💡 Raka sedang membuat ide video...');
  addLog('info', '💡', 'Raka (Agent 3) menerima ringkasan dari Sari...');
  await delay(600);

  const promptResult = await callMistral(STATE.keys.mistral,
    `Berdasarkan ringkasan konten ini, buat 3 prompt video yang kreatif dan detail untuk konten Facebook viral Indonesia. Setiap prompt harus mencakup: JUDUL VIDEO | DURASI (60-90 detik) | NARASI PEMBUKA | VISUAL YANG DIBUTUHKAN | MUSIK/TONE | TEKS OVERLAY. Buat semenarik mungkin.\n\nRingkasan:\n${summaryResult}`);

  STATE.lastResults.a3 = promptResult;
  STATE.agentStats.a3.runs++;
  STATE.agentStats.a3.prompts += 3;
  setNodeStatus(3, 'done');
  setAgentStatus('a3', '✅ Prompt siap!');
  setProgress(fillEl, textEl, 85, '✅ Raka selesai! Mengirim ke Nisa...');
  addLog('success', '✅', 'Raka berhasil membuat 3 prompt video kreatif!');
  document.getElementById('a3-runs').textContent = STATE.agentStats.a3.runs;
  document.getElementById('a3-prompts').textContent = STATE.agentStats.a3.prompts;
  updateAgentDot('agent3', 'done');
  displayAgentResult('a3', promptResult, 'Video Prompt');
  addAgentChat('agent3', `Prompt video sudah siap! Langsung saya kirim ke Nisa:\n\n${promptResult}`);

  await delay(400);

  setNodeStatus(4, 'working');
  setAgentStatus('a4', '🔄 Membuat video...');
  setProgress(fillEl, textEl, 92, '🎥 Nisa sedang membuat video...');
  addLog('info', '🎥', 'Nisa (Agent 4) mulai membuat video...');
  await delay(800);

  const videoData = await createVideoData(promptResult, source);

  STATE.lastResults.a4 = videoData;
  STATE.agentStats.a4.runs++;
  STATE.agentStats.a4.videos += videoData.length;
  STATE.stats.videos += videoData.length;
  STATE.videos.push(...videoData);
  setNodeStatus(4, 'done');
  setAgentStatus('a4', '✅ Video siap!');
  setProgress(fillEl, textEl, 100, '🎉 Semua selesai! Video siap diunduh.');
  addLog('success', '🎬', `Nisa berhasil membuat ${videoData.length} video!`);
  document.getElementById('stat-videos').textContent = STATE.stats.videos;
  document.getElementById('a4-runs').textContent = STATE.agentStats.a4.runs;
  document.getElementById('a4-videos').textContent = STATE.agentStats.a4.videos;
  updateAgentDot('agent4', 'done');
  document.getElementById('result-badge').textContent = STATE.videos.length;
  addAgentChat('agent4', `Boss! Video sudah selesai dibuat! 🎉\n\nSaya berhasil membuat ${videoData.length} video dari prompt Raka. Semua sudah tersedia di halaman Video Output dan siap diunduh!\n\nTinggal download dan upload ke Facebook! 🚀`);
  displayVideoResults(videoData);

  await delay(1000);
  if (progressEl) { progressEl.style.display = 'none'; }

  showToast(`🎉 Pipeline selesai! ${videoData.length} video siap diunduh.`);
  updateResultsPage();
  saveToStorage();

  setTimeout(() => {
    [1,2,3,4].forEach(n => setNodeStatus(n, 'idle'));
    ['a1','a2','a3','a4'].forEach(a => setAgentStatus(a, '⏸ Standby'));
    updateAgentDot('agent1', ''); updateAgentDot('agent2', '');
    updateAgentDot('agent3', ''); updateAgentDot('agent4', '');
  }, 10000);
}

// ── AI API CALLS ─────────────────────────────────

async function callGroq(apiKey, prompt) {
  if (!apiKey) return generateFallbackTrends();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3-8b-8192', messages: [{ role: 'user', content: prompt }], max_tokens: 800 })
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
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
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
      body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: prompt }], max_tokens: 900 })
    });
    if (!res.ok) return generateFallbackPrompt();
    const data = await res.json();
    return data.choices?.[0]?.message?.content || generateFallbackPrompt();
  } catch { return generateFallbackPrompt(); }
}

async function sendChat(agentId) {
  const inputEl = document.getElementById(`input-${agentId}`);
  const msg = inputEl?.value?.trim();
  if (!msg) return;
  inputEl.value = '';

  addUserChat(agentId, msg);
  showTyping(agentId);

  const agent = AGENTS[agentId];
  const lastResult = STATE.lastResults[agentId.replace('agent', 'a')];
  const contextPrompt = lastResult ? `Konteks hasil terakhirmu:\n${lastResult}\n\nPertanyaan boss: ${msg}` : msg;

  let reply = '';
  try {
    if (agentId === 'agent1' && STATE.keys.groq) {
      reply = await callGroqChat(STATE.keys.groq, agent.system, contextPrompt);
    } else if (agentId === 'agent2' && STATE.keys.gemini) {
      reply = await callGeminiChat(STATE.keys.gemini, agent.system, contextPrompt);
    } else if (agentId === 'agent3' && STATE.keys.mistral) {
      reply = await callMistralChat(STATE.keys.mistral, agent.system, contextPrompt);
    } else if (agentId === 'agent4') {
      reply = await callGeminiChat(STATE.keys.gemini, agent.system, contextPrompt);
    } else {
      reply = getFallbackReply(agentId, msg);
    }
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
    body: JSON.stringify({ model: 'llama3-8b-8192', messages: [{ role: 'system', content: system }, { role: 'user', content: msg }], max_tokens: 400 })
  });
  const d = await res.json();
  return d.choices?.[0]?.message?.content || 'Maaf, ada error. Coba lagi ya Boss!';
}

async function callGeminiChat(key, system, msg) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${system}\n\n${msg}` }] }] }) }
  );
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, ada error.';
}

async function callMistralChat(key, system, msg) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'system', content: system }, { role: 'user', content: msg }], max_tokens: 400 })
  });
  const d = await res.json();
  return d.choices?.[0]?.message?.content || 'Maaf, ada error.';
}

// ── CHAT UI ──────────────────────────────────────
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
  div.innerHTML = `<div class="chat-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTyping(agentId) {
  document.getElementById(`typing-${agentId}`)?.remove();
}

// ── AGENT RESULT DISPLAY ─────────────────────────
function displayAgentResult(agentKey, text, tag) {
  const idMap = { a1: 'a1-results', a2: 'a2-results', a3: 'a3-results', a4: 'a4-results' };
  const container = document.getElementById(idMap[agentKey]);
  if (!container) return;
  container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'result-item';
  div.innerHTML = `
    <div class="result-item-header">
      <span class="result-item-tag">${tag}</span>
      <span class="result-item-time">${timeStr()}</span>
    </div>
    <div style="white-space:pre-wrap;line-height:1.6;">${escHtml(text)}</div>`;
  container.appendChild(div);
}

// ── VIDEO CREATION ───────────────────────────────
async function createVideoData(promptText, source) {
  const now = new Date();
  const timeLabel = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateLabel = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const titles = extractVideoTitles(promptText);
  const emojis = ['🔥', '💥', '⚡', '🚀', '🌟'];
  const topics = ['Viral Indonesia', 'Trending Hari Ini', 'Konten Populer', 'Info Terkini', 'Fakta Menarik'];

  return titles.map((title, i) => ({
    id: `vid_${Date.now()}_${i}`,
    title: title || `${emojis[i % 5]} Video ${topics[i % 5]} — ${timeLabel}`,
    source, dateLabel, timeLabel,
    emoji: emojis[i % 5],
    prompt: promptText.slice(0, 200) + '...',
    pexelsQuery: getPexelsQuery(promptText, i),
    duration: `${60 + i * 10} detik`,
    status: 'ready'
  }));
}

function extractVideoTitles(text) {
  const lines = text.split('\n');
  const titles = [];
  lines.forEach(line => {
    if (line.match(/judul video/i)) {
      const match = line.match(/:\s*(.+)/);
      if (match) titles.push(match[1].trim());
    }
    if (line.match(/^\d+\.\s*.{5,50}$/)) titles.push(line.replace(/^\d+\.\s*/, '').trim());
  });
  while (titles.length < 3) titles.push(`Video Konten Viral #${titles.length + 1}`);
  return titles.slice(0, 3);
}

function getPexelsQuery(text, idx) {
  const queries = ['indonesia viral social media', 'trending news indonesia', 'people technology indonesia', 'creative content facebook', 'viral video indonesia'];
  return queries[idx % queries.length];
}

// ── VIDEO OUTPUT PAGE ────────────────────────────
function displayVideoResults(videoData) {
  const container = document.getElementById('a4-results');
  if (!container) return;
  container.innerHTML = `<div style="color:var(--accent-3);font-weight:600;margin-bottom:12px">✅ ${videoData.length} video berhasil dibuat dan siap diunduh!</div>`;
  videoData.forEach(v => {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `
      <div class="result-item-header">
        <span class="result-item-tag">Video Siap</span>
        <span class="result-item-time">${v.timeLabel}</span>
      </div>
      <strong>${v.emoji} ${v.title}</strong><br>
      <span style="font-size:0.75rem;color:var(--text-muted)">Durasi: ${v.duration} | Tanggal: ${v.dateLabel}</span>`;
    container.appendChild(div);
  });
}

function updateResultsPage() {
  const grid = document.getElementById('video-grid');
  const countEl = document.getElementById('results-count');
  if (!grid) return;
  if (!STATE.videos.length) {
    grid.innerHTML = `<div class="video-empty"><div style="font-size:3rem">🎬</div><div>Belum ada video yang dihasilkan.</div><div style="font-size:0.8rem;color:var(--text-muted)">Jalankan pipeline dari halaman Dashboard.</div></div>`;
    if (countEl) countEl.textContent = '0 video tersedia';
    return;
  }
  if (countEl) countEl.textContent = `${STATE.videos.length} video tersedia`;
  grid.innerHTML = '';
  [...STATE.videos].reverse().forEach(v => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
      <div class="video-thumbnail">
        <span style="position:relative;z-index:1;font-size:2.5rem">${v.emoji}</span>
      </div>
      <div class="video-info">
        <div class="video-title">${escHtml(v.title)}</div>
        <div class="video-meta">📅 ${v.dateLabel} · ⏱ ${v.duration} · ▶ ${v.source}</div>
        <div class="video-actions">
          <button class="btn-download" onclick="downloadVideo('${v.id}')">⬇ Unduh Video</button>
          <button class="btn-preview" onclick="previewVideo('${v.id}')">👁 Preview</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

function downloadVideo(id) {
  const v = STATE.videos.find(x => x.id === id);
  if (!v) return;
  const content = `FACEBOOK CONTENT VIDEO BRIEF\n${'='.repeat(40)}\n\nJUDUL: ${v.title}\nTANGGAL: ${v.dateLabel}\nDURASI: ${v.duration}\nSUMBER: ${v.source}\n\nPROMPT:\n${v.prompt}\n\nCatatan: File ini berisi brief video. Upload ke Canva untuk membuat video final.\nPexels Query: ${v.pexelsQuery}`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `video_brief_${v.id}.txt`; a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Video brief berhasil diunduh!');
}

function previewVideo(id) {
  const v = STATE.videos.find(x => x.id === id);
  if (!v) return;
  showToast(`${v.emoji} Preview: ${v.title}`);
}

function clearResults() {
  if (!confirm('Hapus semua video? Tindakan ini tidak bisa dibatalkan.')) return;
  STATE.videos = [];
  STATE.stats.videos = 0;
  document.getElementById('stat-videos').textContent = 0;
  document.getElementById('result-badge').textContent = 0;
  saveToStorage();
  updateResultsPage();
  showToast('🗑 Semua video telah dihapus.');
}

// ── PIPELINE UI HELPERS ──────────────────────────
function setNodeStatus(nodeNum, status) {
  const node = document.getElementById(`pnode-${nodeNum}`);
  const statusEl = document.getElementById(`pstatus-${nodeNum}`);
  if (!node || !statusEl) return;
  node.className = `pipeline-node ${status}`;
  const labels = { idle: 'Standby', working: 'Bekerja...', done: 'Selesai ✓', error: 'Error' };
  statusEl.className = `pnode-status ${status}`;
  statusEl.textContent = labels[status] || status;
}

function setAgentStatus(agentKey, text) {
  const idMap = { a1: 'a1-current-status', a2: 'a2-current-status', a3: 'a3-current-status', a4: 'a4-current-status' };
  const el = document.getElementById(idMap[agentKey]);
  if (el) el.textContent = text;
}

function updateAgentDot(agentId, status) {
  // Update dots in both topnav dropdown and mobile menu
  const dots = document.querySelectorAll(`#dot-${agentId}`);
  dots.forEach(dot => { dot.className = `agent-status-dot ${status}`; });
}

function setProgress(fillEl, textEl, pct, text) {
  if (fillEl) fillEl.style.width = `${pct}%`;
  if (textEl) textEl.textContent = text;
}

// ── ACTIVITY LOG ─────────────────────────────────
function addLog(type, icon, text) {
  const log = document.getElementById('activity-log');
  if (!log) return;
  const empty = log.querySelector('.log-empty');
  if (empty) empty.remove();
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="log-icon">${icon}</span><span class="log-text">${escHtml(text)}</span><span class="log-time">${timeStr()}</span>`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
  while (log.children.length > 50) log.removeChild(log.firstChild);
}

// ── FALLBACK DATA ─────────────────────────────────
function generateFallbackTrends() {
  const trends = [
    '1. Kenaikan Harga BBM | Masyarakat ramai membahas dampak kenaikan BBM terhadap harga sembako | Engagement: Tinggi',
    '2. Viral Warung Makan Gratis | Seorang ibu membuka warung makan gratis setiap hari Jumat | Engagement: Tinggi',
    '3. Teknologi AI di Indonesia | Semakin banyak startup Indonesia menggunakan AI untuk bisnis | Engagement: Sedang',
    '4. Fenomena FOMO Gen Z | Generasi Z Indonesia semakin tertekan akibat media sosial | Engagement: Tinggi',
    '5. Wisata Lokal Trending | Destinasi wisata tersembunyi di Indonesia viral di TikTok dan Instagram | Engagement: Sedang'
  ];
  return `LAPORAN TREND VIRAL HARI INI\n\n${trends.join('\n\n')}\n\n[Demo Mode - Masukkan Groq API key untuk data real-time]`;
}

function generateFallbackSummary() {
  return `RINGKASAN KONTEN FACEBOOK\n\n1. JUDUL: Harga BBM Naik, Ini Tips Hemat Belanja!\nHOOK: "Harga naik, tapi kamu tetap bisa hemat!"\nPOIN: (1) Belanja di pasar lokal (2) Masak sendiri di rumah (3) Gabung komunitas hemat\nCTA: "Komen strategi hematmu!"\n\n2. JUDUL: Warung Gratis yang Bikin Terharu!\nHOOK: "Ada warung yang tidak minta bayar..."\nPOIN: (1) Kisah inspiratif ibu berprestasi (2) Dampak sosial nyata (3) Bagaimana kamu bisa ikut\nCTA: "Share kalau kamu terinspirasi!"\n\n[Demo Mode]`;
}

function generateFallbackPrompt() {
  return `PROMPT VIDEO FACEBOOK\n\n1. JUDUL VIDEO: Tips Hemat di Tengah Harga Naik\nDURASI: 75 detik\nNARASI: "Harga naik bukan berarti hidupmu susah! Ini 5 tips yang sudah terbukti..."\nVISUAL: Pasar tradisional, ibu memasak, keluarga bahagia\nMUSIK: Upbeat, semangat\nTEXT OVERLAY: Tips muncul satu per satu\n\n2. JUDUL VIDEO: Warung Ibu Ini Bikin Nangis!\nDURASI: 90 detik\nNARASI: "Ada yang tidak percaya? Di kota ini ada warung yang tidak pernah minta bayar..."\nVISUAL: Suasana warung, orang antri, senyum bahagia\nMUSIK: Emosional, menyentuh\nTEXT OVERLAY: Quotes inspiratif\n\n[Demo Mode]`;
}

function getFallbackReply(agentId, msg) {
  const replies = {
    agent1: `Halo Boss! Saya Budi, sedang standby sekarang. Untuk mengaktifkan saya secara penuh, masukkan Groq API key di halaman API Keys. Data demo sudah saya siapkan! 🔍`,
    agent2: `Hai Boss! Sari di sini. Untuk respons yang lebih personal dan real-time, masukkan Gemini API key ya! Tapi data demo sudah saya siapkan. ✍️`,
    agent3: `Yo Boss! Raka siap! Untuk fitur penuh, masukkan Mistral API key! 💡`,
    agent4: `Halo Boss! Nisa di sini. Video brief sudah siap dan bisa diunduh dari halaman Video Output! 🎥`
  };
  return replies[agentId] || 'Maaf, saya tidak bisa menjawab saat ini. Coba lagi!';
}

// ── UTILITIES ─────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function timeStr() { return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function showToast(msg, duration = 3500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function updateAllUI() {
  document.getElementById('stat-videos').textContent = STATE.stats.videos;
  document.getElementById('stat-trends').textContent = STATE.stats.trends;
  document.getElementById('stat-runs').textContent = STATE.stats.runs;
  document.getElementById('result-badge').textContent = STATE.videos.length;

  document.getElementById('a1-runs').textContent = STATE.agentStats.a1.runs;
  document.getElementById('a1-found').textContent = STATE.agentStats.a1.found;
  document.getElementById('a2-runs').textContent = STATE.agentStats.a2.runs;
  document.getElementById('a2-summaries').textContent = STATE.agentStats.a2.summaries;
  document.getElementById('a3-runs').textContent = STATE.agentStats.a3.runs;
  document.getElementById('a3-prompts').textContent = STATE.agentStats.a3.prompts;
  document.getElementById('a4-runs').textContent = STATE.agentStats.a4.runs;
  document.getElementById('a4-videos').textContent = STATE.agentStats.a4.videos;

  if (STATE.lastResults.a1) displayAgentResult('a1', STATE.lastResults.a1, 'Trend Report');
  if (STATE.lastResults.a2) displayAgentResult('a2', STATE.lastResults.a2, 'Content Summary');
  if (STATE.lastResults.a3) displayAgentResult('a3', STATE.lastResults.a3, 'Video Prompt');

  updateResultsPage();
  updateScheduleUI();
}
