import { motion } from "framer-motion";
import { CITIES, CITY_POS } from "../constants";

/**
 * Stylized city network — schematic positions, clearly a visualization rather
 * than a geographic map. Highlights the currently selected source/destination
 * (lifted from the shared form state via context-free props drilling is
 * avoided; the section owns lightweight selection state).
 */
export function RouteMapSection() {
  return (
    <section id="routes" className="routes section-pad">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">ROUTE NETWORK</p>
          <h2 className="section-title">
            Six cities, <span className="grad-text">one model</span>
          </h2>
          <p className="lead">
            Every domestic route in the training data, drawn as a schematic network. The
            prediction console above runs any city pair through the same trained pipeline.
          </p>
        </div>

        <motion.div
          className="glass routes-stage"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <svg viewBox="0 0 100 100" className="routes-svg" role="img" aria-label="Schematic network of Delhi, Mumbai, Bangalore, Kolkata, Hyderabad and Chennai">
            <defs>
              <radialGradient id="cityGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#66e3ff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#66e3ff" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* all-pairs faint mesh */}
            {CITIES.flatMap((a, i) =>
              CITIES.slice(i + 1).map((b) => (
                <line
                  key={`${a}-${b}`}
                  x1={CITY_POS[a].x}
                  y1={CITY_POS[a].y}
                  x2={CITY_POS[b].x}
                  y2={CITY_POS[b].y}
                  stroke="rgba(124,196,255,0.07)"
                  strokeWidth="0.25"
                />
              )),
            )}

            {CITIES.map((city) => {
              const pos = CITY_POS[city];
              return (
                <g key={city}>
                  <circle cx={pos.x} cy={pos.y} r="3.4" fill="url(#cityGlow)" opacity="0.5" />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="1.1"
                    fill="#7cc4ff"
                    className="routes-node"
                  />
                  <text
                    x={pos.x}
                    y={pos.y - 2.6}
                    textAnchor="middle"
                    className="routes-label"
                    fontSize="2.6"
                  >
                    {city}
                  </text>
                </g>
              );
            })}
          </svg>

          <p className="routes-note">
            Schematic visualization — node placement is illustrative, not a geographic
            navigation map.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
