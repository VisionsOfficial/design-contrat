// VisionsTrust — Basket · PII variant data (23/07).
// A DATA offer that exposes personal data cannot be consumed on its own: it must be
// bound to a SERVICE offer that will process the data. Only service offers that
// (a) declare they consume personal data and (b) have completed their processor-side
// PII declaration are eligible. Everything PII is contract-fixed: never negotiable.
(function () {
const { accentFor } = window.CatData;
const acc = (o) => ({ ...o, accent: accentFor((o.provider || "") + o.name) });

// ─── The personal-data offer sitting in the basket ───────────────────────────
const DATA_OFFER = acc({
  id: "eu_learners_skills_2026", name: "eu_learners_skills_2026", kind: "Data",
  provider: "Education data Provider", org: "EDU",
  desc: "Learner identity, training history and skills profiles, exposed under consent.",
  pricing: "€1 200 / month", billing: "Billed monthly · 12-month term", setup: "€500 one-off setup",
  policies: ["No onward sharing", "EU/EEA processing only", "No re-identification attempt"],
  decision: { mode: "accepted", label: "Accepted as published in step 1" },
});

// Controller-side declaration, published by the data provider. Read-only for the buyer.
const PII_CONTROLLER = [
  { k: "Data controller", v: "Education data Provider SAS" },
  { k: "Legal basis", v: "Consent (Art. 6-1-a)" },
  { k: "Data subjects", v: "Learners / students · Job seekers", wide: true },
  { k: "Data categories", v: "Identity · Contact details · Education & training · Skills & competencies", wide: true },
  { k: "Special categories", v: "None declared" },
  { k: "Retention", v: "Contract duration" },
  { k: "DPO contact", v: "dpo@edu-provider.eu" },
  { k: "Consent withdrawal", v: "Propagated to the service within 24 h" },
];

// ─── The project the basket was assigned to at step 2 ────────────────────────
const PROJECT = { id: "pr1", name: "SERVICE_PROVIDER_DSUC", caption: "Reference data space use case", org: "REJUSTIFY" };
const NEW_PROJECT = { id: "new", name: "SKILLS_MATCHING_PILOT", caption: "New project — created at step 2", org: "NEW" };

// ─── Candidate service offers ────────────────────────────────────────────────
// source: "project" (already in the selected project) | "basket" (added this session)
// Eligible = consumesPII && piiComplete.
const SERVICES = [
  acc({
    id: "svc_matching", name: "job_matching_service", provider: "Techfor", org: "TECHFOR", kind: "Service",
    source: "project", consumesPII: true, piiComplete: true,
    purpose: "Skills-to-vacancy matching",
    role: "Processor",
    operations: "Collection · Storage · Analysis · Profiling",
    subProcessors: "No",
    transfers: "No (EU/EEA only)",
    toms: "Encryption at rest · Encryption in transit · Access control (RBAC) · Audit logging",
    dpa: "Signed",
    retention: "Contract duration, then erasure within 30 days",
    contractRef: "C-2043",
    pricing: "€0.02 / API call", billing: "Billed monthly · usage-based", setup: "No setup fee",
    policies: ["Derived data stays in the project", "No profiling outside matching", "Audit log shared monthly"],
    decision: { mode: "countered", label: "Countered in step 1 · 2 fields" },
  }),
  acc({
    id: "svc_vr", name: "vr_session_player", provider: "Techné", org: "TECHNÉ", kind: "Service",
    source: "project", consumesPII: false, piiComplete: false,
    purpose: "VR session playback and telemetry",
    reason: "Does not consume personal data",
    reasonHint: "This offer declares no personal-data processing, so it cannot receive this dataset.",
  }),
  acc({
    id: "svc_analytics", name: "skills_analytics_service", provider: "Headai", org: "HEADAI", kind: "Service",
    source: "basket", consumesPII: true, piiComplete: true,
    purpose: "Aggregated skills analytics",
    role: "Processor",
    operations: "Collection · Storage · Aggregation / anonymisation",
    subProcessors: "No",
    transfers: "No (EU/EEA only)",
    toms: "Encryption at rest · Encryption in transit · Pseudonymisation · Access control (RBAC)",
    dpa: "Signed",
    retention: "90 days",
    contractRef: null,
    pricing: "€800 / month", billing: "Billed quarterly · 12-month term", setup: "€250 one-off setup",
    policies: ["Aggregated outputs only", "No re-identification attempt", "EU/EEA processing only"],
    decision: { mode: "accepted", label: "Accepted as published in step 1" },
  }),
  acc({
    id: "svc_reco", name: "learning_reco_engine", provider: "Inokufu", org: "INOKUFU", kind: "Service",
    source: "basket", consumesPII: true, piiComplete: false,
    purpose: "Personalised learning recommendations",
    reason: "PII fields missing",
    reasonHint: "Missing: processing purpose, operations, security measures, DPA status.",
  }),
  acc({
    id: "data_infra_2", name: "data_infra_2", provider: "DataProvider", org: "REJUSTIFY", kind: "Infrastructure",
    source: "basket", consumesPII: false, piiComplete: false,
    purpose: "Managed compute & storage",
    reason: "Does not consume personal data",
    reasonHint: "Infrastructure offers cannot be designated as the processor of this dataset.",
  }),
];

// Service terms already settled in step 1 of the basket — carried over, shown read-only.
const CARRIED_TERMS = [
  { k: "Availability", v: "99.9%" },
  { k: "Support hours", v: "Extended 5×12" },
  { k: "Response time", v: "300 ms · p95" },
  { k: "Contract duration", v: "12 months" },
  { k: "Renewal", v: "Automatic renewal" },
  { k: "Termination for convenience", v: "Yes · 30 days notice" },
];

const isEligible = (s) => s.consumesPII && s.piiComplete;

window.BasketPIIData = { DATA_OFFER, PII_CONTROLLER, PROJECT, NEW_PROJECT, SERVICES, CARRIED_TERMS, isEligible };
})();
