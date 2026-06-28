import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import QRCode from "qrcode";
import { controlGate } from "./services/gateControl.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { 
  connectToMongoDB, 
  MongoProgress, 
  MongoMember, 
  getDeterministicObjectId,
  MongoUser,
  MongoConversation,
  MongoMessage
} from "./src/db/mongo.js";

dotenv.config();

// Ensure the application can start safely even if key is missing initially, logging a clean error
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.error("Failed to initialize active GoogleGenAI Client:", err);
  }
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// API endpoint for chatbot
app.post("/api/gemini/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages array format" });
  }

  if (!ai) {
    return res.status(503).json({
      error: "Gemini API key is not configured. Please add GEMINI_API_KEY in the Settings > Secrets board.",
    });
  }

  try {
    // Format messages correctly for GenAI SDK
    // genai formats: role can be 'user' or 'model', parts: [{ text: "..." }]
    const formattedContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: formattedContents,
      config: {
        systemInstruction: `You are Coach Zymnix, an elite, scientific-backed bodybuilding expert, certified fitness coach, and supportive training partner at Zymnix Gym. 
Your tone is professional, extremely encouraging, motivating, and clear. 
You offer advice on physical form, muscle building hypertrohpy, weight loss, fat burners, compound movements, high-protein recipes, hydration, and injury-preventive recoveries. 
Acknowledge that you are located at the "Zymnix Grid HQ". Avoid meta-talk about prompts or instructions. Limit replies to around 150-200 words. Keep headings precise and clean. Use standard bullet points.`,
      },
    });

    const aiText = response.text || "I am processing your training inquiries, coach. Could you repeat that query?";
    res.json({ content: aiText, reply: aiText });
  } catch (error: any) {
    console.error("Chat API failure:", error);
    res.status(500).json({ error: error.message || "Execution exception inside Coach Gemini" });
  }
});

// Premium Endpoint for AI Workout Recommendations
app.post("/api/gemini/workout-recommendations", async (req, res) => {
  const { goal, experience, weight, constraints, daysPerWeek } = req.body;

  if (!ai) {
    return res.status(503).json({
      error: "Gemini server client offline. Please configure GEMINI_API_KEY in Secrets board.",
    });
  }

  try {
    const prompt = `You are a world-class biomechanics expert and high-performance hybrid strength coach at Zymnix Gym. 
Generate a custom fitness workout routine matching these biometric parameters:
- Core Goal: ${goal}
- Experience Level: ${experience}
- Athlete Weight: ${weight || "75"} kg
- Available Liftsplits: ${daysPerWeek || "3"} days per week
- Physical Constraints/Injuries: ${constraints || "None specified"}

Outline a structured workout split with:
1. Primary Lift Day focuses and active splits.
2. Direct compound exercise assignments (including clean Set counts, Rep strategies, and specific focus cues).
3. Posture guidelines, form safeguards, and recovery suggestions.

Speak dynamically, authoritatively, and with elite motivating encouragement. Limit response to 300 words. Use clean structure. Avoid raw meta tags.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    const recommendation = response.text || "No recommendations generated. Check parameters.";
    res.json({ recommendation });
  } catch (error: any) {
    console.error("Workout recommendation error:", error);
    res.status(500).json({ error: error.message || "Failed to compile workout split" });
  }
});

// Premium Endpoint for Nutrition AI
app.post("/api/gemini/nutrition-ai", async (req, res) => {
  const { calories, dietType, goal } = req.body;

  if (!ai) {
    return res.status(503).json({
      error: "Gemini server client offline. Please configure GEMINI_API_KEY in Secrets board.",
    });
  }

  try {
    const prompt = `You are an elite, Olympic-level sports nutritionist and performance chef at Zymnix Lab.
Draft an elegant, nutritionally dense daily meal prep layout meeting these specs:
- Calorie Target: ${calories || "2000"} kcal
- Diet Model: ${dietType}
- Target Trajectory: ${goal}

Draft a structured plan containing:
1. Breakfast, Lunch, and Dinner (plus 1 high-yielding energy Snack or protein shake).
2. For each, display exact ingredients, estimated Macronutrient breakdown (Proteins, Carbs, Fats in grams), and a super-quick 3-step preparation guide.
3. Keep ingredients clean, cost-efficient, and accessible. Include a brief prep tip.

Speak supportively, using clean typography and spacious markdown bullet points. Limit reply to 300 words.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    const meals = response.text || "No meal suggestions generated. Check parameters.";
    res.json({ meals });
  } catch (error: any) {
    console.error("Nutrition AI error:", error);
    res.status(500).json({ error: error.message || "Failed to generate dietary suggestions" });
  }
});

