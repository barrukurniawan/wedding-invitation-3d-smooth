import { CanvasTexture } from 'three';
/**
 * Creates a canvas-based trail texture that responds to pointer movement.
 * The texture renders a fading trail of points that can be used as a
 * displacement map, alpha map, or any other texture-driven effect.
 *
 * @example
 * ```svelte
 * <script>
 *   const { texture, onPointerMove } = useTrailTexture()
 * </script>
 *
 * <T.Mesh onpointermove={onPointerMove}>
 *   <T.PlaneGeometry />
 *   <T.MeshStandardMaterial displacementMap={texture} />
 * </T.Mesh>
 * ```
 */
export declare const useTrailTexture: (config?: () => {
    /** Texture resolution (default: 256) */
    size?: number;
    /** Max age (ms) of trail points (default: 750) */
    maxAge?: number;
    /** Trail radius (default: 0.3) */
    radius?: number;
    /** Canvas trail opacity (default: 0.2) */
    intensity?: number;
    /** Add interpolated points between sparse pointer events (default: 0) */
    interpolate?: number;
    /** Moving average smoothing factor for pointer force (default: 0) */
    smoothing?: number;
    /** Minimum pointer force (default: 0.3) */
    minForce?: number;
    /** Canvas blend mode (default: 'screen') */
    blend?: CanvasRenderingContext2D["globalCompositeOperation"];
    /** Easing function for intensity falloff (default: easeCircOut) */
    ease?: (t: number) => number;
} | undefined) => {
    texture: CanvasTexture;
    onPointerMove: (event: {
        uv?: {
            x: number;
            y: number;
        };
    }) => void;
    setTrail: (x: number, y: number) => void;
};
