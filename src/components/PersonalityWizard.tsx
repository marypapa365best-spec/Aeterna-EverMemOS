import React, { useMemo, useState } from "react";
import {
  LevelId,
  personalityLevels,
  PersonalityField,
  PersonalityFieldOption,
  FieldType
} from "../config/personalityLevels";
import { saveTwinLevelConfig } from "../api/twinApi";

type FormValue = string | string[] | undefined;

type FormState = Record<string, FormValue>;

const TOTAL_LEVELS: LevelId = 6;

const getInitialLevel = (): LevelId => 1;

const getLevelById = (id: LevelId) =>
  personalityLevels.find((l) => l.id === id)!;

const getMaxUnlockedLevel = (completedLevel: LevelId | 0): LevelId => {
  if (completedLevel < 1) return 1;
  if (completedLevel >= TOTAL_LEVELS) return TOTAL_LEVELS;
  return ((completedLevel + 1) as LevelId);
};

const validateField = (field: PersonalityField, value: FormValue): string | null => {
  if (field.required) {
    if (field.type === "multi-select") {
      const arr = Array.isArray(value) ? value : [];
      if (arr.length === 0) {
        return "请至少选择一项。";
      }
      if (field.minSelections && arr.length < field.minSelections) {
        return `请至少选择 ${field.minSelections} 项。`;
      }
    } else if (!value || (typeof value === "string" && value.trim() === "")) {
      return "这是必填项。";
    }
  }

  if (field.type === "multi-select" && Array.isArray(value)) {
    if (field.maxSelections && value.length > field.maxSelections) {
      return `最多选择 ${field.maxSelections} 项。`;
    }
  }

  return null;
};

