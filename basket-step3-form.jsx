// VisionsTrust — Basket · create-project form panels (23/07).
// Three sections of the Project model: identity, governance, project-wide clauses.
// Built on the Project settings control set (os-in / os-ta / os-chip). Exported as window.S3F.
(function () {
const { Icon } = window.UI;
const { initials, hexToRgba } = window.CatData;
const D = window.ProjectSettingsData;
const F = (sec, id) => sec.fields.find((x) => x.id === id);
const isEmpty = (v) => v === "" || v == null || (Array.isArray(v) && v.length === 0);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const GOV_DEF = (id) => F(D.GOVERNANCE, id).def;
const DefaultTag = ({ ok }) => ok ? <div className="osf-default match"><Icon name="check" size={12} /> Default</div> : null;
const CATEGORIES = F(D.INFO, "categories").options;
const COUNTRIES = F(D.INFO, "country").options;
const LEGAL_BASIS = F(D.GOVERNANCE, "legal_basis").options;
const VISIBILITY = ["Data space members", "Invited participants only", "Public catalogue"];

// Sections of the creation form — drives the rail, the anchors and the validation.
const SECS = [
  { id: "info", name: "Project information", icon: "folder", group: "Identity", title: "Project information", desc: "Identity of the project as it will appear in the catalogue." },
  { id: "gov", name: "Purpose & governance", icon: "shield", group: "Identity", title: "Purpose & governance", desc: "Why the project exists, what it processes and on which legal basis." },
  { id: "clauses", name: "Contract clauses", icon: "doc", group: "Contract", title: "Project-wide contract clauses", desc: "Clauses that apply to every participant. Dataspace defaults are pre-filled — adjust before creating." },
];

const Sel = ({ value, onChange, options, width, full }) => (
  <span className="os-selectw" style={full ? { width: "100%" } : width ? { width } : undefined}>
    <select className="os-in" value={value} onChange={(e) => onChange(e.target.value)} style={full || width ? { width: "100%" } : undefined}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <Icon name="chevronDown" size={13} className="os-chev" />
  </span>
);
const Field = ({ label, req, help, full, children }) => (
  <div className={full ? "full" : undefined}>
    <label className="os-flabel">{label}{req && <em>*</em>}</label>
    {children}
    {help && <div className="os-fhelp">{help}</div>}
  </div>
);
const Chips = ({ options, value, onChange }) => (
  <div className="os-chips" style={{ justifyContent: "flex-start" }}>
    {options.map((o) => { const on = (value || []).includes(o); return (
      <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} aria-pressed={on}
        onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])}>{o}</button>
    ); })}
  </div>
);
const Mono = ({ seed, name, size = 36 }) => (
  <div className="bk-mono" style={{ width: size, height: size, background: `linear-gradient(135deg, ${hexToRgba(seed, 0.9)}, ${hexToRgba(seed, 0.55)})` }} aria-hidden="true">{initials(name)}</div>
);

// ─── 1 · PROJECT INFORMATION ────────────────────────────────────────────────
function InfoPanel({ st, set }) {
  const v = st.info;
  return (
    <div className="s3-grid">
      <Field label="Project title" req full>
        <input className="os-in bk-full" value={v.title} placeholder="Ex: VR_LEARNING_ANALYTICS_NET" onChange={(e) => set((s) => { s.info.title = e.target.value; })} />
      </Field>
      <Field label="Project caption" req full help={`${69 - v.caption.length} characters remaining`}>
        <input className="os-in bk-full" value={v.caption} maxLength={69} placeholder="Short sentence describing your project goals" onChange={(e) => set((s) => { s.info.caption = e.target.value.slice(0, 69); })} />
      </Field>
      <Field label="Project description" req full help="Impact, how far along you are, objectives, timeline and needs.">
        <textarea className="os-ta" style={{ minHeight: 104 }} value={v.desc} placeholder="Describe the project…" onChange={(e) => set((s) => { s.info.desc = e.target.value; })} />
      </Field>
      <Field label="Categories" req full help="Use cases this project belongs to — used for matching in the catalogue.">
        <Chips options={CATEGORIES} value={v.categories} onChange={(x) => set((s) => { s.info.categories = x; })} />
      </Field>
      <Field label="Country or region" req>
        <Sel value={v.country} options={COUNTRIES} full onChange={(x) => set((s) => { s.info.country = x; })} />
      </Field>
      <Field label="Catalogue visibility">
        <Sel value={v.visibility} options={VISIBILITY} full onChange={(x) => set((s) => { s.info.visibility = x; })} />
      </Field>
      <Field label="Cover image" full help="Shown on the project page and in the catalogue.">
        <div className="s3-cover"><span>project cover — 1200×400</span><button type="button" className="os-add-btn ghost"><Icon name="upload" size={14} /> Upload</button></div>
      </Field>
    </div>
  );
}

