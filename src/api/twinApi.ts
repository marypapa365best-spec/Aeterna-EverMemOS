const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const EVERMEMOS_KEY_STORAGE = "evermemos_cloud_api_key";
const EVERMEMOS_DISPLAY_NAME_STORAGE = "evermemos_display_name";
const GEMINI_KEY_STORAGE = "gemini_api_key";
const OPENAI_KEY_STORAGE = "openai_api_key";

export function getStoredApiKey(): string | null {
  try {
    const key = localStorage.getItem(EVERMEMOS_KEY_STORAGE);
    return key && key.trim() ? key.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredApiKey(key: string | null): void {
  try {
    if (key == null || !key.trim()) {
      localStorage.removeItem(EVERMEMOS_KEY_STORAGE);
    } else {
      localStorage.setItem(EVERMEMOS_KEY_STORAGE, key.trim());
    }
  } catch {
    /* ignore */
  }
}

export function getStoredDisplayName(): string | null {
  try {
    const name = localStorage.getItem(EVERMEMOS_DISPLAY_NAME_STORAGE);
    return name && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredDisplayName(name: string | null): void {
  try {
    if (name == null || !String(name).trim()) {
      localStorage.removeItem(EVERMEMOS_DISPLAY_NAME_STORAGE);
    } else {
      localStorage.setItem(EVERMEMOS_DISPLAY_NAME_STORAGE, String(name).trim());
    }
  } catch {
    /* ignore */
  }
}

export function getStoredGeminiApiKey(): string | null {
  try {
    const key = localStorage.getItem(GEMINI_KEY_STORAGE);
    return key && key.trim() ? key.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredGeminiApiKey(key: string | null): void {
  try {
    if (key == null || !key.trim()) {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    } else {
      localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
    }
  } catch {
    /* ignore */
  }
}

export function getStoredOpenAIApiKey(): string | null {
  try {
    const key = localStorage.getItem(OPENAI_KEY_STORAGE);
    return key && key.trim() ? key.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredOpenAIApiKey(key: string | null): void {
  try {
    if (key == null || !key.trim()) {
      localStorage.removeItem(OPENAI_KEY_STORAGE);
    } else {
      localStorage.setItem(OPENAI_KEY_STORAGE, key.trim());
    }
  } catch {
    /* ignore */
  }
}

export async function saveTwinLevelConfig(params: {
  twinId: string;
  levelId: number;
  data: Record<string, unknown>;
}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = getStoredApiKey();
  if (apiKey) headers["X-EverMemOS-API-Key"] = apiKey;

  const res = await fetch(`${API_BASE}/api/twins/save-level`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      body?.error === "API_KEY_REQUIRED"
        ? (body?.message || "请先在「设置」中配置 EverMemOS API Key")
        : (body?.message || body?.error || (res.status >= 500 ? "服务异常，请确认后端已启动 (npm run server) 且 API Key 有效" : "保存失败"));
    throw new Error(msg);
  }

  return res.json();
}

/** 请求头（带 API Key），供 getMemories / searchMemories 使用 */
function apiHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const key = getStoredApiKey();
  if (key) h["X-EverMemOS-API-Key"] = key;
  return h;
}

const API_BASE_GET = import.meta.env.VITE_API_BASE ?? "";

/**
 * 从 EverMemOS 按分身 ID 拉取已写入的记忆列表（分页）。
 * @param user_id 分身 ID，与存入时使用的 twinId 一致
 * @param group_id 可选，与 user_id 一致时保证只拉「本分身」同一组的记忆，避免多条记忆散在不同 group 只看到一条
 * @param memory_type profile | episodic_memory | foresight | event_log
 */
export async function getMemories(params: {
  user_id: string;
  group_id?: string;
  memory_type?: string;
  page?: number;
  page_size?: number;
}) {
  const { user_id, group_id, memory_type = "episodic_memory", page = 1, page_size = 20 } = params;
  const q = new URLSearchParams({
    user_id,
    memory_type,
    page: String(page),
    page_size: String(page_size),
  });
  if (group_id) q.set("group_id", group_id);
  const res = await fetch(`${API_BASE_GET}/api/twins/memories?${q}`, { headers: apiHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || body?.error || "获取记忆失败");
  }
  return res.json();
}

/**
 * 按关键词/语义在 EverMemOS 中搜索该分身的记忆。
 * @param user_id 分身 ID
 * @param query 搜索关键词或自然语言问句
 */
export async function searchMemories(params: { user_id: string; query: string }) {
  const { user_id, query } = params;
  const res = await fetch(`${API_BASE_GET}/api/twins/memories/search`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ user_id, query }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || body?.error || "搜索记忆失败");
  }
  return res.json();
}

/**
 * 从单条记忆对象中取「最宜给大模型看的」简短表述。
 * 优先用 EverMemOS 自带的摘要/叙事字段（summary、episode、atomic_fact 等），
 * 没有再用原始 content，并对过长内容截断，避免上下文过长。
 */
function getMemoryTextForModel(m: Record<string, unknown>, maxLen: number): string {
  const summary = (m.summary as string)?.trim();
  const episode = (m.episode as string)?.trim();
  const atomicFact = (m.atomic_fact as string)?.trim();
  const foresight = (m.foresight as string)?.trim();
  const content = (m.content as string)?.trim();

  const preferred = summary || episode || atomicFact || foresight || content;
  if (!preferred) return "";
  return preferred.length <= maxLen ? preferred : preferred.slice(0, maxLen) + "…";
}

/**
 * 拉取用户在 EverMemOS 中已存的记忆并格式化为给大模型的上下文。
 * 优先使用 EverMemOS 返回的简明字段（summary/episode/atomic_fact），没有再用 content 并截断。
 * 需已配置 EverMemOS API Key 且后端可用。
 */
export async function fetchMemoriesForContext(params: {
  user_id: string;
  query?: string;
  maxItems?: number;
  /** 每条记忆给模型的最大字符数，优先用摘要时通常已较短 */
  maxCharsPerMemory?: number;
}): Promise<string> {
  const { user_id, query, maxItems = 15, maxCharsPerMemory = 400 } = params;
  if (!getStoredApiKey()) return "";

  try {
    let list: Record<string, unknown>[] = [];
    if (query && query.trim()) {
      const searchRes = await searchMemories({ user_id, query: query.trim() });
      const fromSearch = searchRes?.result?.memories;
      if (Array.isArray(fromSearch)) list = fromSearch as Record<string, unknown>[];
    }
    if (list.length === 0) {
      const listRes = await getMemories({
        user_id,
        page: 1,
        page_size: maxItems,
      });
      const fromList = listRes?.result?.memories;
      if (Array.isArray(fromList)) list = fromList as Record<string, unknown>[];
    }
    if (list.length === 0) return "";

    const lines = list.slice(0, maxItems).map((m, i) => {
      const text = getMemoryTextForModel(m, maxCharsPerMemory);
      return text ? `[记忆${i + 1}] ${text}` : "";
    });
    return lines.filter(Boolean).join("\n\n");
  } catch {
    return "";
  }
}

/** 聊天请求参数 */
export interface ChatParams {
  message: string;
  twinId?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

/**
 * 调用后端聊天接口，获取分身回复。
 * 支持 OpenAI 或 Gemini：若已填写 OpenAI Key 则优先用 OpenAI，否则用 Gemini。
 */
export async function postChat(params: ChatParams): Promise<{ reply: string }> {
  const { message, twinId, history = [] } = params;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const openaiKey = getStoredOpenAIApiKey();
  const geminiKey = getStoredGeminiApiKey();
  if (openaiKey) headers["X-OpenAI-API-Key"] = openaiKey;
  if (geminiKey) headers["X-Gemini-API-Key"] = geminiKey;

  const payload: Record<string, unknown> = { message, twinId, history };
  if (openaiKey) payload.openai_api_key = openaiKey;
  if (geminiKey) payload.gemini_api_key = geminiKey;

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  let body: { message?: string; error?: string; reply?: string } = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }
  if (!res.ok) {
    const msg =
      body?.error === "GEMINI_API_KEY_REQUIRED" || body?.error === "LLM_API_KEY_REQUIRED"
        ? (body?.message || "请在「设置」中填写大模型 API Key（OpenAI 或 Gemini）")
        : (body?.message || body?.error || `对话请求失败（${res.status}）`);
    throw new Error(msg);
  }
  if (!body.reply && body.reply !== "") {
    throw new Error("未收到有效回复");
  }
  return { reply: body.reply };
}

const GEMINI_DIRECT_SYSTEM_BASE =
  "你是用户的个人数字分身，会结合用户的记忆与人格设定自然、亲切地对话。以第一人称「我」回复，不要暴露你是 AI，像朋友或助手一样交流。回复尽量简洁，一两段即可。";

/**
 * 前端直连 Gemini API（不经过后端），避免 404。需在「设置」中填写 Gemini API Key。
 * 若传入 memoryContext，分身会据此回答「你能看到我的记忆吗」「我存了什么」等问题。
 */
export async function chatWithGeminiDirect(params: {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  memoryContext?: string;
}): Promise<{ reply: string }> {
  const key = getStoredGeminiApiKey();
  if (!key || !key.trim()) {
    throw new Error("请在「设置」中填写 Gemini API Key");
  }
  const { message, history = [], memoryContext = "" } = params;
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const m of history.slice(-20)) {
    const role = m.role === "assistant" ? "model" : "user";
    contents.push({ role, parts: [{ text: String(m.content).trim() }] });
  }
  contents.push({ role: "user", parts: [{ text: message.trim() }] });

  let systemText = GEMINI_DIRECT_SYSTEM_BASE;
  if (memoryContext && memoryContext.trim()) {
    systemText +=
      "\n\n【以下是你（分身）可以读取到的、用户已在 EverMemOS 中存入的记忆。当用户问「你能看到我的记忆吗」「我存了什么」「读取我的记忆」时，请根据下面内容自然回答，让用户感到你真的「读到」了这些记忆。】\n\n" +
      memoryContext.trim();
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key.trim())}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemText }] },
      generationConfig: { maxOutputTokens: 1024 },
    }),
  });
  const raw = await res.text();
  let data: { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } } = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini 请求失败（${res.status}）`;
    throw new Error(msg);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text == null || text === "") {
    throw new Error("模型未返回有效回复，请重试");
  }
  return { reply: String(text).trim() };
}
