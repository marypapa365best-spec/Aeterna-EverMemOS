import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LevelId,
  personalityLevels,
  PersonalityField,
  PersonalityFieldOption,
  FieldType
} from "../config/personalityLevels";
import { saveTwinLevelConfig, getDemoSoulConfig, saveDemoSoulConfig, getLastStoredMemoriesForForm } from "../api/twinApi";

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
  theme: "classic" | "cosmic" | "cosmic-fire" | "aurora" | "light" | "rainbow";
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
          // 节点“点亮/彩色”只随当前阶段变化，避免从阶段2退回阶段1时阶段2仍保持点亮。
          const isCompleted = level.id < current;

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
          // 同样仅随当前阶段变化，退回时不保留彩色“已完成”态
          const isCompleted = level.id < current;
          const isPastOrCurrent = level.id < current;

          return (
            <button
              key={level.id}
              type="button"
              className={[
                "level-node level-node--fire",
                isActive ? "level-node--active level-node--active-fire" : "",
                isCompleted ? "level-node--completed level-node--completed-fire" : "",
                isPastOrCurrent ? "level-node--lit-fire" : ""
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

  if (theme === "aurora") {
    const percentage = ((current - 1) / (TOTAL_LEVELS - 1)) * 100;
    return (
      <div className="level-indicator--aurora">
        <div className="level-indicator__track--aurora">
          <div
            className="level-indicator__progress--aurora"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {personalityLevels.map((level) => {
          const isActive = level.id === current;
          // 极光深夜（aurora）主题的节点视觉点亮逻辑：只跟随“当前阶段”前进度，
          // 当你从 2 退回到 1 时，阶段 2 节点应回到未点亮的基础黑色样式。
          const isCompleted = level.id < current;
          const isPastOrCompleted = level.id < current;
          return (
            <button
              key={level.id}
              type="button"
              className={[
                "level-node level-node--aurora",
                isActive ? "level-node--active level-node--active-aurora" : "",
                isCompleted ? "level-node--completed" : "",
                isPastOrCompleted ? "level-node--lit-aurora" : ""
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
          const isCompleted = level.id < current;
          const isPastOrCurrent = level.id < current;

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
          const isCompleted = level.id < current;
          const isPastOrCurrent = level.id < current;

          return (
            <button
              key={level.id}
              type="button"
              className={[
                "level-pill",
                isActive ? "level-pill--active" : "",
                isCompleted ? "level-pill--completed" : "",
                isPastOrCurrent ? "level-pill--lit" : ""
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
  onChange: (next: FormValue) => void,
  readOnly?: boolean
) => {
  const type: FieldType = field.type;
  const ro = !!readOnly;

  if (type === "text") {
    return (
      <input
        className="field-input"
        value={(value as string) ?? ""}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        readOnly={ro}
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
        disabled={ro}
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
        readOnly={ro}
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
        readOnly={ro}
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
          disabled={ro}
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
              disabled={ro}
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
        disabled={ro}
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
            disabled={ro}
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
              disabled={ro || overLimit}
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

/** 你在进化聊天室里看到的那条保存信息，还原为表格默认预填（姓陈、小新、1988-08-08、杭州、胡大为、罗秀英等） */
const RESTORED_DEMO_FORM_STATE: Record<LevelId, FormState> = {
  1: {
    family_name: "陈",
    given_name: "小新",
    birth_date: "1988-08-08",
    blood_type: "O",
    birth_country: "CN",
    birth_city: "hangzhou",
    gender: "male",
    native_language: "zh",
    father_family_name: "胡",
    father_given_name: "大为",
    mother_family_name: "罗",
    mother_given_name: "秀英",
  },
  2: {},
  3: {},
  4: {},
  5: {},
  6: {},
};

interface PersonalityWizardProps {
  twinId: string;
  embedded?: boolean;
  initialLevel?: number;
}

export const PersonalityWizard: React.FC<PersonalityWizardProps> = ({
  twinId,
  embedded = false,
  initialLevel
}) => {
  const [theme, setTheme] = useState<"classic" | "cosmic" | "cosmic-fire" | "aurora" | "light" | "rainbow">("aurora");
  const [currentLevel, setCurrentLevel] = useState<LevelId>(() => {
    if (initialLevel && initialLevel >= 1 && initialLevel <= 6) return initialLevel as LevelId;
    return getInitialLevel();
  });
  useEffect(() => {
    if (initialLevel && initialLevel >= 1 && initialLevel <= 6) {
      setCurrentLevel(initialLevel as LevelId);
    }
  }, [initialLevel]);

  const [completedLevel, setCompletedLevel] = useState<LevelId | 0>(1);
  const [formState, setFormState] = useState<Record<LevelId, FormState>>(() => ({ ...RESTORED_DEMO_FORM_STATE }));
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [memoryFragmentsLv2, setMemoryFragmentsLv2] = useState<string[]>([]);
  const [levelLocked, setLevelLocked] = useState<Record<LevelId, boolean>>(() => ({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false }));
  const [syncedLevels, setSyncedLevels] = useState<Partial<Record<LevelId, boolean>>>({});
  const SECTION_LOCKED_KEY = "twin_section_locked";
  const [sectionLocked, setSectionLocked] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("twin_section_locked");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const toggleSection = useCallback((key: string) => {
    setSectionLocked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("twin_section_locked", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [SECTION_LOCKED_KEY]);
  const LAST_SYNCED_KEY = "twin_last_synced_form";
  const [lastSyncedFormState, setLastSyncedFormState] = useState<Record<LevelId, FormState>>(() => {
    try {
      const raw = localStorage.getItem(LAST_SYNCED_KEY);
      if (!raw) return { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
      const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;
      const out: Record<LevelId, FormState> = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
      for (let i = 1; i <= 6; i++) {
        const L = i as LevelId;
        if (parsed[String(L)] && typeof parsed[String(L)] === "object") out[L] = parsed[String(L)] as FormState;
      }
      return out;
    } catch {
      return { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
    }
  });

  const level = useMemo(
    () => getLevelById(currentLevel),
    [currentLevel]
  );

  const maxUnlocked = useMemo(
    () => getMaxUnlockedLevel(completedLevel),
    [completedLevel]
  );

  const currentValues = formState[currentLevel];
  const levelReadOnly = levelLocked[currentLevel];

  const handleSaveLevel = useCallback((level: LevelId) => {
    setLevelLocked((prev) => ({ ...prev, [level]: true }));
  }, []);
  const handleEditLevel = useCallback((level: LevelId) => {
    setLevelLocked((prev) => ({ ...prev, [level]: false }));
  }, []);
  const persistLastSynced = useCallback((next: Record<LevelId, FormState>) => {
    setLastSyncedFormState(next);
    try {
      const obj: Record<string, unknown> = {};
      for (let i = 1; i <= 6; i++) obj[String(i)] = next[i as LevelId];
      localStorage.setItem(LAST_SYNCED_KEY, JSON.stringify(obj));
    } catch {
      // ignore
    }
  }, []);

  /** 将拉取到的 formState + memoryFragmentsLv2 还原为表格对应内容（各关卡表单、localStorage、已完成进度） */
  const applySavedToForm = useCallback(
    (data: { formState: Record<number, Record<string, unknown>>; memoryFragmentsLv2: string[] }) => {
      if (!data.formState || Object.keys(data.formState).length === 0) return false;
      setFormState((prev) => {
        const next = { ...prev };
        for (let level = 1; level <= 6; level++) {
          const L = level as LevelId;
          const from = data.formState[level] as FormState | undefined;
          if (from && typeof from === "object") {
            next[L] = { ...next[L], ...from };
          }
        }
        return next;
      });
      if (Array.isArray(data.memoryFragmentsLv2) && data.memoryFragmentsLv2.length > 0) {
        setMemoryFragmentsLv2(data.memoryFragmentsLv2);
      }
      try {
        for (let level = 1; level <= 6; level++) {
          const from = data.formState[level];
          if (from && typeof from === "object") {
            localStorage.setItem(`twin_soul_level_${level}_keywords`, JSON.stringify(from));
          }
        }
      } catch {
        // ignore
      }
      let maxLevel: LevelId | 0 = 0;
      for (let level = 1; level <= 6; level++) {
        const L = level as LevelId;
        const obj = data.formState[L];
        if (obj && typeof obj === "object" && Object.keys(obj).length > 0) maxLevel = L;
      }
      if (maxLevel > 0) setCompletedLevel(maxLevel);
      return true;
    },
    []
  );

  /** 把 formState 整理成一段可读的「上一条保存的信息」说明（显示的是 EverMemOS 里真实保存的值，选项会转成中文） */
  const formatSavedSummary = useCallback((formState: Record<number, Record<string, unknown>>) => {
    const labels: Record<string, string> = {
      family_name: "姓",
      given_name: "名",
      birth_date: "出生日期",
      blood_type: "血型",
      birth_country: "出生国家",
      birth_city: "出生城市",
      gender: "性别",
      native_language: "母语",
      father_family_name: "父姓",
      father_given_name: "父名",
      mother_family_name: "母姓",
      mother_given_name: "母名",
    };
    const optionLabels: Record<string, Record<string, string>> = {
      blood_type: { A: "A 型", B: "B 型", AB: "AB 型", O: "O 型", unknown: "不详" },
      birth_country: { CN: "中国", US: "美国", JP: "日本", KR: "韩国", SG: "新加坡", MY: "马来西亚", GB: "英国", AU: "澳大利亚", other: "其他" },
      birth_city: { beijing: "北京", shanghai: "上海", guangzhou: "广州", shenzhen: "深圳", hangzhou: "杭州", chengdu: "成都", nanjing: "南京", wuhan: "武汉", xian: "西安", suzhou: "苏州", tianjin: "天津", chongqing: "重庆", other: "其他" },
      gender: { male: "男", female: "女", "": "未选" },
      native_language: { zh: "中文", en: "English", ja: "日本語", ko: "한국어", other: "其他" },
    };
    const toDisplayText = (key: string, val: unknown): string => {
      if (val === undefined || val === null) return "";
      if (Array.isArray(val)) return val.join("、");
      const s = String(val).trim();
      if (optionLabels[key] && s in optionLabels[key]) return optionLabels[key][s];
      return s;
    };
    const lines: string[] = ["上一条保存的信息："];
    for (let level = 1; level <= 6; level++) {
      const obj = formState[level];
      if (!obj || typeof obj !== "object" || Object.keys(obj).length === 0) continue;
      const parts: string[] = [];
      for (const [key, val] of Object.entries(obj)) {
        if (key === "_levelId" || val === undefined || (typeof val === "string" && val.trim() === "")) continue;
        const label = labels[key] || key;
        const text = toDisplayText(key, val);
        if (text) parts.push(`${label}：${text}`);
      }
      if (parts.length > 0) lines.push(`【关卡${level}】${parts.join("，")}`);
    }
    return lines.join("\n");
  }, []);

  /** 从 EverMemOS 提取上一条保存的信息，告诉你是什么，并还原为表格对应的内容 */
  const handleExtractAndRestore = useCallback(() => {
    getLastStoredMemoriesForForm({ user_id: twinId })
      .then((data) => {
        const ok = applySavedToForm(data);
        if (ok) {
          const summary = formatSavedSummary(data.formState);
          alert(`${summary}\n\n已还原到表格。`);
        } else {
          alert("未找到可还原的保存记录，请先点击「保存并同步到云端」写入 EverMemOS。");
        }
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "提取失败";
        alert(msg.includes("API Key") ? msg : "提取失败，请确认已配置 EverMemOS API Key 且后端可用。");
      });
  }, [twinId, applySavedToForm, formatSavedSummary]);

  // 打开时从 EverMemOS 拉取你上次保存的人格配置并填入表格（优先）；若无则再从本机服务器拉取；都没有则保留已还原的默认（陈、小新等）并写入 localStorage
  useEffect(() => {
    let mounted = true;
    getLastStoredMemoriesForForm({ user_id: twinId })
      .then((data) => {
        if (!mounted) return null;
        if (applySavedToForm(data)) return null;
        return getDemoSoulConfig();
      })
      .then((demo) => {
        if (!mounted) return;
        if (demo && demo.formState && Object.keys(demo.formState).length > 0) {
          applySavedToForm({
            formState: demo.formState,
            memoryFragmentsLv2: demo.memoryFragmentsLv2 ?? [],
          });
          return;
        }
        // EverMemOS 和服务器都没有数据时，把已还原的默认（陈、小新等）写入 localStorage
        try {
          const def = RESTORED_DEMO_FORM_STATE[1];
          if (def && Object.keys(def).length > 0) {
            localStorage.setItem("twin_soul_level_1_keywords", JSON.stringify(def));
          }
        } catch {
          // ignore
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [twinId, applySavedToForm]);

  const handleFieldChange = (fieldId: string, value: FormValue) => {
    setSyncedLevels((prev) => ({ ...prev, [currentLevel]: false }));
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

  /** 保存并同步到云端：比对当前表单与上一版，仅在有不同时上传到 EverMemOS，并更新上一版。 */
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
    const lastSynced = lastSyncedFormState[currentLevel] || {};
    const currentStr = JSON.stringify(payload);
    const lastStr = JSON.stringify(lastSynced);
    if (currentStr === lastStr) {
      alert("当前内容与上一版一致，未上传。");
      return;
    }
    try {
      // 有不同时才上传到 EverMemOS
      await saveTwinLevelConfig({
        twinId,
        levelId: currentLevel,
        data: payload,
      });
      try {
        const storageKey = `twin_soul_level_${currentLevel}_keywords`;
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        // ignore localStorage errors
      }
      setCompletedLevel((prev) => (currentLevel > prev ? currentLevel : prev));
      persistLastSynced({ ...lastSyncedFormState, [currentLevel]: payload as FormState });
      // (1) 保存到服务器，下次打开时自动填写
      await saveDemoSoulConfig({
        twinId,
        formState: { ...formState, [currentLevel]: payload as FormState },
        memoryFragmentsLv2,
      }).catch(() => {});
      // 提取刚保存的内容，从服务器拉取并回填表格
      const data = await getDemoSoulConfig();
      if (data.formState && Object.keys(data.formState).length > 0) {
        setFormState((prev) => {
          const next = { ...prev };
          for (let level = 1; level <= 6; level++) {
            const L = level as LevelId;
            const fromServer = data.formState[L] as FormState | undefined;
            if (fromServer && typeof fromServer === "object") {
              next[L] = { ...next[L], ...fromServer };
            }
          }
          return next;
        });
        if (Array.isArray(data.memoryFragmentsLv2) && data.memoryFragmentsLv2.length > 0) {
          setMemoryFragmentsLv2(data.memoryFragmentsLv2);
        }
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
        let maxLevel: LevelId | 0 = 0;
        for (let level = 1; level <= 6; level++) {
          const L = level as LevelId;
          const obj = data.formState[L];
          if (obj && typeof obj === "object" && Object.keys(obj).length > 0) maxLevel = L;
        }
        if (maxLevel > 0) setCompletedLevel(maxLevel);
      }
      setSyncedLevels((prev) => ({ ...prev, [currentLevel]: true }));
      alert("已同步至云端，并已用刚保存的内容回填表格。");
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
      try {
        const storageKey = `twin_soul_level_${currentLevel}_keywords`;
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        // ignore localStorage errors
      }
      saveDemoSoulConfig({
        twinId,
        formState: { ...formState, [currentLevel]: payload as FormState },
        memoryFragmentsLv2,
      }).catch(() => {});
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
                  setTheme(e.target.value as "classic" | "cosmic" | "cosmic-fire" | "aurora" | "light" | "rainbow");
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
                <option value="aurora">极光深夜 - 紫青玫</option>
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
                {/* ── 姓名 ── */}
                <details className="archaeology-expander" open>
                  <summary className="archaeology-expander__title">
                    <span>姓名</span>
                    <button type="button" className={sectionLocked["lv1-name"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv1-name"); }}>
                      {sectionLocked["lv1-name"] ? "编辑" : "保存"}
                    </button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv1-name"] ? " section-body--locked" : ""}`}>
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
                                  <label className="wizard-field-label">{field.label}</label>
                                </div>
                                <div className="wizard-field-control">
                                  {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv1-name"])}
                                </div>
                                {error && <div className="wizard-field-error">{error}</div>}
                                <p className="soul-row-helper">{helper}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </details>

                {/* ── 出生信息 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>出生信息</span>
                    <button type="button" className={sectionLocked["lv1-birth"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv1-birth"); }}>
                      {sectionLocked["lv1-birth"] ? "编辑" : "保存"}
                    </button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv1-birth"] ? " section-body--locked" : ""}`}>
                    <div className="soul-section">
                      {level.fields.filter((f) => ["birth_date", "blood_type", "birth_country", "birth_city"].includes(f.id)).map((field) => {
                        const key = `${currentLevel}.${field.id}`;
                        const value = currentValues[field.id];
                        const error = errors[key];
                        return (
                          <div key={field.id} className="wizard-field">
                            <div className="wizard-field-header">
                              <label className="wizard-field-label">{field.label}</label>
                              {field.description && <p className="wizard-field-desc">{field.description}</p>}
                            </div>
                            <div className="wizard-field-control">
                              {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv1-birth"])}
                            </div>
                            {error && <div className="wizard-field-error">{error}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>

                {/* ── 基本属性 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>基本属性</span>
                    <button type="button" className={sectionLocked["lv1-basic"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv1-basic"); }}>
                      {sectionLocked["lv1-basic"] ? "编辑" : "保存"}
                    </button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv1-basic"] ? " section-body--locked" : ""}`}>
                    <div className="soul-section">
                      {level.fields.filter((f) => ["gender", "native_language"].includes(f.id)).map((field) => {
                        const key = `${currentLevel}.${field.id}`;
                        const value = currentValues[field.id];
                        const error = errors[key];
                        return (
                          <div key={field.id} className="wizard-field">
                            <div className="wizard-field-header">
                              <label className="wizard-field-label">{field.label}</label>
                              {field.description && <p className="wizard-field-desc">{field.description}</p>}
                            </div>
                            <div className="wizard-field-control">
                              {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv1-basic"])}
                            </div>
                            {error && <div className="wizard-field-error">{error}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>

                {/* ── 根源连接 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>根源连接</span>
                    <button type="button" className={sectionLocked["lv1-roots"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv1-roots"); }}>
                      {sectionLocked["lv1-roots"] ? "编辑" : "保存"}
                    </button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv1-roots"] ? " section-body--locked" : ""}`}>
                    <div className="soul-section">
                      <div className="soul-row">
                        {["father_family_name", "father_given_name"].map((fieldId) => {
                          const field = level.fields.find((f) => f.id === fieldId)!;
                          const key = `${currentLevel}.${field.id}`;
                          const value = currentValues[field.id];
                          const error = errors[key];
                          return (
                            <div key={field.id} className="soul-row-field">
                              <div className="wizard-field">
                                <div className="wizard-field-header">
                                  <label className="wizard-field-label">{field.label}</label>
                                </div>
                                <div className="wizard-field-control">
                                  {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv1-roots"])}
                                </div>
                                {error && <div className="wizard-field-error">{error}</div>}
                                <p className="soul-row-helper">可选填，建立与父亲的根源连接。</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="soul-row">
                        {["mother_family_name", "mother_given_name"].map((fieldId) => {
                          const field = level.fields.find((f) => f.id === fieldId)!;
                          const key = `${currentLevel}.${field.id}`;
                          const value = currentValues[field.id];
                          const error = errors[key];
                          return (
                            <div key={field.id} className="soul-row-field">
                              <div className="wizard-field">
                                <div className="wizard-field-header">
                                  <label className="wizard-field-label">{field.label}</label>
                                </div>
                                <div className="wizard-field-control">
                                  {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv1-roots"])}
                                </div>
                                {error && <div className="wizard-field-error">{error}</div>}
                                <p className="soul-row-helper">可选填，建立与母亲的根源连接。</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </details>
              </div>
              <div className="soul-encoding-panel__actions">
                <button
                  type="button"
                  className="btn-sync-cloud"
                  disabled={!!syncedLevels[currentLevel]}
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
                {/* ── 故土坐标 ── */}
                <details className="archaeology-expander" open>
                  <summary className="archaeology-expander__title">
                    <span>故土坐标（时空的定轴）</span>
                    <button type="button" className={sectionLocked["lv2-homeland"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv2-homeland"); }}>{sectionLocked["lv2-homeland"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv2-homeland"] ? " section-body--locked" : ""}`}>
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
                              {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv2-homeland"])}
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
                              {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv2-homeland"])}
                            </div>
                            {err && <div className="wizard-field-error">{err}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>

                {/* ── 家庭场域 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>家庭场域（生命的底色）</span>
                    <button type="button" className={sectionLocked["lv2-family"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv2-family"); }}>{sectionLocked["lv2-family"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv2-family"] ? " section-body--locked" : ""}`}>
                    {["father_love_shadow", "mother_love_warmth", "home_atmosphere"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv2-family"])}
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
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv2-family"])}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </details>

                {/* ── 社交镜像与拾遗 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>社交镜像与拾遗</span>
                    <button type="button" className={sectionLocked["lv2-social"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv2-social"); }}>{sectionLocked["lv2-social"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv2-social"] ? " section-body--locked" : ""}`}>
                    {["playmates", "teacher_heart", "classmates"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv2-social"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                    <div className="wizard-field">
                      <button type="button" className="btn-add-fragment" onClick={() => setMemoryFragmentsLv2((prev) => [...prev, ""])}>+ 拾遗</button>
                      {memoryFragmentsLv2.map((text, i) => (
                        <div key={i} className="fragment-item">
                          <textarea className="field-textarea" rows={2} placeholder="其他童年碎片…" value={text}
                            onChange={(e) => { const next = [...memoryFragmentsLv2]; next[i] = e.target.value; setMemoryFragmentsLv2(next); }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </details>

                {/* ── 精神给养与心理考古 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>精神给养与心理考古</span>
                    <button type="button" className={sectionLocked["lv2-spirit"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv2-spirit"); }}>{sectionLocked["lv2-spirit"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv2-spirit"] ? " section-body--locked" : ""}`}>
                    {["thinking_preference", "cultural_baptism", "body_rhythm"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv2-spirit"])}
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
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv2-spirit"])}
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
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv2-spirit"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
              <div className="soul-encoding-panel__actions">
                <button type="button" className="btn-sync-cloud" disabled={!!syncedLevels[currentLevel]} onClick={handleSyncToCloud}>保存并同步到云端</button>
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
                {/* ── 精神图腾 ── */}
                <details className="archaeology-expander" open>
                  <summary className="archaeology-expander__title">
                    <span>精神图腾：偶像与反叛</span>
                    <button type="button" className={sectionLocked["lv3-totem"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv3-totem"); }}>{sectionLocked["lv3-totem"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv3-totem"] ? " section-body--locked" : ""}`}>
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
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv3-totem"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* ── 社交原子 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>社交原子：圈层与归属</span>
                    <button type="button" className={sectionLocked["lv3-social"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv3-social"); }}>{sectionLocked["lv3-social"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv3-social"] ? " section-body--locked" : ""}`}>
                    {["best_friends", "first_crush", "lonely_moment"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv3-social"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* ── 认知拓荒 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>认知拓荒：热爱的边界</span>
                    <button type="button" className={sectionLocked["lv3-cognition"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv3-cognition"); }}>{sectionLocked["lv3-cognition"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv3-cognition"] ? " section-body--locked" : ""}`}>
                    {["first_hobby", "career_enlightenment", "world_view_shift"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv3-cognition"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* ── 关键抉择 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>关键抉择：命运的岔路口</span>
                    <button type="button" className={sectionLocked["lv3-choice"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv3-choice"); }}>{sectionLocked["lv3-choice"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv3-choice"] ? " section-body--locked" : ""}`}>
                    {["exam_memory", "place_change"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv3-choice"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
              <div className="soul-encoding-panel__actions">
                <button type="button" className="btn-sync-cloud" disabled={!!syncedLevels[currentLevel]} onClick={handleSyncToCloud}>保存并同步到云端</button>
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
                {/* ── 事业坐标 ── */}
                <details className="archaeology-expander" open>
                  <summary className="archaeology-expander__title">
                    <span>事业坐标：自我价值的社会化</span>
                    <button type="button" className={sectionLocked["lv4-career"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv4-career"); }}>{sectionLocked["lv4-career"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv4-career"] ? " section-body--locked" : ""}`}>
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
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv4-career"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* ── 情感契约 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>情感契约：从「我」到「我们」</span>
                    <button type="button" className={sectionLocked["lv4-emotion"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv4-emotion"); }}>{sectionLocked["lv4-emotion"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv4-emotion"] ? " section-body--locked" : ""}`}>
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
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv4-emotion"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* ── 生命延续 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>生命延续：角色的多维化</span>
                    <button type="button" className={sectionLocked["lv4-life"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv4-life"); }}>{sectionLocked["lv4-life"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv4-life"] ? " section-body--locked" : ""}`}>
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
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv4-life"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* ── 现实碰撞 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>现实碰撞：世界观的修正</span>
                    <button type="button" className={sectionLocked["lv4-reality"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv4-reality"); }}>{sectionLocked["lv4-reality"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv4-reality"] ? " section-body--locked" : ""}`}>
                    {["money_moment", "social_responsibility", "regret_abandon"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv4-reality"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
              <div className="soul-encoding-panel__actions">
                <button type="button" className="btn-sync-cloud" disabled={!!syncedLevels[currentLevel]} onClick={handleSyncToCloud}>保存并同步到云端</button>
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
                {/* ── 事业的裂变 ── */}
                <details className="archaeology-expander" open>
                  <summary className="archaeology-expander__title">
                    <span>事业的裂变：危机与重塑</span>
                    <button type="button" className={sectionLocked["lv5-career"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv5-career"); }}>{sectionLocked["lv5-career"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv5-career"] ? " section-body--locked" : ""}`}>
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
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv5-career"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* ── 情感的边界 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>情感的边界：裂痕与修补</span>
                    <button type="button" className={sectionLocked["lv5-emotion"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv5-emotion"); }}>{sectionLocked["lv5-emotion"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv5-emotion"] ? " section-body--locked" : ""}`}>
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
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv5-emotion"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* ── 传承的重量 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>传承的重量：教育与投射</span>
                    <button type="button" className={sectionLocked["lv5-legacy"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv5-legacy"); }}>{sectionLocked["lv5-legacy"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv5-legacy"] ? " section-body--locked" : ""}`}>
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
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv5-legacy"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* ── 中年觉醒 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>中年觉醒：寻找内在的锚</span>
                    <button type="button" className={sectionLocked["lv5-midlife"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv5-midlife"); }}>{sectionLocked["lv5-midlife"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv5-midlife"] ? " section-body--locked" : ""}`}>
                    {["body_signal", "spirit_island"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv5-midlife"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
              <div className="soul-encoding-panel__actions">
                <button type="button" className="btn-sync-cloud" disabled={!!syncedLevels[currentLevel]} onClick={handleSyncToCloud}>保存并同步到云端</button>
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
                {/* ── 终极整合 ── */}
                <details className="archaeology-expander" open>
                  <summary className="archaeology-expander__title">
                    <span>终极整合：与过去的自己握手言和</span>
                    <button type="button" className={sectionLocked["lv6-integration"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv6-integration"); }}>{sectionLocked["lv6-integration"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv6-integration"] ? " section-body--locked" : ""}`}>
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
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv6-integration"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* ── 生命的传承 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>生命的传承：超越个体的延续</span>
                    <button type="button" className={sectionLocked["lv6-legacy"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv6-legacy"); }}>{sectionLocked["lv6-legacy"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv6-legacy"] ? " section-body--locked" : ""}`}>
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
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv6-legacy"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* ── 面对终点 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>面对终点：边界的消失</span>
                    <button type="button" className={sectionLocked["lv6-ending"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv6-ending"); }}>{sectionLocked["lv6-ending"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv6-ending"] ? " section-body--locked" : ""}`}>
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
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv6-ending"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* ── 归于星尘 ── */}
                <details className="archaeology-expander">
                  <summary className="archaeology-expander__title">
                    <span>归于星尘：最后的情感回响</span>
                    <button type="button" className={sectionLocked["lv6-stardust"] ? "btn-section-edit" : "btn-section-save"} onClick={(e) => { e.preventDefault(); toggleSection("lv6-stardust"); }}>{sectionLocked["lv6-stardust"] ? "编辑" : "保存"}</button>
                  </summary>
                  <div className={`archaeology-expander__body${sectionLocked["lv6-stardust"] ? " section-body--locked" : ""}`}>
                    {["final_thanks", "soul_rest"].map((id) => {
                      const field = level.fields.find((f) => f.id === id)!;
                      const key = `${currentLevel}.${field.id}`;
                      const value = currentValues[field.id];
                      const err = errors[key];
                      return (
                        <div key={field.id} className="wizard-field">
                          <label className="wizard-field-label">{field.label}</label>
                          <div className="wizard-field-control">
                            {renderFieldInput(field, value, (next) => handleFieldChange(field.id, next), sectionLocked["lv6-stardust"])}
                          </div>
                          {err && <div className="wizard-field-error">{err}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
              <div className="soul-encoding-panel__actions">
                <button type="button" className="btn-sync-cloud" disabled={!!syncedLevels[currentLevel]} onClick={handleSyncToCloud}>保存并同步到云端</button>
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
                                    handleFieldChange(field.id, next), levelReadOnly)}
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

