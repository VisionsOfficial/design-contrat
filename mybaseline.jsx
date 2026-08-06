// VisionsTrust — "My baseline" (23/07).
// A SELF-CONTAINED module: two baselines a user keeps, organised by the same
// sections as an offer. Drop <MyBaselineModule/> into My Contract / My Project /
// My Offer without rework — it only needs window.UI (Icon) + window.OfferSettingsData
// (+ window.BasketData for the acceptance thresholds). No host state required.
//
//   • My OFFER baseline  (provider role) — default terms applied to MY published
//     offers. This is the template "Adopt baseline › My baseline" pulls from in
//     Offer settings. Per field: default value + Negotiable toggle (same line).
//   • My ACCEPTANCE baseline (consumer role) — the terms I'm willing to accept when
//     negotiating others' offers. Drives the "gaps" in the basket. Per field: the
//     acceptable value/threshold + a collapsible acceptance range + Negotiable toggle.
(function () {
const { useState } = React;
const { Icon } = window.UI;
const { SECTIONS, AVAILABILITY, PD } = window.OfferSettingsData;
const USER_BASELINE = (window.BasketData && window.BasketData.USER_BASELINE) || {};

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const isEmpty = (v) => v === "" || v == null || (Array.isArray(v) && v.length === 0);
const LS_KEY = "vt.myBaseline.v1";

function fmtVal(field, v) {
  if (isEmpty(v)) return "—";
  switch (field.type) {
    case "numberUnit": case "money": return `${v.n}${v.u ? " " + v.u : (field.cur ? " EUR" : "")}${v.b ? " · " + v.b : ""}`;
    case "multiselect": return v.join(", ");
    case "opValue": return `${v.op} ${v.v}`;
    case "procDeadline": return !/Immediate/.test(v.p) && v.d != null ? `${v.p} · ${v.d}d` : v.p;
    case "matrix": return Object.entries(v).map(([k, x]) => `${k} ${x.n}${x.u}`).join(" · ");
    default: return String(v);
  }
}

// ─── SECTION MODEL (same 8 sections as an offer) ─────────────────────────────
const MODULE_SECTIONS = [
  { id: "content", name: "Offer content", icon: "database" },
  { id: "pricing", name: "Pricing", icon: "coin" },
  { id: "policies", name: "Usage policies", icon: "shield" },
  { id: "personal", name: "Personal data", icon: "lock" },
  { id: "sla", name: "Service levels", icon: "clock" },
  { id: "penalties", name: "Commitments & penalties", icon: "shield" },
  { id: "duration", name: "Duration & renewal", icon: "hourglass" },
  { id: "termination", name: "Termination", icon: "danger" },
];
const termFields = (secId) => { const s = SECTIONS.find((x) => x.id === secId); return s ? (s.fields || (s.groups || []).flatMap((g) => g.fields)) : []; };

// Non-schema (content/pricing/policies/personal) field descriptors for the OFFER baseline.
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
const offerFields = (secId) => secId === "content" ? [] : (OFFER_EXTRA[secId] || termFields(secId));

// Acceptance-baseline field descriptors (consumer). Term sections derive from the
// user's saved USER_BASELINE thresholds; the rest are role-specific extras.
const ACC_EXTRA = {
  pricing: [
    { id: "acc_sub", label: "Maximum subscription price", meaning: "The most you'll pay in subscription before it's a gap.", kind: "num", op: "≤", v: 500, unit: "EUR / mo" },
    { id: "acc_setup", label: "Maximum setup fee", meaning: "The most you'll pay as a one-off setup fee.", kind: "num", op: "≤", v: 200, unit: "EUR" },
  ],
  policies: [
    { id: "acc_pol", label: "Usage policies I accept", meaning: "Policies you're willing to operate under.", kind: "set", set: ["Time Period", "Count", "Notification message"], options: ["No Restriction", "Time Period", "Count", "Notification message"] },
  ],
  personal: [
    { id: "acc_dpa", label: "Signed DPA required", meaning: "You require a signed Data Processing Agreement.", kind: "bool", v: "Yes" },
    { id: "acc_safe", label: "Accepted transfer safeguards", meaning: "Cross-border transfer safeguards you accept.", kind: "set", set: ["Adequacy decision", "Standard Contractual Clauses (SCC)"], options: PD.transferSafeguards },
  ],
  penalties: [
    { id: "acc_pen", label: "Require a penalty backing availability", meaning: "You require a service credit / penalty when uptime is missed.", kind: "bool", v: "Yes" },
    { id: "acc_credit", label: "Minimum service credit", meaning: "Smallest acceptable credit when a commitment is missed.", kind: "num", op: "≥", v: 5, unit: "% of period fee" },
  ],
};
const kindOf = (op) => op === "≥tier" ? "tier" : (op === "in" || op === "includesAll") ? "set" : op === "=" ? "bool" : "num";
function accFields(secId) {
  if (ACC_EXTRA[secId] && !["sla", "duration", "termination"].includes(secId)) return ACC_EXTRA[secId];
  // term sections → build from USER_BASELINE
  return termFields(secId).filter((f) => USER_BASELINE[f.id]).map((f) => {
    const b = USER_BASELINE[f.id];
    const kind = kindOf(b.op);
    return { id: f.id, label: f.label, meaning: f.meaning, kind, op: b.op === "≥tier" ? "≥" : b.op, v: kind === "set" ? undefined : b.v, set: kind === "set" ? clone(b.v) : undefined, options: f.options, unit: (f.def && f.def.u) || (f.units && f.units[0]) || "", human: b.label };
  });
}

// ─── SEED STATE ──────────────────────────────────────────────────────────────
function seed() {
  const offerVals = {}, offerNeg = {};
  MODULE_SECTIONS.forEach((sec) => offerFields(sec.id).forEach((f) => { offerVals[f.id] = clone(f.def); offerNeg[f.id] = !!f.neg; }));
  const acc = {}, accNeg = {};
  MODULE_SECTIONS.forEach((sec) => accFields(sec.id).forEach((f) => { acc[f.id] = { op: f.op, v: f.v, v2: undefined, set: f.set ? clone(f.set) : undefined, kind: f.kind, unit: f.unit }; accNeg[f.id] = true; }));
  return { offerVals, offerNeg, acc, accNeg };
}
function load() { try { const raw = localStorage.getItem(LS_KEY); if (raw) { const s = seed(); const j = JSON.parse(raw); return { ...s, ...j }; } } catch (e) {} return seed(); }

// ─── SHARED CONTROLS ─────────────────────────────────────────────────────────
const Seg = ({ value, options, onChange }) => (
  <div className="mb-seg">{options.map((o) => <button key={o} type="button" className={value === o ? "on" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>
);
const Chips = ({ value, options, onChange }) => (
  <div className="mb-chips">{options.map((o) => { const on = (value || []).includes(o); return <button key={o} type="button" className={`mb-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])}>{o}</button>; })}</div>
);
const NumIn = ({ value, onChange, w }) => <input type="number" className="mb-num" style={w ? { width: w } : undefined} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;

const NegToggle = ({ on, onToggle }) => (
  <button type="button" className={`mb-neg ${on ? "on" : ""}`} aria-pressed={on} onClick={onToggle}><span className="mb-mt"><i /></span>Negotiable</button>
);

function OfferValue({ field, value, onChange }) {
  switch (field.type) {
    case "text": return <input className="mb-in" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "textarea": return <textarea className="mb-ta" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "date": return <input type="date" className="mb-in" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "yesno": return <Seg value={value} options={["Yes", "No"]} onChange={onChange} />;
    case "select": return <Seg value={value} options={field.options} onChange={onChange} />;
    case "multiselect": return <Chips value={value} options={field.options} onChange={onChange} />;
    case "money": return <span className="mb-inline"><NumIn value={value?.n} onChange={(n) => onChange({ ...value, n })} w={92} /><span className="mb-unit">EUR</span></span>;
    case "numberUnit": return <span className="mb-inline"><NumIn value={value?.n} onChange={(n) => onChange({ ...value, n })} />{field.units && field.units.length > 1 ? <Seg value={value?.u} options={field.units} onChange={(u) => onChange({ ...value, u })} /> : <span className="mb-unit">{value?.u || (field.units && field.units[0])}</span>}{field.basis && <Seg value={value?.b} options={field.basis} onChange={(b) => onChange({ ...value, b })} />}</span>;
    case "opValue": return <span className="mb-inline"><Seg value={value?.op} options={field.operators} onChange={(op) => onChange({ ...value, op })} /><input className="mb-in sm" value={value?.v || ""} onChange={(e) => onChange({ ...value, v: e.target.value })} /></span>;
    case "procDeadline": { const showDays = !/Immediate/.test(value?.p || ""); return <span className="mb-inline"><Seg value={value?.p} options={field.options} onChange={(p) => onChange({ ...value, p })} />{showDays && <><NumIn value={value?.d} onChange={(d) => onChange({ ...value, d })} /><span className="mb-unit">days</span></>}</span>; }
    case "matrix": return <div className="mb-matrix">{field.rows.map((r) => <div className="mb-mrow" key={r}><span className="mb-mkey">{r}</span><span className="mb-inline"><NumIn value={value?.[r]?.n} onChange={(n) => onChange({ ...value, [r]: { ...value[r], n } })} /><Seg value={value?.[r]?.u} options={field.units} onChange={(u) => onChange({ ...value, [r]: { ...value[r], u } })} /></span></div>)}</div>;
    default: return <span className="mb-unit">{fmtVal(field, value)}</span>;
  }
}

const isFullOffer = (f) => ["textarea", "matrix", "multiselect"].includes(f.type) || (f.type === "select" && (f.options || []).length > 4);

// ─── OFFER-BASELINE FIELD CARD ───────────────────────────────────────────────
function OfferCard({ field, value, neg, onValue, onNeg }) {
  const canNeg = field.type !== "date";
  const full = isFullOffer(field);
  const ctrl = <OfferValue field={field} value={value} onChange={onValue} />;
  const negEl = canNeg ? <NegToggle on={neg} onToggle={onNeg} /> : null;
  return (
    <div className={`mb-card ${full ? "full" : ""} ${neg && canNeg ? "is-neg" : ""}`}>
      <div className="mb-line">
        <div className="mb-name">{field.label}<span className="mb-info" title={field.meaning}><Icon name="info" size={13} /></span></div>
        {full ? (negEl && <span className="mb-line-neg">{negEl}</span>) : <div className="mb-ctrls"><div className="mb-val">{ctrl}</div>{negEl}</div>}
      </div>
      {full && <div className="mb-val fullw">{ctrl}</div>}
    </div>
  );
}

// ─── ACCEPTANCE-BASELINE FIELD CARD ──────────────────────────────────────────
function accSummary(a, field) {
  if (a.kind === "bool") return a.v === "Yes" ? "Required" : "Not required";
  if (a.kind === "set") return (a.set && a.set.length) ? `Accepts: ${a.set.join(", ")}` : "Nothing accepted yet";
  if (a.kind === "tier") return `At least ${a.v}`;
  const bound = a.op === "≤" ? "At most" : "At least";
  return `${bound} ${a.v}${a.unit ? " " + a.unit : ""}${!isEmpty(a.v2) ? ` · and ${a.op === "≤" ? "at least" : "at most"} ${a.v2}` : ""}`;
}
function AcceptCard({ field, acc, neg, onAcc, onNeg }) {
  const [open, setOpen] = useState(false);
  const a = acc;
  const editor = () => {
    if (a.kind === "bool") return <Seg value={a.v} options={["Yes", "No"]} onChange={(v) => onAcc({ ...a, v })} />;
    if (a.kind === "set") return <Chips value={a.set} options={field.options} onChange={(set) => onAcc({ ...a, set })} />;
    if (a.kind === "tier") return <Seg value={a.v} options={AVAILABILITY} onChange={(v) => onAcc({ ...a, v })} />;
    // num — editable min/max range
    return (
      <div className="mb-range">
        <Seg value={a.op} options={["≥", "≤"]} onChange={(op) => onAcc({ ...a, op })} />
        <span className="mb-inline"><NumIn value={a.v} onChange={(v) => onAcc({ ...a, v })} />{a.unit && <span className="mb-unit">{a.unit}</span>}</span>
        <span className="mb-range-and">and {a.op === "≤" ? "at least" : "at most"} <span className="mb-range-opt">(optional)</span></span>
        <span className="mb-inline"><NumIn value={a.v2} onChange={(v2) => onAcc({ ...a, v2 })} />{a.unit && <span className="mb-unit">{a.unit}</span>}</span>
      </div>
    );
  };
  return (
    <div className={`mb-card acc ${neg ? "is-neg" : ""}`}>
      <div className="mb-line">
        <div className="mb-name">{field.label}<span className="mb-info" title={field.meaning}><Icon name="info" size={13} /></span></div>
        <div className="mb-ctrls">
          <span className="mb-acc-sum"><Icon name="check" size={12} /> {accSummary(a, field)}</span>
          <NegToggle on={neg} onToggle={onNeg} />
        </div>
      </div>
      <div className="mb-acc-foot">
        <button type="button" className="mb-acc-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <Icon name={open ? "chevronUp" : "chevronDown"} size={13} /> <span>Acceptance range</span>
        </button>
      </div>
      {open && <div className="mb-acc-body">{editor()}</div>}
    </div>
  );
}

// ─── EMPTY STATE (content section) ───────────────────────────────────────────
const ContentNote = ({ role }) => (
  <div className="mb-note"><Icon name="database" size={16} />
    <span>{role === "offer"
      ? "Offer content (the resources you expose) is defined per offer, not by a reusable baseline. Everything below is the template your offers start from."
      : "Content isn't part of an acceptance baseline — you assess each offer's actual resources when you review it. The terms below are what you check against."}</span>
  </div>
);

// ─── SECTION CARD ────────────────────────────────────────────────────────────
function SectionCard({ sec, role, st, patch }) {
  const fields = role === "offer" ? offerFields(sec.id) : accFields(sec.id);
  return (
    <section className="mb-sec">
      <header className="mb-sec-head"><span className="mb-sec-ic"><Icon name={sec.icon} size={15} /></span><h3>{sec.name}</h3></header>
      <div className="mb-sec-body">
        {sec.id === "content"
          ? <ContentNote role={role} />
          : fields.length === 0
            ? <div className="mb-note"><Icon name="info" size={15} /><span>No baseline terms in this section.</span></div>
            : role === "offer"
              ? fields.map((f) => <OfferCard key={f.id} field={f} value={st.offerVals[f.id]} neg={st.offerNeg[f.id]} onValue={(v) => patch((s) => { s.offerVals[f.id] = v; })} onNeg={() => patch((s) => { s.offerNeg[f.id] = !s.offerNeg[f.id]; })} />)
              : fields.map((f) => <AcceptCard key={f.id} field={f} acc={st.acc[f.id]} neg={st.accNeg[f.id]} onAcc={(a) => patch((s) => { s.acc[f.id] = a; })} onNeg={() => patch((s) => { s.accNeg[f.id] = !s.accNeg[f.id]; })} />)}
      </div>
    </section>
  );
}

// ─── ROLE EXPLAINER ──────────────────────────────────────────────────────────
const ROLE_INFO = {
  offer: { icon: "offers", tag: "Provider role", title: "My offer baseline", lead: "The default terms applied to the offers you publish. This is the template “Adopt baseline › My baseline” pulls from in Offer settings — set a value once and reuse it across every offer.", chip: "Applies to offers you sell" },
  acceptance: { icon: "cart", tag: "Consumer role", title: "My acceptance baseline", lead: "The terms you're willing to accept when negotiating other providers' offers. Any offered value outside your range is flagged as a “gap” in your basket. Providers never see this — it only guides you.", chip: "Applies to offers you consume" },
};

// ─── SELF-CONTAINED MODULE ───────────────────────────────────────────────────
function MyBaselineModule({ embedded }) {
  const [role, setRole] = useState("offer");
  const [st, setSt] = useState(load);
  const [saved, setSaved] = useState(false);
  const patch = (m) => setSt((prev) => { const d = clone(prev); m(d); return d; });
  const persist = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) {} setSaved(true); setTimeout(() => setSaved(false), 1600); };
  const reset = () => setSt(seed());
  const info = ROLE_INFO[role];

  return (
    <div className={`mb-module ${embedded ? "embedded" : ""}`}>
      <div className="mb-intro">
        <h2 className="mb-title">My baseline</h2>
        <p className="mb-sub">You keep two distinct baselines. They're what feeds the “Adopt baseline” action when you build an offer, and the “gaps” check when you review someone else's.</p>
      </div>

      {/* Role tabs — the two baselines, unambiguously separated */}
      <div className="mb-tabs" role="tablist" aria-label="Baseline role">
        <button type="button" role="tab" aria-selected={role === "offer"} className={`mb-tab ${role === "offer" ? "active" : ""}`} onClick={() => setRole("offer")}>
          <span className="mb-tab-ic"><Icon name="offers" size={16} /></span>
          <span className="mb-tab-tx"><span className="mb-tab-t">My offer baseline</span><span className="mb-tab-d">Provider · terms I apply to my offers</span></span>
        </button>
        <button type="button" role="tab" aria-selected={role === "acceptance"} className={`mb-tab ${role === "acceptance" ? "active" : ""}`} onClick={() => setRole("acceptance")}>
          <span className="mb-tab-ic"><Icon name="cart" size={16} /></span>
          <span className="mb-tab-tx"><span className="mb-tab-t">My acceptance baseline</span><span className="mb-tab-d">Consumer · terms I accept from others</span></span>
        </button>
      </div>

      {/* Role explainer */}
      <div className={`mb-role ${role}`}>
        <span className="mb-role-ic"><Icon name={info.icon} size={18} /></span>
        <div className="mb-role-tx">
          <div className="mb-role-h"><b>{info.title}</b><span className="mb-role-tag">{info.tag}</span></div>
          <p>{info.lead}</p>
        </div>
        <span className="mb-role-chip">{info.chip}</span>
      </div>

      {/* Sections */}
      <div className="mb-sections">
        {MODULE_SECTIONS.map((sec) => <SectionCard key={sec.id} sec={sec} role={role} st={st} patch={patch} />)}
      </div>

      <div className="mb-foot">
        <span className="mb-foot-txt">{saved ? <b>✓ Baseline saved</b> : "Changes are kept on this device · Save to persist."}</span>
        <div className="mb-foot-actions">
          <button type="button" className="mb-btn ghost" onClick={reset}>Reset</button>
          <button type="button" className="mb-btn primary" onClick={persist}><Icon name="check" size={14} /> Save baseline</button>
        </div>
      </div>
    </div>
  );
}
window.MyBaselineModule = MyBaselineModule;

// ─── HOST PAGE (navigation based on My Contract) ─────────────────────────────
const { AppSidebar, BottomNav, BottomNavSheet } = window.UI;
const CT_LINK = "My Contracts.html";
const CT_NAV = [
  { group: "Baseline", items: [{ id: "baseline", label: "My baseline", icon: "scale", active: true }] },
  { group: "Contracts", items: [
    { id: "overview", label: "Overview", icon: "chart", href: CT_LINK },
    { id: "all", label: "All contracts", icon: "contracts", href: CT_LINK },
    { id: "needs", label: "Awaiting you", icon: "pen", href: CT_LINK },
  ] },
];

function BaselineHostApp() {
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <div className="app ui-v2 contracts-app">
      <a href="#mb-main" className="skip-link">Skip to content</a>
      <AppSidebar variant="v2" activeId="contracts" />
      <div className="main">
        <header className="topbar cat-topbar">
          <div className="topbar-left">
            <button type="button" className="icon-btn ghost only-mobile" onClick={() => setNavOpen(true)} aria-label="Open menu"><Icon name="contracts" size={18} /></button>
            <div className="page-title"><Icon name="contracts" size={20} /><h1>My Contracts</h1></div>
          </div>
          <div className="topbar-right">
            <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16} /><span>Help</span></button>
            <button type="button" className="icon-btn ghost notif" aria-label="Notifications, 25 unread"><Icon name="bell" size={18} /><span className="notif-dot" aria-hidden="true">25</span></button>
            <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18} /></button>
          </div>
        </header>

        <div className="page">
          <div className={`settings-nav-wrap ${navOpen ? "open" : ""}`}>
            <nav className={`settings-nav ${collapsed ? "is-collapsed" : ""} view-manage`} aria-label="My Contracts">
              <div className="settings-nav-header">
                <div className="snav-title-row">
                  <div className="snav-title"><Icon name="contracts" size={16} />{!collapsed && <span>Manage</span>}</div>
                  <button type="button" className="snav-collapse-btn" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? "Expand" : "Collapse"}><Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={14} /></button>
                </div>
              </div>
              <div className="settings-nav-scroll">
                {CT_NAV.map((g) => (
                  <div className="nav-group" key={g.group}>
                    {!collapsed && <div className="nav-group-label">{g.group}</div>}
                    {collapsed && <div className="nav-group-divider" aria-hidden="true" />}
                    {g.items.map((it) => it.href
                      ? <a key={it.id} className="nav-item" href={it.href} aria-label={collapsed ? it.label : undefined}><Icon name={it.icon} size={16} />{!collapsed && <span className="nav-item-label">{it.label}</span>}</a>
                      : <button key={it.id} type="button" className={`nav-item ${it.active ? "active" : ""}`} aria-current={it.active ? "true" : undefined} aria-label={collapsed ? it.label : undefined}><Icon name={it.icon} size={16} />{!collapsed && <span className="nav-item-label">{it.label}</span>}</button>)}
                  </div>
                ))}
              </div>
            </nav>
            {navOpen && <div className="settings-nav-scrim" onClick={() => setNavOpen(false)} />}
          </div>

          <main className="content ct-content" id="mb-main" tabIndex={-1}>
            <div className="ct-inner"><MyBaselineModule /></div>
          </main>
        </div>
      </div>

      <BottomNav onOpenMore={() => setMoreOpen(true)} />
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<BaselineHostApp />);
})();
