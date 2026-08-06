// VisionsTrust — full-page contract view, opened from the My Contracts drawer
// ("Open full page"). Shows the SAME contract material as My Projects — project-wide
// terms, participants & offers, service chains — plus the per-offer exit procedure
// from the Project Participant / Project Orchestrator pages.
(function () {
const { useState } = React;
const { Icon, AppSidebar, BottomNav, BottomNavSheet } = window.UI;
const { CONTRACTS, STATUS_META, YOU } = window.ContractsData;
const D = window.ProjectsData;
const { ORG, ECO, ME_PARTICIPANT, fmtDate: fmtIso, isCurrent } = D;
const { useToast, TabBar, ChainCard, ContractParticipants, OrgAv } = window.PJ;
const { ExitWizard, ParticipantExitPanel, OrchestratorExitPanel } = window.CDExit;

const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const initials = (n) => n.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "·";

const param = (k) => { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } };
const CONTRACT = CONTRACTS.find(c => c.id === param("id")) || CONTRACTS.find(c => c.needsYou) || CONTRACTS[0];
const ME = CONTRACT.role === "orchestrator" ? ECO.orchestrator : ME_PARTICIPANT;
// One identity, one contract ID everywhere: the contract dataset is the source of truth.
const CTX = { contractId: CONTRACT.id, orchName: CONTRACT.orchestrator, youName: YOU };

const StatusPill = ({ status }) => {
  const m = STATUS_META[status];
  return <span className={`pill pill-${m.tone === "muted" ? "default" : m.tone}`}><Icon name={m.icon} size={12}/>{m.label}</span>;
};

// ─── HERO ────────────────────────────────────────────────────────────────────
function Hero({ c, exitingN, onTab }) {
  const full = c.signedCount === c.total;
  return (
    <div className="cd-hero">
      <div className="cd-hero-top">
        <div className="cd-mono" style={{ background: c.accent }} aria-hidden="true">{initials(c.name)}</div>
        <div className="cd-hero-tx">
          <div className="cd-pills">
            <StatusPill status={c.status}/>
            <span className="pill pill-primary"><Icon name={c.role === "orchestrator" ? "share" : "team"} size={12}/>{c.role === "orchestrator" ? "You orchestrate" : "You participate"}</span>
          </div>
          <h2 className="cd-title">{c.name}</h2>
          <p className="cd-sub">{c.purpose}</p>
          <div className="cd-meta">
            <span><Icon name="clock" size={13}/>Created {fmtDate(c.created)}</span>
            <span><Icon name="building" size={13}/>Orchestrated by <b>{c.orchestrator}</b></span>
            <span><Icon name="projects" size={13}/>Project <a href={c.role === "orchestrator" ? "Project Orchestrator.html" : "Project Participant.html"}>{ECO.name}</a></span>
          </div>
        </div>
        <div className="cd-actions">
          <a className="btn btn-ghost" href="My Contracts.html"><Icon name="chevronLeft" size={14}/>My Contracts</a>
          <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(c.id)}><Icon name="copy" size={14}/>Copy ID</button>
          <button type="button" className="btn btn-primary"><Icon name="download" size={14}/>Download PDF</button>
        </div>
      </div>
      <div className="cd-stats">
        <div className="cd-stat">
          <span className="k">Signatures</span>
          <span className="v">{c.signedCount}/{c.total}</span>
          <div className={`ct-progress ${full ? "full" : "stalled"}`}><i style={{ width: `${(c.signedCount / c.total) * 100}%` }}/></div>
        </div>
        <div className="cd-stat"><span className="k">Data resources</span><span className="v">{c.dataResources}</span></div>
        <div className="cd-stat"><span className="k">Services</span><span className="v">{c.services}</span></div>
        <div className="cd-stat"><span className="k">Your contributions</span><span className="v">{c.contributions}</span></div>
        <button type="button" className={`cd-stat act ${exitingN > 0 ? "alert" : ""}`} onClick={() => onTab("exit")}>
          <span className="k">Exit procedure</span>
          <span className="v">{exitingN}</span>
          <span className="f">{exitingN > 0 ? "in progress — review" : "start a request"}</span>
        </button>
      </div>
    </div>
  );
}

// ─── TABS ────────────────────────────────────────────────────────────────────
function TermsTab({ c, onToast }) {
  return (
    <section className="pj-sec" aria-label="Contract terms">
      <div className="pj-banner info"><Icon name="info" size={15}/><span>Terms validated between the orchestrator and every participant. Data and services are exchanged on these terms through the data space.</span></div>
      {c.needsYou && <div className="pj-banner warn"><Icon name="pen" size={15}/><span><strong>Your signature is required.</strong> Review the terms below, then sign to activate the contract.</span></div>}
      <div className="pj-idfield">
        <span className="lbl">Contract ID</span><code>{c.id}</code>
        <button type="button" className="pj-mini-btn" onClick={() => { navigator.clipboard?.writeText(c.id); onToast("Contract ID copied"); }}><Icon name="copy" size={12}/>Copy</button>
        {c.needsYou && <button type="button" className="pj-mini-btn" onClick={() => onToast("Signature flow (mock)")}><Icon name="pen" size={12}/>Sign</button>}
      </div>
      {window.PJContract && <window.PJContract.ProjectTermsDoc/>}
      <div className="pj-sec-head"><div><h2>Participants and offers</h2><p>For each participant, their offerings, roles and negotiated service &amp; contract terms.</p></div></div>
      <ContractParticipants me={ME}/>
    </section>
  );
}

