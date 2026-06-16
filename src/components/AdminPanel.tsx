import React, { useState, useEffect } from "react";
import {
  Users,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Search,
  BellRing,
  QrCode,
  Dumbbell,
  LogOut,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Send,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  FileSpreadsheet,
  Settings,
  Flame,
  Activity,
  Award,
  Sliders,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MemberProfile, AttendanceLog, ExerciseRoutine, Exercise, GymGateState, GymGateLog } from "../types";
import {
  setMemberFeeStatus,
  subscribeToMembersList,
  subscribeToAttendanceLogs,
  subscribeToRoutines,
  saveRoutineRecord,
  deleteRoutineRecord,
  dispatchFeeReminder,
  executeDynamicMembershipFeeCheck,
  logDailyCheckIn,
  logDailyCheckOut,
  subscribeToAdminsList,
  addAdminEmail,
  removeAdminEmail,
  manuallyAddMember,
  deleteMemberProfile,
  bulkImportMembersList,
  triggerGateHandshakeRecord,
  subscribeToGymGate,
  lockGateManual,
  setGateLockdownManual,
} from "../firebase";

interface AdminPanelProps {
  adminEmail: string;
  onLogout: () => void;
}

export default function AdminPanel({ adminEmail, onLogout }: AdminPanelProps) {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [routines, setRoutines] = useState<ExerciseRoutine[]>([]);
  const [gymGate, setGymGate] = useState<GymGateState | null>(null);
  const [gateCountdown, setGateCountdown] = useState<number | null>(null);

  const [occupancy, setOccupancy] = useState<{
    currentOccupancy: number;
    maxCapacity: number;
    trafficStatus: string;
    trafficClass: string;
    trafficProgress: number;
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
  }, [attendance]);

  const handleOccupancyOverride = async (action: "ADD" | "SUBTRACT" | "RESET") => {
    try {
      const response = await fetch("/api/gym/occupancy/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, val: 1 })
      });
      const data = await response.json();
      if (data.success) {
        const resStats = await fetch("/api/gym/occupancy/gym_hq_1");
        const fresh = await resStats.json();
        if (fresh.success) setOccupancy(fresh);
      }
    } catch (err) {
      console.error("Failed override count:", err);
    }
  };

  useEffect(() => {
    let timer: any;
    if (gymGate?.gateStatus === "unlocked") {
      setGateCountdown(5);
      timer = setInterval(() => {
        setGateCountdown((prev) => {
          if (prev !== null && prev <= 1) {
            clearInterval(timer);
            lockGateManual();
            return null;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    } else {
      setGateCountdown(null);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gymGate?.gateStatus]);


  // Navigation Panel Tabs State
  const [activeTab, setActiveTab] = useState<"dashboard" | "members" | "plans" | "nutrition_workouts" | "settings">("dashboard");

  // Individual Manual Member Creation inputs
  const [newMemName, setNewMemName] = useState("");
  const [newMemEmail, setNewMemEmail] = useState("");
  const [newMemPlan, setNewMemPlan] = useState<"1month" | "3months" | "6months" | "1year">("1month");
  const [newMemFeeStatus, setNewMemFeeStatus] = useState<"paid" | "unpaid">("paid");
  const [newMemError, setNewMemError] = useState("");
  const [newMemSuccess, setNewMemSuccess] = useState(false);

  // Bulk CSV Paste Importer state
  const [bulkCsvPaste, setBulkCsvPaste] = useState("");
  const [bulkCountAdded, setBulkCountAdded] = useState(0);
  const [bulkImportError, setBulkImportError] = useState("");
  const [bulkImportSuccess, setBulkImportSuccess] = useState(false);

  // Custom Pricing tier values (Settings Configuration simulation)
  const [hourlyTier, setHourlyTier] = useState("500");
  const [silverTier, setSilverTier] = useState("2499");
  const [goldTier, setGoldTier] = useState("5999");
  const [platinumTier, setPlatinumTier] = useState("19999");
  const [autoRenewSetting, setAutoRenewSetting] = useState(true);

  // Gym Details simulation settings
  const [gymTitle, setGymTitle] = useState("Ironstone Biometrics Fitness Club");
  const [gymAddress, setGymAddress] = useState("404 Heavy Metal Boulevard, Hypertrophy District");
  const [gymHotline, setGymHotline] = useState("+1 (555) 867-5309");

  // Nutrition Plans & Calories Tracking states
  const [nutritionPlans, setNutritionPlans] = useState([
    { id: "nut_1", planName: "Silver Bodybuilding High-Protein Lean-Mass", calories: 2400, protein: 175, carbs: 210, fats: 65, activeAssigned: 3 },
    { id: "nut_2", planName: "Gold Ultimate Hypertrophy Bulk Diet", calories: 3200, protein: 210, carbs: 380, fats: 95, activeAssigned: 5 },
    { id: "nut_3", planName: "Platinum Calisthenics Shred Keto-Focus", calories: 1900, protein: 160, carbs: 40, fats: 120, activeAssigned: 1 }
  ]);
  const [showNutritionCreator, setShowNutritionCreator] = useState(false);
  const [newDietName, setNewDietName] = useState("");
  const [newDietCal, setNewDietCal] = useState("2000");
  const [newDietPro, setNewDietPro] = useState("150");
  const [newDietCarb, setNewDietCarb] = useState("180");
  const [newDietFat, setNewDietFat] = useState("65");

  // Multi-Admin management states
  const [adminsList, setAdminsList] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [feeFilter, setFeeFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [adminSelectedMonths, setAdminSelectedMonths] = useState<Record<string, "1month" | "3months" | "6months" | "1year">>({});

  // Automated checker state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Manual notification modal state
  const [activeNotifyMember, setActiveNotifyMember] = useState<MemberProfile | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);

  // Routine editor state
  const [showRoutineEditor, setShowRoutineEditor] = useState(false);
  const [editingDay, setEditingDay] = useState("Monday");
  const [editingTitle, setEditingTitle] = useState("New Training Program");
  const [editingExercises, setEditingExercises] = useState<Exercise[]>([
    { name: "Barbell Bench Press", sets: 4, reps: "10 reps", videoUrl: "https://www.youtube.com/embed/8iPZq_GQ7Cw" },
  ]);

  // Interactive QR Scanning Simulation state
  const [selectedScanUid, setSelectedScanUid] = useState<string>("");
  const [showLargeQrPoster, setShowLargeQrPoster] = useState(false);
  const [customScanData, setCustomScanData] = useState<string>("");
  const [qrScanState, setQrScanState] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [qrScanFeedback, setQrScanFeedback] = useState<string>("");
  const [scannedMemberDetails, setScannedMemberDetails] = useState<MemberProfile | null>(null);

  const playScanSound = (isSuccess: boolean) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (isSuccess) {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();
        
        osc1.frequency.setValueAtTime(800, ctx.currentTime);
        gain1.gain.setValueAtTime(0.04, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.08);
        
        osc2.frequency.setValueAtTime(1150, ctx.currentTime + 0.08);
        gain2.gain.setValueAtTime(0.04, ctx.currentTime + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.08);
        osc2.stop(ctx.currentTime + 0.22);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn("AudioContext skipped or blocked by policies:", e);
    }
  };

  const handleSimulateQrScanAction = async () => {
    if (qrScanState === "scanning") return;

    let scanInput = "";
    if (customScanData.trim() !== "") {
      scanInput = customScanData.trim();
    } else if (selectedScanUid !== "") {
      scanInput = `ironstone_checkin_${selectedScanUid}`;
    } else {
      setQrScanState("error");
      setQrScanFeedback("Empty Scanned Signal: Please select a member or enter custom QR data.");
      playScanSound(false);
      return;
    }

    setQrScanState("scanning");
    setQrScanFeedback("Resolving optical biometric QR pass...");
    setScannedMemberDetails(null);

    await new Promise((res) => setTimeout(res, 1200));

    try {
      let targetUid = "";
      if (scanInput.startsWith("ironstone_checkin_")) {
        targetUid = scanInput.substring("ironstone_checkin_".length);
      } else {
        targetUid = scanInput;
      }

      const matchedMember = members.find(
        (m) => m.uid === targetUid || m.email.toLowerCase() === targetUid.toLowerCase()
      );

      if (!matchedMember) {
        await triggerGateHandshakeRecord("unknown", `Non-existent key: ${targetUid}`, "refused");
        throw new Error("ACCESS REFUSED: Invalid QR symbology or unregistered token identifier.");
      }

      try {
        await logDailyCheckIn(matchedMember.uid, matchedMember.name);
        await triggerGateHandshakeRecord(matchedMember.uid, matchedMember.name, "granted");
      } catch (checkInErr: any) {
        await triggerGateHandshakeRecord(matchedMember.uid, matchedMember.name, "refused");
        throw checkInErr;
      }

      setQrScanState("success");
      setScannedMemberDetails(matchedMember);
      
      const isFeeUnpaid = matchedMember.feeStatus === "unpaid";
      if (isFeeUnpaid) {
        setQrScanFeedback("ACCESS GRANTED (GRACE ACTIVE)! Active Arrears: Monthly premium overdue.");
      } else {
        setQrScanFeedback("ACCESS GRANTED! Welcome back to Zymnix Gym.");
      }
      playScanSound(true);
    } catch (err: any) {
      setQrScanState("error");
      setQrScanFeedback(err.message || "Failed decoding QR.");
      playScanSound(false);
    }
  };

  useEffect(() => {
    const unsubMembers = subscribeToMembersList((data) => {
      setMembers(data);
    });
    const unsubAttendance = subscribeToAttendanceLogs((data) => {
      setAttendance(data);
    });
    const unsubRoutines = subscribeToRoutines((data) => {
      setRoutines(data);
    });
    const unsubAdmins = subscribeToAdminsList((data) => {
      setAdminsList(data);
    });
    const unsubGate = subscribeToGymGate((data) => {
      setGymGate(data);
    });

    return () => {
      unsubMembers();
      unsubAttendance();
      unsubRoutines();
      unsubAdmins();
      unsubGate();
    };
  }, []);

  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    setAdminSuccess(false);
    if (!newAdminEmail.trim()) {
      setAdminError("Please enter a valid email address.");
      return;
    }
    const emailToAuthorize = newAdminEmail.trim().toLowerCase();
    
    if (!/\S+@\S+\.\S+/.test(emailToAuthorize)) {
      setAdminError("Invalid email pattern.");
      return;
    }

    if (adminsList.includes(emailToAuthorize)) {
      setAdminError("This email is already an authorized administrator.");
      return;
    }

    setAddingAdmin(true);
    try {
      await addAdminEmail(emailToAuthorize);
      setNewAdminEmail("");
      setAdminSuccess(true);
      playScanSound(true);
      setTimeout(() => setAdminSuccess(false), 4000);
    } catch (err: any) {
      setAdminError(err.message || "Failed to register new administrator.");
      playScanSound(false);
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdminAction = async (emailToRemove: string) => {
    if (emailToRemove === "madhavjha514@gmail.com") {
      alert("Error: The master administrator account cannot be revoked.");
      return;
    }
    if (confirm(`Are you sure you want to revoke admin credentials for ${emailToRemove}?`)) {
      try {
        await removeAdminEmail(emailToRemove);
        playScanSound(true);
      } catch (err) {
        console.error("Failed to revoke administrator:", err);
        playScanSound(false);
      }
    }
  };

  const handleToggleFeeStatus = async (uid: string, currentStatus: "paid" | "unpaid") => {
    const nextStatus = currentStatus === "paid" ? "unpaid" : "paid";
    try {
      const selectedPlan = adminSelectedMonths[uid] || "1month";
      await setMemberFeeStatus(uid, nextStatus, nextStatus === "paid" ? selectedPlan : "1month");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutomatedScannerRun = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      await new Promise((res) => setTimeout(res, 1200));
      const alertsSentCount = await executeDynamicMembershipFeeCheck(members);
      setScanResult(`Scan Completed! Verified database profiles and dispatched ${alertsSentCount} due membership notifications.`);
    } catch (err: any) {
      setScanResult(`Scan Error: ${err.message || err}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSendManualAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNotifyMember || !customTitle || !customBody) return;
    setSendingAlert(true);
    setAlertSuccess(false);
    try {
      await dispatchFeeReminder(activeNotifyMember.uid, customTitle, customBody);
      setAlertSuccess(true);
      setCustomTitle("");
      setCustomBody("");
      setTimeout(() => {
        setActiveNotifyMember(null);
        setAlertSuccess(false);
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSendingAlert(false);
    }
  };

  const handleCreateIndividualMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewMemError("");
    setNewMemSuccess(false);
    if (!newMemName.trim() || !newMemEmail.trim()) {
      setNewMemError("Please specify both name and email address.");
      return;
    }
    if (!newMemEmail.includes("@")) {
      setNewMemError("Please enter a valid email address.");
      return;
    }
    const cleanEmail = newMemEmail.trim().toLowerCase();
    const cleanName = newMemName.trim();
    const simulatedId = `user_man_${Math.random().toString(36).substring(2, 8)}`;
    
    let monthFactor = 1;
    if (newMemPlan === "3months") monthFactor = 3;
    else if (newMemPlan === "6months") monthFactor = 6;
    else if (newMemPlan === "1year") monthFactor = 12;
    const dueTime = new Date(Date.now() + monthFactor * 30 * 24 * 60 * 60 * 1000).toISOString();

    const profilePayload: MemberProfile = {
      uid: simulatedId,
      name: cleanName,
      email: cleanEmail,
      role: "customer",
      joinedAt: new Date().toISOString(),
      membershipStatus: "active",
      feeStatus: newMemFeeStatus,
      feeDueDate: dueTime,
      feePlan: newMemPlan,
    };

    try {
      await manuallyAddMember(profilePayload);
      setNewMemName("");
      setNewMemEmail("");
      setNewMemPlan("1month");
      setNewMemFeeStatus("paid");
      setNewMemSuccess(true);
      playScanSound(true);
      setTimeout(() => setNewMemSuccess(false), 3000);
    } catch (err: any) {
      setNewMemError(err.message || "Failed registering individual member.");
      playScanSound(false);
    }
  };

  const handleBulkCsvImportAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkImportError("");
    setBulkImportSuccess(false);
    setBulkCountAdded(0);

    if (!bulkCsvPaste.trim()) {
      setBulkImportError("CSV input area cannot be empty.");
      return;
    }

    const lines = bulkCsvPaste.split("\n");
    const parsedList: MemberProfile[] = [];
    let count = 0;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      if (line.toLowerCase().startsWith("name") || line.toLowerCase().startsWith("email")) {
        continue;
      }

      const parts = line.split(",").map((p) => p.trim());
      if (parts.length < 2) continue;

      const nameCandidate = parts[0] || "Imported Gym Athlete";
      const emailCandidate = parts[1] || `sim_imported_${Date.now()}_${count}@gmail.com`;
      const planCandidate: "1month" | "3months" | "6months" | "1year" = 
        (parts[2]?.toLowerCase().includes("3") ? "3months" :
         parts[2]?.toLowerCase().includes("6") ? "6months" :
         parts[2]?.toLowerCase().includes("year") || parts[2]?.toLowerCase().includes("12") ? "1year" : "1month");

      const rawFeeStatus = parts[3]?.toLowerCase();
      const statusCandidate: "paid" | "unpaid" = (rawFeeStatus === "paid" || rawFeeStatus === "yes" || rawFeeStatus === "true" || rawFeeStatus === "active") ? "paid" : "unpaid";

      let months = 1;
      if (planCandidate === "3months") months = 3;
      else if (planCandidate === "6months") months = 6;
      else if (planCandidate === "1year") months = 12;

      const dueDateTime = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();
      const randomizedUid = `user_csv_${Math.random().toString(36).substring(2, 8)}`;

      parsedList.push({
        uid: randomizedUid,
        name: nameCandidate,
        email: emailCandidate,
        role: "customer",
        joinedAt: new Date().toISOString(),
        membershipStatus: "active",
        feeStatus: statusCandidate,
        feeDueDate: dueDateTime,
        feePlan: planCandidate,
      });
      count++;
    }

    if (parsedList.length === 0) {
      setBulkImportError("Could not find any comma-separated lines. Expected line structure: Name, Email, Plan(1/3/6/12), PaidStatus(paid/unpaid)");
      playScanSound(false);
      return;
    }

    try {
      await bulkImportMembersList(parsedList);
      setBulkCountAdded(parsedList.length);
      setBulkCsvPaste("");
      setBulkImportSuccess(true);
      playScanSound(true);
    } catch (err: any) {
      setBulkImportError(err.message || "Bulk database save failure.");
      playScanSound(false);
    }
  };

  const handleDeleteMemberClick = async (uid: string, name: string) => {
    if (confirm(`CRITICAL: Are you sure you want to delete ${name}'s membership profile? All logs and payments will be revoked.`)) {
      try {
        await deleteMemberProfile(uid);
        playScanSound(true);
      } catch (err) {
        console.error(err);
        playScanSound(false);
      }
    }
  };

  const handleCreateNutritionDietSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDietName.trim()) return;
    const item = {
      id: `nut_${Date.now()}`,
      planName: newDietName.trim(),
      calories: parseInt(newDietCal) || 2000,
      protein: parseInt(newDietPro) || 120,
      carbs: parseInt(newDietCarb) || 150,
      fats: parseInt(newDietFat) || 60,
      activeAssigned: 0,
    };
    setNutritionPlans([item, ...nutritionPlans]);
    setNewDietName("");
    setNewDietCal("2000");
    setNewDietPro("150");
    setNewDietCarb("180");
    setNewDietFat("65");
    setShowNutritionCreator(false);
    playScanSound(true);
  };

  const handleAddExerciseRow = () => {
    setEditingExercises([
      ...editingExercises,
      { name: "", sets: 3, reps: "10 reps", videoUrl: "https://www.youtube.com/embed/8iPZq_GQ7Cw" },
    ]);
  };

  const handleUpdateExerciseField = (index: number, field: keyof Exercise, value: any) => {
    const copy = [...editingExercises];
    copy[index] = { ...copy[index], [field]: value };
    setEditingExercises(copy);
  };

  const handleRemoveExerciseRow = (index: number) => {
    setEditingExercises(editingExercises.filter((_, i) => i !== index));
  };

  const handleCreateOrUpdateRoutine = async () => {
    const routinePayload: ExerciseRoutine = {
      id: `rout_${editingDay.toLowerCase()}`,
      day: editingDay,
      title: editingTitle,
      exercises: editingExercises.filter((ex) => ex.name.trim() !== ""),
    };
    try {
      await saveRoutineRecord(routinePayload);
      setShowRoutineEditor(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    if (confirm("Are you sure you want to delete this routine program?")) {
      await deleteRoutineRecord(id);
    }
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFee = feeFilter === "all" || m.feeStatus === feeFilter;
    return matchesSearch && matchesFee;
  });

  // KPI aggregation computations
  const totalGymUsersCount = members.length;
  const todayString = new Date().toISOString().split("T")[0];
  const activeLogsToday = attendance.filter((log) => log.dateString === todayString);
  const checkedInCount = activeLogsToday.length;
  const unpaidDuesCount = members.filter((m) => m.feeStatus === "unpaid").length;
  const simulatedActiveRevenue = members.filter((m) => m.feeStatus === "paid").length * parseInt(silverTier || "2499");

  return (
    <div className="flex-1 flex flex-col bg-slate-950 pb-12 text-slate-100 min-h-screen">
      {/* Admin Title Dashboard Header */}
      <div className="px-6 pt-5 pb-4 bg-slate-900 border-b border-white/5 shadow-2xl shrink-0">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">
              {gymTitle.toUpperCase()} • ADMIN OPERATING DESK
            </span>
            <h2 className="text-xl font-normal font-serif italic text-white tracking-tight mt-0.5">
              Club Owner Console ⚙️
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-800 text-slate-300 font-mono py-1.5 px-3 rounded-xl border border-white/5">
              Role: Master Manager
            </span>
            <button
              onClick={onLogout}
              className="p-2 cursor-pointer bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-white border border-white/5 hover:border-transparent rounded-xl transition-all"
              title="Sign Out Admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation selectors */}
        <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-white/5 mt-4 min-w-0 overflow-x-auto gap-1 shrink-0">
          {[
            { id: "dashboard", label: "Dashboard", icon: Activity },
            { id: "members", label: "Members Directory", icon: Users },
            { id: "plans", label: "Membership Plans", icon: Sliders },
            { id: "nutrition_workouts", label: "Workout & Diets", icon: Dumbbell },
            { id: "settings", label: "Branding Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  playScanSound(true);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                  active
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 space-y-5 mt-5">
        {/* 🚨 SYSTEM-WIDE EMERGENCY LOCKDOWN WARNING */}
        {gymGate?.lockdownMode && (
          <div className="bg-red-500/10 border-2 border-red-500/35 text-red-400 p-3.5 rounded-2xl flex items-center gap-3 animate-pulse shadow-md font-mono text-[11px] font-bold">
            <span className="text-xl">🚨</span>
            <div className="flex-1">
              <span className="uppercase block text-red-500 font-extrabold tracking-wider">CRITICAL BLACKOUT LOCKDOWN IN PROGRESS</span>
              <span className="font-sans block text-slate-400 text-[10px] font-medium leading-normal">
                Ingress turnstiles are securely locked. Mobile coupon passes and QR scan check-ins are temporarily bypassed and denied under Directive-1 security protocol.
              </span>
            </div>
            <button 
              onClick={async () => {
                await setGateLockdownManual(false);
                try {
                  await fetch("/api/gym/gate/lockdown", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lockdown: false })
                  });
                } catch (e) {
                  console.warn("Failed syncing lockdown to server memory:", e);
                }
                playScanSound(true);
              }}
              className="bg-red-650 hover:bg-red-500 text-white rounded-lg px-2.5 py-1 text-[10px] cursor-pointer"
            >
              DISABLE LOCKDOWN
            </button>
          </div>
        )}
        {/* TAB 1: INTEGRATED OVERVIEW DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-5">
            {/* KPI Stats Bento row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-lg">
                <div className="absolute right-2 bottom-1 opacity-[0.05] text-white">
                  <Users className="w-12 h-12" />
                </div>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Total Members</p>
                <p className="text-2xl font-extrabold text-white mt-1">{totalGymUsersCount}</p>
                <p className="text-[9px] text-slate-400 mt-1 font-semibold">Active profiles</p>
              </div>

              <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-lg">
                <div className="absolute right-2 bottom-1 opacity-[0.05] text-emerald-400">
                  <CheckCircle className="w-12 h-12" />
                </div>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Active Today</p>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">{checkedInCount}</p>
                <p className="text-[9px] text-emerald-500/85 mt-1 font-semibold font-sans">Today's check-ins</p>
              </div>

              <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-lg">
                <div className="absolute right-2 bottom-1 opacity-[0.05] text-rose-400">
                  <AlertTriangle className="w-12 h-12" />
                </div>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Unpaid Arrears</p>
                <p className="text-2xl font-extrabold text-rose-400 mt-1">{unpaidDuesCount}</p>
                <p className="text-[9px] text-slate-400 mt-1 font-semibold">{unpaidDuesCount} pending invoices</p>
              </div>

              <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-lg">
                <div className="absolute right-2 bottom-1 opacity-[0.05] text-indigo-400">
                  <DollarSign className="w-12 h-12" />
                </div>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Collections</p>
                <p className="text-2xl font-extrabold text-indigo-400 mt-1">₹{simulatedActiveRevenue.toLocaleString("en-IN")}</p>
                <p className="text-[9px] text-slate-400 mt-1 font-semibold font-sans">Based on ₹{silverTier}/mo rate</p>
              </div>
            </div>

            {/* 🎯 REAL-TIME OCCUPANCY CONTROL COMMAND CENTER */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md shadow-xl">
              <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-indigo-500/[0.02] to-transparent pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                {/* Left Section: Live occupancy visual */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative flex items-center justify-center h-16 w-16 shrink-0 bg-slate-950 rounded-full border border-white/5 shadow-inner">
                    <svg className="w-14 h-14 -rotate-90">
                      <circle cx="28" cy="28" r="22" className="stroke-slate-950 fill-none" strokeWidth="3" />
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        className="stroke-indigo-500 fill-none transition-all duration-1000"
                        strokeWidth="3.5"
                        strokeDasharray={`${2 * Math.PI * 22}`}
                        strokeDashoffset={`${2 * Math.PI * 22 * (1 - (occupancy ? occupancy.trafficProgress : 35) / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[11px] font-black text-white font-mono">
                      {occupancy ? occupancy.trafficProgress : 35}%
                    </span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[9.5px] font-black tracking-widest text-indigo-400 uppercase font-mono">LIVE OCCUPANCY COMMAND</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-white font-mono flex items-baseline gap-1.5 leading-none">
                      {occupancy ? occupancy.currentOccupancy : "..."}
                      <span className="text-xs text-slate-500 font-normal">/ {occupancy ? occupancy.maxCapacity : 60} Athletes inside</span>
                    </h3>
                    <p className="text-[10.5px] text-slate-400 font-medium flex items-center gap-1.5">
                      Status: <span className={`font-black ${occupancy?.trafficClass || "text-amber-400"}`}>{occupancy ? occupancy.trafficStatus : "Comfortable"}</span>
                    </p>
                  </div>
                </div>

                {/* Center Section: Capacity guidelines indicator */}
                <div className="hidden lg:block max-w-xs text-left">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Turnstile Facility Status</div>
                  <p className="text-[10.5px] text-slate-300 leading-relaxed">
                    Gate is scanning checked connections. Staff override offset enables immediate counting update for daily single-use passes or companion entries.
                  </p>
                </div>

                {/* Right Section: Staff Override Command Controls */}
                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  <div className="text-right mr-1.5 hidden sm:block">
                    <span className="text-[8.5px] font-black uppercase text-slate-500 block font-mono">STAFF CONTROL</span>
                    <span className="text-[10px] font-bold text-slate-300 block">Override Counter</span>
                  </div>
                  
                  <button
                    onClick={() => handleOccupancyOverride("SUBTRACT")}
                    className="p-2 px-3 bg-slate-950 hover:bg-slate-800 border border-white/5 active:scale-95 transition-all text-rose-450 hover:text-rose-400 rounded-xl font-black text-xs cursor-pointer flex items-center gap-1 shadow-md"
                    title="Manual Sign-Out Subtract"
                  >
                    <span>-1</span>
                  </button>

                  <button
                    onClick={() => handleOccupancyOverride("ADD")}
                    className="p-2 px-3 bg-slate-950 hover:bg-slate-800 border border-white/5 active:scale-95 transition-all text-emerald-450 hover:text-emerald-400 rounded-xl font-black text-xs cursor-pointer flex items-center gap-1 shadow-md"
                    title="Manual Walk-In Add"
                  >
                    <span>+1</span>
                  </button>

                  <button
                    onClick={() => handleOccupancyOverride("RESET")}
                    className="p-2 py-2.5 bg-slate-950 hover:bg-slate-805 border border-white/5 active:scale-95 transition-all text-slate-400 hover:text-slate-300 rounded-xl text-[9px] uppercase font-black cursor-pointer leading-none"
                    title="Reset Manual Admin Counter Offset"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Multi-tier colored progress line */}
              <div className="w-full bg-slate-950 rounded-full h-2 mt-4 overflow-hidden border border-white/5 flex gap-0.5">
                <div 
                  className="bg-emerald-500 h-full rounded-l-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, Math.max(0, (occupancy ? occupancy.trafficProgress : 35)))}%` }}
                />
              </div>
            </div>

            {/* REAL-TIME ATTENDANCE TRENDS & ANALYTICS CHARTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Daily/Weekly Attendance Trends bar graph */}
              <div className="bg-slate-900/85 border border-white/10 rounded-2xl p-4.5 space-y-3.5">
                <div className="flex justify-between items-center px-4 pt-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">Weekly Attendance Flow</h3>
                    <p className="text-[9px] text-slate-400 tracking-wide">Volume density per day of the week</p>
                  </div>
                  <span className="text-[8px] font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-lg">
                    Real-time Logs
                  </span>
                </div>

                {/* SVG Histograms */}
                <div className="h-36 flex items-end justify-between px-4 pb-4 bg-slate-950 rounded-xl relative border border-white/5 mx-4 mb-4">
                  {[
                    { day: "Mon", count: 12, percent: "65%" },
                    { day: "Tue", count: 18, percent: "85%" },
                    { day: "Wed", count: 15, percent: "75%" },
                    { day: "Thu", count: 9, percent: "45%" },
                    { day: "Fri", count: 21, percent: "98%" },
                    { day: "Sat", count: 14, percent: "70%" },
                    { day: "Sun", count: 6, percent: "30%" },
                  ].map((bar, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-1 space-y-2 group">
                      <span className="text-[8px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        {bar.count}
                      </span>
                      <div className="w-5 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md relative transition-all duration-500 hover:brightness-125 hover:shadow-lg hover:shadow-indigo-500/20" style={{ height: bar.percent }} />
                      <span className="text-[9px] font-mono text-slate-400">{bar.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Member Growth Analytics line graph */}
              <div className="bg-slate-900/85 border border-white/10 rounded-2xl p-4.5 space-y-3.5">
                <div className="flex justify-between items-center px-4 pt-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider"> Roster Growth Analytics</h3>
                    <p className="text-[9px] text-slate-400 tracking-wide">Aggregate member registration over fiscal period</p>
                  </div>
                  <span className="text-[8px] font-mono uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-lg">
                    Aggregate Rate
                  </span>
                </div>

                <div className="h-36 bg-slate-950 rounded-xl relative border border-white/5 p-2 flex flex-col justify-between mx-4 mb-4">
                  {/* Visual SVG line overlay */}
                  <svg className="absolute inset-0 w-full h-24 mt-4 overflow-visible px-2.5" preserveAspectRatio="none">
                    <path
                      d="M 5,60 Q 50,45 100,50 T 200,20 T 300,10"
                      fill="none"
                      stroke="url(#indigoGrad2)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <ellipse cx="200" cy="20" rx="4" ry="4" className="fill-indigo-400 animate-ping" />
                    <ellipse cx="200" cy="20" rx="3.5" ry="3.5" className="fill-white" />
                    <defs>
                      <linearGradient id="indigoGrad2" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4338ca" />
                        <stop offset="100%" stopColor="#818cf8" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Horizontal grid guide segments */}
                  <div className="border-b border-white/5 w-full h-8" />
                  <div className="border-b border-white/5 w-full h-8" />
                  <div className="border-b border-white/5 w-full h-8" />

                  {/* Months axis markers */}
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1 pt-1.5 border-t border-white/5">
                    <span>JAN (2)</span>
                    <span>FEB (3)</span>
                    <span>MAR (5)</span>
                    <span>APR (8)</span>
                    <span>JUN ({totalGymUsersCount})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FRONT DESK TERMINAL & MAIN entrance log check */}
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-xl rounded-full pointer-events-none" />
              
              <div className="flex flex-col items-center text-center">
                <span className="text-[9px] font-bold text-indigo-400 tracking-widest uppercase mb-1">FRONT DESK GATEWAY TERMINAL</span>
                <h3 className="text-xs font-serif italic text-white tracking-wide mb-3.5">
                  Entrance Access QR Passcode
                </h3>
                
                <div className="bg-slate-950 p-4 rounded-3xl border border-white/10 shadow-inner relative max-w-[180px] mx-auto">
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-500/75 rounded-tl-md" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-500/75 rounded-tr-md" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-500/75 rounded-bl-md" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-500/75 rounded-br-md" />
                  
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=zymnix_front_desk_checkin&color=ffffff&bgcolor=020617"
                    alt="Zymnix Attendance Gate QR Token"
                    className="w-32 h-32 select-none bg-slate-950 mx-auto block"
                    referrerPolicy="no-referrer"
                  />
                  
                  <div className="absolute left-4 right-4 h-0.5 bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-[scan_2s_ease-in-out_infinite] top-1/2" />
                </div>
                
                <p className="text-[10px] text-slate-400 mt-4 leading-relaxed max-w-sm">
                  Point your smartphone camera at this master Gateway QR passport. Scanning authorizes the front turnstile gate entry release and logs attendance automatically.
                </p>

                <button
                  type="button"
                  onClick={() => setShowLargeQrPoster(true)}
                  className="mt-4 px-3.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/20 hover:border-indigo-400/40 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <QrCode className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
                  Enlarge & Print Gate Poster
                </button>
              </div>
            </div>

            {/* DIRECT LOG BIOMETRIC SCANNER EMULATOR TERMINAL */}
            <div className="bg-slate-900 border border-white/5 p-4.5 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-slate-950 text-indigo-400 border border-white/10">
                    <QrCode className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white">Biometric Scanner Device Terminal</h3>
                    <span className="text-[9px] text-slate-400 font-medium">Test direct member checking with a laser scan trigger</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                        Select Member Profile QR
                      </label>
                      <select
                        value={selectedScanUid}
                        onChange={(e) => {
                          setSelectedScanUid(e.target.value);
                          setCustomScanData(""); 
                          setQrScanState("idle");
                        }}
                        disabled={qrScanState === "scanning"}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl text-xs py-2 px-3 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">-- Select Gym Attendee --</option>
                        {members.map((m) => (
                          <option key={m.uid} value={m.uid}>
                            {m.name} ({m.feeStatus === "paid" ? "Paid Status" : "Overdue Dues"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                        Or Custom Laser Emulation String
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ironstone_checkin_user_cust1"
                        value={customScanData}
                        onChange={(e) => {
                          setCustomScanData(e.target.value);
                          setSelectedScanUid(""); 
                          setQrScanState("idle");
                        }}
                        disabled={qrScanState === "scanning"}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSimulateQrScanAction}
                    disabled={qrScanState === "scanning"}
                    className={`w-full h-11 transition-all rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
                      qrScanState === "scanning"
                        ? "bg-slate-800 text-slate-400 border border-white/5"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-white" />
                    {qrScanState === "scanning" ? "Scanning Biometric QR..." : "FIRE GATE CHECK-IN LASER"}
                  </button>
                </div>

                {/* Virtual Physical Scan Reader Viewport */}
                <div className="bg-slate-950 border-4 border-slate-900 rounded-2xl p-4 flex flex-col justify-between items-center min-h-[200px] relative overflow-hidden shadow-inner font-mono text-center select-none">
                  {qrScanState === "scanning" && (
                    <div className="absolute left-0 w-full h-0.5 bg-indigo-50 shadow-[0_0_10px_#6366f1] animate-bounce z-10"></div>
                  )}

                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.3)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40"></div>

                  <div className="w-full flex-1 flex flex-col items-center justify-center py-2 z-10">
                    {qrScanState === "idle" && (
                      <div className="space-y-2">
                        <QrCode className="w-10 h-10 text-slate-700 mx-auto animate-pulse" />
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">DEVICE ID: TERM-X38</p>
                        <p className="text-[8px] text-slate-500 font-semibold">Proximity Reader Active</p>
                      </div>
                    )}

                    {qrScanState === "scanning" && (
                      <div className="space-y-2 animate-pulse">
                        <QrCode className="w-10 h-10 text-indigo-500 mx-auto" />
                        <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold">DECODING SCAN...</p>
                      </div>
                    )}

                    {qrScanState === "success" && scannedMemberDetails && (
                      <div className="space-y-1 w-full font-sans">
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-404 text-emerald-400 text-[10px] uppercase font-bold tracking-widest">
                          ACCESS GRANTED
                        </span>
                        <p className="text-sm font-bold text-white mt-1 uppercase truncate">{scannedMemberDetails.name}</p>
                        <p className="text-[9px] text-slate-400 truncate leading-normal font-mono">EMAIL: {scannedMemberDetails.email}</p>
                        <div className="grid grid-cols-2 gap-1 text-[8px] pt-1.5 max-w-xs mx-auto text-left border-t border-slate-900 text-slate-400">
                          <div>
                            STATUS: <span className="text-emerald-400 font-bold uppercase">{scannedMemberDetails.membershipStatus}</span>
                          </div>
                          <div>
                            FEE: <span className={scannedMemberDetails.feeStatus === "paid" ? "text-emerald-400 font-bold uppercase" : "text-amber-500 font-bold uppercase animate-pulse"}>{scannedMemberDetails.feeStatus}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {qrScanState === "error" && (
                      <div className="space-y-1.5 w-full">
                        <span className="inline-block px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] uppercase font-bold tracking-widest font-sans">
                          ACCESS REFUSED
                        </span>
                        <p className="text-[10px] text-rose-400/95 font-semibold mt-1 tracking-wider leading-relaxed px-1 font-sans">
                          {qrScanFeedback}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="w-full text-center border-t border-slate-900 pt-2 z-10 text-[9px] text-indigo-400/80 tracking-wide font-mono block truncate">
                    {qrScanState === "idle" && ">> DEVICE STANDBY READY"}
                    {qrScanState === "scanning" && ">> OPTICAL DECODING ACTIVE..."}
                    {qrScanState === "success" && `>> GRANTED OK: ${scannedMemberDetails?.name.split(" ")[0].toUpperCase()}`}
                    {qrScanState === "error" && `>> CHECK-IN SYSTEM REJECT`}
                  </div>
                </div>
              </div>
            </div>

            {/* PHYSICAL HARDWARE GATE MONITOR CO-PROCESSOR */}
            {gymGate && (
              <div className="bg-slate-900 border border-white/5 p-4.5 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-xl bg-slate-1000 border border-white/10 ${gymGate.gateStatus === 'unlocked' ? 'text-emerald-400' : 'text-rose-500'}`}>
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-white">Live Physical Gate Hardware Twin</h3>
                      <span className="text-[9px] text-slate-400 font-medium font-mono">MODEL/SCHEMA: Mongoose.GymGate</span>
                    </div>
                  </div>
                  <span className={`text-[8px] font-mono px-2 py-0.5 rounded-lg border uppercase ${gymGate.gateStatus === 'unlocked' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-extrabold animate-pulse' : 'bg-slate-950 border-white/5 text-slate-500'}`}>
                    {gymGate.gateStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Gate State Monitor Indicator */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between items-center text-center">
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Servo Lock Engine</p>
                    <div className="my-2.5 relative">
                      {gymGate.gateStatus === "unlocked" ? (
                        <div className="relative">
                          {/* Pulsing visual halo */}
                          <div className="absolute inset-x-0 inset-y-0 w-12 h-12 bg-emerald-500/20 animate-ping rounded-full mx-auto" style={{ left: '-12px', top: '-12px', width: '72px', height: '72px' }} />
                          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto relative z-10 animate-bounce">
                            <CheckCircle className="w-6 h-6" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto">
                          <X className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    {gymGate.gateStatus === "unlocked" ? (
                      <div>
                        <span className="text-[10px] text-emerald-400 font-extrabold block">UNLOCKED</span>
                        <span className="text-[8px] text-slate-400 block font-mono">
                          Auto-lock in <span className="text-amber-400 font-black">{gateCountdown !== null ? gateCountdown : 5}s</span>
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[10px] text-rose-500 font-extrabold block">SECURED</span>
                        <span className="text-[8px] text-slate-500 block">Solenoid Armed</span>
                      </div>
                    )}
                  </div>

                  {/* Open Log Metadata */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between font-mono text-[9px]">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider font-sans">LAST OPENED RELEASE</span>
                    <div className="space-y-1.5 py-1.5 text-left">
                      <div>
                        <span className="text-slate-500 text-[8px]">MEMBER:</span>{" "}
                        <span className="text-slate-200 font-bold uppercase block truncate">{gymGate.gateOpenedBy || "N/A - STANDBY"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[8px]">TIME:</span>{" "}
                        <span className="text-slate-300 block truncate">
                          {gymGate.lastOpenedAt 
                            ? new Date(gymGate.lastOpenedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " (today)"
                            : "NEVER OPENED"
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[8px]">OPEN DURATION:</span>{" "}
                        <span className="text-indigo-400 font-bold block">{gymGate.openDuration} SECONDS</span>
                      </div>
                    </div>
                    <button
                      onClick={() => lockGateManual()}
                      disabled={gymGate.gateStatus === "locked"}
                      className="w-full py-1 text-[8px] bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 disabled:opacity-40 disabled:hover:bg-transparent border border-rose-500/10 font-sans font-extrabold rounded-lg uppercase cursor-pointer transition-all text-center"
                    >
                      Override Manual Lock
                    </button>
                  </div>

                  {/* Access Handshake Logs */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider pb-1 block border-b border-white/5">
                      GATE TRANSIT HANDSHAKES
                    </span>
                    <div className="space-y-1.5 mt-1.5 max-h-[110px] overflow-y-auto">
                      {gymGate.accessLog && gymGate.accessLog.length > 0 ? (
                        gymGate.accessLog.slice(0, 4).map((log, lidx) => (
                          <div key={lidx} className="flex justify-between items-center text-[8.5px] font-mono leading-tight bg-slate-900/40 p-1.5 rounded-lg border border-white/5">
                            <div className="truncate flex-1 pr-1.5 text-left">
                              <span className="text-slate-300 font-extrabold uppercase block truncate">{log.memberName}</span>
                              <span className="text-[7.5px] text-slate-500">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </span>
                            </div>
                            <span className={`px-1 py-0.5 rounded text-[7px] font-bold uppercase shrink-0 ${log.status === 'granted' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
                              {log.status === 'granted' ? 'PASS' : 'REJECT'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[8px] text-slate-500 text-center py-5 font-sans font-medium">No system handshakes logged</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
                   {/* CHRONOLOGICAL ATTENDANCE LOGGER & ACTIVE ATHLETES HEADBOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Column 1: Chronological Check-In Feed */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest">Biometric Check-In Feed Logs</h3>
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 h-[250px] overflow-y-auto space-y-2">
                  {attendance.length > 0 ? (
                    attendance.map((log) => (
                      <div
                        key={log.id}
                        className="bg-slate-950 p-2.5 rounded-xl border border-white/5 flex justify-between items-center text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-100 block">{log.userName}</span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            ID: {log.userId.substring(0, 10).toUpperCase()} • {log.status === "out" ? "Checked Out" : "Checked In"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`font-semibold font-mono block ${log.status === "out" ? "text-rose-405 text-rose-400" : "text-indigo-400"}`}>
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                          <span className="text-[9px] text-slate-550 block text-slate-500">
                            {log.checkOutTime 
                              ? `Out: ${new Date(log.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` 
                              : "Active Session"
                            }
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs text-slate-500 py-6">
                      No gym check-ins captured today yet. Try scanning one!
                    </p>
                  )}
                </div>
              </div>

              {/* Column 2: Currently Active Inside list & checkout triggers */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest">Athletes Currently Inside</h3>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-mono font-bold px-2 py-0.5 border border-indigo-500/20 rounded-lg">
                    {attendance.filter(log => log.status === "in" && !log.checkOutTime).length} Active Athletes
                  </span>
                </div>
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 h-[250px] overflow-y-auto space-y-2">
                  {attendance.filter(log => log.status === "in" && !log.checkOutTime).length > 0 ? (
                    attendance.filter(log => log.status === "in" && !log.checkOutTime).map((log) => (
                      <div
                        key={`inside_${log.id}`}
                        className="bg-slate-950 p-2.5 rounded-xl border border-white/5 flex justify-between items-center text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-100 block">{log.userName}</span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            Checked in: {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div>
                          <button
                            onClick={async () => {
                              try {
                                await logDailyCheckOut(log.userId);
                                // Play high verify chime
                                try {
                                  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                                  const audioCtx = new AudioCtx();
                                  const osc = audioCtx.createOscillator();
                                  osc.connect(audioCtx.destination);
                                  osc.frequency.setValueAtTime(650, audioCtx.currentTime);
                                  osc.type = "sine";
                                  osc.start();
                                  osc.stop(audioCtx.currentTime + 0.1);
                                } catch (e) {}
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="p-1.5 px-3 bg-rose-950 hover:bg-rose-600 border border-rose-900 hover:border-transparent text-rose-300 hover:text-white rounded-lg text-[9.5px] font-black transition-all active:scale-95 cursor-pointer leading-none"
                          >
                            Checkout Force
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-6">
                      <p className="text-xs text-slate-500">
                        Facility is empty. All checked-in athletes have checked out!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE MEMBERS BOARD & DIRECT REGISTRATION */}
        {activeTab === "members" && (
          <div className="space-y-5">
            {/* Form layout segment: Add individual member & Bulk copy-paste */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Individual Single registration form */}
              <div className="bg-slate-900 border border-white/5 p-5 rounded-2xl space-y-4 shadow-xl">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-indigo-400" />
                    Register Individual Member
                  </h3>
                  <p className="text-[9px] text-slate-400">Process single-profile membership with customized timeline</p>
                </div>

                <form onSubmit={handleCreateIndividualMember} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Athlete Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Liam Sterling"
                        value={newMemName}
                        onChange={(e) => setNewMemName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="liam.ster@gmail.com"
                        value={newMemEmail}
                        onChange={(e) => setNewMemEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Membership Plan</label>
                      <select
                        value={newMemPlan}
                        onChange={(e) => setNewMemPlan(e.target.value as any)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-2.5 text-xs text-white focus:outline-none cursor-pointer"
                      >
                        <option value="1month">1 Month (Bronze/Silver)</option>
                        <option value="3months">3 Months (Gold Plan)</option>
                        <option value="6months">6 Months (Platinum Term)</option>
                        <option value="1year">1 Year (Immortal Elite)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">First Payment Status</label>
                      <select
                        value={newMemFeeStatus}
                        onChange={(e) => setNewMemFeeStatus(e.target.value as any)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-2.5 text-xs text-white focus:outline-none cursor-pointer"
                      >
                        <option value="paid">Paid (Fully Cleared)</option>
                        <option value="unpaid">Unpaid (Arrears Active)</option>
                      </select>
                    </div>
                  </div>

                  {newMemError && (
                    <p className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2 px-3 rounded-lg font-bold">
                      {newMemError}
                    </p>
                  )}

                  {newMemSuccess && (
                    <p className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2 px-3 rounded-lg font-semibold">
                      Success! Member database passport created and dispatched automatically.
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    REGISTER GYM MEMBER
                  </button>
                </form>
              </div>

              {/* CSV Bulk raw importer pastebox */}
              <div className="bg-slate-900 border border-white/5 p-5 rounded-2xl space-y-4 shadow-xl">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-404 text-emerald-400" />
                    CSV Bulk Members Importer
                  </h3>
                  <p className="text-[9px] text-slate-400">Paste raw CSV data list lines to register multiple members instantly</p>
                </div>

                <form onSubmit={handleBulkCsvImportAction} className="space-y-3">
                  <div>
                    <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">
                      Csv Paste Format: Name, Email, Plan(1/3/6/12), PaidStatus(paid/unpaid)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Liam Stirling, liam@gmail.com, 3months, paid&#10;Ava Croft, ava@gmail.com, 1year, unpaid&#10;Mason Hunt, mason@gmail.com, 1month, paid"
                      value={bulkCsvPaste}
                      onChange={(e) => setBulkCsvPaste(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {bulkImportError && (
                    <p className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2 px-3 rounded-lg font-semibold">
                      {bulkImportError}
                    </p>
                  )}

                  {bulkImportSuccess && (
                    <p className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2 px-3 rounded-lg font-semibold">
                      Excellent! Successfully imported {bulkCountAdded} members cleanly.
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    CSV BULK IMPORT ATHLETES
                  </button>
                </form>
              </div>
            </div>

            {/* AUTOMATED BACKGROUND CHECK FOR ALL EXPIRY WARNINGS */}
            <div className="bg-slate-900 border border-white/5 p-4.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5 font-sans">
                  <BellRing className="w-4 h-4 text-indigo-400 animate-bounce" />
                  Membership Expiring Reminders Scanner
                </span>
                <p className="text-[9px] text-slate-400 mt-0.5">Automator running background check on active expiration due dates</p>
              </div>
              <button
                onClick={handleAutomatedScannerRun}
                disabled={isScanning}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] px-4 py-2 rounded-xl border border-white/10 transition-all cursor-pointer"
              >
                {isScanning ? "Processing check..." : "RUN COMPLIANCE SCANNER"}
              </button>
            </div>

            {/* FILTERABLE ACTIVE MEMBER REGISTER OR DIRECTORY */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Roster Directory ({filteredMembers.length} listed)
                </h3>

                <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 gap-1 self-start">
                  {(["all", "paid", "unpaid"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFeeFilter(tab)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        feeFilter === tab
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter members by name, email or custom tokens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 animate-fade-in">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => {
                    const isUnpaid = member.feeStatus === "unpaid";
                    const isExpired = new Date(member.feeDueDate).getTime() < Date.now();

                    return (
                      <div
                        key={member.uid}
                        className="bg-slate-900 border border-white/5 hover:border-indigo-500/30 rounded-2xl p-4.5 space-y-3.5 relative transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {member.photoUrl ? (
                              <img
                                src={member.photoUrl}
                                alt="Member Portrait"
                                className="w-10 h-10 rounded-full object-cover border border-indigo-500/20 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-indigo-600/10 border border-indigo-500/20 font-extrabold text-indigo-400 flex items-center justify-center text-xs shrink-0">
                                {member.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{member.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{member.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[8px] font-black uppercase px-2 py-0.5 border rounded-lg ${
                                member.feeStatus === "paid"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse"
                              }`}
                            >
                              {member.feeStatus}
                            </span>
                            <button
                              onClick={() => handleDeleteMemberClick(member.uid, member.name)}
                              className="p-1 rounded-lg bg-red-500/10 border border-red-500/20 text-rose-455 text-rose-400 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
                              title="Delete Member Profile Permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-b border-white/5 py-2.5 bg-slate-100/5 rounded-xl px-2">
                          <div>
                            <span className="text-slate-400 block font-semibold">Enrollment Joined</span>
                            <span className="text-slate-200 font-semibold font-mono">
                              {new Date(member.joinedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold">Membership Term End Date</span>
                            <span className={`font-mono font-semibold ${isExpired && isUnpaid ? "text-rose-400 font-bold" : "text-slate-200"}`}>
                              {new Date(member.feeDueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          {member.feeStatus === "unpaid" && (
                            <div className="flex items-center gap-1.5 text-[10px] justify-between px-1 bg-slate-950 border border-white/5 rounded-xl p-1.5">
                              <label className="text-slate-400 font-bold ml-1 uppercase">Cycle Duration:</label>
                              <select
                                value={adminSelectedMonths[member.uid] || "1month"}
                                onChange={(e) => setAdminSelectedMonths({
                                  ...adminSelectedMonths,
                                  [member.uid]: e.target.value as any
                                })}
                                className="text-[10px] font-bold bg-slate-900 border border-white/10 text-indigo-404 text-indigo-400 px-2.5 py-1 rounded-lg cursor-pointer outline-none font-semibold"
                              >
                                <option value="1month">1 Month (₹{silverTier})</option>
                                <option value="3months">3 Months (₹{goldTier})</option>
                                <option value="6months">6 Months (₹4,999)</option>
                                <option value="1year">1 Year (₹{platinumTier})</option>
                              </select>
                            </div>
                          )}

                          <div className="flex gap-2.5">
                            <button
                              onClick={() => handleToggleFeeStatus(member.uid, member.feeStatus)}
                              className={`flex-1 font-black py-2 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                                member.feeStatus === "paid"
                                  ? "bg-slate-800 hover:bg-slate-750 text-slate-300 border border-white/5"
                                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
                              }`}
                              title="Toggle Fee Invoice State"
                            >
                              <Check className="w-3.5 h-3.5" />
                              {member.feeStatus === "paid" ? "Invoice Paid • Revoke" : "MARK BILL CLOSED"}
                            </button>

                            <button
                              onClick={() => {
                                setActiveNotifyMember(member);
                                setCustomTitle("🚨 Membership Overdue Alert!");
                                setCustomBody(`Friendly notice from the front desk: your gym membership plan is pending renewal. Please log in to complete your transaction and clear outstanding dues!`);
                              }}
                              className="p-2 cursor-pointer bg-slate-800 hover:bg-slate-750 text-slate-300 border border-white/5 rounded-xl transition-all"
                              title="Send custom alerts direct"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-xs text-slate-500 py-6 border border-dashed border-white/10 rounded-2xl w-full col-span-2">
                    No active gym members found matching criteria.
                  </p>
                )}
              </div>
            </div>

            {/* Custom manual notification composer drawer popup */}
            {activeNotifyMember && (
              <div className="bg-slate-900 border border-indigo-500/20 p-5 rounded-2xl space-y-3 shadow-2xl relative z-25">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">
                    Send Direct Push Notification Alert to {activeNotifyMember.name}
                  </p>
                  <button
                    onClick={() => setActiveNotifyMember(null)}
                    className="text-xs text-slate-404 hover:text-white font-bold"
                  >
                    Close Drawer
                  </button>
                </div>

                <form onSubmit={handleSendManualAlert} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Alert Title (e.g. Daily Reminder)"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none"
                    required
                  />
                  <textarea
                    placeholder="Write a warm note or supplementary payment reminder here..."
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none resize-none"
                    required
                  />

                  {alertSuccess && (
                    <p className="text-[10px] text-emerald-400 font-semibold text-center bg-emerald-500/10 py-1.5 px-2 rounded-lg">
                      Alert dispatch successfully synchronized to user inbox!
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={sendingAlert}
                    className="w-full bg-indigo-600 text-white font-black py-2.5 px-3 text-xs rounded-xl hover:bg-indigo-500 transition-all cursor-pointer shadow-md"
                  >
                    {sendingAlert ? "Pushing Alert..." : "DISPATCH PUSH MESSAGE ALERTS"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MEMBERSHIP PLANS CONFIGURATION (PRICING TIERS) */}
        {activeTab === "plans" && (
          <div className="space-y-5">
            <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Pricing Tiers & Plan Configurations
                </h3>
                <p className="text-[9px] text-slate-400">Settings to modify currency values for your membership levels & renewal rules</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hourly Tier (Visitor)</span>
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-300">₹</span>
                    <input
                      type="number"
                      value={hourlyTier}
                      onChange={(e) => setHourlyTier(e.target.value)}
                      className="bg-transparent text-sm font-black text-white outline-none w-16"
                    />
                    <span className="text-[9px] text-slate-400">/ Day</span>
                  </div>
                  <p className="text-[8px] text-slate-550 leading-relaxed font-semibold">Perfect for transient gym drop-ins, valid 24h from checkin.</p>
                </div>

                <div className="bg-slate-955 bg-slate-950 p-4 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-404 uppercase tracking-wider">Silver Member (Standard)</span>
                    <Award className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-300">₹</span>
                    <input
                      type="number"
                      value={silverTier}
                      onChange={(e) => setSilverTier(e.target.value)}
                      className="bg-transparent text-sm font-black text-white outline-none w-16"
                    />
                    <span className="text-[9px] text-slate-400">/ Mo</span>
                  </div>
                  <p className="text-[8px] text-slate-550 leading-relaxed font-semibold">1 month standard tier. Access to weights and locker rooms.</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gold Multi-Month Tier</span>
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-300">₹</span>
                    <input
                      type="number"
                      value={goldTier}
                      onChange={(e) => setGoldTier(e.target.value)}
                      className="bg-transparent text-sm font-black text-white outline-none w-16"
                    />
                    <span className="text-[9px] text-slate-400">/ 3 Mos</span>
                  </div>
                  <p className="text-[8px] text-slate-505 leading-relaxed font-semibold justify-normal">3 months discount tier. Includes 1 assessment program.</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-404 uppercase tracking-wider">Platinum (Annual Elite)</span>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-300">₹</span>
                    <input
                      type="number"
                      value={platinumTier}
                      onChange={(e) => setPlatinumTier(e.target.value)}
                      className="bg-transparent text-sm font-black text-white outline-none w-16"
                    />
                    <span className="text-[9px] text-slate-400">/ Year</span>
                  </div>
                  <p className="text-[8px] text-slate-500 leading-relaxed font-semibold">12-mo premium plan. Includes meal templates.</p>
                </div>
              </div>

              {/* simulated auto-renewal rules */}
              <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white block font-sans">Auto-Renewal & Recurring Billing Rules</span>
                    <span className="text-[9px] text-slate-400 block">Automatically renew and check balance details on member scan triggers?</span>
                  </div>
                  <button
                    onClick={() => setAutoRenewSetting(!autoRenewSetting)}
                    className={`px-3 py-1 text-[10px] uppercase font-mono font-black border rounded-lg transition-colors cursor-pointer ${
                      autoRenewSetting
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-404"
                        : "bg-slate-800 border-white/5 text-slate-440"
                    }`}
                  >
                    {autoRenewSetting ? "AUTO RENEWS ON" : "AUTO RENEWS OFF"}
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 font-sans">
                  When enabled, turnstiles check membership details to allow scanning if associated with an active account plan.
                </p>
              </div>

              <button
                onClick={() => {
                  alert("Membership pricing structures and tier durations saved! New rates will apply to newly generated member cycles.");
                  playScanSound(true);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer text-center block font-sans"
              >
                APPLY PRICE CHANGES SECURELY
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: WORKOUT PROGRAMS & CALORIES / DIET PLAN TEMPLATES */}
        {activeTab === "nutrition_workouts" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Workout splits manager */}
              <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <Dumbbell className="w-4 h-4 text-indigo-404" />
                      Active Training Routines
                    </h3>
                    <span className="text-[9px] text-slate-400 block font-semibold">Create daily workout splits for customers</span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowRoutineEditor(!showRoutineEditor);
                      setEditingTitle("");
                      setEditingExercises([{ name: "", sets: 3, reps: "10 reps", videoUrl: "" }]);
                    }}
                    className="px-2.5 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 font-extrabold transition-all text-[9px] tracking-wider rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    New workout
                  </button>
                </div>

                {/* Workout Planner edit window */}
                {showRoutineEditor && (
                  <div className="bg-slate-950 border border-white/5 p-4 rounded-xl space-y-3">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block font-sans">Configure routine schedule</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Day</label>
                        <select
                          value={editingDay}
                          onChange={(e) => setEditingDay(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg text-xs py-1.5 px-2.5 text-white outline-none cursor-pointer"
                        >
                          <option value="Monday">Monday</option>
                          <option value="Wednesday">Wednesday</option>
                          <option value="Friday">Friday</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase">Routine Title</label>
                        <input
                          type="text"
                          placeholder="Chest, Delts & Tri"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg text-xs py-1.5 px-2.5 text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Exercises List</span>
                      {editingExercises.map((ex, idx) => (
                        <div key={idx} className="bg-slate-900/50 p-2.5 rounded-xl border border-white/5 space-y-1.5 relative">
                          {editingExercises.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveExerciseRow(idx)}
                              className="absolute right-2 top-2 text-rose-455 text-rose-400 text-xs shrink-0"
                            >
                              ✕
                            </button>
                          )}
                          <input
                            type="text"
                            placeholder="Exercise name (e.g. Incline Bench Press)"
                            value={ex.name}
                            onChange={(e) => handleUpdateExerciseField(idx, "name", e.target.value)}
                            className="w-full bg-slate-950 border border-white/5 rounded-lg py-1 px-2 text-xs text-white"
                          />
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="number"
                              placeholder="Sets"
                              value={ex.sets || ""}
                              onChange={(e) => handleUpdateExerciseField(idx, "sets", parseInt(e.target.value) || 0)}
                              className="bg-slate-950 border border-white/5 rounded-lg py-1 px-2 text-[10px] text-white"
                            />
                            <input
                              type="text"
                              placeholder="Reps (e.g. 10 reps)"
                              value={ex.reps}
                              onChange={(e) => handleUpdateExerciseField(idx, "reps", e.target.value)}
                              className="bg-slate-950 border border-white/5 rounded-lg py-1 px-2 text-[10px] text-white"
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddExerciseRow}
                        className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300"
                      >
                        + Add Exercise Row
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateOrUpdateRoutine}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer mt-2"
                    >
                      SAVE ACTIVE SPLIT ROUTINE
                    </button>
                  </div>
                )}

                {/* Workout index listing list */}
                <div className="space-y-2">
                  {routines.map((rt) => (
                    <div
                      key={rt.id}
                      className="bg-slate-950 border border-white/5 p-3 rounded-xl flex justify-between items-center"
                    >
                      <div>
                        <span className="text-[8px] font-extrabold tracking-widest bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full uppercase">
                          {rt.day} SCHEDULE
                        </span>
                        <p className="text-xs font-bold text-white mt-1.5">{rt.title}</p>
                        <p className="text-[9px] text-slate-500 font-medium mt-0.5 font-sans">
                          {rt.exercises ? rt.exercises.length : 0} detailed movements programmed
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteRoutine(rt.id)}
                        className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                        title="Delete Routine"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nutrition Meal Plans & Calories Tracking management */}
              <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <Flame className="w-4 h-4 text-amber-500" />
                      Nutrition & Diets Directory
                    </h3>
                    <span className="text-[9px] text-slate-404 text-slate-400 block font-semibold">Create calorie targets and macros splits templates</span>
                  </div>

                  <button
                    onClick={() => {
                      setShowNutritionCreator(!showNutritionCreator);
                      setNewDietName("");
                    }}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[9px] tracking-wider rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-slate-950" />
                    New Diet
                  </button>
                </div>

                {/* Inline Diet Plan template editor creator */}
                {showNutritionCreator && (
                  <form onSubmit={handleCreateNutritionDietSubmit} className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-2.5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block font-sans">Create Diet Blueprint</span>
                    
                    <input
                      type="text"
                      placeholder="e.g. Vegetarian Lean Bulking Blueprint"
                      value={newDietName}
                      onChange={(e) => setNewDietName(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-lg py-1.5 px-2.5 text-xs text-white uppercase font-bold"
                      required
                    />

                    <div className="grid grid-cols-4 gap-1.5 font-mono">
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Calories</label>
                        <input
                          type="number"
                          placeholder="220"
                          value={newDietCal}
                          onChange={(e) => setNewDietCal(e.target.value)}
                          className="bg-slate-900 border border-white/5 rounded-lg py-1 px-1.5 text-xs text-white w-full text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Pro (g)</label>
                        <input
                          type="number"
                          placeholder="150"
                          value={newDietPro}
                          onChange={(e) => setNewDietPro(e.target.value)}
                          className="bg-slate-900 border border-white/5 rounded-lg py-1 px-1.5 text-xs text-white w-full text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-404 block mb-0.5 uppercase">Carbs (g)</label>
                        <input
                          type="number"
                          placeholder="180"
                          value={newDietCarb}
                          onChange={(e) => setNewDietCarb(e.target.value)}
                          className="bg-slate-900 border border-white/5 rounded-lg py-1 px-1.5 text-xs text-white w-full text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Fat (g)</label>
                        <input
                          type="number"
                          placeholder="65"
                          value={newDietFat}
                          onChange={(e) => setNewDietFat(e.target.value)}
                          className="bg-slate-900 border border-white/5 rounded-lg py-1 px-1.5 text-xs text-white w-full text-center"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-500 text-slate-950 font-black text-[10px] py-1.5 rounded-lg mt-2 cursor-pointer uppercase font-sans"
                    >
                      SAVE DIET BLUEPRINT
                    </button>
                  </form>
                )}

                {/* Diets index directory listing */}
                <div className="space-y-2.5">
                  {nutritionPlans.map((nut) => (
                    <div
                      key={nut.id}
                      className="bg-slate-950 border border-white/5 p-3 rounded-xl space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wide truncate pr-2 font-sans">{nut.planName}</span>
                        <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold px-1.5 py-0.5 rounded shadow-sm">
                          {nut.calories} CAL
                        </span>
                      </div>

                      {/* Macros split indicator visual pill graph */}
                      <div className="grid grid-cols-3 gap-2 py-1.5 text-[9px] font-mono border-t border-b border-white/5 bg-slate-900/30 px-2 rounded-lg text-slate-400">
                        <div>
                          PRO: <span className="text-slate-105 text-white font-bold">{nut.protein}g</span>
                        </div>
                        <div>
                          CARBS: <span className="text-slate-105 text-white font-bold">{nut.carbs}g</span>
                        </div>
                        <div>
                          FAT: <span className="text-slate-105 text-white font-bold">{nut.fats}g</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1 font-sans">
                        <span className="text-[8px] text-slate-500 font-semibold font-sans">Active athletes assigned: {nut.activeAssigned}</span>
                        <button
                          onClick={() => {
                            setNutritionPlans(nutritionPlans.filter((n) => n.id !== nut.id));
                            playScanSound(false);
                          }}
                          className="text-[9px] font-bold hover:text-rose-400 text-rose-455 text-rose-400 transition-colors"
                        >
                          Remove Blueprint
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: GYM ADVERTISING BRAND SETTINGS & CO-OWNERS ROSTER */}
        {activeTab === "settings" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Gym parameters customizers */}
              <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl font-sans">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-indigo-400" />
                    Branding & Gym Details Settings
                  </h3>
                  <p className="text-[9px] text-slate-400">Set brand variables displayed inside customer pass-cards</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Gym Name</label>
                    <input
                      type="text"
                      placeholder="Branding name..."
                      value={gymTitle}
                      onChange={(e) => setGymTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Physical Address Facility</label>
                    <input
                      type="text"
                      placeholder="Physical address..."
                      value={gymAddress}
                      onChange={(e) => setGymAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-404 block font-bold uppercase mb-1">Gym Support Phone/Contact</label>
                    <input
                      type="text"
                      placeholder="hotline number..."
                      value={gymHotline}
                      onChange={(e) => setGymHotline(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    onClick={() => {
                      alert("Successfully updated physical gym settings. Passcard biometric headers refreshed on active mobile previews!");
                      playScanSound(true);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl transition-all cursor-pointer uppercase tracking-widest font-sans"
                  >
                    SAVE FACILITY PARAMETERS
                  </button>
                </div>
              </div>

              {/* Authorized staff owners panel */}
              <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-indigo-600/20 text-indigo-404 text-indigo-400 border border-indigo-505">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-white block">Authorized Administrators & Co-Staff</span>
                    <span className="text-[9px] text-slate-400 font-medium block">Add secondary managers authorized for entrance logs audit</span>
                  </div>
                </div>

                <form onSubmit={handleAddAdminSubmit} className="space-y-2 font-sans">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Staff email address..."
                      value={newAdminEmail}
                      onChange={(e) => {
                        setNewAdminEmail(e.target.value);
                        setAdminError("");
                        setAdminSuccess(false);
                      }}
                      className="flex-1 bg-slate-950 border border-white/10 text-white rounded-xl py-2 px-3 text-xs outline-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={addingAdmin}
                      className="bg-indigo-600 hover:bg-indigo-505 text-white font-extrabold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>

                  {adminError && (
                    <p className="text-[9px] text-rose-455 text-rose-400 font-semibold">{adminError}</p>
                  )}

                  {adminSuccess && (
                    <p className="text-[9px] text-emerald-400 font-semibold">Authorized staff registered successfully!</p>
                  )}
                </form>

                <div className="border-t border-white/5 pt-3 space-y-2">
                  <span className="text-[9px] font-bold text-slate-404 uppercase tracking-widest block font-sans">Authorized Staff list ({adminsList.length})</span>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto">
                    {adminsList.map((email) => {
                      const isMaster = email === "madhavjha514@gmail.com";
                      return (
                        <div
                          key={email}
                          className="p-2 bg-slate-950 border border-white/5 rounded-xl flex justify-between items-center text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isMaster ? "bg-amber-400" : "bg-indigo-400"}`} />
                            <span className="font-mono text-slate-300">{email}</span>
                            {isMaster && (
                              <span className="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-404 px-1.5 py-0.2 rounded font-extrabold uppercase font-sans select-none">
                                Founder Owner
                              </span>
                            )}
                          </div>
                          {!isMaster && (
                            <button
                              onClick={() => handleRemoveAdminAction(email)}
                              className="p-1 cursor-pointer hover:bg-rose-600/10 rounded text-rose-400 transition-colors"
                              title="Revoke Admin Permission"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 🚨 SECURITY & CRITICAL ACCESS HARDWARE COMMANDS */}
            <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl">
              <div>
                <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                  <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                  Security & Access Hardware Override Command
                </h3>
                <p className="text-[9px] text-slate-400">Lockdown turnstile or release gates manually for direct visitor check-in</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                {/* 1. LOCKDOWN PROTOCOL CONTROLLER */}
                <div className={`p-4 rounded-xl border transition-all ${
                  gymGate?.lockdownMode 
                    ? "bg-rose-950/20 border-rose-500/30 ring-1 ring-rose-500/20" 
                    : "bg-slate-950 border-white/5"
                }`}>
                  <span className="text-[9.5px] font-black uppercase text-slate-400 block tracking-wider font-mono">System Lockdown</span>
                  <p className="text-[10px] text-slate-300 leading-normal mt-1 mb-3">
                    Blocks all ingress access immediately. The gate simulator on members' panels will yield instant critical shutdown rejections.
                  </p>

                  <button
                    onClick={async () => {
                      const newLockdown = !gymGate?.lockdownMode;
                      await setGateLockdownManual(newLockdown);
                      // Sync to Node memory too so scanner API checks
                      try {
                        await fetch("/api/gym/gate/lockdown", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ lockdown: newLockdown })
                        });
                      } catch (e) {
                        console.warn("Failed syncing lockdown to server memory:", e);
                      }
                      playScanSound(!newLockdown);
                    }}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-black uppercase cursor-pointer transition-all tracking-wider ${
                      gymGate?.lockdownMode
                        ? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse"
                        : "bg-slate-800 hover:bg-slate-700 text-rose-455 text-rose-400 border border-rose-500/15"
                    }`}
                  >
                    {gymGate?.lockdownMode ? "🚨 DEENGAGE SHUTDOWN" : "🔒 ENGAGE DISASTER LOCKDOWN"}
                  </button>
                </div>

                {/* 2. STAFF TEMPORARY RELEASE BUTTON */}
                <div className="p-4 rounded-xl bg-slate-950 border border-white/5 flex flex-col justify-between">
                  <div>
                    <span className="text-[9.5px] font-black uppercase text-slate-400 block tracking-wider font-mono">10s Entrance Gate Release</span>
                    <p className="text-[10px] text-slate-300 leading-normal mt-1 mb-2">
                      Forks a temporary 10-second solenoid unlock sequence. Members can bypass credentials at physical turnstiles.
                    </p>
                  </div>

                  <button
                    disabled={gymGate?.lockdownMode}
                    onClick={async () => {
                      if (gymGate?.lockdownMode) return;
                      // Trigger gate open in firebase
                      await triggerGateHandshakeRecord("staff_release", "Manual Staff Override", "granted");
                      playScanSound(true);
                    }}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-black uppercase transition-all tracking-wider font-sans ${
                      gymGate?.lockdownMode
                        ? "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg active:scale-97"
                    }`}
                  >
                    🔓 RELEASE TURNSTILE DOOR
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🔮 Full-Screen High-Res Printable Gateway QR Poster */}
      <AnimatePresence>
        {showLargeQrPoster && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white text-slate-950 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative border-4 border-double border-slate-900"
            >
              {/* Close button - hidden when printing for beautiful physical posters */}
              <button
                onClick={() => setShowLargeQrPoster(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-750 transition-colors pointer-valid cursor-pointer print:hidden"
                title="Close"
              >
                <X className="w-5 h-5 text-slate-950" />
              </button>

              <div className="text-center space-y-6">
                <div>
                  <span className="text-[10px] font-black tracking-widest text-indigo-650 uppercase font-mono">Zymnix Gym Enterprise System</span>
                  <h2 className="text-xl font-black tracking-tight text-slate-950 uppercase mt-1 font-serif">SELF-SERVE ATHLETE GATEWAY</h2>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">Place this printed poster on your physical gate entrance or reception counter</p>
                </div>

                {/* Massive QR Identifier */}
                <div className="p-6 bg-slate-100 rounded-3xl inline-block border-2 border-dashed border-indigo-600/30">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=zymnix_front_desk_checkin&color=020617&bgcolor=ffffff"
                    alt="Zymnix Master Gate Access Code"
                    className="w-56 h-56 select-none mx-auto"
                    referrerPolicy="no-referrer"
                  />
                  <div className="mt-3 text-[10px] font-mono text-slate-500 font-bold tracking-widest">
                    GATE TOKEN: zymnix_front_desk_checkin
                  </div>
                </div>

                <div className="space-y-3 pt-2 text-left max-w-sm mx-auto">
                  <h4 className="text-xs font-black uppercase tracking-wide text-center text-slate-950">HOW TO CHECK IN:</h4>
                  <ol className="text-xs text-slate-755 space-y-1.5 list-decimal pl-4 leading-relaxed font-semibold">
                    <li>Open your smartphone and log into the <strong>Zymnix Member App</strong>.</li>
                    <li>On the dashboard, tap the <strong>"Scan Gate QR"</strong> button.</li>
                    <li>Align your camera to scan this master Gate QR Poster.</li>
                    <li>Once checked in, the gate will unlock automatically!</li>
                  </ol>
                </div>

                {/* Print Trigger Button */}
                <div className="pt-4 flex gap-3 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-3 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    Generate Printable Poster (Ctrl+P)
                  </button>
                  <button
                    onClick={() => setShowLargeQrPoster(false)}
                    className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
