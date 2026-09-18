import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  AdaptiveDpr,
  AdaptiveEvents,
  Html,
  Preload,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import {
  CITIES,
  CITY_GEO,
  CITY_INFO,
  ROUTE_ARCS,
  type City,
} from "../constants";
import { makeArcMaterial, tickArcMaterial } from "./shaders";
import { getCapabilities, sceneQuality } from "../capabilities";
import { useCityImage } from "../hooks/useCityImage";

/* ------------------------------------------------------------------ */
/* Projection: real lat/lon → map local space                          */
/* ------------------------------------------------------------------ */

/** Geographic bounds of the stylized map (visual fit, not surveying). */
const LAT_MIN = 6;
const LAT_MAX = 37;
const LON_MIN = 66.5;
const LON_MAX = 98;
/** Aspect correction so India isn't stretched. */
const LON_SCALE = 0.9;
/** Height of the map space in world units. */
const MAP_H = 60;

/** lon/lat → local (x, y). Cities AND the outline use this same projection. */
export function projectCity(geo: { lat: number; lon: number }): [number, number] {
  const x = ((geo.lon - LON_MIN) / (LON_MAX - LON_MIN) - 0.5) * (MAP_H * 0.783) * LON_SCALE;
  const y = ((geo.lat - LAT_MIN) / (LAT_MAX - LAT_MIN) - 0.5) * MAP_H;
  return [x, y];
}

/** Local (x, y) of a city at the map surface height. */
const SURFACE_Z = 0.72;

function ll(lon: number, lat: number): THREE.Vector2 {
  const [x, y] = projectCity({ lat, lon });
  return new THREE.Vector2(x, y);
}

/* ------------------------------------------------------------------ */
/* India silhouette — traced in the same projected space as the cities */
/* ------------------------------------------------------------------ */

/** Simplified, recognizable India outline (lon, lat), clockwise from Kashmir. */
const INDIA_OUTLINE: [number, number][] = [
  [74.0, 35.5], [78.5, 35.2], [79.5, 33.5], [80.5, 32.3], [82.0, 30.5],
  [83.5, 29.3], [85.2, 28.3], [88.0, 27.9], [89.6, 26.8], [92.0, 27.5],
  [95.2, 27.6], [95.5, 26.0], [93.6, 24.2], [92.2, 23.2], [89.0, 22.0],
  [87.0, 21.4], [86.6, 20.0], [84.2, 18.6], [82.2, 17.0], [80.6, 15.6],
  [80.2, 13.5], [79.8, 11.6], [79.3, 10.3], [78.2, 8.9], [77.5, 8.1],
  [76.6, 9.6], [75.8, 11.8], [74.7, 13.6], [73.8, 15.6], [72.8, 18.5],
  [72.6, 21.0], [70.2, 20.9], [68.8, 22.3], [68.2, 23.8], [70.0, 25.6],
  [71.2, 27.6], [72.6, 29.5], [74.6, 31.6], [74.0, 34.0],
];

function indiaShape(): THREE.Shape {
  const pts = INDIA_OUTLINE.map(([lon, lat]) => ll(lon, lat));
  const s = new THREE.Shape();
  s.moveTo(pts[0].x, pts[0].y);
  s.splineThru(pts.slice(1));
  s.closePath();
  return s;
}

/* ------------------------------------------------------------------ */
/* Map world — one tilted/scaled group holding map, arcs and nodes     */
/* ------------------------------------------------------------------ */

function MapWorld({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);

  // Subtle idle sway — the "dimensional, alive" feel.
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.rotation.y = Math.sin(t * 0.11) * 0.05;
    g.rotation.x = -0.42 + Math.sin(t * 0.09 + 1) * 0.012;
  });

  return (
    <group ref={group} position={[0, -0.6, 0]} rotation={[-0.42, 0, 0]} scale={0.85}>
      {children}
    </group>
  );
}

function IndiaMap({ segments }: { segments: number }) {
  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(indiaShape(), {
      depth: 0.55,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.22,
      bevelSegments: 2,
      curveSegments: segments,
    });
    geo.computeVertexNormals();
    return geo;
  }, [segments]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#0c1a30"
        roughness={0.42}
        metalness={0.62}
        envMapIntensity={0.9}
      />
    </mesh>
  );
}

/** Glowing outline of the top face — rendered imperatively (avoids the
 *  TSX <line> ambiguity with SVG elements). */
