// VisionsTrust — Home page (dashboard refonte). No carousels.
// Reuses window.UI shell + window.CatData helpers + window.HomeData + tweaks-panel.
(function() {
const { useState } = React;
const { Icon, AppSidebar, BottomNav, BottomNavSheet } = window.UI;
const { accentFor, hexToRgba, initials } = window.CatData;
const { KPIS, INCOMPLETE, PENDING, FITTING, STORIES, NEWS } = window.HomeData;
const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakSlider } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout": "Two columns",
  "density": "Regular",
  "oppCols": "3",
  "pendingCount": 4,
  "highlightRequests": true,
  "showStories": true,
  "showNews": true,
  "showPrometheus": true,
  "showTip": true
}/*EDITMODE-END*/;

const REQ_TINT = { "Offer request": "#00a2ae", "Project invite": "#5b6ef5", "Contract": "#0a8a5c", "Negotiation": "#e8743b" };

// ─── HOME CONTEXTUAL NAV (Overview / Helper / AI) ─────────────────────────────
const NAV_TABS = [
  { id: "overview", icon: "home", label: "Overview" },
  { id: "helper", icon: "sparkle", label: "Helper" },
  { id: "ai", icon: "chat", label: "AI" },
];
const JUMPS = [
  { id: "attention", label: "Needs attention", icon: "inbox", badge: PENDING.length },
  { id: "fitting", label: "Opportunities", icon: "projects" },
  { id: "stories", label: "Success stories", icon: "star" },
];

