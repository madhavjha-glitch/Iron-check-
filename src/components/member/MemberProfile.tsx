import React, { useState, useEffect } from "react";
import { Download, CreditCard, ShieldCheck, Settings, Award, Save, Lock, User, LogOut, Trash2 } from "lucide-react";
import { MemberProfile } from "../../types";
import axios from "axios";
import { deleteMemberProfile } from "../../firebase";

interface MemberProfileProps {
  userProfile: MemberProfile;
  onLogout: () => void;
}

export default function MemberProfileComponent({ userProfile, onLogout }: MemberProfileProps) {
  // Demographic Goals state
  const [userGoal, setUserGoal] = useState("Bulk / Hypertrophy");
  const [userHeight, setUserHeight] = useState("5'11\"");
  const [userAge, setUserAge] = useState("24");
  const [userWeight, setUserWeight] = useState("179.4");
  const [goalSaved, setGoalSaved] = useState(false);

  // Renewal payment modal state
  const [activeTierSelected, setActiveTierSelected] = useState<"silver" | "gold" | "platinum">("gold");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [showPayModal, setShowPayModal] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [payStatus, setPayStatus] = useState<"idle" | "processing" | "success" | "error">("idle");

  // Account & settings confirmation states
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSettingsLogout = async () => {
    setIsLoggingOut(true);
    try {
      // POST backend to notify logout
      await axios.post("/api/auth/logout", {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("gym_auth_token") || ""}`
        }
      });
    } catch (e) {
      console.warn("API logout callback was not registered, doing local client logout: ", e);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
      onLogout();
    }
  };

  const handleSettingsDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError("Please enter your current password to proceed.");
      return;
    }
    
    setIsDeleting(true);
    setDeleteError("");
    try {
      // 1. DELETE backend to clear backend data (member & progress charts)
      await axios.delete("/api/auth/account", {
        data: { password: deletePassword, confirmDelete: true, uid: userProfile.uid },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("gym_auth_token") || ""}`
        }
      });

      // 2. Client-side database delete (Firebase + LocalStorage config)
      await deleteMemberProfile(userProfile.uid);

      setIsDeleting(false);
      setShowDeleteConfirm(false);
      onLogout(); // trigger logout redirection and cleanup
    } catch (err: any) {
      console.error("Account deletion failed:", err);
      setDeleteError(err.response?.data?.error || err.message || "Deletion failed. Please try again.");
      setIsDeleting(false);
    }
  };

  // Invoices history lists
  const [invoices, setInvoices] = useState<Array<any>>([
    { id: "INV_2026_004", date: "June 01, 2026", amount: "₹2,499.00", status: "Completed", plan: "Monthly SILVER" },
    { id: "INV_2026_001", date: "May 01, 2026", amount: "₹2,499.00", status: "Completed", plan: "Monthly SILVER" }
  ]);

  useEffect(() => {
    // Restore states
    const savedGoal = localStorage.getItem("gym_profile_goal");
    if (savedGoal) setUserGoal(savedGoal);

    const savedHeight = localStorage.getItem("gym_profile_height");
    if (savedHeight) setUserHeight(savedHeight);

    const savedAge = localStorage.getItem("gym_profile_age");
    if (savedAge) setUserAge(savedAge);

    const savedWeight = localStorage.getItem("gym_weight_latest");
    if (savedWeight) setUserWeight(savedWeight);

    const savedInvoices = localStorage.getItem("gym_invoices_history");
    if (savedInvoices) {
      try { setInvoices(JSON.parse(savedInvoices)); } catch (e) {}
    } else {
      localStorage.setItem("gym_invoices_history", JSON.stringify(invoices));
    }
  }, []);

  const handleSaveGoalDemographics = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("gym_profile_goal", userGoal);
    localStorage.setItem("gym_profile_height", userHeight);
    localStorage.setItem("gym_profile_age", userAge);
    localStorage.setItem("gym_weight_latest", userWeight);
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 2000);
  };

  const calculateRenewCost = () => {
    if (activeTierSelected === "silver") return billingCycle === "monthly" ? 2499 : 19999;
    if (activeTierSelected === "gold") return billingCycle === "monthly" ? 3999 : 34999;
    return billingCycle === "monthly" ? 5999 : 49999;
  };

  const handleSimulatePaymentProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber.trim() || !cardExpiry.trim() || !cardCVV.trim()) {
      setPayStatus("error");
      return;
    }

    setPayStatus("processing");
    setTimeout(() => {
      // Create new invoice receipt
      const amt = `₹${calculateRenewCost().toLocaleString("en-IN")}.00`;
      const planName = `${billingCycle === "monthly" ? "Monthly" : "Yearly"} ${activeTierSelected.toUpperCase()}`;
      const newInv = {
        id: "INV_" + Date.now().toString().slice(-6),
        date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        amount: amt,
        status: "Completed",
        plan: planName
      };

      const updated = [newInv, ...invoices];
      setInvoices(updated);
      localStorage.setItem("gym_invoices_history", JSON.stringify(updated));

      // Reset membership details in localstorage
      localStorage.setItem("gym_user_tier", activeTierSelected.toUpperCase());
      const extendedDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toDateString();
      localStorage.setItem("gym_user_duedate", extendedDate);

      setPayStatus("success");
      setTimeout(() => {
        setShowPayModal(false);
        setCardNumber("");
        setCardExpiry("");
        setCardCVV("");
        setPayStatus("idle");
      }, 2500);
    }, 2000);
  };

  // Generate plain text receipt download for the selected invoice
  const triggerDownloadInvoice = (item: any) => {
    const divider = "==================================================";
    const documentBody = `${divider}
               IRON BIOMETRICS GYM PASS
                   INVOICE RECEIPT
${divider}
Invoice ID   : ${item.id}
Issue Date   : ${item.date}
Client Name  : ${userProfile.name}
Client Email : ${userProfile.email}
Gym Site     : Central Sandbox Gateway Location

BILLING ITEM DESCRIPTION:
--------------------------------------------------
Pass Item    : ${item.plan}
Status       : ${item.status ?? "PAID / POSTED"}
--------------------------------------------------
Subtotal     : ${item.amount}
Tax Rate     : 0.00% (Central Sandbox Tax Exempt)
TOTAL PAID   : ${item.amount} (Visa/Mastercard processed)

Thank you for your continuous anabolic discipline!
For support, visit: http://ai.studio/build
${divider}
Gateway security handshake verified.`;

    const blob = new Blob([documentBody], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Invoice_${item.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 p-5">
      
      {/* Current Pass Overview Card */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 h-24 w-24 bg-amber-500/5 blur-xl rounded-full" />
        <span className="text-[9px] text-amber-400 font-bold uppercase tracking-widest block font-sans">Active Pass Specs</span>
        <h3 className="text-sm font-black text-white uppercase tracking-wider mt-0.5">Membership Account</h3>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-slate-950 border border-white/5 p-3.5 rounded-2xl">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Tier Level</span>
            <p className="text-xs font-black text-amber-300 mt-1 uppercase flex items-center gap-1.5">
              <Award className="h-4.5 w-4.5" />
              {localStorage.getItem("gym_user_tier") || userProfile.feePlan || "Gold VIP"}
            </p>
          </div>
          <div className="bg-slate-950 border border-white/5 p-3.5 rounded-2xl">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Auto Renewal</span>
            <p className="text-xs font-black text-emerald-400 mt-1 uppercase">
              Enabled (Stripe)
            </p>
          </div>
        </div>
      </div>

      {/* Goal demographics configuration settings form */}
      <form onSubmit={handleSaveGoalDemographics} className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
          <Settings className="h-4.5 w-4.5 text-indigo-400" />
          <h4 className="text-xs font-black text-slate-150 uppercase tracking-wider">Anabolic Profile Metrics</h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Core Target Goal</label>
            <select
              value={userGoal}
              onChange={(e) => setUserGoal(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-indigo-500 outline-none"
            >
              <option>Powerlifting Strength</option>
              <option>Bulk / Hypertrophy</option>
              <option>Leanness / Shredding</option>
              <option>Cardio Stamina</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Height (ft'in")</label>
            <input
              type="text"
              value={userHeight}
              onChange={(e) => setUserHeight(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white font-mono focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">User Age</label>
            <input
              type="number"
              value={userAge}
              onChange={(e) => setUserAge(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white font-mono focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Current Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={userWeight}
              onChange={(e) => setUserWeight(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white font-mono focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {goalSaved && (
          <p className="text-[10px] text-emerald-400 text-center font-bold animate-bounce leading-none">
            ✔ Profile metrics saved successfully.
          </p>
        )}

        <button
          type="submit"
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all"
        >
          <Save className="h-4 w-4 shrink-0 text-indigo-200" />
          Lock Biometric Specs
        </button>
      </form>

      {/* Renewal Quick Premium checkout tiers */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow-lg space-y-4">
        <div>
          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest block">Renew subscription</span>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Premium Payment Tiers</h3>
        </div>

        {/* Level selection */}
        <div className="grid grid-cols-3 gap-2">
          {["silver", "gold", "platinum"].map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setActiveTierSelected(tier as any)}
              className={`py-2 text-[10.5px] font-black uppercase rounded-lg border cursor-pointer transition-all select-none ${
                activeTierSelected === tier
                  ? "bg-amber-500 text-slate-950 border-transparent shadow shadow-amber-500/20"
                  : "bg-slate-950 text-slate-400 border-white/5 hover:border-white/10"
              }`}
            >
              {tier} Pass
            </button>
          ))}
        </div>

        {/* Cycle Selection */}
        <div className="flex bg-slate-950 border border-white/5 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`flex-1 py-1.5 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
              billingCycle === "monthly" ? "bg-slate-850 text-white" : "text-slate-500"
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`flex-1 py-1.5 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
              billingCycle === "yearly" ? "bg-slate-850 text-white" : "text-slate-500"
            }`}
          >
            Yearly Saver (-15%)
          </button>
        </div>

        {/* Display Cost */}
        <div className="flex items-center justify-between bg-slate-950 border border-white/5 py-3.5 px-4 rounded-2xl">
          <div>
            <h4 className="text-xs font-black text-white uppercase">Checkout Amount</h4>
            <p className="text-[10px] text-slate-500">Auto renew authorized</p>
          </div>
          <span className="font-mono text-base font-black text-white">
            ₹{calculateRenewCost().toLocaleString("en-IN")}.00
          </span>
        </div>

        <button
          onClick={() => setShowPayModal(true)}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-[0.98] transition-transform"
        >
          <CreditCard className="h-4 w-4" />
          RENEW MEMBERSHIP NOW
        </button>
      </div>

      {/* Invoice receipt history section */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice receipts</h3>
        
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="font-mono text-[9px] text-slate-500 uppercase">{inv.id} • {inv.date}</span>
                <h4 className="text-xs font-black text-slate-200 mt-1">{inv.plan}</h4>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Stripe Gateway • Code 100-SUCCESS</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-[11.5px] font-bold text-white shrink-0">{inv.amount}</span>
                <button
                  type="button"
                  onClick={() => triggerDownloadInvoice(inv)}
                  className="p-2 bg-slate-850 hover:bg-slate-800 border border-white/5 hover:border-white/10 text-indigo-400 hover:text-indigo-300 rounded-xl cursor-pointer shadow-inner active:scale-95 shrink-0"
                  title="Download receipt Invoice PDF"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone & Account Management */}
      <div className="bg-slate-900 border border-red-500/10 rounded-3xl p-5 shadow-lg space-y-4">
        <div>
          <span className="text-[9px] text-rose-400 font-bold uppercase tracking-widest block font-sans">System Security</span>
          <h3 className="text-sm font-black text-rose-100 uppercase tracking-wider mt-0.5">Danger Zone Settings</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-[0.98] transition-all"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>

          <button
            type="button"
            onClick={() => {
              setShowDeleteConfirm(true);
              setDeletePassword("");
              setDeleteError("");
            }}
            className="py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-black tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-[0.98] transition-all"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </button>
        </div>
      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <LogOut className="h-5.5 w-5.5 text-amber-500" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider font-sans">Confirm Logout?</h4>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Are you sure you want to end your active training session and sign out of your account profile?
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 bg-slate-850 hover:bg-slate-800 border border-white/5 rounded-xl text-xs text-slate-300 font-bold active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettingsLogout}
                disabled={isLoggingOut}
                className="py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isLoggingOut ? "Exiting..." : "Exit Gym Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/25 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Trash2 className="h-5.5 w-5.5 text-red-500" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider font-sans">Delete Account Profile</h4>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              ⚠️ Warning: This action is irreversible. All of your progress logs, biometric journal specs, streaks, and invoices will be permanently destroyed.
            </p>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-sans">Enter Password to Confirm</label>
              <div className="flex h-10 w-full bg-slate-950 border border-white/5 focus-within:border-red-500/50 rounded-xl px-3 items-center text-xs">
                <Lock className="h-4 w-4 text-slate-500 shrink-0 mr-2" />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="bg-transparent outline-none text-white w-full h-full font-sans"
                />
              </div>
            </div>

            {deleteError && (
              <p className="text-[10px] text-red-400 font-bold font-sans">
                {deleteError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                disabled={isDeleting}
                className="py-2.5 bg-slate-850 hover:bg-slate-800 border border-white/5 rounded-xl text-xs text-slate-300 font-bold active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettingsDeleteAccount}
                disabled={isDeleting}
                className="py-2.5 bg-red-600 hover:bg-red-550 disabled:opacity-50 text-white font-black text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAY MODAL GATEWAY SIMULATOR */}
      {showPayModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSimulatePaymentProcess} className="bg-slate-900 border border-white/10 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3 justify-center">
              <Lock className="h-5.5 w-5.5 text-amber-500" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Secured Vault Sandbox Checkout</h4>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Select billing total payment</label>
                <div className="bg-slate-950 border border-white/5 py-2 px-3 rounded-xl text-center">
                  <span className="text-xs text-slate-400">Renewing {activeTierSelected.toUpperCase()} Pass for:</span>
                  <span className="font-mono text-sm font-black text-white block mt-0.5">₹{calculateRenewCost().toLocaleString("en-IN")}.00</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Card Holder Brand</label>
                <div className="flex h-10 w-full bg-slate-950 border border-transparent focus-within:border-indigo-505 rounded-xl px-3 items-center text-xs">
                  <User className="h-4 w-4 text-slate-500 shrink-0 mr-2" />
                  <input
                    type="text"
                    required
                    placeholder="E.g., Arjun Sharma"
                    className="bg-transparent outline-none text-white w-full h-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Credit Card specs (Card #)</label>
                <div className="flex h-10 w-full bg-slate-950 border border-transparent focus-within:border-indigo-505 rounded-xl px-3 items-center text-xs">
                  <CreditCard className="h-4 w-4 text-slate-500 shrink-0 mr-2" />
                  <input
                    type="text"
                    required
                    placeholder="4000 1234 5678 9010"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="bg-transparent outline-none text-white w-full h-full font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Expiry (Month/Yr)</label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-indigo-500 font-mono text-center"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">CVV Secure code</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="***"
                    value={cardCVV}
                    onChange={(e) => setCardCVV(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-indigo-500 font-mono text-center"
                  />
                </div>
              </div>
            </div>

            {payStatus === "processing" && (
              <div className="text-center py-2 space-y-1.5 animate-pulse">
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[10px] text-amber-400 font-black">Authorized Vault checking token handshake...</p>
              </div>
            )}

            {payStatus === "success" && (
              <p className="text-[11px] text-emerald-400 font-black text-center animate-bounce leading-none">
                ✔ Success! Stripe webhook authed. New invoice receipt added.
              </p>
            )}

            {payStatus === "error" && (
              <p className="text-[11px] text-rose-450 font-black text-center animate-shake leading-none">
                ❌ Error: Card parameters invalid. Please try again.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="py-2 bg-slate-850 hover:bg-slate-800 border border-white/5 rounded-xl text-xs text-slate-300 font-bold active:scale-95 transition-all cursor-pointer"
              >
                Cancel Renewal
              </button>
              <button
                type="submit"
                className="py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs active:scale-95 transition-all shadow-md shadow-amber-500/10 cursor-pointer"
              >
                Authorize Pre-pay
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
