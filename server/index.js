/**
 * 后端代理：接收前端的人格配置，转发到 EverMemOS Cloud API。
 * API Key 仅保存在服务端，避免暴露在前端。
 * @see https://docs.evermind.ai/cloud/quickstart
 * @see https://docs.evermind.ai/api-reference/core-memory-operation/add-memories
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const EVERMEMOS_API_BASE = process.env.EVERMEMOS_API_BASE || "https://api.evermind.ai";
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

/**
 * 优先使用请求头中的评委/用户自己的 API Key（便于线上 Demo 评委自配），否则使用服务端 .env 配置。
 */
function getApiKey(req) {
  const fromHeader = req.get("X-EverMemOS-API-Key") || req.get("x-evermemos-api-key");
  if (fromHeader && fromHeader.trim()) return fromHeader.trim();
  return process.env.EVERMEMOS_API_KEY || null;
}

/**
 * POST /api/twins/save-level
 * Body: { twinId, levelId, data }
 * Header: X-EverMemOS-API-Key（可选，评委在页面设置后由前端携带）
 * 将人格关卡配置转为一条“消息”写入 EverMemOS，便于后续检索（如 profile / 对话上下文）。
 */
app.post("/api/twins/save-level", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      error: "API_KEY_REQUIRED",
      message: "请在本页面「设置」中填写您的 EverMemOS API Key，或由部署者配置服务端 EVERMEMOS_API_KEY。",
    });
  }

  const { twinId, levelId, data } = req.body || {};
  if (!twinId || levelId == null || !data || typeof data !== "object") {
    return res.status(400).json({
      ok: false,
      error: "Missing twinId, levelId, or data",
    });
  }

  const messageId = `twin_${twinId}_level_${levelId}_${Date.now()}`;
  const createTime = new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const content = `[数字分身人格配置] 关卡 ${levelId}，分身 ID: ${twinId}。配置内容：${JSON.stringify(data)}`;

  const payload = {
    message_id: messageId,
    create_time: createTime,
    sender: twinId,
    group_id: twinId,
    group_name: "Personal Twin",
    sender_name: data.given_name || data.family_name ? [data.family_name, data.given_name].filter(Boolean).join("") : undefined,
    content,
    role: "user",
    flush: true,
  };

  try {
    const r = await fetch(`${EVERMEMOS_API_BASE}/api/v0/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }

    if (!r.ok) {
      const errMsg = body.message || body.code || body.error || "EverMemOS 请求失败";
      console.error("EverMemOS save-level error:", r.status, errMsg, body);
      return res.status(r.status >= 500 ? 502 : r.status).json({
        ok: false,
        error: errMsg,
        message: errMsg,
        details: body,
      });
    }

    return res.json({
      ok: true,
      request_id: body.request_id,
      status: body.status,
    });
  } catch (err) {
    console.error("EverMemOS request error:", err);
    const errMsg = err.message || "Network error";
    return res.status(502).json({
      ok: false,
      error: errMsg,
      message: errMsg,
    });
  }
});

/**
 * GET /api/twins/memories?user_id=xxx&memory_type=episodic_memory&page=1&page_size=20
 * 按 user_id（分身 ID）拉取已写入的记忆列表。
 */
app.get("/api/twins/memories", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      error: "API_KEY_REQUIRED",
      message: "请在本页面「设置」中填写您的 EverMemOS API Key。",
    });
  }
  const user_id = req.query.user_id || req.query.userId;
  if (!user_id) {
    return res.status(400).json({ ok: false, error: "Missing user_id (e.g. twinId)" });
  }
  const memory_type = req.query.memory_type || "episodic_memory";
  const page = parseInt(req.query.page, 10) || 1;
  const page_size = Math.min(parseInt(req.query.page_size, 10) || 20, 100);
  const group_id = req.query.group_id || req.query.groupId;
  try {
    const params = new URLSearchParams({
      user_id: String(user_id),
      memory_type: String(memory_type),
      page: String(page),
      page_size: String(page_size),
    });
    if (group_id) params.set("group_ids", String(group_id));
    const r = await fetch(`${EVERMEMOS_API_BASE}/api/v0/memories?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ ok: false, error: "Invalid response from EverMemOS" });
    }
    if (!r.ok) {
      return res.status(r.status >= 500 ? 502 : r.status).json({
        ok: false,
        error: data.message || data.code || "EverMemOS request failed",
        details: data,
      });
    }
    return res.json(data);
  } catch (err) {
    console.error("EverMemOS get memories error:", err);
    return res.status(502).json({ ok: false, error: err.message || "Network error" });
  }
});

/**
 * POST /api/twins/memories/search
 * Body: { user_id, query, memory_types?, retrieve_method? }
 * 按关键词/语义搜索该分身的记忆。
 */
