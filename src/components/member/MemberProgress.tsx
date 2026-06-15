import React, { useState, useEffect } from "react";
import { Camera, Sliders, Calendar, Trash2, CheckCircle2, RefreshCw, BarChart2, Award, History, TrendingUp, Scale } from "lucide-react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { kgToLbs, lbsToKg, heightToCm, calculateBMI } from "../../utils/convert";

interface MemberProgressProps {
  onOpenPhotoModal: () => void;
  userPhoto?: string;
  memberId: string;
}

interface DBProgressLog {
  _id?: string;
  date: string;
  height: { feet: number; inches: number; cm?: number };
  weight: { kg: number; lbs?: number };
  bmi?: number;
}

const SEED_MOCK_LOGS: DBProgressLog[] = [
  {
    _id: "seed_1",
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    height: { feet: 5, inches: 9, cm: 175 },
    weight: { kg: 77.2, lbs: 170.2 },
    bmi: 25.2
  },
  {
    _id: "seed_2",
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    height: { feet: 5, inches: 9, cm: 175 },
    weight: { kg: 76.5, lbs: 168.6 },
    bmi: 25.0
  },
  {
    _id: "seed_3",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    height: { feet: 5, inches: 9, cm: 175 },
    weight: { kg: 75.8, lbs: 167.1 },
    bmi: 24.8
  },
  {
    _id: "seed_4",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    height: { feet: 5, inches: 9, cm: 175 },
    weight: { kg: 75.2, lbs: 165.7 },
    bmi: 24.6
  },
  {
    _id: "seed_5",
    date: new Date().toISOString(),
    height: { feet: 5, inches: 9, cm: 175 },
    weight: { kg: 74.8, lbs: 164.9 },
    bmi: 24.4
  }
];

