// VisionsTrust — My Projects list page
(function() {
const { useState, useMemo } = React;
const { Icon, AppSidebar, BottomNav, BottomNavSheet } = window.UI;
const { PROJECTS, STATUS_META, ORG, useExitRequests, isCurrent, fmtDate, initials } = window.ProjectsData;
const { StatusPill, OrgAv, useToast, DemoGuide } = window.PJ;
const { accentFor } = window.CatData;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "initiated", label: "Initiated" },
  { id: "joined", label: "Joined" },
  { id: "pending", label: "Pending" },
  { id: "archived", label: "Archived" },
];

const countFor = (f) => {
  if (f === "all") return PROJECTS.length;
  if (f === "initiated" || f === "joined") return PROJECTS.filter(p => p.group === f).length;
  return PROJECTS.filter(p => p.status === f).length;
};

const DETAIL_LINK = (p) => p.group === "initiated" ? "Project Orchestrator.html" : "Project Participant.html";

function ProjectRow({ p, exitCount, onToast }) {
  const [menu, setMenu] = useState(false);
  const m = STATUS_META[p.status];
  const showExit = p.featured && exitCount > 0;
  const open = () => { window.location.href = DETAIL_LINK(p); };
  return (
    <div className="pj-row" role="link" tabIndex={0} onClick={open}
      onKeyDown={e => { if (e.key === "Enter") open(); }} aria-label={`Open project ${p.name}`}>
      <span className="pj-logo" style={{ background: accentFor(p.name) }}>{initials(p.name)}</span>
      <div className="pj-row-main">
        <div className="pj-row-name">
          {p.name}
          {showExit && <span className="pill pill-warn"><Icon name="danger" size={11}/>{exitCount} exit request{exitCount > 1 ? "s" : ""}</span>}
        </div>
        <div className="pj-row-sub">
          <span>Created {fmtDate(p.created)}</span>
          {p.orchestrator && <><span className="mdot"/><span>Orchestrated by {ORG[p.orchestrator].name}</span></>}
          {p.useCases.map(u => <React.Fragment key={u}><span className="mdot"/><span className="uc">{u}</span></React.Fragment>)}
        </div>
      </div>
      <div className="hide-sm">
        <div className="pj-cell-label">Status</div>
        <StatusPill tone={m.tone} icon={m.icon}>{m.label}</StatusPill>
      </div>
      <div className="hide-sm">
        <div className="pj-cell-label">Partners</div>
        {p.partners.length === 0
          ? <span className="pj-avs"><span className="av-none">No partners yet</span></span>
          : <span className="pj-avs">
              {p.partners.slice(0, 4).map(id => <span key={id} className="av" style={{ background: ORG[id].color }} title={ORG[id].name}>{initials(ORG[id].name)}</span>)}
              <span className="av-n">{p.partners.length}</span>
            </span>}
      </div>
      <div className="hide-sm">
        <div className="pj-cell-label">Chains</div>
        <span className="pj-cell-v"><Icon name="layers" size={14}/>{p.chains}</span>
      </div>
      <div className="pj-row-actions" onClick={e => e.stopPropagation()}>
        <a className="pj-open-btn" href={DETAIL_LINK(p)}><Icon name="eye" size={14}/>Open</a>
        <span className="menu-anchor" style={{ position: "relative" }}>
          <button type="button" className="pj-kebab" aria-label={`More actions for ${p.name}`} onClick={() => setMenu(o => !o)}><Icon name="more" size={16}/></button>
          {menu && (
            <div className="pj-menu" onMouseLeave={() => setMenu(false)}>
              <button type="button" onClick={open}><Icon name="eye" size={14}/>See project</button>
              <button type="button" onClick={() => { setMenu(false); onToast("Share link copied"); }}><Icon name="share" size={14}/>Share</button>
              <button type="button" onClick={() => { setMenu(false); onToast("Project duplicated (mock)"); }}><Icon name="copy" size={14}/>Duplicate</button>
              <button type="button" className="danger" onClick={() => { setMenu(false); onToast("Project archived (mock)"); }}><Icon name="archive" size={14}/>Archive</button>
            </div>
          )}
        </span>
      </div>
    </div>
  );
}

