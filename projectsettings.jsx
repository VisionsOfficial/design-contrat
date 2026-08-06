// VisionsTrust — Project settings page. Mirrors the offer-settings logic (modal + vertical-tabs editors,
// overview recap) for the project side: project info, governance, resources, contributions, tech components,
// and negotiable additional contract clauses. Reuses offersettings.css shared classes + projectsettings.css.
(function () {
const { useState, useEffect, useRef } = React;
const { Icon } = window.UI;
const { AppLayout } = window.VTLayout;
const D = window.ProjectSettingsData;

const LS_KEY = "vt.projectSettings.SERVICE_PROVIDER_DSUC";
const PAGE_TABS = ["Project settings", "Matching offers", "Participants", "Contract", "Service chains"];

const CATS = [
  { group: "General", items: [{ id: "overview", name: "Overview", icon: "list" }] },
  { group: "Project", items: [
    { id: "info", name: "Project information", icon: "folder", section: "info" },
    { id: "governance", name: "Governance", icon: "shield", section: "governance" },
    { id: "resources", name: "Resources you need", icon: "layers" },
    { id: "contributions", name: "Contributions", icon: "offers" },
    { id: "tech", name: "Tech components", icon: "tech" },
  ]},
  { group: "Contract", items: [{ id: "clauses", name: "Additional clauses", icon: "doc", section: "clauses" }] },
];
const FLAT_CATS = CATS.flatMap((g) => g.items);
// The former horizontal tab bar now lives in the same vertical rail as the
// settings categories: one navigation column for the whole project page.
const TAB_ITEMS = [
  { id: "t:Matching offers", name: "Matching offers", icon: "catalogue" },
  { id: "t:Participants", name: "Participants", icon: "team" },
  { id: "t:Contract", name: "Contract", icon: "contracts" },
  { id: "t:Service chains", name: "Service chains", icon: "endpoints" },
];
const RAIL = [
  { key: "ov", label: null, items: FLAT_CATS.filter((c) => c.id === "overview") },
  { key: "nav", label: "Project", items: TAB_ITEMS },
  { key: "set", label: "Settings", items: FLAT_CATS.filter((c) => c.id !== "overview") },
];

const MODAL_TABS = [
  { id: "resources", name: "Resources you need", help: true },
  { id: "contributions", name: "Contributions" },
  { id: "tech", name: "Tech components", help: true },
  { id: "info", name: "Project information" },
  { id: "governance", name: "Governance", help: true },
  { id: "clauses", name: "Additional clauses", section: "clauses" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const isEmpty = (v) => v === "" || v == null || (Array.isArray(v) && v.length === 0);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function fmtVal(field, v) {
  if (isEmpty(v)) return "—";
  switch (field.type) {
    case "multiselect": return v.join(", ");
    case "twoSelect": case "selectDeadline": return `${v.a} · ${v.b}`;
    case "date": return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    default: return String(v);
  }
}

function seed() {
  const values = {}, neg = {}, accept = {}, notes = {};
  D.ALL_FIELDS.forEach((f) => { values[f.id] = clone(f.def); neg[f.id] = !!f.neg; accept[f.id] = clone(f.accept || null); notes[f.id] = ""; });
  return {
    values, neg, accept, notes,
    needData: ["Hard Skills"],
    needService: [...D.NEED_SERVICE],
    needInfra: [],
    needCriteria: "",
    contributions: clone(D.CONTRIBUTIONS),
    contribCriteria: "",
    tech: { Contract: false, Catalog: false, Identity: false, Consent: false },
    techExtra: { ariane: false, lrc: false },
    autoAgent: true,
    agentNote: "Reversibility and audit terms are open to negotiation within the ranges set. Governing law and IP on outputs are fixed.",
    baselineMode: "review",
  };
}
function load() { try { const raw = localStorage.getItem(LS_KEY); if (raw) return { ...seed(), ...JSON.parse(raw) }; } catch (e) {} return seed(); }

// ─── SMALL INPUTS ─────────────────────────────────────────────────────────
const Sel = ({ value, onChange, options, width, full }) => (
  <span className="os-selectw" style={full ? { width: "100%" } : width ? { width } : undefined}>
    <select className="os-in" value={value} onChange={(e) => onChange(e.target.value)} style={full || width ? { width: "100%" } : undefined}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <Icon name="chevronDown" size={13} className="os-chev" />
  </span>
);

function ValueControl({ field, value, onChange }) {
  switch (field.type) {
    case "text": return <input className="os-in sm" style={{ width: 180 }} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "textarea": return <textarea className="os-ta" value={value || ""} placeholder={field.optional ? "Optional…" : ""} onChange={(e) => onChange(e.target.value)} />;
    case "date": return <input type="date" className="os-in" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "yesno": return <div className="seg2 mini">{["Yes", "No"].map((o) => <button key={o} type="button" className={value === o ? "active" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>;
    case "select": return <Sel value={value} onChange={onChange} options={field.options} />;
    case "multiselect": return (<div className="os-chips">{field.options.map((o) => { const on = (value || []).includes(o); return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])}>{o}</button>; })}</div>);
    case "twoSelect": return (<><Sel value={value?.a} onChange={(a) => onChange({ ...value, a })} options={field.options} width={150} /><Sel value={value?.b} onChange={(b) => onChange({ ...value, b })} options={field.options2} width={150} /></>);
    case "selectDeadline": return (<><Sel value={value?.a} onChange={(a) => onChange({ ...value, a })} options={field.options} width={200} /><Sel value={value?.b} onChange={(b) => onChange({ ...value, b })} options={field.deadlines} width={110} /></>);
    default: return null;
  }
}
function AcceptControl({ field, accept, onChange }) {
  const opts = field.type === "yesno" ? ["Yes", "No"] : field.options;
  if (!opts) return <span className="os-unit">Guided by the note below.</span>;
  const set = accept || [];
  return (<div className="os-chips" style={{ justifyContent: "flex-start" }}>{opts.map((o) => { const on = set.includes(o); return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? set.filter((x) => x !== o) : [...set, o])}>{o}</button>; })}</div>);
}

function NegStrip({ field, st, set, noteOpen, setNoteOpen }) {
  return (
    <div className="osf-strip">
      <div className="osf-strip-line">
        {st.autoAgent
          ? <><span className="osf-strip-label"><Icon name="ai" size={12} /> Agent auto-accepts</span><AcceptControl field={field} accept={st.accept[field.id]} onChange={(a) => set((s) => { s.accept[field.id] = a; })} /></>
          : <span className="osf-strip-label"><Icon name="triggers" size={12} /> Open to negotiation — you review each request</span>}
        <button type="button" className="osf-note-toggle" onClick={() => setNoteOpen((o) => !o)}><Icon name={noteOpen ? "chevronUp" : "plus"} size={12} /> {noteOpen ? "Hide note" : "Note"}</button>
      </div>
      {noteOpen && <textarea className="os-ta" placeholder="What you will and won't accept for this clause…" value={st.notes[field.id]} onChange={(e) => set((s) => { s.notes[field.id] = e.target.value; })} />}
    </div>
  );
}

function FieldRow({ field, st, set, allowNeg }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const value = st.values[field.id];
  const negotiable = st.neg[field.id];
  const canNeg = allowNeg && field.type !== "date" && field.type !== "text";
  const hasNote = !!st.notes[field.id];
  const full = field.type === "textarea" || field.type === "multiselect";
  const hasDefault = !isEmpty(field.def);
  const matches = hasDefault && eq(value, field.def);

  if (full) {
    return (
      <div className="osf-full">
        <div className="osf-field"><span className="osf-name">{field.label}</span><span className="osf-info" title={field.meaning}><Icon name="info" size={13} /></span>
          {canNeg && <button type="button" className={`osf-negbtn ${negotiable ? "on" : ""}`} style={{ marginLeft: "auto" }} onClick={() => set((s) => { s.neg[field.id] = !s.neg[field.id]; })} aria-pressed={negotiable}><span className="mini-toggle"><i /></span>Negotiable</button>}
        </div>
        <ValueControl field={field} value={value} onChange={(v) => set((s) => { s.values[field.id] = v; })} />
        {hasDefault && !matches && <div style={{ marginTop: 6 }} className="osf-default"><span>Default:</span><span className="dv">{fmtVal(field, field.def)}</span><button type="button" className="os-apply" onClick={() => set((s) => { s.values[field.id] = clone(field.def); })}>Apply</button></div>}
        {negotiable && canNeg && <NegStrip field={field} st={st} set={set} noteOpen={noteOpen || hasNote} setNoteOpen={setNoteOpen} />}
      </div>
    );
  }
  return (
    <div className="osf-row">
      <div className="osf-line">
        <div className="osf-field"><span className="osf-name">{field.label}</span><span className="osf-info" title={field.meaning}><Icon name="info" size={13} /></span></div>
        <div className="osf-controls">
          <div className="osf-val"><ValueControl field={field} value={value} onChange={(v) => set((s) => { s.values[field.id] = v; })} /></div>
          {canNeg && <button type="button" className={`osf-negbtn ${negotiable ? "on" : ""}`} onClick={() => set((s) => { s.neg[field.id] = !s.neg[field.id]; })} aria-pressed={negotiable}><span className="mini-toggle"><i /></span>Negotiable</button>}
        </div>
        {hasDefault && (matches
          ? <div className="osf-default match"><Icon name="check" size={12} /> Default</div>
          : <div className="osf-default"><span>Default:</span><span className="dv">{fmtVal(field, field.def)}</span><button type="button" className="os-apply" onClick={() => set((s) => { s.values[field.id] = clone(field.def); })}>Apply</button></div>)}
      </div>
      {negotiable && canNeg && <NegStrip field={field} st={st} set={set} noteOpen={noteOpen || hasNote} setNoteOpen={setNoteOpen} />}
    </div>
  );
}

const FieldsPanel = ({ section, st, set, allowNeg }) => section.fields.map((f) => <FieldRow key={f.id} field={f} st={st} set={set} allowNeg={allowNeg} />);

// ─── RESOURCES YOU NEED ───────────────────────────────────────────────────
function CheckChip({ label, on, onToggle }) {
  return <button type="button" className={`ps-check ${on ? "on" : ""}`} onClick={onToggle} aria-pressed={on}><span className="ps-box"><Icon name="check" size={12} /></span><span className="lbl">{label}</span></button>;
}
function ResourcesPanel({ st, set }) {
  const grp = (key, opts) => (
    <div className="ps-checks">
      {opts.map((o) => <CheckChip key={o} label={o} on={st[key].includes(o)} onToggle={() => set((s) => { s[key] = s[key].includes(o) ? s[key].filter((x) => x !== o) : [...s[key], o]; })} />)}
    </div>
  );
  return (
    <>
      <p className="osm-lead">Indicate the resources you are looking for this project.</p>
      <div className="ps-need-label">Data <span className="opt">(optional)</span></div>
      {grp("needData", D.NEED_DATA)}
      <div className="ps-need-label">Service <span className="opt">(optional)</span></div>
      {grp("needService", D.NEED_SERVICE)}
      <div className="ps-need-label">Service infrastructures <span className="opt">(optional)</span></div>
      {grp("needInfra", D.NEED_INFRA)}
      <div className="ps-criteria">
        <label>Specify your criteria and conditions <span className="opt">(optional)</span></label>
        <textarea className="os-ta" style={{ minHeight: 84 }} placeholder="Mention the specifics of the proposed services or data, the benefits for users, and any other relevant details…" value={st.needCriteria} onChange={(e) => set((s) => { s.needCriteria = e.target.value; })} />
      </div>
    </>
  );
}

// ─── CONTRIBUTIONS ────────────────────────────────────────────────────────
function ContributionsPanel({ st, set }) {
  return (
    <>
      <p className="osm-lead">Select your own offerings you bring into the project — for instance a data set you need analytics on, or a service you need data for.</p>
      <div className="ps-choose-grid one">
        <div className="ps-choose"><label>Choose an offer</label><Sel value="Browse" onChange={() => {}} options={["Browse", ...D.CONTRIBUTIONS.map((c) => c.name), "data_provider_infra_1", "data_infra_2"]} full /><span className="ps-choose-hint">Data, service and infrastructure offers you own.</span></div>
      </div>
      <div className="ps-contrib-grid">
        {st.contributions.map((c) => (
          <div className="ps-contrib" key={c.id}>
            <div className="ps-contrib-media">TECHNÈ<span className="ps-contrib-kind">{c.kind}</span></div>
            <div className="ps-contrib-body"><div className="ps-contrib-name">{c.name}</div><div className="ps-contrib-cap">{c.caption}</div></div>
            <div className="ps-contrib-foot"><span className="ps-contrib-res">{c.resources} resource{c.resources > 1 ? "s" : ""} in the offer</span><button type="button" className="ps-contrib-del" aria-label="Remove" onClick={() => set((s) => { s.contributions = s.contributions.filter((x) => x.id !== c.id); })}><Icon name="trash" size={15} /></button></div>
          </div>
        ))}
      </div>
      <div className="os-add-row"><button type="button" className="os-add-btn"><Icon name="plus" size={14} /> Create an offer</button></div>
      <div className="ps-criteria">
        <label>Specify your criteria and conditions <span className="opt">(optional)</span></label>
        <textarea className="os-ta" style={{ minHeight: 84 }} placeholder="Mention the specifics of the proposed services or data…" value={st.contribCriteria} onChange={(e) => set((s) => { s.contribCriteria = e.target.value; })} />
      </div>
    </>
  );
}

// ─── TECH COMPONENTS ──────────────────────────────────────────────────────
function TechPanel({ st, set }) {
  return (
    <>
      <p className="osm-lead">Define the technical components you would like to use in your project to facilitate data exchange and interoperability.</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--vui-color-secondary)", margin: "4px 0 12px" }}>Here are the core VisionsTrust components that you will use for your project. Go to the Technical space for more technical details.</p>
      <div className="ps-tech-grid">
        {D.TECH_CORE.map((t) => { const on = !!st.tech[t]; return (
          <div key={t} className={`ps-tech-row ${on ? "on" : ""}`}>
            <span className="ps-tech-badge"><Icon name="shield" size={15} /></span>
            <span className="ps-tech-name">{t}</span>
            <button type="button" className="ps-tech-add" aria-pressed={on} aria-label={`Toggle ${t}`} onClick={() => set((s) => { s.tech[t] = !s.tech[t]; })}><Icon name={on ? "check" : "plus"} size={18} className={on ? "on-check" : ""} /></button>
          </div>
        ); })}
      </div>
      <div className="ps-sub-note">Select additional services to enhance your project's capabilities.</div>
      <div className="ps-extra-grid">
        {D.TECH_EXTRA.map((x) => { const on = !!st.techExtra[x.id]; return (
          <button key={x.id} type="button" className={`ps-extra ${on ? "on" : ""}`} onClick={() => set((s) => { s.techExtra[x.id] = !s.techExtra[x.id]; })} aria-pressed={on}>
            <div className="et">{x.name}<span className="echk"><Icon name="check" size={12} /></span></div>
            <div className="ed">{x.desc}</div>
          </button>
        ); })}
      </div>
    </>
  );
}

// ─── NEGOTIATION for clauses is inline; overview recap ────────────────────
function OverviewPanel({ st, goTo }) {
  const [descOpen, setDescOpen] = useState(false);
  const Sec = ({ id, icon, title, children }) => (
    <div className="os-ov-sec">
      <div className="os-ov-head"><span className="os-ov-ic"><Icon name={icon} size={15} /></span><span className="os-ov-title">{title}</span><button type="button" className="os-ov-edit" onClick={() => goTo(id)}><Icon name="edit" size={12} /> Edit</button></div>
      <div className="os-ov-grid">{children}</div>
    </div>
  );
  const vals = st.values;
  const enabledTech = [...D.TECH_CORE.filter((t) => st.tech[t]), ...D.TECH_EXTRA.filter((x) => st.techExtra[x.id]).map((x) => x.name.split(" ")[0])];
  return (
    <div className="os-ov">
      <Sec id="info" icon="folder" title="Project information">
        <div className="os-ov-item"><span className="os-ov-k">Title</span><span className="os-ov-v">{vals.project_title}</span></div>
        <div className="os-ov-item"><span className="os-ov-k">Caption</span><span className="os-ov-v">{vals.project_caption || "—"}</span></div>
        <div className="os-ov-item"><span className="os-ov-k">Description</span><span className="os-ov-v"><span className={`ps-desc${descOpen ? " open" : ""}`}>{vals.project_description || "—"}</span>{(vals.project_description || "").length > 120 && <button type="button" className="ps-desc-t" onClick={() => setDescOpen(!descOpen)}>{descOpen ? "Show less" : "Show more"}<Icon name={descOpen ? "chevronUp" : "chevronDown"} size={12} /></button>}</span></div>
        <div className="os-ov-item"><span className="os-ov-k">Documents</span><span className="os-ov-v">{D.DOCUMENTS.length} attached</span></div>
        <div className="os-ov-item"><span className="os-ov-k">Categories</span><span className="os-ov-v"><span className="os-ov-chips">{(vals.categories || []).map((c) => <span key={c} className="pill pill-primary">{c}</span>)}</span></span></div>
        <div className="os-ov-item"><span className="os-ov-k">Country</span><span className="os-ov-v">{vals.country}</span></div>
      </Sec>
      <Sec id="governance" icon="shield" title="Governance">
        <div className="os-ov-item"><span className="os-ov-k">Legal basis</span><span className="os-ov-v">{vals.legal_basis}</span></div>
        <div className="os-ov-item"><span className="os-ov-k">Data availability</span><span className="os-ov-v">{fmtVal(D.GOVERNANCE.fields[3], vals.data_availability_date)}</span></div>
      </Sec>
      <Sec id="resources" icon="layers" title="Resources you need">
        <div className="os-ov-item"><span className="os-ov-k">Data</span><span className="os-ov-v">{st.needData.length ? st.needData.join(", ") : "—"}</span></div>
        <div className="os-ov-item"><span className="os-ov-k">Services</span><span className="os-ov-v">{st.needService.length} selected</span></div>
        <div className="os-ov-item"><span className="os-ov-k">Infrastructures</span><span className="os-ov-v">{st.needInfra.length ? st.needInfra.join(", ") : "—"}</span></div>
      </Sec>
      <Sec id="contributions" icon="offers" title="Contributions">
        {st.contributions.length ? st.contributions.map((c) => <div className="os-ov-item" key={c.id}><span className="os-ov-k">{c.kind}</span><span className="os-ov-v">{c.name}</span></div>) : <div className="os-ov-empty">No contribution yet.</div>}
      </Sec>
      <Sec id="tech" icon="tech" title="Tech components">
        {enabledTech.length ? <div className="os-ov-chips">{enabledTech.map((t) => <span key={t} className="pill pill-primary">{t}</span>)}</div> : <div className="os-ov-empty">No component enabled.</div>}
      </Sec>
      <Sec id="clauses" icon="doc" title="Additional clauses">
        {D.CLAUSES.fields.map((f) => (
          <div className="os-ov-item" key={f.id}><span className="os-ov-k">{f.label}</span><span className="os-ov-v">{fmtVal(f, st.values[f.id])}{st.neg[f.id] && <span className="os-ov-neg"><Icon name="triggers" size={9} /> Neg.</span>}</span></div>
        ))}
      </Sec>
    </div>
  );
}

// Basic project settings: the identity fields plus the picture and documents
// that used to sit in the "Edit project" modal.
function DocPreview({ doc, onOpen, onRemove }) {
  const ext = (doc.name.split(".").pop() || "").toUpperCase();
  return (
    <div className="ps-file">
      <div className="ps-file-prev">
        <span className="ps-file-ext">{ext}</span>
        <div className="ps-file-acts">
          <button type="button" className="ps-file-act" title="View full size" aria-label="View full size" onClick={() => onOpen(doc)}><Icon name="eye" size={13} /></button>
          <button type="button" className="ps-file-act" title="Download" aria-label="Download"><Icon name="download" size={13} /></button>
          <button type="button" className="ps-file-act danger" title="Delete" aria-label="Delete" onClick={() => onRemove(doc.id)}><Icon name="trash" size={13} /></button>
        </div>
      </div>
      <div className="ps-file-meta"><span className="ps-file-n" title={doc.name}>{doc.name}</span><span className="ps-file-m">{doc.size} · {doc.date}</span></div>
    </div>
  );
}

function FileLightbox({ doc, onClose }) {
  useEffect(() => { const k = (e) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [onClose]);
  const ext = (doc.name.split(".").pop() || "").toUpperCase();
  return (
    <div className="ps-lb" onClick={onClose}>
      <div className="ps-lb-box" onClick={(e) => e.stopPropagation()}>
        <div className="ps-lb-top">
          <div className="ps-lb-t"><Icon name="doc" size={14} /> {doc.name}<span className="ps-lb-s">{doc.size} · {doc.date}</span></div>
          <div className="ps-lb-acts">
            <button type="button" className="btn btn-ghost btn-sm"><Icon name="download" size={13} /> Download</button>
            <button type="button" className="icon-btn ghost" aria-label="Close" onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
        </div>
        <div className="ps-lb-body"><span className="ps-file-ext lg">{ext}</span><span className="ps-lb-hint">Preview of {doc.name}</span></div>
      </div>
    </div>
  );
}

function InfoPanel({ st, set }) {
  const [docs, setDocs] = useState(D.DOCUMENTS);
  const [open, setOpen] = useState(null);
  const [pic, setPic] = useState(true);
  return (
    <>
      <FieldsPanel section={D.INFO} st={st} set={set} allowNeg={false} />
      <div className="ps-media">
        <div className="ps-media-h">Project picture</div>
        {pic ? (
          <div className="ps-file wide">
            <div className="ps-file-prev pic">
              <span className="ps-file-ext">IMG</span>
              <div className="ps-file-acts">
                <button type="button" className="ps-file-act" title="View full size" aria-label="View full size" onClick={() => setOpen({ id: "pic", name: "project_picture.png", size: "204 KB", date: "12/06/2026" })}><Icon name="eye" size={13} /></button>
                <button type="button" className="ps-file-act" title="Download" aria-label="Download"><Icon name="download" size={13} /></button>
                <button type="button" className="ps-file-act danger" title="Delete" aria-label="Delete" onClick={() => setPic(false)}><Icon name="trash" size={13} /></button>
              </div>
            </div>
            <div className="ps-file-meta"><span className="ps-file-n">project_picture.png</span><span className="ps-file-m">204 KB · 280×120</span></div>
          </div>
        ) : (
          <div className="ps-drop" role="button" tabIndex={0} onClick={() => setPic(true)}><Icon name="upload" size={20} /><span className="ps-drop-t">Drop your image or browse</span><span className="ps-drop-s">Support: Jpeg, PNG, JPG, SVG · Size: 280×120</span></div>
        )}
      </div>
      <div className="ps-media">
        <div className="ps-media-h">Documents <span className="ps-media-n">{docs.length}</span></div>
        <div className="ps-files">
          {docs.map((dc) => <DocPreview key={dc.id} doc={dc} onOpen={setOpen} onRemove={(id) => setDocs(docs.filter((x) => x.id !== id))} />)}
          <div className={`ps-drop${docs.length ? " card" : ""}`} role="button" tabIndex={0}><Icon name="upload" size={docs.length ? 16 : 20} /><span className="ps-drop-t">Drag and drop files here, or browse</span><span className="ps-drop-s">Support: Jpeg, PNG, JPG, SVG · Size: 280×120</span></div>
        </div>
      </div>
      {open && <FileLightbox doc={open} onClose={() => setOpen(null)} />}
    </>
  );
}

// ─── PANEL SWITCH (shared by modal + inline) ──────────────────────────────
function CategoryBody({ cat, st, set }) {
  if (cat === "resources") return <ResourcesPanel st={st} set={set} />;
  if (cat === "contributions") return <ContributionsPanel st={st} set={set} />;
  if (cat === "tech") return <TechPanel st={st} set={set} />;
  if (cat === "info") return <InfoPanel st={st} set={set} />;
  if (cat === "governance") return <FieldsPanel section={D.GOVERNANCE} st={st} set={set} allowNeg={false} />;
  if (cat === "clauses") return <FieldsPanel section={D.CLAUSES} st={st} set={set} allowNeg={false} />;
  return null;
}

// ─── SETTINGS MODAL ───────────────────────────────────────────────────────
function SettingsModal({ initialTab, st, set, negClauses, applyClauseDefaults, onSave, onCancel }) {
  const [tab, setTab] = useState(initialTab || "resources");
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => { const k = (e) => { if (e.key === "Escape") onCancel(); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, []);
  const save = () => { onSave(); setJustSaved(true); setTimeout(() => setJustSaved(false), 1800); };
  return (
    <div className="osm-backdrop" onClick={onCancel}>
      <div className="osm" role="dialog" aria-modal="true" aria-labelledby="psm-title" onClick={(e) => e.stopPropagation()}>
        <div className="osm-top">
          <div className="osm-title-row"><div><h2 className="osm-title" id="psm-title">Project settings</h2><p className="osm-desc">Complete and modify your project information.</p></div><button type="button" className="osm-x" onClick={onCancel} aria-label="Close"><Icon name="x" size={22} /></button></div>
          <div className="osm-progress"><span className="pct">100%</span><span className="track"><span className="fill" style={{ width: "100%" }} /></span></div>
          <div className="osm-tabs" role="tablist">
            {MODAL_TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`osm-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                {t.name}{t.help && <span className="osm-help" aria-hidden="true">?</span>}{t.section && negClauses > 0 && <span className="osm-tab-badge">{negClauses}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="osm-body">
          {tab === "clauses" && <div className="osm-section-defaults"><button type="button" className="os-panel-defaults" onClick={applyClauseDefaults}><Icon name="download" size={13} /> Adopt dataspace defaults</button></div>}
          <CategoryBody cat={tab} st={st} set={set} />
        </div>
        <div className="osm-foot">
          <button type="button" className="osm-cancel" onClick={onCancel}>Cancel</button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>{justSaved && <span className="osm-saved">✓ Saved</span>}<button type="button" className="osm-save" onClick={save}>Save</button></div>
        </div>
      </div>
    </div>
  );
}

// ─── EDIT IDENTITY MODAL ──────────────────────────────────────────────────
function EditModal({ onClose }) {
  const ref = useRef(null);
  useEffect(() => { const k = (e) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", k); ref.current?.focus(); return () => document.removeEventListener("keydown", k); }, []);
  return (
    <div className="os-modal-backdrop" onClick={onClose}>
      <div className="os-modal" role="dialog" aria-modal="true" aria-labelledby="ped-title" onClick={(e) => e.stopPropagation()}>
        <div className="os-modal-head"><div><h2 id="ped-title">Edit project</h2><p>Complete and modify your project information.</p></div><button ref={ref} type="button" className="os-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button></div>
        <div className="os-modal-body">
          <label className="field"><span className="field-label">Project title<em>*</em></span><input className="input" defaultValue="SERVICE_PROVIDER_DSUC" /></label>
          <label className="field"><span className="field-label">Project caption<em>*</em></span><input className="input" defaultValue="description" /></label>
          <label className="field"><span className="field-label">Project description<em>*</em></span><textarea className="textarea" defaultValue="" /></label>
        </div>
        <div className="os-modal-foot"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={onClose}>Save</button></div>
      </div>
    </div>
  );
}

// ─── OTHER PAGE TABS ──────────────────────────────────────────────────────
const Placeholder = ({ title, body }) => (<div className="os-placeholder" style={{ marginTop: 16 }}><h3 style={{ margin: "0 0 6px", fontSize: 16, color: "var(--vui-color-secondary)" }}>{title}</h3><p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>{body}</p></div>);

// ─── CONTRACT VIEW (generated from project + offer settings) ───────────────
function ContractView() {
  const ECO = window.ProjectsData && window.ProjectsData.ECO;
  const ProjectTermsDoc = window.PJContract && window.PJContract.ProjectTermsDoc;
  const ContractParticipants = window.PJ && window.PJ.ContractParticipants;
  const [copied, setCopied] = useState(false);
  return (
    <div className="pj-sec" style={{ marginTop: 16 }} aria-label="Contract">
      <div className="pj-banner info"><Icon name="info" size={15} /><span>This is the contract generated from the project settings, participants and clauses. It compiles the project-wide terms and each offer's negotiated service &amp; contract terms.</span></div>
      {ECO && <div className="pj-idfield"><span className="lbl">Contract ID</span><code>{ECO.contractId}</code><button type="button" className="pj-mini-btn" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(ECO.contractId); setCopied(true); setTimeout(() => setCopied(false), 1400); }}><Icon name={copied ? "check" : "copy"} size={12} />{copied ? "Copied" : "Copy"}</button></div>}
      {ProjectTermsDoc ? <ProjectTermsDoc /> : <Placeholder title="Project terms" body="Loading project terms…" />}
      <div className="pj-sec-head"><div><h2>Participants and offers</h2><p>For each participant, their offerings, roles and negotiated service &amp; contract terms.</p></div></div>
      {ContractParticipants && <ContractParticipants me={ECO && ECO.orchestrator} />}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
function ProjectSettingsApp() {
  const [tab, setTab] = useState("Project settings");
  const [st, setSt] = useState(load);
  const [cat, setCat] = useState("overview");
  const [inlineSaved, setInlineSaved] = useState(false);
  const snapshot = useRef(null);
  const savedRef = useRef(JSON.stringify(st));
  const dirty = JSON.stringify(st) !== savedRef.current;

  const set = (mutator) => setSt((prev) => { const d = clone(prev); mutator(d); return d; });
  const persist = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) {} };
  const saveInline = () => { persist(); savedRef.current = JSON.stringify(st); setInlineSaved(true); setTimeout(() => setInlineSaved(false), 1800); };

  const negClauses = D.CLAUSES.fields.filter((f) => st.neg[f.id] && f.type !== "date" && f.type !== "text").length;
  const applyClauseDefaults = () => setSt((prev) => { const d = clone(prev); D.CLAUSES.fields.forEach((f) => { if (!isEmpty(f.def)) d.values[f.id] = clone(f.def); }); return d; });

  const catDef = FLAT_CATS.find((c) => c.id === cat);
  const onSettings = tab === "Project settings";
  const active = onSettings ? cat : `t:${tab}`;
  const go = (id) => { if (id.startsWith("t:")) setTab(id.slice(2)); else { setTab("Project settings"); setCat(id); } };
  const TAB_HEADS = {
    "Matching offers": { title: "Matching offers", desc: "Offers from the catalogue that match what this project is looking for." },
    "Participants": { title: "Participants", desc: "Organisations involved in the project and the role each one plays." },
    "Contract": { title: "Contract", desc: "The contract generated from the project settings, participants and clauses." },
    "Service chains": { title: "Service chains", desc: "How services connect and exchange data within the project." },
  };
  const HEADS = {
    overview: { title: "Overview", desc: "A recap of every setting for this project. Jump into any category to adjust it." },
    resources: { title: "Resources you need", desc: "Data, services and infrastructures the project is looking for." },
    contributions: { title: "Contributions", desc: "Your own offerings brought into the project." },
    tech: { title: "Tech components", desc: "Core VisionsTrust components and additional services." },
    info: { title: "Project information", desc: "Identity of the project as shown in the catalogue." },
    governance: { title: "Governance", desc: "Purpose, benefits and the legal basis for processing." },
    clauses: { title: "Additional clauses", desc: "Contract clauses — propose a baseline and allow negotiation where you accept it." },
  };
  const head = onSettings ? HEADS[cat] : TAB_HEADS[tab];

  return (
    <AppLayout title={<span className="os-crumb-title"><a href="My Projects.html">My projects</a><span className="sep">/</span><b>SERVICE_PROVIDER_DSUC</b></span>} activeId="proj-all" className="os-app">
      <div className="os-page">

            <div className="os-hero">
              <div className="os-hero-top">
                <div className="os-logo" style={{ fontSize: 12 }}>RE&nbsp;JUST&nbsp;IFY</div>
                <div className="os-hero-main">
                  <div className="os-title-row"><h1 className="os-title" style={{ fontFamily: "var(--font)", letterSpacing: 0 }}>SERVICE_PROVIDER_DSUC</h1><span className="pill pill-success">● Published</span></div>
                </div>
                <div className="os-hero-actions"><button type="button" className="os-idbtn"><Icon name="key" size={13} /> ID</button><button type="button" className="os-idbtn" aria-label="Share"><Icon name="share" size={14} /></button><div className="os-progress"><div className="os-progress-bar"><i style={{ width: "100%" }} /></div><span className="os-progress-pct">100%</span></div><button type="button" className="btn btn-ghost">Unpublish</button></div>
              </div>
              <div className="os-cat-row">
                <span className="ps-hero-tag"><Icon name="layers" size={16} /> Mutualise data to train AI</span>
                <span className="ps-hero-tag"><Icon name="sparkle" size={16} /> VR learning analytics</span>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
                <div className="os-cfg">
                    <nav className="os-rail" aria-label="Project sections">
                      {RAIL.map((g) => (
                        <React.Fragment key={g.key}>
                          {g.label && <div className="os-rail-glabel">{g.label}</div>}
                          {g.items.map((c) => {
                            const nc = c.id === "clauses" ? negClauses : 0;
                            const on = active === c.id;
                            return (
                              <button key={c.id} type="button" className={`os-rail-item ${on ? "active" : ""}`} onClick={() => go(c.id)} aria-current={on ? "true" : undefined}>
                                <span className="os-rail-ic"><Icon name={c.icon} size={16} /></span>
                                <span className="os-rail-name">{c.name}</span>
                                {nc > 0 && <span className="os-rail-badge" title={`${nc} negotiable`}>{nc}</span>}
                              </button>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </nav>
                    <section className="os-panel">
                      <div className="os-panel-head">
                        <div><h2>{head.title}</h2><p>{head.desc}</p></div>
                        {onSettings && cat === "clauses" && <button type="button" className="os-panel-defaults" onClick={applyClauseDefaults}><Icon name="download" size={13} /> Adopt dataspace defaults</button>}
                      </div>
                      <div className="os-panel-body">
                        {!onSettings
                          ? (tab === "Contract" ? <ContractView />
                            : tab === "Matching offers" ? <Placeholder title="Matching offers" body="Offers from the catalogue that match this project's needs would appear here." />
                            : tab === "Participants" ? <Placeholder title="Participants" body="Organisations involved in the project and their roles." />
                            : <Placeholder title="Service chains" body="How services connect and exchange data within the project." />)
                          : cat === "overview" ? <OverviewPanel st={st} goTo={setCat} /> : <CategoryBody cat={cat} st={st} set={set} />}
                      </div>
                      {onSettings && (
                        <div className="os-panel-foot">
                          <span className="sb-txt">{inlineSaved ? <b>✓ All changes saved</b> : dirty ? "Unsaved changes · Save to persist." : "No changes to save."}</span>
                          <div className="sb-actions"><button type="button" className="btn btn-ghost" onClick={() => setSt(seed())}>Reset all</button><button type="button" className="btn btn-primary" onClick={saveInline} disabled={!dirty} title={dirty ? undefined : "No changes to save"}><Icon name="check" size={14} /> Save changes</button></div>
                        </div>
                      )}
                    </section>
                </div>
            </div>
      </div>
    </AppLayout>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ProjectSettingsApp />);
})();
