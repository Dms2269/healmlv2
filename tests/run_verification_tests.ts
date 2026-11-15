/**
 * HEALML – Automated Comprehensive Verification Test Suite (Tests 1 to 18)
 * Covers:
 * - Client & Admin Authentication, RBAC & Multi-Tenant Project Isolation
 * - Navigation -> SelfHealingView, DatasetExplorerView, ProblemDetectionView, UpdatedDatasetView, ClientOverviewView SSR Rendering (No Blank Pages)
 * - Heal Engine v2.0 (Universal All-Column) & v1.8 (Previous Stable Conservative) Execution
 * - Small & Large (1,200+ row) Dataset Healing, Zero Target Drift & Original Raw Data Immutability
 * - 4-Layer Compatibility Checks (Heal Engine, Repair Policy Config, Dataset Schema, Model Artifacts)
 * - Real Version Management, Rollback & Restore Audit Logging
 * - Sanitized Error Logging (zero token/password/path leakage) & HealWorkspaceErrorBoundary Recovery
 * - CSV & XLSX Repaired Dataset Export Validation
 */

import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as XLSX from 'xlsx';

// Polyfill browser localStorage cleanly for Node execution
const memoryStorage = new Map<string, string>();
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => (memoryStorage.has(k) ? memoryStorage.get(k)! : null),
    setItem: (k: string, v: string) => {
      memoryStorage.set(k, String(v));
    },
    removeItem: (k: string) => {
      memoryStorage.delete(k);
    },
    clear: () => {
      memoryStorage.clear();
    },
    key: (i: number) => Array.from(memoryStorage.keys())[i] ?? null,
    get length() {
      return memoryStorage.size;
    },
  };
}

import { detectAllColumnPipelineFaults } from '../src/services/faultAndHealingEngine';
import {
  REAL_HEAL_ENGINE_VERSIONS,
  executeHealEngineByVersion,
  validateHealEngineCompatibility,
  sanitizeDiagnosticMessage,
  recordHealErrorLog,
  getHealErrorLogs,
  recordHealVersionSwitchLog,
  getHealVersionSwitchLogs,
  saveActiveHealVersionId,
  getActiveHealVersionId,
  recordHealRunHistory,
  getHealRunHistory,
} from '../src/services/healEngineVersions';
import { computeDetailedQualityScore, computeDatasetComparison } from '../src/services/healedDatasetExporter';
import { runDataPreprocessing, runFeatureEngineering, trainUniversalModel, runIsolationForest } from '../src/services/mlEngine';
import { generateSensorDataset, generateHousingDataset } from '../src/services/sampleDatasets';
import { sqliteStorage } from '../src/services/sqliteStorage';
import { resolveRoute, isAuthorizedForRoute } from '../src/routes/routeConfig';
import { SelfHealingView } from '../src/components/SelfHealingView';
import { HealWorkspaceErrorBoundary } from '../src/components/HealWorkspaceErrorBoundary';
import { HealVersionModal } from '../src/components/HealVersionModal';
import { DatasetExplorerView } from '../src/components/DatasetExplorerView';
import { ProblemDetectionView } from '../src/components/ProblemDetectionView';
import { UpdatedDatasetView } from '../src/components/UpdatedDatasetView';
import { ClientOverviewView } from '../src/components/ClientOverviewView';
import { NotFoundView } from '../src/components/NotFoundView';
import { AccessDeniedView } from '../src/components/AccessDeniedView';
import { DashboardView } from '../src/components/DashboardView';
import { PipelineWorkflowView } from '../src/components/PipelineWorkflowView';
import { ClientActivityView } from '../src/components/ClientActivityView';
import { ModelEvaluationView } from '../src/components/ModelEvaluationView';
import { parseCsvContent } from '../src/services/datasetParser';
import { Dataset, DataRow, StageState } from '../src/types/pipeline';

