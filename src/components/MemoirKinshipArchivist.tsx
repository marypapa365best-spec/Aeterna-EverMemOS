import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface KinNodeArchivist {
  id: string;
  name: string;
  relation: string;
  /** 头像（本地上传的 data URL）；无则画布显示姓名首字 */
  avatarUrl?: string;
  /** 相对本人的辈分：0=同辈（本人/兄弟姐妹/堂表亲等），-1=父母辈，+1=子女辈，以此类推 */
  generation?: number;
  /** 生辰 / 存在时间，画布上以棕色展示 */
  lifespan?: string;
  note?: string;
  /**
   * 直系父母节点 id（1～2 个）；子女/本人指向父母，画布用直角线连接。
   * 兄妹与本人填相同列表即共享父母、无兄妹间直连。
   */
  parentNodeIds?: string[];
  /** 配偶节点 id（与配偶走下方正交连线，不参与父母→子女分叉） */
  spouseNodeIds?: string[];
  /** 无父母时兄妹共用的组 ID，用于画暂时性兄妹横杠；添加父母后清除 */
  siblingGroupId?: string;
  x?: number;
  y?: number;
}

export const WORLD_W = 1120;
/** 虚拟画布高度（世界坐标）；视口可平移缩放。SVG 与节点共用同一坐标系，勿使用 viewBox，否则连线与节点错位。 */
export const WORLD_H = 8000;

/** 相邻辈分之间的垂直间距（世界坐标）；略大可减少各层血缘折线与虚线层级挤在一起 */
// 之前已适当放大；这里按你的要求再把虚线间距拉大 50%
export const KIN_TIER_GAP = 320;

/** 虚线与节点 x 的左右边界夹紧 */
export const KIN_TIER_PAD = 52;

/** 辈分 0（本人同辈）的基准纵坐标；向上为更小 y（更老一辈）。间距由平移浏览，不再为塞进旧视窗而抬高。 */
export const KIN_CENTER_Y = 398;
export const KIN_CENTER_X = WORLD_W / 2;

/** 辈分虚线左右留白（与原先 28px 虚线端点对齐 WORLD_W 时的几何一致） */
const KIN_TIER_LINE_EDGE_INSET = 28;
/** 与辈分虚线同长：可拖拽/布局的横向全局区间约为原 [52,1068] 的两倍宽 */
export const KIN_TIER_LINE_X_LEN = 2 * (WORLD_W - 2 * KIN_TIER_LINE_EDGE_INSET);
/** 节点 x 全局坐标左边界（与虚线左端一致） */
export const KIN_WORLD_X_MIN = KIN_CENTER_X - KIN_TIER_LINE_X_LEN / 2;
/** 节点 x 全局坐标右边界（与虚线右端一致） */
export const KIN_WORLD_X_MAX = KIN_CENTER_X + KIN_TIER_LINE_X_LEN / 2;
/** 世界层/SVG 横向像素宽度（局部坐标 0…KIN_LAYOUT_WIDTH 对应全局 KIN_WORLD_X_MIN…） */
export const KIN_LAYOUT_WIDTH = KIN_TIER_LINE_X_LEN;

const DRAG_THRESHOLD_PX = 6;

/** 全局 x → 世界 div / SVG 内局部 x（左缘 = 全局 KIN_WORLD_X_MIN） */
export function kinSvgX(gx: number): number {
  return gx - KIN_WORLD_X_MIN;
}

/** 横向布局/自动排布时夹紧（与虚线可视边界一致，留出 KIN_TIER_PAD） */
export function clampKinX(x: number): number {
  return Math.min(KIN_WORLD_X_MAX - KIN_TIER_PAD, Math.max(KIN_WORLD_X_MIN + KIN_TIER_PAD, x));
}

/** 拖拽时夹紧（略小于布局边距） */
export function clampKinDragX(x: number): number {
  const pad = 48;
  return Math.min(KIN_WORLD_X_MAX - pad, Math.max(KIN_WORLD_X_MIN + pad, x));
}

/** 由辈分数得到该层虚线/节点的基准 y（同一层节点对齐此高度；辈分超出 ±8 时夹紧） */
export function kinTierY(generation: number): number {
  const clamped = Math.max(-8, Math.min(8, generation));
  return KIN_CENTER_Y + clamped * KIN_TIER_GAP;
}

/**
 * 解析节点辈分：优先读 `generation`；否则按关系粗略推断（兼容旧数据）。
 */
