import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { db } from "../db.ts";
import { authenticateAdmin, requireSuperAdmin } from "../auth.ts";
import { paymentProvider } from "../paymentProvider.ts";

const router = Router();

router.use(authenticateAdmin);

// 1. Admin Overview Metrics
router.get("/overview", (req, res) => {
  const users = db.users;
  const subscriptions = db.machineSubscriptions;
  const payments = db.payments;
  const withdrawals = db.withdrawals;
  const walletTxs = db.walletTransactions;
  const rewardTxs = db.rewardTransactions;
  const tickets = db.supportTickets;

  const totalUsers = users.length;
  const activeUsers = users.filter((u: any) => u.status === "ACTIVE").length;
  const pendingUsers = users.filter((u: any) => u.status === "PENDING_PAYMENT").length;
  const suspendedUsers = users.filter((u: any) => u.status === "SUSPENDED").length;

  const activeSubscriptions = subscriptions.filter((s: any) => s.status === "ACTIVE").length;
  const totalMachines = db.machines.length;
  const availableMachines = db.machines.filter((m: any) => m.purchaseAvailable !== false).length;

  const registrationPayments = payments
    .filter((p: any) => p.purpose === "REGISTRATION_FEE" && p.status === "COMPLETED")
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const verifiedDeposits = payments
    .filter((p: any) => p.purpose === "WALLET_DEPOSIT" && p.status === "COMPLETED")
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const machinePurchaseVolume = payments
    .filter((p: any) => p.purpose === "MACHINE_PURCHASE" && p.status === "COMPLETED")
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const totalRewardsIssued = rewardTxs.reduce((sum: number, r: any) => sum + r.amount, 0);

  const pendingWithdrawals = withdrawals.filter((w: any) => w.status === "PENDING" || w.status === "PROCESSING");
  const pendingWithdrawalAmount = pendingWithdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);

  const completedWithdrawals = withdrawals.filter((w: any) => w.status === "COMPLETED");
  const completedWithdrawalAmount = completedWithdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);

  const openTicketsCount = tickets.filter((t: any) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const failedPaymentsCount = payments.filter((p: any) => p.status === "FAILED").length;

  const recentTransactions = walletTxs
    .slice()
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const recentAuditLogs = db.auditLogs
    .slice()
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  res.json({
    metrics: {
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      totalMachines,
      availableMachines,
      activeSubscriptions,
      registrationPayments,
      verifiedDeposits,
      machinePurchaseVolume,
      totalPlatformRevenue: registrationPayments + verifiedDeposits + machinePurchaseVolume,
      totalRewardsIssued,
      pendingWithdrawalCount: pendingWithdrawals.length,
      pendingWithdrawalAmount,
      completedWithdrawalCount: completedWithdrawals.length,
      completedWithdrawalAmount,
      openTicketsCount,
      failedPaymentsCount,
    },
    systemStatus: {
      maintenanceMode: db.siteSettings.maintenance_mode,
      platformDisabled: db.siteSettings.platform_disabled,
      registrationEnabled: db.siteSettings.registration_enabled,
      machinePurchasesEnabled: db.siteSettings.machine_purchases_enabled,
      withdrawalsEnabled: db.siteSettings.withdrawals_enabled,
    },
    recentTransactions,
    recentAuditLogs,
  });
});

// 2. User Management
router.get("/users", (req, res) => {
  const usersWithDetails = db.users.map((u: any) => {
    const wallet = db.wallets.find((w: any) => w.userId === u.id) || { availableBalance: 0, pendingBalance: 0, totalRewards: 0, totalWithdrawals: 0 };
    const userSubs = db.machineSubscriptions.filter((s: any) => s.userId === u.id);
    const userWithdrawals = db.withdrawals.filter((w: any) => w.userId === u.id);
    const userPayments = db.payments.filter((p: any) => p.userId === u.id);
    return {
      ...u,
      wallet,
      subscriptionsCount: userSubs.length,
      activeSubscriptionsCount: userSubs.filter((s: any) => s.status === "ACTIVE").length,
      withdrawalsCount: userWithdrawals.length,
      paymentsCount: userPayments.length,
    };
  });
  res.json({ users: usersWithDetails });
});

