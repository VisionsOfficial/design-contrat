// VisionsTrust — Demo 07/08 · Basket. Steps 1–3 for every basket; step 4 confirms
// directly when no personal data is involved, otherwise the flow continues on
// demo_basket_pii_07_08.html.
(function () {
const { useState, useEffect, useMemo, useRef } = React;
const { Icon } = window.UI;
const { AppLayout } = window.VTLayout;
const D = window.Demo;
const U = window.DemoUI;
const R = window.DemoRecap;
const { fmtVal, fmtN, eq, isGap, clone } = D;

const STEPS_PLAIN = [
  { n: 1, label: "Review the basket", icon: "layers" },
  { n: 2, label: "Adjust the baseline", icon: "scale" },
  { n: 3, label: "Assign to project", icon: "folder" },
  { n: 4, label: "Confirm & send", icon: "check" },
];
const STEPS_PII = [
  { n: 1, label: "Review the basket", icon: "layers" },
  { n: 2, label: "Adjust the baseline", icon: "scale" },
  { n: 3, label: "Assign to project", icon: "folder" },
  { n: 4, label: "Assign a consuming service", icon: "shield" },
  { n: 5, label: "Review & confirm", icon: "check" },
];

const majority = (pubs) => {
  const c = new Map();
  pubs.forEach((p) => { const k = JSON.stringify(p.value); c.set(k, (c.get(k) || 0) + 1); });
  let best = null, n = -1;
  c.forEach((v, k) => { if (v > n) { n = v; best = k; } });
  return best == null ? null : JSON.parse(best);
};

// ─── STEP 1 · OFFER CARD ──────────────────────────────────────────────────────
function OfferCard({ line, st, onSetPrice, onView, onRemove }) {
  const { offer, pkg } = line;
  const s = D.scoreOf(offer);
  return (
    <article className={`bk2-card ${s.gapCount ? "is-pending" : "is-accepted"}`}>
      <span className="bk2-rail" aria-hidden="true" />
      <div className="bk2-card-head">
        <U.OfferHead offer={offer}>
          <a className="bk-btn ghost sm" href={`${D.PAGES.offer}?id=${offer.id}`}><Icon name="external" size={14} /><span className="bk2-hide-sm">Offer page</span></a>
          <button type="button" className="bk-icon-danger sm" onClick={onRemove} aria-label={`Remove ${offer.name}`}><Icon name="trash" size={15} /></button>
        </U.OfferHead>
        <div className="bk2-summary">
          <U.StatusBadges offer={offer} />
          <button type="button" className="bk2-viewfull" onClick={onView}><Icon name="list" size={14} /> View full baseline</button>
        </div>
      </div>
      <U.OfferFacts offer={offer} pkg={pkg} prices={st.prices} />
      <U.PackagePicker offer={offer} chosenId={pkg && pkg.id} onChoose={() => {}} />
      {pkg && pkg.neg && <U.PriceNegotiate offer={offer} pkg={pkg} value={st.prices[offer.id]} onSet={(v) => onSetPrice(offer.id, v)} />}
      {s.gapCount > 0 ? (
        <div className="bk2-gaps">
          <div className="bk2-gaps-head"><Icon name="triggers" size={13} /> These published terms fall short of your acceptance baseline. You settle them on the next step.</div>
          {s.gapFields.map((f) => (
            <div className="bk2-gaprow" key={f.id}>
              <div className="bk2-gap-info">
                <span className="bk2-gap-name">{f.label}</span>
                <span className="bk2-gap-vals">
                  <span className="bk2-gap-prov">Offer baseline: <b>{fmtVal(f, f.baseline)}</b></span>
                  <span className="bk2-gap-sep">·</span>
                  <span className="bk2-gap-base">your baseline: <b>{f.userBase.label}</b></span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bk2-allok"><Icon name="check" size={14} /> Every checked term meets your acceptance baseline — no gap to settle.</div>
      )}
    </article>
  );
}

// ─── STEP 2 · ONE BASELINE FORM FOR THE WHOLE BASKET ──────────────────────────
function ProvChip({ p, field, mine, touched, onAdopt }) {
  const same = eq(p.value, mine);
  const gap = !!field.userBase && isGap(field, p.value, field.userBase);
  return (
    <button type="button" className={`bk3-prov${same ? " same" : ""}`} disabled={same} onClick={() => onAdopt(p.value)}
      title={same ? "Your value already matches this provider" : `Take ${p.offer.provider}'s published value`}>
      <U.Monogram offer={p.offer} size={22} />
      <span className="bk3-prov-txt">
        <span className="bk3-prov-who">{p.offer.provider}</span>
        <span className="bk3-prov-val">{fmtVal(field, p.value)}</span>
      </span>
      {touched && !same && <span className="bk3-prov-tag diff"><Icon name="sliders" size={10} /> you counter</span>}
      {!touched && gap && <span className="bk3-prov-tag diff"><Icon name="triggers" size={10} /> below your baseline</span>}
    </button>
  );
}

function BaselineForm({ groups, values, touched, conceded, lines, onSet, onReset, onConcede, onApplyBaseline, onTakePublished }) {
  const rows = groups.flatMap((g) => g.rows);
  // Nothing is countered until the buyer moves a field: an untouched row keeps every
  // provider's published value exactly as it is on the offer page.
  const diffOf = (r) => (touched.has(r.field.id) ? r.pubs.filter((p) => !eq(p.value, values[r.field.id])) : []);
  const gapPubs = (r) => (r.field.userBase ? r.pubs.filter((p) => isGap(r.field, p.value, r.field.userBase)) : []);
  const rowGap = (r) => !conceded.includes(r.field.id) && (touched.has(r.field.id)
    ? !!r.field.userBase && isGap(r.field, values[r.field.id], r.field.userBase)
    : gapPubs(r).length > 0);
  const movedRows = rows.filter((r) => diffOf(r).length > 0);
  const gapRows = rows.filter(rowGap);
  const counterIds = new Set();
  movedRows.forEach((r) => diffOf(r).forEach((p) => counterIds.add(p.offer.id)));
  const withBase = rows.filter((r) => r.field.userBase).length;

  const renderRow = (r) => {
    const f = r.field;
    const v = values[f.id];
    const isCon = conceded.includes(f.id);
    const isTouched = touched.has(f.id);
    const gap = rowGap(r);
    const nGap = gapPubs(r).length;
    const diff = diffOf(r);
    let chip = null;
    if (gap) chip = <span className="bk-st st-gap"><Icon name="triggers" size={10} /> {isTouched ? "Below your baseline" : `Below your baseline on ${nGap} of ${r.pubs.length} offer${r.pubs.length !== 1 ? "s" : ""}`}</span>;
    else if (isCon && f.userBase) chip = <span className="bk-st st-ok"><Icon name="check" size={10} /> Accepted below baseline</span>;
    else if (f.userBase) chip = <span className="bk-st st-ok"><Icon name="check" size={10} /> Meets your baseline</span>;
    else if (diff.length) chip = <span className="bk-st st-edit"><Icon name="edit" size={10} /> Your own value</span>;
    return (
      <div className={`bk3-row${gap ? " gap" : ""}`} key={f.id}>
        <div className="bk3-row-head">
          <span className="bk3-row-name">{f.label}</span>
          {chip}
          {diff.length > 0 && <span className="bk3-row-count"><Icon name="sliders" size={10} /> counters {diff.length} of {r.pubs.length} provider{r.pubs.length !== 1 ? "s" : ""}</span>}
        </div>
        <div className="bk3-row-body">
          <div className="bk3-row-ctl">
            <span className="bk3-row-label">Your value for every offer</span>
            <div className="bk3-row-inputs"><U.EditControl field={f} value={v} onChange={(nv) => onSet(f.id, nv)} /></div>
            <div className="bk3-row-foot">
              {f.userBase
                ? <span className={`bk-guide ${gap ? "gap" : ""}`}><Icon name="sliders" size={11} /> Your baseline: <b>{f.userBase.label}</b></span>
                : <span className="bk-guide muted">No requirement in your baseline — open value.</span>}
              {!isTouched && <span className="bk-guide muted"><Icon name="check" size={11} /> Untouched — each provider's published value stands.</span>}
              {diff.length > 0 && <span className="bk-guide"><Icon name="sliders" size={11} /> Counter sent to {diff.length} offer{diff.length !== 1 ? "s" : ""} in the basket.</span>}
              {isTouched && <button type="button" className="bk-reset" onClick={() => onReset(f.id)}>Reset to {fmtVal(f, majority(r.pubs))}</button>}
              {gap && <button type="button" className="bk2-gap-accept mini" onClick={() => onConcede(f.id)}><Icon name="check" size={12} /> Accept below baseline</button>}
            </div>
          </div>
          <div className="bk3-row-provs">
            <span className="bk3-row-label">Published by the providers</span>
            <div className="bk3-prov-list">{r.pubs.map((p) => <ProvChip key={p.offer.id} p={p} field={f} mine={v} touched={isTouched} onAdopt={(nv) => onSet(f.id, nv)} />)}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bk3-form">
      <div className="bk3-form-head">
        <div className="bk3-form-stats">
          <span className="bk-recap-pill"><b>{rows.length}</b><span>negotiable field{rows.length !== 1 ? "s" : ""}</span></span>
          <span className={`bk-recap-pill${movedRows.length ? " teal" : " ok"}`}><Icon name={movedRows.length ? "sliders" : "check"} size={11} /><b>{movedRows.length}</b><span>moved</span></span>
          <span className="bk-recap-pill"><Icon name="layers" size={11} /><b>{counterIds.size}</b><span>of {lines.length} offer{lines.length !== 1 ? "s" : ""} countered</span></span>
          {gapRows.length > 0
            ? <span className="bk-recap-pill gap"><Icon name="triggers" size={11} /><b>{gapRows.length}</b><span>field{gapRows.length !== 1 ? "s" : ""} below your baseline</span></span>
            : <span className="bk-recap-pill ok"><Icon name="check" size={11} /><span>No gap</span></span>}
        </div>
        <div className="bk3-form-acts">
          {withBase > 0 && <button type="button" className="bk2-sum-btn propose" onClick={onApplyBaseline}><Icon name="sliders" size={13} /> Apply my acceptance baseline</button>}
          <button type="button" className="bk2-sum-btn accept" onClick={onTakePublished}><Icon name="check" size={13} /> Take what providers published</button>
        </div>
      </div>
      {rows.length === 0
        ? <div className="bk-none">Nothing to configure — every field of these offers is fixed by the providers.</div>
        : groups.map((g) => (
            <div className="bk3-group" key={g.id}>
              <div className="bk3-group-head"><span className="bk-tsec-ic"><Icon name={g.icon} size={13} /></span>{g.title}<span className="bk3-group-n">{g.rows.length}</span></div>
              {g.rows.map(renderRow)}
            </div>
          ))}
    </div>
  );
}

// ─── STEP 3 · ASSIGN ──────────────────────────────────────────────────────────
function AssignPanel({ assign, setAssign }) {
  const { tab, projectId, newProj } = assign;
  return (
    <div className="bk-assign">
      <div className="bk-assign-head">
        <h2>Assign to project</h2>
        <p>Choose where these offers should go — an existing project, or a new one.</p>
      </div>
      <div className="seg2 bk-assign-tabs">
        <button type="button" className={tab === "existing" ? "active teal" : ""} onClick={() => setAssign({ ...assign, tab: "existing" })}><Icon name="folder" size={14} /> Existing project</button>
        <button type="button" className={tab === "new" ? "active teal" : ""} onClick={() => setAssign({ ...assign, tab: "new" })}><Icon name="plus" size={14} /> New project</button>
      </div>
      {tab === "existing" ? (
        <>
          <div className="bk-assign-label">Select an existing project</div>
          <div className="bk-projlist" role="radiogroup" aria-label="Existing projects">
            {D.PROJECTS.map((p) => (
              <button type="button" key={p.id} role="radio" aria-checked={projectId === p.id} className={`bk-proj ${projectId === p.id ? "sel" : ""}`} onClick={() => setAssign({ ...assign, projectId: p.id })}>
                <div className="bk-proj-logo">{p.org}</div>
                <div className="bk-proj-meta"><div className="bk-proj-name">{p.name}</div><div className="bk-proj-cap">{p.caption}</div></div>
                <span className="bk-proj-radio" aria-hidden="true" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="bk-newform">
          <div><label className="os-flabel">Project title<em>*</em></label><input className="os-in bk-full" value={newProj.title} onChange={(e) => setAssign({ ...assign, newProj: { ...newProj, title: e.target.value } })} placeholder="Ex: Rental risk assessment platform" /></div>
          <div><label className="os-flabel">Project caption<em>*</em></label><input className="os-in bk-full" value={newProj.caption} onChange={(e) => setAssign({ ...assign, newProj: { ...newProj, caption: e.target.value.slice(0, 69) } })} placeholder="Short sentence to describe your project goals" /><div className="os-fhelp">{69 - newProj.caption.length} characters remaining</div></div>
          <div><label className="os-flabel">Project description</label><textarea className="os-ta" style={{ minHeight: 90 }} value={newProj.desc} onChange={(e) => setAssign({ ...assign, newProj: { ...newProj, desc: e.target.value } })} placeholder="Describe your project: impact, objectives, timeline and needs." /></div>
          <div><label className="os-flabel">Category</label><U.Sel value={newProj.category} onChange={(v) => setAssign({ ...assign, newProj: { ...newProj, category: v } })} options={["Real estate", "Legal tech", "Risk & compliance", "Data sharing"]} width="100%" /></div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function BasketApp() {
  const [st, setSt] = useState(() => D.load());
  const startStep = Number(new URLSearchParams(location.search).get("step")) || 1;
  const [step, setStep] = useState(Math.min(Math.max(startStep, 1), 4));
  const [drawerId, setDrawerId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const topRef = useRef(null);

  useEffect(() => { D.save(st); }, [st]);
  useEffect(() => { if (topRef.current) topRef.current.scrollTop = 0; }, [step]);
  useEffect(() => { if (drawerId) { const id = requestAnimationFrame(() => setDrawerOpen(true)); return () => cancelAnimationFrame(id); } }, [drawerId]);
  const closeDrawer = () => { setDrawerOpen(false); setTimeout(() => setDrawerId(null), 260); };

  const lines = D.cartLines(st);
  const hasPII = lines.some((l) => l.offer.pii === "contains");
  const STEPS = hasPII ? STEPS_PII : STEPS_PLAIN;

  // one row per negotiable field, every provider's published value attached to it
  const groups = useMemo(() => {
    const secs = new Map();
    lines.forEach((l) => {
      D.termsOf(l.offer).sections.forEach((sec) => {
        sec.fields.filter((f) => f.negotiable).forEach((f) => {
          if (!secs.has(sec.id)) secs.set(sec.id, { id: sec.id, title: sec.title, icon: sec.icon, map: new Map() });
          const g = secs.get(sec.id);
          if (!g.map.has(f.id)) g.map.set(f.id, { field: f, pubs: [] });
          g.map.get(f.id).pubs.push({ offer: l.offer, value: f.baseline });
        });
      });
    });
    return Array.from(secs.values()).map((g) => ({ id: g.id, title: g.title, icon: g.icon, rows: Array.from(g.map.values()) }));
  }, [st.cart.map((l) => l.offerId + l.pkgId).join("|")]);
  const rows = groups.flatMap((g) => g.rows);
  const values = {};
  rows.forEach((r) => { values[r.field.id] = st.form[r.field.id] !== undefined ? st.form[r.field.id] : majority(r.pubs); });
  const touched = new Set(Object.keys(st.form));

  const setFormField = (id, v) => setSt((s) => ({ ...s, form: { ...s.form, [id]: v }, conceded: s.conceded.filter((x) => x !== id) }));
  const resetFormField = (id) => setSt((s) => { const f = { ...s.form }; delete f[id]; return { ...s, form: f, conceded: s.conceded.filter((x) => x !== id) }; });
  const concede = (id) => setSt((s) => ({ ...s, conceded: s.conceded.includes(id) ? s.conceded : [...s.conceded, id] }));
  const applyBaseline = () => setSt((s) => {
    const f = { ...s.form };
    rows.forEach((r) => { if (r.field.userBase) f[r.field.id] = clone(D.baselineTarget(r.field, r.field.userBase, values[r.field.id])); });
    return { ...s, form: f, usedBaseline: true, conceded: [] };
  });
  const takePublished = () => setSt((s) => ({ ...s, form: {}, usedBaseline: false, conceded: [] }));
  const setPrice = (offerId, v) => setSt((s) => ({ ...s, prices: { ...s.prices, [offerId]: v } }));
  const remove = (offerId) => setSt(() => D.removeFromCart(offerId));

  const project = st.assign.tab === "existing" ? D.PROJECTS.find((p) => p.id === st.assign.projectId) : null;
  const target = st.assign.tab === "existing" ? (project ? project.name : "") : (st.assign.newProj.title || "New project");
  const targetCaption = st.assign.tab === "existing" ? (project ? project.caption : "") : st.assign.newProj.caption;
  const canAssign = st.assign.tab === "existing" ? !!st.assign.projectId : !!st.assign.newProj.title.trim();

  const send = () => {
    const receipt = {
      at: new Date().toISOString(), target, targetCaption, hasPII: false,
      lines: lines.map((l) => ({ offerId: l.offerId, pkgId: l.pkgId, price: U.priceOf(l.offer, l.pkg, st.prices) })),
      services: [],
    };
    D.update((s) => { s.receipt = receipt; return s; });
    location.href = D.PAGES.confirmation;
  };

  const drawerOffer = drawerId ? D.byId(drawerId) : null;
  const empty = lines.length === 0;

  return (
    <AppLayout title="Basket" activeId="offers" cartCount={lines.length} cartHref={D.PAGES.basket} className="bk-app">
      <div className="bk-content" ref={topRef}>
        <div className="bk-page">
          {empty ? (
            <div className="bk-empty">
              <div className="bk-empty-ic"><Icon name="cart" size={26} /></div>
              <h2>Your basket is empty</h2>
              <p>Start exploring the catalogue and find offers that suit your needs.</p>
              <a className="bk-confirm" href={D.PAGES.catalog}>Catalogue <Icon name="arrowRight" size={15} /></a>
            </div>
          ) : (
            <div className="bk-flow">
              <U.Stepper steps={STEPS} step={step} onGo={setStep} />
              <R.RecapBar lines={lines} target={step >= 3 && canAssign ? target : ""} />

              {step === 1 && (
                <div className="bk-stepbody">
                  <div className="bk-step-intro"><h2>Review the basket</h2><p>What you are about to contract: the offers, the package you picked on each offer page, the price and the usage policies. Gaps against your acceptance baseline are shown here and settled on the next step.</p></div>
                  <div className="bk-sec-title"><Icon name="layers" size={18} /> Offers in your basket <span className="bk-count">({lines.length})</span></div>
                  {lines.map((l) => (
                    <OfferCard key={l.offerId} line={l} st={st} onSetPrice={setPrice} onView={() => setDrawerId(l.offerId)} onRemove={() => remove(l.offerId)} />
                  ))}
                  <div className="bk-nav">
                    <a className="bk-btn ghost" href={D.PAGES.catalog}><Icon name="chevronLeft" size={15} /> Continue shopping</a>
                    <button type="button" className="bk-confirm" onClick={() => setStep(2)}>Adjust the baseline <Icon name="arrowRight" size={15} /></button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="bk-stepbody">
                  <div className="bk-step-intro"><h2>Adjust the baseline</h2><p>One form for the whole basket: you set each negotiable field once and it applies to every offer. Each row shows what the providers published, so you see exactly whom you are countering.</p></div>
                  <U.BaselineRecall />
                  <BaselineForm groups={groups} values={values} touched={touched} conceded={st.conceded} lines={lines}
                    onSet={setFormField} onReset={resetFormField} onConcede={concede} onApplyBaseline={applyBaseline} onTakePublished={takePublished} />
                  <div className="bk-nav">
                    <button type="button" className="bk-btn ghost" onClick={() => setStep(1)}><Icon name="chevronLeft" size={15} /> Back</button>
                    <button type="button" className="bk-confirm" onClick={() => setStep(3)}>Assign to project <Icon name="arrowRight" size={15} /></button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="bk-stepbody">
                  <div className="bk-step-intro"><h2>Assign to a project</h2><p>Pick the project these {lines.length} offer{lines.length !== 1 ? "s" : ""} will belong to.</p></div>
                  <AssignPanel assign={st.assign} setAssign={(a) => setSt((s) => ({ ...s, assign: a }))} />
                  <div className="bk-nav">
                    <button type="button" className="bk-btn ghost" onClick={() => setStep(2)}><Icon name="chevronLeft" size={15} /> Back</button>
                    {hasPII
                      ? <button type="button" className="bk-confirm" disabled={!canAssign} onClick={() => { D.save({ ...st }); location.href = D.PAGES.pii; }}>Assign a consuming service <Icon name="arrowRight" size={15} /></button>
                      : <button type="button" className="bk-confirm" disabled={!canAssign} onClick={() => setStep(4)}>Review &amp; confirm <Icon name="arrowRight" size={15} /></button>}
                  </div>
                </div>
              )}

              {step === 4 && !hasPII && (
                <div className="bk-stepbody">
                  <div className="bk-step-intro"><h2>Confirm &amp; send</h2><p>Check every decision below, then send to the provider{lines.length !== 1 ? "s" : ""}.</p></div>
                  <R.ConfirmStep lines={lines} st={st} target={target} targetCaption={targetCaption} onView={(id) => setDrawerId(id)} />
                  <div className="bk-nav">
                    <button type="button" className="bk-btn ghost" onClick={() => setStep(3)}><Icon name="chevronLeft" size={15} /> Back</button>
                    <button type="button" className="bk-confirm" onClick={send}>Accept <Icon name="check" size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <U.TermsDrawer offer={drawerOffer} values={values} open={drawerOpen} onClose={closeDrawer} />
    </AppLayout>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<BasketApp />);
})();
