// VisionsTrust — Offer settings page. Provider configures offer terms (rows 27–82),
// organised by category, each term Fixed/Negotiable with dataspace defaults and contract-agent ranges.
(function () {
const { useState, useEffect, useMemo, useRef } = React;
const { Icon } = window.UI;
const { AppLayout } = window.VTLayout;
const { SECTIONS, ALL_FIELDS, PD, SERVICE_OFFERS, PERSONAL_DATA_DEFAULT } = window.OfferSettingsData;
const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle } = window;

const LS_KEY = "vt.offerSettings3.check_free_offer";

// Category rail definition (order + grouping shown to the user)
const CATS = [
  { group: "General", items: [
    { id: "overview", name: "Overview", icon: "list" },
  ]},
  { group: "Offer", items: [
    { id: "content", name: "Offer content", icon: "database" },
    { id: "pricing", name: "Pricing", icon: "coin" },
    { id: "policies", name: "Usage policies", icon: "shield" },
    { id: "personal", name: "Personal data", icon: "lock" },
  ]},
  { group: "Terms & conditions", items: [
    { id: "sla", name: "Service levels", icon: "clock", section: "sla" },
    { id: "penalties", name: "Commitments & penalties", icon: "shield", section: "penalties" },
    { id: "duration", name: "Duration & renewal", icon: "hourglass", section: "duration" },
    { id: "termination", name: "Termination", icon: "danger", section: "termination" },
  ]},
  { group: "Negotiation", items: [
    { id: "negotiation", name: "Auto-accept & agent", icon: "triggers" },
  ]},
  { group: "Matching", items: [
    { id: "matching", name: "Project matchings", icon: "grid" },
  ]},
  { group: "Indicators", items: [
    { id: "business-ind", name: "Business indicators", icon: "chart" },
    { id: "technical-ind", name: "Technical indicators", icon: "sliders" },
  ]},
];
// Auto-accept only exists on the terms the dataspace lets a taker move. Every other
// field is fixed once the provider has set it — no per-field toggle is shown.
const AUTO_ACCEPT_IDS = new Set(["contract_duration", "renewal_mode", "notice_nonrenewal", "reversibility", "subcontracting", "security_incident", "ip_outputs", "audit_right", "confidentiality"]);
const canNeg = (field) => AUTO_ACCEPT_IDS.has(field.id);
// The two dates behind the Time Period usage policy — the only policy values a taker can ask to move.
const TP_DATES = [
  { k: "start", t: "Time period: Start date", d: "Beginning of the authorised period of use.", lim: "no earlier than" },
  { k: "end", t: "Time period: End date", d: "End of the authorised period of use.", lim: "no later than" },
];

const READONLY_CATS = ["matching", "business-ind", "technical-ind"];
const FLAT_CATS = CATS.flatMap((g) => g.items);

// ─── VALUE HELPERS ──────────────────────────────────────────────────────────
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const isEmpty = (v) => v === "" || v == null || (Array.isArray(v) && v.length === 0);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

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

// ─── BASELINES (dataspace vs. the provider's own saved preferences) ──────────
// Two sources fill an offer's terms without typing each value. "Dataspace" = the
// schema defaults the space recommends. "My baseline" = the provider's saved
// preferences (stricter SLA, own pricing) reused across their offers. Every value
// stays editable after adoption. This replaces both the old "Dataspace baseline"
// cards and the AI auto-complete bar (one entry point, two explicit sources).
const MY_TERM_BASELINE = {
  delivery_deadline: { n: 3, u: "business days" },
  availability: "99.9%",
  update_frequency: "Daily",
  response_time: { n: 300, u: "ms", b: "p95" },
  retention_period: "Contract duration",
  support_channels: ["Email", "Ticketing portal", "Chat"],
  support_hours: "Extended 5×12",
  support_severity: { Critical: { n: 2, u: "h" }, High: { n: 4, u: "h" }, Medium: { n: 1, u: "business days" }, Low: { n: 3, u: "business days" } },
  contract_duration: { n: 24, u: "months" },
  renewal_mode: "Automatic renewal",
  notice_nonrenewal: { n: 90, u: "days" },
  term_convenience: "Yes",
  notice_early: { n: 60, u: "days" },
};
const MY_PRICING_BASELINE = { sub: "200", billing: "Monthly", setup: "0", api: "0", currency: "EUR" };
const DS_PRICING_BASELINE = { sub: "0", billing: "One shot", setup: "60", api: "0", currency: "EUR" };
const MY_POLICY_BASELINE = { no_restriction: false, time_period: true, count: false, notification: true };
const DS_POLICY_BASELINE = { no_restriction: false, time_period: true, count: true, notification: false };

const BASELINE_SOURCES = [
  { id: "dataspace", label: "Dataspace baseline", icon: "layers", tag: "recommended", desc: "The values the dataspace recommends — aligned with what other participants expect, so deals close with less back-and-forth." },
  { id: "mine", label: "My baseline", icon: "user", tag: "your defaults", desc: "Your own saved preferences from your provider profile, reused across every offer you publish." },
];

// Resolve every schema field to its baseline value for a source.
function baselineValues(source) {
  const vals = {};
  ALL_FIELDS.forEach((f) => { vals[f.id] = clone(f.def); });
  if (source === "mine") Object.entries(MY_TERM_BASELINE).forEach(([k, v]) => { if (k in vals) vals[k] = clone(v); });
  return vals;
}
const baselinePricing = (source) => ({ ...(source === "mine" ? MY_PRICING_BASELINE : DS_PRICING_BASELINE) });
const baselinePolicies = (source) => ({ ...(source === "mine" ? MY_POLICY_BASELINE : DS_POLICY_BASELINE) });

const BASELINE_SECTION_IDS = ["content", "pricing", "policies", "personal", "sla", "penalties", "duration", "termination"];
const sectionFieldsById = (secId) => { const s = SECTIONS.find((x) => x.id === secId); if (!s) return []; return s.fields || (s.groups || []).flatMap((g) => g.fields); };

// Apply a baseline source to the mutable draft, scoped to one section or "all".
function applyBaseline(d, source, scope) {
  const vals = baselineValues(source);
  const doSection = (secId) => {
    if (secId === "content") return;
    if (secId === "pricing") { d.pricing = { ...d.pricing, ...baselinePricing(source) }; return; }
    if (secId === "policies") { d.policies = baselinePolicies(source); return; }
    if (secId === "personal") { d.personalData.retention = source === "mine" ? "Contract duration" : "1 year"; d.personalData.toms = ["Encryption at rest", "Encryption in transit", "Access control (RBAC)", "Audit logging"]; return; }
    const s = SECTIONS.find((x) => x.id === secId); if (!s) return;
    if (s.repeatable) { const r0 = {}; s.fields.forEach((f) => { r0[f.id] = clone(f.def); }); d.rules = [{ _id: (d.rules[0] && d.rules[0]._id) || "r1", ...r0 }]; return; }
    sectionFieldsById(secId).forEach((f) => { if (!isEmpty(vals[f.id])) d.values[f.id] = clone(vals[f.id]); });
  };
  if (scope === "all") ["pricing", "policies", "personal", "sla", "penalties", "duration", "termination"].forEach(doSection);
  else doSection(scope);
}

// Human-readable preview of what a baseline would apply (for the hover preview).
function baselinePreview(source, scope) {
  const vals = baselineValues(source);
  const rowsFor = (secId) => {
    if (secId === "content") return [];
    if (secId === "pricing") { const p = baselinePricing(source); return [["Subscription", `${p.sub} ${p.currency} · ${p.billing}`], ["Setup fee", `${p.setup} ${p.currency}`]]; }
    if (secId === "policies") { const pol = baselinePolicies(source); const on = Object.keys(pol).filter((k) => pol[k]); const POL = { no_restriction: "No Restriction", time_period: "Time Period", count: "Count", notification: "Notification" }; return [["Policies", on.map((k) => POL[k]).join(", ") || "None"]]; }
    if (secId === "personal") return [["Retention", source === "mine" ? "Contract duration" : "1 year"], ["Security measures", "Encryption + RBAC + audit log"]];
    if (secId === "penalties") { const s = SECTIONS.find((x) => x.id === "penalties"); return [["Rule", `${s.fields[0].def} → ${s.fields[2].def}`]]; }
    return sectionFieldsById(secId).filter((f) => !isEmpty(vals[f.id]) && f.type !== "textarea").map((f) => [f.label, fmtVal(f, vals[f.id])]);
  };
  if (scope !== "all") return { flat: rowsFor(scope) };
  const SEC_NAMES = { pricing: "Pricing", policies: "Usage policies", personal: "Personal data", sla: "Service levels", penalties: "Commitments & penalties", duration: "Duration & renewal", termination: "Termination" };
  return { grouped: ["pricing", "policies", "sla", "penalties", "duration", "termination"].map((id) => ({ id, name: SEC_NAMES[id], rows: rowsFor(id) })).filter((g) => g.rows.length) };
}

// ─── SEED / LOAD STATE ───────────────────────────────────────────────────────
function seed() {
  const values = {}, neg = {}, accept = {}, notes = {};
  ALL_FIELDS.forEach((f) => { values[f.id] = clone(f.def); neg[f.id] = !!f.neg; accept[f.id] = clone(f.accept || null); notes[f.id] = ""; });
  const penSec = SECTIONS.find((s) => s.id === "penalties");
  const rule0 = {}; penSec.fields.forEach((f) => { rule0[f.id] = clone(f.def); });
  return {
    values, neg, accept, notes,
    personalData: clone(PERSONAL_DATA_DEFAULT),
    rules: [{ _id: "r1", ...rule0 }],
    penaltyNote: "",
    policies: { time_period: true, count: true },
    policyNeg: {},
    policyNotes: {},
    policyDates: { start: "2026-01-15", end: "2026-12-31" },
    policyAccept: {},
    pricing: { sub: "0", billing: "One shot", setup: "60", api: "0", currency: "EUR", desc: "" },
    pricingNeg: {},
    pricingAccept: {},
    pricingNotes: {},
    pricingMode: "packages",
    packages: [
      { _id: "pk1", name: "Starter", calls: "10000", price: "90", setupOn: false, setup: "", desc: "For pilots and integration tests.", recommended: false, neg: false, accept: {}, note: "", polOn: true, policies: { time_period: true, count: true } },
      { _id: "pk2", name: "Growth", calls: "50000", price: "350", setupOn: true, setup: "250", desc: "Production usage, one integration.", recommended: true, neg: true, accept: { min: 300, max: 350 }, note: "", polOn: false, policies: {} },
      { _id: "pk3", name: "Scale", calls: "250000", price: "1400", setupOn: true, setup: "500", desc: "High volume, multi-service integration.", recommended: false, neg: true, accept: { min: 1200, max: 1400 }, note: "", polOn: true, policies: { no_restriction: true, notification: true } },
    ],
    autoAgent: true,
    agentNote: "I accept faster delivery and shorter notice periods. I will not go below 99% availability or accept unlimited liability.",
    baselineMode: "auto",
  };
}
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return { ...seed(), ...JSON.parse(raw) }; } catch (e) {}
  return seed();
}

// ─── SMALL INPUTS ─────────────────────────────────────────────────────────
const Sel = ({ value, onChange, options, width, full }) => (
  <span className="os-selectw" style={full ? { width: "100%" } : width ? { width } : undefined}>
    <select className="os-in" value={value} onChange={(e) => onChange(e.target.value)} style={full || width ? { width: "100%" } : undefined}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <Icon name="chevronDown" size={13} className="os-chev" />
  </span>
);
const Num = ({ value, onChange }) => (
  <input type="number" className="os-in num" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
);

// ─── VALUE + ACCEPT CONTROLS ─────────────────────────────────────────────────
function ValueControl({ field, value, onChange }) {
  switch (field.type) {
    case "text": return <input className="os-in sm" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "textarea": return <textarea className="os-ta" value={value || ""} placeholder={field.optional ? "Optional…" : ""} onChange={(e) => onChange(e.target.value)} />;
    case "date": return <input type="date" className="os-in" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "yesno": return <div className="seg2 mini">{["Yes", "No"].map((o) => <button key={o} type="button" className={value === o ? "active" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>;
    case "select": return <Sel value={value} onChange={onChange} options={field.options} />;
    case "numberUnit": return (<><Num value={value?.n} onChange={(n) => onChange({ ...value, n })} /><Sel value={value?.u} onChange={(u) => onChange({ ...value, u })} options={field.units} />{field.basis && <Sel value={value?.b} onChange={(b) => onChange({ ...value, b })} options={field.basis} />}</>);
    case "multiselect": return (<div className="os-chips">{field.options.map((o) => { const on = (value || []).includes(o); return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])}>{o}</button>; })}</div>);
    case "opValue": return (<><Sel value={value?.op} onChange={(op) => onChange({ ...value, op })} options={field.operators} width={120} /><input className="os-in sm" value={value?.v || ""} onChange={(e) => onChange({ ...value, v: e.target.value })} /></>);
    case "procDeadline": { const showDays = !/Immediate/.test(value?.p || ""); return (<><Sel value={value?.p} onChange={(p) => onChange({ ...value, p })} options={field.options} width={170} />{showDays && <><Num value={value?.d} onChange={(d) => onChange({ ...value, d })} /><span className="os-unit">days</span></>}</>); }
    case "matrix": return (<div className="os-matrix">{field.rows.map((r) => (<div className="mrow" key={r}><span className="mkey"><span className={`os-sev-dot os-sev-${r}`} />{r}</span><span className="mval"><Num value={value?.[r]?.n} onChange={(n) => onChange({ ...value, [r]: { ...value[r], n } })} /><Sel value={value?.[r]?.u} onChange={(u) => onChange({ ...value, [r]: { ...value[r], u } })} options={field.units} /></span></div>))}</div>);
    default: return null;
  }
}
function AcceptControl({ field, accept, onChange }) {
  switch (field.type) {
    case "numberUnit": return (<span className="os-range"><Num value={accept?.min} onChange={(min) => onChange({ ...accept, min })} /><span className="dash">to</span><Num value={accept?.max} onChange={(max) => onChange({ ...accept, max })} /><span className="os-unit">{field.units[0]}</span></span>);
    case "select": case "multiselect": case "yesno": {
      const opts = field.type === "yesno" ? ["Yes", "No"] : field.options; const set = accept || [];
      return (<div className="os-chips" style={{ justifyContent: "flex-start" }}>{opts.map((o) => { const on = set.includes(o); return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? set.filter((x) => x !== o) : [...set, o])}>{o}</button>; })}</div>);
    }
    default: return <span className="os-unit">Guided by the note below.</span>;
  }
}

