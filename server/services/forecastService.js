/**
 * FORECAST SERVICE (Pure Business Logic)
 * 
 * Why this module is kept completely independent of Express and Mongoose:
 * 1. Testability: The mathematical core can be thoroughly unit tested in isolation without
 *    needing mock HTTP requests, responses, database connections, or seeded Mongo collections.
 * 2. Portability & Reusability: Pure JavaScript functions accepting plain objects and returning
 *    plain objects can run identically in the browser (Phase 1 / client) or in Node.js (backend),
 *    CLI tools, or background workers without modification.
 * 3. Separation of Concerns: Changes to routing, databases, or transport layers will never
 *    unintentionally alter the forecasting mathematics.
 */

/**
 * Format a Date object to YYYY-MM-DD calendar day string.
 */
const toDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper to round a number to 2 decimal places.
 */
const round2 = (num) => {
  if (num === null || num === undefined) return null;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Business meaning: Transforms historical sales records into a continuous daily demand timeline,
 * filling non-sale days with zeros so the average rate reflects true calendar sales velocity.
 * 
 * @param {Array<{ quantity: number, saleDate: Date|string }>} sales 
 * @param {number} windowDays 
 * @param {Date} today 
 * @returns {number[]} Array of numbers of length exactly windowDays, oldest day first.
 */
function buildDailyDemandSeries(sales = [], windowDays = 30, today = new Date()) {
  const normalizedToday = new Date(today);
  const dailyTotals = new Map();
  const dateKeys = [];

  // Generate calendar days for the entire window up to today inclusive
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(
      normalizedToday.getFullYear(),
      normalizedToday.getMonth(),
      normalizedToday.getDate() - i
    );
    const key = toDateKey(d);
    dateKeys.push(key);
    dailyTotals.set(key, 0);
  }

  // Accumulate sales falling strictly within the window
  for (const sale of sales) {
    if (!sale || !sale.saleDate) continue;
    const saleKey = toDateKey(sale.saleDate);
    if (dailyTotals.has(saleKey)) {
      dailyTotals.set(saleKey, dailyTotals.get(saleKey) + Number(sale.quantity || 0));
    }
  }

  return dateKeys.map((key) => dailyTotals.get(key));
}

/**
 * Business meaning: Measures the baseline average units sold per calendar day across the window.
 * 
 * @param {number[]} numbers 
 * @returns {number} Average of the array, or 0 if empty.
 */
function average(numbers = []) {
  if (!numbers || numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  return sum / numbers.length;
}

/**
 * Business meaning: Quantifies demand volatility and sales unpredictability across days.
 * 
 * @param {number[]} numbers 
 * @returns {number} Population standard deviation (divide by n), or 0 if empty.
 */
function standardDeviation(numbers = []) {
  if (!numbers || numbers.length === 0) return 0;
  const mean = average(numbers);
  const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numbers.length;
  return Math.sqrt(variance);
}

/**
 * Business meaning: Calculates the reorder threshold, safety stock cushion, days of inventory remaining,
 * and recommended order quantity to replenish stock before a stockout occurs.
 * 
 * @param {Object} options
 * @param {Array} options.sales
 * @param {number} options.currentStock
 * @param {number} options.leadTimeDays
 * @param {number} [options.windowDays=30]
 * @param {number} [options.z=1.65] 95% service level factor
 * @param {number} [options.reviewPeriodDays=14]
 * @param {Date} [options.today=new Date()]
 * @returns {Object} Forecast results
 */
function calculateForecast(options = {}) {
  const {
    sales = [],
    currentStock = 0,
    leadTimeDays = 7,
    windowDays = 30,
    z = 1.65,
    reviewPeriodDays = 14,
    today = new Date(),
  } = options;

  const stockNum = Number(currentStock);
  const leadTimeNum = Number(leadTimeDays);
  const windowDaysNum = Number(windowDays);
  const zNum = Number(z);
  const reviewPeriodNum = Number(reviewPeriodDays);

  const series = buildDailyDemandSeries(sales, windowDaysNum, today);
  const avgDailyDemandRaw = average(series);
  const demandStdDevRaw = standardDeviation(series);

  const safetyStockRaw = zNum * demandStdDevRaw * Math.sqrt(leadTimeNum);
  const reorderPointRaw = (avgDailyDemandRaw * leadTimeNum) + safetyStockRaw;

  const daysOfStockLeftRaw = avgDailyDemandRaw > 0 ? stockNum / avgDailyDemandRaw : null;

  const suggestedOrderQtyRaw = Math.max(
    0,
    Math.ceil(
      avgDailyDemandRaw * (leadTimeNum + reviewPeriodNum) + safetyStockRaw - stockNum
    )
  );

  // Count sales records that fall inside the window
  const normalizedToday = new Date(today);
  const cutoffDate = new Date(
    normalizedToday.getFullYear(),
    normalizedToday.getMonth(),
    normalizedToday.getDate() - (windowDaysNum - 1)
  );
  const cutoffKey = toDateKey(cutoffDate);
  const todayKey = toDateKey(normalizedToday);

  let salesCountInWindow = 0;
  for (const s of sales) {
    if (!s || !s.saleDate) continue;
    const sKey = toDateKey(s.saleDate);
    if (sKey >= cutoffKey && sKey <= todayKey) {
      salesCountInWindow++;
    }
  }

  // Rounded values for final output and thresholds
  const avgDailyDemand = round2(avgDailyDemandRaw);
  const demandStdDev = round2(demandStdDevRaw);
  const safetyStock = round2(safetyStockRaw);
  const reorderPoint = round2(reorderPointRaw);
  const daysOfStockLeft = daysOfStockLeftRaw !== null ? round2(daysOfStockLeftRaw) : null;
  const suggestedOrderQty = Math.round(suggestedOrderQtyRaw);

  let status = 'OK';
  if (stockNum <= reorderPoint) {
    status = 'REORDER_NOW';
  } else if (stockNum <= round2(reorderPoint * 1.25)) {
    status = 'LOW';
  }

  return {
    avgDailyDemand,
    demandStdDev,
    safetyStock,
    reorderPoint,
    daysOfStockLeft,
    suggestedOrderQty,
    status,
    salesCountInWindow,
    windowDays: windowDaysNum,
  };
}

module.exports = {
  buildDailyDemandSeries,
  average,
  standardDeviation,
  calculateForecast,
};

