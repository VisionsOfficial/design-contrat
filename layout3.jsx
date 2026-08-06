/* VisionsTrust — Layout v3 : l'assistant devient une surface flottante (plus de sidebar droite).
 * Trois surfaces interchangeables (barre compagnon / spotlight / fenêtre), un seul modèle d'appel :
 *   openAgent(agentId, { scope, prompt })  →  la surface s'ouvre déjà cadrée sur le bon agent.
 * Charger après layout2.jsx + layout2-agents.jsx (réutilise Icon, AGENTS, Thread, panneaux).
 */
(function () {
const { useState, useEffect, useRef, useCallback } = React;
const { Icon, AgentChip, AGENTS, BrandMark, TopBar, SubNav, FilterBar, V2_NAV, V2_PINS, V2_NOTIFICATIONS, V2_RUNS, V2Ctx } = window.V2;

// Chaque section de travail a son agent « naturel » : le bouton ✨ au survol l'appelle.
const SECTION_AGENT = { home:"help", catalogue:"search", offers:"completion", projects:"matching", contracts:"legal", dashboard:"help", exch:"help", techspace:"help" };
const LAUNCH = [
  { id:"help", key:"?", why:"Comprendre la plateforme" },
  { id:"completion", key:"@c", why:"Rédiger une offre, un projet" },
  { id:"matching", key:"@m", why:"Trouver des correspondances" },
  { id:"legal", key:"@l", why:"Contrats, licences, conformité" },
  { id:"search", key:"@s", why:"Chercher dans le catalogue" },
];
const PANELS = {
  assistant:{ title:"Assistant", sub:"Un fil, cinq compétences", icon:"sparkle" },
  legal:{ title:"Legal companion", sub:"Ancré sur le document ouvert", icon:"scale" },
  runs:{ title:"Tâches des agents", sub:"Travaux en fond et résultats", icon:"activity" },
  history:{ title:"Activité", sub:"Historique de cet élément", icon:"history" },
};

// ─── SIDEBAR : navigation + bloc d'appel des agents ───────────────────────
const Sidebar3 = ({ nav, activeId, onNav, onCollapse, onAgent, collapsed }) => {
  const [shut, setShut] = useState({});
  const [openList, setOpenList] = useState(true);
  return (
    <aside className="v2-side">
      <div className="v2-side-card">
        <button type="button" className="v2-ws">
          <span className="v2-ws-logo"><BrandMark/></span>
          <span className="v2-ws-txt"><b>Visions SAS</b><span>Mobility dataspace</span></span>
          <Icon name="chevronDown" size={14}/>
        </button>
        <nav className="v2-nav" aria-label="Main">
          {nav.map((sec, i) => (
            <React.Fragment key={sec.section || `s${i}`}>
              {sec.section && (
                <button type="button" className={`v2-secbtn ${shut[sec.section] ? "closed" : ""}`} onClick={() => setShut(s => ({ ...s, [sec.section]: !s[sec.section] }))} aria-expanded={!shut[sec.section]}>
                  <span>{sec.section}</span><Icon name="chevronDown" size={12}/>
                </button>
              )}
              {(shut[sec.section] ? [] : sec.items).map(item => {
                const ag = SECTION_AGENT[item.id] || "help";
                return (
                  <div className="v2-iwrap" key={item.id}>
                    <a className={`v2-item ${item.id === activeId ? "active" : ""}`} href={item.href || "#"} onClick={(e) => { e.preventDefault(); onNav && onNav(item.id); }} aria-current={item.id === activeId ? "page" : undefined}>
                      <Icon name={item.icon}/><span>{item.label}</span>{item.count && <span className="v2-count">{item.count}</span>}
                    </a>
                    <button type="button" className="v3-nav-ai" title={`${AGENTS[ag].label} sur ${item.label}`} aria-label={`Appeler ${AGENTS[ag].label} sur ${item.label}`}
                      onClick={() => onAgent(ag, { scope:{ label:item.label } })}><Icon name="sparkle" size={13}/></button>
                    <div className="v2-flyout">
                      <b>{item.label}</b>
                      {(item.tabs || ["Ouvrir"]).map(t => <a key={t} className="v2-item sm" href="#" onClick={(e) => { e.preventDefault(); onNav && onNav(item.id, t); }}>{t}</a>)}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
          <button type="button" className={`v2-secbtn ${shut.pins ? "closed" : ""}`} onClick={() => setShut(s => ({ ...s, pins: !s.pins }))} aria-expanded={!shut.pins}>
            <span>Épinglés</span><Icon name="chevronDown" size={12}/>
          </button>
          {(shut.pins ? [] : V2_PINS).map(p => (
            <div className="v2-iwrap" key={p.id}>
              <a className="v2-pin" href="#" onClick={(e) => e.preventDefault()}><i style={{ background: p.color }}/><span>{p.label}</span></a>
              <button type="button" className="v3-nav-ai" aria-label={`Assistant sur ${p.label}`} onClick={() => onAgent("master", { scope:{ label:p.label } })}><Icon name="sparkle" size={13}/></button>
            </div>
          ))}
        </nav>
        <div className="v3-ai">
          <div className="v3-ai-top">
            <button type="button" className="v3-ai-main" onClick={() => onAgent("master")}>
              <Icon name="sparkle" size={16}/><span>Assistant</span><span className="v3-kbd">⌘K</span>
            </button>
            <button type="button" className="v3-ai-help" title="Agent Help (?)" aria-label="Appeler l'agent Help" onClick={() => onAgent("help")}>?</button>
          </div>
          {!collapsed && (
            <>
              <button type="button" className="v3-ai-sec" onClick={() => setOpenList(o => !o)} aria-expanded={openList}>
                <span>Appeler un agent</span><Icon name={openList ? "chevronDown" : "chevronRight"} size={11}/>
              </button>
              {openList && (
                <div className="v3-ai-list">
                  {LAUNCH.map(l => (
                    <button key={l.id} type="button" className={`v3-ai-row ${l.id}`} title={AGENTS[l.id].desc} onClick={() => onAgent(l.id)}>
                      <i><Icon name={AGENTS[l.id].icon} size={12}/></i><b>{AGENTS[l.id].label}</b><small>{l.key}</small>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="v2-side-foot">
          <a className="v2-item sm" href="#" onClick={(e) => e.preventDefault()}><Icon name="settings" size={16}/><span>Settings</span></a>
          <button type="button" className="v2-item sm" onClick={onCollapse}><Icon name="panelLeft" size={16}/><span>Replier</span></button>
        </div>
      </div>
    </aside>
  );
};

// ─── Corps de l'assistant (identique dans les trois surfaces) ────────────
const AgentHead = ({ panel, setPanel, runs, extra, onClose }) => {
  const meta = PANELS[panel] || PANELS.assistant;
  const running = runs.filter(r => r.state === "running").length;
  return (
    <div className="v3-head">
      <span className="v3-head-ic"><Icon name={meta.icon} size={15}/></span>
      <span className="v3-head-tx">
        <b>{meta.title}</b>
        <span className="v3-head-sub">{meta.sub}</span>
      </span>
      <div className="v3-segs">
        {["assistant","legal","runs","history"].map(p => (
          <button key={p} type="button" className={p === panel ? "on" : ""} onClick={() => setPanel(p)}>
            <Icon name={PANELS[p].icon} size={13}/><span className="v3-seglab">{p === "assistant" ? "Fil" : p === "legal" ? "Legal" : p === "runs" ? "Tâches" : "Activité"}</span>
            {p === "runs" && running > 0 && <em>{running}</em>}
          </button>
        ))}
      </div>
      {extra}
      <button type="button" className="v2-iconbtn" onClick={onClose} aria-label="Fermer l'assistant"><Icon name="close" size={16}/></button>
    </div>
  );
};
const AgentBody = ({ panel, seed, scope, page, runs, onOpenMatches }) => {
  const A = window.V2Agents;
  return (
    <div className="v3-body">
      {panel === "assistant" && <A.Thread seed={seed} scope={scope} page={page} onOpenMatches={onOpenMatches}/>}
      {panel === "legal" && <A.LegalPanel scope={scope}/>}
      {panel === "runs" && <A.RunsPanel runs={runs} onOpenMatches={onOpenMatches}/>}
      {panel === "history" && <A.HistoryPanel/>}
    </div>
  );
};

// ─── A · BARRE COMPAGNON ─────────────────────────────────────────────────
const NOTE_BY_PAGE = {
  home:"2 contrats attendent votre signature et 3 offres sont incomplètes — je peux commencer par les offres.",
  catalogue:"Vos filtres ne retiennent que 14 offres : je peux élargir la fraîcheur à 6 h pour en récupérer 23.",
  offers:"3 brouillons sont bloqués depuis plus de 15 jours. Je peux les compléter en lot.",
  create:"Il manque la description, les mots-clés et la licence. Je propose un premier jet en 20 s.",
  contract:"2 clauses de ce DPA s'écartent de vos contrats précédents — durée de conservation et sous-traitance.",
  project:"6 offres fortes correspondent à ce projet ; 1 besoin n'a aucun candidat (stationnement).",
};
const CompanionBar = ({ open, onOpen, onAgent, runs, page, note, onHideNote }) => {
  const running = runs.filter(r => r.state === "running").length;
  if (open) return null;
  return (
    <div className="v3-bar">
      {note && (
        <div className="v3-bar-note">
          <AgentChip id="master"/>
          <span style={{ flex:1, minWidth:0 }}>{NOTE_BY_PAGE[page] || NOTE_BY_PAGE.home}</span>
          <button type="button" className="v2-mini go" onClick={() => onOpen("assistant")}>Voir</button>
          <button type="button" className="v2-iconbtn v3-x" onClick={onHideNote} aria-label="Masquer"><Icon name="close" size={15}/></button>
        </div>
      )}
      <div className="v3-bar-in">
        <span className="v3-bar-spark"><Icon name="sparkle" size={15}/></span>
        <button type="button" className="v3-bar-q" onClick={() => onOpen("assistant")}>
          <em>Demandez à l'assistant, ou décrivez ce que vous voulez faire…</em><span className="v3-kbd">⌘K</span>
        </button>
        <div className="v3-bar-ags">
          {LAUNCH.map(l => (
            <button key={l.id} type="button" className="v3-iconag" aria-label={`Appeler ${AGENTS[l.id].label}`} onClick={() => onAgent(l.id)}>
              <Icon name={AGENTS[l.id].icon} size={15}/><span className="v3-tip">{AGENTS[l.id].label} · {l.why}</span>
            </button>
          ))}
        </div>
        {running > 0 && (
          <button type="button" className="v3-bar-task" onClick={() => onOpen("runs")}>
            <span className="v3-spin"/>{running} tâche{running > 1 ? "s" : ""}<span className="v3-tip">Tâches des agents en cours</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ─── SHELL ───────────────────────────────────────────────────────────────
const AppLayout3 = ({
  surface = "bar", crumbs = ["Home"], activeId = "home", nav = V2_NAV, tabs = null, activeTab = null, onTab, onNav,
  actions = null, subRight = null, cartCount = 2, notifications = V2_NOTIFICATIONS, runs = V2_RUNS,
  scope = null, page = "home", onOpenMatches, filters = null, filterHint = null, defaultPanel = null, children,
}) => {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(defaultPanel || "assistant");
  const [seed, setSeed] = useState(null);
  const [askScope, setAskScope] = useState(null);
  const [wide, setWide] = useState(false);
  const [min, setMin] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - 470, y: 120 });
  const [drag, setDrag] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [dense, setDense] = useState(false);
  const [keys, setKeys] = useState(false);
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState(true);

  useEffect(() => { setNote(true); }, [page]);
  const openAgent = useCallback((agentId, opts = {}) => {
    const a = agentId === "master" ? "assistant" : agentId;
    setPanel(a === "legal" ? "legal" : "assistant");
    setSeed(a === "assistant" ? null : { agent:a, prompt: opts.prompt || null, at: Date.now() });
    if (a === "assistant" && opts.prompt) setSeed({ agent:"help", prompt:opts.prompt, at:Date.now() });
    setAskScope(opts.scope || null);
    setOpen(true); setMin(false);
  }, []);
  const openPanel = (p) => { setPanel(p); setOpen(true); setMin(false); };
  const close = () => { setOpen(false); setWide(false); };

  useEffect(() => {
    const typing = (t) => t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open ? close() : openPanel("assistant"); return; }
      if (e.key === "Escape") { setKeys(false); close(); return; }
      if (typing(e.target)) return;
      if (e.key === "?") { e.preventDefault(); openAgent("help"); }
      if (e.key === "[") setSideCollapsed(c => !c);
      if (e.key === "]") open ? close() : openPanel("assistant");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openAgent]);

  const startDrag = (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault(); setDrag(true);
    const ox = e.clientX - pos.x, oy = e.clientY - pos.y;
    const move = (ev) => setPos({ x: Math.min(window.innerWidth - 180, Math.max(8, ev.clientX - ox)), y: Math.min(window.innerHeight - 60, Math.max(8, ev.clientY - oy)) });
    const up = () => { setDrag(false); document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  };

  const ctx = { openAgent, openPalette: () => openPanel("assistant"), closeDock: close, dock: open ? panel : null, scope: askScope || scope };
  const A = window.V2Agents;
  const bodyProps = { panel, seed, scope: askScope || scope, page, runs, onOpenMatches };

  return (
    <V2Ctx.Provider value={ctx}>
      <div className={`v2-app v3-app ${sideCollapsed ? "is-side-collapsed" : ""} ${dense ? "dense" : ""}`}>
        <Sidebar3 nav={nav} activeId={activeId} onNav={onNav} collapsed={sideCollapsed} onAgent={openAgent} onCollapse={() => setSideCollapsed(c => !c)}/>
        <div className="v2-main">
          <TopBar crumbs={crumbs} onToggleSide={() => setSideCollapsed(c => !c)} onOmni={() => openPanel("assistant")}
            cartCount={cartCount} notifications={notifications} actions={actions} runs={runs} dock={open ? panel : null}
            dense={dense} onDense={() => setDense(d => !d)} onShortcuts={() => setKeys(true)} onRuns={() => openPanel("runs")}/>
          {tabs && <SubNav tabs={tabs} activeTab={activeTab} onTab={onTab} right={subRight}/>}
          {filters && <FilterBar filters={filters} hint={filterHint} saved={saved} onSave={() => setSaved(true)}/>}
          <main className="v2-content">{children}</main>
        </div>

        {/* A · barre compagnon → feuille */}
        {surface === "bar" && (
          <>
            <CompanionBar open={open} runs={runs} page={page} note={note} onHideNote={() => setNote(false)} onOpen={openPanel} onAgent={openAgent}/>
            {open && (
              <div className={`v3-sheet ${wide ? "wide" : ""}`}>
                <div className="v3-sheet-in">
                  <AgentHead panel={panel} setPanel={setPanel} runs={runs} onClose={close}
                    extra={<button type="button" className="v2-iconbtn" onClick={() => setWide(w => !w)} aria-label="Agrandir"><Icon name="expand" size={16}/></button>}/>
                  <AgentBody {...bodyProps}/>
                </div>
              </div>
            )}
          </>
        )}

        {/* B · spotlight */}
        {surface === "spot" && (
          <>
            {!open && (
              <button type="button" className="v3-restpill" onClick={() => openPanel("assistant")}>
                <Icon name="sparkle" size={16}/>Assistant<span className="v3-kbd">⌘K</span>
                {runs.filter(r => r.state === "running").length > 0 && <span className="v3-spin"/>}
              </button>
            )}
            {open && (
              <div className="v3-spot-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
                <div className="v3-spot" role="dialog" aria-label="Assistant">
                  <AgentHead panel={panel} setPanel={setPanel} runs={runs} onClose={close}/>
                  <AgentBody {...bodyProps}/>
                </div>
              </div>
            )}
          </>
        )}

        {/* C · fenêtre flottante */}
        {surface === "win" && (
          <>
            {(!open || min) && (
              <button type="button" className="v3-restpill" onClick={() => { setOpen(true); setMin(false); }}>
                <Icon name="sparkle" size={16}/>Assistant<span className="v3-kbd">⌘K</span>
              </button>
            )}
            {open && !min && (
              <div className={`v3-win ${drag ? "drag" : ""}`} style={{ left: pos.x, top: pos.y }} role="dialog" aria-label="Assistant">
                <div onMouseDown={startDrag}>
                  <AgentHead panel={panel} setPanel={setPanel} runs={runs} onClose={close}
                    extra={<button type="button" className="v2-iconbtn" onClick={() => setMin(true)} aria-label="Réduire"><Icon name="rows" size={16}/></button>}/>
                </div>
                <AgentBody {...bodyProps}/>
              </div>
            )}
          </>
        )}

        {keys && A.Shortcuts && <A.Shortcuts onClose={() => setKeys(false)}/>}
      </div>
    </V2Ctx.Provider>
  );
};

window.V3 = { AppLayout3, Sidebar3, AgentHead, AgentBody, CompanionBar, SECTION_AGENT, LAUNCH };
})();
