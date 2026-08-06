// VisionsTrust — Basket · assign the negotiation to a project (23/07).
// The step where the buyer decides where the negotiated offers land: an existing
// project, or a brand-new one created here with the full Project model — identity,
// governance, timeline, participants & roles, attached offers, needs, tech
// components and project-wide clauses. Design system: Project settings.
(function () {
const { useState, useEffect, useMemo, useRef } = React;
const { Icon, AppSidebar, BottomNav, BottomNavSheet } = window.UI;
const { ITEMS, PROJECTS } = window.BasketData;
const D = window.ProjectSettingsData;
const { SECS, Sel, Mono, InfoPanel, GovPanel, ClausesPanel } = window.S3F;

const LS_KEY = "vt.basketStep3.v1";
const BASKET = "basket_23_07.html";
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
function clauseDefaults() {
  const c = {};
  D.CLAUSES.fields.forEach((f) => { c[f.id] = clone(f.def); });
  return c;
}
function seed() {
  return {
    tab: "new",
    projectId: null,
    info: { title: "", caption: "", desc: "", categories: [], country: "France", visibility: "Data space members" },
    gov: { purpose: "", benefit: "", processing: "", availDate: "", legalBasis: "Consent", legalDesc: "" },
    status: "draft",
    clauses: clauseDefaults(),
  };
}
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return { ...seed(), ...JSON.parse(raw) }; } catch (e) {}
  return seed();
}

// ─── STEPPER (basket flow) ──────────────────────────────────────────────────
const STEPS = [
  { n: 1, label: "Review & negotiate", href: BASKET },
  { n: 2, label: "Assign to project", href: null },
  { n: 3, label: "Confirm & send", href: null },
];
function Stepper({ step }) {
  return (
    <ol className="bk-stepper">
      {STEPS.map((s, i) => {
        const state = step === s.n ? "current" : s.n < step ? "done" : "todo";
        const inner = (
          <>
            <span className="bk-step-dot">{state === "done" ? <Icon name="check" size={15} /> : s.n}</span>
            <span className="bk-step-txt"><span className="bk-step-idx">Step {s.n}</span><span className="bk-step-name">{s.label}</span></span>
          </>
        );
        return (
          <li key={s.n} className={`bk-step ${state}`}>
            {i > 0 && <span className={`bk-step-line ${s.n <= step ? "fill" : ""}`} aria-hidden="true"></span>}
            {s.href && state !== "current"
              ? <a className="bk-step-btn" href={s.href}>{inner}</a>
              : <span className="bk-step-btn" aria-current={state === "current" ? "step" : undefined}>{inner}</span>}
          </li>
        );
      })}
    </ol>
  );
}

// ─── VALIDATION ─────────────────────────────────────────────────────────────
function missingBySection(st) {
  const m = {};
  const inf = [];
  if (!st.info.title.trim()) inf.push("Project title");
  if (!st.info.caption.trim()) inf.push("Project caption");
  if (!st.info.desc.trim()) inf.push("Project description");
  if (!st.info.categories.length) inf.push("At least one category");
  if (inf.length) m.info = inf;
  const g = [];
  if (!st.gov.purpose.trim()) g.push("Project purpose");
  if (!st.gov.availDate) g.push("Desired date for data availability");
  if (g.length) m.gov = g;
  return m;
}

