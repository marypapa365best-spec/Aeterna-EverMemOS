import React, { useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

interface TwinStudioProps {
  onNavigateToWorkshop?: () => void;
  onNavigateToMemoryVault?: () => void;
}

export const TwinStudio: React.FC<TwinStudioProps> = ({ onNavigateToWorkshop, onNavigateToMemoryVault }) => {
  // Main Studio State
  const [twins, setTwins] = useState([
    { id: "t-001", name: "工作分身 (Evermind)", desc: "严谨 / 效率优选", avatar: "👩🏻‍💻", purpose: "work" as "work" | "social" },
    { id: "t-002", name: "娱乐分身 (Chill)", desc: "幽默 / 电影达人", avatar: "😎", purpose: "social" as "work" | "social" }
  ]);
  const [activeTwinId, setActiveTwinId] = useState("t-001");
  const [studioTab, setStudioTab] = useState<"dashboard" | "appearance" | "personality" | "skill" | "memory">("dashboard");
  // New state for twin purpose (social or work)
  const [twinPurpose, setTwinPurpose] = useState<'social' | 'work'>('work');
  // State to control purpose selection modal visibility
  const [showPurposeModal, setShowPurposeModal] = useState(false);

  const activeTwin = twins.find(t => t.id === activeTwinId) || twins[0];

  // Avatar Engine State
  const [avatarTab, setAvatarTab] = useState<"preset" | "upload" | "prompt">("preset");
  const memojiPresets = [
    "/avatars/memoji/1.png",
    "/avatars/memoji/2.png",
    "/avatars/memoji/3.png",
    "/avatars/memoji/4.png",
    "/avatars/memoji/5.png",
    "/avatars/memoji/6.png",
    "/avatars/memoji/7.png",
    "/avatars/memoji/8.png",
  ];
  const [selectedPreset, setSelectedPreset] = useState(memojiPresets[1]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Soul Copy State (Linked to Personality Wizard Levels)
  const [selectedSouls, setSelectedSouls] = useState<number[]>([1, 2, 3]);

  const toggleSoul = (levelId: number) => {
    setSelectedSouls(prev =>
      prev.includes(levelId)
        ? prev.filter(id => id !== levelId)
        : [...prev, levelId]
    );
  };

  // Twin Specific Skills State
  const [activeSkills, setActiveSkills] = useState([
    {
      id: "skill-001",
      title: "智能邮件代笔",
      desc: "允许分身阅读收件箱并草拟防骚扰回复",
      isActive: false
    },
    {
      id: "skill-002",
      title: "日程守卫者",
      desc: "允许分身查看日历，并代替您拒绝冲突的会议",
      isActive: true
    },
    {
      id: "skill-003",
      title: "社交媒体观察员",
      desc: "根据您今日的情绪参数，自动在推特发布一条心境更新",
      isActive: false
    }
  ]);

  const toggleSkill = (id: string) => {
    setActiveSkills(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const deleteSkill = (id: string) => {
    setActiveSkills(prev => prev.filter(s => s.id !== id));
  };

  const handleSkillDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("dragSkillIndex", index.toString());
  };

  const handleSkillDrop = (e: React.DragEvent, dropIndex: number) => {
    const dragIndex = parseInt(e.dataTransfer.getData("dragSkillIndex"));
    if (isNaN(dragIndex) || dragIndex === dropIndex) return;

    const newSkills = [...activeSkills];
    const [draggedItem] = newSkills.splice(dragIndex, 1);
    newSkills.splice(dropIndex, 0, draggedItem);
    setActiveSkills(newSkills);
  };

  // Twin Specific Memory Fragments (Mock)
  const [activeMemories, setActiveMemories] = useState([
    {
      id: "m-001",
      date: "2023-10-14",
      content: "第一次在东京看到了真实的雪，那种寂静的光影深深印在脑海里。",
      tags: ["#Travel", "#Winter", "#Aesthetic"],
      type: "text",
      isActive: true
    },
    {
      id: "m-003",
      date: "2024-05-20",
      content: "《给未来的自己》音频录音。长达 45 分钟的内心独白。",
      tags: ["#Voice", "#Reflection"],
      type: "audio",
      isActive: true
    }
  ]);

  const toggleMemory = (id: string) => {
    setActiveMemories(prev => prev.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m));
  };

  const deleteMemory = (id: string) => {
    setActiveMemories(prev => prev.filter(m => m.id !== id));
  };

  // Simplistic mock drag implementation
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("dragIndex", index.toString());
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    const dragIndex = parseInt(e.dataTransfer.getData("dragIndex"));
    if (dragIndex === dropIndex) return;

    const newMemories = [...activeMemories];
    const [draggedItem] = newMemories.splice(dragIndex, 1);
    newMemories.splice(dropIndex, 0, draggedItem);
    setActiveMemories(newMemories);
  };

  // Voice Engine State
  const [isRecording, setIsRecording] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUploadedImage(dataUrl);
        // Sync to active twin
        setTwins(prev => prev.map(t => t.id === activeTwinId ? { ...t, avatar: dataUrl } : t));
      };
      reader.readAsDataURL(file);
    }
  };

  // Mock Data for Radar Chart
  const radarData = [
    { subject: '逻辑理性', A: 85, fullMark: 100 },
    { subject: '情感共鸣', A: 65, fullMark: 100 },
    { subject: '幽默活力', A: 90, fullMark: 100 },
    { subject: '处事果敢', A: 75, fullMark: 100 },
    { subject: '探索好奇', A: 88, fullMark: 100 },
    { subject: '言谈默契', A: 82, fullMark: 100 },
  ];

  return (
    <div className="studio-container">
      {/* Left Sidebar: Twin Roster */}
      <aside className="studio-roster">
        <h2 className="roster-title">我的分身</h2>
        <div className="roster-list">
          {twins.map(twin => (
            <div
              key={twin.id}
              className={`roster-card ${activeTwinId === twin.id ? "active" : ""}`}
              onClick={() => setActiveTwinId(twin.id)}
            >
              <div className="roster-avatar">
                {twin.avatar.includes('/') || twin.avatar.includes('data:') ? (
                  <img src={twin.avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  twin.avatar
                )}
              </div>
              <div className="roster-info">
                <h3>{twin.name} <span className={`twin-badge twin-badge-${twin.purpose}`}>{twin.purpose === 'work' ? '工作' : '社交'}</span></h3>
                <p>{twin.desc}</p>
              </div>
            </div>
          ))}

          <button className="btn-create-twin" onClick={() => setShowPurposeModal(true)}>
            + 创建新分身
          </button>
        </div>
      </aside>

      {/* Right Content: Configurator Dashboard */}
      <main className="studio-configurator">
        <header className="config-header">
          <h1>分身养成中心 (Twin Growth Center)</h1>
          <div className="config-tabs">
            <button
              className={`config-tab ${studioTab === "dashboard" ? "active" : ""}`}
              onClick={() => setStudioTab("dashboard")}
            >
              📊 Dashboard
            </button>
            <button
              className={`config-tab ${studioTab === "appearance" ? "active" : ""}`}
              onClick={() => setStudioTab("appearance")}
            >
              👁️ 形象设计
            </button>
            <button
              className={`config-tab ${studioTab === "personality" ? "active" : ""}`}
              onClick={() => setStudioTab("personality")}
            >
              🧠 灵魂注入
            </button>
            <button
              className={`config-tab ${studioTab === "memory" ? "active" : ""}`}
              onClick={() => setStudioTab("memory")}
            >
              📚 记忆碎片注入
            </button>
            {activeTwin.purpose !== 'social' ? (
              <button
                className={`config-tab ${studioTab === "skill" ? "active" : ""}`}
                onClick={() => setStudioTab("skill")}
              >
                🛠️ Skill配置
              </button>
            ) : (
              <button className="config-tab disabled" title="真实的灵魂不需要冰冷的工具链。社交分身不支持挂载Skill。">
                <span style={{ opacity: 0.5 }}>🛠️ <s>Skill配置</s></span>
              </button>
            )}
          </div>
        </header>

        <div className="config-body">
          {studioTab === "dashboard" && (
            <div className="config-section dashboard-section">
              <div className="dashboard-top-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

                {/* Life Ring: Brain Sync Rate */}
                <div className="workshop-card life-ring-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                  <h3 className="card-title" style={{ alignSelf: 'flex-start', marginBottom: '24px' }}>大脑同步率</h3>
                  <div className="life-ring-container">
                    <svg viewBox="0 0 100 100" className="life-ring-svg">
                      <circle cx="50" cy="50" r="45" className="life-ring-bg" />
                      <circle cx="50" cy="50" r="45" className="life-ring-progress" strokeDasharray="283" strokeDashoffset="28" />
                    </svg>
                    <div className="life-ring-text">
                      <span className="sync-value">90</span>
                      <span className="sync-unit">%</span>
                    </div>
                  </div>
                  <div className="life-ring-status" style={{ marginTop: '24px', color: '#10b981', fontSize: '14px', fontWeight: 500 }}>
                    状态：高度共联
                  </div>
                </div>

                {/* Hexagon Radar Chart */}
                <div className="workshop-card radar-chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 className="card-title" style={{ marginBottom: '16px' }}>认知维度矩阵</h3>
                  <div style={{ flex: 1, minHeight: '250px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name={activeTwin.name} dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Evolution Milestones */}
              <div className="workshop-card milestones-card">
                <h3 className="card-title" style={{ marginBottom: '24px' }}>进化里程碑 (Evolution Milestones)</h3>
                <div className="milestones-timeline">
                  <div className="milestone-item completed">
                    <div className="milestone-node"></div>
                    <div className="milestone-label">胚胎</div>
                    <div className="milestone-date">09/21</div>
                  </div>
                  <div className="milestone-line active"></div>

                  <div className="milestone-item completed">
                    <div className="milestone-node"></div>
                    <div className="milestone-label">初级镜像</div>
                    <div className="milestone-date">10/05</div>
                  </div>
                  <div className="milestone-line active"></div>

                  <div className="milestone-item current">
                    <div className="milestone-node breathing"></div>
                    <div className="milestone-label">默契伴侣</div>
                    <div className="milestone-date">进行中</div>
                  </div>
                  <div className="milestone-line inactive"></div>

                  <div className="milestone-item pending">
                    <div className="milestone-node"></div>
                    <div className="milestone-label">数字双生</div>
                    <div className="milestone-date">未知</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {studioTab === "appearance" && (
            <div className="config-section">
              <div className="workshop-card avatar-engine-card" style={{ marginBottom: "20px" }}>
                <div className="avatar-engine-layout">
                  <div className="avatar-display">
                    <div className={`avatar-hologram ${avatarTab === 'prompt' ? 'generating' : ''}`}>
                      <div className="avatar-scanline"></div>
                      {avatarTab === "preset" && (
                        <div className="avatar-placeholder type-preset" style={{ padding: 0, overflow: 'hidden', width: '100%', height: '100%' }}>
                          <img src={selectedPreset} alt="Selected preset" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      {avatarTab === "upload" && (
                        uploadedImage ? (
                          <img src={uploadedImage} alt="Uploaded Avatar preview" className="avatar-preview-img" />
                        ) : (
                          <div className="avatar-placeholder type-upload">🖼️</div>
                        )
                      )}
                      {avatarTab === "prompt" && <div className="avatar-placeholder type-prompt">✨</div>}
                    </div>
                  </div>

                  <div className="avatar-controls">
                    <h3 className="card-title" style={{ marginBottom: "12px" }}>外貌塑型 (Avatar Engine)</h3>
                    <div className="avatar-tabs">
                      <button
                        className={`avatar-tab ${avatarTab === "preset" ? "active" : ""}`}
                        onClick={() => setAvatarTab("preset")}
                      >预设脸型</button>
                      <button
                        className={`avatar-tab ${avatarTab === "upload" ? "active" : ""}`}
                        onClick={() => setAvatarTab("upload")}
                      >照片克隆</button>
                      <button
                        className={`avatar-tab ${avatarTab === "prompt" ? "active" : ""}`}
                        onClick={() => setAvatarTab("prompt")}
                      >AI 提示词</button>
                    </div>

                    <div className="avatar-tab-content" style={{ minHeight: "130px", padding: "16px" }}>
                      {avatarTab === "preset" && (
                        <div className="preset-grid preset-memoji-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                          {memojiPresets.map(path => (
                            <div
                              key={path}
                              className={`preset-item memoji-item ${selectedPreset === path ? 'active' : ''}`}
                              onClick={() => {
                                setSelectedPreset(path);
                                setTwins(prev => prev.map(t => t.id === activeTwinId ? { ...t, avatar: path } : t));
                              }}
                              style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px' }}
                            >
                              <img src={path} alt="Memoji preset" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                        </div>
                      )}
                      {avatarTab === "upload" && (
                        <div className="upload-zone">
                          <span className="upload-icon">📸</span>
                          <p>点击或拖拽上传清晰的正面照片</p>
                          <label className="btn-upload-avatar">
                            选择文件
                            <input type="file" style={{ display: "none" }} accept="image/*" onChange={handleImageUpload} />
                          </label>
                        </div>
                      )}
                      {avatarTab === "prompt" && (
                        <div className="prompt-zone">
                          <textarea
                            className="prompt-input"
                            placeholder="例如：赛博朋克风格的亚洲女性，留着蓝色短发..."
                            style={{ minHeight: "60px" }}
                          ></textarea>
                          <button className="btn-generate-avatar">✨ 开始渲染</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="workshop-card" style={{ marginBottom: "20px" }}>
                <h3 className="card-title">声音与语调克隆</h3>
                <p className="workshop-desc">录制一段 1 分钟的语音，让分身提取您的音色特征与说话节奏。</p>

                <div className="voice-visualizer">
                  {isRecording ? (
                    <div className="wave-container active">
                      <div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div>
                    </div>
                  ) : (
                    <div className="wave-container">
                      <div className="wave-bar flat"></div>
                    </div>
                  )}
                  <button
                    className={`btn-record ${isRecording ? 'recording' : ''}`}
                    onClick={() => setIsRecording(!isRecording)}
                  >
                    {isRecording ? "停止录制 (Stop)" : "开始脉冲扫描 (Record)"}
                  </button>
                </div>
              </div>
              {/* Setup Wizard Footer */}
              <div className="wizard-footer" style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                <button
                  className="btn-launch-sandbox"
                  style={{ width: 'auto', padding: '12px 32px' }}
                  onClick={() => setStudioTab("personality")}
                >
                  保存并下一步 (灵魂注入) ➔
                </button>
              </div>
            </div>
          )}

          {studioTab === "personality" && (
            <div className="config-section">
              <div className="workshop-card">
                <h3 className="card-title">灵魂源泉绑定 (Soul Bindings)</h3>
                <p className="workshop-desc">选择要将哪些在「灵魂拷贝」中提取的记忆核心灌输给当前分身。</p>

                <div className="soul-binding-list">
                  {[
                    { id: 1, title: "Level 1: 基础属性与人口学特征", desc: "姓名、性别、血型与基础身份认知。" },
                    { id: 2, title: "Level 2: 原生环境与童年碎片", desc: "原生家庭背景记录，带有早年的安全感偏好。" },
                    { id: 3, title: "Level 3: 创伤、遗憾与高光时刻", desc: "情感波折记录，这会让分身在聊天时更具共情能力。" },
                    { id: 4, title: "Level 4: 价值观与道德边界", desc: "决定了分身的批判性思维和对待争议问题的态度。" },
                    { id: 5, title: "Level 5: 知识体系与技能图谱", desc: "专业词汇体系与解决问题的逻辑范式。" },
                    { id: 6, title: "Level 6: 潜意识与梦境", desc: "最深层的意识流，影响分身的幽默感与艺术直觉。" }
                  ].map(soul => {
                    const isSelected = selectedSouls.includes(soul.id);
                    return (
                      <div
                        key={soul.id}
                        className={`soul-binding-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSoul(soul.id)}
                      >
                        <div className="soul-binding-checkbox">
                          {isSelected && <span className="checkmark">✓</span>}
                        </div>
                        <div className="soul-binding-info">
                          <h4>{soul.title}</h4>
                          <p>{soul.desc}</p>
                        </div>
                        {isSelected && <div className="soul-binding-badge">已注入</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Setup Wizard Footer */}
              <div className="wizard-footer" style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                <button
                  className="btn-launch-sandbox"
                  style={{ width: 'auto', padding: '12px 32px' }}
                  onClick={() => setStudioTab("memory")}
                >
                  保存并下一步 (记忆碎片) ➔
                </button>
              </div>
            </div>
          )}

          {studioTab === "memory" && (
            <div className="config-section">
              <div className="workshop-card" style={{ marginBottom: "0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                  <div>
                    <h3 className="card-title" style={{ marginBottom: "6px" }}>已注入碎片 (Active Memories)</h3>
                    <p className="workshop-desc" style={{ marginBottom: "0" }}>当前分身在运行时可以检索到的前置事件与过往档案。</p>
                  </div>
                  <button
                    className="btn-create-twin"
                    style={{ margin: 0, padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px" }}
                    onClick={onNavigateToMemoryVault}
                  >
                    <span>+</span> 添加更多记忆碎片
                  </button>
                </div>

                <div className="memory-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activeMemories.map((memory, index) => (
                    <div
                      key={memory.id}
                      className={`plugin-item memory-card-list-item ${!memory.isActive ? 'disabled' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, index)}
                      style={{
                        gap: '16px', position: 'relative',
                        opacity: memory.isActive ? 1 : 0.5, transition: 'all 0.2s'
                      }}
                    >
                      {/* Drag Handle */}
                      <div className="drag-handle" style={{ display: 'flex', alignItems: 'center', color: '#64748b', cursor: 'grab', fontSize: '20px' }}>
                        ⋮⋮
                      </div>

                      {/* Content Area */}
                      <div className="memory-content-area" style={{ flex: 1 }}>
                        <div className="memory-header" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <strong className={`memory-type type-${memory.type}`} style={{ fontSize: '15px', color: '#1e293b' }}>
                            {memory.type === "text" && "📝 文本"}
                            {memory.type === "file" && "📄 文档"}
                            {memory.type === "audio" && "🎤 录音"}
                          </strong>
                          <span className="memory-date" style={{ fontSize: '12px', color: '#64748b' }}>{memory.date}</span>
                        </div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '13px', lineHeight: '1.5', color: '#64748b' }}>{memory.content}</p>
                        <div className="memory-tags">
                          {memory.tags.map(tag => (
                            <span key={tag} className="tag" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', fontSize: '12px', padding: '2px 8px', borderRadius: '4px', marginRight: '6px' }}>{tag}</span>
                          ))}
                        </div>
                      </div>

                      {/* Actions Area */}
                      <div className="memory-actions-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', minWidth: '80px' }}>

                        <label className="toggle-switch" style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={memory.isActive}
                            onChange={() => toggleMemory(memory.id)}
                          />
                          <span className="toggle-slider"></span>
                        </label>

                        <button
                          onClick={() => deleteMemory(memory.id)}
                          style={{
                            background: 'transparent', border: 'none', color: '#ef4444',
                            cursor: 'pointer', fontSize: '18px', padding: '4px',
                            opacity: 0.7, transition: 'opacity 0.2s',
                            marginTop: '24px'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
                          title="删除记忆"
                        >
                          🗑️
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
              {/* Setup Wizard Footer */}
              <div className="wizard-footer" style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                <button
                  className="btn-launch-sandbox"
                  style={{ width: 'auto', padding: '12px 32px' }}
                  onClick={() => setStudioTab("skill")}
                >
                  保存并下一步 (Skill配置) ➔
                </button>
              </div>
            </div>
          )}

          {studioTab === "skill" && (
            <div className="config-section">
              <div className="workshop-card" style={{ marginBottom: "0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                  <div>
                    <h3 className="card-title" style={{ marginBottom: "6px" }}>已获技能 (Active Skills)</h3>
                    <p className="workshop-desc" style={{ marginBottom: "0" }}>控制当前分身可运行的现实世界业务能力。</p>
                  </div>
                  <button
                    className="btn-create-twin"
                    style={{ margin: 0, padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px" }}
                    onClick={onNavigateToWorkshop}
                  >
                    <span>+</span> 添加更多技能
                  </button>
                </div>

                <ul className="plugin-list">
                  {activeSkills.map((skill, index) => (
                    <li
                      key={skill.id}
                      className={`plugin-item ${!skill.isActive ? 'disabled' : ''}`}
                      draggable
                      onDragStart={(e) => handleSkillDragStart(e, index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleSkillDrop(e, index)}
                      style={{
                        display: 'flex', gap: '16px', position: 'relative',
                        opacity: skill.isActive ? 1 : 0.5, transition: 'all 0.2s', cursor: 'default'
                      }}
                    >
                      {/* Drag Handle */}
                      <div className="drag-handle" style={{ display: 'flex', alignItems: 'center', color: '#64748b', cursor: 'grab', fontSize: '20px' }}>
                        ⋮⋮
                      </div>

                      {/* Content Area */}
                      <div className="plugin-info" style={{ flex: 1, paddingRight: '20px' }}>
                        <strong style={{ fontSize: '15px', color: '#1e293b', marginBottom: '4px', display: 'block' }}>{skill.title}</strong>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>{skill.desc}</span>
                      </div>

                      {/* Actions Area */}
                      <div className="plugin-actions-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', minWidth: '80px' }}>

                        <label className="toggle-switch" style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={skill.isActive}
                            onChange={() => toggleSkill(skill.id)}
                          />
                          <span className="toggle-slider"></span>
                        </label>

                        <button
                          onClick={() => deleteSkill(skill.id)}
                          style={{
                            background: 'transparent', border: 'none', color: '#ef4444',
                            cursor: 'pointer', fontSize: '18px', padding: '4px',
                            opacity: 0.7, transition: 'opacity 0.2s',
                            marginTop: '12px'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
                          title="卸载技能"
                        >
                          🗑️
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Setup Wizard Final Footer */}
              <div className="wizard-footer" style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                <button
                  className="btn-launch-sandbox"
                  style={{ width: 'auto', padding: '12px 32px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}
                  onClick={() => alert(`成功更新数字分身配置！`)}
                >
                  ✅ 完成配置更新
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Purpose Selection Modal */}
      {showPurposeModal && (
        <div className="purpose-modal-overlay">
          <div className="purpose-modal">
            <header className="purpose-modal-header">
              <h2>选择分身用途 (Select Twin Purpose)</h2>
              <button className="btn-close-modal" onClick={() => setShowPurposeModal(false)}>×</button>
            </header>
            <p className="purpose-modal-desc">不同的用途将决定该分身拥有的配置能力与权限模型。</p>

            <div className="purpose-cards-container">
              <div
                className="purpose-card social-purpose"
                onClick={() => {
                  setTwins([...twins, { id: `t-00${twins.length + 1}`, name: "新社交分身", desc: "寻找情感共鸣", avatar: "💖", purpose: "social" }]);
                  setActiveTwinId(`t-00${twins.length + 1}`);
                  setStudioTab("appearance");
                  setShowPurposeModal(false);
                }}
              >
                <div className="purpose-icon">💖</div>
                <h3>生活社交分身</h3>
                <p>Social Twin</p>
                <ul className="purpose-features">
                  <li>✓ 强调个性与灵魂深度</li>
                  <li>✓ 注入私人记忆碎片</li>
                  <li>✗ 无法挂载外部工具 Skill</li>
                  <li>✓ 适合用于沙盒世界交友与陪伴</li>
                </ul>
                <div className="btn-select-purpose">选择此用途</div>
              </div>

              <div
                className="purpose-card work-purpose"
                onClick={() => {
                  setTwins([...twins, { id: `t-00${twins.length + 1}`, name: "新工作分身", desc: "挂载专业技能", avatar: "💼", purpose: "work" }]);
                  setActiveTwinId(`t-00${twins.length + 1}`);
                  setStudioTab("appearance");
                  setIsPurposeModalOpen(false);
                }}
              >
                <div className="purpose-icon">💼</div>
                <h3>工作 / 助理分身</h3>
                <p>Work & Utility Twin</p>
                <ul className="purpose-features">
                  <li>✓ 可挂载复杂的业务 Skill</li>
                  <li>✓ 拥有执行外部 API 的权限</li>
                  <li>✓ 适合用于高效处理特定任务</li>
                  <li>✓ 可在社交沙盒中寻找创业合伙人</li>
                </ul>
                <div className="btn-select-purpose">选择此用途</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
