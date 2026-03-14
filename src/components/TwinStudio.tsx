import React, { useEffect, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { generateAvatarWithGemini } from "../api/twinApi";

interface TwinStudioProps {
  onNavigateToWorkshop?: () => void;
  onNavigateToMemoryVault?: () => void;
}

export const TwinStudio: React.FC<TwinStudioProps> = ({ onNavigateToWorkshop, onNavigateToMemoryVault }) => {
  // Main Studio State：聚焦一个本体分身
  const [twins, setTwins] = useState([
    { id: "t-001", name: "数字永生分身", desc: "基于你全部人生记忆的一体化分身", avatar: "🧬" }
  ]);
  const [activeTwinId, setActiveTwinId] = useState("t-001");
  const [studioTab, setStudioTab] = useState<"dashboard" | "appearance" | "personality" | "memory">("dashboard");

  // 与 EvolutionChat 共享的大脑同步率，读取 localStorage，默认 55%
  const loadSyncRate = () => {
    try {
      const raw = window.localStorage.getItem("twin_sync_rate");
      const n = raw != null ? Number(raw) : NaN;
      if (!Number.isNaN(n) && n >= 0 && n <= 100) return n;
    } catch {/* ignore */}
    return 55;
  };
  const [syncRate, setSyncRate] = useState<number>(() => loadSyncRate());

  // 认知维度矩阵（从 localStorage.twin_cognitive_profile 读取）
  type CogDim =
    | "emotional_stability"
    | "social_energy"
    | "openness_imagination"
    | "structure_execution"
    | "value_boundary"
    | "self_reflection";

  const loadCognitiveProfile = () => {
    try {
      const raw = window.localStorage.getItem("twin_cognitive_profile");
      if (!raw) return null;
      const data = JSON.parse(raw) as Partial<Record<CogDim, number>>;
      return data;
    } catch {
      return null;
    }
  };
  const [cogProfile, setCogProfile] = useState<Partial<Record<CogDim, number>> | null>(() => loadCognitiveProfile());

  // 统计：已完成的人格关卡数量（本地以是否存在 twin_soul_level_X_keywords 为准）
  const computeCompletedLevels = () => {
    let count = 0;
    try {
      for (let level = 1; level <= 6; level++) {
        const raw = window.localStorage.getItem(`twin_soul_level_${level}_keywords`);
        if (!raw) continue;
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object" && Object.keys(obj).length > 0) {
          count++;
        }
      }
    } catch {
      // ignore
    }
    return count;
  };

  const [completedLevels, setCompletedLevels] = useState<number>(() => computeCompletedLevels());

  // 统计：已同步到 EverMemOS 且未本地删除的记忆碎片数量
  const computeSyncedVaultCount = () => {
    try {
      const raw = window.localStorage.getItem("twin_memory_vault");
      if (!raw) return 0;
      const vault = JSON.parse(raw) as {
        messageId?: string;
        deletedLocally?: boolean;
      }[];
      if (!Array.isArray(vault)) return 0;
      return vault.filter((m) => m.messageId && !m.deletedLocally).length;
    } catch {
      return 0;
    }
  };

  const [syncedVaultCount, setSyncedVaultCount] = useState<number>(() => computeSyncedVaultCount());

  // 进化阶段：embryo -> mirror -> partner -> twin
  type EvolutionStage = "embryo" | "mirror" | "partner" | "twin";

  const getEvolutionStage = (
    levels: number,
    vaultCount: number,
    rate: number
  ): EvolutionStage => {
    const levelsScore = (levels / 6) * 40;
    const cappedVault = Math.min(vaultCount, 30);
    const vaultScore = (cappedVault / 30) * 30;
    const syncScore = (rate / 100) * 30;
    const evoScore = levelsScore + vaultScore + syncScore;

    if (evoScore < 25) {
      return "embryo";
    }

    if (evoScore < 55) {
      if (levels >= 2 && vaultCount >= 1) {
        return "mirror";
      }
      return "embryo";
    }

    if (evoScore < 80) {
      if (levels >= 4 && vaultCount >= 5 && rate >= 60) {
        return "partner";
      }
      return "mirror";
    }

    if (levels === 6 && vaultCount >= 15 && rate >= 80) {
      return "twin";
    }

    return "partner";
  };

  const [evoStage, setEvoStage] = useState<EvolutionStage>(() =>
    getEvolutionStage(completedLevels, syncedVaultCount, syncRate)
  );

  // 当同步率或本地数据更新时，重新计算阶段
  useEffect(() => {
    const levels = computeCompletedLevels();
    const vault = computeSyncedVaultCount();
    setCompletedLevels(levels);
    setSyncedVaultCount(vault);
    setEvoStage(getEvolutionStage(levels, vault, syncRate));
  }, [syncRate]);

  const activeTwin = twins.find(t => t.id === activeTwinId) || twins[0];

  // Avatar Engine State
  const [avatarTab, setAvatarTab] = useState<"preset" | "upload" | "prompt">("preset");
  const memojiPresets = [
    "/avatars/memoji/1.png",
    "/avatars/memoji/2.png",
    "/avatars/memoji/3.png",
    "/avatars/memoji/4.PNG",
    "/avatars/memoji/5.PNG",
    "/avatars/memoji/6.PNG",
    "/avatars/memoji/7.PNG",
    "/avatars/memoji/8.PNG",
    "/avatars/memoji/9.PNG",
    "/avatars/memoji/10.PNG",
  ];
  const [selectedPreset, setSelectedPreset] = useState(memojiPresets[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [avatarPromptText, setAvatarPromptText] = useState("");
  const [avatarGenerateLoading, setAvatarGenerateLoading] = useState(false);
  const [avatarGenerateError, setAvatarGenerateError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const TWIN_AVATAR_STORAGE_KEY = "twin_avatar";

  const saveAvatarToTwin = (value: string) => {
    setTwins(prev => prev.map(t => t.id === activeTwinId ? { ...t, avatar: value } : t));
    try {
      window.localStorage.setItem(TWIN_AVATAR_STORAGE_KEY, value);
    } catch { /* ignore */ }
  };

  // 方案 A：从 localStorage 恢复头像（刷新/重新打开后仍显示上次选择的头像）
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TWIN_AVATAR_STORAGE_KEY);
      if (!raw || typeof raw !== "string") return;
      if (raw.startsWith("data:")) {
        setUploadedImage(raw);
        setAvatarTab("upload");
        setTwins(prev => prev.map(t => t.id === activeTwinId ? { ...t, avatar: raw } : t));
      } else {
        if (memojiPresets.includes(raw)) setSelectedPreset(raw);
        setTwins(prev => prev.map(t => t.id === activeTwinId ? { ...t, avatar: raw } : t));
      }
    } catch { /* ignore */ }
  }, []);

  // Soul Copy State (Linked to Personality Wizard Levels)
  const [selectedSouls] = useState<number[]>([1, 2, 3]);
  const [soulKeywords, setSoulKeywords] = useState<Record<number, string>>({});

  // 从 localStorage 读取灵魂关键词（含评委打开时 App 预填的 Demo 数据）；切到「灵魂注入」时刷新
  useEffect(() => {
    const next: Record<number, string> = {};
    [1, 2, 3, 4, 5, 6].forEach((level) => {
      try {
        const raw = localStorage.getItem(`twin_soul_level_${level}_keywords`);
        if (!raw) return;
        const data = JSON.parse(raw) as Record<string, unknown>;
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
        if (values.length > 0) {
          next[level] = values.slice(0, 3).join(" / ");
        }
      } catch {
        // ignore parse errors
      }
    });
    setSoulKeywords(next);
  }, [studioTab]);

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

  // Twin Specific Memory Fragments：从 Memory Vault 里已上传到 EverMemOS 的碎片生成
  type ActiveMemory = {
    id: string;
    date: string;
    content: string;
    tags: string[];
    type: "text" | "audio";
    isActive: boolean;
  };

  const loadActiveMemoriesFromVault = (): ActiveMemory[] => {
    try {
      const raw = window.localStorage.getItem("twin_memory_vault");
      if (!raw) return [];
      const vault = JSON.parse(raw) as {
        id: string;
        date: string;
        content: string;
        tags: string[];
        type: string;
        messageId?: string;
        deletedLocally?: boolean;
      }[];
      if (!Array.isArray(vault)) return [];

      // 只取：1）已同步 EverMemOS（有 messageId）；2）未标记本地删除
      return vault
        .filter((m) => m.messageId && !m.deletedLocally)
        .map((m) => ({
          id: m.id,
          date: m.date,
          content: m.content,
          tags: m.tags || [],
          type: (m.type === "audio" ? "audio" : "text") as "text" | "audio",
          isActive: true,
        }));
    } catch {
      return [];
    }
  };

  const [activeMemories, setActiveMemories] = useState<ActiveMemory[]>(() => loadActiveMemoriesFromVault());

  const toggleMemory = (id: string) => {
    setActiveMemories(prev => prev.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m));
  };

  const deleteMemory = (id: string) => {
    setActiveMemories(prev => prev.filter(m => m.id !== id));
  };

  // 每次切到「记忆碎片注入」标签页时，刷新一次数据，与 Memory Vault 保持一致
  useEffect(() => {
    if (studioTab === "memory") {
      setActiveMemories(loadActiveMemoriesFromVault());
    }
  }, [studioTab]);

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

  const handleGenerateAvatar = async () => {
    setAvatarGenerateError(null);
    setAvatarGenerateLoading(true);
    try {
      const { dataUrl } = await generateAvatarWithGemini(avatarPromptText);
      setGeneratedImageUrl(dataUrl);
    } catch (e) {
      setAvatarGenerateError(e instanceof Error ? e.message : String(e));
    } finally {
      setAvatarGenerateLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUploadedImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Radar Chart Data：若有认知矩阵则使用真实值，否则使用轻量占位
  const radarData = cogProfile
    ? [
        { subject: "情绪稳定度", A: cogProfile.emotional_stability ?? 50, fullMark: 100 },
        { subject: "社交能量", A: cogProfile.social_energy ?? 50, fullMark: 100 },
        { subject: "开放性·想象力", A: cogProfile.openness_imagination ?? 50, fullMark: 100 },
        { subject: "结构化·执行力", A: cogProfile.structure_execution ?? 50, fullMark: 100 },
        { subject: "价值观边界", A: cogProfile.value_boundary ?? 50, fullMark: 100 },
        { subject: "自我反省力", A: cogProfile.self_reflection ?? 50, fullMark: 100 },
      ]
    : [
        { subject: "情绪稳定度", A: 55, fullMark: 100 },
        { subject: "社交能量", A: 55, fullMark: 100 },
        { subject: "开放性·想象力", A: 55, fullMark: 100 },
        { subject: "结构化·执行力", A: 55, fullMark: 100 },
        { subject: "价值观边界", A: 55, fullMark: 100 },
        { subject: "自我反省力", A: 55, fullMark: 100 },
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
                <h3>{twin.name} <span className="twin-badge twin-badge-core">本体</span></h3>
                <p>{twin.desc}</p>
              </div>
            </div>
          ))}
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
          </div>
        </header>

        <div className="config-body">
          {studioTab === "dashboard" && (
            <div className="config-section dashboard-section">
              <div className="dashboard-top-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

                {/* Life Ring: Brain Sync Rate */}
                <div
                  className="workshop-card life-ring-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px',
                  }}
                >
                  <div style={{ alignSelf: 'stretch', display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <h3 className="card-title" style={{ marginBottom: 0 }}>大脑同步率</h3>
                    <div
                      className="milestone-info-badge"
                      title={
                        "大脑同步率代表「当前分身回答与你期望的贴合程度」，范围 0%~100%。\n\n" +
                        "当前 Demo 版本的同步率主要由聊天反馈驱动：\n" +
                        "• 当你对分身的回复点 👍 时，同步率会小幅上升；\n" +
                        "• 当你点 👎 时，同步率会小幅下降；\n" +
                        "• 每次调整都会被记录在本地（twin_sync_rate），并在进化聊天室与分身养成中心之间联动显示。\n\n" +
                        "后续可以接入更多信号（如回答质量评估、任务完成度等）进一步丰富这一指标。"
                      }
                    >
                      <svg
                        viewBox="0 0 1024 1024"
                        aria-hidden="true"
                        focusable="false"
                        className="milestone-info-icon"
                      >
                        <path d="M512 64a448 448 0 1 0 0 896A448 448 0 0 0 512 64z m0 820.032A372.032 372.032 0 0 1 512 139.968a372.032 372.032 0 0 1 0 744.064z" />
                        <path d="M464 688a48 48 0 1 0 96 0 48 48 0 0 0-96 0zM488 576h48a8 8 0 0 0 8-8v-272a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v272c0 4.416 3.584 8 8 8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="life-ring-container">
                    <svg viewBox="0 0 100 100" className="life-ring-svg">
                      <defs>
                        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#7c3aed" />
                          <stop offset="50%" stopColor="#0ea5e9" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                      <circle cx="50" cy="50" r="45" className="life-ring-bg" />
                      {/* 283 ≈ 2πr，当同步率为 100% 时完整闭合，这里按当前 syncRate 动态计算 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        className="life-ring-progress"
                        strokeDasharray="283"
                        strokeDashoffset={283 - (283 * syncRate) / 100}
                      />
                    </svg>
                    <div className="life-ring-text">
                      <span className="sync-value">{syncRate}</span>
                      <span className="sync-unit">%</span>
                    </div>
                  </div>
                  <div className="life-ring-status" style={{ marginTop: '24px', color: '#10b981', fontSize: '14px', fontWeight: 500 }}>
                    状态：{syncRate >= 90 ? "极高共联" : syncRate >= 80 ? "高度共联" : "基础共联"}
                  </div>
                  <button
                    type="button"
                    className="dc-btn-secondary"
                    style={{ marginTop: '16px', fontSize: '12px' }}
                    onClick={() => {
                      // 手动从 localStorage 重新拉一次同步率 + 认知维度矩阵
                      const nextRate = loadSyncRate();
                      setSyncRate(nextRate);
                      const nextProfile = loadCognitiveProfile();
                      setCogProfile(nextProfile);
                    }}
                  >
                    刷新同步率与认知矩阵
                  </button>
                </div>

                {/* Hexagon Radar Chart */}
                <div className="workshop-card radar-chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 className="card-title" style={{ marginBottom: 0 }}>认知维度矩阵</h3>
                    <div
                      className="milestone-info-badge"
                      title={
                        "认知维度矩阵 = 6 个画像维度：情绪稳定、社交能量、开放性·想象力、结构化·执行力、价值观边界、自我反省力。\n\n" +
                        "当前分数综合了三类信号：\n" +
                        "• 人格完整度：你在「灵魂拷贝」6 个关卡中填入的资料越多，分身的人格画像越完整；\n" +
                        "• 记忆碎片：你在 Memory Vault 中上传到 EverMemOS 的碎片（及其标签），会影响对应维度的权重；\n" +
                        "• 聊天反馈：在进化聊天室里对分身回复点 👍 / 👎，会对这些维度做轻微的长期微调，让画像慢慢贴近真实的你。\n\n" +
                        "所有计算都只在本地浏览器完成，并缓存在 twin_cognitive_profile 中，方便你反复查看与对比。"
                      }
                    >
                      <svg
                        viewBox="0 0 1024 1024"
                        aria-hidden="true"
                        focusable="false"
                        className="milestone-info-icon"
                      >
                        <path d="M512 64a448 448 0 1 0 0 896A448 448 0 0 0 512 64z m0 820.032A372.032 372.032 0 0 1 512 139.968a372.032 372.032 0 0 1 0 744.064z" />
                        <path d="M464 688a48 48 0 1 0 96 0 48 48 0 0 0-96 0zM488 576h48a8 8 0 0 0 8-8v-272a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v272c0 4.416 3.584 8 8 8z" />
                      </svg>
                    </div>
                  </div>
                  <div style={{ flex: 1, minHeight: '260px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="rgba(148,163,184,0.35)" strokeDasharray="3 3" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          tickLine={false}
                          tickMargin={14}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={{ fill: '#9ca3af', fontSize: 9, dy: 5 }}
                          tickCount={6}
                          axisLine={false}
                        />
                        <Radar
                          name={activeTwin.name}
                          dataKey="A"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.35}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Evolution Milestones */}
              <div className="workshop-card milestones-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <h3 className="card-title" style={{ marginBottom: 0 }}>进化里程碑 (Evolution Milestones)</h3>
                  <div
                    className="milestone-info-badge"
                    title={
                      "进化阶段由三部分综合计算：\n" +
                      "• 人格完成度：完成越多灵魂拷贝关卡，权重越高；\n" +
                      "• 记忆碎片：上传到 EverMemOS 的记忆碎片越多，记忆越丰富；\n" +
                      "• 大脑同步率：在进化聊天室中对分身的 👍 / 👎 反馈越多，越接近真实你。\n\n" +
                      "规则示例：\n" +
                      "• 初级镜像：至少 2 关人格 + ≥1 条云端碎片；\n" +
                      "• 高阶分身：≥4 关人格 + ≥5 条云端碎片 + 同步率 ≥ 60；\n" +
                      "• 数字双生：6 关人格 + ≥15 条云端碎片 + 同步率 ≥ 80。"
                    }
                  >
                    <svg
                      viewBox="0 0 1024 1024"
                      aria-hidden="true"
                      focusable="false"
                      className="milestone-info-icon"
                    >
                      <path d="M512 64a448 448 0 1 0 0 896A448 448 0 0 0 512 64z m0 820.032A372.032 372.032 0 0 1 512 139.968a372.032 372.032 0 0 1 0 744.064z" />
                      <path d="M464 688a48 48 0 1 0 96 0 48 48 0 0 0-96 0zM488 576h48a8 8 0 0 0 8-8v-272a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v272c0 4.416 3.584 8 8 8z" />
                    </svg>
                  </div>
                </div>
                <div className="milestones-timeline">
                  <div className={`milestone-item ${evoStage === "embryo" ? "current" : "completed"}`}>
                    <div className={`milestone-node${evoStage === "embryo" ? " breathing" : ""}`}></div>
                    <div className="milestone-label">胚胎</div>
                    <div className="milestone-date">{completedLevels > 0 ? "已觉醒" : "等待觉醒"}</div>
                  </div>
                  <div className={`milestone-line ${evoStage === "embryo" ? "inactive" : "active"}`}></div>

                  <div className={`milestone-item ${evoStage === "mirror" || evoStage === "partner" || evoStage === "twin" ? "completed" : "pending"}`}>
                    <div className="milestone-node"></div>
                    <div className="milestone-label">初级镜像</div>
                    <div className="milestone-date">{completedLevels >= 2 ? "人格成型" : "未解锁"}</div>
                  </div>
                  <div className={`milestone-line ${evoStage === "partner" || evoStage === "twin" ? "active" : "inactive"}`}></div>

                  <div className={`milestone-item ${evoStage === "partner" ? "current" : evoStage === "twin" ? "completed" : "pending"}`}>
                    <div className={`milestone-node${evoStage === "partner" ? " breathing" : ""}`}></div>
                    <div className="milestone-label">高阶分身</div>
                    <div className="milestone-date">
                      {syncedVaultCount >= 5 && syncRate >= 60 ? "进行中" : "记忆不足"}
                    </div>
                  </div>
                  <div className={`milestone-line ${evoStage === "twin" ? "active" : "inactive"}`}></div>

                  <div className={`milestone-item ${evoStage === "twin" ? "current" : "pending"}`}>
                    <div className={`milestone-node${evoStage === "twin" ? " breathing" : ""}`}></div>
                    <div className="milestone-label">数字双生</div>
                    <div className="milestone-date">
                      {evoStage === "twin" ? "已达成" : "等待更多记忆与反馈"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {studioTab === "appearance" && (
            <div className="config-section">
              <div className="workshop-card avatar-engine-card" style={{ marginBottom: "20px" }}>
                <div className="avatar-engine-layout">
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, minHeight: 220, alignSelf: "flex-start", marginTop: 20 }}>
                    <div className="avatar-display" style={{ height: 160, flexShrink: 0 }}>
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
                        {avatarTab === "prompt" && (
                          generatedImageUrl ? (
                            <img src={generatedImageUrl} alt="AI 生成预览" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <div className="avatar-placeholder type-prompt">✨</div>
                          )
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-generate-avatar"
                      style={{ alignSelf: "center" }}
                      disabled={
                        avatarTab === "upload" ? !uploadedImage :
                        avatarTab === "prompt" ? !generatedImageUrl : false
                      }
                      onClick={() => {
                        if (avatarTab === "preset") saveAvatarToTwin(selectedPreset);
                        else if (avatarTab === "upload" && uploadedImage) saveAvatarToTwin(uploadedImage);
                        else if (avatarTab === "prompt" && generatedImageUrl) {
                          saveAvatarToTwin(generatedImageUrl);
                          setUploadedImage(generatedImageUrl);
                        }
                      }}
                    >
                      保存
                    </button>
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
                        <>
                          <div
                            className="preset-grid preset-memoji-grid"
                            style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}
                          >
                            {memojiPresets.map(path => (
                              <div
                                key={path}
                                className={`preset-item memoji-item ${selectedPreset === path ? 'active' : ''}`}
                                onClick={() => setSelectedPreset(path)}
                                style={{
                                  padding: 0,
                                  overflow: 'hidden',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '56px',
                                }}
                              >
                                <img
                                  src={path}
                                  alt="Memoji preset"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </>
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
                            value={avatarPromptText}
                            onChange={e => setAvatarPromptText(e.target.value)}
                            disabled={avatarGenerateLoading}
                          />
                          {avatarGenerateError && (
                            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#f87171" }}>{avatarGenerateError}</p>
                          )}
                          <button
                            type="button"
                            className="btn-generate-avatar"
                            onClick={handleGenerateAvatar}
                            disabled={avatarGenerateLoading}
                          >
                            {avatarGenerateLoading ? "生成中…" : "✨ 开始渲染"}
                          </button>
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
                  ].map(soul => (
                    <div
                      key={soul.id}
                      className="soul-binding-item"
                    >
                      {soulKeywords[soul.id] && (
                        <div className="soul-keywords-wall">
                          {soulKeywords[soul.id]}
                        </div>
                      )}
                      <div className="soul-binding-info">
                        <h4>{soul.title}</h4>
                        <p>{soul.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                  {activeMemories.map((memory) => (
                    <div
                      key={memory.id}
                      className="plugin-item memory-card-list-item"
                      style={{
                        gap: '16px',
                        position: 'relative',
                        opacity: 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      {/* Content Area（只读） */}
                      <div className="memory-content-area" style={{ flex: 1 }}>
                        <div className="memory-header" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <strong className={`memory-type type-${memory.type}`} style={{ fontSize: '15px', color: '#1e293b' }}>
                            {memory.type === "text" && "📝 文本"}
                            {memory.type === "file" && "📄 文档"}
                            {memory.type === "audio" && "🎤 录音"}
                          </strong>
                          <span className="memory-date" style={{ fontSize: '12px', color: '#64748b' }}>{memory.date}</span>
                          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '999px', background: 'rgba(59,130,246,0.08)', color: '#2563eb' }}>
                            来自 Memory Vault
                          </span>
                        </div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '13px', lineHeight: '1.5', color: '#64748b' }}>{memory.content}</p>
                        <div className="memory-tags">
                          {memory.tags.map(tag => (
                            <span
                              key={tag}
                              className="tag"
                              style={{
                                background: 'rgba(52, 211, 153, 0.1)',
                                color: '#34d399',
                                fontSize: '12px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                marginRight: '6px'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Setup Wizard Footer */}
              {/* 这里不再跳转到 Skill 配置，记忆碎片注入作为当前终点 */}
            </div>
          )}
        </div>
      </main>

    </div>
  );
};
