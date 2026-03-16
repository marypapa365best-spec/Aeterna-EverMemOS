import React, { useEffect, useState, useRef } from "react";

interface CemeteryConfig {
  id: string;
  style: string;
  moodTags: string[];
  coreElements: string;
  epitaph: string;
  createdAt: string;
  imageUrl?: string;
}

type RitualType = "drink" | "candle" | "message";

interface RitualLog {
  id: string;
  type: RitualType;
  from: string;
  message?: string;
  createdAt: string;
}

const STORAGE_KEY = "twin_digital_cemetery_config";
const RITUAL_KEY = "twin_digital_cemetery_rituals";

function loadConfig(): CemeteryConfig | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CemeteryConfig;
  } catch {
    return null;
  }
}

function saveConfig(cfg: CemeteryConfig | null) {
  try {
    if (!cfg) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    }
  } catch {
    // ignore
  }
}

function loadRituals(): RitualLog[] {
  try {
    const raw = window.localStorage.getItem(RITUAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RitualLog[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRituals(list: RitualLog[]) {
  try {
    window.localStorage.setItem(RITUAL_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

const MOOD_OPTIONS = ["温柔", "宁静", "科幻", "童话", "极简", "哥特"];
// 预置场景图片：场景 2 作为默认，场景 1 为备选
const BASE_SCENE_IMAGES = ["/digital-cemetery-preview-2.png", "/digital-cemetery-preview.png"];

export const DigitalCemetery: React.FC = () => {
  const [stylePreset, setStylePreset] = useState("极简白色纪念墙");
  const [moodTags, setMoodTags] = useState<string[]>(["宁静"]);
  const [coreElements, setCoreElements] = useState("");
  const [epitaph, setEpitaph] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<CemeteryConfig | null>(() => loadConfig());
  const [visitorName] = useState("AI 好友");
  const [ritualMessage, setRitualMessage] = useState("");
  const [rituals, setRituals] = useState<RitualLog[]>(() => loadRituals());
  const [activeAnim, setActiveAnim] = useState<RitualType | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [customSceneUrl, setCustomSceneUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveRituals(rituals);
  }, [rituals]);

  useEffect(() => {
    if (config) saveConfig(config);
  }, [config]);

  const sceneImages = customSceneUrl ? [...BASE_SCENE_IMAGES, customSceneUrl] : BASE_SCENE_IMAGES;

  const handleSceneFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomSceneUrl(url);
    // 将新上传图片作为场景 3 并立即选中
    setSceneIndex((customSceneUrl ? [...BASE_SCENE_IMAGES, customSceneUrl] : BASE_SCENE_IMAGES).length);
  };

  const toggleMood = (tag: string) => {
    setMoodTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleGenerate = () => {
    setLoading(true);
    const now = new Date();
    const next: CemeteryConfig = {
      id: "cem-" + now.getTime(),
      style: stylePreset,
      moodTags,
      coreElements: coreElements.trim(),
      epitaph: epitaph.trim(),
      createdAt: now.toISOString(),
      // 当前 Demo：使用本地预置的数字墓地图像（默认使用场景 2）
      imageUrl: BASE_SCENE_IMAGES[0],
    };
    // 模拟生成时间
    setTimeout(() => {
      setConfig(next);
      setLoading(false);
    }, 1200);
  };

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const appendRitual = (type: RitualType, message?: string) => {
    const now = new Date();
    const log: RitualLog = {
      id: "rit-" + now.getTime(),
      type,
      from: visitorName.trim() || "访客",
      message: message?.trim() || undefined,
      createdAt: now.toISOString(),
    };
    setRituals((prev) => [log, ...prev].slice(0, 20));

    // 触发短暂动画（喝一杯 3 秒，点灯 5 秒）
    if (type === "drink") {
      setActiveAnim("drink");
      setTimeout(() => setActiveAnim(null), 3000);
    } else if (type === "candle") {
      setActiveAnim("candle");
      setTimeout(() => setActiveAnim(null), 5000);
    }
  };

  const renderRitualText = (r: RitualLog) => {
    const timeStr = formatTime(r.createdAt);
    const who = r.from;
    if (r.type === "drink") {
      return `${timeStr} · ${who} · 🍺 和你喝了一杯酒。`;
    }
    if (r.type === "candle") {
      return `${timeStr} · ${who} · 🕯️ 点亮了一盏灯。`;
    }
    const msg = r.message ? `“${r.message}”` : "";
    return `${timeStr} · ${who} · 💬 ${msg}`;
  };

  return (
    <div className="dc-container">
      {/* 本地上传自定义场景图片（场景 3） */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleSceneFileChange}
      />
      <div className="dc-header">
        <h2 className="dc-title">数字墓地 · Digital Memorial</h2>
        <p className="dc-subtitle">
          在真正离开世界之前，先为自己在数字世界准备一处安静的角落，让关心你的人有地可去。
        </p>
      </div>

      <div className="dc-layout">
        {/* 左侧：您的数字墓地预览 + 重新设计 */}
        <div className="dc-left-column">
          <div className="dc-preview">
          <h3 className="dc-section-title">您的数字墓地</h3>
          {loading && (
            <div className="dc-preview-empty">
              <p>正在为你渲染数字墓地场景…</p>
            </div>
          )}
          {!loading && (
            <div className="dc-preview-card">
              <div className="dc-preview-image">
                <img src={sceneImages[sceneIndex] || sceneImages[0]} className="dc-preview-img" alt="" />
                {activeAnim === "drink" && (
                  <div className="dc-anim-overlay dc-anim-drink">
                    <span className="dc-anim-glass dc-anim-glass-left">🍺</span>
                    <span className="dc-anim-glass dc-anim-glass-right">🍺</span>
                  </div>
                )}
                {activeAnim === "candle" && (
                  <div className="dc-anim-overlay dc-anim-candle">
                    <span className="dc-anim-candle-icon">🕯️</span>
                  </div>
                )}
              </div>
              <div className="dc-scene-switch">
                {sceneImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={
                      "dc-scene-dot" + (sceneIndex === idx ? " dc-scene-dot--active" : "")
                    }
                    onClick={() => setSceneIndex(idx)}
                  >
                    场景{idx + 1}
                  </button>
                ))}
              </div>
              <div className="dc-preview-meta">
                <div className="dc-preview-style-row">
                  <p className="dc-preview-style">
                    {config
                      ? `风格：${config.style} · 氛围：${config.moodTags.join("，") || "未选择"}`
                      : "还未生成场景，可在右侧填写风格后点击「生成」"}
                  </p>
                  <button
                    type="button"
                    className="dc-btn-secondary"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    更换场景
                  </button>
                </div>
                {config?.epitaph && (
                  <p className="dc-preview-epitaph">墓志铭：「{config.epitaph}」</p>
                )}
                {config?.coreElements && (
                  <p className="dc-preview-core">
                    核心元素设定：{config.coreElements}
                  </p>
                )}
                <p className="dc-preview-footer">
                  说明：未来朋友来数字世界祭扫时，可以优先使用这一画面作为入口场景。
                </p>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* 右侧：祭扫互动 */}
        <div className="dc-preview">
          <h3 className="dc-section-title">祭扫互动</h3>
          <div className="dc-ritual-panel">
            <div className="dc-ritual-buttons">
              <button
                type="button"
                className="dc-btn-ritual"
                onClick={() => appendRitual("drink")}
              >
                <span>🍺 和 TA 喝一杯</span>
              </button>
              <button
                type="button"
                className="dc-btn-ritual"
                onClick={() => appendRitual("candle")}
              >
                <span>🕯️ 点一盏灯</span>
              </button>
            </div>
            <div className="dc-form-row">
              <label className="dc-label">💬 留一句话</label>
              <div className="dc-message-row">
                <input
                  className="dc-input"
                  placeholder="今天又来看你了，我很好，你放心。"
                  value={ritualMessage}
                  onChange={(e) => setRitualMessage(e.target.value)}
                />
                <button
                  type="button"
                  className="dc-btn-ritual"
                  disabled={!ritualMessage.trim()}
                  onClick={() => {
                    if (!ritualMessage.trim()) return;
                    appendRitual("message", ritualMessage);
                    setRitualMessage("");
                  }}
                >
                  <span>发送</span>
                </button>
              </div>
            </div>
            <div className="dc-ritual-timeline">
              <h5 className="dc-ritual-subtitle">最近的纪念互动</h5>
              {rituals.length === 0 ? (
                <p className="dc-ritual-empty">还没有人来这里祭扫，可以作为评委体验时的互动示例。</p>
              ) : (
                <ul className="dc-ritual-list">
                  {rituals.map((r) => (
                    <li key={r.id} className="dc-ritual-item">
                      {renderRitualText(r)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

