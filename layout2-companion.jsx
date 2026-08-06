/* VisionsTrust — Layout v2 : LE COMPAGNON.
 * Une présence persistante, la même sur tous les écrans. Différence avec le dock et la palette :
 * le dock et ⌘K sont réactifs (on les ouvre), le compagnon est permanent et parle en premier.
 * Il porte 3 choses que les autres surfaces ne portent pas :
 *   1. un fil rouge (objectif suivi d'écran en écran),
 *   2. une mémoire de parcours (ce que vous faisiez ailleurs),
 *   3. une lecture de la page en cours, avec un niveau d'attention réglable.
 * Charger après layout2-agents.jsx. */
(function () {
const { useState, useEffect, useRef } = React;
const { Icon, AgentChip, AGENTS, useAgents } = window.V2;

// ─── Fil rouge : l'objectif que le compagnon porte à travers l'app ─────────
const OBJECTIVE = {
  label: "Publier Air quality feed",
  due: "avant vendredi",
  steps: [
    { t:"Décrire l'offre",                 done:true,  page:"create" },
    { t:"Rattacher le jeu de données",     done:true,  page:"create" },
    { t:"Compléter 4 champs manquants",    done:false, page:"create",    agent:"completion" },
    { t:"Choisir la licence de diffusion", done:false, page:"contract",  agent:"legal" },
    { t:"Chercher des preneurs",           done:false, page:"catalogue", agent:"matching" },
  ],
};

// ─── Ce que le compagnon lit sur la page courante ─────────────────────────
const READS = {
  home:      [{ agent:"completion", t:"3 offres en brouillon, dont une depuis 6 jours." },
              { agent:"matching",   t:"6 correspondances non lues sur Mobility insights 2026." }],
  catalogue: [{ agent:"search",     t:"Votre phrase a produit 4 filtres · 14 résultats." },
              { agent:"matching",   t:"3 de ces offres ressemblent à votre Fleet telemetry." }],
  offers:    [{ agent:"completion", t:"3 offres incomplètes — complétude moyenne 62 %." },
              { agent:"legal",      t:"4 offres publiées sans contrat rattaché." }],
  create:    [{ agent:"completion", t:"4 champs manquants : description, mots-clés, fréquence, licence." },
              { agent:"legal",      t:"Aucune licence choisie — bloquant à la publication." }],
  contract:  [{ agent:"legal",      t:"2 clauses signalées, la plus risquée : art. 6.2 (36 mois)." },
              { agent:"help",       t:"Ce DPA reprend 80 % de votre modèle interne." }],
  project:   [{ agent:"matching",   t:"6 correspondances fortes sur 32 offres analysées." },
              { agent:"help",       t:"2 participants invités n'ont pas encore répondu." }],
};

// ─── Remarque proactive : une seule par écran, jamais deux ────────────────
const WHISPERS = {
  home:      { agent:"completion", t:"Air quality feed est en brouillon depuis 6 jours. Je peux terminer la fiche en une passe.", cta:"Compléter la fiche" },
  catalogue: { agent:"matching",   t:"Cette recherche recoupe votre offre Fleet telemetry. Je compare les deux schémas ?", cta:"Comparer" },
  offers:    { agent:"completion", t:"3 offres sont incomplètes. Je peux proposer les champs manquants pour les trois d'un coup.", cta:"Traiter les 3" },
  create:    { agent:"completion", t:"Il vous reste 4 champs. J'ai déjà une proposition pour la description.", cta:"Voir la proposition" },
  contract:  { agent:"legal",      t:"L'article 6.2 fixe 36 mois de conservation, votre politique interne dit 24.", cta:"Proposer une reformulation" },
  project:   { agent:"matching",   t:"Vos 6 correspondances sont prêtes depuis 2 minutes.", cta:"Ouvrir les résultats" },
};

// ─── Mémoire de parcours : ce que vous faisiez ailleurs ───────────────────
const MEMORY = [
  { agent:"matching",   t:"Matching lancé sur Mobility insights 2026",  w:"il y a 4 min · My Projects" },
  { agent:"legal",      t:"Relecture du DPA Kuzzle ↔ Visions",          w:"il y a 20 min · My Contracts" },
  { agent:"search",     t:"Vue « Trafic IDF » enregistrée",             w:"hier · Catalogue" },
];

const ATTENTION = [
  { id:"calme",    label:"Calme",    d:"Ne m'interrompt jamais" },
  { id:"attentif", label:"Attentif", d:"Une remarque par écran, au plus" },
  { id:"proactif", label:"Proactif", d:"Suit mon objectif et propose la suite" },
];

const Orb = ({ state }) => (
  <span className={`v2-orb ${state}`} aria-hidden="true">
    <Icon name="sparkle" size={15}/>
  </span>
);

const Companion = ({ page = "home", scope = null, runs = [] }) => {
  const { openAgent } = useAgents();
  const [mode, setMode] = useState("capsule");     // pastille | capsule | open
  const [whisper, setWhisper] = useState(null);
  const [seen, setSeen] = useState({});
  const [attention, setAttention] = useState("attentif");
  const [menu, setMenu] = useState(false);
  const [draft, setDraft] = useState("");
  const [ack, setAck] = useState(null);
  const wrapRef = useRef(null);

  // Le compagnon lit la page, puis parle — une seule fois par écran.
  useEffect(() => {
    setWhisper(null);
    if (attention === "calme" || seen[page] || mode === "open") return;
    const w = WHISPERS[page];
    if (!w) return;
    const id = setTimeout(() => setWhisper(w), attention === "proactif" ? 900 : 1800);
    return () => clearTimeout(id);
  }, [page, attention, mode]);

  useEffect(() => {
    const down = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenu(false); };
    const key = (e) => { if (e.key === "Escape") { setMenu(false); setWhisper(null); } };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, []);

  const hush = () => { setWhisper(null); setSeen(s => ({ ...s, [page]: true })); };
  const reads = READS[page] || READS.home;
  const doneCount = OBJECTIVE.steps.filter(s => s.done).length;
  const current = OBJECTIVE.steps.find(s => !s.done);
  const hereStep = OBJECTIVE.steps.findIndex(s => !s.done && s.page === page);
  const running = runs.filter(r => r.state === "running").length;
  const state = whisper ? "talk" : running > 0 ? "busy" : "idle";
  const send = () => { if (!draft.trim()) return; openAgent("master", { prompt: draft, scope }); setDraft(""); setMode("capsule"); };
  const act = (agent, prompt, label) => { openAgent(agent, { prompt, scope }); setAck(label || null); hush(); };

  // ── pastille seule ───────────────────────────────────────────────────────
  if (mode === "pastille") {
    return (
      <div className="v2-comp min" ref={wrapRef}>
        <button type="button" className="v2-comp-orbbtn" onClick={() => setMode("capsule")} aria-label="Ouvrir le compagnon">
          <Orb state={state}/>
          {state !== "idle" && <span className="v2-comp-ping"/>}
        </button>
      </div>
    );
  }

  return (
    <div className={`v2-comp ${mode === "open" ? "open" : ""}`} ref={wrapRef}>

      {/* remarque proactive — au-dessus de la capsule, jamais un modal */}
      {whisper && mode !== "open" && (
        <div className="v2-comp-whisper" role="status">
          <div className="v2-comp-wtop">
            <AgentChip id={whisper.agent}/>
            <span className="v2-spacer"/>
            <button type="button" className="v2-iconbtn" onClick={hush} aria-label="Plus tard"><Icon name="close" size={14}/></button>
          </div>
          <p>{whisper.t}</p>
          <div className="v2-comp-wact">
            <button type="button" className="v2-mini go" onClick={() => act(whisper.agent, whisper.t, whisper.cta)}>{whisper.cta}</button>
            <button type="button" className="v2-mini" onClick={hush}>Plus tard</button>
            <span className="v2-spacer"/>
            <button type="button" className="v2-comp-mute" onClick={() => { setAttention("calme"); hush(); }}>Ne plus me proposer</button>
          </div>
        </div>
      )}

      {/* panneau développé */}
      {mode === "open" && (
        <div className="v2-comp-panel" role="dialog" aria-label="Compagnon">
          <div className="v2-comp-head">
            <Orb state={state}/>
            <span className="v2-comp-id">
              <b>Compagnon</b>
              <small>{scope ? scope.label : "vous suit d'un écran à l'autre"}</small>
            </span>
            <div className="v2-menu-wrap">
              <button type="button" className="v2-iconbtn" onClick={() => setMenu(m => !m)} aria-label="Réglages du compagnon"><Icon name="dots" size={16}/></button>
              {menu && (
                <div className="v2-menu" role="menu" style={{ width:250 }}>
                  <div className="v2-mhead">Niveau d'attention</div>
                  {ATTENTION.map(a => (
                    <button key={a.id} type="button" className="v2-mitem" onClick={() => { setAttention(a.id); setMenu(false); }}>
                      <span style={{ flex:1, minWidth:0 }}>{a.label}<small style={{ display:"block", font:"500 11px/1.4 var(--v2-font)", color:"var(--v2-muted)" }}>{a.d}</small></span>
                      {attention === a.id && <small><Icon name="check" size={14}/></small>}
                    </button>
                  ))}
                  <button type="button" className="v2-mitem" onClick={() => { setMode("pastille"); setMenu(false); }}><Icon name="close" size={15}/><span>Réduire en pastille</span></button>
                </div>
              )}
            </div>
            <button type="button" className="v2-iconbtn" onClick={() => setMode("capsule")} aria-label="Replier"><Icon name="chevronDown" size={16}/></button>
          </div>

          <div className="v2-comp-body">
            {/* 1 · fil rouge */}
            <div className="v2-comp-sec">
              <h4><Icon name="pin" size={13}/>Fil rouge<span className="v2-spacer"/><em>{doneCount}/{OBJECTIVE.steps.length}</em></h4>
              <div className="v2-comp-goal">
                <b>{OBJECTIVE.label}</b><span>{OBJECTIVE.due}</span>
                <div className="v2-comp-track"><i style={{ width:`${(doneCount / OBJECTIVE.steps.length) * 100}%` }}/></div>
              </div>
              <ol className="v2-comp-steps">
                {OBJECTIVE.steps.map((s, i) => (
                  <li key={s.t} className={`${s.done ? "done" : ""} ${s === current ? "cur" : ""}`}>
                    <span className="v2-comp-tick">{s.done ? <Icon name="check" size={12}/> : i + 1}</span>
                    <span className="v2-comp-stept">{s.t}</span>
                    {i === hereStep && <span className="v2-comp-here">vous êtes ici</span>}
                    {!s.done && s.agent && s !== current && <AgentChip id={s.agent}/>}
                    {s === current && s.agent && (
                      <button type="button" className="v2-mini go" onClick={() => act(s.agent, s.t)}>Faire</button>
                    )}
                  </li>
                ))}
              </ol>
            </div>

            {/* 2 · lecture de la page */}
            <div className="v2-comp-sec">
              <h4><Icon name="eye" size={13}/>Sur cet écran</h4>
              {reads.map(r => (
                <button key={r.t} type="button" className="v2-comp-read" onClick={() => act(r.agent, r.t)}>
                  <AgentChip id={r.agent}/>
                  <span>{r.t}</span>
                  <Icon name="arrowRight" size={14}/>
                </button>
              ))}
            </div>

            {/* 3 · mémoire de parcours */}
            <div className="v2-comp-sec">
              <h4><Icon name="history" size={13}/>Reprendre ailleurs</h4>
              {MEMORY.map(m => (
                <button key={m.t} type="button" className="v2-comp-read mem" onClick={() => act(m.agent, m.t)}>
                  <AgentChip id={m.agent}/>
                  <span>{m.t}<small>{m.w}</small></span>
                  <Icon name="arrowRight" size={14}/>
                </button>
              ))}
            </div>
          </div>

          <div className="v2-comp-foot">
            <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Dites-lui quoi faire…" aria-label="Demander au compagnon"/>
            <button type="button" className="v2-send" onClick={send} aria-label="Envoyer"><Icon name="send" size={15}/></button>
          </div>
          <button type="button" className="v2-comp-handoff" onClick={() => { openAgent("master", { scope }); setMode("capsule"); }}>
            Ouvrir le fil complet dans le panneau<Icon name="arrowRight" size={13}/>
          </button>
        </div>
      )}

      {/* capsule permanente */}
      {mode !== "open" && (
        <button type="button" className="v2-comp-capsule" onClick={() => { setMode("open"); setWhisper(null); }}>
          <span className="v2-comp-orbbtn as-span">
            <Orb state={state}/>
            {state !== "idle" && <span className="v2-comp-ping"/>}
          </span>
          <span className="v2-comp-cap-txt">
            {ack ? <b>{ack} — en cours</b> : <b>{current ? current.t : OBJECTIVE.label}</b>}
            <small>{running > 0 ? `${running} tâche en cours · ` : ""}{reads.length} remarque{reads.length > 1 ? "s" : ""} sur cet écran</small>
          </span>
          <span className="v2-comp-cap-go"><Icon name="chevronDown" size={14}/></span>
        </button>
      )}
    </div>
  );
};

window.V2Companion = { Companion, OBJECTIVE };
})();
