// VisionsTrust — Notification Center (V2 UX). Full page + bell dropdown.
(function () {
  const { useState, useMemo, useEffect, useRef } = React;
  const { Icon, AppSidebar, BottomNav, BottomNavSheet } = window.UI;
  const { NOW, TYPE_META, CATEGORIES, NOTIFS } = window.NotifData;

  // ─── helpers ──────────────────────────────────────────────────────────────
  const DAY = 86400000;
  const relTime = (iso) => {
    const t = new Date(iso), diff = NOW - t;
    if (diff < 3600000) return Math.max(1, Math.round(diff / 60000)) + "m ago";
    if (t.toDateString() === NOW.toDateString()) return Math.round(diff / 3600000) + "h ago";
    const days = Math.floor(diff / DAY);
    if (days <= 1) return "Yesterday";
    if (days < 7) return days + "d ago";
    return t.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };
  const fullDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const GROUP_ORDER = ["Today", "Yesterday", "This week", "Earlier this month", "Older"];
  const timeGroup = (iso) => {
    const t = new Date(iso), days = Math.floor((NOW - t) / DAY);
    if (t.toDateString() === NOW.toDateString()) return "Today";
    if (days <= 1) return "Yesterday";
    if (days < 7) return "This week";
    if (t.getMonth() === NOW.getMonth() && t.getFullYear() === NOW.getFullYear()) return "Earlier this month";
    return "Older";
  };

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "grouping": "smart",
    "density": "comfortable",
    "iconStyle": "colored",
    "showCategoryLabels": true
  }/*EDITMODE-END*/;

  // ─── toast ──────────────────────────────────────────────────────────────
  function useToast() {
    const [msg, setMsg] = useState(null);
    const ref = useRef(null);
    const toast = (m) => { setMsg(m); clearTimeout(ref.current); ref.current = setTimeout(() => setMsg(null), 2600); };
    const node = msg ? (
      <div className="save-bar" role="status" style={{ background: "var(--vui-color-secondary)" }}>
        <Icon name="check" size={16} className="" />
        <span className="save-bar-msg">{msg}</span>
      </div>
    ) : null;
    return [node, toast];
  }

  // ─── kebab menu ─────────────────────────────────────────────────────────
  function ItemMenu({ n, onRead, onArchive, onMute, muted, onClose }) {
    const ref = useRef(null);
    useEffect(() => {
      const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, []);
    return (
      <div className="nc-menu" ref={ref} role="menu">
        <button type="button" role="menuitem" onClick={() => { onRead(n.id); onClose(); }}>
          <Icon name={n.read ? "bell" : "check"} size={15} /> Mark as {n.read ? "unread" : "read"}
        </button>
        <button type="button" role="menuitem" onClick={() => { onMute(n.type); onClose(); }}>
          <Icon name="bell" size={15} /> {muted ? "Unmute" : "Mute"} {TYPE_META[n.type].label.toLowerCase()}s
        </button>
        <div className="menu-sep" />
        <button type="button" role="menuitem" className="danger" onClick={() => { onArchive(n.id); onClose(); }}>
          <Icon name="archive" size={15} /> Archive
        </button>
      </div>
    );
  }

  // ─── full-page notification item ────────────────────────────────────────
  function NotifItem({ n, t, muted, onAction, onRead, onArchive, onMute, menuId, setMenuId }) {
    const m = TYPE_META[n.type];
    const urgent = n.type === "contract_sign";
    const menuOpen = menuId === n.id;
    return (
      <div className={`nc-item ${m.cls} ${!n.read ? "unread" : ""} ${n.done ? "is-done" : ""} ${muted ? "muted" : ""}`}>
        <div className="nc-ic"><Icon name={m.icon} size={20} /></div>
        <div className="nc-body">
          <div className="nc-meta-row">
            {t.showCategoryLabels && <span className="nc-cat"><Icon name={m.icon} size={11} />{m.label}</span>}
            <span className="nc-actor">{n.actor}</span>
            <span className="nc-dot-sep" aria-hidden="true" />
            <span className="nc-time" title={fullDate(n.date)}>{relTime(n.date)}</span>
            {muted && <span className="nc-time" style={{ fontStyle: "italic" }}>· muted</span>}
          </div>
          <p className="nc-title">{n.title}</p>
          <p className="nc-text">{n.body}</p>
          {n.context && (
            <span className="nc-ctx"><span className="ctx-kind">{n.context.kind}</span><code>{n.context.name}</code></span>
          )}
        </div>
        <div className="nc-actions">
          <div className="nc-tools">
            {!n.done && (
              <button type="button" className="nc-tool" title={n.read ? "Mark as unread" : "Mark as read"} aria-label={n.read ? "Mark as unread" : "Mark as read"} onClick={() => onRead(n.id)}>
                <Icon name={n.read ? "bell" : "check"} size={15} />
              </button>
            )}
            <div className="nc-menu-wrap">
              <button type="button" className="nc-tool" aria-label="More options" aria-haspopup="menu" onClick={() => setMenuId(menuOpen ? null : n.id)}>
                <Icon name="more" size={16} />
              </button>
              {menuOpen && <ItemMenu n={n} onRead={onRead} onArchive={onArchive} onMute={onMute} muted={muted} onClose={() => setMenuId(null)} />}
            </div>
          </div>
          {n.done ? (
            <span className="nc-done-badge"><Icon name="check" size={14} /> Handled</span>
          ) : m.actionable && !muted ? (
            <div className="nc-act-btns">
              {m.secondary && <button type="button" className="nc-btn ghost" onClick={() => onAction(n, "secondary")}>{m.secondary.label}</button>}
              <button type="button" className={`nc-btn primary ${urgent ? "urgent" : ""}`} onClick={() => onAction(n, "primary")}>
                {m.primary.icon && <Icon name={m.primary.icon} size={13} />}{m.primary.label}
              </button>
            </div>
          ) : (
            <a className="nc-link" href={m.href} onClick={() => onRead(n.id, true)}>{m.primary.label}<Icon name="chevronRight" size={13} /></a>
          )}
        </div>
      </div>
    );
  }

  // ─── LEFT NAV (categories + mute) ───────────────────────────────────────
  function NotifNav({ counts, active, onSelect, mutedTypes, onToggleMute, collapsed, onToggleCollapse, navOpen }) {
    const muteTypes = ["usage_request", "join_request", "invitation", "offer_published", "contract_sign"];
    return (
      <nav className={`settings-nav ${collapsed ? "is-collapsed" : ""}`} aria-label="Notification filters">
        <div className="settings-nav-header">
          <div className="snav-title-row">
            <div className="snav-title"><Icon name="bell" size={16} />{!collapsed && <span>Notifications</span>}</div>
            {onToggleCollapse && (
              <button type="button" className="snav-collapse-btn" onClick={onToggleCollapse} aria-label={collapsed ? "Expand" : "Collapse"}>
                <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="settings-nav-scroll">
          <div className="nav-group">
            {!collapsed && <div className="nav-group-label">Filter</div>}
            {CATEGORIES.map(c => (
              <button key={c.id} type="button" className={`nav-item ${active === c.id ? "active" : ""}`} onClick={() => onSelect(c.id)} aria-current={active === c.id ? "true" : undefined} aria-label={collapsed ? c.label : undefined}>
                <Icon name={c.icon} size={16} />
                {!collapsed && <span className="nav-item-label">{c.label}</span>}
                {!collapsed && counts[c.id] > 0 && <span className={`nc-nav-count ${c.id === "needs" ? "dot" : ""}`}>{counts[c.id]}</span>}
                {collapsed && counts[c.id] > 0 && <span className="nav-badge-dot" aria-hidden="true" />}
              </button>
            ))}
          </div>
          {!collapsed && (
            <div className="nav-group">
              <div className="nav-group-label">Mute alerts</div>
              <div className="nc-mute">
                {muteTypes.map(ty => {
                  const m = TYPE_META[ty];
                  return (
                    <label key={ty} className={`nc-mute-row ${m.cls}`}>
                      <span className="nc-mute-ic"><Icon name={m.icon} size={14} /></span>
                      <span className="nc-mute-label">{m.label}</span>
                      <button type="button" className={`toggle small ${!mutedTypes.has(ty) ? "on" : ""}`} onClick={() => onToggleMute(ty)} aria-pressed={!mutedTypes.has(ty)} aria-label={`Alerts for ${m.label}`}>
                        <span className="toggle-thumb" />
                      </button>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="settings-nav-footer">
            <a href="Profile Settings.html" className="footer-link"><Icon name="sliders" size={14} /> Notification settings</a>
          </div>
        )}
      </nav>
    );
  }

  // ─── BELL DROPDOWN ──────────────────────────────────────────────────────
  function PopItem({ n, muted, onAction, onOpen }) {
    const m = TYPE_META[n.type];
    const urgent = n.type === "contract_sign";
    return (
      <div className={`nc-pop-item ${m.cls} ${!n.read ? "unread" : ""}`} onClick={() => onOpen(n)} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") onOpen(n); }}>
        <div className="nc-pop-ic"><Icon name={m.icon} size={17} /></div>
        <div className="nc-pop-item-body">
          <div className="pi-meta">
            <span className="pi-cat">{m.label}</span>
            <span className="pi-time">{relTime(n.date)}</span>
          </div>
          <div className="pi-title">{n.title}</div>
          {m.actionable && !n.done && !muted && (
            <div className="pi-actions" onClick={(e) => e.stopPropagation()}>
              <button type="button" className={`pi-btn primary ${urgent ? "urgent" : ""}`} onClick={() => onAction(n, "primary")}>{m.primary.label}</button>
              {m.secondary && <button type="button" className="pi-btn ghost" onClick={() => onAction(n, "secondary")}>{m.secondary.label}</button>}
            </div>
          )}
        </div>
      </div>
    );
  }

  function BellPopover({ notifs, mutedTypes, unread, needs, onClose, onAction, onMarkAll, onOpen }) {
    const [seg, setSeg] = useState("all");
    const visible = notifs.filter(n => !n.archived && !mutedTypes.has(n.type));
    const list = seg === "unread" ? visible.filter(n => !n.read) : visible;
    const needsList = list.filter(n => TYPE_META[n.type].actionable && !n.done).slice(0, 4);
    const restList = list.filter(n => !(TYPE_META[n.type].actionable && !n.done)).slice(0, 6);
    return (
      <>
        <div className="nc-pop-scrim" onClick={onClose} />
        <div className="nc-pop" role="dialog" aria-label="Notifications">
          <div className="nc-pop-head">
            <h3>Notifications</h3>
            {unread > 0 && <span className="pop-badge">{unread}</span>}
            <button type="button" className="pop-mark" onClick={onMarkAll} disabled={unread === 0}>Mark all as read</button>
          </div>
          <div className="nc-pop-seg">
            <button type="button" className={seg === "all" ? "active" : ""} onClick={() => setSeg("all")}>All</button>
            <button type="button" className={seg === "unread" ? "active" : ""} onClick={() => setSeg("unread")}>Unread {unread > 0 && <span className="seg-count">{unread}</span>}</button>
          </div>
          <div className="nc-pop-body">
            {list.length === 0 ? (
              <div className="nc-pop-empty"><span className="pe-ic"><Icon name="check" size={22} /></span>You’re all caught up.</div>
            ) : (
              <>
                {needsList.length > 0 && (
                  <>
                    <div className="nc-pop-section-label"><Icon name="hourglass" size={12} /> Needs your action <span className="pl-count">· {needsList.length}</span></div>
                    {needsList.map(n => <PopItem key={n.id} n={n} muted={mutedTypes.has(n.type)} onAction={onAction} onOpen={onOpen} />)}
                  </>
                )}
                {restList.length > 0 && (
                  <>
                    {needsList.length > 0 && <div className="nc-pop-section-label">Earlier</div>}
                    {restList.map(n => <PopItem key={n.id} n={n} muted={mutedTypes.has(n.type)} onAction={onAction} onOpen={onOpen} />)}
                  </>
                )}
              </>
            )}
          </div>
          <div className="nc-pop-foot"><a href="#" onClick={(e) => { e.preventDefault(); onClose(); }}>See all in Notification center<Icon name="arrowRight" size={15} /></a></div>
        </div>
      </>
    );
  }

  // ─── MAIN APP ───────────────────────────────────────────────────────────
  function NotificationCenter() {
    const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
    const [notifs, setNotifs] = useState(NOTIFS.map(n => ({ ...n })));
    const [category, setCategory] = useState("all");
    const [seg, setSeg] = useState("all");
    const [query, setQuery] = useState("");
    const [mutedTypes, setMutedTypes] = useState(() => new Set());
    const [menuId, setMenuId] = useState(null);
    const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("vt.ncSnav") === "1"; } catch (e) { return false; } });
    const [navOpen, setNavOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [popOpen, setPopOpen] = useState(false);
    const [toastNode, toast] = useToast();

    useEffect(() => { try { localStorage.setItem("vt.ncSnav", collapsed ? "1" : "0"); } catch (e) {} }, [collapsed]);

    const isMuted = (n) => mutedTypes.has(n.type);
    const base = notifs.filter(n => !n.archived);
    const unreadCount = base.filter(n => !n.read && !isMuted(n)).length;
    const needsCount = base.filter(n => TYPE_META[n.type].actionable && !n.done && !isMuted(n)).length;

    // per-category counts (unread, muted-aware) for the left nav
    const counts = useMemo(() => {
      const c = { all: base.filter(n => !n.read && !isMuted(n)).length, needs: needsCount };
      CATEGORIES.forEach(cat => { if (cat.id !== "all" && cat.id !== "needs") c[cat.id] = base.filter(n => n.type === cat.id && !n.read && !isMuted(n)).length; });
      return c;
    }, [notifs, mutedTypes]);

    // ── actions ──
    const markRead = (id, only) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: only ? true : !n.read } : n));
    const markAll = () => { setNotifs(ns => ns.map(n => n.archived ? n : { ...n, read: true })); toast("All notifications marked as read"); };
    const archive = (id) => { setNotifs(ns => ns.map(n => n.id === id ? { ...n, archived: true } : n)); toast("Notification archived"); };
    const doAction = (n, which) => {
      const m = TYPE_META[n.type];
      setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, read: true, done: true } : x));
      const verb = which === "primary" ? m.primary.label : (m.secondary ? m.secondary.label : "Done");
      toast(`${verb} · ${n.actor}`);
    };
    const toggleMute = (ty) => {
      setMutedTypes(s => { const ns = new Set(s); ns.has(ty) ? ns.delete(ty) : ns.add(ty); toast(ns.has(ty) ? `Muted ${TYPE_META[ty].label.toLowerCase()} alerts` : `Unmuted ${TYPE_META[ty].label.toLowerCase()} alerts`); return ns; });
    };

    // ── filtered list ──
    const q = query.trim().toLowerCase();
    const matchQ = (n) => !q || (n.title + " " + n.body + " " + n.actor + " " + (n.context ? n.context.name : "")).toLowerCase().includes(q);
    const filtered = base.filter(n => {
      if (category === "needs") { if (!(TYPE_META[n.type].actionable && !n.done)) return false; }
      else if (category !== "all") { if (n.type !== category) return false; }
      if (seg === "unread" && n.read) return false;
      return matchQ(n);
    });

    const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);
    const showBand = t.grouping === "smart" && category === "all" && seg !== "unread";
    const bandItems = (showBand ? filtered.filter(n => TYPE_META[n.type].actionable && !n.done && !isMuted(n)) : [])
      .sort((a, b) => (TYPE_META[b.type].priority - TYPE_META[a.type].priority) || byDateDesc(a, b));
    const bandIds = new Set(bandItems.map(n => n.id));
    const rest = filtered.filter(n => !bandIds.has(n.id)).sort(byDateDesc);

    // grouping of the rest
    const groups = useMemo(() => {
      if (t.grouping === "category") {
        const order = CATEGORIES.filter(c => c.id !== "all" && c.id !== "needs");
        return order.map(c => ({ key: TYPE_META[c.id].label, items: rest.filter(n => n.type === c.id) })).filter(g => g.items.length);
      }
      const map = {};
      rest.forEach(n => { const k = timeGroup(n.date); (map[k] = map[k] || []).push(n); });
      return GROUP_ORDER.filter(k => map[k]).map(k => ({ key: k, items: map[k] }));
    }, [rest, t.grouping]);

    const totalShown = filtered.length;
    const itemProps = { t, onAction: doAction, onRead: markRead, onArchive: archive, onMute: toggleMute, menuId, setMenuId };

    return (
      <div className={`app ui-v2 notif-app ${t.density === "compact" ? "nc-compact" : ""} ${t.iconStyle === "mono" ? "nc-mono" : ""}`}>
        <a href="#nc-main" className="skip-link">Skip to content</a>
        <AppSidebar variant="v2" activeId="home" />
        <div className="main">
          <header className="topbar nc-topbar">
            <div className="topbar-left">
              <button type="button" className="icon-btn ghost only-mobile" onClick={() => setNavOpen(true)} aria-label="Open filters"><Icon name="filter" size={18} /></button>
              <div className="page-title"><Icon name="bell" size={20} /><h1>Notification center {unreadCount > 0 && <span style={{ color: "var(--text-faint)", fontWeight: 600 }}>({unreadCount})</span>}</h1></div>
            </div>
            <div className="topbar-right">
              <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16} /><span>Help</span></button>
              <button type="button" className={`icon-btn ghost notif ${popOpen ? "open" : ""}`} aria-label={`Notifications, ${unreadCount} unread`} onClick={() => setPopOpen(o => !o)}>
                <Icon name="bell" size={18} />
                {unreadCount > 0 && <span className="notif-dot" aria-hidden="true">{unreadCount}</span>}
              </button>
              <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18} /></button>
            </div>
          </header>

          <div className="page">
            <div className={`settings-nav-wrap ${navOpen ? "open" : ""}`}>
              <NotifNav counts={counts} active={category} onSelect={(id) => { setCategory(id); setNavOpen(false); }} mutedTypes={mutedTypes} onToggleMute={toggleMute} collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} />
              {navOpen && <div className="settings-nav-scrim" onClick={() => setNavOpen(false)} />}
            </div>

            <main className="content nc-content" id="nc-main" tabIndex={-1}>
              <div className="nc-inner">
                <div className="nc-toolbar">
                  <div className="nc-seg" role="tablist" aria-label="Read filter">
                    <button type="button" role="tab" aria-selected={seg === "all"} className={seg === "all" ? "active" : ""} onClick={() => setSeg("all")}>All</button>
                    <button type="button" role="tab" aria-selected={seg === "unread"} className={seg === "unread" ? "active" : ""} onClick={() => setSeg("unread")}>Unread {unreadCount > 0 && <span className="seg-count">{unreadCount}</span>}</button>
                  </div>
                  <div className="nc-toolbar-right">
                    <div className="nc-search">
                      <Icon name="search" size={15} />
                      <input type="text" placeholder="Search notifications…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search notifications" />
                      {query && <button type="button" className="clear-btn" onClick={() => setQuery("")} aria-label="Clear"><Icon name="x" size={13} /></button>}
                    </div>
                    <button type="button" className="nc-markall" onClick={markAll} disabled={unreadCount === 0}><Icon name="check" size={14} /><span className="hide-mobile">Mark all read</span></button>
                  </div>
                </div>

                {totalShown === 0 ? (
                  <div className="nc-empty">
                    <span className="nc-empty-ic"><Icon name={seg === "unread" || category === "needs" ? "check" : "bell"} size={28} /></span>
                    <h3>{seg === "unread" ? "No unread notifications" : category === "needs" ? "Nothing needs your action" : "No notifications found"}</h3>
                    <p>{query ? "Try a different search term." : seg === "unread" ? "You’re all caught up — every notification has been read." : category === "needs" ? "Requests and contracts that need you will appear here." : "New activity across your offers, contracts and use cases will show up here."}</p>
                  </div>
                ) : (
                  <>
                    {bandItems.length > 0 && (
                      <section className="nc-priority" aria-label="Needs your action">
                        <div className="nc-priority-head">
                          <span className="ph-ic"><Icon name="hourglass" size={15} /></span>
                          <h3>Needs your action</h3>
                          <span className="ph-count">{bandItems.length}</span>
                          <span className="ph-spacer" />
                        </div>
                        {bandItems.map(n => <NotifItem key={n.id} n={n} muted={isMuted(n)} {...itemProps} />)}
                      </section>
                    )}
                    {groups.map(g => (
                      <section className="nc-group" key={g.key}>
                        <div className="nc-group-head">
                          <h4>{g.key}</h4>
                          <span className="gh-line" />
                          <span className="gh-count">{g.items.length}</span>
                        </div>
                        <div className="nc-list">
                          {g.items.map(n => <NotifItem key={n.id} n={n} muted={isMuted(n)} {...itemProps} />)}
                        </div>
                      </section>
                    ))}
                  </>
                )}
              </div>
            </main>
          </div>
        </div>

        <BottomNav onOpenMore={() => setMoreOpen(true)} />
        <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
        {popOpen && (
          <BellPopover notifs={notifs} mutedTypes={mutedTypes} unread={unreadCount} needs={needsCount}
            onClose={() => setPopOpen(false)} onAction={doAction} onMarkAll={markAll}
            onOpen={(n) => { markRead(n.id, true); setPopOpen(false); if (n.type) setCategory("all"); }} />
        )}
        {toastNode}

        <window.TweaksPanel>
          <window.TweakSection label="Organisation" />
          <window.TweakRadio label="Grouping" value={t.grouping} options={["smart", "time", "category"]} onChange={v => setTweak("grouping", v)} />
          <window.TweakSection label="Appearance" />
          <window.TweakRadio label="Density" value={t.density} options={["comfortable", "compact"]} onChange={v => setTweak("density", v)} />
          <window.TweakRadio label="Icons" value={t.iconStyle} options={["colored", "mono"]} onChange={v => setTweak("iconStyle", v)} />
          <window.TweakToggle label="Category labels" value={t.showCategoryLabels} onChange={v => setTweak("showCategoryLabels", v)} />
        </window.TweaksPanel>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<NotificationCenter />);
})();
