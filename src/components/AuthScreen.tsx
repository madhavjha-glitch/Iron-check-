import React, { useState } from "react";
import { Dumbbell, LogIn, ArrowRight, ShieldCheck, UserCheck, UserPlus, Sparkles, Eye, EyeOff, X, KeyRound, Mail } from "lucide-react";
import { motion } from "motion/react";
import { isFirebaseConfigured, registerWithEmailAndPass, loginWithEmailAndPass } from "../firebase";

const DEFAULT_PASSWORDS: Record<string, string> = {
  "madhavjha514@gmail.com": "admin123",
  "arjun.gym@gmail.com": "pass123",
  "jessica.fit@gmail.com": "pass123",
  "rohan.iron@gmail.com": "pass123"
};

const getStoredPasswords = (): Record<string, string> => {
  const stored = localStorage.getItem("gym_demo_passwords");
  if (!stored) {
    localStorage.setItem("gym_demo_passwords", JSON.stringify(DEFAULT_PASSWORDS));
    return DEFAULT_PASSWORDS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return DEFAULT_PASSWORDS;
  }
};

const saveStoredPassword = (email: string, pass: string) => {
  const passwords = getStoredPasswords();
  passwords[email.trim().toLowerCase()] = pass;
  localStorage.setItem("gym_demo_passwords", JSON.stringify(passwords));
};

interface AuthScreenProps {
  onLogin: (role: "admin" | "customer", email: string, name: string, uid: string) => void;
  isLoading: boolean;
  onTriggerGoogleAuth?: () => Promise<void>;
}

