// VisionsTrust — Demo 07/08 · shared UI blocks.
// Every block below is lifted from the two reference pages (FINAL Offer, FINAL Basket
// merged) and re-plumbed on window.Demo, so the five demo screens share one vocabulary.
(function () {
const { useState, useEffect, useRef } = React;
const { Icon } = window.UI;
const D = window.Demo;
const { fmtVal, fmtN, initials, hexToRgba, isEmpty, eq, isGap, KIND_TONE, PII_LABEL } = D;

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ flash }) {
  const [shown, setShown] = useState(!!flash);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setShown(false), 4200); return () => clearTimeout(t); }, [flash]);
  if (!flash || !shown) return null;
  return (
    <div className={`dm-toast ${flash.tone || "ok"}`} role="status">
      <span className="dm-toast-ic"><Icon name={flash.tone === "info" ? "info" : "check"} size={15} /></span>
      <span>{flash.msg}</span>
      <button type="button" className="dm-toast-x" onClick={() => setShown(false)} aria-label="Dismiss"><Icon name="x" size={14} /></button>
    </div>
  );
}

// ─── IDENTITY ─────────────────────────────────────────────────────────────────
const Monogram = ({ offer, size = 46 }) => (
  <div className="bk-mono" style={{ width: size, height: size, background: `linear-gradient(135deg, ${hexToRgba(offer.accent, 0.9)}, ${hexToRgba(offer.accent, 0.55)})` }} aria-hidden="true">{initials(offer.name)}</div>
);
const PiiTag = ({ pii }) => pii ? (
  <span className={`dm-pii ${pii}`}><Icon name={pii === "contains" ? "database" : "shield"} size={11} /> {PII_LABEL[pii]}</span>
) : null;

function OfferHead({ offer, size = 46, children }) {
  const dot = KIND_TONE[offer.kind] || "#00a2ae";
  return (
    <div className="bk-offer-top">
      <Monogram offer={offer} size={size} />
      <div className="bk-offer-main">
        <div className="bk-offer-metarow">
          <span className="bk-kind" style={{ borderColor: hexToRgba(dot, .5), color: dot }}><span className="bk-kind-dot" style={{ background: dot }} />{offer.kind}</span>
          <span className="bk-offer-by">proposed by {offer.provider}</span>
          <PiiTag pii={offer.pii} />
        </div>
        <h3 className="bk-offer-name">{offer.name}</h3>
      </div>
      {children && <div className="bk-offer-actions">{children}</div>}
    </div>
  );
}

function StatusBadges({ offer }) {
  const s = D.scoreOf(offer);
  return (
    <div className="bk2-badges">
      {s.gapCount > 0
        ? <span className="bk2-badge gap"><Icon name="triggers" size={12} /><span><b>{s.gapCount}</b> gap{s.gapCount !== 1 ? "s" : ""}</span></span>
        : <span className="bk2-badge allok"><Icon name="check" size={12} /><span>No gaps</span></span>}
      {s.meetCount > 0 && <span className="bk2-badge meet"><Icon name="check" size={12} /><span><b>{s.meetCount}</b> meet</span></span>}
    </div>
  );
}

// ─── PRICE / POLICY FACTS ─────────────────────────────────────────────────────
const priceOf = (offer, pkg, prices) => {
  const cur = (prices || {})[offer.id];
  return cur != null && cur !== "" ? Number(cur) : Number(pkg ? pkg.price : 0);
};
const pkgPrice = (offer, pk) => (pk.price === 0 ? "Free" : `${fmtN(pk.price)} ${offer.currency}/month`);

