// VisionsTrust — Basket · explainer (alternative to the guided tour).
// Two pieces, both non-blocking and available at any time:
//   ExplainDock  — a docked, collapsible panel: hovering an entry lights up the
//                  matching zone in the page, clicking it reveals the detail.
//   WhyVerdict   — a per-offer disclosure that explains THIS card's state: what
//                  was checked, which fields are off and what each action does.
(function () {
const { useState, useEffect, useRef } = React;
const { Icon } = window.UI;

const TOPICS = [
  { id: "baseline", icon: "sliders", sel: ".bk-baseline", steps: [2], title: "Your acceptance baseline",
    body: "Your own minimum requirements, set once in settings. Every offer here is measured against them, so you never read a contract line by line to spot what is off." },
  { id: "packages", icon: "coin", sel: ".bk-pkg-pick,.bk-pkg-chosen", steps: [1, 2], title: "Packages come first",
    body: "Some offers sell the same data through several formulas. The package sets the price, the usage policies and part of the service levels — so it has to be picked before anything else. Changing it later restarts the negotiation." },
  { id: "badges", icon: "triggers", sel: ".bk2-summary", steps: [1, 2], title: "Gaps, at a glance",
    body: "“Gap” means a field sits below your baseline, “meet” means it clears it. With no baseline set nothing is checked — the card says so rather than claiming it passed." },
  { id: "fixed", icon: "lock", sel: ".bk-fixed-tag,.bk2-drow.fixed", steps: [1, 2], title: "Fixed vs negotiable",
    body: "Most fields are fixed: the provider publishes them and they apply as-is. Only the ones left open to auto-accept can be moved — everything else carries a “Fixed” lock.",
    where: "Open “View full baseline” to see the lock on each fixed field." },
  { id: "settle", icon: "scale", sel: ".bk2-gaps,.bk2-verdict", steps: [2], title: "Two ways to settle",
    body: "Answer the whole offer in one move — accept the published baseline, or propose yours — or settle gap by gap. Only the fields you actually move are sent to the provider." },
  { id: "full", icon: "list", sel: ".bk2-viewfull", steps: [1, 2], title: "The full contract",
    body: "Opens every field of the offer, fixed ones included, and lets you edit any negotiable one without leaving the page." },
];

// Lights up the zone a topic talks about, without scrolling the page around.
function useSpotlight(sel) {
  useEffect(() => {
    if (!sel) return;
    const els = Array.from(document.querySelectorAll(sel));
    els.forEach((el) => el.classList.add("bk-xp-lit"));
    return () => els.forEach((el) => el.classList.remove("bk-xp-lit"));
  }, [sel]);
}

// How many nodes a topic actually points at right now — a topic whose target
// lives in the drawer matches nothing on step 1, and says so instead of
// looking broken.
function useMatchCount(sel) {
  const [n, setN] = useState(0);
  useEffect(() => { setN(sel ? document.querySelectorAll(sel).length : 0); }, [sel]);
  return n;
}

function ExplainDock({ open, step = 2, onClose }) {
  const topics = TOPICS.filter((t) => !t.steps || t.steps.includes(step));
  const [openId, setOpenId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const lit = topics.find((t) => t.id === (hoverId || openId));
  const openTopic = topics.find((t) => t.id === openId);
  useSpotlight(open && lit ? lit.sel : null);
  const openHits = useMatchCount(open && openTopic ? openTopic.sel : null);
  if (!open) return null;
  return (
    <aside className="bk-xp" role="complementary" aria-label="How this page works">
      <header className="bk-xp-head">
        <span className="bk-xp-ic"><Icon name="help" size={15} /></span>
        <div className="bk-xp-title">How this page works</div>
        <button type="button" className="bk-xp-x" onClick={onClose} aria-label="Close the explainer"><Icon name="x" size={14} /></button>
      </header>
      <p className="bk-xp-lead">Point at a line to light up the matching part of the page.</p>
      <div className="bk-xp-list">
        {topics.map((t) => {
          const on = openId === t.id;
          return (
            <div className={`bk-xp-item${on ? " on" : ""}`} key={t.id}
              onMouseEnter={() => setHoverId(t.id)} onMouseLeave={() => setHoverId(null)}>
              <button type="button" className="bk-xp-btn" aria-expanded={on} onFocus={() => setHoverId(t.id)} onBlur={() => setHoverId(null)}
                onClick={() => setOpenId(on ? null : t.id)}>
                <span className="bk-xp-bic"><Icon name={t.icon} size={13} /></span>
                <span className="bk-xp-bt">{t.title}</span>
                <Icon name={on ? "chevronUp" : "chevronDown"} size={14} />
              </button>
              {on && <p className="bk-xp-body">{t.body}{openHits === 0 && t.where && <span className="bk-xp-where"><Icon name="info" size={11} /> {t.where}</span>}</p>}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ─── PER-OFFER EXPLANATION ────────────────────────────────────────────────────
function WhyVerdict({ d, terms, needsPkg, hasBaseline, fmtVal }) {
  const [open, setOpen] = useState(false);
  const negCount = d.negs.length;
  const checked = d.withBase.length;
  return (
    <div className={`bk-why${open ? " open" : ""}`}>
      <button type="button" className="bk-why-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="help" size={13} /> Why this verdict?
        <Icon name={open ? "chevronUp" : "chevronDown"} size={13} />
      </button>
      {open && (
        <div className="bk-why-body">
          {needsPkg ? (
            <p className="bk-why-p">Nothing has been checked yet: the price, the usage policies and part of the service levels come from the package. Pick one and this card fills in.</p>
          ) : (
            <>
              <div className="bk-why-counts">
                <span><b>{negCount}</b> negotiable</span>
                <span><b>{terms.fixedCount}</b> fixed</span>
                {hasBaseline && <span><b>{checked}</b> checked against your baseline</span>}
              </div>
              {!hasBaseline ? (
                <p className="bk-why-p">You have no acceptance baseline, so nothing was compared. The card reports what the provider published — the reading is yours to do.</p>
              ) : negCount === 0 ? (
                <p className="bk-why-p">Every field on this offer is fixed. There is nothing to compare and nothing to negotiate — accepting is the only move.</p>
              ) : checked === 0 ? (
                <p className="bk-why-p">Your baseline covers none of the fields this provider left negotiable, so no gap could be raised.</p>
              ) : d.gapCount === 0 ? (
                <p className="bk-why-p">All {checked} checked field{checked !== 1 ? "s" : ""} clear your baseline, so no gap is raised.</p>
              ) : (
                <>
                  <p className="bk-why-p">{d.gapCount} field{d.gapCount !== 1 ? "s" : ""} sit{d.gapCount === 1 ? "s" : ""} below your baseline:</p>
                  <ul className="bk-why-gaps">
                    {d.gapFields.map((f) => (
                      <li key={f.id}><b>{f.label}</b> — offer gives {fmtVal(f, f.baseline)}, you require {f.userBase.label}</li>
                    ))}
                  </ul>
                </>
              )}
              <div className="bk-why-acts">
                <div className="bk-why-act"><Icon name="check" size={12} /><span><b>Accept</b> takes the provider's values as published — the offer is settled, nothing goes back to them.</span></div>
                {hasBaseline && checked > 0 && <div className="bk-why-act"><Icon name="sliders" size={12} /><span><b>Propose</b> replaces the negotiable values with your baseline and sends the difference to the provider.</span></div>}
                <div className="bk-why-act"><Icon name="edit" size={12} /><span><b>Edit</b> lets you set your own figure per field, whether or not you have a baseline for it.</span></div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

window.BK3Explain = { ExplainDock, WhyVerdict, TOPICS };
})();