function Group({ title, hint, items, exitCount, density, onToast }) {
  if (items.length === 0) return null;
  return (
    <>
      <div className="pj-group">
        <h2>{title}</h2>
        <span className="g-count">{items.length} project{items.length > 1 ? "s" : ""}</span>
        {hint && <span className="g-hint">{hint}</span>}
      </div>
      <div className={`pj-list ${density === "compact" ? "compact" : ""}`}>
        {items.map(p => <ProjectRow key={p.id} p={p} exitCount={exitCount} onToast={onToast}/>)}
      </div>
    </>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "showChains": true
}/*EDITMODE-END*/;

function MyProjectsApp() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [moreOpen, setMoreOpen] = useState(false);
  const [exit, updateExit] = useExitRequests();
  const currentExits = exit.filter(r => isCurrent(r.status)).length;
  const [toastNode, toast] = useToast();
  const [newProject, setNewProject] = useState(false);

  const filtered = useMemo(() => {
    let list = PROJECTS;
    if (filter === "initiated" || filter === "joined") list = list.filter(p => p.group === filter);
    else if (filter !== "all") list = list.filter(p => p.status === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.useCases.some(u => u.toLowerCase().includes(q)));
    }
    const by = {
      newest: (a, b) => b.created.localeCompare(a.created),
      oldest: (a, b) => a.created.localeCompare(b.created),
      az: (a, b) => a.name.localeCompare(b.name),
      partners: (a, b) => b.partners.length - a.partners.length,
    }[sort];
    return [...list].sort(by);
  }, [filter, query, sort]);

  const initiated = filtered.filter(p => p.group === "initiated");
  const joined = filtered.filter(p => p.group === "joined");

  return (
    <div className="app ui-v2" data-screen-label="My Projects — list">
      <a href="#pj-main" className="skip-link">Skip to content</a>
      <AppSidebar variant="v2" activeId="myprojects"/>
      <div className="main">
        <header className="topbar cat-topbar">
          <div className="topbar-left">
            <div className="page-title"><Icon name="projects" size={20}/><h1>My Projects <span style={{ color: "var(--text-faint)", fontWeight: 600 }}>({PROJECTS.length})</span></h1></div>
          </div>
          <div className="topbar-right">
            <button type="button" className="topbar-create hide-mobile" onClick={() => setNewProject(true)}><Icon name="plus" size={15}/><span>Create a new project</span></button>
            <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16}/><span>Help</span></button>
            <button type="button" className="icon-btn ghost notif" aria-label="Notifications"><Icon name="bell" size={18}/><span className="notif-dot" aria-hidden="true">3</span></button>
            <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18}/></button>
          </div>
        </header>

        <main className="pj-content" id="pj-main" tabIndex={-1}>
          <div className="mo-toolbar" style={{ marginBottom: 14 }}>
            <div className="pj-chips" style={{ marginBottom: 0 }}>
              {FILTERS.map(f => (
                <button key={f.id} type="button" className={`pj-chip ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}>
                  {f.label}<span className="n">{countFor(f.id)}</span>
                </button>
              ))}
            </div>
            <div className="mo-toolbar-right">
              <div className="mo-search">
                <Icon name="search" size={15}/>
                <input type="text" placeholder="Search projects…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search projects"/>
                {query && <button type="button" className="mo-search-clear" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="x" size={14}/></button>}
              </div>
              <div className="sort-wrap">
                <label htmlFor="pj-sort" className="sr-only">Sort by</label>
                <select id="pj-sort" className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="az">Name A–Z</option>
                  <option value="partners">Most partners</option>
                </select>
                <Icon name="chevronDown" size={14} className="sort-chev"/>
              </div>
            </div>
          </div>

          {filtered.length === 0 && <div className="pj-empty">No projects match your filters.</div>}
          <Group title="Initiated" hint="Ecosystems you orchestrate" items={initiated} exitCount={currentExits} density={t.density} onToast={toast}/>
          <Group title="Joined" hint="Ecosystems you participate in" items={joined} exitCount={currentExits} density={t.density} onToast={toast}/>
        </main>
      </div>

      <BottomNav onOpenMore={() => setMoreOpen(true)}/>
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)}/>
      <DemoGuide side="list" reqs={exit} reset={updateExit.reset}/>
      {newProject && <window.PJNew.NewProjectModal onClose={() => setNewProject(false)} onCreated={(name) => toast(`${name} created (mock)`)}/>}
      {toastNode}

      <window.TweaksPanel>
        <window.TweakSection label="List"/>
        <window.TweakRadio label="Density" value={t.density} options={["comfortable", "compact"]} onChange={v => setTweak("density", v)}/>
      </window.TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<MyProjectsApp/>);
})();
