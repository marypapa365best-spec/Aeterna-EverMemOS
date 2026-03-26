import React, { useCallback, useEffect, useRef, useState } from "react";
import { FootprintMap } from "./FootprintMap";
import {
  MemoirKinshipArchivist,
  layoutDefaults,
  WORLD_H,
  getKinGeneration,
  KIN_CENTER_X,
  clampKinTierLineY,
  clampKinDragX,
  type KinAddKind,
} from "./MemoirKinshipArchivist";
import {
  MemoirSocialPlane,
  layoutSocialRadial,
  SOCIAL_CENTER_X,
  SOCIAL_CENTER_Y,
  SOCIAL_WORLD_H,
  SOCIAL_WORLD_W,
  type SocialPlaneEdge,
} from "./MemoirSocialPlane";

type MemoirTab = "kinship" | "social" | "footprint";

/**
 * 侧栏「关系属性（相对本人）」由父母/子女/配偶/同父母连线自动推算，不必单独存字段。
 */
interface KinNode {
  id: string;
  name: string;
  relation: string;
  /** 头像 data URL；无则显示姓名首字 */
  avatarUrl?: string;
  /** 相对本人辈分：0=同辈，-1=父母辈，+1=子女辈…（与画布虚线层级一致） */
  generation?: number;
  /** 生辰 / 存在时间，如 1996–2023 或 1996—（在世可只写起始年） */
  lifespan?: string;
  note?: string;
  /**
   * 直系父母节点 id（1～2）；本人/子女/兄妹通过相同列表共享父母。
   * 仅据此画直角血缘线，不再使用 parentId / parentForId。
   */
  parentNodeIds?: string[];
  /** 配偶节点 id，与配偶为下方正交连线，不参与父母分叉 */
  spouseNodeIds?: string[];
  /** 无父母时兄妹共用的组 ID；添加父母后自动清除 */
  siblingGroupId?: string;
  /** 档案馆画布坐标（可拖拽后持久化） */
  x?: number;
  y?: number;
}

interface SocialNode {
  id: string;
  name: string;
  /** 用于识别「本人」等逻辑，不在侧栏编辑（除系统维护外保持「本人」） */
  role: string;
  /** 性别，侧栏可编辑 */
  gender?: string;
  note?: string;
  /** 头像 data URL；无则平面图与侧栏显示名称首字 */
  avatarUrl?: string;
  /** 社会关系平面图坐标 */
  x?: number;
  y?: number;
}

type SocialEdge = SocialPlaneEdge;

/** 侧栏「当前节点」保存按钮：用于比对是否有未保存的编辑 */
function serializeSocialNodeProfile(n: SocialNode): string {
  return JSON.stringify({
    id: n.id,
    name: n.name,
    gender: n.gender ?? "",
    note: n.note ?? "",
    avatarUrl: n.avatarUrl ?? "",
  });
}

/** 侧栏「与此人相连的线」保存按钮：仅比较与当前选中节点相关的边 */
function serializeIncidentEdgesForSave(edges: SocialEdge[]): string {
  return JSON.stringify(
    [...edges].sort((a, b) => a.id.localeCompare(b.id)).map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      relation: e.relation,
    }))
  );
}

/** 从当前图构建「已与磁盘一致」的快照（用于初次从 localStorage 灌入后保存按钮置灰） */
function buildSocialSaveSnapshotsFromGraph(
  nodes: SocialNode[],
  edges: SocialEdge[]
): { nodeProfileById: Record<string, string>; edgesByNodeId: Record<string, string> } {
  const nodeProfileById: Record<string, string> = {};
  const edgesByNodeId: Record<string, string> = {};
  for (const n of nodes) {
    nodeProfileById[n.id] = serializeSocialNodeProfile(n);
    const incident = edges.filter((e) => e.from === n.id || e.to === n.id);
    edgesByNodeId[n.id] = serializeIncidentEdgesForSave(incident);
  }
  return { nodeProfileById, edgesByNodeId };
}

function defaultSocialBundle(): { nodes: SocialNode[]; edges: SocialEdge[] } {
  const selfAvatar = window.localStorage.getItem("twin_avatar") ?? "/avatars/memoji/2.png";
  const nodes: SocialNode[] = [
    { id: "soc-self", name: "我", role: "本人", note: "", avatarUrl: selfAvatar },
    { id: "s1", name: "阿杰", role: "朋友", note: "大学同学，经常一起打球", avatarUrl: "/avatars/Doro.webp" },
    { id: "s2", name: "王姐", role: "同事", note: "同部门，配合默契", avatarUrl: "/avatars/Doro.webp" },
    { id: "s3", name: "晓雯", role: "前女友", note: "分开后仍保持联系", avatarUrl: "/avatars/Doro.webp" },
    { id: "s4", name: "小虎", role: "发小", note: "从小一起长大的邻居", avatarUrl: "/avatars/Doro.webp" },
    { id: "s5", name: "陈总", role: "合伙人", note: "一起创业，负责产品方向", avatarUrl: "/avatars/Doro.webp" },
  ];
  const pos = layoutSocialRadial(nodes);
  const placed = nodes.map((n) => ({
    ...n,
    x: n.role === "本人" ? SOCIAL_CENTER_X : pos.get(n.id)!.x,
    y: n.role === "本人" ? SOCIAL_CENTER_Y : pos.get(n.id)!.y,
  }));
  const self = placed.find((n) => n.role === "本人")!;
  const edges: SocialEdge[] = [
    { id: "e1", from: self.id, to: "s1", relation: "朋友" },
    { id: "e2", from: self.id, to: "s2", relation: "同事" },
    { id: "e3", from: self.id, to: "s3", relation: "前女友" },
    { id: "e4", from: self.id, to: "s4", relation: "发小" },
    { id: "e5", from: self.id, to: "s5", relation: "合伙人" },
    { id: "e6", from: "s1", to: "s4", relation: "也认识" },
  ];
  return { nodes: placed, edges };
}

function socialUndirectedKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** 扩大画布前持久化使用的世界尺寸；若坐标仍落在此范围内则按比例映射到新世界 */
const LEGACY_SOCIAL_WORLD_W = 820;
const LEGACY_SOCIAL_WORLD_H = 540;

function scaleSocialNodesIfLegacyWorld(nodes: SocialNode[]): SocialNode[] {
  const withXY = nodes.filter((n) => n.x != null && n.y != null) as (SocialNode & { x: number; y: number })[];
  if (withXY.length === 0) return nodes;
  const margin = 24;
  const looksLegacy = withXY.every(
    (n) =>
      n.x >= -margin &&
      n.y >= -margin &&
      n.x <= LEGACY_SOCIAL_WORLD_W + margin &&
      n.y <= LEGACY_SOCIAL_WORLD_H + margin
  );
  if (!looksLegacy) return nodes;
  const sx = SOCIAL_WORLD_W / LEGACY_SOCIAL_WORLD_W;
  const sy = SOCIAL_WORLD_H / LEGACY_SOCIAL_WORLD_H;
  return nodes.map((n) =>
    n.x != null && n.y != null ? { ...n, x: n.x * sx, y: n.y * sy } : n
  );
}

/** 旧版仅节点数组，或新版 { nodes, edges } */
function migrateSocialPersist(raw: unknown): { nodes: SocialNode[]; edges: SocialEdge[] } {
  if (raw == null) {
    return defaultSocialBundle();
  }
  if (Array.isArray(raw)) {
    const list = raw as SocialNode[];
    let nodes = list.map((n) => ({ ...n }));
    const hasSelf = nodes.some((n) => n.role === "本人");
    if (!hasSelf) {
      const selfId = "soc-self";
      nodes = [
        { id: selfId, name: "我", role: "本人", note: "社会关系平面图中心" },
        ...nodes,
      ];
    }
    const self = nodes.find((n) => n.role === "本人") ?? nodes[0];
    const edges: SocialEdge[] = [];
    let ei = 0;
    for (const n of nodes) {
      if (!self || n.id === self.id) continue;
      edges.push({
        id: `e-mig-${ei++}`,
        from: self.id,
        to: n.id,
        // 关系仅在「空文档」时作为占位显示；这里持久化为空字符串，避免用户无法删除回空
        relation: (n.role || "").trim(),
      });
    }
    const pos = layoutSocialRadial(nodes);
    nodes = nodes.map((n) => ({
      ...n,
      x: n.x ?? (n.role === "本人" ? SOCIAL_CENTER_X : pos.get(n.id)?.x ?? SOCIAL_CENTER_X),
      y: n.y ?? (n.role === "本人" ? SOCIAL_CENTER_Y : pos.get(n.id)?.y ?? SOCIAL_CENTER_Y),
    }));
    return { nodes: scaleSocialNodesIfLegacyWorld(nodes), edges };
  }
  if (typeof raw === "object" && raw !== null && Array.isArray((raw as { nodes?: unknown }).nodes)) {
    const o = raw as { nodes: SocialNode[]; edges?: SocialEdge[] };
    const edges = Array.isArray(o.edges)
      ? o.edges.map((e) => {
          const rel = typeof e.relation === "string" ? e.relation.trim() : "";
          return { ...e, relation: rel === "关系" ? "" : rel };
        })
      : [];
    const pos = layoutSocialRadial(o.nodes);
    const nodes = o.nodes.map((n) => ({
      ...n,
      x: n.x ?? (n.role === "本人" ? SOCIAL_CENTER_X : pos.get(n.id)?.x ?? SOCIAL_CENTER_X),
      y: n.y ?? (n.role === "本人" ? SOCIAL_CENTER_Y : pos.get(n.id)?.y ?? SOCIAL_CENTER_Y),
    }));
    return { nodes: scaleSocialNodesIfLegacyWorld(nodes), edges };
  }
  return defaultSocialBundle();
}

