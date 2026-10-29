const mongoose = require('mongoose');
const Product = require('../models/Product');
const SaleRecord = require('../models/SaleRecord');

/**
 * @desc    Get all products for the logged in user with optional search and category filters
 * @route   GET /api/products
 * @access  Private
 */
const getProducts = async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const query = { owner: req.user._id };

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [{ name: searchRegex }, { sku: searchRegex }];
    }

    if (category) {
      query.category = category;
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by id
 * @route   GET /api/products/:id
 * @access  Private
 */
const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = await Product.findOne({ _id: id, owner: req.user._id });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new product (multipart/form-data)
 * @route   POST /api/products
 * @access  Private
 */
const createProduct = async (req, res, next) => {
  try {
    const { name, sku, category } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Product name is required' });
    }

    if (!sku || !sku.trim()) {
      return res.status(400).json({ message: 'Product SKU is required' });
    }

    // GOTCHA: Convert string inputs from multipart/form-data to numbers
    const currentStock = req.body.currentStock !== undefined && req.body.currentStock !== ''
      ? Number(req.body.currentStock)
      : 0;

    const leadTimeDays = req.body.leadTimeDays !== undefined && req.body.leadTimeDays !== ''
      ? Number(req.body.leadTimeDays)
      : 7;

    const unitCost = req.body.unitCost !== undefined && req.body.unitCost !== ''
      ? Number(req.body.unitCost)
      : 0;

    if (Number.isNaN(currentStock) || currentStock < 0) {
      return res.status(400).json({ message: 'currentStock must be a valid non-negative number' });
    }

    if (Number.isNaN(leadTimeDays) || leadTimeDays < 1) {
      return res.status(400).json({ message: 'leadTimeDays must be a valid number greater than or equal to 1' });
    }

    if (Number.isNaN(unitCost) || unitCost < 0) {
      return res.status(400).json({ message: 'unitCost must be a valid non-negative number' });
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    try {
      const product = await Product.create({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category: category ? category.trim() : 'Uncategorised',
        currentStock,
        leadTimeDays,
        unitCost,
        imageUrl,
        owner: req.user._id,
      });

      return res.status(201).json({ product });
    } catch (createError) {
      if (createError.code === 11000) {
        return res.status(400).json({ message: 'You already have a product with that SKU' });
      }
      throw createError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing product (multipart/form-data)
 * @route   PATCH /api/products/:id
 * @access  Private
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = await Product.findOne({ _id: id, owner: req.user._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (req.body.name !== undefined) {
      if (!req.body.name.trim()) {
        return res.status(400).json({ message: 'Product name cannot be empty' });
      }
      product.name = req.body.name.trim();
    }

    if (req.body.sku !== undefined) {
      if (!req.body.sku.trim()) {
        return res.status(400).json({ message: 'Product SKU cannot be empty' });
      }
      product.sku = req.body.sku.trim().toUpperCase();
    }

    if (req.body.category !== undefined) {
      product.category = req.body.category.trim();
    }

    if (req.body.currentStock !== undefined) {
      const stockNum = Number(req.body.currentStock);
      if (Number.isNaN(stockNum) || stockNum < 0) {
        return res.status(400).json({ message: 'currentStock must be a non-negative number' });
      }
      product.currentStock = stockNum;
    }

    if (req.body.leadTimeDays !== undefined) {
      const leadNum = Number(req.body.leadTimeDays);
      if (Number.isNaN(leadNum) || leadNum < 1) {
        return res.status(400).json({ message: 'leadTimeDays must be at least 1' });
      }
      product.leadTimeDays = leadNum;
    }

    if (req.body.unitCost !== undefined) {
      const costNum = Number(req.body.unitCost);
      if (Number.isNaN(costNum) || costNum < 0) {
        return res.status(400).json({ message: 'unitCost must be a non-negative number' });
      }
      product.unitCost = costNum;
    }

    if (req.file) {
      product.imageUrl = `/uploads/${req.file.filename}`;
    }

    try {
      await product.save();
      return res.status(200).json({ product });
    } catch (saveError) {
      if (saveError.code === 11000) {
        return res.status(400).json({ message: 'You already have a product with that SKU' });
      }
      throw saveError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a product and its associated sales history
 * @route   DELETE /api/products/:id
 * @access  Private
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = await Product.findOneAndDelete({ _id: id, owner: req.user._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Cascading deletion: deleting associated sales records prevents orphaned records
    // from accumulating in the database and polluting analytics or future reports.
    const deleteSalesResult = await SaleRecord.deleteMany({ product: id, owner: req.user._id });

    return res.status(200).json({
      message: 'Product deleted',
      deletedSales: deleteSalesResult.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};