function SignaturesTab({ c, onToast }) {
  const full = c.signedCount === c.total;
  return (
    <section className="pj-sec" aria-label="Signatures">
      <div className="pj-sec-head"><div><h2>Signatures</h2><p>{full ? "All parties have signed — the contract is fully executed." : `${c.total - c.signedCount} of ${c.total} signatures still missing.`}</p></div></div>
      <div className="sig-list">
        {c.signatories.map((s, i) => (
          <div className="sig-row" key={i}>
            <div className={`sr-av ${s.signed ? "signed" : "missing"}`}>{initials(s.name)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="sr-name">{s.name}{s.name === YOU && <span className="sr-you">You</span>}</div>
              <div className="sr-role">{s.isOrch ? "Orchestrator" : "Participant"}</div>
            </div>
            <span className={`sig-state ${s.signed ? "ok" : "no"}`}><Icon name={s.signed ? "check" : "x"} size={13}/>{s.signed ? "Signed" : "Missing"}</span>
          </div>
        ))}
      </div>
      {c.needsYou && <div className="exit-actions" style={{ marginTop: 14 }}><button type="button" className="btn btn-primary" onClick={() => onToast("Signature flow (mock)")}><Icon name="pen" size={14}/>Review &amp; sign</button></div>}
    </section>
  );
}

function ChainsTab({ reqs }) {
  const pendingN = reqs.filter(r => isCurrent(r.status)).length;
  const approvedN = reqs.filter(r => r.status === "approved").length;
  return (
    <section className="pj-sec" aria-label="Service chains">
      <div className="pj-sec-head"><div><h2>Service chains under this contract</h2><p>Chains highlighted in red include an offer with an exit request.</p></div></div>
      {pendingN > 0 && <div className="pj-banner warn"><Icon name="danger" size={15}/><span><strong>{pendingN} exit request{pendingN > 1 ? "s" : ""} pending.</strong> Chains using the requested offers are invalidated if approved.</span></div>}
      {approvedN > 0 && <div className="pj-banner danger"><Icon name="layers" size={15}/><span><strong>Chains invalidated.</strong> Approved exits deactivate their chains on the effective date.</span></div>}
      {ECO.chains.map(ch => <ChainCard key={ch.id} chain={ch} reqs={reqs}/>)}
    </section>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
function ContractDetailApp() {
  const [reqs, api] = D.useExitRequests();
  const [tab, setTab] = useState(param("tab") === "exit" ? "exit" : "terms");
  const [wizardOffer, setWizardOffer] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toastNode, toast] = useToast();
  const c = CONTRACT;
  const scope = c.role === "orchestrator" ? reqs : reqs.filter(r => r.org === ME);
  const activeN = scope.filter(r => isCurrent(r.status) || r.status === "approved").length;

  const TABS = [
    { id: "terms", label: "Contract terms", icon: "contracts" },
    { id: "signatures", label: "Signatures", icon: "pen", badge: c.needsYou ? 1 : 0 },
    { id: "exit", label: "Exit procedure", icon: "external", badge: scope.filter(r => isCurrent(r.status)).length },
    { id: "chains", label: "Service chains", icon: "layers" },
  ];

  return (
    <div className="app ui-v2" data-screen-label="Contract — full page">
      <a href="#cd-main" className="skip-link">Skip to content</a>
      <AppSidebar variant="v2" activeId="contracts"/>
      <div className="main">
        <header className="topbar cat-topbar">
          <div className="topbar-left"><div className="page-title"><Icon name="contracts" size={20}/><h1>Contract</h1></div></div>
          <div className="topbar-right">
            <span className="persona-chip" title="Your role on this contract"><span className="pc-role">Viewing as</span><span className="pc-name">{YOU}</span><span className="pill pill-default">{c.role === "orchestrator" ? "Orchestrator" : "Participant"}</span></span>
            <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16}/><span>Help</span></button>
            <button type="button" className="icon-btn ghost notif" aria-label="Notifications"><Icon name="bell" size={18}/></button>
            <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18}/></button>
          </div>
        </header>

        <main className="pj-content" id="cd-main" tabIndex={-1}>
          <div className="pj-crumb"><a href="My Contracts.html">My Contracts</a><Icon name="chevronRight" size={12}/><span className="cur">{c.name}</span></div>
          <Hero c={c} exitingN={activeN} onTab={setTab}/>
          <TabBar tabs={TABS} active={tab} onSelect={setTab}/>
          {tab === "terms" && <TermsTab c={c} onToast={toast}/>}
          {tab === "signatures" && <SignaturesTab c={c} onToast={toast}/>}
          {tab === "exit" && (c.role === "orchestrator"
            ? <OrchestratorExitPanel reqs={reqs} api={api} onToast={toast}/>
            : <ParticipantExitPanel me={ME} ctx={CTX} reqs={reqs} api={api} onToast={toast} onRequest={setWizardOffer}/>)}
          {tab === "chains" && <ChainsTab reqs={reqs}/>}
        </main>
      </div>

      <BottomNav onOpenMore={() => setMoreOpen(true)}/>
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)}/>
      {wizardOffer && <ExitWizard offer={wizardOffer} me={ME} ctx={CTX} api={api} onClose={() => setWizardOffer(null)} onToast={toast}/>}
      {toastNode}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ContractDetailApp/>);
})();
