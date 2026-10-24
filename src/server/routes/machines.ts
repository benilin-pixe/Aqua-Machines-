import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db.ts";
import { authenticateUser, requireActiveUser } from "../auth.ts";
import { paymentProvider } from "../paymentProvider.ts";

const router = Router();

// Get published machines catalogue
router.get("/", (_req, res) => {
  const machines = db.machines.filter((m) => m.status !== "ARCHIVED");
  res.json({ machines });
});

// Get user's machine orders and subscriptions
router.get("/orders", authenticateUser, (req, res) => {
  const user = req.user;
  const orders = db.machineOrders.filter((o) => o.userId === user.id);
  const subscriptions = db.machineSubscriptions.filter((s) => s.userId === user.id);
  res.json({ orders, subscriptions });
});

// Get user's machine returns and calculation summary
router.get("/returns", authenticateUser, (req, res) => {
  const user = req.user;
  const nowMs = Date.now();

  // Auto-expire any expired trials on access
  const allUserSubs = db.machineSubscriptions.filter((s: any) => s.userId === user.id && s.status === "ACTIVE");
  for (const s of allUserSubs) {
    if (s.isTrial || s.machineId === "mach_aqua_starter") {
      if (new Date(s.expiryDate).getTime() <= nowMs) {
        db.mutate((d) => {
          const target = d.machineSubscriptions.find((sub: any) => sub.id === s.id);
          if (target && target.status === "ACTIVE") {
            target.status = "EXPIRED";
            target.updatedAt = new Date().toISOString();
          }
          const t = d.trials.find((tr: any) => tr.subscriptionId === s.id || (tr.userId === user.id && tr.machineId === s.machineId));
          if (t && t.status === "ACTIVE") {
            t.status = "EXPIRED";
            t.cleanedUpAt = new Date().toISOString();
            t.updatedAt = new Date().toISOString();
          }
        });
      }
    }
  }

  const subscriptions = db.machineSubscriptions.filter((s: any) => s.userId === user.id && s.status === "ACTIVE");
  const returnTransactions = db.returnTransactions.filter((r: any) => r.userId === user.id);
  const wallet = db.wallets.find((w: any) => w.userId === user.id) || { availableBalance: 0, pendingBalance: 0 };


  // Calculate actual days in current month for accurate monthly return projection
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

  const returnDetails = subscriptions.map((sub) => {
    const machine = db.machines.find((m) => m.id === sub.machineId);
    const dailyReturn = sub.rewardConfiguration.dailyReward;
    const monthlyReturn = dailyReturn * daysInCurrentMonth;
    const nextScheduledDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    return {
      subscriptionId: sub.id,
      machineId: sub.machineId,
      machineName: sub.machineName,
      purchaseDate: sub.activationDate,
      dailyReturnAmount: dailyReturn,
      monthlyReturnAmount: monthlyReturn,
      daysInMonth: daysInCurrentMonth,
      totalReturnsCredited: sub.totalRewardsIssued,
      maxReward: sub.rewardConfiguration.maxReward,
      nextScheduledReturnDate: nextScheduledDate,
      returnsConfigured: machine ? machine.returnsConfigured : true,
      returnModelType: machine ? machine.returnModelType : "VERIFIED_MODEL",
    };
  });

  const totalReturnsCredited = subscriptions.reduce((sum, s) => sum + s.totalRewardsIssued, 0);

  res.json({
    returnsSummary: {
      activeMachinesCount: subscriptions.length,
      totalReturnsCredited,
      accumulatedBalance: wallet.availableBalance,
      eligibleForWithdrawal: wallet.availableBalance >= (db.siteSettings.min_withdrawal || 10000),
      withdrawalFeePercent: db.siteSettings.withdrawal_fee_percent || 2,
      minWithdrawal: db.siteSettings.min_withdrawal || 10000,
    },
    returnDetails,
    returnTransactions: returnTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  });
});

