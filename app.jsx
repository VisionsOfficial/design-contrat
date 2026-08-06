// VisionsTrust — Settings refonte
(function() {
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ─── ICONS (inline SVG, stroke style matching screenshots) ──────────────────
const Icon = ({ name, size = 18, className = "" }) => {
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></>,
    catalogue: <><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/></>,
    offers: <><path d="M4 7h16M4 12h16M4 17h10"/></>,
    resources: <><path d="M4 7h16M4 12h16M4 17h10"/></>,
    projects: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
    contracts: <><path d="M7 3h8l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/><path d="M8 13h8M8 17h5"/></>,
    ai: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/><circle cx="12" cy="12" r="3"/></>,
    triggers: <><path d="M7 4v5H3"/><path d="M3 9a9 9 0 0 1 15-4l3 3"/><path d="M17 20v-5h4"/><path d="M21 15a9 9 0 0 1-15 4l-3-3"/></>,
    tech: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    visibility: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
    team: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.8"/><path d="M16 14a5 5 0 0 1 5.5 5"/></>,
    billing: <><rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19M6 15h3"/></>,
    endpoints: <><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8.5 6H15.5M8.5 18H15.5M6 8.5V15.5M18 8.5V15.5"/></>,
    api: <><path d="M15.5 3.5a3.5 3.5 0 1 1-5 5L4 15v5h5l6.5-6.5a3.5 3.5 0 0 1 0-5z"/></>,
    pdc: <><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><circle cx="7" cy="7" r="0.8" fill="currentColor"/><circle cx="7" cy="17" r="0.8" fill="currentColor"/></>,
    webhook: <><path d="M14 8a4 4 0 1 0-6.5 3.1L4 18M16 14a4 4 0 1 0-3.5-6L8 14M9 19a4 4 0 1 0 4-7l4-3"/></>,
    auth: <><path d="M5 11h14v9H5z"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.5 20a1.5 1.5 0 0 0 3 0"/></>,
    sliders: <><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h14M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></>,
    logs: <><path d="M4 4h16v16H4z"/><path d="M7 8h10M7 12h10M7 16h6"/></>,
    danger: <><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.5"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7M12 17v.5"/></>,
    translate: <><path d="M3 5h12M9 3v2M5 5a10 10 0 0 0 8 10M11 9a10 10 0 0 1-8 10M14 21l4-9 4 9M15.5 17.5h5"/></>,
    chevronDown: <><path d="m6 9 6 6 6-6"/></>,
    chevronUp: <><path d="m6 15 6-6 6 6"/></>,
    chevronRight: <><path d="m9 6 6 6-6 6"/></>,
    chevronLeft: <><path d="m15 6-6 6 6 6"/></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M3 3l18 18"/><path d="M10.5 6.2A10 10 0 0 1 22 12c-.7 1.2-1.6 2.4-2.7 3.3M6.5 6.5A12 12 0 0 0 2 12s3.5 7 10 7c1.5 0 2.9-.3 4.2-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 4 5v9A1.5 1.5 0 0 0 5.5 15.5H8"/></>,
    check: <><path d="m5 12 5 5L20 7"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    x: <><path d="M6 6l12 12M18 6 6 18"/></>,
    upload: <><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></>,
    refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></>,
    key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l2 2M14 9l2 2"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 8v.5M12 11v5"/></>,
    panelLeft: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
    drag: <><circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/></>,
    download: <><path d="M12 4v12M6 14l6 6 6-6M4 20h16"/></>,
    external: <><path d="M14 4h6v6M20 4l-9 9M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></>,
    shield: <><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6z"/></>,
    sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
    chat: <><path d="M4 5h16v11H8l-4 4z"/></>,
    plusBig: <><path d="M12 4v16M4 12h16"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
    bookmark: <><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4.5L5 20V5a1 1 0 0 1 1-1z"/></>,
    bookmarkFill: <><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4.5L5 20V5a1 1 0 0 1 1-1z" fill="currentColor"/></>,
    share: <><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="m8.3 10.8 7.4-3.6M8.3 13.2l7.4 3.6"/></>,
    building: <><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M14 9h4a2 2 0 0 1 2 2v10"/><path d="M3 21h18M8 7h2M8 11h2M8 15h2"/></>,
    filter: <><path d="M3 5h18M6 12h12M10 19h4"/></>,
    arrowRight: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5M3 18l9 5 9-5" opacity=".5"/></>,
    star: <><path d="m12 3 2.6 5.6L21 9.3l-4.5 4.2 1.1 6.1L12 16.8 6.4 19.6l1.1-6.1L3 9.3l6.4-.7z"/></>,
    more: <><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></>,
    edit: <><path d="M4 20h4l10-10a2 2 0 0 0-2.8-2.8L5 17.2z"/><path d="M13.5 6.5l4 4"/></>,
    trash: <><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></>,
    archive: <><rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/></>,
    chart: <><path d="M4 20V4M4 20h16"/><path d="M7 16l4-5 3 3 5-7"/></>,
    coin: <><circle cx="12" cy="12" r="9"/><path d="M14.5 9.2a2.7 2.7 0 0 0-2.5-1.4c-1.5 0-2.6.8-2.6 2 0 2.7 5.4 1.4 5.4 4.2 0 1.2-1.2 2-2.8 2a2.9 2.9 0 0 1-2.7-1.5M12 6.4v1.4M12 16.2v1.4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    doc: <><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M13 3v6h6M9 14h6M9 17h4"/></>,
    inbox: <><path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></>,
    pen: <><path d="M3 21s3.5-1 6-3.5C11.5 15 20 6.5 20 6.5a2.1 2.1 0 0 0-3-3S8.5 12 6 14.5C3.5 17 3 21 3 21z"/><path d="M15 5l3 3"/></>,
    signature: <><path d="M3 17c2-6 3.5-6 4.5-1S9 20 10.5 15 13 6 14 12s2 5 3.5 2"/><path d="M19 19h2"/></>,
    hourglass: <><path d="M6 3h12M6 21h12M7 3c0 4 3 5.5 5 7 2-1.5 5-3 5-7M7 21c0-4 3-5.5 5-7 2 1.5 5 3 5 7"/></>,
    cart: <><circle cx="9" cy="20" r="1.4" fill="currentColor"/><circle cx="17" cy="20" r="1.4" fill="currentColor"/><path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.2L21 8H6"/></>,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1" fill="currentColor"/></>,
    scale: <><path d="M12 3v18M7 8h10M5 8l-2.5 6a3 3 0 0 0 5 0L5 8zM19 8l-2.5 6a3 3 0 0 0 5 0L19 8zM8 21h8"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

// ─── SETTINGS NAVIGATION CONFIG ─────────────────────────────────────────────
const SETTINGS_NAV = [
  {
    group: "Organisation",
    items: [
      { id: "account",      label: "Account",       icon: "user",       desc: "Identity, logo, links" },
      { id: "visibility",   label: "Visibility",    icon: "visibility", desc: "Who can find you" },
      { id: "team",         label: "Team & access", icon: "team",       desc: "Members, roles, invites", badge: "3" },
      { id: "billing",      label: "Billing & plan", icon: "billing",   desc: "Subscription, invoices" },
    ],
  },
  {
    group: "Technical",
    items: [
      { id: "endpoints",    label: "Endpoints",     icon: "endpoints",  desc: "URLs your connector exposes" },
      { id: "api",          label: "API keys",      icon: "api",        desc: "Service & secret credentials" },
      { id: "pdc",          label: "PDC",           icon: "pdc",        desc: "Personal Data Connector",  badge: "Beta" },
      { id: "webhooks",     label: "Webhooks",      icon: "webhook",    desc: "Outbound event hooks" },
    ],
  },
  {
    group: "Personal",
    items: [
      { id: "baseline",       label: "Acceptance baseline", icon: "scale", desc: "Terms you accept from providers" },
      { id: "authentication", label: "Authentication", icon: "auth",  desc: "Password & 2FA" },
      { id: "notifications",  label: "Notifications",  icon: "bell",  desc: "Email & in-app alerts" },
      { id: "preferences",    label: "Preferences",    icon: "sliders", desc: "Language, timezone, theme" },
    ],
  },
  {
    group: "System",
    items: [
      { id: "logs",          label: "Audit logs",   icon: "logs",       desc: "Activity & security events" },
      { id: "danger",        label: "Danger zone",  icon: "danger",     desc: "Transfer or delete org", danger: true },
    ],
  },
];

const FLAT_NAV = SETTINGS_NAV.flatMap(g => g.items.map(i => ({ ...i, group: g.group })));

// ─── MAIN APP SHELL (left rail copied from screenshots) ─────────────────────
const APP_NAV = [
  { id: "home", label: "Home", icon: "home" },
  { id: "catalogue", label: "Catalogue", icon: "catalogue" },
  { id: "offers", label: "My Offers", icon: "offers" },
  { id: "myprojects", label: "My Projects", icon: "projects" },
  { id: "contracts", label: "My Contracts", icon: "contracts" },
  { id: "aiassistant", label: "My AI Assistant", icon: "ai" },
  { id: "exch", label: "Exchange Triggers", icon: "triggers" },
  { id: "techspace", label: "My Tech Space", icon: "tech" },
];

// Flat list including children — used by V2 compact rail and the mobile bottom nav
const FLAT_APP_NAV = APP_NAV.flatMap(it => it.children ? [it, ...it.children] : [it]);

// Cross-page links for the main rail (demo navigation)
const NAV_LINKS = { catalogue: "Catalogue.html", offers: "My Offers.html", myprojects: "My Projects.html", contracts: "My Contracts.html" };

const BrandMark = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
    <circle cx="12" cy="12" r="11" fill="#08ffad"/>
    <path d="M7 8.5 12 17l5-8.5" stroke="#17243f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const APP_NAV_WIDE = [
  { id: "home", label: "Home", icon: "home" },
  { id: "catalogue", label: "Catalogue", icon: "catalogue" },
  { id: "offers", label: "My Offers", icon: "doc", children: [
    { id: "offers-home", label: "Home", icon: "doc" },
    { id: "offers-all", label: "All", icon: "doc" },
    { id: "offers-data", label: "Data", icon: "doc" },
    { id: "offers-services", label: "Services", icon: "tech" },
    { id: "offers-infra", label: "Infrastructure", icon: "building" },
    { id: "offers-archived", label: "Archived", icon: "archive" },
    { id: "offers-resources", label: "My Resources", icon: "share" },
  ] },
  { id: "myprojects", label: "My Projects", icon: "folder", children: [
    { id: "proj-home", label: "Home", icon: "folder" },
    { id: "proj-all", label: "All", icon: "folder" },
    { id: "proj-initiated", label: "Initiated", icon: "plusBig" },
    { id: "proj-joined", label: "Joined", icon: "layers" },
    { id: "proj-pending", label: "Pending", icon: "clock" },
    { id: "proj-archived", label: "Archived", icon: "archive" },
  ] },
  { id: "contracts", label: "My Contracts", icon: "contracts" },
  { id: "dashboard", label: "My Dashboard", icon: "chart" },
  { id: "exch", label: "Exchange Triggers", icon: "triggers" },
  { id: "techspace", label: "My Tech Space", icon: "tech" },
];

const AppSidebar = ({ collapsed, variant = "classic", activeId = "settings" }) => {
  const [openGroups, setOpenGroups] = useState({ offers: true, myprojects: true });
  const toggleGroup = (id) => setOpenGroups((s) => ({ ...s, [id]: !s[id] }));
  if (variant === "wide") {
    return (
      <aside className="app-sidebar wide">
        <div className="aswide-brand">
          <div className="brand-logo"><BrandMark/></div>
          <span className="aswide-name">VisionsTrust</span>
        </div>
        <nav className="aswide-nav">
          {APP_NAV_WIDE.map((item) => (
            <React.Fragment key={item.id}>
              {item.children ? (
                <>
                  <button type="button" className={`aswide-item group ${item.id === activeId ? "active" : ""}`} onClick={() => toggleGroup(item.id)} aria-expanded={!!openGroups[item.id]}>
                    <Icon name={item.icon} size={18}/>
                    <span>{item.label}</span>
                    <Icon name={openGroups[item.id] ? "chevronUp" : "chevronDown"} size={14} className="aswide-chev"/>
                  </button>
                  {openGroups[item.id] && (
                    <div className="aswide-children">
                      {item.children.map((c) => (
                        <a key={c.id} className={`aswide-item child ${c.id === activeId ? "active" : ""}`} href="#">
                          <Icon name={c.icon} size={16}/>
                          <span>{c.label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <a className={`aswide-item ${item.id === activeId ? "active" : ""}`} href="#">
                  <Icon name={item.icon} size={18}/>
                  <span>{item.label}</span>
                </a>
              )}
            </React.Fragment>
          ))}
        </nav>
      </aside>
    );
  }
  if (variant === "v2") {
    return (
      <aside className="app-sidebar v2">
        <div className="app-brand">
          <div className="brand-logo"><BrandMark/></div>
        </div>
        <nav className="app-nav" aria-label="Main">
          {FLAT_APP_NAV.map(item => (
            <a key={item.id} className={`app-nav-item ${item.id === activeId ? "active" : ""} ${APP_NAV.find(n => n.id === item.id) ? "" : "is-child"}`} href={NAV_LINKS[item.id] || "#"} aria-current={item.id === activeId ? "page" : undefined} title={item.label}>
              <Icon name={item.icon} size={20}/>
              <span className="tile-label">{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="app-sidebar-foot">
          <a className="rail-tile" href="Profile Settings.html" title="Account">
            <div className="rail-avatar">A</div>
            <span className="tile-label">Me</span>
          </a>
        </div>
      </aside>
    );
  }
  // classic
  return (
    <aside className={`app-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="app-brand">
        <div className="brand-logo"><BrandMark/></div>
        {!collapsed && <span className="brand-name">VisionsTrust</span>}
      </div>
      <nav className="app-nav">
        {APP_NAV.map(item => (
          <React.Fragment key={item.id}>
            <a className="app-nav-item" href="#">
              <Icon name={item.icon} size={18}/>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.children && <Icon name={item.expanded ? "chevronUp" : "chevronDown"} size={14} className="chev"/>}
            </a>
            {!collapsed && item.children && item.expanded && item.children.map(c => (
              <a key={c.id} className="app-nav-item child" href="#">
                <Icon name={c.icon} size={16}/>
                <span>{c.label}</span>
              </a>
            ))}
          </React.Fragment>
        ))}
      </nav>
    </aside>
  );
};

// ─── BOTTOM NAV (mobile, V2 only) ────────────────────────────────────────────
const BottomNav = ({ onOpenMore }) => {
  const primary = FLAT_APP_NAV.slice(0, 4);
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {primary.map(item => (
        <a key={item.id} className="bottom-nav-item" href="#">
          <Icon name={item.icon} size={20}/>
          <span>{item.label}</span>
        </a>
      ))}
      <button type="button" className="bottom-nav-item more" onClick={onOpenMore} aria-haspopup="dialog">
        <Icon name="catalogue" size={20}/>
        <span>More</span>
      </button>
    </nav>
  );
};

const BottomNavSheet = ({ open, onClose }) => {
  if (!open) return null;
  const rest = FLAT_APP_NAV.slice(4);
  return (
    <div className="bottom-sheet-backdrop" onClick={onClose}>
      <div className="bottom-sheet" role="dialog" aria-modal="true" aria-label="Navigate to" onClick={e => e.stopPropagation()}>
        <div className="bottom-sheet-grab" aria-hidden="true"/>
        <div className="bottom-sheet-title">Navigate to…</div>
        <div className="bottom-sheet-grid">
          {rest.map(item => (
            <a key={item.id} className="bottom-sheet-item" href="#" onClick={onClose}>
              <Icon name={item.icon} size={22}/>
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── TOP BAR ─────────────────────────────────────────────────────────────────
const TopBar = ({ onToggleSidebar, onOpenSearch, onOpenNav, uiV2, onToggleUI }) => (
  <header className="topbar">
    <div className="topbar-left">
      <button type="button" className="icon-btn ghost only-mobile" onClick={onOpenNav} aria-label="Open settings menu">
        <Icon name="catalogue" size={18}/>
      </button>
      {!uiV2 && (
        <button type="button" className="icon-btn ghost hide-mobile" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <Icon name="panelLeft" size={20}/>
        </button>
      )}
      <div className="page-title">
        <Icon name="user" size={20}/>
        <h1>Profile settings</h1>
      </div>
    </div>
    <div className="topbar-right">
      <button type="button" className="ui-toggle" onClick={onToggleUI} role="switch" aria-checked={uiV2} aria-label="Switch UI mode">
        <Icon name="sparkle" size={14}/>
        <span>New UI</span>
        <span className={`ui-toggle-switch ${uiV2 ? "on" : ""}`} aria-hidden="true"><span className="ui-toggle-thumb"/></span>
      </button>
      <button type="button" className="topbar-search hide-mobile" onClick={onOpenSearch}>
        <Icon name="search" size={16}/>
        <span>Search settings…</span>
        <kbd>⌘K</kbd>
      </button>
      <button type="button" className="icon-btn ghost only-mobile" onClick={onOpenSearch} aria-label="Search">
        <Icon name="search" size={18}/>
      </button>
      <button type="button" className="icon-btn ghost hide-mobile" aria-label="Language"><Icon name="translate" size={18}/></button>
      <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16}/><span>Help</span></button>
      <button type="button" className="icon-btn ghost notif" aria-label="Notifications, 90 unread">
        <Icon name="bell" size={18}/>
        <span className="notif-dot" aria-hidden="true">90</span>
      </button>
      <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18}/></button>
    </div>
  </header>
);

// ─── SETTINGS LEFT NAV (the new pattern) ─────────────────────────────────────
const SNAV_TABS = [
  { id: "settings", icon: "sliders", label: "Settings" },
  { id: "helper",   icon: "sparkle",  label: "Helper" },
  { id: "ai",       icon: "chat",     label: "AI" },
];

const SettingsNav = ({ active, onSelect, onOpenSearch, collapsed, onToggleCollapse, primaryAction, view = "settings", onViewChange, helperContent, aiContent }) => {
  const showTabs = !!onViewChange;
  const onTabKey = (e) => {
    const idx = SNAV_TABS.findIndex(t => t.id === view);
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % SNAV_TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + SNAV_TABS.length) % SNAV_TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = SNAV_TABS.length - 1;
    if (next !== null) {
      e.preventDefault();
      const id = SNAV_TABS[next].id;
      onViewChange(id);
      const el = e.currentTarget.querySelector(`[data-tab-id="${id}"]`);
      if (el) el.focus();
    }
  };
  return (
    <nav className={`settings-nav ${collapsed ? "is-collapsed" : ""} view-${view}`} aria-label="Settings tools">
      <div className="settings-nav-header">
        <div className="snav-title-row">
          <div className="snav-title">
            <Icon name={SNAV_TABS.find(t => t.id === view)?.icon || "sliders"} size={16}/>
            {!collapsed && <span>{SNAV_TABS.find(t => t.id === view)?.label || "Settings"}</span>}
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              className="snav-collapse-btn"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={14}/>
            </button>
          )}
        </div>

        {showTabs && !collapsed && (
          <div className="snav-tabs" role="tablist" aria-label="Sidebar mode" onKeyDown={onTabKey}>
            {SNAV_TABS.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`snav-tab-${t.id}`}
                data-tab-id={t.id}
                aria-selected={view === t.id}
                aria-controls="snav-tabpanel"
                tabIndex={view === t.id ? 0 : -1}
                className={`snav-tab ${view === t.id ? "active" : ""}`}
                onClick={() => onViewChange(t.id)}
              >
                <Icon name={t.icon} size={13}/>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        )}
        {showTabs && collapsed && (
          <div className="snav-tabs-vertical" role="tablist" aria-label="Sidebar mode" onKeyDown={onTabKey}>
            {SNAV_TABS.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`snav-tab-${t.id}`}
                data-tab-id={t.id}
                aria-selected={view === t.id}
                aria-controls="snav-tabpanel"
                tabIndex={view === t.id ? 0 : -1}
                aria-label={t.label}
                className={`snav-tab-icon ${view === t.id ? "active" : ""}`}
                onClick={() => onViewChange(t.id)}
              >
                <Icon name={t.icon} size={14}/>
              </button>
            ))}
          </div>
        )}

        {view === "settings" && !collapsed && (
          <div className="org-chip">
            <div className="org-avatar">A</div>
            <div className="org-meta">
              <div className="org-name">anthony_data_provider</div>
              <div className="org-role">Owner · Provider</div>
            </div>
          </div>
        )}
        {view === "settings" && primaryAction && (
          collapsed
            ? <button type="button" className="snav-primary-icon" onClick={primaryAction.onClick} aria-label={primaryAction.label} disabled={primaryAction.disabled}>
                <Icon name={primaryAction.icon || "plus"} size={16}/>
              </button>
            : <button type="button" className="snav-primary" onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
                <Icon name={primaryAction.icon || "plus"} size={14}/>
                <span>{primaryAction.label}</span>
              </button>
        )}
        {view === "settings" && !collapsed && (
          <button type="button" className="settings-search" onClick={onOpenSearch}>
            <Icon name="search" size={14}/>
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>
        )}
        {view === "settings" && collapsed && (
          <button type="button" className="snav-icon-btn" onClick={onOpenSearch} aria-label="Search">
            <Icon name="search" size={14}/>
          </button>
        )}
      </div>

      <div className="settings-nav-scroll" id="snav-tabpanel" role={showTabs ? "tabpanel" : undefined} aria-labelledby={showTabs ? `snav-tab-${view}` : undefined} tabIndex={showTabs ? 0 : undefined}>
        {view === "settings" && SETTINGS_NAV.map(group => (
          <div className="nav-group" key={group.group}>
            {!collapsed && <div className="nav-group-label">{group.group}</div>}
            {collapsed && <div className="nav-group-divider" aria-hidden="true"/>}
            {group.items.map(item => (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${active === item.id ? "active" : ""} ${item.danger ? "danger" : ""}`}
                onClick={() => onSelect(item.id)}
                aria-current={active === item.id ? "true" : undefined}
                aria-label={collapsed ? item.label : undefined}
              >
                <Icon name={item.icon} size={16}/>
                {!collapsed && <span className="nav-item-label">{item.label}</span>}
                {!collapsed && item.badge && <span className={`nav-badge ${item.badge === "Beta" ? "beta" : ""}`}>{item.badge}</span>}
                {collapsed && item.badge && <span className="nav-badge-dot" aria-hidden="true"/>}
              </button>
            ))}
          </div>
        ))}
        {view === "helper" && !collapsed && helperContent}
        {view === "ai" && !collapsed && aiContent}
        {view !== "settings" && collapsed && (
          <button type="button" className="snav-expand-hint" onClick={onToggleCollapse} aria-label="Expand to view">
            <Icon name="chevronRight" size={14}/>
          </button>
        )}
      </div>

      {view === "settings" && !collapsed && (
        <div className="settings-nav-footer">
          <a href="#" className="footer-link"><Icon name="external" size={14}/> Documentation</a>
          <a href="#" className="footer-link"><Icon name="chat" size={14}/> Contact support</a>
        </div>
      )}
    </nav>
  );
};

// ─── ATOMS ───────────────────────────────────────────────────────────────────
const SectionHeader = ({ title, desc, action }) => (
  <div className="section-header">
    <div>
      <h2>{title}</h2>
      {desc && <p>{desc}</p>}
    </div>
    {action}
  </div>
);

const Card = ({ title, desc, children, action, danger }) => (
  <div className={`card ${danger ? "danger" : ""}`}>
    {(title || action) && (
      <div className="card-head">
        <div>
          {title && <h3>{title}</h3>}
          {desc && <p>{desc}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="card-body">{children}</div>
  </div>
);

const Field = ({ label, hint, required, children, error }) => (
  <label className="field">
    <span className="field-label">
      {label}{required && <em>*</em>}
      {hint && <span className="field-hint">{hint}</span>}
    </span>
    {children}
    {error && <span className="field-error">{error}</span>}
  </label>
);

const Input = (props) => <input className="input" {...props}/>;
const Textarea = (props) => <textarea className="textarea" {...props}/>;
const Select = ({ children, ...p }) => (
  <div className="select-wrap">
    <select className="input select" {...p}>{children}</select>
    <Icon name="chevronDown" size={14} className="select-chev"/>
  </div>
);
const Toggle = ({ checked, onChange, label, desc }) => (
  <label className="toggle-row">
    <div>
      <div className="toggle-label">{label}</div>
      {desc && <div className="toggle-desc">{desc}</div>}
    </div>
    <button type="button" className={`toggle ${checked ? "on" : ""}`} onClick={() => onChange(!checked)} aria-pressed={checked}>
      <span className="toggle-thumb"/>
    </button>
  </label>
);
const Btn = ({ variant = "primary", icon, children, ...p }) => (
  <button className={`btn btn-${variant}`} {...p}>
    {icon && <Icon name={icon} size={14}/>}
    {children}
  </button>
);
const Pill = ({ children, tone = "default" }) => <span className={`pill pill-${tone}`}>{children}</span>;

// Password field with reveal
const PasswordField = ({ value, onChange, placeholder }) => {
  const [shown, setShown] = useState(false);
  return (
    <div className="input-with-action">
      <input className="input" type={shown ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder}/>
      <button type="button" className="input-action" onClick={() => setShown(s => !s)}>
        <Icon name={shown ? "eyeOff" : "eye"} size={16}/>
      </button>
    </div>
  );
};

// Copyable readonly
const CopyField = ({ value, masked }) => {
  const [show, setShow] = useState(!masked);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="input-with-action copy-field">
      <input className="input mono" type="text" readOnly value={show ? value : "•".repeat(Math.min(value.length, 64))}/>
      {masked && (
        <button type="button" className="input-action" onClick={() => setShow(s => !s)}>
          <Icon name={show ? "eyeOff" : "eye"} size={16}/>
          <span>{show ? "Hide" : "Display"}</span>
        </button>
      )}
      <button type="button" className="input-action" onClick={copy}>
        <Icon name={copied ? "check" : "copy"} size={16}/>
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
};

window.UI = { Icon, Card, Field, Input, Textarea, Select, Toggle, Btn, Pill, SectionHeader, PasswordField, CopyField, SETTINGS_NAV, FLAT_NAV, APP_NAV, FLAT_APP_NAV, AppSidebar, TopBar, SettingsNav, BottomNav, BottomNavSheet };
})();