router.get("/users/:id", (req, res) => {
  const { id } = req.params;
  const user = db.users.find((u: any) => u.id === id);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  const wallet = db.wallets.find((w: any) => w.userId === id);
  const subscriptions = db.machineSubscriptions.filter((s: any) => s.userId === id);
  const transactions = db.walletTransactions.filter((t: any) => t.userId === id);
  const rewardTransactions = db.rewardTransactions.filter((r: any) => r.userId === id);
  const withdrawals = db.withdrawals.filter((w: any) => w.userId === id);
  const payments = db.payments.filter((p: any) => p.userId === id);
  const tickets = db.supportTickets.filter((t: any) => t.userId === id);

  res.json({
    user,
    wallet,
    subscriptions,
    transactions,
    rewardTransactions,
    withdrawals,
    payments,
    tickets,
  });
});

router.post("/users/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const admin = req.admin;

  if (!["ACTIVE", "SUSPENDED", "PENDING_PAYMENT"].includes(status)) {
    res.status(400).json({ error: "Invalid user status." });
    return;
  }
  if (!reason || reason.trim().length < 4) {
    res.status(400).json({ error: "A valid reason (min 4 characters) is required for account status modifications." });
    return;
  }

  const user = db.users.find((u: any) => u.id === id);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const prevStatus = user.status;
  db.mutate((d) => {
    const target = d.users.find((u: any) => u.id === id);
    if (target) {
      target.status = status;
      target.updatedAt = new Date().toISOString();
    }
    d.auditLogs.push({
      id: `aud_${uuidv4().slice(0, 8)}`,
      adminId: admin.id,
      adminEmail: admin.email,
      action: status === "SUSPENDED" ? "USER_SUSPENDED" : status === "ACTIVE" ? "USER_REACTIVATED" : "USER_STATUS_UPDATED",
      targetUserId: id,
      previousValue: prevStatus,
      newValue: status,
      reason: reason.trim(),
      timestamp: new Date().toISOString(),
    });
  });

  res.json({ message: `User status updated to ${status}.`, newStatus: status });
});

router.post("/users/:id/notes", (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  db.mutate((d) => {
    const target = d.users.find((u: any) => u.id === id);
    if (target) {
      target.internalNotes = notes;
      target.updatedAt = new Date().toISOString();
    }
  });
  res.json({ message: "Internal notes saved." });
});

