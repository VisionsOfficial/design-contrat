// VisionsTrust — Create-offer shared field controls & helpers.
// Compact value editors reused across the guided creation flow. Exposed on window.CO.
(function () {
const { useState } = React;
const { Icon } = window.UI;

// ─── VALUE HELPERS ──────────────────────────────────────────────────────────
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const isEmpty = (v) => v === "" || v == null || (Array.isArray(v) && v.length === 0);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

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

const sectionFields = (section) => section.fields || (section.groups || []).flatMap((g) => g.fields);

// ─── SMALL INPUTS ─────────────────────────────────────────────────────────
const Sel = ({ value, onChange, options, width, full }) => (
  <span className="os-selectw" style={full ? { width: "100%" } : width ? { width } : undefined}>
    <select className="os-in" value={value} onChange={(e) => onChange(e.target.value)} style={full || width ? { width: "100%" } : undefined}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <Icon name="chevronDown" size={13} className="os-chev" />
  </span>
);
const Num = ({ value, onChange }) => (
  <input type="number" className="os-in num" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
);

// ─── VALUE CONTROL (every field type) ─────────────────────────────────────
function ValueControl({ field, value, onChange }) {
  switch (field.type) {
    case "text": return <input className="os-in sm" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "textarea": return <textarea className="os-ta" value={value || ""} placeholder={field.optional ? "Optional…" : ""} onChange={(e) => onChange(e.target.value)} />;
    case "date": return <input type="date" className="os-in" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "yesno": return <div className="seg2 mini">{["Yes", "No"].map((o) => <button key={o} type="button" className={value === o ? "active" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>;
    case "select": return <Sel value={value} onChange={onChange} options={field.options} />;
    case "numberUnit": return (<><Num value={value?.n} onChange={(n) => onChange({ ...value, n })} /><Sel value={value?.u} onChange={(u) => onChange({ ...value, u })} options={field.units} />{field.basis && <Sel value={value?.b} onChange={(b) => onChange({ ...value, b })} options={field.basis} />}</>);
    case "multiselect": return (<div className="os-chips">{field.options.map((o) => { const on = (value || []).includes(o); return <button key={o} type="button" className={`os-chip ${on ? "on" : ""}`} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])}>{o}</button>; })}</div>);
    case "opValue": return (<><Sel value={value?.op} onChange={(op) => onChange({ ...value, op })} options={field.operators} width={120} /><input className="os-in sm" value={value?.v || ""} onChange={(e) => onChange({ ...value, v: e.target.value })} /></>);
    case "procDeadline": { const showDays = !/Immediate/.test(value?.p || ""); return (<><Sel value={value?.p} onChange={(p) => onChange({ ...value, p })} options={field.options} width={170} />{showDays && <><Num value={value?.d} onChange={(d) => onChange({ ...value, d })} /><span className="os-unit">days</span></>}</>); }
    case "matrix": return (<div className="os-matrix">{field.rows.map((r) => (<div className="mrow" key={r}><span className="mkey"><span className={`os-sev-dot os-sev-${r}`} />{r}</span><span className="mval"><Num value={value?.[r]?.n} onChange={(n) => onChange({ ...value, [r]: { ...value[r], n } })} /><Sel value={value?.[r]?.u} onChange={(u) => onChange({ ...value, [r]: { ...value[r], u } })} options={field.units} /></span></div>))}</div>);
    default: return null;
  }
}

// ─── COMPACT TERM ROW (summary → expand to edit) ─────────────────────────────
// Collapsed: label · value · Fixed/Negotiable. Expanded: value editor + negotiable
// toggle + "on dataspace default" affordance. Deliberately lighter than the settings
// page: no per-term acceptance ranges — the profile handles negotiation stance.
function TermRow({ field, value, negotiable, onValue, onNeg }) {
  const [open, setOpen] = useState(false);
  const canNegotiate = field.type !== "date";
  const hasDefault = !isEmpty(field.def);
  const matches = hasDefault && eq(value, field.def);
  return (
    <div className={`co-trow ${open ? "open" : ""}`}>
      <button type="button" className="co-trow-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="co-trow-name">{field.label}<span className="co-trow-info" title={field.meaning}><Icon name="info" size={12} /></span></span>
        <span className="co-trow-val">{fmtVal(field, value)}</span>
        {canNegotiate && negotiable
          ? <span className="co-trow-state neg"><Icon name="triggers" size={10} /> Negotiable</span>
          : <span className="co-trow-state fixed">Fixed</span>}
        <Icon name="chevronDown" size={15} className="co-trow-chev" />
      </button>
      {!open && hasDefault && matches && <div className="co-trow-meta"><span className="co-trow-default"><Icon name="check" size={11} /> Dataspace default</span></div>}
      {open && (
        <div className="co-trow-body">
          <div className="co-trow-edit">
            <span className="co-trow-lab">Value</span>
            <div className="co-trow-ctrl"><ValueControl field={field} value={value} onChange={onValue} /></div>
          </div>
          {hasDefault && (matches
            ? <div className="co-trow-def match"><Icon name="check" size={12} /> Matches the dataspace default</div>
            : <div className="co-trow-def"><span>Dataspace default:</span> <b>{fmtVal(field, field.def)}</b> <button type="button" className="co-apply" onClick={() => onValue(clone(field.def))}>Reset</button></div>)}
          {canNegotiate && (
            <div className="co-trow-neg">
              <button type="button" className={`osf-negbtn ${negotiable ? "on" : ""}`} onClick={() => onNeg(!negotiable)} aria-pressed={negotiable}><span className="mini-toggle"><i /></span>Negotiable</button>
              <span className="co-trow-neghint">{negotiable ? "The contract agent may settle this term automatically." : "Fixed — every taker gets exactly this value."}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

window.CO = { clone, isEmpty, eq, fmtVal, sectionFields, Sel, Num, ValueControl, TermRow };
})();
