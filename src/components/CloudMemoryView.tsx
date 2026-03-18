import React, { useState, useMemo, useRef, useCallback } from "react";
import { getMemories, searchMemories, getStoredApiKey } from "../api/twinApi";

interface CloudMemoryViewProps {
  twinId: string;
}

type DetailTab = "overview" | "raw" | "meta" | "episodes" | "foresights" | "event_log";

function getMemorySummary(m: Record<string, unknown>): string {
  return (
    (m.summary as string) ??
    (m.episode as string) ??
    (m.atomic_fact as string) ??
    (m.foresight as string) ??
    (m.content as string) ??
    ""
  ).slice(0, 80) || "(无摘要)";
}

function getMemoryDate(m: Record<string, unknown>): string {
  const t =
    (m.timestamp as string) ||
    (m.created_at as string) ||
    (m.start_time as string) ||
    "";
  if (!t) return "—";
  try {
    const d = new Date(t);
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return t.slice(0, 16);
  }
}

export const CloudMemoryView: React.FC<CloudMemoryViewProps> = ({ twinId }) => {
  const [cloudMemories, setCloudMemories] = useState<Record<string, unknown>[] | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<Record<string, unknown> | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  const hasApiKey = !!getStoredApiKey();

  const browserRef = useRef<HTMLDivElement>(null);
  const [centerWidth, setCenterWidth] = useState(350);
  const isDragging = useRef(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = centerWidth;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const browserEl = browserRef.current;
      if (!browserEl) return;
      const browserRect = browserEl.getBoundingClientRect();
      const sidebarWidth = 260;
      const minCenter = 200;
      const minDetail = 200;
      const maxCenter = browserRect.width - sidebarWidth - minDetail - 6;
      const delta = ev.clientX - startX;
      const newWidth = Math.max(minCenter, Math.min(maxCenter, startWidth + delta));
      setCenterWidth(newWidth);
    };

    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [centerWidth]);

  const handleFetchCloud = async () => {
    setCloudError(null);
    setSearchResult(null);
    setSelectedIndex(null);
    setCloudLoading(true);
    try {
      const res = await getMemories({ user_id: twinId, page: 1, page_size: 20 });
      const list = res?.result?.memories ?? [];
      setCloudMemories(Array.isArray(list) ? list : []);
    } catch (e) {
      setCloudError(e instanceof Error ? e.message : "拉取失败");
      setCloudMemories([]);
    } finally {
      setCloudLoading(false);
    }
  };

  const handleSearchCloud = async () => {
    if (!searchQuery.trim()) return;
    setCloudError(null);
    setSearchLoading(true);
    setSearchResult(null);
    setSelectedIndex(null);
    try {
      const res = await searchMemories({ user_id: twinId, query: searchQuery.trim() });
      setSearchResult(res ?? null);
    } catch (e) {
      setCloudError(e instanceof Error ? e.message : "搜索失败");
    } finally {
      setSearchLoading(false);
    }
  };

  const listItems = useMemo(() => {
    const fromSearch = searchResult?.result?.memories;
    if (Array.isArray(fromSearch) && fromSearch.length > 0) return fromSearch as Record<string, unknown>[];
    return cloudMemories ?? [];
  }, [cloudMemories, searchResult]);

  const selectedMemory = selectedIndex !== null && listItems[selectedIndex] ? listItems[selectedIndex] : null;

  const detailTabs: { id: DetailTab; label: string }[] = [
    { id: "overview", label: "概览" },
    { id: "raw", label: "原始数据" },
    { id: "meta", label: "Meta" },
    { id: "episodes", label: "Episodes" },
    { id: "foresights", label: "Foresights" },
    { id: "event_log", label: "Event Log" },
  ];

  if (!hasApiKey) {
    return (
      <div className="vault-container">
        <div className="vault-header">
          <h1 className="vault-title">云端记忆 (EverMemOS)</h1>
          <p className="vault-subtitle">
            在右上角「设置」中填写 EverMemOS API Key 并保存后，可在此统一检视、搜索你个人在云端的长期记忆。
          </p>
        </div>
        <p style={{ fontSize: 14, color: "#6b7280" }}>
          当前尚未检测到 API Key。请先点击右上角「设置」，粘贴从 EverMemOS 控制台获取的 API Key，并点击「保存并登录」。
        </p>
      </div>
    );
  }

  return (
    <div className="vault-container">
      <div className="vault-header">
        <h1 className="vault-title">云端记忆 (EverMemOS)</h1>
        <p className="vault-subtitle">
          这里汇总展示你在 EverMemOS Cloud 中的结构化长期记忆，所有分身都会从同一套记忆仓库中读取，只是组合和视角不同。
        </p>
      </div>
      <div
        className="memory-browser"
        ref={browserRef}
        style={{ gridTemplateColumns: `260px ${centerWidth}px 6px 1fr` }}
      >
      {/* Left: Navigation sidebar */}
      <aside className="memory-browser__sidebar">
        <div className="memory-browser__brand">云端记忆</div>
        <section className="memory-browser__section">
          <div className="memory-browser__section-title">MEMORY SPACE</div>
          <div className="memory-browser__space-name" title={twinId}>
            {twinId}
          </div>
        </section>
        <section className="memory-browser__section">
          <div className="memory-browser__section-title">操作</div>
          <button
            type="button"
            className="memory-browser__btn-fetch"
            onClick={handleFetchCloud}
            disabled={cloudLoading}
          >
            {cloudLoading ? "拉取中…" : "拉取最近记忆"}
          </button>
        </section>
        <section className="memory-browser__section">
          <div className="memory-browser__section-title">DEVELOPMENT</div>
          <nav className="memory-browser__nav">
            <a
              href="https://console.evermind.ai/memory-browser"
              target="_blank"
              rel="noopener noreferrer"
              className="memory-browser__nav-link"
            >
              Memory Browser（控制台）
            </a>
          </nav>
        </section>
      </aside>

      {/* Center: List with search */}
      <div className="memory-browser__center">
        <div className="memory-browser__tabs">
          <span className="memory-browser__tab memory-browser__tab--active">记忆列表</span>
          {searchResult && (
            <span className="memory-browser__tab">搜索结果 ({listItems.length})</span>
          )}
        </div>
        <div className="memory-browser__search-row">
          <input
            type="text"
            className="memory-browser__search-input"
            placeholder="搜索记忆内容…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchCloud()}
          />
          <button
            type="button"
            className="memory-browser__btn-icon"
            onClick={handleSearchCloud}
            disabled={searchLoading || !searchQuery.trim()}
            title="搜索"
          >
            🔍
          </button>
          <button type="button" className="memory-browser__btn-icon" onClick={handleFetchCloud} title="刷新">
            ↻
          </button>
        </div>
        {cloudError && (
          <p className="memory-browser__error">{cloudError}</p>
        )}
        <div className="memory-browser__list">
          {listItems.length === 0 && !cloudLoading && !searchLoading && (
            <p className="memory-browser__empty">先点击左侧「拉取最近记忆」，或输入关键词搜索。</p>
          )}
          {listItems.map((m, i) => (
            <button
              key={(m.id as string) ?? i}
              type="button"
              className={`memory-browser__list-item ${selectedIndex === i ? "memory-browser__list-item--active" : ""}`}
              onClick={() => {
                setSelectedIndex(i);
                setDetailTab("overview");
              }}
            >
              <div className="memory-browser__list-item-title">{getMemorySummary(m)}</div>
              <div className="memory-browser__list-item-meta">Created: {getMemoryDate(m)}</div>
              <span className="memory-browser__list-item-time">{getMemoryDate(m)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="memory-browser__resize-handle"
        onMouseDown={handleResizeStart}
      />

      {/* Right: Detail panel with sub-tabs */}
      <div className="memory-browser__detail">
        {selectedMemory ? (
          <>
            <div className="memory-browser__detail-tabs">
              {detailTabs.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`memory-browser__detail-tab ${detailTab === id ? "memory-browser__detail-tab--active" : ""}`}
                  onClick={() => setDetailTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="memory-browser__detail-body">
              {detailTab === "overview" && (
                <div className="memory-browser__overview">
                  <div className="memory-browser__overview-avatar">
                    {(selectedMemory.sender_name as string)?.slice(0, 2) ||
                      (selectedMemory.user_id as string)?.slice(0, 2) ||
                      "—"}
                  </div>
                  <p className="memory-browser__overview-text">
                    {getMemorySummary(selectedMemory)}
                  </p>
                  <dl className="memory-browser__overview-meta">
                    <dt>时间</dt>
                    <dd>{getMemoryDate(selectedMemory)}</dd>
                    {(selectedMemory.memory_type as string) && (
                      <>
                        <dt>类型</dt>
                        <dd>{String(selectedMemory.memory_type)}</dd>
                      </>
                    )}
                  </dl>
                </div>
              )}
              {detailTab === "raw" && (
                <pre className="memory-browser__pre">{JSON.stringify(selectedMemory, null, 2)}</pre>
              )}
              {detailTab === "meta" && (
                <pre className="memory-browser__pre">
                  {JSON.stringify(
                    {
                      id: selectedMemory.id,
                      user_id: selectedMemory.user_id,
                      group_id: selectedMemory.group_id,
                      memory_type: selectedMemory.memory_type,
                      created_at: selectedMemory.created_at,
                      updated_at: selectedMemory.updated_at,
                      ...(selectedMemory.metadata as object),
                    },
                    null,
                    2
                  )}
                </pre>
              )}
              {detailTab === "episodes" && (
                <pre className="memory-browser__pre">
                  {JSON.stringify(
                    {
                      episode: selectedMemory.episode,
                      episode_id: selectedMemory.episode_id,
                      summary: selectedMemory.summary,
                      subject: selectedMemory.subject,
                    },
                    null,
                    2
                  )}
                </pre>
              )}
              {detailTab === "foresights" && (
                <pre className="memory-browser__pre">
                  {JSON.stringify(
                    {
                      content: selectedMemory.content,
                      foresight: selectedMemory.foresight,
                      start_time: selectedMemory.start_time,
                      end_time: selectedMemory.end_time,
                    },
                    null,
                    2
                  )}
                </pre>
              )}
              {detailTab === "event_log" && (
                <pre className="memory-browser__pre">
                  {JSON.stringify(
                    {
                      atomic_fact: selectedMemory.atomic_fact,
                      parent_type: selectedMemory.parent_type,
                      parent_id: selectedMemory.parent_id,
                      timestamp: selectedMemory.timestamp,
                    },
                    null,
                    2
                  )}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="memory-browser__detail-empty">
            <p>在左侧列表中点击一条记忆，在此查看详情。</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};
