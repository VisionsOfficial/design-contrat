// VisionsTrust — Guided offer creation. A short 3-step flow whose centre of gravity is
// the dataspace-default quick-select: adopt a ready-made set of contractual terms in one
// click, then fine-tune only what matters. Keeps the AI assistant from the product.
(function () {
const { useState, useEffect, useRef, useMemo } = React;
const { Icon } = window.UI;
const { SECTIONS, ALL_FIELDS, PD, SERVICE_OFFERS, PERSONAL_DATA_DEFAULT } = window.OfferSettingsData;
const { clone, isEmpty, eq, fmtVal, sectionFields, Sel, ValueControl, TermRow } = window.CO;
const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle } = window;

const LS_KEY = "vt.createOffer.v1";
const STEPS = [
  { k: "Step 1", t: "Your offering", d: "Name, kind, description and the resources behind it." },
  { k: "Step 2", t: "Terms & pricing", d: "Contractual terms, price, policies and negotiation." },
];
const DRAFT_KEY = "vt.createOffer.draft.v1";
const loadDraft = () => { try { const r = localStorage.getItem(DRAFT_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } };
const agoLabel = (ts) => { const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return "just now"; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 24) return `${h} h ago`; return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
const CATEGORIES = ["Job Offers", "Skills & competencies", "Training & learning", "Data analytics", "HR & recruitment", "Other"];
const COUNTRIES = ["France", "Belgium", "Germany", "Netherlands", "Spain", "Italy", "European Union", "Worldwide"];

// Baseline choices — each applies a ready-made set of terms in one click, or opens the form.
const PROFILES = [
  { id: "dataspace", tag: "Recommended", icon: "layers", t: "Dataspace Template", d: "The balanced terms most participants already accept. A few key terms open to the agent.", meta: "Fastest to publish" },
  { id: "mine", icon: "user", t: "My Offer Template", d: "Your own saved provider defaults — stricter SLA and your pricing — reused across your offers.", meta: "Your saved defaults" },
  { id: "manual", icon: "sliders", t: "Configure every term manually", d: "Open the full form and set each term yourself, starting from the dataspace values.", meta: "Full control" },
];

// The provider's own saved baseline (from My baseline › provider role).
const MY_TERM_BASELINE = {
  delivery_deadline: { n: 3, u: "business days" }, availability: "99.9%", update_frequency: "Daily",
  response_time: { n: 300, u: "ms", b: "p95" }, retention_period: "Contract duration",
  support_channels: ["Email", "Ticketing portal", "Chat"], support_hours: "Extended 5×12",
  support_severity: { Critical: { n: 2, u: "h" }, High: { n: 4, u: "h" }, Medium: { n: 1, u: "business days" }, Low: { n: 3, u: "business days" } },
  contract_duration: { n: 24, u: "months" }, renewal_mode: "Automatic renewal", notice_nonrenewal: { n: 90, u: "days" },
  term_convenience: "Yes", notice_early: { n: 60, u: "days" },
  reversibility: { a: "Return + deletion + destruction certificate", b: "30 days" },
  subcontracting: "Prior written approval", security_incident: "48h", ip_outputs: "Provider retains all",
  governing_law: { a: "France", b: "Courts" }, force_majeure: "Standard + epidemic",
  audit_right: { a: "Audit on notice", b: "Annual" }, confidentiality: { a: "Mutual NDA", b: "5 years" },
};
const MY_PRICING = { sub: "200", billing: "Monthly", setup: "0", api: "0", currency: "EUR", model: "Subscription" };
const DS_PRICING = { sub: "0", billing: "One shot", setup: "60", api: "0", currency: "EUR", model: "Subscription" };
const MY_POLICIES = { time_period: true, notification: true };
const DS_POLICIES = { time_period: true, count: true };

// ─── STATE ────────────────────────────────────────────────────────────────
function seed() {
  const values = {}, neg = {};
  ALL_FIELDS.forEach((f) => { values[f.id] = clone(f.def); neg[f.id] = !!f.neg; });
  const penSec = SECTIONS.find((s) => s.id === "penalties");
  const rule0 = {}; penSec.fields.forEach((f) => { rule0[f.id] = clone(f.def); });
  return {
    kind: "Data",
    identity: { name: "", caption: "", desc: "", category: "", country: "" },
    values, neg,
    rules: [{ _id: "r1", ...rule0 }],
    penaltyNote: "",
    policies: {},
    pricing: { model: "Subscription", sub: "0", billing: "Monthly", setup: "0", api: "0", currency: "EUR", desc: "" },
    personalData: clone(PERSONAL_DATA_DEFAULT),
    autoAgent: true,
    baselineMode: "auto",
    agentNote: "I accept faster delivery and shorter notice periods. I will not go below 99% availability or accept unlimited liability.",
    profile: null,
  };
}
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) { const st = { ...seed(), ...JSON.parse(raw) }; if (st.profile && !PROFILES.some((p) => p.id === st.profile)) st.profile = null; return st; } } catch (e) {}
  return seed();
}

