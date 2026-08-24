// VisionsTrust — Basket · personal-data pairing (v2, scalable).
// A personal-data offer can never be contracted alone: every dataset that contains
// personal data must be paired with the service offer(s) that will process it, and
// every service that processes personal data must be paired with the dataset(s) it
// consumes. Both directions are the same object — a PAIR (dataset ⇄ service) — so the
// step is modelled as a queue of pairing tasks, one per personal-data offer in the
// basket, whatever the offer's side. Pairs are symmetric: assigning from the dataset
// or from the service produces the same result.
// Nothing here is negotiable: each side's declaration carries into every contract as-is.
(function () {
const { useState, useMemo } = React;
const { Icon } = window.UI;
const { initials, hexToRgba, accentFor } = window.CatData;
const PII = window.BasketPIIData;
const acc = (o) => ({ ...o, accent: o.accent || accentFor((o.provider || "") + o.name) });

// ─── DECLARATIONS ──────────────────────────────────────────────────────────
const CTRL = (o) => [
  { k: "Data controller", v: o.controller },
  { k: "Legal basis", v: o.legalBasis },
  { k: "Data subjects", v: o.subjects, wide: true },
  { k: "Data categories", v: o.categories, wide: true },
  { k: "Special categories", v: o.special || "None declared" },
  { k: "Retention", v: o.retention },
  { k: "DPO contact", v: o.dpo },
  { k: "Consent withdrawal", v: o.withdrawal || "Propagated to the processor within 24 h" },
];
const PROC = (o) => [
  { k: "Role", v: o.role || "Processor" },
  { k: "Processing purpose", v: o.purpose },
  { k: "Operations", v: o.operations, wide: true },
  { k: "Sub-processors", v: o.subProcessors },
  { k: "International transfers", v: o.transfers },
  { k: "Security measures", v: o.toms, wide: true },
  { k: "Data-processing agreement", v: o.dpa },
  { k: "Retention by the processor", v: o.retention },
];

// Personal-data profile of every offer that can sit in the basket.
// side: "controller" (a dataset of personal data) | "processor" (a service that consumes it)
const PROFILE = {
  data_offer_1: { side: "controller", purpose: "Reference dataset with personal data",
    decl: CTRL({ controller: "DataProvider SAS", legalBasis: "Consent (Art. 6-1-a)", subjects: "Learners / students · Job seekers",
      categories: "Identity · Contact details · Education & training · Skills & competencies", retention: "Contract duration", dpo: "dpo@dataprovider.eu" }) },
  learner_records_pii: { side: "controller", purpose: "Learning traces attached to identified learners",
    decl: CTRL({ controller: "Education data Provider SAS", legalBasis: "Consent (Art. 6-1-a)", subjects: "Learners / students",
      categories: "Identity · Learning traces · Assessment results", retention: "24 months", dpo: "dpo@edu-provider.eu" }) },
  consume_any_data: { side: "processor", consumesPII: true, piiComplete: true, purpose: "Cross-referencing datasets for the project",
    decl: PROC({ purpose: "Cross-referencing datasets for the project", operations: "Collection · Storage · Cross-referencing · Analysis",
      subProcessors: "No", transfers: "No (EU/EEA only)", toms: "Encryption at rest · Encryption in transit · Access control (RBAC) · Audit logging",
      dpa: "Signed", retention: "Contract duration, then erasure within 30 days" }) },
  skills_analytics_pii: { side: "processor", consumesPII: true, piiComplete: true, purpose: "Aggregated skills analytics",
    decl: PROC({ purpose: "Aggregated skills analytics", operations: "Collection · Storage · Aggregation / anonymisation",
      subProcessors: "No", transfers: "No (EU/EEA only)", toms: "Encryption at rest · Pseudonymisation · Access control (RBAC)",
      dpa: "Signed", retention: "90 days" }) },
  learning_reco_pii: { side: "processor", consumesPII: true, piiComplete: false, purpose: "Personalised learning recommendations",
    reason: "Processor declaration incomplete", reasonHint: "Missing: processing purpose, operations, security measures, DPA status." },
  // Offers with no personal data at all — they can never be paired.
  data_infra_2: { side: "none", purpose: "Managed compute & storage", reason: "Does not process personal data", reasonHint: "Infrastructure offers cannot be designated as a processor." },
  mobility_flows_api: { side: "none", purpose: "Passenger-flow counts API", reason: "No personal data declared", reasonHint: "This offer publishes aggregated counts only." },
};
const profileOf = (o) => PROFILE[o.id] || { side: "none", reason: "No personal-data declaration", reasonHint: "This offer has not declared how it would process personal data." };
const sideOf = (o) => profileOf(o).side;
const isPiiOffer = (o) => sideOf(o) !== "none";
const isController = (o) => sideOf(o) === "controller";
const isProcessor = (o) => sideOf(o) === "processor";
const eligibleProfile = (p) => p.side === "controller" || (p.side === "processor" && p.consumesPII && p.piiComplete);

// ─── EXTRA BASKET ITEMS (used by the demo scenarios) ───────────────────────
// Basket-item shaped, so the standard basket steps handle them like any other offer.
const px = (sub, billing) => ({ sub, billing, setup: "0", api: "0", currency: "EUR", desc: "" });
const EXTRA_ITEMS = [
  acc({ id: "learner_records_pii", name: "learner_records_2026", kind: "Data", provider: "Education data Provider", org: "EDU",
    desc: "Learning traces and assessment results attached to identified learners.", pricing: px("1200", "Monthly"), saved: false, overrides: {} }),
  acc({ id: "skills_analytics_pii", name: "skills_analytics_service", kind: "Service", provider: "Headai", org: "HEADAI",
    desc: "Aggregated skills analytics over learner datasets.", pricing: px("800", "Monthly"), saved: false, overrides: {} }),
  acc({ id: "learning_reco_pii", name: "learning_reco_engine", kind: "Service", provider: "Inokufu", org: "INOKUFU",
    desc: "Personalised learning recommendations built on learner profiles.", pricing: px("450", "Monthly"), saved: false, overrides: {} }),
];

// ─── WHAT THE PROJECT ALREADY HOLDS ────────────────────────────────────────
// Live contracts in the selected project: they can receive a personal-data rider
// instead of opening a brand-new negotiation.
const PROJECT_SERVICES = [
  acc({ id: "prj_job_matching", name: "job_matching_service", provider: "Techfor", org: "TECHFOR", kind: "Service", contractRef: "C-2043",
    purpose: "Skills-to-vacancy matching", consumesPII: true, piiComplete: true,
    decl: PROC({ purpose: "Skills-to-vacancy matching", operations: "Collection · Storage · Analysis · Profiling", subProcessors: "No",
      transfers: "No (EU/EEA only)", toms: "Encryption at rest · Encryption in transit · Access control (RBAC) · Audit logging",
      dpa: "Signed", retention: "Contract duration, then erasure within 30 days" }) }),
  acc({ id: "prj_vr_player", name: "vr_session_player", provider: "Techné", org: "TECHNÉ", kind: "Service", contractRef: "C-2051",
    purpose: "VR session playback and telemetry", consumesPII: false, piiComplete: false,
    reason: "Does not process personal data", reasonHint: "This offer declares no personal-data processing, so it cannot receive a dataset." }),
];
const PROJECT_DATA = [
  acc({ id: "prj_learner_profiles", name: "learner_profiles_2025", provider: "Casa Data", org: "CASA", kind: "Data", contractRef: "C-1990",
    purpose: "Learner profiles with personal data",
    decl: CTRL({ controller: "Casa Data SAS", legalBasis: "Consent (Art. 6-1-a)", subjects: "Learners / students",
      categories: "Identity · Contact details · Skills & competencies", retention: "Contract duration", dpo: "dpo@casadata.eu" }) }),
  acc({ id: "prj_org_profiles", name: "org_profiles_dataset", provider: "DataProvider", org: "REJUSTIFY", kind: "Data", contractRef: "C-1975",
    purpose: "Organisation reference data", reason: "No personal data", reasonHint: "This dataset holds organisation records only — no pairing is required." }),
];

// ─── TASK MODEL ────────────────────────────────────────────────────────────
// One task per personal-data offer in the basket. need = which side is missing.
const candFromProject = (o, need) => ({
  id: o.id, name: o.name, provider: o.provider, accent: o.accent, kind: o.kind, purpose: o.purpose,
  source: "project", contractRef: o.contractRef || null,
  eligible: need === "service" ? !!(o.consumesPII && o.piiComplete) : !!o.decl,
  reason: o.reason, reasonHint: o.reasonHint, decl: o.decl,
});
const candFromBasket = (o, need) => {
  const p = profileOf(o);
  const wantSide = need === "service" ? "processor" : "controller";
  const eligible = p.side === wantSide && eligibleProfile(p);
  return {
    id: o.id, name: o.name, provider: o.provider, accent: o.accent, kind: o.kind, purpose: p.purpose || o.desc,
    source: "basket", contractRef: null, eligible, decl: p.decl,
    reason: p.side === wantSide ? p.reason : (need === "service" ? "Not a service offer that consumes personal data" : "Not a personal-data dataset"),
    reasonHint: p.reasonHint || (need === "service"
      ? "Only a service offer with a complete processor declaration can process this dataset."
      : "Only a dataset that declares personal data needs to be paired with this service."),
  };
};

// pairKey — canonical, so the same pair is one entry whichever side you assign from.
const pairKey = (dataId, svcId) => `${dataId}::${svcId}`;
const splitKey = (k) => { const [d, s] = k.split("::"); return { dataId: d, svcId: s }; };

function buildTasks(basketOffers, opts) {
  const o = opts || {};
  const projectPool = o.projectPool !== "none" && !o.newProject;
  const projSvcs = projectPool ? PROJECT_SERVICES : [];
  const projData = projectPool ? PROJECT_DATA : [];
  const piiOffers = basketOffers.filter(isPiiOffer);
  return piiOffers.map((anchor) => {
    const need = isController(anchor) ? "service" : "data";
    const p = profileOf(anchor);
    const project = (need === "service" ? projSvcs : projData).map((x) => candFromProject(x, need));
    const basket = basketOffers.filter((x) => x.id !== anchor.id).map((x) => candFromBasket(x, need));
    const all = [...project, ...basket];
    // A blocked anchor (its own declaration is incomplete) can pair with nothing.
    const blocked = !eligibleProfile(p);
    if (blocked) all.forEach((c) => { c.eligible = false; });
    return {
      id: anchor.id, anchor, need, side: p.side, decl: p.decl,
      blocked, blockedReason: p.reason, blockedHint: p.reasonHint,
      project, basket, all, eligible: all.filter((c) => c.eligible),
    };
  });
}
// Every offer the recap may need to name.
function offerIndex(basketOffers) {
  const m = new Map();
  [...basketOffers, ...PROJECT_SERVICES, ...PROJECT_DATA].forEach((o) => m.set(o.id, o));
  return m;
}
// Pair list + what each pair produces on confirm.
function pairsOf(keys, basketOffers) {
  const idx = offerIndex(basketOffers);
  const inBasket = new Set(basketOffers.map((o) => o.id));
  return keys.map((k) => {
    const { dataId, svcId } = splitKey(k);
    const data = idx.get(dataId), svc = idx.get(svcId);
    if (!data || !svc) return null;
    const dataRef = inBasket.has(dataId) ? null : (data.contractRef || null);
    const svcRef = inBasket.has(svcId) ? null : (svc.contractRef || null);
    const refs = [dataRef, svcRef].filter(Boolean);
    // A pair opens a NEW contract as soon as one side is still uncontracted (in the
    // basket). refs then only say which live contract additionally receives the rider.
    const isNew = inBasket.has(dataId) || inBasket.has(svcId);
    return { key: k, data, svc, dataRef, svcRef, refs, outcome: isNew ? "new" : "amendment" };
  }).filter(Boolean);
}
function stats(tasks, keys, basketOffers) {
  const pairs = pairsOf(keys, basketOffers);
  const done = tasks.filter((t) => !t.blocked && keys.some((k) => k.includes(t.id))).length;
  const open = tasks.filter((t) => !t.blocked && t.eligible.length > 0 && !keys.some((k) => k.includes(t.id)));
  const blocked = tasks.filter((t) => t.blocked || t.eligible.length === 0);
  return {
    pairs, done, total: tasks.length, open, blocked,
    newCount: pairs.filter((p) => p.outcome === "new").length,
    amendRefs: Array.from(new Set(pairs.flatMap((p) => p.refs))),
    ready: tasks.length > 0 && open.length === 0 && blocked.length === 0 && pairs.length > 0,
  };
}
const declOf = (c) => c.decl || [];

// ─── SHARED BITS ───────────────────────────────────────────────────────────
function Mono({ offer, size = 26 }) {
  return <div className="bk-mono" style={{ width: size, height: size, background: `linear-gradient(135deg, ${hexToRgba(offer.accent, 0.9)}, ${hexToRgba(offer.accent, 0.55)})` }} aria-hidden="true">{initials(offer.name)}</div>;
}
const SideTag = ({ side }) => side === "controller"
  ? <span className="pii-role-tag ctrl"><Icon name="database" size={11} /> Dataset · controller</span>
  : <span className="pii-role-tag proc"><Icon name="layers" size={11} /> Service · processor</span>;
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

// ─── CANDIDATE ROW ─────────────────────────────────────────────────────────
function CandidateRow({ cand, selected, onToggle }) {
  const ok = cand.eligible;
  const live = cand.source === "project" && !!cand.contractRef;
  return (
    <button type="button" className={`pii-svc compact ${selected ? "sel" : ""} ${ok ? "" : "off"}`} disabled={!ok}
      aria-pressed={ok ? selected : undefined} onClick={() => ok && onToggle(cand.id)}>
      <span className="pii-radio box" aria-hidden="true"><i><Icon name="check" size={13} /></i></span>
      <span className="pii-svc-body">
        <span className="pii-svc-top">
          <Mono offer={cand} size={24} />
          <span className="pii-svc-name">{cand.name}</span>
          <span className="pii-svc-by">by {cand.provider}</span>
          <span className="pii-svc-src"><Icon name={cand.source === "project" ? "folder" : "cart"} size={11} /> {cand.source === "project" ? "In project" : "In basket"}</span>
          {live && <span className="pii-live"><i></i> {cand.contractRef}</span>}
        </span>
        <span className="pii-svc-purpose">{cand.purpose}</span>
        {!ok && <span className="pii-reason"><Icon name="triggers" size={13} /><span><b>{cand.reason}.</b> {cand.reasonHint}</span></span>}
      </span>
      <span className="pii-svc-side">
        {ok
          ? (live
            ? <span className="pii-usetag basket"><Icon name="triggers" size={10} /> New contract + rider</span>
            : <span className="pii-usetag basket"><Icon name="triggers" size={10} /> New negotiation</span>)
          : <span className="bk-st st-gap"><Icon name="lock" size={10} /> Not eligible</span>}
      </span>
    </button>
  );
}

// ─── ONE PAIRING TASK ──────────────────────────────────────────────────────
function TaskCard({ task, keys, onToggle, open, onOpen, projectName, newProject, onRemoveOffer }) {
  const [tab, setTab] = useState(task.project.some((c) => c.eligible) ? "project" : "basket");
  const [q, setQ] = useState("");
  const mine = keys.filter((k) => k.includes(task.id)).map((k) => { const { dataId, svcId } = splitKey(k); return task.need === "service" ? svcId : dataId; });
  const chosen = task.all.filter((c) => mine.includes(c.id));
  const blocked = task.blocked || task.eligible.length === 0;
  const list = (tab === "project" ? task.project : task.basket).filter((c) => !q || (c.name + c.provider).toLowerCase().includes(q.toLowerCase()));
  const needLabel = task.need === "service" ? "service offer" : "dataset";
  const status = task.blocked
    ? <span className="bk-st st-gap"><Icon name="lock" size={10} /> Declaration incomplete</span>
    : task.eligible.length === 0
      ? <span className="bk-st st-gap"><Icon name="triggers" size={10} /> No pairing possible</span>
      : chosen.length
        ? <span className="bk-st st-ok"><Icon name="check" size={10} /> {chosen.length} {needLabel}{chosen.length > 1 ? "s" : ""} assigned</span>
        : <span className="pii-task-todo"><Icon name="hourglass" size={10} /> To assign</span>;

  return (
    <section className={`pii-task ${open ? "open" : ""} ${blocked ? "blocked" : chosen.length ? "done" : "todo"}`}>
      <button type="button" className="pii-task-head" aria-expanded={open} onClick={onOpen}>
        <Mono offer={task.anchor} size={34} />
        <span className="pii-task-tx">
          <span className="pii-task-name">{task.anchor.name}</span>
          <span className="pii-task-meta"><SideTag side={task.side} /><span className="pii-task-by">by {task.anchor.provider}</span></span>
        </span>
        <span className="pii-task-status">{status}</span>
        <span className="pii-task-chev"><Icon name={open ? "chevronUp" : "chevronDown"} size={16} /></span>
      </button>

      {open && (
        <div className="pii-task-body">
          <p className="pii-task-lead">
            {task.need === "service"
              ? <>This dataset contains personal data. Pick every <b>service offer</b> that will process it — one contract per pairing, and <b>{task.anchor.provider}</b>'s declaration carries into each one unchanged.</>
              : <>This service processes personal data. Pick every <b>dataset</b> it will consume — the controller's declaration is attached to each pairing and cannot be edited.</>}
          </p>

          {task.blocked ? (
            <div className="pii-empty">
              <div className="pii-empty-ic"><Icon name="lock" size={22} /></div>
              <h3>{task.blockedReason || "Personal-data declaration incomplete"}</h3>
              <p>{task.blockedHint} Nothing can be paired until the provider completes and republishes it.</p>
              <div className="pii-empty-actions">
                <button type="button" className="bk-btn" onClick={() => onRemoveOffer(task.anchor.id)}><Icon name="trash" size={14} /> Remove this offer from the basket</button>
              </div>
            </div>
          ) : task.eligible.length === 0 ? (
            <div className="pii-empty">
              <div className="pii-empty-ic"><Icon name="triggers" size={22} /></div>
              <h3>No eligible {needLabel} to pair with</h3>
              <p>
                {task.need === "service"
                  ? <>Nothing in {newProject ? "your new project" : <b>{projectName}</b>} or in this basket both processes personal data and has a complete processor declaration.</>
                  : <>Neither {newProject ? "your new project" : <b>{projectName}</b>} nor this basket holds a dataset that declares personal data.</>}
                {" "}Add one to continue, or remove this offer from the basket.
              </p>
              <div className="pii-empty-actions">
                <a className="bk-confirm" href="Catalogue.html"><Icon name="plus" size={15} /> Find {task.need === "service" ? "a service offer" : "a dataset"}</a>
                <button type="button" className="bk-btn" onClick={() => onRemoveOffer(task.anchor.id)}><Icon name="trash" size={14} /> Remove from basket</button>
              </div>
              {task.all.length > 0 && (
                <div className="pii-blockedlist">
                  <div className="pii-blockedlist-h">Why the {task.all.length} candidate{task.all.length !== 1 ? "s" : ""} {task.all.length !== 1 ? "were" : "was"} ruled out</div>
                  {task.all.map((c) => <div className="pii-blockedrow" key={c.id}><Icon name="x" size={11} /><b>{c.name}</b> — {c.reason}.</div>)}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="pii-tabrow">
                <div className="seg2 pii-tabs">
                  <button type="button" className={tab === "project" ? "active teal" : ""} onClick={() => setTab("project")}>
                    <Icon name="folder" size={14} /> {newProject ? "New project" : projectName} <span className="pii-tab-count">{task.project.length}</span>
                  </button>
                  <button type="button" className={tab === "basket" ? "active teal" : ""} onClick={() => setTab("basket")}>
                    <Icon name="cart" size={14} /> This basket <span className="pii-tab-count">{task.basket.length}</span>
                  </button>
                </div>
                {(tab === "project" ? task.project : task.basket).length > 5 && (
                  <label className="pii-search"><Icon name="search" size={13} /><input value={q} placeholder="Filter by name or provider" onChange={(e) => setQ(e.target.value)} /></label>
                )}
              </div>

              {chosen.length > 0 && (
                <div className="pii-selbar">
                  <span className="pii-selbar-k"><Icon name="layers" size={13} /> {chosen.length} assigned</span>
                  <span className="pii-selbar-chips">
                    {chosen.map((c) => (
                      <span key={c.id} className="pii-selchip">{c.name}
                        <button type="button" aria-label={`Remove ${c.name}`} onClick={(e) => { e.stopPropagation(); onToggle(task, c.id); }}><Icon name="x" size={11} /></button>
                      </span>
                    ))}
                  </span>
                </div>
              )}

              {list.length === 0 ? (
                <div className="pii-nores"><Icon name="info" size={13} /> {q ? "No candidate matches this filter." : tab === "project" ? "This project holds no candidate — switch to the basket tab." : "This basket holds no other candidate — switch to the project tab."}</div>
              ) : (
                <div className="pii-list">
                  {list.map((c) => <CandidateRow key={c.id} cand={c} selected={mine.includes(c.id)} onToggle={(id) => onToggle(task, id)} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ─── ASSIGN STEP ───────────────────────────────────────────────────────────
function PiiAssignStep({ tasks, keys, onToggle, s, projectName, newProject, onRemoveOffer }) {
  const firstOpen = (s.open.length ? s.open[0] : (s.blocked.length ? s.blocked[0] : tasks[0]));
  const [openId, setOpenId] = useState(firstOpen ? firstOpen.id : null);
  const single = tasks.length === 1;
  return (
    <>
      <div className="pii-notice">
        <span className="pii-notice-ic"><Icon name="shield" size={19} /></span>
        <div>
          <h3>Personal data can only be shared for a declared purpose</h3>
          <p>Under the GDPR a dataset of personal data is disclosed only to a service acting as processor on documented instructions. Each pairing below becomes its own contract, and both sides' personal-data terms carry into it as-is — <b>they cannot be negotiated or edited</b>.</p>
        </div>
      </div>

      {!single && (
        <div className="pii-prog">
          <span className="pii-prog-k"><Icon name="layers" size={13} /> Pairings</span>
          <span className="pii-prog-bar"><i style={{ width: `${Math.round((s.done / s.total) * 100)}%` }} /></span>
          <span className="pii-prog-v"><b>{s.done}</b> of {s.total} personal-data offer{s.total !== 1 ? "s" : ""} assigned</span>
          {s.pairs.length > 0 && <span className="pii-prog-tag"><Icon name="check" size={11} /> {s.pairs.length} pair{s.pairs.length !== 1 ? "s" : ""}</span>}
          {s.blocked.length > 0 && <span className="pii-prog-tag warn"><Icon name="triggers" size={11} /> {s.blocked.length} blocked</span>}
        </div>
      )}

      <div className="pii-tasks">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} keys={keys} onToggle={onToggle} projectName={projectName} newProject={newProject} onRemoveOffer={onRemoveOffer}
            open={single || openId === t.id} onOpen={() => setOpenId(openId === t.id ? null : t.id)} />
        ))}
      </div>
    </>
  );
}

// ─── CONFIRM BLOCK ─────────────────────────────────────────────────────────
// Grouped by dataset — the legally meaningful unit: for this personal data, these
// processors, under these locked terms.
function PiiConfirmBlock({ s }) {
  const groups = useMemo(() => {
    const m = new Map();
    s.pairs.forEach((p) => {
      if (!m.has(p.data.id)) m.set(p.data.id, { data: p.data, dataRef: p.dataRef, pairs: [] });
      m.get(p.data.id).pairs.push(p);
    });
    return Array.from(m.values());
  }, [s.pairs]);
  if (!groups.length) return null;
  const dataDecl = (o) => (PROFILE[o.id] && PROFILE[o.id].decl) || o.decl || [];
  return (
    <div className="bk-confirm-wrap pii-confirm">
      <div className="bk-sec-title" style={{ marginBottom: 10 }}>
        <Icon name="shield" size={18} /> Personal data
        <span className="pii-lockbadge" style={{ marginLeft: 8 }}><Icon name="lock" size={11} /> Terms locked</span>
      </div>
      <div className="bk-banner review">
        <Icon name="shield" size={16} />
        <span>
          <b>{s.pairs.length} dataset ⇄ service pairing{s.pairs.length !== 1 ? "s" : ""}</b> across {groups.length} dataset{groups.length !== 1 ? "s" : ""}:
          {" "}{s.newCount > 0 ? <>{s.newCount} new negotiation{s.newCount !== 1 ? "s" : ""}</> : "no new negotiation"}
          {s.amendRefs.length > 0 && <>, and a personal-data rider on {s.amendRefs.length} live contract{s.amendRefs.length !== 1 ? "s" : ""} ({s.amendRefs.join(", ")})</>}.
        </span>
      </div>

      {groups.map((g) => (
        <div className="bk-review-offer" key={g.data.id}>
          <div className="bk-offer-top">
            <Mono offer={g.data} size={38} />
            <div className="bk-offer-main">
              <div className="bk-offer-meta">
                <SideTag side="controller" />
                <span className="bk-offer-by">by {g.data.provider}</span>
                {g.dataRef && <span className="pii-usetag project"><Icon name="folder" size={11} /> Live contract {g.dataRef}</span>}
              </div>
              <h3 className="bk-offer-name sm">{g.data.name}</h3>
            </div>
            <span className="pii-lockbadge"><Icon name="lock" size={11} /> Locked</span>
          </div>
          <CollapseBlock title="Controller declaration" sub={`Published by ${g.data.provider}. Carried into every pairing as-is.`} count={dataDecl(g.data).length}>
            <div className="pii-grid">{dataDecl(g.data).map((r) => <Row key={r.k} k={r.k} v={r.v} wide={r.wide} />)}</div>
          </CollapseBlock>

          <div className="pii-assigned">
            <div className="pii-assigned-head">
              <Icon name="layers" size={13} /> Authorised processors
              <span className="pii-assigned-count">{g.pairs.length}</span>
              <span className="pii-assigned-sub">Service offers allowed to process this dataset.</span>
            </div>
            <div className="pii-pairs">
              {g.pairs.map((p) => (
                <div className="pii-pair" key={p.key}>
                  <span className="pii-pair-main">
                    <Mono offer={p.svc} size={26} />
                    <span className="pii-pair-tx">
                      <span className="pii-pair-name">{p.svc.name}</span>
                      <span className="pii-pair-by">by {p.svc.provider} · {p.svc.purpose}</span>
                    </span>
                  </span>
                  <span className={`pii-usetag ${p.outcome === "amendment" ? "project" : "basket"}`}>
                    <Icon name={p.outcome === "amendment" ? "edit" : "triggers"} size={11} />
                    {p.outcome === "amendment"
                      ? `Rider on ${p.refs.join(", ")}`
                      : p.refs.length ? `New negotiation + rider on ${p.refs.join(", ")}` : "New negotiation on confirm"}
                  </span>
                  <span className="pii-pair-decl">
                    <CollapseBlock icon="lock" title="Processor declaration" sub={`Declared by ${p.svc.provider}.`} count={declOf(p.svc).length}>
                      <div className="pii-grid">{declOf(p.svc).map((r) => <Row key={r.k} k={r.k} v={r.v} wide={r.wide} />)}</div>
                    </CollapseBlock>
                  </span>
                </div>
              ))}
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

window.BK4PII2 = { PROFILE, EXTRA_ITEMS, PROJECT_SERVICES, PROJECT_DATA, isPiiOffer, isController, isProcessor, buildTasks, pairsOf, pairKey, splitKey, stats, PiiAssignStep, PiiConfirmBlock };
})();
