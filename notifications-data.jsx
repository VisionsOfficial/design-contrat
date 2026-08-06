// VisionsTrust — Notification Center data + type metadata
(function () {
  // Fixed "now" so relative grouping is deterministic in the demo.
  const NOW = new Date("2026-07-17T09:30:00");

  // ─── TYPE METADATA ──────────────────────────────────────────────────────
  // Each type carries its own icon, colour token class, human category label,
  // and whether it is actionable. This is what kills the "everything looks the
  // same" problem — every category reads differently at a glance.
  const TYPE_META = {
    contract_sign: {
      cls: "nt-contract", icon: "signature", label: "Contract",
      actionable: true, priority: 2,
      primary: { label: "View & sign", icon: "pen" },
      secondary: { label: "Later" },
      href: "My Contracts.html",
    },
    join_request: {
      cls: "nt-join", icon: "team", label: "Join request",
      actionable: true, priority: 1,
      primary: { label: "Review request", icon: "arrowRight" },
      secondary: { label: "Decline" },
      href: "My Projects.html",
    },
    usage_request: {
      cls: "nt-usage", icon: "layers", label: "Usage request",
      actionable: true, priority: 1,
      primary: { label: "Review", icon: "arrowRight" },
      secondary: { label: "Dismiss" },
      href: "My Offers.html",
    },
    invitation: {
      cls: "nt-invite", icon: "inbox", label: "Invitation",
      actionable: true, priority: 1,
      primary: { label: "Accept", icon: "check" },
      secondary: { label: "Decline" },
      href: "My Projects.html",
    },
    offer_published: {
      cls: "nt-offer", icon: "sparkle", label: "Published",
      actionable: false, priority: 0,
      primary: { label: "View offer", icon: "external" },
      href: "My Offers.html",
    },
  };

  const CATEGORIES = [
    { id: "all",            label: "All",            icon: "bell" },
    { id: "needs",          label: "Needs action",   icon: "hourglass" },
    { id: "contract_sign",  label: "Contracts",      icon: "signature" },
    { id: "usage_request",  label: "Usage requests", icon: "layers" },
    { id: "join_request",   label: "Join requests",  icon: "team" },
    { id: "invitation",     label: "Invitations",    icon: "inbox" },
    { id: "offer_published",label: "Publications",   icon: "sparkle" },
  ];

  const d = (iso) => new Date(iso).toISOString();

  // ─── SAMPLE NOTIFICATIONS ───────────────────────────────────────────────
  const NOTIFS = [
    {
      id: "n1", type: "contract_sign", read: false,
      actor: "ServiceProvider",
      title: "ServiceProvider wants to use your infrastructure service",
      body: "In the use case delete_dsuc. Review the terms and validate your contract to start the exchange.",
      context: { kind: "use case", name: "delete_dsuc" },
      date: d("2026-07-16T14:12:00"),
    },
    {
      id: "n2", type: "usage_request", read: false,
      actor: "Acme Analytics",
      title: "Usage of Skills analytics requested",
      body: "For a new use case. Approve to let them consume this offering.",
      context: { kind: "offer", name: "Skills analytics" },
      date: d("2026-07-17T08:05:00"),
    },
    {
      id: "n3", type: "join_request", read: false,
      actor: "ServiceProvider",
      title: "ServiceProvider asked to join your data space use case",
      body: "They would like to participate as a data consumer.",
      context: { kind: "use case", name: "Mobility insights" },
      date: d("2026-07-17T07:40:00"),
    },
    {
      id: "n4", type: "invitation", read: false,
      actor: "demo_casa",
      title: "You’ve been invited to join demo_casa",
      body: "As a participant. Accept to gain access to the shared catalogue.",
      context: { kind: "data space", name: "demo_casa" },
      date: d("2026-07-15T16:20:00"),
    },
    {
      id: "n5", type: "usage_request", read: true,
      actor: "GreenGrid Coop",
      title: "Usage of Energy dataset requested",
      body: "For the use case Grid balancing 2026.",
      context: { kind: "offer", name: "Energy dataset" },
      date: d("2026-07-14T11:00:00"),
    },
    {
      id: "n6", type: "offer_published", read: false,
      actor: "VisionsTrust",
      title: "Your offer Skills analytics is now published",
      body: "Discover the projects that need it and start collaborating.",
      context: { kind: "offer", name: "Skills analytics" },
      date: d("2026-07-13T09:30:00"),
    },
    {
      id: "n7", type: "offer_published", read: true,
      actor: "VisionsTrust",
      title: "Your offer data_offer_2 is now published",
      body: "Discover the projects that need it and start collaborating.",
      context: { kind: "offer", name: "data_offer_2" },
      date: d("2026-07-11T15:45:00"),
    },
    {
      id: "n8", type: "usage_request", read: true,
      actor: "Nordic Data Hub",
      title: "Usage of your offering requested",
      body: "For an use case that consumes your published resources.",
      context: { kind: "offer", name: "DATA_DEMO_PROVIDER_2" },
      date: d("2026-07-09T10:15:00"),
    },
    {
      id: "n9", type: "join_request", read: true,
      actor: "Helios Mobility",
      title: "Helios Mobility asked to join your use case",
      body: "They would like to contribute an infrastructure service.",
      context: { kind: "use case", name: "delete_dsuc" },
      date: d("2026-07-02T13:05:00"),
    },
    {
      id: "n10", type: "offer_published", read: true,
      actor: "VisionsTrust",
      title: "Your offer DATA_DEMO_DATA_PROVIDER_2 is now published",
      body: "Discover the projects that need it and start collaborating.",
      context: { kind: "offer", name: "DATA_DEMO_DATA_PROVIDER_2" },
      date: d("2026-06-24T08:50:00"),
    },
    {
      id: "n11", type: "usage_request", read: true,
      actor: "Atlas Registry",
      title: "Usage of your offering requested",
      body: "For an use case has been requested.",
      context: { kind: "offer", name: "Company registry" },
      date: d("2026-06-12T17:30:00"),
    },
    {
      id: "n12", type: "invitation", read: true,
      actor: "eu_dataspace",
      title: "You’ve been invited to join eu_dataspace",
      body: "As an observer of the federated catalogue.",
      context: { kind: "data space", name: "eu_dataspace" },
      date: d("2026-05-30T12:00:00"),
    },
    {
      id: "n13", type: "usage_request", read: true,
      actor: "ServiceProvider",
      title: "Usage of your offering requested",
      body: "For an use case has been requested.",
      context: { kind: "offer", name: "Skills analytics" },
      date: d("2026-05-08T09:20:00"),
    },
    {
      id: "n14", type: "offer_published", read: true,
      actor: "VisionsTrust",
      title: "Your offer Mobility feed is now published",
      body: "Discover the projects that need it and start collaborating.",
      context: { kind: "offer", name: "Mobility feed" },
      date: d("2026-04-18T14:00:00"),
    },
  ];

  window.NotifData = { NOW, TYPE_META, CATEGORIES, NOTIFS };
})();
