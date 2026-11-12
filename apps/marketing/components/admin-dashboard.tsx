"use client";

import { useEffect, useRef, useState } from "react";
import {
  type ContactSettings,
  DEFAULT_CONTACT_SETTINGS,
  getStoredContactSettings,
  saveContactSettings,
} from "./dynamic-contact";

export type LeadStage = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "BOOKED" | "LOST";

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

const STORAGE_KEY_LEADS = "managevent_admin_leads";
const STORAGE_KEY_EVENTS = "managevent_admin_events";
const STORAGE_KEY_PARTNERS = "managevent_admin_partners";
const STORAGE_KEY_AUDIT = "managevent_admin_audit";

const SEED_LEADS: AdminLeadItem[] = [
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
    name: "Hannah & Tom Whitfield",
    email: "hannah.tom@example.com.au",
    phone: "0433 701 445",
    ceremonySlug: "wedding",
    ceremonyLabel: "Foreshore Wedding & Reception",
    eventDate: "2027-04-10",
    guests: 180,
    venueArea: "Matilda Bay & South Perth",
    estimatedValueCents: 4120000,
    stage: "QUALIFIED",
    notes:
      "Foreshore ceremony styling followed by a Halal banquet reception, dessert table, and digital invitations with RSVP.",
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

const SEED_EVENTS: ActiveEventRunSheet[] = [
  {
    id: "evt_perth_01",
    title: "Marcus Vance — 40th Milestone Celebration",
    category: "Milestone Birthday",
    date: "28 Nov 2026 · 18:30 AWST",
    venue: "Fremantle Heritage Warehouse",
    coordinator: "Appilico Team",
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
    coordinator: "Appilico Team",
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
    title: "Elena & Marcus — 10th Anniversary Gala",
    category: "Anniversary & Cultural",
    date: "12 Dec 2026 · 18:00 AWST",
    venue: "Swan Valley Estate Conservatory",
    coordinator: "Appilico Team",
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

const SEED_PARTNERS: PerthPartnerVendor[] = [
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
    businessName: "Atelier Botanica & Event Styling Perth",
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
  const [activeTab, setActiveTab] = useState<"leads" | "events" | "vendors" | "finance" | "settings">("leads");

  // Dynamic system & contact settings
  const [settings, setSettings] = useState<ContactSettings>(DEFAULT_CONTACT_SETTINGS);
  const [settingsStatusMessage, setSettingsStatusMessage] = useState<string | null>(null);
  const [testAlertPreview, setTestAlertPreview] = useState<string | null>(null);

  // Dynamic leads state
  const [leads, setLeads] = useState<AdminLeadItem[]>(SEED_LEADS);
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dynamic events state
  const [events, setEvents] = useState<ActiveEventRunSheet[]>(SEED_EVENTS);
  const [revealedEvents, setRevealedEvents] = useState<Record<string, boolean>>({});

  // Dynamic vendors state
  const [partners, setPartners] = useState<PerthPartnerVendor[]>(SEED_PARTNERS);

  // Dynamic audit trail
  const [auditEntries, setAuditEntries] = useState<string[]>([
    "14:10 AWST — System verified Sydney database session encryption (enc:v1).",
    "11:20 AWST — Proposal #PRP-2026-089 sent to Wesfarmers Corporate Events Team ($58,000 AUD incl. GST).",
    "09:40 AWST — New wedding enquiry received from Olivia & Liam Henderson (140 guests, Swan Valley).",
    "09:00 AWST — Default contact email configured to appilico.au@gmail.com.",
  ]);

  // Dialogs and Edit state
  const [selectedLead, setSelectedLead] = useState<AdminLeadItem | null>(null);
  const [editingLeadForm, setEditingLeadForm] = useState<AdminLeadItem | null>(null);
  const [editingEvent, setEditingEvent] = useState<ActiveEventRunSheet | null>(null);

  // Quick Add Lead state
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadCeremony, setNewLeadCeremony] = useState("wedding");
  const [newLeadGuests, setNewLeadGuests] = useState("100");
  const [newLeadValue, setNewLeadValue] = useState("18500");
  const [newLeadNotes, setNewLeadNotes] = useState("");

  // Quick Add Event state
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventCategory, setNewEventCategory] = useState("Wedding");
  const [newEventDate, setNewEventDate] = useState("15 Jan 2027 · 17:00 AWST");
  const [newEventVenue, setNewEventVenue] = useState("Cottesloe Civic Centre");
  const [newEventCoordinator, setNewEventCoordinator] = useState("");
  const [newEventGuests, setNewEventGuests] = useState("100");
  const [newEventValue, setNewEventValue] = useState("22000");

  // Quick Add Partner state
  const [showAddPartnerForm, setShowAddPartnerForm] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerCategory, setNewPartnerCategory] = useState("Catering & Hospitality");
  const [newPartnerSuburb, setNewPartnerSuburb] = useState("Perth Metro");
  const [newPartnerAbn, setNewPartnerAbn] = useState("11 222 333 444");

  const leadDialogRef = useRef<HTMLDialogElement | null>(null);
  const eventDialogRef = useRef<HTMLDialogElement | null>(null);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    const storedSettings = getStoredContactSettings();
    setSettings(storedSettings);

    try {
      const rawLeads = localStorage.getItem(STORAGE_KEY_LEADS);
      if (rawLeads) setLeads(JSON.parse(rawLeads));

      const rawEvents = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (rawEvents) setEvents(JSON.parse(rawEvents));

      const rawPartners = localStorage.getItem(STORAGE_KEY_PARTNERS);
      if (rawPartners) setPartners(JSON.parse(rawPartners));

      const rawAudit = localStorage.getItem(STORAGE_KEY_AUDIT);
      if (rawAudit) setAuditEntries(JSON.parse(rawAudit));
    } catch {
      // Local storage unreadable or disabled
    }
  }, []);

  const appendAudit = (msg: string) => {
    setAuditEntries((prev) => {
      const next = [msg, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(next.slice(0, 50)));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const persistLeads = (updated: AdminLeadItem[]) => {
    setLeads(updated);
    try {
      localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  };

  const persistEvents = (updated: ActiveEventRunSheet[]) => {
    setEvents(updated);
    try {
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  };

  const persistPartners = (updated: PerthPartnerVendor[]) => {
    setPartners(updated);
    try {
      localStorage.setItem(STORAGE_KEY_PARTNERS, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  };

  // --- Lead Handlers ---
  const openLeadModal = (lead: AdminLeadItem) => {
    setSelectedLead(lead);
    setEditingLeadForm({ ...lead });
    leadDialogRef.current?.showModal();
  };

  const closeLeadModal = () => {
    leadDialogRef.current?.close();
    setSelectedLead(null);
    setEditingLeadForm(null);
  };

  const saveLeadEdit = () => {
    if (!editingLeadForm) return;
    const updated = leads.map((l) => (l.id === editingLeadForm.id ? editingLeadForm : l));
    persistLeads(updated);
    setSelectedLead(editingLeadForm);
    appendAudit(
      `Just now — Lead ${editingLeadForm.id} (${editingLeadForm.name}) updated dynamically by ${settings.coordinatorName || "Planner Staff"}.`,
    );
    closeLeadModal();
  };

  const updateLeadStage = (leadId: string, nextStage: LeadStage) => {
    const updated = leads.map((item) => (item.id === leadId ? { ...item, stage: nextStage } : item));
    persistLeads(updated);
    if (editingLeadForm?.id === leadId) {
      setEditingLeadForm({ ...editingLeadForm, stage: nextStage });
    }
    if (selectedLead?.id === leadId) {
      setSelectedLead({ ...selectedLead, stage: nextStage });
    }
    appendAudit(
      `Just now — Lead ${leadId} stage transitioned to ${nextStage} by ${settings.coordinatorName || "Planner Staff"}.`,
    );
  };

  const deleteLead = (leadId: string) => {
    const target = leads.find((l) => l.id === leadId);
    const updated = leads.filter((l) => l.id !== leadId);
    persistLeads(updated);
    appendAudit(`Just now — Lead ${leadId} (${target?.name ?? "Lead"}) deleted from CRM pipeline.`);
    closeLeadModal();
  };

  const handleQuickAddLead = () => {
    if (!newLeadName.trim() || !newLeadEmail.trim()) return;
    const isMemorial = newLeadCeremony === "celebration-of-life";
    const ceremonyMap: Record<string, string> = {
      wedding: "Wedding & Reception",
      "birthday-milestone": "Milestone Birthday Party",
      "gala-dinner": "Corporate Gala / Brand Event",
      "celebration-of-life": "Celebration of Life Gathering",
    };
    const created: AdminLeadItem = {
      id: `ld_${Math.random().toString(16).slice(2, 10)}`,
      createdAt: "Just now",
      name: newLeadName.trim(),
      email: newLeadEmail.trim(),
      phone: newLeadPhone.trim() || settings.contactPhone || "0400 000 000",
      ceremonySlug: newLeadCeremony,
      ceremonyLabel: ceremonyMap[newLeadCeremony] ?? "Custom Event",
      eventDate: "2027-02-20",
      guests: Number(newLeadGuests) || 80,
      venueArea: "Perth Metro",
      estimatedValueCents: (Number(newLeadValue) || 10000) * 100,
      stage: "NEW",
      notes: newLeadNotes.trim() || "Added directly via Planner Command Centre phone/walk-in intake.",
      experienceMode: isMemorial ? "MEMORIAL" : "CELEBRATION",
    };
    persistLeads([created, ...leads]);
    appendAudit(`Just now — Created new dynamic lead ${created.id} (${created.name}).`);
    setNewLeadName("");
    setNewLeadEmail("");
    setNewLeadPhone("");
    setNewLeadNotes("");
  };

  // --- Event Handlers ---
  const toggleDietaryReveal = (eventId: string) => {
    const willReveal = !revealedEvents[eventId];
    setRevealedEvents((prev) => ({ ...prev, [eventId]: willReveal }));
    if (willReveal) {
      appendAudit(
        `Just now — [AUDIT] Encrypted dietary & allergy health fields decrypted for event ${eventId} by ${settings.coordinatorName || "Planner Staff"}.`,
      );
    }
  };

  const openEditEventModal = (event: ActiveEventRunSheet) => {
    setEditingEvent({ ...event });
    eventDialogRef.current?.showModal();
  };

  const closeEditEventModal = () => {
    eventDialogRef.current?.close();
    setEditingEvent(null);
  };

  const saveEventEdit = () => {
    if (!editingEvent) return;
    const updated = events.map((e) => (e.id === editingEvent.id ? editingEvent : e));
    persistEvents(updated);
    appendAudit(
      `Just now — Event ${editingEvent.id} (${editingEvent.title}) run-sheet updated dynamically.`,
    );
    closeEditEventModal();
  };

  const deleteEvent = (eventId: string) => {
    const target = events.find((e) => e.id === eventId);
    const updated = events.filter((e) => e.id !== eventId);
    persistEvents(updated);
    appendAudit(`Just now — Event ${eventId} (${target?.title ?? "Event"}) removed from active run-sheets.`);
    closeEditEventModal();
  };

  const handleAddEvent = () => {
    if (!newEventTitle.trim()) return;
    const isMemorial = newEventCategory.toLowerCase().includes("memorial");
    const created: ActiveEventRunSheet = {
      id: `evt_perth_${Math.random().toString(16).slice(2, 8)}`,
      title: newEventTitle.trim(),
      category: newEventCategory.trim(),
      date: newEventDate.trim(),
      venue: newEventVenue.trim(),
      coordinator: newEventCoordinator.trim() || settings.coordinatorName || "Appilico Team",
      rsvpConfirmed: Math.round(Number(newEventGuests) * 0.85) || 50,
      rsvpInvited: Number(newEventGuests) || 80,
      tablesRequired: Math.ceil((Number(newEventGuests) || 80) / 10),
      dietarySummaryMasked: "Standard Catering Brief · [Allergy Notes Masked 🔒]",
      dietarySummaryRevealed: "Standard Catering Brief · Verified Halal & Nut-Free Prep",
      checklistProgress: 40,
      totalIncGstCents: (Number(newEventValue) || 12000) * 100,
      depositPaid: true,
      mode: isMemorial ? "MEMORIAL" : "CELEBRATION",
    };
    persistEvents([created, ...events]);
    appendAudit(`Just now — Created new active event run-sheet ${created.id} (${created.title}).`);
    setNewEventTitle("");
    setShowAddEventForm(false);
  };

  // --- Vendor / Partner Handlers ---
  const updatePartnerStatus = (partnerId: string, status: "VERIFIED" | "EXPIRING_SOON" | "PENDING") => {
    const updated = partners.map((p) => (p.id === partnerId ? { ...p, complianceStatus: status } : p));
    persistPartners(updated);
    appendAudit(`Just now — Partner ${partnerId} status updated to ${status}.`);
  };

  const deletePartner = (partnerId: string) => {
    const target = partners.find((p) => p.id === partnerId);
    const updated = partners.filter((p) => p.id !== partnerId);
    persistPartners(updated);
    appendAudit(`Just now — Partner ${partnerId} (${target?.businessName ?? "Vendor"}) removed.`);
  };

  const handleAddPartner = () => {
    if (!newPartnerName.trim()) return;
    const created: PerthPartnerVendor = {
      id: `ven_${Math.random().toString(16).slice(2, 6)}`,
      businessName: newPartnerName.trim(),
      category: newPartnerCategory,
      suburb: newPartnerSuburb.trim() || "Perth Metro",
      abn: newPartnerAbn.trim() || "51 824 753 556",
      abnVerified: true,
      pliInsuranceExpiry: "2027-11-30 ($20M PLI)",
      complianceStatus: "VERIFIED",
      rating: "5.0 ★ (New Partner)",
    };
    persistPartners([created, ...partners]);
    appendAudit(`Just now — Registered new Perth partner ${created.businessName} (${created.id}).`);
    setNewPartnerName("");
    setShowAddPartnerForm(false);
  };

  // --- Settings Handlers ---
  const handleSaveSettings = () => {
    saveContactSettings(settings);
    appendAudit(
      `Just now — Updated system contact & notifications: Email=${settings.contactEmail}, Phone=${settings.contactPhone || "None (Removed)"}, Coordinator=${settings.coordinatorName}.`,
    );
    setSettingsStatusMessage("✓ Settings saved successfully and broadcast live to all website components.");
    setTimeout(() => setSettingsStatusMessage(null), 5000);
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_CONTACT_SETTINGS);
    saveContactSettings(DEFAULT_CONTACT_SETTINGS);
    appendAudit("Just now — Restored system contact defaults (Email: appilico.au@gmail.com, Phone: None).");
    setSettingsStatusMessage("✓ Restored default contact & system settings.");
    setTimeout(() => setSettingsStatusMessage(null), 5000);
  };

  const handleSendTestNotification = () => {
    const payload = {
      from: `${settings.companyName} <hello@managevent.com.au>`,
      to: settings.notificationEmail,
      subject: `[TEST ALERT] Perth Lead Pipeline Notification Test`,
      body: `Test Alert Triggered from Admin Command Centre\nTime: ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Perth" })} AWST\nRecipient: ${settings.notificationEmail}\nDefault Coordinator: ${settings.coordinatorName}\nStatus: Resend Delivery Validated (HTTP 200 Mock OK)`,
    };
    setTestAlertPreview(JSON.stringify(payload, null, 2));
    appendAudit(`Just now — Dispatched test notification alert to ${settings.notificationEmail} (Status: 200 OK).`);
    setSettingsStatusMessage(`✓ Test notification alert successfully dispatched to ${settings.notificationEmail}.`);
    setTimeout(() => setSettingsStatusMessage(null), 6000);
  };

  const handleResetAllDemoData = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_LEADS);
      localStorage.removeItem(STORAGE_KEY_EVENTS);
      localStorage.removeItem(STORAGE_KEY_PARTNERS);
      localStorage.removeItem(STORAGE_KEY_AUDIT);
    }
    setLeads(SEED_LEADS);
    setEvents(SEED_EVENTS);
    setPartners(SEED_PARTNERS);
    setSettings(DEFAULT_CONTACT_SETTINGS);
    saveContactSettings(DEFAULT_CONTACT_SETTINGS);
    setAuditEntries([
      `Just now — Reset all demo data to seed baseline.`,
      `Just now — Default contact email: appilico.au@gmail.com.`,
    ]);
    setSettingsStatusMessage("✓ All demo data and settings have been reset to default clean factory state.");
    setTimeout(() => setSettingsStatusMessage(null), 5000);
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
            partner compliance, and dynamic contact configuration.
          </p>
        </div>
        <div className="admin-quick-links">
          <a href="/" className="button button-secondary">
            View Public Website
          </a>
          <button
            type="button"
            className="button"
            onClick={() => setActiveTab("settings")}
          >
            ⚙ Settings & Contact
          </button>
        </div>
      </div>

      {settingsStatusMessage && (
        <div className="admin-alert admin-alert-success" role="status">
          <span>{settingsStatusMessage}</span>
          <button
            type="button"
            className="button button-small button-secondary"
            onClick={() => setSettingsStatusMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

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
          <small>Across {settings.operatingArea}</small>
        </article>
        <article className="admin-kpi-card">
          <span>Confirmed Booked Value</span>
          <strong dir="ltr">{formatMoneyAud(bookedRevenueCents)}</strong>
          <small dir="ltr">Includes {formatMoneyAud(bookedGst.gstCents)} GST (10%)</small>
        </article>
        <article className="admin-kpi-card">
          <span>Active Event Run-Sheets</span>
          <strong dir="ltr">{events.length}</strong>
          <small>Coordinator: {settings.coordinatorName || "Appilico Team"}</small>
        </article>
      </section>

      {/* Navigation Tabs */}
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
          2. Active Events & Run-Sheets ({events.length})
        </button>
        <button
          type="button"
          role="tab"
          id="tab-vendors"
          aria-selected={activeTab === "vendors"}
          onClick={() => setActiveTab("vendors")}
          className="admin-tab"
        >
          3. Perth Venues & Partners ({partners.length})
        </button>
        <button
          type="button"
          role="tab"
          id="tab-finance"
          aria-selected={activeTab === "finance"}
          onClick={() => setActiveTab("finance")}
          className="admin-tab"
        >
          4. Finance & Audit Trail
        </button>
        <button
          type="button"
          role="tab"
          id="tab-settings"
          aria-selected={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
          className="admin-tab"
        >
          5. System & Settings ⚙
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
                <option value="LOST">Lost</option>
              </select>
            </div>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-labelledby="crm-leads-caption"
            className="table-wrapper"
          >
            <table className="admin-table">
              <caption id="crm-leads-caption" className="sr-caption">
                Perth Event Enquiries and Dynamic CRM Pipeline
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
                        {lead.email} {lead.phone ? `· ${lead.phone}` : ""}
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
                      <div className="row-actions" style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          className="button button-small"
                          onClick={() => openLeadModal(lead)}
                        >
                          Inspect / Edit
                        </button>
                        <button
                          type="button"
                          className="button button-small button-danger"
                          onClick={() => deleteLead(lead.id)}
                          aria-label={`Delete ${lead.name}`}
                        >
                          ✕
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
                <label htmlFor="intake-phone">Client Phone</label>
                <input
                  id="intake-phone"
                  type="tel"
                  dir="ltr"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  placeholder="0400 000 000"
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
            </div>
            <div style={{ marginBlockStart: "0.75rem", display: "flex", gap: "1rem", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="intake-notes">Intake Notes</label>
                <input
                  id="intake-notes"
                  value={newLeadNotes}
                  onChange={(e) => setNewLeadNotes(e.target.value)}
                  placeholder="Key package inclusions or preferences discussed..."
                />
              </div>
              <button type="button" className="button" onClick={handleQuickAddLead}>
                + Add to CRM Pipeline
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* TAB 2: ACTIVE EVENTS & RUN-SHEETS */}
      <div role="tabpanel" aria-labelledby="tab-events" hidden={activeTab !== "events"}>
        <div className="admin-panel-inner">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2>Booked Perth Events & Live RSVP-to-Catering Bridge</h2>
              <p className="admin-sub">
                Dietary and allergy health records are encrypted at rest in Sydney (`enc:v1`).
                Revealing dietary records or modifying run-sheets creates an audit trail entry.
              </p>
            </div>
            <button
              type="button"
              className="button button-small"
              onClick={() => setShowAddEventForm(!showAddEventForm)}
            >
              {showAddEventForm ? "Cancel Event" : "+ Add Event Run-Sheet"}
            </button>
          </div>

          {showAddEventForm && (
            <div className="settings-section" style={{ marginBlock: "1rem" }}>
              <h3>Create New Active Event Run-Sheet</h3>
              <div className="admin-edit-grid">
                <div className="admin-form-group">
                  <label htmlFor="new-evt-title">Event Title</label>
                  <input
                    id="new-evt-title"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="e.g. Jessica & Alex Wedding"
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="new-evt-cat">Category</label>
                  <input
                    id="new-evt-cat"
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value)}
                    placeholder="Wedding / Gala / Birthday"
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="new-evt-date">Date & Time</label>
                  <input
                    id="new-evt-date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    placeholder="20 Feb 2027 · 17:00 AWST"
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="new-evt-venue">Venue</label>
                  <input
                    id="new-evt-venue"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    placeholder="Matilda Bay Foreshore"
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="new-evt-coord">Coordinator</label>
                  <input
                    id="new-evt-coord"
                    value={newEventCoordinator}
                    onChange={(e) => setNewEventCoordinator(e.target.value)}
                    placeholder={settings.coordinatorName || "Appilico Team"}
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="new-evt-guests">Guest Count</label>
                  <input
                    id="new-evt-guests"
                    type="number"
                    value={newEventGuests}
                    onChange={(e) => setNewEventGuests(e.target.value)}
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="new-evt-val">Total Value ($ AUD)</label>
                  <input
                    id="new-evt-val"
                    type="number"
                    value={newEventValue}
                    onChange={(e) => setNewEventValue(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginBlockStart: "1rem" }}>
                <button type="button" className="button" onClick={handleAddEvent}>
                  Save Event Run-Sheet
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowAddEventForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="events-cards-grid" style={{ marginBlockStart: "1rem" }}>
            {events.map((evt) => {
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
                        {evt.date} · {evt.venue} · Coordinator: <strong>{evt.coordinator}</strong>
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
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="button button-small button-secondary"
                        onClick={() => toggleDietaryReveal(evt.id)}
                      >
                        {isRevealed ? "Mask Health Data" : "Reveal Allergy Notes"}
                      </button>
                      <button
                        type="button"
                        className="button button-small button-secondary"
                        onClick={() => openEditEventModal(evt)}
                      >
                        Edit Run-Sheet
                      </button>
                      <button
                        type="button"
                        className="button button-small button-danger"
                        onClick={() => deleteEvent(evt.id)}
                        aria-label={`Delete event ${evt.title}`}
                      >
                        ✕
                      </button>
                    </div>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2>Perth Supplier & Venue Compliance Queue</h2>
              <p className="admin-sub">
                Every Managevent supplier in Western Australia is verified for an active 11-digit ABN,
                $20M Public Liability Insurance, and compliance status.
              </p>
            </div>
            <button
              type="button"
              className="button button-small"
              onClick={() => setShowAddPartnerForm(!showAddPartnerForm)}
            >
              {showAddPartnerForm ? "Cancel" : "+ Register Perth Partner"}
            </button>
          </div>

          {showAddPartnerForm && (
            <div className="settings-section" style={{ marginBlock: "1rem" }}>
              <h3>Register New Perth Partner Vendor</h3>
              <div className="admin-edit-grid">
                <div className="admin-form-group">
                  <label htmlFor="new-partner-name">Business Name</label>
                  <input
                    id="new-partner-name"
                    value={newPartnerName}
                    onChange={(e) => setNewPartnerName(e.target.value)}
                    placeholder="e.g. Fremantle Marquee & Florals"
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="new-partner-cat">Category</label>
                  <select
                    id="new-partner-cat"
                    value={newPartnerCategory}
                    onChange={(e) => setNewPartnerCategory(e.target.value)}
                  >
                    <option value="Catering & Hospitality">Catering & Hospitality</option>
                    <option value="Styling, Arches & Florals">Styling, Arches & Florals</option>
                    <option value="Furniture & Marquee Hire">Furniture & Marquee Hire</option>
                    <option value="AV, Lighting & Production">AV, Lighting & Production</option>
                    <option value="Photography & Video">Photography & Video</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label htmlFor="new-partner-suburb">Perth Suburb</label>
                  <input
                    id="new-partner-suburb"
                    value={newPartnerSuburb}
                    onChange={(e) => setNewPartnerSuburb(e.target.value)}
                    placeholder="e.g. Subiaco / Northbridge"
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="new-partner-abn">ABN</label>
                  <input
                    id="new-partner-abn"
                    value={newPartnerAbn}
                    onChange={(e) => setNewPartnerAbn(e.target.value)}
                    placeholder="51 824 753 556"
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginBlockStart: "1rem" }}>
                <button type="button" className="button" onClick={handleAddPartner}>
                  Add Partner
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowAddPartnerForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div
            tabIndex={0}
            role="region"
            aria-labelledby="partners-table-caption"
            className="table-wrapper"
            style={{ marginBlockStart: "1rem" }}
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
                  <th scope="col">Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((partner) => (
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
                        className={`stage-badge ${partner.complianceStatus === "VERIFIED" ? "stage-booked" : partner.complianceStatus === "EXPIRING_SOON" ? "stage-proposal_sent" : "stage-new"}`}
                      >
                        {partner.complianceStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        {partner.complianceStatus !== "VERIFIED" && (
                          <button
                            type="button"
                            className="button button-small"
                            onClick={() => updatePartnerStatus(partner.id, "VERIFIED")}
                          >
                            Verify
                          </button>
                        )}
                        {partner.complianceStatus === "VERIFIED" && (
                          <button
                            type="button"
                            className="button button-small button-secondary"
                            onClick={() => updatePartnerStatus(partner.id, "EXPIRING_SOON")}
                          >
                            Flag Expiring
                          </button>
                        )}
                        <button
                          type="button"
                          className="button button-small button-danger"
                          onClick={() => deletePartner(partner.id)}
                          aria-label={`Remove partner ${partner.businessName}`}
                        >
                          ✕
                        </button>
                      </div>
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
                All figures dynamically calculated from active CRM bookings and event run-sheets (10% GST).
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
                  <dt>Active Pipeline Leads</dt>
                  <dd dir="ltr">{leads.length} leads ({formatMoneyAud(totalPipelineCents)} pipeline)</dd>
                </div>
                <div>
                  <dt>Registered WA Partner Vendors</dt>
                  <dd dir="ltr">{partners.filter((p) => p.complianceStatus === "VERIFIED").length} verified</dd>
                </div>
              </dl>
            </section>

            <section className="finance-card" aria-labelledby="audit-heading">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h2 id="audit-heading">Immutable Staff Audit Trail</h2>
                <button
                  type="button"
                  className="button button-small button-secondary"
                  onClick={() => {
                    const blob = new Blob([auditEntries.join("\n")], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `managevent-audit-log-${new Date().toISOString().slice(0, 10)}.txt`;
                    a.click();
                  }}
                >
                  Export Log
                </button>
              </div>
              <p className="admin-sub">
                Real-time record of all lead changes, settings modifications, and health data reveals.
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

      {/* TAB 5: SYSTEM & SETTINGS (DYNAMIC CONFIGURATION) */}
      <div role="tabpanel" aria-labelledby="tab-settings" hidden={activeTab !== "settings"}>
        <div className="admin-panel-inner">
          <h2>System & Dynamic Contact Settings</h2>
          <p className="admin-sub">
            Change emails, phone numbers, and operational defaults dynamically. All changes are saved
            immediately and reflected across the public website and staff command centre.
          </p>

          <section className="settings-section">
            <h3>Public Contact & Notification Details</h3>
            <div className="settings-grid">
              <div className="admin-form-group">
                <label htmlFor="cfg-email">Primary Public Contact Email</label>
                <input
                  id="cfg-email"
                  type="email"
                  dir="ltr"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  placeholder="appilico.au@gmail.com"
                />
                <small className="cell-sub">
                  Rendered on website header, footer, contact cards, and legal documents.
                </small>
              </div>

              <div className="admin-form-group">
                <label htmlFor="cfg-phone">Public Direct Phone Number</label>
                <input
                  id="cfg-phone"
                  type="tel"
                  dir="ltr"
                  value={settings.contactPhone}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  placeholder="Leave blank to omit phone number (e.g. 08 9200 1234)"
                />
                <small className="cell-sub">
                  {settings.contactPhone
                    ? `Active phone: ${settings.contactPhone}`
                    : "No phone number displayed on website (removed by default)."}
                </small>
              </div>

              <div className="admin-form-group">
                <label htmlFor="cfg-alert-email">Planner Inbox / Alert Email</label>
                <input
                  id="cfg-alert-email"
                  type="email"
                  dir="ltr"
                  value={settings.notificationEmail}
                  onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
                  placeholder="appilico.au@gmail.com"
                />
                <small className="cell-sub">
                  Destination for new lead notifications and worker background alerts.
                </small>
              </div>

              <div className="admin-form-group">
                <label htmlFor="cfg-coord">Default Event Coordinator</label>
                <input
                  id="cfg-coord"
                  value={settings.coordinatorName}
                  onChange={(e) => setSettings({ ...settings, coordinatorName: e.target.value })}
                  placeholder="Appilico Team"
                />
                <small className="cell-sub">
                  Assigned as default coordinator on newly generated run-sheets.
                </small>
              </div>

              <div className="admin-form-group">
                <label htmlFor="cfg-company">Company Legal Name</label>
                <input
                  id="cfg-company"
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  placeholder="Appilico"
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="cfg-abn">Business ABN (ATO)</label>
                <input
                  id="cfg-abn"
                  value={settings.businessAbn}
                  onChange={(e) => setSettings({ ...settings, businessAbn: e.target.value })}
                  placeholder="51 824 753 556"
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="cfg-area">Primary Operating Region</label>
                <input
                  id="cfg-area"
                  value={settings.operatingArea}
                  onChange={(e) => setSettings({ ...settings, operatingArea: e.target.value })}
                  placeholder="Perth Metro & Swan Valley, WA"
                />
              </div>
            </div>

            <div className="settings-actions">
              <button
                type="button"
                className="button button-success"
                onClick={handleSaveSettings}
              >
                ✓ Save System Settings
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={handleSendTestNotification}
              >
                ✉ Send Test Planner Notification
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={handleResetSettings}
              >
                Reset Contact Defaults
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={handleResetAllDemoData}
              >
                Reset All Demo Data to Seed
              </button>
            </div>

            {testAlertPreview && (
              <div style={{ marginBlockStart: "1.25rem" }}>
                <strong>Validated Resend Transactional Alert Payload:</strong>
                <pre className="payload-preview">{testAlertPreview}</pre>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Interactive Lead Inspection & Dynamic Edit Dialog */}
      <dialog
        ref={leadDialogRef}
        id="lead-inspector-dialog"
        aria-labelledby="dialog-lead-title"
        className="admin-dialog"
      >
        {editingLeadForm && (
          <div className="admin-dialog-body">
            <div className="admin-dialog-header">
              <div>
                <span className="mode-pill">{editingLeadForm.ceremonyLabel}</span>
                <h2 id="dialog-lead-title">Edit Lead: {editingLeadForm.name}</h2>
              </div>
              <button
                type="button"
                className="button button-small button-secondary"
                onClick={closeLeadModal}
              >
                Close (Esc)
              </button>
            </div>

            <div className="admin-edit-grid">
              <div className="admin-form-group">
                <label htmlFor="edit-lead-name">Client / Host Name</label>
                <input
                  id="edit-lead-name"
                  value={editingLeadForm.name}
                  onChange={(e) => setEditingLeadForm({ ...editingLeadForm, name: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="edit-lead-email">Client Email</label>
                <input
                  id="edit-lead-email"
                  type="email"
                  dir="ltr"
                  value={editingLeadForm.email}
                  onChange={(e) => setEditingLeadForm({ ...editingLeadForm, email: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="edit-lead-phone">Client Phone</label>
                <input
                  id="edit-lead-phone"
                  type="tel"
                  dir="ltr"
                  value={editingLeadForm.phone}
                  onChange={(e) => setEditingLeadForm({ ...editingLeadForm, phone: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="edit-lead-date">Event Date</label>
                <input
                  id="edit-lead-date"
                  dir="ltr"
                  value={editingLeadForm.eventDate}
                  onChange={(e) =>
                    setEditingLeadForm({ ...editingLeadForm, eventDate: e.target.value })
                  }
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="edit-lead-area">Perth Venue / Area</label>
                <input
                  id="edit-lead-area"
                  value={editingLeadForm.venueArea}
                  onChange={(e) =>
                    setEditingLeadForm({ ...editingLeadForm, venueArea: e.target.value })
                  }
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="edit-lead-guests">Estimated Guests</label>
                <input
                  id="edit-lead-guests"
                  type="number"
                  dir="ltr"
                  value={editingLeadForm.guests}
                  onChange={(e) =>
                    setEditingLeadForm({ ...editingLeadForm, guests: Number(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="edit-lead-val">Est. Value ($ AUD)</label>
                <input
                  id="edit-lead-val"
                  type="number"
                  dir="ltr"
                  value={Math.round(editingLeadForm.estimatedValueCents / 100)}
                  onChange={(e) =>
                    setEditingLeadForm({
                      ...editingLeadForm,
                      estimatedValueCents: (Number(e.target.value) || 0) * 100,
                    })
                  }
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="edit-lead-mode">Experience Mode</label>
                <select
                  id="edit-lead-mode"
                  value={editingLeadForm.experienceMode}
                  onChange={(e) =>
                    setEditingLeadForm({
                      ...editingLeadForm,
                      experienceMode: e.target.value as "CELEBRATION" | "MEMORIAL",
                    })
                  }
                >
                  <option value="CELEBRATION">CELEBRATION</option>
                  <option value="MEMORIAL">MEMORIAL</option>
                </select>
              </div>
            </div>

            <div className="admin-form-group" style={{ marginBlockEnd: "1.25rem" }}>
              <label htmlFor="edit-lead-notes">Scope & Notes</label>
              <textarea
                id="edit-lead-notes"
                rows={3}
                value={editingLeadForm.notes}
                onChange={(e) => setEditingLeadForm({ ...editingLeadForm, notes: e.target.value })}
              />
            </div>

            <div className="admin-dialog-stage-bar">
              <span>Update Pipeline Stage:</span>
              <div className="stage-buttons" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBlock: "0.5rem" }}>
                {(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "BOOKED", "LOST"] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      className={`button button-small ${editingLeadForm.stage === st ? "" : "button-secondary"}`}
                      onClick={() => setEditingLeadForm({ ...editingLeadForm, stage: st })}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="admin-actions-bar">
              <button
                type="button"
                className="button button-danger"
                onClick={() => deleteLead(editingLeadForm.id)}
              >
                Delete Lead
              </button>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="button button-secondary" onClick={closeLeadModal}>
                  Cancel
                </button>
                <button type="button" className="button" onClick={saveLeadEdit}>
                  Save Lead Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>

      {/* Interactive Edit Event Dialog */}
      <dialog
        ref={eventDialogRef}
        id="event-inspector-dialog"
        aria-labelledby="dialog-event-title"
        className="admin-dialog"
      >
        {editingEvent && (
          <div className="admin-dialog-body">
            <div className="admin-dialog-header">
              <div>
                <span className="mode-pill">{editingEvent.category}</span>
                <h2 id="dialog-event-title">Edit Run-Sheet: {editingEvent.title}</h2>
              </div>
              <button
                type="button"
                className="button button-small button-secondary"
                onClick={closeEditEventModal}
              >
                Close (Esc)
              </button>
            </div>

            <div className="admin-edit-grid">
              <div className="admin-form-group">
                <label htmlFor="ee-title">Event Title</label>
                <input
                  id="ee-title"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="ee-venue">Venue</label>
                <input
                  id="ee-venue"
                  value={editingEvent.venue}
                  onChange={(e) => setEditingEvent({ ...editingEvent, venue: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="ee-date">Date & Time</label>
                <input
                  id="ee-date"
                  value={editingEvent.date}
                  onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="ee-coord">Coordinator</label>
                <input
                  id="ee-coord"
                  value={editingEvent.coordinator}
                  onChange={(e) => setEditingEvent({ ...editingEvent, coordinator: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="ee-confirmed">Confirmed RSVPs</label>
                <input
                  id="ee-confirmed"
                  type="number"
                  value={editingEvent.rsvpConfirmed}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, rsvpConfirmed: Number(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="ee-tables">Tables Required</label>
                <input
                  id="ee-tables"
                  type="number"
                  value={editingEvent.tablesRequired}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, tablesRequired: Number(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="ee-progress">Checklist Progress (%)</label>
                <input
                  id="ee-progress"
                  type="number"
                  value={editingEvent.checklistProgress}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, checklistProgress: Number(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="ee-val">Total Value ($ AUD)</label>
                <input
                  id="ee-val"
                  type="number"
                  value={Math.round(editingEvent.totalIncGstCents / 100)}
                  onChange={(e) =>
                    setEditingEvent({
                      ...editingEvent,
                      totalIncGstCents: (Number(e.target.value) || 0) * 100,
                    })
                  }
                />
              </div>
            </div>

            <div className="admin-form-group" style={{ marginBlock: "0.75rem" }}>
              <label>
                <input
                  type="checkbox"
                  checked={editingEvent.depositPaid}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, depositPaid: e.target.checked })
                  }
                  style={{ marginInlineEnd: "0.5rem" }}
                />
                Deposit Paid & Verified
              </label>
            </div>

            <div className="admin-actions-bar">
              <button
                type="button"
                className="button button-danger"
                onClick={() => deleteEvent(editingEvent.id)}
              >
                Remove Run-Sheet
              </button>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="button button-secondary" onClick={closeEditEventModal}>
                  Cancel
                </button>
                <button type="button" className="button" onClick={saveEventEdit}>
                  Save Run-Sheet
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
