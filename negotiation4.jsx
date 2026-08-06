// VisionsTrust — Negotiation review, VARIANT 4 (baseline ledger + packages).
// Three things changed against v3:
//  1. Wording — the provider publishes a BASELINE, not "terms". Every label follows.
//  2. Negotiability comes from ONE place: Offer Settings. A field is open only if the
//     schema marks it negotiable, or the offer/package published an acceptance range.
//     Everything else is fixed — the taker cannot even propose against it.
//  3. Packaged offers — the package the taker chose sets the price AND part of the
//     baseline, so countering with another package re-prices and moves those fields.
(function () {
const { useState, useEffect, useMemo } = React;
const { Icon } = window.UI;
const { AppLayout } = window.VTLayout;
const { SECTIONS } = window.OfferSettingsData;
const { ITEMS } = window.BasketData;
const { initials, hexToRgba, accentFor } = window.CatData;

const LS_KEY = "vt.negotiation4.v1";
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
function inAccept(field, value, accept) {
  if (accept == null) return false;
  switch (field.type) {
    case "numberUnit": return value && typeof accept === "object" && !Array.isArray(accept) && value.n >= accept.min && value.n <= accept.max;
    case "multiselect": return Array.isArray(value) && value.length > 0 && value.every((v) => accept.includes(v));
    case "select": case "yesno": return Array.isArray(accept) && accept.includes(value);
    default: return false;
  }
}
function acceptText(field, accept) {
  if (accept == null) return "No acceptance range published — at your discretion.";
  if (field.type === "numberUnit") return `Your published range: ${accept.min}–${accept.max} ${field.units[0]}.`;
  if (field.type === "price") return `Your published range: ${accept.min}–${accept.max} ${field.cur}.`;
  if (Array.isArray(accept)) return `You published as acceptable: ${accept.join(", ")}.`;
  return "At your discretion.";
}

const SEC_META = {
  sla: { label: "Service levels (SLA)", icon: "clock" },
  duration: { label: "Duration & renewal", icon: "hourglass" },
  termination: { label: "Termination", icon: "danger" },
  pricing: { label: "Pricing", icon: "coin" },
};
const BASE_SECTION_IDS = ["sla", "duration", "termination"];
function fieldsOf(section) { return section.fields || (section.groups || []).flatMap((g) => g.fields); }

// ─── NEGOTIABILITY · single source of truth = Offer Settings ──────────────────
// A baseline field is open to negotiation only when the schema published in Offer
// Settings marks it negotiable, or when the offer / package published an acceptance
// range on it. Dates are never negotiated. Nothing else can be proposed against.
const SCHEMA_NEG = new Set(
  BASE_SECTION_IDS.flatMap((sid) => fieldsOf(SECTIONS.find((s) => s.id === sid)))
    .filter((f) => f.neg === true).map((f) => f.id)
);
function isNegotiable(field, ov) {
  if (field.type === "date" || field.type === "textarea") return false;
  if (ov && ov.neg !== undefined) return !!ov.neg;
  if (ov && ov.accept !== undefined) return true;
  return SCHEMA_NEG.has(field.id);
}

// ─── SCENARIO ────────────────────────────────────────────────────────────────
const OFFER = ITEMS.find((o) => o.id === "mobility_flows_api") || ITEMS[0];
const REQUESTED_ID = OFFER.id;
const CHOSEN_PKG = { mobility_flows_api: "growth" };
const PROJECT = { name: "SERVICE_PROVIDER_DSUC_CHAIN", org: "TECHNÉ", orchestrator: "Techné", caption: "VR learning analytics chain" };

// What the taker proposes — only ever on fields left negotiable; anything landing on a
// fixed field is dropped when the model is built, so the ledger can never lie.
const PROPOSALS = {
  mobility_flows_api: {
    contract_duration: { n: 48, u: "months" },
    notice_nonrenewal: { n: 90, u: "days" },
    renewal_mode: "On mutual agreement",
    response_time: { n: 250, u: "ms", b: "p95" },
  },
  data_offer_1: {
    update_frequency: "Weekly",
    contract_duration: { n: 6, u: "months" },
    notice_nonrenewal: { n: 120, u: "days" },
  },
  data_infra_2: { contract_duration: { n: 36, u: "months" }, notice_nonrenewal: { n: 60, u: "days" } },
};
const PRICING_PROPOSALS = { data_offer_1: { sub: "0", billing: "One shot", setup: "0", api: "0", currency: "EUR" } };
// A package price can only be pushed on when the package was published negotiable.
const PKG_PRICE_PROPOSALS = { mobility_flows_api: { growth: { sub: "280" } } };
const EXTRA = [
  { id: "skills_analytics", name: "Skills analytics", kind: "Service", desc: "Aggregated skills-matching analytics across the training cohort.", resources: 2,
    pricing: { sub: "50", billing: "Monthly", setup: "0", api: "0", currency: "EUR" },
    overrides: { availability: { value: "99%" }, support_hours: { value: "24/7" }, update_frequency: { value: "Weekly" }, contract_duration: { value: { n: 6, u: "months" } } } },
];
const normOffer = (o) => ({ id: o.id, name: o.name, kind: o.kind || "Data", desc: o.desc || "", provider: o.provider || OFFER.provider, resources: o.resources || 1, pricing: o.pricing, overrides: o.overrides || {}, packages: o.packages || null, accent: o.accent || accentFor((o.provider || "") + o.name) });
const CANDIDATES = [...ITEMS.filter((o) => o.id !== REQUESTED_ID), ...EXTRA].map(normOffer);
const OFFER_MAP = Object.fromEntries([normOffer(OFFER), ...CANDIDATES].map((o) => [o.id, o]));

const PRICE_FIELDS = [
  { k: "sub", label: "Subscription pricing", meaning: "Recurring price the consumer pays to use this offer.", money: true },
  { k: "billing", label: "Billing period", meaning: "How often the subscription price is charged." },
  { k: "setup", label: "Setup fee", meaning: "One-off fee at the start of the contract.", money: true },
  { k: "api", label: "Cost per API call", meaning: "Usage-based price per API call, if any.", money: true },
  { k: "currency", label: "Currency", meaning: "Currency the pricing is expressed in." },
];
// A packaged offer prices itself through the package: the same pricing fields as a
// single price, published per package — and negotiable when that package says so.
const PKG_PRICE_FIELDS = [
  { k: "sub", label: "Subscription pricing", meaning: "Recurring price published on this package.", money: true, negotiable: true },
  { k: "billing", label: "Billing period", meaning: "How often the package price is charged." },
  { k: "setup", label: "Setup fee", meaning: "One-off fee attached to this package.", money: true },
  { k: "api", label: "Cost per API call", meaning: "Usage-based price per API call on this package, if any.", money: true },
  { k: "currency", label: "Currency", meaning: "Currency this package is priced in." },
];
const pkgPricing = (pk) => ({ sub: pk.sub != null ? String(pk.sub) : String(pk.price), billing: pk.billing || "Monthly", setup: String(pk.setup || 0), api: String(pk.api || 0), currency: pk.currency || "EUR" });
const inRange = (v, accept) => { if (!accept || accept.min == null || accept.max == null) return false; const n = parseFloat(String(v).replace(/\s/g, "").replace(",", ".")); return !isNaN(n) && n >= accept.min && n <= accept.max; };

const pkgsOf = (offer) => offer.packages || [];
const chosenPkgOf = (offer) => { const p = pkgsOf(offer); return p.find((x) => x.id === CHOSEN_PKG[offer.id]) || p[0] || null; };

function buildOfferModel(offer, altPkgId) {
  const pkgs = pkgsOf(offer);
  const chosen = chosenPkgOf(offer);
  const alt = altPkgId ? pkgs.find((p) => p.id === altPkgId) : null;
  const ov = { ...(offer.overrides || {}), ...((chosen && chosen.overrides) || {}) };
  const proposed = PROPOSALS[offer.id] || {};
  const rows = [];
  BASE_SECTION_IDS.forEach((sid) => {
    const s = SECTIONS.find((x) => x.id === sid);
    fieldsOf(s).forEach((f) => {
      const o = ov[f.id] || {};
      const baseline = o.value !== undefined ? clone(o.value) : clone(f.def);
      if (isEmpty(baseline)) return;
      const negotiable = isNegotiable(f, ov[f.id]);
      const accept = o.accept !== undefined ? o.accept : (f.accept || null);
      // A proposal on a fixed field is not admissible — it never reaches the ledger.
      const hasProp = negotiable && Object.prototype.hasOwnProperty.call(proposed, f.id);
      const prop = hasProp ? clone(proposed[f.id]) : clone(baseline);
      const changed = hasProp && !eq(prop, baseline);
      const within = changed ? inAccept(f, prop, accept) : true;
      // Only the alternative package's OWN overrides move a field. A package that is
      // silent on a field changes nothing there — the taker's proposal stands.
      let pkgCounter;
      if (alt) {
        const ao = (alt.overrides || {})[f.id];
        if (ao && ao.value !== undefined && !isEmpty(ao.value) && !eq(ao.value, changed ? prop : baseline)) pkgCounter = clone(ao.value);
      }
      rows.push({ kind: "term", key: f.id, field: f, sec: sid, baseline, proposed: prop, neg: negotiable, accept, changed, within, pkgCounter });
    });
  });
  if (pkgs.length && chosen) {
    const basePk = pkgPricing(chosen);
    const altPk = alt ? pkgPricing(alt) : null;
    const props = (PKG_PRICE_PROPOSALS[offer.id] || {})[chosen.id] || {};
    PKG_PRICE_FIELDS.forEach((f) => {
      const base = basePk[f.k];
      const negotiable = !!f.negotiable && !!chosen.neg;
      const accept = negotiable ? chosen.accept || null : null;
      const hasProp = negotiable && Object.prototype.hasOwnProperty.call(props, f.k);
      const prop = hasProp ? String(props[f.k]) : base;
      const changed = hasProp && prop !== base;
      const av = altPk ? altPk[f.k] : null;
      rows.push({ kind: "price", key: "pk_" + f.k, pf: f, field: { label: f.label, meaning: f.meaning, type: "price", cur: basePk.currency }, sec: "pricing",
        baseline: base, proposed: prop, neg: negotiable, accept, changed, within: changed ? inRange(prop, accept) : true,
        currency: basePk.currency, byPkg: true, pkgCounter: av !== null && av !== base ? av : undefined });
    });
  } else {
    const basePricing = offer.pricing || { sub: "0", billing: "One shot", setup: "0", api: "0", currency: "EUR" };
    const propPricing = PRICING_PROPOSALS[offer.id] || basePricing;
    PRICE_FIELDS.forEach((f) => {
      const baseline = String(basePricing[f.k]); const prop = String(propPricing[f.k]);
      rows.push({ kind: "price", key: "p_" + f.k, pf: f, field: { label: f.label, meaning: f.meaning }, sec: "pricing",
        baseline, proposed: prop, neg: f.k === "sub", accept: null, changed: baseline !== prop, within: true, currency: propPricing.currency });
    });
  }
  const penSec = SECTIONS.find((s) => s.id === "penalties");
  const penalty = {}; penSec.fields.forEach((f) => { penalty[f.id] = clone(f.def); });
  const attn = rows.filter((r) => r.changed && !r.within);
  const okc = rows.filter((r) => r.changed && r.within);
  const kept = rows.filter((r) => !r.changed);
  const negCount = rows.filter((r) => r.neg).length;
  return { offer, rows, attn, okc, kept, changedCount: attn.length + okc.length, penalty, pkgs, chosen, alt, negCount, fixedCount: rows.length - negCount };
}

// ─── inputs ────────────────────────────────────────────────────────────────
const Sel = ({ value, onChange, options }) => (
  <span className="os-selectw"><select className="os-in" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select><Icon name="chevronDown" size={13} className="os-chev" /></span>
);
const Num = ({ value, onChange }) => <input type="number" className="os-in num" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
function EditControl({ field, value, onChange }) {
  switch (field.type) {
    case "text": return <input className="os-in sm" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "yesno": return <div className="seg2 mini">{["Yes", "No"].map((o) => <button key={o} type="button" className={value === o ? "active teal" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>;
    case "select": return <Sel value={value} onChange={onChange} options={field.options} />;
    case "numberUnit": return (<><Num value={value?.n} onChange={(n) => onChange({ ...value, n })} /><Sel value={value?.u} onChange={(u) => onChange({ ...value, u })} options={field.units} />{field.basis && <Sel value={value?.b} onChange={(b) => onChange({ ...value, b })} options={field.basis} />}</>);
    case "multiselect": return (<div className="os-chips" style={{ justifyContent: "flex-start" }}>{field.options.map((o) => { const on = (value || []).includes(o); return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])}>{o}</button>; })}</div>);
    default: return <span>{fmtVal(field, value)}</span>;
  }
}
function MonoFor({ offer, size = 44 }) {
  return <div className="bk-mono" style={{ width: size, height: size, background: `linear-gradient(135deg, ${hexToRgba(offer.accent, 0.9)}, ${hexToRgba(offer.accent, 0.55)})` }} aria-hidden="true">{initials(offer.name)}</div>;
}

// ─── PACKAGES · what the taker chose, and the counter-lever it gives you ──────
function PackageStrip({ model, orchestrator, altId, onAlt }) {
  const { pkgs, chosen } = model;
  if (!pkgs.length) return null;
  return (
    <div className="n4-pkgs-wrap">
      <div className="n4-pkgs-hd">
        <Icon name="layers" size={15} />
        <div>
          <div className="n4-pkgs-t">Package selected by {orchestrator} — <b>{chosen.name}</b></div>
          <p className="n4-pkgs-s">Each package publishes its own pricing and part of the baseline. A package price can only be pushed on when you published it negotiable, inside the range you set. Counter with another package to re-price the deal — the fields it overrides move with it.</p>
        </div>
      </div>
      <div className="n4-pkgs">
        {pkgs.map((pk) => {
          const isChosen = pk.id === chosen.id;
          const isAlt = altId === pk.id;
          const pr = pkgPricing(pk);
          return (
            <div className={`n4-pkg${isChosen ? " chosen" : ""}${isAlt ? " alt" : ""}`} key={pk.id}>
              <div className="n4-pkg-top">
                <span className="n4-pkg-name">{pk.name}</span>
                {isChosen && <span className="n4-pkg-flag req"><Icon name="check" size={9} /> Requested</span>}
                {isAlt && <span className="n4-pkg-flag cnt"><Icon name="pen" size={9} /> Your counter</span>}
              </div>
              <div className="n4-pkg-price">{Number(pr.sub) === 0 ? "Free" : `${fmtN(pr.sub)} ${pr.currency}`}<span>{Number(pr.sub) === 0 ? "" : ` / ${pr.billing.toLowerCase()}`}</span></div>
              <div className="n4-pkg-calls">{Number(pr.setup) ? `${fmtN(pr.setup)} ${pr.currency} set-up` : "No set-up fee"}{Number(pr.api) ? ` · ${pr.api} ${pr.currency} per call` : ""}</div>
              <div className="n4-pkg-setup">{pk.neg ? <span className="n4-pkg-negline"><span className="n4-pkg-neg"><Icon name="triggers" size={9} /> Price negotiable</span>{pk.accept && <span className="n4-pkg-negrange">{fmtN(pk.accept.min)}–{fmtN(pk.accept.max)} {pr.currency}</span>}</span> : <span className="n4-pkg-fix"><Icon name="lock" size={9} /> Price fixed</span>}</div>
              <div className="n4-pkg-pols">{pk.policies.map((p) => <span className="n4-pkg-pol" key={p}>{p}</span>)}</div>
              {isChosen ? <div className="n4-pkg-note">As published for this package</div>
                : isAlt ? <button type="button" className="n4-pkg-btn on" onClick={() => onAlt(null)}><Icon name="x" size={12} /> Undo counter</button>
                : <button type="button" className="n4-pkg-btn" onClick={() => onAlt(pk.id)}><Icon name="pen" size={12} /> Counter with this package</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ONE LEDGER ROW ──────────────────────────────────────────────────────────
function LedgerRow({ row, counter, counterVal, onCounter, isEditing, countered, onEdit, onCancel, altName }) {
  const { field, baseline, proposed, changed, within, neg } = row;
  const unit = row.kind === "price" && row.pf.money ? " " + row.currency : "";
  const fmtP = (v) => row.kind === "price" ? String(v) + unit : fmtVal(field, v);
  const rowCls = (countered ? "cnt " : "") + (changed ? (within ? "ok" : "attn") : "");
  const badge = changed ? (within ? { c: "ok", t: "Within range" } : { c: "attn", t: "Needs decision" }) : (neg ? { c: "kept", t: "Unchanged" } : { c: "fixed", t: "Fixed" });
  const fb = changed ? proposed : baseline;
  const showEditor = (counter && neg) || isEditing;
  const fromPkg = !isEditing && counterVal !== undefined && row.pkgCounter !== undefined && eq(counterVal, row.pkgCounter);
  return (
    <div className={`n3-row ${rowCls}`}>
      <div className="n3-td term">
        <div className="n3-term"><span className="n3-term-name">{field.label}</span>{field.meaning && <span className="n3-info" title={field.meaning}><Icon name="info" size={13} /></span>}</div>
        <div className="n3-term-mean">
          {SEC_META[row.sec].label}
          {neg ? <span className="n4-negtag"><Icon name="triggers" size={9} /> Negotiable</span>
            : <span className="n4-fixtag"><Icon name="lock" size={9} /> {row.byPkg ? "Set by package" : "Fixed"}</span>}
        </div>
      </div>
      <div className="n3-td">
        <span className="n3-cell-lab">You published</span>
        <span className="n3-val pub">{fmtP(baseline)}</span>
      </div>
      <div className="n3-td">
        <span className="n3-cell-lab">They propose</span>
        {changed
          ? <span className="n3-val prop chg"><Icon name="arrowRight" size={13} />{fmtP(proposed)}</span>
          : <span className="n3-val prop same"><em>{neg ? "Same as published" : "Not negotiable — taken as published"}</em></span>}
      </div>
      <div className="n3-td resp">
        <span className="n3-cell-lab">{showEditor ? "Your counter" : "Status"}</span>
        {showEditor ? (
          <div className="n3-counter">
            <span className="n3-counter-lab"><Icon name="pen" size={12} /> Counter with</span>
            <div className="n3-counter-ctl">
              {row.kind === "price"
                ? <><input className="os-in" style={{ width: 100 }} value={counterVal} onChange={(e) => onCounter(e.target.value)} /><span className="n3-accept-hint">{row.currency}</span></>
                : <EditControl field={field} value={counterVal} onChange={onCounter} />}
            </div>
            <div className="n3-counter-foot">
              {!eq(counterVal, fb) && <button type="button" className="n3-reset" onClick={() => onCounter(clone(fb))}>{changed ? "Match their proposal" : "Reset to published"}</button>}
              {isEditing && !counter && (
                <div className="n3-inline-btns">
                  <button type="button" className="n3-save" onClick={() => onEdit(false)}><Icon name="check" size={12} /> Save</button>
                  <button type="button" className="n3-cancelb" onClick={onCancel}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        ) : countered ? (
          <div className="n3-countered">
            <span className="n3-badge counter"><Icon name="pen" size={12} /> {fromPkg ? `From ${altName} package` : "Your counter"}</span>
            <span className="n3-val chg cnt">{fmtP(counterVal)}</span>
            {!fromPkg && (
              <div className="n3-inline-btns">
                <button type="button" className="n3-editbtn" onClick={() => onEdit(true)}><Icon name="edit" size={12} /> Edit</button>
                <button type="button" className="n3-reset" onClick={() => onCounter(clone(fb))}>Undo</button>
              </div>
            )}
          </div>
        ) : (
          <div className="n3-statuswrap">
            <span className={`n3-badge ${badge.c}`}>{changed && <Icon name={within ? "check" : "triggers"} size={12} />}{badge.t}</span>
            {changed && <span className="n3-accept-hint">{acceptText(field, row.accept)}</span>}
            {!changed && !neg && <span className="n3-accept-hint">{row.byPkg ? "Follows the package — not negotiated field by field." : "You did not open this field in Offer Settings."}</span>}
            {neg && <button type="button" className="n3-editbtn edit-value" onClick={() => onEdit(true)}><Icon name="edit" size={12} /> Edit value</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PLAIN-LANGUAGE SUMMARY ──────────────────────────────────────────────────
function summarize(m, orchestrator) {
  const parts = [];
  parts.push(<span key="a"><b>{orchestrator}</b> takes <b>{m.kept.length}</b> of your published baseline fields without change{m.chosen ? <> on the <b>{m.chosen.name}</b> package</> : null}.</span>);
  if (m.attn.length) parts.push(<span key="b"> They propose <span className="hl-attn">{m.attn.length} change{m.attn.length !== 1 ? "s" : ""} outside</span> the acceptance ranges you published — these need your decision.</span>);
  if (m.okc.length) parts.push(<span key="c"> {m.attn.length ? "Another" : "They propose"} <span className="hl-ok">{m.okc.length}{m.attn.length ? "" : " change" + (m.okc.length !== 1 ? "s" : "")}</span> {m.attn.length ? "change" + (m.okc.length !== 1 ? "s" : "") + " stay" : "that stay"} inside your ranges.</span>);
  if (!m.attn.length && !m.okc.length) parts.push(<span key="d"> Nothing falls outside your baseline — you can accept safely.</span>);
  parts.push(<span key="e"> The other <b>{m.fixedCount}</b> field{m.fixedCount !== 1 ? "s are" : " is"} fixed and cannot be proposed against.</span>);
  return parts;
}

// ─── NEGOTIATION HISTORY ─────────────────────────────────────────────────────
const HISTORY = [
  { round: 1, actor: "you", ts: "14 days ago", date: "6 Jul 2026", title: "You published the offer",
    note: "You listed mobility_flows_api with three packages and a published baseline. In Offer Settings you left duration, renewal mode and notice open to negotiation, plus response time on the Growth and Scale packages. Everything else is fixed.",
    changes: [
      { label: "Packages", to: "Starter · Growth · Scale" },
      { label: "Contract duration", to: "12 months · range 6–36" },
      { label: "Renewal mode", to: "Automatic renewal" },
      { label: "Notice — non-renewal", to: "60 days · range 30–90" },
      { label: "Response time (Growth)", to: "400 ms p95 · range 250–500" },
    ], outcome: "Offer live · 4 negotiable baseline fields exposed, 21 fixed." },
  { round: 1, actor: "them", ts: "9 days ago", date: "11 Jul 2026", title: "Techné's first counter",
    note: "Techné picked the Growth package for their VR learning-analytics chain, then pushed on the commercial frame — asking for a four-year commitment and a longer notice than you had published.",
    changes: [
      { label: "Package", to: "Growth", flag: "ok" },
      { label: "Contract duration", from: "12 months", to: "48 months", flag: "attn" },
      { label: "Notice — non-renewal", from: "60 days", to: "120 days", flag: "attn" },
      { label: "Renewal mode", from: "Automatic renewal", to: "On mutual agreement", flag: "ok" },
    ], outcome: "2 of 3 asks fell outside the ranges you published." },
  { round: 2, actor: "you", ts: "7 days ago", date: "13 Jul 2026", title: "Your counter-offer",
    note: "You met them partway: accepted renewal on mutual agreement, held the duration at 24 months and brought the notice back inside your range at 90 days.",
    changes: [
      { label: "Contract duration", from: "48 months", to: "24 months", flag: "ok" },
      { label: "Notice — non-renewal", from: "120 days", to: "90 days", flag: "ok" },
      { label: "Renewal mode", to: "On mutual agreement", flag: "ok" },
    ], outcome: "3 revised baseline fields sent back for Techné's review." },
];
const HIST_CURRENT = { round: 2, actor: "them", ts: "3 days ago", date: "17 Jul 2026", title: "Techné's current proposal",
  note: "Techné kept the Growth package and accepted your notice and renewal values, but re-opened the contract duration at 48 months and now asks for the fastest response time the package allows. This is the proposal waiting for your response.",
  outcome: "Awaiting your decision · 1 field outside your ranges." };

function actorMeta(a) { return a === "you" ? { name: "You", cls: "you", ic: "user" } : { name: "Techné", cls: "them", ic: "team" }; }

function HistCard({ ev, current }) {
  const a = actorMeta(ev.actor);
  return (
    <li className={`n3-tl ${a.cls} ${current ? "current" : ""}`}>
      <span className="n3-tl-dot"><Icon name={current ? "scale" : a.ic} size={13} /></span>
      <div className={`n3-tl-card ${current ? "cur" : ""}`}>
        <div className="n3-tl-top">
          <span className="n3-tl-rnd">Round {ev.round}</span>
          <span className="n3-tl-who">{ev.title}</span>
          <span className="n3-tl-ts">{ev.date} · {ev.ts}</span>
        </div>
        <div className="n3-tl-by">{a.name === "You" ? "By you" : "By " + a.name}</div>
        <p className="n3-tl-note">{ev.note}</p>
        {ev.changes && (
          <div className="n3-tl-changes">{ev.changes.map((c, j) => (
            <div className={`n3-tl-chg ${c.flag || ""}`} key={j}>
              <span className="n3-tl-lab">{c.label}</span>
              <span className="n3-tl-vals">{c.from ? <><s>{c.from}</s><Icon name="arrowRight" size={11} /><b>{c.to}</b></> : <b>{c.to}</b>}</span>
            </div>))}
          </div>
        )}
        {ev.outcome && <div className="n3-tl-outcome"><Icon name={current ? "info" : "check"} size={12} /> {ev.outcome}</div>}
      </div>
    </li>
  );
}

function HistoryPanel({ orchestrator }) {
  const rounds = Math.max(...HISTORY.map((e) => e.round), HIST_CURRENT.round);
  const stats = [
    { k: "Rounds", v: rounds, ic: "refresh" },
    { k: "Exchanges", v: HISTORY.length + 1, ic: "chat" },
    { k: "Opened", v: "6 Jul 2026", ic: "clock" },
    { k: "Status", v: "Awaiting you", ic: "hourglass", warn: true },
  ];
  return (
    <section className="n3-histpanel">
      <div className="n3-histpanel-head">
        <div className="n3-histpanel-intro">
          <h2>How this negotiation got here</h2>
          <p>Every round exchanged between you and <b>{orchestrator}</b> since the offer was published — who moved, when, and exactly which baseline fields changed. Nothing is ever overwritten; each step stays on the record.</p>
        </div>
        <div className="n3-histstats">
          {stats.map((s) => (
            <div className={`n3-histstat ${s.warn ? "warn" : ""}`} key={s.k}>
              <span className="n3-histstat-ic"><Icon name={s.ic} size={15} /></span>
              <div><div className="n3-histstat-v">{s.v}</div><div className="n3-histstat-k">{s.k}</div></div>
            </div>
          ))}
        </div>
      </div>
      <ol className="n3-timeline">
        {HISTORY.map((ev, i) => <HistCard ev={ev} key={i} />)}
        <HistCard ev={HIST_CURRENT} current />
      </ol>
    </section>
  );
}

// ─── ONE OFFER PANEL ─────────────────────────────────────────────────────────
function OfferPanel({ model, added, counter, filter, counters, setCounter, orchestrator, editing, onToggleEdit, altId, onAlt }) {
  const { offer, rows, changedCount, penalty, pkgs, chosen, alt, negCount, fixedCount } = model;
  const fbOf = (r) => (r.changed ? r.proposed : r.baseline);
  const cv = (r) => (counters[r.key] !== undefined ? counters[r.key] : (r.pkgCounter !== undefined ? r.pkgCounter : fbOf(r)));
  const isCnt = (r) => !eq(cv(r), fbOf(r));
  const isEd = (r) => editing.includes(r.key);
  const visible = rows.filter((r) => filter === "all" || r.changed || (counter && r.neg) || isCnt(r) || isEd(r));
  const bySec = {};
  ["sla", "duration", "termination", "pricing"].forEach((sid) => { const rs = visible.filter((r) => r.sec === sid); if (rs.length) bySec[sid] = rs; });

  return (
    <section className={`n3-op ${added ? "added" : ""}`}>
      <header className="n3-op-head">
        <MonoFor offer={offer} size={44} />
        <div className="n3-op-id">
          <div className="n3-op-top"><span className="n3-op-name">{offer.name}</span>{added ? <span className="n3-tag add">Added by you</span> : <span className="n3-tag req">Requested</span>}{chosen && <span className="n3-tag pkg"><Icon name="layers" size={10} />{`${chosen.name} package`}</span>}</div>
          <div className="n3-op-meta">{offer.kind} · {offer.resources} resource{offer.resources !== 1 ? "s" : ""} · {rows.length} baseline fields · {negCount} negotiable · {fixedCount} fixed</div>
        </div>
      </header>

      <div className="n3-summary">
        <div className="n3-summary-ic"><Icon name={changedCount ? "info" : "check"} size={18} /></div>
        <p className="n3-summary-txt">{summarize(model, orchestrator)}</p>
      </div>

      {pkgs.length > 0 && <PackageStrip model={model} orchestrator={orchestrator} altId={altId} onAlt={onAlt} />}

      <div className="n3-toolbar">
        <div className="n3-filter" role="tablist">
          <button type="button" role="tab" className={filter === "changes" ? "active" : ""} onClick={() => setCounter.setFilter("changes")}>
            Changes only <span className={`n3-fc ${changedCount ? "" : "zero"}`}>{changedCount}</span>
          </button>
          <button type="button" role="tab" className={filter === "all" ? "active" : ""} onClick={() => setCounter.setFilter("all")}>
            All baseline fields <span className="n3-fc total">{rows.length}</span>
          </button>
        </div>
        <span className="n3-toolbar-note">{filter === "changes" ? "Showing only what differs from the baseline you published." : "Full baseline — every field shown for the record."}</span>
      </div>

      <div className="n3-table">
        <div className="n3-thead"><div className="n3-th">Baseline field</div><div className="n3-th">You published</div><div className="n3-th">They propose</div><div className="n3-th resp">{counter ? "Your counter" : "Status"}</div></div>
        {Object.entries(bySec).map(([sid, rs]) => (
          <React.Fragment key={sid}>
            <div className="n3-secrow"><Icon name={SEC_META[sid].icon} size={14} /><span>{SEC_META[sid].label}</span><small>{`${rs.length} ${rs.length !== 1 ? "fields" : "field"}`}</small></div>
            {rs.map((r) => <LedgerRow key={r.key} row={r} counter={counter} counterVal={cv(r)} onCounter={(v) => setCounter(r.key, v)} isEditing={isEd(r)} countered={isCnt(r)} onEdit={(open) => onToggleEdit(r.key, open)} onCancel={() => { setCounter(r.key, clone(fbOf(r))); onToggleEdit(r.key, false); }} altName={alt ? alt.name : ""} />)}
          </React.Fragment>
        ))}
        {Object.keys(bySec).length === 0 && <div className="n3-row"><div className="n3-td term" style={{ gridColumn: "1 / -1", color: "var(--text-muted)", fontSize: 13 }}>Nothing changed on this offer — switch to <b>All baseline fields</b> to review the full agreement.</div></div>}
      </div>

      <div className="n3-pen">
        <div className="n3-pen-ic"><Icon name="shield" size={18} /></div>
        <div>
          <div className="n3-pen-hd">Commitments &amp; penalties <span className="bk-st st-fixed"><Icon name="lock" size={11} /> Fixed — not negotiated</span></div>
          <p>Backed by a <b>{penalty.consequence_type}</b> penalty if <b>{penalty.commitment_concerned}</b> falls {penalty.trigger_threshold.op} {penalty.trigger_threshold.v}, assessed <b>{penalty.measurement_period.toLowerCase()}</b>, capped at <b>{penalty.penalty_cap.toLowerCase()}</b>. These commitments are fixed for this offer and carry into the contract as published.</p>
        </div>
      </div>
    </section>
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
function Negotiation4App() {
  const load = () => { try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch (e) {} return { decision: null, included: [REQUESTED_ID], filter: "changes" }; };
  const [ui, setUi] = useState(load);
  const decision = ui.decision;
  const filter = ui.filter || "changes";
  const includedIds = [REQUESTED_ID];
  const [counter, setCounter] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [counters, setCounters] = useState({});
  const [editing, setEditing] = useState({});
  const [altPkg, setAltPkg] = useState({});
  const tab = ui.tab === "history" ? "history" : "current";
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(ui)); } catch (e) {} }, [ui]);
  const decide = (d) => setUi((s) => ({ ...s, decision: d }));
  const setFilter = (f) => setUi((s) => ({ ...s, filter: f }));
  const setTab = (t) => setUi((s) => ({ ...s, tab: t }));
  const toggleEdit = (oid, key, open) => setEditing((s) => { const k = oid + "::" + key; const n = { ...s }; if (open) n[k] = true; else delete n[k]; return n; });
  const clearEdits = () => { setCounters({}); setEditing({}); setAltPkg({}); };
  // Swapping the proposed package restarts that offer's manual edits — the baseline moved.
  const setAlt = (oid, pkgId) => { setAltPkg((s) => ({ ...s, [oid]: pkgId })); setCounters((s) => ({ ...s, [oid]: {} })); };

  const models = useMemo(() => includedIds.map((id) => OFFER_MAP[id]).filter(Boolean).map((o) => buildOfferModel(o, altPkg[o.id])), [includedIds.join(","), JSON.stringify(altPkg)]);
  const totAttn = models.reduce((n, m) => n + m.attn.length, 0);
  const totOk = models.reduce((n, m) => n + m.okc.length, 0);
  const totKept = models.reduce((n, m) => n + m.kept.length, 0);
  const totFixed = models.reduce((n, m) => n + m.fixedCount, 0);
  const editCounts = models.reduce((acc, m) => {
    const cs = counters[m.offer.id] || {};
    m.rows.forEach((r) => {
      const fb = r.changed ? r.proposed : r.baseline;
      const v = cs[r.key] !== undefined ? cs[r.key] : (r.pkgCounter !== undefined ? r.pkgCounter : fb);
      if (eq(v, fb)) return;
      if (cs[r.key] !== undefined) acc.manual += 1; else acc.byPkg += 1;
    });
    return acc;
  }, { manual: 0, byPkg: 0 });
  const editedCount = editCounts.manual;
  const pkgMoved = editCounts.byPkg;
  const totalMoved = editedCount + pkgMoved;
  const pkgSwaps = models.filter((m) => m.alt).length;

  const setCounterVal = (oid, fid, v) => setCounters((s) => ({ ...s, [oid]: { ...(s[oid] || {}), [fid]: v } }));

  const decLabel = decision === "accepted" ? "You accepted this proposal" : decision === "countered" ? "Your counter-offer was sent" : "You declined this proposal";
  const decSub = decision === "accepted" ? "The orchestrator has been notified and the contract will be drawn up." : decision === "countered" ? "The orchestrator will review your counter and respond." : "The orchestrator has been notified.";

  return (
    <AppLayout title="Negotiation" activeId="projects">
          <div className="n3-page">
            <div className="n3-hero">
              <span className="n3-eyebrow"><Icon name="scale" size={13} /> Negotiation · Round 2 · proposed 3 days ago</span>
              <h1>Review {PROJECT.orchestrator}'s proposal</h1>
              <p className="n3-lede">They want to use <b>{includedIds.length}</b> of your offer{includedIds.length !== 1 ? "s" : ""} in their project. Each field of the <b>baseline you published</b> sits next to what they propose — <b>review, then accept, counter or decline</b>. Only the fields you left negotiable in Offer Settings can move; everything else is fixed.</p>
              <div className="n3-ctxstrip">
                <div className="n3-ctx"><span className="n3-ctx-k"><Icon name="projects" size={13} /> Project</span><div><div className="n3-ctx-name">{PROJECT.name}</div><div className="n3-ctx-cap">{PROJECT.caption}</div></div></div>
                <div className="n3-ctx"><span className="n3-ctx-k"><Icon name="team" size={13} /> Orchestrator</span><div><div className="n3-ctx-name">{PROJECT.orchestrator}</div><div className="n3-ctx-cap">{`${includedIds.length} offer${includedIds.length !== 1 ? "s" : ""} in play`}</div></div></div>
              </div>
            </div>

            <div className="n3-body">
              <aside className="n3-rail">
                <div className="n3-decide">
                  {decision ? (
                    <>
                      <div className={`n3-decide-state ${decision}`}><Icon name={decision === "accepted" ? "check" : decision === "countered" ? "pen" : "x"} size={22} /></div>
                      <h2>{decLabel}</h2><p>{decSub}</p>
                      <div className="n3-actions" style={{ marginTop: 16 }}><button type="button" className="n3-btn ghost" onClick={() => { decide(null); setCounter(false); }}>Undo</button></div>
                    </>
                  ) : counter ? (
                    <>
                      <div className="n3-decide-hd"><Icon name="pen" size={16} /><span>Counter-offer</span></div>
                      <p>Edit any negotiable field in the <b>Your counter</b> column — or counter with another package — then send it back in one round.</p>
                      <div className="n3-actions" style={{ marginTop: 16 }}>
                        <button type="button" className="n3-btn primary" onClick={() => { decide("countered"); setCounter(false); }}><Icon name="arrowRight" size={16} /> Send counter-offer</button>
                        <button type="button" className="n3-btn ghost" onClick={() => setCounter(false)}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="n3-decide-hd"><Icon name="scale" size={16} /><span>Your decision</span></div>
                      <div className="n3-tally">
                        <div className="n3-tally-row attn"><span className="n3-tally-n">{totAttn}</span><span>need your decision</span></div>
                        <div className="n3-tally-row ok"><span className="n3-tally-n">{totOk}</span><span>within your ranges</span></div>
                        {pkgSwaps > 0 && <div className="n3-tally-row offers"><span className="n3-tally-n">{pkgSwaps}</span><span>{`package${pkgSwaps !== 1 ? "s" : ""} countered`}</span></div>}
                        {pkgMoved > 0 && <div className="n3-tally-row offers"><span className="n3-tally-n">{pkgMoved}</span><span>{`field${pkgMoved !== 1 ? "s" : ""} re-set by that package`}</span></div>}
                        {editedCount > 0 && <div className="n3-tally-row edited"><span className="n3-tally-n">{editedCount}</span><span>{`negotiable field${editedCount !== 1 ? "s" : ""} you moved`}</span></div>}
                        <div className="n3-tally-row kept"><span className="n3-tally-n">{totKept}</span><span>fields unchanged</span></div>
                        <div className="n3-tally-row fixed"><span className="n3-tally-n">{totFixed}</span><span>fixed — not negotiable</span></div>
                      </div>
                      <div className="n3-tally-note"><Icon name="layers" size={13} />{`Across ${includedIds.length} offer${includedIds.length !== 1 ? "s" : ""}`}</div>
                      <div className="n3-actions">
                        {totalMoved > 0 ? (
                          <>
                            <button type="button" className="n3-btn primary" onClick={() => { decide("countered"); setCounter(false); }}><Icon name="arrowRight" size={16} />{`Send counter · ${totalMoved} change${totalMoved !== 1 ? "s" : ""}`}</button>
                            <button type="button" className="n3-btn ghost" onClick={clearEdits}><Icon name="refresh" size={16} /> Discard changes</button>
                            <button type="button" className="n3-btn danger" onClick={() => decide("declined")}><Icon name="x" size={16} /> Decline</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="n3-btn primary" onClick={() => decide("accepted")}><Icon name="check" size={16} /> Accept all</button>
                            <button type="button" className="n3-btn ghost" onClick={() => setCounter(true)}><Icon name="pen" size={16} /> Counter every negotiable field</button>
                            <button type="button" className="n3-btn danger" onClick={() => decide("declined")}><Icon name="x" size={16} /> Decline</button>
                          </>
                        )}
                      </div>
                      <p className="n3-actions-note">{totalMoved > 0
                        ? `${editedCount ? `You moved ${editedCount} negotiable field${editedCount !== 1 ? "s" : ""}` : "No negotiable field moved by hand"}${pkgMoved ? `, and countering with another package re-sets ${pkgMoved} more` : ""} — send it back as one counter-offer, or discard to start over.`
                        : (totAttn > 0 ? `${totAttn} field${totAttn !== 1 ? "s" : ""} fall outside your acceptance ranges — review, or edit any negotiable value inline before accepting.` : "Nothing falls outside your published baseline — or edit any negotiable value inline to counter.")}</p>
                    </>
                  )}
                </div>

                <div className="n3-help">
                  <div className="n3-help-hd"><Icon name="info" size={14} /> How to read this</div>
                  <div className="n3-legend">
                    <div className="n3-legend-row"><span className="n3-legend-dot attn"></span><span><b>Amber</b> — their value is outside the acceptance range you published. Your call.</span></div>
                    <div className="n3-legend-row"><span className="n3-legend-dot ok"></span><span><b>Green</b> — changed, but inside a range you already accepted.</span></div>
                    <div className="n3-legend-row"><span className="n3-legend-dot kept"></span><span><b>Grey</b> — unchanged, kept at your published baseline.</span></div>
                    <div className="n3-legend-row"><span className="n3-legend-dot fixed"></span><span><b>Fixed</b> — not opened in Offer Settings, so it cannot be proposed against.</span></div>
                    <div className="n3-legend-row"><span className="n3-legend-dot counter"></span><span><b>Edit value</b> — move any negotiable field in its row, or counter with another package.</span></div>
                  </div>
                </div>
              </aside>

              <div className="n3-stream">
                <div className="n3-tabs" role="tablist">
                  <button type="button" role="tab" aria-selected={tab === "current"} className={tab === "current" ? "active" : ""} onClick={() => setTab("current")}><Icon name="scale" size={15} /> Current proposal{totAttn > 0 && <span className="n3-tab-c">{totAttn}</span>}</button>
                  <button type="button" role="tab" aria-selected={tab === "history"} className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><Icon name="archive" size={15} /> History<span className="n3-tab-c muted">{HISTORY.length + 1}</span></button>
                </div>

                {tab === "history" ? <HistoryPanel orchestrator={PROJECT.orchestrator} /> : <>
                {counter && <div className="n3-mode"><Icon name="pen" size={15} /><span><b>Counter-offer mode.</b> Only the fields you left negotiable in Offer Settings are editable; each offer is negotiated independently.</span></div>}

                {models.map((m) => {
                  const setC = (fid, v) => setCounterVal(m.offer.id, fid, v); setC.setFilter = setFilter;
                  const eKeys = Object.keys(editing).filter((k) => k.startsWith(m.offer.id + "::")).map((k) => k.slice(m.offer.id.length + 2));
                  return <OfferPanel key={m.offer.id} model={m} added={m.offer.id !== REQUESTED_ID} counter={counter} filter={filter}
                    counters={counters[m.offer.id] || {}} setCounter={setC} orchestrator={PROJECT.orchestrator}
                    editing={eKeys} onToggleEdit={(key, open) => toggleEdit(m.offer.id, key, open)}
                    altId={altPkg[m.offer.id] || null} onAlt={(pid) => setAlt(m.offer.id, pid)} />;
                })}

                </>}
              </div>
            </div>
          </div>
    </AppLayout>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Negotiation4App />);
})();
