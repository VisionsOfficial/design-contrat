// VisionsTrust — Negotiation review, VARIANT 3 (contract ledger / plain-language).
// Same per-offer negotiation model as v2, but the presentation is a single scannable
// comparison TABLE per offer (You published → They propose → Status / your response),
// grouped by contract section, with a "Changes only / All terms" filter so casual users
// see just what changed while legal can expand the full contract. Nothing is hidden.
(function () {
const { useState, useEffect, useMemo } = React;
const { Icon, AppSidebar, BottomNav, BottomNavSheet } = window.UI;
const { SECTIONS } = window.OfferSettingsData;
const { ITEMS } = window.BasketData;
const { initials, hexToRgba, accentFor } = window.CatData;

const LS_KEY = "vt.negotiation3.v1";
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isEmpty = (v) => v === "" || v == null || (Array.isArray(v) && v.length === 0);

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
  if (accept == null) return "No published range — at your discretion.";
  if (field.type === "numberUnit") return `Your published range: ${accept.min}–${accept.max} ${field.units[0]}.`;
  if (Array.isArray(accept)) return `You published as acceptable: ${accept.join(", ")}.`;
  return "At your discretion.";
}

// ─── SCENARIO (shared with v2) ────────────────────────────────────────────────
const OFFER = ITEMS.find((o) => o.id === "data_offer_1");
const REQUESTED_ID = OFFER.id;
const PROJECT = { name: "SERVICE_PROVIDER_DSUC_CHAIN", org: "TECHNÉ", orchestrator: "Techné", caption: "VR learning analytics chain" };
const PROPOSALS = {
  data_offer_1: {
    delivery_deadline: { n: 3, u: "business days" }, availability: "99.9%", update_frequency: "Real-time / streaming",
    support_hours: "Extended 5×12", retention_period: "Contract duration", renewal_mode: "On mutual agreement",
    notice_nonrenewal: { n: 90, u: "days" }, notice_early: { n: 60, u: "days" },
  },
};
const PRICING_PROPOSALS = { data_offer_1: { sub: "2", billing: "One shot", setup: "0", api: "0", currency: "EUR" } };
const EXTRA = [
  { id: "skills_analytics", name: "Skills analytics", kind: "Service", desc: "Aggregated skills-matching analytics across the training cohort.", resources: 2,
    pricing: { sub: "50", billing: "Monthly", setup: "0", api: "0", currency: "EUR" },
    overrides: { availability: { value: "99%" }, support_hours: { value: "24/7" }, update_frequency: { value: "Weekly" }, contract_duration: { value: { n: 6, u: "months" } } } },
  { id: "billing_offer_test", name: "billing_offer_test", kind: "Data", desc: "Reference billing dataset for chain reconciliation.", resources: 1,
    pricing: { sub: "0", billing: "One shot", setup: "0", api: "0", currency: "EUR" },
    overrides: { update_frequency: { value: "Monthly" }, retention_period: { value: "90 days" } } },
];
const normOffer = (o) => ({ id: o.id, name: o.name, kind: o.kind || "Data", desc: o.desc || "", provider: o.provider || OFFER.provider, resources: o.resources || 1, pricing: o.pricing, overrides: o.overrides || {}, accent: o.accent || accentFor((o.provider || "") + o.name) });
const CANDIDATES = [...ITEMS.filter((o) => o.id !== REQUESTED_ID), ...EXTRA].map(normOffer);
const OFFER_MAP = Object.fromEntries([normOffer(OFFER), ...CANDIDATES].map((o) => [o.id, o]));

const SEC_META = {
  sla: { label: "Service levels (SLA)", icon: "clock" },
  duration: { label: "Duration & renewal", icon: "hourglass" },
  termination: { label: "Termination", icon: "danger" },
  pricing: { label: "Pricing", icon: "coin" },
};
const TERM_SECTION_IDS = ["sla", "duration", "termination"];
function fieldsOf(section) { return section.fields || (section.groups || []).flatMap((g) => g.fields); }
const PRICE_FIELDS = [
  { k: "sub", label: "Subscription pricing", meaning: "Recurring price the consumer pays to use this offer.", money: true },
  { k: "billing", label: "Billing period", meaning: "How often the subscription price is charged." },
  { k: "setup", label: "Setup fee", meaning: "One-off fee at the start of the contract.", money: true },
  { k: "api", label: "Cost per API call", meaning: "Usage-based price per API call, if any.", money: true },
  { k: "currency", label: "Currency", meaning: "Currency the pricing is expressed in." },
];

function buildOfferModel(offer) {
  const ov = offer.overrides || {};
  const proposed = PROPOSALS[offer.id] || {};
  const rows = [];
  TERM_SECTION_IDS.forEach((sid) => {
    const s = SECTIONS.find((x) => x.id === sid);
    fieldsOf(s).forEach((f) => {
      const o = ov[f.id] || {};
      const baseline = o.value !== undefined ? clone(o.value) : clone(f.def);
      if (isEmpty(baseline)) return;
      const neg = o.neg !== undefined ? o.neg : !!f.neg;
      const accept = o.accept !== undefined ? o.accept : (f.accept || null);
      const negotiable = neg && f.type !== "date";
      const hasProp = Object.prototype.hasOwnProperty.call(proposed, f.id);
      const prop = hasProp ? clone(proposed[f.id]) : clone(baseline);
      const changed = hasProp && !eq(prop, baseline);
      const within = changed ? inAccept(f, prop, accept) : true;
      rows.push({ kind: "term", key: f.id, field: f, sec: sid, baseline, proposed: prop, neg: negotiable, accept, changed, within });
    });
  });
  const basePricing = offer.pricing || { sub: "0", billing: "One shot", setup: "0", api: "0", currency: "EUR" };
  const propPricing = PRICING_PROPOSALS[offer.id] || basePricing;
  PRICE_FIELDS.forEach((f) => {
    const baseline = String(basePricing[f.k]); const prop = String(propPricing[f.k]);
    const changed = baseline !== prop;
    rows.push({ kind: "price", key: "p_" + f.k, pf: f, field: { label: f.label, meaning: f.meaning }, sec: "pricing", baseline, proposed: prop, neg: f.k === "sub", accept: null, changed, within: true, currency: propPricing.currency });
  });
  const penSec = SECTIONS.find((s) => s.id === "penalties");
  const penalty = {}; penSec.fields.forEach((f) => { penalty[f.id] = clone(f.def); });
  const attn = rows.filter((r) => r.changed && !r.within);
  const okc = rows.filter((r) => r.changed && r.within);
  const kept = rows.filter((r) => !r.changed);
  return { offer, rows, attn, okc, kept, changedCount: attn.length + okc.length, penalty };
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

// ─── ONE LEDGER ROW ──────────────────────────────────────────────────────────
function LedgerRow({ row, counter, counterVal, onCounter, isEditing, countered, onEdit, onCancel }) {
  const { field, baseline, proposed, changed, within, neg } = row;
  const unit = row.kind === "price" && row.pf.money ? " " + row.currency : "";
  const fmtP = (v) => row.kind === "price" ? String(v) + unit : fmtVal(field, v);
  const rowCls = (countered ? "cnt " : "") + (changed ? (within ? "ok" : "attn") : "");
  const badge = changed ? (within ? { c: "ok", t: "Within range" } : { c: "attn", t: "Needs decision" }) : (neg ? { c: "kept", t: "Unchanged" } : { c: "fixed", t: "Fixed" });
  const fb = changed ? proposed : baseline;
  const showEditor = (counter && neg) || isEditing;
  return (
    <div className={`n3-row ${rowCls}`}>
      <div className="n3-td term">
        <div className="n3-term"><span className="n3-term-name">{field.label}</span>{field.meaning && <span className="n3-info" title={field.meaning}><Icon name="info" size={13} /></span>}</div>
        <div className="n3-term-mean">{SEC_META[row.sec].label}</div>
      </div>
      <div className="n3-td">
        <span className="n3-cell-lab">You published</span>
        <span className="n3-val pub">{fmtP(baseline)}</span>
      </div>
      <div className="n3-td">
        <span className="n3-cell-lab">They propose</span>
        {changed
          ? <span className="n3-val prop chg"><Icon name="arrowRight" size={13} />{fmtP(proposed)}</span>
          : <span className="n3-val prop same"><em>Same as published</em></span>}
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
            <span className="n3-badge counter"><Icon name="pen" size={12} /> Your counter</span>
            <span className="n3-val chg cnt">{fmtP(counterVal)}</span>
            <div className="n3-inline-btns">
              <button type="button" className="n3-editbtn" onClick={() => onEdit(true)}><Icon name="edit" size={12} /> Edit</button>
              <button type="button" className="n3-reset" onClick={() => onCounter(clone(fb))}>Undo</button>
            </div>
          </div>
        ) : (
          <div className="n3-statuswrap">
            <span className={`n3-badge ${badge.c}`}>{changed && <Icon name={within ? "check" : "triggers"} size={12} />}{badge.t}</span>
            {changed && <span className="n3-accept-hint">{acceptText(field, row.accept)}</span>}
            {neg && <button type="button" className="n3-editbtn edit-value" onClick={() => onEdit(true)}><Icon name="edit" size={12} /> Edit value</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PLAIN-LANGUAGE SUMMARY ──────────────────────────────────────────────────
function summarize(m, orchestrator) {
  const priceChg = m.rows.filter((r) => r.kind === "price" && r.changed).length;
  const parts = [];
  parts.push(<span key="a"><b>{orchestrator}</b> accepts <b>{m.kept.length}</b> of your published terms without change.</span>);
  if (m.attn.length) parts.push(<span key="b"> They propose <span className="hl-attn">{m.attn.length} change{m.attn.length !== 1 ? "s" : ""} that fall outside</span> the ranges you published — these need your decision.</span>);
  if (m.okc.length) parts.push(<span key="c"> {m.attn.length ? "Another" : "They propose"} <span className="hl-ok">{m.okc.length}{m.attn.length ? "" : " change" + (m.okc.length !== 1 ? "s" : "")}</span> {m.attn.length ? "change" + (m.okc.length !== 1 ? "s" : "") + " stay" : "that stay"} within your ranges{priceChg ? ", including pricing" : ""}.</span>);
  if (!m.attn.length && !m.okc.length) parts.push(<span key="d"> Nothing falls outside your terms — you can accept safely.</span>);
  return parts;
}

// ─── NEGOTIATION HISTORY (past rounds & values) ──────────────────────────────
const HISTORY = [
  { round: 1, actor: "you", ts: "14 days ago", date: "6 Jul 2026", title: "You published the offer",
    note: "You listed data_offer_1 on the VisionsTrust marketplace with your baseline commercial and service terms, leaving SLA, duration and pricing open to negotiation.",
    changes: [
      { label: "Availability / uptime", to: "99.5%" },
      { label: "Delivery deadline", to: "5 business days" },
      { label: "Update frequency", to: "Daily" },
      { label: "Subscription pricing", to: "€2 · one shot" },
      { label: "Notice — non-renewal", to: "60 days" },
    ], outcome: "Offer live · 5 negotiable terms exposed." },
  { round: 1, actor: "them", ts: "9 days ago", date: "11 Jul 2026", title: "Techné's first counter",
    note: "Techné requested the offer for their VR learning-analytics chain and pushed back hard on service levels — asking for near-continuous uptime and same-day delivery — while proposing to drop the subscription to zero in exchange.",
    changes: [
      { label: "Availability / uptime", from: "99.5%", to: "99.99%", flag: "attn" },
      { label: "Delivery deadline", from: "5 business days", to: "1 business day", flag: "attn" },
      { label: "Update frequency", from: "Daily", to: "Real-time / streaming", flag: "attn" },
      { label: "Subscription pricing", from: "€2", to: "€0", flag: "ok" },
    ], outcome: "3 of 4 asks fell outside the ranges you had published." },
  { round: 2, actor: "you", ts: "7 days ago", date: "13 Jul 2026", title: "Your counter-offer",
    note: "You met them partway: relaxed the delivery deadline to 3 business days and accepted real-time streaming, but held uptime at 99.9% and restored the €2 subscription to keep the offer commercially viable.",
    changes: [
      { label: "Availability / uptime", from: "99.99%", to: "99.9%", flag: "ok" },
      { label: "Delivery deadline", from: "1 business day", to: "3 business days", flag: "ok" },
      { label: "Update frequency", to: "Real-time / streaming", flag: "ok" },
      { label: "Subscription pricing", to: "€2", flag: "attn" },
    ], outcome: "4 revised terms sent back for Techné's review." },
];
const HIST_CURRENT = { round: 2, actor: "them", ts: "3 days ago", date: "17 Jul 2026", title: "Techné's current proposal",
  note: "Techné accepted most of your round-2 counter, but re-opened two service-level items — asking again for tighter availability and faster delivery. This is the proposal now waiting for your response.",
  outcome: "Awaiting your decision · 2 terms outside range." };

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
  const steps = HISTORY.length + 1;
  const stats = [
    { k: "Rounds", v: rounds, ic: "refresh" },
    { k: "Exchanges", v: steps, ic: "chat" },
    { k: "Opened", v: "6 Jul 2026", ic: "clock" },
    { k: "Status", v: "Awaiting you", ic: "hourglass", warn: true },
  ];
  return (
    <section className="n3-histpanel">
      <div className="n3-histpanel-head">
        <div className="n3-histpanel-intro">
          <h2>How this negotiation got here</h2>
          <p>Every round exchanged between you and <b>{orchestrator}</b> since the offer was published — who moved, when, and exactly which values changed. Nothing is ever overwritten; each step stays on the record.</p>
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
function OfferPanel({ model, added, counter, filter, counters, setCounter, onRemove, orchestrator, editing, onToggleEdit }) {
  const { offer, rows, attn, okc, kept, changedCount, penalty } = model;
  const cv = (r) => { const fb = r.changed ? r.proposed : r.baseline; return counters[r.key] !== undefined ? counters[r.key] : fb; };
  const isCnt = (r) => { const c = counters[r.key]; return c !== undefined && !eq(c, r.changed ? r.proposed : r.baseline); };
  const isEd = (r) => editing.includes(r.key);
  // which rows are visible under the current filter
  const visible = rows.filter((r) => filter === "all" || r.changed || (counter && r.neg) || isCnt(r) || isEd(r));
  const bySec = {};
  ["sla", "duration", "termination", "pricing"].forEach((sid) => { const rs = visible.filter((r) => r.sec === sid); if (rs.length) bySec[sid] = rs; });

  return (
    <section className={`n3-op ${added ? "added" : ""}`}>
      <header className="n3-op-head">
        <MonoFor offer={offer} size={44} />
        <div className="n3-op-id">
          <div className="n3-op-top"><span className="n3-op-name">{offer.name}</span>{added ? <span className="n3-tag add">Added by you</span> : <span className="n3-tag req">Requested</span>}</div>
          <div className="n3-op-meta">{offer.kind} · {offer.resources} resource{offer.resources !== 1 ? "s" : ""} · {rows.length} contract terms · own pricing</div>
        </div>
        <button type="button" className="n3-op-rm" onClick={onRemove}><Icon name="trash" size={14} /> Remove</button>
      </header>

      <div className="n3-summary">
        <div className="n3-summary-ic"><Icon name={changedCount ? "info" : "check"} size={18} /></div>
        <p className="n3-summary-txt">{summarize(model, orchestrator)}</p>
      </div>

      <div className="n3-toolbar">
        <div className="n3-filter" role="tablist">
          <button type="button" role="tab" className={filter === "changes" ? "active" : ""} onClick={() => setCounter.setFilter("changes")}>
            Changes only <span className={`n3-fc ${changedCount ? "" : "zero"}`}>{changedCount}</span>
          </button>
          <button type="button" role="tab" className={filter === "all" ? "active" : ""} onClick={() => setCounter.setFilter("all")}>
            All contract terms <span className="n3-fc total">{rows.length}</span>
          </button>
        </div>
        <span className="n3-toolbar-note">{filter === "changes" ? "Showing only what differs from your published offer." : "Full contract — every term shown for the record."}</span>
      </div>

      <div className="n3-table">
        <div className="n3-thead"><div className="n3-th">Contract term</div><div className="n3-th">You published</div><div className="n3-th">They propose</div><div className="n3-th resp">{counter ? "Your counter" : "Status"}</div></div>
        {Object.entries(bySec).map(([sid, rs]) => (
          <React.Fragment key={sid}>
            <div className="n3-secrow"><Icon name={SEC_META[sid].icon} size={14} /><span>{SEC_META[sid].label}</span><small>{rs.length} term{rs.length !== 1 ? "s" : ""}</small></div>
            {rs.map((r) => <LedgerRow key={r.key} row={r} counter={counter} counterVal={cv(r)} onCounter={(v) => setCounter(r.key, v)} isEditing={isEd(r)} countered={isCnt(r)} onEdit={(open) => onToggleEdit(r.key, open)} onCancel={() => { setCounter(r.key, clone(r.changed ? r.proposed : r.baseline)); onToggleEdit(r.key, false); }} />)}
          </React.Fragment>
        ))}
        {Object.keys(bySec).length === 0 && <div className="n3-row"><div className="n3-td term" style={{ gridColumn: "1 / -1", color: "var(--text-muted)", fontSize: 13 }}>Nothing changed on this offer — switch to <b>All contract terms</b> to review the full agreement.</div></div>}
      </div>

      <div className="n3-pen">
        <div className="n3-pen-ic"><Icon name="shield" size={18} /></div>
        <div>
          <div className="n3-pen-hd">Commitments &amp; penalties <span className="bk-st st-fixed"><Icon name="lock" size={11} /> Fixed — not negotiated</span></div>
          <p>Backed by a <b>{penalty.consequence_type}</b> penalty if <b>{penalty.commitment_concerned}</b> falls {penalty.trigger_threshold.op} {penalty.trigger_threshold.v}, assessed <b>{penalty.measurement_period.toLowerCase()}</b>, capped at <b>{penalty.penalty_cap.toLowerCase()}</b>. These terms are fixed for this offer and carry over into the contract as-is.</p>
        </div>
      </div>
    </section>
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
function Negotiation3App() {
  const load = () => { try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch (e) {} return { decision: null, included: [REQUESTED_ID], filter: "changes" }; };
  const [ui, setUi] = useState(load);
  const decision = ui.decision;
  const filter = ui.filter || "changes";
  const includedIds = ui.included && ui.included.length ? ui.included : [REQUESTED_ID];
  const [counter, setCounter] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [counters, setCounters] = useState({});
  const [editing, setEditing] = useState({});
  const tab = ui.tab === "history" ? "history" : "current";
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(ui)); } catch (e) {} }, [ui]);
  const decide = (d) => setUi((s) => ({ ...s, decision: d }));
  const setFilter = (f) => setUi((s) => ({ ...s, filter: f }));
  const setTab = (t) => setUi((s) => ({ ...s, tab: t }));
  const toggleEdit = (oid, key, open) => setEditing((s) => { const k = oid + "::" + key; const n = { ...s }; if (open) n[k] = true; else delete n[k]; return n; });
  const clearEdits = () => { setCounters({}); setEditing({}); };

  const models = useMemo(() => includedIds.map((id) => OFFER_MAP[id]).filter(Boolean).map(buildOfferModel), [includedIds.join(",")]);
  const addedIds = includedIds.filter((id) => id !== REQUESTED_ID);
  const removedRequested = !includedIds.includes(REQUESTED_ID);
  const offerChanges = addedIds.length + (removedRequested ? 1 : 0);
  const totAttn = models.reduce((n, m) => n + m.attn.length, 0);
  const totOk = models.reduce((n, m) => n + m.okc.length, 0);
  const totKept = models.reduce((n, m) => n + m.kept.length, 0);
  const editedCount = models.reduce((n, m) => { const cs = counters[m.offer.id] || {}; return n + m.rows.filter((r) => { const c = cs[r.key]; return c !== undefined && !eq(c, r.changed ? r.proposed : r.baseline); }).length; }, 0);

  const setCounterVal = (oid, fid, v) => setCounters((s) => ({ ...s, [oid]: { ...(s[oid] || {}), [fid]: v } }));
  const addOffer = (id) => setUi((s) => ({ ...s, included: [...(s.included || [REQUESTED_ID]), id] }));
  const removeOffer = (id) => setUi((s) => ({ ...s, included: (s.included || [REQUESTED_ID]).filter((x) => x !== id) }));
  const restoreRequested = () => setUi((s) => ({ ...s, included: [REQUESTED_ID, ...(s.included || [])] }));
  const candidates = CANDIDATES.filter((o) => !includedIds.includes(o.id) && o.name.toLowerCase().includes(search.trim().toLowerCase()));

  const decLabel = decision === "accepted" ? "You accepted this proposal" : decision === "countered" ? "Your counter-offer was sent" : "You declined this proposal";
  const decSub = decision === "accepted" ? "The orchestrator has been notified and the contract will be drawn up." : decision === "countered" ? "The orchestrator will review your counter and respond." : "The orchestrator has been notified.";

  return (
    <div className="app ui-v2 n3-app">
      <a href="#n3-main" className="skip-link">Skip to content</a>
      <AppSidebar variant="v2" activeId="myprojects" />
      <div className="main">
        <header className="topbar cat-topbar">
          <div className="topbar-left"><div className="page-title"><Icon name="scale" size={20} /><h1>Negotiation</h1></div></div>
          <div className="topbar-right">
            <button type="button" className="icon-btn ghost" aria-label="Basket"><Icon name="cart" size={18} /><span className="notif-dot" aria-hidden="true">2</span></button>
            <button type="button" className="icon-btn ghost hide-mobile" aria-label="Language"><Icon name="translate" size={18} /></button>
            <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16} /><span>Help</span></button>
            <button type="button" className="icon-btn ghost notif" aria-label="Notifications, 54 unread"><Icon name="bell" size={18} /><span className="notif-dot" aria-hidden="true">54</span></button>
            <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18} /></button>
          </div>
        </header>

        <main className="content n3-content" id="n3-main" tabIndex={-1}>
          <div className="n3-page">
            <div className="n3-hero">
              <span className="n3-eyebrow"><Icon name="scale" size={13} /> Negotiation · Round 2 · proposed 3 days ago</span>
              <h1>Review {PROJECT.orchestrator}'s proposal</h1>
              <p className="n3-lede">They want to use <b>{includedIds.length}</b> of your offer{includedIds.length !== 1 ? "s" : ""} in their project. Below, each of your published terms sits next to what they propose — <b>review, then accept, counter or decline</b>. Every term stays on record.</p>
              <div className="n3-ctxstrip">
                <div className="n3-ctx"><span className="n3-ctx-k"><Icon name="projects" size={13} /> Project</span><div><div className="n3-ctx-name">{PROJECT.name}</div><div className="n3-ctx-cap">{PROJECT.caption}</div></div></div>
                <div className="n3-ctx"><span className="n3-ctx-k"><Icon name="team" size={13} /> Orchestrator</span><div><div className="n3-ctx-name">{PROJECT.orchestrator}</div><div className="n3-ctx-cap">{includedIds.length} offer{includedIds.length !== 1 ? "s" : ""} in play</div></div></div>
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
                      <p>Edit any negotiable term in the <b>Your counter</b> column, then send it all back in one round.</p>
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
                        {offerChanges > 0 && <div className="n3-tally-row offers"><span className="n3-tally-n">{offerChanges}</span><span>offer{offerChanges !== 1 ? "s" : ""} added / removed</span></div>}
                        {editedCount > 0 && <div className="n3-tally-row edited"><span className="n3-tally-n">{editedCount}</span><span>term{editedCount !== 1 ? "s" : ""} you edited</span></div>}
                        <div className="n3-tally-row kept"><span className="n3-tally-n">{totKept}</span><span>terms unchanged</span></div>
                      </div>
                      <div className="n3-tally-note"><Icon name="layers" size={13} /> Across {includedIds.length} offer{includedIds.length !== 1 ? "s" : ""}</div>
                      <div className="n3-actions">
                        {editedCount > 0 ? (
                          <>
                            <button type="button" className="n3-btn primary" onClick={() => { decide("countered"); setCounter(false); }}><Icon name="arrowRight" size={16} /> Send counter · {editedCount} edit{editedCount !== 1 ? "s" : ""}</button>
                            <button type="button" className="n3-btn ghost" onClick={clearEdits}><Icon name="refresh" size={16} /> Discard edits</button>
                            <button type="button" className="n3-btn danger" onClick={() => decide("declined")}><Icon name="x" size={16} /> Decline</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="n3-btn primary" onClick={() => decide("accepted")}><Icon name="check" size={16} /> Accept all</button>
                            <button type="button" className="n3-btn ghost" onClick={() => setCounter(true)}><Icon name="pen" size={16} /> Counter every term</button>
                            <button type="button" className="n3-btn danger" onClick={() => decide("declined")}><Icon name="x" size={16} /> Decline</button>
                          </>
                        )}
                      </div>
                      <p className="n3-actions-note">{editedCount > 0 ? `You edited ${editedCount} term${editedCount !== 1 ? "s" : ""} inline — send them back as one counter-offer, or discard to start over.` : (totAttn > 0 ? `${totAttn} term${totAttn !== 1 ? "s" : ""} fall outside your ranges — review, or edit any value inline before accepting.` : "Nothing falls outside your published terms — or edit any value inline to counter.")}</p>
                    </>
                  )}
                </div>

                <div className="n3-help">
                  <div className="n3-help-hd"><Icon name="info" size={14} /> How to read this</div>
                  <div className="n3-legend">
                    <div className="n3-legend-row"><span className="n3-legend-dot attn"></span><span><b>Amber</b> — their value is outside the range you published. Your call.</span></div>
                    <div className="n3-legend-row"><span className="n3-legend-dot ok"></span><span><b>Green</b> — changed, but within a range you already accepted.</span></div>
                    <div className="n3-legend-row"><span className="n3-legend-dot kept"></span><span><b>Grey</b> — unchanged, kept at your published value.</span></div>
                    <div className="n3-legend-row"><span className="n3-legend-dot counter"></span><span><b>Edit value</b> — tweak any negotiable term right in its row to build a counter, no mode-switch needed.</span></div>
                  </div>
                </div>
              </aside>

              <div className="n3-stream">
                <div className="n3-tabs" role="tablist">
                  <button type="button" role="tab" aria-selected={tab === "current"} className={tab === "current" ? "active" : ""} onClick={() => setTab("current")}><Icon name="scale" size={15} /> Current proposal{totAttn > 0 && <span className="n3-tab-c">{totAttn}</span>}</button>
                  <button type="button" role="tab" aria-selected={tab === "history"} className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><Icon name="archive" size={15} /> History<span className="n3-tab-c muted">{HISTORY.length + 1}</span></button>
                </div>

                {tab === "history" ? <HistoryPanel orchestrator={PROJECT.orchestrator} /> : <>
                {counter && <div className="n3-mode"><Icon name="pen" size={15} /><span><b>Counter-offer mode.</b> Only negotiable terms are editable; each offer is negotiated independently.</span></div>}

                {models.map((m) => {
                  const setC = (fid, v) => setCounterVal(m.offer.id, fid, v); setC.setFilter = setFilter;
                  const eKeys = Object.keys(editing).filter((k) => k.startsWith(m.offer.id + "::")).map((k) => k.slice(m.offer.id.length + 2));
                  return <OfferPanel key={m.offer.id} model={m} added={m.offer.id !== REQUESTED_ID} counter={counter} filter={filter}
                    counters={counters[m.offer.id] || {}} setCounter={setC} onRemove={() => removeOffer(m.offer.id)} orchestrator={PROJECT.orchestrator}
                    editing={eKeys} onToggleEdit={(key, open) => toggleEdit(m.offer.id, key, open)} />;
                })}

                {removedRequested && <div className="n3-removed"><Icon name="trash" size={14} /><span>You removed the originally requested offer <b>{OFFER.name}</b>.</span><button type="button" className="n3-reset" onClick={restoreRequested}>Undo</button></div>}
                {models.length === 0 && !removedRequested && <div className="n3-removed"><Icon name="danger" size={14} /><span>No offers in this negotiation. Add at least one before sending.</span></div>}

                <section>
                  {!addOpen ? (
                    <button type="button" className="n3-add-toggle" onClick={() => setAddOpen(true)}><Icon name="plus" size={15} /> Propose another of your offers</button>
                  ) : (
                    <div className="n3-picker">
                      <div className="n3-picker-hd"><span>Propose another offer — it comes in with its own terms &amp; pricing</span><button type="button" className="n3-picker-x" onClick={() => { setAddOpen(false); setSearch(""); }} aria-label="Close"><Icon name="x" size={16} /></button></div>
                      <div className="n3-search"><Icon name="search" size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your offers…" /></div>
                      <div className="n3-cands">
                        {candidates.length === 0 ? <div className="n3-cands-empty">No matching offers.</div> : candidates.map((o) => (
                          <div className="n3-cand" key={o.id}><MonoFor offer={o} size={38} /><div className="n3-cand-main"><div className="n3-cand-name">{o.name}</div><div className="n3-cand-desc">{o.desc}</div><div className="n3-op-meta">{o.kind} · {o.resources} resource{o.resources !== 1 ? "s" : ""}</div></div><button type="button" className="n3-cand-add" onClick={() => addOffer(o.id)}><Icon name="plus" size={14} /> Add</button></div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
                </>}
              </div>
            </div>
          </div>
        </main>
      </div>

      <BottomNav onOpenMore={() => setMoreOpen(true)} />
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Negotiation3App />);
})();
