import React, { useState, useEffect } from "react";
import { Smartphone, Monitor, Battery, Wifi, ShieldAlert } from "lucide-react";
import PremiumBackground3D from "./PremiumBackground3D";

interface MobileFrameProps {
  children: React.ReactNode;
  title?: string;
  isSimulatingFirebase: boolean;
}

export default function MobileFrame({
  children,
  title = "GymFit Core",
  isSimulatingFirebase,
}: MobileFrameProps) {
  const [deviceMode, setDeviceMode] = useState<"phone" | "expanded">("phone");
  const [timeStr, setTimeStr] = useState("09:41");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hrs = now.getHours();
      const mins = now.getMinutes().toString().padStart(2, "0");
      const ampm = hrs >= 12 ? "PM" : "AM";
      hrs = hrs % 12 || 12; // 12-hour format
      setTimeStr(`${hrs}:${mins} ${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col items-center justify-start p-2 sm:p-6 font-sans relative overflow-x-hidden select-none">
      <PremiumBackground3D />

      {/* Simulation / Control Bar */}
      <div className="w-full max-w-md bg-slate-900/70 backdrop-blur-md border border-white/10 rounded-2xl p-3 mb-4 flex items-center justify-between shadow-xl z-50">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSimulatingFirebase ? "bg-amber-400" : "bg-emerald-400"}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSimulatingFirebase ? "bg-amber-500" : "bg-emerald-500"}`}></span>
          </div>
          <span className="text-xs font-semibold tracking-wide text-slate-300">
            {isSimulatingFirebase ? "DEMO SIMULATOR ACTIVE" : "LIVE CLOUD INTEGRATION"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950/45 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setDeviceMode("phone")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              deviceMode === "phone"
                ? "bg-indigo-600 text-white font-semibold shadow-sm animate-pulse"
                : "text-slate-400 hover:text-slate-100"
            }`}
            title="Mobile Shell Frame"
          >
            <Smartphone className="w-3.5 h-3.5 inline-block mr-1" />
            Shell
          </button>
          <button
            onClick={() => setDeviceMode("expanded")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              deviceMode === "expanded"
                ? "bg-indigo-600 text-white font-semibold shadow-sm animate-pulse"
                : "text-slate-400 hover:text-slate-100"
            }`}
            title="Responsive Web Canvas"
          >
            <Monitor className="w-3.5 h-3.5 inline-block mr-1" />
            Expanded
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div
        className={`transition-all duration-300 ease-in-out relative ${
          deviceMode === "phone"
            ? "w-[385px] h-[812px] rounded-[50px] border-[12px] border-slate-900 bg-slate-900 flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden"
            : "w-full max-w-5xl min-h-[750px] rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-md flex flex-col shadow-2xl overflow-hidden"
        }`}
        id="app-simulator-view"
      >
        {/* Phone Notch & Status indicators (only visible in phone mode) */}
        {deviceMode === "phone" && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-slate-900 rounded-b-2xl z-50 flex items-center justify-center">
            {/* Mock Speaker Grill */}
            <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
          </div>
        )}

        {/* Top Status Bar (Phone Look or Premium Header) */}
        <div className="bg-blue-900/95 backdrop-blur-[8px] px-6 pt-3.5 pb-2.5 flex justify-between items-center text-xs text-white font-medium z-40 select-none border-b border-blue-850/80">
          <span>{timeStr}</span>
          {deviceMode === "phone" ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              <Wifi className="w-3.5 h-3.5 text-blue-200" />
              <span className="text-[10px] text-blue-200 block">5G</span>
              <Battery className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-700/50 text-blue-200 font-semibold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block mr-0.5 animate-ping"></span>
              Virtual Workspace Mobile Simulator
            </div>
          )}
        </div>

        {/* Dynamic Internal App Window */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col bg-gradient-to-b from-blue-600 to-blue-800 text-black relative custom-scrollbar">
          {children}
        </div>

        {/* Simulated Phone Home Bar (Only in phone mode) */}
        {deviceMode === "phone" && (
          <div className="h-5 flex items-center justify-center pb-2 bg-blue-800/95 backdrop-blur-[6px] z-40">
            <div className="w-32 h-1 bg-blue-300/50 rounded-full"></div>
          </div>
        )}
      </div>

      {isSimulatingFirebase && (
        <div className="mt-4 max-w-sm text-center text-[11px] text-slate-400 font-medium leading-relaxed px-4">
          The persistent Database is currently running in local-first sandbox mode. Configure Firebase in the AI Studio sidebar to activate instant, secure Cloud Run Sync.
        </div>
      )}
    </div>
  );
}