// ─── LIGHT FIELD ROW ──────────────────────────────────────────────────────────
function FieldRow({ field, st, set }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const value = st.values[field.id];
  const negotiable = st.neg[field.id];
  const canNegotiate = canNeg(field);
  const hasNote = !!st.notes[field.id];
  const full = field.type === "textarea" || field.type === "matrix" || field.type === "multiselect";
  const hasDefault = !isEmpty(field.def);
  const matches = hasDefault && eq(value, field.def);

  if (full) {
    return (
      <div className="osf-full">
        <div className="osf-field"><span className="osf-name">{field.label}</span><span className="osf-info" title={field.meaning}><Icon name="info" size={13} /></span>
          {canNegotiate && <button type="button" className={`osf-negbtn ${negotiable ? "on" : ""}`} style={{ marginLeft: "auto" }} onClick={() => set((s) => { s.neg[field.id] = !s.neg[field.id]; })} aria-pressed={negotiable}><span className="mini-toggle"><i /></span>Auto-accept</button>}
        </div>
        <ValueControl field={field} value={value} onChange={(v) => set((s) => { s.values[field.id] = v; })} />
        {hasDefault && !matches && <div style={{ marginTop: 6 }} className="osf-default"><span>Default:</span><span className="dv">{fmtVal(field, field.def)}</span><button type="button" className="os-apply" onClick={() => set((s) => { s.values[field.id] = clone(field.def); })}>Apply</button></div>}
        {negotiable && canNegotiate && <NegStrip field={field} st={st} set={set} noteOpen={noteOpen || hasNote} setNoteOpen={setNoteOpen} />}
      </div>
    );
  }

  return (
    <div className="osf-row">
      <div className="osf-line">
        <div className="osf-field"><span className="osf-name">{field.label}</span><span className="osf-info" title={field.meaning}><Icon name="info" size={13} /></span></div>
        <div className="osf-controls">
          <div className="osf-val"><ValueControl field={field} value={value} onChange={(v) => set((s) => { s.values[field.id] = v; })} /></div>
          {canNegotiate && <button type="button" className={`osf-negbtn ${negotiable ? "on" : ""}`} onClick={() => set((s) => { s.neg[field.id] = !s.neg[field.id]; })} aria-pressed={negotiable}><span className="mini-toggle"><i /></span>Auto-accept</button>}
        </div>
        {hasDefault && (matches
          ? <div className="osf-default match"><Icon name="check" size={12} /> Default</div>
          : <div className="osf-default"><span>Default:</span><span className="dv">{fmtVal(field, field.def)}</span><button type="button" className="os-apply" onClick={() => set((s) => { s.values[field.id] = clone(field.def); })}>Apply</button></div>)}
      </div>
      {negotiable && canNegotiate && <NegStrip field={field} st={st} set={set} noteOpen={noteOpen || hasNote} setNoteOpen={setNoteOpen} />}
    </div>
  );
}

// Reusable auto-accept strip for non-schema fields (pricing amounts, usage policies).
// autoAgent → shows "Agent auto-accepts" with an optional accept control (acceptEl); a
// collapsible note lets the provider spell out their stance, exactly like the T&C strip.
function MiniNegStrip({ autoAgent, acceptEl, note, onNote }) {
  const [noteOpen, setNoteOpen] = useState(!!note);
  return (
    <div className="osf-strip" style={{ marginTop: 10, marginBottom: 0 }}>
      <div className="osf-strip-line">
        {autoAgent
          ? <><span className="osf-strip-label"><Icon name="ai" size={12} /> Acceptance range</span>{acceptEl || <span className="os-unit">Guided by the note below.</span>}</>
          : <span className="osf-strip-label"><Icon name="triggers" size={12} /> Auto-accept is off globally — you review each request</span>}
        <button type="button" className="osf-note-toggle" onClick={() => setNoteOpen((o) => !o)}><Icon name={noteOpen ? "chevronUp" : "plus"} size={12} /> {noteOpen ? "Hide note" : "Note"}</button>
      </div>
      {noteOpen && <textarea className="os-ta" placeholder="What you will and won't auto-accept for this term…" value={note} onChange={(e) => onNote(e.target.value)} />}
    </div>
  );
}

function NegStrip({ field, st, set, noteOpen, setNoteOpen }) {
  return (
    <div className="osf-strip">
      <div className="osf-strip-line">
        {st.autoAgent
          ? <><span className="osf-strip-label"><Icon name="ai" size={12} /> Acceptance range</span><AcceptControl field={field} accept={st.accept[field.id]} onChange={(a) => set((s) => { s.accept[field.id] = a; })} /></>
          : <span className="osf-strip-label"><Icon name="triggers" size={12} /> Auto-accept is off globally — you review each request</span>}
        <button type="button" className="osf-note-toggle" onClick={() => setNoteOpen((o) => !o)}><Icon name={noteOpen ? "chevronUp" : "plus"} size={12} /> {noteOpen ? "Hide note" : "Note"}</button>
      </div>
      {noteOpen && <textarea className="os-ta" placeholder="What you will and won't auto-accept for this term…" value={st.notes[field.id]} onChange={(e) => set((s) => { s.notes[field.id] = e.target.value; })} />}
    </div>
  );
}

// One-line summary of what the agent will auto-accept for a negotiable term.
function acceptSummary(field, accept) {
  if (!accept) return null;
  if (field.type === "numberUnit") {
    if (isEmpty(accept.min) && isEmpty(accept.max)) return null;
    return `Accepts ${isEmpty(accept.min) ? "…" : accept.min}–${isEmpty(accept.max) ? "…" : accept.max} ${field.units[0]}`;
  }
  if (Array.isArray(accept) && accept.length) return `Accepts ${accept.join(", ")}`;
  return null;
}

