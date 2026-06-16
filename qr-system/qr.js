const express = require('express');
const router = express.Router();
const Member = require('./Member');

const err = (s, h, c) => ({ success: false, error: `${s}\n${h}`, code: c });

router.post('/verify', async (req, res) => {
  try {
    const { scannedQRData, memberId, gymId } = req.body;
    let qr;
    
    try {
      qr = JSON.parse(scannedQRData);
    } catch {
      return res.status(400).json(
        err('❌ Invalid QR Code', 'यह क्यूआर कोड मान्य नहीं है', 'QR_INVALID')
      );
    }

    if (!qr || qr.type !== 'GYM_ENTRANCE') {
      return res.status(400).json(
        err('❌ Invalid Gate QR', 'यह वैध प्रवेश क्यूआर कोड नहीं है', 'QR_TYPE')
      );
    }

    if (qr.gymId !== gymId) {
      return res.status(400).json(
        err('❌ Gym Mismatch', 'क्यूआर कोड इस जिम से मेल नहीं खाता', 'MISMATCH')
      );
    }

    const m = await Member.findById(memberId);
    if (!m) {
      return res.status(404).json(
        err('❌ Member Not Found', 'यह सदस्य नहीं मिला', 'NOT_FOUND')
      );
    }

    if (m.status !== 'active') {
      return res.status(403).json(
        err('❌ Inactive Member', 'आपकी सदस्यता चालू नहीं है', 'INACTIVE')
      );
    }

    if (new Date(m.expiryDate) < new Date()) {
      return res.status(403).json(
        err('❌ Membership Expired', 'आपकी membership expire ho gayi hai', 'EXPIRED')
      );
    }

    if (!m.paymentVerified) {
      return res.status(403).json(
        err('❌ Unpaid Fees', 'आपका भुगतान सत्यापित नहीं हुआ है', 'UNPAID')
      );
    }

    if (m.isCheckedIn) {
      return res.status(400).json(
        err('❌ Already Checked In', 'आप पहले ही चेक इन कर चुके हैं', 'ALREADY_IN')
      );
    }

    m.isCheckedIn = true;
    await m.save();

    res.json({ success: true, message: 'Welcome / स्वागत है!' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
