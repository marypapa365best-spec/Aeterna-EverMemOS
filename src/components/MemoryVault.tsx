import React, { useState } from "react";

// Mock Data（本地展示用，云端记忆已迁移到 CloudMemoryView）
const MOCK_MEMORIES = [
  {
    id: "m-001",
    date: "2023-10-14",
    content: "第一次在东京看到了真实的雪，那种寂静的光影深深印在脑海里。",
    tags: ["#Travel", "#Winter", "#Aesthetic"],
    type: "text",
  },
  {
    id: "m-002",
    date: "2024-02-05",
    content: "上传了《五年日记》的导出备份文档 (CSV格式)。提取了 1,204 条情绪标记。",
    tags: ["#Diary", "#MassData"],
    type: "file",
  },
  {
    id: "m-003",
    date: "2024-05-20",
    content: "《给未来的自己》音频录音。长达 45 分钟的内心独白。",
    tags: ["#Voice", "#Reflection"],
    type: "audio",
  }
];

export const MemoryVault: React.FC = () => {
  const [memories, setMemories] = useState(MOCK_MEMORIES);

  const handleDelete = (id: string) => {
    setMemories(memories.filter(m => m.id !== id));
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Mock adding a new memory based on the file
      const newMemory = {
        id: `m-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        content: `已上传文件: ${file.name}。系统正在提取神经突触关联...`,
        tags: ["#NewMemory", "#File"],
        type: "file",
      };
      setMemories([newMemory, ...memories]);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSocialSync = (platform: string) => {
    const newMemory = {
      id: `m-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      content: `已成功连接 ${platform}。系统已在后台扫描近期数据，并提取到了新的性格切片与日常谈吐记忆。`,
      tags: ["#CloudSync", platform.split(' ')[0]],
      type: "text",
    };
    setMemories([newMemory, ...memories]);
  };

  return (
    <div className="vault-container">
      <div className="vault-header">
        <h1 className="vault-title">记忆碎片 (Memory Vault)</h1>
        <p className="vault-subtitle">构建你的个人记忆资产：私域记忆、文档、对话录音等，这些将作为所有分身共用的潜意识数据库基底。</p>
      </div>

      {/* Drag and drop import zone（碎片化记忆输入） */}
      <div className="import-grid">
        <div className="import-zone">
          <div className="import-zone__icon">📤</div>
          <h3 className="import-zone__title">拖拽文件或粘贴文本来注入记忆</h3>
          <p className="import-zone__desc">支持 .txt, .pdf, .csv 数据导出及语音文件</p>
          <button className="btn-import" onClick={() => fileInputRef.current?.click()}>
            浏览系统文件
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: "none" }} 
            onChange={handleFileUpload} 
          />
        </div>

        <div className="social-sync-zone">
          <div className="import-zone__icon">🔗</div>
          <h3 className="import-zone__title">连接社媒与云端数据源</h3>
          <p className="import-zone__desc">一键授权提取您的过往状态、网络记忆与日常谈吐风格</p>
          <div className="social-buttons">
            <button className="btn-social btn-wechat" onClick={() => handleSocialSync("WeChat 朋友圈")}>微信 / WeChat</button>
            <button className="btn-social btn-xiaohongshu" onClick={() => handleSocialSync("小红书 / RED")}>小红书 / RED</button>
            <button className="btn-social btn-twitter" onClick={() => handleSocialSync("Twitter / X")}>Twitter / X</button>
            <button className="btn-social btn-instagram" onClick={() => handleSocialSync("Instagram")}>Instagram</button>
            <button className="btn-social btn-youtube" onClick={() => handleSocialSync("YouTube")}>YouTube</button>
            <button className="btn-social btn-notion" onClick={() => handleSocialSync("Notion 笔记库")}>Notion 宇宙</button>
          </div>
        </div>
      </div>

      {/* Memory Timeline Grid */}
      <div className="memory-grid">
        {memories.map((mem) => (
          <div key={mem.id} className="memory-card">
            <div className="memory-card__header">
              <span className={`memory-type-icon type-${mem.type}`}></span>
              <span className="memory-date">{mem.date}</span>
              <button className="btn-forget" onClick={() => handleDelete(mem.id)} title="从分身核心中抹除">
                忘却 (Purge)
              </button>
            </div>
            
            <p className="memory-content">{mem.content}</p>
            
            <div className="memory-tags">
              {mem.tags.map(tag => (
                <span key={tag} className="memory-tag">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
