// VisionsTrust — Demo 07/08 · personal-data branch of the basket.
// Reached only when the basket holds an offer marked "Contains personal data":
// step 4 designates the consuming services, step 5 is the read-only recap.
(function () {
const { useState, useEffect, useRef } = React;
const { Icon } = window.UI;
const { AppLayout } = window.VTLayout;
const D = window.Demo;
const U = window.DemoUI;
const R = window.DemoRecap;
const { initials, hexToRgba } = D;

const STEPS = [
  { n: 1, label: "Review the basket" },
  { n: 2, label: "Adjust the baseline" },
  { n: 3, label: "Assign to project" },
  { n: 4, label: "Assign a consuming service" },
  { n: 5, label: "Review & confirm" },
];

const declRows = (s) => [
  { k: "Role", v: s.role },
  { k: "Processing purpose", v: s.purpose },
  { k: "Operations", v: s.operations, wide: true },
  { k: "Sub-processors", v: s.subProcessors },
  { k: "International transfers", v: s.transfers },
  { k: "Security measures", v: s.toms, wide: true },
  { k: "Data-processing agreement", v: s.dpa },
  { k: "Retention by the processor", v: s.retention },
];
const Row = ({ k, v, wide }) => (
  <div className={`pii-row ${wide ? "full" : ""} locked`}>
    <span className="pii-row-k"><Icon name="lock" size={11} /> {k}</span>
    <span className="pii-row-v">{v}</span>
  </div>
);
function CollapseBlock({ title, sub, count, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`pii-cardblock ${open ? "open" : ""}`}>
      <button type="button" className="pii-cardblock-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="lock" size={13} /> {title}
        {count != null && <span className="pii-cardblock-count">{count} fields</span>}
        <span className="pii-cardblock-sub">{sub}</span>
        <span className="pii-cardblock-chev"><Icon name={open ? "chevronUp" : "chevronDown"} size={15} /></span>
      </button>
      {open && children}
    </div>
  );
}

function ServiceCard({ svc, selected, onSelect }) {
  const ok = D.isEligible(svc);
  return (
    <button type="button" className={`pii-svc ${selected ? "sel" : ""} ${ok ? "" : "off"}`} disabled={!ok}
      aria-pressed={ok ? selected : undefined} onClick={() => ok && onSelect(svc.id)}>
      <span className="pii-radio box" aria-hidden="true"><i><Icon name="check" size={13} /></i></span>
      <span className="pii-svc-body">
        <span className="pii-svc-top">
          <U.Monogram offer={svc} size={26} />
          <span className="pii-svc-name">{svc.name}</span>
          <span className="pii-svc-by">by {svc.provider}</span>
          <span className="pii-svc-src"><Icon name={svc.source === "project" ? "folder" : "cart"} size={11} /> {svc.source === "project" ? "In project" : "In basket"}</span>
          {svc.source === "project" && svc.contractRef && <span className="pii-live"><i></i> Active in project</span>}
        </span>
        <span className="pii-svc-purpose">{svc.purpose}</span>
        {!ok && <span className="pii-reason"><Icon name="triggers" size={13} /><span><b>Not eligible — {svc.reason}.</b> {svc.reasonHint}</span></span>}
      </span>
      <span className="pii-svc-side">
        {ok ? <span className="bk-st st-ok"><Icon name="check" size={10} /> Eligible</span> : <span className="bk-st st-gap"><Icon name="lock" size={10} /> Not eligible</span>}
      </span>
    </button>
  );
}

function PiiApp() {
  const [st, setSt] = useState(() => D.load());
  const [step, setStep] = useState(4);
  const topRef = useRef(null);
  useEffect(() => { D.save(st); }, [st]);
  useEffect(() => { if (topRef.current) topRef.current.scrollTop = 0; }, [step]);

  const lines = D.cartLines(st);
  const dataOffers = lines.filter((l) => l.offer.pii === "contains").map((l) => l.offer);
  const newProject = st.assign.tab === "new";
  const project = D.PROJECTS.find((p) => p.id === st.assign.projectId);
  const target = newProject ? (st.assign.newProj.title || "New project") : (project ? project.name : "");
  const targetCaption = newProject ? st.assign.newProj.caption : (project ? project.caption : "");

  const fromProject = newProject ? [] : D.PROJECT_SERVICES;
  const fromBasket = lines
    .filter((l) => l.offer.pii !== "contains")
    .map((l) => ({ ...l.offer, source: "basket", contractRef: null, ...(D.PROCESSOR[l.offer.id] || { consumesPII: false, piiComplete: false, reason: "No personal-data declaration", reasonHint: "This offer has not declared how it would process personal data." }) }));
  const [tab, setTab] = useState(newProject ? "basket" : "project");
  const list = tab === "project" ? fromProject : fromBasket;
  const eligibleAll = [...fromProject, ...fromBasket].filter(D.isEligible);
  const chosen = eligibleAll.filter((s) => st.piiSel.includes(s.id));
  const pick = (id) => setSt((s) => ({ ...s, piiSel: s.piiSel.includes(id) ? s.piiSel.filter((x) => x !== id) : [...s.piiSel, id] }));
  const inBasketChosen = chosen.filter((s) => s.source !== "project");
  const inProjectChosen = chosen.filter((s) => s.source === "project");
  const amendRefs = inProjectChosen.map((s) => s.contractRef).filter(Boolean);

  const send = () => {
    const receipt = {
      at: new Date().toISOString(), target, targetCaption, hasPII: true,
      lines: lines.map((l) => ({ offerId: l.offerId, pkgId: l.pkgId, price: U.priceOf(l.offer, l.pkg, st.prices) })),
      services: chosen.map((s) => ({ id: s.id, name: s.name, provider: s.provider, source: s.source, contractRef: s.contractRef || null })),
      dataOffers: dataOffers.map((o) => o.id),
    };
    D.update((s) => { s.receipt = receipt; return s; });
    location.href = D.PAGES.confirmation;
  };

  if (!lines.length || !dataOffers.length) {
    return (
      <AppLayout title="Basket" activeId="offers" cartCount={lines.length} cartHref={D.PAGES.basket} className="bk-app">
        <div className="bk-content"><div className="bk-page">
          <div className="bk-empty">
            <div className="bk-empty-ic"><Icon name="shield" size={26} /></div>
            <h2>No personal-data offer in the basket</h2>
            <p>This step only applies when the basket contains an offer marked “Contains personal data”.</p>
            <a className="bk-confirm" href={D.PAGES.basket}>Back to the basket <Icon name="arrowRight" size={15} /></a>
          </div>
        </div></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Basket" activeId="offers" cartCount={lines.length} cartHref={D.PAGES.basket} className="bk-app">
      <div className="bk-content" ref={topRef}>
        <div className="bk-page">
          <div className="bk-flow">
            <U.Stepper steps={STEPS} step={step} onGo={(n) => { if (n <= 3) location.href = `${D.PAGES.basket}?step=${n}`; else setStep(n); }} />
            <R.RecapBar lines={lines} target={target} />

            {step === 4 && (
              <div className="bk-stepbody">
                <div className="bk-step-intro"><h2>Assign the consuming service offers</h2><p>This basket contains personal data. Pick every service offer that will process it — one negotiation is opened per pairing, and the controller's terms carry into each one unchanged.</p></div>

                <div className="pii-notice">
                  <span className="pii-notice-ic"><Icon name="shield" size={19} /></span>
                  <div>
                    <h3>Personal data can only be shared for a declared purpose</h3>
                    <p><b>{dataOffers.map((o) => o.name).join(", ")}</b> contains personal data. Under the GDPR, the controller can only disclose it to a service acting as processor on documented instructions, for a specified purpose and lawful basis. Pick every service offer that will process the data — each pairing is contracted with the dataset, and the controller's personal-data terms carry into every contract as-is: <b>they cannot be negotiated or edited</b>.</p>
                  </div>
                </div>

                {eligibleAll.length === 0 ? (
                  <div className="pii-empty">
                    <div className="pii-empty-ic"><Icon name="layers" size={22} /></div>
                    <h3>No eligible service offer yet</h3>
                    <p>Nothing in {newProject ? "your new project" : <b>{target}</b>} or in this basket both consumes personal data and has a complete personal-data declaration. Add one to continue.</p>
                    <div className="pii-empty-actions">
                      <a className="bk-confirm" href={D.PAGES.catalog}><Icon name="plus" size={15} /> Add a service offer to basket</a>
                      <a className="bk-btn" href={`${D.PAGES.basket}?step=3`}><Icon name="chevronLeft" size={14} /> Back to the basket</a>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="pii-tabrow">
                      <div className="seg2 pii-tabs">
                        <button type="button" className={tab === "project" ? "active teal" : ""} onClick={() => setTab("project")}>
                          <Icon name="folder" size={14} /> From {newProject ? "the new project" : target} <span className="pii-tab-count">{fromProject.length}</span>
                        </button>
                        <button type="button" className={tab === "basket" ? "active teal" : ""} onClick={() => setTab("basket")}>
                          <Icon name="cart" size={14} /> From this basket <span className="pii-tab-count">{fromBasket.length}</span>
                        </button>
                      </div>
                      {chosen.length > 0 && (
                        <div className="pii-selbar">
                          <span className="pii-selbar-k"><Icon name="layers" size={13} /> {chosen.length} service{chosen.length > 1 ? "s" : ""} selected</span>
                          <span className="pii-selbar-chips">
                            {chosen.map((s) => (
                              <span key={s.id} className="pii-selchip">{s.name}<button type="button" aria-label={`Remove ${s.name}`} onClick={() => pick(s.id)}><Icon name="x" size={11} /></button></span>
                            ))}
                          </span>
                        </div>
                      )}
                    </div>
                    {list.length === 0 ? (
                      <div className="pii-empty">
                        <div className="pii-empty-ic"><Icon name="folder" size={22} /></div>
                        <h3>{tab === "project" ? "This project has no service offer yet" : "No service offer in this basket"}</h3>
                        <p>{tab === "project" ? "The project you picked at the previous step holds no negotiated service yet. Pick one from this basket, or add one now." : "This basket only holds data offers. Add a service offer that consumes personal data to bind it to."}</p>
                        <div className="pii-empty-actions">
                          <a className="bk-confirm" href={D.PAGES.catalog}><Icon name="plus" size={15} /> Add a service offer to basket</a>
                          {tab === "project" && fromBasket.length > 0 && <button type="button" className="bk-btn" onClick={() => setTab("basket")}><Icon name="cart" size={14} /> See basket services</button>}
                        </div>
                      </div>
                    ) : (
                      <div className="pii-list">{list.map((s) => <ServiceCard key={s.id} svc={s} selected={st.piiSel.includes(s.id)} onSelect={pick} />)}</div>
                    )}
                  </>
                )}

                <div className="bk-nav">
                  <a className="bk-btn ghost" href={`${D.PAGES.basket}?step=3`}><Icon name="chevronLeft" size={15} /> Back</a>
                  {chosen.length > 0
                    ? <button type="button" className="bk-confirm" onClick={() => setStep(5)}>Review &amp; confirm <Icon name="arrowRight" size={15} /></button>
                    : <span className="pii-nav-hint">Select at least one eligible service offer to continue</span>}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="bk-stepbody">
                <div className="bk-step-intro"><h2>Review &amp; confirm</h2><p>Everything below is read-only. The personal-data section recaps the locked declarations and the services authorised to process the dataset.</p></div>
                <R.ConfirmStep lines={lines} st={st} target={target} targetCaption={targetCaption}
                  readOnlyNote="Read-only recap — go back to step 2 to change any value before sending." />

                <div className="bk-confirm-wrap pii-confirm">
                  <div className="bk-sec-title" style={{ marginBottom: 10 }}>
                    <Icon name="shield" size={18} /> Personal data
                    <span className="pii-lockbadge" style={{ marginLeft: 8 }}><Icon name="lock" size={11} /> Terms locked</span>
                  </div>
                  <div className="bk-banner review">
                    <Icon name="shield" size={16} />
                    <span>
                      {inBasketChosen.length > 0
                        ? <><b>{inBasketChosen.length} data ⇄ service negotiation{inBasketChosen.length !== 1 ? "s" : ""}</b> {inBasketChosen.length !== 1 ? "are" : "is"} opened on confirm.</>
                        : <>No new negotiation is needed.</>}
                      {amendRefs.length > 0 && <> The {inProjectChosen.length} service{inProjectChosen.length !== 1 ? "s" : ""} already contracted in the project {inProjectChosen.length !== 1 ? "are" : "is"} amended with a personal-data rider (contract{amendRefs.length !== 1 ? "s" : ""} {amendRefs.join(", ")}).</>}
                    </span>
                  </div>
                  {dataOffers.map((offer) => (
                    <div className="bk-review-offer" key={offer.id}>
                      <div className="bk-offer-top">
                        <U.Monogram offer={offer} size={38} />
                        <div className="bk-offer-main">
                          <div className="bk-offer-meta">
                            <span className="pii-role-tag ctrl"><Icon name="database" size={11} /> Personal data · controller</span>
                            <span className="bk-offer-by">by {offer.provider}</span>
                          </div>
                          <h3 className="bk-offer-name sm">{offer.name}</h3>
                        </div>
                        <span className="pii-lockbadge"><Icon name="lock" size={11} /> Personal-data terms locked</span>
                      </div>
                      <CollapseBlock title="Personal-data declaration" sub={`Published by ${offer.provider}. Carried into every contract as-is.`} count={D.CONTROLLER_ROWS.length}>
                        <div className="pii-grid">{D.CONTROLLER_ROWS.map((r) => <Row key={r.k} k={r.k} v={r.v} wide={r.wide} />)}</div>
                      </CollapseBlock>
                      <div className="pii-assigned">
                        <div className="pii-assigned-head">
                          <Icon name="layers" size={13} /> Assigned services
                          <span className="pii-assigned-count">{chosen.length}</span>
                          <span className="pii-assigned-sub">Service offers authorised to process this dataset.</span>
                        </div>
                        <div className="pii-assigned-cards">
                          {chosen.map((s) => {
                            const inProj = s.source === "project";
                            return (
                              <div className="bk-review-offer pii-nested" key={s.id}>
                                <div className="bk-offer-top">
                                  <U.Monogram offer={s} size={30} />
                                  <div className="bk-offer-main">
                                    <div className="bk-offer-meta">
                                      <span className="pii-role-tag proc"><Icon name="layers" size={11} /> Service · {(s.role || "processor").toLowerCase()}</span>
                                      <span className="bk-offer-by">by {s.provider}</span>
                                    </div>
                                    <h3 className="bk-offer-name sm">{s.name}</h3>
                                  </div>
                                  <span className={`pii-usetag ${inProj ? "project" : "basket"}`}><Icon name={inProj ? "folder" : "cart"} size={11} /> {inProj ? "Already in the project" : "In this basket"}</span>
                                </div>
                                <div className={`pii-usetag ${inProj ? "project" : "basket"}`} style={{ marginBottom: 10 }}>
                                  <Icon name={inProj ? "check" : "cart"} size={11} /> {inProj ? (s.contractRef ? `Personal-data rider on live contract ${s.contractRef}` : "Already live in the project") : "New data ⇄ service negotiation on confirm"}
                                </div>
                                <CollapseBlock title="Processing declaration" sub={`Declared by ${s.provider} before the offer became eligible.`} count={declRows(s).length}>
                                  <div className="pii-grid">{declRows(s).map((r) => <Row key={r.k} k={r.k} v={r.v} wide={r.wide} />)}</div>
                                </CollapseBlock>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pii-finalnote">
                    <Icon name="lock" size={13} />
                    <span>Personal-data fields cannot be edited or negotiated by either party. To change them, the provider must update the offer's declaration and republish it.</span>
                  </div>
                </div>

                <div className="bk-nav">
                  <button type="button" className="bk-btn ghost" onClick={() => setStep(4)}><Icon name="chevronLeft" size={15} /> Back</button>
                  <button type="button" className="bk-confirm" onClick={send}>
                    {inBasketChosen.length > 0
                      ? <>Accept · create {inBasketChosen.length} data ⇄ service negotiation{inBasketChosen.length !== 1 ? "s" : ""}{amendRefs.length ? ` · amend ${amendRefs.join(", ")}` : ""} <Icon name="check" size={16} /></>
                      : <>Accept <Icon name="check" size={16} /></>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PiiApp />);
})();
