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
  { k: "Step 1", t: "Your offering" },
  { k: "Step 2", t: "Terms & pricing" },
  { k: "Step 3", t: "Review & publish" },
];
const CATEGORIES = ["Job Offers", "Skills & competencies", "Training & learning", "Data analytics", "HR & recruitment", "Other"];
const COUNTRIES = ["France", "Belgium", "Germany", "Netherlands", "Spain", "Italy", "European Union", "Worldwide"];

// Quick-select profiles — each is a one-click transformation of the dataspace baseline.
const PROFILES = [
  { id: "recommended", tag: "Recommended", icon: "layers", t: "Dataspace default", d: "The balanced terms most participants already accept. A few key terms open to the agent.", meta: "Fastest to publish" },
  { id: "open", icon: "triggers", t: "Open & fast", d: "Maximise auto-negotiation — the contract agent settles most terms so deals close on their own.", meta: "Most terms negotiable" },
  { id: "strict", icon: "lock", t: "Strict & fixed", d: "Every term fixed exactly as published. Full control, no automatic negotiation.", meta: "All terms fixed" },
];

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
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return { ...seed(), ...JSON.parse(raw) }; } catch (e) {}
  return seed();
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

function StepEssentials({ st, set }) {
  const id = st.identity;
  const upd = (k, v) => set((s) => { s.identity[k] = v; });
  return (
    <div className="co-main-inner">
      <h1 className="co-h1">Let's start creating your offer</h1>
      <p className="co-h1-sub">Tell partners what you're offering. A few essentials now — the AI assistant on the right can draft them for you from a document or a link.</p>

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

// ─── DATASPACE DEFAULT HERO (Step 2, priority) ──────────────────────────────
function DataspaceHero({ onAdopt, onManual }) {
  const [picked, setPicked] = useState("recommended");
  const WHY = [
    { ic: "share", t: "Interoperable", d: "Your offer speaks the same terms as the rest of the dataspace." },
    { ic: "clock", t: "Faster deals", d: "Takers rarely contest the norm — the agent settles matching requests." },
    { ic: "refresh", t: "Always current", d: "Terms left on the default track future dataspace updates." },
  ];
  const negFor = (id) => id === "open" ? NEGOTIABLE_FIELDS.length : id === "strict" ? 0 : recommendedNegCount;
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
        <div className="co-ds-pk-lab">Quick select — pick a starting profile</div>
        <div className="co-presets">
          {PROFILES.map((p) => (
            <button key={p.id} type="button" className={`co-preset ${picked === p.id ? "on" : ""}`} onClick={() => setPicked(p.id)} aria-pressed={picked === p.id}>
              {p.tag && <span className="co-preset-tag">{p.tag}</span>}
              <span className="co-preset-check"><Icon name="check" size={13} /></span>
              <span className="co-preset-ic"><Icon name={p.icon} size={17} /></span>
              <span className="co-preset-t">{p.t}</span>
              <span className="co-preset-d">{p.d}</span>
              <span className="co-preset-meta"><Icon name="triggers" size={10} /> {negFor(p.id)} of {NEGOTIABLE_FIELDS.length} terms negotiable</span>
            </button>
          ))}
        </div>
      </div>
      <div className="co-ds-foot">
        <button type="button" className="co-ds-apply" onClick={() => onAdopt(picked)}><Icon name="check" size={17} /> Adopt “{PROFILES.find((p) => p.id === picked).t}” &amp; continue</button>
        <button type="button" className="co-ds-manual" onClick={onManual}>Or configure every term manually</button>
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
function StepTerms({ st, set, applyProfile, resetProfile }) {
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
  const profileName = st.profile && st.profile !== "manual" ? PROFILES.find((p) => p.id === st.profile)?.t : null;

  return (
    <div className="co-main-inner">
      <h1 className="co-h1">Terms &amp; pricing</h1>
      <p className="co-h1-sub">The terms your offer is published with. Start from the dataspace default — then change only what matters to you.</p>

      {!st.profile && <DataspaceHero onAdopt={applyProfile} onManual={() => applyProfile("manual")} />}

      {st.profile && (
        <>
          <div className="co-applied">
            <span className="co-applied-ic"><Icon name="check" size={20} /></span>
            <div className="co-applied-main">
              <div className="co-applied-t">{profileName ? `“${profileName}” terms applied` : "Configuring terms manually"}</div>
              <div className="co-applied-d">{profileName ? "Every contractual term is set from the dataspace default. Open any section below to adjust it — or continue straight to review." : "All terms start from the dataspace default. Adjust anything below."}</div>
            </div>
            <button type="button" className="co-applied-change" onClick={resetProfile}><Icon name="refresh" size={13} /> Change</button>
          </div>

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
  );
}

// ─── STEP 3 — REVIEW ────────────────────────────────────────────────────────
function StepReview({ st, goTo }) {
  const id = st.identity;
  const p = st.pricing;
  const negTotal = NEGOTIABLE_FIELDS.filter((f) => st.neg[f.id]).length;
  const selPol = POLICIES.filter((x) => st.policies[x.id]);
  const negTag = <span className="co-rev-neg"><Icon name="triggers" size={9} /> Neg.</span>;
  const Item = ({ k, children }) => <div className="co-rev-item"><span className="co-rev-k">{k}</span><span className="co-rev-v">{children}</span></div>;
  const Sec = ({ icon, title, step, children }) => (
    <div className="co-rev-sec">
      <div className="co-rev-head"><span className="co-rev-ic"><Icon name={icon} size={15} /></span><span className="co-rev-h">{title}</span><button type="button" className="co-rev-edit" onClick={() => goTo(step)}><Icon name="edit" size={12} /> Edit</button></div>
      <div className="co-rev-grid">{children}</div>
    </div>
  );
  const termItems = (secId) => { const s = SECTIONS.find((x) => x.id === secId); return sectionFields(s).map((f) => <Item key={f.id} k={f.label}>{fmtVal(f, st.values[f.id])}{f.type !== "date" && st.neg[f.id] && negTag}</Item>); };

  return (
    <div className="co-main-inner">
      <h1 className="co-h1">Review &amp; publish</h1>
      <p className="co-h1-sub">A last look before your offer goes live on the catalogue. Edit any section, or publish now.</p>
      <div className="co-rev">
        <div className="co-rev-hero">
          <div className="co-rev-logo">{id.name ? id.name.slice(0, 4).toUpperCase() : "TECHNÈ"}</div>
          <div className="co-rev-main">
            <h2 className="co-rev-title">{id.name || "Untitled offer"}<span className={`os-kind-pill ${st.kind === "Service" ? "svc" : "data"}`}>{st.kind === "Service" ? <Icon name="triggers" size={12} /> : <Icon name="database" size={12} />} {st.kind}</span>{st.personalData.enabled && <span className="os-kind-pill pd"><Icon name="lock" size={11} /> Personal data</span>}</h2>
            <p className="co-rev-sub">{id.caption || "No caption yet."}</p>
          </div>
        </div>

        <Sec icon="user" title="Offering" step={0}>
          <Item k="Name">{id.name || "—"}</Item>
          <Item k="Category">{id.category || "—"}</Item>
          <Item k="Country / region">{id.country || "—"}</Item>
          <Item k="Description">{id.desc ? (id.desc.length > 80 ? id.desc.slice(0, 80) + "…" : id.desc) : "—"}</Item>
        </Sec>
        <Sec icon="coin" title="Pricing" step={1}>
          <Item k="Subscription">{p.sub} {p.currency} · {p.billing}</Item>
          <Item k="Setup fee">{p.setup} {p.currency}</Item>
          <Item k="Cost per API call">{p.api} {p.currency}</Item>
        </Sec>
        <Sec icon="shield" title="Usage policies" step={1}>
          {selPol.length ? <div className="os-ov-tags" style={{ padding: "6px 0" }}>{selPol.map((x) => <span key={x.id} className="pill pill-primary">{x.t}</span>)}</div> : <div className="os-ov-empty">No policy selected.</div>}
        </Sec>
        <Sec icon="clock" title="Service levels (SLA)" step={1}>{termItems("sla")}</Sec>
        <Sec icon="shield" title="Commitments & penalties" step={1}>
          {st.rules.map((r, i) => <Item key={r._id} k={`Rule ${i + 1}`}>{r.commitment_concerned} → {r.consequence_type}</Item>)}
        </Sec>
        <Sec icon="hourglass" title="Duration & renewal" step={1}>{termItems("duration")}</Sec>
        <Sec icon="danger" title="Termination" step={1}>{termItems("termination")}</Sec>
        <Sec icon="lock" title="Personal data & GDPR" step={1}>
          {!st.personalData.enabled ? <div className="os-ov-empty">No personal data — no additional obligations.</div> : st.kind === "Data"
            ? <><Item k="Controller">{st.personalData.controller || "—"}</Item><Item k="Legal basis">{st.personalData.legalBasis}</Item><Item k="Data subjects">{(st.personalData.subjectCategories || []).join(", ") || "—"}</Item></>
            : <><Item k="Role">{st.personalData.role}</Item><Item k="Purpose">{st.personalData.purpose || "—"}</Item><Item k="Operations">{(st.personalData.operations || []).join(", ") || "—"}</Item></>}
        </Sec>
        <Sec icon="triggers" title="Negotiation & acceptance" step={1}>
          <Item k="Baseline (no negotiation)">{st.baselineMode === "auto" ? "Auto-accept" : "Review first"}</Item>
          <Item k="Contract agent">{st.autoAgent ? "On" : "Off"}</Item>
          <Item k="Terms">{negTotal} negotiable · {NEGOTIABLE_FIELDS.length - negTotal} fixed</Item>
        </Sec>
      </div>
    </div>
  );
}

// ─── AI ASSISTANT PANEL ─────────────────────────────────────────────────────
function AiPanel({ st, set, onClose }) {
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState(null);

  const generate = async () => {
    if (busy || (!desc.trim() && !url.trim())) return;
    setBusy(true); setErr(null); setDone(null);
    const sys = `You help a provider draft a data/service offering for VisionsTrust, a European data-space marketplace. From the user's short brief, produce marketing-quality offer copy. Return ONLY a JSON object: {"name": string (max 6 words), "caption": string (ONE sentence, max 69 chars, the unique value), "description": string (2-3 short paragraphs, plain text), "kind": "Data" | "Service", "category": one of ["Job Offers","Skills & competencies","Training & learning","Data analytics","HR & recruitment","Other"]}. No markdown, no prose outside the JSON.`;
    const user = `Brief: ${desc || "(none)"}${url ? `\nReference URL: ${url}` : ""}\nCurrent kind guess: ${st.kind}. Produce the JSON now.`;
    try {
      const reply = await window.claude.complete({ system: sys, messages: [{ role: "user", content: user }], max_tokens: 700 });
      const j = JSON.parse(reply.slice(reply.indexOf("{"), reply.lastIndexOf("}") + 1));
      set((s) => {
        if (typeof j.name === "string") s.identity.name = j.name;
        if (typeof j.caption === "string") s.identity.caption = j.caption.slice(0, 69);
        if (typeof j.description === "string") s.identity.desc = j.description;
        if (j.kind === "Data" || j.kind === "Service") { s.kind = j.kind; s.personalData._kind = j.kind; }
        if (CATEGORIES.includes(j.category)) s.identity.category = j.category;
      });
      setDone(true);
    } catch (e) { setErr("Couldn't generate just now. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <aside className="co-ai">
      <div className="co-ai-inner">
        <div className="co-ai-hero">
          <svg className="co-ai-star" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.4 5.3 4.3 9.2 9.6 9.6v.8C16.3 12.8 12.4 16.7 12 22h-.8C10.8 16.7 6.9 12.8 1.6 12.4v-.8C6.9 11.2 10.8 7.3 11.2 2z" /></svg>
          <h3 className="co-ai-h">Get started with Assistant AI</h3>
        </div>
        <div className="co-ai-intro">
          <div className="co-ai-who"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.4 5.3 4.3 9.2 9.6 9.6v.8C16.3 12.8 12.4 16.7 12 22h-.8C10.8 16.7 6.9 12.8 1.6 12.4v-.8C6.9 11.2 10.8 7.3 11.2 2z" /></svg> Assistant AI</div>
          <p>Welcome anthony_data_provider 👋</p>
          <p>Describe your offering, drop a document or paste a link — I'll draft the name, caption and description for you.</p>
        </div>
        <div>
          <label className="co-ai-lab">Describe your offering in a few words</label>
          <textarea className="co-ai-ta" style={{ marginTop: 6 }} value={desc} placeholder="It's a data offer that…" onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div>
          <label className="co-ai-lab">Upload a document presenting your offering</label>
          <div className="co-ai-drop" style={{ marginTop: 6 }}>Drop your documents <b>Browse</b></div>
          <div className="co-ai-note">Formats: Word, PDF · Max size 100MB</div>
        </div>
        <div>
          <label className="co-ai-lab">Add a URL that describes your offering</label>
          <input className="co-ai-url" style={{ marginTop: 6 }} value={url} placeholder="www.visionspol.eu" onChange={(e) => setUrl(e.target.value)} />
        </div>
        <button type="button" className="co-ai-gen" onClick={generate} disabled={busy || (!desc.trim() && !url.trim())}>
          {busy ? <span className="la-typing" style={{ padding: 0 }}><i /><i /><i /></span> : <><Icon name="sparkle" size={15} /> Generate</>}
        </button>
        {done && <div className="co-ai-ok"><Icon name="check" size={16} /><span>Draft ready — your name, caption and description are filled in. Review and edit them on the left.</span></div>}
        {err && <div className="co-ai-err">{err}</div>}
      </div>
    </aside>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
function CreateOfferApp() {
  const [t, setTweak] = useTweaks({ offerKind: "Data", startStep: "1 · Offering", pdOn: false });
  const [st, setSt] = useState(load);
  const [step, setStep] = useState(0);
  const [aiOpen, setAiOpen] = useState(true);
  const [published, setPublished] = useState(false);

  const set = (mut) => setSt((prev) => { const d = clone(prev); mut(d); return d; });

  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) {} }, [st]);
  // Mirror tweaks → state
  useEffect(() => { if (t.offerKind !== st.kind) set((s) => { s.kind = t.offerKind; s.personalData._kind = t.offerKind; }); }, [t.offerKind]);
  useEffect(() => { if (t.pdOn !== st.personalData.enabled) set((s) => { s.personalData.enabled = t.pdOn; }); }, [t.pdOn]);
  useEffect(() => { const n = { "1 · Offering": 0, "2 · Terms": 1, "3 · Review": 2 }[t.startStep]; if (n != null && n !== step) setStep(n); }, [t.startStep]);

  const applyProfile = (id) => set((s) => {
    s.profile = id;
    if (id === "manual") return;
    // reset values to baseline default
    ALL_FIELDS.forEach((f) => { s.values[f.id] = clone(f.def); });
    s.policies = { time_period: true, count: true };
    if (id === "recommended") { ALL_FIELDS.forEach((f) => { s.neg[f.id] = !!f.neg; }); s.autoAgent = true; s.baselineMode = "auto"; }
    if (id === "open") { NEGOTIABLE_FIELDS.forEach((f) => { s.neg[f.id] = true; }); s.autoAgent = true; s.baselineMode = "auto"; }
    if (id === "strict") { ALL_FIELDS.forEach((f) => { s.neg[f.id] = false; }); s.autoAgent = false; s.baselineMode = "review"; }
  });
  const resetProfile = () => set((s) => { s.profile = null; });

  const canContinue = step === 0 ? !!st.identity.name.trim() : true;
  const goTo = (n) => setStep(n);

  return (
    <div className="co-shell">
      <header className="co-topbar">
        <div className="co-crumb"><a href="My Offers.html">My offers</a><span className="sep">/</span><b>Create</b></div>
        <div className="co-top-actions">
          <button type="button" className="co-top-btn" aria-label="Basket"><Icon name="cart" size={18} /><span className="co-top-dot">2</span></button>
          <button type="button" className="co-top-btn" aria-label="Language"><Icon name="translate" size={18} /></button>
          <button type="button" className="co-top-help"><Icon name="help" size={16} /><span>Help</span></button>
          <button type="button" className="co-top-btn" aria-label="Notifications"><Icon name="bell" size={18} /><span className="co-top-dot">9</span></button>
          <button type="button" className="co-top-btn user" aria-label="Account"><Icon name="user" size={18} /></button>
        </div>
      </header>

      <nav className="co-steps" aria-label="Progress">
        <div className="co-steps-inner">
          {STEPS.map((s, i) => (
            <button key={s.k} type="button" className={`co-step ${i === step ? "active" : i < step ? "done" : ""}`} onClick={() => (i < step || i <= step) && setStep(i)} disabled={i > step && !st.identity.name.trim()}>
              <span className="co-step-n">{i < step ? <Icon name="check" size={15} /> : i + 1}</span>
              <span className="co-step-tx"><span className="co-step-k">{s.k}</span><span className="co-step-t">{s.t}</span></span>
            </button>
          ))}
        </div>
      </nav>

      <div className={`co-layout ${aiOpen && step === 0 ? "" : "ai-closed"}`}>
        <div className="co-main">
          {step === 0 && <StepEssentials st={st} set={set} />}
          {step === 1 && <StepTerms st={st} set={set} applyProfile={applyProfile} resetProfile={resetProfile} />}
          {step === 2 && <StepReview st={st} goTo={goTo} />}
        </div>
        {step === 0 && aiOpen && <AiPanel st={st} set={set} onClose={() => setAiOpen(false)} />}
      </div>

      {step === 0 && !aiOpen && <button type="button" className="co-ai-reopen" onClick={() => setAiOpen(true)}><Icon name="sparkle" size={15} /> AI Assistant</button>}

      <footer className="co-foot">
        <div className="co-foot-inner">
          {step > 0 ? <button type="button" className="co-btn ghost" onClick={() => setStep(step - 1)}><Icon name="chevronLeft" size={16} /> Back</button> : <span />}
          <span className="co-foot-hint"><Icon name="check" size={14} /> Progress saved automatically</span>
          <div className="co-foot-actions">
            {step < 2
              ? <button type="button" className="co-btn primary" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continue <Icon name="arrowRight" size={16} /></button>
              : <button type="button" className="co-btn publish" onClick={() => setPublished(true)}><Icon name="check" size={16} /> Publish offer</button>}
          </div>
        </div>
      </footer>

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
        <TweakRadio label="Jump to step" value={t.startStep} options={["1 · Offering", "2 · Terms", "3 · Review"]} onChange={(v) => setTweak("startStep", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CreateOfferApp />);
})();
