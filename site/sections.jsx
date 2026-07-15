/* Boato — website UI kit: inquiry, footer, reserve modal (bilingual). */

/* ============================================================
   EMAIL DELIVERY — paste your Web3Forms access key below.
   Get a free key at https://web3forms.com using the address
   info.boatosupper@gmail.com. Every form submission on this
   site is then emailed there. Until a real key is set, forms
   still work as a demo but no email is sent.
   ============================================================ */
const WEB3FORMS_KEY = "18a11c28-3c71-47b3-9080-d9ebd4514eb4";

/* ============================================================
   GUEST CONFIRMATION EMAIL — sent to the person who books.
   ------------------------------------------------------------
   Web3Forms (above) emails YOU when a form is submitted, but its
   auto-reply to the guest is a paid Pro feature. To email the
   GUEST for free we use EmailJS (client-side, no backend).

   ONE-TIME SETUP (≈5 min, free — 200 emails/month):
   1. Create a free account → https://www.emailjs.com
   2. Add an Email Service (connect the info.boatosupper@gmail.com
      Gmail) → copy its SERVICE ID.
   3. Create an Email Template with:
        • To email:   {{to_email}}
        • Subject:    {{subject}}
        • Content:    {{message}}      (just this one variable)
      → copy its TEMPLATE ID.
   4. Account → General → copy your PUBLIC KEY.
   5. Paste the three values below.
   The full email wording lives in code (buildGuestEmail) so it
   stays on-brand and bilingual — the template is just a shell.
   Until the three IDs are set, booking still works; no guest
   email is sent.
   ============================================================ */
const EMAILJS_PUBLIC_KEY = "WeRyt5khCj532hzda";
const EMAILJS_SERVICE_ID = "service_seyaza2";
const EMAILJS_TEMPLATE_ID = "template_d0s545h";

// Initialize EmailJS once with the public key (v4 SDK — client-side, no backend).
if (typeof window !== "undefined" && window.emailjs && EMAILJS_PUBLIC_KEY) {
  try {
    window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    console.log("[Boato] EmailJS initialized.");
  } catch (e) {
    console.error("[Boato] EmailJS init failed:", e);
  }
}

/* ============================================================
   SEAT LIMIT — block a date once it's fully booked.
   Each table holds SEAT_CAP guests. Every reservation adds its
   seat count to that date's tally (stored in the browser via
   localStorage). When a date reaches SEAT_CAP it stops being
   selectable in the calendar — it shows as "esgotado / full".
   NOTE: the tally lives per-browser. For a tally shared across
   every visitor's device you'd need a small backend / database;
   wire addBooking()/seatsBooked() to it and the UI just works.
   ============================================================ */
const SEAT_CAP = 10;
const BOOKINGS_KEY = "boato.bookings.v2";
// Seats already reserved per date (baseline everyone sees). New bookings made
// on the site add on top of this. Edit these as seats fill up.
const INITIAL_BOOKED = {
  "2026-07-11": 10,
  "2026-07-17": 10,
  "2026-07-24": 10
};
function readBookings() {
  try {return JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || {};}
  catch (e) {return {};}
}
function parseSeats(v) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
function seatsBooked(dateISO) {
  const total = (INITIAL_BOOKED[dateISO] || 0) + (readBookings()[dateISO] || 0);
  return Math.min(SEAT_CAP, total);
}
function seatsLeft(dateISO) {return Math.max(0, SEAT_CAP - seatsBooked(dateISO));}
function isDateFull(dateISO) {return seatsBooked(dateISO) >= SEAT_CAP;}
function addBooking(dateISO, seats) {
  if (!dateISO) return;
  const b = readBookings();
  b[dateISO] = Math.min(SEAT_CAP, (b[dateISO] || 0) + parseSeats(seats));
  try {localStorage.setItem(BOOKINGS_KEY, JSON.stringify(b));} catch (e) {}
}
// Limit the seat dropdown to what's actually left on the chosen date.
function seatChoices(opts, left) {
  if (left == null) return opts;
  return opts.filter((o) => parseSeats(o) <= left);
}
function seatsLeftLabel(n, m) {
  return n === 1 ? m.calLeftOne : (m.calLeft || "").replace("{n}", n);
}

