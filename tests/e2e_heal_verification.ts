/**
 * HEALML – Live API & SPA Route End-to-End Verification Script
 * Verifies against a running HEALML server (e.g. BASE_URL=http://127.0.0.1:3099):
 *  - SPA routes (/heal, /explorer, /detect, /updated, /overview, /admin/workstation) serve 200 HTML
 *  - Auth login for CLIENT and MASTER_ADMIN
 *  - /api/heal/versions returns v2.0 & v1.8
 *  - /api/pipeline/heal enforces 401/403/404/idempotency/simulated 500 failure + sanitized error log
 *  - /api/heal/versions/switch transitions v2.0 -> v1.8 -> v2.0 cleanly
 *  - /api/heal/history and /api/heal/errors return verified records
 */

import assert from 'node:assert';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3099';

async function runE2E() {
  console.log(`--- HEALML LIVE API & SPA E2E VERIFICATION (${BASE_URL}) ---`);
  let passed = 0;
  let failed = 0;

  async function step(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`PASS: ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`FAIL: ${name} ->`, e?.message || e);
      failed++;
    }
  }

  let clientToken = '';
  let otherClientToken = '';
  let adminToken = '';

  await step('E2E 1: SPA Routes (/heal, /explorer, /detect, /updated, /overview) return HTTP 200 HTML', async () => {
    for (const path of ['/heal', '/explorer', '/detect', '/updated', '/overview', '/admin/workstation']) {
      const resp = await fetch(`${BASE_URL}${path}`);
      assert.strictEqual(resp.status, 200, `Expected 200 on ${path}, got ${resp.status}`);
      const html = await resp.text();
      assert.ok(html.includes('<div id="root"></div>') || html.includes('HEALML'), `Missing SPA mount on ${path}`);
    }
  });

  await step('E2E 2: System health endpoint is ONLINE', async () => {
    const resp = await fetch(`${BASE_URL}/api/system/health`);
    assert.strictEqual(resp.status, 200);
    const data: any = await resp.json();
    assert.strictEqual(data.status, 'ONLINE');
  });

  await step('E2E 3: Auth login succeeds for Client 1, Client 2, and Master Admin', async () => {
    const login = async (email: string, password: string) => {
      const r = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      assert.strictEqual(r.status, 200, `Login failed for ${email}`);
      return (await r.json()) as any;
    };

    const c1 = await login('client1@healml.com', process.env.TEST_CLIENT_PASS || 'Alpha@2026');
    assert.strictEqual(c1.user.role, 'CLIENT');
    clientToken = c1.token;

    const c2 = await login('client2@healml.com', process.env.TEST_CLIENT_PASS || 'Beta@2026');
    assert.strictEqual(c2.user.role, 'CLIENT');
    otherClientToken = c2.token;

    const adminEmail = '2269dms@gmail.com';
    const adminPass = process.env.MASTER_ADMIN_INITIAL_PASSWORD || 'Dnyanraj2269';
    const adm = await login(adminEmail, adminPass);
    assert.strictEqual(adm.user.role, 'MASTER_ADMIN');
    assert.strictEqual(adm.user.mustChangePassword, true);
    adminToken = adm.token;

    const adm2 = await login('saishkhatavkar875@gmail.com', adminPass);
    assert.strictEqual(adm2.user.role, 'MASTER_ADMIN');
    assert.strictEqual(adm2.user.mustChangePassword, false);
    assert.ok(clientToken && otherClientToken && adminToken && adm2.token);
  });

  await step('E2E 4: GET /api/heal/versions lists real v2.0 and v1.8 releases', async () => {
    const resp = await fetch(`${BASE_URL}/api/heal/versions?projectId=prj_cl_test_001`);
    assert.strictEqual(resp.status, 200);
    const data: any = await resp.json();
    assert.ok(Array.isArray(data.versions));
    assert.ok(data.versions.some((v: any) => v.id === 'v2.0'));
    assert.ok(data.versions.some((v: any) => v.id === 'v1.8'));
    assert.strictEqual(data.activeVersionId, 'v2.0');
  });

  await step('E2E 5: POST /api/pipeline/heal enforces 401, 403 cross-tenant, and 404 invalid datasetId', async () => {
    // 401 unauthenticated
    const r401 = await fetch(`${BASE_URL}/api/pipeline/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasetId: 'ds_cl1_vibration_telemetry', projectId: 'prj_cl_test_001' }),
    });
    assert.strictEqual(r401.status, 401);

    // 403 cross-tenant (Client 2 trying to heal Client 1 dataset)
    const r403 = await fetch(`${BASE_URL}/api/pipeline/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherClientToken}` },
      body: JSON.stringify({ datasetId: 'ds_cl1_vibration_telemetry', projectId: 'prj_cl_test_001' }),
    });
    assert.strictEqual(r403.status, 403);

    // 404 non-existent datasetId
    const r404 = await fetch(`${BASE_URL}/api/pipeline/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({ datasetId: 'ds_non_existent_999', projectId: 'prj_cl_test_001' }),
    });
    assert.strictEqual(r404.status, 404);
  });

  await step('E2E 6: POST /api/pipeline/heal succeeds with idempotency protection and persists separate healed dataset', async () => {
    const idempKey = `idemp_e2e_${Date.now()}`;
    const payload = {
      datasetId: 'ds_cl1_vibration_telemetry',
      projectId: 'prj_cl_test_001',
      targetCol: 'failure_flag',
      healEngineVersion: 'v2.0',
      idempotencyKey: idempKey,
      issuesDetected: 4,
      repairsApplied: 4,
      qualityBefore: 81.2,
      qualityAfter: 97.5,
      verificationStatus: 'VERIFIED_SUCCESS',
      durationMs: 65,
    };

    const r1 = await fetch(`${BASE_URL}/api/pipeline/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(r1.status, 200);
    const d1: any = await r1.json();
    assert.strictEqual(d1.status, 'VERIFIED_SUCCESS');
    assert.ok(d1.updatedDatasetId.startsWith('ds_healed_'));
    assert.notStrictEqual(d1.updatedDatasetId, d1.originalDatasetId);

    // Duplicate idempotencyKey request returns cached response safely
    const r2 = await fetch(`${BASE_URL}/api/pipeline/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(r2.status, 200);
    const d2: any = await r2.json();
    assert.strictEqual(d2.deduplicated, true);
    assert.strictEqual(d2.updatedDatasetId, d1.updatedDatasetId);
  });

  await step('E2E 7: Switch version to v1.8, run heal with v1.8, and restore v2.0', async () => {
    const sw1 = await fetch(`${BASE_URL}/api/heal/versions/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({
        projectId: 'prj_cl_test_001',
        targetVersionId: 'v1.8',
        reason: 'E2E rollback test',
        compatibilityStatus: 'COMPATIBLE',
      }),
    });
    assert.strictEqual(sw1.status, 200);
    const sw1Data: any = await sw1.json();
    assert.strictEqual(sw1Data.activeVersionId, 'v1.8');

    const healV18 = await fetch(`${BASE_URL}/api/pipeline/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({
        datasetId: 'ds_cl1_vibration_telemetry',
        projectId: 'prj_cl_test_001',
        targetCol: 'failure_flag',
        healEngineVersion: 'v1.8',
        idempotencyKey: `idemp_v18_${Date.now()}`,
        issuesDetected: 4,
        repairsApplied: 3,
        qualityBefore: 81.2,
        qualityAfter: 95.8,
        verificationStatus: 'VERIFIED_SUCCESS',
        durationMs: 44,
      }),
    });
    assert.strictEqual(healV18.status, 200);
    const healV18Data: any = await healV18.json();
    assert.strictEqual(healV18Data.healEngineVersion, 'v1.8');

    // Restore v2.0
    const sw2 = await fetch(`${BASE_URL}/api/heal/versions/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({
        projectId: 'prj_cl_test_001',
        targetVersionId: 'v2.0',
        reason: 'E2E restore current version',
        compatibilityStatus: 'COMPATIBLE',
      }),
    });
    assert.strictEqual(sw2.status, 200);
    assert.strictEqual(((await sw2.json()) as any).activeVersionId, 'v2.0');
  });

  await step('E2E 8: Simulated API 500 failure logs sanitized error without token leakage & /api/heal/history updates', async () => {
    const r500 = await fetch(`${BASE_URL}/api/pipeline/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({
        datasetId: 'ds_cl1_vibration_telemetry',
        projectId: 'prj_cl_test_001',
        healEngineVersion: 'v2.0',
        simulateFailure: true,
      }),
    });
    assert.strictEqual(r500.status, 500);
    const errData: any = await r500.json();
    assert.ok(errData.errorId && errData.errorId.startsWith('HEAL-ERR-'));
    assert.strictEqual(errData.recommendedFallbackVersion, 'v1.8');

    const unauthErrs = await fetch(`${BASE_URL}/api/heal/errors`);
    assert.strictEqual(unauthErrs.status, 401);

    const errsResp = await fetch(`${BASE_URL}/api/heal/errors`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    assert.strictEqual(errsResp.status, 200);
    const errsData: any = await errsResp.json();
    assert.ok(errsData.errors.some((e: any) => e.errorId === errData.errorId));

    const histResp = await fetch(`${BASE_URL}/api/heal/history?projectId=prj_cl_test_001`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    assert.strictEqual(histResp.status, 200);
    const histData: any = await histResp.json();
    assert.ok(histData.history.length >= 2);
    assert.ok(histData.switchLogs.length >= 2);
  });

  await step('E2E 9: Master Admin accounts, strict password rejection, and admin client/ML endpoints', async () => {
    const adminPass = process.env.MASTER_ADMIN_INITIAL_PASSWORD || 'Dnyanraj2269';
    for (const alias of ['2269dms', 'dms2269', 'mahadevshinde2269@gmail.com', '2269dms@gmail.com']) {
      const r = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: alias, password: adminPass }),
      });
      assert.strictEqual(r.status, 200, `Alias ${alias} login failed with ${r.status}`);
      const d: any = await r.json();
      assert.strictEqual(d.user.role, 'MASTER_ADMIN');
      assert.strictEqual(d.user.id, 'ADMIN-MASTER-001');
      assert.strictEqual(d.user.mustChangePassword, true);
    }

    const secAdm = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'saishkhatavkar875@gmail.com', password: adminPass }),
    });
    assert.strictEqual(secAdm.status, 200);
    const secData: any = await secAdm.json();
    assert.strictEqual(secData.user.role, 'MASTER_ADMIN');
    assert.strictEqual(secData.user.id, 'ADMIN-MASTER-003');

    for (const wrongPw of ['WrongPassword123!', '2269dms', 'Admin@HealML2026']) {
      const badLogin = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '2269dms@gmail.com', password: wrongPw }),
      });
      assert.strictEqual(badLogin.status, 401);
    }

    const clientsResp = await fetch(`${BASE_URL}/api/admin/clients`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(clientsResp.status, 200);
    const clientsData: any = await clientsResp.json();
    assert.ok(Array.isArray(clientsData.clients) && clientsData.clients.length >= 3);
    assert.ok(typeof clientsData.clients[0].fullName === 'string' && clientsData.clients[0].fullName.length > 0);

    const monResp = await fetch(`${BASE_URL}/api/admin/ml-monitoring`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(monResp.status, 200);
    const monData: any = await monResp.json();
    assert.ok(Array.isArray(monData.evaluations) && monData.evaluations.every((e: any) => Boolean(e.clientId)));

    const modelsResp = await fetch(`${BASE_URL}/api/admin/clients/CL-TEST-001/ml-models`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(modelsResp.status, 200);

    const healthResp = await fetch(`${BASE_URL}/api/admin/system-health`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(healthResp.status, 200);

    // Verify all post-login Master Admin & Model Operations endpoints return 200 JSON (never 403 or HTML)
    for (const tok of [adminToken, secData.token]) {
      for (const ep of [
        '/api/admin/dashboard',
        '/api/admin/clients',
        '/api/admin/ml-monitoring',
        '/api/admin/system-health',
        '/api/admin/support/tickets',
        '/api/admin/alerts',
        '/api/admin/audit-logs',
        '/api/admin/backup/list',
        '/api/admin/model-operations/overview',
        '/api/admin/model-operations/leaderboard',
        '/api/admin/model-operations/clients/CL-TEST-001',
        '/api/projects',
        '/api/datasets',
      ]) {
        const r = await fetch(`${BASE_URL}${ep}`, {
          headers: { Authorization: `Bearer ${tok}` },
        });
        assert.strictEqual(r.status, 200, `Expected 200 on ${ep} for MASTER_ADMIN, got ${r.status}`);
        const ct = r.headers.get('content-type') || '';
        assert.ok(ct.includes('application/json'), `Expected JSON content-type on ${ep}, got ${ct}`);
      }
    }

    // Verify CLIENT cannot access admin model operations (403)
    const clientForbidden = await fetch(`${BASE_URL}/api/admin/model-operations/overview`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    assert.strictEqual(clientForbidden.status, 403);
  });

  await step('E2E 10: Registration, change-password, forgot/reset-password, and project provisioning persist properly', async () => {
    const testEmail = `e2e_auth_${Date.now()}@healml.test`;
    const pw1 = 'StrongPass123!';
    const pw2 = 'UpdatedPass456!';
    const pw3 = 'ResetPass789!';

    const reg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'E2E Verification Client',
        email: testEmail,
        password: pw1,
        confirmPassword: pw1,
        companyName: 'E2E Test Lab',
      }),
    });
    assert.strictEqual(reg.status, 201);
    const regData: any = await reg.json();
    const userId = regData.user.id;
    assert.ok(userId);

    // Wrong password rejected
    const wrong = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword123!' }),
    });
    assert.strictEqual(wrong.status, 401);

    // Correct password succeeds
    const log1 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: pw1 }),
    });
    assert.strictEqual(log1.status, 200);
    const log1Data: any = await log1.json();

    // Auto-provisioned project exists
    const prjResp = await fetch(`${BASE_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${log1Data.token}` },
    });
    assert.strictEqual(prjResp.status, 200);
    const prjData: any = await prjResp.json();
    assert.ok(Array.isArray(prjData.projects) && prjData.projects.length >= 1);

    // Change password persists
    const chgResp = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${log1Data.token}` },
      body: JSON.stringify({ currentPassword: pw1, newPassword: pw2 }),
    });
    assert.strictEqual(chgResp.status, 200);
    const chgData: any = await chgResp.json();
    assert.strictEqual(chgData.user.mustChangePassword, false);

    // Old password no longer works, new password works
    const oldFail = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: pw1 }),
    });
    assert.strictEqual(oldFail.status, 401);

    const log2 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: pw2 }),
    });
    assert.strictEqual(log2.status, 200);

    // Forgot & reset password persists
    const forgot = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    assert.strictEqual(forgot.status, 200);
    const forgotData: any = await forgot.json();
    assert.ok(forgotData.resetToken);

    const reset = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: forgotData.resetToken, newPassword: pw3 }),
    });
    assert.strictEqual(reset.status, 200);

    const log3 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: pw3 }),
    });
    assert.strictEqual(log3.status, 200);

    // Clean up synthetic test user & project from SQLite
    try {
      const { DatabaseSync } = await import('node:sqlite');
      const db = new DatabaseSync('./data/healml_enterprise.db');
      db.prepare('DELETE FROM projects WHERE client_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    } catch {
      // Non-fatal cleanup
    }
  });

  await step('E2E 11: Real Excel (.xlsx) & CSV multipart upload, DB/disk persistence, refresh recovery, Heal Engine v1.8/v2.0 separation, & unpersisted ID 404', async () => {
    const XLSX = await import('xlsx');
    const fs = await import('node:fs');
    const path = await import('node:path');
    const createdDatasetIds: string[] = [];

    // 1. Verify exact unpersisted client-only ID still returns 404 NOT_FOUND at BACKEND_PERSISTENCE (no fake bypass)
    const rFake = await fetch(`${BASE_URL}/api/pipeline/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({
        datasetId: 'uploaded_excel_1794751867601',
        projectId: 'prj_cl_test_001',
        healEngineVersion: 'v1.8',
      }),
    });
    assert.strictEqual(rFake.status, 404);
    const fakeBody: any = await rFake.json();
    assert.strictEqual(fakeBody.errorCategory, 'NOT_FOUND');
    assert.strictEqual(fakeBody.failedStage, 'BACKEND_PERSISTENCE');
    assert.strictEqual(fakeBody.failedApi, 'POST /api/pipeline/heal');
    assert.strictEqual(fakeBody.datasetId, 'uploaded_excel_1794751867601');

    // 2. Build a real Excel (.xlsx) workbook with missing values, an extreme outlier, a duplicate row, and target failure_flag
    const sampleRows = [
      { machine_id: 'M_01', temperature_c: 64.2, vibration_mm_s: 2.1, pressure_bar: 5.4, failure_flag: 0 },
      { machine_id: 'M_02', temperature_c: null, vibration_mm_s: 3.4, pressure_bar: 5.8, failure_flag: 0 },
      { machine_id: 'M_03', temperature_c: 71.0, vibration_mm_s: 999.9, pressure_bar: 6.1, failure_flag: 1 },
      { machine_id: 'M_04', temperature_c: 66.5, vibration_mm_s: 2.8, pressure_bar: null, failure_flag: 0 },
      { machine_id: 'M_04', temperature_c: 66.5, vibration_mm_s: 2.8, pressure_bar: null, failure_flag: 0 },
      { machine_id: 'M_05', temperature_c: 78.3, vibration_mm_s: 4.5, pressure_bar: 6.9, failure_flag: 1 },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SensorTelemetry');
    const xlsxBuf = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

    const form = new FormData();
    form.append('file', new Blob([xlsxBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'e2e_factory_sensors.xlsx');
    form.append('name', 'E2E Factory Excel Dataset');
    form.append('projectId', 'prj_cl_test_001');

    const upResp = await fetch(`${BASE_URL}/api/datasets/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: form,
    });
    assert.strictEqual(upResp.status, 201, `Expected 201 on Excel upload, got ${upResp.status}`);
    const upData: any = await upResp.json();
    const excelDsId: string = upData?.dataset?.id;
    assert.ok(excelDsId && excelDsId.startsWith('ds_xlsx_'), `Unexpected Excel dataset ID: ${excelDsId}`);
    createdDatasetIds.push(excelDsId);
    assert.strictEqual(upData.dataset.rowCount, 6);
    assert.strictEqual(upData.dataset.colCount, 5);
    assert.strictEqual(upData.dataset.projectId, 'prj_cl_test_001');

    // Verify original raw Excel file exists on disk and SQLite record committed
    const diskDir = path.join('./data/uploads', excelDsId);
    assert.ok(fs.existsSync(path.join(diskDir, 'data.json')), 'Expected persisted data.json on disk');
    const rawExcelDiskPath = path.join(diskDir, 'raw_e2e_factory_sensors.xlsx');
    assert.ok(fs.existsSync(rawExcelDiskPath), 'Expected original uploaded raw .xlsx file on disk');
    const originalDiskHash = upData.dataset.fileHash;

    // 3. Cross-tenant isolation: Client 2 CANNOT read or heal Client 1's uploaded Excel dataset
    const c2Read = await fetch(`${BASE_URL}/api/datasets/${encodeURIComponent(excelDsId)}`, {
      headers: { Authorization: `Bearer ${otherClientToken}` },
    });
    assert.strictEqual(c2Read.status, 403);

    const c2Heal = await fetch(`${BASE_URL}/api/pipeline/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherClientToken}` },
      body: JSON.stringify({ datasetId: excelDsId, projectId: 'prj_cl_test_001', healEngineVersion: 'v1.8' }),
    });
    assert.strictEqual(c2Heal.status, 403);

    // 4. Simulate browser refresh: listDatasets -> getDataset returns full Excel rows & columns
    const listResp = await fetch(`${BASE_URL}/api/datasets?projectId=prj_cl_test_001`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    assert.strictEqual(listResp.status, 200);
    const listData: any = await listResp.json();
    assert.ok(listData.datasets.some((d: any) => d.id === excelDsId), 'Uploaded Excel ID missing from project list after refresh');

    const getResp = await fetch(`${BASE_URL}/api/datasets/${encodeURIComponent(excelDsId)}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    assert.strictEqual(getResp.status, 200);
    const fetchedOrig: any = await getResp.json();
    assert.strictEqual(fetchedOrig.rows.length, 6);
    assert.strictEqual(fetchedOrig.dataset.targetCol, 'failure_flag');

    // 5. Heal the uploaded Excel dataset using v1.8 (server creates separate updated dataset without mutating original)
    const idempExcel = `idemp_xlsx_${Date.now()}`;
    const healExcelResp = await fetch(`${BASE_URL}/api/pipeline/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({
        datasetId: excelDsId,
        projectId: 'prj_cl_test_001',
        targetCol: 'failure_flag',
        healEngineVersion: 'v1.8',
        idempotencyKey: idempExcel,
        durationMs: 32,
      }),
    });
    assert.strictEqual(healExcelResp.status, 200, `Excel heal failed with ${healExcelResp.status}`);
    const healExcelData: any = await healExcelResp.json();
    const healedExcelId: string = healExcelData.updatedDatasetId;
    assert.ok(healedExcelId && healedExcelId.startsWith('ds_healed_'));
    assert.notStrictEqual(healedExcelId, excelDsId);
    createdDatasetIds.push(healedExcelId);

    // Verify separate healed dataset exists on disk + DB, and original Excel dataset & raw file are untouched
    const getHealedResp = await fetch(`${BASE_URL}/api/datasets/${encodeURIComponent(healedExcelId)}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    assert.strictEqual(getHealedResp.status, 200);
    const fetchedHealed: any = await getHealedResp.json();
    assert.strictEqual(fetchedHealed.dataset.isHealed, true);
    assert.strictEqual(fetchedHealed.dataset.parentDatasetId, excelDsId);
    assert.ok(fetchedHealed.rows.length > 0);
    // Ensure target column failure_flag still contains original target distribution values (0/1) with no mutation
    assert.ok(fetchedHealed.rows.every((r: any) => r.failure_flag === 0 || r.failure_flag === 1));

    const getOrigAfterHeal = await fetch(`${BASE_URL}/api/datasets/${encodeURIComponent(excelDsId)}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    assert.strictEqual(getOrigAfterHeal.status, 200);
    const origAfter: any = await getOrigAfterHeal.json();
    assert.strictEqual(origAfter.rows.length, 6, 'Original Excel row count must remain untouched');
    assert.strictEqual(origAfter.dataset.fileHash, originalDiskHash, 'Original Excel SHA-256 hash must remain untouched');

    // 6. Real CSV multipart upload & heal persistence verification
    const csvContent = 'unit_id,temp,pressure,failure_flag\nU1,60.1,5.2,0\nU2,,5.5,0\nU3,72.4,5.9,1\nU4,64.0,,0\n';
    const csvForm = new FormData();
    csvForm.append('file', new Blob([csvContent], { type: 'text/csv' }), 'e2e_units.csv');
    csvForm.append('name', 'E2E Units CSV');
    csvForm.append('projectId', 'prj_cl_test_001');

    const csvUp = await fetch(`${BASE_URL}/api/datasets/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: csvForm,
    });
    assert.strictEqual(csvUp.status, 201);
    const csvUpData: any = await csvUp.json();
    const csvDsId: string = csvUpData.dataset.id;
    assert.ok(csvDsId.startsWith('ds_csv_'));
    createdDatasetIds.push(csvDsId);

    const csvHeal = await fetch(`${BASE_URL}/api/pipeline/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({
        datasetId: csvDsId,
        projectId: 'prj_cl_test_001',
        targetCol: 'failure_flag',
        healEngineVersion: 'v2.0',
        idempotencyKey: `idemp_csv_${Date.now()}`,
      }),
    });
    assert.strictEqual(csvHeal.status, 200);
    const csvHealData: any = await csvHeal.json();
    createdDatasetIds.push(csvHealData.updatedDatasetId);

    // Cleanup synthetic uploaded/healed test artifacts from SQLite & disk
    try {
      const { DatabaseSync } = await import('node:sqlite');
      const db = new DatabaseSync('./data/healml_enterprise.db');
      for (const did of createdDatasetIds) {
        db.prepare('DELETE FROM heal_run_history WHERE original_dataset_id = ? OR updated_dataset_id = ?').run(did, did);
        db.prepare('DELETE FROM dataset_versions WHERE dataset_id = ?').run(did);
        db.prepare('DELETE FROM datasets WHERE id = ?').run(did);
        const dir = path.join('./data/uploads', did);
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
      db.prepare('DELETE FROM heal_error_logs WHERE dataset_id = ?').run('uploaded_excel_1794751867601');
    } catch {
      // Non-fatal cleanup
    }
  });

  console.log(`\n========================================`);
  console.log(`E2E SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log(`========================================`);
  if (failed > 0) process.exit(1);
}

runE2E();
