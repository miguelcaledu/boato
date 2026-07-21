/* ============================================================
   BOATO — reservation modal + calendar.
   Vanilla JS port of the Calendar / ReserveModal components in sections.jsx.
   ============================================================ */

// i18n.js keeps the design source's original "site/assets/…" image path
// verbatim; map it to where the file actually lives in this build.
const IMAGE_MAP = {
  "site/assets/popup-sakra-11-sharp.png": "assets/images/popup-sakra-11-sharp.png"
};
function resolveImage(v) { return (v && IMAGE_MAP[v]) || v; }

let modalState = null;

function resetModalState() {
  modalState = {
    for: state.reserve,
    step: state.reserve.paid ? 2 : 0,
    date: "",
    popup: null,
    err: false,
    sendErr: false,
    submitting: false,
    booking: null,
    calView: null
  };
}

function renderModal() {
  const root = document.getElementById("modal-root");
  if (!state.reserve) { root.innerHTML = ""; modalState = null; return; }
  if (!modalState || modalState.for !== state.reserve) resetModalState();
  root.innerHTML = modalHTML();
  bindModalEvents();
}

function calendarMonths(dates) {
  return [...new Set(dates.slice().sort().map((a) => a.slice(0, 7)))];
}

function calendarHTML(dates, value, loc, none) {
  const avail = dates.slice().sort();
  const months = calendarMonths(dates);
  if (!modalState.calView) {
    const base = value || avail[0];
    const [y, mo] = base.split("-").map(Number);
    modalState.calView = { y, m: mo - 1 };
  }
  const view = modalState.calView;
  const curKey = view.y + "-" + String(view.m + 1).padStart(2, "0");
  const idx = months.indexOf(curKey);
  const monthLabel = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }).format(new Date(view.y, view.m, 1));
  const wd = [];
  for (let i = 0; i < 7; i++) wd.push(new Intl.DateTimeFormat(loc, { weekday: "short" }).format(new Date(2024, 0, 1 + i)));
  const startOffset = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const availSet = new Set(avail);
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const iso = (d) => view.y + "-" + String(view.m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");

  const cellsHTML = cells.map((d) => {
    if (!d) return `<span class="cal__cell cal__cell--empty"></span>`;
    const k = iso(d);
    const inAvail = availSet.has(k);
    const full = inAvail && isDateFull(k);
    const ok = inAvail && !full;
    const sel = value === k;
    const cls = "cal__cell" + (ok ? " is-avail" : "") + (full ? " is-full" : "") + (sel ? " is-sel" : "") + (sel && k === "2026-09-11" ? " is-sel-green" : "");
    return `<button type="button" class="${cls}" data-date="${k}" ${ok ? "" : "disabled"} title="${full ? (none || "") : ""}">${d}</button>`;
  }).join("");

  return `<div class="cal">
    <div class="cal__head">
      <button type="button" class="cal__nav" data-cal-nav="-1" ${idx <= 0 ? "disabled" : ""} aria-label="−">←</button>
      <span class="cal__month">${monthLabel}</span>
      <button type="button" class="cal__nav" data-cal-nav="1" ${idx >= months.length - 1 ? "disabled" : ""} aria-label="+">→</button>
    </div>
    <div class="cal__grid cal__wd">${wd.map((w) => `<span>${w}</span>`).join("")}</div>
    <div class="cal__grid">${cellsHTML}</div>
  </div>`;
}

function modalContext() {
  const L = currentL();
  const m = L.modal;
  const card = state.reserve.card;
  const paid = state.reserve.paid;
  const loc = L.code === "PT" ? "pt-PT" : "en-GB";
  const isPopup = !!(card && card.kind === "popup");
  const isPrivateCard = !!(card && /corporate|privad|private/i.test(card.title || ""));
  const seatOpts = isPrivateCard ? ["2–4", "5–8", "9–14", "15+"] : m.seatOpts;
  const withCal = !card || !card.cta;
  const showGrid = isPopup && !modalState.popup;
  const popup = modalState.popup;
  const popupLabel = popup ? popup.name + " · " + popup.date + " · " + popup.place : "";
  const titleText = popup ? popup.name
    : (modalState.date === "2026-09-11" && !isPrivateCard && !isPopup ? "Boato x GreensandNuts"
      : (card && card.title ? card.title : m.title));
  const eyebrowText = withCal ? m.eyebrow : (showGrid ? m.popupsLabel : (L.code === "PT" ? "Pedir informações" : "Request information"));
  const dateLabel = modalState.date ? new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(modalState.date)) : "";
  return { L, m, card, paid, loc, isPopup, isPrivateCard, seatOpts, withCal, showGrid, popup, popupLabel, titleText, eyebrowText, dateLabel };
}

function modalTitleHTML(ctx) {
  if (ctx.titleText === "Boato x GreensandNuts") return `<span style="color:#DF0000">Boato</span> x <span style="color:#67863E">GreensandNuts</span>`;
  if (ctx.showGrid) return ctx.card.title;
  return ctx.titleText;
}

