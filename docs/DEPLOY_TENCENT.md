# 腾讯云部署：打开网页即可使用

部署到腾讯云后，**用户只需在浏览器打开你的网址**即可使用，无需在本地安装 Node、配置后端或改 `.env`。  
EverMemOS API Key、Gemini API Key 等均在页面右上角「设置」里填写并保存在浏览器本地。

---

**部署前建议先读：** [今日总结（今天干了什么）](./今日总结_2025-03-08.md)，再按下面清单操作。

## 明早按这个做（已记下，直接打勾）

**A. 本地：代码推到 GitHub**

- [ ] 在 GitHub 新建仓库（若还没有）。
- [ ] 本地项目目录：`git init`（若还没有）→ `git remote add origin https://github.com/你的用户名/仓库名.git`
- [ ] `git add .` → `git commit -m "init"` → `git push -u origin main`（或 master）。

**B. 服务器：首次部署**

- [ ] 腾讯云 CVM 已就绪，记下公网 IP；已装 Node 18+。
- [ ] SSH 登录后：`cd /var/www`（或你选的目录）→ `git clone https://github.com/你的用户名/仓库名.git personal-digital-twin-wizard` → `cd personal-digital-twin-wizard`
- [ ] `npm ci` → `npm run build` → `npm run start` 试跑；正常则 `pm2 start server/index.js --name twin` → `pm2 save` → `pm2 startup`。
- [ ] 安全组放行 3001；浏览器打开 `http://公网IP:3001` 验证。

**C. 以后每次改代码要更新**

- [ ] 本地：改完 → `git push`。
- [ ] 服务器：`cd 项目目录` → `git pull` → `npm ci` → `npm run build` → `pm2 restart twin`。

---

## 明天早上做：腾讯云部署清单（保存用）

按顺序打勾即可：

- [ ] **1. 腾讯云**：确认已有一台 CVM（Linux，如 Ubuntu 22.04），记下公网 IP。
- [ ] **2. 装 Node**：在服务器上安装 Node.js 18+（`node -v` 能输出版本即可）。
- [ ] **3. 通过 GitHub 上传代码**：在本地把项目 push 到 GitHub；在服务器上用 `git clone https://github.com/你的用户名/你的仓库名.git` 拉取到目录（如 `/var/www/personal-digital-twin-wizard`）。这样以后每次改代码只需本地 push，服务器上 `git pull` 即可更新代码。
- [ ] **4. 构建**：在项目目录执行 `npm ci`，再执行 `npm run build`。
- [ ] **5. 启动**：执行 `npm run start` 试跑；若正常，用 `pm2 start server/index.js --name twin`，再 `pm2 save`、`pm2 startup`。
- [ ] **6. 放行端口**：在腾讯云安全组里放行 3001（或你用的 PORT）。
- [ ] **7. 验证**：浏览器打开 `http://你的公网IP:3001`，在「设置」里填 EverMemOS / Gemini Key，试一下灵魂拷贝和进化聊天室。

**以后每次修改代码要更新线上：** 本地改完 → `git push` 到 GitHub → 登录服务器，在项目目录执行：`git pull` → `npm ci` → `npm run build` → `pm2 restart twin`。详见下方「通过 GitHub 更新代码」。

---

## 方式一：单进程 Node（推荐，最简单）

本项目的 Node 服务在**已构建前端**（存在 `dist/`）时，会**同时提供静态页面和 `/api` 接口**，因此一台服务器只跑一个进程即可。

### 1. 准备服务器

- 腾讯云 CVM（Linux，如 Ubuntu 22.04）
- 已安装 **Node.js 18+**（可用 `nvm` 或官方源）

### 2. 通过 GitHub 上传代码并构建

**建议先把本仓库推到 GitHub**，这样以后改代码只需 push，服务器上 `git pull` 即可更新。

