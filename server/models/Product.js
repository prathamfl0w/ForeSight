const mongoose = require('mongoose');

/**
 * Product Schema
 * 
 * The 'owner' field is present on every document to enforce multi-tenant authorization,
 * guaranteeing that one user can never see, modify, or interfere with another user's inventory.
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'Please provide a product SKU'],
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'Uncategorised',
    },
    currentStock: {
      type: Number,
      required: [true, 'Please provide current stock level'],
      min: [0, 'Current stock cannot be negative'],
      default: 0,
    },
    // days between placing an order and it arriving
    leadTimeDays: {
      type: Number,
      required: [true, 'Please provide lead time in days'],
      min: [1, 'Lead time must be at least 1 day'],
      default: 7,
    },
    unitCost: {
      type: Number,
      min: [0, 'Unit cost cannot be negative'],
      default: 0,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Product must belong to a user'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Compound unique index on { owner: 1, sku: 1 }:
 * This ensures that a single user cannot create two products with duplicate SKUs,
 * while still permitting different independent users across the platform to use
 * the same SKU (e.g., both user A and user B having an item SKU "TSH-01").
 */
productSchema.index({ owner: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);