// Compose the confirmation email body in Boato's voice.
function buildGuestEmail({ name, dinner, dateLabel, seats, withCal, lang }) {
  const first = (name || "").trim().split(/\s+/)[0] || "";
  if (lang === "PT") {
    const when = dateLabel ? ` a ${dateLabel}` : "";
    const hold = withCal ?
    "O lugar fica garantido assim que o sinal de €30 for confirmado — é descontado no valor final. Sussurraremos a morada 24 horas antes." :
    "Entraremos em contacto em breve para confirmar os detalhes.";
    return {
      subject: "O seu lugar no Boato — pedido recebido",
      message:
      `Olá ${first},

Obrigado por pedir um lugar no ${dinner}${when}.${seats ? `\n\nReserva para ${seats}.` : ""}

${hold}

Doze lugares. Uma mesa longa. Uma morada que guardamos até lá.

Siga o boato,
Boato Supper Club
info.boatosupper@gmail.com · @boato.supperclub`
    };
  }
  const when = dateLabel ? ` on ${dateLabel}` : "";
  const hold = withCal ?
  "Your seat is held the moment your €30 deposit is confirmed — it comes off your final bill. We'll whisper the address to you 24 hours before." :
  "We'll be in touch shortly to confirm the details.";
  return {
    subject: "Your seat at Boato — request received",
    message:
    `Hi ${first},

Thank you for requesting a seat at ${dinner}${when}.${seats ? `\n\nReservation for ${seats}.` : ""}

${hold}

Twelve seats. One long table. A location we'll keep quiet until then.

Follow the rumor,
Boato Supper Club
info.boatosupper@gmail.com · @boato.supperclub`
  };
}

async function sendGuestConfirmation(info) {
  if (!EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !window.emailjs) {
    console.warn("[Boato] EmailJS not configured — no guest confirmation sent.");
    return false;
  }
  if (!info.email) return false;
  const { subject, message } = buildGuestEmail(info);
  // The four variables required by EmailJS template_d0s545h.
  const params = {
    user_name: info.name || "",
    user_email: info.email || "",
    reservation_date: info.reservationDate || info.dateLabel || "",
    reservation_time: info.reservationTime || "20:00",
    number_guests: info.seats != null ? String(info.seats) : "",
    // Extra context / routing fields (harmless if unused by the template).
    // Several aliases so the template's "To Email" field resolves no matter
    // which variable name it references ({{user_email}} / {{to_email}} / {{email}}).
    to_email: info.email,
    email: info.email,
    to_name: info.name || "",
    from_name: "Boato Supper Club",
    reply_to: "info.boatosupper@gmail.com",
    subject,
    message
  };
  console.log("[Boato] Sending EmailJS guest confirmation with:", {
    user_name: params.user_name,
    user_email: params.user_email,
    reservation_date: params.reservation_date,
    reservation_time: params.reservation_time,
    number_guests: params.number_guests
  });
  try {
    const resp = await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params, { publicKey: EMAILJS_PUBLIC_KEY });
    console.log("[Boato] EmailJS confirmation sent:", resp && resp.status, resp && resp.text);
    return true;
  } catch (err) {
    console.error("[Boato] Guest confirmation failed:", err);
    return false;
  }
}

/* ============================================================
   DEPOSIT PAYMENT — €30 deposit via Stripe Payment Link.
   ------------------------------------------------------------
   This is a HOSTED payment page (no server needed — works on
   GitHub Pages). It accepts card AND one-tap MB WAY for
   Portuguese customers, and supports refunds for the
   "no availability → money back" case.

   ONE-TIME SETUP (≈5 min):
   1. Create a free Stripe account → dashboard.stripe.com
      (Activate it with your IBAN so payouts reach your bank.)
   2. In the dashboard, enable payment methods: turn ON
      "MB WAY" and "Cards" (Settings → Payment methods).
   3. Create a Payment Link (Product catalog → Payment Links):
        • Product: "Boato — reservation deposit", price €30 EUR, one-off.
        • After payment → "Redirect customers to your website":
          https://boatosupperclub.com/?paid=1
   4. Copy the link's URL (looks like https://buy.stripe.com/xxxxx)
      and paste it below.
   Until a real link is set, the flow still runs end-to-end but
   shows a "payment opening shortly" message instead of charging.
   ============================================================ */
