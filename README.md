# Aeterna（数字永生）

核心目标是：**帮用户把自己的人生阅历、人格与记忆系统性地留存在数字世界，实现一种“数字永生”的可能性。**  

---

## Quick reference for judges / deploy

- **快速在线体验（推荐给评委）：**  
  直接打开 `http://170.106.180.152:3001/` → 点击右上角 **设置** → 填入 EverMemOS API Key 以及 LLM API Key（可选择 OpenAI / Gemini）→ 保存后即可体验完整 Demo。  
  *说明：该线上版本可能相对 GitHub 仓库略有滞后，一切功能与代码以 GitHub 上的最新版本为准。*

- **本地开发体验（含前后端）：**  
  在项目根目录执行：`npm install` → `npm run dev` → 浏览器打开 `http://localhost:5173` → 在应用内 **设置** 中配置 EverMemOS / LLM Key（如需）。

- **生产/评审环境部署（单 Node 进程）：**  
  `npm run build` → `npm run start`，然后访问 `http://服务器IP:3001`。  
  更详细的云端部署（如腾讯云）说明可参考 `docs/` 目录或 GitHub 仓库中的补充文档。

---

## Project Introduction

通过多关卡人格配置与记忆碎片，生成专属数字分身，并将配置与记忆同步到 **EverMemOS Cloud** 作为长期记忆，供进化聊天室、分身好友库等场景的对话与检索使用。  
围绕”人格塑形 → 记忆注入 → 云端保存 → 分身养成 → 对话与进化 → 数字纪念”几个阶段，拆成 **10 个功能板块**：

- **1️⃣ 灵魂拷贝 6 关（Personality Wizard）**  
  通过 6 个关卡，引导用户填入从基础信息、成长环境、创伤与高光、价值观、知识体系到潜意识的关键片段：  
  - 每一关都可以随时「保存并同步到云端」，以 upsert 方式写入 EverMemOS（同一关卡始终只有一条最新记录）；  
  - 这些结构化人格配置，构成数字分身“是谁”的主干。

- **2️⃣ 记忆碎片（Memory Vault）**  
  把散落在生活里的文本、文件、录音整理为“记忆胶囊”：  
  - 支持直接输入文字、上传文件，将重要经历和灵感收集起来；  
  - 首次【创建记忆碎片】仅存本地，确认后点击【上传云端】写入 EverMemOS 专属分组 `vault_twinId`；  
  - 长文本会先通过 Gemini 提炼 3–5 条要点上传，本地仍保留原文；  
  - 这些碎片既是聊天上下文，也是认知矩阵和进化阶段的核心依据。

- **3️⃣ 云端记忆总览（Cloud Memory View）**  
  面向评委/开发者的 EverMemOS 检视界面：  
  - 按 `user_id` / `group_id` 维度查看云端记忆：  
    - `group_id = twinId`：灵魂拷贝 6 关的人格配置；  
    - `group_id = vault_twinId`：来自 Memory Vault 的记忆碎片要点。  
  - 方便验证 upsert 是否生效、分组是否干净，为“数字人生档案”提供可审计视图。

- **4️⃣ 分身养成中心（Twin Studio）**  
  总控制台，用来综合查看和调整数字分身的状态：  
  - 聚合展示：外貌配置、人设绑定、记忆碎片注入情况；  
  - 提供三大指标：  
    - **大脑同步率**：根据进化聊天室里的 👍 / 👎 反馈动态调整；  
    - **认知维度矩阵**：基于灵魂拷贝 + Memory Vault + 聊天反馈，给出 6 维人格画像；  
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

- **7️⃣ AI 社交巡航助手（AI Social Master）**  
  把分身当作“社交副驾驶”的实验模块：  
  - 使用分身当前画像与偏好，帮助用户扫描和梳理社交圈（Demo 中为模拟数据）；  
  - 提示谁适合主动联络、如何开场、怎样维系关系，探索“数字分身替你观察社交场”的可能性。

- **8️⃣ 未寄出的信（Unspoken Words）**  
  为人生中“难以说出口的话”提供一个数字存放处：  
  - 写给某人的未发信、告别信、和解信等，都可以在这里沉淀下来；  
  - 这些情感记忆可以与人格和其他碎片一起构成更完整的数字人生背景。

- **9️⃣ 数字回忆录（Memoir）**
  用可视化方式系统整理人生中的三类关系与轨迹，数据仅存于本机浏览器：
  - **血缘关系网**：以辈分虚线为轴，用直角折线画出父母→子女的血缘连接，配偶以正交线标注；支持节点拖拽、搜索定位、辈分自动分层排列；无父母时兄妹之间保留临时横杠连线，添加父母后自动接入正式血缘线；提供「一键全部保存」确保所有节点数据持久化；
  - **社会关系网**：力导向图展示以「本人」为中心的社交圈，可添加/编辑节点与关系线；
  - **人生足迹**：时间轴卡片记录人生各阶段的地点与事件。

- **🔟 数字墓地（Digital Cemetery）**  
  让用户为自己设计一处「数字世界的安静角落」，延伸“数字永生”的概念到数字纪念：  
  - 配置墓地风格、氛围标签、核心元素和墓志铭，预览多种场景；  
  - 支持上传自定义的“场景 3”作为默认入口画面；  
  - 右侧的祭扫互动（点灯、喝一杯、留言）为未来亲友保留一个可以前来“看你、想你”的数字纪念空间。

通过这 10 个板块，Aeterna 提供了一条完整路径：  
**从记录人格与记忆、到在 EverMemOS 中长期保存，再到让数字分身带着这些记忆与世界持续对话**——  
帮助用户把“我是谁、我经历了什么、别人如何记住我”留在数字世界里，实现一种温柔而可控的“数字永生”。

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

- **GitHub:** [https://github.com/marypapa365best-spec/Aeterna-EverMemOS](https://github.com/marypapa365best-spec/Aeterna-EverMemOS)
- **License:** See repository.

---