export function getKinGeneration(n: KinNodeArchivist, _all: KinNodeArchivist[]): number {
  if (typeof n.generation === "number" && Number.isFinite(n.generation)) return n.generation;
  if (n.relation === "本人") return 0;
  const r = n.relation;
  if (/曾祖|高祖/.test(r)) return -4;
  if (/祖父母|外祖父母|祖父|祖母|外祖父|外祖母|爷爷|奶奶|外公|外婆/.test(r)) return -2;
  if (r === "父系" || r === "母系" || /父亲|母亲|爸爸|妈妈|^父$|^母$/.test(r)) return -1;
  if (/曾孙|玄孙/.test(r)) return 3;
  if (/孙子|孙女|外孙|孙儿|^孙$/.test(r)) return 2;
  if (/儿子|女儿|长子|次子|三子|独子|千金/.test(r)) return 1;
  if (/兄弟|姐妹|兄妹|姐弟|堂亲|表亲|堂兄|表弟|表姐|表妹|同辈|配偶|伴侣|夫妻/.test(r)) return 0;
  return 0;
}

/**
 * 父母 → 子女：直角分叉（双亲倒 T；单亲为折线）。
 * 两段高度 yNearParent / yNearChild，让父母间横杠与靠子女一侧的折线错开，避免与下一辈连线挤在同一水平线。
 */
// 父母到兄妹共享横杠的“竖线段”更长：t 越大，yNearParent 越靠近子女层
const KIN_ROUTE_T_NEAR_PARENT = 0.42;
// 横杠在“子女/兄妹节点”的上方：t 越小，yNearChild 越靠近父母层，上方距离更大。
// 兄妹到节点的“竖线段”更短：t 越大，yNearChild 越靠近子女层中心
const KIN_ROUTE_T_NEAR_CHILD = 0.66;
/** 两名及以上兄妹：共享横杠在节点中心上方（头像上沿附近）；父母仅一条中轴垂到该杠，再短竖接入各节点 */
const KIN_SIBLING_TIE_ABOVE_CENTER = 80;

function orthogonalParentToChildPaths(parents: { x: number; y: number }[], child: { x: number; y: number }): string[] {
  if (parents.length === 0) return [];
  const cy = child.y;
  const cx = kinSvgX(child.x);
  const sorted = [...parents].sort((a, b) => a.x - b.x);
  const py = sorted[0].y;
  const span = cy - py;
  const yNearParent = py + span * KIN_ROUTE_T_NEAR_PARENT;
  const yNearChild = py + span * KIN_ROUTE_T_NEAR_CHILD;
  const out: string[] = [];

  if (sorted.length === 1) {
    const p = sorted[0];
    const px = kinSvgX(p.x);
    if (Math.abs(cx - px) < 0.5) {
      out.push(`M ${px} ${py} L ${px} ${yNearParent} L ${cx} ${yNearChild} L ${cx} ${cy}`);
    } else {
      out.push(`M ${px} ${py} L ${px} ${yNearParent} L ${cx} ${yNearParent} L ${cx} ${yNearChild} L ${cx} ${cy}`);
    }
    return out;
  }

  const lx = kinSvgX(sorted[0].x);
  const rx = kinSvgX(sorted[sorted.length - 1].x);
  const mx = (lx + rx) / 2;
  for (const p of sorted) {
    const px = kinSvgX(p.x);
    out.push(`M ${px} ${p.y} L ${px} ${yNearParent}`);
  }
  out.push(`M ${lx} ${yNearParent} L ${rx} ${yNearParent}`);
  out.push(`M ${mx} ${yNearParent} L ${mx} ${yNearChild}`);
  if (Math.abs(cx - mx) >= 0.5) {
    out.push(`M ${mx} ${yNearChild} L ${cx} ${yNearChild}`);
  }
  out.push(`M ${cx} ${yNearChild} L ${cx} ${cy}`);
  return out;
}

function parentIdsKey(ids: string[] | undefined): string {
  if (!ids?.length) return "";
  return [...ids].slice().sort().join("|");
}

/**
 * 按「父母组合」一次性画出：
 * 1) 父母到 yNearParent 的竖线 + 父母间横杠
 * 2) 独生子女：经 yNearChild 横杠再垂到节点
 * 3) 两名及以上兄妹：横杠在节点上方 yTie，父母一条中轴垂到 yTie；兄妹间仅该横杠 + 短垂线，无额外「通向父母」的 per-node 竖叉
 */
