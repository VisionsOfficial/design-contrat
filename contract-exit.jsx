// VisionsTrust — exit-procedure panels, shared by the full-page contract view.
// Same flow and vocabulary as Project Participant / Project Orchestrator: one exit
// request PER OFFER, orchestrator validation, chain-impact review.
// Exports window.CDExit = { ExitWizard, ParticipantExitPanel, OrchestratorExitPanel }.
(function () {
const { useState } = React;
const { Icon, Field, Input, Textarea, Select } = window.UI;
const D = window.ProjectsData;
const { ORG, ECO, EXIT_REASONS, impactedChains, chainsUsing, fmtDate, isCurrent, isFinished } = D;
const { OrgAv, StatusPill, ExitPill, OfferTag, Modal, Steps, ImpactList, ExitTimeline, ReqFilter, RequestTable } = window.PJ;

const liveReqFor = (reqs, me, offerName) => reqs.find(r => r.org === me && r.offer === offerName && (isCurrent(r.status) || r.status === "approved"));

// ─── PARTICIPANT: request an exit for one offer ───────────────────────────────
function ExitWizard({ offer, me, ctx, api, onClose, onToast }) {
  const [step, setStep] = useState(0);
  const [cat, setCat] = useState("");
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const hit = impactedChains(offer.name);
  const submit = () => {
    api.create({ org: me, offer: offer.name, offerType: offer.type, reasonCategory: cat, reason: reason.trim() });
    onToast(`Exit request for ${offer.name} sent to the orchestrator`);
    onClose();
  };
  return (
    <Modal wide title={`Request to exit — ${offer.name}`}
      sub={`Withdraw this single offer from the contract. Your other offers stay in place. ${ctx.orchName} must validate.`}
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
            ? <div className="pj-banner danger"><Icon name="layers" size={15}/><span><strong>{hit.length} service chain{hit.length > 1 ? "s" : ""} depend{hit.length > 1 ? "" : "s"} on this offer.</strong> If approved, they are invalidated and deactivated on the effective date — exchanges stop for all their participants.</span></div>
            : <div className="pj-banner success"><Icon name="check" size={15}/><span>No service chain uses this offer — nothing will be invalidated.</span></div>}
          <ImpactList offer={offer.name} status="pending" showUnaffected/>
          <div className="pj-banner info" style={{ marginTop: 12, marginBottom: 0 }}><Icon name="clock" size={15}/><span>A notice period (typically 30 days) may apply — the orchestrator sets the effective date on approval. Until then the offer keeps operating under the current contract terms.</span></div>
        </div>
      )}
      {step === 2 && (
        <div>
          <div className="exit-kv" style={{ marginTop: 0 }}>
            <div className="kv" style={{ borderTop: "none" }}><span className="k">Contract</span><span className="v mono">{ctx.contractId}</span></div>
            <div className="kv"><span className="k">Project</span><span className="v mono">{ECO.name}</span></div>
            <div className="kv"><span className="k">Offer withdrawn</span><span className="v mono">{offer.name}</span></div>
            <div className="kv"><span className="k">Impacted chains</span><span className="v">{hit.length} invalidated &amp; deactivated on approval</span></div>
            <div className="kv"><span className="k">Reason</span><span className="v">{cat || "Not specified"}</span></div>
            <div className="kv"><span className="k">Validation</span><span className="v">By {ctx.orchName} (orchestrator)</span></div>
          </div>
          <label className={`pj-ack ${ack ? "checked" : ""}`}>
            <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/>
            <span>I understand this offer will be withdrawn from the contract, that dependent service chains will be invalidated and deactivated, and that this request requires the orchestrator's validation. An addendum is recorded on the contract history.</span>
          </label>
        </div>
      )}
    </Modal>
  );
}

