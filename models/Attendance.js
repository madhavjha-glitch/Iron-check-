const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  memberId: String,
  gymId: String,
  checkInTime: { type: Date, default: Date.now },
  checkOutTime: { type: Date, default: null },
  date: Date,
  status: String,
  qrVerified: Boolean
});

module.exports = mongoose.model('Attendance', attendanceSchema);
