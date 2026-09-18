import { useEffect, useState } from "react";

const LINKS = [
  { href: "#predict", label: "Predict" },
  { href: "#model", label: "Model" },
  { href: "#routes", label: "Routes" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? "nav--scrolled" : ""}`}>
      <div className="container nav-inner">
        <a href="#top" className="nav-brand" aria-label="Flight Intelligence — back to top">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
            <path
              d="M2.5 19.5 21 12 2.5 4.5 6 12l-3.5 7.5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M6 12h15" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
          </svg>
          <span>
            FLIGHT<em>INTELLIGENCE</em>
          </span>
        </a>
        <nav aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="nav-link">
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
