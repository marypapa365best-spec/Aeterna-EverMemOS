import React, { useState } from "react";
import { saveVaultMemory, genVaultMessageId, extractMemoryKeyPoints, recomputeCognitiveProfile } from "../api/twinApi";

const DEFAULT_TWIN_ID = "demo-twin-001";

export const MEMORY_VAULT_KEY = "twin_memory_vault";

type VaultMemory = {
  id: string; date: string; content: string; tags: string[]; type: string;
  messageId?: string;
  everMemosId?: string | null;
  episodeId?: string | null;
  deletedLocally?: boolean;
};

const DEFAULT_MEMORIES: VaultMemory[] = [
  {
    id: "m-001",
    date: "2023-10-14",
    content: "第一次在东京看到了真实的雪，那种寂静的光影深深印在脑海里。",
    tags: ["#Travel", "#Winter", "#Aesthetic"],
    type: "text",
  },
  {
    id: "m-002",
    date: "2024-02-05",
    content: "上传了《五年日记》的导出备份文档 (CSV格式)。提取了 1,204 条情绪标记。",
    tags: ["#Diary", "#MassData"],
    type: "file",
  },
  {
    id: "m-003",
    date: "2024-05-20",
    content: "《突然冒出的灵感火花》音频录音，5 分钟的口述。",
    tags: ["#Voice", "#Inspiration"],
    type: "audio",
  }
];

function loadVault(): VaultMemory[] {
  try {
    const raw = localStorage.getItem(MEMORY_VAULT_KEY);
    if (raw) return JSON.parse(raw) as VaultMemory[];
  } catch { /* ignore */ }
  return DEFAULT_MEMORIES;
}

