import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Home, Network, Gauge, Info } from "lucide-react";

const LINKS = [
  { href: "#top", label: "Home", icon: Home },
  { href: "#routes", label: "Network", icon: Network },
  { href: "#predict", label: "Predict", icon: Gauge },
  { href: "#model", label: "About", icon: Info },
];

export function Navbar({ visible }: { visible: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      className={`nav ${scrolled ? "nav--scrolled" : ""}`}
      initial={{ opacity: 0, filter: "blur(8px)", y: -12 }}
      animate={visible ? { opacity: 1, filter: "blur(0px)", y: 0 } : { opacity: 0, filter: "blur(8px)", y: -12 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: visible ? 0.25 : 0 }}
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      <div className="container nav-inner">
        <a href="#top" className="nav-brand" aria-label="Flight Intelligence — back to top">
          <PlaneMark />
          <span>
            FLIGHT<em>INTELLIGENCE</em>
          </span>
        </a>
        <nav aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="nav-link">
              <l.icon size={13} aria-hidden="true" strokeWidth={1.8} />
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </motion.header>
  );
}

/** Inline aircraft glyph — crisp at small sizes, no icon-library dependency. */
function PlaneMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M2.5 19.5 21 12 2.5 4.5 6 12l-3.5 7.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M6 12h15" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
    </svg>
  );
}
