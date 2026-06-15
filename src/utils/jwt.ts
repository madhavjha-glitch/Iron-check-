import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "gym-super-secret-production-token";

interface DecodedToken {
  uid: string;
  email: string;
  role: "admin" | "customer";
  iat: number;
  exp: number;
}

/**
 * Generate a secure JWT JSON token for a user session
 * @param payload Auth details
 * @param expiresIn Expiration duration (default 7 days)
 */
export function generateToken(payload: { uid: string; email: string; role: string }, expiresIn = "7d"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
}

/**
 * Express middleware to authenticate and authorize requests via Bearer JWT token
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Authorization token missing or invalid format. Please use 'Bearer <token>'"
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    (req as any).user = decoded; // Inject decoded user schema into Request
    next();
  } catch (err: any) {
    res.status(403).json({
      success: false,
      error: "Authentication token is expired or altered.",
      details: err.message
    });
  }
}

/**
 * Router check middleware enforcing Admin privilege levels exclusively
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as DecodedToken | undefined;

  if (!user || user.role !== "admin") {
    res.status(403).json({
      success: false,
      error: "Forbidden. Administrative access permissions required."
    });
    return;
  }

  next();
}