// ─── PARTICIPANT PANEL ───────────────────────────────────────────────────────
function OfferExitRow({ offer, me, reqs, api, onRequest, onToast }) {
  const live = liveReqFor(reqs, me, offer.name);
  const n = chainsUsing(offer.name);
  return (
    <div className="offrow">
      <div className="offrow-main">
        <span className={`pj-offer-type ${offer.type}`}>{offer.type}</span>
        <span className="offrow-name" title={offer.name}>{offer.name}</span>
        {n > 0 && <span className="oa-chip"><Icon name="layers" size={11}/>{n} chain{n > 1 ? "s" : ""}</span>}
      </div>
      <div className="offrow-act">
        {!live && <><StatusPill tone="success" icon="check">In contract</StatusPill><button type="button" className="btn btn-danger sm" onClick={() => onRequest(offer)}><Icon name="external" size={13}/>Request exit</button></>}
        {live && live.status === "awaiting_participant" && <StatusPill tone="warn" icon="danger">Exit proposed — action required</StatusPill>}
        {live && isCurrent(live.status) && live.status !== "awaiting_participant" && <><ExitPill status={live.status}/>
          <button type="button" className="pj-mini-btn" onClick={() => { api.update(live.id, { status: "withdrawn", decidedAt: D.TODAY }, { actor: "participant", event: "withdrawn", note: "Withdrawn by the participant." }); onToast("Exit request withdrawn"); }}>Withdraw</button></>}
        {live && live.status === "approved" && <StatusPill tone="warn" icon="clock">Leaves contract {fmtDate(live.effectiveDate)}</StatusPill>}
      </div>
    </div>
  );
}

function ParticipantExitPanel({ me, ctx, reqs, api, onToast, onRequest }) {
  const [filter, setFilter] = useState("current");
  const [reply, setReply] = useState({});
  const mePart = ECO.participants.find(p => p.org === me) || { offers: [], roles: [] };
  const mine = reqs.filter(r => r.org === me);
  const current = mine.filter(r => isCurrent(r.status)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const finished = mine.filter(r => isFinished(r.status)).sort((a, b) => (b.decidedAt || b.submittedAt).localeCompare(a.decidedAt || a.submittedAt));

  return (
    <section className="pj-sec" aria-label="Exit procedure">
      <div className="pj-sec-head"><div><h2>Your offers under this contract</h2><p>Exit is requested per offer — the others stay bound by the contract. The orchestrator validates and sets the effective date.</p></div></div>
      <div className="pj-me-card">
        <div className="pj-part-head" style={{ marginBottom: 10 }}>
          <OrgAv orgId={me} size={40} className="pj-part-av"/>
          <div><div className="pj-part-name">{ctx.youName} <span className="pill pill-primary" style={{ marginLeft: 6 }}>You</span></div><div className="pj-part-org">Participant · signatory of {ctx.contractId.slice(0, 10)}…</div></div>
        </div>
        <div className="offrow-list">
          {mePart.offers.map(o => <OfferExitRow key={o.id} offer={o} me={me} reqs={reqs} api={api} onRequest={onRequest} onToast={onToast}/>)}
        </div>
      </div>

      <div className="pj-sec-head" style={{ marginTop: 26 }}>
        <div><h2>Your exit requests</h2><p>Each approved request produces an addendum to this contract.</p></div>
        <span className="right"><ReqFilter value={filter} onChange={setFilter} counts={{ current: current.length, finished: finished.length }}/></span>
      </div>

      {filter === "current" && (current.length === 0
        ? <div className="pj-empty">No current exit request. Use “Request exit” on an offer above to start the procedure.</div>
        : <div className="exit-stack">{current.map(req => (
            <div key={req.id} className="exit-card">
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
                  <div className="pj-banner warn" style={{ marginTop: 10 }}><Icon name="danger" size={15}/><span><strong>{ctx.orchName} proposed to remove this offer</strong> from the contract{req.reason ? <>: “{req.reason}”</> : "."} It only leaves once you validate — proposed effective {fmtDate(req.effectiveDate)}.</span></div>
                  <div className="exit-actions">
                    <button type="button" className="btn btn-danger" onClick={() => { api.update(req.id, { status: "approved", decidedAt: D.TODAY }, { actor: "participant", event: "accepted", note: `Exit validated by the participant — effective ${fmtDate(req.effectiveDate)}.` }); onToast("Exit validated — the offer will leave the contract"); }}><Icon name="check" size={14}/>Validate exit</button>
                    <button type="button" className="btn btn-ghost" onClick={() => { api.update(req.id, { status: "rejected", decidedAt: D.TODAY, effectiveDate: "" }, { actor: "participant", event: "declined", note: "Exit proposal declined by the participant." }); onToast("Exit proposal declined — offer stays in the contract"); }}><Icon name="x" size={14}/>Decline</button>
                  </div>
                </>
              )}
              {req.status === "pending" && (
                <>
                  <div className="pj-banner warn" style={{ marginTop: 10 }}><Icon name="hourglass" size={15}/><span><strong>Waiting for the orchestrator.</strong> {ctx.orchName} is reviewing your request.</span></div>
                  <div className="exit-actions"><button type="button" className="btn btn-ghost" onClick={() => { api.update(req.id, { status: "withdrawn", decidedAt: D.TODAY }, { actor: "participant", event: "withdrawn", note: "Withdrawn by the participant." }); onToast("Exit request withdrawn"); }}><Icon name="x" size={14}/>Withdraw request</button></div>
                </>
              )}
              {req.status === "info_requested" && (
                <>
                  <div className="pj-banner info" style={{ marginTop: 10 }}><Icon name="chat" size={15}/><span><strong>{ctx.orchName} needs more information:</strong> “{req.orchMessage}”</span></div>
                  {req.reply
                    ? <div className="exit-quote">Your reply: “{req.reply}”</div>
                    : <div style={{ marginTop: 10 }}>
                        <Field label="Your reply" required><Textarea className="pj-textarea" value={reply[req.id] || ""} onChange={e => setReply(s => ({ ...s, [req.id]: e.target.value }))} placeholder="Answer the orchestrator's question…"/></Field>
                        <div className="exit-actions" style={{ marginTop: 8 }}>
                          <button type="button" className="btn btn-primary" disabled={!(reply[req.id] || "").trim()} onClick={() => { api.update(req.id, { reply: reply[req.id].trim() }, { actor: "participant", event: "replied", note: reply[req.id].trim() }); onToast("Reply sent to the orchestrator"); }}><Icon name="upload" size={14}/>Send reply</button>
                        </div>
                      </div>}
                </>
              )}
              <div className="exit-sub-timeline"><div className="rt-dk">Process history</div><ExitTimeline req={req} side="participant"/></div>
            </div>
          ))}</div>)}
      {filter === "finished" && <RequestTable rows={finished} showOrg={false}/>}
    </section>
  );
}

