import React, { useCallback, useEffect, useRef, useState } from "react";

export interface FootprintMapEntry {
  id: string;
  date: string;
  place: string;
  title: string;
}

interface Props {
  footprints: FootprintMapEntry[];
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  /** 外部可调用 playJourney 的 ref */
  playRef?: React.MutableRefObject<(() => void) | null>;
}

/* ── 模块级：只加载一次脚本 ── */
type GmStatus = "idle" | "loading" | "ready" | "error";
let _gmStatus: GmStatus = "idle";
const _gmQueue: Array<(ok: boolean) => void> = [];

function loadGoogleMaps(apiKey: string): Promise<boolean> {
  if (_gmStatus === "ready") return Promise.resolve(true);
  if (_gmStatus === "error") return Promise.resolve(false);
  return new Promise((resolve) => {
    if (_gmStatus === "loading") { _gmQueue.push(resolve); return; }
    _gmStatus = "loading";
    _gmQueue.push(resolve);
    (window as any).__footprintMapReady = () => {
      _gmStatus = "ready";
      _gmQueue.forEach((r) => r(true));
      _gmQueue.length = 0;
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=__footprintMapReady&loading=async`;
    s.async = true;
    s.onerror = () => {
      _gmStatus = "error";
      _gmQueue.forEach((r) => r(false));
      _gmQueue.length = 0;
    };
    document.head.appendChild(s);
  });
}

const AVATAR_KEY = "twin_avatar";
const DEFAULT_AVATAR = "/avatars/memoji/2.png";

/** 将头像绘制为带白色圆框的圆形 marker 图标，返回 data URL */
function makeCircularIcon(src: string, size = 44): Promise<string> {
  return new Promise((resolve) => {
    const border = 3;
    const total = size + border * 2;
    const tailH = 10;
    const canvas = document.createElement("canvas");
    canvas.width = total;
    canvas.height = total + tailH;
    const ctx = canvas.getContext("2d")!;

    const cx = total / 2;
    const cy = total / 2;
    const r = total / 2;

    // 白色圆形底板
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 小尾巴（三角形）
    ctx.beginPath();
    ctx.moveTo(cx - 6, total - 2);
    ctx.lineTo(cx + 6, total - 2);
    ctx.lineTo(cx, total + tailH);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // 圆形裁剪区域绘制头像
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - border, 0, Math.PI * 2);
    ctx.clip();

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, border, border, size, size);
      ctx.restore();
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      ctx.restore();
      resolve(""); // fallback：使用默认 Google Maps 标记
    };
    img.src = src;
  });
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** 经度插值：自动选择跨换日线的最短路径 */
function lerpLng(a: number, b: number, t: number) {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return a + diff * t;
}

type PanelStatus = "no-key" | "loading" | "ready" | "error";

interface ResolvedPoint {
  fp: FootprintMapEntry;
  lat: number;
  lng: number;
}

export const FootprintMap: React.FC<Props> = ({ footprints, apiKey, onApiKeyChange, playRef }) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const journeyMarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const animCancelRef = useRef({ cancelled: false });
  const resolvedRef = useRef<ResolvedPoint[]>([]);

  const [status, setStatus] = useState<PanelStatus>(apiKey ? "loading" : "no-key");
  const [keyDraft, setKeyDraft] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPath, setHasPath] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(
    () => window.localStorage.getItem(AVATAR_KEY) ?? DEFAULT_AVATAR
  );
  const [cameraMode, setCameraMode] = useState<"follow" | "static">("follow");
  const cameraModeRef = useRef<"follow" | "static">("follow");
  useEffect(() => { cameraModeRef.current = cameraMode; }, [cameraMode]);

  /* 监听头像变化（同页跨组件保存后刷新） */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === AVATAR_KEY && e.newValue) setAvatarUrl(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* 也定期轮询（同 tab 内 localStorage 变更不触发 storage 事件） */
  useEffect(() => {
    const id = setInterval(() => {
      const v = window.localStorage.getItem(AVATAR_KEY);
      if (v && v !== avatarUrl) setAvatarUrl(v);
    }, 2000);
    return () => clearInterval(id);
  }, [avatarUrl]);

  /* 加载 Maps API + 初始化地图 */
  useEffect(() => {
    if (!apiKey) { setStatus("no-key"); return; }
    setStatus("loading");
    loadGoogleMaps(apiKey).then((ok) => {
      if (!ok) { setStatus("error"); return; }
      if (!mapDivRef.current) return;
      const gm = (window as any).google.maps;
      mapRef.current = new gm.Map(mapDivRef.current, {
        center: { lat: 35, lng: 105 },
        zoom: 4,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      geocoderRef.current = new gm.Geocoder();
      setStatus("ready");
    });
  }, [apiKey]);

  /* 更新 Marker + 折线路径 */
  useEffect(() => {
    if (status !== "ready" || !mapRef.current || !geocoderRef.current) return;
    const gm = (window as any).google.maps;

    // 清除旧 marker、折线、旅程 marker
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    journeyMarkerRef.current?.setMap(null);
    journeyMarkerRef.current = null;
    animCancelRef.current.cancelled = true;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsPlaying(false);
    resolvedRef.current = [];
    setHasPath(false);

    const places = footprints.filter((fp) => fp.place.trim());
    if (places.length === 0) return;

    const bounds = new gm.LatLngBounds();
    const resolved: ResolvedPoint[] = [];
    let settled = 0;

    places.forEach((fp) => {
      geocoderRef.current.geocode({ address: fp.place }, (results: any, st: string) => {
        settled++;
        if (st === "OK" && results?.[0]) {
          const pos = results[0].geometry.location;
          const lat = pos.lat();
          const lng = pos.lng();

          const marker = new gm.Marker({
            position: { lat, lng },
            map: mapRef.current,
            title: `${fp.date} · ${fp.place}`,
          });
          const iw = new gm.InfoWindow({
            content: `<div style="font-size:13px;line-height:1.6;max-width:180px">
              <strong>${fp.place}</strong><br/>
              <span style="color:#64748b">${fp.date}</span>
              ${fp.title ? `<br/>${fp.title}` : ""}
            </div>`,
          });
          marker.addListener("click", () => iw.open(mapRef.current, marker));
          markersRef.current.push(marker);
          bounds.extend({ lat, lng });
          resolved.push({ fp, lat, lng });
        }

        if (settled === places.length) {
          // 按日期排序
          resolved.sort((a, b) => String(a.fp.date).localeCompare(String(b.fp.date)));
          resolvedRef.current = resolved;

          if (resolved.length >= 2) {
            // 画折线
            polylineRef.current = new gm.Polyline({
              path: resolved.map((p) => ({ lat: p.lat, lng: p.lng })),
              geodesic: false,
              strokeColor: "#3b82f6",
              strokeOpacity: 0.6,
              strokeWeight: 2.5,
              icons: [{
                icon: { path: gm.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 },
                offset: "50%",
              }],
            });
            polylineRef.current.setMap(mapRef.current);
            setHasPath(true);
          }

          if (markersRef.current.length > 0) {
            if (markersRef.current.length === 1) {
              mapRef.current.setCenter(bounds.getCenter());
              mapRef.current.setZoom(10);
            } else {
              mapRef.current.fitBounds(bounds, 40);
            }
          }
        }
      });
    });
  }, [status, footprints]);

  /* 播放轨迹动画 */
  const playJourney = useCallback(async () => {
    const points = resolvedRef.current;
    if (points.length < 2 || !mapRef.current) return;

    // 取消上一次
    animCancelRef.current.cancelled = true;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    journeyMarkerRef.current?.setMap(null);

    const cancel = { cancelled: false };
    animCancelRef.current = cancel;
    setIsPlaying(true);

    const gm = (window as any).google.maps;

    // 制作圆形头像 icon
    const iconUrl = await makeCircularIcon(avatarUrl);
    if (cancel.cancelled) return;

    const iconSize = 50;
    const markerIcon = iconUrl
      ? { url: iconUrl, scaledSize: new gm.Size(iconSize, iconSize + 10), anchor: new gm.Point(iconSize / 2, iconSize + 10) }
      : undefined;

    const jMarker = new gm.Marker({
      position: { lat: points[0].lat, lng: points[0].lng },
      map: mapRef.current,
      icon: markerIcon,
      zIndex: 999,
    });
    journeyMarkerRef.current = jMarker;
    if (cameraModeRef.current === "follow") mapRef.current.panTo({ lat: points[0].lat, lng: points[0].lng });

    /** 固定移动速度：度/秒（经纬度合距离），最短 600ms 避免闪现 */
    const SPEED_DEG_PER_SEC = 12;
    const PAUSE_DURATION = 900;

    function segmentDuration(from: ResolvedPoint, to: ResolvedPoint): number {
      const dlat = to.lat - from.lat;
      let dlng = to.lng - from.lng;
      if (dlng > 180) dlng -= 360;
      if (dlng < -180) dlng += 360;
      const dist = Math.sqrt(dlat * dlat + dlng * dlng);
      return Math.max(600, (dist / SPEED_DEG_PER_SEC) * 1000);
    }

    function moveToNext(idx: number) {
      if (cancel.cancelled || idx >= points.length) {
        if (!cancel.cancelled) setIsPlaying(false);
        return;
      }
      const from = points[idx - 1];
      const to = points[idx];
      const moveDuration = segmentDuration(from, to);
      const start = Date.now();

      function frame() {
        if (cancel.cancelled) return;
        const raw = Math.min(1, (Date.now() - start) / moveDuration);
        const t = raw;
        const lat = lerp(from.lat, to.lat, t);
        const lng = lerpLng(from.lng, to.lng, t);
        jMarker.setPosition({ lat, lng });
        if (cameraModeRef.current === "follow") mapRef.current.setCenter({ lat, lng });
        if (raw < 1) {
          animFrameRef.current = requestAnimationFrame(frame);
        } else {
          // 到站停留
          setTimeout(() => moveToNext(idx + 1), PAUSE_DURATION);
        }
      }
      animFrameRef.current = requestAnimationFrame(frame);
    }

    // 在第一站短暂停留后出发
    setTimeout(() => moveToNext(1), PAUSE_DURATION);
  }, [avatarUrl]);

  /* 把 playJourney 暴露给外部 ref */
  useEffect(() => {
    if (playRef) playRef.current = playJourney;
  }, [playRef, playJourney]);

  const stopJourney = useCallback(() => {
    animCancelRef.current.cancelled = true;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    journeyMarkerRef.current?.setMap(null);
    journeyMarkerRef.current = null;
    setIsPlaying(false);
  }, []);

  /* 卸载清理 */
  useEffect(() => {
    return () => {
      animCancelRef.current.cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const k = keyDraft.trim();
    if (k) { onApiKeyChange(k); setKeyDraft(""); }
  };

  return (
    <div className="footprint-map-panel">
      <div
        ref={mapDivRef}
        className="footprint-map-canvas"
        style={{ display: status === "ready" ? "block" : "none" }}
      />

      {status === "no-key" && (
        <div className="footprint-map-placeholder">
          <div className="footprint-map-icon" aria-hidden>🗺️</div>
          <p className="footprint-map-placeholder-title">人生轨迹地图</p>
          <p className="footprint-map-placeholder-desc">
            连接 Google Maps，将你记录的地点标注在地图上。
          </p>
          <form className="footprint-map-key-form" onSubmit={handleConnect}>
            <input
              className="memoir-input footprint-map-key-input"
              type="text"
              placeholder="粘贴 Google Maps API Key"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="memoir-btn-primary footprint-map-key-btn"
              disabled={!keyDraft.trim()}
            >
              连接地图
            </button>
          </form>
          <p className="footprint-map-key-hint">
            API Key 仅保存在本机浏览器，不会上传至任何服务器。
          </p>
        </div>
      )}

      {status === "loading" && (
        <div className="footprint-map-placeholder">
          <div className="footprint-map-spinner" aria-hidden />
          <p className="footprint-map-placeholder-desc">地图加载中…</p>
        </div>
      )}

      {status === "error" && (
        <div className="footprint-map-placeholder">
          <p className="footprint-map-error-msg">地图加载失败，请检查 API Key 是否有效，然后刷新页面重试。</p>
          <button
            type="button"
            className="memoir-btn-ghost footprint-map-reset-btn"
            onClick={() => { _gmStatus = "idle"; onApiKeyChange(""); }}
          >
            重新输入 API Key
          </button>
        </div>
      )}

      {status === "ready" && (
        <div className="footprint-map-footer">
          <div className="footprint-map-footer-left">
            {hasPath && !isPlaying && (
              <button
                type="button"
                className="footprint-map-play-btn"
                onClick={playJourney}
                title="播放人生轨迹动画"
              >
                ▶ 播放轨迹
              </button>
            )}
            {isPlaying && (
              <button
                type="button"
                className="footprint-map-stop-btn"
                onClick={stopJourney}
                title="停止动画"
              >
                ■ 停止
              </button>
            )}
            {!hasPath && (
              <span className="footprint-map-footer-hint">添加至少两个有地点的足迹以播放轨迹</span>
            )}
          </div>
          <div className="footprint-map-footer-right">
            <div className="footprint-map-camera-toggle" role="group" aria-label="镜头模式">
              <button
                type="button"
                className={["footprint-map-camera-btn", cameraMode === "follow" ? "footprint-map-camera-btn--active" : ""].filter(Boolean).join(" ")}
                onClick={() => setCameraMode("follow")}
                title="镜头跟随头像"
              >
                跟随
              </button>
              <button
                type="button"
                className={["footprint-map-camera-btn", cameraMode === "static" ? "footprint-map-camera-btn--active" : ""].filter(Boolean).join(" ")}
                onClick={() => setCameraMode("static")}
                title="镜头固定不动"
              >
                固定
              </button>
            </div>
            <button
              type="button"
              className="footprint-map-reset-link"
              onClick={() => onApiKeyChange("")}
            >
              更换 Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
