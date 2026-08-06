/* VisionsTrust — Layout v2 : surfaces d'agents.
 * 5 points d'entrée au lieu d'un seul panneau : palette ⌘K (router), dock multi-onglets,
 * assist inline (Completion), recherche NL (Search), drawer de résultats (Matching).
 * Charger après layout2.jsx. */
(function () {
const { useState, useEffect, useRef } = React;
const { Icon, AgentChip, AGENTS, useAgents } = window.V2;

// ─── 1. PALETTE ⌘K : routeur du master agent ───────────────────────────────
const ROUTES = [
  { agent:"help",       kw:["quoi","qu'est","c'est quoi","comment","définition","dataspace","data space","rgpd","expliquer","aide"] },
  { agent:"matching",   kw:["match","matching","comparer","similaire","équivalent","partenaire","qui pourrait","trouver des projets"] },
  { agent:"legal",      kw:["contrat","clause","dpa","licence","légal","legal","juridique","responsabilité","conformité"] },
  { agent:"completion", kw:["rédige","compléter","décrire","description","remplir","générer","brouillon","titre"] },
  { agent:"search",     kw:["catalogue","offre de","données de","jeu de données","chercher","trouver une offre","api"] },
];
const routeOf = (q) => {
  const s = q.toLowerCase();
  const hit = ROUTES.find(r => r.kw.some(k => s.includes(k)));
  return hit ? hit.agent : (q.trim() ? "help" : null);
};
const NAV_RESULTS = [
  { icon:"grid", t:"Catalogue", s:"Parcourir les offres du dataspace" },
  { icon:"doc", t:"My Offers · Data", s:"12 offres · 3 brouillons" },
  { icon:"folder", t:"My Projects · Initiated", s:"5 projets" },
  { icon:"contracts", t:"My Contracts · To sign", s:"2 contrats en attente" },
];
const RECORDS = [
  { icon:"folder", t:"Mobility insights 2026", s:"Projet · publié · 21 matchs" },
  { icon:"doc", t:"Fleet telemetry — raw", s:"Offre · données · v3" },
  { icon:"contracts", t:"DPA · Kuzzle ↔ Visions", s:"Contrat · 2 clauses signalées" },
];
const DO_ACTIONS = [
  { icon:"plus", t:"Créer une offre", s:"Completion pré-remplit la fiche", agent:"completion" },
  { icon:"target", t:"Lancer un matching", s:"Sur le projet Mobility insights 2026", agent:"matching" },
  { icon:"shield", t:"Faire relire un contrat", s:"Legal vérifie clauses et licences", agent:"legal" },
];

const RECENTS = [
  { icon:"folder", t:"Mobility insights 2026", s:"Vu il y a 5 min" },
  { icon:"grid", t:"Catalogue · vue « Trafic IDF »", s:"Vue enregistrée" },
  { icon:"contracts", t:"DPA · Kuzzle ↔ Visions", s:"Vu hier" },
];
const parseQ = (raw) => {
  if (raw.startsWith(">")) return { mode:"do", agent:null, q:raw.slice(1).trim() };
  if (raw.startsWith("@")) {
    const m = raw.slice(1).match(/^(\w+)\s*(.*)$/);
    if (m && AGENTS[m[1].toLowerCase()]) return { mode:"all", agent:m[1].toLowerCase(), q:m[2] };
    return { mode:"agents", agent:null, q:raw.slice(1) };
  }
  return { mode:"all", agent:null, q:raw };
};

const Palette = ({ onClose, openAgent, scope }) => {
  const [raw, setRaw] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);
  const { mode, agent: forced, q } = parseQ(raw);
  const agent = forced || routeOf(q);
  const filt = (arr) => q ? arr.filter(r => (r.t + r.s).toLowerCase().includes(q.toLowerCase())) : arr;
  const navs = mode === "do" || mode === "agents" ? [] : filt(NAV_RESULTS);
  const recs = mode === "do" || mode === "agents" ? [] : filt(RECORDS);
  const dos = mode === "agents" ? [] : filt(DO_ACTIONS);
  const agentList = Object.values(AGENTS).filter(a => a.id !== "master" && a.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="v2-pal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="v2-pal" role="dialog" aria-label="Command palette">
        <div className="v2-pal-in">
          <Icon name={raw ? "sparkle" : "search"} size={19}/>
          {forced && <AgentChip id={forced}/>}
          <input ref={inputRef} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Chercher, naviguer, agir — ou poser une question ( @ cibler un agent · &gt; actions )" aria-label="Recherche et assistant"/>
          {scope && <span className="v2-agent pick">{scope.label}</span>}
          <button type="button" className="v2-iconbtn" onClick={onClose} aria-label="Fermer"><Icon name="close" size={16}/></button>
        </div>
        <div className="v2-pal-body">
          {!raw && (
            <>
              <div className="v2-pal-sec">Récents</div>
              {RECENTS.map(r => (
                <button key={r.t} type="button" className="v2-pal-row" onClick={onClose}>
                  <span className="v2-pal-ico"><Icon name={r.icon} size={16}/></span>
                  <span className="v2-pal-t">{r.t}<small>{r.s}</small></span>
                </button>
              ))}
            </>
          )}
          {mode === "agents" && (
            <>
              <div className="v2-pal-sec">Cibler une compétence</div>
              {agentList.map(a => (
                <button key={a.id} type="button" className="v2-pal-row" onClick={() => setRaw(`@${a.id} `)}>
                  <span className="v2-pal-ico"><Icon name={a.icon} size={16}/></span>
                  <span className="v2-pal-t">{a.label}<small>{a.desc}</small></span>
                  <span className="v2-kbd">@{a.id}</span>
                </button>
              ))}
            </>
          )}
          {q && mode !== "agents" && (
            <>
              <div className="v2-pal-sec">Demander à l'assistant</div>
              <button type="button" className="v2-pal-row sel" onClick={() => openAgent(agent, { prompt: q, scope })}>
                <span className="v2-pal-ico" style={{ background:"var(--v2-navy)", color:"var(--v2-accent)" }}><Icon name="sparkle" size={16}/></span>
                <span className="v2-pal-t">« {q} »<small>Routé vers l'agent {AGENTS[agent].label} — {AGENTS[agent].desc}</small></span>
                <AgentChip id={agent}/>
              </button>
            </>
          )}
          {dos.length > 0 && <div className="v2-pal-sec">Actions</div>}
          {dos.map(r => (
            <button key={r.t} type="button" className="v2-pal-row" onClick={() => openAgent(r.agent, { scope })}>
              <span className="v2-pal-ico"><Icon name={r.icon} size={16}/></span>
              <span className="v2-pal-t">{r.t}<small>{r.s}</small></span>
              <AgentChip id={r.agent}/>
            </button>
          ))}
          {navs.length > 0 && <div className="v2-pal-sec">Naviguer</div>}
          {navs.map(r => (
            <button key={r.t} type="button" className="v2-pal-row" onClick={onClose}>
              <span className="v2-pal-ico"><Icon name={r.icon} size={16}/></span>
              <span className="v2-pal-t">{r.t}<small>{r.s}</small></span>
            </button>
          ))}
          {recs.length > 0 && <div className="v2-pal-sec">Vos éléments</div>}
          {recs.map(r => (
            <button key={r.t} type="button" className="v2-pal-row" onClick={onClose}>
              <span className="v2-pal-ico"><Icon name={r.icon} size={16}/></span>
              <span className="v2-pal-t">{r.t}<small>{r.s}</small></span>
            </button>
          ))}
        </div>
        <div className="v2-pal-foot"><span><b>@</b> cibler un agent</span><span><b>&gt;</b> actions</span><span><b>⏎</b> ouvrir</span><span><b>?</b> raccourcis</span><span style={{ marginLeft:"auto" }}>Un seul assistant, 5 compétences</span></div>
      </div>
    </div>
  );
};

// ─── 2. DOCK : plusieurs "apps" contextuelles, dont le fil de l'assistant ──
const START_THREAD = [
  { role:"agent", agent:"master", text:"Je suis l'assistant VisionsTrust. Je choisis la bonne compétence selon votre demande — Help, Completion, Matching, Legal ou Search — et je garde le contexte de la page où vous êtes." },
];
const PAGE_SUGGESTIONS = {
  home:      [{ a:"help", t:"Que puis-je faire ici ?" }, { a:"matching", t:"Qui pourrait utiliser mes offres ?" }, { a:"help", t:"C'est quoi un dataspace ?" }],
  catalogue: [{ a:"search", t:"Données de trafic temps réel en Île-de-France" }, { a:"matching", t:"Comparer avec mon offre Fleet telemetry" }],
  create:    [{ a:"completion", t:"Rédiger la description depuis mon schéma" }, { a:"completion", t:"Proposer des mots-clés" }, { a:"legal", t:"Quelle licence choisir ?" }],
  contract:  [{ a:"legal", t:"Résumer mes obligations" }, { a:"legal", t:"Les clauses signalées sont-elles bloquantes ?" }],
  project:   [{ a:"matching", t:"Trouver des offres compatibles" }, { a:"help", t:"Comment inviter un participant ?" }],
};
const REPLIES = {
  help:{ text:"Un dataspace est un espace d'échange où chaque participant garde la maîtrise de ses données : vous publiez des offres, contractualisez, puis les échanges se déclenchent via vos triggers. Sur VisionsTrust, tout part de deux objets : une **offre** (ce que vous fournissez) et un **projet** (ce dont vous avez besoin).", chips:["Voir le guide des offres","Différence offre / projet"] },
  completion:{ text:"J'ai rédigé une description à partir de votre schéma et de vos offres similaires. Je peux aussi proposer les mots-clés, la fréquence de mise à jour et un titre plus explicite.", chips:["Insérer dans le champ","Proposer 3 variantes"] },
  matching:{ text:"6 offres correspondent fortement à ce projet, sur 32 analysées. Le tri combine compatibilité du schéma, couverture géographique et conditions de licence.", chips:["Ouvrir les résultats","Affiner les critères"] },
  legal:{ text:"Deux clauses méritent votre attention : la durée de conservation (art. 6.2) dépasse votre politique interne, et la sous-traitance (art. 9) n'exige pas d'accord écrit préalable. Je peux proposer une reformulation alignée sur votre modèle.", chips:["Proposer une reformulation","Comparer à mon modèle"] },
  search:{ text:"J'ai transformé votre phrase en filtres : type = données, thème = mobilité, zone = Île-de-France, fraîcheur < 1 h. 14 offres correspondent.", chips:["Appliquer les filtres","Élargir à la région"] },
};

const Thread = ({ seed, scope, page, onOpenMatches }) => {
  const [msgs, setMsgs] = useState(START_THREAD);
  const [draft, setDraft] = useState("");
  const [pick, setPick] = useState("auto");
  const bodyRef = useRef(null);
  const send = (text, forced) => {
    if (!text || !text.trim()) return;
    const agent = forced && forced !== "auto" ? forced : (pick !== "auto" ? pick : routeOf(text));
    const r = REPLIES[agent] || REPLIES.help;
    setMsgs(m => [...m, { role:"me", text }, { role:"handoff", agent }, { role:"agent", agent, text:r.text, chips:r.chips }]);
    setDraft("");
  };
  useEffect(() => { if (seed && seed.at) { if (seed.prompt) send(seed.prompt, seed.agent); else { const a = seed.agent === "assistant" ? "help" : seed.agent; const r = REPLIES[a]; if (r) setMsgs(m => [...m, { role:"handoff", agent:a }, { role:"agent", agent:a, text:r.text, chips:r.chips }]); } } }, [seed && seed.at]);
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [msgs]);
  const sugg = PAGE_SUGGESTIONS[page] || PAGE_SUGGESTIONS.home;
  return (
    <>
      <div className="v2-dock-body" ref={bodyRef}>
        {scope && (
          <div className="v2-scope">
            <Icon name="target" size={14}/><span>Contexte : <b>{scope.label}</b></span>
            <span className="v2-x"><Icon name="close" size={13}/></span>
          </div>
        )}
        <div className="v2-thread">
          {msgs.map((m, i) => m.role === "handoff" ? (
            <div className="v2-handoff" key={i}>Master → agent {AGENTS[m.agent].label}</div>
          ) : (
            <div className={`v2-msg ${m.role === "me" ? "me" : ""}`} key={i}>
              {m.role === "agent" && <AgentChip id={m.agent || "master"}/>}
              <div className="v2-bubble" dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") }}/>
              {m.chips && (
                <div className="v2-sugg">
                  {m.chips.map(c => (
                    <button key={c} type="button" className="v2-chip" onClick={() => { if (c === "Ouvrir les résultats" && onOpenMatches) onOpenMatches(); }}>{c}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {msgs.length <= 1 && (
            <div className="v2-sugg">
              {sugg.map(s => <button key={s.t} type="button" className="v2-chip" onClick={() => send(s.t, s.a)}><Icon name={AGENTS[s.a].icon} size={13}/>{s.t}</button>)}
            </div>
          )}
        </div>
      </div>
      <div className="v2-dock-foot">
        <div className="v2-composer">
          <textarea rows="1" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }} placeholder="Demandez quelque chose — ou choisissez une compétence"/>
          <div className="v2-composer-row">
            <button type="button" className={`v2-agent pick btn ${pick === "auto" ? "on" : ""}`} onClick={() => setPick("auto")}><Icon name="sparkle" size={13}/>Auto</button>
            {["help","completion","matching","legal"].map(a => (
              <button key={a} type="button" className={`v2-agent ${pick === a ? a : "pick"} btn`} onClick={() => setPick(a)} title={AGENTS[a].desc}><Icon name={AGENTS[a].icon} size={13}/>{AGENTS[a].short}</button>
            ))}
            <span className="v2-spacer"/>
            <button type="button" className="v2-send" onClick={() => send(draft)} aria-label="Envoyer"><Icon name="send" size={16}/></button>
          </div>
        </div>
      </div>
    </>
  );
};

const LegalPanel = ({ scope }) => (
  <>
    <div className="v2-dock-body">
      <div className="v2-scope"><Icon name="contracts" size={14}/><span>Document : <b>{scope ? scope.label : "DPA · Kuzzle ↔ Visions"}</b></span></div>
      <p style={{ margin:"0 0 14px", font:"500 12.5px/1.55 var(--v2-font)", color:"var(--v2-muted)", textWrap:"pretty" }}>Legal a relu 24 clauses. 2 à revoir, 3 informatives. Cliquez une clause pour l'ancrer dans le document.</p>
      {[
        { n:"Art. 6.2 — Durée de conservation", s:"warn", t:"36 mois dépasse votre politique interne (24 mois). Reformulation possible en un clic." },
        { n:"Art. 9 — Sous-traitance", s:"warn", t:"Pas d'accord écrit préalable exigé. Votre modèle l'impose." },
        { n:"Art. 4 — Finalités", s:"ok", t:"Aligné sur la finalité déclarée de l'offre." },
      ].map(c => (
        <div key={c.n} className={`v2-clause ${c.s === "warn" ? "flag" : ""}`}>
          <h4>{c.n}</h4>
          <p>{c.t}</p>
          <div className="v2-acceptbar"><button type="button" className="v2-mini"><Icon name="wand" size={13}/>Reformuler</button><button type="button" className="v2-mini">Expliquer</button></div>
        </div>
      ))}
    </div>
    <div className="v2-dock-foot">
      <div className="v2-composer">
        <textarea rows="1" placeholder="Question sur ce contrat…"/>
        <div className="v2-composer-row"><AgentChip id="legal"/><span className="v2-spacer"/><button type="button" className="v2-send" aria-label="Envoyer"><Icon name="send" size={16}/></button></div>
      </div>
    </div>
  </>
);

const RunsPanel = ({ runs, onOpenMatches }) => (
  <div className="v2-dock-body">
    <p style={{ margin:"0 0 12px", font:"500 12.5px/1.55 var(--v2-font)", color:"var(--v2-muted)", textWrap:"pretty" }}>Les agents travaillent en tâche de fond : vous quittez la page, le résultat vous attend ici (et en notification).</p>
    {runs.map(r => (
      <div className="v2-run" key={r.id}>
        <span className={`v2-runico v2-agent ${r.agent}`} style={{ borderRadius:8 }}><Icon name={AGENTS[r.agent].icon} size={14}/></span>
        <div style={{ flex:1, minWidth:0 }}>
          <h4>{r.title}</h4><p>{r.note}</p>
          <div className="v2-acceptbar">
            {r.state === "running"
              ? <span className="v2-pill"><span className="v2-spin"/>En cours</span>
              : <button type="button" className="v2-mini go" onClick={() => r.agent === "matching" && onOpenMatches && onOpenMatches()}>Voir le résultat</button>}
            <span className="v2-spacer"/>
            <button type="button" className="v2-iconbtn" aria-label="Options"><Icon name="dots" size={15}/></button>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const HistoryPanel = () => (
  <div className="v2-dock-body">
    {[
      { t:"Offre publiée", w:"Alex Dupont", d:"Aujourd'hui 09:14" },
      { t:"Description générée par Completion", w:"Agent Completion", d:"Hier 17:40", agent:"completion" },
      { t:"Champ « fréquence » modifié", w:"Alex Dupont", d:"Hier 17:32" },
      { t:"Matching lancé sur 32 offres", w:"Agent Matching", d:"12/07 11:02", agent:"matching" },
    ].map(e => (
      <div className="v2-run" key={e.t}>
        <span className="v2-runico" style={{ background:"#f1f4f9" }}><Icon name="clock" size={14}/></span>
        <div style={{ flex:1, minWidth:0 }}>
          <h4>{e.t}</h4><p>{e.w} · {e.d}</p>
          {e.agent && <div style={{ marginTop:7 }}><AgentChip id={e.agent}/></div>}
        </div>
      </div>
    ))}
  </div>
);

const DOCK_META = {
  assistant:{ title:"Assistant", sub:"Un fil, cinq compétences", icon:"sparkle" },
  legal:{ title:"Legal companion", sub:"Ancré sur le document ouvert", icon:"scale" },
  runs:{ title:"Tâches des agents", sub:"Travaux en cours et résultats", icon:"activity" },
  history:{ title:"Activité", sub:"Historique de cet élément", icon:"history" },
};
const Dock = ({ tab, setTab, seed, scope, runs, suggested, onClose, page, onOpenMatches }) => {
  const meta = DOCK_META[tab] || DOCK_META.assistant;
  return (
    <div className="v2-dock">
      <div className="v2-dock-head">
        <span className="v2-runico v2-agent master" style={{ borderRadius:9, width:28, height:28 }}><Icon name={meta.icon} size={15}/></span>
        <span style={{ flex:1, minWidth:0 }}><h2>{meta.title}</h2><p>{meta.sub}</p></span>
        {tab === "assistant" && <button type="button" className="v2-iconbtn" aria-label="Nouveau fil"><Icon name="plus" size={16}/></button>}
        <button type="button" className="v2-iconbtn" onClick={onClose} aria-label="Fermer le dock"><Icon name="close" size={16}/></button>
      </div>
      {tab === "assistant" && <Thread seed={seed} scope={scope} page={page} onOpenMatches={onOpenMatches}/>}
      {tab === "legal" && <LegalPanel scope={scope}/>}
      {tab === "runs" && <RunsPanel runs={runs} onOpenMatches={onOpenMatches}/>}
      {tab === "history" && <HistoryPanel/>}
    </div>
  );
};

// ─── 3. ASSIST INLINE (agent Completion, sur les pages de création) ────────
const AssistField = ({ label, hint, value, suggestion, multiline, scope }) => {
  const { openAgent } = useAgents();
  const [state, setState] = useState("idle"); // idle | loading | proposed | accepted
  const [text, setText] = useState(value || "");
  const run = () => { setState("loading"); setTimeout(() => setState("proposed"), 700); };
  return (
    <div className={`v2-field ${state === "proposed" ? "assist" : ""}`}>
      <div className="v2-flabel">
        <label>{label}</label>
        <span className="v2-spacer"/>
        {state === "idle" && <button type="button" className="v2-agent completion btn" onClick={run}><Icon name="wand" size={13}/>Compléter</button>}
        {state === "loading" && <span className="v2-pill"><span className="v2-spin"/>Completion…</span>}
        {state === "accepted" && <span className="v2-pill ok"><Icon name="check" size={12}/>Complété par l'agent</span>}
      </div>
      {multiline
        ? <textarea className="v2-input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={hint}/>
        : <input className="v2-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={hint}/>}
      {state === "proposed" && (
        <>
          <div className="v2-ghosttext" style={{ marginTop:9 }}>{suggestion}</div>
          <div className="v2-acceptbar">
            <button type="button" className="v2-mini go" onClick={() => { setText(suggestion); setState("accepted"); }}><Icon name="check" size={13}/>Insérer</button>
            <button type="button" className="v2-mini" onClick={run}><Icon name="refresh" size={13}/>Autre proposition</button>
            <button type="button" className="v2-mini" onClick={() => openAgent("completion", { scope, prompt:`Affiner le champ « ${label} »` })}>Ouvrir dans l'assistant</button>
            <span className="v2-spacer"/>
            <button type="button" className="v2-iconbtn" onClick={() => setState("idle")} aria-label="Ignorer"><Icon name="close" size={15}/></button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── 4. RECHERCHE NL (agent Search, dans le catalogue) ─────────────────────
const NLSearch = ({ onMatch }) => {
  const [q, setQ] = useState("données de trafic temps réel en Île-de-France, fraîcheur < 1h");
  const [parsed, setParsed] = useState(true);
  return (
    <div className="v2-nlsearch">
      <div className="v2-nlrow">
        <span style={{ color:"var(--v2-muted)" }}><Icon name="search" size={19}/></span>
        <input value={q} onChange={(e) => { setQ(e.target.value); setParsed(false); }} onKeyDown={(e) => e.key === "Enter" && setParsed(true)} placeholder="Décrivez ce que vous cherchez, en une phrase"/>
        <AgentChip id="search"/>
        <button type="button" className="v2-cta" onClick={() => setParsed(true)}>Chercher</button>
      </div>
      {parsed ? (
        <div className="v2-facets">
          <span className="v2-hint">Filtres déduits :</span>
          {[["type","données"],["thème","mobilité"],["zone","Île-de-France"],["fraîcheur","< 1 h"]].map(([k, v]) => (
            <button key={k} type="button" className="v2-facet">{k} : <b>{v}</b><Icon name="close" size={12}/></button>
          ))}
          <span className="v2-hint">14 résultats</span>
          <span className="v2-spacer" style={{ flex:1 }}/>
          <button type="button" className="v2-chip" onClick={onMatch}><Icon name="target" size={13}/>Comparer à mes offres</button>
        </div>
      ) : <div className="v2-hint">⏎ pour laisser l'agent Search convertir votre phrase en filtres.</div>}
    </div>
  );
};

// ─── 5. DRAWER DE RÉSULTATS (agent Matching) ───────────────────────────────
const MATCHES = [
  { t:"Real-time traffic counts — IDF", o:"Kuzzle", s:94, why:"Même schéma de comptage, granularité 5 min, licence compatible avec votre offre Fleet telemetry." },
  { t:"Air quality feed — Paris", o:"AirLab", s:88, why:"Complémentaire : croisement possible avec vos points GPS, même zone." },
  { t:"Parking occupancy API", o:"Indigo", s:81, why:"Couverture partielle (Paris intra-muros) mais fréquence identique." },
  { t:"Road works planning", o:"DiRIF", s:73, why:"Utile pour contextualiser vos anomalies de trajet ; mise à jour hebdomadaire." },
];
const MatchDrawer = ({ onClose, subject }) => (
  <div className="v2-drawer">
    <div className="v2-drawer-head">
      <AgentChip id="matching"/>
      <h3>6 correspondances fortes pour {subject || "Mobility insights 2026"}</h3>
      <span style={{ font:"500 12px/1 var(--v2-font)", color:"var(--v2-muted)" }}>32 offres analysées · il y a 2 min</span>
      <span style={{ flex:1 }}/>
      <button type="button" className="v2-mini"><Icon name="filter" size={13}/>Critères</button>
      <button type="button" className="v2-iconbtn" onClick={onClose} aria-label="Fermer"><Icon name="close" size={16}/></button>
    </div>
    <div className="v2-drawer-body">
      <div className="v2-mgrid">
        {MATCHES.map(m => (
          <div className="v2-mcard" key={m.t}>
            <div><h4>{m.t}</h4><span className="v2-org">{m.o}</span></div>
            <div className="v2-score"><div className="v2-score-bar"><i style={{ width:`${m.s}%` }}/></div><b>{m.s}%</b></div>
            <p className="v2-why">{m.why}</p>
            <div className="v2-mcard-foot"><button type="button" className="v2-mini go">Ajouter au panier</button><button type="button" className="v2-mini">Voir l'offre</button></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── 6. TRAY : tâches d'agents minimisées (le dock peut rester fermé) ─────
const Tray = ({ runs, onOpen, onDismiss, onOpenMatches }) => {
  const live = runs.filter(r => r.state === "running" || r.fresh !== false).slice(0, 1);
  if (!live.length) return null;
  return (
    <div className="v2-tray">
      {live.map(r => (
        <button key={r.id} type="button" className="v2-traypill" onClick={() => r.state === "done" && r.agent === "matching" && onOpenMatches ? onOpenMatches() : onOpen()}>
          {r.state === "running" ? <span className="v2-spin"/> : <span className={`v2-agent ${r.agent}`} style={{ padding:5, borderRadius:7 }}><Icon name={AGENTS[r.agent].icon} size={13}/></span>}
          <span style={{ flex:1, minWidth:0 }}>{r.title.replace(/^\w+ · /, "")}<small>{r.state === "running" ? "en cours…" : r.note}</small></span>
          <Icon name={r.state === "running" ? "chevronRight" : "arrowRight"} size={14}/>
        </button>
      ))}
      <button type="button" className="v2-traypill" style={{ padding:"5px 9px", font:"600 10.5px/1 var(--v2-font)", color:"var(--v2-muted)", boxShadow:"var(--v2-shadow)" }} onClick={onDismiss}>Masquer les tâches</button>
    </div>
  );
};

// ─── 7. PEEK : aperçu d'un élément sans quitter la liste ──────────────────
const PeekSheet = ({ item, onClose, onPrev, onNext, index, total }) => {
  const { openAgent } = useAgents();
  const scope = { label: item.t };
  return (
    <>
      <button type="button" className="v2-peek-scrim" onClick={onClose} aria-label="Fermer l'aperçu"/>
      <div className="v2-peek" role="dialog" aria-label={item.t}>
        <div className="v2-peek-head">
          <h3>{item.t}</h3>
          <div className="v2-peek-nav">
            <button type="button" className="v2-iconbtn" onClick={onPrev} aria-label="Précédent" style={{ transform:"rotate(180deg)" }}><Icon name="chevronRight" size={16}/></button>
            <span style={{ font:"600 11.5px/28px var(--v2-font)", color:"var(--v2-muted)" }}>{index + 1}/{total}</span>
            <button type="button" className="v2-iconbtn" onClick={onNext} aria-label="Suivant"><Icon name="chevronRight" size={16}/></button>
          </div>
          <button type="button" className="v2-iconbtn" aria-label="Ouvrir en plein écran"><Icon name="expand" size={16}/></button>
          <button type="button" className="v2-iconbtn" onClick={onClose} aria-label="Fermer"><Icon name="close" size={16}/></button>
        </div>
        <div className="v2-peek-body">
          <dl className="v2-dl">
            <dt>Type</dt><dd>{item.type}</dd>
            <dt>Statut</dt><dd><span className={`v2-pill ${item.state === "Publiée" ? "ok" : "warn"}`}>{item.state}</span></dd>
            <dt>Complétude</dt><dd>{item.done}%</dd>
            <dt>Mise à jour</dt><dd>{item.upd}</dd>
            <dt>Contrats liés</dt><dd>{item.contracts}</dd>
          </dl>
          <div className="v2-ph" style={{ height:110, marginBottom:14 }}>aperçu du schéma de données</div>
          <h4 style={{ margin:"0 0 6px", font:"700 12.5px/1 var(--v2-font)" }}>Ce que les agents voient ici</h4>
          <div className="v2-sugg">
            {item.done < 100 && <button type="button" className="v2-chip" onClick={() => openAgent("completion", { scope, prompt:`Compléter les champs manquants de ${item.t}` })}><Icon name="wand" size={13}/>Compléter {100 - item.done}% restants</button>}
            <button type="button" className="v2-chip" onClick={() => openAgent("matching", { scope, prompt:`Qui pourrait utiliser ${item.t} ?` })}><Icon name="target" size={13}/>Trouver des projets</button>
            <button type="button" className="v2-chip" onClick={() => openAgent("legal", { scope, prompt:`Vérifier la licence de ${item.t}` })}><Icon name="scale" size={13}/>Vérifier la licence</button>
          </div>
        </div>
        <div className="v2-peek-foot">
          <button type="button" className="v2-cta">Ouvrir la fiche</button>
          <button type="button" className="v2-cta ghost">Dupliquer</button>
          <span style={{ flex:1 }}/>
          <span className="v2-hint" style={{ alignSelf:"center" }}>J / K pour parcourir</span>
        </div>
      </div>
    </>
  );
};

// ─── 8. ACTIONS EN LOT : les agents s'appliquent à N éléments ─────────────
const BulkBar = ({ count, onClear, onAgent }) => (
  <div className="v2-bulk">
    <b>{count} sélectionné{count > 1 ? "s" : ""}</b>
    <button type="button" onClick={() => onAgent("completion")}><Icon name="wand" size={13}/>Compléter avec Completion</button>
    <button type="button" onClick={() => onAgent("legal")}><Icon name="scale" size={13}/>Faire relire par Legal</button>
    <button type="button" onClick={() => onAgent("matching")}><Icon name="target" size={13}/>Chercher des matchs</button>
    <span className="v2-spacer"/>
    <button type="button"><Icon name="archive" size={13}/>Archiver</button>
    <button type="button" className="x" onClick={onClear}><Icon name="close" size={14}/></button>
  </div>
);

// ─── 9. RACCOURCIS ───────────────────────────────────────────────────────
const SHORTCUTS = [
  ["⌘K", "Palette : chercher, naviguer, demander"], ["@", "Cibler une compétence d'agent"],
  [">", "Actions rapides"], ["?", "Cette fenêtre"],
  ["[", "Replier / déplier la navigation"], ["]", "Ouvrir / fermer le dock"],
  ["J / K", "Élément suivant / précédent dans une liste"], ["X", "Sélectionner la ligne"],
  ["E", "Archiver la sélection"], ["⇧ + clic", "Sélection continue"],
  ["Esc", "Fermer le calque courant"], ["⌘⏎", "Envoyer à l'assistant"],
];
const Shortcuts = ({ onClose }) => (
  <div className="v2-pal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="v2-pal" style={{ maxWidth:640 }} role="dialog" aria-label="Raccourcis clavier">
      <div className="v2-pal-in">
        <Icon name="keyboard" size={19}/>
        <span style={{ flex:1, font:"800 15px/1.3 var(--v2-font)" }}>Raccourcis clavier</span>
        <button type="button" className="v2-iconbtn" onClick={onClose} aria-label="Fermer"><Icon name="close" size={16}/></button>
      </div>
      <div className="v2-pal-body">
        <div className="v2-keys">
          {SHORTCUTS.map(([k, d]) => <div className="v2-keyrow" key={k}><kbd>{k}</kbd><span>{d}</span></div>)}
        </div>
      </div>
      <div className="v2-pal-foot"><span>Les listes, la palette et le dock partagent les mêmes touches sur tous les écrans.</span></div>
    </div>
  </div>
);

window.V2Agents = { Palette, Dock, Thread, LegalPanel, RunsPanel, HistoryPanel, AssistField, NLSearch, MatchDrawer, Tray, PeekSheet, BulkBar, Shortcuts, routeOf };
})();
