import * as react from 'react';
import { CSSProperties, ReactNode } from 'react';

/**
 * scroll-frames — scroll-scrubbed image sequences for any element.
 * Framework-agnostic core. Safe to import on the server (touches no globals at import time).
 */
type Manifest = {
    version: number;
    frameCount: number;
    /** Frames per second of the extracted sequence (relative to the source video). */
    fps: number;
    /** Trim start in the source video, seconds. Timestamps in cues are source-video time. */
    start: number;
    /** Length of the extracted clip, seconds. */
    duration: number;
    width: number;
    height: number;
    ext: "webp" | "jpg";
    /** Zero-padding of file names (4 → 0001.webp). */
    pad: number;
    /** Available sizes: folder name → pixel width. "lg" is required. */
    sizes: Record<string, number>;
};
type Mode = "pin" | "inline";
type Options = {
    /** Folder URL that contains manifest.json (e.g. "/frames/house" or a CDN URL). */
    src: string;
    /** "pin": element becomes a tall scroll track with a sticky stage. "inline": scrubs while the element passes the viewport. */
    mode?: Mode;
    /** pin mode: scroll length in screen heights (default 5). */
    length?: number;
    /** pin mode: distance from the top of the viewport where the stage sticks, px (e.g. a fixed header height). */
    top?: number;
    /** "cover" (default) fills the stage and crops; "contain" letterboxes. */
    fit?: "cover" | "contain";
    /** Focal point for cropping, like CSS object-position ("50% 50%"). Useful on portrait phones. */
    position?: string;
    /** 0 = frame snaps to scroll, 0.9 = very smooth/lagging. Default 0.15. */
    smooth?: number;
    /** Show the frame/time readout. Also enabled by ?sf-debug in the URL. */
    debug?: boolean;
    /** Supply the manifest directly instead of fetching `${src}/manifest.json`. */
    manifest?: Manifest;
};
type ProgressDetail = {
    progress: number;
    frame: number;
    time: number;
};
type ScrollFramesInstance = {
    readonly host: HTMLElement;
    readonly manifest: Manifest | null;
    readonly progress: number;
    readonly frame: number;
    readonly time: number;
    /** Scroll the page so the sequence shows timestamp `t` ("1:04.5", 64.5 or "40%"). */
    seek(t: string | number, behavior?: ScrollBehavior): void;
    /** Auto-scroll from the current position to `to` (default: end) over `duration` seconds (default: real time). */
    play(opts?: {
        to?: string | number;
        duration?: number;
    }): void;
    pause(): void;
    /** Re-scan cue elements and re-measure. Call after changing children manually. */
    refresh(): void;
    destroy(): void;
};
declare function parseTime(t: string | number): number;
declare function formatTime(sec: number): string;
/** Converts "1:04.5" | 64.5 | "40%" to progress 0..1 for a manifest. */
declare function toProgress(t: string | number, m: Manifest): number;

type ScrollFramesProps = Options & {
    className?: string;
    style?: CSSProperties;
    /** Overlay content. Use data-from / data-to / data-at on children for timed text. */
    children?: ReactNode;
    onReady?: (api: ScrollFramesInstance) => void;
    onProgress?: (d: ProgressDetail) => void;
    onCue?: (d: {
        el: HTMLElement;
        active: boolean;
    }) => void;
};
/**
 * <ScrollFrames src="/frames/house" mode="pin" length={6}>
 *   <h2 data-from="0:04" data-to="0:09">Welcome home</h2>
 * </ScrollFrames>
 */
declare function ScrollFrames({ className, style, children, onReady, onProgress, onCue, ...opts }: ScrollFramesProps): react.JSX.Element;

export { type Manifest, type Options, type ProgressDetail, ScrollFrames, type ScrollFramesInstance, type ScrollFramesProps, formatTime, parseTime, toProgress };
