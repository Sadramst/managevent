import type {
  AllergySeverity,
  DietaryTag,
  ExperienceMode,
  InvitationPlan,
  InvitationThemeId,
  RsvpStatus,
} from "@managevent/types";

export type ViewMode = "story" | "timeline" | "gallery";

export interface VenueInfo {
  name: string;
  address: string;
  googleMapsUrl?: string | undefined;
  appleMapsUrl?: string | undefined;
  parkingInfo?: string | undefined;
  dressCode?: string | undefined;
}

export interface ScheduleItem {
  time: string;
  title: string;
  description?: string | undefined;
  venueName?: string | undefined;
}

export interface EventStoryPillar {
  title: string;
  description: string;
}

export interface EventContent {
  headline: string;
  subheadline: string;
  coupleOrHostNames: string;
  honoureeName?: string | undefined;
  invitationStory: string[];
  pillars?: EventStoryPillar[] | undefined;
  audioUrl?: string | undefined;
  audioTitle?: string | undefined;
  coverImageUrl?: string | undefined;
  galleryImages?: string[] | undefined;
  dressCode?: string | undefined;
  parkingInfo?: string | undefined;
  faqs?: Array<{ question: string; answer: string }> | undefined;
  wishingWell?:
    | {
        payId?: string | undefined;
        bsb?: string | undefined;
        accountNumber?: string | undefined;
        accountName?: string | undefined;
        message?: string | undefined;
        registryUrl?: string | undefined;
      }
    | undefined;
  tributeBook?:
    | {
        prompt?: string | undefined;
        donationUrl?: string | undefined;
      }
    | undefined;
}

export interface GuestMember {
  id: string;
  name: string;
  isPrimary?: boolean | undefined;
  isChild?: boolean | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  dietary?: DietaryTag[] | undefined;
  allergyNotes?: string | undefined;
  allergySeverity?: AllergySeverity | undefined;
  accessibilityNotes?: string | undefined;
  status: RsvpStatus;
}

export interface GuestParty {
  id: string;
  stableId: string;
  displayName: string;
  token: string;
  maxSeats: number;
  allowPlusOnes: boolean;
  childrenAllowed: boolean;
  tableLabel?: string | undefined;
  tags: string[];
  members: GuestMember[];
  legacySlugs?: string[] | undefined;
  status: RsvpStatus;
  notes?: string | undefined;
}

export interface EventModel {
  id: string;
  slug: string;
  title: string;
  ceremonySlug: string;
  experienceMode: ExperienceMode;
  themeId: InvitationThemeId;
  templateSlug: string;
  gateStyle: "wax-seal" | "ribbon" | "arch" | "plain-fade";
  plan: InvitationPlan;
  startsAt: string; // ISO datetime
  endsAt?: string | undefined;
  timeZone: string;
  languages: Array<"en" | "fa">;
  defaultLanguage: "en" | "fa";
  rsvpDeadline?: string | undefined;
  venue: VenueInfo;
  schedule: ScheduleItem[];
  content: EventContent;
  parties: GuestParty[];
  salt: string;
  allowForwarding: boolean;
  wallEnabled: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RsvpSubmissionPayload {
  guestToken: string;
  eventSlug: string;
  status: RsvpStatus;
  guests: Array<{
    id: string;
    name: string;
    status: RsvpStatus;
    dietary: DietaryTag[];
    allergyNotes?: string | undefined;
    allergySeverity?: AllergySeverity | undefined;
    accessibilityNotes?: string | undefined;
    healthDataConsentGranted: boolean;
  }>;
  songRequests?: string[] | undefined;
  messageToHost?: string | undefined;
  contactForUpdates?: string | undefined;
  locale: "en" | "fa";
}

export interface EventResponsesSummary {
  eventId: string;
  totalParties: number;
  totalGuests: number;
  confirmedAdults: number;
  confirmedChildren: number;
  declinedCount: number;
  pendingCount: number;
  dietaryBreakdown: Record<string, number>;
  songRequests: Array<{ from: string; song: string }>;
  messages: Array<{ from: string; message: string; date: string }>;
}
