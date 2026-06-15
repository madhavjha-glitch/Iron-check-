import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocFromServer,
  Timestamp,
} from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";
import {
  MemberProfile,
  AttendanceLog,
  ExerciseRoutine,
  GymNotification,
  UserRole,
  GymGateState,
  GymGateLog,
} from "./types";

// Check if credentials are set
export const isFirebaseConfigured =
  firebaseConfig &&
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "";

let app: any;
let db: any;
let auth: any;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);

    // Validate connection defensively as instructed
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("the client is offline")
        ) {
          console.warn("Firebase client is currently offline.");
        }
      }
    };
    testConnection();
  } catch (err) {
    console.error("Firebase Initialization Failed: ", err);
  }
}

// Ensure exports exist but are guarded
export { auth, db };

// ----------------------------------------------------
// CRITICAL: FIRESTORE ERROR HANDLING INTERFACE & HELPER
// ----------------------------------------------------
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider: any) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Permission/Access Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ----------------------------------------------------
// LOCAL STORAGE SIMULATION STORE (HIGH FIDELITY DEMO FALLBACK)
// ----------------------------------------------------
const LOCAL_USERS_KEY = "gym_demo_users";
const LOCAL_ATTENDANCE_KEY = "gym_demo_attendance";
const LOCAL_ROUTINES_KEY = "gym_demo_routines";
const LOCAL_REMINDERS_KEY = "gym_demo_reminders";

