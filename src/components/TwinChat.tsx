import React, { useState, useRef, useEffect } from "react";
import { chatWithGeminiDirect, getStoredGeminiApiKey, fetchMemoriesForContext } from "../api/twinApi";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const DEFAULT_TWIN_ID = "demo-twin-001";

interface TwinChatProps {
  /** 分身 ID，与 EverMemOS 存入记忆时使用的 user_id 一致，用于拉取「你存入的记忆」给大模型 */
  twinId?: string;
}

export const TwinChat: React.FC<TwinChatProps> = ({ twinId = DEFAULT_TWIN_ID }) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const hasKey = !!getStoredGeminiApiKey();

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

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
      const memoryContext = await fetchMemoriesForContext({
        user_id: twinId,
        query: text,
        maxItems: 15,
      });
      const { reply } = await chatWithGeminiDirect({
        message: text,
        history,
        memoryContext: memoryContext || undefined,
      });
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
      <div ref={listRef} className="twin-chat-list">
        {!hasKey && (
          <div className="twin-chat-placeholder">
            请在右上角「设置」中填写 <strong>Gemini API Key</strong> 后即可与分身对话。<br />
            本聊天直接连接 Google Gemini，无需启动后端。
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
      <div className="twin-chat-input-bar">
        <textarea
          className="twin-chat-input"
          rows={2}
          placeholder={hasKey ? "输入消息与分身对话…" : "请先在设置中填写 Gemini API Key"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={!hasKey || loading}
        />
        <button
          type="button"
          className="twin-chat-send"
          onClick={handleSend}
          disabled={!hasKey || loading || !input.trim()}
        >
          发送
        </button>
      </div>
    </div>
  );
};
