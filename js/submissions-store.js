/* ============================================================
   BOATO — Form submissions store
   ------------------------------------------------------------
   Every form on the site (reservations, pop-ups, private/corporate
   inquiries, waitlist, newsletter) writes a copy of its submission
   here so the /admin/ and /sakra/ dashboards can list them.

   DEMO MODE (default): submissions are saved to this BROWSER's
   localStorage only. That means the dashboards only see submissions
   made from the same browser/device — fine for testing, NOT fine
   for production (a guest booking from their phone won't show up
   on your laptop).

   TO GO LIVE ACROSS DEVICES: create a free Supabase project
   (supabase.com), make a table called "submissions" with columns
   (id text, type text, data jsonb, ts text, read bool, paid bool),
   then paste your project URL + anon public key below. Once both
   are set, every save/fetch automatically uses Supabase instead of
   localStorage.

   SECURITY — read this before going live:
   Public form submission (save()) only ever needs to INSERT, so it
   stays open to anyone, same as before. But reading/editing/deleting
   submissions (used by /admin and /sakra) goes through password-
   checked Postgres functions (admin_get_submissions, etc.) instead
   of querying the table directly — see supabase-rls-setup.sql in
   the repo root. Run that once in the Supabase SQL editor. Without
   it, Row Level Security isn't enabled and anyone with the public
   API key (visible in this file) can read the whole table directly,
   bypassing the dashboard passwords entirely.
   ============================================================ */

const SUPABASE_URL = "https://eyyssknsvojkufdehhit.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xHjQv6p_kcs5XznseDuXZQ_q-EUpHh3";

// SHA-256 hex digest — used by /admin and /sakra to check a typed
// password against a stored hash instead of a plaintext constant, so
// "View Source" on the page never reveals the real password.
async function sha256Hex(str) {
  const bytes = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

async function rpc(fn, body) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error("RPC " + fn + " failed: " + res.status + " " + msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* ---------- Public: used by the site's own forms ---------- */

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

/* ---------- Admin dashboard: password-gated, full access ----------
   Each call sends the page's password straight through to a Postgres
   function that checks it server-side (see supabase-rls-setup.sql).
   The raw table itself rejects anonymous reads/writes once RLS is on,
   so a wrong or missing password gets nothing back — not just a
   client-side UI that "looks" locked. */

async function adminFetchAll(secret) {
  if (supabaseReady()) {
    try {
      return await rpc("admin_get_submissions", { secret });
    } catch (e) {
      console.warn("[Boato] admin_get_submissions failed, falling back to local:", e);
    }
  }
  return localAll().sort((a, b) => (a.ts < b.ts ? 1 : -1));
}

async function adminUpdate(secret, id, { read, paid, data } = {}) {
  if (supabaseReady()) {
    try {
      await rpc("admin_update_submission", {
        secret, row_id: id,
        new_read: read === undefined ? null : read,
        new_paid: paid === undefined ? null : paid,
        new_data: data === undefined ? null : data
      });
      return true;
    } catch (e) {
      console.warn("[Boato] admin_update_submission failed, falling back to local:", e);
    }
  }
  const rows = localAll();
  const r = rows.find((x) => x.id === id);
  if (r) {
    if (read !== undefined) r.read = read;
    if (paid !== undefined) r.paid = paid;
    if (data !== undefined) r.data = data;
    localSaveAll(rows);
  }
  return true;
}

async function adminRemove(secret, id) {
  if (supabaseReady()) {
    try {
      await rpc("admin_delete_submission", { secret, row_id: id });
      return true;
    } catch (e) {
      console.warn("[Boato] admin_delete_submission failed, falling back to local:", e);
    }
  }
  localSaveAll(localAll().filter((x) => x.id !== id));
  return true;
}

/* ---------- Sakra dashboard: password-gated, scoped to their pop-up
   ----------
   Same idea as admin, but the Postgres functions only ever touch
   rows where Dinner = "Boato x Taberna Sakra" — enforced in the
   database, so even someone who extracts this exact call from the
   page's JS can never read or edit any other guest's data. */

async function sakraFetchAll(secret) {
  if (supabaseReady()) {
    try {
      return await rpc("sakra_get_submissions", { secret });
    } catch (e) {
      console.warn("[Boato] sakra_get_submissions failed, falling back to local:", e);
    }
  }
  return localAll()
    .filter((r) => r.type === "popup" && r.data && r.data.Dinner === "Boato x Taberna Sakra")
    .sort((a, b) => (a.ts < b.ts ? 1 : -1));
}

async function sakraUpdateData(secret, id, data) {
  if (supabaseReady()) {
    try {
      await rpc("sakra_update_submission", { secret, row_id: id, new_data: data });
      return true;
    } catch (e) {
      console.warn("[Boato] sakra_update_submission failed, falling back to local:", e);
    }
  }
  const rows = localAll();
  const r = rows.find((x) => x.id === id);
  if (r) {r.data = data;localSaveAll(rows);}
  return true;
}

async function sakraRemove(secret, id) {
  if (supabaseReady()) {
    try {
      await rpc("sakra_delete_submission", { secret, row_id: id });
      return true;
    } catch (e) {
      console.warn("[Boato] sakra_delete_submission failed, falling back to local:", e);
    }
  }
  localSaveAll(localAll().filter((x) => x.id !== id));
  return true;
}

window.BoatoSubmissions = {
  save, inferType, supabaseReady, sha256Hex,
  adminFetchAll, adminUpdate, adminRemove,
  sakraFetchAll, sakraUpdateData, sakraRemove
};