type ParentPoint = { x: number; y: number; hideLineUnderCaption?: boolean };

/** 节点中心 nodeY：头像直径 84；caption 在头像下方，竖线在此 y 区间内不画，避免与姓名/日期重叠 */
const KIN_CAPTION_LINE_HIDE_BELOW_CENTER_START = 40;
const KIN_CAPTION_LINE_HIDE_BELOW_CENTER_END = 122;

function pushParentVerticalToYNearParent(dParts: string[], p: ParentPoint, yNearParent: number) {
  const px = kinSvgX(p.x);
  if (!p.hideLineUnderCaption) {
    dParts.push(`M ${px} ${p.y} L ${px} ${yNearParent}`);
    return;
  }
  const hideStart = p.y + KIN_CAPTION_LINE_HIDE_BELOW_CENTER_START;
  const hideEnd = p.y + KIN_CAPTION_LINE_HIDE_BELOW_CENTER_END;
  if (yNearParent <= hideStart) {
    dParts.push(`M ${px} ${p.y} L ${px} ${yNearParent}`);
    return;
  }
  dParts.push(`M ${px} ${p.y} L ${px} ${hideStart}`);
  if (yNearParent > hideEnd) dParts.push(`M ${px} ${hideEnd} L ${px} ${yNearParent}`);
}

/** 自上而下的竖线段 (yFrom→yTo)，挖掉与节点 (x, nodeY) 姓名区重叠的区间 */
function pushVerticalDownAvoidCaption(
  dParts: string[],
  x: number,
  nodeY: number,
  yFrom: number,
  yTo: number
) {
  if (yTo <= yFrom) return;
  const sx = kinSvgX(x);
  const h0 = nodeY + KIN_CAPTION_LINE_HIDE_BELOW_CENTER_START;
  const h1 = nodeY + KIN_CAPTION_LINE_HIDE_BELOW_CENTER_END;
  const a = yFrom;
  const b = yTo;
  if (b <= h0 || a >= h1) {
    dParts.push(`M ${sx} ${a} L ${sx} ${b}`);
    return;
  }
  if (a >= h0 && b <= h1) return;
  if (a < h0) dParts.push(`M ${sx} ${a} L ${sx} ${Math.min(b, h0)}`);
  if (b > h1) {
    const st = Math.max(a, h1);
    if (st < b) dParts.push(`M ${sx} ${st} L ${sx} ${b}`);
  }
}

/**
 * 配偶：两侧自中心竖直向下，在 yJoin 横连。
 * 使用比 KIN_ROUTE_T_NEAR_PARENT 更小的系数，确保配偶横线不与子女连线的 yNearParent 重叠。
 */
const KIN_ROUTE_T_SPOUSE = 0.42; // 与 KIN_ROUTE_T_NEAR_PARENT 相同，使配偶横线落在节点 caption 区域下方（99px），与父母连线风格一致
function orthogonalSpousePairPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const left = a.x <= b.x ? a : b;
  const right = a.x <= b.x ? b : a;
  const lx = left.x;
  const ly = left.y;
  const rx = right.x;
  const ry = right.y;
  const yJoin = Math.max(ly, ry) + KIN_TIER_GAP * KIN_ROUTE_T_SPOUSE;

  const dParts: string[] = [];
  pushVerticalDownAvoidCaption(dParts, lx, ly, ly, yJoin);
  pushVerticalDownAvoidCaption(dParts, rx, ry, ry, yJoin);
  dParts.push(`M ${kinSvgX(lx)} ${yJoin} L ${kinSvgX(rx)} ${yJoin}`);

  return dParts.join(" ");
}