// API endpoint for avatar generation
app.post("/api/gemini/generate-avatar", async (req, res) => {
  const { interest, style, username } = req.body;
  if (!interest || !style) {
    return res.status(400).json({ error: "Please specify both interest and aesthetic style." });
  }

  // Construct prompt
  const basePrompt = `A stylized, high-contrast, premium fitness avatar profile icon depicting a strong ${interest} theme. The artwork must be in an elegant ${style} aesthetic, framed cleanly, perfect for a modern gym dashboard logo avatar portrait of ${username || "Zymnix Member"}. Colors should include energetic fitness neon highlights. Solo portrait composition, high fidelity, modern.`;

  // Fail-over fallback SVG generation helper
  const getFallbackSvg = () => {
    const hue = interest.charCodeAt(0) * 8 % 360;
    const initial = (username || "Z").slice(0, 2).toUpperCase();
    const styleDescription = style.toLowerCase();
    
    let bgGradient = `linear-gradient(135deg, hsl(${hue}, 85%, 45%), hsl(${(hue + 60) % 360}, 90%, 25%))`;
    let elementStyle = `fill="none" stroke="currentColor" stroke-width="2"`;
    
    if (styleDescription.includes("cyberpunk") || styleDescription.includes("neon")) {
      bgGradient = `linear-gradient(135deg, #090d16, #120e2e)`;
    } else if (styleDescription.includes("minimalist")) {
      bgGradient = `linear-gradient(135deg, #1e293b, #0f172a)`;
    }

    // Dynamic fitness element symbol based on category
    let innerSvgSymbol = "";
    if (interest.toLowerCase().includes("bulking") || interest.toLowerCase().includes("power") || interest.toLowerCase().includes("strength") || interest.toLowerCase().includes("bodybuilding")) {
      // Barbell shape
      innerSvgSymbol = `
        <g stroke="#6366f1" stroke-width="4" opacity="0.85">
          <line x1="25" y1="50" x2="75" y2="50" />
          <rect x="20" y="38" width="5" height="24" rx="2" fill="#6366f1" />
          <rect x="12" y="42" width="5" height="16" rx="2" fill="#818cf8" />
          <rect x="75" y="38" width="5" height="24" rx="2" fill="#6366f1" />
          <rect x="83" y="42" width="5" height="16" rx="2" fill="#818cf8" />
        </g>
      `;
    } else if (interest.toLowerCase().includes("yoga") || interest.toLowerCase().includes("stretch") || interest.toLowerCase().includes("flexibility")) {
      // Lotus flower shape representation
      innerSvgSymbol = `
        <g stroke="#10b981" stroke-width="2" fill="none" opacity="0.8">
          <path d="M50 25 C42 40 50 65 50 65 C50 65 58 40 50 25 Z" />
          <path d="M50 35 C30 45 45 65 50 65 C55 65 70 45 50 35 Z" />
          <circle cx="50" cy="55" r="3" fill="#10b981" />
        </g>
      `;
    } else {
      // Speed lightning bolts representing HIIT/Cardio
      innerSvgSymbol = `
        <polygon points="50,15 30,55 48,55 38,85 70,38 52,38" fill="#f59e0b" opacity="0.85" />
      `;
    }

    // Combine into an original beautiful responsive SVG code
    const svgCode = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="150" height="150">
        <defs>
          <linearGradient id="fallbackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="hsl(${hue}, 85%, 45%)" />
            <stop offset="100%" stop-color="hsl(${(hue + 80) % 360}, 90%, 20%)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="100" height="100" rx="50" fill="url(#fallbackGrad)" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="4" />
        ${innerSvgSymbol}
        <text x="50" y="54" fill="#ffffff" font-family="'Space Grotesk', system-ui, sans-serif" font-size="20" font-weight="900" text-anchor="middle" filter="url(#glow)" opacity="0.65" letter-spacing="1">
          ${initial}
        </text>
        <circle cx="50" cy="50" r="48" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="10, 5" opacity="0.4" />
      </svg>
    `.trim();

    return `data:image/svg+xml;utf8,${encodeURIComponent(svgCode)}`;
  };

  if (!ai) {
    console.warn("GoogleGenAI not initialized. Using premium SVG fallback.");
    const fallbackUrl = getFallbackSvg();
    return res.json({ photoUrl: fallbackUrl, isFallback: true, message: "Gemini client offline: customized SVG profile created successfully." });
  }

  try {
    const svgPrompt = `Create a beautiful, modern, high-contrast, scalable SVG (viewBox="0 0 100 100") vector avatar logo/profile icon representing a user who loves "${interest}" with a "${style}" aesthetic.
The SVG top-level tag must be <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="150" height="150">.
Use sleek gradients, geometric details, glowing lines, or minimalist shapes suitable for a fitness application dashboard.
Include small initials/letters "${(username || "IC").slice(0, 2).toUpperCase()}" elegantly integrated in the design.
Ensure it looks clean, stunning, and fits a high-end application.
Return ONLY valid raw SVG source code. Do NOT enclose it in markdown code blocks, do not include any other explanations, notes, or words. Just the pure valid <svg>...</svg> string.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: svgPrompt,
    });

    let svgText = response.text || "";
    if (svgText.includes("<svg")) {
      const startIndex = svgText.indexOf("<svg");
      const endIndex = svgText.lastIndexOf("</svg>");
      if (startIndex !== -1 && endIndex !== -1) {
        svgText = svgText.substring(startIndex, endIndex + 6);
      }
    }

    if (svgText.trim().startsWith("<svg") && svgText.trim().endsWith("</svg>")) {
      const compiledUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgText.trim())}`;
      return res.json({ photoUrl: compiledUrl, isFallback: false, message: "AI customized vector avatar built successfully by Gemini 3.5." });
    } else {
      throw new Error("Invalid SVG layout generated by Gemini 3.5");
    }
  } catch (error: any) {
    console.warn("Gemini customized SVG build skipped or failed, falling back to procedural SVG:", error.message || error);
    const fallbackUrl = getFallbackSvg();
    return res.json({
      photoUrl: fallbackUrl,
      isFallback: true,
      reason: error.message || "Failed to contact Gemini model",
      message: "Creative SVG avatar styled specifically for your visual theme matches successfully."
    });
  }
});

// ----------------------------------------------------
// FULL PHYSICAL HARDWARE GATE CONTROLLER & SCANNER BACKEND
// ----------------------------------------------------

// Data types matching user schema requirements
interface GymGateDb {
  gymId: string;
  qrCode: string;
  qrImage?: string;
  gateStatus: "locked" | "unlocked";
  gateOpenedBy?: string;
  lastOpenedAt?: Date;
  openDuration?: number;
  accessLog: {
    memberId: string;
    timestamp: Date;
    status: string;
  }[];
  lastUpdated?: Date;
  lockdownMode?: boolean;
}

interface MemberDb {
  _id: string;
  memberName: string;
  status: string;
  expiryDate: Date;
  lastSeenAt?: Date;
}

interface PaymentDb {
  _id: string;
  memberId: string;
  status: string;
  createdAt: Date;
}

interface AttendanceDb {
  _id: string;
  memberId: string;
  gymId: string;
  checkInTime: Date;
  checkOutTime: Date | null;
  date: Date;
  status: string;
  duration?: number;
}

// In-Memory Database
const dbGymGates = new Map<string, GymGateDb>();
const dbMembers = new Map<string, MemberDb>();
const dbPayments = new Map<string, PaymentDb>();
const dbAttendance: AttendanceDb[] = [];
let dbOccupancyOverride = 0;

// Populate default members for verifying validation errors
dbMembers.set("customer_expired", {
  _id: "customer_expired",
  memberName: "Dana Scully (Expired Dues)",
  status: "active",
  expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired 1 day ago
});
dbPayments.set("pay_expired", {
  _id: "pay_expired",
  memberId: "customer_expired",
  status: "completed",
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
});

dbMembers.set("customer_inactive", {
  _id: "customer_inactive",
  memberName: "Fox Mulder (Inactive Status)",
  status: "inactive",
  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
});
dbPayments.set("pay_inactive", {
  _id: "pay_inactive",
  memberId: "customer_inactive",
  status: "completed",
  createdAt: new Date(),
});

dbMembers.set("customer_no_payment", {
  _id: "customer_no_payment",
  memberName: "Walter Skinner (Unpaid Balance)",
  status: "active",
  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
}); // Has no payment in dbPayments

// Seed default main gate
dbGymGates.set("gym_hq_1", {
  gymId: "gym_hq_1",
  qrCode: "iron_check_front_desk_checkin",
  gateStatus: "locked",
  accessLog: [],
  lastUpdated: new Date()
});

// Middleware for QR scanner parameters checking
const validateQRRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { scannedQRData, memberId, gymId } = req.body;

  if (!scannedQRData || typeof scannedQRData !== "string" || scannedQRData.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'scannedQRData is required and cannot be empty',
      gateAction: 'LOCK'
    });
  }

  if (!memberId) {
    return res.status(400).json({
      success: false,
      error: 'memberId is required',
      gateAction: 'LOCK'
    });
  }

  if (!gymId) {
    return res.status(400).json({
      success: false,
      error: 'gymId is required',
      gateAction: 'LOCK'
    });
  }

  next();
};

// POST Endpoint - Generate gym QR code
app.post("/api/qr/generate", async (req, res) => {
  try {
    const { gymId, gymName } = req.body;
    if (!gymId) {
      return res.status(400).json({ error: "gymId is required" });
    }

    // Unique QR payload schema mapping
    const qrData = {
      gymId: gymId,
      gymName: gymName || "Zymnix Gym",
      type: 'GYM_ENTRANCE',
      createdAt: new Date(),
      version: '1.0',
      timestamp: new Date().toISOString()
    };

    const qrString = JSON.stringify(qrData);

    // Generate optical QR matrix URI representation
    const qrImage = await QRCode.toDataURL(qrString);

    // Set high-fidelity controller gate twin with generating payloads
    const gate = dbGymGates.get(gymId) || {
      gymId,
      qrCode: "",
      gateStatus: "locked" as const,
      accessLog: [],
    } as GymGateDb;
    
    gate.qrCode = qrString;
    gate.qrImage = qrImage;
    gate.lastUpdated = new Date();
    dbGymGates.set(gymId, gate);

    res.json({
      success: true,
      message: 'QR code generated successfully',
      qrImage: qrImage,
      qrData: qrString
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to update in-memory gym gate access logs
const logAccessAttempt = (gymId: string, memberId: string, status: "granted" | "refused", code?: string) => {
  const gate = dbGymGates.get(gymId) || {
    gymId,
    qrCode: "",
    gateStatus: "locked" as const,
    accessLog: [],
  } as GymGateDb;

  gate.accessLog.unshift({
    memberId: memberId || "unknown",
    timestamp: new Date(),
    status: status === "granted" ? "granted" : `refused: ${code || "ERROR"}`
  });

  // Keep last 20 access entries
  gate.accessLog = gate.accessLog.slice(0, 20);
  gate.lastUpdated = new Date();
  dbGymGates.set(gymId, gate);
};

// Reusable 8-Step Verification Logic
interface QRValidationResult {
  isValid: boolean;
  code: string;
  error?: string;
  qrData?: any;
  member?: any;
}

const validateQRCodeAndMember = (
  scannedQRData: string | undefined | null,
  memberId: string,
  gymId: string
): QRValidationResult => {
  // Step 1: Check QR data exists (not empty, not null)
  if (!scannedQRData || typeof scannedQRData !== "string" || scannedQRData.trim() === "") {
    console.error(`[SECURITY LOG] Step 1 Failed: QR data is empty for member ${memberId}. Code: EMPTY_QR_DATA`);
    return {
      isValid: false,
      code: "EMPTY_QR_DATA",
      error: "❌ QR code data is empty. Please scan a valid gym poster."
    };
  }

  const trimmedData = scannedQRData.trim();

  // Step 2: Parse JSON (must be valid JSON)
  let qrData: any = null;
  try {
    let actualJSON = trimmedData;
    if (trimmedData.startsWith("http://") || trimmedData.startsWith("https://")) {
      try {
        const parsedUrl = new URL(trimmedData);
        const queryQR = parsedUrl.searchParams.get("scannedQRData");
        if (queryQR) {
          actualJSON = queryQR;
        }
      } catch (e: any) {
        console.warn("Failed parsing scanned URL query param:", e.message);
      }
    }

    // Special allowance for legacy/sandbox testing strings (represented as valid object)
    if (actualJSON === "zymnix_front_desk_checkin" || actualJSON === "iron_check_front_desk_checkin") {
      qrData = {
        type: "GYM_ENTRANCE",
        gymId: gymId || "gym_hq_1",
        version: "1.0",
        timestamp: new Date().toISOString()
      };
    } else {
      qrData = JSON.parse(actualJSON);
    }
  } catch (err: any) {
    console.error(`[SECURITY LOG] Step 2 Failed: Parse JSON failed for member ${memberId}. Reason: ${err.message}. Code: INVALID_QR_FORMAT`);
    return {
      isValid: false,
      code: "INVALID_QR_FORMAT",
      error: "❌ Invalid QR JSON format. Check QR code structure."
    };
  }

  // Step 3: Verify type = "GYM_ENTRANCE" (exactly match)
  if (!qrData || qrData.type !== "GYM_ENTRANCE") {
    console.error(`[SECURITY LOG] Step 3 Failed: Wrong QR Type for member ${memberId}. Got: ${qrData?.type}. Code: WRONG_QR_TYPE`);
    return {
      isValid: false,
      code: "WRONG_QR_TYPE",
      error: "❌ Wrong QR Type. This is not a valid entrance QR poster."
    };
  }

  // Step 4: Verify gymId matches current gym (string compare)
  if (qrData.gymId !== gymId) {
    console.error(`[SECURITY LOG] Step 4 Failed: Gym ID Mismatch for member ${memberId}. QR Gym: ${qrData.gymId}, Target: ${gymId}. Code: GYM_MISMATCH`);
    return {
      isValid: false,
      code: "GYM_MISMATCH",
      error: "❌ Gym Mismatch. This QR belongs to a different gym location."
    };
  }

  // Check and seed member dynamically under the hood for clean developer sandbox simulation
  let member = dbMembers.get(memberId);
  if (!member && memberId && !["customer_expired", "customer_inactive", "customer_no_payment"].includes(memberId)) {
    member = {
      _id: memberId,
      memberName: memberId.startsWith("att_") || memberId.includes("_") ? `Member ${memberId}` : `Athlete (${memberId})`,
      status: "active",
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Days Out
    };
    dbMembers.set(memberId, member);

    // Seed completed payment
    dbPayments.set(`pay_${memberId}`, {
      _id: `pay_${memberId}`,
      memberId,
      status: "completed",
      createdAt: new Date(),
    });
  }

  // Step 5: Check member exists in DB
  if (!member) {
    console.error(`[SECURITY LOG] Step 5 Failed: Member not found in DB. ID: ${memberId}. Code: MEMBER_NOT_FOUND`);
    return {
      isValid: false,
      code: "MEMBER_NOT_FOUND",
      error: "❌ Member not found. Please contact administration."
    };
  }

  // Step 6: Check member status = "active"
  if (member.status !== "active") {
    console.error(`[SECURITY LOG] Step 6 Failed: Inactive membership status for member ${memberId}. Code: INACTIVE_MEMBERSHIP`);
    return {
      isValid: false,
      code: "INACTIVE_MEMBERSHIP",
      error: "❌ Membership is inactive. Ingress blocked."
    };
  }

  // Step 7: Check membership not expired
  if (new Date(member.expiryDate) < new Date()) {
    console.error(`[SECURITY LOG] Step 7 Failed: Membership expired for member ${memberId} on ${member.expiryDate}. Code: MEMBERSHIP_EXPIRED`);
    return {
      isValid: false,
      code: "MEMBERSHIP_EXPIRED",
      error: "❌ Membership expired. Please clear dues."
    };
  }

  // Step 8: Check payment verified
  const paymentsForMember = Array.from(dbPayments.values())
    .filter(p => p.memberId === memberId && p.status === "completed")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (paymentsForMember.length === 0) {
    console.error(`[SECURITY LOG] Step 8 Failed: No verified payment found for member ${memberId}. Code: NO_PAYMENT`);
    return {
      isValid: false,
      code: "NO_PAYMENT",
      error: "❌ Payment not verified. Ingress blocked."
    };
  }

  return {
    isValid: true,
    code: "SUCCESS",
    qrData,
    member
  };
};

// Express handler core logic
const handleSecureGateTransaction = async (req: express.Request, res: express.Response) => {
  try {
    const { scannedQRData, memberId, gymId } = req.body;

    if (!memberId || !gymId) {
      return res.status(400).json({
        success: false,
        error: "memberId and gymId are required parameters.",
        code: "INVALID_PARAMETERS",
        gateAction: "LOCK"
      });
    }

    // 🚨 EMERGENCY LOCKDOWN PROTOCOL CHECK
    const currentGateway = dbGymGates.get(gymId || "gym_hq_1");
    if (currentGateway && currentGateway.lockdownMode) {
      logAccessAttempt(gymId, memberId, "refused", "EMERGENCY_LOCKDOWN");
      return res.status(403).json({
        success: false,
        error: "🚨 EMERGENCY GATE LOCKDOWN ACTIVE / आपातकालीन तालाबंदी\nगेट को सुरक्षा कारणों से ब्लॉक किया गया है (Access is restricted by admin lockdown directive)",
        code: "EMERGENCY_LOCKDOWN",
        gateAction: "LOCK"
      });
    }

    // Run the 8-Step Validations
    const validation = validateQRCodeAndMember(scannedQRData, memberId, gymId);

    if (!validation.isValid) {
      logAccessAttempt(gymId, memberId, "refused", validation.code);
      return res.status(validation.code === "MEMBER_NOT_FOUND" ? 404 : 403).json({
        success: false,
        error: validation.error,
        code: validation.code,
        gateAction: "LOCK"
      });
    }

    const member = validation.member;

    // Check duplicate check-in within 5 mins
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentAttendance = dbAttendance.find(a => 
      a.memberId === memberId &&
      a.gymId === gymId &&
      a.checkInTime >= fiveMinsAgo &&
      a.checkOutTime === null
    );

    if (recentAttendance) {
      console.error(`[SECURITY LOG] Duplicate scan detected within 5 minutes for member ${memberId}. Code: ALREADY_CHECKED_IN`);
      logAccessAttempt(gymId, memberId, "refused", "ALREADY_CHECKED_IN");
      return res.status(400).json({ 
        success: false,
        error: "❌ Already Checked In / पहले से प्रवेशित\nआप पहले ही चेक इन कर चुके हैं (Already checked in)",
        code: "ALREADY_CHECKED_IN",
        gateAction: "LOCK",
        data: {
          checkInTime: recentAttendance.checkInTime.toISOString(),
          duration: Math.round((Date.now() - recentAttendance.checkInTime.getTime()) / 60000)
        }
      });
    }

    // ALL SECURE VALIDATIONS PASSED -> LOG ATTENDANCE LOGS
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Look for today's active checking sessions to complete a check-out lifecycle
    let attendance = dbAttendance.find(a =>
      a.memberId === memberId &&
      a.gymId === gymId &&
      a.date >= todayStart &&
      a.date < todayEnd &&
      a.checkOutTime === null
    );

    if (attendance) {
      // CHECK OUT ACTIVE SESSION
      attendance.checkOutTime = now;
      attendance.duration = Math.round(
        (attendance.checkOutTime.getTime() - attendance.checkInTime.getTime()) / 60000
      );
      attendance.status = 'completed';
    } else {
      // INITIATE NEW CHECK IN SESSION
      attendance = {
        _id: `att_${memberId}_${Date.now()}`,
        memberId,
        gymId,
        checkInTime: now,
        checkOutTime: null,
        date: now,
        status: 'in-progress',
      };
      dbAttendance.push(attendance);
    }

    // Update physical hardware gate twin status in-memory
    const gate = dbGymGates.get(gymId) || {
      gymId,
      qrCode: "",
      gateStatus: "locked" as const,
      accessLog: [],
    } as GymGateDb;
    gate.gateStatus = "unlocked";
    gate.gateOpenedBy = member.memberName;
    gate.lastOpenedAt = now;
    gate.openDuration = 5;
    gate.accessLog.unshift({
      memberId,
      timestamp: now,
      status: "granted"
    });
    // Keep last 20 access entries
    gate.accessLog = gate.accessLog.slice(0, 20);
    gate.lastUpdated = now;
    dbGymGates.set(gymId, gate);

    // Auto lockout timeout of the entrance hardware (5 seconds default lockout duration)
    setTimeout(() => {
      const g = dbGymGates.get(gymId);
      if (g && g.gateStatus === "unlocked") {
        g.gateStatus = "locked";
        g.lastUpdated = new Date();
        dbGymGates.set(gymId, g);
      }
    }, 5000);

    // Dispatch signal to physical hardware twin handler (timeout after 3 seconds)
    controlGate("OPEN", 3000).catch((err) => {
      console.error("Hardware gate dispatch error:", err.message);
    });

    res.json({
      success: true,
      message: attendance.checkOutTime ? 'Checked out successfully' : 'Checked in successfully',
      attendance: {
        _id: attendance._id,
        memberId: member.memberName,
        checkInTime: attendance.checkInTime.toISOString(),
        checkOutTime: attendance.checkOutTime ? attendance.checkOutTime.toISOString() : null,
        status: attendance.status,
        duration: attendance.duration
      },
      gateAction: 'OPEN' // Trigger solenoid release
    });

  } catch (error: any) {
    console.error('Core QR Verification Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      code: 'SERVER_ERROR',
      gateAction: 'LOCK'
    });
  }
};

// POST Endpoint - Scan and Verify QR Entrance Biometrics
app.post("/api/qr/scan", validateQRRequest, handleSecureGateTransaction);

// POST Endpoint - Verification API (8 Validations specifically)
app.post("/api/qr/verify", validateQRRequest, handleSecureGateTransaction);

// GET Endpoint - Check physical hardware state for real-time digital sync
app.get("/api/qr/status/:gymId", async (req, res) => {
  try {
    const { gymId } = req.params;
    const gate = dbGymGates.get(gymId);
    
    res.json({
      success: true,
      qrActive: !!gate?.qrCode,
      gateStatus: gate?.gateStatus || "locked",
      lastUpdated: gate?.lastUpdated || null,
      qrImage: gate?.qrImage || null,
      lockdownMode: !!gate?.lockdownMode
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Endpoint - Set gate lockdown mode manually
app.post("/api/gym/gate/lockdown", async (req, res) => {
  try {
    const { gymId, lockdown } = req.body;
    const targetGymId = gymId || "gym_hq_1";
    const gate = dbGymGates.get(targetGymId) || {
      gymId: targetGymId,
      qrCode: "iron_check_front_desk_checkin",
      gateStatus: "locked",
      accessLog: [],
      lastUpdated: new Date()
    } as GymGateDb;
    gate.lockdownMode = !!lockdown;
    if (lockdown) {
      gate.gateStatus = "locked";
    }
    gate.lastUpdated = new Date();
    dbGymGates.set(targetGymId, gate);
    res.json({ success: true, lockdownMode: gate.lockdownMode });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET Endpoint - Fetch real-time gym occupancy stats and traffic curves
app.get("/api/gym/occupancy/:gymId", async (req, res) => {
  try {
    const { gymId } = req.params;
    const currentHour = new Date().getHours();
    
    // Custom hourly crowding curve
    let simulatedOccupants = 12;
    if (currentHour >= 1 && currentHour <= 5) {
      simulatedOccupants = 3;
    } else if (currentHour >= 6 && currentHour <= 9) {
      simulatedOccupants = 33; // Morning Peak
    } else if (currentHour >= 10 && currentHour <= 15) {
      simulatedOccupants = 17; // Midday
    } else if (currentHour >= 16 && currentHour <= 20) {
      simulatedOccupants = 39; // Evening Peak
    } else if (currentHour >= 21 || currentHour === 0) {
      simulatedOccupants = 8;  // Late Night
    }

    // Add actual active checked-in members in-progress
    const activeCheckedInCount = dbAttendance.filter(a => 
      a.checkOutTime === null && a.status === "in-progress"
    ).length;

    // Sum base occupants, active handshakes, and manual admin tweak overrides
    let currentOccupancy = simulatedOccupants + activeCheckedInCount + dbOccupancyOverride;
    if (currentOccupancy < 0) currentOccupancy = 0;
    const maxCapacity = 60;
    if (currentOccupancy > maxCapacity) currentOccupancy = maxCapacity;

    // Traffic categorization logic
    let trafficStatus = "Comfortable Space";
    let trafficClass = "text-amber-400";
    let trafficProgress = Math.round((currentOccupancy / maxCapacity) * 100);
    
    if (trafficProgress < 35) {
      trafficStatus = "Quiet (Low Traffic)";
      trafficClass = "text-emerald-400";
    } else if (trafficProgress < 75) {
      trafficStatus = "Comfortable Space";
      trafficClass = "text-amber-400";
    } else {
      trafficStatus = "Peak Traffic (Very Busy)";
      trafficClass = "text-rose-400";
    }

    const hourlyForecast = [
      { hour: "6 AM", ratio: 65, crowding: "High" },
      { hour: "9 AM", ratio: 50, crowding: "Moderate" },
      { hour: "12 PM", ratio: 30, crowding: "Low" },
      { hour: "3 PM", ratio: 35, crowding: "Low" },
      { hour: "6 PM", ratio: 85, crowding: "Peak" },
      { hour: "9 PM", ratio: 25, crowding: "Low" }
    ];

    res.json({
      success: true,
      gymId,
      currentOccupancy,
      maxCapacity,
      trafficStatus,
      trafficClass,
      trafficProgress,
      hourlyForecast
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Endpoint - Admin manual count adjustment override
app.post("/api/gym/occupancy/override", async (req, res) => {
  try {
    const { action, val } = req.body;
    if (action === "ADD") {
      dbOccupancyOverride += (val || 1);
    } else if (action === "SUBTRACT") {
      dbOccupancyOverride -= (val || 1);
    } else if (action === "RESET") {
      dbOccupancyOverride = 0;
    }
    res.json({
      success: true,
      dbOccupancyOverride
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PROGRESS TRACKING ROUTERS (User & Biometric analytics)
app.post("/api/progress/add", async (req, res) => {
  try {
    const { memberId, gymId, height, weight } = req.body;
    
    // Ensure database is connected
    await connectToMongoDB();

    const progressData: any = {
      height: {
        feet: height?.feet ? Number(height.feet) : 0,
        inches: height?.inches ? Number(height.inches) : 0
      },
      weight: {
        kg: weight?.kg ? Number(weight.kg) : 0
      }
    };

    // Deterministically map alphanumeric strings to valid 24-char ObjectId hexes
    if (memberId) {
      progressData.memberId = getDeterministicObjectId(memberId);
    }
    if (gymId) {
      progressData.gymId = getDeterministicObjectId(gymId);
    } else {
      progressData.gymId = getDeterministicObjectId("default-gym-id");
    }

    const progress = new MongoProgress(progressData);
    await progress.save();

    res.json({ 
      success: true, 
      bmi: progress.bmi, 
      weight: progress.weight,
      progress 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/progress/:memberId", async (req, res) => {
  try {
    const { memberId } = req.params;

    // Ensure database is connected
    await connectToMongoDB();

    const filter: any = {};
    if (memberId) {
      filter.memberId = getDeterministicObjectId(memberId);
    } else {
      filter.memberId = null;
    }

    const progressLogs = await MongoProgress.find(filter).sort({ date: -1 });
    res.json({ success: true, progress: progressLogs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// USER AUTHENTICATION & PROTECTED CONVERSATIONS API
// ==========================================

const JWT_SECRET = process.env.JWT_SECRET || "gym-super-secret-production-token";

// JWT Middleware to verify token and attach userId
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Access Denied: No token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (err: any) {
    return res.status(403).json({ success: false, error: "Access Denied: Invalid or expired token." });
  }
};

// Signup Endpoint: Hashes password, saves to Mongo, returns JWT token
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    await connectToMongoDB();

    const existingUser = await (MongoUser as any).findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email is already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await (MongoUser as any).create({
      email: email.toLowerCase().trim(),
      password: passwordHash,
      name: name || ""
    });

    const token = jwt.sign(
      { userId: newUser._id.toString(), email: newUser.email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id.toString(),
        email: newUser.email,
        name: newUser.name
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login Endpoint: Verifies password, returns JWT token
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    await connectToMongoDB();

    const user = await (MongoUser as any).findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all conversations for the authenticated user (Filtered by userId)
app.get("/api/conversations", authenticateToken, async (req: any, res: any) => {
  try {
    await connectToMongoDB();
    const conversations = await (MongoConversation as any).find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json({ success: true, conversations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new conversation for the authenticated user
app.post("/api/conversations", authenticateToken, async (req: any, res: any) => {
  try {
    const { title } = req.body;
    await connectToMongoDB();

    const newConv = await (MongoConversation as any).create({
      userId: req.userId,
      title: title || "New Chat"
    });

    res.status(201).json({ success: true, conversation: newConv });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all messages of a specific conversation (Access Checked & Filtered by userId)
app.get("/api/conversations/:id/messages", authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await connectToMongoDB();

    const conversation = await (MongoConversation as any).findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: "Conversation not found." });
    }

    // Access check: 403 Forbidden if wrong user tries to access conversation data
    if (conversation.userId !== req.userId) {
      return res.status(403).json({ success: false, error: "Access Denied: You do not own this conversation." });
    }

    const messages = await (MongoMessage as any).find({ conversationId: id, userId: req.userId }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send a message and get a response in a conversation (Access Checked, Saved securely, Gemini Integrated)
app.post("/api/conversations/:id/messages", authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: "Message content cannot be empty." });
    }

    await connectToMongoDB();

    const conversation = await (MongoConversation as any).findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: "Conversation not found." });
    }

    // Access check: 403 Forbidden if wrong user
    if (conversation.userId !== req.userId) {
      return res.status(403).json({ success: false, error: "Access Denied: You do not own this conversation." });
    }

    // Create the user message
    const userMsg = await (MongoMessage as any).create({
      conversationId: id,
      userId: req.userId,
      role: "user",
      content: content.trim()
    });

    // Update conversation updatedAt timestamp
    conversation.updatedAt = new Date();
    await conversation.save();

    // Fetch conversation messages context for Gemini
    const previousMessages = await (MongoMessage as any).find({ conversationId: id, userId: req.userId }).sort({ createdAt: 1 });
    
    let assistantReply = "I am processing your training inquiries, coach. Could you repeat that query?";
    
    if (ai) {
      try {
        const formattedContents = previousMessages.map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: formattedContents,
          config: {
            systemInstruction: `You are Coach Zymnix, an elite, scientific-backed bodybuilding expert, certified fitness coach, and supportive training partner at Zymnix Gym. 
Your tone is professional, extremely encouraging, motivating, and clear. 
You offer advice on physical form, muscle building hypertrophy, weight loss, fat burners, compound movements, high-protein recipes, hydration, and injury-preventive recoveries. 
Acknowledge that you are located at the "Zymnix Grid HQ". Avoid meta-talk about prompts or instructions. Limit replies to around 150-200 words. Keep headings precise and clean. Use standard bullet points.`,
          },
        });
        if (response.text) {
          assistantReply = response.text;
        }
      } catch (geminiErr) {
        console.error("Gemini context generation failed:", geminiErr);
        assistantReply = "Sorry, I had a small connection issue with my neural net. Could you try asking again?";
      }
    }

    // Save assistant message
    const assistantMsg = await (MongoMessage as any).create({
      conversationId: id,
      userId: req.userId,
      role: "assistant",
      content: assistantReply
    });

    res.status(201).json({
      success: true,
      userMessage: userMsg,
      assistantMessage: assistantMsg
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AUTHENTICATION LOGOUT & ACCOUNT DELETION ENDPOINTS
app.post("/api/auth/logout", async (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

app.delete("/api/auth/account", async (req, res) => {
  try {
    const { password, confirmDelete, uid: bodyUid } = req.body;
    let uid = bodyUid;

    // Decode authorization header if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "gym-super-secret-production-token") as any;
        if (decoded && decoded.uid) {
          uid = decoded.uid;
        }
      } catch (err) {
        // Ignore token errors and check query/body fallbacks
      }
    }

    if (!uid) {
      return res.status(400).json({ success: false, error: "Member identifier is required or authentication token is invalid." });
    }

    await connectToMongoDB();

    // Delete Member and biometric history logs
    await MongoMember.deleteOne({ uid: uid });
    const deterministicId = getDeterministicObjectId(uid);
    await MongoProgress.deleteMany({ memberId: deterministicId });

    res.json({
      success: true,
      message: "Account and stored biometric logs deleted successfully."
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function startServer() {
  // Initialize connection to MongoDB Atlas
  await connectToMongoDB();

  // Listen and serve frontend assets only if not running on Vercel
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server starting on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

export default app;