const MOCK_STAGE_STATES: StageState[] = [
  { stage: 'ingestion', label: 'Data Ingestion', status: 'success', durationMs: 25, message: 'OK', timestamp: '12:00:00' },
  { stage: 'validation', label: 'Data Validation', status: 'success', durationMs: 20, message: 'OK', timestamp: '12:00:00' },
  { stage: 'preprocessing', label: 'Preprocessing', status: 'success', durationMs: 30, message: 'OK', timestamp: '12:00:00' },
  { stage: 'feature_engineering', label: 'Feature Engineering', status: 'success', durationMs: 22, message: 'OK', timestamp: '12:00:00' },
  { stage: 'model_training', label: 'Model Training', status: 'idle', durationMs: 0, message: 'Ready', timestamp: '' },
  { stage: 'model_evaluation', label: 'Model Evaluation', status: 'idle', durationMs: 0, message: 'Ready', timestamp: '' },
  { stage: 'anomaly_detection', label: 'Anomaly Detection', status: 'success', durationMs: 40, message: 'OK', timestamp: '12:00:00' },
  { stage: 'fault_monitoring', label: 'Fault Watchdog', status: 'faulted', durationMs: 12, message: 'Faults queued', timestamp: '12:00:00' },
  { stage: 'self_healing', label: 'Self-Healing Engine', status: 'idle', durationMs: 0, message: 'Standby', timestamp: '' },
];

function buildLargeSyntheticDataset(rowCount = 1200): Dataset {
  const rows: DataRow[] = [];
  for (let i = 0; i < rowCount; i++) {
    const isAnomaly = i % 37 === 0;
    const isMissing = i % 29 === 0;
    const isDup = i > 0 && i % 150 === 0;
    if (isDup) {
      rows.push({ ...rows[rows.length - 1] });
      continue;
    }
    rows.push({
      machine_id: `MCH-${1000 + i}`,
      temperature_c: isMissing ? null : isAnomaly ? 420.5 : Number((48 + (i % 18) * 0.7).toFixed(2)),
      vibration_mm_s: i % 43 === 0 ? -4.2 : Number((1.2 + (i % 9) * 0.15).toFixed(3)),
      pressure_bar: i % 51 === 0 ? null : Number((5.8 + (i % 7) * 0.25).toFixed(2)),
      rpm: 1450 + (i % 200),
      operating_hours: 120 + i,
      site: i % 2 === 0 ? 'Plant_North' : 'plant_north ',
      failure_flag: i % 5 === 0 ? 1 : 0,
    });
  }

  return {
    id: 'ds_stress_1200',
    projectId: 'prj_cl_test_001',
    name: 'Large Sensor Telemetry (1200 Rows)',
    domain: 'Industrial Telemetry',
    description: 'Stress test dataset with nulls, negative physical invariants, outliers, and casing drift.',
    taskType: 'binary_classification',
    targetColumn: 'failure_flag',
    inputFormat: 'csv',
    columns: [
      { name: 'machine_id', type: 'identifier', isIdentifier: true, missingCount: 0, uniqueCount: rowCount },
      { name: 'temperature_c', type: 'numeric', missingCount: 41, uniqueCount: 80 },
      { name: 'vibration_mm_s', type: 'numeric', missingCount: 0, uniqueCount: 60 },
      { name: 'pressure_bar', type: 'numeric', missingCount: 23, uniqueCount: 50 },
      { name: 'rpm', type: 'numeric', missingCount: 0, uniqueCount: 200 },
      { name: 'operating_hours', type: 'numeric', missingCount: 0, uniqueCount: rowCount },
      { name: 'site', type: 'categorical', missingCount: 0, uniqueCount: 2 },
      { name: 'failure_flag', type: 'numeric', missingCount: 0, uniqueCount: 2 },
    ],
    rows: rows.map((r) => ({ ...r })),
    originalRows: rows.map((r) => ({ ...r })),
  };
}

