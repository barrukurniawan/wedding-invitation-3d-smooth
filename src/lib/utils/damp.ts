// Frame-rate-independent exponential smoothing helpers.
// `lambda` is the smoothing rate: higher = snappier.
// `damp` reaches ~63% of the target after `1/lambda` seconds.

export function damp(current: number, target: number, lambda: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * delta))
}

// Shortest-path angular damping (radians). Wraps across +/-PI so rotation
// always takes the shortest turn toward the target angle.
export function dampAngle(current: number, target: number, lambda: number, delta: number): number {
  let diff = (target - current) % (Math.PI * 2)
  if (diff > Math.PI) diff -= Math.PI * 2
  else if (diff < -Math.PI) diff += Math.PI * 2
  return current + diff * (1 - Math.exp(-lambda * delta))
}
