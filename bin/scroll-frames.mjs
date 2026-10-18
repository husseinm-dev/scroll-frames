#!/usr/bin/env node
/**
 * scroll-frames CLI
 *
 *   npx scroll-frames extract <video> [options]
 *
 *   --out <dir>       output folder (default: public/frames/<video-name>)
 *   --frames <n>      number of frames (default 600)
 *   --fps <n>         …or frames per second instead of a fixed count
 *   --start <t>       trim start, seconds or m:ss
 *   --end <t>         trim end, seconds or m:ss
 *   --sizes lg:1920,sm:900   sizes to export (name:width). "lg" is required.
 *   --quality <n>     WebP/JPEG quality 1–100 (default 72)
 *   --jpg             write JPEG instead of WebP
 *
 * Writes <out>/manifest.json, <out>/lg/0001.webp …, <out>/sm/0001.webp …
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [cmd, ...rest] = process.argv.slice(2);

const help = () => {
  const src = fs.readFileSync(new URL(import.meta.url), "utf8");
  console.log(src.split("*/")[0].replace(/^#!.*\n\/\*\*\n?/, "").replace(/^ \* ?/gm, ""));
};

if (cmd !== "extract") {
  help();
  process.exit(cmd ? 1 : 0);
}

const video = rest.find((a, i) => !a.startsWith("--") && !rest[i - 1]?.match(/^--(?!jpg)/));
const opt = (name, def) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : def;
};
const flag = (name) => rest.includes(`--${name}`);
const toSec = (v) =>
  v === undefined || v === null || v === "" ? undefined : String(v).split(":").map(Number).reduce((a, n) => a * 60 + n, 0);
const die = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

if (!video) die("Usage: scroll-frames extract <video> [--out dir] [--frames 600] [--start 0] [--end 1:30]");
if (!fs.existsSync(video)) die(`Video not found: ${video}`);
for (const bin of ["ffmpeg", "ffprobe"]) {
  if (spawnSync(bin, ["-version"]).status !== 0) die(`${bin} not found. Install ffmpeg: macOS "brew install ffmpeg", Windows "winget install ffmpeg".`);
}

const probe = JSON.parse(
  execFileSync("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height:stream_side_data=rotation:format=duration",
    "-of", "json", video,
  ]).toString(),
);
const duration = Number(probe.format.duration);
const start = toSec(opt("start", 0)) ?? 0;
const end = Math.min(toSec(opt("end")) ?? duration, duration);
const clip = end - start;
if (!(clip > 0)) die(`Bad trim: ${start}s → ${end}s (video is ${duration.toFixed(2)}s)`);

const frames = opt("fps") ? Math.round(clip * Number(opt("fps"))) : Number(opt("frames", 600));
const fps = frames / clip;
const quality = Number(opt("quality", 72));
const sizes = Object.fromEntries(
  String(opt("sizes", "lg:1920,sm:900"))
    .split(",")
    .map((s) => s.split(":"))
    .map(([k, w]) => [k.trim(), Number(w)]),
);
if (!sizes.lg) die('--sizes must include "lg", e.g. lg:1920,sm:900');

const name = path.basename(video).replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-").toLowerCase();
const out = path.resolve(opt("out", path.join("public", "frames", name)));

const hasLibwebp = execFileSync("ffmpeg", ["-hide_banner", "-encoders"]).toString().includes("libwebp");
let sharp = null;
try {
  sharp = (await import("sharp")).default;
} catch {}

let ext = flag("jpg") ? "jpg" : "webp";
if (ext === "webp" && !hasLibwebp && !sharp) {
  console.warn('! Your ffmpeg can\'t write WebP and "sharp" isn\'t installed → using JPEG.');
  console.warn("  For ~30% smaller files: npm i -D sharp   (then re-run)");
  ext = "jpg";
}

console.log(`▸ ${path.basename(video)}  ${duration.toFixed(2)}s  → using ${start}s–${end.toFixed(2)}s`);
console.log(`▸ ${frames} frames @ ${fps.toFixed(3)} fps · sizes ${Object.entries(sizes).map(([k, w]) => `${k}:${w}`).join(" ")} · ${ext}`);

