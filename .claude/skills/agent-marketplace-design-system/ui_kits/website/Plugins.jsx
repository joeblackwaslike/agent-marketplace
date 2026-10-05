/* Plugins section — platform tabs, install snippet, filter pills, card grid */
function PluginCard({ p, platform }) {
  const cmd = `${platform} plugin install ${p.name}`;
  return (
    <article className="pcard">
      <div className="pcard-top">
        <span className={"badge badge--" + p.category}>{p.category}</span>
        <span className="ver">v{p.version}</span>
      </div>
      <h3 className="pcard-name">{p.name}</h3>
      <p className="pcard-desc">{p.description}</p>
      <div className="keywords">{p.keywords.map(k => <span key={k} className="kw">{k}</span>)}</div>
      <div className="snippet" style={{ margin: "2px 0 0", maxWidth: "none" }}>
        <span className="pmt">$</span>
        <code>{cmd}</code>
        <CopyButton text={cmd} />
      </div>
      <div className="pcard-foot">
        <span className="ver">{p.category === "execution" || p.category === "memory" ? "codex · claude" : "claude code"}</span>
        <a className="src-link" href={"https://github.com/" + p.repo} target="_blank" rel="noopener">Source →</a>
      </div>
    </article>
  );
}

function Plugins() {
  const all = window.DATA.plugins;
  const cats = ["all", ...Array.from(new Set(all.map(p => p.category)))];
  const [platform, setPlatform] = useState("claude");
  const [cat, setCat] = useState("all");
  const marketplace = `${platform} plugin marketplace add joeblackwaslike/agent-marketplace`;
  const shown = cat === "all" ? all : all.filter(p => p.category === cat);
  return (
    <section className="section" id="plugins">
      <div className="wrap">
        <Reveal className="sec-head">
          <Eyebrow>Claude Code Plugins</Eyebrow>
          <h2 className="sec-title">Built for the agentic stack.</h2>
          <p className="sec-desc">Battle-tested plugins that make your AI coding agent smarter. Install the marketplace in one command.</p>
        </Reveal>

        <div className="tabs">
          <button className={"tab" + (platform === "claude" ? " active" : "")} onClick={() => setPlatform("claude")}>Claude Code</button>
          <button className={"tab" + (platform === "codex" ? " active" : "")} onClick={() => setPlatform("codex")}>Codex CLI</button>
        </div>

        <Snippet cmd={marketplace} />

        <div className="filters">
          <span className="filters-label">Filter</span>
          <div className="pills">
            {cats.map(c => (
              <button key={c} className={"pill" + (cat === c ? " active" : "")} onClick={() => setCat(c)}>
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
        </div>

        <div className="plugin-grid">
          {shown.map(p => <PluginCard key={p.name} p={p} platform={platform} />)}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Plugins, PluginCard });
