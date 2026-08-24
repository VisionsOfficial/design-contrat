// VisionsTrust — Guided project creation. Same flow ergonomics as the final create-offer
// page (numbered stepper, guide + catalogue preview rail, AI assistant dock, dataspace-default
// quick-select, review-before-publish, autosaved draft) applied to project creation, and
// carrying the governance + additional-clause fields from Project settings.
(function () {
const { useState, useEffect } = React;
const { Icon } = window.UI;
const D = window.ProjectSettingsData;
const { clone, Sel, fmtVal } = window.CO;
const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle } = window;

const LS_KEY = "vt.createProject.v1";
const STEPS = [
  { k: "Step 1", t: "Project information", d: "Focus, title, description and where it happens." },
  { k: "Step 2", t: "Resources you need", d: "Data, services and infrastructures you look for." },
  { k: "Step 3", t: "Governance & clauses", d: "Purpose, contract clauses and how partners join." },
];
const DRAFT_KEY = "vt.createProject.draft.v1";
const loadDraft = () => { try { const r = localStorage.getItem(DRAFT_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } };
const agoLabel = (ts) => { const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return "just now"; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 24) return `${h} h ago`; return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
const MAX_CATS = 3;
const TOTAL_PROJECTS = 286;
const CATS = [
  { id: "pers_edu", t: "Personalised education", n: 83, d: "Your project customises learning experiences to each student's unique needs and learning styles, enhancing engagement and educational outcomes." },
  { id: "mutual_ai", t: "Mutualise data to train AI", n: 51, d: "Your project shares and pools data across multiple platforms to enhance the training and functionality of AI systems." },
  { id: "skills_match", t: "Personalised skills matching", n: 127, d: "Your project tailors education and training programmes to individual skill sets and career aspirations using advanced matching algorithms." },
  { id: "dec_learning", t: "Decentralised learning analytics & forecast", n: 24, d: "Your project uses distributed data across institutions to provide detailed insights into learning trends and student performance." },
  { id: "vr_learning", t: "VR learning analytics", n: 23, d: "Your project analyses data from virtual reality training sessions to optimise VR educational environments." },
  { id: "dec_skills", t: "Decentralised skills analytics & forecast", n: 72, d: "Your project leverages decentralised data to analyse and forecast skill trends for future workforce planning." },
];
const COUNTRIES = ["France", "Belgium", "Germany", "Netherlands", "Spain", "Italy", "EU-wide", "Worldwide"];
const HOT_DATA = ["Hard Skills", "Job Offers"];
const HOT_SERVICE = ["Adaptive Learning", "Learning Analytics"];

const GOV_FIELDS = D.GOVERNANCE.fields;
const CLAUSE_FIELDS = D.CLAUSES.fields;
const NEG_CLAUSES = CLAUSE_FIELDS.filter((f) => f.neg);

const PROFILES = [
  { id: "dataspace", tag: "Recommended", icon: "layers", t: "Dataspace Template", d: "The balanced clauses most participants already accept, with the usual ones open to negotiation." },
  { id: "mine", icon: "user", t: "My Project Template", d: "Your own saved defaults — stricter clauses and your governance wording — reused across your projects." },
  { id: "manual", icon: "sliders", t: "Configure every term manually", d: "Open the full form and set each governance field and clause yourself." },
];

// The organisation's own saved baseline (governance + clauses).
const MY_BASELINE = {
  project_purpose: "Mutualise learning and job-market data to train shared skills-matching models.",
  project_benefit: "Participants gain access to pooled, consent-governed skills data and to the models trained on it.",
  data_processing: "Data is pooled, pseudonymised and processed only for model training and matching within the project scope.",
  data_availability_date: "2026-03-01",
  legal_basis: "Consent",
  legal_basis_desc: "Consent collected by each participant at source, revocable at any time through the consent manager.",
  reversibility: { a: "Return + deletion + destruction certificate", b: "30 days" },
  subcontracting: "No third-party transfer without prior written approval, limited to an approved processor list.",
  security_incident: "48h",
  ip_outputs: "Provider retains all",
  governing_law: { a: "France", b: "Courts" },
  force_majeure: "Standard + epidemic",
  audit_right: { a: "Audit on notice", b: "Annual" },
  confidentiality: { a: "Mutual NDA", b: "5 years" },
  amendment: "Written amendment only",
};

// ─── STATE ────────────────────────────────────────────────────────────────
function seed() {
  const values = {}, neg = {};
  [...GOV_FIELDS, ...CLAUSE_FIELDS].forEach((f) => { values[f.id] = clone(f.def); neg[f.id] = !!f.neg; });
  values.project_title = ""; values.project_caption = ""; values.project_description = "";
  return {
    cats: [], values, neg, country: "", picture: false,
    needData: [], needService: [], needInfra: [], needCriteria: "",
    profile: null, autoAgent: true, joinMode: "auto",
    agentNote: "I accept shorter notification delays and longer confidentiality periods. I will not accept transfer of intellectual property on outputs.",
  };
}
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) { const st = { ...seed(), ...JSON.parse(raw) }; if (st.profile && !PROFILES.some((p) => p.id === st.profile)) st.profile = null; return st; } } catch (e) {}
  return seed();
}
const fmt = (f, v) => {
  if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "—";
  if (f.type === "multiselect") return v.join(", ");
  if (f.type === "twoSelect" || f.type === "selectDeadline") return `${v.a} · ${v.b}`;
  if (f.type === "date") return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return String(v);
};

