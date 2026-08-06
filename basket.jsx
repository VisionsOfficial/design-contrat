// VisionsTrust — Basket. Full-page 3-step assignment flow (no modal):
//   1. Review offers — save for later / remove, and adjust each offer's editable
//      (negotiable) terms & pricing. Fixed terms are tucked away, viewable on demand.
//   2. Assign to a project (existing or new).
//   3. Confirm & send the assignment.
(function () {
const { useState, useEffect, useMemo, useRef } = React;
const { Icon, AppSidebar, BottomNav, BottomNavSheet } = window.UI;
const { SECTIONS, ALL_FIELDS, AVAILABILITY } = window.OfferSettingsData;
const { ITEMS, PROJECTS, KIND_TONE, USER_BASELINE } = window.BasketData;
const { initials, hexToRgba } = window.CatData;
const FIELD = Object.fromEntries(ALL_FIELDS.map((f) => [f.id, f]));

const LS_KEY = "vt.basket.v3";
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

// ─── BASELINE LOGIC ─────────────────────────────────────────────────────────
// The buyer sets an acceptance baseline in their settings (USER_BASELINE). A term
// is a "gap" when its value does not meet that baseline. The provider's own
// acceptance range is never shown — the buyer always aims for their own baseline.
function meets(field, value, base) {
  if (!base) return true;
  if (isEmpty(value)) return false;
  const n = value && typeof value === "object" && "n" in value ? value.n : value;
  switch (base.op) {
    case "≤": return Number(n) <= base.v;
    case "≥": return Number(n) >= base.v;
    case "=": return value === base.v;
    case "in": return base.v.includes(value);
    case "includesAll": return Array.isArray(value) && base.v.every((x) => value.includes(x));
    case "≥tier": return AVAILABILITY.indexOf(value) >= AVAILABILITY.indexOf(base.v);
    default: return true;
  }
}
function isGap(field, value, base) { return !!base && !meets(field, value, base); }

// ─── BUILD PER-OFFER TERM CONFIG ────────────────────────────────────────────────
const TERM_SECTION_IDS = ["sla", "duration", "termination"];
function fieldsOf(section) { return section.fields || (section.groups || []).flatMap((g) => g.fields); }

function buildTerms(offer) {
  const ov = offer.overrides || {};
  const sections = TERM_SECTION_IDS.map((sid) => {
    const s = SECTIONS.find((x) => x.id === sid);
    const fields = fieldsOf(s).map((f) => {
      const o = ov[f.id] || {};
      const baseline = o.value !== undefined ? clone(o.value) : clone(f.def);
      const neg = o.neg !== undefined ? o.neg : !!f.neg;
      return { ...f, baseline, neg, userBase: USER_BASELINE[f.id] || null, negotiable: neg && f.type !== "date" && !isEmpty(baseline) };
    });
    return { id: s.id, title: s.title, desc: s.desc, icon: s.icon, fields };
  });
  const penSec = SECTIONS.find((s) => s.id === "penalties");
  const penalty = {};
  penSec.fields.forEach((f) => { penalty[f.id] = clone(f.def); });
  const negFields = sections.flatMap((s) => s.fields.filter((f) => f.negotiable));
  const fixedFields = sections.flatMap((s) => s.fields.filter((f) => !f.negotiable && !isEmpty(f.baseline)));
  return { sections, penalty, penSec, negFields, fixedFields, fixedCount: fixedFields.length };
}

const SEC_LABEL = { sla: "Service levels (SLA)", duration: "Duration & renewal", termination: "Termination" };

// ─── INPUTS ─────────────────────────────────────────────────────────────────
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
    case "textarea": return <textarea className="os-ta" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "yesno": return <div className="seg2 mini">{["Yes", "No"].map((o) => <button key={o} type="button" className={value === o ? "active teal" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>;
    case "select": return <Sel value={value} onChange={onChange} options={field.options} />;
    case "numberUnit": return (<><Num value={value?.n} onChange={(n) => onChange({ ...value, n })} /><Sel value={value?.u} onChange={(u) => onChange({ ...value, u })} options={field.units} />{field.basis && <Sel value={value?.b} onChange={(b) => onChange({ ...value, b })} options={field.basis} />}</>);
    case "multiselect": return (<div className="os-chips" style={{ justifyContent: "flex-start" }}>{field.options.map((o) => { const on = (value || []).includes(o); return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])}>{o}</button>; })}</div>);
    case "matrix": return (<div className="os-matrix">{field.rows.map((r) => (<div className="mrow" key={r}><span className="mkey"><span className={`os-sev-dot os-sev-${r}`} />{r}</span><span className="mval"><Num value={value?.[r]?.n} onChange={(n) => onChange({ ...value, [r]: { ...value[r], n } })} /><Sel value={value?.[r]?.u} onChange={(u) => onChange({ ...value, [r]: { ...value[r], u } })} options={field.units} /></span></div>))}</div>);
    default: return <span className="os-unit">{fmtVal(field, value)}</span>;
  }
}

