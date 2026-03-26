import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

/** 平面图世界坐标：节点拖拽 clamp 与 SVG 背景范围（越大可编辑区域越大） */
export const SOCIAL_WORLD_W = 1640;
export const SOCIAL_WORLD_H = 1080;
export const SOCIAL_CENTER_X = SOCIAL_WORLD_W / 2;
export const SOCIAL_CENTER_Y = SOCIAL_WORLD_H / 2;
const NODE_R = 36;
/** 外圈描边命中：圆半径与线宽（仅 stroke 接收指针，圆内可拖移） */
const RIM_CIRCLE_R = 34.5;
const RIM_STROKE_DEFAULT = 3.5;
const RIM_STROKE_HOVER = 6.5;
const RIM_STROKE_ACTIVE = 8.5;
const RIM_STROKE_PULL = 10;
const DRAG_THRESHOLD_PX = 6;
const VIEW_PAD = 24;

export interface SocialPlaneNode {
  id: string;
  name: string;
  role: string;
  gender?: string;
  note?: string;
  /** 头像 data URL；无则显示名称首字 */
  avatarUrl?: string;
  x?: number;
  y?: number;
}

export interface SocialPlaneEdge {
  id: string;
  from: string;
  to: string;
  /** 连线上展示的关系，如：同事、朋友、骑友 */
  relation: string;
}

function clampSocialXY(x: number, y: number): { x: number; y: number } {
  // 允许节点中心更靠近画布边缘：拖拽时不会“卡得太早”
  const pad = NODE_R + 2;
  return {
    x: Math.min(SOCIAL_WORLD_W - pad, Math.max(pad, x)),
    y: Math.min(SOCIAL_WORLD_H - pad, Math.max(pad, y)),
  };
}

/** 未存坐标时：以「本人」为中心，其余节点均匀落在圆周上 */
export function layoutSocialRadial(nodes: SocialPlaneNode[]): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>();
  const self = nodes.find((n) => n.role === "本人") ?? nodes[0];
  if (!self) return map;
  const cx = SOCIAL_CENTER_X;
  const cy = SOCIAL_CENTER_Y;
  const others = nodes.filter((n) => n.id !== self.id);
  // 节点越多，半径越大（但仍受边界 clamp 限制），避免彼此过度重叠。
  const baseFactor = 0.32;
  const perNodeExtra = 0.015; // 每增加一位对端节点，额外扩张半径因子
  const maxExtra = 0.18; // 半径因子上限：baseFactor + maxExtra
  const extra = Math.min(maxExtra, Math.max(0, (others.length - 3) * perNodeExtra));
  const R = Math.min(SOCIAL_WORLD_W, SOCIAL_WORLD_H) * (baseFactor + extra);
  map.set(self.id, clampSocialXY(cx, cy));
  others.forEach((n, i) => {
    const t = others.length <= 0 ? 0 : (i / others.length) * Math.PI * 2 - Math.PI / 2;
    map.set(n.id, clampSocialXY(cx + R * Math.cos(t), cy + R * Math.sin(t)));
  });
  return map;
}

function labelMidpointOffset(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset: number
): { lx: number; ly: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * offset;
  const ny = (dx / len) * offset;
  return { lx: mx + nx, ly: my + ny };
}

function pickSocialNodeIdAt(clientX: number, clientY: number): string | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const el of stack) {
    if (el instanceof HTMLElement && el.dataset.socialNodeId) {
      return el.dataset.socialNodeId;
    }
  }
  return null;
}

interface Props {
  nodes: SocialPlaneNode[];
  edges: SocialPlaneEdge[];
  selectedId: string | null;
  /** 侧栏输入框聚焦的连线 id（用于高亮对应线） */
  activeEdgeId: string | null;
  onSelectNode: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  /** 从节点1拖到节点2并松开时调用，由父级弹出关系文案后再写入边 */
  onEdgeLinkDrop: (fromId: string, toId: string) => void;
  /** 按径向重新摆节点（不改变连线） */
  onRelayoutRadial?: () => void;
  onAddNode?: () => void;
  onClearAll?: () => void;
}

