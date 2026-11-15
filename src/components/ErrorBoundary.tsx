/**
 * HEALML Enterprise - React Error Boundary Component
 * Catches JavaScript errors anywhere in their child component tree,
 * logs the error safely, and displays a graceful fallback UI instead of a blank page.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, ShieldAlert, LifeBuoy } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  featureName?: string;
  fallbackTitle?: string;
  onReset?: () => void;
  onNavigateHome?: () => void;
  onNavigateDashboard?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[HEALML ErrorBoundary ${this.state.errorId}] Uncaught component error in ${this.props.featureName || 'Workspace'}:`, error, errorInfo);
    // Non-blocking secure log submission
    try {
      fetch('/api/admin/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLIENT_VIEW_ERROR',
          entity_type: 'COMPONENT',
          entity_id: this.props.featureName || 'Workspace',
          details: `Error reference ${this.state.errorId}: ${error.message?.slice(0, 200)}`,
        }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle, featureName = 'Workspace View' } = this.props;
      const title = fallbackTitle || `${featureName} Encountered an Issue`;
      const safeErrorMessage = this.state.error?.message || 'Component failed to render safely.';

      return (
        <div className="p-8 max-w-3xl mx-auto my-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-rose-200 dark:border-rose-900/60 shadow-lg space-y-6 text-slate-800 dark:text-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  Feature: {featureName}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                The application intercepted a view error and prevented a blank page. The session and pipeline data remain preserved.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Feature Name:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{featureName}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Error Category:</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400 uppercase">View Rendering Guard</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Support Reference ID:</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{this.state.errorId}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block mb-1 font-mono text-[11px]">Safe Diagnostic Message:</span>
              <p className="font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 break-words">
                {safeErrorMessage}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Rendering</span>
            </button>

            {(this.props.onNavigateDashboard || this.props.onNavigateHome) && (
              <button
                onClick={this.props.onNavigateDashboard || this.props.onNavigateHome}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
