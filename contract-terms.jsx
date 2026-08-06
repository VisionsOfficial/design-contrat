// VisionsTrust — Contract terms renderer.
// Pulls the fields configured in Project settings + Offer settings and renders them
// inside the project Contract tab. Values come from each settings page's localStorage
// state (what the user actually configured), falling back to the admin-proposed defaults.
(function () {
const { Icon } = window.UI;
const PS = window.ProjectSettingsData; // { INFO, GOVERNANCE, CLAUSES, ALL_FIELDS }
const OS = window.OfferSettingsData;   // { SECTIONS }

const isEmpty = (v) => v === "" || v == null || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && !Array.isArray(v) && Object.values(v).every(isEmpty));

// ─── unified value formatter (covers both settings schemas) ─────────────────
function fmtVal(field, v) {
  if (isEmpty(v)) return null;
  switch (field.type) {
    case "multiselect": return v.join(", ");
    case "twoSelect": case "selectDeadline": return `${v.a} · ${v.b}`;
    case "numberUnit": return `${v.n}${v.u ? " " + v.u : ""}${v.b ? " · " + v.b : ""}`;
    case "opValue": return `${v.op} ${v.v}`;
    case "procDeadline": return !/Immediate/.test(v.p) && v.d != null ? `${v.p} · ${v.d} days` : v.p;
    case "matrix": return Object.entries(v).map(([k, x]) => `${k}: ${x.n}${x.u}`).join(" · ");
    case "date": return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    default: return String(v);
  }
}

// ─── state resolution from the settings pages ───────────────────────────────
const PROJECT_LS = "vt.projectSettings.SERVICE_PROVIDER_DSUC";
const OFFER_LS = "vt.offerSettings.check_free_offer";

function projectState() {
  const values = {}, neg = {};
  PS.ALL_FIELDS.forEach((f) => { values[f.id] = f.def; neg[f.id] = !!f.neg; });
  try {
    const raw = localStorage.getItem(PROJECT_LS);
    if (raw) { const s = JSON.parse(raw); Object.assign(values, s.values || {}); Object.assign(neg, s.neg || {}); }
  } catch (e) {}
  return { values, neg };
}

function offerState() {
  const values = {}, neg = {};
  const penSec = OS.SECTIONS.find((s) => s.id === "penalties");
  OS.SECTIONS.forEach((s) => {
    (s.fields || []).forEach((f) => { values[f.id] = f.def; neg[f.id] = !!f.neg; });
    (s.groups || []).forEach((g) => g.fields.forEach((f) => { values[f.id] = f.def; neg[f.id] = !!f.neg; }));
  });
  const rule0 = {}; penSec.fields.forEach((f) => { rule0[f.id] = f.def; });
  let rules = [{ _id: "r1", ...rule0 }];
  let personalData = { ...(OS.PERSONAL_DATA_DEFAULT || {}) };
  try {
    const raw = localStorage.getItem(OFFER_LS);
    if (raw) { const s = JSON.parse(raw); Object.assign(values, s.values || {}); Object.assign(neg, s.neg || {}); if (Array.isArray(s.rules) && s.rules.length) rules = s.rules; if (s.personalData) personalData = { ...personalData, ...s.personalData }; }
  } catch (e) {}
  return { values, neg, rules, personalData };
}

// ─── atoms ──────────────────────────────────────────────────────────────────
function DefRow({ field, value, negotiable }) {
  const txt = fmtVal(field, value);
  return (
    <div className="ct-def">
      <span className="k">{field.label}{field.meaning && <span className="ct-info" title={field.meaning}><Icon name="info" size={12} /></span>}{negotiable && <span className="ct-neg" title="Open to negotiation">Negotiable</span>}</span>
      <span className={`v ${txt == null ? "empty" : ""}`}>{txt == null ? "Not specified" : txt}</span>
    </div>
  );
}

const Defs = ({ children }) => <div className="ct-defs">{children}</div>;

// Rows a group can show: [{ key, empty, node }]. Only the SET ones render by
// default — a link reveals the rest. Keeps a term section short at a glance.
function FieldRows({ rows }) {
  const [showAll, setShowAll] = React.useState(false);
  const set = rows.filter((r) => !r.empty);
  const hidden = rows.length - set.length;
  const shown = showAll ? rows : set;
  return (
    <>
      {shown.length === 0
        ? <p className="ct-empty">Nothing configured in this section yet.</p>
        : <Defs>{shown.map((r) => r.node)}</Defs>}
      {!showAll && hidden > 0 && <button type="button" className="ct-showall" onClick={() => setShowAll(true)}>Show {hidden} more field{hidden > 1 ? "s" : ""} <span>not set</span></button>}
    </>
  );
}
const rowsFor = (fields, values, neg, showNeg = true) => fields.map((f) => ({ key: f.id, empty: fmtVal(f, values[f.id]) == null, node: <DefRow key={f.id} field={f} value={values[f.id]} negotiable={showNeg && neg[f.id]} /> }));
const setCount = (fields, values) => fields.filter((f) => fmtVal(f, values[f.id]) != null).length;

// ─── collapsible term group (shared by project- and offer-level terms) ──────
function GroupAcc({ icon, title, count, defaultOpen, children }) {
  return (
    <details className="ct-acc" open={defaultOpen}>
      <summary><Icon name={icon} size={13} className="ico" /><span>{title}</span>{count != null && <span className="ct-gcount">{count}</span>}<Icon name="chevronDown" size={13} className="chev" /></summary>
      <div className="ct-acc-body">{children}</div>
    </details>
  );
}
function TermsGroup({ icon, title, fields, values, neg, showNeg = true, defaultOpen }) {
  return (
    <GroupAcc icon={icon} title={title} count={`${setCount(fields, values)}/${fields.length} set`} defaultOpen={defaultOpen}>
      <FieldRows rows={rowsFor(fields, values, neg, showNeg)} />
    </GroupAcc>
  );
}

// ─── PERSONAL DATA / GDPR (per-offer, from Offer settings) ───────────────────
function OfferGdprTerms({ pd }) {
  if (!pd || !pd.enabled) return null;
  const svc = OS.SERVICE_OFFERS || [];
  const isData = pd._kind !== "Service";
  const rows = isData ? [
    ["Data controller", pd.controller],
    ["Legal basis", pd.legalBasis],
    ["Categories of data subjects", (pd.subjectCategories || []).join(", ")],
    ["Categories of personal data", (pd.dataCategories || []).join(", ")],
    ["Special-category data (Art. 9)", pd.special === "Yes" ? ((pd.specialWhich || []).join(", ") || "Yes") : "No"],
    ["Retention & erasure", pd.retention],
    ["Data-subject rights / DPO", pd.dpoContact],
    ["Authorised processing services", (pd.linkedServices || []).map((id) => (svc.find((s) => s.id === id) || {}).name).filter(Boolean).join(", ")],
  ] : [
    ["Role under the GDPR", pd.role],
    ["Processing purpose", pd.purpose],
    ["Processing operations", (pd.operations || []).join(", ")],
    ["Technical & organisational measures", (pd.toms || []).join(", ")],
    ["Sub-processors", pd.subProcessors === "Yes" ? (pd.subProcessorList || "Yes") : "No"],
    ["International transfers (outside EEA)", pd.transfers === "Yes" ? `Yes — ${pd.transferSafeguard}` : "No"],
    ["Data Processing Agreement", pd.dpaSigned],
    ["Compliance monitoring method", pd.monitoringMethod],
  ];
  const kvRows = rows.map(([k, v]) => ({ key: k, empty: !v, node: <div className="ct-def" key={k}><span className="k">{k}</span><span className={`v ${v ? "" : "empty"}`}>{v || "Not specified"}</span></div> }));
  return (
    <GroupAcc icon="lock" title="Personal data & GDPR" count={`${rows.filter((r) => r[1]).length}/${rows.length} set`}>
      <FieldRows rows={kvRows} />
    </GroupAcc>
  );
}

// ─── PROJECT-WIDE TERMS (from Project settings) ─────────────────────────────
function ProjectTermsDoc() {
  const { values, neg } = projectState();
  const clauseCount = PS.CLAUSES.fields.filter((f) => neg[f.id]).length;
  const law = fmtVal(PS.CLAUSES.fields.find((f) => f.id === "governing_law"), values.governing_law);
  return (
    <div className="ct-doc">
      <div className="ct-doc-head">
        <div className="ct-doc-title"><Icon name="doc" size={16} /><h3>Project terms</h3></div>
        <p>Project-wide terms configured in Project settings — they apply to every offer in this contract. Sections open on click; unset fields stay tucked away.</p>
      </div>
      <div className="ctt-summary">
        <span className="ctt-stat"><span className="s-k">Legal basis</span><span className="s-v">{fmtVal({ type: "select" }, values.legal_basis) || "—"}</span></span>
        <span className="ctt-stat"><span className="s-k">Governing law</span><span className="s-v">{law || "—"}</span></span>
        <span className="ctt-stat"><span className="s-k">Negotiable clauses</span><span className="s-v">{clauseCount}</span></span>
      </div>
      <div className="ct-groups">
        <TermsGroup icon={PS.INFO.icon} title={PS.INFO.title} fields={PS.INFO.fields} values={values} neg={neg} />
        <TermsGroup icon={PS.GOVERNANCE.icon} title={PS.GOVERNANCE.title} fields={PS.GOVERNANCE.fields} values={values} neg={neg} />
        <TermsGroup icon={PS.CLAUSES.icon} title={PS.CLAUSES.title} fields={PS.CLAUSES.fields} values={values} neg={neg} showNeg={false} />
      </div>
    </div>
  );
}

// ─── PER-OFFER TERMS (from Offer settings) ──────────────────────────────────
function OfferContractTerms() {
  const [open, setOpen] = React.useState(false);
  const st = React.useMemo(() => open ? offerState() : null, [open]);
  const sec = (id) => OS.SECTIONS.find((s) => s.id === id);
  const iconFor = { sla: "clock", duration: "hourglass", termination: "danger" };
  const fieldById = (id) => OS.ALL_FIELDS.find((f) => f.id === id);
  const kv = (id) => { const f = fieldById(id); return f ? fmtVal(f, st.values[id]) : null; };
  const groupFields = (s) => (s.fields || []).concat((s.groups || []).flatMap((g) => g.fields));

  const fieldsBody = (s) => (
    <>
      {s.fields && <FieldRows rows={rowsFor(s.fields, st.values, st.neg)} />}
      {s.groups && s.groups.map((g) => (
        <div className="ct-subgroup" key={g.label}>
          <div className="ct-sublabel">{g.label}</div>
          <FieldRows rows={rowsFor(g.fields, st.values, st.neg)} />
        </div>
      ))}
    </>
  );

  const KEYS = [
    { k: "Uptime", id: "availability" }, { k: "Delivery", id: "delivery_deadline" },
    { k: "Duration", id: "contract_duration" }, { k: "Renewal", id: "renewal_mode" },
  ];
  const slaSec = sec("sla"), penSec = sec("penalties"), durSec = sec("duration"), termSec = sec("termination");

  return (
    <details className="oa-terms" open={open} onToggle={(e) => setOpen(e.target.open)}>
      <summary><Icon name="signature" size={13} /><span>Service &amp; contract terms</span><Icon name="chevronDown" size={13} className="chev" /></summary>
      {open && st && <div className="oa-terms-body">
        <div className="ct-keys">
          {KEYS.map(({ k, id }) => { const v = kv(id); return <span className="ct-key" key={id}><span className="kk">{k}</span><span className="kv">{v || "—"}</span></span>; })}
        </div>
        <OfferGdprTerms pd={st.personalData} />
        <GroupAcc icon={iconFor.sla} title={slaSec.title} count={`${setCount(groupFields(slaSec), st.values)}/${groupFields(slaSec).length} set`}>{fieldsBody(slaSec)}</GroupAcc>
        <GroupAcc icon="shield" title={penSec.title} count={st.rules.length}>
          {st.rules.map((r, i) => (
            <div className="ct-rule" key={r._id || i}>
              <div className="ct-rule-t">Rule {i + 1}{r.commitment_concerned ? ` — ${r.commitment_concerned}` : ""}</div>
              <FieldRows rows={rowsFor(penSec.fields.filter((f) => f.id !== "commitment_concerned"), r, {}, false)} />
            </div>
          ))}
        </GroupAcc>
        <GroupAcc icon={iconFor.duration} title={durSec.title} count={`${setCount(groupFields(durSec), st.values)}/${groupFields(durSec).length} set`}>{fieldsBody(durSec)}</GroupAcc>
        <GroupAcc icon={iconFor.termination} title={termSec.title} count={`${setCount(groupFields(termSec), st.values)}/${groupFields(termSec).length} set`}>{fieldsBody(termSec)}</GroupAcc>
      </div>}
    </details>
  );
}

window.PJContract = { ProjectTermsDoc, OfferContractTerms, fmtVal };
})();
