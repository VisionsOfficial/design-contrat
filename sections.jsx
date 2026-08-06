// VisionsTrust Settings — section content components
// Wrapped in IIFE so const declarations don't collide with other Babel scripts.
(function() {
const { useState } = React;
const { Icon, Card, Field, Input, Textarea, Select, Toggle, Btn, Pill, SectionHeader, PasswordField, CopyField } = window.UI;

// ─── ACCOUNT ────────────────────────────────────────────────────────────────
const AccountSection = ({ form, set }) => (
  <>
    <SectionHeader title="Account" desc="Public information about your organisation as it appears in the catalogue."/>
    <Card title="Organisation profile" desc="The name and description shown to other VisionsTrust members.">
      <div className="grid-2">
        <Field label="Organisation name" required>
          <Input value={form.name} onChange={e => set("name", e.target.value)}/>
        </Field>
        <Field label="Display handle" hint="Used in URLs. Lowercase, no spaces.">
          <Input value={form.handle} onChange={e => set("handle", e.target.value)} placeholder="anthony_data_provider"/>
        </Field>
      </div>
      <Field label="Description" hint="Max 280 characters.">
        <Textarea rows="3" value={form.description} onChange={e => set("description", e.target.value)}/>
      </Field>
    </Card>

    <Card title="Organisation logo" desc="Square image, 256×256 minimum. SVG recommended.">
      <div className="logo-row">
        <div className="logo-preview">
          <Icon name="upload" size={22}/>
        </div>
        <div className="logo-meta">
          <Btn variant="ghost" icon="upload">Upload image</Btn>
          <Btn variant="text">Remove</Btn>
          <p className="muted">Supported: JPG, PNG, SVG · Max 2 MB</p>
        </div>
      </div>
    </Card>

    <Card title="Organisation links" desc="Public URLs related to your organisation.">
      <div className="grid-2">
        <Field label="Website"><Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://"/></Field>
        <Field label="Registration URL"><Input value={form.registration} onChange={e => set("registration", e.target.value)} placeholder="https://"/></Field>
        <Field label="Privacy policy"><Input value={form.privacy} onChange={e => set("privacy", e.target.value)} placeholder="https://"/></Field>
        <Field label="Terms of service"><Input value={form.terms} onChange={e => set("terms", e.target.value)} placeholder="https://"/></Field>
      </div>
    </Card>
  </>
);

// ─── VISIBILITY ─────────────────────────────────────────────────────────────
const VisibilitySection = ({ form, set }) => {
  const opts = [
    { v: "public", label: "Public", desc: "Anyone on VisionsTrust can discover and contact you." },
    { v: "members", label: "Members only", desc: "Only authenticated members of registered organisations can find you." },
    { v: "private", label: "Private", desc: "Only users you've explicitly invited can find you." },
  ];
  return (
    <>
      <SectionHeader title="Visibility & sharing" desc="Control how other users discover your organisation in the catalogue."/>
      <div className="banner info">
        <Icon name="info" size={16}/>
        <div>
          <strong>Getting started</strong>
          <span>Learn everything you need to know about visibility control in the <a href="#">documentation</a>.</span>
        </div>
      </div>
      <Card title="Discovery mode">
        <div className="radio-stack">
          {opts.map(o => (
            <label key={o.v} className={`radio-card ${form.visibility === o.v ? "selected" : ""}`}>
              <input type="radio" name="visibility" checked={form.visibility === o.v} onChange={() => set("visibility", o.v)}/>
              <div className="radio-dot"/>
              <div>
                <div className="radio-label">{o.label}</div>
                <div className="radio-desc">{o.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>
      <Card title="Catalogue listing">
        <Toggle checked={form.indexed} onChange={v => set("indexed", v)} label="Index in public catalogue" desc="Allow VisionsTrust to display your organisation in the public catalogue."/>
        <Toggle checked={form.contactable} onChange={v => set("contactable", v)} label="Allow contact requests" desc="Other organisations can send you data exchange requests directly."/>
      </Card>
    </>
  );
};

// ─── TEAM ───────────────────────────────────────────────────────────────────
const TeamSection = () => {
  const [members, setMembers] = useState([
    { email: "anthony@visionspol.eu", role: "Owner", status: "active", initials: "AN" },
    { email: "anthony+1@visionspol.eu", role: "Admin", status: "active", initials: "A1" },
    { email: "dev@visionspol.eu", role: "Developer", status: "pending", initials: "DE" },
  ]);
  const [invite, setInvite] = useState("");
  const [role, setRole] = useState("Admin");

  const send = () => {
    if (!invite.includes("@")) return;
    setMembers(m => [...m, { email: invite, role, status: "pending", initials: invite.slice(0,2).toUpperCase() }]);
    setInvite("");
  };
  const remove = (em) => setMembers(m => m.filter(x => x.email !== em));

  return (
    <>
      <SectionHeader
        title="Team & access"
        desc="Invite team members to manage this organisation. Useful when developers handle technical setup while business teams manage offerings."
      />
      <Card title="Invite a teammate">
        <div className="invite-row">
          <Input placeholder="teammate@yourcompany.com" value={invite} onChange={e => setInvite(e.target.value)}/>
          <Select value={role} onChange={e => setRole(e.target.value)}>
            <option>Admin</option>
            <option>Developer</option>
            <option>Viewer</option>
          </Select>
          <Btn icon="plus" onClick={send}>Send invite</Btn>
        </div>
        <div className="role-legend">
          <span><strong>Owner</strong> · full control, billing</span>
          <span><strong>Admin</strong> · manage team, offers, contracts</span>
          <span><strong>Developer</strong> · API, endpoints, technical config</span>
          <span><strong>Viewer</strong> · read-only access</span>
        </div>
      </Card>
      <Card title={`Members · ${members.length}`}>
        <div className="member-list">
          {members.map(m => (
            <div className="member-row" key={m.email}>
              <div className="member-id">
                <div className="avatar">{m.initials}</div>
                <div>
                  <div className="member-email">{m.email}</div>
                  {m.status === "pending"
                    ? <Pill tone="warn">Invitation pending</Pill>
                    : <Pill tone="success">Active</Pill>}
                </div>
              </div>
              <div className="member-actions">
                <Select defaultValue={m.role} disabled={m.role === "Owner"}>
                  <option>Owner</option><option>Admin</option><option>Developer</option><option>Viewer</option>
                </Select>
                <button className="icon-btn ghost" disabled={m.role === "Owner"} onClick={() => remove(m.email)} title="Remove">
                  <Icon name="x" size={16}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
};

// ─── BILLING ────────────────────────────────────────────────────────────────
const BillingSection = () => (
  <>
    <SectionHeader title="Billing & plan" desc="Manage your subscription, payment method and invoices."/>
    <Card>
      <div className="plan-hero">
        <div>
          <Pill tone="primary">Current plan</Pill>
          <h3 className="plan-name">Growth</h3>
          <p className="plan-desc">Includes 10 active offers, 500k API calls/month, unlimited contracts.</p>
          <div className="plan-price"><strong>€249</strong><span>/month, billed annually</span></div>
        </div>
        <div className="plan-actions">
          <Btn variant="ghost">Compare plans</Btn>
          <Btn>Upgrade</Btn>
        </div>
      </div>
      <div className="usage-grid">
        <UsageBar label="Active offers" used={7} total={10}/>
        <UsageBar label="API calls (this month)" used={328450} total={500000} format={n => n.toLocaleString()}/>
        <UsageBar label="Storage" used={4.2} total={20} unit="GB"/>
      </div>
    </Card>
    <Card title="Payment method">
      <div className="card-line">
        <div className="cc-brand">VISA</div>
        <div>
          <div>Visa ending in <strong>4242</strong></div>
          <div className="muted">Expires 09 / 2028 · Anthony N.</div>
        </div>
        <Btn variant="ghost">Update</Btn>
      </div>
    </Card>
    <Card title="Invoices" desc="Download past invoices for accounting." action={<Btn variant="ghost" icon="download">Download all</Btn>}>
      <div className="table">
        <div className="table-head">
          <div>Date</div><div>Description</div><div>Amount</div><div>Status</div><div></div>
        </div>
        {[
          ["May 1, 2026", "Growth plan — May 2026", "€249.00", "Paid"],
          ["Apr 1, 2026", "Growth plan — Apr 2026", "€249.00", "Paid"],
          ["Mar 1, 2026", "Growth plan — Mar 2026", "€249.00", "Paid"],
          ["Feb 1, 2026", "Growth plan — Feb 2026", "€249.00", "Paid"],
        ].map(([d, l, a, s], i) => (
          <div className="table-row" key={i}>
            <div className="muted">{d}</div>
            <div>{l}</div>
            <div className="mono">{a}</div>
            <div><Pill tone="success">{s}</Pill></div>
            <div className="row-actions"><button className="icon-btn ghost"><Icon name="download" size={14}/></button></div>
          </div>
        ))}
      </div>
    </Card>
  </>
);
const UsageBar = ({ label, used, total, unit = "", format }) => {
  const pct = Math.min(100, (used / total) * 100);
  const fmt = format || (n => `${n}${unit ? " " + unit : ""}`);
  return (
    <div className="usage">
      <div className="usage-head"><span>{label}</span><span className="muted">{fmt(used)} / {fmt(total)}</span></div>
      <div className="usage-bar"><div style={{ width: `${pct}%` }}/></div>
    </div>
  );
};

// ─── ENDPOINTS ──────────────────────────────────────────────────────────────
const EndpointsSection = () => {
  const [endpoints, setEndpoints] = useState([
    { id: "data",     label: "Data endpoint",     url: "https://api.anthony-dp.eu/v1/data",     desc: "Where consumers fetch your datasets" },
    { id: "consent",  label: "Consent endpoint",  url: "https://api.anthony-dp.eu/v1/consent",  desc: "Receives user consent confirmations" },
    { id: "policy",   label: "Policy endpoint",   url: "https://api.anthony-dp.eu/v1/policy",   desc: "Exposes data usage policies" },
    { id: "discovery",label: "Discovery endpoint",url: "https://api.anthony-dp.eu/.well-known/dataspace", desc: "Standard discovery document" },
  ]);
  const upd = (id, val) => setEndpoints(es => es.map(e => e.id === id ? { ...e, url: val } : e));

  return (
    <>
      <SectionHeader title="Endpoints" desc="URLs exposed by your connector. VisionsTrust reaches these to broker data exchanges."/>
      <div className="banner info">
        <Icon name="shield" size={16}/>
        <div>
          <strong>Connector required</strong>
          <span>Your endpoints must be served by a Prometheus-X Data Space Connector. <a href="#">Deployment guide</a>.</span>
        </div>
      </div>
      <Card>
        <div className="endpoint-list">
          {endpoints.map(e => (
            <div className="endpoint-row" key={e.id}>
              <div className="endpoint-meta">
                <div className="endpoint-label">{e.label}</div>
                <div className="endpoint-desc">{e.desc}</div>
              </div>
              <div className="endpoint-input">
                <Input value={e.url} onChange={ev => upd(e.id, ev.target.value)}/>
                <span className="endpoint-status ok"><span className="dot"/>Reachable</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
};

// ─── API KEYS ───────────────────────────────────────────────────────────────
const ApiSection = () => (
  <>
    <SectionHeader
      title="API keys"
      desc="Credentials used to communicate with VisionsTrust service APIs."
      action={<Btn variant="ghost" icon="refresh">Regenerate service &amp; secret API keys</Btn>}
    />
    <div className="banner success">
      <Icon name="shield" size={16}/>
      <div>
        <strong>Security recommendation</strong>
        <span>These keys let you talk directly to VisionsTrust. We recommend deploying the Data Space Connector — pre-configured for Prometheus-X services.</span>
      </div>
    </div>
    <Card title="Service key" desc="Client ID equivalent. Safe to share with your connector.">
      <CopyField value="Y1M_tqDC_pbVxEwryVKFf7FqAzW13lClRJpesYsNNvz5ngef4ct3i6N4lke2VhHy8IiKehVvlfLztJOyI6nWppK7ImRKUsoEs7rB"/>
    </Card>
    <Card title="Secret key" desc="Client Secret equivalent. Treat as a password — never expose it client-side.">
      <CopyField masked value="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"/>
    </Card>
    <Card title="Exchange trigger API key" desc="Required to enable VisionsTrust Trigger Exchanges. Setup this key in your PDC's environment variables.">
      <div className="empty-state">
        <div className="empty-icon"><Icon name="key" size={20}/></div>
        <div>
          <div className="empty-title">No exchange trigger key</div>
          <div className="empty-desc">Generate one and add it to your PDC config.</div>
        </div>
        <Btn icon="plus">Generate API key</Btn>
      </div>
    </Card>
  </>
);

// ─── PDC ────────────────────────────────────────────────────────────────────
const PdcSection = () => (
  <>
    <SectionHeader
      title="Personal Data Connector"
      desc="Configure the connector deployed in your infrastructure to broker data exchanges."
      action={<Pill tone="beta">Beta</Pill>}
    />
    <Card>
      <div className="pdc-hero">
        <div className="pdc-status">
          <div className="status-dot ok"/>
          <div>
            <div className="pdc-title">Connector online</div>
            <div className="muted">v2.4.1 · last heartbeat 14s ago · eu-west-1</div>
          </div>
        </div>
        <Btn variant="ghost" icon="external">Open dashboard</Btn>
      </div>
    </Card>
    <Card title="Deployment">
      <div className="grid-2">
        <Field label="PDC base URL"><Input defaultValue="https://pdc.anthony-dp.eu" /></Field>
        <Field label="Region">
          <Select defaultValue="eu-west-1">
            <option>eu-west-1</option><option>eu-central-1</option><option>us-east-1</option>
          </Select>
        </Field>
        <Field label="Version">
          <Select defaultValue="2.4.1 (latest)">
            <option>2.4.1 (latest)</option><option>2.3.7</option><option>2.2.0</option>
          </Select>
        </Field>
        <Field label="Auto-update">
          <Select defaultValue="Patch releases only">
            <option>All updates</option><option>Patch releases only</option><option>Manual</option>
          </Select>
        </Field>
      </div>
    </Card>
    <Card title="Features">
      <Toggle checked={true} onChange={() => {}} label="Consent management" desc="Handle user consent workflows via the PDC."/>
      <Toggle checked={true} onChange={() => {}} label="Audit logging" desc="Stream every exchange to the audit log."/>
      <Toggle checked={false} onChange={() => {}} label="Local data caching" desc="Cache frequent datasets to reduce latency."/>
      <Toggle checked={false} onChange={() => {}} label="Experimental: federated query" desc="Enable cross-connector federated queries."/>
    </Card>
  </>
);

// ─── AUTHENTICATION ─────────────────────────────────────────────────────────
const AuthSection = () => {
  const [pw, setPw] = useState({ old: "", neu: "", confirm: "" });
  const [tfa, setTfa] = useState(false);
  return (
    <>
      <SectionHeader title="Authentication" desc="Manage your password, two-factor authentication and active sessions."/>
      <Card title="Change password" desc="At least 8 characters with upper & lower case, a number and a special character.">
        <Field label="Current password"><PasswordField value={pw.old} onChange={e => setPw({...pw, old: e.target.value})}/></Field>
        <div className="grid-2">
          <Field label="New password"><PasswordField value={pw.neu} onChange={e => setPw({...pw, neu: e.target.value})}/></Field>
          <Field label="Confirm new password"><PasswordField value={pw.confirm} onChange={e => setPw({...pw, confirm: e.target.value})}/></Field>
        </div>
        <PasswordStrength value={pw.neu}/>
      </Card>
      <Card title="Two-factor authentication" desc="Add an extra layer of security using an authenticator app.">
        <Toggle checked={tfa} onChange={setTfa} label="Authenticator app (TOTP)" desc="Use Google Authenticator, 1Password, Authy, etc."/>
        <Toggle checked={false} onChange={() => {}} label="Security key (WebAuthn)" desc="YubiKey or platform authenticator."/>
        <Toggle checked={false} onChange={() => {}} label="SMS backup code" desc="Receive a backup code by SMS if you lose your device."/>
      </Card>
      <Card title="Active sessions" desc="Devices currently signed in to your account.">
        <div className="session-list">
          {[
            { d: "MacBook Pro · Chrome", l: "Paris, FR · current", current: true },
            { d: "iPhone 15 · Safari",   l: "Paris, FR · 2 hours ago" },
            { d: "Linux · Firefox",      l: "Berlin, DE · 4 days ago" },
          ].map((s, i) => (
            <div key={i} className="session-row">
              <div>
                <div className="session-device">{s.d}</div>
                <div className="muted">{s.l}</div>
              </div>
              {s.current ? <Pill tone="success">This device</Pill> : <Btn variant="ghost">Revoke</Btn>}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
};
const PasswordStrength = ({ value }) => {
  const score = (() => {
    let s = 0;
    if (value.length >= 8) s++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) s++;
    if (/\d/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return s;
  })();
  const labels = ["Too short", "Weak", "Okay", "Good", "Strong"];
  return (
    <div className="pw-strength">
      <div className="pw-bars">
        {[0,1,2,3].map(i => <div key={i} className={`pw-bar ${i < score ? "filled s" + score : ""}`}/>)}
      </div>
      <span className="muted">{value ? labels[score] : ""}</span>
    </div>
  );
};

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
const NotificationsSection = () => {
  const [n, setN] = useState({
    exchange_email: true, exchange_inapp: true,
    contract_email: true, contract_inapp: true,
    billing_email: true, billing_inapp: false,
    security_email: true, security_inapp: true,
    product_email: false, product_inapp: true,
  });
  const set = (k, v) => setN(s => ({ ...s, [k]: v }));
  const rows = [
    ["exchange", "Data exchanges",     "When a new exchange request arrives or completes"],
    ["contract", "Contract updates",   "Contract signature, expiry and version changes"],
    ["billing",  "Billing",            "Invoices, payment failures, plan changes"],
    ["security", "Security alerts",    "Sign-ins from new devices, password changes"],
    ["product",  "Product updates",    "Release notes, new features, occasional tips"],
  ];
  return (
    <>
      <SectionHeader title="Notifications" desc="Choose how you'd like to be notified about activity in your organisation."/>
      <Card>
        <div className="notif-head">
          <div></div><div>Email</div><div>In-app</div>
        </div>
        {rows.map(([k, label, desc]) => (
          <div className="notif-row" key={k}>
            <div>
              <div className="notif-label">{label}</div>
              <div className="muted">{desc}</div>
            </div>
            <div><MiniToggle checked={n[`${k}_email`]} onChange={v => set(`${k}_email`, v)}/></div>
            <div><MiniToggle checked={n[`${k}_inapp`]} onChange={v => set(`${k}_inapp`, v)}/></div>
          </div>
        ))}
      </Card>
      <Card title="Digest" desc="Group non-urgent notifications into a periodic digest.">
        <Field label="Frequency">
          <Select defaultValue="Daily, at 9:00 AM">
            <option>Real-time</option><option>Daily, at 9:00 AM</option><option>Weekly, Monday</option>
          </Select>
        </Field>
      </Card>
    </>
  );
};
const MiniToggle = ({ checked, onChange }) => (
  <button type="button" className={`toggle small ${checked ? "on" : ""}`} onClick={() => onChange(!checked)} aria-pressed={checked}>
    <span className="toggle-thumb"/>
  </button>
);

// ─── WEBHOOKS ───────────────────────────────────────────────────────────────
const WebhooksSection = () => (
  <>
    <SectionHeader
      title="Webhooks"
      desc="Forward exchange and contract events to your own services."
      action={<Btn icon="plus">Add endpoint</Btn>}
    />
    <Card>
      <div className="table">
        <div className="table-head">
          <div>URL</div><div>Events</div><div>Last delivery</div><div>Status</div><div></div>
        </div>
        {[
          { url: "https://api.anthony-dp.eu/hooks/exchange", events: "5 events", last: "2 min ago", status: "ok" },
          { url: "https://logs.anthony-dp.eu/v1/ingest",     events: "All events", last: "14 min ago", status: "ok" },
          { url: "https://staging.anthony-dp.eu/hook",       events: "Contract events", last: "3 hours ago", status: "fail" },
        ].map((w, i) => (
          <div className="table-row" key={i}>
            <div className="mono ellipsis">{w.url}</div>
            <div className="muted">{w.events}</div>
            <div className="muted">{w.last}</div>
            <div>{w.status === "ok"
              ? <Pill tone="success">Healthy</Pill>
              : <Pill tone="danger">Failing</Pill>}</div>
            <div className="row-actions">
              <button className="icon-btn ghost"><Icon name="external" size={14}/></button>
              <button className="icon-btn ghost"><Icon name="x" size={14}/></button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  </>
);

// ─── PREFERENCES ────────────────────────────────────────────────────────────
const PreferencesSection = () => (
  <>
    <SectionHeader title="Preferences" desc="Personal preferences for how the VisionsTrust app looks and behaves."/>
    <Card title="Display">
      <div className="grid-2">
        <Field label="Language"><Select defaultValue="English (US)"><option>English (US)</option><option>Français</option><option>Deutsch</option><option>Español</option></Select></Field>
        <Field label="Timezone"><Select defaultValue="Europe/Paris (UTC+1)"><option>Europe/Paris (UTC+1)</option><option>Europe/London (UTC+0)</option><option>America/New_York (UTC-5)</option></Select></Field>
        <Field label="Date format"><Select defaultValue="DD / MM / YYYY"><option>DD / MM / YYYY</option><option>MM / DD / YYYY</option><option>YYYY-MM-DD</option></Select></Field>
        <Field label="Theme"><Select defaultValue="System"><option>Light</option><option>Dark</option><option>System</option></Select></Field>
      </div>
    </Card>
    <Card title="App behaviour">
      <Toggle checked={true} onChange={() => {}} label="Show keyboard shortcuts hints" desc="Display ⌘K and other shortcuts in the UI."/>
      <Toggle checked={false} onChange={() => {}} label="Reduce motion" desc="Minimise animations and transitions."/>
      <Toggle checked={true} onChange={() => {}} label="Compact tables" desc="Reduce row padding in catalogue and contract lists."/>
    </Card>
  </>
);

// ─── AUDIT LOGS ─────────────────────────────────────────────────────────────
const LogsSection = () => {
  const [filter, setFilter] = useState("all");
  const all = [
    { t: "14:32", actor: "anthony@visionspol.eu", action: "Created offer 'Mobility dataset v3'", type: "offer" },
    { t: "13:18", actor: "anthony+1@visionspol.eu", action: "Updated endpoint 'consent' URL", type: "config" },
    { t: "12:04", actor: "system", action: "Webhook https://staging…/hook failed (502)", type: "security" },
    { t: "11:47", actor: "anthony@visionspol.eu", action: "Signed contract CT-2026-0418", type: "contract" },
    { t: "09:11", actor: "anthony@visionspol.eu", action: "Signed in from new device (MacBook)", type: "security" },
    { t: "08:50", actor: "dev@visionspol.eu", action: "Invitation accepted", type: "team" },
  ];
  const tones = { offer: "primary", config: "default", security: "danger", contract: "success", team: "warn" };
  const filtered = filter === "all" ? all : all.filter(a => a.type === filter);
  return (
    <>
      <SectionHeader
        title="Audit logs"
        desc="Every administrative action across your organisation. Retained for 90 days on Growth plan."
        action={<Btn variant="ghost" icon="download">Export CSV</Btn>}
      />
      <div className="log-filters">
        {["all","offer","config","contract","security","team"].map(f => (
          <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All events" : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <Card>
        <div className="log-list">
          {filtered.map((e, i) => (
            <div className="log-row" key={i}>
              <div className="log-time mono">Today · {e.t}</div>
              <div className="log-action">{e.action}</div>
              <div className="log-actor muted">{e.actor}</div>
              <div><Pill tone={tones[e.type]}>{e.type}</Pill></div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
};

// ─── DANGER ZONE ────────────────────────────────────────────────────────────
const DangerSection = () => (
  <>
    <SectionHeader title="Danger zone" desc="Irreversible operations on your organisation. Proceed with care."/>
    <Card title="Transfer ownership" desc="Hand over the organisation to another admin. You will become an Admin.">
      <div className="danger-row">
        <Field label="New owner"><Select defaultValue="Select an admin…"><option>Select an admin…</option><option>anthony+1@visionspol.eu</option></Select></Field>
        <Btn variant="ghost">Transfer ownership</Btn>
      </div>
    </Card>
    <Card title="Archive organisation" desc="The organisation will be hidden from the catalogue. Active contracts remain enforceable.">
      <div className="danger-row">
        <p className="muted">You can restore an archived organisation within 30 days.</p>
        <Btn variant="ghost">Archive organisation</Btn>
      </div>
    </Card>
    <Card danger title="Delete organisation" desc="Permanently delete this organisation and all related data, offers and history. This cannot be undone.">
      <div className="danger-row">
        <p>Type the organisation name to confirm: <code>anthony_data_provider</code></p>
        <Btn variant="danger">Delete organisation</Btn>
      </div>
    </Card>
  </>
);

// ─── ACCEPTANCE BASELINE ────────────────────────────────────────────────────
// The buyer's minimum requirements. Configured here, recalled & enforced in the
// basket (offers below these thresholds are flagged as gaps to negotiate).
const SEC_TITLE = { sla: "Service levels (SLA)", duration: "Duration & renewal", termination: "Termination" };
const BaselineSection = () => {
  const { USER_BASELINE } = window.BasketData;
  const { ALL_FIELDS, AVAILABILITY } = window.OfferSettingsData;
  const FIELD = React.useMemo(() => Object.fromEntries(ALL_FIELDS.map(f => [f.id, f])), []);
  const [base, setBase] = useState(() => JSON.parse(JSON.stringify(USER_BASELINE)));
  const [enabled, setEnabled] = useState(true);

  const groups = {};
  Object.keys(base).forEach(id => { const s = (FIELD[id] && FIELD[id].section) || "other"; (groups[s] = groups[s] || []).push(id); });

  const upd = (id, v) => setBase(p => ({ ...p, [id]: { ...p[id], v } }));

  const control = (id) => {
    const b = base[id], f = FIELD[id];
    if (b.op === "≤" || b.op === "≥") {
      const unit = (f.def && f.def.u) || (f.units && f.units[0]) || "";
      return (
        <div className="bl-ctl">
          <span className="bl-op">{b.op === "≤" ? "At most" : "At least"}</span>
          <input className="bl-num" type="number" value={b.v} onChange={e => upd(id, Number(e.target.value))}/>
          <span className="bl-unit">{unit}</span>
        </div>
      );
    }
    if (b.op === "≥tier") {
      return (
        <div className="bl-ctl">
          <span className="bl-op">At least</span>
          <select className="bl-sel" value={b.v} onChange={e => upd(id, e.target.value)}>{AVAILABILITY.map(o => <option key={o} value={o}>{o}</option>)}</select>
        </div>
      );
    }
    if (b.op === "=") {
      return (
        <div className="bl-seg">{["Yes", "No"].map(o => <button key={o} type="button" className={b.v === o ? "active" : ""} onClick={() => upd(id, o)}>{o}</button>)}</div>
      );
    }
    // "in" / "includesAll" — pick the accepted set from the field's options
    return (
      <div className="bl-chips">
        {f.options.map(o => { const on = b.v.includes(o); return <button key={o} type="button" className={`bl-chip ${on ? "on" : ""}`} onClick={() => upd(id, on ? b.v.filter(x => x !== o) : [...b.v, o])}>{o}</button>; })}
      </div>
    );
  };

  const label = { in: "Accepted values", includesAll: "Must include" };

  return (
    <>
      <SectionHeader title="Acceptance baseline" desc="Your minimum requirements for the offers you consume. Recalled and enforced in your basket."/>
      <Card>
        <Toggle checked={enabled} onChange={setEnabled} label="Apply my baseline when reviewing offers" desc="When on, offers in your basket are checked against these thresholds and any shortfall is flagged as a gap to negotiate."/>
        <p className="bl-lead">These settings drive the “gaps vs. your baseline” shown in the <a href="Basket.html">basket</a>. The provider never sees your baseline — it only guides what you negotiate.</p>
      </Card>
      {["sla", "duration", "termination"].filter(s => groups[s]).map(s => (
        <Card key={s} title={SEC_TITLE[s] || s} desc={enabled ? undefined : "Baseline enforcement is off — edits are saved but not applied."}>
          <div className={`bl-list ${enabled ? "" : "bl-off"}`}>
            {groups[s].map(id => (
              <div className="bl-row" key={id}>
                <div className="bl-row-main">
                  <div className="bl-row-label">{FIELD[id] ? FIELD[id].label : id}
                    {FIELD[id] && FIELD[id].meaning && <span className="bl-info" title={FIELD[id].meaning}><Icon name="info" size={13}/></span>}
                  </div>
                  {label[base[id].op] && <div className="bl-row-hint">{label[base[id].op]}</div>}
                </div>
                {control(id)}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
};

window.Sections = {
  account: AccountSection,
  baseline: BaselineSection,
  visibility: VisibilitySection,
  team: TeamSection,
  billing: BillingSection,
  endpoints: EndpointsSection,
  api: ApiSection,
  pdc: PdcSection,
  webhooks: WebhooksSection,
  authentication: AuthSection,
  notifications: NotificationsSection,
  preferences: PreferencesSection,
  logs: LogsSection,
  danger: DangerSection,
};
})();