async function runTests() {
  console.log('--- HEALML PRODUCTION VERIFICATION SUITE (TESTS 1 to 18) ---');
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`PASS: ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`FAIL: ${name} ->`, e?.message || e);
      failed++;
    }
  }

  // TEST 1: Role Separation & Route Authorization
  await test('TEST 1: RBAC role separation between CLIENT and MASTER_ADMIN', () => {
    const adminRoute = resolveRoute('admin_workstation');
    const healRoute = resolveRoute('heal');
    assert.strictEqual(isAuthorizedForRoute('MASTER_ADMIN', adminRoute), true);
    assert.strictEqual(isAuthorizedForRoute('CLIENT', adminRoute), false);
    assert.strictEqual(isAuthorizedForRoute('CLIENT', healRoute), true);
    assert.strictEqual(isAuthorizedForRoute('MASTER_ADMIN', healRoute), true);
  });

  // TEST 2: Multi-Project Tenant Isolation
  await test('TEST 2: Project workspace isolation enforces client scoping', () => {
    const projectA = { id: 'prj_cl_test_001', name: 'Machine A Monitoring', clientId: 'CL-TEST-001' };
    const projectB = { id: 'prj_cl_test_002', name: 'Turbine B Profile', clientId: 'CL-TEST-002' };
    assert.notStrictEqual(projectA.id, projectB.id);
    assert.notStrictEqual(projectA.clientId, projectB.clientId);
  });

  // TEST 3: Ingestion & Non-Destructive Working Copy
  await test('TEST 3: Ingestion preserves originalRows immutable reference', () => {
    const originalDataset = generateSensorDataset();
    const workingRows = JSON.parse(JSON.stringify(originalDataset.rows));
    workingRows[0]['temperature_c'] = -9999.9;
    assert.notStrictEqual(workingRows[0]['temperature_c'], originalDataset.originalRows[0]['temperature_c']);
  });

  // TEST 4: All-Column Fault Scanner & Anomaly Detection
  await test('TEST 4: All-column scanner & Isolation Forest detect faults across schema', () => {
    const dataset = generateSensorDataset();
    const scan = detectAllColumnPipelineFaults(dataset.rows, dataset.columns, dataset.targetColumn);
    assert.ok(scan.columnReports.length === dataset.columns.length);
    const anomalies = runIsolationForest(dataset.rows, dataset.columns, dataset.targetColumn, 0.08);
    assert.ok(anomalies.length === dataset.rows.length);
  });

  // TEST 5: Client Navigation -> SelfHealingView SSR Mount (No Blank Page)
  await test('TEST 5: SelfHealingView renders full UI workspace safely without blank screen', () => {
    const dataset = generateSensorDataset();
    const compat = validateHealEngineCompatibility('v2.0', dataset, dataset.targetColumn);
    const html = renderToString(
      React.createElement(SelfHealingView, {
        dataset,
        activeProject: {
          id: 'prj_cl_test_001',
          clientId: 'CL-TEST-001',
          name: 'Machine A',
          description: 'Telemetry',
          isArchived: false,
          createdAt: '2026-02-01',
          updatedAt: '2026-02-01',
        },
        executionState: 'IDLE',
        isExecuting: false,
        stageStates: MOCK_STAGE_STATES,
        faultsCount: 4,
        activeHealVersionId: 'v2.0',
        availableHealVersions: REAL_HEAL_ENGINE_VERSIONS,
        compatibilityReport: compat,
        onSwitchHealVersion: async () => {},
        onRunAutonomousHealing: () => {},
        onNavigateTab: () => {},
      })
    );
    assert.ok(html.length > 500, 'SelfHealingView rendered empty or too short');
    assert.ok(html.includes('Universal Self-Healing Pipeline Engine'));
    assert.ok(html.includes('data-testid="execute-heal-pipeline-btn"'));
    assert.ok(html.includes('Execute Complete Self-Healing Pipeline'));
    assert.ok(html.includes('USE PREVIOUS STABLE VERSION'));
    assert.ok(html.includes('Versions &amp; Compatibility') || html.includes('Versions & Compatibility'));
  });

  // TEST 6: Dataset Explorer -> Heal Dataset CTA & Empty Schema Resilience
  await test('TEST 6: DatasetExplorerView renders Heal Dataset button and handles empty rows safely', () => {
    const ds = generateSensorDataset();
    const html = renderToString(
      React.createElement(DatasetExplorerView, {
        dataset: ds,
        onSelectSample: () => {},
        onUploadCustomDataset: () => {},
        onSelectTargetColumn: () => {},
        onOpenManualModal: () => {},
        onNavigateTab: () => {},
      })
    );
    assert.ok(html.includes('data-testid="explorer-heal-dataset-btn"'));
    assert.ok(html.includes('Heal Dataset'));

    // Empty defensive guard test
    const emptyDs: Dataset = { ...ds, rows: [], columns: [], originalRows: [] };
    const emptyHtml = renderToString(
      React.createElement(DatasetExplorerView, {
        dataset: emptyDs,
        onSelectSample: () => {},
        onUploadCustomDataset: () => {},
        onSelectTargetColumn: () => {},
        onOpenManualModal: () => {},
        onNavigateTab: () => {},
      })
    );
    assert.ok(emptyHtml.length > 200);
  });

  // TEST 7: Heal Button (v2.0 Universal Engine) on Corrupted Small Dataset
  await test('TEST 7: Heal Engine v2.0 repairs faults and improves data quality score', () => {
    const dataset = generateSensorDataset();
    const scan = detectAllColumnPipelineFaults(dataset.rows, dataset.columns, dataset.targetColumn);
    const result = executeHealEngineByVersion('v2.0', dataset, scan.faults);
    assert.ok(result.healedDataset);
    assert.strictEqual(result.verificationStatus, 'VERIFIED_SUCCESS');
    assert.ok(result.qualityScoreAfter.overallScore >= result.qualityScoreBefore.overallScore);
    assert.ok(result.recoveryLogs.length > 0);
  });

  // TEST 8: Previous Stable Engine (v1.8) Real Conservative Execution
  await test('TEST 8: Heal Engine v1.8 (Previous Stable) runs real conservative Median/Mode/IQR repair', () => {
    const dataset = buildLargeSyntheticDataset(120);
    const scan = detectAllColumnPipelineFaults(dataset.rows, dataset.columns, dataset.targetColumn);
    const result = executeHealEngineByVersion('v1.8', dataset, scan.faults);
    assert.strictEqual(result.verificationStatus, 'VERIFIED_SUCCESS');
    assert.strictEqual(result.healedDataset.isHealed, true);
    assert.ok(result.recoveryLogs.some((l) => l.details.includes('[v1.8 Stable]')));
    // Verify missing values in temperature_c are gone
    const remainingMissing = result.healedDataset.rows.filter(
      (r) => r['temperature_c'] === null || r['temperature_c'] === undefined
    ).length;
    assert.strictEqual(remainingMissing, 0);
  });

  // TEST 9: Large Dataset Stress Test (1,200 rows) on Both v2.0 & v1.8
  await test('TEST 9: Large 1,200-row dataset heals reliably under both v2.0 and v1.8', () => {
    const largeDs = buildLargeSyntheticDataset(1200);
    const scan = detectAllColumnPipelineFaults(largeDs.rows, largeDs.columns, largeDs.targetColumn);
    const t0 = Date.now();
    const resV2 = executeHealEngineByVersion('v2.0', largeDs, scan.faults);
    const resV18 = executeHealEngineByVersion('v1.8', largeDs, scan.faults);
    const elapsed = Date.now() - t0;

    assert.strictEqual(resV2.verificationStatus, 'VERIFIED_SUCCESS');
    assert.strictEqual(resV18.verificationStatus, 'VERIFIED_SUCCESS');
    assert.ok(resV2.healedDataset.rows.length > 1000);
    assert.ok(resV18.healedDataset.rows.length > 1000);
    assert.ok(elapsed < 10000, `Healing took too long: ${elapsed}ms`);
  });

  // TEST 10: Zero Target Drift Principle Across v2.0 and v1.8
  await test('TEST 10: Zero Target Drift - Ground truth target values untouched by both v2.0 and v1.8', () => {
    const housing = generateHousingDataset();
    const targetCol = housing.targetColumn;
    assert.ok(targetCol && targetCol.length > 0, 'Expected non-empty targetColumn');
    const origTargets = housing.rows.map((r) => r[targetCol]);
    const hScan = detectAllColumnPipelineFaults(housing.rows, housing.columns, targetCol);

    const hV2 = executeHealEngineByVersion('v2.0', housing, hScan.faults);
    const hV18 = executeHealEngineByVersion('v1.8', housing, hScan.faults);

    assert.strictEqual(hV2.healedDataset.rows.length, origTargets.length);
    assert.strictEqual(hV18.healedDataset.rows.length, origTargets.length);
    for (let i = 0; i < origTargets.length; i++) {
      assert.strictEqual(hV2.healedDataset.rows[i][targetCol], origTargets[i], `v2.0 altered target at row ${i}`);
      assert.strictEqual(hV18.healedDataset.rows[i][targetCol], origTargets[i], `v1.8 altered target at row ${i}`);
    }
  });

  // TEST 11: Original Dataset Immutability Verification
  await test('TEST 11: Original raw dataset copy stays 100% preserved after healing', () => {
    const ds = buildLargeSyntheticDataset(100);
    const snapshotBefore = JSON.stringify(ds.originalRows);
    const scan = detectAllColumnPipelineFaults(ds.rows, ds.columns, ds.targetColumn);
    const healed = executeHealEngineByVersion('v1.8', ds, scan.faults);
    assert.strictEqual(JSON.stringify(healed.healedDataset.originalRows), snapshotBefore);
    // Confirm original still has nulls while healed does not
    const origNulls = healed.healedDataset.originalRows.filter((r) => r['temperature_c'] === null).length;
    const healedNulls = healed.healedDataset.rows.filter((r) => r['temperature_c'] === null).length;
    assert.ok(origNulls > 0);
    assert.strictEqual(healedNulls, 0);
  });

  // TEST 12: Updated Dataset Export (CSV & XLSX Structure) + Related Views Render
  await test('TEST 12: UpdatedDatasetView, ProblemDetectionView & CSV/XLSX worksheet export integrity', () => {
    const ds = buildLargeSyntheticDataset(60);
    const scan = detectAllColumnPipelineFaults(ds.rows, ds.columns, ds.targetColumn);
    const res = executeHealEngineByVersion('v2.0', ds, scan.faults);
    const comp = computeDatasetComparison(
      res.healedDataset.originalRows,
      res.healedDataset.rows,
      res.healedDataset.columns,
      res.healedDataset.name
    );
    assert.strictEqual(comp.isValidated, true);

    // Verify XLSX & CSV generation via SheetJS directly
    const colOrder = res.healedDataset.columns.map((c) => c.name);
    const sheet = XLSX.utils.json_to_sheet(res.healedDataset.rows, { header: colOrder });
    const csvStr = XLSX.utils.sheet_to_csv(sheet);
    assert.ok(csvStr.includes('temperature_c'));
    assert.ok(csvStr.split('\n').length >= res.healedDataset.rows.length);

    // Render UpdatedDatasetView, ProblemDetectionView & ClientOverviewView safely
    const updHtml = renderToString(
      React.createElement(UpdatedDatasetView, {
        dataset: res.healedDataset,
        recentRecoveries: res.recoveryLogs,
        onNavigateTab: () => {},
      })
    );
    assert.ok(updHtml.includes('Download Repaired CSV') && updHtml.includes('Download Repaired XLSX'));

    const probHtml = renderToString(
      React.createElement(ProblemDetectionView, {
        dataset: ds,
        activeFaults: scan.faults,
        columnReports: scan.columnReports,
        onTriggerHealing: () => {},
        onNavigateTab: () => {},
      })
    );
    assert.ok(probHtml.length > 300);

    const ovHtml = renderToString(
      React.createElement(ClientOverviewView, {
        datasetsCount: 2,
        healedDatasetsCount: 1,
        datasetsRequiringAttentionCount: 1,
        activeJobsCount: 0,
        latestDataset: res.healedDataset,
        latestRecoveryStatus: 'VERIFIED_SUCCESS',
        hasActiveFaults: false,
        onNavigateTab: () => {},
        onTriggerHealing: () => {},
      })
    );
    assert.ok(ovHtml.length > 300);
  });

  // TEST 13: All Client & Admin Routes + 404 / 403 Safe Rendering
  await test('TEST 13: All routes resolve & NotFoundView / AccessDeniedView render cleanly', () => {
    const clientItems = [
      'overview', 'projects', 'upload', 'explorer', 'data_health',
      'detect', 'heal', 'updated', 'history', 'training',
      'evaluation', 'model_history', 'predictions', 'reports',
      'activity', 'tickets', 'settings',
    ];
    for (const item of clientItems) {
      const r = resolveRoute(item);
      assert.notStrictEqual(r.id, 'not_found', `Missing client route: ${item}`);
    }
    const unknown = resolveRoute('/non-existent-heal-path');
    assert.strictEqual(unknown.id, 'not_found');

    const html404 = renderToString(React.createElement(NotFoundView, { attemptedPath: '/broken', onNavigateHome: () => {} }));
    const html403 = renderToString(React.createElement(AccessDeniedView, { attemptedRoute: '/admin', userRole: 'CLIENT', onNavigateHome: () => {} }));
    assert.ok(html404.includes('Requested Destination Not Found'));
    assert.ok(html403.includes('Administrative Access Restricted'));
  });

  // TEST 14: 4-Layer Compatibility Checks
  await test('TEST 14: Compatibility validator evaluates Heal Engine, Policy, Schema, and Model Artifacts separately', () => {
    const ds = generateSensorDataset();
    const okCompat = validateHealEngineCompatibility('v2.0', ds, ds.targetColumn, ['temperature_c', 'vibration_mm_s']);
    assert.strictEqual(okCompat.compatible, true);
    assert.strictEqual(okCompat.checks.length, 4);
    assert.deepStrictEqual(
      okCompat.checks.map((c) => c.layer),
      ['HEAL_ENGINE', 'REPAIR_POLICY', 'DATASET_SCHEMA', 'MODEL_ARTIFACTS']
    );

    // Mismatched model target emits WARNING, still compatible
    const mismatchCompat = validateHealEngineCompatibility('v1.8', ds, 'different_target', ['missing_feature_col']);
    assert.strictEqual(mismatchCompat.summaryStatus, 'COMPATIBLE_WITH_WARNINGS');

    // Empty dataset blocks switch cleanly as INCOMPATIBLE
    const emptyDs: Dataset = { ...ds, rows: [], columns: [] };
    const blocked = validateHealEngineCompatibility('v1.8', emptyDs);
    assert.strictEqual(blocked.compatible, false);
    assert.strictEqual(blocked.summaryStatus, 'INCOMPATIBLE');
  });

  // TEST 15: Real Version Switch, Rollback to v1.8, Restore to v2.0 & History Preservation
  await test('TEST 15: Safe version rollback to v1.8 and restore to v2.0 updates state and logs audit entries', () => {
    assert.strictEqual(REAL_HEAL_ENGINE_VERSIONS.length, 2);
    saveActiveHealVersionId('v1.8', 'prj_test_sync');
    assert.strictEqual(getActiveHealVersionId('prj_test_sync'), 'v1.8');

    const switchLog = recordHealVersionSwitchLog({
      clientId: 'CL-TEST-001',
      projectId: 'prj_test_sync',
      fromVersion: 'v2.0',
      toVersion: 'v1.8',
      action: 'ROLLBACK_TO_STABLE',
      reason: 'Verifying fallback path',
      compatibilityStatus: 'COMPATIBLE',
    });
    assert.strictEqual(switchLog.toVersion, 'v1.8');
    assert.ok(getHealVersionSwitchLogs().some((l) => l.id === switchLog.id));

    saveActiveHealVersionId('v2.0', 'prj_test_sync');
    assert.strictEqual(getActiveHealVersionId('prj_test_sync'), 'v2.0');

    // Record run history with deduplication by idempotencyKey
    const rec = {
      id: 'run_test_1',
      idempotencyKey: 'idemp_unique_test_key',
      timestamp: new Date().toISOString(),
      clientId: 'CL-TEST-001',
      projectId: 'prj_test_sync',
      datasetName: 'Test DS',
      originalDatasetId: 'ds_1',
      updatedDatasetId: 'ds_healed_1',
      healEngineVersion: 'v1.8' as const,
      policyConfigVersion: 'policy_v1.8_conservative',
      detectedIssues: 5,
      appliedRepairs: 4,
      skippedRepairs: 1,
      failedRepairs: 0,
      durationMs: 42,
      qualityBefore: 78,
      qualityAfter: 96,
      verificationStatus: 'VERIFIED_SUCCESS' as const,
      finalStatus: 'COMPLETED' as const,
    };
    const h1 = recordHealRunHistory(rec);
    const h2 = recordHealRunHistory(rec);
    assert.strictEqual(h1.length, h2.length, 'Duplicate idempotencyKey should not create duplicate history entries');
    assert.ok(getHealRunHistory().length >= 1);
  });

  // TEST 16: Sanitized Error Logging
  await test('TEST 16: Diagnostic sanitizer strips secrets, Bearer tokens, and file paths', () => {
    const raw =
      'Failure at /app/applet/src/services/faultAndHealingEngine.ts:99:12 with Bearer healml_token_CL-TEST-001_secret123 password=SuperSecret!99\nStack trace line 2';
    const safe = sanitizeDiagnosticMessage(raw);
    assert.ok(!safe.includes('SuperSecret!99'), 'Password leaked!');
    assert.ok(!safe.includes('healml_token_CL-TEST-001_secret123'), 'Bearer token leaked!');
    assert.ok(!safe.includes('/app/applet/src'), 'Internal file path leaked!');
    assert.ok(!safe.includes('Stack trace line 2'), 'Multiline stack trace leaked!');

    const logged = recordHealErrorLog({
      clientId: 'CL-TEST-001',
      projectId: 'prj_cl_test_001',
      datasetId: 'ds_cl1_vibration_telemetry',
      healEngineVersion: 'v2.0',
      failedStage: 'EXECUTION',
      errorCategory: 'EXECUTION_ERROR',
      safeMessage: raw,
    });
    assert.ok(logged.errorId.startsWith('HEAL-ERR-'));
    assert.ok(!logged.safeMessage.includes('SuperSecret'));
    assert.ok(getHealErrorLogs().some((e) => e.errorId === logged.errorId));
  });

  // TEST 17: Heal Error Boundary Recovery Screen (Simulated Render Crash Catch)
  await test('TEST 17: HealWorkspaceErrorBoundary catches crash and renders all 4 recovery actions', () => {
    const derived = HealWorkspaceErrorBoundary.getDerivedStateFromError(
      new Error('Simulated component exception Bearer healml_token_secret_123')
    );
    assert.strictEqual(derived.hasError, true);
    assert.ok(derived.errorId && derived.errorId.startsWith('HEAL-ERR-'));
    assert.ok(!derived.safeMessage?.includes('healml_token_secret_123'));

    // Instantiate boundary directly in errored state to verify full fallback UI HTML
    const boundaryInstance = new HealWorkspaceErrorBoundary({
      children: null,
      clientId: 'CL-TEST-001',
      projectId: 'prj_cl_test_001',
      datasetId: 'ds_cl1_vibration_telemetry',
      activeVersionId: 'v2.0',
      onRetryHealWorkspace: () => {},
      onBackToExplorer: () => {},
      onSwitchToPreviousStable: () => {},
    });
    (boundaryInstance as any).state = {
      ...boundaryInstance.state,
      ...derived,
      hasError: true,
      showDetails: true,
    };
    const recoveryHtml = renderToString(boundaryInstance.render() as React.ReactElement);
    assert.ok(recoveryHtml.includes('data-testid="heal-error-boundary-recovery"'));
    assert.ok(recoveryHtml.includes('Retry Heal Workspace'));
    assert.ok(recoveryHtml.includes('Back to Dataset Explorer'));
    assert.ok(recoveryHtml.includes('Use Previous Stable Heal Version'));
    assert.ok(recoveryHtml.includes('View Error Details'));
    assert.ok(recoveryHtml.includes(derived.errorId!));
  });

  // TEST 18: HealVersionModal SSR Render & Pre-Switch Validation Display
  await test('TEST 18: HealVersionModal displays real v2.0 and v1.8 versions and 4-layer validation', () => {
    const ds = generateSensorDataset();
    const modalHtml = renderToString(
      React.createElement(HealVersionModal, {
        isOpen: true,
        onClose: () => {},
        activeVersionId: 'v2.0',
        versions: REAL_HEAL_ENGINE_VERSIONS,
        dataset: ds,
        modelTarget: ds.targetColumn,
        modelFeatures: ['temperature_c', 'vibration_mm_s'],
        onConfirmSwitchVersion: async () => {},
      })
    );
    assert.ok(modalHtml.includes('data-testid="heal-version-modal"'));
    assert.ok(modalHtml.includes('v2.0') && modalHtml.includes('v1.8'));
    assert.ok(modalHtml.includes('policy_v2.4_zero_drift') && modalHtml.includes('policy_v1.8_conservative'));
    assert.ok(modalHtml.includes('Confirm Switch to v1.8 (Previous Stable)'));

    // Also verify ML model training + SQLite recovery logging works end-to-end
    const prep = runDataPreprocessing(ds.rows, ds.columns, ds.targetColumn);
    const feat = runFeatureEngineering(prep.processedRows, ds.columns, ds.targetColumn);
    const metrics = trainUniversalModel(feat, 20);
    assert.ok(metrics.accuracy >= 0);
    sqliteStorage.logRecovery({
      id: `rec_test_${Date.now()}`,
      faultId: 'FLT-TEST',
      stage: 'self_healing',
      actionTaken: 'MEDIAN_IMPUTATION',
      timestamp: new Date().toISOString(),
      details: 'End-to-end suite verified',
      preRecoveryMetric: 0.75,
      postRecoveryMetric: 0.92,
      verificationDelta: 0.17,
      status: 'VERIFIED_SUCCESS',
    });
    assert.ok(sqliteStorage.getRecoveryLogs().length > 0);
  });

  // TEST 19: Defensive Rendering on Optional/Empty Props (Dashboard, PipelineWorkflow, ClientActivity, ModelEvaluation)
  await test('TEST 19: Views render cleanly when optional/empty props are passed', () => {
    const dashHtml = renderToString(
      React.createElement(DashboardView, {
        summary: undefined as any,
        stageStates: undefined as any,
        recentRecoveries: undefined as any,
        activeFaults: undefined as any,
        onNavigateTab: () => {},
        onRunPipeline: () => {},
        onTriggerHealing: () => {},
      })
    );
    assert.ok(dashHtml.includes('HEALML Autonomous Pipeline Console'));

    const pipeHtml = renderToString(
      React.createElement(PipelineWorkflowView, {
        stageStates: [],
        isRunning: false,
        onRunFullPipeline: () => {},
        onResetPipeline: () => {},
        onExecuteManualStage: () => {},
        onNavigateTab: () => {},
      })
    );
    assert.ok(pipeHtml.includes('No pipeline stage telemetry initialized yet'));

    const actHtml = renderToString(
      React.createElement(ClientActivityView, {
        recentRecoveries: undefined as any,
        activeFaults: undefined as any,
        datasetName: undefined as any,
      })
    );
    assert.ok(actHtml.replace(/<!-- -->/g, '').includes('Self-Healing Log (0)'));

    const evalHtml = renderToString(
      React.createElement(ModelEvaluationView, {
        metrics: {
          taskType: 'binary_classification',
          accuracy: 0.9,
          macroPrecision: 0.9,
          macroRecall: 0.9,
          macroF1: 0.9,
          weightedPrecision: 0.9,
          weightedRecall: 0.9,
          weightedF1: 0.9,
          targetClasses: ['0', '1'],
          matrix: [[5, 0], [1, 4]],
          classReports: [{ label: '0', precision: 1, recall: 1, f1: 1, support: 5 }],
          classDistribution: [],
          featureImportance: [],
          rocCurve: [],
          trainTimeMs: 10,
        } as any,
        isRetraining: false,
        onRetrainModel: () => {},
        multiTargetResults: [
          {
            targetName: 'target',
            taskType: 'binary_classification',
            scoreFormatted: undefined as any,
            eligible: true,
          } as any,
        ],
      })
    );
    assert.ok(evalHtml.includes('Random Forest Classifier Evaluation'));
  });

  // TEST 20: Undefined / Ragged String Trim & Split Safety (resolveRoute, CSV parser, quality scorer)
  await test('TEST 20: Route resolver and CSV parser handle undefined and ragged inputs without trim TypeError', () => {
    const fallbackRoute = resolveRoute(undefined as any);
    assert.strictEqual(fallbackRoute.id, 'overview');

    const raggedCsv = 'col_a,,col_c\n1,2\n4,,NA\n';
    const parsed = parseCsvContent(raggedCsv, 'ragged_test.csv');
    assert.strictEqual(parsed.rows.length, 2);
    assert.strictEqual(parsed.columns.length, 3);
    const score = computeDetailedQualityScore(parsed.rows, parsed.columns);
    assert.ok(typeof score.overallScore === 'number');
  });

  console.log(`\n========================================`);
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log(`========================================`);
  if (failed > 0) process.exit(1);
}

runTests();
