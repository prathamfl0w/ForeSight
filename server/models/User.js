const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\S+@\S+\.\S+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Ensures the password is never returned by default in queries
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Pre-save middleware to hash the password before saving into the database.
 * 
 * The isModified('password') check is essential: without it, whenever a user document
 * is modified and saved (e.g., updating user name, profile, or timestamps), Mongoose would
 * pass the already-hashed password string to bcrypt.hash(), re-hashing the hash and
 * permanently breaking future login authentication for that user.
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Instance method to compare an entered plain text password with the hashed password stored in the database.
 * Returns a Promise that resolves to true or false.
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

