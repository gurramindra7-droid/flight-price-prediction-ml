import { motion } from "framer-motion";
import { METRICS } from "../metrics";

const PIPELINE = [
  { title: "User Inputs", desc: "Route, airline, timing, duration, stops, class and booking horizon." },
  { title: "Feature Engineering", desc: "Route is composed as source_city + \"_\" + destination_city." },
  { title: "Categorical Encoding", desc: "One-hot encoding across the six categorical features." },
  { title: "Extra Trees Regressor", desc: "100 fully randomized trees trained on the engineered features." },
  { title: "Predicted Price", desc: "Regression output — the estimated fare in ₹." },
] as const;

const FEATURES = [
  { name: "airline", desc: "Carrier operating the flight." },
  { name: "source_city", desc: "Departure city." },
  { name: "destination_city", desc: "Arrival city." },
  { name: "departure_time", desc: "Departure time-of-day bucket." },
  { name: "arrival_time", desc: "Arrival time-of-day bucket." },
  { name: "duration", desc: "Total journey duration in hours." },
  { name: "days_left", desc: "Days between booking and departure." },
  { name: "stops", desc: "Number of stops (encoded 0 / 1 / 2)." },
  { name: "route", desc: "Derived source_destination pair." },
  { name: "class", desc: "Cabin class (encoded 0 / 1)." },
] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const node = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

export function ModelSection() {
  return (
    <section id="model" className="model section-pad">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">THE MODEL</p>
          <h2 className="section-title">
            Inside the <span className="grad-text">prediction engine</span>
          </h2>
          <p className="lead">
            A scikit-learn Pipeline: one-hot encoded categorical features feed a trained
            Extra Trees regressor. Ten input features, one fare estimate.
          </p>
        </div>

        {/* Pipeline */}
        <motion.ol
          className="pipeline"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {PIPELINE.map((step, i) => (
            <motion.li key={step.title} className="pipeline-node" variants={node}>
              <span className="pipeline-index mono">{String(i + 1).padStart(2, "0")}</span>
              <div className="pipeline-body">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
              {i < PIPELINE.length - 1 && (
                <span className="pipeline-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M12 5v14M6 13l6 6 6-6" />
                  </svg>
                </span>
              )}
            </motion.li>
          ))}
        </motion.ol>

        {/* Metrics */}
        <div className="model-metrics">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              className="glass glass-hover metric-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="metric-label mono">{m.label}</p>
              <p className="metric-value tabular">{m.value}</p>
              <p className="metric-hint">{m.hint}</p>
            </motion.div>
          ))}
        </div>
        <p className="model-metrics-note">
          Validation/test metrics from the trained model on held-out data.
        </p>

        {/* Features */}
        <h3 className="features-title">The 10 model input features</h3>
        <motion.ul
          className="feature-grid"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {FEATURES.map((f) => (
            <motion.li key={f.name} className="glass glass-hover feature-card" variants={node}>
              <code className="mono">{f.name}</code>
              <p>{f.desc}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
