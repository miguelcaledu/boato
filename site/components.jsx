/* Boato — website UI kit components (bilingual).
   Loaded after React + Babel + i18n. Sections read copy from the `L` prop. */

const IMG = window.__resources && window.__resources.logoBadge || "site/assets/logo-badge.jpg";
const CHEF_IMG = window.__resources && window.__resources.chefMiguel || "site/assets/chef-miguel-v2.jpg";

// Dinner-card videos are referenced as strings in i18n data, so map their
// paths to bundled blob URLs when running as a standalone file.
const VIDEO_MAP = window.__resources ? {
  "uploads/supperclub.mp4": window.__resources.vidSupper,
  "uploads/0612.mp4": window.__resources.vidPopup,
  "uploads/corporate.mp4": window.__resources.vidCorporate,
  "uploads/privado.mp4": window.__resources.vidPrivado
} : {};
const resolveVideo = (v) => v && VIDEO_MAP[v] || v;

/* ---------------- Primitives ---------------- */
function Eyebrow({ children, className = "" }) {
  return <span className={"eyebrow " + className}>{children}</span>;
}
function Btn({ variant = "red", children, className = "", ...p }) {
  return <button className={`btn btn--${variant} ${className}`} {...p}>{children}</button>;
}

/* ---------------- Concept ---------------- */
function Concept({ L }) {
  const c = L.concept;
  return (
    <section className="section section--alt" id="concept">
      <div className="wrap">
        <div className="concept reveal">
          <p className="concept__lead" style={{ fontSize: "34px" }}>{c.leadA}<em>{c.leadEm}</em>{c.leadB}</p>
          <div className="concept__body">
            <p style={{ fontWeight: 100 }}>{c.p1}</p>
          </div>
        </div>
        <div className="principles reveal">
          {c.principles.map(([n, t, d]) =>
          <div className="principle" key={n} style={{ opacity: "1", backgroundColor: "rgb(244, 240, 231)", padding: "26px" }}>
              <span className="n">{n}</span>
              <h4>{t}</h4>
              <p>{d}</p>
            </div>
          )}
        </div>
      </div>
    </section>);

}