// Seed data
const DEFAULT_ROUTINES: ExerciseRoutine[] = [
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

const initializeLocalStorage = () => {
  if (!localStorage.getItem(LOCAL_USERS_KEY)) {
    // Bootstrap standard gym customer list as default
    const testUsers: MemberProfile[] = [
      {
        uid: "user_cust1",
        name: "Arjun Sharma",
        email: "arjun.gym@gmail.com",
        role: "customer",
        joinedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        membershipStatus: "active",
        feeStatus: "paid",
        feeDueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        uid: "user_cust2",
        name: "Jessica Miller",
        email: "jessica.fit@gmail.com",
        role: "customer",
        joinedAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
        membershipStatus: "active",
        feeStatus: "unpaid",
        feeDueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // overdue
      },
      {
        uid: "user_cust3",
        name: "Rohan Das",
        email: "rohan.iron@gmail.com",
        role: "customer",
        joinedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        membershipStatus: "active",
        feeStatus: "unpaid",
        feeDueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ];
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(testUsers));
  }
  if (!localStorage.getItem(LOCAL_ROUTINES_KEY)) {
    localStorage.setItem(LOCAL_ROUTINES_KEY, JSON.stringify(DEFAULT_ROUTINES));
  }
  if (!localStorage.getItem(LOCAL_ATTENDANCE_KEY)) {
    const historicalAttendance: AttendanceLog[] = [
      {
        id: "att_1",
        userId: "user_cust1",
        userName: "Arjun Sharma",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        dateString: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      {
        id: "att_2",
        userId: "user_cust2",
        userName: "Jessica Miller",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        dateString: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      }
    ];
    localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(historicalAttendance));
  }
  if (!localStorage.getItem(LOCAL_REMINDERS_KEY)) {
    const defaultReminders: GymNotification[] = [
      {
        id: "rem_1",
        userId: "user_cust2",
        title: "Membership Renewal Overdue",
        body: "Your monthly membership of $45 is unpaid and overdue. Please clear it at the front desk or contact the Admin.",
        sentAt: new Date().toISOString(),
        status: "unread",
      }
    ];
    localStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(defaultReminders));
  }
  if (!localStorage.getItem("gym_demo_gate")) {
    const defaultGate = {
      gymId: "gym_hq_1",
      qrCode: "iron_check_front_desk_checkin",
      qrImage: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=iron_check_front_desk_checkin&color=ffffff&bgcolor=020617",
      gateStatus: "locked",
      gateOpenedBy: "",
      lastOpenedAt: "",
      openDuration: 5,
      accessLog: [],
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem("gym_demo_gate", JSON.stringify(defaultGate));
  }
};

initializeLocalStorage();

// State-listeners for simulation mode
type Unsubscribe = () => void;
const simListeners: { [key: string]: Set<Function> } = {
  users: new Set(),
  attendance: new Set(),
  routines: new Set(),
  reminders: new Set(),
  admins: new Set(),
  gate: new Set(),
};

const triggerLocalListeners = (collectionName: "users" | "attendance" | "routines" | "reminders" | "admins" | "gate") => {
  const data = JSON.parse(localStorage.getItem(`gym_demo_${collectionName}`) || (collectionName === "gate" ? "{}" : "[]"));
  if (simListeners[collectionName]) {
    simListeners[collectionName].forEach((cb) => cb(data));
  }
};

// ----------------------------------------------------
// AUTHENTICATION INTERACTIVE LOGIC
// ----------------------------------------------------
export interface AuthUserState {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  profile: MemberProfile | null;
}

export const loginWithGooglePopup = async (): Promise<AuthUserState> => {
  if (isFirebaseConfigured && auth) {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user has a profile record
      const userDocRef = doc(db, "users", user.uid);
      let profileDoc = await getDoc(userDocRef);

      let profileData: MemberProfile;

      // Determine Role. madhavjha514@gmail.com is the hardcoded bootstrapped administrator
      let targetRole: UserRole = "customer";
      if (user.email === "madhavjha514@gmail.com") {
        targetRole = "admin";
      } else if (user.email) {
        const cleanEmail = user.email.trim().toLowerCase();
        const adminDocRef = doc(db, "admins", cleanEmail);
        try {
          const adminDoc = await getDoc(adminDocRef);
          if (adminDoc.exists()) {
            targetRole = "admin";
          }
        } catch (e) {
          console.warn("Could not retrieve admin access doc: ", e);
        }
      }

      if (!profileDoc.exists()) {
        profileData = {
          uid: user.uid,
          name: user.displayName || "Fitness Member",
          email: user.email || "",
          role: targetRole,
          joinedAt: new Date().toISOString(),
          membershipStatus: "active",
          feeStatus: targetRole === "admin" ? "paid" : "unpaid",
          // default 30 days trial/membership
          feeDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };

        try {
          await setDoc(userDocRef, {
            ...profileData,
            joinedAt: Timestamp.fromDate(new Date(profileData.joinedAt)),
            feeDueDate: Timestamp.fromDate(new Date(profileData.feeDueDate)),
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}`);
        }
      } else {
        const raw = profileDoc.data();
        profileData = {
          uid: raw.uid,
          name: raw.name,
          email: raw.email,
          role: raw.role,
          joinedAt: raw.joinedAt instanceof Timestamp ? raw.joinedAt.toDate().toISOString() : raw.joinedAt,
          membershipStatus: raw.membershipStatus,
          feeStatus: raw.feeStatus,
          feeDueDate: raw.feeDueDate instanceof Timestamp ? raw.feeDueDate.toDate().toISOString() : raw.feeDueDate,
          photoUrl: raw.photoUrl,
          feePlan: raw.feePlan || "1month",
        };
      }

      return {
        uid: user.uid,
        name: profileData.name,
        email: profileData.email,
        role: profileData.role,
        profile: profileData,
      };
    } catch (authError) {
      console.error("Popup Auth Error", authError);
      throw authError;
    }
  } else {
    // SIMULATION MODE AUTH
    // Trigger simulation authentication login
    // Let's create an Admin or Customer depending on what user selects, or default based on email
    // Let's simulate user profiles
    const email = "madhavjha514@gmail.com"; // Default simulate as admin
    const name = "System Administrator";
    const uid = "sim_admin_uid";

    const simUser: AuthUserState = {
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
    return simUser;
  }
};

// Simulate Customer Mode Login for demonstration
export const loginAsSimulatedCustomer = (email = "arjun.gym@gmail.com", name = "Arjun Sharma", customUid = "user_cust1"): AuthUserState => {
  const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]");
  let found = users.find((u: MemberProfile) => u.uid === customUid);

  if (!found) {
    found = {
      uid: customUid,
      name,
      email,
      role: "customer" as UserRole,
      joinedAt: new Date().toISOString(),
      membershipStatus: "active",
      feeStatus: "unpaid",
      feeDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    users.push(found);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  }

  return {
    uid: found.uid,
    name: found.name,
    email: found.email,
    role: "customer",
    profile: found,
  };
};

export const logoutUser = async (): Promise<void> => {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
};

export const registerWithEmailAndPass = async (
  email: string,
  pass: string,
  name: string
): Promise<AuthUserState> => {
  if (isFirebaseConfigured && auth && db) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const user = result.user;

      try {
        await updateProfile(user, { displayName: name });
      } catch (profileError) {
        console.warn("Could not set displayName: ", profileError);
      }

      const userDocRef = doc(db, "users", user.uid);

      let targetRole: UserRole = "customer";
      if (email.trim().toLowerCase() === "madhavjha514@gmail.com") {
        targetRole = "admin";
      } else {
        const adminDocRef = doc(db, "admins", email.trim().toLowerCase());
        try {
          const adminDoc = await getDoc(adminDocRef);
          if (adminDoc.exists()) {
            targetRole = "admin";
          }
        } catch (e) {
          console.warn("Could not retrieve admin access doc: ", e);
        }
      }

      const profileData: MemberProfile = {
        uid: user.uid,
        name: name || "Fitness Member",
        email: user.email || email,
        role: targetRole,
        joinedAt: new Date().toISOString(),
        membershipStatus: "active",
        feeStatus: targetRole === "admin" ? "paid" : "unpaid",
        feeDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      try {
        await setDoc(userDocRef, {
          ...profileData,
          joinedAt: Timestamp.fromDate(new Date(profileData.joinedAt)),
          feeDueDate: Timestamp.fromDate(new Date(profileData.feeDueDate)),
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}`);
      }

      return {
        uid: user.uid,
        name: profileData.name,
        email: profileData.email,
        role: profileData.role,
        profile: profileData,
      };
    } catch (err) {
      console.error("Register with Email/Pass Error: ", err);
      throw err;
    }
  } else {
    // Simulated Registration
    return loginAsSimulatedCustomer(email, name, `sim_customer_${Date.now()}`);
  }
};

export const loginWithEmailAndPass = async (
  email: string,
  pass: string
): Promise<AuthUserState> => {
  if (isFirebaseConfigured && auth && db) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const profileDoc = await getDoc(userDocRef);

      let profileData: MemberProfile;

      if (!profileDoc.exists()) {
        let targetRole: UserRole = "customer";
        if (user.email === "madhavjha514@gmail.com") {
          targetRole = "admin";
        } else if (user.email) {
          const cleanEmail = user.email.trim().toLowerCase();
          const adminDocRef = doc(db, "admins", cleanEmail);
          try {
            const adminDoc = await getDoc(adminDocRef);
            if (adminDoc.exists()) {
              targetRole = "admin";
            }
          } catch (e) {
            console.warn("Could not retrieve admin access doc: ", e);
          }
        }

        profileData = {
          uid: user.uid,
          name: user.displayName || "Fitness Member",
          email: user.email || email,
          role: targetRole,
          joinedAt: new Date().toISOString(),
          membershipStatus: "active",
          feeStatus: targetRole === "admin" ? "paid" : "unpaid",
          feeDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };

        try {
          await setDoc(userDocRef, {
            ...profileData,
            joinedAt: Timestamp.fromDate(new Date(profileData.joinedAt)),
            feeDueDate: Timestamp.fromDate(new Date(profileData.feeDueDate)),
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}`);
        }
      } else {
        const raw = profileDoc.data();
        profileData = {
          uid: raw.uid,
          name: raw.name || "Fitness Member",
          email: raw.email || user.email || email,
          role: raw.role || "customer",
          joinedAt: raw.joinedAt instanceof Timestamp ? raw.joinedAt.toDate().toISOString() : (raw.joinedAt || new Date().toISOString()),
          membershipStatus: raw.membershipStatus || "active",
          feeStatus: raw.feeStatus || "unpaid",
          feeDueDate: raw.feeDueDate instanceof Timestamp ? raw.feeDueDate.toDate().toISOString() : (raw.feeDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
          photoUrl: raw.photoUrl,
          feePlan: raw.feePlan || "1month",
        };
      }

      return {
        uid: user.uid,
        name: profileData.name,
        email: profileData.email,
        role: profileData.role,
        profile: profileData,
      };
    } catch (err) {
      console.error("Login with Email/Pass Error: ", err);
      throw err;
    }
  } else {
    // Simulated Login
    return loginAsSimulatedCustomer(email, "Sandbox Member", `sim_customer_${Date.now()}`);
  }
};

export const subscribeToAuthChanges = (
  callback: (user: AuthUserState | null) => void
): Unsubscribe => {
  if (isFirebaseConfigured && auth && db) {
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        onSnapshot(
          userDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const raw = snapshot.data();
              const profile: MemberProfile = {
                uid: raw.uid,
                name: raw.name || "Fitness Member",
                email: raw.email || firebaseUser.email || "",
                role: raw.role || "customer",
                joinedAt: raw.joinedAt instanceof Timestamp ? raw.joinedAt.toDate().toISOString() : (raw.joinedAt || new Date().toISOString()),
                membershipStatus: raw.membershipStatus || "active",
                feeStatus: raw.feeStatus || "unpaid",
                feeDueDate: raw.feeDueDate instanceof Timestamp ? raw.feeDueDate.toDate().toISOString() : (raw.feeDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
                photoUrl: raw.photoUrl,
                feePlan: raw.feePlan || "1month",
              };
              callback({
                uid: firebaseUser.uid,
                name: profile.name,
                email: profile.email,
                role: profile.role,
                profile,
              });
            } else {
              // Self-heal/Bootstrap profile
              let targetRole: UserRole = "customer";
              if (firebaseUser.email === "madhavjha514@gmail.com") {
                targetRole = "admin";
              }
              const defaultProfile: MemberProfile = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || "Fitness Member",
                email: firebaseUser.email || "",
                role: targetRole,
                joinedAt: new Date().toISOString(),
                membershipStatus: "active",
                feeStatus: targetRole === "admin" ? "paid" : "unpaid",
                feeDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              };
              setDoc(userDocRef, {
                ...defaultProfile,
                joinedAt: Timestamp.fromDate(new Date(defaultProfile.joinedAt)),
                feeDueDate: Timestamp.fromDate(new Date(defaultProfile.feeDueDate)),
              }).catch((e) => {
                handleFirestoreError(e, OperationType.CREATE, `users/${firebaseUser.uid}`);
              });
            }
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          }
        );
      } else {
        callback(null);
      }
    });
  } else {
    // For local sim, we keep auth state in components/context
    return () => {};
  }
};

// ----------------------------------------------------
// SYSTEM OPERATION DISPATCHERS (FIRESTORE VS SIMULATOR)
// ----------------------------------------------------

// Retrieve all customer profiles (Admin Panel)
export const subscribeToMembersList = (
  callback: (users: MemberProfile[]) => void
): Unsubscribe => {
  if (isFirebaseConfigured && db) {
    const usersCol = collection(db, "users");
    const q = query(usersCol, orderBy("joinedAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: MemberProfile[] = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            uid: raw.uid,
            name: raw.name,
            email: raw.email,
            role: raw.role,
            joinedAt: raw.joinedAt instanceof Timestamp ? raw.joinedAt.toDate().toISOString() : raw.joinedAt,
            membershipStatus: raw.membershipStatus,
            feeStatus: raw.feeStatus,
            feeDueDate: raw.feeDueDate instanceof Timestamp ? raw.feeDueDate.toDate().toISOString() : raw.feeDueDate,
            photoUrl: raw.photoUrl,
            feePlan: raw.feePlan || "1month",
          };
        });
        callback(list.filter((u) => u.role !== "admin"));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "users");
      }
    );
  } else {
    const loadAndDeliver = () => {
      const data = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]");
      callback(data.filter((u: MemberProfile) => u.role !== "admin"));
    };
    simListeners.users.add(loadAndDeliver);
    loadAndDeliver();
    return () => simListeners.users.delete(loadAndDeliver);
  }
};

// Mark Fee Payments with a single click or specified plan (Paid / Unpaid)
export const setMemberFeeStatus = async (
  uid: string,
  status: "paid" | "unpaid",
  plan: "1month" | "3months" | "6months" | "1year" = "1month"
): Promise<void> => {
  let days = 30;
  if (plan === "3months") days = 90;
  else if (plan === "6months") days = 180;
  else if (plan === "1year") days = 365;

  const newDueDate =
    status === "paid"
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() //Extend specified days
      : new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(); //Mark overdue

  if (isFirebaseConfigured && db) {
    const userDocRef = doc(db, "users", uid);
    try {
      await updateDoc(userDocRef, {
        feeStatus: status,
        feeDueDate: Timestamp.fromDate(new Date(newDueDate)),
        feePlan: plan,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  } else {
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]");
    const updated = users.map((u: MemberProfile) => {
      if (u.uid === uid) {
        return { ...u, feeStatus: status, feeDueDate: newDueDate, feePlan: plan };
      }
      return u;
    });
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(updated));
    triggerLocalListeners("users");

    // Auto delete overdue reminder if marked paid, or create one if unpaid
    if (status === "paid") {
      const reminders = JSON.parse(localStorage.getItem(LOCAL_REMINDERS_KEY) || "[]");
      const filtered = reminders.filter((r: GymNotification) => r.userId !== uid);
      localStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(filtered));
      triggerLocalListeners("reminders");
    } else {
      await dispatchFeeReminder(
        uid,
        "Membership Fee Payment Required",
        "Your monthly gym dues are overdue. Please contact administration to clear outstanding balance."
      );
    }
  }
};

// Log Daily Attendance (Self Check-in via tap/QR or Admin manual check-in)
export const logDailyCheckIn = async (
  userId: string,
  userName: string
): Promise<void> => {
  const todayString = new Date().toISOString().split("T")[0];
  const checkInId = `att_${userId}_${todayString}`;

  // Fetch Member Profile first to verify active status and expiration dues
  let memberProfile: MemberProfile | null = null;
  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, "users", userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const raw = snap.data();
        memberProfile = {
          uid: raw.uid,
          name: raw.name || userName,
          email: raw.email || "",
          role: raw.role || "customer",
          joinedAt: raw.joinedAt instanceof Timestamp ? raw.joinedAt.toDate().toISOString() : raw.joinedAt,
          membershipStatus: raw.membershipStatus || "active",
          feeStatus: raw.feeStatus || "unpaid",
          feeDueDate: raw.feeDueDate instanceof Timestamp ? raw.feeDueDate.toDate().toISOString() : raw.feeDueDate,
          photoUrl: raw.photoUrl,
        };
      }
    } catch (e) {
      console.warn("Failed checking profile during verification: ", e);
    }
  } else {
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]");
    const found = users.find((u: MemberProfile) => u.uid === userId);
    if (found) {
      memberProfile = found;
    }
  }

  // Active validation check
  if (memberProfile && memberProfile.role !== "admin") {
    if (memberProfile.membershipStatus !== "active") {
      throw new Error(`Membership is not active! Status is currently "${memberProfile.membershipStatus}".`);
    }

    // Expiry validation check
    const expiry = new Date(memberProfile.feeDueDate);
    if (expiry < new Date()) {
      throw new Error(`Membership expired on ${expiry.toLocaleDateString()}. Please renew subscription dues.`);
    }
  }

  const attendanceRecord: AttendanceLog = {
    id: checkInId,
    userId,
    userName,
    timestamp: new Date().toISOString(),
    dateString: todayString,
    status: "in",
  };

  if (isFirebaseConfigured && db) {
    const logDocRef = doc(db, "attendance", checkInId);
    try {
      await setDoc(logDocRef, {
        ...attendanceRecord,
        timestamp: Timestamp.fromDate(new Date(attendanceRecord.timestamp)),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `attendance/${checkInId}`);
    }
  } else {
    const logs = JSON.parse(localStorage.getItem(LOCAL_ATTENDANCE_KEY) || "[]");
    // Only allow one check-in per day per user (or reset status back to in if checking in again after manual reset)
    const existingIndex = logs.findIndex((l: AttendanceLog) => l.userId === userId && l.dateString === todayString);
    if (existingIndex === -1) {
      logs.unshift(attendanceRecord);
      localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(logs));
      triggerLocalListeners("attendance");
    } else {
      // If already exists but checked out, they can check back in
      const existing = logs[existingIndex];
      if (existing.status === "out") {
        existing.status = "in";
        existing.timestamp = new Date().toISOString();
        delete existing.checkOutTime;
        localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(logs));
        triggerLocalListeners("attendance");
      } else {
        throw new Error("Duplicate entry: You have already checked in today!");
      }
    }
  }
};

// Log Daily Checkout (Manual via dashboard/panel or gate exit scan)
export const logDailyCheckOut = async (
  userId: string
): Promise<void> => {
  const todayString = new Date().toISOString().split("T")[0];
  const checkInId = `att_${userId}_${todayString}`;
  const checkOutTimeIso = new Date().toISOString();

  if (isFirebaseConfigured && db) {
    const logDocRef = doc(db, "attendance", checkInId);
    try {
      await updateDoc(logDocRef, {
        checkOutTime: checkOutTimeIso,
        status: "out"
      });
    } catch (err) {
      // Fallback if doc doesn't exist
      await setDoc(logDocRef, {
        checkOutTime: checkOutTimeIso,
        status: "out"
      }, { merge: true });
    }
  } else {
    const logs = JSON.parse(localStorage.getItem(LOCAL_ATTENDANCE_KEY) || "[]");
    const existingIndex = logs.findIndex((l: AttendanceLog) => l.userId === userId && l.dateString === todayString);
    if (existingIndex !== -1) {
      logs[existingIndex].checkOutTime = checkOutTimeIso;
      logs[existingIndex].status = "out";
      localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(logs));
      triggerLocalListeners("attendance");
    } else {
      // If none, create a completed today check out with fallback username
      const fallbackRecord: AttendanceLog = {
        id: checkInId,
        userId,
        userName: "Member Active Session",
        timestamp: new Date(Date.now() - 3600000).toISOString(), // Checked in an hour ago
        dateString: todayString,
        checkOutTime: checkOutTimeIso,
        status: "out"
      };
      logs.unshift(fallbackRecord);
      localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(logs));
      triggerLocalListeners("attendance");
    }
  }
};

// Listen to list of daily attendances for display
export const subscribeToAttendanceLogs = (
  userOrCallback: { role: string; uid: string; [key: string]: any } | null | undefined | ((logs: AttendanceLog[]) => void),
  callback?: (logs: AttendanceLog[]) => void
): Unsubscribe => {
  let user: { role: string; uid: string; [key: string]: any } | null | undefined = undefined;
  let realCallback: (logs: AttendanceLog[]) => void;

  if (typeof userOrCallback === "function") {
    realCallback = userOrCallback;
  } else {
    user = userOrCallback;
    realCallback = callback!;
  }

  if (isFirebaseConfigured && db) {
    const attendanceCol = collection(db, "attendance");
    let q = query(attendanceCol, orderBy("timestamp", "desc"));
    
    if (user && user.role === "customer") {
      q = query(attendanceCol, where("userId", "==", user.uid));
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const list: AttendanceLog[] = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: raw.id,
            userId: raw.userId,
            userName: raw.userName,
            timestamp: raw.timestamp instanceof Timestamp ? raw.timestamp.toDate().toISOString() : raw.timestamp,
            dateString: raw.dateString,
            checkOutTime: raw.checkOutTime,
            status: raw.status || "in",
          };
        });
        
        // Dynamic client-side sorting ensures index independence on multi-field query structures
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        realCallback(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "attendance");
      }
    );
  } else {
    const loadAndDeliver = () => {
      const data = JSON.parse(localStorage.getItem(LOCAL_ATTENDANCE_KEY) || "[]");
      if (user && user.role === "customer") {
        realCallback(data.filter((l: AttendanceLog) => l.userId === user?.uid));
      } else {
        realCallback(data);
      }
    };
    simListeners.attendance.add(loadAndDeliver);
    loadAndDeliver();
    return () => simListeners.attendance.delete(loadAndDeliver);
  }
};

// Subscribe to overall active check-ins for today (for overall real-time occupancy counting)
export const subscribeToGlobalLiveOccupancy = (
  callback: (logs: AttendanceLog[]) => void
): Unsubscribe => {
  const todayString = new Date().toISOString().split("T")[0];

  if (isFirebaseConfigured && db) {
    const attendanceCol = collection(db, "attendance");
    const q = query(attendanceCol, where("dateString", "==", todayString));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: AttendanceLog[] = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: raw.id,
            userId: raw.userId,
            userName: raw.userName,
            timestamp: raw.timestamp instanceof Timestamp ? raw.timestamp.toDate().toISOString() : raw.timestamp,
            dateString: raw.dateString,
            checkOutTime: raw.checkOutTime,
            status: raw.status || "in",
          };
        });
        callback(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "attendance");
      }
    );
  } else {
    const loadAndDeliver = () => {
      const data = JSON.parse(localStorage.getItem(LOCAL_ATTENDANCE_KEY) || "[]");
      // filter only today's sessions
      const todayLogs = data.filter((l: AttendanceLog) => l.dateString === todayString);
      callback(todayLogs);
    };
    simListeners.attendance.add(loadAndDeliver);
    loadAndDeliver();
    return () => simListeners.attendance.delete(loadAndDeliver);
  }
};

// Retrieve gym exercise routines
export const subscribeToRoutines = (
  callback: (routines: ExerciseRoutine[]) => void
): Unsubscribe => {
  if (isFirebaseConfigured && db) {
    const routinesCol = collection(db, "routines");
    return onSnapshot(
      routinesCol,
      (snapshot) => {
        const list: ExerciseRoutine[] = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: raw.id,
            day: raw.day,
            title: raw.title,
            exercises: JSON.parse(raw.exercises || "[]"),
          };
        });
        callback(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "routines");
      }
    );
  } else {
    const loadAndDeliver = () => {
      const data = JSON.parse(localStorage.getItem(LOCAL_ROUTINES_KEY) || "[]");
      callback(data);
    };
    simListeners.routines.add(loadAndDeliver);
    loadAndDeliver();
    return () => simListeners.routines.delete(loadAndDeliver);
  }
};

// Create or rewrite gym exercise programs (Admin Only)
export const saveRoutineRecord = async (
  routine: ExerciseRoutine
): Promise<void> => {
  if (isFirebaseConfigured && db) {
    const routineDocRef = doc(db, "routines", routine.id);
    try {
      await setDoc(routineDocRef, {
        id: routine.id,
        day: routine.day,
        title: routine.title,
        exercises: JSON.stringify(routine.exercises),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `routines/${routine.id}`);
    }
  } else {
    const routines = JSON.parse(localStorage.getItem(LOCAL_ROUTINES_KEY) || "[]");
    const idx = routines.findIndex((r: ExerciseRoutine) => r.id === routine.id);
    if (idx >= 0) {
      routines[idx] = routine;
    } else {
      routines.push(routine);
    }
    localStorage.setItem(LOCAL_ROUTINES_KEY, JSON.stringify(routines));
    triggerLocalListeners("routines");
  }
};

export const deleteRoutineRecord = async (id: string): Promise<void> => {
  if (isFirebaseConfigured && db) {
    const routineDocRef = doc(db, "routines", id);
    try {
      await deleteDoc(routineDocRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `routines/${id}`);
    }
  } else {
    const routines = JSON.parse(localStorage.getItem(LOCAL_ROUTINES_KEY) || "[]");
    const filtered = routines.filter((r: ExerciseRoutine) => r.id !== id);
    localStorage.setItem(LOCAL_ROUTINES_KEY, JSON.stringify(filtered));
    triggerLocalListeners("routines");
  }
};

// ----------------------------------------------------
// AUTOMATED & MANUAL PUSH FEE REMINDERS
// ----------------------------------------------------

export const subscribeToMemberReminders = (
  userId: string,
  callback: (reminders: GymNotification[]) => void
): Unsubscribe => {
  if (isFirebaseConfigured && db) {
    const remindersCol = collection(db, "reminders");
    const q = query(
      remindersCol,
      where("userId", "==", userId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list: GymNotification[] = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: raw.id,
            userId: raw.userId,
            title: raw.title,
            body: raw.body,
            sentAt: raw.sentAt instanceof Timestamp ? raw.sentAt.toDate().toISOString() : raw.sentAt,
            status: raw.status as "unread" | "read",
          };
        });
        // Sort by dates manually since where can fail on indexing if composite not configured yet
        list.sort((a,b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
        callback(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "reminders");
      }
    );
  } else {
    const loadAndDeliver = () => {
      const data = JSON.parse(localStorage.getItem(LOCAL_REMINDERS_KEY) || "[]");
      callback(data.filter((r: GymNotification) => r.userId === userId));
    };
    simListeners.reminders.add(loadAndDeliver);
    loadAndDeliver();
    return () => simListeners.reminders.delete(loadAndDeliver);
  }
};

export const dispatchFeeReminder = async (
  userId: string,
  title: string,
  body: string
): Promise<void> => {
  const reminderId = `rem_${userId}_${Date.now()}`;
  const reminder: GymNotification = {
    id: reminderId,
    userId,
    title,
    body,
    sentAt: new Date().toISOString(),
    status: "unread",
  };

  if (isFirebaseConfigured && db) {
    const remDocRef = doc(db, "reminders", reminderId);
    try {
      await setDoc(remDocRef, {
        ...reminder,
        sentAt: Timestamp.fromDate(new Date(reminder.sentAt)),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reminders/${reminderId}`);
    }
  } else {
    const alerts = JSON.parse(localStorage.getItem(LOCAL_REMINDERS_KEY) || "[]");
    alerts.unshift(reminder);
    localStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(alerts));
    triggerLocalListeners("reminders");
  }
};