export default function AuthScreen({
  onLogin,
  isLoading,
  onTriggerGoogleAuth,
}: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [localProgress, setLocalProgress] = useState(false);
  const [typedEmail, setTypedEmail] = useState("");
  const [typedPassword, setTypedPassword] = useState("");
  const [typedName, setTypedName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"customer" | "admin">("customer");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupRole, setSignupRole] = useState<"customer" | "admin">("customer");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Google credential simulation states
  const [showGoogleSimChooser, setShowGoogleSimChooser] = useState(false);
  const [simGoogleCustomEmail, setSimGoogleCustomEmail] = useState("");
  const [simGoogleCustomName, setSimGoogleCustomName] = useState("");
  const [simGoogleCustomPassword, setSimGoogleCustomPassword] = useState("");
  const [simGoogleCustomRole, setSimGoogleCustomRole] = useState<"customer" | "admin">("customer");
  const [simCustomLoading, setSimCustomLoading] = useState(false);
  const [simSuccessMsg, setSimSuccessMsg] = useState("");

  const [selectedSimUser, setSelectedSimUser] = useState<{
    role: "admin" | "customer";
    email: string;
    name: string;
    uid: string;
  } | null>(null);
  const [simEnteredPassword, setSimEnteredPassword] = useState("");
  const [showSimPassword, setShowSimPassword] = useState(false);
  const [simPasswordError, setSimPasswordError] = useState("");
  
  // Custom secure password recovery states
  const [isResettingSimPassword, setIsResettingSimPassword] = useState(false);
  const [newSimPassword, setNewSimPassword] = useState("");
  const [confirmNewSimPassword, setConfirmNewSimPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const getCustomUsers = () => {
    try {
      const stored = localStorage.getItem("gym_demo_users");
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      const presets = ["madhavjha514@gmail.com", "arjun.gym@gmail.com", "jessica.fit@gmail.com", "rohan.iron@gmail.com"];
      return parsed.filter((u: any) => u && u.email && !presets.includes(u.email.toLowerCase()));
    } catch (e) {
      return [];
    }
  };

  const handleGoogleButtonClick = () => {
    if (isFirebaseConfigured && onTriggerGoogleAuth) {
      onTriggerGoogleAuth()
        .catch((err: any) => {
          setErrorMsg(err.message || "Google single sign-on failed.");
        });
    } else {
      setShowGoogleSimChooser(true);
    }
  };

  const handleCustomLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedEmail) {
      setErrorMsg("Please provide an email address.");
      return;
    }
    if (!typedPassword) {
      setErrorMsg("Please provide a password.");
      return;
    }
    const cleanEmail = typedEmail.trim().toLowerCase();

    if (isFirebaseConfigured) {
      setLocalProgress(true);
      setErrorMsg("");
      loginWithEmailAndPass(cleanEmail, typedPassword)
        .then(() => {
          setLocalProgress(false);
        })
        .catch((err) => {
          let message = "Failed to sign in.";
          if (err instanceof Error) {
            if (err.message.includes("auth/invalid-credential") || err.message.includes("auth/wrong-password") || err.message.includes("auth/user-not-found")) {
              message = "Incorrect email or password. Please verify your credentials.";
            } else if (err.message.includes("auth/invalid-email")) {
              message = "Please enter a valid email address.";
            } else {
              message = err.message;
            }
          }
          setErrorMsg(message);
          setLocalProgress(false);
        });
      return;
    }
    
    // Validate password
    const passwords = getStoredPasswords();
    const expectedPass = passwords[cleanEmail];
    
    // Enforce password correctness to prevent unauthorized login to other users' accounts
    if (expectedPass && expectedPass !== typedPassword) {
      setErrorMsg("Access Denied: Incorrect password. To protect user privacy, you cannot log in to this account of others.");
      return;
    }

    const localUsers = JSON.parse(localStorage.getItem("gym_demo_users") || "[]");
    const existingUser = localUsers.find((u: any) => u.email === cleanEmail);
    const finalName = existingUser ? existingUser.name : (typedName.trim() || (selectedRole === "admin" ? "Gym Manager" : "Fitness Member"));

    let role = selectedRole;
    let uid = `sim_${role}_${Date.now()}`;

    // Verify admin email authority (checking both bootstrapped admin and secondary registered admins)
    const localAdmins: string[] = JSON.parse(localStorage.getItem("gym_demo_admins") || "[]");
    const isMainAdmin = cleanEmail === "madhavjha514@gmail.com";
    const isAuthorizedAdmin = isMainAdmin || localAdmins.includes(cleanEmail);

    if (role === "admin" && !isAuthorizedAdmin) {
      setErrorMsg("Access Refused: Only authorized admin emails are permitted to access the Admin Panel.");
      return;
    }

    if (isAuthorizedAdmin) {
      role = "admin";
      uid = isMainAdmin ? "sim_admin_uid" : `sim_admin_${Date.now()}`;
    }

    // Save password for this email if it is a new sandbox login (registers password)
    if (!expectedPass) {
      saveStoredPassword(cleanEmail, typedPassword);
    }

    onLogin(role, cleanEmail, finalName, uid);
  };

  const handleCustomSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!signupEmail.trim()) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!signupPassword || signupPassword.length < 4) {
      setErrorMsg("Please choose a password with at least 4 characters.");
      return;
    }

    const cleanEmail = signupEmail.trim().toLowerCase();

    if (isFirebaseConfigured) {
      setLocalProgress(true);
      setErrorMsg("");
      setSuccessMsg("");
      registerWithEmailAndPass(cleanEmail, signupPassword, signupName.trim())
        .then(() => {
          if (signupRole === "admin") {
            setSuccessMsg("Registration successful! Note: Firebase admin rights require central security rule approval. Sign in as madhavjha514@gmail.com for master Admin capabilities.");
          } else {
            setSuccessMsg("Registration successful! Syncing portal records...");
          }
          setTimeout(() => {
            setLocalProgress(false);
          }, 2000);
        })
        .catch((err) => {
          let message = "Failed to sign up.";
          if (err instanceof Error) {
            if (err.message.includes("auth/email-already-in-use")) {
              message = "This email is already in use by another gym account.";
            } else if (err.message.includes("auth/weak-password")) {
              message = "The chosen password is too weak. Please use at least 6 characters.";
            } else {
              message = err.message;
            }
          }
          setErrorMsg(message);
          setLocalProgress(false);
        });
      return;
    }
    
    // Check if user already exists
    const localUsers = JSON.parse(localStorage.getItem("gym_demo_users") || "[]");
    if (localUsers.some((u: any) => u.email === cleanEmail) || cleanEmail === "madhavjha514@gmail.com") {
      setErrorMsg("This email is already registered. Please sign in instead.");
      return;
    }

    const finalName = signupName.trim();
    const isSignupAdmin = signupRole === "admin";
    const role = isSignupAdmin ? "admin" : "customer";
    const uid = isSignupAdmin ? `sim_admin_${Date.now()}` : `sim_customer_${Date.now()}`;

    // Save custom credential password
    saveStoredPassword(cleanEmail, signupPassword);

    // Save as local authorized admin if registered as Admin
    if (isSignupAdmin) {
      const localAdmins = JSON.parse(localStorage.getItem("gym_demo_admins") || "[]");
      if (!localAdmins.includes(cleanEmail)) {
        localAdmins.push(cleanEmail);
        localStorage.setItem("gym_demo_admins", JSON.stringify(localAdmins));
      }
    }

    // Save profile to local users
    localUsers.push({
      uid,
      name: finalName,
      email: cleanEmail,
      role,
      joinedAt: new Date().toISOString(),
      membershipStatus: "active",
      feeStatus: isSignupAdmin ? "paid" : "unpaid",
      feeDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    localStorage.setItem("gym_demo_users", JSON.stringify(localUsers));

    setSuccessMsg(`Registration successful! Setup your administrator workspace...`);
    setErrorMsg("");

    setTimeout(() => {
      onLogin(role, cleanEmail, finalName, uid);
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Decorative glass glow blobs - Premium Ambient Radiance */}
      <div className="absolute top-[-10%] left-[-20%] w-[220px] h-[220px] rounded-full bg-indigo-600/15 blur-[70px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[250px] h-[250px] rounded-full bg-violet-600/10 blur-[90px] pointer-events-none"></div>

      {/* Header section with Premium Serif Accent */}
      <div className="text-center pt-8 z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 text-white border border-indigo-500/30 shadow-lg mb-4"
        >
          <Dumbbell className="w-7 h-7 text-indigo-400" />
        </motion.div>
        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-3xl font-extrabold tracking-tight text-white mb-1"
        >
          IRON <span className="font-serif italic font-normal text-indigo-400">check</span>
        </motion.h1>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-xs text-slate-400 font-bold tracking-widest uppercase"
        >
          Core strength & biometric entryway
        </motion.p>
      </div>

      {/* Main interaction content */}
      <div className="my-auto z-10 py-4 w-full max-w-md mx-auto">
        {/* Auth Mode Toggle Tabs - Sleek Dark Design */}
        <div className="flex bg-slate-900 p-1.5 rounded-2xl mb-6 border border-white/5">
          <button
            type="button"
            onClick={() => {
              setAuthMode("signin");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authMode === "signin"
                ? "bg-indigo-600/25 text-white border border-indigo-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("signup");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authMode === "signup"
                ? "bg-indigo-600/25 text-white border border-indigo-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Sign Up
          </button>
        </div>

        {/* Content for Sign In Mode */}
        {authMode === "signin" ? (
          <div className="space-y-5">
            {/* Luxe Gold Theme Sign-In */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 text-center shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full pointer-events-none"></div>
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-3 animate-pulse" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Simulated Biometric Gate</h3>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Connect your verified credentials to authorize gateway permissions and synchronize active membership health metrics.
              </p>
              
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleGoogleButtonClick}
                  className="relative overflow-hidden w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-3 shadow-[0_4px_15px_rgba(99,102,241,0.3)] border border-indigo-500/50 hover:border-indigo-400 active:scale-[0.98] cursor-pointer group"
                >
                  <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#e0e7ff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#c7d2fe" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span className="tracking-wider uppercase font-sans font-extrabold text-[11px]">ACCESS DIGITAL WORKSPACE</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Content for Sign Up Mode */
          <div className="space-y-5">
            {/* Luxe Gold Theme Sign-Up */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 text-center shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full pointer-events-none"></div>
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-3 animate-bounce" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Instant Membership Key</h3>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Create a high-tier premium gym membership or register your central admin panel immediately using single sign-on security.
              </p>
              
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleGoogleButtonClick}
                  className="relative overflow-hidden w-full bg-indigo-600 hover:bg-indigo-50 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-3 shadow-[0_4px_15px_rgba(99,102,241,0.3)] border border-indigo-500/50 hover:border-indigo-400 active:scale-[0.98] cursor-pointer group"
                >
                  <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#e0e7ff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#c7d2fe" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span className="tracking-wider uppercase font-sans font-extrabold text-[11px]">REGISTER MEMBER PROFILE</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="text-center pb-2 z-10">
        <p className="text-[10px] text-slate-400">
          zymnix - Intelligent Gym Suite v2.4.0
        </p>
        <p className="text-[9px] text-slate-400 mt-1">
          Secure biometric token handshake & full-stack replication
        </p>
      </div>

      {/* SIMULATED GOOGLE AUTH CHOOSER DIALOG */}
      {showGoogleSimChooser && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-[340px] bg-slate-900 rounded-3xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] overflow-hidden border border-white/15 flex flex-col justify-between"
          >
            {/* Header / Google Brand Banner */}
            <div className="p-6 text-center pb-4 border-b border-white/10 relative bg-slate-950/30">
              <button
                type="button"
                onClick={() => {
                  if (selectedSimUser) {
                    setSelectedSimUser(null);
                    setSimEnteredPassword("");
                    setSimPasswordError("");
                  } else {
                    setShowGoogleSimChooser(false);
                    setSimGoogleCustomEmail("");
                    setSimGoogleCustomName("");
                    setSimGoogleCustomPassword("");
                    setSimSuccessMsg("");
                  }
                }}
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors p-1"
                title={selectedSimUser ? "Back to account list" : "Exit single sign-on"}
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Google stylized logo in gold */}
              <div className="flex justify-center items-center gap-0.5 mb-2.5 font-bold text-lg select-none tracking-tight">
                <span className="text-amber-600 font-extrabold text-xl">G</span>
                <span className="text-amber-500 font-extrabold text-xl">o</span>
                <span className="text-yellow-500 font-extrabold text-xl">o</span>
                <span className="text-amber-600 font-extrabold text-xl">g</span>
                <span className="text-yellow-600 font-extrabold text-xl">l</span>
                <span className="text-amber-500 font-extrabold text-xl">e</span>
                <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded-sm ml-1 uppercase shadow-xs">Gold</span>
              </div>
              <h3 className="text-sm font-black text-white tracking-tight">
                {selectedSimUser ? "Identity Verification" : "VIP Account Gateway"}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                {selectedSimUser ? (
                  <span>Please enter security password to unlock portal access</span>
                ) : (
                  <span>to access exclusive <span className="font-serif italic font-bold text-indigo-400">Zymnix Gym Workspace</span></span>
                )}
              </p>
            </div>

            {selectedSimUser ? (
              isResettingSimPassword ? (
                /* Password Reset Screen */
                <div className="p-5 space-y-4">
                  <div className="flex flex-col items-center text-center bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-2xl">
                    <div className="w-11 h-11 rounded-full bg-indigo-600/20 text-indigo-400 font-bold text-xs uppercase flex items-center justify-center border border-indigo-505/20 mb-2 animate-bounce">
                      <KeyRound className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h4 className="text-xs font-black text-white">Set Security Password</h4>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{selectedSimUser.email}</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="At least 4 characters"
                          value={newSimPassword}
                          onChange={(e) => {
                            setNewSimPassword(e.target.value);
                            setSimPasswordError("");
                          }}
                          className="w-full bg-slate-950 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 pl-3 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-0.5"
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                        Confirm Password
                      </label>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Repeat password"
                        value={confirmNewSimPassword}
                        onChange={(e) => {
                          setConfirmNewSimPassword(e.target.value);
                          setSimPasswordError("");
                        }}
                        className="w-full bg-slate-950 border border-white/10 focus:border-indigo-500/40 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>

                    {simPasswordError && (
                      <p className="text-[9px] text-rose-500 font-extrabold text-center mt-1">
                        {simPasswordError}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResettingSimPassword(false);
                        setNewSimPassword("");
                        setConfirmNewSimPassword("");
                        setSimPasswordError("");
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 font-bold py-2 rounded-xl text-[11px] transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newSimPassword) {
                          setSimPasswordError("New password is required.");
                          return;
                        }
                        if (newSimPassword.length < 4) {
                          setSimPasswordError("Password must be at least 4 characters.");
                          return;
                        }
                        if (newSimPassword !== confirmNewSimPassword) {
                          setSimPasswordError("Passwords do not match.");
                          return;
                        }

                        saveStoredPassword(selectedSimUser.email, newSimPassword.trim());
                        setSimEnteredPassword(newSimPassword.trim());
                        setIsResettingSimPassword(false);
                        setNewSimPassword("");
                        setConfirmNewSimPassword("");
                        setSimPasswordError("");
                        setSimSuccessMsg("Password updated successfully! Enter it below to unlock.");
                        setTimeout(() => setSimSuccessMsg(""), 5000);
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-2 rounded-xl text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md active:scale-[0.98]"
                    >
                      Save Password
                    </button>
                  </div>
                </div>
              ) : (
                /* Password Verification Screen */
                <div className="p-5 space-y-4">
                  <div className="flex flex-col items-center text-center bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-2xl">
                    <div className="w-11 h-11 rounded-full bg-indigo-600/20 text-indigo-400 font-bold text-xs uppercase flex items-center justify-center border border-indigo-500/30 mb-2">
                      {selectedSimUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <h4 className="text-xs font-black text-white">{selectedSimUser.name}</h4>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{selectedSimUser.email}</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                        Enter Security Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsResettingSimPassword(true);
                          setNewSimPassword("");
                          setConfirmNewSimPassword("");
                          setSimPasswordError("");
                        }}
                        className="text-[9px] text-indigo-405 text-indigo-400 hover:text-indigo-300 font-extrabold hover:underline uppercase tracking-wide cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showSimPassword ? "text" : "password"}
                        placeholder={selectedSimUser.email === "madhavjha514@gmail.com" ? "Password (admin123)" : "Password (pass123)"}
                        value={simEnteredPassword}
                        onChange={(e) => {
                          setSimEnteredPassword(e.target.value);
                          setSimPasswordError("");
                        }}
                        className="w-full bg-slate-950 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 pl-3 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSimPassword(!showSimPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-0.5"
                      >
                        {showSimPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    
                    {simPasswordError && (
                      <p className="text-[9px] text-rose-500 font-extrabold text-center mt-1">
                        {simPasswordError}
                      </p>
                    )}
                    {simSuccessMsg && (
                      <p className="text-[9px] text-emerald-400 font-extrabold text-center mt-1">
                        {simSuccessMsg}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSimUser(null);
                        setSimEnteredPassword("");
                        setSimPasswordError("");
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 font-bold py-2 rounded-xl text-[11px] transition-all cursor-pointer text-center"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={simCustomLoading}
                      onClick={() => {
                        if (!simEnteredPassword) {
                          setSimPasswordError("Password is required.");
                          return;
                        }

                        const passwords = getStoredPasswords();
                        const correctPassword = passwords[selectedSimUser.email.trim().toLowerCase()];
                        const expectedPass = correctPassword || (selectedSimUser.email === "madhavjha514@gmail.com" ? "admin123" : "pass123");

                        if (simEnteredPassword !== expectedPass) {
                          setSimPasswordError("Access Denied: Incorrect password for this account.");
                          return;
                        }

                        setSimCustomLoading(true);
                        setTimeout(() => {
                          setSimCustomLoading(false);
                          setShowGoogleSimChooser(false);
                          onLogin(selectedSimUser.role, selectedSimUser.email, selectedSimUser.name, selectedSimUser.uid);
                        }, 1000);
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-850 text-white font-extrabold py-2 rounded-xl text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md active:scale-[0.98]"
                    >
                      {simCustomLoading ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Authenticating...
                        </>
                      ) : (
                        "Open Gym Portal"
                      )}
                    </button>
                  </div>
                </div>
              )
            ) : (
              /* Account Chooser & Signup Panel */
              <>
                {/* Account List */}
                <div className="p-4 space-y-2 max-h-[200px] overflow-y-auto">
                  {/* Bootstrapped Admin */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSimUser({
                        role: "admin",
                        email: "madhavjha514@gmail.com",
                        name: "Madhav Jha",
                        uid: "sim_admin_uid"
                      });
                      setSimEnteredPassword("");
                      setSimPasswordError("");
                    }}
                    className="w-full p-2.5 rounded-2xl bg-slate-950/40 hover:bg-white/5 border border-white/5 hover:border-indigo-500/40 text-left transition-all flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-600/20 text-indigo-400 font-bold text-xs uppercase flex items-center justify-center border border-indigo-500/20">
                      MJ
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-white">Madhav Jha</span>
                        <span className="text-[8px] bg-indigo-950 text-indigo-400 font-bold uppercase px-1.5 py-0.2 rounded-md border border-indigo-500/30">Founder Admin</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate leading-none mt-0.5">madhavjha514@gmail.com</span>
                    </div>
                  </button>

                  {/* Simulated Customer Preset 1 */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSimUser({
                        role: "customer",
                        email: "arjun.gym@gmail.com",
                        name: "Arjun Sharma",
                        uid: "user_cust1"
                      });
                      setSimEnteredPassword("");
                      setSimPasswordError("");
                    }}
                    className="w-full p-2.5 rounded-2xl bg-slate-950/40 hover:bg-white/5 border border-white/5 hover:border-indigo-500/40 text-left transition-all flex items-center gap-3 cursor-pointer"
                  >
                    <div className="w-8 h-8 shrink-0 rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs uppercase flex items-center justify-center border border-amber-500/20">
                      AS
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-white text-left">Arjun Sharma</span>
                        <span className="text-[8px] bg-emerald-950 text-emerald-400 font-bold uppercase px-1.5 py-0.2 rounded-md border border-emerald-500/20">Active Member</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate leading-none mt-0.5">arjun.gym@gmail.com</span>
                    </div>
                  </button>

                  {/* Simulated Customer Preset 2 */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSimUser({
                        role: "customer",
                        email: "jessica.fit@gmail.com",
                        name: "Jessica Miller",
                        uid: "user_cust2"
                      });
                      setSimEnteredPassword("");
                      setSimPasswordError("");
                    }}
                    className="w-full p-2.5 rounded-2xl bg-slate-950/40 hover:bg-white/5 border border-white/5 hover:border-indigo-500/40 text-left transition-all flex items-center gap-3 cursor-pointer"
                  >
                    <div className="w-8 h-8 shrink-0 rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs uppercase flex items-center justify-center border border-amber-500/20">
                      JM
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-white text-left">Jessica Miller</span>
                        <span className="text-[8px] bg-rose-950 text-rose-400 font-bold uppercase px-1.5 py-0.2 rounded-md animate-pulse border border-rose-500/20">Overdue Arrears</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate leading-none mt-0.5">jessica.fit@gmail.com</span>
                    </div>
                  </button>

                  {/* Custom dynamically registered user accounts */}
                  {getCustomUsers().map((u: any) => {
                    const initials = u.name ? u.name.slice(0, 2).toUpperCase() : "CU";
                    const displayRole = u.role === "admin" ? "Co-Admin" : "Member";
                    return (
                      <button
                        key={u.email}
                        type="button"
                        onClick={() => {
                          setSelectedSimUser({
                            role: u.role,
                            email: u.email,
                            name: u.name,
                            uid: u.uid || `sim_google_${Date.now()}`
                          });
                          setSimEnteredPassword("");
                          setSimPasswordError("");
                        }}
                        className="w-full p-2.5 rounded-2xl bg-slate-950/40 hover:bg-white/5 border border-white/5 hover:border-indigo-500/40 text-left transition-all flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-xs uppercase flex items-center justify-center border border-indigo-500/20">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs font-bold text-white text-left">{u.name}</span>
                            <span className="text-[8px] bg-indigo-950 text-indigo-400 font-bold uppercase px-1.5 py-0.2 rounded-md border border-indigo-500/30">
                              {displayRole}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate leading-none mt-0.5">{u.email}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Account Registration/Login Block */}
                <div className="bg-slate-950/80 p-4 border-t border-white/10 space-y-2">
                  <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest block font-sans">Use Custom Google Account</span>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Full Name (e.g. Rahul Sen)"
                      value={simGoogleCustomName}
                      onChange={(e) => setSimGoogleCustomName(e.target.value)}
                      className="w-full bg-slate-905 bg-slate-900 border border-white/10 focus:border-indigo-500 rounded-lg py-1.5 px-2.5 text-[11px] text-white placeholder-slate-500 focus:outline-none"
                    />
                    <input
                      type="email"
                      placeholder="name@gmail.com"
                      value={simGoogleCustomEmail}
                      onChange={(e) => setSimGoogleCustomEmail(e.target.value)}
                      className="w-full bg-slate-905 bg-slate-900 border border-white/10 focus:border-indigo-500 rounded-lg py-1.5 px-2.5 text-[11px] text-white placeholder-slate-500 focus:outline-none"
                    />
                    <input
                      type="password"
                      placeholder="Choose Security Password (e.g. pass123)"
                      value={simGoogleCustomPassword}
                      onChange={(e) => setSimGoogleCustomPassword(e.target.value)}
                      className="w-full bg-slate-905 bg-slate-900 border border-white/10 focus:border-indigo-500 rounded-lg py-1.5 px-2.5 text-[11px] text-white placeholder-slate-500 focus:outline-none"
                    />
                    
                    <div className="flex justify-between items-center bg-slate-900 border border-white/10 py-1.5 px-2.5 rounded-lg">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase font-sans">Google Sign-in Role</span>
                      <div className="flex gap-2.5">
                        <label className="text-[9px] text-slate-300 flex items-center gap-1 cursor-pointer font-bold">
                          <input
                            type="radio"
                            name="sim-google-role"
                            checked={simGoogleCustomRole === "customer"}
                            onChange={() => setSimGoogleCustomRole("customer")}
                            className="accent-indigo-505 accent-indigo-500 w-3 h-3"
                          />
                          Member
                        </label>
                        <label className="text-[9px] text-slate-300 flex items-center gap-1 cursor-pointer font-bold">
                          <input
                            type="radio"
                            name="sim-google-role"
                            checked={simGoogleCustomRole === "admin"}
                            onChange={() => setSimGoogleCustomRole("admin")}
                            className="accent-indigo-505 accent-indigo-500 w-3 h-3"
                          />
                          Admin
                        </label>
                      </div>
                    </div>

                    {simSuccessMsg && (
                      <p className="text-[9px] text-amber-600 font-extrabold text-center">
                        {simSuccessMsg}
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={simCustomLoading}
                      onClick={() => {
                        if (!simGoogleCustomEmail.trim() || !simGoogleCustomName.trim()) {
                          alert("Please fill in both simulated full name and gmail address.");
                          return;
                        }
                        if (!simGoogleCustomPassword.trim()) {
                          alert("Please choose a guard password for this secure system workspace.");
                          return;
                        }
                        const cleanEmail = simGoogleCustomEmail.trim().toLowerCase();
                        const cleanName = simGoogleCustomName.trim();
                        const isGoogleAdmin = simGoogleCustomRole === "admin";
                        const role = isGoogleAdmin ? "admin" : "customer";
                        const uid = isGoogleAdmin ? `sim_google_admin_${Date.now()}` : `sim_google_cust_${Date.now()}`;

                        setSimCustomLoading(true);
                        setSimSuccessMsg("Google Gold authorized successfully...");

                        // Save custom admin credentials locally
                        if (isGoogleAdmin) {
                          const localAdmins = JSON.parse(localStorage.getItem("gym_demo_admins") || "[]");
                          if (!localAdmins.includes(cleanEmail)) {
                            localAdmins.push(cleanEmail);
                            localStorage.setItem("gym_demo_admins", JSON.stringify(localAdmins));
                          }
                        }

                        // Register custom credential password
                        saveStoredPassword(cleanEmail, simGoogleCustomPassword);

                        // Save custom user profile locally
                        const localUsers = JSON.parse(localStorage.getItem("gym_demo_users") || "[]");
                        if (!localUsers.some((u: any) => u.email === cleanEmail)) {
                          localUsers.push({
                            uid,
                            name: cleanName,
                            email: cleanEmail,
                            role,
                            joinedAt: new Date().toISOString(),
                            membershipStatus: "active",
                            feeStatus: isGoogleAdmin ? "paid" : "unpaid",
                            feeDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                          });
                          localStorage.setItem("gym_demo_users", JSON.stringify(localUsers));
                        }

                        setTimeout(() => {
                          setSimCustomLoading(false);
                          setSelectedSimUser({
                            role,
                            email: cleanEmail,
                            name: cleanName,
                            uid
                          });
                          setSimEnteredPassword("");
                          setSimPasswordError("");
                        }, 1200);
                      }}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-400 disabled:to-slate-500 text-slate-950 font-black py-2 rounded-xl text-[10.5px] transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md active:scale-[0.98]"
                    >
                      {simCustomLoading ? (
                        <>
                          <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                          Authenticating...
                        </>
                      ) : (
                        "Authorize Google Gold SSO"
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="bg-amber-50/30 p-3 text-[9px] text-slate-400 flex justify-between tracking-wide border-t border-amber-500/5">
              <span>English (United States)</span>
              <div className="flex gap-2">
                <span>Help</span>
                <span>Privacy</span>
                <span>Terms</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
