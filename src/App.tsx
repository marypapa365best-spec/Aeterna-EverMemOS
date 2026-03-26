import React, { useEffect, useState } from "react";
import { PersonalityWizard } from "./components/PersonalityWizard";
import { EvolutionChat } from "./components/EvolutionChat";
import { MemoryVault } from "./components/MemoryVault";
import { CloudMemoryView } from "./components/CloudMemoryView";
import { SkillWorkshop } from "./components/SkillWorkshop";
import { AISocialMaster } from "./components/AISocialMaster";
import { UnspokenWords } from "./components/UnspokenWords";
import { Memoir } from "./components/Memoir";
import { DigitalCemetery } from "./components/DigitalCemetery";
import { TwinStudio } from "./components/TwinStudio";
import { getStoredApiKey, setStoredApiKey, getStoredDisplayName, setStoredDisplayName, getStoredGeminiApiKey, setStoredGeminiApiKey, getStoredOpenAIApiKey, setStoredOpenAIApiKey, getStoredLlmProvider, setStoredLlmProvider, getEffectiveLlmApiKey, type LlmProvider, getDemoSoulConfig } from "./api/twinApi";

type TabType = "studio" | "wizard" | "evo-chat" | "memory" | "cloud" | "skills" | "aisocial" | "unspoken" | "memoir" | "cemetery";