// Track membership dates automatically and trigger due notices
export const executeDynamicMembershipFeeCheck = async (
  members: MemberProfile[]
): Promise<number> => {
  let remindersSent = 0;
  const now = new Date();

  for (const member of members) {
    if (member.role === "admin") continue;

    const dueDate = new Date(member.feeDueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Fee is due in less than 3 days OR overdue, and status is unpaid
    if (member.feeStatus === "unpaid" || diffDays <= 3) {
      // Check if reminder already sent today/recently
      let shouldSend = true;
      if (isFirebaseConfigured && db) {
        // REAL FIREBASE LOGIC
        // We will push a reminder document inside transaction or check
      } else {
        const alerts = JSON.parse(localStorage.getItem(LOCAL_REMINDERS_KEY) || "[]");
        const hasRecent = alerts.some(
          (a: GymNotification) =>
            a.userId === member.uid &&
            a.title.includes("Membership") &&
            (Date.now() - new Date(a.sentAt).getTime()) < 24 * 60 * 60 * 1000 // Sent in last 24h
        );
        shouldSend = !hasRecent;
      }

      if (shouldSend) {
        const planName =
          member.feePlan === "3months"
            ? "3-Month"
            : member.feePlan === "6months"
            ? "6-Month"
            : member.feePlan === "1year"
            ? "1-Year"
            : "Monthly";

        const msg =
          diffDays < 0
            ? `Your ${planName} gym membership is overdue by ${Math.abs(diffDays)} days. Please clear your dues to maintain active gym access.`
            : `Your ${planName} gym membership is due for renewal in ${diffDays} days (${dueDate.toLocaleDateString()}). Please make your payment soon.`;

        await dispatchFeeReminder(
          member.uid,
          diffDays < 0 ? "⚠️ Membership Renewal Overdue" : "📅 Gym Subscription Renewal Due",
          msg
        );
        remindersSent++;
      }
    }
  }
  return remindersSent;
};

export const markReminderRead = async (reminderId: string): Promise<void> => {
  if (isFirebaseConfigured && db) {
    const remDocRef = doc(db, "reminders", reminderId);
    try {
      await updateDoc(remDocRef, {
        status: "read",
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reminders/${reminderId}`);
    }
  } else {
    const alerts = JSON.parse(localStorage.getItem(LOCAL_REMINDERS_KEY) || "[]");
    const updated = alerts.map((a: GymNotification) => {
      if (a.id === reminderId) {
        return { ...a, status: "read" as const };
      }
      return a;
    });
    localStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(updated));
    triggerLocalListeners("reminders");
  }
};

// ----------------------------------------------------
// ADMINISTRATOR SECURITY GROUP ACCESSORS
// ----------------------------------------------------

export const subscribeToAdminsList = (
  callback: (emails: string[]) => void
): Unsubscribe => {
  if (isFirebaseConfigured && db) {
    const adminsCol = collection(db, "admins");
    return onSnapshot(
      adminsCol,
      (snapshot) => {
        const list: string[] = snapshot.docs.map((d) => d.id);
        if (!list.includes("madhavjha514@gmail.com")) {
          list.push("madhavjha514@gmail.com");
        }
        callback(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "admins");
      }
    );
  } else {
    const loadAndDeliver = () => {
      const data = JSON.parse(localStorage.getItem("gym_demo_admins") || "[]");
      if (!data.includes("madhavjha514@gmail.com")) {
        data.push("madhavjha514@gmail.com");
        localStorage.setItem("gym_demo_admins", JSON.stringify(data));
      }
      callback(data);
    };
    simListeners.admins.add(loadAndDeliver);
    loadAndDeliver();
    return () => simListeners.admins.delete(loadAndDeliver);
  }
};

export const addAdminEmail = async (email: string): Promise<void> => {
  const cleanEmail = email.trim().toLowerCase();
  if (isFirebaseConfigured && db) {
    const adminDocRef = doc(db, "admins", cleanEmail);
    try {
      await setDoc(adminDocRef, {
        email: cleanEmail,
        addedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `admins/${cleanEmail}`);
    }
  } else {
    const list = JSON.parse(localStorage.getItem("gym_demo_admins") || "[]");
    if (!list.includes(cleanEmail)) {
      list.push(cleanEmail);
      localStorage.setItem("gym_demo_admins", JSON.stringify(list));
      triggerLocalListeners("admins");
    }
  }
};

export const removeAdminEmail = async (email: string): Promise<void> => {
  const cleanEmail = email.trim().toLowerCase();
  if (isFirebaseConfigured && db) {
    const adminDocRef = doc(db, "admins", cleanEmail);
    try {
      await deleteDoc(adminDocRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `admins/${cleanEmail}`);
    }
  } else {
    let list = JSON.parse(localStorage.getItem("gym_demo_admins") || "[]");
    list = list.filter((e: string) => e !== cleanEmail);
    localStorage.setItem("gym_demo_admins", JSON.stringify(list));
    triggerLocalListeners("admins");
  }
};

export const updateMemberProfilePhoto = async (
  uid: string,
  photoUrl: string
): Promise<void> => {
  if (isFirebaseConfigured && db) {
    const userDocRef = doc(db, "users", uid);
    try {
      await updateDoc(userDocRef, {
        photoUrl,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  } else {
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]");
    const updated = users.map((u: MemberProfile) => {
      if (u.uid === uid) {
        return { ...u, photoUrl };
      }
      return u;
    });
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(updated));
    triggerLocalListeners("users");
  }
};

// Manually register an individual member
export const manuallyAddMember = async (newMember: MemberProfile): Promise<void> => {
  if (isFirebaseConfigured && db) {
    const userDocRef = doc(db, "users", newMember.uid);
    try {
      await setDoc(userDocRef, {
        ...newMember,
        joinedAt: Timestamp.fromDate(new Date(newMember.joinedAt)),
        feeDueDate: Timestamp.fromDate(new Date(newMember.feeDueDate)),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${newMember.uid}`);
    }
  } else {
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]");
    // Avoid registration duplicate
    const index = users.findIndex((u: MemberProfile) => u.uid === newMember.uid || u.email.toLowerCase() === newMember.email.toLowerCase());
    if (index !== -1) {
      users[index] = { ...users[index], ...newMember };
    } else {
      users.push(newMember);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    triggerLocalListeners("users");
  }
};

// Delete a member profile entirely from the register
export const deleteMemberProfile = async (uid: string): Promise<void> => {
  if (isFirebaseConfigured && db) {
    const userDocRef = doc(db, "users", uid);
    try {
      await deleteDoc(userDocRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
    }
  } else {
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]");
    const filtered = users.filter((u: MemberProfile) => u.uid !== uid);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(filtered));
    triggerLocalListeners("users");
  }
};

// Import custom bulk listing of members
export const bulkImportMembersList = async (membersList: MemberProfile[]): Promise<void> => {
  if (isFirebaseConfigured && db) {
    for (const member of membersList) {
      const userRef = doc(db, "users", member.uid);
      try {
        await setDoc(userRef, {
          ...member,
          joinedAt: Timestamp.fromDate(new Date(member.joinedAt)),
          feeDueDate: Timestamp.fromDate(new Date(member.feeDueDate)),
        });
      } catch (e) {
        console.error("Single bulk item upload skipped due to permissions/network: ", e);
      }
    }
  } else {
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]");
    membersList.forEach((newMem) => {
      const existingIdx = users.findIndex((u: MemberProfile) => u.uid === newMem.uid || u.email.toLowerCase() === newMem.email.toLowerCase());
      if (existingIdx !== -1) {
        users[existingIdx] = { ...users[existingIdx], ...newMem };
      } else {
        users.push(newMem);
      }
    });
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    triggerLocalListeners("users");
  }
};

