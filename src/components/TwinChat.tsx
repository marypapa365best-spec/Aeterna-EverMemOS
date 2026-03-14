import React, { useState, useRef, useEffect } from "react";
import { chatWithGeminiDirect, getStoredGeminiApiKey, getStoredOpenAIApiKey, postChat, fetchMemoriesForContext, getSkillPrompt } from "../api/twinApi";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const DEFAULT_TWIN_ID = "demo-twin-001";

interface TwinChatProps {
  twinId?: string;
  /** 由父组件（EvolutionChat）唤醒后传入的会话记忆上下文 */
  sessionMemory?: string | null;
  onFeedbackSync?: (type: "up" | "down", e: React.MouseEvent<HTMLButtonElement>) => void;
  /** 消息变化时通知父组件，用于历史聊天记录同步 */
  onMessagesChange?: (messages: Msg[]) => void;
  /** 历史回放：预填消息；与 sessionKey 配合，仅当 sessionKey 变化时同步 */
  initialMessages?: Msg[];
  /** 历史会话唯一标识，变化时才从 initialMessages 同步，避免父组件重渲染导致反复重置而跳动 */
  sessionKey?: string | null;
  /** 是否为只读/回放模式（隐藏输入栏） */
  readOnly?: boolean;
}

export const TwinChat: React.FC<TwinChatProps> = ({ twinId = DEFAULT_TWIN_ID, sessionMemory = null, onFeedbackSync, onMessagesChange, initialMessages, sessionKey, readOnly = false }) => {
  const [messages, setMessages] = useState<Msg[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeSkill, setActiveSkill] = useState<{ id: string; name: string; desc: string } | null>(null);

  const hasKey = !!getStoredGeminiApiKey() || !!getStoredOpenAIApiKey();
  const isAwakened = sessionMemory !== null;
  const initialMessagesRef = useRef(initialMessages);
  initialMessagesRef.current = initialMessages;

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

  // 仅当 sessionKey 变化时同步 initialMessages，避免父组件每次重渲染都重置消息导致跳动
  useEffect(() => {
    if (sessionKey != null && initialMessagesRef.current != null) {
      setMessages(initialMessagesRef.current);
    }
  }, [sessionKey]);

  useEffect(() => {
    if (!readOnly) onMessagesChange?.(messages);
  }, [messages, onMessagesChange, readOnly]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("twin_active_skill");
      if (raw) {
        const parsed = JSON.parse(raw) as { id?: string; name?: string; desc?: string };
        if (parsed.name && parsed.id) {
          setActiveSkill({ id: parsed.id, name: parsed.name, desc: parsed.desc || "" });
        }
      }
    } catch {
      setActiveSkill(null);
    }
  }, []);

  // 若有技能刚被激活，为用户预填一条与该技能相关的首句
  useEffect(() => {
    try {
      const pending = window.localStorage.getItem("twin_pending_skill_message");
      if (pending && !messages.length) {
        setInput(pending);
        window.localStorage.removeItem("twin_pending_skill_message");
      }
    } catch {
      // ignore
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { id: "u-" + Date.now(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      // 若已唤醒，复用会话记忆；否则每次动态检索（兜底）
      const memoryContext = isAwakened
        ? (sessionMemory || undefined)
        : await fetchMemoriesForContext({ user_id: twinId, query: text, maxItems: 15 });

      let skillPromptVal: string | null = null;
      if (activeSkill?.id) {
        skillPromptVal = await getSkillPrompt(activeSkill.id);
      }
      const openaiKey = getStoredOpenAIApiKey();
      const geminiKey = getStoredGeminiApiKey();
      let reply: string;
      if (openaiKey) {
        reply = (await postChat({
          message: text,
          twinId,
          history,
          memoryContext: memoryContext || undefined,
          skillPrompt: skillPromptVal ?? undefined,
        })).reply;
      } else {
        reply = (await chatWithGeminiDirect({
          message: text,
          history,
          memoryContext: memoryContext || undefined,
          skillPrompt: skillPromptVal ?? undefined,
        })).reply;
      }
      setMessages((prev) => [...prev, { id: "a-" + Date.now(), role: "assistant", content: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { id: "a-" + Date.now(), role: "assistant", content: "回复失败：" + msg },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="twin-chat">
      <div className="twin-chat-header">
        <div>
          <div className="twin-chat-title">分身对话</div>
          <div className="twin-chat-subtitle">结合 EverMemOS 记忆，与数字永生分身自然聊天</div>
        </div>
        <div className="twin-chat-header-right">
          <div className="twin-chat-status">
            <span className={`twin-chat-dot ${hasKey ? "online" : "offline"}`} />
            {hasKey ? "已连接" : "未配置 API Key（OpenAI 或 Gemini）"}
          </div>
        </div>
      </div>
      <div ref={listRef} className="twin-chat-list">
        {!readOnly && !hasKey && (
          <div className="twin-chat-placeholder">
            请在右上角「设置」中填写 <strong>Gemini API Key</strong> 后即可与分身对话。<br />
            本聊天直接连接 Google Gemini，无需启动后端。
          </div>
        )}
        {!readOnly && hasKey && !isAwakened && (
          <div className="twin-chat-placeholder">
            请先点击「<strong>⚡ 唤醒并连接</strong>」，加载分身记忆后再开始对话。
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`twin-chat-row twin-chat-row--${m.role}`}
          >
            {m.role === "assistant" && (
              <div className="twin-chat-avatar" aria-hidden>分身</div>
            )}
            <div className={`twin-chat-bubble twin-chat-bubble--${m.role}`}>
              <div className="twin-chat-bubble-content">{m.content}</div>
              {m.role === "assistant" && onFeedbackSync && (
                <div className="twin-chat-feedback">
                  <span className="twin-chat-feedback-label">这条回复对你有帮助吗？</span>
                  <button
                    type="button"
                    className="twin-chat-feedback-btn"
                    onClick={(e) => onFeedbackSync("up", e)}
                  >
                    👍 同步率 +1%
                  </button>
                  <button
                    type="button"
                    className="twin-chat-feedback-btn twin-chat-feedback-btn--down"
                    onClick={(e) => onFeedbackSync("down", e)}
                  >
                    👎 同步率 -1%
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="twin-chat-row twin-chat-row--assistant">
            <div className="twin-chat-avatar" aria-hidden>分身</div>
            <div className="twin-chat-typing">分身正在回复…</div>
          </div>
        )}
      </div>
      {!readOnly && (
      <div className="twin-chat-input-bar">
        {activeSkill && (
          <div className="twin-chat-skill-pill">
            <span className="twin-chat-skill-label">当前能力提示词：</span>
            <span className="twin-chat-skill-name">{activeSkill.name}</span>
            <button
              type="button"
              className="twin-chat-skill-clear"
              onClick={() => {
                setActiveSkill(null);
                try {
                  window.localStorage.removeItem("twin_active_skill");
                } catch {
                  // ignore
                }
              }}
            >
              清除
            </button>
          </div>
        )}
        <div className="twin-chat-input-wrap">
          <textarea
            className="twin-chat-input"
            rows={2}
            placeholder={
              !hasKey
                ? "请先在设置中填写 Gemini API Key"
                : !isAwakened
                ? "请先点击「⚡ 唤醒并连接」加载分身记忆…"
                : "输入消息与分身对话…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={!hasKey || !isAwakened || loading}
          />
          <button
            type="button"
            className="twin-chat-send"
            onClick={handleSend}
            disabled={!hasKey || !isAwakened || loading || !input.trim()}
          >
            发送
          </button>
        </div>
      </div>
      )}
    </div>
  );
};
