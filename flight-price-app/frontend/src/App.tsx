import { useCallback, useState } from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { PredictionSection } from "./components/PredictionSection";
import { ModelSection } from "./components/ModelSection";
import { RouteMapSection } from "./components/RouteMapSection";
import { Footer } from "./components/Footer";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import { introState } from "./introState";
import { prefersReducedMotion } from "./utils";

export default function App() {
  useSmoothScroll();

  const reduced = prefersReducedMotion();
  const [introDone, setIntroDone] = useState(reduced);

  const handleIntroFinish = useCallback(() => {
    introState.done = true;
    introState.active = false;
    setIntroDone(true);
  }, []);

  return (
    <>
      <Navbar />
      <main id="main">
        <Hero introDone={introDone} reduced={reduced} onIntroFinish={handleIntroFinish} />
        <PredictionSection />
        <hr className="divider-glow" />
        <ModelSection />
        <hr className="divider-dashed" />
        <RouteMapSection />
      </main>
      <Footer />
    </>
  );
}
