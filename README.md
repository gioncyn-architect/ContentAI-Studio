# 🎬 ContentAI Studio

> **Sistem AI Agent Otomatis untuk Konten Facebook**
> 4 karyawan AI bekerja 24/7 — mencari trend, meringkas, membuat prompt, dan menghasilkan video siap upload.

![ContentAI Studio](https://img.shields.io/badge/ContentAI-Studio-FF6B6B?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xNyAxMC41VjdBMSAxIDAgMCAwIDE2IDZINEExIDEgMCAwIDAgMyA3VjE3QTEgMSAwIDAgMCA0IDE4SDE2QTEgMSAwIDAgMCAxNyAxN1YxMy41TDIxIDE3VjdMMTcgMTAuNVoiLz48L3N2Zz4=)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-6BCB77?style=for-the-badge)

---

## 📸 Preview

```
┌─────────────────────────────────────────────────┐
│  🎬 ContentAI Studio                            │
│                                                  │
│  ⚡Dashboard  🔑API Keys  👥Agents  📦Output    │
│                                                  │
│  Pipeline: Budi → Sari → Raka → Nisa           │
│  Status:   ✅Done  ✅Done  🔄Working  ⏳Wait    │
│                                                  │
│  🎬 12 Video  🔍 60 Trend  ⚡ 4 Run  ⏱ 20:00  │
└─────────────────────────────────────────────────┘
```

---

## ✨ Fitur Utama

- **🤖 4 AI Agent** bekerja secara otomatis dalam satu pipeline
- **⏰ Scheduler Otomatis** — jam 07:00, 12:00, dan 20:00 setiap hari
- **💬 Chat Langsung** ke setiap agent untuk memantau pekerjaan mereka
- **🔑 BYOK** (Bring Your Own Key) — masukkan API key sendiri, gratis tanpa modal
- **📦 Video Output** siap unduh dan upload ke Facebook
- **📊 Dashboard Realtime** dengan log aktivitas lengkap
- **💾 Auto-save** semua data & hasil kerja di browser (localStorage)
- **📱 Responsive** — bisa dibuka di HP maupun laptop

---

## 👥 Kenalan dengan Tim Agent

| Agent | Nama | Tugas | AI Engine |
|-------|------|-------|-----------|
| 🔍 Agent 1 | **Budi** | Pencari Trend Viral | Groq (LLaMA 3) |
| ✍️ Agent 2 | **Sari** | Meringkas Konten | Gemini 1.5 Flash |
| 💡 Agent 3 | **Raka** | Membuat Prompt & Ide Video | Mistral AI |
| 🎥 Agent 4 | **Nisa** | Membuat Video Final | Canva + Pexels + ElevenLabs |

### Alur Kerja Pipeline

```
Scheduler (07:00 / 12:00 / 20:00)
       │
       ▼
  🔍 Budi          Groq LLaMA3
  Cari 5 trend viral Indonesia
       │
       ▼
  ✍️ Sari          Gemini Flash
  Ringkas jadi konten Facebook
       │
       ▼
  💡 Raka          Mistral AI
  Buat 3 prompt video kreatif
       │
       ▼
  🎥 Nisa          Canva + Pexels + ElevenLabs
  Generate video siap upload
       │
       ▼
  📦 Video Output
  Unduh & Upload ke Facebook
```

---

## 🚀 Cara Pakai (Zero Setup)

### 1. Clone atau Download

```bash
git clone https://github.com/username/contentai-studio.git
cd contentai-studio
```

Atau langsung **Download ZIP** dari tombol hijau di atas.

### 2. Buka di Browser

```
Tidak perlu install apapun!
Cukup buka file index.html di browser.
```

> Double-click `index.html` → langsung jalan di Chrome / Edge / Firefox

### 3. Masukkan API Key

Klik menu **🔑 API Keys** lalu isi:

| Key | Daftar Gratis Di |
|-----|-----------------|
| Groq API Key | [console.groq.com](https://console.groq.com) |
| Gemini API Key | [aistudio.google.com](https://aistudio.google.com) |
| Mistral API Key | [console.mistral.ai](https://console.mistral.ai) |
| ElevenLabs API Key | [elevenlabs.io](https://elevenlabs.io) |
| Pexels API Key | [pexels.com/api](https://www.pexels.com/api) |
| Canva API Key | [canva.com/developers](https://www.canva.com/developers) |

> **Minimal 3 key** (Groq + Gemini + Mistral) untuk sistem aktif.

### 4. Aktifkan & Jalankan

- Klik **💾 Simpan Semua Key & Aktifkan System**
- Sistem akan otomatis jalan sesuai jadwal
- Atau klik **▶ Jalankan Semua Agent** untuk test manual

---

## 📁 Struktur File

```
contentai-studio/
│
├── index.html        # Struktur halaman utama
├── style.css         # Desain & tampilan (warna cerah)
├── app.js            # Logic utama, pipeline, scheduler, chat
└── README.md         # Dokumentasi ini
```

---

## 🔑 Daftar API Gratis

Semua API yang digunakan memiliki **free tier** — tidak perlu kartu kredit untuk mulai:

### Groq (Agent Budi)
- Free tier: **~14,400 request/hari**
- Model: `llama3-8b-8192`
- Daftar: https://console.groq.com

### Gemini Flash (Agent Sari)
- Free tier: **1,500 request/hari**
- Model: `gemini-1.5-flash-latest`
- Daftar: https://aistudio.google.com

### Mistral AI (Agent Raka)
- Free tier: tersedia di free plan
- Model: `mistral-small-latest`
- Daftar: https://console.mistral.ai

### ElevenLabs (Narasi Suara Nisa)
- Free tier: **10,000 karakter/bulan**
- Daftar: https://elevenlabs.io

### Pexels (Stok Visual Nisa)
- Free tier: **200 request/jam**
- Daftar: https://www.pexels.com/api

### Canva (Template Video Nisa)
- Free tier: tersedia
- Daftar: https://www.canva.com/developers

---

## 🖥️ Kompatibilitas

| Browser | Status |
|---------|--------|
| Google Chrome | ✅ Penuh |
| Microsoft Edge | ✅ Penuh |
| Mozilla Firefox | ✅ Penuh |
| Safari | ✅ Penuh |
| Opera | ✅ Penuh |

| Perangkat | Status |
|-----------|--------|
| Desktop / Laptop | ✅ Optimal |
| Tablet | ✅ Responsif |
| HP / Mobile | ✅ Responsif |

---

## ⚙️ Mode Demo

Tidak punya API key dulu? Tidak masalah.

Sistem sudah dilengkapi **fallback data demo** — kamu bisa langsung test pipeline, lihat alur kerja setiap agent, dan coba fitur chat tanpa key apapun.

---

## 🔒 Keamanan

- Semua API key **disimpan lokal** di browser kamu (`localStorage`)
- Key **tidak dikirim** ke server manapun selain API resmi masing-masing provider
- Tidak ada database, tidak ada backend — murni **client-side**

---

## 🗺️ Roadmap

- [ ] Integrasi Canva API untuk video nyata
- [ ] Integrasi Pexels video otomatis
- [ ] Narasi suara ElevenLabs langsung di app
- [ ] Export jadwal ke Google Calendar
- [ ] Notifikasi browser saat video siap
- [ ] Fitur approval konten sebelum pipeline lanjut
- [ ] Multi-bahasa (EN/ID)
- [ ] Dark mode

---

## 🤝 Kontribusi

Pull request sangat disambut! Untuk perubahan besar, buka issue dulu ya.

```bash
# Fork repo ini
# Buat branch fitur baru
git checkout -b fitur/nama-fitur

# Commit perubahan
git commit -m "Tambah: nama-fitur"

# Push ke branch
git push origin fitur/nama-fitur

# Buka Pull Request
```

---

## 📄 Lisensi

Proyek ini menggunakan lisensi **MIT** — bebas digunakan, dimodifikasi, dan didistribusikan.

---

## 👨‍💻 Dibuat dengan ❤️

**ContentAI Studio** — Karena konten bagus seharusnya tidak butuh kerja keras manual.

> *"Biarkan AI yang kerja, kamu yang kreatif."*

---

<div align="center">
  <strong>⭐ Kalau bermanfaat, jangan lupa kasih bintang!</strong>
</div>
