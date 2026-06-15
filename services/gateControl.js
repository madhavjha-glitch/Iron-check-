import axios from "axios";

// ⚠️ Gate sirf success response par hi open hoga
export const controlGate = async (gateAction, duration = 3000) => {
  try {
    // Gate sirf 'OPEN' par khulega
    if (gateAction !== 'OPEN') {
      console.error('❌ Gate action is not OPEN. Keeping locked.');
      return false;
    }

    // Hardware signal send करो
    const response = await axios.post(
      'http://192.168.1.100:8080/gate/control',
      {
        action: 'OPEN',
        duration: duration,
        timestamp: Date.now()
      },
      { 
        timeout: 2000,
        headers: { 'Authorization': process.env.GATE_SECRET || 'default-secret-token' }
      }
    );

    if (response.status === 200 && response.data.success) {
      console.log('✅ Gate opened for', duration, 'ms');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Gate control error:', error.message);
    return false;
  }
};
