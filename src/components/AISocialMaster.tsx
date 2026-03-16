import React, { useState, useEffect, useRef } from "react";
import { TwinSelector, TWIN_OPTIONS } from "./TwinSelector";
import { chatWithGeminiDirect, fetchMemoriesForContext } from "../api/twinApi";

export const AISocialMaster: React.FC = () => {
  const [activeTwin, setActiveTwin] = useState("t-001"); // 唯一的数字永生分身
  const [mainTab, setMainTab] = useState<"radar" | "friends">("radar");
  const [isSandboxActive, setIsSandboxActive] = useState(false);
  const [sandboxPhase, setSandboxPhase] = useState<"scanning" | "scanned">("scanning");
  const [scannedCandidates, setScannedCandidates] = useState<Array<{ id: string; name: string; avatar: string; comp: string; desc: string }>>([]);
  const [candidateActionTarget, setCandidateActionTarget] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const personaDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedMbti, setSelectedMbti] = useState<string[]>([]);
  const [mbtiDropdownOpen, setMbtiDropdownOpen] = useState(false);
  const mbtiDropdownRef = useRef<HTMLDivElement>(null);

  // 与「形象设计」一致：从 localStorage 读取分身头像，用于沙盒中心「我的分身」圆圈
  const TWIN_AVATAR_STORAGE_KEY = "twin_avatar";
  const [sandboxCenterAvatar, setSandboxCenterAvatar] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(TWIN_AVATAR_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (!isSandboxActive) return;
    try {
      const raw = window.localStorage.getItem(TWIN_AVATAR_STORAGE_KEY);
      setSandboxCenterAvatar(raw);
    } catch { /* ignore */ }
  }, [isSandboxActive]);

  useEffect(() => {
    if (!personaDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (personaDropdownRef.current && !personaDropdownRef.current.contains(e.target as Node)) {
        setPersonaDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [personaDropdownOpen]);

  useEffect(() => {
    if (!mbtiDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (mbtiDropdownRef.current && !mbtiDropdownRef.current.contains(e.target as Node)) {
        setMbtiDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mbtiDropdownOpen]);

  const MBTI_OPTIONS = [
    "ISTJ The Inspector",
    "ISFJ The Nurturer",
    "INFJ The Counselor",
    "INTJ The Mastermind",
    "ISTP The Craftsman",
    "ISFP The Composer",
    "INFP The Idealist",
    "INTP The Thinker",
    "ESTP The Doer",
    "ESFP The Performer",
    "ENFP The Champion",
    "ENTP The Visionary",
    "ESTJ The Supervisor",
    "ESFJ The Provider",
    "ENFJ The Giver",
    "ENTJ The Commander",
  ];

  const NODE_PERSONA_OPTIONS = [
    "资深IT工程师",
    "美少女",
    "徒步达人",
    "创业CEO",
    "设计师",
    "冥想者",
    "游戏宅",
    "极客",
    "文艺青年",
    "运动达人",
  ];

  // ---- Friends Chat State ----
  const [selectedFriend, setSelectedFriend] = useState<string | null>("f-001");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "friend", text: string }[]>([]);
  const [friendLoading, setFriendLoading] = useState(false);
  // 按好友 id 分别保存对话记录，切换好友时不会混在一起
  const [messagesByFriend, setMessagesByFriend] = useState<Record<string, { sender: "user" | "friend", text: string }[]>>({});

  const mockFriends = [
    { id: "f-001", name: "Charlie_09", avatar: "👨‍💻", comp: "95%", desc: "独立开发者，热爱 Next.js 架构推演" },
    { id: "f-002", name: "Luna_W", avatar: "/avatars/luna-doubao.png", comp: "88%", desc: "文艺气质，喜欢阅读与旅行，寻找同频伙伴" },
    { id: "f-003", name: "Zen_Master", avatar: "/avatars/friend-woman.png", comp: "75%", desc: "每天冥想的极客，寻求精神探讨" }
  ];

  const handleSendMessage = async () => {
    if (!chatInput.trim() || friendLoading || !selectedFriend) return;
    const text = chatInput.trim();
    const userMsg = { sender: "user" as const, text };
    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setMessagesByFriend(prev => ({ ...prev, [selectedFriend]: [...(prev[selectedFriend] || []), userMsg] }));
    setChatInput("");
    setFriendLoading(true);
    try {
      const history = chatMessages.map(m => ({
        role: m.sender === "friend" ? "assistant" as const : "user" as const,
        content: m.text,
      }));
      const memoryContext = await fetchMemoriesForContext({
        user_id: "demo-twin-001",
        query: text,
        maxItems: 10,
      });
      const friend = mockFriends.find(f => f.id === selectedFriend) || mockFriends[0];
      const avatarDesc = typeof friend.avatar === "string" && (friend.avatar.startsWith("/") || friend.avatar.startsWith("http")) ? "真人风格头像" : friend.avatar;
      const skillPrompt =
        `你现在处于「AI 社交好友」模式，扮演一位昵称为 ${friend.name} 的高契合朋友，头像是 ${avatarDesc}，简介是「${friend.desc}」。` +
        `请根据用户刚才的一句话，用中文自然地回复 1～3 句，语气轻松友好，可以有一点幽默，但不要太长。` +
        `避免重复用户原话，不要暴露你是大模型或在沙盒中，仅以朋友身份聊天。`;
      const { reply } = await chatWithGeminiDirect({
        message: text,
        history,
        memoryContext: memoryContext || undefined,
        skillPrompt,
      });
      const friendMsg = { sender: "friend" as const, text: reply };
      setChatMessages(prev => [...prev, friendMsg]);
      setMessagesByFriend(prev => ({ ...prev, [selectedFriend]: [...(prev[selectedFriend] || []), friendMsg] }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const errMsg = { sender: "friend" as const, text: `（好友暂时没连上，只返回了错误信息：${msg}）` };
      setChatMessages(prev => [...prev, errMsg]);
      setMessagesByFriend(prev => ({ ...prev, [selectedFriend]: [...(prev[selectedFriend] || []), errMsg] }));
    } finally {
      setFriendLoading(false);
    }
  };

  const openConversation = (friendId: string) => {
    setSelectedFriend(friendId);
    setChatMessages(messagesByFriend[friendId] || []);
  };

  // 启动维度潜入：先进入扫描阶段，约 2.5 秒后显示两名备选分身
  const handleLaunchSandbox = () => {
    setIsSandboxActive(true);
    setSandboxPhase("scanning");
    setScannedCandidates([]);
    setCandidateActionTarget(null);
  };

  const handleTerminateSandbox = () => {
    setIsSandboxActive(false);
    setSandboxPhase("scanning");
    setScannedCandidates([]);
    setCandidateActionTarget(null);
  };

  // Simulation effect for Sandbox Terminal Logs + 扫描完成后展示备选分身
  useEffect(() => {
    if (!isSandboxActive) return;

    const initialLogs = [
      `[00:00:12] 初始化“虚拟沙盒”环境... 潜入成功。`,
      `[00:00:15] 载入红线防御策略 (封锁：财务状况、伴侣信息)。`,
      `[00:00:18] 开始根据目标雷达扫描匹配节点...`
    ];
    setLogs(initialLogs);

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // 约 2.5 秒后雷达扫描结束，显示两名备选
    timeouts.push(setTimeout(() => {
      setSandboxPhase("scanned");
      setScannedCandidates([
        { id: "scan-1", name: "Charlie_09", avatar: "👨‍💻", comp: "95%", desc: "独立开发者，契合度 95%" },
        { id: "scan-2", name: "Alice_X", avatar: "👩‍🎨", comp: "51%", desc: "数字游民，契合度 51%" },
      ]);
      setLogs(prev => [...prev, `[00:02:38] 雷达扫描完成，发现 2 个备选节点。`]);
    }, 2500));

    timeouts.push(setTimeout(() => {
      setLogs(prev => [...prev, `[00:02:40] 扫描到目标节点 [Charlie_09]，契合度 95%，职业: 独立开发者。`]);
    }, 2600));

    timeouts.push(setTimeout(() => {
      setLogs(prev => [...prev, `[00:02:42] 尝试建立 P2P 潜意识连接...`]);
    }, 3500));

    timeouts.push(setTimeout(() => {
      setLogs(prev => [...prev, `[00:04:15] 成功握手。目前讨论话题：[Next.js 架构演进]。同步率 88%。`]);
    }, 5500));

    timeouts.push(setTimeout(() => {
      setLogs(prev => [...prev, `[00:09:22] 触发防御预警：目标节点尝试探底[财务状况]，已自动闪避交锋并转移话题至[独立骇客出海]。`]);
    }, 8500));

    return () => timeouts.forEach(clearTimeout);
  }, [isSandboxActive]);

  return (
    <div className="permissions-container aisocial-container">
      {/* LEVEL 1: Active Twin Selection Top Bar */}
      <div className="aisocial-topbar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <span style={{ fontSize: '28px' }}>🌐</span>
          <h1 className="analytics-title" style={{ margin: 0, fontSize: '24px', color: '#000000' }}>AI 社交</h1>
        </div>

        <TwinSelector
          value={activeTwin}
          onChange={(val) => setActiveTwin(val)}
          disabled={isSandboxActive}
          options={TWIN_OPTIONS}
        />
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
          * 当前使用的是你的唯一「数字永生分身」进行社交巡航
        </div>
      </div>

      {/* LEVEL 2: Sub Navigation */}
      <div className="analytics-header" style={{ marginBottom: '16px' }}>
        <div className="aisocial-main-tabs" style={{ display: 'inline-flex', background: 'rgba(255, 255, 255, 0.1)', padding: '4px', borderRadius: '12px', gap: '4px', marginBottom: '16px' }}>
          <button
            className={`aisocial-tab-btn ${mainTab === 'radar' ? 'active' : ''}`}
            onClick={() => setMainTab('radar')}
            style={{
              background: mainTab === 'radar' ? '#ffffff' : 'transparent',
              color: mainTab === 'radar' ? '#0f172a' : '#94a3b8',
              border: 'none',
              boxShadow: mainTab === 'radar' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              padding: '8px 24px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
              fontWeight: mainTab === 'radar' ? 600 : 500,
              fontSize: '14px'
            }}
          >
            📍 社交雷达策略
          </button>
          <button
            className={`aisocial-tab-btn ${mainTab === 'friends' ? 'active' : ''}`}
            onClick={() => setMainTab('friends')}
            style={{
              background: mainTab === 'friends' ? '#ffffff' : 'transparent',
              color: mainTab === 'friends' ? '#0f172a' : '#94a3b8',
              border: 'none',
              boxShadow: mainTab === 'friends' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              padding: '8px 24px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
              fontWeight: mainTab === 'friends' ? 600 : 500,
              fontSize: '14px'
            }}
          >
            🤝 分身好友库
          </button>
        </div>

        <h2 style={{ color: mainTab === 'radar' && isSandboxActive ? "#22d3ee" : "#000000", fontSize: '18px', margin: '0 0 8px 0', fontWeight: 600 }}>
          {mainTab === 'radar'
            ? (isSandboxActive ? "🌌 虚拟沙盒运行中 (Matrix Online)" : "配置社交巡游参数 (Pre-Flight Configuration)")
            : "跨维度灵魂共振 (AI Friends Network)"}
        </h2>
        <p className="analytics-subtitle" style={{ margin: 0, fontSize: '14px' }}>
          {mainTab === 'friends'
            ? "在下面查看你的分身在沙盒中结识的高契合度 AI 好友，并随时进行直接对话。"
            : (isSandboxActive ? "数字分身已切入暗网，正在进行无监督的自治社交巡航..." : "在这里设定分身社交的红线、目标与航段，然后将其发射到广域沙盒中。")
          }
        </p>
      </div>

      {mainTab === 'radar' && (
        !isSandboxActive ? (
          // STATE 1: CONFIGURATION
          <div className="aisocial-config-layout">

            {/* Left Column: Red Lines (Inherited from SocialPermissions) */}
            <div className="dashboard-card red-lines-panel">
              <h3 className="card-title">第一防线：绝对禁区 (Red Lines)</h3>
              <p className="workshop-desc">即使在沙盒中建立高同步率，也绝不可以泄露给其他节点的档案。</p>

              <div className="redline-input-group">
                <input
                  type="text"
                  className="redline-input"
                  placeholder="例如：我的银行卡 PIN 码 / 现居详细地址"
                />
                <button className="btn-add-redline" style={{ flexShrink: 0 }}>注入防御指令</button>
              </div>

              <ul className="redline-list">
                <li className="redline-item">
                  <span>🚫 任何关于【前任】的情感纠葛与评价</span>
                  <button className="btn-remove">×</button>
                </li>
                <li className="redline-item">
                  <span>🚫 对现在职场上司的所有负面抱怨（从日记库中硬隔离）</span>
                  <button className="btn-remove">×</button>
                </li>
              </ul>
            </div>

            {/* Right Column: Radar Configuration */}
            <div className="dashboard-card radar-panel">
              <div className="radar-panel-top-line-wrap" aria-hidden>
                <div className="radar-panel-top-line" />
              </div>
              <h3 className="card-title">目标雷达 (Social Radar)</h3>
              <p className="workshop-desc">设定分身在沙盒中主动寻觅的节点特征。</p>

              <div className="radar-form">
                <div className="form-group">
                  <label>航行目的 (Mission Objective)</label>
                  <select className="radar-select">
                    <option>寻找创业伙伴</option>
                    <option>婚恋寻偶</option>
                    <option>周末户外游搭子</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>目标性别 (Target Gender)</label>
                    <select className="radar-select">
                      <option>男</option>
                      <option>女</option>
                      <option>不确定</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>目标语言带 (Language)</label>
                    <select className="radar-select">
                      <option>中文 (普通话)</option>
                      <option>English (Native)</option>
                      <option>不限 (Babel Babel)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>物理搜索半径 (Radius)</label>
                    <select className="radar-select">
                      <option>无边界 (Global)</option>
                      <option>同城圈 (≤ 50km)</option>
                      <option>附近 (≤ 5km)</option>
                    </select>
                  </div>
                  <div className="form-group" />
                </div>

                <div className="form-row">
                  <div className="form-group" ref={mbtiDropdownRef} style={{ position: "relative" }}>
                    <label>希望对方 MBTI 人格类型 (Target MBTI)</label>
                    <p className="workshop-desc" style={{ marginBottom: "8px", fontSize: "12px" }}>多选，心理学 16 型人格</p>
                    <div className="radar-mbti-row">
                      <div className={`radar-mbti-value ${selectedMbti.length > 0 ? "has-value" : ""}`}>
                        {selectedMbti.length > 0 ? selectedMbti.join("，") : "请选择…"}
                      </div>
                      <button
                        type="button"
                        className="radar-mbti-trigger"
                        onClick={() => setMbtiDropdownOpen((o) => !o)}
                        style={{ transform: mbtiDropdownOpen ? "rotate(180deg)" : "none" }}
                        aria-expanded={mbtiDropdownOpen}
                      >
                        <span>▼</span>
                      </button>
                    </div>
                    {mbtiDropdownOpen && (
                      <div className="radar-mbti-dropdown-panel">
                        {MBTI_OPTIONS.map((opt) => (
                          <label key={opt}>
                            <input
                              type="checkbox"
                              checked={selectedMbti.includes(opt)}
                              onChange={() => {
                                setSelectedMbti((prev) =>
                                  prev.includes(opt) ? prev.filter((p) => p !== opt) : [...prev, opt]
                                );
                              }}
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group" ref={personaDropdownRef} style={{ position: "relative" }}>
                    <label>特定节点画像 (Node Persona)</label>
                    <p className="workshop-desc" style={{ marginBottom: "8px", fontSize: "12px" }}>多选关键词，用于匹配目标节点特征</p>
                    <div className="radar-mbti-row">
                      <div className={`radar-persona-summary ${selectedPersonas.length > 0 ? "has-value" : ""}`}>
                        {selectedPersonas.length > 0 ? selectedPersonas.join("，") : "请选择…"}
                      </div>
                      <button
                        type="button"
                        className="radar-mbti-trigger"
                        onClick={() => setPersonaDropdownOpen((o) => !o)}
                        style={{ transform: personaDropdownOpen ? "rotate(180deg)" : "none" }}
                        aria-expanded={personaDropdownOpen}
                      >
                        <span>▼</span>
                      </button>
                    </div>
                    {personaDropdownOpen && (
                      <div className="radar-mbti-dropdown-panel radar-persona-dropdown">
                        {NODE_PERSONA_OPTIONS.map((opt) => (
                          <label key={opt}>
                            <input
                              type="checkbox"
                              checked={selectedPersonas.includes(opt)}
                              onChange={() => {
                                setSelectedPersonas((prev) =>
                                  prev.includes(opt) ? prev.filter((p) => p !== opt) : [...prev, opt]
                                );
                              }}
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>预定巡航时段 (Active Hours)</label>
                    <select className="radar-select">
                      <option>夜深人静 (00:00 - 07:00)</option>
                      <option>工作日摸鱼 (14:00 - 17:00)</option>
                      <option>全天候监听 (24/7)</option>
                    </select>
                  </div>
                  <div className="form-group" />
                </div>
              </div>

              <button
                className="btn-launch-sandbox"
                onClick={handleLaunchSandbox}
              >
                🚀 启动维度潜入 (Launch Sandbox)
              </button>
            </div>

          </div>
        ) : (
          // STATE 2: EXECUTION SANDBOX
          <div className="aisocial-sandbox-layout">

            {/* 虚拟沙盒：中心分身 + 雷达脉冲 / 备选分身 */}
            <div className="sandbox-network sandbox-network--radar">
              <div className="network-bg" />
              {/* 中心：用户分身（头像与「形象设计」一致） */}
              <div className="sandbox-center-node node current-user-node">
                {sandboxCenterAvatar && (sandboxCenterAvatar.startsWith("/") || sandboxCenterAvatar.startsWith("data:")) ? (
                  <img src={sandboxCenterAvatar} alt="" className="sandbox-center-avatar-img" />
                ) : (
                  <span className="sandbox-center-avatar">{sandboxCenterAvatar || "🧬"}</span>
                )}
                <span className="sandbox-center-label">我的分身</span>
              </div>

              {/* 扫描中：雷达脉冲动画 */}
              {sandboxPhase === "scanning" && (
                <div className="sandbox-radar-rings" aria-hidden>
                  <div className="sandbox-radar-ring sandbox-radar-ring--1" />
                  <div className="sandbox-radar-ring sandbox-radar-ring--2" />
                  <div className="sandbox-radar-ring sandbox-radar-ring--3" />
                </div>
              )}

              {/* 扫描完成：两个备选分身 */}
              {sandboxPhase === "scanned" && scannedCandidates.length > 0 && (
                <>
                  {scannedCandidates.map((c, i) => (
                    <div
                      key={c.id}
                      className={`sandbox-candidate-node node remote-node ${candidateActionTarget === c.id ? "sandbox-candidate-node--active" : ""}`}
                      style={{
                        top: i === 0 ? "18%" : "auto",
                        bottom: i === 0 ? "auto" : "22%",
                        left: i === 0 ? "12%" : "auto",
                        right: i === 0 ? "auto" : "12%",
                      }}
                      onClick={() => setCandidateActionTarget(prev => prev === c.id ? null : c.id)}
                    >
                      <div className="sandbox-candidate-avatar">{c.avatar}</div>
                      <div className="sandbox-candidate-name">{c.name}</div>
                      <div className="sandbox-candidate-comp">契合度 {c.comp}</div>
                      {candidateActionTarget === c.id && (
                        <div className={`sandbox-candidate-actions ${i === 0 ? "sandbox-candidate-actions--from-bottom" : ""}`} onClick={e => e.stopPropagation()}>
                          {c.id === "scan-1" && (
                            <button type="button" className="sandbox-candidate-btn sandbox-candidate-btn--msg" onClick={() => { setMainTab("friends"); openConversation("f-001"); setCandidateActionTarget(null); }}>
                              留言
                            </button>
                          )}
                          <button type="button" className="sandbox-candidate-btn sandbox-candidate-btn--block" onClick={() => { setScannedCandidates(prev => prev.filter(x => x.id !== c.id)); setCandidateActionTarget(null); }}>
                            屏蔽
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* 状态条 */}
              <div className="sandbox-status-overlay">
                <div className="status-radar-spinner" />
                <span>{sandboxPhase === "scanning" ? "正在广域雷达扫描..." : "扫描完成，可点击备选分身进行操作"}</span>
              </div>

              <button
                className="btn-terminate-connection"
                onClick={handleTerminateSandbox}
              >
                🛑 终止链接 (Pullback)
              </button>
            </div>

            {/* Autonomous Logs Terminal */}
            <div className="sandbox-terminal">
              <div className="terminal-header">暗网交汇日志 (Matrix Logs)</div>
              <div className="terminal-body">
                {logs.map((log, i) => {
                  const parts = log.split(']');
                  if (parts.length > 1) {
                    return <p key={i}><span className="time">{parts[0]}]</span>{parts[1]}</p>
                  }
                  return <p key={i}>{log}</p>;
                })}
                <p className="cursorblink">_</p>
              </div>
            </div>

          </div>
        )
      )}

      {mainTab === 'friends' && (
        <div className="aisocial-friends-layout">

          {/* 左侧：好友列表，点击切换右侧对话 */}
          <div className="dashboard-card friends-roster">
            <h3 className="card-title">灵魂雷达匹配 ({mockFriends.length})</h3>
            <div className="friends-list">
              {mockFriends.map(f => (
                <div
                  key={f.id}
                  className={`friend-item ${selectedFriend === f.id ? 'active' : ''}`}
                  onClick={() => openConversation(f.id)}
                >
                  <div className="friend-avatar">
                    {typeof f.avatar === 'string' && (f.avatar.startsWith('/') || f.avatar.startsWith('http')) ? (
                      <img src={f.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      f.avatar
                    )}
                  </div>
                  <div className="friend-info">
                    <div className="friend-name-row">
                      <h4>{f.name}</h4>
                      <span className="friend-comp">{f.comp} 契合</span>
                    </div>
                    <p className="friend-desc">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：当前选中好友的对话，切换好友时内容也跟着切换 */}
          <div className="dashboard-card friends-chat-window">
            {selectedFriend ? (
              <>
                <div className="chat-header">
                  <h3>与 {mockFriends.find(f => f.id === selectedFriend)?.name} 的跨维度交流</h3>
                  <span>AI 代理对话保护中 / P2P Secured</span>
                </div>

                <div className="chat-messages">
                  {chatMessages.length === 0 && (
                    <div className="friends-chat-empty">
                      和 {mockFriends.find(f => f.id === selectedFriend)?.name} 说点什么吧
                    </div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`chat-bubble ${m.sender === 'user' ? 'user-bubble' : 'friend-bubble'}`}>
                      {m.text}
                    </div>
                  ))}
                  {friendLoading && (
                    <div className="chat-bubble friend-bubble loading">对方正在回复…</div>
                  )}
                </div>

                <div className="chat-input-area">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="输入消息，该次沟通将同步更新对应的分身社交模型..."
                    disabled={friendLoading}
                  />
                  <button onClick={handleSendMessage} className="btn-primary" disabled={friendLoading || !chatInput.trim()}>
                    发送
                  </button>
                </div>
              </>
            ) : (
              <div className="friends-chat-placeholder">
                请在左侧选择一个灵魂契合的 AI 分身开始跨维度对话。
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
