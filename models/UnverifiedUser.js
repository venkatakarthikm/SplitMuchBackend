const mongoose = require('mongoose');

const unverifiedUserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true }, // Already hashed from controller
  verificationToken: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete after 24 hour
});

module.exports = mongoose.model('UnverifiedUser', unverifiedUserSchema);