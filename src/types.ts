export type UserRole = "admin" | "customer";
export type MembershipStatus = "active" | "inactive";
export type FeeStatus = "paid" | "unpaid";

export interface MemberProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string; // ISO format
  membershipStatus: MembershipStatus;
  feeStatus: FeeStatus;
  feeDueDate: string; // ISO format
  photoUrl?: string;
  feePlan?: "1month" | "3months" | "6months" | "1year";
}

export interface AttendanceLog {
  id: string;
  userId: string;
  userName: string;
  timestamp: string; // ISO format
  dateString: string; // YYYY-MM-DD
  checkOutTime?: string; // ISO format
  status?: "in" | "out";
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  videoUrl: string; // Video streaming url or guide url
}

export interface ExerciseRoutine {
  id: string;
  day: string; // "Monday", "Tuesday", etc.
  title: string; // "Leg Day", "Push A", etc.
  exercises: Exercise[];
}

export interface GymNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  sentAt: string; // ISO format
  status: "unread" | "read";
}

export interface GymGateLog {
  memberId: string;
  memberName: string;
  timestamp: string; // ISO format
  status: "granted" | "refused" | "error";
}


export interface GymGateState {
  gymId: string;
  qrCode: string;
  qrImage?: string;
  gateStatus: "locked" | "unlocked";
  gateOpenedBy?: string;
  lastOpenedAt?: string; // ISO format
  openDuration: number; // seconds
  accessLog: GymGateLog[];
  lastUpdated: string; // ISO format
  lockdownMode?: boolean;
}

// JWT CUSTOM USER AUTHENTICATION TYPES
export interface JWTUser {
  id: string;
  email: string;
  name: string;
}

export interface JWTConversation {
  _id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface JWTMessage {
  _id: string;
  conversationId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

