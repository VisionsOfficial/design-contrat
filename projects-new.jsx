// VisionsTrust — My Projects · "Create a new project" wizard modal.
// Reuses the Project model panels built for the basket's assign-to-project step
// (window.S3F: InfoPanel, GovPanel, ClausesPanel) inside the standard PJ.Modal/Steps shell.
(function () {
const { useState } = React;
const { Icon } = window.UI;
const { Modal, Steps } = window.PJ;
const { InfoPanel, GovPanel, ClausesPanel } = window.S3F;
const D = window.ProjectSettingsData;

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
function clauseDefaults() {
  const c = {};
  D.CLAUSES.fields.forEach((f) => { c[f.id] = clone(f.def); });
  return c;
}
function seed() {
  return {
    info: { title: "", caption: "", desc: "", categories: [], country: "France", visibility: "Data space members" },
    gov: { purpose: "", benefit: "", processing: "", availDate: "", legalBasis: "Consent", legalDesc: "" },
    clauses: clauseDefaults(),
  };
}

const STEP_DEFS = [
  { id: "info", name: "Project information" },
  { id: "gov", name: "Purpose & governance" },
  { id: "clauses", name: "Contract clauses" },
];

function missing(st, id) {
  if (id === "info") {
    const m = [];
    if (!st.info.title.trim()) m.push("Project title");
    if (!st.info.caption.trim()) m.push("Project caption");
    if (!st.info.desc.trim()) m.push("Project description");
    if (!st.info.categories.length) m.push("At least one category");
    return m;
  }
  if (id === "gov") {
    const m = [];
    if (!st.gov.purpose.trim()) m.push("Project purpose");
    if (!st.gov.availDate) m.push("Desired date for data availability");
    return m;
  }
  return [];
}

function NewProjectModal({ onClose, onCreated }) {
  const [st, setSt] = useState(seed);
  const [step, setStep] = useState(0);
  const [showErr, setShowErr] = useState(false);
  const set = (mutator) => setSt((prev) => { const d = clone(prev); mutator(d); return d; });
  const cur = STEP_DEFS[step].id;
  const missNow = missing(st, cur);

  const next = () => {
    if (missNow.length) { setShowErr(true); return; }
    setShowErr(false);
    if (step < STEP_DEFS.length - 1) setStep((s) => s + 1);
    else { onCreated(st.info.title || "Untitled project"); onClose(); }
  };
  const back = () => { setShowErr(false); if (step > 0) setStep((s) => s - 1); else onClose(); };
  const goStep = (i) => { if (i < step) { setStep(i); setShowErr(false); } };

  return (
    <Modal wide title="Create a new project" sub="Set up the project's identity, purpose and the clauses every participant will accept." onClose={onClose}
      steps={<Steps steps={STEP_DEFS.map((s) => s.name)} current={step} onGo={goStep} />}
      foot={<>
        <button type="button" className="btn btn-ghost" onClick={back}><Icon name="chevronLeft" size={14} />{step === 0 ? "Cancel" : "Back"}</button>
        <span className="spacer" />
        {showErr && missNow.length > 0 && <span className="pj-modal-err"><Icon name="triggers" size={13} />{missNow.join(", ")}</span>}
        <button type="button" className="btn btn-primary" onClick={next}>
          {step < STEP_DEFS.length - 1 ? <>Next<Icon name="chevronRight" size={14} /></> : <>Create project<Icon name="check" size={14} /></>}
        </button>
      </>}>
      {cur === "info" && <InfoPanel st={st} set={set} />}
      {cur === "gov" && <GovPanel st={st} set={set} />}
      {cur === "clauses" && <ClausesPanel st={st} set={set} resetClauses={() => set((s) => { s.clauses = clauseDefaults(); })} />}
    </Modal>
  );
}
window.PJNew = { NewProjectModal };
})();
