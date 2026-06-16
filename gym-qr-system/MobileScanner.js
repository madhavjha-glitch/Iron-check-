import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';

const MobileScanner = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleScan = async ({ data }) => {
    setScanned(true);
    setStatus('Processing...');
    try {
      const qrObj = JSON.parse(data);
      const res = await fetch('https://ais-dev-iovedep2ucadwofltqwy33-414726648449.asia-southeast1.run.app/api/qr/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scannedQRData: data,
          memberId: 'm123',
          gymId: qrObj.gymId
        })
      });
      const result = await res.json();
      setStatus(result.success ? result.message : result.error);
    } catch {
      setStatus('❌ Scan Failed\nस्कैन विफल रहा');
    }
  };

  if (hasPermission === null) return <Text>Requesting permission</Text>;
  if (hasPermission === false) return <Text>No camera access</Text>;

  return (
    <View style={s.c}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleScan}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={s.o}>
        <Text style={s.t}>{status}</Text>
        {scanned && (
          <Button title="Scan Again" onPress={() => setScanned(false)} />
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center' },
  o: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center'
  },
  t: {
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 15,
    borderRadius: 12,
    textAlign: 'center',
    marginBottom: 15
  }
});

export default MobileScanner;
