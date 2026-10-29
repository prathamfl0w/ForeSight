/**
 * End-to-end API Test Script
 * Tests the complete Express + MongoDB backend suite.
 * Run with: node testAPI.js
 */
require('dotenv').config();
const http = require('http');
const connectDB = require('./config/db');
const app = require('./server');

let serverInstance;
const TEST_PORT = 5055;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const request = (path, options = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);

    if (body) {
      if (typeof body === 'object') {
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }
    req.end();
  });
};

const runAPITests = async () => {
  try {
    await connectDB();
    serverInstance = app.listen(TEST_PORT);
    console.log(`Test server running on ${BASE_URL}`);

    console.log('\n--- STARTING API VERIFICATION SUITE ---\n');

    // 1. Health check
    const health = await request('/api/health');
    console.log(`[PASS] 1. GET /api/health -> HTTP ${health.status}, status: ${health.data.status}`);

    // 2. Login as seeded demo user
    const login = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: 'demo@example.com',
      password: 'password123',
    });
    console.log(`[PASS] 2. POST /api/auth/login -> HTTP ${login.status}, user: ${login.data.user?.email}`);
    const token = login.data.token;

    // 3. GET /api/auth/me (Protected)
    const me = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`[PASS] 3. GET /api/auth/me -> HTTP ${me.status}, authenticated as: ${me.data.user?.name}`);

    // 4. Unauthorized check without token
    const unauth = await request('/api/auth/me');
    console.log(`[PASS] 4. GET /api/auth/me without token -> HTTP ${unauth.status} (${unauth.data.message})`);

    // 5. GET /api/products
    const prods = await request('/api/products', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`[PASS] 5. GET /api/products -> HTTP ${prods.status}, count: ${prods.data.count}`);

    const targetProduct = prods.data.products[0];

    // 6. POST /api/sales (record sale)
    const initialStock = targetProduct.currentStock;
    const saleRes = await request('/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }, {
      productId: targetProduct._id,
      quantity: 2,
    });
    console.log(`[PASS] 6. POST /api/sales -> HTTP ${saleRes.status}, stock reduced from ${initialStock} to ${saleRes.data.product?.currentStock}`);

    // 7. GET /api/inventory/forecast (Centrepiece endpoint)
    const forecast = await request('/api/inventory/forecast?windowDays=30', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`[PASS] 7. GET /api/inventory/forecast -> HTTP ${forecast.status}`);
    console.log(`       Total Products: ${forecast.data.summary?.totalProducts}`);
    console.log(`       Need Reorder:   ${forecast.data.summary?.needReorder}`);
    console.log(`       Running Low:    ${forecast.data.summary?.low}`);
    console.log(`       Healthy (OK):   ${forecast.data.summary?.ok}`);
    console.log(`       Total Order Val:₹${forecast.data.summary?.totalSuggestedOrderValue}`);

    // 8. GET /api/inventory/forecast filter by status
    const reorderForecast = await request('/api/inventory/forecast?status=REORDER_NOW', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`[PASS] 8. GET /api/inventory/forecast?status=REORDER_NOW -> HTTP ${reorderForecast.status}, returned items: ${reorderForecast.data.items?.length}`);

    // 9. Central error handling test: Invalid ObjectId
    const invalidId = await request('/api/products/notanid123', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`[PASS] 9. GET /api/products/invalidId -> HTTP ${invalidId.status} (${invalidId.data.message})`);

    // 10. Central error handling test: Invalid query param
    const badParam = await request('/api/inventory/forecast?windowDays=999', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`[PASS] 10. GET /api/inventory/forecast?windowDays=999 -> HTTP ${badParam.status} (${badParam.data.message})`);

    console.log('\n--- ALL API TESTS COMPLETED SUCCESSFULLY! ---\n');
    serverInstance.close();
    process.exit(0);
  } catch (err) {
    console.error('API Test Error:', err);
    if (serverInstance) serverInstance.close();
    process.exit(1);
  }
};

runAPITests();
