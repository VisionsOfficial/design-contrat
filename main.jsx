// VisionsTrust — Settings page root
(function() {
const { useState, useEffect, useMemo, useRef } = React;
const { Icon, AppSidebar, TopBar, SettingsNav, BottomNav, BottomNavSheet, Btn, FLAT_NAV, SETTINGS_NAV } = window.UI;

const INITIAL_FORM = {
  // Account
  name: "anthony_data_provider",
  handle: "anthony_data_provider",
  description: "Data provider exposing mobility and consent datasets via the Prometheus-X data space.",
  website: "https://anthony-dp.eu",
  registration: "https://anthony-dp.eu/signup",
  privacy: "https://anthony-dp.eu/privacy",
  terms: "https://anthony-dp.eu/terms",
  // Visibility
  visibility: "public",
  indexed: true,
  contactable: true,
};

function App() {
  const [active, setActive] = useState("account");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [initial, setInitial] = useState(INITIAL_FORM);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState(null); // null | "helper" | "ai"
  const [settingsNavOpen, setSettingsNavOpen] = useState(false); // mobile drawer
  const [uiV2, setUiV2] = useState(() => {
    try { return localStorage.getItem("vt.uiV2") === "1"; } catch (e) { return false; }
  });
  const [snavCollapsed, setSnavCollapsed] = useState(() => {
    try { return localStorage.getItem("vt.snavCollapsed") === "1"; } catch (e) { return false; }
  });
  const [moreOpen, setMoreOpen] = useState(false);
  const [snavView, setSnavView] = useState(() => {
    try { return localStorage.getItem("vt.snavView") || "settings"; } catch (e) { return "settings"; }
  });

  // Persist toggles
  useEffect(() => { try { localStorage.setItem("vt.uiV2", uiV2 ? "1" : "0"); } catch (e) {} }, [uiV2]);
  useEffect(() => { try { localStorage.setItem("vt.snavCollapsed", snavCollapsed ? "1" : "0"); } catch (e) {} }, [snavCollapsed]);
  useEffect(() => { try { localStorage.setItem("vt.snavView", snavView); } catch (e) {} }, [snavView]);

  // Auto-collapse left sidebar on narrow viewports
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      if (w < 1100) setSidebarCollapsed(true);
      else setSidebarCollapsed(false);
      if (w >= 900) setSettingsNavOpen(false);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  const Section = window.Sections[active] || (() => <div>Section not implemented</div>);

  // ⌘K shortcut
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(o => !o);
      } else if (e.key === "Escape") {
        setCmdOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset dirty when changing tab
  useEffect(() => {
    setForm(INITIAL_FORM);
    setInitial(INITIAL_FORM);
  }, [active]);

  const handleSave = () => {
    setInitial(form);
  };
  const handleDiscard = () => {
    setForm(initial);
  };

  return (
    <div className={`app ${uiV2 ? "ui-v2" : ""} ${sidebarCollapsed && !uiV2 ? "collapsed" : ""} ${rightPanel ? "right-open" : ""} ${uiV2 && snavCollapsed ? "snav-collapsed" : ""}`}>
      <AppSidebar collapsed={sidebarCollapsed} variant={uiV2 ? "v2" : "classic"} activeId="settings"/>
      <div className="main">
        <TopBar
          onToggleSidebar={() => setSidebarCollapsed(c => !c)}
          onOpenSearch={() => setCmdOpen(true)}
          onOpenNav={() => setSettingsNavOpen(true)}
          uiV2={uiV2}
          onToggleUI={() => setUiV2(v => !v)}
        />
        <div className="page">
          <div className={`settings-nav-wrap ${settingsNavOpen ? "open" : ""}`}>
            <SettingsNav
              active={active}
              onSelect={(id) => { setActive(id); setSettingsNavOpen(false); setSnavView("settings"); }}
              onOpenSearch={() => setCmdOpen(true)}
              collapsed={uiV2 && snavCollapsed}
              onToggleCollapse={uiV2 ? () => setSnavCollapsed(c => !c) : null}
              view={uiV2 ? snavView : "settings"}
              onViewChange={uiV2 ? setSnavView : null}
              helperContent={<HelperHome inSidebar/>}
              aiContent={<AiAssistant inSidebar/>}
              primaryAction={uiV2 ? {
                label: dirty ? "Save changes" : "All changes saved",
                icon: dirty ? "check" : "check",
                onClick: dirty ? handleSave : undefined,
                disabled: !dirty,
              } : null}
            />
            {settingsNavOpen && <div className="settings-nav-scrim" onClick={() => setSettingsNavOpen(false)}/>}
          </div>
          <main className="content">
            <Breadcrumb active={active} onJump={setActive}/>
            <Section form={form} set={set}/>
          </main>
        </div>
      </div>

      <RightRail active={rightPanel} onChange={setRightPanel} hidden={uiV2}/>

      {uiV2 && <BottomNav onOpenMore={() => setMoreOpen(true)}/>}
      <BottomNavSheet open={moreOpen} onClose={() => setMoreOpen(false)}/>

      {dirty && !uiV2 && <SaveBar onSave={handleSave} onDiscard={handleDiscard}/>}
      {dirty && uiV2 && <SaveBar onSave={handleSave} onDiscard={handleDiscard} v2/>}
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} onPick={(id) => { setActive(id); setCmdOpen(false); }}/>}
    </div>
  );
}

