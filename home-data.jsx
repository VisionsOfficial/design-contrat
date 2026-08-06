// VisionsTrust — Home page mock data (derived from the live home screens)
(function() {

// KPIs shown in the top strip. `delta` is optional context (last 30 days).
const KPIS = [
  { id: "revenue", label: "Revenue from offers", value: "194", unit: "€", icon: "coin", delta: "+12%", deltaTone: "up", hint: "last 30 days" },
  { id: "offers",  label: "Published offers",     value: "26",  unit: "",  icon: "offers", delta: "+3",  deltaTone: "up", hint: "last 30 days" },
  { id: "requests",label: "Offer requests",       value: "55",  unit: "",  icon: "inbox",  delta: "8 new", deltaTone: "up", hint: "awaiting action", accent: true },
  { id: "systems", label: "Connected source systems", value: "4", unit: "", icon: "database", delta: "stable", deltaTone: "flat", hint: "all healthy" },
];

// Projects/offers the user hasn't finished configuring.
const INCOMPLETE = [
  { id: "d1", name: "data_create_test", type: "Data offer",   progress: 66, step: "Configure exchange terms", updated: "2 days ago" },
  { id: "d2", name: "Skills Profile API", type: "Data offer",  progress: 40, step: "Add pricing & resources", updated: "5 days ago" },
  { id: "d3", name: "Workforce Upskilling Pilot", type: "Project", progress: 85, step: "Invite partners", updated: "yesterday" },
];

// Incoming requests that need a reply.
const PENDING = [
  { id: "r1", org: "DEMO_DSUC_12",      subject: "Access request — Skills Profile API", note: "Wants daily access for a training platform.", when: "3h ago", kind: "Offer request" },
  { id: "r2", org: "DEMO_DSUC_22",      subject: "Join project — Skills analytics", note: "Proposes to contribute an ESCO extractor.", when: "6h ago", kind: "Project invite" },
  { id: "r3", org: "DEMO_DSUC_PUBLISH", subject: "Contract signature — LMS add-ons", note: "Awaiting your counter-signature.", when: "1d ago", kind: "Contract" },
  { id: "r4", org: "Antarctic IA",      subject: "Access request — Learner Records", note: "Requests a 30-day evaluation window.", when: "2d ago", kind: "Offer request" },
  { id: "r5", org: "Headai Ltd",        subject: "Negotiation — Ontology Translator", note: "Sent a revised pricing proposal.", when: "3d ago", kind: "Negotiation" },
];

// Projects in the catalogue that match the user's offer (recommendations).
const FITTING = [
  { id: "f1", code: "DEMO_DSUC_10", name: "Learner skill matching",              org: "Jojo Dhoe", desc: "Match learner skill profiles to opportunities and pathways.", status: "In search of partners", match: 92, tags: ["Skills matching", "Career building"] },
  { id: "f2", code: "DEMO_DSUC_18", name: "Skills analytics & matching",         org: "Headai Ltd", desc: "Actionable skills intelligence for workforce planning.",     status: "In search of partners", match: 88, tags: ["Skills Analytics", "Matching"] },
  { id: "f3", code: "DEMO_DSUC_20", name: "Learning analytics service chains",    org: "Inokufu",    desc: "Establishment of service chains for learning analytics.",   status: "In search of partners", match: 81, tags: ["Learning analytics", "Service chains"] },
  { id: "f4", code: "DEMO_DSUC_24", name: "Skills-driven HEIs",                   org: "UOC",        desc: "Enhancing skills and learning insights for institutions.",  status: "In search of partners", match: 76, tags: ["Skills profile", "HEI"] },
];

// Use-case success stories.
const STORIES = [
  { id: "s1", sector: "Manufacturing", title: "Forecasting skills for Industry 4.0", org: "University of Patras", desc: "How a HEI matched its curriculum to regional manufacturing needs using shared skills data.", date: "Jan 31, 2026", read: "6 min read" },
  { id: "s2", sector: "Higher Ed",     title: "From syllabi to ESCO skills at scale", org: "EDUNAO",             desc: "Turning thousands of course syllabi into structured, matchable competences.", date: "Jan 24, 2026", read: "4 min read" },
  { id: "s3", sector: "Employment",    title: "Bridging learners and job offers",     org: "Games for Citizens", desc: "Exporting game-derived competence maps into live job-matching services.", date: "Jan 18, 2026", read: "5 min read" },
];

// News / announcements.
const NEWS = [
  { id: "n1", tag: "Product",  title: "New: consent-governed exchange terms", desc: "Define granular access windows directly on any offer.", when: "2 days ago" },
  { id: "n2", tag: "Ecosystem", title: "12 new organisations joined the space", desc: "Discover fresh data offers across education and mobility.", when: "1 week ago" },
];

window.HomeData = { KPIS, INCOMPLETE, PENDING, FITTING, STORIES, NEWS };
})();
