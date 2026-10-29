// Load environment variables at the very top before anything else
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const saleRoutes = require('./routes/saleRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

// Import error handler middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Standard middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Serve uploads folder statically so images are accessible at http://localhost:5000/uploads/filename
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
  });
});

// Mount application routers
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/inventory', inventoryRoutes);

// Catch-all 404 handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

/**
 * Error handling middleware:
 * Registered AFTER all routes and AFTER the 404 handler, but BEFORE app.listen.
 * Middleware executes sequentially in Express; placing the error handler after all routes ensures
 * that any errors passed via next(err) in controllers are caught and translated into consistent JSON.
 */
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB before starting the HTTP server when run directly
if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
    });
  });
}

module.exports = app;
