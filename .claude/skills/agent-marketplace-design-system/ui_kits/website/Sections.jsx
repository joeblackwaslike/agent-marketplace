/* Writing · Projects (+ Nursery) · Connect · Footer */

function Writing() {
  return (
    <section className="section section--alt" id="writing">
      <div className="wrap">
        <Reveal className="sec-head">
          <Eyebrow>Writing</Eyebrow>
          <h2 className="sec-title">Notes from the frontier.</h2>
        </Reveal>
        <Reveal className="writing">
          {window.DATA.writing.map((w, i) => (
            <a className="wrow" key={i} href="#">
              <span className="wtag">{w.tag}</span>
              <span className="wtitle">{w.title}</span>
              <span className="wmeta">{w.read}</span>
            </a>
          ))}
        </Reveal>
        <a className="btn btn-ghost btn-sm more" href="#">All posts →</a>
      </div>
    </section>
  );
}

function ProjMark({ mark }) {
  const known = ["javascript", "typescript", "python", "claude"];
  if (known.includes(mark)) return <span className="proj-mark"><Brand name={mark} className="" /></span>;
  return <span className="proj-mark">{mark}</span>;
}

function Projects() {
  return (
    <section className="section" id="projects">
      <div className="wrap">
        <Reveal className="sec-head">
          <Eyebrow>Projects</Eyebrow>
          <h2 className="sec-title">Things I've shipped.</h2>
        </Reveal>

        {window.DATA.projects.map(grp => (
          <Reveal key={grp.group}>
            <div className="grp-label">{grp.group}</div>
            <div className="proj-grid">
              {grp.items.map(p => (
                <article className="proj" key={p.name}>
                  <div className="proj-top">
                    <ProjMark mark={p.mark} />
                    <div className="ptext">
                      <div className="proj-name">{p.name}</div>
                      <div className="proj-lang">{p.lang}</div>
                    </div>
                  </div>
                  <p className="proj-desc">{p.desc}</p>
                  <a className="proj-link" href="#" target="_blank" rel="noopener">View on GitHub →</a>
                </article>
              ))}
            </div>
          </Reveal>
        ))}

        <Reveal>
          <div className="grp-label" style={{ marginTop: "52px" }}>Nursery · Things I'm hatching</div>
          <div className="proj-grid">
            {window.DATA.nursery.map(p => (
              <article className="proj proj--nursery" key={p.name}>
                <div className="proj-top">
                  <span className="proj-mark">◴</span>
                  <div className="ptext">
                    <div className="proj-name">{p.name}</div>
                    <div className="proj-lang">{p.lang}</div>
                  </div>
                  <span className="nbadge">incubating</span>
                </div>
                <p className="proj-desc">{p.desc}</p>
                <a className="proj-link" href="#" target="_blank" rel="noopener">Track issue →</a>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Connect() {
  return (
    <section className="section section--alt" id="connect">
      <div className="wrap">
        <Reveal className="sec-head">
          <Eyebrow>Connect</Eyebrow>
          <h2 className="sec-title">Find me on the internet.</h2>
        </Reveal>
        <Reveal className="connect-grid">
          {window.DATA.connect.map(c => (
            <a className="ccard" key={c.name} href="#" target="_blank" rel="noopener">
              <span className="ccard-ic"><Brand name={c.icon} className="" /></span>
              <span className="ccard-name">{c.name}</span>
              <span className="ccard-handle">{c.handle}</span>
            </a>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-in">
        <span className="footer-mark">joeblack<span className="tld">.nyc</span></span>
        <span className="footer-sep">/</span>
        <span>© Joe Black</span>
        <span className="footer-sep">/</span>
        <span>New York</span>
        <a className="right" href="https://github.com/joeblackwaslike/agent-marketplace" target="_blank" rel="noopener">MIT License ↗</a>
      </div>
    </footer>
  );
}

Object.assign(window, { Writing, Projects, Connect, Footer });
