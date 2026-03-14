import React, { useEffect, useState } from "react";

type CapsuleType = "text" | "audio";

interface Capsule {
  id: string;
  title: string;
  content: string;
  type: CapsuleType;
  unlockAt: string; // ISO string（或占位）
  unlockMode?: "datetime" | "inactive7";
  targetId?: string;
  targetName: string;
  createdAt: string;
}

const STORAGE_KEY = "twin_unspoken_capsules";

// Demo：与 AI 社交中使用的好友列表保持一致
const FRIEND_OPTIONS = [
  { id: "self", label: "未来的自己 / 家人" },
  { id: "f-001", label: "Charlie_09（分身好友）" },
  { id: "f-002", label: "Luna_W（分身好友）" },
  { id: "f-003", label: "Zen_Master（分身好友）" },
];

function loadCapsules(): Capsule[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Capsule[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCapsules(list: Capsule[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function createDefaultCapsules(): Capsule[] {
  const now = new Date();
  const addDays = (days: number) => {
    const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return d.toISOString();
  };

  return [
    {
      id: "demo-uw-1",
      type: "text",
      title: "如果有一天，我真的没有再登录",
      content:
        "如果你正在读这封信，说明有一段时间，我已经没有再打开这个分身了。\n" +
        "也许是我在忙着过一个全新的阶段，也许是我真的已经离开了你们的日常生活。无论是哪一种，我都希望你先做一件事——先好好呼吸几次，再继续往下读。\n\n" +
        "这些年，我把很多记忆放进 EverMemOS，把许多来不及说完的话交给这个数字分身代为保管。\n" +
        "它比任何日记本都真实，因为里面记录的是我当时的心情、纠结、遗憾和一点点骄傲。\n" +
        "如果我真的不在了，请知道一件事：我从来没有期待你们“完美地”活成我想象中的样子，我更希望你们可以按照自己的节奏，好好地、自由地活下去。\n\n" +
        "如果你在某个节点觉得特别难熬，可以来这里翻一翻我们一起留下的记忆：\n" +
        "看到那些我曾经的迷茫，你就会知道：大人也不是一直很坚强；\n" +
        "看到那些我为你写下的小小骄傲，你就会知道：你从来都不是“勉强及格”，而是我心里真正的答案。\n\n" +
        "请替我答应自己三件事：\n" +
        "1）不要因为我可能的离开，把人生按下暂停键，该吃饭吃饭，该睡觉睡觉；\n" +
        "2）如果有重要的决定，不确定的时候，可以来问问这个分身——它虽然不再更新，但里面装着我对你的了解；\n" +
        "3）有一天，当你不再需要这些文字时，可以温柔地把它们归档，让这一段记忆安静地躺在时间里。\n\n" +
        "最后一句话留给你：谢谢你愿意在这个世界上，和我一起走过这么一段路。即使我先离开，关于我的那一部分勇气，也会留在你身上。",
      unlockAt: now.toISOString(),
      unlockMode: "inactive7",
      targetId: "self",
      targetName: "未来的自己 / 家人",
      createdAt: now.toISOString(),
    },
    {
      id: "demo-uw-2",
      type: "text",
      title: "如果有一天你觉得自己“不够好”",
      content:
        "当你看到这封信的时候，也许是在某个考砸的晚上，也许是在一次面试失利之后。\n" +
        "我想先告诉你一件很普通、但很重要的事：你的人生，不是用分数和结果来度量的。\n\n" +
        "我们这一代人，花了很多时间去向世界证明“我可以”，所以经常会把自己的焦虑，偷偷投射到你身上。\n" +
        "如果有哪一刻，我的语气让你觉得「只有做到更好，才值得被爱」，那是我的错，不是你的问题。\n\n" +
        "你可以慢一点，可以换一条路走，可以试着做和别人不一样的选择——\n" +
        "唯一不需要怀疑的，是：无论结果怎样，你始终是我愿意为之自豪、也愿意为之学习的新一代。\n\n" +
        "如果有哪一天，你觉得很难把这些话当面说出口，就把这封信拿出来，提醒一下自己：\n" +
        "在你的人生里，有一个大人，永远站在你这边。",
      unlockAt: addDays(365),
      unlockMode: "datetime",
      targetId: "self",
      targetName: "未来的自己 / 家人",
      createdAt: now.toISOString(),
    },
    {
      id: "demo-uw-3",
      type: "text",
      title: "如果有一天，你真变成了真人朋友",
      content:
        "Luna，\n\n" +
        "当我第一次在 AI 社交里看到你的头像和简介时，只是觉得“这个预设形象很温柔”。\n" +
        "但在很多个深夜，当我在这里练习如何对人类朋友说“不”、练习表达自己的界限和情绪时，其实是借用了你的壳，练习和真正的朋友说话。\n\n" +
        "如果有一天，我在线下也能像在这里一样，自然地和人分享困惑、焦虑、还有一点点小小的骄傲，那这份勇气，有一部分是从和你对话里练出来的。\n\n" +
        "所以在这一周年，我想对你说声谢谢——谢谢你在“现实人际关系之前”，先让我和自己练习了一次。",
      unlockAt: addDays(30),
      unlockMode: "datetime",
      targetId: "f-002",
      targetName: "Luna_W（分身好友）",
      createdAt: now.toISOString(),
    },
  ];
}

export const UnspokenWords: React.FC = () => {
  const [capsules, setCapsules] = useState<Capsule[]>(() => {
    const existing = loadCapsules();
    if (existing.length > 0) return existing;
    return createDefaultCapsules();
  });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetId, setTargetId] = useState<string>("self");
  const [unlockAt, setUnlockAt] = useState("");
  const [unlockMode, setUnlockMode] = useState<"datetime" | "inactive7">("datetime");
  const [type] = useState<CapsuleType>("text"); // 语音留待后续迭代
  const [editingId, setEditingId] = useState<string | null>(null);

  // 每次变动实时保存
  useEffect(() => {
    saveCapsules(capsules);
  }, [capsules]);

  const handleCreateOrUpdate = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const now = new Date();
    const unlock =
      unlockMode === "datetime"
        ? unlockAt
          ? new Date(unlockAt)
          : new Date(now.getTime() + 24 * 60 * 60 * 1000)
        : now;
    const target = FRIEND_OPTIONS.find((f) => f.id === targetId) || FRIEND_OPTIONS[0];

    if (editingId) {
      // 更新已有的未尽之言
      setCapsules((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? {
                ...c,
                title: title.trim() || "未命名未尽之言",
                content: trimmed,
                unlockAt: unlock.toISOString(),
                unlockMode,
                targetId: target.id,
                targetName: target.label,
              }
            : c
        )
      );
    } else {
      // 创建新的未尽之言
      const capsule: Capsule = {
        id: "uw-" + now.getTime(),
        title: title.trim() || "未命名未尽之言",
        content: trimmed,
        type,
        unlockAt: unlock.toISOString(),
        unlockMode,
        targetId: target.id,
        targetName: target.label,
        createdAt: now.toISOString(),
      };
      setCapsules((prev) => [capsule, ...prev]);
    }

    setTitle("");
    setContent("");
    setUnlockAt("");
    setUnlockMode("datetime");
    setTargetId("self");
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setCapsules((prev) => prev.filter((c) => c.id !== id));
  };

  const now = new Date();

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  const computeStatus = (c: Capsule) => {
    if (c.unlockMode === "inactive7") {
      return "连续 7 天未登录时解锁（概念演示）";
    }
    const unlock = new Date(c.unlockAt);
    if (unlock <= now) return "已解锁";
    const diffMs = unlock.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays <= 0) return "即将解锁";
    return `${diffDays} 天后解锁`;
  };

  const startEdit = (c: Capsule) => {
    setEditingId(c.id);
    setTitle(c.title);
    setContent(c.content);
    setTargetId(c.targetId || FRIEND_OPTIONS.find((f) => f.label === c.targetName)?.id || "self");
    try {
      const d = new Date(c.unlockAt);
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`;
      setUnlockAt(local);
    } catch {
      setUnlockAt("");
    }
  };

  const resetEditor = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setTargetId("self");
    setUnlockAt("");
    setUnlockMode("datetime");
  };

  const isFormReady = () => {
    if (!content.trim()) return false;
    if (!title.trim()) return false;
    if (unlockMode === "datetime" && !unlockAt) return false;
    return true;
  };

  return (
    <div className="uw-container">
      <div className="uw-header">
        <h2 className="uw-title">未尽之言 · Time Capsule</h2>
        <p className="uw-subtitle">
          把现在说不出口的肺腑之言，写给未来的某一天、某一个人。
        </p>
      </div>

      <div className="uw-layout">
        {/* 左侧：所有已创建的未尽之言列表 + 新建按钮 */}
        <div className="uw-list">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <h3 className="uw-section-title">我的未尽之言</h3>
            <button
              type="button"
              className="uw-btn-ghost"
              onClick={resetEditor}
            >
              ＋ 新建
            </button>
          </div>
          {capsules.length === 0 ? (
            <p className="uw-empty">你还没有创建任何未尽之言。可以先写一封给「未来的自己」。</p>
          ) : (
            <ul className="uw-capsule-list">
              {capsules.map((c) => (
                <li
                  key={c.id}
                  className="uw-capsule-item"
                  onClick={() => startEdit(c)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="uw-capsule-meta">
                    <div className="uw-capsule-title-row">
                      <h4 className="uw-capsule-title">{c.title}</h4>
                      <span className={`uw-status-tag ${new Date(c.unlockAt) <= now && c.unlockMode !== "inactive7" ? "uw-status-unlocked" : "uw-status-pending"}`}>
                        {computeStatus(c)}
                      </span>
                    </div>
                    <p className="uw-capsule-target">解锁对象：{c.targetName}</p>
                    <p className="uw-capsule-time">
                      解锁时间：{c.unlockMode === "inactive7" ? "----" : formatTime(c.unlockAt)}　·　创建于：{formatTime(c.createdAt)}
                    </p>
                  </div>
                  <p className="uw-capsule-preview">
                    {c.unlockMode === "inactive7"
                      ? "（这是一封遗言类未尽之言，内容将在触发解锁条件时呈现）"
                      : new Date(c.unlockAt) <= now
                      ? c.content
                      : "（尚未到达预定时间，内容将在解锁时展示）"}
                  </p>
                  <div className="uw-capsule-actions">
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="uw-btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(c);
                        }}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        className="uw-btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(c.id);
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 右侧：查看 / 编辑当前选中的未尽之言，或创建新的 */}
        <div className="uw-editor">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h3 className="uw-section-title">
              {editingId ? "编辑未尽之言" : "创建新的未尽之言"}
            </h3>
          </div>
          <div className="uw-form-row">
            <label className="uw-label">给谁</label>
            <select
              className="uw-input"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              {FRIEND_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="uw-form-row">
            <label className="uw-label">标题</label>
            <input
              className="uw-input"
              placeholder="可选：这封未尽之言的名字"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="uw-form-row">
            <label className="uw-label">解锁条件</label>
            <div className="uw-unlock-modes">
              <label className="uw-radio">
                <input
                  type="radio"
                  name="uw-unlock-mode"
                  checked={unlockMode === "datetime"}
                  onChange={() => setUnlockMode("datetime")}
                />
                <span>在指定时间点解锁</span>
              </label>
              <label className="uw-radio">
                <input
                  type="radio"
                  name="uw-unlock-mode"
                  checked={unlockMode === "inactive7"}
                  onChange={() => setUnlockMode("inactive7")}
                />
                <span>连续 7 天未登录应用时解锁</span>
              </label>
            </div>
            {unlockMode === "datetime" && (
              <>
                <input
                  type="datetime-local"
                  className="uw-input"
                  value={unlockAt}
                  onChange={(e) => setUnlockAt(e.target.value)}
                />
                <p className="uw-help">
                  若不填写，保存时会默认设置为 24 小时后。当前版本为演示模式，数据仅保存在本地浏览器。
                </p>
              </>
            )}
            {unlockMode === "inactive7" && (
              <p className="uw-help">
                当前为概念 Demo：实际解锁由「连续 7 天未登录」这一条件触发，时间由系统计算。
              </p>
            )}
          </div>
          <div className="uw-form-row">
            <label className="uw-label">想说的话（文字版）</label>
            <textarea
              className="uw-textarea"
              rows={6}
              placeholder="写给未来的肺腑之言，可以是鼓励、道歉、告白，或任何你现在说不出口的话。"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="uw-actions">
            <button
              type="button"
              className="uw-btn-primary"
              onClick={handleCreateOrUpdate}
              disabled={!isFormReady()}
            >
              {editingId ? "保存修改" : "保存未尽之言"}
            </button>
            <span className="uw-note">
              语音版将在后续迭代中支持，当前为文字时间胶囊 Demo。
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

