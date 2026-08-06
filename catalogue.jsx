// VisionsTrust — Catalogue page (V2 UX). Reuses window.UI shell + window.CatData.
(function() {
const { useState, useEffect, useMemo, useRef } = React;
const { Icon, AppSidebar, BottomNav, BottomNavSheet } = window.UI;
const { OFFERS, PROJECTS, INFRA, ORGS, accentFor, hexToRgba, initials } = window.CatData;

const KIND_DOT = { Data: "#00a2ae", Service: "#5b6ef5", Infrastructure: "#e8743b", Project: "#0a8a5c", Organisation: "#17243f" };

// Normalise every record into a common shape
const norm = (raw, type, kindLabel) => raw.map(r => ({
  ...r, type, kindLabel: kindLabel || r.kind, accent: accentFor(r.provider || r.name),
}));
const ALL_OFFERS = norm(OFFERS, "Offer");
const ALL_PROJECTS = norm(PROJECTS, "Project", "Project");
const ALL_INFRA = norm(INFRA, "Infrastructure", "Infrastructure");
const ALL_ORGS = norm(ORGS, "Organisation", "Organisation");

const CATS = [
  { id: "all", label: "All", icon: "grid", get count() { return ALL_OFFERS.length + ALL_PROJECTS.length + ALL_INFRA.length; } },
  { id: "offers", label: "Offers", icon: "offers", count: ALL_OFFERS.length },
  { id: "projects", label: "Projects", icon: "projects", count: ALL_PROJECTS.length },
  { id: "infrastructure", label: "Infrastructure", icon: "tech", count: ALL_INFRA.length },
  { id: "organisations", label: "Organisations", icon: "building", count: ALL_ORGS.length },
];
const NAV_TABS = [
  { id: "browse", icon: "grid", label: "Browse" },
  { id: "helper", icon: "sparkle", label: "Helper" },
  { id: "ai", icon: "chat", label: "AI" },
];

const PERIOD_THRESHOLD = { all: null, "3m": "2026-03-01", "12m": "2025-06-01", year: "2026-01-01" };

// ─── SMART SEARCH HELPERS (dual-mode: keyword + AI assistant) ─────────────────
const POOL = [...ALL_OFFERS, ...ALL_PROJECTS, ...ALL_INFRA];
const EXAMPLE_PROMPTS = [
  "Find data offers about hard skills for a training platform",
  "Which projects are looking for partners in skills matching?",
  "Services to anonymise and transform learner data",
];
const firstSentence = (t) => { const m = (t || "").match(/^[^.]*\.?/); return (m ? m[0] : t || "").trim(); };

function rankItems(q) {
  const tokens = (q || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!tokens.length) {
    return POOL.filter(it => /skill|learning|matching|analyt/.test(((it.tags || []).join(" ") + " " + it.name).toLowerCase())).slice(0, 6);
  }
  const scored = POOL.map(it => {
    const name = it.name.toLowerCase(), tags = (it.tags || []).join(" ").toLowerCase();
    const desc = it.desc.toLowerCase(), prov = (it.provider || "").toLowerCase(), cat = (it.category || "").toLowerCase();
    let s = 0;
    tokens.forEach(t => { if (name.includes(t)) s += 5; if (tags.includes(t)) s += 3; if (cat.includes(t)) s += 3; if (prov.includes(t)) s += 2; if (desc.includes(t)) s += 1; });
    return { it, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  return (scored.length ? scored.map(x => x.it) : POOL.slice(0, 6)).slice(0, 8);
}

function buildAnalysis(q, items) {
  const discovery = !q.trim();
  const types = [...new Set(items.map(i => i.type))];
  const providers = [...new Set(items.map(i => i.provider).filter(Boolean))];
  const typeLabel = types.map(t => t === "Infrastructure" ? "infrastructure services" : t.toLowerCase() + "s").join(" and ");
  const intro = discovery
    ? "No worries — here's a starting point. I've gathered a cross-section of the most active resources in the data space so you can get a feel for what's available before narrowing down."
    : `Based on “${q}”, I found ${items.length} resource${items.length !== 1 ? "s" : ""} spanning ${typeLabel || "the catalogue"}. Here is how they relate and where I'd suggest starting.`;
  const groupTitle = discovery ? "A guided tour of the catalogue" : `Recommended combination for “${q}”`;
  const groupNote = discovery
    ? "These are popular entry points that complement each other across data, services and projects."
    : `These results share overlapping themes${providers.length ? ` and come from ${providers.slice(0, 3).join(", ")}${providers.length > 3 ? " and others" : ""}` : ""}. Together they cover sourcing, transforming and acting on the data.`;
  const reasons = items.slice(0, 3).map(it => ({ name: it.name, kind: it.kindLabel, text: firstSentence(it.desc) }));
  const closing = "Open any result to see its resources, pricing and exchange terms — or refine your request for a tighter match.";
  return { intro, groupTitle, groupNote, reasons, closing };
}

// The signed-in user's own resources — used by the “+” menu to seed a match.
const MINE_OFFERS = [
  { id: "mo1", name: "Skills Profile API", type: "Offer", kindLabel: "Data", provider: "VISIONSPROV", tags: ["Hard skills", "Skills profile"], desc: "Aggregated hard & soft skills profiles, consent-governed." },
  { id: "mo2", name: "Learner Records Connector", type: "Offer", kindLabel: "Service", provider: "VISIONSPROV", tags: ["LMS", "Learning analytics"], desc: "Connects your LMS learner records into the data space." },
].map(o => ({ ...o, accent: accentFor(o.name) }));
const MINE_PROJECTS = [
  { id: "mp1", name: "Workforce Upskilling Pilot", type: "Project", kindLabel: "Project", provider: "VISIONSPROV", tags: ["Skills matching", "Workforce"], desc: "Pilot to match workforce skills to training pathways." },
  { id: "mp2", name: "Cross-border Learning Data Hub", type: "Project", kindLabel: "Project", provider: "VISIONSPROV", tags: ["Data sharing", "Learning analytics"], desc: "Federated hub sharing learning analytics across borders." },
].map(p => ({ ...p, accent: accentFor(p.name) }));

function rankMatches(attached, typedQuery) {
  const seedTokens = [...new Set(((attached.tags || []).join(" ") + " " + attached.name).toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2))];
  const typed = (typedQuery || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const scored = POOL.filter(it => it.id !== attached.id && it.name.toLowerCase() !== attached.name.toLowerCase()).map(it => {
    const tagsStr = (it.tags || []).join(" ").toLowerCase();
    const hay = (it.name + " " + tagsStr + " " + it.desc + " " + (it.category || "")).toLowerCase();
    let s = 0;
    seedTokens.forEach(t => { if (tagsStr.includes(t)) s += 4; else if (hay.includes(t)) s += 2; });
    typed.forEach(t => { if (hay.includes(t)) s += 3; });
    if (attached.type === "Offer" && it.type === "Project") s += 2;
    if (attached.type === "Project" && it.type === "Offer") s += 2;
    return { it, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  return (scored.length ? scored.map(x => x.it) : POOL.slice(0, 6)).slice(0, 8);
}

function buildMatchAnalysis(attached, items, typedQuery) {
  const tags = (attached.tags || []).slice(0, 3).join(", ");
  const providers = [...new Set(items.map(i => i.provider).filter(Boolean))].slice(0, 3);
  const noun = attached.type.toLowerCase();
  const intro = `Matching for your ${noun} “${attached.name}”. I compared its themes${tags ? ` (${tags})` : ""} against the catalogue${typedQuery.trim() ? ` and your note “${typedQuery.trim()}”` : ""} and found ${items.length} complementary resource${items.length !== 1 ? "s" : ""}.`;
  const groupTitle = `Best matches for “${attached.name}”`;
  const groupNote = `These results share themes with your ${noun}${providers.length ? ` and come from ${providers.join(", ")}` : ""}. Pairing them helps you complete an end-to-end service chain.`;
  const reasons = items.slice(0, 3).map(it => {
    const shared = (it.tags || []).find(t => (attached.tags || []).some(a => a.toLowerCase() === t.toLowerCase()));
    return { name: it.name, kind: it.kindLabel, text: shared ? `Shares the “${shared}” theme — ${firstSentence(it.desc)}` : firstSentence(it.desc) };
  });
  const closing = "Open a match to start a connection, or attach a different resource to compare.";
  return { intro, groupTitle, groupNote, reasons, closing };
}

// ─── CARD ────────────────────────────────────────────────────────────────────
function Card({ item, onOpen, bookmarked, onBookmark }) {
  if (item.type === "Organisation") {
    return (
      <div className="cat-card org-card" role="button" tabIndex={0} aria-label={`Open ${item.name}`} onClick={() => onOpen(item)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(item); } }}>
        <div className="org-logo" style={{ background: item.accent }} aria-hidden="true">{initials(item.name)}</div>
        <div className="org-info">
          <h3 className="org-name">{item.name}</h3>
          <p className="org-desc">{item.desc}</p>
          <div className="org-stats">
            <span><Icon name="offers" size={13}/> {item.offers} offers</span>
            <span><Icon name="projects" size={13}/> {item.projects} projects</span>
          </div>
        </div>
      </div>
    );
  }
  const dot = KIND_DOT[item.kindLabel] || KIND_DOT[item.type];
  let meta = null;
  if (item.type === "Offer") meta = <span className="cat-meta-right"><Icon name="database" size={13}/>{item.resources}</span>;
  else if (item.type === "Project") meta = <span className="cat-meta-right"><Icon name="team" size={13}/>{item.members}</span>;
  else if (item.type === "Infrastructure") meta = <span className="cat-meta-right"><Icon name="layers" size={13}/></span>;
  return (
    <article className="cat-card">
      <button type="button" className="cat-card-hit" onClick={() => onOpen(item)} aria-label={`Open ${item.name}`}/>
      <div className="cat-media" style={{ background: `linear-gradient(135deg, ${hexToRgba(item.accent, 0.16)}, ${hexToRgba(item.accent, 0.04)})` }}>        <span className="cat-type"><span className="dot" style={{ background: dot }}/>{item.kindLabel}</span>
        <button type="button" className={`cat-bookmark ${bookmarked ? "on" : ""}`} onClick={e => { e.stopPropagation(); onBookmark(item.id); }} aria-pressed={bookmarked} aria-label={bookmarked ? `Remove ${item.name} from saved` : `Save ${item.name}`}>
          <Icon name={bookmarked ? "bookmarkFill" : "bookmark"} size={15}/>
        </button>
        <div className="cat-logo" style={{ color: item.accent }}>{initials(item.provider || item.name)}</div>
      </div>
      <div className="cat-body">
        <h3 className="cat-name">{item.name}</h3>
        <p className="cat-desc">{item.desc}</p>
        <div className="cat-tags">
          {item.type === "Infrastructure" && <span className="tag" style={{ borderColor: hexToRgba(item.accent, .4), color: item.accent }}>{item.category}</span>}
          {item.tags.slice(0, item.type === "Infrastructure" ? 1 : 2).map(t => <span className="tag" key={t}>{t}</span>)}
        </div>
      </div>
      <div className="cat-foot">
        <div className="cat-provider">
          <div className="pv-avatar" style={{ background: item.accent }} aria-hidden="true">{initials(item.provider)}</div>
          <div className="pv-meta">
            <div className="pv-by">{item.type === "Project" ? "initiated by" : "proposed by"}</div>
            <div className="pv-name">{item.provider}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {meta}
          <div className="go" aria-hidden="true"><Icon name="arrowRight" size={15}/></div>
        </div>
      </div>
    </article>
  );
}

// ─── HORIZONTAL RAIL ──────────────────────────────────────────────────────────
function Rail({ title, sub, items, onOpen, onViewAll, bookmarks, onBookmark }) {
  const trackRef = useRef();
  const scroll = (dir) => { const el = trackRef.current; if (el) el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" }); };
  return (
    <section className="rail">
      <div className="rail-head">
        <div>
          <h2 className="rail-title">{title}</h2>
          <p className="rail-sub">{sub}</p>
        </div>
        <div className="rail-nav">
          <button type="button" className="rail-viewall" onClick={onViewAll}>View all <Icon name="chevronRight" size={14}/></button>
          <div className="rail-arrows">
            <button type="button" className="rail-arrow" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`}><Icon name="chevronLeft" size={16}/></button>
            <button type="button" className="rail-arrow" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`}><Icon name="chevronRight" size={16}/></button>
          </div>
        </div>
      </div>
      <div className="rail-track" ref={trackRef}>
        {items.map(it => <Card key={it.id} item={it} onOpen={onOpen} bookmarked={bookmarks.has(it.id)} onBookmark={onBookmark}/>)}
      </div>
    </section>
  );
}

// ─── FACETS ───────────────────────────────────────────────────────────────────
function FacetGroup({ label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`facet-group ${open ? "" : "collapsed"}`}>
      <button type="button" className="facet-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="facet-label">{label}</span>
        <Icon name="chevronDown" size={14} className="facet-chev"/>
      </button>
      <div className="facet-body">{children}</div>
    </div>
  );
}
function Chip({ active, onClick, children }) {
  return (
    <button type="button" className={`facet-chip ${active ? "on" : ""}`} onClick={onClick} aria-pressed={active}>
      <Icon name="check" size={12} className="fc-check"/>{children}
    </button>
  );
}

function Facets({ category, facets, setFacets }) {
  const toggle = (key, val) => setFacets(f => {
    const next = new Set(f[key]); next.has(val) ? next.delete(val) : next.add(val);
    return { ...f, [key]: next };
  });
  const showType = category === "all" || category === "offers";
  const showInfra = category === "infrastructure";
  const showPricing = category === "all" || category === "offers";
  const anyActive = facets.type.size || facets.infraCat.size || facets.pricing.size || facets.period !== "all";
  return (
    <div className="facets">
      {showType && (
        <FacetGroup label="Type">
          {["Data", "Service"].map(t => <Chip key={t} active={facets.type.has(t)} onClick={() => toggle("type", t)}>{t}</Chip>)}
        </FacetGroup>
      )}
      {showInfra && (
        <FacetGroup label="Category">
          {["Data Transformation", "Utility", "Trustworthy Data Sharing"].map(t => <Chip key={t} active={facets.infraCat.has(t)} onClick={() => toggle("infraCat", t)}>{t}</Chip>)}
        </FacetGroup>
      )}
      {showPricing && (
        <FacetGroup label="Pricing">
          {["Free", "Paid"].map(t => <Chip key={t} active={facets.pricing.has(t)} onClick={() => toggle("pricing", t)}>{t}</Chip>)}
        </FacetGroup>
      )}
      <FacetGroup label="Added" defaultOpen={false}>
        <div className="facet-radio" style={{ width: "100%" }}>
          {[["all", "Any time"], ["3m", "Last 3 months"], ["12m", "Last 12 months"], ["year", "This year"]].map(([v, l]) => (
            <label key={v}>
              <input type="radio" name="period" checked={facets.period === v} onChange={() => setFacets(f => ({ ...f, period: v }))}/>
              <span className="rd"/>{l}
            </label>
          ))}
        </div>
      </FacetGroup>
      {anyActive ? (
        <div className="facet-reset">
          <button type="button" onClick={() => setFacets({ type: new Set(), infraCat: new Set(), pricing: new Set(), period: "all" })}>Clear filters</button>
        </div>
      ) : null}
    </div>
  );
}

// ─── HELPER / AI PANELS (merged into contextual sidebar) ──────────────────────
function HelperPanel() {
  const items = ["Publish your first offer to the catalogue", "Create a project and find partners", "Connect your Data Space Connector", "Browse infrastructure services"];
  return (
    <div className="helper">
      <div className="helper-icon"><Icon name="sparkle" size={22}/></div>
      <h3 className="helper-title">Helper home</h3>
      <p className="helper-desc">Contextual guidance for exploring the catalogue, finding the right offers and partnering on projects.</p>
      <h4 className="helper-subtitle">What would you like to do?</h4>
      <div className="helper-actions">
        {items.map((t, i) => <button type="button" key={i} className="helper-action"><Icon name="plus" size={14}/><span>{t}</span></button>)}
      </div>
    </div>
  );
}
function AiPanel() {
  const [msg, setMsg] = useState("");
  const prompts = ["Find data offers about hard skills", "Which projects are looking for partners?", "Explain how to use an offer"];
  return (
    <div className="ai">
      <div className="helper-icon"><Icon name="sparkle" size={22}/></div>
      <h3 className="helper-title">Catalogue assistant</h3>
      <p className="helper-desc">Ask anything about offers, projects, providers or infrastructure in the data space.</p>
      <h4 className="helper-subtitle">Try asking</h4>
      <div className="ai-prompts">
        {prompts.map((p, i) => <button type="button" key={i} className="ai-prompt" onClick={() => setMsg(p)}><span>{p}</span><Icon name="chevronRight" size={14}/></button>)}
      </div>
      <div className="ai-composer">
        <input className="ai-input" aria-label="Ask the catalogue assistant" placeholder="Ask the catalogue…" value={msg} onChange={e => setMsg(e.target.value)}/>
        <button type="button" className="ai-send" disabled={!msg.trim()} aria-label="Send message"><Icon name="chevronRight" size={16}/></button>
      </div>
    </div>
  );
}

// ─── CONTEXTUAL SIDEBAR ───────────────────────────────────────────────────────
function CatalogueNav({ category, onCategory, collapsed, onToggleCollapse, view, onView, facets, setFacets, onCreate }) {
  const tab = NAV_TABS.find(t => t.id === view) || NAV_TABS[0];
  const onTabKey = (e) => {
    const idx = NAV_TABS.findIndex(t => t.id === view);
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % NAV_TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + NAV_TABS.length) % NAV_TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = NAV_TABS.length - 1;
    if (next !== null) {
      e.preventDefault();
      const id = NAV_TABS[next].id;
      onView(id);
      const el = e.currentTarget.querySelector(`[data-tab-id="${id}"]`);
      if (el) el.focus();
    }
  };
  return (
    <nav className={`settings-nav ${collapsed ? "is-collapsed" : ""} view-${view}`} aria-label="Catalogue tools">
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
              <button key={t.id} type="button" role="tab" id={`cat-tab-${t.id}`} data-tab-id={t.id} aria-selected={view === t.id} aria-controls="cat-tabpanel" tabIndex={view === t.id ? 0 : -1} className={`snav-tab ${view === t.id ? "active" : ""}`} onClick={() => onView(t.id)}>
                <Icon name={t.icon} size={13}/><span>{t.label}</span>
              </button>
            ))}
          </div>
        )}
        {collapsed && (
          <div className="snav-tabs-vertical" role="tablist" aria-label="Sidebar mode" onKeyDown={onTabKey}>
            {NAV_TABS.map(t => (
              <button key={t.id} type="button" role="tab" id={`cat-tab-${t.id}`} data-tab-id={t.id} aria-selected={view === t.id} aria-controls="cat-tabpanel" tabIndex={view === t.id ? 0 : -1} aria-label={t.label} className={`snav-tab-icon ${view === t.id ? "active" : ""}`} onClick={() => onView(t.id)}>
                <Icon name={t.icon} size={14}/>
              </button>
            ))}
          </div>
        )}
        {view === "browse" && (
          collapsed
            ? <button type="button" className="snav-primary-icon" onClick={() => onCreate("offer")} aria-label="Create new offer"><Icon name="plus" size={16}/></button>
            : <div className="cat-create">
                <div className="cat-create-split">
                  <button type="button" onClick={() => onCreate("offer")}><Icon name="plus" size={13}/> New offer</button>
                  <button type="button" onClick={() => onCreate("project")}><Icon name="plus" size={13}/> New project</button>
                </div>
              </div>
        )}
      </div>

      <div className="settings-nav-scroll" id="cat-tabpanel" role="tabpanel" aria-labelledby={`cat-tab-${view}`} tabIndex={0}>
        {view === "browse" && (
          <>
            <div className="nav-group">
              {!collapsed && <div className="nav-group-label">Browse</div>}
              {collapsed && <div className="nav-group-divider" aria-hidden="true"/>}
              {CATS.map(c => (
                <button key={c.id} type="button" className={`nav-item ${category === c.id ? "active" : ""}`} aria-current={category === c.id ? "true" : undefined} onClick={() => onCategory(c.id)} aria-label={collapsed ? `${c.label} (${c.count})` : undefined}>
                  <Icon name={c.icon} size={16}/>
                  {!collapsed && <span className="nav-item-label">{c.label}</span>}
                  {!collapsed && <span className="nav-count">{c.count}</span>}
                </button>
              ))}
            </div>
            {!collapsed && category !== "organisations" && category !== "projects" && (
              <Facets category={category} facets={facets} setFacets={setFacets}/>
            )}
            {!collapsed && (category === "projects") && (
              <Facets category={category} facets={facets} setFacets={setFacets}/>
            )}
          </>
        )}
        {view === "helper" && !collapsed && <HelperPanel/>}
        {view === "ai" && !collapsed && <AiPanel/>}
        {view !== "browse" && collapsed && (
          <button type="button" className="snav-expand-hint" onClick={onToggleCollapse} aria-label="Expand to view"><Icon name="chevronRight" size={14}/></button>
        )}
      </div>
    </nav>
  );
}

