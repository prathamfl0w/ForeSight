// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const SaleRecord = require('./models/SaleRecord');

/**
 * Seed Script for Inventory Reorder Point & Demand Forecasting Tool
 * Usage: node seed.js
 */
const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('\n=============================================================');
    console.log('⚠️  WARNING: DESTRUCTIVE ACTION');
    console.log('Deleting all existing Users, Products, and SaleRecords...');
    console.log('=============================================================\n');

    await User.deleteMany({});
    await Product.deleteMany({});
    await SaleRecord.deleteMany({});

    console.log('Creating demo user: demo@example.com / password123');
    // Model pre-save hook handles hashing the plain password
    const demoUser = await User.create({
      name: 'Demo Admin',
      email: 'demo@example.com',
      password: 'password123',
    });

    const now = new Date();
    const getDateBefore = (daysAgo) => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      return d;
    };

    console.log('Creating 6 demonstration products...');

    // 1. Fast, steady seller with LOW stock and a 14-day lead time -> REORDER_NOW
    const p1 = await Product.create({
      name: 'Organic Roasted Coffee Beans (1kg)',
      sku: 'COF-ROAST-1K',
      category: 'Beverages',
      currentStock: 25, // Less than reorder point (~73), triggers REORDER_NOW
      leadTimeDays: 14,
      unitCost: 650.00,
      imageUrl: '',
      owner: demoUser._id,
    });

    // 2. Fast seller with plenty of stock -> OK
    const p2 = await Product.create({
      name: 'Ceramic Pour-Over Dripper',
      sku: 'DRIP-CER-01',
      category: 'Equipment',
      currentStock: 240, // Well above reorder point (~45), status OK
      leadTimeDays: 7,
      unitCost: 450.00,
      imageUrl: '',
      owner: demoUser._id,
    });

    // 3. Slow, steady seller with moderate stock -> OK
    const p3 = await Product.create({
      name: 'Artisan Glass Server (600ml)',
      sku: 'SRV-GLS-600',
      category: 'Equipment',
      currentStock: 45, // Above reorder point (~4), status OK
      leadTimeDays: 5,
      unitCost: 890.00,
      imageUrl: '',
      owner: demoUser._id,
    });

    // 4. VERY erratic seller with moderate stock -> LOW / REORDER_NOW due to inflated safety stock
    const p4 = await Product.create({
      name: 'Specialty Espresso Tamper 58mm',
      sku: 'ACC-TMP-58',
      category: 'Accessories',
      currentStock: 30, // Moderate stock, but erratic demand inflates safety stock, landing on LOW/REORDER_NOW
      leadTimeDays: 14,
      unitCost: 1200.00,
      imageUrl: '',
      owner: demoUser._id,
    });

    // 5. Brand-new product with stock but ZERO sales -> OK
    const p5 = await Product.create({
      name: 'Cold Brew Vacuum Flask (1L)',
      sku: 'FLK-VAC-1L',
      category: 'Drinkware',
      currentStock: 60, // Zero sales, 0 demand, status OK
      leadTimeDays: 10,
      unitCost: 1100.00,
      imageUrl: '',
      owner: demoUser._id,
    });

    // 6. Seasonal product whose last 10 days are far busier than the 50 days before
    const p6 = await Product.create({
      name: 'Holiday Festive Coffee Gift Set',
      sku: 'BOX-FEST-24',
      category: 'Gift Sets',
      currentStock: 35, // Low for a 7-day spike, but fine on a 30/60-day average
      leadTimeDays: 7,
      unitCost: 1450.00,
      imageUrl: '',
      owner: demoUser._id,
    });

    console.log('Generating ~60 days of historical sales records...');
    const salesToInsert = [];

    // Sales for P1: Fast, steady seller (~5 units/day consistently)
    for (let day = 0; day < 60; day++) {
      if (day % 7 !== 0) { // Slight realistic weekend variance
        salesToInsert.push({
          product: p1._id,
          quantity: 5,
          saleDate: getDateBefore(day),
          owner: demoUser._id,
        });
      }
    }

    // Sales for P2: Fast seller (~6 units/day)
    for (let day = 0; day < 60; day++) {
      if (day % 4 !== 0) {
        salesToInsert.push({
          product: p2._id,
          quantity: 6,
          saleDate: getDateBefore(day),
          owner: demoUser._id,
        });
      }
    }

    // Sales for P3: Slow, steady seller (1 unit every 3 days)
    for (let day = 0; day < 60; day += 3) {
      salesToInsert.push({
        product: p3._id,
        quantity: 1,
        saleDate: getDateBefore(day),
        owner: demoUser._id,
      });
    }

    // Sales for P4: Erratic seller (silent most days, large spikes of 12-15 units on occasional days)
    for (let day = 0; day < 60; day++) {
      if (day === 2 || day === 7 || day === 14 || day === 21 || day === 35 || day === 48) {
        salesToInsert.push({
          product: p4._id,
          quantity: 12,
          saleDate: getDateBefore(day),
          owner: demoUser._id,
        });
      }
    }

    // Sales for P5: ZERO sales recorded (Brand new product)

    // Sales for P6: Seasonal surge (almost no sales days 11-60, but heavy sales days 0-10)
    for (let day = 12; day < 60; day += 8) {
      salesToInsert.push({
        product: p6._id,
        quantity: 1,
        saleDate: getDateBefore(day),
        owner: demoUser._id,
      });
    }
    for (let day = 0; day <= 10; day++) {
      salesToInsert.push({
        product: p6._id,
        quantity: 8,
        saleDate: getDateBefore(day),
        owner: demoUser._id,
      });
    }

    await SaleRecord.insertMany(salesToInsert);
    console.log(`Inserted ${salesToInsert.length} sale records.\n`);

    console.log('========================================================================');
    console.log('DATABASE SEED COMPLETE');
    console.log('========================================================================');
    console.log('Login Email:    demo@example.com');
    console.log('Login Password: password123');
    console.log('------------------------------------------------------------------------');
    console.table([
      { SKU: p1.sku, Name: p1.name, Stock: p1.currentStock, LeadTime: p1.leadTimeDays, ExpectedStatus: 'REORDER_NOW' },
      { SKU: p2.sku, Name: p2.name, Stock: p2.currentStock, LeadTime: p2.leadTimeDays, ExpectedStatus: 'OK' },
      { SKU: p3.sku, Name: p3.name, Stock: p3.currentStock, LeadTime: p3.leadTimeDays, ExpectedStatus: 'OK' },
      { SKU: p4.sku, Name: p4.name, Stock: p4.currentStock, LeadTime: p4.leadTimeDays, ExpectedStatus: 'LOW / REORDER_NOW (Erratic Demand)' },
      { SKU: p5.sku, Name: p5.name, Stock: p5.currentStock, LeadTime: p5.leadTimeDays, ExpectedStatus: 'OK (Zero Demand)' },
      { SKU: p6.sku, Name: p6.name, Stock: p6.currentStock, LeadTime: p6.leadTimeDays, ExpectedStatus: 'Changes between 7d and 30d window' },
    ]);
    console.log('========================================================================\n');

    await mongoose.connection.close();
    console.log('Database connection closed cleanly.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

