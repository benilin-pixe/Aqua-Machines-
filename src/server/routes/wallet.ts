import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db.ts";
import { authenticateUser, requireActiveUser } from "../auth.ts";
import { rewardEngine } from "../rewardEngine.ts";
import { paymentProvider } from "../paymentProvider.ts";

const router = Router();

router.get("/", authenticateUser, (req, res) => {
  const user = req.user;
  let wallet = db.wallets.find((w: any) => w.userId === user.id);
  if (!wallet) {
    wallet = {
      id: `wal_${uuidv4().slice(0, 8)}`,
      userId: user.id,
      availableBalance: 0,
      pendingBalance: 0,
      totalRewards: 0,
      totalWithdrawals: 0,
      updatedAt: new Date().toISOString(),
    };
    db.mutate((d) => d.wallets.push(wallet));
  }
  res.json({ wallet });
});

router.get("/transactions", authenticateUser, (req, res) => {
  const user = req.user;
  const transactions = db.walletTransactions
    .filter((tx: any) => tx.userId === user.id)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ transactions });
});

router.get("/rewards", authenticateUser, (req, res) => {
  const user = req.user;
  const rewardTransactions = db.rewardTransactions
    .filter((r: any) => r.userId === user.id)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ rewardTransactions });
});

router.post("/claim-daily", authenticateUser, requireActiveUser, (req, res) => {
  try {
    const user = req.user;
    const result = rewardEngine.evaluateUserRewards(user.id);
    const wallet = db.wallets.find((w: any) => w.userId === user.id);
    res.json({
      message:
        result.newRewardsIssued > 0
          ? `Successfully credited UGX ${result.totalRewardAmount.toLocaleString()} in performance rewards for today!`
          : "All eligible rewards for today have already been claimed or subscriptions are complete.",
      result,
      wallet,
    });
  } catch (err) {
    console.error("Reward claim error:", err);
    res.status(500).json({ error: "Failed to evaluate machine rewards." });
  }
});

router.post("/deposit", authenticateUser, async (req, res) => {
  try {
    const { amount, provider } = req.body;
    const user = req.user;
    const numAmount = Number(amount);

    if (!numAmount || isNaN(numAmount) || numAmount < 5000) {
      res.status(400).json({ error: "Minimum wallet deposit amount is UGX 5,000." });
      return;
    }

    const payment = await paymentProvider.createPayment({
      userId: user.id,
      amount: numAmount,
      purpose: "WALLET_DEPOSIT",
      provider: provider || "MOBILE_MONEY",
    });

    res.status(201).json({
      message: "Deposit initialized. Complete verification to credit funds.",
      payment,
    });
  } catch (err) {
    console.error("Deposit error:", err);
    res.status(500).json({ error: "Failed to initialize wallet deposit." });
  }
});

router.post("/withdraw", authenticateUser, requireActiveUser, (req, res) => {
  try {
    const { amount, mobileNumber, networkProvider, note } = req.body;
    const user = req.user;

    if (!db.siteSettings.withdrawals_enabled) {
      res.status(403).json({ error: "Withdrawals are temporarily paused for routine platform settlement." });
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: "Please enter a valid withdrawal amount." });
      return;
    }

    const minWithdrawal = db.siteSettings.min_withdrawal || 10000;
    if (numAmount < minWithdrawal) {
      res.status(400).json({ error: `Minimum withdrawal amount is UGX ${minWithdrawal.toLocaleString()}.` });
      return;
    }

    if (!mobileNumber || mobileNumber.trim().length < 9) {
      res.status(400).json({ error: "Valid Mobile Money phone number is required." });
      return;
    }

    const wallet = db.wallets.find((w: any) => w.userId === user.id);
    if (!wallet || wallet.availableBalance < numAmount) {
      res.status(400).json({
        error: `Insufficient available balance. Your balance is UGX ${(wallet?.availableBalance || 0).toLocaleString()}.`,
      });
      return;
    }

    const feePercent = db.siteSettings.withdrawal_fee_percent || 2;
    const fee = Math.round((numAmount * feePercent) / 100);
    const netAmount = numAmount - fee;
    const withdrawalId = `wdr_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
    const ref = `WDR-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const newWithdrawal = {
      id: withdrawalId,
      userId: user.id,
      userEmail: user.email,
      userFullName: user.fullName,
      amount: numAmount,
      fee,
      netAmount,
      mobileNumber: mobileNumber.trim(),
      networkProvider: networkProvider || "MTN",
      note: note ? note.trim() : undefined,
      status: "PENDING",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.mutate((d) => {
      const targetWallet = d.wallets.find((w: any) => w.userId === user.id);
      targetWallet.availableBalance -= numAmount;
      targetWallet.pendingBalance += numAmount;
      targetWallet.updatedAt = nowIso;

      d.withdrawals.push(newWithdrawal);
      d.walletTransactions.push({
        id: `wtx_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
        userId: user.id,
        amount: -numAmount,
        balanceAfter: targetWallet.availableBalance,
        type: "WITHDRAWAL",
        status: "PENDING",
        reference: ref,
        description: `Withdrawal request of UGX ${numAmount.toLocaleString()} to ${newWithdrawal.networkProvider} (${newWithdrawal.mobileNumber})`,
        metadata: { withdrawalId, fee, netAmount },
        createdAt: nowIso,
      });

      d.notifications.push({
        id: `notif_${uuidv4().slice(0, 8)}`,
        userId: user.id,
        title: "Withdrawal Requested",
        message: `Your withdrawal of UGX ${numAmount.toLocaleString()} (Net: UGX ${netAmount.toLocaleString()}) has been submitted for processing.`,
        type: "INFO",
        isRead: false,
        createdAt: nowIso,
      });
    });

    res.status(201).json({
      message: "Withdrawal request submitted successfully. Processing will begin shortly.",
      withdrawal: newWithdrawal,
    });
  } catch (err) {
    console.error("Withdrawal error:", err);
    res.status(500).json({ error: "Failed to process withdrawal request." });
  }
});

router.get("/allocations", authenticateUser, (req, res) => {
  const user = req.user;
  const allocations = db.fundAllocations
    .filter((a: any) => a.userId === user.id)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const schedules = db.paymentSchedules.filter((s: any) => s.userId === user.id);
  res.json({ allocations, schedules });
});

export default router;
