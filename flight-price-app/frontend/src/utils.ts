/** Tiny helpers shared across the UI. */

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatINRParts(value: number): { symbol: string; whole: string } {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).formatToParts(value);
  const symbol = formatted.find((p) => p.type === "currency")?.value ?? "₹";
  const whole = formatted
    .filter((p) => p.type !== "currency")
    .map((p) => p.value)
    .join("");
  return { symbol, whole };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
