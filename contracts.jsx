// VisionsTrust — My Contracts page (V2 UX). Reuses window.UI shell + window.ContractsData.
(function() {
const { useState, useEffect, useMemo, useRef } = React;
const { Icon } = window.UI;
const { CONTRACTS, STATUS_META, YOU } = window.ContractsData;
const { hexToRgba } = window.CatData;

const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
const fmtShort = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const initials = (n) => n.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "·";


// ─── derived collections ────────────────────────────────────────────────────
const byStatus = (s) => CONTRACTS.filter(c => c.status === s);
const needsYou = CONTRACTS.filter(c => c.needsYou);
const asOrch = CONTRACTS.filter(c => c.role === "orchestrator");
const asPart = CONTRACTS.filter(c => c.role === "participant");

const COUNTS = {
  all: CONTRACTS.length,
  needs: needsYou.length,
  to_sign: byStatus("to_sign").length,
  pending: byStatus("pending").length,
  signed: byStatus("signed").length,
  expired: byStatus("expired").length,
  "role-orch": asOrch.length,
  "role-part": asPart.length,
};

// ─── ATOMS ──────────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const m = STATUS_META[status];
  return <span className={`pill pill-${m.tone === "muted" ? "default" : m.tone}`}><Icon name={m.icon} size={12}/>{m.label}</span>;
}

function SigAvatars({ signatories, max = 4 }) {
  const shown = signatories.slice(0, max);
  const extra = signatories.length - shown.length;
  return (
    <div className="sig-avatars" aria-hidden="true">
      {shown.map((s, i) => (
        <span key={i} className={`sig-av ${s.signed ? "signed" : "missing"} ${s.name === YOU ? "you" : ""}`} title={`${s.name} — ${s.signed ? "signed" : "missing signature"}`}>
          {initials(s.name)}
          <span className={`sig-badge ${s.signed ? "ok" : "no"}`}><Icon name={s.signed ? "check" : "x"} size={7}/></span>
        </span>
      ))}
      {extra > 0 && <span className="sig-av-more">+{extra}</span>}
    </div>
  );
}

function SigRing({ signed, total }) {
  const pct = total ? signed / total : 0;
  const r = 27, c = 2 * Math.PI * r, len = pct * c;
  const full = signed === total;
  return (
    <div className="ct-sig-ring">
      <svg viewBox="0 0 66 66" width="66" height="66" aria-hidden="true">
        <circle cx="33" cy="33" r={r} fill="none" stroke="var(--bg-2)" strokeWidth="7"/>
        <circle cx="33" cy="33" r={r} fill="none" stroke={full ? "var(--success)" : "var(--vui-color-primary)"} strokeWidth="7"
          strokeDasharray={`${len} ${c - len}`} strokeLinecap="round" transform="rotate(-90 33 33)"/>
      </svg>
      <div className="rc">{signed}/{total}</div>
    </div>
  );
}

// ─── ROW MENU ────────────────────────────────────────────────────────────────
function RowMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const k = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
      <button type="button" className="row-menu-btn" aria-haspopup="menu" aria-expanded={open} aria-label="More actions" onClick={() => setOpen(o => !o)}>
        <Icon name="more" size={18}/>
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          {items.map((it, i) => it.sep
            ? <div className="menu-sep" key={i} role="separator"/>
            : <button type="button" role="menuitem" key={i} className={`menu-item ${it.danger ? "danger" : ""}`} onClick={() => { setOpen(false); it.onClick && it.onClick(); }}>
                <Icon name={it.icon} size={15}/><span>{it.label}</span>
              </button>)}
        </div>
      )}
    </div>
  );
}

