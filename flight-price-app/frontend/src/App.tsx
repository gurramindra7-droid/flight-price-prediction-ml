import { useCallback, useState } from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { FeatureCards } from "./components/FeatureCards";
import { PredictionPanel } from "./components/PredictionPanel";
import { ModelSection } from "./components/ModelSection";
import { RouteMapSection } from "./components/RouteMapSection";
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
      <main id="main">
        <Hero introDone={introDone} reduced={cap.reducedMotion} onIntroFinish={handleIntroFinish} />
        <FeatureCards />
        <hr className="divider-glow" />
        <PredictionPanel onCitiesChange={handleCitiesChange} />
        <hr className="divider-glow" />
        <ModelSection />
        <hr className="divider-dashed" />
        <RouteMapSection source={source} destination={destination} />
      </main>
      <Footer />
    </>
  );
}
