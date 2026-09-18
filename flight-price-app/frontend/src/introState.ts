import * as THREE from "three";

/** Module-level intro timeline state, shared between the R3F scene and the overlay.
 *  Mutated inside rAF/useFrame (no React re-renders per frame). */
export const INTRO_DURATION = 6.9;

export const introState = {
  /** Seconds elapsed since the intro began. */
  t: 0,
  /** True while the cinematic sequence is playing. */
  active: true,
  /** True once the intro has finished (or was skipped). */
  done: false,
  /** Live aircraft world position, written by the aircraft, read by the camera rig. */
  aircraftPos: new THREE.Vector3(-30, 2, -60),
  /** Normalized mouse position (-1..1), desktop parallax only. */
  mouse: { x: 0, y: 0 },
};

export function resetIntro() {
  introState.t = 0;
  introState.active = true;
  introState.done = false;
}

export function skipIntro() {
  introState.t = INTRO_DURATION;
  introState.active = false;
  introState.done = true;
}

/** Normalized aircraft flight progress through the intro (0..1), eased. */
export function introProgress(t: number): number {
  const raw = Math.min(1, Math.max(0, (t - 1.4) / 4.4));
  // easeInOutCubic
  return raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
