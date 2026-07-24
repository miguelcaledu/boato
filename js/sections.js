/* ============================================================
   BOATO — Concept, Dinners, Chef, Inquiry, Footer sections.
   Vanilla JS port of components.jsx + the non-modal parts of sections.jsx.
   ============================================================ */

const CHEF_IMG = "assets/images/chef-miguel-v2.jpg";

// i18n.js keeps the design source's original "uploads/…" video paths verbatim;
// map them to where the files actually live in this build.
const VIDEO_MAP = {
  "uploads/supperclub.mp4": "assets/video/supperclub.mp4",
  "uploads/0612.mp4": "assets/video/0612.mp4",
  "uploads/corporate.mp4": "assets/video/corporate.mp4",
  "uploads/privado.mp4": "assets/video/privado.mp4"
};
function resolveVideo(v) { return (v && VIDEO_MAP[v]) || v; }

/* ---------------- Concept ---------------- */
function mountConcept() {
  const L = currentL();
  const c = L.concept;
  const principles = c.principles.map(([n, t, d]) => `
    <div class="principle">
      <span class="n">${n}</span>
      <h4>${t}</h4>
      <p>${d}</p>
    </div>`).join("");

  document.getElementById("concept-root").innerHTML = `
    <section class="section section--alt" id="concept">
      <div class="wrap">
        <div class="concept reveal">
          <p class="concept__lead" style="font-size:34px">${c.leadA}<em>${c.leadEm}</em>${c.leadB}</p>
          <div class="concept__body"><p style="font-weight:100">${c.p1}</p></div>
        </div>
        <div class="principles reveal">${principles}</div>
      </div>
    </section>`;
}

/* ---------------- Dinners ---------------- */
function eventCardMediaHTML(d, L) {
  if (d.video) {
    return `<video class="ecard__video" muted autoplay loop playsinline preload="auto"></video>`;
  }
  // Fallback when a card has no video: the card's own gradient field.
  return `<div style="background:${d.bg || "#1B1916"}"></div>`;
}

function eventCardHTML(d, L) {
  const full = d.date && window.isDateFull && window.isDateFull(d.date);
  const tagCls = "ecard__tag" + (d.sold || full ? " ecard__tag--sold" : "");
  const tagLabel = d.date && window.seatsLeft
    ? (window.isDateFull(d.date) ? L.modal.calFull : window.seatsLeftLabel(window.seatsLeft(d.date), L.modal))
    : d.tag;
  const addr = d.hideAddr ? "" : `<br>${L.dinners.addr}`;
  const cta = d.cta || (d.sold ? L.dinners.waitlist : L.dinners.reserve);
  const isGreens = d.date === "2026-09-18";
  const titleHTML = isGreens
    ? `<span style="color:#DF0000">Boato</span> x <span style="color:#67863E">GreensandNuts</span>`
    : d.title;
  return `<article class="ecard" data-ed="${d.ed}">
    <div class="ecard__img">
      ${eventCardMediaHTML(d, L)}
      <span class="${tagCls}" style="background-color:rgba(12,11,10,.7)">${tagLabel}</span>
    </div>
    <div class="ecard__b">
      <span class="eyebrow">${d.sub}</span>
      <h3 style="font-size:22px">${titleHTML}</h3>
      <div class="ecard__meta" style="font-size:10px">${d.meta}${addr}</div>
      <div class="ecard__foot">
        <span class="ecard__price">${d.price}</span>
        <span class="tlink">${cta}</span>
      </div>
    </div>
  </article>`;
}