function saveVault(list: VaultMemory[]) {
  try { localStorage.setItem(MEMORY_VAULT_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export const MemoryVault: React.FC = () => {
  const [memories, setMemories] = useState<VaultMemory[]>(loadVault);

  const updateMemories = (next: VaultMemory[]) => {
    setMemories(next);
    saveVault(next);
  };

  const handleDelete = (id: string) => {
    // 仅标记本地删除，卡片保留显示，云端不作操作
    updateMemories(memories.map(m => m.id === id ? { ...m, deletedLocally: true } : m));
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Mock adding a new memory based on the file
      const newMemory = {
        id: `m-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        content: `已上传文件: ${file.name}。系统正在提取神经突触关联...`,
        tags: ["#NewMemory", "#File"],
        type: "file",
      };
      updateMemories([newMemory, ...memories]);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const [textInput, setTextInput] = useState("");
  const [textTag, setTextTag] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [cardUploading, setCardUploading] = useState<Record<string, boolean>>({});
  const [cardUploadMsg, setCardUploadMsg] = useState<Record<string, { ok: boolean; text: string }>>({});
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

  // 卡片直接上传到 EverMemOS
  const handleCardUpload = async (mem: VaultMemory) => {
    if (cardUploading[mem.id]) return;
    setCardUploading(prev => ({ ...prev, [mem.id]: true }));
    setCardUploadMsg(prev => ({ ...prev, [mem.id]: { ok: true, text: mem.content.length >= 500 ? "AI 提取要点中…" : "同步中…" } }));
    try {
      const msgId = mem.messageId || genVaultMessageId(DEFAULT_TWIN_ID, mem.date);
      const { extracted, didExtract } = await extractMemoryKeyPoints(mem.content);
      const { messageId: finalId, everMemosId, episodeId } = await saveVaultMemory({
        twinId: DEFAULT_TWIN_ID, content: extracted, tags: mem.tags, date: mem.date, messageId: msgId,
      });
      updateMemories(memories.map(m => m.id === mem.id ? { ...m, messageId: finalId, everMemosId, episodeId } : m));
      // 每次有新的云端碎片时，重算一次认知维度矩阵
      recomputeCognitiveProfile();
      setCardUploadMsg(prev => ({ ...prev, [mem.id]: { ok: true, text: didExtract ? "AI 提取要点已同步 ✅" : "已同步到云端 ✅" } }));
      setTimeout(() => setCardUploadMsg(prev => { const n = { ...prev }; delete n[mem.id]; return n; }), 3000);
    } catch (e) {
      setCardUploadMsg(prev => ({ ...prev, [mem.id]: { ok: false, text: "同步失败：" + (e instanceof Error ? e.message : String(e)) } }));
      setTimeout(() => setCardUploadMsg(prev => { const n = { ...prev }; delete n[mem.id]; return n; }), 4000);
    } finally {
      setCardUploading(prev => ({ ...prev, [mem.id]: false }));
    }
  };

  const parseTags = (raw: string) =>
    raw.trim()
      ? raw.trim().split(/[\s,，]+/).map(t => t.startsWith("#") ? t : "#" + t).filter(Boolean)
      : ["#手动录入"];

  // 首次注入：仅存本地，不上传 EverMemOS
  const handleTextSubmit = () => {
    const content = textInput.trim();
    if (!content) return;
    const tags = parseTags(textTag);
    const date = new Date().toISOString().split("T")[0];

    if (editingId) {
      // 编辑模式：更新本地 + 提取要点 + 上传 EverMemOS
      const updated = memories.map(m =>
        m.id === editingId ? { ...m, content, tags, date } : m
      );
      updateMemories(updated);
      setEditingId(null);
      setTextInput("");
      setTextTag("");
      setUploading(true);
      setUploadMsg({ ok: true, text: content.length >= 500 ? "正在用 AI 提取要点…" : "同步中…" });

      (async () => {
        try {
          // 找到已有 messageId 或生成新的
          const existingMem = memories.find(m => m.id === editingId);
          const msgId = existingMem?.messageId || genVaultMessageId(DEFAULT_TWIN_ID, date);
          const { extracted, didExtract } = await extractMemoryKeyPoints(content);
          const { messageId: finalId, everMemosId, episodeId } = await saveVaultMemory({
            twinId: DEFAULT_TWIN_ID, content: extracted, tags, date, messageId: msgId,
          });
          updateMemories(memories.map(m => m.id === editingId ? { ...m, content, tags, date, messageId: finalId, everMemosId, episodeId } : m));
          // 文本编辑并同步云端后，也重算认知维度矩阵
          recomputeCognitiveProfile();
          setUploadMsg({
            ok: true,
            text: didExtract ? "AI 已提取要点并同步到 EverMemOS ✅" : "已同步到 EverMemOS ✅",
          });
        } catch (e) {
          setUploadMsg({ ok: false, text: "本地已更新，云端同步失败：" + (e instanceof Error ? e.message : String(e)) });
        } finally {
          setUploading(false);
          setTimeout(() => setUploadMsg(null), 4000);
        }
      })();
    } else {
      // 新建模式：仅存本地
      const newMemory: VaultMemory = { id: `m-${Date.now()}`, date, content, tags, type: "text" };
      updateMemories([newMemory, ...memories]);
      setTextInput("");
      setTextTag("");
      setUploadMsg({ ok: true, text: "已保存到本地，编辑确认后可同步到云端" });
      setTimeout(() => setUploadMsg(null), 3000);
    }
  };

  // 点「编辑」：载入卡片内容到文本框
  const handleEdit = (mem: VaultMemory) => {
    setEditingId(mem.id);
    setTextInput(mem.content);
    setTextTag(mem.tags.join(" "));
    setTimeout(() => textAreaRef.current?.focus(), 50);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setTextInput("");
    setTextTag("");
    setUploadMsg(null);
  };

  const handleSocialSync = (platform: string) => {
    const newMemory = {
      id: `m-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      content: `已成功连接 ${platform}。系统已在后台扫描近期数据，并提取到了新的性格切片与日常谈吐记忆。`,
      tags: ["#CloudSync", platform.split(' ')[0]],
      type: "text",
    };
    updateMemories([newMemory, ...memories]);
  };

  return (
    <div className="vault-container">
      <div className="vault-header">
        <h1 className="vault-title">记忆碎片 (Memory Vault)</h1>
        <p className="vault-subtitle">构建你的个人记忆资产：私域记忆、文档、对话录音等，这些将作为所有分身共用的潜意识数据库基底。</p>
        <ul className="vault-notes">
          <li>📝 <strong>两步流程：</strong>首次点「创建记忆碎片」仅保存到本地；点卡片「编辑」确认后，点「上传云端」同步到 EverMemOS 云端。云端同步后内容锁定，编辑按钮消失。</li>
          <li>🤖 <strong>AI 提取要点：</strong>文本超过 500 字时，自动调用 Gemini 提炼 3–5 条核心要点上传，本地保留原文。需在「设置」中配置 Gemini API Key，否则自动降级为上传原文。</li>
          <li>⚡ <strong>分身唤醒：</strong>进入「进化聊天室」后点「唤醒并连接」，分身一次性读取全部记忆碎片作为对话背景。</li>
          <li>🗑️ <strong>忘却：</strong>点「🗑️」仅删除本地记录，云端不保证彻底删除。删除后卡片显示「本地删除」标记，请谨慎上传。</li>
        </ul>
      </div>

      {/* 左右两列布局 */}
      <div className="import-grid">
        <div className="import-grid__left">
        {/* 容器 1：直接输入文本 */}
        <div className="import-zone import-zone--text" style={{ flex: 1 }}>
          <div className="import-zone__icon">✍️</div>
          <h3 className="import-zone__title">
            {editingId ? "✏️ 编辑记忆" : "直接输入记忆文本"}
          </h3>
          <p className="import-zone__desc">
            {editingId
              ? "修改完成后点「创建记忆碎片」，将更新内容同步到 EverMemOS"
              : "写下一段记忆、感悟或经历，点「创建记忆碎片」先保存到本地"}
          </p>
          <input
            className="vault-tag-input"
            type="text"
            placeholder="标签（空格或逗号分隔，如：旅行 感悟）"
            value={textTag}
            onChange={(e) => setTextTag(e.target.value)}
          />
          <textarea
            ref={textAreaRef}
            className="vault-text-input"
            rows={8}
            placeholder="例如：第一次去海边，看到了日落，感觉人生豁然开朗……"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <div className="import-zone__actions">
            <button className="btn-import" onClick={handleTextSubmit} disabled={!textInput.trim() || uploading}>
              {uploading ? "同步中…" : "创建记忆碎片"}
            </button>
            {editingId && (
              <button className="btn-import btn-import--secondary" onClick={handleCancelEdit}>
                取消编辑
              </button>
            )}
            {uploadMsg && (
              <span className={`vault-upload-msg${uploadMsg.ok ? "" : " vault-upload-msg--err"}`}>
                {uploadMsg.text}
              </span>
            )}
          </div>
        </div>

        </div>{/* end import-grid__left */}
        <div className="import-grid__right">
        {/* 容器 2：拖拽文件上传 */}
        <div className="import-zone import-zone--file">
          <div className="import-zone__icon">📤</div>
          <h3 className="import-zone__title">拖拽文件或粘贴文本创建记忆碎片</h3>
          <p className="import-zone__desc">支持 .txt、.pdf、.csv 数据导出及语音文件</p>
          <button className="btn-import" onClick={() => fileInputRef.current?.click()}>
            浏览系统文件
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
        </div>

        <div className="social-sync-zone">
          <div className="import-zone__icon">🔗</div>
          <h3 className="import-zone__title">连接社媒与云端数据源</h3>
          <p className="import-zone__desc">一键授权提取您的过往状态、网络记忆与日常谈吐风格</p>
          <div className="social-buttons">
            <button className="btn-social btn-wechat" onClick={() => handleSocialSync("WeChat 朋友圈")}>微信 / WeChat</button>
            <button className="btn-social btn-xiaohongshu" onClick={() => handleSocialSync("小红书 / RED")}>小红书 / RED</button>
            <button className="btn-social btn-twitter" onClick={() => handleSocialSync("Twitter / X")}>Twitter / X</button>
            <button className="btn-social btn-instagram" onClick={() => handleSocialSync("Instagram")}>Instagram</button>
            <button className="btn-social btn-youtube" onClick={() => handleSocialSync("YouTube")}>YouTube</button>
            <button className="btn-social btn-notion" onClick={() => handleSocialSync("Notion 笔记库")}>Notion 宇宙</button>
          </div>
        </div>
        </div>{/* end import-grid__right */}
      </div>

      {/* Memory Timeline Grid */}
      <div className="memory-grid">
        {memories.map((mem) => (
          <div key={mem.id} className={`memory-card${mem.deletedLocally ? " memory-card--deleted" : ""}`}>
            <div className="memory-card__header">
              <span className={`memory-type-icon type-${mem.type}`}></span>
              <span className="memory-date">{mem.date}</span>
              {mem.deletedLocally
                ? <span className="vault-badge vault-badge--deleted">🗑️ 本地删除</span>
                : mem.messageId
                  ? <span className="vault-badge vault-badge--cloud" title={mem.messageId}>☁️ 已同步</span>
                  : <span className="vault-badge vault-badge--local">📍 仅本地</span>
              }
              {!mem.deletedLocally && (
                <div className="memory-card__actions">
                  {mem.type === "text" && !mem.messageId && (
                    <button className="btn-edit-mem" onClick={() => handleEdit(mem)}>编辑</button>
                  )}
                  <button
                    className="btn-forget"
                    onClick={() => handleDelete(mem.id)}
                    title="删除本地记录"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
            <p className="memory-content">{mem.content}</p>
            <div className="memory-tags">
              {mem.tags.map(tag => (
                <span key={tag} className="memory-tag">{tag}</span>
              ))}
            </div>
            {!mem.deletedLocally && !mem.messageId && (
              <div className="memory-card__upload-row">
                <button
                  className="btn-upload-mem"
                  onClick={() => handleCardUpload(mem)}
                  disabled={cardUploading[mem.id]}
                >
                  {cardUploading[mem.id] ? "上传中…" : "上传云端"}
                </button>
                {cardUploadMsg[mem.id] && (
                  <span className={`vault-card-msg${cardUploadMsg[mem.id].ok ? "" : " vault-card-msg--err"}`}>
                    {cardUploadMsg[mem.id].text}
                  </span>
                )}
              </div>
            )}
            {!mem.deletedLocally && mem.messageId && cardUploadMsg[mem.id] && (
              <div className={`vault-card-msg${cardUploadMsg[mem.id].ok ? "" : " vault-card-msg--err"}`}>
                {cardUploadMsg[mem.id].text}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
