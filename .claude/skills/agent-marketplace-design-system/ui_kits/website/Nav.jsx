/* Sticky nav + hero */
function Nav({ theme, onToggle }) {
  const links = ["Plugins", "Writing", "Projects", "Connect"];
  const [active, setActive] = useState("Plugins");
  return (
    <nav className="nav">
      <a className="nav-mark" href="#top">joeblack<span className="tld">.nyc</span></a>
      <div className="nav-links">
        {links.map(l => (
          <a key={l} href={"#" + l.toLowerCase()}
             className={active === l ? "active" : ""}
             onClick={() => setActive(l)}>{l}</a>
        ))}
      </div>
      <div className="nav-right">
        <a className="nav-ic" href="https://github.com/joeblackwaslike" target="_blank" rel="noopener"><Brand name="github" className="" /></a>
        <a className="nav-ic" href="#" rel="noopener"><Brand name="x" className="" /></a>
        <button className="icon-btn" onClick={onToggle} aria-label="Toggle theme">
          {theme === "dark" ? <LucideSun size={15} /> : <LucideMoon size={15} />}
        </button>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header className="hero" id="top">
      <div className="grid-bg" />
      <div className="wrap">
        <div className="hero-inner">
          <div className="chip"><span className="dot" /> NYC · Building for the agentic era</div>
          <h1>joeblack<span className="nyc">.nyc</span><span className="caret" aria-hidden="true"></span></h1>
          <p className="hero-sub">
            I build tools, plugins, and systems at the frontier of AI agents.
            Currently obsessed with making Claude Code smarter.
          </p>
          <div className="hero-ctas">
            <a className="btn btn-primary" href="#plugins">Explore Plugins →</a>
            <a className="btn btn-ghost" href="#connect">Get in Touch</a>
          </div>
        </div>
      </div>
    </header>
  );
}

Object.assign(window, { Nav, Hero });
