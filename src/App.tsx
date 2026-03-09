import React, { useState } from "react";
import { PersonalityWizard } from "./components/PersonalityWizard";
import { EvolutionChat } from "./components/EvolutionChat";
import { MemoryVault } from "./components/MemoryVault";
import { CloudMemoryView } from "./components/CloudMemoryView";
import { SkillWorkshop } from "./components/SkillWorkshop";
import { PresetTwins } from "./components/PresetTwins";
import { AISocialMaster } from "./components/AISocialMaster";
import { TwinStudio } from "./components/TwinStudio";
import { getStoredApiKey, setStoredApiKey, getStoredDisplayName, setStoredDisplayName, getStoredGeminiApiKey, setStoredGeminiApiKey, getStoredOpenAIApiKey, setStoredOpenAIApiKey } from "./api/twinApi";

type TabType = "studio" | "wizard" | "evo-chat" | "memory" | "cloud" | "skills" | "presets" | "aisocial";

export const App: React.FC = () => {
  const [tab, setTab] = useState<TabType>("studio");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredApiKey() ?? "");
  const [displayNameInput, setDisplayNameInput] = useState(() => getStoredDisplayName() ?? "");
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(() => getStoredGeminiApiKey() ?? "");
  const [openaiApiKeyInput, setOpenaiApiKeyInput] = useState(() => getStoredOpenAIApiKey() ?? "");
  const [headerLabel, setHeaderLabel] = useState(() => {
    const key = getStoredApiKey();
    const name = getStoredDisplayName();
    if (!key) return null;
    return name || "已连接";
  });
  const twinId = "demo-twin-001";

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKeyInput || null);
    setStoredDisplayName(displayNameInput || null);
    setStoredGeminiApiKey(geminiApiKeyInput || null);
    setStoredOpenAIApiKey(openaiApiKeyInput || null);
    setHeaderLabel(apiKeyInput ? (displayNameInput?.trim() || "已连接") : null);
    setSettingsOpen(false);
  };

  const handleLogout = () => {
    setStoredApiKey(null);
    setStoredDisplayName(null);
    setStoredGeminiApiKey(null);
    setStoredOpenAIApiKey(null);
    setHeaderLabel(null);
  };

  const openSettings = () => {
    setSettingsOpen(true);
    setApiKeyInput(getStoredApiKey() ?? "");
    setDisplayNameInput(getStoredDisplayName() ?? "");
    setGeminiApiKeyInput(getStoredGeminiApiKey() ?? "");
    setOpenaiApiKeyInput(getStoredOpenAIApiKey() ?? "");
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="logo">Personal Digital Twin</div>
        <div className="subtitle">分身性格升级向导 + 记忆聊天</div>
        <div className="app-header__user">
          {headerLabel && (
            <>
              <span className="app-header__user-name" title="已连接 EverMemOS">
                {headerLabel}
              </span>
              <button type="button" className="app-header__logout" onClick={handleLogout} title="清除 API Key，退出当前账号">
                退出
              </button>
            </>
          )}
          <button
            type="button"
            className="app-header__settings"
            onClick={openSettings}
            title="设置 EverMemOS / 大模型 API Key"
          >
            设置
          </button>
        </div>
      </header>
      {settingsOpen && (
        <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="settings-modal settings-modal--wide" onClick={(e) => e.stopPropagation()}>
            <h3>设置</h3>

            <section className="settings-section">
              <label className="settings-label">显示名称（选填，显示在右上角）</label>
              <input
                type="text"
                className="settings-input"
                placeholder="例如：评委小明"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
              />
            </section>

            <section className="settings-section">
              <h4 className="settings-section-title">API Key</h4>
              <label className="settings-label">EverMemOS（记忆云端）</label>
              <p className="settings-desc">
                人格向导提交的配置会保存到您的 EverMemOS 账号。
                <a href="https://console.evermind.ai/api-keys" target="_blank" rel="noopener noreferrer">在此免费创建</a>
              </p>
              <input
                type="password"
                className="settings-input"
                placeholder="EverMemOS API Key"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <label className="settings-label">OpenAI（分身对话）</label>
              <p className="settings-desc">
                进化聊天室对话可用 OpenAI 模型。Key 仅发往本应用后端。
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">在此创建 OpenAI API Key</a>
              </p>
              <input
                type="password"
                className="settings-input"
                placeholder="OpenAI API Key"
                value={openaiApiKeyInput}
                onChange={(e) => setOpenaiApiKeyInput(e.target.value)}
              />
              <label className="settings-label">Gemini（分身对话）</label>
              <p className="settings-desc">
                进化聊天室对话也可用 Google Gemini。
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">在此免费创建 Gemini Key</a>
              </p>
              <input
                type="password"
                className="settings-input"
                placeholder="Gemini API Key"
                value={geminiApiKeyInput}
                onChange={(e) => setGeminiApiKeyInput(e.target.value)}
              />
            </section>

            <div className="settings-actions">
              <button type="button" onClick={() => setSettingsOpen(false)}>取消</button>
              <button type="button" onClick={handleSaveApiKey}>保存</button>
            </div>
          </div>
        </div>
      )}
      <main className="app-main">
        <div className="tabs">
          <button
            className={["tab", tab === "wizard" ? "tab--active" : ""].filter(Boolean).join(" ")}
            onClick={() => setTab("wizard")}
          >
            灵魂拷贝
          </button>
          <button
            className={["tab", tab === "memory" ? "tab--active" : ""].filter(Boolean).join(" ")}
            onClick={() => setTab("memory")}
          >
            📂 记忆碎片
          </button>
          <button
            className={["tab", tab === "cloud" ? "tab--active" : ""].filter(Boolean).join(" ")}
            onClick={() => setTab("cloud")}
          >
            ☁️ 云端记忆
          </button>
          <button
            className={["tab", tab === "skills" ? "tab--active" : ""].filter(Boolean).join(" ")}
            onClick={() => setTab("skills")}
          >
            🛠️ 能力工坊
          </button>
          <button
            className={["tab", tab === "presets" ? "tab--active" : ""].filter(Boolean).join(" ")}
            onClick={() => setTab("presets")}
          >
            👥 辅助智囊团
          </button>
          <button
            className={["tab", tab === "studio" ? "tab--active" : ""].filter(Boolean).join(" ")}
            onClick={() => setTab("studio")}
            style={{ fontWeight: "bold", color: tab === "studio" ? "inherit" : "#8b5cf6" }}
          >
            ⚙️ 分身养成中心
          </button>
          <button
            className={["tab", tab === "evo-chat" ? "tab--active" : ""].filter(Boolean).join(" ")}
            onClick={() => setTab("evo-chat")}
          >
            💬 进化聊天室
          </button>
          <button
            className={["tab", tab === "aisocial" ? "tab--active" : ""].filter(Boolean).join(" ")}
            onClick={() => setTab("aisocial")}
          >
            🌐 AI 社交
          </button>
        </div>
        {tab === "studio" && (
          <TwinStudio
            onNavigateToWorkshop={() => setTab("skills")}
            onNavigateToMemoryVault={() => setTab("memory")}
          />
        )}
        {tab === "wizard" && <PersonalityWizard twinId={twinId} />}
        {tab === "evo-chat" && <EvolutionChat twinId={twinId} onNavigateToPresets={() => setTab("presets")} />}
        {tab === "memory" && <MemoryVault />}
        {tab === "cloud" && <CloudMemoryView twinId={twinId} />}
        {tab === "skills" && <SkillWorkshop />}
        {tab === "presets" && <PresetTwins />}
        {tab === "aisocial" && <AISocialMaster />}
      </main>
    </div>
  );
};

