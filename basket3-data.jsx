// VisionsTrust — Basket data · packaged-offer extension (loaded only on the
// packages basket page). Adds one offer priced by packages: each package sets its
// own monthly call volume, price, optional set-up fee, usage policies AND its own
// term overrides — so the buyer must pick a package before adjusting any term.
(function () {
const B = window.BasketData;
const { accentFor } = window.CatData;

const PACKAGED = {
  id: "mobility_flows_api", name: "mobility_flows_api", kind: "Data",
  provider: "Mobility Data Hub", org: "MOBHUB",
  desc: "Anonymised passenger-flow counts per station and hour, exposed as a REST API.",
  pricing: { sub: "0", billing: "Monthly", setup: "0", api: "0", currency: "EUR", desc: "Priced by package — monthly call volume." },
  saved: false,
  // Offer-level terms: the floor every package starts from.
  overrides: {
    update_frequency: { value: "Hourly" },
    retention_period: { value: "1 year" },
    support_channels: { value: ["Email", "Ticketing portal"] },
    renewal_mode: { value: "Automatic renewal" },
  },
  packages: [
    {
      id: "starter", name: "Starter", calls: 10000, price: 90, setup: 0,
      // Pricing as published in Offer Settings → Pricing & Packages (per package).
      sub: "90", billing: "Monthly", api: "0", currency: "EUR", neg: false, accept: null,
      desc: "Pilots and integration tests.", policies: ["Time Period", "Count"],
      recommended: false,
      overrides: {
        availability: { value: "99.5%" },
        support_hours: { value: "Business hours 5×8" },
        response_time: { value: { n: 800, u: "ms", b: "p95" } },
        contract_duration: { value: { n: 12, u: "months" } },
        term_convenience: { value: "Yes" },
      },
    },
    {
      id: "growth", name: "Growth", calls: 50000, price: 350, setup: 250,
      sub: "350", billing: "Monthly", api: "0", currency: "EUR", neg: true, accept: { min: 300, max: 350 },
      desc: "Production usage, one integration.", policies: ["Time Period"],
      recommended: true,
      overrides: {
        availability: { value: "99.9%" },
        support_hours: { value: "Extended 5×12" },
        response_time: { value: { n: 400, u: "ms", b: "p95" }, accept: { min: 250, max: 500 } },
        contract_duration: { value: { n: 12, u: "months" } },
        term_convenience: { value: "Yes" },
      },
    },
    {
      id: "scale", name: "Scale", calls: 250000, price: 1400, setup: 500,
      sub: "1400", billing: "Monthly", api: "0", currency: "EUR", neg: true, accept: { min: 1200, max: 1400 },
      desc: "High volume, multi-service integration.", policies: ["No Restriction", "Notification"],
      recommended: false,
      overrides: {
        availability: { value: "99.95%" },
        availability_window: { value: "24/7" },
        support_hours: { value: "24/7" },
        response_time: { value: { n: 250, u: "ms", b: "p95" }, accept: { min: 150, max: 300 } },
        retention_period: { value: "Contract duration" },
        contract_duration: { value: { n: 24, u: "months" } },
        term_convenience: { value: "No" },
      },
    },
  ],
};

window.BasketData = { ...B, ITEMS: [...B.ITEMS, { ...PACKAGED, accent: accentFor(PACKAGED.provider + PACKAGED.name) }] };

// Usage policies the provider published on the flat-priced offers (packaged offers
// carry theirs per package), so every basket card can show them up front.
const POL_BY_ID = {
  consume_any_data: ["Time Period", "Notification"],
  data_infra_2: ["Time Period", "Count"],
  data_offer_1: ["Count"],
};
window.BasketData = { ...window.BasketData, ITEMS: window.BasketData.ITEMS.map((o) => (o.policies || POL_BY_ID[o.id] ? { ...o, policies: o.policies || POL_BY_ID[o.id] } : o)) };
})();