// ─── TERM ROW (summary-first, expand to edit) ────────────────────────────────
// Collapsed: label · current value · Fixed/Negotiable state. Expanded: full editor.
function TermRow({ field, st, set }) {
  const [open, setOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const value = st.values[field.id];
  const negotiable = st.neg[field.id];
  const canNegotiate = canNeg(field);
  const hasDefault = !isEmpty(field.def);
  const matches = hasDefault && eq(value, field.def);
  const accSum = negotiable && canNegotiate && st.autoAgent ? acceptSummary(field, st.accept[field.id]) : null;

  return (
    <div className={`trow ${open ? "open" : ""}`}>
      <button type="button" className="trow-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="trow-name">{field.label}<span className="trow-info" title={field.meaning}><Icon name="info" size={12} /></span></span>
        <span className="trow-val">{fmtVal(field, value)}</span>
        <span className={`trow-state ${canNegotiate && negotiable ? "neg" : "fixed"}`}>{canNegotiate && negotiable ? <><Icon name="triggers" size={10} /> Auto-accept</> : "Fixed"}</span>
        <Icon name="chevronDown" size={16} className="trow-chev" />
      </button>
      {!open && (accSum || (hasDefault && matches)) && (
        <div className="trow-meta">
          {hasDefault && matches && <span className="trow-default"><Icon name="check" size={11} /> Dataspace default</span>}
          {accSum && <span className="trow-accept"><Icon name="ai" size={11} /> {accSum}</span>}
        </div>
      )}
      {open && (
        <div className="trow-body">
          <div className="trow-edit">
            <span className="trow-edit-label">Value</span>
            <div className="trow-edit-ctrl"><ValueControl field={field} value={value} onChange={(v) => set((s) => { s.values[field.id] = v; })} /></div>
          </div>
          {hasDefault && (matches
            ? <div className="trow-defrow match"><Icon name="check" size={12} /> Matches the dataspace default</div>
            : <div className="trow-defrow"><span>Dataspace default:</span> <b>{fmtVal(field, field.def)}</b> <button type="button" className="os-apply" onClick={() => set((s) => { s.values[field.id] = clone(field.def); })}>Apply</button></div>)}
          {canNegotiate && (
            <div className="trow-negrow">
              <button type="button" className={`osf-negbtn ${negotiable ? "on" : ""}`} onClick={() => set((s) => { s.neg[field.id] = !s.neg[field.id]; })} aria-pressed={negotiable}><span className="mini-toggle"><i /></span>Auto-accept</button>
              <span className="trow-neghint">{negotiable ? "The contract agent accepts any request inside the range below, without asking you." : "Fixed — every taker gets exactly this value, no request accepted."}</span>
            </div>
          )}
          {negotiable && canNegotiate && <NegStrip field={field} st={st} set={set} noteOpen={noteOpen || !!st.notes[field.id]} setNoteOpen={setNoteOpen} />}
        </div>
      )}
    </div>
  );
}

// ─── ACTION EXPLAINERS ───────────────────────────────────────────────────────
const sectionFields = (section) => section.fields || (section.groups || []).flatMap((g) => g.fields);

// Coerce a raw AI-proposed value onto a field's expected shape (defensive).
function coerceValue(field, raw) {
  const inOpts = (v, opts) => Array.isArray(opts) && opts.includes(v);
  switch (field.type) {
    case "text": case "textarea": return typeof raw === "string" ? raw : (raw == null ? undefined : String(raw));
    case "date": return typeof raw === "string" && raw ? raw : undefined;
    case "yesno": return raw === "Yes" || raw === "No" ? raw : undefined;
    case "select": return inOpts(raw, field.options) ? raw : undefined;
    case "multiselect": return Array.isArray(raw) ? raw.filter((x) => inOpts(x, field.options)) : undefined;
    case "numberUnit": {
      if (raw && typeof raw === "object") { const n = Number(raw.n); const o = { n: isNaN(n) ? (field.def && field.def.n) : n, u: inOpts(raw.u, field.units) ? raw.u : field.units[0] }; if (field.basis) o.b = inOpts(raw.b, field.basis) ? raw.b : (field.def && field.def.b); return o; }
      return undefined;
    }
    case "opValue": return raw && typeof raw === "object" ? { op: inOpts(raw.op, field.operators) ? raw.op : field.def.op, v: String(raw.v == null ? field.def.v : raw.v) } : undefined;
    case "procDeadline": return raw && typeof raw === "object" ? { p: inOpts(raw.p, field.options) ? raw.p : field.def.p, d: Number(raw.d) || field.def.d } : undefined;
    case "matrix": {
      if (raw && typeof raw === "object") { const o = {}; field.rows.forEach((r) => { const c = raw[r] || {}; o[r] = { n: Number(c.n) || field.def[r].n, u: inOpts(c.u, field.units) ? c.u : field.def[r].u }; }); return o; }
      return undefined;
    }
    default: return undefined;
  }
}

// Live "dataspace baseline" card — explains what the baseline is, shows how much of
// the section already matches it, and lets the provider adopt it or review what differs.
function DataspaceBaselineCard({ section, st, set, onAdopt }) {
  const [why, setWhy] = useState(false);
  const [diff, setDiff] = useState(false);

  if (section.repeatable) {
    return (
      <div className="os-ds-card">
        <div className="os-ds-row">
          <div className="os-ds-ic"><Icon name="layers" size={20} /></div>
          <div className="os-ds-main">
            <div className="os-ds-title">Dataspace baseline <span className="os-ds-tag">recommended</span></div>
            <p className="os-ds-desc">The dataspace publishes a ready-to-use penalty rule aligned with what other participants expect. Start from it and adjust only what you need.</p>
          </div>
          <button type="button" className="os-ds-btn" onClick={onAdopt}><Icon name="download" size={15} /> Reset to baseline rule</button>
        </div>
      </div>
    );
  }

  const fields = sectionFields(section).filter((f) => !isEmpty(f.def));
  const aligned = fields.filter((f) => eq(st.values[f.id], f.def));
  const customised = fields.filter((f) => !isEmpty(st.values[f.id]) && !eq(st.values[f.id], f.def));
  const empty = fields.filter((f) => isEmpty(st.values[f.id]));
  const pct = fields.length ? Math.round((aligned.length / fields.length) * 100) : 0;
  const fullyAligned = aligned.length === fields.length;

  return (
    <div className="os-ds-card">
      <div className="os-ds-row">
        <div className="os-ds-ic"><Icon name="layers" size={20} /></div>
        <div className="os-ds-main">
          <div className="os-ds-title">Dataspace baseline <span className="os-ds-tag">recommended</span></div>
          <p className="os-ds-desc">A negotiation-ready set of values the dataspace recommends for these terms — already aligned with what other participants expect. Adopt it to publish faster, with far less back-and-forth. Every value stays fully editable.</p>
          <button type="button" className="os-ds-why" onClick={() => setWhy((w) => !w)}><Icon name={why ? "chevronUp" : "info"} size={13} /> {why ? "Hide" : "Why adopt the baseline?"}</button>
          {why && (
            <ul className="os-ds-why-list">
              <li><b>Interoperability</b> — your offer speaks the same terms as the rest of the dataspace, so it plugs into projects without friction.</li>
              <li><b>Faster deals</b> — takers rarely contest values that match the norm, so the contract agent settles them automatically.</li>
              <li><b>Always current</b> — terms you leave on the baseline track future updates the dataspace publishes; customised ones stay frozen as you set them.</li>
            </ul>
          )}
        </div>
        <div className="os-ds-act">
          <div className={`os-ds-meter ${fullyAligned ? "done" : ""}`}>
            <div className="os-ds-meter-top"><span>{aligned.length}/{fields.length} on baseline</span><b>{pct}%</b></div>
            <div className="os-ds-meter-bar"><i style={{ width: pct + "%" }} /></div>
          </div>
          {fullyAligned
            ? <div className="os-ds-aligned"><Icon name="check" size={15} /> Fully aligned</div>
            : <button type="button" className="os-ds-btn" onClick={onAdopt}><Icon name="download" size={15} /> Adopt baseline{empty.length ? ` · fill ${empty.length}` : ""}</button>}
        </div>
      </div>

      {(customised.length > 0 || empty.length > 0) && (
        <div className="os-ds-foot">
          <div className="os-ds-chips">
            {aligned.length > 0 && <span className="os-ds-chip ok"><i /> {aligned.length} on baseline</span>}
            {customised.length > 0 && <span className="os-ds-chip cus"><i /> {customised.length} customised</span>}
            {empty.length > 0 && <span className="os-ds-chip emp"><i /> {empty.length} not set</span>}
          </div>
          {(customised.length > 0 || empty.length > 0) && <button type="button" className="os-ds-more" onClick={() => setDiff((d) => !d)}><Icon name={diff ? "chevronUp" : "chevronDown"} size={13} /> {diff ? "Hide" : "Review differences"}</button>}
        </div>
      )}

      {diff && (
        <div className="os-ds-diff">
          {customised.map((f) => (
            <div className="os-diff-row" key={f.id}>
              <span className="os-diff-name">{f.label}</span>
              <span className="os-diff-vals"><span className="cur">{fmtVal(f, st.values[f.id])}</span><Icon name="arrowRight" size={12} /><span className="base">{fmtVal(f, f.def)}</span></span>
              <button type="button" className="os-diff-btn" onClick={() => set((s) => { s.values[f.id] = clone(f.def); })}>Revert</button>
            </div>
          ))}
          {empty.map((f) => (
            <div className="os-diff-row" key={f.id}>
              <span className="os-diff-name">{f.label}</span>
              <span className="os-diff-vals"><span className="cur empty">Not set</span><Icon name="arrowRight" size={12} /><span className="base">{fmtVal(f, f.def)}</span></span>
              <button type="button" className="os-diff-btn" onClick={() => set((s) => { s.values[f.id] = clone(f.def); })}>Apply</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// AI auto-complete bar — proposes consistent values for a whole section, flags
// redundancy, and can be undone in one click.
function AiFillBar({ section, st, set }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const snap = useRef(null);
  const target = section.repeatable ? "rule" : "values";

  const run = async () => {
    if (busy) return;
    setBusy(true); setErr(null); setResult(null);
    const fields = sectionFields(section);
    const schema = fields.map((f) => ({ id: f.id, label: f.label, type: f.type, meaning: f.meaning, options: f.options || (f.type === "yesno" ? ["Yes", "No"] : undefined), units: f.units, basis: f.basis, rows: f.rows, operators: f.operators, default: f.def, current: target === "rule" ? (st.rules[0] || {})[f.id] : st.values[f.id] }));
    const sys = `You complete contractual terms for a European data-space offer. Return ONLY a JSON object mapping field id to a value — no prose, no markdown. Value shape by type: text/textarea/date → string; select → exactly one of options; yesno → "Yes"/"No"; multiselect → array of options; numberUnit → {"n":number,"u":one of units,"b":one of basis if present}; opValue → {"op":one of operators,"v":string}; procDeadline → {"p":one of options,"d":number}; matrix → object mapping each row to {"n":number,"u":one of units}. Prefer the given default when sensible. Fill empty fields with realistic, mutually consistent values. Avoid redundancy: do NOT restate in note/textarea fields anything already captured by structured fields — keep such notes to genuinely non-standard cases, else "".`;
    const user = `Offer "check_free_offer". Section: ${section.title}.\nFields:\n${JSON.stringify(schema)}\nReturn the completed JSON now.`;
    try {
      const reply = await window.claude.complete({ system: sys, messages: [{ role: "user", content: user }], max_tokens: 1000 });
      const json = JSON.parse(reply.slice(reply.indexOf("{"), reply.lastIndexOf("}") + 1));
      snap.current = target === "rule" ? clone(st.rules) : clone(st.values);
      let filled = 0, changed = 0;
      set((s) => {
        fields.forEach((f) => {
          if (!(f.id in json)) return;
          const v = coerceValue(f, json[f.id]);
          if (v === undefined) return;
          const prev = target === "rule" ? (s.rules[0] || {})[f.id] : s.values[f.id];
          const wasEmpty = isEmpty(prev);
          if (target === "rule") { if (s.rules[0]) s.rules[0][f.id] = v; } else s.values[f.id] = v;
          if (!eq(prev, v)) { changed++; if (wasEmpty) filled++; }
        });
      });
      setResult({ changed, filled });
    } catch (e) { setErr("Couldn’t auto-complete just now. Please try again."); }
    finally { setBusy(false); }
  };
  const undo = () => { if (!snap.current) return; set((s) => { if (target === "rule") s.rules = snap.current; else s.values = snap.current; }); snap.current = null; setResult(null); };

  return (
    <div className="os-ai-bar">
      <div className="os-ai-ic"><Icon name="sparkle" size={16} /></div>
      <div className="os-ai-main">
        <div className="os-ai-t">Auto-complete with the assistant</div>
        <div className="os-ai-d">{busy ? "Proposing consistent values for this section…" : result ? <>Updated {result.changed} term{result.changed !== 1 ? "s" : ""}{result.filled ? ` · filled ${result.filled} empty` : ""}. Redundant notes were kept clear. <button type="button" className="os-ai-undo" onClick={undo}>Undo</button></> : err ? <span className="os-ai-err">{err}</span> : "The assistant fills empty terms with realistic, consistent values and avoids restating what other fields already say."}</div>
      </div>
      <button type="button" className="os-ai-btn" onClick={run} disabled={busy}>{busy ? <span className="la-typing" style={{ padding: 0 }}><i /><i /><i /></span> : <><Icon name="sparkle" size={14} /> {result ? "Redo" : "Auto-complete"}</>}</button>
    </div>
  );
}

// Small inline explainer card (what an action does + why it matters).
function ActionExplain({ icon, title, children }) {
  return (
    <div className="os-explain">
      <span className="os-explain-ic"><Icon name={icon} size={16} /></span>
      <div><div className="os-explain-t">{title}</div><p className="os-explain-d">{children}</p></div>
    </div>
  );
}

// ─── SEGMENTED SELECT + DIRECT-EDIT FIELD VALUE (fewer clicks than dropdowns) ───
const SegSelect = ({ value, options, onChange }) => (
  <div className="fc-seg">{options.map((o) => <button key={o} type="button" className={value === o ? "on" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>
);
const isFull = (f) => ["textarea", "matrix", "multiselect"].includes(f.type) || (f.type === "select" && (f.options || []).length > 4);
function FieldValue({ field, value, onChange }) {
  if (field.type === "select") return <SegSelect value={value} options={field.options} onChange={onChange} />;
  return <ValueControl field={field} value={value} onChange={onChange} />;
}

// Collapsible acceptance range — becomes editable once a term is Negotiable.
function AcceptDisclosure({ field, st, set }) {
  const [open, setOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(!!st.notes[field.id]);
  const summary = st.autoAgent ? acceptSummary(field, st.accept[field.id]) : null;
  return (
    <div className="fc-accept">
      <button type="button" className="fc-accept-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={13} />
        <span className="fc-accept-t"><Icon name="triggers" size={11} /> Acceptance range</span>
        {!open && <span className={`fc-accept-sum ${summary ? "" : "muted"}`}>{summary || "set what the agent may auto-accept"}</span>}
      </button>
      {open && (
        <div className="fc-accept-body">
          {st.autoAgent
            ? <div className="fc-accept-row"><span className="fc-accept-label"><Icon name="ai" size={12} /> Agent auto-accepts</span><AcceptControl field={field} accept={st.accept[field.id]} onChange={(a) => set((s) => { s.accept[field.id] = a; })} /></div>
            : <div className="fc-accept-open"><Icon name="triggers" size={12} /> Open to negotiation — you review each request.</div>}
          <button type="button" className="osf-note-toggle" onClick={() => setNoteOpen((o) => !o)}><Icon name={noteOpen ? "chevronUp" : "plus"} size={12} /> {noteOpen ? "Hide note" : "Add a note"}</button>
          {noteOpen && <textarea className="os-ta" placeholder="What you will and won't auto-accept for this term…" value={st.notes[field.id]} onChange={(e) => set((s) => { s.notes[field.id] = e.target.value; })} />}
        </div>
      )}
    </div>
  );
}

// Non-collapsible field card: value + Negotiable toggle on the same line, content
// always in view. Acceptance range appears (collapsible) when Negotiable is on.
function FieldCard({ field, st, set }) {
  const value = st.values[field.id];
  const negotiable = st.neg[field.id];
  const canNegotiate = canNeg(field);
  const full = isFull(field);
  const hasDefault = !isEmpty(field.def);
  const matches = hasDefault && eq(value, field.def);
  const negBtn = canNegotiate ? (
    <button type="button" className={`osf-negbtn ${negotiable ? "on" : ""}`} onClick={() => set((s) => { s.neg[field.id] = !s.neg[field.id]; })} aria-pressed={negotiable}><span className="mini-toggle"><i /></span>Auto-accept</button>
  ) : null;
  const ctrl = <FieldValue field={field} value={value} onChange={(v) => set((s) => { s.values[field.id] = v; })} />;
  return (
    <div className={`fc ${full ? "full" : ""} ${negotiable && canNegotiate ? "is-neg" : ""}`}>
      <div className="fc-line">
        <div className="fc-name">{field.label}<span className="osf-info" title={field.meaning}><Icon name="info" size={13} /></span></div>
        {full ? (negBtn && <span className="fc-line-neg">{negBtn}</span>) : (
          <div className="fc-ctrls"><div className="fc-val">{ctrl}</div>{negBtn}</div>
        )}
      </div>
      {full && <div className="fc-val fullw">{ctrl}</div>}
      {hasDefault && (matches
        ? <div className="fc-def match"><Icon name="check" size={12} /> Dataspace default</div>
        : <div className="fc-def"><span>Dataspace default:</span> <b>{fmtVal(field, field.def)}</b> <button type="button" className="os-apply" onClick={() => set((s) => { s.values[field.id] = clone(field.def); })}>Apply</button></div>)}
      {negotiable && canNegotiate && <AcceptDisclosure field={field} st={st} set={set} />}
    </div>
  );
}

// ─── ADOPT-BASELINE BUTTON (global or per-section) with hover preview ────────
function AdoptBaselineButton({ scope, scopeLabel, onApply, variant }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState("dataspace");
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const k = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);
  const apply = (src) => { onApply(src); setOpen(false); };
  const pv = baselinePreview(hover, scope);
  const src = BASELINE_SOURCES.find((s) => s.id === hover);
  return (
    <div className={`ab-wrap ${variant === "global" ? "global" : ""}`} ref={ref}>
      <button type="button" className={`ab-trigger ${variant === "global" ? "global" : ""} ${open ? "open" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <Icon name="download" size={variant === "global" ? 15 : 13} /> Adopt baseline <Icon name={open ? "chevronUp" : "chevronDown"} size={13} className="ab-chev" />
      </button>
      {open && (
        <div className={`ab-pop ${scope === "all" ? "wide" : ""}`} role="menu">
          <div className="ab-pop-head"><b>Adopt a baseline</b><span>Fill {scopeLabel} from a ready-made set — no need to type each value. Every value stays editable afterwards.</span></div>
          <div className="ab-body">
            <div className="ab-sources">
              {BASELINE_SOURCES.map((s) => (
                <button key={s.id} type="button" className={`ab-source ${hover === s.id ? "hl" : ""}`} onMouseEnter={() => setHover(s.id)} onFocus={() => setHover(s.id)} onClick={() => apply(s.id)} role="menuitem">
                  <span className="ab-src-ic"><Icon name={s.icon} size={16} /></span>
                  <span className="ab-src-txt"><span className="ab-src-t">{s.label}<span className="ab-src-tag">{s.tag}</span></span><span className="ab-src-d">{s.desc}</span></span>
                  <Icon name="arrowRight" size={14} className="ab-src-go" />
                </button>
              ))}
            </div>
            <div className="ab-preview">
              <div className="ab-preview-head"><Icon name="eye" size={12} /> Preview · {src ? src.label : ""}</div>
              {pv.flat
                ? (pv.flat.length ? <div className="ab-preview-rows">{pv.flat.map(([k, v], i) => <div className="ab-prow" key={i}><span>{k}</span><b>{v}</b></div>)}</div> : <div className="ab-preview-hint">No baseline values to apply in this section.</div>)
                : <div className="ab-preview-groups">{pv.grouped.map((g) => <div className="ab-pgroup" key={g.id}><div className="ab-pgroup-t">{g.name}</div>{g.rows.slice(0, 3).map(([k, v], i) => <div className="ab-prow" key={i}><span>{k}</span><b>{v}</b></div>)}{g.rows.length > 3 && <div className="ab-pmore">+{g.rows.length - 3} more</div>}</div>)}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TERMS CATEGORY (fields, groups, or repeatable rules) ────────────────────
function TermsPanel({ section, st, set, onAdopt }) {
  const secFields = section.fields || (section.groups || []).flatMap((g) => g.fields);
  const anyNeg = secFields.some(canNeg);
  const intro = section.repeatable ? null : anyNeg ? (
    <ActionExplain icon="triggers" title={'“Auto-accept” vs “Fixed” terms'}>
      Turn on <b>Auto-accept</b> on a term to let the contract agent accept any request that lands inside the acceptance range you set — deals close without waiting on you. Terms left <b>Fixed</b> apply to every taker exactly as published.
    </ActionExplain>
  ) : (
    <ActionExplain icon="shield" title="These terms are fixed">
      Every term in this section applies to all takers exactly as you publish it. Nothing here is open to auto-accept — a taker who needs something else has to raise it with you directly.
    </ActionExplain>
  );
  if (section.repeatable) {
    return (
      <>
        {intro}
        {st.rules.map((rule, i) => (
          <div key={rule._id} style={{ border: "1px solid var(--border)", borderRadius: 10, marginTop: i ? 14 : 6, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--vui-color-secondary)" }}>Rule {i + 1}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· {rule.commitment_concerned}</span>
              {st.rules.length > 1 && <button type="button" className="os-mini-btn danger" style={{ marginLeft: "auto", height: 28 }} onClick={() => set((s) => { s.rules = s.rules.filter((r) => r._id !== rule._id); })}><Icon name="trash" size={13} /></button>}
            </div>
            <div style={{ padding: "2px 14px 8px" }}>
              {section.fields.map((f) => (
                <div className="osf-row" key={f.id}><div className="osf-line" style={{ gridTemplateColumns: "1fr minmax(210px,auto)" }}>
                  <div className="osf-field"><span className="osf-name">{f.label}</span><span className="osf-info" title={f.meaning}><Icon name="info" size={13} /></span></div>
                  <div className="osf-val"><ValueControl field={f} value={rule[f.id]} onChange={(v) => set((s) => { const r = s.rules.find((x) => x._id === rule._id); r[f.id] = v; })} /></div>
                </div></div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <label className="os-flabel">{section.noteLabel}</label>
          <textarea className="os-ta" value={st.penaltyNote} placeholder="Any non-standard penalty handling…" onChange={(e) => set((s) => { s.penaltyNote = e.target.value; })} />
        </div>
        <div className="os-add-row"><button type="button" className="os-add-btn ghost" onClick={() => set((s) => { const r = { _id: "r" + Date.now() }; section.fields.forEach((f) => { r[f.id] = clone(f.def); }); s.rules.push(r); })}><Icon name="plus" size={14} /> {section.addLabel}</button></div>
      </>
    );
  }
  if (section.groups) {
    return <>{intro}{section.groups.map((g) => (<div key={g.label}><div className="os-group-label">{g.label}</div>{g.fields.map((f) => <FieldCard key={f.id} field={f} st={st} set={set} />)}</div>))}</>;
  }
  return <>{intro}{section.fields.map((f) => <FieldCard key={f.id} field={f} st={st} set={set} />)}</>;
}

// ─── PERSONAL DATA / GDPR ─────────────────────────────────────────────────────
// Which declaration fields are still missing for the current offer kind.
function pdMissing(pd, kind) {
  const miss = [];
  if (!pd.enabled) return miss;
  if (kind === "Service") {
    if (!pd.purpose || !pd.purpose.trim()) miss.push("Processing purpose");
    if (!(pd.operations || []).length) miss.push("Processing operations");
    if (pd.dpaSigned === "Not yet") miss.push("Data Processing Agreement");
    if (!pd.monitoringMethod || !pd.monitoringMethod.trim()) miss.push("Compliance monitoring method");
    if (pd.transfers === "Yes" && !pd.transferSafeguard) miss.push("Transfer safeguard");
  } else {
    if (!pd.controller || !pd.controller.trim()) miss.push("Data controller");
    if (!(pd.subjectCategories || []).length) miss.push("Categories of data subjects");
    if (!(pd.dataCategories || []).length) miss.push("Categories of personal data");
    if (!pd.retention) miss.push("Retention & erasure");
    if (!(pd.linkedServices || []).length) miss.push("Authorised processing service");
    if (pd.special === "Yes" && !(pd.specialWhich || []).length) miss.push("Special-category types");
  }
  return miss;
}
function pdIncompleteLinks(pd) {
  return SERVICE_OFFERS.filter((s) => (pd.linkedServices || []).includes(s.id) && !s.complete);
}

// A labelled field block for the personal-data form.
function PdField({ label, req, help, full, children }) {
  return (
    <div className={full ? "pd-field full" : "pd-field"}>
      <label className="os-flabel">{label}{req && <em>*</em>}</label>
      {help && <div className="os-fhelp">{help}</div>}
      {children}
    </div>
  );
}
// Flush-left chip multiselect.
function PdChips({ options, value, onChange }) {
  const set = value || [];
  return (
    <div className="os-chips" style={{ justifyContent: "flex-start" }}>
      {options.map((o) => { const on = set.includes(o); return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? set.filter((x) => x !== o) : [...set, o])}>{o}</button>; })}
    </div>
  );
}
const PdYesNo = ({ value, onChange }) => (
  <div className="seg2 mini">{["Yes", "No"].map((o) => <button key={o} type="button" className={value === o ? "active" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>
);

function PersonalDataPanel({ kind, st, set }) {
  const pd = st.personalData;
  const upd = (k, v) => set((s) => { s.personalData[k] = v; });
  const missing = pdMissing(pd, kind);
  const badLinks = pdIncompleteLinks(pd);
  const isData = kind !== "Service";

  return (
    <>
      <ActionExplain icon="lock" title="Why a personal-data declaration is required">
        If this offer involves personal data, the GDPR obliges you to document how it is handled — and this declaration flows straight into every contract signed on the offer. {isData
          ? "As a data offer you are the source: declare the legal basis and categories, then designate which service offer(s) are authorised to process the data."
          : "As a service offer you process the data on the provider's behalf: declare your role, purpose, safeguards and how compliance is monitored."}
      </ActionExplain>

      <div className="os-ncrow" style={{ borderTop: "none", paddingTop: 4 }}>
        <div>
          <div className="nc-title">This offer involves personal data (GDPR)</div>
          <div className="nc-desc">Turn on when the {isData ? "dataset contains" : "service processes"} data relating to identified or identifiable people. Additional obligatory fields will appear.</div>
        </div>
        <button type="button" className={`toggle ${pd.enabled ? "on" : ""}`} aria-pressed={pd.enabled} onClick={() => upd("enabled", !pd.enabled)}><span className="toggle-thumb" /></button>
      </div>

      {!pd.enabled && (
        <div className="pd-empty"><Icon name="check" size={16} /><span>No personal data declared — no additional GDPR obligations apply to this offer.</span></div>
      )}

      {pd.enabled && (
        <>
          {missing.length === 0 && badLinks.length === 0
            ? <div className="pd-banner ok"><Icon name="shield" size={18} /><div><b>GDPR declaration complete</b><span>All obligatory items are filled and will be attached to the contract.</span></div></div>
            : <div className="pd-banner warn"><Icon name="danger" size={18} /><div>
                <b>{missing.length + badLinks.length} item{missing.length + badLinks.length > 1 ? "s" : ""} to resolve for GDPR compliance</b>
                <span>{[...missing, ...badLinks.map((s) => `“${s.name}” must complete its processing declaration`)].join(" · ")}</span>
              </div></div>}

          {isData ? (
            <div className="pd-form">
              <PdField label="Data controller" req help="The entity that determines the purposes and means of the processing.">
                <input className="os-in" style={{ width: "100%" }} value={pd.controller} placeholder="e.g. TECHNÈ SAS" onChange={(e) => upd("controller", e.target.value)} />
              </PdField>
              <PdField label="Legal basis for sharing" req>
                <Sel value={pd.legalBasis} onChange={(v) => upd("legalBasis", v)} options={PD.legalBasis} full />
              </PdField>
              <PdField label="Categories of data subjects" req full>
                <PdChips options={PD.subjects} value={pd.subjectCategories} onChange={(v) => upd("subjectCategories", v)} />
              </PdField>
              <PdField label="Categories of personal data" req full>
                <PdChips options={PD.dataCats} value={pd.dataCategories} onChange={(v) => upd("dataCategories", v)} />
              </PdField>
              <PdField label="Special-category data (Art. 9)?" help="Health, biometric, genetic, political, religious data, etc.">
                <PdYesNo value={pd.special} onChange={(v) => upd("special", v)} />
              </PdField>
              <PdField label="Retention & erasure" req>
                <Sel value={pd.retention} onChange={(v) => upd("retention", v)} options={PD.retention} full />
              </PdField>
              {pd.special === "Yes" && (
                <PdField label="Which special categories?" req full>
                  <PdChips options={PD.specialCats} value={pd.specialWhich} onChange={(v) => upd("specialWhich", v)} />
                </PdField>
              )}
              <PdField label="Data-subject rights / DPO contact" full help="Where data subjects exercise their rights (access, erasure, portability…).">
                <input className="os-in" style={{ width: "100%" }} value={pd.dpoContact} placeholder="dpo@company.eu" onChange={(e) => upd("dpoContact", e.target.value)} />
              </PdField>
            </div>
          ) : (
            <div className="pd-form">
              <PdField label="Role under the GDPR" req>
                <Sel value={pd.role} onChange={(v) => upd("role", v)} options={PD.roles} full />
              </PdField>
              <PdField label="Data Processing Agreement" req>
                <Sel value={pd.dpaSigned} onChange={(v) => upd("dpaSigned", v)} options={PD.dpa} full />
              </PdField>
              <PdField label="Processing purpose" req full help="What you will do with the personal data — bound by purpose limitation.">
                <textarea className="os-ta" value={pd.purpose} placeholder="e.g. Match anonymised skills profiles to open vacancies within this project only." onChange={(e) => upd("purpose", e.target.value)} />
              </PdField>
              <PdField label="Processing operations" req full>
                <PdChips options={PD.operations} value={pd.operations} onChange={(v) => upd("operations", v)} />
              </PdField>
              <PdField label="Technical & organisational measures" full>
                <PdChips options={PD.toms} value={pd.toms} onChange={(v) => upd("toms", v)} />
              </PdField>
              <PdField label="Sub-processors used?">
                <PdYesNo value={pd.subProcessors} onChange={(v) => upd("subProcessors", v)} />
              </PdField>
              <PdField label="Transfers outside the EEA?">
                <PdYesNo value={pd.transfers} onChange={(v) => upd("transfers", v)} />
              </PdField>
              {pd.subProcessors === "Yes" && (
                <PdField label="Sub-processor list" full>
                  <input className="os-in" style={{ width: "100%" }} value={pd.subProcessorList} placeholder="e.g. AWS (eu-west-3), Mistral AI" onChange={(e) => upd("subProcessorList", e.target.value)} />
                </PdField>
              )}
              {pd.transfers === "Yes" && (
                <PdField label="Transfer safeguard" req>
                  <Sel value={pd.transferSafeguard} onChange={(v) => upd("transferSafeguard", v)} options={PD.transferSafeguards} full />
                </PdField>
              )}
              <PdField label="Compliance monitoring method" req full help="How processing compliance is measured or monitored. TBD how connectors can check this automatically.">
                <textarea className="os-ta" value={pd.monitoringMethod} placeholder="e.g. Access & purpose logs exposed on the connector's audit endpoint; monthly report to the controller." onChange={(e) => upd("monitoringMethod", e.target.value)} />
              </PdField>
            </div>
          )}

          {isData && (
            <div className="pd-link">
              <div className="pd-link-head">
                <div><div className="pd-link-title">Services authorised to process this personal data<em>*</em></div><p className="pd-link-desc">The GDPR requires you to designate which service offer(s) may process this data. Each designated service must have completed its own processing declaration before this offer can be published.</p></div>
              </div>
              <div className="pd-svc-list">
                {SERVICE_OFFERS.map((svc) => {
                  const on = (pd.linkedServices || []).includes(svc.id);
                  return (
                    <div key={svc.id} className={`pd-svc ${on ? "on" : ""}`}>
                      <button type="button" className="pd-svc-check" role="checkbox" aria-checked={on}
                        onClick={() => upd("linkedServices", on ? pd.linkedServices.filter((x) => x !== svc.id) : [...(pd.linkedServices || []), svc.id])}>
                        {on && <Icon name="check" size={13} />}
                      </button>
                      <div className="pd-svc-main">
                        <div className="pd-svc-name">{svc.name}</div>
                        <div className="pd-svc-meta">{svc.provider} · {svc.purpose}</div>
                      </div>
                      <span className={`pd-svc-status ${svc.complete ? "ok" : "warn"}`}><Icon name={svc.complete ? "check" : "danger"} size={12} /> {svc.complete ? "Declaration complete" : "Declaration incomplete"}</span>
                    </div>
                  );
                })}
              </div>
              {badLinks.length > 0 && (
                <div className="pd-link-warn"><Icon name="danger" size={14} /> <span>{badLinks.length} designated service{badLinks.length > 1 ? "s have" : " has"} not completed a processing declaration. Ask the provider to complete it, or remove the link.</span></div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

// ─── OFFER CONTENT ────────────────────────────────────────────────────────────
function ContentPanel({ kind, pdOn }) {
  const isData = kind !== "Service";
  return (
    <>
      <p style={{ margin: "10px 0 14px", fontSize: 13, color: "var(--text-muted)" }}>Detail exactly what your offer comprises, including the products, services or data you provide.</p>
      <div className="os-content-row">
        {isData ? <div className="os-content-ic">0101<br />0110</div> : <div className="os-content-ic" style={{ background: "var(--vui-color-secondary)" }}><Icon name="triggers" size={20} /></div>}
        <div className="os-content-main"><div className="os-content-kind">{isData ? "Data" : "Service"}{pdOn && <span className="os-pd-tag"><Icon name="lock" size={9} /> Personal data</span>}</div><div className="os-content-name">check_free_offer</div></div>
        <div className="os-content-actions"><button type="button" className="os-mini-btn"><Icon name="edit" size={13} /> Edit</button><button type="button" className="os-mini-btn danger"><Icon name="trash" size={13} /> Remove</button></div>
      </div>
      <div className="os-add-row">
        <button type="button" className="os-add-btn"><Icon name="plus" size={14} /> Add new Data Resource</button>
        <button type="button" className="os-add-btn"><Icon name="plus" size={14} /> Add new Service Resource</button>
        <button type="button" className="os-add-btn ghost"><Icon name="search" size={14} /> Browse existing resource</button>
      </div>
    </>
  );
}

// ─── PRICING ──────────────────────────────────────────────────────────────────
// A monetary pricing field. Prices are fixed once published — no auto-accept here.
function PriceField({ k, label, req, help, st, set }) {
  const p = st.pricing;
  return (
    <div>
      <label className="os-flabel">{label}{req && <em>*</em>}</label>
      {help && <div className="os-fhelp">{help}</div>}
      <input className="os-in" value={p[k]} onChange={(e) => set((s) => { s.pricing[k] = e.target.value; })} />
    </div>
  );
}
// Packages: several formulas of the same offer, priced by monthly API-call volume.
const pkUid = () => "pk" + Math.random().toString(36).slice(2, 7);
const pkNum = (v) => { const n = parseFloat(String(v == null ? "" : v).replace(/\s/g, "").replace(",", ".")); return isNaN(n) ? 0 : n; };
const pkFmt = (v) => pkNum(v).toLocaleString("en-US").replace(/,/g, " ");
const pkUnit = (pk) => { const c = pkNum(pk.calls); return c > 0 ? pkNum(pk.price) / c : null; };
const pkIssues = (pk) => { const m = []; if (!pkNum(pk.calls)) m.push("calls per month"); if (String(pk.price == null ? "" : pk.price).trim() === "") m.push("price"); if (pk.setupOn && String(pk.setup == null ? "" : pk.setup).trim() === "") m.push("set-up fee amount"); return m; };
const EMPTY_PKG = () => ({ _id: pkUid(), name: "", calls: "", price: "", setupOn: false, setup: "", desc: "", recommended: false, neg: false, accept: {}, note: "", polOn: false, policies: {} });

// Usage policies can be set per package: off = the package inherits the offer-level
// policies; on = this formula carries its own set (e.g. a cheap package with a
// tighter Count limit, a premium one with no restriction).
const PKG_POL = [
  { id: "no_restriction", t: "No Restriction" },
  { id: "time_period", t: "Time Period" },
  { id: "count", t: "Count" },
  { id: "notification", t: "Notification" },
];
const pkgPolicies = (st, pk) => (pk.polOn ? (pk.policies || {}) : (st.policies || {}));
const pkgPolLabels = (st, pk) => PKG_POL.filter((x) => pkgPolicies(st, pk)[x.id]).map((x) => x.t);

function PackageCard({ i, st, set }) {
  const pk = st.packages[i];
  const cur = st.pricing.currency;
  const up = (patch) => set((s) => { s.packages[i] = { ...s.packages[i], ...patch }; });
  const issues = pkIssues(pk);
  const unit = pkUnit(pk);
  const canDel = st.packages.length > 1;
  return (
    <div className={`pk-card${pk.recommended ? " reco" : ""}${issues.length ? " warn" : ""}`}>
      {pk.recommended && <span className="pk-flag"><Icon name="star" size={10} /> Recommended</span>}
      <div className="pk-top">
        <input className="pk-name" value={pk.name} placeholder={`Package ${i + 1}`} aria-label="Package name" onChange={(e) => up({ name: e.target.value })} />
        <div className="pk-tools">
          <button type="button" className={`pk-tool${pk.recommended ? " on" : ""}`} title="Highlight as recommended" onClick={() => set((s) => { s.packages.forEach((x, j) => { x.recommended = j === i ? !pk.recommended : false; }); })}><Icon name="star" size={14} /></button>
          <button type="button" className="pk-tool" title="Duplicate package" onClick={() => set((s) => { s.packages.splice(i + 1, 0, { ...clone(pk), _id: pkUid(), name: (pk.name || "Package") + " copy", recommended: false }); })}><Icon name="copy" size={14} /></button>
          <button type="button" className="pk-tool danger" title="Remove package" disabled={!canDel} onClick={() => { if (canDel) set((s) => { s.packages.splice(i, 1); }); }}><Icon name="trash" size={14} /></button>
        </div>
      </div>
      <div className="pk-grid">
        <div>
          <label className="os-flabel">API calls per month<em>*</em></label>
          <div className="pk-inrow"><input className="os-in" inputMode="numeric" value={pk.calls} placeholder="10000" onChange={(e) => up({ calls: e.target.value })} /><span className="pk-suffix">calls</span></div>
        </div>
        <div>
          <label className="os-flabel">Price for this volume<em>*</em></label>
          <div className="pk-inrow"><input className="os-in" inputMode="decimal" value={pk.price} placeholder="0" onChange={(e) => up({ price: e.target.value })} /><span className="pk-suffix">{cur} / month</span></div>
        </div>
      </div>
      <div className="pk-setup">
        <button type="button" className={`osf-negbtn${pk.setupOn ? " on" : ""}`} aria-pressed={pk.setupOn} onClick={() => up({ setupOn: !pk.setupOn })}><span className="mini-toggle"><i /></span>Set-up fee</button>
        {pk.setupOn
          ? <div className="pk-inrow"><input className="os-in" inputMode="decimal" value={pk.setup} placeholder="0" onChange={(e) => up({ setup: e.target.value })} /><span className="pk-suffix">{cur} · one shot</span></div>
          : <span className="pk-opt">Optional — no set-up fee on this package</span>}
      </div>
      <div className="pk-derived">
        {unit != null
          ? <><b>{unit < 0.01 ? unit.toFixed(4) : unit.toFixed(3)} {cur}</b> per call{pk.setupOn && pkNum(pk.setup) ? <> · plus {pkFmt(pk.setup)} {cur} once</> : null}</>
          : "Enter a monthly volume and its price to see the unit price."}
      </div>
      <input className="pk-desc" value={pk.desc} placeholder="Short description shown to takers (optional)" onChange={(e) => up({ desc: e.target.value })} />
      <div className="pk-pol">
        <div className="pk-pol-head">
          <span className="os-flabel" style={{ margin: 0 }}>Usage policies</span>
          <button type="button" className={`osf-negbtn${pk.polOn ? " on" : ""}`} aria-pressed={pk.polOn} onClick={() => up({ polOn: !pk.polOn, policies: pk.polOn ? pk.policies : { ...(st.policies || {}) } })}><span className="mini-toggle"><i /></span>Specific to this package</button>
        </div>
        {pk.polOn ? (
          <>
            <div className="os-chips">{PKG_POL.map((pol) => { const on = !!(pk.policies || {})[pol.id]; return <button key={pol.id} type="button" className={`os-chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => up({ policies: { ...(pk.policies || {}), [pol.id]: !on } })}>{pol.t}</button>; })}</div>
            {!pkgPolLabels(st, pk).length && <div className="pk-miss"><Icon name="info" size={12} /> No policy on this package — takers would use the data without restriction.</div>}
          </>
        ) : (
          <div className="pk-pol-inherit">Inherited from the offer: {pkgPolLabels(st, pk).length ? <b>{pkgPolLabels(st, pk).join(", ")}</b> : <b>none selected</b>}</div>
        )}
      </div>
      {issues.length > 0 && <div className="pk-miss"><Icon name="info" size={12} /> Still required: {issues.join(", ")}</div>}
    </div>
  );
}

const PRICING_MODES = [
  { id: "single", t: "Single price", d: "One published price that applies to every taker." },
  { id: "packages", t: "Packages", d: "Several formulas of the same offer, priced by monthly call volume." },
];

function PricingPanel({ st, set }) {
  const p = st.pricing;
  const upd = (k, v) => set((s) => { s.pricing[k] = v; });
  const mode = st.pricingMode || "single";
  const pkgs = st.packages || [];
  const incomplete = pkgs.filter((x) => pkIssues(x).length);
  return (
    <>
      <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Explain your pricing model and business strategy. Choose the model that best suits your way of doing business.</p>
      <div className="pk-mode">
        {PRICING_MODES.map((m) => (
          <button key={m.id} type="button" className={`pk-mode-opt${mode === m.id ? " on" : ""}`} aria-pressed={mode === m.id} onClick={() => set((s) => { s.pricingMode = m.id; })}>
            <span className="pk-radio" />
            <span><span className="pk-mode-t">{m.t}</span><span className="pk-mode-d">{m.d}</span></span>
          </button>
        ))}
      </div>

      {mode === "single" ? (
        <>
          <div className="os-note"><Icon name="info" size={15} /> <span>If pricing is not applicable, set the numeric fields to <b>0</b>. Prices are <b>fixed</b> once published — a taker who needs another figure asks you directly. Only the terms in <b>Duration &amp; renewal</b> and the usage-policy dates can carry any amount inside a range you define.</span></div>
          <div className="os-form-grid">
            <PriceField k="sub" label="Subscription pricing" req st={st} set={set} />
            <div><label className="os-flabel">Billing period<em>*</em></label><Sel value={p.billing} onChange={(v) => upd("billing", v)} options={["One shot", "Daily", "Monthly", "Yearly", "Per API call"]} full /></div>
            <PriceField k="setup" label="Setup fee" help="If you have a setup fee on the usage of this offering, indicate it here." st={st} set={set} />
            <PriceField k="api" label="Cost per API call" help="Indicate the cost per API call if relevant for this offering." st={st} set={set} />
            <div><label className="os-flabel">Currency<em>*</em></label><Sel value={p.currency} onChange={(v) => upd("currency", v)} options={["EUR", "USD", "GBP"]} full /></div>
            <div className="full"><label className="os-flabel">Pricing description</label><textarea className="os-ta" style={{ minHeight: 88 }} placeholder="Describe your pricing model, any particular information you would like clients to know." value={p.desc} onChange={(e) => upd("desc", e.target.value)} /></div>
          </div>
        </>
      ) : (
        <>
          <div className="os-note"><Icon name="info" size={15} /> <span>Each package is one formula of <b>the same offer</b>. Monthly call volume and its price are <b>mandatory</b>; the set-up fee is optional. Takers pick a package when they subscribe, and the chosen one is written into the contract.</span></div>

          <div className="pk-head">
            <div><h3>Packages</h3><p>{pkgs.length} formula{pkgs.length > 1 ? "s" : ""} · sorted the way takers will see them.</p></div>
            <button type="button" className="os-add-btn" onClick={() => set((s) => { s.packages.push(EMPTY_PKG()); })}><Icon name="plus" size={14} /> Add a package</button>
          </div>

          {incomplete.length > 0 && (
            <div className="pk-alert"><Icon name="danger" size={15} /><span><b>{incomplete.length} package{incomplete.length > 1 ? "s" : ""} incomplete</b> — a package can only be published once its monthly volume and price are filled in.</span></div>
          )}

          <div className="pk-list">{pkgs.map((pk, i) => <PackageCard key={pk._id} i={i} st={st} set={set} />)}</div>

          {pkgs.length > 0 && (
            <div className="pk-prev">
              <div className="pk-prev-h"><Icon name="eye" size={14} /> What takers see in the catalogue</div>
              <div className="pk-table-wrap">
                <table className="pk-table">
                  <thead><tr><th>Package</th><th>Calls / month</th><th>Price / month</th><th>Set-up fee</th><th>Per call</th><th>Usage policies</th></tr></thead>
                  <tbody>
                    {pkgs.map((pk) => { const u = pkUnit(pk); return (
                      <tr key={pk._id} className={pk.recommended ? "reco" : undefined}>
                        <td><span className="pk-tname">{pk.name || "Untitled package"}</span>{pk.recommended && <span className="pk-tstar"><Icon name="star" size={9} /> Recommended</span>}</td>
                        <td>{pkNum(pk.calls) ? pkFmt(pk.calls) : "—"}</td>
                        <td>{String(pk.price).trim() === "" ? "—" : `${pkFmt(pk.price)} ${p.currency}`}</td>
                        <td>{pk.setupOn ? (String(pk.setup).trim() === "" ? "—" : `${pkFmt(pk.setup)} ${p.currency}`) : <span className="pk-none">None</span>}</td>
                        <td>{u != null ? `${u < 0.01 ? u.toFixed(4) : u.toFixed(3)} ${p.currency}` : "—"}</td>
                        <td>{pkgPolLabels(st, pk).length ? pkgPolLabels(st, pk).join(", ") : <span className="pk-none">None</span>}{pk.polOn && <span className="pk-tover">own</span>}</td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="os-form-grid" style={{ marginTop: 24 }}>
            <div><label className="os-flabel">Currency<em>*</em></label><Sel value={p.currency} onChange={(v) => upd("currency", v)} options={["EUR", "USD", "GBP"]} full /></div>
            <div><label className="os-flabel">Over-quota calls</label><div className="os-fhelp">What happens beyond the package volume.</div><Sel value={p.overage || "Billed per extra call"} onChange={(v) => upd("overage", v)} options={["Billed per extra call", "Throttled until next month", "Blocked until upgrade"]} full /></div>
            <div className="full"><label className="os-flabel">Pricing description</label><textarea className="os-ta" style={{ minHeight: 88 }} placeholder="Describe your packaging logic, volume discounts, and anything takers should know before choosing." value={p.desc} onChange={(e) => upd("desc", e.target.value)} /></div>
          </div>
        </>
      )}
    </>
  );
}

// ─── USAGE POLICIES ─────────────────────────────────────────────────────────
function PoliciesPanel({ st, set }) {
  const POLICIES = [
    { id: "no_restriction", t: "No Restriction", d: "CAN use data without any restrictions" },
    { id: "time_period", t: "Time Period", d: "MUST use data for a specified time period" },
    { id: "count", t: "Count", d: "MUST not use data for more than n times" },
    { id: "notification", t: "Notification message", d: "CAN use data with notification message" },
  ];
  return (
    <>
      <p style={{ margin: "10px 0 4px", fontSize: 13, color: "var(--text-muted)" }}>Clarify the licences under which your offers are provided and the policies you apply, to avoid any ambiguity about the use of your services or data.</p>
      {st.pricingMode === "packages" && (() => { const own = (st.packages || []).filter((pk) => pk.polOn); return (
        <div className="os-note"><Icon name="coin" size={15} /> <span>These are the <b>offer-level</b> policies — every package inherits them unless it carries its own set. {own.length ? <>Currently <b>{own.length} package{own.length > 1 ? "s" : ""}</b> override{own.length > 1 ? "" : "s"} them: {own.map((pk) => pk.name || "Untitled").join(", ")}.</> : <>No package overrides them today.</>}</span></div>
      ); })()}
      <h3 style={{ margin: "14px 0 2px", fontSize: 14, color: "var(--vui-color-secondary)" }}>Usage policies</h3>
      <p style={{ margin: "0 0 6px", fontSize: 12.5, color: "var(--text-muted)" }}>Select the policies that match the terms of use for your data.</p>
      <div className="os-policy-grid">
        {POLICIES.map((pol) => { const on = !!st.policies[pol.id]; return (
          <div key={pol.id} className={`os-policy ${on ? "on" : ""}`}>
            <div className="os-policy-sel" role="button" tabIndex={0} aria-pressed={on}
              onClick={() => set((s) => { s.policies[pol.id] = !s.policies[pol.id]; })}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); set((s) => { s.policies[pol.id] = !s.policies[pol.id]; }); } }}>
              <div className="pt">{pol.t}</div><div className="pd">{pol.d}</div>
            </div>
          </div>
        ); })}
      </div>
      {st.policies.time_period && (
        <div className="os-tp">
          <div className="os-tp-h"><Icon name="clock" size={13} /> Time Period — the authorised period of use</div>
          {TP_DATES.map((x) => { const on = !!st.policyNeg[x.k]; const a = st.policyAccept[x.k] || {}; return (
            <div className={`os-tp-row${on ? " on" : ""}`} key={x.k}>
              <div className="os-tp-line">
                <div className="os-tp-main"><b>{x.t}</b><span>{x.d}</span></div>
                <input type="date" className="os-in os-tp-date" aria-label={x.t} value={st.policyDates[x.k] || ""} onChange={(e) => set((s2) => { s2.policyDates[x.k] = e.target.value; })} />
                <button type="button" className={`osf-negbtn${on ? " on" : ""}`} aria-pressed={on} onClick={() => set((s2) => { s2.policyNeg[x.k] = !s2.policyNeg[x.k]; })}><span className="mini-toggle"><i /></span>Auto-accept</button>
              </div>
              {on && <MiniNegStrip autoAgent={st.autoAgent}
                acceptEl={<span className="os-range"><span className="os-unit">{x.lim}</span><input type="date" className="os-in os-tp-date" aria-label={`Acceptance limit for ${x.t}`} value={a.limit || ""} onChange={(e) => set((s2) => { s2.policyAccept[x.k] = { ...s2.policyAccept[x.k], limit: e.target.value }; })} /></span>}
                note={st.policyNotes[x.k]} onNote={(v) => set((s2) => { s2.policyNotes[x.k] = v; })} />}
            </div>
          ); })}
        </div>
      )}
    </>
  );
}

// ─── NEGOTIATION & ACCEPTANCE ─────────────────────────────────────────────────
function NegotiationPanel({ st, set }) {
  const negTotal = ALL_FIELDS.filter((f) => canNeg(f) && st.neg[f.id]).length;
  const fixedTotal = ALL_FIELDS.filter((f) => !(canNeg(f) && st.neg[f.id])).length;
  return (
    <>
      <ActionExplain icon="ai" title="Why let the contract agent auto-accept?">
        Takers rarely subscribe at your exact published terms. Rather than emailing back and forth, the contract agent answers on your behalf — automatically accepting any request that lands inside the acceptance range you set per term. Deals close around the clock, and only requests that fall outside your limits are escalated to you.
      </ActionExplain>
      <div className="os-neg-stats">
        <div className="os-stat neg"><b>{negTotal}</b><span>Auto-accepted terms</span></div>
        <div className="os-stat"><b>{fixedTotal}</b><span>Fixed terms</span></div>
        <div className="os-stat"><b>{st.baselineMode === "auto" ? "Auto" : "Manual"}</b><span>Baseline handling</span></div>
      </div>
      <div className="os-ncrow">
        <div><div className="nc-title">Taker takes your published terms as they are</div><div className="nc-desc">What happens when a user subscribes at exactly the terms you published.</div></div>
        <div className="seg2"><button type="button" className={st.baselineMode === "auto" ? "active teal" : ""} onClick={() => set((s) => { s.baselineMode = "auto"; })}><Icon name="check" size={13} /> Auto-accept</button><button type="button" className={st.baselineMode === "review" ? "active" : ""} onClick={() => set((s) => { s.baselineMode = "review"; })}><Icon name="eye" size={13} /> Review first</button></div>
      </div>
      <div className="os-ncrow">
        <div><div className="nc-title">Contract agent auto-accept</div><div className="nc-desc">Let the agent accept requests that fall within the acceptance ranges you set per term. Anything outside comes to you.</div></div>
        <button type="button" className={`toggle ${st.autoAgent ? "on" : ""}`} aria-pressed={st.autoAgent} onClick={() => set((s) => { s.autoAgent = !s.autoAgent; })}><span className="toggle-thumb" /></button>
      </div>
      {st.autoAgent && (
        <div style={{ paddingTop: 15, borderTop: "1px solid var(--border)" }}>
          <div className="nc-title" style={{ marginBottom: 2 }}>Agent guidance note</div>
          <div className="nc-desc" style={{ marginBottom: 8 }}>A plain-language summary of what you will and won't accept — shown to counterparties and used to guide the agent.</div>
          <textarea className="os-ta" value={st.agentNote} onChange={(e) => set((s) => { s.agentNote = e.target.value; })} placeholder="Describe your negotiation stance…" />
        </div>
      )}
    </>
  );
}

// ─── OTHER PAGE TABS ──────────────────────────────────────────────────────────
const MatchingsTab = () => (
  <div className="os-placeholder">
    <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "var(--vui-color-secondary)" }}>Projects that can fit your offer</h3>
    <p style={{ margin: "0 0 18px", color: "var(--text-muted)", fontSize: 13 }}>Explore tailored project opportunities where your data and services can make an impact.</p>
    <div className="os-content-row" style={{ maxWidth: 460 }}>
      <div className="os-content-ic" style={{ background: "var(--vui-color-secondary)" }}><Icon name="projects" size={20} /></div>
      <div className="os-content-main"><div className="os-content-kind">Project · in search of partners</div><div className="os-content-name">DATA_PROVIDER_DSUC_TEST_PUBLISH_5</div></div>
      <button className="btn btn-primary" style={{ marginLeft: "auto" }}>Discover <Icon name="arrowRight" size={14} /></button>
    </div>
  </div>
);
const BusinessTab = () => (<div className="os-placeholder"><div className="os-ph-grid"><div className="os-ph-stat"><div className="k">Total projects using this offer</div><div className="v">1</div></div><div className="os-ph-stat"><div className="k">Total revenue generated</div><div className="v">0 €</div></div><div className="os-ph-stat"><div className="k">Total access requests</div><div className="v">1</div></div></div></div>);
const TechnicalTab = () => (<div className="os-placeholder"><h3 style={{ margin: "0 0 14px", fontSize: 15, color: "var(--vui-color-secondary)" }}>Error status</h3><div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No errors recorded for this offer.</div></div>);

// ─── OVERVIEW (recap of every category) ──────────────────────────────────────
function OverviewPanel({ st, goTo, kind }) {
  const POL = { no_restriction: "No Restriction", time_period: "Time Period", count: "Count", notification: "Notification message" };
  const negTotal = ALL_FIELDS.filter((f) => canNeg(f) && st.neg[f.id]).length;
  const fixedTotal = ALL_FIELDS.filter((f) => !(canNeg(f) && st.neg[f.id])).length;

  const TermItems = ({ secId }) => {
    const s = SECTIONS.find((x) => x.id === secId);
    const fl = s.fields || (s.groups || []).flatMap((g) => g.fields);
    return fl.map((f) => (
      <div className="os-ov-item" key={f.id}>
        <span className="os-ov-k">{f.label}</span>
        <span className="os-ov-v">{fmtVal(f, st.values[f.id])}{st.neg[f.id] && f.type !== "date" && <span className="os-ov-neg"><Icon name="triggers" size={9} /> Auto</span>}</span>
      </div>
    ));
  };

  const Sec = ({ id, icon, title, children, badges }) => (
    <div className="os-ov-sec">
      <div className="os-ov-head">
        <span className="os-ov-ic"><Icon name={icon} size={15} /></span>
        <span className="os-ov-title">{title}</span>
        {badges && <span className="os-ov-badges">{badges}</span>}
        <button type="button" className="os-ov-edit" onClick={() => goTo(id)}><Icon name="edit" size={12} /> Edit</button>
      </div>
      <div className="os-ov-grid">{children}</div>
    </div>
  );

  const p = st.pricing;
  const selPol = Object.keys(POL).filter((k) => st.policies[k]);
  const negTag = <span className="os-ov-neg"><Icon name="triggers" size={9} /> Auto</span>;

  return (
    <div className="os-ov">
      <Sec id="content" icon="database" title="Offer content">
        <div className="os-ov-item"><span className="os-ov-k">Resource</span><span className="os-ov-v">check_free_offer · Data</span></div>
      </Sec>

      <Sec id="pricing" icon="coin" title="Pricing" badges={st.pricingMode === "packages" ? <span className="pill pill-primary">{st.packages.length} packages</span> : null}>
        {st.pricingMode === "packages"
          ? st.packages.map((pk) => (
              <div className="os-ov-item" key={pk._id}>
                <span className="os-ov-k">{pk.name || "Untitled package"}{pk.recommended && <span className="pk-tstar"><Icon name="star" size={9} /></span>}</span>
                <span className="os-ov-v">{pkNum(pk.calls) ? pkFmt(pk.calls) : "—"} calls/mo · {String(pk.price).trim() === "" ? "—" : pkFmt(pk.price) + " " + p.currency + "/mo"}{pk.setupOn && pkNum(pk.setup) ? " · " + pkFmt(pk.setup) + " " + p.currency + " set-up" : ""}</span>
              </div>
            ))
          : <>
              <div className="os-ov-item"><span className="os-ov-k">Subscription</span><span className="os-ov-v">{p.sub} {p.currency} · {p.billing}{st.pricingNeg.sub && negTag}</span></div>
              <div className="os-ov-item"><span className="os-ov-k">Setup fee</span><span className="os-ov-v">{p.setup} {p.currency}{st.pricingNeg.setup && negTag}</span></div>
              <div className="os-ov-item"><span className="os-ov-k">Cost per API call</span><span className="os-ov-v">{p.api} {p.currency}{st.pricingNeg.api && negTag}</span></div>
            </>}
      </Sec>

      <Sec id="policies" icon="shield" title="Usage policies">
        {selPol.length ? <div className="os-ov-tags">{selPol.map((k) => <span key={k} className="pill pill-primary">{POL[k]}</span>)}</div> : <div className="os-ov-empty">No policy selected.</div>}
        {st.policies.time_period && TP_DATES.map((x) => (
          <div className="os-ov-item" key={x.k}><span className="os-ov-k">{x.t}</span><span className="os-ov-v">{st.policyDates[x.k] || "—"}{st.policyNeg[x.k] && negTag}</span></div>
        ))}
        {st.pricingMode === "packages" && st.packages.filter((pk) => pk.polOn).map((pk) => (
          <div className="os-ov-item" key={pk._id}><span className="os-ov-k">{pk.name || "Untitled package"} <span className="pk-tover">own</span></span><span className="os-ov-v">{pkgPolLabels(st, pk).join(", ") || "None"}</span></div>
        ))}
      </Sec>

      <Sec id="personal" icon="lock" title="Personal data & GDPR" badges={st.personalData.enabled ? (pdMissing(st.personalData, kind).length + pdIncompleteLinks(st.personalData).length ? <span className="pill pill-warn">Incomplete</span> : <span className="pill pill-success">Compliant</span>) : null}>
        {!st.personalData.enabled
          ? <div className="os-ov-empty">No personal data — no additional obligations.</div>
          : kind === "Service"
            ? <>
                <div className="os-ov-item"><span className="os-ov-k">Role</span><span className="os-ov-v">{st.personalData.role}</span></div>
                <div className="os-ov-item"><span className="os-ov-k">Purpose</span><span className="os-ov-v">{st.personalData.purpose || "—"}</span></div>
                <div className="os-ov-item"><span className="os-ov-k">Operations</span><span className="os-ov-v">{(st.personalData.operations || []).join(", ") || "—"}</span></div>
                <div className="os-ov-item"><span className="os-ov-k">DPA</span><span className="os-ov-v">{st.personalData.dpaSigned}</span></div>
              </>
            : <>
                <div className="os-ov-item"><span className="os-ov-k">Controller</span><span className="os-ov-v">{st.personalData.controller || "—"}</span></div>
                <div className="os-ov-item"><span className="os-ov-k">Legal basis</span><span className="os-ov-v">{st.personalData.legalBasis}</span></div>
                <div className="os-ov-item"><span className="os-ov-k">Data subjects</span><span className="os-ov-v">{(st.personalData.subjectCategories || []).join(", ") || "—"}</span></div>
                <div className="os-ov-item"><span className="os-ov-k">Authorised services</span><span className="os-ov-v">{(st.personalData.linkedServices || []).length ? SERVICE_OFFERS.filter((s) => st.personalData.linkedServices.includes(s.id)).map((s) => s.name).join(", ") : "None designated"}</span></div>
              </>}
      </Sec>

      <Sec id="sla" icon="clock" title="Service levels (SLA)"><TermItems secId="sla" /></Sec>

      <Sec id="penalties" icon="shield" title="Commitments & penalties">
        {st.rules.map((r, i) => <div className="os-ov-item" key={r._id}><span className="os-ov-k">Rule {i + 1}</span><span className="os-ov-v">{r.commitment_concerned} → {r.consequence_type}</span></div>)}
      </Sec>

      <Sec id="duration" icon="hourglass" title="Duration & renewal"><TermItems secId="duration" /></Sec>

      <Sec id="termination" icon="danger" title="Termination"><TermItems secId="termination" /></Sec>

      <Sec id="negotiation" icon="triggers" title="Auto-accept & agent">
        <div className="os-ov-item"><span className="os-ov-k">Published terms taken as-is</span><span className="os-ov-v">{st.baselineMode === "auto" ? "Auto-accept" : "Review first"}</span></div>
        <div className="os-ov-item"><span className="os-ov-k">Contract agent auto-accept</span><span className="os-ov-v">{st.autoAgent ? "On" : "Off"}</span></div>
        <div className="os-ov-item"><span className="os-ov-k">Terms</span><span className="os-ov-v">{negTotal} auto-accepted · {fixedTotal} fixed</span></div>
      </Sec>
    </div>
  );
}

// ─── OFFER SETTINGS MODAL (faithful to product) ──────────────────────────────
const MODAL_TABS = [
  { id: "content", name: "Offers content" },
  { id: "pricing", name: "Pricing", help: true },
  { id: "policies", name: "Usages policies", help: true },
  { id: "sla", name: "Service levels", help: true, section: "sla" },
  { id: "penalties", name: "Commitments & penalties", section: "penalties" },
  { id: "duration", name: "Duration & renewal", section: "duration" },
  { id: "termination", name: "Termination", section: "termination" },
  { id: "negotiation", name: "Auto-accept" },
];

function SettingsModal({ initialTab, st, set, onSave, onCancel, negCountFor, applyDefaultsFor }) {
  const [tab, setTab] = useState(initialTab || "content");
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => { const k = (e) => { if (e.key === "Escape") onCancel(); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, []);
  const tabDef = MODAL_TABS.find((t) => t.id === tab);
  const section = tabDef.section ? SECTIONS.find((s) => s.id === tabDef.section) : null;
  const save = () => { onSave(); setJustSaved(true); setTimeout(() => setJustSaved(false), 1800); };
  return (
    <div className="osm-backdrop" onClick={onCancel}>
      <div className="osm" role="dialog" aria-modal="true" aria-labelledby="osm-title" onClick={(e) => e.stopPropagation()}>
        <div className="osm-top">
          <div className="osm-title-row">
            <div><h2 className="osm-title" id="osm-title">Offer settings</h2><p className="osm-desc">Describe the needed elements for your offering to be present in the marketplace and generate revenue.</p></div>
            <button type="button" className="osm-x" onClick={onCancel} aria-label="Close"><Icon name="x" size={22} /></button>
          </div>
          <div className="osm-progress"><span className="pct">100%</span><span className="track"><span className="fill" style={{ width: "100%" }} /></span></div>
          <div className="osm-tabs" role="tablist">
            {MODAL_TABS.map((t) => {
              const nc = t.section ? negCountFor(t.section) : 0;
              return (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`osm-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                  {t.name}
                  {t.help && <span className="osm-help" aria-hidden="true">?</span>}
                  {nc > 0 && <span className="osm-tab-badge">{nc}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="osm-body">
          {tab === "content" && <ContentPanel />}
          {tab === "pricing" && <PricingPanel st={st} set={set} />}
          {tab === "policies" && <PoliciesPanel st={st} set={set} />}
          {tab === "negotiation" && <NegotiationPanel st={st} set={set} />}
          {section && <TermsPanel section={section} st={st} set={set} onAdopt={() => applyDefaultsFor(section.id)} />}
        </div>
        <div className="osm-foot">
          <button type="button" className="osm-cancel" onClick={onCancel}>Cancel</button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {justSaved && <span className="osm-saved">✓ Saved</span>}
            <button type="button" className="osm-save" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EDIT IDENTITY MODAL ──────────────────────────────────────────────────────
function EditModal({ onClose }) {
  const ref = useRef(null);
  useEffect(() => { const k = (e) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", k); ref.current?.focus(); return () => document.removeEventListener("keydown", k); }, []);
  return (
    <div className="os-modal-backdrop" onClick={onClose}>
      <div className="os-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title" onClick={(e) => e.stopPropagation()}>
        <div className="os-modal-head"><div><h2 id="edit-title">Edit offer</h2><p>Complete and modify your offer information.</p></div><button ref={ref} type="button" className="os-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button></div>
        <div className="os-modal-body">
          <label className="field"><span className="field-label">Offer name<em>*</em></span><input className="input" defaultValue="check_free_offer" /></label>
          <label className="field"><span className="field-label">Offer caption<em>*</em></span><input className="input" defaultValue="desc" /></label>
          <label className="field"><span className="field-label">Detailed description<em>*</em></span><textarea className="textarea" defaultValue="desc" /></label>
          <div className="grid-2">
            <label className="field"><span className="field-label">Category<em>*</em></span><div className="select-wrap"><select className="input select" defaultValue="Job Offers"><option>Job Offers</option><option>Skills</option><option>Training</option></select><Icon name="chevronDown" size={14} className="select-chev" /></div></label>
            <label className="field"><span className="field-label">Country or region<em>*</em></span><div className="select-wrap"><select className="input select" defaultValue="France"><option>France</option><option>Belgium</option><option>Germany</option></select><Icon name="chevronDown" size={14} className="select-chev" /></div></label>
          </div>
        </div>
        <div className="os-modal-foot"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={onClose}>Save</button></div>
      </div>
    </div>
  );
}

// ─── LEGAL ASSISTANT (context-aware chatbot) ─────────────────────────────────
const LA_SYSTEM = `You are the Legal Assistant inside VisionsTrust, a European data-space marketplace where providers publish data and service offers with contractual terms & conditions (service levels/SLA, commitments & penalties, duration & renewal, termination) and usage policies. You help a provider understand and complete these terms in plain, practical language.

Guidelines:
- Be concise and concrete. Short paragraphs and tight bullet lists. Never wall-of-text.
- When asked, propose specific, reasonable values and briefly say why, referencing the exact field names shown in the context.
- Explain trade-offs: what a choice means for the provider vs. the data consumer (the "taker").
- When relevant, explain the difference between Fixed and Auto-accept terms, and how the contract agent accepts requests inside the provider's ranges.
- Be creative and specific: don't just define a term — tell the provider what does NOT fit THIS offer and profile, and name the exact fields to change (e.g. "99.9% availability is good, except it's set to Auto-accept with no acceptance range — set one on 'Availability / uptime'").
- A deterministic legal analysis is shown to the provider next to you (see FINDINGS below). Build on it: elaborate, prioritise, and give concrete corrected values. Never contradict it.
- When acceptance ranges are missing, point the provider to define their acceptance baseline in “Auto-accept & agent”.
- Always answer in the SAME language as the user's message.
- You are not a lawyer: add a brief one-line reminder to have consequential commitments reviewed by legal counsel — only when giving weighty advice, not on every reply.`;

// ─── DETERMINISTIC LEGAL ANALYSIS (rule-based, no LLM) ───────────────────────
// The companion does not lean 100% on the model: these findings are computed from
// the current offer state + schema, so they are consistent and always available.
function legalFindings(cat, st, kind) {
  const findings = [];
  const add = (level, title, detail, fields, goto) => findings.push({ level, title, detail, fields: fields || [], goto });
  const catDef = FLAT_CATS.find((c) => c.id === cat);
  const section = catDef && catDef.section ? SECTIONS.find((s) => s.id === catDef.section) : null;
  const v = st.values || {}, neg = st.neg || {}, acc = st.accept || {};

  if (cat === "pricing" && st.pricingMode === "packages") {
    const pkgs = st.packages || [];
    const bad = pkgs.filter((pk) => pkIssues(pk).length);
    if (bad.length) add("warn", `${bad.length} package${bad.length > 1 ? "s are" : " is"} incomplete`, `Monthly call volume and its price are mandatory on every package — an incomplete formula cannot be published or written into a contract.`, bad.map((pk) => pk.name || "Untitled package"));
    if (!bad.length && pkgs.length > 1) add("ok", `${pkgs.length} packages are consistent`, `Each formula states its monthly volume, its price and whether a set-up fee applies — takers can compare and pick without asking you.`);
  }

  if (section && section.id === "sla") {
    const av = v.availability;
    if (av) {
      const backed = (st.rules || []).some((r) => r.commitment_concerned === "Availability / uptime");
      if (backed) add("ok", `Availability ${av} is a strong, credible commitment`, `It reads well to takers and a penalty rule already backs it — nothing to change here.`, ["Availability / uptime"]);
      else add("warn", `${av} availability is fine — except nothing backs it`, `You promise ${av} uptime, yet no penalty rule covers it. Without a service credit or fee waiver a taker has no recourse if you miss it, which weakens the clause.`, ["Availability / uptime", "Commitments & penalties"], "penalties");
    }
    const rt = v.response_time;
    if (rt && rt.n != null && ((rt.u === "ms" && rt.n <= 300) || (rt.u === "s" && rt.n < 1))) add("warn", `Response time ${rt.n} ${rt.u}${rt.b ? " " + rt.b : ""} is aggressive`, `Tight latency targets are easy to breach under load. Make sure your infrastructure sustains it, or widen the target before it turns into penalties.`, ["Response time"]);
  }

  if (section && (section.id === "duration" || section.id === "termination")) {
    const dur = v.contract_duration; const conv = v.term_convenience;
    const months = dur ? (dur.u === "years" ? dur.n * 12 : dur.n) : 0;
    if (months >= 24 && conv === "No") add("warn", `${months}-month term with no exit for convenience`, `A long lock-in without a convenience-termination right is a hard sell and can raise fairness concerns for consumers. Consider allowing exit with notice.`, ["Contract duration", "Termination for convenience"], "termination");
  }

  if (kind === "Data" && st.personalData && !st.personalData.enabled) add("warn", `No personal-data declaration on a data offer`, `If any field you expose is personal data, the GDPR requires a declaration — and it flows into every contract signed on this offer. Confirm the offer is genuinely personal-data-free, or declare it.`, ["Personal data & GDPR"], "personal");

  // Whole-offer scan: negotiable terms the agent can't settle (drives the baseline banner)
  let missing = 0;
  if (st.autoAgent) SECTIONS.forEach((s) => {
    const fl = s.fields || (s.groups || []).flatMap((g) => g.fields);
    fl.forEach((f) => { if (canNeg(f) && neg[f.id] && !acceptSummary(f, acc[f.id])) missing++; });
  });

  return { findings, missingRanges: missing };
}

function LegalAnalysis({ cat, st, kind, onGoto }) {
  const { findings, missingRanges } = legalFindings(cat, st, kind);
  const catName = (FLAT_CATS.find((c) => c.id === cat) || {}).name || "";
  const gotoName = (id) => (FLAT_CATS.find((c) => c.id === id) || {}).name || "section";
  return (
    <div className="la-analysis">
      <div className="la-an-head"><Icon name="scale" size={15} /> Legal analysis{catName && <span className="la-an-tag">{catName}</span>}</div>
      {missingRanges > 0 && (
        <div className="la-baseline-alert">
          <Icon name="triggers" size={16} />
          <div className="la-ba-main">
            <div className="la-ba-t">Define your acceptance baseline</div>
            <div className="la-ba-d">{missingRanges} auto-accept term{missingRanges > 1 ? "s have" : " has"} no range — the contract agent can't accept {missingRanges > 1 ? "them" : "it"} until you set one.</div>
          </div>
          <button type="button" className="la-ba-btn" onClick={() => onGoto("negotiation")}>Define baseline</button>
        </div>
      )}
      {findings.length === 0 && missingRanges === 0 && (
        <div className="la-find ok"><span className="la-find-dot" /><div className="la-find-main"><div className="la-find-t">Nothing flagged in this section</div><div className="la-find-d">The values here look consistent and defensible. Ask the assistant below for a second opinion.</div></div></div>
      )}
      {findings.map((f, i) => (
        <div className={`la-find ${f.level}`} key={i}>
          <span className="la-find-dot" />
          <div className="la-find-main">
            <div className="la-find-t">{f.title}</div>
            <div className="la-find-d">{f.detail}</div>
            {f.fields.length > 0 && <div className="la-find-fields">{f.fields.map((fl) => <span className="la-find-chip" key={fl}>{fl}</span>)}</div>}
            {f.goto && <button type="button" className="la-find-go" onClick={() => onGoto(f.goto)}>Open {gotoName(f.goto)} <Icon name="arrowRight" size={12} /></button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function laContext(cat, st, kind) {
  const catDef = FLAT_CATS.find((c) => c.id === cat);
  const section = catDef && catDef.section ? SECTIONS.find((s) => s.id === catDef.section) : null;
  let ctx = `The provider is configuring the offer "check_free_offer".\nCurrently viewing category: "${catDef ? catDef.name : cat}".`;
  if (section) {
    const fl = section.fields || (section.groups || []).flatMap((g) => g.fields);
    ctx += `\n\nTerms in this section (current value · state · meaning):\n`;
    fl.forEach((f) => {
      const neg = canNeg(f) && st.neg[f.id] ? "Auto-accept" : "Fixed";
      ctx += `- ${f.label}: ${fmtVal(f, st.values[f.id])} · ${neg} · ${f.meaning}\n`;
    });
    if (section.repeatable) ctx += `(This section holds ${st.rules.length} penalty rule(s).)\n`;
  }
  ctx += `\nContract-agent auto-accept is ${st.autoAgent ? "ON" : "OFF"}. Baseline handling: ${st.baselineMode === "auto" ? "auto-accept" : "review first"}.`;
  const { findings, missingRanges } = legalFindings(cat, st, kind);
  if (findings.length || missingRanges) {
    ctx += `\n\nDETERMINISTIC FINDINGS already shown to the provider:\n`;
    findings.forEach((f) => { ctx += `- [${f.level.toUpperCase()}] ${f.title} — ${f.detail} (fields: ${f.fields.join(", ") || "—"})\n`; });
    if (missingRanges) ctx += `- [RISK] ${missingRanges} auto-accept term(s) have no acceptance baseline; the agent can't accept anything on them.\n`;
  }
  return ctx;
}

function laInlineBold(s, key) {
  return s.split(/\*\*(.+?)\*\*/g).map((p, i) => (i % 2 ? <b key={key + "b" + i}>{p}</b> : p));
}
function LaRich({ text }) {
  return text.split("\n").map((ln, i) => {
    const t = ln.trim();
    if (t === "") return <div className="la-gap" key={i} />;
    if (/^[-*•]\s+/.test(t)) return <div className="la-li" key={i}><span className="la-bullet">•</span><span>{laInlineBold(t.replace(/^[-*•]\s+/, ""), i)}</span></div>;
    return <p className="la-para" key={i}>{laInlineBold(ln, i)}</p>;
  });
}

const LA_CHIPS = [
  "Explain each finding above in plain language",
  "How do these terms fit my provider profile?",
  "Suggest corrected values for the flagged terms",
  "Draft a fair exit clause for this offer",
];

function LegalAssistant({ st, cat, kind, onGoto }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [messages, loading, open]);

  const send = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next); setInput(""); setLoading(true);
    try {
      const reply = await window.claude.complete({
        system: LA_SYSTEM + "\n\n---\nCURRENT CONTEXT\n" + laContext(cat, st, kind),
        messages: next.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: 900,
      });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "I couldn’t reach the assistant just now. Please try again in a moment.", error: true }]);
    } finally { setLoading(false); }
  };

  return (
    <aside className={`right-rail ${open ? "open" : ""}`}>
      <div className="right-tabs">
        <button type="button" className={`right-tab ${open ? "active" : ""}`} onClick={() => setOpen((o) => !o)} title="Legal assistant" aria-label="Legal assistant" aria-pressed={open}>
          <Icon name="ai" size={18} />
        </button>
      </div>
      {open && (
        <div className="right-panel la-right-panel" role="dialog" aria-label="Legal assistant">
          <div className="la-head">
            <div className="la-head-ic"><Icon name="ai" size={18} /></div>
            <div className="la-head-main"><div className="la-head-t">Legal companion</div><div className="la-head-s">Legal analysis &amp; guidance</div></div>
            <button type="button" className="la-x" onClick={() => setOpen(false)} aria-label="Close"><Icon name="x" size={18} /></button>
          </div>
          <div className="la-body" ref={bodyRef}>
            <LegalAnalysis cat={cat} st={st} kind={kind} onGoto={onGoto} />
            {messages.length === 0 && !loading && (
              <div className="la-ask">
                <div className="la-ask-t">Dig deeper with the assistant</div>
                <div className="la-chips">{LA_CHIPS.map((c) => <button key={c} type="button" className="la-chip" onClick={() => send(c)}>{c}</button>)}</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`la-msg ${m.role}`}>
                {m.role === "assistant" && <div className="la-avatar"><Icon name="ai" size={14} /></div>}
                <div className={`la-bubble ${m.error ? "err" : ""}`}><LaRich text={m.content} /></div>
              </div>
            ))}
            {loading && <div className="la-msg assistant"><div className="la-avatar"><Icon name="ai" size={14} /></div><div className="la-bubble"><span className="la-typing"><i /><i /><i /></span></div></div>}
          </div>
          <div className="la-compose">
            <p className="la-disc">Guidance only — not a substitute for legal advice.</p>
            <div className="la-input-row">
              <textarea className="la-input" rows={1} placeholder="Ask about a term, a value, or a risk…" value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
              <button type="button" className="la-send" onClick={() => send()} disabled={loading || !input.trim()} aria-label="Send"><Icon name="arrowRight" size={18} /></button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function OfferSettingsApp() {
  const [t, setTweak] = useTweaks({ offerKind: "Data" });
  const kind = t.offerKind;
  const [st, setSt] = useState(load);
  const [editing, setEditing] = useState(false);
  const [modalTab, setModalTab] = useState(null); // null | tab id
  const [editMode, setEditMode] = useState("modal"); // modal | inline
  const [cat, setCat] = useState("overview");
  const [inlineSaved, setInlineSaved] = useState(false);
  const snapshot = useRef(null);

  const set = (mutator) => setSt((prev) => { const d = clone(prev); mutator(d); return d; });

  // Mirror the offer-kind tweak into state so it persists and reaches the contract.
  useEffect(() => { setSt((prev) => prev.personalData._kind === kind ? prev : { ...prev, personalData: { ...prev.personalData, _kind: kind } }); }, [kind]);

  const persist = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) {} };
  const openModal = (t) => { snapshot.current = clone(st); setModalTab(t); };
  const closeModal = (save) => { if (save) { persist(); } else if (snapshot.current) { setSt(snapshot.current); } snapshot.current = null; setModalTab(null); };
  const saveInline = () => { persist(); setInlineSaved(true); setTimeout(() => setInlineSaved(false), 1800); };
  const negCountFor = (secId) => { const s = SECTIONS.find((x) => x.id === secId); if (!s) return 0; const fl = s.fields || (s.groups || []).flatMap((g) => g.fields); return fl.filter((f) => st.neg[f.id] && f.type !== "date").length; };
  const applyDefaultsFor = (secId) => setSt((prev) => { const d = clone(prev); const s = SECTIONS.find((x) => x.id === secId); const fl = s.fields || (s.groups || []).flatMap((g) => g.fields); fl.forEach((f) => { if (!isEmpty(f.def)) d.values[f.id] = clone(f.def); }); return d; });

  const catDef = FLAT_CATS.find((c) => c.id === cat);
  const section = catDef && catDef.section ? SECTIONS.find((s) => s.id === catDef.section) : null;
  const isTerms = !!section;
  const HEADS = {
    overview: { title: "Overview", desc: "A recap of every setting for this offer. Jump into any category to adjust it." },
    content: { title: "Offer content", desc: "The products, services or data your offer comprises." },
    pricing: { title: "Pricing", desc: "Your pricing model — a single price, or several packages of the same offer." },
    policies: { title: "Usage policies", desc: "Licences and ODRL policies that apply to the offer." },
    sla: { title: "Service levels (SLA)", desc: "Commitments on delivery, availability and support." },
    penalties: { title: "Commitments & penalties", desc: "What happens when an SLA commitment is not met." },
    duration: { title: "Duration & renewal", desc: "Initial term of the contract and what happens at the end." },
    termination: { title: "Termination", desc: "Rights to exit before term end — convenience, cause or incident." },
    personal: { title: "Personal data & GDPR", desc: kind === "Service" ? "How this service processes personal data on the provider's behalf." : "Personal data this offer exposes, and the services authorised to process it." },
    negotiation: { title: "Auto-accept & agent", desc: "How takers engage, and which requests the contract agent accepts on your behalf." },
    matching: { title: "Project matchings", desc: "Projects that can fit your offer." },
    "business-ind": { title: "Business indicators", desc: "Usage and adoption metrics for this offer." },
    "technical-ind": { title: "Technical indicators", desc: "Delivery health and error status for this offer." },
  };
  const head = HEADS[cat];
  const pd = st.personalData;
  const pdMiss = pdMissing(pd, kind).length + pdIncompleteLinks(pd).length;

  return (
    <AppLayout title="My Offers" activeId="offers-all" className="os-app">
          <div className="os-page">
            <div className="os-breadcrumb"><a href="My Offers.html">My offers</a><span className="sep">/</span><b>check_free_offer</b></div>

            <div className="os-hero">
              <div className="os-hero-top">
                <div className="os-logo">TECHNÈ</div>
                <div className="os-hero-main">
                  <div className="os-title-row"><h1 className="os-title">check_free_offer</h1><span className={`os-kind-pill ${kind === "Service" ? "svc" : "data"}`}>{kind === "Service" ? <Icon name="triggers" size={12} /> : <Icon name="database" size={12} />} {kind} offer</span>{pd.enabled && <span className="os-kind-pill pd"><Icon name="lock" size={11} /> Personal data</span>}<span className="pill pill-success">● Published</span></div>
                  <p className="os-sub">desc</p>
                </div>
                <div className="os-hero-actions"><button type="button" className="os-idbtn"><Icon name="key" size={13} /> ID</button><div className="os-progress"><div className="os-progress-bar"><i style={{ width: "100%" }} /></div><span className="os-progress-pct">100%</span></div><button type="button" className="btn btn-primary" style={{ background: "var(--vui-color-secondary)" }}>Unpublish</button></div>
              </div>
              <div className="os-cat-row"><span className="os-cat">Job Offers</span></div>
            </div>

            <div style={{ marginTop: 16 }}>
                <div className="os-settings-head">
                  <h2>Offer settings</h2>
                  <p>Everything about this offer, grouped by topic. Pick a category on the left — every term is laid out with its value and its auto-accept state in view.</p>
                </div>
                {!READONLY_CATS.includes(cat) && (
                  <div className="os-adopt-bar">
                    <div className="os-adopt-txt"><span className="os-adopt-ic"><Icon name="download" size={18} /></span><div><div className="os-adopt-t">Adopt a baseline for the whole offer</div><div className="os-adopt-d">Fill every section at once — from the dataspace's recommended terms or your own saved defaults. Hover a source to preview; every value stays editable.</div></div></div>
                    <AdoptBaselineButton scope="all" scopeLabel="the whole offer" variant="global" onApply={(src) => set((s) => applyBaseline(s, src, "all"))} />
                  </div>
                )}
                <div className="os-cfg">
                    <nav className="os-rail" aria-label="Offer settings categories">
                      {CATS.map((g) => (
                        <React.Fragment key={g.group}>
                          <div className="os-rail-glabel">{g.group}</div>
                          {g.items.map((c) => {
                            const nc = c.section ? negCountFor(c.section) : 0;
                            return (
                              <button key={c.id} type="button" className={`os-rail-item ${cat === c.id ? "active" : ""}`} onClick={() => setCat(c.id)} aria-current={cat === c.id ? "true" : undefined}>
                                <span className="os-rail-ic"><Icon name={c.icon} size={16} /></span>
                                <span className="os-rail-name">{c.name}</span>
                                {nc > 0 && <span className="os-rail-badge" title={`${nc} auto-accepted`}>{nc}</span>}
                                {c.id === "personal" && pd.enabled && pdMiss > 0 && <span className="os-rail-warn" title={`${pdMiss} to resolve`}>{pdMiss}</span>}
                                {((["content", "pricing", "policies"].includes(c.id)) || (c.id === "personal" && pd.enabled && pdMiss === 0)) && <Icon name="check" size={15} className="os-rail-check" />}
                              </button>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </nav>
                    <section className="os-panel">
                      <div className="os-panel-head">
                        <div><h2>{head.title}</h2><p>{head.desc}</p></div>
                        {BASELINE_SECTION_IDS.includes(cat) && <AdoptBaselineButton scope={cat} scopeLabel={`the ${head.title} section`} onApply={(src) => set((s) => applyBaseline(s, src, cat))} />}
                      </div>
                      <div className="os-panel-body">
                        {cat === "overview" && <OverviewPanel st={st} goTo={setCat} kind={kind} />}
                        {cat === "content" && <ContentPanel kind={kind} pdOn={pd.enabled} />}
                        {cat === "pricing" && <PricingPanel st={st} set={set} />}
                        {cat === "policies" && <PoliciesPanel st={st} set={set} />}
                        {cat === "personal" && <PersonalDataPanel kind={kind} st={st} set={set} />}
                        {cat === "negotiation" && <NegotiationPanel st={st} set={set} />}
                        {cat === "matching" && <MatchingsTab />}
                        {cat === "business-ind" && <BusinessTab />}
                        {cat === "technical-ind" && <TechnicalTab />}
                        {isTerms && <TermsPanel section={section} st={st} set={set} onAdopt={() => applyDefaultsFor(section.id)} />}
                      </div>
                      {!READONLY_CATS.includes(cat) && (
                        <div className="os-panel-foot">
                          <span className="sb-txt">{inlineSaved ? <b>✓ All changes saved</b> : "Changes apply live · Save to persist."}</span>
                          <div className="sb-actions"><button type="button" className="btn btn-ghost" onClick={() => setSt(seed())}>Reset all</button><button type="button" className="btn btn-primary" onClick={saveInline}><Icon name="check" size={14} /> Save changes</button></div>
                        </div>
                      )}
                    </section>
                  </div>
              </div>
          </div>

      {editing && <EditModal onClose={() => setEditing(false)} />}
      {modalTab && <SettingsModal initialTab={modalTab} st={st} set={set} negCountFor={negCountFor} applyDefaultsFor={applyDefaultsFor} onSave={() => closeModal(true)} onCancel={() => closeModal(false)} />}
      <TweaksPanel title="Offer type">
        <TweakSection label="Offer kind" />
        <TweakRadio label="Kind" value={kind} options={["Data", "Service"]} onChange={(v) => setTweak("offerKind", v)} />
        <div style={{ fontSize: 10.5, lineHeight: 1.45, color: "rgba(41,38,27,.55)", padding: "2px 0" }}>{kind === "Service" ? "Service offers process personal data — they declare purpose, safeguards and monitoring." : "Data offers expose personal data — they declare categories and designate authorised services."}</div>
        <TweakSection label="Shortcut" />
        <TweakToggle label="Involves personal data" value={st.personalData.enabled} onChange={(v) => set((s) => { s.personalData.enabled = v; })} />
      </TweaksPanel>
    </AppLayout>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<OfferSettingsApp />);
})();
