import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  AdaptiveDpr,
  AdaptiveEvents,
  Environment,
  Lightformer,
  Preload,
  Sparkles,
} from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import * as THREE from "three";
import { Aircraft } from "./Aircraft";
import { makeAtmosphereMaterial } from "./shaders";
import { introState, lerp } from "../introState";
import { getCapabilities, sceneQuality, type SceneQuality } from "../capabilities";

/** Deterministic pseudo-random so layouts are stable across reloads. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t ^ (t >>> 14)) >>> 0;
    return t / 4294967296;
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
      arr[i * 3] += speeds[i] * delta * 0.55;
      if (arr[i * 3] > 23) arr[i * 3] = -23;
    }
    pos.needsUpdate = true;
    pts.position.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.35;
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
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

/* --------------------------- atmosphere ------------------------------ */

function Atmosphere() {
  const material = useMemo(() => makeAtmosphereMaterial(), []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    // Keep the dome centered on the camera so the gradient never "ends".
    ref.current?.position.copy(camera.position);
  });
  return (
    <mesh ref={ref} material={material} scale={110}>
      <sphereGeometry args={[1, 24, 16]} />
    </mesh>
  );
}

/* --------------------------- GSAP camera rig --------------------------- */

const LOOK_PLANE = new THREE.Vector3(0, 1.4, -4.2);

function CameraRig() {
  const { camera } = useThree();
  const lookTarget = useMemo(() => new THREE.Vector3(0, 0.6, -6), []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
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

    // Cinematic phase: chase the GSAP-driven camera target with soft lag,
    // blend the look-at from the flying aircraft into the hero framing.
    cam.position.x = lerp(cam.position.x, introState.cameraTarget.x, 1 - Math.pow(0.001, delta));
    cam.position.y = lerp(cam.position.y, introState.cameraTarget.y, 1 - Math.pow(0.001, delta));
    cam.position.z = lerp(cam.position.z, introState.cameraTarget.z, 1 - Math.pow(0.001, delta));

    const target = introState.heroBlend > 0.55 ? LOOK_PLANE : introState.aircraftPos;
    lookTarget.lerp(target, 0.1);
    cam.lookAt(lookTarget);
  });

  return null;
}

/** GSAP timeline that scrubs introState.cameraTarget through the shot list. */
function IntroTimeline({ onDone }: { onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useGSAP(() => {
    const o = introState;
    const tween = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => onDoneRef.current(),
    });

    // Shot 1 (0–1.9s): distant 3/4 view, watching the aircraft enter.
    tween.to(o.cameraTarget, { x: -4.2, y: 2.1, z: -1.2, duration: 1.9 });
    // Shot 2 (1.9–3.5s): push in alongside the aircraft mid-flight.
    tween.to(o.cameraTarget, { x: -1.6, y: 1.7, z: 0.4, duration: 1.6, ease: "power1.in" });
    // Shot 3 (3.5–4.9s): swing around the nose into hero framing.
    tween.to(o.cameraTarget, { x: 0, y: 1.9, z: 2.4, duration: 1.4, ease: "power3.out" });
    // Shot 4 (~4.7–5.2s): settle; heroBlend hands the look-at to the hero target.
    tween.to(o, { heroBlend: 1, duration: 0.6 }, ">-0.2");
    tween.to(o, { networkReveal: 1, duration: 0.5 }, "<");

    return () => {
      tween.kill();
    };
  }, []);

  return null;
}

/* --------------------------- postprocessing --------------------------- */

function PostFX({ quality }: { quality: SceneQuality }) {
  if (!quality.postprocessing) return null;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={0.55}
        luminanceThreshold={0.22}
        luminanceSmoothing={0.4}
        mipmapBlur
        radius={0.7}
      />
      {quality.depthOfField ? (
        <DepthOfField focusDistance={0.012} focalLength={0.05} bokehScale={2.2} height={480} />
      ) : (
        <></>
      )}
      <Vignette eskil={false} offset={0.22} darkness={0.72} />
      <ChromaticAberration offset={new THREE.Vector2(0.00045, 0.00045)} radialModulation modulationOffset={0.4} />
      <Noise premultiply opacity={0.045} />
    </EffectComposer>
  );
}

/* --------------------------- scene root --------------------------- */

export function FlightScene({ reduced = false }: { reduced?: boolean }) {
  const quality = useMemo<SceneQuality>(() => {
    if (reduced) {
      return {
        particles: 240,
        postprocessing: false,
        depthOfField: false,
        dpr: [1, 1.2],
        antialias: true,
        mapSegments: 36,
        arcParticles: 0,
      };
    }
    return sceneQuality(getCapabilities());
  }, [reduced]);

  const { invalidate } = useThree();
  void invalidate;

  useEffect(() => {
    const onMouse = (e: PointerEvent) => {
      introState.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      introState.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMouse, { passive: true });
    return () => window.removeEventListener("pointermove", onMouse);
  }, []);

  const dpr: [number, number] = reduced ? [1, 1.2] : quality.dpr;
  const particleCount = reduced ? 260 : quality.particles;

  return (
    <Canvas
      dpr={dpr}
      flat
      gl={{
        antialias: reduced ? true : quality.antialias,
        alpha: false,
        powerPreference: "high-performance",
      }}
      camera={{ fov: reduced ? 46 : 42, near: 0.1, far: 220, position: [-6.5, 2.4, -2] }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color("#020409"), 1);
      }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <fog attach="fog" args={["#05070d", 14, 70]} />

      <Suspense fallback={null}>
        {/* Lighting: cool key light, blue rim, soft fill */}
        <ambientLight intensity={0.35} color="#3b4a66" />
        <directionalLight position={[6, 8, 4]} intensity={1.5} color="#bfd6f5" />
        <directionalLight position={[-8, 3, -6]} intensity={0.7} color="#3f6fb5" />
        <pointLight position={[0, 1.4, 2]} intensity={0.35} color="#6ea8ff" />

        {/* Studio-style reflections without loading an HDRI file */}
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2.2} color="#9fc2ff" position={[0, 5, -6]} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={1.1} color="#3a5fa8" position={[-6, 2, 2]} scale={[6, 1.5, 1]} rotation-y={Math.PI / 3} />
          <Lightformer form="rect" intensity={1.4} color="#66e3ff" position={[6, 1, -2]} scale={[5, 1.2, 1]} rotation-y={-Math.PI / 3} />
        </Environment>

        <Aircraft reduced={reduced} />
        <AtmosphericParticles count={particleCount} />
        {!reduced && (
          <Sparkles count={90} scale={[40, 16, 40]} size={1.6} speed={0.25} opacity={0.35} color="#9fd4ff" />
        )}
        <RunwayLights />
        <Atmosphere />
        {!reduced && <CameraRig />}
        {!reduced && (
          <IntroTimeline
            onDone={() => window.dispatchEvent(new CustomEvent("fi:intro-complete"))}
          />
        )}
        <Preload all />
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
      </Suspense>

      {!reduced && <PostFX quality={quality} />}
    </Canvas>
  );
}
