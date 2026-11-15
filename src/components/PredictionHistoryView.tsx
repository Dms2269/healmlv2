/**
 * HEALML Enterprise – Prediction History & Inference Explorer
 * Displays batch inference logs, feature inputs, model confidence scores,
 * and live test inference execution.
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  Cpu,
  Search,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Dataset, ModelMetrics } from '../types/pipeline';
import { ProjectItem } from '../types/auth';

interface PredictionHistoryViewProps {
  dataset: Dataset;
  metrics?: ModelMetrics;
  activeProject?: ProjectItem | null;
  onNavigateTab: (tab: string) => void;
}

interface PredictionItem {
  id: string;
  timestamp: string;
  modelName: string;
  modelVersion: string;
  inputFeatures: Record<string, any>;
  prediction: string | number;
  confidence: number;
  latencyMs: number;
  status: 'NOMINAL' | 'ANOMALOUS';
}

export const PredictionHistoryView: React.FC<PredictionHistoryViewProps> = ({
  dataset,
  metrics,
  activeProject,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PredictionItem[]>(() => [
    {
      id: 'pred_894101',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString(),
      modelName: 'Random Forest Classifier',
      modelVersion: 'v1.0',
      inputFeatures: { temperature_c: 68.4, vibration_mm_s: 2.15, pressure_bar: 4.8, rpm: 2950 },
      prediction: 0,
      confidence: 0.942,
      latencyMs: 1.4,
      status: 'NOMINAL',
    },
    {
      id: 'pred_894102',
      timestamp: new Date(Date.now() - 1000 * 60 * 8).toLocaleTimeString(),
      modelName: 'Random Forest Classifier',
      modelVersion: 'v1.0',
      inputFeatures: { temperature_c: 94.2, vibration_mm_s: 4.88, pressure_bar: 3.1, rpm: 3410 },
      prediction: 1,
      confidence: 0.885,
      latencyMs: 1.2,
      status: 'ANOMALOUS',
    },
    {
      id: 'pred_894103',
      timestamp: new Date(Date.now() - 1000 * 60 * 3).toLocaleTimeString(),
      modelName: 'Random Forest Classifier',
      modelVersion: 'v1.0',
      inputFeatures: { temperature_c: 72.1, vibration_mm_s: 2.31, pressure_bar: 4.6, rpm: 2990 },
      prediction: 0,
      confidence: 0.961,
      latencyMs: 1.3,
      status: 'NOMINAL',
    },
  ]);

  const [isSimulating, setIsSimulating] = useState(false);

  const handleRunInference = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const sampleRow = dataset.rows[Math.floor(Math.random() * dataset.rows.length)] || {};
      const targetCol = dataset.targetColumn || 'failure_flag';
      const actualVal = sampleRow[targetCol];
      const isAnom = Math.random() > 0.8;
      const predVal = isAnom ? (actualVal === 0 ? 1 : 0) : actualVal ?? 0;

      const featureInputs: Record<string, any> = {};
      dataset.columns.slice(0, 4).forEach((col) => {
        featureInputs[col.name] = sampleRow[col.name];
      });

      const newPred: PredictionItem = {
        id: `pred_${Math.floor(Math.random() * 900000 + 100000)}`,
        timestamp: new Date().toLocaleTimeString(),
        modelName: 'Random Forest Classifier',
        modelVersion: 'v1.0',
        inputFeatures: featureInputs,
        prediction: predVal,
        confidence: Number((0.85 + Math.random() * 0.14).toFixed(3)),
        latencyMs: Number((1.1 + Math.random() * 0.8).toFixed(1)),
        status: isAnom ? 'ANOMALOUS' : 'NOMINAL',
      };

      setPredictions((prev) => [newPred, ...prev]);
      setIsSimulating(false);
    }, 350);
  };

  const filtered = predictions.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.id.toLowerCase().includes(q) || String(p.prediction).includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Model Prediction & Inference History
            </h1>
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              Active Serving
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit trail of scoring requests, predicted machine states, target classifications, and inference latencies.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleRunInference}
            disabled={isSimulating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Running Inference...' : 'Score Live Sample Record'}</span>
          </button>
          <button
            onClick={() => onNavigateTab('model_history')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1"
          >
            <span>Model Versions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Predictions</div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{predictions.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Logged inferences</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Average Latency</div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">1.3 ms</div>
          <div className="text-[11px] text-slate-500 mt-1">Real-time throughput</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Model Accuracy</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {metrics ? `${(metrics.accuracy * 100).toFixed(1)}%` : '92.5%'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Holdout test split</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Target Feature</div>
          <div className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400 truncate mt-1">
            {dataset.targetColumn || 'failure_flag'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active predictive target</div>
        </div>
      </div>

      {/* Prediction Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by prediction ID or output..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing {filtered.length} scoring records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                <th className="py-2.5 px-3">Prediction ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Sample Features</th>
                <th className="py-2.5 px-3">Predicted Value</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {p.id}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                    {p.timestamp}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-medium">
                    {p.modelName} <span className="text-[10px] text-slate-400 font-mono">({p.modelVersion})</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    {Object.entries(p.inputFeatures)
                      .map(([k, v]) => `${k}:${v}`)
                      .slice(0, 3)
                      .join(', ')}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                      {String(p.prediction)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {(p.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {p.latencyMs} ms
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      p.status === 'NOMINAL'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      {p.status === 'NOMINAL' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      <span>{p.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
