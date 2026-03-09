# Personal Digital Twin Wizard

个人数字分身向导：通过多关卡人格配置，生成专属数字分身，并将配置同步到 [EverMemOS Cloud](https://console.evermind.ai/) 作为长期记忆，供后续对话与检索使用。

---

## 快速启动（评委 / 本地运行）

**说明**：本项目是**网页应用**，没有 .exe 可执行文件。

- **若您访问的是已部署的线上 Demo**：在页面右上角点击「**设置**」，填入您自己的 [EverMemOS API Key](https://console.evermind.ai/api-keys) 与 Gemini API Key 并保存，即可使用全部功能，**无需在本地安装或配置后端**。
- **若您本地运行**：需在终端里用命令启动服务，然后在浏览器里打开页面（见下方步骤）。
- **若您要部署到腾讯云**：见 [腾讯云部署说明](docs/DEPLOY_TENCENT.md)（内含「明天早上做」清单），部署后用户打开网页即可使用，无需本地配置。

**环境要求**：已安装 [Node.js](https://nodejs.org/)（建议 18 及以上）

### 第一步：打开终端并进入项目目录

- **Windows**：在项目文件夹里按住 `Shift` 点右键 → 选「在终端中打开」；或打开「命令提示符」/「PowerShell」，用 `cd` 进入项目目录。
- **Mac / Linux**：打开「终端」，用 `cd` 进入项目目录。

### 第二步：安装依赖并配置 API Key

在终端里依次执行：

```bash
npm install
```

复制环境变量模板并编辑（Windows 可用 `copy .env.example .env`）：

```bash
cp .env.example .env
```

用记事本或任意编辑器打开项目根目录下的 `.env` 文件，在 `EVERMEMOS_API_KEY=` 后面填入你在 [https://console.evermind.ai/api-keys](https://console.evermind.ai/api-keys) 创建的 API Key，保存。

### 第三步：一键启动（前端 + 后端）

在终端执行：

```bash
npm run dev
```

会**同时启动后端（端口 3001）和前端（端口 5173）**，无需开两个终端。看到 `Local: http://localhost:5173` 即表示已就绪。

### 第四步：在浏览器里打开项目

用浏览器打开下面**其中一个**地址（不要直接双击打开 `index.html`，否则聊天会报 404）：

- **开发时（执行了 `npm run dev`）**：打开 **http://localhost:5173**
- **已构建后只跑后端（`npm run build` 再 `npm run server`）**：打开 **http://localhost:3001**

人格向导与进化聊天室都依赖后端接口；若出现「对话请求失败（404）」说明当前页面未连到后端，请用上述地址访问。

> 若不配置 `EVERMEMOS_API_KEY`，前端可正常浏览，但「保存到服务器」会报错（后端返回 503）。  
> 若不配置 `GEMINI_API_KEY`，进化聊天室中与分身对话会失败（后端返回 503）；可在 [Google AI Studio](https://aistudio.google.com/apikey) 创建免费 API Key，在 `.env` 中填写 `GEMINI_API_KEY=`。

---

## 本项目如何使用 EverMemOS

- **写入记忆**：用户在人格向导中完成某一关（如姓名、性格、偏好等）并点击提交时，前端调用 `POST /api/twins/save-level`，后端将 payload 转为 EverMemOS 的 [Add memories](https://docs.evermind.ai/api-reference/core-memory-operation/add-memories) 请求，发送到 `https://api.evermind.ai/api/v0/memories`，形成该分身的长期记忆。
- **记忆用途**：这些记忆可用于后续对话检索、分身人设一致性、或与其它 EverMemOS 能力（搜索、推理等）结合。

API Key 仅保存在服务端（`server/`），前端不接触密钥。

---

## 分身对话（Gemini）

进化聊天室中与分身的对话由 **Google Gemini**（`gemini-1.5-flash`）生成回复。需在服务端 `.env` 中配置 `GEMINI_API_KEY`（在 [Google AI Studio](https://aistudio.google.com/apikey) 创建）。后端接口：`POST /api/chat`，请求体 `{ message, twinId?, history? }`，返回 `{ reply }`。未配置时该接口返回 503。

---

## 脚本说明

| 命令 | 说明 |
|------|------|
| `npm run dev` | **一键启动**：同时启动后端（3001）与前端（5173），打开即用 |
| `npm run server` | 仅启动后端 API（端口 3001） |
| `npm run dev:frontend` | 仅启动前端（端口 5173），需另开终端运行 `npm run server` 才能聊天/保存 |
| `npm run build` | 构建前端静态资源到 `dist/` |
| `npm run start` | 生产环境启动：运行 Node 服务（需先 `npm run build`），同一进程提供页面 + API，用于腾讯云等部署 |
| `npm run preview` | 预览构建后的前端 |

---

## 更多文档

- [**腾讯云部署：打开网页即可使用**](docs/DEPLOY_TENCENT.md)（单进程 Node 或 Nginx + PM2，无需用户本地配置后端）
- [EverMemOS Cloud 接入与部署说明](docs/EVERMEMOS_CLOUD.md)（API Key 获取、云端部署等）

---

## 开发记录 / 对话摘要（供后续接手或 AI 回忆上下文）

以下为一次开发对话的摘要，写入 README 便于下次读文档即可恢复上下文。

- **项目定位**：个人数字分身向导前端 + 小后端，参加 EverMemOS 比赛；评委可克隆代码本地跑，或访问已部署的线上 Demo 在设置里自配 API Key 使用。
- **EverMemOS 使用方式**：使用 **EverMemOS Cloud**（https://console.evermind.ai/），无需下载 GitHub 上的 EverMemOS 仓库；API Key 在控制台创建，前端「设置」里填写并保存（存 localStorage），请求时通过请求头 `X-EverMemOS-API-Key` 带给后端，后端再转发到 `https://api.evermind.ai`。
- **后端**：`server/index.js`（Express），提供 `POST /api/twins/save-level`（写入记忆）、`GET /api/twins/memories`（拉取列表）、`POST /api/twins/memories/search`（搜索）、`POST /api/chat`（分身对话）。优先使用请求头里的 API Key，否则用服务端环境变量。本地运行执行 `npm run dev` 即同时启动前后端；云端部署后打开网页即可使用。
- **前端设置与登录态**：右上角「设置」可填 EverMemOS API Key 和选填「显示名称」；保存后在右上角显示名称或「已连接」，并有「退出」清除 Key。表单项不再显示必填星号。
- **灵魂拷贝（人格向导）**：不做必填校验，填多少保存多少；「同步至云端」按钮随时可点，只同步当前关卡到云端；「继续」等按钮同样不校验必填，先保存再进下一关。保存失败时会提示具体错误（如未配置 Key、后端未启动、EverMemOS 返回信息）。
- **分身养成中心**：大脑同步率圆环的呼吸动画已去掉；曾处理过动画放大出框问题（后改为取消动画）。
- **记忆碎片页 / 云端记忆**：记忆碎片负责输入你的个人原始材料（文件、日记、社交等），云端记忆负责在 EverMemOS 中统一检视与搜索。所有分身共用同一套记忆资产，只是使用方式和权重不同。
- **评委体验**：线上 Demo 打开网页即可；本地需先 `npm install`，再分别启动后端与前端，在设置中配置 API Key 后即可保存。记忆存入评委自己的 EverMemOS 账号。
- **为何本地要启动后端**：保存请求是「前端 → 本机后端 → EverMemOS」；后端未启动则请求无处理方，会失败。部署后后端在服务器常驻，用户只打开前端即可。
- **对话与记忆**：AI 对话不跨会话持久；项目改动都在代码里，后续可读本 README 与 `docs/EVERMEMOS_CLOUD.md` 恢复上下文。
