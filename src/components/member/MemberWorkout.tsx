import React, { useState, useEffect } from "react";
import { Dumbbell, History, Trophy, Clock, Check, ChevronDown, ChevronUp, Plus, Trash2, Award, Zap } from "lucide-react";
import { ExerciseRoutine, Exercise } from "../../types";

interface MemberWorkoutProps {
  routines?: ExerciseRoutine[];
}

export default function MemberWorkout({ routines = [] }: MemberWorkoutProps) {
  const [selectedDay, setSelectedDay] = useState<string>("Monday");
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  
  // Interactive Live Workout logger state
  const [activeSessionLogs, setActiveSessionLogs] = useState<{
    [exerciseIndex: number]: Array<{ reps: string; weight: string; completed: boolean }>;
  }>({});
  const [sessionNotes, setSessionNotes] = useState("");
  const [energyRating, setEnergyRating] = useState<"🔥 High" | "⚡ Medium" | "🥱 Low">("🔥 High");
  const [workoutHistory, setWorkoutHistory] = useState<Array<any>>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Heavy Lift PRs State
  const [personalRecords, setPersonalRecords] = useState({
    squat: "315 lbs",
    bench: "225 lbs",
    deadlift: "405 lbs"
  });
  const [showPrModal, setShowPrModal] = useState(false);
  const [tempPR, setTempPR] = useState({ squat: "", bench: "", deadlift: "" });

  // Get active routines matching the day
  const defaultRoutines: ExerciseRoutine[] = [
    {
      id: "r1",
      day: "Monday",
      title: "Push Day (Chest, Shoulders & Triceps)",
      exercises: [
        { name: "Incline Dumbbell Bench Press", sets: 4, reps: "8-12 reps", videoUrl: "https://www.youtube.com/embed/8iPZq_GQ7Cw" },
        { name: "Overhead Barbell Military Press", sets: 3, reps: "10 reps", videoUrl: "https://www.youtube.com/embed/2yjwHeFTo2I" },
        { name: "Tricep Overhead Cable Extensions", sets: 4, reps: "12 reps", videoUrl: "https://www.youtube.com/embed/X-eHInT6D6A" },
      ],
    },
    {
      id: "r2",
      day: "Wednesday",
      title: "Pull Day (Back & Biceps)",
      exercises: [
        { name: "Wide-Grip Lat Pulldowns", sets: 4, reps: "10-12 reps", videoUrl: "https://www.youtube.com/embed/CAwf7n6Luuc" },
        { name: "Bent-Over Barbell Rows", sets: 3, reps: "8 reps", videoUrl: "https://www.youtube.com/embed/9efgcAjQe7E" },
        { name: "Hammer Dumbbell Bicep Curls", sets: 4, reps: "12 reps", videoUrl: "https://www.youtube.com/embed/zC3nLlEvin4" },
      ],
    },
    {
      id: "r3",
      day: "Friday",
      title: "Leg Day & Abs Core",
      exercises: [
        { name: "Barbell Back Squats", sets: 4, reps: "8-10 reps", videoUrl: "https://www.youtube.com/embed/Uv_yQv_PMes" },
        { name: "Romanian Dumbbell Deadlifts", sets: 3, reps: "12 reps", videoUrl: "https://www.youtube.com/embed/jZf62_R7T3s" },
        { name: "Hanging Leg Raises", sets: 4, reps: "15 reps", videoUrl: "https://www.youtube.com/embed/hdgR2gMKNoQ" },
      ],
    },
  ];

  const mergedRoutines = routines.length > 0 ? routines : defaultRoutines;
  const currentProgram = mergedRoutines.find(r => r.day.toLowerCase() === selectedDay.toLowerCase());

  // Load history & PRs
  useEffect(() => {
    const hist = localStorage.getItem("gym_workout_history");
    if (hist) {
      try { setWorkoutHistory(JSON.parse(hist)); } catch (e) {}
    } else {
      // Seed some mock workouts
      const mockHist = [
        {
          id: "hist_1",
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toDateString(),
          routineTitle: "Push Day (Chest, Shoulders & Triceps)",
          exercises: ["Incline Dumbbell Bench Press", "Overhead Barbell Military Press"],
          energy: "🔥 High",
          notes: "Felt strong today on bench. Hit 10 reps easily."
        },
        {
          id: "hist_2",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toDateString(),
          routineTitle: "Pull Day (Back & Biceps)",
          exercises: ["Wide-Grip Lat Pulldowns", "Bent-Over Barbell Rows", "Hammer Dumbbell Bicep Curls"],
          energy: "⚡ Medium",
          notes: "Focusing on squeezing lats at bottom."
        }
      ];
      localStorage.setItem("gym_workout_history", JSON.stringify(mockHist));
      setWorkoutHistory(mockHist);
    }

    const prs = localStorage.getItem("gym_personal_records");
    if (prs) {
      try { setPersonalRecords(JSON.parse(prs)); } catch (e) {}
    } else {
      localStorage.setItem("gym_personal_records", JSON.stringify(personalRecords));
    }
  }, []);

  // Initialize interactive logs whenever routine/day changes
  useEffect(() => {
    if (currentProgram) {
      const logsInit: any = {};
      currentProgram.exercises.forEach((ex, idx) => {
        logsInit[idx] = Array.from({ length: ex.sets }).map(() => ({
          reps: ex.reps.split(" ")[0] || "10",
          weight: "135",
          completed: false
        }));
      });
      setActiveSessionLogs(logsInit);
    }
    setSessionNotes("");
  }, [selectedDay, currentProgram]);

  const handleToggleSetCompleted = (exerciseIdx: number, setIdx: number) => {
    setActiveSessionLogs(prev => {
      const currentExSets = [...(prev[exerciseIdx] || [])];
      if (currentExSets[setIdx]) {
        currentExSets[setIdx] = {
          ...currentExSets[setIdx],
          completed: !currentExSets[setIdx].completed
        };
      }
      return { ...prev, [exerciseIdx]: currentExSets };
    });
  };

  const handleInputChange = (exerciseIdx: number, setIdx: number, field: "reps" | "weight", value: string) => {
    setActiveSessionLogs(prev => {
      const currentExSets = [...(prev[exerciseIdx] || [])];
      if (currentExSets[setIdx]) {
        currentExSets[setIdx] = {
          ...currentExSets[setIdx],
          [field]: value
        };
      }
      return { ...prev, [exerciseIdx]: currentExSets };
    });
  };

  const handleSaveWorkoutSession = () => {
    if (!currentProgram) return;

    // Check completed exercises
    const loggedExercisesArr: string[] = [];
    currentProgram.exercises.forEach((ex, idx) => {
      const sets = activeSessionLogs[idx] || [];
      const hasCompleted = sets.some(s => s.completed);
      if (hasCompleted) {
        loggedExercisesArr.push(ex.name);
      }
    });

    if (loggedExercisesArr.length === 0) {
      alert("Please log and tag at least one set as completed (Checkmark) to record this training log.");
      return;
    }

    const newLog = {
      id: "hist_" + Date.now(),
      date: new Date().toDateString(),
      routineTitle: currentProgram.title,
      exercises: loggedExercisesArr,
      energy: energyRating,
      notes: sessionNotes || "Lifting program completed."
    };

    const updatedHistory = [newLog, ...workoutHistory];
    setWorkoutHistory(updatedHistory);
    localStorage.setItem("gym_workout_history", JSON.stringify(updatedHistory));
    
    // Increment attendance streak trigger
    let streakCount = parseInt(localStorage.getItem("gym_streak_count") || "5", 10);
    localStorage.setItem("gym_streak_count", String(streakCount + 1));

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      // reset completed tags
      const resetLogs = { ...activeSessionLogs };
      Object.keys(resetLogs).forEach((key: any) => {
        resetLogs[key] = resetLogs[key].map((s: any) => ({ ...s, completed: false }));
      });
      setActiveSessionLogs(resetLogs);
      setSessionNotes("");
    }, 3000);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const filtered = workoutHistory.filter(h => h.id !== id);
    setWorkoutHistory(filtered);
    localStorage.setItem("gym_workout_history", JSON.stringify(filtered));
  };

  const handleSavePRs = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      squat: tempPR.squat || personalRecords.squat,
      bench: tempPR.bench || personalRecords.bench,
      deadlift: tempPR.deadlift || personalRecords.deadlift
    };
    setPersonalRecords(updated);
    localStorage.setItem("gym_personal_records", JSON.stringify(updated));
    setShowPrModal(false);
  };

  return (
    <div className="space-y-5 p-5">
      
      {/* Heavy Lifting PRs */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 h-24 w-24 bg-indigo-500/5 blur-xl rounded-full" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Heavy Personal Records</h3>
          </div>
          <button
            onClick={() => {
              setTempPR(personalRecords);
              setShowPrModal(true);
            }}
            className="text-[9.5px] font-black text-indigo-400 hover:text-indigo-300 uppercase bg-indigo-500/10 border border-indigo-500/20 py-1 px-2.5 rounded-lg active:scale-95 transition-all cursor-pointer"
          >
            Update PRs
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-950 border border-white/5 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Squat</span>
            <span className="font-mono text-sm font-black text-indigo-300 block mt-1">{personalRecords.squat}</span>
          </div>
          <div className="bg-slate-950 border border-white/5 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Bench</span>
            <span className="font-mono text-sm font-black text-indigo-300 block mt-1">{personalRecords.bench}</span>
          </div>
          <div className="bg-slate-950 border border-white/5 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Deadlift</span>
            <span className="font-mono text-sm font-black text-indigo-300 block mt-1">{personalRecords.deadlift}</span>
          </div>
        </div>
      </div>

      {/* Weekday Selector HorizTrack */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Day Routines</h3>
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {["Monday", "Wednesday", "Friday"].map((dayName) => (
            <button
              key={dayName}
              onClick={() => {
                setSelectedDay(dayName);
                setExpandedExercise(null);
              }}
              className={`flex-1 min-w-[90px] text-center font-extrabold text-xs py-2.5 rounded-xl transition-all select-none cursor-pointer border ${
                selectedDay.toLowerCase() === dayName.toLowerCase()
                  ? "bg-indigo-600 text-white border-indigo-500/40 shadow shadow-indigo-600/20"
                  : "bg-slate-900 text-slate-400 border-white/5 hover:border-white/10"
              }`}
            >
              {dayName}
            </button>
          ))}
        </div>
      </div>

      {/* Current Day split program */}
      {currentProgram ? (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl">
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Active Target Routine</span>
            <h4 className="text-sm font-black text-white leading-tight mt-0.5">{currentProgram.title}</h4>
          </div>

          {/* Interactive Set Logger Checklist */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Workout & Rep Logs</h3>
            
            {currentProgram.exercises.map((ex: Exercise, index: number) => (
              <div key={index} className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden shadow-sm">
                
                {/* Header Collapsible button */}
                <button
                  type="button"
                  onClick={() => setExpandedExercise(expandedExercise === index ? null : index)}
                  className="w-full text-left p-4 flex justify-between items-center gap-3 cursor-pointer hover:bg-white/[0.01]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-slate-950 text-indigo-400 border border-indigo-500/10 flex items-center justify-center font-bold text-xs shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-200 leading-tight">{ex.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{ex.sets} sets • {ex.reps}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Video</span>
                    {expandedExercise === index ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </button>

                {/* Stream Video Expansion */}
                {expandedExercise === index && (
                  <div className="px-4 pb-4 border-t border-white/5 bg-slate-950/25">
                    <div className="relative aspect-video bg-black rounded-xl border border-white/5 mt-3 overflow-hidden shadow-inner">
                      <iframe
                        src={ex.videoUrl}
                        title={`Guide - ${ex.name}`}
                        className="absolute inset-0 w-full h-full border-0 rounded-xl"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2 text-center">
                      Focus on slow concentric release and maximum muscular tension.
                    </p>
                  </div>
                )}

                {/* Live Set Inputs List */}
                <div className="px-4 pb-4 border-t border-white/5 bg-slate-950/20 divide-y divide-white/5">
                  <div className="grid grid-cols-12 gap-2 text-[9px] font-black uppercase text-slate-500 tracking-wider py-2">
                    <div className="col-span-3 text-left">Set #</div>
                    <div className="col-span-4 text-center">Reps Completed</div>
                    <div className="col-span-3 text-center">Weight (lbs)</div>
                    <div className="col-span-2 text-right">Checked</div>
                  </div>

                  {Array.from({ length: ex.sets }).map((_, setIdx) => {
                    const setObj = activeSessionLogs[index]?.[setIdx] || { reps: "10", weight: "135", completed: false };
                    return (
                      <div key={setIdx} className={`grid grid-cols-12 gap-2 items-center py-2 ${setObj.completed ? "bg-indigo-500/5" : ""}`}>
                        <div className="col-span-3 text-xs font-black font-mono text-slate-400">
                          Set {setIdx + 1}
                        </div>
                        <div className="col-span-4 flex items-center justify-center">
                          <input
                            type="text"
                            value={setObj.reps}
                            onChange={(e) => handleInputChange(index, setIdx, "reps", e.target.value)}
                            disabled={setObj.completed}
                            className="w-16 bg-slate-950 outline-none border border-white/5 focus:border-indigo-500 text-white rounded-lg py-1 px-2 text-xs font-mono text-center disabled:opacity-50"
                          />
                        </div>
                        <div className="col-span-3 flex items-center justify-center">
                          <input
                            type="text"
                            value={setObj.weight}
                            onChange={(e) => handleInputChange(index, setIdx, "weight", e.target.value)}
                            disabled={setObj.completed}
                            className="w-16 bg-slate-950 outline-none border border-white/5 focus:border-indigo-500 text-white rounded-lg py-1 px-2 text-xs font-mono text-center disabled:opacity-50"
                          />
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleToggleSetCompleted(index, setIdx)}
                            className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              setObj.completed
                                ? "bg-emerald-600 text-white border border-transparent shadow shadow-emerald-600/30"
                                : "bg-slate-950 hover:bg-slate-900 border border-white/10 text-transparent hover:text-slate-600"
                            }`}
                          >
                            <Check className="h-4 w-4 strike-none shrink-0" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>

          {/* Effort Score & Progress notes tray */}
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 space-y-3 shadow shadow-indigo-950/20">
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Session Highlights</span>
            
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold block">Energy Score State</label>
              <div className="grid grid-cols-3 gap-2">
                {(["🔥 High", "⚡ Medium", "🥱 Low"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEnergyRating(r)}
                    className={`py-2 text-xs font-extrabold rounded-lg border cursor-pointer select-none transition-all ${
                      energyRating === r
                        ? "bg-indigo-600 text-white border-transparent"
                        : "bg-slate-950 text-slate-400 border-white/5 hover:border-white/10"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold block">Target Progression Notes</label>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Reps felt heavy, outstanding biceps pump, minor knee stiffness etc."
                className="w-full h-16 bg-slate-950 border border-white/15 focus:border-indigo-505 rounded-xl p-2.5 text-xs text-white focus:outline-none resize-none placeholder-slate-500"
              />
            </div>

            {saveSuccess && (
              <p className="text-[10px] text-emerald-400 text-center font-black animate-bounce mt-1">
                ✔ Success! Training sets saved to history calendar and streak updated. Keep it up!
              </p>
            )}

            <button
              onClick={handleSaveWorkoutSession}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-transform active:scale-[0.98] shadow shadow-indigo-600/20 border border-indigo-550/40"
            >
              <Zap className="h-4 w-4 text-indigo-100" />
              LOCK & SAVE TRAINING LOG
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-3xl">
          <Dumbbell className="h-8 w-8 text-slate-600 mb-2 mx-auto" />
          <p className="text-xs font-semibold text-slate-450">Active Rest Day</p>
        </div>
      )}

      {/* Exercise History lists */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gym Activity Logs</h3>
        
        {workoutHistory.length > 0 ? (
          <div className="space-y-2.5">
            {workoutHistory.map((item) => (
              <div key={item.id} className="bg-slate-905 border border-white/5 rounded-2xl p-4 shadow-sm relative group">
                <button
                  onClick={() => handleDeleteHistoryItem(item.id)}
                  className="absolute right-3.5 top-3.5 p-1 bg-slate-850 hover:bg-rose-950/40 border border-white/5 text-slate-500 hover:text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300"
                  title="Remove log"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-indigo-400 font-mono font-bold uppercase">{item.date}</span>
                  <span className="text-[9px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded font-bold font-mono">{item.energy}</span>
                </div>
                <h4 className="text-xs font-black text-white mt-1.5">{item.routineTitle}</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  <span className="font-bold text-slate-500">Completed: </span>
                  {item.exercises.join(", ")}
                </p>
                {item.notes && (
                  <p className="text-[10.5px] italic text-slate-500 mt-2 border-t border-white/5 pt-1.5 font-sans leading-normal">
                    💭 "{item.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs text-slate-500 py-4 bg-slate-900 border border-slate-950 rounded-2xl">No historical records logged yet.</p>
        )}
      </div>

      {/* PR UPDATE MODAL */}
      {showPrModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSavePRs} className="bg-slate-900 border border-white/10 rounded-3xl p-5 w-full max-w-xs space-y-4 shadow-2xl">
            <h4 className="text-xs font-black text-white uppercase tracking-wider text-center">Update Heavy Lift PRs</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Squat PR</label>
                <input
                  type="text"
                  value={tempPR.squat}
                  onChange={(e) => setTempPR({...tempPR, squat: e.target.value})}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Bench Press PR</label>
                <input
                  type="text"
                  value={tempPR.bench}
                  onChange={(e) => setTempPR({...tempPR, bench: e.target.value})}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Deadlift PR</label>
                <input
                  type="text"
                  value={tempPR.deadlift}
                  onChange={(e) => setTempPR({...tempPR, deadlift: e.target.value})}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPrModal(false)}
                className="py-2 bg-slate-850 hover:bg-slate-800 border border-white/5 rounded-xl text-xs text-slate-300 font-bold active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-extrabold text-xs active:scale-95 transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
