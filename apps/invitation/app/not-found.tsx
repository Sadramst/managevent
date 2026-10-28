import React from "react";
import Link from "next/link";
import { SearchX, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-md rounded-card border border-stone-800 bg-stone-950/80 p-8 shadow-2xl backdrop-blur-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
          <SearchX className="h-7 w-7 text-amber-400" />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
          Invitation Not Found
        </h1>

        <p className="mt-3 font-serif text-sm text-stone-400 leading-relaxed">
          The requested ceremony link or guest pass token could not be verified. It may have expired
          or been replaced by the host.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-button bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Managevent Home</span>
          </Link>

          <Link
            href="/studio"
            className="inline-flex items-center gap-2 rounded-button border border-stone-700 bg-stone-800 px-4 py-2 text-xs font-semibold text-stone-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Host Studio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
