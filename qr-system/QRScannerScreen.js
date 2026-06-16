import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';

const QRScannerScreen = () => {
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
      const qr = JSON.parse(data);
      const res = await fetch('https://ais-dev-iovedep2ucadwofltqwy33-414726648449.asia-southeast1.run.app/api/qr/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scannedQRData: data,
          memberId: 'm123',
          gymId: qr.gymId
        })
      });
      const result = await res.json();
      setStatus(result.success ? '✅ Access Granted / प्रवेश स्वीकृत' : result.error);
    } catch {
      setStatus('❌ Scan Failed / स्कैन विफल');
    }
  };

  if (hasPermission === null) return <Text>Requesting camera permission</Text>;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <View style={s.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleScan}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={s.overlay}>
        <Text style={s.text}>{status}</Text>
        {scanned && (
          <Button title="Scan Again" onPress={() => setScanned(false)} />
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center'
  },
  text: {
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 15,
    borderRadius: 12,
    textAlign: 'center',
    marginBottom: 15
  }
});

export default QRScannerScreen;