export const subscribeToGymGate = (callback: (gate: GymGateState) => void): Unsubscribe => {
  if (isFirebaseConfigured && db) {
    const gateDocRef = doc(db, "gym_gates", "main");
    return onSnapshot(
      gateDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          callback({
            gymId: data.gymId || "gym_hq_1",
            qrCode: data.qrCode || "iron_check_front_desk_checkin",
            qrImage: data.qrImage || "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=iron_check_front_desk_checkin&color=ffffff&bgcolor=020617",
            gateStatus: data.gateStatus || "locked",
            gateOpenedBy: data.gateOpenedBy || "",
            lastOpenedAt: data.lastOpenedAt instanceof Timestamp ? data.lastOpenedAt.toDate().toISOString() : data.lastOpenedAt || "",
            openDuration: data.openDuration || 5,
            accessLog: (data.accessLog || []).map((l: any) => ({
              memberId: l.memberId,
              memberName: l.memberName,
              timestamp: l.timestamp instanceof Timestamp ? l.timestamp.toDate().toISOString() : l.timestamp,
              status: l.status,
            })),
            lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate().toISOString() : data.lastUpdated || "",
          });
        } else {
          const initGate: GymGateState = {
            gymId: "gym_hq_1",
            qrCode: "iron_check_front_desk_checkin",
            gateStatus: "locked",
            openDuration: 5,
            accessLog: [],
            lastUpdated: new Date().toISOString()
          };
          setDoc(gateDocRef, initGate);
          callback(initGate);
        }
      },
      (err) => {
        console.warn("Subscribing to Firebase gym gate failed: ", err);
      }
    );
  } else {
    simListeners.gate.add(callback);
    const gateStr = localStorage.getItem("gym_demo_gate") || "{}";
    let current: GymGateState;
    try {
      current = JSON.parse(gateStr);
    } catch {
      current = {
        gymId: "gym_hq_1",
        qrCode: "iron_check_front_desk_checkin",
        gateStatus: "locked",
        openDuration: 5,
        accessLog: [],
        lastUpdated: new Date().toISOString()
      };
    }
    callback(current);
    return () => {
      simListeners.gate.delete(callback);
    };
  }
};

