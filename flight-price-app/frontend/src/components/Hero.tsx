import { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { CinematicIntro } from "./CinematicIntro";
import { METRICS } from "../metrics";
import { getCapabilities } from "../capabilities";

/** Code-split the heavy 3D hero scene so it never blocks first paint. */
const FlightScene = lazy(() =>
  import("../three/FlightScene").then((m) => ({ default: m.FlightScene })),
);

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
};

export function Hero({
  introDone,
  reduced,
  onIntroFinish,
}: {
  introDone: boolean;
  reduced: boolean;
  onIntroFinish: () => void;
}) {
  return (
    <section id="top" className="hero" aria-label="Flight Intelligence — flight price prediction">
      {/* 3D scene mounted whenever WebGL is viable; static gradient otherwise */}
      <div className="hero-scene" aria-hidden="true">
        {reduced || !getCapabilities().webgl ? (
          <div className="hero-static-fallback" />
        ) : (
          <Suspense fallback={null}>
            <FlightScene reduced={reduced} />
          </Suspense>
        )}
      </div>

      {!introDone && <CinematicIntro onFinish={onIntroFinish} />}

      <motion.div
        className="container hero-content"
        variants={container}
        initial="hidden"
        animate={introDone ? "show" : "hidden"}
        aria-hidden={!introDone}
      >
        <motion.p className="eyebrow" variants={item}>
          AI-POWERED FARE ESTIMATION
        </motion.p>

        <motion.h1 className="display-xl hero-title" variants={item}>
          FLIGHT <span className="grad-text">INTELLIGENCE</span>
        </motion.h1>

        <motion.p className="lead hero-lead" variants={item}>
          An AI-powered flight fare prediction experience — route, airline, timing, duration,
          stops and booking horizon, run through a trained machine-learning model in real time.
        </motion.p>

        <motion.div className="hero-cta" variants={item}>
          <a href="#predict" className="btn btn-primary">
            Predict Flight Price
            <ArrowGlyph />
          </a>
          <a href="#routes" className="btn btn-ghost">
            Explore the Network
          </a>
        </motion.div>

        <motion.dl className="hero-metrics" variants={item}>
          {METRICS.map((m) => (
            <div key={m.label} className="metric">
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </motion.dl>
        <motion.p className="hero-metrics-note" variants={item}>
          Validation/test metrics from the trained Extra Trees model.
        </motion.p>
      </motion.div>

      <a className="hero-scroll-cue" href="#predict" aria-label="Scroll to prediction section">
        <span className="hero-scroll-line" aria-hidden="true" />
      </a>
    </section>
  );
}

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M2 8h11M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