const ffmpeg = (dir, w, codec, outExt) => {
  const r = spawnSync(
    "ffmpeg",
    [
      "-hide_banner", "-loglevel", "error", "-stats",
      "-ss", String(start), "-to", String(end), "-i", video,
      "-vf", `fps=${fps},scale=${w}:-2:flags=lanczos`,
      "-frames:v", String(frames),
      ...codec,
      path.join(dir, `%04d.${outExt}`),
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  if (r.status !== 0) die("ffmpeg failed");
};

const reset = (dir) => {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
};

fs.mkdirSync(out, { recursive: true });
for (const k of Object.keys(sizes)) reset(path.join(out, k));

const largest = Math.max(...Object.values(sizes));

if (ext === "webp" && hasLibwebp) {
  for (const [k, w] of Object.entries(sizes)) {
    ffmpeg(path.join(out, k), w, ["-c:v", "libwebp", "-quality", String(k === "lg" ? quality : quality - 6), "-compression_level", "4"], "webp");
  }
} else if (ext === "jpg" && !sharp) {
  const q = String(Math.round(2 + (100 - quality) / 12)); // ffmpeg -q:v 2 (best) … 31
  for (const [k, w] of Object.entries(sizes)) ffmpeg(path.join(out, k), w, ["-q:v", q], "jpg");
} else {
  // Extract once at full size, then encode every size with sharp.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "scroll-frames-"));
  try {
    ffmpeg(tmp, largest, ["-q:v", "2"], "jpg");
    const files = fs.readdirSync(tmp).filter((f) => f.endsWith(".jpg")).sort();
    let done = 0;
    const queue = [...files];
    const encode = async (f) => {
      const src = path.join(tmp, f);
      for (const [k, w] of Object.entries(sizes)) {
        const q = k === "lg" ? quality : quality - 6;
        let p = sharp(src).resize({ width: w, withoutEnlargement: true });
        p = ext === "webp" ? p.webp({ quality: q }) : p.jpeg({ quality: q, mozjpeg: true });
        await p.toFile(path.join(out, k, f.replace(".jpg", `.${ext}`)));
      }
      if (++done % 20 === 0 || done === files.length) process.stdout.write(`\r  encoding ${done}/${files.length}`);
    };
    await Promise.all(
      Array.from({ length: Math.max(2, os.cpus().length) }, async () => {
        while (queue.length) await encode(queue.shift());
      }),
    );
    process.stdout.write("\n");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const lgFiles = fs.readdirSync(path.join(out, "lg")).filter((f) => f.endsWith(`.${ext}`)).sort();
if (!lgFiles.length) die("No frames were written.");
let width = sizes.lg;
let height = Math.round((sizes.lg * 9) / 16);
if (sharp) {
  const meta = await sharp(path.join(out, "lg", lgFiles[0])).metadata();
  width = meta.width;
  height = meta.height;
} else if (probe.streams?.[0]) {
  const s = probe.streams[0];
  const rot = Math.abs(Number(s.side_data_list?.[0]?.rotation ?? 0)) === 90;
  const [vw, vh] = rot ? [s.height, s.width] : [s.width, s.height];
  width = sizes.lg;
  height = Math.round((sizes.lg * vh) / vw / 2) * 2;
}

for (const k of Object.keys(sizes)) {
  const n = fs.readdirSync(path.join(out, k)).filter((f) => f.endsWith(`.${ext}`)).length;
  if (n !== lgFiles.length) die(`Size "${k}" has ${n} frames but lg has ${lgFiles.length}`);
}

const manifest = {
  version: 1,
  frameCount: lgFiles.length,
  fps: Number((lgFiles.length / clip).toFixed(6)),
  start,
  duration: Number(clip.toFixed(3)),
  width,
  height,
  ext,
  pad: 4,
  sizes,
  source: path.basename(video),
};
fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const mb = (dir) => fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0) / 1e6;
console.log(`✓ ${manifest.frameCount} frames · ${width}×${height}`);
for (const k of Object.keys(sizes)) console.log(`  ${k.padEnd(3)} ${mb(path.join(out, k)).toFixed(1).padStart(6)} MB  ${path.relative(process.cwd(), path.join(out, k))}/`);
const publicIdx = out.split(path.sep).lastIndexOf("public");
const urlPath =
  publicIdx >= 0
    ? "/" + out.split(path.sep).slice(publicIdx + 1).join("/")
    : "/" + path.relative(process.cwd(), out).split(path.sep).join("/");
console.log(`\nUse it:\n  <scroll-frames src="${urlPath}" debug></scroll-frames>\n  <ScrollFrames src="${urlPath}" debug />`);