export const triggerGateHandshakeRecord = async (
  memberId: string,
  memberName: string,
  status: "granted" | "refused" | "error"
): Promise<void> => {
  const isUnlocked = status === "granted";
  
  const rawLog: GymGateLog = {
    memberId,
    memberName,
    timestamp: new Date().toISOString(),
    status,
  };

  if (isFirebaseConfigured && db) {
    const gateDocRef = doc(db, "gym_gates", "main");
    try {
      const snap = await getDoc(gateDocRef);
      let existingLog: any[] = [];
      let currentGate: any = {};
      
      if (snap.exists()) {
        currentGate = snap.data();
        existingLog = currentGate.accessLog || [];
      }
      
      const newLogs = [rawLog, ...existingLog].slice(0, 20);
      
      const updatedData: any = {
        gymId: currentGate.gymId || "gym_hq_1",
        qrCode: currentGate.qrCode || "iron_check_front_desk_checkin",
        gateStatus: isUnlocked ? "unlocked" : "locked",
        lastUpdated: Timestamp.fromDate(new Date()),
        accessLog: newLogs,
      };

      if (isUnlocked) {
        updatedData.gateOpenedBy = memberName;
        updatedData.lastOpenedAt = Timestamp.fromDate(new Date());
        updatedData.openDuration = 5;
      }

      await setDoc(gateDocRef, updatedData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "gym_gates/main");
    }
  } else {
    const gateStr = localStorage.getItem("gym_demo_gate") || "{}";
    let currentGate: GymGateState;
    try {
      currentGate = JSON.parse(gateStr);
    } catch {
      currentGate = {
        gymId: "gym_hq_1",
        qrCode: "iron_check_front_desk_checkin",
        gateStatus: "locked",
        openDuration: 5,
        accessLog: [],
        lastUpdated: new Date().toISOString()
      };
    }
    
    currentGate.accessLog = [rawLog, ...(currentGate.accessLog || [])].slice(0, 20);
    currentGate.gateStatus = isUnlocked ? "unlocked" : "locked";
    currentGate.lastUpdated = new Date().toISOString();
    
    if (isUnlocked) {
      currentGate.gateOpenedBy = memberName;
      currentGate.lastOpenedAt = new Date().toISOString();
      currentGate.openDuration = 5;
    }
    
    localStorage.setItem("gym_demo_gate", JSON.stringify(currentGate));
    triggerLocalListeners("gate");
  }
};

export const lockGateManual = async (): Promise<void> => {
  if (isFirebaseConfigured && db) {
    const gateDocRef = doc(db, "gym_gates", "main");
    try {
      await updateDoc(gateDocRef, {
        gateStatus: "locked",
        lastUpdated: Timestamp.fromDate(new Date())
      });
    } catch (e) {
      console.warn("Failed manually resetting Gate status in Firebase: ", e);
    }
  } else {
    const gateStr = localStorage.getItem("gym_demo_gate") || "{}";
    let currentGate: GymGateState;
    try {
      currentGate = JSON.parse(gateStr);
    } catch {
      currentGate = {
        gymId: "gym_hq_1",
        qrCode: "iron_check_front_desk_checkin",
        gateStatus: "locked",
        openDuration: 5,
        accessLog: [],
        lastUpdated: new Date().toISOString()
      };
    }
    currentGate.gateStatus = "locked";
    currentGate.lastUpdated = new Date().toISOString();
    localStorage.setItem("gym_demo_gate", JSON.stringify(currentGate));
    triggerLocalListeners("gate");
  }
};