interface FootprintEntry {
  id: string;
  date: string;
  place: string;
  title: string;
  detail?: string;
}

const K_STORAGE = "twin_memoir_kinship";
const S_STORAGE = "twin_memoir_social";

const SOCIAL_GENDER_OPTIONS = ["男", "女", "其他"] as const;
const F_STORAGE = "twin_memoir_footprint";
const MAPS_KEY_STORAGE = "twin_memoir_maps_api_key";
const WIZARD_SYNCED_KEY = "twin_last_synced_form";

const BIRTH_CITY_LABELS: Record<string, string> = {
  beijing: "北京", shanghai: "上海", guangzhou: "广州", shenzhen: "深圳",
  hangzhou: "杭州", chengdu: "成都", nanjing: "南京", wuhan: "武汉",
  xian: "西安", suzhou: "苏州", tianjin: "天津", chongqing: "重庆",
};

function readBirthInfo(): { year: string; city: string } | null {
  try {
    const raw = window.localStorage.getItem(WIZARD_SYNCED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, Record<string, string>>;
    const lv1 = parsed["1"];
    if (!lv1) return null;
    const year = typeof lv1.birth_date === "string" ? lv1.birth_date.slice(0, 4) : "";
    const cityCode = typeof lv1.birth_city === "string" ? lv1.birth_city : "";
    const city = BIRTH_CITY_LABELS[cityCode] ?? cityCode;
    if (!year && !city) return null;
    return { year, city };
  } catch {
    return null;
  }
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, data: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

const KIN_AVATAR_MAX_BYTES = 900 * 1024;

function readKinAvatarFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      window.alert("请选择图片文件（jpg、png 等）");
      resolve(null);
      return;
    }
    if (file.size > KIN_AVATAR_MAX_BYTES) {
      window.alert("图片请小于约 900KB，可压缩后再试");
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

const KIN_DEFAULTS: KinNode[] = [
  {
    id: "k1",
    name: "我",
    relation: "本人",
    generation: 0,
    lifespan: "1996—",
    note: "回忆录中心节点",
    parentNodeIds: ["k2", "k3"],
  },
  {
    id: "k2",
    name: "父亲",
    relation: "父亲",
    generation: -1,
    lifespan: "1968–2023",
    note: "可从灵魂拷贝同步姓名",
  },
  {
    id: "k3",
    name: "母亲",
    relation: "母亲",
    generation: -1,
    lifespan: "1970—",
    note: "",
  },
];

/** 用于判断「同一父母组」的兄妹 */
function parentRefsKey(ids: string[] | undefined): string {
  if (!ids?.length) return "";
  return [...ids].sort().join("\0");
}

/** 邻接边标签：从当前点走向邻点时，在「以我为起点」的链中显示的称谓段 */
type KinEdgeToNeighbor = { id: string; label: string };

function addKinUndirected(
  adj: Map<string, KinEdgeToNeighbor[]>,
  a: string,
  b: string,
  labelAtoB: string,
  labelBtoA: string
) {
  if (!adj.has(a)) adj.set(a, []);
  if (!adj.has(b)) adj.set(b, []);
  const la = adj.get(a)!;
  const lb = adj.get(b)!;
  if (!la.some((e) => e.id === b)) la.push({ id: b, label: labelAtoB });
  if (!lb.some((e) => e.id === a)) lb.push({ id: a, label: labelBtoA });
}

/** 父母↔子女、配偶、同父母同辈兄妹（虚拟边），供最短路径推算关系链 */
function buildKinAdjacencyForSelfView(nodes: KinNode[]): Map<string, KinEdgeToNeighbor[]> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, KinEdgeToNeighbor[]>();

  for (const n of nodes) {
    for (const pid of n.parentNodeIds ?? []) {
      if (!byId.has(pid)) continue;
      addKinUndirected(adj, n.id, pid, "父母", "子女");
    }
    for (const sid of n.spouseNodeIds ?? []) {
      if (!byId.has(sid)) continue;
      addKinUndirected(adj, n.id, sid, "配偶", "配偶");
    }
  }

  const groups = new Map<string, KinNode[]>();
  for (const n of nodes) {
    const k = parentRefsKey(n.parentNodeIds);
    if (!k) continue;
    const g = getKinGeneration(n, nodes);
    const key = `${k}@${g}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }
  for (const list of groups.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        addKinUndirected(adj, list[i].id, list[j].id, "兄妹", "兄妹");
      }
    }
  }
  // 无父母兄妹组（通过 siblingGroupId 关联）
  const sgGroups = new Map<string, KinNode[]>();
  for (const n of nodes) {
    if (!n.siblingGroupId || n.parentNodeIds?.length) continue;
    const grp = sgGroups.get(n.siblingGroupId) ?? [];
    grp.push(n);
    sgGroups.set(n.siblingGroupId, grp);
  }
  for (const list of sgGroups.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        addKinUndirected(adj, list[i].id, list[j].id, "兄妹", "兄妹");
      }
    }
  }

  return adj;
}

/**
 * 以「本人」为起点的关系链文案，如：我 — 配偶 — 某某、我 — 兄妹 — 某某、我 — 父母 — 父亲。
 * 由当前图中父母/子女/配偶/同父母连线自动推算，与手填「称呼」独立。
 */
function describeKinRelationFromSelf(nodes: KinNode[], target: KinNode): string {
  const self = nodes.find((n) => n.relation === "本人") ?? nodes[0];
  if (!self) return "—";
  if (target.id === self.id) {
    return "我（本人）";
  }

  const adj = buildKinAdjacencyForSelfView(nodes);
  const prev = new Map<string, { from: string; label: string }>();
  const q: string[] = [self.id];
  const seen = new Set<string>([self.id]);

  while (q.length) {
    const u = q.shift()!;
    if (u === target.id) break;
    for (const { id: v, label } of adj.get(u) ?? []) {
      if (seen.has(v)) continue;
      seen.add(v);
      prev.set(v, { from: u, label });
      q.push(v);
    }
  }

  if (!seen.has(target.id)) {
    return "与本人之间暂无已连接的血缘/配偶路径（请检查画布连线）";
  }

  const segments: string[] = [];
  let cur = target.id;
  while (cur !== self.id) {
    const p = prev.get(cur);
    if (!p) break;
    segments.unshift(p.label);
    cur = p.from;
  }

  if (segments.length === 1 && segments[0] === "父母") {
    if (target.relation === "父亲" || target.relation === "母亲") {
      segments[0] = target.relation;
    }
  }
  if (segments.length === 1 && segments[0] === "子女") {
    if (/儿子|长子|次子|三子|独子/.test(target.relation)) segments[0] = "儿子";
    else if (/女儿|千金|独女/.test(target.relation)) segments[0] = "女儿";
  }

  return `我 — ${segments.join(" — ")} — ${target.name}`;
}

/** 旧存档：parentForId / parentId → parentNodeIds（子女指向父母） */
function migrateKinNodesLoaded(raw: unknown[]): KinNode[] {
  const arr = raw as Array<
    KinNode & { parentId?: string; parentForId?: string }
  >;
  const byChild = new Map<string, string[]>();
  for (const n of arr) {
    if (n.parentForId) {
      const list = byChild.get(n.parentForId) ?? [];
      list.push(n.id);
      byChild.set(n.parentForId, list);
    }
  }
  const out = arr.map((n) => {
    const generation = n.generation ?? getKinGeneration(n, arr as KinNode[]);
    const ids: string[] = [];
    const fromRev = byChild.get(n.id);
    if (fromRev) {
      for (const pid of fromRev) {
        if (!ids.includes(pid)) ids.push(pid);
      }
    }
    if (n.parentNodeIds?.length) {
      for (const pid of n.parentNodeIds) {
        if (!ids.includes(pid)) ids.push(pid);
      }
    }
    if (n.parentId && !ids.includes(n.parentId)) ids.push(n.parentId);

    return {
      id: n.id,
      name: n.name,
      relation: n.relation,
      avatarUrl: n.avatarUrl,
      generation,
      lifespan: n.lifespan,
      note: n.note,
      x: n.x,
      y: n.y,
      parentNodeIds: ids.length ? ids : undefined,
      spouseNodeIds: n.spouseNodeIds?.length ? n.spouseNodeIds : undefined,
      siblingGroupId: n.siblingGroupId,
    };
  });
  /** 旧数据：父系/母系节点应作为「本人」的父母，而非把本人记在它们下面。
   *  仅在本人尚无 parentNodeIds（确为旧格式）时才执行，避免把祖父母等误加为直系父母。 */
  const selfIdx = out.findIndex((x) => x.relation === "本人");
  if (selfIdx >= 0) {
    const selfNode = out[selfIdx];
    if (!selfNode.parentNodeIds?.length) {
      const set = new Set(selfNode.parentNodeIds ?? []);
      const addIds = out
        .filter(
          (x) =>
            x.id !== selfNode.id &&
            (x.relation === "父系" ||
              x.relation === "母系" ||
              x.relation === "父亲" ||
              x.relation === "母亲") &&
            !set.has(x.id)
        )
        .map((x) => x.id);
      if (addIds.length) {
        out[selfIdx] = {
          ...selfNode,
          parentNodeIds: addIds,
        };
      }
    }
  }
  return out;
}

const GENERATION_OPTIONS: { value: number; label: string }[] = [
  { value: -4, label: "更早祖辈（曾祖以上）" },
  { value: -3, label: "上三代（曾祖辈）" },
  { value: -2, label: "祖父母辈" },
  { value: -1, label: "父母辈" },
  { value: 0, label: "与本人同辈（兄弟姐妹、堂表亲等）" },
  { value: 1, label: "子女辈" },
  { value: 2, label: "孙辈" },
  { value: 3, label: "曾孙辈" },
  { value: 4, label: "更低晚辈" },
];

export const Memoir: React.FC = () => {
  const [tab, setTab] = useState<MemoirTab>("kinship");
  /** 血缘画布当前选中的节点（点击下方编辑区同步此节点） */
  const [selectedKinId, setSelectedKinId] = useState<string | null>(null);
  const [kinNodes, setKinNodes] = useState<KinNode[]>(() =>
    migrateKinNodesLoaded(loadJson<unknown[]>(K_STORAGE, KIN_DEFAULTS as unknown[]))
  );
  const kinSerialize = (n: KinNode) =>
    JSON.stringify({ name: n.name, relation: n.relation, generation: n.generation, lifespan: n.lifespan ?? "", note: n.note ?? "", avatarUrl: n.avatarUrl ?? "" });
  const [kinSnapshots, setKinSnapshots] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      migrateKinNodesLoaded(loadJson<unknown[]>(K_STORAGE, KIN_DEFAULTS as unknown[])).map((n) => [n.id, kinSerialize(n)])
    )
  );
  const [kinSavedIds, setKinSavedIds] = useState<Set<string>>(new Set());
  const kinSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveKinNode = useCallback((n: KinNode) => {
    setKinSnapshots((prev) => ({ ...prev, [n.id]: kinSerialize(n) }));
    setKinSavedIds((prev) => new Set([...prev, n.id]));
    if (kinSaveTimersRef.current[n.id]) clearTimeout(kinSaveTimersRef.current[n.id]);
    kinSaveTimersRef.current[n.id] = setTimeout(() => {
      setKinSavedIds((prev) => { const s = new Set(prev); s.delete(n.id); return s; });
    }, 2000);
  }, []);
  const [kinAllSavedOk, setKinAllSavedOk] = useState(false);
  const kinAllSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveAllKinNodes = useCallback(() => {
    setKinNodes((current) => {
      saveJson(K_STORAGE, current);
      const serialize = (n: KinNode) =>
        JSON.stringify({ name: n.name, relation: n.relation, generation: n.generation, lifespan: n.lifespan ?? "", note: n.note ?? "", avatarUrl: n.avatarUrl ?? "" });
      setKinSnapshots(Object.fromEntries(current.map((n) => [n.id, serialize(n)])));
      return current;
    });
    setKinAllSavedOk(true);
    if (kinAllSavedTimerRef.current) clearTimeout(kinAllSavedTimerRef.current);
    kinAllSavedTimerRef.current = setTimeout(() => setKinAllSavedOk(false), 2200);
  }, []);
  const socialInitRef = useRef<ReturnType<typeof defaultSocialBundle> | null>(null);
  const initSocial = () => {
    if (!socialInitRef.current) {
      socialInitRef.current = defaultSocialBundle();
    }
    return socialInitRef.current;
  };
  const [socialNodes, setSocialNodes] = useState<SocialNode[]>(() => initSocial().nodes);
  const [socialEdges, setSocialEdges] = useState<SocialEdge[]>(() => initSocial().edges);
  /** 社会关系图选中节点（与下方编辑区联动） */
  const [selectedSocialId, setSelectedSocialId] = useState<string | null>(null);
  /** 画布拖拽连线完成后，填写线上关系文案 */
  const [edgeLinkDraft, setEdgeLinkDraft] = useState<null | { from: string; to: string }>(null);
  const [edgeLinkRelationInput, setEdgeLinkRelationInput] = useState("朋友");
  /** 侧栏「与此人相连的线」中当前聚焦的连线，用于同步高亮对应 SVG 连线 */
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const socialSyncRef = useRef({ nodes: socialNodes, edges: socialEdges });
  socialSyncRef.current = { nodes: socialNodes, edges: socialEdges };
  const [socialSaveNodeOk, setSocialSaveNodeOk] = useState(false);
  const [socialSaveEdgesOk, setSocialSaveEdgesOk] = useState(false);
  const socialSaveNodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socialSaveEdgesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 各节点「当前节点」区上次与持久化一致时的资料快照；加载自本机后预填，与当前一致则保存置灰 */
  const [socialNodeSavedProfile, setSocialNodeSavedProfile] = useState<Record<string, string>>(() => {
    const { nodes, edges } = initSocial();
    return buildSocialSaveSnapshotsFromGraph(nodes, edges).nodeProfileById;
  });
  /** 各节点「相连的线」区快照；规则同上 */
  const [socialEdgesSavedByNodeId, setSocialEdgesSavedByNodeId] = useState<Record<string, string>>(() => {
    const { nodes, edges } = initSocial();
    return buildSocialSaveSnapshotsFromGraph(nodes, edges).edgesByNodeId;
  });

  const saveSocialPersistNow = useCallback(() => {
    const { nodes, edges } = socialSyncRef.current;
    saveJson(S_STORAGE, { nodes, edges });
  }, []);

  const saveSocialCurrentNodeSection = useCallback(
    (nodeId: string) => {
      const n = socialSyncRef.current.nodes.find((x) => x.id === nodeId);
      if (!n) return;
      saveSocialPersistNow();
      setSocialNodeSavedProfile((m) => ({ ...m, [nodeId]: serializeSocialNodeProfile(n) }));
      setSocialSaveNodeOk(true);
      if (socialSaveNodeTimerRef.current) clearTimeout(socialSaveNodeTimerRef.current);
      socialSaveNodeTimerRef.current = setTimeout(() => {
        setSocialSaveNodeOk(false);
        socialSaveNodeTimerRef.current = null;
      }, 2200);
    },
    [saveSocialPersistNow]
  );

  const saveSocialEdgesSection = useCallback(
    (nodeId: string) => {
      const edges = socialSyncRef.current.edges.filter((e) => e.from === nodeId || e.to === nodeId);
      const ser = serializeIncidentEdgesForSave(edges);
      saveSocialPersistNow();
      setSocialEdgesSavedByNodeId((m) => ({ ...m, [nodeId]: ser }));
      setSocialSaveEdgesOk(true);
      if (socialSaveEdgesTimerRef.current) clearTimeout(socialSaveEdgesTimerRef.current);
      socialSaveEdgesTimerRef.current = setTimeout(() => {
        setSocialSaveEdgesOk(false);
        socialSaveEdgesTimerRef.current = null;
      }, 2200);
    },
    [saveSocialPersistNow]
  );

  useEffect(
    () => () => {
      if (socialSaveNodeTimerRef.current) clearTimeout(socialSaveNodeTimerRef.current);
      if (socialSaveEdgesTimerRef.current) clearTimeout(socialSaveEdgesTimerRef.current);
    },
    []
  );

  const [footprints, setFootprints] = useState<FootprintEntry[]>(() =>
    loadJson<FootprintEntry[]>(F_STORAGE, [
      {
        id: "f1",
        date: "2000",
        place: "出生地",
        title: "人生的起点",
        detail: "可记录城市、医院或一句关于家的描述。",
      },
    ])
  );
  /** 血缘画布在「一键清空」等操作后触发重新居中 */
  const [kinViewReset, setKinViewReset] = useState(0);

  const [mapsApiKey, setMapsApiKey] = useState<string>(() =>
    window.localStorage.getItem(MAPS_KEY_STORAGE) ?? ""
  );
  const footPlayRef = useRef<(() => void) | null>(null);
  const [footAnimPlayed, setFootAnimPlayed] = useState(false);

  useEffect(() => saveJson(K_STORAGE, kinNodes), [kinNodes]);
  useEffect(() => saveJson(S_STORAGE, { nodes: socialNodes, edges: socialEdges }), [socialNodes, socialEdges]);
  useEffect(() => saveJson(F_STORAGE, footprints), [footprints]);

  /** 切换到人生轨迹 tab 时，将第一张卡片（f1）的年份和地点同步自灵魂拷贝出生信息 */
  useEffect(() => {
    if (tab !== "footprint") return;
    const info = readBirthInfo();
    if (!info) return;
    setFootprints((prev) => {
      const idx = prev.findIndex((fp) => fp.id === "f1");
      if (idx === -1) return prev;
      const fp = prev[idx];
      const nextDate = info.year || fp.date;
      const nextPlace = info.city || fp.place;
      if (nextDate === fp.date && nextPlace === fp.place) return prev;
      const next = [...prev];
      next[idx] = { ...fp, date: nextDate, place: nextPlace };
      return next;
    });
  }, [tab]);
  useEffect(() => {
    if (mapsApiKey) window.localStorage.setItem(MAPS_KEY_STORAGE, mapsApiKey);
    else window.localStorage.removeItem(MAPS_KEY_STORAGE);
  }, [mapsApiKey]);

  /** 社交节点补全平面图坐标 */
  useEffect(() => {
    if (tab !== "social") return;
    setSocialNodes((prev) => {
      if (prev.every((n) => n.x != null && n.y != null)) return prev;
      const pos = layoutSocialRadial(prev);
      return prev.map((n) => ({
        ...n,
        x: n.x ?? pos.get(n.id)?.x ?? SOCIAL_CENTER_X,
        y: n.y ?? pos.get(n.id)?.y ?? SOCIAL_CENTER_Y,
      }));
    });
  }, [tab, socialNodes.length]);

  /** 进入社交页或数据变化时保证有合法选中节点 */
  useEffect(() => {
    if (tab !== "social" || socialNodes.length === 0) return;
    setSelectedSocialId((cur) => {
      if (cur && socialNodes.some((n) => n.id === cur)) return cur;
      return socialNodes.find((n) => n.role === "本人")?.id ?? socialNodes[0].id;
    });
  }, [tab, socialNodes]);

  useEffect(() => {
    if (!edgeLinkDraft) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEdgeLinkDraft(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [edgeLinkDraft]);

  /** 血缘节点补全画布坐标（与「数字档案馆」视图联动） */
  useEffect(() => {
    if (tab !== "kinship") return;
    setKinNodes((prev) => {
      if (prev.every((n) => n.x != null && n.y != null)) return prev;
      const defs = layoutDefaults(prev);
      return prev.map((n) => ({
        ...n,
        x: n.x ?? defs.get(n.id)?.x ?? KIN_CENTER_X,
        y: n.y ?? defs.get(n.id)?.y ?? WORLD_H / 2,
      }));
    });
  }, [tab, kinNodes.length]);

  /**
   * 进入血缘标签时，将所有节点 y 对齐到辈分虚线。
   * 仅依赖 [tab] 避免 kinNodes 变更→Effect→kinNodes 变更的连锁触发；
   * 新增节点在创建时已自带正确 y，辈分改变时由 updateKin + moveKinNode 处理 y 更新。
   */
  useEffect(() => {
    if (tab !== "kinship") return;
    setKinNodes((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((n) => {
        const g = getKinGeneration(n, prev);
        const ny = clampKinTierLineY(g);
        if (n.y == null || Math.abs((n.y ?? 0) - ny) > 0.5) {
          changed = true;
          return { ...n, y: ny };
        }
        return n;
      });
      return changed ? next : prev;
    });
  }, [tab]);

  /** 进入血缘页或数据变化时，保证有一个有效选中节点 */
  useEffect(() => {
    if (tab !== "kinship" || kinNodes.length === 0) return;
    setSelectedKinId((cur) => {
      if (cur && kinNodes.some((n) => n.id === cur)) return cur;
      const self = kinNodes.find((n) => n.relation === "本人");
      return self?.id ?? kinNodes[0].id;
    });
  }, [tab, kinNodes]);

  // 同步 [分身养成中心] 头像到血缘关系网[我]节点（切换标签时 + 跨标签 storage 变更时）
  useEffect(() => {
    const syncAvatar = () => {
      const avatar = window.localStorage.getItem("twin_avatar");
      if (!avatar) return;
      setKinNodes((prev) =>
        prev.map((n) =>
          n.relation === "本人" && n.avatarUrl !== avatar ? { ...n, avatarUrl: avatar } : n
        )
      );
    };
    if (tab === "kinship") syncAvatar();
    window.addEventListener("storage", syncAvatar);
    return () => window.removeEventListener("storage", syncAvatar);
  }, [tab]);

  /** 节点仅能在其辈分虚线处水平移动，y 固定于该层 */
  const moveKinNode = useCallback((id: string, x: number, _y: number) => {
    const nx = clampKinDragX(x);
    setKinNodes((prev) => {
      const node = prev.find((n) => n.id === id);
      if (!node) return prev;
      const g = getKinGeneration(node, prev);
      const tierY = clampKinTierLineY(g);
      return prev.map((n) => (n.id === id ? { ...n, x: nx, y: tierY } : n));
    });
  }, []);

  /** 按辈分虚线重新计算横向位置（保留已填辈分数） */
  const relayoutKinByTier = useCallback(() => {
    setKinNodes((prev) => {
      const defs = layoutDefaults(prev);
      return prev.map((n) => {
        const p = defs.get(n.id);
        return p ? { ...n, x: p.x, y: p.y } : n;
      });
    });
  }, []);

  /** 在上一条虚线生成父母二人，并把当前节点设为二人的子女（写入 parentNodeIds） */
  const addKinParentsPair = useCallback((anchorId: string) => {
    const t = Date.now();
    const idFather = `k-${t}-f`;
    const idMother = `k-${t}-m`;
    setKinNodes((prev) => {
      const anchor =
        prev.find((p) => p.id === anchorId) ?? prev.find((n) => n.relation === "本人") ?? prev[0];
      if (!anchor) return prev;
      const newGen = getKinGeneration(anchor, prev) - 1;
      const y = clampKinTierLineY(newGen);
      const cx = anchor.x ?? KIN_CENTER_X;
      const half = 118;
      const x1 = clampKinDragX(cx - half);
      const x2 = clampKinDragX(cx + half);
      const father = {
        id: idFather,
        name: "父亲",
        relation: "父亲",
        generation: newGen,
        lifespan: "",
        note: "",
        x: x1,
        y,
        spouseNodeIds: [idMother],
      };
      const mother = {
        id: idMother,
        name: "母亲",
        relation: "母亲",
        generation: newGen,
        lifespan: "",
        note: "",
        x: x2,
        y,
        spouseNodeIds: [idFather],
      };
      const sgId = anchor.siblingGroupId;
      return prev
        .map((n) => {
          if (n.id === anchor.id)
            return { ...n, parentNodeIds: [idFather, idMother], siblingGroupId: undefined };
          // 同组兄妹也接入同一对父母，并清除组 ID
          if (sgId && n.siblingGroupId === sgId)
            return { ...n, parentNodeIds: [idFather, idMother], siblingGroupId: undefined };
          return n;
        })
        .concat([father, mother]);
    });
    setSelectedKinId(idFather);
  }, []);

  /**
   * 兄妹：同辈 + 复制 anchor 的 parentNodeIds（与父母共享直角线，兄妹间无直连）。
   * 子女：下一辈；无配偶时为 [anchor]；有配偶时为 [anchor, ...spouseNodeIds]，画布上子女线从双亲横杠中点垂下。
   */
  const addKinNearAnchor = useCallback((anchorId: string, tierDelta: 0 | 1) => {
    const newId = "k-" + Date.now();
    setKinNodes((prev) => {
      const anchor =
        prev.find((p) => p.id === anchorId) ??
        prev.find((n) => n.relation === "本人") ??
        prev[0];
      if (!anchor) return prev;
      const anchorGen = getKinGeneration(anchor, prev);
      const newGen = anchorGen + tierDelta;
      const y = clampKinTierLineY(newGen);
      const ax = anchor.x ?? KIN_CENTER_X;
      const spread = 108;

      let m: number;
      let parentNodeIds: string[] | undefined;
      let newSiblingGroupId: string | undefined;
      let coupleCenter = ax; // 子女布局中心：无配偶时=anchor.x，有配偶时=夫妻中点
      if (tierDelta === 0) {
        const key = parentRefsKey(anchor.parentNodeIds);
        m = prev.filter(
          (n) =>
            parentRefsKey(n.parentNodeIds) === key &&
            getKinGeneration(n, prev) === newGen
        ).length;
        if (anchor.parentNodeIds?.length) {
          parentNodeIds = [...anchor.parentNodeIds];
        } else {
          // 无父母：建立兄妹组 ID，让画布画暂时性横杠
          newSiblingGroupId = anchor.siblingGroupId ?? ("sg-" + Date.now());
        }
      } else {
        m = prev.filter(
          (n) =>
            n.parentNodeIds?.includes(anchor.id) &&
            getKinGeneration(n, prev) === newGen
        ).length;
        // 显式配偶 + co-parent（共同出现在某子女 parentNodeIds 中）
        const explicitSpouses = anchor.spouseNodeIds ?? [];
        const coParentIds = [
          ...new Set(
            prev
              .filter((c) => c.parentNodeIds?.includes(anchor.id) && (c.parentNodeIds?.length ?? 0) > 1)
              .flatMap((c) => c.parentNodeIds ?? [])
              .filter((pid) => pid !== anchor.id)
          ),
        ];
        const allSpouseIds = [...new Set([...explicitSpouses, ...coParentIds])];
        parentNodeIds = allSpouseIds.length > 0 ? [anchor.id, ...allSpouseIds] : [anchor.id];
        // 若有配偶，子女从夫妻中点展开
        if (allSpouseIds.length > 0) {
          const spouseNode = prev.find((p) => p.id === allSpouseIds[0]);
          if (spouseNode?.x != null) {
            coupleCenter = (ax + spouseNode.x) / 2;
          }
        }
      }

      // 交替左右分散：奇数次向右，偶数次向左，距离递增
      const side = m % 2 === 0 ? 1 : -1;
      const dist = Math.ceil((m + 1) / 2) * spread;
      const nx = clampKinDragX(coupleCenter + side * dist);
      const updatedPrev = newSiblingGroupId
        ? prev.map((n) =>
            n.id === anchor.id && !n.siblingGroupId
              ? { ...n, siblingGroupId: newSiblingGroupId }
              : n
          )
        : prev;
      return [
        ...updatedPrev,
        {
          id: newId,
          name: tierDelta === 0 ? "兄妹" : "新成员",
          relation: tierDelta === 0 ? "兄妹" : "子女",
          generation: newGen,
          lifespan: "",
          note: "",
          parentNodeIds,
          siblingGroupId: newSiblingGroupId,
          x: nx,
          y,
        },
      ];
    });
    setSelectedKinId(newId);
  }, []);

  /** 配偶：同辈、无父母连线，与当前节点以下方正交线相连 */
  const addKinSpouse = useCallback((anchorId: string) => {
    const newId = "k-" + Date.now();
    setKinNodes((prev) => {
      const anchor =
        prev.find((p) => p.id === anchorId) ??
        prev.find((n) => n.relation === "本人") ??
        prev[0];
      if (!anchor) return prev;
      const anchorGen = getKinGeneration(anchor, prev);
      const y = clampKinTierLineY(anchorGen);
      const ax = anchor.x ?? KIN_CENTER_X;
      const spread = 120;
      const idx = anchor.spouseNodeIds?.length ?? 0;
      // 交替左右：第一配偶向右，第二向左，以此类推
      const side = idx % 2 === 0 ? 1 : -1;
      const dist = Math.ceil((idx + 1) / 2) * spread;
      const nx = clampKinDragX(ax + side * dist);
      return prev
        .map((n) => {
          // anchor 本身：加入新配偶
          if (n.id === anchor.id) {
            return { ...n, spouseNodeIds: [...(n.spouseNodeIds ?? []), newId] };
          }
          // anchor 的现有子女：parentNodeIds 补入新配偶，使连线从夫妻横杠垂下
          if (n.parentNodeIds?.includes(anchor.id) && !n.parentNodeIds.includes(newId)) {
            return { ...n, parentNodeIds: [...n.parentNodeIds, newId] };
          }
          return n;
        })
        .concat([
          {
            id: newId,
            name: "配偶",
            relation: "配偶",
            generation: anchorGen,
            lifespan: "",
            note: "",
            spouseNodeIds: [anchor.id],
            x: nx,
            y,
          },
        ]);
    });
    setSelectedKinId(newId);
  }, []);

  /** 仅保留「本人」节点，清空父母/配偶等连线与其它成员 */
  const clearKinGraphKeepSelf = useCallback(() => {
    if (!window.confirm("将删除除「本人」以外的所有血缘节点，是否继续？")) return;
    setKinNodes((prev) => {
      const self = prev.find((n) => n.relation === "本人");
      const single: KinNode = self
        ? { ...self, parentNodeIds: undefined, spouseNodeIds: undefined, x: undefined, y: undefined }
        : {
            id: "k-" + Date.now(),
            name: "我",
            relation: "本人",
            generation: 0,
            lifespan: "",
            note: "",
            parentNodeIds: undefined,
            spouseNodeIds: undefined,
            x: undefined,
            y: undefined,
          };
      queueMicrotask(() => {
        setSelectedKinId(single.id);
        setKinViewReset((k) => k + 1);
      });
      return [single];
    });
  }, []);

  const moveSocialNode = useCallback((id: string, x: number, y: number) => {
    setSocialNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
  }, []);

  const relayoutSocialRadial = useCallback(() => {
    setSocialNodes((prev) => {
      const pos = layoutSocialRadial(prev);
      return prev.map((n) => ({
        ...n,
        x: pos.get(n.id)?.x ?? n.x,
        y: pos.get(n.id)?.y ?? n.y,
      }));
    });
  }, []);

  const addSocial = useCallback(() => {
    const id = "s-" + Date.now();
    const { nodes: prevNodes } = socialSyncRef.current;
    const extended = [...prevNodes, { id, name: "新节点", role: "朋友", note: "" }];
    const pos = layoutSocialRadial(extended);
    const mapped = extended.map((n) => ({
      ...n,
      x: n.x ?? pos.get(n.id)?.x,
      y: n.y ?? pos.get(n.id)?.y,
    }));
    setSocialNodes(mapped);
    setSelectedSocialId(id);
  }, []);

  const clearSocialToSelf = useCallback(() => {
    if (!window.confirm("确定清空所有节点和连线，只保留[我]节点吗？")) return;
    const selfAvatar = window.localStorage.getItem("twin_avatar") ?? "/avatars/memoji/2.png";
    setSocialNodes([{ id: "soc-self", name: "我", role: "本人", note: "", avatarUrl: selfAvatar, x: SOCIAL_CENTER_X, y: SOCIAL_CENTER_Y }]);
    setSocialEdges([]);
    setSelectedSocialId(null);
  }, []);

  const onSocialEdgeLinkDrop = useCallback((fromId: string, toId: string) => {
    const k = socialUndirectedKey(fromId, toId);
    if (socialSyncRef.current.edges.some((e) => socialUndirectedKey(e.from, e.to) === k)) {
      window.alert("这两人之间已有连线，可在右侧修改线上文案或删除后重建。");
      return;
    }
    setEdgeLinkDraft({ from: fromId, to: toId });
    setEdgeLinkRelationInput("朋友");
    setSelectedSocialId(fromId);
  }, []);

  const addSocialEdge = useCallback((fromId: string, toId: string, relation: string) => {
    if (fromId === toId) return;
    // 空白时存空字符串；显示逻辑统一在 UI / SVG 侧用占位
    const rel = relation.trim();
    setSocialEdges((edges) => {
      const k = socialUndirectedKey(fromId, toId);
      if (edges.some((e) => socialUndirectedKey(e.from, e.to) === k)) return edges;
      return [...edges, { id: "e-" + Date.now(), from: fromId, to: toId, relation: rel }];
    });
  }, []);

  const confirmEdgeLinkDraft = useCallback(() => {
    if (!edgeLinkDraft) return;
    addSocialEdge(edgeLinkDraft.from, edgeLinkDraft.to, edgeLinkRelationInput);
    setEdgeLinkDraft(null);
  }, [edgeLinkDraft, edgeLinkRelationInput, addSocialEdge]);

  const removeSocialEdge = useCallback((edgeId: string) => {
    setSocialEdges((prev) => prev.filter((e) => e.id !== edgeId));
  }, []);

  const updateSocialEdgeRelation = useCallback((edgeId: string, relation: string) => {
    setSocialEdges((prev) =>
      prev.map((e) => (e.id === edgeId ? { ...e, relation: relation.trim() } : e))
    );
  }, []);
  const addFootprint = useCallback(() => {
    const id = "f-" + Date.now();
    const y = new Date().getFullYear();
    setFootprints((prev) => [
      ...prev,
      { id, date: String(y), place: "", title: "新足迹", detail: "" },
    ]);
  }, []);

  const updateKin = (id: string, patch: Partial<KinNode>) => {
    setKinNodes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const updated = { ...n, ...patch };
        // 辈分变化时同步 y 到对应虚线
        if ("generation" in patch) {
          updated.y = clampKinTierLineY(getKinGeneration(updated, prev));
        }
        return updated;
      })
    );
  };
  const removeKin = (id: string) => {
    setKinNodes((prev) => {
      const victim = prev.find((n) => n.id === id);
      if (!victim || victim.relation === "本人") return prev;

      // 记录删除前各"旧父母组合 → 子节点列表"，用于事后恢复兄妹组 ID
      const oldSiblingGroups = new Map<string, string[]>(); // sortedParentKey → nodeIds
      for (const n of prev) {
        if (!n.parentNodeIds?.includes(id)) continue;
        const key = [...n.parentNodeIds].sort().join("|");
        const grp = oldSiblingGroups.get(key) ?? [];
        grp.push(n.id);
        oldSiblingGroups.set(key, grp);
      }

      // 删除节点并清理引用
      const afterRemove = prev
        .filter((n) => n.id !== id)
        .map((n) => {
          const filtered = n.parentNodeIds?.filter((pid) => pid !== id);
          const spouseFiltered = n.spouseNodeIds?.filter((sid) => sid !== id);
          return {
            ...n,
            parentNodeIds: filtered?.length ? filtered : undefined,
            spouseNodeIds: spouseFiltered?.length ? spouseFiltered : undefined,
          };
        });

      // 若某组兄妹因此失去了所有父母（≥2 人），恢复 siblingGroupId 以保持连线
      const resultMap = new Map(afterRemove.map((n) => [n.id, n]));
      let sgBase = Date.now();
      for (const oldNodeIds of oldSiblingGroups.values()) {
        const nowParentless = oldNodeIds.filter((nid) => {
          const n = resultMap.get(nid);
          return n && !n.parentNodeIds?.length;
        });
        if (nowParentless.length < 2) continue;
        const existingSgId = resultMap.get(nowParentless[0])?.siblingGroupId;
        const sgId = existingSgId ?? ("sg-" + sgBase++);
        for (const nid of nowParentless) {
          const n = resultMap.get(nid);
          if (n) resultMap.set(nid, { ...n, siblingGroupId: sgId });
        }
      }

      return afterRemove.map((n) => resultMap.get(n.id) ?? n);
    });
  };

  const updateSocial = (id: string, patch: Partial<SocialNode>) => {
    setSocialNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };
  const removeSocial = (id: string) => {
    const victim = socialNodes.find((n) => n.id === id);
    if (victim?.role === "本人") {
      window.alert("「本人」为平面图中心，不能删除。");
      return;
    }
    setSocialNodes((prev) => prev.filter((n) => n.id !== id));
    setSocialEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
    setSelectedSocialId((cur) => {
      if (cur !== id) return cur;
      return socialNodes.find((n) => n.role === "本人")?.id ?? null;
    });
    setSocialNodeSavedProfile((m) => {
      const { [id]: _n, ...rest } = m;
      return rest;
    });
    setSocialEdgesSavedByNodeId((m) => {
      const { [id]: _e, ...rest } = m;
      return rest;
    });
  };

  const updateFoot = (id: string, patch: Partial<FootprintEntry>) => {
    setFootprints((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    setFootAnimPlayed(false);
  };
  const removeFoot = (id: string) => setFootprints((prev) => prev.filter((n) => n.id !== id));

  const [footDragId, setFootDragId] = useState<string | null>(null);
  const [footDragOverId, setFootDragOverId] = useState<string | null>(null);

  const onFootDragStart = useCallback((id: string) => setFootDragId(id), []);
  const onFootDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    setFootDragOverId(id);
  }, []);
  const onFootDragEnd = useCallback(() => {
    setFootDragId(null);
    setFootDragOverId(null);
  }, []);
  const onFootDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setFootDragId((dragId) => {
      if (!dragId || dragId === targetId) return null;
      setFootprints((prev) => {
        const items = [...prev];
        const from = items.findIndex((fp) => fp.id === dragId);
        const to = items.findIndex((fp) => fp.id === targetId);
        if (from === -1 || to === -1) return prev;
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        return items;
      });
      return null;
    });
    setFootDragOverId(null);
  }, []);

  const [footSavedIds, setFootSavedIds] = useState<Set<string>>(new Set());
  const footSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  /** 每张卡片上次保存时的内容快照（序列化字符串），用于判断是否有未保存的修改 */
  const [footSnapshots, setFootSnapshots] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      loadJson<FootprintEntry[]>(F_STORAGE, []).map((fp) =>
        [fp.id, JSON.stringify({ date: fp.date, place: fp.place, title: fp.title, detail: fp.detail ?? "" })]
      )
    )
  );
  const saveFootCard = useCallback((id: string, fp: FootprintEntry) => {
    setFootSnapshots((prev) => ({
      ...prev,
      [id]: JSON.stringify({ date: fp.date, place: fp.place, title: fp.title, detail: fp.detail ?? "" }),
    }));
    setFootSavedIds((prev) => new Set([...prev, id]));
    if (footSaveTimersRef.current[id]) clearTimeout(footSaveTimersRef.current[id]);
    footSaveTimersRef.current[id] = setTimeout(() => {
      setFootSavedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }, 2000);
  }, []);

  return (
    <div className="memoir-container">
      <header className="memoir-header">
        <h1 className="memoir-title">回忆录</h1>
        <p className="memoir-subtitle">
          把血缘、社交与人生足迹串成一张可生长的「个人史」地图。数据暂存于本机浏览器，后续可与 EverMemOS 记忆联动。
        </p>
      </header>

      <nav className="memoir-tabs" role="tablist" aria-label="回忆录模块">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "kinship"}
          className={["memoir-tab", tab === "kinship" ? "memoir-tab--active" : ""].filter(Boolean).join(" ")}
          onClick={() => setTab("kinship")}
        >
          血缘关系网
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "social"}
          className={["memoir-tab", tab === "social" ? "memoir-tab--active" : ""].filter(Boolean).join(" ")}
          onClick={() => setTab("social")}
        >
          社会关系网
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "footprint"}
          className={["memoir-tab", tab === "footprint" ? "memoir-tab--active" : ""].filter(Boolean).join(" ")}
          onClick={() => setTab("footprint")}
        >
          人生足迹
        </button>
      </nav>

      {tab === "kinship" && (
        <section className="memoir-kinship-archivist-wrap" aria-labelledby="memoir-kinship-heading">
          <h2 id="memoir-kinship-heading" className="visually-hidden">
            血缘关系网
          </h2>
          <div className="memoir-lineage-hero">
            <h3 className="memoir-lineage-hero-title">血缘卷宗</h3>
            <p className="memoir-lineage-hero-desc">
              在辈分虚线上梳理家族档案中的代际结构；节点可拖拽，数据仅存于本机浏览器。
            </p>
          </div>
          <MemoirKinshipArchivist
            nodes={kinNodes}
            selectedId={selectedKinId}
            onSelectNode={setSelectedKinId}
            onMoveNode={moveKinNode}
            onRelayoutByTier={relayoutKinByTier}
            onClearToSelfOnly={clearKinGraphKeepSelf}
            onSaveAll={saveAllKinNodes}
            saveAllOk={kinAllSavedOk}
            resetViewSignal={kinViewReset}
            onAddMember={(kind: KinAddKind) => {
              const anchor = selectedKinId ?? kinNodes.find((n) => n.relation === "本人")?.id ?? kinNodes[0]?.id;
              if (!anchor) return;
              if (kind === "parents") addKinParentsPair(anchor);
              else if (kind === "siblings") addKinNearAnchor(anchor, 0);
              else if (kind === "children") addKinNearAnchor(anchor, 1);
              else addKinSpouse(anchor);
            }}
            sidePanel={(() => {
              const n = kinNodes.find((x) => x.id === selectedKinId);
              if (!n) {
                return (
                  <div className="archivist-side-member-panel">
                    <h3 className="archivist-detail-title">成员基本信息</h3>
                    <p className="archivist-detail-empty">请点击画布上的成员节点，在此编辑其信息。</p>
                  </div>
                );
              }
              const parentPeople = (n.parentNodeIds ?? [])
                .map((pid) => kinNodes.find((p) => p.id === pid))
                .filter(Boolean) as KinNode[];
              const childrenPeople = kinNodes.filter((c) => c.parentNodeIds?.includes(n.id));
              // spouseNodeIds (explicit) + co-parent detection (nodes sharing a child with n)
              const explicitSpouseIds = new Set(n.spouseNodeIds ?? []);
              const coParentIds = new Set(
                kinNodes
                  .filter((c) => c.parentNodeIds?.includes(n.id))
                  .flatMap((c) => c.parentNodeIds ?? [])
                  .filter((pid) => pid !== n.id)
              );
              const allSpouseIds = new Set([...explicitSpouseIds, ...coParentIds]);
              const spousePeople = [...allSpouseIds]
                .map((sid) => kinNodes.find((p) => p.id === sid))
                .filter(Boolean) as KinNode[];
              const gen = getKinGeneration(n, kinNodes);
              const genSelectValue = Math.min(4, Math.max(-4, gen));
              return (
                <div className="archivist-side-member-panel">
                  <h3 className="archivist-detail-title">成员基本信息</h3>
                  <div className="memoir-card memoir-card--archivist memoir-card--detail">
                    <div className="memoir-card-row archivist-avatar-row">
                      <div className="archivist-avatar-block">
                        <div className="archivist-avatar-row-inline">
                          <div className={["archivist-detail-avatar", n.relation === "本人" ? "archivist-detail-avatar--self" : ""].filter(Boolean).join(" ")} aria-hidden>
                            {n.avatarUrl ? (
                              <img src={n.avatarUrl} alt="" className="archivist-detail-avatar-img" />
                            ) : (
                              <span className="archivist-detail-avatar-letter">{(n.name.trim() || "?").slice(0, 1)}</span>
                            )}
                          </div>
                          <div className="archivist-avatar-actions">
                            <input
                              id={`kin-avatar-${n.id}`}
                              type="file"
                              accept="image/*"
                              className="archivist-avatar-file"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                e.target.value = "";
                                if (!f) return;
                                const url = await readKinAvatarFile(f);
                                if (url) updateKin(n.id, { avatarUrl: url });
                              }}
                            />
                            <label htmlFor={`kin-avatar-${n.id}`} className="archivist-btn-secondary">上传图片</label>
                            {n.avatarUrl ? (
                              <button type="button" className="archivist-btn-secondary" onClick={() => updateKin(n.id, { avatarUrl: undefined })}>
                                默认头像
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <p className="archivist-field-hint archivist-field-hint--avatar">未上传时默认显示姓名第一个字；图片仅存于本机浏览器。</p>
                      </div>
                    </div>
                    <div className="memoir-card-row">
                      <label className="memoir-label memoir-label--archivist">称呼 / 姓名</label>
                      <input className="memoir-input memoir-input--archivist" value={n.name} onChange={(e) => updateKin(n.id, { name: e.target.value })} />
                    </div>
                    <div className="memoir-card-row">
                      <label className="memoir-label memoir-label--archivist" htmlFor={`kin-gen-${n.id}`}>辈分（画布虚线层级）</label>
                      <select
                        id={`kin-gen-${n.id}`}
                        className="memoir-input memoir-input--archivist memoir-select--archivist"
                        value={n.relation === "本人" ? 0 : genSelectValue}
                        disabled={n.relation === "本人"}
                        onChange={(e) => updateKin(n.id, { generation: Number(e.target.value) })}
                      >
                        {GENERATION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="memoir-card-row">
                      <label className="memoir-label memoir-label--archivist">生辰 / 存在时间</label>
                      {(() => {
                        const raw = n.lifespan ?? "";
                        const m = raw.match(/^(\d{4})[–—\-](\d{4})?$/);
                        const birthVal = m ? m[1] : (raw.match(/^(\d{4})[–—\-]?$/) ? raw.match(/^(\d{4})/)?.[1] ?? "" : "");
                        const deathVal = m?.[2] ?? "";
                        const currentYear = new Date().getFullYear();
                        const years = Array.from({ length: currentYear - 1799 }, (_, i) => String(currentYear - i));
                        const setLifespan = (birth: string, death: string) => {
                          if (!birth) { updateKin(n.id, { lifespan: "" }); return; }
                          updateKin(n.id, { lifespan: death ? `${birth}–${death}` : `${birth}—` });
                        };
                        return (
                          <div className="archivist-lifespan-row">
                            <select
                              className="memoir-input memoir-input--archivist memoir-select--archivist archivist-year-select"
                              value={birthVal}
                              onChange={(e) => setLifespan(e.target.value, deathVal)}
                            >
                              <option value="">出生年</option>
                              {years.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <span className="archivist-lifespan-dash">–</span>
                            <select
                              className="memoir-input memoir-input--archivist memoir-select--archivist archivist-year-select"
                              value={deathVal}
                              onChange={(e) => setLifespan(birthVal, e.target.value)}
                            >
                              <option value="">至今</option>
                              {years.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="memoir-card-row">
                      <label className="memoir-label memoir-label--archivist">备注</label>
                      <textarea className="memoir-textarea memoir-textarea--archivist" rows={3} value={n.note ?? ""} onChange={(e) => updateKin(n.id, { note: e.target.value })} />
                    </div>
                    <div className="archivist-node-save-row">
                      <button
                        type="button"
                        className="archivist-btn-secondary archivist-btn-save"
                        disabled={kinSnapshots[n.id] === kinSerialize(n)}
                        onClick={() => saveKinNode(n)}
                      >
                        保存
                      </button>
                      {kinSavedIds.has(n.id) && (
                        <span className="memoir-social-save-ok" role="status">已保存</span>
                      )}
                      {n.relation !== "本人" && (
                        <button type="button" className="memoir-btn-ghost memoir-btn-ghost--compact archivist-btn-remove" onClick={() => removeKin(n.id)}>移除此节点</button>
                      )}
                    </div>

                    {/* 血缘连接列表 */}
                    {(() => {
                      const siblings = kinNodes.filter((o) =>
                        o.id !== n.id &&
                        ((o.parentNodeIds?.length &&
                          n.parentNodeIds?.length &&
                          o.parentNodeIds.some((pid) => n.parentNodeIds!.includes(pid))) ||
                          (n.siblingGroupId && o.siblingGroupId === n.siblingGroupId))
                      );
                      type KinConn = { label: string; node: KinNode };
                      const connections: KinConn[] = [
                        ...parentPeople.map((p) => ({ label: p.relation || "父/母", node: p })),
                        ...spousePeople.map((p) => ({ label: "配偶", node: p })),
                        ...childrenPeople.map((p) => ({ label: "子女", node: p })),
                        ...siblings.map((p) => ({ label: "兄妹", node: p })),
                      ];
                      return (
                        <div className="archivist-connections-section">
                          <h4 className="archivist-connections-title">血缘连接</h4>
                          {connections.length === 0 ? (
                            <p className="archivist-connections-empty">暂无血缘连接；可通过右侧画布上方的「父母/兄妹/子女/配偶」按钮添加。</p>
                          ) : (
                            <ul className="archivist-connections-list">
                              {connections.map((c, i) => (
                                <li
                                  key={`${c.node.id}-${i}`}
                                  className="archivist-connections-item"
                                  onClick={() => setSelectedKinId(c.node.id)}
                                  title={`点击选中 ${c.node.name}`}
                                >
                                  <span className="archivist-connections-dot" aria-hidden />
                                  <span className="archivist-connections-name">{c.node.name}</span>
                                  <span className="archivist-connections-label">{c.label}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })()}

                  </div>
                </div>
              );
            })()}
          />


        </section>
      )}

      {tab === "social" && (
        <section className="memoir-panel memoir-panel--social" aria-labelledby="memoir-social-heading">
          <h2 id="memoir-social-heading" className="memoir-panel-title">
            社会关系网
          </h2>
          <p className="memoir-panel-desc">
            <strong>圆内</strong>点击选中、拖动可移动节点；<strong>外圈描边</strong>悬停会加粗，沿外圈拖到另一节点可新建关系线（再填称呼）。数据存于本机浏览器。
          </p>

          {edgeLinkDraft ? (
            <div
              className="memoir-social-link-modal-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="memoir-edge-link-title"
              onClick={() => setEdgeLinkDraft(null)}
            >
              <div className="memoir-social-link-modal" onClick={(e) => e.stopPropagation()}>
                <h3 id="memoir-edge-link-title" className="memoir-social-link-modal-title">
                  新建关系线
                </h3>
                <p className="memoir-social-link-modal-meta">
                  {socialNodes.find((n) => n.id === edgeLinkDraft.from)?.name ?? edgeLinkDraft.from}
                  <span aria-hidden> → </span>
                  {socialNodes.find((n) => n.id === edgeLinkDraft.to)?.name ?? edgeLinkDraft.to}
                </p>
                <label className="memoir-label" htmlFor="memoir-edge-link-relation">
                  线上显示的关系
                </label>
                <input
                  id="memoir-edge-link-relation"
                  className="memoir-input"
                  value={edgeLinkRelationInput}
                  onChange={(e) => setEdgeLinkRelationInput(e.target.value)}
                  placeholder="同事、朋友、骑友…"
                  autoFocus
                />
                <div className="memoir-social-link-modal-actions">
                  <button type="button" className="memoir-btn-ghost" onClick={() => setEdgeLinkDraft(null)}>
                    取消
                  </button>
                  <button type="button" className="memoir-btn-primary" onClick={confirmEdgeLinkDraft}>
                    确定
                  </button>
                </div>
                <p className="memoir-social-link-modal-hint">按 Esc 取消</p>
              </div>
            </div>
          ) : null}

          <div className="memoir-social-layout">
            <div className="memoir-social-plane-card">
              <MemoirSocialPlane
                nodes={socialNodes}
                edges={socialEdges}
                selectedId={selectedSocialId}
                activeEdgeId={activeEdgeId}
                onSelectNode={setSelectedSocialId}
                onMoveNode={moveSocialNode}
                onEdgeLinkDrop={onSocialEdgeLinkDrop}
                onRelayoutRadial={relayoutSocialRadial}
                onAddNode={addSocial}
                onClearAll={clearSocialToSelf}
              />
            </div>

            <div className="memoir-social-side">
              <div className="memoir-social-toolbar-row">
              </div>

              {(() => {
                const sel = socialNodes.find((x) => x.id === selectedSocialId);
                if (!sel) {
                  return (
                    <p className="memoir-social-side-empty">点击平面图中的圆点，在此编辑名称、备注并管理连线。</p>
                  );
                }
                const incident = socialEdges.filter((e) => e.from === sel.id || e.to === sel.id);
                const nodeProfileSerialized = serializeSocialNodeProfile(sel);
                const nodeSaveDisabled =
                  socialNodeSavedProfile[sel.id] !== undefined &&
                  socialNodeSavedProfile[sel.id] === nodeProfileSerialized;
                const incidentSerialized = serializeIncidentEdgesForSave(incident);
                const edgesSaveDisabled =
                  socialEdgesSavedByNodeId[sel.id] !== undefined &&
                  socialEdgesSavedByNodeId[sel.id] === incidentSerialized;
                return (
                  <div className="memoir-social-detail">
                    <h3 className="memoir-social-detail-title">当前节点</h3>
                    <div className="memoir-card memoir-social-node">
                      <div className="memoir-card-row memoir-social-avatar-row">
                        <div className="memoir-social-avatar-block">
                          <div className="memoir-social-avatar-row-inline">
                            <div
                              className={[
                                "memoir-social-detail-avatar",
                                sel.role === "本人" ? "memoir-social-detail-avatar--self" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              aria-hidden
                            >
                              {sel.avatarUrl ? (
                                <img src={sel.avatarUrl} alt="" className="memoir-social-detail-avatar-img" />
                              ) : (
                                <span className="memoir-social-detail-avatar-letter">
                                  {(sel.name.trim() || "?").slice(0, 1)}
                                </span>
                              )}
                            </div>
                            <div className="memoir-social-avatar-actions">
                              <input
                                id={`soc-avatar-${sel.id}`}
                                type="file"
                                accept="image/*"
                                className="memoir-social-avatar-file"
                                onChange={async (e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = "";
                                  if (!f) return;
                                  const url = await readKinAvatarFile(f);
                                  if (url) updateSocial(sel.id, { avatarUrl: url });
                                }}
                              />
                              <label htmlFor={`soc-avatar-${sel.id}`} className="memoir-btn-outline">上传图片</label>
                              {sel.avatarUrl ? (
                                <button
                                  type="button"
                                  className="memoir-btn-outline memoir-btn-outline--secondary"
                                  onClick={() => updateSocial(sel.id, { avatarUrl: undefined })}
                                >
                                  默认头像
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <p className="memoir-social-avatar-hint">未上传时显示名称第一个字；图片仅存于本机浏览器。</p>
                        </div>
                      </div>
                      <div className="memoir-card-row">
                        <label className="memoir-label" htmlFor={`soc-name-${sel.id}`}>
                          名称
                        </label>
                        <input
                          id={`soc-name-${sel.id}`}
                          className="memoir-input"
                          value={sel.name}
                          onChange={(e) => updateSocial(sel.id, { name: e.target.value })}
                          placeholder="姓名或称呼"
                        />
                      </div>
                      <div className="memoir-card-row">
                        <label className="memoir-label" htmlFor={`soc-gender-${sel.id}`}>
                          性别
                        </label>
                        <select
                          id={`soc-gender-${sel.id}`}
                          className="memoir-input memoir-select-social"
                          value={
                            sel.gender && SOCIAL_GENDER_OPTIONS.includes(sel.gender as (typeof SOCIAL_GENDER_OPTIONS)[number])
                              ? sel.gender
                              : ""
                          }
                          onChange={(e) =>
                            updateSocial(sel.id, {
                              gender: e.target.value ? e.target.value : undefined,
                            })
                          }
                        >
                          <option value="">请选择</option>
                          {SOCIAL_GENDER_OPTIONS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="memoir-card-row">
                        <label className="memoir-label" htmlFor={`soc-note-${sel.id}`}>
                          备注
                        </label>
                        <textarea
                          id={`soc-note-${sel.id}`}
                          className="memoir-textarea"
                          rows={2}
                          value={sel.note ?? ""}
                          onChange={(e) => updateSocial(sel.id, { note: e.target.value })}
                          placeholder="可选"
                        />
                      </div>
                      <div className="memoir-social-save-row">
                        <button
                          type="button"
                          className="memoir-btn-primary memoir-btn-primary--social-save"
                          disabled={nodeSaveDisabled}
                          onClick={() => saveSocialCurrentNodeSection(sel.id)}
                        >
                          保存
                        </button>
                        {sel.role !== "本人" ? (
                          <button type="button" className="memoir-btn-ghost" onClick={() => removeSocial(sel.id)}>
                            删除节点
                          </button>
                        ) : null}
                        {socialSaveNodeOk ? (
                          <span className="memoir-social-save-ok" role="status">
                            已保存到本机
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <h3 className="memoir-social-detail-title">与此人相连的线</h3>
                    <p className="memoir-social-edge-hint">线上文案即两人关系；同一对节点仅一条连线。在画布上从节点拖到另一节点可新建。</p>
                    <ul className="memoir-social-edge-list">
                      {incident.length === 0 ? (
                        <li className="memoir-social-edge-list-empty">暂无连线：从本节点或他人节点拖线连接即可。</li>
                      ) : (
                        incident.map((e) => {
                          const otherId = e.from === sel.id ? e.to : e.from;
                          const other = socialNodes.find((n) => n.id === otherId);
                          const otherDisplayName =
                            other?.role === "本人" ? "我" : other?.name ?? otherId;
                          return (
                            <li
                              key={e.id}
                              className={[
                                "memoir-social-edge-item",
                                activeEdgeId === e.id ? "memoir-social-edge-item--active" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              <div
                                className="memoir-social-edge-peer"
                                title={`连线至 ${otherDisplayName}`}
                              >
                                <span className="memoir-social-edge-peer-mark" aria-hidden>
                                  <span className="memoir-social-edge-peer-mark-core" />
                                </span>
                                <span className="memoir-social-edge-peer-beam" aria-hidden />
                                <span className="memoir-social-edge-peer-name">
                                  {otherDisplayName}
                                </span>
                              </div>
                              <input
                                className="memoir-input memoir-input--edge-relation"
                                aria-label={`与 ${otherDisplayName ?? ""} 的关系`}
                                value={e.relation === "关系" ? "" : e.relation}
                                onChange={(ev) => updateSocialEdgeRelation(e.id, ev.target.value)}
                                onFocus={() => setActiveEdgeId(e.id)}
                                onBlur={() => setActiveEdgeId(null)}
                                placeholder="关系"
                              />
                              <button
                                type="button"
                                className="memoir-btn-ghost memoir-btn-ghost--compact"
                                onClick={() => removeSocialEdge(e.id)}
                              >
                                删除连线
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                    <div className="memoir-social-save-row memoir-social-save-row--edges">
                      <button
                        type="button"
                        className="memoir-btn-primary memoir-btn-primary--social-save"
                        disabled={edgesSaveDisabled}
                        onClick={() => saveSocialEdgesSection(sel.id)}
                      >
                        保存
                      </button>
                      {socialSaveEdgesOk ? (
                        <span className="memoir-social-save-ok" role="status">
                          已保存到本机
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      )}

      {tab === "footprint" && (
        <section className="memoir-panel memoir-foot-panel" aria-labelledby="memoir-foot-heading">
          <h2 id="memoir-foot-heading" className="memoir-panel-title">
            人生足迹
          </h2>
          <p className="memoir-panel-desc">
            按时间线记录城市、学校、工作与转折时刻。可简写年份或具体日期。
          </p>
          <div className="memoir-foot-body">
            {/* 左栏：文字输入区 */}
            <div className="memoir-foot-left">
              <ul className="memoir-timeline">
                {footprints.map((fp) => (
                    <li
                      key={fp.id}
                      className={[
                        "memoir-timeline-item",
                        footDragId === fp.id ? "memoir-timeline-item--dragging" : "",
                        footDragOverId === fp.id && footDragId !== fp.id ? "memoir-timeline-item--drag-over" : "",
                      ].filter(Boolean).join(" ")}
                      draggable
                      onDragStart={() => onFootDragStart(fp.id)}
                      onDragOver={(e) => onFootDragOver(e, fp.id)}
                      onDrop={(e) => onFootDrop(e, fp.id)}
                      onDragEnd={onFootDragEnd}
                    >
                      <div className="memoir-timeline-dot" />
                      <div className="memoir-timeline-body">
                      <div className="memoir-foot-drag-handle" aria-hidden>
                        <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor">
                          <circle cx="3" cy="4"  r="1.8"/>
                          <circle cx="9" cy="4"  r="1.8"/>
                          <circle cx="3" cy="10" r="1.8"/>
                          <circle cx="9" cy="10" r="1.8"/>
                          <circle cx="3" cy="16" r="1.8"/>
                          <circle cx="9" cy="16" r="1.8"/>
                        </svg>
                      </div>
                        <div className="memoir-timeline-meta">
                          <input
                            className={["memoir-input memoir-input--short", fp.id === "f1" ? "memoir-input--readonly" : ""].join(" ").trim()}
                            value={fp.date}
                            onChange={(e) => updateFoot(fp.id, { date: e.target.value })}
                            placeholder="时间"
                            readOnly={fp.id === "f1"}
                          />
                          <input
                            className={["memoir-input memoir-input--grow", fp.id === "f1" ? "memoir-input--readonly" : ""].join(" ").trim()}
                            value={fp.place}
                            onChange={(e) => updateFoot(fp.id, { place: e.target.value })}
                            placeholder="地点"
                            readOnly={fp.id === "f1"}
                          />
                        </div>
                        <input
                          className="memoir-input"
                          value={fp.title}
                          onChange={(e) => updateFoot(fp.id, { title: e.target.value })}
                          placeholder="标题"
                        />
                        <textarea
                          className="memoir-textarea"
                          rows={2}
                          value={fp.detail ?? ""}
                          onChange={(e) => updateFoot(fp.id, { detail: e.target.value })}
                          placeholder="细节（可选）"
                        />
                        <div className="memoir-foot-action-row">
                          <button
                            type="button"
                            className="memoir-btn-primary memoir-btn-primary--social-save"
                            disabled={
                              footSnapshots[fp.id] ===
                              JSON.stringify({ date: fp.date, place: fp.place, title: fp.title, detail: fp.detail ?? "" })
                            }
                            onClick={() => saveFootCard(fp.id, fp)}
                          >
                            保存
                          </button>
                          {fp.id !== "f1" && (
                            <button type="button" className="memoir-btn-ghost" onClick={() => removeFoot(fp.id)}>
                              删除此条
                            </button>
                          )}
                          {footSavedIds.has(fp.id) && (
                            <span className="memoir-social-save-ok" role="status">已保存到本机</span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
              <div className="memoir-foot-bottom-row">
                <button type="button" className="memoir-btn-primary" onClick={addFootprint}>
                  + 添加足迹
                </button>
                <button
                  type="button"
                  className="memoir-btn-ghost memoir-foot-sort-btn"
                  onClick={() => setFootprints((prev) => [...prev].sort((a, b) => String(a.date).localeCompare(String(b.date))))}
                >
                  按时间排序
                </button>
                <button
                  type="button"
                  className="memoir-btn-primary memoir-foot-animate-btn"
                  disabled={
                    footAnimPlayed ||
                    !footprints.every((fp) =>
                      footSnapshots[fp.id] === JSON.stringify({ date: fp.date, place: fp.place, title: fp.title, detail: fp.detail ?? "" })
                    )
                  }
                  onClick={() => {
                    footPlayRef.current?.();
                    setFootAnimPlayed(true);
                  }}
                >
                  生成动画
                </button>
              </div>
            </div>

            {/* 右栏：地图区 */}
            <div className="memoir-foot-right">
              <FootprintMap
                footprints={footprints}
                apiKey={mapsApiKey}
                onApiKeyChange={setMapsApiKey}
                playRef={footPlayRef}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
