# 使用 EverMemOS Cloud 接入说明

本项目的「人格向导」在用户完成每一关配置后，会通过后端将数据写入 [EverMemOS Cloud](https://console.evermind.ai/)，作为数字分身的长期记忆，供后续对话与检索使用。

## 1. 获取 API Key

1. 打开 [EverMemOS Cloud 控制台](https://console.evermind.ai/)
2. 登录/注册后，进入 [API Keys](https://console.evermind.ai/api-keys)
3. 点击「Create API Key」，命名后复制密钥（只显示一次，请妥善保存）
4. 可选：在 [Memory Spaces](https://console.evermind.ai/memory-spaces) 中配置 Scenario Mode，影响记忆抽取与整合方式

## 2. 本地开发

### 2.1 安装依赖并配置环境变量

```bash
npm install
cp .env.example .env
```

编辑 `.env`，填入你的 API Key：

```env
EVERMEMOS_API_KEY=你的_API_Key
```

### 2.2 启动后端与前端

**终端 1 - 后端（代理到 EverMemOS Cloud）：**

```bash
npm run server
```

默认在 `http://localhost:3001` 运行。

**终端 2 - 前端：**

```bash
npm run dev
```

前端在 `http://localhost:5173`，请求 `/api/*` 会由 Vite 代理到后端，因此人格配置会写入 EverMemOS Cloud。

## 3. 云端部署

### 3.1 后端部署

将 `server/` 部署到任意能跑 Node 的平台（如 [Railway](https://railway.app/)、[Render](https://render.com/)、[Fly.io](https://fly.io/) 等）：

- 根目录设为项目根（包含 `server/` 与 `package.json`）
- 启动命令：`node server/index.js` 或 `npm run server`
- 环境变量：`EVERMEMOS_API_KEY`（必填）、可选 `PORT`、`EVERMEMOS_API_BASE`

部署后得到后端地址，例如：`https://your-app.railway.app`。

### 3.2 前端部署

将前端部署到 Vercel / Netlify / Cloudflare Pages 等：

- 构建命令：`npm run build`
- 发布目录：`dist`
- 环境变量（若前端与后端不同域）：  
  `VITE_API_BASE=https://your-app.railway.app`  
  （不要末尾斜杠）

这样前端会请求 `https://your-app.railway.app/api/twins/save-level`，人格配置继续写入 EverMemOS Cloud。

### 3.3 同域部署（可选）

若将前端静态资源与后端放在同一域名下（例如 Nginx 反代），则无需设置 `VITE_API_BASE`，前端使用相对路径 `/api/...` 即可。

---

## 4. 腾讯云单机部署（一台服务器替代 Railway + Vercel）

用**一台腾讯云服务器**即可同时跑前端静态站和后端 API，无需 Railway / Vercel。

### 4.1 前提

- 已有一台腾讯云 CVM（Linux，如 Ubuntu 22.04）
- 已安装：Node.js（建议 18+）、Nginx、可选 PM2（`npm i -g pm2`）

### 4.2 在服务器上部署项目

```bash
# 假设项目在 /var/www/personal-digital-twin-wizard
cd /var/www/personal-digital-twin-wizard
git pull   # 或上传代码

# 安装依赖并构建前端
npm ci
npm run build

# 配置环境变量（后端用）
echo "EVERMEMOS_API_KEY=你的API密钥" > .env
# 可选：PORT=3001、EVERMEMOS_API_BASE
```

### 4.3 用 PM2 跑后端（推荐）

```bash
# 安装 PM2（若未安装）
npm i -g pm2

# 启动后端，并设置开机自启
cd /var/www/personal-digital-twin-wizard
pm2 start server/index.js --name twin-api
pm2 save
pm2 startup   # 按提示执行给出的命令
```

后端默认监听 `3001`，只接受本机或 Nginx 转发即可。

### 4.4 配置 Nginx（同域：静态 + 反向代理 /api）

在 Nginx 里为你的域名添加一个 server（或修改默认配置），例如：

```nginx
server {
    listen 80;
    server_name 你的域名或IP;

    # 前端静态资源（Vite 构建产物）
    root /var/www/personal-digital-twin-wizard/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API：转发到本机 Node
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

重载 Nginx：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

此时访问 `http://你的域名` 即可：页面来自 `dist/`，`/api/*` 由 Nginx 转发到本机 3001，**无需设置 VITE_API_BASE**（同域）。

### 4.5 HTTPS（推荐）

用腾讯云申请免费 SSL 证书，在 Nginx 中配置 `listen 443 ssl` 与证书路径，或使用 [Let’s Encrypt + certbot](https://certbot.eff.org/)。

### 4.6 小结

| 项目       | 说明 |
|------------|------|
| 前端       | `dist/` 由 Nginx 直接提供 |
| 后端       | `node server/index.js` 用 PM2 常驻，监听 3001 |
| API 地址   | 同域 `/api/...`，前端不用改 |
| 环境变量   | 仅在服务器上设置 `EVERMEMOS_API_KEY` |

一台腾讯云服务器即可完全替代 Railway（后端）+ Vercel（前端）的部署方式。

---

## 4. 在本项目里如何「存入」与「提取」记忆

### 存入记忆（当前已有）

- **入口**：在「灵魂拷贝」人格向导中，每完成一关并点击提交时，会调用 `saveTwinLevelConfig({ twinId, levelId, data })`。
- **流程**：前端 → `POST /api/twins/save-level`（带 API Key）→ 后端转为 EverMemOS [Add memories](https://docs.evermind.ai/api-reference/core-memory-operation/add-memories)，写入云端。
- **代码**：`src/api/twinApi.ts` 的 `saveTwinLevelConfig`；`src/components/PersonalityWizard.tsx` 在提交时调用。
- **group_id**：后端写入时固定传 `group_id: twinId`、`group_name: "Personal Twin"`，保证同一分身的所有记忆落在同一 group，拉取时分身能一次性看到全部记忆。若之前未传 group_id，EverMemOS 会按 `hash(sender)_group` 自动成组，不同会话可能落在不同 group，导致「只看到最近一条」；新写入已统一 group。

### 提取记忆（拉取列表 / 搜索）

- **拉取列表**：按分身 ID 分页拉取已写入的记忆。  
  - 前端调用：`getMemories({ user_id: "demo-twin-001", memory_type: "episodic_memory", page: 1, page_size: 20 })`。  
  - 对应后端：`GET /api/twins/memories?user_id=xxx&memory_type=episodic_memory&page=1&page_size=20`。
- **搜索记忆**：按关键词/自然语言在云端搜索该分身的记忆。  
  - 前端调用：`searchMemories({ user_id: "demo-twin-001", query: "性格偏好" })`。  
  - 对应后端：`POST /api/twins/memories/search`，body：`{ user_id, query }`。
- **页面入口**：在「记忆碎片」页，若已在设置中填写 EverMemOS API Key，会显示「云端记忆 (EverMemOS)」区块，可点击「从 EverMemOS 拉取记忆」或输入关键词「搜索」。

---

## 5. API 说明

- **写入记忆**：前端在人格向导中完成某一关并提交时，会调用 `POST /api/twins/save-level`，后端将其转为 EverMemOS 的 [Add memories](https://docs.evermind.ai/api-reference/core-memory-operation/add-memories) 请求（`POST https://api.evermind.ai/api/v0/memories`），使用 Bearer Token 认证。
- **记忆内容**：当前以「数字分身人格配置」为描述，将关卡 ID、分身 ID 与配置 JSON 作为一条消息写入，便于后续按用户/分身检索或作为 profile 使用。
- **获取记忆**：`GET /api/twins/memories` 代理 EverMemOS 的 Get memories。
- **搜索记忆**：`POST /api/twins/memories/search` 代理 EverMemOS 的 Search memories。
- **分身对话**：`POST /api/chat` 使用 Google Gemini（需配置 `GEMINI_API_KEY`）生成分身回复，请求体 `{ message, twinId?, history? }`，返回 `{ reply }`。入口为「进化聊天室」。

### 记忆给大模型时的简化

进化聊天室在调用大模型前会通过 `fetchMemoriesForContext` 拉取 EverMemOS 中的记忆并注入系统提示。为控制上下文长度，本项目会**优先使用 EverMemOS 返回的简明字段**再决定给模型看什么：

- **优先使用**：`summary`、`episode`、`atomic_fact`、`foresight`（EverMemOS 按记忆类型可能已做叙事/事实抽取或摘要）。
- **若无上述字段**：再使用原始 `content`，并按 `maxCharsPerMemory`（默认 400 字）截断。

因此若云端返回了 `summary` 等字段，大模型看到的就是「简明版」记忆；若只有原始长文本，则会在本项目中做截断，不会整段原文塞给模型。EverMemOS 是否对某条记忆生成 summary 取决于云端策略与记忆类型，详见 [Memory Types](https://docs.evermind.ai/api-reference/memory-types)。

更多 EverMemOS 概念与 API 见 [官方文档](https://docs.evermind.ai/)。