router.post("/users/:id/reset-password", requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const admin = req.admin;

    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters long." });
      return;
    }

    const user = db.users.find((u: any) => u.id === id);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    db.mutate((d) => {
      d.userSecrets[id] = passwordHash;
      d.auditLogs.push({
        id: `aud_${uuidv4().slice(0, 8)}`,
        adminId: admin.id,
        adminEmail: admin.email,
        action: "ADMIN_RESET_USER_PASSWORD",
        targetUserId: id,
        reason: `Administrator reset password for user ${user.email}`,
        timestamp: new Date().toISOString(),
      });
    });

    res.json({ message: "User password reset successfully by administrator." });
  } catch (err) {
    console.error("Admin password reset error:", err);
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// 3. Water Machine Management
router.get("/machines", (req, res) => {
  const machines = db.machines.map((m: any) => {
    const subscriptions = db.machineSubscriptions.filter((s: any) => s.machineId === m.id);
    const activeCount = subscriptions.filter((s: any) => s.status === "ACTIVE").length;
    const revenue = subscriptions.reduce((sum: number, s: any) => sum + s.purchasePrice, 0);
    const totalRewardsPaid = subscriptions.reduce((sum: number, s: any) => sum + s.totalRewardsIssued, 0);
    return {
      ...m,
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeCount,
      revenueGenerated: revenue,
      totalRewardsPaid,
    };
  });
  res.json({ machines });
});

router.post("/machines", (req, res) => {
  try {
    const { name, model, price, durationDays, configuredDailyReward, configuredMonthlyReward, maxReward, description, specifications, waterCapacity, category, image, purchaseAvailable } = req.body;
    const admin = req.admin;

    if (!name || price === undefined || !durationDays || configuredDailyReward === undefined) {
      res.status(400).json({ error: "Name, price, durationDays, and configuredDailyReward are required." });
      return;
    }

    const machineId = `mach_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    const newMachine = {
      id: machineId,
      name: name.trim(),
      model: model ? model.trim() : `AQ-${Math.floor(100 + Math.random() * 900)}`,
      price: Number(price),
      durationDays: Number(durationDays),
      configuredDailyReward: Number(configuredDailyReward),
      configuredMonthlyReward: Number(configuredMonthlyReward || 0),
      maxReward: Number(maxReward || 0),
      status: "ACTIVE",
      image: image || "/src/assets/images/machine_aqua_pro_1791379641255.jpg",
      purchaseAvailable: purchaseAvailable !== false,
      description: description ? description.trim() : "Advanced water processing machine unit.",
      specifications: specifications ? specifications.trim() : "Standard filtration and telemetry integration.",
      waterCapacity: waterCapacity ? waterCapacity.trim() : "1,000 Liters / Day",
      category: category || "COMMERCIAL",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.mutate((d) => {
      d.machines.push(newMachine);
      d.auditLogs.push({
        id: `aud_${uuidv4().slice(0, 8)}`,
        adminId: admin.id,
        adminEmail: admin.email,
        action: "MACHINE_CREATED",
        newValue: JSON.stringify(newMachine),
        reason: `Created machine plan: ${newMachine.name}`,
        timestamp: nowIso,
      });
    });

    res.status(201).json({ message: "Machine plan created successfully.", machine: newMachine });
  } catch (err) {
    console.error("Machine create error:", err);
    res.status(500).json({ error: "Failed to create machine plan." });
  }
});

router.put("/machines/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const admin = req.admin;

    const machine = db.machines.find((m: any) => m.id === id);
    if (!machine) {
      res.status(404).json({ error: "Machine plan not found." });
      return;
    }

    const prevJson = JSON.stringify(machine);
    db.mutate((d) => {
      const target = d.machines.find((m: any) => m.id === id);
      if (updates.name !== undefined) target.name = updates.name.trim();
      if (updates.model !== undefined) target.model = updates.model.trim();
      if (updates.price !== undefined) {
        target.price = updates.price === null || updates.price === '' || updates.price === 'unavailable' ? null : Number(updates.price);
        target.priceVerified = target.price !== null && !isNaN(target.price);
      }
      if (updates.durationDays !== undefined) target.durationDays = Number(updates.durationDays);
      if (updates.configuredDailyReward !== undefined) target.configuredDailyReward = Number(updates.configuredDailyReward);
      if (updates.configuredMonthlyReward !== undefined) target.configuredMonthlyReward = Number(updates.configuredMonthlyReward);
      if (updates.maxReward !== undefined) target.maxReward = Number(updates.maxReward);
      if (updates.status !== undefined) target.status = updates.status;
      if (updates.purchaseAvailable !== undefined) target.purchaseAvailable = Boolean(updates.purchaseAvailable);
      if (updates.description !== undefined) target.description = updates.description.trim();
      if (updates.specifications !== undefined) target.specifications = updates.specifications.trim();
      if (updates.waterCapacity !== undefined) target.waterCapacity = updates.waterCapacity.trim();
      if (updates.category !== undefined) target.category = updates.category;
      if (updates.image !== undefined) target.image = updates.image;
      target.updatedAt = new Date().toISOString();

      d.auditLogs.push({
        id: `aud_${uuidv4().slice(0, 8)}`,
        adminId: admin.id,
        adminEmail: admin.email,
        action: "MACHINE_UPDATED",
        previousValue: prevJson,
        newValue: JSON.stringify(target),
        reason: updates.reason || `Updated machine configuration for ${target.name}`,
        timestamp: new Date().toISOString(),
      });
    });

    res.json({ message: "Machine plan updated successfully." });
  } catch (err) {
    console.error("Machine update error:", err);
    res.status(500).json({ error: "Failed to update machine plan." });
  }
});

// 4. Payments & Registrations Management
router.get("/payments", (req, res) => {
  const paymentsWithUser = db.payments.map((p: any) => {
    const user = db.users.find((u: any) => u.id === p.userId) || { fullName: "Unknown", email: p.userId };
    return { ...p, user };
  }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ payments: paymentsWithUser });
});

router.post("/payments/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const { simulateOutcome } = req.body;
    const admin = req.admin;

    const result = await paymentProvider.verifyPayment(id, simulateOutcome || "SUCCESS");
    if (!result.success) {
      res.status(400).json({ error: result.message, payment: result.payment });
      return;
    }

    db.mutate((d) => {
      d.auditLogs.push({
        id: `aud_${uuidv4().slice(0, 8)}`,
        adminId: admin.id,
        adminEmail: admin.email,
        action: "PAYMENT_ADMIN_RECONCILED",
        targetTransactionId: id,
        reason: `Administrator manually reconciled and verified payment #${id}`,
        timestamp: new Date().toISOString(),
      });
    });

    res.json({ message: result.message, payment: result.payment });
  } catch (err) {
    console.error("Admin payment verification error:", err);
    res.status(500).json({ error: "Failed to reconcile payment." });
  }
});