function mountDinners() {
  const L = currentL();
  const cards = L.dinners.cards.map((d) => eventCardHTML(d, L)).join("");
  const b = L.dinners.band;

  document.getElementById("dinners-root").innerHTML = `
    <section class="section section--alt" id="dinners">
      <div class="wrap">
        <div class="section__head reveal">
          <span class="eyebrow">${L.dinners.eyebrow}</span>
          <h2>${L.dinners.title}</h2>
        </div>
        <div class="dinners reveal">${cards}</div>
        <div class="waitband reveal" id="waitband">
          <div class="waitband__copy">
            <h3 style="font-size:36px;font-weight:400">${b.title}</h3>
            <p style="font-weight:100;color:#322E28">${b.text}</p>
          </div>
          <form class="waitband__form" id="waitbandForm">
            <input name="Email" type="email" required placeholder="${b.ph}" aria-label="${b.ph}">
            <button type="submit" class="btn btn--ink">${b.button}</button>
          </form>
        </div>
      </div>
    </section>`;

  bindEventCardClicks();
  bindEventCardVideos(L);
  bindWaitlistForm(b);
}

function bindEventCardClicks() {
  const L = currentL();
  document.querySelectorAll("#dinners-root .ecard").forEach((card) => {
    const d = L.dinners.cards.find((c) => c.ed === card.getAttribute("data-ed"));
    card.addEventListener("click", () => openReserve(d));
  });
}

// Some hosts serve video without byte-range support, which a streaming
// <video src> rejects. Fetch as a blob and play from an object URL. Also
// force playback on stubborn mobile browsers (muted+playsinline, resume on
// pause, play on first user gesture / when scrolled into view).
function bindEventCardVideos(L) {
  document.querySelectorAll("#dinners-root .ecard").forEach((card) => {
    const d = L.dinners.cards.find((c) => c.ed === card.getAttribute("data-ed"));
    const video = card.querySelector(".ecard__video");
    if (!video || !d || !d.video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    const src = resolveVideo(d.video);
    video.src = src;

    const tryPlay = () => { try { const p = video.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
    // Play the direct URL by default; only fall back to fetch-as-blob (for
    // hosts that reject a streaming <video src> without byte-range support)
    // if direct playback actually fails.
    let triedBlobFallback = false;
    video.addEventListener("error", () => {
      if (triedBlobFallback) return;
      triedBlobFallback = true;
      fetch(src).then((r) => r.blob()).then((b) => { video.src = URL.createObjectURL(b); tryPlay(); }).catch(() => {});
    });

    tryPlay();
    video.addEventListener("loadeddata", tryPlay);
    video.addEventListener("canplay", tryPlay);
    video.addEventListener("pause", () => { if (!video.ended || video.loop) tryPlay(); });
    video.addEventListener("stalled", tryPlay);
    if (typeof IntersectionObserver !== "undefined") {
      new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) tryPlay(); }), { threshold: 0.1 }).observe(video);
    }
    document.addEventListener("touchstart", tryPlay, { passive: true });
    document.addEventListener("pointerdown", tryPlay, { passive: true });
    document.addEventListener("visibilitychange", tryPlay);
  });
}

function bindWaitlistForm(b) {
  const form = document.getElementById("waitbandForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendFormEmail(form, "New waitlist signup — Boato");
    const band = document.getElementById("waitband");
    form.outerHTML = `<p class="waitband__done">${b.done}</p>`;
  });
}

/* ---------------- Chef ---------------- */
function mountChef() {
  const L = currentL();
  const c = L.chef;
  document.getElementById("chef-root").innerHTML = `
    <section class="section section--ink" id="chef">
      <div class="wrap">
        <div class="chef reveal">
          <div class="chef__portrait" style="background-image:url(${CHEF_IMG})"></div>
          <div class="chef__body">
            <span class="eyebrow">${c.eyebrow}</span>
            <h2>${c.name}</h2>
            <p style="font-weight:100">${c.p1}</p>
            <p style="font-weight:100">${c.p2}</p>
            <blockquote class="chef__quote" style="font-size:24px">${c.quote}</blockquote>
          </div>
        </div>
      </div>
    </section>`;
}