// ─── CREATED / ASSIGNED RECAP ───────────────────────────────────────────────
function Done({ name, caption, status, offers, parts, onBack }) {
  return (
    <div className="s3-created">
      <div className="s3-created-ic"><Icon name="check" size={24} /></div>
      <h2>{name}</h2>
      <p>{caption}</p>
      <div className="s3-recap">
        <div className="s3-recap-cell"><div className="s3-recap-k">Status</div><div className="s3-recap-v">{status === "published" ? "Published" : "Draft"}</div></div>
        <div className="s3-recap-cell"><div className="s3-recap-k">Offers attached</div><div className="s3-recap-v">{offers.length ? offers.map((o) => o.name).join(", ") : "—"}</div></div>
        <div className="s3-recap-cell"><div className="s3-recap-k">Participants</div><div className="s3-recap-v">{parts}</div></div>
        <div className="s3-recap-cell"><div className="s3-recap-k">Next</div><div className="s3-recap-v">Confirm &amp; send the negotiation</div></div>
      </div>
      <div className="s3-created-actions">
        <a className="bk-confirm" href={BASKET}>Continue to Confirm &amp; send <Icon name="arrowRight" size={15} /></a>
        <a className="bk-btn" href="Project Settings.html"><Icon name="sliders" size={14} /> Open project settings</a>
        <button type="button" className="bk-btn ghost" onClick={onBack}><Icon name="chevronLeft" size={15} /> Back to the form</button>
      </div>
    </div>
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
function AssignApp() {
  const [st, setSt] = useState(load);
  const [active, setActive] = useState("info");
  const [showErr, setShowErr] = useState(false);
  const [done, setDone] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const scrollRef = useRef(null);
  const set = (mutator) => setSt((prev) => { const d = clone(prev); mutator(d); return d; });

  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) {} }, [st]);

  const attached = ITEMS.filter((o) => !o.saved);
  const providers = [...new Set(attached.map((o) => o.provider))];

  const missing = missingBySection(st);
  const missCount = Object.values(missing).reduce((n, a) => n + a.length, 0);
  const complete = missCount === 0;
  const project = PROJECTS.find((p) => p.id === st.projectId);

  // The page can scroll either inside .content or on the document, depending on viewport.
  const scroller = () => {
    const b = scrollRef.current;
    return b && b.scrollHeight > b.clientHeight + 4 ? b : document.scrollingElement;
  };
  const offsetTop = (sc) => (sc === document.scrollingElement ? 0 : sc.getBoundingClientRect().top);
  const jump = (id) => {
    setActive(id);
    const sc = scroller(), el = document.getElementById(`sec-${id}`);
    if (sc && el) sc.scrollTo({ top: sc.scrollTop + el.getBoundingClientRect().top - offsetTop(sc) - 14, behavior: "smooth" });
  };
  useEffect(() => {
    if (st.tab !== "new" || done) return;
    const sc = scroller();
    if (!sc) return;
    const target = sc === document.scrollingElement ? window : sc;
    const onScroll = () => {
      const top = offsetTop(sc) + 90;
      let cur = SECS[0].id;
      SECS.forEach((s) => { const el = document.getElementById(`sec-${s.id}`); if (el && el.getBoundingClientRect().top <= top) cur = s.id; });
      setActive(cur);
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [st.tab, done]);

  const create = () => {
    if (!complete) {
      setShowErr(true);
      const first = SECS.find((s) => missing[s.id]);
      if (first) jump(first.id);
      return;
    }
    setDone({ kind: "created" });
  };

  const PANELS = {
    info: <InfoPanel st={st} set={set} />,
    gov: <GovPanel st={st} set={set} />,
    clauses: <ClausesPanel st={st} set={set} resetClauses={() => set((s) => { s.clauses = clauseDefaults(); })} />,
  };
  const groups = [...new Set(SECS.map((s) => s.group))];

  return (
    <div className="app ui-v2 bk-app">
      <a href="#bk-main" className="skip-link">Skip to content</a>
      <AppSidebar variant="v2" activeId="catalogue" />
      <div className="main">
        <header className="topbar cat-topbar">
          <div className="topbar-left"><div className="page-title"><Icon name="cart" size={20} /><h1>Basket</h1></div></div>
          <div className="topbar-right">
            <button type="button" className="icon-btn ghost active-cart" aria-label="Basket" aria-current="page"><Icon name="cart" size={18} /><span className="notif-dot" aria-hidden="true">{ITEMS.length}</span></button>
            <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16} /><span>Help</span></button>
            <button type="button" className="icon-btn ghost notif" aria-label="Notifications, 73 unread"><Icon name="bell" size={18} /><span className="notif-dot" aria-hidden="true">73</span></button>
            <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18} /></button>
          </div>
        </header>

        <main className="content bk-content" id="bk-main" tabIndex={-1} ref={scrollRef}>
          <div className="bk-page">
            <div className="bk-flow">
              <Stepper step={2} />

              <div className="bk-step-intro">
                <h2>Assign this negotiation to a project</h2>
                <p>Offers are always consumed inside a project — it holds the participants, the contract and the exchanges. Drop these {attached.length} negotiated offers into an existing project, or create the project now.</p>
              </div>

              <div className="s3-ctx">
                <span className="s3-ctx-k"><Icon name="cart" size={13} /> Negotiated in this basket</span>
                {attached.map((o) => (
                  <span className="s3-chip" key={o.id}>
                    <Mono seed={o.accent} name={o.name} size={26} />
                    <span className="s3-chip-txt"><span className="s3-chip-name">{o.name}</span><span className="s3-chip-by">{o.provider} · {o.kind}</span></span>
                  </span>
                ))}
                <span className="s3-ctx-sp" />
                <span className="s3-tag neg"><Icon name="team" size={10} /> {providers.length} provider{providers.length !== 1 ? "s" : ""}</span>
              </div>

              {done ? (
                <Done
                  name={done.kind === "created" ? st.info.title : project.name}
                  caption={done.kind === "created" ? st.info.caption : project.caption}
                  status={done.kind === "created" ? st.status : "published"}
                  offers={attached}
                  parts={done.kind === "created" ? `You + ${providers.length} provider organisation${providers.length !== 1 ? "s" : ""}` : "Existing project members"}
                  onBack={() => setDone(null)}
                />
              ) : (
                <>
                  <div className="seg2 bk-assign-tabs" style={{ marginTop: 18 }}>
                    <button type="button" className={st.tab === "existing" ? "active teal" : ""} onClick={() => set((s) => { s.tab = "existing"; })}><Icon name="folder" size={14} /> Existing project</button>
                    <button type="button" className={st.tab === "new" ? "active teal" : ""} onClick={() => set((s) => { s.tab = "new"; })}><Icon name="plus" size={14} /> Create a project</button>
                  </div>

                  {st.tab === "existing" ? (
                    <div className="bk-assign" style={{ marginTop: 4 }}>
                      <div className="bk-assign-label">Select an existing project</div>
                      <div className="bk-projlist" role="radiogroup" aria-label="Existing projects">
                        {PROJECTS.map((p) => (
                          <button type="button" key={p.id} role="radio" aria-checked={st.projectId === p.id} className={`bk-proj ${st.projectId === p.id ? "sel" : ""}`} onClick={() => set((s) => { s.projectId = p.id; })}>
                            <div className="bk-proj-logo">{p.org}</div>
                            <div className="bk-proj-meta"><div className="bk-proj-name">{p.name}</div><div className="bk-proj-cap">{p.caption}</div></div>
                            <span className="bk-proj-radio" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                      <div className="bk-nav">
                        <a className="bk-btn ghost" href={BASKET}><Icon name="chevronLeft" size={15} /> Back to step 1</a>
                        {project
                          ? <button type="button" className="bk-confirm" onClick={() => setDone({ kind: "existing" })}>Assign to {project.name} <Icon name="arrowRight" size={15} /></button>
                          : <span className="pii-nav-hint">Select a project to continue</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="s3-wrap">
                      <nav className="os-rail" aria-label="Project creation sections">
                        {groups.map((g) => (
                          <React.Fragment key={g}>
                            <div className="os-rail-glabel">{g}</div>
                            {SECS.filter((s) => s.group === g).map((s) => (
                              <button key={s.id} type="button" className={`os-rail-item ${active === s.id ? "active" : ""}`} onClick={() => jump(s.id)}>
                                <span className="os-rail-ic"><Icon name={s.icon} size={16} /></span>
                                <span className="os-rail-name">{s.name}</span>
                                {missing[s.id]
                                  ? <span className="s3-rail-miss" title={`${missing[s.id].length} required field(s) missing`}>{missing[s.id].length}</span>
                                  : <span className="s3-rail-ok" title="Complete"><Icon name="check" size={14} /></span>}
                              </button>
                            ))}
                          </React.Fragment>
                        ))}
                      </nav>

                      <div className="s3-form">
                        {showErr && !complete && (
                          <div className="s3-err">
                            <Icon name="triggers" size={16} />
                            <div>
                              <b>{missCount} required field{missCount !== 1 ? "s" : ""} left before the project can be created.</b>
                              <div className="s3-err-links">
                                {SECS.filter((s) => missing[s.id]).map((s) => (
                                  <button key={s.id} type="button" onClick={() => jump(s.id)}>{s.name} · {missing[s.id].join(", ")}</button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {SECS.map((s) => (
                          <section className="os-panel" id={`sec-${s.id}`} key={s.id} aria-labelledby={`h-${s.id}`}>
                            <div className="os-panel-head">
                              <div><h2 id={`h-${s.id}`}>{s.title}</h2><p>{s.desc}</p></div>
                              {missing[s.id]
                                ? <span className="s3-tag warn"><Icon name="triggers" size={10} /> {missing[s.id].length} to fill</span>
                                : <span className="s3-tag ok"><Icon name="check" size={10} /> Complete</span>}
                            </div>
                            <div className="os-panel-body">{PANELS[s.id]}</div>
                          </section>
                        ))}

                        <div className="s3-bar">
                          <span className="s3-bar-txt">
                            {complete
                              ? <><b>All required fields complete.</b> {attached.length} offer{attached.length !== 1 ? "s" : ""} will be attached to <b>{st.info.title || "this project"}</b>.</>
                              : <><b>{missCount}</b> required field{missCount !== 1 ? "s" : ""} still to fill before the project can be created.</>}
                          </span>
                          <div className="s3-bar-actions">
                            <a className="bk-btn ghost" href={BASKET}><Icon name="chevronLeft" size={15} /> Back to step 1</a>
                            <button type="button" className="bk-btn" onClick={() => set((s) => { s.status = "draft"; })}><Icon name="pen" size={14} /> Save as draft</button>
                            <button type="button" className="bk-confirm" onClick={create}>Create project &amp; continue <Icon name="arrowRight" size={15} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
      <BottomNav onOpenMore={() => setMoreOpen(true)} />
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AssignApp />);
})();
