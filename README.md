# Personal Digital Twin Wizard

**个人数字分身向导** — 通过多关卡人格配置与记忆碎片，生成专属数字分身，并将配置与记忆同步到 **EverMemOS Cloud** 作为长期记忆，供进化聊天室、分身好友库等场景的对话与检索使用。

---

## Project Introduction

This project is a **web application** for building and managing a personal digital twin:

- **灵魂拷贝 (Soul Copy)** — Multi-level personality wizard: configure identity, values, life stages, and sync to EverMemOS as structured memory.
- **记忆碎片 (Memory Vault)** — Import and store personal memories (text, files); sync to cloud for use in twin conversations.
- **云端记忆 (Cloud Memory)** — Browse and search your EverMemOS memories in one place.
- **分身养成中心 (Twin Growth Center)** — Dashboard, avatar, and brain-sync metrics for your twin.
- **进化聊天室 (Evolution Chat)** — Chat with your twin; replies use EverMemOS memories and personality (OpenAI or Gemini).
- **AI 社交 (AI Social)** — Social radar, red lines, and AI friends chat.

All twin-related memories are stored and retrieved via **EverMemOS Cloud** ([console.evermind.ai](https://console.evermind.ai)); no local EverMemOS binary is required.

---

## Setup Instructions

### Prerequisites

- **Node.js** 18 or higher  
- (Optional) [EverMemOS API Key](https://console.evermind.ai/api-keys) and **OpenAI** or **Gemini** API Key for full functionality

### 1. Clone and enter the repo

```bash
git clone https://github.com/marypapa365best-spec/EverMemOS-personal-digital-twin-wizard.git
cd EverMemOS-personal-digital-twin-wizard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment (optional)

Copy the example env and add your keys if you want server-side defaults:

```bash
cp .env.example .env
```

Edit `.env` and set (optional):

- `EVERMEMOS_API_KEY` — from [EverMemOS Console](https://console.evermind.ai/api-keys)
- `OPENAI_API_KEY` or `GEMINI_API_KEY` — for evolution chat when not using the in-app Settings

You can also leave these unset and configure **EverMemOS API Key** and **OpenAI / Gemini** in the app: click **设置 (Settings)** in the top-right and paste your keys there. They are sent to your own backend only.

### 4. Run the app

**Development (frontend + backend):**

```bash
npm run dev
```

- Backend: **http://localhost:3001**
- Frontend: **http://localhost:5173** — open this in your browser.

**Production-style (single process):**

```bash
npm run build
npm run server
```

Then open **http://localhost:3001** in your browser.

Do not open `index.html` directly; the chat and save APIs need the backend.

---

## How EverMemOS Is Used

- **Writing memories**  
  When you complete a level in the personality wizard or add a memory in 记忆碎片 and submit, the frontend calls `POST /api/twins/save-level` (or the relevant API). The backend forwards the payload to EverMemOS Cloud (`https://api.evermind.ai/api/v0/memories`) so that your twin’s personality and memories are stored as long-term memory.

- **Reading and search**  
  The backend uses the same EverMemOS API for listing and searching memories. 云端记忆 and the evolution chat “唤醒” flow load these memories so the twin can answer in line with your identity and past data.

- **API Key**  
  Keys are configured either in the app (Settings → stored in the browser and sent in request headers) or in the server `.env`. The backend adds `X-EverMemOS-API-Key` when calling EverMemOS; the frontend never sees the key if you use server-side env only.

- **No local EverMemOS install**  
  Everything uses **EverMemOS Cloud**; you only need an API Key from the [EverMemOS Console](https://console.evermind.ai).

---

## Scripts

| Command              | Description |
|----------------------|-------------|
| `npm run dev`        | Start backend (3001) and frontend (5173) together |
| `npm run server`     | Start backend API only (3001) |
| `npm run dev:frontend` | Start frontend only (5173); run `npm run server` separately for chat/save |
| `npm run build`      | Build frontend to `dist/` |
| `npm run start`      | Run production server (serve `dist/` + API); use after `npm run build` |
| `npm run preview`    | Preview the built frontend |

---

## Repository

- **GitHub:** [https://github.com/marypapa365best-spec/EverMemOS-personal-digital-twin-wizard](https://github.com/marypapa365best-spec/EverMemOS-personal-digital-twin-wizard)
- **License:** See repository.

---

## Quick reference for judges / deploy

- **Online demo:** Open the deployed URL → **设置** → enter your EverMemOS (and optionally OpenAI/Gemini) API Key → save. No local setup required.
- **Local run:** `npm install` → `npm run dev` → open http://localhost:5173 → configure API Key in 设置 if needed.
- **Deploy (e.g. single Node process):** `npm run build` then `npm run start`; see `docs/` for Tencent Cloud or other deployment notes if present.