function jumpTo(id) {
  const el = document.getElementById("sec-" + id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
}

function HelperPanel() {
  const items = ["Publish your first offer", "Finish an incomplete project", "Reply to a pending request", "Connect a source system"];
  return (
    <div className="helper">
      <div className="helper-icon"><Icon name="sparkle" size={22}/></div>
      <h3 className="helper-title">Helper home</h3>
      <p className="helper-desc">Contextual guidance to keep your offers, projects and data exchanges moving.</p>
      <h4 className="helper-subtitle">What would you like to do?</h4>
      <div className="helper-actions">{items.map((t,i)=><button type="button" key={i} className="helper-action"><Icon name="plus" size={14}/><span>{t}</span></button>)}</div>
    </div>
  );
}
function AiPanel() {
  const [msg, setMsg] = useState("");
  const prompts = ["Summarise my pending requests", "Which project fits my offer best?", "Draft a reply to DEMO_DSUC_12"];
  return (
    <div className="ai">
      <div className="helper-icon"><Icon name="sparkle" size={22}/></div>
      <h3 className="helper-title">Home assistant</h3>
      <p className="helper-desc">Ask about your activity, requests, offers or the data space.</p>
      <h4 className="helper-subtitle">Try asking</h4>
      <div className="ai-prompts">{prompts.map((p,i)=><button type="button" key={i} className="ai-prompt" onClick={()=>setMsg(p)}><span>{p}</span><Icon name="chevronRight" size={14}/></button>)}</div>
      <div className="ai-composer">
        <input className="ai-input" aria-label="Ask the home assistant" placeholder="Ask anything…" value={msg} onChange={e=>setMsg(e.target.value)}/>
        <button type="button" className="ai-send" disabled={!msg.trim()} aria-label="Send"><Icon name="chevronRight" size={16}/></button>
      </div>
    </div>
  );
}

function HomeNav({ collapsed, onToggleCollapse, view, onView }) {
  const tab = NAV_TABS.find(t => t.id === view) || NAV_TABS[0];
  const onTabKey = (e) => {
    const idx = NAV_TABS.findIndex(t => t.id === view);
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx+1)%NAV_TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx-1+NAV_TABS.length)%NAV_TABS.length;
    else if (e.key === "Home") next = 0; else if (e.key === "End") next = NAV_TABS.length-1;
    if (next !== null) { e.preventDefault(); const id = NAV_TABS[next].id; onView(id); const el = e.currentTarget.querySelector(`[data-tab-id="${id}"]`); if (el) el.focus(); }
  };
  return (
    <nav className={`settings-nav ${collapsed ? "is-collapsed" : ""} view-${view}`} aria-label="Home tools">
      <div className="settings-nav-header">
        <div className="snav-title-row">
          <div className="snav-title"><Icon name={tab.icon} size={16}/>{!collapsed && <span>{tab.label}</span>}</div>
          {onToggleCollapse && (
            <button type="button" className="snav-collapse-btn" onClick={onToggleCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={14}/>
            </button>
          )}
        </div>
        {!collapsed && (
          <div className="snav-tabs" role="tablist" aria-label="Sidebar mode" onKeyDown={onTabKey}>
            {NAV_TABS.map(t => (
              <button key={t.id} type="button" role="tab" id={`home-tab-${t.id}`} data-tab-id={t.id} aria-selected={view===t.id} aria-controls="home-tabpanel" tabIndex={view===t.id?0:-1} className={`snav-tab ${view===t.id?"active":""}`} onClick={()=>onView(t.id)}>
                <Icon name={t.icon} size={13}/><span>{t.label}</span>
              </button>
            ))}
          </div>
        )}
        {collapsed && (
          <div className="snav-tabs-vertical" role="tablist" aria-label="Sidebar mode" onKeyDown={onTabKey}>
            {NAV_TABS.map(t => (
              <button key={t.id} type="button" role="tab" id={`home-tab-${t.id}`} data-tab-id={t.id} aria-selected={view===t.id} aria-controls="home-tabpanel" tabIndex={view===t.id?0:-1} aria-label={t.label} className={`snav-tab-icon ${view===t.id?"active":""}`} onClick={()=>onView(t.id)}>
                <Icon name={t.icon} size={14}/>
              </button>
            ))}
          </div>
        )}
        {view === "overview" && (
          collapsed
            ? <button type="button" className="snav-primary-icon" onClick={()=>alert("Create new offer — flow would open here.")} aria-label="Create"><Icon name="plus" size={16}/></button>
            : <div className="cat-create"><div className="cat-create-split">
                <button type="button" onClick={()=>alert("New offer — flow would open here.")}><Icon name="plus" size={13}/> New offer</button>
                <button type="button" onClick={()=>alert("New project — flow would open here.")}><Icon name="plus" size={13}/> New project</button>
              </div></div>
        )}
      </div>
      <div className="settings-nav-scroll" id="home-tabpanel" role="tabpanel" aria-labelledby={`home-tab-${view}`} tabIndex={0}>
        {view === "overview" && (
          <div className="nav-group">
            {!collapsed && <div className="nav-group-label">On this page</div>}
            {collapsed && <div className="nav-group-divider" aria-hidden="true"/>}
            {JUMPS.map(j => (
              <button key={j.id} type="button" className="nav-item" onClick={()=>jumpTo(j.id)} aria-label={collapsed ? j.label : undefined}>
                <Icon name={j.icon} size={16}/>
                {!collapsed && <span className="nav-item-label">{j.label}</span>}
                {!collapsed && j.badge ? <span className="nav-badge">{j.badge}</span> : null}
              </button>
            ))}
          </div>
        )}
        {view === "helper" && !collapsed && <HelperPanel/>}
        {view === "ai" && !collapsed && <AiPanel/>}
        {view !== "overview" && collapsed && (
          <button type="button" className="snav-expand-hint" onClick={onToggleCollapse} aria-label="Expand to view"><Icon name="chevronRight" size={14}/></button>
        )}
      </div>
    </nav>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  const [q, setQ] = useState("");
  const chips = [
    { icon: "search", label: "Find data & services" },
    { icon: "projects", label: "Discover projects" },
    { icon: "plus", label: "Publish an offer" },
    { icon: "sparkle", label: "Guide me" },
  ];
  return (
    <section className="home-hero">
      <h1 className="home-hello">Welcome back, Anthony <span className="wave">👋</span></h1>
      <p className="home-sub">Manage your projects, services and data, and build the most innovative usage scenarios thanks to the data space.</p>
      <div className="home-ai" role="search">
        <button type="button" className="home-ai-plus" aria-label="Add a resource to your query"><Icon name="plus" size={20}/></button>
        <label htmlFor="home-ai-input" className="sr-only">Search or describe your need</label>
        <input id="home-ai-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search the catalogue or describe your need…"/>
        <span className="home-ai-hint"><Icon name="sparkle" size={13}/> AI-assisted</span>
        <button type="button" className="home-ai-send" aria-label="Ask the assistant"><Icon name="arrowRight" size={18}/></button>
      </div>
      <div className="home-chips">
        {chips.map((c,i)=><button type="button" key={i} className="home-chip"><Icon name={c.icon} size={14}/>{c.label}</button>)}
      </div>
    </section>
  );
}

// ─── KPI STRIP ─────────────────────────────────────────────────────────────────
function KpiStrip({ highlight }) {
  return (
    <section aria-label="Key metrics">
      <div className="kpi-head">
        <span className="nav-group-label" style={{ padding: 0 }}>Your activity</span>
        <a className="link-arrow" href="#">See dashboard <Icon name="arrowRight" size={15}/></a>
      </div>
      <div className="kpi-strip">
        {KPIS.map(k => (
          <div key={k.id} className={`kpi ${highlight && k.accent ? "is-accent" : ""}`}>
            <div className="kpi-top">
              <div className="kpi-ico"><Icon name={k.icon} size={18}/></div>
              {k.delta && <span className={`kpi-delta ${k.deltaTone}`}>{k.deltaTone==="up" && <Icon name="chart" size={11}/>}{k.delta}</span>}
            </div>
            <div className="kpi-val">{k.value}{k.unit && <span className="unit">{k.unit}</span>}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-hint">{k.hint}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── ATTENTION ZONE ────────────────────────────────────────────────────────────
function IncompleteCard({ it }) {
  return (
    <div className="incomplete-row">
      <div className="ir-top">
        <div className="ir-thumb"><Icon name={it.type==="Project" ? "projects" : "offers"} size={17}/></div>
        <div style={{ minWidth: 0 }}>
          <div className="ir-name">{it.name}</div>
          <div className="ir-type">{it.type} · updated {it.updated}</div>
        </div>
        <div className="ir-pct">{it.progress}%</div>
      </div>
      <div className="ir-bar"><span style={{ width: it.progress + "%" }}/></div>
      <div className="ir-foot">
        <span className="ir-step">Next: <strong>{it.step}</strong></span>
        <button type="button" className="ir-resume">Resume <Icon name="arrowRight" size={13}/></button>
      </div>
    </div>
  );
}

function AttentionZone({ pendingCount }) {
  const shown = PENDING.slice(0, pendingCount);
  return (
    <section id="sec-attention" className="panel">
      <div className="panel-head">
        <div className="ph-title">
          <div className="panel-ico"><Icon name="inbox" size={16}/></div>
          <h2>Needs your attention</h2>
          <span className="ph-count">{PENDING.length + INCOMPLETE.length}</span>
        </div>
        <a className="link-arrow" href="Notification Center.html">View all <Icon name="arrowRight" size={15}/></a>
      </div>
      <div className="panel-body">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "2px 0 10px" }}>
          <span className="nav-group-label" style={{ padding: 0 }}>Finish setting up ({INCOMPLETE.length})</span>
        </div>
        <div className="attn-grid">
          {INCOMPLETE.slice(0, 2).map(it => <IncompleteCard key={it.id} it={it}/>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "18px 0 4px" }}>
          <span className="nav-group-label" style={{ padding: 0 }}>Pending requests ({PENDING.length})</span>
        </div>
        <div className="req-list">
          {shown.map(r => {
            const tint = REQ_TINT[r.kind] || "#17243f";
            return (
              <div className="req-row" key={r.id}>
                <div className="req-av" style={{ background: tint }} aria-hidden="true">{initials(r.org)}</div>
                <div className="req-mid">
                  <div className="req-l1"><span className="req-org">{r.org}</span><span className="req-kind">{r.kind}</span></div>
                  <div className="req-subj">{r.subject}</div>
                  <div className="req-note">{r.note}</div>
                </div>
                <div className="req-right">
                  <span className="req-when">{r.when}</span>
                  <button type="button" className="req-reply"><Icon name="chat" size={13}/> Reply</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── OPPORTUNITIES (fitting projects) ────────────────────────────────────────────
function FittingCard({ it }) {
  const acc = accentFor(it.org + it.name);
  return (
    <article className="opp-card">
      <button type="button" className="hit" aria-label={`Open ${it.name}`} onClick={()=>alert(`Open ${it.name}`)}/>
      <div className="opp-media" style={{ background: `linear-gradient(135deg, ${hexToRgba(acc,.18)}, ${hexToRgba(acc,.05)})` }}>
        <span className="opp-badge"><span style={{ width:6,height:6,borderRadius:3,background:"#0a8a5c",display:"inline-block" }}/>Project</span>
        <span className="opp-match"><span className="dot"/>{it.match}% match</span>
        <div className="opp-logo" style={{ color: acc }}>{initials(it.org)}</div>
      </div>
      <div className="opp-body">
        <span className="opp-code">{it.code}</span>
        <h3 className="opp-name">{it.name}</h3>
        <p className="opp-desc">{it.desc}</p>
        <div className="opp-tags">{it.tags.slice(0,2).map(t=><span className="opp-tag" key={t}>{t}</span>)}</div>
      </div>
      <div className="opp-foot">
        <div className="opp-org">
          <div className="opp-org-av" style={{ background: acc }} aria-hidden="true">{initials(it.org)}</div>
          <div className="opp-org-tx"><div className="opp-org-by">initiated by</div><div className="opp-org-nm">{it.org}</div></div>
        </div>
        <button type="button" className="opp-go">Discover <Icon name="arrowRight" size={13}/></button>
      </div>
    </article>
  );
}

function Fitting({ cols, showTip }) {
  return (
    <section id="sec-fitting">
      <div className="section-title">
        <div>
          <h2>Projects that fit your offer</h2>
          <p>Tailored opportunities where your data and services can make a significant impact.</p>
        </div>
        <a className="link-arrow" href="Catalogue.html">View all <Icon name="arrowRight" size={15}/></a>
      </div>
      {showTip && (
        <div className="tip-banner">
          <Icon name="info" size={16}/>
          <span>To refine these recommendations, fully configure your offer.</span>
          <a href="My Offers.html">Configure offer →</a>
        </div>
      )}
      <div className="opp-grid" style={{ "--opp-cols": cols }}>
        {FITTING.slice(0, cols === "2" ? 2 : 3).map(it => <FittingCard key={it.id} it={it}/>)}
      </div>
    </section>
  );
}

// ─── SUCCESS STORIES ──────────────────────────────────────────────────────────────
function StoryCard({ it }) {
  const acc = accentFor(it.sector + it.org);
  return (
    <article className="opp-card story">
      <button type="button" className="hit" aria-label={`Read ${it.title}`} onClick={()=>alert(`Read ${it.title}`)}/>
      <div className="opp-media" style={{ background: `linear-gradient(135deg, ${hexToRgba(acc,.2)}, ${hexToRgba(acc,.05)})` }}>
        <span className="opp-badge">{it.sector}</span>
      </div>
      <div className="opp-body">
        <h3 className="opp-name">{it.title}</h3>
        <p className="opp-desc">{it.desc}</p>
        <div className="opp-org" style={{ marginTop: "auto", paddingTop: 6 }}>
          <div className="opp-org-av" style={{ background: acc }} aria-hidden="true">{initials(it.org)}</div>
          <div className="opp-org-tx"><div className="opp-org-by">led by</div><div className="opp-org-nm">{it.org}</div></div>
        </div>
      </div>
      <div className="opp-foot">
        <div className="story-meta"><Icon name="clock" size={13}/> {it.date}<span className="sep"/>{it.read}</div>
        <button type="button" className="opp-go">Read <Icon name="arrowRight" size={13}/></button>
      </div>
    </article>
  );
}

function Stories({ cols }) {
  return (
    <section id="sec-stories">
      <div className="section-title">
        <div>
          <h2>Get inspired by success stories</h2>
          <p>Real usage scenarios to spark your next project in the data space.</p>
        </div>
        <a className="link-arrow" href="#">View all <Icon name="arrowRight" size={15}/></a>
      </div>
      <div className="opp-grid" style={{ "--opp-cols": cols }}>
        {STORIES.slice(0, cols === "2" ? 2 : 3).map(it => <StoryCard key={it.id} it={it}/>)}
      </div>
    </section>
  );
}

// ─── ASIDE ────────────────────────────────────────────────────────────────────────
function QuickActions() {
  return (
    <div className="mini">
      <div className="mini-head"><div className="panel-ico"><Icon name="grid" size={15}/></div><h3>Manage</h3></div>
      <div className="qa-list">
        <button type="button" className="qa primary" onClick={()=>alert("New offer")}>
          <span className="qa-ico"><Icon name="plus" size={16}/></span>
          <span className="qa-tx">New offer<small>Publish data or a service</small></span>
          <Icon name="arrowRight" size={15} className="go-chev"/>
        </button>
        <a className="qa" href="My Offers.html"><span className="qa-ico"><Icon name="offers" size={16}/></span><span className="qa-tx">My offers<small>26 published</small></span><Icon name="chevronRight" size={15} className="go-chev"/></a>
        <a className="qa" href="My Projects.html"><span className="qa-ico"><Icon name="projects" size={16}/></span><span className="qa-tx">My projects<small>Manage & invite partners</small></span><Icon name="chevronRight" size={15} className="go-chev"/></a>
        <a className="qa" href="My Contracts.html"><span className="qa-ico"><Icon name="contracts" size={16}/></span><span className="qa-tx">My contracts<small>Agreements & signatures</small></span><Icon name="chevronRight" size={15} className="go-chev"/></a>
      </div>
    </div>
  );
}

function NewsCard() {
  return (
    <div className="mini">
      <div className="mini-head"><div className="panel-ico"><Icon name="doc" size={15}/></div><h3>News</h3></div>
      <div className="news-list">
        {NEWS.map(n => (
          <div className="news-item" key={n.id}>
            <span className="news-tag">{n.tag}</span>
            <h4 className="news-title"><a href="#">{n.title}</a></h4>
            <p className="news-desc">{n.desc}</p>
            <span className="news-when">{n.when}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrometheusCard() {
  return (
    <div className="ptx">
      <div className="ptx-brand"><div className="ptx-logo"><Icon name="sparkle" size={16}/></div><span>PROMETHEUS-X</span></div>
      <h3>A solution trusted by Prometheus-X</h3>
      <p>This data space catalogue relies on open-source building blocks, enabling human-centric and sovereign data spaces.</p>
      <a href="#">Learn more <Icon name="arrowRight" size={14}/></a>
    </div>
  );
}

// ─── ROOT ───────────────────────────────────────────────────────────────────────
function HomeApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("vt.homeSnav") === "1"; } catch(e){ return false; } });
  const [navView, setNavView] = useState("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  React.useEffect(() => { try { localStorage.setItem("vt.homeSnav", collapsed ? "1":"0"); } catch(e){} }, [collapsed]);

  const dClass = t.density === "Compact" ? "d-compact" : t.density === "Comfortable" ? "d-comfy" : "d-regular";
  const single = t.layout === "Single column";

  return (
    <div className="app ui-v2 home-app">
      <a href="#home-main" className="skip-link">Skip to content</a>
      <AppSidebar variant="v2" activeId="home"/>
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="icon-btn ghost only-mobile" onClick={()=>setNavOpen(true)} aria-label="Open menu"><Icon name="home" size={18}/></button>
            <div className="page-title"><Icon name="home" size={20}/><h1>Home</h1></div>
          </div>
          <div className="topbar-right">
            <button type="button" className="icon-btn ghost" aria-label="Basket, 2 items" style={{ position:"relative" }}><Icon name="cart" size={18}/><span className="notif-dot" aria-hidden="true">2</span></button>
            <button type="button" className="icon-btn ghost hide-mobile" aria-label="Language"><Icon name="translate" size={18}/></button>
            <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16}/><span>Help</span></button>
            <button type="button" className="icon-btn ghost notif" aria-label="Notifications, 54 unread"><Icon name="bell" size={18}/><span className="notif-dot" aria-hidden="true">54</span></button>
            <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18}/></button>
          </div>
        </header>

        <div className="page">
          <div className={`settings-nav-wrap ${navOpen ? "open" : ""}`}>
            <HomeNav collapsed={collapsed} onToggleCollapse={()=>setCollapsed(c=>!c)} view={navView} onView={setNavView}/>
            {navOpen && <div className="settings-nav-scrim" onClick={()=>setNavOpen(false)}/>}
          </div>

          <main className="content home-content" id="home-main" tabIndex={-1}>
            <div className={`home-inner ${dClass}`}>
              <Hero/>
              <KpiStrip highlight={t.highlightRequests}/>
              <div className={`home-grid ${single ? "single" : ""}`}>
                <div className="home-main">
                  <AttentionZone pendingCount={t.pendingCount}/>
                  <Fitting cols={t.oppCols} showTip={t.showTip}/>
                  {t.showStories && <Stories cols={t.oppCols}/>}
                </div>
                <aside className="home-aside">
                  <QuickActions/>
                  {t.showNews && <NewsCard/>}
                  {t.showPrometheus && <PrometheusCard/>}
                </aside>
              </div>
            </div>
          </main>
        </div>
      </div>

      <BottomNav onOpenMore={()=>setMoreOpen(true)}/>
      <BottomNavSheet open={moreOpen} onClose={()=>setMoreOpen(false)}/>

      <TweaksPanel>
        <TweakSection label="Layout"/>
        <TweakRadio label="Structure" value={t.layout} options={["Two columns","Single column"]} onChange={v=>setTweak("layout", v)}/>
        <TweakRadio label="Density" value={t.density} options={["Compact","Regular","Comfortable"]} onChange={v=>setTweak("density", v)}/>
        <TweakRadio label="Cards per row" value={t.oppCols} options={["2","3"]} onChange={v=>setTweak("oppCols", v)}/>
        <TweakSlider label="Pending rows" value={t.pendingCount} min={2} max={5} step={1} onChange={v=>setTweak("pendingCount", v)}/>
        <TweakSection label="Sections"/>
        <TweakToggle label="Highlight requests KPI" value={t.highlightRequests} onChange={v=>setTweak("highlightRequests", v)}/>
        <TweakToggle label="Recommendation tip" value={t.showTip} onChange={v=>setTweak("showTip", v)}/>
        <TweakToggle label="Success stories" value={t.showStories} onChange={v=>setTweak("showStories", v)}/>
        <TweakToggle label="News" value={t.showNews} onChange={v=>setTweak("showNews", v)}/>
        <TweakToggle label="Prometheus-X banner" value={t.showPrometheus} onChange={v=>setTweak("showPrometheus", v)}/>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<HomeApp/>);
})();
