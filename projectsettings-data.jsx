// VisionsTrust — Project settings field schema.
// Rows 3–26 (project information, governance, needs, contributions) + rows 84–92 (additional contract clauses).
(function () {
const f = (o) => ({ neg: false, ...o });

// Resources-you-need option lists (from the live "Resources you need" modal)
const NEED_DATA = ["Hard Skills", "Hobbies", "Job Offers", "Learning Object", "Learning Traces", "Personalised Development", "Professional Experience", "Personality", "Soft Skills", "Training Offers", "Learning Experience", "Skills Profile"];
const NEED_SERVICE = ["Adaptive Learning", "Career Building", "Develop Potential", "Job Matching", "Self Discovery", "Learning Analytics", "Skills Analytics", "Profile Update", "Skills Gap", "Skills Forecasting", "Skills Matching", "Training Matching"];
const NEED_INFRA = ["Trustworthy Data Sharing", "Data Transformation", "Utility"];
const CATEGORIES = ["Mutualise data to train AI", "VR learning analytics", "Skills intelligence", "Training pathways", "Job matching"];
const COUNTRIES = ["France", "Belgium", "Germany", "Netherlands", "EU-wide"];
const LEGAL_BASIS = ["Consent", "Contract", "Legal obligation", "Vital interests", "Public task", "Legitimate interests"];

// ─── PROJECT INFORMATION (rows 3–7) ─────────────────────────────────────────
const INFO = {
  id: "info", title: "Project information", icon: "folder",
  desc: "Identity of the project as shown in the catalogue.",
  fields: [
    f({ id: "project_title", label: "Project title", meaning: "Name displayed in the project catalogue.", type: "text", def: "SERVICE_PROVIDER_DSUC" }),
    f({ id: "project_caption", label: "Project caption", meaning: "Short description presenting the main objective.", type: "text", def: "description" }),
    f({ id: "project_description", label: "Project description", meaning: "Detailed presentation of the project and its objectives.", type: "textarea", def: "This project mutualises learning and job-market data across training providers, employers and public actors so that skills-matching models can be trained on a shared, governed dataset. Participants contribute their own resources under their own terms; the contract layer records the baseline each party accepts, the usage policies attached to every resource, and the penalties that apply if a commitment is not met. The first phase covers France, with an extension to the wider EU once the governance framework is validated by all participants." }),
    f({ id: "categories", label: "Categories", meaning: "Domains or use cases corresponding to the project.", type: "multiselect", options: CATEGORIES, def: ["Mutualise data to train AI", "VR learning analytics"] }),
    f({ id: "country", label: "Country or region", meaning: "Geographic area concerned by the project.", type: "select", options: COUNTRIES, def: "France" }),
  ],
};

// ─── PROJECT GOVERNANCE (rows 10–15) ────────────────────────────────────────
const GOVERNANCE = {
  id: "governance", title: "Governance", icon: "shield",
  desc: "Purpose, benefits and the legal basis for processing.",
  fields: [
    f({ id: "project_purpose", label: "Project purpose", meaning: "Main objective pursued by the project.", type: "textarea", def: "Mutualise learning data to train shared skills-matching models." }),
    f({ id: "project_benefit", label: "Project benefit", meaning: "Value provided to users, organisations or stakeholders.", type: "textarea", def: "" }),
    f({ id: "data_processing", label: "Data processing", meaning: "Description of how data will be used or processed.", type: "textarea", def: "" }),
    f({ id: "data_availability_date", label: "Desired date for data availability", meaning: "Date when data must be available for the project.", type: "date", def: "2026-03-01" }),
    f({ id: "legal_basis", label: "Legal basis of the processing", meaning: "Legal foundation authorising use or processing.", type: "select", options: LEGAL_BASIS, def: "Consent" }),
    f({ id: "legal_basis_desc", label: "Legal basis description", meaning: "Additional information about the legal foundation.", type: "textarea", def: "" }),
  ],
};

// ─── ADDITIONAL CLAUSES (rows 84–92) — negotiable like offer terms ──────────
const CLAUSES = {
  id: "clauses", title: "Additional clauses", icon: "doc",
  desc: "Contract clauses attached to the project. Propose a baseline, and allow negotiation where you accept it.",
  fields: [
    f({ id: "reversibility", label: "Reversibility / exit", meaning: "Conditions for restitution and deletion of data at the end of the contract.",
        type: "selectDeadline", options: ["None", "Data deletion only", "Return + deletion", "Return + deletion + destruction certificate"], deadlines: ["30 days", "60 days", "90 days"],
        def: { a: "Return + deletion", b: "30 days" }, neg: true, accept: ["Return + deletion", "Return + deletion + destruction certificate"] }),
    f({ id: "subcontracting", label: "Subcontracting / third-party transfer", meaning: "Whether and how the resource may be transferred to or processed by third parties.",
        type: "textarea", def: "No third-party transfer without prior written approval.", neg: true }),
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
    f({ id: "amendment", label: "Amendment / modification", meaning: "Procedure for modifying the contract.",
        type: "select", options: ["Written amendment only", "Mutual agreement", "With notice"], def: "Mutual agreement" }),
  ],
};

const FIELD_SECTIONS = [INFO, GOVERNANCE, CLAUSES];
const ALL_FIELDS = [];
FIELD_SECTIONS.forEach((s) => s.fields.forEach((fl) => ALL_FIELDS.push({ ...fl, section: s.id })));

// Contributions (row 22) + Tech components — driven from data, edited via custom panels
const CONTRIBUTIONS = [
  { id: "c1", kind: "Service", name: "SERVICE_DEMO_SERVICE_PROVIDER_NO_RESTRICTION", caption: "description", resources: 1 },
  { id: "c2", kind: "Data", name: "SERVICE_PORVIDER_DATA_JOB_OFFERS", caption: "caption", resources: 1 },
  { id: "c3", kind: "Service", name: "service_test", caption: "ddesc", resources: 3 },
  { id: "c4", kind: "Service", name: "SERVICE_DEMO_SERVICE_TRAINING_MATCHING", caption: "caption", resources: 1 },
];
const DOCUMENTS = [
  { id: "d1", name: "project_charter.pdf", size: "412 KB", date: "12/06/2026" },
  { id: "d2", name: "dpia_service_provider_dsuc.pdf", size: "1.2 MB", date: "20/06/2026" },
  { id: "d3", name: "governance_framework_v3.docx", size: "88 KB", date: "02/07/2026" },
];
const TECH_CORE = ["Contract", "Catalog", "Identity", "Consent"];
const TECH_EXTRA = [
  { id: "ariane", name: "ARIANE ‘Interoperability of skills frameworks’ ISF BB", desc: "Consolidates fragmented skills data from multiple sources into a standardised, interoperable format with competence values." },
  { id: "lrc", name: "Learning Records Converter (LRC)", desc: "APIs converting educational traces between standards into the xAPI DASES Profile to enable efficient data exchange in the dataspace." },
];

window.ProjectSettingsData = { FIELD_SECTIONS, ALL_FIELDS, INFO, GOVERNANCE, CLAUSES, NEED_DATA, NEED_SERVICE, NEED_INFRA, CONTRIBUTIONS, DOCUMENTS, TECH_CORE, TECH_EXTRA };
})();
