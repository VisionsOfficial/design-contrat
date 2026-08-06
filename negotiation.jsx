// VisionsTrust — Negotiation review (provider side).
// The project orchestrator has proposed terms for using one of YOUR offers in their
// project. This screen shows what they changed vs. the terms you published in Offer
// Settings, whether each change falls inside your acceptance ranges, and lets you
// Accept, send a Counter-offer, or Decline.
(function () {
const { useState, useEffect, useMemo, useRef } = React;
const { Icon, AppSidebar, BottomNav, BottomNavSheet } = window.UI;
const { SECTIONS, ALL_FIELDS } = window.OfferSettingsData;
const { ITEMS } = window.BasketData;
const { initials, hexToRgba } = window.CatData;

const LS_KEY = "vt.negotiation.v1";
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isEmpty = (v) => v === "" || v == null || (Array.isArray(v) && v.length === 0);

// ─── VALUE FORMATTING ─────────────────────────────────────────────────────────
function fmtVal(field, v) {
  if (isEmpty(v)) return "—";
  switch (field.type) {
    case "numberUnit": return `${v.n}${v.u ? " " + v.u : ""}${v.b ? " · " + v.b : ""}`;
    case "multiselect": return v.join(", ");
    case "opValue": return `${v.op} ${v.v}`;
    case "procDeadline": return !/Immediate/.test(v.p) && v.d != null ? `${v.p} · ${v.d}d` : v.p;
    case "matrix": return Object.entries(v).map(([k, x]) => `${k} ${x.n}${x.u}`).join(" · ");
    case "date": return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    default: return String(v);
  }
}

// ─── ACCEPTANCE LOGIC (from the provider's point of view) ───────────────────────
function inAccept(field, value, accept) {
  if (accept == null) return false;
  switch (field.type) {
    case "numberUnit": return value && typeof accept === "object" && !Array.isArray(accept)
      && value.n >= accept.min && value.n <= accept.max;
    case "multiselect": return Array.isArray(value) && value.length > 0 && value.every((v) => accept.includes(v));
    case "select": case "yesno": return Array.isArray(accept) && accept.includes(value);
    default: return false;
  }
}
function acceptText(field, accept) {
  if (accept == null) return "No published range — this change is at your discretion.";
  if (field.type === "numberUnit") return `Your published range: ${accept.min}–${accept.max} ${field.units[0]}.`;
  if (Array.isArray(accept)) return `You published: ${accept.join(", ")}.`;
  return "At your discretion.";
}

// ─── SCENARIO ───────────────────────────────────────────────────────────────
// The offer under negotiation + the project it's for.
const OFFER = ITEMS.find((o) => o.id === "data_offer_1");
const PROJECT = { name: "SERVICE_PROVIDER_DSUC_CHAIN", org: "TECHNÉ", orchestrator: "Techné", caption: "VR learning analytics chain", desc: "Chained data-space use case aggregating VR session telemetry to power a learning-analytics dashboard for vocational training providers." };

// The orchestrator's proposed values (only fields they touched). Everything else
// is left at your published baseline.
const PROPOSED = {
  delivery_deadline: { n: 3, u: "business days" },
  availability: "99.9%",
  update_frequency: "Real-time / streaming",
  support_hours: "Extended 5×12",
  retention_period: "Contract duration",
  renewal_mode: "On mutual agreement",
  notice_nonrenewal: { n: 90, u: "days" },
  notice_early: { n: 60, u: "days" },
};
const PROPOSED_PRICING = { sub: "2", billing: "One shot", setup: "0", api: "0", currency: "EUR", desc: "Single up-front fee for the chain pilot; revisit at renewal." };

const TERM_SECTION_IDS = ["sla", "duration", "termination"];
const SEC_META = {
  sla: { title: "Service levels (SLA)", icon: "clock" },
  duration: { title: "Duration & renewal", icon: "hourglass" },
  termination: { title: "Termination", icon: "danger" },
};
function fieldsOf(section) { return section.fields || (section.groups || []).flatMap((g) => g.fields); }

function buildTerms() {
  const ov = OFFER.overrides || {};
  const sections = TERM_SECTION_IDS.map((sid) => {
    const s = SECTIONS.find((x) => x.id === sid);
    const rows = fieldsOf(s).map((f) => {
      const o = ov[f.id] || {};
      const baseline = o.value !== undefined ? clone(o.value) : clone(f.def);
      const neg = o.neg !== undefined ? o.neg : !!f.neg;
      const accept = o.accept !== undefined ? o.accept : (f.accept || null);
      const hasProp = Object.prototype.hasOwnProperty.call(PROPOSED, f.id);
      const proposed = hasProp ? clone(PROPOSED[f.id]) : clone(baseline);
      const changed = hasProp && !eq(proposed, baseline);
      const within = changed ? inAccept(f, proposed, accept) : true;
      return { field: f, baseline, proposed, neg, accept, changed, within, empty: isEmpty(baseline) };
    }).filter((r) => !r.empty);
    return { id: s.id, ...SEC_META[sid], rows };
  });
  // Fixed provider commitments (penalties) — read-only, never negotiated.
  const penSec = SECTIONS.find((s) => s.id === "penalties");
  const penalty = {};
  penSec.fields.forEach((f) => { penalty[f.id] = clone(f.def); });
  return { sections, penalty };
}

// ─── INPUTS (counter-offer mode) ────────────────────────────────────────────
const Sel = ({ value, onChange, options, width }) => (
  <span className="os-selectw" style={width ? { width } : undefined}>
    <select className="os-in" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <Icon name="chevronDown" size={13} className="os-chev" />
  </span>
);
const Num = ({ value, onChange }) => (
  <input type="number" className="os-in num" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
);
function EditControl({ field, value, onChange }) {
  switch (field.type) {
    case "text": return <input className="os-in sm" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "yesno": return <div className="seg2 mini">{["Yes", "No"].map((o) => <button key={o} type="button" className={value === o ? "active teal" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>;
    case "select": return <Sel value={value} onChange={onChange} options={field.options} />;
    case "numberUnit": return (<><Num value={value?.n} onChange={(n) => onChange({ ...value, n })} /><Sel value={value?.u} onChange={(u) => onChange({ ...value, u })} options={field.units} />{field.basis && <Sel value={value?.b} onChange={(b) => onChange({ ...value, b })} options={field.basis} />}</>);
    case "multiselect": return (<div className="os-chips" style={{ justifyContent: "flex-start" }}>{field.options.map((o) => { const on = (value || []).includes(o); return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])}>{o}</button>; })}</div>);
    default: return <span className="ng-val">{fmtVal(field, value)}</span>;
  }
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────
function Monogram({ size = 44 }) {
  return <div className="bk-mono" style={{ width: size, height: size, background: `linear-gradient(135deg, ${hexToRgba(OFFER.accent, 0.9)}, ${hexToRgba(OFFER.accent, 0.55)})` }} aria-hidden="true">{initials(OFFER.name)}</div>;
}
function StatusChip({ within }) {
  return within
    ? <span className="bk-st st-auto"><Icon name="check" size={11} /> Within your range</span>
    : <span className="bk-st st-review"><Icon name="triggers" size={11} /> Needs your decision</span>;
}

// ─── ONE NEGOTIATED FIELD (diff row) ───────────────────────────────────────────
function DiffRow({ row, counter, counterVal, onCounter }) {
  const { field, baseline, proposed, within, accept } = row;
  return (
    <div className={`ng-diff ${within ? "ok" : "attn"}`}>
      <div className="ng-diff-main">
        <div className="ng-diff-head">
          <span className="ng-diff-name">{field.label}</span>
          <span className="ng-diff-info" title={field.meaning}><Icon name="info" size={12} /></span>
          <StatusChip within={within} />
        </div>
        <div className="ng-diff-vals">
          <span className="ng-vlabel">You published</span>
          <span className="ng-old">{fmtVal(field, baseline)}</span>
          <Icon name="arrowRight" size={14} className="ng-arrow" />
          <span className="ng-vlabel">They propose</span>
          <span className="ng-new">{fmtVal(field, proposed)}</span>
        </div>
        <div className="ng-diff-foot">{acceptText(field, accept)}</div>
      </div>
      {counter && (
        <div className="ng-counter">
          <span className="ng-counter-label"><Icon name="pen" size={12} /> Your counter</span>
          <div className="ng-counter-ctl"><EditControl field={field} value={counterVal} onChange={onCounter} /></div>
          {!eq(counterVal, proposed) && <button type="button" className="bk-reset" onClick={() => onCounter(clone(proposed))}>Match their proposal</button>}
        </div>
      )}
    </div>
  );
}

// ─── UNCHANGED FIELD (full review) ──────────────────────────────────────────────
function KeptRow({ row }) {
  const { field, baseline, neg } = row;
  return (
    <div className="ng-kept">
      <span className="ng-kept-name">{field.label}{neg && <span className="ng-negtag" title="You left this negotiable">negotiable</span>}</span>
      <span className="ng-kept-val">{fmtVal(field, baseline)}</span>
    </div>
  );
}

// ─── SECTION ────────────────────────────────────────────────────────────────────
function TermSection({ sec, view, counter, counters, setCounter }) {
  const changed = sec.rows.filter((r) => r.changed);
  const kept = sec.rows.filter((r) => !r.changed);
  if (view === "changes" && changed.length === 0) return null;
  return (
    <section className="ng-sec" id={`ng-${sec.id}`}>
      <header className="ng-sec-head">
        <span className="ng-sec-ic"><Icon name={sec.icon} size={15} /></span>
        <h2>{sec.title}</h2>
        {changed.length > 0 && <span className="ng-sec-count">{`${changed.length} changed`}</span>}
      </header>
      {changed.length > 0 && (
        <div className="ng-diffs">
          {changed.map((r) => (
            <DiffRow key={r.field.id} row={r} counter={counter}
              counterVal={counters[r.field.id]} onCounter={(v) => setCounter(r.field.id, v)} />
          ))}
        </div>
      )}
      {view === "full" && kept.length > 0 && (
        <div className="ng-kept-block">
          <div className="ng-kept-label">Unchanged — accepted as you published</div>
          <div className="ng-kept-grid">{kept.map((r) => <KeptRow key={r.field.id} row={r} />)}</div>
        </div>
      )}
    </section>
  );
}

// ─── PRICING ───────────────────────────────────────────────────────────────────
const PRICE_FIELDS = [
  { k: "sub", label: "Subscription pricing" },
  { k: "billing", label: "Billing period" },
  { k: "setup", label: "Setup fee" },
  { k: "api", label: "Cost per API call" },
  { k: "currency", label: "Currency" },
];
function PricingSection({ view, counter, counters, setCounter }) {
  const base = OFFER.pricing;
  const changedKeys = PRICE_FIELDS.filter((f) => String(base[f.k]) !== String(PROPOSED_PRICING[f.k]));
  if (view === "changes" && changedKeys.length === 0) return null;
  const rows = view === "full" ? PRICE_FIELDS : changedKeys;
  return (
    <section className="ng-sec" id="ng-pricing">
      <header className="ng-sec-head">
        <span className="ng-sec-ic"><Icon name="coin" size={15} /></span>
        <h2>Pricing</h2>
        {changedKeys.length > 0 && <span className="ng-sec-count">{`${changedKeys.length} changed`}</span>}
      </header>
      <div className="ng-diffs">
        {rows.map((f) => {
          const b = String(base[f.k] ?? "—"), p = String(PROPOSED_PRICING[f.k] ?? "—");
          const money = (v) => (["sub", "setup", "api"].includes(f.k) ? `${v} ${PROPOSED_PRICING.currency}` : v);
          const chg = b !== p;
          if (!chg) return <div className="ng-kept price" key={f.k}><span className="ng-kept-name">{f.label}</span><span className="ng-kept-val">{money(b)}</span></div>;
          return (
            <div className="ng-diff ok" key={f.k}>
              <div className="ng-diff-main">
                <div className="ng-diff-head"><span className="ng-diff-name">{f.label}</span><span className="bk-st st-price"><Icon name="coin" size={11} /> Price change</span></div>
                <div className="ng-diff-vals"><span className="ng-vlabel">You published</span><span className="ng-old">{money(b)}</span><Icon name="arrowRight" size={14} className="ng-arrow" /><span className="ng-vlabel">They propose</span><span className="ng-new">{money(p)}</span></div>
              </div>
              {counter && f.k === "sub" && (
                <div className="ng-counter"><span className="ng-counter-label"><Icon name="pen" size={12} /> Your counter</span>
                  <div className="ng-counter-ctl"><input className="os-in" style={{ width: 120 }} value={counters.__price ?? p} onChange={(e) => setCounter("__price", e.target.value)} /><span className="ng-unit">{PROPOSED_PRICING.currency}</span></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {view === "full" && PROPOSED_PRICING.desc && (
        <div className="ng-price-note"><span className="ng-kept-label">Pricing note from orchestrator</span><p>{PROPOSED_PRICING.desc}</p></div>
      )}
    </section>
  );
}

// ─── PROJECT & OFFER (context) ─────────────────────────────────────────────────
function ContextSection({ view }) {
  return (
    <section className="ng-sec" id="ng-context">
      <header className="ng-sec-head"><span className="ng-sec-ic"><Icon name="folder" size={15} /></span><h2>Project &amp; offer</h2></header>
      <div className="ng-context-grid">
        <div className="ng-ctx-card">
          <div className="ng-ctx-tag"><Icon name="projects" size={13} /> For which project</div>
          <div className="ng-ctx-row">
            <div className="bk-proj-logo">{PROJECT.org}</div>
            <div><div className="ng-ctx-name">{PROJECT.name}</div><div className="ng-ctx-cap">{PROJECT.caption}</div></div>
          </div>
          <p className="ng-ctx-desc">{PROJECT.desc}</p>
          <div className="ng-ctx-meta">Orchestrated by <b>{PROJECT.orchestrator}</b></div>
        </div>
        <div className="ng-ctx-card">
          <div className="ng-ctx-tag"><Icon name="layers" size={13} /> Which of your offers</div>
          <div className="ng-ctx-row">
            <Monogram size={44} />
            <div><div className="ng-ctx-name">{OFFER.name}</div><div className="ng-ctx-cap">{OFFER.desc}</div></div>
          </div>
          <div className="ng-resources">
            <div className="ng-res-label">1 resource in this offer</div>
            <div className="ng-res-item"><Icon name="database" size={14} /><span>{OFFER.name}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── PENALTIES (fixed) ──────────────────────────────────────────────────────────
function PenaltySection({ penalty, view }) {
  if (view === "changes") return null;
  return (
    <section className="ng-sec" id="ng-penalties">
      <header className="ng-sec-head"><span className="ng-sec-ic"><Icon name="shield" size={15} /></span><h2>Commitments &amp; penalties</h2><span className="bk-st st-fixed"><Icon name="lock" size={11} /> Fixed</span></header>
      <div className="ng-commit">
        <Icon name="shield" size={16} />
        <span>Backed by a <b>{penalty.consequence_type}</b> penalty if <b>{penalty.commitment_concerned}</b> falls {penalty.trigger_threshold.op} {penalty.trigger_threshold.v} ({penalty.penalty_amount.n} {penalty.penalty_amount.u}, assessed {penalty.measurement_period.toLowerCase()}). These commitments are not part of this negotiation.</span>
      </div>
    </section>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function NegotiationApp() {
  const terms = useMemo(buildTerms, []);
  const allRows = useMemo(() => terms.sections.flatMap((s) => s.rows), [terms]);
  const changedRows = allRows.filter((r) => r.changed);
  const attn = changedRows.filter((r) => !r.within).length;
  const withinN = changedRows.filter((r) => r.within).length;
  const priceChanges = PRICE_FIELDS.filter((f) => String(OFFER.pricing[f.k]) !== String(PROPOSED_PRICING[f.k])).length;
  const totalChanges = changedRows.length + priceChanges;
  const sectionsWithChanges = terms.sections.filter((s) => s.rows.some((r) => r.changed));

  const load = () => {
    try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    return { view: "changes", decision: null };
  };
  const [ui, setUi] = useState(load);
  const view = ui.view, decision = ui.decision;
  const setView = (v) => setUi((s) => ({ ...s, view: v }));
  const [counter, setCounter] = useState(false);
  const [counters, setCounters] = useState(() => {
    const c = {}; changedRows.forEach((r) => { c[r.field.id] = clone(r.proposed); }); c.__price = PROPOSED_PRICING.sub; return c;
  });
  const setCounterVal = (id, v) => setCounters((s) => ({ ...s, [id]: v }));
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(ui)); } catch (e) {} }, [ui]);

  const decide = (d) => setUi((s) => ({ ...s, decision: d }));
  const startCounter = () => { setCounter(true); if (view !== "full") setView("changes"); };

  const TOC = [
    { id: "ng-context", label: "Project & offer", n: null },
    { id: "ng-pricing", label: "Pricing", n: priceChanges },
    ...sectionsWithChanges.map((s) => ({ id: `ng-${s.id}`, label: s.title, n: s.rows.filter((r) => r.changed).length })),
    { id: "ng-penalties", label: "Commitments & penalties", n: null, fixed: true },
  ];
  const visibleTOC = view === "changes" ? TOC.filter((t) => t.n || t.id === "ng-context") : TOC;

  return (
    <div className="app ui-v2 ng-app">
      <a href="#ng-main" className="skip-link">Skip to content</a>
      <AppSidebar variant="v2" activeId="myprojects" />
      <div className="main">
        <header className="topbar cat-topbar">
          <div className="topbar-left"><div className="page-title"><Icon name="scale" size={20} /><h1>Negotiation</h1></div></div>
          <div className="topbar-right">
            <button type="button" className="icon-btn ghost" aria-label="Basket"><Icon name="cart" size={18} /><span className="notif-dot" aria-hidden="true">2</span></button>
            <button type="button" className="icon-btn ghost hide-mobile" aria-label="Language"><Icon name="translate" size={18} /></button>
            <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16} /><span>Help</span></button>
            <button type="button" className="icon-btn ghost notif" aria-label="Notifications, 54 unread"><Icon name="bell" size={18} /><span className="notif-dot" aria-hidden="true">54</span></button>
            <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18} /></button>
          </div>
        </header>

        <main className="content ng-content" id="ng-main" tabIndex={-1}>
          <div className="ng-page">
            <div className="ng-pagehead">
              <h1>Reviewing negotiation</h1>
              <p>The orchestrator of <b>{PROJECT.name}</b> has proposed terms for using your offer <b>{OFFER.name}</b> in their project. Review what changed against your published offer, then respond.</p>
            </div>

            {/* ── STICKY ACTION BAR ────────────────────────────────────── */}
            <div className={`ng-actionbar ${decision ? "decided" : ""}`}>
              <div className="ng-round">
                <span className="ng-round-badge">Round 2</span>
                <span className="ng-round-meta">Proposed by {PROJECT.orchestrator} · 3 days ago</span>
              </div>
              {decision ? (
                <div className={`ng-decision ${decision}`}>
                  <Icon name={decision === "accepted" ? "check" : decision === "countered" ? "pen" : "x"} size={15} />
                  <span>{decision === "accepted" ? "Accepted — the orchestrator has been notified." : decision === "countered" ? "Counter-offer sent — awaiting the orchestrator." : "Declined — the orchestrator has been notified."}</span>
                  <button type="button" className="ng-undo" onClick={() => { decide(null); setCounter(false); }}>Undo</button>
                </div>
              ) : counter ? (
                <div className="ng-actions">
                  <button type="button" className="ng-btn ghost" onClick={() => setCounter(false)}>Cancel</button>
                  <button type="button" className="ng-btn primary" onClick={() => { decide("countered"); setCounter(false); }}><Icon name="arrowRight" size={15} /> Send counter-offer</button>
                </div>
              ) : (
                <div className="ng-actions">
                  <button type="button" className="ng-btn danger" onClick={() => decide("declined")}><Icon name="x" size={15} /> Decline</button>
                  <button type="button" className="ng-btn ghost" onClick={startCounter}><Icon name="pen" size={15} /> Counter-offer</button>
                  <button type="button" className="ng-btn primary" onClick={() => decide("accepted")}><Icon name="check" size={15} /> Accept all</button>
                </div>
              )}
            </div>

            {/* ── SUMMARY ──────────────────────────────────────────────── */}
            <div className={`ng-summary ${attn ? "attn" : "ok"}`}>
              <div className="ng-sum-ic"><Icon name={attn ? "triggers" : "check"} size={18} /></div>
              <div className="ng-sum-txt">
                {totalChanges === 0
                  ? <span>No changes — the orchestrator accepted your published offer as-is.</span>
                  : <span>The orchestrator changed <b>{totalChanges}</b> term{totalChanges !== 1 ? "s" : ""}. {attn > 0 ? <><b>{attn}</b> fall{attn === 1 ? "s" : ""} outside your acceptance ranges and need your decision</> : <>All fall within your acceptance ranges</>}{priceChanges > 0 && <> · <b>{priceChanges}</b> pricing change{priceChanges !== 1 ? "s" : ""}</>}.</span>}
              </div>
              <div className="ng-sum-stats">
                <span className="ng-stat attn"><b>{attn}</b> need review</span>
                <span className="ng-stat ok"><b>{withinN}</b> within range</span>
              </div>
            </div>

            {counter && <div className="ng-counter-banner"><Icon name="pen" size={15} /><span><b>Counter-offer mode.</b> Adjust the values below to what you're willing to commit, then send it back to the orchestrator.</span></div>}

            {/* ── VIEW SWITCH ──────────────────────────────────────────── */}
            <div className="ng-viewswitch">
              <div className="seg2">
                <button type="button" className={view === "changes" ? "active teal" : ""} onClick={() => setView("changes")}><Icon name="triggers" size={13} /> Changes only <span className="ng-vs-count">{totalChanges}</span></button>
                <button type="button" className={view === "full" ? "active teal" : ""} onClick={() => setView("full")}><Icon name="list" size={13} /> Full offer</button>
              </div>
            </div>

            {/* ── BODY: TOC + SECTIONS ─────────────────────────────────── */}
            <div className="ng-body">
              <nav className="ng-toc" aria-label="Sections">
                {visibleTOC.map((t) => (
                  <a key={t.id} className="ng-toc-item" href={`#${t.id}`}>
                    <span className="ng-toc-label">{t.label}</span>
                    {t.n ? <span className="ng-toc-n">{t.n}</span> : t.fixed ? <Icon name="lock" size={12} className="ng-toc-lock" /> : null}
                  </a>
                ))}
                <div className="ng-legend">
                  <div className="ng-legend-row"><span className="ng-dot ok" /> Within your published range</div>
                  <div className="ng-legend-row"><span className="ng-dot attn" /> Outside — needs your decision</div>
                </div>
              </nav>

              <div className="ng-sections">
                <ContextSection view={view} />
                <PricingSection view={view} counter={counter} counters={counters} setCounter={setCounterVal} />
                {terms.sections.map((sec) => (
                  <TermSection key={sec.id} sec={sec} view={view} counter={counter} counters={counters} setCounter={setCounterVal} />
                ))}
                <PenaltySection penalty={terms.penalty} view={view} />
              </div>
            </div>
          </div>
        </main>
      </div>

      <BottomNav onOpenMore={() => setMoreOpen(true)} />
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<NegotiationApp />);
})();
