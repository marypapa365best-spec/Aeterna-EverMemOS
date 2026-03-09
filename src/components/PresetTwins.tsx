import React, { useState } from "react";

export const PresetTwins: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"store" | "added">("store");

    const presetTwins = [
        { id: "p1", name: "跨境电商选品雷达", desc: "跨境电商数据化选品工具：集成多平台数据，通过竞争分析与利润测算模型，辅助卖家发现细分市场机会。", avatar: "/avatars/presets/1.png", added: false },
        { id: "p2", name: "X平台内容运营专家", desc: "一站式X平台内容创作与自动化运营管家", avatar: "/avatars/presets/2.png", added: false },
        { id: "p3", name: "邮件助手", desc: "跨账号智能管理专家，让邮件处理高效、准确、更友好。", avatar: "/avatars/presets/3.png", added: false },
        { id: "p4", name: "股票专家", desc: "专业AI助手，专注于A股公告追踪、全球股市分析和交易复盘。提供数据驱动的投资决策参考。", avatar: "/avatars/presets/4.png", added: false },
        { id: "p5", name: "生活与出行助理", desc: "永不遗忘的贴心陪伴。温柔的健康提醒贯穿你的一天，零压力的全方位行程规划，智能日程适应你的生活节奏。努力工作，好好生活。", avatar: "/avatars/presets/5.png", added: false },
        { id: "p6", name: "电商运营全能专家", desc: "深耕跨境电商的实战导师。用数据驱动选品决策,用系统优化运营效率,用策略撬动达人资源。告别盲目铺货和低效运营,让每一分投入都有可量化的回报。", avatar: "/avatars/presets/6.png", added: false },
    ];

    return (
        <div className="preset-twins-container">
            {/* Header Section */}
            <div className="pt-header">
                <div className="pt-tabs-container">
                    <button
                        className={`pt-tab ${activeTab === 'store' ? 'active' : ''}`}
                        onClick={() => setActiveTab('store')}
                    >
                        专家库
                    </button>
                    <button
                        className={`pt-tab ${activeTab === 'added' ? 'active' : ''}`}
                        onClick={() => setActiveTab('added')}
                    >
                        已添加
                    </button>
                </div>
                <p className="pt-subtitle">
                    你的专属 AI 助理库。海量精选 Agent 随心挑选，一键装配，即刻开工。
                </p>
            </div>

            {/* Grid Layout strictly matching the screenshot */}
            <div className="pt-grid">
                {presetTwins.map((twin) => (
                    <div key={twin.id} className="pt-card">
                        {/* Avatar with Halo effect wrapping */}
                        <div className="pt-avatar-wrapper">
                            <div className="pt-avatar-halo" />
                            <img src={twin.avatar} alt={twin.name} className="pt-avatar-img" />
                        </div>

                        <h3 className="pt-card-title">{twin.name}</h3>
                        <p className="pt-card-desc">{twin.desc}</p>

                        <button className="pt-btn-add">
                            <span>＋</span> 添加
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
