import { createScrollFrames, type Mode, type Options, type ScrollFramesInstance } from "./index";

/**
 * <scroll-frames src="/frames/house" mode="pin" length="6">
 *   <h2 data-from="0:04" data-to="0:09">Welcome home</h2>
 * </scroll-frames>
 */
export class ScrollFramesElement extends HTMLElement {
  static observedAttributes = ["src", "mode", "length", "top", "fit", "position", "smooth", "debug"];
  instance: ScrollFramesInstance | null = null;
  private queued = false;

  connectedCallback() {
    this.mount();
  }

  disconnectedCallback() {
    this.instance?.destroy();
    this.instance = null;
  }

  attributeChangedCallback() {
    if (!this.isConnected || !this.instance || this.queued) return;
    // Batch attribute changes into one remount.
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      this.instance?.destroy();
      this.mount();
    });
  }

  private mount() {
    const src = this.getAttribute("src");
    if (!src) return;
    const num = (n: string) => (this.hasAttribute(n) ? Number(this.getAttribute(n)) : undefined);
    const opts: Options = {
      src,
      mode: (this.getAttribute("mode") as Mode) ?? undefined,
      length: num("length"),
      top: num("top"),
      fit: (this.getAttribute("fit") as Options["fit"]) ?? undefined,
      position: this.getAttribute("position") ?? undefined,
      smooth: num("smooth"),
      debug: this.hasAttribute("debug"),
    };
    this.instance = createScrollFrames(this, opts);
  }

  seek(t: string | number, behavior?: ScrollBehavior) {
    this.instance?.seek(t, behavior);
  }
  play(o?: { to?: string | number; duration?: number }) {
    this.instance?.play(o);
  }
  pause() {
    this.instance?.pause();
  }
}

if (typeof window !== "undefined" && !customElements.get("scroll-frames")) {
  customElements.define("scroll-frames", ScrollFramesElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "scroll-frames": ScrollFramesElement;
  }
}
