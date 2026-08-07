// VisionsTrust — Demo 07/08 · Offer page. Same structure as FINAL Offer: hero,
// description, packages, usage policies, published baseline, aside with the CTA.
(function () {
const { useState } = React;
const { Icon } = window.UI;
const { AppLayout } = window.VTLayout;
const D = window.Demo;
const U = window.DemoUI;
const { initials, hexToRgba, fmtN, fmtDate, KIND_TONE } = D;

const qsId = new URLSearchParams(location.search).get("id");
const item = D.byId(qsId) || D.OFFERS[0];

function OfferPage() {
  const [st, setSt] = useState(() => D.load());
  const line = st.cart.find((l) => l.offerId === item.id);
  const [pkgId, setPkgId] = useState(line ? line.pkgId : null);
  const [saved, setSaved] = useState(false);
  const pkg = D.pkgById(item, pkgId);
  const s = D.scoreOf(item);
  const policies = pkg ? pkg.policies : [];

  const addToBasket = () => {
    const mode = D.addToCart(item.id, pkgId);
    D.flash(mode === "updated"
      ? `${item.name} updated in your basket — ${pkg.name} package.`
      : `${item.name} added to your basket — ${pkg.name} package.`);
    location.href = D.PAGES.catalog;
  };

  return (
    <AppLayout title="Offer" activeId="catalogue" cartCount={st.cart.length} cartHref={D.PAGES.basket} className="ofp-app"
      actions={<a className="ofp-back" href={D.PAGES.catalog}><Icon name="chevronLeft" size={16} /> Catalogue</a>}>
      <div className="ofp-content">
        <div className="ofp-inner">
          <div className="ofp-hero">
            <div className="ofp-thumb" style={{ background: `linear-gradient(135deg, ${hexToRgba(item.accent, 0.22)}, ${hexToRgba(item.accent, 0.06)})`, color: item.accent }} aria-hidden="true">{initials(item.provider)}</div>
            <div className="ofp-head">
              <div className="ofp-titlerow">
                <h2>{item.name}</h2>
                <span className="cat-type"><span className="dot" style={{ background: KIND_TONE[item.kind] }} />{item.kind}</span>
                <U.PiiTag pii={item.pii} />
              </div>
              <div className="ofp-prov">
                <span className="dp-avatar" style={{ background: item.accent }} aria-hidden="true">{initials(item.provider)}</span>
                <span>proposed by <b>{item.provider}</b></span>
                <span className="ofp-dot" aria-hidden="true">·</span>
                <span>published {fmtDate(item.added)}</span>
              </div>
              <p className="ofp-lede">{item.desc}</p>
              <div className="drawer-tags">{item.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
              <div className="dm-cardstrip"><U.StatusBadges offer={item} /></div>
            </div>
          </div>

          <div className="ofp-cols">
            <div className="ofp-main">
              <section className="ofp-sec">
                <h3>Offer description</h3>
                <p className="ofp-body">{item.desc} It is exposed through the VisionsTrust data space with consent-governed access and standard exchange protocols. Access is granted through a contract negotiated from the baseline below.</p>
              </section>

              <section className="ofp-sec" id="packages">
                <h3>Packages</h3>
                <p className="ofp-sub">This offer is sold through three formulas. The one you pick drives the price, the volume and the usage policies. Pick one to add the offer to your basket.</p>
                <U.PackageGrid offer={item} selected={pkgId} onSelect={setPkgId} />
              </section>

              <section className="ofp-sec">
                <h3>Usage policies</h3>
                <p className="ofp-sub">{pkg ? `Policies attached to the ${pkg.name} package.` : "Pick a package above to see the policies it carries."}</p>
                <div className="ofd-pol-row">{policies.length ? policies.map((p) => <span className="ofd-pol" key={p}>{p}</span>) : <span className="ofd-pol none">No package selected yet</span>}</div>
              </section>

              {item.pii && (
                <section className="ofp-sec">
                  <h3>Personal data</h3>
                  <p className="ofp-sub">{item.pii === "contains"
                    ? "This offer exposes personal data. The provider is the controller; the terms below are locked and carry into every contract as-is."
                    : "This service processes personal data on documented instructions. It can be designated as the processor of a personal-data offer."}</p>
                  <div className="ofd-note"><Icon name="shield" size={13} /><span>{item.pii === "contains"
                    ? <>Adding this offer to your basket inserts one extra step in the basket flow: you designate the <b>service offers</b> allowed to process the dataset.</>
                    : <>This offer has a complete processor declaration, so it can be picked as a consuming service for a personal-data dataset.</>}</span></div>
                </section>
              )}

              <section className="ofp-sec">
                <h3>Published baseline</h3>
                <p className="ofp-sub">What the provider committed to for this offer. Checked against your acceptance baseline: <b>{s.gapCount} gap{s.gapCount !== 1 ? "s" : ""}</b> and <b>{s.meetCount} meet</b> out of {s.checked} checked terms — the same reading you will see in the basket.</p>
                <U.BaselineTable offer={item} />
                <div className="ofd-note"><Icon name="info" size={13} /><span><b>Fixed</b> fields stand as published. <b>Negotiable</b> fields can be countered against your acceptance baseline once the offer is in a basket.</span></div>
              </section>
            </div>

            <aside className="ofp-aside" aria-label="Offer summary">
              <div className="ofp-card">
                <div className="ofp-price">{pkg ? (pkg.price === 0 ? "Free" : `${fmtN(pkg.price)} ${item.currency}`) : `from ${fmtN(Math.min(...item.packages.map((p) => p.price)))} ${item.currency}`}<span>{pkg && pkg.price !== 0 ? " / month" : ""}</span></div>
                <div className="ofp-price-sub">{pkg
                  ? `${pkg.name} · ${fmtN(pkg.vol)} ${item.unit} · ${pkg.setup ? `${fmtN(pkg.setup)} ${item.currency} set-up` : "no set-up fee"}${pkg.neg ? " · price negotiable" : " · price fixed"}`
                  : `${item.packages.length} packages available — pick one below to continue`}</div>
                <button type="button" className="ofp-cta" onClick={addToBasket} disabled={!pkg}>
                  <Icon name="cart" size={16} /> {line ? "Update basket" : "Add to basket"}
                </button>
                {!pkg && <div className="ofp-price-sub" style={{ marginTop: 8 }}>Select a package first.</div>}
                {line && <div className="ofp-price-sub" style={{ marginTop: 8 }}>Already in your basket as <b>{D.pkgById(item, line.pkgId).name}</b>. <a href={D.PAGES.basket}>Go to basket</a></div>}
                <div className="ofp-row">
                  <button type="button" className={saved ? "ofp-ghost on" : "ofp-ghost"} onClick={() => setSaved((v) => !v)} aria-pressed={saved}><Icon name={saved ? "bookmarkFill" : "bookmark"} size={15} /> {saved ? "Saved" : "Save"}</button>
                  <button type="button" className="ofp-ghost" aria-label="Share this offer"><Icon name="share" size={15} /> Share</button>
                </div>
              </div>

              <div className="ofp-card ofp-content-card">
                <h3>Content</h3>
                <p className="ofp-sub">Resources included in this offer.</p>
                {U.resourceNames(item).map((n, i) => (
                  <div className="resource-row" key={n}>
                    <div className="rr-icon" style={{ background: item.accent }}><Icon name={item.kind === "Service" ? "tech" : "database"} size={20} /></div>
                    <div><div className="rr-name">{n}</div><div className="rr-type">{item.kind} resource{pkg && i >= pkg.res ? " — not in this package" : ""}</div></div>
                  </div>
                ))}
              </div>

              <div className="ofp-card provider">
                <div className="ofp-prov-head">
                  <span className="dp-avatar" style={{ background: item.accent }} aria-hidden="true">{initials(item.provider)}</span>
                  <div><div className="ofp-prov-name">{item.provider}</div><div className="ofp-prov-role">Provider</div></div>
                </div>
                <a className="ofp-link" href={D.PAGES.catalog}><Icon name="external" size={13} /> Back to catalogue</a>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<OfferPage />);
})();
