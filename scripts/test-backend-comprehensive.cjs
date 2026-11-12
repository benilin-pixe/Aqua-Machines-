const http = require('http');

const PORT = 3000;
const HOST = '127.0.0.1';

function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        host: HOST,
        port: PORT,
        path,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
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

async function run() {
  console.log('🧪 Running Comprehensive Backend Diagnostic & Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // 1. Health
  const health = await apiRequest('GET', '/api/health');
  assert('/api/health returns 200 and success', health.status === 200 && health.body.success === true);

  // 2. Public Settings
  const settings = await apiRequest('GET', '/api/settings/public');
  assert('/api/settings/public returns 200', settings.status === 200 && settings.body.registration_enabled !== undefined);

  // 3. Machines Catalogue
  const machines = await apiRequest('GET', '/api/machines');
  assert('/api/machines returns 200 and array', machines.status === 200 && Array.isArray(machines.body.machines));

  // 4. User Registration
  const testEmail = `diag_${Date.now()}@aquamachines.tech`;
  const reg = await apiRequest('POST', '/api/auth/register', {
    fullName: 'Diagnostic User',
    email: testEmail,
    password: 'Password123!',
  });
  assert('User registration returns success', reg.status === 201 && reg.body.token);

  const userToken = reg.body.token;

  // 5. Current User Session (/api/auth/me)
  const me = await apiRequest('GET', '/api/auth/me', null, userToken);
  assert('/api/auth/me returns authenticated user', me.status === 200 && me.body.user?.email === testEmail);

  // 6. Wallet
  const wallet = await apiRequest('GET', '/api/wallet', null, userToken);
  assert('/api/wallet returns wallet state', wallet.status === 200 && wallet.body.wallet !== undefined);

  // 7. Wallet Transactions
  const txs = await apiRequest('GET', '/api/wallet/transactions', null, userToken);
  assert('/api/wallet/transactions returns array', txs.status === 200 && Array.isArray(txs.body.transactions));

  // 8. Notifications
  const notifs = await apiRequest('GET', '/api/notifications', null, userToken);
  assert('/api/notifications returns array', notifs.status === 200 && Array.isArray(notifs.body.notifications));

  // 9. Support Tickets
  const ticketRes = await apiRequest('POST', '/api/tickets', { subject: 'Test issue', message: 'Diagnostics test message' }, userToken);
  assert('Support ticket creation succeeds', ticketRes.status === 201 && ticketRes.body.success !== false);

  const tickets = await apiRequest('GET', '/api/tickets', null, userToken);
  assert('Support tickets list returns created ticket', tickets.status === 200 && Array.isArray(tickets.body.tickets) && tickets.body.tickets.length > 0);

  console.log(`\n==========================================`);
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`==========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run();
