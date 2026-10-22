import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db.ts";
import { generateUserToken, generateAdminToken, authenticateUser, authenticateAdmin } from "../auth.ts";

const router = Router();

// ==========================================
// USER AUTHENTICATION ENDPOINTS
// ==========================================

// User Registration (/signup)
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, phone, username, referralCode } = req.body;

    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      res.status(400).json({ error: "Please enter your full name (minimum 2 characters)." });
      return;
    }

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "A valid email address is required." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      res.status(400).json({ error: "Please enter a valid email address format (e.g., user@example.com)." });
      return;
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters long." });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: "Passwords do not match." });
      return;
    }

    if (!db.siteSettings.registration_enabled) {
      res.status(403).json({ error: "New user registrations are currently paused by administration." });
      return;
    }

    const cleanUsername = (username || cleanEmail.split("@")[0]).trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, "_");

    // Prevent duplicate account creation
    const existingUser = db.users.find(
      (u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername
    );
    if (existingUser) {
      res.status(409).json({ error: "An account with this email address already exists. Please sign in instead." });
      return;
    }

    const userId = `usr_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
    const userReferralCode = `AQUA-${cleanUsername.slice(0, 6).toUpperCase()}${Math.floor(10 + Math.random() * 90)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const regFeeAmount = db.siteSettings.registration_fee || 10000;
    const paymentId = `pay_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
    const paymentRef = `REG-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser = {
      id: userId,
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      phone: (phone || "").trim(),
      referralCode: userReferralCode,
      referredBy: referralCode ? referralCode.trim() : null,
      status: "PENDING_PAYMENT",
      role: "USER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newWallet = {
      id: `wal_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
      userId,
      availableBalance: 0,
      pendingBalance: 0,
      totalRewards: 0,
      totalWithdrawals: 0,
      updatedAt: new Date().toISOString(),
    };

    const registrationPayment = {
      id: paymentId,
      userId,
      amount: regFeeAmount,
      purpose: "REGISTRATION_FEE",
      status: "PENDING",
      provider: "MOBILE_MONEY_SIMULATOR",
      reference: paymentRef,
      createdAt: new Date().toISOString(),
    };

    db.mutate((d) => {
      d.users.push(newUser);
      d.userSecrets[userId] = passwordHash;
      d.wallets.push(newWallet);
      d.payments.push(registrationPayment);
      d.auditLogs.unshift({
        id: `aud_${uuidv4().slice(0, 8)}`,
        adminId: "SYSTEM",
        adminEmail: cleanEmail,
        action: "USER_REGISTERED_PENDING_FEE",
        reason: `New user registration for ${newUser.fullName} (${cleanEmail}). Pending UGX ${regFeeAmount.toLocaleString()} registration fee payment.`,
        timestamp: new Date().toISOString(),
      });
    });

    const token = generateUserToken(newUser);
    res.status(201).json({
      message: `Account registered successfully! Please complete the UGX ${regFeeAmount.toLocaleString()} registration fee payment to activate your account.`,
      token,
      paymentId,
      regFeeAmount,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phone,
        referralCode: newUser.referralCode,
        status: newUser.status,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Failed to process registration. Please try again." });
  }
});

// User Sign-In (/login)
router.post("/login", async (req, res) => {
  try {
    const { login, email, password } = req.body;
    const identifier = (email || login || "").trim().toLowerCase();

    if (!identifier || !password) {
      res.status(400).json({ error: "Please enter your email and password." });
      return;
    }

    const user = db.users.find(
      (u) => u.email.toLowerCase() === identifier || u.username.toLowerCase() === identifier
    );
    if (!user) {
      res.status(401).json({ error: "Invalid credentials. Please verify your email and password." });
      return;
    }

    const passwordHash = db.userSecrets[user.id];
    if (!passwordHash) {
      res.status(401).json({ error: "Account credentials error. Please reset your password." });
      return;
    }

    const isValid = await bcrypt.compare(password, passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials. Please verify your email and password." });
      return;
    }

    if (user.status === "SUSPENDED") {
      res.status(403).json({ error: "Your account has been suspended by administration. Please contact support." });
      return;
    }

    const token = generateUserToken(user);
    const wallet = db.wallets.find((w) => w.userId === user.id);

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        referralCode: user.referralCode,
        status: user.status,
        role: user.role,
        createdAt: user.createdAt,
      },
      wallet: wallet || { availableBalance: 0, pendingBalance: 0, totalRewards: 0, totalWithdrawals: 0 },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "An unexpected error occurred during login." });
  }
});

// User Forgot Password (/forgot-password)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "A valid email address is required." });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (user) {
      db.mutate((d) => {
        d.auditLogs.unshift({
          id: `aud_${uuidv4().slice(0, 8)}`,
          adminId: "SYSTEM",
          adminEmail: cleanEmail,
          action: "PASSWORD_RESET_REQUESTED",
          reason: `User password reset requested for ${cleanEmail}`,
          timestamp: new Date().toISOString(),
        });
      });
    }

    res.json({
      message: "If an account with this email address exists in Aqua Machines, a password reset link has been dispatched to your inbox.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Unable to process password reset request." });
  }
});

// Current User Session (/api/auth/me)
router.get("/me", authenticateUser, (req, res) => {
  const user = req.user;
  const wallet = db.wallets.find((w) => w.userId === user.id) || {
    id: "unknown",
    userId: user.id,
    availableBalance: 0,
    pendingBalance: 0,
    totalRewards: 0,
    totalWithdrawals: 0,
    updatedAt: new Date().toISOString(),
  };
  const activeSubscriptions = db.machineSubscriptions.filter((s) => s.userId === user.id && s.status === "ACTIVE").length;

  res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      referralCode: user.referralCode,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
    },
    wallet,
    activeSubscriptions,
  });
});

// ==========================================
// ADMINISTRATIVE AUTHENTICATION ENDPOINTS
// ==========================================

// Server-authoritative setup availability check
router.get("/admin/setup-status", (_req, res) => {
  const adminCount = db.admins.length;
  res.json({
    setupAvailable: adminCount === 0,
    adminCount,
  });
});

// First-time Primary Admin Setup (/admin/setup)
router.post("/admin/first-time-setup", async (req, res) => {
  try {
    // Atomic check: permanently disable once primary administrator exists
    if (db.admins.length > 0) {
      res.status(403).json({
        error: "Administrator setup is already complete.",
      });
      return;
    }

    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      res.status(400).json({ error: "Please enter your full name (minimum 2 characters)." });
      return;
    }

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "A valid administrator email address is required." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      res.status(400).json({ error: "Please provide a valid email format (e.g., admin@aquamachines.com)." });
      return;
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters long." });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: "Passwords do not match." });
      return;
    }

    const uid = `adm_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const nowIso = new Date().toISOString();

    // Exact schema requirements:
    // uid, fullName, email, role: "primary_admin", status: "active", createdAt, updatedAt, lastLoginAt
    // Passwords stored separately in adminSecrets, never in this profile record
    const newAdmin = {
      uid,
      id: uid,
      fullName: fullName.trim(),
      name: fullName.trim(),
      email: cleanEmail,
      role: "primary_admin",
      status: "active",
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastLoginAt: nowIso,
    };

    db.mutate((d) => {
      d.admins.push(newAdmin);
      d.adminSecrets[uid] = passwordHash;
      d.auditLogs.unshift({
        id: `aud_${uuidv4().slice(0, 8)}`,
        adminId: uid,
        adminEmail: cleanEmail,
        action: "PRIMARY_ADMIN_INITIALIZED",
        reason: `Primary administrator account provisioned for ${newAdmin.fullName} (${cleanEmail}). First-time setup is now permanently closed.`,
        timestamp: nowIso,
      });
    });

    const token = generateAdminToken(newAdmin);
    res.status(201).json({
      message: "Primary administrator account created successfully. Setup is now permanently closed.",
      token,
      admin: {
        uid: newAdmin.uid,
        id: newAdmin.uid,
        fullName: newAdmin.fullName,
        email: newAdmin.email,
        role: newAdmin.role,
        status: newAdmin.status,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (err) {
    console.error("Admin setup error:", err);
    res.status(500).json({ error: "Failed to initialize primary administrator." });
  }
});

// Admin Login (/admin/login)
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Please enter your administrator email and password." });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const admin = db.admins.find(
      (a: any) =>
        a.email.toLowerCase() === cleanEmail ||
        (a.username && a.username.toLowerCase() === cleanEmail)
    );

    // If an ordinary user tries to log in through /admin/login, reject them!
    if (!admin) {
      const ordinaryUser = db.users.find(
        (u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanEmail
      );
      if (ordinaryUser) {
        res.status(403).json({
          error: "Access denied. Ordinary user accounts cannot access the administrative portal.",
        });
        return;
      }

      res.status(401).json({ error: "Invalid administrator credentials." });
      return;
    }

    if (admin.status !== "active" && admin.isActive === false) {
      res.status(403).json({ error: "Administrative account is inactive. Access denied." });
      return;
    }

    const secretKey = admin.uid || admin.id;
    const secret = db.adminSecrets[secretKey] || db.adminSecrets[admin.id];
    if (!secret) {
      res.status(401).json({ error: "Administrative credentials configuration error." });
      return;
    }

    const isMatch = await bcrypt.compare(password, secret);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid administrator credentials." });
      return;
    }

    const nowIso = new Date().toISOString();
    db.mutate((d) => {
      const target = d.admins.find((a: any) => a.uid === admin.uid || a.id === admin.id);
      if (target) {
        target.lastLoginAt = nowIso;
        target.updatedAt = nowIso;
      }
      d.auditLogs.unshift({
        id: `aud_${uuidv4().slice(0, 8)}`,
        adminId: admin.uid || admin.id,
        adminEmail: admin.email,
        action: "ADMIN_LOGIN",
        reason: "Successful administrator authentication",
        timestamp: nowIso,
      });
    });

    const token = generateAdminToken(admin);
    res.json({
      message: "Administrator authenticated successfully.",
      token,
      admin: {
        uid: admin.uid || admin.id,
        id: admin.uid || admin.id,
        fullName: admin.fullName || admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status || "active",
      },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "An unexpected error occurred during administrative login." });
  }
});