/* ---------------- Inquiry ---------------- */
function mountInquiry() {
  const L = currentL();
  const q = L.inquiry;
  const types = q.types.map(([t, d]) => `<div>${t}<span>${d}</span></div>`).join("");
  const includes = q.includes
    ? `<div class="inquiry__includes"><h4>${q.includesH}</h4><ul>${q.includes.map((it) => `<li>${it}</li>`).join("")}</ul></div>`
    : "";
  const typeOpts = q.typeOpts.map((o) => `<option>${o}</option>`).join("");

  document.getElementById("inquiry-root").innerHTML = `
    <section class="section" id="inquiry">
      <div class="wrap inquiry">
        <div class="inquiry__copy reveal">
          <span class="eyebrow">${q.eyebrow}</span>
          <h2>${q.title}</h2>
          <p style="font-weight:100">${q.body}</p>
          <div class="inquiry__types">${types}</div>
          ${includes}
        </div>
        <div class="formcard reveal" id="inquiryFormcard">
          <form id="inquiryForm">
            <div class="field-row">
              <div class="field"><label>${q.fName}</label><input name="Name" required placeholder="${q.phName}"></div>
              <div class="field"><label>${q.fEmail}</label><input name="Email" required type="email" placeholder="${q.phEmail}"></div>
            </div>
            <div class="field"><label>${q.fPhone}</label><input name="Phone" type="tel" placeholder="${q.phPhone}"></div>
            <div class="field-row">
              <div class="field"><label>${q.fType}</label><select name="Type">${typeOpts}</select></div>
              <div class="field"><label>${q.fGuests}</label>
                <select name="Guests"><option>2–4</option><option>5–8</option><option>9–14</option><option>15+</option></select></div>
            </div>
            <div class="field"><label>${q.fOccasion}</label><textarea name="Occasion" rows="3" placeholder="${q.phOccasion}"></textarea></div>
            <button type="submit" class="btn btn--ink btn--block">${q.submit}</button>
          </form>
        </div>
      </div>
    </section>`;

  const form = document.getElementById("inquiryForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await sendFormEmail(form, "New private/corporate inquiry — Boato");
    document.getElementById("inquiryFormcard").innerHTML = `
      <div style="padding:20px 4px;text-align:center">
        <div style="font-family:var(--font-display);font-size:2.6rem;color:var(--red)">—</div>
        <h3 style="font-family:var(--font-display);font-weight:400;font-size:1.8rem;margin:10px 0 8px">${q.sentTitle}</h3>
        <p style="color:var(--ink-2);line-height:1.6">${q.sentBody}</p>
      </div>`;
  });
}

/* ---------------- Footer ---------------- */
function mountFooter() {
  const L = currentL();
  const f = L.footer;
  const explore = f.explore.map(([l, h]) => `<li><a href="${h}">${l}</a></li>`).join("");
  const reach = f.reach.map(([l, h]) => `<li><a href="${h}">${l}</a></li>`).join("");

  document.getElementById("footer-root").innerHTML = `
    <footer class="footer">
      <div class="wrap">
        <div class="footer__grid">
          <div>
            <div class="footer__word">boato</div>
            <div class="footer__tag">${f.tag}</div>
          </div>
          <div><h5>${f.exploreH}</h5><ul>${explore}</ul></div>
          <div><h5>${f.reachH}</h5><ul>${reach}</ul></div>
          <div class="footer__news">
            <h5>${f.newsH}</h5>
            <p style="color:var(--on-invert-muted);font-size:14px;margin:0 0 14px;line-height:1.5">${f.newsP}</p>
            <form id="newsletterForm">
              <input name="Email" type="email" required placeholder="${f.newsPh}">
              <button type="submit" class="btn btn--red">${f.subscribe}</button>
            </form>
          </div>
        </div>
        <div class="footer__base">
          <span class="meta">${f.copy}</span>
          <span class="meta">${f.place}</span>
        </div>
      </div>
    </footer>`;

  const form = document.getElementById("newsletterForm");
  const input = form.querySelector("input");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = await sendFormEmail(form, "New newsletter signup — Boato");
    form.reset();
    input.placeholder = ok ? "✓ " + f.newsPh : f.newsPh;
  });
}