```bash
cd /var/www   # 或你希望的目录
git clone https://github.com/你的用户名/你的仓库名.git personal-digital-twin-wizard
cd personal-digital-twin-wizard

# 安装依赖（含 devDependencies，用于构建）
npm ci

# 构建前端（生成 dist/）
npm run build
```

### 3. 启动服务

```bash
# 默认端口 3001；如需 80 端口可先：export PORT=80（需 root 或 setcap）
npm run start
```

或使用 **PM2** 常驻并开机自启：

```bash
npm i -g pm2
pm2 start server/index.js --name twin
pm2 save
pm2 startup   # 按提示执行给出的命令
```

### 4. 访问

- **直接访问**：`http://你的服务器公网IP:3001`  
- 若使用 PM2 且未改端口，同上。  
- 无需在本地配置任何东西：打开网页 → 右上角「设置」填写 EverMemOS / Gemini API Key → 即可使用灵魂拷贝、云端记忆、进化聊天室等。

### 5. 通过 GitHub 更新代码（每次改完代码后）

本地修改并推送到 GitHub 后，在服务器上执行：

```bash
cd /var/www/personal-digital-twin-wizard   # 你的项目目录
git pull
npm ci
npm run build
pm2 restart twin
```

即可完成一次发布，用户刷新网页即看到新版本。

### 6. 可选：服务端环境变量

服务器上的 `.env` **可选**。不配置时，所有 API Key 由用户在页面「设置」里填写即可。

若你希望用服务端统一配置（例如评委不填 Key 也能用），可在项目目录创建 `.env`（不要提交到 GitHub，已在 .gitignore）：

```env
EVERMEMOS_API_KEY=可选，不填则需用户在设置里填
GEMINI_API_KEY=可选，不填则需用户在设置里填
PORT=3001
```

---

## 方式二：Nginx + Node（需 80/443 或 HTTPS）

若希望用 **80/443 端口** 或配置 **HTTPS + 域名**，可用 Nginx 做反向代理，Node 只监听 3001。

### 1. 部署与构建（同方式一）

```bash
cd /var/www/personal-digital-twin-wizard
npm ci
npm run build
```

### 2. 用 PM2 启动 Node（只提供 API，不提供静态）

此时可以仍用同一份 `server/index.js`（会同时提供 `dist/` 和 `/api`），或让 Nginx 提供静态、Node 只提供 API。下面按 **Nginx 提供静态 + Node 只提供 API** 举例：

```bash
pm2 start server/index.js --name twin
pm2 save
```

（若你让 Node 同时提供 dist 和 API，则 Nginx 只做反向代理到 3001 即可，见下方「仅反代」配置。）

### 3. Nginx 配置示例

**方案 A：Nginx 只反代到 Node（Node 已提供页面 + API）**

```nginx
server {
    listen 80;
    server_name 你的域名或IP;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**方案 B：Nginx 提供静态，/api 反代到 Node**

```nginx
server {
    listen 80;
    server_name 你的域名或IP;
    root /var/www/personal-digital-twin-wizard/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
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

重载 Nginx：`sudo nginx -t && sudo systemctl reload nginx`。

### 4. HTTPS（推荐）

在腾讯云申请免费 SSL 证书，在 Nginx 中配置 `listen 443 ssl` 与证书路径，或使用 Let's Encrypt + certbot。

---

## 小结

| 项目         | 说明 |
|--------------|------|
| 用户侧       | 打开网页即用，在「设置」中填写 EverMemOS / Gemini API Key，无需本地配置后端 |
| 部署侧       | 方式一：`npm run build && npm run start`（或 PM2）；方式二：Nginx + PM2 |
| 端口         | 默认 3001；可 `PORT=80` 或 Nginx 反代到 80/443 |
| 环境变量     | 服务器上 `.env` 可选；不填则依赖用户在页面设置里填 Key |

部署完成后，把 **http(s)://你的域名或IP(:3001)** 发给评委或用户，对方打开即可使用。