function RightRail({ active, onChange, hidden }) {
  if (hidden) return null;
  const tabs = [
    { id: "helper", icon: "sparkle", label: "Helper home" },
    { id: "ai",     icon: "chat",    label: "AI Assistant" },
  ];
  return (
    <aside className={`right-rail ${active ? "open" : ""}`}>
      <div className="right-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`right-tab ${active === t.id ? "active" : ""}`}
            onClick={() => onChange(active === t.id ? null : t.id)}
            title={t.label}
            aria-pressed={active === t.id}
          >
            <Icon name={t.icon} size={18}/>
          </button>
        ))}
      </div>
      {active && (
        <div className="right-panel">
          <button className="right-close" onClick={() => onChange(null)} title="Close panel">
            <Icon name="chevronRight" size={18}/>
          </button>
          {active === "helper" ? <HelperHome/> : <AiAssistant/>}
        </div>
      )}
    </aside>
  );
}

function HelperHome() {
  const items = [
    { title: "Set up your first data offer",    desc: "Publish a dataset to the catalogue in 4 steps." },
    { title: "Connect your Data Space Connector", desc: "Pair your PDC with VisionsTrust." },
    { title: "Invite your team",                desc: "Add admins, developers and viewers." },
    { title: "Generate an API key",             desc: "Authenticate machine-to-machine calls." },
  ];
  return (
    <div className="helper">
      <div className="helper-icon"><Icon name="sparkle" size={22}/></div>
      <h3 className="helper-title">Helper home</h3>
      <p className="helper-desc">Get contextual and intelligent help directly from the side panel, with next-step guidance, an AI assistant, and guides to explore and use VisionsTrust with ease.</p>
      <h4 className="helper-subtitle">What would you like to accomplish today?</h4>
      <div className="helper-actions">
        {items.map((it, i) => (
          <button key={i} className="helper-action">
            <Icon name="plus" size={14}/>
            <span>{it.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AiAssistant() {
  const [msg, setMsg] = useState("");
  const prompts = [
    "How do I configure my data exchange endpoints?",
    "Explain what a PDC is in plain language",
  ];
  return (
    <div className="ai">
      <div className="helper-icon"><Icon name="sparkle" size={22}/></div>
      <h3 className="helper-title">Let's get started with Assistant AI</h3>
      <p className="helper-desc">Ask anything about VisionsTrust, your offers, contracts or data exchanges. I can walk you through setup and answer questions in plain language.</p>
      <h4 className="helper-subtitle">How can I help you today?</h4>
      <div className="ai-prompts">
        {prompts.map((p, i) => (
          <button key={i} className="ai-prompt">
            <span>{p}</span>
            <Icon name="chevronRight" size={14}/>
          </button>
        ))}
      </div>
      <div className="ai-composer">
        <input
          className="ai-input"
          placeholder="Type your message here or pick from the prompts"
          value={msg}
          onChange={e => setMsg(e.target.value)}
        />
        <button className="ai-send" disabled={!msg.trim()}>
          <Icon name="chevronRight" size={16}/>
        </button>
      </div>
    </div>
  );
}

function Breadcrumb({ active, onJump }) {
  const item = FLAT_NAV.find(i => i.id === active);
  if (!item) return null;
  return (
    <div className="content-breadcrumb">
      <a href="#" onClick={e => { e.preventDefault(); onJump("account"); }}>Settings</a>
      <Icon name="chevronRight" size={12}/>
      <span>{item.group}</span>
      <Icon name="chevronRight" size={12}/>
      <span style={{ color: "var(--vui-color-secondary)", fontWeight: 600 }}>{item.label}</span>
    </div>
  );
}

function SaveBar({ onSave, onDiscard, v2 }) {
  return (
    <div className={`save-bar ${v2 ? "v2" : ""}`} role="status">
      <span className="save-bar-msg"><strong>•</strong> &nbsp;Unsaved changes</span>
      <Btn variant="ghost" onClick={onDiscard}>Discard</Btn>
      <Btn icon="check" onClick={onSave}>Save changes</Btn>
    </div>
  );
}

function CommandPalette({ onClose, onPick }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const needle = q.toLowerCase().trim();
    if (!needle) return FLAT_NAV;
    return FLAT_NAV.filter(i =>
      i.label.toLowerCase().includes(needle) ||
      i.desc.toLowerCase().includes(needle) ||
      i.group.toLowerCase().includes(needle)
    );
  }, [q]);

  // group results
  const grouped = useMemo(() => {
    const m = {};
    results.forEach(r => { (m[r.group] = m[r.group] || []).push(r); });
    return m;
  }, [results]);

  const flatList = results;

  useEffect(() => { setIdx(0); }, [q]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(flatList.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && flatList[idx]) { e.preventDefault(); onPick(flatList[idx].id); }
  };

  let runningIdx = -1;
  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="cmdk" onClick={e => e.stopPropagation()}>
        <div className="cmdk-input-row">
          <Icon name="search" size={16} className="muted"/>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Jump to a setting…"
            onKeyDown={onKeyDown}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="cmdk-list">
          {flatList.length === 0 && <div className="cmdk-empty">No setting matches "{q}"</div>}
          {Object.entries(grouped).map(([g, items]) => (
            <div key={g}>
              <div className="cmdk-group-label">{g}</div>
              {items.map(it => {
                runningIdx++;
                const isActive = runningIdx === idx;
                return (
                  <div
                    key={it.id}
                    className={`cmdk-item ${isActive ? "active" : ""}`}
                    onMouseEnter={() => setIdx(flatList.indexOf(it))}
                    onClick={() => onPick(it.id)}
                  >
                    <Icon name={it.icon} size={16}/>
                    <div>
                      <div className="cmd-label">{it.label}</div>
                      <div className="cmd-desc">{it.desc}</div>
                    </div>
                    <span className="cmd-group-tag">{it.group}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="cmdk-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> navigate · <kbd>↵</kbd> select</span>
          <span><kbd>⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
})();
