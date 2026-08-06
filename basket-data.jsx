// VisionsTrust — Basket data.
// The provider publishes each offer's terms in Offer Settings (window.OfferSettingsData):
// every term has a baseline value, a negotiable flag, and — when negotiable — an
// acceptance range/set the provider's agent will auto-accept. The basket reads those.
// Here we seed a few offers, each with its own term profile (a small set of overrides
// layered on the dataspace schema defaults), plus the projects for the assignment step.
(function () {
const { accentFor } = window.CatData;

// Per-offer term profile: overrides applied to the schema.
//   value: provider's published baseline (defaults to schema def)
//   neg:   whether the provider left it negotiable (defaults to schema neg)
//   accept: acceptance range/set (defaults to schema accept)
// Only list the fields you want to differ from the schema.

const ITEMS = [
  {
    id: "consume_any_data", name: "Consume any data", kind: "Service",
    provider: "Education data Provider", org: "EDU",
    desc: "Consume and cross-reference any dataset published to the space, governed by consent.",
    pricing: { sub: "0", billing: "One shot", setup: "0", api: "0", currency: "EUR", desc: "" },
    saved: false,
    overrides: {
      // A generous service offer — most SLA terms open to negotiation, baseline as published.
      availability: { value: "99.5%" },
      support_hours: { value: "Business hours 5×8" },
      contract_duration: { value: { n: 12, u: "months" } },
    },
  },
  {
    id: "data_infra_2", name: "data_infra_2", kind: "Infrastructure",
    provider: "DataProvider", org: "REJUSTIFY",
    desc: "Managed compute & storage building block for chain workloads in the data space.",
    pricing: { sub: "300", billing: "Monthly", setup: "150", api: "0", currency: "EUR", desc: "Billed monthly, per environment.", neg: true, accept: { min: 250, max: 300 } },
    saved: true,
    overrides: {
      // Infrastructure: availability is a hard commitment (fixed), tighter response time.
      availability: { value: "99.9%" },
      availability_window: { value: "24/7" },
      response_time: { value: { n: 300, u: "ms", b: "p95" } },
      retention_period: { value: "Contract duration" },
      contract_duration: { value: { n: 24, u: "months" } },
      notice_nonrenewal: { value: { n: 90, u: "days" }, accept: { min: 60, max: 120 } },
      term_convenience: { value: "No" },
    },
  },
  {
    id: "data_offer_1", name: "data_offer_1", kind: "Data",
    provider: "DataProvider", org: "REJUSTIFY",
    desc: "Reference dataset exposed through the data space with standard exchange protocols.",
    pricing: { sub: "1", billing: "One shot", setup: "0", api: "0", currency: "EUR", desc: "desc", neg: false },
    saved: false,
    overrides: {
      update_frequency: { value: "Daily", accept: ["Daily", "Weekly", "Monthly"] },
      retention_period: { value: "1 year" },
      support_channels: { value: ["Email", "Ticketing portal"] },
      renewal_mode: { value: "Automatic renewal" },
      ga_date: { value: "2026-02-01" },
    },
  },
];

// Projects available for the "assign to existing project" step (from My Projects).
const PROJECTS = [
  { id: "pr1", name: "SERVICE_PROVIDER_DSUC", caption: "Reference data space use case", org: "REJUSTIFY" },
  { id: "pr2", name: "SERVICE_PROVIDER_DSUC_1", caption: "Matching offers sandbox", org: "TECHNÉ" },
  { id: "pr3", name: "SERVICE_PROVIDER_DSUC_2", caption: "Second DSUC pilot iteration", org: "TECHNÉ" },
  { id: "pr4", name: "SERVICE_PROVIDER_DSUC_CHAIN", caption: "VR learning analytics chain", org: "TECHNÉ" },
  { id: "pr5", name: "AI_MUTUALISATION_COMMONS", caption: "Cross-sector AI training commons", org: "DSUC" },
  { id: "pr6", name: "VR_LEARNING_ANALYTICS_NET", caption: "VR learning analytics network", org: "LUCE" },
];

const KIND_TONE = { Data: "#00a2ae", Service: "#5b6ef5", Infrastructure: "#e8743b" };

// ─── USER ACCEPTANCE BASELINE ───────────────────────────────────────────────
// The BUYER defines this once in their settings — their minimum requirements.
// Every offer in the basket is measured against it, and terms that fall short
// are flagged as "gaps". The provider's own acceptance range is never surfaced
// (the buyer always aims for their own baseline), per the negotiation model.
//   op: "≤" | "≥" | "=" | "in" | "includesAll" | "≥tier"
//   v:  the threshold / accepted set
//   label: human-readable summary shown in the basket
const USER_BASELINE = {
  availability:      { op: "≥tier",      v: "99.9%",                                                      label: "≥ 99.9%" },
  update_frequency:  { op: "in",         v: ["Real-time / streaming", "Hourly", "Daily"],                 label: "Daily or better" },
  delivery_deadline: { op: "≤",          v: 5,                                                            label: "≤ 5 business days" },
  response_time:     { op: "≤",          v: 400,                                                          label: "≤ 400 ms" },
  retention_period:  { op: "in",         v: ["1 year", "Contract duration", "Until consent withdrawal"],  label: "≥ 1 year" },
  support_hours:     { op: "in",         v: ["Extended 5×12", "24/7"],                                    label: "Extended 5×12 or 24/7" },
  support_channels:  { op: "includesAll", v: ["Email"],                                                   label: "Email at minimum" },
  renewal_mode:      { op: "in",         v: ["Automatic renewal", "On mutual agreement"],                 label: "Auto-renewal or mutual agreement" },
  notice_nonrenewal: { op: "≤",          v: 90,                                                           label: "≤ 90 days" },
  term_convenience:  { op: "=",          v: "Yes",                                                        label: "Required" },
  notice_early:      { op: "≤",          v: 60,                                                           label: "≤ 60 days" },
};

window.BasketData = {
  ITEMS: ITEMS.map((o) => ({ ...o, accent: accentFor(o.provider + o.name) })),
  PROJECTS,
  KIND_TONE,
  USER_BASELINE,
};
})();
