// Quick MongoDB inspector for live evaluations
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const SaleRecord = require('./models/SaleRecord');

const inspectDB = async () => {
  try {
    await connectDB();

    console.log('\n=============================================================');
    console.log('         LIVE MONGODB DATABASE INSPECTION');
    console.log('=============================================================\n');

    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    const saleCount = await SaleRecord.countDocuments();

    console.log(`📊 Total Users in MongoDB:    ${userCount}`);
    console.log(`📦 Total Products in MongoDB: ${productCount}`);
    console.log(`🧾 Total Sales in MongoDB:    ${saleCount}`);
    console.log('-------------------------------------------------------------');

    // List all products and their real-time stock
    const products = await Product.find().select('name sku category currentStock leadTimeDays');
    console.log('\n--- PRODUCTS & STOCK LEVELS CURRENTLY IN MONGODB ---');
    console.table(
      products.map((p) => ({
        ID: p._id.toString(),
        SKU: p.sku,
        Name: p.name,
        'Stock in MongoDB': p.currentStock,
        'Lead Time (Days)': p.leadTimeDays,
      }))
    );

    // Show the 3 most recently recorded sales
    const recentSales = await SaleRecord.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('product', 'name sku');

    console.log('\n--- 3 MOST RECENT SALES RECORDED IN MONGODB ---');
    console.table(
      recentSales.map((s) => ({
        SaleID: s._id.toString(),
        Product: s.product?.name || s.product,
        Quantity: s.quantity,
        SaleDate: new Date(s.saleDate).toLocaleDateString(),
        RecordedAt: new Date(s.createdAt).toLocaleTimeString(),
      }))
    );

    console.log('=============================================================\n');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Inspection failed:', error.message);
    process.exit(1);
  }
};

inspectDB();
