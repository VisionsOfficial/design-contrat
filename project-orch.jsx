// VisionsTrust — Project detail, ORCHESTRATOR persona (ServiceProvider)
// Per-offer exit requests · sees ALL participants' requests · current + finished history
(function() {
const { useState, useMemo } = React;
const { Icon, AppSidebar, BottomNav, BottomNavSheet, Field, Input, Textarea, Select } = window.UI;
const D = window.ProjectsData;
const { ORG, ECO, EXIT_REASONS, useExitRequests, impactedChains, fmtDate, initials, isCurrent, isFinished } = D;
const { OrgAv, StatusPill, ExitPill, OfferTag, useToast, Modal, Steps, OfferAcc, ProjectHero, PersonaChip, TabBar, ChainCard, ImpactList, ExitTimeline, ReqFilter, RequestTable, FlowDoc, NotifBell, DemoGuide } = window.PJ;

const ME = ECO.orchestrator; // serviceprovider

// ─── PARTICIPANTS TAB ────────────────────────────────────────────────────────
function ContribList({ part, offers, mine, reqs, api, onToast, onInitiateExit }) {
  const [open, setOpen] = useState(false);
  const reqOf = (name) => reqs.find(x => x.offer === name && (isCurrent(x.status) || x.status === "approved"));
  const cancelExit = (r) => {
    api.update(r.id, { status: "withdrawn", decidedAt: D.TODAY, effectiveDate: "" },
      { actor: "orchestrator", event: "withdrawn", note: "Exit proposal cancelled by the orchestrator." });
    onToast(`Exit proposal for ${r.offer} cancelled — participant notified`);
  };
  return (
    <div className="pj-contrib">
      <button type="button" className="pj-contrib-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {mine ? "Your contributions" : "Contributions"} <span className="n">({offers.length})</span>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14}/>
      </button>
      {open && (
        <div className="pj-contrib-list">
          {offers.map(o => {
            const r = reqOf(o.name);
            const st = r ? r.status : null;
            const proposed = st === "awaiting_participant" && r.initiatedBy === "orchestrator";
            return (
              <div key={o.id} className="pj-contrib-row">
                <span className={`pj-offer-type ${o.type}`}>{o.type}</span>
                <span className="pj-offer-name" title={o.name}>{o.name}</span>
                {st && <span className="act">{st === "approved" ? <StatusPill tone="warn" icon="clock">Exiting</StatusPill> : <ExitPill status={st}/>}</span>}
                {proposed && !mine && <span className="act"><button type="button" className="pj-mini-btn" onClick={() => cancelExit(r)}><Icon name="x" size={12}/>Cancel proposal</button></span>}
                {!st && mine && <span className="act"><button type="button" className="pj-mini-btn" onClick={() => onToast(`Edit ${o.name} (mock)`)}><Icon name="edit" size={12}/>Modify</button></span>}
                {!st && !mine && <span className="act"><button type="button" className="pj-mini-btn danger" onClick={() => onInitiateExit(part, o)}><Icon name="danger" size={12}/>Propose exit</button></span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ParticipantCard({ part, reqs, api, onRenegotiate, onToast, onGoExit, onInitiateExit }) {
  const [menu, setMenu] = useState(false);
  const o = ORG[part.org];
  const active = reqs.filter(r => r.org === part.org && isCurrent(r.status));
  const approved = reqs.filter(r => r.org === part.org && r.status === "approved");
  return (
    <div className={`pj-part-card ${active.length ? "exiting" : ""}`}>
      <div className="pj-part-head">
        <OrgAv orgId={part.org} size={40} className="pj-part-av"/>
        <div>
          <div className="pj-part-name">{o.name}</div>
          <div className="pj-part-org">{o.org} · joined {fmtDate(part.joined)}</div>
        </div>
        <span className="menu-anchor">
          <button type="button" className="pj-kebab" aria-label={`Actions for ${o.name}`} onClick={() => setMenu(m => !m)}><Icon name="more" size={16}/></button>
          {menu && (
            <div className="pj-menu" onMouseLeave={() => setMenu(false)}>
              <button type="button" onClick={() => { setMenu(false); onRenegotiate(part); }}><Icon name="coin" size={14}/>Renegotiate offers</button>
              <button type="button" onClick={() => { setMenu(false); onToast(`Opening ${o.name} profile (mock)`); }}><Icon name="external" size={14}/>View profile</button>
              <button type="button" onClick={() => { setMenu(false); onToast("Message sent (mock)"); }}><Icon name="chat" size={14}/>Contact</button>
            </div>
          )}
        </span>
      </div>
      {active.length > 0 && (
        <div className="pj-banner warn" style={{ marginBottom: 0 }}>
          <Icon name="danger" size={15}/>
          <span><strong>{active.length} offer exit request{active.length > 1 ? "s" : ""}</strong> pending — <a href="#" onClick={e => { e.preventDefault(); onGoExit(); }}>review</a></span>
        </div>
      )}
      {active.length === 0 && approved.length > 0 && (
        <div className="pj-banner success" style={{ marginBottom: 0 }}>
          <Icon name="check" size={15}/>
          <span><strong>{approved.length} offer{approved.length > 1 ? "s" : ""} exiting</strong> — effective {fmtDate(approved[0].effectiveDate)}.</span>
        </div>
      )}
      <div className="pj-roles">{part.roles.map(r => <span key={r} className="pj-role"><Icon name="check" size={12}/>{r}</span>)}</div>
      <ContribList part={part} offers={part.offers} reqs={reqs} api={api} onToast={onToast} onInitiateExit={onInitiateExit}/>
    </div>
  );
}

function ParticipantsTab({ reqs, api, onRenegotiate, onToast, onGoExit, onInitiateExit }) {
  const me = ECO.participants.find(p => p.org === ME);
  const others = ECO.participants.filter(p => p.org !== ME);
  return (
    <section className="pj-sec" aria-label="Participants">
      <div className="pj-sec-head">
        <div><h2>Participants in your project</h2><p>{ECO.participants.length} organisations · use the ⋮ menu to renegotiate a participant's offers.</p></div>
        <span className="right"><button type="button" className="btn btn-ghost" onClick={() => onToast("Invite flow (mock)")}><Icon name="plus" size={14}/>Invite participant</button></span>
      </div>
      <div className="pj-me-card">
        <div className="pj-part-head" style={{ marginBottom: 10 }}>
          <OrgAv orgId={ME} size={40} className="pj-part-av"/>
          <div><div className="pj-part-name">{ORG[ME].name} <span className="pill pill-primary" style={{ marginLeft: 6 }}>My participant</span></div><div className="pj-part-org">{ORG[ME].org}</div></div>
        </div>
        <div className="pj-roles" style={{ marginBottom: 4 }}><span className="pj-role you"><Icon name="check" size={12}/>Orchestrator</span></div>
        <ContribList part={me} offers={me.offers} mine reqs={reqs} api={api} onToast={onToast}/>
      </div>
      <div className="pj-parts-grid">
        {others.map(p => <ParticipantCard key={p.org} part={p} reqs={reqs} api={api} onRenegotiate={onRenegotiate} onToast={onToast} onGoExit={onGoExit} onInitiateExit={onInitiateExit}/>)}
      </div>
    </section>
  );
}

// ─── RENEGOTIATION WIZARD ────────────────────────────────────────────────────
function RenegotiateModal({ part, onClose, onDone }) {
  const [step, setStep] = useState(0);
  const [offer, setOffer] = useState(part.offers[0].id);
  const [price, setPrice] = useState("1");
  const [period, setPeriod] = useState("One shot");
  const [setup, setSetup] = useState("3");
  const [api, setApi] = useState("0.05");
  const [note, setNote] = useState("");
  const sel = part.offers.find(o => o.id === offer);
  const o = ORG[part.org];
  return (
    <Modal title={`Renegotiate offers — ${o.name}`} sub="Send a counter-proposal on the usage of this participant's offerings for your project." onClose={onClose}
      steps={<Steps steps={["Offer", "Pricing", "Review & send"]} current={step} onGo={setStep}/>}
      foot={<>
        {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep(s => s - 1)}><Icon name="chevronLeft" size={14}/>Back</button>}
        <span className="spacer"/>
        <button type="button" className="btn btn-text" onClick={onClose}>Cancel</button>
        {step < 2
          ? <button type="button" className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Next<Icon name="chevronRight" size={14}/></button>
          : <button type="button" className="btn btn-primary" onClick={() => { onDone(`Counter-proposal sent to ${o.name}`); onClose(); }}><Icon name="upload" size={14}/>Send proposal</button>}
      </>}>
      {step === 0 && (
        <div className="pj-radio-cards">
          {part.offers.map(of => (
            <label key={of.id} className={`pj-radio-card ${offer === of.id ? "sel" : ""}`} onClick={() => setOffer(of.id)}>
              <span className="rb" aria-hidden="true"/><span className={`pj-offer-type ${of.type}`}>{of.type}</span>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{of.name}</span>
            </label>
          ))}
        </div>
      )}
      {step === 1 && (
        <div>
          <div className="pj-field-row">
            <Field label="Subscription pricing" required><Input type="number" value={price} onChange={e => setPrice(e.target.value)}/></Field>
            <Field label="Billing period"><Select value={period} onChange={e => setPeriod(e.target.value)}><option>One shot</option><option>Monthly</option><option>Quarterly</option><option>Yearly</option></Select></Field>
          </div>
          <div className="pj-field-row">
            <Field label="Setup fee" hint="If any"><Input type="number" value={setup} onChange={e => setSetup(e.target.value)}/></Field>
            <Field label="Cost per API call" hint="If relevant"><Input type="number" step="0.01" value={api} onChange={e => setApi(e.target.value)}/></Field>
          </div>
          <Field label="Pricing description"><Textarea className="pj-textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Explain the proposed terms…"/></Field>
        </div>
      )}
      {step === 2 && (
        <div>
          <div className="pj-banner info"><Icon name="info" size={15}/><span>{o.name} will be notified and can accept or counter this proposal. Current terms stay in force meanwhile.</span></div>
          <div className="exit-kv">
            <div className="kv"><span className="k">Offer</span><span className="v mono">{sel.name}</span></div>
            <div className="kv"><span className="k">Subscription</span><span className="v">{price} EUR · {period}</span></div>
            <div className="kv"><span className="k">Setup fee</span><span className="v">{setup} EUR</span></div>
            <div className="kv"><span className="k">Cost per API call</span><span className="v">{api} EUR</span></div>
            {note && <div className="kv"><span className="k">Note</span><span className="v">{note}</span></div>}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── PROPOSE-EXIT MODAL (orchestrator-driven, needs participant validation) ──
const TYPE_LABEL = { data: "Data", service: "Service", infrastructure: "Infrastructure" };
function InitiateExitModal({ part, offer, api, onClose, onToast, onDone }) {
  const [reason, setReason] = useState(EXIT_REASONS[0]);
  const [note, setNote] = useState("");
  const [days, setDays] = useState(30);
  const [date, setDate] = useState(D.addDays(D.TODAY, 30));
  const [ack, setAck] = useState(false);
  const o = ORG[part.org];
  const hit = impactedChains(offer.name);
  const setNotice = (n) => { setDays(n); setDate(D.addDays(D.TODAY, n)); };
  const launch = () => {
    api.create({
      org: part.org, offer: offer.name, offerType: TYPE_LABEL[offer.type] || "Data",
      status: "awaiting_participant", initiatedBy: "orchestrator",
      reasonCategory: reason, reason: note,
      noticeDays: days, effectiveDate: date, decidedAt: "", submittedAt: D.TODAY,
      log: [{ at: D.TODAY, actor: "orchestrator", event: "initiated", note: `Exit proposed by the orchestrator — awaiting the participant's validation (proposed effective ${fmtDate(date)}).` }],
    });
    onToast(`Exit proposed for ${offer.name} — awaiting ${o.name}'s validation`);
    onClose();
    onDone();
  };
  return (
    <Modal title={`Propose exit — ${offer.name}`} sub={`Propose to withdraw this offer of ${o.name} from the project. The exit only takes effect once ${o.name} also validates it.`} onClose={onClose}
      foot={<><span className="spacer"/><button type="button" className="btn btn-text" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-danger" disabled={hit.length > 0 && !ack} onClick={launch}><Icon name="upload" size={14}/>Propose exit</button></>}>
      <div className="pj-banner info"><Icon name="info" size={15}/><span>This starts a <strong>two-party exit</strong>: {o.name} is notified and must validate it. Nothing changes until both sides agree — you can cancel the proposal any time before then.</span></div>
      <div className="pj-banner warn"><Icon name="danger" size={15}/><span>You are proposing to remove <strong>{offer.name}</strong> ({offer.type}) contributed by <strong>{o.name}</strong>.</span></div>
      <Field label="Reason for exit" required><Select value={reason} onChange={e => setReason(e.target.value)}>{EXIT_REASONS.map(r => <option key={r}>{r}</option>)}</Select></Field>
      <Field label="Message to the participant" hint="Shared with the participant"><Textarea className="pj-textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Explain why this offer should be removed…"/></Field>
      <div className="pj-field-row">
        <Field label="Proposed notice period">
          <Select value={String(days)} onChange={e => setNotice(Number(e.target.value))}>
            <option value="0">Immediate</option><option value="15">15 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option>
          </Select>
        </Field>
        <Field label="Proposed effective date" hint="Applies once validated" required><Input type="date" value={date} onChange={e => setDate(e.target.value)}/></Field>
      </div>
      {hit.length > 0 ? (
        <>
          <div className="pj-banner danger" style={{ marginTop: 4 }}><Icon name="layers" size={15}/><span><strong>{hit.length} service chain{hit.length > 1 ? "s" : ""} would be invalidated and deactivated</strong> on the effective date, once the exit is validated by both parties.</span></div>
          <ImpactList offer={offer.name} status="pending"/>
          <label className={`pj-ack ${ack ? "checked" : ""}`}>
            <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/>
            <span>I understand that if {o.name} validates this exit, {hit.map(c => c.name).join(", ")} will be invalidated and deactivated, and all participants of these chains will be notified.</span>
          </label>
        </>
      ) : <div className="pj-banner success" style={{ marginTop: 4 }}><Icon name="check" size={15}/><span>No service chain uses this offer — nothing else will be affected.</span></div>}
    </Modal>
  );
}

// ─── CONTRACT TAB ────────────────────────────────────────────────────────────
function ContractTab({ onToast }) {
  return (
    <section className="pj-sec" aria-label="Contract">
      <div className="pj-banner info"><Icon name="info" size={15}/><span>This section lets you validate the agreements you have with providers. Invite providers, negotiate terms, then send a validation. Once validated, data and services are exchanged on those terms through the data space <a href="#">(see My Tech Space)</a>.</span></div>
      <div className="pj-idfield">
        <span className="lbl">Contract ID</span><code>{ECO.contractId}</code>
        <button type="button" className="pj-mini-btn" onClick={() => { navigator.clipboard?.writeText(ECO.contractId); onToast("Contract ID copied"); }}><Icon name="copy" size={12}/>Copy</button>
        <button type="button" className="pj-mini-btn" onClick={() => onToast("Opening contract (mock)")}><Icon name="external" size={12}/>Open in My Contracts</button>
      </div>
      {window.PJContract && <window.PJContract.ProjectTermsDoc/>}
      <div className="pj-sec-head"><div><h2>Participants and offers</h2><p>For each participant, their offerings, roles and negotiated service &amp; contract terms.</p></div></div>
      {window.PJ.ContractParticipants && <window.PJ.ContractParticipants me={ME}/>}
    </section>
  );
}

// ─── CHAINS TAB ──────────────────────────────────────────────────────────────
function ChainsTab({ reqs }) {
  const approvedN = reqs.filter(r => r.status === "approved").length;
  const pendingN = reqs.filter(r => isCurrent(r.status)).length;
  return (
    <section className="pj-sec" aria-label="Service chains">
      <div className="pj-sec-head"><div><h2>Service chains</h2><p>Sequences of offers exchanging through the data space under this project's contract.</p></div></div>
      {approvedN > 0 && <div className="pj-banner danger"><Icon name="layers" size={15}/><span><strong>Chains invalidated.</strong> Approved offer exits have deactivated the chains using those offers.</span></div>}
      {pendingN > 0 && approvedN === 0 && <div className="pj-banner warn"><Icon name="danger" size={15}/><span><strong>Pending exit requests.</strong> Some chains would be invalidated if the requested offer exits are approved.</span></div>}
      {ECO.chains.map(c => <ChainCard key={c.id} chain={c} reqs={reqs}/>)}
    </section>
  );
}

// ─── DECISION MODALS ─────────────────────────────────────────────────────────
function ApproveModal({ req, api, onClose, onToast }) {
  const [days, setDays] = useState(req.noticeDays || 30);
  const [date, setDate] = useState(req.effectiveDate || D.addDays(D.TODAY, 30));
  const [ack, setAck] = useState(false);
  const hit = impactedChains(req.offer);
  const setNotice = (n) => { setDays(n); setDate(D.addDays(D.TODAY, n)); };
  const approve = () => {
    api.update(req.id, { status: "approved", noticeDays: days, effectiveDate: date, decidedAt: D.TODAY },
      { actor: "orchestrator", event: "approved", note: `Approved with ${days}-day notice — effective ${fmtDate(date)}.` });
    onToast("Exit approved — participant and affected parties notified");
    onClose();
  };
  return (
    <Modal title={`Approve exit — ${req.offer}`} sub={`${ORG[req.org].name} will withdraw this offer from the project.`} onClose={onClose}
      foot={<><span className="spacer"/><button type="button" className="btn btn-text" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={hit.length > 0 && !ack} onClick={approve}><Icon name="check" size={14}/>Approve exit</button></>}>
      <div className="pj-field-row">
        <Field label="Notice period">
          <Select value={String(days)} onChange={e => setNotice(Number(e.target.value))}>
            <option value="0">Immediate</option><option value="15">15 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option>
          </Select>
        </Field>
        <Field label="Effective date" hint="End of notice period" required><Input type="date" value={date} onChange={e => setDate(e.target.value)}/></Field>
      </div>
      {hit.length > 0 ? (
        <>
          <div className="pj-banner danger" style={{ marginTop: 4 }}><Icon name="layers" size={15}/><span><strong>{hit.length} service chain{hit.length > 1 ? "s" : ""} will be invalidated and deactivated</strong> on the effective date. Exchanges through them will stop.</span></div>
          <ImpactList offer={req.offer} status="pending"/>
          <label className={`pj-ack ${ack ? "checked" : ""}`}>
            <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/>
            <span>I understand {hit.map(c => c.name).join(", ")} will be invalidated and deactivated, and all participants of these chains will be notified.</span>
          </label>
        </>
      ) : <div className="pj-banner success" style={{ marginTop: 4 }}><Icon name="check" size={15}/><span>No service chain uses this offer — nothing else will be affected.</span></div>}
    </Modal>
  );
}

function MessageModal({ title, sub, cta, danger, onSend, onClose }) {
  const [msg, setMsg] = useState("");
  return (
    <Modal title={title} sub={sub} onClose={onClose}
      foot={<><span className="spacer"/><button type="button" className="btn btn-text" onClick={onClose}>Cancel</button>
        <button type="button" className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={!msg.trim()} onClick={() => onSend(msg.trim())}>{cta}</button></>}>
      <Field label="Message to the participant" required><Textarea className="pj-textarea" value={msg} onChange={e => setMsg(e.target.value)} placeholder="Explain what you need or why…"/></Field>
    </Modal>
  );
}

// ─── CURRENT REQUEST CARD (actionable) ──────────────────────────────────────
function CurrentCard({ req, api, onToast }) {
  const [modal, setModal] = useState(null);
  const hit = impactedChains(req.offer);
  return (
    <div className="exit-card" data-comment-anchor="orch-exit-request">
      <div className="exit-req-head">
        <OrgAv orgId={req.org} size={42} className="pj-part-av"/>
        <div className="meta">
          <div className="who">{ORG[req.org].name} · <span className="mono" style={{ fontSize: 13 }}>{req.offer}</span></div>
          <div className="when">{req.id} · submitted {fmtDate(req.submittedAt)}</div>
        </div>
        <span className="right"><ExitPill status={req.status}/></span>
      </div>
      <div className="exit-kv">
        <div className="kv"><span className="k">Offer</span><span className="v"><OfferTag offer={req.offer} type={req.offerType}/></span></div>
        <div className="kv"><span className="k">Reason</span><span className="v">{req.reasonCategory || "Not specified"}</span></div>
        <div className="kv"><span className="k">Impacted chains</span><span className="v">{hit.length}</span></div>
      </div>
      {req.reason && <div className="exit-quote">“{req.reason}”</div>}
      <h3 style={{ marginTop: 14 }}>Impact on service chains</h3>
      <ImpactList offer={req.offer} status={req.status} showUnaffected/>
      {req.status === "info_requested" && (
        <div className="pj-banner info" style={{ marginTop: 12 }}>
          <Icon name="chat" size={15}/>
          <span><strong>You asked for more information:</strong> “{req.orchMessage}”
            {req.reply ? <><br/><strong>{ORG[req.org].name} replied:</strong> “{req.reply}”</> : <><br/>Waiting for the participant's reply.</>}</span>
        </div>
      )}
      {req.initiatedBy === "orchestrator" ? (
        <>
          <div className="pj-banner info" style={{ marginTop: 12 }}><Icon name="hourglass" size={15}/><span><strong>You proposed this exit</strong> — waiting for {ORG[req.org].name} to validate it. Proposed effective {fmtDate(req.effectiveDate)}. The exit only takes effect once they agree.</span></div>
          <div className="exit-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModal("cancel")}><Icon name="x" size={14}/>Cancel proposal</button>
            <span className="spacer" style={{ flex: 1 }}/>
          </div>
        </>
      ) : (
        <div className="exit-actions">
          <button type="button" className="btn btn-primary" onClick={() => setModal("approve")}><Icon name="check" size={14}/>Approve…</button>
          <button type="button" className="btn btn-danger" onClick={() => setModal("reject")}><Icon name="x" size={14}/>Reject…</button>
          <span className="spacer" style={{ flex: 1 }}/>
        </div>
      )}
      {modal === "cancel" && <MessageModal title="Cancel exit proposal" sub="The proposed exit is dropped and the offer stays in the project. Give a reason — shared with the participant." cta="Cancel proposal" danger onClose={() => setModal(null)}
        onSend={(m) => { api.update(req.id, { status: "withdrawn", decidedAt: D.TODAY, effectiveDate: "", orchMessage: m }, { actor: "orchestrator", event: "withdrawn", note: m }); onToast("Exit proposal cancelled"); setModal(null); }}/>}
      {modal === "approve" && <ApproveModal req={req} api={api} onClose={() => setModal(null)} onToast={onToast}/>}
      {modal === "info" && <MessageModal title="Request more information" sub="The participant will be notified and can reply before you decide." cta="Send request" onClose={() => setModal(null)}
        onSend={(m) => { api.update(req.id, { status: "info_requested", orchMessage: m, decidedAt: "" }, { actor: "orchestrator", event: "info_requested", note: m }); onToast("Information request sent"); setModal(null); }}/>}
      {modal === "reject" && <MessageModal title="Reject exit request" sub="The offer stays in the project. Give a reason — shared with the participant." cta="Reject request" danger onClose={() => setModal(null)}
        onSend={(m) => { api.update(req.id, { status: "rejected", orchMessage: m, decidedAt: D.TODAY }, { actor: "orchestrator", event: "rejected", note: m }); onToast("Exit request rejected"); setModal(null); }}/>}
    </div>
  );
}

// ─── EXIT REQUESTS TAB ───────────────────────────────────────────────────────
function ExitTab({ reqs, api, onToast }) {
  const [filter, setFilter] = useState("current");
  const current = reqs.filter(r => isCurrent(r.status)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const finished = reqs.filter(r => isFinished(r.status)).sort((a, b) => (b.decidedAt || b.submittedAt).localeCompare(a.decidedAt || a.submittedAt));
  return (
    <section className="pj-sec" aria-label="Exit requests">
      <div className="pj-sec-head">
        <div><h2>Exit requests</h2><p>Every participant's per-offer exit request across this ecosystem.</p></div>
        <span className="right"><ReqFilter value={filter} onChange={setFilter} counts={{ current: current.length, finished: finished.length }}/></span>
      </div>
      {filter === "current" && (current.length === 0
        ? <div className="pj-empty" style={{ padding: 48 }}><Icon name="inbox" size={26}/><div style={{ marginTop: 10, fontWeight: 700, color: "var(--text-muted)" }}>No current requests</div><div style={{ marginTop: 4 }}>Pending and in-discussion offer exits appear here for validation.</div></div>
        : <div className="exit-stack">{current.map(r => <CurrentCard key={r.id} req={r} api={api} onToast={onToast}/>)}</div>)}
      {filter === "finished" && <RequestTable rows={finished} showOrg/>}
      <FlowDoc defaultOpen={current.length === 0 && filter === "current"}/>
    </section>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
function OrchProjectApp() {
  const [reqs, api] = useExitRequests();
  const [tab, setTab] = useState("participants");
  const [reneg, setReneg] = useState(null);
  const [exitTarget, setExitTarget] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toastNode, toast] = useToast();
  const currentN = reqs.filter(r => isCurrent(r.status)).length;
  const liveStatus = (reqs.find(r => r.org === "dataprovider" && r.offer === "billing_offer_test") || {}).status || "none";

  const TABS = [
    { id: "participants", label: "Participants", icon: "team" },
    { id: "contract", label: "Contract", icon: "contracts" },
    { id: "chains", label: "Service chains", icon: "layers" },
    { id: "exit", label: "Exit requests", icon: "inbox", badge: currentN },
  ];

  return (
    <div className="app ui-v2" data-screen-label="Project — orchestrator view">
      <a href="#pj-main" className="skip-link">Skip to content</a>
      <AppSidebar variant="v2" activeId="myprojects"/>
      <div className="main">
        <header className="topbar cat-topbar">
          <div className="topbar-left"><div className="page-title"><Icon name="projects" size={20}/><h1>Project</h1></div></div>
          <div className="topbar-right">
            <PersonaChip orgId={ME} role="Orchestrator"/>
            <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16}/><span>Help</span></button>
            <NotifBell side="orchestrator" reqs={reqs}/>
            <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18}/></button>
          </div>
        </header>

        <main className="pj-content" id="pj-main" tabIndex={-1}>
          <div className="pj-crumb"><a href="My Projects.html">My projects</a><Icon name="chevronRight" size={12}/><span className="cur">{ECO.name}</span></div>
          <ProjectHero actions={<>
            <button type="button" className="btn btn-ghost" onClick={() => toast("Edit project (mock)")}><Icon name="edit" size={14}/>Edit</button>
            <button type="button" className="btn btn-primary" onClick={() => toast("Project unpublished (mock)")}>Unpublish</button>
          </>}/>
          <TabBar tabs={TABS} active={tab} onSelect={setTab}/>
          {tab === "participants" && <ParticipantsTab reqs={reqs} api={api} onRenegotiate={setReneg} onToast={toast} onGoExit={() => setTab("exit")} onInitiateExit={(part, offer) => setExitTarget({ part, offer })}/>}
          {tab === "contract" && <ContractTab onToast={toast}/>}
          {tab === "chains" && <ChainsTab reqs={reqs}/>}
          {tab === "exit" && <ExitTab reqs={reqs} api={api} onToast={toast}/>}
        </main>
      </div>

      <BottomNav onOpenMore={() => setMoreOpen(true)}/>
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)}/>
      <DemoGuide side="orchestrator" reqs={reqs} reset={api.reset} goTab={setTab}/>
      {reneg && <RenegotiateModal part={reneg} onClose={() => setReneg(null)} onDone={toast}/>}
      {exitTarget && <InitiateExitModal part={exitTarget.part} offer={exitTarget.offer} api={api} onClose={() => setExitTarget(null)} onToast={toast} onDone={() => setTab("exit")}/>}
      {toastNode}

      <window.TweaksPanel>
        <window.TweakSection label="Demo — exit flow"/>
        <window.TweakSelect label="billing_offer_test state" value={liveStatus}
          options={["none", "pending", "awaiting_participant", "info_requested", "approved", "rejected"]}
          onChange={v => { api.setLive(v); setTab("exit"); }}/>
        <window.TweakButton label="Reset all exit requests" onClick={api.reset}/>
      </window.TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<OrchProjectApp/>);
})();
