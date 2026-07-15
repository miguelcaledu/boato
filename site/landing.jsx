/* Boato — landing page hero + nav (reference-style, bilingual). */

/* ---------------- Language toggle ---------------- */
function LangToggle({ lang, onLang, className = "" }) {
  return (
    <div className={"lp-lang " + className} role="group" aria-label="Language">
      <button className={lang === "pt" ? "is-on" : ""} onClick={() => onLang("pt")}>PT</button>
      <span className="lp-lang__sep">/</span>
      <button className={lang === "en" ? "is-on" : ""} onClick={() => onLang("en")}>EN</button>
    </div>);

}

/* ---------------- Nav ---------------- */
function LpNav({ onReserve, tweaks, L, lang, onLang, ctaLabel }) {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const transparent = tweaks.navStyle === "transparent";

  React.useEffect(() => {
    if (!transparent) {setScrolled(false);return;}
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  const cls = "lp-nav" + (transparent ? " is-transparent" : "") + (transparent && scrolled ? " is-scrolled" : "");

  return (
    <header className={cls}>
      <div className="wrap lp-nav__in">
        <a className="lp-logo" href="#top">
          <img className="lp-logo__img" src={window.__resources && window.__resources.boatoLogo || "site/assets/boato-logo.png"} alt="Boato Supper Club" />
        </a>
        <nav className="lp-nav__links">
          {L.nav.links.map(([l, h]) => <a key={h} href={h}>{l}</a>)}
        </nav>
        <div className="lp-nav__right">
          <button className="lp-apply" onClick={onReserve}>{ctaLabel}</button>
          <LangToggle lang={lang} onLang={onLang} />
          <button className="lp-burger" onClick={() => setOpen((o) => !o)} aria-label="Menu">{open ? "✕" : "☰"}</button>
        </div>
      </div>
      {open &&
      <nav className="lp-nav__mobile">
          {L.nav.links.map(([l, h]) => <a key={h} href={h} onClick={() => setOpen(false)}>{l}</a>)}
          <a href="#" onClick={() => setOpen(false)}>{L.nav.login}</a>
          <a href="#" onClick={(e) => {e.preventDefault();setOpen(false);onReserve();}} style={{ color: "var(--red)" }}>{ctaLabel}</a>
          <LangToggle lang={lang} onLang={(v) => {onLang(v);setOpen(false);}} className="lp-lang--mobile" />
        </nav>
      }
    </header>);

}

/* ---------------- Hero ---------------- */
function LpHero({ onReserve, tweaks, L, ctaLabel }) {
  const h = L.hero;
  const serifMode = tweaks.headline === "serif";
  return (
    <section className={"lp-hero" + (tweaks.navStyle === "transparent" ? " is-tall" : "")} id="top">
      <div className="lp-hero__img" style={{ backgroundImage: `url(${window.__resources && window.__resources.heroDesktop || "uploads/hero-desktop.jpg"})` }} aria-hidden="true"></div>
      <div className="lp-hero__mobimg" style={{ backgroundImage: `url(${window.__resources && window.__resources.heroMobile || "site/assets/hero-mobile.png"})` }} aria-hidden="true"></div>
      <div className="lp-hero__scrim"></div>

      <div className="lp-hero__inner">
        <span className="lp-hero__eyebrow lp-enter" style={{ fontSize: "15px", color: "rgb(244, 240, 231)" }}>{h.eyebrow}</span>
        {serifMode ?
        <h1 className="lp-headline is-serif">
            <span className="lp-serif lp-enter">{h.serif1}</span>
            <span className="lp-serif lp-enter">{h.serif2a}<span className="lp-script">{h.serifScript}</span></span>
          </h1> :

        <h1 className="lp-headline">
            <span className="lp-script lp-script--top lp-enter" style={{ fontSize: "62px", fontFamily: "\"Cormorant Garamond\"", color: "rgb(255, 0, 0)" }}>{h.l1}</span>
            <span className="lp-serif lp-enter" style={{ fontSize: "58px", color: "rgb(255, 255, 255)" }}>{h.l2}</span>
            <span className="lp-script lp-script--bottom lp-enter" style={{ fontFamily: "\"Cormorant Garamond\"", fontSize: "63px", color: "rgb(255, 0, 0)" }}>{h.l3}</span>
          </h1>
        }
        <div className="lp-hero__cta lp-enter">
          <button className="lp-hero__btn" onClick={onReserve}>{ctaLabel}</button>
          <a className="lp-hero__textlink" href="#concept" style={{ color: "rgba(0, 0, 0, 0.72)", borderColor: "rgb(244, 240, 231)" }}><span style={{ color: "#f4f0e7" }}>{h.textlink}</span></a>
        </div>
      </div>

      <span className="lp-hero__meta lp-hero__meta--l">{h.metaL}</span>
      <span className="lp-hero__meta lp-hero__meta--r">{h.metaR}</span>
      <a className="lp-hero__scroll" href="#concept" aria-label="Scroll down">↓</a>
    </section>);

}

Object.assign(window, { LpNav, LpHero, LangToggle });