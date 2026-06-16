const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: String,
  status: { type: String, default: 'active' },
  expiryDate: Date,
  lastSeenAt: Date
});

module.exports = mongoose.model('Member', memberSchema);
