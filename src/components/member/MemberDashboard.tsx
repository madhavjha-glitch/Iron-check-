import React, { useState, useEffect } from "react";
import { 
  Calendar, CheckCircle, Clock, Dumbbell, QrCode, Bell, 
  Sparkles, ShieldCheck, Camera, CreditCard, Flame, Droplet, ArrowRight,
  Activity, TrendingUp, LogOut, Info
} from "lucide-react";
import { MemberProfile, AttendanceLog } from "../../types";

interface MemberDashboardProps {
  userProfile: MemberProfile;
  attendanceLogs: AttendanceLog[];
  photoUrl?: string;
  onNavigateTab: (tab: string) => void;
  onOpenQrScanner: () => void;
  onOpenAvatarModal: () => void;
  onOpenPhotoModal: () => void;
  onCheckOut: () => void;
}

export default function MemberDashboard({
  userProfile,
  attendanceLogs,
  photoUrl,
  onNavigateTab,
  onOpenQrScanner,
  onOpenAvatarModal,
  onOpenPhotoModal,
  onCheckOut
}: MemberDashboardProps) {
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [todayCheckIn, setTodayCheckIn] = useState<AttendanceLog | null>(null);
  const [quickStats, setQuickStats] = useState({
    caloriesBurned: 450,
    waterCups: 3,
    mealsLogged: 1,
    weightKg: 75.0
  });

  const [occupancy, setOccupancy] = useState<{
    currentOccupancy: number;
    maxCapacity: number;
    trafficStatus: string;
    trafficClass: string;
    trafficProgress: number;
    hourlyForecast: { hour: string; ratio: number; crowding: string }[];
  } | null>(null);

  const [isExiting, setIsExiting] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<{
    duration: number;
    checkIn: string;
    checkOut: string;
    calories: number;
  } | null>(null);

  useEffect(() => {
    const fetchOccupancy = async () => {
      try {
        const response = await fetch("/api/gym/occupancy/gym_hq_1");
        const data = await response.json();
        if (data.success) {
          setOccupancy(data);
        }
      } catch (err) {
        console.warn("Failed fetching live occupancy:", err);
      }
    };
    fetchOccupancy();
    const interval = setInterval(fetchOccupancy, 10000);
    return () => clearInterval(interval);
  }, [attendanceLogs]);

  const handleExitGym = async () => {
    setIsExiting(true);
    try {
      const standardQrObj = {
        gymId: "gym_hq_1",
        gymName: "Zymnix Gym",
        type: "GYM_ENTRANCE",
        createdAt: new Date().toISOString(),
        version: "1.0"
      };
      
      const response = await fetch("/api/qr/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scannedQRData: JSON.stringify(standardQrObj),
          memberId: userProfile.uid,
          gymId: "gym_hq_1"
        })
      });
      const result = await response.json();
      if (result.success && result.attendance && result.attendance.checkOutTime) {
        setSessionSummary({
          duration: result.attendance.duration || 45,
          checkIn: result.attendance.checkInTime,
          checkOut: result.attendance.checkOutTime,
          calories: Math.round((result.attendance.duration || 45) * 8.5)
        });
        setShowSummaryModal(true);
        const todayStr = new Date().toISOString().split("T")[0];
        localStorage.removeItem(`gym_checkin_${todayStr}`);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExiting(false);
    }
  };

  useEffect(() => {
    // Calculate days remaining
    const due = new Date(userProfile.feeDueDate);
    const diff = due.getTime() - Date.now();
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    setDaysRemaining(days);

    // Filter today's attendance log
    const todayStr = new Date().toISOString().split("T")[0];
    const log = attendanceLogs.find(l => l.dateString === todayStr);
    setTodayCheckIn(log || null);

    // Load metrics from localstorage fallback
    const savedWater = localStorage.getItem("gym_water_today");
    const savedMeals = localStorage.getItem("gym_meals_today");
    const savedWeights = localStorage.getItem("gym_weights_history");
    const savedWeightLatest = localStorage.getItem("gym_weight_latest");
    
    let cups = 3;
    let meals = 1;
    let wt = 75.0;

    if (savedWater) cups = parseInt(savedWater, 10);
    if (savedMeals) {
      try {
        const parsed = JSON.parse(savedMeals);
        meals = parsed.filter((m: any) => m.logged).length;
      } catch (e) {}
    }
    if (savedWeightLatest) {
      wt = parseFloat(savedWeightLatest);
    } else if (savedWeights) {
      try {
        const parsed = JSON.parse(savedWeights);
        if (parsed.length > 0) {
          const rawWt = parsed[parsed.length - 1].weight;
          // If rawWt is high (e.g. > 130), assume it's in lbs and convert to kg
          wt = rawWt > 130 ? Math.round((rawWt / 2.20462) * 10) / 10 : rawWt;
        }
      } catch (e) {}
    }

    setQuickStats({
      caloriesBurned: log ? 550 : 0,
      waterCups: cups,
      mealsLogged: meals,
      weightKg: wt
    });
  }, [userProfile.feeDueDate, attendanceLogs]);

  // Determine current scheduled workout for today
  const getTodayWorkoutName = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = days[new Date().getDay()];
    if (dayName === "Monday") return "Push Day (Chest & Shoulders)";
    if (dayName === "Wednesday") return "Pull Day (Back & Biceps)";
    if (dayName === "Friday") return "Leg Day & Abs Core";
    return "Recovery Rest Day";
  };

  const getNextMealName = () => {
    const hrs = new Date().getHours();
    if (hrs < 10) return "🍳 High-Protein Oats (Preround)";
    if (hrs < 15) return "🥩 Grilled Chicken & Rice (Post-session)";
    if (hrs < 19) return "🍌 Whey Whey Shake & Peanut Butter";
    return "🐟 Broiled Salmon & Asparagus";
  };

  return (
    <div className="space-y-5 p-5" id="member-dashboard">
      
      {/* Premium Gym Pass Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-900 to-slate-900 p-5 shadow-xl border border-white/10">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative group">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Member profile"
                    className="h-14 w-14 rounded-full border-2 border-white/60 object-cover shadow-md transition-transform hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-white border-2 border-white/30 truncate">
                    {userProfile.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={onOpenPhotoModal}
                  className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950 border border-slate-950 shadow hover:bg-amber-300 transition-all cursor-pointer"
                  title="Update photo"
                >
                  <Camera className="h-3 w-3" />
                </button>
              </div>

              <div className="min-w-0">
                <span className="text-[9px] font-bold text-indigo-300 tracking-widest uppercase block">
                  Iron Biometrics Member
                </span>
                <h3 className="text-base font-black text-white truncate leading-tight mt-0.5">
                  {userProfile.name}
                </h3>
                <button
                  onClick={onOpenAvatarModal}
                  className="mt-1 flex items-center gap-1 text-[9px] font-black tracking-wider uppercase bg-white/10 hover:bg-white/20 text-white py-0.5 px-2 rounded-md border border-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                  GENERATE AI AVATAR
                </button>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Active Tier
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                userProfile.feeStatus === "paid" 
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20" 
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/20 animate-pulse"
              }`}>
                {daysRemaining} Days Left
              </span>
            </div>
          </div>

          <div className="h-px bg-white/10 my-1" />

          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="text-[9px] text-white/50 uppercase tracking-widest">Enrolled Member Since</p>
              <p className="font-semibold text-slate-200 mt-0.5">
                {new Date(userProfile.joinedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
            </div>

            <button
              onClick={onOpenQrScanner}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/25 border border-white/15 hover:border-white/25 rounded-xl text-white font-extrabold shadow-inner transition-all text-xs cursor-pointer active:scale-95"
            >
              <QrCode className="h-4 w-4 text-indigo-300" />
              Scan Gate QR
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 Premium AI Fitness Lab Banner */}
      <div 
        onClick={() => onNavigateTab("premium-lab")}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 to-purple-950 p-4.5 shadow-xl border border-white/10 hover:border-indigo-500/20 cursor-pointer active:scale-95 transition-all group"
      >
        <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-gradient-to-r from-indigo-550 to-purple-550 flex items-center justify-center text-white shadow-lg group-hover:translate-x-1 transition-transform">
          <ArrowRight className="h-4 w-4 text-white" />
        </div>
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 rounded-2xl shadow-md animate-pulse shrink-0">
            <Sparkles className="h-5 w-5 fill-slate-950 text-slate-950" />
          </div>
          <div className="min-w-0 pr-8">
            <span className="text-[9.5px] font-black uppercase text-amber-300 tracking-widest block font-mono">VIP Tier Access Active</span>
            <h4 className="text-xs font-black text-white mt-1 uppercase tracking-wide">ENTER THE PREMIUM AI LAB</h4>
            <p className="text-[10px] text-slate-300 truncate mt-0.5">Explore 9 active custom biometrics engines</p>
          </div>
        </div>
      </div>

      {/* 📊 REAL-TIME GYM OCCUPANCY COUNTER */}
      {occupancy && (
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow-lg relative overflow-hidden" id="gym-occupancy-counter">
          <div className="absolute top-[-50%] right-[-20%] w-[150px] h-[150px] rounded-full bg-amber-500/5 blur-[50px] pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">
                LIVE SECURE HEADCOUNT
              </span>
            </div>
            <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-white/5 border border-white/5 ${occupancy.trafficClass}`}>
              {occupancy.trafficStatus}
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black text-white leading-none">
                {occupancy.currentOccupancy} <span className="text-xs font-medium text-slate-400">Athletes inside</span>
              </h2>
              <p className="text-[10.5px] mt-1.5 font-mono text-slate-500">
                Gym Capacity: {occupancy.currentOccupancy} / {occupancy.maxCapacity} ({occupancy.trafficProgress}% occupied)
              </p>
            </div>
            
            <div className="text-right">
              {todayCheckIn && todayCheckIn.status !== "out" ? (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg inline-block uppercase tracking-wide">
                  Checked In
                </span>
              ) : (
                <span className="text-[9px] font-bold text-slate-400 bg-white/5 border border-white/5 px-2 py-1 rounded-lg inline-block uppercase tracking-wide">
                  Off Campus
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3.5 h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 p-[1px]">
            <div 
              className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${
                occupancy.trafficProgress < 35 
                  ? "from-emerald-500 to-teal-400" 
                  : occupancy.trafficProgress < 75 
                    ? "from-amber-500 to-yellow-400" 
                    : "from-rose-500 to-orange-500"
              }`}
              style={{ width: `${occupancy.trafficProgress}%` }}
            />
          </div>

          {/* Hourly Traffic Load Curve Spark-Grids */}
          <div className="mt-4 pt-3.5 border-t border-white/5">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono mb-2">
              💡 HOURLY CROWDING HEATMAP
            </p>
            <div className="grid grid-cols-6 gap-1.5 text-center">
              {occupancy.hourlyForecast?.map((f, idx) => {
                const isCurrentPeak = (idx === 4 && new Date().getHours() >= 16 && new Date().getHours() <= 20) || 
                                    (idx === 0 && new Date().getHours() >= 6 && new Date().getHours() <= 9);
                return (
                  <div key={idx} className={`p-1.5 rounded-lg border transition-all ${
                    isCurrentPeak 
                      ? "bg-amber-500/5 border-amber-500/10 shadow-sm" 
                      : "bg-slate-950/40 border-white/5"
                  }`}>
                    <span className="text-[8px] font-bold block text-slate-400 leading-none">{f.hour}</span>
                    <div className="mt-1.5 h-10 w-full bg-slate-900/60 rounded overflow-hidden flex items-end">
                      <div 
                        className={`w-full transition-all duration-700 ${
                          f.crowding === "Peak" 
                            ? "bg-rose-500/60" 
                            : f.crowding === "High" 
                              ? "bg-orange-500/50" 
                              : f.crowding === "Moderate" 
                                ? "bg-amber-500/40" 
                                : "bg-emerald-500/30"
                        }`}
                        style={{ height: `${f.ratio}%` }}
                      />
                    </div>
                    <span className="text-[7px] font-mono mt-1 block tracking-tight leading-none text-slate-500 font-bold uppercase">{f.crowding}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Today's Fitness Widgets Block */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Check-In Health Status */}
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gym Access</span>
            <Clock className={`h-4.5 w-4.5 ${todayCheckIn && todayCheckIn.status !== "out" ? "text-emerald-400" : "text-amber-400 animate-pulse"}`} />
          </div>
          <div className="mt-4">
            <p className="text-[10px] text-slate-400">Today's Check-in</p>
            <h4 className="text-sm font-black text-white mt-1">
              {todayCheckIn && todayCheckIn.status !== "out" ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 inline" /> Authed VIP
                </span>
              ) : (
                <span className="text-amber-450 text-amber-400">Not Active</span>
              )}
            </h4>
            <span className="text-[9px] font-mono text-slate-500 mt-0.5 block">
              {todayCheckIn && todayCheckIn.status !== "out" 
                ? `Active: ${new Date(todayCheckIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                : todayCheckIn && todayCheckIn.status === "out"
                  ? `Done: ${new Date(todayCheckIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${todayCheckIn.checkOutTime ? new Date(todayCheckIn.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}`
                  : "Awaiting entry scan"
              }
            </span>
          </div>
          {(!todayCheckIn || todayCheckIn.status === "out") ? (
            <button
              onClick={onOpenQrScanner}
              className="mt-3 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg leading-none active:scale-95 transition-all cursor-pointer"
            >
              Scan Entrance QR
            </button>
          ) : (
            <button
              onClick={onCheckOut}
              className="mt-3 py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg leading-none active:scale-95 transition-all cursor-pointer animate-pulse"
            >
              Check Out Now
            </button>
          )}
        </div>

        {/* Weight Loss Progress */}
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex flex-col justify-between cursor-pointer group"
             onClick={() => onNavigateTab("progress")}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Body Weight</span>
            <Flame className="h-4.5 w-4.5 text-orange-400" />
          </div>
          <div className="mt-4">
            <p className="text-[10px] text-slate-400">Active Record</p>
            <h4 className="font-mono text-base font-black text-white mt-1">
              {quickStats.weightKg} <span className="text-xs text-slate-500">kg</span>
            </h4>
            <span className="text-[9px] text-slate-500 mt-0.5 block group-hover:text-indigo-400 transition-colors">
              View target timeline →
            </span>
          </div>
        </div>

        {/* Nutrition Intake */}
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex flex-col justify-between cursor-pointer group"
             onClick={() => onNavigateTab("diet")}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Meals Logged</span>
            <CheckCircle className="h-4.5 w-4.5 text-indigo-400" />
          </div>
          <div className="mt-4">
            <p className="text-[10px] text-slate-400">Calorie Status</p>
            <h4 className="text-sm font-black text-white mt-1">
              ☕ {quickStats.mealsLogged} / 4 Meals
            </h4>
            <span className="text-[9px] text-slate-500 mt-0.5 block group-hover:text-indigo-400 transition-colors">
              Fill macronutrient bars →
            </span>
          </div>
        </div>

        {/* Water Intake Hydration */}
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex flex-col justify-between cursor-pointer group"
             onClick={() => onNavigateTab("diet")}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hydration</span>
            <Droplet className="h-4.5 w-4.5 text-cyan-400" />
          </div>
          <div className="mt-4">
            <p className="text-[10px] text-slate-400">Water Intake</p>
            <h4 className="text-sm font-black text-white mt-1">
              💦 {quickStats.waterCups} / 8 Glasses
            </h4>
            <span className="text-[9px] text-slate-500 mt-0.5 block group-hover:text-indigo-400 transition-colors">
              Drink a cup of water →
            </span>
          </div>
        </div>

      </div>

      {/* Routine & Food Timeline Summary */}
      <div className="space-y-3.5">
        
        {/* Next Assigned Routine */}
        <div className="bg-slate-905 border border-white/5 shadow p-4 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest block">Today's Liftsplit</span>
              <h4 className="text-xs font-black text-white mt-0.5">{getTodayWorkoutName()}</h4>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab("workout")}
            className="p-1 px-2.5 bg-slate-800 hover:bg-slate-750 border border-white/5 rounded-lg text-[10px] font-bold text-indigo-300 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
          >
            Start Workout <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Next Scheduled Nutrition Meal */}
        <div className="bg-slate-905 border border-white/5 shadow p-4 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] text-orange-400 font-bold uppercase tracking-widest block">Next Scheduled Meal</span>
              <h4 className="text-xs font-black text-white mt-0.5">{getNextMealName()}</h4>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab("diet")}
            className="p-1 px-2.5 bg-slate-800 hover:bg-slate-750 border border-white/5 rounded-lg text-[10px] font-bold text-orange-300 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
          >
            Log Nutrients <ArrowRight className="h-3 w-3" />
          </button>
        </div>

      </div>

      {/* Internal Security Verification Note badge */}
      <div className="flex items-center justify-center gap-1.5 p-3.5 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl text-center">
        <ShieldCheck className="h-4 w-4 text-indigo-400" />
        <span className="text-[9.5px] font-semibold text-indigo-200">
          Biometric Gateway Secure • Logged from safe sandbox container.
        </span>
      </div>

      {/* 🧾 WORKOUT SUMMARY RECEIPT MODAL */}
      {showSummaryModal && sessionSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" id="workout-receipt-modal">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
            
            <div className="text-center mt-3">
              <div className="h-11 w-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-5 w-5" />
              </div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Biometric Gateway Handshake</span>
              <h3 className="text-sm font-black text-white mt-1 uppercase tracking-wide">WORKOUT COMPLETED</h3>
              <p className="text-[10px] text-slate-400 mt-1">Checked out of Iron HQ Gateway Turnstile</p>
            </div>

            {/* Receipt body */}
            <div className="mt-5 border-t border-b border-white/5 py-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Session Duration</span>
                <span className="font-mono text-white font-bold">{sessionSummary.duration} mins</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Est. Calories Burned</span>
                <span className="font-mono text-amber-400 font-black flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" />
                  {sessionSummary.calories} kcal
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Check-In Time</span>
                <span className="font-mono text-slate-300">
                  {new Date(sessionSummary.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Check-Out Time</span>
                <span className="font-mono text-slate-300">
                  {new Date(sessionSummary.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="mt-5 text-center px-2 bg-indigo-950/20 border border-indigo-500/10 p-2.5 rounded-xl">
              <p className="text-[9px] leading-relaxed text-indigo-200">
                ⭐ Gym occupancy has updated in real-time. Thank you for scanning out, physical turnstile gate released. See you next session!
              </p>
            </div>

            <button
              onClick={() => {
                setShowSummaryModal(false);
                window.location.reload();
              }}
              className="mt-6 w-full py-2.5 bg-white text-slate-950 hover:bg-slate-200 font-black tracking-wider uppercase rounded-xl text-[10.5px] active:scale-95 transition-all cursor-pointer shadow-md"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
