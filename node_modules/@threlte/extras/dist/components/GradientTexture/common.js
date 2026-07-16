/**
 * adds each `stop` of `stops` to the gradient
 */
export const addStops = (gradient, stops = []) => {
    for (const { color, offset } of stops) {
        gradient.addColorStop(offset, color);
    }
    return gradient;
};