// 1. Get trial status for authenticated user with authoritative server timestamp
router.get("/trial/status", authenticateUser, (req, res) => {
  const user = req.user;
  const trials = (db.trials || []).filter((t: any) => t.userId === user.id);
  const activeOrLatestTrial = trials.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const serverNow = Date.now();
  const serverTime = new Date(serverNow).toISOString();

  if (!activeOrLatestTrial) {
    res.json({
      trial: null,
      serverTime,
      hasActiveTrial: false,
      isExpired: false,
      remainingMs: 0,
      remainingHours: 0,
    });
    return;
  }

  const expiresAtMs = new Date(activeOrLatestTrial.expiresAt).getTime();
  const isExpired = serverNow >= expiresAtMs || activeOrLatestTrial.status !== 'ACTIVE';
  const remainingMs = Math.max(0, expiresAtMs - serverNow);
  const remainingHours = Number((remainingMs / (1000 * 60 * 60)).toFixed(2));

  // If expired on access and still ACTIVE, update idempotently
  if (isExpired && activeOrLatestTrial.status === 'ACTIVE') {
    db.mutate((d) => {
      const t = d.trials.find((tr: any) => tr.id === activeOrLatestTrial.id);
      if (t && t.status === 'ACTIVE') {
        t.status = 'EXPIRED';
        t.cleanedUpAt = serverTime;
        t.updatedAt = serverTime;
      }
      const s = d.machineSubscriptions.find((sub: any) => sub.id === activeOrLatestTrial.subscriptionId);
      if (s && s.status === 'ACTIVE') {
        s.status = 'EXPIRED';
        s.updatedAt = serverTime;
      }
    });
  }

  res.json({
    trial: {
      ...activeOrLatestTrial,
      status: isExpired ? (activeOrLatestTrial.status === 'REVOKED' ? 'REVOKED' : 'EXPIRED') : activeOrLatestTrial.status,
    },
    serverTime,
    hasActiveTrial: !isExpired && activeOrLatestTrial.status === 'ACTIVE',
    isExpired,
    remainingMs: isExpired ? 0 : remainingMs,
    remainingHours: isExpired ? 0 : remainingHours,
  });
});

// Debug endpoint for test verification: force expire authenticated user's active trial
router.post("/trial/debug-expire", authenticateUser, (req, res) => {
  const user = req.user;
  const nowMs = Date.now();
  const pastIso = new Date(nowMs - 5000).toISOString();

  db.mutate((d) => {
    const trial = (d.trials || []).find((t: any) => t.userId === user.id && t.status === "ACTIVE");
    if (trial) {
      trial.expiresAt = pastIso;
      trial.status = "EXPIRED";
      trial.cleanedUpAt = pastIso;
      trial.updatedAt = pastIso;
    }
    const sub = (d.machineSubscriptions || []).find((s: any) => s.userId === user.id && (s.isTrial || s.machineId === "mach_aqua_starter") && s.status === "ACTIVE");
    if (sub) {
      sub.expiryDate = pastIso;
      sub.status = "EXPIRED";
      sub.updatedAt = pastIso;
    }
  });

  res.json({ message: "Trial forced to expired for testing.", expiresAt: pastIso });
});

