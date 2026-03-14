import React, { useState } from "react";

interface SkillWorkshopProps {
  onActivateSkill?: () => void;
}

export const SkillWorkshop: React.FC<SkillWorkshopProps> = ({ onActivateSkill }) => {
  const [activeTab, setActiveTab] = useState<"store" | "my_skills">("store");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { name: "全部" },
    { name: "热门插件", badge: "HOT" },
    { name: "网络与信息获取" },
    { name: "自然语言处理" },
    { name: "计算机视觉" },
    { name: "自动化运维" },
    { name: "数据挖掘与分析" },
    { name: "虚拟资产管理" },
    { name: "防御与安全" },
  ];

  // Mock Data mimicking the screenshot：每个 Skill 可以理解为一段指导分身工作的提示词模板
  // hasConfig = true 表示已经有对应的 SKILL.md（结构化提示词），才能被“下载/使用”
  const initialStoreSkills = [
    // 先展示有 SKILL.md 的能力
    { id: "s1", name: "每日财经要闻", desc: "针对当日重点财经新闻进行要点式梳理与短评，不展开长篇大论，控制在短对话内完成。", icon: "📈", added: false, hasConfig: true, category: "自然语言处理", popularity: 98 },
    { id: "s6", name: "世界天气预报", desc: "报道世界主要城市未来几天的天气预报，简明扼要，便于快速浏览。", icon: "🌤️", added: false, hasConfig: true, category: "自然语言处理", popularity: 88 },
    // 下面是暂未完成 SKILL.md 的占位能力
    { id: "s2", name: "全网信息侦察集群", desc: "突破次元壁，通过多协议抓取暗网与公共网络的高价值情报", icon: "🕸️", added: false, hasConfig: false, category: "网络与信息获取", popularity: 95 },
    { id: "s3", name: "GitHub 命令行终端", desc: "在终端一键管理代码仓库的 PR、Issue 与 CI 构建流", icon: "🐙", added: false, hasConfig: false, category: "自动化运维", popularity: 45 },
    { id: "s4", name: "全球气象与灾害预测", desc: "接管全球气象局接口，为您提供秒级的环境预测分析", icon: "⛈️", added: false, hasConfig: false, category: "数据挖掘与分析", popularity: 32 },
    { id: "s5", name: "暗网情报订阅与分发", desc: "突破表层网络，定期向您汇报深网的安全事件与泄露数据", icon: "👁️", added: false, hasConfig: false, category: "防御与安全", popularity: 91 },
    { id: "s7", name: "企业级多源信息验证", desc: "整合全球学术与新闻库，交叉验证目标信息的真实性", icon: "🧠", added: false, hasConfig: false, category: "网络与信息获取", popularity: 50 },
    { id: "s8", name: "去中心化社交矩阵", desc: "同时接管多平台账户，自动引流、回复并进行降维打击", icon: "📡", added: false, hasConfig: false, category: "自动化运维", popularity: 99 },
    { id: "s9", name: "虚拟影音全息伪造", desc: "实时生成高质量的语音克隆与 60fps 动态全息视频片段", icon: "🎬", added: false, hasConfig: false, category: "计算机视觉", popularity: 93 },
    { id: "s10", name: "递归式网页渗透引擎", desc: "无视反爬限制，AI 驱动的深度内容溯源与 DOM 解析", icon: "🌐", added: false, hasConfig: false, category: "防御与安全", popularity: 20 },
    { id: "s11", name: "量化回测与高频交易", desc: "在毫秒间完成加密资产的套利与持仓风险对冲", icon: "📈", added: false, hasConfig: false, category: "虚拟资产管理", popularity: 96 },
    { id: "s12", name: "近地轨道航班监控", desc: "自动比价并查询全球空域的飞行器轨迹，寻找最优出行方案", icon: "✈️", added: false, hasConfig: false, category: "数据挖掘与分析", popularity: 82 },
  ];

  const [storeSkills, setStoreSkills] = useState(() => {
    try {
      const raw = window.localStorage.getItem("twin_downloaded_skill_ids");
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(ids) || ids.length === 0) return initialStoreSkills;
      return initialStoreSkills.map((s) =>
        ids.includes(s.id) ? { ...s, added: true } : s
      );
    } catch {
      return initialStoreSkills;
    }
  });

  // 各技能的启用状态（开关），key 为 skill.id，value 为是否开启
  const [skillActiveMap, setSkillActiveMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = window.localStorage.getItem("twin_skill_active_map");
      const parsed = raw ? JSON.parse(raw) as Record<string, boolean> : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });

  // 「我的技能」只显示从技能库下载的（added: true）技能，如「每日财经要闻」「世界天气预报」
  const mySkillsDisplay = storeSkills
    .filter((s) => s.added)
    .map((s) => ({
      id: s.id,
      name: s.name,
      desc: s.desc,
      icon: s.icon,
      category: s.category,
      popularity: s.popularity,
      fromStore: true,
    }));

  const handleRemoveFromMySkills = (skillId: string) => {
    const fromStore = storeSkills.some((s) => s.id === skillId);
    if (fromStore) {
      setStoreSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, added: false } : s))
      );
      try {
        const raw = window.localStorage.getItem("twin_downloaded_skill_ids");
        const ids: string[] = raw ? JSON.parse(raw) : [];
        const next = ids.filter((id) => id !== skillId);
        window.localStorage.setItem("twin_downloaded_skill_ids", JSON.stringify(next));
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="skill-workshop-container">
      {/* Top Header */}
      <div className="sw-header">
        <div className="sw-tabs">
          <button
            className={`sw-tab ${activeTab === 'store' ? 'active' : ''}`}
            onClick={() => setActiveTab('store')}
          >
            技能库
          </button>
          <button
            className={`sw-tab ${activeTab === 'my_skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('my_skills')}
          >
            我的技能
          </button>
        </div>

        <div className="sw-actions">
          <div className="sw-search">
            <span className="sw-search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索技能库, 按 ↵ 搜索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="sw-btn-create">
            ＋ 创建技能
          </button>
        </div>
      </div>

      {/* Dynamic Content */}
      {activeTab === 'store' ? (
        <div className="sw-store-view">
          {/* Sub Categories */}
          <div className="sw-categories">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                className={`sw-cat-btn ${activeCategory === cat.name ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.name)}
              >
                {cat.name}
                {cat.badge && <span className="sw-cat-badge">{cat.badge}</span>}
              </button>
            ))}
          </div>

          {/* Grid Layout for Store */}
          <div className="sw-grid">
            {storeSkills
              .filter(s => activeCategory === "全部" || (activeCategory === "热门插件" && s.popularity >= 90) || s.category === activeCategory)
              .filter(s => s.name.includes(searchQuery) || s.desc.includes(searchQuery))
              .map(skill => (
                <div key={skill.id} className="sw-card sw-card-store">
                  <div className="sw-card-left">
                    <div className="sw-card-icon">{skill.icon}</div>
                  </div>
                  <div className="sw-card-content">
                    <div className="sw-card-header">
                      <div className="sw-card-title-group">
                        <h3 className="sw-card-title">{skill.name}</h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className="sw-skill-tag">{skill.category}</span>
                          {skill.hasConfig ? (
                            <span className="sw-skill-popularity">🔥 热度: {skill.popularity}w</span>
                          ) : (
                            <span className="sw-skill-coming">即将上线</span>
                          )}
                        </div>
                      </div>
                      {skill.added ? (
                        <span className="sw-badge-added">已添加</span>
                      ) : skill.hasConfig ? (
                        <button
                          className="sw-btn-download"
                          onClick={() => {
                            setStoreSkills(prev =>
                              prev.map(s =>
                                s.id === skill.id ? { ...s, added: true } : s
                              )
                            );
                            try {
                              const raw = window.localStorage.getItem("twin_downloaded_skill_ids");
                              const ids: string[] = raw ? JSON.parse(raw) : [];
                              if (!ids.includes(skill.id)) {
                                const next = [...ids, skill.id];
                                window.localStorage.setItem("twin_downloaded_skill_ids", JSON.stringify(next));
                              }
                            } catch {
                              // ignore
                            }
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          className="sw-btn-download sw-btn-download--disabled"
                          disabled
                          title="该技能的 SKILL.md 正在编写中"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="sw-card-desc">{skill.desc}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="sw-my-skills-view">
          {/* Grid Layout for My Skills */}
          <div className="sw-grid sw-grid-myskills">
            {mySkillsDisplay.filter(s => s.name.includes(searchQuery) || s.desc.includes(searchQuery)).map(skill => (
              <div key={skill.id} className="sw-card sw-card-myskill">
                <div className="sw-card-top">
                  <div className="sw-card-left">
                    <div className="sw-card-icon">{skill.icon}</div>
                  </div>
                  <div className="sw-card-content">
                    <div className="sw-card-header">
                      <div className="sw-card-title-group">
                        <h3 className="sw-card-title">{skill.name}</h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className="sw-skill-tag">{skill.category}</span>
                          <span className="sw-skill-popularity">🔥 热度: {skill.popularity}w</span>
                        </div>
                      </div>
                      <label className="sw-ios-toggle">
                        <input
                          type="checkbox"
                          checked={skillActiveMap[skill.id] ?? true}
                          onChange={(e) => {
                            const next = { ...skillActiveMap, [skill.id]: e.target.checked };
                            setSkillActiveMap(next);
                            try {
                              window.localStorage.setItem("twin_skill_active_map", JSON.stringify(next));
                            } catch {
                              // ignore
                            }
                          }}
                        />
                        <span className="sw-ios-slider"></span>
                      </label>
                    </div>
                    <p className="sw-card-desc">{skill.desc}</p>
                  </div>
                </div>
                <div className="sw-card-bottom">
                  <button
                    className="sw-btn-use"
                    disabled={skillActiveMap[skill.id] === false}
                    onClick={() => {
                      if (skillActiveMap[skill.id] === false) return;
                      try {
                        // 为进化聊天室准备一条推荐首句
                        const template =
                          skill.id === "s1"
                            ? "我刚刚添加了「每日财经要闻」技能，请为我汇报今日全球财经要闻。"
                            : skill.id === "s6"
                            ? "我刚刚添加了「世界天气预报」技能，请帮我简要播报未来几天全球主要城市的天气情况。"
                            : "";
                        if (template) {
                          window.localStorage.setItem("twin_pending_skill_message", template);
                        }
                        window.localStorage.setItem(
                          "twin_active_skill",
                          JSON.stringify({
                            id: skill.id,
                            name: skill.name,
                            desc: skill.desc,
                          })
                        );
                        if (onActivateSkill) {
                          onActivateSkill();
                        }
                      } catch {
                        // ignore storage errors in demo
                      }
                    }}
                  >
                    立即使用
                  </button>
                  <button
                    className="sw-btn-delete"
                    onClick={() => "fromStore" in skill && skill.fromStore && handleRemoveFromMySkills(skill.id)}
                    title={"fromStore" in skill && skill.fromStore ? "从我的技能中移除" : "删除"}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
