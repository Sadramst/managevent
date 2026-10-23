import React from "react";
import type { EventResponsesSummary } from "@/lib/types";
import { Users, UserCheck, UserX, Clock, Utensils } from "lucide-react";

interface StatsOverviewProps {
  summary: EventResponsesSummary;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ summary }) => {
  return (
    <div className="space-y-6">
      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Total Invited */}
        <div className="rounded-card border bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Invited</span>
            <Users className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-neutral-900">{summary.totalGuests}</div>
          <div className="text-xs text-neutral-500">{summary.totalParties} parties</div>
        </div>

        {/* Confirmed Attending */}
        <div className="rounded-card border border-emerald-100 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Attending</span>
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-950">
            {summary.confirmedAdults + summary.confirmedChildren}
          </div>
          <div className="text-xs text-emerald-700">
            {summary.confirmedAdults} adults, {summary.confirmedChildren} children
          </div>
        </div>

        {/* Declined */}
        <div className="rounded-card border border-red-100 bg-red-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Declined</span>
            <UserX className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-950">{summary.declinedCount}</div>
          <div className="text-xs text-red-700">Unable to attend</div>
        </div>

        {/* Pending */}
        <div className="rounded-card border border-amber-100 bg-amber-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Awaiting RSVP</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-950">{summary.pendingCount}</div>
          <div className="text-xs text-amber-700">Pending responses</div>
        </div>
      </div>

      {/* Dietary Breakdown Strip */}
      {Object.keys(summary.dietaryBreakdown).length > 0 && (
        <div className="rounded-card border bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-3">
            <Utensils className="h-4 w-4 text-amber-600" />
            <span>Catering & Dietary Requirements</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.dietaryBreakdown).map(([tag, count]) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900"
              >
                <span>{tag.replace("_", " ")}:</span>
                <span className="font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
