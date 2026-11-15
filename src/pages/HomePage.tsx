import "./HomePage.css";

function SceneMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="4" width="18" height="14" rx="3" />
      <path d="M8 21h8M12 18v3M7 9h4v5H7zM14 9h3m-3 4h3" />
    </svg>
  );
}

const features = [
  { number: "01", title: "Build visually", description: "Add interface elements to your scene and drag them into place. Go from a blank canvas to a dashboard, one component at a time.", type: "layout" },
  { number: "02", title: "Dial in the details", description: "Select any element to inspect its position and dimensions. Keep your layout intentional, right down to the pixel.", type: "details" },
  { number: "03", title: "Design for the drive", description: "Explore ideas on a dedicated infotainment canvas. Bring buttons, controls, and screen layouts together in one focused workspace.", type: "screen" },
];

export function HomePage() {
  return (
    <div className="home-page">
      <header className="home-header">
        <a className="home-brand" href="/" aria-label="Infotainment Scene Builder home">
          <span className="home-brand-icon"><SceneMark /></span>
          <span>SCENE<span className="home-brand-light">BUILDER</span></span>
        </a>
        <nav className="home-auth" aria-label="Account">
          <a className="home-login" href="/login">Log in</a>
          <a className="home-button home-button-small" href="/login?mode=signup">Sign up <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      <main className="home-main">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <p className="home-kicker"><span /> A workspace for what’s next</p>
            <h1 id="home-title">Infotainment<br /><span>Scene Builder</span><span className="home-title-dot">.</span></h1>
            <p className="home-intro">Your next in-car experience starts here. Shape interfaces, arrange controls, and turn dashboard ideas into scenes worth exploring.</p>
            <div className="home-hero-actions">
              <a className="home-button" href="/editor">Open the builder <span aria-hidden="true">↗</span></a>
              <a className="home-explore" href="#possibilities">Explore the possibilities <span aria-hidden="true">↓</span></a>
            </div>
            <p className="home-note"><span aria-hidden="true">✓</span> Jump right in. No account required.</p>
          </div>

          <div className="home-preview" role="img" aria-label="Illustrative infotainment scene with navigation, music, and climate controls">
            <div className="home-preview-bar"><span><i /> SCENE PREVIEW</span><span>01 / COCKPIT</span></div>
            <div className="home-dashboard">
              <div className="home-dashboard-top"><span>09:41</span><span>MONDAY, JUNE 24</span><span>21° <span className="home-signal">▂▄▆</span></span></div>
              <div className="home-dashboard-grid">
                <div className="home-map">
                  <div className="home-map-grid" />
                  <div className="home-map-road home-map-road-one" /><div className="home-map-road home-map-road-two" />
                  <div className="home-map-route" />
                  <span className="home-map-label">DOWNTOWN</span>
                  <span className="home-map-pin">➤</span>
                  <div className="home-map-direction"><span aria-hidden="true">↱</span><div><strong>Your next turn</strong><small>350 m · Market Street</small></div></div>
                  <div className="home-map-arrival"><strong>12 <small>min</small></strong><span>4.8 km · 09:53 arrival</span><span className="home-map-live">LIVE</span></div>
                </div>
                <div className="home-music">
                  <div className="home-album"><span /><span /><span /><span /></div>
                  <p className="home-music-caption">A LITTLE BACKGROUND</p>
                  <strong>Along the way</strong><span className="home-music-artist">Your daily soundtrack</span>
                  <div className="home-music-progress"><span /></div>
                  <div className="home-music-controls"><span>↶</span><span className="home-music-play">Ⅱ</span><span>↷</span></div>
                </div>
              </div>
              <div className="home-climate"><span>⌘ <small>HOME</small></span><span>21.5° <small>DRIVER</small></span><span className="home-climate-auto">AUTO</span><span>21.5° <small>PASSENGER</small></span><span>☼ <small>CLIMATE</small></span></div>
            </div>
            <div className="home-preview-footer"><span><span className="home-status-dot" /> A little inspiration. An open canvas.</span><span>1280 × 720</span></div>
          </div>
        </section>

        <section className="home-features" id="possibilities" aria-labelledby="features-title">
          <div className="home-section-heading"><div><p className="home-kicker">From concept to canvas</p><h2 id="features-title">Less friction. More creation.</h2></div><p>The tools you need to give your ideas a place to start.</p></div>
          <div className="home-feature-grid">
            {features.map((feature) => (
              <article className="home-feature-card" key={feature.number}>
                <div className="home-feature-top"><span className={`home-feature-icon home-feature-icon-${feature.type}`} aria-hidden="true">{feature.type === "layout" ? "⊞" : feature.type === "details" ? "⌖" : <SceneMark />}</span><span className="home-feature-number">/ {feature.number}</span></div>
                <h3>{feature.title}</h3><p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="home-footer"><span>Infotainment Scene Builder</span><span>Made for the ideas ahead.<span aria-hidden="true"> ↗</span></span></footer>
    </div>
  );
}