function modalStep0HTML(ctx) {
  const { L, m, card, isPopup, isPrivateCard, seatOpts, withCal, showGrid, popup, popupLabel, titleText, eyebrowText, dateLabel } = ctx;
  let body;
  if (showGrid) {
    body = `<div class="ppick">${m.popups.map((p) => `
      <button type="button" class="ppcard" data-popup="${p.name}">
        <span class="ppcard__img" style="${p.img ? `background-image:url(${resolveImage(p.img)})` : ""}"></span>
        <span class="ppcard__body">
          <span class="ppcard__name">${p.name}</span>
          <span class="ppcard__meta">${p.date}${p.place ? " · " + p.place : ""}</span>
        </span>
      </button>`).join("")}</div>`;
  } else {
    const seatChoicesOpts = seatChoices(seatOpts, withCal && modalState.date ? seatsLeft(modalState.date) : null);
    body = `
      ${isPopup ? `<button type="button" class="modal__back" id="modalPopupBack">${m.popupBack}</button>` : ""}
      ${withCal ? `<p class="meta" style="margin-bottom:8px">${m.meta}</p>` : ""}
      ${withCal && m.deposit ? `<p class="modal__deposit">${m.deposit}</p>` : ""}
      ${isPopup && popup ? `<p class="meta" style="margin-bottom:18px">${popup.date} · ${popup.place}</p>` : ""}
      <form id="reserveForm">
        ${withCal ? `
        <div class="field">
          <label>${m.calLabel}</label>
          ${calendarHTML(m.dates, modalState.date, ctx.loc, m.calFull)}
          ${modalState.err ? `<span class="field__err">${m.calNone}</span>` : ""}
          ${modalState.date && !isDateFull(modalState.date) ? `<span class="cal__left${seatsLeft(modalState.date) <= 3 ? " cal__left--low" : ""}">${seatsLeftLabel(seatsLeft(modalState.date), m)}</span>` : ""}
        </div>` : ""}
        <div class="field-row">
          <div class="field"><label>${m.fName}</label><input name="Name" required placeholder="${m.phName}"></div>
          <div class="field"><label>${m.fSeats}</label><select name="Seats">${seatChoicesOpts.map((o) => `<option>${o}</option>`).join("")}</select></div>
        </div>
        ${isPopup ? `
        <div class="field"><label>${m.fTime}</label><select name="Time">${["21:00", "21:30"].map((o) => `<option>${o}</option>`).join("")}</select></div>` : ""}
        <div class="field"><label>${m.fEmail}</label><input name="Email" required type="email" placeholder="${m.phEmail}"></div>
        <div class="field"><label>${m.fPhone}</label><input name="Phone" required type="tel" placeholder="${m.phPhone}"></div>
        <div class="field"><label>${m.fNote}</label><textarea name="Note" rows="2" placeholder="${m.phNote}"></textarea></div>
        <input type="hidden" name="Dinner" value="${titleText}">
        <input type="hidden" name="Date" value="${dateLabel}">
        <input type="hidden" name="Pop-up" value="${popupLabel}">
        ${withCal && m.pricing ? `
        <div class="modal__pricing">
          <div class="modal__pricing-row" style="font-size:14px"><span class="modal__pricing-label">${m.pricing.total[0]}</span><span class="modal__pricing-val">${m.pricing.total[1]}</span></div>
          <div class="modal__pricing-row modal__pricing-row--deposit" style="font-size:14px"><span class="modal__pricing-label" style="font-size:14px">${m.pricing.deposit[0]}</span><span class="modal__pricing-val">${m.pricing.deposit[1]}</span></div>
        </div>` : ""}
        <button type="submit" class="btn btn--red btn--block">${withCal ? m.submit : (L.code === "PT" ? "Enviar pedido →" : "Send request →")}</button>
        ${modalState.sendErr ? `<span class="field__err" style="display:block;margin-top:10px">${L.code === "PT" ? "Não foi possível enviar o pedido. Tente novamente." : "We couldn't send your request. Please try again."}</span>` : ""}
      </form>`;
  }
  return `
    <div class="modal__top">
      <div><span class="eyebrow">${eyebrowText}</span><h3 style="margin-top:8px">${modalTitleHTML(ctx)}</h3></div>
      <button class="modal__x" id="modalClose">✕</button>
    </div>
    <div class="modal__body">${body}</div>`;
}

function modalStep1HTML(ctx) {
  const { L, m, titleText, dateLabel, popupLabel } = ctx;
  const booking = modalState.booking;
  const summary = [booking && booking.Name, dateLabel || popupLabel, booking && booking.Seats && booking.Seats + " ×"].filter(Boolean).join(" · ");
  const payAction = STRIPE_PAYMENT_LINK
    ? `<button type="button" class="btn btn--red btn--block" id="modalPayBtn">${m.payBtn} →</button>
       <p class="modal__pay-secure"><i class="ph-light ph-lock-simple"></i>${m.paySecure}</p>`
    : `<p class="modal__pay-soon">${m.paySoon}</p>
       <button type="button" class="btn btn--ink btn--block" id="modalPaySkip">${m.close}</button>`;
  return `
    <div class="modal__top">
      <div><span class="eyebrow">${m.payEyebrow}</span><h3 style="margin-top:8px">${titleText}</h3></div>
      <button class="modal__x" id="modalClose">✕</button>
    </div>
    <div class="modal__body modal__pay">
      <p class="meta" style="margin-bottom:14px">${summary}</p>
      <p class="modal__pay-lead">${m.payLead}</p>
      ${payAction}
      <button type="button" class="modal__back" style="margin-top:16px" id="modalPayBack">${m.payBack}</button>
    </div>`;
}

