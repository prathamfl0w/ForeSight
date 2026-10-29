const mongoose = require('mongoose');

/**
 * Connect to MongoDB instance using Mongoose.
 * 
 * If the database connection fails on startup, the application cannot function
 * because all controllers and business operations require database persistence.
 * Exiting immediately with process.exit(1) prevents the server from operating
 * in an unstable or broken state.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Exit process with failure code so process managers know the service failed to start
    process.exit(1);
  }
};

module.exports = connectDB;

