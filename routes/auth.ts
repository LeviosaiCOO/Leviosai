import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../lib/db.js";
import { users, organizations } from "../lib/schema.js";
import { eq } from "drizzle-orm";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "catalyst-dev-secret-change-in-production";

// Extend Express Request with auth fields
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userEmail?: string;
      organizationId?: number | null;
    }
  }
}

// Register — auto-creates an organization for the user
router.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, organizationName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "All fields required" });
    }
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) return res.status(409).json({ error: "Email already registered" });

    // Create organization for this user
    const orgName = organizationName || `${firstName}'s Organization`;
    const [org] = await db.insert(organizations).values({ name: orgName }).returning();

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, firstName, lastName, organizationId: org.id })
      .returning();

    const token = jwt.sign(
      { userId: user.id, email: user.email, organizationId: org.id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: org.id,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.id, email: user.email, organizationId: user.organizationId },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get("/api/auth/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any;
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));
    if (!user) return res.status(401).json({ error: "User not found" });
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
    });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// Auth middleware — sets userId, userEmail, organizationId on request
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Authentication required" });
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any;
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.organizationId = decoded.organizationId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export default router;
