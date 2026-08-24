// VisionsTrust — Basket · merged flow (basket + personal-data steps).
// Same page and same display as the standard basket; when a personal-data offer is in
// the basket, one extra step is inserted (assign the consuming services) and the recap
// carries the personal-data blocks. Without personal data the flow is untouched.
// A single "Review & negotiate" step (steps 1+2 merged). Each offer in the basket
// is one card: its terms are checked against the buyer's acceptance baseline, gaps
// are surfaced, and the buyer settles the offer through three unambiguous per-offer
// actions — Accept the provider's terms / Propose your own (baseline) / Edit field
// by field — or accepts individual gaps inline. "View full terms" opens a side
// drawer with every term, without leaving the page.
(function () {
const { useState, useEffect, useMemo, useRef } = React;
const { Icon, BottomNav, BottomNavSheet } = window.UI;
const { AppLayout } = window.VTLayout;
const { SECTIONS, ALL_FIELDS, AVAILABILITY } = window.OfferSettingsData;
const { PROJECTS, KIND_TONE } = window.BasketData;
const { initials, hexToRgba } = window.CatData;
const D = window.ProjectSettingsData;
const { GovPanel, ClausesPanel } = window.S3F;
const { GuideTour, useBasketGuide } = window.BK3Guide;
const { ExplainDock, WhyVerdict } = window.BK3Explain;
const npClone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
function npClauseDefaults() { const c = {}; D.CLAUSES.fields.forEach((f) => { c[f.id] = npClone(f.def); }); return c; }
// Time Period usage policy — the two dates a taker can ask to move.
const TP_FIELDS = [
  { id: "tp_start", label: "Time period: Start date", meaning: "Beginning of the authorised period of use.", type: "date", def: "2026-09-01", neg: true },
  { id: "tp_end", label: "Time period: End date", meaning: "End of the authorised period of use.", type: "date", def: "2027-08-31", neg: true },
];
const POLICY_SEC = { id: "policy", title: "Usage policy — Time period", icon: "clock", desc: "The authorised period of use attached to this offer.", fields: TP_FIELDS };
const EXTRA_SECTIONS = [POLICY_SEC, D.CLAUSES];
const EXTRA_FIELDS = EXTRA_SECTIONS.flatMap((s) => s.fields);
const FIELD = Object.fromEntries([...ALL_FIELDS, ...EXTRA_FIELDS].map((f) => [f.id, f]));

// ─── DEMO SCENARIOS (driven by the Tweaks panel) ──────────────────────────────
// Every scenario swaps three things: which offers sit in the basket, how many
// packages the packaged offer sells, and which fields the provider left open to
// auto-accept. ITEMS / USER_BASELINE / NEG_IDS are read at call time, so applying
// a scenario and remounting the app is enough.
const ALL_ITEMS = [...window.BasketData.ITEMS, ...window.BK4PII2.EXTRA_ITEMS];
const itemsByIds = (...ids) => ids.map((id) => ALL_ITEMS.find((o) => o.id === id)).filter(Boolean);
const FULL_BASELINE = window.BasketData.USER_BASELINE;
// The only baseline fields a taker may edit / counter. Everything else a provider
// publishes is fixed.
const EDITABLE_NEG = [
  "tp_start", "tp_end",
  "contract_duration", "renewal_mode", "notice_nonrenewal",
  "reversibility", "subcontracting", "security_incident", "ip_outputs",
  "governing_law", "force_majeure", "audit_right", "confidentiality",
];
const BASE_NEG = EDITABLE_NEG;
const WIDE_NEG = EDITABLE_NEG;
const PACKAGED_ID = "mobility_flows_api";
const packagedWith = (n) => { const o = ALL_ITEMS.find((x) => x.id === PACKAGED_ID); return { ...o, packages: o.packages.slice(0, n) }; };
const flatOffers = () => ALL_ITEMS.filter((o) => o.id !== PACKAGED_ID);

const SCENARIOS = {
  many_offers: { label: "Plusieurs offres · plein de champs", items: () => [...flatOffers(), packagedWith(3)], neg: WIDE_NEG, baseline: FULL_BASELINE },
  many_packages: { label: "Plusieurs packages", items: () => [packagedWith(3)], neg: BASE_NEG, baseline: FULL_BASELINE },
  one_package: { label: "Un seul package", items: () => [packagedWith(1)], neg: BASE_NEG, baseline: FULL_BASELINE },
  no_negotiable: { label: "Aucun champ à négocier", items: () => [...flatOffers(), packagedWith(3)], neg: [], baseline: FULL_BASELINE },
  no_baseline: { label: "Aucune baseline définie", items: () => [...flatOffers(), packagedWith(3)], neg: WIDE_NEG, baseline: {} },
  // ── Personal-data pairing scenarios ──────────────────────────────────────
  pii_data: { label: "PII · 1 offre data", items: () => itemsByIds("data_offer_1", "consume_any_data"), neg: BASE_NEG, baseline: FULL_BASELINE },
  pii_service: { label: "PII · 1 offre service", items: () => itemsByIds("skills_analytics_pii"), neg: BASE_NEG, baseline: FULL_BASELINE },
  pii_multi: { label: "PII · plusieurs data + services", items: () => itemsByIds("data_offer_1", "learner_records_pii", "consume_any_data", "skills_analytics_pii"), neg: BASE_NEG, baseline: FULL_BASELINE },
  pii_blocked: { label: "PII · aucune association possible", items: () => itemsByIds("data_offer_1", "learning_reco_pii"), neg: BASE_NEG, baseline: FULL_BASELINE, projectPool: "none" },
};
const SCENARIO_IDS = Object.keys(SCENARIOS);
let SCENARIO = "many_offers";
let ITEMS = SCENARIOS[SCENARIO].items();
let USER_BASELINE = SCENARIOS[SCENARIO].baseline;
let NEG_IDS = new Set(SCENARIOS[SCENARIO].neg);
function applyScenario(id) {
  const s = SCENARIOS[id] || SCENARIOS.many_offers;
  SCENARIO = SCENARIOS[id] ? id : "many_offers";
  ITEMS = s.items(); USER_BASELINE = s.baseline; NEG_IDS = new Set(s.neg);
  _termsCache.clear();
}

const hasBaseline = () => Object.keys(USER_BASELINE).length > 0;

const lsKey = () => "vt.basket.v7." + SCENARIO;
const DOCK_SEEN = "vt.basket.explainer.seen";
const dockSeen = () => { try { return !!localStorage.getItem(DOCK_SEEN); } catch (e) { return false; } };
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isEmpty = (v) => v === "" || v == null || (Array.isArray(v) && v.length === 0);

// ─── VALUE FORMATTING ─────────────────────────────────────────────────────────
function fmtVal(field, v) {
  if (isEmpty(v)) return "—";
  switch (field.type) {
    case "numberUnit": return `${v.n}${v.u ? " " + v.u : ""}${v.b ? " · " + v.b : ""}`;
    case "multiselect": return v.join(", ");
    case "opValue": return `${v.op} ${v.v}`;
    case "procDeadline": return !/Immediate/.test(v.p) && v.d != null ? `${v.p} · ${v.d}d` : v.p;
    case "matrix": return Object.entries(v).map(([k, x]) => `${k} ${x.n}${x.u}`).join(" · ");
    case "date": return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    case "selectDeadline": return `${v.a}${v.b ? " · " + v.b : ""}`;
    case "twoSelect": return `${v.a}${v.b ? " · " + v.b : ""}`;
    default: return String(v);
  }
}

// ─── BASELINE LOGIC ─────────────────────────────────────────────────────────
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
function isGap(field, value, base) { return !!base && !meets(field, value, base); }

// The concrete value a "propose my baseline" counter would set for a field.
function baselineTarget(field, base, cur) {
  if (!base) return cur;
  switch (base.op) {
    case "≤": case "≥":
      return field.type === "numberUnit" ? { ...(cur || {}), n: base.v } : base.v;
    case "=": return base.v;
    case "≥tier": return base.v;
    case "in": return (Array.isArray(base.v) && base.v.includes(cur)) ? cur : base.v[0];
    case "includesAll": return Array.from(new Set([...(Array.isArray(cur) ? cur : []), ...base.v]));
    default: return cur;
  }
}

// ─── BUILD PER-OFFER TERM CONFIG ────────────────────────────────────────────────
const TERM_SECTION_IDS = ["sla", "duration", "termination"];
function fieldsOf(section) { return section.fields || (section.groups || []).flatMap((g) => g.fields); }
const SEC_LABEL = { policy: "Usage policy", sla: "Service levels (SLA)", duration: "Duration & renewal", termination: "Termination", clauses: "Additional clauses" };

function buildTerms(offer, pkg) {
  const ov = { ...(offer.overrides || {}), ...((pkg && pkg.overrides) || {}) };
  const secDefs = [POLICY_SEC, ...TERM_SECTION_IDS.map((sid) => SECTIONS.find((x) => x.id === sid)), D.CLAUSES];
  const sections = secDefs.map((s) => {
    const fields = fieldsOf(s).map((f) => {
      const o = ov[f.id] || {};
      const baseline = o.value !== undefined ? clone(o.value) : clone(f.def);
      const neg = o.neg !== false && NEG_IDS.has(f.id);
      return { ...f, baseline, neg, userBase: USER_BASELINE[f.id] || null, negotiable: neg && !isEmpty(baseline) };
    });
    return { id: s.id, title: s.title, desc: s.desc, icon: s.icon, fields };
  });
  const penSec = SECTIONS.find((s) => s.id === "penalties");
  const penalty = {};
  penSec.fields.forEach((f) => { penalty[f.id] = clone(f.def); });
  const negFields = sections.flatMap((s) => s.fields.filter((f) => f.negotiable));
  const fixedFields = sections.flatMap((s) => s.fields.filter((f) => !f.negotiable && !isEmpty(f.baseline)));
  return { sections, penalty, penSec, negFields, fixedFields, fixedCount: fixedFields.length };
}

// ─── PACKAGES ───────────────────────────────────────────────────────────────
// A packaged offer sells the same data through several formulas. The formula drives
// the price AND part of the terms, so the buyer picks one before negotiating.
const pkgsOf = (offer) => offer.packages || [];
const pkgById = (offer, id) => pkgsOf(offer).find((p) => p.id === id) || null;
const fmtCalls = (n) => Number(n || 0).toLocaleString("en-US").replace(/,/g, " ");
const perCall = (pk) => (pk.calls ? pk.price / pk.calls : null);
const fmtPerCall = (pk) => { const u = perCall(pk); return u == null ? "—" : (u < 0.01 ? u.toFixed(4) : u.toFixed(3)); };
const nPkg = (n) => `${n} package${n !== 1 ? "s" : ""}`;
const _termsCache = new Map();
function termsFor(offer, pkgId) {
  const key = offer.id + "|" + (pkgId || "");
  if (!_termsCache.has(key)) _termsCache.set(key, buildTerms(offer, pkgById(offer, pkgId)));
  return _termsCache.get(key);
}

// Pricing + usage policies, shown on every basket card. For a packaged offer both
// depend on the chosen formula, so before selection we show the range.
// The provider may leave the price negotiable — per offer, or per package.
const priceInfo = (offer, pkgId, ps) => {
  const cur = offer.pricing.currency;
  const pk = pkgById(offer, pkgId);
  const s = ps || {};
  if (pkgsOf(offer).length) {
    if (!pk || !pk.neg) return null;
    const cu = s.pkg && s.pkg[pk.id] != null && s.pkg[pk.id] !== "" ? Number(s.pkg[pk.id]) : Number(pk.price);
    return { pkgId: pk.id, scope: `${pk.name} package`, published: Number(pk.price), current: cu, min: pk.accept && pk.accept.min, max: pk.accept && pk.accept.max, cur, unit: `${cur}/month` };
  }
  const p = offer.pricing;
  if (!p.neg) return null;
  const cu = s.sub != null && s.sub !== "" ? Number(s.sub) : Number(p.sub || 0);
  return { pkgId: null, scope: `${String(p.billing).toLowerCase()} subscription`, published: Number(p.sub || 0), current: cu, min: p.accept && p.accept.min, max: p.accept && p.accept.max, cur, unit: `${cur} · ${p.billing}` };
};

function OfferFacts({ offer, pkgId, priceState }) {
  const cur = offer.pricing.currency;
  const pkgs = pkgsOf(offer);
  const pk = pkgById(offer, pkgId);
  const pi = priceInfo(offer, pkgId, priceState);
  const moved = pi && pi.current !== pi.published;
  let main, sub, pols = [], polNote = "";
  if (pkgs.length) {
    if (pk) {
      main = `${pk.price} ${cur}/month`;
      sub = `${pk.name} · ${fmtCalls(pk.calls)} calls/month · ${pk.setup ? `set-up ${pk.setup} ${cur} once` : "no set-up fee"} · ${fmtPerCall(pk)} ${cur}/call`;
      pols = pk.policies;
    } else {
      const prices = pkgs.map((x) => x.price);
      main = `from ${Math.min(...prices)} ${cur}/month`;
      const cMin = Math.min(...pkgs.map((x) => x.calls)); const cMax = Math.max(...pkgs.map((x) => x.calls));
      sub = `${nPkg(pkgs.length)} · ${cMin === cMax ? fmtCalls(cMin) : `${fmtCalls(cMin)}–${fmtCalls(cMax)}`} calls/month`;
      polNote = "Set by the package you choose";
    }
  } else {
    const p = offer.pricing;
    main = `${p.sub || 0} ${cur} · ${p.billing}`;
    const bits = [];
    if (p.setup && p.setup !== "0") bits.push(`set-up ${p.setup} ${cur} once`);
    if (p.api && p.api !== "0") bits.push(`${p.api} ${cur}/call`);
    sub = bits.join(" · ") || "No set-up fee, no per-call cost";
    pols = offer.policies || [];
  }
  return (
    <div className="bk-facts">
      <div className="bk-fact">
        <span className="bk-fact-k"><Icon name="coin" size={12} /> Pricing</span>
        <span className="bk-fact-v">{moved ? <><s className="bkp-strike">{main}</s> {pi.current} {pi.unit}</> : main}{pi && !moved && <span className="bkp-tag"><Icon name="sliders" size={10} /> negotiable</span>}</span>
        <span className="bk-fact-s">{sub}</span>
      </div>
      <div className="bk-fact">
        <span className="bk-fact-k"><Icon name="shield" size={12} /> Usage policies</span>
        {pols.length
          ? <span className="bk-pkg-pols">{pols.map((x) => <span className="bk-pkg-pol" key={x}>{x}</span>)}</span>
          : <span className="bk-fact-s">{polNote || "No policy published — use without restriction"}</span>}
      </div>
    </div>
  );
}

// Package chooser — shown inside the offer card until a formula is selected.
function PackagePicker({ offer, chosenId, onChoose, compact }) {
  const cur = offer.pricing.currency;
  const pkgs = pkgsOf(offer);
  if (compact && chosenId) {
    const pk = pkgById(offer, chosenId);
    return (
      <div className="bk-pkg-chosen">
        <span className="bk-pkg-chosen-ic"><Icon name="coin" size={15} /></span>
        <div className="bk-pkg-chosen-main">
          <div className="bk-pkg-chosen-t">Package · <b>{pk.name}</b>{pk.recommended && <span className="bk-pkg-star"><Icon name="star" size={9} /> Recommended</span>}</div>
          <div className="bk-pkg-chosen-d">{pk.desc} The baseline below is the one attached to this package.</div>
        </div>
        <button type="button" className="bk-btn ghost sm" onClick={() => onChoose(null)}><Icon name="refresh" size={13} /> Change package</button>
      </div>
    );
  }
  return (
    <div className="bk-pkg-pick">
      <div className="bk-pkg-head">
        <Icon name="coin" size={14} />
        <div><b>Choose a package to continue</b><span>{`This offer comes in ${pkgs.length} formula${pkgs.length !== 1 ? "s" : ""}. The formula sets the price, the usage policies and part of the service levels — so pick one before adjusting the baseline.`}</span></div>
      </div>
      <div className="bk-pkg-grid">
        {pkgs.map((pk) => (
          <div className={`bk-pkg-opt${pk.recommended ? " reco" : ""}${chosenId === pk.id ? " on" : ""}`} key={pk.id}>
            {pk.recommended && <span className="bk-pkg-flag"><Icon name="star" size={9} /> Recommended</span>}
            <div className="bk-pkg-name">{pk.name}</div>
            <div className="bk-pkg-price">{pk.price} <span>{cur}/month</span></div>
            <div className="bk-pkg-calls">{fmtCalls(pk.calls)} calls / month</div>
            <ul className="bk-pkg-list">
              <li><Icon name="check" size={12} /> {pk.setup ? `Set-up fee ${pk.setup} ${cur} (once)` : "No set-up fee"}</li>
              <li><Icon name="check" size={12} /> {fmtPerCall(pk)} {cur} per call</li>
              <li><Icon name="check" size={12} /> Availability {(pk.overrides.availability || {}).value || "—"}</li>
              <li><Icon name="check" size={12} /> Support {(pk.overrides.support_hours || {}).value || "—"}</li>
              <li>{pk.neg ? <span title="Open to a counter-offer."><Icon name="sliders" size={12} /> Negotiable price</span> : <><Icon name="lock" size={12} /> Fixed price</>}</li>
            </ul>
            <div className="bk-pkg-pols">{pk.policies.length ? pk.policies.map((x) => <span className="bk-pkg-pol" key={x}>{x}</span>) : <span className="bk-pkg-pol none">No usage policy</span>}</div>
            <div className="bk-pkg-desc">{pk.desc}</div>
            <button type="button" className={chosenId === pk.id ? "bk-btn sm" : "bk-confirm sm"} onClick={() => onChoose(pk.id)}>
              {chosenId === pk.id ? <>Selected <Icon name="check" size={14} /></> : <>Select this package <Icon name="arrowRight" size={14} /></>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── INPUTS ─────────────────────────────────────────────────────────────────
const Sel = ({ value, onChange, options, width }) => (
  <span className="os-selectw" style={width ? { width } : undefined}>
    <select className="os-in" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <Icon name="chevronDown" size={13} className="os-chev" />
  </span>
);
const Num = ({ value, onChange }) => (
  <input type="number" className="os-in num" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
);
function EditControl({ field, value, onChange }) {
  switch (field.type) {
    case "text": return <input className="os-in sm" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "textarea": return <textarea className="os-ta" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "yesno": return <div className="seg2 mini">{["Yes", "No"].map((o) => <button key={o} type="button" className={value === o ? "active teal" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>;
    case "select": return <Sel value={value} onChange={onChange} options={field.options} />;
    case "date": return <input type="date" className="os-in sm" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "selectDeadline": return (<><Sel value={value?.a} onChange={(a) => onChange({ ...value, a })} options={field.options} /><Sel value={value?.b} onChange={(b) => onChange({ ...value, b })} options={field.deadlines} /></>);
    case "twoSelect": return (<><Sel value={value?.a} onChange={(a) => onChange({ ...value, a })} options={field.options} /><Sel value={value?.b} onChange={(b) => onChange({ ...value, b })} options={field.options2} /></>);
    case "numberUnit": return (<><Num value={value?.n} onChange={(n) => onChange({ ...value, n })} /><Sel value={value?.u} onChange={(u) => onChange({ ...value, u })} options={field.units} />{field.basis && <Sel value={value?.b} onChange={(b) => onChange({ ...value, b })} options={field.basis} />}</>);
    case "multiselect": return (<div className="os-chips" style={{ justifyContent: "flex-start" }}>{field.options.map((o) => { const on = (value || []).includes(o); return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])}>{o}</button>; })}</div>);
    case "matrix": return (<div className="os-matrix">{field.rows.map((r) => (<div className="mrow" key={r}><span className="mkey"><span className={`os-sev-dot os-sev-${r}`} />{r}</span><span className="mval"><Num value={value?.[r]?.n} onChange={(n) => onChange({ ...value, [r]: { ...value[r], n } })} /><Sel value={value?.[r]?.u} onChange={(u) => onChange({ ...value, [r]: { ...value[r], u } })} options={field.units} /></span></div>))}</div>);
    default: return <span className="os-unit">{fmtVal(field, value)}</span>;
  }
}

// ─── MONOGRAM / OFFER HEAD ──────────────────────────────────────────────────────
function Monogram({ offer, size = 52 }) {
  return (
    <div className="bk-mono" style={{ width: size, height: size, background: `linear-gradient(135deg, ${hexToRgba(offer.accent, 0.9)}, ${hexToRgba(offer.accent, 0.55)})` }} aria-hidden="true">
      {initials(offer.name)}
    </div>
  );
}
function OfferHead({ offer, size = 46, children }) {
  const dot = KIND_TONE[offer.kind] || "#00a2ae";
  return (
    <div className="bk-offer-top">
      <Monogram offer={offer} size={size} />
      <div className="bk-offer-main">
        <div className="bk-offer-metarow">
          <span className="bk-kind" style={{ borderColor: hexToRgba(dot, .5), color: dot }}><span className="bk-kind-dot" style={{ background: dot }} />{offer.kind}</span>
          <span className="bk-offer-by">proposed by {offer.provider}</span>
        </div>
        <h3 className="bk-offer-name">{offer.name}</h3>
      </div>
      {children && <div className="bk-offer-actions">{children}</div>}
    </div>
  );
}

// ─── PER-OFFER STATE DERIVATION ─────────────────────────────────────────────────
// mode: "pending" | "accepted" | "countered" | "edited"
function deriveOffer(terms, proposal, decision) {
  const negs = terms.negFields;
  const withBase = negs.filter((f) => f.userBase);
  const conceded = decision.conceded || [];
  const mode = decision.mode || "pending";
  let gapFields, meetCount;
  if (mode === "accepted" || mode === "countered") {
    gapFields = [];
    meetCount = withBase.length;
  } else {
    gapFields = withBase.filter((f) => isGap(f, proposal[f.id], f.userBase) && !conceded.includes(f.id));
    meetCount = withBase.length - gapFields.length;
  }
  const changedCount = negs.filter((f) => !eq(proposal[f.id], f.baseline)).length;
  return { negs, withBase, conceded, mode, gapFields, gapCount: gapFields.length, meetCount, changedCount, settled: mode !== "pending" };
}

// ─── GAP / MEET SUMMARY BADGES ───────────────────────────────────────────────────
function StatusBadges({ gapCount, meetCount }) {
  if (!hasBaseline()) return (
    <div className="bk2-badges">
      <span className="bk2-badge none"><Icon name="info" size={12} /><span>Not checked</span></span>
    </div>
  );
  return (
    <div className="bk2-badges">
      {gapCount > 0
        ? <span className="bk2-badge gap"><Icon name="triggers" size={12} /><span><b>{gapCount}</b> gap{gapCount !== 1 ? "s" : ""}</span></span>
        : <span className="bk2-badge allok"><Icon name="check" size={12} /><span>No gaps</span></span>}
      {meetCount > 0 && <span className="bk2-badge meet"><Icon name="check" size={12} /><span><b>{meetCount}</b> meet</span></span>}
    </div>
  );
}

// ─── STEP 1 · OFFER CARD ─────────────────────────────────────────────────────────
function PriceNegotiate({ info, onSet, onReset }) {
  const { published, current, min, max, cur, unit } = info;
  const moved = current !== published;
  const hasRange = min != null && max != null;
  const inRange = hasRange && current >= min && current <= max;
  const verdict = !moved
    ? { cls: "neutral", ic: "info", txt: "Price taken as published." }
    : inRange
      ? { cls: "ok", ic: "check", txt: "Counter sent to the provider's agent on confirm." }
      : { cls: "gap", ic: "triggers", txt: "Counter sent to the provider's agent on confirm." };
  return (
    <div className="bkp">
      <div className="bkp-head">
        <Icon name="coin" size={14} />
        <div><b>The price is negotiable</b><span>Counter the price of this {info.scope} here.</span></div>
      </div>
      <div className="bkp-body">
        <div className="bkp-col">
          <span className="bkp-k">Published by the provider</span>
          <span className="bkp-pub">{published} <em>{unit}</em></span>
        </div>
        <div className="bkp-col">
          <span className="bkp-k">Your price for this offer</span>
          <div className="bkp-inputs">
            <input type="number" className="os-in num" value={current} min={0} onChange={(e) => onSet(e.target.value === "" ? "" : Number(e.target.value))} />
            <span className="bkp-unit">{unit}</span>
            {moved && (hasRange
              ? (inRange
                ? <span className="bkp-sig ok" title={`Within the provider's auto-accept range (${min}–${max} ${cur})`}><Icon name="check" size={12} /> Auto-accepted</span>
                : <span className="bkp-sig rev" title={`Outside the provider's auto-accept range (${min}–${max} ${cur})`}><Icon name="triggers" size={12} /> Need review</span>)
              : <span className="bkp-sig rev" title="No auto-accept range published"><Icon name="triggers" size={12} /> Need review</span>)}
          </div>
        </div>
      </div>
      <div className={`bkp-verdict ${verdict.cls}`}><Icon name={verdict.ic} size={13} /> {verdict.txt}</div>
    </div>
  );
}

function OfferCard({ offer, terms, proposal, decision, pkgId, help, phase = "negotiate", priceState, onSetPrice, onResetPrice, onChoosePackage, onConcede, onSetField, onProposeField, onAcceptAll, onCounterAll, onReopen, onEdit, onView, onSave, onRemove }) {
  const d = deriveOffer(terms, proposal, decision);
  const hasPkgs = pkgsOf(offer).length > 0;
  const needsPkg = hasPkgs && !pkgId;
  const stateClass = d.mode === "accepted" ? "is-accepted" : (d.mode === "countered" || d.mode === "edited") ? "is-countered" : "is-pending";
  const reviewing = phase === "review";
  const pInfo = needsPkg ? null : priceInfo(offer, pkgId, priceState);

  return (
    <article className={`bk2-card ${stateClass}`}>
      <span className="bk2-rail" aria-hidden="true" />
      <div className="bk2-card-head">
        <OfferHead offer={offer}>
          <button type="button" className="bk-btn ghost sm" onClick={onSave} title="Save for later"><Icon name="bookmark" size={14} /><span className="bk2-hide-sm">Save</span></button>
          <button type="button" className="bk-icon-danger sm" onClick={onRemove} aria-label={`Remove ${offer.name}`}><Icon name="trash" size={15} /></button>
        </OfferHead>
        <div className="bk2-summary">
          {needsPkg
            ? <span className="bk2-badge gap"><Icon name="coin" size={12} /><span>{nPkg(pkgsOf(offer).length)}</span></span>
            : <StatusBadges gapCount={d.gapCount} meetCount={d.meetCount} />}
          {!needsPkg && !d.settled && !reviewing && <div className="bk2-summary-acts">
            <button type="button" className="bk2-sum-btn accept" onClick={onAcceptAll}><Icon name="check" size={13} /> Accept all baseline</button>
            {hasBaseline() && <button type="button" className="bk2-sum-btn propose" onClick={onCounterAll}><Icon name="sliders" size={13} /> Propose your baseline</button>}
          </div>}
          {!needsPkg && <button type="button" className="bk2-viewfull" onClick={onView}><Icon name="list" size={14} /> View full baseline</button>}
          {help === "explain" && !reviewing && <WhyVerdict d={d} terms={terms} needsPkg={needsPkg} hasBaseline={hasBaseline()} fmtVal={fmtVal} />}
        </div>
      </div>

      <OfferFacts offer={offer} pkgId={pkgId} priceState={priceState} />
      {hasPkgs && <PackagePicker offer={offer} chosenId={pkgId} compact={!needsPkg} onChoose={onChoosePackage} />}
      {pInfo && onSetPrice && <PriceNegotiate info={pInfo} onSet={(v) => onSetPrice(pInfo.pkgId, v)} onReset={() => onResetPrice(pInfo.pkgId)} />}
      {/* ── SETTLED banner ─────────────────────────── */}
      {needsPkg ? null : reviewing ? null : d.settled ? (
        <div className={`bk2-verdict ${d.mode === "accepted" ? "accepted" : "countered"}`}>
          <span className="bk2-verdict-ic">
            <Icon name={d.mode === "accepted" ? "check" : d.mode === "countered" ? "sliders" : "edit"} size={16} />
          </span>
          <div className="bk2-verdict-txt">
            <div className="bk2-verdict-title">
              {d.mode === "accepted" && "Provider's baseline accepted"}
              {d.mode === "countered" && (d.withBase.length === 0 ? "Your counter-offer — no baseline covered this offer" : "Your counter-offer — baseline applied")}
              {d.mode === "edited" && "Your counter-offer — custom baseline"}
            </div>
            <div className="bk2-verdict-sub">
              {d.mode === "accepted" && (d.negs.length === 0 ? "This offer has no negotiable field — everything stands as published." : `You take all ${d.negs.length} negotiable baseline exactly as published. Nothing to negotiate.`)}
              {d.mode === "countered" && (d.withBase.length === 0 ? "Nothing to propose — no acceptance baseline covers this offer's negotiable fields." : `Your acceptance baseline is proposed on ${d.withBase.length} baseline field${d.withBase.length !== 1 ? "s" : ""}. Sent to the provider on confirm.`)}
              {d.mode === "edited" && `${d.changedCount} field${d.changedCount !== 1 ? "s" : ""} changed to your own values.${d.gapCount ? ` ${d.gapCount} still below baseline.` : ""} Sent to the provider on confirm.`}
            </div>
          </div>
          <div className="bk2-verdict-actions">
            {(d.mode === "countered" || d.mode === "edited") && <button type="button" className="bk-btn sm" onClick={onEdit}><Icon name="edit" size={13} /> Adjust</button>}
            <button type="button" className="bk-btn ghost sm" onClick={onReopen}><Icon name="refresh" size={13} /> Change</button>
          </div>
        </div>
      ) : (
        <>
          {/* ── GAP LIST (accept inline) ────────────── */}
          {d.gapCount > 0 ? (
            <div className="bk2-gaps">
              <div className="bk2-gaps-head"><Icon name="triggers" size={13} /> These fall short of your baseline — accept them one by one, or answer the whole offer below.</div>
              {d.gapFields.map((f) => (
                <div className="bk2-gaprow" key={f.id}>
                  <div className="bk2-gap-info">
                    <span className="bk2-gap-name">{f.label}</span>
                    <span className="bk2-gap-vals">
                      <span className="bk2-gap-prov">Offer baseline: <b>{fmtVal(f, f.baseline)}</b></span>
                      <span className="bk2-gap-sep">·</span>
                      <span className="bk2-gap-base">your baseline:</span>
                    </span>
                    <div className="bk2-gap-edit"><EditControl field={f} value={proposal[f.id]} onChange={(v) => onProposeField(f.id, v)} /></div>
                  </div>
                  <div className="bk2-gap-btns">
                    <button type="button" className="bk2-gap-accept" onClick={() => onConcede(f.id)} title="Accept the provider's baseline for this field">
                      <Icon name="check" size={13} /> Accept this baseline
                    </button>
                    <button type="button" className="bk2-gap-propose" onClick={() => onProposeField(f.id, baselineTarget(f, f.userBase, proposal[f.id]))} title="Propose your baseline value for this field">
                      <Icon name="sliders" size={13} /> Propose your baseline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`bk2-allok${d.negs.length === 0 || !hasBaseline() ? " neutral" : ""}`}><Icon name={d.negs.length === 0 || !hasBaseline() ? "info" : "check"} size={14} /> {d.negs.length === 0
              ? "Nothing to negotiate on this offer — every field is fixed as published."
              : !hasBaseline()
                ? "No acceptance baseline to check against — review the fields yourself, or take the offer as published."
                : "Every field meets your acceptance baseline — no gaps to settle."}</div>
          )}

        </>
      )}
    </article>
  );
}

// ─── FULL-TERMS SIDE DRAWER (view + field-by-field edit) ─────────────────────────
function TermsDrawer({ offer, terms, proposal, decision, open, initialMode, readOnly, onClose, onSetField, onResetField, onConcede, onAcceptAll, onCounterAll }) {
  const [mode, setMode] = useState(readOnly ? "review" : (initialMode || "review"));
  useEffect(() => { setMode(readOnly ? "review" : (initialMode || "review")); }, [offer && offer.id, initialMode, readOnly]);
  if (!offer) return null;
  const d = deriveOffer(terms, proposal, decision);
  const sections = terms.sections;
  const conceded = d.conceded;

  const renderTerm = (f) => {
    const base = f.userBase;
    const val = f.negotiable ? proposal[f.id] : f.baseline;
    const isConceded = conceded.includes(f.id);
    const gap = f.negotiable && base && isGap(f, val, base) && !isConceded && d.mode !== "countered" && d.mode !== "accepted";
    const changed = f.negotiable && !eq(val, f.baseline);
    let chip;
    if (!f.negotiable) chip = <span className="bk-fixed-tag"><Icon name="lock" size={10} /> Fixed</span>;
    else if (gap) chip = <span className="bk-st st-gap"><Icon name="triggers" size={10} /> Gap</span>;
    else if (isConceded) chip = <span className="bk-st st-ok"><Icon name="check" size={10} /> Accepted</span>;
    else if (base) chip = <span className="bk-st st-ok"><Icon name="check" size={10} /> Meets</span>;
    else chip = <span className="bk-st st-edit"><Icon name="edit" size={10} /> Open</span>;

    return (
      <div className={`bk2-drow ${gap ? "gap" : ""} ${!f.negotiable ? "fixed" : ""}`} key={f.id}>
        <div className="bk2-drow-top">
          <span className="bk2-drow-name">{f.label}</span>
          {chip}
        </div>
        {mode === "edit" && f.negotiable ? (
          <div className="bk2-drow-ctl"><EditControl field={f} value={val} onChange={(v) => onSetField(f.id, v)} /></div>
        ) : (
          <div className="bk2-drow-val">{fmtVal(f, val)}</div>
        )}
        <div className="bk2-drow-foot">
          {base
            ? <span className={`bk-guide ${gap ? "gap" : ""}`}><Icon name="sliders" size={11} /> Your baseline: <b>{base.label}</b></span>
            : f.negotiable
              ? <span className="bk-guide muted">No requirement — open to negotiation.</span>
              : <span className="bk-guide muted">Set by the provider, not negotiable.</span>}
          {mode === "edit" && changed && <button type="button" className="bk-reset" onClick={() => onResetField(f.id)}>Reset to {fmtVal(f, f.baseline)}</button>}
          {!readOnly && mode === "review" && gap && <button type="button" className="bk2-gap-accept mini" onClick={() => onConcede(f.id)}><Icon name="check" size={12} /> Accept</button>}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`bk2-scrim ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`bk2-drawer ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-label={`Full baseline — ${offer.name}`}>
        <header className="bk2-drawer-head">
          <div className="bk2-drawer-title">
            <Monogram offer={offer} size={38} />
            <div>
              <div className="bk2-drawer-name">{offer.name}</div>
              <div className="bk2-drawer-by">proposed by {offer.provider}</div>
            </div>
          </div>
          <button type="button" className="bk2-drawer-close" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </header>
        <div className="bk2-drawer-toolbar">
          <StatusBadges gapCount={d.gapCount} meetCount={d.meetCount} />
          {readOnly
            ? <span className="bk2-drawer-ro"><Icon name="lock" size={12} /> Read-only — go back to step 1 to change baseline</span>
            : <div className="seg2 mini bk2-drawer-mode">
                <button type="button" className={mode === "review" ? "active teal" : ""} onClick={() => setMode("review")}><Icon name="eye" size={13} /> Review</button>
                <button type="button" className={mode === "edit" ? "active teal" : ""} onClick={() => setMode("edit")}><Icon name="edit" size={13} /> Edit</button>
              </div>}
        </div>
        <div className="bk2-drawer-body">
          {sections.map((sec) => {
            const shown = sec.fields.filter((f) => f.negotiable || !isEmpty(f.baseline));
            if (!shown.length) return null;
            return (
              <div className="bk2-dsec" key={sec.id}>
                <div className="bk2-dsec-head"><span className="bk-tsec-ic"><Icon name={sec.icon} size={13} /></span>{SEC_LABEL[sec.id] || sec.title}</div>
                <div className="bk2-dsec-body">{shown.map(renderTerm)}</div>
              </div>
            );
          })}
          <div className="bk2-dsec">
            <div className="bk2-dsec-head"><span className="bk-tsec-ic"><Icon name="shield" size={13} /></span>Commitments &amp; penalties</div>
            <div className="bk-commit">
              <Icon name="shield" size={14} />
              <span>Backed by a <b>{terms.penalty.consequence_type}</b> penalty if <b>{terms.penalty.commitment_concerned}</b> falls {terms.penalty.trigger_threshold.op} {terms.penalty.trigger_threshold.v} ({terms.penalty.penalty_amount.n} {terms.penalty.penalty_amount.u}, assessed {terms.penalty.measurement_period.toLowerCase()}).</span>
            </div>
          </div>
        </div>
        {readOnly
          ? <footer className="bk2-drawer-foot"><button type="button" className="bk-btn ghost" onClick={onClose}><Icon name="x" size={14} /> Close</button></footer>
          : <footer className="bk2-drawer-foot">
              {hasBaseline() && <button type="button" className="bk2-act counter compact" onClick={onCounterAll}><span className="bk2-act-ic"><Icon name="sliders" size={16} /></span><span className="bk2-act-main">Propose your baseline</span></button>}
              <button type="button" className="bk2-act accept compact" onClick={onAcceptAll}><span className="bk2-act-ic"><Icon name="check" size={16} /></span><span className="bk2-act-main">Accept offer baseline</span></button>
            </footer>}
      </aside>
    </>
  );
}

// ─── ACCEPTANCE BASELINE (recalled from settings) ────────────────────────────────
function BaselineRecall() {
  const [open, setOpen] = useState(false);
  const ids = Object.keys(USER_BASELINE);
  return (
    <div className={`bk-baseline ${open ? "open" : ""}`}>
      <div className="bk-baseline-bar">
        <span className="bk-baseline-ic"><Icon name="sliders" size={16} /></span>
        <div className="bk-baseline-txt">
          <div className="bk-baseline-title">Your acceptance baseline</div>
          <div className="bk-baseline-sub">{ids.length ? "Your minimum requirements — set once in settings, checked against every offer here." : "Not set yet — no offer is checked automatically, so review each one yourself."}</div>
        </div>
        <a className="bk-baseline-link" href="Profile Settings.html"><Icon name="external" size={13} /> Edit in settings</a>
        <button type="button" className="bk-baseline-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Hide baseline" : "Show baseline"}>
          <Icon name={open ? "chevronUp" : "chevronDown"} size={16} />
        </button>
      </div>
      {open && (
        <div className="bk-baseline-body">
          {!ids.length && <div className="bk-baseline-none"><Icon name="info" size={13} /> No acceptance baseline set yet — nothing is checked automatically, so review each offer yourself.</div>}
          {ids.map((id) => (
            <div className="bk-baseline-row" key={id}>
              <span className="bk-baseline-k">{FIELD[id] ? FIELD[id].label : id}</span>
              <span className="bk-baseline-v">{USER_BASELINE[id].label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── STEP 2 · ONE BASELINE FORM FOR THE WHOLE BASKET ────────────────────────────
// The buyer configures the negotiable fields once. Each row shows what every
// provider published for that field, so the counter he creates is explicit: the
// providers whose value differs are the ones he is negotiating with.
const majority = (pubs) => {
  const c = new Map();
  pubs.forEach((p) => { const k = JSON.stringify(p.value); c.set(k, (c.get(k) || 0) + 1); });
  let best = null, n = -1;
  c.forEach((v, k) => { if (v > n) { n = v; best = k; } });
  return best == null ? null : JSON.parse(best);
};
function ProvChip({ p, field, mine, onAdopt }) {
  const same = eq(p.value, mine);
  return (
    <button type="button" className={`bk3-prov${same ? " same" : ""}`} disabled={same} onClick={() => onAdopt(p.value)}
      title={same ? "Your value already matches this provider" : `Take ${p.offer.provider}'s published value`}>
      <Monogram offer={p.offer} size={22} />
      <span className="bk3-prov-txt">
        <span className="bk3-prov-who">{p.offer.provider}</span>
        <span className="bk3-prov-val">{fmtVal(field, p.value)}</span>
      </span>
      {!same && <span className="bk3-prov-tag diff" title="Your counter-proposal applies to every offer in the basket"><Icon name="sliders" size={10} /> you counter</span>}
    </button>
  );
}
function BaselineForm({ groups, values, touched, conceded, offers, onSet, onReset, onConcede, onApplyBaseline, onTakePublished }) {
  const rows = groups.flatMap((g) => g.rows);
  const diffOf = (r) => r.pubs.filter((p) => !eq(p.value, values[r.field.id]));
  const movedRows = rows.filter((r) => diffOf(r).length > 0);
  const gapRows = rows.filter((r) => r.field.userBase && isGap(r.field, values[r.field.id], r.field.userBase) && !conceded.includes(r.field.id));
  const counterIds = new Set();
  movedRows.forEach((r) => diffOf(r).forEach((p) => counterIds.add(p.offer.id)));
  const withBase = rows.filter((r) => r.field.userBase).length;

  const renderRow = (r) => {
    const f = r.field;
    const v = values[f.id];
    const base = f.userBase;
    const isCon = conceded.includes(f.id);
    const gap = !!base && isGap(f, v, base) && !isCon;
    const diff = diffOf(r);
    const fixedOn = offers.filter((o) => !r.pubs.some((p) => p.offer.id === o.id));
    let chip;
    if (gap) chip = <span className="bk-st st-gap"><Icon name="triggers" size={10} /> Below your baseline</span>;
    else if (isCon && base && isGap(f, v, base)) chip = <span className="bk-st st-ok"><Icon name="check" size={10} /> Accepted below baseline</span>;
    else if (base) chip = <span className="bk-st st-ok"><Icon name="check" size={10} /> Meets your baseline</span>;
    else if (diff.length) chip = <span className="bk-st st-edit"><Icon name="edit" size={10} /> Your own value</span>;
    else chip = null;
    return (
      <div className={`bk3-row${gap ? " gap" : ""}`} key={f.id}>
        <div className="bk3-row-head">
          <span className="bk3-row-name">{f.label}</span>
          {chip}
          {diff.length > 0 && <span className="bk3-row-count"><Icon name="sliders" size={10} /> counters {diff.length} of {r.pubs.length} provider{r.pubs.length !== 1 ? "s" : ""}</span>}
        </div>
        <div className="bk3-row-body">
          <div className="bk3-row-ctl">
            <span className="bk3-row-label">Your value for every offer</span>
            <div className="bk3-row-inputs"><EditControl field={f} value={v} onChange={(nv) => onSet(f.id, nv)} /></div>
            <div className="bk3-row-foot">
              {base
                ? <span className={`bk-guide ${gap ? "gap" : ""}`}><Icon name="sliders" size={11} /> Your baseline: <b>{base.label}</b></span>
                : <span className="bk-guide muted">No requirement in your baseline — open value.</span>}
              {diff.length > 0 && <span className="bk-guide"><Icon name="sliders" size={11} /> Counter sent to all {r.pubs.length} offer{r.pubs.length !== 1 ? "s" : ""} in the basket.</span>}
              {touched.has(f.id) && <button type="button" className="bk-reset" onClick={() => onReset(f.id)}>Reset to {fmtVal(f, majority(r.pubs))}</button>}
              {gap && <button type="button" className="bk2-gap-accept mini" onClick={() => onConcede(f.id)}><Icon name="check" size={12} /> Accept below baseline</button>}
            </div>
          </div>
          <div className="bk3-row-provs">
            <span className="bk3-row-label">Published by the providers</span>
            <div className="bk3-prov-list">{r.pubs.map((p) => <ProvChip key={p.offer.id} p={p} field={f} mine={v} onAdopt={(nv) => onSet(f.id, nv)} />)}</div>
            {fixedOn.length > 0 && <div className="bk3-row-fixed"><Icon name="lock" size={11} /> Fixed on {fixedOn.map((o) => o.name).join(", ")} — your value does not apply there.</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bk3-form">
      <div className="bk3-form-head">
        <div className="bk3-form-stats">
          <span className="bk-recap-pill"><b>{rows.length}</b><span>negotiable field{rows.length !== 1 ? "s" : ""}</span></span>
          <span className={`bk-recap-pill${movedRows.length ? " teal" : " ok"}`}><Icon name={movedRows.length ? "sliders" : "check"} size={11} /><b>{movedRows.length}</b><span>moved</span></span>
          <span className="bk-recap-pill"><Icon name="layers" size={11} /><b>{counterIds.size}</b><span>of {offers.length} offer{offers.length !== 1 ? "s" : ""} countered</span></span>
          {gapRows.length > 0
            ? <span className="bk-recap-pill gap"><Icon name="triggers" size={11} /><b>{gapRows.length}</b><span>below your baseline</span></span>
            : <span className="bk-recap-pill ok"><Icon name="check" size={11} /><span>No gap</span></span>}
        </div>
        <div className="bk3-form-acts">
          {withBase > 0 && <button type="button" className="bk2-sum-btn propose" onClick={onApplyBaseline}><Icon name="sliders" size={13} /> Apply my acceptance baseline</button>}
          <button type="button" className="bk2-sum-btn accept" onClick={onTakePublished}><Icon name="check" size={13} /> Take what providers published</button>
        </div>
      </div>
      {rows.length === 0
        ? <div className="bk-none">Nothing to configure — every field of these offers is fixed by the providers.</div>
        : groups.map((g) => (
            <div className="bk3-group" key={g.id}>
              <div className="bk3-group-head"><span className="bk-tsec-ic"><Icon name={g.icon} size={13} /></span>{g.title}<span className="bk3-group-n">{g.rows.length}</span></div>
              {g.rows.map(renderRow)}
            </div>
          ))}
    </div>
  );
}

// ─── PERSISTENT RECAP ───────────────────────────────────────────────────────────
const VERDICT_TAG = {
  accepted: { cls: "ok", ic: "check", txt: "Accepted" },
  countered: { cls: "teal", ic: "sliders", txt: "Counter · baseline" },
  edited: { cls: "teal", ic: "edit", txt: "Counter · custom" },
};
function RecapBar({ rows, target }) {
  const [open, setOpen] = useState(false);
  if (!rows.length) return null;
  const pending = rows.filter((r) => !r.settled).length;
  const gapTotal = rows.reduce((s, r) => s + r.gapCount, 0);
  return (
    <div className={`bk-recap ${open ? "open" : ""}`}>
      <button type="button" className="bk-recap-bar" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="bk-recap-title"><Icon name="list" size={14} /> Summary</span>
        <span className="bk-recap-stats">
          <span className="bk-recap-pill"><b>{rows.length}</b><span>offer{rows.length !== 1 ? "s" : ""}</span></span>
          {pending > 0
            ? <span className="bk-recap-pill gap"><Icon name="hourglass" size={11} /><b>{pending}</b><span>to settle</span></span>
            : <span className="bk-recap-pill ok"><Icon name="check" size={11} /><span>All settled</span></span>}
          {gapTotal > 0 && <span className="bk-recap-pill gap"><Icon name="triggers" size={11} /><b>{gapTotal}</b><span>open gap{gapTotal !== 1 ? "s" : ""}</span></span>}
          {target && <span className="bk-recap-pill"><Icon name="folder" size={11} /> {target}</span>}
        </span>
        <span className="bk-recap-cta">{open ? "Hide" : "Details"}<Icon name={open ? "chevronUp" : "chevronDown"} size={15} /></span>
      </button>
      {open && (
        <div className="bk-recap-body">
          {rows.map((r) => {
            const v = r.settled ? VERDICT_TAG[r.mode] : null;
            return (
              <div className="bk-recap-row" key={r.offer.id}>
                <Monogram offer={r.offer} size={30} />
                <span className="bk-recap-name">{r.offer.name}</span>
                {v
                  ? <span className={`bk-recap-tag ${v.cls}`}><Icon name={v.ic} size={10} /><span>{v.txt}</span></span>
                  : r.gapCount
                    ? <span className="bk-recap-tag gap"><Icon name="triggers" size={10} /><span>{r.gapCount} gap{r.gapCount !== 1 ? "s" : ""}</span></span>
                    : <span className="bk-recap-tag ok"><Icon name="check" size={10} /><span>Ready</span></span>}
              </div>
            );
          })}
          {target && <div className="bk-recap-target"><Icon name="folder" size={13} /> Assigning to <b>{target}</b></div>}
        </div>
      )}
    </div>
  );
}

// ─── STEPPER (4 steps) ────────────────────────────────────────────────────────
// Reviewing the basket and editing the baseline are two different jobs: step 1 is
// read-only (what is in the basket, which package, where the gaps are), step 2 is
// where the buyer actually moves values.
// A basket that holds a personal-data offer gains one step: the consuming services
// have to be designated before anything can be contracted.
const stepsFor = (hasPII) => hasPII
  ? [
      { n: 1, label: "Review the basket", icon: "layers" },
      { n: 2, label: "Adjust the baseline", icon: "scale" },
      { n: 3, label: "Assign to project", icon: "folder" },
      { n: 4, label: "Pair the personal data", icon: "shield" },
      { n: 5, label: "Confirm & send", icon: "check" },
    ]
  : [
      { n: 1, label: "Review the basket", icon: "layers" },
      { n: 2, label: "Adjust the baseline", icon: "scale" },
      { n: 3, label: "Assign to project", icon: "folder" },
      { n: 4, label: "Confirm & send", icon: "check" },
    ];
function Stepper({ steps, step, maxReached, onGo }) {
  return (
    <ol className="bk-stepper">
      {steps.map((s, i) => {
        const state = step === s.n ? "current" : s.n < step ? "done" : "todo";
        const clickable = s.n <= maxReached && s.n !== step;
        return (
          <li key={s.n} className={`bk-step ${state}`}>
            {i > 0 && <span className={`bk-step-line ${s.n <= step ? "fill" : ""}`} aria-hidden="true" />}
            <button type="button" className="bk-step-btn" disabled={!clickable} onClick={() => clickable && onGo(s.n)} aria-current={state === "current" ? "step" : undefined}>
              <span className="bk-step-dot">{state === "done" ? <Icon name="check" size={15} /> : s.n}</span>
              <span className="bk-step-txt"><span className="bk-step-idx">Step {s.n}</span><span className="bk-step-name">{s.label}</span></span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function groupByProject(offers, assignBy) {
  const map = new Map();
  offers.forEach((o) => { const id = assignBy[o.id]; if (!id) return; if (!map.has(id)) map.set(id, []); map.get(id).push(o); });
  return Array.from(map.entries()).map(([id, list]) => ({ project: PROJECTS.find((p) => p.id === id), offers: list }));
}

// ─── STEP 2 · ASSIGN (one project per offer) ─────────────────────────────────
function ProjSel({ value, onChange }) {
  return (
    <span className="os-selectw bk-projsel">
      <select className="os-in" value={value || ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Choose a project…</option>
        {PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <Icon name="chevronDown" size={14} />
    </span>
  );
}
function AssignPanel({ offers, assignBy, setOne, setAll }) {
  const [bulk, setBulk] = useState("");
  const done = offers.filter((o) => assignBy[o.id]).length;
  const groups = groupByProject(offers, assignBy);
  return (
    <div className="bk-assign">
      <div className="bk-assign-head">
        <h2>Assign to project</h2>
        <p>Each offer goes to the project it serves — they do not have to share one.</p>
      </div>
      <div className="bk-assign-tools">
        <div className="bk-assign-bulk">
          <span className="bk-assign-bulk-l">Same project for all</span>
          <span className="os-selectw bk-projsel">
            <select className="os-in" value={bulk} onChange={(e) => { setBulk(e.target.value); if (e.target.value) setAll(e.target.value); }}>
              <option value="">Choose a project…</option>
              {PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Icon name="chevronDown" size={14} />
          </span>
        </div>
        <a className="bk-btn" href="FINAL Create Project.html"><Icon name="plus" size={14} /> Create a new project</a>
      </div>
      <div className="bk-assign-label">{done} of {offers.length} offer{offers.length !== 1 ? "s" : ""} assigned</div>
      <div className="bk-assignlist">
        {offers.map((o) => {
          const p = PROJECTS.find((x) => x.id === assignBy[o.id]);
          return (
            <div className={`bk-assignrow ${p ? "sel" : ""}`} key={o.id}>
              <Monogram offer={o} size={38} />
              <div className="bk-offer-main">
                <div className="bk-offer-metarow"><span className="bk-kind" style={{ borderColor: hexToRgba(KIND_TONE[o.kind], .5), color: KIND_TONE[o.kind] }}><span className="bk-kind-dot" style={{ background: KIND_TONE[o.kind] }} />{o.kind}</span><span className="bk-offer-by">proposed by {o.provider}</span></div>
                <div className="bk-offer-name sm">{o.name}</div>
              </div>
              <div className="bk-assignrow-pick">
                <ProjSel value={assignBy[o.id]} onChange={(v) => setOne(o.id, v)} />
                <div className="bk-assignrow-cap">{p ? p.caption : "No project yet"}</div>
              </div>
            </div>
          );
        })}
      </div>
      {groups.length > 1 && (
        <div className="bk-assign-split">
          <Icon name="folder" size={14} />
          <span>These offers will be split across <b>{groups.length} projects</b>: {groups.map((g) => `${g.project.name} (${g.offers.length})`).join(", ")}. One contract set per project.</span>
        </div>
      )}
    </div>
  );
}

// ─── STEP 3 · CONFIRM ────────────────────────────────────────────────────────────
function fmtPrice(p) {
  const parts = [];
  parts.push(`${p.sub || 0} ${p.currency} · ${p.billing}`);
  if (p.setup && p.setup !== "0") parts.push(`setup ${p.setup} ${p.currency}`);
  if (p.api && p.api !== "0") parts.push(`${p.api} ${p.currency}/call`);
  return parts.join(" · ");
}
const verdictLine = (mode, covered) => VERDICT_LINE[mode] && (mode === "countered" && covered === 0
  ? { ...VERDICT_LINE.countered, label: "Counter-offer — no baseline covered this offer" }
  : VERDICT_LINE[mode]);
const VERDICT_LINE = {
  accepted: { ic: "check", cls: "accepted", label: "Provider's baseline accepted as published" },
  countered: { ic: "sliders", cls: "countered", label: "Counter-offer — your baseline applied" },
  edited: { ic: "edit", cls: "countered", label: "Counter-offer — custom baseline" },
};
function PricingCell({ offer, pricing, pkgId }) {
  const pk = pkgById(offer, pkgId);
  const pi = priceInfo(offer, pkgId, pricing);
  const moved = pi && pi.current !== pi.published;
  const counter = moved && (
    <div className="bk-conf-sub">
      <b>Your price counter: {pi.current} {pi.unit}</b> (published {pi.published}) — sent to the provider's agent
    </div>
  );
  if (!pk) return <div className="bk-conf-v">{fmtPrice(pricing)}{counter}</div>;
  const cur = offer.pricing.currency;
  return (
    <div className="bk-conf-v">
      <b>{pk.name}</b> · {fmtCalls(pk.calls)} calls/month · {pk.price} {cur}/month
      <div className="bk-conf-sub">{pk.setup ? `Set-up fee ${pk.setup} ${cur} (once)` : "No set-up fee"} · {fmtPerCall(pk)} {cur}/call · {pk.policies.join(", ") || "no usage policy"}</div>
      {counter}
    </div>
  );
}
function ConfirmStep({ rows, pricing, proposals, packageBy, groups, projNameOf, onView }) {
  const pending = rows.filter((r) => !r.settled);
  // Only the terms the buyer actually moved off the provider's published value.
  const withSettle = rows.map((r) => {
    const prop = proposals[r.offer.id] || {};
    const terms = r.negs.filter((fl) => !eq(prop[fl.id], fl.baseline)).map((fl) => {
      const val = prop[fl.id];
      const base = fl.userBase;
      const gap = !!base && isGap(fl, val, base) && !r.conceded.includes(fl.id);
      return { fl, val, base, gap };
    });
    return { ...r, terms };
  });
  const settleTotal = withSettle.reduce((n, r) => n + r.terms.length, 0);
  const settleOffers = withSettle.filter((r) => r.terms.length > 0).length;
  const gapTotal = withSettle.reduce((n, r) => n + r.terms.filter((t) => t.gap).length, 0);
  return (
    <div className="bk-confirm-wrap">
      <div className="bk-ct-list">
        {(groups || []).map((g) => (
          <div className="bk-confirm-target" key={g.project.id}>
            <div className="bk-ct-ic"><Icon name="folder" size={18} /></div>
            <div><div className="bk-ct-label">Assigning to</div><div className="bk-ct-name">{g.project.name}</div>{g.project.caption && <div className="bk-ct-cap">{g.project.caption}</div>}</div>
            <div className="bk-ct-count">{g.offers.length} offer{g.offers.length !== 1 ? "s" : ""}</div>
          </div>
        ))}
      </div>
      {pending.length > 0 ? (
        <div className="bk-banner review"><Icon name="triggers" size={16} /><span><b>{pending.length}</b> offer{pending.length !== 1 ? "s" : ""} still need a decision on step 1 (accept or counter) before sending.</span></div>
      ) : settleTotal === 0 ? (
        <div className="bk-banner ok"><Icon name="check" size={16} /><span>Nothing to negotiate — every offer is taken exactly as published.</span></div>
      ) : (
        <div className="bk-banner review"><Icon name="triggers" size={16} /><span><b>{settleTotal}</b> baseline field{settleTotal !== 1 ? "s" : ""} across {settleOffers} offer{settleOffers !== 1 ? "s" : ""} {settleTotal !== 1 ? "go" : "goes"} to the provider{settleOffers !== 1 ? "s" : ""} for negotiation{gapTotal > 0 ? <> — <b>{gapTotal}</b> of them still {gapTotal !== 1 ? "sit" : "sits"} below your baseline</> : ""}. Every other field is confirmed as published.</span></div>
      )}
      {withSettle.map((r) => {
        const v = r.settled ? verdictLine(r.mode, r.withBase.length) : null;
        return (
          <div className="bk-review-offer" key={r.offer.id}>
            <OfferHead offer={r.offer} size={34}>
              {projNameOf && projNameOf(r.offer.id) && <span className="bk-ct-chip"><Icon name="folder" size={12} /> {projNameOf(r.offer.id)}</span>}
              <button type="button" className="bk-btn ghost sm" onClick={() => onView(r.offer.id)}><Icon name="list" size={14} /> View full baseline</button>
            </OfferHead>
            <div className="bk-conf-grid">
              <div className="bk-conf-cell">
                <div className="bk-conf-k">Pricing</div>
                <PricingCell offer={r.offer} pricing={pricing[r.offer.id]} pkgId={packageBy[r.offer.id]} />
              </div>
              <div className="bk-conf-cell">
                <div className="bk-conf-k">Usage policies</div>
                {(() => { const pk = pkgById(r.offer, packageBy[r.offer.id]); const pols = pk ? pk.policies : (r.offer.policies || []); return pols.length ? <div className="bk-pkg-pols">{pols.map((x) => <span className="bk-pkg-pol" key={x}>{x}</span>)}</div> : <div className="bk-conf-v muted">No policy published</div>; })()}
              </div>
              <div className="bk-conf-cell">
                <div className="bk-conf-k">Decision</div>
                {v
                  ? <div className={`bk2-conf-verdict ${v.cls}`}><Icon name={v.ic} size={13} /> {v.label}</div>
                  : <div className="bk-conf-v muted">No decision yet — go back to step 1.</div>}
              </div>
            </div>
            {r.terms.length > 0 ? (
              <div className="bk2-settle">
                <div className="bk2-settle-head">
                  <Icon name="triggers" size={13} /> Baseline to settle <span className="bk2-settle-n">{r.terms.length}</span>
                  <span className="bk2-settle-sub">Only these go to {r.offer.provider}. The rest of the contract stands as published.</span>
                </div>
                {r.terms.map(({ fl, val, base, gap }) => (
                  <div className={`bk2-settle-row ${gap ? "gap" : ""}`} key={fl.id}>
                    <div className="bk2-settle-top">
                      <span className="bk2-settle-name">{fl.label}</span>
                      {gap
                        ? <span className="bk-st st-gap"><Icon name="triggers" size={10} /> Below your baseline</span>
                        : base
                          ? <span className="bk-st st-ok"><Icon name="check" size={10} /> Meets your baseline</span>
                          : <span className="bk-st st-edit"><Icon name="edit" size={10} /> Your own value</span>}
                    </div>
                    <ol className="bk2-xchg">
                      <li className="done"><span className="bk2-xchg-who">{r.offer.provider} published</span><span className="bk2-xchg-val">{fmtVal(fl, fl.baseline)}</span></li>
                      <li className="you"><span className="bk2-xchg-who">You counter</span><span className="bk2-xchg-val">{fmtVal(fl, val)}</span></li>
                      <li className="wait"><span className="bk2-xchg-who">Awaiting response</span><span className="bk2-xchg-val muted">sent on confirm</span></li>
                    </ol>
                    {base && <div className="bk2-settle-base"><Icon name="sliders" size={11} /> Your baseline: <b>{base.label}</b>{gap ? " — your counter still falls short" : ""}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bk2-settle-none"><Icon name="check" size={14} /> Nothing changed — the provider's baseline is accepted as published.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function BasketApp({ help = "tour" }) {
  const seed = () => {
    const packageBy = {};
    ITEMS.forEach((o) => { packageBy[o.id] = null; });
    const pricing = Object.fromEntries(ITEMS.map((o) => [o.id, clone(o.pricing)]));
    return {
      selected: ITEMS.filter((o) => !o.saved).map((o) => o.id),
      saved: ITEMS.filter((o) => o.saved).map((o) => o.id),
      form: {}, conceded: [], usedBaseline: false, reviewed: false,
      pricing, packageBy,
    };
  };
  const load = () => {
    try { const raw = localStorage.getItem(lsKey()); if (raw) { const s = seed(); const j = JSON.parse(raw); return { ...s, ...j, form: { ...(j.form || {}) }, conceded: j.conceded || [], pricing: { ...s.pricing, ...j.pricing }, packageBy: { ...s.packageBy, ...(j.packageBy || {}) } }; } } catch (e) {}
    return seed();
  };

  const [st, setSt] = useState(load);
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [sent, setSent] = useState(false);
  const [savedOpen, setSavedOpen] = useState(true);
  const [assignBy, setAssignBy] = useState({});
  const setOneAssign = (offerId, projId) => setAssignBy((a) => ({ ...a, [offerId]: projId }));
  const [piiKeys, setPiiKeys] = useState([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawer, setDrawer] = useState(null);       // { offerId, mode }
  const guide = useBasketGuide();
  const [dockOpen, setDockOpen] = useState(() => help === "explain" && !dockSeen());
  useEffect(() => { setDockOpen(help === "explain" && !dockSeen()); }, [help]);
  const closeDock = () => { setDockOpen(false); try { localStorage.setItem(DOCK_SEEN, "1"); } catch (e) {} };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const topRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(lsKey(), JSON.stringify(st)); } catch (e) {} }, [st]);
  useEffect(() => { if (topRef.current) topRef.current.scrollTop = 0; }, [step, sent]);
  useEffect(() => { if (drawer) { const id = requestAnimationFrame(() => setDrawerOpen(true)); return () => cancelAnimationFrame(id); } }, [drawer]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && drawer) closeDrawer(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const byId = (id) => ITEMS.find((o) => o.id === id);
  const termsOf = (o) => termsFor(o, st.packageBy[o.id]);
  // Picking (or changing) a package re-derives what the provider publishes, so the
  // comparison restarts — the buyer's own values stay.
  const choosePackage = (offerId, pkgId) => setSt((s2) => ({ ...s2, packageBy: { ...s2.packageBy, [offerId]: pkgId }, conceded: [] }));
  // Price counters. A negotiable price is countered in step 1, per offer (or per
  // package when the offer sells several formulas).
  const setPrice = (offerId, pkgId, v) => setSt((s2) => {
    const cur = s2.pricing[offerId] || {};
    const next = pkgId ? { ...cur, pkg: { ...(cur.pkg || {}), [pkgId]: v } } : { ...cur, sub: v };
    return { ...s2, pricing: { ...s2.pricing, [offerId]: next } };
  });
  const resetPrice = (offerId, pkgId) => setSt((s2) => {
    const o = byId(offerId); const cur = s2.pricing[offerId] || {};
    const next = pkgId
      ? { ...cur, pkg: { ...(cur.pkg || {}), [pkgId]: Number((pkgById(o, pkgId) || {}).price) } }
      : { ...cur, sub: o.pricing.sub };
    return { ...s2, pricing: { ...s2.pricing, [offerId]: next } };
  });
  const selectedOffers = st.selected.map(byId).filter(Boolean);
  const savedOffers = st.saved.map(byId).filter(Boolean);

  // ── the single baseline form: one row per negotiable field, every provider's
  // published value attached to it ────────────────────────────────────────────
  const formGroups = useMemo(() => {
    const secs = new Map();
    selectedOffers.forEach((o) => {
      if (pkgsOf(o).length && !st.packageBy[o.id]) return;
      termsOf(o).sections.forEach((sec) => {
        sec.fields.filter((f) => f.negotiable).forEach((f) => {
          if (!secs.has(sec.id)) secs.set(sec.id, { id: sec.id, title: SEC_LABEL[sec.id] || sec.title, icon: sec.icon, map: new Map() });
          const g = secs.get(sec.id);
          if (!g.map.has(f.id)) g.map.set(f.id, { field: f, pubs: [] });
          g.map.get(f.id).pubs.push({ offer: o, value: f.baseline });
        });
      });
    });
    return Array.from(secs.values()).map((g) => ({ id: g.id, title: g.title, icon: g.icon, rows: Array.from(g.map.values()) }));
  }, [st.selected, st.packageBy]);
  const formRows = formGroups.flatMap((g) => g.rows);
  const values = {};
  formRows.forEach((r) => { values[r.field.id] = st.form[r.field.id] !== undefined ? st.form[r.field.id] : majority(r.pubs); });
  const touched = new Set(Object.keys(st.form));

  // ── mutations ──────────────────────────────────────────────────────────────
  const NOOP = () => {};
  const setFormField = (id, v) => setSt((s) => ({ ...s, form: { ...s.form, [id]: v }, conceded: s.conceded.filter((x) => x !== id) }));
  const resetFormField = (id) => setSt((s) => { const f = { ...s.form }; delete f[id]; return { ...s, form: f, conceded: s.conceded.filter((x) => x !== id) }; });
  const concede = (id) => setSt((s) => ({ ...s, conceded: s.conceded.includes(id) ? s.conceded : [...s.conceded, id] }));
  const applyMyBaseline = () => setSt((s) => {
    const f = { ...s.form };
    formRows.forEach((r) => { if (r.field.userBase) f[r.field.id] = clone(baselineTarget(r.field, r.field.userBase, values[r.field.id])); });
    return { ...s, form: f, usedBaseline: true, conceded: [] };
  });
  const takePublished = () => setSt((s) => ({ ...s, form: {}, usedBaseline: false, conceded: [] }));
  const moveToSaved = (id) => setSt((s) => ({ ...s, selected: s.selected.filter((x) => x !== id), saved: s.saved.includes(id) ? s.saved : [...s.saved, id] }));
  const moveToSelected = (id) => setSt((s) => ({ ...s, saved: s.saved.filter((x) => x !== id), selected: s.selected.includes(id) ? s.selected : [...s.selected, id] }));
  const removeFromSelected = (id) => setSt((s) => ({ ...s, selected: s.selected.filter((x) => x !== id) }));
  const removeFromSaved = (id) => setSt((s) => ({ ...s, saved: s.saved.filter((x) => x !== id) }));

  const openDrawer = (offerId, mode) => setDrawer({ offerId, mode });
  const closeDrawer = () => { setDrawerOpen(false); setTimeout(() => setDrawer(null), 260); };

  const goTo = (n) => { setStep(n); setMaxReached((m) => Math.max(m, n)); if (n >= 3) setSt((s) => (s.reviewed ? s : { ...s, reviewed: true })); };

  // ── derived ─────────────────────────────────────────────────────────────────
  // One form drives every offer: an offer's proposal is the form restricted to the
  // fields that offer left negotiable.
  const propFor = (o) => { const p = {}; termsOf(o).negFields.forEach((f) => { p[f.id] = values[f.id] !== undefined ? values[f.id] : clone(f.baseline); }); return p; };
  const decFor = (o) => {
    const changed = termsOf(o).negFields.some((f) => !eq(values[f.id], f.baseline));
    const mode = !st.reviewed ? "pending" : changed ? (st.usedBaseline ? "countered" : "edited") : "accepted";
    return { mode, conceded: st.conceded };
  };
  const proposals = Object.fromEntries(selectedOffers.map((o) => [o.id, propFor(o)]));
  const rows = selectedOffers.map((o) => {
    const d = deriveOffer(termsOf(o), proposals[o.id], decFor(o));
    const needsPkg = pkgsOf(o).length > 0 && !st.packageBy[o.id];
    return { offer: o, ...d, needsPkg, settled: d.settled && !needsPkg };
  });
  const pendingCount = rows.filter((r) => !r.settled).length;
  const needPkgCount = rows.filter((r) => r.needsPkg).length;
  const setAllAssign = (projId) => setAssignBy(Object.fromEntries(selectedOffers.map((o) => [o.id, projId])));
  const assignGroups = groupByProject(selectedOffers, assignBy);
  const assignedCount = selectedOffers.filter((o) => assignBy[o.id]).length;
  const canAssign = selectedOffers.length > 0 && assignedCount === selectedOffers.length;
  const target = assignGroups.length === 1 ? assignGroups[0].project.name : assignGroups.length > 1 ? `${assignGroups.length} projects` : "";
  const targetCaption = assignGroups.length === 1 ? assignGroups[0].project.caption : "";
  const projNameOf = (offerId) => (PROJECTS.find((p) => p.id === assignBy[offerId]) || {}).name || "";
  // ── personal data ──────────────────────────────────────────────────────────
  // One pairing task per personal-data offer in the basket, whichever side it sits
  // on (dataset needing processors, or service needing datasets). Selections are
  // stored as canonical pair keys, so both directions stay consistent.
  const P2 = window.BK4PII2;
  const piiTasks = P2.buildTasks(selectedOffers, { newProject: false, projectPool: SCENARIOS[SCENARIO].projectPool });
  const hasPII = piiTasks.length > 0;
  const STEPS = stepsFor(hasPII);
  const confirmStep = STEPS.length;
  const piiStep = hasPII ? 4 : null;
  const piiS = P2.stats(piiTasks, piiKeys, selectedOffers);
  const piiToggle = (task, candId) => setPiiKeys((prev) => {
    const k = task.need === "service" ? P2.pairKey(task.id, candId) : P2.pairKey(candId, task.id);
    return prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
  });
  const empty = selectedOffers.length === 0 && savedOffers.length === 0;
  const drawerOffer = drawer ? byId(drawer.offerId) : null;

  return (
    <AppLayout title="Basket" activeId="offers" className="bk-app">
      <div className="bk-content" id="bk-main" tabIndex={-1} ref={topRef}>
          <div className="bk-page">
            {empty ? (
              <div className="bk-empty">
                <div className="bk-empty-ic"><Icon name="cart" size={26} /></div>
                <h2>Your basket is empty</h2>
                <p>Start exploring the catalogue and find offers that suit your needs.</p>
                <a className="bk-confirm" href="Catalogue.html">Catalogue <Icon name="arrowRight" size={15} /></a>
              </div>
            ) : sent ? (
              <div className="bk-flow">
                <Stepper steps={STEPS} step={STEPS.length + 1} maxReached={0} onGo={() => {}} />
                <div className="bk-sent">
                  <div className="bk-sent-ic"><Icon name="check" size={30} /></div>
                  <h2>Sent to providers</h2>
                  <p>{selectedOffers.length} offer{selectedOffers.length !== 1 ? "s" : ""} assigned to {assignGroups.map((g, i) => <React.Fragment key={g.project.id}>{i > 0 ? (i === assignGroups.length - 1 ? " and " : ", ") : ""}<b>{g.project.name}</b> ({g.offers.length})</React.Fragment>)}. Counter-offers go to the provider{selectedOffers.length !== 1 ? "s" : ""} for negotiation; accepted offers are confirmed as published. You'll be notified of each response.</p>
                  <div className="bk-next">
                    <div className="bk-next-h">What is left to do</div>
                    <ol className="bk-next-list">
                      <li><span className="bk-next-n">1</span><div><b>Providers respond to your counter-offers</b><em>Nothing to do on your side — each response lands in your notifications and in the project's contract list.</em></div></li>
                      {hasPII && <li><span className="bk-next-n">2</span><div><b>{piiS.newCount > 0 ? `${piiS.newCount} dataset ⇄ service negotiation${piiS.newCount !== 1 ? "s" : ""} opened` : "Personal-data usage recorded"}</b><em>{piiS.pairs.length} pairing{piiS.pairs.length !== 1 ? "s" : ""} recorded: {piiS.pairs.map((p) => `${p.data.name} ⇄ ${p.svc.name}`).join(", ")}. Personal-data terms are locked for every party{piiS.amendRefs.length ? `; contract${piiS.amendRefs.length !== 1 ? "s" : ""} ${piiS.amendRefs.join(", ")} received a personal-data rider` : ""}.</em></div></li>}
                      <li><span className="bk-next-n">3</span><div><b>Activate the exchange in the project</b><em>Once every contract is signed, switch the project live to start the data exchange.</em></div></li>
                    </ol>
                  </div>
                  <div className="bk-sent-actions">
                    <a className="bk-confirm" href="My Projects.html">Go to project <Icon name="arrowRight" size={15} /></a>
                    <a className="bk-btn" href="Catalogue.html">Back to catalogue</a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bk-flow">
                <Stepper steps={STEPS} step={step} maxReached={maxReached} onGo={goTo} />
                <RecapBar rows={rows} target={(step >= 3 && canAssign) ? target : ""} />

                {/* ─── STEP 1 · REVIEW & NEGOTIATE ────────── */}
                {step === 1 && (
                  <div className="bk-stepbody">
                    <div className="bk-step-intro"><h2>Review the basket</h2><p>What you are about to contract: the offers, their price and their usage policies. Pick a package where the offer sells several — it drives the price and part of the service levels. You adjust values in the next step.</p>{help !== "none" && <button type="button" className="bk-guide-btn" onClick={() => (help === "explain" ? setDockOpen((o) => !o) : guide.start())}><Icon name="help" size={14} /> {help === "explain" ? (dockOpen ? "Hide the explainer" : "How this works") : guide.seen ? "Replay the guide" : "How this works"}</button>}</div>
                    <div className="bk-sec-title"><Icon name="layers" size={18} /> Offers in your basket <span className="bk-count">({selectedOffers.length})</span></div>
                    {selectedOffers.length === 0 ? (
                      <div className="bk-none">No offers selected. Move one up from “Saved for later”, or browse the catalogue.</div>
                    ) : selectedOffers.map((o) => (
                      <OfferCard key={o.id} offer={o} terms={termsOf(o)} proposal={proposals[o.id]} decision={decFor(o)}
                        pkgId={st.packageBy[o.id]} help={help} phase="review" onChoosePackage={(pid) => choosePackage(o.id, pid)}
                        priceState={st.pricing[o.id]} onSetPrice={(pid, v) => setPrice(o.id, pid, v)} onResetPrice={(pid) => resetPrice(o.id, pid)}
                        onConcede={NOOP} onSetField={NOOP} onProposeField={NOOP} onAcceptAll={NOOP} onCounterAll={NOOP}
                        onReopen={NOOP} onEdit={NOOP} onView={() => openDrawer(o.id, "review")}
                        onSave={() => moveToSaved(o.id)} onRemove={() => removeFromSelected(o.id)} />
                    ))}

                    {savedOffers.length > 0 && (
                      <div className="bk-saved">
                        <button type="button" className="bk-sec-title as-toggle" onClick={() => setSavedOpen((o) => !o)} aria-expanded={savedOpen}>
                          <Icon name="bookmark" size={18} /> Saved for later <span className="bk-count">({savedOffers.length})</span>
                          <Icon name={savedOpen ? "chevronUp" : "chevronDown"} size={16} className="bk-saved-chev" />
                        </button>
                        {savedOpen && savedOffers.map((o) => (
                          <div className="bk-saved-row" key={o.id}>
                            <Monogram offer={o} size={40} />
                            <div className="bk-offer-main">
                              <div className="bk-offer-metarow"><span className="bk-kind" style={{ borderColor: hexToRgba(KIND_TONE[o.kind], .5), color: KIND_TONE[o.kind] }}><span className="bk-kind-dot" style={{ background: KIND_TONE[o.kind] }} />{o.kind}</span><span className="bk-offer-by">proposed by {o.provider}</span></div>
                              <div className="bk-offer-name sm">{o.name}</div>
                              <div className="bk-saved-facts">{pkgsOf(o).length ? `${nPkg(pkgsOf(o).length)} · from ${Math.min(...pkgsOf(o).map((x) => x.price))} ${o.pricing.currency}/month` : `${o.pricing.sub || 0} ${o.pricing.currency} · ${o.pricing.billing}`}{(o.policies || []).length ? ` · ${o.policies.join(", ")}` : ""}</div>
                            </div>
                            <button type="button" className="bk-btn" onClick={() => moveToSelected(o.id)}><Icon name="plus" size={14} /> Move to basket</button>
                            <button type="button" className="bk-icon-danger" onClick={() => removeFromSaved(o.id)} aria-label={`Delete ${o.name}`}><Icon name="trash" size={15} /></button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bk-nav">
                      <a className="bk-btn ghost" href="Catalogue.html"><Icon name="chevronLeft" size={15} /> Continue shopping</a>
                      <button type="button" className="bk-confirm" disabled={selectedOffers.length === 0 || needPkgCount > 0} onClick={() => goTo(2)}>
                        {needPkgCount > 0 ? `Choose a package on ${needPkgCount} offer${needPkgCount !== 1 ? "s" : ""}` : <>Adjust the baseline <Icon name="arrowRight" size={15} /></>}
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── STEP 2 · ADJUST THE BASELINE ──────── */}
                {step === 2 && (
                  <div className="bk-stepbody">
                    <div className="bk-step-intro"><h2>Adjust the baseline</h2><p>One form for the whole basket: you set each negotiable field once and it applies to every offer. Each row shows what the providers published, so you see exactly whom you are countering — and where your value sits against your own acceptance baseline.</p>{help !== "none" && <button type="button" className="bk-guide-btn" onClick={() => (help === "explain" ? setDockOpen((o) => !o) : guide.start())}><Icon name="help" size={14} /> {help === "explain" ? (dockOpen ? "Hide the explainer" : "How this works") : guide.seen ? "Replay the guide" : "How this works"}</button>}</div>
                    <BaselineRecall />
                    <BaselineForm groups={formGroups} values={values} touched={touched} conceded={st.conceded} offers={selectedOffers}
                      onSet={setFormField} onReset={resetFormField} onConcede={concede} onApplyBaseline={applyMyBaseline} onTakePublished={takePublished} />
                    <div className="bk-nav">
                      <button type="button" className="bk-btn ghost" onClick={() => setStep(1)}><Icon name="chevronLeft" size={15} /> Back</button>
                      <button type="button" className="bk-confirm" onClick={() => goTo(3)}>Assign to project <Icon name="arrowRight" size={15} /></button>
                    </div>
                  </div>
                )}

                {/* ─── STEP 3 · ASSIGN ────────────────────── */}
                {step === 3 && (
                  <div className="bk-stepbody">
                    <div className="bk-step-intro"><h2>Assign to a project</h2><p>Pick a project for each of these {selectedOffers.length} offer{selectedOffers.length !== 1 ? "s" : ""} — they can go to different ones.</p></div>
                    <AssignPanel offers={selectedOffers} assignBy={assignBy} setOne={setOneAssign} setAll={setAllAssign} />
                    <div className="bk-nav">
                      <button type="button" className="bk-btn ghost" onClick={() => setStep(2)}><Icon name="chevronLeft" size={15} /> Back</button>
                      <button type="button" className="bk-confirm" disabled={!canAssign} onClick={() => goTo(4)}>{hasPII ? <>Pair the personal data <Icon name="arrowRight" size={15} /></> : <>Review &amp; confirm <Icon name="arrowRight" size={15} /></>}</button>
                    </div>
                  </div>
                )}

                {/* ─── EXTRA STEP · ASSIGN A CONSUMING SERVICE (personal data only) ─── */}
                {hasPII && step === piiStep && (
                  <div className="bk-stepbody">
                    <div className="bk-step-intro"><h2>Pair the personal data</h2><p>{piiTasks.length === 1 ? "One offer in this basket carries personal data. It cannot be contracted until the other side of the exchange is designated." : `${piiTasks.length} offers in this basket carry personal data. Each one needs the other side of the exchange designated before anything can be contracted.`}</p></div>
                    <P2.PiiAssignStep tasks={piiTasks} keys={piiKeys} onToggle={piiToggle} s={piiS} projectName={target} newProject={false} onRemoveOffer={removeFromSelected} />
                    <div className="bk-nav">
                      <button type="button" className="bk-btn ghost" onClick={() => setStep(3)}><Icon name="chevronLeft" size={15} /> Back</button>
                      {piiS.ready
                        ? <button type="button" className="bk-confirm" onClick={() => goTo(confirmStep)}>Review &amp; confirm <Icon name="arrowRight" size={15} /></button>
                        : <span className="pii-nav-hint">{piiS.blocked.length > 0
                            ? `${piiS.blocked.length} offer${piiS.blocked.length !== 1 ? "s" : ""} cannot be paired — remove ${piiS.blocked.length !== 1 ? "them" : "it"} from the basket to continue`
                            : `Assign the remaining ${piiS.open.length} personal-data offer${piiS.open.length !== 1 ? "s" : ""} to continue`}</span>}
                    </div>
                  </div>
                )}

                {/* ─── LAST STEP · CONFIRM ───────────────────── */}
                {step === confirmStep && (
                  <div className="bk-stepbody">
                    <div className="bk-step-intro"><h2>Confirm &amp; send</h2><p>Check every decision below, then send to the provider{selectedOffers.length !== 1 ? "s" : ""}.{hasPII ? " The personal-data section recaps the locked declarations and the services authorised to process the dataset." : ""}</p></div>
                    <ConfirmStep rows={rows} pricing={st.pricing} proposals={proposals} packageBy={st.packageBy} groups={assignGroups} projNameOf={projNameOf} onView={(id) => openDrawer(id, "review")} />
                    {hasPII && piiS.pairs.length > 0 && <P2.PiiConfirmBlock s={piiS} />}
                    <div className="bk-nav">
                      <button type="button" className="bk-btn ghost" onClick={() => setStep(confirmStep - 1)}><Icon name="chevronLeft" size={15} /> Back</button>
                      <button type="button" className="bk-confirm" disabled={pendingCount > 0 || (hasPII && !piiS.ready)} onClick={() => setSent(true)}>
                        {hasPII && piiS.newCount > 0
                          ? <>Accept · create {piiS.newCount} dataset ⇄ service negotiation{piiS.newCount !== 1 ? "s" : ""}{piiS.amendRefs.length ? ` · amend ${piiS.amendRefs.join(", ")}` : ""} <Icon name="check" size={16} /></>
                          : <>Accept <Icon name="check" size={16} /></>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
      </div>

      {drawerOffer && (
        <TermsDrawer offer={drawerOffer} terms={termsOf(drawerOffer)} proposal={proposals[drawerOffer.id] || propFor(drawerOffer)} decision={decFor(drawerOffer)}
          open={drawerOpen} initialMode="review" readOnly onClose={closeDrawer}
          onSetField={NOOP} onResetField={NOOP} onConcede={NOOP}
          onAcceptAll={NOOP} onCounterAll={NOOP} />
      )}

      <BottomNav onOpenMore={() => setMoreOpen(true)} />
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      {help === "tour" && step <= 2 && !drawer && <GuideTour open={guide.open} onClose={guide.close} onFinish={guide.finish} />}
      {help === "explain" && step <= 2 && !drawer && <ExplainDock open={dockOpen} step={step} onClose={closeDock} />}
    </AppLayout>
  );
}

function Root() {
  const [tweaks, setTweak] = useTweaks({ scenario: "many_offers", help: "explain" });
  applyScenario(tweaks.scenario);
  return (
    <>
      <TweaksPanel title="Vues de démo">
        <TweakSection label="Scénario">
          <TweakSelect label="Vue" value={tweaks.scenario} options={SCENARIO_IDS.map((id) => ({ value: id, label: SCENARIOS[id].label }))} onChange={(v) => setTweak("scenario", v)} />
        </TweakSection>
        <TweakSection label="Aide à la lecture">
          <TweakRadio label="Format" value={tweaks.help} options={[{ value: "explain", label: "Panneau" }, { value: "tour", label: "Tour" }, { value: "none", label: "Aucun" }]} onChange={(v) => setTweak("help", v)} />
        </TweakSection>
      </TweaksPanel>
      <BasketApp key={tweaks.scenario + tweaks.help} help={tweaks.help} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
})();
