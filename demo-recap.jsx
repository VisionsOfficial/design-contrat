// VisionsTrust — Demo 07/08 · shared recap blocks (basket confirm step + personal-data recap).
(function () {
const { useState } = React;
const { Icon } = window.UI;
const D = window.Demo;
const U = window.DemoUI;
const { fmtVal, fmtN, eq, isGap } = D;

// Effective value of a field for one offer: the buyer's shared form value when he
// moved it, the provider's published baseline otherwise.
const valueOf = (form, f) => (form[f.id] !== undefined ? form[f.id] : f.baseline);

function lineModel(line, st) {
  const t = D.termsOf(line.offer);
  const s = D.scoreOf(line.offer);
  const moved = t.negFields
    .map((f) => ({ f, v: valueOf(st.form, f) }))
    .filter((x) => !eq(x.v, x.f.baseline))
    .map((x) => ({ ...x, gap: !!x.f.userBase && isGap(x.f, x.v, x.f.userBase) && !st.conceded.includes(x.f.id) }));
  const price = U.priceOf(line.offer, line.pkg, st.prices);
  return { ...line, terms: t, score: s, moved, price, priceMoved: price !== Number(line.pkg.price) };
}

// ─── PERSISTENT SUMMARY BAR ───────────────────────────────────────────────────
function RecapBar({ lines, target }) {
  const [open, setOpen] = useState(false);
  if (!lines.length) return null;
  const gapTotal = lines.reduce((n, l) => n + D.scoreOf(l.offer).gapCount, 0);
  const pii = lines.filter((l) => l.offer.pii === "contains").length;
  return (
    <div className={`bk-recap ${open ? "open" : ""}`}>
      <button type="button" className="bk-recap-bar" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="bk-recap-title"><Icon name="list" size={14} /> Summary</span>
        <span className="bk-recap-stats">
          <span className="bk-recap-pill"><b>{lines.length}</b><span>offer{lines.length !== 1 ? "s" : ""}</span></span>
          {gapTotal > 0
            ? <span className="bk-recap-pill gap"><Icon name="triggers" size={11} /><b>{gapTotal}</b><span>gap{gapTotal !== 1 ? "s" : ""} vs your baseline</span></span>
            : <span className="bk-recap-pill ok"><Icon name="check" size={11} /><span>No gap</span></span>}
          {pii > 0 && <span className="bk-recap-pill"><Icon name="shield" size={11} /><b>{pii}</b><span>personal-data offer{pii !== 1 ? "s" : ""}</span></span>}
          {target && <span className="bk-recap-pill"><Icon name="folder" size={11} /> {target}</span>}
        </span>
        <span className="bk-recap-cta">{open ? "Hide" : "Details"}<Icon name={open ? "chevronUp" : "chevronDown"} size={15} /></span>
      </button>
      {open && (
        <div className="bk-recap-body">
          {lines.map((l) => {
            const s = D.scoreOf(l.offer);
            return (
              <div className="bk-recap-row" key={l.offer.id}>
                <U.Monogram offer={l.offer} size={30} />
                <span className="bk-recap-name">{l.offer.name}{l.pkg ? ` · ${l.pkg.name}` : ""}</span>
                {s.gapCount
                  ? <span className="bk-recap-tag gap"><Icon name="triggers" size={10} /><span>{s.gapCount} gap{s.gapCount !== 1 ? "s" : ""}</span></span>
                  : <span className="bk-recap-tag ok"><Icon name="check" size={10} /><span>No gap</span></span>}
              </div>
            );
          })}
          {target && <div className="bk-recap-target"><Icon name="folder" size={13} /> Assigning to <b>{target}</b></div>}
        </div>
      )}
    </div>
  );
}

// ─── CONFIRM / READ-ONLY RECAP ────────────────────────────────────────────────
function ConfirmStep({ lines, st, target, targetCaption, onView, readOnlyNote }) {
  const models = lines.map((l) => lineModel(l, st));
  const movedTotal = models.reduce((n, m) => n + m.moved.length, 0);
  const movedOffers = models.filter((m) => m.moved.length > 0).length;
  const priceCounters = models.filter((m) => m.priceMoved).length;
  const gapTotal = models.reduce((n, m) => n + m.moved.filter((x) => x.gap).length, 0);
  return (
    <div className="bk-confirm-wrap">
      <div className="bk-confirm-target">
        <div className="bk-ct-ic"><Icon name="folder" size={18} /></div>
        <div><div className="bk-ct-label">Assigning to</div><div className="bk-ct-name">{target}</div>{targetCaption && <div className="bk-ct-cap">{targetCaption}</div>}</div>
        <div className="bk-ct-count">{lines.length} offer{lines.length !== 1 ? "s" : ""}</div>
      </div>
      {readOnlyNote && <div className="bk-banner review"><Icon name="lock" size={16} /><span>{readOnlyNote}</span></div>}
      {movedTotal === 0 && priceCounters === 0 ? (
        <div className="bk-banner ok"><Icon name="check" size={16} /><span>Nothing to negotiate — every offer is taken exactly as published.</span></div>
      ) : (
        <div className="bk-banner review"><Icon name="triggers" size={16} /><span><b>{movedTotal}</b> baseline field{movedTotal !== 1 ? "s" : ""} across {movedOffers} offer{movedOffers !== 1 ? "s" : ""}{priceCounters ? ` and ${priceCounters} price counter${priceCounters !== 1 ? "s" : ""}` : ""} {movedTotal + priceCounters !== 1 ? "go" : "goes"} to the provider{movedOffers !== 1 ? "s" : ""} for negotiation{gapTotal > 0 ? <> — <b>{gapTotal}</b> of them still {gapTotal !== 1 ? "sit" : "sits"} below your baseline</> : ""}. Every other field is confirmed as published.</span></div>
      )}
      {models.map((m) => (
        <div className="bk-review-offer" key={m.offer.id}>
          <U.OfferHead offer={m.offer} size={34}>
            {onView && <button type="button" className="bk-btn ghost sm" onClick={() => onView(m.offer.id)}><Icon name="list" size={14} /> View full baseline</button>}
          </U.OfferHead>
          <div className="bk-conf-grid">
            <div className="bk-conf-cell">
              <div className="bk-conf-k">Package &amp; pricing</div>
              <div className="bk-conf-v">
                <b>{m.pkg.name}</b> · {fmtN(m.pkg.vol)} {m.offer.unit} · {m.pkg.price === 0 ? "Free" : `${fmtN(m.pkg.price)} ${m.offer.currency}/month`}
                <div className="bk-conf-sub">{m.pkg.setup ? `Set-up fee ${fmtN(m.pkg.setup)} ${m.offer.currency} (once)` : "No set-up fee"} · {m.pkg.policies.join(", ") || "no usage policy"}</div>
                {m.priceMoved && <div className="bk-conf-sub"><b>Your price counter: {fmtN(m.price)} {m.offer.currency}/month</b> (published {fmtN(m.pkg.price)}) — sent to the provider's agent</div>}
              </div>
            </div>
            <div className="bk-conf-cell">
              <div className="bk-conf-k">Usage policies</div>
              <div className="bk-pkg-pols">{m.pkg.policies.map((x) => <span className="bk-pkg-pol" key={x}>{x}</span>)}</div>
            </div>
            <div className="bk-conf-cell">
              <div className="bk-conf-k">Against your baseline</div>
              <U.StatusBadges offer={m.offer} />
            </div>
          </div>
          {m.moved.length > 0 ? (
            <div className="bk2-settle">
              <div className="bk2-settle-head">
                <Icon name="triggers" size={13} /> Baseline to settle <span className="bk2-settle-n">{m.moved.length}</span>
                <span className="bk2-settle-sub">Only these go to {m.offer.provider}. The rest of the contract stands as published.</span>
              </div>
              {m.moved.map(({ f, v, gap }) => (
                <div className={`bk2-settle-row ${gap ? "gap" : ""}`} key={f.id}>
                  <div className="bk2-settle-top">
                    <span className="bk2-settle-name">{f.label}</span>
                    {gap
                      ? <span className="bk-st st-gap"><Icon name="triggers" size={10} /> Below your baseline</span>
                      : f.userBase
                        ? <span className="bk-st st-ok"><Icon name="check" size={10} /> Meets your baseline</span>
                        : <span className="bk-st st-edit"><Icon name="edit" size={10} /> Your own value</span>}
                  </div>
                  <ol className="bk2-xchg">
                    <li className="done"><span className="bk2-xchg-who">{m.offer.provider} published</span><span className="bk2-xchg-val">{fmtVal(f, f.baseline)}</span></li>
                    <li className="you"><span className="bk2-xchg-who">You counter</span><span className="bk2-xchg-val">{fmtVal(f, v)}</span></li>
                    <li className="wait"><span className="bk2-xchg-who">Awaiting response</span><span className="bk2-xchg-val muted">sent on confirm</span></li>
                  </ol>
                  {f.userBase && <div className="bk2-settle-base"><Icon name="sliders" size={11} /> Your baseline: <b>{f.userBase.label}</b>{gap ? " — your counter still falls short" : ""}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="bk2-settle-none"><Icon name="check" size={14} /> Nothing changed — the provider's baseline is accepted as published.</div>
          )}
        </div>
      ))}
    </div>
  );
}

window.DemoRecap = { RecapBar, ConfirmStep, lineModel, valueOf };
})();
