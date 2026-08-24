// VisionsTrust — full offer page. FINAL shell: sticky buy card in column 1, the
// whole offer read top to bottom in column 2.
(function () {
const { useState } = React;
const { Icon } = window.UI;
const { useTweaks, TweaksPanel, TweakSection, TweakRadio } = window;
const { AppLayout } = window.VTLayout;
const { OFFERS, accentFor, hexToRgba, initials } = window.CatData;
const CO = window.CatOffer;
const BASKET_HREF = "basket_packages_27_07.html";
const KIND_DOT = { Data: "#00a2ae", Service: "#5b6ef5" };

const raw = OFFERS.find((o) => o.id === new URLSearchParams(location.search).get("id")) || OFFERS.find((o) => o.id === "o10");
const item = { ...raw, type: "Offer", kindLabel: raw.kind, accent: accentFor(raw.provider || raw.name) };
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "pricing": "Packages"
}/*EDITMODE-END*/;

// Single-price variant: the offer publishes one price and no package. Values are taken
// from the provider's main formula so the baseline below stays coherent.
const SINGLE_PRICE = (it) => {
  const base = CO.packagesOf(it).find((p) => p.recommended) || CO.packagesOf(it)[0];
  return base
    ? { ...base, id: "single", name: it.name, recommended: false, res: it.resources }
    : { id: "single", name: it.name, sub: 250, billing: "Monthly", setup: 0, api: 0, currency: "EUR", neg: false, accept: null, policies: [], res: it.resources, overrides: {} };
};

// Side-by-side comparison of the packages. One column per package, one row per
// criterion; values shared by every package are dimmed, differences stand out.
function PackageCompare({ item, pkgs, selected, onSelect, added, onAdd }) {
  const isData = item.kindLabel !== "Service";
  const rows = [
    { k: "Price", v: (pk) => (pk.sub === 0 ? "Free" : `${CO.fmtN(pk.sub)} ${pk.currency} ${CO.billLabel(pk)}`) },
    { k: "Set-up fee", v: (pk) => (pk.setup ? `${CO.fmtN(pk.setup)} ${pk.currency}` : "No set-up fee") },
    { k: "Per-call cost", v: (pk) => (pk.api ? `${pk.api} ${pk.currency} per call` : "No per-call cost") },
    { k: "Price conditions", v: (pk) => (pk.neg ? `Negotiable${pk.accept ? ` · ${CO.fmtN(pk.accept.min)}–${CO.fmtN(pk.accept.max)} ${pk.currency}` : ""}` : "Fixed as published") },
    { k: "Data Resources included", chips: (pk) => (isData ? CO.pkgResources(item, pk) : []), empty: "—", cls: "ofd-res" },
    { k: "Service Resources included", chips: (pk) => (isData ? [] : CO.pkgResources(item, pk)), empty: "—", cls: "ofd-res" },
    { k: "Usage policies", chips: (pk) => pk.policies, empty: "No restriction", cls: "ofd-pol" },
  ];
  const keyOf = (r, pk) => (r.chips ? r.chips(pk).join(" · ") : r.v(pk));
  return (
    <div className="ofp-cmp" style={{ "--cmp-cols": pkgs.length }}>
      <div className="ofp-cmp-row head">
        <div className="ofp-cmp-k">Package</div>
        {pkgs.map((pk) => (
          <button type="button" key={pk.id} className={`ofp-cmp-h${selected === pk.id ? " on" : ""}`} aria-pressed={selected === pk.id} onClick={() => onSelect(selected === pk.id ? null : pk.id)}>
            <span className="ofp-cmp-name">{pk.name}{pk.recommended && <span className="ofp-cmp-flag"><Icon name="star" size={9}/> Recommended</span>}</span>
            <span className="ofp-cmp-desc">{pk.desc}</span>
          </button>
        ))}
      </div>
      {rows.map((r) => {
        const vals = pkgs.map((pk) => keyOf(r, pk));
        const same = vals.every((v) => v === vals[0]);
        return (
          <div className="ofp-cmp-row" key={r.k}>
            <div className="ofp-cmp-k">{r.k}</div>
            {pkgs.map((pk, i) => {
              const list = r.chips ? r.chips(pk) : null;
              return (
                <div key={pk.id} className={`ofp-cmp-v${same ? " same" : " diff"}${selected === pk.id ? " sel" : ""}`}>
                  {list
                    ? (list.length ? <span className="ofd-pol-row">{list.map((x) => <span className={r.cls} key={x}>{x}</span>)}</span> : <span className="ofp-cmp-none">{r.empty}</span>)
                    : vals[i]}
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="ofp-cmp-row foot">
        <div className="ofp-cmp-k"/>
        {pkgs.map((pk) => (
          <div key={pk.id} className={`ofp-cmp-v${selected === pk.id ? " sel" : ""}`}>
            {added === pk.id
              ? <a className="ofd-pkg-btn added" href={BASKET_HREF}><Icon name="check" size={13}/> Added · View basket</a>
              : <button type="button" className={selected === pk.id ? "ofd-pkg-btn on" : "ofd-pkg-btn"} onClick={() => { onSelect(pk.id); onAdd(pk.id); }}>
                  <Icon name="cart" size={13}/> Add to basket
                </button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function OfferPage() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [pkgId, setPkgId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState(null);
  const [copied, setCopied] = useState(false);
  const copyId = () => {
    const txt = item.id;
    if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const pkgs = tw.pricing === "Single price" ? [] : CO.packagesOf(item);
  const single = tw.pricing === "Single price" ? SINGLE_PRICE(item) : null;
  const pkg = single || pkgs.find((p) => p.id === pkgId) || null;
  const policies = single ? single.policies : CO.policiesOf(item, pkg);

  const HEAD = {
    about: { title: "Offer description", desc: "" },
    packages: { title: pkgs.length ? "Packages" : "Pricing", desc: pkgs.length ? "This offer is sold through several formulas. The one you pick drives the price and part of the baseline." : "One single price for this offer — no package to pick." },
    policies: { title: "Usage policies", desc: policies.length ? "Conditions the provider attached to the use of this resource." : "The provider attached no condition to the use of this resource." },
    baseline: { title: "Published baseline", desc: pkg ? `As published for the ${pkg.name} package.` : pkgs.length ? "Common baseline — pick a package to see the values it overrides." : "What the provider committed to for this offer." },
    content: { title: "Content", desc: "Resources included in this offer." },
    provider: { title: "Provider", desc: "" },
  };
  const SecHead = ({ id }) => <div className="ofp-sechead"><h3>{HEAD[id].title}</h3>{HEAD[id].desc ? <p>{HEAD[id].desc}</p> : null}</div>;

  return (
    <AppLayout title="Offer" activeId="catalogue" className="ofp-app">
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

          <div className="os-cfg ofp-cfg">
            <div className="ofp-railcol">
              <div className="ofp-card">
                <div className="ofp-price">{pkg ? (pkg.sub === 0 ? "Free" : `${CO.fmtN(pkg.sub)} ${pkg.currency}`) : CO.priceLabel(item)}<span>{pkg && pkg.sub !== 0 ? " " + CO.billLabel(pkg) : ""}</span></div>
                <div className="ofp-price-sub">
                  {pkg ? CO.pkgSummary(pkg) + (pkg.neg ? " · price negotiable" : " · price fixed")
                    : pkgs.length ? `${pkgs.length} packages available — you choose one in the basket` : "Single formula, no package to pick"}
                </div>
                <button type="button" className="ofp-ghost ofp-idbtn" onClick={copyId} aria-label={`Copy offer ID ${item.id}`}>
                  <Icon name={copied ? "check" : "copy"} size={15}/> {copied ? "Copied" : "ID"}
                </button>
                <div className="ofp-row">
                  <button type="button" className={saved ? "ofp-ghost on" : "ofp-ghost"} onClick={() => setSaved((s) => !s)} aria-pressed={saved}>
                    <Icon name={saved ? "bookmarkFill" : "bookmark"} size={15}/> {saved ? "Saved" : "Save"}
                  </button>
                  <button type="button" className="ofp-ghost" aria-label="Share this offer"><Icon name="share" size={15}/> Share</button>
                </div>
              </div>

              <div className="ofp-card">
                <SecHead id="content"/>
                {Array.from({ length: item.resources }).map((_, i) => (
                  <div className="resource-row" key={i}>
                    <div className="rr-icon" style={{ background: item.accent }}><Icon name={item.kindLabel === "Service" ? "tech" : "database"} size={20}/></div>
                    <div><div className="rr-name">{item.name}{item.resources > 1 ? ` — part ${i + 1}` : ""}</div><div className="rr-type">{item.kindLabel} resource</div></div>
                  </div>
                ))}
              </div>

              <div className="ofp-card">
                <div className="ofp-prov-head">
                  <span className="dp-avatar" style={{ background: item.accent }} aria-hidden="true">{initials(item.provider)}</span>
                  <div><div className="ofp-prov-name">{item.provider}</div><div className="ofp-prov-role">Provider</div></div>
                </div>
                <a className="ofp-link" href="Catalogue.html"><Icon name="external" size={13}/> View organisation</a>
              </div>
            </div>

            <section className="os-panel ofp-panel">
              <div className="os-panel-body ofp-panel-body">
                <section className="ofp-sec">
                  <SecHead id="about"/>
                  <p className="ofp-body">{item.desc} It is exposed through the VisionsTrust data space with consent-governed access and standard exchange protocols. Access is granted through a contract negotiated from the baseline below.</p>
                </section>

                <section className="ofp-sec">
                  <div className="ofp-sechead ofp-sechead-row">
                    <div><h3>{HEAD.packages.title}</h3>{HEAD.packages.desc ? <p>{HEAD.packages.desc}</p> : null}</div>
                    <div className="ofp-modeseg" role="group" aria-label="How the offer is sold">
                      {["Packages", "Single price"].map((m) => (
                        <button type="button" key={m} className={tw.pricing === m ? "on" : ""} aria-pressed={tw.pricing === m} onClick={() => { setTweak("pricing", m); setPkgId(null); setAdded(null); }}>{m}</button>
                      ))}
                    </div>
                  </div>
                  {pkgs.length ? <PackageCompare item={item} pkgs={pkgs} selected={pkgId} onSelect={setPkgId} added={added} onAdd={setAdded}/> : (
                    <>
                      <div className="ofd-base flat">
                        {[["Price", single.sub === 0 ? "Free" : `${CO.fmtN(single.sub)} ${single.currency} ${CO.billLabel(single)}`],
                          ["Set-up fee", single.setup ? `${CO.fmtN(single.setup)} ${single.currency}` : "No set-up fee"],
                          ["Per-call cost", single.api ? `${single.api} ${single.currency} per call` : "No per-call cost"],
                          ["Price conditions", single.neg ? `Negotiable${single.accept ? ` · ${CO.fmtN(single.accept.min)}–${CO.fmtN(single.accept.max)} ${single.currency}` : ""}` : "Fixed as published"],
                          ["Resources included", CO.pkgResources(item, single).join(" · ")]].map(([k, v]) => (
                          <div className="ofd-brow" key={k}>
                            <span className="ofd-bk">{k}</span>
                            <span className="ofd-bv">{v}</span>
                            <span className={k === "Price conditions" && single.neg ? "ofd-btag auto" : "ofd-btag"}>{k === "Price conditions" && single.neg ? <><Icon name="triggers" size={9}/> Negotiable</> : <><Icon name="lock" size={9}/> Fixed</>}</span>
                          </div>
                        ))}
                      </div>
                      <div className="ofp-single-cta">
                        {added === "single"
                          ? <a className="ofd-pkg-btn added" href={BASKET_HREF}><Icon name="check" size={13}/> Added · View basket</a>
                          : <button type="button" className="ofd-pkg-btn on" onClick={() => setAdded("single")}><Icon name="cart" size={13}/> Add to basket</button>}
                      </div>
                    </>
                  )}
                </section>

                {!pkgs.length && (
                  <section className="ofp-sec">
                    <SecHead id="policies"/>
                    <div className="ofd-pol-row"><CO.PolicyChips list={policies}/></div>
                  </section>
                )}

                {CO.baselineOf(item, pkg).map((s) => (
                  <section className="ofp-sec" key={s.id}>
                    <div className="ofp-sechead"><h3>{s.label}</h3>{pkg && !single ? <p>As published for the {pkg.name} package.</p> : null}</div>
                    <div className="ofd-base flat">
                      {s.fields.map((f) => (
                        <div className="ofd-brow" key={f.id}>
                          <span className="ofd-bk" title={f.meaning}>{f.label}</span>
                          <span className="ofd-bv">{f.value}</span>
                          <span className={f.auto ? "ofd-btag auto" : "ofd-btag"}>{f.auto ? <><Icon name="triggers" size={9}/> Auto-accept</> : <><Icon name="lock" size={9}/> Fixed</>}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

                <section className="ofp-sec">
                  <div className="ofd-note"><Icon name="info" size={13}/><span><b>Fixed</b> fields stand as published. <b>Auto-accept</b> fields can be moved by the contract agent against your acceptance baseline once the offer is in a basket.</span></div>
                </section>

              </div>
            </section>
          </div>
        </div>
      </div>

      <TweaksPanel title="Offer page">
        <TweakSection label="Pricing"/>
        <TweakRadio label="How the offer is sold" value={tw.pricing} options={["Packages", "Single price"]} onChange={(v) => { setTweak("pricing", v); setPkgId(null); setAdded(null); }}/>
      </TweaksPanel>
    </AppLayout>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<OfferPage/>);
})();
