// VisionsTrust — shared components for My Projects pages (per-offer exit requests)
(function() {
const { useState, useEffect, useRef } = React;
const { Icon } = window.UI;
const D = window.ProjectsData;
const { ORG, ECO, EXIT_STATUS_META, EXIT_EVENT_META, impactedChains, chainsUsing, fmtDate, initials, isCurrent, isFinished } = D;

// ─── atoms ──────────────────────────────────────────────────────────────────
const OrgAv = ({ orgId, size = 40, radius = 10, className = "" }) => {
  const o = ORG[orgId];
  return (
    <span className={className} style={{ width: size, height: size, borderRadius: radius, background: o.color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: Math.max(9, size * 0.32), flex: "none" }} aria-hidden="true">
      {initials(o.name)}
    </span>
  );
};

const StatusPill = ({ tone, icon, children }) => (
  <span className={`pill pill-${tone}`}>{icon && <Icon name={icon} size={12}/>}{children}</span>
);

const ExitPill = ({ status }) => {
  const m = EXIT_STATUS_META[status];
  return <StatusPill tone={m.tone} icon={m.icon}>{m.label}</StatusPill>;
};

const OfferTag = ({ offer, type }) => (
  <span className="offer-tag"><span className={`pj-offer-type ${type}`}>{type}</span><span className="ot-name" title={offer}>{offer}</span></span>
);

// ─── toast ──────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null);
  const t = useRef(null);
  const show = (msg) => { setToast(msg); clearTimeout(t.current); t.current = setTimeout(() => setToast(null), 2600); };
  const node = toast ? <div className="pj-toast" role="status"><Icon name="check" size={15}/>{toast}</div> : null;
  return [node, show];
}

// ─── modal shell ────────────────────────────────────────────────────────────
function Modal({ title, sub, onClose, children, foot, steps, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="pj-modal-backdrop" onClick={onClose}>
      <div className="pj-modal" style={wide ? { width: "min(760px, 100%)" } : null} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        {steps}
        <div className="pj-modal-head">
          <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
          <button type="button" className="pj-kebab x" onClick={onClose} aria-label="Close"><Icon name="x" size={16}/></button>
        </div>
        <div className="pj-modal-body">{children}</div>
        {foot && <div className="pj-modal-foot">{foot}</div>}
      </div>
    </div>
  );
}

const Steps = ({ steps, current, onGo }) => (
  <div className="pj-steps" aria-label="Progress">
    {steps.map((s, i) => {
      const cls = `pj-step ${i === current ? "cur" : i < current ? "done" : ""}`;
      const inner = <><span className="sn">{i < current ? <Icon name="check" size={11}/> : i + 1}</span>{s}</>;
      return (
        <React.Fragment key={s}>
          {i > 0 && <span className="pj-step-sep" aria-hidden="true"/>}
          {onGo && i < current
            ? <button type="button" className={cls + " clickable"} onClick={() => onGo(i)} title={`Back to ${s}`}>{inner}</button>
            : <span className={cls}>{inner}</span>}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── copy-to-clipboard micro button ─────────────────────────────────────────
function CopyBtn({ value, label = "Copy" }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="pj-mini-btn" onClick={() => { navigator.clipboard?.writeText(value); setOk(true); setTimeout(() => setOk(false), 1400); }}>
      <Icon name={ok ? "check" : "copy"} size={12}/>{ok ? "Copied" : label}
    </button>
  );
}

// ─── rich offer accordion ───────────────────────────────────────────────────
function OfferSummary({ offer }) {
  const n = chainsUsing(offer.name);
  return (
    <>
      <span className={`pj-offer-type ${offer.type}`}>{offer.type}</span>
      <span className="oa-name" title={offer.name}>{offer.name}</span>
      <span className="oa-sum">
        {n > 0 && <span className="oa-chip" title={`Used in ${n} service chain${n > 1 ? "s" : ""}`}><Icon name="layers" size={11}/>{n}</span>}
        <span className="oa-price">{offer.pricing}</span>
      </span>
    </>
  );
}

function OfferBody({ offer, showTerms }) {
  const Terms = window.PJContract && window.PJContract.OfferContractTerms;
  return (
    <>
      {offer.desc && <p className="oa-desc">{offer.desc}</p>}
      <div className="oa-id"><span className="k">Offer ID</span><code>{offer.oid}</code><CopyBtn value={offer.oid}/></div>
      <div className="oa-grid">
        <div className="oa-block">
          <div className="bk"><Icon name="shield" size={12}/>Usage policy</div>
          <div className="bv">{offer.policy.name}</div>
          <div className="bd">{offer.policy.desc}</div>
        </div>
        <div className="oa-block">
          <div className="bk"><Icon name="coin" size={12}/>Pricing</div>
          <div className="bv">{offer.pricing}</div>
          <div className="bd">As negotiated in the project contract.</div>
        </div>
      </div>
      {offer.resources.length > 0 && (
        <div className="oa-res-wrap">
          <div className="bk"><Icon name="database" size={12}/>{offer.resources.length} resource{offer.resources.length > 1 ? "s" : ""} in this offer</div>
          {offer.resources.map(r => (
            <div className="oa-res" key={r.rid}><span className="rn" title={r.name}>{r.name}</span><code>{r.rid}</code><CopyBtn value={r.rid} label="ID"/></div>
          ))}
        </div>
      )}
      {showTerms && Terms && <Terms />}
    </>
  );
}

function OfferAcc({ offer, defaultOpen, showTerms }) {
  return (
    <details className="oa" open={defaultOpen}>
      <summary><OfferSummary offer={offer}/><Icon name="chevronDown" size={14} className="chev"/></summary>
      <div className="oa-body"><OfferBody offer={offer} showTerms={showTerms}/></div>
    </details>
  );
}

// clickable row (drawer mode) — same visual language as the accordion summary
function OfferRow({ offer, onOpen }) {
  return (
    <button type="button" className="oa-row" onClick={onOpen}>
      <OfferSummary offer={offer}/>
      <Icon name="chevronRight" size={15} className="chev"/>
    </button>
  );
}

// right-side drawer showing one offer's full content
function OfferDrawer({ offer, org, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!offer) return null;
  return (
    <div className="pj-drawer-scrim" onClick={onClose}>
      <aside className="pj-drawer" role="dialog" aria-modal="true" aria-label={offer.name} onClick={e => e.stopPropagation()}>
        <div className="pj-drawer-head">
          <div className="pj-drawer-titles">
            <div className="pj-drawer-org">{org && <><OrgAv orgId={org} size={22} radius={6}/> {ORG[org].name}</>}</div>
            <div className="pj-drawer-name"><span className={`pj-offer-type ${offer.type}`}>{offer.type}</span><span title={offer.name}>{offer.name}</span></div>
          </div>
          <button type="button" className="pj-kebab x" onClick={onClose} aria-label="Close"><Icon name="x" size={16}/></button>
        </div>
        <div className="pj-drawer-body"><OfferBody offer={offer} showTerms/></div>
      </aside>
    </div>
  );
}

// ─── contract: participants & offers grid (shared by all project pages) ─────
function ContractParticipants({ me }) {
  const [mode, setMode] = useState("cards");
  const [drawer, setDrawer] = useState(null); // { offer, org }
  return (
    <>
      <div className="ct-modebar">
        <span className="ct-modebar-label">Offer details</span>
        <div className="ct-seg" role="tablist" aria-label="Offer display mode">
          <button type="button" role="tab" aria-selected={mode === "cards"} className={mode === "cards" ? "active" : ""} onClick={() => setMode("cards")}><Icon name="list" size={13}/>Inline cards</button>
          <button type="button" role="tab" aria-selected={mode === "drawer"} className={mode === "drawer" ? "active" : ""} onClick={() => setMode("drawer")}><Icon name="panelLeft" size={13}/>Drawer</button>
        </div>
      </div>
      <div className="pj-contract-grid">
        {ECO.participants.map(p => (
          <div key={p.org} className="pj-part-card">
            <div className="pj-part-head">
              <OrgAv orgId={p.org} size={38} className="pj-part-av"/>
              <div><div className="pj-part-org" style={{ marginBottom: 1 }}>Proposed by</div><div className="pj-part-name">{ORG[p.org].name}{p.org === me && <span className="pill pill-primary" style={{ marginLeft: 6 }}>You</span>}</div></div>
            </div>
            <div className="pj-roles">{p.roles.map(r => <span key={r} className={`pj-role ${p.org === me ? "you" : ""}`}><Icon name="check" size={12}/>{r}</span>)}</div>
            <div className="pj-part-offers">
              {mode === "cards"
                ? p.offers.map(o => <OfferAcc key={o.id} offer={o} showTerms/>)
                : p.offers.map(o => <OfferRow key={o.id} offer={o} onOpen={() => setDrawer({ offer: o, org: p.org })}/>)}
            </div>
          </div>
        ))}
      </div>
      {mode === "drawer" && drawer && <OfferDrawer offer={drawer.offer} org={drawer.org} onClose={() => setDrawer(null)}/>}
    </>
  );
}

// ─── project hero ───────────────────────────────────────────────────────────
function ProjectHero({ actions }) {
  return (
    <div className="pj-hero">
      <div className="pj-hero-logo" style={{ background: ORG[ECO.orchestrator].color }}>{initials(ECO.name)}</div>
      <div className="pj-hero-main">
        <div className="pj-hero-title">
          <h1>{ECO.name}</h1>
          <StatusPill tone="success" icon="globe">Published</StatusPill>
        </div>
        <p className="pj-hero-desc">{ECO.desc}</p>
        <div className="pj-usecases">
          {ECO.useCases.map(u => <span key={u} className="pj-usecase"><Icon name={u.includes("VR") ? "sparkle" : "layers"} size={13}/>{u}</span>)}
        </div>
        <div className="pj-hero-meta">
          <div className="m"><b>Orchestrator</b>{ORG[ECO.orchestrator].name}</div>
          <div className="m"><b>Created</b>{fmtDate(ECO.created)}</div>
          <div className="m"><b>Participants</b>{ECO.participants.length}</div>
          <div className="m"><b>Service chains</b>{ECO.chains.length}</div>
          <div className="m"><b>Contract ID</b><code>{ECO.contractId}</code></div>
        </div>
      </div>
      <div className="pj-hero-actions">{actions}</div>
    </div>
  );
}

const PersonaChip = ({ orgId, role }) => (
  <span className="persona-chip" title="Demo persona for this mockup">
    <span className="pc-role">Viewing as</span>
    <strong>{ORG[orgId].name}</strong>
    <span className="pc-role">· {role}</span>
    <OrgAv orgId={orgId} size={24} radius={12} className="pc-av"/>
  </span>
);

// ─── tab bar ────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onSelect, trailing }) {
  return (
    <div className="pj-tabbar" role="tablist">
      {tabs.map(t => (
        <button key={t.id} type="button" role="tab" aria-selected={active === t.id}
          className={`pj-tab ${active === t.id ? "active" : ""}`} onClick={() => onSelect(t.id)}>
          <Icon name={t.icon} size={15}/>{t.label}
          {t.badge ? <span className="tb">{t.badge}</span> : null}
        </button>
      ))}
      <span className="spacer"/>
      {trailing}
    </div>
  );
}

// ─── service chain card (aware of ALL active/approved requests) ─────────────
function ChainCard({ chain, reqs }) {
  const approvedOffers = reqs.filter(r => r.status === "approved").map(r => r.offer);
  const pendingOffers = reqs.filter(r => isCurrent(r.status)).map(r => r.offer);
  const deactivated = chain.nodes.some(n => approvedOffers.includes(n.offer));
  const atRisk = !deactivated && chain.nodes.some(n => pendingOffers.includes(n.offer));
  const decidedAt = (reqs.find(r => r.status === "approved" && chain.nodes.some(n => n.offer === r.offer)) || {}).effectiveDate;
  return (
    <div className={`pj-chain-card ${deactivated ? "deactivated" : ""}`}>
      <div className="pj-chain-head">
        <Icon name="layers" size={16}/>
        <span className="pj-chain-name">{chain.name}</span>
        <div className="right">
          {deactivated && <StatusPill tone="danger" icon="x">Invalidated · deactivated</StatusPill>}
          {atRisk && <StatusPill tone="warn" icon="danger">Impacted by an exit request</StatusPill>}
          {!deactivated && !atRisk && <StatusPill tone="success" icon="check">Active</StatusPill>}
        </div>
      </div>
      <div className="pj-chain-path">
        {chain.nodes.map((n, i) => {
          const hit = approvedOffers.includes(n.offer) || pendingOffers.includes(n.offer);
          return (
            <React.Fragment key={i}>
              {i > 0 && <span className="pj-arrow" aria-hidden="true"><Icon name="arrowRight" size={15}/></span>}
              <span className={`pj-node ${hit ? "hit" : ""}`}>
                <OrgAv orgId={n.org} size={26} radius={7} className="n-av"/>
                <span className="nv"><span className="n-org">{ORG[n.org].name}</span><span className="n-offer">{n.offer}</span></span>
              </span>
            </React.Fragment>
          );
        })}
      </div>
      {deactivated && (
        <div className="pj-chain-foot"><Icon name="info" size={13}/>Deactivated as of {fmtDate(decidedAt)} — a node's offer was withdrawn by an approved exit.</div>
      )}
    </div>
  );
}

// ─── impacted chains for a SINGLE offer ─────────────────────────────────────
function ImpactList({ offer, status, showUnaffected }) {
  const hit = impactedChains(offer);
  const done = status === "approved";
  const safe = showUnaffected ? ECO.chains.filter(c => !hit.includes(c)) : [];
  if (hit.length === 0 && safe.length === 0) {
    return <div className="impact-row ok"><span className="ic"><Icon name="check" size={15}/></span><span>No service chain uses this offer — nothing will be invalidated.</span></div>;
  }
  return (
    <div className="impact-list">
      {hit.map(c => (
        <div key={c.id} className="impact-row">
          <span className="ic"><Icon name={done ? "x" : "danger"} size={15}/></span>
          <span><span className="nm">{c.name}</span><span className="via"> — via {offer}</span></span>
          <span className="st">{done ? <StatusPill tone="danger" icon="x">Deactivated</StatusPill> : <StatusPill tone="warn" icon="danger">Will be invalidated</StatusPill>}</span>
        </div>
      ))}
      {safe.map(c => (
        <div key={c.id} className="impact-row ok">
          <span className="ic"><Icon name="check" size={15}/></span>
          <span><span className="nm">{c.name}</span><span className="via"> — does not use this offer</span></span>
          <span className="st"><StatusPill tone="success" icon="check">Not affected</StatusPill></span>
        </div>
      ))}
    </div>
  );
}

// ─── request process timeline (from log) ────────────────────────────────────
function ExitTimeline({ req, side }) {
  const log = req.log || [];
  const rows = log.map(e => {
    const m = EXIT_EVENT_META[e.event] || { icon: "info", label: e.event };
    const danger = e.event === "rejected" || e.event === "withdrawn";
    return { icon: m.icon, title: m.label, sub: e.note, when: fmtDate(e.at), state: danger ? "danger" : "done" };
  });
  // projected next steps for current requests
  if (isCurrent(req.status)) {
    if (req.status === "pending") rows.push({ icon: "eye", state: "current", title: "Orchestrator review",
      sub: side === "participant" ? `${ORG[ECO.orchestrator].name} is reviewing your request.` : "Approve (with effective date), request info, or reject." });
    if (req.status === "info_requested") rows.push({ icon: "signature", state: "current", title: "Decision pending", sub: "Awaiting the orchestrator's final decision." });
    rows.push({ icon: "layers", state: "future", title: "Chains invalidated & exit effective" });
  }
  if (req.status === "approved") rows.push({ icon: "clock", state: "current",
    title: `Effective ${fmtDate(req.effectiveDate)}`, sub: `${impactedChains(req.offer).length} chain(s) deactivated · offer withdrawn from contract.` });
  return (
    <div className="exit-timeline">
      {rows.map((st, i) => (
        <div key={i} className={`et-step ${st.state === "done" ? "done" : st.state === "current" ? "current" : st.state === "danger" ? "done danger" : "pending-future"}`}>
          <span className="et-dot"><Icon name={st.icon} size={14}/></span>
          <div className="et-body">
            <div className="et-title">{st.title}</div>
            {st.sub && <div className="et-sub">{st.sub}</div>}
            {st.when && <div className="et-when">{st.when}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── current/finished filter ────────────────────────────────────────────────
function ReqFilter({ value, onChange, counts }) {
  return (
    <div className="req-filter" role="tablist" aria-label="Request status">
      <button type="button" role="tab" aria-selected={value === "current"} className={`rf ${value === "current" ? "active" : ""}`} onClick={() => onChange("current")}>
        <Icon name="hourglass" size={13}/>Current<span className="n">{counts.current}</span>
      </button>
      <button type="button" role="tab" aria-selected={value === "finished"} className={`rf ${value === "finished" ? "active" : ""}`} onClick={() => onChange("finished")}>
        <Icon name="archive" size={13}/>Finished<span className="n">{counts.finished}</span>
      </button>
    </div>
  );
}

// ─── finished-requests table (with expandable history) ──────────────────────
function RequestTable({ rows, showOrg }) {
  const [openId, setOpenId] = useState(null);
  if (rows.length === 0) return <div className="pj-empty">No finished requests yet.</div>;
  return (
    <div className="req-table" role="table">
      <div className={`rt-head ${showOrg ? "with-org" : ""}`} role="row">
        {showOrg && <span>Participant</span>}
        <span>Offer</span>
        <span>Reason</span>
        <span>Submitted</span>
        <span>Decided</span>
        <span>Outcome</span>
        <span aria-hidden="true"></span>
      </div>
      {rows.map(r => {
        const open = openId === r.id;
        return (
          <div key={r.id} className={`rt-group ${open ? "open" : ""}`}>
            <button type="button" className={`rt-row ${showOrg ? "with-org" : ""}`} role="row" onClick={() => setOpenId(open ? null : r.id)} aria-expanded={open}>
              {showOrg && <span className="rt-org"><OrgAv orgId={r.org} size={24} radius={6}/>{ORG[r.org].name}</span>}
              <span className="rt-offer"><span className={`pj-offer-type ${r.offerType}`}>{r.offerType}</span><span className="mono" title={r.offer}>{r.offer}</span></span>
              <span className="rt-muted">{r.reasonCategory || "—"}</span>
              <span className="rt-muted">{fmtDate(r.submittedAt)}</span>
              <span className="rt-muted">{fmtDate(r.decidedAt)}</span>
              <span><ExitPill status={r.status}/></span>
              <span className="rt-chev"><Icon name="chevronDown" size={15}/></span>
            </button>
            {open && (
              <div className="rt-detail">
                <div className="rt-detail-grid">
                  <div>
                    <div className="rt-dk">Request {r.id}</div>
                    <div className="exit-kv" style={{ marginTop: 4 }}>
                      <div className="kv" style={{ borderTop: "none" }}><span className="k">Offer</span><span className="v mono">{r.offer}</span></div>
                      {r.reason && <div className="kv"><span className="k">Details</span><span className="v">{r.reason}</span></div>}
                      {r.status === "approved" && <div className="kv"><span className="k">Effective date</span><span className="v">{fmtDate(r.effectiveDate)}</span></div>}
                      <div className="kv"><span className="k">Impacted chains</span><span className="v">{impactedChains(r.offer).length}</span></div>
                    </div>
                  </div>
                  <div>
                    <div className="rt-dk">Process history</div>
                    <ExitTimeline req={r} side={showOrg ? "orchestrator" : "participant"}/>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── flow documentation ─────────────────────────────────────────────────────
function FlowDoc({ defaultOpen }) {
  const steps = [
    { t: "Participant initiates an exit request — per offer", d: "From their membership, the participant picks a single offer to withdraw, gives an optional reason, reviews the service chains that offer feeds, and confirms. Other offers stay in the project.",
      notifs: ["In-app + email → orchestrator"] },
    { t: "Orchestrator reviews the request", d: "The orchestrator sees the offer concerned and every service chain that would be invalidated. They approve with an effective date (notice period), ask for more information, or reject.",
      notifs: ["In-app + email → participant on each action"] },
    { t: "Approval schedules the offer's exit", d: "On approval an effective date is set. Until then the offer keeps operating under the existing contract terms.",
      notifs: ["In-app + email → participant (decision + effective date)"] },
    { t: "Related chains are invalidated & deactivated", d: "On the effective date, every chain using that offer is invalidated and deactivated. Exchanges through them stop. Chains that don't use the offer keep running.",
      notifs: ["In-app → orchestrator (chains deactivated)", "In-app → participants of affected chains"] },
    { t: "Offer exit is finalised", d: "The offer is withdrawn from the contract and an addendum is recorded on the contract history. The participant stays in the project with its remaining offers.",
      notifs: ["In-app + email → both parties (exit record)"] },
  ];
  return (
    <details className="flowdoc" open={defaultOpen}>
      <summary><Icon name="doc" size={16}/>How the exit procedure works — notification &amp; information flow<Icon name="chevronDown" size={15} className="chev"/></summary>
      <div className="flowdoc-body">
        <div className="flowdoc-steps">
          {steps.map((s, i) => (
            <div key={i} className="fd-step">
              <span className="fd-num">{i + 1}</span>
              <div className="fd-tx">
                <div className="fd-t">{s.t}</div>
                <div className="fd-d">{s.d}</div>
                <div>{s.notifs.map(n => <span key={n} className="fd-notif"><Icon name="bell" size={11}/>{n}</span>)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

// ─── notification bell ──────────────────────────────────────────────────────
function notifsFor(side, reqs) {
  const orch = ORG[ECO.orchestrator].name;
  const list = [];
  reqs.forEach(r => {
    const part = ORG[r.org].name;
    const last = (r.log || [])[r.log.length - 1] || {};
    if (side === "orchestrator") {
      if (r.status === "pending") list.push({ at: last.at, tone: "warn", icon: "inbox", tx: <><b>{part}</b> requested to exit offer <b>{r.offer}</b>. {impactedChains(r.offer).length} chain(s) impacted — review required.</> });
      else if (r.status === "info_requested") list.push({ at: last.at, tone: r.reply ? "info" : "primary", icon: "chat", tx: r.reply ? <><b>{part}</b> replied to your information request on <b>{r.offer}</b>.</> : <>You asked <b>{part}</b> for more info on <b>{r.offer}</b>.</> });
      else if (r.status === "approved") list.push({ at: r.decidedAt, tone: "ok", icon: "check", tx: <>You approved <b>{part}</b>'s exit of <b>{r.offer}</b> — effective {fmtDate(r.effectiveDate)}. {impactedChains(r.offer).length} chain(s) invalidated.</> });
      else if (r.status === "rejected") list.push({ at: r.decidedAt, tone: "danger", icon: "x", tx: <>You rejected <b>{part}</b>'s exit of <b>{r.offer}</b>.</> });
    } else {
      if (r.org !== D.ME_PARTICIPANT) return;
      if (r.status === "pending") list.push({ at: last.at, tone: "info", icon: "upload", tx: <>Your exit request for <b>{r.offer}</b> was sent to <b>{orch}</b>.</> });
      else if (r.status === "info_requested" && !r.reply) list.push({ at: last.at, tone: "warn", icon: "chat", tx: <><b>{orch}</b> needs more info on your exit of <b>{r.offer}</b>. Reply to continue.</> });
      else if (r.status === "approved") list.push({ at: r.decidedAt, tone: "ok", icon: "check", tx: <>Your exit of <b>{r.offer}</b> was approved — effective {fmtDate(r.effectiveDate)}.</> });
      else if (r.status === "rejected") list.push({ at: r.decidedAt, tone: "danger", icon: "x", tx: <>Your exit of <b>{r.offer}</b> was rejected by <b>{orch}</b>.</> });
    }
  });
  return list.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
}

function NotifBell({ side, reqs }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const items = notifsFor(side, reqs);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="pj-bell-wrap" ref={ref}>
      <button type="button" className="icon-btn ghost notif" aria-label={`Notifications, ${items.length} unread`} onClick={() => setOpen(o => !o)}>
        <Icon name="bell" size={18}/>
        {items.length > 0 && <span className="notif-dot" aria-hidden="true">{items.length}</span>}
      </button>
      {open && (
        <div className="pj-notifpop">
          <div className="np-head"><Icon name="bell" size={15}/>Notifications</div>
          <div className="np-list">
            {items.length === 0 && <div className="np-empty">No notifications — you're all caught up.</div>}
            {items.map((n, i) => (
              <div key={i} className="np-item">
                <span className={`ni ${n.tone}`}><Icon name={n.icon} size={15}/></span>
                <div><div className="nt">{n.tx}</div><div className="nw">{fmtDate(n.at)}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── demo scenario guide ────────────────────────────────────────────────────
const DG_STEPS = ["Initiate", "Review", "Decision", "Chains", "Done"];
const LIVE_OFFER = "billing_offer_test";
const findLive = (reqs) => reqs.find(r => r.org === D.ME_PARTICIPANT && r.offer === LIVE_OFFER);

function dgScenario(side, live, act) {
  const s = live ? live.status : "none";
  const part = ORG[D.ME_PARTICIPANT].name, orch = ORG[ECO.orchestrator].name;
  if (side === "list") {
    if (s === "none") return { i: 0, title: "Start the exit procedure demo", sub: `Open the joined project as ${part} and request to exit one offer.`, cta: { label: "Participant view", href: "Project Participant.html" } };
    if (isCurrent(s)) return { i: s === "pending" ? 1 : 2, title: "A request is in review", sub: `Continue on the orchestrator side to process the ${LIVE_OFFER} request.`, cta: { label: "Orchestrator view", href: "Project Orchestrator.html" } };
    return { i: 4, title: s === "approved" ? "Offer exit approved" : "Request closed", sub: "See the outcome, chains and history on either side.", cta: { label: "Participant view", href: "Project Participant.html" } };
  }
  if (side === "participant") {
    if (s === "none") return { i: 0, title: "1 · Request an offer exit", sub: `Pick ${LIVE_OFFER}, give an optional reason and review its chains.`, cta: { label: "Request offer exit", onClick: act.openWizard } };
    if (s === "pending") return { i: 1, title: "2 · Request sent", sub: `Switch to the orchestrator side (${orch}) to review and decide.`, cta: { label: "Orchestrator view", href: "Project Orchestrator.html" } };
    if (s === "info_requested") return live.reply
      ? { i: 2, title: "3 · Reply sent", sub: "Back to the orchestrator to approve or reject.", cta: { label: "Orchestrator view", href: "Project Orchestrator.html" } }
      : { i: 2, title: "3 · The orchestrator needs info", sub: "Answer their question from your membership tab.", cta: { label: "Reply now", onClick: () => act.goTab("membership") } };
    if (s === "approved") return { i: 3, title: "4 · Offer exit approved", sub: "Its chains are invalidated. Check Service chains and the 🔔 bell.", cta: { label: "See service chains", onClick: () => act.goTab("chains") } };
    return { i: 3, title: "4 · Request closed", sub: "The offer stays in the project. Restart to replay.", cta: { label: "Restart demo", onClick: act.reset } };
  }
  if (s === "none") return { i: 0, title: "1 · Waiting for a request", sub: `Start on the participant side: ${part} requests an offer exit.`, cta: { label: "Participant view", href: "Project Participant.html" } };
  if (s === "pending") return { i: 1, title: "2 · Review the exit request", sub: "Approve with an effective date, ask for more info, or reject.", cta: { label: "Open exit requests", onClick: () => act.goTab("exit") } };
  if (s === "info_requested") return live.reply
    ? { i: 2, title: "3 · Reply received", sub: `${part} answered — you can now decide.`, cta: { label: "Decide now", onClick: () => act.goTab("exit") } }
    : { i: 2, title: "3 · Waiting for the participant", sub: `Switch to ${part}'s side to reply.`, cta: { label: "Participant view", href: "Project Participant.html" } };
  if (s === "approved") return { i: 3, title: "4 · Chains invalidated", sub: "The offer's chains are deactivated — see Service chains and 🔔.", cta: { label: "See service chains", onClick: () => act.goTab("chains") } };
  return { i: 3, title: "4 · Request closed", sub: `${part} was notified. Restart to replay.`, cta: { label: "Participant view", href: "Project Participant.html" } };
}

function DemoGuide({ side, reqs, reset, openWizard, goTab }) {
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem("vt.demoGuide.hidden") === "1"; } catch (e) { return false; } });
  const setHide = (v) => { setHidden(v); try { localStorage.setItem("vt.demoGuide.hidden", v ? "1" : "0"); } catch (e) {} };
  if (hidden) return <button type="button" className="demo-guide-fab" onClick={() => setHide(false)}><Icon name="sparkle" size={13}/>Demo</button>;
  const live = findLive(reqs);
  const sc = dgScenario(side, live, { openWizard, goTab, reset });
  const canRestart = reset && (live || side === "orchestrator");
  return (
    <aside className="demo-guide" aria-label="Exit procedure demo guide">
      <div className="dg-head">
        <span className="dg-kicker">Exit flow demo</span>
        <span className="dg-stepn">Step {Math.min(sc.i + 1, 5)} / 5 · {DG_STEPS[Math.min(sc.i, 4)]}</span>
        <button type="button" className="dg-x" onClick={() => setHide(true)} aria-label="Hide demo guide"><Icon name="x" size={13}/></button>
      </div>
      <div className="dg-dots" aria-hidden="true">{DG_STEPS.map((d, i) => <span key={d} className={`dg-dot ${i <= sc.i ? "on" : ""}`}/>)}</div>
      <div className="dg-title">{sc.title}</div>
      <div className="dg-sub">{sc.sub}</div>
      <div className="dg-actions">
        {sc.cta.href
          ? <a className="dg-cta" href={sc.cta.href}>{sc.cta.label}<Icon name="arrowRight" size={13}/></a>
          : <button type="button" className="dg-cta" onClick={sc.cta.onClick}>{sc.cta.label}<Icon name="arrowRight" size={13}/></button>}
        {canRestart && <button type="button" className="dg-reset" onClick={reset}><Icon name="refresh" size={12}/>Restart</button>}
      </div>
    </aside>
  );
}

window.PJ = { OrgAv, StatusPill, ExitPill, OfferTag, useToast, Modal, Steps, CopyBtn, OfferAcc, ContractParticipants, ProjectHero, PersonaChip, TabBar, ChainCard, ImpactList, ExitTimeline, ReqFilter, RequestTable, FlowDoc, NotifBell, DemoGuide };
})();
