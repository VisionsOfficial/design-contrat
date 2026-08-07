// VisionsTrust — Demo 07/08 · Catalogue. Entry point of the test drive.
(function () {
const { useState } = React;
const { Icon } = window.UI;
const { AppLayout } = window.VTLayout;
const D = window.Demo;
const U = window.DemoUI;
const { initials, hexToRgba, fmtN, KIND_TONE } = D;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "Data", label: "Data" },
  { id: "Service", label: "Service" },
];

function OfferCard({ item, inCart, onOpen }) {
  const s = D.scoreOf(item);
  const from = Math.min(...item.packages.map((p) => p.price));
  return (
    <article className="cat-card">
      <button type="button" className="cat-card-hit" onClick={() => onOpen(item)} aria-label={`Open ${item.name}`} />
      <div className="cat-media" style={{ background: `linear-gradient(135deg, ${hexToRgba(item.accent, 0.16)}, ${hexToRgba(item.accent, 0.04)})` }}>
        <span className="cat-type"><span className="dot" style={{ background: KIND_TONE[item.kind] }} />{item.kind}</span>
        <div className="cat-logo" style={{ color: item.accent }}>{initials(item.provider)}</div>
        <U.PiiTag pii={item.pii} />
      </div>
      <div className="cat-body">
        <h3 className="cat-name">{item.name}</h3>
        <p className="cat-desc">{item.desc}</p>
        <div className="cat-tags">{item.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
        <div className="dm-cardstrip">
          <U.StatusBadges offer={item} />
          {inCart && <span className="dm-incart"><Icon name="check" size={11} /> In basket</span>}
        </div>
      </div>
      <div className="cat-foot">
        <div className="cat-provider">
          <div className="pv-avatar" style={{ background: item.accent }} aria-hidden="true">{initials(item.provider)}</div>
          <div className="pv-meta"><div className="pv-by">proposed by</div><div className="pv-name">{item.provider}</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="cat-meta-right">{from === 0 ? "Free tier" : `from ${fmtN(from)} ${item.currency}`}</span>
          <div className="go" aria-hidden="true"><Icon name="arrowRight" size={15} /></div>
        </div>
      </div>
    </article>
  );
}

function CatalogApp() {
  const [st, setSt] = useState(() => D.load());
  const [filter, setFilter] = useState("all");
  const [flash] = useState(() => D.takeFlash());
  const items = D.OFFERS.filter((o) => filter === "all" || o.kind === filter);
  const count = st.cart.length;
  const open = (item) => { location.href = `${D.PAGES.offer}?id=${item.id}`; };

  return (
    <AppLayout title="Catalogue" activeId="catalogue" cartCount={count} cartHref={D.PAGES.basket} className="dm-app">
      <div className="dm-page">
        <div className="dm-head">
          <div>
            <h2>Catalogue</h2>
            <p>Four offers around residential rental contracts: two datasets and two services. Two of them involve personal data and carry an extra step when you contract them.</p>
          </div>
          <a className="bk-confirm" href={D.PAGES.basket}><Icon name="cart" size={15} /> View basket{count > 0 ? ` (${count})` : ""}</a>
        </div>

        <div className="dm-filters" role="group" aria-label="Filter by type">
          <span className="dm-flabel">Type</span>
          {FILTERS.map((f) => {
            const n = f.id === "all" ? D.OFFERS.length : D.OFFERS.filter((o) => o.kind === f.id).length;
            return (
              <button type="button" key={f.id} className={`dm-filter ${filter === f.id ? "on" : ""}`} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}>
                {filter === f.id && <Icon name="check" size={12} />}{f.label}<span className="dm-fn">{n}</span>
              </button>
            );
          })}
        </div>

        <div className="cat-toolbar">
          <div className="cat-toolbar-left">
            <h2 className="cat-heading">{filter === "all" ? "All offers" : `${filter} offers`}</h2>
            <span className="cat-count">{items.length} result{items.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="cat-grid">
          {items.map((it) => <OfferCard key={it.id} item={it} inCart={st.cart.some((l) => l.offerId === it.id)} onOpen={open} />)}
        </div>
      </div>
      <U.Toast flash={flash} />
    </AppLayout>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CatalogApp />);
})();
