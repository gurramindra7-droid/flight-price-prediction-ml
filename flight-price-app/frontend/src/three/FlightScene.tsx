import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Aircraft } from "./Aircraft";
import { introState, lerp, smoothstep } from "../introState";

/** Deterministic pseudo-random so layouts are stable across reloads. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------ particles ------------------------------ */

function AtmosphericParticles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);

  const { geometry, material, speeds } = useMemo(() => {
    const rand = mulberry32(42);
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (rand() - 0.5) * 46;
      positions[i * 3 + 1] = (rand() - 0.5) * 22;
      positions[i * 3 + 2] = (rand() - 0.5) * 40 - 6;
      speeds[i] = 0.35 + rand() * 0.9;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: "#8fb8e8",
      size: 0.055,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry, material, speeds };
  }, [count]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const pts = ref.current;
    if (!pts) return;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      // slow drift along +X like distant air traffic / dust in light
      arr[i * 3] += speeds[i] * delta * 0.55;
      if (arr[i * 3] > 23) arr[i * 3] = -23;
    }
    pos.needsUpdate = true;
    // fade particles slightly with mouse parallax
    pts.position.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.35;
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}

/* ------------------------------ clouds ------------------------------ */

function CloudPuffs({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);

  const puffs = useMemo(() => {
    const rand = mulberry32(7);
    const n = reduced ? 7 : 14;
    return Array.from({ length: n }, () => ({
      position: [
        (rand() - 0.5) * 40,
        (rand() - 0.2) * 12 + 2.5,
        -8 - rand() * 26,
      ] as [number, number, number],
      scale: 2.2 + rand() * 3.4,
      speed: 0.05 + rand() * 0.12,
    }));
  }, [reduced]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;
    g.children.forEach((child, i) => {
      child.position.x += puffs[i].speed * delta;
      if (child.position.x > 22) child.position.x = -22;
    });
  });

  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <sprite key={i} position={p.position} scale={[p.scale * 2.4, p.scale, 1]}>
          <spriteMaterial
            color="#22344e"
            transparent
            opacity={0.16}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}

/* --------------------------- runway lights --------------------------- */

function RunwayLights() {
  const lights = useMemo(() => {
    const arr: { pos: [number, number, number]; phase: number }[] = [];
    for (let i = 0; i < 26; i++) {
      arr.push({
        pos: [-18 + i * 1.45, -3.1, -14 + Math.sin(i * 0.42) * 0.7],
        phase: i * 0.55,
      });
    }
    return arr;
  }, []);

  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.children.forEach((child, i) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 + 0.82 * (0.5 + 0.5 * Math.sin(t * 2.2 - lights[i].phase));
    });
  });

  return (
    <group ref={group}>
      {lights.map((l, i) => (
        <mesh key={i} position={l.pos}>
          <sphereGeometry args={[0.035, 6, 6]} />
          <meshBasicMaterial color="#7fd3ff" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

const LOOK_PLANE = new THREE.Vector3(0, 1.4, -4.2);

/* --------------------------- camera rig --------------------------- */

function CameraRig({ reduced }: { reduced: boolean }) {
  const { camera } = useThree();
  const lookTarget = useMemo(() => new THREE.Vector3(0, 0.6, -6), []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = introState.t;
    const cam = camera as THREE.PerspectiveCamera;

    if (introState.done) {
      // Hero phase: hold framing, keep gentle mouse parallax alive.
      const bx = introState.mouse.x * 0.5;
      const by = 1.9 + introState.mouse.y * -0.3;
      cam.position.x = lerp(cam.position.x, bx, 1 - Math.pow(0.005, delta));
      cam.position.y = lerp(cam.position.y, by, 1 - Math.pow(0.005, delta));
      cam.position.z = lerp(cam.position.z, 2.4, 1 - Math.pow(0.005, delta));
      lookTarget.lerp(LOOK_PLANE, 0.1);
      cam.lookAt(lookTarget);
      return;
    }

    // Cinematic phase: sweep from the wide approach framing into the hero.
    const ax = -6.5, ay = 2.4, az = -2;
    const bx = 0, by = 1.9, bz = 2.4;
    const k = smoothstep(2.6, 5.4, t);
    let x = lerp(ax, bx, k);
    let y = lerp(ay, by, k);
    let z = lerp(az, bz, k);

    if (!reduced) {
      // gentle handheld drift, fading as we settle into the hero framing
      const wobble = 1 - k;
      x += Math.sin(t * 0.6) * 0.35 * wobble;
      y += Math.cos(t * 0.45) * 0.2 * wobble;
      x += introState.mouse.x * 0.5 * k;
      y += introState.mouse.y * -0.3 * k;
    }

    cam.position.x = lerp(cam.position.x, x, 1 - Math.pow(0.001, delta));
    cam.position.y = lerp(cam.position.y, y, 1 - Math.pow(0.001, delta));
    cam.position.z = lerp(cam.position.z, z, 1 - Math.pow(0.001, delta));

    // Track the aircraft during approach, then settle on the hero target.
    const target = k > 0.55 ? LOOK_PLANE : introState.aircraftPos;
    lookTarget.lerp(target, 0.1);
    cam.lookAt(lookTarget);
  });

  return null;
}

/* --------------------------- scene root --------------------------- */

export function FlightScene({ reduced = false }: { reduced?: boolean }) {
  const dpr: [number, number] = reduced ? [1, 1.2] : [1, 1.8];
  const particleCount = reduced ? 260 : 750;

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: !reduced, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: reduced ? 46 : 42, near: 0.1, far: 160, position: [-6.5, 2.4, -2] }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color("#05070d"), 0);
      }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <fog attach="fog" args={["#05070d", 12, 58]} />

      <Suspense fallback={null}>
        {/* Lighting: cool key light, warm-ish rim, soft fill */}
        <ambientLight intensity={0.35} color="#3b4a66" />
        <directionalLight position={[6, 8, 4]} intensity={1.5} color="#bfd6f5" />
        <directionalLight position={[-8, 3, -6]} intensity={0.7} color="#3f6fb5" />
        <pointLight position={[0, 1.4, 2]} intensity={0.35} color="#6ea8ff" />

        <Aircraft reduced={reduced} />
        <AtmosphericParticles count={particleCount} />
        <CloudPuffs reduced={reduced} />
        <RunwayLights />
        <CameraRig reduced={reduced} />
      </Suspense>
    </Canvas>
  );
}