// Admin Forgot Password (/admin/forgot-password)
router.post("/admin/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "A valid administrator email address is required." });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const admin = db.admins.find((a: any) => a.email.toLowerCase() === cleanEmail);

    if (admin) {
      db.mutate((d) => {
        d.auditLogs.unshift({
          id: `aud_${uuidv4().slice(0, 8)}`,
          adminId: admin.uid || admin.id,
          adminEmail: cleanEmail,
          action: "ADMIN_PASSWORD_RESET_REQUESTED",
          reason: `Password reset instructions requested for administrator ${cleanEmail}`,
          timestamp: new Date().toISOString(),
        });
      });
    }

    // Security requirement: Never reveal whether an email address is registered as admin
    res.json({
      message: "If an administrative account with this email address exists in Aqua Machines, password recovery instructions have been dispatched to your inbox.",
    });
  } catch (err) {
    console.error("Admin forgot password error:", err);
    res.status(500).json({ error: "Unable to process password reset request." });
  }
});

// Admin Session Verification (/api/auth/admin/me)
router.get("/admin/me", authenticateAdmin, (req, res) => {
  const admin = req.admin;
  res.json({
    admin: {
      uid: admin.uid || admin.id,
      id: admin.uid || admin.id,
      fullName: admin.fullName || admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status || "active",
      createdAt: admin.createdAt,
      lastLoginAt: admin.lastLoginAt,
    },
  });
});

export default router;
