// VisionsTrust — Basket · PII flow · Step 4: recap & finalise (23/07).
(function () {
  const { Icon } = window.UI;
  const { DATA_OFFER, PII_CONTROLLER, PROJECT, NEW_PROJECT, SERVICES, isEligible } = window.BasketPIIData;
  const { STEP4, PageShell, Panel, Row, LockBadge, Mono, readFlow, writeFlow } = window.BKPII;
  const { useTweaks, TweaksPanel, TweakSection, TweakRadio } = window;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "resolution": "Reuse the active contract"
  } /*EDITMODE-END*/;

  // One recap card per offer — same anatomy as the basket's confirm step (pricing,
  // usage policies, decision), with the offer's personal-data block underneath.
  const VERDICT = { accepted: { cls: "accepted", ic: "check" }, countered: { cls: "countered", ic: "edit" } };

  // Collapsible read-only block — collapsed by default (declarations are long).
  function CollapseBlock({ icon = "lock", title, sub, count, children }) {
    const [open, setOpen] = React.useState(false);
    return (
      <div className={`pii-cardblock ${open ? "open" : ""}`}>
        <button type="button" className="pii-cardblock-head" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name={icon} size={13} /> {title}
          {count != null && <span className="pii-cardblock-count">{count} field{count !== 1 ? "s" : ""}</span>}
          <span className="pii-cardblock-sub">{sub}</span>
          <span className="pii-cardblock-chev"><Icon name={open ? "chevronUp" : "chevronDown"} size={15} /></span>
        </button>
        {open && children}
      </div>);

  }

  function RecapCard({ offer, role, roleLabel, blockTitle, blockSub, rows, extra, tag, children }) {
    const dec = offer.decision ? VERDICT[offer.decision.mode] : null;
    return (
      <div className={`bk-review-offer ${tag ? "pii-nested" : ""}`}>
      <div className="bk-offer-top">
        <Mono offer={offer} size={38} />
        <div className="bk-offer-main">
          <div className="bk-offer-meta">
            <span className={`pii-role-tag ${role}`}><Icon name={role === "ctrl" ? "database" : "layers"} size={11} /> {roleLabel}</span>
            <span className="bk-offer-by">by {offer.provider}</span>
          </div>
          <h3 className="bk-offer-name sm">{offer.name}</h3>
        </div>
        {tag || <LockBadge label="Personal-data terms locked" />}
      </div>
      <div className="pii-conf-grid">
        <div>
          <div className="bk-conf-k">Pricing</div>
          <div className="bk-conf-v">{offer.pricing}</div>
          <div className="pii-conf-sub">{offer.billing}{offer.setup ? ` · ${offer.setup}` : ""}</div>
        </div>
        <div>
          <div className="bk-conf-k">Usage policies</div>
          {offer.policies && offer.policies.length ?
            <div className="pii-pols">{offer.policies.map((p) => <span className="pii-pol" key={p}>{p}</span>)}</div> :
            <div className="bk-conf-v muted">No policy published</div>}
        </div>
        <div>
          <div className="bk-conf-k">Decision</div>
          {dec ?
            <div className={`bk2-conf-verdict ${dec.cls}`}><Icon name={dec.ic} size={13} /> {offer.decision.label}</div> :
            <div className="bk-conf-v muted">Settled at step 1.</div>}
          {extra}
        </div>
      </div>
      {children}
      <CollapseBlock title={blockTitle} sub={blockSub} count={rows.length}>
        <div className="pii-grid">
          {rows.map((row) => <Row key={row.k} k={row.k} v={row.v} wide={row.wide} />)}
        </div>
      </CollapseBlock>
    </div>);

  }

  function NegotiationPreview({ service }) {
    return (
      <div className="pii-preview">
      <div className="pii-preview-head"><Icon name="scale" size={13} /> How this appears in the negotiation view</div>
      <div className="pii-preview-body">
        <div className="pii-negnote">
          <Icon name="info" size={14} />
          <span>Both participants are told their offer is used to consume personal data: <b>{DATA_OFFER.provider}</b> as controller, <b>{service.provider}</b> as {service.role.toLowerCase()}.</span>
        </div>
        <div className="pii-negrow"><span className="pii-negrow-k">Availability</span><span className="pii-negrow-v">99.9%</span><span className="bk-st st-edit"><Icon name="edit" size={10} /> Negotiable</span></div>
        <div className="pii-negrow"><span className="pii-negrow-k">Contract duration</span><span className="pii-negrow-v">12 months</span><span className="bk-st st-edit"><Icon name="edit" size={10} /> Negotiable</span></div>
        <div className="pii-negrow locked"><span className="pii-negrow-k">Legal basis</span><span className="pii-negrow-v">Consent (Art. 6-1-a)</span><span className="pii-lockbadge"><Icon name="lock" size={11} /> Locked</span></div>
        <div className="pii-negrow locked"><span className="pii-negrow-k">Processing purpose</span><span className="pii-negrow-v">{service.purpose}</span><span className="pii-lockbadge"><Icon name="lock" size={11} /> Locked</span></div>
        <div className="pii-negrow locked"><span className="pii-negrow-k">Retention</span><span className="pii-negrow-v">Contract duration</span><span className="pii-lockbadge"><Icon name="lock" size={11} /> Locked</span></div>
      </div>
    </div>);

  }

  function RecapApp() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const saved = readFlow();
    const ids = saved.serviceIds || (saved.serviceId ? [saved.serviceId] : []);
    const services = ids.map((id) => SERVICES.find((s) => s.id === id)).filter((s) => s && isEligible(s));
    const service = services[0] || null;
    const multi = services.length > 1;
    const project = saved.project === NEW_PROJECT.name ? NEW_PROJECT : PROJECT;
    const [result, setResult] = React.useState(null);

    if (!service) {
      return (
        <PageShell step={4}>
        <div className="pii-empty">
          <div className="pii-empty-ic"><Icon name="layers" size={22} /></div>
          <h3>No service offer selected yet</h3>
          <p>Go back to the previous step and pick at least one service offer to process this dataset.</p>
          <div className="pii-empty-actions">
            <a className="bk-confirm" href={STEP4}><Icon name="chevronLeft" size={15} /> Assign a consuming service</a>
          </div>
        </div>
      </PageShell>);

    }

    const liveSvc = saved.serviceState === "Already active in project" ? services.find((s) => s.id === "svc_matching") : null;
    const live = !!liveSvc && !multi;
    const reuse = t.resolution === "Reuse the active contract";
    const willNegotiate = !live || !reuse;
    // The recap groups services by where they are used; counts and CTA follow the
    // same split so they never contradict it.
    const inProject = services.filter((s) => s.source === "project");
    const inBasket = services.filter((s) => s.source !== "project");
    const negCount = live && reuse ? 0 : inBasket.length;
    const amendRefs = inProject.map((s) => s.contractRef).filter(Boolean);
    const ctaLabel = negCount === 0
      ? `Attach to contract ${amendRefs[0] || (service.contractRef || "")}`
      : `Create ${negCount} data ⇄ service negotiation${negCount !== 1 ? "s" : ""}${amendRefs.length ? ` · amend ${amendRefs.join(", ")}` : ""}`;

    const finalise = () => {writeFlow({ finalised: true, resolution: negCount > 0 ? "New negotiation" : t.resolution });setResult(negCount > 0);};

    const processorOf = (service) => [
    { k: "Role", v: service.role },
    { k: "Processing purpose", v: service.purpose },
    { k: "Operations", v: service.operations, wide: true },
    { k: "Sub-processors", v: service.subProcessors },
    { k: "International transfers", v: service.transfers },
    { k: "Security measures", v: service.toms, wide: true },
    { k: "Data-processing agreement", v: service.dpa },
    { k: "Retention by the processor", v: service.retention }];


    if (result !== null) {
      return (
        <PageShell step={4}>
        <div className="bk-sent">
          <div className="bk-sent-ic"><Icon name="check" size={30} /></div>
          <h2>{negCount === 0 ? "Dataset attached to the active contract" : negCount > 1 ? `${negCount} negotiations created` : "Negotiation created"}</h2>
          <p>
            {negCount > 0 ?
              <><b>{DATA_OFFER.name}</b> and <b>{inBasket.map((s) => s.name).join(", ")}</b> {negCount > 1 ? "are" : "is"} now negotiated {negCount > 1 ? "in parallel" : "together"} in <b>{project.name}</b>. Service terms are open; personal-data terms are locked for every party.{amendRefs.length ? <> The {inProject.length} service{inProject.length !== 1 ? "s" : ""} already live in the project {inProject.length !== 1 ? "were" : "was"} amended instead (contract{amendRefs.length !== 1 ? "s" : ""} {amendRefs.join(", ")}).</> : null}</> :
              <><b>{DATA_OFFER.name}</b> was added to contract <b>{amendRefs[0] || service.contractRef}</b> in <b>{project.name}</b>. No new negotiation was needed — {service.provider} is only notified of the new personal-data usage.</>}
          </p>
          <div className="bk-sent-actions">
            <a className="bk-confirm" href="My Contracts.html">Go to contract <Icon name="arrowRight" size={15} /></a>
            <a className="bk-btn" href="Catalogue.html">Back to catalogue</a>
          </div>
          {inBasket.map((s) => <NegotiationPreview key={s.id} service={s} />)}
        </div>
      </PageShell>);

    }

    return (
      <PageShell step={4}>
      <div className="bk-step-intro">
        <h2>Recap & finalise — what you are about to contract</h2>
        <p>{multi ? `The ${services.length} pairings are set.` : "The pairing is set."} Everything below is read-only: personal-data terms are fixed by the declarations, service terms were settled at step 1.</p>
      </div>

      <div className="bk-confirm-target">
        <div className="bk-ct-ic"><Icon name="folder" size={18} /></div>
        <div><div className="bk-ct-label">Assigning to</div><div className="bk-ct-name">{project.name}</div>{project.caption && <div className="bk-ct-cap">{project.caption}</div>}</div>
        <div className="bk-ct-count">1 data offer · {services.length} service{services.length !== 1 ? "s" : ""}{(() => { const p = services.filter((s) => s.source === "project").length, b = services.length - p; return p && b ? ` (${p} already in the project, ${b} contracted now)` : ""; })()}</div>
      </div>

      {live ?
        <>
          <div className="pii-banner live">
            <Icon name="check" size={16} />
            <span><b>{service.name} is already available in {project.name}</b> — contract {service.contractRef}, negotiated on 12 May 2026 and active. Choose how this personal-data usage should be recorded.</span>
          </div>
          <div className="bk-sec-title" style={{ marginBottom: 10 }}>
            <Icon name="scale" size={18} /> How to record it
            <span className="pii-opt-tbd"><Icon name="hourglass" size={10} /> Decision pending</span>
          </div>
          <div className="pii-choice">
            <button type="button" className={`pii-opt ${reuse ? "sel" : ""}`} onClick={() => setTweak("resolution", "Reuse the active contract")}>
              <span className="pii-radio" aria-hidden="true"><i></i></span>
              <span>
                <span className="pii-opt-t">Reuse the active contract</span>
                <span className="pii-opt-s">No new negotiation. The dataset is attached to {service.contractRef} as a personal-data amendment; {service.provider} is notified.</span>
              </span>
            </button>
            <button type="button" className={`pii-opt ${!reuse ? "sel" : ""}`} onClick={() => setTweak("resolution", "Open a new negotiation")}>
              <span className="pii-radio" aria-hidden="true"><i></i></span>
              <span>
                <span className="pii-opt-t">Open a new negotiation</span>
                <span className="pii-opt-s">A separate data ⇄ service negotiation is created, even though the service is live — service terms can be re-discussed for this usage.</span>
              </span>
            </button>
          </div>
        </> :
        null
        }

      <div className="bk-confirm-wrap">
        <RecapCard offer={DATA_OFFER} role="ctrl" roleLabel="Personal data · controller"
          blockTitle="Personal-data declaration" blockSub={`Published by ${DATA_OFFER.provider}. Carried into every contract as-is.`}
          rows={PII_CONTROLLER}>
          <div className="pii-assigned">
            <div className="pii-assigned-head">
              <Icon name="layers" size={13} /> Assigned services
              <span className="pii-assigned-count">{services.length}</span>
              <span className="pii-assigned-sub">Service offers authorised to process this dataset.</span>
            </div>
            <div className="pii-assigned-cards">
              {services.map((s) => {
                const inProj = s.source === "project";
                return (
                  <RecapCard key={s.id} offer={s} role="proc" roleLabel={`Service · ${s.role.toLowerCase()}`}
                    tag={<span className={`pii-usetag ${inProj ? "project" : "basket"}`}><Icon name={inProj ? "folder" : "cart"} size={11} /> {inProj ? "In my project" : "In my basket"}</span>}
                    blockTitle="Processing declaration" blockSub={`Declared by ${s.provider} before the offer became eligible.`}
                    rows={processorOf(s)}
                    extra={<div className={`pii-usetag ${inProj ? "project" : "basket"}`}><Icon name={inProj ? "check" : "cart"} size={11} /> {inProj ? (s.contractRef ? `Amendment to live contract ${s.contractRef}` : "Already live in the project") : "New data ⇄ service negotiation on confirm"}</div>} />);
              })}
            </div>
          </div>
        </RecapCard>
      </div>

      <div className="pii-finalnote">
        <Icon name="lock" size={13} />
        <span>Personal-data fields cannot be edited or negotiated by either party. To change them, the provider must update the offer's declaration and republish it.</span>
      </div>

      <div className="bk-nav">
        <a className="bk-btn ghost" href={STEP4}><Icon name="chevronLeft" size={15} /> Change service offers</a>
        <button type="button" className="bk-confirm" onClick={finalise}>
          {ctaLabel} <Icon name="check" size={16} />
        </button>
      </div>

      {live &&
        <TweaksPanel title="PII flow — states">
          <TweakSection label="If already active" />
          <TweakRadio label="Resolution" value={t.resolution} options={["Reuse the active contract", "Open a new negotiation"]} onChange={(v) => setTweak("resolution", v)} />
        </TweaksPanel>
        }
    </PageShell>);

  }

  ReactDOM.createRoot(document.getElementById("root")).render(<RecapApp />);
})();