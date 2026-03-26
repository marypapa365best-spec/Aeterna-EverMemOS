# Aeterna（数字永生）

> **TL;DR**
> 1) **评审模式 / Judge mode**：打开 `http://170.106.180.152:3001/`，在 **设置** 中填入 EverMemOS + LLM Key 后即可体验。  
> 2) **本地模式 / Local mode**：执行 `npm install` + `npm run dev`，然后访问 `http://localhost:5173`。  
> 3) **生产模式 / Production mode**：执行 `npm run build` + `npm run start`，然后访问 `http://<server-ip>:3001`。

核心目标是：**帮用户把自己的人生阅历、人格与记忆系统性地留存在数字世界，实现一种“数字永生”的可能性。**  

---

## Quick Reference (Judges / Deploy)

- **Online demo (recommended for judges)**  
  Open `http://170.106.180.152:3001/` → click **设置** (top-right) → fill in EverMemOS API Key + LLM API Key (OpenAI or Gemini) → save.
- **Note**  
  The hosted demo may lag behind this repository. GitHub code is the source of truth.
- **Local run (frontend + backend)**  
  In project root: `npm install` → `npm run dev` → open `http://localhost:5173` → configure keys in **设置** if needed.
- **Production-style run (single Node process)**  
  `npm run build` → `npm run start` → open `http://<server-ip>:3001`.
- **More deployment docs**  
  See `docs/` and supplementary repository documentation.

---

## Project Introduction

通过多关卡人格配置与记忆碎片，生成专属数字分身，并将配置与记忆同步到 **EverMemOS Cloud** 作为长期记忆，供进化聊天室、分身好友库等场景的对话与检索使用。  
围绕“人格塑形 → 记忆注入 → 云端保存 → 分身养成 → 对话与进化 → 数字纪念”几个阶段，拆成 **10 个功能板块**：

- **1️⃣ 灵魂拷贝（Personality Wizard）**  
  通过 6 个关卡引导用户沉淀从基础信息、成长环境、创伤与高光、价值观、知识体系到潜意识的关键片段：  
  - 每一关都可以随时“保存并同步到云端”，以 upsert 方式写入 EverMemOS（同一关卡始终只有一条最新记录）；  
  - 这些结构化人格配置，构成数字分身“是谁”的主干。

- **2️⃣ 记忆碎片（Memory Vault）**  
  把散落在生活里的文本、文件、录音整理为“记忆胶囊”：  
  - 支持直接输入文字、上传文件，将重要经历和灵感收集起来；  
  - 首次【创建记忆碎片】仅存本地，确认后点击【上传云端】写入 EverMemOS 专属分组 `vault_twinId`；  
  - 长文本会先通过 Gemini 提炼 3–5 条要点上传，本地仍保留原文；  
  - 这些碎片既是聊天上下文，也是认知矩阵和进化阶段的核心依据。

- **3️⃣ 云端记忆（Cloud Memory View）**  
  面向评委与开发者的 EverMemOS 检视界面：  
  - 按 `user_id` / `group_id` 维度查看云端记忆：  
    - `group_id = twinId`：灵魂拷贝（6 关）的人格配置；  
    - `group_id = vault_twinId`：来自记忆碎片（Memory Vault）的记忆要点。  
  - 方便验证 upsert 是否生效、分组是否干净，为“数字人生档案”提供可审计视图。

- **4️⃣ 分身养成中心（Twin Studio）**  
  总控制台，用来综合查看和调整数字分身的状态：  
  - 聚合展示：外貌配置、人设绑定、记忆碎片注入情况；  
  - 提供三大指标：  
    - **大脑同步率**：根据进化聊天室里的 👍 / 👎 反馈动态调整；  
    - **认知维度矩阵**：基于灵魂拷贝 + 记忆碎片 + 聊天反馈，给出 6 维人格画像；  
    - **进化里程碑**：综合人格完成度、记忆碎片数量和同步率，阶段性点亮“胚胎 → 初级镜像 → 默契伴侣 → 数字双生”。

- **5️⃣ 能力工坊（Skill Workshop）**  
  在“人格 + 记忆”的基础上，为分身挂载不同的能力模式：  
  - 如【每日财经要闻】等技能，会为分身注入特定系统提示词，让对话在某些主题上更专业；  
  - 每个技能可以预设推荐提问，引导用户快速进入该能力场景。

