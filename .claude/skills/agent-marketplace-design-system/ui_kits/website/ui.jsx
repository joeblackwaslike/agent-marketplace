/* Shared UI primitives for the joeblack.nyc kit.
   Icons are Lucide path data (lucide.dev, ISC) rendered inline as React
   components — the kit's chosen UI icon system, kept self-contained. */
const { useState, useEffect, useRef } = React;

const BASE = "assets/brand-icons/";

/* Lucide line icons (24-grid, 2px stroke) */
function L({ d, size = 18, ...p }) {
  return (
    <svg className="icon-svg" width={size} height={size} viewBox="0 0 24 24" {...p}>
      {Array.isArray(d) ? d.map((x, i) => <path key={i} d={x} />) : <path d={d} />}
    </svg>
  );
}
const Icons = {
  sun: ["M12 2v2","M12 20v2","M4.93 4.93l1.41 1.41","M17.66 17.66l1.41 1.41","M2 12h2","M20 12h2","M6.34 17.66l-1.41 1.41","M19.07 4.93l-1.41 1.41","M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"],
  moon: ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"],
  copy: ["M15 8H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Z","M9 4h10a2 2 0 0 1 2 2v10"],
  check: ["M20 6 9 17l-5-5"],
};
function LucideSun(p){return <L d={Icons.sun} {...p}/>;}
function LucideMoon(p){return <L d={Icons.moon} {...p}/>;}

/* Brand SVG glyph from assets/ */
function Brand({ name, className = "brand-ic" }) {
  return <img className={className} src={BASE + name + ".svg"} alt={name} />;
}

/* Copy-to-clipboard button with confirm state */
function CopyButton({ text, small }) {
  const [done, setDone] = useState(false);
  function copy() {
    try { navigator.clipboard.writeText(text); } catch (e) {}
    setDone(true); setTimeout(() => setDone(false), 1400);
  }
  return (
    <button className={"copy" + (done ? " done" : "")} onClick={copy} aria-label="Copy command">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {done ? <path d="M20 6 9 17l-5-5"/> : <><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></>}
      </svg>
      {done ? "Copied" : "Copy"}
    </button>
  );
}

/* Install command snippet block */
function Snippet({ cmd }) {
  return (
    <div className="snippet">
      <span className="pmt">$</span>
      <code>{cmd}</code>
      <CopyButton text={cmd} />
    </div>
  );
}

/* Section eyebrow label */
function Eyebrow({ children }) {
  return <div className="eyebrow"><span className="label">{children}</span></div>;
}

/* Scroll reveal wrapper */
function Reveal({ children, as: Tag = "div", className = "", ...p }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={"reveal " + className} {...p}>{children}</Tag>;
}

Object.assign(window, { L, LucideSun, LucideMoon, Brand, CopyButton, Snippet, Eyebrow, Reveal });
