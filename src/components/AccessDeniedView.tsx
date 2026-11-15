/**
 * HEALML Enterprise – Access Denied View (403)
 * Clean, production-grade error view displayed when an unauthorized role
 * attempts to navigate to restricted administrative workspaces.
 */

import React from 'react';
import { ShieldAlert, ArrowLeft, Home, Lock } from 'lucide-react';

interface AccessDeniedViewProps {
  attemptedRoute?: string;
  userRole?: string;
  onNavigateHome: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  attemptedRoute = '/admin',
  userRole = 'CLIENT',
  onNavigateHome,
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl p-8 rounded-2xl bg-white dark:bg-[#0F172A] border border-amber-200 dark:border-amber-900/60 shadow-xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Error 403 · Forbidden
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Administrative Access Restricted
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            The requested destination requires <span className="font-semibold text-slate-900 dark:text-white">MASTER_ADMIN</span> or <span className="font-semibold text-slate-900 dark:text-white">SUPER_ADMIN</span> privileges. Your current authenticated role is <code className="font-mono font-bold text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{userRole}</code>.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-left font-mono space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span>Attempted Route:</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">{attemptedRoute}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Security Policy:</span>
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
              <Lock className="w-3 h-3" />
              Role-Based Access Control (RBAC) Active
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onNavigateHome}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Client Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