function orthogonalParentGroupToChildrenPath(
  parents: ParentPoint[],
  children: { x: number; y: number }[]
): string {
  if (parents.length === 0 || children.length === 0) return "";

  const sortedParents = [...parents].sort((a, b) => a.x - b.x);
  const py = sortedParents[0].y;
  const cy = children[0].y;
  const span = cy - py;
  const yNearParent = py + span * KIN_ROUTE_T_NEAR_PARENT;
  const sortedChildren = [...children].sort((a, b) => a.x - b.x);
  const leftChildX = sortedChildren[0].x;
  const rightChildX = sortedChildren[sortedChildren.length - 1].x;
  // 单子女与多子女统一用相同的横杠高度（距子女节点中心固定偏移）
  const yTie = Math.max(yNearParent + 6, cy - KIN_SIBLING_TIE_ABOVE_CENTER);

  // 单亲
  if (sortedParents.length === 1) {
    const p = sortedParents[0];
    const gx0 = Math.min(p.x, leftChildX, rightChildX);
    const gx1 = Math.max(p.x, leftChildX, rightChildX);
    const dParts: string[] = [];
    pushParentVerticalToYNearParent(dParts, p, yNearParent);
    pushVerticalDownAvoidCaption(dParts, p.x, p.y, yNearParent, yTie);
    dParts.push(`M ${kinSvgX(gx0)} ${yTie} L ${kinSvgX(gx1)} ${yTie}`);
    for (const c of sortedChildren) {
      pushVerticalDownAvoidCaption(dParts, c.x, c.y, yTie, cy);
    }
    return dParts.join(" ");
  }

  const lx = kinSvgX(sortedParents[0].x);
  const rx = kinSvgX(sortedParents[sortedParents.length - 1].x);
  const mx = (lx + rx) / 2;

  const lxG = sortedParents[0].x;
  const rxG = sortedParents[sortedParents.length - 1].x;
  const mxG = (lxG + rxG) / 2;

  const barLeft = kinSvgX(Math.min(leftChildX, mxG));
  const barRight = kinSvgX(Math.max(rightChildX, mxG));

  const dParts: string[] = [];

  for (const p of sortedParents) {
    pushParentVerticalToYNearParent(dParts, p, yNearParent);
  }
  dParts.push(`M ${lx} ${yNearParent} L ${rx} ${yNearParent}`);
  const stemAtParent = sortedParents.find((p) => Math.abs(p.x - mxG) < 0.5);
  if (stemAtParent) {
    pushVerticalDownAvoidCaption(dParts, mxG, stemAtParent.y, yNearParent, yTie);
  } else {
    dParts.push(`M ${mx} ${yNearParent} L ${mx} ${yTie}`);
  }
  dParts.push(`M ${barLeft} ${yTie} L ${barRight} ${yTie}`);
  for (const c of sortedChildren) {
    pushVerticalDownAvoidCaption(dParts, c.x, c.y, yTie, cy);
  }

  return dParts.join(" ");
}

/** 按辈分横向分层排布；同一虚线上的节点 y 相同 */
export function layoutDefaults(nodes: KinNodeArchivist[]): Map<string, { x: number; y: number }> {
  const cx = KIN_CENTER_X;
  const map = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return map;

  const byTier = new Map<number, KinNodeArchivist[]>();
  for (const n of nodes) {
    const g = getKinGeneration(n, nodes);
    if (!byTier.has(g)) byTier.set(g, []);
    byTier.get(g)!.push(n);
  }

  const sortedTiers = [...byTier.keys()].sort((a, b) => a - b);

  for (const g of sortedTiers) {
    const list = byTier.get(g) ?? [];
    const y = clampKinTierLineY(g);
    // 「本人」固定水平居中，其余节点对称分布
    const selfNode = list.find((n) => n.relation === "本人");
    if (selfNode) map.set(selfNode.id, { x: cx, y });
    const others = list.filter((n) => n.relation !== "本人");
    const count = others.length;
    const spread = Math.min(2000, 260 + Math.max(0, count - 1) * 279);
    others.forEach((n, i) => {
      const t = count <= 1 ? 0 : (i / (count - 1)) * 2 - 1;
      const x = clampKinX(cx + t * (spread / 2));
      map.set(n.id, { x, y });
    });
  }

  return map;
}

export type KinAddKind = "parents" | "siblings" | "children" | "spouse";

interface Props {
  nodes: KinNodeArchivist[];
  selectedId: string | null;
  onSelectNode: (id: string) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  /** 父母=上一条虚线双节点；兄妹=同辈；子女=下一辈；配偶=同辈且仅与当前节点连线 */
  onAddMember: (kind: KinAddKind) => void;
  /** 按辈分虚线重新排布节点（可选） */
  onRelayoutByTier?: () => void;
  /** 清空图上除「本人」外的节点（由父级实现） */
  onClearToSelfOnly?: () => void;
  /** 一键全部保存所有节点（由父级实现） */
  onSaveAll?: () => void;
  /** 一键全部保存成功反馈（父级控制） */
  saveAllOk?: boolean;
  /** 递增时触发画布重新居中（如清空后） */
  resetViewSignal?: number;
  /** 替换左侧 bento 面板的自定义内容（如成员基本信息） */
  sidePanel?: React.ReactNode;
}