function OfferFacts({ offer, pkg, prices }) {
  const pols = pkg ? pkg.policies : (offer.packages[0] || {}).policies || [];
  const cur = priceOf(offer, pkg, prices);
  const moved = pkg && cur !== Number(pkg.price);
  return (
    <div className="bk-facts">
      <div className="bk-fact">
        <span className="bk-fact-k"><Icon name="coin" size={12} /> Pricing</span>
        <span className="bk-fact-v">{moved ? <><s className="bkp-strike">{pkgPrice(offer, pkg)}</s> {fmtN(cur)} {offer.currency}/month</> : pkgPrice(offer, pkg)}{pkg && pkg.neg && !moved && <span className="bkp-tag"><Icon name="sliders" size={10} /> negotiable</span>}</span>
        <span className="bk-fact-s">{pkg ? `${pkg.name} · ${fmtN(pkg.vol)} ${offer.unit} · ${pkg.setup ? `set-up ${fmtN(pkg.setup)} ${offer.currency} once` : "no set-up fee"}` : "No package chosen"}</span>
      </div>
      <div className="bk-fact">
        <span className="bk-fact-k"><Icon name="shield" size={12} /> Usage policies</span>
        {pols.length
          ? <span className="bk-pkg-pols">{pols.map((x) => <span className="bk-pkg-pol" key={x}>{x}</span>)}</span>
          : <span className="bk-fact-s">No policy published — use without restriction</span>}
      </div>
    </div>
  );
}