// 5. Withdrawal Management
router.get("/withdrawals", (req, res) => {
  const withdrawals = db.withdrawals.slice().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ withdrawals });
});

router.post("/withdrawals/:id/status", (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const admin = req.admin;

    const validStatuses = ["PENDING", "PROCESSING", "COMPLETED", "REJECTED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid withdrawal status." });
      return;
    }

    const withdrawal = db.withdrawals.find((w: any) => w.id === id);
    if (!withdrawal) {
      res.status(404).json({ error: "Withdrawal record not found." });
      return;
    }

    if (withdrawal.status === "COMPLETED" || withdrawal.status === "REJECTED") {
      res.status(400).json({ error: `Withdrawal has already been finalized as ${withdrawal.status}.` });
      return;
    }

    if ((status === "REJECTED" || status === "COMPLETED") && (!adminNotes || adminNotes.trim().length < 3)) {
      res.status(400).json({ error: "A descriptive reason or payout reference is mandatory for approving or rejecting withdrawals." });
      return;
    }

    const prevStatus = withdrawal.status;
    db.mutate((d) => {
      const target = d.withdrawals.find((w: any) => w.id === id);
      const wallet = d.wallets.find((w: any) => w.userId === target.userId);
      target.status = status;
      target.adminNotes = adminNotes ? adminNotes.trim() : target.adminNotes;
      target.processedBy = admin.email;
      target.processedAt = new Date().toISOString();
      target.updatedAt = new Date().toISOString();

      if (wallet) {
        if (status === "COMPLETED") {
          wallet.pendingBalance = Math.max(0, wallet.pendingBalance - target.amount);
          wallet.totalWithdrawals += target.amount;
          wallet.updatedAt = new Date().toISOString();

          const tx = d.walletTransactions.find((t: any) => t.userId === target.userId && t.metadata?.withdrawalId === target.id);
          if (tx) {
            tx.status = "COMPLETED";
          }

          d.notifications.push({
            id: `notif_${uuidv4().slice(0, 8)}`,
            userId: target.userId,
            title: "Withdrawal Completed & Paid Out",
            message: `Your withdrawal of UGX ${target.netAmount.toLocaleString()} to ${target.networkProvider} (${target.mobileNumber}) has been paid out successfully.`,
            type: "SUCCESS",
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        } else if (status === "REJECTED" || status === "CANCELLED") {
          wallet.pendingBalance = Math.max(0, wallet.pendingBalance - target.amount);
          wallet.availableBalance += target.amount;
          wallet.updatedAt = new Date().toISOString();

          d.walletTransactions.push({
            id: `wtx_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
            userId: target.userId,
            amount: target.amount,
            balanceAfter: wallet.availableBalance,
            type: "REFUND",
            status: "COMPLETED",
            reference: `REFUND-${target.id.slice(-6).toUpperCase()}`,
            description: `Refund for rejected withdrawal #${target.id.slice(-6)}: ${adminNotes || "Declined by administration"}`,
            metadata: { withdrawalId: target.id, reason: adminNotes },
            createdAt: new Date().toISOString(),
          });

          d.notifications.push({
            id: `notif_${uuidv4().slice(0, 8)}`,
            userId: target.userId,
            title: "Withdrawal Rejected & Refunded",
            message: `Your withdrawal of UGX ${target.amount.toLocaleString()} was rejected: ${adminNotes || "Verification required"}. Balance refunded to wallet.`,
            type: "WARNING",
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        } else if (status === "PROCESSING") {
          d.notifications.push({
            id: `notif_${uuidv4().slice(0, 8)}`,
            userId: target.userId,
            title: "Withdrawal Processing",
            message: `Your withdrawal of UGX ${target.amount.toLocaleString()} is currently being disbursed to ${target.networkProvider}.`,
            type: "INFO",
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      d.auditLogs.push({
        id: `aud_${uuidv4().slice(0, 8)}`,
        adminId: admin.id,
        adminEmail: admin.email,
        action: `WITHDRAWAL_${status}`,
        targetUserId: target.userId,
        targetTransactionId: target.id,
        previousValue: prevStatus,
        newValue: status,
        reason: adminNotes || `Admin updated withdrawal status to ${status}`,
        timestamp: new Date().toISOString(),
      });
    });

    res.json({ message: `Withdrawal marked as ${status}.` });
  } catch (err) {
    console.error("Withdrawal update error:", err);
    res.status(500).json({ error: "Failed to update withdrawal status." });
  }
});

// Admin Fund Allocation & Payment Scheduling
router.get("/allocations", (req, res) => {
  const allocations = db.fundAllocations
    .map((a: any) => {
      const user = db.users.find((u: any) => u.id === a.userId) || { fullName: "Unknown", email: a.userId };
      const schedule = db.paymentSchedules.find((s: any) => s.allocationId === a.id);
      return { ...a, user, schedule };
    })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const fundingAccounts = db.fundingAccounts;
  res.json({ allocations, fundingAccounts });
});

router.post("/allocations", requireSuperAdmin, (_req, res) => {
  res.status(403).json({
    error: "Demo funds allocation has been disabled. Aqua Machines operates exclusively with verified real-money mobile money and bank transactions.",
  });
});

// 6. Wallet Ledger & Manual Adjustments
router.post("/wallet-ops", requireSuperAdmin, (req, res) => {
  try {
    const { userId, amount, operationType, reason } = req.body;
    const admin = req.admin;

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: "Please specify a positive numerical amount." });
      return;
    }
    if (!reason || reason.trim().length < 5) {
      res.status(400).json({ error: "A descriptive reason (min 5 chars) is mandatory for manual financial ledger adjustments." });
      return;
    }

    const validTypes = ["CREDIT", "DEBIT", "REFUND", "ADJUSTMENT"];
    if (!validTypes.includes(operationType)) {
      res.status(400).json({ error: "Invalid wallet operation type." });
      return;
    }

    const user = db.users.find((u: any) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: "Target user could not be found." });
      return;
    }

    let resultWallet;
    db.mutate((d) => {
      let wallet = d.wallets.find((w: any) => w.userId === userId);
      if (!wallet) {
        wallet = {
          id: `wal_${uuidv4().slice(0, 8)}`,
          userId,
          availableBalance: 0,
          pendingBalance: 0,
          totalRewards: 0,
          totalWithdrawals: 0,
          updatedAt: new Date().toISOString(),
        };
        d.wallets.push(wallet);
      }

      const prevBalance = wallet.availableBalance;
      let txType = "ADMIN_CREDIT";
      let delta = numAmount;
      if (operationType === "DEBIT") {
        txType = "ADMIN_DEBIT";
        delta = -numAmount;
      } else if (operationType === "REFUND") {
        txType = "REFUND";
        delta = numAmount;
      } else if (operationType === "ADJUSTMENT") {
        txType = "ADJUSTMENT";
        delta = numAmount;
      }

      if (delta < 0 && wallet.availableBalance + delta < 0) {
        throw new Error(`Cannot debit UGX ${numAmount.toLocaleString()} because user balance is only UGX ${wallet.availableBalance.toLocaleString()}`);
      }

      wallet.availableBalance += delta;
      wallet.updatedAt = new Date().toISOString();
      resultWallet = wallet;

      const txId = `wtx_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
      const ref = `ADM-OP-${operationType}-${Date.now().toString(36).toUpperCase()}`;

      d.walletTransactions.push({
        id: txId,
        userId,
        amount: delta,
        balanceAfter: wallet.availableBalance,
        type: txType,
        status: "COMPLETED",
        reference: ref,
        description: `Admin ${operationType}: ${reason.trim()} (Authorized by ${admin.email})`,
        metadata: { adminId: admin.id, adminEmail: admin.email, operationType, reason },
        createdAt: new Date().toISOString(),
      });

      d.auditLogs.push({
        id: `aud_${uuidv4().slice(0, 8)}`,
        adminId: admin.id,
        adminEmail: admin.email,
        action: `ADMIN_WALLET_${operationType}`,
        targetUserId: userId,
        targetTransactionId: txId,
        previousValue: `UGX ${prevBalance.toLocaleString()}`,
        newValue: `UGX ${wallet.availableBalance.toLocaleString()} (Delta: ${delta >= 0 ? "+" : ""}${delta.toLocaleString()})`,
        reason: reason.trim(),
        timestamp: new Date().toISOString(),
      });

      d.notifications.push({
        id: `notif_${uuidv4().slice(0, 8)}`,
        userId,
        title: `Wallet Adjustment: ${operationType}`,
        message: `${delta >= 0 ? "+" : ""}UGX ${delta.toLocaleString()} — ${reason.trim()}`,
        type: delta >= 0 ? "SUCCESS" : "WARNING",
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    res.json({ message: `Wallet operation [${operationType}] completed successfully.`, wallet: resultWallet });
  } catch (err: any) {
    console.error("Wallet operation error:", err);
    res.status(400).json({ error: err.message || "Failed to complete wallet operation." });
  }
});

// 7. Machine Returns Management
router.get("/returns", (req, res) => {
  const subscriptions = db.machineSubscriptions;
  const returnTransactions = db.returnTransactions;
  res.json({ subscriptions, returnTransactions });
});

// 8. Website Content & Settings Management
router.get("/settings", (req, res) => {
  res.json({ settings: db.siteSettings });
});

router.put("/settings", (req, res) => {
  try {
    const updates = req.body;
    const admin = req.admin;

    if (updates.platform_disabled !== undefined && admin.role !== "primary_admin" && admin.role !== "SUPER_ADMIN") {
      res.status(403).json({ error: "Primary Administrator role required to toggle emergency platform status." });
      return;
    }

    const prevSettings = JSON.stringify(db.siteSettings);
    db.mutate((d) => {
      d.siteSettings = { ...d.siteSettings, ...updates };
      d.auditLogs.push({
        id: `aud_${uuidv4().slice(0, 8)}`,
        adminId: admin.id,
        adminEmail: admin.email,
        action: "SETTINGS_CHANGED",
        previousValue: prevSettings,
        newValue: JSON.stringify(d.siteSettings),
        reason: updates.reason || "Admin updated platform settings",
        timestamp: new Date().toISOString(),
      });
    });

    res.json({ message: "Platform settings updated successfully.", settings: db.siteSettings });
  } catch (err) {
    console.error("Settings update error:", err);
    res.status(500).json({ error: "Failed to save settings." });
  }
});

// 9. Support Tickets Management
router.get("/tickets", (req, res) => {
  const tickets = db.supportTickets.slice().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ tickets });
});

router.post("/tickets/:id/reply", (req, res) => {
  try {
    const { id } = req.params;
    const { reply, status } = req.body;
    const admin = req.admin;

    if (!reply || reply.trim().length < 2) {
      res.status(400).json({ error: "Please enter a reply message." });
      return;
    }

    const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    const newStatus = validStatuses.includes(status) ? status : "RESOLVED";

    const ticket = db.supportTickets.find((t: any) => t.id === id);
    if (!ticket) {
      res.status(404).json({ error: "Support ticket not found." });
      return;
    }

    db.mutate((d) => {
      const target = d.supportTickets.find((t: any) => t.id === id);
      target.adminReply = reply.trim();
      target.status = newStatus;
      target.repliedAt = new Date().toISOString();
      target.updatedAt = new Date().toISOString();

      d.auditLogs.push({
        id: `aud_${uuidv4().slice(0, 8)}`,
        adminId: admin.id,
        adminEmail: admin.email,
        action: "SUPPORT_TICKET_REPLIED",
        targetTransactionId: id,
        reason: `Replied to support ticket #${id.slice(-6)}`,
        timestamp: new Date().toISOString(),
      });

      d.notifications.push({
        id: `notif_${uuidv4().slice(0, 8)}`,
        userId: target.userId,
        title: `Support Ticket #${target.id.slice(-6)} Replied`,
        message: `Admin response: "${reply.trim().slice(0, 90)}..."`,
        type: "INFO",
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    res.json({ message: "Reply sent and ticket status updated successfully." });
  } catch (err) {
    console.error("Ticket reply error:", err);
    res.status(500).json({ error: "Failed to reply to support ticket." });
  }
});

// 10. Audit Logs & Reports
router.get("/audit-logs", (req, res) => {
  const logs = db.auditLogs.slice().sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json({ logs });
});

router.get("/reports/export/:type", (req, res) => {
  const { type } = req.params;
  let data: any[] = [];
  let filename = `aquamachines_report_${type}_${Date.now()}.csv`;

  if (type === "users") {
    data = db.users;
  } else if (type === "payments") {
    data = db.payments;
  } else if (type === "withdrawals") {
    data = db.withdrawals;
  } else if (type === "transactions") {
    data = db.walletTransactions;
  } else if (type === "audit-logs") {
    data = db.auditLogs;
  } else {
    res.status(400).json({ error: "Invalid report export type." });
    return;
  }

  res.json({ type, filename, count: data.length, data });
});

// 11. Administrators Management
router.get("/admins", requireSuperAdmin, (req, res) => {
  res.json({ admins: db.admins });
});

router.post("/admins", requireSuperAdmin, async (req, res) => {
  try {
    const { username, email, name, password, role } = req.body;
    const currentAdmin = req.admin;

    if (!username || !email || !password || !name) {
      res.status(400).json({ error: "Username, email, name, and password are required." });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    const exists = db.admins.find((a: any) => a.email.toLowerCase() === cleanEmail || a.username.toLowerCase() === cleanUsername);
    if (exists) {
      res.status(400).json({ error: "Administrator with this email or username already exists." });
      return;
    }

    const newAdminId = `adm_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = {
      id: newAdminId,
      username: cleanUsername,
      email: cleanEmail,
      fullName: name.trim(),
      role: role === "primary_admin" || role === "SUPER_ADMIN" ? role : "ADMIN",
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.mutate((d) => {
      d.admins.push(newAdmin);
      d.adminSecrets[newAdminId] = passwordHash;
      d.auditLogs.push({
        id: `aud_${uuidv4().slice(0, 8)}`,
        adminId: currentAdmin.id,
        adminEmail: currentAdmin.email,
        action: "ADMIN_USER_CREATED",
        newValue: JSON.stringify({ id: newAdmin.id, username: newAdmin.username, role: newAdmin.role }),
        reason: `Provisioned new admin account for ${newAdmin.fullName}`,
        timestamp: new Date().toISOString(),
      });
    });

    res.status(201).json({ message: "Administrator account provisioned successfully.", admin: newAdmin });
  } catch (err) {
    console.error("Admin provision error:", err);
    res.status(500).json({ error: "Failed to provision administrator." });
  }
});

export default router;