// ─── 2 · PURPOSE & GOVERNANCE ───────────────────────────────────────────────
function GovPanel({ st, set }) {
  const v = st.gov;
  const up = (k) => (e) => set((s) => { s.gov[k] = e.target.value; });
  return (
    <div className="s3-grid">
      <Field label="Project purpose" req full help="Main objective pursued by the project — participants see this before joining.">
        <textarea className="os-ta" style={{ minHeight: 88 }} value={v.purpose} placeholder="Ex: mutualise learning data to train shared skills-matching models." onChange={up("purpose")} />
      </Field>
      <Field label="Project benefit" full help="Value provided to users, organisations or stakeholders.">
        <textarea className="os-ta" value={v.benefit} onChange={up("benefit")} />
      </Field>
      <Field label="Data processing" full help="How data will be used, combined or transformed inside the project.">
        <textarea className="os-ta" value={v.processing} onChange={up("processing")} />
      </Field>
      <Field label="Desired date for data availability" req>
        <input type="date" className="os-in bk-full" value={v.availDate} onChange={up("availDate")} />
        <DefaultTag ok={eq(v.availDate, GOV_DEF("data_availability_date"))} />
      </Field>
      <Field label="Legal basis of the processing" req>
        <Sel value={v.legalBasis} options={LEGAL_BASIS} full onChange={(x) => set((s) => { s.gov.legalBasis = x; })} />
        <DefaultTag ok={eq(v.legalBasis, GOV_DEF("legal_basis"))} />
      </Field>
      <Field label="Legal basis description" full help="Additional information about the legal foundation.">
        <textarea className="os-ta" value={v.legalDesc} onChange={up("legalDesc")} />
      </Field>
    </div>
  );
}

// ─── 3 · PROJECT-WIDE CLAUSES ───────────────────────────────────────────────
function ClauseControl({ field, value, onChange }) {
  switch (field.type) {
    case "select": return <Sel value={value} options={field.options} onChange={onChange} width={230} />;
    case "twoSelect": return (<><Sel value={value.a} options={field.options} width={200} onChange={(a) => onChange({ ...value, a })} /><Sel value={value.b} options={field.options2} width={170} onChange={(b) => onChange({ ...value, b })} /></>);
    case "selectDeadline": return (<><Sel value={value.a} options={field.options} width={250} onChange={(a) => onChange({ ...value, a })} /><Sel value={value.b} options={field.deadlines} width={110} onChange={(b) => onChange({ ...value, b })} /></>);
    default: return <textarea className="os-ta" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}
function ClausesPanel({ st, set, resetClauses }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <p className="s3-hint" style={{ margin: 0, maxWidth: 560 }}>These clauses bind every participant. Terms marked negotiable can be challenged by a participant when they join; the others are fixed for the project.</p>
        <button type="button" className="os-panel-defaults" onClick={resetClauses}><Icon name="download" size={13} /> Adopt dataspace defaults</button>
      </div>
      <div style={{ marginTop: 8 }}>
        {D.CLAUSES.fields.map((f) => (
          <div className={`s3-clause ${f.type === "textarea" ? "stack" : ""}`} key={f.id}>
            <span className="s3-clause-k">
              {f.label}
              <span className="osf-info" title={f.meaning}><Icon name="info" size={13} /></span>
              {f.neg ? <span className="s3-tag neg">Negotiable</span> : <span className="s3-tag"><Icon name="lock" size={10} /> Fixed</span>}
            </span>
            <span className="s3-clause-c">
              <ClauseControl field={f} value={st.clauses[f.id]} onChange={(v) => set((s) => { s.clauses[f.id] = v; })} />
              {f.type !== "textarea" && !isEmpty(f.def) && <DefaultTag ok={eq(st.clauses[f.id], f.def)} />}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

window.S3F = { SECS, CATEGORIES, Sel, Field, Chips, Mono, InfoPanel, GovPanel, ClausesPanel };
})();
