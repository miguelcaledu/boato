/* ============================================================
   BOATO — site settings
   ------------------------------------------------------------
   Replaces the design tool's floating "Tweaks" panel. Edit these
   values directly and reload to change the look — no other code
   needs to change.

   lang         "pt" | "en"        — default site language
   headline     "script" | "serif" — hero headline style. NOTE: in
                "script" mode the headline lines are hard-coded to
                Cormorant Garamond in red/white (matching the
                approved design) and ignore scriptFont/scriptColor
                below. Those two only apply in "serif" mode.
   scriptFont   "Italianno" | "Pinyon Script" | "Parisienne"
   scriptColor  any CSS color — cursive-word ink in "serif" mode
   ctaKey       "reserve" | "apply" | "request" | "follow" — which
                copy variant is used for the primary CTA button
   navStyle     "solid" | "transparent" — nav bar over the hero
   scrim        0..1 — hero photo darkening
   ============================================================ */
const SETTINGS = {
  lang: "pt",
  headline: "script",
  scriptFont: "Italianno",
  scriptColor: "#F4EFE6",
  ctaKey: "reserve",
  navStyle: "solid",
  scrim: 0.46
};

const SCRIPT_FONTS = {
  "Italianno": '"Italianno", cursive',
  "Pinyon Script": '"Pinyon Script", cursive',
  "Parisienne": '"Parisienne", cursive'
};

Object.assign(window, { SETTINGS, SCRIPT_FONTS });
