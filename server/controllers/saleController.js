const mongoose = require('mongoose');
const SaleRecord = require('../models/SaleRecord');
const Product = require('../models/Product');

/**
 * @desc    Record a new sale and deduct stock from corresponding product
 * @route   POST /api/sales
 * @access  Private
 */
const createSale = async (req, res, next) => {
  try {
    const { productId, quantity, saleDate } = req.body;

    if (!productId || quantity === undefined || quantity === null || quantity === '') {
      return res.status(400).json({ message: 'productId and quantity are required' });
    }

    const qtyNum = Number(quantity);
    if (!Number.isInteger(qtyNum) || qtyNum < 1) {
      return res.status(400).json({ message: 'Quantity must be a whole number greater than or equal to 1' });
    }

    let parsedSaleDate = new Date();
    if (saleDate) {
      parsedSaleDate = new Date(saleDate);
      if (Number.isNaN(parsedSaleDate.getTime())) {
        return res.status(400).json({ message: 'Invalid saleDate format' });
      }
      // Reject dates strictly in the future compared to now
      if (parsedSaleDate.getTime() > Date.now()) {
        return res.status(400).json({ message: 'Sale date cannot be in the future' });
      }
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = await Product.findOne({ _id: productId, owner: req.user._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (qtyNum > product.currentStock) {
      return res.status(400).json({ message: `Only ${product.currentStock} units in stock` });
    }

    // In a production system, this pair of writes would be wrapped in a MongoDB transaction session
    // to guarantee atomic execution and prevent inventory desynchronization if one operation fails.
    const sale = await SaleRecord.create({
      product: productId,
      quantity: qtyNum,
      saleDate: parsedSaleDate,
      owner: req.user._id,
    });

    product.currentStock = Math.max(0, product.currentStock - qtyNum);
    await product.save();

    return res.status(201).json({
      sale,
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get sales records for logged in user with optional filters
 * @route   GET /api/sales
 * @access  Private
 */
const getSales = async (req, res, next) => {
  try {
    const { productId, days, limit = 100 } = req.query;
    const query = { owner: req.user._id };

    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(404).json({ message: 'Product not found' });
      }
      query.product = productId;
    }

    if (days) {
      const daysNum = Number(days);
      if (!Number.isNaN(daysNum) && daysNum > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysNum);
        query.saleDate = { $gte: cutoffDate };
      }
    }

    const limitNum = Math.max(1, Number(limit) || 100);

    const sales = await SaleRecord.find(query)
      .sort({ saleDate: -1, createdAt: -1 })
      .limit(limitNum)
      .populate('product', 'name sku');

    return res.status(200).json({
      count: sales.length,
      sales,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a sale record and return the sold quantity back to product stock
 * @route   DELETE /api/sales/:id
 * @access  Private
 */
const deleteSale = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Sale record not found' });
    }

    const sale = await SaleRecord.findOne({ _id: id, owner: req.user._id });
    if (!sale) {
      return res.status(404).json({ message: 'Sale record not found' });
    }

    const product = await Product.findOne({ _id: sale.product, owner: req.user._id });
    if (product) {
      product.currentStock += sale.quantity;
      await product.save();
    }

    await SaleRecord.deleteOne({ _id: id });

    return res.status(200).json({
      message: 'Sale deleted',
      product,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSale,
  getSales,
  deleteSale,
};

