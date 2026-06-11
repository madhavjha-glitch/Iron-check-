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
  ListFilter,
  Check,
  Send,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
} from "lucide-react";
import { MemberProfile, AttendanceLog, ExerciseRoutine, Exercise } from "../types";
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
  subscribeToAdminsList,
  addAdminEmail,
  removeAdminEmail,
} from "../firebase";

interface AdminPanelProps {
  adminEmail: string;
  onLogout: () => void;
}

export default function AdminPanel({ adminEmail, onLogout }: AdminPanelProps) {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [routines, setRoutines] = useState<ExerciseRoutine[]>([]);

  // Multi-Admin management states
  const [adminsList, setAdminsList] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [feeFilter, setFeeFilter] = useState<"all" | "paid" | "unpaid">("all");

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
        // High-pitched double beep (sequential timing)
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
        // Low failure warning buzz
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

    // Simulate standard card reader scanner sweep duration
    await new Promise((res) => setTimeout(res, 1200));

    try {
      let targetUid = "";
      if (scanInput.startsWith("ironstone_checkin_")) {
        targetUid = scanInput.substring("ironstone_checkin_".length);
      } else {
        targetUid = scanInput;
      }

      // Find member by ID or by exact email string
      const matchedMember = members.find(
        (m) => m.uid === targetUid || m.email.toLowerCase() === targetUid.toLowerCase()
      );

      if (!matchedMember) {
        throw new Error("ACCESS REFUSED: Invalid QR symbology or unregistered token identifier.");
      }

      // Log the check-in to Firestore / local fallbacks
      await logDailyCheckIn(matchedMember.uid, matchedMember.name);

      setQrScanState("success");
      setScannedMemberDetails(matchedMember);
      
      const isFeeUnpaid = matchedMember.feeStatus === "unpaid";
      if (isFeeUnpaid) {
        setQrScanFeedback("ACCESS GRANTED (GRACE ACTIVE)! Active Arrears: Monthly premium overdue.");
      } else {
        setQrScanFeedback("ACCESS GRANTED! Welcome back to Nexus Gym.");
      }
      playScanSound(true);
    } catch (err: any) {
      setQrScanState("error");
      setQrScanFeedback(err.message || "Failed decoding QR.");
      playScanSound(false);
    }
  };

  // Subscribe to central collections real-time
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

    return () => {
      unsubMembers();
      unsubAttendance();
      unsubRoutines();
      unsubAdmins();
    };
  }, []);

  // Handlers for dynamic administrators
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

  // One-click fee toggle dispatch
  const handleToggleFeeStatus = async (uid: string, currentStatus: "paid" | "unpaid") => {
    const nextStatus = currentStatus === "paid" ? "unpaid" : "paid";
    try {
      await setMemberFeeStatus(uid, nextStatus);
    } catch (err) {
      console.error(err);
    }
  };

  // Triggers automated fee check across all profiles
  const handleAutomatedScannerRun = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      // Small visual delay to show state calculations
      await new Promise((res) => setTimeout(res, 1200));
      const alertsSentCount = await executeDynamicMembershipFeeCheck(members);
      setScanResult(`Scan Completed! Verified database profiles and dispatched ${alertsSentCount} due membership notifications.`);
    } catch (err: any) {
      setScanResult(`Scan Error: ${err.message || err}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Dispatch custom push-alert manually
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

  // Routine Planner helper functions
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

  // Filtered members list computation
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
  const simulatedActiveRevenue = members.filter((m) => m.feeStatus === "paid").length * 45;

  return (
    <div className="flex-1 flex flex-col bg-blue-700 pb-8 text-black">
      {/* Admin Title Dashboard Header */}
      <div className="px-6 pt-5 pb-4 bg-blue-800 flex justify-between items-center border-b border-blue-700/60 shadow-xs shrink-0">
        <div>
          <span className="text-[10px] font-bold text-blue-200 tracking-wider uppercase">
            Gym Administrator Control Center
          </span>
          <h2 className="text-xl font-bold text-black tracking-tight">
            Gym Owner Console ⚙️
          </h2>
        </div>
        <button
          onClick={onLogout}
          className="p-2 cursor-pointer bg-blue-900 hover:bg-rose-900 text-blue-200 hover:text-white border border-blue-700 hover:border-transparent rounded-xl transition-all"
          title="Sign Out Admin"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 space-y-5 mt-4">
        {/* KPI Stats Panel (Bento row) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Members statistic card */}
          <div className="bg-white border border-slate-205 border-slate-200 p-3.5 rounded-2xl relative overflow-hidden shadow-2xs">
            <div className="absolute right-2 bottom-1 opacity-[0.05] text-slate-900">
              <Users className="w-12 h-12" />
            </div>
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Total Members</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{totalGymUsersCount}</p>
            <p className="text-[9px] text-slate-505 text-slate-500 mt-0.5">Enrolled customer profiles</p>
          </div>

          {/* Attendance statistic card */}
          <div className="bg-white border border-slate-205 border-slate-200 p-3.5 rounded-2xl relative overflow-hidden shadow-2xs">
            <div className="absolute right-2 bottom-1 opacity-[0.05] text-slate-900">
              <CheckCircle className="w-12 h-12" />
            </div>
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Active Today</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-1">{checkedInCount}</p>
            <p className="text-[9px] text-emerald-600/85 mt-0.5">Checked-in today</p>
          </div>

          {/* Arrears statistic card */}
          <div className="bg-white border border-slate-205 border-slate-200 p-3.5 rounded-2xl relative overflow-hidden shadow-2xs">
            <div className="absolute right-2 bottom-1 opacity-[0.05] text-slate-900">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Unpaid Dues</p>
            <p className="text-xl font-extrabold text-rose-600 mt-1">{unpaidDuesCount}</p>
            <p className="text-[9px] text-slate-500 mt-0.5">{unpaidDuesCount} pending invoices</p>
          </div>

          {/* Revenue statistic card */}
          <div className="bg-white border border-slate-205 border-slate-200 p-3.5 rounded-2xl relative overflow-hidden shadow-2xs">
            <div className="absolute right-2 bottom-1 opacity-[0.05] text-slate-900">
              <DollarSign className="w-12 h-12" />
            </div>
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Collections</p>
            <p className="text-xl font-extrabold text-indigo-600 mt-1">${simulatedActiveRevenue}</p>
            <p className="text-[9px] text-slate-500 mt-0.5">$45/mo active billing</p>
          </div>
        </div>

        {/* Dynamic Dates Checker Trigger */}
        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </span>
            <span className="text-xs font-bold text-slate-800">Automated Fee Reminders Engine</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
            Runs an automated background check evaluating due date milestones across all members. Individuals with unpaid status or within 3 days of expiration will receive a custom real-time fee warning.
          </p>

          <button
            onClick={handleAutomatedScannerRun}
            disabled={isScanning}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs hover:shadow active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <BellRing className="w-4 h-4 shrink-0" />
            {isScanning ? "Evaluating Membership Timestamps..." : "Run Automated Fee Scanner"}
          </button>

          {scanResult && (
            <div className="mt-2.5 p-2 bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-900 rounded-lg text-center font-medium animate-fade-in">
              {scanResult}
            </div>
          )}
        </div>

        {/* Manage Administrators Panel */}
        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
              <KeyRound className="w-4 h-4" />
            </span>
            <div className="flex-1">
              <span className="text-xs font-bold text-slate-800 block">Manage Administrators</span>
              <span className="text-[9px] text-slate-400 font-medium block">Authorize secondary gym managers and owners</span>
            </div>
          </div>

          <form onSubmit={handleAddAdminSubmit} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Manager Email (e.g. co-owner@gmail.com)"
                value={newAdminEmail}
                onChange={(e) => {
                  setNewAdminEmail(e.target.value);
                  setAdminError("");
                  setAdminSuccess(false);
                }}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-805 placeholder-slate-404 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="submit"
                disabled={addingAdmin}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {adminError && (
              <p className="text-[10px] text-red-500 flex items-center gap-1 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" />
                {adminError}
              </p>
            )}

            {adminSuccess && (
              <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrator authorized successfully!
              </p>
            )}
          </form>

          <div className="border-t border-slate-100 pt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Authorized Owners & Staff ({adminsList.length})
            </span>
            
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {adminsList.map((email) => {
                const isMaster = email === "madhavjha514@gmail.com";
                return (
                  <div
                    key={email}
                    className="p-2 bg-slate-50 border border-slate-200/60 rounded-xl flex justify-between items-center text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isMaster ? 'bg-amber-500' : 'bg-indigo-600'}`}></div>
                      <span className="font-mono text-slate-700">{email}</span>
                      {isMaster && (
                        <span className="text-[9px] bg-amber-50 text-amber-500 border border-amber-200/50 px-1.5 py-0.2 rounded-md font-extrabold uppercase">
                          Founder
                        </span>
                      )}
                    </div>
                    {!isMaster && (
                      <button
                        onClick={() => handleRemoveAdminAction(email)}
                        className="p-1 cursor-pointer hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg text-slate-400 hover:text-rose-600 transition-all"
                        title="Revoke Admin Access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Front Desk QR scanner simulator terminal */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-slate-900 text-indigo-400">
                <QrCode className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Front Desk QR Scan Terminal</h3>
                <span className="text-[9px] text-slate-400 font-medium">Simulate direct customer biometric entry scanning</span>
              </div>
            </div>
            {/* POWER INDICATOR LEDS */}
            <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ACTIVE
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${qrScanState === "scanning" ? "bg-amber-500 animate-ping" : "bg-slate-300"}`}></span>
                SCANNING
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${qrScanState === "success" ? "bg-emerald-500" : qrScanState === "error" ? "bg-rose-500" : "bg-slate-300"}`}></span>
                COMM
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dropdown controls & Manual scan mode */}
            <div className="space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Select Member QR Code
                  </label>
                  <select
                    value={selectedScanUid}
                    onChange={(e) => {
                      setSelectedScanUid(e.target.value);
                      setCustomScanData(""); // Reset custom block if selecting member
                      setQrScanState("idle");
                    }}
                    disabled={qrScanState === "scanning"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs py-2 px-3 text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Member Profile --</option>
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.name} ({m.feeStatus === "paid" ? "Paid" : "Overdue"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Or Scanned Raw Token Data
                    </label>
                    <span className="text-[8px] text-slate-400 font-mono">Simulates physical reader keyboard output</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. ironstone_checkin_user_cust1"
                    value={customScanData}
                    onChange={(e) => {
                      setCustomScanData(e.target.value);
                      setSelectedScanUid(""); // Reset select
                      setQrScanState("idle");
                    }}
                    disabled={qrScanState === "scanning"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSimulateQrScanAction}
                disabled={qrScanState === "scanning"}
                className={`w-full h-11 transition-all rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-sm cursor-pointer ${
                  qrScanState === "scanning"
                    ? "bg-slate-100 text-slate-400"
                    : "bg-slate-900 hover:bg-slate-850 text-white"
                }`}
              >
                <QrCode className="w-4 h-4 text-indigo-400" />
                {qrScanState === "scanning" ? "Biometric Laser Verification..." : "Fire Scanning Laser Beam"}
              </button>
            </div>

            {/* Virtual Physical Scan Reader Viewport */}
            <div className="bg-slate-950 border-4 border-slate-900 rounded-2xl p-4 flex flex-col justify-between items-center min-h-[200px] relative overflow-hidden shadow-inner font-mono text-center select-none">
              {/* Animated scanning laser line */}
              {qrScanState === "scanning" && (
                <div className="absolute left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_#10b981] animate-bounce z-10"></div>
              )}

              {/* Grid backdrop */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.3)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40"></div>

              {/* Viewport content */}
              <div className="w-full flex-1 flex flex-col items-center justify-center py-2 z-10">
                {qrScanState === "idle" && (
                  <div className="space-y-2">
                    <QrCode className="w-12 h-12 text-slate-800 mx-auto animate-pulse" />
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">PROXIMITY READER READY</p>
                  </div>
                )}

                {qrScanState === "scanning" && (
                  <div className="space-y-2 animate-pulse">
                    <QrCode className="w-12 h-12 text-indigo-500/80 mx-auto" />
                    <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold">DECODING SWEEP SYSTEM...</p>
                  </div>
                )}

                {qrScanState === "success" && scannedMemberDetails && (
                  <div className="space-y-1.5 w-full">
                    <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] uppercase font-bold tracking-widest font-sans">
                      ACCESS GRANTED
                    </span>
                    <p className="text-sm font-bold text-white mt-1 uppercase truncate font-sans">{scannedMemberDetails.name}</p>
                    <p className="text-[9px] text-slate-400 truncate leading-normal">EMAIL: {scannedMemberDetails.email}</p>
                    <div className="grid grid-cols-2 gap-1 text-[8px] pt-1.5 max-w-xs mx-auto text-left border-t border-slate-905 border-slate-800 text-slate-500">
                      <div>
                        STATUS:{" "}
                        <span className="text-emerald-400 font-bold uppercase font-sans">
                          {scannedMemberDetails.membershipStatus}
                        </span>
                      </div>
                      <div>
                        FEE:{" "}
                        <span className={scannedMemberDetails.feeStatus === "paid" ? "text-emerald-400 font-bold uppercase font-sans" : "text-amber-500 font-bold uppercase font-sans animate-pulse"}>
                          {scannedMemberDetails.feeStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {qrScanState === "error" && (
                  <div className="space-y-1.5 w-full">
                    <span className="inline-block px-2.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] uppercase font-bold tracking-widest font-sans">
                      ACCESS REFUSED
                    </span>
                    <p className="text-[10px] text-rose-400/95 font-semibold mt-1 tracking-wider leading-relaxed px-1">
                      {qrScanFeedback}
                    </p>
                  </div>
                )}
              </div>

              {/* Scanner Screen logs line */}
              <div className="w-full text-center border-t border-slate-905 border-slate-800 pt-2 z-10">
                <span className="text-[8px] text-indigo-400/80 tracking-wide font-mono block truncate">
                  {qrScanState === "idle" && ">> STANDBY LOCK"}
                  {qrScanState === "scanning" && ">> OPTICAL DECODING IN PROGRESS..."}
                  {qrScanState === "success" && `>> ATTENDANCE COMMITTED FOR ${scannedMemberDetails?.name.split(" ")[0].toUpperCase()}`}
                  {qrScanState === "error" && `>> SYSTEM EXCEPTION CODE 401`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Member Directory */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-sans">
              <Users className="w-4.5 h-4.5 text-indigo-600" />
              Member Directory ({filteredMembers.length})
            </h3>

            {/* Segment switch buttons */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              {(["all", "paid", "unpaid"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFeeFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    feeFilter === tab
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Find Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search member profiles by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-9 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Members cards feed */}
          <div className="space-y-2.5">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const isUnpaid = member.feeStatus === "unpaid";
                const isExpired = new Date(member.feeDueDate).getTime() < Date.now();

                return (
                  <div
                    key={member.uid}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 space-y-3 shadow-2xs relative transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Member Thumbnail Avatar */}
                        {member.photoUrl ? (
                          <img
                            src={member.photoUrl}
                            alt="Member Photo"
                            className="w-10 h-10 rounded-full object-cover border border-slate-100 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-extrabold flex items-center justify-center text-xs shrink-0 select-none">
                            {member.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 leading-snug truncate">
                            {member.name}
                          </p>
                          <p className="text-[10px] text-slate-400 leading-normal truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase px-2.5 py-0.5 border rounded-full ${
                          member.feeStatus === "paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                        }`}
                      >
                        {member.feeStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-b border-slate-100 py-2 bg-slate-50/50 rounded-lg px-2">
                      <div>
                        <span className="text-slate-400 block leading-relaxed">Member Since</span>
                        <span className="text-slate-700 font-semibold">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block leading-relaxed">Dues End Date</span>
                        <span className={`font-semibold ${isExpired && isUnpaid ? "text-rose-600" : "text-slate-700"}`}>
                          {new Date(member.feeDueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Operational Action Buttons: 1-Click Fee mark, Send reminder */}
                    <div className="flex gap-2">
                       <button
                        onClick={() => handleToggleFeeStatus(member.uid, member.feeStatus)}
                        className={`flex-1 font-bold py-1.5 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                          member.feeStatus === "paid"
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        }`}
                        title="Toggle Fee Invoice State"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {member.feeStatus === "paid" ? "Unpay Invoice" : "Mark as Paid"}
                      </button>

                      <button
                        onClick={() => {
                          setActiveNotifyMember(member);
                          setCustomTitle("📅 Gym Membership Due Reminder");
                          setCustomBody("Friendly notice from management: monthly dues are pending soon. Please complete payment.");
                        }}
                        className="p-1 px-[10px] cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-800 border border-slate-200 rounded-xl transition-all"
                        title="Send custom alerts direct"
                      >
                        <Send className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-slate-500 py-6 border border-dashed border-slate-200 rounded-2xl">
                No active gym members found matching criteria.
              </p>
            )}
          </div>
        </div>

        {/* Custom manual dispatch pop-box */}
        {activeNotifyMember && (
          <div className="bg-white border border-indigo-200 p-4.5 rounded-2xl space-y-3 shadow-lg z-25 relative">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Compose custom card to {activeNotifyMember.name.split(" ")[0]}
              </p>
              <button
                onClick={() => setActiveNotifyMember(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSendManualAlert} className="space-y-2.5">
              <input
                type="text"
                placeholder="Message Heading / Title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
              <textarea
                placeholder="Alert text message context..."
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                required
              />

              {alertSuccess && (
                <p className="text-[10px] text-emerald-600 font-semibold">
                  Notification pushed securely!
                </p>
              )}

              <button
                type="submit"
                disabled={sendingAlert}
                className="w-full bg-indigo-600 text-white font-bold py-2 px-3 text-xs rounded-xl hover:bg-indigo-700 transition-all cursor-pointer"
              >
                {sendingAlert ? "Pushing Alert..." : "Dispatch Push Alert"}
              </button>
            </form>
          </div>
        )}

        {/* Live Attendance Feeds */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <QrCode className="w-4.5 h-4.5 text-indigo-600" />
              Check-In Logs Audit ({attendance.length})
            </h3>
            <span className="text-[9px] font-bold text-slate-400 uppercase">
              Chronological Feed
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 max-h-[220px] overflow-y-auto space-y-2">
            {attendance.length > 0 ? (
              attendance.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex justify-between items-center text-[11px]"
                >
                  <div>
                    <span className="font-semibold text-slate-805 text-slate-800 block">{log.userName}</span>
                    <span className="text-slate-400 font-mono text-[9px] mt-0.5 inline-block">ID: {log.userId.substring(0,8).toUpperCase()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-indigo-600 font-semibold font-mono block">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className="text-[9px] text-slate-400">{log.dateString}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-slate-400 py-6">
                No gym check-ins captured today yet.
              </p>
            )}
          </div>
        </div>

        {/* Exercises Routine Planner (BONUS CRUD feature) */}
        <div className="space-y-3 pb-8">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-sans">
              <Dumbbell className="w-4.5 h-4.5 text-indigo-600" />
              Workout Planner Base
            </h3>
            <button
              onClick={() => {
                setShowRoutineEditor(!showRoutineEditor);
                setEditingTitle("");
                setEditingExercises([{ name: "", sets: 3, reps: "10 reps", videoUrl: "" }]);
              }}
              className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold transition-all text-xs rounded-xl flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Routine
            </button>
          </div>

          {/* Routine Creation Subarea */}
          {showRoutineEditor && (
            <div className="bg-white border border-slate-205 border-slate-200 p-4.5 rounded-2xl space-y-3.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                  Create/Edit Workout Plan
                </span>
                <button
                  type="button"
                  onClick={() => setShowRoutineEditor(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Target Schedule Day
                    </label>
                    <select
                      value={editingDay}
                      onChange={(e) => setEditingDay(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-2.5 text-slate-850 active:outline-none"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Friday">Friday</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Workout Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Iron Chest & Triceps"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-2.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Exercises Program</span>
                    <button
                      type="button"
                      onClick={handleAddExerciseRow}
                      className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      + Add Exercise
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {editingExercises.map((ex, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative space-y-2">
                        {editingExercises.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExerciseRow(idx)}
                            className="absolute right-2 top-2 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <input
                          type="text"
                          placeholder="Exercise Name (e.g. Leg Extension)"
                          value={ex.name}
                          onChange={(e) => handleUpdateExerciseField(idx, "name", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg text-xs py-1 px-2.5 text-slate-800"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            placeholder="Sets (e.g. 4)"
                            value={ex.sets || ""}
                            onChange={(e) => handleUpdateExerciseField(idx, "sets", parseInt(e.target.value) || 0)}
                            className="bg-white border border-slate-200 rounded-lg text-xs py-1 px-2.5 text-slate-800 text-[11px]"
                          />
                          <input
                            type="text"
                            placeholder="Reps (e.g. 8-12)"
                            value={ex.reps}
                            onChange={(e) => handleUpdateExerciseField(idx, "reps", e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg text-xs py-1 px-2.5 text-slate-805 text-slate-800 text-[11px]"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Video URL (YouTube Embed Link)"
                          value={ex.videoUrl}
                          onChange={(e) => handleUpdateExerciseField(idx, "videoUrl", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg text-[9px] py-1 px-2 text-slate-500 font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateOrUpdateRoutine}
                  className="w-full bg-indigo-600 text-white font-bold text-xs py-2.5 rounded-xl hover:bg-indigo-700 transition-all cursor-pointer shadow-2xs"
                >
                  Save Workout Routine
                </button>
              </div>
            </div>
          )}

          {/* Current gym routines index */}
          <div className="space-y-2">
            {routines.map((rt) => (
              <div
                key={rt.id}
                className="bg-white border border-slate-200 p-4 rounded-2xl flex justify-between items-center shadow-2xs transition-all hover:bg-slate-50/40"
              >
                <div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {rt.day}
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-2">{rt.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {rt.exercises ? rt.exercises.length : 0} exercises added
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteRoutine(rt.id)}
                  className="p-2 cursor-pointer bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-220 rounded-xl transition-all"
                  title="Remove Routine program"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
