import React from "react";
import Link from "next/link";
import { invitationStore } from "@/lib/invitation-store";
import {
  Plus,
  Calendar,
  Users,
  ArrowRight,
  ExternalLink,
  Settings,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Host Studio",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function StudioDashboardPage() {
  const events = invitationStore.getAllEvents();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Studio Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-button bg-amber-600 text-white font-serif font-bold text-lg">
                M
              </div>
              <span className="font-display text-lg font-bold text-stone-900">
                Managevent Studio
              </span>
            </Link>
            <span className="rounded-full bg-stone-100 border px-2.5 py-0.5 text-xs font-semibold text-stone-600">
              Host Studio
            </span>
          </div>

          <Link
            href="/studio/new"
            className="inline-flex items-center gap-1.5 rounded-button bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Event</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
            Your Event Invitations
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-500">
            Manage invitations, track real-time RSVP responses, and coordinate catering dietary requirements.
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const summary = invitationStore.getEventResponsesSummary(event.id);
            const attendingTotal = summary ? summary.confirmedAdults + summary.confirmedChildren : 0;
            const primaryParty = event.parties[0];
            const sampleGuestLink = primaryParty ? `/i/${event.slug}/${primaryParty.token}` : "#";

            return (
              <div
                key={event.id}
                className="group flex flex-col justify-between rounded-card border bg-white p-6 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div>
                  {/* Status & Plan Pill */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      ● Published
                    </span>
                    <span className="text-[10px] font-mono text-stone-500 uppercase">
                      {event.ceremonySlug}
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-bold text-stone-900 group-hover:text-amber-700 transition-colors">
                    {event.title}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-xs text-stone-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-stone-400" />
                      <span>{new Date(event.startsAt).toLocaleDateString("en-AU", { dateStyle: "medium" })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-stone-400" />
                      <span>{event.parties.length} parties invited</span>
                    </div>
                  </div>

                  {/* Attendance Progress Bar */}
                  {summary && summary.totalGuests > 0 && (
                    <div className="mt-5 rounded-button bg-stone-50 border p-3">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="text-stone-700">RSVP Confirmed</span>
                        <span className="text-amber-700">
                          {attendingTotal} / {summary.totalGuests} Attending
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (attendingTotal / summary.totalGuests) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="mt-6 pt-4 border-t flex items-center justify-between">
                  <a
                    href={sampleGuestLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-800"
                  >
                    <span>Guest View</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <Link
                    href={`/studio/${event.id}`}
                    className="inline-flex items-center gap-1.5 rounded-button bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
                  >
                    <span>Manage Studio</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
