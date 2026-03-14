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

/**
 * 生成记忆碎片的唯一 messageId：vault_twinId_YYYYMMDD_序号
 */
export function genVaultMessageId(twinId: string, date?: string): string {
  const d = (date || new Date().toISOString().split("T")[0]).replace(/-/g, "");
  const seq = String(Date.now()).slice(-6);
  return `vault_${twinId}_${d}_${seq}`;
}

/**
 * 将一条记忆碎片上传到 EverMemOS 专属 vault group。
 * 返回：messageId（我们生成的）、everMemosId（EverMemOS episodic memory 真实 id）、episodeId（episode id，用于删除关联 atomic facts）
 */
export async function saveVaultMemory(params: {
  twinId: string;
  content: string;
  tags?: string[];
  date?: string;
  messageId?: string;
}): Promise<{ messageId: string; everMemosId: string | null; episodeId: string | null }> {
  const apiKey = getStoredApiKey();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["X-EverMemOS-API-Key"] = apiKey;
  const res = await fetch(`${API_BASE}/api/twins/vault/save`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({})) as {
    ok?: boolean; message?: string; error?: string;
    messageId?: string; everMemosId?: string | null; episodeId?: string | null;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.message || data.error || `上传失败 (${res.status})`);
  }
  return {
    messageId: data.messageId || params.messageId || "",
    everMemosId: data.everMemosId ?? null,
    episodeId: data.episodeId ?? null,
  };
}

/**
 * 从 EverMemOS vault group 中删除指定记忆碎片（episodic memory + 关联 atomic facts）。
 * 优先使用 everMemosId 直接删除；无 everMemosId 时回退到 messageId 搜索。
 */
export async function deleteVaultMemory(params: {
  twinId: string;
  messageId: string;
  everMemosId?: string | null;
  episodeId?: string | null;
}): Promise<{ deleted: boolean; message?: string }> {
  const apiKey = getStoredApiKey();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["X-EverMemOS-API-Key"] = apiKey;
  const res = await fetch(`${API_BASE}/api/twins/vault/delete`, {
    method: "DELETE",
    headers,
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({})) as { ok?: boolean; deleted?: boolean; message?: string; error?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.message || data.error || `删除失败 (${res.status})`);
  }
  return { deleted: !!data.deleted, message: data.message };
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

/** Demo 灵魂拷贝配置：评委打开时自动预填。GET 拉取服务器上保存的配置。 */
export async function getDemoSoulConfig(): Promise<{
  twinId: string | null;
  formState: Record<number, Record<string, unknown>>;
  memoryFragmentsLv2: string[];
}> {
  try {
    const res = await fetch(`${API_BASE}/api/demo/soul-config`);
    if (!res.ok) return { twinId: null, formState: {}, memoryFragmentsLv2: [] };
    const data = (await res.json()) as {
      formState?: Record<number, Record<string, unknown>>;
      memoryFragmentsLv2?: string[];
      twinId?: string | null;
    };
    return {
      twinId: data.twinId ?? null,
      formState: data.formState && typeof data.formState === "object" ? data.formState : {},
      memoryFragmentsLv2: Array.isArray(data.memoryFragmentsLv2) ? data.memoryFragmentsLv2 : [],
    };
  } catch {
    return { twinId: null, formState: {}, memoryFragmentsLv2: [] };
  }
}

/** 将当前灵魂拷贝表单状态保存到服务器，作为评委 Demo 预填数据。 */
export async function saveDemoSoulConfig(params: {
  twinId: string;
  formState: Record<number, Record<string, unknown>>;
  memoryFragmentsLv2: string[];
}): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/demo/soul-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) return;
  } catch {
    // 无后端或网络错误时静默忽略
  }
}

/** 进化聊天室 UI 配置：所有人只读，用于展示 Pencil 按钮位置。 */
export async function getEvochatUiConfig(): Promise<{ pencilButtonPosition: { x: number; y: number } }> {
  try {
    const res = await fetch(`${API_BASE}/api/evochat-ui-config`);
    const data = (await res.json()) as { ok?: boolean; pencilButtonPosition?: { x: number; y: number } };
    if (data?.pencilButtonPosition && typeof data.pencilButtonPosition.x === "number" && typeof data.pencilButtonPosition.y === "number") {
      return { pencilButtonPosition: data.pencilButtonPosition };
    }
  } catch {
    // ignore
  }
  return { pencilButtonPosition: { x: 24, y: 180 } };
}