// A half-finished offer, as it looks when the provider comes back to it.
function draftSeed() {
  const s = seed();
  s.kind = "Data";
  s.identity = { name: "Skills Graph API", caption: "Aggregated, consent-governed skills profiles", desc: "", category: "Skills & competencies", country: "" };
  return s;
}
const DRAFT_FIELDS = [
  { k: "name", label: "Offer name" },
  { k: "caption", label: "Caption" },
  { k: "desc", label: "Description" },
  { k: "category", label: "Category" },
  { k: "country", label: "Country" },
];

function DraftBanner({ st, savedAt, step, onDiscard }) {
  const missing = DRAFT_FIELDS.filter((f) => !String(st.identity[f.k] || "").trim());
  const done = DRAFT_FIELDS.length - missing.length;
  const pct = Math.round((done / DRAFT_FIELDS.length) * 100);
  return (
    <div className="co-draftbar">
      <div className="co-draftbar-top">
        <span className="co-draftbar-pill"><Icon name="archive" size={13} /> Draft</span>
        <div className="co-draftbar-tx">
          <div className="co-draftbar-t">You are picking up an unfinished offer</div>
          <div className="co-draftbar-d">Last saved {agoLabel(savedAt)} · stopped on {STEPS[step].t.toLowerCase()} · nothing is public until you publish.</div>
        </div>
        <button type="button" className="co-draftbar-discard" onClick={onDiscard}><Icon name="trash" size={14} /> Discard draft</button>
      </div>
      <div className="co-draftbar-bar" aria-hidden="true"><i style={{ width: pct + "%" }} /></div>
      <div className="co-draftbar-meta">
        <span><b>{done}/{DRAFT_FIELDS.length}</b> essentials filled</span>
        {missing.length ? <span className="co-draftbar-miss">Still missing: {missing.map((m) => m.label).join(", ")}</span> : <span className="co-draftbar-ok"><Icon name="check" size={13} /> Essentials complete</span>}
      </div>
    </div>
  );
}

const NEGOTIABLE_FIELDS = ALL_FIELDS.filter((f) => f.type !== "date");
const recommendedNegCount = NEGOTIABLE_FIELDS.filter((f) => f.neg).length;

// ─── ESSENTIALS (Step 1) ────────────────────────────────────────────────────
function KindPicker({ kind, onChange }) {
  const cards = [
    { id: "Data", ic: <>0101<br />0110</>, t: "Data offer", d: "You expose a dataset. You declare its categories and which services may process it." },
    { id: "Service", ic: <Icon name="triggers" size={18} />, t: "Service offer", d: "You provide a service that processes data on a provider's behalf." },
  ];
  return (
    <div className="co-kind">
      {cards.map((c) => (
        <button key={c.id} type="button" className={`co-kind-card ${kind === c.id ? "on" : ""}`} onClick={() => onChange(c.id)} aria-pressed={kind === c.id}>
          <span className="co-kind-ic">{c.ic}</span>
          <span className="co-kind-tx"><span className="co-kind-t">{c.t}</span><span className="co-kind-d">{c.d}</span></span>
          <span className="co-kind-radio" />
        </button>
      ))}
    </div>
  );
}

function GuidePanel({ st }) {
  const id = st.identity;
  return (
    <aside className="co-guide" aria-label="VisionsTrust guide">
      <span className="co-guide-pill"><Icon name="help" size={14} /> VisionsTrust guide</span>
      <h3 className="co-guide-h">What is an offer ?</h3>
      <p className="co-guide-p">An offer on our platform is a detailed proposal for services or data that you make available to the community.</p>
      <h3 className="co-guide-h">What it looks like on the catalogue</h3>
      <div className="co-preview">
        <div className="co-pv-media"><span className={`co-pv-kind ${st.kind === "Service" ? "service" : ""}`}>{st.kind}</span><span className="co-pv-ph">offer picture</span></div>
        <div className="co-pv-body">
          <div className="co-pv-conn"><span className="co-pv-connic"><Icon name="endpoints" size={11} /></span>Full connected - For bilateral and project exchange</div>
          <div className="co-pv-title">{id.name || "Offer title"}</div>
          <div className="co-pv-desc">{id.caption || "Offer description"}</div>
        </div>
        <div className="co-pv-prov">
          <span className="co-pv-avatar" aria-hidden="true">ED</span>
          <span><span className="co-pv-by">proposed by</span><br /><span className="co-pv-name">Education data Provider</span></span>
        </div>
        <div className="co-pv-foot">
          <span className="co-pv-res">no resources in the offer</span>
          <span className="co-pv-btn">Discover <Icon name="arrowRight" size={13} /></span>
        </div>
      </div>
    </aside>
  );
}

