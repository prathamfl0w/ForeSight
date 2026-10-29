const mongoose = require('mongoose');

/**
 * SaleRecord Schema
 * 
 * The 'owner' field is present on every document to enforce multi-tenant authorization,
 * guaranteeing that one user can never see, modify, or calculate metrics using another user's sales data.
 */
const saleRecordSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Sale must be associated with a product'],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Please provide sale quantity'],
      min: [1, 'Sale quantity must be at least 1'],
    },
    saleDate: {
      type: Date,
      required: [true, 'Please provide sale date'],
      default: Date.now,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sale record must belong to a user'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Compound index on { owner: 1, product: 1, saleDate: -1 }:
 * The forecast endpoint queries sales specifically by owner and window date range,
 * and groups them by product. This compound index provides maximum query coverage
 * and performance, avoiding slow in-memory filtering or full collection scans.
 */
saleRecordSchema.index({ owner: 1, product: 1, saleDate: -1 });

module.exports = mongoose.model('SaleRecord', saleRecordSchema);

