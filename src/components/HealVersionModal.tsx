/**
 * HEALML Enterprise – Heal Engine Version Management & Safe Rollback Modal
 * Displays only genuine implemented Heal Engine versions (v2.0 and v1.8),
 * full 4-layer compatibility status (Heal Engine, Repair Policy, Dataset Schema, Model Artifacts),
 * and requires explicit confirmation before rolling back or restoring versions.
 */

import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Clock,
  GitBranch,
  X,
  ArrowRight,
  Layers,
} from 'lucide-react';
import {
  HealEngineVersionId,
  HealEngineVersionInfo,
  CompatibilityValidationResult,
  validateHealEngineCompatibility,
} from '../services/healEngineVersions';
import { Dataset } from '../types/pipeline';

interface HealVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeVersionId: HealEngineVersionId;
  versions: HealEngineVersionInfo[];
  dataset: Dataset;
  modelTarget?: string;
  modelFeatures?: string[];
  onConfirmSwitchVersion: (targetVersionId: HealEngineVersionId, reason: string) => Promise<void>;
}

export const HealVersionModal: React.FC<HealVersionModalProps> = ({
  isOpen,
  onClose,
  activeVersionId,
  versions,
  dataset,
  modelTarget,
  modelFeatures,
  onConfirmSwitchVersion,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<HealEngineVersionId>(
    activeVersionId === 'v2.0' ? 'v1.8' : 'v2.0'
  );
  const [reason, setReason] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  if (!isOpen) return null;

  const candidateCompatibility: CompatibilityValidationResult = validateHealEngineCompatibility(
    selectedCandidateId,
    dataset,
    modelTarget,
    modelFeatures
  );

  const selectedVersionObj = versions.find((v) => v.id === selectedCandidateId) || versions[0];
  const isRollbackAction = selectedCandidateId === 'v1.8';

  const handleConfirm = async () => {
    if (!candidateCompatibility.compatible) {
      setSwitchError(candidateCompatibility.blockingReason || 'Compatibility validation blocked this version switch.');
      return;
    }
    setIsSwitching(true);
    setSwitchError(null);
    try {
      const defaultReason = isRollbackAction
        ? 'Rolled back to Previous Stable Heal Engine (v1.8) for verified deterministic execution'
        : 'Restored Current Production Heal Engine (v2.0)';
      await onConfirmSwitchVersion(selectedCandidateId, (reason || '').trim() || defaultReason);
      onClose();
    } catch (err: any) {
      setSwitchError(err?.message || 'Failed to switch Heal Engine version.');
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div
      data-testid="heal-version-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Self-Healing Engine Version Control & Rollback
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a verified project engine release. Existing datasets, projects, and model artifacts remain untouched.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {versions.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
              <div className="font-bold text-slate-900 dark:text-white">No Real Previous Stable Version Found</div>
              <p className="text-slate-500 dark:text-slate-400">
                The platform does not have an alternate engine build registered in the repository.
              </p>
            </div>
          ) : (
            <>
              {/* Real Version List */}
              <div className="space-y-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                  Available Registered Engine Versions ({versions.length})
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {versions.map((ver) => {
                    const isSelected = selectedCandidateId === ver.id;
                    const isCurrentActive = activeVersionId === ver.id;

                    return (
                      <div
                        key={ver.id}
                        onClick={() => setSelectedCandidateId(ver.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all space-y-2.5 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                            {ver.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              isCurrentActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                : ver.status === 'ROLLED_BACK'
                                ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}
                          >
                            {isCurrentActive ? 'ACTIVE' : ver.status}
                          </span>
                        </div>

                        <div className="font-bold text-slate-800 dark:text-slate-100">{ver.name}</div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{ver.summary}</p>

                        <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 space-y-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          <div className="flex justify-between">
                            <span>Release Date:</span>
                            <span className="text-slate-800 dark:text-slate-200">{ver.releaseDate}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Last Test Pass:</span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {String(ver?.lastSuccessfulTestDate ?? '').split('T')[0] || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Policy Config:</span>
                            <span className="text-blue-600 dark:text-blue-400">{ver.policyConfigVersion}</span>
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
                          <strong className="text-slate-800 dark:text-slate-200">Known Issues / Notes: </strong>
                          {ver.knownIssues}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4-Layer Compatibility Matrix for Selected Candidate */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Pre-Switch Compatibility Validation ({selectedCandidateId})</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      candidateCompatibility.summaryStatus === 'COMPATIBLE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : candidateCompatibility.summaryStatus === 'COMPATIBLE_WITH_WARNINGS'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                    }`}
                  >
                    {candidateCompatibility.summaryStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {candidateCompatibility.checks.map((chk) => (
                    <div
                      key={chk.layer}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{chk.label}</span>
                        {chk.status === 'COMPATIBLE' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : chk.status === 'WARNING' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-blue-600 dark:text-blue-400">{chk.versionOrRef}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">{chk.details}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason & Confirmation */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Audit Reason for Version Change (Logged to Recovery Ledger)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    isRollbackAction
                      ? 'e.g. Switching to previous stable v1.8 for conservative Median/IQR handling'
                      : 'e.g. Restoring latest v2.0 production engine'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {switchError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                  {switchError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/60">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Raw datasets & model version history remain untouched</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Cancel
            </button>

            {selectedCandidateId !== activeVersionId && (
              <button
                type="button"
                disabled={isSwitching || !candidateCompatibility.compatible}
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  isRollbackAction
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {isSwitching
                    ? 'Applying Version Switch...'
                    : isRollbackAction
                    ? `Confirm Switch to ${selectedVersionObj.id} (Previous Stable)`
                    : `Restore Current Version (${selectedVersionObj.id})`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
