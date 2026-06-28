import React, { useState, useEffect } from "react";
import { 
  Dumbbell, 
  CheckCircle, 
  XCircle, 
  Lock, 
  Unlock, 
  ArrowRight, 
  UserCheck, 
  Sparkles, 
  LogIn, 
  Fingerprint, 
  RefreshCw,
  Clock,
  ShieldCheck,
  User,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VerifyQRDirectProps {
  currentUser: any;
  onLogin: (role: "admin" | "customer", email: string, name: string, uid: string) => void;
  onClose: () => void;
}

export default function VerifyQRDirect({ currentUser, onLogin, onClose }: VerifyQRDirectProps) {
  // Query parameters
  const [gymId, setGymId] = useState("gym_hq_1");
  const [scannedQRData, setScannedQRData] = useState("zymnix_front_desk_checkin");

  // State
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [checkType, setCheckType] = useState<"in" | "out">("in");
  const [attendanceDetails, setAttendanceDetails] = useState<any>(null);
  const [lastScannedTime, setLastScannedTime] = useState<number | null>(null);

  // Authentication states (for logged out users)
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Audio synthesize system
  const playVerifySound = (success: boolean = true) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (success) {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
        
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.15); // C6
        gain2.gain.setValueAtTime(0.05, audioCtx.currentTime + 0.15);
        osc2.start(audioCtx.currentTime + 0.15);
        osc2.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(150, audioCtx.currentTime); // Low buzz
        osc.type = "sawtooth";
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn("Sound generation failed or blocked:", e);
    }
  };

  // Preset accounts for easy demo simulation testing
  const PRESET_ATHLETES = [
    { name: "Rohan Kumar", email: "rohan.iron@gmail.com", uid: "customer_rohan", desc: "Bulking Elite, Active" },
    { name: "Jessica Miller", email: "jessica.fit@gmail.com", uid: "customer_jessica", desc: "Yoga Sunrise, Active" },
    { name: "Arjun Bennett", email: "arjun.gym@gmail.com", uid: "customer_arjun", desc: "Hypertrophy Master, Active" },
    { name: "Fox Mulder (Inactive)", email: "customer_inactive@zymnix.com", uid: "customer_inactive", desc: "Expired Account Status" },
    { name: "Walter Skinner (Unpaid)", email: "customer_unpaid@zymnix.com", uid: "customer_no_payment", desc: "Dues Outstanding" }
  ];

  // Parse URL query on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlGymId = params.get("gymId");
    const urlQRData = params.get("scannedQRData");

    if (urlGymId) setGymId(urlGymId);
    if (urlQRData) setScannedQRData(decodeURIComponent(urlQRData));
  }, []);

  // Trigger verification if user is logged in
  useEffect(() => {
    if (currentUser && currentUser.role === "customer" && status === "idle") {
      performVerification(currentUser.profile?.uid || currentUser.uid);
    }
  }, [currentUser]);

  const performVerification = async (memberId: string) => {
    // 1. Prevent duplicate scans within 10 seconds on frontend
    const nowTimestamp = Date.now();
    if (lastScannedTime && (nowTimestamp - lastScannedTime < 10000)) {
      playVerifySound(false);
      setErrorMsg("❌ Duplicate scan prevented. Please wait 10 seconds between scans.");
      setStatus("error");
      return;
    }
    setLastScannedTime(nowTimestamp);

    setStatus("verifying");
    setErrorMsg("");
    setSuccessMsg("");

    const trimmedQR = (scannedQRData || "").trim();

    // 2. Local QR Validations (Secondary)
    // Step 1: Check QR data exists
    if (!trimmedQR) {
      playVerifySound(false);
      setErrorMsg("❌ Local Validation Error: QR code data is empty.");
      setStatus("error");
      return;
    }

    // Step 2: Parse JSON
    let parsedQR: any = null;
    try {
      let actualJSON = trimmedQR;
      if (trimmedQR.startsWith("http://") || trimmedQR.startsWith("https://")) {
        const parsedUrl = new URL(trimmedQR);
        const queryQR = parsedUrl.searchParams.get("scannedQRData");
        if (queryQR) {
          actualJSON = queryQR;
        }
      }

      if (actualJSON === "zymnix_front_desk_checkin" || actualJSON === "iron_check_front_desk_checkin") {
        parsedQR = {
          type: "GYM_ENTRANCE",
          gymId: gymId,
          version: "1.0",
          timestamp: new Date().toISOString()
        };
      } else {
        parsedQR = JSON.parse(actualJSON);
      }
    } catch (e) {
      playVerifySound(false);
      setErrorMsg("❌ Local Validation Error: Invalid QR JSON format.");
      setStatus("error");
      return;
    }

    // Step 3: Verify type = "GYM_ENTRANCE"
    if (!parsedQR || parsedQR.type !== "GYM_ENTRANCE") {
      playVerifySound(false);
      setErrorMsg("❌ Local Validation Error: Wrong QR Type. Must be 'GYM_ENTRANCE'.");
      setStatus("error");
      return;
    }

    // Step 4: Verify gymId matches current gym
    if (parsedQR.gymId !== gymId) {
      playVerifySound(false);
      setErrorMsg(`❌ Local Validation Error: Gym mismatch. QR belongs to '${parsedQR.gymId}'.`);
      setStatus("error");
      return;
    }

    try {
      const response = await fetch("/api/qr/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          scannedQRData: trimmedQR,
          memberId: memberId,
          gymId: gymId
        })
      });

      const result = await response.json();

      // Check success and strict gate action gateAction === "OPEN"
      if (!result.success || result.gateAction !== "OPEN") {
        playVerifySound(false);
        let errMsg = result.error || "Access Denied: Solenoid locked.";
        const scenarioMessages: { [key: string]: string } = {
          'EMPTY_QR_DATA': '❌ QR code is empty. Please scan a valid poster.',
          'INVALID_QR_FORMAT': '❌ Invalid QR code structure. Google Lens could not decode valid payload.',
          'WRONG_QR_TYPE': '❌ Wrong QR type. This QR code belongs to an external system.',
          'GYM_MISMATCH': '❌ Gym mismatch. This poster belongs to another physical location.',
          'MEMBER_NOT_FOUND': '❌ Athlete account not verified. Please contact front desk.',
          'INACTIVE_MEMBERSHIP': '❌ Inactive membership status. Check-in blocked.',
          'MEMBERSHIP_EXPIRED': `❌ Membership has expired. Please clear pending fees.`,
          'NO_PAYMENT': '❌ No completed payments registered for this subscription tier.',
          'ALREADY_CHECKED_IN': '❌ Double check-in detected. Please wait 5 minutes between access logs.'
        };

        if (result.code && scenarioMessages[result.code]) {
          errMsg = scenarioMessages[result.code];
        }

        setErrorMsg(errMsg);
        setStatus("error");
        
        // Log to local storage gate twin for synchronization
        try {
          const savedGate = localStorage.getItem("gym_demo_gate");
          if (savedGate) {
            const parsed = JSON.parse(savedGate);
            parsed.accessLog.unshift({
              memberId: memberId,
              timestamp: new Date().toISOString(),
              status: `refused: ${result.code || "LOCK"}`
            });
            parsed.lastUpdated = new Date().toISOString();
            localStorage.setItem("gym_demo_gate", JSON.stringify(parsed));
          }
        } catch(e){}
        return;
      }

      // Success check-in/out
      playVerifySound(true);
      setAttendanceDetails(result.attendance);
      
      const isCheckOut = result.message && (result.message.includes("out") || result.message.includes("Checked out"));
      setCheckType(isCheckOut ? "out" : "in");

      if (isCheckOut) {
        setSuccessMsg(`ACCESS GRANTED. CHECK-OUT COMPLETED SUCCESSFULLY! Safe travels, athlete!`);
      } else {
        setSuccessMsg(`ACCESS GRANTED. CHRONO SOLENOID RELEASED! Welcome to the Zymnix Grid!`);
      }

      setStatus("success");

      // Log check-in locally
      const todayStr = new Date().toISOString().split("T")[0];
      if (isCheckOut) {
        localStorage.removeItem(`gym_checkin_${todayStr}`);
      } else {
        localStorage.setItem(`gym_checkin_${todayStr}`, JSON.stringify({
          checkInTime: new Date().toISOString(),
          gymId: gymId
        }));
      }

      // Sync physical gate status
      try {
        const savedGate = localStorage.getItem("gym_demo_gate");
        if (savedGate) {
          const parsed = JSON.parse(savedGate);
          parsed.gateStatus = "unlocked";
          parsed.gateOpenedBy = currentUser?.name || currentUser?.profile?.name || memberId;
          parsed.lastOpenedAt = new Date().toISOString();
          parsed.accessLog.unshift({
            memberId: memberId,
            timestamp: new Date().toISOString(),
            status: "granted"
          });
          parsed.lastUpdated = new Date().toISOString();
          localStorage.setItem("gym_demo_gate", JSON.stringify(parsed));

          // Set auto-lockout simulation
          setTimeout(() => {
            const freshGate = localStorage.getItem("gym_demo_gate");
            if (freshGate) {
              const freshParsed = JSON.parse(freshGate);
              freshParsed.gateStatus = "locked";
              localStorage.setItem("gym_demo_gate", JSON.stringify(freshParsed));
            }
          }, 5000);
        }
      } catch(e){}

    } catch (err: any) {
      console.error(err);
      playVerifySound(false);
      setErrorMsg(err.message || "Failed communicating with gate hardware API.");
      setStatus("error");
    }
  };

  const handlePresetSelect = (athlete: typeof PRESET_ATHLETES[0]) => {
    setAuthLoading(true);
    setAuthError("");
    setTimeout(() => {
      // Simulate login
      onLogin("customer", athlete.email, athlete.name, athlete.uid);
      setAuthLoading(false);
    }, 600);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setAuthError("Please enter your athlete email address.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");

    setTimeout(() => {
      const email = emailInput.trim();
      const name = email.split("@")[0].toUpperCase();
      let uid = "customer_" + Math.random().toString(36).substring(2, 8);

      // Map special simulation modes
      if (email.includes("inactive")) {
        uid = "customer_inactive";
      } else if (email.includes("expired")) {
        uid = "customer_expired";
      } else if (email.includes("unpaid")) {
        uid = "customer_no_payment";
      }

      onLogin("customer", email, name, uid);
      setAuthLoading(false);
    }, 800);
  };

  return (
    <div className="flex-1 flex flex-col justify-start items-center p-5 text-white min-h-[500px] overflow-y-auto font-sans bg-slate-950">
      {/* Upper Brand Badge */}
      <div className="text-center mt-4 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 font-mono text-[9px] font-black uppercase tracking-widest">
          <Fingerprint className="w-3.5 h-3.5" />
          GOOGLE LENS PORTAL DISPATCH
        </div>
        <h1 className="text-2xl font-black tracking-tighter mt-2 bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent font-sans uppercase">
          Zymnix Solenoid Gateway
        </h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono mt-1">
          LOCATION ID: {gymId} • PROTOCOL v1.0
        </p>
      </div>

      <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative background laser line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

        {/* 1. STATUS RENDERING SECTION */}
        <div className="text-center py-4 flex flex-col items-center">
          {status === "idle" && !currentUser && (
            <div className="space-y-4 w-full">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 font-mono">
                  GATE IS LOCKED
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  You scanned this poster using Google Lens. To trigger the turnstile solenoid, choose or log into your athlete account below.
                </p>
              </div>
            </div>
          )}

          {status === "verifying" && (
            <div className="space-y-4">
              <div className="w-14 h-14 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin flex items-center justify-center mx-auto" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400 font-mono">
                  AUTHENTICATING ATHLETE...
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Verifying check-in permissions & dues balance...
                </p>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <motion.div 
                initial={{ scale: 0.8, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                <Unlock className="w-7 h-7 animate-bounce" />
              </motion.div>
              <div>
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[8px] font-black uppercase rounded-md tracking-wider">
                  SOLENOID RELEASED
                </span>
                <h3 className="text-base font-black uppercase tracking-wider text-emerald-400 font-mono mt-2">
                  {checkType === "in" ? "ACCESS GRANTED! WELCOME" : "ACCESS GRANTED! GOODBYE"}
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 px-4 leading-relaxed font-semibold">
                  {successMsg}
                </p>
              </div>

              {/* Graphic Animated Gate */}
              <div className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 mt-2">
                <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest font-black">Gate Sensor Output</p>
                <div className="flex items-center gap-4 py-2">
                  <div className="h-10 w-1 bg-slate-800 rounded-full"></div>
                  
                  {/* Gate wings swinging open */}
                  <div className="flex gap-1 items-center justify-center relative w-20 h-10">
                    <motion.div 
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: 85 }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="w-8 h-1 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] origin-left"
                    />
                    <motion.div 
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: -85 }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="w-8 h-1 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] origin-right"
                    />
                  </div>

                  <div className="h-10 w-1 bg-slate-800 rounded-full"></div>
                </div>
                <div className="text-[9px] font-mono text-emerald-400 font-black tracking-wide animate-pulse uppercase">
                  ● TURNSTILE ACTIVE FOR 5s
                </div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <motion.div 
                initial={{ scale: 0.8, y: 5 }}
                animate={{ scale: 1, y: 0 }}
                className="w-14 h-14 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto"
              >
                <XCircle className="w-7 h-7" />
              </motion.div>
              <div>
                <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-[8px] font-black uppercase rounded-md tracking-wider">
                  SECURITY INGRESS LOCKED
                </span>
                <h3 className="text-sm font-black uppercase tracking-wider text-rose-400 font-mono mt-2">
                  INGRESS PROTOCOL BLOCKED
                </h3>
                <p className="text-xs text-rose-200 mt-2 bg-rose-950/40 border border-rose-900/30 p-3 rounded-xl max-w-xs mx-auto leading-relaxed text-left font-semibold">
                  {errorMsg}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 2. AUTHENTICATION / PORTAL CHOOSER SECTION (Visible only when logged out) */}
        {!currentUser && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-5">
            <div>
              <p className="text-[10px] font-mono text-indigo-400 font-black uppercase tracking-widest text-center mb-3">
                ★ QUICK SANDBOX ATHLETE SIGN-IN ★
              </p>
              <div className="grid grid-cols-1 gap-2 max-h-[140px] overflow-y-auto pr-1">
                {PRESET_ATHLETES.map((athlete) => (
                  <button
                    key={athlete.uid}
                    disabled={authLoading}
                    onClick={() => handlePresetSelect(athlete)}
                    className="w-full text-left p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-white/5 hover:border-indigo-500/30 rounded-xl transition-all cursor-pointer flex items-center justify-between group text-xs font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 group-hover:animate-ping" />
                      <div>
                        <div className="text-slate-100 font-bold">{athlete.name}</div>
                        <div className="text-[9px] text-slate-500 font-medium">{athlete.desc}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>

            <div className="relative text-center my-3">
              <span className="relative z-10 px-3 bg-slate-900 text-[9px] font-mono text-slate-500 uppercase tracking-widest font-black">
                OR LOGIN WITH CREDS
              </span>
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5" />
            </div>

            <form onSubmit={handleCustomSubmit} className="space-y-3">
              <div>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Athlete Email (e.g. arjun.gym@gmail.com)"
                  disabled={authLoading}
                  className="w-full h-10 px-3 bg-slate-950 border border-white/5 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500/50 focus:outline-none font-semibold transition-all"
                />
              </div>

              {authError && (
                <p className="text-[10px] text-rose-400 font-bold bg-rose-950/20 border border-rose-900/20 p-2 rounded-lg">
                  ⚠️ {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 shadow-sm"
              >
                {authLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    Verify & Ingress Gate
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* 3. LOGGED IN MEMBER PANEL CONTROL */}
        {currentUser && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center font-bold">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "A"}
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold">Logged In Athlete</div>
                  <div className="text-slate-200 font-extrabold">{currentUser.name || currentUser.email}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 font-mono text-[8px] font-black uppercase rounded-md">
                {currentUser.role.toUpperCase()}
              </span>
            </div>

            {status === "error" && (
              <button
                onClick={() => performVerification(currentUser.profile?.uid || currentUser.uid)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Ingress Check-In
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/10 hover:border-indigo-500/30 text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              Go To Athletic Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Portal Terms / Disclaimer */}
      <p className="text-[9px] text-slate-600 max-w-xs text-center mt-6 leading-relaxed font-semibold">
        Google Lens auto check-in scans are encrypted with active physical solenoid protocols. By entering, you agree to obey Zymnix barbell safety guidelines and physical gym floor conduct codes.
      </p>
    </div>
  );
}