// 2. Dedicated 48-Hour Starter Trial Activation
router.post("/trial/activate", authenticateUser, requireActiveUser, (req, res) => {
  const user = req.user;
  const starterMachine = db.machines.find((m: any) => m.id === "mach_aqua_starter" || m.category === "STARTER");
  if (!starterMachine) {
    res.status(404).json({ error: "Complimentary starter trial unit is not available." });
    return;
  }

  // Abuse prevention: Check if user already has an active trial or previously used trial for this machine
  const existingTrial = (db.trials || []).find(
    (t: any) => t.userId === user.id && (t.status === "ACTIVE" || t.machineId === starterMachine.id)
  );
  if (existingTrial) {
    res.status(400).json({
      error: "You have already activated or exhausted your complimentary 48-hour starter trial.",
      trial: existingTrial,
    });
    return;
  }

  const existingSub = db.machineSubscriptions.find(
    (s: any) => s.userId === user.id && s.machineId === starterMachine.id
  );
  if (existingSub) {
    res.status(400).json({ error: "You have already activated the complimentary Aqua Starter trial unit." });
    return;
  }

  const nowMs = Date.now();
  const activatedAt = new Date(nowMs).toISOString();
  const DURATION_HOURS = 48;
  const DURATION_MS = DURATION_HOURS * 60 * 60 * 1000; // exactly 172,800,000 ms
  const expiresAt = new Date(nowMs + DURATION_MS).toISOString();

  const trialId = `trial_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
  const orderId = `ord_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
  const subId = `sub_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
  const orderRef = `ORD-TRL-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newTrial = {
    id: trialId,
    userId: user.id,
    userEmail: user.email,
    machineId: starterMachine.id,
    machineName: starterMachine.name,
    subscriptionId: subId,
    orderId,
    status: "ACTIVE",
    durationHours: DURATION_HOURS,
    durationMs: DURATION_MS,
    activatedAt,
    expiresAt,
    cleanedUpAt: null,
    createdAt: activatedAt,
    updatedAt: activatedAt,
  };

  const newOrder = {
    id: orderId,
    orderReference: orderRef,
    userId: user.id,
    userEmail: user.email,
    machineId: starterMachine.id,
    machineName: starterMachine.name,
    purchasePrice: 0,
    paymentStatus: "COMPLETED",
    orderStatus: "ACTIVE",
    paymentMethod: "WALLET",
    termsAccepted: true,
    createdAt: activatedAt,
    updatedAt: activatedAt,
  };

  const sub = {
    id: subId,
    userId: user.id,
    machineId: starterMachine.id,
    machineName: starterMachine.name,
    isTrial: true,
    trialId,
    purchaseTransactionId: `wtx_trial_${Date.now()}`,
    purchasePrice: 0,
    activationDate: activatedAt,
    expiryDate: expiresAt,
    status: "ACTIVE",
    rewardConfiguration: {
      dailyReward: starterMachine.configuredDailyReward || 1500,
      monthlyReward: 0,
      maxReward: starterMachine.maxReward || 3000,
      durationDays: 2,
    },
    totalRewardsIssued: 0,
    createdAt: activatedAt,
    updatedAt: activatedAt,
  };

  db.mutate((d) => {
    if (!Array.isArray(d.trials)) d.trials = [];
    d.trials.push(newTrial);
    d.machineOrders.push(newOrder);
    d.machineSubscriptions.push(sub);
    d.auditLogs.unshift({
      id: `aud_${uuidv4().slice(0, 8)}`,
      adminId: user.id,
      adminEmail: user.email,
      action: "TRIAL_ACTIVATED",
      reason: `User activated 48-hour trial for machine ${starterMachine.name} (Trial ID: ${trialId}, Expires: ${expiresAt})`,
      timestamp: activatedAt,
    });
  });

  res.status(201).json({
    message: "48-Hour Starter Trial activated successfully!",
    trial: newTrial,
    order: newOrder,
    subscription: sub,
    serverTime: activatedAt,
  });
});

