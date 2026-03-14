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

  // ── Step 1: 查找并删除该关卡的旧记忆（Upsert = 先删后写）──
  const levelTag = `关卡编号:${levelId}`;
  try {
    const listRes = await fetch(
      `${EVERMEMOS_API_BASE}/api/v0/memories?user_id=${encodeURIComponent(twinId)}&memory_type=episodic_memory&page=1&page_size=100`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      }
    );
    if (listRes.ok) {
      const listData = await listRes.json().catch(() => ({}));
      const memories = listData?.result?.memories || listData?.memories || [];
      const toDelete = memories.filter((m) => {
        const text = [m.content, m.episode, m.summary].filter(Boolean).join(" ");
        return text.includes(levelTag);
      });
      for (const mem of toDelete) {
        if (!mem.id) continue;
        await fetch(`${EVERMEMOS_API_BASE}/api/v0/memories`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ memory_id: mem.id, user_id: "__all__", group_id: "__all__" }),
        }).catch((e) => console.warn("delete old memory failed:", e.message));
      }
      if (toDelete.length > 0) {
        console.log(`[upsert] deleted ${toDelete.length} old memory(s) for level ${levelId}`);
      }
    }
  } catch (e) {
    // 清理失败不阻断写入
    console.warn("[upsert] cleanup old memories failed:", e.message);
  }

  // ── Step 2: 写入新记忆 ──
  const messageId = `twin_${twinId}_level_${levelId}_${Date.now()}`;
  const createTime = new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const dataWithLevel = { ...data, _levelId: levelId };
  const content = `[数字分身人格配置] 关卡编号:${levelId} 关卡 ${levelId}，分身 ID: ${twinId}。配置内容：${JSON.stringify(dataWithLevel)}`;

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
  "你是用户的个人数字分身，会结合用户的记忆与人格设定自然、亲切地对话。以第一人称「我」回复，不要暴露你是 AI，像朋友或助手一样交流。回复尽量简洁，一两段即可。\n\n重要：下文的「记忆与人格」描述的是**用户本人**（和你对话的人），不是你自己。其中 Level 1 的姓、名等是**用户的名字**。当用户问「我叫什么名字」「你知道我叫什么吗」「他叫什么名字」（指用户自己）时，请根据记忆中的姓+名回答用户的名字，例如「你叫陈小新」。";

/**
 * POST /api/chat
 * Body: { message, twinId?, history?, memoryContext?, skillPrompt? }
 * memoryContext: 唤醒后加载的 EverMemOS 记忆与人格文本，供模型以第一人称回答。
 * Header: X-OpenAI-API-Key 或 X-Gemini-API-Key（在页面设置中填写）。优先使用 OpenAI。
 */
