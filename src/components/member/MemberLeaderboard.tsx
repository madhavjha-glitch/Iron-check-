import React, { useState, useEffect } from "react";
import { Award, Trophy, Zap, Flame, Crown, Check, ShieldAlert } from "lucide-react";

export default function MemberLeaderboard() {
  const [activeLeaderboardType, setActiveLeaderboardType] = useState<"lifts" | "streak" | "calories">("lifts");

  // User claim lifting totals state
  const [claimedSquat, setClaimedSquat] = useState("320");
  const [claimedBench, setClaimedBench] = useState("230");
  const [claimedDeadlift, setClaimedDeadlift] = useState("400");
  const [claimSuccessMsg, setClaimSuccessMsg] = useState("");
  const [userTotal, setUserTotal] = useState(950);

  // Lifters list
  const [lifters, setLifters] = useState([
    { rank: 1, name: "Arjun Sharma", total: "1340 lbs", details: "Squat: 480 / Bench: 315 / Deadlift: 545" },
    { rank: 2, name: "Rohan Das", total: "1180 lbs", details: "Squat: 420 / Bench: 290 / Deadlift: 470" },
    { rank: 3, name: "You (Member)", total: "950 lbs", details: "Squat: 320 / Bench: 230 / Deadlift: 400" },
    { rank: 4, name: "Alexander King", total: "900 lbs", details: "Squat: 300 / Bench: 210 / Deadlift: 390" }
  ]);

  // Streak list
  const [streaks, setStreaks] = useState<Array<any>>([
    { rank: 1, name: "Arjun Sharma", streak: "18 days" },
    { rank: 2, name: "Jessica Miller", streak: "11 days" },
    { rank: 3, name: "Rohan Das", streak: "8 days" },
    { rank: 4, name: "You (Member)", streak: "5 days" } // Dynamically derived
  ]);

  // Calorie list
  const [calories, setCalories] = useState([
    { rank: 1, name: "Arjun Sharma", kcal: "2200 kcal" },
    { rank: 2, name: "Jessica Miller", kcal: "1800 kcal" },
    { rank: 3, name: "You (Member)", kcal: "1150 kcal" },
    { rank: 4, name: "Rohan Das", kcal: "950 kcal" }
  ]);

  useEffect(() => {
    // Restore states
    const savedPRs = localStorage.getItem("gym_personal_records");
    let sqVal = 320, beVal = 230, deVal = 400;
    if (savedPRs) {
      try {
        const parsed = JSON.parse(savedPRs);
        sqVal = parseInt(parsed.squat, 10) || 320;
        beVal = parseInt(parsed.bench, 10) || 230;
        deVal = parseInt(parsed.deadlift, 10) || 400;
      } catch (e) {}
    }
    setClaimedSquat(String(sqVal));
    setClaimedBench(String(beVal));
    setClaimedDeadlift(String(deVal));

    const total = sqVal + beVal + deVal;
    setUserTotal(total);

    rearrangeLifters(total);

    // Dynamic streak count
    const streakCount = parseInt(localStorage.getItem("gym_streak_count") || "5", 10);
    const updatedStreaks = [
      { rank: 1, name: "Arjun Sharma", streak: "18 days", isUser: false },
      { rank: 2, name: "Jessica Miller", streak: "11 days", isUser: false },
      { rank: 3, name: "You (Member)", streak: `${streakCount} days`, isUser: true },
      { rank: 4, name: "Rohan Das", streak: "8 days", isUser: false }
    ];
    // Sort streaks
    updatedStreaks.sort((a,b) => parseInt(b.streak, 10) - parseInt(a.streak, 10));
    updatedStreaks.forEach((item, index) => {
      item.rank = index + 1;
    });
    setStreaks(updatedStreaks);

    // Dynamic calories count
    const savedMeals = localStorage.getItem("gym_meals_today");
    const savedCustoms = localStorage.getItem("gym_custom_meals_today");
    let loggedCal = 1150;
    let accumulated = 0;
    if (savedMeals) {
      try {
        const parsed = JSON.parse(savedMeals);
        parsed.forEach((m: any) => { if (m.logged) accumulated += m.cal; });
      } catch (e) {}
    }
    if (savedCustoms) {
      try {
        const parsed = JSON.parse(savedCustoms);
        parsed.forEach((m: any) => { if (m.logged) accumulated += m.cal; });
      } catch (e) {}
    }
    if (accumulated > 0) loggedCal = accumulated;

    const updatedCals = [
      { rank: 1, name: "Arjun Sharma", kcal: "2205 kcal", isUser: false },
      { rank: 2, name: "Jessica Miller", kcal: "1850 kcal", isUser: false },
      { rank: 3, name: "You (Member)", kcal: `${loggedCal} kcal`, isUser: true },
      { rank: 4, name: "Rohan Das", kcal: "950 kcal", isUser: false }
    ];
    updatedCals.sort((a,b) => parseInt(b.kcal, 10) - parseInt(a.kcal, 10));
    updatedCals.forEach((item, index) => {
      item.rank = index + 1;
    });
    setCalories(updatedCals);

  }, []);

  const rearrangeLifters = (totalVal: number) => {
    const list = [
      { name: "Arjun Sharma", total: 1340, details: "Squat: 480 / Bench: 315 / Deadlift: 545", isUser: false },
      { name: "Rohan Das", total: 1180, details: "Squat: 420 / Bench: 290 / Deadlift: 470", isUser: false },
      { name: "You (Member)", total: totalVal, details: `Squat: ${claimedSquat} / Bench: ${claimedBench} / Deadlift: ${claimedDeadlift}`, isUser: true },
      { name: "Alexander King", total: 900, details: "Squat: 300 / Bench: 210 / Deadlift: 390", isUser: false }
    ];

    // Sort by total desc
    list.sort((a, b) => b.total - a.total);

    const mapped = list.map((item, index) => ({
      rank: index + 1,
      name: item.name,
      total: `${item.total} lbs`,
      details: item.details,
      isUser: item.isUser
    }));

    setLifters(mapped);
  };

  const handleClaimTotalsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sq = parseInt(claimedSquat, 10) || 0;
    const be = parseInt(claimedBench, 10) || 0;
    const de = parseInt(claimedDeadlift, 10) || 0;
    const total = sq + be + de;

    setUserTotal(total);

    // Save back to personal records
    const prs = { squat: `${sq} lbs`, bench: `${be} lbs`, deadlift: `${de} lbs` };
    localStorage.setItem("gym_personal_records", JSON.stringify(prs));

    rearrangeLifters(total);

    setClaimSuccessMsg("✔ PR claims saved! Check your updated rank in the Leaderboard podium above.");
    setTimeout(() => setClaimSuccessMsg(""), 3500);
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return <Crown className="h-4.5 w-4.5 text-amber-400 fill-amber-400" />;
    if (rank === 2) return <Award className="h-4 w-4 text-slate-300" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
    return <span className="text-[10px] text-slate-500 font-mono">#{rank}</span>;
  };

  return (
    <div className="space-y-5 p-5">
      
      {/* Dynamic Header Badge */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 border border-white/10 rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 h-24 w-24 bg-white/5 blur-xl rounded-full" />
        <span className="text-[9px] text-indigo-200 font-bold uppercase tracking-widest block">Gym Ranks</span>
        <h3 className="text-sm font-black text-white uppercase tracking-wider mt-0.5">Iron Check Leaderboard</h3>
        <p className="text-[11px] text-slate-300 leading-normal mt-1">
          Perform check-ins, log training sets, and push heavy lifting PRs to claim top scores. Iron Check rewards raw continuous discipline.
        </p>
      </div>

      {/* Switch Categories tab */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setActiveLeaderboardType("lifts")}
          className={`py-2 text-[11px] font-black uppercase rounded-xl border select-none transition-all cursor-pointer ${
            activeLeaderboardType === "lifts"
              ? "bg-indigo-600 text-white border-transparent shadow shadow-indigo-600/20"
              : "bg-slate-900 text-slate-400 border-white/5 hover:border-white/10"
          }`}
        >
          🏋️ Heavy Lifters
        </button>
        <button
          onClick={() => setActiveLeaderboardType("streak")}
          className={`py-2 text-[11px] font-black uppercase rounded-xl border select-none transition-all cursor-pointer ${
            activeLeaderboardType === "streak"
              ? "bg-indigo-600 text-white border-transparent shadow shadow-indigo-600/20"
              : "bg-slate-900 text-slate-400 border-white/5 hover:border-white/10"
          }`}
        >
          🔥 Streaks
        </button>
        <button
          onClick={() => setActiveLeaderboardType("calories")}
          className={`py-2 text-[11px] font-black uppercase rounded-xl border select-none transition-all cursor-pointer ${
            activeLeaderboardType === "calories"
              ? "bg-indigo-600 text-white border-transparent shadow shadow-indigo-600/20"
              : "bg-slate-900 text-slate-400 border-white/5 hover:border-white/10"
          }`}
        >
          🥩 Fuel Burners
        </button>
      </div>

      {/* Leaderboard Lists Display card */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Ranks Placement</span>
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Score Metrics</span>
        </div>

        <div className="divide-y divide-white/5">
          {activeLeaderboardType === "lifts" && lifters.map((item) => (
            <div key={item.rank} className={`flex items-center justify-between py-3.5 ${item.isUser ? "bg-indigo-500/5 px-2 rounded-xl border border-indigo-500/15" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">{getRankEmoji(item.rank)}</div>
                <div>
                  <h4 className="text-xs font-black text-slate-150 flex items-center gap-1">
                    {item.name}
                    {item.isUser && <span className="bg-indigo-500/20 text-indigo-400 text-[8px] font-bold py-0.5 px-1.5 rounded-full uppercase ml-1 shrink-0">Lifting VIP</span>}
                  </h4>
                  <p className="text-[9.5px] font-mono text-slate-500 mt-0.5 truncate max-w-[200px]">{item.details}</p>
                </div>
              </div>
              <span className="font-mono text-xs font-black text-white">{item.total}</span>
            </div>
          ))}

          {activeLeaderboardType === "streak" && streaks.map((item) => (
            <div key={item.rank} className={`flex items-center justify-between py-3.5 ${item.isUser ? "bg-indigo-500/5 px-2 rounded-xl border border-indigo-500/15" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">{getRankEmoji(item.rank)}</div>
                <h4 className="text-xs font-black text-slate-150">
                  {item.name}
                  {item.isUser && <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-bold py-0.5 px-1.5 rounded-full uppercase ml-1 shrink-0">Continuous</span>}
                </h4>
              </div>
              <span className="font-mono text-xs font-bold text-orange-400">{item.streak}</span>
            </div>
          ))}

          {activeLeaderboardType === "calories" && calories.map((item) => (
            <div key={item.rank} className={`flex items-center justify-between py-3.5 ${item.isUser ? "bg-indigo-500/5 px-2 rounded-xl border border-indigo-500/15" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">{getRankEmoji(item.rank)}</div>
                <h4 className="text-xs font-black text-slate-150">
                  {item.name}
                  {item.isUser && <span className="bg-amber-500/20 text-amber-400 text-[8px] font-bold py-0.5 px-1.5 rounded-full uppercase ml-1 shrink-0">Anabolic</span>}
                </h4>
              </div>
              <span className="font-mono text-xs font-bold text-[#f97316]">{item.kcal}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Claim Lifting form card */}
      <form onSubmit={handleClaimTotalsSubmit} className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
          <Zap className="h-4.5 w-4.5 text-indigo-400 fill-indigo-400" />
          <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider">Declare Total Max Liftover</h4>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[8px] font-none text-slate-400 uppercase tracking-widest text-center block">Squat max</label>
            <input
              type="number"
              value={claimedSquat}
              onChange={(e) => setClaimedSquat(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 text-center text-xs text-white focus:border-indigo-500 font-mono focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-none text-slate-400 uppercase tracking-widest text-center block">Bench Max</label>
            <input
              type="number"
              value={claimedBench}
              onChange={(e) => setClaimedBench(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 text-center text-xs text-white focus:border-indigo-500 font-mono focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-none text-slate-400 uppercase tracking-widest text-center block">Deadlift Max</label>
            <input
              type="number"
              value={claimedDeadlift}
              onChange={(e) => setClaimedDeadlift(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 text-center text-xs text-white focus:border-indigo-500 font-mono focus:outline-none"
            />
          </div>
        </div>

        {claimSuccessMsg && (
          <p className="text-[10px] text-emerald-400 font-semibold text-center animate-bounce leading-none mt-1">
            {claimSuccessMsg}
          </p>
        )}

        <button
          type="submit"
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-transform active:scale-[0.98]"
        >
          Claim Three-Lift Total: <strong className="font-mono text-indigo-150">{claimedSquat ? parseInt(claimedSquat, 10) + (parseInt(claimedBench, 10) || 0) + (parseInt(claimedDeadlift, 10) || 0) : 0} lbs</strong>
        </button>

      </form>

    </div>
  );
}