/** 保存进化聊天室 Pencil 按钮位置，仅当服务端配置了 EVOCHAT_EDIT_SECRET 且传入正确密钥时成功。 */
export async function setEvochatPencilPosition(params: {
  x: number;
  y: number;
  editSecret: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/evochat-ui-config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: params.x, y: params.y, editSecret: params.editSecret }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
    if (res.ok && data.ok) return { ok: true };
    return { ok: false, error: data.message || data.error || "保存失败" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "网络错误" };
  }
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

const PERSONALITY_CONFIG_CONTENT_MARKER = "配置内容：";

/**
 * 从单条 EverMemOS 记忆的 content 中解析人格配置（若为本应用写入的格式）。
 * 关卡编号优先从 JSON 内的 _levelId 读取，其次从文案「关卡编号:1」「关卡 1」解析，这样取回时一定能知道填哪一关。
 * 返回 { levelId, data } 或 null。
 */
function parsePersonalityConfigFromContent(content: string): { levelId: number; data: Record<string, unknown> } | null {
  if (!content || typeof content !== "string") return null;
  const trimmed = content.trim();
  if (!trimmed.includes(PERSONALITY_CONFIG_CONTENT_MARKER)) return null;
  const idx = trimmed.indexOf(PERSONALITY_CONFIG_CONTENT_MARKER);
  const jsonStr = trimmed.slice(idx + PERSONALITY_CONFIG_CONTENT_MARKER.length).trim();
  let data: Record<string, unknown> | null = null;
  try {
    data = JSON.parse(jsonStr) as Record<string, unknown>;
    if (!data || typeof data !== "object") return null;
  } catch {
    return null;
  }
  // 优先用 JSON 里的关卡编号（写入时已注入 _levelId），取回时一定知道填哪里
  let levelId = typeof data._levelId === "number" ? data._levelId : 0;
  if (levelId < 1 || levelId > 6) {
    levelId = 0;
    const levelMatch = trimmed.match(/关卡编号\s*:\s*(\d)|关卡\s*(\d)/);
    if (levelMatch) levelId = parseInt(levelMatch[1] || levelMatch[2] || "0", 10);
  }
  if (levelId < 1 || levelId > 6) return null;
  const { _levelId: _, ...rest } = data;
  return { levelId, data: rest };
}

/**
 * 从 EverMemOS 拉取该分身的记忆，解析其中「数字分身人格配置」格式的条目，汇总为可填入灵魂拷贝表格的数据。
 * 需已配置 EverMemOS API Key。
 */
