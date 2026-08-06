// VisionsTrust — My Projects data (list + ecosystem detail + exit flow)
(function() {

const ORG = {
  serviceprovider: { id: "serviceprovider", name: "ServiceProvider", org: "TECHNÉ",  color: "#0e7490" },
  jojo:            { id: "jojo",            name: "Jojo Dhoe",       org: "LUCE",    color: "#b23a48" },
  dataprovider:    { id: "dataprovider",    name: "DataProvider",    org: "REJUSTIFY", color: "#6d5ae0" },
  orchdsuc:        { id: "orchdsuc",        name: "OrchestratorDSUC", org: "DSUC",   color: "#b7791f" },
  casadata:        { id: "casadata",        name: "CasaData",        org: "CASA",    color: "#0a8a5c" },
};

// ─── PROJECT LIST ────────────────────────────────────────────────────────────
const PROJECTS = [
  { id: "p1",  name: "SERVICE_PROVIDER_DSUC_CHAIN", group: "initiated", status: "published", created: "2025-03-14",
    desc: "Mutualised skills & training data ecosystem powering VR learning analytics.",
    useCases: ["Mutualise data to train AI", "VR learning analytics"],
    partners: ["jojo", "dataprovider", "orchdsuc", "casadata"], chains: 3, featured: true },
  { id: "p2",  name: "SERVICE_PROVIDER_DSUC", group: "initiated", status: "published", created: "2024-09-11",
    desc: "Reference data space use case for service providers.",
    useCases: ["Mutualise data to train AI"], partners: ["jojo", "dataprovider", "orchdsuc"], chains: 2 },
  { id: "p3",  name: "SERVICE_PROVIDER_DSUC_1", group: "initiated", status: "published", created: "2024-09-16",
    desc: "Matching offers sandbox for the DSUC pilot.", useCases: ["VR learning analytics"], partners: ["jojo", "dataprovider"], chains: 1 },
  { id: "p4",  name: "SERVICE_PROVIDER_DSUC_2", group: "initiated", status: "published", created: "2024-09-16",
    desc: "Second DSUC pilot iteration.", useCases: ["VR learning analytics"], partners: ["jojo", "dataprovider", "orchdsuc"], chains: 1 },
  { id: "p5",  name: "SERVICE_PROVIDER_DSUC_3", group: "initiated", status: "published", created: "2024-09-18",
    desc: "Third DSUC pilot iteration.", useCases: ["Mutualise data to train AI"], partners: ["jojo", "orchdsuc", "casadata"], chains: 0 },
  { id: "p6",  name: "dsuc_default_offer", group: "initiated", status: "published", created: "2026-01-21",
    desc: "Default offer template ecosystem.", useCases: ["Mutualise data to train AI"], partners: ["dataprovider", "casadata"], chains: 0 },
  { id: "p7",  name: "pre_custom", group: "initiated", status: "draft", created: "2026-01-21",
    desc: "Custom pre-configuration draft.", useCases: [], partners: ["jojo"], chains: 0 },
  { id: "p8",  name: "demo_catalog_casa", group: "initiated", status: "pending", created: "2026-04-03",
    desc: "Casa catalogue demonstration.", useCases: ["VR learning analytics"], partners: [], chains: 0 },
  { id: "p9",  name: "delete_dsuc", group: "initiated", status: "archived", created: "2026-04-03",
    desc: "Deprecated test ecosystem.", useCases: [], partners: ["dataprovider", "orchdsuc"], chains: 0 },
  { id: "p10", name: "AI_MUTUALISATION_COMMONS", group: "joined", status: "published", created: "2025-06-02",
    desc: "Cross-sector commons for AI training data, orchestrated by OrchestratorDSUC.",
    useCases: ["Mutualise data to train AI"], partners: ["orchdsuc", "jojo", "casadata"], chains: 2, orchestrator: "orchdsuc" },
  { id: "p11", name: "VR_LEARNING_ANALYTICS_NET", group: "joined", status: "published", created: "2025-11-19",
    desc: "VR learning analytics network, orchestrated by Jojo Dhoe.",
    useCases: ["VR learning analytics"], partners: ["jojo", "dataprovider", "orchdsuc", "casadata"], chains: 4, orchestrator: "jojo" },
  { id: "p12", name: "casa_dsuc", group: "joined", status: "pending", created: "2026-04-28",
    desc: "Casa data sharing pilot — membership awaiting validation.", useCases: [], partners: ["casadata"], chains: 0, orchestrator: "casadata" },
];

const STATUS_META = {
  published: { label: "Published", tone: "success", icon: "globe" },
  draft:     { label: "Draft",     tone: "default", icon: "pen" },
  pending:   { label: "Pending",   tone: "warn",    icon: "hourglass" },
  archived:  { label: "Archived",  tone: "default", icon: "archive" },
};

// ─── ECOSYSTEM DETAIL (SERVICE_PROVIDER_DSUC_CHAIN) ─────────────────────────
const ECO = {
  name: "SERVICE_PROVIDER_DSUC_CHAIN",
  status: "published",
  created: "2025-03-14",
  contractId: "66e163de418a38509ee1e0a4",
  desc: "Shared data ecosystem mutualising skills & training data between providers to power VR learning analytics and AI training use cases.",
  useCases: ["Mutualise data to train AI", "VR learning analytics"],
  orchestrator: "serviceprovider",
  participants: [
    { org: "serviceprovider", roles: ["Orchestrator"], joined: "2025-03-14",
      offers: [
        { id: "o1", name: "SERVICE_DEMO_SERVICE_PROVIDER_NO_RESTRICTION", type: "Service", oid: "65d8e9983e14bca0847c7ef5",
          desc: "Demo service offering exposed to the project without usage restrictions.",
          policy: { name: "No restrictions", desc: "CAN use data without any restrictions" },
          pricing: "0 EUR · One shot",
          resources: [{ name: "SERVICE_DEMO_SERVICE_PROVIDER_NO_RESTRICTION", rid: "65d8e98b3e14bca0847c7ee8" }] },
        { id: "o2", name: "SERVICE_DEMO_SERVICE_TRAINING_MATCHING", type: "Service", oid: "65d8e9a13e14bca0847c7f02",
          desc: "Matching service for training datasets.",
          policy: { name: "Purpose limitation", desc: "CAN use data for training & matching purposes only" },
          pricing: "120 EUR · Monthly",
          resources: [{ name: "TRAINING_MATCHING_ENGINE", rid: "65d8e9aa3e14bca0847c7f11" }] },
        { id: "o3", name: "SERVICE_PORVIDER_DATA_JOB_OFFERS", type: "Data", oid: "65d8e9b23e14bca0847c7f1c",
          desc: "Job offers dataset, refreshed weekly.",
          policy: { name: "No re-sharing", desc: "CANNOT share data with third parties outside the project" },
          pricing: "0.02 EUR · per API call",
          resources: [{ name: "JOB_OFFERS_FEED", rid: "65d8e9bb3e14bca0847c7f28" }] },
        { id: "o4", name: "service_test", type: "Service", oid: "65d8e9c43e14bca0847c7f33",
          desc: "Sandbox service used for chain validation.",
          policy: { name: "No restrictions", desc: "CAN use data without any restrictions" },
          pricing: "0 EUR · One shot", resources: [] },
      ] },
    { org: "jojo", roles: ["Infrastructure Provider"], joined: "2025-03-20",
      offers: [
        { id: "o5", name: "test_without_context", type: "Service", oid: "6612aa013e14bca0847d0a41",
          desc: "Context-free processing service.",
          policy: { name: "No restrictions", desc: "CAN use data without any restrictions" },
          pricing: "50 EUR · One shot", resources: [] },
        { id: "o6", name: "infra_6", type: "Infrastructure", oid: "6612aa0c3e14bca0847d0a4d",
          desc: "Hosting & compute for chain workloads (SLA 99.5%).",
          policy: { name: "Processing only", desc: "Data transits for processing — no retention beyond 30 days" },
          pricing: "300 EUR · Monthly",
          resources: [{ name: "COMPUTE_CLUSTER_EU_WEST", rid: "6612aa153e14bca0847d0a58" }] },
      ] },
    { org: "dataprovider", roles: ["Data Provider — personal data", "Data Provider — organisational data"], joined: "2025-04-02",
      offers: [
        { id: "o7", name: "billing_offer_test", type: "Data", oid: "66a1c2e93e14bca0847d1195",
          desc: "Learner activity dataset with billing terms.",
          policy: { name: "Purpose limitation", desc: "Personal data CAN only be used for skill analytics within the project" },
          pricing: "1 EUR · One shot · 3 EUR setup · 0.05 EUR / API call",
          resources: [{ name: "DATA_DEMO_DATA_PROVIDER_NO_RESTRICTION", rid: "66a1c2f83e14bca0847d11a2" }] },
        { id: "o7b", name: "learner_events_stream", type: "Data", oid: "66a1c3153e14bca0847d11c7",
          desc: "Real-time stream of learner interaction events.",
          policy: { name: "Purpose limitation", desc: "CAN use events for progress analytics only — no profiling" },
          pricing: "80 EUR · Monthly",
          resources: [{ name: "LEARNER_EVENTS_V2", rid: "66a1c3223e14bca0847d11d4" }] },
        { id: "o7c", name: "org_profiles_dataset", type: "Data", oid: "66a1c3313e14bca0847d11e0",
          desc: "Organisational profiles reference dataset.",
          policy: { name: "No re-sharing", desc: "CANNOT share data with third parties outside the project" },
          pricing: "0 EUR · One shot",
          resources: [{ name: "ORG_PROFILES_2025", rid: "66a1c33a3e14bca0847d11ec" }] },
      ] },
    { org: "orchdsuc", roles: ["Service Provider — organisations", "Service Provider — individuals"], joined: "2025-04-10",
      offers: [
        { id: "o8", name: "Learner skill matching", type: "Service", oid: "66b3d4053e14bca0847d2201",
          desc: "Matches learner profiles to skill frameworks.",
          policy: { name: "Output sharing", desc: "Matching output CAN be shared within the project only" },
          pricing: "250 EUR · Quarterly",
          resources: [{ name: "SKILL_MATCHING_API", rid: "66b3d40e3e14bca0847d220c" }] },
      ] },
    { org: "casadata", roles: ["Data Provider — organisational data"], joined: "2025-05-06",
      offers: [
        { id: "o9", name: "casa_learning_records", type: "Data", oid: "66c9e1123e14bca0847d3310",
          desc: "Anonymised learning records from Casa campuses.",
          policy: { name: "Anonymised only", desc: "CAN use anonymised records — re-identification is prohibited" },
          pricing: "0 EUR · One shot",
          resources: [{ name: "LEARNING_RECORDS_2025", rid: "66c9e11b3e14bca0847d331b" }] },
      ] },
  ],
  chains: [
    { id: "c1", name: "learner-skill-matching", impacted: true,
      nodes: [
        { org: "dataprovider", offer: "billing_offer_test" },
        { org: "serviceprovider", offer: "SERVICE_DEMO_SERVICE_TRAINING_MATCHING" },
        { org: "orchdsuc", offer: "Learner skill matching" },
      ] },
    { id: "c2", name: "vr-analytics-aggregation", impacted: true,
      nodes: [
        { org: "dataprovider", offer: "billing_offer_test" },
        { org: "jojo", offer: "infra_6" },
        { org: "serviceprovider", offer: "service_test" },
      ] },
    { id: "c3", name: "job-offers-enrichment", impacted: false,
      nodes: [
        { org: "serviceprovider", offer: "SERVICE_PORVIDER_DATA_JOB_OFFERS" },
        { org: "orchdsuc", offer: "Learner skill matching" },
      ] },
    { id: "c4", name: "learner-progress-sync", impacted: false,
      nodes: [
        { org: "dataprovider", offer: "learner_events_stream" },
        { org: "orchdsuc", offer: "Learner skill matching" },
      ] },
  ],
};

// The participant persona for the participant-side page
const ME_PARTICIPANT = "dataprovider";

// ─── EXIT REQUESTS — one request PER OFFER (not per participant) ─────────────
// status:  pending | info_requested  → CURRENT
//          approved | rejected | withdrawn → FINISHED
const EXIT_CURRENT = ["pending", "info_requested", "awaiting_participant"];
const EXIT_FINISHED = ["approved", "rejected", "withdrawn"];
const isCurrent = (s) => EXIT_CURRENT.includes(s);
const isFinished = (s) => EXIT_FINISHED.includes(s);

const EXIT_STATUS_META = {
  pending:        { label: "Pending review", tone: "warn",    icon: "hourglass" },
  awaiting_participant: { label: "Awaiting participant", tone: "primary", icon: "hourglass" },
  info_requested: { label: "Info requested", tone: "primary", icon: "chat" },
  approved:       { label: "Approved",       tone: "success", icon: "check" },
  rejected:       { label: "Rejected",       tone: "danger",  icon: "x" },
  withdrawn:      { label: "Withdrawn",      tone: "default", icon: "archive" },
};

// process-log event metadata (used by timelines / history)
const EXIT_EVENT_META = {
  submitted:          { icon: "upload",    label: "Exit request submitted" },
  initiated:          { icon: "danger",    label: "Exit proposed by orchestrator" },
  accepted:           { icon: "check",     label: "Exit accepted by participant" },
  declined:           { icon: "x",         label: "Exit declined by participant" },
  info_requested:     { icon: "chat",      label: "More information requested" },
  replied:            { icon: "chat",      label: "Participant replied" },
  approved:           { icon: "check",     label: "Exit approved" },
  rejected:           { icon: "x",         label: "Request rejected" },
  withdrawn:          { icon: "archive",   label: "Request withdrawn" },
  chains_deactivated: { icon: "layers",    label: "Related chains invalidated & deactivated" },
};

const EXIT_REASONS = [
  "Strategic re-orientation",
  "End of data-sharing agreement internally",
  "Compliance / legal constraint",
  "Costs vs. value not aligned",
  "Other",
];

// Pre-existing history so the tables aren't empty.
// The live-demo request (dataprovider / billing_offer_test) is intentionally absent —
// the participant creates it during the guided demo.
const EXIT_SEED = [
  { id: "ER-112", org: "jojo", offer: "infra_6", offerType: "Infrastructure",
    status: "pending", reasonCategory: "Costs vs. value not aligned",
    reason: "Compute costs no longer justified by our usage of this ecosystem.",
    submittedAt: "2026-07-08", noticeDays: 30, effectiveDate: "2026-08-07",
    orchMessage: "", reply: "", decidedAt: "",
    log: [{ at: "2026-07-08", actor: "participant", event: "submitted" }] },
  { id: "ER-104", org: "dataprovider", offer: "org_profiles_dataset", offerType: "Data",
    status: "approved", reasonCategory: "Strategic re-orientation",
    reason: "This dataset is being deprecated internally.",
    submittedAt: "2026-06-10", noticeDays: 30, effectiveDate: "2026-07-10", decidedAt: "2026-06-13",
    orchMessage: "", reply: "",
    log: [
      { at: "2026-06-10", actor: "participant",  event: "submitted" },
      { at: "2026-06-13", actor: "orchestrator", event: "approved", note: "No dependent chains — approved with 30-day notice." },
    ] },
  { id: "ER-098", org: "dataprovider", offer: "learner_events_stream", offerType: "Data",
    status: "withdrawn", reasonCategory: "Other",
    reason: "Submitted by mistake — kept in the project.",
    submittedAt: "2026-05-22", noticeDays: 30, effectiveDate: "", decidedAt: "2026-05-23",
    orchMessage: "", reply: "",
    log: [
      { at: "2026-05-22", actor: "participant", event: "submitted" },
      { at: "2026-05-23", actor: "participant", event: "withdrawn", note: "Withdrawn by the participant before decision." },
    ] },
  { id: "ER-101", org: "casadata", offer: "casa_learning_records", offerType: "Data",
    status: "approved", reasonCategory: "Compliance / legal constraint",
    reason: "New retention policy prevents sharing these records.",
    submittedAt: "2026-05-30", noticeDays: 60, effectiveDate: "2026-07-29", decidedAt: "2026-06-04",
    orchMessage: "Can you confirm the retention deadline?", reply: "Confirmed — 29 July 2026.",
    log: [
      { at: "2026-05-30", actor: "participant",  event: "submitted" },
      { at: "2026-06-02", actor: "orchestrator", event: "info_requested", note: "Can you confirm the retention deadline?" },
      { at: "2026-06-03", actor: "participant",  event: "replied", note: "Confirmed — 29 July 2026." },
      { at: "2026-06-04", actor: "orchestrator", event: "approved", note: "Approved with 60-day notice." },
    ] },
  { id: "ER-087", org: "jojo", offer: "test_without_context", offerType: "Service",
    status: "rejected", reasonCategory: "Strategic re-orientation",
    reason: "Reprioritising our service catalogue.",
    submittedAt: "2026-04-18", noticeDays: 30, effectiveDate: "", decidedAt: "2026-04-22",
    orchMessage: "Active consumers depend on this service until end of Q2 — please resubmit later.", reply: "",
    log: [
      { at: "2026-04-18", actor: "participant",  event: "submitted" },
      { at: "2026-04-22", actor: "orchestrator", event: "rejected", note: "Active consumers depend on this service until end of Q2 — please resubmit later." },
    ] },
];

const EXIT_KEY = "vt.exitReq.v2";
const clone = (x) => JSON.parse(JSON.stringify(x));

function loadRequests() {
  try { const s = localStorage.getItem(EXIT_KEY); return s ? JSON.parse(s) : clone(EXIT_SEED); }
  catch (e) { return clone(EXIT_SEED); }
}
function saveRequests(a) { try { localStorage.setItem(EXIT_KEY, JSON.stringify(a)); } catch (e) {} }

const TODAY = "2026-07-10";
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

// React hook — collection of requests, shared across both persona pages
function useExitRequests() {
  const [reqs, setReqs] = React.useState(loadRequests);
  React.useEffect(() => {
    const onStorage = (e) => { if (e.key === EXIT_KEY) setReqs(loadRequests()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const persist = React.useCallback((a) => { setReqs(a); saveRequests(a); }, []);

  const api = React.useMemo(() => ({
    create: (r) => {
      let created;
      setReqs(prev => {
        const id = "ER-" + (200 + prev.length + 1);
        created = { id, status: "pending", noticeDays: 30, orchMessage: "", reply: "", decidedAt: "",
          effectiveDate: addDays(TODAY, 30), submittedAt: TODAY,
          log: [{ at: TODAY, actor: "participant", event: "submitted" }], ...r };
        const next = [created, ...prev];
        saveRequests(next);
        return next;
      });
      return created;
    },
    update: (id, patch, logEntry) => {
      setReqs(prev => {
        const next = prev.map(r => r.id === id
          ? { ...r, ...patch, log: logEntry ? [...(r.log || []), { at: TODAY, ...logEntry }] : r.log }
          : r);
        saveRequests(next);
        return next;
      });
    },
    reset: () => persist(clone(EXIT_SEED)),
    // demo helper — force the live request (dataprovider / billing_offer_test) into a chosen state
    setLive: (status) => {
      setReqs(prev => {
        const rest = prev.filter(r => !(r.org === "dataprovider" && r.offer === "billing_offer_test"));
        let next = rest;
        if (status && status !== "none") {
          next = [buildLive(status), ...rest];
        }
        saveRequests(next);
        return next;
      });
    },
  }), [persist]);

  return [reqs, api];
}

// Build a synthetic "live demo" request for billing_offer_test in a given state
function buildLive(status) {
  const base = {
    id: "ER-DEMO", org: "dataprovider", offer: "billing_offer_test", offerType: "Data",
    reasonCategory: "Strategic re-orientation",
    reason: "We are refocusing our data products and will stop maintaining this offer.",
    submittedAt: TODAY, noticeDays: 30, effectiveDate: addDays(TODAY, 30),
    orchMessage: "", reply: "", decidedAt: "",
    log: [{ at: TODAY, actor: "participant", event: "submitted" }],
    status,
  };
  const infoNote = "Could you confirm no active consumers depend on billing_offer_test this quarter?";
  const rejectNote = "Active consumers depend on your offer until the end of Q3 — please resubmit with a later exit window.";
  if (status === "awaiting_participant") {
    base.initiatedBy = "orchestrator";
    base.reasonCategory = "Strategic re-orientation";
    base.reason = "We are consolidating billing data sources and propose to withdraw this offer.";
    base.log = [{ at: TODAY, actor: "orchestrator", event: "initiated", note: `Exit proposed by the orchestrator — awaiting the participant's validation (proposed effective ${fmtDate(base.effectiveDate)}).` }];
  } else if (status === "info_requested") {
    base.orchMessage = infoNote;
    base.log.push({ at: TODAY, actor: "orchestrator", event: "info_requested", note: infoNote });
  } else if (status === "approved") {
    base.decidedAt = TODAY;
    base.log.push({ at: TODAY, actor: "orchestrator", event: "approved", note: `Approved with 30-day notice — effective ${fmtDate(base.effectiveDate)}.` });
  } else if (status === "rejected") {
    base.decidedAt = TODAY; base.orchMessage = rejectNote; base.effectiveDate = "";
    base.log.push({ at: TODAY, actor: "orchestrator", event: "rejected", note: rejectNote });
  }
  return base;
}

const impactedChains = (offer) => ECO.chains.filter(c => c.nodes.some(n => n.offer === offer));
const chainsUsing = (offer) => impactedChains(offer).length;
const offersOf = (orgId) => (ECO.participants.find(p => p.org === orgId) || {}).offers || [];

const fmtDate = (iso) => iso ? new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtLong = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const initials = (n) => n.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "·";

window.ProjectsData = {
  ORG, PROJECTS, STATUS_META, ECO, ME_PARTICIPANT,
  EXIT_STATUS_META, EXIT_EVENT_META, EXIT_REASONS, EXIT_SEED,
  EXIT_CURRENT, EXIT_FINISHED, isCurrent, isFinished,
  useExitRequests, loadRequests, saveRequests, TODAY, addDays,
  impactedChains, chainsUsing, offersOf,
  fmtDate, fmtLong, initials,
};
})();
