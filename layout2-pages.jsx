/* VisionsTrust — Layout v2 : contenus de démonstration (5 contextes).
 * Chaque page montre où vit la compétence d'agent correspondante. */
(function () {
const { useState } = React;
const { Icon, AgentChip, useAgents } = window.V2;
const { AssistField, NLSearch, PeekSheet, BulkBar } = window.V2Agents;

const Ph = ({ label, h = 120 }) => <div className="v2-ph" style={{ height: h }}>{label}</div>;

// ── HOME : le travail à faire, pas un mur de chiffres ──────────────────────
const Home = () => {
  const { openAgent, openPalette } = useAgents();
  return (
    <div className="v2-page">
      <div className="v2-grid3">
        {[["Offres publiées","12"],["Projets actifs","5"],["Contrats à signer","2"],["Échanges ce mois","1 284"]].map(([k, v]) => (
          <div className="v2-kpi" key={k}><span>{k}</span><b>{v}</b></div>
        ))}
      </div>
      <div className="v2-grid2">
        <div className="v2-card">
          <h3>À traiter</h3>
          <p className="sub">Chaque ligne ouvre l'agent concerné avec le contexte déjà chargé — pas besoin de réexpliquer.</p>
          <table className="v2-table" style={{ marginTop: 12 }}>
            <tbody>
              {[
                { t:"DPA · Kuzzle ↔ Visions", s:"2 clauses signalées", a:"legal", c:"Relire" },
                { t:"Air quality feed", s:"Description incomplète", a:"completion", c:"Compléter" },
                { t:"Mobility insights 2026", s:"21 offres correspondent", a:"matching", c:"Voir les matchs" },
              ].map(r => (
                <tr key={r.t}>
                  <td>{r.t}<div style={{ font:"500 11.5px/1.4 var(--v2-font)", color:"var(--v2-muted)", fontWeight:500 }}>{r.s}</div></td>
                  <td style={{ width:1, whiteSpace:"nowrap" }}><AgentChip id={r.a}/></td>
                  <td style={{ width:1 }}><button type="button" className="v2-mini go" onClick={() => openAgent(r.a, { scope:{ label:r.t } })}>{r.c}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="v2-card">
          <h3>Prise en main</h3>
          <p className="sub">Les parcours guidés remplacent l'ancien « Helper home » : ils vivent dans la page, l'assistant reste joignable via ⌘K.</p>
          <div style={{ display:"grid", gap:9, marginTop:13 }}>
            {[["Publier une première offre","3 étapes · 4 min"],["Créer un projet et trouver des partenaires","4 étapes"],["Comprendre les contrats et licences","lecture"]].map(([t, s]) => (
              <button key={t} type="button" className="v2-pal-row" style={{ border:"1px solid var(--v2-border)" }} onClick={openPalette}>
                <span className="v2-pal-ico"><Icon name="bolt" size={16}/></span>
                <span className="v2-pal-t">{t}<small>{s}</small></span>
                <Icon name="chevronRight" size={15}/>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── CATALOGUE : l'agent Search EST la barre de recherche ───────────────────
const Catalogue = ({ onOpenMatches }) => (
  <div className="v2-page">
    <NLSearch onMatch={onOpenMatches}/>
    <div className="v2-grid2">
      {[
        { t:"Real-time traffic counts — IDF", o:"Kuzzle", d:"Comptages routiers agrégés toutes les 5 minutes sur 1 240 capteurs." },
        { t:"Air quality feed — Paris", o:"AirLab", d:"NO₂, PM2.5, PM10 par station, mise à jour horaire." },
        { t:"Parking occupancy API", o:"Indigo", d:"Taux d'occupation temps réel, 320 parkings." },
        { t:"Road works planning", o:"DiRIF", d:"Chantiers programmés et emprises, mise à jour hebdomadaire." },
      ].map(c => (
        <div className="v2-card" key={c.t} style={{ display:"flex", flexDirection:"column", gap:11 }}>
          <Ph label="visuel de l'offre" h={92}/>
          <div><h3>{c.t}</h3><p className="sub">{c.o} · données</p></div>
          <p className="sub">{c.d}</p>
          <div style={{ display:"flex", gap:7, marginTop:"auto" }}>
            <button type="button" className="v2-mini go">Ajouter au panier</button>
            <button type="button" className="v2-mini" onClick={onOpenMatches}><Icon name="target" size={13}/>Comparer</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── CREATE OFFER : l'agent Completion vit dans les champs ──────────────────
const CreateOffer = () => {
  const { openAgent } = useAgents();
  const scope = { label:"Offre · Air quality feed (brouillon)" };
  return (
    <div className="v2-page" style={{ maxWidth: 880 }}>
      <div className="v2-card" style={{ display:"flex", alignItems:"center", gap:12 }}>
        <AgentChip id="completion"/>
        <p className="sub" style={{ flex:1 }}>Completion est actif sur cette page : chaque champ propose une aide ciblée, et les propositions restent modifiables avant insertion.</p>
        <button type="button" className="v2-mini" onClick={() => openAgent("completion", { scope, prompt:"Compléter toute la fiche à partir de mon schéma" })}>Tout compléter</button>
      </div>
      <div className="v2-form">
        <AssistField label="Titre de l'offre" hint="Ex. Air quality feed — Paris" value="Air quality feed" scope={scope}
          suggestion="Air quality feed — Paris (NO₂, PM2.5, PM10, horaire)"/>
        <AssistField label="Description" hint="Décrivez le contenu, la couverture et la fréquence" multiline scope={scope}
          suggestion="Mesures horaires de qualité de l'air (NO₂, PM2.5, PM10) issues de 68 stations parisiennes, livrées en JSON avec horodatage UTC et identifiant de station. Couverture : Paris intra-muros et petite couronne. Historique disponible depuis 2019."/>
        <AssistField label="Mots-clés" hint="3 à 8 mots-clés" scope={scope}
          suggestion="qualité de l'air, NO2, particules fines, Paris, environnement, temps réel"/>
        <div className="v2-field">
          <div className="v2-flabel">
            <label>Licence &amp; conditions d'usage</label>
            <span className="v2-spacer"/>
            <button type="button" className="v2-agent legal btn" onClick={() => openAgent("legal", { scope, prompt:"Quelle licence choisir pour cette offre ?" })}><Icon name="scale" size={13}/>Demander à Legal</button>
          </div>
          <select className="v2-input"><option>ODbL 1.0</option><option>CC BY 4.0</option><option>Licence propriétaire VisionsTrust</option></select>
          <p className="sub" style={{ marginTop:8 }}>Legal répond dans le dock, ancré sur cette offre — la page ne change pas.</p>
        </div>
      </div>
    </div>
  );
};

// ── CONTRACT : Legal ancré sur le document ────────────────────────────────
const Contract = () => {
  const { openAgent } = useAgents();
  const scope = { label:"DPA · Kuzzle ↔ Visions" };
  return (
    <div className="v2-page" style={{ maxWidth: 820 }}>
      <div className="v2-card">
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <h3 style={{ margin:0, flex:1 }}>Data Processing Agreement</h3>
          <span className="v2-pill warn">2 clauses signalées</span>
          <span className="v2-pill">v4 · 24 clauses</span>
        </div>
        <p className="sub">Kuzzle (fournisseur) ↔ Visions SAS (destinataire) · généré le 12/07/2026</p>
      </div>
      {[
        { n:"Art. 4 — Finalités du traitement", t:"Les données sont traitées aux seules fins décrites dans l'offre Real-time traffic counts et le projet Mobility insights 2026.", flag:false },
        { n:"Art. 6.2 — Durée de conservation", t:"Le destinataire conserve les données pendant 36 mois à compter de la réception, puis procède à leur suppression documentée.", flag:true },
        { n:"Art. 9 — Sous-traitance", t:"Le destinataire peut recourir à des sous-traitants ultérieurs pour l'exécution du traitement.", flag:true },
      ].map(c => (
        <div className="v2-card" key={c.n}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:7 }}>
            <h3 style={{ margin:0, flex:1, fontSize:13.5 }}>{c.n}</h3>
            {c.flag && <span className="v2-pill warn"><Icon name="shield" size={12}/>À revoir</span>}
            <button type="button" className="v2-agent legal btn" onClick={() => openAgent("legal", { scope:{ label:`${scope.label} · ${c.n}` }, prompt:`Expliquer ${c.n}` })}><Icon name="scale" size={13}/>Demander</button>
          </div>
          <p className="sub" style={{ fontSize:13, color:"#41546f" }}>{c.t}</p>
        </div>
      ))}
    </div>
  );
};

// ── PROJECT : Matching lancé comme une tâche ──────────────────────────────
const Project = ({ onOpenMatches }) => {
  const { openAgent } = useAgents();
  return (
    <div className="v2-page">
      <div className="v2-card" style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ flex:1 }}>
          <h3>Mobility insights 2026</h3>
          <p className="sub">Projet publié · 3 participants · besoin : données de trafic, qualité de l'air, stationnement</p>
        </div>
        <span className="v2-pill ok">Publié</span>
        <button type="button" className="v2-cta" onClick={onOpenMatches}><Icon name="target" size={15}/>Lancer un matching</button>
      </div>
      <div className="v2-grid2">
        <div className="v2-card">
          <h3>Ressources attendues</h3>
          <table className="v2-table" style={{ marginTop:10 }}>
            <thead><tr><th>Besoin</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {[["Comptages routiers","couvert"],["Qualité de l'air","6 candidats"],["Stationnement","aucun match"]].map(([a, b]) => (
                <tr key={a}><td>{a}</td><td><span className={`v2-pill ${b === "couvert" ? "ok" : b === "aucun match" ? "warn" : ""}`}>{b}</span></td>
                  <td style={{ width:1 }}><button type="button" className="v2-mini" onClick={onOpenMatches}>Voir</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="v2-card">
          <h3>Participants</h3>
          <p className="sub">Kuzzle, AirLab, Visions SAS</p>
          <div style={{ marginTop:12 }}><Ph label="graphe des échanges du projet" h={132}/></div>
          <div style={{ display:"flex", gap:7, marginTop:12 }}>
            <button type="button" className="v2-mini go">Inviter un participant</button>
            <button type="button" className="v2-mini" onClick={() => openAgent("help", { scope:{ label:"Mobility insights 2026" }, prompt:"Comment inviter un participant ?" })}>Comment ça marche ?</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── MY OFFERS : liste à l'échelle — vues, sélection, lot, peek ────────────
const OFFERS = [
  { t:"Fleet telemetry — raw", type:"Données", state:"Publiée", done:100, upd:"12/07/2026", contracts:3 },
  { t:"Air quality feed", type:"Données", state:"Brouillon", done:62, upd:"Hier", contracts:0 },
  { t:"Traffic anomaly detection", type:"Service", state:"Publiée", done:100, upd:"02/07/2026", contracts:1 },
  { t:"Geocoding API — FR", type:"Service", state:"Publiée", done:94, upd:"28/06/2026", contracts:2 },
  { t:"Edge gateway hosting", type:"Infrastructure", state:"Brouillon", done:41, upd:"25/06/2026", contracts:0 },
  { t:"Historical GPS traces 2019-2025", type:"Données", state:"Publiée", done:100, upd:"20/06/2026", contracts:4 },
  { t:"Mobility KPI dashboard", type:"Service", state:"Brouillon", done:78, upd:"18/06/2026", contracts:0 },
];
const OffersList = () => {
  const { openAgent } = useAgents();
  const [sel, setSel] = useState([]);
  const [peek, setPeek] = useState(null);
  const [cursor, setCursor] = useState(0);
  const toggle = (i) => setSel(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i]);
  React.useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (k === "j") { e.preventDefault(); setCursor(c => { const n = Math.min(OFFERS.length - 1, c + 1); if (peek !== null) setPeek(n); return n; }); }
      if (k === "k") { e.preventDefault(); setCursor(c => { const n = Math.max(0, c - 1); if (peek !== null) setPeek(n); return n; }); }
      if (k === "x") { e.preventDefault(); toggle(cursor); }
      if (k === "enter" && peek === null) setPeek(cursor);
      if (e.key === "Escape" && peek !== null) { e.stopPropagation(); setPeek(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, peek]);
  return (
    <div className="v2-page">
      {sel.length > 0 && (
        <BulkBar count={sel.length} onClear={() => setSel([])}
          onAgent={(a) => openAgent(a, { scope:{ label:`${sel.length} offres sélectionnées` }, prompt:`Traiter ${sel.length} offres sélectionnées` })}/>
      )}
      <div className="v2-card" style={{ padding:"6px 8px 10px" }}>
        <table className="v2-table">
          <thead><tr>
            <th style={{ width:28 }}><button type="button" className={`v2-check ${sel.length === OFFERS.length ? "on" : ""}`} onClick={() => setSel(sel.length === OFFERS.length ? [] : OFFERS.map((_, i) => i))} aria-label="Tout sélectionner"><Icon name="check" size={11}/></button></th>
            <th>Offre</th><th>Type</th><th>Statut</th><th>Complétude</th><th>Contrats</th><th>MAJ</th><th></th>
          </tr></thead>
          <tbody>
            {OFFERS.map((o, i) => (
              <tr key={o.t} className={`v2-row-hover ${sel.includes(i) ? "sel" : ""}`} style={cursor === i ? { boxShadow:"inset 2px 0 0 var(--v2-navy)" } : null} onClick={() => setCursor(i)}>
                <td><button type="button" className={`v2-check ${sel.includes(i) ? "on" : ""}`} onClick={(e) => { e.stopPropagation(); toggle(i); }} aria-label={`Sélectionner ${o.t}`}><Icon name="check" size={11}/></button></td>
                <td>{o.t}</td>
                <td>{o.type}</td>
                <td><span className={`v2-pill ${o.state === "Publiée" ? "ok" : "warn"}`}>{o.state}</span></td>
                <td>
                  <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span className="v2-score-bar" style={{ width:56 }}><i style={{ width:`${o.done}%`, background: o.done === 100 ? "var(--v2-teal)" : "#c88a2e" }}/></span>
                    {o.done}%
                  </span>
                </td>
                <td>{o.contracts}</td>
                <td style={{ color:"var(--v2-muted)" }}>{o.upd}</td>
                <td style={{ width:1, whiteSpace:"nowrap" }}>
                  {o.done < 100 && <button type="button" className="v2-agent completion btn" style={{ marginRight:6 }} onClick={(e) => { e.stopPropagation(); openAgent("completion", { scope:{ label:o.t }, prompt:`Compléter ${o.t}` }); }}><Icon name="wand" size={12}/>Compléter</button>}
                  <button type="button" className="v2-mini" onClick={(e) => { e.stopPropagation(); setPeek(i); setCursor(i); }}><Icon name="eye" size={13}/>Aperçu</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sub" style={{ font:"500 12px/1.5 var(--v2-font)", color:"var(--v2-muted)" }}>Sélectionnez des lignes (X) pour appliquer un agent en lot · J / K pour naviguer · Aperçu pour rester dans la liste.</p>
      {peek !== null && (
        <PeekSheet item={OFFERS[peek]} index={peek} total={OFFERS.length} onClose={() => setPeek(null)}
          onPrev={() => { const n = Math.max(0, peek - 1); setPeek(n); setCursor(n); }}
          onNext={() => { const n = Math.min(OFFERS.length - 1, peek + 1); setPeek(n); setCursor(n); }}/>
      )}
    </div>
  );
};

window.V2Pages = { Home, Catalogue, CreateOffer, Contract, Project, OffersList };
})();
