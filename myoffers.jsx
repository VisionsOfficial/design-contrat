// VisionsTrust — My Offers page (V2 UX). Reuses window.UI shell + window.MyOffersData.
(function() {
const { useState, useEffect, useMemo, useRef } = React;
const { Icon, AppSidebar, BottomNav, BottomNavSheet } = window.UI;
const { OFFERS, RESOURCES, STATS, TOP_REQUESTS, EVOLUTION } = window.MyOffersData;
const { hexToRgba } = window.CatData;

const KIND_DOT = { Data: "#00a2ae", Service: "#5b6ef5", Infrastructure: "#e8743b" };
const moInit = (n) => (n.replace(/[^a-z0-9]/gi, "").slice(0, 2) || "·").toUpperCase();
const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
const fmtShort = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const ACTIVE = OFFERS.filter(o => !o.archived);
const ARCHIVED = OFFERS.filter(o => o.archived);
const byKind = (k) => ACTIVE.filter(o => o.kind === k);
const resByType = (t) => RESOURCES.filter(r => r.type === t);

const NAV_TABS = [
  { id: "manage", icon: "offers", label: "Manage" },
  { id: "helper", icon: "sparkle", label: "Helper" },
  { id: "ai", icon: "chat", label: "AI" },
];

const COUNTS = {
  all: ACTIVE.length,
  data: byKind("Data").length,
  services: byKind("Service").length,
  infra: byKind("Infrastructure").length,
  archived: ARCHIVED.length,
  "res-all": RESOURCES.length,
  "res-data": resByType("Data").length,
  "res-services": resByType("Service").length,
};

// ─── DONUT ────────────────────────────────────────────────────────────────
function Donut({ signed, pending }) {
  const total = signed + pending || 1;
  const r = 30, c = 2 * Math.PI * r;
  const signedLen = (signed / total) * c;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 78 78" width="78" height="78" aria-hidden="true">
        <circle cx="39" cy="39" r={r} fill="none" stroke="var(--vui-color-secondary)" strokeWidth="9"/>
        <circle cx="39" cy="39" r={r} fill="none" stroke="var(--vui-color-primary)" strokeWidth="9"
          strokeDasharray={`${signedLen} ${c - signedLen}`} strokeLinecap="round"
          transform="rotate(-90 39 39)"/>
      </svg>
      <div className="donut-center"><b>{total}</b></div>
    </div>
  );
}

// ─── EVOLUTION CHART ────────────────────────────────────────────────────────
function EvolutionChart({ data }) {
  const W = 560, H = 130, padL = 22, padR = 6, padT = 8, padB = 18;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(...data.map(d => d.v), 4);
  const yTicks = [0, Math.round(max / 4), Math.round(max / 2), Math.round((3 * max) / 4), max].filter((v, i, a) => a.indexOf(v) === i);
  const x = (i) => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v) => padT + plotH - (v / max) * plotH;
  const linePts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(" ");
  const areaD = `M ${x(0).toFixed(1)},${(padT + plotH).toFixed(1)} L ` +
    data.map((d, i) => `${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(" L ") +
    ` L ${x(data.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)} Z`;
  return (
    <div className="chart-wrap">
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="New assets added each month">
        <defs>
          <linearGradient id="moAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,162,174,.22)"/>
            <stop offset="100%" stopColor="rgba(0,162,174,0)"/>
          </linearGradient>
        </defs>
        <g className="chart-grid">
          {yTicks.map(t => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)}/>
              <text className="chart-yl" x={padL - 6} y={y(t) + 3} textAnchor="end">{t}</text>
            </g>
          ))}
        </g>
        <path className="chart-area" d={areaD}/>
        <polyline className="chart-line" points={linePts}/>
        {data.map((d, i) => (i % 4 === 0 || i === data.length - 1) && (
          <text key={i} className="chart-xl" x={x(i)} y={H - 4} textAnchor="middle">{d.m}</text>
        ))}
      </svg>
    </div>
  );
}

// ─── REQUEST TABLE ──────────────────────────────────────────────────────────
function RequestTable() {
  const [top, setTop] = useState(10);
  const [page, setPage] = useState(0);
  const rows = TOP_REQUESTS.slice(0, top);
  const perPage = 5;
  const pageRows = rows.slice(page * perPage, page * perPage + perPage);
  const maxReq = Math.max(...TOP_REQUESTS.map(r => r.requests), 1);
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Most requested offers</h3>
          <p className="ph-sub">Access requests over the last 30 days</p>
        </div>
        <div className="seg" role="group" aria-label="Ranking depth">
          <button type="button" className={top === 10 ? "active" : ""} onClick={() => { setTop(10); setPage(0); }}>Top 10</button>
          <button type="button" className={top === 50 ? "active" : ""} onClick={() => { setTop(50); setPage(0); }}>Top 50</button>
        </div>
      </div>
      <div className="panel-body">
        <div className="req-table">
          <div className="req-row head"><span>Rank</span><span>Data asset</span><span>Requests</span></div>
          {pageRows.map(r => (
            <div className="req-row" key={r.rank}>
              <span className="req-rank">#{String(r.rank).padStart(2, "0")}</span>
              <span className="req-name"><span className="rn">{r.name}</span><span className="rk">{r.kind}</span></span>
              <span className="req-val">
                <span className="req-bar"><i style={{ width: `${(r.requests / maxReq) * 100}%` }}/></span>
                <span className="req-num">{r.requests}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="req-foot">
          <span className="req-page">Page {page + 1} of {pages}</span>
          <div className="req-pager">
            <button type="button" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Previous</button>
            <button type="button" className="solid" disabled={page >= pages - 1} onClick={() => setPage(p => Math.min(pages - 1, p + 1))}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ──────────────────────────────────────────────────────────────
function Dashboard({ onNavigate, onCreate }) {
  const total = EVOLUTION.reduce((a, d) => a + d.v, 0);
  return (
    <>
      <div className="mo-header">
        <div>
          <h2 className="mo-title">Overview</h2>
          <p className="mo-sub">Track how your published offers perform — requests, revenue and contract status at a glance.</p>
        </div>
      </div>

      <div className="dash-stats">
        <button type="button" className="stat-card" onClick={() => onNavigate("all")} style={{ textAlign: "left" }}>
          <div className="stat-top"><span className="stat-label">Number of offers</span><span className="stat-ic"><Icon name="offers" size={16}/></span></div>
          <div className="stat-value">{STATS.offers}</div>
          <div className="stat-foot"><span className="up">{COUNTS.data} data</span> · {COUNTS.infra} infrastructure</div>
        </button>
        <div className="stat-card">
          <div className="stat-top"><span className="stat-label">Total access requests</span><span className="stat-ic"><Icon name="inbox" size={16}/></span></div>
          <div className="stat-value">{STATS.requests}</div>
          <div className="stat-foot"><span className="up">▲ 9</span> vs previous 30 days</div>
        </div>
        <div className="stat-card">
          <div className="stat-top"><span className="stat-label">Revenue generated</span><span className="stat-ic"><Icon name="coin" size={16}/></span></div>
          <div className="stat-value">{STATS.revenue} €</div>
          <div className="stat-foot"><span className="up">▲ 12 €</span> this month</div>
        </div>
        <div className="stat-card contract">
          <Donut signed={STATS.contracts.signed} pending={STATS.contracts.pending}/>
          <div style={{ minWidth: 0 }}>
            <div className="contract-title">Contract status</div>
            <div className="contract-legend" style={{ marginTop: 8 }}>
              <div className="cl-row"><span className="cl-dot" style={{ background: "var(--vui-color-primary)" }}/><span className="cl-tx"><b>{STATS.contracts.signed}</b>Signed</span></div>
              <div className="cl-row"><span className="cl-dot" style={{ background: "var(--vui-color-secondary)" }}/><span className="cl-tx"><b>{STATS.contracts.pending}</b>Pending</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-cols">
        <RequestTable/>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Catalogue evolution</h3>
              <p className="ph-sub">New assets added each month</p>
            </div>
            <div className="mini-select">
              <select aria-label="Time range" defaultValue="all">
                <option value="all">All time</option>
                <option value="12m">Last 12 months</option>
                <option value="6m">Last 6 months</option>
              </select>
              <Icon name="chevronDown" size={13} className="ms-chev"/>
            </div>
          </div>
          <div className="panel-body">
            <EvolutionChart data={EVOLUTION}/>
            <div className="chart-foot">
              <div className="cf-item"><div className="cf-v">{total}</div><div className="cf-k">Assets total</div></div>
              <div className="cf-item"><div className="cf-v"><span className="pos">+0%</span></div><div className="cf-k">vs previous month</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="share-strip">
        <span className="ss-ic"><Icon name="share" size={22}/></span>
        <div className="ss-tx">
          <h4>Share data products &amp; services with VisionsTrust users</h4>
          <p>Publish a new offer to the catalogue and start receiving access requests from the data space.</p>
        </div>
        <button type="button" className="ss-cta" onClick={() => onCreate("offer")}><Icon name="plus" size={15}/> Add an offer</button>
      </div>
    </>
  );
}

// ─── ROW MENU (dropdown) ────────────────────────────────────────────────────
function RowMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const k = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="row-menu-btn" aria-haspopup="menu" aria-expanded={open} aria-label="More actions" onClick={() => setOpen(o => !o)}>
        <Icon name="more" size={18}/>
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          {items.map((it, i) => it.sep
            ? <div className="menu-sep" key={i} role="separator"/>
            : <button type="button" role="menuitem" key={i} className={`menu-item ${it.danger ? "danger" : ""}`} onClick={() => { setOpen(false); it.onClick && it.onClick(); }}>
                <Icon name={it.icon} size={15}/><span>{it.label}</span>
              </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── OFFER ROW ──────────────────────────────────────────────────────────────
function OfferRow({ offer, onOpen }) {
  const needsEditing = offer.status === "Draft" && (offer.progress || 0) < 100;
  const published = offer.status === "Published";
  const dot = KIND_DOT[offer.kind];
  const menu = offer.archived
    ? [{ label: "View details", icon: "eye", onClick: () => onOpen(offer) }, { label: "Restore", icon: "refresh" }, { sep: true }, { label: "Delete", icon: "trash", danger: true }]
    : published
      ? [{ label: "View details", icon: "eye", onClick: () => onOpen(offer) }, { label: "Open in catalogue", icon: "external" }, { label: "Duplicate", icon: "copy" }, { sep: true }, { label: "Archive", icon: "archive" }, { label: "Delete", icon: "trash", danger: true }]
      : [{ label: "Continue editing", icon: "edit" }, { label: "Duplicate", icon: "copy" }, { sep: true }, { label: "Delete", icon: "trash", danger: true }];
  return (
    <div className="off-row">
      <div className="off-mono" style={{ background: offer.accent }} aria-hidden="true">{moInit(offer.name)}</div>
      <div className="off-main">
        <h4 className="off-name" title={offer.name}>{offer.name}</h4>
        <div className="off-meta">
          <span className="kind-tag"><span className="kd" style={{ background: dot }}/>{offer.kind}</span>
          <span className="mdot"/>
          <span>{fmtShort(offer.date)}</span>
          {published && <><span className="mdot"/><span className="mi"><Icon name="shield" size={12}/>{offer.policies} {offer.policies > 1 ? "policies" : "policy"}</span></>}
          {published && <><span className="mdot"/><span className="mi"><Icon name="database" size={12}/>{offer.resources} {offer.resources > 1 ? "resources" : "resource"}</span></>}
          {offer.requests > 0 && <><span className="mdot"/><span className="mi"><Icon name="inbox" size={12}/>{offer.requests} requests</span></>}
        </div>
      </div>
      <div className="off-state">
        {published
          ? <span className="pill pill-success">● Published</span>
          : needsEditing
            ? <div className="off-progress"><span className="pb partial"><i style={{ width: `${offer.progress}%` }}/></span><span className="pv">{offer.progress}%</span></div>
            : <><span className="pill pill-warn">● Draft</span><div className="off-progress"><span className="pb"><i style={{ width: "100%" }}/></span><span className="pv">100%</span></div></>}
      </div>
      <div className="off-actions">
        {needsEditing
          ? <button type="button" className="off-cta edit"><Icon name="edit" size={14}/> Continue editing</button>
          : <button type="button" className="off-cta see" onClick={() => onOpen(offer)}>See offer</button>}
        <RowMenu items={menu}/>
      </div>
    </div>
  );
}

// ─── OFFERS VIEW ────────────────────────────────────────────────────────────
function OffersView({ filter, query, sort, onOpen, onCreate, tools }) {
  const apply = (list) => {
    let out = list;
    if (query.trim()) { const q = query.toLowerCase(); out = out.filter(o => o.name.toLowerCase().includes(q)); }
    if (sort === "newest") out = [...out].sort((a, b) => b.date.localeCompare(a.date));
    else if (sort === "az") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "requests") out = [...out].sort((a, b) => b.requests - a.requests);
    else out = [...out].sort((a, b) => (a.status === b.status ? 0 : a.status === "Published" ? -1 : 1));
    return out;
  };

  const heading = { all: "All offers", data: "Data offers", services: "Services offers", infra: "Infrastructure offers", archived: "Archived offers" }[filter];

  let sections;
  if (filter === "all") {
    sections = [
      { key: "Data", label: "Data offers", dot: KIND_DOT.Data, items: apply(byKind("Data")), createLabel: "New data offer" },
      { key: "Service", label: "Services offers", dot: KIND_DOT.Service, items: apply(byKind("Service")), createLabel: "New service offer" },
      { key: "Infrastructure", label: "Infrastructure offers", dot: KIND_DOT.Infrastructure, items: apply(byKind("Infrastructure")), createLabel: "New infrastructure offer" },
    ];
  } else if (filter === "archived") {
    sections = [{ key: "arch", label: "Archived offers", dot: "#646f88", items: apply(ARCHIVED), createLabel: null }];
  } else {
    const k = { data: "Data", services: "Service", infra: "Infrastructure" }[filter];
    sections = [{ key: k, label: heading, dot: KIND_DOT[k], items: apply(byKind(k)), createLabel: `New ${k.toLowerCase()} offer` }];
  }
  const totalShown = sections.reduce((a, s) => a + s.items.length, 0);

  return (
    <>
      <div className="mo-toolbar">
        <div className="mo-toolbar-left">
          <h2 className="mo-heading">{heading}</h2>
          <span className="mo-count">{totalShown} offer{totalShown !== 1 ? "s" : ""}{query.trim() ? ` for “${query.trim()}”` : ""}</span>
        </div>
        {tools}
      </div>

      {sections.map(sec => (
        <section className="mo-section" key={sec.key}>
          <div className="mo-section-head">
            <h3 className="mo-section-title"><span className="sec-dot" style={{ background: sec.dot }}/>{sec.label}<span className="sec-n">{sec.items.length}</span></h3>
            {sec.createLabel && <button type="button" className="mo-new-btn" onClick={() => onCreate(sec.key)}><Icon name="plus" size={14}/> {sec.createLabel}</button>}
          </div>
          {sec.items.length === 0 ? (
            sec.key === "Service" && !query.trim() ? (
              <div className="mo-empty">
                <span className="me-icon"><Icon name="tech" size={22}/></span>
                <h4>No service offers yet</h4>
                <p>Service offers let other participants call your APIs and processing services through the data space.</p>
                <button type="button" className="mo-new-btn me-cta" onClick={() => onCreate("Service")}><Icon name="plus" size={14}/> Create a service offer</button>
              </div>
            ) : (
              <div className="mo-empty"><span className="me-icon"><Icon name="search" size={20}/></span><h4>No match</h4><p>No offers match your search in this section.</p></div>
            )
          ) : (
            <div className="off-list">{sec.items.map(o => <OfferRow key={o.id} offer={o} onOpen={onOpen}/>)}</div>
          )}
        </section>
      ))}
    </>
  );
}

// ─── RESOURCE ROW ───────────────────────────────────────────────────────────
function ResourceRow({ res }) {
  const menu = [
    { label: "Edit resource", icon: "edit" },
    { label: "Duplicate", icon: "copy" },
    { label: "Use in an offer", icon: "offers" },
    { sep: true },
    { label: "Delete", icon: "trash", danger: true },
  ];
  return (
    <div className="res-row">
      <div className="res-mono" style={{ background: res.accent }} aria-hidden="true">0101<br/>0110</div>
      <div className="res-main">
        <div className="res-kind">{res.type}</div>
        <div className="res-name" title={res.name}>{res.name}</div>
        <div className="res-meta"><span>{res.format}</span><span className="mdot"/><span>Updated {fmtShort(res.updated)}</span></div>
      </div>
      <div className="res-used">{res.usedIn > 0 ? <>Used in <b>{res.usedIn}</b> offer{res.usedIn > 1 ? "s" : ""}</> : "Not used yet"}</div>
      <div className="off-actions">
        <button type="button" className="off-cta edit"><Icon name="edit" size={14}/> Edit</button>
        <RowMenu items={menu}/>
      </div>
    </div>
  );
}

// ─── RESOURCES VIEW ─────────────────────────────────────────────────────────
function ResourcesView({ filter, query, sort, onCreate, tools }) {
  const apply = (list) => {
    let out = list;
    if (query.trim()) { const q = query.toLowerCase(); out = out.filter(r => r.name.toLowerCase().includes(q)); }
    if (sort === "newest") out = [...out].sort((a, b) => b.updated.localeCompare(a.updated));
    else if (sort === "az") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    return out;
  };
  const heading = { "res-all": "Resources", "res-data": "Data resources", "res-services": "Service resources" }[filter];
  let sections;
  if (filter === "res-all") {
    sections = [
      { key: "Data", label: "Data resources", dot: KIND_DOT.Data, items: apply(resByType("Data")) },
      { key: "Service", label: "Service resources", dot: KIND_DOT.Service, items: apply(resByType("Service")) },
    ];
  } else {
    const t = filter === "res-data" ? "Data" : "Service";
    sections = [{ key: t, label: heading, dot: KIND_DOT[t], items: apply(resByType(t)) }];
  }
  const totalShown = sections.reduce((a, s) => a + s.items.length, 0);
  return (
    <>
      <div className="mo-toolbar">
        <div className="mo-toolbar-left">
          <h2 className="mo-heading">{heading}</h2>
          <span className="mo-count">{totalShown} resource{totalShown !== 1 ? "s" : ""}{query.trim() ? ` for “${query.trim()}”` : ""}</span>
        </div>
        {tools}
      </div>
      <div className="banner info" style={{ marginBottom: 20 }}>
        <Icon name="info" size={16}/>
        <div><strong>Resources</strong> are the building blocks of your offers — the actual data sources and services you expose. Attach them to one or more offers to publish them.</div>
      </div>
      {sections.map(sec => (
        <section className="mo-section" key={sec.key}>
          <div className="mo-section-head">
            <h3 className="mo-section-title"><span className="sec-dot" style={{ background: sec.dot }}/>{sec.label}<span className="sec-n">{sec.items.length}</span></h3>
            <button type="button" className="mo-new-btn" onClick={() => onCreate("resource")}><Icon name="plus" size={14}/> New {sec.key.toLowerCase()} resource</button>
          </div>
          {sec.items.length === 0 ? (
            <div className="mo-empty"><span className="me-icon"><Icon name="search" size={20}/></span><h4>No match</h4><p>No resources match your search in this section.</p></div>
          ) : (
            <div className="off-list">{sec.items.map(r => <ResourceRow key={r.id} res={r}/>)}</div>
          )}
        </section>
      ))}
    </>
  );
}

// ─── HELPER / AI PANELS ─────────────────────────────────────────────────────
function HelperPanel({ onCreate }) {
  const items = [
    { t: "Publish your first data offer", a: () => onCreate("offer") },
    { t: "Create a resource and attach it", a: () => onCreate("resource") },
    { t: "Set up an infrastructure offer", a: () => onCreate("Infrastructure") },
    { t: "Understand contract statuses", a: null },
  ];
  return (
    <div className="helper">
      <div className="helper-icon"><Icon name="sparkle" size={22}/></div>
      <h3 className="helper-title">Offers helper</h3>
      <p className="helper-desc">Guidance for publishing offers, managing resources and turning access requests into signed contracts.</p>
      <h4 className="helper-subtitle">What would you like to do?</h4>
      <div className="helper-actions">
        {items.map((it, i) => <button type="button" key={i} className="helper-action" onClick={it.a || undefined}><Icon name="plus" size={14}/><span>{it.t}</span></button>)}
      </div>
    </div>
  );
}
function AiPanel() {
  const [msg, setMsg] = useState("");
  const prompts = ["Which of my offers get the most requests?", "Why is an offer still a draft?", "How do I price a data offer?"];
  return (
    <div className="ai">
      <div className="helper-icon"><Icon name="sparkle" size={22}/></div>
      <h3 className="helper-title">Offers assistant</h3>
      <p className="helper-desc">Ask about your offers, resources, requests and contracts.</p>
      <h4 className="helper-subtitle">Try asking</h4>
      <div className="ai-prompts">
        {prompts.map((p, i) => <button type="button" key={i} className="ai-prompt" onClick={() => setMsg(p)}><span>{p}</span><Icon name="chevronRight" size={14}/></button>)}
      </div>
      <div className="ai-composer">
        <input className="ai-input" aria-label="Ask the offers assistant" placeholder="Ask about your offers…" value={msg} onChange={e => setMsg(e.target.value)}/>
        <button type="button" className="ai-send" disabled={!msg.trim()} aria-label="Send"><Icon name="chevronRight" size={16}/></button>
      </div>
    </div>
  );
}

// ─── CONTEXTUAL SIDEBAR ─────────────────────────────────────────────────────
function OffersNav({ active, onSelect, collapsed, onToggleCollapse, view, onView, onCreate }) {
  const tab = NAV_TABS.find(t => t.id === view) || NAV_TABS[0];
  const onTabKey = (e) => {
    const idx = NAV_TABS.findIndex(t => t.id === view);
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % NAV_TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + NAV_TABS.length) % NAV_TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = NAV_TABS.length - 1;
    if (next !== null) { e.preventDefault(); const id = NAV_TABS[next].id; onView(id); const el = e.currentTarget.querySelector(`[data-tab-id="${id}"]`); if (el) el.focus(); }
  };

  const navItem = (id, label, icon, opts = {}) => (
    <button key={id} type="button"
      className={`nav-item ${active === id ? "active" : ""}`}
      aria-current={active === id ? "true" : undefined}
      disabled={opts.disabled}
      onClick={() => !opts.disabled && onSelect(id)}
      aria-label={collapsed ? `${label} (${COUNTS[id] ?? 0})` : undefined}>
      <Icon name={icon} size={16}/>
      {!collapsed && <span className="nav-item-label">{label}</span>}
      {!collapsed && COUNTS[id] !== undefined && <span className="nav-count">{COUNTS[id]}</span>}
    </button>
  );

  return (
    <nav className={`settings-nav ${collapsed ? "is-collapsed" : ""} view-${view}`} aria-label="My Offers tools">
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
              <button key={t.id} type="button" role="tab" id={`mo-tab-${t.id}`} data-tab-id={t.id} aria-selected={view === t.id} aria-controls="mo-tabpanel" tabIndex={view === t.id ? 0 : -1} className={`snav-tab ${view === t.id ? "active" : ""}`} onClick={() => onView(t.id)}>
                <Icon name={t.icon} size={13}/><span>{t.label}</span>
              </button>
            ))}
          </div>
        )}
        {collapsed && (
          <div className="snav-tabs-vertical" role="tablist" aria-label="Sidebar mode" onKeyDown={onTabKey}>
            {NAV_TABS.map(t => (
              <button key={t.id} type="button" role="tab" id={`mo-tab-${t.id}`} data-tab-id={t.id} aria-selected={view === t.id} aria-controls="mo-tabpanel" tabIndex={view === t.id ? 0 : -1} aria-label={t.label} className={`snav-tab-icon ${view === t.id ? "active" : ""}`} onClick={() => onView(t.id)}>
                <Icon name={t.icon} size={14}/>
              </button>
            ))}
          </div>
        )}
        {view === "manage" && (
          collapsed
            ? <button type="button" className="snav-primary-icon" onClick={() => onCreate("offer")} aria-label="Add an offer"><Icon name="plus" size={16}/></button>
            : <button type="button" className="snav-primary" onClick={() => onCreate("offer")}><Icon name="plus" size={14}/><span>Add an offer</span></button>
        )}
      </div>

      <div className="settings-nav-scroll" id="mo-tabpanel" role="tabpanel" aria-labelledby={`mo-tab-${view}`} tabIndex={0}>
        {view === "manage" && (
          <>
            {!collapsed && (
              <div className="nav-group qa-group">
                <div className="nav-group-label">Quick actions</div>
                <div className="qa-grid">
                  <button type="button" className="qa-btn" onClick={() => onCreate("resource")}><span className="qa-ic"><Icon name="resources" size={15}/></span>New resource</button>
                  <button type="button" className="qa-btn" onClick={() => onCreate("Infrastructure")}><span className="qa-ic"><Icon name="layers" size={15}/></span>New infra offer</button>
                  <button type="button" className="qa-btn" onClick={() => onCreate("import")}><span className="qa-ic"><Icon name="upload" size={15}/></span>Import data</button>
                  <a className="qa-btn" href="Catalogue.html"><span className="qa-ic"><Icon name="catalogue" size={15}/></span>Open catalogue</a>
                </div>
              </div>
            )}

            <div className="nav-group">
              {!collapsed && <div className="nav-group-label">Offers</div>}
              {collapsed && <div className="nav-group-divider" aria-hidden="true"/>}
              {navItem("overview", "Overview", "chart")}
              {navItem("all", "All offers", "offers")}
              {navItem("data", "Data", "database")}
              {navItem("services", "Services", "tech")}
              {navItem("infra", "Infrastructure", "layers")}
              {navItem("archived", "Archived", "archive", { disabled: COUNTS.archived === 0 })}
            </div>

            <div className="nav-group">
              {!collapsed && <div className="nav-group-label">Resources</div>}
              {collapsed && <div className="nav-group-divider" aria-hidden="true"/>}
              {navItem("res-all", "All resources", "resources")}
              {navItem("res-data", "Data", "database")}
              {navItem("res-services", "Services", "tech")}
            </div>
          </>
        )}
        {view === "helper" && !collapsed && <HelperPanel onCreate={onCreate}/>}
        {view === "ai" && !collapsed && <AiPanel/>}
        {view !== "manage" && collapsed && (
          <button type="button" className="snav-expand-hint" onClick={onToggleCollapse} aria-label="Expand to view"><Icon name="chevronRight" size={14}/></button>
        )}
      </div>
    </nav>
  );
}

// ─── OFFER DETAIL DRAWER ────────────────────────────────────────────────────
function OfferDrawer({ offer, onClose }) {
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus(); };
  }, []);
  if (!offer) return null;
  const dot = KIND_DOT[offer.kind];
  const published = offer.status === "Published";
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <aside ref={drawerRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="off-drawer-title">
        <div className="drawer-bar">
          <button ref={closeRef} type="button" className="di-btn" onClick={onClose} aria-label="Close panel"><Icon name="chevronRight" size={18}/></button>
          <div className="spacer"/>
          <button type="button" className="di-btn" aria-label="Open in catalogue"><Icon name="external" size={16}/></button>
        </div>
        <div className="drawer-scroll">
          <div className="drawer-hero">
            <div className="drawer-banner" style={{ background: `linear-gradient(135deg, ${hexToRgba(offer.accent, 0.20)}, ${hexToRgba(offer.accent, 0.05)})` }} aria-hidden="true">
              <span className="cat-type"><span className="dot" style={{ background: dot }}/>{offer.kind}</span>
              <div className="cat-logo" style={{ color: offer.accent }}>{moInit(offer.name)}</div>
            </div>
            <div className="drawer-status" style={{ marginBottom: 8 }}>
              {published ? <span className="pill pill-success">● Published</span> : <span className="pill pill-warn">● Draft · {offer.progress || 0}%</span>}
            </div>
            <h2 className="drawer-title" id="off-drawer-title">{offer.name}</h2>
            <p className="drawer-subtitle">Created {fmtDate(offer.date)}</p>
          </div>

          <div className="drawer-section">
            <h3>Performance</h3>
            <p className="ds-sub">Activity over the last 30 days.</p>
            <div className="detail-grid">
              <div className="detail-item"><span className="dt-k">Access requests</span><span className="dt-v">{offer.requests}</span></div>
              <div className="detail-item"><span className="dt-k">Revenue</span><span className="dt-v">{offer.revenue ? `${offer.revenue} €` : "—"}</span></div>
              <div className="detail-item"><span className="dt-k">Contract</span><span className="dt-v">{offer.contract || "—"}</span></div>
              <div className="detail-item"><span className="dt-k">Pricing</span><span className="dt-v">{offer.price ? `${offer.price.amount}${offer.price.period ? " / " + offer.price.period.toLowerCase() : ""}` : "Free"}</span></div>
            </div>
          </div>

          <div className="drawer-section">
            <h3>Configuration</h3>
            <div className="kv-list">
              <div className="kv-row"><span className="kv-k">Type</span><span className="kv-v">{offer.kind}</span></div>
              <div className="kv-row"><span className="kv-k">Policies</span><span className="kv-v">{offer.policies}</span></div>
              <div className="kv-row"><span className="kv-k">Resources attached</span><span className="kv-v">{offer.resources}</span></div>
              <div className="kv-row"><span className="kv-k">Visibility</span><span className="kv-v">{published ? "Public · in catalogue" : "Private · not published"}</span></div>
            </div>
          </div>

          <div className="drawer-section">
            <h3>Content</h3>
            <p className="ds-sub">Resources included in this offer.</p>
            {Array.from({ length: offer.resources }).map((_, i) => (
              <div className="resource-row" key={i}>
                <div className="rr-icon" style={{ background: offer.accent }}><Icon name={offer.kind === "Service" ? "tech" : "database"} size={20}/></div>
                <div><div className="rr-name">{offer.name}{offer.resources > 1 ? ` — part ${i + 1}` : ""}</div><div className="rr-type">{offer.kind} resource</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="drawer-foot">
          <button type="button" className="share" aria-label="Duplicate"><Icon name="copy" size={18}/></button>
          <button type="button" className="use-btn"><Icon name="edit" size={16}/> {published ? "Edit offer" : "Continue editing"}</button>
        </div>
      </aside>
    </>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────
function MyOffersApp() {
  const [active, setActive] = useState("overview");
  const [view, setView] = useState("manage");
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("vt.moSnav") === "1"; } catch (e) { return false; } });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("status");
  const [navOpen, setNavOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => { try { localStorage.setItem("vt.moSnav", collapsed ? "1" : "0"); } catch (e) {} }, [collapsed]);
  useEffect(() => { setQuery(""); }, [active]);

  const onCreate = (what) => {
    const labels = { offer: "a new offer", resource: "a new resource", Infrastructure: "a new infrastructure offer", Service: "a new service offer", Data: "a new data offer", import: "a data import" };
    alert(`Create ${labels[what] || what} — flow would open here.`);
  };

  const isResources = active.startsWith("res-");
  const resSort = sort === "status" ? "newest" : sort;

  return (
    <div className="app ui-v2 myoffers-app">
      <a href="#mo-main" className="skip-link">Skip to content</a>
      <AppSidebar variant="v2" activeId="offers"/>
      <div className="main">
        <header className="topbar cat-topbar">
          <div className="topbar-left">
            <button type="button" className="icon-btn ghost only-mobile" onClick={() => setNavOpen(true)} aria-label="Open offers menu"><Icon name="offers" size={18}/></button>
            <div className="page-title"><Icon name="offers" size={20}/><h1>My Offers <span style={{ color: "var(--text-faint)", fontWeight: 600 }}>({STATS.offers})</span></h1></div>
          </div>
          <div className="topbar-right">
            <button type="button" className="topbar-create hide-mobile" onClick={() => onCreate("offer")}><Icon name="plus" size={15}/><span>Add an offer</span></button>
            <button type="button" className="topbar-help hide-mobile"><Icon name="help" size={16}/><span>Help</span></button>
            <button type="button" className="icon-btn ghost notif" aria-label="Notifications, 53 unread"><Icon name="bell" size={18}/><span className="notif-dot" aria-hidden="true">53</span></button>
            <button type="button" className="icon-btn user-btn" aria-label="Account"><Icon name="user" size={18}/></button>
          </div>
        </header>

        <div className="page">
          <div className={`settings-nav-wrap ${navOpen ? "open" : ""}`}>
            <OffersNav
              active={active}
              onSelect={(id) => { setActive(id); setNavOpen(false); }}
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed(c => !c)}
              view={view}
              onView={setView}
              onCreate={onCreate}
            />
            {navOpen && <div className="settings-nav-scrim" onClick={() => setNavOpen(false)}/>}
          </div>

          <main className="content mo-content" id="mo-main" tabIndex={-1}>
            <div className="mo-inner">
              {active === "overview" ? (
                <Dashboard onNavigate={setActive} onCreate={onCreate}/>
              ) : isResources ? (
                <ResourcesView filter={active} query={query} sort={resSort} onCreate={onCreate}
                  tools={<ToolbarTools query={query} setQuery={setQuery} sort={resSort} setSort={setSort} isRes/>}/>
              ) : (
                <OffersView filter={active} query={query} sort={sort} onOpen={setSelected} onCreate={onCreate}
                  tools={<ToolbarTools query={query} setQuery={setQuery} sort={sort} setSort={setSort}/>}/>
              )}
            </div>
          </main>
        </div>
      </div>

      <BottomNav onOpenMore={() => setMoreOpen(true)}/>
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)}/>
      {selected && <OfferDrawer offer={selected} onClose={() => setSelected(null)}/>}
    </div>
  );
}

// Search + sort tools, rendered as a floating bar pinned to the toolbar row.
function ToolbarTools({ query, setQuery, sort, setSort, isRes }) {
  return (
    <div className="mo-toolbar-right" style={{ marginLeft: "auto" }}>
      <div className="mo-search">
        <Icon name="search" size={15}/>
        <input type="text" placeholder={isRes ? "Search resources…" : "Search offers…"} value={query} onChange={e => setQuery(e.target.value)} aria-label="Search"/>
        {query && <button type="button" className="mo-search-clear" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="x" size={14}/></button>}
      </div>
      <div className="sort-wrap">
        <label htmlFor="mo-sort" className="sr-only">Sort by</label>
        <select id="mo-sort" className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
          {!isRes && <option value="status">Status</option>}
          <option value="newest">Newest</option>
          <option value="az">Name A–Z</option>
          {!isRes && <option value="requests">Most requested</option>}
        </select>
        <Icon name="chevronDown" size={14} className="sort-chev"/>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<MyOffersApp/>);
})();
