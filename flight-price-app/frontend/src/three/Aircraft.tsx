import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { introProgress, introState, lerp } from "../introState";
import { makeRimGlowMaterial } from "./shaders";

/**
 * Stylized widebody airliner assembled from Three.js primitives — recognizable
 * proportions (long fuselage, swept wings, tail, twin engines) with metallic
 * PBR materials plus a custom fresnel rim-glow shell. No external assets; all
 * geometry is generated locally (user-selected approach over a downloaded GLB).
 *
 * Coordinate convention: aircraft nose points toward -Z when rotation.y = 0.
 * The plane travels from far depth toward/past the camera during the intro.
 */

const FUSELAGE_LENGTH = 6.4;
const FUSELAGE_RADIUS = 0.17;

function fuselageProfile(): THREE.Vector2[] {
  // Profile for LatheGeometry: (x = radius, y = position along the body axis).
  // Built nose-at-top; rotated to lie along Z afterwards.
  const R = FUSELAGE_RADIUS;
  const L = FUSELAGE_LENGTH;
  return [
    new THREE.Vector2(0.001, 0), // nose tip
    new THREE.Vector2(R * 0.22, L - 0.2),
    new THREE.Vector2(R * 0.5, L - 0.55),
    new THREE.Vector2(R * 0.8, L - 1.05),
    new THREE.Vector2(R, L - 1.7),
    new THREE.Vector2(R, L - 4.6),
    new THREE.Vector2(R * 0.85, L - 5.3),
    new THREE.Vector2(R * 0.55, L - 5.9),
    new THREE.Vector2(R * 0.3, L - 6.25),
    new THREE.Vector2(0.001, L), // tail tip
  ];
}

function wingGeometry(halfSign: 1 | -1): THREE.BufferGeometry {
  // Half wing planform on the XY plane (x = spanwise, y = chordwise),
  // extruded thinly, then laid flat and swept backward.
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.55); // root leading edge
  shape.lineTo(2.05, -0.35); // tip leading edge (swept)
  shape.lineTo(2.05, -0.62); // tip trailing edge
  shape.lineTo(0, -0.95); // root trailing edge
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  // Lay flat: extrude was along +Z (thickness); rotate so chord runs along Z.
  geo.rotateX(Math.PI / 2);
  // Mirror for the left wing by scaling spanwise.
  geo.scale(halfSign, 1, 1);
  geo.computeVertexNormals();
  return geo;
}

function stabilizerGeometry(vertical: boolean): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.85, vertical ? 0.75 : 0.3);
  shape.lineTo(0.9, vertical ? 0.68 : 0.06);
  shape.lineTo(0, -0.5);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function nacelleGeometry(): THREE.BufferGeometry {
  // Engine nacelle: open-ended cylinder with a slightly larger intake lip.
  const geo = new THREE.CylinderGeometry(0.17, 0.15, 0.62, 24, 1, true);
  geo.rotateX(Math.PI / 2); // axis along Z
  return geo;
}

