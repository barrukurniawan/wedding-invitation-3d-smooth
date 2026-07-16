import type { BoundsProps } from './types.js';
declare const Bounds: import("svelte").Component<BoundsProps, {
    bounds: import("./useBounds.svelte.js").BoundsContext;
    fit: () => void;
    reset: () => void;
}, "ref">;
type Bounds = ReturnType<typeof Bounds>;
export default Bounds;
