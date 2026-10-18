import {
  createScrollFrames
} from "./chunk-WX5F5MZW.js";

// src/element.ts
var ScrollFramesElement = class extends HTMLElement {
  constructor() {
    super(...arguments);
    this.instance = null;
    this.queued = false;
  }
  connectedCallback() {
    this.mount();
  }
  disconnectedCallback() {
    this.instance?.destroy();
    this.instance = null;
  }
  attributeChangedCallback() {
    if (!this.isConnected || !this.instance || this.queued) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      this.instance?.destroy();
      this.mount();
    });
  }
  mount() {
    const src = this.getAttribute("src");
    if (!src) return;
    const num = (n) => this.hasAttribute(n) ? Number(this.getAttribute(n)) : void 0;
    const opts = {
      src,
      mode: this.getAttribute("mode") ?? void 0,
      length: num("length"),
      top: num("top"),
      fit: this.getAttribute("fit") ?? void 0,
      position: this.getAttribute("position") ?? void 0,
      smooth: num("smooth"),
      debug: this.hasAttribute("debug")
    };
    this.instance = createScrollFrames(this, opts);
  }
  seek(t, behavior) {
    this.instance?.seek(t, behavior);
  }
  play(o) {
    this.instance?.play(o);
  }
  pause() {
    this.instance?.pause();
  }
};
ScrollFramesElement.observedAttributes = ["src", "mode", "length", "top", "fit", "position", "smooth", "debug"];
if (typeof window !== "undefined" && !customElements.get("scroll-frames")) {
  customElements.define("scroll-frames", ScrollFramesElement);
}
export {
  ScrollFramesElement
};
