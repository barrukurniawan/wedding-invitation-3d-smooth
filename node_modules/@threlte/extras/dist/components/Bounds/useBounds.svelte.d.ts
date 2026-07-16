import { Group } from 'three';
export interface BoundsContext {
    reset(): void;
    fit(): void;
}
export declare const provideBounds: (ref: () => Group, margin: () => number, animate: () => boolean, onFit: () => (() => void) | undefined) => BoundsContext;
export declare const useBounds: () => BoundsContext;
