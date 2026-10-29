/**
 * Unit Test Script for Inventory Forecasting Engine
 * Run with: node testForecast.js
 */

const {
  buildDailyDemandSeries,
  average,
  standardDeviation,
  calculateForecast,
} = require('./services/forecastService');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, expected, actual) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    console.error(`       Expected: ${JSON.stringify(expected)}`);
    console.error(`       Actual:   ${JSON.stringify(actual)}`);
    failCount++;
  }
}

const baseDate = new Date('2026-10-29T12:00:00Z');

console.log('--- RUNNING FORECAST ENGINE UNIT TESTS ---\n');

// 1. Steady Demand Test
// 10 units sold every day for 30 days. Standard deviation should be 0.
const steadySales = [];
for (let i = 0; i < 30; i++) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - i);
  steadySales.push({ quantity: 10, saleDate: d });
}
const steadyResult = calculateForecast({
  sales: steadySales,
  currentStock: 100,
  leadTimeDays: 7,
  windowDays: 30,
  today: baseDate,
});

assert(
  steadyResult.avgDailyDemand === 10 && steadyResult.demandStdDev === 0 && steadyResult.safetyStock === 0,
  'Case 1: Steady Demand (StdDev & SafetyStock must be 0, Avg must be 10)',
  { avgDailyDemand: 10, demandStdDev: 0, safetyStock: 0 },
  { avgDailyDemand: steadyResult.avgDailyDemand, demandStdDev: steadyResult.demandStdDev, safetyStock: steadyResult.safetyStock }
);

// 2. Erratic Demand Test
// Same average (300 total units over 30 days = 10/day), but highly volatile spikes
const erraticSales = [];
for (let i = 0; i < 30; i++) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - i);
  // Every 5th day sell 50 units, other days 0 (6 days * 50 = 300 units)
  const qty = i % 5 === 0 ? 50 : 0;
  if (qty > 0) {
    erraticSales.push({ quantity: qty, saleDate: d });
  }
}
const erraticResult = calculateForecast({
  sales: erraticSales,
  currentStock: 100,
  leadTimeDays: 7,
  windowDays: 30,
  today: baseDate,
});

assert(
  erraticResult.avgDailyDemand === 10 && erraticResult.safetyStock > steadyResult.safetyStock,
  'Case 2: Erratic Demand (SafetyStock is significantly inflated compared to steady demand)',
  `safetyStock > 0 (greater than steady: 0)`,
  `avg: ${erraticResult.avgDailyDemand}, stdDev: ${erraticResult.demandStdDev}, safetyStock: ${erraticResult.safetyStock}`
);

// 3. Zero Sales Test
// Product has 50 in stock, but zero sales in the 30-day window
const zeroSalesResult = calculateForecast({
  sales: [],
  currentStock: 50,
  leadTimeDays: 7,
  windowDays: 30,
  today: baseDate,
});

assert(
  zeroSalesResult.avgDailyDemand === 0 &&
  zeroSalesResult.daysOfStockLeft === null &&
  zeroSalesResult.status === 'OK' &&
  zeroSalesResult.safetyStock === 0,
  'Case 3: Zero Sales (Stock remains OK, daysOfStockLeft is null, avg is 0)',
  { avgDailyDemand: 0, daysOfStockLeft: null, status: 'OK' },
  { avgDailyDemand: zeroSalesResult.avgDailyDemand, daysOfStockLeft: zeroSalesResult.daysOfStockLeft, status: zeroSalesResult.status }
);

// 4. Zero Stock Test
// Product with zero stock should trigger REORDER_NOW immediately
const zeroStockResult = calculateForecast({
  sales: steadySales,
  currentStock: 0,
  leadTimeDays: 7,
  windowDays: 30,
  today: baseDate,
});

assert(
  zeroStockResult.status === 'REORDER_NOW' && zeroStockResult.daysOfStockLeft === 0,
  'Case 4: Zero Stock (Must trigger REORDER_NOW immediately with 0 days left)',
  { status: 'REORDER_NOW', daysOfStockLeft: 0 },
  { status: zeroStockResult.status, daysOfStockLeft: zeroStockResult.daysOfStockLeft }
);

// 5. One-Day Lead Time Test
// leadTimeDays = 1, Math.sqrt(1) = 1
const oneDayLeadResult = calculateForecast({
  sales: steadySales,
  currentStock: 20,
  leadTimeDays: 1,
  windowDays: 30,
  today: baseDate,
});

assert(
  oneDayLeadResult.reorderPoint === 10,
  'Case 5: One-Day Lead Time (Reorder point with steady sales of 10/day is 10)',
  { reorderPoint: 10 },
  { reorderPoint: oneDayLeadResult.reorderPoint }
);

// 6. Window Longer Than Available History Test
// Sales history only exists for 5 days, but window is 30 days
const shortHistorySales = [];
for (let i = 0; i < 5; i++) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - i);
  shortHistorySales.push({ quantity: 6, saleDate: d }); // 30 total units over 30 days = 1/day
}
const windowSeries = buildDailyDemandSeries(shortHistorySales, 30, baseDate);
const shortHistoryResult = calculateForecast({
  sales: shortHistorySales,
  currentStock: 10,
  leadTimeDays: 5,
  windowDays: 30,
  today: baseDate,
});

assert(
  windowSeries.length === 30 && shortHistoryResult.avgDailyDemand === 1,
  'Case 6: Window Longer Than History (Series length matches window exactly and zeros included)',
  { length: 30, avgDailyDemand: 1 },
  { length: windowSeries.length, avgDailyDemand: shortHistoryResult.avgDailyDemand }
);

console.log(`\nTests Completed: ${passCount} Passed, ${failCount} Failed.`);
if (failCount > 0) {
  process.exit(1);
}

