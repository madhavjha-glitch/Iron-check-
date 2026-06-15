import React, { useState, useEffect } from "react";
import { Flame, Droplet, Plus, Apple, Check, Save } from "lucide-react";

export default function MemberDiet() {
  const calorieTarget = 2600;
  const macroTarget = { p: 180, c: 260, f: 65 }; // Protein, Carbs, Fat

  // Hydration state
  const [waterCups, setWaterCups] = useState(3);
  const [remindersActive, setRemindersActive] = useState(false);

  // Meal logs state
  const [meals, setMeals] = useState([
    { id: 1, name: "🍳 High-Protein Oatmeal & Egg Whites", cal: 550, p: 40, c: 60, f: 10, logged: false, time: "Breakfast" },
    { id: 2, name: "🥩 Grilled Chicken Breast, Sweet Potato & Broccoli", cal: 650, p: 45, c: 50, f: 12, logged: false, time: "Lunch" },
    { id: 3, name: "🍌 Gold Whey Shake, Peanut Butter & Banana", cal: 320, p: 30, c: 28, f: 3, logged: false, time: "Post-Workout" },
    { id: 4, name: "🐟 Baked Atlantic Salmon & Roasted Veggies", cal: 520, p: 42, c: 15, f: 18, logged: false, time: "Dinner" }
  ]);

  const [customMeals, setCustomMeals] = useState<Array<any>>([]);
  const [customName, setCustomName] = useState("");
  const [customCal, setCustomCal] = useState("");
  const [customP, setCustomP] = useState("");
  const [customC, setCustomC] = useState("");
  const [customF, setCustomF] = useState("");

  // Load state on mount
  useEffect(() => {
    const savedWater = localStorage.getItem("gym_water_today");
    if (savedWater) setWaterCups(parseInt(savedWater, 10));

    const savedAlarms = localStorage.getItem("gym_water_alarms");
    if (savedAlarms) setRemindersActive(savedAlarms === "true");

    const savedMeals = localStorage.getItem("gym_meals_today");
    if (savedMeals) {
      try { setMeals(JSON.parse(savedMeals)); } catch (e) {}
    }

    const savedCustoms = localStorage.getItem("gym_custom_meals_today");
    if (savedCustoms) {
      try { setCustomMeals(JSON.parse(savedCustoms)); } catch (e) {}
    }
  }, []);

  // Save water to localStorage
  const handleAddWater = () => {
    const updated = Math.min(12, waterCups + 1);
    setWaterCups(updated);
    localStorage.setItem("gym_water_today", String(updated));

    // play quick beep
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {}
  };

  const handleResetWater = () => {
    setWaterCups(0);
    localStorage.setItem("gym_water_today", "0");
  };

  // Toggle meal logging
  const handleToggleMeal = (id: number) => {
    const updated = meals.map(m => {
      if (m.id === id) {
        return { ...m, logged: !m.logged };
      }
      return m;
    });
    setMeals(updated);
    localStorage.setItem("gym_meals_today", JSON.stringify(updated));
  };

  const handleToggleCustomMeal = (index: number) => {
    const updated = [...customMeals];
    if (updated[index]) {
      updated[index].logged = !updated[index].logged;
    }
    setCustomMeals(updated);
    localStorage.setItem("gym_custom_meals_today", JSON.stringify(updated));
  };

  const handleDeleteCustomMeal = (index: number) => {
    const updated = customMeals.filter((_, idx) => idx !== index);
    setCustomMeals(updated);
    localStorage.setItem("gym_custom_meals_today", JSON.stringify(updated));
  };

  const handleAddCustomMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const cal = parseInt(customCal, 10) || 0;
    const p = parseInt(customP, 10) || 0;
    const c = parseInt(customC, 10) || 0;
    const f = parseInt(customF, 10) || 0;

    const newCustom = {
      name: customName,
      cal,
      p,
      c,
      f,
      logged: true,
      time: "Snack"
    };

    const updated = [...customMeals, newCustom];
    setCustomMeals(updated);
    localStorage.setItem("gym_custom_meals_today", JSON.stringify(updated));

    // Clear form inputs
    setCustomName("");
    setCustomCal("");
    setCustomP("");
    setCustomC("");
    setCustomF("");
  };

  const handleToggleAlarms = () => {
    const updated = !remindersActive;
    setRemindersActive(updated);
    localStorage.setItem("gym_water_alarms", String(updated));
  };

  // Calculate accumulated macros
  const getTotals = () => {
    let cal = 0, p = 0, c = 0, f = 0;
    meals.forEach(m => {
      if (m.logged) {
        cal += m.cal; p += m.p; c += m.c; f += m.f;
      }
    });

    customMeals.forEach(m => {
      if (m.logged) {
        cal += m.cal; p += m.p; c += m.c; f += m.f;
      }
    });

    return { cal, p, c, f };
  };

  const totals = getTotals();
  const progressPercent = Math.min(100, Math.round((totals.cal / calorieTarget) * 100));

  // Circular gauge calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="space-y-5 p-5">
      
      {/* Target Calorie Ring & Dashboard Progress Card */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow-lg relative flex flex-col items-center sm:flex-row sm:justify-around gap-4 overflow-hidden">
        <div className="absolute right-0 top-0 h-24 w-24 bg-orange-500/5 blur-xl rounded-full" />
        
        {/* SVG Progress Ring */}
        <div className="relative h-32 w-32 shrink-0 flex items-center justify-center">
          <svg className="h-full w-full rotate-[-90deg]">
            <circle
              cx="64"
              cy="64"
              r={radius}
              className="stroke-slate-950 stroke-[8]"
              fill="transparent"
            />
            {totals.cal > 0 && (
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-orange-500 stroke-[8] transition-all duration-500"
                fill="transparent"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-mono text-base font-black text-white">{totals.cal}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Target {calorieTarget}</span>
          </div>
        </div>

        {/* Numeric and percentage summaries */}
        <div className="text-center sm:text-left space-y-2 flex-1 min-w-0">
          <div>
            <span className="text-[9px] text-orange-400 font-bold uppercase tracking-widest block">Intake Target Ratio</span>
            <h3 className="text-base font-black text-slate-100 mt-0.5">{progressPercent}% Consumed</h3>
            <p className="text-[11px] text-slate-400 leading-normal mt-1">
              Currently fueling <span className="font-mono text-white">{totals.cal} kcal</span> out of your target budget of <span className="font-mono text-white">{calorieTarget} kcal</span> for clean anabolic muscle growth.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
            <div className="bg-slate-950 border border-white/5 py-1.5 px-2 rounded-xl text-center">
              <span className="text-[8px] text-slate-400 uppercase tracking-wider block font-bold">Protein</span>
              <span className="text-[10.5px] font-bold text-white mt-0.5 block">{totals.p}g / {macroTarget.p}g</span>
            </div>
            <div className="bg-slate-950 border border-white/5 py-1.5 px-2 rounded-xl text-center">
              <span className="text-[8px] text-slate-400 uppercase tracking-wider block font-bold">Carbs</span>
              <span className="text-[10.5px] font-bold text-white mt-0.5 block">{totals.c}g / {macroTarget.c}g</span>
            </div>
            <div className="bg-slate-950 border border-white/5 py-1.5 px-2 rounded-xl text-center">
              <span className="text-[8px] text-slate-400 uppercase tracking-wider block font-bold">Fat</span>
              <span className="text-[10.5px] font-bold text-white mt-0.5 block">{totals.f}g / {macroTarget.f}g</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Water Level Hydration box */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest block mb-1">Hydration Track</span>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1">
            <Droplet className="h-4.5 w-4.5 text-cyan-400 fill-cyan-400" />
            Water Intake Tracker
          </h3>
          <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
            {waterCups * 250} ml / 2000 ml
          </span>
        </div>

        {/* Micro-interactive animated water glass grid */}
        <div className="bg-slate-950 border border-white/5 rounded-2xl p-4 flex justify-between items-center gap-4">
          <div className="flex-1 flex gap-1 justify-around">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-10 rounded-sm border transition-all duration-300 relative ${
                  i < waterCups 
                    ? "bg-cyan-500/30 border-cyan-400 shadow shadow-cyan-400/20" 
                    : "bg-transparent border-white/10"
                }`}
              >
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-b-sm bg-cyan-400 transition-all duration-550 ${
                    i < waterCups ? "h-full" : "h-0"
                  }`}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              onClick={handleAddWater}
              className="py-1.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-black uppercase rounded-lg shadow cursor-pointer active:scale-95 transition-all"
            >
              + Add Glass
            </button>
            <button
              onClick={handleResetWater}
              className="text-[9px] text-slate-500 hover:text-slate-400 hover:underline text-center cursor-pointer"
            >
              Reset count
            </button>
          </div>
        </div>

        {/* Hydration Reminder alarm toggle */}
        <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
          <div>
            <h4 className="text-xs font-black text-slate-200">Hydration Alarm Reminders</h4>
            <p className="text-[10px] text-slate-500">Auto remind me to consume fluids every 2 hours</p>
          </div>
          <button
            type="button"
            onClick={handleToggleAlarms}
            className={`w-10 h-5.5 rounded-full p-0.5 transition-all cursor-pointer ${
              remindersActive ? "bg-cyan-600" : "bg-slate-850"
            }`}
          >
            <div
              className={`w-4.5 h-4.5 rounded-full bg-white transition-all transform ${
                remindersActive ? "translate-x-4.5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Preset Diet Plans & Meal Checkboxes list */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Diet Schedule</h3>
        
        <div className="space-y-2">
          {meals.map((meal) => (
            <div
              key={meal.id}
              onClick={() => handleToggleMeal(meal.id)}
              className={`border p-4 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all select-none ${
                meal.logged
                  ? "bg-orange-500/5 border-orange-500/20 shadow-sm"
                  : "bg-slate-900 hover:bg-slate-900 border-white/5 text-slate-400 hover:border-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all ${
                  meal.logged 
                    ? "bg-orange-600 text-white shadow shadow-orange-600/30" 
                    : "bg-slate-950 border border-white/10 text-transparent"
                }`}>
                  <Check className="h-4 w-4 shrink-0" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded font-black font-mono uppercase">{meal.time}</span>
                    <span className="font-mono text-[10px] font-black text-orange-400">{meal.cal} Kcal</span>
                  </div>
                  <h4 className={`text-xs font-black mt-1 leading-tight ${meal.logged ? "text-slate-100" : "text-slate-400"}`}>
                    {meal.name}
                  </h4>
                  <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                    P: {meal.p}g • C: {meal.c}g • F: {meal.f}g
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Render custom food logs */}
          {customMeals.map((meal, index) => (
            <div
              key={`custom_${index}`}
              className={`border p-4 rounded-2xl flex items-center justify-between gap-3 transition-all relative group ${
                meal.logged
                  ? "bg-slate-905 border-indigo-505/20 shadow-xs"
                  : "bg-slate-900 border-white/5 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-3" onClick={() => handleToggleCustomMeal(index)}>
                <div className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all ${
                  meal.logged 
                    ? "bg-indigo-600 text-white shadow shadow-indigo-600/30" 
                    : "bg-slate-950 border border-white/10 text-transparent"
                }`}>
                  <Check className="h-4 w-4 shrink-0" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded font-black font-mono uppercase">CUSTOM</span>
                    <span className="font-mono text-[10px] font-black text-indigo-400">{meal.cal} Kcal</span>
                  </div>
                  <h4 className="text-xs font-black text-slate-200 mt-1 leading-tight">{meal.name}</h4>
                  <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                    P: {meal.p}g • C: {meal.c}g • F: {meal.f}g
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteCustomMeal(index)}
                className="p-1 text-slate-500 hover:text-rose-450 border border-white/5 rounded-lg bg-slate-850 hover:bg-rose-950/30 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                title="Remove Item"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Custom Food Adder form card */}
      <form onSubmit={handleAddCustomMeal} className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
          <Apple className="h-4.5 w-4.5 text-indigo-400" />
          <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider">Log Extra Snack or Fuel</h4>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Food / Supplement Name</label>
            <input
              type="text"
              required
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="E.g., Snickers Bar, Protein Shake, Cashews"
              className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center">Calories</label>
              <input
                type="number"
                value={customCal}
                onChange={(e) => setCustomCal(e.target.value)}
                placeholder="kcal"
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-2 text-xs text-white text-center outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center">Protein</label>
              <input
                type="number"
                value={customP}
                onChange={(e) => setCustomP(e.target.value)}
                placeholder="g"
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-2 text-xs text-white text-center outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center">Carbs</label>
              <input
                type="number"
                value={customC}
                onChange={(e) => setCustomC(e.target.value)}
                placeholder="g"
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-2 text-xs text-white text-center outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center">Fats</label>
              <input
                type="number"
                value={customF}
                onChange={(e) => setCustomF(e.target.value)}
                placeholder="g"
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-2 text-xs text-white text-center outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer hover:scale-[1.01] transition-transform active:scale-[0.98] shadow shadow-indigo-500/10"
        >
          <Save className="h-4 w-4 shrink-0 text-indigo-250" />
          Log Custom Nutrients
        </button>
      </form>

    </div>
  );
}
