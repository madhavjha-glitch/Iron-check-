const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');

router.post('/scan', async (req, res) => {
  try {
    const { scannedQRData, memberId, gymId } = req.body;

    if (!scannedQRData || !scannedQRData.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: '❌ Invalid QR\nअमान्य QR कोड',
        gateAction: 'LOCK' 
      });
    }

    let qr;
    try {
      qr = JSON.parse(scannedQRData);
    } catch (e) {
      return res.status(400).json({ 
        success: false, 
        error: '❌ QR Parse Error\nQR कोड खराब है',
        gateAction: 'LOCK' 
      });
    }

    if (qr.type !== 'GYM_ENTRANCE') {
      return res.status(400).json({ 
        success: false, 
        error: '❌ Wrong QR Type\nगलत QR कोड',
        code: 'WRONG_QR_TYPE',
        gateAction: 'LOCK' 
      });
    }

    if (qr.gymId !== gymId) {
      return res.status(400).json({ 
        success: false, 
        error: '❌ Gym Mismatch\nयह दूसरे जिम का QR है',
        code: 'GYM_MISMATCH',
        gateAction: 'LOCK' 
      });
    }

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ 
        success: false, 
        error: '❌ Member Not Found\nमेंबर नहीं मिला',
        code: 'MEMBER_NOT_FOUND',
        gateAction: 'LOCK' 
      });
    }

    if (member.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        error: `❌ Inactive\nस्टेटस: ${member.status}`,
        code: 'INACTIVE_STATUS',
        gateAction: 'LOCK' 
      });
    }

    const now = new Date();
    if (new Date(member.expiryDate) < now) {
      return res.status(403).json({ 
        success: false, 
        error: '❌ Membership Expired\nआपकी membership expire हो गई',
        code: 'EXPIRED',
        gateAction: 'LOCK',
        expiryDate: member.expiryDate 
      });
    }

    const payment = await Payment.findOne({ 
      memberId, 
      status: 'completed' 
    }).sort({ createdAt: -1 });

    if (!payment) {
      return res.status(403).json({ 
        success: false, 
        error: '❌ No Payment\nपेमेंट रिकॉर्ड नहीं',
        code: 'NO_PAYMENT',
        gateAction: 'LOCK' 
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkedIn = await Attendance.findOne({
      memberId,
      date: { $gte: today },
      checkOutTime: null
    });

    if (checkedIn) {
      return res.status(400).json({ 
        success: false, 
        error: '❌ Already In\nआप पहले से अंदर हैं',
        code: 'ALREADY_IN',
        gateAction: 'LOCK',
        timeIn: checkedIn.checkInTime 
      });
    }

    const att = new Attendance({
      memberId,
      gymId,
      checkInTime: new Date(),
      date: today,
      status: 'in-progress',
      qrVerified: true
    });

    await att.save();
    member.lastSeenAt = new Date();
    await member.save();

    res.json({ 
      success: true, 
      message: '✅ Access Granted\nजिम में स्वागत है',
      gateAction: 'OPEN',
      duration: 3000 
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: '❌ Server Error\nसर्वर में त्रुटि',
      gateAction: 'LOCK',
      details: error.message 
    });
  }
});

module.exports = router;
