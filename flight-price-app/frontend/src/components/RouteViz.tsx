import { motion, AnimatePresence } from "framer-motion";
import { CITIES, CITY_POS, type City } from "../constants";
import { useMemo } from "react";

/**
 * Schematic route visualization: SOURCE ✈ ─────── DESTINATION.
 * Positioned on a stylized coordinate space — a visualization, not a
 * geographic navigation map. Animates when the cities change.
 */

const SLOT_LABEL: Record<string, string> = {
  Air_India: "Air India",
  GO_FIRST: "Go First",
  Early_Morning: "Early Morning",
  Late_Night: "Late Night",
};

export function RouteViz({ source, destination }: { source: City; destination: City }) {
  const a = CITY_POS[source];
  const b = CITY_POS[destination];

  const path = useMemo(() => {
    // Gentle upward arc between the two city nodes.
    const mx = (a.x + b.x) / 2;
    const my = Math.min(a.y, b.y) - Math.abs(a.x - b.x) * 0.16 - 6;
    return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
  }, [a, b]);

  const key = `${source}-${destination}`;

  return (
    <div className="route-viz" aria-label={`Route: ${SLOT_LABEL[source] ?? source} to ${SLOT_LABEL[destination] ?? destination}`}>
      <AnimatePresence mode="wait">
        <motion.svg
          key={key}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="route-svg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          aria-hidden="true"
        >
          {/* faint network of all cities */}
          {CITIES.map((c) =>
            c === source || c === destination ? null : (
              <circle key={c} cx={CITY_POS[c].x} cy={CITY_POS[c].y} r="0.9" fill="rgba(124,196,255,0.25)" />
            ),
          )}
          {/* animated flight path */}
          <motion.path
            d={path}
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth="0.8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
          <defs>
            <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7cc4ff" />
              <stop offset="100%" stopColor="#66e3ff" />
            </linearGradient>
          </defs>
          {/* moving aircraft marker along the path */}
          <motion.circle
            r="1.4"
            fill="#66e3ff"
            initial={{ offsetDistance: "0%" }}
            animate={{ offsetDistance: "100%" }}
            transition={{ duration: 1.6, ease: "easeInOut", delay: 0.25 }}
            style={{
              offsetPath: `path('${path}')`,
            } as React.CSSProperties}
          />
        </motion.svg>
      </AnimatePresence>

      <div className="route-ends">
        <span className="route-city">
          <span className="route-dot route-dot--source" aria-hidden="true" />
          {source}
        </span>
        <span className="route-plane" aria-hidden="true">✈</span>
        <span className="route-city route-city--dest">
          {destination}
          <span className="route-dot route-dot--dest" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
