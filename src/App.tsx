import React, { useState, useEffect } from "react";
import { Dumbbell } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import MobileFrame from "./components/MobileFrame";
import AuthScreen from "./components/AuthScreen";
import AdminPanel from "./components/AdminPanel";
import CustomerPanel from "./components/CustomerPanel";
import PremiumBackground3D from "./components/PremiumBackground3D";
import VerifyQRDirect from "./components/VerifyQRDirect";
import {
  isFirebaseConfigured,
  subscribeToAuthChanges,
  loginAsSimulatedCustomer,
  logoutUser,
  subscribeToAttendanceLogs,
  AuthUserState,
} from "./firebase";
import { AttendanceLog } from "./types";

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUserState | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerifyQRRoute, setIsVerifyQRRoute] = useState(false);

  // Detect direct QR code link scans (Google Lens target)
  useEffect(() => {
    if (window.location.pathname === "/verify-qr" || window.location.search.includes("verify-qr")) {
      setIsVerifyQRRoute(true);
    }
  }, []);

  // Authenticate user & track authentication state dynamically
  useEffect(() => {
    if (isFirebaseConfigured) {
      setLoading(true);
      const unsubscribe = subscribeToAuthChanges((user) => {
        setCurrentUser(user);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Local simulation: check localStorage for saved session
      const saved = localStorage.getItem("gym_demo_current_user");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.uid) {
            if (parsed.role === "admin") {
              const adminUser: AuthUserState = {
                uid: parsed.uid,
                name: parsed.name,
                email: parsed.email,
                role: "admin",
                profile: {
                  uid: parsed.uid,
                  name: parsed.name,
                  email: parsed.email,
                  role: "admin",
                  joinedAt: new Date().toISOString(),
                  membershipStatus: "active",
                  feeStatus: "paid",
                  feeDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                },
              };
              setCurrentUser(adminUser);
            } else {
              const customerUser = loginAsSimulatedCustomer(parsed.email, parsed.name, parsed.uid);
              setCurrentUser(customerUser);
            }
          }
        } catch (e) {
          console.error("Failed to restore simulated session", e);
        }
      }
      setLoading(false);
    }
  }, []);

  // Track customer attendance logs when logged in
  useEffect(() => {
    if (!currentUser || currentUser.role !== "customer") {
      setAttendanceLogs([]);
      return;
    }
    const unsubscribe = subscribeToAttendanceLogs(currentUser, (logs) => {
      setAttendanceLogs(logs);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Handle successful login
  const handleLogin = (role: "admin" | "customer", email: string, name: string, uid: string) => {
    if (isFirebaseConfigured) {
      // Firebase triggers onAuthStateChanged which propagates to subscribeToAuthChanges
    } else {
      const userSession = { role, email, name, uid };
      localStorage.setItem("gym_demo_current_user", JSON.stringify(userSession));
      if (role === "admin") {
        const adminUser: AuthUserState = {
          uid,
          name,
          email,
          role: "admin",
          profile: {
            uid,
            name,
            email,
            role: "admin",
            joinedAt: new Date().toISOString(),
            membershipStatus: "active",
            feeStatus: "paid",
            feeDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          },
        };
        setCurrentUser(adminUser);
      } else {
        const customerUser = loginAsSimulatedCustomer(email, name, uid);
        setCurrentUser(customerUser);
      }
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        await logoutUser();
      } else {
        localStorage.removeItem("gym_demo_current_user");
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("gym_theme");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  useEffect(() => {
    localStorage.setItem("gym_theme", theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <>
      <PremiumBackground3D />
      <MobileFrame
        isSimulatingFirebase={!isFirebaseConfigured}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-gateway"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col items-center justify-center p-6 text-white min-h-[400px]"
              id="app-loading"
            >
              <div className="relative">
                <Dumbbell className="w-12 h-12 text-amber-500 animate-bounce" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
              </div>
              <span className="text-sm font-semibold tracking-wide text-slate-300 mt-6 block font-mono text-center">
                ★ SYNCHRONIZING SECURE GATEWAY... ★
              </span>
            </motion.div>
          ) : isVerifyQRRoute ? (
            <motion.div
              key="verify-qr-gateway"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full flex flex-col flex-1"
            >
              <VerifyQRDirect
                currentUser={currentUser}
                onLogin={handleLogin}
                onClose={() => {
                  window.history.pushState({}, "", "/");
                  setIsVerifyQRRoute(false);
                }}
              />
            </motion.div>
          ) : !currentUser ? (
            <motion.div
              key="auth-gateway"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full h-full flex flex-col flex-1"
            >
              <AuthScreen onLogin={handleLogin} isLoading={loading} />
            </motion.div>
          ) : currentUser.role === "admin" ? (
            <motion.div
              key="admin-gateway"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="w-full h-full flex flex-col flex-1"
            >
              <AdminPanel adminEmail={currentUser.email} onLogout={handleLogout} />
            </motion.div>
          ) : (
            currentUser.profile && (
              <motion.div
                key="customer-gateway"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                className="w-full h-full flex flex-col flex-1"
              >
                <CustomerPanel
                  userProfile={currentUser.profile}
                  attendanceLogs={attendanceLogs}
                  onLogout={handleLogout}
                />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </MobileFrame>
    </>
  );
}
