/* ============================================================
   BOATO — Form submissions store
   ------------------------------------------------------------
   Every form on the site (reservations, pop-ups, private/corporate
   inquiries, waitlist, newsletter) writes a copy of its submission
   here so the /admin/ dashboard can list them.

   DEMO MODE (default): submissions are saved to this BROWSER's
   localStorage only. That means the admin dashboard only sees
   submissions made from the same browser/device — fine for testing,
   NOT fine for production (a guest booking from their phone won't
   show up on your laptop).

   TO GO LIVE ACROSS DEVICES: create a free Supabase project
   (supabase.com), make a table called "submissions" with columns
   (id text, type text, data jsonb, ts text, read bool), then paste
   your project URL + anon public key below. Once both are set,
   every save/fetch automatically uses Supabase instead of
   localStorage — no other code changes needed.
   ============================================================ */

const SUPABASE_URL = "https://eyyssknsvojkufdehhit.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xHjQv6p_kcs5XznseDuXZQ_q-EUpHh3";

function supabaseReady() {
  return SUPABASE_URL && !SUPABASE_URL.startsWith("REPLACE_WITH") &&
  SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith("REPLACE_WITH");
}

const LOCAL_KEY = "boato_submissions";

function localAll() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch (e) {
    return [];
  }
}
function localSaveAll(rows) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

async function save(type, data) {
  const row = {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
    type,
    data,
    ts: new Date().toISOString(),
    read: false
  };
  if (supabaseReady()) {
    try {
      await fetch(SUPABASE_URL + "/rest/v1/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(row)
      });
      return true;
    } catch (e) {
      console.warn("[Boato] Supabase save failed, falling back to local:", e);
    }
  }
  const rows = localAll();
  rows.push(row);
  localSaveAll(rows);
  return true;
}

async function fetchAll() {
  if (supabaseReady()) {
    try {
      const res = await fetch(SUPABASE_URL + "/rest/v1/submissions?select=*&order=ts.desc", {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY
        }
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("[Boato] Supabase fetch failed, falling back to local:", e);
    }
  }
  return localAll().sort((a, b) => (a.ts < b.ts ? 1 : -1));
}

async function setRead(id, read) {
  if (supabaseReady()) {
    try {
      await fetch(SUPABASE_URL + "/rest/v1/submissions?id=eq." + encodeURIComponent(id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({ read })
      });
      return true;
    } catch (e) {/* fall through to local */}
  }
  const rows = localAll();
  const r = rows.find((x) => x.id === id);
  if (r) {r.read = read;localSaveAll(rows);}
  return true;
}

async function setPaid(id, paid) {
  if (supabaseReady()) {
    try {
      await fetch(SUPABASE_URL + "/rest/v1/submissions?id=eq." + encodeURIComponent(id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({ paid })
      });
      return true;
    } catch (e) {/* fall through to local */}
  }
  const rows = localAll();
  const r = rows.find((x) => x.id === id);
  if (r) {r.paid = paid;localSaveAll(rows);}
  return true;
}

async function remove(id) {
  if (supabaseReady()) {
    try {
      await fetch(SUPABASE_URL + "/rest/v1/submissions?id=eq." + encodeURIComponent(id), {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY
        }
      });
      return true;
    } catch (e) {/* fall through to local */}
  }
  localSaveAll(localAll().filter((x) => x.id !== id));
  return true;
}

/* Infer a submission's section from the email subject line used by
   the site's existing sendFormEmail() calls — keeps the wiring to a
   single line at each form instead of touching every submit handler. */
function inferType(subject, data) {
  const s = (subject || "").toLowerCase();
  const dinner = (data && data["Dinner"] || "").toLowerCase();
  if (s.includes("private/corporate")) return "private";
  if (s.includes("waitlist")) return "waitlist";
  if (s.includes("newsletter")) return "newsletter";
  if (dinner.includes("corporate") || dinner.includes("privad") || dinner.includes("private")) return "private";
  if (s.includes("reservation")) return data && data["Pop-up"] ? "popup" : "supper";
  return "other";
}

window.BoatoSubmissions = { save, fetchAll, setRead, setPaid, remove, inferType, supabaseReady };
