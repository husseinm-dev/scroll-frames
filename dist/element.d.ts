import { ScrollFramesInstance } from './index.js';

/**
 * <scroll-frames src="/frames/house" mode="pin" length="6">
 *   <h2 data-from="0:04" data-to="0:09">Welcome home</h2>
 * </scroll-frames>
 */
declare class ScrollFramesElement extends HTMLElement {
    static observedAttributes: string[];
    instance: ScrollFramesInstance | null;
    private queued;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    private mount;
    seek(t: string | number, behavior?: ScrollBehavior): void;
    play(o?: {
        to?: string | number;
        duration?: number;
    }): void;
    pause(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        "scroll-frames": ScrollFramesElement;
    }
}

export { ScrollFramesElement };
