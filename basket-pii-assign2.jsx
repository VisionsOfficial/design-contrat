// VisionsTrust — Basket · PII flow · Step 3, STRUCTURE V2.
// Same data and states as basket-pii-assign.jsx, restructured:
//   · monochrome ink + hairlines; teal only on the selected row and the primary action
//   · status carried by TYPOGRAPHY (small-caps state, muted reason) instead of coloured pills
//   · three numbered blocks with generous rhythm: context → choose → locked terms
(function () {
const { useState } = React;
const { Icon } = window.UI;
const { initials } = window.CatData;
const { DATA_OFFER, PII_CONTROLLER, PROJECT, NEW_PROJECT, SERVICES, isEligible } = window.BasketPIIData;
const { BASKET, STEP5, PageShell, readFlow, writeFlow } = window.BKPII;
const { useTweaks, TweaksPanel, TweakSection, TweakRadio } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "project": "Existing project",
  "basket": "Has a compatible service",
  "serviceState": "Needs negotiation"
}/*EDITMODE-END*/;

const Ini = ({ name }) => <span className="p2-ini" aria-hidden="true">{initials(name)}</span>;

function ContextStrip({ dataOffer, project, service }) {
  return (
    <div className="p2-context">
      <div className="p2-cx">
        <div className="p2-cx-k">Personal-data offer</div>
        <div className="p2-cx-v"><Ini name={dataOffer.name} /><span className="p2-cx-t"><span className="p2-cx-name" title={dataOffer.name}>{dataOffer.name}</span><span className="p2-cx-sub">{dataOffer.provider}</span></span></div>
      </div>
      <div className="p2-cx">
        <div className="p2-cx-k">Project</div>
        <div className="p2-cx-v"><Ini name={project.name} /><span className="p2-cx-t"><span className="p2-cx-name" title={project.name}>{project.name}</span><span className="p2-cx-sub">{project.caption}</span></span></div>
      </div>
      <div className={`p2-cx ${service ? "" : "pending"}`}>
        <div className="p2-cx-k">Consuming service</div>
        <div className="p2-cx-v">
          {service
            ? <><Ini name={service.name} /><span className="p2-cx-t"><span className="p2-cx-name" title={service.name}>{service.name}</span><span className="p2-cx-sub">{service.provider}</span></span></>
            : <span className="p2-cx-t"><span className="p2-cx-name">Not chosen yet</span><span className="p2-cx-sub">Select one below</span></span>}
        </div>
      </div>
    </div>
  );
}

function Candidate({ svc, selected, onSelect, live }) {
  const ok = isEligible(svc);
  return (
    <button type="button" className={`p2-cand ${selected ? "on" : ""} ${ok ? "" : "off"}`} disabled={!ok}
      aria-pressed={ok ? selected : undefined} onClick={() => ok && onSelect(svc.id)}>
      <span className="p2-radio" aria-hidden="true"></span>
      <span className="p2-cand-body">
        <span className="p2-cand-top">
          <span className="p2-cand-name">{svc.name}</span>
          <span className="p2-cand-by">{svc.provider}</span>
        </span>
        <span className="p2-cand-purpose">{svc.purpose}</span>
        {ok ? (
          <span className="p2-facts">
            <span className="p2-fact"><Icon name="shield" size={12} />Role <b>{svc.role}</b></span>
            <span className="p2-fact"><Icon name="doc" size={12} />DPA <b>{svc.dpa.toLowerCase()}</b></span>
            <span className="p2-fact"><Icon name="check" size={12} />PII declaration <b>complete</b></span>
            {live && <span className="p2-fact"><Icon name="clock" size={12} />Active under <b>{svc.contractRef}</b></span>}
          </span>
        ) : (
          <span className="p2-why"><b>{svc.reason}.</b> {svc.reasonHint}</span>
        )}
      </span>
      <span className="p2-cand-side">
        <span className={`p2-state ${ok ? "ready" : ""}`}>{ok ? "Eligible" : "Not eligible"}</span>
        <span className="p2-src">{svc.source === "project" ? "In project" : "In basket"}</span>
      </span>
    </button>
  );
}

function LockedTerms() {
  const [all, setAll] = useState(false);
  const rows = all ? PII_CONTROLLER : PII_CONTROLLER.slice(0, 4);
  return (
    <div className="p2-panel">
      <div className="p2-panel-head">
        <div>
          <div className="p2-panel-t">Declared by the controller</div>
          <div className="p2-panel-s">Published with the data offer and carried into the contract unchanged.</div>
        </div>
        <span className="p2-lock"><Icon name="lock" size={11} /> Not negotiable</span>
      </div>
      <div className="p2-defs">
        {rows.map((r) => (
          <div className={`p2-def ${r.wide ? "full" : ""}`} key={r.k}>
            <div className="p2-def-k">{r.k}</div>
            <div className="p2-def-v">{r.v}</div>
          </div>
        ))}
      </div>
      {!all && <button type="button" className="p2-more" onClick={() => setAll(true)}>Show all {PII_CONTROLLER.length} declared terms</button>}
    </div>
  );
}

function AssignApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const saved = readFlow();
  const [sel, setSel] = useState(saved.serviceId || null);
  const [tab, setTab] = useState("project");

  const newProject = t.project === "New project";
  const project = newProject ? NEW_PROJECT : PROJECT;
  const compatibleBasket = t.basket === "Has a compatible service";
  const live = t.serviceState === "Already active in project";

  const projectServices = newProject ? [] : SERVICES.filter((s) => s.source === "project");
  const basketServices = SERVICES.filter((s) => s.source === "basket" && (compatibleBasket || !isEligible(s)));
  const list = tab === "project" ? projectServices : basketServices;
  const all = [...projectServices, ...basketServices];
  const eligibleCount = all.filter(isEligible).length;
  const noneAnywhere = eligibleCount === 0;

  const selected = SERVICES.find((s) => s.id === sel) || null;
  const selectedIsListed = selected && (selected.source === "project" ? !newProject : (compatibleBasket || !isEligible(selected)));
  const choice = selectedIsListed ? selected : null;

  const onContinue = () => { writeFlow({ serviceId: sel, project: project.name, serviceState: t.serviceState }); window.location.href = STEP5; };

  return (
    <PageShell step={3}>
      <div className="p2">
        <header className="p2-head">
          <div className="p2-eyebrow">Step 3 of 4 · Personal data</div>
          <h2 className="p2-h1">Assign a consuming service offer</h2>
          <p className="p2-lede">This basket contains personal data. Pick the service offer that will process it — that pairing is what gets negotiated.</p>
          <p className="p2-rule">A personal-data offer is never consumed on its own. <strong>{DATA_OFFER.name}</strong> requires a designated processor, so the two offers are contracted together and the controller's personal-data terms travel with them <strong>unchanged — neither negotiable nor editable</strong>.</p>
        </header>

        <ContextStrip dataOffer={DATA_OFFER} project={project} service={choice} />

        <section className="p2-sec">
          <div className="p2-sec-head">
            <span className="p2-sec-n">01</span>
            <h3 className="p2-sec-t">Choose the processing service</h3>
            <span className="p2-sec-meta">{eligibleCount} eligible of {all.length}</span>
          </div>

          {noneAnywhere ? (
            <div className="p2-empty">
              <h3>No eligible service offer yet</h3>
              <p>
                {newProject
                  ? <>Your new project <b>{project.name}</b> holds no service offer, and nothing in your basket both consumes personal data and has a complete PII declaration.</>
                  : <>Nothing in <b>{project.name}</b> or in your basket both consumes personal data and has a complete PII declaration.</>}
                {" "}Add one to continue — you'll come back to this step with it listed.
              </p>
              <div className="p2-empty-actions">
                <a className="bk-confirm" href="Catalogue.html"><Icon name="plus" size={15} /> Add a service offer</a>
                <a className="bk-btn" href="My Offers.html">Use one of my own offers</a>
              </div>
            </div>
          ) : (
            <>
              <div className="p2-tabs" role="tablist" aria-label="Service source">
                <button type="button" role="tab" aria-selected={tab === "project"} className={`p2-tab ${tab === "project" ? "on" : ""}`} onClick={() => setTab("project")}>{project.name} <span>{projectServices.length}</span></button>
                <button type="button" role="tab" aria-selected={tab === "basket"} className={`p2-tab ${tab === "basket" ? "on" : ""}`} onClick={() => setTab("basket")}>Your basket <span>{basketServices.length}</span></button>
              </div>

              {list.length === 0 ? (
                <div className="p2-empty">
                  <h3>{tab === "project" ? "This project has no service offer yet" : "No service offer in your basket"}</h3>
                  <p>{tab === "project"
                    ? <>You created <b>{project.name}</b> at step 2, so it holds no negotiated service yet. Pick one from your basket, or add one now.</>
                    : <>Your basket only holds the data offer. Add a service offer that consumes personal data to bind it to.</>}</p>
                  <div className="p2-empty-actions">
                    <a className="bk-confirm" href="Catalogue.html"><Icon name="plus" size={15} /> Add a service offer</a>
                    {tab === "project" && basketServices.length > 0 && <button type="button" className="bk-btn" onClick={() => setTab("basket")}>See basket services</button>}
                  </div>
                </div>
              ) : (
                <div className="p2-list">
                  {list.map((s) => <Candidate key={s.id} svc={s} selected={sel === s.id} onSelect={setSel} live={live && s.id === "svc_matching"} />)}
                </div>
              )}

              {choice && live && choice.id === "svc_matching" && (
                <p className="p2-note"><b>{choice.name} is already active in {project.name}</b> under contract {choice.contractRef}. The next step lets you attach this dataset to that contract instead of opening a new negotiation.</p>
              )}
            </>
          )}
        </section>

        {choice && (
          <section className="p2-sec">
            <div className="p2-sec-head">
              <span className="p2-sec-n">02</span>
              <h3 className="p2-sec-t">Personal-data terms that will apply</h3>
              <span className="p2-sec-meta">Read-only</span>
            </div>
            <LockedTerms />
          </section>
        )}

        <div className="p2-foot">
          <a className="p2-back" href={BASKET}><Icon name="chevronLeft" size={15} /> Back to basket</a>
          <div className="p2-foot-right">
            {choice
              ? <button type="button" className="bk-confirm" onClick={onContinue}>Continue with {choice.name} <Icon name="arrowRight" size={15} /></button>
              : <span className="p2-hint">Select an eligible service offer to continue</span>}
          </div>
        </div>
      </div>

      <TweaksPanel title="PII flow — states">
        <TweakSection label="Project chosen at step 2" />
        <TweakRadio label="Project" value={t.project} options={["Existing project", "New project"]} onChange={(v) => setTweak("project", v)} />
        <TweakSection label="Basket contents" />
        <TweakRadio label="Services" value={t.basket} options={["Has a compatible service", "None compatible"]} onChange={(v) => setTweak("basket", v)} />
        <TweakSection label="Edge case" />
        <TweakRadio label="Service" value={t.serviceState} options={["Needs negotiation", "Already active in project"]} onChange={(v) => setTweak("serviceState", v)} />
      </TweaksPanel>
    </PageShell>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AssignApp />);
})();
