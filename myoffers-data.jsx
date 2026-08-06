// VisionsTrust — My Offers page mock data (derived from the live "My Offers" screens)
(function() {
const accentFor = (window.CatData && window.CatData.accentFor) || ((s) => "#00a2ae");

// ─── OFFERS ───────────────────────────────────────────────────────────────
// kind: Data | Service | Infrastructure · status: Published | Draft · archived offers excluded from the "26"
const mk = (o) => ({ resources: 1, policies: 1, requests: 0, revenue: 0, contract: null, price: null, archived: false, ...o, accent: accentFor(o.name) });

const OFFERS = [
  // ── Data · Published ──
  mk({ id: "of1",  name: "DATA_DEMO_DATA_PROVIDER",        kind: "Data", status: "Published", date: "2024-02-02", policies: 1, resources: 1, requests: 8,  contract: "Signed",  price: null }),
  mk({ id: "of2",  name: "DATA_DEMO_DATA_PROVIDER_2",      kind: "Data", status: "Published", date: "2024-02-02", policies: 1, resources: 1, requests: 12, contract: "Signed",  price: null }),
  mk({ id: "of3",  name: "DATA_DEMO_DATA_PROVIDER_HOBBIES",kind: "Data", status: "Published", date: "2024-09-11", policies: 1, resources: 1, requests: 4,  contract: "Pending" }),
  mk({ id: "of4",  name: "billing_offer_test",             kind: "Data", status: "Published", date: "2025-02-05", policies: 2, resources: 1, requests: 10, contract: "Signed",  price: { amount: "1 €", period: "Daily" }, revenue: 86 }),
  mk({ id: "of5",  name: "data_offer_1",                   kind: "Data", status: "Published", date: "2025-07-18", policies: 1, resources: 1, requests: 3,  contract: "Pending" }),
  mk({ id: "of6",  name: "Skills analytics",               kind: "Data", status: "Published", date: "2025-12-11", policies: 1, resources: 1, requests: 6,  contract: "Signed" }),
  mk({ id: "of7",  name: "data_offer_2",                   kind: "Data", status: "Published", date: "2025-07-18", policies: 1, resources: 1, requests: 2,  contract: "Pending" }),
  mk({ id: "of8",  name: "data_postgre",                   kind: "Data", status: "Published", date: "2025-03-04", policies: 1, resources: 1, requests: 5,  contract: "Signed",  price: { amount: "1 €", period: "Daily" }, revenue: 108 }),
  mk({ id: "of9",  name: "skills_matching_feed",           kind: "Data", status: "Published", date: "2025-09-22", policies: 1, resources: 2, requests: 4,  contract: "Pending" }),
  // ── Data · Draft ──
  mk({ id: "of10", name: "DATA_DEMO_DATA_PROVIDER_NO_RESTRICTION",   kind: "Data", status: "Draft", date: "2024-02-23", progress: 100 }),
  mk({ id: "of11", name: "DATA_DEMO_DATA_PROVIDER_NO_RESTRICTION_2", kind: "Data", status: "Draft", date: "2024-02-26", progress: 100 }),
  mk({ id: "of12", name: "DATA_DEMO_DATA_PROVIDER_NO_RESTRICTION_3", kind: "Data", status: "Draft", date: "2024-02-26", progress: 100, requests: 6 }),
  mk({ id: "of13", name: "DATA_DEMO_DATA_PROVIDER_HARD_SKILLS",      kind: "Data", status: "Draft", date: "2024-09-11", progress: 100 }),
  mk({ id: "of14", name: "DATA_DEMO_DATA_PROVIDER_PROFESSIONAL_EXPERIENCE", kind: "Data", status: "Draft", date: "2024-09-11", progress: 100 }),
  mk({ id: "of15", name: "DATA_DEMO_DATA_PROVIDER_TRAINING_OFFERS",  kind: "Data", status: "Draft", date: "2024-09-11", progress: 100 }),
  mk({ id: "of16", name: "DATA_DEMO_DATA_PROVIDER_SKILLS_PROFILE",   kind: "Data", status: "Draft", date: "2024-09-11", progress: 100 }),
  mk({ id: "of17", name: "DATA_DEMO_DATA_PROVIDER_PERSONALISED_DEVELOPMENT", kind: "Data", status: "Draft", date: "2024-09-11", progress: 100 }),
  mk({ id: "of18", name: "DATA_DEMO_DATA_PROVIDER_CERTIFICATIONS",   kind: "Data", status: "Draft", date: "2024-10-15", progress: 100 }),
  mk({ id: "of19", name: "DATA_DEMO_DATA_PUBLISH",                   kind: "Data", status: "Draft", date: "2024-10-28", progress: 100 }),
  mk({ id: "of20", name: "learner_traces_api",                      kind: "Data", status: "Draft", date: "2025-11-02", progress: 80 }),
  mk({ id: "of21", name: "DATA_DEMO_DATA_PROVIDER_LANGUAGES",        kind: "Data", status: "Draft", date: "2024-10-15", progress: 100 }),
  mk({ id: "of22", name: "data_create_test",                        kind: "Data", status: "Draft", date: "2025-12-19", progress: 66 }),
  // ── Infrastructure ──
  mk({ id: "if1", name: "data_provider_infra_1", kind: "Infrastructure", status: "Published", date: "2025-03-18", resources: 1, requests: 3, contract: "Pending" }),
  mk({ id: "if2", name: "data_infra_2",          kind: "Infrastructure", status: "Published", date: "2025-07-18", resources: 1, requests: 2, contract: "Pending" }),
  mk({ id: "if3", name: "data_infra_3",          kind: "Infrastructure", status: "Draft", date: "2025-07-18", progress: 100 }),
  mk({ id: "if4", name: "data_infra_4",          kind: "Infrastructure", status: "Draft", date: "2025-07-18", progress: 58 }),
  // ── Archived (not counted in the 26) ──
  mk({ id: "ar1", name: "DATA_DEMO_LEGACY_EXPORT",  kind: "Data", status: "Published", date: "2023-11-08", policies: 1, resources: 1, archived: true }),
  mk({ id: "ar2", name: "old_billing_offer",        kind: "Data", status: "Published", date: "2023-12-01", policies: 1, resources: 1, archived: true }),
  mk({ id: "ar3", name: "infra_sandbox_test",       kind: "Infrastructure", status: "Draft", date: "2024-01-19", progress: 100, archived: true }),
];

// ─── RESOURCES ──────────────────────────────────────────────────────────────
const rk = (r) => ({ usedIn: 1, ...r, accent: accentFor(r.name) });
const RESOURCES = [
  rk({ id: "rd1",  name: "DATA_DEMO_DATA_PROVIDER",            type: "Data", format: "REST API",   updated: "2024-02-02", usedIn: 1 }),
  rk({ id: "rd2",  name: "DATA_DEMO_DATA_PROVIDER_2",          type: "Data", format: "REST API",   updated: "2024-02-02", usedIn: 1 }),
  rk({ id: "rd3",  name: "DATA_DEMO_DATA_PROVIDER_NO_RESTRICTION",   type: "Data", format: "REST API", updated: "2024-02-23", usedIn: 1 }),
  rk({ id: "rd4",  name: "DATA_DEMO_DATA_PROVIDER_NO_RESTRICTION_2", type: "Data", format: "REST API", updated: "2024-02-26", usedIn: 1 }),
  rk({ id: "rd5",  name: "DATA_DEMO_DATA_PROVIDER_NO_RESTRICTION_3", type: "Data", format: "REST API", updated: "2024-02-26", usedIn: 1 }),
  rk({ id: "rd6",  name: "data_offer_1",                       type: "Data", format: "File · JSON", updated: "2025-07-18", usedIn: 1 }),
  rk({ id: "rd7",  name: "data_postgre",                       type: "Data", format: "PostgreSQL", updated: "2025-03-04", usedIn: 2 }),
  rk({ id: "rd8",  name: "data_offer_2",                       type: "Data", format: "File · CSV",  updated: "2025-07-18", usedIn: 1 }),
  rk({ id: "rd9",  name: "skills_matching_feed",               type: "Data", format: "REST API",   updated: "2025-09-22", usedIn: 1 }),
  rk({ id: "rd10", name: "learner_records_store",              type: "Data", format: "xAPI · LRS", updated: "2025-11-02", usedIn: 1 }),
  rk({ id: "rd11", name: "job_descriptions_dataset",           type: "Data", format: "File · JSON", updated: "2025-04-22", usedIn: 0 }),
  rk({ id: "rd12", name: "esco_skills_reference",              type: "Data", format: "SPARQL",     updated: "2025-06-10", usedIn: 1 }),
  // Services
  rk({ id: "rs1",  name: "student_data_validation",           type: "Service", format: "Webhook",   updated: "2025-05-20", usedIn: 1 }),
  rk({ id: "rs2",  name: "secure_storage_service",            type: "Service", format: "REST API",  updated: "2025-05-18", usedIn: 1 }),
  rk({ id: "rs3",  name: "lms_dataspace_addon",               type: "Service", format: "REST API",  updated: "2025-05-10", usedIn: 0 }),
  rk({ id: "rs4",  name: "syllabus_skills_extractor",         type: "Service", format: "REST API",  updated: "2025-05-05", usedIn: 1 }),
];

// ─── DASHBOARD METRICS ────────────────────────────────────────────────────
const ACTIVE = OFFERS.filter(o => !o.archived);
const STATS = {
  offers: ACTIVE.length,           // 26
  requests: 43,
  revenue: 194,
  contracts: { signed: 12, pending: 31, total: 43 },
};

// Most-requested offers (last 30 days)
const TOP_REQUESTS = [...ACTIVE]
  .filter(o => o.requests > 0)
  .sort((a, b) => b.requests - a.requests)
  .slice(0, 10)
  .map((o, i) => ({ rank: i + 1, name: o.name, kind: o.kind, requests: o.requests }));

// Catalogue evolution — new assets added per month
const EVOLUTION = [
  { m: "Mar 24", v: 5 }, { m: "Apr 24", v: 2 }, { m: "May 24", v: 1 }, { m: "Jun 24", v: 0 },
  { m: "Jul 24", v: 1 }, { m: "Aug 24", v: 0 }, { m: "Sep 24", v: 12 }, { m: "Oct 24", v: 3 },
  { m: "Nov 24", v: 1 }, { m: "Dec 24", v: 1 }, { m: "Jan 25", v: 0 }, { m: "Feb 25", v: 2 },
  { m: "Mar 25", v: 1 }, { m: "Apr 25", v: 1 }, { m: "May 25", v: 0 }, { m: "Jun 25", v: 1 },
  { m: "Jul 25", v: 3 }, { m: "Aug 25", v: 1 }, { m: "Sep 25", v: 2 }, { m: "Oct 25", v: 1 },
  { m: "Nov 25", v: 2 }, { m: "Dec 25", v: 2 }, { m: "Jan 26", v: 1 }, { m: "Feb 26", v: 0 },
  { m: "Mar 26", v: 1 }, { m: "Apr 26", v: 0 }, { m: "May 26", v: 1 }, { m: "Jun 26", v: 0 },
];

window.MyOffersData = { OFFERS, RESOURCES, STATS, TOP_REQUESTS, EVOLUTION };
})();