// ─── ORCHESTRATOR PANEL ──────────────────────────────────────────────────────
function ApproveModal({ req, api, onClose, onToast }) {
  const [days, setDays] = useState(req.noticeDays || 30);
  const [date, setDate] = useState(req.effectiveDate || D.addDays(D.TODAY, 30));
  const [ack, setAck] = useState(false);
  const hit = impactedChains(req.offer);
  const setNotice = (n) => { setDays(n); setDate(D.addDays(D.TODAY, n)); };
  return (
    <Modal title={`Approve exit — ${req.offer}`} sub={`${ORG[req.org].name} withdraws this offer from the contract. An addendum is recorded.`} onClose={onClose}
      foot={<><span className="spacer"/><button type="button" className="btn btn-text" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={hit.length > 0 && !ack} onClick={() => { api.update(req.id, { status: "approved", noticeDays: days, effectiveDate: date, decidedAt: D.TODAY }, { actor: "orchestrator", event: "approved", note: `Approved with ${days}-day notice — effective ${fmtDate(date)}.` }); onToast("Exit approved — participant and affected parties notified"); onClose(); }}><Icon name="check" size={14}/>Approve exit</button></>}>
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
          <div className="pj-banner danger" style={{ marginTop: 4 }}><Icon name="layers" size={15}/><span><strong>{hit.length} service chain{hit.length > 1 ? "s" : ""} will be invalidated and deactivated</strong> on the effective date.</span></div>
          <ImpactList offer={req.offer} status="pending"/>
          <label className={`pj-ack ${ack ? "checked" : ""}`}>
            <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/>
            <span>I understand {hit.map(c => c.name).join(", ")} will be invalidated and deactivated, and all participants of these chains will be notified.</span>
          </label>
        </>
      ) : <div className="pj-banner success" style={{ marginTop: 4 }}><Icon name="check" size={15}/><span>No service chain uses this offer — nothing else is affected.</span></div>}
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