export default function MemberProgress({ onOpenPhotoModal, userPhoto, memberId }: MemberProgressProps) {
  // Before / After portraits state
  const [beforePhoto, setBeforePhoto] = useState<string>("");
  const [afterPhoto, setAfterPhoto] = useState<string>("");

  // DB progress history logs (including weights, BMI, etc.)
  const [dbProgressLogs, setDbProgressLogs] = useState<DBProgressLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Weight Metric unit selection (kg or lbs)
  const [unit, setUnit] = useState<"kg" | "lbs">("lbs");

  // Input States (Auto conversion support)
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("9");
  const [kg, setKg] = useState("75");
  const [lbs, setLbs] = useState("165.3");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Body Measurements state
  const [measurements, setMeasurements] = useState([
    { date: "Jun 01", chest: 41.5, biceps: 15.2, waist: 32.8 },
    { date: "Jun 14", chest: 41.8, biceps: 15.4, waist: 32.2 }
  ]);
  const [chestInput, setChestInput] = useState("");
  const [bicepsInput, setBicepsInput] = useState("");
  const [waistInput, setWaistInput] = useState("");

  const fetchProgressLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await axios.get(`/api/progress/${memberId}`);
      if (res.data && res.data.success) {
        setDbProgressLogs(res.data.progress || []);
      }
    } catch (err: any) {
      console.warn("⚠️ Database progress lookups skipped, playing locally:", err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    // Restore states
    const savedBefore = localStorage.getItem("gym_progress_before");
    const savedAfter = localStorage.getItem("gym_progress_after");
    if (savedBefore) setBeforePhoto(savedBefore);
    if (savedAfter) setAfterPhoto(savedAfter);

    const savedMeas = localStorage.getItem("gym_measurements_history");
    if (savedMeas) {
      try { setMeasurements(JSON.parse(savedMeas)); } catch (e) {}
    } else {
      localStorage.setItem("gym_measurements_history", JSON.stringify(measurements));
    }

    // Load logs from MongoDB
    fetchProgressLogs();
  }, [memberId]);

  const handleKgChange = (value: string) => {
    setKg(value);
    const valNum = parseFloat(value);
    if (!isNaN(valNum)) {
      setLbs(kgToLbs(valNum).toString());
    } else {
      setLbs("");
    }
  };

  const handleLbsChange = (value: string) => {
    setLbs(value);
    const valNum = parseFloat(value);
    if (!isNaN(valNum)) {
      setKg(lbsToKg(valNum).toString());
    } else {
      setKg("");
    }
  };

  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");
    
    const feetNum = parseInt(feet);
    const inchesNum = parseInt(inches) || 0;
    const kgNum = parseFloat(kg);

    if (isNaN(feetNum) || feetNum <= 0 || isNaN(kgNum) || kgNum <= 0) {
      setSubmitError("Please enter valid height and weight values.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        memberId,
        gymId: "default-gym-id",
        height: { feet: feetNum, inches: inchesNum },
        weight: { kg: kgNum }
      };

      const res = await axios.post("/api/progress/add", payload);
      
      if (res.data && res.data.success) {
        setSubmitSuccess(`Progress logged successfully! Registered BMI: ${res.data.bmi}`);
        
        // Refresh items from API
        await fetchProgressLogs();

        // Update latest weight locally
        const resultingLbs = res.data.weight?.lbs || Math.round(kgNum * 2.20462);
        localStorage.setItem("gym_weight_latest", String(resultingLbs));
      } else {
        throw new Error("Unable to save tracking record");
      }
    } catch (err: any) {
      console.warn("API request failed, logging in offline fallback sandbox mode.");
      
      // FALLBACK: Simulate record saving
      const mockLbs = kgToLbs(kgNum);
      const heightInCm = heightToCm(feetNum, inchesNum);
      const calculatedBmi = calculateBMI(kgNum, heightInCm);

      const newMockLog: DBProgressLog = {
        _id: "offline_" + Date.now(),
        date: new Date().toISOString(),
        height: { feet: feetNum, inches: inchesNum, cm: heightInCm },
        weight: { kg: kgNum, lbs: mockLbs },
        bmi: calculatedBmi
      };

      setDbProgressLogs(prev => [newMockLog, ...prev]);
      setSubmitSuccess(`Stored progress locally! Estimated BMI: ${calculatedBmi}`);
      localStorage.setItem("gym_weight_latest", String(mockLbs));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMeasurements = (e: React.FormEvent) => {
    e.preventDefault();
    const ch = parseFloat(chestInput) || 41.5;
    const bi = parseFloat(bicepsInput) || 15.2;
    const wa = parseFloat(waistInput) || 32.8;

    const d = new Date();
    const dateStr = `${d.toLocaleString("default", { month: "short" })} ${String(d.getDate()).padStart(2, "0")}`;

    const newLog = {
      date: dateStr,
      chest: ch,
      biceps: bi,
      waist: wa
    };

    const updated = [...measurements, newLog];
    setMeasurements(updated);
    localStorage.setItem("gym_measurements_history", JSON.stringify(updated));

    setChestInput("");
    setBicepsInput("");
    setWaistInput("");
  };

  const handleDeleteMeasurement = (idx: number) => {
    const updated = measurements.filter((_, i) => i !== idx);
    setMeasurements(updated);
    localStorage.setItem("gym_measurements_history", JSON.stringify(updated));
  };

  // Upload Before/After photo triggers (Using HTML file upload or fallback camera portrait)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, position: "before" | "after") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (position === "before") {
        setBeforePhoto(base64);
        localStorage.setItem("gym_progress_before", base64);
      } else {
        setAfterPhoto(base64);
        localStorage.setItem("gym_progress_after", base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const activeLogs = dbProgressLogs.length > 0 ? dbProgressLogs : SEED_MOCK_LOGS;
  const latestLog = activeLogs[0];

  // Map progress logs to beautiful Recharts chart format (chronological order)
  const chartData = [...activeLogs].reverse().map((p) => {
    const weightVal = unit === "kg"
      ? (p.weight?.kg || Math.round((p.weight?.lbs || 0) / 2.20462 * 10) / 10)
      : (p.weight?.lbs || Math.round((p.weight?.kg || 0) * 2.20462 * 10) / 10);
    
    let labelDate = "Today";
    if (p.date) {
      const d = new Date(p.date);
      if (!isNaN(d.getTime())) {
        labelDate = `${d.getMonth() + 1}/${d.getDate()}`;
      }
    }

    return {
      date: labelDate,
      weight: weightVal,
      bmi: p.bmi || 24.5
    };
  });

  return (
    <div className="space-y-6 p-5 pb-24">
      
      {/* Title & Unit Toggler Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/80 border border-white/5 p-4 rounded-3xl backdrop-blur-md">
        <div>
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono block">Dynamic Analytics</span>
          <h1 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            📊 Biometric Progress
          </h1>
        </div>
        
        {/* Unit Toggle Button Pair */}
        <div className="flex items-center bg-slate-950 p-1 border border-white/10 rounded-2xl self-start sm:self-center">
          <button
            onClick={() => setUnit("kg")}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer ${
              unit === "kg"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            METRIC (KG)
          </button>
          <button
            onClick={() => setUnit("lbs")}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer ${
              unit === "lbs"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            IMPERIAL (LBS)
          </button>
        </div>
      </div>

      {/* Latest Stats Dashboard Grid */}
      {latestLog && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Scale className="h-3 w-3 text-indigo-400" /> Latest Weight
            </p>
            <p className="text-2xl font-black text-orange-400 mt-2 font-mono">
              {unit === "kg"
                ? (latestLog.weight?.kg || Math.round((latestLog.weight?.lbs || 0) / 2.20462 * 10) / 10)
                : (latestLog.weight?.lbs || Math.round((latestLog.weight?.kg || 0) * 2.20462 * 10) / 10)}{" "}
              <span className="text-xs text-slate-400 font-sans font-bold">{unit.toUpperCase()}</span>
            </p>
          </div>

          <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Award className="h-3 w-3 text-sky-400" /> Body Mass Index (BMI)
            </p>
            <p className="text-2xl font-black text-blue-400 mt-2 font-mono">
              {latestLog.bmi || 24.5}
            </p>
          </div>

          <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Sliders className="h-3 w-3 text-emerald-400" /> Height Indicator
            </p>
            <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
              {latestLog.height?.feet || 5}'{latestLog.height?.inches || 9}"
            </p>
          </div>

          <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-xl" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar className="h-3 w-3 text-pink-400" /> Last Synched
            </p>
            <p className="text-xs font-bold text-slate-300 mt-4 max-w-[150px] truncate">
              {latestLog.date ? new Date(latestLog.date).toLocaleDateString() : "Present"}
            </p>
          </div>
        </div>
      )}

      {/* Recharts Trajectory Line Chart Container */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div>
            <span className="text-[9px] text-pink-400 font-bold uppercase tracking-widest font-mono block">Real-time charts</span>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-indigo-400" /> Weight Loss Trend
            </h3>
          </div>
          <span className="text-[9.5px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 py-0.5 px-2 rounded-lg font-bold">
            Target Active
          </span>
        </div>

        {/* Dynamic responsive recharts container */}
        <div className="w-full h-[260px] bg-slate-950/40 rounded-2xl p-2 border border-white/10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} fontWeight="bold" />
              <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#090d16", 
                  borderColor: "#334155",
                  borderRadius: "16px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#f8fafc" 
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#f97316" 
                strokeWidth={3} 
                dot={{ fill: "#f97316", r: 4 }}
                activeDot={{ r: 6, fill: "#3b82f6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History table view as requested */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest block">Logged History</span>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <History className="h-4 w-4 text-indigo-400" /> Database History Logs
            </h3>
          </div>
          {dbProgressLogs.length === 0 && (
            <span className="text-[9px] font-mono text-amber-500 bg-amber-950/40 border border-amber-500/20 py-0.5 px-2 rounded font-bold">
              Using seed presets
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-xs font-mono">
            <thead className="bg-slate-950/60 text-slate-400 font-sans border-b border-white/10">
              <tr>
                <th className="text-left p-3">Date Logged</th>
                <th className="text-left p-3">Scale Weight</th>
                <th className="text-left p-3">Stored Height</th>
                <th className="text-left p-3">BMI Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-slate-900/40">
              {activeLogs.map((p, idx) => {
                const weightVal = unit === "kg"
                  ? (p.weight?.kg || Math.round((p.weight?.lbs || 0) / 2.20462 * 10) / 10)
                  : (p.weight?.lbs || Math.round((p.weight?.kg || 0) * 2.20462 * 10) / 10);
                
                return (
                  <tr key={p._id || idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 text-slate-300 font-sans">
                      {p.date ? new Date(p.date).toLocaleDateString() : "Recent"}
                    </td>
                    <td className="p-3 text-orange-400 font-black">
                      {weightVal} {unit.toUpperCase()}
                    </td>
                    <td className="p-3 text-emerald-400">
                      {p.height?.feet || 5}'{p.height?.inches || 9}"
                    </td>
                    <td className="p-3 text-blue-400 font-black">
                      {p.bmi || "24.5"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Save Progress Module (User's request inputs) */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/20 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[9px] text-pink-400 font-bold uppercase tracking-widest block font-mono">Biometric Syncing</span>
            <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-indigo-400" /> Log Weight & Height
            </h3>
          </div>
          <button 
            type="button" 
            onClick={fetchProgressLogs}
            disabled={loadingLogs}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh logs from Atlas"
          >
            <RefreshCw className={`h-3 w-3 ${loadingLogs ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>

        <form onSubmit={handleSaveProgress} className="space-y-4">
          
          {/* Height Row Fields */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Height Inches</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <label className="text-[9px] text-slate-500 block font-sans">Feet</label>
                <input
                  type="number"
                  required
                  min="2"
                  max="8"
                  value={feet}
                  onChange={(e) => setFeet(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-mono text-center outline-none focus:border-indigo-500"
                  placeholder="Feet"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[9px] text-slate-500 block font-sans">Inches</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="11"
                  value={inches}
                  onChange={(e) => setInches(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-mono text-center outline-none focus:border-indigo-505"
                  placeholder="Inches"
                />
              </div>
            </div>
          </div>

          {/* Weight Row (Auto calculation dual-inputs) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-left">Weight (KG)</span>
              <input
                type="number"
                step="0.1"
                required
                value={kg}
                onChange={(e) => handleKgChange(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-mono text-center outline-none focus:border-indigo-500"
                placeholder="75"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-left">Weight (LBS)</span>
              <input
                type="number"
                step="0.1"
                required
                value={lbs}
                onChange={(e) => handleLbsChange(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-mono text-center outline-none focus:border-indigo-500"
                placeholder="165"
              />
            </div>
          </div>

          {/* Alert messages feedback */}
          {submitError && (
            <div className="bg-red-950/40 border border-red-500/20 text-red-300 text-xs py-2 px-3 rounded-xl text-center font-sans">
              ⚠️ {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 font-sans">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> {submitSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 disabled:text-slate-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg active:scale-98 text-center flex items-center justify-center gap-1 font-sans"
          >
            {isSubmitting ? "Uploading To Database..." : "Save Progress Log"}
          </button>
        </form>
      </div>

      {/* Before vs After Side-by-Side Compare layout */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow-lg space-y-4">
        <div>
          <span className="text-[9px] text-pink-400 font-bold uppercase tracking-widest block font-mono">Physique Log</span>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Before & After Physique</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Before Column */}
          <div className="space-y-2 text-center text-xs">
            <span className="text-[9.5px] font-mono text-slate-400 font-black uppercase">Before Pass</span>
            <div className="aspect-square bg-slate-950 rounded-2xl border border-white/10 overflow-hidden flex flex-col items-center justify-center relative group">
              {beforePhoto ? (
                <>
                  <img src={beforePhoto} alt="Physique before" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button
                    onClick={() => { setBeforePhoto(""); localStorage.removeItem("gym_progress_before"); }}
                    className="absolute top-2 right-2 p-1 text-[9px] bg-red-650 hover:bg-red-750 text-white rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Reset
                  </button>
                </>
              ) : (
                <label className="p-3 text-center flex flex-col items-center gap-1.5 cursor-pointer text-slate-500 hover:text-slate-400 transition-colors">
                  <Camera className="h-5 w-5 text-indigo-500/60" />
                  <span className="text-[10px] font-bold font-sans">Choose Before Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, "before")}
                    className="absolute w-0 h-0 opacity-0"
                  />
                </label>
              )}
            </div>
          </div>

          {/* After Column */}
          <div className="space-y-2 text-center text-xs">
            <span className="text-[9.5px] font-mono text-indigo-400 font-black uppercase">Active After</span>
            <div className="aspect-square bg-slate-950 rounded-2xl border border-white/10 overflow-hidden flex flex-col items-center justify-center relative group">
              {afterPhoto ? (
                <>
                  <img src={afterPhoto} alt="Physique after" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button
                    onClick={() => { setAfterPhoto(""); localStorage.removeItem("gym_progress_after"); }}
                    className="absolute top-2 right-2 p-1 text-[9px] bg-red-650 hover:bg-red-750 text-white rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Reset
                  </button>
                </>
              ) : (
                <label className="p-3 text-center flex flex-col items-center gap-1.5 cursor-pointer text-slate-500 hover:text-slate-400 transition-colors">
                  <Camera className="h-5 w-5 text-indigo-500/60 pointer-events-none" />
                  <span className="text-[10px] font-bold font-sans">Choose After Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, "after")}
                    className="absolute w-0 h-0 opacity-0"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <p className="text-[9.5px] text-slate-500 text-center leading-normal font-sans">
          🔒 Physique portraits are stored locally on your device for security.
        </p>
      </div>

      {/* Body Measurements tape logs */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow-lg space-y-4">
        <div>
          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest block font-sans">Body Outlining</span>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Circumference Specs (inches)</h3>
        </div>

        {/* Form add measurements */}
        <form onSubmit={handleAddMeasurements} className="grid grid-cols-4 gap-2 items-end">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center block">Chest</label>
            <input
              type="number"
              step="0.1"
              placeholder="in"
              value={chestInput}
              onChange={(e) => setChestInput(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 text-white font-mono text-center text-xs py-1.5 rounded-xl focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center block">Biceps</label>
            <input
              type="number"
              step="0.1"
              placeholder="in"
              value={bicepsInput}
              onChange={(e) => setBicepsInput(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 text-white font-mono text-center text-xs py-1.5 rounded-xl focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center block">Waist</label>
            <input
              type="number"
              step="0.1"
              placeholder="in"
              value={waistInput}
              onChange={(e) => setWaistInput(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 text-white font-mono text-center text-xs py-1.5 rounded-xl focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase py-2 rounded-xl transition-all cursor-pointer shadow active:scale-95 text-center font-sans"
          >
            Save
          </button>
        </form>

        {/* Measurements logs list */}
        <div className="divide-y divide-white/5 font-mono text-xs text-slate-300">
          {measurements.map((m, idx) => (
            <div key={idx} className="flex justify-between py-2 items-center">
              <span className="font-sans font-extrabold text-slate-400 bg-slate-950 py-0.5 px-2 rounded">{m.date}</span>
              <div className="flex gap-4">
                <span>Chest: <strong className="text-white">{m.chest}"</strong></span>
                <span>Biceps: <strong className="text-white">{m.biceps}"</strong></span>
                <span>Waist: <strong className="text-white">{m.waist}"</strong></span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteMeasurement(idx)}
                className="p-1 hover:bg-slate-800 text-slate-500 hover:text-red-400 border border-transparent rounded cursor-pointer font-sans"
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