export function Aircraft({ reduced = false }: { reduced?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const rim = useRef<THREE.Mesh>(null);
  /** Always-running clock so the post-intro idle float keeps moving. */
  const elapsed = useRef(0);

  const fuselageGeo = useMemo(() => {
    const geo = new THREE.LatheGeometry(fuselageProfile(), reduced ? 24 : 40);
    // Lathe axis is Y; rotate so the body lies along Z with nose at -Z.
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, -(FUSELAGE_LENGTH / 2));
    geo.computeVertexNormals();
    return geo;
  }, [reduced]);

  const rightWing = useMemo(() => wingGeometry(1), []);
  const leftWing = useMemo(() => wingGeometry(-1), []);
  const vTail = useMemo(() => stabilizerGeometry(true), []);
  const hTail = useMemo(() => stabilizerGeometry(false), []);
  const nacelle = useMemo(() => nacelleGeometry(), []);

  const mats = useMemo(() => {
    const fuselage = new THREE.MeshPhysicalMaterial({
      color: "#dfe6ee",
      metalness: 0.72,
      roughness: 0.3,
      clearcoat: 0.65,
      clearcoatRoughness: 0.35,
      envMapIntensity: 1.25,
    });
    const wing = new THREE.MeshStandardMaterial({
      color: "#c2cbd7",
      metalness: 0.7,
      roughness: 0.4,
      envMapIntensity: 1.1,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: "#232b3a",
      metalness: 0.55,
      roughness: 0.5,
    });
    const engine = new THREE.MeshStandardMaterial({
      color: "#939dab",
      metalness: 0.85,
      roughness: 0.28,
      envMapIntensity: 1.2,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: "#2f7cf6",
      metalness: 0.35,
      roughness: 0.4,
      emissive: "#123a8a",
      emissiveIntensity: 0.25,
    });
    const glow = new THREE.MeshBasicMaterial({ color: "#9ec7ff" });
    const rimShell = makeRimGlowMaterial({
      color: "#5ea8ff",
      baseColor: "#040a14",
      power: 2.6,
      intensity: 1.35,
      opacity: 0.85,
    });
    return { fuselage, wing, dark, engine, accent, glow, rimShell };
  }, []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    elapsed.current += delta;
    if (introState.active) introState.t += delta;

    const g = group.current;
    if (!g) return;

    if (!introState.done) {
      const p = introProgress(introState.t);
      // Flight path: enters far/deep, sweeps right and past the camera.
      g.position.x = -30 + 58 * p;
      g.position.y = 1.1 + Math.sin(p * Math.PI) * 2.4;
      g.position.z = -64 + 60 * p;
      g.rotation.z = -0.18 * Math.sin(p * Math.PI);
      g.rotation.y = Math.PI + 0.55 * (1 - p);
      g.rotation.x = 0.06 * Math.sin(p * Math.PI * 2);
    } else {
      // Post-intro: glide from wherever the flyby ended into the hero hold,
      // then float gently. Lerping (rather than snapping) brings the aircraft
      // back into frame as a natural return pass.
      const t = elapsed.current;
      const ease = 1 - Math.pow(0.015, delta);
      g.position.x = lerp(g.position.x, -2.5 + Math.sin(t * 0.5) * 0.2, ease);
      g.position.y = lerp(g.position.y, 1.55 + Math.sin(t * 1.05) * 0.12, ease);
      g.position.z = lerp(g.position.z, -4.2, ease);
      g.rotation.x = lerp(g.rotation.x, Math.sin(t * 0.9) * 0.02, ease);
      g.rotation.y = lerp(g.rotation.y, Math.PI * 0.94 + Math.sin(t * 0.45) * 0.03, ease);
      g.rotation.z = lerp(g.rotation.z, Math.sin(t * 0.7) * 0.03, ease);
    }
    introState.aircraftPos.copy(g.position);
  });

  return (
    <group ref={group} position={[-30, 1.1, -64]}>
      <group scale={reduced ? 0.9 : 1}>
        {/* Fuselage */}
        <mesh geometry={fuselageGeo} material={mats.fuselage} castShadow={false} />
        {/* Fresnel rim-glow shell — slightly larger, renders the blue edge */}
        <mesh ref={rim} geometry={fuselageGeo} material={mats.rimShell} scale={1.03} />
        {/* Cockpit windows band */}
        <mesh position={[0, 0.07, -(FUSELAGE_LENGTH - 0.85)]} material={mats.dark}>
          <sphereGeometry args={[FUSELAGE_RADIUS * 0.92, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
        </mesh>
        {/* Belly accent stripe */}
        <mesh position={[0, -FUSELAGE_RADIUS * 0.55, -0.4]} rotation={[Math.PI / 2, 0, 0]} material={mats.accent}>
          <boxGeometry args={[FUSELAGE_RADIUS * 0.9, FUSELAGE_LENGTH * 0.55, 0.02]} />
        </mesh>

        {/* Wings */}
        <mesh geometry={rightWing} material={mats.wing} position={[0.05, -0.04, -0.35]} />
        <mesh geometry={leftWing} material={mats.wing} position={[-0.05, -0.04, -0.35]} />

        {/* Winglets */}
        <mesh material={mats.accent} position={[2.1, 0.14, -0.85]} rotation={[0, 0, -0.18]}>
          <boxGeometry args={[0.03, 0.34, 0.3]} />
        </mesh>
        <mesh material={mats.accent} position={[-2.1, 0.14, -0.85]} rotation={[0, 0, 0.18]}>
          <boxGeometry args={[0.03, 0.34, 0.3]} />
        </mesh>

        {/* Engines under each wing */}
        <group position={[0.72, -0.19, -0.55]}>
          <mesh geometry={nacelle} material={mats.engine} />
          <mesh position={[0, 0, -0.32]} material={mats.dark}>
            <torusGeometry args={[0.155, 0.02, 10, 24]} />
          </mesh>
          <mesh position={[0, 0, -0.3]} material={mats.glow}>
            <circleGeometry args={[0.13, 20]} />
          </mesh>
        </group>
        <group position={[-0.72, -0.19, -0.55]}>
          <mesh geometry={nacelle} material={mats.engine} />
          <mesh position={[0, 0, -0.32]} material={mats.dark}>
            <torusGeometry args={[0.155, 0.02, 10, 24]} />
          </mesh>
          <mesh position={[0, 0, -0.3]} material={mats.glow}>
            <circleGeometry args={[0.13, 20]} />
          </mesh>
        </group>

        {/* Vertical stabilizer */}
        <mesh geometry={vTail} material={mats.accent} position={[0, 0.1, 2.35]} />
        {/* Horizontal stabilizers */}
        <mesh geometry={hTail} material={mats.wing} position={[0, 0.06, 2.5]} />
        <mesh geometry={hTail} material={mats.wing} position={[0, 0.06, 2.5]} scale={[-1, 1, 1]} />

        {/* Navigation lights */}
        <mesh position={[2.14, 0.2, -0.9]} material={mats.glow}>
          <sphereGeometry args={[0.035, 8, 8]} />
        </mesh>
        <mesh position={[-2.14, 0.2, -0.9]} material={mats.glow}>
          <sphereGeometry args={[0.035, 8, 8]} />
        </mesh>
      </group>
    </group>
  );
}