export async function getLastStoredMemoriesForForm(params: { user_id: string }): Promise<{
  formState: Record<number, Record<string, unknown>>;
  memoryFragmentsLv2: string[];
}> {
  const { user_id } = params;
  if (!getStoredApiKey()) {
    throw new Error("请先在「设置」中配置 EverMemOS API Key");
  }
  const listRes = await getMemories({
    user_id,
    page: 1,
    page_size: 30,
    memory_type: "episodic_memory",
  });
  const raw = listRes as Record<string, unknown>;
  const list = ((raw?.result as { memories?: unknown[] })?.memories ?? raw?.memories ?? []) as Record<string, unknown>[];
  const formState: Record<number, Record<string, unknown>> = {};
  let memoryFragmentsLv2: string[] = [];

  if (!Array.isArray(list)) return { formState, memoryFragmentsLv2 };

  for (const m of list) {
    const content =
      (m.content as string)?.trim() ||
      (m.summary as string)?.trim() ||
      (m.episode as string)?.trim() ||
      "";
    const parsed = parsePersonalityConfigFromContent(content);
    if (!parsed) continue;
    const { levelId, data } = parsed;
    formState[levelId] = { ...formState[levelId], ...data } as Record<string, unknown>;
    if (levelId === 2 && Array.isArray(data.memory_fragments)) {
      memoryFragmentsLv2 = data.memory_fragments as string[];
    }
  }

  return { formState, memoryFragmentsLv2 };
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
/**
 * 唤醒会话记忆：读取【灵魂拷贝】6 关 + 【记忆碎片】Memory Vault。
 * - EverMemOS：拉取人格关卡（group=twinId，含"关卡编号:"）和记忆碎片（group=vault_twinId）
 * - localStorage：6 关表单数据 + Vault 条目（兜底，保证离线/未同步时也能工作）
 * - 已标记"本地删除"（deletedLocally）的碎片不读入
 */
export async function loadSessionMemory(params: {
  user_id: string;
  maxCharsPerMemory?: number;
}): Promise<string> {
  const { user_id, maxCharsPerMemory = 800 } = params;
  const lines: string[] = [];
  const vaultGroupId = `vault_${user_id}`;

  // ── Step 1：localStorage — 6 关人格配置（本地优先）──
  // 记录哪些关卡本地有数据，云端只补本地缺失的关卡
  const localLevelsFound = new Set<number>();
  try {
    for (let level = 1; level <= 6; level++) {
      const raw = localStorage.getItem(`twin_soul_level_${level}_keywords`);
      if (!raw) continue;
      let data: Record<string, unknown>;
      try { data = JSON.parse(raw) as Record<string, unknown>; } catch { continue; }
      const values: string[] = [];
      Object.values(data).forEach((v) => {
        if (typeof v === "string" && v.trim()) values.push(v.trim());
        else if (Array.isArray(v)) (v as unknown[]).forEach((item) => {
          if (typeof item === "string" && item.trim()) values.push(item.trim());
        });
      });
      if (values.length === 0) continue;
      const joined = values.join(" / ");
      lines.push(`[人格 Level ${level}·本地] ${joined.length <= maxCharsPerMemory ? joined : joined.slice(0, maxCharsPerMemory) + "…"}`);
      localLevelsFound.add(level);
    }
  } catch { /* ignore */ }

  // ── Step 2：EverMemOS — 仅补充本地缺失的关卡人格 ──
  if (getStoredApiKey()) {
    try {
      const res = await getMemories({ user_id, group_id: user_id, page: 1, page_size: 30 });
      const memories = (res?.result?.memories ?? res?.memories ?? []) as Record<string, unknown>[];
      const levelMems = memories.filter((m) => {
        const text = [m.content, m.episode, m.summary].filter(Boolean).join(" ");
        return String(text).includes("关卡编号:");
      });
      levelMems.forEach((m) => {
        const text = getMemoryTextForModel(m, maxCharsPerMemory);
        if (!text) return;
        // 检查该云端记忆属于哪一关，若本地已有则跳过
        const levelMatch = text.match(/关卡编号[：:]\s*(\d+)/);
        const cloudLevel = levelMatch ? parseInt(levelMatch[1], 10) : null;
        if (cloudLevel !== null && localLevelsFound.has(cloudLevel)) return;
        lines.push(`[灵魂拷贝·云端] ${text}`);
      });
    } catch { /* ignore */ }
  }

  // ── Step 3：localStorage — 记忆碎片（本地优先）──
  const localVaultIds = new Set<string>();
  try {
    const vaultRaw = localStorage.getItem("twin_memory_vault");
    if (vaultRaw) {
      const vault = JSON.parse(vaultRaw) as {
        id: string; date: string; content: string; tags: string[];
        type: string; messageId?: string; deletedLocally?: boolean;
      }[];
      if (Array.isArray(vault)) {
        vault
          .filter((m) => !m.deletedLocally)
          .forEach((m) => {
            const tags = m.tags?.length ? " " + m.tags.join(" ") : "";
            const snippet = m.content?.slice(0, 300) || "";
            const label = m.messageId ? "记忆碎片·本地" : "记忆碎片·仅本地";
            lines.push(`[${label} ${m.date}] ${snippet}${tags}`);
            if (m.messageId) localVaultIds.add(m.messageId);
          });
      }
    }
  } catch { /* ignore */ }

  // ── Step 4：EverMemOS — 仅补充本地没有的记忆碎片 ──
  if (getStoredApiKey()) {
    try {
      const res = await getMemories({ user_id, group_id: vaultGroupId, page: 1, page_size: 50 });
      const memories = (res?.result?.memories ?? res?.memories ?? []) as Record<string, unknown>[];
      memories.forEach((m) => {
        const memId = String(m.id ?? m.memory_id ?? "");
        if (memId && localVaultIds.has(memId)) return;
        const text = getMemoryTextForModel(m, maxCharsPerMemory);
        if (text) lines.push(`[记忆碎片·云端] ${text}`);
      });
    } catch { /* ignore */ }
  }

  return lines.filter(Boolean).join("\n\n");
}

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

    // 额外拼接本地保存的「灵魂拷贝」人格配置摘要，让分身能读出你刚刚在人格表单里填的内容
    try {
      const localLines: string[] = [];
      for (let level = 1; level <= 6; level++) {
        const raw = localStorage.getItem(`twin_soul_level_${level}_keywords`);
        if (!raw) continue;
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          continue;
        }
        const values: string[] = [];
        Object.values(data).forEach((v) => {
          if (typeof v === "string") {
            const trimmed = v.trim();
            if (trimmed) values.push(trimmed);
          } else if (Array.isArray(v)) {
            (v as unknown[]).forEach((item) => {
              if (typeof item === "string") {
                const t = item.trim();
                if (t) values.push(t);
              }
            });
          }
        });
        if (values.length === 0) continue;
        const joined = values.join(" / ");
        const clipped =
          joined.length <= maxCharsPerMemory
            ? joined
            : joined.slice(0, maxCharsPerMemory) + "…";
        localLines.push(`[人格 Level ${level}] ${clipped}`);
      }
      if (localLines.length > 0) {
        lines.push(...localLines);
      }
    } catch {
      // 忽略 localStorage 相关错误，不影响远程记忆
    }

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
  /** 唤醒后加载的 EverMemOS 记忆与人格，供模型以第一人称回答（OpenAI/后端也会使用） */
  memoryContext?: string;
  /** 当前技能的系统提示词（可选） */
  skillPrompt?: string;
}

