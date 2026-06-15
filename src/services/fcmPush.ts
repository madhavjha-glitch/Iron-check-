import axios from "axios";

/**
 * Server-Side Push Notification dispatcher utilizing standard Google FCM REST API
 * @param deviceToken Destination client registration token
 * @param title Header text of the push notification
 * @param body Body text of the prompt
 * @param data Optional payload key-value matrix
 */
export async function sendPushNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const fcmServerKey = process.env.FCM_SERVER_KEY || "";
  
  if (!fcmServerKey) {
    console.warn("⚠️ FCM_SERVER_KEY is undefined. Simulating cloud push notification dispatch:", { deviceToken, title, body });
    return true; // Sim success during dev sandbox
  }

  try {
    const fcmEndpoint = "https://fcm.googleapis.com/fcm/send";
    
    const response = await axios.post(
      fcmEndpoint,
      {
        to: deviceToken,
        notification: {
          title,
          body,
          sound: "default",
          badge: "1",
          click_action: "FLUTTER_NOTIFICATION_CLICK"
        },
        data: data || {}
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `key=${fcmServerKey}`
        },
        timeout: 4000
      }
    );

    if (response.status === 200) {
      console.log(`✅ Push notification sent successfully to token match ${deviceToken.slice(0, 12)}...`);
      return true;
    }
    return false;
  } catch (error: any) {
    console.error("❌ Firebase Cloud Messaging Push exception:", error.message);
    return false;
  }
}

/**
 * CLIENT-SIDE BROWSERS PUSH SUBSCRIPTION HELPER
 * Evaluates Permission status and returns standard registration token setup
 */
export async function setupClientPushNotifications(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("This client environment does not support web dynamic push permissions.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("🔔 Push notification permission initialized successfully.");
      // In a real browser app, we retrieve token using Messaging SDK getToken() helper
      // e.g: const token = await getToken(messaging, { vapidKey: '...' })
      return "simulated_browser_fcm_token_arjun_web";
    }
    return null;
  } catch (err) {
    console.error("Failed requesting browser subscription:", err);
    return null;
  }
}
