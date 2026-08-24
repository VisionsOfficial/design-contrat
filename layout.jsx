/* VisionsTrust — Base app layout (réutilisable)
 * Usage dans n'importe quelle page :
 *   <link rel="stylesheet" href="layout.css"/>
 *   <script type="text/babel" src="layout.jsx"></script>   (avant votre page)
 *
 *   const { AppLayout } = window.VTLayout;
 *   <AppLayout title="Welcome" activeId="home">…votre contenu…</AppLayout>
 *
 * Props : title, activeId, nav (défaut VT_NAV), cartCount, notifications,
 *         defaultPanel ("helper" | "ai" | null), defaultSideCollapsed,
 *         actions (noeuds ajoutés à gauche de la barre d'actions), children.
 */
(function () {
  const { useState, useEffect, useRef } = React;

  const P = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.2" /><rect x="14" y="3" width="7" height="7" rx="1.2" /><rect x="3" y="14" width="7" height="7" rx="1.2" /><rect x="14" y="14" width="7" height="7" rx="1.2" /></>,
    doc: <><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M13 3v6h6M9 14h6M9 17h4" /></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    contracts: <><path d="M7 3h8l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M14 3v5h5" /><path d="M8 13h8M8 17h5" /></>,
    chart: <><path d="M4 20V4M4 20h16" /><path d="M7 16l4-5 3 3 5-7" /></>,
    triggers: <><path d="M7 4v5H3" /><path d="M3 9a9 9 0 0 1 15-4l3 3" /><path d="M17 20v-5h4" /><path d="M21 15a9 9 0 0 1-15 4l-3-3" /></>,
    tech: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
    archive: <><rect x="3" y="4" width="18" height="5" rx="1.5" /><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4" /></>,
    share: <><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="6" r="2.6" /><circle cx="18" cy="18" r="2.6" /><path d="m8.3 10.8 7.4-3.6M8.3 13.2l7.4 3.6" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5M3 18l9 5 9-5" opacity=".5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    building: <><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" /><path d="M14 9h4a2 2 0 0 1 2 2v10" /><path d="M3 21h18M8 7h2M8 11h2M8 15h2" /></>,
    plusBig: <><path d="M12 4v16M4 12h16" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    chevronDown: <><path d="m6 9 6 6 6-6" /></>,
    chevronUp: <><path d="m6 15 6-6 6 6" /></>,
    panelLeft: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path d="m14.5 9-2.5 3 2.5 3" /></>,
    cart: <><circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" /><circle cx="17" cy="20" r="1.4" fill="currentColor" stroke="none" /><path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.2L21 8H6" /></>,
    translate: <><path d="M3 5h9M7.5 3v2M4.5 5a8 8 0 0 0 6 8M10.5 8.5a8 8 0 0 1-6.5 8M13 21l4-9 4 9M14.5 17.8h5" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7M12 17v.5" /></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.5 20a1.5 1.5 0 0 0 3 0" /></>,
    sparkle: <><path d="M12 2.5c.7 3.6 2.4 5.3 6 6-3.6.7-5.3 2.4-6 6-.7-3.6-2.4-5.3-6-6 3.6-.7 5.3-2.4 6-6z" fill="currentColor" stroke="none" /><path d="M18.5 15.5c.35 1.8 1.2 2.65 3 3-1.8.35-2.65 1.2-3 3-.35-1.8-1.2-2.65-3-3 1.8-.35 2.65-1.2 3-3z" fill="currentColor" stroke="none" /></>,
    chat: <><path d="M4.5 5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4.5 4V6a1 1 0 0 1 1-1z" /></>,
    chatDot: <><path d="M4.5 5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4.5 4V6a1 1 0 0 1 1-1z" /><circle cx="9" cy="10.5" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="10.5" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="10.5" r="1" fill="currentColor" stroke="none" /></>,
    arrowRight: <><path d="M5 12h13M13 6l6 6-6 6" /></>,
    collapseRight: <><path d="M15 6l-6 6 6 6" /><path d="M20 4v16" /></>,
    collapseLeft: <><path d="M9 6l6 6-6 6" /><path d="M20 4v16" /></>,
    send: <><path d="M4 12 20 4l-6.5 16-2.4-6.6z" /><path d="m11.1 13.4 8.9-9.4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
    power: <><path d="M12 3v9" /><path d="M6.8 7A8 8 0 1 0 17.2 7" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>
  };
  const Icon = ({ name, size = 18, className = "" }) =>
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{P[name] || null}</svg>;


  const BrandMark = () =>
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#08ffad" />
    <path d="M7 8.5 12 17l5-8.5" stroke="#17243f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;


  const FlagUK = () =>
  <svg className="vt-flag" viewBox="0 0 20 14" aria-hidden="true"><rect width="20" height="14" fill="#0a17a7" /><path d="M0 0l20 14M20 0L0 14" stroke="#fff" strokeWidth="3" /><path d="M0 0l20 14M20 0L0 14" stroke="#e6273e" strokeWidth="1.4" /><path d="M10 0v14M0 7h20" stroke="#fff" strokeWidth="4" /><path d="M10 0v14M0 7h20" stroke="#e6273e" strokeWidth="2" /></svg>;

  const FlagFR = () =>
  <svg className="vt-flag" viewBox="0 0 20 14" aria-hidden="true"><rect width="20" height="14" fill="#fff" /><rect width="6.7" height="14" fill="#1d3a8f" /><rect x="13.3" width="6.7" height="14" fill="#e6273e" /></svg>;


  // ─── NAVIGATION (surchargeable via la prop `nav`) ───────────────────────────
  const VT_NAV = [
  { id: "home", label: "Home", icon: "home", href: "Home.html" },
  { id: "catalogue", label: "Catalogue", icon: "grid", href: "Catalogue.html" },
  { id: "offers", label: "My Offers", icon: "doc", children: [
    { id: "offers-home", label: "Home", icon: "doc", href: "My Offers.html" },
    { id: "offers-all", label: "All", icon: "doc" },
    { id: "offers-data", label: "Data", icon: "doc" },
    { id: "offers-services", label: "Services", icon: "tech" },
    { id: "offers-infra", label: "Infrastructure", icon: "building" },
    { id: "offers-archived", label: "Archived", icon: "archive" },
    { id: "offers-resources", label: "My Resources", icon: "share" }]
  },
  { id: "projects", label: "My Projects", icon: "folder", children: [
    { id: "proj-home", label: "Home", icon: "folder", href: "My Projects.html" },
    { id: "proj-all", label: "All", icon: "folder" },
    { id: "proj-initiated", label: "Initiated", icon: "plusBig" },
    { id: "proj-joined", label: "Joined", icon: "layers" },
    { id: "proj-pending", label: "Pending", icon: "clock" },
    { id: "proj-archived", label: "Archived", icon: "archive" }]
  },
  { id: "contracts", label: "My Contracts", icon: "contracts", href: "My Contracts.html" },
  { id: "dashboard", label: "My Dashboard", icon: "chart" },
  { id: "exch", label: "Exchange Triggers", icon: "triggers" },
  { id: "techspace", label: "My Tech Space", icon: "tech" }];


  const VT_NOTIFICATIONS = [
  { id: 1, text: "Your project Test guardianship is published – find partners to collaborate with!", date: "16/07/2026", unread: true },
  { id: 2, text: "Your offer Test guardianship off is published! Discover the projects that need it and start collaborating.", date: "16/07/2026", unread: true },
  { id: 3, text: "Your offer Test guardianship off is published! Discover the projects that need it and start collaborating.", date: "16/07/2026", unread: true },
  { id: 4, text: "21 offers match with your project test! Find the data and services you need.", date: "01/07/2026" },
  { id: 5, text: "45 offers match with your project Test! Find the data and services you need.", date: "01/07/2026" },
  { id: 6, text: "6 offers match with your project to sign! Find the data and services you need.", date: "01/07/2026" }];


  const HELPER_ACTIONS = ["Add a project", "Add an offer", "Explore the catalog", "Publish your offer", "Publish your project", "Complete your offer", "Complete your project"];
  const AI_PROMPTS = ["Understanding the platform", "What is a data space ?"];

  // ─── SIDEBAR ────────────────────────────────────────────────────────────────
  const Sidebar = ({ nav, activeId }) => {
    const parentOf = (id) => nav.find((n) => n.children && n.children.some((c) => c.id === id));
    const [open, setOpen] = useState(() => {
      const p = parentOf(activeId);
      return p ? { [p.id]: true } : {};
    });
    return (
      <aside className="vt-side">
      <div className="vt-side-card">
        <a className="vt-brand" href="Home.html">
          <span className="vt-brand-logo"><BrandMark /></span>
          <span className="vt-brand-name">VisionsTrust</span>
        </a>
        <nav className="vt-nav" aria-label="Main">
          {nav.map((item) => item.children ?
            <React.Fragment key={item.id}>
              <button type="button" className={`vt-item group ${item.id === activeId ? "active" : ""}`} onClick={() => setOpen((s) => ({ ...s, [item.id]: !s[item.id] }))} aria-expanded={!!open[item.id]}>
                <Icon name={item.icon} /><span>{item.label}</span>
                <Icon name={open[item.id] ? "chevronUp" : "chevronDown"} size={14} className="vt-chev" />
              </button>
              {open[item.id] &&
              <div className="vt-children">
                  {item.children.map((c) =>
                <a key={c.id} className={`vt-item child ${c.id === activeId ? "active" : ""}`} href={c.href || "#"} aria-current={c.id === activeId ? "page" : undefined}>
                      <Icon name={c.icon} size={16} /><span>{c.label}</span>
                    </a>
                )}
                </div>
              }
            </React.Fragment> :

            <a key={item.id} className={`vt-item ${item.id === activeId ? "active" : ""}`} href={item.href || "#"} aria-current={item.id === activeId ? "page" : undefined} title={item.label}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </a>
            )}
        </nav>
      </div>
    </aside>);

  };

  // ─── TOPBAR ─────────────────────────────────────────────────────────────────
  const TopBar = ({ title, onToggleSide, cartCount, cartHref, notifications, actions }) => {
    const [menu, setMenu] = useState(null);
    const [lang, setLang] = useState("en");
    const [notifTab, setNotifTab] = useState("all");
    const barRef = useRef(null);
    useEffect(() => {
      const onDown = (e) => {if (barRef.current && !barRef.current.contains(e.target)) setMenu(null);};
      const onEsc = (e) => {if (e.key === "Escape") setMenu(null);};
      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown", onEsc);
      return () => {document.removeEventListener("mousedown", onDown);document.removeEventListener("keydown", onEsc);};
    }, []);
    const toggle = (id) => setMenu((m) => m === id ? null : id);
    const list = notifTab === "unread" ? notifications.filter((n) => n.unread) : notifications;
    const unread = notifications.filter((n) => n.unread).length;
    return (
      <header className="vt-topbar">
      <div className="vt-topbar-left">
        <button type="button" className="vt-ghost" onClick={onToggleSide} aria-label="Toggle navigation"><Icon name="panelLeft" size={20} /></button>
        <h1 className="vt-title">{title}</h1>
      </div>
      <div className="vt-actions" ref={barRef}>
        {actions}
        <div className="vt-actionbar">
          {cartHref
            ? <a className="vt-abtn" href={cartHref} aria-label={`Contract request, ${cartCount} items`}><Icon name="contracts" />{cartCount > 0 && <span className="vt-badge">{cartCount}</span>}</a>
            : <button type="button" className="vt-abtn" aria-label={`Contract request, ${cartCount} items`}><Icon name="contracts" />{cartCount > 0 && <span className="vt-badge">{cartCount}</span>}</button>}
          <span className="vt-sep" aria-hidden="true" />
          <div className="vt-menu-wrap">
            <button type="button" className={`vt-abtn ${menu === "lang" ? "on" : ""}`} onClick={() => toggle("lang")} aria-haspopup="true" aria-expanded={menu === "lang"} aria-label="Language"><Icon name="translate" /></button>
            {menu === "lang" &&
              <div className="vt-menu" role="menu">
                <button type="button" role="menuitem" className={`vt-mitem ${lang === "en" ? "on" : ""}`} onClick={() => {setLang("en");setMenu(null);}}><FlagUK /><span>English</span><span className="vt-tag">en</span></button>
                <button type="button" role="menuitem" className={`vt-mitem ${lang === "fr" ? "on" : ""}`} onClick={() => {setLang("fr");setMenu(null);}}><FlagFR /><span>Français</span><span className="vt-tag">fr</span></button>
              </div>
              }
          </div>
          <button type="button" className="vt-abtn"><Icon name="help" size={17} /><span>Help</span></button>
          <div className="vt-menu-wrap">
            <button type="button" className={`vt-abtn ${menu === "notif" ? "on" : ""}`} onClick={() => toggle("notif")} aria-haspopup="true" aria-expanded={menu === "notif"} aria-label={`Notifications, ${unread} unread`}>
              <Icon name="bell" />{unread > 0 && <span className="vt-badge">{unread}</span>}
            </button>
            {menu === "notif" &&
              <div className="vt-menu notif" role="dialog" aria-label="Notifications">
                <div className="vt-notif-head"><h3>Notifications</h3><button type="button" className="vt-linkbtn">Mark all as read</button></div>
                <div className="vt-seg">
                  <button type="button" className={notifTab === "all" ? "on" : ""} onClick={() => setNotifTab("all")}>All</button>
                  <button type="button" className={notifTab === "unread" ? "on" : ""} onClick={() => setNotifTab("unread")}>Unread</button>
                </div>
                <div className="vt-notif-list">
                  {list.map((n) =>
                  <div key={n.id} className={`vt-notif ${n.unread ? "" : "read"}`}>
                      <span className="vt-notif-ico"><Icon name="chatDot" size={18} /></span>
                      <div><p>{n.text}</p><time>Date: {n.date}</time></div>
                    </div>
                  )}
                </div>
                <button type="button" className="vt-notif-foot">See all</button>
              </div>
              }
          </div>
          <div className="vt-menu-wrap">
            <button type="button" className="vt-abtn" onClick={() => toggle("user")} aria-haspopup="true" aria-expanded={menu === "user"} aria-label="Account">
              <span className="vt-avatar">AD</span>
            </button>
            {menu === "user" &&
              <div className="vt-menu" role="menu">
                <a role="menuitem" className="vt-mitem" href="Profile Settings.html"><Icon name="settings" size={16} /><span>Settings</span></a>
                <button type="button" role="menuitem" className="vt-mitem"><Icon name="power" size={16} /><span>Logout</span></button>
              </div>
              }
          </div>
        </div>
      </div>
    </header>);

  };

  // ─── RIGHT PANEL (helper / AI) ──────────────────────────────────────────────
  const HelperPanel = () =>
  <div className="vt-helper">
    <div className="vt-helper-badge"><Icon name="sparkle" size={26} /></div>
    <h2>Helper home</h2>
    <p>Get contextual and intelligent help directly from the side panel, with next-step guidance, an AI assistant, and guides to explore and use VisionsTrust with ease.</p>
    <h3>What would you like to accomplish today?</h3>
    <div className="vt-pills">
      {HELPER_ACTIONS.map((a) => <button key={a} type="button" className="vt-pill"><Icon name="plus" size={15} />{a}</button>)}
    </div>
  </div>;


  const AIPanel = () =>
  <div className="vt-ai">
    <div className="vt-ai-head">
      <span style={{ color: "var(--vt-navy)" }}><Icon name="sparkle" size={34} /></span>
      <h2>Let's get started with Assistant AI</h2>
    </div>
    <p className="vt-ai-msg">Hello! I'm your dataspace assistant. How can I help you today? Whether you have questions about our platform, need help with forms, or want to find data providers, I'm here to make things easier for you.</p>
    {AI_PROMPTS.map((p) =>
    <button key={p} type="button" className="vt-prompt"><span>{p}</span><Icon name="arrowRight" size={16} /></button>
    )}
    <div className="vt-composer">
      <textarea rows="2" placeholder="Type your message here or pick from the prompts" aria-label="Message" />
      <button type="button" className="vt-send" aria-label="Send"><Icon name="send" size={17} /></button>
    </div>
  </div>;


  const RightSide = ({ panel, setPanel, last, setLast }) => {
    const open = !!panel;
    return (
      <div className="vt-right">
      <div className="vt-panel-wrap">
        <div className="vt-panel-top" />
        <div className="vt-panel">{panel === "ai" ? <AIPanel /> : <HelperPanel />}</div>
      </div>
      <div className="vt-rail">
        <div className="vt-rail-top">
          <button type="button" className="vt-tab" onClick={() => setPanel(open ? null : last)} aria-label={open ? "Collapse side panel" : "Expand side panel"} aria-expanded={open}>
            <Icon name={open ? "collapseLeft" : "collapseRight"} size={19} />
          </button>
        </div>
        <button type="button" className={`vt-tab ${panel === "helper" ? "active" : ""}`} onClick={() => {setPanel(panel === "helper" ? null : "helper");setLast("helper");}} aria-label="Helper home" aria-pressed={panel === "helper"}>
          <Icon name="sparkle" size={19} />
        </button>
        <button type="button" className={`vt-tab ${panel === "ai" ? "active" : ""}`} onClick={() => {setPanel(panel === "ai" ? null : "ai");setLast("ai");}} aria-label="AI assistant" aria-pressed={panel === "ai"}>
          <Icon name="chatDot" size={19} />
        </button>
      </div>
    </div>);

  };

  // ─── SHELL ──────────────────────────────────────────────────────────────────
  const AppLayout = ({
    title = "Welcome", activeId = "home", nav = VT_NAV, cartCount = 2, cartHref = null,
    notifications = VT_NOTIFICATIONS, defaultPanel = null, defaultSideCollapsed = false,
    actions = null, className = "", children
  }) => {
    const [panel, setPanel] = useState(defaultPanel);
    const [last, setLast] = useState(defaultPanel || "helper");
    const [sideCollapsed, setSideCollapsed] = useState(defaultSideCollapsed);
    return (
      <div className={`vt-app ${panel ? "is-panel-open" : ""} ${sideCollapsed ? "is-side-collapsed" : ""} ${className}`}>
      <a className="vt-skip" href="#vt-main">Skip to content</a>
      <Sidebar nav={nav} activeId={activeId} />
      <button type="button" className="vt-scrim" onClick={() => setSideCollapsed(false)} aria-label="Close navigation" tabIndex={sideCollapsed ? 0 : -1} />
      <div className="vt-main">
        <TopBar title={title} onToggleSide={() => setSideCollapsed((c) => !c)} cartCount={cartCount} cartHref={cartHref} notifications={notifications} actions={actions} />
        <main className="vt-content" id="vt-main">{children}</main>
      </div>
      <RightSide panel={panel} setPanel={setPanel} last={last} setLast={setLast} />
    </div>);

  };

  window.VTLayout = { AppLayout, Sidebar, TopBar, HelperPanel, AIPanel, Icon, BrandMark, VT_NAV, VT_NOTIFICATIONS };
})();