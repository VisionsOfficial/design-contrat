// VisionsTrust — Demo 07/08 · Confirmation. Last screen of the test drive.
(function () {
const { useState } = React;
const { Icon } = window.UI;
const { AppLayout } = window.VTLayout;
const D = window.Demo;
const U = window.DemoUI;
const { fmtN } = D;

function Confirmation() {
  const [st] = useState(() => D.load());
  const r = st.receipt;

  const restart = () => { D.reset(); D.flash("Basket reset — the demo is ready to be replayed.", "info"); location.href = D.PAGES.catalog; };

  if (!r) {
    return (
      <AppLayout title="Confirmation" activeId="offers" cartCount={st.cart.length} cartHref={D.PAGES.basket} className="bk-app">
        <div className="bk-content"><div className="bk-page">
          <div className="bk-empty">
            <div className="bk-empty-ic"><Icon name="check" size={26} /></div>
            <h2>Nothing was sent yet</h2>
            <p>Go through the basket to the last step to reach this confirmation screen.</p>
            <a className="bk-confirm" href={D.PAGES.catalog}>Back to catalog <Icon name="arrowRight" size={15} /></a>
          </div>
        </div></div>
      </AppLayout>
    );
  }

  const lines = r.lines.map((l) => { const offer = D.byId(l.offerId); return { ...l, offer, pkg: D.pkgById(offer, l.pkgId) }; }).filter((l) => l.offer);
  const monthly = lines.reduce((n, l) => n + Number(l.price || 0), 0);
  const setup = lines.reduce((n, l) => n + Number(l.pkg.setup || 0), 0);
  const counters = lines.filter((l) => Number(l.price) !== Number(l.pkg.price)).length;
  const newNegos = (r.services || []).filter((s) => s.source !== "project");
  const riders = (r.services || []).filter((s) => s.source === "project" && s.contractRef);
  const sentAt = new Date(r.at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <AppLayout title="Confirmation" activeId="offers" cartCount={st.cart.length} cartHref={D.PAGES.basket} className="bk-app">
      <div className="bk-content">
        <div className="bk-page">
          <div className="bk-sent dm-done">
            <div className="bk-sent-ic"><Icon name="check" size={30} /></div>
            <h2>Sent to providers</h2>
            <p>{lines.length} offer{lines.length !== 1 ? "s" : ""} assigned to <b>{r.target}</b>{r.targetCaption ? ` — ${r.targetCaption}` : ""}. Counter-offers go to the providers for negotiation; everything else is confirmed as published. Sent on {sentAt}.</p>

            <div className="dm-lines">
              {lines.map((l) => (
                <div className="dm-line" key={l.offerId}>
                  <U.Monogram offer={l.offer} size={46} />
                  <div className="dm-line-main">
                    <div className="dm-line-n">{l.offer.name} <U.PiiTag pii={l.offer.pii} /></div>
                    <div className="dm-line-s">{l.offer.provider} · {l.pkg.name} package · {fmtN(l.pkg.vol)} {l.offer.unit} · {D.scoreOf(l.offer).gapCount} gap{D.scoreOf(l.offer).gapCount !== 1 ? "s" : ""} / {D.scoreOf(l.offer).meetCount} meet</div>
                  </div>
                  <div className="dm-line-p">
                    {Number(l.price) === 0 ? "Free" : `${fmtN(l.price)} ${l.offer.currency}`}
                    <em>{Number(l.price) === 0 ? "no recurring fee" : "per month"}{Number(l.price) !== Number(l.pkg.price) ? ` · countered from ${fmtN(l.pkg.price)}` : ""}</em>
                  </div>
                </div>
              ))}
            </div>
            <div className="dm-total">
              <span className="dm-total-k">Monthly total requested{setup ? ` · ${fmtN(setup)} EUR set-up fees (once)` : ""}</span>
              <span className="dm-total-v">{fmtN(monthly)} EUR / month</span>
            </div>

            <div className="bk-next">
              <div className="bk-next-h">What is left to do</div>
              <ol className="bk-next-list">
                <li><span className="bk-next-n">1</span><div><b>Providers respond to your counter-offers</b><em>{counters ? `${counters} price counter${counters !== 1 ? "s" : ""} and your baseline changes are with the providers' agents.` : "No price was countered."} Each response lands in your notifications and in the project's contract list.</em></div></li>
                {r.hasPII && (
                  <li><span className="bk-next-n">2</span><div><b>{newNegos.length > 0 ? `${newNegos.length} data ⇄ service negotiation${newNegos.length !== 1 ? "s" : ""} opened` : "Personal-data usage recorded"}</b><em>{(r.services || []).map((s) => s.name).join(", ")} {(r.services || []).length !== 1 ? "are" : "is"} authorised to process {(r.dataOffers || []).map((id) => (D.byId(id) || {}).name).join(", ")}. Personal-data terms are locked for every party{riders.length ? `; contract${riders.length !== 1 ? "s" : ""} ${riders.map((s) => s.contractRef).join(", ")} received a personal-data rider` : ""}.</em></div></li>
                )}
                <li><span className="bk-next-n">{r.hasPII ? 3 : 2}</span><div><b>Activate the exchange in the project</b><em>Once every contract is signed, switch <b>{r.target}</b> live to start the data exchange.</em></div></li>
              </ol>
            </div>

            <div className="bk-sent-actions">
              <a className="bk-confirm" href="My Projects.html">Go to project <Icon name="arrowRight" size={15} /></a>
              <button type="button" className="bk-btn" onClick={restart}><Icon name="refresh" size={14} /> Back to catalog (resets the basket)</button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Confirmation />);
})();
