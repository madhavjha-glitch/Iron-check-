const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  memberId: String,
  status: { type: String, default: 'completed' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
