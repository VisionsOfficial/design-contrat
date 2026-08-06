// VisionsTrust — My Contracts mock data (derived from the live contracts screens)
(function() {
const { accentFor } = window.CatData;

// The signed-in organisation (highlighted as "you" in participant lists)
const YOU = "Antares";

// status keys: to_sign (needs YOUR signature) | pending (waiting on others) | signed | expired
// role: "orchestrator" | "participant" — YOUR role on this contract
// participants: [{ name, signed }]  — YOU are the one whose name === YOU
// orchSigned: has the orchestrator signed
const RAW = [
  {
    id: "6a21ab9e88ab7868c3b67317", name: "debug", created: "2026-06-04", status: "to_sign", role: "participant",
    purpose: "Data exchange validation between provider and consumer for the debug pipeline.",
    orchestrator: "TestDataProvider", orchSigned: false,
    participants: [{ name: "Antares", signed: false }, { name: "testDataUser", signed: false }],
    contributions: 0, services: 1, dataResources: 2,
  },
  {
    id: "b7f204c1a9de55210f88ac31", name: "Pr2", created: "2026-06-04", status: "to_sign", role: "participant",
    purpose: "Skills profile exchange for the Pr2 pilot across three partners.",
    orchestrator: "VISIONSPROV", orchSigned: true,
    participants: [{ name: "Antares", signed: false }, { name: "Headai Ltd", signed: true }],
    contributions: 1, services: 2, dataResources: 1,
  },
  {
    id: "c93e17aa0b4f6672d1e5709b", name: "project 2", created: "2026-01-28", status: "to_sign", role: "orchestrator",
    purpose: "Learning-analytics service chain orchestrated by your organisation.",
    orchestrator: "Antares", orchSigned: false,
    participants: [{ name: "Antares", signed: false }, { name: "EDUNAO", signed: true }, { name: "Inokufu", signed: false }],
    contributions: 2, services: 1, dataResources: 3,
  },
  {
    id: "1d5a8830cf2e44a97b0c6612", name: "retester bug contrat test", created: "2026-01-15", status: "pending", role: "participant",
    purpose: "Regression contract used to retest the signing workflow end to end.",
    orchestrator: "Scheer GmbH", orchSigned: true,
    participants: [{ name: "Antares", signed: true }, { name: "Scheer IMC", signed: false }],
    contributions: 1, services: 1, dataResources: 1,
  },
  {
    id: "65f318e8d46760e14f7dcb48", name: "AI-based teacher assistant", created: "2024-01-19", status: "pending", role: "participant",
    purpose: "Multi-party contract powering the AI teacher-assistant use case and its data flows.",
    orchestrator: "Ventr", orchSigned: false,
    participants: [
      { name: "Ventr", signed: false },
      { name: "Rejustify", signed: false },
      { name: "Schülerkarriere GmbH", signed: true },
      { name: "Antares", signed: true },
    ],
    contributions: 0, services: 2, dataResources: 4,
  },
  {
    id: "9a02bb417ce8d3350f1146ee", name: "TEST", created: "2024-01-12", status: "pending", role: "orchestrator",
    purpose: "Sandbox contract for validating orchestration and negotiation flows.",
    orchestrator: "Antares", orchSigned: true,
    participants: [{ name: "Antares", signed: true }, { name: "Demo Organization", signed: false }, { name: "Mistral", signed: false }],
    contributions: 3, services: 1, dataResources: 2,
  },
  {
    id: "42c7d90fa1b8e6640932ff05", name: "Skills matching pilot", created: "2025-11-30", status: "signed", role: "participant",
    purpose: "Production contract for the workforce skills-matching pipeline.",
    orchestrator: "Headai Ltd", orchSigned: true,
    participants: [{ name: "Antares", signed: true }, { name: "Headai Ltd", signed: true }, { name: "INFPC", signed: true }],
    contributions: 2, services: 3, dataResources: 2,
  },
  {
    id: "88be05d7ac394512c07e21a9", name: "lifelong-learning.lu feed", created: "2025-10-18", status: "signed", role: "participant",
    purpose: "Recurring ingestion of the lifelong-learning.lu training catalogue.",
    orchestrator: "INFPC", orchSigned: true,
    participants: [{ name: "Antares", signed: true }, { name: "INFPC", signed: true }],
    contributions: 1, services: 1, dataResources: 3,
  },
  {
    id: "31fa6620ee8b47790c5d1183", name: "LMS Totara integration", created: "2025-09-05", status: "signed", role: "orchestrator",
    purpose: "Integration contract connecting Totara LMS analytics to the data space.",
    orchestrator: "Antares", orchSigned: true,
    participants: [{ name: "Antares", signed: true }, { name: "Inokufu", signed: true }, { name: "Scheer IMC", signed: true }],
    contributions: 4, services: 2, dataResources: 1,
  },
  {
    id: "77cd1249b0a3ee6650f24471", name: "ESCO extractor trial", created: "2025-08-22", status: "signed", role: "participant",
    purpose: "Trial access to the ESCO skills extraction service.",
    orchestrator: "Headai Ltd", orchSigned: true,
    participants: [{ name: "Antares", signed: true }, { name: "Headai Ltd", signed: true }],
    contributions: 0, services: 1, dataResources: 1,
  },
  {
    id: "5be9f0731ad24c8890ab6612", name: "Old sandbox agreement", created: "2024-06-11", status: "expired", role: "participant",
    purpose: "Expired sandbox agreement kept for audit history.",
    orchestrator: "Demo Organization", orchSigned: true,
    participants: [{ name: "Antares", signed: true }, { name: "Demo Organization", signed: true }],
    contributions: 1, services: 1, dataResources: 1,
  },
  {
    id: "0ac4438f61de29970b31cc27", name: "Q1 evaluation contract", created: "2024-03-02", status: "expired", role: "orchestrator",
    purpose: "First-quarter evaluation contract, now past its validity window.",
    orchestrator: "Antares", orchSigned: true,
    participants: [{ name: "Antares", signed: true }, { name: "BME-TMIT", signed: true }],
    contributions: 2, services: 1, dataResources: 2,
  },
];

// Derive convenient fields
const CONTRACTS = RAW.map(c => {
  const signatories = [{ name: c.orchestrator, signed: c.orchSigned, isOrch: true },
    ...c.participants.filter(p => p.name !== c.orchestrator).map(p => ({ ...p, isOrch: false }))];
  const signedCount = signatories.filter(s => s.signed).length;
  const youEntry = signatories.find(s => s.name === YOU);
  const yourSigned = youEntry ? youEntry.signed : false;
  const missing = signatories.filter(s => !s.signed).map(s => s.name);
  // action needed from you = it's a live contract and you haven't signed
  const needsYou = (c.status === "to_sign" || c.status === "pending") && !yourSigned;
  return {
    ...c, accent: accentFor(c.name + c.id), signatories,
    signedCount, total: signatories.length, yourSigned, missing, needsYou,
  };
});

const STATUS_META = {
  to_sign: { label: "To sign", tone: "warn", dot: "#b7791f", icon: "pen" },
  pending: { label: "Pending", tone: "info", dot: "#2a6fdb", icon: "hourglass" },
  signed:  { label: "Signed", tone: "success", dot: "#0a8a5c", icon: "check" },
  expired: { label: "Expired", tone: "muted", dot: "#8c97ad", icon: "clock" },
};

window.ContractsData = { CONTRACTS, STATUS_META, YOU };
})();