// 3. Claim performance returns from leased machine with 48h trial enforcement
router.post("/:subscriptionId/claim", authenticateUser, requireActiveUser, (req, res) => {
  const { subscriptionId } = req.params;
  const user = req.user;
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const sub = db.machineSubscriptions.find((s: any) => s.id === subscriptionId && s.userId === user.id);
  if (!sub) {
    res.status(404).json({ error: "Machine lease subscription not found." });
    return;
  }

  // Check trial lifecycle if subscription is a trial
  if (sub.isTrial || sub.machineId === "mach_aqua_starter") {
    const trial = (db.trials || []).find((t: any) => t.subscriptionId === sub.id || (t.userId === user.id && t.machineId === sub.machineId));
    const expiresAtMs = trial ? new Date(trial.expiresAt).getTime() : new Date(sub.expiryDate).getTime();

    if (nowMs >= expiresAtMs || (trial && trial.status !== "ACTIVE") || sub.status !== "ACTIVE") {
      // Immediate server-side access denial at/after 48 hours
      db.mutate((d) => {
        if (trial && trial.status === "ACTIVE") {
          const t = d.trials.find((tr: any) => tr.id === trial.id);
          if (t) {
            t.status = "EXPIRED";
            t.cleanedUpAt = nowIso;
            t.updatedAt = nowIso;
          }
        }
        const s = d.machineSubscriptions.find((ms: any) => ms.id === sub.id);
        if (s && s.status === "ACTIVE") {
          s.status = "EXPIRED";
          s.updatedAt = nowIso;
        }
      });

      res.status(403).json({
        error: "Free trial period of 48 hours has elapsed. Access denied. Please lease a commercial unit to continue earning.",
        isExpired: true,
      });
      return;
    }
  }

  if (sub.status !== "ACTIVE") {
    res.status(400).json({ error: "This machine subscription is no longer active." });
    return;
  }

  const dailyReward = sub.rewardConfiguration?.dailyReward || 1500;
  const maxReward = sub.rewardConfiguration?.maxReward || 3000;

  if (sub.totalRewardsIssued >= maxReward) {
    res.status(400).json({ error: "Maximum yield cap for this machine cycle has been reached." });
    return;
  }

  const claimAmount = Math.min(dailyReward, maxReward - sub.totalRewardsIssued);
  const txRef = `RWD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  db.mutate((d) => {
    const targetSub = d.machineSubscriptions.find((s: any) => s.id === sub.id);
    if (targetSub) {
      targetSub.totalRewardsIssued += claimAmount;
      targetSub.updatedAt = nowIso;
    }

    let wallet = d.wallets.find((w: any) => w.userId === user.id);
    if (!wallet) {
      wallet = { userId: user.id, availableBalance: 0, pendingBalance: 0, totalRewards: 0, totalWithdrawals: 0, updatedAt: nowIso };
      d.wallets.push(wallet);
    }
    wallet.availableBalance += claimAmount;
    wallet.totalRewards = (wallet.totalRewards || 0) + claimAmount;
    wallet.updatedAt = nowIso;

    d.rewardTransactions.push({
      id: `rwd_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
      userId: user.id,
      subscriptionId: sub.id,
      machineName: sub.machineName,
      amount: claimAmount,
      type: "DAILY_RETURN",
      status: "CREDITED",
      reference: txRef,
      description: `Daily performance yield claimed for ${sub.machineName}`,
      createdAt: nowIso,
    });

    d.walletTransactions.push({
      id: `wtx_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
      userId: user.id,
      amount: claimAmount,
      balanceAfter: wallet.availableBalance,
      type: "REWARD_PAYOUT",
      status: "COMPLETED",
      reference: txRef,
      description: `Telemetry yield payout: ${sub.machineName}`,
      createdAt: nowIso,
    });
  });

  res.json({
    message: `Yield of UGX ${claimAmount.toLocaleString()} claimed successfully!`,
    claimedAmount: claimAmount,
    newBalance: (db.wallets.find((w: any) => w.userId === user.id)?.availableBalance || 0),
  });
});

// Purchase / Order water machine
router.post("/purchase", authenticateUser, requireActiveUser, async (req, res) => {
  try {
    const { machineId, paymentMethod, termsAccepted } = req.body;
    const user = req.user;

    if (!termsAccepted) {
      res.status(400).json({ error: "You must review and accept the machine lease terms and return disclosures." });
      return;
    }

    if (!db.siteSettings.machine_purchases_enabled) {
      res.status(403).json({ error: "Machine leasing & purchases are currently paused by platform administration." });
      return;
    }

    const machine = db.machines.find((m: any) => m.id === machineId && m.status === "ACTIVE" && m.purchaseAvailable);
    if (!machine) {
      res.status(404).json({ error: "Selected water machine is not available for purchase." });
      return;
    }

    if (
      machine.price === null ||
      machine.price === undefined ||
      isNaN(machine.price) ||
      machine.price < 0 ||
      (machine.price === 0 && machine.category !== 'STARTER')
    ) {
      res.status(400).json({ error: "Verified price for this machine is currently unavailable. Please contact administration." });
      return;
    }

    // Handle free trial starter unit (48 hours)
    if (machine.price === 0 || machine.id === "mach_aqua_starter") {
      const existingTrial = (db.trials || []).find(
        (t: any) => t.userId === user.id && (t.status === "ACTIVE" || t.machineId === machine.id)
      );
      if (existingTrial) {
        res.status(400).json({ error: "You have already activated or exhausted your complimentary 48-hour starter trial." });
        return;
      }

      const existingSub = db.machineSubscriptions.find((s: any) => s.userId === user.id && s.machineId === machine.id);
      if (existingSub) {
        res.status(400).json({ error: "You have already activated the complimentary Aqua Starter trial unit." });
        return;
      }

      const nowMs = Date.now();
      const activatedAt = new Date(nowMs).toISOString();
      const DURATION_HOURS = 48;
      const DURATION_MS = DURATION_HOURS * 60 * 60 * 1000; // exactly 172,800,000 ms
      const expiresAt = new Date(nowMs + DURATION_MS).toISOString();

      const orderRef = `ORD-TRL-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderId = `ord_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
      const trialId = `trial_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
      const subId = `sub_${uuidv4().replace(/-/g, "").slice(0, 16)}`;

      const newTrial = {
        id: trialId,
        userId: user.id,
        userEmail: user.email,
        machineId: machine.id,
        machineName: machine.name,
        subscriptionId: subId,
        orderId,
        status: "ACTIVE",
        durationHours: DURATION_HOURS,
        durationMs: DURATION_MS,
        activatedAt,
        expiresAt,
        cleanedUpAt: null,
        createdAt: activatedAt,
        updatedAt: activatedAt,
      };

      const newOrder = {
        id: orderId,
        orderReference: orderRef,
        userId: user.id,
        userEmail: user.email,
        machineId: machine.id,
        machineName: machine.name,
        purchasePrice: 0,
        paymentStatus: "COMPLETED",
        orderStatus: "ACTIVE",
        paymentMethod: "WALLET",
        termsAccepted: true,
        createdAt: activatedAt,
        updatedAt: activatedAt,
      };

      const sub = {
        id: subId,
        userId: user.id,
        machineId: machine.id,
        machineName: machine.name,
        isTrial: true,
        trialId,
        purchaseTransactionId: `wtx_free_${Date.now()}`,
        purchasePrice: 0,
        activationDate: activatedAt,
        expiryDate: expiresAt,
        status: "ACTIVE",
        rewardConfiguration: {
          dailyReward: machine.configuredDailyReward || 1500,
          monthlyReward: 0,
          maxReward: machine.maxReward || 3000,
          durationDays: 2,
        },
        totalRewardsIssued: 0,
        createdAt: activatedAt,
        updatedAt: activatedAt,
      };

      db.mutate((d) => {
        if (!Array.isArray(d.trials)) d.trials = [];
        d.trials.push(newTrial);
        d.machineOrders.push(newOrder);
        d.machineSubscriptions.push(sub);
        d.walletTransactions.push({
          id: `wtx_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
          userId: user.id,
          amount: 0,
          balanceAfter: d.wallets.find((w: any) => w.userId === user.id)?.availableBalance || 0,
          type: "MACHINE_PURCHASE",
          status: "COMPLETED",
          reference: orderRef,
          description: `Complimentary 48-hour activation of ${machine.name}`,
          metadata: { orderId, subscriptionId: subId, trialId },
          createdAt: activatedAt,
        });
        d.auditLogs.unshift({
          id: `aud_${uuidv4().slice(0, 8)}`,
          adminId: user.id,
          adminEmail: user.email,
          action: "TRIAL_ACTIVATED",
          reason: `User activated 48-hour trial machine ${machine.name} with order reference ${orderRef} (Trial ID: ${trialId}, Expires: ${expiresAt})`,
          timestamp: activatedAt,
        });
      });

      res.status(201).json({
        message: "Starter 48-hour trial unit activated successfully!",
        trial: newTrial,
        order: newOrder,
        subscription: sub,
        serverTime: activatedAt,
      });
      return;
    }

    // Generate unique order reference for paid machine
    const orderRef = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ord_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
    const nowIso = new Date().toISOString();

    // Handle Wallet Payment
    if (paymentMethod === "WALLET") {
      const wallet = db.wallets.find((w) => w.userId === user.id);
      if (!wallet || wallet.availableBalance < machine.price) {
        res.status(400).json({
          error: `Insufficient wallet balance. Machine price is UGX ${machine.price.toLocaleString()}, available balance is UGX ${(wallet?.availableBalance || 0).toLocaleString()}.`,
        });
        return;
      }

      const subId = `sub_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
      const now = new Date();
      const expiry = new Date(now.getTime() + machine.durationDays * 24 * 60 * 60 * 1000);

      const newOrder = {
        id: orderId,
        orderReference: orderRef,
        userId: user.id,
        userEmail: user.email,
        machineId: machine.id,
        machineName: machine.name,
        purchasePrice: machine.price,
        paymentStatus: "COMPLETED",
        orderStatus: "ACTIVE",
        paymentMethod: "WALLET",
        termsAccepted: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const sub = {
        id: subId,
        userId: user.id,
        machineId: machine.id,
        machineName: machine.name,
        purchaseTransactionId: `wtx_${uuidv4().slice(0, 8)}`,
        purchasePrice: machine.price,
        activationDate: now.toISOString(),
        expiryDate: expiry.toISOString(),
        status: "ACTIVE",
        rewardConfiguration: {
          dailyReward: machine.configuredDailyReward,
          monthlyReward: machine.configuredMonthlyReward,
          maxReward: machine.maxReward,
          durationDays: machine.durationDays,
        },
        totalRewardsIssued: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      db.mutate((d) => {
        const targetWallet = d.wallets.find((w: any) => w.userId === user.id);
        targetWallet.availableBalance -= machine.price;
        targetWallet.updatedAt = nowIso;

        d.machineOrders.push(newOrder);
        d.machineSubscriptions.push(sub);

        d.walletTransactions.push({
          id: `wtx_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
          userId: user.id,
          amount: -machine.price,
          balanceAfter: targetWallet.availableBalance,
          type: "MACHINE_PURCHASE",
          status: "COMPLETED",
          reference: orderRef,
          description: `Machine purchase from wallet: ${machine.name} (${orderRef})`,
          metadata: { orderId, subscriptionId: subId, machineId: machine.id },
          createdAt: nowIso,
        });

        d.payments.push({
          id: `pay_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
          userId: user.id,
          amount: machine.price,
          purpose: "MACHINE_PURCHASE",
          relatedId: machine.id,
          status: "COMPLETED",
          provider: "WALLET",
          reference: orderRef,
          createdAt: nowIso,
        });

        d.auditLogs.unshift({
          id: `aud_${uuidv4().slice(0, 8)}`,
          adminId: user.id,
          adminEmail: user.email,
          action: "MACHINE_ORDER_COMPLETED",
          reason: `User purchased ${machine.name} for UGX ${machine.price.toLocaleString()} via wallet (Ref: ${orderRef})`,
          timestamp: nowIso,
        });
      });

      res.status(201).json({ message: `${machine.name} purchased and activated successfully!`, order: newOrder, subscription: sub });
      return;
    }

    // Default Mobile Money / Simulated Payment Provider checkout
    const newOrder = {
      id: orderId,
      orderReference: orderRef,
      userId: user.id,
      userEmail: user.email,
      machineId: machine.id,
      machineName: machine.name,
      purchasePrice: machine.price,
      paymentStatus: "PENDING",
      orderStatus: "PENDING",
      paymentMethod: "MOBILE_MONEY",
      termsAccepted: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.mutate((d) => {
      d.machineOrders.push(newOrder);
    });

    const payment = await paymentProvider.createPayment({
      userId: user.id,
      amount: machine.price,
      purpose: "MACHINE_PURCHASE",
      relatedId: machine.id,
      provider: paymentMethod || "DEVELOPMENT_SIMULATOR",
    });

    res.status(200).json({
      message: "Order initiated. Complete payment verification to activate machine.",
      order: newOrder,
      payment,
      requiresPayment: true,
    });
  } catch (err) {
    console.error("Machine purchase error:", err);
    res.status(500).json({ error: "Failed to process machine purchase order." });
  }
});

export default router;
