import * as THREE from "three";

/**
 * Module-level intro timeline state, shared between the R3F scene and the
 * overlay. Mutated inside rAF/useFrame (no React re-renders per frame).
 *
 * The cinematic camera path itself is scrubbed by a GSAP timeline (see
 * FlightScene.tsx) — this module only carries shared, frame-cheap values.
 */

/** Cinematic intro length in seconds — short enough that nobody needs a skip button. */
export const INTRO_DURATION = 5.2;

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
  /** GSAP-driven camera targets (the rig eases toward these every frame). */
  cameraTarget: { x: -6.5, y: 2.4, z: -2 },
  /** GSAP-driven look-at blend: 0 = track the aircraft, 1 = hero framing. */
  heroBlend: 0,
  /** 0..1 fade of the route-network bridge at the end of the intro. */
  networkReveal: 0,
};

/* --------------------------- session flag --------------------------- */

const SESSION_KEY = "fi:intro-seen";

/** True when the intro already played during this browser session. */
export function introSeenThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Private browsing — the intro simply replays next load.
  }
}

/* ------------------------------ helpers ------------------------------ */

export function resetIntro() {
  introState.t = 0;
  introState.active = true;
  introState.done = false;
  introState.cameraTarget = { x: -6.5, y: 2.4, z: -2 };
  introState.heroBlend = 0;
  introState.networkReveal = 0;
}

export function skipIntro() {
  introState.t = INTRO_DURATION;
  introState.active = false;
  introState.done = true;
  introState.cameraTarget = { x: 0, y: 1.9, z: 2.4 };
  introState.heroBlend = 1;
  introState.networkReveal = 1;
}

/** Normalized aircraft flight progress through the intro (0..1), eased. */
export function introProgress(t: number): number {
  const raw = Math.min(1, Math.max(0, (t - 1.0) / 3.6));
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
