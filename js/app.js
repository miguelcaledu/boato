/* ============================================================
   BOATO — app shell: state, nav, hero, page orchestration.
   Vanilla JS port of landing.jsx + the App() bootstrap script.
   ============================================================ */

const CTA_KEYS = ["reserve", "apply", "request", "follow"];

const state = {
  lang: SETTINGS.lang === "en" ? "en" : "pt",
  reserve: null, // null | { card: object|null, paid: boolean }
  firstRender: true
};

try {
  if (new URLSearchParams(window.location.search).get("paid") === "1") {
    state.reserve = { card: null, paid: true };
  }
} catch (e) {}

function currentL() { return STRINGS[state.lang]; }
function ctaLabel() { const L = currentL(); return L.cta[SETTINGS.ctaKey] || L.cta.reserve; }

/* ---------------- Smooth-scroll to #dinners (primary CTA) ---------------- */
function goToDinners() {
  const el = document.querySelector("#dinners");
  if (!el) return;
  el.classList.add("in");
  el.querySelectorAll(".reveal").forEach((r) => r.classList.add("in"));
  const nav = document.querySelector(".lp-nav");
  const navH = nav ? nav.getBoundingClientRect().height : 0;
  const rect = el.getBoundingClientRect();
  const elTop = rect.top + window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const target = Math.max(0, Math.min(elTop - navH + 90, max));
  window.scrollTo({ top: target, behavior: "smooth" });
}

/* ---------------- Nav ---------------- */
function langToggleHTML(lang, mobile) {
  return `<div class="lp-lang${mobile ? " lp-lang--mobile" : ""}" role="group" aria-label="Language">
    <button data-lang="pt" class="${lang === "pt" ? "is-on" : ""}">PT</button>
    <span class="lp-lang__sep">/</span>
    <button data-lang="en" class="${lang === "en" ? "is-on" : ""}">EN</button>
  </div>`;
}

function navHTML() {
  const L = currentL();
  const transparent = SETTINGS.navStyle === "transparent";
  const cls = "lp-nav" + (transparent ? " is-transparent" : "");
  const links = L.nav.links.map(([l, h]) => `<a href="${h}">${l}</a>`).join("");
  return `<header class="${cls}" id="lpNav">
    <div class="wrap lp-nav__in">
      <a class="lp-logo" href="#top"><img class="lp-logo__img" src="assets/images/boato-logo.png" alt="Boato Supper Club"></a>
      <nav class="lp-nav__links">${links}</nav>
      <div class="lp-nav__right">
        <button class="lp-apply" id="navApply">${ctaLabel()}</button>
        ${langToggleHTML(state.lang, false)}
        <button class="lp-burger" id="navBurger" aria-label="Menu">☰</button>
      </div>
    </div>
    <nav class="lp-nav__mobile" id="navMobile" hidden>
      ${L.nav.links.map(([l, h]) => `<a href="${h}" data-close-menu>${l}</a>`).join("")}
      <a href="#" data-close-menu>${L.nav.login}</a>
      <a href="#" id="navMobileApply" style="color:var(--red)">${ctaLabel()}</a>
      ${langToggleHTML(state.lang, true)}
    </nav>
  </header>`;
}

function mountNav() {
  const root = document.getElementById("nav-root");
  root.innerHTML = navHTML();

  const nav = document.getElementById("lpNav");
  const burger = document.getElementById("navBurger");
  const mobile = document.getElementById("navMobile");

  burger.addEventListener("click", () => {
    const isHidden = mobile.hasAttribute("hidden");
    if (isHidden) mobile.removeAttribute("hidden"); else mobile.setAttribute("hidden", "");
    burger.textContent = isHidden ? "✕" : "☰";
  });
  nav.querySelectorAll("[data-close-menu]").forEach((a) => {
    a.addEventListener("click", () => { mobile.setAttribute("hidden", ""); burger.textContent = "☰"; });
  });
  nav.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.getAttribute("data-lang")));
  });
  document.getElementById("navApply").addEventListener("click", goToDinners);
  document.getElementById("navMobileApply").addEventListener("click", (e) => {
    e.preventDefault();
    mobile.setAttribute("hidden", "");
    burger.textContent = "☰";
    goToDinners();
  });

  if (SETTINGS.navStyle === "transparent") {
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
}