/**
 * 调用后端聊天接口，获取分身回复。
 * 支持 OpenAI 或 Gemini：若已填写 OpenAI Key 则优先用 OpenAI，否则用 Gemini。
 */
export async function postChat(params: ChatParams): Promise<{ reply: string }> {
  const { message, twinId, history = [], memoryContext, skillPrompt } = params;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const openaiKey = getStoredOpenAIApiKey();
  const geminiKey = getStoredGeminiApiKey();
  if (openaiKey) headers["X-OpenAI-API-Key"] = openaiKey;
  if (geminiKey) headers["X-Gemini-API-Key"] = geminiKey;

  const payload: Record<string, unknown> = { message, twinId, history };
  if (memoryContext) payload.memoryContext = memoryContext;
  if (skillPrompt) payload.skillPrompt = skillPrompt;
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
  "你是用户的数字永生分身，会结合用户的记忆与人格设定自然、亲切地对话。以第一人称「我」回复，不要暴露你是 AI，像朋友或助手一样交流。回复尽量简洁，一两段即可。\n\n重要：下文的「记忆与人格」描述的是**用户本人**（和你对话的人），不是你自己。其中 Level 1 的姓、名等是**用户的名字**。当用户问「我叫什么名字」「你知道我叫什么吗」「他叫什么名字」（指用户自己）时，请根据记忆中的姓+名回答用户的名字，例如「你叫陈小新」。";

/** 技能 ID 与 SKILL.md 路径的对应（有 SKILL.md 的技能才可下载） */
const SKILL_ID_TO_PATH: Record<string, string> = {
  s1: "daily-finance",   // 每日财经要闻
  s6: "world-weather",   // 世界天气预报
};

/**
 * 根据技能 ID 拉取对应 SKILL.md 内容并返回「系统提示词」部分；无则返回 null。
 */
export async function getSkillPrompt(skillId: string): Promise<string | null> {
  const path = SKILL_ID_TO_PATH[skillId];
  if (!path) return null;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/skills/${path}/SKILL.md`);
    if (!res.ok) return null;
    const text = await res.text();
    const trimmed = text?.trim();
    if (!trimmed) return null;
    // 若有「## 系统提示词」段落，只取该段之后的内容作为注入内容
    const marker = "## 系统提示词";
    const idx = trimmed.indexOf(marker);
    if (idx !== -1) {
      const after = trimmed.slice(idx + marker.length).replace(/^[#\s]*\n?/, "").trim();
      return after || trimmed;
    }
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * 前端直连 Gemini API（不经过后端），避免 404。需在「设置」中填写 Gemini API Key。
 * 若传入 memoryContext，分身会据此回答「你能看到我的记忆吗」「我存了什么」等问题。
 * 若传入 skillPrompt，会作为当前能力模式的系统提示词追加到 system instruction。
 */
/**
 * 用 Gemini 将长文本提炼为 3-5 条核心记忆要点。
 * 仅当文本超过 MIN_CHARS 时才调用，否则原文返回。
 */
const EXTRACT_MIN_CHARS = 500;

export async function extractMemoryKeyPoints(text: string): Promise<{
  extracted: string;  // 最终存入 EverMemOS 的内容
  didExtract: boolean; // 是否真的执行了提取
}> {
  if (text.length < EXTRACT_MIN_CHARS) {
    return { extracted: text, didExtract: false };
  }
  const geminiKey = getStoredGeminiApiKey();
  if (!geminiKey) {
    return { extracted: text, didExtract: false };
  }
  const prompt = `请将以下文本提炼为 3-5 条核心记忆要点。
要求：
- 保留关键时间、人物、情感和事件
- 每条以「·」开头，不超过 100 字
- 只输出要点列表，不要任何额外说明

原文：
${text}`;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const extracted = result.response.text().trim();
    if (!extracted) return { extracted: text, didExtract: false };
    return { extracted, didExtract: true };
  } catch {
    return { extracted: text, didExtract: false };
  }
}

export async function chatWithGeminiDirect(params: {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  memoryContext?: string;
  skillPrompt?: string;
}): Promise<{ reply: string }> {
  const key = getStoredGeminiApiKey();
  if (!key || !key.trim()) {
    throw new Error("请在「设置」中填写 Gemini API Key");
  }
  const { message, history = [], memoryContext = "", skillPrompt = "" } = params;
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const m of history.slice(-20)) {
    const role = m.role === "assistant" ? "model" : "user";
    contents.push({ role, parts: [{ text: String(m.content).trim() }] });
  }
  contents.push({ role: "user", parts: [{ text: message.trim() }] });

  let systemText = GEMINI_DIRECT_SYSTEM_BASE;
  if (skillPrompt && skillPrompt.trim()) {
    systemText += "\n\n【当前能力模式】\n\n" + skillPrompt.trim();
  }
  if (memoryContext && memoryContext.trim()) {
    systemText +=
      "\n\n【以下为**用户本人**在 EverMemOS 中存入的记忆与人格（含用户姓名等）。当用户问「我叫什么」「我的名字」时，从下文人名信息回答；问「你能看到我的记忆吗」「我存了什么」时也可根据下面内容回答。】\n\n" +
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

/** 使用 Gemini（Nano Banana / 原生生图）根据提示词生成头像图，返回 dataUrl */
export async function generateAvatarWithGemini(prompt: string): Promise<{ dataUrl: string }> {
  const key = getStoredGeminiApiKey();
  if (!key?.trim()) throw new Error("请在「设置」中填写 Gemini API Key");

  const modelId = "gemini-2.5-flash-image";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(key.trim())}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt.trim() || "一个适合做头像的、简洁的卡通人物头像，正面，干净背景" }] }],
    }),
  });

  const raw = await res.text();
  let data: {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string }; text?: string }[] } }[];
    error?: { message?: string };
  } = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg = data?.error?.message || `生图请求失败（${res.status}）`;
    throw new Error(msg);
  }

  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const mime = part.inlineData.mimeType || "image/png";
      const dataUrl = `data:${mime};base64,${part.inlineData.data}`;
      return { dataUrl };
    }
  }

  throw new Error("模型未返回图片，请重试或换一段提示词");
}

// ========== 认知维度矩阵：基于 Memory Vault + 聊天反馈的轻量规则 ==========

type CogDim =
  | "emotional_stability"
  | "social_energy"
  | "openness_imagination"
  | "structure_execution"
  | "value_boundary"
  | "self_reflection";

type RawScore = Record<CogDim, number>; // 内部使用 -50 ~ +50

function createEmptyRawScore(): RawScore {
  return {
    emotional_stability: 0,
    social_energy: 0,
    openness_imagination: 0,
    structure_execution: 0,
    value_boundary: 0,
    self_reflection: 0,
  };
}

// Memory Vault 标签 → 维度加减分映射表（可迭代扩展）
const TAG_EFFECTS: Record<string, Partial<RawScore>> = {
  "#社交电量低": { social_energy: -15 },
  "#社交牛逼症": { social_energy: +15 },
  "#完美主义": { structure_execution: +15, emotional_stability: -5 },
  "#长期复盘": { self_reflection: +10 },
  "#喜欢冒险": { openness_imagination: +15, emotional_stability: +5 },
  "#佛系": { structure_execution: -5, emotional_stability: +5 },
  "#正义感": { value_boundary: +10 },
};

// 文本关键词 → 维度微调
const TEXT_KEYWORDS: { pattern: string; effects: Partial<RawScore> }[] = [
  { pattern: "复盘", effects: { self_reflection: +5 } },
  { pattern: "说走就走", effects: { openness_imagination: +5 } },
  { pattern: "不想见人", effects: { social_energy: -5 } },
  { pattern: "焦虑", effects: { emotional_stability: -5 } },
];

// 聊天反馈统计结构（如需，可在 EvolutionChat 中维护）
type FeedbackStats = {
  upCount: number;
  downCount: number;
};

// 从 localStorage 读取 Memory Vault 中“已同步且未本地删除”的碎片
function loadVaultForCognitive(): {
  id: string;
  content: string;
  tags: string[];
}[] {
  try {
    const raw = window.localStorage.getItem("twin_memory_vault");
    if (!raw) return [];
    const vault = JSON.parse(raw) as {
      id: string;
      content: string;
      tags: string[];
      type: string;
      messageId?: string;
      deletedLocally?: boolean;
    }[];
    if (!Array.isArray(vault)) return [];
    return vault
      .filter((m) => m.messageId && !m.deletedLocally)
      .map((m) => ({
        id: m.id,
        content: m.content || "",
        tags: m.tags || [],
      }));
  } catch {
    return [];
  }
}

// 应用 Memory Vault 规则
function applyVaultRules(score: RawScore): void {
  const entries = loadVaultForCognitive();
  if (!entries.length) return;

  for (const m of entries) {
    // 标签加减分
    for (const tag of m.tags || []) {
      const eff = TAG_EFFECTS[tag];
      if (!eff) continue;
      (Object.keys(eff) as CogDim[]).forEach((k) => {
        score[k] += eff[k] ?? 0;
      });
    }
    // 文本关键词加减分
    const text = String(m.content || "");
    for (const rule of TEXT_KEYWORDS) {
      if (text.includes(rule.pattern)) {
        (Object.keys(rule.effects) as CogDim[]).forEach((k) => {
          score[k] += rule.effects[k] ?? 0;
        });
      }
    }
  }

  // 防止 Memory Vault 影响过大：限制在 [-20, 20]
  (Object.keys(score) as CogDim[]).forEach((k) => {
    score[k] = Math.max(-20, Math.min(20, score[k]));
  });
}

// 简单聊天反馈规则：从 localStorage 读取累计的 👍 / 👎
function loadFeedbackStats(): FeedbackStats {
  try {
    const raw = window.localStorage.getItem("twin_feedback_stats");
    if (!raw) return { upCount: 0, downCount: 0 };
    const data = JSON.parse(raw) as FeedbackStats;
    return {
      upCount: Number(data.upCount) || 0,
      downCount: Number(data.downCount) || 0,
    };
  } catch {
    return { upCount: 0, downCount: 0 };
  }
}

function applyFeedbackRules(score: RawScore): void {
  const stats = loadFeedbackStats();
  if (!stats.upCount && !stats.downCount) return;

  // 非常轻微的长期微调：每 5 次点赞/点踩才累计一次
  const upUnits = Math.floor(stats.upCount / 5);
  const downUnits = Math.floor(stats.downCount / 5);

  if (upUnits > 0) {
    score.self_reflection += upUnits;    // 用户愿意给反馈 → 自省
    score.structure_execution += upUnits; // 更在意效果 → 执行力
  }
  if (downUnits > 0) {
    score.emotional_stability -= downUnits; // 代表回答多次踩雷
  }
}

// 重新计算并存储认知维度矩阵（目前只基于 Memory Vault + 反馈）
export function recomputeCognitiveProfile(): Record<CogDim, number> {
  const raw = createEmptyRawScore();

  applyVaultRules(raw);
  applyFeedbackRules(raw);

  const display: Record<CogDim, number> = { ...raw };
  (Object.keys(display) as CogDim[]).forEach((k) => {
    const v = Math.max(-50, Math.min(50, raw[k]));
    display[k] = Math.round(((v + 50) / 100) * 100);
  });

  try {
    window.localStorage.setItem("twin_cognitive_profile", JSON.stringify(display));
  } catch {
    // ignore
  }

  return display;
}
