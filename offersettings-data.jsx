// VisionsTrust — Offer settings field schema (Documentation fonctionnelle, rows 27–82).
// Each field carries: type, admin-proposed default, options, and whether negotiation applies.
(function () {

// Ordered availability tiers (used so "min acceptable" ranges make sense on select fields)
const AVAILABILITY = ["Best effort", "99%", "99.5%", "99.9%", "99.95%", "99.99%"];
const UPDATE_FREQ = ["Real-time / streaming", "Hourly", "Daily", "Weekly", "Monthly", "Quarterly", "On request", "Static (no update)"];
const SUPPORT_HOURS = ["24/7", "Business hours 5×8", "Extended 5×12"];
const RETENTION = ["Session only", "30 days", "90 days", "1 year", "Contract duration", "Until consent withdrawal"];
const CHANNELS = ["Email", "Phone", "Chat", "Ticketing portal", "Slack", "Community forum", "Dedicated CSM"];
const CONSEQUENCE = ["Service credit", "Discount", "Refund", "Fee waiver", "Suspension", "Termination", "Fixed compensation", "Cure period then escalation"];
const PENALTY_BASIS = ["% of period fee", "% of total value", "Fixed amount", "Credit days", "Amount per incident"];
const PENALTY_CAP = ["% of monthly fee", "% of annual fee", "% of total value", "Fixed cap", "No cap"];
const MEAS_PERIOD = ["Per incident", "Daily", "Weekly", "Monthly", "Quarterly", "Rolling 30 days", "Rolling 90 days", "Contract duration"];
const OPERATORS = ["<", "≤", ">", "≥", "=", "Outside window", "Not delivered"];
const RENEWAL = ["None (contract ends)", "Automatic renewal", "On mutual agreement"];
const REVERSIBILITY = ["None", "Data deletion only", "Return + deletion", "Return + deletion + destruction certificate"];
const COUNTRIES = ["France", "Belgium", "Germany", "Netherlands", "EU-wide"];

// A field descriptor.
//   type: text | textarea | number | numberUnit | select | multiselect | date | yesno | matrix
//   def:  administrator-proposed default value (shape depends on type)
//   neg:  whether this field is negotiable by default (provider can still flip it)
const f = (o) => ({ neg: false, ...o });

const SECTIONS = [
  {
    id: "sla",
    title: "Service levels (SLA)",
    icon: "clock",
    desc: "Commitments on delivery, availability and support. The dataspace proposes a baseline you can adopt or override.",
    fields: [
      f({ id: "delivery_deadline", label: "Delivery deadline", meaning: "Maximum delay before first availability of the resource.",
          type: "numberUnit", units: ["hours", "business days", "calendar days"], def: { n: 5, u: "business days" } }),
      f({ id: "availability", label: "Availability / uptime", meaning: "Guaranteed uptime over the measurement period.",
          type: "select", options: AVAILABILITY, ordered: true, def: "99.5%" }),
      f({ id: "update_frequency", label: "Update frequency", meaning: "How often the data is refreshed or the service updated.",
          type: "select", options: UPDATE_FREQ, def: "Daily" }),
      f({ id: "response_time", label: "Response time", meaning: "Maximum response time of the service or API.",
          type: "numberUnit", units: ["ms", "s"], basis: ["Average", "p95", "p99"], def: { n: 500, u: "ms", b: "p95" } }),
      f({ id: "availability_window", label: "Availability time window", meaning: "Hours during which the resource is guaranteed available.",
          type: "select", options: SUPPORT_HOURS, tz: true, def: "24/7", neg: false }),
      f({ id: "retention_period", label: "Retention period", meaning: "How long the data remains available to the consumer.",
          type: "select", options: RETENTION, def: "1 year" }),
      f({ id: "ga_date", label: "General availability date", meaning: "Date the resource becomes generally available.", type: "date", def: "2026-01-15" }),
      f({ id: "eos_date", label: "End of support date", meaning: "Date support for the resource ends.", type: "date", def: "" }),
      f({ id: "eol_date", label: "End of life date", meaning: "Date the resource is decommissioned.", type: "date", def: "" }),
      f({ id: "support_channels", label: "Support channels", meaning: "Channels through which support is provided.",
          type: "multiselect", options: CHANNELS, def: ["Email", "Ticketing portal"] }),
      f({ id: "support_hours", label: "Support service hours", meaning: "Hours during which support is available.",
          type: "select", options: SUPPORT_HOURS, def: "Business hours 5×8" }),
      f({ id: "support_severity", label: "Support severity & response", meaning: "Target response time per severity tier.",
          type: "matrix", rows: ["Critical", "High", "Medium", "Low"], units: ["h", "business days"],
          def: { Critical: { n: 4, u: "h" }, High: { n: 8, u: "h" }, Medium: { n: 2, u: "business days" }, Low: { n: 5, u: "business days" } } }),
      f({ id: "measurement_method", label: "Measurement / monitoring method", meaning: "How service and support indicators are measured or monitored.",
          type: "textarea", def: "Monitored automatically through the connector's health endpoint; monthly report shared with the consumer." }),
      f({ id: "sla_note", label: "SLA note", meaning: "Optional free note for non-standard cases.", type: "textarea", optional: true, def: "" }),
    ],
  },
  {
    id: "penalties",
    title: "Commitments & penalties",
    icon: "shield",
    desc: "What happens when an SLA commitment is not met. Add one rule per commitment you want to back with a penalty.",
    repeatable: true,
    addLabel: "Add a commitment rule",
    // Fields describe ONE rule; the section stores an array of rule instances.
    fields: [
      f({ id: "commitment_concerned", label: "Commitment concerned", meaning: "The SLA item covered by this penalty.",
          type: "select", options: ["Availability / uptime", "Delivery deadline", "Response time", "Update frequency", "Support severity & response"], def: "Availability / uptime" }),
      f({ id: "trigger_threshold", label: "Trigger threshold", meaning: "Condition under which the commitment is considered not met.",
          type: "opValue", operators: OPERATORS, def: { op: "<", v: "99.5%" } }),
      f({ id: "consequence_type", label: "Type of consequence", meaning: "What applies when the commitment is not met.",
          type: "select", options: CONSEQUENCE, def: "Service credit" }),
      f({ id: "penalty_amount", label: "Penalty amount", meaning: "Amount or percentage applied when the commitment is not met.",
          type: "numberUnit", units: PENALTY_BASIS, def: { n: 5, u: "% of period fee" } }),
      f({ id: "penalty_cap", label: "Penalty / liability cap", meaning: "Maximum cumulative penalty and overall liability ceiling.",
          type: "select", options: PENALTY_CAP, def: "% of monthly fee" }),
      f({ id: "measurement_period", label: "Measurement period", meaning: "Period over which the breach is assessed.",
          type: "select", options: MEAS_PERIOD, def: "Monthly" }),
      f({ id: "claim_procedure", label: "Claim procedure & deadline", meaning: "How and within which delay the penalty must be claimed.",
          type: "procDeadline", options: ["Automatic credit", "Claim required", "Via ticket"], def: { p: "Automatic credit", d: 30 } }),
    ],
    noteId: "penalty_note",
    noteLabel: "Penalty note (optional)",
  },
  {
    id: "duration",
    title: "Contract duration & renewal",
    icon: "hourglass",
    desc: "Initial term of the contract and what happens when it ends.",
    fields: [
      f({ id: "contract_duration", label: "Contract duration", meaning: "Initial duration from signature to planned end date.",
          type: "numberUnit", units: ["months", "years"], def: { n: 12, u: "months" }, neg: true, accept: { min: 6, max: 36 } }),
      f({ id: "renewal_mode", label: "Renewal mode", meaning: "What happens at the end of the initial term.",
          type: "select", options: RENEWAL, def: "Automatic renewal", neg: true, accept: ["Automatic renewal", "On mutual agreement"] }),
      f({ id: "notice_nonrenewal", label: "Notice period for non-renewal", meaning: "Deadline before contract end to notify non-renewal intent.",
          type: "numberUnit", units: ["days"], def: { n: 60, u: "days" }, neg: true, accept: { min: 30, max: 90 } }),
    ],
  },
  {
    id: "termination",
    title: "Termination",
    icon: "danger",
    desc: "Rights to exit before term end — for convenience, for cause, or on a regulatory / security incident.",
    groups: [
      { label: "For convenience", fields: [
        f({ id: "term_convenience", label: "Termination for convenience", meaning: "Right to terminate before contract end without cause or breach.",
            type: "yesno", def: "Yes" }),
        f({ id: "notice_early", label: "Notice period for early termination", meaning: "How many days in advance to terminate early without cause.",
            type: "numberUnit", units: ["days"], def: { n: 30, u: "days" } }),
      ]},
      { label: "For cause (SLA breaches)", fields: [
        f({ id: "term_threshold", label: "Threshold for automatic termination", meaning: "How many SLA breaches must occur before termination is triggered.",
            type: "numberUnit", units: ["breaches / quarter"], def: { n: 3, u: "breaches / quarter" } }),
        f({ id: "notice_cause", label: "Notice period for termination for cause", meaning: "Days of notice when terminating for cause; immediate = no notice.",
            type: "procDeadline", options: ["Immediate (no notice)", "X days notice"], def: { p: "X days notice", d: 15 } }),
        f({ id: "term_regulatory", label: "Termination on regulatory / security incident", meaning: "Whether the contract auto-terminates if a regulatory finding or security breach is confirmed.",
            type: "select", options: ["Yes (immediate)", "Yes (with notice)", "No (case-by-case)"], def: "Yes (immediate)" }),
      ]},
      { label: "Penalties & termination link", fields: [
        f({ id: "cap_termination", label: "Cumulative penalty cap termination", meaning: "Whether exceeding the cumulative penalty cap automatically terminates the contract.",
            type: "yesno", def: "Yes" }),
        f({ id: "suspension_step", label: "Suspension as intermediate step", meaning: "Whether service suspension occurs before automatic termination due to penalties.",
            type: "numberUnit", units: ["days suspension", "no suspension"], def: { n: 15, u: "days suspension" } }),
      ]},
    ],
  },
  {
    id: "clauses",
    title: "Additional clauses",
    icon: "doc",
    desc: "The contract clauses attached to the offer beyond the SLA and the term — exit, security, IP, law, audit and confidentiality. The dataspace proposes a baseline you can adopt or override.",
    fields: [
      f({ id: "reversibility", label: "Reversibility / exit", meaning: "Conditions for restitution and deletion of data at the end of the contract.",
          type: "selectDeadline", options: REVERSIBILITY, deadlines: ["30 days", "60 days", "90 days"],
          def: { a: "Return + deletion", b: "30 days" }, neg: true, accept: ["Return + deletion", "Return + deletion + destruction certificate"] }),
      f({ id: "subcontracting", label: "Subcontracting / third-party transfer", meaning: "Whether and how the resource may be transferred to or processed by third parties.",
          type: "select", options: ["No transfer allowed", "Prior written approval", "Notification only", "Free within the dataspace"], def: "Prior written approval", neg: true, accept: ["No transfer allowed", "Prior written approval"] }),
      f({ id: "security_incident", label: "Security incident notification", meaning: "Maximum delay to notify a data breach or security incident.",
          type: "select", options: ["Without undue delay", "24h", "48h", "72h"], def: "72h", neg: true, accept: ["72h", "48h", "24h"] }),
      f({ id: "ip_outputs", label: "Intellectual property on outputs", meaning: "Ownership and usage rights over derived data or results.",
          type: "select", options: ["Provider retains all", "Consumer owns results", "Joint ownership", "Licensed back", "No derivative rights"], def: "Provider retains all", neg: true, accept: ["Provider retains all", "Licensed back"] }),
      f({ id: "governing_law", label: "Governing law & jurisdiction", meaning: "Applicable law and competent jurisdiction for disputes.",
          type: "twoSelect", options: COUNTRIES, options2: ["Courts", "Arbitration", "Mediation then arbitration"], def: { a: "France", b: "Courts" } }),
      f({ id: "force_majeure", label: "Force majeure", meaning: "Events exonerating the parties from their obligations.",
          type: "select", options: ["Standard clause", "Standard + epidemic", "None"], def: "Standard clause" }),
      f({ id: "audit_right", label: "Audit right", meaning: "Right of a party to verify compliance with the contract.",
          type: "twoSelect", options: ["None", "Self-certification", "Audit on notice", "Third-party audit", "Regulator access"], options2: ["Annual", "On suspicion", "Once per contract"],
          def: { a: "Self-certification", b: "Annual" }, neg: true, accept: ["Self-certification", "Audit on notice"] }),
      f({ id: "confidentiality", label: "Confidentiality", meaning: "Confidentiality commitment on shared data and contract terms.",
          type: "twoSelect", options: ["None", "Mutual NDA", "Unilateral NDA"], options2: ["1 year", "3 years", "5 years"],
          def: { a: "Mutual NDA", b: "3 years" }, neg: true, accept: ["Mutual NDA", "Unilateral NDA"] }),
      f({ id: "clauses_note", label: "Clause note", meaning: "Optional free note on the clauses above.", type: "textarea", optional: true, def: "" }),
    ],
  },
];

// ─── PERSONAL DATA / GDPR ────────────────────────────────────────────────────
// When an offer involves personal data, extra obligations apply. The declaration
// differs by offer kind: a DATA offer is the source (controller side); a SERVICE
// offer processes the data (processor side). A data offer that exposes personal
// data must also designate which service offer(s) are authorised to process it —
// and each of those services must have completed its own processing declaration.
const PD = {
  legalBasis: ["Consent (Art. 6-1-a)", "Contract (Art. 6-1-b)", "Legal obligation (Art. 6-1-c)", "Vital interests (Art. 6-1-d)", "Public task (Art. 6-1-e)", "Legitimate interests (Art. 6-1-f)"],
  specialCats: ["Health", "Biometric", "Genetic", "Racial / ethnic origin", "Political opinions", "Religious beliefs", "Trade-union membership", "Sex life / orientation"],
  subjects: ["Employees", "Job seekers", "Learners / students", "Customers", "Prospects", "Minors (< 16)"],
  dataCats: ["Identity", "Contact details", "Professional experience", "Education & training", "Skills & competencies", "Behavioural / usage", "Location", "Financial"],
  retention: ["Session only", "30 days", "90 days", "1 year", "Contract duration", "Until consent withdrawal"],
  roles: ["Processor", "Joint controller", "Independent controller"],
  operations: ["Collection", "Storage", "Structuring", "Analysis", "Profiling", "Aggregation / anonymisation", "Disclosure", "Erasure"],
  transferSafeguards: ["Adequacy decision", "Standard Contractual Clauses (SCC)", "Binding Corporate Rules", "Explicit derogation (Art. 49)"],
  toms: ["Encryption at rest", "Encryption in transit", "Pseudonymisation", "Access control (RBAC)", "Audit logging", "Data minimisation", "Backup & recovery"],
  dpa: ["Signed", "Template attached", "Not yet"],
};

// Service offers in the dataspace that could process this personal data.
// `complete` = the service has finished its own GDPR processing declaration.
const SERVICE_OFFERS = [
  { id: "svc_matching", name: "job_matching_service", provider: "Techfor", purpose: "Skills-to-vacancy matching", complete: true },
  { id: "svc_analytics", name: "skills_analytics_service", provider: "Headai", purpose: "Aggregated skills analytics", complete: true },
  { id: "svc_reco", name: "learning_reco_engine", provider: "Inokufu", purpose: "Personalised learning recommendations", complete: false },
];

// Default personal-data declaration (both controller & processor slices in one object).
const PERSONAL_DATA_DEFAULT = {
  enabled: false,
  _kind: "Data",
  // Controller side (data offer)
  controller: "",
  legalBasis: "Consent (Art. 6-1-a)",
  special: "No",
  specialWhich: [],
  subjectCategories: [],
  dataCategories: [],
  retention: "Contract duration",
  dpoContact: "",
  linkedServices: [],
  // Processor side (service offer)
  role: "Processor",
  purpose: "",
  operations: [],
  subProcessors: "No",
  subProcessorList: "",
  transfers: "No",
  transferSafeguard: "Standard Contractual Clauses (SCC)",
  toms: ["Encryption at rest", "Encryption in transit", "Access control (RBAC)"],
  dpaSigned: "Template attached",
  monitoringMethod: "",
};

// Flatten helper: all fields (for counts / default seeding), ignoring repeatable instances.
const ALL_FIELDS = [];
SECTIONS.forEach((s) => {
  (s.fields || []).forEach((fl) => ALL_FIELDS.push({ ...fl, section: s.id }));
  (s.groups || []).forEach((g) => g.fields.forEach((fl) => ALL_FIELDS.push({ ...fl, section: s.id })));
});

window.OfferSettingsData = { SECTIONS, ALL_FIELDS, AVAILABILITY, PD, SERVICE_OFFERS, PERSONAL_DATA_DEFAULT };
})();