export const App: React.FC = () => {
  const [tab, setTab] = useState<TabType>("studio");
  const [wizardInitialLevel, setWizardInitialLevel] = useState<number | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredApiKey() ?? "");
  const [displayNameInput, setDisplayNameInput] = useState(() => getStoredDisplayName() ?? "");
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(() => getStoredGeminiApiKey() ?? "");
  const [openaiApiKeyInput, setOpenaiApiKeyInput] = useState(() => getStoredOpenAIApiKey() ?? "");
  const [llmProvider, setLlmProvider] = useState<LlmProvider>(() => getStoredLlmProvider());
  const [headerLabel, setHeaderLabel] = useState(() => {
    const key = getStoredApiKey();
    const name = getStoredDisplayName();
    if (!key) return null;
    return name || "已连接";
  });
  const twinId = "demo-twin-001";

  // 评委打开时从服务器拉取 Demo 灵魂配置，写入 localStorage，供分身养成中心与聊天记忆使用
  useEffect(() => {
    getDemoSoulConfig().then((data) => {
      if (!data.formState || Object.keys(data.formState).length === 0) return;
      try {
        for (let level = 1; level <= 6; level++) {
          const fromServer = data.formState[level];
          if (fromServer && typeof fromServer === "object") {
            localStorage.setItem(`twin_soul_level_${level}_keywords`, JSON.stringify(fromServer));
          }
        }
      } catch {
        // ignore
      }
    });
  }, []);

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKeyInput || null);
    setStoredDisplayName(displayNameInput || null);
    setStoredLlmProvider(llmProvider);
    setStoredGeminiApiKey(geminiApiKeyInput || null);
    setStoredOpenAIApiKey(openaiApiKeyInput || null);
    setHeaderLabel(apiKeyInput ? (displayNameInput?.trim() || "已连接") : null);
    setSettingsOpen(false);
  };

  const handleLogout = () => {
    setStoredApiKey(null);
    setStoredDisplayName(null);
    setStoredLlmProvider("openai");
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
    setLlmProvider(getStoredLlmProvider());
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="logo">
          <img src="/logo/infinity.png" alt="Aeterna · 数字永生 Logo" className="logo-icon" />
          <div className="logo-text">
            <div className="logo-text-en">Aeterna</div>
            <div className="logo-text-zh">数字永生</div>
          </div>
        </div>
        <div className="app-header__user">
          {headerLabel && (
            <div className="app-header__user-badge">
              <span className="app-header__user-name" title="已连接 EverMemOS">
                {headerLabel}
              </span>
              <button
                type="button"
                className="app-header__logout"
                onClick={handleLogout}
                title="清除 API Key，退出当前账号"
              >
                退出
              </button>
            </div>
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
            <div className="settings-modal__body">
              <div className="settings-modal__main">
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
                  <div className="settings-label-row">
                    <label className="settings-label">EverMemOS（记忆云端）<span className="settings-required">*</span></label>
                    <span className={`settings-inline-status ${getStoredApiKey() ? "settings-inline-status--on" : ""}`}>
                      <span className={`settings-status-dot ${getStoredApiKey() ? "settings-status-dot--on" : ""}`} />
                      {getStoredApiKey() ? "应用中" : "未连接"}
                    </span>
                  </div>
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
                  <div className="settings-label-row">
                    <label className="settings-label">大模型 API（二选一）<span className="settings-required">*</span></label>
                    <span className={`settings-inline-status ${getEffectiveLlmApiKey() ? "settings-inline-status--on" : ""}`}>
                      <span className={`settings-status-dot ${getEffectiveLlmApiKey() ? "settings-status-dot--on" : ""}`} />
                      {getEffectiveLlmApiKey() ? "应用中" : "未连接"}
                    </span>
                  </div>
                  <p className="settings-desc">
                    进化聊天室与分身对话仅使用当前选中的一种。
                  </p>
                  <div className="settings-llm-radio">
                    <label className="settings-radio-label">
                      <input
                        type="radio"
                        name="llmProvider"
                        checked={llmProvider === "openai"}
                        onChange={() => setLlmProvider("openai")}
                      />
                      <span>OpenAI</span>
                    </label>
                    <label className="settings-radio-label">
                      <input
                        type="radio"
                        name="llmProvider"
                        checked={llmProvider === "gemini"}
                        onChange={() => setLlmProvider("gemini")}
                      />
                      <span>Gemini</span>
                    </label>
                  </div>
                  {llmProvider === "openai" && (
                    <>
                      <p className="settings-desc">
                        Key 仅发往本应用后端。
                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">在此创建 OpenAI API Key</a>
                      </p>
                      <input
                        type="password"
                        className="settings-input"
                        placeholder="OpenAI API Key"
                        value={openaiApiKeyInput}
                        onChange={(e) => setOpenaiApiKeyInput(e.target.value)}
                      />
                    </>
                  )}
                  {llmProvider === "gemini" && (
                    <>
                      <p className="settings-desc">
                        Key 由浏览器直连 Google，不经过本应用后端。
                        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">在此免费创建 Gemini Key</a>
                      </p>
                      <input
                        type="password"
                        className="settings-input"
                        placeholder="Gemini API Key"
                        value={geminiApiKeyInput}
                        onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                      />
                    </>
                  )}
                </section>

                <div className="settings-actions">
                  <button type="button" onClick={() => setSettingsOpen(false)}>取消</button>
                  <button type="button" onClick={handleSaveApiKey}>保存</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <main className="app-main">
        <div className="app-layout">
          <aside className="app-sidebar">
            <button
              className={["tab", "tab--sidebar", tab === "wizard" ? "tab--active" : ""].filter(Boolean).join(" ")}
              onClick={() => setTab("wizard")}
            >
              <span className="tab__icon">🧪</span>
              <span className="tab__label">灵魂拷贝</span>
            </button>
            <button
              className={["tab", "tab--sidebar", tab === "memory" ? "tab--active" : ""].filter(Boolean).join(" ")}
              onClick={() => setTab("memory")}
            >
              <span className="tab__icon">📂</span>
              <span className="tab__label">记忆碎片</span>
            </button>
            <button
              className={["tab", "tab--sidebar", tab === "cloud" ? "tab--active" : ""].filter(Boolean).join(" ")}
              onClick={() => setTab("cloud")}
            >
              <span className="tab__icon">☁️</span>
              <span className="tab__label">云端记忆</span>
            </button>
            <button
              className={["tab", "tab--sidebar", tab === "studio" ? "tab--active" : ""].filter(Boolean).join(" ")}
              onClick={() => setTab("studio")}
            >
              <span className="tab__icon">⚙️</span>
              <span className="tab__label">分身养成中心</span>
            </button>
            <button
              className={["tab", "tab--sidebar", tab === "skills" ? "tab--active" : ""].filter(Boolean).join(" ")}
              onClick={() => setTab("skills")}
            >
              <span className="tab__icon">🛠️</span>
              <span className="tab__label">能力工坊</span>
            </button>
            <button
              className={["tab", "tab--sidebar", tab === "evo-chat" ? "tab--active" : ""].filter(Boolean).join(" ")}
              onClick={() => setTab("evo-chat")}
            >
              <span className="tab__icon">💬</span>
              <span className="tab__label">进化聊天室</span>
            </button>
            <button
              className={["tab", "tab--sidebar", tab === "aisocial" ? "tab--active" : ""].filter(Boolean).join(" ")}
              onClick={() => setTab("aisocial")}
            >
              <span className="tab__icon">🌐</span>
              <span className="tab__label">AI 社交</span>
            </button>
            <button
              className={["tab", "tab--sidebar", tab === "unspoken" ? "tab--active" : ""].filter(Boolean).join(" ")}
              onClick={() => setTab("unspoken")}
            >
              <span className="tab__icon">🕰️</span>
              <span className="tab__label">未尽之言</span>
            </button>
            <button
              className={["tab", "tab--sidebar", tab === "memoir" ? "tab--active" : ""].filter(Boolean).join(" ")}
              onClick={() => setTab("memoir")}
            >
              <span className="tab__icon">📔</span>
              <span className="tab__label">回忆录</span>
            </button>
            <button
              className={["tab", "tab--sidebar", tab === "cemetery" ? "tab--active" : ""].filter(Boolean).join(" ")}
              onClick={() => setTab("cemetery")}
            >
              <span className="tab__icon">🪦</span>
              <span className="tab__label">数字墓地</span>
            </button>
          </aside>
          <section className="app-content">
            {tab === "studio" && (
              <TwinStudio
                onNavigateToWorkshop={() => setTab("skills")}
                onNavigateToMemoryVault={() => setTab("memory")}
                onNavigateToWizard={(level) => { setWizardInitialLevel(level); setTab("wizard"); }}
              />
            )}
            {tab === "wizard" && <PersonalityWizard twinId={twinId} initialLevel={wizardInitialLevel} />}
            {tab === "evo-chat" && <EvolutionChat twinId={twinId} onNavigateToPresets={() => setTab("presets")} />}
            {tab === "memory" && <MemoryVault />}
            {tab === "cloud" && <CloudMemoryView twinId={twinId} />}
            {tab === "skills" && (
              <SkillWorkshop
                onActivateSkill={() => setTab("evo-chat")}
              />
            )}
            {tab === "aisocial" && <AISocialMaster />}
            {tab === "unspoken" && <UnspokenWords />}
            {tab === "memoir" && <Memoir />}
            {tab === "cemetery" && <DigitalCemetery />}
          </section>
        </div>
      </main>
    </div>
  );
};

