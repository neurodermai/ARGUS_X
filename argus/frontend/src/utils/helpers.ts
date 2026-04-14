// ═══════════════════════════════════════════════════════════════════════
// ARGUS-X — Helper Utilities
// NOTE: randInt is used ONLY for visual animation (NeuralCanvas particle
// targeting), NOT for generating fake data or metrics.
// ═══════════════════════════════════════════════════════════════════════

let _uid = 0;

/** Generate a unique incrementing ID */
export function uid(): number {
  return ++_uid;
}

/** Random integer in [min, max] inclusive — used for visual animation only */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

