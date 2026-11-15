/**
 * HEALML Enterprise – Dedicated Self-Healing Workspace Error Boundary
 * Prevents any rendering failure inside the Self-Healing Workspace from causing a blank page.
 * Provides 4 explicit recovery actions and logs sanitized diagnostics cleanly.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  ArrowLeft,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import {
  HealEngineVersionId,
  recordHealErrorLog,
  sanitizeDiagnosticMessage,
} from '../services/healEngineVersions';

interface HealWorkspaceErrorBoundaryProps {
  children: ReactNode;
  clientId?: string;
  projectId?: string;
  datasetId?: string;
  activeVersionId: HealEngineVersionId;
  onRetryHealWorkspace: () => void;
  onBackToExplorer: () => void;
  onSwitchToPreviousStable: () => Promise<void> | void;
}

interface HealWorkspaceErrorBoundaryState {
  hasError: boolean;
  errorId: string;
  timestamp: string;
  safeMessage: string;
  failedStage: string;
  showDetails: boolean;
  isSwitchingVersion: boolean;
}

export class HealWorkspaceErrorBoundary extends Component<
  HealWorkspaceErrorBoundaryProps,
  HealWorkspaceErrorBoundaryState
> {
  constructor(props: HealWorkspaceErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
      timestamp: '',
      safeMessage: '',
      failedStage: 'HEAL_WORKSPACE_RENDER',
      showDetails: false,
      isSwitchingVersion: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<HealWorkspaceErrorBoundaryState> {
    const errorId = `HEAL-ERR-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    return {
      hasError: true,
      errorId,
      timestamp: new Date().toISOString(),
      safeMessage: sanitizeDiagnosticMessage(error?.message || 'Heal Workspace rendering interrupted.'),
      failedStage: 'HEAL_WORKSPACE_RENDER',
    };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    const safeMessage = sanitizeDiagnosticMessage(error?.message || 'Heal Workspace rendering interrupted.');
    const errorId = this.state.errorId || `HEAL-ERR-${Date.now().toString(36).toUpperCase()}`;

    recordHealErrorLog({
      errorId,
      timestamp: new Date().toISOString(),
      clientId: this.props.clientId || 'unknown_client',
      projectId: this.props.projectId || 'prj_default',
      datasetId: this.props.datasetId || 'unknown_dataset',
      healEngineVersion: this.props.activeVersionId || 'v2.0',
      failedStage: 'HEAL_WORKSPACE_RENDER',
      errorCategory: 'EXECUTION_ERROR',
      safeMessage,
    });

    try {
      fetch('/api/heal/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId,
          clientId: this.props.clientId || 'unknown_client',
          projectId: this.props.projectId || 'prj_default',
          datasetId: this.props.datasetId || 'unknown_dataset',
          healEngineVersion: this.props.activeVersionId || 'v2.0',
          failedStage: 'HEAL_WORKSPACE_RENDER',
          errorCategory: 'EXECUTION_ERROR',
          safeMessage,
        }),
      }).catch(() => {});
    } catch {
      // ignore network errors during error reporting
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, showDetails: false });
    this.props.onRetryHealWorkspace();
  };

  handleUsePreviousStable = async () => {
    this.setState({ isSwitchingVersion: true });
    try {
      await this.props.onSwitchToPreviousStable();
      this.setState({ hasError: false, showDetails: false, isSwitchingVersion: false });
    } catch {
      this.setState({ isSwitchingVersion: false });
    }
  };

  render() {
    if (this.state.hasError) {
      const { activeVersionId, datasetId, projectId } = this.props;
      const { errorId, timestamp, safeMessage, failedStage, showDetails, isSwitchingVersion } = this.state;

      return (
        <div
          data-testid="heal-error-boundary-recovery"
          className="p-6 sm:p-8 max-w-3xl mx-auto my-4 rounded-2xl bg-white dark:bg-[#0F172A] border-2 border-rose-200 dark:border-rose-900/60 shadow-lg space-y-5 text-slate-800 dark:text-slate-200"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  Heal Workspace Recovery Guard
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Engine: {activeVersionId}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Self-Healing Workspace Interrupted Safely
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                A component error occurred in the Heal Workspace. Your original dataset, projects, and model history remain completely intact. Select a recovery action below.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Heal Workspace</span>
            </button>

            <button
              type="button"
              onClick={this.props.onBackToExplorer}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dataset Explorer</span>
            </button>

            <button
              type="button"
              disabled={isSwitchingVersion}
              onClick={this.handleUsePreviousStable}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isSwitchingVersion ? 'Switching to v1.8...' : 'Use Previous Stable Heal Version'}</span>
            </button>

            <button
              type="button"
              onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>View Error Details</span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showDetails && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-[11px] font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Error ID:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{errorId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="text-slate-700 dark:text-slate-300">{timestamp}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Project ID / Dataset ID:</span>
                <span className="text-slate-700 dark:text-slate-300">{projectId || 'prj_default'} / {datasetId || 'none'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Failed Stage:</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">{failedStage}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block mb-1">Safe Diagnostic Summary:</span>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 break-words">
                  {safeMessage}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