// ─── ONE NEGOTIABLE TERM ────────────────────────────────────────────────────────
function TermRow({ field, value, onChange }) {
  const full = ["textarea", "matrix", "multiselect"].includes(field.type);
  const base = field.userBase;
  const gap = isGap(field, value, base);
  const changed = !eq(value, field.baseline);
  return (
    <div className={`bk-term neg ${full ? "is-full" : ""} ${gap ? "gap" : ""}`}>
      <div className="bk-term-head">
        <span className="bk-term-name">{field.label}</span>
        <span className="bk-term-info" title={field.meaning}><Icon name="info" size={12} /></span>
        {!base
          ? <span className="bk-st st-edit"><Icon name="edit" size={11} /> Editable</span>
          : gap
            ? <span className="bk-st st-gap"><Icon name="triggers" size={11} /> Gap vs. your baseline</span>
            : <span className="bk-st st-ok"><Icon name="check" size={11} /> Meets your baseline</span>}
      </div>
      <div className="bk-term-ctl"><EditControl field={field} value={value} onChange={onChange} /></div>
      <div className="bk-term-foot">
        {base
          ? <span className={`bk-guide ${gap ? "gap" : ""}`}><Icon name="sliders" size={11} /> Your baseline: <b>{base.label}</b></span>
          : <span className="bk-guide muted">No requirement set — open to negotiation.</span>}
        {changed && <button type="button" className="bk-reset" onClick={() => onChange(clone(field.baseline))}>Reset to {fmtVal(field, field.baseline)}</button>}
      </div>
    </div>
  );
}

