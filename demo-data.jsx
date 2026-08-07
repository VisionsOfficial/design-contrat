// VisionsTrust — Demo 07/08 · single source of truth for the clickable prototype.
// Four offers, their packages, their published baseline, and the shared basket state.
// Catalogue, offer page, basket, personal-data branch and confirmation all read from
// here, so a name, a provider, a package, a price or a gap count can never diverge.
(function () {
const { SECTIONS, ALL_FIELDS, AVAILABILITY } = window.OfferSettingsData;
const { USER_BASELINE } = window.BasketData;
const { accentFor, initials, hexToRgba } = window.CatData;

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isEmpty = (v) => v === "" || v == null || (Array.isArray(v) && v.length === 0);
const fmtN = (n) => Number(n || 0).toLocaleString("en-US").replace(/,/g, " ");

function fmtVal(field, v) {
  if (isEmpty(v)) return "—";
  switch (field.type) {
    case "numberUnit": return `${v.n}${v.u ? " " + v.u : ""}${v.b ? " · " + v.b : ""}`;
    case "multiselect": return v.join(", ");
    case "opValue": return `${v.op} ${v.v}`;
    case "procDeadline": return !/Immediate/.test(v.p) && v.d != null ? `${v.p} · ${v.d}d` : v.p;
    case "matrix": return Object.entries(v).map(([k, x]) => `${k} ${x.n}${x.u}`).join(" · ");
    case "date": return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    default: return String(v);
  }
}
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// ─── THE FOUR OFFERS ──────────────────────────────────────────────────────────
// pii: null | "contains" (controller, exposes personal data) | "processes" (processor).
// `overrides` is the baseline the provider published; packages never move a baseline
// field, so an offer's gap count is the same on the card, on the offer page and in
// the basket.
const RAW = [
  {
    id: "re_contract_corpus", name: "Real Estate Contract Corpus", provider: "LexBase", kind: "Data", pii: null,
    desc: "Twelve years of anonymised French residential lease and sale contracts, OCR-cleaned and segmented clause by clause.",
    tags: ["Legal corpus", "Real estate"], resources: 3, added: "2026-06-18", unit: "documents / month",
    currency: "EUR",
    overrides: {
      availability: "99.9%", response_time: { n: 350, u: "ms", b: "p95" }, support_hours: "Extended 5×12",
      update_frequency: "Weekly", retention_period: "Contract duration", ga_date: "2026-03-01",
    },
    packages: [
      { id: "sample", name: "Sample", price: 0, vol: 500, setup: 0, neg: false, accept: null, res: 1,
        desc: "Evaluate the corpus on a fixed extract before committing.", policies: ["Time Period", "Count"] },
      { id: "standard", name: "Standard", price: 480, vol: 25000, setup: 250, neg: true, accept: { min: 400, max: 480 }, res: 2, recommended: true,
        desc: "Production use on one legal-tech product.", policies: ["Time Period"] },
      { id: "corpus", name: "Full corpus", price: 1800, vol: 250000, setup: 900, neg: true, accept: { min: 1500, max: 1800 }, res: 3,
        desc: "Whole archive, model training allowed.", policies: ["No Restriction", "Notification"] },
    ],
  },
  {
    id: "clause_extractor", name: "Contract Clause Extractor", provider: "Technè Labs", kind: "Service", pii: null,
    desc: "Segments a lease or sale contract and returns typed clauses — term, rent, indexation, deposit, termination — with confidence scores.",
    tags: ["Clause extraction", "NLP"], resources: 2, added: "2026-06-04", unit: "extractions / month",
    currency: "EUR",
    overrides: {
      availability: "99.9%", response_time: { n: 800, u: "ms", b: "p95" }, support_hours: "Business hours 5×8",
      notice_early: { n: 90, u: "days" }, term_convenience: "Yes", update_frequency: "Daily",
    },
    packages: [
      { id: "dev", name: "Developer", price: 0, vol: 1000, setup: 0, neg: false, accept: null, res: 1,
        desc: "Integration tests and proof of concept.", policies: ["Count"] },
      { id: "team", name: "Team", price: 390, vol: 40000, setup: 0, neg: true, accept: { min: 330, max: 390 }, res: 2, recommended: true,
        desc: "One production integration, business-hours support.", policies: ["Time Period"] },
      { id: "enterprise", name: "Enterprise", price: 1450, vol: 400000, setup: 600, neg: true, accept: { min: 1200, max: 1450 }, res: 2,
        desc: "High volume across several products.", policies: ["No Restriction", "Notification"] },
    ],
  },
  {
    id: "tenant_profiles", name: "Tenant Profiles Dataset", provider: "ImmoConnect", kind: "Data", pii: "contains",
    desc: "Tenant identity, tenancy history and payment record, exposed under consent for rental-risk assessment.",
    tags: ["Tenancy history", "Personal data"], resources: 2, added: "2026-05-27", unit: "profiles / month",
    currency: "EUR",
    overrides: {
      availability: "99.95%", update_frequency: "Daily", retention_period: "Until consent withdrawal",
      response_time: { n: 400, u: "ms", b: "p95" }, support_hours: "24/7", notice_nonrenewal: { n: 120, u: "days" },
    },
    packages: [
      { id: "regional", name: "Regional", price: 640, vol: 5000, setup: 300, neg: false, accept: null, res: 1,
        desc: "One metropolitan area, single consuming service.", policies: ["Time Period", "Count"] },
      { id: "national", name: "National", price: 1900, vol: 60000, setup: 750, neg: true, accept: { min: 1600, max: 1900 }, res: 2, recommended: true,
        desc: "Whole national base, up to three consuming services.", policies: ["Time Period"] },
      { id: "national_plus", name: "National + history", price: 3200, vol: 60000, setup: 1200, neg: true, accept: { min: 2800, max: 3200 }, res: 2,
        desc: "Adds ten years of tenancy history to every profile.", policies: ["Notification"] },
    ],
  },
  {
    id: "tenant_risk_scoring", name: "Tenant Risk Scoring API", provider: "ScoreFlow", kind: "Service", pii: "processes",
    desc: "Returns a rental-risk score and its explanation from a tenant profile, with a full audit trail of every scoring decision.",
    tags: ["Risk scoring", "Explainability"], resources: 1, added: "2026-05-14", unit: "scorings / month",
    currency: "EUR",
    overrides: {
      availability: "99.5%", response_time: { n: 250, u: "ms", b: "p95" }, support_hours: "Extended 5×12",
      support_channels: ["Ticketing portal"], renewal_mode: "None (contract ends)", retention_period: "90 days",
    },
    packages: [
      { id: "pilot", name: "Pilot", price: 250, vol: 2000, setup: 0, neg: false, accept: null, res: 1,
        desc: "Calibration on your own portfolio.", policies: ["Count"] },
      { id: "agency", name: "Agency", price: 880, vol: 30000, setup: 400, neg: true, accept: { min: 750, max: 880 }, res: 1, recommended: true,
        desc: "Live scoring for one agency network.", policies: ["Time Period"] },
      { id: "platform", name: "Platform", price: 2600, vol: 250000, setup: 1100, neg: true, accept: { min: 2200, max: 2600 }, res: 1,
        desc: "Embedded scoring inside a rental platform.", policies: ["No Restriction", "Notification"] },
    ],
  },
];
const OFFERS = RAW.map((o) => ({ ...o, accent: accentFor(o.provider + o.name) }));
const byId = (id) => OFFERS.find((o) => o.id === id) || null;
const pkgsOf = (o) => (o && o.packages) || [];
const pkgById = (o, id) => pkgsOf(o).find((p) => p.id === id) || null;
const PII_LABEL = { contains: "Contains personal data", processes: "Processes personal data" };
const KIND_TONE = { Data: "#00a2ae", Service: "#5b6ef5" };

// ─── PERSONAL-DATA DECLARATIONS ───────────────────────────────────────────────
const CONTROLLER_ROWS = [
  { k: "Data controller", v: "ImmoConnect SAS" },
  { k: "Legal basis", v: "Consent (Art. 6-1-a)" },
  { k: "Data subjects", v: "Tenants · Rental applicants", wide: true },
  { k: "Data categories", v: "Identity · Contact details · Tenancy history · Payment record", wide: true },
  { k: "Special categories", v: "None declared" },
  { k: "Retention", v: "Until consent withdrawal" },
  { k: "DPO contact", v: "dpo@immoconnect.eu" },
  { k: "Consent withdrawal", v: "Propagated to the service within 24 h" },
];
// Processor-side declaration, per service offer that could sit in the basket.
const PROCESSOR = {
  tenant_risk_scoring: {
    consumesPII: true, piiComplete: true, role: "Processor",
    purpose: "Rental-risk scoring of tenant applications",
    operations: "Collection · Storage · Scoring · Explanation logging",
    subProcessors: "No", transfers: "No (EU/EEA only)",
    toms: "Encryption at rest · Encryption in transit · Access control (RBAC) · Audit logging",
    dpa: "Signed", retention: "Contract duration, then erasure within 30 days",
  },
  clause_extractor: {
    consumesPII: false, piiComplete: false, purpose: "Clause extraction on contract text",
    reason: "Does not consume personal data",
    reasonHint: "This offer declares no personal-data processing, so it cannot receive this dataset.",
  },
};
// Service offers already contracted in the projects the buyer can assign to.
const PROJECT_SERVICES = [
  { id: "svc_dossier_check", name: "Rental Dossier Checker", provider: "Vérifio", kind: "Service", source: "project",
    consumesPII: true, piiComplete: true, role: "Processor", contractRef: "C-2118",
    purpose: "Completeness and authenticity check on rental dossiers",
    operations: "Collection · Storage · Document verification",
    subProcessors: "No", transfers: "No (EU/EEA only)",
    toms: "Encryption at rest · Encryption in transit · Access control (RBAC)",
    dpa: "Signed", retention: "12 months, then erasure" },
  { id: "svc_rent_index", name: "Rent Index Service", provider: "Observatoire Loyers", kind: "Service", source: "project",
    consumesPII: false, piiComplete: false, purpose: "Reference rent index per district",
    reason: "Does not consume personal data",
    reasonHint: "This offer declares no personal-data processing, so it cannot receive this dataset." },
].map((s) => ({ ...s, accent: accentFor(s.provider + s.name) }));
const isEligible = (s) => !!(s.consumesPII && s.piiComplete);

// ─── PUBLISHED BASELINE ───────────────────────────────────────────────────────
const TP_FIELDS = [
  { id: "tp_start", label: "Time period: Start date", meaning: "Beginning of the authorised period of use.", type: "date", def: "2026-09-01" },
  { id: "tp_end", label: "Time period: End date", meaning: "End of the authorised period of use.", type: "date", def: "2027-08-31" },
];
const POLICY_SEC = { id: "policy", title: "Usage policy — Time period", icon: "clock", fields: TP_FIELDS };
const SEC_LABEL = { policy: "Usage policy", sla: "Service levels (SLA)", duration: "Duration & renewal", termination: "Termination" };
const fieldsOf = (s) => s.fields || (s.groups || []).flatMap((g) => g.fields);
const SEC_DEFS = [POLICY_SEC, ...["sla", "duration", "termination"].map((id) => SECTIONS.find((s) => s.id === id))];
// The fields a taker may counter. Everything else stands as the provider published it.
const NEG_IDS = new Set([
  "tp_start", "tp_end", "delivery_deadline", "availability", "update_frequency", "response_time",
  "retention_period", "support_channels", "support_hours",
  "contract_duration", "renewal_mode", "notice_nonrenewal", "term_convenience", "notice_early",
]);
const FIELD = Object.fromEntries([...ALL_FIELDS, ...TP_FIELDS].map((f) => [f.id, f]));

function meets(field, value, base) {
  if (!base) return true;
  if (isEmpty(value)) return false;
  const n = value && typeof value === "object" && "n" in value ? value.n : value;
  switch (base.op) {
    case "≤": return Number(n) <= base.v;
    case "≥": return Number(n) >= base.v;
    case "=": return value === base.v;
    case "in": return base.v.includes(value);
    case "includesAll": return Array.isArray(value) && base.v.every((x) => value.includes(x));
    case "≥tier": return AVAILABILITY.indexOf(value) >= AVAILABILITY.indexOf(base.v);
    default: return true;
  }
}
const isGap = (field, value, base) => !!base && !meets(field, value, base);
function baselineTarget(field, base, cur) {
  if (!base) return cur;
  switch (base.op) {
    case "≤": case "≥": return field.type === "numberUnit" ? { ...(cur || {}), n: base.v } : base.v;
    case "=": case "≥tier": return base.v;
    case "in": return Array.isArray(base.v) && base.v.includes(cur) ? cur : base.v[0];
    case "includesAll": return Array.from(new Set([...(Array.isArray(cur) ? cur : []), ...base.v]));
    default: return cur;
  }
}

const _terms = new Map();
function termsOf(offer) {
  if (_terms.has(offer.id)) return _terms.get(offer.id);
  const ov = offer.overrides || {};
  const sections = SEC_DEFS.map((s) => ({
    id: s.id, title: SEC_LABEL[s.id] || s.title, icon: s.icon,
    fields: fieldsOf(s)
      .filter((f) => f.type !== "textarea")
      .map((f) => {
        const baseline = ov[f.id] !== undefined ? clone(ov[f.id]) : clone(f.def);
        const neg = NEG_IDS.has(f.id);
        return { ...f, baseline, neg, userBase: USER_BASELINE[f.id] || null, negotiable: neg && !isEmpty(baseline) };
      })
      .filter((f) => f.negotiable || !isEmpty(f.baseline)),
  }));
  const negFields = sections.flatMap((s) => s.fields.filter((f) => f.negotiable));
  const penalty = {};
  SECTIONS.find((s) => s.id === "penalties").fields.forEach((f) => { penalty[f.id] = clone(f.def); });
  const t = { sections, negFields, penalty, checked: negFields.filter((f) => f.userBase) };
  _terms.set(offer.id, t);
  return t;
}

// Gap / meet against the buyer's acceptance baseline, measured on what the provider
// PUBLISHED. Identical on the catalogue card, the offer page and the basket.
const _score = new Map();
function scoreOf(offer) {
  if (_score.has(offer.id)) return _score.get(offer.id);
  const t = termsOf(offer);
  const gapFields = t.checked.filter((f) => isGap(f, f.baseline, f.userBase));
  const s = { gapFields, gapCount: gapFields.length, meetCount: t.checked.length - gapFields.length, checked: t.checked.length };
  _score.set(offer.id, s);
  return s;
}

// ─── BASKET STATE (shared across the five pages) ──────────────────────────────
const KEY = "vt.demo.0708.v1";
const blank = () => ({ cart: [], form: {}, conceded: [], usedBaseline: false, reviewed: false, prices: {}, assign: { tab: "existing", projectId: null, newProj: { title: "", caption: "", desc: "", category: "Real estate" } }, piiSel: [], receipt: null });
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return { ...blank(), ...JSON.parse(raw) }; } catch (e) {}
  return blank();
}
function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} return st; }
function update(fn) { const st = load(); const next = fn({ ...st }) || st; return save(next); }
const reset = () => save(blank());
const cartLines = (st) => (st || load()).cart.map((l) => ({ ...l, offer: byId(l.offerId), pkg: pkgById(byId(l.offerId), l.pkgId) })).filter((l) => l.offer);
const cartCount = (st) => (st || load()).cart.length;
const inCart = (st, id) => (st || load()).cart.some((l) => l.offerId === id);
function addToCart(offerId, pkgId) {
  let mode = "added";
  update((s) => {
    const i = s.cart.findIndex((l) => l.offerId === offerId);
    if (i >= 0) { mode = "updated"; s.cart = s.cart.map((l, k) => (k === i ? { ...l, pkgId } : l)); }
    else s.cart = [...s.cart, { offerId, pkgId }];
    return s;
  });
  return mode;
}
const removeFromCart = (offerId) => update((s) => { s.cart = s.cart.filter((l) => l.offerId !== offerId); s.piiSel = []; return s; });

