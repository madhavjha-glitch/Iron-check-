import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const MobileDisplay = () => {
  const [payload, setPayload] = useState('');

  const generate = () => {
    setPayload(JSON.stringify({
      gymId: 'xyz123',
      type: 'GYM_ENTRANCE',
      version: '1.0'
    }));
  };

  useEffect(() => {
    generate();
    const interval = setInterval(generate, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={s.c}>
      <Text style={s.t}>🔐 Gate QR Code / गेट क्यूआर</Text>
      {payload ? <QRCode value={payload} size={250} /> : null}
      <Text style={s.sub}>Refreshes every 5 mins / हर 5 मिनट में बदलेगा</Text>
    </View>
  );
};

const s = StyleSheet.create({
  c: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  t: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  sub: { marginTop: 20, color: '#666', fontSize: 12 }
});

export default MobileDisplay;
