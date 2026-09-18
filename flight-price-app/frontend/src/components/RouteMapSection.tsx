import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CITIES, CITY_IMAGE, CITY_INFO, type City } from "../constants";
import { useCityImage } from "../hooks/useCityImage";

/** Code-split the entire 3D network so it never blocks initial load. */
const FlightNetwork = lazy(() =>
  import("../three/FlightNetwork").then((m) => ({ default: m.FlightNetwork })),
);

export function RouteMapSection({
  source,
  destination,
}: {
  source: City | null;
  destination: City | null;
}) {
  return (
    <section id="routes" className="routes section-pad">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">ROUTE NETWORK</p>
          <h2 className="section-title">
            Six cities, <span className="grad-text">one model</span>
          </h2>
          <p className="lead">
            Live 3D network of the model's cities. Select a route in the prediction console and
            its arc lights up here — the same pair, the same trained pipeline.
          </p>
        </div>

        <motion.div
          className="glass routes-stage"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Suspense fallback={<div className="network-loading" aria-hidden="true" />}>
            <FlightNetwork source={source} destination={destination} />
          </Suspense>
          <p className="routes-note">
            Schematic visualization — node placement is illustrative, not a navigation map.
            Imagery: Wikimedia Commons.
          </p>
        </motion.div>

        <CityStrip source={source} destination={destination} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* City imagery strip                                                  */
/* ------------------------------------------------------------------ */

function CityStrip({
  source,
  destination,
}: {
  source: City | null;
  destination: City | null;
}) {
  return (
    <ul className="city-strip" aria-label="City gallery">
      {CITIES.map((city, i) => (
        <motion.li
          key={city}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          className={city === source || city === destination ? "is-active" : ""}
        >
          <CityTile city={city} />
        </motion.li>
      ))}
    </ul>
  );
}

function CityTile({ city }: { city: City }) {
  const tileRef = useRef<HTMLButtonElement>(null);
  const [inView, setInView] = useState(false);
  const { status, src } = useCityImage(city, inView);
  const info = CITY_INFO[city];

  // Only fetch the remote image when the tile actually scrolls into view.
  useEffect(() => {
    const el = tileRef.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  return (
    <button
      type="button"
      className="city-tile"
      ref={tileRef}
      aria-label={`${city} — ${info.blurb}`}
    >
      <span className="city-tile-media">
        {status === "loaded" && src ? (
          <img src={src} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className={`city-tile-fallback ${status === "error" ? "is-error" : "is-loading"}`} />
        )}
      </span>
      <span className="city-tile-meta">
        <span className="city-tile-code">{info.code}</span>
        <span className="city-tile-name">{city}</span>
      </span>
    </button>
  );
}

/** Image credit line for the currently visible imagery (Wikimedia requires attribution for some licenses). */
export function CityImageCredits() {
  return (
    <p className="city-credits">
      {CITIES.map((c) => CITY_IMAGE[c].credit).join(" · ")}
    </p>
  );
}