app.post("/api/twins/memories/search", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      error: "API_KEY_REQUIRED",
      message: "请在本页面「设置」中填写您的 EverMemOS API Key。",
    });
  }
  const { user_id, query, memory_types, retrieve_method } = req.body || {};
  const userId = user_id || req.body?.userId;
  if (!userId || !query || !String(query).trim()) {
    return res.status(400).json({ ok: false, error: "Missing user_id or query" });
  }
  const body = {
    user_id: String(userId),
    query: String(query).trim(),
    memory_types: memory_types || ["episodic_memory", "profile", "event_log"],
    retrieve_method: retrieve_method || "hybrid",
  };
  try {
    const params = new URLSearchParams({
      user_id: body.user_id,
      query: body.query,
      retrieve_method: body.retrieve_method,
    });
    // memory_types 是数组，这里用逗号拼接成字符串传给 EverMemOS
    if (Array.isArray(body.memory_types) && body.memory_types.length > 0) {
      params.set("memory_types", body.memory_types.join(","));
    }

    const r = await fetch(`${EVERMEMOS_API_BASE}/api/v0/memories/search?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ ok: false, error: "Invalid response from EverMemOS" });
    }
    if (!r.ok) {
      return res.status(r.status >= 500 ? 502 : r.status).json({
        ok: false,
        error: data.message || data.code || "EverMemOS request failed",
        details: data,
      });
    }
    return res.json(data);
  } catch (err) {
    console.error("EverMemOS search memories error:", err);
    return res.status(502).json({ ok: false, error: err.message || "Network error" });
  }
});

/**
 * 优先使用请求头中的大模型 API Key，其次请求体（防止代理丢弃自定义头），最后服务端环境变量。
 */
function getGeminiApiKey(req) {
  const fromHeader = req.get("X-Gemini-API-Key") || req.get("x-gemini-api-key");
  if (fromHeader && fromHeader.trim()) return fromHeader.trim();
  const fromBody = req.body?.gemini_api_key;
  if (fromBody && typeof fromBody === "string" && fromBody.trim()) return fromBody.trim();
  return process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
}

function getOpenAIApiKey(req) {
  const fromHeader = req.get("X-OpenAI-API-Key") || req.get("x-openai-api-key");
  if (fromHeader && fromHeader.trim()) return fromHeader.trim();
  const fromBody = req.body?.openai_api_key;
  if (fromBody && typeof fromBody === "string" && fromBody.trim()) return fromBody.trim();
  return process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : null;
}

const CHAT_SYSTEM_PROMPT =
  "你是用户的个人数字分身，会结合用户的记忆与人格设定自然、亲切地对话。以第一人称「我」回复，不要暴露你是 AI，像朋友或助手一样交流。回复尽量简洁，一两段即可。";

/**
 * POST /api/chat
 * Body: { message: string, twinId?: string, history?: { role: "user"|"assistant", content: string }[] }
 * Header: X-OpenAI-API-Key 或 X-Gemini-API-Key（在页面设置中填写）。优先使用 OpenAI。
 */
app.post("/api/chat", async (req, res) => {
  const { message, twinId, history = [] } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ ok: false, error: "Missing or empty message", message: "请填写消息内容。" });
  }

  const openaiKey = getOpenAIApiKey(req);
  const geminiKey = getGeminiApiKey(req);
  console.log("[chat] keys present: openai=" + !!openaiKey + " gemini=" + !!geminiKey);

  if (openaiKey) {
    try {
      const messages = [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        ...(Array.isArray(history) ? history : [])
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
          .slice(-20)
          .map((m) => ({ role: m.role, content: String(m.content).trim() })),
        { role: "user", content: message.trim() },
      ];
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const errMsg = data.error?.message || data.message || `OpenAI ${r.status}`;
        console.error("OpenAI chat error:", r.status, errMsg);
        return res.status(r.status >= 500 ? 502 : r.status).json({
          ok: false,
          error: errMsg,
          message: errMsg,
        });
      }
      const reply = data.choices?.[0]?.message?.content;
      if (reply == null || reply === "") {
        return res.status(502).json({
          ok: false,
          error: "Empty response from OpenAI",
          message: "模型未返回有效回复，请重试。",
        });
      }
      return res.json({ ok: true, reply: String(reply).trim() });
    } catch (err) {
      console.error("OpenAI chat error:", err);
      return res.status(502).json({
        ok: false,
        error: err.message || "OpenAI 请求失败",
        message: err.message || "OpenAI 请求失败",
      });
    }
  }

  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: CHAT_SYSTEM_PROMPT,
      });
      const geminiHistory = (Array.isArray(history) ? history : [])
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
        .slice(-20)
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: String(m.content).trim() }],
        }));
      const chat = model.startChat({ history: geminiHistory });
      const result = await chat.sendMessage(message.trim());
      const response = result.response;
      if (!response || !response.text) {
        return res.status(502).json({
          ok: false,
          error: "Empty response from Gemini",
          message: "模型未返回有效回复，请重试。",
        });
      }
      return res.json({ ok: true, reply: response.text().trim() });
    } catch (err) {
      console.error("Gemini chat error:", err);
      const msg = err.message || "Gemini 请求失败";
      const status = err.message && err.message.includes("API key") ? 401 : 502;
      return res.status(status).json({
        ok: false,
        error: msg,
        message: msg,
      });
    }
  }

  return res.status(503).json({
    ok: false,
    error: "LLM_API_KEY_REQUIRED",
    message: "请在页面「设置」中填写大模型 API Key（OpenAI 或 Gemini），或由部署者在服务端配置 OPENAI_API_KEY / GEMINI_API_KEY。",
  });
});

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "twin-api" });
});

// 若已构建前端（存在 dist），则由同一服务提供页面，避免 /api 请求 404
const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  console.log("Serving frontend from dist/; open http://localhost:" + PORT);
}

app.listen(PORT, () => {
  console.log(`Twin API server running at http://localhost:${PORT}`);
  if (!process.env.EVERMEMOS_API_KEY) {
    console.warn("EVERMEMOS_API_KEY is not set; /api/twins/save-level will return 503.");
  }
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY / GEMINI_API_KEY not set; /api/chat (分身对话) will need key from 设置.");
  }
});