function modalStep2HTML(ctx) {
  const { m, paid } = ctx;
  return `<div class="modal__success">
    <div class="mk"></div>
    <h3>${paid ? m.paidTitle : m.okTitle}</h3>
    <p>${paid ? m.paidBody : m.okBody}</p>
    <button type="button" class="btn btn--ink" style="margin-top:26px" id="modalDone">${m.close}</button>
  </div>`;
}

function modalHTML() {
  const ctx = modalContext();
  const inner = modalState.step === 0 ? modalStep0HTML(ctx) : modalState.step === 1 ? modalStep1HTML(ctx) : modalStep2HTML(ctx);
  return `<div class="modal-bk" id="modalBackdrop"><div class="modal" id="modalCard">${inner}</div></div>`;
}

function bindModalEvents() {
  const backdrop = document.getElementById("modalBackdrop");
  const card = document.getElementById("modalCard");
  if (!backdrop) return;
  backdrop.addEventListener("click", () => closeReserve());
  card.addEventListener("click", (e) => e.stopPropagation());

  const closeBtn = document.getElementById("modalClose");
  if (closeBtn) closeBtn.addEventListener("click", () => closeReserve());
  const doneBtn = document.getElementById("modalDone");
  if (doneBtn) doneBtn.addEventListener("click", () => closeReserve());

  const ctx = modalContext();

  // Popup picker
  document.querySelectorAll("[data-popup]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = ctx.m.popups.find((pp) => pp.name === btn.getAttribute("data-popup"));
      modalState.popup = p;
      modalState.err = false;
      renderModal();
    });
  });
  const popupBack = document.getElementById("modalPopupBack");
  if (popupBack) popupBack.addEventListener("click", () => { modalState.popup = null; modalState.err = false; renderModal(); });

  // Calendar
  document.querySelectorAll("[data-cal-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const months = calendarMonths(ctx.m.dates);
      const dir = parseInt(btn.getAttribute("data-cal-nav"), 10);
      const curKey = modalState.calView.y + "-" + String(modalState.calView.m + 1).padStart(2, "0");
      const idx = months.indexOf(curKey);
      const ni = Math.min(months.length - 1, Math.max(0, idx + dir));
      const [y, mo] = months[ni].split("-").map(Number);
      modalState.calView = { y, m: mo - 1 };
      renderModal();
    });
  });
  document.querySelectorAll("[data-date]:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => { modalState.date = btn.getAttribute("data-date"); modalState.err = false; renderModal(); });
  });

  // Step 0 form submit
  const form = document.getElementById("reserveForm");
  if (form) form.addEventListener("submit", (e) => handleReserveSubmit(e, ctx));

  // Step 1 (payment)
  const payBtn = document.getElementById("modalPayBtn");
  if (payBtn) payBtn.addEventListener("click", () => {
    const booking = modalState.booking;
    const url = buildPaymentUrl(booking && booking.Email, (booking && booking.Name || "") + " " + (ctx.dateLabel || ctx.popupLabel || ctx.titleText));
    if (url) window.location.href = url;
  });
  const paySkip = document.getElementById("modalPaySkip");
  if (paySkip) paySkip.addEventListener("click", () => { modalState.step = 2; renderModal(); });
  const payBack = document.getElementById("modalPayBack");
  if (payBack) payBack.addEventListener("click", () => { modalState.step = 0; renderModal(); });
}

async function handleReserveSubmit(e, ctx) {
  e.preventDefault();
  const { L, m, withCal, titleText, dateLabel, popupLabel } = ctx;
  const form = e.currentTarget;
  if (withCal && !modalState.date) { modalState.err = true; renderModal(); return; }
  if (modalState.submitting) return;

  const data = Object.fromEntries(new FormData(form).entries());
  modalState.sendErr = false;
  modalState.submitting = true;
  const btn = form.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = L.code === "PT" ? "A enviar…" : "Sending…"; }

  const web3ok = await sendFormEmail(form, "New reservation — " + titleText + (dateLabel ? " · " + dateLabel : "") + (popupLabel ? " · " + popupLabel : ""));
  if (!web3ok) {
    modalState.submitting = false;
    modalState.sendErr = true;
    renderModal();
    return;
  }

  await sendGuestConfirmation({
    email: data.Email, name: data.Name, seats: data.Seats, dinner: titleText,
    dateLabel: dateLabel || popupLabel, reservationDate: data.Date || dateLabel || popupLabel,
    reservationTime: data.Time || "20:00", withCal, lang: L.code
  });

  if (withCal && modalState.date) addBooking(modalState.date, data.Seats);
  modalState.booking = data;
  modalState.submitting = false;
  modalState.step = withCal ? 1 : 2;
  renderModal();
}
