import { useEffect, useState } from "react";
import { CITY_IMAGE, type City } from "../constants";

export type CityImageStatus = "idle" | "loaded" | "error";

/**
 * Lazy-loads a city's Wikimedia image only when `enabled` flips true
 * (hover / mount in view), with a blur-up and a graceful error state —
 * the UI falls back to a solid gradient block when the network fails.
 */
export function useCityImage(city: City, enabled: boolean) {
  const [status, setStatus] = useState<CityImageStatus>("idle");
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || status !== "idle") return;

    let alive = true;
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";

    img.onload = () => {
      if (!alive) return;
      setSrc(CITY_IMAGE[city].src);
      setStatus("loaded");
    };
    img.onerror = () => {
      if (!alive) return;
      setStatus("error");
    };
    // Kick off the real fetch slightly after mount to keep hover snappy.
    const kick = window.setTimeout(() => {
      img.src = CITY_IMAGE[city].src;
    }, 40);

    return () => {
      alive = false;
      window.clearTimeout(kick);
      img.onload = null;
      img.onerror = null;
    };
  }, [city, enabled, status]);

  return { status, src };
}