const STRIPE_PAYMENT_LINK = "https://book.stripe.com/3cI14mgQabj63V9d2E4F200";

// Build the checkout URL with the guest's email + a booking reference
// prefilled, so the Stripe receipt and your dashboard tie back to the seat.
function buildPaymentUrl(email, ref) {
  if (!STRIPE_PAYMENT_LINK) return "";
  try {
    const u = new URL(STRIPE_PAYMENT_LINK);
    if (email) u.searchParams.set("prefilled_email", email);
    if (ref) u.searchParams.set("client_reference_id", String(ref).slice(0, 190).replace(/[^a-zA-Z0-9_-]+/g, "-"));
    return u.toString();
  } catch (err) {
    console.error("[Boato] Bad STRIPE_PAYMENT_LINK:", err);
    return STRIPE_PAYMENT_LINK;
  }
}

async function sendFormEmail(form, subject) {
  const data = Object.fromEntries(new FormData(form).entries());
  if (window.BoatoSubmissions) window.BoatoSubmissions.save(window.BoatoSubmissions.inferType(subject, data), data);
  if (!WEB3FORMS_KEY || WEB3FORMS_KEY.startsWith("REPLACE_WITH")) {
    console.warn("[Boato] No Web3Forms key set — submission not emailed:", data);
    return true; // demo mode: pretend it sent
  }
  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        from_name: "Boato Supper Club website",
        subject,
        ...data
      })
    });
    return res.ok;
  } catch (err) {
    console.error("[Boato] Email send failed:", err);
    return false;
  }
}

/* ---------------- Inquiry ---------------- */
function Inquiry({ L, onReserve }) {
  const [sent, setSent] = React.useState(false);
  const q = L.inquiry;
  return (
    <section className="section" id="inquiry">
      <div className="wrap inquiry">
        <div className="inquiry__copy reveal">
          <Eyebrow>{q.eyebrow}</Eyebrow>
          <h2>{q.title}</h2>
          <p style={{ fontWeight: 100 }}>{q.body}</p>
          <div className="inquiry__types">
            {q.types.map(([t, d]) => <div key={t}>{t}<span>{d}</span></div>)}
          </div>
          {q.includes &&
          <div className="inquiry__includes">
              <h4>{q.includesH}</h4>
              <ul>
                {q.includes.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </div>
          }
        </div>
        <div className="formcard reveal">
          {sent ?
          <div style={{ padding: "20px 4px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2.6rem", color: "var(--red)" }}>—</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "1.8rem", margin: "10px 0 8px" }}>{q.sentTitle}</h3>
              <p style={{ color: "var(--ink-2)", lineHeight: 1.6 }}>{q.sentBody}</p>
            </div> :

          <form onSubmit={async (e) => {e.preventDefault();const f = e.currentTarget;setSent(true);sendFormEmail(f, "New private/corporate inquiry — Boato");}}>
              <div className="field-row">
                <div className="field"><label>{q.fName}</label><input name="Name" required placeholder={q.phName} /></div>
                <div className="field"><label>{q.fEmail}</label><input name="Email" required type="email" placeholder={q.phEmail} /></div>
              </div>
              <div className="field"><label>{q.fPhone}</label><input name="Phone" type="tel" placeholder={q.phPhone} /></div>
              <div className="field-row">
                <div className="field"><label>{q.fType}</label>
                  <select name="Type">{q.typeOpts.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="field"><label>{q.fGuests}</label>
                  <select name="Guests"><option>2–4</option><option>5–8</option><option>9–14</option><option>15+</option></select></div>
              </div>
              <div className="field"><label>{q.fOccasion}</label>
                <textarea name="Occasion" rows="3" placeholder={q.phOccasion}></textarea></div>
              <Btn variant="ink" className="btn--block" type="submit">{q.submit}</Btn>
            </form>
          }
        </div>
      </div>
    </section>);

}

