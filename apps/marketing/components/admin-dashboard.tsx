"use client";

import { useEffect, useRef, useState } from "react";

export type LeadStage = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "BOOKED";

export interface AdminLeadItem {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  ceremonySlug: string;
  ceremonyLabel: string;
  eventDate: string;
  guests: number;
  venueArea: string;
  estimatedValueCents: number;
  stage: LeadStage;
  notes: string;
  experienceMode: "CELEBRATION" | "MEMORIAL";
}

export interface ActiveEventRunSheet {
  id: string;
  title: string;
  category: string;
  date: string;
  venue: string;
  coordinator: string;
  rsvpConfirmed: number;
  rsvpInvited: number;
  tablesRequired: number;
  dietarySummaryMasked: string;
  dietarySummaryRevealed: string;
  checklistProgress: number;
  totalIncGstCents: number;
  depositPaid: boolean;
  mode: "CELEBRATION" | "MEMORIAL";
}

export interface PerthPartnerVendor {
  id: string;
  businessName: string;
  category: string;
  suburb: string;
  abn: string;
  abnVerified: boolean;
  pliInsuranceExpiry: string;
  complianceStatus: "VERIFIED" | "EXPIRING_SOON" | "PENDING";
  rating: string;
}

const INITIAL_LEADS: AdminLeadItem[] = [
  {
    id: "ld_0196a8f1",
    createdAt: "Today, 09:40 AWST",
    name: "Olivia & Liam Henderson",
    email: "olivia.h@example.com.au",
    phone: "0412 889 301",
    ceremonySlug: "wedding",
    ceremonyLabel: "Wedding & Reception (0 to 100)",
    eventDate: "2027-03-14",
    guests: 140,
    venueArea: "Swan Valley Winery",
    estimatedValueCents: 3450000,
    stage: "NEW",
    notes:
      "Full 0-to-100 Signature package: ceremony arch, reception styling, 3-course banquet catering, DJ, and digital invitations with QR passes.",
    experienceMode: "CELEBRATION",
  },
  {
    id: "ld_0196a8b4",
    createdAt: "Today, 08:15 AWST",
    name: "Wesfarmers Corporate Events Team",
    email: "events@corporate-wa.example.com",
    phone: "0408 512 900",
    ceremonySlug: "gala-dinner",
    ceremonyLabel: "Corporate End-of-Year Gala",
    eventDate: "2026-12-04",
    guests: 260,
    venueArea: "Perth CBD Riverfront",
    estimatedValueCents: 5800000,
    stage: "PROPOSAL_SENT",
    notes:
      "Luxe tier gala: stage & AV production, 26 banquet rounds, live band, custom brand signage, and door kiosk check-in.",
    experienceMode: "CELEBRATION",
  },
  {
    id: "ld_0196a7c2",
    createdAt: "Yesterday, 16:20 AWST",
    name: "Parisa & Kian Rahimi",
    email: "parisa.kian@example.com.au",
    phone: "0433 701 445",
    ceremonySlug: "sofreh-aghd",
    ceremonyLabel: "Sofreh Aghd & Wedding Reception",
    eventDate: "2027-04-10",
    guests: 180,
    venueArea: "Matilda Bay & South Perth",
    estimatedValueCents: 4120000,
    stage: "QUALIFIED",
    notes:
      "Traditional Sofreh Aghd styling on the foreshore followed by Halal banquet reception, Persian sweets table, and bilingual digital invitations.",
    experienceMode: "CELEBRATION",
  },
  {
    id: "ld_0196a6d9",
    createdAt: "Yesterday, 11:05 AWST",
    name: "Marcus Vance",
    email: "m.vance@example.com.au",
    phone: "0421 334 812",
    ceremonySlug: "birthday-milestone",
    ceremonyLabel: "40th Milestone Birthday Party",
    eventDate: "2026-11-28",
    guests: 85,
    venueArea: "Fremantle Heritage Hall",
    estimatedValueCents: 1480000,
    stage: "BOOKED",
    notes:
      "Cocktail grazing styling, custom neon & arch backdrop, bartender RSA crew, DJ, and WhatsApp RSVP invitations.",
    experienceMode: "CELEBRATION",
  },
  {
    id: "ld_0196a5e0",
    createdAt: "2 days ago",
    name: "The Morrison Family",
    email: "sarah.morrison@example.com.au",
    phone: "0401 992 118",
    ceremonySlug: "celebration-of-life",
    ceremonyLabel: "Celebration of Life Gathering",
    eventDate: "2026-11-19",
    guests: 95,
    venueArea: "Kings Park Pavilion",
    estimatedValueCents: 890000,
    stage: "BOOKED",
    notes:
      "Memorial Mode coordination: morning tea & wake catering, framed tribute display, acoustic strings, and complimentary digital tribute book.",
    experienceMode: "MEMORIAL",
  },
];

