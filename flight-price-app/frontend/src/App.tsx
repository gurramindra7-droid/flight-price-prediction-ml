import { useCallback, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { RouteMapSection } from "./components/RouteMapSection";
import { PredictionPanel } from "./components/PredictionPanel";
import { FeatureCards } from "./components/FeatureCards";
import { ModelSection } from "./components/ModelSection";
import { Footer } from "./components/Footer";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import { introState } from "./introState";
import { getCapabilities } from "./capabilities";
import type { City } from "./constants";

export default function App() {
  useSmoothScroll();

  const cap = getCapabilities();
  const [introDone, setIntroDone] = useState(cap.reducedMotion);
  const [source, setSource] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);

  // Cinematic scroll progress bar along the top of the viewport.
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.4 });

  const handleCitiesChange = useCallback((s: City | null, d: City | null) => {
    setSource(s);
    setDestination(d);
  }, []);

  const handleIntroFinish = useCallback(() => {
    introState.done = true;
    introState.active = false;
    setIntroDone(true);
  }, []);

  return (
    <>
      <Navbar visible={introDone} />
      <motion.div
        className="scroll-progress"
        style={{ scaleX: progress }}
        aria-hidden="true"
      />
      <main id="main">
        <Hero introDone={introDone} reduced={cap.reducedMotion} onIntroFinish={handleIntroFinish} />
        <RouteMapSection source={source} destination={destination} />
        <hr className="divider-glow" />
        <PredictionPanel onCitiesChange={handleCitiesChange} />
        <hr className="divider-glow" />
        <FeatureCards />
        <hr className="divider-dashed" />
        <ModelSection />
      </main>
      <Footer />
    </>
  );
}
