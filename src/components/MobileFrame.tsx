import React from "react";
import { ShieldCheck, Database, Sun, Moon } from "lucide-react";

interface MobileFrameProps {
  children: React.ReactNode;
  isSimulatingFirebase: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export default function MobileFrame({
  children,
  isSimulatingFirebase,
  theme,
  onToggleTheme,
}: MobileFrameProps) {
  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 relative flex flex-col justify-between ${
      theme === "light" 
        ? "bg-slate-50 text-slate-900" 
        : "bg-[#08090c] text-slate-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/10 via-[#08090c] to-[#08090c]"
    }`}>
      
      {/* Premium Universal Top Navigation Header (Fully Fluid Across Viewports) */}
      <div className="w-full border-b border-white/5 bg-[#0a0d13]/70 dark:bg-[#0a0d13]/40 backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xl z-50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-xl text-black shadow-lg shadow-amber-600/10">
            <ShieldCheck className="w-5 h-5 text-[#000000]" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white leading-none">
              IRON CHECK BIOMETRICS
            </h2>
            <span className="text-[9.5px] text-amber-500 font-extrabold uppercase tracking-widest block mt-1 font-mono">
              ★ Premium Elite Gym Hub ★
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3.5">
          {/* Live Sync Status Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-black/40 rounded-xl border border-white/10 shadow-inner">
            <div className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isSimulatingFirebase ? "bg-amber-400" : "bg-emerald-400"
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isSimulatingFirebase ? "bg-amber-500" : "bg-emerald-500"
              }`}></span>
            </div>
            <span className="text-[9.5px] font-black tracking-widest font-mono text-slate-350 flex items-center gap-1.5">
              <Database className="w-3 h-3 text-amber-500" />
              {isSimulatingFirebase ? "LOCALHOST PLAYGROUND" : "LIVE CLOUD CONNECTED"}
            </span>
          </div>

          {/* Theme Switcher Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-[#12161f] hover:bg-[#1a202d] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
            title="Toggle Light or Dark Theme"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-[9px] uppercase font-black text-slate-300 tracking-wide hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-amber-600" />
                <span className="text-[9px] uppercase font-black text-slate-350 tracking-wide hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edge-to-Edge Responsive Container Stage */}
      <main
        className={`flex-1 w-full mx-auto transition-all duration-300 flex flex-col ${
          theme === "light"
            ? "light-theme bg-white text-slate-900"
            : "dark-theme bg-[#0a0c10] text-[#eaeef6]"
        }`}
        id="app-responsive-workspace"
      >
        <div className="flex-1 flex flex-col relative w-full h-full overflow-x-hidden">
          {children}
        </div>
      </main>

      {/* Bottom Footer Information */}
      <footer className="w-full border-t border-white/5 py-4 px-6 text-center text-[10px] uppercase font-bold tracking-widest font-mono text-slate-600 bg-black/20">
        IRON CHECK BIOMETRICS PLATFORM • ALL RIGHTS RESERVED © 2026
      </footer>
    </div>
  );
}
