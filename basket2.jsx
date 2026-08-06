// VisionsTrust — Basket · refonte 23/07.
// A single "Review & negotiate" step (steps 1+2 merged). Each offer in the basket
// is one card: its terms are checked against the buyer's acceptance baseline, gaps
// are surfaced, and the buyer settles the offer through three unambiguous per-offer
// actions — Accept the provider's terms / Propose your own (baseline) / Edit field
// by field — or accepts individual gaps inline. "View full terms" opens a side
// drawer with every term, without leaving the page.
(function () {
  const { useState, useEffect, useMemo, useRef } = React;
  const { Icon, AppSidebar, BottomNav, BottomNavSheet } = window.UI;
  const { SECTIONS, ALL_FIELDS, AVAILABILITY } = window.OfferSettingsData;
  const { ITEMS, PROJECTS, KIND_TONE, USER_BASELINE } = window.BasketData;
  const { initials, hexToRgba } = window.CatData;
  const D = window.ProjectSettingsData;
  const { GovPanel, ClausesPanel } = window.S3F;
  const npClone = (v) => v == null ? v : JSON.parse(JSON.stringify(v));
  function npClauseDefaults() {const c = {};D.CLAUSES.fields.forEach((f) => {c[f.id] = npClone(f.def);});return c;}
  const FIELD = Object.fromEntries(ALL_FIELDS.map((f) => [f.id, f]));

  const LS_KEY = "vt.basket.v4";
  const clone = (v) => v == null ? v : JSON.parse(JSON.stringify(v));
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const isEmpty = (v) => v === "" || v == null || Array.isArray(v) && v.length === 0;

  // ─── VALUE FORMATTING ─────────────────────────────────────────────────────────
  function fmtVal(field, v) {
    if (isEmpty(v)) return "—";
    switch (field.type) {
      case "numberUnit":return `${v.n}${v.u ? " " + v.u : ""}${v.b ? " · " + v.b : ""}`;
      case "multiselect":return v.join(", ");
      case "opValue":return `${v.op} ${v.v}`;
      case "procDeadline":return !/Immediate/.test(v.p) && v.d != null ? `${v.p} · ${v.d}d` : v.p;
      case "matrix":return Object.entries(v).map(([k, x]) => `${k} ${x.n}${x.u}`).join(" · ");
      case "date":return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      default:return String(v);
    }
  }

  // ─── BASELINE LOGIC ─────────────────────────────────────────────────────────
  function meets(field, value, base) {
    if (!base) return true;
    if (isEmpty(value)) return false;
    const n = value && typeof value === "object" && "n" in value ? value.n : value;
    switch (base.op) {
      case "≤":return Number(n) <= base.v;
      case "≥":return Number(n) >= base.v;
      case "=":return value === base.v;
      case "in":return base.v.includes(value);
      case "includesAll":return Array.isArray(value) && base.v.every((x) => value.includes(x));
      case "≥tier":return AVAILABILITY.indexOf(value) >= AVAILABILITY.indexOf(base.v);
      default:return true;
    }
  }
  function isGap(field, value, base) {return !!base && !meets(field, value, base);}

  // The concrete value a "propose my baseline" counter would set for a field.
  function baselineTarget(field, base, cur) {
    if (!base) return cur;
    switch (base.op) {
      case "≤":case "≥":
        return field.type === "numberUnit" ? { ...(cur || {}), n: base.v } : base.v;
      case "=":return base.v;
      case "≥tier":return base.v;
      case "in":return Array.isArray(base.v) && base.v.includes(cur) ? cur : base.v[0];
      case "includesAll":return Array.from(new Set([...(Array.isArray(cur) ? cur : []), ...base.v]));
      default:return cur;
    }
  }

  // Auto-accept exists only on the terms a provider may leave negotiable in offer settings
  // — contract duration & renewal and the additional clauses. Everything else a provider
  // publishes is fixed for every taker.
  const BK_AUTO_ACCEPT = new Set(["contract_duration", "renewal_mode", "notice_nonrenewal", "reversibility", "subcontracting", "security_incident", "ip_outputs", "audit_right", "confidentiality"]);

  // ─── BUILD PER-OFFER TERM CONFIG ────────────────────────────────────────────────
  const TERM_SECTION_IDS = ["sla", "duration", "termination"];
  function fieldsOf(section) {return section.fields || (section.groups || []).flatMap((g) => g.fields);}
  const SEC_LABEL = { sla: "Service levels (SLA)", duration: "Duration & renewal", termination: "Termination" };

  function buildTerms(offer) {
    const ov = offer.overrides || {};
    const sections = TERM_SECTION_IDS.map((sid) => {
      const s = SECTIONS.find((x) => x.id === sid);
      const fields = fieldsOf(s).map((f) => {
        const o = ov[f.id] || {};
        const baseline = o.value !== undefined ? clone(o.value) : clone(f.def);
        const neg = o.neg !== undefined ? o.neg : !!f.neg;
        return { ...f, baseline, neg, userBase: USER_BASELINE[f.id] || null, negotiable: neg && BK_AUTO_ACCEPT.has(f.id) && !isEmpty(baseline) };
      });
      return { id: s.id, title: s.title, desc: s.desc, icon: s.icon, fields };
    });
    const penSec = SECTIONS.find((s) => s.id === "penalties");
    const penalty = {};
    penSec.fields.forEach((f) => {penalty[f.id] = clone(f.def);});
    const negFields = sections.flatMap((s) => s.fields.filter((f) => f.negotiable));
    const fixedFields = sections.flatMap((s) => s.fields.filter((f) => !f.negotiable && !isEmpty(f.baseline)));
    return { sections, penalty, penSec, negFields, fixedFields, fixedCount: fixedFields.length };
  }

  // ─── INPUTS ─────────────────────────────────────────────────────────────────
  const Sel = ({ value, onChange, options, width }) =>
  <span className="os-selectw" style={width ? { width } : undefined}>
    <select className="os-in" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <Icon name="chevronDown" size={13} className="os-chev" />
  </span>;

  const Num = ({ value, onChange }) =>
  <input type="number" className="os-in num" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;

  function EditControl({ field, value, onChange }) {
    switch (field.type) {
      case "text":return <input className="os-in sm" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
      case "textarea":return <textarea className="os-ta" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
      case "yesno":return <div className="seg2 mini">{["Yes", "No"].map((o) => <button key={o} type="button" className={value === o ? "active teal" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>;
      case "select":return <Sel value={value} onChange={onChange} options={field.options} />;
      case "numberUnit":return <><Num value={value?.n} onChange={(n) => onChange({ ...value, n })} /><Sel value={value?.u} onChange={(u) => onChange({ ...value, u })} options={field.units} />{field.basis && <Sel value={value?.b} onChange={(b) => onChange({ ...value, b })} options={field.basis} />}</>;
      case "multiselect":return <div className="os-chips" style={{ justifyContent: "flex-start" }}>{field.options.map((o) => {const on = (value || []).includes(o);return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])}>{o}</button>;})}</div>;
      case "matrix":return <div className="os-matrix">{field.rows.map((r) => <div className="mrow" key={r}><span className="mkey"><span className={`os-sev-dot os-sev-${r}`} />{r}</span><span className="mval"><Num value={value?.[r]?.n} onChange={(n) => onChange({ ...value, [r]: { ...value[r], n } })} /><Sel value={value?.[r]?.u} onChange={(u) => onChange({ ...value, [r]: { ...value[r], u } })} options={field.units} /></span></div>)}</div>;
      default:return <span className="os-unit">{fmtVal(field, value)}</span>;
    }
  }

  // ─── MONOGRAM / OFFER HEAD ──────────────────────────────────────────────────────
  function Monogram({ offer, size = 52 }) {
    return (
      <div className="bk-mono" style={{ width: size, height: size, background: `linear-gradient(135deg, ${hexToRgba(offer.accent, 0.9)}, ${hexToRgba(offer.accent, 0.55)})` }} aria-hidden="true">
      {initials(offer.name)}
    </div>);

  }
  function OfferHead({ offer, size = 46, children }) {
    const dot = KIND_TONE[offer.kind] || "#00a2ae";
    return (
      <div className="bk-offer-top">
      <Monogram offer={offer} size={size} />
      <div className="bk-offer-main">
        <div className="bk-offer-metarow">
          <span className="bk-kind" style={{ borderColor: hexToRgba(dot, .5), color: dot }}><span className="bk-kind-dot" style={{ background: dot }} />{offer.kind}</span>
          <span className="bk-offer-by">proposed by {offer.provider}</span>
        </div>
        <h3 className="bk-offer-name">{offer.name}</h3>
      </div>
      {children && <div className="bk-offer-actions">{children}</div>}
    </div>);

  }

  // ─── PER-OFFER STATE DERIVATION ─────────────────────────────────────────────────
  // mode: "pending" | "accepted" | "countered" | "edited"
  function deriveOffer(terms, proposal, decision) {
    const negs = terms.negFields;
    const withBase = negs.filter((f) => f.userBase);
    const conceded = decision.conceded || [];
    const mode = decision.mode || "pending";
    let gapFields, meetCount;
    if (mode === "accepted" || mode === "countered") {
      gapFields = [];
      meetCount = withBase.length;
    } else {
      gapFields = withBase.filter((f) => isGap(f, proposal[f.id], f.userBase) && !conceded.includes(f.id));
      meetCount = withBase.length - gapFields.length;
    }
    const changedCount = negs.filter((f) => !eq(proposal[f.id], f.baseline)).length;
    return { negs, withBase, conceded, mode, gapFields, gapCount: gapFields.length, meetCount, changedCount, settled: mode !== "pending" };
  }

  // ─── GAP / MEET SUMMARY BADGES ───────────────────────────────────────────────────
  function StatusBadges({ gapCount, meetCount }) {
    return (
      <div className="bk2-badges">
      {gapCount > 0 ?
        <span className="bk2-badge gap"><Icon name="triggers" size={12} /><span><b>{gapCount}</b> gap{gapCount !== 1 ? "s" : ""}</span></span> :
        <span className="bk2-badge allok"><Icon name="check" size={12} /><span>No gaps</span></span>}
      {meetCount > 0 && <span className="bk2-badge meet"><Icon name="check" size={12} /><span><b>{meetCount}</b> meet</span></span>}
    </div>);

  }

  // ─── STEP 1 · OFFER CARD ─────────────────────────────────────────────────────────
  function OfferCard({ offer, terms, proposal, decision, onConcede, onSetField, onProposeField, onAcceptAll, onCounterAll, onReopen, onEdit, onView, onSave, onRemove }) {
    const d = deriveOffer(terms, proposal, decision);
    const stateClass = d.mode === "accepted" ? "is-accepted" : d.mode === "countered" || d.mode === "edited" ? "is-countered" : "is-pending";

    return (
      <article className={`bk2-card ${stateClass}`}>
      <span className="bk2-rail" aria-hidden="true" />
      <div className="bk2-card-head">
        <OfferHead offer={offer}>
          <button type="button" className="bk-btn ghost sm" onClick={onSave} title="Save for later"><Icon name="bookmark" size={14} /><span className="bk2-hide-sm">Save</span></button>
          <button type="button" className="bk-icon-danger sm" onClick={onRemove} aria-label={`Remove ${offer.name}`}><Icon name="trash" size={15} /></button>
        </OfferHead>
        <div className="bk2-summary">
          <StatusBadges gapCount={d.gapCount} meetCount={d.meetCount} />
          {!d.settled && <div className="bk2-summary-acts">
            <button type="button" className="bk2-sum-btn accept" onClick={onAcceptAll}><Icon name="check" size={13} /> Accept all terms</button>
            <button type="button" className="bk2-sum-btn propose" onClick={onCounterAll}><Icon name="sliders" size={13} /> Propose your terms</button>
          </div>}
          <button type="button" className="bk2-viewfull" onClick={onView}><Icon name="list" size={14} /> View full terms</button>
        </div>
      </div>

      {/* ── SETTLED banner ─────────────────────────── */}
      {d.settled ?
        <div className={`bk2-verdict ${d.mode === "accepted" ? "accepted" : "countered"}`}>
          <span className="bk2-verdict-ic">
            <Icon name={d.mode === "accepted" ? "check" : d.mode === "countered" ? "sliders" : "edit"} size={16} />
          </span>
          <div className="bk2-verdict-txt">
            <div className="bk2-verdict-title">
              {d.mode === "accepted" && "Provider's terms accepted"}
              {d.mode === "countered" && "Your counter-offer — baseline applied"}
              {d.mode === "edited" && "Your counter-offer — custom terms"}
            </div>
            <div className="bk2-verdict-sub">
              {d.mode === "accepted" && `You take all ${d.negs.length} negotiable terms exactly as published. Nothing to negotiate.`}
              {d.mode === "countered" && `Your acceptance baseline is proposed on ${d.withBase.length} term${d.withBase.length !== 1 ? "s" : ""}. Sent to the provider on confirm.`}
              {d.mode === "edited" && `${d.changedCount} term${d.changedCount !== 1 ? "s" : ""} changed to your own values.${d.gapCount ? ` ${d.gapCount} still below baseline.` : ""} Sent to the provider on confirm.`}
            </div>
          </div>
          <div className="bk2-verdict-actions">
            {(d.mode === "countered" || d.mode === "edited") && <button type="button" className="bk-btn sm" onClick={onEdit}><Icon name="edit" size={13} /> Adjust</button>}
            <button type="button" className="bk-btn ghost sm" onClick={onReopen}><Icon name="refresh" size={13} /> Change</button>
          </div>
        </div> :

        <>
          {/* ── GAP LIST (accept inline) ────────────── */}
          {d.gapCount > 0 ?
          <div className="bk2-gaps">
              <div className="bk2-gaps-head"><Icon name="triggers" size={13} /> These terms fall short of your baseline — accept them one by one, or answer the whole offer below.</div>
              {d.gapFields.map((f) =>
            <div className="bk2-gaprow" key={f.id}>
                  <div className="bk2-gap-info">
                    <span className="bk2-gap-name">{f.label}</span>
                    <span className="bk2-gap-vals">
                      <span className="bk2-gap-prov">Offer terms: <b>{fmtVal(f, f.baseline)}</b></span>
                      <span className="bk2-gap-sep">·</span>
                      <span className="bk2-gap-base">your terms:</span>
                    </span>
                    <div className="bk2-gap-edit"><EditControl field={f} value={proposal[f.id]} onChange={(v) => onProposeField(f.id, v)} /></div>
                  </div>
                  <div className="bk2-gap-btns">
                    <button type="button" className="bk2-gap-accept" onClick={() => onConcede(f.id)} title="Accept the provider's value for this term">
                      <Icon name="check" size={13} /> Accept this term
                    </button>
                    <button type="button" className="bk2-gap-propose" onClick={() => onProposeField(f.id, baselineTarget(f, f.userBase, proposal[f.id]))} title="Propose your baseline value for this term">
                      <Icon name="sliders" size={13} /> Propose your terms
                    </button>
                  </div>
                </div>
            )}
            </div> :

          <div className="bk2-allok"><Icon name="check" size={14} /> Every term meets your acceptance baseline — no gaps to settle.</div>
          }

        </>
        }
    </article>);

  }

  // ─── FULL-TERMS SIDE DRAWER (view + field-by-field edit) ─────────────────────────
  function TermsDrawer({ offer, terms, proposal, decision, open, initialMode, readOnly, onClose, onSetField, onResetField, onConcede, onAcceptAll, onCounterAll }) {
    const [mode, setMode] = useState(readOnly ? "review" : initialMode || "review");
    useEffect(() => {setMode(readOnly ? "review" : initialMode || "review");}, [offer && offer.id, initialMode, readOnly]);
    if (!offer) return null;
    const d = deriveOffer(terms, proposal, decision);
    const sections = terms.sections;
    const conceded = d.conceded;

    const renderTerm = (f) => {
      const base = f.userBase;
      const val = f.negotiable ? proposal[f.id] : f.baseline;
      const isConceded = conceded.includes(f.id);
      const gap = f.negotiable && base && isGap(f, val, base) && !isConceded && d.mode !== "countered" && d.mode !== "accepted";
      const changed = f.negotiable && !eq(val, f.baseline);
      let chip;
      if (!f.negotiable) chip = <span className="bk-fixed-tag"><Icon name="lock" size={10} /> Fixed</span>;else
      if (gap) chip = <span className="bk-st st-gap"><Icon name="triggers" size={10} /> Gap</span>;else
      if (isConceded) chip = <span className="bk-st st-ok"><Icon name="check" size={10} /> Accepted</span>;else
      if (base) chip = <span className="bk-st st-ok"><Icon name="check" size={10} /> Meets</span>;else
      chip = <span className="bk-st st-edit"><Icon name="edit" size={10} /> Open</span>;

      return (
        <div className={`bk2-drow ${gap ? "gap" : ""} ${!f.negotiable ? "fixed" : ""}`} key={f.id}>
        <div className="bk2-drow-top">
          <span className="bk2-drow-name">{f.label}</span>
          {chip}
        </div>
        {mode === "edit" && f.negotiable ?
          <div className="bk2-drow-ctl"><EditControl field={f} value={val} onChange={(v) => onSetField(f.id, v)} /></div> :

          <div className="bk2-drow-val">{fmtVal(f, val)}</div>
          }
        <div className="bk2-drow-foot">
          {base ?
            <span className={`bk-guide ${gap ? "gap" : ""}`}><Icon name="sliders" size={11} /> Your baseline: <b>{base.label}</b></span> :
            f.negotiable ?
            <span className="bk-guide muted">No requirement — open to negotiation.</span> :
            <span className="bk-guide muted">Set by the provider, not negotiable.</span>}
          {mode === "edit" && changed && <button type="button" className="bk-reset" onClick={() => onResetField(f.id)}>Reset to {fmtVal(f, f.baseline)}</button>}
          {!readOnly && mode === "review" && gap && <button type="button" className="bk2-gap-accept mini" onClick={() => onConcede(f.id)}><Icon name="check" size={12} /> Accept</button>}
        </div>
      </div>);

    };

    return (
      <>
      <div className={`bk2-scrim ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`bk2-drawer ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-label={`Full terms — ${offer.name}`}>
        <header className="bk2-drawer-head">
          <div className="bk2-drawer-title">
            <Monogram offer={offer} size={38} />
            <div>
              <div className="bk2-drawer-name">{offer.name}</div>
              <div className="bk2-drawer-by">proposed by {offer.provider}</div>
            </div>
          </div>
          <button type="button" className="bk2-drawer-close" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </header>
        <div className="bk2-drawer-toolbar">
          <StatusBadges gapCount={d.gapCount} meetCount={d.meetCount} />
          {readOnly ?
            <span className="bk2-drawer-ro"><Icon name="lock" size={12} /> Read-only — go back to step 1 to change terms</span> :
            <div className="seg2 mini bk2-drawer-mode">
                <button type="button" className={mode === "review" ? "active teal" : ""} onClick={() => setMode("review")}><Icon name="eye" size={13} /> Review</button>
                <button type="button" className={mode === "edit" ? "active teal" : ""} onClick={() => setMode("edit")}><Icon name="edit" size={13} /> Edit</button>
              </div>}
        </div>
        <div className="bk2-drawer-body">
          {sections.map((sec) => {
              const shown = sec.fields.filter((f) => f.negotiable || !isEmpty(f.baseline));
              if (!shown.length) return null;
              return (
                <div className="bk2-dsec" key={sec.id}>
                <div className="bk2-dsec-head"><span className="bk-tsec-ic"><Icon name={sec.icon} size={13} /></span>{SEC_LABEL[sec.id] || sec.title}</div>
                <div className="bk2-dsec-body">{shown.map(renderTerm)}</div>
              </div>);

            })}
          <div className="bk2-dsec">
            <div className="bk2-dsec-head"><span className="bk-tsec-ic"><Icon name="shield" size={13} /></span>Commitments &amp; penalties</div>
            <div className="bk-commit">
              <Icon name="shield" size={14} />
              <span>Backed by a <b>{terms.penalty.consequence_type}</b> penalty if <b>{terms.penalty.commitment_concerned}</b> falls {terms.penalty.trigger_threshold.op} {terms.penalty.trigger_threshold.v} ({terms.penalty.penalty_amount.n} {terms.penalty.penalty_amount.u}, assessed {terms.penalty.measurement_period.toLowerCase()}).</span>
            </div>
          </div>
        </div>
        {readOnly ?
          <footer className="bk2-drawer-foot"><button type="button" className="bk-btn ghost" onClick={onClose}><Icon name="x" size={14} /> Close</button></footer> :
          <footer className="bk2-drawer-foot">
              <button type="button" className="bk2-act counter compact" onClick={onCounterAll}><span className="bk2-act-ic"><Icon name="sliders" size={16} /></span><span className="bk2-act-main">Propose your terms</span></button>
              <button type="button" className="bk2-act accept compact" onClick={onAcceptAll}><span className="bk2-act-ic"><Icon name="check" size={16} /></span><span className="bk2-act-main">Accept offer terms</span></button>
            </footer>}
      </aside>
    </>);

  }

  // ─── ACCEPTANCE BASELINE (recalled from settings) ────────────────────────────────
  function BaselineRecall() {
    const [open, setOpen] = useState(false);
    const ids = Object.keys(USER_BASELINE);
    return (
      <div className={`bk-baseline ${open ? "open" : ""}`}>
      <div className="bk-baseline-bar">
        <span className="bk-baseline-ic"><Icon name="sliders" size={16} /></span>
        <div className="bk-baseline-txt">
          <div className="bk-baseline-title">Your acceptance baseline</div>
          <div className="bk-baseline-sub">Your minimum requirements — set once in settings, checked against every offer here.</div>
        </div>
        <a className="bk-baseline-link" href="Profile Settings.html"><Icon name="external" size={13} /> Edit in settings</a>
        <button type="button" className="bk-baseline-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Hide baseline" : "Show baseline"}>
          <Icon name={open ? "chevronUp" : "chevronDown"} size={16} />
        </button>
      </div>
      {open &&
        <div className="bk-baseline-body">
          {ids.map((id) =>
          <div className="bk-baseline-row" key={id}>
              <span className="bk-baseline-k">{FIELD[id] ? FIELD[id].label : id}</span>
              <span className="bk-baseline-v">{USER_BASELINE[id].label}</span>
            </div>
          )}
        </div>
        }
    </div>);

  }

  // ─── PERSISTENT RECAP ───────────────────────────────────────────────────────────
  const VERDICT_TAG = {
    accepted: { cls: "ok", ic: "check", txt: "Accepted" },
    countered: { cls: "teal", ic: "sliders", txt: "Counter · baseline" },
    edited: { cls: "teal", ic: "edit", txt: "Counter · custom" }
  };
  function RecapBar({ rows, target }) {
    const [open, setOpen] = useState(false);
    if (!rows.length) return null;
    const pending = rows.filter((r) => !r.settled).length;
    const gapTotal = rows.reduce((s, r) => s + r.gapCount, 0);
    return (
      <div className={`bk-recap ${open ? "open" : ""}`}>
      <button type="button" className="bk-recap-bar" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="bk-recap-title"><Icon name="list" size={14} /> Summary</span>
        <span className="bk-recap-stats">
          <span className="bk-recap-pill"><b>{rows.length}</b><span>offer{rows.length !== 1 ? "s" : ""}</span></span>
          {pending > 0 ?
            <span className="bk-recap-pill gap"><Icon name="hourglass" size={11} /><b>{pending}</b><span>to settle</span></span> :
            <span className="bk-recap-pill ok"><Icon name="check" size={11} /><span>All settled</span></span>}
          {gapTotal > 0 && <span className="bk-recap-pill gap"><Icon name="triggers" size={11} /><b>{gapTotal}</b><span>open gap{gapTotal !== 1 ? "s" : ""}</span></span>}
          {target && <span className="bk-recap-pill"><Icon name="folder" size={11} /> {target}</span>}
        </span>
        <span className="bk-recap-cta">{open ? "Hide" : "Details"}<Icon name={open ? "chevronUp" : "chevronDown"} size={15} /></span>
      </button>
      {open &&
        <div className="bk-recap-body">
          {rows.map((r) => {
            const v = r.settled ? VERDICT_TAG[r.mode] : null;
            return (
              <div className="bk-recap-row" key={r.offer.id}>
                <Monogram offer={r.offer} size={30} />
                <span className="bk-recap-name">{r.offer.name}</span>
                {v ?
                <span className={`bk-recap-tag ${v.cls}`}><Icon name={v.ic} size={10} /><span>{v.txt}</span></span> :
                r.gapCount ?
                <span className="bk-recap-tag gap"><Icon name="triggers" size={10} /><span>{r.gapCount} gap{r.gapCount !== 1 ? "s" : ""}</span></span> :
                <span className="bk-recap-tag ok"><Icon name="check" size={10} /><span>Ready</span></span>}
              </div>);

          })}
          {target && <div className="bk-recap-target"><Icon name="folder" size={13} /> Assigning to <b>{target}</b></div>}
        </div>
        }
    </div>);

  }

  // ─── STEPPER (3 steps) ────────────────────────────────────────────────────────
  const STEPS = [
  { n: 1, label: "Review & negotiate", icon: "scale" },
  { n: 2, label: "Assign to project", icon: "folder" },
  { n: 3, label: "Confirm & send", icon: "check" }];

  function Stepper({ step, maxReached, onGo }) {
    return (
      <ol className="bk-stepper">
      {STEPS.map((s, i) => {
          const state = step === s.n ? "current" : s.n < step ? "done" : "todo";
          const clickable = s.n <= maxReached && s.n !== step;
          return (
            <li key={s.n} className={`bk-step ${state}`}>
            {i > 0 && <span className={`bk-step-line ${s.n <= step ? "fill" : ""}`} aria-hidden="true" />}
            <button type="button" className="bk-step-btn" disabled={!clickable} onClick={() => clickable && onGo(s.n)} aria-current={state === "current" ? "step" : undefined}>
              <span className="bk-step-dot">{state === "done" ? <Icon name="check" size={15} /> : s.n}</span>
              <span className="bk-step-txt"><span className="bk-step-idx">Step {s.n}</span><span className="bk-step-name">{s.label}</span></span>
            </button>
          </li>);

        })}
    </ol>);

  }

  // ─── STEP 2 · ASSIGN ──────────────────────────────────────────────────────────
  function AssignPanel({ tab, setTab, projectId, setProjectId, newProj, setNewProj, memberOpen, setMemberOpen }) {
    const set = (mutator) => setNewProj((prev) => {const d = npClone(prev);mutator(d);return d;});
    return (
      <div className="bk-assign">
      <div className="bk-assign-head">
        <h2>Assign to project</h2>
        <p>Choose where these offers should go — an existing project, or a new one.</p>
      </div>
      <div className="seg2 bk-assign-tabs">
        <button type="button" className={tab === "existing" ? "active teal" : ""} onClick={() => setTab("existing")}><Icon name="folder" size={14} /> Existing project</button>
        <button type="button" className={tab === "new" ? "active teal" : ""} onClick={() => setTab("new")}><Icon name="plus" size={14} /> New project</button>
      </div>
      {tab === "existing" ?
        <>
          <div className="bk-assign-label">Select an existing project</div>
          <div className="bk-projlist" role="radiogroup" aria-label="Existing projects">
            {PROJECTS.map((p) =>
            <button type="button" key={p.id} role="radio" aria-checked={projectId === p.id} className={`bk-proj ${projectId === p.id ? "sel" : ""}`} onClick={() => setProjectId(p.id)}>
                <div className="bk-proj-logo">{p.org}</div>
                <div className="bk-proj-meta"><div className="bk-proj-name">{p.name}</div><div className="bk-proj-cap">{p.caption}</div></div>
                <span className="bk-proj-radio" aria-hidden="true" />
              </button>
            )}
          </div>
          <button type="button" className="bk-member-toggle" onClick={() => setMemberOpen((o) => !o)} aria-expanded={memberOpen}>
            Project where one of the participants is already a member <Icon name={memberOpen ? "chevronUp" : "chevronDown"} size={14} />
          </button>
          {memberOpen && <div className="bk-member-note">No participant of these offers is already a member of another of your projects.</div>}
        </> :

        <div className="bk-newform">
          <div><label className="os-flabel">Project title<em>*</em></label><input className="os-in bk-full" value={newProj.title} onChange={(e) => setNewProj({ ...newProj, title: e.target.value })} placeholder="Ex: Customer Journey Optimisation Platform" /></div>
          <div><label className="os-flabel">Project caption<em>*</em></label><input className="os-in bk-full" value={newProj.caption} onChange={(e) => setNewProj({ ...newProj, caption: e.target.value.slice(0, 69) })} placeholder="Short sentence to describe your project goals" /><div className="os-fhelp">{69 - newProj.caption.length} characters remaining</div></div>
          <div><label className="os-flabel">Project description<em>*</em></label><textarea className="os-ta" style={{ minHeight: 90 }} value={newProj.desc} onChange={(e) => setNewProj({ ...newProj, desc: e.target.value })} placeholder="Describe your project: impact, how far along you are, your objectives, timeline and needs." /></div>
          <div><label className="os-flabel">Categories<em>*</em></label><Sel value={newProj.category} onChange={(v) => setNewProj({ ...newProj, category: v })} options={["Browse", "Skills matching", "Learning analytics", "Workforce", "Data sharing"]} width="100%" /></div>
          <div className="s3-sub"><Icon name="shield" size={14} /> Purpose &amp; governance</div>
          <GovPanel st={newProj} set={set} />
          <div className="s3-sub"><Icon name="doc" size={14} /> Contract clauses <span className="opt">Dataspace defaults pre-filled — adjust before creating.</span></div>
          <ClausesPanel st={newProj} set={set} resetClauses={() => set((s) => {s.clauses = npClauseDefaults();})} />
        </div>
        }
    </div>);

  }

  // ─── STEP 3 · CONFIRM ────────────────────────────────────────────────────────────
  function fmtPrice(p) {
    const parts = [];
    parts.push(`${p.sub || 0} ${p.currency} · ${p.billing}`);
    if (p.setup && p.setup !== "0") parts.push(`setup ${p.setup} ${p.currency}`);
    if (p.api && p.api !== "0") parts.push(`${p.api} ${p.currency}/call`);
    return parts.join(" · ");
  }
  const VERDICT_LINE = {
    accepted: { ic: "check", cls: "accepted", label: "Provider's terms accepted as published" },
    countered: { ic: "sliders", cls: "countered", label: "Counter-offer — your baseline applied" },
    edited: { ic: "edit", cls: "countered", label: "Counter-offer — custom terms" }
  };
  function ConfirmStep({ rows, pricing, proposals, target, targetCaption, onView }) {
    const pending = rows.filter((r) => !r.settled);
    // Only the terms the buyer actually moved off the provider's published value.
    const withSettle = rows.map((r) => {
      const prop = proposals[r.offer.id] || {};
      const terms = r.negs.filter((fl) => !eq(prop[fl.id], fl.baseline)).map((fl) => {
        const val = prop[fl.id];
        const base = fl.userBase;
        const gap = !!base && isGap(fl, val, base) && !r.conceded.includes(fl.id);
        return { fl, val, base, gap };
      });
      return { ...r, terms };
    });
    const settleTotal = withSettle.reduce((n, r) => n + r.terms.length, 0);
    const settleOffers = withSettle.filter((r) => r.terms.length > 0).length;
    const gapTotal = withSettle.reduce((n, r) => n + r.terms.filter((t) => t.gap).length, 0);
    return (
      <div className="bk-confirm-wrap">
      <div className="bk-confirm-target">
        <div className="bk-ct-ic"><Icon name="folder" size={18} /></div>
        <div><div className="bk-ct-label">Assigning to</div><div className="bk-ct-name">{target}</div>{targetCaption && <div className="bk-ct-cap">{targetCaption}</div>}</div>
        <div className="bk-ct-count">{rows.length} offer{rows.length !== 1 ? "s" : ""}</div>
      </div>
      {pending.length > 0 ?
        <div className="bk-banner review"><Icon name="triggers" size={16} /><span><b>{pending.length}</b> offer{pending.length !== 1 ? "s" : ""} still need a decision on step 1 (accept or counter) before sending.</span></div> :
        settleTotal === 0 ?
        <div className="bk-banner ok"><Icon name="check" size={16} /><span>Nothing to negotiate — every offer is taken exactly as published.</span></div> :

        <div className="bk-banner review"><Icon name="triggers" size={16} /><span><b>{settleTotal}</b> term{settleTotal !== 1 ? "s" : ""} across {settleOffers} offer{settleOffers !== 1 ? "s" : ""} go to the provider{settleOffers !== 1 ? "s" : ""} for negotiation{gapTotal > 0 ? <> — <b>{gapTotal}</b> of them still sit below your baseline</> : ""}. Every other term is confirmed as published.</span></div>
        }
      {withSettle.map((r) => {
          const v = r.settled ? VERDICT_LINE[r.mode] : null;
          return (
            <div className="bk-review-offer" key={r.offer.id}>
            <OfferHead offer={r.offer} size={34}>
              <button type="button" className="bk-btn ghost sm" onClick={() => onView(r.offer.id)}><Icon name="list" size={14} /> See all terms</button>
            </OfferHead>
            <div className="bk-conf-grid">
              <div className="bk-conf-cell">
                <div className="bk-conf-k">Pricing</div>
                <div className="bk-conf-v">{fmtPrice(pricing[r.offer.id])}</div>
              </div>
              <div className="bk-conf-cell">
                <div className="bk-conf-k">Decision</div>
                {v ?
                  <div className={`bk2-conf-verdict ${v.cls}`}><Icon name={v.ic} size={13} /> {v.label}</div> :
                  <div className="bk-conf-v muted">No decision yet — go back to step 1.</div>}
              </div>
            </div>
            {r.terms.length > 0 ?
              <div className="bk2-settle">
                <div className="bk2-settle-head">
                  <Icon name="triggers" size={13} /> Terms to settle <span className="bk2-settle-n">{r.terms.length}</span>
                  <span className="bk2-settle-sub">Only these go to {r.offer.provider}. The rest of the contract stands as published.</span>
                </div>
                {r.terms.map(({ fl, val, base, gap }) =>
                <div className={`bk2-settle-row ${gap ? "gap" : ""}`} key={fl.id}>
                    <div className="bk2-settle-top">
                      <span className="bk2-settle-name">{fl.label}</span>
                      {gap ?
                    <span className="bk-st st-gap"><Icon name="triggers" size={10} /> Below your baseline</span> :
                    base ?
                    <span className="bk-st st-ok"><Icon name="check" size={10} /> Meets your baseline</span> :
                    <span className="bk-st st-edit"><Icon name="edit" size={10} /> Your own value</span>}
                    </div>
                    <ol className="bk2-xchg">
                      <li className="done"><span className="bk2-xchg-who">{r.offer.provider} published</span><span className="bk2-xchg-val">{fmtVal(fl, fl.baseline)}</span></li>
                      <li className="you"><span className="bk2-xchg-who">You counter</span><span className="bk2-xchg-val">{fmtVal(fl, val)}</span></li>
                      <li className="wait"><span className="bk2-xchg-who">Awaiting response</span><span className="bk2-xchg-val muted">sent on confirm</span></li>
                    </ol>
                    {base && <div className="bk2-settle-base"><Icon name="sliders" size={11} /> Your baseline: <b>{base.label}</b>{gap ? " — your counter still falls short" : ""}</div>}
                  </div>
                )}
              </div> :

              <div className="bk2-settle-none"><Icon name="check" size={14} /> No term changed — the provider's terms are accepted as published.</div>
              }
          </div>);

        })}
    </div>);

  }

  // ─── MAIN ─────────────────────────────────────────────────────────────────────
  function BasketApp() {
    const termsById = useMemo(() => Object.fromEntries(ITEMS.map((o) => [o.id, buildTerms(o)])), []);

    const seed = () => {
      const proposals = {};const decisions = {};
      ITEMS.forEach((o) => {
        const p = {};termsById[o.id].negFields.forEach((f) => {p[f.id] = clone(f.baseline);});
        proposals[o.id] = p;
        decisions[o.id] = { mode: "pending", conceded: [] };
      });
      const pricing = Object.fromEntries(ITEMS.map((o) => [o.id, clone(o.pricing)]));
      return {
        selected: ITEMS.filter((o) => !o.saved).map((o) => o.id),
        saved: ITEMS.filter((o) => o.saved).map((o) => o.id),
        proposals, pricing, decisions
      };
    };
    // Per-offer deep merge: a term that only just became negotiable has no entry in the
    // persisted proposal, so it must fall back to the freshly seeded baseline.
    const mergeProposals = (seeded, saved) => Object.fromEntries(Object.keys(seeded).map((k) => [k, { ...seeded[k], ...((saved || {})[k] || {}) }]));
    const load = () => {
      try {const raw = localStorage.getItem(LS_KEY);if (raw) {const s = seed();const j = JSON.parse(raw);return { ...s, ...j, proposals: mergeProposals(s.proposals, j.proposals), pricing: { ...s.pricing, ...j.pricing }, decisions: { ...s.decisions, ...j.decisions } };}} catch (e) {}
      return seed();
    };

    const [st, setSt] = useState(load);
    const [step, setStep] = useState(1);
    const [maxReached, setMaxReached] = useState(1);
    const [sent, setSent] = useState(false);
    const [savedOpen, setSavedOpen] = useState(true);
    const [assignTab, setAssignTab] = useState("existing");
    const [projectId, setProjectId] = useState(null);
    const [newProj, setNewProj] = useState({ title: "", caption: "", desc: "", category: "Browse", gov: { purpose: "", benefit: "", processing: "", availDate: "", legalBasis: "Consent", legalDesc: "" }, clauses: npClauseDefaults() });
    const [memberOpen, setMemberOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [drawer, setDrawer] = useState(null); // { offerId, mode }
    const [drawerOpen, setDrawerOpen] = useState(false);
    const topRef = useRef(null);

    useEffect(() => {try {localStorage.setItem(LS_KEY, JSON.stringify(st));} catch (e) {}}, [st]);
    useEffect(() => {if (topRef.current) topRef.current.scrollTop = 0;}, [step, sent]);
    useEffect(() => {if (drawer) {const id = requestAnimationFrame(() => setDrawerOpen(true));return () => cancelAnimationFrame(id);}}, [drawer]);
    useEffect(() => {
      const onKey = (e) => {if (e.key === "Escape" && drawer) closeDrawer();};
      window.addEventListener("keydown", onKey);return () => window.removeEventListener("keydown", onKey);
    }, [drawer]);

    const byId = (id) => ITEMS.find((o) => o.id === id);
    const selectedOffers = st.selected.map(byId).filter(Boolean);
    const savedOffers = st.saved.map(byId).filter(Boolean);

    // ── mutations ──────────────────────────────────────────────────────────────
    const patchDecision = (offerId, patch) => setSt((s) => ({ ...s, decisions: { ...s.decisions, [offerId]: { ...s.decisions[offerId], ...patch } } }));
    const setField = (offerId, fieldId, v) => setSt((s) => {
      const dec = s.decisions[offerId] || { mode: "pending", conceded: [] };
      return {
        ...s,
        proposals: { ...s.proposals, [offerId]: { ...s.proposals[offerId], [fieldId]: v } },
        decisions: { ...s.decisions, [offerId]: { ...dec, mode: "edited", conceded: (dec.conceded || []).filter((x) => x !== fieldId) } }
      };
    });
    const resetField = (offerId, fieldId) => setField(offerId, fieldId, clone(termsById[offerId].negFields.find((f) => f.id === fieldId).baseline));
    const concedeGap = (offerId, fieldId) => setSt((s) => {
      const dec = s.decisions[offerId] || { mode: "pending", conceded: [] };
      return { ...s, decisions: { ...s.decisions, [offerId]: { ...dec, conceded: dec.conceded.includes(fieldId) ? dec.conceded : [...dec.conceded, fieldId] } } };
    });
    const acceptAll = (offerId) => setSt((s) => {
      const p = {};termsById[offerId].negFields.forEach((f) => {p[f.id] = clone(f.baseline);});
      return { ...s, proposals: { ...s.proposals, [offerId]: p }, decisions: { ...s.decisions, [offerId]: { mode: "accepted", conceded: [] } } };
    });
    const proposeField = (offerId, fieldId, v) => setSt((s) => {
      const dec = s.decisions[offerId] || { mode: "pending", conceded: [] };
      return {
        ...s,
        proposals: { ...s.proposals, [offerId]: { ...s.proposals[offerId], [fieldId]: v } },
        decisions: { ...s.decisions, [offerId]: { ...dec, conceded: (dec.conceded || []).filter((x) => x !== fieldId) } }
      };
    });
    const counterAll = (offerId) => setSt((s) => {
      const cur = s.proposals[offerId] || {};
      const p = { ...cur };
      termsById[offerId].negFields.forEach((f) => {if (f.userBase) p[f.id] = clone(baselineTarget(f, f.userBase, cur[f.id]));});
      return { ...s, proposals: { ...s.proposals, [offerId]: p }, decisions: { ...s.decisions, [offerId]: { mode: "countered", conceded: [] } } };
    });
    const reopen = (offerId) => setSt((s) => {
      const p = {};termsById[offerId].negFields.forEach((f) => {p[f.id] = clone(f.baseline);});
      return { ...s, proposals: { ...s.proposals, [offerId]: p }, decisions: { ...s.decisions, [offerId]: { mode: "pending", conceded: [] } } };
    });
    const moveToSaved = (id) => setSt((s) => ({ ...s, selected: s.selected.filter((x) => x !== id), saved: s.saved.includes(id) ? s.saved : [...s.saved, id] }));
    const moveToSelected = (id) => setSt((s) => ({ ...s, saved: s.saved.filter((x) => x !== id), selected: s.selected.includes(id) ? s.selected : [...s.selected, id] }));
    const removeFromSelected = (id) => setSt((s) => ({ ...s, selected: s.selected.filter((x) => x !== id) }));
    const removeFromSaved = (id) => setSt((s) => ({ ...s, saved: s.saved.filter((x) => x !== id) }));

    const openDrawer = (offerId, mode) => setDrawer({ offerId, mode });
    const closeDrawer = () => {setDrawerOpen(false);setTimeout(() => setDrawer(null), 260);};

    const goTo = (n) => {setStep(n);setMaxReached((m) => Math.max(m, n));};

    // ── derived ─────────────────────────────────────────────────────────────────
    const rows = selectedOffers.map((o) => {
      const d = deriveOffer(termsById[o.id], st.proposals[o.id] || {}, st.decisions[o.id] || { mode: "pending", conceded: [] });
      return { offer: o, ...d };
    });
    const pendingCount = rows.filter((r) => !r.settled).length;
    const canAssign = assignTab === "existing" ? !!projectId : newProj.title.trim() && newProj.caption.trim();
    const target = assignTab === "existing" ? PROJECTS.find((p) => p.id === projectId)?.name || "" : newProj.title || "New project";
    const targetCaption = assignTab === "existing" ? PROJECTS.find((p) => p.id === projectId)?.caption || "" : newProj.caption;
    const empty = selectedOffers.length === 0 && savedOffers.length === 0;
    const drawerOffer = drawer ? byId(drawer.offerId) : null;

    return (
      <div className="app ui-v2 bk-app">
      <a href="#bk-main" className="skip-link">Skip to content</a>
      <AppSidebar variant="v2" activeId="catalogue" />
      <div className="main">
        <header className="topbar cat-topbar">
          <div className="topbar-left"><div className="page-title"><Icon name="cart" size={20} /><h1>Basket</h1></div></div>
          <div className="topbar-right">
            <button type="button" className="icon-btn ghost active-cart" aria-label="Basket" aria-current="page"><Icon name="cart" size={18} />{selectedOffers.length > 0 && <span className="notif-dot" aria-hidden="true">{selectedOffers.length}</span>}</button>
            <button type="button" className="icon-btn ghost hide-mobile" aria-label="Language"><Icon name="translate" size={18} /></button>
            <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16} /><span>Help</span></button>
            <button type="button" className="icon-btn ghost notif" aria-label="Notifications, 73 unread"><Icon name="bell" size={18} /><span className="notif-dot" aria-hidden="true">73</span></button>
            <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18} /></button>
          </div>
        </header>

        <main className="content bk-content" id="bk-main" tabIndex={-1} ref={topRef}>
          <div className="bk-page">
            {empty ?
              <div className="bk-empty">
                <div className="bk-empty-ic"><Icon name="cart" size={26} /></div>
                <h2>Your basket is empty</h2>
                <p>Start exploring the catalogue and find offers that suit your needs.</p>
                <a className="bk-confirm" href="Catalogue.html">Catalogue <Icon name="arrowRight" size={15} /></a>
              </div> :
              sent ?
              <div className="bk-flow">
                <Stepper step={3} maxReached={3} onGo={() => {}} />
                <div className="bk-sent">
                  <div className="bk-sent-ic"><Icon name="check" size={30} /></div>
                  <h2>Sent to providers</h2>
                  <p>{selectedOffers.length} offer{selectedOffers.length !== 1 ? "s" : ""} assigned to <b>{target}</b>. Counter-offers go to the provider{selectedOffers.length !== 1 ? "s" : ""} for negotiation; accepted offers are confirmed as published. You'll be notified of each response.</p>
                  <div className="bk-sent-actions">
                    <a className="bk-confirm" href="My Projects.html">Go to project <Icon name="arrowRight" size={15} /></a>
                    <a className="bk-btn" href="Catalogue.html">Back to catalogue</a>
                  </div>
                </div>
              </div> :

              <div className="bk-flow">
                <Stepper step={step} maxReached={maxReached} onGo={goTo} />
                <RecapBar rows={rows} target={step >= 2 && canAssign ? target : ""} />

                {/* ─── STEP 1 · REVIEW & NEGOTIATE ────────── */}
                {step === 1 &&
                <div className="bk-stepbody">
                    <div className="bk-step-intro"><h2>Review &amp; negotiate</h2><p>Each offer is checked against your acceptance baseline. Settle every one — take the provider's terms, counter with your own, or edit term by term.</p></div>
                    <BaselineRecall />
                    <div className="bk-sec-title"><Icon name="layers" size={18} /> Offers in your basket <span className="bk-count">({selectedOffers.length})</span></div>
                    {selectedOffers.length === 0 ?
                  <div className="bk-none">No offers selected. Move one up from “Saved for later”, or browse the catalogue.</div> :
                  selectedOffers.map((o) =>
                  <OfferCard key={o.id} offer={o} terms={termsById[o.id]} proposal={st.proposals[o.id]} decision={st.decisions[o.id] || { mode: "pending", conceded: [] }}
                  onConcede={(fid) => concedeGap(o.id, fid)} onSetField={(fid, v) => setField(o.id, fid, v)} onProposeField={(fid, v) => proposeField(o.id, fid, v)} onAcceptAll={() => acceptAll(o.id)} onCounterAll={() => counterAll(o.id)}
                  onReopen={() => reopen(o.id)} onEdit={() => openDrawer(o.id, "edit")} onView={() => openDrawer(o.id, "review")}
                  onSave={() => moveToSaved(o.id)} onRemove={() => removeFromSelected(o.id)} />
                  )}

                    {savedOffers.length > 0 &&
                  <div className="bk-saved">
                        <button type="button" className="bk-sec-title as-toggle" onClick={() => setSavedOpen((o) => !o)} aria-expanded={savedOpen}>
                          <Icon name="bookmark" size={18} /> Saved for later <span className="bk-count">({savedOffers.length})</span>
                          <Icon name={savedOpen ? "chevronUp" : "chevronDown"} size={16} className="bk-saved-chev" />
                        </button>
                        {savedOpen && savedOffers.map((o) =>
                    <div className="bk-saved-row" key={o.id}>
                            <Monogram offer={o} size={40} />
                            <div className="bk-offer-main">
                              <div className="bk-offer-metarow"><span className="bk-kind" style={{ borderColor: hexToRgba(KIND_TONE[o.kind], .5), color: KIND_TONE[o.kind] }}><span className="bk-kind-dot" style={{ background: KIND_TONE[o.kind] }} />{o.kind}</span><span className="bk-offer-by">proposed by {o.provider}</span></div>
                              <div className="bk-offer-name sm">{o.name}</div>
                            </div>
                            <button type="button" className="bk-btn" onClick={() => moveToSelected(o.id)}><Icon name="plus" size={14} /> Move to basket</button>
                            <button type="button" className="bk-icon-danger" onClick={() => removeFromSaved(o.id)} aria-label={`Delete ${o.name}`}><Icon name="trash" size={15} /></button>
                          </div>
                    )}
                      </div>
                  }

                    <div className="bk-nav">
                      <a className="bk-btn ghost" href="Catalogue.html"><Icon name="chevronLeft" size={15} /> Continue shopping</a>
                      <button type="button" className="bk-confirm" disabled={selectedOffers.length === 0 || pendingCount > 0} onClick={() => goTo(2)}>
                        {pendingCount > 0 ? `Settle ${pendingCount} more to continue` : <>Assign to project <Icon name="arrowRight" size={15} /></>}
                      </button>
                    </div>
                  </div>
                }

                {/* ─── STEP 2 · ASSIGN ────────────────────── */}
                {step === 2 &&
                <div className="bk-stepbody">
                    <div className="bk-step-intro"><h2>Assign to a project</h2><p>Pick the project these {selectedOffers.length} offer{selectedOffers.length !== 1 ? "s" : ""} will belong to.</p></div>
                    <AssignPanel tab={assignTab} setTab={setAssignTab} projectId={projectId} setProjectId={setProjectId}
                  newProj={newProj} setNewProj={setNewProj} memberOpen={memberOpen} setMemberOpen={setMemberOpen} />
                    <div className="bk-nav">
                      <button type="button" className="bk-btn ghost" onClick={() => setStep(1)}><Icon name="chevronLeft" size={15} /> Back</button>
                      <button type="button" className="bk-confirm" disabled={!canAssign} onClick={() => goTo(3)}>Review &amp; confirm <Icon name="arrowRight" size={15} /></button>
                    </div>
                  </div>
                }

                {/* ─── STEP 3 · CONFIRM ───────────────────── */}
                {step === 3 &&
                <div className="bk-stepbody">
                    <div className="bk-step-intro"><h2>Confirm &amp; send</h2><p>Check every decision below, then send to the provider{selectedOffers.length !== 1 ? "s" : ""}.</p></div>
                    <ConfirmStep rows={rows} pricing={st.pricing} proposals={st.proposals} target={target} targetCaption={targetCaption} onView={(id) => openDrawer(id, "review")} />
                    <div className="bk-nav">
                      <button type="button" className="bk-btn ghost" onClick={() => setStep(2)}><Icon name="chevronLeft" size={15} /> Back</button>
                      <button type="button" className="bk-confirm" disabled={pendingCount > 0} onClick={() => setSent(true)}>Accept <Icon name="check" size={16} /></button>
                    </div>
                  </div>
                }
              </div>
              }
          </div>
        </main>
      </div>

      {drawerOffer &&
        <TermsDrawer offer={drawerOffer} terms={termsById[drawerOffer.id]} proposal={st.proposals[drawerOffer.id]} decision={st.decisions[drawerOffer.id] || { mode: "pending", conceded: [] }}
        open={drawerOpen} initialMode={drawer.mode} readOnly={step === 3} onClose={closeDrawer}
        onSetField={(fid, v) => setField(drawerOffer.id, fid, v)} onResetField={(fid) => resetField(drawerOffer.id, fid)} onConcede={(fid) => concedeGap(drawerOffer.id, fid)}
        onAcceptAll={() => {acceptAll(drawerOffer.id);closeDrawer();}} onCounterAll={() => {counterAll(drawerOffer.id);closeDrawer();}} />
        }

      <BottomNav onOpenMore={() => setMoreOpen(true)} />
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>);

  }

  ReactDOM.createRoot(document.getElementById("root")).render(<BasketApp />);
})();