// ─── DETAIL DRAWER ────────────────────────────────────────────────────────────
function Drawer({ item, onClose, bookmarked, onBookmark }) {
  const [expanded, setExpanded] = useState(false);
  const [pkgId, setPkgId] = useState(null);
  useEffect(() => { setPkgId(null); }, [item && item.id]);
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement;
    const onKey = e => {
      if (e.key === "Escape") { onCloseRef.current(); return; }
      if (e.key === "Tab" && drawerRef.current) {
        const sel = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const list = Array.from(drawerRef.current.querySelectorAll(sel)).filter(el => el.offsetParent !== null);
        if (!list.length) return;
        const first = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const focusIn = () => { (closeRef.current || drawerRef.current)?.focus(); };
    focusIn();
    const t = setTimeout(focusIn, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, []);
  if (!item) return null;
  const dot = KIND_DOT[item.kindLabel] || KIND_DOT[item.type];
  const isOrg = item.type === "Organisation";
  const verb = item.type === "Project" ? "initiated by" : "proposed by";
  const useLabel = { Offer: "Use this offer", Project: "Join this project", Infrastructure: "Use this service", Organisation: "View organisation" }[item.type];
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <aside ref={drawerRef} className={`drawer ${expanded ? "expanded" : ""}`} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-bar">
          <button ref={closeRef} type="button" className="di-btn" onClick={onClose} aria-label="Close panel"><Icon name="chevronRight" size={18}/></button>
          <button type="button" className="di-btn" onClick={() => setExpanded(e => !e)} aria-label={expanded ? "Shrink panel" : "Expand panel"} aria-pressed={expanded}><Icon name="external" size={16}/></button>
          <div className="spacer"/>
          <button type="button" className="di-btn" onClick={() => onBookmark(item.id)} aria-pressed={bookmarked} aria-label={bookmarked ? "Remove from saved" : "Save"} style={bookmarked ? { color: "var(--vui-color-primary)", borderColor: "var(--vui-color-primary)" } : null}>
            <Icon name={bookmarked ? "bookmarkFill" : "bookmark"} size={16}/>
          </button>
        </div>
        <div className="drawer-scroll">
          <div className="drawer-hero">
            <div className="drawer-prov">
              <div className="dp-avatar" style={{ background: item.accent }} aria-hidden="true">{initials(item.provider || item.name)}</div>
              <div>
                <div className="dp-by">{isOrg ? "organisation" : verb}</div>
                <div className="dp-name">{item.provider || item.name}</div>
              </div>
            </div>
            <div className="drawer-banner" style={{ background: `linear-gradient(135deg, ${hexToRgba(item.accent, 0.20)}, ${hexToRgba(item.accent, 0.05)})` }} aria-hidden="true">
              {!isOrg && <span className="cat-type"><span className="dot" style={{ background: dot }}/>{item.kindLabel}</span>}
              <div className="cat-logo" style={{ color: item.accent }}>{initials(item.provider || item.name)}</div>
            </div>
            <h2 className="drawer-title" id="drawer-title">{item.name}</h2>
            <p className="drawer-subtitle">{item.desc}</p>
            {!isOrg && (
              <div className="drawer-tags">
                {item.type === "Infrastructure" && <span className="tag">{item.category}</span>}
                {item.tags.map(t => <span className="tag" key={t}>{t}</span>)}
              </div>
            )}
            {item.type === "Offer" && <a className="drawer-fullpage" href={`Offer.html?id=${item.id}`}><Icon name="external" size={14}/> View full offer page</a>}
          </div>

          {isOrg ? (
            <>
              <div className="drawer-section">
                <h3>About</h3>
                <p className="body">{item.desc}</p>
              </div>
              <div className="drawer-section">
                <h3>Contributions</h3>
                <div className="detail-grid">
                  <div className="detail-item"><span className="dt-k">Offers</span><span className="dt-v">{item.offers}</span></div>
                  <div className="detail-item"><span className="dt-k">Projects</span><span className="dt-v">{item.projects}</span></div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="drawer-section">
                <h3>{item.type === "Offer" ? "Offer description" : item.type === "Project" ? "Project description" : "Service description"}</h3>
                <p className="ds-sub">More details about what this {item.type.toLowerCase()} provides.</p>
                <p className="body">{item.desc} It is exposed through the VisionsTrust data space with consent-governed access and standard exchange protocols.</p>
              </div>

              {item.type === "Offer" && (
                <div className="drawer-section">
                  <h3>Content</h3>
                  <p className="ds-sub">Resources included in this offer.</p>
                  {Array.from({ length: item.resources }).map((_, i) => (
                    <div className="resource-row" key={i}>
                      <div className="rr-icon" style={{ background: item.accent }}><Icon name={item.kindLabel === "Service" ? "tech" : "database"} size={20}/></div>
                      <div><div className="rr-name">{item.name}{item.resources > 1 ? ` — part ${i + 1}` : ""}</div><div className="rr-type">{item.kindLabel} resource</div></div>
                    </div>
                  ))}
                </div>
              )}

              {item.type === "Offer" && (() => {
                const CO = window.CatOffer;
                const pkgs = CO.packagesOf(item);
                const pkg = pkgs.find(p => p.id === pkgId) || null;
                return (
                  <>
                    <div className="drawer-section">
                      <h3>{pkgs.length ? "Packages" : "Pricing"}</h3>
                      <p className="ds-sub">{pkgs.length ? "This offer is sold through several formulas. The one you pick drives the price and part of the baseline." : "Exact details of the services or data provided."}</p>
                      {pkgs.length ? (
                        <CO.PackageGrid item={item} selected={pkgId} onSelect={setPkgId}/>
                      ) : (
                        <>
                          <div className="pricing-row">
                            <div className="pr-icon"><Icon name="billing" size={20}/></div>
                            <div>
                              <div className="pr-amount">{item.price ? item.price.amount : "On request"}</div>
                              <div className="pr-period">{item.price ? (item.price.period ? `per ${item.price.period.toLowerCase()}` : "no recurring fee") : "contact provider for pricing"}</div>
                            </div>
                          </div>
                          <div className="ofd-sub-label">Usage policies</div>
                          <div className="ofd-pol-row"><CO.PolicyChips list={CO.policiesOf(item, null)}/></div>
                        </>
                      )}
                    </div>
                    <div className="drawer-section">
                      <h3>Published baseline</h3>
                      <p className="ds-sub">{pkg ? `As published for the ${pkg.name} package.` : pkgs.length ? "Common baseline — pick a package above to see the values it overrides." : "What the provider committed to for this offer."}</p>
                      <CO.BaselineTable item={item} pkg={pkg}/>
                      <div className="ofd-note"><Icon name="info" size={13}/><span><b>Fixed</b> fields stand as published. <b>Auto-accept</b> fields can be moved by the contract agent against your acceptance baseline when you add this offer to a basket.</span></div>
                    </div>
                  </>
                );
              })()}

              {item.type === "Project" && (
                <div className="drawer-section">
                  <h3>Participation</h3>
                  <div className="detail-grid">
                    <div className="detail-item"><span className="dt-k">Status</span><span className="dt-v">{item.status}</span></div>
                    <div className="detail-item"><span className="dt-k">Partners</span><span className="dt-v">{item.members}</span></div>
                  </div>
                </div>
              )}

              <div className="drawer-section">
                <h3>Details</h3>
                <div className="detail-grid">
                  <div className="detail-item"><span className="dt-k">Type</span><span className="dt-v">{item.kindLabel}</span></div>
                  {item.type === "Infrastructure" && <div className="detail-item"><span className="dt-k">Category</span><span className="dt-v">{item.category}</span></div>}
                  <div className="detail-item"><span className="dt-k">Provider</span><span className="dt-v">{item.provider}</span></div>
                  <div className="detail-item"><span className="dt-k">Published</span><span className="dt-v">{new Date(item.added).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="drawer-foot">
          <button type="button" className="share" aria-label="Share"><Icon name="share" size={18}/></button>
          {item.type === "Offer"
            ? <a className="use-btn" href="basket_packages_27_07.html"><Icon name="cart" size={16}/> Add to basket</a>
            : <button type="button" className="use-btn"><Icon name="check" size={16}/> {useLabel}</button>}
        </div>
      </aside>
    </>
  );
}

// ─── SMART SEARCH (keyword + AI assistant, RGAA combobox/disclosure) ──────────
function SmartSearch({ query, setQuery, onSubmit, onClearAll, aiActive, onCreate, liveMatches, onOpen, recents, onClearRecents, attached, onAttach, onDetach, myOffers, myProjects }) {
  const [open, setOpen] = useState(false);
  const [picker, setPicker] = useState("root");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    if (!open) { setPicker("root"); return; }
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const submitAI = () => { setOpen(false); onSubmit(query); };
  const popItems = () => Array.from(wrapRef.current ? wrapRef.current.querySelectorAll(".ss-pop [data-pop-item]") : []);
  const onKeyDown = (e) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "Enter") { e.preventDefault(); submitAI(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); const first = popItems()[0]; if (first) setTimeout(() => first.focus(), 0); }
  };
  const popKeyDown = (e) => {
    const items = popItems(); const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (i <= 0) inputRef.current.focus(); else items[i - 1].focus(); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); inputRef.current.focus(); }
  };

  return (
    <div className="smart-search-zone">
      <div className={`smart-search ${open ? "open" : ""}`} ref={wrapRef}>
        <div className="ss-bar" role="search">
          <button type="button" className="ss-plus" aria-haspopup="true" aria-expanded={open} aria-label={open ? "Close search suggestions" : "Open search suggestions and assistant prompts"} onClick={() => setOpen(o => !o)}>
            <Icon name="plus" size={18}/>
          </button>
          {attached && (
            <span className="ss-attached">
              <span className="ss-att-ic" style={{ background: attached.accent }} aria-hidden="true"><Icon name={attached.type === "Project" ? "projects" : "offers"} size={13}/></span>
              <span className="ss-att-tx"><span className="ss-att-k">{attached.type === "Project" ? "My project" : "My offer"}</span><span className="ss-att-n">{attached.name}</span></span>
              <button type="button" className="ss-att-x" onClick={onDetach} aria-label={`Remove attached ${attached.type.toLowerCase()} ${attached.name}`}><Icon name="x" size={13}/></button>
            </span>
          )}
          <label htmlFor="smart-search-input" className="sr-only">Search the catalogue or describe what you need</label>
          <input
            id="smart-search-input" ref={inputRef} type="text"
            role="combobox" aria-expanded={open} aria-controls="ss-pop" aria-autocomplete="list" aria-describedby="ss-hint"
            className="ss-input" value={query}
            placeholder={attached ? "Add a note to refine the match (optional)…" : "Search the catalogue or describe what you need…"}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          {(hasQuery || aiActive) && (
            <button type="button" className="ss-clear" onClick={() => { onClearAll(); inputRef.current && inputRef.current.focus(); }} aria-label="Clear search and results"><Icon name="x" size={15}/></button>
          )}
          <button type="button" className="ss-send" onClick={submitAI} aria-label={attached ? `Match resources for ${attached.name}` : hasQuery ? `Ask the assistant about ${query}` : "Ask the assistant to guide me"}>
            <Icon name="sparkle" size={16}/><span className="ss-send-label">{attached ? "Match" : "Ask AI"}</span>
          </button>
        </div>

        {open && (
          <div className="ss-pop" id="ss-pop" role="region" aria-label="Search suggestions" onKeyDown={popKeyDown}>
            {picker !== "root" ? (
              <div className="ss-group ss-picker">
                <button type="button" className="ss-back" data-pop-item onClick={() => setPicker("root")}><Icon name="chevronLeft" size={15}/><span>Back</span></button>
                <div className="ss-group-label">{picker === "offers" ? "Your offers" : "Your projects"}</div>
                {(picker === "offers" ? myOffers : myProjects).map(it => (
                  <button type="button" key={it.id} className="ss-quick" data-pop-item onClick={() => { onAttach(it); setPicker("root"); setOpen(false); }}>
                    <span className="ss-quick-dot" style={{ background: it.accent }} aria-hidden="true">{initials(it.name)}</span>
                    <span className="ss-quick-tx"><span className="ss-quick-n">{it.name}</span><span className="ss-quick-m">{it.kindLabel} · {(it.tags || []).slice(0, 2).join(", ")}</span></span>
                  </button>
                ))}
              </div>
            ) : (
            <>
              <div className="ss-group">
                <div className="ss-group-label">Match with my resources</div>
                <button type="button" className="ss-mode" data-pop-item onClick={() => setPicker("offers")}>
                  <span className="ss-mode-ic ai"><Icon name="offers" size={15}/></span>
                  <span className="ss-mode-tx"><span className="ss-mode-t">{attached && attached.type === "Offer" ? "Change attached offer" : "Add one of my offers"}</span><span className="ss-mode-s">Match data, services &amp; projects to it</span></span>
                  <Icon name="arrowRight" size={15} className="ss-mode-go"/>
                </button>
                <button type="button" className="ss-mode" data-pop-item onClick={() => setPicker("projects")}>
                  <span className="ss-mode-ic ai"><Icon name="projects" size={15}/></span>
                  <span className="ss-mode-tx"><span className="ss-mode-t">{attached && attached.type === "Project" ? "Change attached project" : "Add one of my projects"}</span><span className="ss-mode-s">Find partners &amp; complementary offers</span></span>
                  <Icon name="arrowRight" size={15} className="ss-mode-go"/>
                </button>
              </div>
              {hasQuery ? (
              <>
                <div className="ss-group">
                  <button type="button" className="ss-mode" data-pop-item onClick={() => setOpen(false)}>
                    <span className="ss-mode-ic kw"><Icon name="search" size={15}/></span>
                    <span className="ss-mode-tx"><span className="ss-mode-t">Keyword search</span><span className="ss-mode-s">Show {liveMatches.length} match{liveMatches.length !== 1 ? "es" : ""} for “{query}”</span></span>
                    <Icon name="arrowRight" size={15} className="ss-mode-go"/>
                  </button>
                  <button type="button" className="ss-mode" data-pop-item onClick={submitAI}>
                    <span className="ss-mode-ic ai"><Icon name="sparkle" size={15}/></span>
                    <span className="ss-mode-tx"><span className="ss-mode-t">Ask the assistant</span><span className="ss-mode-s">Let AI analyse “{query}” and recommend a combination</span></span>
                    <Icon name="arrowRight" size={15} className="ss-mode-go"/>
                  </button>
                </div>
                {liveMatches.length > 0 && (
                  <div className="ss-group">
                    <div className="ss-group-label" id="ss-quick-l">Top matches</div>
                    <div role="list" aria-labelledby="ss-quick-l">
                      {liveMatches.slice(0, 4).map(it => (
                        <button type="button" role="listitem" key={it.id} className="ss-quick" data-pop-item onClick={() => { setOpen(false); onOpen(it); }}>
                          <span className="ss-quick-dot" style={{ background: it.accent }} aria-hidden="true">{initials(it.provider || it.name)}</span>
                          <span className="ss-quick-tx"><span className="ss-quick-n">{it.name}</span><span className="ss-quick-m">{it.kindLabel} · {it.provider || it.type}</span></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="ss-group">
                  <div className="ss-group-label">What would you like to do?</div>
                  <button type="button" className="ss-intent" data-pop-item onClick={() => { setOpen(false); inputRef.current && inputRef.current.focus(); }}>
                    <span>I'm searching for data and services</span><Icon name="arrowRight" size={15}/>
                  </button>
                  <button type="button" className="ss-intent" data-pop-item onClick={() => { setOpen(false); onCreate("offer"); }}>
                    <span>I'm providing data and services</span><Icon name="arrowRight" size={15}/>
                  </button>
                  <button type="button" className="ss-intent" data-pop-item onClick={() => { setOpen(false); onSubmit(""); }}>
                    <span>I have no idea — guide me</span><Icon name="arrowRight" size={15}/>
                  </button>
                </div>
                {recents.length > 0 && (
                  <div className="ss-group">
                    <div className="ss-group-head"><span className="ss-group-label">Recent</span><button type="button" className="ss-group-clear" data-pop-item onClick={onClearRecents}>Clear</button></div>
                    {recents.slice(0, 3).map((r, i) => (
                      <button type="button" className="ss-example" data-pop-item key={i} onClick={() => { setQuery(r); setOpen(false); onSubmit(r); }}>
                        <Icon name="refresh" size={14}/><span>{r}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="ss-group">
                  <div className="ss-group-label">Try asking the assistant</div>
                  {EXAMPLE_PROMPTS.map((p, i) => (
                    <button type="button" className="ss-example" data-pop-item key={i} onClick={() => { setQuery(p); setOpen(false); onSubmit(p); }}>
                      <Icon name="sparkle" size={14}/><span>{p}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            </>
            )}
          </div>
        )}
      </div>
      <p className="ss-hint" id="ss-hint">Type to filter instantly, or press <kbd>Enter</kbd> to let the assistant analyse your need.</p>
    </div>
  );
}

// ─── AI ANALYSIS FLOW (analysing → collapsible reasoning + results) ───────────
function AiToolbar({ count, working, sort, setSort, viewMode, setViewMode }) {
  return (
    <div className="cat-toolbar">
      <div className="cat-toolbar-left">
        <h2 className="cat-heading">Suggestions</h2>
        <span className="cat-count">{working ? "Working…" : `${count} result${count !== 1 ? "s" : ""}`}</span>
      </div>
      <div className="cat-toolbar-right">
        <div className="sort-wrap">
          <label htmlFor="ai-sort" className="sr-only">Sort results by</label>
          <select id="ai-sort" className="sort-select" value={sort} onChange={e => setSort(e.target.value)} disabled={working}>
            <option value="relevance">Best match</option>
            <option value="newest">Newest</option>
            <option value="az">Name A–Z</option>
          </select>
          <Icon name="chevronDown" size={14} className="sort-chev"/>
        </div>
        <div className="view-toggle" role="group" aria-label="View mode">
          <button type="button" className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")} aria-label="Grid view" aria-pressed={viewMode === "grid"}><Icon name="grid" size={16}/></button>
          <button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} aria-label="List view" aria-pressed={viewMode === "list"}><Icon name="list" size={16}/></button>
        </div>
      </div>
    </div>
  );
}

function AiFlow({ ai, onClear, sort, setSort, viewMode, setViewMode, bookmarks, onBookmark, onOpen }) {
  const [collapsed, setCollapsed] = useState(false);
  const analysing = ai.status === "analysing";
  let items = ai.items;
  if (!analysing) {
    if (sort === "newest") items = [...items].sort((a, b) => (b.added || "").localeCompare(a.added || ""));
    else if (sort === "az") items = [...items].sort((a, b) => a.name.localeCompare(b.name));
  }
  return (
    <div className="ai-flow">
      <section className="ai-panel" aria-label="Assistant analysis">
        <div className="ai-panel-head">
          <div className="ai-head-left">
            <span className={`ai-spark ${analysing ? "pulse" : ""}`} aria-hidden="true"><Icon name="sparkle" size={16}/></span>
            <div className="ai-head-tx" role="status" aria-live="polite">
              {analysing
                ? <span className="ai-analysing-label">{ai.match ? `Matching your ${ai.match.type.toLowerCase()}` : "Analysing your request"}<span className="ai-dots" aria-hidden="true"><i></i><i></i><i></i></span></span>
                : ai.match
                  ? <><span className="ai-result-count">{ai.items.length} match{ai.items.length !== 1 ? "es" : ""} for “{ai.match.name}”</span><span className="ai-badge">Matching</span></>
                  : <><span className="ai-result-count">{ai.items.length} result{ai.items.length !== 1 ? "s" : ""}{ai.query ? ` for “${ai.query}”` : ""}</span><span className="ai-badge">AI-curated</span></>}
            </div>
          </div>
          <div className="ai-head-right">
            {!analysing && <button type="button" className="ai-panel-toggle" onClick={() => setCollapsed(c => !c)} aria-expanded={!collapsed} aria-controls="ai-analysis-body">{collapsed ? "Show analysis" : "Hide analysis"}</button>}
            <button type="button" className="ai-panel-close" onClick={onClear} aria-label="Close assistant results and clear search"><Icon name="x" size={16}/></button>
          </div>
        </div>
        {analysing ? (
          <div className="ai-analysing-body" aria-hidden="true"><span className="ai-line w90"></span><span className="ai-line w70"></span><span className="ai-line w80"></span></div>
        ) : (
          <div className="ai-panel-body" id="ai-analysis-body" hidden={collapsed}>
            <p className="ai-intro">{ai.analysis.intro}</p>
            <div className="ai-group">
              <h3 className="ai-group-title">{ai.analysis.groupTitle}</h3>
              <p className="ai-group-note">{ai.analysis.groupNote}</p>
              {ai.analysis.reasons.length > 0 && (
                <ul className="ai-reasons">
                  {ai.analysis.reasons.map((r, i) => (
                    <li key={i}><span className="ai-reason-n">{r.name}</span><span className="ai-reason-k">{r.kind}</span><span className="ai-reason-t">{r.text}</span></li>
                  ))}
                </ul>
              )}
            </div>
            <p className="ai-closing">{ai.analysis.closing}</p>
          </div>
        )}
      </section>

      <AiToolbar count={ai.items.length} working={analysing} sort={sort} setSort={setSort} viewMode={viewMode} setViewMode={setViewMode}/>

      <div className={`cat-grid ${viewMode === "list" ? "list" : ""}`}>
        {analysing
          ? Array.from({ length: 6 }).map((_, i) => (
              <div className="skel-card" key={i} aria-hidden="true"><div className="skel-media"></div><div className="skel-lines"><span></span><span></span><span></span></div></div>
            ))
          : items.length === 0
            ? <div className="cat-empty"><div className="ce-icon"><Icon name="search" size={22}/></div><h3>No close match</h3><p>Try rephrasing your need, or browse a category from the sidebar.</p></div>
            : items.map(it => <Card key={it.id} item={it} onOpen={onOpen} bookmarked={bookmarks.has(it.id)} onBookmark={onBookmark}/>)}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function CatalogueApp() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("relevance");
  const [viewMode, setViewMode] = useState("grid");
  const [facets, setFacets] = useState({ type: new Set(), infraCat: new Set(), pricing: new Set(), period: "all" });
  const [selected, setSelected] = useState(null);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("vt.catSnav") === "1"; } catch (e) { return false; } });
  const [navView, setNavView] = useState("browse");
  const [bookmarks, setBookmarks] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem("vt.catBm") || "[]")); } catch (e) { return new Set(); } });
  const [navOpen, setNavOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [ai, setAi] = useState(null);
  const [attached, setAttached] = useState(null);
  const [recents, setRecents] = useState(() => { try { return JSON.parse(localStorage.getItem("vt.catRecents") || "[]"); } catch (e) { return []; } });
  const aiTimer = useRef(null);

  useEffect(() => { try { localStorage.setItem("vt.catSnav", collapsed ? "1" : "0"); } catch (e) {} }, [collapsed]);
  useEffect(() => { try { localStorage.setItem("vt.catBm", JSON.stringify([...bookmarks])); } catch (e) {} }, [bookmarks]);
  useEffect(() => { try { localStorage.setItem("vt.catRecents", JSON.stringify(recents)); } catch (e) {} }, [recents]);
  useEffect(() => () => window.clearTimeout(aiTimer.current), []);

  const onBookmark = (id) => setBookmarks(b => { const n = new Set(b); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const onCreate = (what) => alert(`Create a new ${what} — flow would open here.`);

  const runAI = (raw) => {
    const q = raw == null ? query : raw;
    setQuery(q);
    if (q.trim()) setRecents(r => [q.trim(), ...r.filter(x => x !== q.trim())].slice(0, 5));
    const match = attached;
    setAi({ status: "analysing", query: q.trim(), match, items: [], analysis: null });
    const items = match ? rankMatches(match, q) : rankItems(q);
    const analysis = match ? buildMatchAnalysis(match, items, q) : buildAnalysis(q, items);
    window.clearTimeout(aiTimer.current);
    aiTimer.current = window.setTimeout(() => setAi({ status: "done", query: q.trim(), match, items, analysis }), 1050);
  };
  const clearAI = () => { window.clearTimeout(aiTimer.current); setAi(null); };
  const clearAll = () => { setQuery(""); setAttached(null); clearAI(); };
  const handleQueryChange = (v) => { setQuery(v); if (ai) clearAI(); };

  // dataset for the active category
  const base = useMemo(() => {
    if (category === "offers") return ALL_OFFERS;
    if (category === "projects") return ALL_PROJECTS;
    if (category === "infrastructure") return ALL_INFRA;
    if (category === "organisations") return ALL_ORGS;
    return [...ALL_OFFERS, ...ALL_PROJECTS, ...ALL_INFRA];
  }, [category]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let out = base.filter(it => {
      if (q) {
        const hay = `${it.name} ${it.provider || ""} ${it.desc} ${(it.tags || []).join(" ")} ${it.category || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (facets.type.size && !facets.type.has(it.kindLabel)) return false;
      if (facets.infraCat.size && !facets.infraCat.has(it.category)) return false;
      if (facets.pricing.size) {
        const isFree = !it.price || it.price.amount === "Free";
        const want = (facets.pricing.has("Free") && isFree) || (facets.pricing.has("Paid") && !isFree);
        if (!want) return false;
      }
      if (facets.period !== "all") {
        const th = PERIOD_THRESHOLD[facets.period];
        if (it.added && it.added < th) return false;
      }
      return true;
    });
    if (sort === "newest") out = [...out].sort((a, b) => (b.added || "").localeCompare(a.added || ""));
    else if (sort === "az") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "provider") out = [...out].sort((a, b) => (a.provider || a.name).localeCompare(b.provider || b.name));
    return out;
  }, [base, query, facets, sort]);

  // active filter pills
  const pills = [];
  facets.type.forEach(v => pills.push({ k: "type", v }));
  facets.infraCat.forEach(v => pills.push({ k: "infraCat", v }));
  facets.pricing.forEach(v => pills.push({ k: "pricing", v }));
  if (facets.period !== "all") pills.push({ k: "period", v: { "3m": "Last 3 months", "12m": "Last 12 months", year: "This year" }[facets.period] });
  const removePill = (p) => setFacets(f => {
    if (p.k === "period") return { ...f, period: "all" };
    const n = new Set(f[p.k]); n.delete(p.v); return { ...f, [p.k]: n };
  });

  const showRails = category === "all" && !query.trim() && pills.length === 0 && !ai;
  const headingLabel = CATS.find(c => c.id === category).label;

  return (
    <div className="app ui-v2 catalogue-app">
      <a href="#cat-main" className="skip-link">Skip to content</a>
      <AppSidebar variant="v2" activeId="catalogue"/>
      <div className="main">
        <header className="topbar cat-topbar">
          <div className="topbar-left">
            <button type="button" className="icon-btn ghost only-mobile" onClick={() => setNavOpen(true)} aria-label="Open browse menu"><Icon name="grid" size={18}/></button>
            <div className="page-title"><Icon name="catalogue" size={20}/><h1>Catalogue</h1></div>
          </div>
          <div className="topbar-right">
            <button type="button" className="topbar-create hide-mobile" onClick={() => onCreate("offer")}><Icon name="plus" size={15}/><span>New offer</span></button>
            <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16}/><span>Help</span></button>
            <button type="button" className="icon-btn ghost notif" aria-label="Notifications, 90 unread"><Icon name="bell" size={18}/><span className="notif-dot" aria-hidden="true">90</span></button>
            <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18}/></button>
          </div>
        </header>

        <div className={`page ${collapsed ? "" : ""}`}>
          <div className={`settings-nav-wrap ${navOpen ? "open" : ""}`}>
            <CatalogueNav
              category={category}
              onCategory={(id) => { setCategory(id); setNavOpen(false); }}
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed(c => !c)}
              view={navView}
              onView={setNavView}
              facets={facets}
              setFacets={setFacets}
              onCreate={onCreate}
            />
            {navOpen && <div className="settings-nav-scrim" onClick={() => setNavOpen(false)}/>}
          </div>

          <main className="content cat-content" id="cat-main" tabIndex={-1}>
            <div className="cat-inner">
              <SmartSearch
                query={query}
                setQuery={handleQueryChange}
                onSubmit={runAI}
                onClearAll={clearAll}
                aiActive={!!ai}
                onCreate={onCreate}
                liveMatches={query.trim() ? rankItems(query) : []}
                onOpen={setSelected}
                recents={recents}
                onClearRecents={() => setRecents([])}
                attached={attached}
                onAttach={setAttached}
                onDetach={() => setAttached(null)}
                myOffers={MINE_OFFERS}
                myProjects={MINE_PROJECTS}
              />
              {ai ? (
                <AiFlow ai={ai} onClear={clearAI} sort={sort} setSort={setSort} viewMode={viewMode} setViewMode={setViewMode} bookmarks={bookmarks} onBookmark={onBookmark} onOpen={setSelected}/>
              ) : showRails ? (
                <>
                  <Rail title="Featured offers" sub="Explore the most suitable offers and integrate them into your project"
                    items={ALL_OFFERS.slice(0, 8)} onOpen={setSelected} onViewAll={() => setCategory("offers")} bookmarks={bookmarks} onBookmark={onBookmark}/>
                  <Rail title="Featured projects" sub="Discover projects looking for partners"
                    items={ALL_PROJECTS.slice(0, 8)} onOpen={setSelected} onViewAll={() => setCategory("projects")} bookmarks={bookmarks} onBookmark={onBookmark}/>
                  <Rail title="Infrastructure services" sub="Building blocks to transform, secure and share your data"
                    items={ALL_INFRA.slice(0, 8)} onOpen={setSelected} onViewAll={() => setCategory("infrastructure")} bookmarks={bookmarks} onBookmark={onBookmark}/>
                </>
              ) : (
                <>
                  <div className="cat-toolbar">
                    <div className="cat-toolbar-left">
                      <h2 className="cat-heading">{headingLabel}</h2>
                      <span className="cat-count">{filtered.length} result{filtered.length !== 1 ? "s" : ""}{query ? ` for “${query}”` : ""}</span>
                    </div>
                    <div className="cat-toolbar-right">
                      <div className="sort-wrap">
                        <label htmlFor="cat-sort" className="sr-only">Sort results by</label>
                        <select id="cat-sort" className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                          <option value="relevance">Relevance</option>
                          <option value="newest">Newest</option>
                          <option value="az">Name A–Z</option>
                          <option value="provider">Provider</option>
                        </select>
                        <Icon name="chevronDown" size={14} className="sort-chev"/>
                      </div>
                      <div className="view-toggle" role="group" aria-label="View mode">
                        <button type="button" className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")} aria-label="Grid view" aria-pressed={viewMode === "grid"}><Icon name="grid" size={16}/></button>
                        <button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} aria-label="List view" aria-pressed={viewMode === "list"}><Icon name="list" size={16}/></button>
                      </div>
                    </div>
                  </div>

                  {pills.length > 0 && (
                    <div className="active-filters">
                      <span className="af-label">Filters:</span>
                      {pills.map((p, i) => (
                        <span className="filter-pill" key={i}>{p.v}<button type="button" onClick={() => removePill(p)} aria-label={`Remove filter ${p.v}`}><Icon name="x" size={11}/></button></span>
                      ))}
                      <button type="button" className="clear-all" onClick={() => setFacets({ type: new Set(), infraCat: new Set(), pricing: new Set(), period: "all" })}>Clear all</button>
                    </div>
                  )}

                  <div className={`cat-grid ${viewMode === "list" && category !== "organisations" ? "list" : ""}`}>
                    {filtered.length === 0 ? (
                      <div className="cat-empty">
                        <div className="ce-icon"><Icon name="search" size={22}/></div>
                        <h3>No results</h3>
                        <p>Try a different search or clear your filters.</p>
                      </div>
                    ) : filtered.map(it => (
                      <Card key={it.id} item={it} onOpen={setSelected} bookmarked={bookmarks.has(it.id)} onBookmark={onBookmark}/>
                    ))}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      <BottomNav onOpenMore={() => setMoreOpen(true)}/>
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)}/>

      {selected && <Drawer item={selected} onClose={() => setSelected(null)} bookmarked={bookmarks.has(selected.id)} onBookmark={onBookmark}/>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CatalogueApp/>);
})();