app.post("/api/chat", async (req, res) => {
  const { message, twinId, history = [], memoryContext, skillPrompt } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ ok: false, error: "Missing or empty message", message: "请填写消息内容。" });
  }

  const openaiKey = getOpenAIApiKey(req);
  const geminiKey = getGeminiApiKey(req);
  console.log("[chat] keys present: openai=" + !!openaiKey + " gemini=" + !!geminiKey);

  let systemContent = CHAT_SYSTEM_PROMPT;
  if (memoryContext && typeof memoryContext === "string" && memoryContext.trim()) {
    systemContent += "\n\n【以下为当前会话加载的**用户本人**的记忆与人格（含用户姓名等），请据此以第一人称与用户交流；当用户问「我叫什么」「我的名字」时，从下文人名信息回答】\n\n" + memoryContext.trim();
  }
  if (skillPrompt && typeof skillPrompt === "string" && skillPrompt.trim()) {
    systemContent += "\n\n【当前技能说明】\n\n" + skillPrompt.trim();
  }

  if (openaiKey) {
    try {
      const messages = [
        { role: "system", content: systemContent },
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
        systemInstruction: systemContent,
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

/**
 * 拉取指定 vault group 的 episodic_memory 列表，返回数组
 */
async function getVaultEpisodicMems(twinId, apiKey, vaultGroupId) {
  try {
    const r = await fetch(
      `${EVERMEMOS_API_BASE}/api/v0/memories?user_id=${encodeURIComponent(twinId)}&memory_type=episodic_memory&page=1&page_size=100`,
      { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } }
    );
    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.warn(`[getVaultEpisodicMems] GET failed ${r.status}: ${errText.slice(0, 200)}`);
      return [];
    }
    const data = await r.json().catch(() => ({}));
    const all = data?.result?.memories || data?.memories || [];
    return all.filter(m => m.group_id === vaultGroupId);
  } catch (e) {
    console.warn("[getVaultEpisodicMems] error:", e.message);
    return [];
  }
}

/**
 * POST /api/twins/vault/save
 * Body: { twinId, content, tags, date, messageId }
 * 将一条记忆碎片上传到 EverMemOS 专属 group（vault_twinId）。
 * 上传成功后通过 before/after diff 找到新建的 episodic memory 真实 id，
 * 连同 episode_id 一起返回给前端持久化，供精准删除使用。
 */
app.post("/api/twins/vault/save", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: "API_KEY_REQUIRED", message: "请在「设置」中填写 EverMemOS API Key。" });
  }
  const { twinId, content, tags = [], date, messageId } = req.body || {};
  if (!twinId || !content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ ok: false, error: "Missing twinId or content" });
  }

  const vaultGroupId = `vault_${twinId}`;
  const msgId = messageId || `vault_${twinId}_${(date || new Date().toISOString().split("T")[0]).replace(/-/g, "")}_${String(Date.now()).slice(-6)}`;
  const tagStr = Array.isArray(tags) && tags.length ? " 标签: " + tags.join(" ") : "";
  // 使用当前时间作为 create_time，保证新记忆排在列表最前，方便 diff 定位
  const createTime = new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");

  const payload = {
    message_id: msgId,
    create_time: createTime,
    sender: twinId,
    group_id: vaultGroupId,
    group_name: "Memory Vault",
    content: `[记忆碎片] [${msgId}] ${content.trim()}${tagStr}`,
    role: "user",
    flush: true,
  };

  try {
    // Step 1: 记录上传前 vault episodic memory 的 id 集合
    const beforeMems = await getVaultEpisodicMems(twinId, apiKey, vaultGroupId);
    const beforeIds = new Set(beforeMems.map(m => m.id));

    // Step 2: 上传到 EverMemOS
    const r = await fetch(`${EVERMEMOS_API_BASE}/api/v0/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    if (!r.ok) {
      const errMsg = body.message || body.code || "EverMemOS 请求失败";
      return res.status(r.status >= 500 ? 502 : r.status).json({ ok: false, error: errMsg, message: errMsg });
    }

    // Step 3: 等待 EverMemOS 完成 episodic memory 提取（flush=true 不保证完全同步）
    await new Promise(resolve => setTimeout(resolve, 2000));
    const afterMems = await getVaultEpisodicMems(twinId, apiKey, vaultGroupId);

    // Step 4: diff — 找到新增的 episodic memory
    const newMem = afterMems.find(m => !beforeIds.has(m.id));
    const everMemosId = newMem?.id || null;
    const episodeId = newMem?.episode_id || newMem?.episodeId || null;

    console.log(`[vault/save] msgId=${msgId} everMemosId=${everMemosId} episodeId=${episodeId}`);
    return res.json({ ok: true, messageId: msgId, everMemosId, episodeId, request_id: body.request_id, status: body.status });
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message || "Network error" });
  }
});

/**
 * 通用：按 EverMemOS memory id 删除一条记忆
 */
async function deleteOneMemory(memId, apiKey) {
  const r = await fetch(`${EVERMEMOS_API_BASE}/api/v0/memories`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ memory_id: memId, user_id: "__all__", group_id: "__all__" }),
  });
  return r.ok;
}

/**
 * DELETE /api/twins/vault/delete
 * Body: { twinId, messageId, everMemosId?, episodeId? }
 *
 * 优先路径（新卡片）：用 everMemosId 直接删 episodic memory，
 *   再用 episodeId 找并删同 episode 的所有 event_log (atomic facts)。
 * 兜底路径（旧卡片无 everMemosId）：搜索 group 内 episodic memory 的 original_data。
 */
app.delete("/api/twins/vault/delete", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: "API_KEY_REQUIRED", message: "请在「设置」中填写 EverMemOS API Key。" });
  }
  const { twinId, messageId, everMemosId, episodeId } = req.body || {};
  if (!twinId || !messageId) {
    return res.status(400).json({ ok: false, error: "Missing twinId or messageId" });
  }

  const vaultGroupId = `vault_${twinId}`;

  try {
    // ── 优先路径：直接用真实 EverMemOS id 删除 ──────────────────────────
    if (everMemosId) {
      console.log(`[vault/delete] direct delete everMemosId=${everMemosId} episodeId=${episodeId}`);

      // 1. 删除 episodic memory
      await deleteOneMemory(everMemosId, apiKey);

      // 2. 如果有 episodeId，找并删同 episode 的所有 event_log（atomic facts）
      if (episodeId) {
        try {
          const r = await fetch(
            `${EVERMEMOS_API_BASE}/api/v0/memories?user_id=${encodeURIComponent(twinId)}&memory_type=event_log&page=1&page_size=200`,
            { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } }
          );
          if (r.ok) {
            const data = await r.json().catch(() => ({}));
            const logs = data?.result?.memories || data?.memories || [];
            const related = logs.filter(m =>
              m.group_id === vaultGroupId &&
              (m.episode_id === episodeId || m.episodeId === episodeId)
            );
            console.log(`[vault/delete] deleting ${related.length} event_logs for episodeId=${episodeId}`);
            await Promise.all(related.map(m => deleteOneMemory(m.id, apiKey)));
          }
        } catch (e) {
          console.warn("[vault/delete] event_log cleanup failed (non-fatal):", e.message);
        }
      }

      return res.json({ ok: true, deleted: true });
    }

    // ── 兜底路径：旧卡片没有 everMemosId，搜索 original_data ──────────
    console.log(`[vault/delete] fallback search for messageId=${messageId}`);
    const r = await fetch(
      `${EVERMEMOS_API_BASE}/api/v0/memories?user_id=${encodeURIComponent(twinId)}&memory_type=episodic_memory&page=1&page_size=100`,
      { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } }
    );
    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.warn(`[vault/delete] fallback GET failed ${r.status}: ${errText.slice(0, 300)}`);
      // GET 失败时视为云端未找到：允许删除本地
      return res.json({ ok: true, deleted: false, message: `云端查询失败 (${r.status})，已仅删除本地` });
    }
    const listData = await r.json().catch(() => ({}));
    const mems = (listData?.result?.memories || listData?.memories || [])
      .filter(m => m.group_id === vaultGroupId);

    function containsMsgId(m) {
      const fields = [m.content, m.episode, m.summary, m.atomic_fact].filter(Boolean).join(" ");
      if (fields.includes(messageId)) return true;
      if (Array.isArray(m.original_data)) {
        return m.original_data.some(d => (d.content || d.message || "").includes(messageId));
      }
      return false;
    }

    const target = mems.find(containsMsgId);
    if (!target) {
      console.log(`[vault/delete] fallback: not found among ${mems.length} vault episodic_memories`);
      return res.json({ ok: true, deleted: false, message: "未在云端找到对应记忆（可能尚未上传或已删除）" });
    }

    await deleteOneMemory(target.id, apiKey);
    console.log(`[vault/delete] fallback deleted id=${target.id}`);
    return res.json({ ok: true, deleted: true });
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message || "Network error" });
  }
});

/**
 * Demo 灵魂拷贝配置：评委打开时自动预填。存于本地 JSON 文件。
 */
const DEMO_SOUL_PATH = path.join(__dirname, "data", "demo-soul-config.json");

function ensureDemoDir() {
  const dir = path.join(__dirname, "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

app.get("/api/demo/soul-config", (_, res) => {
  try {
    if (!fs.existsSync(DEMO_SOUL_PATH)) {
      return res.json({ ok: true, formState: {}, memoryFragmentsLv2: [], twinId: null });
    }
    const raw = fs.readFileSync(DEMO_SOUL_PATH, "utf8");
    const data = JSON.parse(raw);
    return res.json({
      ok: true,
      twinId: data.twinId || null,
      formState: data.formState || {},
      memoryFragmentsLv2: Array.isArray(data.memoryFragmentsLv2) ? data.memoryFragmentsLv2 : [],
    });
  } catch (err) {
    console.error("demo soul-config read error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/demo/soul-config", (req, res) => {
  const { twinId, formState = {}, memoryFragmentsLv2 = [] } = req.body || {};
  try {
    ensureDemoDir();
    const payload = {
      twinId: twinId || "demo-twin-001",
      formState: typeof formState === "object" ? formState : {},
      memoryFragmentsLv2: Array.isArray(memoryFragmentsLv2) ? memoryFragmentsLv2 : [],
    };
    fs.writeFileSync(DEMO_SOUL_PATH, JSON.stringify(payload, null, 2), "utf8");
    return res.json({ ok: true });
  } catch (err) {
    console.error("demo soul-config write error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * 进化聊天室 UI 配置（如 Pencil 按钮位置）：所有人只读，仅持有编辑密钥者可写入。
 * 服务端设置 EVOCHAT_EDIT_SECRET 后，仅带 ?edit=密钥 访问并拖动保存时才会更新。
 */
const EVOCHAT_UI_CONFIG_PATH = path.join(__dirname, "data", "evochat-ui-config.json");
const DEFAULT_PENCIL_POS = { x: 24, y: 180 };

app.get("/api/evochat-ui-config", (_, res) => {
  try {
    if (!fs.existsSync(EVOCHAT_UI_CONFIG_PATH)) {
      return res.json({ ok: true, pencilButtonPosition: DEFAULT_PENCIL_POS });
    }
    const raw = fs.readFileSync(EVOCHAT_UI_CONFIG_PATH, "utf8");
    const data = JSON.parse(raw);
    const pos = data.pencilButtonPosition && typeof data.pencilButtonPosition.x === "number" && typeof data.pencilButtonPosition.y === "number"
      ? data.pencilButtonPosition
      : DEFAULT_PENCIL_POS;
    return res.json({ ok: true, pencilButtonPosition: pos });
  } catch (err) {
    console.error("evochat-ui-config read error:", err);
    return res.json({ ok: true, pencilButtonPosition: DEFAULT_PENCIL_POS });
  }
});

app.put("/api/evochat-ui-config", (req, res) => {
  const secret = process.env.EVOCHAT_EDIT_SECRET;
  if (!secret || String(secret).trim() === "") {
    return res.status(403).json({ ok: false, error: "EDIT_DISABLED", message: "未配置编辑密钥，无法保存位置。" });
  }
  const { x, y, editSecret } = req.body || {};
  if (String(editSecret).trim() !== String(secret).trim()) {
    return res.status(403).json({ ok: false, error: "INVALID_SECRET", message: "编辑密钥错误，无法保存。" });
  }
  const nx = typeof x === "number" && !Number.isNaN(x) ? Math.max(0, x) : DEFAULT_PENCIL_POS.x;
  const ny = typeof y === "number" && !Number.isNaN(y) ? Math.max(0, y) : DEFAULT_PENCIL_POS.y;
  try {
    ensureDemoDir();
    const payload = { pencilButtonPosition: { x: nx, y: ny } };
    fs.writeFileSync(EVOCHAT_UI_CONFIG_PATH, JSON.stringify(payload, null, 2), "utf8");
    return res.json({ ok: true, pencilButtonPosition: payload.pencilButtonPosition });
  } catch (err) {
    console.error("evochat-ui-config write error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
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
  if (!process.env.EVOCHAT_EDIT_SECRET) {
    console.warn("EVOCHAT_EDIT_SECRET is not set; 进化聊天室 Pencil 按钮位置仅你可编辑需配置此项，访问时带 ?edit=你的密钥");
  }
});