const LevelIndicator: React.FC<{
  current: LevelId;
  maxUnlocked: LevelId;
  completedLevel: LevelId | 0;
  theme: "classic" | "cosmic" | "cosmic-fire" | "light" | "rainbow";
  onJump: (level: LevelId) => void;
}> = ({ current, maxUnlocked, completedLevel, theme, onJump }) => {
  if (theme === "cosmic") {
    const percentage = ((current - 1) / (TOTAL_LEVELS - 1)) * 100;
    return (
      <div className="level-indicator--cosmic">
        <div className="level-indicator__track--cosmic">
          <div
            className="level-indicator__progress--cosmic"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {personalityLevels.map((level) => {
          const isActive = level.id === current;
          const isCompleted = level.id <= completedLevel && !isActive;

          return (
            <button
              key={level.id}
              type="button"
              className={[
                "level-node",
                isActive ? "level-node--active" : "",
                isCompleted ? "level-node--completed" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onJump(level.id as LevelId)}
            >
              {level.id}
            </button>
          );
        })}
      </div>
    );
  }

  if (theme === "cosmic-fire") {
    const percentage = ((current - 1) / (TOTAL_LEVELS - 1)) * 100;
    return (
      <div className="level-indicator--cosmic-fire">
        <div className="level-indicator__track--cosmic-fire">
          <div
            className="level-indicator__progress--cosmic-fire"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {personalityLevels.map((level) => {
          const isActive = level.id === current;
          const isCompleted = level.id <= completedLevel && !isActive;

          return (
            <button
              key={level.id}
              type="button"
              className={[
                "level-node level-node--fire", // Base class to swap colors
                isActive ? "level-node--active level-node--active-fire" : "",
                isCompleted ? "level-node--completed level-node--completed-fire" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onJump(level.id as LevelId)}
            >
              {level.id}
            </button>
          );
        })}
      </div>
    );
  }

  if (theme === "rainbow") {
    const percentage = ((current - 1) / (TOTAL_LEVELS - 1)) * 100;
    return (
      <div className="level-indicator level-indicator--rainbow">
        <div className="level-indicator__track--rainbow" aria-hidden />
        <div
          className="level-indicator__progress--rainbow"
          style={{ width: `${percentage}%` }}
          aria-hidden
        />
        {personalityLevels.map((level) => {
          const isActive = level.id === current;
          const isCompleted = level.id <= completedLevel && !isActive;
          const isPastOrCurrent = level.id <= current;

          return (
            <button
              key={level.id}
              type="button"
              className={[
                "level-node",
                isActive ? "level-node--active level-node--pulse" : "",
                isCompleted ? "level-node--completed" : "",
                isPastOrCurrent ? "level-node--lit" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onJump(level.id as LevelId)}
            >
              {level.id}
            </button>
          );
        })}
      </div>
    );
  }

  if (theme === "light") {
    return (
      <div className="level-indicator level-indicator--light">
        <div className="level-indicator__line" aria-hidden />
        {personalityLevels.map((level) => {
          const isActive = level.id === current;
          const isCompleted = level.id <= completedLevel && !isActive;

          return (
            <button
              key={level.id}
              type="button"
              className={[
                "level-pill",
                isActive ? "level-pill--active" : "",
                isCompleted ? "level-pill--completed" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onJump(level.id as LevelId)}
            >
              <span className="level-pill-number">{level.id}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Classic theme
  return (
    <div className="level-indicator">
      <div className="level-indicator__line" aria-hidden />
      {personalityLevels.map((level) => {
        const isActive = level.id === current;

        return (
          <button
            key={level.id}
            type="button"
            className={["level-pill", isActive ? "level-pill--active" : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onJump(level.id as LevelId)}
          >
            <span className="level-pill-number">{level.id}</span>
          </button>
        );
      })}
    </div>
  );
};

const OptionBadge: React.FC<{
  option: PersonalityFieldOption;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}> = ({ option, selected, disabled, onToggle }) => {
  return (
    <button
      type="button"
      className={[
        "option-badge",
        selected ? "option-badge--selected" : "",
        disabled ? "option-badge--disabled" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onToggle}
      disabled={disabled}
    >
      <span className="option-badge-label">{option.label}</span>
      {option.description && (
        <span className="option-badge-desc">{option.description}</span>
      )}
    </button>
  );
};

const renderFieldInput = (
  field: PersonalityField,
  value: FormValue,
  onChange: (next: FormValue) => void
) => {
  const type: FieldType = field.type;

  if (type === "text") {
    return (
      <input
        className="field-input"
        value={(value as string) ?? ""}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (type === "native-select") {
    const current = (value as string) ?? "";
    const compactIds = [
      "gender",
      "blood_type",
      "native_language",
      "birth_country",
      "birth_city"
    ];
    const isCompact = compactIds.includes(field.id);
    return (
      <select
        className={
          "field-select" + (isCompact ? " field-select--compact" : "")
        }
        value={current}
        onChange={(e) => onChange(e.target.value)}
      >
        {(field.options || []).map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (type === "date") {
    return (
      <input
        className="field-input field-input--date"
        type="date"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    );
  }

  if (type === "textarea") {
    return (
      <textarea
        className="field-textarea"
        rows={3}
        value={(value as string) ?? ""}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (type === "slider") {
    const min = field.min ?? 0;
    const max = field.max ?? 10;
    const val = value !== undefined && value !== "" ? Number(value) : min;
    return (
      <div className="field-slider-wrap">
        <input
          type="range"
          className="field-slider"
          min={min}
          max={max}
          value={val}
          onChange={(e) => onChange(String(e.target.value))}
        />
        <span className="field-slider-value">{val}</span>
      </div>
    );
  }

  if (type === "star-rating") {
    const maxStars = field.max ?? 10;
    const val =
      value !== undefined && value !== "" ? Number(value) : 0;
    const clamped = Math.min(maxStars, Math.max(0, val));
    return (
      <div className="star-rating" role="group" aria-label={field.label}>
        {Array.from({ length: maxStars }, (_, i) => {
          const fillPercent =
            clamped >= i + 1 ? 100 : clamped >= i + 0.5 ? 50 : 0;
          return (
            <button
              key={i}
              type="button"
              className="star-rating__star"
              aria-label={`${i + 0.5} 星`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const isLeft = x < rect.width / 2;
                onChange(String(i + (isLeft ? 0.5 : 1)));
              }}
            >
              <span className="star-rating__empty">☆</span>
              <span
                className="star-rating__fill"
                style={{ width: `${fillPercent}%` }}
              >
                ★
              </span>
            </button>
          );
        })}
        <span className="star-rating__value">{clamped}</span>
      </div>
    );
  }

  if (type === "color") {
    return (
      <input
        type="color"
        className="field-color"
        value={(value as string) ?? "#6366f1"}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (type === "single-select") {
    const current = (value as string) ?? "";
    return (
      <div className="field-options">
        {field.options?.map((option) => (
          <OptionBadge
            key={option.id}
            option={option}
            selected={current === option.id}
            onToggle={() => onChange(String(option.id))}
          />
        ))}
      </div>
    );
  }

  if (type === "multi-select") {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="field-options">
        {field.options?.map((option) => {
          const selected = arr.includes(option.id);
          const overLimit =
            !selected &&
            !!field.maxSelections &&
            arr.length >= field.maxSelections;
          return (
            <OptionBadge
              key={option.id}
              option={option}
              selected={selected}
              disabled={overLimit}
              onToggle={() => {
                if (selected) {
                  onChange(arr.filter((id) => id !== option.id));
                } else {
                  onChange([...arr, option.id]);
                }
              }}
            />
          );
        })}
      </div>
    );
  }

  return null;
};

interface PersonalityWizardProps {
  twinId: string;
  embedded?: boolean;
}

export const PersonalityWizard: React.FC<PersonalityWizardProps> = ({
  twinId,
  embedded = false
}) => {
  const [theme, setTheme] = useState<"classic" | "cosmic" | "cosmic-fire" | "light" | "rainbow">("cosmic-fire");
  const [currentLevel, setCurrentLevel] = useState<LevelId>(getInitialLevel);
  const [completedLevel, setCompletedLevel] = useState<LevelId | 0>(0);
  const [formState, setFormState] = useState<Record<LevelId, FormState>>({
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
    6: {}
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [memoryFragmentsLv2, setMemoryFragmentsLv2] = useState<string[]>([]);

  const level = useMemo(
    () => getLevelById(currentLevel),
    [currentLevel]
  );

  const maxUnlocked = useMemo(
    () => getMaxUnlockedLevel(completedLevel),
    [completedLevel]
  );

  const currentValues = formState[currentLevel];

  const handleFieldChange = (fieldId: string, value: FormValue) => {
    setFormState((prev) => ({
      ...prev,
      [currentLevel]: {
        ...prev[currentLevel],
        [fieldId]: value
      }
    }));
    setErrors((prev) => ({
      ...prev,
      [`${currentLevel}.${fieldId}`]: null
    }));
  };

  /** 仅做非必填校验：只校验多选上限等，不因必填项阻止保存。填多少保存多少。 */
  const validateNonRequired = (field: PersonalityField, value: FormValue): string | null => {
    if (field.type === "multi-select" && Array.isArray(value)) {
      if (field.maxSelections != null && value.length > field.maxSelections) {
        return `最多选择 ${field.maxSelections} 项。`;
      }
    }
    return null;
  };

  /** 同步至云端：不校验必填，当前关卡填了多少就保存多少，随时可点。 */
  const handleSyncToCloud = async () => {
    const newErrors: Record<string, string | null> = {};
    for (const field of level.fields) {
      const value = currentValues[field.id];
      const err = validateNonRequired(field, value);
      if (err) newErrors[`${currentLevel}.${field.id}`] = err;
    }
    const hasError = Object.values(newErrors).some(Boolean);
    if (hasError) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    let payload: Record<string, unknown> = { ...currentValues } as Record<string, unknown>;
    if (currentLevel === 2 && memoryFragmentsLv2.length > 0) {
      payload = { ...payload, memory_fragments: memoryFragmentsLv2 };
    }
    try {
      await saveTwinLevelConfig({
        twinId,
        levelId: currentLevel,
        data: payload,
      });
      setCompletedLevel((prev) => (currentLevel > prev ? currentLevel : prev));
      alert("已同步至云端。");
    } catch (e) {
      alert(e instanceof Error ? e.message : "同步失败，请检查是否已在「设置」中配置 EverMemOS API Key，或稍后再试。");
    }
  };

  /** 提交当前关卡并进入下一关：同样不校验必填，填多少保存多少。 */
  const handleSubmitLevel = async () => {
    const newErrors: Record<string, string | null> = {};
    for (const field of level.fields) {
      const value = currentValues[field.id];
      const err = validateNonRequired(field, value);
      if (err) newErrors[`${currentLevel}.${field.id}`] = err;
    }
    const hasError = Object.values(newErrors).some(Boolean);
    if (hasError) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    let payload: Record<string, unknown> = { ...currentValues } as Record<string, unknown>;
    if (currentLevel === 2 && memoryFragmentsLv2.length > 0) {
      payload = { ...payload, memory_fragments: memoryFragmentsLv2 };
    }
    try {
      await saveTwinLevelConfig({
        twinId,
        levelId: currentLevel,
        data: payload,
      });
      if (currentLevel === 2) {
        alert("童年碎片已拼合，分身正在感知你的起源。");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败，请检查是否已在「设置」中配置 EverMemOS API Key，或稍后再试。");
      return;
    }

    setCompletedLevel((prev) => (currentLevel > prev ? currentLevel : prev));
    const nextLevelId =
      currentLevel < TOTAL_LEVELS ? ((currentLevel + 1) as LevelId) : currentLevel;
    if (nextLevelId !== currentLevel) {
      setCurrentLevel(nextLevelId);
    }
  };

  const handleJump = (levelId: LevelId) => {
    setCurrentLevel(levelId);
  };

  const overallProgress = useMemo(() => {
    return (completedLevel / TOTAL_LEVELS) * 100;
  }, [completedLevel]);

  const stage1Progress = useMemo(() => {
    if (currentLevel !== 1) return 0;
    const lv1Fields = getLevelById(1).fields;
    const filled = lv1Fields.filter((f) => {
      const v = formState[1][f.id];
      if (f.type === "textarea" || f.type === "text") return !!v && String(v).trim() !== "";
      return v !== undefined && v !== "";
    }).length;
    return Math.min(20, Math.round((filled / lv1Fields.length) * 20));
  }, [currentLevel, formState]);

  const stage2Progress =
    currentLevel === 2
      ? (() => {
        const lv2 = getLevelById(2);
        const filled = lv2.fields.filter((f) => {
          const v = formState[2][f.id];
          if (f.type === "textarea" || f.type === "text")
            return !!v && String(v).trim() !== "";
          return v !== undefined && v !== "";
        }).length;
        return Math.min(20, Math.round((filled / lv2.fields.length) * 20));
      })()
      : 0;

  const stage3Progress =
    currentLevel === 3
      ? (() => {
        const lv3 = getLevelById(3);
        const filled = lv3.fields.filter((f) => {
          const v = formState[3][f.id];
          if (f.type === "textarea" || f.type === "text")
            return !!v && String(v).trim() !== "";
          return v !== undefined && v !== "";
        }).length;
        return Math.min(20, Math.round((filled / lv3.fields.length) * 20));
      })()
      : 0;

  const stage4Progress =
    currentLevel === 4
      ? (() => {
        const lv4 = getLevelById(4);
        const filled = lv4.fields.filter((f) => {
          const v = formState[4][f.id];
          if (f.type === "textarea" || f.type === "text")
            return !!v && String(v).trim() !== "";
          return v !== undefined && v !== "";
        }).length;
        return Math.min(20, Math.round((filled / lv4.fields.length) * 20));
      })()
      : 0;

  const stage5Progress =
    currentLevel === 5
      ? (() => {
        const lv5 = getLevelById(5);
        const filled = lv5.fields.filter((f) => {
          const v = formState[5][f.id];
          if (f.type === "textarea" || f.type === "text")
            return !!v && String(v).trim() !== "";
          return v !== undefined && v !== "";
        }).length;
        return Math.min(20, Math.round((filled / lv5.fields.length) * 20));
      })()
      : 0;

  const stage6Progress =
    currentLevel === 6
      ? (() => {
        const lv6 = getLevelById(6);
        const filled = lv6.fields.filter((f) => {
          const v = formState[6][f.id];
          if (f.type === "textarea" || f.type === "text")
            return !!v && String(v).trim() !== "";
          return v !== undefined && v !== "";
        }).length;
        return Math.min(20, Math.round((filled / lv6.fields.length) * 20));
      })()
      : 0;

  return (
    <div className="wizard-root">
      {!embedded && (
        <div className="wizard-header wizard-header--stacked">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "16px" }}>
            <h1 className="wizard-header__main-title" style={{ margin: 0 }}>灵魂拷贝进度 · 全局人格基底</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label htmlFor="theme-select" style={{ fontSize: "12px", color: "#6b7280" }}>主题 Theme:</label>
              <select
                id="theme-select"
                className="theme-select"
                value={theme}
                onChange={(e) => {
                  setTheme(e.target.value as "classic" | "cosmic" | "cosmic-fire" | "light" | "rainbow");
                  e.target.blur(); // Remove focus immediately after selection
                }}
                onKeyDown={(e) => {
                  // Prevent arrow keys from firing the internal select change mechanism
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                  }
                }}
              >
                <option value="cosmic-fire">宇宙能量节点 - 炽红</option>
                <option value="rainbow">彩虹波谱 (Rainbow Energy)</option>
                <option value="light">极简净白 (推荐)</option>
                <option value="cosmic">宇宙能量节点 - 幽蓝</option>
                <option value="classic">经典原版</option>
              </select>
            </div>
          </div>
          <LevelIndicator
            current={currentLevel}
            maxUnlocked={maxUnlocked}
            completedLevel={completedLevel}
            theme={theme}
            onJump={handleJump}
          />
          <div className="wizard-title-block">
            <h2 className="wizard-title">{level.title}</h2>
            <p className="wizard-subtitle">{level.intro}</p>
            {level.progressHint && (
              <p className="wizard-progress-hint">{level.progressHint}</p>
            )}
          </div>
        </div>
      )}

      <div
        className={
          currentLevel === 1 || currentLevel === 2 || currentLevel === 3 || currentLevel === 4 || currentLevel === 5 || currentLevel === 6
            ? "wizard-body wizard-body--stage1"
            : "wizard-body"
        }
      >
        {currentLevel === 1 ? (
          <>
            <section className="status-pod status-pod--lv1">
              <div className="status-pod__progress">
                <div className="status-pod__progress-bar">
                  <div
                    className="status-pod__progress-fill"
                    style={{ width: `${stage1Progress * 5}%` }}
                  />
                </div>
                <div className="status-pod__progress-label">
                  完成度 {stage1Progress * 5}%
                </div>
              </div>
            </section>

            <section className="soul-encoding-panel archaeology-panel">
              <h2 className="soul-encoding-panel__title">灵魂编码面板</h2>
              <div className="wizard-form">
                <details className="archaeology-expander" open>
                  <summary className="archaeology-expander__title">姓名</summary>
                  <div className="archaeology-expander__body">
                    <div className="soul-section soul-section--name">
                      <div className="soul-row">
                        {["family_name", "given_name"].map((fieldId) => {
                          const field = level.fields.find((f) => f.id === fieldId)!;
                          const key = `${currentLevel}.${field.id}`;
                          const value = currentValues[field.id];
                          const error = errors[key];
                          const helper = "请按照证件上的姓名填写。";
                          return (
                            <div key={field.id} className="soul-row-field">
                              <div className="wizard-field">
                                <div className="wizard-field-header">
                                  <label className="wizard-field-label">
                                    {field.label}
                                  </label>
                                </div>
                                <div className="wizard-field-control">
                                  {renderFieldInput(field, value, (next) =>
                                    handleFieldChange(field.id, next)
                                  )}
                                </div>
                                {error && (
                                  <div className="wizard-field-error">{error}</div>
                                )}
                                <p className="soul-row-helper">{helper}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">出生信息</summary>
                  <div className="archaeology-expander__body">
                    <div className="soul-section">
                      {level.fields
                        .filter((f) =>
                          ["birth_date", "blood_type", "birth_country", "birth_city"].includes(f.id)
                        )
                        .map((field) => {
                          const key = `${currentLevel}.${field.id}`;
                          const value = currentValues[field.id];
                          const error = errors[key];
                          return (
                            <div key={field.id} className="wizard-field">
                              <div className="wizard-field-header">
                                <label className="wizard-field-label">
                                  {field.label}
                                </label>
                                {field.description && (
                                  <p className="wizard-field-desc">
                                    {field.description}
                                  </p>
                                )}
                              </div>
                              <div className="wizard-field-control">
                                {renderFieldInput(field, value, (next) =>
                                  handleFieldChange(field.id, next)
                                )}
                              </div>
                              {error && (
                                <div className="wizard-field-error">{error}</div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">基本属性</summary>
                  <div className="archaeology-expander__body">
                    <div className="soul-section">
                      {level.fields
                        .filter((f) =>
                          ["gender", "native_language"].includes(f.id)
                        )
                        .map((field) => {
                          const key = `${currentLevel}.${field.id}`;
                          const value = currentValues[field.id];
                          const error = errors[key];
                          return (
                            <div key={field.id} className="wizard-field">
                              <div className="wizard-field-header">
                                <label className="wizard-field-label">
                                  {field.label}
                                </label>
                                {field.description && (
                                  <p className="wizard-field-desc">
                                    {field.description}
                                  </p>
                                )}
                              </div>
                              <div className="wizard-field-control">
                                {renderFieldInput(field, value, (next) =>
                                  handleFieldChange(field.id, next)
                                )}
                              </div>
                              {error && (
                                <div className="wizard-field-error">{error}</div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">根源连接</summary>
                  <div className="archaeology-expander__body">
                    <div className="soul-section">
                      <div className="soul-row">
                        {["father_family_name", "father_given_name"].map(
                          (fieldId) => {
                            const field = level.fields.find(
                              (f) => f.id === fieldId
                            )!;
                            const key = `${currentLevel}.${field.id}`;
                            const value = currentValues[field.id];
                            const error = errors[key];
                            const helper = "可选填，建立与父亲的根源连接。";
                            return (
                              <div key={field.id} className="soul-row-field">
                                <div className="wizard-field">
                                  <div className="wizard-field-header">
                                    <label className="wizard-field-label">
                                      {field.label}
                                    </label>
                                  </div>
                                  <div className="wizard-field-control">
                                    {renderFieldInput(field, value, (next) =>
                                      handleFieldChange(field.id, next)
                                    )}
                                  </div>
                                  {error && (
                                    <div className="wizard-field-error">
                                      {error}
                                    </div>
                                  )}
                                  <p className="soul-row-helper">{helper}</p>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                      <div className="soul-row">
                        {["mother_family_name", "mother_given_name"].map(
                          (fieldId) => {
                            const field = level.fields.find(
                              (f) => f.id === fieldId
                            )!;
                            const key = `${currentLevel}.${field.id}`;
                            const value = currentValues[field.id];
                            const error = errors[key];
                            const helper = "可选填，建立与母亲的根源连接。";
                            return (
                              <div key={field.id} className="soul-row-field">
                                <div className="wizard-field">
                                  <div className="wizard-field-header">
                                    <label className="wizard-field-label">
                                      {field.label}
                                    </label>
                                  </div>
                                  <div className="wizard-field-control">
                                    {renderFieldInput(field, value, (next) =>
                                      handleFieldChange(field.id, next)
                                    )}
                                  </div>
                                  {error && (
                                    <div className="wizard-field-error">
                                      {error}
                                    </div>
                                  )}
                                  <p className="soul-row-helper">{helper}</p>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </details>
              </div>
              <div className="soul-encoding-panel__actions">
                <button
                  type="button"
                  className="btn-sync-cloud"
                  onClick={handleSyncToCloud}
                >
                  保存并同步到云端
                </button>
              </div>
            </section>
          </>
        ) : currentLevel === 2 ? (
          <>
            <section className="status-pod status-pod--lv2">
              <div className="status-pod__progress">
                <div className="status-pod__progress-bar">
                  <div
                    className="status-pod__progress-fill"
                    style={{ width: `${stage2Progress * 5}%` }}
                  />
                </div>
                <div className="status-pod__progress-label">
                  完成度 {stage2Progress * 5}%
                </div>
              </div>
            </section>

            <section className="soul-encoding-panel archaeology-panel">
              <h2 className="soul-encoding-panel__title">灵魂考古图谱</h2>
              <div className="wizard-form">
                <details className="archaeology-expander" open>
                  <summary className="archaeology-expander__title">故土坐标（时空的定轴）</summary>
                  <div className="archaeology-expander__body">
                    <div className="archaeology-subgroup">
                      <h4 className="archaeology-subgroup__title">老宅旧址</h4>
                      {["old_house_time_range", "old_house_place_name"].map((id) => {
                        const field = level.fields.find((f) => f.id === id)!;
                        const key = `${currentLevel}.${field.id}`;
                        const value = currentValues[field.id];
                        const err = errors[key];
                        return (
                          <div key={field.id} className="wizard-field">
                            <label className="wizard-field-label">{field.label}</label>
                            <div className="wizard-field-control">
                              {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                            </div>
                            {err && <div className="wizard-field-error">{err}</div>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="archaeology-subgroup">
                      <h4 className="archaeology-subgroup__title">启蒙之地</h4>
                      {["enlightenment_time_range", "enlightenment_place_name"].map((id) => {
                        const field = level.fields.find((f) => f.id === id)!;
                        const key = `${currentLevel}.${field.id}`;
                        const value = currentValues[field.id];
                        const err = errors[key];
                        return (
                          <div key={field.id} className="wizard-field">
                            <label className="wizard-field-label">{field.label}</label>
                            <div className="wizard-field-control">
                              {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                            </div>
                            {err && <div className="wizard-field-error">{err}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">家庭场域（生命的底色）</summary>
                  <div className="archaeology-expander__body">
                    {["father_love_shadow", "mother_love_warmth", "home_atmosphere"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                    {(() => {
                      const field = level.fields.find((f) => f.id === "childhood_family_score")!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">社交镜像与拾遗</summary>
                  <div className="archaeology-expander__body">
                    {["playmates", "teacher_heart", "classmates"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                    <div className="wizard-field">
                      <button
                        type="button"
                        className="btn-add-fragment"
                        onClick={() => setMemoryFragmentsLv2((prev) => [...prev, ""])}
                      >
                        + 拾遗
                      </button>
                      {memoryFragmentsLv2.map((text, i) => (
                        <div key={i} className="fragment-item">
                          <textarea
                            className="field-textarea"
                            rows={2}
                            placeholder="其他童年碎片…"
                            value={text}
                            onChange={(e) => {
                              const next = [...memoryFragmentsLv2];
                              next[i] = e.target.value;
                              setMemoryFragmentsLv2(next);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">精神给养与心理考古</summary>
                  <div className="archaeology-expander__body">
                    {["thinking_preference", "cultural_baptism", "body_rhythm"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                    {(() => {
                      const field = level.fields.find((f) => f.id === "sensory_anchor")!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                          <p className="archaeology-hint">每一种味道都是一把钥匙，慢慢想，不着急。</p>
                        </div>
                      );
                    })()}
                    {["secret_base", "color_totem", "subconscious_shadow"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
              <div className="soul-encoding-panel__actions">
                <button
                  type="button"
                  className="btn-sync-cloud"
                  onClick={handleSyncToCloud}
                >
                  保存并同步到云端
                </button>
              </div>
            </section>
          </>
        ) : currentLevel === 3 ? (
          <>
            <section className="status-pod status-pod--lv3">
              <div className="status-pod__progress">
                <div className="status-pod__progress-bar">
                  <div
                    className="status-pod__progress-fill"
                    style={{ width: `${stage3Progress * 5}%` }}
                  />
                </div>
                <div className="status-pod__progress-label">
                  完成度 {stage3Progress * 5}%
                </div>
              </div>
            </section>

            <section className="soul-encoding-panel archaeology-panel">
              <h2 className="soul-encoding-panel__title">少年价值观图谱</h2>
              <div className="wizard-form">
                <details className="archaeology-expander" open>
                  <summary className="archaeology-expander__title">精神图腾：偶像与反叛</summary>
                  <div className="archaeology-expander__body">
                    <p className="archaeology-intro">这个年纪，我们会通过崇拜某人或反对某事来定义自己。</p>
                    {["idol_anchor", "rebellion_moment", "value_motto"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">社交原子：圈层与归属</summary>
                  <div className="archaeology-expander__body">
                    {["best_friends", "first_crush", "lonely_moment"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">认知拓荒：热爱的边界</summary>
                  <div className="archaeology-expander__body">
                    {["first_hobby", "career_enlightenment", "world_view_shift"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">关键抉择：命运的岔路口</summary>
                  <div className="archaeology-expander__body">
                    {["exam_memory", "place_change"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
              <div className="soul-encoding-panel__actions">
                <button
                  type="button"
                  className="btn-sync-cloud"
                  onClick={handleSyncToCloud}
                >
                  保存并同步到云端
                </button>
              </div>
            </section>
          </>
        ) : currentLevel === 4 ? (
          <>
            <section className="status-pod status-pod--lv4">
              <div className="status-pod__progress">
                <div className="status-pod__progress-bar">
                  <div
                    className="status-pod__progress-fill"
                    style={{ width: `${stage4Progress * 5}%` }}
                  />
                </div>
                <div className="status-pod__progress-label">
                  完成度 {stage4Progress * 5}%
                </div>
              </div>
            </section>

            <section className="soul-encoding-panel archaeology-panel">
              <h2 className="soul-encoding-panel__title">青年期人生图谱</h2>
              <div className="wizard-form">
                <details className="archaeology-expander" open>
                  <summary className="archaeology-expander__title">事业坐标：自我价值的社会化</summary>
                  <div className="archaeology-expander__body">
                    <p className="archaeology-intro">步入社会后的第一份职业和长期的职业路径，是成年人格的重要支柱。</p>
                    {["first_job", "career_high_low", "career_driver"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">情感契约：从「我」到「我们」</summary>
                  <div className="archaeology-expander__body">
                    <p className="archaeology-intro">亲密关系的建立是成年生活的重头戏。</p>
                    {["partner_meet", "partner_commit", "partner_conflict"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">生命延续：角色的多维化</summary>
                  <div className="archaeology-expander__body">
                    <p className="archaeology-intro">结婚生子不仅是社会流程，更是心理身份的剧变。</p>
                    {["first_child_hold", "child_environment", "pressure_relief"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">现实碰撞：世界观的修正</summary>
                  <div className="archaeology-expander__body">
                    {["money_moment", "social_responsibility", "regret_abandon"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
              <div className="soul-encoding-panel__actions">
                <button
                  type="button"
                  className="btn-sync-cloud"
                  onClick={handleSyncToCloud}
                >
                  保存并同步到云端
                </button>
              </div>
            </section>
          </>
        ) : currentLevel === 5 ? (
          <>
            <section className="status-pod status-pod--lv5">
              <div className="status-pod__progress">
                <div className="status-pod__progress-bar">
                  <div
                    className="status-pod__progress-fill"
                    style={{ width: `${stage5Progress * 5}%` }}
                  />
                </div>
                <div className="status-pod__progress-label">
                  完成度 {stage5Progress * 5}%
                </div>
              </div>
            </section>

            <section className="soul-encoding-panel archaeology-panel">
              <h2 className="soul-encoding-panel__title">成熟期人生图谱</h2>
              <div className="wizard-form">
                <details className="archaeology-expander" open>
                  <summary className="archaeology-expander__title">事业的裂变：危机与重塑</summary>
                  <div className="archaeology-expander__body">
                    <p className="archaeology-intro">当社会身份受到威胁时，你的真实底色才会显露。</p>
                    {["career_shock", "adversity_survival", "value_reassess"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">情感的边界：裂痕与修补</summary>
                  <div className="archaeology-expander__body">
                    <p className="archaeology-intro">长期的伴侣关系进入「深水区」，面临审美疲劳或价值观的分歧。</p>
                    {["silent_battle", "rediscover_partner", "social_prune"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">传承的重量：教育与投射</summary>
                  <div className="archaeology-expander__body">
                    <p className="archaeology-intro">孩子开始长大，你不仅是他们的保护伞，也成了他们的对手。</p>
                    {["education_conflict", "mirror_self", "protect_boundary"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">中年觉醒：寻找内在的锚</summary>
                  <div className="archaeology-expander__body">
                    {["body_signal", "spirit_island"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
              <div className="soul-encoding-panel__actions">
                <button
                  type="button"
                  className="btn-sync-cloud"
                  onClick={handleSyncToCloud}
                >
                  保存并同步到云端
                </button>
              </div>
            </section>
          </>
        ) : currentLevel === 6 ? (
          <>
            <section className="status-pod status-pod--lv6">
              <div className="status-pod__progress">
                <div className="status-pod__progress-bar">
                  <div
                    className="status-pod__progress-fill"
                    style={{ width: `${stage6Progress * 5}%` }}
                  />
                </div>
                <div className="status-pod__progress-label">
                  完成度 {stage6Progress * 5}%
                </div>
              </div>
            </section>

            <section className="soul-encoding-panel archaeology-panel">
              <h2 className="soul-encoding-panel__title">余晖 · 归一路径图</h2>
              <div className="wizard-form">
                <details className="archaeology-expander" open>
                  <summary className="archaeology-expander__title">终极整合：与过去的自己握手言和</summary>
                  <div className="archaeology-expander__body">
                    <p className="archaeology-intro">这是对一生遗憾与成就的最后总结。</p>
                    {["regret_release", "fate_keywords", "reconcile_moment"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">生命的传承：超越个体的延续</summary>
                  <div className="archaeology-expander__body">
                    <p className="archaeology-intro">你的精神遗产（Digital Legacy）如何传递？</p>
                    {["legacy_letter", "last_gift", "witness"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">面对终点：边界的消失</summary>
                  <div className="archaeology-expander__body">
                    <p className="archaeology-intro">探讨对死亡的态度，这是复刻真实灵魂的最后一块拼图。</p>
                    {["end_vision", "fear_fade", "digital_legacy_wish"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">归于星尘：最后的情感回响</summary>
                  <div className="archaeology-expander__body">
                    {["final_thanks", "soul_rest"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next))}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
              <div className="soul-encoding-panel__actions">
                <button
                  type="button"
                  className="btn-sync-cloud"
                  onClick={handleSyncToCloud}
                >
                  保存并同步到云端
                </button>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="wizard-avatar-pane">
              <div className="avatar-card">
                <div className={`avatar-stage avatar-stage--lv${currentLevel}`}>
                  <div className="avatar-figure">
                    <span className="avatar-emoji">
                      {currentLevel === 2 && "🧒"}
                      {currentLevel === 3 && "🧑"}
                      {currentLevel === 4 && "🧑‍💼"}
                      {currentLevel === 5 && "🧑‍🏫"}
                    </span>
                  </div>
                  <div className="avatar-label">
                    当前阶段：{level.stageName}
                  </div>
                </div>
                <p className="avatar-tip">
                  随着等级提升，分身会从幼芽慢慢长大，变成更接近真实人物的形象。
                </p>
              </div>
            </section>

            <section className="wizard-form-pane">
              <div className="wizard-form">
                {level.fields.map((field) => {
                  const key = `${currentLevel}.${field.id}`;
                  const value = currentValues[field.id];
                  const error = errors[key];

                  return (
                    <div key={field.id} className="wizard-field">
                      <div className="wizard-field-header">
                        <label className="wizard-field-label">
                          {field.label}
                        </label>
                        {field.description && (
                          <p className="wizard-field-desc">
                            {field.description}
                          </p>
                        )}
                      </div>
                      <div className="wizard-field-control">
                        {renderFieldInput(field, value, (next) =>
                          handleFieldChange(field.id, next)
                        )}
                      </div>
                      {error && (
                        <div className="wizard-field-error">{error}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="wizard-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={currentLevel === 1}
                  onClick={() =>
                    setCurrentLevel(
                      currentLevel > 1
                        ? ((currentLevel - 1) as LevelId)
                        : currentLevel
                    )
                  }
                >
                  上一阶段
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSubmitLevel}
                >
                  {currentLevel < TOTAL_LEVELS
                    ? "完成本阶段，继续升级"
                    : "完成全部阶段"}
                </button>
              </div>

              <p className="wizard-note">
                Lv5 的内容完全可选，你可以只填写自己愿意分享的部分，并且随时回来修改。
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

