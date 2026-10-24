const http = require('http');
const assert = require('assert');

console.log('🧪 Running Vite WebSocket & Preview Server verification tests...\n');

let passed = 0;
let failed = 0;

function report(name, pass, msg = '') {
  if (pass) {
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${name} - ${msg}`);
    failed++;
  }
}

function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  // Test 1: HTTP Preview Loading
  try {
    const res = await fetchUrl('/');
    report('Root HTML returns HTTP 200', res.status === 200);
    report('HTML contains root mounting element', res.body.includes('<div id="root"></div>'));
    report('HTML contains main script entry point', res.body.includes('/src/main.tsx'));
  } catch (err) {
    report('Root HTML fetch', false, err.message);
  }

  // Test 2: @vite/client transform check
  try {
    const res = await fetchUrl('/@vite/client');
    report('@vite/client returns HTTP 200', res.status === 200);
    report('@vite/client has disabled WebSocket transport shim', res.body.includes('HMR WebSocket disabled'));
    report('@vite/client does not attempt live socket connection in transport', !res.body.includes('`${socketProtocol}://${socketHost}?token=${wsToken}`'));
  } catch (err) {
    report('@vite/client transform check', false, err.message);
  }

  // Test 3: API Endpoints
  try {
    const health = await fetchUrl('/api/health');
    report('/api/health returns HTTP 200 and online status', health.status === 200 && health.body.includes('online'));

    const machines = await fetchUrl('/api/machines');
    report('/api/machines returns HTTP 200 and machine list', machines.status === 200 && machines.body.includes('mach_aqua_starter'));

    const setupStatus = await fetchUrl('/api/auth/admin/setup-status');
    report('/api/auth/admin/setup-status returns HTTP 200', setupStatus.status === 200);
  } catch (err) {
    report('API endpoints test', false, err.message);
  }

  // Test 4: Static Images & Equipment Assets
  try {
    const starterImg = await fetchUrl('/images/machine_starter_dispenser_1792756134226.jpg');
    report('Starter machine image served with HTTP 200', starterImg.status === 200);
    report('Starter machine image has correct Content-Type', starterImg.headers['content-type']?.includes('image/jpeg'));

    const enterpriseImg = await fetchUrl('/images/machine_enterprise_station_1792756178346.jpg');
    report('Enterprise machine image served with HTTP 200', enterpriseImg.status === 200);
  } catch (err) {
    report('Static image assets test', false, err.message);
  }

  // Test 5: CORS Headers Security
  try {
    const optRes = await new Promise((resolve) => {
      const req = http.request({
        host: 'localhost',
        port: 3000,
        path: '/api/machines',
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://ais-dev-preview.google.com',
          'Access-Control-Request-Method': 'GET',
        }
      }, (res) => {
        resolve(res);
      });
      req.end();
    });
    report('OPTIONS preflight returns HTTP 204', optRes.statusCode === 204);
    report('CORS reflects caller Origin instead of wildcard *', optRes.headers['access-control-allow-origin'] === 'https://ais-dev-preview.google.com');
    report('CORS allows credentials', optRes.headers['access-control-allow-credentials'] === 'true');
  } catch (err) {
    report('CORS security headers test', false, err.message);
  }

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