/* ---------------- Dinners ---------------- */
function EventCard({ d, L, onReserve }) {
  // Some hosts serve video without Content-Length / byte-range support, which a
  // streaming <video src> rejects. Fetch as a blob and play from an object URL.
  const [vurl, setVurl] = React.useState("");
  const vidRef = React.useRef(null);
  React.useEffect(() => {
    if (!d.video) return;
    const srcUrl = resolveVideo(d.video);
    let url = "";
    let alive = true;
    fetch(srcUrl).
    then((r) => r.blob()).
    then((b) => {if (!alive) return;url = URL.createObjectURL(b);setVurl(url);}).
    catch(() => {});
    return () => {alive = false;if (url) URL.revokeObjectURL(url);};
  }, [d.video]);

  // Force playback and keep it going. iOS Safari is strict: the element must be
  // muted + playsinline, and React doesn't reliably emit the `muted` attribute,
  // so we set it on the node. We also (a) play when the card scrolls into view,
  // (b) immediately resume if anything pauses it, and (c) play on the first user
  // tap anywhere — covers Low Power Mode and other autoplay blocks.
  React.useEffect(() => {
    const el = vidRef.current;
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute("muted", "");
    el.setAttribute("playsinline", "");
    const tryPlay = () => { try { const p = el.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };

    tryPlay();
    const onPause = () => { if (!el.ended || el.loop) tryPlay(); };
    el.addEventListener("loadeddata", tryPlay);
    el.addEventListener("canplay", tryPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("stalled", tryPlay);

    // Play when the card enters the viewport.
    let io = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) tryPlay(); });
      }, { threshold: 0.1 });
      io.observe(el);
    }

    // First user gesture unlocks playback on stubborn mobile browsers.
    const onGesture = () => tryPlay();
    document.addEventListener("touchstart", onGesture, { passive: true });
    document.addEventListener("pointerdown", onGesture, { passive: true });
    document.addEventListener("visibilitychange", tryPlay);

    return () => {
      el.removeEventListener("loadeddata", tryPlay);
      el.removeEventListener("canplay", tryPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("stalled", tryPlay);
      if (io) io.disconnect();
      document.removeEventListener("touchstart", onGesture);
      document.removeEventListener("pointerdown", onGesture);
      document.removeEventListener("visibilitychange", tryPlay);
    };
  }, [vurl]);
  return (
    <article className="ecard" onClick={() => onReserve(d)}>
      <div className="ecard__img">
        {d.video ?
        <video
          className="ecard__video"
          src={vurl || resolveVideo(d.video)}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          ref={(el) => {vidRef.current = el;if (el) {el.muted = true;el.volume = 0;el.defaultMuted = true;}}}>
        </video> :
        <image-slot
          id={"boato-dinner-" + d.ed.replace(/\D/g, "")}
          shape="rect"
          fit="cover"
          style={{ "--slot-bg": d.bg }}
          placeholder={L.code === "PT" ? "Largue uma foto do prato" : "Drop a dish photo"}>
        </image-slot>
        }
        <span className={"ecard__tag" + (d.sold ? " ecard__tag--sold" : "")} style={{ backgroundColor: "rgba(12, 11, 10, 0.7)" }}>{d.tag}</span>
      </div>
      <div className="ecard__b">
        <Eyebrow>{d.sub}</Eyebrow>
        <h3 style={{ fontSize: "22px" }}>{d.title}</h3>
        <div className="ecard__meta" style={{ fontSize: "10px" }}>{d.meta}{d.hideAddr ? "" : <React.Fragment><br />{L.dinners.addr}</React.Fragment>}</div>
        <div className="ecard__foot">
          <span className="ecard__price">{d.price}</span>
          <span className="tlink">{d.cta || (d.sold ? L.dinners.waitlist : L.dinners.reserve)}</span>
        </div>
      </div>
    </article>);

}
function Dinners({ L, onReserve }) {
  return (
    <section className="section section--alt" id="dinners">
      <div className="wrap">
        <div className="section__head reveal">
          <Eyebrow>{L.dinners.eyebrow}</Eyebrow>
          <h2>{L.dinners.title}</h2>
        </div>
        <div className="dinners reveal">
          {L.dinners.cards.map((d) => <EventCard key={d.ed} d={d} L={L} onReserve={onReserve} />)}
        </div>
        <WaitlistBand L={L} />
      </div>
    </section>);

}
function WaitlistBand({ L }) {
  const [sent, setSent] = React.useState(false);
  const b = L.dinners.band;
  const submit = (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    setSent(true);
    if (window.sendFormEmail) window.sendFormEmail(f, "New waitlist signup — Boato");
  };
  return (
    <div className="waitband reveal">
      <div className="waitband__copy">
        <h3 style={{ fontSize: "36px", fontWeight: 400 }}>{b.title}</h3>
        <p style={{ fontWeight: 100, color: "#322E28" }}>{b.text}</p>
      </div>
      {sent ?
      <p className="waitband__done">{b.done}</p> :

      <form className="waitband__form" onSubmit={submit}>
          <input name="Email" type="email" required placeholder={b.ph} aria-label={b.ph} />
          <Btn variant="ink" type="submit">{b.button}</Btn>
        </form>
      }
    </div>);

}

/* ---------------- Chef ---------------- */
function Chef({ L }) {
  const c = L.chef;
  return (
    <section className="section section--ink" id="chef">
      <div className="wrap">
        <div className="chef reveal">
          <div className="chef__portrait" style={{ backgroundImage: `url(${CHEF_IMG})` }}></div>
          <div className="chef__body">
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h2>{c.name}</h2>
            <p style={{ fontWeight: 100 }}>{c.p1}</p>
            <p style={{ fontWeight: 100 }}>{c.p2}</p>
            <blockquote className="chef__quote" style={{ fontSize: "24px" }}>{c.quote}</blockquote>
          </div>
        </div>
      </div>
    </section>);

}

/* ---------------- Menu ---------------- */
function Menu({ L }) {
  const m = L.menu;
  return (
    <section className="section" id="menu">
      <div className="wrap menu">
        <div className="menu__head reveal">
          <Eyebrow>{m.eyebrow}</Eyebrow>
          <h2>{m.title}</h2>
          <span className="meta">{m.pairing}</span>
        </div>
        <div className="reveal">
          {m.courses.map(([n, dish, desc]) =>
          <div className="course" key={n}>
              <span className="num">{n}</span>
              <div><div className="dish">{dish}</div><div className="desc">{desc}</div></div>
            </div>
          )}
        </div>
        <p className="menu__note reveal">{m.note}</p>
      </div>
    </section>);

}

Object.assign(window, { Eyebrow, Btn, Concept, Dinners, EventCard, Chef, Menu, WaitlistBand });