export const MemoirSocialPlane: React.FC<Props> = ({
  nodes,
  edges,
  selectedId,
  activeEdgeId,
  onSelectNode,
  onMoveNode,
  onEdgeLinkDrop,
  onRelayoutRadial,
  onAddNode,
  onClearAll,
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const labelFilterId = `memoir-slf-${useId().replace(/\W/g, "_")}`;
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  /** 从圆心拖到光标：预览连线（超过阈值后启用，松手时决定连线或移动节点） */
  const [linkRubber, setLinkRubber] = useState<null | { fromId: string; x2: number; y2: number }>(null);
  const [linkHoverTargetId, setLinkHoverTargetId] = useState<string | null>(null);
  /** 鼠标落在外圈描边上（悬停加粗） */
  const [rimHoverId, setRimHoverId] = useState<string | null>(null);
  /** 在外圈按下未松手 */
  const [rimEngagedId, setRimEngagedId] = useState<string | null>(null);
  const dragRef = useRef<
    | { type: "pan"; sx: number; sy: number; px: number; py: number }
    | { type: "node"; id: string; sx: number; sy: number; nx: number; ny: number }
    | null
  >(null);
  /** 圆心区域：选中 + 拖移节点 */
  const coreGestureRef = useRef<{
    id: string;
    sx: number;
    sy: number;
    nx: number;
    ny: number;
    dragging: boolean;
  } | null>(null);
  /** 外圈描边：仅拉出关系线 */
  const rimGestureRef = useRef<{
    id: string;
    sx: number;
    sy: number;
    dragging: boolean;
  } | null>(null);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const clientToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const vp = outerRef.current;
      if (!vp) {
        return { wx: SOCIAL_CENTER_X, wy: SOCIAL_CENTER_Y };
      }
      const rect = vp.getBoundingClientRect();
      const vx = clientX - rect.left;
      const vy = clientY - rect.top;
      return {
        wx: (vx - panX) / zoom,
        wy: (vy - panY) / zoom,
      };
    },
    [panX, panY, zoom]
  );

  const resetView = useCallback(() => {
    const el = outerRef.current;
    if (!el) {
      setPanX(0);
      setPanY(0);
      setZoom(1);
      return;
    }
    const w = el.clientWidth;
    const h = el.clientHeight;
    const pad = VIEW_PAD;
    const s = Math.min((w - pad) / SOCIAL_WORLD_W, (h - pad) / SOCIAL_WORLD_H, 1.05);
    const z = Math.max(0.55, Math.min(1.25, s));
    setZoom(z);
    setPanX((w - SOCIAL_WORLD_W * z) / 2);
    setPanY((h - SOCIAL_WORLD_H * z) / 2);
  }, []);

  useEffect(() => {
    resetView();
  }, [resetView]);

  const onPointerDownSurface = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".memoir-social-plane-node")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { type: "pan", sx: e.clientX, sy: e.clientY, px: panX, py: panY };
    coreGestureRef.current = null;
    rimGestureRef.current = null;
    onSelectNode(null);
  };

  const onPointerDownCore = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const n = nodes.find((x) => x.id === id);
    if (!n || n.x == null || n.y == null) return;
    rimGestureRef.current = null;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    coreGestureRef.current = {
      id,
      sx: e.clientX,
      sy: e.clientY,
      nx: n.x,
      ny: n.y,
      dragging: false,
    };
    dragRef.current = null;
  };

  const onPointerDownRim = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const n = nodes.find((x) => x.id === id);
    if (!n || n.x == null || n.y == null) return;
    coreGestureRef.current = null;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setRimEngagedId(id);
    rimGestureRef.current = {
      id,
      sx: e.clientX,
      sy: e.clientY,
      dragging: false,
    };
    dragRef.current = null;
  };

  const onPointerMoveViewport = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d?.type === "pan") {
      setPanX(d.px + (e.clientX - d.sx));
      setPanY(d.py + (e.clientY - d.sy));
    }
  };

  const onPointerMoveCore = (e: React.PointerEvent, id: string) => {
    const g = coreGestureRef.current;
    if (!g || g.id !== id) return;
    const dist = Math.hypot(e.clientX - g.sx, e.clientY - g.sy);
    if (!g.dragging) {
      if (dist > DRAG_THRESHOLD_PX) {
        g.dragging = true;
        dragRef.current = { type: "node", id, sx: e.clientX, sy: e.clientY, nx: g.nx, ny: g.ny };
      }
      return;
    }
    const d = dragRef.current;
    if (d?.type === "node" && d.id === id) {
      const dx = (e.clientX - d.sx) / zoom;
      const dy = (e.clientY - d.sy) / zoom;
      const rawX = d.nx + dx;
      const rawY = d.ny + dy;
      const { x, y } = clampSocialXY(rawX, rawY);
      onMoveNode(id, x, y);
      dragRef.current = { type: "node", id, sx: e.clientX, sy: e.clientY, nx: x, ny: y };
    }
  };

  const onPointerMoveRim = (e: React.PointerEvent, id: string) => {
    const g = rimGestureRef.current;
    if (!g || g.id !== id) return;
    const dist = Math.hypot(e.clientX - g.sx, e.clientY - g.sy);
    if (!g.dragging) {
      if (dist > DRAG_THRESHOLD_PX) {
        g.dragging = true;
        dragRef.current = null;
        const { wx, wy } = clientToWorld(e.clientX, e.clientY);
        setLinkRubber({ fromId: id, x2: wx, y2: wy });
      }
      return;
    }
    const { wx, wy } = clientToWorld(e.clientX, e.clientY);
    setLinkRubber({ fromId: id, x2: wx, y2: wy });
    const hover = pickSocialNodeIdAt(e.clientX, e.clientY);
    setLinkHoverTargetId(hover && hover !== id ? hover : null);
  };

  const releasePan = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = null;
  };

  const onPointerUpCore = (e: React.PointerEvent, id: string) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const g = coreGestureRef.current;
    if (g && g.id === id && !g.dragging) {
      onSelectNode(id);
    }
    coreGestureRef.current = null;
    dragRef.current = null;
  };

  const onPointerUpRim = (e: React.PointerEvent, id: string) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const g = rimGestureRef.current;
    setLinkRubber(null);
    setLinkHoverTargetId(null);
    setRimEngagedId(null);

    if (g && g.id === id) {
      if (!g.dragging) {
        onSelectNode(id);
      } else {
        const targetId = pickSocialNodeIdAt(e.clientX, e.clientY);
        if (targetId && targetId !== id) {
          onEdgeLinkDrop(id, targetId);
        }
      }
    }
    rimGestureRef.current = null;
    dragRef.current = null;
  };

  const onPointerCancelCore = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    coreGestureRef.current = null;
    dragRef.current = null;
  };

  const onPointerCancelRim = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setLinkRubber(null);
    setLinkHoverTargetId(null);
    setRimEngagedId(null);
    rimGestureRef.current = null;
    dragRef.current = null;
  };

  const onPointerEnterRim = (_e: React.PointerEvent, id: string) => {
    setRimHoverId(id);
  };

  const onPointerLeaveRim = (_e: React.PointerEvent, id: string) => {
    setRimHoverId((cur) => (cur === id ? null : cur));
  };

  return (
    <div className="memoir-social-plane-root">
      <div className="memoir-social-plane-toolbar" role="toolbar" aria-label="社会关系图控制">
        <button
          type="button"
          className="memoir-social-plane-ctrl"
          onClick={() => setZoom((z) => Math.min(2.4, z * 1.12))}
          title="放大"
        >
          +
        </button>
        <button
          type="button"
          className="memoir-social-plane-ctrl"
          onClick={() => setZoom((z) => Math.max(0.4, z / 1.12))}
          title="缩小"
        >
          −
        </button>
        <span className="memoir-social-plane-toolbar-divider" aria-hidden />
        <button type="button" className="memoir-social-plane-ctrl" onClick={resetView} title="视野复位">
          ⊙
        </button>
        {onRelayoutRadial ? (
          <button
            type="button"
            className="memoir-social-plane-ctrl memoir-social-plane-ctrl--text"
            onClick={onRelayoutRadial}
            title="按中心径向重新排列节点"
          >
            径向排列
          </button>
        ) : null}
        <span style={{ flex: 1 }} aria-hidden />
        {onClearAll ? (
          <button
            type="button"
            className="memoir-social-plane-ctrl memoir-social-plane-ctrl--text memoir-social-plane-ctrl--danger"
            onClick={onClearAll}
            title="清空所有节点和连线，只保留[我]"
          >
            一键清空
          </button>
        ) : null}
        {onAddNode ? (
          <button
            type="button"
            className="memoir-social-plane-ctrl memoir-social-plane-ctrl--text memoir-social-plane-ctrl--primary"
            onClick={onAddNode}
            title="添加新节点"
          >
            + 添加节点
          </button>
        ) : null}
      </div>

      <div
        ref={outerRef}
        className="memoir-social-plane-viewport"
        onPointerDown={onPointerDownSurface}
        onPointerMove={onPointerMoveViewport}
        onPointerUp={releasePan}
        onPointerCancel={releasePan}
      >
        <div
          className="memoir-social-plane-world"
          style={{
            width: SOCIAL_WORLD_W,
            height: SOCIAL_WORLD_H,
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          }}
        >
          <svg
            className="memoir-social-plane-svg"
            width={SOCIAL_WORLD_W}
            height={SOCIAL_WORLD_H}
            aria-hidden
          >
            <defs>
              <filter id={labelFilterId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="#fff" floodOpacity="0.95" />
              </filter>
            </defs>
            <rect
              className="memoir-social-plane-bg"
              x={0}
              y={0}
              width={SOCIAL_WORLD_W}
              height={SOCIAL_WORLD_H}
              rx={12}
            />
            {edges.map((e) => {
              const a = byId.get(e.from);
              const b = byId.get(e.to);
              if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return null;
              const active = activeEdgeId === e.id;
              const { lx, ly } = labelMidpointOffset(a.x, a.y, b.x, b.y, 16);
              const text = (e.relation || "关系").trim() || "关系";
              const charCount = [...text].length;
              const labelW = Math.max(36, charCount * 12 + 16);
              return (
                <g
                  key={e.id}
                  className={["memoir-social-edge-group", active ? "memoir-social-edge-group--active" : ""]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <line
                    className="memoir-social-edge-line"
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                  />
                  <g className="memoir-social-edge-label" transform={`translate(${lx}, ${ly})`}>
                    <rect
                      className="memoir-social-edge-label-bg"
                      x={-labelW / 2}
                      y={-11}
                      width={labelW}
                      height={22}
                      rx={6}
                    />
                    <text
                      className="memoir-social-edge-label-text"
                      x={0}
                      y={1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      filter={`url(#${labelFilterId})`}
                    >
                      {text}
                    </text>
                  </g>
                </g>
              );
            })}
            {linkRubber
              ? (() => {
                  const from = byId.get(linkRubber.fromId);
                  if (!from || from.x == null || from.y == null) return null;
                  return (
                    <line
                      key="link-rubber"
                      className="memoir-social-edge-line memoir-social-edge-line--rubber"
                      x1={from.x}
                      y1={from.y}
                      x2={linkRubber.x2}
                      y2={linkRubber.y2}
                    />
                  );
                })()
              : null}
          </svg>

          {nodes.map((n) => {
            if (n.x == null || n.y == null) return null;
            const isSelf = n.role === "本人";
            const selected = n.id === selectedId;
            const linkTarget = linkHoverTargetId === n.id;
            const rimPull = linkRubber?.fromId === n.id;
            const rimHot = rimEngagedId === n.id;
            const rimHover = rimHoverId === n.id;
            const rimStrokeW = rimPull
              ? RIM_STROKE_PULL
              : rimHot
                ? RIM_STROKE_ACTIVE
                : rimHover
                  ? RIM_STROKE_HOVER
                  : RIM_STROKE_DEFAULT;
            return (
              <div
                key={n.id}
                className={[
                  "memoir-social-plane-node",
                  isSelf ? "memoir-social-plane-node--self" : "",
                  selected ? "memoir-social-plane-node--selected" : "",
                  linkTarget ? "memoir-social-plane-node--link-target" : "",
                  rimHot || rimPull ? "memoir-social-plane-node--rim-engaged" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-social-node-id={n.id}
                style={{
                  left: n.x,
                  top: n.y,
                  width: NODE_R * 2,
                  height: NODE_R * 2,
                  marginLeft: -NODE_R,
                  marginTop: -NODE_R,
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  data-social-node-id={n.id}
                  className="memoir-social-plane-node-disk"
                  onPointerDown={(e) => onPointerDownCore(e, n.id)}
                  onPointerMove={(e) => onPointerMoveCore(e, n.id)}
                  onPointerUp={(e) => onPointerUpCore(e, n.id)}
                  onPointerCancel={onPointerCancelCore}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectNode(n.id);
                    }
                  }}
                >
                  {n.avatarUrl ? (
                    <img
                      src={n.avatarUrl}
                      alt=""
                      className="memoir-social-plane-node-avatar"
                      draggable={false}
                    />
                  ) : (
                    <span className="memoir-social-plane-node-inner" aria-hidden>
                      {(n.name.trim() || "?").slice(0, 1)}
                    </span>
                  )}
                </div>
                <svg
                  className="memoir-social-plane-node-rim-svg"
                  width={NODE_R * 2}
                  height={NODE_R * 2}
                  role="presentation"
                >
                  <circle
                    data-social-node-id={n.id}
                    className={[
                      "memoir-social-plane-node-rim-stroke",
                      isSelf ? "memoir-social-plane-node-rim-stroke--self" : "",
                      linkTarget ? "memoir-social-plane-node-rim-stroke--target" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    cx={NODE_R}
                    cy={NODE_R}
                    r={RIM_CIRCLE_R}
                    fill="none"
                    strokeWidth={rimStrokeW}
                    pointerEvents="stroke"
                    onPointerEnter={(e) => onPointerEnterRim(e, n.id)}
                    onPointerLeave={(e) => onPointerLeaveRim(e, n.id)}
                    onPointerDown={(e) => onPointerDownRim(e, n.id)}
                    onPointerMove={(e) => onPointerMoveRim(e, n.id)}
                    onPointerUp={(e) => onPointerUpRim(e, n.id)}
                    onPointerCancel={onPointerCancelRim}
                  >
                    <title>沿外圈拖动可拉出关系线</title>
                  </circle>
                </svg>
                <span className="memoir-social-plane-node-name">{n.name}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="memoir-social-plane-hint">
        <strong>圆内</strong>：轻点选中，拖动可<strong>移动</strong>节点。
        <strong>外圈描边</strong>：鼠标移上会加粗，沿外圈按下并拖向<strong>另一节点</strong>松开可新建关系线；拖到空白松开则放弃。拖拽空白平移画布。
      </p>
    </div>
  );
};