const INITIAL_EVENTS: ActiveEventRunSheet[] = [
  {
    id: "evt_perth_01",
    title: "Marcus Vance — 40th Milestone Celebration",
    category: "Milestone Birthday",
    date: "28 Nov 2026 · 18:30 AWST",
    venue: "Fremantle Heritage Warehouse",
    coordinator: "Sadra T.",
    rsvpConfirmed: 78,
    rsvpInvited: 85,
    tablesRequired: 8,
    dietarySummaryMasked: "14 Halal · 6 Vegan · 4 Gluten-Free · [2 Severe Allergy Notes Masked 🔒]",
    dietarySummaryRevealed:
      "14 Halal · 6 Vegan · 4 Gluten-Free · Allergy Alert: Guest #14 (Anaphylactic Peanut), Guest #42 (Celiac strict cross-contamination)",
    checklistProgress: 88,
    totalIncGstCents: 1480000,
    depositPaid: true,
    mode: "CELEBRATION",
  },
  {
    id: "evt_perth_02",
    title: "Morrison Family — Celebration of Life",
    category: "Memorial Gathering",
    date: "19 Nov 2026 · 10:30 AWST",
    venue: "Kings Park Botanical Pavilion",
    coordinator: "Sadra T.",
    rsvpConfirmed: 92,
    rsvpInvited: 95,
    tablesRequired: 10,
    dietarySummaryMasked: "8 Vegetarian · 5 Gluten-Free · [1 Allergy Note Masked 🔒]",
    dietarySummaryRevealed:
      "8 Vegetarian · 5 Gluten-Free · Allergy Alert: Guest #09 (Dairy intolerance)",
    checklistProgress: 95,
    totalIncGstCents: 890000,
    depositPaid: true,
    mode: "MEMORIAL",
  },
  {
    id: "evt_perth_03",
    title: "Niloofar & Sadra — 10th Anniversary Gala",
    category: "Anniversary & Cultural",
    date: "12 Dec 2026 · 18:00 AWST",
    venue: "Swan Valley Estate Conservatory",
    coordinator: "Sadra T.",
    rsvpConfirmed: 112,
    rsvpInvited: 120,
    tablesRequired: 12,
    dietarySummaryMasked: "45 Halal · 9 Vegetarian · [3 Allergy Notes Masked 🔒]",
    dietarySummaryRevealed:
      "45 Halal · 9 Vegetarian · Allergy Alert: 2 Tree-nut allergies (Table 4), 1 Shellfish allergy (Table 7)",
    checklistProgress: 75,
    totalIncGstCents: 2640000,
    depositPaid: true,
    mode: "CELEBRATION",
  },
];

const PERTH_PARTNERS: PerthPartnerVendor[] = [
  {
    id: "ven_01",
    businessName: "Swan Valley Banquet & Halal Catering Co.",
    category: "Catering & Hospitality",
    suburb: "Guildford / Swan Valley",
    abn: "51 824 753 556",
    abnVerified: true,
    pliInsuranceExpiry: "2027-08-15 ($20M PLI)",
    complianceStatus: "VERIFIED",
    rating: "4.9 ★ (38 Perth events)",
  },
  {
    id: "ven_02",
    businessName: "Atelier Botanica & Sofreh Styling Perth",
    category: "Styling, Arches & Florals",
    suburb: "Subiaco",
    abn: "33 109 482 119",
    abnVerified: true,
    pliInsuranceExpiry: "2027-05-30 ($20M PLI)",
    complianceStatus: "VERIFIED",
    rating: "5.0 ★ (52 Perth events)",
  },
  {
    id: "ven_03",
    businessName: "West Coast Marquee, Timber & Linen Hire",
    category: "Furniture & Marquee Hire",
    suburb: "Osborne Park",
    abn: "78 602 991 402",
    abnVerified: true,
    pliInsuranceExpiry: "2026-12-10 ($20M PLI)",
    complianceStatus: "EXPIRING_SOON",
    rating: "4.8 ★ (64 Perth events)",
  },
  {
    id: "ven_04",
    businessName: "Swan River Sound, Lighting & Event AV",
    category: "AV, Lighting & Production",
    suburb: "East Perth",
    abn: "19 445 810 227",
    abnVerified: true,
    pliInsuranceExpiry: "2027-09-01 ($20M PLI)",
    complianceStatus: "VERIFIED",
    rating: "4.9 ★ (41 Perth events)",
  },
];

