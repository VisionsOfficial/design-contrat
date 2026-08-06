// VisionsTrust — Negotiation review, VARIANT 2 (airy / triage), PER-OFFER model.
// Each offer in the negotiation carries its OWN published baseline, its own
// negotiable fields, its own pricing and its own penalties. The orchestrator's
// proposal, the diff, and your counter-offer are all tracked independently per offer.
(function () {
const { useState, useEffect, useMemo } = React;
const { Icon, AppSidebar, BottomNav, BottomNavSheet } = window.UI;
const { SECTIONS } = window.OfferSettingsData;
const { ITEMS } = window.BasketData;
const { initials, hexToRgba, accentFor } = window.CatData;

const LS_KEY = "vt.negotiation2.v2";
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
  if (accept == null) return "You didn't publish a range for this — it's your call.";
  if (field.type === "numberUnit") return `Your published acceptance range is ${accept.min}–${accept.max} ${field.units[0]}.`;
  if (Array.isArray(accept)) return `You published these as acceptable: ${accept.join(", ")}.`;
  return "At your discretion.";
}

// ─── SCENARIO ────────────────────────────────────────────────────────────────
const OFFER = ITEMS.find((o) => o.id === "data_offer_1");
const REQUESTED_ID = OFFER.id;
const PROJECT = { name: "SERVICE_PROVIDER_DSUC_CHAIN", org: "TECHNÉ", orchestrator: "Techné", caption: "VR learning analytics chain", desc: "Chained data-space use case aggregating VR session telemetry to power a learning-analytics dashboard for vocational training providers." };

// The orchestrator's proposed term changes, PER OFFER. Only the requested offer has
// changes; offers you add later start at their own published baseline.
const PROPOSALS = {
  data_offer_1: {
    delivery_deadline: { n: 3, u: "business days" }, availability: "99.9%", update_frequency: "Real-time / streaming",
    support_hours: "Extended 5×12", retention_period: "Contract duration", renewal_mode: "On mutual agreement",
    notice_nonrenewal: { n: 90, u: "days" }, notice_early: { n: 60, u: "days" },
  },
};
const PRICING_PROPOSALS = {
  data_offer_1: { sub: "2", billing: "One shot", setup: "0", api: "0", currency: "EUR" },
};

// Your other offers you can propose (each with its own pricing + published overrides).
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

const SEC_META = { sla: "Service levels", duration: "Duration & renewal", termination: "Termination" };
const TERM_SECTION_IDS = ["sla", "duration", "termination"];
function fieldsOf(section) { return section.fields || (section.groups || []).flatMap((g) => g.fields); }

const PRICE_FIELDS = [
  { k: "sub", label: "Subscription pricing", meaning: "Recurring price the consumer pays to use this offer.", money: true },
  { k: "billing", label: "Billing period", meaning: "How often the subscription price is charged." },
  { k: "setup", label: "Setup fee", meaning: "One-off fee at the start of the contract.", money: true },
  { k: "api", label: "Cost per API call", meaning: "Usage-based price per API call, if any.", money: true },
  { k: "currency", label: "Currency", meaning: "Currency the pricing is expressed in." },
];

// Build the full negotiation model for ONE offer.
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
      rows.push({ field: f, section: SEC_META[sid], baseline, proposed: prop, neg: negotiable, accept, changed, within });
    });
  });
  const basePricing = offer.pricing || { sub: "0", billing: "One shot", setup: "0", api: "0", currency: "EUR" };
  const propPricing = PRICING_PROPOSALS[offer.id] || basePricing;
  const priceChanges = PRICE_FIELDS.filter((f) => String(basePricing[f.k]) !== String(propPricing[f.k]));
  const penSec = SECTIONS.find((s) => s.id === "penalties");
  const penalty = {}; penSec.fields.forEach((f) => { penalty[f.id] = clone(f.def); });
  const attnRows = rows.filter((r) => r.changed && !r.within);
  const okRows = rows.filter((r) => r.changed && r.within);
  const negRows = rows.filter((r) => r.neg && !r.changed);  // negotiable, untouched
  const keptRows = rows.filter((r) => !r.changed);
  return { offer, rows, attnRows, okRows, negRows, keptRows, basePricing, propPricing, priceChanges, penalty };
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