// ─── FIELD CONTROLS ───────────────────────────────────────────────────────
function Chips({ options, value, onChange }) {
  const sel = value || [];
  return <div className="os-chips" style={{ justifyContent: "flex-start" }}>{options.map((o) => { const on = sel.includes(o); return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? sel.filter((x) => x !== o) : [...sel, o])}>{o}</button>; })}</div>;
}
function Control({ field, value, onChange }) {
  switch (field.type) {
    case "textarea": return <textarea className="os-ta" value={value || ""} placeholder={field.meaning} onChange={(e) => onChange(e.target.value)} />;
    case "date": return <input type="date" className="os-in" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "select": return <Sel value={value} onChange={onChange} options={field.options} />;
    case "multiselect": return <Chips options={field.options} value={value} onChange={onChange} />;
    case "selectDeadline":
    case "twoSelect": return <><Sel value={value?.a} onChange={(a) => onChange({ ...value, a })} options={field.options} /><Sel value={value?.b} onChange={(b) => onChange({ ...value, b })} options={field.type === "twoSelect" ? field.options2 : field.deadlines} /></>;
    default: return <input className="os-in sm" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }
}
// One clause / governance row. Textareas and chip sets stack; short controls sit inline.
function FieldRow({ field, st, set, negotiable }) {
  const stacked = field.type === "textarea" || field.type === "multiselect";
  const onValue = (v) => set((s) => { s.values[field.id] = v; });
  const ctrl = <Control field={field} value={st.values[field.id]} onChange={onValue} />;
  const neg = negotiable && field.neg;
  const toggle = neg ? (
    <button type="button" className={`co-toggle ${st.neg[field.id] ? "on" : ""}`} title="Open to negotiation" aria-label={`${field.label} open to negotiation`} aria-pressed={!!st.neg[field.id]} onClick={() => set((s) => { s.neg[field.id] = !s.neg[field.id]; })}><i /></button>
  ) : null;
  if (stacked) return (
    <div className="co-ncrow" style={{ display: "block" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div><div className="co-nc-t">{field.label}</div><div className="co-nc-d">{field.meaning}</div></div>
        {toggle && <span style={{ marginLeft: "auto" }}>{toggle}</span>}
      </div>
      <div style={{ marginTop: 8 }}>{ctrl}</div>
    </div>
  );
  return (
    <div className="co-ncrow">
      <div><div className="co-nc-t">{field.label}</div><div className="co-nc-d">{field.meaning}</div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>{ctrl}{toggle}</div>
    </div>
  );
}
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

// ─── CATEGORY PICKER (merged into project information) ─────────────────────
// Scales past a handful of categories: search, compact rows, share-of-dataspace
// meter, and a hard cap so the catalogue stays readable.
function CategoryPicker({ st, set }) {
  const [q, setQ] = useState("");
  const [browse, setBrowse] = useState(false);
  const sel = CATS.filter((c) => st.cats.includes(c.id));
  const full = st.cats.length >= MAX_CATS;
  const list = CATS.filter((c) => !st.cats.includes(c.id) && (c.t + " " + c.d).toLowerCase().includes(q.trim().toLowerCase()));
  const suggested = [...CATS].filter((c) => !st.cats.includes(c.id)).sort((a, b) => b.n - a.n).slice(0, 3);
  const toggle = (id) => set((s) => {
    if (s.cats.includes(id)) s.cats = s.cats.filter((x) => x !== id);
    else if (s.cats.length < MAX_CATS) s.cats = [...s.cats, id];
  });
  const pctOf = (c) => Math.round((c.n / TOTAL_PROJECTS) * 100);

  return (
    <div className="cp-catpick">
      {sel.length > 0 && (
        <div className="cp-catsel">
          {sel.map((c) => (
            <div className="cp-catsel-card" key={c.id}>
              <div className="cp-catsel-top">
                <span className="cp-catsel-t">{c.t}</span>
                <button type="button" className="cp-catsel-x" onClick={() => toggle(c.id)} aria-label={`Remove ${c.t}`}><Icon name="x" size={12} /></button>
              </div>
              <div className="cp-catsel-meter"><i style={{ width: pctOf(c) + "%" }} /></div>
              <div className="cp-catsel-meta"><b>{c.n}</b> projects · {pctOf(c)}% of the dataspace</div>
            </div>
          ))}
        </div>
      )}

      <div className="cp-catbar">
        <span className="cp-catbar-count">{st.cats.length} of {MAX_CATS} selected</span>
        {!full && <button type="button" className="cp-catbar-add" onClick={() => setBrowse((b) => !b)} aria-expanded={browse}><Icon name={browse ? "x" : "plus"} size={13} /> {browse ? "Close" : sel.length ? "Add another category" : "Choose a category"}</button>}
        {full && <span className="cp-catbar-cap"><Icon name="info" size={13} /> Maximum reached — remove one to swap.</span>}
      </div>

      {!browse && !sel.length && (
        <div className="cp-catsug">
          <span className="cp-catsug-k">Most used</span>
          {suggested.map((c) => <button type="button" key={c.id} className="cp-catsug-b" onClick={() => toggle(c.id)}><Icon name="plus" size={11} /> {c.t} <em>{pctOf(c)}%</em></button>)}
        </div>
      )}

      {browse && !full && (
        <div className="cp-catbrowse">
          <div className="cp-catpick-search">
            <Icon name="search" size={15} />
            <input value={q} placeholder="Search a category…" onChange={(e) => setQ(e.target.value)} aria-label="Search categories" autoFocus />
            {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search"><Icon name="x" size={13} /></button>}
          </div>
          <div className="cp-catlist">
            {list.map((c) => (
              <div className="cp-catrow" key={c.id}>
                <button type="button" className="cp-catrow-main" onClick={() => { toggle(c.id); setQ(""); }}>
                  <span className="cp-catrow-box"><Icon name="plus" size={12} /></span>
                  <span className="cp-catrow-tx">
                    <span className="cp-catrow-t">{c.t}</span>
                    <span className="cp-catrow-d">{c.d}</span>
                  </span>
                  <span className="cp-catrow-stat">
                    <b>{c.n}</b>
                    <span>projects · {pctOf(c)}%</span>
                    <span className="cp-catrow-bar"><i style={{ width: pctOf(c) + "%" }} /></span>
                  </span>
                </button>
                <a className="cp-catrow-link" href="Projects.html" title="Browse these projects"><Icon name="external" size={12} /></a>
              </div>
            ))}
            {!list.length && <div className="cp-catlist-none">{q ? `No category matches “${q}”.` : "Every category is already selected."}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STEP 2 — INFORMATION ─────────────────────────────────────────────────
function GuidePanel({ st }) {
  const v = st.values;
  return (
    <aside className="co-guide" aria-label="VisionsTrust guide">
      <span className="co-guide-pill"><Icon name="help" size={14} /> VisionsTrust guide</span>
      <h3 className="co-guide-h">What is a project ?</h3>
      <p className="co-guide-p">A project brings several organisations around a shared purpose. You declare what you need, others contribute their offers, and the contract layer records what everyone accepted.</p>
      <h3 className="co-guide-h">What it looks like on the catalogue</h3>
      <div className="co-preview">
        <div className="co-pv-media"><span className="co-pv-kind">Project</span><span className="co-pv-ph">project picture</span></div>
        <div className="co-pv-body">
          <div className="co-pv-title">{v.project_title || "Project title"}</div>
          <div className="co-pv-desc">{v.project_caption || "Project caption"}</div>
        </div>
        <div className="co-pv-prov">
          <span className="co-pv-avatar" aria-hidden="true">AD</span>
          <span><span className="co-pv-by">initiated by</span><br /><span className="co-pv-name">anthony_data_provider</span></span>
        </div>
        <div className="cp-pv-foot">
          <span className="cp-pv-status">In search of partners</span>
          <span className="co-pv-btn">Discover <Icon name="arrowRight" size={13} /></span>
        </div>
      </div>
    </aside>
  );
}
function StepInfo({ st, set }) {
  const v = st.values;
  const upd = (k, x) => set((s) => { s.values[k] = x; });
  return (
    <div className="co-main-inner">
      <h1 className="co-h1">Enter your project information</h1>
      <p className="co-h1-sub">This is what partners see in the catalogue. The preview on the left updates as you type.</p>
      <div className="co-field">
        <label className="co-flabel">Project title<em>*</em></label>
        <input className="co-in" value={v.project_title} placeholder="Ex: Customer Journey Optimisation Platform" onChange={(e) => upd("project_title", e.target.value)} />
      </div>
      <div className="co-field">
        <label className="co-flabel">Project caption<em>*</em></label>
        <input className="co-in" maxLength={90} value={v.project_caption} placeholder="Short sentence to describe your project goals" onChange={(e) => upd("project_caption", e.target.value)} />
        <div className="co-fcount">{90 - (v.project_caption?.length || 0)} characters left</div>
      </div>
      <div className="co-field">
        <label className="co-flabel">Project description<em>*</em></label>
        <textarea className="co-ta" style={{ minHeight: 150 }} value={v.project_description} placeholder="Describe your project and mention: impact, how far along you are, your objectives, timeline and needs." onChange={(e) => upd("project_description", e.target.value)} />
        <div className="co-fcount">{(v.project_description || "").length} / 50 000 characters</div>
      </div>
      <div className="co-field">
        <label className="co-flabel">Project focus<em>*</em></label>
        <p className="co-fhelp">Up to {MAX_CATS} categories. They drive matching, and the share shows how crowded each one already is.</p>
        <CategoryPicker st={st} set={set} />
      </div>
      <div className="co-field">
        <label className="co-flabel">Country or region<em>*</em></label>
        <span className="co-selectw"><select value={st.country} onChange={(e) => set((s) => { s.country = e.target.value; })}><option value="">Browse</option>{COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}</select><Icon name="chevronDown" size={14} className="co-chev" /></span>
      </div>
      <div className="co-field">
        <label className="co-flabel">Project picture</label>
        <div className="co-drop" role="button" tabIndex={0} onClick={() => set((s) => { s.picture = true; })}>
          <Icon name={st.picture ? "check" : "upload"} size={22} />
          <span className="co-drop-t">{st.picture ? "project_cover.png added" : "Drop your image or browse"}</span>
          <span className="co-drop-s">JPEG, PNG, SVG · recommended 280×120</span>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 3 — NEEDS ───────────────────────────────────────────────────────
function NeedGroup({ label, options, keyName, hot, st, set, q }) {
  const sel = st[keyName];
  const all = sel.length === options.length;
  const shown = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  if (q && !shown.length) return null;
  return (
    <div className="cp-need-grp">
      <div className="cp-need-head">
        <span className="cp-need-t">{label}</span>
        <span className="cp-need-tot">{options.length}</span>
        {sel.length > 0 && <span className="cp-need-n">{sel.length} selected</span>}
        <button type="button" className="cp-need-all" onClick={() => set((s) => { s[keyName] = all ? [] : [...options]; })}>{all ? "Clear all" : "Select all"}</button>
      </div>
      <div className="cp-need-grid">
        {shown.map((o) => { const on = sel.includes(o); return (
          <button key={o} type="button" className={`cp-chk ${on ? "on" : ""} ${(hot || []).includes(o) ? "hot" : ""}`} aria-pressed={on}
            onClick={() => set((s) => { s[keyName] = on ? s[keyName].filter((x) => x !== o) : [...s[keyName], o]; })}>
            <i>{on && <Icon name="check" size={11} />}</i>{o}
          </button>
        ); })}
      </div>
    </div>
  );
}
function NeedsSide({ st }) {
  const total = st.needData.length + st.needService.length + st.needInfra.length;
  return (
    <aside className="cp-side" aria-label="Search hints">
      <span className="co-guide-pill"><Icon name="help" size={14} /> VisionsTrust guide</span>
      <p className="cp-side-p" style={{ marginTop: 12 }}>Your needs drive the matching engine: offers from the catalogue that fit them are proposed to you, and providers see your project when it matches theirs.</p>
      <div className="cp-side-h">Most searched data in your categories</div>
      <div className="cp-side-tags">{HOT_DATA.map((x) => <span key={x} className="cp-side-tag">{x}</span>)}</div>
      <div className="cp-side-h">Most searched services in your categories</div>
      <div className="cp-side-tags">{HOT_SERVICE.map((x) => <span key={x} className="cp-side-tag">{x}</span>)}</div>
      <div className="cp-side-h">Your selection</div>
      <p className="cp-side-p">{total ? `${total} resource type${total > 1 ? "s" : ""} — dashed outlines are the most searched in your categories.` : "Nothing selected yet. You can also publish the project without needs and refine them later."}</p>
    </aside>
  );
}
function StepNeeds({ st, set }) {
  const [q, setQ] = useState("");
  const nq = q.trim().toLowerCase();
  const picked = [
    ...st.needData.map((x) => ({ x, k: "needData" })),
    ...st.needService.map((x) => ({ x, k: "needService" })),
    ...st.needInfra.map((x) => ({ x, k: "needInfra" })),
  ];
  return (
    <div className="co-main-inner">
      <h1 className="co-h1">Select the types of resources you are looking for</h1>
      <p className="co-h1-sub">Optional, and editable at any time from the project settings. Pick the data, services and infrastructures your project needs from its partners.</p>
      <div className="cp-needbar">
        <div className="cp-catpick-search">
          <Icon name="search" size={15} />
          <input value={q} placeholder="Search a resource type…" onChange={(e) => setQ(e.target.value)} aria-label="Search resource types" />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search"><Icon name="x" size={13} /></button>}
        </div>
        <div className="cp-needbar-sel">
          {picked.length ? picked.map((p) => (
            <span key={p.k + p.x} className="cp-cattag">{p.x}<button type="button" aria-label={`Remove ${p.x}`} onClick={() => set((s) => { s[p.k] = s[p.k].filter((y) => y !== p.x); })}><Icon name="x" size={11} /></button></span>
          )) : <span className="cp-catpick-empty">Nothing selected — you can publish without needs and refine later.</span>}
          {picked.length > 1 && <button type="button" className="cp-needbar-clear" onClick={() => set((s) => { s.needData = []; s.needService = []; s.needInfra = []; })}>Clear all</button>}
        </div>
      </div>
      <NeedGroup label="Data" options={D.NEED_DATA} keyName="needData" hot={HOT_DATA} st={st} set={set} q={nq} />
      <NeedGroup label="Service" options={D.NEED_SERVICE} keyName="needService" hot={HOT_SERVICE} st={st} set={set} q={nq} />
      <NeedGroup label="Service infrastructures" options={D.NEED_INFRA} keyName="needInfra" st={st} set={set} q={nq} />
      <div className="co-field">
        <label className="co-flabel">Specify your criteria and conditions <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>(optional)</span></label>
        <textarea className="co-ta" value={st.needCriteria} placeholder="Mention the specifics of the resources you need, the volumes, the quality expectations, and anything that would help potential partners judge the fit…" onChange={(e) => set((s) => { s.needCriteria = e.target.value; })} />
      </div>
    </div>
  );
}

// ─── STEP 4 — GOVERNANCE & CLAUSES ────────────────────────────────────────
// Clicking a card applies its values immediately — no confirmation step. What shows
// below the row (preview vs. full form) follows the selected card.
function DataspaceHero({ picked, onPick }) {
  return (
    <div className="co-ds">
      <div className="co-ds-top">
        <span className="co-ds-badge"><Icon name="sparkle" size={12} /> Recommended way to start</span>
        <h2 className="co-ds-h">Set your project clauses from the dataspace default</h2>
        <p className="co-ds-p">The dataspace publishes a ready-to-use set of project clauses — reversibility, subcontracting, incident notification, IP, audit, confidentiality — already aligned with what participants on VisionsTrust expect. Adopt it in one click, then adjust only what matters. <b>Every clause stays fully editable.</b></p>
      </div>
      <div className="co-ds-why">
        {[{ ic: "share", t: "Easier to join", d: "Partners recognise the clauses and accept without a legal round-trip." },
          { ic: "clock", t: "Faster onboarding", d: "The contract agent settles negotiable clauses for each newcomer." },
          { ic: "refresh", t: "Always current", d: "Clauses left on the default track future dataspace updates." }].map((w) => (
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

// Read-only list of the values a baseline has just applied — governance fields and
// clauses in one continuous list.
function BaselinePreview({ source, st, onEdit }) {
  const p = PROFILES.find((x) => x.id === source);
  const rows = [...GOV_FIELDS, ...CLAUSE_FIELDS].map((f) => [f.label, fmtVal(f, st.values[f.id])]);
  const half = Math.ceil(rows.length / 2);
  return (
    <div className="co-prev">
      <div className="co-prev-head">
        <span className="co-prev-ic"><Icon name="check" size={18} /></span>
        <div className="co-prev-tx">
          <div className="co-prev-t">“{p.t}” applied — {rows.length} fields set</div>
          <div className="co-prev-d">These are the governance details and clauses now attached to your project. Every one of them stays editable.</div>
        </div>
        <button type="button" className="co-prev-edit" onClick={onEdit}><Icon name="edit" size={13} /> Adjust terms</button>
      </div>
      <div className="co-prev-grid">
        {[rows.slice(0, half), rows.slice(half)].map((col, i) => (
          <div className="co-prev-grp" key={i}>
            {col.map(([k, v]) => (
              <div className="co-prev-row" key={k}><span className="co-prev-k">{k}</span><span className="co-prev-v">{v || "—"}</span></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
function StepGovernance({ st, set, applyProfile }) {
  const negCount = CLAUSE_FIELDS.filter((f) => f.neg && st.neg[f.id]).length;
  return (
    <div className="co-main-inner">
      <h1 className="co-h1">Governance &amp; clauses</h1>
      <p className="co-h1-sub">Why the project processes data, and the contract clauses every participant signs up to when they join.</p>

      <DataspaceHero picked={st.profile} onPick={applyProfile} />

      <div className="co-below" key={st.profile || "none"}>
        {(st.profile === "dataspace" || st.profile === "mine") &&
          <BaselinePreview source={st.profile} st={st} onEdit={() => applyProfile("manual")} />}

        {st.profile === "manual" && (
        <>
          <SectionCard icon="shield" title="Governance" summary="Purpose, benefits and legal basis" defaultOpen>
            {GOV_FIELDS.map((f) => <FieldRow key={f.id} field={f} st={st} set={set} negotiable={false} />)}
          </SectionCard>
          <SectionCard icon="doc" title="Additional clauses" summary={`${CLAUSE_FIELDS.length} clauses · ${negCount} negotiable`}
            pills={<span className="co-badge-neg"><Icon name="triggers" size={10} /> {negCount}</span>}>
            <p className="co-fhelp" style={{ marginTop: 2 }}>The toggle marks a clause as open to negotiation — the contract agent may then settle it with a joining participant.</p>
            {CLAUSE_FIELDS.map((f) => <FieldRow key={f.id} field={f} st={st} set={set} negotiable />)}
          </SectionCard>
          <SectionCard icon="triggers" title="Joining & negotiation" summary={`${st.joinMode === "auto" ? "Auto-accept" : "Review first"} · agent ${st.autoAgent ? "on" : "off"}`}>
            <div className="co-ncrow">
              <div><div className="co-nc-t">A participant accepts your clauses as published</div><div className="co-nc-d">What happens when an organisation joins at exactly your baseline.</div></div>
              <div className="seg2"><button type="button" className={st.joinMode === "auto" ? "active teal" : ""} onClick={() => set((s) => { s.joinMode = "auto"; })}><Icon name="check" size={13} /> Auto-accept</button><button type="button" className={st.joinMode === "review" ? "active" : ""} onClick={() => set((s) => { s.joinMode = "review"; })}><Icon name="eye" size={13} /> Review first</button></div>
            </div>
            <div className="co-ncrow">
              <div><div className="co-nc-t">Contract agent auto-negotiation</div><div className="co-nc-d">Let the agent settle negotiable clauses automatically. Requests outside your limits still come to you.</div></div>
              <button type="button" className={`co-toggle ${st.autoAgent ? "on" : ""}`} aria-pressed={st.autoAgent} onClick={() => set((s) => { s.autoAgent = !s.autoAgent; })}><i /></button>
            </div>
            {st.autoAgent && (
              <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                <div className="co-nc-t" style={{ marginBottom: 6 }}>Agent guidance note</div>
                <textarea className="os-ta" value={st.agentNote} onChange={(e) => set((s) => { s.agentNote = e.target.value; })} placeholder="Describe your negotiation stance…" />
              </div>
            )}
          </SectionCard>
        </>
        )}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
function CreateProjectApp() {
  const [t, setTweak] = useTweaks({ startStep: "1 · Information", prefill: false });
  const [st, setSt] = useState(load);
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(false);
  const draft0 = loadDraft();
  const [savedAt, setSavedAt] = useState(draft0 ? draft0.savedAt : null);
  const [toast, setToast] = useState(false);
  const saveDraft = () => {
    const ts = Date.now();
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: ts, step, st })); } catch (e) {}
    setSavedAt(ts); setToast(true); setTimeout(() => setToast(false), 2600);
  };
  const set = (mut) => setSt((prev) => { const d = clone(prev); mut(d); return d; });

  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) {} }, [st]);
  useEffect(() => { const n = { "1 · Information": 0, "2 · Needs": 1, "3 · Governance": 2 }[t.startStep]; if (n != null && n !== step) setStep(n); }, [t.startStep]);
  useEffect(() => {
    if (!t.prefill) return;
    set((s) => {
      if (!s.cats.length) s.cats = ["mutual_ai", "dec_skills"];
      if (!s.values.project_title) { s.values.project_title = "Regional Skills Forecast Alliance"; s.values.project_caption = "Pool learning and job-market data to anticipate regional skills gaps."; s.values.project_description = "This project mutualises learning traces and job-offer data from training providers, employers and public actors so that skills-forecasting models can be trained on a shared, governed dataset.\n\nParticipants contribute their own resources under their own terms; the contract layer records the baseline each party accepts and the clauses that apply if a commitment is not met."; }
      if (!s.country) s.country = "France";
      if (!s.needData.length) s.needData = ["Hard Skills", "Job Offers", "Learning Traces"];
      if (!s.needService.length) s.needService = ["Skills Forecasting", "Skills Analytics"];
    });
  }, [t.prefill]);

  const applyProfile = (id) => set((s) => {
    s.profile = id;
    if (id === "manual") return; // keep current values; the full form opens below
    [...GOV_FIELDS, ...CLAUSE_FIELDS].forEach((f) => {
      s.values[f.id] = clone(id === "mine" && MY_BASELINE[f.id] !== undefined ? MY_BASELINE[f.id] : f.def);
    });
    CLAUSE_FIELDS.forEach((f) => { s.neg[f.id] = !!f.neg; });
    s.autoAgent = true; s.joinMode = "auto";
  });

  const v = st.values;
  const infoDone = st.cats.length > 0 && !!v.project_title.trim() && !!v.project_caption.trim() && !!v.project_description.trim();
  const needsDone = st.needData.length + st.needService.length + st.needInfra.length > 0;
  const govDoneAll = !!st.profile && GOV_FIELDS.every((f) => { const x = st.values[f.id]; return x != null && x !== "" && !(Array.isArray(x) && !x.length); });
  const stepState = [
    infoDone ? "done" : "todo",
    needsDone ? "done" : "opt",
    govDoneAll ? "done" : "todo",
  ];
  const canContinue = step === 0 ? infoDone : step === 2 ? !!st.profile : true;
  const reachable = (i) => i === 0 ? true : infoDone;
  const hint = step === 0 ? "A category, title, caption and description are required"
    : step === 2 ? "Pick a clause profile to continue" : null;

  return (
    <div className="co-shell">
      <header className="co-topbar">
        <div className="co-crumb"><a href="Projects.html">My projects</a><span className="sep">/</span><b>Create</b></div>
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
          <div className="co-vsteps-label">Create a project</div>
          {STEPS.map((s, i) => (
            <button key={s.k} type="button" className={`co-vstep ${i === step ? "active" : stepState[i] === "done" ? "done" : ""}`} onClick={() => reachable(i) && setStep(i)} disabled={!reachable(i)} aria-current={i === step ? "step" : undefined}>
              <span className="co-step-n">{stepState[i] === "done" && i !== step ? <Icon name="check" size={15} /> : i + 1}</span>
              <span className="co-vstep-tx">
                <span className="co-step-k">{s.k}{stepState[i] === "opt" && <span className="co-vstep-opt">optional</span>}</span>
                <span className="co-step-t">{s.t}</span>
                <span className="co-vstep-d">{s.d}</span>
              </span>
            </button>
          ))}
          <div className="co-vsteps-draft">
            <button type="button" className="co-draft-btn" onClick={saveDraft}><Icon name="archive" size={14} /> Save as draft</button>
            <span className="co-draft-note">{savedAt ? `Draft saved ${agoLabel(savedAt)}` : "Nothing saved yet — you can come back later."}</span>
          </div>
          {step === 0 && <GuidePanel st={st} />}
          {step === 1 && <NeedsSide st={st} />}
        </nav>
        <div className="co-col">
          <div className="co-main">
            {step === 0 && <StepInfo st={st} set={set} />}
            {step === 1 && <StepNeeds st={st} set={set} />}
            {step === 2 && <StepGovernance st={st} set={set} applyProfile={applyProfile} />}
          </div>
        </div>
      </div>

      <footer className="co-foot">
        <div className="co-foot-inner">
          {step > 0 ? <button type="button" className="co-btn ghost" onClick={() => setStep(step - 1)}><Icon name="chevronLeft" size={16} /> Back</button> : <span />}
          <span className="co-foot-hint">{!canContinue && hint ? <><Icon name="info" size={14} /> {hint}</> : <><Icon name="check" size={14} /> {savedAt ? `Draft saved ${agoLabel(savedAt)}` : "Draft saved automatically"}</>}</span>
          <div className="co-foot-actions">
            <button type="button" className="co-btn ghost" onClick={saveDraft}><Icon name="archive" size={16} /> Save as draft</button>
            {step < STEPS.length - 1
              ? <button type="button" className="co-btn primary" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continue <Icon name="arrowRight" size={16} /></button>
              : <button type="button" className="co-btn publish" onClick={() => setPublished(true)}><Icon name="check" size={16} /> Publish project</button>}
          </div>
        </div>
      </footer>

      {toast && <div className="co-toast" role="status"><Icon name="check" size={16} /> Draft saved — you can close this page and pick it up later.</div>}

      {published && (
        <div className="co-modal-bd" onClick={() => setPublished(false)}>
          <div className="co-modal" onClick={(e) => e.stopPropagation()}>
            <div className="co-modal-ic"><Icon name="check" size={30} /></div>
            <h2>Project published 🎉</h2>
            <p>“{v.project_title || "Your project"}” is now live on the catalogue. Matching offers will be proposed to you, and organisations can ask to join under the clauses you published.</p>
            <div className="co-modal-btns">
              <button type="button" className="co-btn ghost" onClick={() => setPublished(false)}>Keep editing</button>
              <a className="co-btn primary" href="FINAL Project Settings.html">Go to project settings</a>
            </div>
          </div>
        </div>
      )}

      <TweaksPanel title="Create project">
        <TweakSection label="Preview" />
        <TweakRadio label="Jump to step" value={t.startStep} options={["1 · Information", "2 · Needs", "3 · Governance"]} onChange={(x) => setTweak("startStep", x)} />
        <TweakToggle label="Prefill example project" value={t.prefill} onChange={(x) => setTweak("prefill", x)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CreateProjectApp />);
})();