function formatMoneyAud(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} AUD`;
}

function splitGst(incGstCents: number): { exGstCents: number; gstCents: number } {
  const gstCents = Math.round(incGstCents / 11);
  return { exGstCents: incGstCents - gstCents, gstCents };
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"leads" | "events" | "vendors" | "finance">("leads");
  const [leads, setLeads] = useState<AdminLeadItem[]>(INITIAL_LEADS);
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<AdminLeadItem | null>(null);
  const [revealedEvents, setRevealedEvents] = useState<Record<string, boolean>>({});
  const [auditEntries, setAuditEntries] = useState<string[]>([
    "14:10 AWST — System verified Sydney database session encryption (enc:v1).",
    "11:20 AWST — Proposal #PRP-2026-089 sent to Wesfarmers Corporate Events Team ($58,000 AUD incl. GST).",
    "09:40 AWST — New wedding enquiry received from Olivia & Liam Henderson (140 guests, Swan Valley).",
  ]);

  // Quick Add Lead state
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadCeremony, setNewLeadCeremony] = useState("wedding");
  const [newLeadGuests, setNewLeadGuests] = useState("100");
  const [newLeadValue, setNewLeadValue] = useState("18500");

  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Fallback for browsers without native <dialog closedby="any"> support (modern-web-guidance: light-dismiss-a-dialog)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener("click", handleBackdropClick);
      return () => dialog.removeEventListener("click", handleBackdropClick);
    }
    return undefined;
  }, []);

  const openLeadModal = (lead: AdminLeadItem) => {
    setSelectedLead(lead);
    dialogRef.current?.showModal();
  };

  const updateLeadStage = (leadId: string, nextStage: LeadStage) => {
    setLeads((prev) =>
      prev.map((item) => (item.id === leadId ? { ...item, stage: nextStage } : item)),
    );
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, stage: nextStage } : null));
    }
    setAuditEntries((prev) => [
      `Just now — Lead ${leadId} stage updated to ${nextStage} by Planner Staff.`,
      ...prev,
    ]);
  };

  const toggleDietaryReveal = (eventId: string) => {
    const willReveal = !revealedEvents[eventId];
    setRevealedEvents((prev) => ({ ...prev, [eventId]: willReveal }));
    if (willReveal) {
      setAuditEntries((prev) => [
        `Just now — [AUDIT] Encrypted dietary & allergy health fields decrypted for event ${eventId} by Sadra T.`,
        ...prev,
      ]);
    }
  };

  const handleQuickAddLead = () => {
    if (!newLeadName.trim() || !newLeadEmail.trim()) return;
    const isMemorial = newLeadCeremony === "celebration-of-life";
    const ceremonyMap: Record<string, string> = {
      wedding: "Wedding & Reception",
      "birthday-milestone": "Milestone Birthday Party",
      "gala-dinner": "Corporate Gala / Brand Event",
      "sofreh-aghd": "Sofreh Aghd & Cultural Ceremony",
      "celebration-of-life": "Celebration of Life Gathering",
    };
    const created: AdminLeadItem = {
      id: `ld_${Math.random().toString(16).slice(2, 10)}`,
      createdAt: "Just now",
      name: newLeadName.trim(),
      email: newLeadEmail.trim(),
      phone: "0400 000 000",
      ceremonySlug: newLeadCeremony,
      ceremonyLabel: ceremonyMap[newLeadCeremony] ?? "Custom Event",
      eventDate: "2027-02-20",
      guests: Number(newLeadGuests) || 80,
      venueArea: "Perth Metro",
      estimatedValueCents: (Number(newLeadValue) || 10000) * 100,
      stage: "NEW",
      notes: "Added directly via Planner Command Centre phone/walk-in intake.",
      experienceMode: isMemorial ? "MEMORIAL" : "CELEBRATION",
    };
    setLeads((prev) => [created, ...prev]);
    setAuditEntries((prev) => [
      `Just now — Created new manual lead ${created.id} (${created.name}).`,
      ...prev,
    ]);
    setNewLeadName("");
    setNewLeadEmail("");
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesStage = stageFilter === "ALL" || lead.stage === stageFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      lead.name.toLowerCase().includes(q) ||
      lead.ceremonyLabel.toLowerCase().includes(q) ||
      lead.venueArea.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q);
    return matchesStage && matchesQuery;
  });

  const totalPipelineCents = leads.reduce((acc, item) => acc + item.estimatedValueCents, 0);
  const bookedRevenueCents = leads
    .filter((item) => item.stage === "BOOKED")
    .reduce((acc, item) => acc + item.estimatedValueCents, 0);
  const bookedGst = splitGst(bookedRevenueCents);

  return (
    <div className="admin-shell">
      <div className="admin-banner">
        <div>
          <span className="admin-badge">STAFF COMMAND CENTRE · PERTH WA (AP-SOUTHEAST-2)</span>
          <h1>Managevent Admin & Planner Command Centre</h1>
          <p>
            End-to-end CRM lead pipeline, 0-to-100 event run-sheets, RSVP-to-catering bridge, Perth
            partner compliance, and ATO GST ledger.
          </p>
        </div>
        <div className="admin-quick-links">
          <a href="/" className="button button-secondary">
            View Public Website
          </a>
          <a href="#quick-intake" className="button">
            + Log Phone / Walk-In Enquiry
          </a>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <section className="admin-kpis" aria-label="Executive metrics">
        <article className="admin-kpi-card">
          <span>Active Enquiries & Leads</span>
          <strong dir="ltr">{leads.length}</strong>
          <small>{leads.filter((l) => l.stage === "NEW").length} awaiting first response</small>
        </article>
        <article className="admin-kpi-card">
          <span>Total Pipeline Value (incl. GST)</span>
          <strong dir="ltr">{formatMoneyAud(totalPipelineCents)}</strong>
          <small>Across Perth Metro & Swan Valley</small>
        </article>
        <article className="admin-kpi-card">
          <span>Confirmed Booked Value</span>
          <strong dir="ltr">{formatMoneyAud(bookedRevenueCents)}</strong>
          <small dir="ltr">Includes {formatMoneyAud(bookedGst.gstCents)} GST (10%)</small>
        </article>
        <article className="admin-kpi-card">
          <span>Live Guests on RSVP Bridge</span>
          <strong dir="ltr">282 / 300</strong>
          <small>94% response rate across 3 active events</small>
        </article>
      </section>

      {/* Navigation Tabs (modern-web-guidance: tabs pattern with non-color underline) */}
      <div className="admin-tabs-bar" role="tablist" aria-label="Admin workspace sections">
        <button
          type="button"
          role="tab"
          id="tab-leads"
          aria-selected={activeTab === "leads"}
          onClick={() => setActiveTab("leads")}
          className="admin-tab"
        >
          1. CRM Lead Pipeline ({leads.length})
        </button>
        <button
          type="button"
          role="tab"
          id="tab-events"
          aria-selected={activeTab === "events"}
          onClick={() => setActiveTab("events")}
          className="admin-tab"
        >
          2. Active Events & Run-Sheets ({INITIAL_EVENTS.length})
        </button>
        <button
          type="button"
          role="tab"
          id="tab-vendors"
          aria-selected={activeTab === "vendors"}
          onClick={() => setActiveTab("vendors")}
          className="admin-tab"
        >
          3. Perth Venues & Partners ({PERTH_PARTNERS.length})
        </button>
        <button
          type="button"
          role="tab"
          id="tab-finance"
          aria-selected={activeTab === "finance"}
          onClick={() => setActiveTab("finance")}
          className="admin-tab"
        >
          4. Finance, GST & Audit Log
        </button>
      </div>

      {/* TAB 1: CRM LEAD PIPELINE */}
      <div role="tabpanel" aria-labelledby="tab-leads" hidden={activeTab !== "leads"}>
        <div className="admin-panel-inner">
          <div className="admin-toolbar">
            <div className="admin-search-box">
              <label htmlFor="admin-lead-search">
                Search leads by host, occasion, or Perth area
              </label>
              <input
                id="admin-lead-search"
                type="search"
                placeholder="e.g. Swan Valley, Wedding, Corporate, Olivia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="admin-filter-box">
              <label htmlFor="admin-stage-filter">Filter by pipeline stage</label>
              <select
                id="admin-stage-filter"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
              >
                <option value="ALL">All stages ({leads.length})</option>
                <option value="NEW">New Enquiry</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="PROPOSAL_SENT">Proposal Sent</option>
                <option value="BOOKED">Booked & Confirmed</option>
              </select>
            </div>
          </div>

          {/* Responsive Table (modern-web-guidance: responsive-table) */}
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="crm-leads-caption"
            className="table-wrapper"
          >
            <table className="admin-table">
              <caption id="crm-leads-caption" className="sr-caption">
                Perth Event Enquiries and CRM Pipeline
              </caption>
              <thead>
                <tr>
                  <th scope="col">Client / Host</th>
                  <th scope="col">Occasion & Mode</th>
                  <th scope="col">Date & Perth Area</th>
                  <th scope="col">Guests</th>
                  <th scope="col">Est. Value (incl. GST)</th>
                  <th scope="col">Pipeline Stage</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <th scope="row">
                      <div className="cell-primary">{lead.name}</div>
                      <div className="cell-sub" dir="ltr">
                        {lead.email} · {lead.phone}
                      </div>
                    </th>
                    <td>
                      <div className="cell-primary">{lead.ceremonyLabel}</div>
                      <span
                        className={`mode-pill ${lead.experienceMode === "MEMORIAL" ? "mode-pill-memorial" : "mode-pill-celebration"}`}
                      >
                        {lead.experienceMode}
                      </span>
                    </td>
                    <td>
                      <div className="cell-primary" dir="ltr">
                        {lead.eventDate}
                      </div>
                      <div className="cell-sub">{lead.venueArea}</div>
                    </td>
                    <td dir="ltr">{lead.guests}</td>
                    <td dir="ltr">
                      <strong>{formatMoneyAud(lead.estimatedValueCents)}</strong>
                    </td>
                    <td>
                      <span className={`stage-badge stage-${lead.stage.toLowerCase()}`}>
                        {lead.stage.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="button button-small"
                          onClick={() => openLeadModal(lead)}
                        >
                          Inspect / Quote
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Phone / Walk-In Lead Intake */}
          <section
            id="quick-intake"
            className="admin-quick-intake"
            aria-labelledby="intake-heading"
          >
            <h2 id="intake-heading">Log Phone or Walk-In Perth Enquiry</h2>
            <div className="intake-grid">
              <div>
                <label htmlFor="intake-name">Host / Company Name</label>
                <input
                  id="intake-name"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="e.g. Chloe & Jack Thompson"
                />
              </div>
              <div>
                <label htmlFor="intake-email">Client Email</label>
                <input
                  id="intake-email"
                  type="email"
                  dir="ltr"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  placeholder="client@example.com.au"
                />
              </div>
              <div>
                <label htmlFor="intake-ceremony">Event Type</label>
                <select
                  id="intake-ceremony"
                  value={newLeadCeremony}
                  onChange={(e) => setNewLeadCeremony(e.target.value)}
                >
                  <option value="wedding">Wedding & Reception</option>
                  <option value="birthday-milestone">Milestone Birthday Party</option>
                  <option value="gala-dinner">Corporate Gala / Brand Event</option>
                  <option value="sofreh-aghd">Sofreh Aghd / Cultural Ceremony</option>
                  <option value="celebration-of-life">Celebration of Life (Memorial Mode)</option>
                </select>
              </div>
              <div>
                <label htmlFor="intake-guests">Guests</label>
                <input
                  id="intake-guests"
                  type="number"
                  dir="ltr"
                  value={newLeadGuests}
                  onChange={(e) => setNewLeadGuests(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="intake-value">Est. Budget ($ AUD)</label>
                <input
                  id="intake-value"
                  type="number"
                  dir="ltr"
                  value={newLeadValue}
                  onChange={(e) => setNewLeadValue(e.target.value)}
                />
              </div>
            </div>
            <button type="button" className="button" onClick={handleQuickAddLead}>
              Add to Perth CRM Pipeline
            </button>
          </section>
        </div>
      </div>

      {/* TAB 2: ACTIVE EVENTS & RUN-SHEETS */}
      <div role="tabpanel" aria-labelledby="tab-events" hidden={activeTab !== "events"}>
        <div className="admin-panel-inner">
          <h2>Booked Perth Events & Live RSVP-to-Catering Bridge</h2>
          <p className="admin-sub">
            Dietary and allergy health records are encrypted at rest in Sydney (`enc:v1`) and masked
            by default. Clicking reveal records an immutable staff audit log entry.
          </p>
          <div className="events-cards-grid">
            {INITIAL_EVENTS.map((evt) => {
              const isRevealed = Boolean(revealedEvents[evt.id]);
              return (
                <article
                  key={evt.id}
                  className="event-run-card"
                  data-experience-mode={evt.mode.toLowerCase()}
                >
                  <div className="event-run-header">
                    <div>
                      <span className="mode-pill">{evt.category}</span>
                      <h3>{evt.title}</h3>
                      <p className="cell-sub">
                        {evt.date} · {evt.venue} · Coordinator: {evt.coordinator}
                      </p>
                    </div>
                    <div className="event-run-price" dir="ltr">
                      <strong>{formatMoneyAud(evt.totalIncGstCents)}</strong>
                      <span>{evt.depositPaid ? "Deposit Paid ✓" : "Awaiting Deposit"}</span>
                    </div>
                  </div>

                  <div className="event-bridge-metrics">
                    <div>
                      <span>Live RSVPs Confirmed</span>
                      <strong dir="ltr">
                        {evt.rsvpConfirmed} / {evt.rsvpInvited} guests
                      </strong>
                    </div>
                    <div>
                      <span>Auto-Sized Banquet Tables</span>
                      <strong dir="ltr">{evt.tablesRequired} tables</strong>
                    </div>
                    <div>
                      <span>0-to-100 Run-Sheet Readiness</span>
                      <strong dir="ltr">{evt.checklistProgress}% complete</strong>
                    </div>
                  </div>

                  <div className="event-dietary-box">
                    <div>
                      <strong>Catering & Allergy Bridge Brief:</strong>
                      <p>{isRevealed ? evt.dietarySummaryRevealed : evt.dietarySummaryMasked}</p>
                    </div>
                    <button
                      type="button"
                      className="button button-small button-secondary"
                      onClick={() => toggleDietaryReveal(evt.id)}
                    >
                      {isRevealed ? "Mask Health Data" : "Reveal Allergy Notes (Audit Logged)"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB 3: PERTH VENUES & PARTNER COMPLIANCE */}
      <div role="tabpanel" aria-labelledby="tab-vendors" hidden={activeTab !== "vendors"}>
        <div className="admin-panel-inner">
          <h2>Perth Supplier & Venue Compliance Queue</h2>
          <p className="admin-sub">
            Every Managevent supplier in Western Australia is verified for an active 11-digit ABN,
            $20M Public Liability Insurance, and relevant WA RSA / Food Act registrations.
          </p>
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="partners-table-caption"
            className="table-wrapper"
          >
            <table className="admin-table">
              <caption id="partners-table-caption" className="sr-caption">
                Vetted Perth Partner Suppliers and Compliance Status
              </caption>
              <thead>
                <tr>
                  <th scope="col">Partner Business</th>
                  <th scope="col">Service Category</th>
                  <th scope="col">Perth Suburb</th>
                  <th scope="col">ABN (ATO Lookup)</th>
                  <th scope="col">Insurance & Licences</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {PERTH_PARTNERS.map((partner) => (
                  <tr key={partner.id}>
                    <th scope="row">
                      <div className="cell-primary">{partner.businessName}</div>
                      <div className="cell-sub">{partner.rating}</div>
                    </th>
                    <td>{partner.category}</td>
                    <td>{partner.suburb}</td>
                    <td dir="ltr">{partner.abn} ✓</td>
                    <td dir="ltr">{partner.pliInsuranceExpiry}</td>
                    <td>
                      <span
                        className={`stage-badge ${partner.complianceStatus === "VERIFIED" ? "stage-booked" : "stage-proposal_sent"}`}
                      >
                        {partner.complianceStatus.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TAB 4: FINANCE, GST & AUDIT LOG */}
      <div role="tabpanel" aria-labelledby="tab-finance" hidden={activeTab !== "finance"}>
        <div className="admin-panel-inner">
          <div className="finance-grid">
            <section className="finance-card" aria-labelledby="gst-heading">
              <h2 id="gst-heading">ATO Tax Invoice & GST Summary (AUD)</h2>
              <p className="admin-sub">
                All figures calculated in integer AUD cents (`@managevent/payments` 10% GST rules).
              </p>
              <dl className="finance-list">
                <div>
                  <dt>Confirmed Gross Bookings (incl. GST)</dt>
                  <dd dir="ltr">{formatMoneyAud(bookedRevenueCents)}</dd>
                </div>
                <div>
                  <dt>Net Revenue (ex. GST)</dt>
                  <dd dir="ltr">{formatMoneyAud(bookedGst.exGstCents)}</dd>
                </div>
                <div>
                  <dt>GST Collected for BAS (10%)</dt>
                  <dd dir="ltr">{formatMoneyAud(bookedGst.gstCents)}</dd>
                </div>
                <div>
                  <dt>Invitation Premium Event Passes ($69 AUD incl. GST)</dt>
                  <dd dir="ltr">$69.00 AUD / celebration · $0.00 AUD / memorial</dd>
                </div>
              </dl>
            </section>

            <section className="finance-card" aria-labelledby="audit-heading">
              <h2 id="audit-heading">Immutable Staff Audit Trail</h2>
              <p className="admin-sub">
                Every stage transition, proposal dispatch, and health data reveal is recorded.
              </p>
              <ul className="audit-list">
                {auditEntries.map((entry, idx) => (
                  <li key={idx}>{entry}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      {/* Native Light-Dismiss Dialog for Lead Inspection & Quote Generation */}
      <dialog
        ref={dialogRef}
        id="lead-inspector-dialog"
        {...({ closedby: "any" } as Record<string, string>)}
        aria-labelledby="dialog-lead-title"
        className="admin-dialog"
      >
        {selectedLead && (
          <div className="admin-dialog-body">
            <div className="admin-dialog-header">
              <div>
                <span className="mode-pill">{selectedLead.ceremonyLabel}</span>
                <h2 id="dialog-lead-title">{selectedLead.name}</h2>
              </div>
              <form method="dialog">
                <button type="submit" className="button button-small button-secondary">
                  Close (Esc)
                </button>
              </form>
            </div>

            <div className="admin-dialog-details">
              <p>
                <strong>Contact:</strong> <span dir="ltr">{selectedLead.email}</span> ·{" "}
                <span dir="ltr">{selectedLead.phone}</span>
              </p>
              <p>
                <strong>Event Date & Area:</strong> <span dir="ltr">{selectedLead.eventDate}</span>{" "}
                · {selectedLead.venueArea} ({selectedLead.guests} guests)
              </p>
              <p>
                <strong>Estimated Package Value:</strong>{" "}
                <span dir="ltr">{formatMoneyAud(selectedLead.estimatedValueCents)}</span> (incl.{" "}
                <span dir="ltr">
                  {formatMoneyAud(splitGst(selectedLead.estimatedValueCents).gstCents)}
                </span>{" "}
                GST)
              </p>
              <p>
                <strong>Scope & Notes:</strong> {selectedLead.notes}
              </p>
            </div>

            <div className="admin-dialog-stage-bar">
              <span>Update Pipeline Stage:</span>
              <div className="stage-buttons">
                {(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "BOOKED"] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      className={`button button-small ${selectedLead.stage === st ? "" : "button-secondary"}`}
                      onClick={() => updateLeadStage(selectedLead.id, st)}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
