# scroll-frames

Scroll-scrubbed image sequences for **any element on any site**. Turn a video into frames with one command, drop a tag in a div, and add text that appears at specific timestamps.

- **Web component** `<scroll-frames>` — plain HTML, Webflow, WordPress, Framer, Shopify, anything
- **React component** `<ScrollFrames>` — Next.js / React
- **CLI** `scroll-frames extract video.mp4` — video → optimized frames + `manifest.json`
- ~5 KB gzipped, zero dependencies, MIT licensed (free forever, it's yours)

---

## Contents

1. [How it works](#how-it-works)
2. [Add it to a new project](#add-it-to-a-new-project)
3. [Timed text (cues)](#timed-text-cues)
4. [Options](#options)
5. [Lining up timestamps (debug mode)](#lining-up-timestamps-debug-mode)
6. [Custom animations, events & JS API](#custom-animations-events--js-api)
7. [Mobile](#mobile)
8. [Hosting the frames](#hosting-the-frames)
9. [Sharing this package across your projects](#sharing-this-package-across-your-projects)
10. [Troubleshooting](#troubleshooting)

---

## How it works

```
video.mp4 ──(CLI: ffmpeg)──▶ frames/house/
                              ├─ manifest.json   ← frame count, fps, size, trim
                              ├─ lg/0001.webp …  ← desktop (1920px)
                              └─ sm/0001.webp …  ← phones  (900px)

<scroll-frames src="/frames/house">  ──fetch manifest──▶ load frames ──▶ draw to <canvas>
```

1. **Frames, not video.** Browsers can't seek a `<video>` smoothly on scroll (especially iOS). Still images drawn to a `<canvas>` can be swapped instantly, so scrubbing is buttery in both directions.
2. **Scroll → progress → frame.** The component measures how far you've scrolled through it (0 → 1) and draws frame `round(progress × (frameCount − 1))`.
3. **Two modes**
   - `pin` — the element becomes a tall scroll track (`length` screens tall) with a **sticky** stage inside. The stage stays on screen while you scroll through the whole sequence. (Hero "walkthrough" effect.)
   - `inline` — a normal box (16:9 by default) that scrubs while it passes through the viewport. No pinning.
4. **Timestamps.** The manifest stores the fps and trim, so anywhere you write `"0:14.5"` it's converted to the exact frame. Timestamps are always **times in your original video** — read them off QuickTime/Premiere/CapCut.
5. **Smart loading.** Frame 1 shows immediately. The rest load only when the element is near the screen, coarse-to-fine (every 32nd frame, then every 16th, …), so scrubbing works within a second while the gaps fill in. Phones get the small set.

---

## Add it to a new project

### Step 1 — install (once per project)

See [Sharing this package](#sharing-this-package-across-your-projects) for the install source. Using GitHub:

```bash
npm i github:YOUR-GITHUB/scroll-frames
npm i -D sharp          # optional: lets the CLI make WebP even if your ffmpeg can't
```

You also need **ffmpeg** on your computer (not on the server): `brew install ffmpeg` (Mac) or `winget install ffmpeg` (Windows).

### Step 2 — make frames from your video

From the project root:

```bash
npx scroll-frames extract ~/Videos/house.mp4
```

That writes `public/frames/house/`. Common options:

```bash
npx scroll-frames extract house.mp4 \
  --out public/frames/lake-house \   # where to write
  --frames 600 \                     # how many frames (or --fps 12)
  --start 0:03 --end 1:42 \          # trim the source
  --sizes lg:1920,sm:900 \           # sizes to export
  --quality 72
```

> **How many frames?** 400–700 for a full-screen hero walkthrough, 120–250 for a small inline clip. More frames = smoother but heavier. Rough size: ~60–120 KB per 1920px WebP frame.

### Step 3 — put it on the page

**Plain HTML / Webflow / WordPress** (add the script once, e.g. in the site `<head>`):

```html
<script src="https://cdn.jsdelivr.net/gh/YOUR-GITHUB/scroll-frames@v0.1.0/dist/scroll-frames.global.js" defer></script>

<scroll-frames src="/frames/house" mode="pin" length="6">
  <h2 data-at="0:00">Exterior</h2>
  <h2 data-at="0:14">Foyer</h2>
  <h2 data-at="0:31">Kitchen</h2>
</scroll-frames>
```

**Next.js / React:**

```tsx
import { ScrollFrames } from "scroll-frames/react";

export default function Hero() {
  return (
    <ScrollFrames src="/frames/house" mode="pin" length={6}>
      <h2 className="room" data-at="0:00">Exterior</h2>
      <h2 className="room" data-at="0:14">Foyer</h2>
      <h2 className="room" data-at="0:31">Kitchen</h2>
    </ScrollFrames>
  );
}
```

`scroll-frames/react` already includes `"use client"`, so you can use it straight from a server component/page.

**Vue / Svelte / Astro / anything with a bundler:** `import "scroll-frames/element"` once, then use the `<scroll-frames>` tag in your templates.

Everything you put **inside** the component is an overlay on top of the frames (absolutely positioned layer, full size). Style it however you like.

### Step 4 — line up the text

Open the page with `?sf-debug` and read off the timestamps. See [debug mode](#lining-up-timestamps-debug-mode).

---

## Timed text (cues)

Any element inside the component can be shown/hidden by time. Times can be `"m:ss.s"`, seconds (`"14.5"`), or a percentage of the sequence (`"40%"`).

| Attribute | Meaning |
|---|---|
| `data-from="0:12"` | visible from 0:12 … |
| `data-to="0:18"` | … until 0:18 (omit = until the end) |
| `data-at="0:12"` | **chapter**: visible from 0:12 until the next `data-at` sibling starts. Perfect for room names. |
| `data-anim="up"` | default: fade + slide up 16px |
| `data-anim="fade"` | fade only |
| `data-anim="none"` | instant show/hide |
| `data-anim="manual"` | the library only toggles `data-active`; you write all the CSS |

```html
<scroll-frames src="/frames/house">
  <!-- one-off text -->
  <p class="intro" data-from="0:00" data-to="0:05">Scroll to tour the home</p>

  <!-- chapters: the room label swaps automatically -->
  <div class="room-label">
    <span data-at="0:00">Exterior</span>
    <span data-at="0:14.2">Foyer</span>
    <span data-at="0:31">Kitchen</span>
  </div>

  <!-- a stat that only appears in the kitchen, fades only -->
  <p class="stat" data-from="0:31" data-to="0:40" data-anim="fade">Quartz counters · 2023 remodel</p>
</scroll-frames>
```

Tip: stack chapter labels on top of each other with CSS grid so they cross-fade in place:

```css
.room-label { display: grid; }
.room-label > * { grid-area: 1 / 1; }
```

Tune the default animation with CSS variables on any element/ancestor: `--sf-dur: .6s; --sf-shift: 30px;`.

**Buttons inside the overlay**

```html
<button data-sf-play>▶ Play tour</button>          <!-- auto-scrolls to the end in real time; click again to stop -->
<button data-sf-play="0:40">Play to kitchen</button>
<button data-sf-seek="0:31">Jump to kitchen</button>
```

While playing, the host has a `data-sf-playing` attribute (style the button: `[data-sf-playing] .play { … }`). Scrolling/touching cancels playback.

Overlay content ignores pointer events by default (so it doesn't block scrolling) — except `a`, `button`, `input`, and anything with `data-sf-interactive`.

---

## Options

| Web component attribute | React prop | Default | |
|---|---|---|---|
| `src` | `src` | — | **required** folder containing `manifest.json` |
| `mode` | `mode` | `"pin"` | `"pin"` or `"inline"` |
| `length` | `length` | `5` | pin: scroll distance in screen heights. Bigger = slower scrub |
| `top` | `top` | `0` | pin: px from top where the stage sticks (fixed header height) |
| `fit` | `fit` | `"cover"` | `"cover"` (crop to fill) or `"contain"` (letterbox) |
| `position` | `position` | `"50% 50%"` | crop focal point, like `object-position` |
| `smooth` | `smooth` | `0.15` | 0 = snap to scroll, 0.5+ = floaty easing |
| `debug` | `debug` | off | frame/time readout (also `?sf-debug` in the URL) |
| — | `manifest` | — | pass the manifest object to skip the fetch |
| — | `onProgress`, `onCue`, `onReady` | — | callbacks (see below) |

CSS hooks: `--sf-bg` (stage background), `--sf-stage-height` (pin stage height, default `100svh`), `--sf-aspect` (inline aspect ratio, defaults to the video's).

Sizing:
- **pin** — width is whatever the parent gives it; height = `length × 100svh`. Works in any width container.
- **inline** — set a width (and optionally height) like any div. Without a height it uses the video's aspect ratio.

---

## Lining up timestamps (debug mode)

1. Open your page with `?sf-debug` (e.g. `http://localhost:3000/?sf-debug`), or add the `debug` attribute/prop.
2. A box shows **FRAME**, **TIME** and progress for every scroll-frames element.
3. Scroll to where a room begins. Fine-tune with the keyboard:
   - `[` / `]` → one frame back / forward
   - `Shift + [` / `Shift + ]` → 10 frames
   - `C` → copy the current timestamp (e.g. `"0:14.25"`) to the clipboard
4. Paste it into `data-at` / `data-from`.

Because cues use **source-video time**, you can re-export with a different `--frames` count or `--sizes` and your timestamps stay correct. If you change `--start`, they also stay correct (they're absolute times in the original file).

---

## Custom animations, events & JS API

**CSS variables** (updated every frame) — animate anything without JS:

| Variable | On | Value |
|---|---|---|
| `--sf-progress` | host | 0 → 1 through the whole sequence |
| `--sf-time` | host | current source-video time in seconds |
| `--sf-cue` | each active cue | 0 → 1 through that cue's own time range |

```css
/* progress bar */
.bar { position:absolute; left:0; bottom:0; height:3px; width:calc(var(--sf-progress) * 100%); background:#f40; }

/* text that slides across during its own range */
.tagline { translate: calc((1 - var(--sf-cue, 0)) * 40px) 0; }
```

**Events** (on the host element; React has `onProgress` / `onCue` / `onReady`):

| Event | `detail` |
|---|---|
| `sf:ready` | `{ manifest }` |
| `sf:progress` | `{ progress, frame, time }` |
| `sf:cue` | `{ el, active }` |
| `sf:load` | `{ loaded, total }` (frames downloaded) |
| `sf:error` | `{ error }` |

```js
const el = document.querySelector("scroll-frames");
el.addEventListener("sf:cue", (e) => { if (e.detail.active) analytics.track("room", e.detail.el.textContent); });
el.seek("0:31");            // scroll to a time
el.play({ to: "0:40" });    // auto-scroll
el.pause();
```

**Vanilla JS without the custom element** (e.g. wire it to an existing div):

```js
import { createScrollFrames } from "scroll-frames";
const api = createScrollFrames(document.querySelector("#hero"), { src: "/frames/house", mode: "pin", length: 6 });
// api.seek / api.play / api.pause / api.progress / api.time / api.destroy()
```

Children of `#hero` become the overlay.

---

## Mobile

Built in — nothing to configure:

- **Right-sized frames.** Picks the smallest size set that's sharp enough for the element's width × pixel ratio. A phone downloads `sm/` (~half the data); desktop gets `lg/`.
- **Stable on iOS/Android URL bars.** Uses `svh` units so the pinned stage doesn't jump when the address bar shows/hides; tiny height changes don't trigger redraws.
- **Lazy + polite loading.** Nothing loads until the element is within one screen of view. Lower concurrency on touch devices. On Data Saver / 2G / 3G only every other frame is fetched.
- **Canvas resolution capped at 2× DPR** (3× phones don't render 9× the pixels).
- **Native scrolling.** No scroll hijacking — momentum scrolling works normally; `smooth` easing hides the frame steps.
- **Reduced motion** respected (no easing/slide animations).

Your part:
- **Portrait crop.** A 16:9 video on a portrait phone is cropped to the center. If the subject is off-center, set `position="35% 50%"`. Or export a separate vertical video and switch `src` by screen size (React: pick `src` with a media query; HTML: two elements toggled with CSS media queries — a `display:none` one only loads its first frame).
- Keep overlay text sizes responsive (`clamp()`), and keep tap targets ≥ 44px.

---

## Hosting the frames

Frames are static files. Options, simplest first:

| Where | Cost | Notes |
|---|---|---|
| Your site's `public/` folder (Vercel/Netlify) | free tier | Easiest. Fine for most sites. Each frame set is ~30–80 MB; commits get big. |
| Cloudflare R2 | free up to 10 GB, **no bandwidth fees** | Best for many/large sites. Point `src` at the bucket URL. |
| Vercel Blob / S3 / Bunny CDN | pay-as-you-go | Use if you're already there. |

For a CDN host, upload the whole folder (with `manifest.json`) and set `src="https://cdn.example.com/frames/house"`. The bucket must allow CORS `GET` from your site (for `manifest.json`).

**Webflow / no-code:** upload the frame folder to R2 (Webflow's asset manager can't do folders), add the `<script>` in *Site settings → Custom code → Head*, and use an *Embed* element for `<scroll-frames>`.

---

## Sharing this package across your projects

Pick one:

**A. GitHub (recommended, free, private OK)**
1. Create a repo `scroll-frames` and push this folder (the built `dist/` is committed on purpose).
2. Tag versions: `git tag v0.1.0 && git push --tags`.
3. In any project: `npm i github:YOUR-GITHUB/scroll-frames#v0.1.0`
4. Script-tag sites (public repos only): `https://cdn.jsdelivr.net/gh/YOUR-GITHUB/scroll-frames@v0.1.0/dist/scroll-frames.global.js`

**B. npm (free for public packages)**
`npm publish --access public` (rename to `@your-name/scroll-frames` in `package.json` first). Then `npm i @your-name/scroll-frames` anywhere, and the CDN URL is `https://cdn.jsdelivr.net/npm/@your-name/scroll-frames`.

**C. Copy one file** (no-code sites, zero setup)
Copy `dist/scroll-frames.global.js` into the site's assets and reference it with a `<script>` tag.

> Local folder installs (`npm i ../scroll-frames`) create a symlink that **Next.js/Turbopack can't follow**. Use GitHub, npm, or `npm pack` + install the `.tgz` instead.

**Making changes to the package**

```bash
cd scroll-frames
# edit src/…
npm run build             # rebuild dist/
npm run example           # http://localhost:5173 — demo page (make frames first, see below)
git commit -am "…" && git tag v0.1.1 && git push --tags
# in a site: npm i github:YOUR-GITHUB/scroll-frames#v0.1.1
```

Demo frames for the example page:
`node bin/scroll-frames.mjs extract any-video.mp4 --out examples/frames/demo --frames 240`

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Black box, console says `couldn't load …/manifest.json` | Wrong `src`, or (CDN) missing CORS. Open `<src>/manifest.json` in the browser. |
| Pin mode doesn't stick | An ancestor has `overflow: hidden/auto/clip` or `transform`. Sticky needs a plain scrolling ancestor. |
| Pinned stage hides under a fixed header | `top="64"` (header height in px). |
| Text never appears | Check times with `?sf-debug`; `data-to` earlier than `data-from`; or your CSS sets `opacity`/`visibility` on it (use `data-anim="manual"` and style `[data-active]` yourself). |
| Choppy on first scroll | Normal for a moment while frames stream in. Reduce `--frames`, lower `--quality`, or put the element lower on the page so it preloads. |
| Overlay buttons not clickable | Add `data-sf-interactive` to custom clickable elements. |
| `Unknown encoder 'libwebp'` | Your ffmpeg lacks WebP. `npm i -D sharp` (CLI uses it automatically) or pass `--jpg`. |
| Scrub is too fast / slow | Change `length` (pin) or the section's height (inline). |