/* ---------------- Footer ---------------- */
function Footer({ L }) {
  const f = L.footer;
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__grid">
          <div>
            <div className="footer__word">boato</div>
            <div className="footer__tag">{f.tag}</div>
          </div>
          <div>
            <h5>{f.exploreH}</h5>
            <ul>
              {f.explore.map(([l, h]) => <li key={l}><a href={h}>{l}</a></li>)}
            </ul>
          </div>
          <div>
            <h5>{f.reachH}</h5>
            <ul>
              {f.reach.map(([l, h]) => <li key={l}><a href={h}>{l}</a></li>)}
            </ul>
          </div>
          <div className="footer__news">
            <h5>{f.newsH}</h5>
            <p style={{ color: "var(--on-invert-muted)", fontSize: 14, margin: "0 0 14px", lineHeight: 1.5 }}>{f.newsP}</p>
            <form onSubmit={async (e) => {e.preventDefault();const fm = e.currentTarget;const ok = await sendFormEmail(fm, "New newsletter signup — Boato");fm.reset();e.target.querySelector("input").placeholder = ok ? "✓ " + f.newsPh : f.newsPh;}}>
              <input name="Email" type="email" required placeholder={f.newsPh} />
              <Btn variant="red" className="footer__news" type="submit">{f.subscribe}</Btn>
            </form>
          </div>
        </div>
        <div className="footer__base">
          <span className="meta">{f.copy}</span>
          <span className="meta">{f.place}</span>
        </div>
      </div>
    </footer>);

}

