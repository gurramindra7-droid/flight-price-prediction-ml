import { motion } from "framer-motion";
import { FlightScene } from "../three/FlightScene";
import { IntroOverlay } from "./IntroOverlay";
import { METRICS } from "../metrics";

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
      {/* 3D scene always mounted; overlay only while the cinematic plays */}
      <div className="hero-scene" aria-hidden="true">
        <FlightScene reduced={reduced} />
      </div>

      {!introDone && <IntroOverlay onFinish={onIntroFinish} reduced={reduced} />}

      <motion.div
        className="container hero-content"
        variants={container}
        initial="hidden"
        animate={introDone ? "show" : "hidden"}
        aria-hidden={!introDone}
      >
        <motion.p className="eyebrow" variants={item}>
          MACHINE LEARNING × AVIATION
        </motion.p>

        <motion.h1 className="display-xl hero-title" variants={item}>
          Predict Your
          <br />
          <span className="grad-text">Flight Price</span>
        </motion.h1>

        <motion.p className="lead hero-lead" variants={item}>
          Machine-learning powered flight price estimation based on route, airline, timing,
          duration, stops and booking horizon.
        </motion.p>

        <motion.div className="hero-cta" variants={item}>
          <a href="#predict" className="btn btn-primary">
            Predict Flight Price
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
              <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a href="#model" className="btn btn-ghost">
            Explore Model
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