- **6️⃣ 进化聊天室（Evolution Chat）**  
  用户与数字分身的主聊天空间，是“数字永生”日常运作的大脑接口：  
  - 点击【⚡ 唤醒并连接】后，一次性加载 6 关人格与记忆碎片到会话上下文；  
  - 对每条回复进行 👍 / 👎 反馈，驱动【大脑同步率】和认知矩阵的微调，让分身越聊越像你；  
  - 左侧【历史聊天】记录重要会话，形成数字人生的“对话时间线”。

- **7️⃣ AI 社交（AI Social Master）**  
  把分身当作“社交副驾驶”的实验模块：  
  - 使用分身当前画像与偏好，帮助用户扫描和梳理社交圈（Demo 中为模拟数据）；  
  - 提示谁适合主动联络、如何开场、怎样维系关系，探索“数字分身替你观察社交场”的可能性。

- **8️⃣ 未尽之言（Unspoken Words）**  
  为人生中“难以说出口的话”提供一个数字存放处：  
  - 写给某人的未发信、告别信、和解信等，都可以在这里沉淀下来；  
  - 这些情感记忆可以与人格和其他碎片一起构成更完整的数字人生背景。

- **9️⃣ 回忆录（Memoir）**  
  为用户提供一座可视化的“数字档案馆”，系统梳理人生关系与经历；所有数据仅保存在本机浏览器，确保私密可控：
  - **血缘关系网**：以家族树方式整理直系、旁系与配偶关系，支持节点拖拽排布、头像上传、生辰备注与成员搜索；
  - **社会关系网**：以“本人”为中心呈现重要社交关系，帮助沉淀人生中的关键他人与互动脉络；
  - **人生足迹**：以时间轴记录各阶段的重要地点与事件，为数字分身补充完整的人生时间维度。

- **🔟 数字墓地（Digital Cemetery）**  
  让用户为自己设计一处“数字世界的安静角落”，延伸“数字永生”的概念到数字纪念：  
  - 配置墓地风格、氛围标签、核心元素和墓志铭，预览多种场景；  
  - 支持上传自定义的“场景 3”作为默认入口画面；  
  - 右侧的祭扫互动（点灯、喝一杯、留言）为未来亲友保留一个可以前来“看你、想你”的数字纪念空间。

通过这 10 个板块，Aeterna 提供了一条完整路径：  
**从记录人格与记忆、到在 EverMemOS 中长期保存，再到让数字分身带着这些记忆与世界持续对话**——  
帮助用户把“我是谁、我经历了什么、别人如何记住我”留在数字世界里，实现一种温柔而可控的“数字永生”。

---

## Setup Instructions

### Prerequisites

- **Node.js** 18+
- (Optional) [EverMemOS API Key](https://console.evermind.ai/api-keys)
- (Optional) **OpenAI** or **Gemini** API Key (for full chat capability)

### 1) Clone repository

```bash
git clone https://github.com/marypapa365best-spec/EverMemOS-personal-digital-twin-wizard.git
cd EverMemOS-personal-digital-twin-wizard
```

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment (optional)

Use server-side defaults by copying the example env:

```bash
cp .env.example .env
```

Edit `.env` and set:

- `EVERMEMOS_API_KEY` — from [EverMemOS Console](https://console.evermind.ai/api-keys)
- `OPENAI_API_KEY` or `GEMINI_API_KEY` — for Evolution Chat when not using the in-app Settings
- `VITE_GOOGLE_MAPS_API_KEY` — optional default key for Memoir → Footprint map (useful for judge testing)

You can leave them unset and configure keys in-app via **设置 (Settings)**.  
Those keys are sent only to your own backend.

### 4) Run

**Development (frontend + backend)**

```bash
npm run dev
```

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173` (open in browser)

**Production-style (single process)**

```bash
npm run build
npm run server
```

Then open `http://localhost:3001` in your browser.

Do not open `index.html` directly; the chat and save APIs need the backend.

---

## How EverMemOS Is Used

- **Writing memories**  
  When you complete a level in Personality Wizard (灵魂拷贝), or add a memory in Memory Vault (记忆碎片) and submit, the frontend calls `POST /api/twins/save-level` (or the relevant API). The backend forwards the payload to EverMemOS Cloud (`https://api.evermind.ai/api/v0/memories`) so that your twin’s personality and memories are stored as long-term memory.

- **Reading and search**  
  The backend uses the same EverMemOS API for listing and searching memories. Cloud Memory View (云端记忆) and the Evolution Chat (进化聊天室) wake-up flow load these memories so the twin can answer in line with your identity and past data.

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

- **GitHub:** [https://github.com/marypapa365best-spec/Aeterna-EverMemOS](https://github.com/marypapa365best-spec/Aeterna-EverMemOS)
- **License:** See repository.

---