const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running Vercel deployment & Catalogue verification tests...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ [FAIL] ${name}: ${e.message}`);
    failed++;
  }
}

// 1. Verify vercel.json structure and configuration
test('vercel.json exists and has valid SPA + API rewrites', () => {
  const vercelJsonPath = path.resolve(process.cwd(), 'vercel.json');
  assert(fs.existsSync(vercelJsonPath), 'vercel.json must exist in root');
  const config = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
  assert.strictEqual(config.version, 2, 'vercel.json must be version 2');
  assert(Array.isArray(config.rewrites), 'rewrites array must be defined');
  const apiRewrite = config.rewrites.find(r => r.source === '/api/(.*)');
  assert(apiRewrite, 'Rewrites must include /api/(.*)');
  assert.strictEqual(apiRewrite.destination, '/api', 'API rewrite must target /api');
  const spaRewrite = config.rewrites.find(r => r.source === '/(.*)');
  assert(spaRewrite, 'Rewrites must include SPA fallback /(.*)');
  assert.strictEqual(spaRewrite.destination, '/index.html', 'SPA rewrite must target /index.html');
});

// 2. Verify api/index.ts exists for Vercel Serverless Function
test('api/index.ts exists and exports the Express app', () => {
  const apiIndexPath = path.resolve(process.cwd(), 'api/index.ts');
  assert(fs.existsSync(apiIndexPath), 'api/index.ts must exist');
  const content = fs.readFileSync(apiIndexPath, 'utf8');
  assert(content.includes('export default app'), 'api/index.ts must export default app');
});

// 3. Verify products asset definitions
test('src/assets/products.ts contains all verified products with manufacturer and images', () => {
  const productsPath = path.resolve(process.cwd(), 'src/assets/products.ts');
  assert(fs.existsSync(productsPath), 'products.ts must exist');
  const content = fs.readFileSync(productsPath, 'utf8');
  assert(content.includes('AQ-STR-01'), 'Must include Aqua Starter AQ-STR-01');
  assert(content.includes('AQ-BSC-02'), 'Must include Aqua Basic AQ-BSC-02');
  assert(content.includes('AQ-PLS-03'), 'Must include Aqua Plus AQ-PLS-03');
  assert(content.includes('AQ-PRO-04'), 'Must include Aqua Pro AQ-PRO-04');
  assert(content.includes('AQ-PRM-05'), 'Must include Aqua Premium AQ-PRM-05');
  assert(content.includes('AQ-BUS-06'), 'Must include Aqua Business AQ-BUS-06');
  assert(content.includes('AQ-ENT-07'), 'Must include Aqua Enterprise AQ-ENT-07');
  assert(content.includes('manufacturer:'), 'Must specify manufacturer for verified equipment');
  assert(content.includes('waterCapacity:'), 'Must specify waterCapacity');
});

// 4. Verify public images exist on disk for all product asset references
test('Public images exist for all machine categories', () => {
  const publicDir = path.resolve(process.cwd(), 'public/images');
  assert(fs.existsSync(publicDir), 'public/images directory must exist');
  const expectedImages = [
    'machine_starter_dispenser_1792756134226.jpg',
    'machine_commercial_ro_1792756150015.jpg',
    'machine_industrial_purifier_1792756164556.jpg',
    'machine_enterprise_station_1792756178346.jpg'
  ];
  for (const img of expectedImages) {
    const fullPath = path.join(publicDir, img);
    assert(fs.existsSync(fullPath), `Image ${img} must exist in public/images`);
    const stat = fs.statSync(fullPath);
    assert(stat.size > 1000, `Image ${img} must not be empty (size: ${stat.size} bytes)`);
  }
});

// 5. Verify App.tsx initializes machines with ASSET_PRODUCTS
test('App.tsx and WaterMachinesPage initialize with ASSET_PRODUCTS', () => {
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(appContent.includes('useState<Machine[]>(ASSET_PRODUCTS'), 'App.tsx must initialize machines with ASSET_PRODUCTS');
  assert(appContent.includes('initialMachines={machines}'), 'App.tsx must pass initialMachines to WaterMachinesPage');

  const pagePath = path.resolve(process.cwd(), 'src/pages/WaterMachinesPage.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf8');
  assert(pageContent.includes('ASSET_PRODUCTS as unknown as Machine[]'), 'WaterMachinesPage must fallback to ASSET_PRODUCTS');
  assert(pageContent.includes('Retry Connection'), 'WaterMachinesPage must provide Retry Connection button');
  assert(pageContent.includes('Clear Search & Filters'), 'WaterMachinesPage must provide Clear Search & Filters button');
});

// 6. Verify server.ts guards startServer for Vercel and exports app
test('server.ts guards startServer in Vercel environment and exports app', () => {
  const serverPath = path.resolve(process.cwd(), 'server.ts');
  const content = fs.readFileSync(serverPath, 'utf8');
  assert(content.includes("process.env.VERCEL !== '1'"), 'server.ts must guard startServer for Vercel');
  assert(content.includes('export { app, server }'), 'server.ts must export app and server');
  assert(content.includes('export default app'), 'server.ts must export default app');
});

console.log(`\n==========================================`);
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log(`==========================================\n`);

if (failed > 0) {
  process.exit(1);
}