function StepEssentials({ st, set }) {
  const id = st.identity;
  const upd = (k, v) => set((s) => { s.identity[k] = v; });
  return (
    <div className="co-main-inner">
      <h1 className="co-h1">Let's start creating your offer</h1>
      <p className="co-h1-sub">To launch your offer on the platform, please provide the necessary details that will capture the interest of your partners.</p>

      <div className="co-block">
        <div className="co-block-label">What kind of offer is this?</div>
        <KindPicker kind={st.kind} onChange={(v) => set((s) => { s.kind = v; s.personalData._kind = v; })} />
      </div>

      <div className="co-field">
        <label className="co-flabel">Offer name<em>*</em></label>
        <input className="co-in" value={id.name} placeholder="Ex: Customer Analytics Service" onChange={(e) => upd("name", e.target.value)} />
      </div>
      <div className="co-field">
        <label className="co-flabel">Offer caption<em>*</em></label>
        <input className="co-in" maxLength={69} value={id.caption} placeholder="Put in one sentence the value and uniqueness of your offer" onChange={(e) => upd("caption", e.target.value)} />
        <div className="co-fcount">{69 - (id.caption?.length || 0)} characters left</div>
      </div>
      <div className="co-field">
        <label className="co-flabel">Detailed offer description<em>*</em></label>
        <textarea className="co-ta" value={id.desc} placeholder="Mention the specifics of the proposed services or data, the benefits for users, and any other relevant details that could help potential partners understand the value of your offer…" onChange={(e) => upd("desc", e.target.value)} />
      </div>
      <div className="co-grid2">
        <div className="co-field">
          <label className="co-flabel">Category<em>*</em></label>
          <span className="co-selectw"><select value={id.category} onChange={(e) => upd("category", e.target.value)}><option value="">Browse</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select><Icon name="chevronDown" size={14} className="co-chev" /></span>
        </div>
        <div className="co-field">
          <label className="co-flabel">Country or region<em>*</em></label>
          <span className="co-selectw"><select value={id.country} onChange={(e) => upd("country", e.target.value)}><option value="">Browse</option>{COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}</select><Icon name="chevronDown" size={14} className="co-chev" /></span>
        </div>
      </div>
      <div className="co-field">
        <label className="co-flabel">Offer picture</label>
        <div className="co-drop" role="button" tabIndex={0}>
          <Icon name="upload" size={22} />
          <span className="co-drop-t">Drop your image or browse</span>
          <span className="co-drop-s">JPEG, PNG, SVG · recommended 280×120</span>
        </div>
      </div>

      <div className="co-block">
        <div className="co-block-label">What's in the offer?<span className="co-badge-warn" style={{ marginLeft: 4 }}>Required to publish</span></div>
        <div className="co-res-empty">
          <p>Add the {st.kind === "Data" ? "data resource" : "service resource"} your offer provides. You can reuse an existing resource from your tech space.</p>
          <div className="co-res-btns">
            <button type="button" className="os-add-btn"><Icon name="plus" size={14} /> Add {st.kind === "Data" ? "data" : "service"} resource</button>
            <button type="button" className="os-add-btn ghost"><Icon name="search" size={14} /> Browse existing</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BASELINE PICKER (Step 2, priority) ─────────────────────────────────────
// Clicking a card applies it straight away — no confirmation step. What appears below
// the row (preview vs. full form) is driven by which card is selected.
function DataspaceHero({ picked, onPick }) {
  const WHY = [
    { ic: "share", t: "Interoperable", d: "Your offer speaks the same terms as the rest of the dataspace." },
    { ic: "clock", t: "Faster deals", d: "Takers rarely contest the norm — the agent settles matching requests." },
    { ic: "refresh", t: "Always current", d: "Terms left on the default track future dataspace updates." },
  ];
  return (
    <div className="co-ds">
      <div className="co-ds-top">
        <span className="co-ds-badge"><Icon name="sparkle" size={12} /> Recommended way to start</span>
        <h2 className="co-ds-h">Set all your terms from the dataspace default</h2>
        <p className="co-ds-p">The dataspace publishes a ready-to-use set of contractual terms — pricing, service levels, usage policies, penalties, duration and negotiation — already aligned with what every participant on VisionsTrust expects. Adopt it in one click and publish in seconds. <b>Every value stays fully editable.</b></p>
      </div>
      <div className="co-ds-why">
        {WHY.map((w) => (
          <div className="co-ds-why-item" key={w.t}><div className="co-ds-why-t"><Icon name={w.ic} size={13} /> {w.t}</div><div className="co-ds-why-d">{w.d}</div></div>
        ))}
      </div>
      <div className="co-ds-pk">
        <div className="co-ds-pk-lab">Pick a starting point — applied instantly</div>
        <div className="co-presets">
          {PROFILES.map((p) => (
            <button key={p.id} type="button" className={`co-preset ${picked === p.id ? "on" : ""}`} onClick={() => onPick(p.id)} aria-pressed={picked === p.id}>
              {p.tag && <span className="co-preset-tag">{p.tag}</span>}
              <span className="co-preset-check"><Icon name="check" size={13} /></span>
              <span className="co-preset-ic"><Icon name={p.icon} size={17} /></span>
              <span className="co-preset-t">{p.t}</span>
              <span className="co-preset-d">{p.d}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── APPLIED-VALUES PREVIEW (shown under the row for the two baselines) ──────
const PREVIEW_SECTIONS = ["sla", "duration", "termination", "clauses"];
function BaselinePreview({ source, st, onEdit }) {
  const p = PROFILES.find((x) => x.id === source);
  const groups = [
    { label: "Pricing", icon: "coin", rows: [
      ["Pricing model", st.pricing.model],
      ["Subscription price", `${st.pricing.sub} ${st.pricing.currency}`],
      ["Billing period", st.pricing.billing],
      ["Setup fee", `${st.pricing.setup} ${st.pricing.currency}`],
    ] },
    { label: "Usage policies", icon: "shield", rows: [
      ["Policies applied", POLICIES.filter((x) => st.policies[x.id]).map((x) => x.t).join(", ") || "None"],
    ] },
    ...PREVIEW_SECTIONS.map((id) => {
      const s = SECTIONS.find((x) => x.id === id);
      return { label: s.title, icon: s.icon, rows: sectionFields(s).map((f) => [f.label, fmtVal(f, st.values[f.id])]) };
    }),
  ];
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  return (
    <div className="co-prev">
      <div className="co-prev-head">
        <span className="co-prev-ic"><Icon name="check" size={18} /></span>
        <div className="co-prev-tx">
          <div className="co-prev-t">“{p.t}” applied — {total} terms set</div>
          <div className="co-prev-d">These are the values now attached to your offer. Every one of them stays editable.</div>
        </div>
        <button type="button" className="co-prev-edit" onClick={onEdit}><Icon name="edit" size={13} /> Adjust terms</button>
      </div>
      <div className="co-prev-grid">
        {groups.map((g) => (
          <div className="co-prev-grp" key={g.label}>
            <div className="co-prev-grp-t"><Icon name={g.icon} size={13} /> {g.label}</div>
            {g.rows.map(([k, v]) => (
              <div className="co-prev-row" key={k}><span className="co-prev-k">{k}</span><span className="co-prev-v">{v || "—"}</span></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SECTION CARD ────────────────────────────────────────────────────────────
function SectionCard({ icon, title, summary, pills, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={`co-sec ${open ? "open" : ""}`}>
      <button type="button" className="co-sec-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="co-sec-ic"><Icon name={icon} size={17} /></span>
        <span className="co-sec-tx"><span className="co-sec-t">{title}</span>{summary && <span className="co-sec-sum">{summary}</span>}</span>
        {pills && <span className="co-sec-pills">{pills}</span>}
        <Icon name="chevronDown" size={17} className="co-sec-chev" />
      </button>
      {open && <div className="co-sec-body">{children}</div>}
    </div>
  );
}

function TermFields({ section, st, set }) {
  const renderField = (f) => (
    <TermRow key={f.id} field={f} value={st.values[f.id]} negotiable={st.neg[f.id]}
      onValue={(v) => set((s) => { s.values[f.id] = v; })} onNeg={(n) => set((s) => { s.neg[f.id] = n; })} />
  );
  if (section.groups) return <>{section.groups.map((g) => <div key={g.label}><div className="co-grouplab">{g.label}</div>{g.fields.map(renderField)}</div>)}</>;
  return <>{section.fields.map(renderField)}</>;
}

// ─── PRICING ──────────────────────────────────────────────────────────────
function PricingCard({ st, set }) {
  const p = st.pricing;
  const upd = (k, v) => set((s) => { s.pricing[k] = v; });
  const summary = `${p.sub} ${p.currency} · ${p.billing}${p.setup !== "0" ? ` · ${p.setup} ${p.currency} setup` : ""}`;
  return (
    <SectionCard icon="coin" title="Pricing" summary={summary}>
      <div className="os-form-grid" style={{ marginTop: 4 }}>
        <div><label className="os-flabel">Pricing model</label><Sel value={p.model} onChange={(v) => upd("model", v)} options={["Subscription", "One-shot", "Pay per API call", "Free"]} full /></div>
        <div><label className="os-flabel">Billing period</label><Sel value={p.billing} onChange={(v) => upd("billing", v)} options={["One shot", "Daily", "Monthly", "Yearly", "Per API call"]} full /></div>
        <div><label className="os-flabel">Subscription price</label><input className="os-in" style={{ width: "100%" }} value={p.sub} onChange={(e) => upd("sub", e.target.value)} /></div>
        <div><label className="os-flabel">Setup fee</label><input className="os-in" style={{ width: "100%" }} value={p.setup} onChange={(e) => upd("setup", e.target.value)} /></div>
        <div><label className="os-flabel">Cost per API call</label><input className="os-in" style={{ width: "100%" }} value={p.api} onChange={(e) => upd("api", e.target.value)} /></div>
        <div><label className="os-flabel">Currency</label><Sel value={p.currency} onChange={(v) => upd("currency", v)} options={["EUR", "USD", "GBP"]} full /></div>
        <div className="full"><label className="os-flabel">Pricing description <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>(optional)</span></label><textarea className="os-ta" placeholder="Anything clients should know about your pricing model." value={p.desc} onChange={(e) => upd("desc", e.target.value)} /></div>
      </div>
    </SectionCard>
  );
}

// ─── USAGE POLICIES ──────────────────────────────────────────────────────
const POLICIES = [
  { id: "no_restriction", t: "No restriction", d: "Can be used without any restriction" },
  { id: "time_period", t: "Time period", d: "Must be used within a specified time period" },
  { id: "count", t: "Count", d: "Must not be used more than n times" },
  { id: "notification", t: "Notification", d: "Can be used with a notification message" },
];
function PoliciesCard({ st, set }) {
  const on = POLICIES.filter((p) => st.policies[p.id]);
  return (
    <SectionCard icon="shield" title="Usage policies" summary={on.length ? on.map((p) => p.t).join(", ") : "No policy selected"}>
      <div className="os-policy-grid" style={{ marginTop: 8 }}>
        {POLICIES.map((pol) => { const sel = !!st.policies[pol.id]; return (
          <div key={pol.id} className={`os-policy ${sel ? "on" : ""}`}>
            <div className="os-policy-sel" role="button" tabIndex={0} aria-pressed={sel}
              onClick={() => set((s) => { s.policies[pol.id] = !s.policies[pol.id]; })}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); set((s) => { s.policies[pol.id] = !s.policies[pol.id]; }); } }}>
              <div className="pt">{pol.t}</div><div className="pd">{pol.d}</div>
            </div>
          </div>
        ); })}
      </div>
    </SectionCard>
  );
}

// ─── PENALTIES (repeatable rule) ────────────────────────────────────────────
function PenaltiesCard({ st, set }) {
  const sec = SECTIONS.find((s) => s.id === "penalties");
  return (
    <SectionCard icon="shield" title="Commitments & penalties" summary={`${st.rules.length} rule${st.rules.length > 1 ? "s" : ""}`}>
      {st.rules.map((rule, i) => (
        <div key={rule._id} style={{ border: "1px solid var(--border)", borderRadius: 10, marginTop: i ? 12 : 6, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--vui-color-secondary)" }}>Rule {i + 1}</span>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>· {rule.commitment_concerned}</span>
            {st.rules.length > 1 && <button type="button" className="os-mini-btn danger" style={{ marginLeft: "auto", height: 26 }} onClick={() => set((s) => { s.rules = s.rules.filter((r) => r._id !== rule._id); })}><Icon name="trash" size={12} /></button>}
          </div>
          <div style={{ padding: "2px 13px 6px" }}>
            {sec.fields.map((f) => (
              <TermRow key={f.id} field={f} value={rule[f.id]} negotiable={false}
                onValue={(v) => set((s) => { const r = s.rules.find((x) => x._id === rule._id); r[f.id] = v; })} onNeg={() => {}} />
            ))}
          </div>
        </div>
      ))}
      <div className="os-add-row"><button type="button" className="os-add-btn ghost" onClick={() => set((s) => { const r = { _id: "r" + Date.now() }; sec.fields.forEach((f) => { r[f.id] = clone(f.def); }); s.rules.push(r); })}><Icon name="plus" size={14} /> {sec.addLabel}</button></div>
    </SectionCard>
  );
}

// ─── NEGOTIATION ────────────────────────────────────────────────────────────
function NegotiationCard({ st, set }) {
  const negTotal = NEGOTIABLE_FIELDS.filter((f) => st.neg[f.id]).length;
  return (
    <SectionCard icon="triggers" title="Negotiation & acceptance" summary={`${negTotal} negotiable · agent ${st.autoAgent ? "on" : "off"}`}>
      <div className="co-ncrow">
        <div><div className="co-nc-t">Taker accepts your terms as published</div><div className="co-nc-d">What happens when someone subscribes at exactly your baseline terms.</div></div>
        <div className="seg2"><button type="button" className={st.baselineMode === "auto" ? "active teal" : ""} onClick={() => set((s) => { s.baselineMode = "auto"; })}><Icon name="check" size={13} /> Auto-accept</button><button type="button" className={st.baselineMode === "review" ? "active" : ""} onClick={() => set((s) => { s.baselineMode = "review"; })}><Icon name="eye" size={13} /> Review first</button></div>
      </div>
      <div className="co-ncrow">
        <div><div className="co-nc-t">Contract agent auto-negotiation</div><div className="co-nc-d">Let the agent settle negotiable terms automatically. Requests outside your limits still come to you.</div></div>
        <button type="button" className={`co-toggle ${st.autoAgent ? "on" : ""}`} aria-pressed={st.autoAgent} onClick={() => set((s) => { s.autoAgent = !s.autoAgent; })}><i /></button>
      </div>
      {st.autoAgent && (
        <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <div className="co-nc-t" style={{ marginBottom: 6 }}>Agent guidance note</div>
          <textarea className="os-ta" value={st.agentNote} onChange={(e) => set((s) => { s.agentNote = e.target.value; })} placeholder="Describe your negotiation stance…" />
        </div>
      )}
    </SectionCard>
  );
}

// ─── PERSONAL DATA (condensed) ──────────────────────────────────────────────
function PdChips({ options, value, onChange }) {
  const set = value || [];
  return <div className="os-chips" style={{ justifyContent: "flex-start" }}>{options.map((o) => { const on = set.includes(o); return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? set.filter((x) => x !== o) : [...set, o])}>{o}</button>; })}</div>;
}
function PersonalDataCard({ st, set }) {
  const pd = st.personalData;
  const isData = st.kind === "Data";
  const upd = (k, v) => set((s) => { s.personalData[k] = v; });
  const summary = pd.enabled ? "Personal data declared" : "No personal data";
  return (
    <SectionCard icon="lock" title="Personal data & GDPR" summary={summary}
      pills={pd.enabled ? <span className="co-badge-warn"><Icon name="lock" size={10} /> GDPR</span> : null}>
      <div className="co-ncrow" style={{ borderTop: "none" }}>
        <div><div className="co-nc-t">This offer involves personal data</div><div className="co-nc-d">Turn on when the {isData ? "dataset contains" : "service processes"} data relating to identifiable people. A short declaration is attached to every contract.</div></div>
        <button type="button" className={`co-toggle ${pd.enabled ? "on" : ""}`} aria-pressed={pd.enabled} onClick={() => upd("enabled", !pd.enabled)}><i /></button>
      </div>
      {!pd.enabled && <div className="pd-empty" style={{ marginTop: 4 }}><Icon name="check" size={16} /><span>No personal data — no additional GDPR obligations apply.</span></div>}
      {pd.enabled && (
        <div className="pd-form" style={{ marginTop: 12 }}>
          {isData ? <>
            <div><label className="os-flabel">Data controller<em>*</em></label><input className="os-in" style={{ width: "100%" }} value={pd.controller} placeholder="e.g. TECHNÈ SAS" onChange={(e) => upd("controller", e.target.value)} /></div>
            <div><label className="os-flabel">Legal basis<em>*</em></label><Sel value={pd.legalBasis} onChange={(v) => upd("legalBasis", v)} options={PD.legalBasis} full /></div>
            <div className="full"><label className="os-flabel">Categories of data subjects<em>*</em></label><PdChips options={PD.subjects} value={pd.subjectCategories} onChange={(v) => upd("subjectCategories", v)} /></div>
            <div className="full"><label className="os-flabel">Categories of personal data<em>*</em></label><PdChips options={PD.dataCats} value={pd.dataCategories} onChange={(v) => upd("dataCategories", v)} /></div>
            <div><label className="os-flabel">Retention & erasure<em>*</em></label><Sel value={pd.retention} onChange={(v) => upd("retention", v)} options={PD.retention} full /></div>
          </> : <>
            <div><label className="os-flabel">Role under the GDPR<em>*</em></label><Sel value={pd.role} onChange={(v) => upd("role", v)} options={PD.roles} full /></div>
            <div><label className="os-flabel">Data Processing Agreement<em>*</em></label><Sel value={pd.dpaSigned} onChange={(v) => upd("dpaSigned", v)} options={PD.dpa} full /></div>
            <div className="full"><label className="os-flabel">Processing purpose<em>*</em></label><textarea className="os-ta" value={pd.purpose} placeholder="What you will do with the personal data — bound by purpose limitation." onChange={(e) => upd("purpose", e.target.value)} /></div>
            <div className="full"><label className="os-flabel">Processing operations<em>*</em></label><PdChips options={PD.operations} value={pd.operations} onChange={(v) => upd("operations", v)} /></div>
          </>}
        </div>
      )}
    </SectionCard>
  );
}

// ─── STEP 2 ───────────────────────────────────────────────────────────────
function StepTerms({ st, set, applyProfile }) {
  const secSummary = (secId) => {
    const s = SECTIONS.find((x) => x.id === secId); const fl = sectionFields(s);
    const neg = fl.filter((f) => f.type !== "date" && st.neg[f.id]).length;
    const onDef = fl.filter((f) => !isEmpty(f.def) && eq(st.values[f.id], f.def)).length;
    return { neg, onDef, total: fl.length };
  };
  const pills = (secId) => {
    const { neg, onDef, total } = secSummary(secId);
    return <>{onDef === total && <span className="co-badge-def"><Icon name="check" size={10} /> On default</span>}{neg > 0 && <span className="co-badge-neg"><Icon name="triggers" size={10} /> {neg}</span>}</>;
  };
  const first = (secId) => { const s = SECTIONS.find((x) => x.id === secId); return sectionFields(s).slice(0, 3).map((f) => fmtVal(f, st.values[f.id])).join(" · "); };

  return (
    <div className="co-main-inner">
      <h1 className="co-h1">Terms &amp; pricing</h1>
      <p className="co-h1-sub">The terms your offer is published with. Start from the dataspace default — then change only what matters to you.</p>

      <DataspaceHero picked={st.profile} onPick={applyProfile} />

      <div className="co-below" key={st.profile || "none"}>
        {(st.profile === "dataspace" || st.profile === "mine") &&
          <BaselinePreview source={st.profile} st={st} onEdit={() => applyProfile("manual")} />}

        {st.profile === "manual" && (
          <>
            <PricingCard st={st} set={set} />
            <PoliciesCard st={st} set={set} />
            <SectionCard icon="clock" title="Service levels (SLA)" summary={first("sla")} pills={pills("sla")}><TermFields section={SECTIONS.find((s) => s.id === "sla")} st={st} set={set} /></SectionCard>
            <PenaltiesCard st={st} set={set} />
            <SectionCard icon="hourglass" title="Duration & renewal" summary={first("duration")} pills={pills("duration")}><TermFields section={SECTIONS.find((s) => s.id === "duration")} st={st} set={set} /></SectionCard>
            <SectionCard icon="danger" title="Termination" summary={first("termination")} pills={pills("termination")}><TermFields section={SECTIONS.find((s) => s.id === "termination")} st={st} set={set} /></SectionCard>
            <PersonalDataCard st={st} set={set} />
            <NegotiationCard st={st} set={set} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
function CreateOfferApp() {
  const [t, setTweak] = useTweaks({ offerKind: "Data", startStep: "1 · Offering", pdOn: false, pageState: "New offer" });
  const isDraft = t.pageState === "Resuming a draft";
  const [st, setSt] = useState(load);
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(false);
  const draft0 = loadDraft();
  const [savedAt, setSavedAt] = useState(draft0 ? draft0.savedAt : null);
  const [draftDismissed, setDraftDismissed] = useState(false);
  const [toast, setToast] = useState(false);

  const saveDraft = () => {
    const ts = Date.now();
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: ts, step, st })); } catch (e) {}
    setSavedAt(ts); setToast(true); setTimeout(() => setToast(false), 2600);
  };

  const set = (mut) => setSt((prev) => { const d = clone(prev); mut(d); return d; });

  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) {} }, [st]);
  // Mirror tweaks → state
  useEffect(() => { if (t.offerKind !== st.kind) set((s) => { s.kind = t.offerKind; s.personalData._kind = t.offerKind; }); }, [t.offerKind]);
  useEffect(() => { if (t.pdOn !== st.personalData.enabled) set((s) => { s.personalData.enabled = t.pdOn; }); }, [t.pdOn]);
  useEffect(() => { const n = { "1 · Offering": 0, "2 · Terms": 1 }[t.startStep]; if (n != null && n !== step) setStep(n); }, [t.startStep]);
  const firstRun = useRef(true);
  useEffect(() => {
    const first = firstRun.current; firstRun.current = false;
    setDraftDismissed(false);
    if (isDraft) { setSt(draftSeed()); setSavedAt(Date.now() - 2 * 864e5); }
    else if (!first) { setSt(seed()); setSavedAt(null); }
  }, [t.pageState]);

  const applyProfile = (id) => set((s) => {
    s.profile = id;
    if (id === "manual") return; // keep whatever is currently set; the form opens below
    ALL_FIELDS.forEach((f) => {
      s.values[f.id] = clone(id === "mine" && MY_TERM_BASELINE[f.id] !== undefined ? MY_TERM_BASELINE[f.id] : f.def);
      s.neg[f.id] = !!f.neg;
    });
    s.pricing = { ...s.pricing, ...(id === "mine" ? MY_PRICING : DS_PRICING) };
    s.policies = { ...(id === "mine" ? MY_POLICIES : DS_POLICIES) };
    s.autoAgent = true; s.baselineMode = "auto";
  });

  const canContinue = step === 0 ? !!st.identity.name.trim() : true;
  const goTo = (n) => setStep(n);

  return (
    <div className="co-shell">
      <header className="co-topbar">
        <div className="co-crumb"><a href="My Offers.html">My offers</a><span className="sep">/</span><b>Create</b>{isDraft && !draftDismissed && <span className="co-crumb-pill">Draft</span>}</div>
        <div className="co-top-actions">
          <button type="button" className="co-top-btn" aria-label="Basket"><Icon name="cart" size={18} /><span className="co-top-dot">2</span></button>
          <button type="button" className="co-top-btn" aria-label="Language"><Icon name="translate" size={18} /></button>
          <button type="button" className="co-top-help"><Icon name="help" size={16} /><span>Help</span></button>
          <button type="button" className="co-top-btn" aria-label="Notifications"><Icon name="bell" size={18} /><span className="co-top-dot">9</span></button>
          <button type="button" className="co-top-btn user" aria-label="Account"><Icon name="user" size={18} /></button>
        </div>
      </header>

      <div className="co-layout co-layout-v">
        <nav className="co-vsteps" aria-label="Progress">
          <div className="co-vsteps-label">Create an offer</div>
          {STEPS.map((s, i) => (
            <button key={s.k} type="button" className={`co-vstep ${i === step ? "active" : i < step ? "done" : ""}`} onClick={() => setStep(i)} disabled={i > step && !st.identity.name.trim()} aria-current={i === step ? "step" : undefined}>
              <span className="co-step-n">{i < step ? <Icon name="check" size={15} /> : i + 1}</span>
              <span className="co-vstep-tx"><span className="co-step-k">{s.k}</span><span className="co-step-t">{s.t}</span><span className="co-vstep-d">{s.d}</span></span>
            </button>
          ))}
          <div className="co-vsteps-draft">
            <button type="button" className="co-draft-btn" onClick={saveDraft}><Icon name="archive" size={14} /> Save as draft</button>
            <span className="co-draft-note">{savedAt ? `Draft saved ${agoLabel(savedAt)}` : "Nothing saved yet — you can come back later."}</span>
          </div>
          {step === 0 && <GuidePanel st={st} />}
        </nav>
        <div className="co-col">
          {isDraft && !draftDismissed && <DraftBanner st={st} savedAt={savedAt} step={step} onDiscard={() => { setDraftDismissed(true); setSt(seed()); setSavedAt(null); setStep(0); setTweak("pageState", "New offer"); }} />}
          <div className="co-main">
            {step === 0 && <StepEssentials st={st} set={set} />}
            {step === 1 && <StepTerms st={st} set={set} applyProfile={applyProfile} />}
          </div>
        </div>
      </div>

      <footer className="co-foot">
        <div className="co-foot-inner">
          {step > 0 ? <button type="button" className="co-btn ghost" onClick={() => setStep(step - 1)}><Icon name="chevronLeft" size={16} /> Back</button> : <span />}
          <span className="co-foot-hint"><Icon name="check" size={14} /> {savedAt ? `Draft saved ${agoLabel(savedAt)}` : "Progress saved automatically"}</span>
          <div className="co-foot-actions">
            <button type="button" className="co-btn ghost" onClick={saveDraft}><Icon name="archive" size={16} /> Save as draft</button>
            {step < STEPS.length - 1
              ? <button type="button" className="co-btn primary" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continue <Icon name="arrowRight" size={16} /></button>
              : <button type="button" className="co-btn publish" onClick={() => setPublished(true)}><Icon name="check" size={16} /> Publish offer</button>}
          </div>
        </div>
      </footer>

      {toast && <div className="co-toast" role="status"><Icon name="check" size={16} /> Draft saved — you can close this page and pick it up later.</div>}

      {published && (
        <div className="co-modal-bd" onClick={() => setPublished(false)}>
          <div className="co-modal" onClick={(e) => e.stopPropagation()}>
            <div className="co-modal-ic"><Icon name="check" size={30} /></div>
            <h2>Offer published 🎉</h2>
            <p>“{st.identity.name || "Your offer"}” is now live on the catalogue. Partners can discover it and the contract agent will handle negotiable terms for you.</p>
            <div className="co-modal-btns">
              <button type="button" className="co-btn ghost" onClick={() => setPublished(false)}>Keep editing</button>
              <a className="co-btn primary" href="My Offers.html">Go to my offers</a>
            </div>
          </div>
        </div>
      )}

      <TweaksPanel title="Create offer">
        <TweakSection label="Offer" />
        <TweakRadio label="Offer kind" value={t.offerKind} options={["Data", "Service"]} onChange={(v) => setTweak("offerKind", v)} />
        <TweakToggle label="Involves personal data" value={t.pdOn} onChange={(v) => setTweak("pdOn", v)} />
        <TweakSection label="Preview" />
        <TweakRadio label="Page state" value={t.pageState} options={["New offer", "Resuming a draft"]} onChange={(v) => setTweak("pageState", v)} />
        <TweakRadio label="Jump to step" value={t.startStep} options={["1 · Offering", "2 · Terms"]} onChange={(v) => setTweak("startStep", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CreateOfferApp />);
})();