/* ---------------- Hero ---------------- */
function heroHTML() {
  const L = currentL();
  const h = L.hero;
  const serifMode = SETTINGS.headline === "serif";
  const heroCls = "lp-hero" + (SETTINGS.navStyle === "transparent" ? " is-tall" : "");

  const headline = serifMode
    ? `<h1 class="lp-headline is-serif">
        <span class="lp-serif lp-enter">${h.serif1}</span>
        <span class="lp-serif lp-enter">${h.serif2a}<span class="lp-script">${h.serifScript}</span></span>
      </h1>`
    : `<h1 class="lp-headline">
        <span class="lp-script lp-script--top lp-enter" style="font-size:62px;font-family:&quot;Cormorant Garamond&quot;;color:rgb(255,0,0)">${h.l1}</span>
        <span class="lp-serif lp-enter" style="font-size:58px;color:rgb(255,255,255)">${h.l2}</span>
        <span class="lp-script lp-script--bottom lp-enter" style="font-family:&quot;Cormorant Garamond&quot;;font-size:63px;color:rgb(255,0,0)">${h.l3}</span>
      </h1>`;

  return `<section class="${heroCls}" id="top">
    <div class="lp-hero__img" style="background-image:url(assets/images/hero-desktop.jpg)" aria-hidden="true"></div>
    <div class="lp-hero__mobimg" style="background-image:url(assets/images/hero-mobile.png)" aria-hidden="true"></div>
    <div class="lp-hero__scrim"></div>
    <div class="lp-hero__inner">
      <span class="lp-hero__eyebrow lp-enter" style="font-size:15px;color:rgb(244,240,231)">${h.eyebrow}</span>
      ${headline}
      <div class="lp-hero__cta lp-enter">
        <button class="lp-hero__btn" id="heroApply">${ctaLabel()}</button>
        <a class="lp-hero__textlink" href="#concept" style="color:rgba(0,0,0,.72);border-color:rgb(244,240,231)"><span style="color:#f4f0e7">${h.textlink}</span></a>
      </div>
    </div>
    <span class="lp-hero__meta lp-hero__meta--l">${h.metaL}</span>
    <span class="lp-hero__meta lp-hero__meta--r">${h.metaR}</span>
    <a class="lp-hero__scroll" href="#concept" aria-label="Scroll down">↓</a>
  </section>`;
}

function mountHero() {
  document.getElementById("hero-root").innerHTML = heroHTML();
  document.getElementById("heroApply").addEventListener("click", goToDinners);
}

/* ---------------- Language switch ---------------- */
function setLang(lang) {
  if (lang !== "en" && lang !== "pt") return;
  if (state.lang === lang) return;
  state.lang = lang;
  renderPage();
}

/* ---------------- Scroll-reveal ---------------- */
let revealObserver = null;
function setupRevealObserver() {
  document.documentElement.classList.add("js-anim");
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revealObserver.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
  setTimeout(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in")), 3000);
}
// Re-rendered sections (e.g. after a language switch) already appeared on
// screen once — don't replay the entrance animation, just show them.
function revealExisting() {
  document.querySelectorAll(".reveal:not(.in)").forEach((el) => el.classList.add("in"));
}

/* ---------------- Smooth in-page anchors (centers target under sticky nav) ---------------- */
function setupAnchorScroll() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute("href");
    if (!hash || hash === "#") return;
    const el = document.querySelector(hash);
    if (!el) return;
    e.preventDefault();
    if (hash === "#top") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    el.classList.add("in");
    el.querySelectorAll(".reveal").forEach((r) => r.classList.add("in"));
    const nav = document.querySelector(".lp-nav");
    const navH = nav ? nav.getBoundingClientRect().height : 0;
    const rect = el.getBoundingClientRect();
    const elTop = rect.top + window.scrollY;
    const elH = rect.height;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const fromFooter = !!a.closest(".footer") || a.classList.contains("lp-hero__textlink") || hash === "#concept" || hash === "#inquiry" || hash === "#chef";
    let target;
    if (fromFooter && hash !== "#dinners") {
      const avail = window.innerHeight - navH;
      target = elTop - navH - Math.max(0, (avail - elH) / 2);
      if (hash === "#inquiry") target += 30;
      if (hash === "#chef") target += 34;
    } else {
      target = elTop - navH;
      if (hash === "#dinners") target += 90;
    }
    target = Math.max(0, Math.min(target, max));
    window.scrollTo({ top: target, behavior: "smooth" });
  });
}

/* ---------------- Reservation modal open/close ---------------- */
function openReserve(card) {
  state.reserve = { card: card && card.title ? card : null, paid: false };
  document.body.style.overflow = "hidden";
  renderModal();
}
function closeReserve() {
  state.reserve = null;
  document.body.style.overflow = "";
  renderModal();
}

/* ---------------- Page render ---------------- */
function renderPage() {
  document.documentElement.lang = state.lang;
  document.getElementById("root").style.setProperty("--lp-script", SCRIPT_FONTS[SETTINGS.scriptFont] || SCRIPT_FONTS.Italianno);
  document.getElementById("root").style.setProperty("--lp-script-color", SETTINGS.scriptColor);
  document.getElementById("root").style.setProperty("--lp-scrim", SETTINGS.scrim);

  mountNav();
  mountHero();
  mountDinners();
  mountInquiry();
  mountConcept();
  mountChef();
  mountFooter();

  if (state.firstRender) {
    state.firstRender = false;
    setupRevealObserver();
  } else {
    revealExisting();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderPage();
  renderModal();
  setupAnchorScroll();
});
