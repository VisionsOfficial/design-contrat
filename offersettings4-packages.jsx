// VisionsTrust — Packages. A package is a VARIANT of the same offer: same pricing shape
// as a single price, plus the resources it includes and the usage policies that apply.
// Both start from the offer's values and are edited directly — no override switch.
(function () {
  const { useState } = React;
  const { Icon } = window.UI;

  // Resource catalogue of the participant. The offer selects resources from it (st.resources);
  // a package can include a subset of the offer's resources.
  const RESOURCES = [
  { id: "r_api", name: "check_free_offer", kind: "Data", meta: "REST API · JSON · live" },
  { id: "r_hist", name: "check_history_export", kind: "Data", meta: "Batch export · CSV · daily" },
  { id: "r_enrich", name: "company_enrichment_set", kind: "Data", meta: "REST API · JSON · weekly" },
  { id: "r_verify", name: "identity_verification_service", kind: "Service", meta: "Processing service · sync" },
  { id: "r_score", name: "risk_scoring_service", kind: "Service", meta: "Processing service · async" },
  { id: "r_onboard", name: "guided_onboarding", kind: "Service", meta: "Human support · 5 business days" }];

  const resById = (id) => RESOURCES.find((r) => r.id === id);
  const onKeys = (o) => Object.keys(o || {}).filter((k) => o[k]).sort();

  // Effective values: a package that has never been touched shows the offer's values.
  const pkRes = (st, pk) => Array.isArray(pk.resources) ? pk.resources : st.resources || [];
  const pkPol = (st, pk) => pk.policies ? pk.policies : st.policies || {};

  // What a package changes vs. the offer — drives the header badges.
  function pkDiff(st, pk) {
    const eq = window.OS4.eq;
    const secs = [];
    if (!eq([...pkRes(st, pk)].sort(), [...(st.resources || [])].sort())) secs.push("resources");
    if (!eq(onKeys(pkPol(st, pk)), onKeys(st.policies))) secs.push("policies");
    return { secs, fields: secs.length };
  }

  const OVS = [
  { id: "resources", name: "Resources included", icon: "database", d: "Which of the offer's resources this package gives access to." },
  { id: "policies", name: "Usage policies", icon: "shield", d: "ODRL policies that constrain how the data may be used under this package." }];


  // ─── small pieces ───────────────────────────────────────────────────────────
  function OvToggle({ on, onChange, label }) {
    return (
      <button type="button" className={`osf-negbtn${on ? " on" : ""}`} aria-pressed={on} onClick={() => onChange(!on)}>
      <span className="mini-toggle"><i /></span>{label || "Specific to this package"}
    </button>);

  }

  // A card that is always editable, pre-filled with the offer's values.
  function OvBlock({ ov, st, pk, up }) {
    const { PKG_POL } = window.OS4;
    const [open, setOpen] = useState(true);
    const diff = pkDiff(st, pk).secs.includes(ov.id);

    let summary = "";
    if (ov.id === "resources") { const r = pkRes(st, pk); summary = r.length ? r.map((id) => (resById(id) || {}).name).join(", ") : "none"; }
    else { const p = onKeys(pkPol(st, pk)).map((k) => (PKG_POL.find((x) => x.id === k) || {}).t); summary = p.length ? p.join(", ") : "no restriction set"; }

    const resetAll = () => up(ov.id === "resources" ? { resources: [...(st.resources || [])] } : { policies: { ...(st.policies || {}) } });

    return (
      <div className={`pkx-ov on${open ? " open" : ""}`}>
      <div className="pkx-ov-head">
        <button type="button" className="pkx-ov-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="pkx-ov-ic"><Icon name={ov.icon} size={14} /></span>
          <span className="pkx-ov-name">{ov.name}</span>
          <span className={`pkx-ov-src${diff ? " own" : ""}`}>{diff ? "Differs from the offer" : "Same as the offer"}</span>
          <Icon name="chevronDown" size={15} className="pkx-ov-chev" />
        </button>
      </div>
      <div className="pkx-ov-sum" title={ov.d}>{summary}</div>
      {open &&
        <div className="pkx-ov-body">
          {ov.id === "resources" &&
          <>
              <div className="pkx-res">{(st.resources || []).map((id) => { const r = resById(id) || {}; const sel = pkRes(st, pk).includes(id); return (
                  <button key={id} type="button" className={`pkx-rchip${sel ? " on" : ""}`} aria-pressed={sel} onClick={() => up({ resources: sel ? pkRes(st, pk).filter((x) => x !== id) : [...pkRes(st, pk), id] })}>
                  <span className={`pkx-rk ${r.kind === "Service" ? "svc" : "data"}`}>{r.kind}</span>
                  <span className="pkx-rn">{r.name}</span>
                  <span className="pkx-rm">{r.meta}</span>
                  <Icon name={sel ? "check" : "plus"} size={13} />
                </button>);
              })}</div>
              {!pkRes(st, pk).length && <div className="pk-miss"><Icon name="info" size={12} /> No resource in this package — takers would subscribe to nothing.</div>}
            </>
          }
          {ov.id === "policies" &&
          <div className="os-chips">{PKG_POL.map((pol) => { const on2 = !!pkPol(st, pk)[pol.id]; return <button key={pol.id} type="button" className={`os-chip ${on2 ? "on" : ""}`} aria-pressed={on2} onClick={() => up({ policies: { ...pkPol(st, pk), [pol.id]: !on2 } })}>{pol.t}</button>; })}</div>
          }
          <div className="pkx-ov-foot">
            <span>{ov.id === "policies" ? "Auto-accept ranges stay offer-level — a taker negotiating a policy date is answered with the offer's range." : "Only resources listed in the offer content can be added to a package."}</span>
            <button type="button" className="os-apply" onClick={resetAll}>Reset to offer values</button>
          </div>
        </div>
        }
    </div>);

  }

  // ─── one package ────────────────────────────────────────────────────────────
  function PackageRow({ i, st, set }) {
    const { pkFmt, pkNum, pkIssues, clone, MiniNegStrip, Num, Sel } = window.OS4;
    const pk = st.packages[i];
    const [open, setOpen] = useState(i === 0);
    const cur = pk.currency || st.pricing.currency;
    const up = (patch) => set((s) => { s.packages[i] = { ...s.packages[i], ...patch }; });
    const issues = pkIssues(pk);
    const diff = pkDiff(st, pk);
    const canDel = st.packages.length > 1;
    const nRes = pkRes(st, pk).length;
    return (
      <div className={`pkx-card${pk.recommended ? " reco" : ""}${issues.length ? " warn" : ""}${open ? " open" : ""}`}>
      <div className="pkx-head">
        <button type="button" className="pkx-exp" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Expand package"><Icon name="chevronDown" size={16} /></button>
        <input className="pkx-name" value={pk.name} placeholder={`Package ${i + 1}`} aria-label="Package name" onChange={(e) => up({ name: e.target.value })} />
        {pk.recommended && <span className="pkx-reco"><Icon name="star" size={10} /> Recommended</span>}
        <span className="pkx-price">{String(pk.sub == null ? "" : pk.sub).trim() === "" ? "—" : pkFmt(pk.sub) + " " + cur} · {(pk.billing || "Monthly")}{pkNum(pk.setup) ? " · " + pkFmt(pk.setup) + " " + cur + " set-up" : ""}</span>
        <span className="pkx-badges">
          <span className="pkx-b res">{nRes} resource{nRes === 1 ? "" : "s"}</span>
          {diff.fields > 0 ? <span className="pkx-b ov">{diff.fields === 2 ? "Own res. + policies" : diff.secs[0] === "resources" ? "Own resources" : "Own policies"}</span> : <span className="pkx-b inh">Same as offer</span>}
          {issues.length > 0 && <span className="pkx-b warn">Incomplete</span>}
        </span>
        <span className="pkx-tools">
          <button type="button" className={`pk-tool${pk.recommended ? " on" : ""}`} title="Highlight as recommended" onClick={() => set((s) => { s.packages.forEach((x, j) => { x.recommended = j === i ? !pk.recommended : false; }); })}><Icon name="star" size={14} /></button>
          <button type="button" className="pk-tool" title="Duplicate package" onClick={() => set((s) => { s.packages.splice(i + 1, 0, { ...clone(pk), _id: "pk" + Math.random().toString(36).slice(2, 7), name: (pk.name || "Package") + " copy", recommended: false }); })}><Icon name="copy" size={14} /></button>
          <button type="button" className="pk-tool danger" title="Remove package" disabled={!canDel} onClick={() => { if (canDel) set((s) => { s.packages.splice(i, 1); }); }}><Icon name="trash" size={14} /></button>
        </span>
      </div>

      {open &&
        <div className="pkx-body">
          <div className="pkx-sec">
            <div className="pkx-sec-h"><span className="pkx-ov-ic"><Icon name="coin" size={14} /></span><span className="pkx-ov-name">Pricing</span></div>
            <div className="pkx-pgrid">
              <div><label className="os-flabel">Subscription pricing<em>*</em></label><div className="pk-inrow"><input className="os-in" inputMode="decimal" value={pk.sub == null ? "" : pk.sub} placeholder="0" onChange={(e) => up({ sub: e.target.value })} /><span className="pk-suffix">{cur}</span></div></div>
              <div><label className="os-flabel">Billing period<em>*</em></label><Sel value={pk.billing || "Monthly"} onChange={(v) => up({ billing: v })} options={["One shot", "Daily", "Monthly", "Yearly", "Per API call"]} full /></div>
              <div><label className="os-flabel">Setup fee</label><div className="pk-inrow"><input className="os-in" inputMode="decimal" value={pk.setup == null ? "" : pk.setup} placeholder="0" onChange={(e) => up({ setup: e.target.value })} /><span className="pk-suffix">{cur} · one shot</span></div></div>
              <div><label className="os-flabel">Cost per API call</label><div className="pk-inrow"><input className="os-in" inputMode="decimal" value={pk.api == null ? "" : pk.api} placeholder="0" onChange={(e) => up({ api: e.target.value })} /><span className="pk-suffix">{cur} / call</span></div></div>
              <div><label className="os-flabel">Currency<em>*</em></label><Sel value={cur} onChange={(v) => up({ currency: v })} options={["EUR", "USD", "GBP"]} full /></div>
            </div>
            <label className="os-flabel">Pricing description</label>
            <textarea className="os-ta" style={{ minHeight: 76 }} placeholder="Describe this package's pricing model, and anything takers should know before choosing it." value={pk.desc || ""} onChange={(e) => up({ desc: e.target.value })} />
            <div className="pkx-negrow">
              <OvToggle on={!!pk.neg} onChange={(v) => up({ neg: v })} label="Price is negotiable" />
              {pk.neg && <MiniNegStrip autoAgent={st.autoAgent} note={pk.note || ""} onNote={(v) => up({ note: v })} acceptEl={<span className="os-range"><Num value={(pk.accept || {}).min} onChange={(min) => up({ accept: { ...(pk.accept || {}), min } })} /><span className="dash">to</span><Num value={(pk.accept || {}).max} onChange={(max) => up({ accept: { ...(pk.accept || {}), max } })} /><span className="os-unit">{cur}</span></span>} />}
            </div>
          </div>

          <div className="pkx-ovs">{OVS.map((ov) => <OvBlock key={ov.id} ov={ov} st={st} pk={pk} up={up} />)}</div>
          {issues.length > 0 && <div className="pk-miss"><Icon name="info" size={12} /> Still required: {issues.join(", ")}</div>}
        </div>
        }
    </div>);

  }

  // ─── packages list, rendered inside the Pricing & Packages panel ────────────
  function PackagesSection({ st, set }) {
    const { pkIssues, EMPTY_PKG } = window.OS4;
    const pkgs = st.packages || [];
    const incomplete = pkgs.filter((x) => pkIssues(x).length);
    const empty = pkgs.filter((pk) => !pkRes(st, pk).length);
    return (
      <>
      <div className="pk-head">
        <div><h3>Packages</h3><p>{pkgs.length} variant{pkgs.length > 1 ? "s" : ""} · shown to takers in this order.</p></div>
        <button type="button" className="os-add-btn" onClick={() => set((s) => { s.packages.push(EMPTY_PKG(s)); })}><Icon name="plus" size={14} /> Add a package</button>
      </div>

      {incomplete.length > 0 && <div className="pk-alert"><Icon name="danger" size={15} /><span><b>{incomplete.length} package{incomplete.length > 1 ? "s" : ""} incomplete</b> — a package can only be published once its price and billing period are filled in.</span></div>}
      {empty.length > 0 && <div className="pk-alert"><Icon name="danger" size={15} /><span><b>{empty.length} package{empty.length > 1 ? "s" : ""} with no resource</b> — pick at least one resource so takers get access to something.</span></div>}

      <div className="pkx-list">{pkgs.map((pk, i) => <PackageRow key={pk._id} i={i} st={st} set={set} />)}</div>
    </>);

  }

  window.OS4Packages = { PackagesSection, RESOURCES, resById, pkDiff, pkRes, pkPol, OVS, onKeys };
})();
