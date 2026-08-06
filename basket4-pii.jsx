// VisionsTrust — Basket (merged flow) · personal-data steps injected into the basket.
// When the basket holds a personal-data offer, two things are added to the basket flow:
//   · one extra step (assign the consuming service offers) right after "Assign to project";
//   · a personal-data block inside the existing basket recap (last step).
// Nothing here is negotiable: the controller's declaration carries into every contract as-is.
(function () {
const { useState } = React;
const { Icon } = window.UI;
const { initials, hexToRgba } = window.CatData;
const PII = window.BasketPIIData;

// Which basket offers expose personal data (controller side).
const PII_DATA_IDS = new Set(["data_offer_1"]);
const isPiiOffer = (o) => PII_DATA_IDS.has(o.id);

// Processor-side declarations for the offers that can sit in the basket.
const DECL = {
  consume_any_data: {
    consumesPII: true, piiComplete: true, role: "Processor",
    purpose: "Cross-referencing datasets for the project",
    operations: "Collection · Storage · Cross-referencing · Analysis",
    subProcessors: "No", transfers: "No (EU/EEA only)",
    toms: "Encryption at rest · Encryption in transit · Access control (RBAC) · Audit logging",
    dpa: "Signed", retention: "Contract duration, then erasure within 30 days",
  },
  data_infra_2: {
    consumesPII: false, piiComplete: false, purpose: "Managed compute & storage",
    reason: "Does not consume personal data",
    reasonHint: "Infrastructure offers cannot be designated as the processor of this dataset.",
  },
  mobility_flows_api: {
    consumesPII: false, piiComplete: false, purpose: "Passenger-flow counts API",
    reason: "Not a service offer",
    reasonHint: "Only a service offer can be designated as the processor of a personal-data offer.",
  },
};
const isEligible = (s) => !!(s.consumesPII && s.piiComplete);

// Controller declaration, re-attributed to the provider of the basket's data offer.
const controllerRows = (offer) => PII.PII_CONTROLLER.map((r) =>
  r.k === "Data controller" ? { ...r, v: `${offer.provider} SAS` } :
  r.k === "DPO contact" ? { ...r, v: "dpo@dataprovider.eu" } : r);

// Candidates = service offers already live in the chosen project + service offers
// sitting in this basket. A brand-new project holds nothing yet.
function candidatesFor(selectedOffers, opts) {
  const project = (opts && opts.newProject) ? [] : PII.SERVICES.filter((s) => s.source === "project");
  const basket = selectedOffers.filter((o) => !isPiiOffer(o)).map((o) => ({
    ...o, source: "basket", contractRef: null, ...(DECL[o.id] || { consumesPII: false, piiComplete: false, reason: "No personal-data declaration", reasonHint: "This offer has not declared how it would process personal data." }),
  }));
  return { project, basket };
}
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

function Mono({ offer, size = 26 }) {
  return <div className="bk-mono" style={{ width: size, height: size, background: `linear-gradient(135deg, ${hexToRgba(offer.accent, 0.9)}, ${hexToRgba(offer.accent, 0.55)})` }} aria-hidden="true">{initials(offer.name)}</div>;
}
const Row = ({ k, v, wide }) => (
  <div className={`pii-row ${wide ? "full" : ""} locked`}>
    <span className="pii-row-k"><Icon name="lock" size={11} /> {k}</span>
    <span className="pii-row-v">{v}</span>
  </div>
);
function CollapseBlock({ icon = "lock", title, sub, count, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`pii-cardblock ${open ? "open" : ""}`}>
      <button type="button" className="pii-cardblock-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name={icon} size={13} /> {title}
        {count != null && <span className="pii-cardblock-count">{count} field{count !== 1 ? "s" : ""}</span>}
        <span className="pii-cardblock-sub">{sub}</span>
        <span className="pii-cardblock-chev"><Icon name={open ? "chevronUp" : "chevronDown"} size={15} /></span>
      </button>
      {open && children}
    </div>
  );
}

// ─── EXTRA STEP · assign the consuming service offers ────────────────────────
function ServiceCard({ svc, selected, onSelect, live }) {
  const ok = isEligible(svc);
  return (
    <button type="button" className={`pii-svc ${selected ? "sel" : ""} ${ok ? "" : "off"}`} disabled={!ok}
      aria-pressed={ok ? selected : undefined} onClick={() => ok && onSelect(svc.id)}>
      <span className="pii-radio box" aria-hidden="true"><i><Icon name="check" size={13} /></i></span>
      <span className="pii-svc-body">
        <span className="pii-svc-top">
          <Mono offer={svc} size={26} />
          <span className="pii-svc-name">{svc.name}</span>
          <span className="pii-svc-by">by {svc.provider}</span>
          <span className="pii-svc-src"><Icon name={svc.source === "project" ? "folder" : "cart"} size={11} /> {svc.source === "project" ? "In project" : "In basket"}</span>
          {live && <span className="pii-live"><i></i> Active in project</span>}
        </span>
        <span className="pii-svc-purpose">{svc.purpose}</span>
        {!ok && (
          <span className="pii-reason">
            <Icon name="triggers" size={13} />
            <span><b>Not eligible — {svc.reason}.</b> {svc.reasonHint}</span>
          </span>
        )}
      </span>
      <span className="pii-svc-side">
        {ok
          ? <span className="bk-st st-ok"><Icon name="check" size={10} /> Eligible</span>
          : <span className="bk-st st-gap"><Icon name="lock" size={10} /> Not eligible</span>}
      </span>
    </button>
  );
}

function PiiAssignStep({ dataOffers, candidates, sel, onPick, projectName, newProject }) {
  const [tab, setTab] = useState(newProject ? "basket" : "project");
  const list = (tab === "project" ? candidates.project : candidates.basket);
  const eligibleAll = [...candidates.project, ...candidates.basket].filter(isEligible);
  const chosen = eligibleAll.filter((s) => sel.includes(s.id));
  const names = dataOffers.map((o) => o.name).join(", ");
  return (
    <>
      <div className="pii-notice">
        <span className="pii-notice-ic"><Icon name="shield" size={19} /></span>
        <div>
          <h3>Personal data can only be shared for a declared purpose</h3>
          <p><b>{names}</b> contains personal data. Under the GDPR, the controller can only disclose it to a service acting as processor on documented instructions, for a specified purpose and lawful basis. Pick every service offer that will process the data — each pairing is contracted with the dataset, and the controller's personal-data terms carry into every contract as-is: <b>they cannot be negotiated or edited</b>.</p>
        </div>
      </div>

      {eligibleAll.length === 0 ? (
        <div className="pii-empty">
          <div className="pii-empty-ic"><Icon name="layers" size={22} /></div>
          <h3>No eligible service offer yet</h3>
          <p>Nothing in {newProject ? "your new project" : <b>{projectName}</b>} or in this basket both consumes personal data and has a complete PII declaration. Add one to continue — you'll come back to this step with it in the list.</p>
          <div className="pii-empty-actions">
            <a className="bk-confirm" href="Catalogue.html"><Icon name="plus" size={15} /> Add a service offer to basket</a>
            <a className="bk-btn" href="My Offers.html"><Icon name="layers" size={14} /> Use one of my own offers</a>
          </div>
        </div>
      ) : (
        <>
          <div className="pii-tabrow">
            <div className="seg2 pii-tabs">
              <button type="button" className={tab === "project" ? "active teal" : ""} onClick={() => setTab("project")}>
                <Icon name="folder" size={14} /> From {newProject ? "the new project" : projectName} <span className="pii-tab-count">{candidates.project.length}</span>
              </button>
              <button type="button" className={tab === "basket" ? "active teal" : ""} onClick={() => setTab("basket")}>
                <Icon name="cart" size={14} /> From this basket <span className="pii-tab-count">{candidates.basket.length}</span>
              </button>
            </div>
            {chosen.length > 0 && (
              <div className="pii-selbar">
                <span className="pii-selbar-k"><Icon name="layers" size={13} /> {chosen.length} service{chosen.length > 1 ? "s" : ""} selected</span>
                <span className="pii-selbar-chips">
                  {chosen.map((s) => (
                    <span key={s.id} className="pii-selchip">{s.name}
                      <button type="button" aria-label={`Remove ${s.name}`} onClick={() => onPick(s.id)}><Icon name="x" size={11} /></button>
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>
          {list.length === 0 ? (
            <div className="pii-empty">
              <div className="pii-empty-ic"><Icon name="folder" size={22} /></div>
              <h3>{tab === "project" ? "This project has no service offer yet" : "No service offer in this basket"}</h3>
              <p>{tab === "project"
                ? <>The project you picked at the previous step holds no negotiated service yet. Pick one from this basket, or add one now.</>
                : <>This basket only holds the data offer. Add a service offer that consumes personal data to bind it to.</>}</p>
              <div className="pii-empty-actions">
                <a className="bk-confirm" href="Catalogue.html"><Icon name="plus" size={15} /> Add a service offer to basket</a>
                {tab === "project" && candidates.basket.length > 0 && <button type="button" className="bk-btn" onClick={() => setTab("basket")}><Icon name="cart" size={14} /> See basket services</button>}
              </div>
            </div>
          ) : (
            <div className="pii-list">
              {list.map((s) => <ServiceCard key={s.id} svc={s} selected={sel.includes(s.id)} onSelect={onPick} live={s.source === "project" && !!s.contractRef} />)}
            </div>
          )}
        </>
      )}
    </>
  );
}

// ─── LAST STEP · personal-data block inside the basket recap ────────────────
function PiiConfirmBlock({ dataOffers, services }) {
  const inProject = services.filter((s) => s.source === "project");
  const inBasket = services.filter((s) => s.source !== "project");
  const amendRefs = inProject.map((s) => s.contractRef).filter(Boolean);
  return (
    <div className="bk-confirm-wrap pii-confirm">
      <div className="bk-sec-title" style={{ marginBottom: 10 }}>
        <Icon name="shield" size={18} /> Personal data
        <span className="pii-lockbadge" style={{ marginLeft: 8 }}><Icon name="lock" size={11} /> Terms locked</span>
      </div>
      <div className="bk-banner review">
        <Icon name="shield" size={16} />
        <span>
          {inBasket.length > 0
            ? <><b>{inBasket.length} data ⇄ service negotiation{inBasket.length !== 1 ? "s" : ""}</b> {inBasket.length !== 1 ? "are" : "is"} opened on confirm.</>
            : <>No new negotiation is needed.</>}
          {amendRefs.length > 0 && <> The {inProject.length} service{inProject.length !== 1 ? "s" : ""} already contracted in the project {inProject.length !== 1 ? "are" : "is"} amended with a personal-data rider (contract{amendRefs.length !== 1 ? "s" : ""} {amendRefs.join(", ")}).</>}
        </span>
      </div>
      {dataOffers.map((offer) => (
        <div className="bk-review-offer" key={offer.id}>
          <div className="bk-offer-top">
            <Mono offer={offer} size={38} />
            <div className="bk-offer-main">
              <div className="bk-offer-meta">
                <span className="pii-role-tag ctrl"><Icon name="database" size={11} /> Personal data · controller</span>
                <span className="bk-offer-by">by {offer.provider}</span>
              </div>
              <h3 className="bk-offer-name sm">{offer.name}</h3>
            </div>
            <span className="pii-lockbadge"><Icon name="lock" size={11} /> Personal-data terms locked</span>
          </div>
          <CollapseBlock title="Personal-data declaration" sub={`Published by ${offer.provider}. Carried into every contract as-is.`} count={controllerRows(offer).length}>
            <div className="pii-grid">{controllerRows(offer).map((r) => <Row key={r.k} k={r.k} v={r.v} wide={r.wide} />)}</div>
          </CollapseBlock>
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
                  <div className="bk-review-offer pii-nested" key={s.id}>
                    <div className="bk-offer-top">
                      <Mono offer={s} size={30} />
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
  );
}

window.BK4PII = { PII_DATA_IDS, isPiiOffer, isEligible, candidatesFor, controllerRows, PiiAssignStep, PiiConfirmBlock };
})();