// ─── NEGOTIABLE TERMS (emphasised) ──────────────────────────────────────────────
function NegotiableEditor({ terms, proposal, setField }) {
  const secs = terms.sections.filter((s) => s.fields.some((f) => f.negotiable));
  if (!secs.length) return <div className="bk-noneg">No editable terms — everything the provider published is fixed.</div>;
  return (
    <div className="bk-terms">
      {secs.map((sec) => (
        <div className="bk-tsec" key={sec.id}>
          <div className="bk-tsec-head"><span className="bk-tsec-ic"><Icon name={sec.icon} size={13} /></span>{SEC_LABEL[sec.id] || sec.title}</div>
          <div className="bk-tsec-body">
            {sec.fields.filter((f) => f.negotiable).map((f) => (
              <TermRow key={f.id} field={f} value={proposal[f.id]} onChange={(v) => setField(f.id, v)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FIXED TERMS (hidden, viewable on demand) ───────────────────────────────────
function FixedTerms({ terms }) {
  const [open, setOpen] = useState(false);
  const total = terms.fixedCount + 1; // + penalty commitment
  const bySec = terms.sections.map((s) => ({ ...s, fixed: s.fields.filter((f) => !f.negotiable && !isEmpty(f.baseline)) })).filter((s) => s.fixed.length);
  return (
    <div className={`bk-fixedblock ${open ? "open" : ""}`}>
      <button type="button" className="bk-fixed-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="bk-fixed-tag"><Icon name="lock" size={11} /> Fixed</span>
        <span className="bk-fixed-label">{total} fixed {total === 1 ? "term" : "terms"} set by the provider</span>
        <span className="bk-fixed-cta"><Icon name={open ? "eyeOff" : "eye"} size={13} /> {open ? "Hide" : "View"}</span>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={15} className="bk-fixed-chev" />
      </button>
      {open && (
        <div className="bk-fixed-body">
          {bySec.map((sec) => (
            <div className="bk-fixed-sec" key={sec.id}>
              <div className="bk-fixed-sechead">{SEC_LABEL[sec.id] || sec.title}</div>
              {sec.fixed.map((f) => (
                <div className="bk-fixed-row" key={f.id}>
                  <span className="bk-fixed-k">{f.label}</span>
                  <span className="bk-fixed-v">{fmtVal(f, f.baseline)}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="bk-fixed-sec">
            <div className="bk-fixed-sechead">Commitments &amp; penalties</div>
            <div className="bk-commit">
              <Icon name="shield" size={14} />
              <span>Backed by a <b>{terms.penalty.consequence_type}</b> penalty if <b>{terms.penalty.commitment_concerned}</b> falls {terms.penalty.trigger_threshold.op} {terms.penalty.trigger_threshold.v} ({terms.penalty.penalty_amount.n} {terms.penalty.penalty_amount.u}, assessed {terms.penalty.measurement_period.toLowerCase()}).</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PRICING (editable) ─────────────────────────────────────────────────────────
function PricingBlock({ pricing, onChange }) {
  const upd = (k, v) => onChange({ ...pricing, [k]: v });
  return (
    <div className="bk-body-block">
      <div className="bk-body-sub"><Icon name="coin" size={14} /> Pricing</div>
      <div className="bk-price-grid">
        <div><label className="os-flabel">Subscription pricing</label><input className="os-in bk-full" value={pricing.sub} onChange={(e) => upd("sub", e.target.value)} /></div>
        <div><label className="os-flabel">Billing period</label><Sel value={pricing.billing} onChange={(v) => upd("billing", v)} options={["One shot", "Daily", "Monthly", "Yearly", "Per API call"]} width="100%" /></div>
        <div><label className="os-flabel">Setup fee</label><input className="os-in bk-full" value={pricing.setup} onChange={(e) => upd("setup", e.target.value)} /></div>
        <div><label className="os-flabel">Cost per API call</label><input className="os-in bk-full" value={pricing.api} onChange={(e) => upd("api", e.target.value)} /></div>
        <div><label className="os-flabel">Currency</label><Sel value={pricing.currency} onChange={(v) => upd("currency", v)} options={["EUR", "USD", "GBP"]} width="100%" /></div>
      </div>
    </div>
  );
}

// ─── MONOGRAM ─────────────────────────────────────────────────────────────────
function Monogram({ offer, size = 52 }) {
  return (
    <div className="bk-mono" style={{ width: size, height: size, background: `linear-gradient(135deg, ${hexToRgba(offer.accent, 0.9)}, ${hexToRgba(offer.accent, 0.55)})` }} aria-hidden="true">
      {initials(offer.name)}
    </div>
  );
}
function OfferHead({ offer, size = 52, children }) {
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
    </div>
  );
}

// ─── STEP 1 · OFFER CARD ────────────────────────────────────────────────────────
function OfferCard({ offer, terms, proposal, pricing, onSetField, onSetPricing, onSave, onRemove }) {
  return (
    <article className="bk-offer step1">
      <OfferHead offer={offer}>
        <button type="button" className="bk-btn" onClick={onSave}><Icon name="bookmark" size={14} /> Save for later</button>
        <button type="button" className="bk-btn danger" onClick={onRemove}><Icon name="trash" size={14} /> Remove</button>
      </OfferHead>
      <div className="bk-offer-body">
        <div className="bk-body-block">
          <div className="bk-body-sub"><Icon name="scale" size={14} /> Editable terms <span className="bk-sub-count">{terms.negFields.length}</span></div>
          <NegotiableEditor terms={terms} proposal={proposal} setField={onSetField} />
        </div>
        <PricingBlock pricing={pricing} onChange={onSetPricing} />
        <FixedTerms terms={terms} />
      </div>
    </article>
  );
}

// ─── STEP 1 · REVIEW CARD (read-only) ──────────────────────────────────────────
function ReviewCard({ offer, terms, proposal, pricing, onSave, onRemove }) {
  const gaps = terms.negFields.filter((f) => isGap(f, proposal[f.id], f.userBase));
  return (
    <article className="bk-offer step1">
      <OfferHead offer={offer}>
        <button type="button" className="bk-btn" onClick={onSave}><Icon name="bookmark" size={14} /> Save for later</button>
        <button type="button" className="bk-btn danger" onClick={onRemove}><Icon name="trash" size={14} /> Remove</button>
      </OfferHead>
      <div className={`bk-gapstrip ${gaps.length ? "has-gap" : "ok"}`}>
        {gaps.length
          ? <><Icon name="triggers" size={14} /><span><b>{gaps.length}</b> gap{gaps.length !== 1 ? "s" : ""} vs. your acceptance baseline</span></>
          : <><Icon name="check" size={14} /><span>Meets your acceptance baseline on every term.</span></>}
      </div>
      {gaps.length > 0 && (
        <div className="bk-gaplist">
          {gaps.map((f) => (
            <div className="bk-gapitem" key={f.id}>
              <span className="bk-gapitem-n">{f.label}</span>
              <span className="bk-gapitem-v"><b>{fmtVal(f, proposal[f.id])}</b> <span className="bk-gapitem-exp">· you accept {f.userBase.label}</span></span>
            </div>
          ))}
        </div>
      )}
      <div className="bk-offer-summary">
        <div className="bk-sum-cell"><span className="bk-sum-k">Pricing</span><span className="bk-sum-v">{fmtPrice(pricing)}</span></div>
        <div className="bk-sum-cell"><span className="bk-sum-k">Terms</span><span className="bk-sum-tags"><span className="bk-st st-edit"><Icon name="edit" size={11} /> {terms.negFields.length} editable</span><span className="bk-fixed-tag"><Icon name="lock" size={11} /> {terms.fixedCount + 1} fixed</span></span></div>
      </div>
    </article>
  );
}

// ─── USER ACCEPTANCE BASELINE (recalled from settings) ───────────────────────
function BaselineRecall() {
  const [open, setOpen] = useState(false);
  const ids = Object.keys(USER_BASELINE);
  return (
    <div className={`bk-baseline ${open ? "open" : ""}`}>
      <div className="bk-baseline-bar">
        <span className="bk-baseline-ic"><Icon name="sliders" size={16} /></span>
        <div className="bk-baseline-txt">
          <div className="bk-baseline-title">Your acceptance baseline</div>
          <div className="bk-baseline-sub">Your minimum requirements — set once in your settings, applied to every offer here.</div>
        </div>
        <a className="bk-baseline-link" href="Profile Settings.html"><Icon name="external" size={13} /> Edit in settings</a>
        <button type="button" className="bk-baseline-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Hide baseline" : "Show baseline"}>
          <Icon name={open ? "chevronUp" : "chevronDown"} size={16} />
        </button>
      </div>
      {open && (
        <div className="bk-baseline-body">
          {ids.map((id) => (
            <div className="bk-baseline-row" key={id}>
              <span className="bk-baseline-k">{FIELD[id] ? FIELD[id].label : id}</span>
              <span className="bk-baseline-v">{USER_BASELINE[id].label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PERSISTENT RECAP (always visible, expandable) ──────────────────────────
function RecapBar({ offers, pricing, gapByOffer, gapTotal, target }) {
  const [open, setOpen] = useState(false);
  if (!offers.length) return null;
  return (
    <div className={`bk-recap ${open ? "open" : ""}`}>
      <button type="button" className="bk-recap-bar" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="bk-recap-title"><Icon name="list" size={14} /> Summary</span>
        <span className="bk-recap-stats">
          <span className="bk-recap-pill"><b>{offers.length}</b><span>offer{offers.length !== 1 ? "s" : ""}</span></span>
          <span className={`bk-recap-pill ${gapTotal ? "gap" : "ok"}`}>{gapTotal
            ? <><Icon name="triggers" size={11} /><b>{gapTotal}</b><span>gap{gapTotal !== 1 ? "s" : ""}</span></>
            : <><Icon name="check" size={11} /><span>On baseline</span></>}</span>
          {target && <span className="bk-recap-pill"><Icon name="folder" size={11} /> {target}</span>}
        </span>
        <span className="bk-recap-cta">{open ? "Hide" : "Details"}<Icon name={open ? "chevronUp" : "chevronDown"} size={15} /></span>
      </button>
      {open && (
        <div className="bk-recap-body">
          {offers.map((o) => {
            const g = gapByOffer[o.id] || 0;
            return (
              <div className="bk-recap-row" key={o.id}>
                <Monogram offer={o} size={30} />
                <span className="bk-recap-name">{o.name}</span>
                <span className="bk-recap-price">{fmtPrice(pricing[o.id])}</span>
                <span className={`bk-recap-tag ${g ? "gap" : "ok"}`}>{g ? <><Icon name="triggers" size={10} /><span>{g} gap{g !== 1 ? "s" : ""}</span></> : <><Icon name="check" size={10} /><span>On baseline</span></>}</span>
              </div>
            );
          })}
          {target && <div className="bk-recap-target"><Icon name="folder" size={13} /> Assigning to <b>{target}</b></div>}
        </div>
      )}
    </div>
  );
}

// ─── STEPPER ────────────────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, label: "Review offers", icon: "cart" },
  { n: 2, label: "Configure terms", icon: "scale" },
  { n: 3, label: "Assign to project", icon: "folder" },
  { n: 4, label: "Confirm & send", icon: "check" },
];
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
          </li>
        );
      })}
    </ol>
  );
}

// ─── STEP 2 · ASSIGN ──────────────────────────────────────────────────────────
function AssignPanel({ tab, setTab, projectId, setProjectId, newProj, setNewProj, memberOpen, setMemberOpen }) {
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
      {tab === "existing" ? (
        <>
          <div className="bk-assign-label">Select an existing project</div>
          <div className="bk-projlist" role="radiogroup" aria-label="Existing projects">
            {PROJECTS.map((p) => (
              <button type="button" key={p.id} role="radio" aria-checked={projectId === p.id} className={`bk-proj ${projectId === p.id ? "sel" : ""}`} onClick={() => setProjectId(p.id)}>
                <div className="bk-proj-logo">{p.org}</div>
                <div className="bk-proj-meta"><div className="bk-proj-name">{p.name}</div><div className="bk-proj-cap">{p.caption}</div></div>
                <span className="bk-proj-radio" aria-hidden="true" />
              </button>
            ))}
          </div>
          <button type="button" className="bk-member-toggle" onClick={() => setMemberOpen((o) => !o)} aria-expanded={memberOpen}>
            Project where one of the participants is already a member <Icon name={memberOpen ? "chevronUp" : "chevronDown"} size={14} />
          </button>
          {memberOpen && <div className="bk-member-note">No participant of these offers is already a member of another of your projects.</div>}
        </>
      ) : (
        <div className="bk-newform">
          <div><label className="os-flabel">Project title<em>*</em></label><input className="os-in bk-full" value={newProj.title} onChange={(e) => setNewProj({ ...newProj, title: e.target.value })} placeholder="Ex: Customer Journey Optimisation Platform" /></div>
          <div><label className="os-flabel">Project caption<em>*</em></label><input className="os-in bk-full" value={newProj.caption} onChange={(e) => setNewProj({ ...newProj, caption: e.target.value.slice(0, 69) })} placeholder="Short sentence to describe your project goals" /><div className="os-fhelp">{69 - newProj.caption.length} characters remaining</div></div>
          <div><label className="os-flabel">Project description<em>*</em></label><textarea className="os-ta" style={{ minHeight: 90 }} value={newProj.desc} onChange={(e) => setNewProj({ ...newProj, desc: e.target.value })} placeholder="Describe your project: impact, how far along you are, your objectives, timeline and needs." /></div>
          <div><label className="os-flabel">Categories<em>*</em></label><Sel value={newProj.category} onChange={(v) => setNewProj({ ...newProj, category: v })} options={["Browse", "Skills matching", "Learning analytics", "Workforce", "Data sharing"]} width="100%" /></div>
        </div>
      )}
    </div>
  );
}

// ─── STEP 3 · CONFIRM SUMMARY ──────────────────────────────────────────────────
function fmtPrice(p) {
  const parts = [];
  parts.push(`${p.sub || 0} ${p.currency} · ${p.billing}`);
  if (p.setup && p.setup !== "0") parts.push(`setup ${p.setup} ${p.currency}`);
  if (p.api && p.api !== "0") parts.push(`${p.api} ${p.currency}/call`);
  return parts.join(" · ");
}
function ConfirmStep({ offers, termsById, proposals, pricing, target, targetCaption, gapTotal }) {
  return (
    <div className="bk-confirm-wrap">
      <div className="bk-confirm-target">
        <div className="bk-ct-ic"><Icon name="folder" size={18} /></div>
        <div><div className="bk-ct-label">Assigning to</div><div className="bk-ct-name">{target}</div>{targetCaption && <div className="bk-ct-cap">{targetCaption}</div>}</div>
        <div className="bk-ct-count">{offers.length} offer{offers.length !== 1 ? "s" : ""}</div>
      </div>
      {gapTotal > 0 ? (
        <div className="bk-banner review"><Icon name="triggers" size={16} /><span><b>{gapTotal}</b> term{gapTotal !== 1 ? "s" : ""} still fall short of your acceptance baseline. They'll go to the relevant provider{gapTotal !== 1 ? "s" : ""} for negotiation — everything else is confirmed as-is.</span></div>
      ) : (
        <div className="bk-banner ok"><Icon name="check" size={16} /><span>Every selected offer meets your acceptance baseline. Nothing needs negotiating.</span></div>
      )}
      {offers.map((o) => {
        const t = termsById[o.id]; const p = proposals[o.id] || {};
        const notable = t.negFields.filter((f) => !eq(p[f.id], f.baseline) || isGap(f, p[f.id], f.userBase));
        return (
          <div className="bk-review-offer" key={o.id}>
            <OfferHead offer={o} size={34} />
            <div className="bk-conf-grid">
              <div className="bk-conf-cell">
                <div className="bk-conf-k">Pricing</div>
                <div className="bk-conf-v">{fmtPrice(pricing[o.id])}</div>
              </div>
              <div className="bk-conf-cell">
                <div className="bk-conf-k">Terms to settle</div>
                {notable.length ? (
                  <div className="bk-conf-terms">
                    {notable.map((f) => {
                      const gap = isGap(f, p[f.id], f.userBase);
                      const changed = !eq(p[f.id], f.baseline);
                      return (
                        <div className="bk-conf-term" key={f.id}>
                          <span className="bk-conf-tn">{f.label}</span>
                          <span className="bk-conf-tv">{changed ? <><s>{fmtVal(f, f.baseline)}</s> → <b>{fmtVal(f, p[f.id])}</b></> : <b>{fmtVal(f, p[f.id])}</b>}</span>
                          {gap && <span className="bk-st st-gap"><Icon name="triggers" size={11} /> Gap</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : <div className="bk-conf-v muted">On baseline — nothing to negotiate.</div>}
              </div>
            </div>
            <div className="bk-conf-fixed"><Icon name="lock" size={12} /> {t.fixedCount + 1} fixed {t.fixedCount + 1 === 1 ? "term" : "terms"} accepted as published.</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function BasketApp() {
  const termsById = useMemo(() => Object.fromEntries(ITEMS.map((o) => [o.id, buildTerms(o)])), []);

  const seed = () => {
    const proposals = {};
    ITEMS.forEach((o) => { const p = {}; termsById[o.id].negFields.forEach((f) => { p[f.id] = clone(f.baseline); }); proposals[o.id] = p; });
    const pricing = Object.fromEntries(ITEMS.map((o) => [o.id, clone(o.pricing)]));
    return {
      selected: ITEMS.filter((o) => !o.saved).map((o) => o.id),
      saved: ITEMS.filter((o) => o.saved).map((o) => o.id),
      proposals, pricing,
    };
  };
  // Per-offer deep merge: a term that only just became negotiable has no entry in the
  // persisted proposal, so it must fall back to the freshly seeded baseline.
  const mergeProposals = (seeded, saved) => Object.fromEntries(Object.keys(seeded).map((k) => [k, { ...seeded[k], ...((saved || {})[k] || {}) }]));
  const load = () => {
    try { const raw = localStorage.getItem(LS_KEY); if (raw) { const s = seed(); const j = JSON.parse(raw); return { ...s, ...j, proposals: mergeProposals(s.proposals, j.proposals), pricing: { ...s.pricing, ...j.pricing } }; } } catch (e) {}
    return seed();
  };

  const [st, setSt] = useState(load);
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [sent, setSent] = useState(false);
  const [savedOpen, setSavedOpen] = useState(true);
  const [assignTab, setAssignTab] = useState("existing");
  const [projectId, setProjectId] = useState(null);
  const [newProj, setNewProj] = useState({ title: "", caption: "", desc: "", category: "Browse" });
  const [memberOpen, setMemberOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const topRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) {} }, [st]);
  useEffect(() => { if (topRef.current) topRef.current.scrollTop = 0; }, [step, sent]);

  const byId = (id) => ITEMS.find((o) => o.id === id);
  const selectedOffers = st.selected.map(byId).filter(Boolean);
  const savedOffers = st.saved.map(byId).filter(Boolean);

  const setField = (offerId, fieldId, v) => setSt((s) => ({ ...s, proposals: { ...s.proposals, [offerId]: { ...s.proposals[offerId], [fieldId]: v } } }));
  const setPricingFor = (offerId, v) => setSt((s) => ({ ...s, pricing: { ...s.pricing, [offerId]: v } }));
  const moveToSaved = (id) => setSt((s) => ({ ...s, selected: s.selected.filter((x) => x !== id), saved: s.saved.includes(id) ? s.saved : [...s.saved, id] }));
  const moveToSelected = (id) => setSt((s) => ({ ...s, saved: s.saved.filter((x) => x !== id), selected: s.selected.includes(id) ? s.selected : [...s.selected, id] }));
  const removeFromSelected = (id) => setSt((s) => ({ ...s, selected: s.selected.filter((x) => x !== id) }));
  const removeFromSaved = (id) => setSt((s) => ({ ...s, saved: s.saved.filter((x) => x !== id) }));

  const goTo = (n) => { setStep(n); setMaxReached((m) => Math.max(m, n)); };

  // gaps vs the buyer's own acceptance baseline, per offer + total
  const gapByOffer = {};
  let gapTotal = 0;
  selectedOffers.forEach((o) => {
    const t = termsById[o.id]; const p = st.proposals[o.id] || {};
    const g = t.negFields.filter((f) => isGap(f, p[f.id], f.userBase)).length;
    gapByOffer[o.id] = g; gapTotal += g;
  });

  const canAssign = assignTab === "existing" ? !!projectId : (newProj.title.trim() && newProj.caption.trim());
  const target = assignTab === "existing" ? (PROJECTS.find((p) => p.id === projectId)?.name || "") : (newProj.title || "New project");
  const targetCaption = assignTab === "existing" ? (PROJECTS.find((p) => p.id === projectId)?.caption || "") : newProj.caption;
  const empty = selectedOffers.length === 0 && savedOffers.length === 0;

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
            {empty ? (
              <div className="bk-empty">
                <div className="bk-empty-ic"><Icon name="cart" size={26} /></div>
                <h2>Your basket is empty</h2>
                <p>Start exploring the catalogue and find offers that suit your needs.</p>
                <a className="bk-confirm" href="Catalogue.html">Catalogue <Icon name="arrowRight" size={15} /></a>
              </div>
            ) : sent ? (
              <div className="bk-flow">
                <Stepper step={4} maxReached={4} onGo={() => {}} />
                <div className="bk-sent">
                  <div className="bk-sent-ic"><Icon name="check" size={30} /></div>
                  <h2>Invitation sent</h2>
                  <p>{selectedOffers.length} offer{selectedOffers.length !== 1 ? "s" : ""} assigned to <b>{target}</b>. Any terms still short of your baseline go to the provider{selectedOffers.length !== 1 ? "s" : ""} for negotiation — you'll be notified of their response.</p>
                  <div className="bk-sent-actions">
                    <a className="bk-confirm" href="My Projects.html">Go to project <Icon name="arrowRight" size={15} /></a>
                    <a className="bk-btn" href="Catalogue.html">Back to catalogue</a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bk-flow">
                <Stepper step={step} maxReached={maxReached} onGo={goTo} />
                <RecapBar offers={selectedOffers} pricing={st.pricing} gapByOffer={gapByOffer} gapTotal={gapTotal} target={(step >= 3 && canAssign) ? target : ""} />

                {/* ─── STEP 1 ─────────────────────────────── */}
                {step === 1 && (
                  <div className="bk-stepbody">
                    <div className="bk-step-intro"><h2>Review your basket</h2><p>Each offer is checked against your acceptance baseline. Gaps are highlighted up front so you know exactly what you'll negotiate.</p></div>
                    <BaselineRecall />
                    <div className="bk-sec-title"><Icon name="layers" size={18} /> Selected offers <span className="bk-count">({selectedOffers.length})</span></div>
                    {selectedOffers.length === 0 ? (
                      <div className="bk-none">No offers selected. Move one up from “Saved for later”, or browse the catalogue.</div>
                    ) : selectedOffers.map((o) => (
                      <ReviewCard key={o.id} offer={o} terms={termsById[o.id]} proposal={st.proposals[o.id]} pricing={st.pricing[o.id]}
                        onSave={() => moveToSaved(o.id)} onRemove={() => removeFromSelected(o.id)} />
                    ))}

                    {savedOffers.length > 0 && (
                      <div className="bk-saved">
                        <button type="button" className="bk-sec-title as-toggle" onClick={() => setSavedOpen((o) => !o)} aria-expanded={savedOpen}>
                          <Icon name="bookmark" size={18} /> Saved for later <span className="bk-count">({savedOffers.length})</span>
                          <Icon name={savedOpen ? "chevronUp" : "chevronDown"} size={16} className="bk-saved-chev" />
                        </button>
                        {savedOpen && savedOffers.map((o) => (
                          <div className="bk-saved-row" key={o.id}>
                            <Monogram offer={o} size={40} />
                            <div className="bk-offer-main">
                              <div className="bk-offer-metarow"><span className="bk-kind" style={{ borderColor: hexToRgba(KIND_TONE[o.kind], .5), color: KIND_TONE[o.kind] }}><span className="bk-kind-dot" style={{ background: KIND_TONE[o.kind] }} />{o.kind}</span><span className="bk-offer-by">proposed by {o.provider}</span></div>
                              <div className="bk-offer-name sm">{o.name}</div>
                            </div>
                            <button type="button" className="bk-btn" onClick={() => moveToSelected(o.id)}><Icon name="plus" size={14} /> Move to current selection</button>
                            <button type="button" className="bk-icon-danger" onClick={() => removeFromSaved(o.id)} aria-label={`Delete ${o.name}`}><Icon name="trash" size={15} /></button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bk-nav">
                      <a className="bk-btn ghost" href="Catalogue.html"><Icon name="chevronLeft" size={15} /> Continue shopping</a>
                      <button type="button" className="bk-confirm" disabled={selectedOffers.length === 0} onClick={() => goTo(2)}>Configure terms <Icon name="arrowRight" size={15} /></button>
                    </div>
                  </div>
                )}

                {/* ─── STEP 2 ─────────────────────────────── */}
                {step === 2 && (
                  <div className="bk-stepbody">
                    <div className="bk-step-intro"><h2>Configure the terms</h2><p>Adjust the editable terms and pricing for each offer. Fixed terms set by the provider are shown for reference.</p></div>
                    <div className="bk-sec-title"><Icon name="scale" size={18} /> Offers to configure <span className="bk-count">({selectedOffers.length})</span></div>
                    {selectedOffers.map((o) => (
                      <OfferCard key={o.id} offer={o} terms={termsById[o.id]} proposal={st.proposals[o.id]} pricing={st.pricing[o.id]}
                        onSetField={(fid, v) => setField(o.id, fid, v)} onSetPricing={(v) => setPricingFor(o.id, v)}
                        onSave={() => moveToSaved(o.id)} onRemove={() => removeFromSelected(o.id)} />
                    ))}
                    <div className="bk-nav">
                      <button type="button" className="bk-btn ghost" onClick={() => setStep(1)}><Icon name="chevronLeft" size={15} /> Back</button>
                      <button type="button" className="bk-confirm" onClick={() => goTo(3)}>Assign to project <Icon name="arrowRight" size={15} /></button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="bk-stepbody">
                    <div className="bk-step-intro"><h2>Assign to a project</h2><p>Pick the project these {selectedOffers.length} offer{selectedOffers.length !== 1 ? "s" : ""} will belong to.</p></div>
                    <AssignPanel tab={assignTab} setTab={setAssignTab} projectId={projectId} setProjectId={setProjectId}
                      newProj={newProj} setNewProj={setNewProj} memberOpen={memberOpen} setMemberOpen={setMemberOpen} />
                    <div className="bk-nav">
                      <button type="button" className="bk-btn ghost" onClick={() => setStep(2)}><Icon name="chevronLeft" size={15} /> Back</button>
                      <button type="button" className="bk-confirm" disabled={!canAssign} onClick={() => goTo(4)}>Review &amp; confirm <Icon name="arrowRight" size={15} /></button>
                    </div>
                  </div>
                )}

                {/* ─── STEP 3 ─────────────────────────────── */}
                {step === 4 && (
                  <div className="bk-stepbody">
                    <div className="bk-step-intro"><h2>Confirm your assignment</h2><p>Check everything below, then send the invitation to the provider{selectedOffers.length !== 1 ? "s" : ""}.</p></div>
                    <ConfirmStep offers={selectedOffers} termsById={termsById} proposals={st.proposals} pricing={st.pricing} target={target} targetCaption={targetCaption} gapTotal={gapTotal} />
                    <div className="bk-nav">
                      <button type="button" className="bk-btn ghost" onClick={() => setStep(3)}><Icon name="chevronLeft" size={15} /> Back</button>
                      <button type="button" className="bk-confirm" onClick={() => setSent(true)}>Confirm assignment <Icon name="check" size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomNav onOpenMore={() => setMoreOpen(true)} />
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<BasketApp />);
})();
