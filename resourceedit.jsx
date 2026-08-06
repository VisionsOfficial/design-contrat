const { useState: reState } = React;
const { Icon: ReIcon } = window.UI;
const { AppLayout: ReLayout } = window.VTLayout;
const { ResourceForm: ReForm, RF_EMPTY: ReEmpty, RF_TABS: ReTabs } = window.VTResourceForm;

const reQuery = () => { const p = new URLSearchParams(location.search); return { kind: p.get("kind") === "Service" ? "Service" : "Data", name: p.get("name") || "", back: p.get("back") || "FINAL offer_settings.html" }; };

function ResourceEditPage() {
  const q = reQuery();
  const [tab, setTab] = reState("general");
  const [v, setV] = reState(() => ReEmpty(q.kind, q.name));
  const [saved, setSaved] = reState(false);
  const set = (k, x) => setV((p) => ({ ...p, [k]: x }));
  const idx = ReTabs.findIndex((t) => t.id === tab);
  const last = idx === ReTabs.length - 1;
  return (
    <ReLayout title={<span className="os-crumb-title"><a href="My Offers.html">My offers</a><span className="sep">/</span><a href={q.back}>check_free_offer</a><span className="sep">/</span><b>{q.name || "New resource"}</b></span>} activeId="offers-all" className="os-app">
      <div className="os-page" style={{ maxWidth: 940 }}>
        <section className="os-panel">
          <div className="os-panel-head">
            <div><h2>{q.name ? "Edit resource" : "Add resource"}</h2><p>Please provide here general information on the resource that will be displayed in the catalogue. This is to help potential buyers to identify your resources added value and unique features!</p></div>
            <a className="btn btn-ghost" href={q.back}><ReIcon name="chevronLeft" size={14} /> Back to offer</a>
          </div>
          <div className="os-panel-body" style={{ paddingTop: 16 }}>
            <ReForm kind={q.kind} value={v} onChange={set} tab={tab} onTab={setTab} />
          </div>
          <div className="os-panel-foot">
            <span className="sb-txt">{saved ? <b>✓ Resource saved</b> : `Step ${idx + 1} of ${ReTabs.length} · ${ReTabs[idx].name}`}</span>
            <div className="sb-actions">
              <a className="btn btn-ghost" href={q.back}>Cancel</a>
              {last
                ? <button type="button" className="btn btn-primary" onClick={() => { setSaved(true); setTimeout(() => { location.href = q.back; }, 700); }}><ReIcon name="check" size={14} /> Save</button>
                : <button type="button" className="btn btn-primary" onClick={() => setTab(ReTabs[idx + 1].id)}>Next</button>}
            </div>
          </div>
        </section>
      </div>
    </ReLayout>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ResourceEditPage />);
