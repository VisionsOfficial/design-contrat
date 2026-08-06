// VisionsTrust — Basket · PII variant · shared shell (23/07).
// Page chrome, 4-step stepper, flow bar and the read-only field primitives used by
// step 3 (assign a consuming service) and step 4 (recap & finalise).
(function () {
  const { useState } = React;
  const { Icon } = window.UI;
  const { AppLayout } = window.VTLayout;
  const { initials, hexToRgba } = window.CatData;

  const STEP4 = "FINAL%20basket_pii_step4.html";
  const STEP5 = "FINAL%20basket_pii_step5.html";
  const BASKET = "FINAL%20basket.html";
  const LS_KEY = "vt.basketPii.v1";

  const STEPS = [
  { n: 1, label: "Review & negotiate", href: BASKET },
  { n: 2, label: "Assign to project", href: BASKET },
  { n: 3, label: "Assign a consuming service", href: STEP4 },
  { n: 4, label: "Recap & finalise", href: STEP5 }];


  function Stepper({ step }) {
    return (
      <ol className="bk-stepper">
      {STEPS.map((s, i) => {
          const state = step === s.n ? "current" : s.n < step ? "done" : "todo";
          const linked = s.n !== step && s.n <= step;
          const inner =
          <>
            <span className="bk-step-dot">{state === "done" ? <Icon name="check" size={15} /> : s.n}</span>
            <span className="bk-step-txt"><span className="bk-step-idx">Step {s.n}</span><span className="bk-step-name">{s.label}</span></span>
          </>;

          return (
            <li key={s.n} className={`bk-step ${state}`}>
            {i > 0 && <span className={`bk-step-line ${s.n <= step ? "fill" : ""}`} aria-hidden="true"></span>}
            {linked ?
              <a className="bk-step-btn" href={s.href}>{inner}</a> :
              <span className="bk-step-btn" aria-current={state === "current" ? "step" : undefined}>{inner}</span>}
          </li>);

        })}
    </ol>);

  }

  function Mono({ offer, size = 40 }) {
    return (
      <div className="bk-mono" style={{ width: size, height: size, background: `linear-gradient(135deg, ${hexToRgba(offer.accent, 0.9)}, ${hexToRgba(offer.accent, 0.55)})` }} aria-hidden="true">
      {initials(offer.name)}
    </div>);

  }

  // Small pill: monogram + name + provider. Used in the flow bar.
  function OfferChip({ offer, role }) {
    return (
      <span className="pii-chip">
      <Mono offer={offer} size={26} />
      <span className="pii-chip-txt">
        <span className="pii-chip-name">{offer.name}</span>
        <span className="pii-chip-by">{role || offer.provider}</span>
      </span>
    </span>);

  }

  // Persistent context strip: what this basket is about, carried across steps 4 → 5.
  function FlowBar({ dataOffer, project, service, services }) {
    const list = services && services.length ? services : service ? [service] : [];
    return (
      <div className="pii-flowbar">
        <div className="pii-fb-cell">
          <span className="pii-flowbar-k"><Icon name="database" size={13} /> Personal-data offer</span>
          <div className="pii-fb-items"><OfferChip offer={dataOffer} /></div>
        </div>
        <div className="pii-fb-cell">
          <span className="pii-flowbar-k"><Icon name="folder" size={13} /> Project</span>
          <div className="pii-fb-items"><span className="pii-proj-chip">{project.name}</span></div>
        </div>
        {list.length > 0 && (
          <div className="pii-fb-cell wide">
            <span className="pii-flowbar-k"><Icon name="layers" size={13} /> {list.length > 1 ? `Consuming services (${list.length})` : "Consuming service"}</span>
            <div className="pii-fb-items">{list.map((s) => <OfferChip key={s.id} offer={s} />)}</div>
          </div>
        )}
      </div>);
  }

  // ─── READ-ONLY FIELD PRIMITIVES ──────────────────────────────────────────────
  // Locked = grey field, padlock, "Not negotiable". Agreed = teal field, tick.
  function Panel({ tone = "data", icon, title, sub, badge, children }) {
    return (
      <section className="pii-panel">
      <header className="pii-panel-head">
        <span className={`pii-panel-ic ${tone}`}><Icon name={icon} size={16} /></span>
        <div className="pii-panel-txt">
          <div className="pii-panel-t">{title}</div>
          {sub && <div className="pii-panel-s">{sub}</div>}
        </div>
        {badge}
      </header>
      <div className="pii-grid">{children}</div>
    </section>);

  }
  const LockBadge = ({ label = "Not negotiable" }) => <span className="pii-lockbadge"><Icon name="lock" size={11} /> {label}</span>;
  const AgreedBadge = ({ label = "Agreed in step 1" }) => <span className="pii-agreedbadge"><Icon name="check" size={11} /> {label}</span>;

  function Row({ k, v, wide, agreed }) {
    return (
      <div className={`pii-row ${wide ? "full" : ""} ${agreed ? "agreed" : "locked"}`}>
      <span className="pii-row-k"><Icon name={agreed ? "check" : "lock"} size={11} /> {k}</span>
      <span className="pii-row-v">{v}</span>
    </div>);

  }

  function PageShell({ step, cartCount = 2, children }) {
    return (
      <AppLayout title="Basket" activeId="catalogue" cartCount={cartCount} className="bk-app pii-app">
      <div className="bk-page">
        <div className="bk-flow">
          <Stepper step={step} />
          {children}
        </div>
      </div>
    </AppLayout>);

  }

  // Shared hand-off between the two pages (chosen service + demo scenario).
  const readFlow = () => {try {return JSON.parse(localStorage.getItem(LS_KEY)) || {};} catch (e) {return {};}};
  const writeFlow = (patch) => {try {localStorage.setItem(LS_KEY, JSON.stringify({ ...readFlow(), ...patch }));} catch (e) {}};

  window.BKPII = { STEP4, STEP5, BASKET, Stepper, Mono, OfferChip, FlowBar, Panel, Row, LockBadge, AgreedBadge, PageShell, readFlow, writeFlow };
})();