/** 辈分虚线 / 节点层的 y；不随视窗高度夹紧，与 `kinTierY` 一致（画布可拖拽浏览）。 */
export function clampKinTierLineY(generation: number): number {
  return kinTierY(generation);
}

const ADD_OPTIONS: { kind: KinAddKind; label: string }[] = [
  { kind: "parents", label: "父母" },
  { kind: "siblings", label: "兄妹" },
  { kind: "children", label: "子女" },
  { kind: "spouse", label: "配偶" },
];

export const MemoirKinshipArchivist: React.FC<Props> = ({
  nodes,
  selectedId,
  onSelectNode,
  onMoveNode,
  onAddMember,
  onRelayoutByTier,
  onClearToSelfOnly,
  onSaveAll,
  saveAllOk,
  resetViewSignal = 0,
  sidePanel,
}) => {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const addMenuRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const didInitialFitRef = useRef(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<
    | { type: "pan"; sx: number; sy: number; px: number; py: number }
    | { type: "node"; id: string; sx: number; sy: number; nx: number; ny: number }
    | null
  >(null);
  const nodeGestureRef = useRef<{
    id: string;
    sx: number;
    sy: number;
    nx: number;
    ny: number;
    dragging: boolean;
  } | null>(null);

  /** 与 onAddMember 锚点一致：图中已有父母/配偶时不可重复添加对应类型 */
  const { parentsAddDisabled, spouseAddDisabled } = useMemo(() => {
    const anchorId =
      selectedId ?? nodes.find((n) => n.relation === "本人")?.id ?? nodes[0]?.id ?? null;
    const anchorNode = anchorId ? (nodes.find((n) => n.id === anchorId) ?? null) : null;
    if (!anchorNode) {
      return { parentsAddDisabled: false, spouseAddDisabled: false };
    }
    const pids = anchorNode.parentNodeIds;
    const parentsAddDisabled =
      !!pids?.length && pids.some((pid) => nodes.some((n) => n.id === pid));
    const sids = anchorNode.spouseNodeIds;
    const hasExplicitSpouse = !!sids?.length && sids.some((sid) => nodes.some((n) => n.id === sid));
    // co-parent: another node shares a child with anchorNode
    const hasCoParent = nodes.some(
      (c) =>
        c.id !== anchorNode.id &&
        c.parentNodeIds?.includes(anchorNode.id) &&
        (c.parentNodeIds?.length ?? 0) > 1
    );
    const spouseAddDisabled = hasExplicitSpouse || hasCoParent;
    return { parentsAddDisabled, spouseAddDisabled };
  }, [selectedId, nodes]);

  /** 搜索：按姓名模糊匹配（忽略大小写、空格） */
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(nodes.filter((n) => n.name.toLowerCase().includes(q)).map((n) => n.id));
  }, [searchQuery, nodes]);

  /** 定位到第一个匹配节点 */
  const jumpToFirstMatch = useCallback(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    const hit = nodes.find((n) => n.name.toLowerCase().includes(q));
    if (!hit || hit.x == null || hit.y == null) return;
    const el = outerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    setPanX(w / 2 - kinSvgX(hit.x) * zoom);
    setPanY(h / 2 - hit.y * zoom);
    onSelectNode(hit.id);
  }, [searchQuery, nodes, zoom, onSelectNode]);

  /** 按节点纵向来适配缩放，并把视野对准内容区（不再按整页 WORLD_H 居中，否则大画布会对着空白中段）。 */
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
    const pad = 48;
    const list = nodesRef.current;
    let yMin = KIN_CENTER_Y - 400;
    let yMax = KIN_CENTER_Y + 600;
    for (const n of list) {
      if (n.y != null) {
        yMin = Math.min(yMin, n.y - 100);
        yMax = Math.max(yMax, n.y + 100);
      }
    }
    const contentH = Math.max(320, yMax - yMin);
    const contentCy = (yMin + yMax) / 2;
    const s = Math.min((w - pad) / KIN_LAYOUT_WIDTH, (h - pad) / contentH, 1.15);
    const z = Math.max(0.45, Math.min(1.2, s));
    setZoom(z);
    setPanX((w - KIN_LAYOUT_WIDTH * z) / 2);
    setPanY(h / 2 - contentCy * z);
  }, []);

  useEffect(() => {
    if (nodes.length === 0) {
      didInitialFitRef.current = false;
      return;
    }
    if (!didInitialFitRef.current) {
      didInitialFitRef.current = true;
      resetView();
    }
  }, [nodes, resetView]);

  useEffect(() => {
    if (resetViewSignal < 1) return;
    resetView();
  }, [resetViewSignal, resetView]);

  useEffect(() => {
    if (!addMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [addMenuOpen]);

  const onPointerDownSurface = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".archivist-node")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { type: "pan", sx: e.clientX, sy: e.clientY, px: panX, py: panY };
    nodeGestureRef.current = null;
  };

  const onPointerDownNode = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const n = nodes.find((x) => x.id === id);
    if (!n || n.x == null || n.y == null) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    nodeGestureRef.current = {
      id,
      sx: e.clientX,
      sy: e.clientY,
      nx: n.x,
      ny: n.y,
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

  const onPointerMoveNode = (e: React.PointerEvent, id: string) => {
    const g = nodeGestureRef.current;
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
      const newX = d.nx + dx;
      const newY = d.ny + dy;
      onMoveNode(id, newX, newY);
      dragRef.current = { type: "node", id, sx: e.clientX, sy: e.clientY, nx: newX, ny: newY };
    }
  };

  const onPointerUpViewport = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = null;
  };

  const onPointerUpNode = (e: React.PointerEvent, id: string) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const g = nodeGestureRef.current;
    if (g && g.id === id && !g.dragging) {
      onSelectNode(id);
    }
    nodeGestureRef.current = null;
    dragRef.current = null;
  };

  const tierGenerations = useMemo(
    () => [...new Set(nodes.map((n) => getKinGeneration(n, nodes)))].sort((a, b) => a - b),
    [nodes]
  );

  const paths: string[] = [];
  const pathKeys: string[] = [];

  /**
   * 根据“父母组合 + 子女所在辈分层（y）”分组后一次性画出血缘线。
   * 多名兄妹复用同一条节点上方的共享横杠；每人仅多一根短垂线入头像，父母侧仅一条中轴垂到该杠。
   */
  const groups = new Map<
    string,
    { parentIds: string[]; children: { id: string; x: number; y: number }[] }
  >();

  for (const child of nodes) {
    const pids = child.parentNodeIds;
    if (!pids?.length || child.x == null || child.y == null) continue;

    const sortedParentIds = pids.slice().sort();
    const parentKey = sortedParentIds.join("|");
    const groupKey = `${parentKey}@${child.y}`;

    const existing = groups.get(groupKey);
    if (existing) {
      existing.children.push({ id: child.id, x: child.x, y: child.y });
    } else {
      groups.set(groupKey, {
        parentIds: sortedParentIds,
        children: [{ id: child.id, x: child.x, y: child.y }],
      });
    }
  }

  let groupIdx = 0;
  for (const group of groups.values()) {
    const parents: ParentPoint[] = [];
    for (const pid of group.parentIds) {
      const p = nodes.find((n) => n.id === pid);
      if (!p) continue;
      // 若坐标尚未初始化，按辈分推算兜底坐标，避免连线静默消失
      const px = p.x ?? KIN_CENTER_X;
      const py = p.y ?? kinTierY(getKinGeneration(p, nodes));
      parents.push({ x: px, y: py, hideLineUnderCaption: true });
    }
    if (parents.length === 0) continue;

    const d = orthogonalParentGroupToChildrenPath(parents, group.children);
    if (!d) continue;

    paths.push(d);
    pathKeys.push(`kin-group-${groupIdx}`);
    groupIdx += 1;
  }

  /** 配偶：同辈正交线（两侧竖段长度同父母 yNearParent，底边横连，不接子女层） */
  let spouseIdx = 0;
  for (const n of nodes) {
    if (!n.spouseNodeIds?.length || n.x == null || n.y == null) continue;
    for (const sid of n.spouseNodeIds) {
      if (n.id.localeCompare(sid) >= 0) continue;
      const o = nodes.find((x) => x.id === sid);
      if (o?.x == null || o.y == null) continue;
      paths.push(orthogonalSpousePairPath({ x: n.x, y: n.y }, { x: o.x, y: o.y }));
      pathKeys.push(`kin-spouse-${spouseIdx}`);
      spouseIdx += 1;
    }
  }

  /** 无父母兄妹组：画横杠 + 短竖线，待添加父母后由正常血缘线接管 */
  const parentlessSiblingGroups = new Map<string, { x: number; y: number }[]>();
  for (const n of nodes) {
    if (!n.siblingGroupId || n.parentNodeIds?.length || n.x == null || n.y == null) continue;
    const grp = parentlessSiblingGroups.get(n.siblingGroupId) ?? [];
    grp.push({ x: n.x, y: n.y });
    parentlessSiblingGroups.set(n.siblingGroupId, grp);
  }
  let psgIdx = 0;
  for (const members of parentlessSiblingGroups.values()) {
    if (members.length < 2) continue;
    const yTie = members[0].y - KIN_SIBLING_TIE_ABOVE_CENTER;
    const xs = members.map((m) => kinSvgX(m.x));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    let d = `M ${minX} ${yTie} L ${maxX} ${yTie}`;
    for (const m of members) {
      const sx = kinSvgX(m.x);
      d += ` M ${sx} ${yTie} L ${sx} ${m.y - 42}`;
    }
    paths.push(d);
    pathKeys.push(`kin-psg-${psgIdx}`);
    psgIdx += 1;
  }

  return (
    <div className="archivist-root">
      <div className="archivist-topbar">
        <div className="archivist-brand">
          <span className="archivist-brand-icon" aria-hidden>
            ◈
          </span>
          <div>
            <h3 className="archivist-brand-title">数字档案馆</h3>
            <p className="archivist-brand-sub">血缘卷宗 · The Digital Archivist</p>
          </div>
        </div>
        <div className="archivist-search-wrap">
          <span className="archivist-search-icon" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            className="archivist-search"
            placeholder="检索谱系…"
            aria-label="检索谱系"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { jumpToFirstMatch(); setSearchQuery(""); } }}
          />
        </div>
      </div>

      <div className="archivist-main">
        <aside className="archivist-bento" aria-label={sidePanel ? "成员基本信息" : "卷宗摘要"}>
          {sidePanel ?? (
            <>
              <div className="archivist-bento-head">
                <div className="archivist-bento-icon" aria-hidden>⎔</div>
                <div>
                  <h4 className="archivist-bento-title">血缘卷宗</h4>
                  <p className="archivist-bento-meta">辈分虚线 · 父母双节点直角连线</p>
                </div>
              </div>
              <p className="archivist-bento-hint">
                血缘画「子女 → 父母」直角线；<strong>配偶</strong>为同辈下方正交连线（形似父母分叉，不接下一辈）。<strong>父母</strong>接上双亲；<strong>兄妹</strong>共用当前节点的父母；<strong>子女</strong>连到当前节点。
              </p>
              {onRelayoutByTier ? (
                <button type="button" className="archivist-bento-relayout" onClick={onRelayoutByTier}>
                  整理排列
                </button>
              ) : null}
              {onClearToSelfOnly ? (
                <button
                  type="button"
                  className="archivist-bento-clear"
                  onClick={onClearToSelfOnly}
                  title="删除除「本人」以外的所有成员"
                >
                  一键清空
                </button>
              ) : null}
            </>
          )}
        </aside>

        <div className="archivist-canvas-wrap">
          <span className="archivist-member-count">成员数：{nodes.length}</span>
          <div className="archivist-controls" role="toolbar" aria-label="画布控制">
            <button
              type="button"
              className="archivist-ctrl-btn"
              onClick={() => setZoom((z) => Math.min(2.8, z * 1.12))}
              title="放大（画布不支持滚轮缩放，避免误触）"
            >
              +
            </button>
            <button
              type="button"
              className="archivist-ctrl-btn"
              onClick={() => setZoom((z) => Math.max(0.35, z / 1.12))}
              title="缩小（画布不支持滚轮缩放，避免误触）"
            >
              −
            </button>
            <div className="archivist-ctrl-divider" />
            <button type="button" className="archivist-ctrl-btn" onClick={resetView} title="居中视野">
              ⊙
            </button>
          </div>

          <div
            ref={outerRef}
            className="archivist-viewport"
            onPointerDown={onPointerDownSurface}
            onPointerMove={onPointerMoveViewport}
            onPointerUp={onPointerUpViewport}
            onPointerCancel={onPointerUpViewport}
          >
            <div
              className="archivist-world"
              style={{
                width: KIN_LAYOUT_WIDTH,
                height: WORLD_H,
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              }}
            >
              <svg className="archivist-mesh-svg" width={KIN_LAYOUT_WIDTH} height={WORLD_H} aria-hidden>
                {tierGenerations.map((g) => {
                  const yy = clampKinTierLineY(g);
                  return (
                    <line
                      key={`tier-${g}`}
                      className="archivist-tier-line"
                      x1={0}
                      y1={yy}
                      x2={KIN_LAYOUT_WIDTH}
                      y2={yy}
                    />
                  );
                })}
                {paths.map((d, i) => {
                  const pk = pathKeys[i] ?? "";
                  const lineClass = pk.startsWith("kin-")
                    ? "archivist-mesh-line archivist-mesh-line--orthogonal"
                    : "archivist-mesh-line";
                  return <path key={pk || i} className={lineClass} d={d} />;
                })}
              </svg>

              {nodes.map((n) => {
                if (n.x == null || n.y == null) return null;
                const isSelf = n.relation === "本人";
                const isParents = n.relation === "父亲" || n.relation === "母亲";
                const isSelected = n.id === selectedId;
                return (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    className={[
                      "archivist-node",
                      isSelf ? "archivist-node--self" : "",
                      isParents ? "archivist-node--parents" : "",
                      isSelected ? "archivist-node--selected" : "",
                      searchMatches.has(n.id) ? "archivist-node--match" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ left: kinSvgX(n.x), top: n.y, transform: "translate(-50%, -50%)" }}
                    onPointerDown={(e) => onPointerDownNode(e, n.id)}
                    onPointerMove={(e) => onPointerMoveNode(e, n.id)}
                    onPointerUp={(e) => onPointerUpNode(e, n.id)}
                    onPointerCancel={(e) => onPointerUpNode(e, n.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectNode(n.id);
                      }
                    }}
                  >
                    <div className="archivist-node-avatar" aria-hidden>
                      {n.avatarUrl ? (
                        <img src={n.avatarUrl} alt="" className="archivist-node-avatar-img" />
                      ) : (
                        (n.name.trim() || "?").slice(0, 1)
                      )}
                    </div>
                    <div className="archivist-node-caption">
                      <span className="archivist-node-name">{n.name}</span>
                      {n.lifespan?.trim() ? (
                        <span className="archivist-node-lifespan">{n.lifespan.trim()}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="archivist-bottom-bar">
        <div ref={addMenuRef} className="archivist-fab-wrap">
          {addMenuOpen && (
            <div className="archivist-add-menu" role="menu" aria-label="添加成员类型">
              {ADD_OPTIONS.map(({ kind, label }) => {
                const disabled =
                  (kind === "parents" && parentsAddDisabled) ||
                  (kind === "spouse" && spouseAddDisabled);
                const disabledTitle =
                  kind === "parents" && parentsAddDisabled
                    ? "该成员已连接父母节点，无需重复添加"
                    : kind === "spouse" && spouseAddDisabled
                      ? "该成员已连接配偶节点，无需重复添加"
                      : undefined;
                return (
                  <button
                    key={kind}
                    type="button"
                    role="menuitem"
                    className="archivist-add-menu-btn"
                    disabled={disabled}
                    title={disabledTitle}
                    onClick={() => {
                      if (disabled) return;
                      onAddMember(kind);
                      setAddMenuOpen(false);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          <button
            type="button"
            className="archivist-fab"
            onClick={() => setAddMenuOpen((o) => !o)}
            title="添加成员（父母 / 兄妹 / 子女 / 配偶）"
            aria-expanded={addMenuOpen}
            aria-haspopup="menu"
          >
            <span aria-hidden>＋</span>
            <span className="archivist-fab-label">添加</span>
          </button>
        </div>
        {onSaveAll && (
          <button type="button" className="archivist-bottom-bar-btn archivist-bottom-bar-btn--save" onClick={onSaveAll}>
            {saveAllOk ? "✓ 已保存" : "一键全部保存"}
          </button>
        )}
        {onRelayoutByTier && (
          <button type="button" className="archivist-bottom-bar-btn" onClick={onRelayoutByTier}>
            整理排列
          </button>
        )}
        {onClearToSelfOnly && (
          <button type="button" className="archivist-bottom-bar-btn archivist-bottom-bar-btn--danger" onClick={onClearToSelfOnly}>
            一键清空
          </button>
        )}
      </div>
    </div>
  );
};
