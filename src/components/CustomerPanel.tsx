import React, { useState, useEffect } from "react";
import { 
  Dumbbell, Home, Calendar, QrCode, Bell, LayoutDashboard, ChevronRight,
  TrendingUp, Settings, Trash2, Award, Zap, Flame, Sparkles, LogOut,
  Clock, X, Send, Bot, RefreshCw, Camera, Utensils, Heart, CheckCircle, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MemberProfile, AttendanceLog, ExerciseRoutine, GymNotification, GymGateState
} from "../types";
import { 
  logDailyCheckIn, logDailyCheckOut, subscribeToGlobalLiveOccupancy, subscribeToMemberReminders, markReminderRead,
  subscribeToRoutines, updateMemberProfilePhoto, triggerGateHandshakeRecord,
  subscribeToGymGate, lockGateManual
} from "../firebase";
import CameraCapture from "./CameraCapture";

// Modular Sub-Components Imports
import MemberDashboard from "./member/MemberDashboard";
import MemberWorkout from "./member/MemberWorkout";
import MemberDiet from "./member/MemberDiet";
import MemberProgress from "./member/MemberProgress";
import MemberLeaderboard from "./member/MemberLeaderboard";
import MemberProfileComponent from "./member/MemberProfile";
import PremiumLab from "./member/PremiumLab";

interface CustomerPanelProps {
  userProfile: MemberProfile;
  attendanceLogs: AttendanceLog[];
  onLogout: () => void;
}

