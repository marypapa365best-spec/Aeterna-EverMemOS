import React, { useState, useEffect } from "react";
import { TwinSelector, TWIN_OPTIONS } from "./TwinSelector";

export const AISocialMaster: React.FC = () => {
  const [activeTwin, setActiveTwin] = useState("t-002"); // default to social twin
  const [mainTab, setMainTab] = useState<"radar" | "friends">("radar");
  const [isSandboxActive, setIsSandboxActive] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // ---- Friends Chat State ----
  const [selectedFriend, setSelectedFriend] = useState<string | null>("f-001");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "friend", text: string }[]>([
    { sender: "friend", text: "Hey! We matched in the sandbox. I'm Charlie_09, nice to meet you." },
    { sender: "user", text: "Hi Charlie! My twin said you're also a solo dev?" }
  ]);

  const mockFriends = [
    { id: "f-001", name: "Charlie_09", avatar: "👨‍💻", comp: "92%", desc: "独立开发者，热爱 Next.js 架构推演" },
    { id: "f-002", name: "Alice_X", avatar: "👩‍🎨", comp: "88%", desc: "数字游民，寻找周末露营搭子" },
    { id: "f-003", name: "Zen_Master", avatar: "🧘‍♂️", comp: "75%", desc: "每天冥想的极客，寻求精神探讨" }
  ];

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { sender: "user", text: chatInput }]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: "friend", text: "哈哈，太有共鸣了！我的分身之前也遇到过你说的类似情况。" }]);
    }, 1200);
  };

  // Simulation effect for Sandbox Terminal Logs
  useEffect(() => {
    if (!isSandboxActive) return;

    const initialLogs = [
      `[00:00:12] 初始化“虚拟沙盒”环境... 潜入成功。`,
      `[00:00:15] 载入红线防御策略 (封锁：财务状况、伴侣信息)。`,
      `[00:00:18] 开始根据目标雷达扫描匹配节点...`
    ];
    setLogs(initialLogs);

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    timeouts.push(setTimeout(() => {
      setLogs(prev => [...prev, `[00:02:40] 扫描到目标节点 [Charlie_09]，距离: 2.5km，职业: 独立开发者。`]);
    }, 2000));

    timeouts.push(setTimeout(() => {
      setLogs(prev => [...prev, `[00:02:42] 尝试建立 P2P 潜意识连接...`]);
    }, 3500));

    timeouts.push(setTimeout(() => {
      setLogs(prev => [...prev, `[00:04:15] 成功握手。目前讨论话题：[Next.js 架构演进]。同步率 88%。`]);
    }, 5500));

    timeouts.push(setTimeout(() => {
      setLogs(prev => [...prev, `[00:09:22] 触发防御预警：目标节点尝试探底[财务状况]，已自动闪避交锋并转移话题至[独立骇客出海]。`]);
    }, 8500));

    // Cleanup
    return () => timeouts.forEach(clearTimeout);
  }, [isSandboxActive]);

  return (
    <div className="permissions-container" style={{ maxWidth: '1200px' }}>
      {/* LEVEL 1: Active Twin Selection Top Bar */}
      <div className="aisocial-topbar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <span style={{ fontSize: '28px' }}>🌐</span>
          <h1 className="analytics-title" style={{ margin: 0, fontSize: '24px', color: '#000000' }}>AI 社交</h1>
        </div>

        <TwinSelector
          value={activeTwin}
          onChange={(val) => setActiveTwin(val)}
          disabled={isSandboxActive}
          options={TWIN_OPTIONS.filter(o => o.id === 't-002')}
        />
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px' }}>
          * 只允许“生活社交类分身”进入社交沙盒
        </div>
      </div>

      {/* LEVEL 2: Sub Navigation */}
      <div className="analytics-header" style={{ marginBottom: '24px' }}>
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
              <h3 className="card-title" style={{ color: "#f87171" }}>第一防线：绝对禁区 (Red Lines)</h3>
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
              <h3 className="card-title" style={{ color: "#c084fc" }}>目标雷达 (Social Radar)</h3>
              <p className="workshop-desc">设定分身在沙盒中主动寻觅的节点特征。</p>

              <div className="radar-form">
                <div className="form-group">
                  <label>航行目的 (Mission Objective)</label>
                  <select className="radar-select">
                    <option>寻找硅谷/独立开发创业伙伴</option>
                    <option>寻找精神契合的长期笔友</option>
                    <option>婚恋寻偶 (开启最高权限面容扫描)</option>
                    <option>周末旅行搭子 / 户外游同好</option>
                    <option>高强度游戏/电竞组排陪练</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>目标语言带 (Language)</label>
                    <select className="radar-select">
                      <option>中文 (普通话)</option>
                      <option>English (Native)</option>
                      <option>不限 (Babel Babel)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>物理搜索半径 (Radius)</label>
                    <select className="radar-select">
                      <option>无边界 (Global)</option>
                      <option>同城圈 (≤ 50km)</option>
                      <option>附近 (≤ 5km)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>特定节点画像 (Node Persona)</label>
                    <input type="text" className="radar-input" placeholder="输入职业或特征, 如：设计师, INFJ" defaultValue="工程师, 极客, 冥想者" />
                  </div>
                  <div className="form-group">
                    <label>预定巡航时段 (Active Hours)</label>
                    <select className="radar-select">
                      <option>夜深人静 (00:00 - 07:00)</option>
                      <option>工作日摸鱼 (14:00 - 17:00)</option>
                      <option>全天候监听 (24/7)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                className="btn-launch-sandbox"
                onClick={() => setIsSandboxActive(true)}
              >
                🚀 启动维度潜入 (Launch Sandbox)
              </button>
            </div>

          </div>
        ) : (
          // STATE 2: EXECUTION SANDBOX
          <div className="aisocial-sandbox-layout">

            {/* Network Node Graph Map placeholder */}
            <div className="sandbox-network" style={{ flex: '1.2' }}>
              <div className="network-bg"></div>
              <div className="node current-user-node" style={{ backgroundColor: '#22d3ee', boxShadow: '0 0 30px rgba(34,211,238,0.7)' }}>
                当前分身
              </div>
              <div className="node remote-node node-1">节点 [Alice_X]</div>
              <div className="node remote-node node-2" style={{ border: '2px solid #22d3ee', boxShadow: '0 0 15px rgba(34,211,238,0.4)' }}>目标 [Charlie_09]</div>
              <div className="network-line line-1"></div>
              <div className="network-line line-2" style={{ borderTop: '2px dashed #22d3ee', opacity: '0.8' }}></div>

              {/* Status Overlay */}
              <div className="sandbox-status-overlay">
                <div className="status-radar-spinner"></div>
                <span>正在广域广播信号...</span>
              </div>

              <button
                className="btn-terminate-connection"
                onClick={() => setIsSandboxActive(false)}
              >
                🛑 终止链接 (Pullback)
              </button>
            </div>

            {/* Autonomous Logs Terminal */}
            <div className="sandbox-terminal" style={{ flex: '1' }}>
              <div className="terminal-header" style={{ color: '#22d3ee', borderBottomColor: 'rgba(34,211,238,0.3)' }}>暗网交汇日志 (Matrix Logs)</div>
              <div className="terminal-body" style={{ color: '#bae6fd' }}>
                {logs.map((log, i) => {
                  // simple hack to style timestamps
                  const parts = log.split(']');
                  if (parts.length > 1) {
                    return <p key={i}><span className="time" style={{ color: '#7dd3fc' }}>{parts[0]}]</span>{parts[1]}</p>
                  }
                  return <p key={i}>{log}</p>;
                })}
                <p className="cursorblink" style={{ color: '#22d3ee' }}>_</p>
              </div>
            </div>

          </div>
        )
      )}

      {mainTab === 'friends' && (
        <div className="aisocial-friends-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', height: '600px' }}>

          {/* Friends Roster */}
          <div className="dashboard-card friends-roster" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 className="card-title" style={{ color: '#c084fc', marginBottom: '16px' }}>灵魂雷达匹配 ({mockFriends.length})</h3>
            <div className="friends-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
              {mockFriends.map(f => (
                <div
                  key={f.id}
                  className={`friend-item ${selectedFriend === f.id ? 'active' : ''}`}
                  onClick={() => setSelectedFriend(f.id)}
                  style={{
                    display: 'flex', gap: '12px', padding: '16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                    background: selectedFriend === f.id ? 'rgba(139, 92, 246, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                    border: `1px solid ${selectedFriend === f.id ? '#8b5cf6' : 'transparent'}`
                  }}
                >
                  <div className="friend-avatar" style={{ fontSize: '28px', background: '#334155', height: '48px', width: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f.avatar}</div>
                  <div className="friend-info" style={{ flex: 1 }}>
                    <div className="friend-name-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '15px' }}>{f.name}</h4>
                      <span className="friend-comp" style={{ fontSize: '12px', color: '#22d3ee', background: 'rgba(34, 211, 238, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>{f.comp} 契合</span>
                    </div>
                    <p className="friend-desc" style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.4, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div className="dashboard-card friends-chat-window" style={{ display: 'flex', flexDirection: 'column' }}>
            {selectedFriend ? (
              <>
                <div className="chat-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: '#e2e8f0' }}>与 {mockFriends.find(f => f.id === selectedFriend)?.name} 的跨维度交流</h3>
                  <span style={{ fontSize: '12px', color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', padding: '4px 8px', borderRadius: '12px' }}>AI 代理对话保护中 / P2P Secured</span>
                </div>

                <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px', paddingRight: '8px' }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`chat-bubble ${m.sender === 'user' ? 'user-bubble' : 'friend-bubble'}`} style={{
                      alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                      backgroundColor: m.sender === 'user' ? '#8b5cf6' : '#1e293b',
                      color: '#f8fafc',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      borderBottomRightRadius: m.sender === 'user' ? '4px' : '16px',
                      borderBottomLeftRadius: m.sender === 'friend' ? '4px' : '16px',
                      maxWidth: '75%',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      lineHeight: 1.5,
                      fontSize: '14px'
                    }}>
                      {m.text}
                    </div>
                  ))}
                </div>

                <div className="chat-input-area" style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="输入消息，该次沟通将同步更新对应的分身社交模型..."
                    style={{ flex: 1, padding: '14px 16px', borderRadius: '12px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '14px', outline: 'none' }}
                  />
                  <button onClick={handleSendMessage} className="btn-primary" style={{ padding: '0 24px', borderRadius: '12px' }}>发送 / 发射节点</button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                请在左侧选择一个灵魂契合的 AI 分身开始跨维度对话。
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
