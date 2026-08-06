// VisionsTrust — full offer page. The catalogue drawer is a preview; this is the
// page a buyer reads before committing: packages, usage policies and the whole
// published baseline, with the same blocks the drawer uses (catalogue-offer.jsx).
(function () {
const { useState } = React;
const { Icon, AppSidebar, BottomNav, BottomNavSheet } = window.UI;
const { AppLayout } = window.VTLayout;
const { OFFERS, accentFor, hexToRgba, initials } = window.CatData;
const CO = window.CatOffer;
const BASKET_HREF = "basket_packages_27_07.html";
const KIND_DOT = { Data: "#00a2ae", Service: "#5b6ef5" };

const raw = OFFERS.find((o) => o.id === new URLSearchParams(location.search).get("id")) || OFFERS.find((o) => o.id === "o10");
const item = { ...raw, type: "Offer", kindLabel: raw.kind, accent: accentFor(raw.provider || raw.name) };
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function OfferPage() {
  const [pkgId, setPkgId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pkgs = CO.packagesOf(item);
  const pkg = pkgs.find((p) => p.id === pkgId) || null;
  const policies = CO.policiesOf(item, pkg);

  return (
    <AppLayout title="Offer" activeId="catalogue" className="ofp-app" actions={<a className="ofp-back" href="Catalogue.html"><Icon name="chevronLeft" size={16}/> Catalogue</a>}>
        <div className="ofp-content">
          <div className="ofp-inner">
            <div className="ofp-hero">
              <div className="ofp-thumb" style={{ background: `linear-gradient(135deg, ${hexToRgba(item.accent, 0.22)}, ${hexToRgba(item.accent, 0.06)})`, color: item.accent }} aria-hidden="true">{initials(item.provider || item.name)}</div>
              <div className="ofp-head">
                <div className="ofp-titlerow">
                  <h2>{item.name}</h2>
                  <span className="cat-type"><span className="dot" style={{ background: KIND_DOT[item.kindLabel] }}/>{item.kindLabel}</span>
                </div>
                <div className="ofp-prov">
                  <span className="dp-avatar" style={{ background: item.accent }} aria-hidden="true">{initials(item.provider)}</span>
                  <span>proposed by <b>{item.provider}</b></span>
                  <span className="ofp-dot" aria-hidden="true">·</span>
                  <span>published {fmtDate(item.added)}</span>
                </div>
                <p className="ofp-lede">{item.desc}</p>
                <div className="drawer-tags">{item.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
              </div>
            </div>

            <div className="ofp-cols">
              <div className="ofp-main">
                <section className="ofp-sec">
                  <h3>Offer description</h3>
                  <p className="ofp-body">{item.desc} It is exposed through the VisionsTrust data space with consent-governed access and standard exchange protocols. Access is granted through a contract negotiated from the baseline below.</p>
                </section>

                <section className="ofp-sec">
                  <h3>{pkgs.length ? "Packages" : "Pricing"}</h3>
                  <p className="ofp-sub">{pkgs.length ? "This offer is sold through several formulas. The one you pick drives the price and part of the baseline." : "Exact details of the services or data provided."}</p>
                  {pkgs.length ? <CO.PackageGrid item={item} selected={pkgId} onSelect={setPkgId} carousel/> : (
                    <div className="pricing-row">
                      <div className="pr-icon"><Icon name="billing" size={20}/></div>
                      <div>
                        <div className="pr-amount">{item.price ? item.price.amount : "On request"}</div>
                        <div className="pr-period">{item.price ? (item.price.period ? `per ${item.price.period.toLowerCase()}` : "no recurring fee") : "contact provider for pricing"}</div>
                      </div>
                    </div>
                  )}
                </section>

                <section className="ofp-sec">
                  <h3>Usage policies</h3>
                  <p className="ofp-sub">{pkg ? `Policies attached to the ${pkg.name} package.` : policies.length ? "Conditions the provider attached to the use of this resource." : "The provider attached no condition to the use of this resource."}</p>
                  <div className="ofd-pol-row"><CO.PolicyChips list={policies}/></div>
                </section>

                <section className="ofp-sec">
                  <h3>Published baseline</h3>
                  <p className="ofp-sub">{pkg ? `As published for the ${pkg.name} package.` : pkgs.length ? "Common baseline — pick a package above to see the values it overrides." : "What the provider committed to for this offer."}</p>
                  <CO.BaselineTable item={item} pkg={pkg}/>
                  <div className="ofd-note"><Icon name="info" size={13}/><span><b>Fixed</b> fields stand as published. <b>Auto-accept</b> fields can be moved by the contract agent against your acceptance baseline once the offer is in a basket.</span></div>
                </section>

              </div>

              <aside className="ofp-aside" aria-label="Offer summary">
                <div className="ofp-card">
                  <div className="ofp-price">{pkg ? (pkg.sub === 0 ? "Free" : `${CO.fmtN(pkg.sub)} ${pkg.currency}`) : CO.priceLabel(item)}<span>{pkg && pkg.sub !== 0 ? " " + CO.billLabel(pkg) : ""}</span></div>
                  <div className="ofp-price-sub">
                    {pkg ? CO.pkgSummary(pkg) + (pkg.neg ? " · price negotiable" : " · price fixed")
                      : pkgs.length ? `${pkgs.length} packages available — you choose one in the basket` : "Single formula, no package to pick"}
                  </div>
                  <a className="ofp-cta" href={BASKET_HREF}><Icon name="cart" size={16}/> Add to basket</a>
                  <div className="ofp-row">
                    <button type="button" className={saved ? "ofp-ghost on" : "ofp-ghost"} onClick={() => setSaved((s) => !s)} aria-pressed={saved}>
                      <Icon name={saved ? "bookmarkFill" : "bookmark"} size={15}/> {saved ? "Saved" : "Save"}
                    </button>
                    <button type="button" className="ofp-ghost" aria-label="Share this offer"><Icon name="share" size={15}/> Share</button>
                  </div>
                </div>
                <div className="ofp-card ofp-content-card">
                  <h3>Content</h3>
                  <p className="ofp-sub">Resources included in this offer.</p>
                  {Array.from({ length: item.resources }).map((_, i) => (
                    <div className="resource-row" key={i}>
                      <div className="rr-icon" style={{ background: item.accent }}><Icon name={item.kindLabel === "Service" ? "tech" : "database"} size={20}/></div>
                      <div><div className="rr-name">{item.name}{item.resources > 1 ? ` — part ${i + 1}` : ""}</div><div className="rr-type">{item.kindLabel} resource</div></div>
                    </div>
                  ))}
                </div>
                <div className="ofp-card provider">
                  <div className="ofp-prov-head">
                    <span className="dp-avatar" style={{ background: item.accent }} aria-hidden="true">{initials(item.provider)}</span>
                    <div><div className="ofp-prov-name">{item.provider}</div><div className="ofp-prov-role">Provider</div></div>
                  </div>
                  <a className="ofp-link" href="Catalogue.html"><Icon name="external" size={13}/> View organisation</a>
                </div>
              </aside>
            </div>
          </div>
        </div>
    </AppLayout>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<OfferPage/>);
})();
