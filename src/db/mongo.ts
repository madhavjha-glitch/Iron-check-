import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "";

let isConnected = false;

/**
 * Converted string representation to valid standard 24-character hexadecimal ObjectId
 */
export function getDeterministicObjectId(str: string): string {
  if (!str) {
    return new mongoose.Types.ObjectId().toString();
  }
  // Check if it is already a valid ObjectId
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    return str;
  }
  
  // Clean alphanumeric hex characters
  const clean = str.replace(/[^0-9a-fA-F]/g, "");
  if (clean.length >= 24) {
    return clean.slice(0, 24).toLowerCase();
  }
  
  // Generate a deterministic 24-character hex string hash from input
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    hash1 = (hash1 * 31 + code) | 0;
    hash2 = (hash2 * 17 ^ code) | 0;
  }
  
  const part1 = Math.abs(hash1).toString(16).padStart(12, "a");
  const part2 = Math.abs(hash2).toString(16).padStart(12, "f");
  return (part1 + part2).slice(0, 24).toLowerCase();
}

/**
 * Lazy connection to MongoDB Atlas database to prevent connection spam
 */
export async function connectToMongoDB() {
  if (isConnected) {
    return;
  }

  if (!MONGO_URI) {
    console.warn("⚠️ MONGO_URI environment variable is not defined. MongoDB functions will run in simulation mode.");
    return;
  }

  try {
    const db = await mongoose.connect(MONGO_URI, {
      dbName: "gym_management"
    });
    isConnected = db.connections[0].readyState === 1;
    console.log("✅ Successfully connected to MongoDB Atlas.");
  } catch (err: any) {
    console.error("❌ Failed to connect to MongoDB Atlas:", err.message);
  }
}

// MEMBER PROFILE SCHEMA (Matches MemberProfile React Types)
const MemberSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ["admin", "customer"], default: "customer" },
  joinedAt: { type: Date, default: Date.now },
  membershipStatus: { type: String, enum: ["active", "suspended", "inactive"], default: "active" },
  feeStatus: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
  feeDueDate: { type: Date, required: true },
  feePlan: { type: String, enum: ["1month", "3months", "6months", "1year"], default: "1month" },
  photoUrl: { type: String, default: "" },
}, { timestamps: true });

// ATTENDANCE LOG SCHEMA (Matches AttendanceLog React Types)
const AttendanceLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  dateString: { type: String, required: true }
}, { timestamps: true });

// Export Compiled Mongoose Models safely
export const MongoMember = mongoose.models.Member || mongoose.model("Member", MemberSchema);
export const MongoAttendance = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceLogSchema);

// PROGRESS JOURNAL & BIO-METRICS SCHEMA
const ProgressSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member"
  },
  gymId: {
    type: mongoose.Schema.Types.ObjectId
  },
  
  height: { 
    feet: Number, 
    inches: Number, 
    cm: Number 
  },
  weight: { 
    kg: Number, 
    lbs: Number 
  },
  bmi: Number,
  
  date: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Schema Pre-Save auto conversion middleware
ProgressSchema.pre('save', function(this: any, next: any) {
  if (this.height && (this.height.feet || this.height.inches)) {
    const totalInches = (this.height.feet || 0) * 12 + (this.height.inches || 0);
    this.height.cm = Math.round(totalInches * 2.54);
  }
  
  if (this.weight && this.weight.kg) {
    this.weight.lbs = Math.round(this.weight.kg * 2.20462 * 100) / 100;
    const heightCm = (this.height && this.height.cm) || 170;
    const heightM = heightCm / 100;
    this.bmi = Math.round((this.weight.kg / (heightM * heightM)) * 100) / 100;
  }
  next();
});

// Adding explicit schema static helper procedures
ProgressSchema.statics.convertHeight = function(feet: number, inches: number) {
  return (feet * 12) + inches;
};

ProgressSchema.statics.convertWeight = function(kg: number) {
  return Math.round(kg * 2.20462 * 100) / 100;
};

export const MongoProgress = mongoose.models.Progress || mongoose.model("Progress", ProgressSchema);
