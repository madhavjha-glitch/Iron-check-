import React, { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  Dumbbell,
  LogOut,
  QrCode,
  Bell,
  Play,
  PlayCircle,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  Sparkles,
  BookOpen,
  ShieldCheck,
  Key,
  Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  MemberProfile,
  AttendanceLog,
  ExerciseRoutine,
  GymNotification,
  Exercise,
  PersonalRoom,
} from "../types";
import {
  logDailyCheckIn,
  subscribeToMemberReminders,
  markReminderRead,
  subscribeToRoutines,
  setMemberFeeStatus,
  subscribeToPersonalRoom,
  savePersonalRoom,
  updateMemberProfilePhoto,
} from "../firebase";
import CameraCapture from "./CameraCapture";

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
  const [routines, setRoutines] = useState<ExerciseRoutine[]>([]);
  const [reminders, setReminders] = useState<GymNotification[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("Monday");
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [showQrSimulator, setShowQrSimulator] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkInError, setCheckInError] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [showCameraModal, setShowCameraModal] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(userProfile.photoUrl);

  useEffect(() => {
    if (userProfile.photoUrl) {
      setPhotoUrl(userProfile.photoUrl);
    }
  }, [userProfile.photoUrl]);

  const handlePhotoCaptured = async (base64Photo: string) => {
    try {
      await updateMemberProfilePhoto(userProfile.uid, base64Photo);
      setPhotoUrl(base64Photo);

      const storedActiveUser = localStorage.getItem("gym_demo_active_session");
      if (storedActiveUser) {
        try {
          const parsed = JSON.parse(storedActiveUser);
          if (parsed.profile) {
            parsed.profile.photoUrl = base64Photo;
          }
          localStorage.setItem("gym_demo_active_session", JSON.stringify(parsed));
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      console.error("Error saving profile photo:", err);
    } finally {
      setShowCameraModal(false);
    }
  };

  // Tab switching: "overview" (the traditional schedule) vs "room" (the personalized, secured chamber)
  const [activeTab, setActiveTab] = useState<"overview" | "room">("overview");

  // Private Personal Room persistence
  const [personalRoom, setPersonalRoom] = useState<PersonalRoom | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);

  // Locker interaction states
  const [enteredCode, setEnteredCode] = useState<string>("");
  const [lockerError, setLockerError] = useState<string>("");
  const [isLockerOpen, setIsLockerOpen] = useState<boolean>(false);
  const [journalSavedMsg, setJournalSavedMsg] = useState("");

  // Simulated items stored in the virtual locker compartment
  const [lockerItems, setLockerItems] = useState<{ name: string; icon: string; inside: boolean }[]>([
    { name: "My Shaker Cup", icon: "🥤", inside: true },
    { name: "Wireless AirPods", icon: "🎧", inside: true },
    { name: "Gym Towel", icon: "🧖‍♂️", inside: true },
    { name: "Wallet & Keys", icon: "🔑", inside: true },
  ]);

  // Listen to member routines, reminders, and their private room
  useEffect(() => {
    const unsubRoutines = subscribeToRoutines((data) => {
      setRoutines(data);
    });

    const unsubReminders = subscribeToMemberReminders(
      userProfile.uid,
      (data) => {
        setReminders(data);
      }
    );

    const unsubRoom = subscribeToPersonalRoom(
      userProfile.uid,
      userProfile.name,
      (data) => {
        setPersonalRoom(data);
        setRoomLoading(false);
      }
    );

    return () => {
      unsubRoutines();
      unsubReminders();
      unsubRoom();
    };
  }, [userProfile.uid, userProfile.name]);

  // Determine current day of week to highlight by default
  useEffect(() => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const todayName = days[new Date().getDay()];
    if (["Monday", "Wednesday", "Friday"].includes(todayName)) {
      setSelectedDay(todayName);
    } else {
      setSelectedDay("Monday");
    }
  }, []);

  // Determine theme styles dynamically based on room's vibe
  const getThemeStyles = () => {
    if (!personalRoom) return {
      accent: "text-indigo-600",
      accentBg: "bg-indigo-600",
      border: "border-indigo-100",
      button: "bg-indigo-600 hover:bg-indigo-700 text-white",
      cardGrad: "from-indigo-600 to-indigo-800",
      ring: "focus:ring-indigo-500",
      vibeLabel: "Obsidian Midnight",
    };

    switch (personalRoom.themeVibe) {
      case "neon":
        return {
          accent: "text-rose-500 dark:text-rose-400",
          accentBg: "bg-rose-500 hover:bg-rose-600",
          border: "border-rose-100",
          button: "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200/50",
          cardGrad: "from-rose-500 via-purple-600 to-indigo-700",
          ring: "focus:ring-rose-400",
          vibeLabel: "Cyber Neon 🌌",
        };
      case "zen":
        return {
          accent: "text-teal-600 dark:text-teal-400",
          accentBg: "bg-teal-600 hover:bg-teal-700",
          border: "border-teal-100",
          button: "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-200/50",
          cardGrad: "from-teal-600 via-emerald-600 to-stone-700",
          ring: "focus:ring-teal-400",
          vibeLabel: "Zen Oasis 🍃",
        };
      case "sun":
        return {
          accent: "text-amber-500 dark:text-amber-400",
          accentBg: "bg-amber-500 hover:bg-amber-600",
          border: "border-amber-100",
          button: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200/50",
          cardGrad: "from-amber-400 via-orange-500 to-rose-600",
          ring: "focus:ring-amber-400",
          vibeLabel: "Golden Hour 🌅",
        };
      case "midnight":
      default:
        return {
          accent: "text-indigo-600 dark:text-indigo-400",
          accentBg: "bg-indigo-600 hover:bg-indigo-700",
          border: "border-indigo-100",
          button: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200/50",
          cardGrad: "from-indigo-600 to-indigo-900",
          ring: "focus:ring-indigo-400",
          vibeLabel: "Obsidian Midnight 🌑",
        };
    }
  };

  const themeStyles = getThemeStyles();
  const unreadReminders = reminders.filter((r) => r.status === "unread");

  // Check if today is logged in already
  const todayDateString = new Date().toISOString().split("T")[0];
  const loggedTodayDoc = attendanceLogs.find(
    (log) => log.userId === userProfile.uid && log.dateString === todayDateString
  );

  const handleManualCheckIn = async () => {
    setCheckingIn(true);
    setCheckInError("");
    try {
      await logDailyCheckIn(userProfile.uid, userProfile.name);
      setCheckInSuccess(true);
      setTimeout(() => setCheckInSuccess(false), 3000);
    } catch (err: any) {
      setCheckInError(err.message || "Could not log check-in");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleSimulatePayment = async () => {
    setPaymentLoading(true);
    try {
      await setMemberFeeStatus(userProfile.uid, "paid");
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Switch Theme Vibe Handler
  const handleVibeSwitch = async (vibe: "neon" | "zen" | "midnight" | "sun") => {
    if (!personalRoom) return;
    const updated = { ...personalRoom, themeVibe: vibe };
    setPersonalRoom(updated);
    await savePersonalRoom(updated);
  };

  // Locker numerical code keypad action
  const handleKeyPairTap = (num: string) => {
    if (enteredCode.length < 4) {
      setEnteredCode((p) => p + num);
      setLockerError("");
    }
  };

  const handleKeyPairBackspace = () => {
    setEnteredCode((p) => p.slice(0, -1));
  };

  const handleLockerPINSubmit = async () => {
    if (!personalRoom) return;
    if (enteredCode.length !== 4) {
      setLockerError("PIN must be 4 digits exactly");
      return;
    }

    // Checking if PIN was not set yet
    if (!personalRoom.lockerPin) {
      const updated = {
        ...personalRoom,
        lockerPin: enteredCode,
      };
      setPersonalRoom(updated);
      setEnteredCode("");
      await savePersonalRoom(updated);
      setIsLockerOpen(true);
      return;
    }

    // Checking PIN matching
    if (enteredCode === personalRoom.lockerPin) {
      setIsLockerOpen(true);
      setLockerError("");
      setEnteredCode("");
    } else {
      setLockerError("🔒 INCORRECT LOCKER PIN");
      setEnteredCode("");
    }
  };

  const handleLockerClose = () => {
    setIsLockerOpen(false);
    setEnteredCode("");
    setLockerError("");
  };

  const handleResetLockerPin = async () => {
    if (!personalRoom) return;
    const updated = {
      ...personalRoom,
      lockerPin: "",
    };
    setPersonalRoom(updated);
    setIsLockerOpen(false);
    setEnteredCode("");
    await savePersonalRoom(updated);
  };

  // Save private fitness journal notes
  const handleNotesTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!personalRoom) return;
    setPersonalRoom({
      ...personalRoom,
      notes: e.target.value,
    });
  };

  const handleSaveNotes = async () => {
    if (!personalRoom) return;
    setJournalSavedMsg("Saving targets...");
    try {
      await savePersonalRoom(personalRoom);
      setJournalSavedMsg("Notes auto-stored on cloud! ☁️");
      setTimeout(() => setJournalSavedMsg(""), 2500);
    } catch (err) {
      setJournalSavedMsg("Storage error.");
    }
  };

  // Toggle internal compartment items in locker
  const toggleLockerItem = (index: number) => {
    const updated = [...lockerItems];
    updated[index].inside = !updated[index].inside;
    setLockerItems(updated);
  };

  // Current scheduled training routine details helper
  const currentRoutine = routines.find(
    (r) => r.day.toLowerCase() === selectedDay.toLowerCase()
  );

  const getFeeDueBadge = () => {
    const dueDate = new Date(userProfile.feeDueDate);
    const diffTime = dueDate.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (userProfile.feeStatus === "paid") {
      return (
        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
          Fee Status: Paid
        </span>
      );
    } else if (diffDays < 0) {
      return (
        <span className="bg-rose-100 border border-rose-200 text-rose-700 text-[10px] px-2.5 py-0.5 rounded-full font-semibold animate-pulse">
          Overdue by {Math.abs(diffDays)} Days
        </span>
      );
    } else {
      return (
        <span className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
          Due in {diffDays} Days
        </span>
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-blue-700 text-black overflow-hidden">
      
      {/* Dynamic Header Vibe Decorators */}
      <div className="px-6 pt-5 pb-4 bg-blue-800 flex justify-between items-center border-b border-blue-700/60 shadow-xs shrink-0">
        <div>
          <span className="text-[10px] font-bold text-blue-200 tracking-wider uppercase flex items-center gap-1">
            <Sparkles className={`w-3.5 h-3.5 ${themeStyles.accent}`} />
            {personalRoom ? themeStyles.vibeLabel : "Ironstone gym area"}
          </span>
          <h2 className="text-xl font-black text-black tracking-tight">
            Hi, {userProfile.name.split(" ")[0]} 👋
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quick theme selector thumbnail */}
          {personalRoom && (
            <div className="flex bg-blue-900/60 p-1 rounded-full border border-blue-700/50">
              {(["midnight", "neon", "zen", "sun"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => handleVibeSwitch(v)}
                  className={`w-5 h-5 rounded-full transition-all cursor-pointer ${
                    v === "midnight"
                      ? "bg-slate-900"
                      : v === "neon"
                      ? "bg-rose-500"
                      : v === "zen"
                      ? "bg-teal-500"
                      : "bg-amber-400"
                  } ${personalRoom.themeVibe === v ? "ring-2 ring-violet-500 scale-110" : "opacity-60 hover:opacity-100"}`}
                  title={`Switch to ${v} theme`}
                />
              ))}
            </div>
          )}
          <button
            onClick={onLogout}
            className="p-2 cursor-pointer bg-blue-900 hover:bg-rose-900 text-blue-200 hover:text-white border border-blue-700 hover:border-transparent rounded-xl transition-all"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modern Horizontal Navigation Tabs */}
      <div className="bg-blue-800/90 border-b border-blue-700/60 p-2 flex shrink-0">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "overview"
              ? `bg-blue-600 text-white shadow-md`
              : "text-blue-200 hover:text-white hover:bg-blue-700/55"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Workout Schedules
        </button>
        <button
          onClick={() => setActiveTab("room")}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "room"
              ? `bg-blue-600 text-white shadow-md`
              : "text-blue-200 hover:text-white hover:bg-blue-700/55"
          }`}
        >
          <Lock className="w-4 h-4" />
          My Personal Room
        </button>
      </div>

      {/* Main Content Area Scroll View */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-blue-750 text-black">
        
        {/* TAB 1: WORKOUT OVERVIEW */}
        {activeTab === "overview" && (
          <div className="p-5 space-y-5">
            {/* Fee Alert Banner Container */}
            {userProfile.feeStatus === "unpaid" && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 shadow-xs">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600 mt-0.5 shadow-inner">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-rose-900">
                    Membership Payment Due
                  </h3>
                  <p className="text-xs text-rose-700 leading-relaxed mt-1">
                    Your monthly dues of $45 are unpaid. Tap below to securely clear your fee invoice and keep full biometric gym privileges active.
                  </p>
                  <button
                    onClick={handleSimulatePayment}
                    disabled={paymentLoading}
                    className="mt-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {paymentLoading ? "Processing Fee..." : "Tap to Pay $45 Now"}
                  </button>
                </div>
              </div>
            )}

            {/* Digital Gym Pass Card (Branded themed card matching theme styles) */}
            <div className={`relative group bg-gradient-to-br ${themeStyles.cardGrad} rounded-3xl p-5 shadow-lg overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-3.5 items-center z-10">
                  {/* Photo Avatar Frame */}
                  <div className="relative shrink-0 group/photo-hover">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="Profile"
                        className="w-14 h-14 rounded-full border-2 border-white/60 object-cover shadow-md z-10 transition-all duration-300 group-hover/photo-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/30 text-white font-black flex items-center justify-center text-sm shadow-md z-10">
                        {userProfile.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => setShowCameraModal(true)}
                      className="absolute -bottom-1 -right-1 p-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 z-20 cursor-pointer flex items-center justify-center border border-slate-900/15"
                      title="Update Portrait Photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-white/75 tracking-widest uppercase block">
                      Biometric Access Pass
                    </span>
                    <p className="text-base font-black text-white leading-tight truncate">{userProfile.name}</p>
                    <p className="text-[10px] text-white/80 font-mono mt-0.5">ID: {userProfile.uid.substring(0, 10).toUpperCase()}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1.5 z-10 shrink-0">
                  <span
                    className="text-[9px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border bg-white/20 text-white border-transparent"
                  >
                    {userProfile.membershipStatus}
                  </span>
                  {getFeeDueBadge()}
                </div>
              </div>

              <div className="border-t border-white/20 my-4" />

              <div className="flex items-center justify-between text-xs text-white z-10 relative">
                <div>
                  <p className="text-[10px] text-white/70 uppercase tracking-widest">Enrollment Date</p>
                  <p className="font-semibold text-white mt-0.5">
                    {new Date(userProfile.joinedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setShowQrSimulator(!showQrSimulator)}
                  className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 rounded-xl flex items-center gap-1.5 transition-all text-xs font-semibold shadow-inner cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  {showQrSimulator ? "Hide Pass QR" : "Show Access QR"}
                </button>
              </div>

              {/* QR Code expansion container */}
              <AnimatePresence>
                {showQrSimulator && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-2 text-center">
                      <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 mb-3 relative">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-900 animate-bounce opacity-65" />
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ironstone_checkin_${userProfile.uid}&color=0f172a`}
                          alt="Gym Biometric Pass QR"
                          className="w-32 h-32 select-none animate-pulse"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[10px] text-white/85">
                        Hold this QR code against the front desk terminal scanner to log entry
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Daily Entry Handshake / Biometric Log */}
            <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-xs">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className={`w-4.5 h-4.5 ${themeStyles.accent}`} />
                  Attendance Check-In
                </h3>
                {loggedTodayDoc ? (
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 inline" /> LOGGED TODAY
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 inline" /> PENDING CODE LOG
                  </span>
                )}
              </div>

              {loggedTodayDoc ? (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center text-xs animate-fadeIn">
                  <p className="text-emerald-800 font-semibold mb-1">Checked-In Successfully! 🎉</p>
                  <p className="text-slate-500 font-mono text-[10px]">
                    Log time: {new Date(loggedTodayDoc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Date: {loggedTodayDoc.dateString}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleManualCheckIn}
                    disabled={checkingIn}
                    className="w-full bg-slate-950 hover:bg-slate-900 text-white font-semibold py-2.5 px-4 h-11 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs shadow-xs hover:shadow-md active:scale-[0.98]"
                  >
                    {checkingIn ? (
                      <span className="animate-pulse">Registering Biometric Token...</span>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 text-slate-400" />
                        Tap Here to Instantly Self Check-In
                      </>
                    )}
                  </button>
                  {checkInSuccess && (
                    <p className="text-[10px] text-emerald-600 text-center animate-bounce">
                      Verified! Logged successfully for today.
                    </p>
                  )}
                  {checkInError && (
                    <p className="text-[10px] text-red-500 text-center">
                      {checkInError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Exercises Routines Hub */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Dumbbell className={`w-4.5 h-4.5 ${themeStyles.accent}`} />
                  Active Training Routines
                </h3>
                <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                  {routines.length} routines
                </span>
              </div>

              {/* Weekday Switch Horizontal Track */}
              <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {["Monday", "Wednesday", "Friday"].map((dayName) => (
                  <button
                    key={dayName}
                    onClick={() => {
                      setSelectedDay(dayName);
                      setExpandedExercise(null);
                    }}
                    className={`flex-1 min-w-[95px] text-center font-bold text-xs py-2 rounded-xl transition-all cursor-pointer select-none ${
                      selectedDay.toLowerCase() === dayName.toLowerCase()
                        ? `${themeStyles.accentBg} text-white shadow-sm`
                        : "bg-white hover:bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {dayName}
                  </button>
                ))}
              </div>

              {/* Active Workout Program details list */}
              {currentRoutine ? (
                <div className="space-y-3 pt-1">
                  <div className="bg-slate-100/60 p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className={`text-[9px] font-bold ${themeStyles.accent} uppercase tracking-widest`}>
                      Assigned workout program
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{currentRoutine.title}</p>
                  </div>

                  {/* Exercises in active program */}
                  <div className="space-y-2.5">
                    {currentRoutine.exercises && currentRoutine.exercises.length > 0 ? (
                      currentRoutine.exercises.map((ex: Exercise, index: number) => (
                        <div
                          key={index}
                          className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden"
                        >
                          <button
                            onClick={() =>
                              setExpandedExercise(
                                expandedExercise === index ? null : index
                              )
                            }
                            className="w-full text-left p-4 flex justify-between items-center gap-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-250">
                                {index + 1}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800 leading-snug">
                                  {ex.name}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {ex.sets} sets • {ex.reps}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                Video Guide
                              </span>
                              {expandedExercise === index ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </button>

                          {/* Video expansion dropdown */}
                          <AnimatePresence>
                            {expandedExercise === index && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                              >
                                <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50/50">
                                  <div className="relative aspect-video bg-black rounded-xl border border-slate-200 overflow-hidden mt-3 shadow-inner">
                                    <iframe
                                      src={ex.videoUrl}
                                      title={`Exercise Video - ${ex.name}`}
                                      className="absolute inset-0 w-full h-full border-0 rounded-xl"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    ></iframe>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-2 text-center">
                                    Tip: Ensure clean repetitions and focus entirely on concentric contractions.
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-xs text-slate-500 py-4">No exercises added to this routine yet.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-2xs">
                  <Dumbbell className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">Rest Day!</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px] mt-1 text-center">
                    There is no workout scheduled for this day. Rest and recover!
                  </p>
                </div>
              )}
            </div>

            {/* System Reminders / Mailbox */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Bell className={`w-4.5 h-4.5 ${themeStyles.accent}`} />
                  Notifications Inbox
                </h3>
                {unreadReminders.length > 0 && (
                  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full animate-bounce">
                    {unreadReminders.length} UNREAD
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {reminders.length > 0 ? (
                  reminders.map((note) => (
                    <div
                      key={note.id}
                      className={`border p-4 rounded-2xl relative transition-all ${
                        note.status === "unread"
                          ? "bg-indigo-50/40 border-indigo-150 border-indigo-200 shadow-xs animate-pulse"
                          : "bg-white border-slate-200 text-slate-500"
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5 leading-snug">
                        {note.status === "unread" && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block shrink-0" />
                        )}
                        {note.title}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {note.body}
                      </p>
                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-100">
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(note.sentAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {note.status === "unread" && (
                          <button
                            onClick={() => markReminderRead(note.id)}
                            className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest cursor-pointer px-2 py-0.5 border border-indigo-100 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-6 bg-white rounded-2xl border border-slate-200 text-slate-450 text-xs shadow-2xs">
                    Inbox is clean! No notifications received.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY SECURED PERSONAL ROOM */}
        {activeTab === "room" && (
          <div className="p-5 space-y-5 animate-fadeIn">
            
            {roomLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-bold text-slate-500">Accessing Cloud Private Vault...</p>
              </div>
            ) : personalRoom ? (
              <div className="space-y-4">
                
                {/* Personal Gym Room Introduction Banner */}
                <div className="bg-slate-900 text-white rounded-3xl p-5 relative overflow-hidden shadow-md">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`p-2 rounded-xl text-white ${themeStyles.accentBg}`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-tight">{personalRoom.userName}'s Private Room</h3>
                      <p className="text-[10px] text-slate-400 font-medium">Chamber Security: Verified Authenticated Session</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-sm mt-2">
                    Welcome to your custom private locker room. Only you have the PIN and identity authorization to open your digital locker or write inside this diary.
                  </p>
                </div>

                {/* DIGITAL PIN LOCKER SYSTEM */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs relative">
                  
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">SECURE DIGITAL LOCKER</span>
                      <h4 className="text-sm font-black text-slate-800">Locker Compartment: {personalRoom.lockerNumber}</h4>
                    </div>
                    <div>
                      {isLockerOpen ? (
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shrink-0 animate-pulse">
                          <Unlock className="w-3.5 h-3.5" /> Compartment Open
                        </span>
                      ) : (
                        <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shrink-0">
                          <Lock className="w-3.5 h-3.5" /> Secured & Locked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scenario A: Locker is currently unlocked */}
                  {isLockerOpen ? (
                    <div className="space-y-4 animate-scaleUp">
                      <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Inventory Compartment Drawer</span>
                          <span className="text-[9px] text-slate-400">Tap item to retrieve or store</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2.5">
                          {lockerItems.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => toggleLockerItem(idx)}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                item.inside
                                  ? "bg-slate-800/80 border-slate-700 text-white"
                                  : "bg-slate-950/40 border-slate-800/40 text-slate-500 line-through"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{item.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold truncate leading-tight">{item.name}</p>
                                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                    {item.inside ? "Inside Compartment" : "Retrieved"}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            💡 Virtual locker stays loaded as long as your private browser session lives.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <button
                          onClick={handleLockerClose}
                          className="flex-1 py-2.5 px-4 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                        >
                          Close Locker Door 🔒
                        </button>
                        <button
                          onClick={handleResetLockerPin}
                          className="py-2.5 px-4 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                          title="Reset locker PIN"
                        >
                          Clear Code
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Scenario B: Locker is locked or PIN is being defined */
                    <div className="space-y-4">
                      
                      {/* Check if PIN is not defined yet */}
                      {!personalRoom.lockerPin ? (
                        <div className="bg-amber-50/80 border border-amber-100 rounded-2xl p-4 text-center">
                          <p className="text-xs font-bold text-amber-900 leading-relaxed">
                            🔒 Initial Setup: Your Locker is currently Unassigned
                          </p>
                          <p className="text-[11px] text-amber-700 mt-1">
                            Type a custom 4-digit code using the keypad below to claim and password-protect your personal locker storage drawer.
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-1">
                          <div className="inline-flex p-3 rounded-2xl bg-slate-50 border border-slate-200 mb-2">
                            <Lock className="w-6 h-6 text-slate-400 animate-pulse" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">Enter your 4-Digit Security PIN to Unlock</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Protecting contents and gym valuables</p>
                        </div>
                      )}

                      {/* Display entered digits indicator */}
                      <div className="flex justify-center items-center gap-3 py-1">
                        {[0, 1, 2, 3].map((idx) => (
                          <div
                            key={idx}
                            className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs ${
                              enteredCode.length > idx
                                ? "bg-slate-900 text-white border-transparent scale-110"
                                : "bg-slate-100 border-slate-200 text-slate-300"
                            }`}
                          >
                            {enteredCode.length > idx ? "•" : ""}
                          </div>
                        ))}
                      </div>

                      {lockerError && (
                        <p className="text-[11px] text-rose-600 text-center font-bold animate-horizontalShake">
                          {lockerError}
                        </p>
                      )}

                      {/* KEYPAD GRID ACCENT */}
                      <div className="max-w-[280px] mx-auto bg-slate-100/50 p-4 rounded-2xl border border-slate-200/60 shadow-inner">
                        <div className="grid grid-cols-3 gap-2">
                          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                            <button
                              key={num}
                              onClick={() => handleKeyPairTap(num)}
                              disabled={enteredCode.length >= 4}
                              className="h-10 text-xs font-black bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer focus:outline-none flex items-center justify-center"
                            >
                              {num}
                            </button>
                          ))}
                          <button
                            onClick={handleKeyPairBackspace}
                            className="h-10 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-slate-200"
                            title="Backspace"
                          >
                            ⌫
                          </button>
                          <button
                            onClick={() => handleKeyPairTap("0")}
                            disabled={enteredCode.length >= 4}
                            className="h-10 text-xs font-black bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center justify-center"
                          >
                            0
                          </button>
                          <button
                            onClick={handleLockerPINSubmit}
                            className="h-10 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center border border-transparent shadow-xs"
                          >
                            {!personalRoom.lockerPin ? "SET PIN" : "ENTER"}
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                </div>

                {/* PRIVATE FITNESS DIARY JOURNAL */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg text-white ${themeStyles.accentBg}`}>
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">CLOUD SECURED NOTEBOOK</span>
                        <h4 className="text-sm font-black text-slate-800">My Fitness Journal & Secrets</h4>
                      </div>
                    </div>
                    {journalSavedMsg && (
                      <span className="text-[10px] font-semibold text-emerald-600 animate-bounce">
                        {journalSavedMsg}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <textarea
                      value={personalRoom.notes}
                      onChange={handleNotesTextChange}
                      rows={5}
                      className="w-full bg-yellow-50/50 border border-amber-100 rounded-2xl p-4 text-xs font-semibold text-slate-700 leading-relaxed focus:bg-yellow-50 focus:ring-1 focus:ring-amber-300 focus:outline-none shadow-inner tracking-wide resize-none"
                      placeholder="Write your private reps, weight updates, daily goals, or secrets here..."
                      maxLength={1000}
                    />
                    
                    <button
                      onClick={handleSaveNotes}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] ${themeStyles.button}`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Save Private Journal Entry
                    </button>
                  </div>
                </div>

                {/* ROOM DECORATION STYLE OPTIONS */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">
                    ROOM THEME CUSTOMIZATION
                  </span>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    Personalize your room mood and layout colors. Changing this stores your active styling state permanently to the database.
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { vibe: "midnight", label: "Obsidian Midnight", emoji: "🌑", desc: "Classic dark luxury slate" },
                      { vibe: "neon", label: "Cyber Neon", emoji: "🌌", desc: "Vibrant fuchsia pulse vibe" },
                      { vibe: "zen", label: "Zen Oasis", emoji: "🍃", desc: "Restored emerald green peace" },
                      { vibe: "sun", label: "Golden Hour", emoji: "🌅", desc: "Warm energetic amber glow" },
                    ].map((opt) => (
                      <button
                        key={opt.vibe}
                        onClick={() => handleVibeSwitch(opt.vibe as any)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          personalRoom.themeVibe === opt.vibe
                            ? "bg-slate-900 text-white border-transparent shadow-md scale-[1.01]"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
                        }`}
                      >
                        <span className="text-xl inline-block mb-1">{opt.emoji}</span>
                        <p className="text-xs font-black leading-tight">{opt.label}</p>
                        <p className={`text-[9px] mt-0.5 ${personalRoom.themeVibe === opt.vibe ? "text-slate-300" : "text-slate-400"}`}>
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs shadow-2xs">
                Could not find or bootstrap personal room settings. Contact administrator.
              </div>
            )}

          </div>
        )}

      </div>

      <AnimatePresence>
        {showCameraModal && (
          <CameraCapture
            onCapture={handlePhotoCaptured}
            onClose={() => setShowCameraModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