// ─── CONTRACT ROW ─────────────────────────────────────────────────────────────
function ContractRow({ c, onOpen, onSign }) {
  const full = c.signedCount === c.total;
  const stalled = c.status === "to_sign" || (c.status === "pending" && !full);
  // An expired contract can no longer be signed — it stays readable only.
  const signable = c.needsYou && c.status !== "expired";
  return (
    <div role="button" tabIndex={0} className={`ct-row ${c.needsYou ? "needs" : ""}`} onClick={() => onOpen(c)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(c); } }}>
      <div className="ct-mono" style={{ background: c.accent }} aria-hidden="true">{initials(c.name)}</div>

      <div className="ct-main">
        <div className="ct-name-row">
          <span className="ct-name" title={c.name}>{c.name}</span>
          <StatusPill status={c.status}/>
        </div>
        <div className="ct-meta">
          <span className="role-tag"><Icon name={c.role === "orchestrator" ? "share" : "team"} size={12}/>{c.role === "orchestrator" ? "You orchestrate" : "You participate"}</span>
          <span className="mdot"/>
          <span className="mi"><Icon name="building" size={12}/>{c.orchestrator}</span>
          <span className="mdot"/>
          <span className="mi"><Icon name="clock" size={12}/>{fmtShort(c.created)}</span>
        </div>
        <div className="ct-sigline">
          <span className={`ct-sig-count ${full ? "done" : ""}`}>{c.signedCount}/{c.total} signed</span>
          <div className={`ct-progress ${full ? "full" : stalled ? "stalled" : ""}`}><i style={{ width: `${(c.signedCount / c.total) * 100}%` }}/></div>
          <SigAvatars signatories={c.signatories}/>
        </div>
      </div>

      <div className="ct-actions">
        {signable
          ? <button type="button" className="ct-cta sign" onClick={(e) => { e.stopPropagation(); onSign(c); }}><Icon name="pen" size={14}/> View & sign</button>
          : <button type="button" className="ct-cta view" onClick={(e) => { e.stopPropagation(); onOpen(c); }}><Icon name="eye" size={14}/> View</button>}
      </div>
    </div>
  );
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
function Overview({ onNavigate, onOpen, onSign }) {
  const recent = [...CONTRACTS].sort((a, b) => b.created.localeCompare(a.created)).slice(0, 4);
  return (
    <>
      <div className="ct-stats">
        <button type="button" className="ct-stat" onClick={() => onNavigate("all")}>
          <div className="ct-stat-top"><span className="ct-stat-label">Total contracts</span><span className="ct-stat-ic"><Icon name="contracts" size={16}/></span></div>
          <div className="ct-stat-value">{COUNTS.all}</div>
          <div className="ct-stat-foot">{COUNTS["role-orch"]} orchestrated · {COUNTS["role-part"]} joined</div>
        </button>
        <button type="button" className="ct-stat alert" onClick={() => onNavigate("needs")}>
          <div className="ct-stat-top"><span className="ct-stat-label">Awaiting your signature</span><span className="ct-stat-ic"><Icon name="pen" size={16}/></span></div>
          <div className="ct-stat-value">{COUNTS.needs}</div>
          <div className="ct-stat-foot">Action required from you</div>
        </button>
        <button type="button" className="ct-stat" onClick={() => onNavigate("pending")}>
          <div className="ct-stat-top"><span className="ct-stat-label">Pending partners</span><span className="ct-stat-ic"><Icon name="hourglass" size={16}/></span></div>
          <div className="ct-stat-value">{COUNTS.pending}</div>
          <div className="ct-stat-foot">Waiting on other signatories</div>
        </button>
        <button type="button" className="ct-stat" onClick={() => onNavigate("signed")}>
          <div className="ct-stat-top"><span className="ct-stat-label">Signed &amp; active</span><span className="ct-stat-ic"><Icon name="check" size={16}/></span></div>
          <div className="ct-stat-value">{COUNTS.signed}</div>
          <div className="ct-stat-foot">Fully executed agreements</div>
        </button>
      </div>

      {needsYou.length > 0 && (
        <div className="ct-priority">
          <div className="ct-priority-head">
            <span className="pri-ic"><Icon name="pen" size={20}/></span>
            <div className="pri-tx">
              <h3>Needs your signature</h3>
              <p>Sign these to unblock your partners and activate the agreements.</p>
            </div>
            <span className="pri-count">{needsYou.length}</span>
          </div>
          <div className="ct-priority-list">
            {needsYou.map(c => (
              <div className="ct-pri-row" key={c.id}>
                <div className="ct-pri-mono" style={{ background: c.accent }} aria-hidden="true">{initials(c.name)}</div>
                <div className="ct-pri-main">
                  <div className="ct-pri-name">{c.name}</div>
                  <div className="ct-pri-meta">
                    <StatusPill status={c.status}/>
                    <span className="mdot"/>
                    <span>{c.signedCount}/{c.total} signed</span>
                    <span className="mdot"/>
                    <span>{c.orchestrator}</span>
                  </div>
                </div>
                <div className="ct-actions">
                  <button type="button" className="ct-cta view" onClick={() => onOpen(c)}><Icon name="eye" size={14}/> Details</button>
                  <button type="button" className="ct-cta sign" onClick={() => onSign(c)}><Icon name="pen" size={14}/> Sign</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="ct-section">
        <div className="ct-section-head">
          <h3 className="ct-section-title"><Icon name="clock" size={16}/>Recent contracts</h3>
          <button type="button" className="mo-new-btn" onClick={() => onNavigate("all")}>View all <Icon name="arrowRight" size={14}/></button>
        </div>
        <div className="ct-list">
          {recent.map(c => <ContractRow key={c.id} c={c} onOpen={onOpen} onSign={onSign}/>)}
        </div>
      </section>
    </>
  );
}

// ─── LIST VIEW ────────────────────────────────────────────────────────────────
const HEADINGS = {
  all: "All contracts", needs: "Awaiting your signature",
  to_sign: "To sign", pending: "Pending", signed: "Signed", expired: "Expired",
  "role-orch": "Contracts you orchestrate", "role-part": "Contracts you participate in",
};

function ContractsView({ filter, query, sort, onOpen, onSign, tools }) {
  const base = {
    all: CONTRACTS, needs: needsYou,
    to_sign: byStatus("to_sign"), pending: byStatus("pending"), signed: byStatus("signed"), expired: byStatus("expired"),
    "role-orch": asOrch, "role-part": asPart,
  }[filter] || CONTRACTS;

  let list = base;
  if (query.trim()) { const q = query.toLowerCase(); list = list.filter(c => c.name.toLowerCase().includes(q) || c.orchestrator.toLowerCase().includes(q) || c.id.includes(q)); }
  const STATUS_ORDER = { to_sign: 0, pending: 1, signed: 2, expired: 3 };
  if (sort === "newest") list = [...list].sort((a, b) => b.created.localeCompare(a.created));
  else if (sort === "oldest") list = [...list].sort((a, b) => a.created.localeCompare(b.created));
  else if (sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  else list = [...list].sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || b.created.localeCompare(a.created));

  return (
    <>
      <div className="ct-toolbar">
        <div className="ct-toolbar-left">
          <span className="ct-count">{list.length} contract{list.length !== 1 ? "s" : ""}{query.trim() ? ` for “${query.trim()}”` : ""}</span>
        </div>
        {tools}
      </div>

      {list.length === 0 ? (
        <div className="ct-empty">
          <span className="ce-icon"><Icon name={query.trim() ? "search" : "check"} size={22}/></span>
          <h4>{query.trim() ? "No match" : "Nothing here"}</h4>
          <p>{query.trim() ? "No contracts match your search in this view." : "You're all caught up — no contracts in this category."}</p>
        </div>
      ) : (
        <div className="ct-list">{list.map(c => <ContractRow key={c.id} c={c} onOpen={onOpen} onSign={onSign}/>)}</div>
      )}
    </>
  );
}

// ─── CONTEXTUAL RAIL (same structure as Offer settings) ──────────────────────
const RAIL = [
  { group: "My baseline", items: [
    { id: "bl-offer", name: "Offer baseline", icon: "offers" },
    { id: "bl-acc", name: "Acceptance baseline", icon: "cart" },
  ] },
  { group: "Contracts", items: [
    { id: "overview", name: "Overview", icon: "chart" },
    { id: "all", name: "All contracts", icon: "contracts" },
    { id: "needs", name: "Awaiting you", icon: "pen", alert: true },
  ] },
  { group: "Status", items: [
    { id: "to_sign", name: "To sign", icon: "pen" },
    { id: "pending", name: "Pending", icon: "hourglass" },
    { id: "signed", name: "Signed", icon: "check" },
    { id: "expired", name: "Expired", icon: "clock" },
  ] },
  { group: "Your role", items: [
    { id: "role-orch", name: "As orchestrator", icon: "share" },
    { id: "role-part", name: "As participant", icon: "team" },
  ] },
];
const PANEL_HEAD = {
  "bl-offer": { title: "Offer baseline", desc: "The default terms you publish on your own offers — pricing, usage policies and the clauses you propose. Every new offer starts from here." },
  "bl-acc": { title: "Acceptance baseline", desc: "What you are willing to accept when you subscribe to someone else's offer. Gaps against it are flagged in the basket." },
  overview: { title: "Contracts overview", desc: "Every agreement across the data space — what needs your signature, what waits on partners, what is active." },
};
const railHead = (id) => PANEL_HEAD[id] || { title: HEADINGS[id] || "Contracts", desc: "Open a contract to review its terms, participants and signature progress." };

function ContractsNav({ active, onSelect }) {
  return (
    <nav className="os-rail" aria-label="My Contracts categories">
      {RAIL.map((g) => (
        <React.Fragment key={g.group}>
          <div className="os-rail-glabel">{g.group}</div>
          {g.items.map((it) => {
            const n = COUNTS[it.id];
            const disabled = n === 0 && it.id === "expired";
            return (
              <button key={it.id} type="button" className={`os-rail-item ${active === it.id ? "active" : ""}`} disabled={disabled} aria-current={active === it.id ? "true" : undefined} onClick={() => !disabled && onSelect(it.id)}>
                <span className="os-rail-ic"><Icon name={it.icon} size={16}/></span>
                <span className="os-rail-name">{it.name}</span>
                {n !== undefined && n > 0 && <span className={it.alert ? "os-rail-warn" : "os-rail-badge"}>{n}</span>}
              </button>
            );
          })}
        </React.Fragment>
      ))}
    </nav>
  );
}

// ─── CONTRACT DETAIL DRAWER ─────────────────────────────────────────────────
function ContractDrawer({ contract, focusSign, onClose }) {
  const closeRef = useRef(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const prev = document.activeElement;
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus(); };
  }, []);
  if (!contract) return null;
  const c = contract;
  const m = STATUS_META[c.status];
  const copy = () => { navigator.clipboard?.writeText(c.id); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  const full = c.signedCount === c.total;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="ct-drawer-title">
        <div className="drawer-bar">
          <button ref={closeRef} type="button" className="di-btn" onClick={onClose} aria-label="Close panel"><Icon name="chevronRight" size={18}/></button>
          <div className="spacer"/>
          <a className="di-btn" href={`Contract.html?id=${c.id}`} aria-label="Open full page" title="Open full page"><Icon name="external" size={16}/></a>
          <button type="button" className="di-btn" aria-label="Download PDF"><Icon name="download" size={16}/></button>
        </div>

        <div className="drawer-scroll">
          <div className="ct-drawer-head">
            <div className="ct-drawer-status">
              <StatusPill status={c.status}/>
              <span className="pill pill-primary"><Icon name={c.role === "orchestrator" ? "share" : "team"} size={12}/>{c.role === "orchestrator" ? "You orchestrate" : "You participate"}</span>
            </div>
            <h2 className="ct-drawer-title" id="ct-drawer-title">{c.name}</h2>
            <p className="ct-drawer-sub">
              <span className="mi">Created {fmtDate(c.created)}</span>
              <span className="mdot"/>
              <span className="mi">Orchestrated by <strong style={{ color: "var(--vui-color-secondary)" }}>{c.orchestrator}</strong></span>
            </p>
            <a className="ct-fullpage" href={`Contract.html?id=${c.id}`}><Icon name="external" size={14}/> Open the full contract page<span>terms, signatures, exit procedure</span></a>
          </div>

          {c.needsYou && (
            <div className="drawer-section" style={{ borderTop: "none", paddingTop: 4 }}>
              <div className="ct-note" style={{ borderColor: "#f0dca6", background: "var(--warn-soft)", color: "#9a6a12" }}>
                <Icon name="pen" size={16}/>
                <span><strong>Your signature is required.</strong> Review the terms and sign to activate this contract.</span>
              </div>
            </div>
          )}

          <div className="drawer-section">
            <h3>Signature progress</h3>
            <p className="ds-sub">{full ? "All parties have signed — this contract is fully executed." : `${c.total - c.signedCount} of ${c.total} signatures still missing.`}</p>
            <div className="ct-sig-hero">
              <SigRing signed={c.signedCount} total={c.total}/>
              <div className="sh-tx">
                <div className="sh-big">{c.signedCount} of {c.total} parties signed</div>
                <div className="sh-sub">{full ? "Nothing left to do." : c.missing.map(n => n === YOU ? "you" : n).join(", ") + " still to sign."}</div>
              </div>
            </div>
          </div>

          <div className="drawer-section">
            <h3>Signatories</h3>
            <p className="ds-sub">Orchestrator and participants on this agreement.</p>
            <div className="sig-list">
              {c.signatories.map((s, i) => (
                <div className="sig-row" key={i}>
                  <div className={`sr-av ${s.signed ? "signed" : "missing"}`}>{initials(s.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="sr-name">{s.name}{s.name === YOU && <span className="sr-you">You</span>}</div>
                    <div className="sr-role">{s.isOrch ? "Orchestrator" : "Participant"}</div>
                  </div>
                  <span className={`sig-state ${s.signed ? "ok" : "no"}`}>
                    <Icon name={s.signed ? "check" : "x"} size={13}/>{s.signed ? "Signed" : "Missing"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="drawer-section">
            <h3>Contract details</h3>
            <p className="ds-sub">{c.purpose}</p>
            <div className="kv-list">
              <div className="kv-row"><span className="kv-k">Your contributions</span><span className="kv-v">{c.contributions > 0 ? `${c.contributions} contribution${c.contributions > 1 ? "s" : ""}` : "No contribution"}</span></div>
              <div className="kv-row"><span className="kv-k">Data resources</span><span className="kv-v">{c.dataResources}</span></div>
              <div className="kv-row"><span className="kv-k">Services</span><span className="kv-v">{c.services}</span></div>
              <div className="kv-row"><span className="kv-k">Participants</span><span className="kv-v">{c.total}</span></div>
            </div>
          </div>

          <div className="drawer-section">
            <h3>Contract ID</h3>
            <div className="ct-idfield">
              <code>{c.id}</code>
              <button type="button" onClick={copy}><Icon name={copied ? "check" : "copy"} size={14}/>{copied ? "Copied" : "Copy"}</button>
            </div>
          </div>
        </div>

        <div className="drawer-foot">
          <button type="button" className="share" aria-label="Download PDF"><Icon name="download" size={18}/></button>
          {c.needsYou
            ? <a className="use-btn" style={{ background: "var(--vui-color-primary)" }} href={`Contract.html?id=${c.id}`}><Icon name="pen" size={16}/> View &amp; sign</a>
            : <a className="use-btn" href={`Contract.html?id=${c.id}`}><Icon name="eye" size={16}/> View contract</a>}
        </div>
      </aside>
    </>
  );
}

// ─── TOOLBAR TOOLS ───────────────────────────────────────────────────────────
function ToolbarTools({ query, setQuery, sort, setSort }) {
  return (
    <div className="mo-toolbar-right" style={{ marginLeft: "auto" }}>
      <div className="mo-search">
        <Icon name="search" size={15}/>
        <input type="text" placeholder="Search name, orchestrator, ID…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search contracts"/>
        {query && <button type="button" className="mo-search-clear" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="x" size={14}/></button>}
      </div>
      <div className="sort-wrap">
        <label htmlFor="ct-sort" className="sr-only">Sort by</label>
        <select id="ct-sort" className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="status">Status</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="az">Name A–Z</option>
        </select>
        <Icon name="chevronDown" size={14} className="sort-chev"/>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function MyContractsApp() {
  const [active, setActive] = useState("overview");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("status");
  const [selected, setSelected] = useState(null);
  const [focusSign, setFocusSign] = useState(false);

  useEffect(() => { setQuery(""); }, [active]);

  const openDetail = (c) => { setFocusSign(false); setSelected(c); };
  const openSign = (c) => { setFocusSign(true); setSelected(c); };

  const { AppLayout } = window.VTLayout;
  const onBaseline = active.startsWith("bl-");
  const head = railHead(active);
  return (
    <AppLayout
      title={onBaseline ? "My baseline" : `My Contracts (${COUNTS.all})`}
      activeId="contracts"
      className="contracts-app ui-v2"
    >
      <div className="os-settings-head">
        <h2>{onBaseline ? "My baseline" : "My contracts"}</h2>
        <p>Your negotiation baselines and every contract you are party to. Pick a category on the left.</p>
      </div>
      <div className="os-cfg">
        <ContractsNav active={active} onSelect={setActive}/>
        <section className="os-panel">
          <div className="os-panel-head"><div><h2>{head.title}</h2><p>{head.desc}</p></div></div>
          <div className="os-panel-body ct-inner">
            {onBaseline
              ? React.createElement(window.MyBaselineModuleV2, { role: active === "bl-offer" ? "offer" : "acceptance", hideHead: true })
              : active === "overview"
              ? <Overview onNavigate={setActive} onOpen={openDetail} onSign={openSign}/>
              : <ContractsView filter={active} query={query} sort={sort} onOpen={openDetail} onSign={openSign}
                  tools={<ToolbarTools query={query} setQuery={setQuery} sort={sort} setSort={setSort}/>}/>}
          </div>
        </section>
      </div>
      {selected && <ContractDrawer contract={selected} focusSign={focusSign} onClose={() => setSelected(null)}/>}
    </AppLayout>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<MyContractsApp/>);
})();