// ─── BIG COMPARISON CARD (a changed term / pricing field) ───────────────────
function ChangeCard({ row, counter, counterVal, onCounter, priceUnit }) {
  const { field, baseline, proposed, within, accept, section } = row;
  return (
    <article className={`n2-card ${within ? "ok" : "attn"}`}>
      <div className="n2-card-head">
        <div className="n2-card-titles"><span className="n2-card-sec">{section}</span><h3>{field.label}</h3></div>
        {within ? <span className="n2-flag ok"><Icon name="check" size={13} /> Within your range</span>
                : <span className="n2-flag attn"><Icon name="triggers" size={13} /> Needs your decision</span>}
      </div>
      {field.meaning && <p className="n2-card-mean">{field.meaning}</p>}
      <div className="n2-compare">
        <div className="n2-side"><span className="n2-side-label">You published</span><span className="n2-side-val old">{fmtVal(field, baseline)}{priceUnit ? " " + priceUnit : ""}</span></div>
        <div className="n2-arrow"><Icon name="arrowRight" size={18} /></div>
        <div className="n2-side"><span className="n2-side-label">They propose</span><span className="n2-side-val new">{fmtVal(field, proposed)}{priceUnit ? " " + priceUnit : ""}</span></div>
      </div>
      <div className="n2-card-foot"><Icon name="info" size={13} /><span>{acceptText(field, accept)}</span></div>
      {counter && (
        <div className="n2-counter">
          <span className="n2-counter-label"><Icon name="pen" size={13} /> Counter with</span>
          <div className="n2-counter-ctl">{priceUnit ? <><input className="os-in" style={{ width: 110 }} value={counterVal} onChange={(e) => onCounter(e.target.value)} /><span className="n2-unit">{priceUnit}</span></> : <EditControl field={field} value={counterVal} onChange={onCounter} />}</div>
          {!eq(counterVal, proposed) && <button type="button" className="n2-reset" onClick={() => onCounter(clone(proposed))}>Match their proposal</button>}
        </div>
      )}
    </article>
  );
}

// ─── COMPACT NEGOTIABLE ROW (counter mode — untouched but negotiable) ────────
function NegRow({ row, counterVal, onCounter }) {
  const { field, baseline, accept, section } = row;
  return (
    <div className="n2-negrow">
      <div className="n2-negrow-main">
        <div className="n2-negrow-hd"><span className="n2-negrow-sec">{section}</span><span className="n2-negrow-name">{field.label}</span><span className="n2-negrow-info" title={field.meaning}><Icon name="info" size={12} /></span></div>
        <div className="n2-negrow-base">Published: <b>{fmtVal(field, baseline)}</b> · {acceptText(field, accept)}</div>
      </div>
      <div className="n2-negrow-ctl"><EditControl field={field} value={counterVal} onChange={onCounter} />{!eq(counterVal, baseline) && <button type="button" className="n2-reset" onClick={() => onCounter(clone(baseline))}>Reset</button>}</div>
    </div>
  );
}

