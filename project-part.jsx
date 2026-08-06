// VisionsTrust — Project detail, PARTICIPANT persona (DataProvider)
// Per-offer exit requests · sees ONLY own requests · current + finished history
(function() {
const { useState } = React;
const { Icon, AppSidebar, BottomNav, BottomNavSheet, Field, Textarea, Select } = window.UI;
const D = window.ProjectsData;
const { ORG, ECO, ME_PARTICIPANT, EXIT_REASONS, useExitRequests, impactedChains, chainsUsing, offersOf, fmtDate, initials, isCurrent, isFinished } = D;
const { OrgAv, StatusPill, ExitPill, OfferTag, useToast, Modal, Steps, OfferAcc, ProjectHero, PersonaChip, TabBar, ChainCard, ImpactList, ExitTimeline, ReqFilter, RequestTable, FlowDoc, NotifBell, DemoGuide } = window.PJ;

const ME = ME_PARTICIPANT; // dataprovider
const mePart = ECO.participants.find(p => p.org === ME);

// active (current or approved) request for a given offer name
const liveReqFor = (reqs, offerName) => reqs.find(r => r.org === ME && r.offer === offerName && (isCurrent(r.status) || r.status === "approved"));

// ─── PARTICIPANTS TAB (read-only) ────────────────────────────────────────────
function ParticipantsTab() {
  return (
    <section className="pj-sec" aria-label="Participants">
      <div className="pj-sec-head"><div><h2>Participants</h2><p>{ECO.participants.length} organisations in this ecosystem.</p></div></div>
      <div className="pj-parts-grid">
        {ECO.participants.map(p => (
          <div key={p.org} className="pj-part-card">
            <div className="pj-part-head">
              <OrgAv orgId={p.org} size={40} className="pj-part-av"/>
              <div>
                <div className="pj-part-name">{ORG[p.org].name}
                  {p.org === ME && <span className="pill pill-primary" style={{ marginLeft: 6 }}>You</span>}
                  {p.org === ECO.orchestrator && <span className="pill pill-default" style={{ marginLeft: 6 }}>Orchestrator</span>}
                </div>
                <div className="pj-part-org">{ORG[p.org].org} · joined {fmtDate(p.joined)}</div>
              </div>
            </div>
            <div className="pj-roles">{p.roles.map(r => <span key={r} className={`pj-role ${p.org === ME ? "you" : ""}`}><Icon name="check" size={12}/>{r}</span>)}</div>
            <div className="pj-contrib" style={{ paddingTop: 8 }}>
              <div className="pj-contrib-list">
                {p.offers.map(o => (
                  <div key={o.id} className="pj-contrib-row"><span className={`pj-offer-type ${o.type}`}>{o.type}</span><span className="pj-offer-name" title={o.name}>{o.name}</span></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── CONTRACT TAB ────────────────────────────────────────────────────────────
function ContractTab({ reqs, onToast }) {
  const exiting = reqs.filter(r => r.org === ME && r.status === "approved");
  return (
    <section className="pj-sec" aria-label="Contract">
      <div className="pj-banner info"><Icon name="info" size={15}/><span>Terms you validated with the orchestrator. Data and services are exchanged on these terms through the data space.</span></div>
      {exiting.length > 0 && <div className="pj-banner warn"><Icon name="danger" size={15}/><span><strong>{exiting.length} of your offers leave this contract soon</strong> ({exiting.map(r => r.offer).join(", ")}). An addendum will be recorded on the contract history.</span></div>}
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
  const mine = reqs.filter(r => r.org === ME);
  const pendingN = mine.filter(r => isCurrent(r.status)).length;
  const approvedN = mine.filter(r => r.status === "approved").length;
  return (
    <section className="pj-sec" aria-label="Service chains">
      <div className="pj-sec-head"><div><h2>Service chains</h2><p>Chains highlighted in red include an offer with an exit request.</p></div></div>
      {pendingN > 0 && <div className="pj-banner warn"><Icon name="danger" size={15}/><span><strong>Exit pending.</strong> Chains using your requested offers will be invalidated if approved.</span></div>}
      {approvedN > 0 && <div className="pj-banner danger"><Icon name="layers" size={15}/><span><strong>Chains invalidated.</strong> Chains using your exiting offers are deactivated on their effective date.</span></div>}
      {ECO.chains.map(c => <ChainCard key={c.id} chain={c} reqs={reqs}/>)}
    </section>
  );
}

// ─── EXIT WIZARD (per offer) ─────────────────────────────────────────────────
function ExitWizard({ offer, api, onClose, onToast }) {
  const [step, setStep] = useState(0);
  const [cat, setCat] = useState("");
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const hit = impactedChains(offer.name);
  const submit = () => {
    api.create({ org: ME, offer: offer.name, offerType: offer.type, reasonCategory: cat, reason: reason.trim() });
    onToast(`Exit request for ${offer.name} sent to the orchestrator`);
    onClose();
  };
  return (
    <Modal wide title={`Request to exit — ${offer.name}`}
      sub={`Withdraw this single offer from ${ECO.name}. Your other offers stay in the project. ${ORG[ECO.orchestrator].name} must validate.`}
      onClose={onClose} steps={<Steps steps={["Offer & reason", "Review impact", "Confirm"]} current={step} onGo={setStep}/>}
      foot={<>
        {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep(s => s - 1)}><Icon name="chevronLeft" size={14}/>Back</button>}
        <span className="spacer"/>
        <button type="button" className="btn btn-text" onClick={onClose}>Cancel</button>
        {step < 2
          ? <button type="button" className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Next<Icon name="chevronRight" size={14}/></button>
          : <button type="button" className="btn btn-danger" disabled={ack ? false : hit.length > 0} onClick={submit}><Icon name="upload" size={14}/>Submit exit request</button>}
      </>}>
      {step === 0 && (
        <div>
          <Field label="Offer to withdraw">
            <div className="pj-radio-card sel" style={{ cursor: "default" }}>
              <Icon name="check" size={15}/><span className={`pj-offer-type ${offer.type}`}>{offer.type}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, minWidth: 0 }}>{offer.name}</span>
              {hit.length > 0 && <span className="oa-chip" style={{ marginLeft: "auto" }}><Icon name="layers" size={11}/>used in {hit.length} chain{hit.length > 1 ? "s" : ""}</span>}
            </div>
          </Field>
          <Field label="Reason" hint="Optional — shared with the orchestrator">
            <Select value={cat} onChange={e => setCat(e.target.value)}><option value="">Select a reason (optional)</option>{EXIT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}</Select>
          </Field>
          <Field label="Details" hint="Optional"><Textarea className="pj-textarea" value={reason} onChange={e => setReason(e.target.value)} placeholder="Anything that helps the orchestrator process your request…"/></Field>
        </div>
      )}
      {step === 1 && (
        <div>
          {hit.length > 0
            ? <div className="pj-banner danger"><Icon name="layers" size={15}/><span><strong>{hit.length} service chain{hit.length > 1 ? "s" : ""} depend on this offer.</strong> If approved, they will be invalidated and deactivated on the effective date — exchanges stop for all their participants.</span></div>
            : <div className="pj-banner success"><Icon name="check" size={15}/><span>No service chain uses this offer — nothing will be invalidated.</span></div>}
          <ImpactList offer={offer.name} status="pending" showUnaffected/>
          <div className="pj-banner info" style={{ marginTop: 12, marginBottom: 0 }}><Icon name="clock" size={15}/><span>A notice period (typically 30 days) may apply — the orchestrator sets the effective date on approval. Until then, the offer keeps operating under current terms.</span></div>
        </div>
      )}
      {step === 2 && (
        <div>
          <div className="exit-kv" style={{ marginTop: 0 }}>
            <div className="kv" style={{ borderTop: "none" }}><span className="k">Project</span><span className="v mono">{ECO.name}</span></div>
            <div className="kv"><span className="k">Offer withdrawn</span><span className="v mono">{offer.name}</span></div>
            <div className="kv"><span className="k">Impacted chains</span><span className="v">{hit.length} invalidated & deactivated on approval</span></div>
            <div className="kv"><span className="k">Reason</span><span className="v">{cat || "Not specified"}</span></div>
            <div className="kv"><span className="k">Validation</span><span className="v">By {ORG[ECO.orchestrator].name} (orchestrator)</span></div>
          </div>
          <label className={`pj-ack ${ack ? "checked" : ""}`}>
            <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/>
            <span>I understand this offer will be withdrawn from the contract, that dependent service chains will be invalidated and deactivated, and that this request requires the orchestrator's validation.</span>
          </label>
          <div className="wn">
            <div className="wn-t">What happens next</div>
            <div className="w"><Icon name="bell" size={13}/><span><b>{ORG[ECO.orchestrator].name}</b> is notified immediately (in-app + email).</span></div>
            <div className="w"><Icon name="eye" size={13}/><span>They review the impact, then <b>approve with an effective date</b>, request more info, or reject.</span></div>
            <div className="w"><Icon name="layers" size={13}/><span>On the effective date, the offer leaves the contract and its {hit.length} chain{hit.length !== 1 ? "s are" : " is"} <b>invalidated &amp; deactivated</b>.</span></div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── per-offer membership row ────────────────────────────────────────────────
function OfferRow({ offer, reqs, onRequest, api, onToast }) {
  const live = liveReqFor(reqs, offer.name);
  const n = chainsUsing(offer.name);
  return (
    <div className="offrow">
      <div className="offrow-main">
        <span className={`pj-offer-type ${offer.type}`}>{offer.type}</span>
        <span className="offrow-name" title={offer.name}>{offer.name}</span>
        {n > 0 && <span className="oa-chip"><Icon name="layers" size={11}/>{n} chain{n > 1 ? "s" : ""}</span>}
      </div>
      <div className="offrow-act">
        {!live && <><StatusPill tone="success" icon="check">Active</StatusPill><button type="button" className="btn btn-danger sm" onClick={() => onRequest(offer)}><Icon name="external" size={13}/>Request exit</button></>}
        {live && live.status === "awaiting_participant" && <StatusPill tone="warn" icon="danger">Exit proposed — action required</StatusPill>}
        {live && isCurrent(live.status) && live.status !== "awaiting_participant" && <><ExitPill status={live.status}/>
          <button type="button" className="pj-mini-btn" onClick={() => { api.update(live.id, { status: "withdrawn", decidedAt: D.TODAY }, { actor: "participant", event: "withdrawn", note: "Withdrawn by the participant." }); onToast("Exit request withdrawn"); }}>Withdraw</button></>}
        {live && live.status === "approved" && <StatusPill tone="warn" icon="clock">Exiting {fmtDate(live.effectiveDate)}</StatusPill>}
      </div>
    </div>
  );
}

// ─── MEMBERSHIP TAB ──────────────────────────────────────────────────────────
function MembershipTab({ reqs, api, onToast, onRequest }) {
  const [filter, setFilter] = useState("current");
  const [reply, setReply] = useState({});
  const mine = reqs.filter(r => r.org === ME);
  const current = mine.filter(r => isCurrent(r.status)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const finished = mine.filter(r => isFinished(r.status)).sort((a, b) => (b.decidedAt || b.submittedAt).localeCompare(a.decidedAt || a.submittedAt));

  return (
    <section className="pj-sec" aria-label="Membership">
      <div className="pj-sec-head"><div><h2>Your membership</h2><p>Your roles and offers in this ecosystem. Request an exit per offer — the rest stay in the project.</p></div></div>

      <div className="pj-me-card">
        <div className="pj-part-head" style={{ marginBottom: 10 }}>
          <OrgAv orgId={ME} size={40} className="pj-part-av"/>
          <div><div className="pj-part-name">{ORG[ME].name} <span className="pill pill-primary" style={{ marginLeft: 6 }}>My participant</span></div><div className="pj-part-org">{ORG[ME].org} · joined {fmtDate(mePart.joined)}</div></div>
        </div>
        <div className="pj-roles" style={{ marginBottom: 12 }}>{mePart.roles.map(r => <span key={r} className="pj-role you"><Icon name="check" size={12}/>{r}</span>)}</div>
        <div className="offrow-list">
          {mePart.offers.map(o => <OfferRow key={o.id} offer={o} reqs={reqs} onRequest={onRequest} api={api} onToast={onToast}/>)}
        </div>
      </div>

      <div className="pj-sec-head" style={{ marginTop: 26 }}>
        <div><h2>Your exit requests</h2><p>Only your own requests are visible here.</p></div>
        <span className="right"><ReqFilter value={filter} onChange={setFilter} counts={{ current: current.length, finished: finished.length }}/></span>
      </div>

      {filter === "current" && (current.length === 0
        ? <div className="pj-empty">No current exit requests. Use “Request exit” on an offer above to start one.</div>
        : <div className="exit-stack">{current.map(req => (
            <div key={req.id} className="exit-card" data-comment-anchor="part-exit-status">
              <div className="exit-req-head">
                <div className="meta"><div className="who"><span className="mono" style={{ fontSize: 13 }}>{req.offer}</span></div><div className="when">{req.id} · submitted {fmtDate(req.submittedAt)}</div></div>
                <span className="right"><ExitPill status={req.status}/></span>
              </div>
              <div className="exit-kv">
                <div className="kv"><span className="k">Offer</span><span className="v"><OfferTag offer={req.offer} type={req.offerType}/></span></div>
                <div className="kv"><span className="k">Reason</span><span className="v">{req.reasonCategory || "Not specified"}</span></div>
                <div className="kv"><span className="k">Impacted chains</span><span className="v">{impactedChains(req.offer).length}</span></div>
              </div>

              {req.status === "awaiting_participant" && (
                <>
                  <div className="pj-banner warn" style={{ marginTop: 10 }}><Icon name="danger" size={15}/><span><strong>{ORG[ECO.orchestrator].name} proposed to remove this offer</strong> from the project{req.reason ? <>: “{req.reason}”</> : "."} It only leaves once you validate — proposed effective {fmtDate(req.effectiveDate)}.</span></div>
                  <div className="exit-actions">
                    <button type="button" className="btn btn-danger" onClick={() => { api.update(req.id, { status: "approved", decidedAt: D.TODAY }, { actor: "participant", event: "accepted", note: `Exit validated by the participant — effective ${fmtDate(req.effectiveDate)}.` }); onToast("Exit validated — the offer will leave the project"); }}><Icon name="check" size={14}/>Validate exit</button>
                    <button type="button" className="btn btn-ghost" onClick={() => { api.update(req.id, { status: "rejected", decidedAt: D.TODAY, effectiveDate: "" }, { actor: "participant", event: "declined", note: "Exit proposal declined by the participant." }); onToast("Exit proposal declined — offer stays in the project"); }}><Icon name="x" size={14}/>Decline</button>
                  </div>
                </>
              )}
              {req.status === "pending" && (
                <>
                  <div className="pj-banner warn" style={{ marginTop: 10 }}><Icon name="hourglass" size={15}/><span><strong>Waiting for the orchestrator.</strong> {ORG[ECO.orchestrator].name} is reviewing your request.</span></div>
                  <div className="exit-actions"><button type="button" className="btn btn-ghost" onClick={() => { api.update(req.id, { status: "withdrawn", decidedAt: D.TODAY }, { actor: "participant", event: "withdrawn", note: "Withdrawn by the participant." }); onToast("Exit request withdrawn"); }}><Icon name="x" size={14}/>Withdraw request</button></div>
                </>
              )}
              {req.status === "info_requested" && (
                <>
                  <div className="pj-banner info" style={{ marginTop: 10 }}><Icon name="chat" size={15}/><span><strong>{ORG[ECO.orchestrator].name} needs more information:</strong> “{req.orchMessage}”</span></div>
                  {req.reply
                    ? <div className="exit-quote">Your reply: “{req.reply}”</div>
                    : <div style={{ marginTop: 10 }}>
                        <Field label="Your reply" required><Textarea className="pj-textarea" value={reply[req.id] || ""} onChange={e => setReply(s => ({ ...s, [req.id]: e.target.value }))} placeholder="Answer the orchestrator's question…"/></Field>
                        <div className="exit-actions" style={{ marginTop: 8 }}>
                          <button type="button" className="btn btn-primary" disabled={!(reply[req.id] || "").trim()} onClick={() => { api.update(req.id, { reply: reply[req.id].trim() }, { actor: "participant", event: "replied", note: reply[req.id].trim() }); onToast("Reply sent to the orchestrator"); }}><Icon name="upload" size={14}/>Send reply</button>
                          <button type="button" className="btn btn-ghost" onClick={() => { api.update(req.id, { status: "withdrawn", decidedAt: D.TODAY }, { actor: "participant", event: "withdrawn" }); onToast("Exit request withdrawn"); }}>Withdraw</button>
                        </div>
                      </div>}
                </>
              )}
              <div className="exit-sub-timeline"><div className="rt-dk">Process history</div><ExitTimeline req={req} side="participant"/></div>
            </div>
          ))}</div>)}

      {filter === "finished" && <RequestTable rows={finished} showOrg={false}/>}

      <FlowDoc defaultOpen={mine.length === 0}/>
    </section>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
function PartProjectApp() {
  const [reqs, api] = useExitRequests();
  const [tab, setTab] = useState("membership");
  const [wizardOffer, setWizardOffer] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toastNode, toast] = useToast();
  const infoN = reqs.filter(r => r.org === ME && r.status === "info_requested" && !r.reply).length;
  const liveStatus = (reqs.find(r => r.org === ME && r.offer === "billing_offer_test") || {}).status || "none";

  const TABS = [
    { id: "membership", label: "My membership", icon: "user", badge: infoN },
    { id: "participants", label: "Participants", icon: "team" },
    { id: "contract", label: "Contract", icon: "contracts" },
    { id: "chains", label: "Service chains", icon: "layers" },
  ];

  const openWizardForLive = () => { setTab("membership"); setWizardOffer(mePart.offers.find(o => o.name === "billing_offer_test") || mePart.offers[0]); };

  return (
    <div className="app ui-v2" data-screen-label="Project — participant view">
      <a href="#pj-main" className="skip-link">Skip to content</a>
      <AppSidebar variant="v2" activeId="myprojects"/>
      <div className="main">
        <header className="topbar cat-topbar">
          <div className="topbar-left"><div className="page-title"><Icon name="projects" size={20}/><h1>Project</h1></div></div>
          <div className="topbar-right">
            <PersonaChip orgId={ME} role="Participant"/>
            <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16}/><span>Help</span></button>
            <NotifBell side="participant" reqs={reqs}/>
            <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18}/></button>
          </div>
        </header>

        <main className="pj-content" id="pj-main" tabIndex={-1}>
          <div className="pj-crumb"><a href="My Projects.html">My projects</a><Icon name="chevronRight" size={12}/><span className="cur">{ECO.name}</span></div>
          <ProjectHero actions={<a className="btn btn-ghost" href="Project Orchestrator.html" title="Jump to the orchestrator side of this demo"><Icon name="share" size={14}/>Orchestrator view</a>}/>
          <TabBar tabs={TABS} active={tab} onSelect={setTab}/>
          {tab === "membership" && <MembershipTab reqs={reqs} api={api} onToast={toast} onRequest={setWizardOffer}/>}
          {tab === "participants" && <ParticipantsTab/>}
          {tab === "contract" && <ContractTab reqs={reqs} onToast={toast}/>}
          {tab === "chains" && <ChainsTab reqs={reqs}/>}
        </main>
      </div>

      <BottomNav onOpenMore={() => setMoreOpen(true)}/>
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)}/>
      <DemoGuide side="participant" reqs={reqs} reset={api.reset} openWizard={openWizardForLive} goTab={setTab}/>
      {wizardOffer && <ExitWizard offer={wizardOffer} api={api} onClose={() => setWizardOffer(null)} onToast={toast}/>}
      {toastNode}

      <window.TweaksPanel>
        <window.TweakSection label="Demo — exit flow"/>
        <window.TweakSelect label="billing_offer_test state" value={liveStatus}
          options={["none", "pending", "awaiting_participant", "info_requested", "approved", "rejected"]}
          onChange={v => { api.setLive(v); setTab("membership"); }}/>
        <window.TweakButton label="Reset all exit requests" onClick={api.reset}/>
      </window.TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PartProjectApp/>);
})();
