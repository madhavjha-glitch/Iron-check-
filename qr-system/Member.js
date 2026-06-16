const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: String,
  status: { type: String, default: 'active' },
  expiryDate: Date,
  paymentVerified: { type: Boolean, default: true },
  isCheckedIn: { type: Boolean, default: false }
});

module.exports = mongoose.model('Member', memberSchema);
