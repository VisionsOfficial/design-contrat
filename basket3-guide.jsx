// VisionsTrust — Basket guide.
// A skippable, step-by-step coach tour over the basket's negotiation flow. Each step
// spotlights a real element on the page (no fake screenshots), explains what it is for,
// and can be left at any moment. Once finished or skipped it never auto-opens again;
// the "Guide" button in the step header brings it back.
(function () {
const { useState, useEffect, useRef, useCallback } = React;
const { Icon } = window.UI;
const LS_GUIDE = "vt.basket.guide.v1";

// Steps are declarative: the first selector that exists on the page wins, so the tour
// adapts to what the buyer actually has in the basket (packaged offer or not).
const GUIDE_STEPS = [
  {
    id: "flow", sel: [".bk-stepper"], place: "below",
    title: "Three steps, one contract",
    body: "Settle the baseline of every offer, assign them to a project, then send. Nothing leaves the basket until the last step — you can go back and forth freely.",
  },
  {
    id: "baseline", sel: [".bk-baseline"], place: "below",
    title: "Your acceptance baseline drives everything",
    body: "These are your own minimum requirements, set once in your settings. Every offer here is measured against them, so you never read the baseline line by line to spot what is off.",
  },
  {
    id: "packages", sel: [".bk-pkg-pick", ".bk-pkg-chosen"], place: "above",
    title: "Pick a package before adjusting the baseline",
    body: "Some offers come in several formulas. The package sets the price, the usage policies and part of the service levels — so it has to be chosen first. Changing it later restarts the negotiation on that offer.",
    optional: true,
  },
  {
    id: "facts", sel: [".bk-facts"], place: "below",
    title: "Price and usage policies, up front",
    body: "What you will pay and what you may do with the data are on the card itself — set-up fee, cost per call, and the policies attached to the offer or to the package you picked.",
  },
  {
    id: "badges", sel: [".bk2-summary-acts", ".bk2-summary"], place: "below", optional: true,
    title: "Gaps tell you where to look",
    body: "“Gap” means a field sits below your baseline. Answer the whole offer in one move — accept the published baseline, or propose yours — and the offer is settled.",
  },
  {
    id: "gaps", sel: [".bk2-gaps", ".bk2-verdict"], place: "above", optional: true,
    title: "Or settle field by field",
    body: "Each gap can be accepted as published or countered with your own value. Only the baseline fields you actually move are sent to the provider; everything else stands as published.",
  },
  {
    id: "full", sel: [".bk2-viewfull"], place: "below",
    title: "The full contract is one click away",
    body: "“View full baseline” opens every field of the offer — fixed ones included — and lets you edit any negotiable field without leaving the page.",
  },
  {
    id: "next", sel: [".bk-nav .bk-confirm", ".bk-nav"], place: "above",
    title: "Continue when every offer is settled",
    body: "The button tells you exactly what is missing — a package to choose, or offers still awaiting a decision. Then you assign them to a project and review before sending.",
  },
];

const scroller = () => { const sc = document.querySelector(".bk-content"); return sc && sc.scrollHeight - sc.clientHeight > 4 ? sc : null; };
function bringIntoView(el, want) {
  const r = el.getBoundingClientRect();
  const delta = r.top - want;
  const sc = scroller();
  if (sc) sc.scrollTop += delta; else window.scrollBy(0, delta);
}
const firstEl = (sels) => { for (const s of sels) { const el = document.querySelector(s); if (el && el.getClientRects().length) return el; } return null; };

function GuideTour({ open, onClose, onFinish }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const raf = useRef(0);

  const steps = GUIDE_STEPS.filter((s) => !s.optional || firstEl(s.sel));
  const step = steps[Math.min(i, steps.length - 1)];

  const measure = useCallback(() => {
    if (!step) return;
    const el = firstEl(step.sel);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  // Bring the target into a comfortable position, then measure.
  useEffect(() => {
    if (!open || !step) return;
    const el = firstEl(step.sel);
    if (el) bringIntoView(el, Math.max(120, window.innerHeight * 0.3));
    const id = setTimeout(measure, 260);
    return () => clearTimeout(id);
  }, [open, i, step, measure]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(measure); };
    const sc = scroller();
    sc && sc.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => { sc && sc.removeEventListener("scroll", onMove); window.removeEventListener("scroll", onMove); window.removeEventListener("resize", onMove); cancelAnimationFrame(raf.current); };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, steps.length, onClose]);

  useEffect(() => { if (open) setI(0); }, [open]);

  if (!open || !step) return null;
  const last = i >= steps.length - 1;
  const pad = 8;
  const ring = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;

  // Card placement: under the spotlight when there is room, above otherwise.
  const CARD_W = 372, CARD_H = 208;
  let cardStyle = { left: 24, bottom: 24 };
  if (ring) {
    const below = ring.top + ring.height + 14;
    const wantAbove = step.place === "above" || below + CARD_H > window.innerHeight - 16;
    const rawTop = wantAbove ? ring.top - CARD_H - 14 : below;
    const top = Math.min(Math.max(16, rawTop), Math.max(16, window.innerHeight - CARD_H - 16));
    const left = Math.min(Math.max(16, ring.left), window.innerWidth - CARD_W - 16);
    cardStyle = { top, left, width: CARD_W };
  }

  return (
    <div className="bkg-layer" role="dialog" aria-modal="true" aria-label="Basket guide">
      <div className="bkg-dim" onClick={onClose} />
      {ring && <div className="bkg-ring" style={ring} />}
      <div className="bkg-card" style={cardStyle}>
        <div className="bkg-top">
          <span className="bkg-count">Guide · {i + 1} of {steps.length}</span>
          <button type="button" className="bkg-skip" onClick={onClose}>Skip the guide</button>
        </div>
        <h3 className="bkg-title">{step.title}</h3>
        <p className="bkg-body">{step.body}</p>
        <div className="bkg-dots">{steps.map((s, n) => <span key={s.id} className={n === i ? "on" : n < i ? "done" : ""} />)}</div>
        <div className="bkg-foot">
          <button type="button" className="bkg-btn ghost" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}><Icon name="chevronLeft" size={14} /> Back</button>
          {last
            ? <button type="button" className="bkg-btn primary" onClick={onFinish}>Got it <Icon name="check" size={14} /></button>
            : <button type="button" className="bkg-btn primary" onClick={() => setI((n) => n + 1)}>Next <Icon name="arrowRight" size={14} /></button>}
        </div>
      </div>
    </div>
  );
}

// Offers the tour once per browser, and a manual re-entry point after that.
function useBasketGuide() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(LS_GUIDE) === "done"; } catch (e) { return true; } });
  useEffect(() => {
    if (seen) return;
    const id = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(id);
  }, [seen]);
  const done = () => { try { localStorage.setItem(LS_GUIDE, "done"); } catch (e) {} setSeen(true); setOpen(false); };
  return { open, seen, start: () => setOpen(true), close: done, finish: done };
}

window.BK3Guide = { GuideTour, useBasketGuide };
})();
