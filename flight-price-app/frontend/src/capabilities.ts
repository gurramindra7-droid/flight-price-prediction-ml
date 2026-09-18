/**
 * Lightweight capability / performance detector.
 *
 * Decides how heavy the 3D experience may be on this device. Deliberately
 * heuristic — a tiny render probe plus UA signals — no heavyweight GPU-tier
 * libraries. Runs once on load and is safe on browsers without WebGL.
 */

export type QualityTier = "high" | "medium" | "low";

export interface Capabilities {
  webgl: boolean;
  reducedMotion: boolean;
  /** Coarse pointer + small viewport ≈ phone: trim particle counts & post. */
  mobile: boolean;
  /** Device memory in GB when reported (0 = unknown). */
  memoryGB: number;
  /** CPU threads when reported (0 = unknown). */
  cores: number;
  renderer: string;
  tier: QualityTier;
}

let cached: Capabilities | null = null;

function probeWebGL(): { ok: boolean; renderer: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ??
      (canvas.getContext("webgl") as WebGLRenderingContext | null);
    if (!gl) return { ok: false, renderer: "none" };

    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    let renderer = "generic";
    if (dbg) {
      renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? renderer);
    }
    // Angle = software rasterizer (no GPU).
    const software = /swiftshader|software|basic render/i.test(renderer);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { ok: !software, renderer };
  } catch {
    return { ok: false, renderer: "none" };
  }
}

/** Cheap GPU heuristic: fill a small buffer and time the frame. */
function gpuProbeScore(): number {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const gl = canvas.getContext("webgl2");
    if (!gl) return 1;

    const start = performance.now();
    const prog = gl.createProgram();
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}");
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    // A modest loop — enough to separate iGPUs from modern discrete GPUs.
    gl.shaderSource(
      fs,
      "precision mediump float;void main(){vec3 c=vec3(0.);for(int i=0;i<32;i++){c+=vec3(float(i)*0.001);}gl_FragColor=vec4(c,1.);}",
    );
    gl.compileShader(fs);
    gl.attachShader(prog!, vs);
    gl.attachShader(prog!, fs);
    gl.linkProgram(prog!);
    gl.useProgram(prog!);
    for (let i = 0; i < 20; i++) gl.drawArrays(gl.TRIANGLES, 0, 3);
    const elapsed = performance.now() - start;

    gl.getExtension("WEBGL_lose_context")?.loseContext();
    // <4ms very fast · <12ms capable · slower = weak
    if (elapsed < 4) return 3;
    if (elapsed < 12) return 2;
    return 1;
  } catch {
    return 1;
  }
}

export function getCapabilities(): Capabilities {
  if (cached) return cached;

  const { ok, renderer } = probeWebGL();
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  const memoryGB = (nav as { deviceMemory?: number }).deviceMemory ?? 0;
  const cores = nav.hardwareConcurrency ?? 0;
  const mobile =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches &&
    Math.min(window.innerWidth, window.innerHeight) < 820;

  let score = 0;
  if (ok && !reducedMotion) {
    score += gpuProbeScore() * 2; // 2 / 4 / 6
    if (!mobile) score += 1;
    if (memoryGB >= 8) score += 1;
    else if (memoryGB >= 4) score += 0.5;
    if (cores >= 8) score += 1;
    else if (cores >= 4) score += 0.5;
  }

  let tier: QualityTier = "low";
  if (score >= 7.5) tier = "high";
  else if (score >= 4.5) tier = "medium";

  cached = {
    webgl: ok,
    reducedMotion,
    mobile,
    memoryGB,
    cores,
    renderer,
    tier: ok ? tier : "low",
  };
  return cached;
}

/** Derived quality knobs consumed by the 3D scenes. */
export interface SceneQuality {
  particles: number;
  postprocessing: boolean;
  depthOfField: boolean;
  dpr: [number, number];
  antialias: boolean;
  mapSegments: number;
  arcParticles: number;
}

export function sceneQuality(cap: Capabilities): SceneQuality {
  if (cap.tier === "high") {
    return {
      particles: 1600,
      postprocessing: true,
      depthOfField: true,
      dpr: [1, 1.75],
      antialias: false, // postprocessing pipeline handles AA perception
      mapSegments: 96,
      arcParticles: 14,
    };
  }
  if (cap.tier === "medium") {
    return {
      particles: 700,
      postprocessing: true,
      depthOfField: false,
      dpr: [1, 1.4],
      antialias: true,
      mapSegments: 64,
      arcParticles: 8,
    };
  }
  return {
    particles: 240,
    postprocessing: false,
    depthOfField: false,
    dpr: [1, 1.1],
    antialias: true,
    mapSegments: 36,
    arcParticles: 0,
  };
}