// ─── ONE OFFER PANEL ─────────────────────────────────────────────────────────
function OfferPanel({ model, added, counter, counters, setCounter, onRemove, priceCurrency }) {
  const { offer, attnRows, okRows, negRows, keptRows, priceChanges, propPricing, penalty } = model;
  const [keptOpen, setKeptOpen] = useState(false);
  const cv = (fid, fb) => (counters[fid] !== undefined ? counters[fid] : fb);
  const changes = attnRows.length + okRows.length + priceChanges.length;
  const priceRow = (f) => ({ field: { label: f.label, meaning: f.meaning, type: "text" }, section: "Pricing", baseline: String(model.basePricing[f.k]), proposed: String(propPricing[f.k]), accept: null, within: true });

  return (
    <section className={`n2-op ${added ? "added" : ""}`}>
      <header className="n2-op-head">
        <div className="n2-op-idrow">
          <MonoFor offer={offer} size={44} />
          <div className="n2-op-id">
            <div className="n2-op-top"><span className="n2-op-name">{offer.name}</span>{added ? <span className="n2-tag add">Added by you</span> : <span className="n2-tag req">Requested</span>}</div>
            <div className="n2-op-meta">{offer.kind} · {offer.resources} resource{offer.resources !== 1 ? "s" : ""} · own terms &amp; pricing</div>
          </div>
        </div>
        <div className="n2-op-actions">
          <div className="n2-op-sum">
            {attnRows.length > 0 && <span className="n2-chip attn">{`${attnRows.length} to decide`}</span>}
            {(okRows.length + priceChanges.length) > 0 && <span className="n2-chip ok">{`${okRows.length + priceChanges.length} within range`}</span>}
            {changes === 0 && <span className="n2-chip neutral">At your published terms</span>}
          </div>
          <button type="button" className="n2-offer-rm" onClick={onRemove}><Icon name="trash" size={14} /> Remove</button>
        </div>
      </header>

      <div className="n2-op-body">
        {attnRows.length > 0 && (
          <div className="n2-sub">
            <div className="n2-sub-hd attn"><span className="n2-sub-badge attn">{attnRows.length}</span> Needs your decision</div>
            {attnRows.map((r) => <ChangeCard key={r.field.id} row={r} counter={counter} counterVal={cv(r.field.id, r.proposed)} onCounter={(v) => setCounter(r.field.id, v)} />)}
          </div>
        )}
        {(okRows.length + priceChanges.length) > 0 && (
          <div className="n2-sub">
            <div className="n2-sub-hd ok"><span className="n2-sub-badge ok">{okRows.length + priceChanges.length}</span> Within your range</div>
            {okRows.map((r) => <ChangeCard key={r.field.id} row={r} counter={counter} counterVal={cv(r.field.id, r.proposed)} onCounter={(v) => setCounter(r.field.id, v)} />)}
            {priceChanges.map((f) => <ChangeCard key={f.k} row={priceRow(f)} counter={counter && f.k === "sub"} counterVal={cv("__price", propPricing.sub)} onCounter={(v) => setCounter("__price", v)} priceUnit={f.money ? propPricing.currency : ""} />)}
          </div>
        )}
        {changes === 0 && !counter && (
          <div className="n2-atterms"><Icon name="check" size={15} /><span>The orchestrator proposed this offer <b>at your published terms</b> — nothing to review. Use <b>Counter-offer</b> to negotiate any of its fields.</span></div>
        )}
        {counter && negRows.length > 0 && (
          <div className="n2-sub">
            <div className="n2-sub-hd neg"><Icon name="pen" size={13} /> Also negotiable on this offer</div>
            <div className="n2-negrows">{negRows.map((r) => <NegRow key={r.field.id} row={r} counterVal={cv(r.field.id, r.baseline)} onCounter={(v) => setCounter(r.field.id, v)} />)}</div>
          </div>
        )}

        <button type="button" className="n2-kept-toggle" onClick={() => setKeptOpen((o) => !o)} aria-expanded={keptOpen}>
          <Icon name="check" size={15} />
          <span><b>{keptRows.length} terms</b> at your published values</span>
          <Icon name={keptOpen ? "chevronUp" : "chevronDown"} size={16} />
        </button>
        {keptOpen && <div className="n2-kept-list">{keptRows.map((r) => <div className="n2-kept" key={r.field.id}><span className="n2-kept-k">{r.field.label}<span className="n2-kept-sec">{r.section}</span></span><span className="n2-kept-v">{fmtVal(r.field, r.baseline)}</span></div>)}</div>}

        <div className="n2-commit">
          <div className="n2-commit-ic"><Icon name="shield" size={18} /></div>
          <div><div className="n2-commit-hd">Commitments &amp; penalties <span className="bk-st st-fixed"><Icon name="lock" size={11} /> Fixed</span></div>
            <p>Backed by a <b>{penalty.consequence_type}</b> penalty if <b>{penalty.commitment_concerned}</b> falls {penalty.trigger_threshold.op} {penalty.trigger_threshold.v}. Fixed for this offer — not negotiated.</p></div>
        </div>
      </div>
    </section>
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
function Negotiation2App() {
  const load = () => { try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch (e) {} return { decision: null, included: [REQUESTED_ID] }; };
  const [ui, setUi] = useState(load);
  const decision = ui.decision;
  const includedIds = ui.included && ui.included.length ? ui.included : [REQUESTED_ID];
  const [counter, setCounter] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [counters, setCounters] = useState({});  // { offerId: { fieldId: value } }
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(ui)); } catch (e) {} }, [ui]);
  const decide = (d) => setUi((s) => ({ ...s, decision: d }));

  const models = useMemo(() => includedIds.map((id) => OFFER_MAP[id]).filter(Boolean).map(buildOfferModel), [includedIds.join(",")]);
  const addedIds = includedIds.filter((id) => id !== REQUESTED_ID);
  const removedRequested = !includedIds.includes(REQUESTED_ID);
  const offerChanges = addedIds.length + (removedRequested ? 1 : 0);
  const totAttn = models.reduce((n, m) => n + m.attnRows.length, 0);
  const totOk = models.reduce((n, m) => n + m.okRows.length + m.priceChanges.length, 0);
  const totKept = models.reduce((n, m) => n + m.keptRows.length, 0);

  const setCounterVal = (oid, fid, v) => setCounters((s) => ({ ...s, [oid]: { ...(s[oid] || {}), [fid]: v } }));
  const addOffer = (id) => setUi((s) => ({ ...s, included: [...(s.included || [REQUESTED_ID]), id] }));
  const removeOffer = (id) => setUi((s) => ({ ...s, included: (s.included || [REQUESTED_ID]).filter((x) => x !== id) }));
  const restoreRequested = () => setUi((s) => ({ ...s, included: [REQUESTED_ID, ...(s.included || [])] }));
  const candidates = CANDIDATES.filter((o) => !includedIds.includes(o.id) && o.name.toLowerCase().includes(search.trim().toLowerCase()));

  const decLabel = decision === "accepted" ? "You accepted this proposal" : decision === "countered" ? "Your counter-offer was sent" : "You declined this proposal";
  const decSub = decision === "accepted" ? "The orchestrator has been notified and the contract will be drawn up." : decision === "countered" ? "The orchestrator will review your counter and respond." : "The orchestrator has been notified.";

  return (
    <div className="app ui-v2 n2-app">
      <a href="#n2-main" className="skip-link">Skip to content</a>
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

        <main className="content n2-content" id="n2-main" tabIndex={-1}>
          <div className="n2-page">
            {/* HERO */}
            <div className="n2-hero">
              <span className="n2-eyebrow">Negotiation · Round 2 · proposed 3 days ago</span>
              <h1>Review the orchestrator's proposal</h1>
              <p>{PROJECT.orchestrator} wants to use <b>{includedIds.length}</b> of your offers in their project. Each offer keeps its own terms, pricing and negotiable fields — review them one by one below.</p>              <div className="n2-ctxstrip">
                <div className="n2-ctx">
                  <span className="n2-ctx-k"><Icon name="projects" size={14} /> Project</span>
                  <div className="n2-ctx-v"><div className="bk-proj-logo">{PROJECT.org}</div><div><div className="n2-ctx-name">{PROJECT.name}</div><div className="n2-ctx-cap">{PROJECT.caption}</div></div></div>
                </div>
                <div className="n2-ctx">
                  <span className="n2-ctx-k"><Icon name="team" size={14} /> Participant</span>
                  <div className="n2-ctx-v"><div className="bk-proj-logo">{PROJECT.org}</div><div><div className="n2-ctx-name">{PROJECT.orchestrator}</div><div className="n2-ctx-cap">{includedIds.length} offer{includedIds.length !== 1 ? "s" : ""} in play</div></div></div>
                </div>
              </div>
            </div>

            <div className="n2-body">
              {/* DECISION RAIL */}
              <aside className="n2-rail">
                <div className="n2-decide">
                  {decision ? (
                    <>
                      <div className={`n2-decide-state ${decision}`}><Icon name={decision === "accepted" ? "check" : decision === "countered" ? "pen" : "x"} size={22} /></div>
                      <h2>{decLabel}</h2><p>{decSub}</p>
                      <button type="button" className="n2-btn ghost full" onClick={() => { decide(null); setCounter(false); }}>Undo</button>
                    </>
                  ) : counter ? (
                    <>
                      <div className="n2-decide-hd"><Icon name="pen" size={16} /><span>Counter-offer</span></div>
                      <p>Set the values you'll commit to — independently on each offer — then send it all back.</p>
                      <div className="n2-actions">
                        <button type="button" className="n2-btn primary full" onClick={() => { decide("countered"); setCounter(false); }}><Icon name="arrowRight" size={16} /> Send counter-offer</button>
                        <button type="button" className="n2-btn ghost full" onClick={() => setCounter(false)}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="n2-decide-hd"><Icon name="scale" size={16} /><span>Your decision</span></div>
                      <div className="n2-tally">
                        <div className="n2-tally-row attn"><span className="n2-tally-n">{totAttn}</span><span>need your decision</span></div>
                        <div className="n2-tally-row ok"><span className="n2-tally-n">{totOk}</span><span>within range / pricing</span></div>
                        {offerChanges > 0 && <div className="n2-tally-row offers"><span className="n2-tally-n">{offerChanges}</span><span>offer{offerChanges !== 1 ? "s" : ""} added / removed</span></div>}
                        <div className="n2-tally-row kept"><span className="n2-tally-n">{totKept}</span><span>unchanged</span></div>
                      </div>
                      <div className="n2-tally-note"><Icon name="layers" size={13} /> {`Across ${includedIds.length} offer${includedIds.length !== 1 ? "s" : ""}`}</div>
                      <div className="n2-actions">
                        <button type="button" className="n2-btn primary full" onClick={() => decide("accepted")}><Icon name="check" size={16} /> Accept all</button>
                        <button type="button" className="n2-btn ghost full" onClick={() => setCounter(true)}><Icon name="pen" size={16} /> Counter-offer</button>
                        <button type="button" className="n2-btn danger full" onClick={() => decide("declined")}><Icon name="x" size={16} /> Decline</button>
                      </div>
                    </>
                  )}
                </div>
              </aside>

              {/* CONTENT COLUMN */}
              <div className="n2-stream">
                {counter && <div className="n2-mode"><Icon name="pen" size={15} /><span><b>Counter-offer mode.</b> Each offer below is negotiated independently — the values you set on one don't affect the others.</span></div>}

                {models.map((m) => (
                  <OfferPanel key={m.offer.id} model={m} added={m.offer.id !== REQUESTED_ID} counter={counter}
                    counters={counters[m.offer.id] || {}} setCounter={(fid, v) => setCounterVal(m.offer.id, fid, v)}
                    onRemove={() => removeOffer(m.offer.id)} />
                ))}

                {removedRequested && <div className="n2-removed"><Icon name="trash" size={14} /><span>You removed the originally requested offer <b>{OFFER.name}</b>.</span><button type="button" className="n2-reset" onClick={restoreRequested}>Undo</button></div>}
                {models.length === 0 && !removedRequested && <div className="n2-removed"><Icon name="danger" size={14} /><span>No offers in this negotiation. Add at least one before sending.</span></div>}

                {/* ADD OFFER */}
                <section className="n2-addsec">
                  {!addOpen ? (
                    <button type="button" className="n2-add-toggle" onClick={() => setAddOpen(true)}><Icon name="plus" size={15} /> Propose another of your offers</button>
                  ) : (
                    <div className="n2-picker">
                      <div className="n2-picker-hd"><span>Propose another offer — it comes in with its own terms &amp; pricing</span><button type="button" className="n2-picker-x" onClick={() => { setAddOpen(false); setSearch(""); }} aria-label="Close"><Icon name="x" size={16} /></button></div>
                      <div className="n2-search"><Icon name="search" size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your offers…" /></div>
                      <div className="n2-cands">
                        {candidates.length === 0 ? <div className="n2-cands-empty">No matching offers.</div> : candidates.map((o) => (
                          <div className="n2-cand" key={o.id}><MonoFor offer={o} size={38} /><div className="n2-cand-main"><div className="n2-cand-name">{o.name}</div><div className="n2-cand-desc">{o.desc}</div><div className="n2-op-meta">{o.kind} · {o.resources} resource{o.resources !== 1 ? "s" : ""}</div></div><button type="button" className="n2-cand-add" onClick={() => addOffer(o.id)}><Icon name="plus" size={14} /> Add</button></div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
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

ReactDOM.createRoot(document.getElementById("root")).render(<Negotiation2App />);
})();