function MapEdges() {
  const line = useMemo(() => {
    const pts = indiaShape().getPoints(160).map((p) => new THREE.Vector3(p.x, p.y, SURFACE_Z + 0.02));
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const material = new THREE.LineBasicMaterial({
      color: "#4d9fff",
      transparent: true,
      opacity: 0.55,
    });
    return new THREE.Line(geometry, material);
  }, []);
  useFrame(({ clock }) => {
    const m = line.material as THREE.LineBasicMaterial;
    m.opacity = 0.45 + Math.sin(clock.elapsedTime * 0.8) * 0.16;
  });
  return <primitive object={line} />;
}

/* ------------------------------------------------------------------ */
/* Route arcs                                                          */
/* ------------------------------------------------------------------ */

function RouteArc({
  from,
  to,
  active,
  particleCount,
}: {
  from: City;
  to: City;
  active: boolean;
  particleCount: number;
}) {
  const particles = useRef<THREE.InstancedMesh>(null);
  const clock = useRef(0);
  const activeRef = useRef(0);

  const mat = useMemo(() => makeArcMaterial("#4d8dff"), []);

  const { curve } = useMemo(() => {
    const a = projectCity(CITY_GEO[from]);
    const b = projectCity(CITY_GEO[to]);
    const va = new THREE.Vector3(a[0], a[1], SURFACE_Z);
    const vb = new THREE.Vector3(b[0], b[1], SURFACE_Z);
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const dist = va.distanceTo(vb);
    mid.z += 1.4 + dist * 0.16; // altitude above the plate
    mid.x += (vb.x - va.x) * 0.06;
    mid.y += (vb.y - va.y) * 0.06;
    return { curve: new THREE.QuadraticBezierCurve3(va, mid, vb) };
  }, [from, to]);

  const tubeGeometry = useMemo(
    () => new THREE.TubeGeometry(curve, 48, 0.028, 6, false),
    [curve],
  );

  const particleSeed = useMemo(
    () => Array.from({ length: Math.max(particleCount, 1) }, (_, i) => (i * 0.618) % 1),
    [particleCount],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    clock.current += delta;
    tickArcMaterial(mat, delta);

    const target = active ? 1 : 0;
    activeRef.current += (target - activeRef.current) * Math.min(1, delta * 6);
    mat.uniforms.uActive.value = activeRef.current;
    if (active) mat.uniforms.uColor.value.set("#8fd0ff");
    else mat.uniforms.uColor.value.set("#4d8dff");

    if (particles.current && particleCount > 0) {
      const t = clock.current * (active ? 0.16 : 0.07);
      for (let i = 0; i < particleSeed.length; i++) {
        const p = (t + particleSeed[i]) % 1;
        curve.getPoint(p, dummy.position);
        dummy.scale.setScalar(0.05 * (active ? 1.6 : 1));
        dummy.updateMatrix();
        particles.current.setMatrixAt(i, dummy.matrix);
      }
      particles.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh geometry={tubeGeometry} material={mat} />
      {particleCount > 0 && (
        <instancedMesh
          ref={particles}
          args={[undefined, undefined, Math.max(particleCount, 1)]}
          frustumCulled={false}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial
            color="#9fd4ff"
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </instancedMesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* City nodes                                                          */
/* ------------------------------------------------------------------ */

function CityNode({
  city,
  selected,
  onHover,
}: {
  city: City;
  selected: boolean;
  onHover: (city: City | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { status, src } = useCityImage(city, hovered);

  const [x, y] = projectCity(CITY_GEO[city]);
  const info = CITY_INFO[city];

  // Sine-driven pulse — cheap, no per-frame allocations.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.1 + x * 0.35);
    const boost = hovered ? 1.5 : selected ? 1.25 : 1;
    if (core.current) {
      core.current.scale.setScalar(boost * (1 + pulse * 0.18));
      const m = core.current.material as THREE.MeshBasicMaterial;
      m.opacity = (selected || hovered ? 1 : 0.85) * (0.75 + pulse * 0.25);
    }
    if (halo.current) {
      halo.current.scale.setScalar(boost * (1 + pulse * 0.3));
      const m = halo.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.3 * boost * (0.6 + 0.4 * (1 - pulse));
    }
    if (group.current) {
      group.current.position.z = SURFACE_Z + 0.06 + Math.sin(t * 1.2 + x) * 0.05;
    }
  });

  return (
    <group
      ref={group}
      position={[x, y, SURFACE_Z + 0.06]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(city);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
      }}
    >
      {/* Invisible generous hit target for easier hovering */}
      <mesh visible={false}>
        <sphereGeometry args={[0.9, 8, 8]} />
      </mesh>

      {/* Core glowing marker (bright → Bloom) */}
      <mesh ref={core}>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshBasicMaterial
          color={selected || hovered ? "#bfe4ff" : "#7cc4ff"}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>
      {/* Soft halo */}
      <mesh ref={halo}>
        <sphereGeometry args={[0.42, 16, 16]} />
        <meshBasicMaterial
          color="#4d8dff"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Light pillar rising from the surface (local +Z) */}
      <mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.045, 1.4, 8, 1, true]} />
        <meshBasicMaterial
          color="#5ea8ff"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <Html center distanceFactor={40} zIndexRange={[20, 10]} style={{ pointerEvents: "none" }}>
        <div className="city-node-label">
          <span className="city-node-code">{info.code}</span>
          <span className="city-node-name">{city}</span>
        </div>
        {hovered && (
          <div className="city-node-card" role="tooltip">
            <div className="city-node-card-media">
              {status === "loaded" && src ? (
                <img src={src} alt="" decoding="async" />
              ) : (
                <div className={`city-node-card-fallback ${status === "error" ? "is-error" : ""}`} />
              )}
            </div>
            <div className="city-node-card-body">
              <p className="city-node-card-title">
                {city} · {info.code}
              </p>
              <p className="city-node-card-sub">{info.state}</p>
              <p className="city-node-card-blurb">{info.blurb}</p>
            </div>
          </div>
        )}
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scene root                                                          */
/* ------------------------------------------------------------------ */

function NetworkScene({
  source,
  destination,
  setHovered,
  quality,
}: {
  source: City | null;
  destination: City | null;
  setHovered: (c: City | null) => void;
  quality: ReturnType<typeof sceneQuality>;
}) {
  const activePair =
    source && destination && source !== destination ? new Set([source, destination]) : null;

  return (
    <>
      <ambientLight intensity={0.55} color="#41547a" />
      <directionalLight position={[8, 12, 6]} intensity={1.15} color="#9fc2ff" />
      <directionalLight position={[-10, 4, -8]} intensity={0.5} color="#3f6fb5" />
      <pointLight position={[0, 8, 4]} intensity={26} distance={40} color="#2f6bff" />

      <MapWorld>
        <IndiaMap segments={quality.mapSegments} />
        <MapEdges />
        {ROUTE_ARCS.map(([a, b]) => {
          const isActive =
            !!activePair && activePair.has(a) && activePair.has(b) && activePair.size === 2;
          return (
            <RouteArc
              key={`${a}-${b}`}
              from={a}
              to={b}
              active={isActive}
              particleCount={quality.arcParticles}
            />
          );
        })}
        {CITIES.map((city) => (
          <CityNode
            key={city}
            city={city}
            selected={city === source || city === destination}
            onHover={setHovered}
          />
        ))}
      </MapWorld>

      <Preload all />
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
    </>
  );
}

export function FlightNetwork({
  source,
  destination,
}: {
  source: City | null;
  destination: City | null;
}) {
  const [, setHovered] = useState<City | null>(null);
  const cap = useMemo(() => getCapabilities(), []);
  const quality = useMemo(() => sceneQuality(cap), [cap]);

  if (!cap.webgl || cap.reducedMotion) {
    return <StaticNetworkFallback />;
  }

  return (
    <div className="network-stage">
      <Canvas
        dpr={quality.dpr}
        gl={{ antialias: quality.antialias, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 40, near: 0.1, far: 160, position: [0, 24, 34] }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(new THREE.Color("#020409"), 0);
          camera.lookAt(0, 0, 0);
        }}
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        <NetworkScene
          source={source}
          destination={destination}
          setHovered={setHovered}
          quality={quality}
        />
        {quality.postprocessing && (
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom
              intensity={0.5}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.45}
              mipmapBlur
              radius={0.65}
            />
            <Vignette eskil={false} offset={0.28} darkness={0.66} />
          </EffectComposer>
        )}
      </Canvas>

      <p className="sr-only" aria-live="polite">
        {source && destination
          ? `Selected route: ${source} to ${destination}`
          : "Hover a city node to inspect it; select a route in the prediction console to highlight it here."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Static fallback (no WebGL / reduced motion)                         */
/* ------------------------------------------------------------------ */

function StaticNetworkFallback() {
  return (
    <div className="network-stage network-stage--static">
      <p className="network-static-note">
        The interactive 3D network is disabled by performance or accessibility settings.
        All six cities and routes remain available in the prediction console.
      </p>
    </div>
  );
}
