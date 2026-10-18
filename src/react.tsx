import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { createScrollFrames, type Options, type ProgressDetail, type ScrollFramesInstance } from "./index";

export type ScrollFramesProps = Options & {
  className?: string;
  style?: CSSProperties;
  /** Overlay content. Use data-from / data-to / data-at on children for timed text. */
  children?: ReactNode;
  onReady?: (api: ScrollFramesInstance) => void;
  onProgress?: (d: ProgressDetail) => void;
  onCue?: (d: { el: HTMLElement; active: boolean }) => void;
};

/**
 * <ScrollFrames src="/frames/house" mode="pin" length={6}>
 *   <h2 data-from="0:04" data-to="0:09">Welcome home</h2>
 * </ScrollFrames>
 */
export function ScrollFrames({ className, style, children, onReady, onProgress, onCue, ...opts }: ScrollFramesProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cb = useRef({ onReady, onProgress, onCue });
  useEffect(() => {
    cb.current = { onReady, onProgress, onCue };
  });

  const { src, mode, length, top, fit, position, smooth, debug, manifest } = opts;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const api = createScrollFrames(host, { src, mode, length, top, fit, position, smooth, debug, manifest });
    const prog = (e: Event) => cb.current.onProgress?.((e as CustomEvent<ProgressDetail>).detail);
    const cue = (e: Event) => cb.current.onCue?.((e as CustomEvent<{ el: HTMLElement; active: boolean }>).detail);
    const ready = () => cb.current.onReady?.(api);
    host.addEventListener("sf:progress", prog);
    host.addEventListener("sf:cue", cue);
    host.addEventListener("sf:ready", ready);
    return () => {
      host.removeEventListener("sf:progress", prog);
      host.removeEventListener("sf:cue", cue);
      host.removeEventListener("sf:ready", ready);
      api.destroy();
    };
  }, [src, mode, length, top, fit, position, smooth, debug, manifest]);

  // Structure is rendered here (not created by the core) so React keeps ownership of children.
  return (
    <div
      ref={hostRef}
      className={className}
      style={style}
      data-sf-host=""
      data-sf-mode={mode ?? "pin"}
    >
      <div data-sf-stage="">
        <canvas data-sf-canvas="" />
        <div data-sf-overlay="">{children}</div>
      </div>
    </div>
  );
}

export type { Manifest, Options, ProgressDetail, ScrollFramesInstance } from "./index";
export { formatTime, parseTime, toProgress } from "./index";
