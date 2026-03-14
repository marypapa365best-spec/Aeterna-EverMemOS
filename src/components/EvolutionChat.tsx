import React, { useState, useEffect, useCallback } from "react";
import { TwinSelector } from "./TwinSelector";
import { TwinChat } from "./TwinChat";
import { loadSessionMemory, getStoredGeminiApiKey, getStoredOpenAIApiKey, recomputeCognitiveProfile } from "../api/twinApi";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  feedback?: "up" | "down" | null;
  isExpert?: boolean;
  expertAvatar?: string;
  expertName?: string;
};

interface EvolutionChatProps {
  twinId?: string;
  onNavigateToPresets?: () => void;
}

export const EvolutionChat: React.FC<EvolutionChatProps> = ({ twinId = "demo-twin-001", onNavigateToPresets }) => {
  // ── 唤醒并连接：一次性读取 6 关人格 + 记忆碎片 ──
  const [sessionMemory, setSessionMemory] = useState<string | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [awakenNote, setAwakenNote] = useState<{ ok: boolean; text: string } | null>(null);
  const hasLlmKey = !!getStoredGeminiApiKey() || !!getStoredOpenAIApiKey();
  const isAwakened = sessionMemory !== null;

  const handleAwaken = async () => {
    setMemoryLoading(true);
    setAwakenNote(null);
    try {
      const ctx = await loadSessionMemory({ user_id: twinId });
      setSessionMemory(ctx || "");
      // 每次唤醒时顺便重算一次认知维度矩阵
      recomputeCognitiveProfile();
      const segments = ctx.split("\n\n").filter(Boolean);
      const levelCount = segments.filter(s => s.startsWith("[人格") || s.startsWith("[灵魂拷贝")).length;
      const vaultCount = segments.filter(s => s.startsWith("[记忆碎片")).length;
      setAwakenNote(ctx
        ? { ok: true, text: `已读取 ${levelCount} 段人格 · ${vaultCount} 条记忆碎片` }
        : { ok: false, text: "未找到记忆数据，请先填写灵魂拷贝或添加记忆碎片" }
      );
    } catch {
      setSessionMemory("");
      setAwakenNote({ ok: false, text: "唤醒失败，请检查网络或 EverMemOS API Key" });
    } finally {
      setMemoryLoading(false);
    }
  };
  const [activeTwin, setActiveTwin] = useState("t-001");
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  // 历史会话：按分身 ID 持久化在 localStorage
  type ChatSession = {
    id: string;
    title: string;
    time: string;
    preview: string;
    messages: ChatMessage[];
  };

  const historyKeyForTwin = (twin: string) => `twin_chat_history_${twin}`;

  const loadHistory = (twin: string): ChatSession[] => {
    try {
      const raw = window.localStorage.getItem(historyKeyForTwin(twin));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ChatSession[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveHistory = (twin: string, list: ChatSession[]) => {
    try {
      window.localStorage.setItem(historyKeyForTwin(twin), JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  // Analytics State（与 TwinStudio Dashboard 共享），默认 55%
  const loadInitialSyncRate = () => {
    try {
      const raw = window.localStorage.getItem("twin_sync_rate");
      const n = raw != null ? Number(raw) : NaN;
      if (!Number.isNaN(n) && n >= 0 && n <= 100) return n;
    } catch {/* ignore */}
    return 55;
  };
  const [syncRate, setSyncRate] = useState(loadInitialSyncRate);
  const [floatingText, setFloatingText] = useState<{ id: number, x: number, y: number, text: string } | null>(null);
  const [leftPaneMode, setLeftPaneMode] = useState<'analytics' | 'history'>('analytics');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [historySessions, setHistorySessions] = useState<ChatSession[]>(() => loadHistory(activeTwin));
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  /** 仅在新对话按钮点击时递增，用于主聊天 key，避免首句发送后 key 变化导致重挂载清空内容 */
  const [mainChatResetKey, setMainChatResetKey] = useState(0);
  let floatIdCounter = 0;

  // 持久化同步率，供 TwinStudio 读取
  useEffect(() => {
    try {
      window.localStorage.setItem("twin_sync_rate", String(syncRate));
    } catch {/* ignore */}
  }, [syncRate]);

  // Consultant Dock State (Compact)
  const presetConsultants = [
    { id: 'c1', name: '跨境电商选品雷达', avatar: '/avatars/presets/1.png', domain: 'E-commerce', icon: '📈' },
    { id: 'c2', name: 'X平台内容运营专家', avatar: '/avatars/presets/2.png', domain: 'Social Media', icon: '📱' },
    { id: 'c3', name: '法律风控合规官', avatar: '/avatars/presets/3.png', domain: 'Global Legal', icon: '⚖️' },
  ];
  const [showAtMenu, setShowAtMenu] = useState(false);
  const [atQuery, setAtQuery] = useState("");
  const [activeConsultant, setActiveConsultant] = useState<string | null>(null);

  // 当切换分身时，重新加载该分身的历史会话并重置主聊天
  useEffect(() => {
    setHistorySessions(loadHistory(activeTwin));
    setSelectedHistoryId(null);
    setCurrentSessionId(null);
    setMainChatResetKey((k) => k + 1);
  }, [activeTwin]);

  // 分身对话（TwinChat）消息变化时同步到本组件，用于历史记录
  const handleTwinChatMessagesChange = useCallback((msgs: { id: string; role: "user" | "assistant"; content: string }[]) => {
    const converted: ChatMessage[] = msgs.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      feedback: null,
    }));
    setMessages(converted);
  }, []);

  // 在历史会话中继续聊天时，更新该条会话的消息并持久化
  const handleHistorySessionMessagesChange = useCallback(
    (sessionId: string, msgs: { id: string; role: "user" | "assistant"; content: string }[]) => {
      const converted: ChatMessage[] = msgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        feedback: null,
      }));
      const firstUser = converted.find((m) => m.role === "user");
      const lastAssistant = [...converted].reverse().find((m) => m.role === "assistant");
    const title = (firstUser?.content || "历史会话").slice(0, 16);
    const preview = (lastAssistant?.content || firstUser?.content || "").slice(0, 28);
      setHistorySessions((prev) => {
        const next = prev.map((s) =>
          s.id === sessionId ? { ...s, title, preview, messages: converted } : s
        );
        saveHistory(activeTwin, next);
        return next;
      });
    },
    [activeTwin]
  );

  // 一旦有消息且当前没有会话 id，立即创建一条历史会话（这样历史聊天里会立刻出现）
  useEffect(() => {
    if (messages.length === 0 || currentSessionId !== null) return;
    const sessionId = Date.now().toString();
    setCurrentSessionId(sessionId);
    const firstUser = messages.find((m) => m.role === "user");
    const title = (firstUser?.content || "新会话").slice(0, 16);
    const preview = (firstUser?.content || "").slice(0, 28);
    const newSession: ChatSession = {
      id: sessionId,
      time: new Date().toLocaleString(),
      title,
      preview,
      messages: [...messages],
    };
    setHistorySessions((prev) => {
      const updated = [newSession, ...prev];
      saveHistory(activeTwin, updated);
      return updated;
    });
  }, [messages, currentSessionId, activeTwin]);

  // Mock Logs Data
  const analyticsLogsByTwin: Record<string, any[]> = {
    't-001': [
      { time: '刚刚', type: '反馈强化', preview: '由于您的正向回馈，分身加深了对该话题的权重记忆。' },
      { time: '10:42 AM', type: '回应 [客户A] 询问', preview: '使用了职场 Persona，语气严谨，准确率 98%' },
    ],
    't-002': [
      { time: '刚刚', type: '模因更新', preview: '自动抓取了最新的脱口秀热梗植入对话库。' },
      { time: '昨天晚上', type: '群聊辅助', preview: '成功使用幽默语气化解了朋友群里的尴尬气氛。' },
    ]
  };

  const analyticsLogs = analyticsLogsByTwin[activeTwin] || analyticsLogsByTwin['t-001'];

  // Animate the SVG ring based on syncRate
  const circleRadius = 45;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (syncRate / 100) * circumference;

  const handleStart = () => {
    setLoading(true);
    // Simulate network delay for fetching Twin Profile and initial greeting
    setTimeout(() => {
      const nextMessages: ChatMessage[] = [];
      nextMessages.push({
        id: Date.now().toString() + "-sys",
        role: "system",
        content: `[系统] 已连接至记忆核心。当前分身设定：${activeTwin === 't-001' ? '工作模式' : '娱乐模式'}。`
      });
      nextMessages.push({
        id: Date.now().toString() + "-ast",
        role: "assistant",
        content: activeTwin === 't-001'
          ? "早上好。我已经查阅了你昨天的会议纪要，有什么我能帮忙整理的吗？"
          : "嘿！周末过得爽吗？我看到你拍的那些滑雪照片了！"
      });

      const sessionId = Date.now().toString();
      setMessages(nextMessages);
      setCurrentSessionId(sessionId);

      const newSession: ChatSession = {
        id: sessionId,
        time: new Date().toLocaleString(),
        title: activeTwin === "t-001" ? "新会话：工作模式" : "新会话",
        preview: "",
        messages: nextMessages,
      };

      setHistorySessions((prev) => {
        const updated = [newSession, ...prev];
        saveHistory(activeTwin, updated);
        return updated;
      });

      setStarted(true);
      setLoading(false);
    }, 1500);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userContent = input.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString() + "-usr",
      role: "user",
      content: userContent
    };
    setMessages((prev) => [...prev, userMsg]);

    const mentionedExpert = presetConsultants.find(c => input.includes(`@${c.name}`));
    setInput("");
    setShowAtMenu(false);
    setLoading(true);

    if (mentionedExpert) {
      // @ 专家：保留原有模拟回复
      setTimeout(() => {
        const expertReplies = [
          `根据 ${mentionedExpert.domain} 领域的最新数据监控，我建议您采取防御性策略。`,
          `已经为您调用了自动化 API，预计转化率可提升 15%。这是具体的执行方案。`
        ];
        const randomExpertReply = expertReplies[Math.floor(Math.random() * expertReplies.length)];
        const astMsg: ChatMessage = {
          id: Date.now().toString() + "-ast",
          role: "assistant",
          content: randomExpertReply,
          feedback: null,
          isExpert: true,
          expertAvatar: mentionedExpert.avatar,
          expertName: mentionedExpert.name
        };
        setMessages((prev) => [...prev, astMsg]);
        setLoading(false);
        setActiveConsultant(null);
      }, 1500);
      return;
    }

    // 分身对话：调用后端 Gemini
    try {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      const { reply } = await postChat({
        message: userContent,
        twinId: activeTwin,
        history,
      });
      const astMsg: ChatMessage = {
        id: Date.now().toString() + "-ast",
        role: "assistant",
        content: reply,
        feedback: null,
      };
      setMessages((prev) => [...prev, astMsg]);
    } catch (err) {
      const errText = err instanceof Error ? err.message : String(err);
      const hint = "回复失败：" + errText;
      const astMsg: ChatMessage = {
        id: Date.now().toString() + "-ast",
        role: "assistant",
        content: hint,
        feedback: null,
      };
      setMessages((prev) => [...prev, astMsg]);
    } finally {
      setLoading(false);
      setActiveConsultant(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    // Simple @ detection
    const lastWord = val.split(" ").pop() || "";
    if (lastWord.startsWith("@")) {
      setShowAtMenu(true);
      setAtQuery(lastWord.substring(1).toLowerCase());
    } else {
      setShowAtMenu(false);
    }
  };

  const insertMention = (name: string) => {
    const words = input.split(" ");
    words.pop(); // remove the partial @ word
    words.push(`@${name} `);
    setInput(words.join(" "));
    setShowAtMenu(false);

    // Auto focus back could go here
  };

  const handleAbsorb = (msgId: string, e: React.MouseEvent) => {
    // 1. Mark as absorbed visually (optional UI state, skipping for brevity)

    // 2. Trigger absorption floating animation（仅做视觉反馈，不改动大脑同步率）
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setFloatingText({
      id: floatIdCounter++,
      x: rect.left - 40,
      y: rect.top - 40,
      text: "✨ 已吸收专家思维"
    });

    setTimeout(() => setFloatingText(null), 1500);
  };

  const handleFeedback = (msgId: string, type: "up" | "down", e: React.MouseEvent) => {
    // 1. Update message state
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, feedback: type } : m
    ));

    // 2. Trigger floating animation
    if (type === "up") {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setFloatingText({
        id: floatIdCounter++,
        x: rect.left,
        y: rect.top - 20,
        text: "+1% Sync"
      });

      // Clear floating text after animation
      setTimeout(() => setFloatingText(null), 1000);

      // 3. Update Sync Rate
      setSyncRate(prev => Math.min(prev + 1, 100));
    } else {
      setSyncRate(prev => Math.max(prev - 1, 0));
    }
  };

  const handleConsultantClick = (expertName: string) => {
    // Inject @ mention into input
    const currentInput = input.trim();
    const prefix = currentInput ? currentInput + " " : "";
    setInput(prefix + `@${expertName} `);

    // Set active consultant to trigger the breathing light UI
    setActiveConsultant(expertName);
  };

  // 当当前会话有变更时，更新对应历史记录的 title / preview / messages 并持久化
  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return;

    const firstUser = messages.find((m) => m.role === "user");
    const firstAssistant = messages.find((m) => m.role === "assistant");
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

    const titleBase = firstUser?.content || firstAssistant?.content || "历史会话";
    const title = titleBase.slice(0, 16);
    const previewBase = lastAssistant?.content || titleBase;
    const preview = previewBase.slice(0, 28);

    setHistorySessions((prev) => {
      const next = prev.map((s) =>
        s.id === currentSessionId
          ? { ...s, title, preview, messages: messages }
          : s
      );
      saveHistory(activeTwin, next);
      return next;
    });
  }, [messages, currentSessionId, activeTwin]);

  return (
    <div className="evochat-container" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 100px)', maxHeight: 'calc(100vh - 100px)', height: '100%', overflow: 'hidden' }}>
      {/* HEADER MANAGER */}
      <div className="analytics-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 className="analytics-title" style={{ color: "#34d399", marginBottom: '8px' }}>进化聊天室 (Evolution Chat)</h1>
          <p className="analytics-subtitle" style={{ margin: 0 }}>边聊边调教：提供即时反馈（RLHF），提升数字大脑的同步率。</p>
        </div>

        <div className="evochat-top-row" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <div className="evochat-top-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
            <TwinSelector
              value={activeTwin}
              onChange={(val) => {
                setActiveTwin(val);
                setStarted(false);
                setMessages([]);
                setSelectedHistoryId(null);
                setSyncRate(0);
              }}
            />
            <div className="awaken-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                className={`btn-awaken${isAwakened ? " btn-awaken--active" : ""}`}
                onClick={handleAwaken}
                disabled={!hasLlmKey || memoryLoading}
              >
                {memoryLoading ? "读取记忆中…" : isAwakened ? "✅ 记忆已加载" : "⚡ 唤醒并连接"}
              </button>
              {awakenNote && (
                <span className={`awaken-note${awakenNote.ok ? "" : " awaken-note--err"}`}>
                  {awakenNote.text}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MULTI PANE LAYOUT */}
      <div className="evochat-layout" style={{ display: 'grid', gridTemplateColumns: `minmax(380px, 1fr) 2fr`, gridTemplateRows: '1fr', gap: '24px', flex: 1, minHeight: 0, overflow: 'hidden', transition: 'grid-template-columns 0.3s ease' }}>

        {/* LEFT PANE: Analytics/History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'hidden' }}>

          <div className="dashboard-card card--sync-rate evochat-pane-sync" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

            {/* Sub-Tabs for Left Pane */}
            <div className="evochat-tabs">
              <button
                className={`evochat-tab-btn ${leftPaneMode === 'analytics' ? 'active' : ''}`}
                onClick={() => setLeftPaneMode('analytics')}
              >
                📊 实时大盘
              </button>
              <button
                className={`evochat-tab-btn ${leftPaneMode === 'history' ? 'active' : ''}`}
                onClick={() => setLeftPaneMode('history')}
              >
                🕰️ 历史聊天
              </button>
            </div>

            {leftPaneMode === 'analytics' ? (
              <div className="evochat-analytics-wrap" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'auto' }}>
                <h3 className="card-title">大脑同步率 (Brain Sync Rate)</h3>

                <div className="sync-ring-container" style={{ margin: '16px auto 10px' }}>
                  <svg viewBox="0 0 100 100" className="sync-ring-svg">
                    <circle className="sync-ring-bg" cx="50" cy="50" r="45" />
                    <circle
                      className="sync-ring-fill"
                      cx="50" cy="50" r="45"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      style={{ stroke: '#34d399', transition: 'stroke-dashoffset 0.8s ease-out' }}
                    />
                  </svg>
                  <div className="sync-ring-value">
                    <span className="sync-number" style={{ color: '#34d399' }}>{syncRate}</span>
                    <span className="sync-percent">%</span>
                  </div>
                </div>

                <p className="sync-status" style={{ textAlign: 'center', marginBottom: '16px' }}>
                  {syncRate >= 90 ? "极高：简直就是世界上的另一个你" :
                    syncRate >= 80 ? "优秀：核心价值观认知高度一致" :
                      "普通：仍需更多日常对话反馈进行微调"}
                </p>
              </div>
            ) : (
              <div className="evochat-history-wrap" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <button
                  type="button"
                  className="evochat-history-new-btn"
                  onClick={() => {
                    setSelectedHistoryId(null);
                    setCurrentSessionId(null);
                    setMessages([]);
                    setMainChatResetKey((k) => k + 1);
                  }}
                >
                  ➕ 新对话
                </button>
                <ul className="history-list">
                {historySessions.map(session => (
                  <li
                    key={session.id}
                    className={`history-item ${selectedHistoryId === session.id ? 'active' : ''}`}
                    onClick={() => setSelectedHistoryId(session.id)}
                  >
                    <span className="history-time">{session.time}</span>
                    <h4 className="history-title">{session.title}</h4>
                    <p className="history-preview">{session.preview}</p>
                  </li>
                ))}
              </ul>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE PANE: Chat Interface（固定高度，历史/当前对话均不拉长） */}
        <div className="dashboard-card evochat-pane-chat" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, maxHeight: '100%', padding: '0', overflow: 'hidden' }}>

          {/* 如果在历史模式下选中了某条会话，则回放并可继续聊天；否则展示当前实时聊天（可新开一段） */}
          {leftPaneMode === 'history' && selectedHistoryId ? (() => {
            const selectedSession = historySessions.find((s) => s.id === selectedHistoryId);
            const replayMessages =
              selectedSession?.messages
                ?.filter((m): m is ChatMessage => m.role === "user" || m.role === "assistant")
                .map((m) => ({ id: m.id, role: m.role, content: m.content })) ?? [];
            return (
            <TwinChat
              key={`history-${selectedHistoryId}`}
              twinId={twinId}
              sessionMemory={sessionMemory}
              initialMessages={replayMessages}
              sessionKey={selectedHistoryId}
              onMessagesChange={(msgs) => handleHistorySessionMessagesChange(selectedHistoryId!, msgs)}
              onFeedbackSync={(type, e) => {
                // 历史回放模式下不再对同步率/反馈做修改
              }}
            />
            );
          })() : (
            <TwinChat
              key={`main-${mainChatResetKey}`}
              twinId={twinId}
              sessionMemory={sessionMemory}
              onMessagesChange={handleTwinChatMessagesChange}
              onFeedbackSync={(type, e) => {
                // 在聊天区给分身点赞/点踩时，同步更新大脑同步率，并展示浮动提示
                // 同时累积反馈统计，供认知维度矩阵微调使用
                try {
                  const raw = window.localStorage.getItem("twin_feedback_stats");
                  const stats = raw ? JSON.parse(raw) as { upCount?: number; downCount?: number } : {};
                  const up = Number(stats.upCount) || 0;
                  const down = Number(stats.downCount) || 0;
                  const next = {
                    upCount: type === "up" ? up + 1 : up,
                    downCount: type === "down" ? down + 1 : down,
                  };
                  window.localStorage.setItem("twin_feedback_stats", JSON.stringify(next));
                } catch { /* ignore */ }

                if (type === "up") {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  setFloatingText({
                    id: floatIdCounter++,
                    x: rect.left,
                    y: rect.top - 20,
                    text: "+1% Sync",
                  });
                  setTimeout(() => setFloatingText(null), 1000);
                  setSyncRate((prev) => Math.min(prev + 1, 100));
                } else {
                  setSyncRate((prev) => Math.max(prev - 1, 0));
                }
              }}
            />
          )}
        </div>

      </div>

      {/* Global Floating Text Animation */}
      {floatingText && (
        <div
          className="floating-feedback-text"
          style={{
            position: 'fixed',
            left: floatingText.x,
            top: floatingText.y,
            color: '#34d399',
            fontWeight: 'bold',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {floatingText.text}
        </div>
      )}
    </div>
  );
};
