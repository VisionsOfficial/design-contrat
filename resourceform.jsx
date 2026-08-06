/* Resource edit form — shared by the offer-content slide-over and the dedicated
   resource page. Two variants (Data / Service), three tabs each. */
const { useState: rfState } = React;
const RFIcon = window.UI.Icon;

const RF_TABS = [
{ id: "general", name: "General Information" },
{ id: "personal", name: "Personal Data" },
{ id: "config", name: "Configuration" }];


const RF_KINDS = {
  Data: { label: "Data", desc: "A Data Resource is the metadata on the information of data that you own.", glyph: <span className="rf-glyph">0101<br />0110</span> },
  Service: { label: "Service", desc: "A Service Resource is the metadata on the information of service that you own (API, Software…).", glyph: <RFIcon name="triggers" size={20} /> }
};

const RfField = ({ label, req, hint, help, children }) =>
<div className="rf-field">
    {label && <label className="rf-label">{label}{req && <em>*</em>}</label>}
    {help && <p className="rf-help">{help}</p>}
    {children}
    {hint && <span className="rf-hint">{hint}</span>}
  </div>;

const RfSelect = ({ value, options, onChange }) =>
<div className="select-wrap"><select className="input select rf-in" value={value} onChange={(e) => onChange && onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select><RFIcon name="chevronDown" size={14} className="select-chev" /></div>;

const RfToggleRow = ({ label, on, onChange }) =>
<div className="rf-togrow"><span>{label}</span><button type="button" className={`rf-tog ${on ? "on" : ""}`} onClick={() => onChange(!on)} role="switch" aria-checked={on} aria-label={label}><span /></button></div>;

const RfCheck = ({ label, on, onChange, strong }) =>
<label className={`rf-check ${strong ? "strong" : ""}`}><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;


function RfGeneral({ kind, v, set }) {
  return (
    <div className="rf-sec">
      <h3 className="rf-h">General information</h3>
      <p className="rf-sub">Provide the general information regarding your resource.</p>
      <RfField label="Resource name" req><input className="input rf-in" value={v.name} onChange={(e) => set("name", e.target.value)} /></RfField>
      <RfField label="Resource type" req><RfSelect value={v.type} options={kind === "Data" ? ["Select resource type", "Dataset", "Database", "File", "Stream"] : ["Select resource type", "API", "Software", "Algorithm", "Computation"]} onChange={(x) => set("type", x)} /></RfField>
      <RfField label="Resource description" req><textarea className="textarea rf-in rf-area" placeholder="Describe the practical and unique features of your resource" value={v.desc} onChange={(e) => set("desc", e.target.value)} /></RfField>
      <RfField label="Confidentiality level"><RfSelect value={v.conf} options={["Select confidentiality level", "Public", "Internal", "Confidential", "Strictly confidential"]} onChange={(x) => set("conf", x)} /></RfField>
      {kind === "Data" ?
      <RfField label="Data location" req help="Specify where your data resource is located. This helps understand the availability of your resource.">
          <RfSelect value={v.location} options={["Location Address", "Europe", "France", "Germany", "Belgium"]} onChange={(x) => set("location", x)} />
        </RfField> :

      <>
          <h3 className="rf-h rf-h2">Location Address</h3>
          <p className="rf-sub">Specify how and where your service resource can be accessed. Provide essential details to help users understand the availability and utility of your service.</p>
          <RfField label="Location" req><input className="input rf-in" placeholder="Enter the country or region where the service is hosted or primarily used" value={v.location} onChange={(e) => set("location", e.target.value)} /></RfField>
        </>
      }
    </div>);

}

function RfPersonal({ kind, v, set }) {
  if (kind === "Data") return (
    <div className="rf-sec">
      <div className="rf-banner strong">
        <h3 className="rf-h" style={{ margin: 0 }}>Personal Data</h3>
        <RfCheck strong label="This dataset includes personal data" on={v.pd} onChange={(x) => set("pd", x)} />
      </div>
    </div>);

  return (
    <div className="rf-sec">
      <div className="rf-banner">
        <RfCheck strong label="This service uses Personal Data" on={v.pd} onChange={(x) => set("pd", x)} />
        <p className="rf-btxt">Describe your asset for the end-user to see.</p>
        <p className="rf-btxt">This is a B2C, user friendly description that will be presented to the data subject to inform them about how their data is going to be used by your service, to ask for their consent. Describe how you want the service / functionality to be presented, for instance “Match your profile with the most relevant job offers.”</p>
        <p className="rf-btxt">Inform as many language / value displays you want to provide, this will be processed and displayed to an individual on his consent screen when this resource is involved in a data transaction.</p>
        <button type="button" className="btn btn-dark">Add text</button>
      </div>
    </div>);

}

const RfIO = ({ v, set }) =>
<>
    <h4 className="rf-h3">Input</h4>
    <RfField label="What is the technical format of the data that will serve as input for your service?"><RfSelect value={v.inFormat} options={["Select format", "JSON", "CSV", "XML", "Parquet"]} onChange={(x) => set("inFormat", x)} /></RfField>
    <RfField label="What is the input description"><textarea className="textarea rf-in rf-area sm" placeholder="description" value={v.inDesc} onChange={(e) => set("inDesc", e.target.value)} /></RfField>
    <RfField label="Provide an anonymized code example for the expected input of this service"><textarea className="textarea rf-in rf-area code" placeholder={'{ "foo": "value1", "bar": "value2"}'} value={v.inSample} onChange={(e) => set("inSample", e.target.value)} /></RfField>
    <div className="rf-duo">
      <RfField label="What is the input size?"><input className="input rf-in" placeholder="1" value={v.inSize} onChange={(e) => set("inSize", e.target.value)} /></RfField>
      <RfField label="&nbsp;"><RfSelect value={v.inUnit} options={["Select unit", "KB", "MB", "GB"]} onChange={(x) => set("inUnit", x)} /></RfField>
    </div>
    <div className="rf-duo">
      <RfField label="What is the processing time of this service?"><input className="input rf-in" placeholder="2.5" value={v.procTime} onChange={(e) => set("procTime", e.target.value)} /></RfField>
      <RfField label="&nbsp;"><RfSelect value={v.procUnit} options={["Select unit", "ms", "seconds", "minutes"]} onChange={(x) => set("procUnit", x)} /></RfField>
    </div>
    <h4 className="rf-h3">Output</h4>
    <RfField label="What is the expected technical format for this output?"><RfSelect value={v.outFormat} options={["Select format", "JSON", "CSV", "XML", "Parquet"]} onChange={(x) => set("outFormat", x)} /></RfField>
    <RfField label="What is the ouput description"><textarea className="textarea rf-in rf-area sm" placeholder="description" value={v.outDesc} onChange={(e) => set("outDesc", e.target.value)} /></RfField>
    <RfField label="Provide an anonymized code example for the expected output of this service"><textarea className="textarea rf-in rf-area code" placeholder={'{ "foo": "value1", "bar": "value2"}'} value={v.outSample} onChange={(e) => set("outSample", e.target.value)} /></RfField>
  </>;


function RfConfig({ kind, v, set }) {
  return (
    <div className="rf-sec">
      {kind === "Data" ?
      <>
          <RfField label="Select MIME type" req><RfSelect value={v.mime} options={["application/json", "text/csv", "application/xml", "application/octet-stream"]} onChange={(x) => set("mime", x)} /></RfField>
          <RfField label="Proxy"><RfToggleRow label="Check this box to enable resource proxy" on={v.proxy} onChange={(x) => set("proxy", x)} /></RfField>
          <RfIO v={v} set={set} />
          <h4 className="rf-h3">Is the data aimed to be an API payload ?</h4>
          <RfCheck label="Check this box if you aim to use this data as payload to consume an API of a service provider." on={v.payload} onChange={(x) => set("payload", x)} />
        </> :

      <>
          <div className="rf-banner note">This section is for a more technical profile to fill in. It will allow the actual consumption of your resource by the different projects you contract with. You can come back to it later.</div>
          <h3 className="rf-h">Service Representation <span className="rf-q" title="Technical description of how your service is called.">?</span></h3>
          <p className="rf-sub">Specify where and how the service resource is usable by the <a href="#">My Tech Space</a>. Check out our technical space for more technical documentation.</p>
          <RfField label="Protocol type"><RfSelect value={v.protocol} options={["Select protocol type", "REST", "GraphQL", "gRPC"]} onChange={(x) => set("protocol", x)} /></RfField>
          <RfField label="URL" req help="Specify the endpoint at which your resource is accessible. This should probably be a REST API endpoint."><input className="input rf-in" value={v.url} onChange={(e) => set("url", e.target.value)} /></RfField>
          <RfField label="Query Parameters" req help="Here you can set a list of query parameters that the connector should be able to understand when processing an incoming data request from another participant. Please note that ONLY the parameters informed here will be searched in the URL string of the request made by the participant.">
            <span className="rf-warn">Submit each element with a comma or by pressing enter</span>
            <div className="rf-inwrap"><input className={`input rf-in ${v.params ? "" : "err"}`} value={v.params} onChange={(e) => set("params", e.target.value)} />{!v.params && <RFIcon name="danger" size={15} className="rf-inerr" />}</div>
          </RfField>
          <RfField label="Proxy"><RfToggleRow label="Check this box to enable resource proxy" on={v.proxy} onChange={(x) => set("proxy", x)} /></RfField>
          <RfIO v={v} set={set} />
          <h4 className="rf-h3">Is the resource an API ?</h4>
          <RfCheck label="Check this box if your resource is an API and it is planned to provide a direct response in an API consumption flow." on={v.isApi} onChange={(x) => set("isApi", x)} />
        </>
      }
    </div>);

}

const RF_EMPTY = (kind, name) => ({
  name: name || "", type: "Select resource type", desc: "", conf: "Select confidentiality level",
  location: kind === "Data" ? "Location Address" : "", pd: false,
  mime: "application/json", proxy: false, protocol: "Select protocol type", url: "", params: "",
  inFormat: "Select format", inDesc: "", inSample: "", inSize: "", inUnit: "Select unit",
  procTime: "", procUnit: "Select unit", outFormat: "Select format", outDesc: "", outSample: "",
  payload: false, isApi: false
});

/* The form body: kind card + tabs + panel. Chrome (drawer / page) is provided by
   the caller, which also renders its own Cancel / Next / Save footer. */
function ResourceForm({ kind = "Data", value, onChange, tab, onTab }) {
  const [localTab, setLocalTab] = rfState("general");
  const t = tab || localTab;
  const setT = onTab || setLocalTab;
  const [localVal, setLocalVal] = rfState(() => RF_EMPTY(kind));
  const v = value || localVal;
  const set = (k, x) => onChange ? onChange(k, x) : setLocalVal((p) => ({ ...p, [k]: x }));
  const k = RF_KINDS[kind];
  return (
    <div className="rf">
      <div className="rf-kind"><span className="rf-kind-ic">{k.glyph}</span><div><div className="rf-kind-t">{k.label}</div><p className="rf-kind-d">{k.desc}</p></div></div>
      <div className="rf-tabs" role="tablist">
        {RF_TABS.map((x) => <button key={x.id} type="button" role="tab" aria-selected={t === x.id} className={`rf-tab ${t === x.id ? "active" : ""}`} onClick={() => setT(x.id)}>{x.name}</button>)}
      </div>
      <div className="rf-body">
        {t === "general" && <RfGeneral kind={kind} v={v} set={set} />}
        {t === "personal" && <RfPersonal kind={kind} v={v} set={set} />}
        {t === "config" && <RfConfig kind={kind} v={v} set={set} />}
      </div>
    </div>);

}

window.VTResourceForm = { ResourceForm, RF_TABS, RF_EMPTY };