function OrchRequestCard({ req, api, onToast }) {
  const [modal, setModal] = useState(null);
  const hit = impactedChains(req.offer);
  return (
    <div className="exit-card">
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
      <ImpactList offer={req.offer} status={req.status} showUnaffected/>
      {req.status === "info_requested" && (
        <div className="pj-banner info" style={{ marginTop: 12 }}><Icon name="chat" size={15}/>
          <span><strong>You asked for more information:</strong> “{req.orchMessage}”{req.reply ? <><br/><strong>{ORG[req.org].name} replied:</strong> “{req.reply}”</> : <><br/>Waiting for the participant's reply.</>}</span></div>
      )}
      {req.initiatedBy === "orchestrator"
        ? <>
            <div className="pj-banner info" style={{ marginTop: 12 }}><Icon name="hourglass" size={15}/><span><strong>You proposed this exit</strong> — waiting for {ORG[req.org].name} to validate. Proposed effective {fmtDate(req.effectiveDate)}.</span></div>
            <div className="exit-actions"><button type="button" className="btn btn-ghost" onClick={() => setModal("cancel")}><Icon name="x" size={14}/>Cancel proposal</button></div>
          </>
        : <div className="exit-actions">
            <button type="button" className="btn btn-primary" onClick={() => setModal("approve")}><Icon name="check" size={14}/>Approve…</button>
            <button type="button" className="btn btn-ghost" onClick={() => setModal("info")}><Icon name="chat" size={14}/>Request info…</button>
            <button type="button" className="btn btn-danger" onClick={() => setModal("reject")}><Icon name="x" size={14}/>Reject…</button>
          </div>}
      <div className="exit-sub-timeline"><div className="rt-dk">Process history</div><ExitTimeline req={req} side="orchestrator"/></div>
      {modal === "approve" && <ApproveModal req={req} api={api} onClose={() => setModal(null)} onToast={onToast}/>}
      {modal === "info" && <MessageModal title="Request more information" sub="The participant is notified and can reply before you decide." cta="Send request" onClose={() => setModal(null)}
        onSend={(m) => { api.update(req.id, { status: "info_requested", orchMessage: m, decidedAt: "" }, { actor: "orchestrator", event: "info_requested", note: m }); onToast("Information request sent"); setModal(null); }}/>}
      {modal === "reject" && <MessageModal title="Reject exit request" sub="The offer stays in the contract. Give a reason — shared with the participant." cta="Reject request" danger onClose={() => setModal(null)}
        onSend={(m) => { api.update(req.id, { status: "rejected", orchMessage: m, decidedAt: D.TODAY }, { actor: "orchestrator", event: "rejected", note: m }); onToast("Exit request rejected"); setModal(null); }}/>}
      {modal === "cancel" && <MessageModal title="Cancel exit proposal" sub="The proposed exit is dropped and the offer stays in the contract." cta="Cancel proposal" danger onClose={() => setModal(null)}
        onSend={(m) => { api.update(req.id, { status: "withdrawn", decidedAt: D.TODAY, effectiveDate: "", orchMessage: m }, { actor: "orchestrator", event: "withdrawn", note: m }); onToast("Exit proposal cancelled"); setModal(null); }}/>}
    </div>
  );
}

function OrchestratorExitPanel({ reqs, api, onToast }) {
  const [filter, setFilter] = useState("current");
  const current = reqs.filter(r => isCurrent(r.status)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const finished = reqs.filter(r => isFinished(r.status)).sort((a, b) => (b.decidedAt || b.submittedAt).localeCompare(a.decidedAt || a.submittedAt));
  return (
    <section className="pj-sec" aria-label="Exit procedure">
      <div className="pj-sec-head">
        <div><h2>Exit requests on this contract</h2><p>You orchestrate this contract: validate each per-offer exit and set its effective date. Every approval is recorded as an addendum.</p></div>
        <span className="right"><ReqFilter value={filter} onChange={setFilter} counts={{ current: current.length, finished: finished.length }}/></span>
      </div>
      {filter === "current" && (current.length === 0
        ? <div className="pj-empty">No exit request awaiting your decision.</div>
        : <div className="exit-stack">{current.map(r => <OrchRequestCard key={r.id} req={r} api={api} onToast={onToast}/>)}</div>)}
      {filter === "finished" && <RequestTable rows={finished} showOrg/>}
    </section>
  );
}

window.CDExit = { ExitWizard, ParticipantExitPanel, OrchestratorExitPanel };
})();
