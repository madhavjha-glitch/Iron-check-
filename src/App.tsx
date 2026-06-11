import React, { useState, useEffect } from "react";
import MobileFrame from "./components/MobileFrame";
import AuthScreen from "./components/AuthScreen";
import CustomerPanel from "./components/CustomerPanel";
import AdminPanel from "./components/AdminPanel";
import {
  isFirebaseConfigured,
  loginWithGooglePopup,
  loginAsSimulatedCustomer,
  logoutUser,
  subscribeToAuthChanges,
  subscribeToAttendanceLogs,
  AuthUserState,
} from "./firebase";
import { AttendanceLog, MemberProfile } from "./types";

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUserState | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulatingFirebase, setIsSimulatingFirebase] = useState(!isFirebaseConfigured);

  // Parse simulated session on mount so that page resets don't force relogins
  useEffect(() => {
    if (!isFirebaseConfigured) {
      const storedActiveUser = localStorage.getItem("gym_demo_active_session");
      if (storedActiveUser) {
        try {
          setCurrentUser(JSON.parse(storedActiveUser));
        } catch (e) {
          console.error("Could not parse simulation session");
        }
      }
    }
  }, []);

  // Set up Firebase Authentication listener if configured
  useEffect(() => {
    if (isFirebaseConfigured) {
      setIsSimulatingFirebase(false);
      setIsLoading(true);
      const unsubscribe = subscribeToAuthChanges((authUser) => {
        setCurrentUser(authUser);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, []);

  // Fetch / Subscribe to global gym check-in records (for statistics)
  useEffect(() => {
    // Both live and simulation hook to attendance lists with Query Enforcer support
    const unsubscribe = subscribeToAttendanceLogs(currentUser, (logs) => {
      setAttendanceLogs(logs);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Support one-click sandbox demo fast-tracks
  const handleDemoAccessLogin = (
    role: "admin" | "customer",
    email: string,
    name: string,
    uid: string
  ) => {
    setIsLoading(true);
    let userState: AuthUserState;

    if (role === "customer") {
      userState = loginAsSimulatedCustomer(email, name, uid);
    } else {
      userState = {
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
    }

    setCurrentUser(userState);
    if (!isFirebaseConfigured) {
      localStorage.setItem("gym_demo_active_session", JSON.stringify(userState));
    }
    setIsLoading(false);
  };

  // Handle Google OAuth and account authorization triggers
  const handleGoogleAuthTrigger = async () => {
    setIsLoading(true);
    try {
      const userState = await loginWithGooglePopup();
      setCurrentUser(userState);

      if (!isFirebaseConfigured) {
        localStorage.setItem("gym_demo_active_session", JSON.stringify(userState));
      }
    } catch (err) {
      console.warn("Google identification popup resolved or exited: ", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOutAction = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setCurrentUser(null);
      localStorage.removeItem("gym_demo_active_session");
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileFrame
      title={
        currentUser
          ? currentUser.role === "admin"
            ? "Gym Admin Panel"
            : "Gym Customer Portal"
          : "Ironstone Gym"
      }
      isSimulatingFirebase={isSimulatingFirebase}
    >
      {isLoading && !currentUser ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400 text-xs font-semibold mt-4 tracking-wider animate-pulse">
            SECURELY SYNCING GYM RECORDS...
          </span>
        </div>
      ) : currentUser ? (
        currentUser.role === "admin" ? (
          <AdminPanel adminEmail={currentUser.email} onLogout={handleSignOutAction} />
        ) : (
          <CustomerPanel
            userProfile={currentUser.profile || {
              uid: currentUser.uid,
              name: currentUser.name,
              email: currentUser.email,
              role: "customer",
              joinedAt: new Date().toISOString(),
              membershipStatus: "active",
              feeStatus: "unpaid",
              feeDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }}
            attendanceLogs={attendanceLogs}
            onLogout={handleSignOutAction}
          />
        )
      ) : (
        <AuthScreen
          onLogin={handleDemoAccessLogin}
          isLoading={isLoading}
          onTriggerGoogleAuth={handleGoogleAuthTrigger}
        />
      )}
    </MobileFrame>
  );
}