/* ---------------- Reserve modal ---------------- */
function Calendar({ dates, value, onChange, locale, none }) {
  const avail = React.useMemo(() => dates.slice().sort(), [dates]);
  const months = React.useMemo(() => [...new Set(avail.map((a) => a.slice(0, 7)))], [avail]);
  const [view, setView] = React.useState(() => {
    const base = value || avail[0];
    const [y, mo] = base.split("-").map(Number);
    return { y, m: mo - 1 };
  });
  const curKey = view.y + "-" + String(view.m + 1).padStart(2, "0");
  const idx = months.indexOf(curKey);
  const go = (dir) => {
    const ni = Math.min(months.length - 1, Math.max(0, idx + dir));
    const [y, mo] = months[ni].split("-").map(Number);
    setView({ y, m: mo - 1 });
  };
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(view.y, view.m, 1));
  const wd = [];
  for (let i = 0; i < 7; i++) wd.push(new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 1 + i)));
  const startOffset = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const availSet = new Set(avail);
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const iso = (d) => view.y + "-" + String(view.m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  return (
    <div className="cal">
      <div className="cal__head">
        <button type="button" className="cal__nav" onClick={() => go(-1)} disabled={idx <= 0} aria-label="−">←</button>
        <span className="cal__month">{monthLabel}</span>
        <button type="button" className="cal__nav" onClick={() => go(1)} disabled={idx >= months.length - 1} aria-label="+">→</button>
      </div>
      <div className="cal__grid cal__wd">{wd.map((w, i) => <span key={i}>{w}</span>)}</div>
      <div className="cal__grid">
        {cells.map((d, i) => {
          if (!d) return <span key={i} className="cal__cell cal__cell--empty"></span>;
          const k = iso(d);const inAvail = availSet.has(k);const full = inAvail && isDateFull(k);const ok = inAvail && !full;const sel = value === k;
          return <button type="button" key={i} disabled={!ok} title={full ? none || "" : undefined} className={"cal__cell" + (ok ? " is-avail" : "") + (full ? " is-full" : "") + (sel ? " is-sel" : "")} onClick={() => onChange(k)}>{d}</button>;
        })}
      </div>
    </div>);

}
function ReserveModal({ L, onClose, card, paid }) {
  const [step, setStep] = React.useState(paid ? 2 : 0);
  const [date, setDate] = React.useState("");
  const [popup, setPopup] = React.useState("");
  const [err, setErr] = React.useState(false);
  const [sendErr, setSendErr] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [booking, setBooking] = React.useState(null);
  const m = L.modal;
  const loc = L.code === "PT" ? "pt-PT" : "en-GB";
  const isPopup = !!(card && card.kind === "popup");
  const isPrivateCard = !!(card && /corporate|privad|private/i.test(card.title || ""));
  const seatOpts = isPrivateCard ? ["2–4", "5–8", "9–14", "15+"] : m.seatOpts;
  const withCal = !card || !card.cta;
  const showGrid = isPopup && !popup;
  const popupLabel = popup ? popup.name + " · " + popup.date + " · " + popup.place : "";
  const titleText = popup ? popup.name : card && card.title ? card.title : m.title;
  const eyebrowText = withCal ? m.eyebrow : showGrid ? m.popupsLabel : L.code === "PT" ? "Pedir informações" : "Request information";
  const dateLabel = date ? new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(date)) : "";
  return (
    <div className="modal-bk" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {step === 0 ?
        <React.Fragment>
            <div className="modal__top" style={{ padding: "20px 24px 10px" }}>
              <div>
                <Eyebrow>{eyebrowText}</Eyebrow>
                <h3 style={{ marginTop: 8 }}>{showGrid ? card.title : titleText}</h3>
              </div>
              <button className="modal__x" onClick={onClose}>✕</button>
            </div>
            <div className="modal__body" style={{ padding: "0px 24px 22px" }}>
              {showGrid ?
            <div className="ppick">
                  {m.popups.map((p) =>
              <button type="button" key={p.name} className="ppcard" style={{ "--pp-bg": p.bg }} onClick={() => setPopup(p)}>
                      <span className="ppcard__img"></span>
                      <span className="ppcard__body">
                        <span className="ppcard__name">{p.name}</span>
                        <span className="ppcard__meta">{p.date}{p.place ? " · " + p.place : ""}</span>
                      </span>
                    </button>
              )}
                </div> :

            <React.Fragment>
                  {isPopup && <button type="button" className="modal__back" onClick={() => {setPopup(null);setErr(false);}}>{m.popupBack}</button>}
                  {withCal && <p className="meta" style={{ marginBottom: 8 }}>{m.meta}</p>}
                  {withCal && m.deposit && <p className="modal__deposit" dangerouslySetInnerHTML={{ __html: m.deposit }}></p>}
                  {isPopup && popup && <p className="meta" style={{ marginBottom: 18 }}>{popup.date} · {popup.place}</p>}
                  <form onSubmit={async (e) => {
                e.preventDefault();
                if (withCal && !date) {setErr(true);return;}
                if (submitting) return;
                const f = e.currentTarget;
                const data = Object.fromEntries(new FormData(f).entries());
                setSendErr(false);
                setSubmitting(true);

                // 1) Web3Forms — notifies Boato. (Existing integration, unchanged.)
                const web3ok = await sendFormEmail(f, "New reservation — " + titleText + (dateLabel ? " · " + dateLabel : "") + (popupLabel ? " · " + popupLabel : ""));
                console.log("[Boato] Web3Forms submission:", web3ok ? "success" : "failed");
                if (!web3ok) {setSubmitting(false);setSendErr(true);return;}

                // 2) EmailJS guest confirmation — fires only AFTER Web3Forms succeeds.
                const guestOk = await sendGuestConfirmation({ email: data.Email, name: data.Name, seats: data.Seats, dinner: titleText, dateLabel: dateLabel || popupLabel, reservationDate: data.Date || dateLabel || popupLabel, reservationTime: "20:00", withCal, lang: L.code });
                console.log("[Boato] Guest confirmation email:", guestOk ? "sent" : "not sent");

                // 3) Commit the booking and advance to the success / payment step.
                if (withCal && date) addBooking(date, data.Seats);
                setBooking(data);
                setSubmitting(false);
                setStep(withCal ? 1 : 2);
              }}>
                    {withCal &&
                <div className="field">
                        <label>{m.calLabel}</label>
                        <Calendar dates={m.dates} value={date} onChange={(d) => {setDate(d);setErr(false);}} locale={loc} none={m.calFull} />
                        {err && <span className="field__err">{m.calNone}</span>}
                        {date && !isDateFull(date) && <span className={"cal__left" + (seatsLeft(date) <= 3 ? " cal__left--low" : "")}>{seatsLeftLabel(seatsLeft(date), m)}</span>}
                      </div>
                }
                    <div className="field-row">
                      <div className="field"><label>{m.fName}</label><input name="Name" required placeholder={m.phName} /></div>
                      <div className="field"><label>{m.fSeats}</label>
                        <select name="Seats">{seatChoices(seatOpts, withCal && date ? seatsLeft(date) : null).map((o) => <option key={o}>{o}</option>)}</select></div>
                    </div>
                    <div className="field"><label>{m.fEmail}</label><input name="Email" required type="email" placeholder={m.phEmail} /></div>
                    <div className="field"><label>{m.fPhone}</label><input name="Phone" required type="tel" placeholder={m.phPhone} /></div>
                    <div className="field"><label>{m.fNote}</label>
                      <textarea name="Note" rows="2" placeholder={m.phNote}></textarea></div>
                    <input type="hidden" name="Dinner" value={titleText} />
                    <input type="hidden" name="Date" value={dateLabel} />
                    <input type="hidden" name="Pop-up" value={popupLabel} />
                    {withCal && m.pricing &&
                <div className="modal__pricing">
                        <div className="modal__pricing-row" style={{ fontSize: "14px" }}>
                          <span className="modal__pricing-label">{m.pricing.total[0]}</span>
                          <span className="modal__pricing-val">{m.pricing.total[1]}</span>
                        </div>
                        <div className="modal__pricing-row modal__pricing-row--deposit" style={{ fontSize: "14px" }}>
                          <span className="modal__pricing-label" style={{ fontSize: "14px" }}>{m.pricing.deposit[0]}</span>
                          <span className="modal__pricing-val">{m.pricing.deposit[1]}</span>
                        </div>
                      </div>
                }
                    <Btn variant="red" className="btn--block" type="submit" disabled={submitting}>{submitting ? L.code === "PT" ? "A enviar…" : "Sending…" : withCal ? m.submit : L.code === "PT" ? "Enviar pedido →" : "Send request →"}</Btn>
                    {sendErr && <span className="field__err" style={{ display: "block", marginTop: 10 }}>{L.code === "PT" ? "Não foi possível enviar o pedido. Tente novamente." : "We couldn't send your request. Please try again."}</span>}
                  </form>
                </React.Fragment>
            }
            </div>
          </React.Fragment> :
        step === 1 ?
        <React.Fragment>
            <div className="modal__top" style={{ padding: "20px 24px 10px" }}>
              <div>
                <Eyebrow>{m.payEyebrow}</Eyebrow>
                <h3 style={{ marginTop: 8 }}>{titleText}</h3>
              </div>
              <button className="modal__x" onClick={onClose}>✕</button>
            </div>
            <div className="modal__body modal__pay" style={{ padding: "0px 24px 24px" }}>
              <p className="meta" style={{ marginBottom: 14 }}>{[booking && booking.Name, dateLabel || popupLabel, booking && booking.Seats && booking.Seats + " ×"].filter(Boolean).join(" · ")}</p>
              <p className="modal__pay-lead" dangerouslySetInnerHTML={{ __html: m.payLead }}></p>
              {STRIPE_PAYMENT_LINK ?
            <React.Fragment>
                  <Btn variant="red" className="btn--block" onClick={() => {const url = buildPaymentUrl(booking && booking.Email, (booking && booking.Name || "") + " " + (dateLabel || popupLabel || titleText));if (url) window.location.href = url;}}>{m.payBtn} →</Btn>
                  <p className="modal__pay-secure"><i className="ph-light ph-lock-simple"></i>{m.paySecure}</p>
                </React.Fragment> :

            <React.Fragment>
                  <p className="modal__pay-soon">{m.paySoon}</p>
                  <Btn variant="ink" className="btn--block" onClick={() => setStep(2)}>{m.close}</Btn>
                </React.Fragment>
            }
              <button type="button" className="modal__back" style={{ marginTop: 16 }} onClick={() => setStep(0)}>{m.payBack}</button>
            </div>
          </React.Fragment> :

        <div className="modal__success">
            <div className="mk"></div>
            <h3>{paid ? m.paidTitle : m.okTitle}</h3>
            <p>{paid ? m.paidBody : m.okBody}</p>
            <Btn variant="ink" onClick={onClose} style={{ marginTop: 26 }}>{m.close}</Btn>
          </div>
        }
      </div>
    </div>);

}

Object.assign(window, { Inquiry, Footer, ReserveModal, sendFormEmail, sendGuestConfirmation, seatsLeft, isDateFull, seatsLeftLabel });