export default function CustomerPanel({
  userProfile,
  attendanceLogs,
  onLogout,
}: CustomerPanelProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Firebase Real-Time Listeners Data
  const [routines, setRoutines] = useState<ExerciseRoutine[]>([]);
  const [reminders, setReminders] = useState<GymNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [gymGate, setGymGate] = useState<GymGateState | null>(null);

  // QR Access Pass overlay states
  const [showQrSimulator, setShowQrSimulator] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [gatewaySuccessMsg, setGatewaySuccessMsg] = useState("");
  const [gatewayErrorMsg, setGatewayErrorMsg] = useState("");
  const [scanScenario, setScanScenario] = useState<"valid" | "expired" | "inactive" | "no_payment" | "invalid_format" | "wrong_type" | "gym_mismatch" | "duplicate">("valid");
  const [useGateWebcam, setUseGateWebcam] = useState(false);
  const gateVideoRef = React.useRef<HTMLVideoElement>(null);

  // Webcam streamer for QR gate scanner
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (showQrSimulator && useGateWebcam) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
        .then(stream => {
          activeStream = stream;
          if (gateVideoRef.current) {
            gateVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.warn("Failed loading scanner camera:", err);
        });
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showQrSimulator, useGateWebcam]);

  // Photo / Webcam Modal States
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(userProfile.photoUrl);

  // AI Avatar Generator States
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarInterest, setAvatarInterest] = useState("Bodybuilding & Muscle Gains");
  const [avatarStyle, setAvatarStyle] = useState("Cyberpunk Neon Gym");
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState("");
  const [avatarSavedMsg, setAvatarSavedMsg] = useState("");

  // AI Chatbot States
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: `Welcome to the Zymnix AI Fitness Lab! 🏋️‍♂️ I am **Coach Zymnix**, your dedicated gym partner and bodybuilding scientist. Ask me any questions on compound movements, splits, macro planning, recovery times, form improvement, or supplements!`,
    },
  ]);

  // Read subscribers
  useEffect(() => {
    // 1. Subscribe to gym alerts/reminders
    const unsubReminders = subscribeToMemberReminders(
      userProfile.uid,
      (updatedList) => setReminders(updatedList)
    );

    // 2. Subscribe to workout routines
    const unsubRoutines = subscribeToRoutines((updatedRoutines) => {
      setRoutines(updatedRoutines);
    });

    // 3. Subscribe to gate state
    const unsubGate = subscribeToGymGate((updatedGate) => {
      setGymGate(updatedGate);
    });

    return () => {
      unsubReminders();
      unsubRoutines();
      unsubGate();
    };
  }, [userProfile.uid]);

  // Mark gym alerts read
  const handleMarkAlertRead = async (alertId: string) => {
    try {
      await markReminderRead(alertId);
    } catch (e) {
      console.error("Failed to mark alert as read:", e);
    }
  };

  // Play buzzer/chime when member scans the Gate QR successfully
  const playVerifySound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 880; // High-pitch access granted chime
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio verify blocked by policy:", e);
    }
  };

  // Manual Check-out Trigger
  const handleCheckOut = async () => {
    try {
      await logDailyCheckOut(userProfile.uid);
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(550, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.2);
        osc.type = "sine";
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } catch (e) {}
    } catch (err) {
      console.warn("Checkout completed:", err);
    }
  };

  // Gateway check-in handshakes via Access QR Simulation
  const handleScanGateSimulation = async () => {
    setGatewayStatus("scanning");
    setGatewayErrorMsg("");
    setGatewaySuccessMsg("");

    // Prepare inputs based on selected scenario
    let memberId = userProfile.uid;
    let gymId = "gym_hq_1";
    let dataPayload = "";

    const standardQrObj = {
      gymId: "gym_hq_1",
      gymName: "Zymnix Gym",
      type: "GYM_ENTRANCE",
      createdAt: new Date().toISOString(),
      version: "1.0"
    };

    switch (scanScenario) {
      case "valid":
        memberId = userProfile.uid;
        gymId = "gym_hq_1";
        dataPayload = JSON.stringify(standardQrObj);
        break;
      case "expired":
        memberId = "customer_expired";
        gymId = "gym_hq_1";
        dataPayload = JSON.stringify(standardQrObj);
        break;
      case "inactive":
        memberId = "customer_inactive";
        gymId = "gym_hq_1";
        dataPayload = JSON.stringify(standardQrObj);
        break;
      case "no_payment":
        memberId = "customer_no_payment";
        gymId = "gym_hq_1";
        dataPayload = JSON.stringify(standardQrObj);
        break;
      case "invalid_format":
        memberId = userProfile.uid;
        gymId = "gym_hq_1";
        dataPayload = "PLAIN TEXT NOT JSON MATRIX";
        break;
      case "wrong_type":
        memberId = userProfile.uid;
        gymId = "gym_hq_1";
        dataPayload = JSON.stringify({
          gymId: "gym_hq_1",
          type: "OUTDOOR_SWIMMING_POOL",
          version: "1.0"
        });
        break;
      case "gym_mismatch":
        memberId = userProfile.uid;
        gymId = "gym_hq_1";
        dataPayload = JSON.stringify({
          gymId: "mismatched_beach_muscle_2",
          gymName: "Beach Muscle Gym",
          type: "GYM_ENTRANCE",
          createdAt: new Date().toISOString(),
          version: "1.0"
        });
        break;
      case "duplicate":
        memberId = userProfile.uid;
        gymId = "gym_hq_1";
        dataPayload = JSON.stringify(standardQrObj);
        break;
    }

    // Delay simulation to feel like actual physical camera hardware scans
    setTimeout(async () => {
      try {
        const response = await fetch("/api/qr/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            scannedQRData: dataPayload.trim(),
            memberId: memberId,
            gymId: gymId
          })
        });

        const result = await response.json();

        if (!result.success) {
          // Play failed buzzer/chime sound
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioCtx();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(150, audioCtx.currentTime); // Low buzz
            osc.type = "sawtooth";
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
          } catch (e) {}

          const errorCode = result.code;
          let errMsg = result.error || "Access Denied";

          const scenarioMessages: { [key: string]: string } = {
            'EMPTY_QR_DATA': '❌ QR code is empty. Scan again.',
            'INVALID_QR_FORMAT': '❌ Invalid QR code format. Check QR code.',
            'WRONG_QR_TYPE': '❌ This is not a gym QR code.',
            'GYM_MISMATCH': '❌ This QR is for a different gym.',
            'MEMBER_NOT_FOUND': '❌ Member not found. Contact admin.',
            'INACTIVE_MEMBERSHIP': '❌ Membership is inactive.',
            'MEMBERSHIP_EXPIRED': `❌ Membership expired on ${result.expiryDate ? new Date(result.expiryDate).toLocaleDateString() : 'the past date'}.`,
            'NO_PAYMENT': '❌ No valid payment found.',
            'ALREADY_CHECKED_IN': `❌ Already checked in ${result.data?.timeInGymMinutes || result.data?.duration || 0} minutes ago.`,
            'INVALID_QR_VERSION': '❌ QR code version invalid.'
          };

          if (errorCode && scenarioMessages[errorCode]) {
            errMsg = scenarioMessages[errorCode];
          }

          setGatewayErrorMsg(errMsg);
          setGatewayStatus("error");
          await triggerGateHandshakeRecord(memberId, userProfile.name, "refused");
          return;
        }

        // Success vibration/beep, solenoid unlocked!
        playVerifySound();
        const todayStr = new Date().toISOString().split("T")[0];

        if (result.message && (result.message.includes("out") || result.message.includes("Checked out") || result.attendance?.checkOutTime)) {
          // Checkout
          await logDailyCheckOut(memberId);
          setGatewaySuccessMsg(`ACCESS CONFIRMED. Turnstile Gate unlocked! Checked out successfully. Goodbye, ${result.attendance ? result.attendance.memberName || userProfile.name : userProfile.name}!`);
        } else {
          // Checkin
          try {
            await logDailyCheckIn(memberId, userProfile.name);
          } catch (e) {
            console.warn("Already synchronized standard checked-in record locally.");
          }
          setGatewaySuccessMsg(`ACCESS CONFIRMED. Turnstile Gate unlocked! Welcome, ${result.attendance ? result.attendance.memberName || userProfile.name : userProfile.name}!`);
        }

        setGatewayStatus("success");
        await triggerGateHandshakeRecord(memberId, result.attendance?.memberName || userProfile.name, "granted");

      } catch (err: any) {
        console.error("Scanning error:", err);
        setGatewayErrorMsg(err.message || "Failed communicating with scan API.");
        setGatewayStatus("error");
        await triggerGateHandshakeRecord(memberId, userProfile.name, "refused");
      }
    }, 1200);
  };

  const handleCloseGateSimulator = () => {
    setShowQrSimulator(false);
    setGatewayStatus("idle");
    setGatewaySuccessMsg("");
    setGatewayErrorMsg("");
    setUseGateWebcam(false);
  };

  // Avatar generator logic
  const handleGenerateAvatar = async () => {
    setGeneratingAvatar(true);
    setAvatarError("");
    setAvatarSavedMsg("");
    try {
      const response = await fetch("/api/gemini/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interest: avatarInterest,
          style: avatarStyle,
          username: userProfile.name,
        }),
      });
      if (!response.ok) {
        throw new Error("Could not contact the server avatar endpoint.");
      }
      const data = await response.json();
      if (data.photoUrl) {
        setGeneratedAvatarUrl(data.photoUrl);
        if (data.message) {
          setAvatarSavedMsg(data.message);
        }
      } else {
        throw new Error(data.error || "No photoUrl was returned by server generator.");
      }
    } catch (err: any) {
      setAvatarError(err.message || "Failed to make custom fitness avatar.");
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!generatedAvatarUrl) return;
    try {
      await updateMemberProfilePhoto(userProfile.uid, generatedAvatarUrl);
      setPhotoUrl(generatedAvatarUrl);

      // Backup local Session representation
      const storedActiveUser = localStorage.getItem("gym_demo_current_user");
      if (storedActiveUser) {
        try {
          const parsed = JSON.parse(storedActiveUser);
          if (parsed.profile) {
            parsed.profile.photoUrl = generatedAvatarUrl;
            localStorage.setItem("gym_demo_current_user", JSON.stringify(parsed));
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      setAvatarSavedMsg("Success! Customized avatar saved as your official profile picture.");
      setTimeout(() => {
        setShowAvatarModal(false);
        setGeneratedAvatarUrl("");
        setAvatarSavedMsg("");
      }, 1800);
    } catch (err: any) {
      setAvatarError("Failed to save high-fidelity photo: " + err.message);
    }
  };

  // Chatbot message handling
  const handleSendChatMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || sendingMessage) return;

    const userMsg = { role: "user" as const, content: textToSend };
    const updatedMessages = [...chatMessages, userMsg];
    
    setChatMessages(updatedMessages);
    if (!customText) setChatInput("");
    setSendingMessage(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      if (!response.ok) {
        throw new Error("Coach Zymnix is in active set rest. Could not connect to API.");
      }
      const data = await response.json();
      if (data.reply) {
        setChatMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
      } else {
        throw new Error(data.error || "No reply available.");
      }
    } catch (err: any) {
      setChatMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: `❌ [Connection Offline] Coach Zymnix says: "Handshake failed, but remember: consistency trumps perfection! Push through your compound movements today." (${err.message})`,
        },
      ]);
    } finally {
      setSendingMessage(false);
    }
  };

  // Camera photograph captures
  const handleCapturePhoto = async (base64Photo: string) => {
    try {
      await updateMemberProfilePhoto(userProfile.uid, base64Photo);
      setPhotoUrl(base64Photo);

      // BackUp LocalStorage session representation
      const storedActiveUser = localStorage.getItem("gym_demo_current_user");
      if (storedActiveUser) {
        try {
          const parsed = JSON.parse(storedActiveUser);
          if (parsed.profile) {
            parsed.profile.photoUrl = base64Photo;
            localStorage.setItem("gym_demo_current_user", JSON.stringify(parsed));
          }
        } catch (e) {
          console.error(e);
        }
      }

      setShowCameraModal(false);
    } catch (err: any) {
      alert("Failed to store snapshot: " + err.message);
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "workout", label: "Workouts", icon: Dumbbell },
    { id: "diet", label: "Nutrition", icon: Utensils },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "leaderboard", label: "Streaks", icon: Award },
    { id: "profile", label: "Profile", icon: Settings },
  ];

  return (
    <div className="flex flex-col bg-slate-950 text-slate-100 w-full relative pb-20 min-h-[82vh]">
      
      {/* Top Universal App Header Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-slate-950/80 p-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 font-black text-white shadow shadow-indigo-600/30">
            Z
          </div>
          <div>
            <h1 className="text-xs font-black tracking-wider uppercase text-white leading-none">Zymnix</h1>
            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest block mt-0.5">Central Hub</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Gym announcements bell badge */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-slate-900 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer relative"
            title="Gym Announcements"
          >
            <Bell className="h-4 w-4" />
            {reminders.some(r => !r.isRead) && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
            )}
          </button>

          {/* Secure log-out button */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-slate-900 border border-white/5 hover:border-rose-950 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
            title="Exit Session"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Slide-out Gym Announcements Inbox Overlay */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-4 right-4 z-40 bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="text-xs font-black uppercase text-white tracking-widest">Gym Bulletins & Alerts</h4>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer"
              >
                ×
              </button>
            </div>

            {reminders.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {reminders.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-2xl text-xs border relative transition-all ${
                      alert.isRead 
                        ? "bg-slate-950/40 border-white/5 text-slate-400" 
                        : "bg-indigo-950/20 border-indigo-505/25 text-slate-200"
                    }`}
                  >
                    {!alert.isRead && (
                      <button
                        onClick={() => handleMarkAlertRead(alert.id)}
                        className="absolute top-2 right-2 text-[9px] bg-indigo-600/30 text-indigo-300 py-0.5 px-2 rounded hover:bg-indigo-600/50 cursor-pointer"
                      >
                        Acknowledge
                      </button>
                    )}
                    <span className="text-[9px] text-slate-500 font-mono block mb-1">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </span>
                    <p className="font-bold pr-14 leading-normal text-slate-250">{alert.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-slate-500 py-4 font-sans">No gym alerts currently active.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tab Stage Container */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === "dashboard" && (
          <MemberDashboard
            userProfile={userProfile}
            attendanceLogs={attendanceLogs}
            photoUrl={photoUrl}
            onNavigateTab={setActiveTab}
            onOpenQrScanner={() => setShowQrSimulator(true)}
            onOpenAvatarModal={() => {
              setGeneratedAvatarUrl("");
              setAvatarError("");
              setAvatarSavedMsg("");
              setShowAvatarModal(true);
            }}
            onOpenPhotoModal={() => setShowCameraModal(true)}
            onCheckOut={handleCheckOut}
          />
        )}

        {activeTab === "workout" && (
          <MemberWorkout routines={routines} />
        )}

        {activeTab === "diet" && (
          <MemberDiet />
        )}

        {activeTab === "progress" && (
          <MemberProgress
            onOpenPhotoModal={() => setShowCameraModal(true)}
            userPhoto={photoUrl}
            memberId={userProfile.uid}
          />
        )}

        {activeTab === "leaderboard" && (
          <MemberLeaderboard />
        )}

        {activeTab === "profile" && (
          <MemberProfileComponent userProfile={userProfile} onLogout={onLogout} />
        )}

        {activeTab === "premium-lab" && (
          <PremiumLab 
            userProfile={userProfile}
            attendanceLogsCount={attendanceLogs.length}
            onBackToDashboard={() => setActiveTab("dashboard")}
          />
        )}
      </main>

      {/* Interactive Bottom Tab Application Bar */}
      {activeTab !== "premium-lab" && (
        <nav className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-slate-950/95 backdrop-blur-md z-40 grid grid-cols-6 h-18 text-center py-2.5 shadow-2xl">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="flex flex-col items-center justify-center transition-all group cursor-pointer text-center"
              >
                <IconComponent 
                  className={`h-4.5 w-4.5 transition-colors ${
                    isActive 
                      ? "text-indigo-400 stroke-[2.5]" 
                      : "text-slate-500 group-hover:text-slate-300"
                  }`} 
                />
                <span className={`text-[9px] font-black tracking-wide mt-1 transition-all uppercase select-none ${
                  isActive 
                    ? "text-indigo-400 font-black scale-102" 
                    : "text-slate-500 group-hover:text-slate-300 font-semibold"
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* DIGITAL ACCESS GATEWAY / MEMBER QR SCANNER OVERLAY */}
      <AnimatePresence>
        {showQrSimulator && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col md:flex-row items-center justify-center p-4 gap-6 overflow-y-auto">
            
            {/* LEFT SIDE: SCENARIO INJECTOR HUD & DEBUG PANEL */}
            <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl w-full max-w-sm text-left space-y-4 shadow-xl shrink-0">
              <div>
                <span className="text-[9.5px] text-amber-500 font-extrabold uppercase tracking-widest block font-mono">DEBUG CONTROL BOARD</span>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Test Scenario Simulator</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  Inject different biometric signatures to evaluate server-side verification and device feedback loops.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Active Identity & Payload Matrix</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => { setScanScenario("valid"); setGatewayStatus("idle"); }}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex justify-between items-center cursor-pointer ${scanScenario === "valid" ? "bg-indigo-600/25 border-indigo-500 text-white font-bold" : "bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-900"}`}
                  >
                    <span>🟢 Active Member (Current)</span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 bg-slate-900 rounded uppercase text-slate-400 border border-white/5">PASS</span>
                  </button>

                  <button
                    onClick={() => { setScanScenario("expired"); setGatewayStatus("idle"); }}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex justify-between items-center cursor-pointer ${scanScenario === "expired" ? "bg-amber-600/25 border-amber-500 text-white font-bold" : "bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-900"}`}
                  >
                    <span>🔴 Expired Dues (Dana)</span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 bg-slate-900 rounded uppercase text-slate-400 border border-white/5">EXPIRED</span>
                  </button>

                  <button
                    onClick={() => { setScanScenario("inactive"); setGatewayStatus("idle"); }}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex justify-between items-center cursor-pointer ${scanScenario === "inactive" ? "bg-rose-600/25 border-rose-500 text-white font-bold" : "bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-900"}`}
                  >
                    <span>🔴 Inactive Member (Fox)</span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 bg-slate-900 rounded uppercase text-slate-400 border border-white/5">INACTIVE</span>
                  </button>

                  <button
                    onClick={() => { setScanScenario("no_payment"); setGatewayStatus("idle"); }}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex justify-between items-center cursor-pointer ${scanScenario === "no_payment" ? "bg-rose-600/25 border-rose-500 text-white font-bold" : "bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-900"}`}
                  >
                    <span>🔴 Unpaid Balance (Walter)</span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 bg-slate-900 rounded uppercase text-slate-400 border border-white/5">UNPAID</span>
                  </button>

                  <button
                    onClick={() => { setScanScenario("invalid_format"); setGatewayStatus("idle"); }}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex justify-between items-center cursor-pointer ${scanScenario === "invalid_format" ? "bg-rose-600/25 border-rose-500 text-white font-bold" : "bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-900"}`}
                  >
                    <span>⚠️ Invalid QR format</span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 bg-slate-900 rounded uppercase text-slate-400 border border-white/5">FORMAT</span>
                  </button>

                  <button
                    onClick={() => { setScanScenario("wrong_type"); setGatewayStatus("idle"); }}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex justify-between items-center cursor-pointer ${scanScenario === "wrong_type" ? "bg-rose-600/25 border-rose-500 text-white font-bold" : "bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-900"}`}
                  >
                    <span>🚫 Bad QR Action Type</span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 bg-slate-900 rounded uppercase text-slate-400 border border-white/5">TYPE</span>
                  </button>

                  <button
                    onClick={() => { setScanScenario("gym_mismatch"); setGatewayStatus("idle"); }}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex justify-between items-center cursor-pointer ${scanScenario === "gym_mismatch" ? "bg-rose-600/25 border-rose-500 text-white font-bold" : "bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-900"}`}
                  >
                    <span>🏢 Wrong Gym Location</span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 bg-slate-900 rounded uppercase text-slate-400 border border-white/5">MISMATCH</span>
                  </button>

                  <button
                    onClick={() => { setScanScenario("duplicate"); setGatewayStatus("idle"); }}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex justify-between items-center cursor-pointer ${scanScenario === "duplicate" ? "bg-violet-600/25 border-violet-500 text-white font-bold" : "bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-900"}`}
                  >
                    <span>🔄 Duplicate Quick Check-in</span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 bg-slate-900 rounded uppercase text-slate-400 border border-white/5">DOUBLE</span>
                  </button>
                </div>
              </div>

              {/* Physical Gate Live Feedback HUD */}
              {gymGate && (
                <div className="bg-slate-950 p-3 rounded-xl border border-white/5 text-[10.5px] leading-relaxed space-y-1">
                  <div className="flex justify-between font-mono text-[8px] font-black text-slate-500 tracking-widest border-b border-white/5 pb-1 mb-1">
                    <span>LIVE PHYSICAL TOKENS SYNC</span>
                    <span className={gymGate.gateStatus === "unlocked" ? "text-emerald-400 flex items-center gap-1" : "text-rose-400"}>
                      ● {gymGate.gateStatus === "unlocked" ? "RELEASED" : "SECURED"}
                    </span>
                  </div>
                  <p className="text-slate-350">
                    Solenoid: <span className="text-slate-200 font-bold font-mono">{gymGate.gateStatus === "unlocked" ? "Unlocked (Active Flow)" : "Armed & Locked"}</span>
                  </p>
                  <p className="text-slate-400">
                    Last transit: <span className="text-slate-300 font-medium font-mono uppercase">{gymGate.gateOpenedBy || "Wait state (None)"}</span>
                  </p>
                  {gymGate.gateStatus === "unlocked" && (
                    <div className="py-1 px-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-mono animate-pulse mt-1 text-center font-bold">
                      Physical Turnstile hardware released for 5 seconds.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT SIDE: EXPO APP PHONE FRAME EMULATOR */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-black text-white w-[340px] h-[670px] rounded-[48px] border-[12px] border-slate-800 shadow-2xl relative flex flex-col overflow-hidden select-none shrink-0"
            >
              {/* Dynamic Physical iPhone Notch */}
              <div className="absolute top-0 inset-x-0 h-7 bg-slate-900 text-center flex items-center justify-center z-50 rounded-b-3xl">
                <div className="w-24 h-4.5 bg-black rounded-b-xl flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                  <span className="w-8 h-1 bg-slate-800 rounded-full" />
                </div>
                {/* Time Indicator */}
                <span className="absolute left-6 text-[8px] font-bold text-slate-400 font-mono tracking-tight leading-none">9:41</span>
                {/* Status bar icons */}
                <div className="absolute right-6 flex items-center gap-1 text-[8px] font-mono text-slate-400">
                  <span>LTE</span>
                  <div className="w-4 h-2 border border-slate-500 rounded-sm p-0.5 flex items-center">
                    <div className="w-full h-full bg-slate-400 rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* CLOSE BUTTON AT TOP BAR */}
              <button
                onClick={handleCloseGateSimulator}
                className="absolute top-10 right-4 p-2 rounded-full bg-slate-900/60 hover:bg-slate-900/95 text-slate-400 hover:text-white transition-all cursor-pointer z-50 border border-white/15"
              >
                <X className="w-4 h-4" />
              </button>

              {/* MAIN PHONE AREA (Styled strictly like Expo QRScannerScreen.js) */}
              <div className="flex-1 flex flex-col justify-between bg-black relative pt-14 pb-8">
                
                {/* Simulated Expo camera background wrapper */}
                <div className="absolute inset-0 z-0 bg-slate-950 flex flex-col items-center justify-center">
                  {useGateWebcam ? (
                    <video
                      ref={gateVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                  ) : (
                    <div className="w-full h-full bg-radial from-slate-900 to-black flex items-center justify-center opacity-60">
                      <div className="w-32 h-32 border border-white/5 rounded-full flex items-center justify-center animate-pulse">
                        <QrCode className="w-14 h-14 text-slate-700" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Expo Overlay Layout - 50% dark overlay around target finder */}
                <div className="absolute inset-0 z-10 bg-black/55 pointer-events-none" />

                {/* TOP HEADER OVERLAY */}
                <div className="relative z-20 px-6 pt-4 text-center">
                  <h3 className="text-xl font-black text-white tracking-wide">🔐 Scan Gym QR</h3>
                  <span className="text-[11px] text-slate-400 mt-1 block uppercase tracking-wider font-semibold font-mono">
                    {userProfile.name} (Member ID: {userProfile.uid.slice(0, 10)})
                  </span>
                </div>

                {/* TARGET SCANNER FRAME (Exactly styled size 280x280 with correct orange highlights) */}
                <div className="relative z-20 w-[240px] h-[240px] mx-auto border-[3px] border-[#FF6B35]/20 rounded-2xl flex items-center justify-center shadow-2xl">
                  {/* Expo Camera Corners (Orange color #FF6B35 with 4px border thick) */}
                  <div className="absolute top-[-5px] left-[-5px] w-8 h-8 border-t-[4px] border-l-[4px] border-[#FF6B35] rounded-tl-xl" />
                  <div className="absolute top-[-5px] right-[-5px] w-8 h-8 border-t-[4px] border-r-[4px] border-[#FF6B35] rounded-tr-xl" />
                  <div className="absolute bottom-[-5px] left-[-5px] w-8 h-8 border-b-[4px] border-l-[4px] border-[#FF6B35] rounded-bl-xl" />
                  <div className="absolute bottom-[[-5px] right-[-5px] w-8 h-8 border-b-[4px] border-r-[4px] border-[#FF6B35] rounded-br-xl" />

                  {/* Laser bar animation */}
                  {gatewayStatus === "scanning" && (
                    <motion.div
                      animate={{ y: [0, 225, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      className="absolute left-0 w-full h-[3px] bg-[#FF6B35] shadow-[0_0_12px_#FF6B35] z-30 pointer-events-none"
                    />
                  )}

                  {/* Central status notification */}
                  <div className="relative z-30 text-center p-4">
                    {gatewayStatus === "scanning" ? (
                      <div className="space-y-2">
                        <div className="w-8 h-8 border-3 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto" />
                        <span className="text-xs text-[#FF6B35] font-black uppercase tracking-wider block drop-shadow-md">
                          Verifying QR Code...
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-350 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-full font-bold uppercase tracking-wide block border border-white/5">
                        {useGateWebcam ? "Feed Active" : "Point Camera"}
                      </span>
                    )}
                  </div>
                </div>

                {/* FOOTER CONTROLS OVERLAY */}
                <div className="relative z-20 px-6 text-center space-y-4">
                  <p className="text-[11px] text-slate-300 drop-shadow-md">
                    📱 Align QR code in frame
                  </p>

                  <div className="flex flex-col gap-2.5 max-w-[210px] mx-auto">
                    {gatewayStatus === "idle" && (
                      <button
                        onClick={handleScanGateSimulation}
                        className="w-full py-2.5 bg-[#FF6B35] hover:bg-[#ff8652] text-white text-xs font-extrabold uppercase rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer border border-[#FF6B35]/20 font-sans tracking-wide"
                      >
                        Scan Camera QR Code
                      </button>
                    )}

                    {/* Camera Source Selector Button */}
                    <button
                      type="button"
                      onClick={() => setUseGateWebcam(v => !v)}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[9px] font-bold uppercase rounded-lg border border-white/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#FF6B35]" />
                      {useGateWebcam ? "Stop Webcam Capture" : "Use Real Laptop Camera"}
                    </button>
                  </div>
                </div>

                {/* REACT NATIVE SIMULATED NATIVE DIALOG POPUPS */}
                <AnimatePresence>
                  {/* EXPO DENIED DIALOG POPUP */}
                  {gatewayStatus === "error" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center p-5 backdrop-blur-sm"
                    >
                      <motion.div
                        initial={{ scale: 0.9, y: 15 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 15 }}
                        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-[260px] text-center p-5 shadow-2xl space-y-4"
                      >
                        <div className="space-y-1">
                          <h5 className="text-sm font-black text-rose-400 uppercase tracking-widest font-sans">Access Denied ❌</h5>
                          <p className="text-[10.5px] text-slate-300 leading-relaxed font-mono font-medium p-1 w-full flex items-center justify-center text-center">
                            {gatewayErrorMsg || "Generic barcode token verification failed."}
                          </p>
                        </div>
                        <button
                          onClick={() => { setGatewayStatus("idle"); setGatewayErrorMsg(""); }}
                          className="w-full py-2 bg-[#FF6B35] hover:bg-[#ff804e] text-white text-[11px] font-extrabold rounded-lg cursor-pointer uppercase font-sans tracking-wider"
                        >
                          Try Again
                        </button>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* EXPO GRANTED DIALOG POPUP */}
                  {gatewayStatus === "success" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center p-5 backdrop-blur-sm"
                    >
                      <motion.div
                        initial={{ scale: 0.9, y: 15 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 15 }}
                        className="bg-slate-900 border border-emerald-500/10 rounded-2xl w-full max-w-[260px] text-center p-5 shadow-2xl space-y-4"
                      >
                        <div className="space-y-1.5 text-center">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-lg mb-1 animate-bounce">
                            ✓
                          </div>
                          <h5 className="text-sm font-black text-emerald-400 uppercase tracking-widest font-sans leading-none">Access Granted ✓</h5>
                          <p className="text-[10.5px] text-slate-200 font-sans leading-snug">
                            Welcome to the gym, <span className="font-bold uppercase text-white">{userProfile.name}</span>!
                          </p>
                          <span className="text-[9px] font-mono text-slate-500 block leading-none">
                            TIME: {new Date().toLocaleTimeString()}
                          </span>
                        </div>
                        <button
                          onClick={() => { setGatewayStatus("idle"); setGatewaySuccessMsg(""); }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold rounded-lg cursor-pointer uppercase font-sans tracking-wider"
                        >
                          Close
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
              </div>

              {/* Home Indicator line */}
              <div className="absolute bottom-1.5 inset-x-0 h-1 flex justify-center">
                <div className="w-28 h-1 bg-slate-700 rounded-full" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CAMERA PICTURE CAPTURES MODAL */}
      <AnimatePresence>
        {showCameraModal && (
          <CameraCapture
            onCapture={handleCapturePhoto}
            onClose={() => setShowCameraModal(false)}
          />
        )}
      </AnimatePresence>

      {/* AI AVATAR GENERATOR OVERLAY */}
      <AnimatePresence>
        {showAvatarModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-2xl relative overflow-hidden"
            >
              <button
                onClick={() => setShowAvatarModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              <div className="space-y-1">
                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest block">AI Studio Labs</span>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Generate Avatar Portrait</h4>
              </div>

              {generatedAvatarUrl ? (
                // Output result preview
                <div className="space-y-4">
                  <div className="aspect-square mx-auto w-40 rounded-full border-4 border-indigo-550/20 overflow-hidden shadow-md">
                    <img
                      src={generatedAvatarUrl}
                      alt="Generated fitness avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {avatarSavedMsg && (
                    <p className="text-[10px] text-emerald-400 font-mono font-bold text-center leading-normal">
                      {avatarSavedMsg}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGeneratedAvatarUrl("")}
                      className="py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={handleSaveAvatar}
                      className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow"
                    >
                      Use Avatar
                    </button>
                  </div>
                </div>
              ) : (
                // Setup configurations options
                <div className="space-y-4 text-left">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Demographic Training Goal</label>
                      <select
                        value={avatarInterest}
                        onChange={(e) => setAvatarInterest(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-indigo-500 outline-none"
                      >
                        <option value="Bodybuilding & Muscle Gains">Bodybuilding Power</option>
                        <option value="Powerlifting Heavy Bench Press">Heavy Compound Lifting</option>
                        <option value="Yoga Flexibility & Calm Core">Zen Mind Yoga</option>
                        <option value="Cardio Athletic Running Endurance">Marathon Cardio Runner</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Visual Rendering Style</label>
                      <select
                        value={avatarStyle}
                        onChange={(e) => setAvatarStyle(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-indigo-500 outline-none"
                      >
                        <option value="Cyberpunk Neon Gym with Glowing Accents">Cyberpunk Neon Gym</option>
                        <option value="Anime Gym Aesthetic Line-Art">Retro Anime Athlete</option>
                        <option value="Minimalist Sleek Line-Art Portrait">Minimalist Sleek Icon</option>
                        <option value="Golden Hour Realistic Athlete Silhouette">Golden Hour Silhouette</option>
                      </select>
                    </div>

                    {avatarError && (
                      <p className="text-[10px] text-rose-450 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl leading-relaxed text-center">
                        {avatarError}
                      </p>
                    )}

                    <button
                      onClick={handleGenerateAvatar}
                      disabled={generatingAvatar}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black py-3 px-4 shadow-lg active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {generatingAvatar ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Generating Portrait...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Generate Avatar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING AI ATHLETE CHATBOT WIDGET CLIENT */}
      <div className="fixed bottom-22 right-5 z-40 flex flex-col items-end max-w-sm">
        <AnimatePresence>
          {chatbotOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-80 max-w-[90vw] h-[380px] shadow-2xl flex flex-col overflow-hidden mb-3 relative"
            >
              {/* Chatbot Header */}
              <div className="p-4 bg-slate-950 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-wide leading-none">Coach Zymnix</h4>
                    <span className="text-[9px] text-emerald-400 font-bold block mt-0.5 tracking-wider uppercase">Active Gym Partner</span>
                  </div>
                </div>
                <button
                  onClick={() => setChatbotOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages Box */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/40 flex flex-col min-h-0">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === "user" ? "self-end items-end" : "self-start items-start"
                    }`}
                  >
                    <span className="text-[8px] text-slate-400 tracking-wider mb-0.5 font-mono">
                      {msg.role === "user" ? "YOU" : "COACH IRON"}
                    </span>
                    <div
                      className={`text-[11px] px-3.5 py-2 rounded-2xl shadow-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white rounded-tr-xs"
                          : "bg-slate-800 text-slate-100 border border-white/5 rounded-tl-xs"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {sendingMessage && (
                  <div className="self-start flex flex-col max-w-[85%] items-start">
                    <span className="text-[8px] text-slate-400 tracking-wider mb-0.5 font-mono">COACH IRON</span>
                    <div className="bg-slate-800 border border-white/5 text-slate-400 text-xs px-3.5 py-2 rounded-2xl rounded-tl-xs shadow flex items-center gap-2">
                      <div className="flex space-x-1">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-100" />
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-200" />
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-300" />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Generating tips...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions Box */}
              <div className="px-3 py-2 border-t border-white/5 bg-slate-950/20 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0 text-left">
                <button
                  onClick={() => handleSendChatMessage("How do I build shoulder hypertrophy?")}
                  className="shrink-0 text-[9px] font-bold bg-slate-950/50 hover:bg-slate-850 text-indigo-200 border border-indigo-500/10 hover:border-indigo-500/20 px-2 rounded-lg transition-all cursor-pointer"
                >
                  💪 Shoulders
                </button>
                <button
                  onClick={() => handleSendChatMessage("Give me a high protein meals recipe plan")}
                  className="shrink-0 text-[9px] font-bold bg-slate-950/50 hover:bg-slate-850 text-indigo-200 border border-indigo-500/10 hover:border-indigo-500/20 px-2 rounded-lg transition-all cursor-pointer"
                >
                  🥩 High Protein
                </button>
                <button
                  onClick={() => handleSendChatMessage("Correct squat back form checklist")}
                  className="shrink-0 text-[10px] font-bold bg-slate-950/50 hover:bg-slate-850 text-indigo-200 border border-indigo-500/10 hover:border-indigo-500/20 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                >
                  🏋️ Squat Tips
                </button>
              </div>

              {/* Input Tray */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="p-3 border-t border-white/5 bg-slate-900/80 flex gap-2 shrink-0 items-center"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Coach Zymnix..."
                  disabled={sendingMessage}
                  className="flex-1 bg-slate-950 border border-white/10 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-550 outline-none"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !chatInput.trim()}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setChatbotOpen(!chatbotOpen)}
          className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
          title="Coach Zymnix AI Chatbot"
        >
          <Bot className="w-5 h-5 text-white" />
          <span className="text-[10px] font-black tracking-wider uppercase select-none mr-1">Coach Zymnix AI</span>
        </button>
      </div>

    </div>
  );
}
