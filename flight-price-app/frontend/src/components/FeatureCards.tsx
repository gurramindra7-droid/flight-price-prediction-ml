import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Network, LineChart, MonitorSmartphone } from "lucide-react";

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "AI Fare Intelligence",
    desc: "A trained Extra Trees regressor turns ten journey features into an honest fare estimate with known accuracy (R² 0.9866).",
  },
  {
    icon: Network,
    title: "Route Network",
    desc: "Six cities and ten inter-city corridors rendered as a living 3D network — the same graph the model was trained on.",
  },
  {
    icon: LineChart,
    title: "Flight Parameters",
    desc: "Timing, duration, stops and booking horizon each shift the estimate. Explore how the model weighs your itinerary.",
  },
  {
    icon: MonitorSmartphone,
    title: "Instant Prediction",
    desc: "Sub-second inference from a serverless Python API, wrapped in a cinematic interface that stays out of your way.",
  },
] as const;

/** Glass feature card with a subtle pointer-tracked tilt (desktop only). */
function TiltCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof BrainCircuit;
  title: string;
  desc: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -6, y: px * 8 });
  };

  return (
    <motion.div
      ref={ref}
      className="glass glass-hover feature-card-big"
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        rotateX: tilt.x,
        rotateY: tilt.y,
        transformPerspective: 900,
      }}
    >
      <span className="feature-card-big-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={1.6} />
      </span>
      <h3>{title}</h3>
      <p>{desc}</p>
    </motion.div>
  );
}

export function FeatureCards() {
  return (
    <section className="features section-pad" aria-label="Product features">
      <div className="container">
        <motion.div
          className="feature-grid-big"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        >
          {FEATURES.map((f) => (
            <TiltCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
