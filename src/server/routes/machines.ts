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
  const subscriptions = db.machineSubscriptions.filter((s) => s.userId === user.id && s.status === "ACTIVE");
  const returnTransactions = db.returnTransactions.filter((r) => r.userId === user.id);
  const wallet = db.wallets.find((w) => w.userId === user.id) || { availableBalance: 0, pendingBalance: 0 };

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

    const machine = db.machines.find((m) => m.id === machineId && m.status === "ACTIVE" && m.purchaseAvailable);
    if (!machine) {
      res.status(404).json({ error: "Selected water machine is not available for purchase." });
      return;
    }

    // Generate unique order reference
    const orderRef = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ord_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
    const nowIso = new Date().toISOString();

    // Handle free trial starter unit
    if (machine.price === 0) {
      const existingStarter = db.machineSubscriptions.find((s) => s.userId === user.id && s.machineId === machine.id);
      if (existingStarter) {
        res.status(400).json({ error: "You have already activated the complimentary Aqua Starter trial unit." });
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
        purchasePrice: 0,
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
        purchaseTransactionId: `wtx_free_${Date.now()}`,
        purchasePrice: 0,
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
          description: `Complimentary activation of ${machine.name}`,
          metadata: { orderId, subscriptionId: subId },
          createdAt: nowIso,
        });
        d.auditLogs.unshift({
          id: `aud_${uuidv4().slice(0, 8)}`,
          adminId: user.id,
          adminEmail: user.email,
          action: "MACHINE_ORDER_COMPLETED",
          reason: `User activated trial machine ${machine.name} with order reference ${orderRef}`,
          timestamp: nowIso,
        });
      });

      res.status(201).json({ message: "Starter trial unit activated successfully!", order: newOrder, subscription: sub });
      return;
    }

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
