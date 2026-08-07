// VisionsTrust — Demo 07/08 · Catalogue. Entry point of the test drive.
(function () {
const { useState, useRef } = React;
const { Icon } = window.UI;
const { AppLayout } = window.VTLayout;
const D = window.Demo;
const U = window.DemoUI;
const { initials, hexToRgba, accentFor } = D;

const TABS = [
  { id: "all", label: "All" },
  { id: "offers", label: "Offers" },
  { id: "projects", label: "Projects" },
  { id: "infra", label: "Infrastructure offers" },
  { id: "orgs", label: "Organisations" },
  { id: "federated", label: "Federated catalog" },
];
const SECTORS = ["Sector", "Legal", "Smart cities", "Energy", "Media", "Education", "Skills", "Mobility", "Language"];
const CONNECT_LINE = "Full connected - For bilateral and project exchange";

const SECTOR_ICONS = {
  Legal: <><path d="M6 34h16" /><path d="M14 34V22" /><path d="m9 15 8-8 4 4-8 8z" /><path d="m17 11 8 8" /><path d="m22 6 8 8" /><path d="m26 16 4 4" /></>,
  "Smart cities": <><path d="M6 34h28" /><path d="M9 34V18h9v16" /><path d="M18 34V11h11v23" /><path d="M12 22h3M12 27h3M22 16h3M22 22h3M22 27h3" /><path d="M27 8a4 4 0 0 1 4-4" /><path d="M28 5a7 7 0 0 1 7-3" /></>,
  Energy: <><path d="M20 4v4M11 8l2.5 3M29 8l-2.5 3M6 18h4M30 18h4" /><circle cx="20" cy="18" r="5" /><path d="M14 26h12l2 8H12z" /><path d="M20 26v8M13 30h14" /></>,
  Media: <><rect x="5" y="14" width="30" height="18" rx="3" /><circle cx="14" cy="23" r="4" /><path d="M23 20h7M23 26h7" /><path d="m12 12 14-6" /></>,
  Education: <><path d="m20 8 16 7-16 7-16-7z" /><path d="M10 18v8c0 2.8 4.5 5 10 5s10-2.2 10-5v-8" /><path d="M34 16v9" /></>,
  Skills: <><circle cx="20" cy="20" r="6" /><path d="M20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M31.3 8.7l-3.5 3.5M12.2 27.8l-3.5 3.5" /></>,
  Mobility: <><path d="M7 26h26" /><path d="m10 26 3-8h14l4 8" /><path d="M6 26v4h4M34 26v4h-4" /><circle cx="13" cy="30" r="2.5" /><circle cx="27" cy="30" r="2.5" /><path d="M14 12a9 9 0 0 1 12 0" /><path d="M17 8a15 15 0 0 1 6 0" /></>,
  Language: <><path d="m5 26 6-16 6 16" /><path d="M7.4 21h7.2" /><path d="M22 14h12" /><path d="M28 11v3" /><path d="M31 14c0 5-4 9-9 10" /><path d="M25 19c1.6 3 4 4.5 9 5" /></>,
};
const SectorIcon = ({ name }) => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{SECTOR_ICONS[name]}</svg>
);

function Media({ accent, label, tone, children }) {
  return (
    <div className="dc-media" style={{ background: `linear-gradient(135deg, ${hexToRgba(accent, 0.22)}, ${hexToRgba(accent, 0.06)})` }}>
      <span className={`dc-kind ${tone}`}>{label}</span>
      <span className="dc-mono" style={{ color: accent }}>{children}</span>
    </div>
  );
}

function OfferCard({ item, inCart, onOpen }) {
  return (
    <article className="dc-card">
      <button type="button" className="dc-hit" onClick={() => onOpen(item)} aria-label={`Open ${item.name}`} />
      <Media accent={item.accent} label={item.kind} tone={item.kind === "Service" ? "service" : ""}>{initials(item.provider)}</Media>
      {item.pii && <span className="dc-shield" title={D.PII_LABEL[item.pii]}><Icon name="shield" size={14} /></span>}
      <div className="dc-body">
        <div className="dc-conn"><span className="dc-conn-ic"><Icon name="endpoints" size={12} /></span><span>{CONNECT_LINE}</span></div>
        <h3 className="dc-name">{item.name}</h3>
        <p className="dc-desc">{item.desc}</p>
      </div>
      <div className="dc-prov">
        <span className="dc-avatar" style={{ background: item.accent }} aria-hidden="true">{initials(item.provider)}</span>
        <span><span className="dc-by">proposed by</span><br /><span className="dc-pname">{item.provider}</span></span>
      </div>
      <div className="dc-foot">
        {inCart
          ? <span className="dc-incart"><Icon name="check" size={11} /> In basket</span>
          : <span className="dc-res">{item.resources} resource{item.resources !== 1 ? "s" : ""} in the offer</span>}
        <button type="button" className="dc-discover" onClick={() => onOpen(item)}>Discover <Icon name="arrowRight" size={15} /></button>
      </div>
    </article>
  );
}

function ProjectCard({ item }) {
  const accent = accentFor(item.name + item.org);
  return (
    <article className="dc-card">
      <Media accent={accent} label="Project" tone="project">{initials(item.name.replace(/_/g, " "))}</Media>
      <div className="dc-body">
        <div className="dc-conn"><span className="dc-conn-ic"><Icon name="endpoints" size={12} /></span><span>{CONNECT_LINE}</span></div>
        <h3 className="dc-name">{item.name}</h3>
        <p className="dc-desc">{item.caption}</p>
      </div>
      <div className="dc-prov">
        <span className="dc-avatar" style={{ background: accent }} aria-hidden="true">{initials(item.org)}</span>
        <span><span className="dc-by">initiated by</span><br /><span className="dc-pname">{item.org}</span></span>
      </div>
      <div className="dc-foot">
        <span className="dc-res">Open to partners</span>
        <button type="button" className="dc-discover">Discover <Icon name="arrowRight" size={15} /></button>
      </div>
    </article>
  );
}

function Rail({ title, sub, onViewAll, children }) {
  const track = useRef(null);
  const scroll = (dir) => { const el = track.current; if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" }); };
  return (
    <section className="dc-rail">
      <div className="dc-rail-head">
        <div>
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
        <div className="dc-rail-nav">
          <button type="button" className="dc-viewall" onClick={onViewAll}>View all</button>
          <button type="button" className="dc-arrow" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`}><Icon name="chevronLeft" size={18} /></button>
          <button type="button" className="dc-arrow" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`}><Icon name="chevronRight" size={18} /></button>
        </div>
      </div>
      <div className="dc-track" ref={track}>{children}</div>
    </section>
  );
}

function CatalogApp() {
  const [st] = useState(() => D.load());
  const [tab, setTab] = useState("all");
  const [sector, setSector] = useState("Sector");
  const [q, setQ] = useState("");
  const [flash] = useState(() => D.takeFlash());
  const count = st.cart.length;
  const open = (item) => { location.href = `${D.PAGES.offer}?id=${item.id}`; };

  const term = q.trim().toLowerCase();
  const match = (hay) => !term || hay.toLowerCase().includes(term);
  const offers = D.OFFERS.filter((o) => match(`${o.name} ${o.provider} ${o.desc} ${o.tags.join(" ")}`));
  const projects = D.PROJECTS.filter((p) => match(`${p.name} ${p.caption} ${p.org}`));
  const offerCard = (o) => <OfferCard key={o.id} item={o} inCart={st.cart.some((l) => l.offerId === o.id)} onOpen={open} />;
  const projectCard = (p) => <ProjectCard key={p.id} item={p} />;

  return (
    <AppLayout title="Catalogue" activeId="catalogue" cartCount={count} cartHref={D.PAGES.basket} className="dm-app">
      <div className="dc-page">
        <div className="dc-toolbar">
          <div className="dc-search">
            <button type="button" className="dc-plus" aria-label="Add one of my resources"><Icon name="plus" size={15} /></button>
            <label className="sr-only" htmlFor="dc-q">Search or describe your need</label>
            <input id="dc-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or describe your need..." />
            <button type="button" className="dc-send" aria-label="Search"><Icon name="send" size={15} /></button>
          </div>
          <button type="button" className="dc-filter"><Icon name="sliders" size={16} /> Filter</button>
          <div className="dc-cta">
            <button type="button" className="dc-btn teal">Create a new offer</button>
            <button type="button" className="dc-btn navy">Create a new project</button>
          </div>
        </div>

        <div className="dc-tabsrow">
          <div className="dc-tabs" role="tablist" aria-label="Catalogue sections">
            {TABS.map((t) => (
              <button type="button" key={t.id} role="tab" aria-selected={tab === t.id} className={`dc-tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>
          <div className="dc-sector">
            <label className="sr-only" htmlFor="dc-sector">Sector</label>
            <select id="dc-sector" value={sector} onChange={(e) => setSector(e.target.value)}>
              {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Icon name="chevronDown" size={16} />
          </div>
        </div>

        <div className="dc-banner">
          <h2>Data, AI, Infrastructures products and projects from hundreds of providers</h2>
          <div className="dc-sectors">
            {SECTORS.slice(1).map((s) => (
              <button type="button" key={s} className={`dc-sector-tile ${sector === s ? "on" : ""}`} onClick={() => setSector(sector === s ? "Sector" : s)} aria-pressed={sector === s}>
                <SectorIcon name={s} />{s}
              </button>
            ))}
          </div>
        </div>

        {(tab === "all" || tab === "offers") && (
          <Rail title="Featured Offers" sub="Explore the most suitable offers and integrate them into your project" onViewAll={() => setTab("offers")}>
            {offers.length ? offers.map(offerCard) : <div className="dc-empty"><h3>No offer matches “{q}”</h3><p>Clear the search to see the four demo offers.</p></div>}
          </Rail>
        )}

        {(tab === "all" || tab === "projects") && (
          <Rail title="Featured Projects" sub="Explore the most suitable projects" onViewAll={() => setTab("projects")}>
            {projects.length ? projects.map(projectCard) : <div className="dc-empty"><h3>No project matches “{q}”</h3><p>Clear the search to see every project.</p></div>}
          </Rail>
        )}

        {(tab === "infra" || tab === "orgs" || tab === "federated") && (
          <div className="dc-empty">
            <h3>{TABS.find((t) => t.id === tab).label}</h3>
            <p>Not part of this demo — the test drive runs on offers and projects.</p>
          </div>
        )}
      </div>
      <U.Toast flash={flash} />
    </AppLayout>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CatalogApp />);
})();
