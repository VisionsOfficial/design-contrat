// VisionsTrust Catalogue — mock data (derived from the live catalogue screens)
(function() {

// Brand-aligned accent palette for monograms / banners
const PALETTE = ["#00a2ae", "#17243f", "#5b6ef5", "#e8743b", "#0a8a5c", "#9b51e0", "#0e7490", "#c2410c"];
const accentFor = (seed) => {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};
const hexToRgba = (hex, a) => {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};
const initials = (name) => name.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "·";

const OFFERS = [
  { id: "o1", name: "Student Data Test", provider: "Universitat Oberta de Catalunya", kind: "Service", desc: "Internal service for data exchange validation across the dataspace.", tags: ["Skills profile", "Validation"], resources: 1, price: null, added: "2026-05-20" },
  { id: "o2", name: "Headai Secure Storage", provider: "Headai Ltd", kind: "Service", desc: "Encrypted storage for skills graphs and learning records.", tags: ["Storage", "Soft skills"], resources: 1, price: null, added: "2026-05-18" },
  { id: "o3", name: "File to Dataspace", provider: "Demo Organization", kind: "Data", desc: "Push file-based datasets straight into the data space with mapping.", tags: ["Hard skills", "Ingestion"], resources: 1, price: { amount: "1 EUR", period: "Daily" }, added: "2026-05-12" },
  { id: "o4", name: "LMS Dataspace Add-ons", provider: "Scheer IMC", kind: "Service", desc: "Connect PTX Gateway analytics result to your LMS in a few clicks.", tags: ["Learning analytics", "LMS"], resources: 1, price: null, added: "2026-05-10" },
  { id: "o5", name: "lifelong-learning.lu", provider: "INFPC", kind: "Data", desc: "Catalogue of training courses available on lifelong-learning.lu.", tags: ["Training offers", "Courses"], resources: 3, price: null, added: "2026-05-08" },
  { id: "o6", name: "Store Syllabus Skills", provider: "EDUNAO", kind: "Service", desc: "Extract and store ESCO-aligned skills from course syllabi.", tags: ["Skills Analytics", "ESCO"], resources: 1, price: null, added: "2026-05-05" },
  { id: "o7", name: "ESCO Skills Extractor", provider: "Headai Ltd", kind: "Service", desc: "Analyse text and return ESCO skills and competences.", tags: ["Skills matching", "NLP"], resources: 1, price: { amount: "Free", period: "" }, added: "2026-05-01" },
  { id: "o8", name: "Receive Student Data 5", provider: "Headai Ltd", kind: "Data", desc: "Endpoint to receive back enriched data on student profiles.", tags: ["Learning traces", "Profiles"], resources: 1, price: null, added: "2026-04-28" },
  { id: "o9", name: "Scheer JobDescriptions", provider: "Scheer GmbH", kind: "Data", desc: "Job descriptions and job profiles dataset for matching pipelines.", tags: ["Job offers", "Professional experience"], resources: 1, price: { amount: "1 EUR", period: "Daily" }, added: "2026-04-22" },
  { id: "o10", name: "Skills Profile API", provider: "VISIONSPROV", kind: "Data", desc: "Aggregated hard & soft skills profiles, consent-governed.", tags: ["Hard skills", "Skills profile"], resources: 2, price: null, added: "2026-04-15" },
];

const PROJECTS = [
  { id: "p1", name: "LMS Totara use case", provider: "Inokufu", desc: "Inokufu powers dataspace sales through smart Totara plugins.", tags: ["LMS", "Learning analytics"], status: "In search of partners", members: 4, added: "2026-05-19" },
  { id: "p2", name: "Skills analytics and matching", provider: "Headai Ltd", desc: "Actionable skills intelligence for workforce planning.", tags: ["Skills Analytics", "Matching"], status: "In search of partners", members: 6, added: "2026-05-14" },
  { id: "p3", name: "Learning analytics and matching", provider: "Inokufu", desc: "Establishment of service chains for learning analytics.", tags: ["Learning analytics", "Service chains"], status: "In search of partners", members: 3, added: "2026-05-09" },
  { id: "p4", name: "Learner skill matching", provider: "EDUNAO", desc: "Match learner skill profiles to opportunities and pathways.", tags: ["Skills matching", "Career building"], status: "In search of partners", members: 2, added: "2026-05-02" },
  { id: "p5", name: "Manufacturing skills forecasting & matching", provider: "LMS — University of Patras", desc: "Enable students and employees to enhance their skillset.", tags: ["Skills forecasting", "Manufacturing"], status: "In search of partners", members: 5, added: "2026-04-26" },
  { id: "p6", name: "Skills-driven Higher Education Institutions", provider: "Universitat Oberta de Catalunya", desc: "Enhancing skills and learning insights for HEIs.", tags: ["Skills profile", "HEI"], status: "In search of partners", members: 7, added: "2026-04-20" },
  { id: "p7", name: "Export competence maps to job matching services", provider: "Games for Citizens", desc: "Export game-derived competence maps to job matching services.", tags: ["Job matching", "Competence"], status: "In search of partners", members: 3, added: "2026-04-14" },
  { id: "p8", name: "Skill-driven Strategic Workforce Learning", provider: "Scheer GmbH", desc: "Integrate, visualise and analyse all available skills.", tags: ["Workforce", "Skills Analytics"], status: "In search of partners", members: 8, added: "2026-04-08" },
];

const INFRA = [
  { id: "i1", name: "LLM Service", provider: "Mistral", category: "Data Transformation", desc: "Large Language Model service powered by Mistral.", tags: ["AI", "Transformation"], added: "2026-05-17" },
  { id: "i2", name: "PLRS", provider: "Linagora Orchestrator", category: "Utility", desc: "Personal Learning Record Store orchestration utility.", tags: ["Utility", "Records"], added: "2026-05-11" },
  { id: "i3", name: "Ontology Translator", provider: "Headai Ltd", category: "Data Transformation", desc: "Making heterogeneous data speak one common language.", tags: ["Ontology", "Mapping"], added: "2026-05-06" },
  { id: "i4", name: "AffectLog360° — Explainability & Compliance", provider: "AffectLog", category: "Trustworthy Data Sharing", desc: "AI explainability and compliance made transparent and privacy-safe.", tags: ["Compliance", "Explainability"], added: "2026-05-03" },
  { id: "i5", name: "xAPI traces generator for Unity", provider: "Mimbus", category: "Data Transformation", desc: "Convert VR learning events to xAPI and store them into your LRS.", tags: ["xAPI", "VR"], added: "2026-04-29" },
  { id: "i6", name: "Anonymize JSON", provider: "Inokufu", category: "Data Transformation", desc: "Anonymize structured JSON data securely with Inokufu.", tags: ["Privacy", "Anonymization"], added: "2026-04-24" },
  { id: "i7", name: "Data Veracity Assurance", provider: "BME", category: "Utility", desc: "Ensure received data meets predefined veracity and quality standards.", tags: ["Quality", "Veracity"], added: "2026-04-18" },
  { id: "i8", name: "Distributed data visualisation", provider: "Headai Ltd", category: "Utility", desc: "AI processes shared data; results flow freely across systems.", tags: ["Visualisation", "Distributed"], added: "2026-04-12" },
  { id: "i9", name: "Pseudonymize text", provider: "Inokufu", category: "Data Transformation", desc: "Pseudonymize sensitive text data securely with Inokufu.", tags: ["Privacy", "Pseudonymization"], added: "2026-04-06" },
  { id: "i10", name: "Cloud Avenue", provider: "Orange Business", category: "Trustworthy Data Sharing", desc: "IaaS compute and storage for trustworthy data sharing.", tags: ["IaaS", "Compute"], added: "2026-04-01" },
];

const ORGS = [
  { id: "g1", name: "Mistral", desc: "Organisation of Large Language Models.", offers: 3, projects: 1, added: "2026-05-16" },
  { id: "g2", name: "Universitat Oberta de Catalunya", desc: "The world's first university with a virtual campus, letting students study anytime from any location.", offers: 5, projects: 4, added: "2026-05-13" },
  { id: "g3", name: "Linagora Data Provider", desc: "Open-source editor pioneering digital sovereignty and ethical, user-centred solutions.", offers: 4, projects: 2, added: "2026-05-07" },
  { id: "g4", name: "BME-TMIT", desc: "Budapest University of Technology participates in the EdgeSkills project as a building-block developer.", offers: 2, projects: 3, added: "2026-05-04" },
  { id: "g5", name: "INFPC", desc: "National Institute for the Development of Continuing Vocational Training in Luxembourg.", offers: 6, projects: 2, added: "2026-04-30" },
  { id: "g6", name: "Laboratory for Manufacturing Systems & Automation", desc: "LMS department of Mechanical Engineering & Aeronautics at the University of Patras.", offers: 3, projects: 5, added: "2026-04-25" },
  { id: "g7", name: "OPENDATASOFT", desc: "Europe's leading data product marketplace, democratising data usage at scale for business users and AI agents.", offers: 4, projects: 1, added: "2026-04-19" },
  { id: "g8", name: "Scheer GmbH", desc: "Business meets technology — transformation through agility, collaboration and innovation.", offers: 5, projects: 3, added: "2026-04-13" },
  { id: "g9", name: "CSC — IT Center for Science", desc: "Finnish centre of expertise in ICT providing services for research and education.", offers: 2, projects: 4, added: "2026-04-07" },
  { id: "g10", name: "Mylia", desc: "VET provider and upskilling–reskilling service.", offers: 3, projects: 2, added: "2026-04-02" },
];

window.CatData = { OFFERS, PROJECTS, INFRA, ORGS, accentFor, hexToRgba, initials };
})();
