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
}

export interface PersonalRoom {
  userId: string;
  userName: string;
  lockerNumber: string;
  lockerPin: string;
  notes: string;
  themeVibe: "neon" | "zen" | "midnight" | "sun";
  lastAccess: string; // ISO format
}

export interface AttendanceLog {
  id: string;
  userId: string;
  userName: string;
  timestamp: string; // ISO format
  dateString: string; // YYYY-MM-DD
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