// Cross-page toast: written before a navigation, read once on arrival.
const FLASH = "vt.demo.0708.flash";
const flash = (msg, tone) => { try { sessionStorage.setItem(FLASH, JSON.stringify({ msg, tone: tone || "ok" })); } catch (e) {} };
function takeFlash() {
  try { const raw = sessionStorage.getItem(FLASH); sessionStorage.removeItem(FLASH); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

const PAGES = {
  catalog: "demo_catalog_07_08.html",
  offer: "demo_offer_07_08.html",
  basket: "demo_basket_07_08.html",
  pii: "demo_basket_pii_07_08.html",
  confirmation: "demo_confirmation_07_08.html",
};
const PROJECTS = window.BasketData.PROJECTS;

window.Demo = {
  OFFERS, byId, pkgsOf, pkgById, PII_LABEL, KIND_TONE, PROJECTS,
  CONTROLLER_ROWS, PROCESSOR, PROJECT_SERVICES, isEligible,
  USER_BASELINE, FIELD, SEC_LABEL, NEG_IDS, termsOf, scoreOf, meets, isGap, baselineTarget,
  clone, eq, isEmpty, fmtVal, fmtN, fmtDate, initials, hexToRgba, accentFor,
  load, save, update, reset, cartLines, cartCount, inCart, addToCart, removeFromCart,
  flash, takeFlash, PAGES,
};
})();
