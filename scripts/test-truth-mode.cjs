/**
 * Comprehensive Truth-Mode Verification Test Suite
 * Tests all 13 scenarios for the 48-Hour Free Trial Lifecycle,
 * Database & API Integration, and Server Clock Authority.
 */

const http = require('http');

const PORT = 3000;
const HOST = '127.0.0.1';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: HOST,
        port: PORT,
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  const fs = require('fs');
  console.log('🚀 Starting Aqua Machines 48-Hour Free Trial Truth-Mode Verification...\n');

  const timestamp = Date.now();
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
      failedCount++;
    }
  }

  // Helper to register and activate user
  async function createTestUser(suffix) {
    const email = `testuser_${timestamp}_${suffix}@aquamachines.tech`;
    const password = 'TestPassword123!';
    const regRes = await request(
      { path: '/api/auth/register', method: 'POST' },
      {
        fullName: `Test User ${suffix}`,
        email,
        phone: `+256700${Math.floor(100000 + Math.random() * 900000)}`,
        password,
        confirmPassword: password,
      }
    );
    const token = regRes.body.token;

    // Verify registration fee payment to activate user
    if (regRes.body.paymentId) {
      await request(
        {
          path: `/api/payments/${regRes.body.paymentId}/verify`,
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        { simulateOutcome: 'SUCCESS' }
      );
    }

    return { email, password, token, user: regRes.body.user };
  }

  // Get Admin token
  console.log('--- Setup: Authenticating Administrator ---');
  let adminToken = null;
  const adminRes = await request(
    { path: '/api/auth/admin/login', method: 'POST' },
    { email: 'admin@aquamachines.com', password: 'AquaAdminPassword2026!' }
  );

  if (adminRes.status === 200 && adminRes.body.token) {
    adminToken = adminRes.body.token;
    console.log('  Admin session authenticated successfully.\n');
  } else {
    // Check if setup available
    const setupRes = await request({ path: '/api/auth/admin/first-time-setup', method: 'POST' }, {
      fullName: 'Master Administrator',
      email: 'admin@aquamachines.com',
      password: 'AquaAdminPassword2026!',
      confirmPassword: 'AquaAdminPassword2026!',
    });
    if (setupRes.status === 201 && setupRes.body.token) {
      adminToken = setupRes.body.token;
      console.log('  Admin account provisioned and authenticated.\n');
    } else {
      console.log('  Admin login fallback: status', adminRes.status, adminRes.body);
    }
  }

  // ==========================================
  // SCENARIO 1: Exact 48-Hour Expiration Calculation
  // ==========================================
  console.log('--- Test 1: Exact 48-Hour Expiration Calculation ---');
  const user1 = await createTestUser('1');
  const activateRes1 = await request(
    {
      path: '/api/machines/trial/activate',
      method: 'POST',
      headers: { Authorization: `Bearer ${user1.token}` },
    },
    {}
  );

  assert(activateRes1.status === 201, 'Trial activation returns HTTP 201', JSON.stringify(activateRes1.body));
  const trial1 = activateRes1.body.trial;
  const activatedTime = new Date(trial1.activatedAt).getTime();
  const expiresTime = new Date(trial1.expiresAt).getTime();
  const diffMs = expiresTime - activatedTime;
  const EXACT_48_HOURS_MS = 48 * 60 * 60 * 1000; // 172,800,000 ms

  assert(
    diffMs === EXACT_48_HOURS_MS,
    `Exact 48-hour calculation: diff=${diffMs}ms (Expected ${EXACT_48_HOURS_MS}ms)`,
    `Actual diff: ${diffMs}`
  );
  assert(trial1.durationHours === 48, 'Trial durationHours is explicitly 48');
  assert(trial1.status === 'ACTIVE', 'Initial trial status is ACTIVE');

  // ==========================================
  // SCENARIO 2: Trial Access Before Expiration
  // ==========================================
  console.log('\n--- Test 2: Trial Access Before Expiration ---');
  const statusRes1 = await request(
    {
      path: '/api/machines/trial/status',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1.token}` },
    }
  );
  assert(statusRes1.status === 200, 'Trial status endpoint returns HTTP 200');
  assert(statusRes1.body.hasActiveTrial === true, 'hasActiveTrial is true');
  assert(statusRes1.body.isExpired === false, 'isExpired is false');
  assert(statusRes1.body.remainingMs > 170000000, `remainingMs is ~48 hours (${statusRes1.body.remainingMs}ms)`);

  // Claim yield while active
  const claimRes1 = await request(
    {
      path: `/api/machines/${trial1.subscriptionId}/claim`,
      method: 'POST',
      headers: { Authorization: `Bearer ${user1.token}` },
    }
  );
  assert(claimRes1.status === 200, 'Active trial successfully claims daily return yield', JSON.stringify(claimRes1.body));
  assert(claimRes1.body.claimedAmount === 1500, 'Credited configured daily yield of UGX 1,500');

  // ==========================================
  // SCENARIO 3: Immediate Server-Side Access Denial At or After Expiration
  // ==========================================
  console.log('\n--- Test 3: Immediate Server-Side Access Denial At/After 48 Hours ---');
  // Simulate time passage using admin simulate-expiry endpoint
  const simRes = await request(
    {
      path: `/api/admin/trials/${trial1.id}/simulate-expiry`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    },
    {}
  );
  assert(simRes.status === 200, 'Admin simulate-expiry endpoint executed successfully', JSON.stringify(simRes.body));

  // Request status after simulated expiry
  const postExpiryStatus = await request(
    {
      path: '/api/machines/trial/status',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1.token}` },
    }
  );
  console.log('DEBUG Test 3 -> postExpiryStatus.body:', postExpiryStatus.body);
  assert(postExpiryStatus.body.isExpired === true, 'Trial status reports isExpired === true');
  assert(postExpiryStatus.body.trial.status === 'EXPIRED', 'Trial status updated to EXPIRED');
  assert(postExpiryStatus.body.remainingMs === 0, 'remainingMs is 0');

  // Attempt to claim returns from expired trial unit
  const expiredClaimRes = await request(
    {
      path: `/api/machines/${trial1.subscriptionId}/claim`,
      method: 'POST',
      headers: { Authorization: `Bearer ${user1.token}` },
    }
  );
  assert(expiredClaimRes.status === 403, 'Expired trial claim rejected with HTTP 403', JSON.stringify(expiredClaimRes.body));
  assert(expiredClaimRes.body.error.includes('Free trial period of 48 hours has elapsed'), 'Safe access denial error returned');

  // ==========================================
  // SCENARIO 4: Immunity to Client Clock Manipulation
  // ==========================================
  console.log('\n--- Test 4: Immunity to Client Clock Manipulation ---');
  // Client attempts to send forged date headers or spoofed local time
  const forgedClockRes = await request(
    {
      path: '/api/machines/trial/status',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user1.token}`,
        'X-Client-Date': new Date(Date.now() - 100000000).toISOString(),
        Date: new Date(Date.now() - 100000000).toUTCString(),
      },
    }
  );
  assert(forgedClockRes.body.isExpired === true, 'Server ignores client clock manipulation and enforces server timestamp');
  assert(Math.abs(new Date(forgedClockRes.body.serverTime).getTime() - Date.now()) < 5000, 'serverTime strictly authoritative to server clock');

  // ==========================================
  // SCENARIO 5: Immunity to Page Refresh / Re-login
  // ==========================================
  console.log('\n--- Test 5: Immunity to Page Refresh / Re-login ---');
  // User re-authenticates and obtains new session token
  const reloginRes = await request(
    { path: '/api/auth/login', method: 'POST' },
    { email: user1.email, password: user1.password }
  );
  const newToken = reloginRes.body.token;
  const persistedStatusRes = await request(
    {
      path: '/api/machines/trial/status',
      method: 'GET',
      headers: { Authorization: `Bearer ${newToken}` },
    }
  );
  assert(persistedStatusRes.body.trial.id === trial1.id, 'Trial ID persists across re-login');
  assert(persistedStatusRes.body.isExpired === true, 'Expired trial status persists across re-login');

  // ==========================================
  // SCENARIO 6: Single Active Trial Per Account/User
  // ==========================================
  console.log('\n--- Test 6: Single Active Trial Per Account ---');
  const user2 = await createTestUser('2');
  const firstActivate = await request(
    {
      path: '/api/machines/trial/activate',
      method: 'POST',
      headers: { Authorization: `Bearer ${user2.token}` },
    }
  );
  assert(firstActivate.status === 201, 'User 2 first trial activation succeeds');

  const secondActivate = await request(
    {
      path: '/api/machines/trial/activate',
      method: 'POST',
      headers: { Authorization: `Bearer ${user2.token}` },
    }
  );
  assert(secondActivate.status === 400, 'Concurrent second trial activation rejected with HTTP 400');
  assert(secondActivate.body.error.includes('already activated or exhausted'), 'Error message prevents multiple simultaneous trials');

  // ==========================================
  // SCENARIO 7: Abuse Prevention Across Sessions (Exhausted Trial)
  // ==========================================
  console.log('\n--- Test 7: Abuse Prevention on Exhausted Trial ---');
  // User 1 whose trial expired tries to activate again
  const reactivateExpired = await request(
    {
      path: '/api/machines/trial/activate',
      method: 'POST',
      headers: { Authorization: `Bearer ${user1.token}` },
    }
  );
  assert(reactivateExpired.status === 400, 'Re-activation of exhausted trial rejected with HTTP 400');

  // Also via /purchase endpoint
  const purchaseStarterExpired = await request(
    {
      path: '/api/machines/purchase',
      method: 'POST',
      headers: { Authorization: `Bearer ${user1.token}` },
    },
    { machineId: 'mach_aqua_starter', paymentMethod: 'WALLET', termsAccepted: true }
  );
  assert(purchaseStarterExpired.status === 400, 'Purchase route rejects re-activating free trial starter');

  // ==========================================
  // SCENARIO 8: Automated Idempotent Background Cleanup Job
  // ==========================================
  console.log('\n--- Test 8: Automated Idempotent Cleanup Job ---');
  if (adminToken) {
    const cleanupUser = await createTestUser('cleanup');
    const cleanupTrialRes = await request({ path: '/api/machines/trial/activate', method: 'POST', headers: { Authorization: `Bearer ${cleanupUser.token}` } }, {});
    if (cleanupTrialRes.status === 201) {
      await request({ path: `/api/admin/trials/${cleanupTrialRes.body.trial.id}/simulate-expiry`, method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } }, {});
    }

    const cleanupRes1 = await request(
      {
        path: '/api/admin/trials/cleanup',
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    assert(cleanupRes1.status === 200, 'Cleanup job endpoint executed successfully');
    assert(cleanupRes1.body.cleanedCount >= 1, `Cleanup job deactivated expired trial (${cleanupRes1.body.cleanedCount} cleaned)`);

    // Run again immediately - must be idempotent (0 cleaned, no duplicates)
    const cleanupRes2 = await request(
      {
        path: '/api/admin/trials/cleanup',
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    assert(cleanupRes2.status === 200, 'Second cleanup job call succeeds');
    assert(cleanupRes2.body.cleanedCount === 0, 'Second cleanup run is idempotent with 0 duplicate deactivations');
  } else {
    console.log('    Skipping admin cleanup test (admin token unavailable)');
  }

  // ==========================================
  // SCENARIO 9: Manual Admin Revocation
  // ==========================================
  console.log('\n--- Test 9: Manual Admin Revocation ---');
  if (adminToken) {
    const trial2Id = firstActivate.body.trial.id;
    const revokeRes = await request(
      {
        path: `/api/admin/trials/${trial2Id}/revoke`,
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      { reason: 'Administrative test revocation' }
    );
    assert(revokeRes.status === 200, 'Admin manual revocation returns HTTP 200');
    assert(revokeRes.body.status === 'REVOKED', 'Status updated to REVOKED');

    // Check user 2 access is terminated immediately
    const user2Status = await request(
      {
        path: '/api/machines/trial/status',
        method: 'GET',
        headers: { Authorization: `Bearer ${user2.token}` },
      }
    );
    assert(user2Status.body.trial.status === 'REVOKED', 'User 2 trial reflects REVOKED status');
    assert(user2Status.body.isExpired === true, 'User 2 access marked expired/denied');
  }

  // ==========================================
  // SCENARIO 10: Purchase Non-Interference
  // ==========================================
  console.log('\n--- Test 10: Purchase Non-Interference ---');
  // Credit user 1 wallet so they can purchase commercial machine
  const dbData2 = JSON.parse(fs.readFileSync('./data/database.json', 'utf-8'));
  let user1Wallet = dbData2.wallets.find((w) => w.userId === user1.user.id);
  if (!user1Wallet) {
    user1Wallet = { userId: user1.user.id, availableBalance: 100000, pendingBalance: 0, totalRewards: 0, totalWithdrawals: 0, updatedAt: new Date().toISOString() };
    dbData2.wallets.push(user1Wallet);
  } else {
    user1Wallet.availableBalance += 100000;
  }
  fs.writeFileSync('./data/database.json', JSON.stringify(dbData2, null, 2));

  // User 1 (whose trial is expired) purchases Aqua Basic (UGX 35,000)
  const purchasePaidRes = await request(
    {
      path: '/api/machines/purchase',
      method: 'POST',
      headers: { Authorization: `Bearer ${user1.token}` },
    },
    { machineId: 'mach_aqua_basic', paymentMethod: 'WALLET', termsAccepted: true }
  );
  assert(purchasePaidRes.status === 201, 'User with expired trial successfully purchases paid commercial machine');
  assert(purchasePaidRes.body.subscription.status === 'ACTIVE', 'Paid machine subscription is ACTIVE');
  assert(purchasePaidRes.body.subscription.isTrial !== true, 'Paid subscription is not marked as trial');

  // Verify trial cleanup job does NOT affect paid subscription
  if (adminToken) {
    await request(
      { path: '/api/admin/trials/cleanup', method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const subCheck = JSON.parse(fs.readFileSync('./data/database.json', 'utf-8')).machineSubscriptions.find(
      (s) => s.id === purchasePaidRes.body.subscription.id
    );
    assert(subCheck.status === 'ACTIVE', 'Cleanup job leaves paid subscription untouched and ACTIVE');
  }

  // ==========================================
  // SCENARIO 11: Multi-User Isolation
  // ==========================================
  console.log('\n--- Test 11: Multi-User Isolation ---');
  const user3 = await createTestUser('3');
  const user3Trial = await request(
    {
      path: '/api/machines/trial/activate',
      method: 'POST',
      headers: { Authorization: `Bearer ${user3.token}` },
    }
  );
  assert(user3Trial.status === 201, 'User 3 activates independent trial');
  assert(user3Trial.body.trial.userId === user3.user.id, 'User 3 trial belongs strictly to User 3');
  assert(user3Trial.body.trial.userId !== user1.user.id, 'User 3 trial is isolated from User 1');

  // ==========================================
  // SCENARIO 12: Complete Audit Trail Logging
  // ==========================================
  console.log('\n--- Test 12: Complete Audit Trail Logging ---');
  const dbDataLogs = JSON.parse(fs.readFileSync('./data/database.json', 'utf-8')).auditLogs;
  const activatedLogs = dbDataLogs.filter((l) => l.action === 'TRIAL_ACTIVATED');
  const cleanupLogs = dbDataLogs.filter((l) => l.action === 'TRIAL_EXPIRED_CLEANUP');
  const revokedLogs = dbDataLogs.filter((l) => l.action === 'TRIAL_REVOKED');

  assert(activatedLogs.length >= 2, `TRIAL_ACTIVATED audit logs recorded (${activatedLogs.length} found)`);
  assert(cleanupLogs.length >= 1, `TRIAL_EXPIRED_CLEANUP audit logs recorded (${cleanupLogs.length} found)`);
  if (adminToken) {
    assert(revokedLogs.length >= 1, `TRIAL_REVOKED audit logs recorded (${revokedLogs.length} found)`);
  }

  // ==========================================
  // SCENARIO 13: Server-Authoritative Status Endpoint
  // ==========================================
  console.log('\n--- Test 13: Server-Authoritative Status Endpoint ---');
  const user3Status = await request(
    {
      path: '/api/machines/trial/status',
      method: 'GET',
      headers: { Authorization: `Bearer ${user3.token}` },
    }
  );
  assert(user3Status.status === 200, 'Status endpoint returns 200');
  assert(typeof user3Status.body.serverTime === 'string', 'serverTime ISO string present');
  assert(typeof user3Status.body.remainingMs === 'number', 'remainingMs numeric present');
  assert(typeof user3Status.body.remainingHours === 'number', 'remainingHours numeric present');
  assert(user3Status.body.hasActiveTrial === true, 'hasActiveTrial is true for active user 3');

  // Final summary
  console.log('\n==========================================');
  console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log('==========================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
