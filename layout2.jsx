/* VisionsTrust — Layout v2 (shell) : sidebar sectionnée + header omnibox + sub-nav + dock contextuel.
 * Usage : <link rel="stylesheet" href="layout2.css"/> puis <script type="text/babel" src="layout2.jsx"></script>
 *         (charger layout2-agents.jsx ensuite, puis votre page)
 *   const { AppLayout2 } = window.V2;
 *   <AppLayout2 title="Catalogue" activeId="catalogue" tabs={[...]} scope={{...}}>…</AppLayout2>
 */
(function () {
const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;

const P = {
  home:<><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></>,
  grid:<><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/></>,
  doc:<><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M13 3v6h6M9 14h6M9 17h4"/></>,
  folder:<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
  contracts:<><path d="M7 3h8l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/><path d="M8 13h8M8 17h5"/></>,
  chart:<><path d="M4 20V4M4 20h16"/><path d="M7 16l4-5 3 3 5-7"/></>,
  triggers:<><path d="M7 4v5H3"/><path d="M3 9a9 9 0 0 1 15-4l3 3"/><path d="M17 20v-5h4"/><path d="M21 15a9 9 0 0 1-15 4l-3-3"/></>,
  tech:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  archive:<><rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/></>,
  share:<><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="m8.3 10.8 7.4-3.6M8.3 13.2l7.4 3.6"/></>,
  layers:<><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5M3 18l9 5 9-5" opacity=".5"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
  building:<><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M14 9h4a2 2 0 0 1 2 2v10"/><path d="M3 21h18M8 7h2M8 11h2M8 15h2"/></>,
  plus:<><path d="M12 5v14M5 12h14"/></>,
  chevronDown:<><path d="m6 9 6 6 6-6"/></>,
  chevronRight:<><path d="m9 6 6 6-6 6"/></>,
  panelLeft:<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="m14.5 9-2.5 3 2.5 3"/></>,
  cart:<><circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none"/><circle cx="17" cy="20" r="1.4" fill="currentColor" stroke="none"/><path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.2L21 8H6"/></>,
  translate:<><path d="M3 5h9M7.5 3v2M4.5 5a8 8 0 0 0 6 8M10.5 8.5a8 8 0 0 1-6.5 8M13 21l4-9 4 9M14.5 17.8h5"/></>,
  bell:<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.5 20a1.5 1.5 0 0 0 3 0"/></>,
  sparkle:<><path d="M12 2.5c.7 3.6 2.4 5.3 6 6-3.6.7-5.3 2.4-6 6-.7-3.6-2.4-5.3-6-6 3.6-.7 5.3-2.4 6-6z" fill="currentColor" stroke="none"/><path d="M18.6 15.4c.35 1.8 1.2 2.65 3 3-1.8.35-2.65 1.2-3 3-.35-1.8-1.2-2.65-3-3 1.8-.35 2.65-1.2 3-3z" fill="currentColor" stroke="none"/></>,
  chatDot:<><path d="M4.5 5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4.5 4V6a1 1 0 0 1 1-1z"/><circle cx="9" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10.5" r="1" fill="currentColor" stroke="none"/></>,
  arrowRight:<><path d="M5 12h13M13 6l6 6-6 6"/></>,
  send:<><path d="M4 12 20 4l-6.5 16-2.4-6.6z"/><path d="m11.1 13.4 8.9-9.4"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  power:<><path d="M12 3v9"/><path d="M6.8 7A8 8 0 1 0 17.2 7"/></>,
  search:<><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></>,
  wand:<><path d="M5 19 16 8"/><path d="M18 3.5c.35 1.8 1.2 2.65 3 3-1.8.35-2.65 1.2-3 3-.35-1.8-1.2-2.65-3-3 1.8-.35 2.65-1.2 3-3z" fill="currentColor" stroke="none"/><path d="M8.5 4c.25 1.2.8 1.75 2 2-1.2.25-1.75.8-2 2-.25-1.2-.8-1.75-2-2 1.2-.25 1.75-.8 2-2z" fill="currentColor" stroke="none"/></>,
  scale:<><path d="M12 4v16M7 20h10M5 8h14M12 4.5 5 8l-2.5 5h9L5 8m7 0 7 3-2.5 5h9L19 11"/></>,
  target:<><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></>,
  book:<><path d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2z"/><path d="M20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z"/></>,
  activity:<><path d="M3 12h4l2.5-7 4 14L16 12h5"/></>,
  pin:<><path d="M12 3.5 14 9l5.5 1.5-4 4 .8 5.5L12 17.4 7.7 20l.8-5.5-4-4L10 9z"/></>,
  close:<><path d="M6 6l12 12M18 6 6 18"/></>,
  check:<><path d="m4.5 12.5 5 5 10-11"/></>,
  filter:<><path d="M4 6h16M7 12h10M10 18h4"/></>,
  dots:<><circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/></>,
  bolt:<><path d="M13.5 3 5 13.5h5L9.5 21 19 10h-5.5z"/></>,
  shield:<><path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/><path d="m8.8 12 2.4 2.4 4-4.4"/></>,
  refresh:<><path d="M20 11a8 8 0 1 0-2.4 5.7"/><path d="M20 4.5V11h-6"/></>,
  history:<><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3.5 2"/></>,
  bookmark:<><path d="M6 4h12v17l-6-4-6 4z"/></>,
  keyboard:<><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9"/></>,
  eye:<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></>,
  expand:<><path d="M9 3H4v5M15 21h5v-5M20 8V3h-5M4 16v5h5"/></>,
  rows:<><rect x="3" y="5" width="18" height="5" rx="1.4"/><rect x="3" y="14" width="18" height="5" rx="1.4"/></>,
};
const Icon = ({ name, size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{P[name] || null}</svg>
);
const BrandMark = ({ size = 26 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#08ffad"/><path d="M7 8.5 12 17l5-8.5" stroke="#17243f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const FlagUK = () => (<svg className="v2-flag" viewBox="0 0 20 14" aria-hidden="true"><rect width="20" height="14" fill="#0a17a7"/><path d="M0 0l20 14M20 0L0 14" stroke="#fff" strokeWidth="3"/><path d="M0 0l20 14M20 0L0 14" stroke="#e6273e" strokeWidth="1.4"/><path d="M10 0v14M0 7h20" stroke="#fff" strokeWidth="4"/><path d="M10 0v14M0 7h20" stroke="#e6273e" strokeWidth="2"/></svg>);
const FlagFR = () => (<svg className="v2-flag" viewBox="0 0 20 14" aria-hidden="true"><rect width="20" height="14" fill="#fff"/><rect width="6.7" height="14" fill="#1d3a8f"/><rect x="13.3" width="6.7" height="14" fill="#e6273e"/></svg>);

// ─── Agents : un master, cinq compétences. Une seule source de vérité. ──────
const AGENTS = {
  master:     { id:"master",     label:"Assistant",  short:"Assistant", icon:"sparkle", desc:"Router — choisit la compétence" },
  help:       { id:"help",       label:"Help",       short:"Help",       icon:"book",   desc:"Comprendre la plateforme et le vocabulaire" },
  completion: { id:"completion", label:"Completion", short:"Completion", icon:"wand",   desc:"Rédiger et compléter offres, projets, ressources" },
  matching:   { id:"matching",   label:"Matching",   short:"Matching",   icon:"target", desc:"Proposer des produits comparables aux vôtres" },
  legal:      { id:"legal",      label:"Legal",      short:"Legal",      icon:"scale",  desc:"Contrats, licences, conformité" },
  search:     { id:"search",     label:"Search",     short:"Search",     icon:"search", desc:"Trouver dans le catalogue en langage naturel" },
};
const AgentChip = ({ id, label, className = "", ...rest }) => {
  const a = AGENTS[id] || AGENTS.master;
  return <span className={`v2-agent ${id} ${className}`} {...rest}><Icon name={a.icon} size={13}/>{label || a.short}</span>;
};

// ─── Navigation v2 : sections + niveau 2 déporté en onglets ────────────────
const V2_NAV = [
  { section: null, items: [
    { id:"home", label:"Home", icon:"home", href:"#" },
    { id:"catalogue", label:"Catalogue", icon:"grid", href:"#" },
  ] },
  { section: "Mon organisation", items: [
    { id:"offers", label:"My Offers", icon:"doc", count:"12", href:"#", tabs:["All","Data","Services","Infrastructure","Resources","Archived"] },
    { id:"projects", label:"My Projects", icon:"folder", count:"5", href:"#", tabs:["All","Initiated","Joined","Pending","Archived"] },
    { id:"contracts", label:"My Contracts", icon:"contracts", count:"3", href:"#", tabs:["Active","To sign","Ended"] },
  ] },
  { section: "Pilotage", items: [
    { id:"dashboard", label:"My Dashboard", icon:"chart", href:"#" },
    { id:"exch", label:"Exchange Triggers", icon:"triggers", href:"#" },
    { id:"techspace", label:"My Tech Space", icon:"tech", href:"#" },
  ] },
];
const V2_PINS = [
  { id:"p1", label:"Mobility insights 2026", color:"#08ffad", kind:"Project" },
  { id:"p2", label:"Fleet telemetry — raw", color:"#00a2ae", kind:"Offer" },
  { id:"p3", label:"DPA · Kuzzle ↔ Visions", color:"#a78bfa", kind:"Contract" },
];
const V2_NOTIFICATIONS = [
  { id:1, text:"21 offers match with your project Mobility insights 2026.", date:"16/07/2026", unread:true, agent:"matching" },
  { id:2, text:"Legal a signalé 2 clauses à revoir dans le DPA Kuzzle.", date:"16/07/2026", unread:true, agent:"legal" },
  { id:3, text:"Votre offre Fleet telemetry est publiée.", date:"15/07/2026", unread:true },
  { id:4, text:"Completion a préparé un brouillon de description pour Air quality feed.", date:"12/07/2026", agent:"completion" },
];

// ─── Contexte agents (les surfaces inline parlent au dock) ─────────────────
const V2Ctx = createContext(null);
const useAgents = () => useContext(V2Ctx) || { openAgent(){}, openPalette(){}, closeDock(){}, dock:null, scope:null };

// ─── SIDEBAR ───────────────────────────────────────────────────────────────
const Sidebar = ({ nav, activeId, onNav, onCollapse }) => {
  const [shut, setShut] = useState({});
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
            {(shut[sec.section] ? [] : sec.items).map(item => (
              <div className="v2-iwrap" key={item.id}>
                <a className={`v2-item ${item.id === activeId ? "active" : ""}`} href={item.href || "#"} onClick={(e) => { e.preventDefault(); onNav && onNav(item.id); }} aria-current={item.id === activeId ? "page" : undefined}>
                  <Icon name={item.icon}/><span>{item.label}</span>{item.count && <span className="v2-count">{item.count}</span>}
                </a>
                <div className="v2-flyout">
                  <b>{item.label}</b>
                  {(item.tabs || ["Ouvrir"]).map(t => (
                    <a key={t} className="v2-item sm" href="#" onClick={(e) => { e.preventDefault(); onNav && onNav(item.id, t); }}>{t}</a>
                  ))}
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
        <button type="button" className={`v2-secbtn ${shut.pins ? "closed" : ""}`} onClick={() => setShut(s => ({ ...s, pins: !s.pins }))} aria-expanded={!shut.pins}>
          <span>Épinglés</span><Icon name="chevronDown" size={12}/>
        </button>
        {(shut.pins ? [] : V2_PINS).map(p => (
          <div className="v2-iwrap" key={p.id}>
            <a className="v2-pin" href="#" onClick={(e) => e.preventDefault()}><i style={{ background: p.color }}/><span>{p.label}</span></a>
            <div className="v2-flyout"><b>{p.kind}</b><a className="v2-item sm" href="#" onClick={(e) => e.preventDefault()}>{p.label}</a></div>
          </div>
        ))}
      </nav>
      <div className="v2-side-foot">
        <a className="v2-item sm" href="#" onClick={(e) => e.preventDefault()}><Icon name="settings" size={16}/><span>Settings</span></a>
        <button type="button" className="v2-item sm" onClick={onCollapse}><Icon name="panelLeft" size={16}/><span>Replier</span></button>
      </div>
    </div>
  </aside>
  );
};

// ─── HEADER ────────────────────────────────────────────────────────────────
const TopBar = ({ crumbs, onToggleSide, onOmni, cartCount, notifications, actions, runs, onRuns, dock, dense, onDense, onShortcuts }) => {
  const [menu, setMenu] = useState(null);
  const [lang, setLang] = useState("en");
  const ref = useRef(null);
  const cref = useRef(null);
  useEffect(() => {
    const down = (e) => { const a = ref.current && ref.current.contains(e.target), b = cref.current && cref.current.contains(e.target); if (!a && !b) setMenu(null); };
    const esc = (e) => { if (e.key === "Escape") setMenu(null); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", esc); };
  }, []);
  const unread = notifications.filter(n => n.unread).length;
  const running = runs.filter(r => r.state === "running").length;
  return (
    <header className="v2-top">
      <div className="v2-crumbs" ref={cref}>
        <button type="button" className="v2-ghost" onClick={onToggleSide} aria-label="Replier la navigation"><Icon name="panelLeft" size={19}/></button>
        {crumbs.map((c, i) => {
          const label = typeof c === "string" ? c : c.label;
          const sibs = typeof c === "string" ? null : c.siblings;
          const last = i === crumbs.length - 1;
          return (
            <React.Fragment key={label + i}>
              {i > 0 && <Icon name="chevronRight" size={13} className="v2-crumb-sep"/>}
              {last && sibs ? (
                <div className="v2-menu-wrap">
                  <button type="button" className="v2-crumb cur has-menu" onClick={() => setMenu(m => m === "crumb" ? null : "crumb")} aria-expanded={menu === "crumb"}>{label}<Icon name="chevronDown" size={14}/></button>
                  {menu === "crumb" && (
                    <div className="v2-menu" style={{ left: 0, right: "auto", minWidth: 280 }} role="menu">
                      <div className="v2-mhead">Aller à — sans repasser par la liste</div>
                      {sibs.map(s => (
                        <button key={s} type="button" className="v2-mitem" onClick={() => setMenu(null)}><Icon name="doc" size={15}/><span>{s}</span>{s === label && <small><Icon name="check" size={14}/></small>}</button>
                      ))}
                    </div>
                  )}
                </div>
              ) : last ? <span className="v2-crumb cur">{label}</span>
                : <button type="button" className="v2-crumb">{label}</button>}
            </React.Fragment>
          );
        })}
      </div>
      <button type="button" className="v2-omni" onClick={onOmni}>
        <Icon name="search" size={16}/>
        <span>Chercher, naviguer ou demander à l'Assistant…</span>
        <span className="v2-omni-spark"><Icon name="sparkle" size={14}/></span>
        <span className="v2-kbd">⌘K</span>
      </button>
      <div className="v2-topright" ref={ref}>
        {actions}
        <div className="v2-bar">
          {running > 0 && (
            <button type="button" className={`v2-abtn ${dock === "runs" ? "on" : ""}`} onClick={onRuns} aria-label="Tâches des agents">
              <span className="v2-spin"/><span>{running}</span>
            </button>
          )}
          <button type="button" className="v2-abtn" aria-label={`Basket, ${cartCount}`}><Icon name="cart"/>{cartCount > 0 && <span className="v2-badge">{cartCount}</span>}</button>
          <span className="v2-sep" aria-hidden="true"/>
          <div className="v2-menu-wrap">
            <button type="button" className={`v2-abtn ${menu === "lang" ? "on" : ""}`} onClick={() => setMenu(m => m === "lang" ? null : "lang")} aria-label="Langue"><Icon name="translate"/></button>
            {menu === "lang" && (
              <div className="v2-menu" role="menu">
                <button type="button" className="v2-mitem" onClick={() => { setLang("en"); setMenu(null); }}><FlagUK/><span>English</span>{lang === "en" && <small><Icon name="check" size={14}/></small>}</button>
                <button type="button" className="v2-mitem" onClick={() => { setLang("fr"); setMenu(null); }}><FlagFR/><span>Français</span>{lang === "fr" && <small><Icon name="check" size={14}/></small>}</button>
              </div>
            )}
          </div>
          <div className="v2-menu-wrap">
            <button type="button" className={`v2-abtn ${menu === "notif" ? "on" : ""}`} onClick={() => setMenu(m => m === "notif" ? null : "notif")} aria-label={`Notifications, ${unread} non lues`}>
              <Icon name="bell"/>{unread > 0 && <span className="v2-badge">{unread}</span>}
            </button>
            {menu === "notif" && (
              <div className="v2-menu" style={{ width: 340 }} role="dialog" aria-label="Notifications">
                <div className="v2-mhead">Notifications</div>
                {notifications.map(n => (
                  <div key={n.id} className="v2-mitem" style={{ alignItems: "flex-start", fontWeight: 500, opacity: n.unread ? 1 : .55 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12.5, lineHeight: 1.45, textWrap: "pretty" }}>{n.text}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6 }}>
                        {n.agent && <AgentChip id={n.agent}/>}
                        <span style={{ font: "500 11px/1 var(--v2-font)", color: "var(--v2-muted)" }}>{n.date}</span>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="v2-menu-wrap">
            <button type="button" className="v2-abtn" onClick={() => setMenu(m => m === "user" ? null : "user")} aria-label="Compte"><span className="v2-avatar">AD</span></button>
            {menu === "user" && (
              <div className="v2-menu" role="menu">
                <div className="v2-mhead">Alex Dupont · Admin</div>
                <a className="v2-mitem" href="#" onClick={(e) => e.preventDefault()}><Icon name="settings" size={16}/><span>Profile settings</span></a>
                <a className="v2-mitem" href="#" onClick={(e) => e.preventDefault()}><Icon name="building" size={16}/><span>Organisation</span></a>
                <button type="button" className="v2-mitem" onClick={() => { onDense(); setMenu(null); }}><Icon name="rows" size={16}/><span>Densité : {dense ? "compacte" : "confortable"}</span></button>
                <button type="button" className="v2-mitem" onClick={() => { onShortcuts(); setMenu(null); }}><Icon name="keyboard" size={16}/><span>Raccourcis clavier</span><small>?</small></button>
                <button type="button" className="v2-mitem"><Icon name="power" size={16}/><span>Logout</span></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// ─── SUB-NAV (niveau 2) ────────────────────────────────────────────────────
const SubNav = ({ tabs, activeTab, onTab, right, maxVisible = 5 }) => {
  const [menu, setMenu] = useState(false);
  const norm = tabs.map(t => typeof t === "string" ? { label: t } : t);
  const shown = norm.slice(0, maxVisible), rest = norm.slice(maxVisible);
  const restActive = rest.some(t => t.label === activeTab);
  return (
    <div className="v2-sub">
      <div className="v2-tabs">
        {shown.map(t => (
          <button key={t.label} type="button" className={`v2-tab ${t.label === activeTab ? "on" : ""}`} onClick={() => onTab && onTab(t.label)}>
            {t.custom && <span className="v2-viewdot"/>}{t.label}{t.count != null && <em>{t.count}</em>}
          </button>
        ))}
        {rest.length > 0 && (
          <div className="v2-menu-wrap">
            <button type="button" className={`v2-tab more ${restActive ? "on" : ""}`} onClick={() => setMenu(m => !m)} aria-label="Autres vues">
              {restActive ? activeTab : `+${rest.length}`}<Icon name="chevronDown" size={13}/>
            </button>
            {menu && (
              <div className="v2-menu" style={{ left: 0, right: "auto" }} role="menu">
                <div className="v2-mhead">Vues</div>
                {rest.map(t => (
                  <button key={t.label} type="button" className="v2-mitem" onClick={() => { onTab && onTab(t.label); setMenu(false); }}>
                    {t.custom ? <span className="v2-viewdot"/> : <Icon name="filter" size={15}/>}<span>{t.label}</span>{t.count != null && <small>{t.count}</small>}
                  </button>
                ))}
                <button type="button" className="v2-mitem" onClick={() => setMenu(false)}><Icon name="settings" size={15}/><span>Gérer les vues</span></button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="v2-subright">{right}</div>
    </div>
  );
};

// ─── BARRE DE FILTRES (vue courante = filtres + tri, enregistrable) ──────
const FilterBar = ({ filters = [], hint, onSave, saved }) => (
  <div className="v2-fbar">
    {filters.map(f => (
      <button key={f.k} type="button" className={`v2-fchip ${f.agent ? "agent" : ""}`}>{f.agent && <Icon name="sparkle" size={12}/>}{f.k} : <b>{f.v}</b><Icon name="close" size={12}/></button>
    ))}
    <button type="button" className="v2-fchip add"><Icon name="plus" size={12}/>Ajouter un filtre</button>
    {hint && <span className="v2-hint">{hint}</span>}
    <span className="v2-spacer"/>
    <button type="button" className="v2-view-new" onClick={onSave}><Icon name="bookmark" size={13}/>{saved ? "Vue enregistrée" : "Enregistrer comme vue"}</button>
  </div>
);

// ─── RAIL (points d'entrée persistants du dock) ────────────────────────────
const Rail = ({ dock, open, runs }) => {
  const running = runs.filter(r => r.state === "running").length;
  const btn = (id, icon, tip, dot) => (
    <button type="button" className={`v2-rtab ${dock === id ? "on" : ""}`} onClick={() => open(id)} aria-label={tip} aria-pressed={dock === id}>
      <Icon name={icon} size={18}/>{dot && <span className="v2-dot"/>}<span className="v2-tip">{tip}</span>
    </button>
  );
  return (
    <div className="v2-rail">
      {btn("assistant", "sparkle", "Assistant (⌘K pour demander)")}
      {btn("runs", "activity", "Tâches des agents", running > 0)}
      <div className="v2-rail-sep"/>
      {btn("legal", "scale", "Legal companion")}
      {btn("history", "history", "Activité de la page")}
    </div>
  );
};

// ─── SHELL ─────────────────────────────────────────────────────────────────
const V2_RUNS = [
  { id:"r1", agent:"matching", title:"Matching · Mobility insights 2026", note:"32 offres analysées · 6 fortes correspondances", state:"done" },
  { id:"r2", agent:"legal", title:"Legal · DPA Kuzzle ↔ Visions", note:"Analyse des clauses en cours…", state:"running" },
  { id:"r3", agent:"completion", title:"Completion · Air quality feed", note:"Brouillon de description prêt", state:"done" },
];

const AppLayout2 = ({
  crumbs = ["Home"], activeId = "home", nav = V2_NAV, tabs = null, activeTab = null, onTab, onNav,
  actions = null, subRight = null, cartCount = 2, notifications = V2_NOTIFICATIONS,
  defaultDock = null, suggested = null, scope = null, runs = V2_RUNS, page = "home", onOpenMatches,
  filters = null, filterHint = null, children,
}) => {
  const [dock, setDock] = useState(defaultDock);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const [askScope, setAskScope] = useState(null);
  const [seed, setSeed] = useState(null);
  const [dense, setDense] = useState(false);
  const [keys, setKeys] = useState(false);
  const [dockW, setDockW] = useState(404);
  const [saved, setSaved] = useState(false);
  const [trayOff, setTrayOff] = useState(false);

  useEffect(() => { setDock(defaultDock); }, [defaultDock]);
  useEffect(() => {
    const typing = (t) => t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(p => !p); return; }
      if (e.key === "Escape") { setPalette(false); setKeys(false); return; }
      if (typing(e.target)) return;
      if (e.key === "?") { e.preventDefault(); setKeys(k => !k); }
      if (e.key === "[") setSideCollapsed(c => !c);
      if (e.key === "]") setDock(d => d ? null : "assistant");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const startResize = (e) => {
    e.preventDefault();
    const move = (ev) => setDockW(Math.min(680, Math.max(320, window.innerWidth - ev.clientX - 52)));
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  };

  const openAgent = useCallback((agentId, opts = {}) => {
    setSeed({ agent: agentId, prompt: opts.prompt || null, at: Date.now() });
    setAskScope(opts.scope || null);
    setDock(agentId === "legal" ? "legal" : "assistant");
    setPalette(false);
  }, []);
  const ctx = { openAgent, openPalette: () => setPalette(true), closeDock: () => setDock(null), dock, scope };

  const A = window.V2Agents || {};
  const dockNode = dock && A.Dock
    ? <A.Dock tab={dock} setTab={setDock} seed={seed} scope={askScope || scope} runs={runs} suggested={suggested} page={page} onOpenMatches={onOpenMatches} onClose={() => setDock(null)}/>
    : null;

  return (
    <V2Ctx.Provider value={ctx}>
      <div className={`v2-app ${dock ? "is-dock-open" : ""} ${sideCollapsed ? "is-side-collapsed" : ""} ${dense ? "dense" : ""}`} style={{ "--v2-dock": dockW + "px" }}>
        <Sidebar nav={nav} activeId={activeId} onNav={onNav} onCollapse={() => setSideCollapsed(c => !c)}/>
        <div className="v2-main">
          <TopBar crumbs={crumbs} onToggleSide={() => setSideCollapsed(c => !c)} onOmni={() => setPalette(true)}
            cartCount={cartCount} notifications={notifications} actions={actions} runs={runs} dock={dock}
            dense={dense} onDense={() => setDense(d => !d)} onShortcuts={() => setKeys(true)}
            onRuns={() => setDock(d => d === "runs" ? null : "runs")}/>
          {tabs && <SubNav tabs={tabs} activeTab={activeTab} onTab={onTab} right={subRight}/>}
          {filters && <FilterBar filters={filters} hint={filterHint} saved={saved} onSave={() => setSaved(true)}/>}
          <main className="v2-content">{children}</main>
        </div>
        <div className="v2-right">
          <Rail dock={dock} runs={runs} open={(id) => setDock(d => d === id ? null : id)}/>
          <div className="v2-dockwrap">
            {dock && <div className="v2-dockgrip" onMouseDown={startResize} role="separator" aria-label="Redimensionner le panneau"/>}
            {dockNode}
          </div>
        </div>
        {palette && A.Palette && <A.Palette onClose={() => setPalette(false)} openAgent={openAgent} scope={scope}/>}
        {keys && A.Shortcuts && <A.Shortcuts onClose={() => setKeys(false)}/>}
        {!trayOff && dock !== "runs" && A.Tray && (
          <A.Tray runs={runs} onOpen={() => setDock("runs")} onDismiss={() => setTrayOff(true)} onOpenMatches={onOpenMatches}/>
        )}
        {window.V2Companion && <window.V2Companion.Companion page={page} scope={askScope || scope} runs={runs}/>}
      </div>
    </V2Ctx.Provider>
  );
};

window.V2 = { AppLayout2, Sidebar, TopBar, SubNav, FilterBar, Icon, BrandMark, AgentChip, AGENTS, V2_NAV, V2_PINS, V2_NOTIFICATIONS, V2_RUNS, V2Ctx, useAgents };
})();
