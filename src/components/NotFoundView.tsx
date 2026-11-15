/**
 * HEALML Enterprise – Page Not Found View (404)
 * Displays a clean, professional not-found page with clear recovery options
 * preventing any blank page on unknown routes or broken URLs.
 */

import React from 'react';
import { Compass, Home, ArrowLeft, Search } from 'lucide-react';

interface NotFoundViewProps {
  attemptedPath?: string;
  onNavigateHome: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  attemptedPath = '/unknown',
  onNavigateHome,
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl p-8 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center shadow-inner">
          <Compass className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Error 404 · Not Found
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Requested Destination Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            The workspace route you are attempting to reach does not exist or may have been reorganized.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-left font-mono space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span>Attempted Path:</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">{attemptedPath}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Fallback Resolution:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Centralized Router Guard Active</span>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onNavigateHome}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Workspace Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
