import React, { useState, useEffect } from "react";
import { TwinSelector } from "./TwinSelector";
import { TwinChat } from "./TwinChat";

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
  const [activeTwin, setActiveTwin] = useState("t-001");
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  // Analytics State
  const [syncRate, setSyncRate] = useState(87);
  const [floatingText, setFloatingText] = useState<{ id: number, x: number, y: number, text: string } | null>(null);
  const [leftPaneMode, setLeftPaneMode] = useState<'analytics' | 'history'>('analytics');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  let floatIdCounter = 0;

  // Consultant Dock State (Compact)
  const presetConsultants = [
    { id: 'c1', name: '跨境电商选品雷达', avatar: '/avatars/presets/1.png', domain: 'E-commerce', icon: '📈' },
    { id: 'c2', name: 'X平台内容运营专家', avatar: '/avatars/presets/2.png', domain: 'Social Media', icon: '📱' },
    { id: 'c3', name: '法律风控合规官', avatar: '/avatars/presets/3.png', domain: 'Global Legal', icon: '⚖️' },
  ];
  const [showAtMenu, setShowAtMenu] = useState(false);
  const [atQuery, setAtQuery] = useState("");
  const [activeConsultant, setActiveConsultant] = useState<string | null>(null);

  // Mock History Data
  const historySessionsByTwin: Record<string, any[]> = {
    't-001': [
      { id: 'h1', title: '职场高压会议演练', time: '昨天 14:30', preview: '探讨了面对激进提问时的防御性话术...', keywords: [{ word: '边界感', weight: 9 }, { word: '情绪稳定', weight: 7 }, { word: '防御性话术', weight: 8 }, { word: '职场PUA', weight: 5 }, { word: '结构化思维', weight: 6 }] },
      { id: 'h2', title: '年度OKRs汇报对齐', time: '上周一 09:15', preview: '优化了向上汇报时的STAR原则表达...', keywords: [{ word: '向上管理', weight: 9 }, { word: '数据导向', weight: 8 }, { word: '核心目标', weight: 7 }, { word: '资源盘点', weight: 6 }, { word: '复盘逻辑', weight: 8 }] },
    ],
    't-002': [
      { id: 'h3', title: '周末烧烤派对吐槽', time: '前天 19:00', preview: '分享了腌制排骨的独家配方和精酿啤酒...', keywords: [{ word: '精酿啤酒', weight: 8 }, { word: '腌制配方', weight: 9 }, { word: '松弛感', weight: 7 }, { word: '社交能量', weight: 6 }, { word: '重度烘焙', weight: 5 }] },
      { id: 'h4', title: '《沙丘2》观后感交流', time: '上周六 23:15', preview: '关于科幻史诗中的宿命论与宗教隐喻...', keywords: [{ word: '宿命论', weight: 9 }, { word: '姐妹会', weight: 8 }, { word: '香料视觉', weight: 7 }, { word: '弗雷曼人', weight: 6 }, { word: '救世主困境', weight: 9 }] },
    ]
  };

  const historySessions = historySessionsByTwin[activeTwin] || historySessionsByTwin['t-001'];

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

      setMessages(nextMessages);
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

    // 2. Trigger absorption floating animation
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setFloatingText({
      id: floatIdCounter++,
      x: rect.left - 40,
      y: rect.top - 40,
      text: "✨ 吸收专家思维 +5% Sync"
    });

    setTimeout(() => setFloatingText(null), 1500);

    // 3. Update Sync Rate dramatically
    setSyncRate(prev => Math.min(prev + 5, 100));
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

  return (
    <div className="evochat-container">
      {/* HEADER MANAGER */}
      <div className="analytics-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 className="analytics-title" style={{ color: "#34d399", marginBottom: '8px' }}>进化聊天室 (Evolution Chat)</h1>
          <p className="analytics-subtitle" style={{ margin: 0 }}>边聊边调教：提供即时反馈（RLHF），提升数字大脑的同步率。</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
          <TwinSelector
            value={activeTwin}
            onChange={(val) => {
              setActiveTwin(val);
              setStarted(false);
              setMessages([]);
              setSelectedHistoryId(null);
              setSyncRate(val === 't-001' ? 88 : 87);
            }}
          />

          <button
            className="btn-launch-sandbox"
            style={{
              width: 'auto', padding: '10px 24px', fontSize: '15px', borderRadius: '20px',
              background: started ? 'rgba(52, 211, 153, 0.2)' : 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
              color: started ? '#34d399' : '#fff',
              border: started ? '1px solid #34d399' : 'none',
              boxShadow: started ? 'none' : '0 4px 15px rgba(52, 211, 153, 0.4)'
            }}
            onClick={handleStart}
            disabled={loading}
          >
            {started ? "🔄 重新载入引擎" : "🚀 唤醒并连接"}
          </button>
        </div>
      </div>

      {/* MULTI PANE LAYOUT */}
      <div className="evochat-layout" style={{ display: 'grid', gridTemplateColumns: `minmax(300px, 1fr) 2fr`, gap: '24px', height: 'calc(100vh - 200px)', transition: 'grid-template-columns 0.3s ease' }}>

        {/* LEFT PANE: Analytics Dashboard & History & Consultant Dock */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'hidden' }}>

          <div className="dashboard-card card--sync-rate" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

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
              <>
                <h3 className="card-title">大脑同步率 (Brain Sync Rate)</h3>

                <div className="sync-ring-container" style={{ margin: '16px auto 30px' }}>
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

                <p className="sync-status" style={{ textAlign: 'center', marginBottom: '30px' }}>
                  {syncRate >= 90 ? "极高：简直就是世界上的另一个你" :
                    syncRate >= 80 ? "优秀：核心价值观认知高度一致" :
                      "普通：仍需更多日常对话反馈进行微调"}
                </p>

                <h3 className="card-title">近期神经活动</h3>
                <ul className="log-list" style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
                  {analyticsLogs.map((log, idx) => (
                    <li key={idx} className="log-item">
                      <span className="log-time" style={{ color: idx === 0 ? '#34d399' : '#94a3b8' }}>{log.time}</span>
                      <div className="log-content">
                        <strong>{log.type}</strong>
                        <p>{log.preview}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
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
            )}
          </div>

          {/* New Inline Consultant Dock (Separated Card) */}
          <div className="dashboard-card consultant-dock-container" style={{ padding: '16px 20px', flexShrink: 0 }}>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: 600 }}>辅助智囊团 (Consultants)</div>
            <div className="consultant-dock-inline" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
              {presetConsultants.map(c => (
                <div
                  key={c.id}
                  className={`inline-dock-item ${activeConsultant === c.name ? 'active' : ''}`}
                  onClick={() => handleConsultantClick(c.name)}
                  title={`${c.name} - ${c.domain}`}
                >
                  <div className="inline-dock-avatar-wrapper">
                    {activeConsultant === c.name && <div className="consultant-avatar-breathing"></div>}
                    <img src={c.avatar} alt={c.name} className="inline-dock-avatar" />
                  </div>
                </div>
              ))}
              <div
                className="inline-dock-item add-more"
                onClick={() => { if (onNavigateToPresets) onNavigateToPresets() }}
                title="招募专家"
              >
                <div className="inline-dock-avatar-wrapper">
                  <div className="inline-dock-avatar add-btn">+</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE PANE: Chat Interface */}
        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0', overflow: 'hidden' }}>

          {/* Chat Body or Keyword Cloud */}
          {leftPaneMode === 'history' && selectedHistoryId ? (
            <div className="keyword-cloud-container">
              {historySessions.find(s => s.id === selectedHistoryId)?.keywords.map((kw: { word: string, weight: number }, idx: number) => {
                // Calculate size based on weight (5-9 map to ~20px-60px)
                const fontSize = `${(kw.weight - 3) * 8 + 12}px`;
                // Assign a cyber color based on index
                const colors = ['#34d399', '#6366f1', '#8b5cf6', '#22d3ee', '#f472b6'];
                const color = colors[idx % colors.length];

                return (
                  <div
                    key={idx}
                    className="keyword-item"
                    style={{
                      fontSize,
                      color,
                      opacity: kw.weight / 10 + 0.2
                    }}
                  >
                    {kw.word}
                  </div>
                );
              })}
            </div>
          ) : (
            <TwinChat twinId={twinId} />
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
