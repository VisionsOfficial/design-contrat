// VisionsTrust — Basket · PII flow · Step 3: assign a consuming service (23/07).
(function () {
  const { useState } = React;
  const { Icon } = window.UI;
  const { DATA_OFFER, PII_CONTROLLER, PROJECT, NEW_PROJECT, SERVICES, isEligible } = window.BasketPIIData;
  const { BASKET, STEP5, PageShell, FlowBar, Panel, Row, LockBadge, Mono, readFlow, writeFlow } = window.BKPII;
  const { useTweaks, TweaksPanel, TweakSection, TweakRadio } = window;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "project": "Existing project",
    "basket": "Has a compatible service",
    "serviceState": "Needs negotiation"
  } /*EDITMODE-END*/;

  function ServiceCard({ svc, selected, onSelect, live }) {
    const ok = isEligible(svc);
    const srcLabel = svc.source === "project" ? "In project" : "In basket";
    return (
      <button type="button" className={`pii-svc ${selected ? "sel" : ""} ${ok ? "" : "off"}`} disabled={!ok}
      aria-pressed={ok ? selected : undefined} onClick={() => ok && onSelect(svc.id)}>
      <span className="pii-radio box" aria-hidden="true"><i><Icon name="check" size={13} /></i></span>
      <span className="pii-svc-body">
        <span className="pii-svc-top">
          <Mono offer={svc} size={26} />
          <span className="pii-svc-name">{svc.name}</span>
          <span className="pii-svc-by">by {svc.provider}</span>
          <span className="pii-svc-src"><Icon name={svc.source === "project" ? "folder" : "cart"} size={11} /> {srcLabel}</span>
          {live && <span className="pii-live"><i></i> Active in project</span>}
        </span>
        <span className="pii-svc-purpose">{svc.purpose}</span>
        {!ok && (
          <span className="pii-checks">
            <span className={`pii-check ${svc.consumesPII ? "" : "bad"}`}>
              <Icon name={svc.consumesPII ? "check" : "x"} size={11} /> {svc.consumesPII ? "Consumes personal data" : "No personal-data processing"}
            </span>
            {svc.consumesPII && !svc.piiComplete &&
              <span className="pii-check bad"><Icon name="triggers" size={11} /> PII fields missing</span>}
          </span>
        )}
        {!ok &&
          <span className="pii-reason">
            <Icon name="triggers" size={13} />
            <span><b>Not eligible — {svc.reason}.</b> {svc.reasonHint}</span>
          </span>
          }
      </span>
      <span className="pii-svc-side">
        {ok ?
          <span className="bk-st st-ok"><Icon name="check" size={10} /> Eligible</span> :
          <span className="bk-st st-gap"><Icon name="lock" size={10} /> Not eligible</span>}
      </span>
    </button>);

  }

  function AssignApp() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const saved = readFlow();
    const [sels, setSels] = useState(() => saved.serviceIds || (saved.serviceId ? [saved.serviceId] : []));
    const [tab, setTab] = useState("project");

    const newProject = t.project === "New project";
    const project = newProject ? NEW_PROJECT : PROJECT;
    const compatibleBasket = t.basket === "Has a compatible service";
    const live = t.serviceState === "Already active in project";

    const projectServices = newProject ? [] : SERVICES.filter((s) => s.source === "project");
    const basketServices = SERVICES.filter((s) => s.source === "basket" && (compatibleBasket || !isEligible(s)));
    const list = (tab === "project" ? projectServices : basketServices).filter(isEligible);
    const eligibleCount = [...projectServices, ...basketServices].filter(isEligible).length;
    const noneAnywhere = eligibleCount === 0;

    const isListed = (s) => s.source === "project" ? !newProject : compatibleBasket || !isEligible(s);
    const chosen = sels.map((id) => SERVICES.find((s) => s.id === id)).filter((s) => s && isListed(s) && isEligible(s));
    const chosenIds = chosen.map((s) => s.id);
    const liveChosen = live && chosenIds.includes("svc_matching");

    const pick = (id) => setSels((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    const onContinue = () => {writeFlow({ serviceIds: chosenIds, serviceId: chosenIds[0], project: project.name, serviceState: t.serviceState });window.location.href = STEP5;};

    return (
      <PageShell step={3}>
      <FlowBar dataOffer={DATA_OFFER} project={project} services={chosen} />

      <div className="bk-step-intro">
        <h2>Assign the consuming service offers</h2>
        <p>This basket contains personal data. Pick every service offer that will process it — one negotiation is opened per pairing.</p>
      </div>

      <div className="pii-notice">
        <span className="pii-notice-ic"><Icon name="shield" size={19} /></span>
        <div>
          <h3>Personal data can only be shared for a declared purpose</h3>
          <p><b>{DATA_OFFER.name}</b> contains personal data. Under the GDPR, the controller can only disclose it to a service acting as processor on documented instructions, for a specified purpose and lawful basis. Pick every service offer that will process the data — each one is contracted with the dataset, and the controller's personal-data terms carry into every contract as-is: <b>they cannot be negotiated or edited</b>.</p>
        </div>
      </div>

      {noneAnywhere ?
        <div className="pii-empty">
          <div className="pii-empty-ic"><Icon name="layers" size={22} /></div>
          <h3>No eligible service offer yet</h3>
          <p>
            {newProject ?
            <>Your new project <b>{project.name}</b> has no service offer yet, and nothing in your basket both consumes personal data and has a complete PII declaration.</> :
            <>Nothing in <b>{project.name}</b> or in your basket both consumes personal data and has a complete PII declaration.</>}
            {" "}Add one to continue — you'll come back to this step with it in the list.
          </p>
          <div className="pii-empty-actions">
            <a className="bk-confirm" href="Catalogue.html"><Icon name="plus" size={15} /> Add a service offer to basket</a>
            <a className="bk-btn" href="My Offers.html"><Icon name="layers" size={14} /> Use one of my own offers</a>
          </div>
        </div> :

        <>
          <div className="pii-tabrow">
          <div className="seg2 pii-tabs">
            <button type="button" className={tab === "project" ? "active teal" : ""} onClick={() => setTab("project")}>
              <Icon name="folder" size={14} /> From {project.name} <span className="pii-tab-count">{projectServices.length}</span>
            </button>
            <button type="button" className={tab === "basket" ? "active teal" : ""} onClick={() => setTab("basket")}>
              <Icon name="cart" size={14} /> From your basket <span className="pii-tab-count">{basketServices.length}</span>
            </button>
          </div>
          {chosen.length > 0 &&
          <div className="pii-selbar">
              <span className="pii-selbar-k"><Icon name="layers" size={13} /> {`${chosen.length} service${chosen.length > 1 ? "s" : ""} selected`}</span>
              <span className="pii-selbar-chips">
                {chosen.map((s) => (
                  <span key={s.id} className="pii-selchip">{s.name}
                    <button type="button" aria-label={`Remove ${s.name}`} onClick={() => pick(s.id)}><Icon name="x" size={11} /></button>
                  </span>
                ))}
              </span>
            </div>
          }
          </div>

          {list.length === 0 ?
          <div className="pii-empty">
              <div className="pii-empty-ic"><Icon name="folder" size={22} /></div>
              <h3>{tab === "project" ? "This project has no service offer yet" : "No service offer in your basket"}</h3>
              <p>{tab === "project" ?
              <>You created <b>{project.name}</b> at step 2, so it holds no negotiated service yet. Pick one from your basket, or add one now.</> :
              <>Your basket only holds the data offer. Add a service offer that consumes personal data to bind it to.</>}</p>
              <div className="pii-empty-actions">
                <a className="bk-confirm" href="Catalogue.html"><Icon name="plus" size={15} /> Add a service offer to basket</a>
                {tab === "project" && basketServices.length > 0 && <button type="button" className="bk-btn" onClick={() => setTab("basket")}><Icon name="cart" size={14} /> See basket services</button>}
              </div>
            </div> :

          <div className="pii-list">
              {list.map((s) => <ServiceCard key={s.id} svc={s} selected={chosenIds.includes(s.id)} onSelect={pick} live={live && s.id === "svc_matching"} />)}
            </div>
          }


          {liveChosen &&
          <div className="pii-banner live" style={{ marginTop: 16, marginBottom: 0 }}>
              <Icon name="check" size={16} />
              <span><b>job_matching_service is already active in {project.name}</b> under contract {SERVICES.find((s) => s.id === "svc_matching").contractRef}. The next step lets you attach this dataset to that contract instead of opening a new negotiation.</span>
            </div>
          }
        </>
        }

      <div className="bk-nav">
        <a className="bk-btn ghost" href={BASKET}><Icon name="chevronLeft" size={15} /> Back to basket</a>
        {chosen.length > 0 ?
          <button type="button" className="bk-confirm" onClick={onContinue}>Continue <Icon name="arrowRight" size={15} /></button> :
          <span className="pii-nav-hint">Select at least one eligible service offer to continue</span>}
      </div>

      <TweaksPanel title="PII flow — states">
        <TweakSection label="Project chosen at step 2" />
        <TweakRadio label="Project" value={t.project} options={["Existing project", "New project"]} onChange={(v) => setTweak("project", v)} />
        <TweakSection label="Basket contents" />
        <TweakRadio label="Services" value={t.basket} options={["Has a compatible service", "None compatible"]} onChange={(v) => setTweak("basket", v)} />
        <TweakSection label="Edge case" />
        <TweakRadio label="Service" value={t.serviceState} options={["Needs negotiation", "Already active in project"]} onChange={(v) => setTweak("serviceState", v)} />
      </TweaksPanel>
    </PageShell>);

  }

  ReactDOM.createRoot(document.getElementById("root")).render(<AssignApp />);
})();