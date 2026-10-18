"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  createScrollFrames: () => createScrollFrames,
  formatTime: () => formatTime,
  parseTime: () => parseTime,
  toProgress: () => toProgress
});
module.exports = __toCommonJS(src_exports);
var clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
function parseTime(t) {
  if (typeof t === "number") return t;
  const s = t.trim();
  return s.split(":").map(Number).reduce((acc, n) => acc * 60 + n, 0);
}
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  return `${m}:${(sec - m * 60).toFixed(2).padStart(5, "0")}`;
}
function toProgress(t, m) {
  if (typeof t === "string" && t.trim().endsWith("%")) return clamp(parseFloat(t) / 100);
  const frame = (parseTime(t) - m.start) * m.fps;
  return clamp(frame / Math.max(1, m.frameCount - 1));
}
var STYLE_ID = "sf-styles";
var CSS = `
[data-sf-host]{position:relative;display:block}
[data-sf-host][data-sf-mode=pin]{height:calc(var(--sf-length,5) * 100vh);height:calc(var(--sf-length,5) * 100svh)}
[data-sf-host][data-sf-mode=inline]{aspect-ratio:var(--sf-aspect,16/9)}
[data-sf-stage]{position:relative;width:100%;height:100%;overflow:hidden;background:var(--sf-bg,#000)}
[data-sf-mode=pin]>[data-sf-stage]{position:sticky;top:var(--sf-top,0px);height:var(--sf-stage-height,100vh);height:var(--sf-stage-height,100svh)}
[data-sf-canvas]{position:absolute;inset:0;width:100%;height:100%;display:block;background-size:cover;background-position:var(--sf-position,50% 50%)}
[data-sf-overlay]{position:absolute;inset:0;pointer-events:none}
[data-sf-overlay] a,[data-sf-overlay] button,[data-sf-overlay] input,[data-sf-overlay] [data-sf-interactive]{pointer-events:auto}
[data-sf-overlay] [data-from]:not([data-anim=manual]),[data-sf-overlay] [data-at]:not([data-anim=manual]){opacity:0;visibility:hidden;transform:translateY(var(--sf-shift,16px));transition:opacity var(--sf-dur,.45s) ease,transform var(--sf-dur,.45s) ease,visibility 0s linear var(--sf-dur,.45s)}
[data-sf-overlay] [data-active]:not([data-anim=manual]){opacity:1;visibility:visible;transform:none;transition:opacity var(--sf-dur,.45s) ease,transform var(--sf-dur,.45s) ease,visibility 0s}
[data-sf-overlay] [data-anim=fade]{transform:none!important}
[data-sf-overlay] [data-anim=none]{transition:none!important;transform:none!important}
[data-sf-debug]{position:absolute;left:8px;top:8px;z-index:9;padding:8px 10px;font:11px/1.5 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.8);border:1px solid #ff4d2e;pointer-events:none;white-space:pre}
@media (prefers-reduced-motion:reduce){[data-sf-overlay] [data-from],[data-sf-overlay] [data-at]{transform:none!important}}
`;
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.prepend(el);
}
var urlDebug = () => {
  try {
    return new URLSearchParams(location.search).has("sf-debug");
  } catch {
    return false;
  }
};
function createScrollFrames(host, opts) {
  injectStyles();
  const mode = opts.mode ?? "pin";
  const smooth = clamp(opts.smooth ?? 0.15, 0, 0.95);
  const fit = opts.fit ?? "cover";
  const [posX, posY] = (opts.position ?? "50% 50%").split(/\s+/).map((v) => clamp(parseFloat(v) / 100));
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const debug = !!opts.debug || urlDebug();
  host.setAttribute("data-sf-host", "");
  host.setAttribute("data-sf-mode", mode);
  if (mode === "pin") host.style.setProperty("--sf-length", String(opts.length ?? 5));
  if (opts.top) host.style.setProperty("--sf-top", `${opts.top}px`);
  if (opts.position) host.style.setProperty("--sf-position", opts.position);
  let stage = host.querySelector(":scope > [data-sf-stage]");
  let canvas;
  let overlay;
  const created = !stage;
  if (!stage) {
    stage = document.createElement("div");
    stage.setAttribute("data-sf-stage", "");
    canvas = document.createElement("canvas");
    canvas.setAttribute("data-sf-canvas", "");
    overlay = document.createElement("div");
    overlay.setAttribute("data-sf-overlay", "");
    while (host.firstChild) overlay.appendChild(host.firstChild);
    stage.append(canvas, overlay);
    host.appendChild(stage);
  } else {
    canvas = stage.querySelector("[data-sf-canvas]");
    overlay = stage.querySelector("[data-sf-overlay]");
  }
  const ctx = canvas.getContext("2d", { alpha: false });
  let debugEl = null;
  if (debug) {
    debugEl = document.createElement("div");
    debugEl.setAttribute("data-sf-debug", "");
    stage.appendChild(debugEl);
  }
  let manifest = opts.manifest ?? null;
  let images = [];
  let sizeKey = "lg";
  let target = 0;
  let current = 0;
  let drawnFrame = -1;
  let drawnW = 0;
  let drawnH = 0;
  let raf = 0;
  let inView = false;
  let loadingStarted = false;
  let destroyed = false;
  let cues = [];
  let lastEmit = -1;
  let playRaf = 0;
  let loaded = 0;
  const total = () => manifest?.frameCount ?? 1;
  const frameOf = (p) => Math.round(p * (total() - 1));
  const timeOf = (f) => manifest ? manifest.start + f / manifest.fps : 0;
  const emit = (name, detail) => host.dispatchEvent(new CustomEvent(name, { detail }));
  function readProgress() {
    const r = host.getBoundingClientRect();
    const vh = window.innerHeight;
    if (mode === "pin") {
      const stageH = stage.offsetHeight;
      const span = r.height - stageH;
      const top = opts.top ?? 0;
      return span > 0 ? clamp((top - r.top) / span) : 0;
    }
    return clamp((vh - r.top) / (vh + r.height));
  }
  function scrollYFor(p) {
    const r = host.getBoundingClientRect();
    const docTop = r.top + window.scrollY;
    const vh = window.innerHeight;
    if (mode === "pin") return docTop - (opts.top ?? 0) + p * (r.height - stage.offsetHeight);
    return docTop - vh + p * (vh + r.height);
  }
  function resize() {
    const dprCap = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(stage.clientWidth * dprCap));
    const h = Math.max(1, Math.round(stage.clientHeight * dprCap));
    if (w === drawnW && h === drawnH) return;
    if (drawnW === w && Math.abs(h - drawnH) < 2) return;
    canvas.width = drawnW = w;
    canvas.height = drawnH = h;
    drawnFrame = -1;
    pickSize();
    schedule();
  }
  function pickSize() {
    if (!manifest) return;
    const need = stage.clientWidth * Math.min(window.devicePixelRatio || 1, 2);
    const entries = Object.entries(manifest.sizes).sort((a, b) => a[1] - b[1]);
    const choice = entries.find(([, w]) => w >= need * 0.8) ?? entries[entries.length - 1];
    if (choice[0] !== sizeKey && !loadingStarted) sizeKey = choice[0];
  }
  const url = (i) => `${opts.src.replace(/\/$/, "")}/${sizeKey}/${String(i + 1).padStart(manifest.pad, "0")}.${manifest.ext}`;
  function loadOne(i, done) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      (img.decode ? img.decode() : Promise.resolve()).catch(() => {
      }).then(() => {
        if (destroyed) return;
        images[i] = img;
        loaded++;
        if (loaded % 20 === 0 || loaded === total()) emit("sf:load", { loaded, total: total() });
        if (Math.abs(i - frameOf(current)) < 30) {
          drawnFrame = -1;
          schedule();
        }
        done?.();
      });
    };
    img.onerror = () => done?.();
    img.src = url(i);
  }
  function startLoading() {
    if (loadingStarted || !manifest) return;
    loadingStarted = true;
    const n = manifest.frameCount;
    const conn = navigator.connection;
    const slow = !!conn && (conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType ?? ""));
    const minStride = slow ? 2 : 1;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const concurrency = coarse ? 4 : 6;
    const order = [];
    const seen = new Uint8Array(n);
    for (let s = 32; s >= minStride; s = s >> 1) {
      for (let i = 0; i < n; i += s) if (!seen[i]) seen[i] = 1, order.push(i);
    }
    if (!seen[n - 1]) order.push(n - 1);
    let cursor = 0;
    let inflight = 0;
    const pump = () => {
      while (!destroyed && inflight < concurrency && cursor < order.length) {
        const i = order[cursor++];
        if (images[i]) continue;
        inflight++;
        loadOne(i, () => {
          inflight--;
          pump();
        });
      }
    };
    pump();
  }
  function nearestLoaded(f) {
    if (images[f]) return images[f];
    for (let d = 1; d < images.length; d++) {
      const a = images[f - d];
      if (a) return a;
      const b = images[f + d];
      if (b) return b;
    }
    return null;
  }
  function draw(f) {
    const img = nearestLoaded(f);
    if (!img) return;
    const W = canvas.width;
    const H = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const s = fit === "cover" ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
    const w = iw * s;
    const h = ih * s;
    if (fit === "contain") {
      ctx.fillStyle = getComputedStyle(stage).backgroundColor || "#000";
      ctx.fillRect(0, 0, W, H);
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (W - w) * posX, (H - h) * posY, w, h);
    if (img === images[f]) drawnFrame = f;
  }
  function scanCues() {
    if (!manifest) return;
    const m = manifest;
    cues = [];
    overlay.querySelectorAll("[data-from]").forEach((el) => {
      const from = toProgress(el.dataset.from, m);
      const to = el.dataset.to ? toProgress(el.dataset.to, m) : 1.0001;
      cues.push({ el, from, to, active: el.hasAttribute("data-active") });
    });
    const groups = /* @__PURE__ */ new Map();
    overlay.querySelectorAll("[data-at]").forEach((el) => {
      const g = groups.get(el.parentElement) ?? [];
      g.push(el);
      groups.set(el.parentElement, g);
    });
    groups.forEach((els) => {
      const sorted = els.map((el) => ({ el, at: toProgress(el.dataset.at, m) })).sort((a, b) => a.at - b.at);
      sorted.forEach((c, i) => {
        const end = c.el.dataset.to ? toProgress(c.el.dataset.to, m) : sorted[i + 1]?.at ?? 1.0001;
        cues.push({ el: c.el, from: c.at, to: end, active: c.el.hasAttribute("data-active") });
      });
    });
  }
  function updateCues(p) {
    for (const c of cues) {
      const on = p >= c.from && p < c.to;
      if (on) c.el.style.setProperty("--sf-cue", ((p - c.from) / Math.max(1e-6, c.to - c.from)).toFixed(4));
      if (on !== c.active) {
        c.active = on;
        c.el.toggleAttribute("data-active", on);
        emit("sf:cue", { el: c.el, active: on });
      }
    }
  }
  function schedule() {
    if (!raf && !destroyed) raf = requestAnimationFrame(tick);
  }
  function tick() {
    raf = 0;
    if (!manifest) return;
    const k = reducedMotion ? 0 : smooth;
    current = Math.abs(target - current) < 5e-5 ? target : current + (target - current) * (1 - k);
    const f = frameOf(current);
    if (f !== drawnFrame) draw(f);
    if (f !== lastEmit) {
      lastEmit = f;
      const time = timeOf(f);
      host.style.setProperty("--sf-progress", current.toFixed(4));
      host.style.setProperty("--sf-time", time.toFixed(2));
      updateCues(current);
      emit("sf:progress", { progress: current, frame: f, time });
      if (debugEl) {
        debugEl.textContent = `FRAME ${String(f + 1).padStart(4, "0")} / ${total()}
TIME  ${formatTime(time)}
PROG  ${(current * 100).toFixed(2)}%  [${sizeKey}]
[ ] \xB11  shift \xB110  C copy`;
      }
    }
    if (current !== target) schedule();
  }
  function onScroll() {
    target = readProgress();
    schedule();
  }
  function cancelPlay() {
    if (playRaf) cancelAnimationFrame(playRaf);
    playRaf = 0;
    host.removeAttribute("data-sf-playing");
    window.removeEventListener("wheel", cancelPlay);
    window.removeEventListener("touchstart", cancelPlay);
  }
  function seek(t, behavior = "smooth") {
    if (!manifest) return;
    window.scrollTo({ top: scrollYFor(toProgress(t, manifest)), behavior });
  }
  function play(o = {}) {
    if (!manifest) return;
    cancelPlay();
    let fromP = readProgress();
    const toP = o.to !== void 0 ? toProgress(o.to, manifest) : 1;
    if (fromP >= toP - 1e-3) fromP = 0;
    const secs = o.duration ?? manifest.duration * Math.abs(toP - fromP);
    const y0 = scrollYFor(fromP);
    const y1 = scrollYFor(toP);
    const t0 = performance.now();
    host.setAttribute("data-sf-playing", "");
    window.addEventListener("wheel", cancelPlay, { passive: true });
    window.addEventListener("touchstart", cancelPlay, { passive: true });
    const step = (now) => {
      const t = clamp((now - t0) / (secs * 1e3));
      window.scrollTo(0, y0 + (y1 - y0) * t);
      if (t >= 1) return cancelPlay();
      playRaf = requestAnimationFrame(step);
    };
    playRaf = requestAnimationFrame(step);
  }
  function onClick(e) {
    const el = e.target.closest("[data-sf-play],[data-sf-seek]");
    if (!el || !host.contains(el)) return;
    if (el.hasAttribute("data-sf-seek")) seek(el.dataset.sfSeek);
    else if (host.hasAttribute("data-sf-playing")) cancelPlay();
    else play({ to: el.dataset.sfPlay || void 0 });
  }
  function onKey(e) {
    if (!debug || !inView || !manifest) return;
    if (e.key === "[" || e.key === "]" || e.key === "{" || e.key === "}") {
      e.preventDefault();
      const dir = e.key === "]" || e.key === "}" ? 1 : -1;
      const f = clamp(frameOf(target) + dir * (e.shiftKey ? 10 : 1), 0, total() - 1);
      window.scrollTo(0, Math.ceil(scrollYFor(f / (total() - 1))));
    } else if (e.key === "c" || e.key === "C") {
      const t = formatTime(timeOf(frameOf(target)));
      navigator.clipboard?.writeText(`"${t}"`);
      if (debugEl) debugEl.textContent += `
copied "${t}"`;
    }
  }
  const ro = new ResizeObserver(() => {
    resize();
    onScroll();
  });
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        inView = e.isIntersecting;
        if (inView) {
          startLoading();
          onScroll();
        }
      }
    },
    { rootMargin: "100% 0px 100% 0px" }
  );
  const mo = new MutationObserver(() => {
    scanCues();
    lastEmit = -1;
    schedule();
  });
  async function init() {
    if (!manifest) {
      const res = await fetch(`${opts.src.replace(/\/$/, "")}/manifest.json`);
      if (!res.ok) throw new Error(`scroll-frames: couldn't load ${opts.src}/manifest.json (${res.status})`);
      manifest = await res.json();
    }
    if (destroyed) return;
    images = new Array(manifest.frameCount).fill(null);
    host.style.setProperty("--sf-aspect", `${manifest.width}/${manifest.height}`);
    pickSize();
    canvas.style.backgroundImage = `url("${url(0)}")`;
    loadOne(0);
    scanCues();
    resize();
    target = current = readProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("keydown", onKey);
    host.addEventListener("click", onClick);
    ro.observe(stage);
    io.observe(host);
    mo.observe(overlay, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-from", "data-to", "data-at"] });
    schedule();
    emit("sf:ready", { manifest });
  }
  init().catch((err) => {
    console.error(err);
    emit("sf:error", { error: err });
  });
  return {
    host,
    get manifest() {
      return manifest;
    },
    get progress() {
      return current;
    },
    get frame() {
      return frameOf(current);
    },
    get time() {
      return timeOf(frameOf(current));
    },
    seek,
    play,
    pause: cancelPlay,
    refresh() {
      scanCues();
      drawnW = drawnH = 0;
      resize();
      onScroll();
    },
    destroy() {
      destroyed = true;
      cancelPlay();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKey);
      host.removeEventListener("click", onClick);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      debugEl?.remove();
      if (created) {
        while (overlay.firstChild) host.appendChild(overlay.firstChild);
        stage.remove();
      }
      images = [];
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createScrollFrames,
  formatTime,
  parseTime,
  toProgress
});
