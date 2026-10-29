const Product = require('../models/Product');
const SaleRecord = require('../models/SaleRecord');
const { calculateForecast } = require('../services/forecastService');

/**
 * @desc    Generate inventory forecast and reorder analytics for user products
 * @route   GET /api/inventory/forecast
 * @access  Private
 */
const getForecast = async (req, res, next) => {
  try {
    let {
      windowDays = 30,
      z = 1.65,
      reviewPeriodDays = 14,
      status,
      sort = 'urgency',
    } = req.query;

    // Validate windowDays
    if (req.query.windowDays !== undefined) {
      const parsedWindow = Number(req.query.windowDays);
      if (!Number.isInteger(parsedWindow) || parsedWindow < 1 || parsedWindow > 365) {
        return res.status(400).json({ message: 'Invalid windowDays: must be an integer between 1 and 365' });
      }
      windowDays = parsedWindow;
    } else {
      windowDays = Number(windowDays);
    }

    // Validate z
    if (req.query.z !== undefined) {
      const parsedZ = Number(req.query.z);
      if (Number.isNaN(parsedZ) || parsedZ < 0 || parsedZ > 4) {
        return res.status(400).json({ message: 'Invalid z: must be a number between 0 and 4' });
      }
      z = parsedZ;
    } else {
      z = Number(z);
    }

    // Validate reviewPeriodDays
    if (req.query.reviewPeriodDays !== undefined) {
      const parsedReview = Number(req.query.reviewPeriodDays);
      if (!Number.isInteger(parsedReview) || parsedReview < 0 || parsedReview > 365) {
        return res.status(400).json({ message: 'Invalid reviewPeriodDays: must be an integer between 0 and 365' });
      }
      reviewPeriodDays = parsedReview;
    } else {
      reviewPeriodDays = Number(reviewPeriodDays);
    }

    // Validate status filter if passed
    if (status && !['REORDER_NOW', 'LOW', 'OK'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status: must be REORDER_NOW, LOW, or OK' });
    }

    // Validate sort
    if (sort && !['urgency', 'name'].includes(sort)) {
      return res.status(400).json({ message: 'Invalid sort parameter: must be "urgency" or "name"' });
    }

    // 1. Fetch all products owned by current user
    const products = await Product.find({ owner: req.user._id });

    if (!products || products.length === 0) {
      return res.status(200).json({
        generatedAt: new Date().toISOString(),
        windowDays,
        params: { z, reviewPeriodDays },
        summary: {
          totalProducts: 0,
          needReorder: 0,
          low: 0,
          ok: 0,
          totalSuggestedOrderValue: 0,
        },
        items: [],
      });
    }

    // 2. Fetch ALL sale records within the forecast window in a SINGLE query.
    // Querying sales once per product inside a loop would introduce the infamous N+1 problem,
    // exponentially increasing database round-trips and degrading server performance.
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (windowDays - 1));

    const sales = await SaleRecord.find({
      owner: req.user._id,
      saleDate: { $gte: windowStart },
    });

    // 3. Group sales by product id in plain JavaScript memory
    const salesByProduct = new Map();
    for (const sale of sales) {
      const prodIdStr = sale.product.toString();
      if (!salesByProduct.has(prodIdStr)) {
        salesByProduct.set(prodIdStr, []);
      }
      salesByProduct.get(prodIdStr).push({
        quantity: sale.quantity,
        saleDate: sale.saleDate,
      });
    }

    // 4. Calculate forecast for each product
    const allForecastItems = products.map((product) => {
      const prodIdStr = product._id.toString();
      const productSales = salesByProduct.get(prodIdStr) || [];

      const forecast = calculateForecast({
        sales: productSales,
        currentStock: product.currentStock,
        leadTimeDays: product.leadTimeDays,
        windowDays,
        z,
        reviewPeriodDays,
        today: now,
      });

      return {
        productId: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        imageUrl: product.imageUrl,
        unitCost: product.unitCost,
        currentStock: product.currentStock,
        leadTimeDays: product.leadTimeDays,
        avgDailyDemand: forecast.avgDailyDemand,
        demandStdDev: forecast.demandStdDev,
        safetyStock: forecast.safetyStock,
        reorderPoint: forecast.reorderPoint,
        daysOfStockLeft: forecast.daysOfStockLeft,
        suggestedOrderQty: forecast.suggestedOrderQty,
        status: forecast.status,
        salesCountInWindow: forecast.salesCountInWindow,
      };
    });

    // Compute summary metrics before any optional status filtering
    let needReorder = 0;
    let low = 0;
    let ok = 0;
    let totalSuggestedOrderValue = 0;

    for (const item of allForecastItems) {
      if (item.status === 'REORDER_NOW') needReorder++;
      else if (item.status === 'LOW') low++;
      else if (item.status === 'OK') ok++;

      totalSuggestedOrderValue += (item.suggestedOrderQty || 0) * (item.unitCost || 0);
    }

    totalSuggestedOrderValue = Math.round((totalSuggestedOrderValue + Number.EPSILON) * 100) / 100;

    // Filter items by status if specified in query
    let items = allForecastItems;
    if (status) {
      items = items.filter((item) => item.status === status);
    }

    // 5. Sort logic
    if (sort === 'urgency') {
      const statusWeight = {
        REORDER_NOW: 1,
        LOW: 2,
        OK: 3,
      };

      items.sort((a, b) => {
        const weightDiff = (statusWeight[a.status] || 99) - (statusWeight[b.status] || 99);
        if (weightDiff !== 0) return weightDiff;

        // Within same status, fewest daysOfStockLeft first (null treated as infinity)
        const daysA = a.daysOfStockLeft === null ? Infinity : a.daysOfStockLeft;
        const daysB = b.daysOfStockLeft === null ? Infinity : b.daysOfStockLeft;
        return daysA - daysB;
      });
    } else if (sort === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    }

    return res.status(200).json({
      generatedAt: now.toISOString(),
      windowDays,
      params: { z, reviewPeriodDays },
      summary: {
        totalProducts: products.length,
        needReorder,
        low,
        ok,
        totalSuggestedOrderValue,
      },
      items,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getForecast,
};

