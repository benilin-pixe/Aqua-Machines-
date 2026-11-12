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
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
      code: "AUTH_REQUIRED",
      error: "Authentication required. Please log in.",
    });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "USER") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(403).json({
        success: false,
        message: "Invalid user session token.",
        code: "INVALID_ROLE",
        error: "Invalid user session token.",
      });
      return;
    }

    const user = db.users.find((u) => u.id === decoded.id || u.id === decoded.uid);
    if (!user) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(401).json({
        success: false,
        message: "User account not found.",
        code: "USER_NOT_FOUND",
        error: "User account not found.",
      });
      return;
    }

    if (user.status === "SUSPENDED") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(403).json({
        success: false,
        message: "Your account has been suspended by administration. Contact support.",
        code: "ACCOUNT_SUSPENDED",
        error: "Your account has been suspended by administration. Contact support.",
      });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(401).json({
      success: false,
      message: "Session expired or invalid token. Please log in again.",
      code: "SESSION_EXPIRED",
      error: "Session expired or invalid token. Please log in again.",
    });
  }
}

export function requireActiveUser(req: any, res: any, next: any) {
  if (!req.user) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(401).json({
      success: false,
      message: "Authentication required.",
      code: "AUTH_REQUIRED",
      error: "Authentication required.",
    });
    return;
  }
  if (req.user.status === "PENDING_PAYMENT") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(402).json({
      success: false,
      message: "Registration payment required before accessing this service.",
      code: "PAYMENT_REQUIRED",
      error: "Registration payment required before accessing this service.",
      status: "PENDING_PAYMENT",
      registrationFee: db.siteSettings.registration_fee,
    });
    return;
  }
  if (req.user.status !== "ACTIVE") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(403).json({
      success: false,
      message: "Account is not in active state.",
      code: "ACCOUNT_INACTIVE",
      error: "Account is not in active state.",
    });
    return;
  }
  next();
}

export function authenticateAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : req.cookies?.aqua_admin_token;

  if (!token) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(401).json({
      success: false,
      message: "Administrator authentication required.",
      code: "ADMIN_AUTH_REQUIRED",
      error: "Administrator authentication required.",
    });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const validRoles = ["primary_admin", "SUPER_ADMIN", "ADMIN"];
    if (!validRoles.includes(decoded.role)) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(403).json({
        success: false,
        message: "Access forbidden: Administrator credentials required.",
        code: "FORBIDDEN",
        error: "Access forbidden: Administrator credentials required.",
      });
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
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(401).json({
        success: false,
        message: "Admin account disabled or not found.",
        code: "ADMIN_DISABLED",
        error: "Admin account disabled or not found.",
      });
      return;
    }

    req.admin = admin;
    next();
  } catch {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(401).json({
      success: false,
      message: "Admin session expired or invalid. Please log in again.",
      code: "SESSION_EXPIRED",
      error: "Admin session expired or invalid. Please log in again.",
    });
  }
}

export function requireSuperAdmin(req: any, res: any, next: any) {
  if (!req.admin || (req.admin.role !== "primary_admin" && req.admin.role !== "SUPER_ADMIN")) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(403).json({
      success: false,
      message: "Primary Administrator privileges required for this operation.",
      code: "SUPER_ADMIN_REQUIRED",
      error: "Primary Administrator privileges required for this operation.",
    });
    return;
  }
  next();
}
