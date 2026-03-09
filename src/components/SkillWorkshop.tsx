import React, { useState } from "react";

export const SkillWorkshop: React.FC = () => {
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

  // Mock Data mimicking the screenshot
  const storeSkills = [
    { id: "s1", name: "深度长文生成引擎", desc: "口语化、有故事、有态度，让文章像人类专家一样自然", icon: "🤖", added: false, category: "自然语言处理", popularity: 98 },
    { id: "s2", name: "全网信息侦察集群", desc: "突破次元壁，通过多协议抓取暗网与公共网络的高价值情报", icon: "🕸️", added: false, category: "网络与信息获取", popularity: 95 },
    { id: "s3", name: "GitHub 命令行终端", desc: "在终端一键管理代码仓库的 PR、Issue 与 CI 构建流", icon: "🐙", added: false, category: "自动化运维", popularity: 45 },
    { id: "s4", name: "全球气象与灾害预测", desc: "接管全球气象局接口，为您提供秒级的环境预测分析", icon: "⛈️", added: false, category: "数据挖掘与分析", popularity: 32 },
    { id: "s5", name: "暗网情报订阅与分发", desc: "突破表层网络，定期向您汇报深网的安全事件与泄露数据", icon: "👁️", added: false, category: "防御与安全", popularity: 91 },
    { id: "s6", name: "心智情绪润色算法", desc: "消除生硬的机器口吻，使回复具备出色的共情与幽默感", icon: "🎭", added: false, category: "自然语言处理", popularity: 88 },
    { id: "s7", name: "企业级多源信息验证", desc: "整合全球学术与新闻库，交叉验证目标信息的真实性", icon: "🧠", added: false, category: "网络与信息获取", popularity: 50 },
    { id: "s8", name: "去中心化社交矩阵", desc: "同时接管多平台账户，自动引流、回复并进行降维打击", icon: "📡", added: false, category: "自动化运维", popularity: 99 },
    { id: "s9", name: "虚拟影音全息伪造", desc: "实时生成高质量的语音克隆与 60fps 动态全息视频片段", icon: "🎬", added: false, category: "计算机视觉", popularity: 93 },
    { id: "s10", name: "递归式网页渗透引擎", desc: "无视反爬限制，AI 驱动的深度内容溯源与 DOM 解析", icon: "🌐", added: false, category: "防御与安全", popularity: 20 },
    { id: "s11", name: "量化回测与高频交易", desc: "在毫秒间完成加密资产的套利与持仓风险对冲", icon: "📈", added: false, category: "虚拟资产管理", popularity: 96 },
    { id: "s12", name: "近地轨道航班监控", desc: "自动比价并查询全球空域的飞行器轨迹，寻找最优出行方案", icon: "✈️", added: true, category: "数据挖掘与分析", popularity: 82 },
  ];

  const mySkills = [
    { id: "m1", name: "数据表格吞噬者 (XLSX)", desc: "自动读取万行级加密表格，并在 0.5 秒内清洗异常数据、修复公式并吐出深度报告...", icon: "📊", active: true, category: "数据挖掘与分析", popularity: 92 },
    { id: "m2", name: "全息演示生成 (PPT)", desc: "接管您的终端硬件算力，根据会议纪要一键渲染具有商业极简风格的多页动态简报...", icon: "📽️", active: true, category: "计算机视觉", popularity: 88 },
    { id: "m3", name: "语义拆解重组 (PDF)", desc: "无视格式保护锁，物理剥离文档内部结构，追踪每一处被隐形修订的主干段落...", icon: "📄", active: true, category: "自然语言处理", popularity: 75 },
    { id: "m4", name: "近地轨道航班监控", desc: "自动比价并查询全球空域的飞行器轨迹，随时为您准备紧急撤离的舱位...", icon: "✈️", active: true, category: "数据挖掘与分析", popularity: 82 },
    { id: "m5", name: "文档级拟态伪装 (DOCX)", desc: "在不改变核心逻辑的基础上，用截然不同的措辞与排版将机密档案重组...", icon: "📝", active: true, category: "防御与安全", popularity: 65 },
  ];

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
                          <span className="sw-skill-popularity">🔥 热度: {skill.popularity}w</span>
                        </div>
                      </div>
                      {skill.added ? (
                        <span className="sw-badge-added">已添加</span>
                      ) : (
                        <button className="sw-btn-download">
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
            {mySkills.filter(s => s.name.includes(searchQuery) || s.desc.includes(searchQuery)).map(skill => (
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
                        <input type="checkbox" defaultChecked={skill.active} />
                        <span className="sw-ios-slider"></span>
                      </label>
                    </div>
                    <p className="sw-card-desc">{skill.desc}</p>
                  </div>
                </div>
                <div className="sw-card-bottom">
                  <button className="sw-btn-use">立即使用</button>
                  <button className="sw-btn-delete">
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
