/**
 * Small, cheap GLSL materials used across the 3D scenes.
 * Three custom shaders:
 *   1. rimGlowMaterial    — fresnel rim light for fuselage / markers
 *   2. makeArcMaterial    — animated glowing route-arc trail
 *   3. makeAtmosphereMaterial — atmospheric fog gradient dome
 * All are unlit or cheap-lit; no per-frame texture uploads.
 */

import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* 1 — Fresnel rim glow                                                */
/* ------------------------------------------------------------------ */

const RIM_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const RIM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uBaseColor;
  uniform float uPower;
  uniform float uIntensity;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float fres = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), uPower);
    vec3 col = uBaseColor + uColor * fres * uIntensity;
    gl_FragColor = vec4(col, uOpacity);
  }
`;

/**
 * Blue fresnel rim material — gives the fuselage its cinematic rim light and
 * city markers their glowing edge. Cheap: no lights, no textures.
 */
export function makeRimGlowMaterial(opts?: {
  color?: THREE.ColorRepresentation;
  baseColor?: THREE.ColorRepresentation;
  power?: number;
  intensity?: number;
  opacity?: number;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: RIM_VERT,
    fragmentShader: RIM_FRAG,
    uniforms: {
      uColor: { value: new THREE.Color(opts?.color ?? "#66b8ff") },
      uBaseColor: { value: new THREE.Color(opts?.baseColor ?? "#0a1626") },
      uPower: { value: opts?.power ?? 2.4 },
      uIntensity: { value: opts?.intensity ?? 1.5 },
      uOpacity: { value: opts?.opacity ?? 1.0 },
    },
    transparent: (opts?.opacity ?? 1.0) < 1,
  });
}

/* ------------------------------------------------------------------ */
/* 2 — Route arc trail                                                 */
/* ------------------------------------------------------------------ */

const ARC_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ARC_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uOffset;
  uniform float uSpeed;
  uniform float uActive;
  varying vec2 vUv;
  void main() {
    // Base soft line, tapered at both ends.
    float core = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);

    // Traveling pulse along the arc (texture-offset style, but pure math).
    float pulse = fract(vUv.x - uOffset * uSpeed);
    pulse = smoothstep(0.0, 0.35, pulse) * smoothstep(0.75, 0.35, pulse);

    float alpha = core * (0.22 + pulse * 0.9 * uActive);
    vec3 col = uColor * (0.75 + pulse * 1.6 * uActive);
    gl_FragColor = vec4(col, alpha * uOpacity);
  }
`;

/** Glowing animated arc material. `active` brightens the selected route. */
export function makeArcMaterial(color: THREE.ColorRepresentation = "#4d8dff"): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: ARC_VERT,
    fragmentShader: ARC_FRAG,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 1 },
      uOffset: { value: 0 },
      uSpeed: { value: 0.25 },
      uActive: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Advance the traveling pulse. Call from useFrame with a shared clock. */
export function tickArcMaterial(mat: THREE.ShaderMaterial, delta: number) {
  mat.uniforms.uOffset.value =
    (mat.uniforms.uOffset.value + delta) % 1000;
}

/* ------------------------------------------------------------------ */
/* 3 — Atmospheric gradient dome                                       */
/* ------------------------------------------------------------------ */

const SKY_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  varying vec3 vWorld;
  void main() {
    float h = clamp(vWorld.y * 0.5 + 0.5, 0.0, 1.0);
    // Deep space above, faint blue haze at the horizon, near-black below.
    vec3 col = h > 0.5
      ? mix(uHorizon, uTop, smoothstep(0.5, 1.0, h))
      : mix(uBottom, uHorizon, smoothstep(0.0, 0.5, h));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Large inverted sphere providing the atmospheric backdrop gradient. */
export function makeAtmosphereMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: {
      uTop: { value: new THREE.Color("#020409") },
      uHorizon: { value: new THREE.Color("#0a1a33") },
      uBottom: { value: new THREE.Color("#010204") },
    },
    side: THREE.BackSide,
    depthWrite: false,
  });
}
