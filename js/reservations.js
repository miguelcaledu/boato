/* ============================================================
   EMAIL DELIVERY — Web3Forms access key.
   Every form submission on this site is emailed to
   info.boatosupper@gmail.com via https://web3forms.com.
   ============================================================ */
const WEB3FORMS_KEY = "18a11c28-3c71-47b3-9080-d9ebd4514eb4";

/* ============================================================
   GUEST CONFIRMATION EMAIL — sent to the person who books, via
   EmailJS (client-side, no backend). The full email wording lives
   in code (buildGuestEmail) so it stays on-brand and bilingual —
   the EmailJS template is just a shell.
   ============================================================ */
const EMAILJS_PUBLIC_KEY = "WeRyt5khCj532hzda";
const EMAILJS_SERVICE_ID = "service_seyaza2";
const EMAILJS_TEMPLATE_ID = "template_d0s545h";

if (typeof window !== "undefined" && window.emailjs && EMAILJS_PUBLIC_KEY) {
  try {
    window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
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
const INITIAL_BOOKED = {
  "2026-09-11": 0,
  "2026-09-18": 0,
  "2026-09-25": 0
};
function readBookings() {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || {}; }
  catch (e) { return {}; }
}
function parseSeats(v) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
function seatsBooked(dateISO) {
  const total = (INITIAL_BOOKED[dateISO] || 0) + (readBookings()[dateISO] || 0);
  return Math.min(SEAT_CAP, total);
}
function seatsLeft(dateISO) { return Math.max(0, SEAT_CAP - seatsBooked(dateISO)); }
function isDateFull(dateISO) { return seatsBooked(dateISO) >= SEAT_CAP; }
function addBooking(dateISO, seats) {
  if (!dateISO) return;
  const b = readBookings();
  b[dateISO] = Math.min(SEAT_CAP, (b[dateISO] || 0) + parseSeats(seats));
  try { localStorage.setItem(BOOKINGS_KEY, JSON.stringify(b)); } catch (e) {}
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
    const hold = withCal
      ? "O lugar fica garantido assim que o sinal de €30 for confirmado — é descontado no valor final. Sussurraremos a morada 24 horas antes."
      : "Entraremos em contacto em breve para confirmar os detalhes.";
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
  const hold = withCal
    ? "Your seat is held the moment your €30 deposit is confirmed — it comes off your final bill. We'll whisper the address to you 24 hours before."
    : "We'll be in touch shortly to confirm the details.";
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
  const params = {
    user_name: info.name || "",
    user_email: info.email || "",
    reservation_date: info.reservationDate || info.dateLabel || "",
    reservation_time: info.reservationTime || "20:00",
    number_guests: info.seats != null ? String(info.seats) : "",
    to_email: info.email,
    email: info.email,
    to_name: info.name || "",
    from_name: "Boato Supper Club",
    reply_to: "info.boatosupper@gmail.com",
    subject,
    message
  };
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
   Hosted payment page (no server needed — works on GitHub Pages).
   Accepts card and one-tap MB WAY for Portuguese customers.
   ============================================================ */
const STRIPE_PAYMENT_LINK = "https://book.stripe.com/3cI14mgQabj63V9d2E4F200";

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
    return true;
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

Object.assign(window, {
  seatsLeft, isDateFull, seatsLeftLabel, seatChoices, addBooking,
  sendFormEmail, sendGuestConfirmation, buildPaymentUrl
});
