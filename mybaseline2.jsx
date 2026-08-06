// VisionsTrust — "My baseline" module v2 (UX simplification of mybaseline.jsx).
// Self-contained: needs window.UI (Icon) + window.OfferSettingsData (+ window.BasketData).
//
// What changed vs v1, and why:
//   1. ONE baseline per screen. The two baselines (provider / consumer) are now two
//      destinations chosen in the host nav — no in-page tabs, no big role explainer.
//   2. READ-FIRST rows. Every term shows a plain-language sentence ("At most 500 EUR / mo",
//      "Not set yet"); the editor opens inline on click. Same anatomy for both roles.
//   3. Collapsible sections with counts, so the page opens as a short overview instead of
//      ~30 always-open field cards. Search + "Only unset / Only negotiable" filters.
//   4. Coverage bar tells the user how complete the baseline is.
//   5. Save bar appears only when something changed, and counts the changes.
(function () {
const { useState, useMemo, useEffect, useRef } = React;
const { Icon } = window.UI;
const { SECTIONS, AVAILABILITY, PD } = window.OfferSettingsData;
const USER_BASELINE = (window.BasketData && window.BasketData.USER_BASELINE) || {};

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const isEmpty = (v) => v === "" || v == null || (Array.isArray(v) && v.length === 0);
const LS_KEY = "vt.myBaseline.v2";

// ─── SECTIONS (the "Offer content" section is gone — it holds no baseline term) ──
const MODULE_SECTIONS = [
  { id: "pricing", name: "Pricing", icon: "coin", hint: "What you charge", hintAcc: "What you're willing to pay" },
  { id: "policies", name: "Usage policies", icon: "shield", hint: "How buyers may use the data", hintAcc: "Restrictions you can live with" },
  { id: "clauses", name: "Additional clauses", icon: "doc", hint: "Exit, security, IP, law, audit & confidentiality you propose", hintAcc: "Clauses you require before signing" },
];
const termFields = (secId) => { const s = SECTIONS.find((x) => x.id === secId); return s ? (s.fields || (s.groups || []).flatMap((g) => g.fields)) : []; };

const OFFER_EXTRA = {
  pricing: [
    { id: "sub", label: "Subscription price", meaning: "Default subscription amount for your offers.", type: "money", def: { n: 0 }, cur: true, neg: true },
    { id: "billing", label: "Billing period", meaning: "How the subscription is billed.", type: "select", options: ["One shot", "Daily", "Monthly", "Yearly", "Per API call"], def: "Monthly" },
    { id: "setup", label: "Setup fee", meaning: "Default one-off setup fee.", type: "money", def: { n: 0 }, cur: true, neg: true },
    { id: "currency", label: "Currency", meaning: "Billing currency.", type: "select", options: ["EUR", "USD", "GBP"], def: "EUR" },
  ],
  policies: [
    { id: "policies", label: "Usage policies applied", meaning: "The ODRL usage policies you apply to your offers by default.", type: "multiselect", options: ["No Restriction", "Time Period", "Count", "Notification message"], def: ["Time Period", "Count"] },
  ],
  personal: [
    { id: "pd_default", label: "Involves personal data by default", meaning: "Whether your offers usually expose or process personal data.", type: "yesno", def: "No" },
    { id: "retention", label: "Default retention", meaning: "How long consumers may retain the data by default.", type: "select", options: PD.retention, def: "1 year", neg: true },
    { id: "toms", label: "Security measures", meaning: "Technical & organisational measures applied by default.", type: "multiselect", options: PD.toms, def: ["Encryption at rest", "Encryption in transit", "Access control (RBAC)"] },
  ],
};
const offerFields = (secId) => OFFER_EXTRA[secId] || termFields(secId);

const ACC_EXTRA = {
  pricing: [
    { id: "acc_sub", label: "Maximum subscription price", meaning: "The most you'll pay in subscription before it's flagged as a gap.", kind: "num", op: "≤", v: 500, unit: "EUR / mo" },
    { id: "acc_setup", label: "Maximum setup fee", meaning: "The most you'll pay as a one-off setup fee.", kind: "num", op: "≤", v: 200, unit: "EUR" },
  ],
  policies: [
    { id: "acc_pol", label: "Usage policies I accept", meaning: "Policies you're willing to operate under.", kind: "set", set: ["Time Period", "Count", "Notification message"], options: ["No Restriction", "Time Period", "Count", "Notification message"] },
  ],
  personal: [
    { id: "acc_dpa", label: "Signed DPA required", meaning: "You require a signed Data Processing Agreement.", kind: "bool", v: "Yes" },
    { id: "acc_safe", label: "Accepted transfer safeguards", meaning: "Cross-border transfer safeguards you accept.", kind: "set", set: ["Adequacy decision", "Standard Contractual Clauses (SCC)"], options: PD.transferSafeguards },
  ],
  clauses: [
    { id: "acc_rev", label: "Exit terms I accept", meaning: "What must happen to the data at the end of the contract.", kind: "set", set: ["Return + deletion", "Return + deletion + destruction certificate"], options: ["None", "Data deletion only", "Return + deletion", "Return + deletion + destruction certificate"] },
    { id: "acc_subcontract", label: "Subcontracting I accept", meaning: "How far a provider may involve third parties.", kind: "set", set: ["No transfer allowed", "Prior written approval"], options: ["No transfer allowed", "Prior written approval", "Notification only", "Free within the dataspace"] },
    { id: "acc_incident", label: "Incident notification delay I accept", meaning: "How fast a provider must notify a breach.", kind: "set", set: ["Without undue delay", "24h", "48h"], options: ["Without undue delay", "24h", "48h", "72h"] },
    { id: "acc_ip", label: "IP on outputs I accept", meaning: "Ownership of derived data and results.", kind: "set", set: ["Consumer owns results", "Joint ownership", "Licensed back"], options: ["Provider retains all", "Consumer owns results", "Joint ownership", "Licensed back", "No derivative rights"] },
    { id: "acc_law", label: "Governing law I accept", meaning: "Jurisdictions you will sign under.", kind: "set", set: ["France", "EU-wide"], options: ["France", "Belgium", "Germany", "Netherlands", "EU-wide"] },
    { id: "acc_audit", label: "Audit right required", meaning: "You require the right to verify compliance.", kind: "bool", v: "Yes" },
    { id: "acc_conf", label: "Confidentiality agreement required", meaning: "You require an NDA covering data and contract terms.", kind: "bool", v: "Yes" },
  ],
  penalties: [
    { id: "acc_pen", label: "Require a penalty backing availability", meaning: "You require a service credit / penalty when uptime is missed.", kind: "bool", v: "Yes" },
    { id: "acc_credit", label: "Minimum service credit", meaning: "Smallest acceptable credit when a commitment is missed.", kind: "num", op: "≥", v: 5, unit: "% of period fee" },
  ],
};
const kindOf = (op) => op === "≥tier" ? "tier" : (op === "in" || op === "includesAll") ? "set" : op === "=" ? "bool" : "num";
function accFields(secId) {
  if (ACC_EXTRA[secId] && !["sla", "duration", "termination"].includes(secId)) return ACC_EXTRA[secId];
  return termFields(secId).filter((f) => USER_BASELINE[f.id]).map((f) => {
    const b = USER_BASELINE[f.id];
    const kind = kindOf(b.op);
    return { id: f.id, label: f.label, meaning: f.meaning, kind, op: b.op === "≥tier" ? "≥" : b.op, v: kind === "set" ? undefined : b.v, set: kind === "set" ? clone(b.v) : undefined, options: f.options, unit: (f.def && f.def.u) || (f.units && f.units[0]) || "" };
  });
}
const fieldsFor = (role, secId) => (role === "offer" ? offerFields(secId) : accFields(secId));

// ─── SEED / PERSIST ──────────────────────────────────────────────────────────
// Terms whose schema carries no default would stay "not set" forever, so adopting
// the data-space defaults could never reach 100%. Derive a sensible default for
// them (first option / zero amount) so "Apply all defaults" sets every term.
function offerFallback(f) {
  const first = (arr) => (arr && arr.length ? arr[0] : "");
  switch (f.type) {
    case "money": return { n: 0 };
    case "numberUnit": return { n: (f.def && f.def.n) || 1, u: (f.def && f.def.u) || first(f.units) };
    case "multiselect": return f.options ? f.options.slice(0, 1) : [];
    case "opValue": return { op: "≤", v: 1 };
    case "procDeadline": return { p: first(f.options) || "Immediate", d: 30 };
    case "twoSelect": return { a: first(f.optionsA || f.options), b: first(f.optionsB || f.options) };
    case "selectDeadline": return { a: first(f.options) || "None", b: "30 days" };
    case "matrix": return f.def || {};
    case "yesno": return "No";
    default: return f.options ? first(f.options) : "Yes";
  }
}
function seed() {
  const offerVals = {}, offerNeg = {};
  MODULE_SECTIONS.forEach((sec) => offerFields(sec.id).forEach((f) => {
    let v = clone(f.def);
    if (offerSummary(f, v) === null) v = offerFallback(f);
    offerVals[f.id] = v; offerNeg[f.id] = !!f.neg;
  }));
  const acc = {}, accNeg = {};
  MODULE_SECTIONS.forEach((sec) => accFields(sec.id).forEach((f) => {
    const a = { op: f.op, v: f.v, v2: undefined, set: f.set ? clone(f.set) : undefined, kind: f.kind, unit: f.unit };
    if (accSummary(a) === null) {
      if (a.kind === "set") a.set = f.options ? f.options.slice(0, 1) : [];
      else if (a.kind === "bool") a.v = "Yes";
      else a.v = 1;
    }
    acc[f.id] = a; accNeg[f.id] = true;
  }));
  return { offerVals, offerNeg, acc, accNeg };
}
// Merge per key so terms added to the schema after a save (e.g. the additional clauses)
// still start from their default instead of appearing empty.
function load() {
  const base = seed();
  try {
    const raw = localStorage.getItem(LS_KEY); if (!raw) return base;
    const saved = JSON.parse(raw);
    Object.keys(base).forEach((k) => { base[k] = { ...base[k], ...(saved[k] || {}) }; });
  } catch (e) {}
  return base;
}

// ─── DATASPACE DEFAULTS ──────────────────────────────────────────────────────
// The values the data space recommends: the schema defaults for the offer baseline,
// the recommended acceptance profile for the consumer one. Same source the
// "Adopt dataspace defaults" action uses in Offer / Project settings.
const DS_NAME = "VisionsTrust data space";
const DS = seed();
const dsValOf = (role, id) => role === "offer" ? DS.offerVals[id] : DS.acc[id];
const dsNegOf = (role, id) => role === "offer" ? !!DS.offerNeg[id] : !!DS.accNeg[id];
const curValOf = (role, id, st) => role === "offer" ? st.offerVals[id] : st.acc[id];
const applyDs = (s, role, id) => {
  if (role === "offer") { s.offerVals[id] = clone(DS.offerVals[id]); s.offerNeg[id] = DS.offerNeg[id]; }
  else { s.acc[id] = clone(DS.acc[id]); s.accNeg[id] = DS.accNeg[id]; }
};

// ─── PLAIN-LANGUAGE SUMMARIES ────────────────────────────────────────────────
function offerSummary(field, v) {
  if (isEmpty(v) || (v && v.n === 0 && field.type === "money")) {
    if (field.type === "money") return v && v.n === 0 ? "Free (0 EUR)" : null;
    return null;
  }
  switch (field.type) {
    case "money": return `${v.n} EUR`;
    case "numberUnit": return `${v.n} ${v.u || (field.units && field.units[0]) || ""}${v.b ? " · " + v.b : ""}`.trim();
    case "multiselect": return v.join(", ");
    case "opValue": return `${v.op} ${v.v}`;
    case "procDeadline": return !/Immediate/.test(v.p) && v.d != null ? `${v.p} · within ${v.d} days` : v.p;
    case "matrix": return Object.entries(v).map(([k, x]) => `${k} ${x.n}${x.u}`).join(" · ");
    case "twoSelect": return `${v.a} · ${v.b}`;
    case "selectDeadline": return v.a === "None" ? "None" : `${v.a} · within ${v.b}`;
    default: return String(v);
  }
}
function accSummary(a) {
  if (a.kind === "bool") return a.v === "Yes" ? "Required" : "Not required";
  if (a.kind === "set") return (a.set && a.set.length) ? a.set.join(", ") : null;
  if (a.kind === "tier") return isEmpty(a.v) ? null : `At least ${a.v}`;
  if (isEmpty(a.v)) return null;
  const bound = a.op === "≤" ? "At most" : "At least";
  const second = !isEmpty(a.v2) ? ` · ${a.op === "≤" ? "at least" : "at most"} ${a.v2}` : "";
  return `${bound} ${a.v}${a.unit ? " " + a.unit : ""}${second}`;
}
const summaryOf = (role, field, st) => role === "offer" ? offerSummary(field, st.offerVals[field.id]) : accSummary(st.acc[field.id] || {});
const negOf = (role, id, st) => role === "offer" ? !!st.offerNeg[id] : !!st.accNeg[id];
const dsSummaryOf = (role, field) => role === "offer" ? offerSummary(field, DS.offerVals[field.id]) : accSummary(DS.acc[field.id] || {});
const matchesDs = (role, field, st) => JSON.stringify(curValOf(role, field.id, st) ?? null) === JSON.stringify(dsValOf(role, field.id) ?? null) && negOf(role, field.id, st) === dsNegOf(role, field.id);

// ─── CONTROLS ────────────────────────────────────────────────────────────────
const Seg = ({ value, options, onChange }) => (
  <div className="mb2-seg">{options.map((o) => <button key={o} type="button" className={value === o ? "on" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>
);
const Chips = ({ value, options, onChange }) => (
  <div className="mb2-chips">{options.map((o) => { const on = (value || []).includes(o); return <button key={o} type="button" className={`mb2-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])}>{o}</button>; })}</div>
);
const Dd = ({ value, options, onChange }) => (
  <span className="mb2-ddw"><select className="mb2-in" value={value || ""} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></span>
);
const NumIn = ({ value, onChange, w }) => <input type="number" className="mb2-num" style={w ? { width: w } : undefined} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;

function OfferEditor({ field, value, onChange }) {
  switch (field.type) {
    case "text": return <input className="mb2-in" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "textarea": return <textarea className="mb2-ta" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "date": return <input type="date" className="mb2-in" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "yesno": return <Seg value={value} options={["Yes", "No"]} onChange={onChange} />;
    case "select": return <Seg value={value} options={field.options} onChange={onChange} />;
    case "multiselect": return <Chips value={value} options={field.options} onChange={onChange} />;
    case "twoSelect": return <span className="mb2-inline"><Dd value={value?.a} options={field.options} onChange={(a) => onChange({ ...value, a })} /><Dd value={value?.b} options={field.options2} onChange={(b) => onChange({ ...value, b })} /></span>;
    case "selectDeadline": return <span className="mb2-inline"><Dd value={value?.a} options={field.options} onChange={(a) => onChange({ ...value, a })} />{value?.a !== "None" && <><span className="mb2-unit">within</span><Seg value={value?.b} options={field.deadlines} onChange={(b) => onChange({ ...value, b })} /></>}</span>;
    case "money": return <span className="mb2-inline"><NumIn value={value?.n} onChange={(n) => onChange({ ...value, n })} w={100} /><span className="mb2-unit">EUR</span></span>;
    case "numberUnit": return <span className="mb2-inline"><NumIn value={value?.n} onChange={(n) => onChange({ ...value, n })} />{field.units && field.units.length > 1 ? <Seg value={value?.u} options={field.units} onChange={(u) => onChange({ ...value, u })} /> : <span className="mb2-unit">{value?.u || (field.units && field.units[0])}</span>}{field.basis && <Seg value={value?.b} options={field.basis} onChange={(b) => onChange({ ...value, b })} />}</span>;
    case "opValue": return <span className="mb2-inline"><Seg value={value?.op} options={field.operators} onChange={(op) => onChange({ ...value, op })} /><input className="mb2-in sm" value={value?.v || ""} onChange={(e) => onChange({ ...value, v: e.target.value })} /></span>;
    case "procDeadline": { const showDays = !/Immediate/.test(value?.p || ""); return <span className="mb2-inline"><Seg value={value?.p} options={field.options} onChange={(p) => onChange({ ...value, p })} />{showDays && <><NumIn value={value?.d} onChange={(d) => onChange({ ...value, d })} /><span className="mb2-unit">days</span></>}</span>; }
    case "matrix": return <div className="mb2-matrix">{field.rows.map((r) => <div className="mb2-mrow" key={r}><span className="mb2-mkey">{r}</span><span className="mb2-inline"><NumIn value={value?.[r]?.n} onChange={(n) => onChange({ ...value, [r]: { ...value[r], n } })} /><Seg value={value?.[r]?.u} options={field.units} onChange={(u) => onChange({ ...value, [r]: { ...value[r], u } })} /></span></div>)}</div>;
    default: return <span className="mb2-unit">{offerSummary(field, value) || "—"}</span>;
  }
}

function AccEditor({ field, a, onChange }) {
  const [second, setSecond] = useState(!isEmpty(a.v2));
  if (a.kind === "bool") return <Seg value={a.v} options={["Yes", "No"]} onChange={(v) => onChange({ ...a, v })} />;
  if (a.kind === "set") return <Chips value={a.set} options={field.options} onChange={(set) => onChange({ ...a, set })} />;
  if (a.kind === "tier") return <Seg value={a.v} options={AVAILABILITY} onChange={(v) => onChange({ ...a, v })} />;
  const other = a.op === "≤" ? "at least" : "at most";
  return (
    <div className="mb2-acc-edit">
      <div className="mb2-inline">
        <Seg value={a.op} options={["≤", "≥"]} onChange={(op) => onChange({ ...a, op })} />
        <span className="mb2-say">{a.op === "≤" ? "At most" : "At least"}</span>
        <NumIn value={a.v} onChange={(v) => onChange({ ...a, v })} />
        {a.unit && <span className="mb2-unit">{a.unit}</span>}
      </div>
      {second ? (
        <div className="mb2-inline">
          <span className="mb2-say">…and {other}</span>
          <NumIn value={a.v2} onChange={(v2) => onChange({ ...a, v2 })} />
          {a.unit && <span className="mb2-unit">{a.unit}</span>}
          <button type="button" className="mb2-link" onClick={() => { setSecond(false); onChange({ ...a, v2: undefined }); }}>Remove</button>
        </div>
      ) : (
        <button type="button" className="mb2-link" onClick={() => setSecond(true)}>+ Add a second limit</button>
      )}
    </div>
  );
}

const NegSwitch = ({ on, onToggle }) => (
  <button type="button" className={`mb2-neg ${on ? "on" : ""}`} aria-pressed={on} onClick={onToggle}>
    <span className="mb2-mt"><i /></span>{on ? "Negotiable" : "Non-negotiable"}
  </button>
);

// ─── TERM ROW ────────────────────────────────────────────────────────────────
function TermRow({ role, field, st, patch, open, onToggleOpen }) {
  const sum = summaryOf(role, field, st);
  const neg = negOf(role, field.id, st);
  const onDs = matchesDs(role, field, st);
  const dsSum = dsSummaryOf(role, field);
  const setNeg = () => patch((s) => { if (role === "offer") s.offerNeg[field.id] = !s.offerNeg[field.id]; else s.accNeg[field.id] = !s.accNeg[field.id]; });
  return (
    <div className={`mb2-row ${open ? "open" : ""} ${sum ? "" : "unset"}`}>
      <button type="button" className="mb2-row-head" onClick={onToggleOpen} aria-expanded={open}>
        <span className="mb2-row-name">{field.label}{!onDs && <span className="mb2-custom" title={`Differs from the ${DS_NAME} default`}>custom</span>}</span>
        <span className="mb2-row-val">{sum || <em>Not set yet</em>}</span>
        <span className={`mb2-tag ${neg ? "neg" : ""}`}>{neg ? "Negotiable" : "Non-negotiable"}</span>
        <span className="mb2-row-chev"><Icon name={open ? "chevronUp" : "chevronDown"} size={15} /></span>
      </button>
      {open && (
        <div className="mb2-row-edit">
          <p className="mb2-mean">{field.meaning}</p>
          <div className="mb2-edit-ctrl">
            {role === "offer"
              ? <OfferEditor field={field} value={st.offerVals[field.id]} onChange={(v) => patch((s) => { s.offerVals[field.id] = v; })} />
              : <AccEditor field={field} a={st.acc[field.id]} onChange={(a) => patch((s) => { s.acc[field.id] = a; })} />}
          </div>
          {onDs
            ? <div className="mb2-dsline match"><Icon name="check" size={12} /> Matches the {DS_NAME} default</div>
            : <div className="mb2-dsline"><span>Data space default:</span> <b>{dsSum || "not set"}</b>{dsNegOf(role, field.id) ? " · negotiable" : " · non-negotiable"}<button type="button" className="mb2-link" onClick={() => patch((s) => applyDs(s, role, field.id))}>Use it</button></div>}
          <div className="mb2-edit-foot">
            <NegSwitch on={neg} onToggle={setNeg} />
            <span className="mb2-foot-hint">{neg
              ? (role === "offer" ? "Buyers may ask you to change this value." : "You'll consider offers outside this limit.")
              : (role === "offer" ? "This value is presented as non-negotiable." : "Outside this limit, the offer is a hard no.")}</span>
            <button type="button" className="mb2-done" onClick={onToggleOpen}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SECTION ─────────────────────────────────────────────────────────────────
function Section({ sec, role, fields, all, st, patch, open, onToggle, openRows, toggleRow }) {
  const setCount = all.filter((f) => summaryOf(role, f, st)).length;
  const off = fields.filter((f) => !matchesDs(role, f, st));
  return (
    <section className={`mb2-sec ${open ? "open" : ""}`}>
      <button type="button" className="mb2-sec-head" onClick={onToggle} aria-expanded={open}>
        <span className="mb2-sec-ic"><Icon name={sec.icon} size={15} /></span>
        <span className="mb2-sec-tx">
          <span className="mb2-sec-name">{sec.name}</span>
          <span className="mb2-sec-hint">{role === "acceptance" && sec.hintAcc ? sec.hintAcc : sec.hint}</span>
        </span>
        <span className={`mb2-sec-count ${setCount === all.length ? "full" : setCount === 0 ? "none" : ""}`}>{setCount}/{all.length} set</span>
        <span className="mb2-row-chev"><Icon name={open ? "chevronUp" : "chevronDown"} size={16} /></span>
      </button>
      {open && (
        <div className="mb2-sec-body">
          {off.length > 0 && (
            <div className="mb2-sec-ds">
              <Icon name="info" size={14} />
              <span>{off.length} term{off.length !== 1 ? "s" : ""} here differ{off.length === 1 ? "s" : ""} from the data space default.</span>
              <button type="button" className="mb2-link" onClick={() => patch((s) => off.forEach((f) => applyDs(s, role, f.id)))}>Use defaults in this section</button>
            </div>
          )}
          {fields.length === 0
            ? <p className="mb2-empty">No term matches your filters in this section.</p>
            : fields.map((f) => <TermRow key={f.id} role={role} field={f} st={st} patch={patch} open={!!openRows[f.id]} onToggleOpen={() => toggleRow(f.id)} />)}
        </div>
      )}
    </section>
  );
}

// ─── MODULE ──────────────────────────────────────────────────────────────────
const ROLE_INFO = {
  offer: { title: "My offer baseline", lead: "Default terms your published offers start from — “Adopt baseline” in Offer settings copies these values.", audience: "Visible to buyers once applied to an offer." },
  acceptance: { title: "My acceptance baseline", lead: "The limits you're willing to accept when you consume someone else's offer — anything outside them is flagged as a gap in your basket.", audience: "Private — providers never see this." },
};

function MyBaselineModuleV2({ role: roleProp, onRoleChange, hideHead }) {
  const [roleState, setRoleState] = useState("offer");
  const role = roleProp || roleState;
  const setRole = onRoleChange || setRoleState;
  const [st, setSt] = useState(load);
  const [savedSnap, setSavedSnap] = useState(() => JSON.stringify(load()));
  const [justSaved, setJustSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [openSecs, setOpenSecs] = useState({});
  const [openRows, setOpenRows] = useState({});
  const [dsOpen, setDsOpen] = useState(false);

  const patch = (m) => setSt((prev) => { const d = clone(prev); m(d); return d; });
  const toggleRow = (id) => setOpenRows((o) => ({ ...o, [id]: !o[id] }));
  const dirty = JSON.stringify(st) !== savedSnap;
  const info = ROLE_INFO[role];

  // filtered section model
  const model = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MODULE_SECTIONS.map((sec) => {
      const all = fieldsFor(role, sec.id);
      const fields = all.filter((f) => {
        if (q && !(f.label.toLowerCase().includes(q) || (f.meaning || "").toLowerCase().includes(q))) return false;
        if (filter === "unset" && summaryOf(role, f, st)) return false;
        if (filter === "custom" && matchesDs(role, f, st)) return false;
        if (filter === "negotiable" && !negOf(role, f.id, st)) return false;
        if (filter === "fixed" && negOf(role, f.id, st)) return false;
        return true;
      });
      return { sec, all, fields };
    }).filter((m) => m.all.length > 0);
  }, [role, query, filter, st]);

  const allFields = model.flatMap((m) => m.all);
  const offDs = allFields.filter((f) => !matchesDs(role, f, st));
  const setTotal = allFields.filter((f) => summaryOf(role, f, st)).length;
  const negTotal = allFields.filter((f) => negOf(role, f.id, st)).length;
  const pct = allFields.length ? Math.round((setTotal / allFields.length) * 100) : 0;
  const searching = !!query.trim() || filter !== "all";
  const isOpen = (id) => searching ? true : (openSecs[id] !== undefined ? openSecs[id] : id === MODULE_SECTIONS[0].id);
  const matches = model.reduce((n, m) => n + m.fields.length, 0);
  const visible = searching ? model.filter((m) => m.fields.length > 0) : model;

  useEffect(() => { setOpenRows({}); }, [role]);

  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) {} setSavedSnap(JSON.stringify(st)); setJustSaved(true); setTimeout(() => setJustSaved(false), 2000); };
  const discard = () => { const s = load(); setSt(s); setSavedSnap(JSON.stringify(s)); };

  return (
    <div className="mb2">
      <header className={`mb2-head${hideHead ? " bare" : ""}`}>
        {!hideHead && (
          <div className="mb2-head-tx">
            <div className="mb2-eyebrow"><Icon name="scale" size={13} /> My baseline · {role === "offer" ? "as a provider" : "as a consumer"}</div>
            <h2 className="mb2-title">{info.title}</h2>
            <p className="mb2-lead">{info.lead}</p>
          </div>
        )}
        {!roleProp && (
          <div className="mb2-switch" role="tablist" aria-label="Baseline">
            <button type="button" role="tab" aria-selected={role === "offer"} className={role === "offer" ? "on" : ""} onClick={() => setRole("offer")}>Offer</button>
            <button type="button" role="tab" aria-selected={role === "acceptance"} className={role === "acceptance" ? "on" : ""} onClick={() => setRole("acceptance")}>Acceptance</button>
          </div>
        )}
      </header>

      <div className="mb2-coverage">
        <div className="mb2-cov-tx"><b>{setTotal} of {allFields.length} terms set</b><span>{negTotal} marked negotiable · {info.audience}</span></div>
        <div className="mb2-bar"><i style={{ width: `${pct}%` }} /></div>
        <span className="mb2-cov-pct">{pct}%</span>
      </div>

      <div className={`mb2-ds ${offDs.length === 0 ? "ok" : ""}`}>
        <span className="mb2-ds-ic"><Icon name={offDs.length === 0 ? "check" : "download"} size={16} /></span>
        <div className="mb2-ds-tx">
          <b>Data space defaults</b>
          <p>{offDs.length === 0
            ? `Your whole baseline matches the terms recommended by the ${DS_NAME}.`
            : `${offDs.length} of ${allFields.length} terms differ from the terms recommended by the ${DS_NAME}. Applying them is a safe starting point you can still edit term by term.`}</p>
        </div>
        {offDs.length > 0 && (
          <div className="mb2-ds-actions">
            <button type="button" className="mb2-ds-review" onClick={() => setDsOpen((o) => !o)} aria-expanded={dsOpen}>{dsOpen ? "Hide" : "Review"} differences</button>
            <button type="button" className="mb2-ds-apply" onClick={() => patch((s) => offDs.forEach((f) => applyDs(s, role, f.id)))}><Icon name="download" size={13} /> Apply all defaults</button>
          </div>
        )}
        {dsOpen && offDs.length > 0 && (
          <ul className="mb2-ds-list">
            {offDs.map((f) => (
              <li key={f.id}>
                <span className="dsl-name">{f.label}</span>
                <span className="dsl-vals"><i>Yours</i> {summaryOf(role, f, st) || "not set"} <span className="dsl-arrow">→</span> <i>Default</i> {dsSummaryOf(role, f) || "not set"}</span>
                <button type="button" className="mb2-link" onClick={() => patch((s) => applyDs(s, role, f.id))}>Use default</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb2-tools">
        <div className="mb2-search">
          <Icon name="search" size={15} />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a term…" aria-label="Search baseline terms" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="x" size={13} /></button>}
        </div>
        <div className="mb2-filters">
          {[["all", "All"], ["unset", "Not set"], ["custom", "Customised"], ["negotiable", "Negotiable"], ["fixed", "Non-negotiable"]].map(([id, label]) => (
            <button key={id} type="button" className={`mb2-fchip ${filter === id ? "on" : ""}`} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        <button type="button" className="mb2-expand" onClick={() => setOpenSecs(Object.fromEntries(MODULE_SECTIONS.map((s) => [s.id, !model.every((m) => isOpen(m.sec.id))])))}>
          {model.every((m) => isOpen(m.sec.id)) ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {searching && <p className="mb2-result">{matches} term{matches !== 1 ? "s" : ""} match{matches === 1 ? "es" : ""}{query.trim() ? ` “${query.trim()}”` : ""}.</p>}

      <div className="mb2-secs">
        {visible.length === 0 && <p className="mb2-empty">No term matches your search or filters.</p>}
        {visible.map(({ sec, fields, all }) => (
          <Section key={sec.id} sec={sec} role={role} fields={fields} all={all} st={st} patch={patch}
            open={isOpen(sec.id)} onToggle={() => setOpenSecs((o) => ({ ...o, [sec.id]: !isOpen(sec.id) }))}
            openRows={openRows} toggleRow={toggleRow} />
        ))}
      </div>

      <div className={`mb2-savebar ${dirty || justSaved ? "show" : ""} ${justSaved && !dirty ? "ok" : ""}`} aria-live="polite">
        {justSaved && !dirty
          ? <span className="mb2-save-tx"><Icon name="check" size={14} /> Baseline saved</span>
          : <>
              <span className="mb2-save-tx"><span className="mb2-dot" /> Unsaved changes</span>
              <div className="mb2-save-actions">
                <button type="button" className="mb2-btn ghost" onClick={discard}>Discard</button>
                <button type="button" className="mb2-btn primary" onClick={save}><Icon name="check" size={14} /> Save baseline</button>
              </div>
            </>}
      </div>
    </div>
  );
}
window.MyBaselineModuleV2 = MyBaselineModuleV2;
})();