// ─── PACKAGE CARDS — offer page (catalogue-offer.css vocabulary) ──────────────
function PackageGrid({ offer, selected, onSelect }) {
  return (
    <div className="ofd-pkgs">
      {offer.packages.map((pk) => {
        const on = selected === pk.id;
        return (
          <div className={`ofd-pkg${pk.recommended ? " reco" : ""}${on ? " on" : ""}`} key={pk.id}>
            {pk.recommended && <span className="ofd-pkg-flag"><Icon name="star" size={9} /> Recommended</span>}
            <div className="ofd-pkg-name">{pk.name}</div>
            <div className="ofd-pkg-price">{pk.price === 0 ? "Free" : `${fmtN(pk.price)} ${offer.currency}`}<span>{pk.price === 0 ? "" : " / month"}</span></div>
            <div className="ofd-pkg-price-meta">
              <span>{pk.setup ? `${fmtN(pk.setup)} ${offer.currency} set-up fee` : "No set-up fee"}</span>
              <span>{fmtN(pk.vol)} {offer.unit}</span>
            </div>
            {pk.neg
              ? <div className="ofd-pkg-neg"><Icon name="triggers" size={10} /> Price negotiable{pk.accept ? <b>{fmtN(pk.accept.min)}–{fmtN(pk.accept.max)} {offer.currency}</b> : null}</div>
              : <div className="ofd-pkg-fix"><Icon name="lock" size={10} /> Price fixed as published</div>}
            <div className="ofd-pkg-desc">{pk.desc}</div>
            <div className="ofd-pkg-res">
              <span className="ofd-pkg-reslab">Resources included ({pk.res} of {offer.resources})</span>
              <span className="ofd-pol-row">{resourceNames(offer).slice(0, pk.res).map((r) => <span className="ofd-res" key={r}>{r}</span>)}</span>
            </div>
            <div className="ofd-pkg-res">
              <span className="ofd-pkg-reslab">Usage policies</span>
              <span className="ofd-pol-row">{pk.policies.map((p) => <span className="ofd-pol" key={p}>{p}</span>)}</span>
            </div>
            {onSelect && (
              <button type="button" className={on ? "ofd-pkg-btn on" : "ofd-pkg-btn"} onClick={() => onSelect(pk.id)} aria-pressed={on}>
                {on ? <><Icon name="check" size={13} /> Selected</> : "Select this package"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
const resourceNames = (offer) => Array.from({ length: offer.resources || 1 }, (_, i) => offer.name + (offer.resources > 1 ? ` — part ${i + 1}` : ""));

// ─── PACKAGE CHOOSER — basket (basket3.css vocabulary) ────────────────────────
function PackagePicker({ offer, chosenId, onChoose }) {
  const pk = D.pkgById(offer, chosenId);
  if (pk) return (
    <div className="bk-pkg-chosen">
      <span className="bk-pkg-chosen-ic"><Icon name="coin" size={15} /></span>
      <div className="bk-pkg-chosen-main">
        <div className="bk-pkg-chosen-t">Package · <b>{pk.name}</b>{pk.recommended && <span className="bk-pkg-star"><Icon name="star" size={9} /> Recommended</span>}</div>
        <div className="bk-pkg-chosen-d">{pk.desc} Chosen on the offer page — the baseline below is the one this offer published.</div>
      </div>
      <a className="bk-btn ghost sm" href={`${D.PAGES.offer}?id=${offer.id}`}><Icon name="refresh" size={13} /> Change package</a>
    </div>
  );
  return (
    <div className="bk-pkg-pick">
      <div className="bk-pkg-head">
        <Icon name="coin" size={14} />
        <div><b>Choose a package to continue</b><span>This offer comes in {offer.packages.length} formulas. The formula sets the price, the volume and the usage policies.</span></div>
      </div>
      <div className="bk-pkg-grid">
        {offer.packages.map((p) => (
          <div className={`bk-pkg-opt${p.recommended ? " reco" : ""}`} key={p.id}>
            {p.recommended && <span className="bk-pkg-flag"><Icon name="star" size={9} /> Recommended</span>}
            <div className="bk-pkg-name">{p.name}</div>
            <div className="bk-pkg-price">{p.price === 0 ? "Free" : fmtN(p.price)} <span>{p.price === 0 ? "" : `${offer.currency}/month`}</span></div>
            <div className="bk-pkg-calls">{fmtN(p.vol)} {offer.unit}</div>
            <div className="bk-pkg-desc">{p.desc}</div>
            <button type="button" className="bk-confirm sm" onClick={() => onChoose(p.id)}>Select this package <Icon name="arrowRight" size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PRICE COUNTER ────────────────────────────────────────────────────────────
function PriceNegotiate({ offer, pkg, value, onSet }) {
  const published = Number(pkg.price);
  const current = value != null && value !== "" ? Number(value) : published;
  const moved = current !== published;
  const hasRange = pkg.accept && pkg.accept.min != null;
  const inRange = hasRange && current >= pkg.accept.min && current <= pkg.accept.max;
  return (
    <div className="bkp">
      <div className="bkp-head">
        <Icon name="coin" size={14} />
        <div><b>The price is negotiable</b><span>Counter the price of the {pkg.name} package here.</span></div>
      </div>
      <div className="bkp-body">
        <div className="bkp-col">
          <span className="bkp-k">Published by the provider</span>
          <span className="bkp-pub">{fmtN(published)} <em>{offer.currency}/month</em></span>
        </div>
        <div className="bkp-col">
          <span className="bkp-k">Your price for this offer</span>
          <div className="bkp-inputs">
            <input type="number" className="os-in num" value={current} min={0} onChange={(e) => onSet(e.target.value === "" ? "" : Number(e.target.value))} />
            <span className="bkp-unit">{offer.currency}/month</span>
            {moved && (inRange
              ? <span className="bkp-sig ok"><Icon name="check" size={12} /> Auto-accepted</span>
              : <span className="bkp-sig rev"><Icon name="triggers" size={12} /> Need review</span>)}
          </div>
        </div>
      </div>
      <div className={`bkp-verdict ${!moved ? "neutral" : inRange ? "ok" : "gap"}`}>
        <Icon name={!moved ? "info" : inRange ? "check" : "triggers"} size={13} /> {moved ? "Counter sent to the provider's agent on confirm." : "Price taken as published."}
      </div>
    </div>
  );
}

// ─── FORM CONTROLS ────────────────────────────────────────────────────────────
const Sel = ({ value, onChange, options, width }) => (
  <span className="os-selectw" style={width ? { width } : undefined}>
    <select className="os-in" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
    <Icon name="chevronDown" size={13} className="os-chev" />
  </span>
);
const Num = ({ value, onChange }) => <input type="number" className="os-in num" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
function EditControl({ field, value, onChange }) {
  switch (field.type) {
    case "text": return <input className="os-in sm" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "yesno": return <div className="seg2 mini">{["Yes", "No"].map((o) => <button key={o} type="button" className={value === o ? "active teal" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>;
    case "select": return <Sel value={value} onChange={onChange} options={field.options} />;
    case "date": return <input type="date" className="os-in sm" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "procDeadline": return <Sel value={value?.p} onChange={(p) => onChange({ ...value, p })} options={field.options} />;
    case "numberUnit": return (<><Num value={value?.n} onChange={(n) => onChange({ ...value, n })} /><Sel value={value?.u} onChange={(u) => onChange({ ...value, u })} options={field.units} />{field.basis && <Sel value={value?.b} onChange={(b) => onChange({ ...value, b })} options={field.basis} />}</>);
    case "multiselect": return (<div className="os-chips" style={{ justifyContent: "flex-start" }}>{field.options.map((o) => { const on = (value || []).includes(o); return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])}>{o}</button>; })}</div>);
    default: return <span className="os-unit">{fmtVal(field, value)}</span>;
  }
}

// ─── STEPPER ──────────────────────────────────────────────────────────────────
function Stepper({ steps, step, onGo }) {
  return (
    <ol className="bk-stepper">
      {steps.map((s, i) => {
        const state = step === s.n ? "current" : s.n < step ? "done" : "todo";
        const clickable = onGo && s.n < step;
        return (
          <li key={s.n} className={`bk-step ${state}`}>
            {i > 0 && <span className={`bk-step-line ${s.n <= step ? "fill" : ""}`} aria-hidden="true" />}
            <button type="button" className="bk-step-btn" disabled={!clickable} onClick={() => clickable && onGo(s.n)} aria-current={state === "current" ? "step" : undefined}>
              <span className="bk-step-dot">{state === "done" ? <Icon name="check" size={15} /> : s.n}</span>
              <span className="bk-step-txt"><span className="bk-step-idx">Step {s.n}</span><span className="bk-step-name">{s.label}</span></span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ─── BASELINE TABLE (offer page) ──────────────────────────────────────────────
function BaselineTable({ offer }) {
  const t = D.termsOf(offer);
  return (
    <div className="ofd-base">
      {t.sections.filter((s) => s.fields.length).map((s) => (
        <div className="ofd-bsec" key={s.id}>
          <div className="ofd-bsec-head"><Icon name={s.icon} size={13} /> {s.title}</div>
          {s.fields.map((f) => (
            <div className="ofd-brow" key={f.id}>
              <span className="ofd-bk" title={f.meaning}>{f.label}</span>
              <span className="ofd-bv">{fmtVal(f, f.baseline)}</span>
              <span className={f.negotiable ? "ofd-btag auto" : "ofd-btag"}>{f.negotiable ? <><Icon name="triggers" size={9} /> Negotiable</> : <><Icon name="lock" size={9} /> Fixed</>}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── FULL-BASELINE DRAWER (basket) ────────────────────────────────────────────
function TermsDrawer({ offer, values, open, onClose }) {
  const t = offer ? D.termsOf(offer) : null;
  useEffect(() => {
    if (!offer) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [offer]);
  if (!offer) return null;
  return (
    <>
      <div className={`bk2-scrim ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`bk2-drawer ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-label={`Full baseline — ${offer.name}`}>
        <header className="bk2-drawer-head">
          <div className="bk2-drawer-title">
            <Monogram offer={offer} size={38} />
            <div><div className="bk2-drawer-name">{offer.name}</div><div className="bk2-drawer-by">proposed by {offer.provider}</div></div>
          </div>
          <button type="button" className="bk2-drawer-close" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </header>
        <div className="bk2-drawer-toolbar">
          <StatusBadges offer={offer} />
          <span className="bk2-drawer-ro"><Icon name="lock" size={12} /> Read-only — values are adjusted on step 2</span>
        </div>
        <div className="bk2-drawer-body">
          {t.sections.filter((s) => s.fields.length).map((sec) => (
            <div className="bk2-dsec" key={sec.id}>
              <div className="bk2-dsec-head"><span className="bk-tsec-ic"><Icon name={sec.icon} size={13} /></span>{sec.title}</div>
              <div className="bk2-dsec-body">
                {sec.fields.map((f) => {
                  const mine = values && values[f.id] !== undefined ? values[f.id] : f.baseline;
                  const gap = f.negotiable && f.userBase && isGap(f, mine, f.userBase);
                  const changed = f.negotiable && !eq(mine, f.baseline);
                  return (
                    <div className={`bk2-drow ${gap ? "gap" : ""} ${!f.negotiable ? "fixed" : ""}`} key={f.id}>
                      <div className="bk2-drow-top">
                        <span className="bk2-drow-name">{f.label}</span>
                        {!f.negotiable ? <span className="bk-fixed-tag"><Icon name="lock" size={10} /> Fixed</span>
                          : gap ? <span className="bk-st st-gap"><Icon name="triggers" size={10} /> Gap</span>
                          : f.userBase ? <span className="bk-st st-ok"><Icon name="check" size={10} /> Meets</span>
                          : <span className="bk-st st-edit"><Icon name="edit" size={10} /> Open</span>}
                      </div>
                      <div className="bk2-drow-val">{fmtVal(f, mine)}{changed && <span className="bk-guide" style={{ marginLeft: 8 }}>published {fmtVal(f, f.baseline)}</span>}</div>
                      <div className="bk2-drow-foot">
                        {f.userBase
                          ? <span className={`bk-guide ${gap ? "gap" : ""}`}><Icon name="sliders" size={11} /> Your baseline: <b>{f.userBase.label}</b></span>
                          : f.negotiable
                            ? <span className="bk-guide muted">No requirement — open to negotiation.</span>
                            : <span className="bk-guide muted">Set by the provider, not negotiable.</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="bk2-dsec">
            <div className="bk2-dsec-head"><span className="bk-tsec-ic"><Icon name="shield" size={13} /></span>Commitments &amp; penalties</div>
            <div className="bk-commit">
              <Icon name="shield" size={14} />
              <span>Backed by a <b>{t.penalty.consequence_type}</b> penalty if <b>{t.penalty.commitment_concerned}</b> falls {t.penalty.trigger_threshold.op} {t.penalty.trigger_threshold.v} ({t.penalty.penalty_amount.n} {t.penalty.penalty_amount.u}, assessed {t.penalty.measurement_period.toLowerCase()}).</span>
            </div>
          </div>
        </div>
        <footer className="bk2-drawer-foot"><button type="button" className="bk-btn ghost" onClick={onClose}><Icon name="x" size={14} /> Close</button></footer>
      </aside>
    </>
  );
}

// ─── ACCEPTANCE BASELINE RECALL ───────────────────────────────────────────────
function BaselineRecall() {
  const [open, setOpen] = useState(false);
  const ids = Object.keys(D.USER_BASELINE);
  return (
    <div className={`bk-baseline ${open ? "open" : ""}`}>
      <div className="bk-baseline-bar">
        <span className="bk-baseline-ic"><Icon name="sliders" size={16} /></span>
        <div className="bk-baseline-txt">
          <div className="bk-baseline-title">Your acceptance baseline</div>
          <div className="bk-baseline-sub">Your minimum requirements — set once in settings, checked against every offer here.</div>
        </div>
        <a className="bk-baseline-link" href="Profile Settings.html"><Icon name="external" size={13} /> Edit in settings</a>
        <button type="button" className="bk-baseline-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Hide baseline" : "Show baseline"}><Icon name={open ? "chevronUp" : "chevronDown"} size={16} /></button>
      </div>
      {open && (
        <div className="bk-baseline-body">
          {ids.map((id) => (
            <div className="bk-baseline-row" key={id}>
              <span className="bk-baseline-k">{D.FIELD[id] ? D.FIELD[id].label : id}</span>
              <span className="bk-baseline-v">{D.USER_BASELINE[id].label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.DemoUI = { Toast, Monogram, PiiTag, OfferHead, StatusBadges, OfferFacts, PackageGrid, PackagePicker, PriceNegotiate, Sel, Num, EditControl, Stepper, BaselineTable, TermsDrawer, BaselineRecall, resourceNames, priceOf, pkgPrice };
})();
