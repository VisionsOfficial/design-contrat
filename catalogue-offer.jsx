// VisionsTrust — Catalogue · offer detail model + shared blocks.
// A catalogue offer now carries what a buyer actually needs before adding it to
// the basket: its packages (when it sells several formulas), its usage policies,
// and the baseline the provider published — with what is fixed and what the
// contract agent may auto-accept. The same blocks render in the side panel and
// on the full offer page, so the two never drift.
(function () {
const { Icon } = window.UI;
const { SECTIONS } = window.OfferSettingsData;
const { OFFERS, accentFor, initials, hexToRgba } = window.CatData;

// Auto-accept lives only on the terms the dataspace lets a taker move.
const AUTO_ACCEPT = new Set(["contract_duration", "renewal_mode", "notice_nonrenewal"]);
const SHOWN_SECTIONS = ["sla", "duration", "termination"];
const SEC_LABEL = { sla: "Service levels", duration: "Duration & renewal", termination: "Termination" };

// Packages: variants of the same offer. Each one publishes the SAME pricing fields as a
// single price (Offer settings → Pricing & Packages): subscription, billing period,
// set-up fee, cost per API call, currency — plus whether that price is negotiable, the
// resources it includes and the usage policies that apply to it.
const PACKAGES = {
  o10: [
    { id: "starter", name: "Starter", sub: 90, billing: "Monthly", setup: 0, api: 0, currency: "EUR", neg: false, accept: null,
      desc: "Pilots and integration tests.", policies: ["Time Period", "Count"], res: 1,
      overrides: { availability: "99.5%", support_hours: "Business hours 5×8", response_time: { n: 800, u: "ms", b: "p95" }, contract_duration: { n: 12, u: "months" } } },
    { id: "growth", name: "Growth", sub: 350, billing: "Monthly", setup: 250, api: 0, currency: "EUR", neg: true, accept: { min: 300, max: 350 }, recommended: true,
      desc: "Production usage, one integration.", policies: ["Time Period"], res: 2,
      overrides: { availability: "99.9%", support_hours: "Extended 5×12", response_time: { n: 400, u: "ms", b: "p95" }, contract_duration: { n: 12, u: "months" } } },
    { id: "scale", name: "Scale", sub: 1400, billing: "Monthly", setup: 500, api: 0, currency: "EUR", neg: true, accept: { min: 1200, max: 1400 },
      desc: "High volume, multi-service integration.", policies: ["No Restriction", "Notification"], res: 2,
      overrides: { availability: "99.95%", availability_window: "24/7", support_hours: "24/7", response_time: { n: 250, u: "ms", b: "p95" }, retention_period: "Contract duration", contract_duration: { n: 24, u: "months" } } },
  ],
  o5: [
    { id: "regional", name: "Regional", sub: 0, billing: "Monthly", setup: 0, api: 0, currency: "EUR", neg: false, accept: null,
      desc: "One region, non-commercial use.", policies: ["Time Period", "Count"], res: 1,
      overrides: { availability: "99%", update_frequency: "Weekly", support_hours: "Business hours 5×8" } },
    { id: "national", name: "National", sub: 240, billing: "Monthly", setup: 0, api: 0, currency: "EUR", neg: true, accept: { min: 200, max: 240 }, recommended: true,
      desc: "Whole national catalogue, commercial use allowed.", policies: ["Notification"], res: 3,
      overrides: { availability: "99.5%", update_frequency: "Daily", support_hours: "Extended 5×12" } },
  ],
};

// Usage policies published on the flat-priced offers.
const POLICIES = {
  o1: ["Time Period"], o2: ["No Restriction"], o3: ["Time Period", "Count"], o4: ["Notification"],
  o6: ["Count"], o7: ["No Restriction"], o8: ["Time Period", "Notification"], o9: ["Count", "Time Period"],
};

// Where a provider departed from the dataspace default on the flat offers.
const BASE_OVERRIDES = {
  o3: { availability: "99%", update_frequency: "Daily", contract_duration: { n: 6, u: "months" } },
  o7: { availability: "Best effort", support_hours: "Business hours 5×8", term_convenience: "Yes" },
  o9: { availability: "99.5%", retention_period: "Contract duration", contract_duration: { n: 24, u: "months" }, renewal_mode: "On mutual agreement" },
};

function fmt(field, v) {
  if (v === "" || v == null || (Array.isArray(v) && !v.length)) return "—";
  switch (field.type) {
    case "numberUnit": return `${v.n}${v.u ? " " + v.u : ""}${v.b ? " · " + v.b : ""}`;
    case "multiselect": return v.join(", ");
    case "procDeadline": return !/Immediate/.test(v.p) && v.d != null ? `${v.p} · ${v.d}d` : v.p;
    case "matrix": return Object.entries(v).map(([k, x]) => `${k} ${x.n}${x.u}`).join(" · ");
    case "date": return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    default: return String(v);
  }
}
const fieldsOf = (s) => s.fields || (s.groups || []).flatMap((g) => g.fields);

// The published baseline of an offer, optionally as seen through one package.
function baselineOf(item, pkg) {
  const ov = { ...(BASE_OVERRIDES[item.id] || {}), ...((pkg && pkg.overrides) || {}) };
  return SHOWN_SECTIONS.map((sid) => {
    const s = SECTIONS.find((x) => x.id === sid);
    const fields = fieldsOf(s)
      .filter((f) => f.type !== "textarea" && f.type !== "date")
      .map((f) => {
        const raw = ov[f.id] !== undefined ? ov[f.id] : f.def;
        return { id: f.id, label: f.label, meaning: f.meaning, value: fmt(f, raw), auto: AUTO_ACCEPT.has(f.id), custom: ov[f.id] !== undefined };
      })
      .filter((f) => f.value !== "—");
    return { id: sid, label: SEC_LABEL[sid], icon: s.icon, fields };
  });
}

const packagesOf = (item) => PACKAGES[item.id] || [];
const policiesOf = (item, pkg) => (pkg ? pkg.policies : POLICIES[item.id] || []);
const fmtN = (n) => n.toLocaleString("en-US").replace(/,/g, " ");
// A package includes a subset of the OFFER's own resources — named exactly as the
// offer page names them, so the card never claims a resource the offer does not have.
const resourceNames = (item) => Array.from({ length: item.resources || 1 }, (_, i) => item.name + (item.resources > 1 ? ` — part ${i + 1}` : ""));
const pkgResources = (item, pk) => resourceNames(item).slice(0, Math.max(1, Math.min(pk.res || item.resources || 1, item.resources || 1)));
const perPeriod = (pk) => (pk.billing || "Monthly").toLowerCase();
// "90 EUR / monthly" reads badly — say it the way the provider set it.
const billLabel = (pk) => ({ "One shot": "one shot", Daily: "/ day", Monthly: "/ month", Yearly: "/ year", "Per API call": "/ API call" })[pk.billing || "Monthly"] || perPeriod(pk);
const pkgSummary = (pk) => [
  `${pk.name}`,
  pk.sub === 0 ? "Free" : `${fmtN(pk.sub)} ${pk.currency} ${billLabel(pk)}`,
  pk.setup ? `${fmtN(pk.setup)} ${pk.currency} set-up` : null,
  pk.api ? `${pk.api} ${pk.currency} per API call` : null,
].filter(Boolean).join(" · ");
const priceLabel = (item) => {
  const pk = packagesOf(item);
  if (pk.length) { const min = Math.min(...pk.map((p) => p.sub)); return min === 0 ? "Free tier available" : `from ${min} EUR/month`; }
  return item.price ? `${item.price.amount}${item.price.period ? ` · per ${item.price.period.toLowerCase()}` : ""}` : "On request";
};

// ─── SHARED BLOCKS ────────────────────────────────────────────────────────────
function PolicyChips({ list }) {
  if (!list.length) return <span className="ofd-pol none">No usage policy — used without restriction</span>;
  return <>{list.map((p) => <span className="ofd-pol" key={p}>{p}</span>)}</>;
}

function PackageGrid({ item, selected, onSelect, carousel }) {
  const pkgs = packagesOf(item);
  const track = React.useRef(null);
  const [at, setAt] = React.useState({ start: true, end: false });
  const sync = () => { const el = track.current; if (!el) return; setAt({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 }); };
  React.useEffect(() => { if (carousel) sync(); }, [carousel, pkgs.length]);
  const nudge = (dir) => { const el = track.current; if (!el) return; const cards = [...el.querySelectorAll(".ofd-pkg")]; const max = el.scrollWidth - el.clientWidth; const cur = el.scrollLeft; const offs = cards.map((c) => c.offsetLeft - cards[0].offsetLeft); const next = dir > 0 ? offs.find((o) => o > cur + 4) : [...offs].reverse().find((o) => o < cur - 4); el.scrollTo({ left: Math.max(0, Math.min(next == null ? (dir > 0 ? max : 0) : next, max)), behavior: "smooth" }); };
  if (!pkgs.length) return null;
  const cards = pkgs.map((pk) => {
        const on = selected === pk.id;
        return (
          <div className={`ofd-pkg${pk.recommended ? " reco" : ""}${on ? " on" : ""}`} key={pk.id}>
            {pk.recommended && <span className="ofd-pkg-flag"><Icon name="star" size={9} /> Recommended</span>}
            <div className="ofd-pkg-name">{pk.name}</div>
            <div className="ofd-pkg-price">{pk.sub === 0 ? "Free" : `${fmtN(pk.sub)} ${pk.currency}`}<span>{pk.sub === 0 ? "" : " " + billLabel(pk)}</span></div>
            <div className="ofd-pkg-price-meta">
              <span>{pk.setup ? `${fmtN(pk.setup)} ${pk.currency} set-up fee` : "No set-up fee"}</span>
              <span>{pk.api ? `${pk.api} ${pk.currency} per API call` : "No per-call cost"}</span>
            </div>
            {pk.neg
              ? <div className="ofd-pkg-neg"><Icon name="triggers" size={10} /> Price negotiable{pk.accept ? <b>{fmtN(pk.accept.min)}–{fmtN(pk.accept.max)} {pk.currency}</b> : null}</div>
              : <div className="ofd-pkg-fix"><Icon name="lock" size={10} /> Price fixed as published</div>}
            <div className="ofd-pkg-desc">{pk.desc}</div>
            <div className="ofd-pkg-res">
              <span className="ofd-pkg-reslab">Resources included ({pkgResources(item, pk).length} of {item.resources})</span>
              <span className="ofd-pol-row">{pkgResources(item, pk).map((r) => <span className="ofd-res" key={r}>{r}</span>)}</span>
            </div>
            <div className="ofd-pkg-res">
              <span className="ofd-pkg-reslab">Usage policies</span>
              <span className="ofd-pol-row"><PolicyChips list={pk.policies} /></span>
            </div>
            {onSelect && <button type="button" className={on ? "ofd-pkg-btn on" : "ofd-pkg-btn"} onClick={() => onSelect(on ? null : pk.id)} aria-pressed={on}>
              {on ? <><Icon name="check" size={13} /> Shown below</> : "See its baseline"}
            </button>}
          </div>
        );
  });
  if (!carousel) return <div className="ofd-pkgs">{cards}</div>;
  return (
    <div className="ofd-carousel">
      <div className="ofd-pkgs track" ref={track} onScroll={sync}>{cards}</div>
      {!at.start && <button type="button" className="ofd-carousel-btn side left" onClick={() => nudge(-1)} aria-label="Previous packages"><Icon name="chevronLeft" size={16} /></button>}
      {!at.end && <button type="button" className="ofd-carousel-btn side right" onClick={() => nudge(1)} aria-label="Next packages"><Icon name="chevronRight" size={16} /></button>}
    </div>
  );
}

function BaselineTable({ item, pkg, compact }) {
  const secs = baselineOf(item, pkg);
  return (
    <div className={compact ? "ofd-base compact" : "ofd-base"}>
      {secs.map((s) => (
        <div className="ofd-bsec" key={s.id}>
          <div className="ofd-bsec-head"><Icon name={s.icon} size={13} /> {s.label}</div>
          {s.fields.map((f) => (
            <div className="ofd-brow" key={f.id}>
              <span className="ofd-bk" title={f.meaning}>{f.label}</span>
              <span className="ofd-bv">{f.value}</span>
              <span className={f.auto ? "ofd-btag auto" : "ofd-btag"}>{f.auto ? <><Icon name="triggers" size={9} /> Auto-accept</> : <><Icon name="lock" size={9} /> Fixed</>}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

window.CatOffer = { packagesOf, policiesOf, baselineOf, priceLabel, fmtN, billLabel, pkgSummary, resourceNames, pkgResources, PackageGrid, BaselineTable, PolicyChips, AUTO_ACCEPT };
})();
