import jwt from "jsonwebtoken";
import { db } from "./db.ts";

const JWT_SECRET = process.env.AUTH_SECRET || "aqua_machines_production_secret_key_2026";

export function generateUserToken(user: any) {
  return jwt.sign(
    {
      id: user.id || user.uid,
      uid: user.uid || user.id,
      email: user.email,
      username: user.username,
      role: "USER",
      status: user.status,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function generateAdminToken(admin: any) {
  return jwt.sign(
    {
      id: admin.id || admin.uid,
      uid: admin.uid || admin.id,
      email: admin.email,
      fullName: admin.fullName || admin.name,
      role: admin.role || "primary_admin",
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

export function authenticateUser(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : req.cookies?.aqua_user_token;

  if (!token) {
    res.status(401).json({ error: "Authentication required. Please log in." });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "USER") {
      res.status(403).json({ error: "Invalid user session token." });
      return;
    }

    const user = db.users.find((u) => u.id === decoded.id || u.id === decoded.uid);
    if (!user) {
      res.status(401).json({ error: "User account not found." });
      return;
    }

    if (user.status === "SUSPENDED") {
      res.status(403).json({ error: "Your account has been suspended by administration. Contact support." });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Session expired or invalid token. Please log in again." });
  }
}

export function requireActiveUser(req: any, res: any, next: any) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (req.user.status === "PENDING_PAYMENT") {
    res.status(402).json({
      error: "Registration payment required before accessing this service.",
      status: "PENDING_PAYMENT",
      registrationFee: db.siteSettings.registration_fee,
    });
    return;
  }
  if (req.user.status !== "ACTIVE") {
    res.status(403).json({ error: "Account is not in active state." });
    return;
  }
  next();
}

export function authenticateAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : req.cookies?.aqua_admin_token;

  if (!token) {
    res.status(401).json({ error: "Administrator authentication required." });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const validRoles = ["primary_admin", "SUPER_ADMIN", "ADMIN"];
    if (!validRoles.includes(decoded.role)) {
      res.status(403).json({ error: "Access forbidden: Administrator credentials required." });
      return;
    }

    const admin = db.admins.find(
      (a: any) =>
        a.id === decoded.id ||
        a.uid === decoded.uid ||
        a.id === decoded.uid ||
        a.uid === decoded.id
    );

    if (!admin || (admin.status !== "active" && admin.isActive === false)) {
      res.status(401).json({ error: "Admin account disabled or not found." });
      return;
    }

    req.admin = admin;
    next();
  } catch {
    res.status(401).json({ error: "Admin session expired or invalid. Please log in again." });
  }
}

export function requireSuperAdmin(req: any, res: any, next: any) {
  if (!req.admin || (req.admin.role !== "primary_admin" && req.admin.role !== "SUPER_ADMIN")) {
    res.status(403).json({ error: "Primary Administrator privileges required for this operation." });
    return;
  }
  next();
}
