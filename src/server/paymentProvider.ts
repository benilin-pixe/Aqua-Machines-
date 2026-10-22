import { db } from "./db.ts";
import { v4 as uuidv4 } from "uuid";

export class DevelopmentPaymentProvider {
  isDevelopment = true;
  warningNotice = "DEVELOPMENT ONLY — NOT REAL MONEY";

  async createPayment(req: { userId: string; amount: number; purpose: string; relatedId?: string; provider?: string }) {
    const paymentId = `pay_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
    const reference = `AQUA-PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPayment = {
      id: paymentId,
      userId: req.userId,
      amount: req.amount,
      purpose: req.purpose,
      relatedId: req.relatedId,
      status: "PENDING",
      provider: req.provider || "MOBILE_MONEY_SIMULATOR",
      reference,
      createdAt: new Date().toISOString(),
    };

    db.mutate((d) => {
      d.payments.push(newPayment);
    });

    return newPayment;
  }

  async verifyPayment(paymentId: string, simulateOutcome: "SUCCESS" | "FAILED" = "SUCCESS") {
    return db.mutate((d) => {
      const payment = d.payments.find((p: any) => p.id === paymentId);
      if (!payment) {
        return { success: false, payment: null, message: "Payment record not found.", error: "NOT_FOUND" };
      }

      if (payment.status === "COMPLETED") {
        return { success: true, payment, message: "Payment was already verified and completed." };
      }

      if (simulateOutcome === "FAILED") {
        payment.status = "FAILED";
        payment.updatedAt = new Date().toISOString();
        return { success: false, payment, message: "Payment simulation failed or declined by user.", error: "SIMULATION_DECLINED" };
      }

      payment.status = "COMPLETED";
      payment.completedAt = new Date().toISOString();
      payment.providerTxId = `TX-VERIFIED-${Date.now()}`;
      payment.updatedAt = new Date().toISOString();

      const user = d.users.find((u: any) => u.id === payment.userId);
      let wallet = d.wallets.find((w: any) => w.userId === payment.userId);

      if (!wallet && user) {
        wallet = {
          id: `wal_${uuidv4().slice(0, 8)}`,
          userId: user.id,
          availableBalance: 0,
          pendingBalance: 0,
          totalRewards: 0,
          totalWithdrawals: 0,
          updatedAt: new Date().toISOString(),
        };
        d.wallets.push(wallet);
      }

      if (payment.purpose === "REGISTRATION_FEE") {
        if (user) {
          user.status = "ACTIVE";
          user.updatedAt = new Date().toISOString();
        }
        d.walletTransactions.push({
          id: `wtx_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
          userId: payment.userId,
          amount: -payment.amount,
          balanceAfter: wallet ? wallet.availableBalance : 0,
          type: "REGISTRATION_PAYMENT",
          status: "COMPLETED",
          reference: payment.reference,
          description: `Registration fee payment of UGX ${payment.amount.toLocaleString()} for account activation`,
          metadata: { paymentId: payment.id, provider: payment.provider },
          createdAt: new Date().toISOString(),
        });
        d.notifications.push({
          id: `notif_${uuidv4().slice(0, 8)}`,
          userId: payment.userId,
          title: "Account Activated",
          message: `Your registration payment of UGX ${payment.amount.toLocaleString()} was verified. Welcome to AQUA MACHINES!`,
          type: "SUCCESS",
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      } else if (payment.purpose === "WALLET_DEPOSIT") {
        if (wallet) {
          wallet.availableBalance += payment.amount;
          wallet.updatedAt = new Date().toISOString();
        }
        d.walletTransactions.push({
          id: `wtx_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
          userId: payment.userId,
          amount: payment.amount,
          balanceAfter: wallet ? wallet.availableBalance : payment.amount,
          type: "DEPOSIT",
          status: "COMPLETED",
          reference: payment.reference,
          description: `Wallet deposit of UGX ${payment.amount.toLocaleString()} via ${payment.provider}`,
          metadata: { paymentId: payment.id },
          createdAt: new Date().toISOString(),
        });
        d.notifications.push({
          id: `notif_${uuidv4().slice(0, 8)}`,
          userId: payment.userId,
          title: "Deposit Successful",
          message: `Your wallet deposit of UGX ${payment.amount.toLocaleString()} has been verified and credited.`,
          type: "SUCCESS",
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      } else if (payment.purpose === "MACHINE_PURCHASE") {
        const machine = d.machines.find((m: any) => m.id === payment.relatedId);
        if (!machine) {
          return { success: false, payment, message: "Associated machine plan could not be located.", error: "MACHINE_NOT_FOUND" };
        }

        const subId = `sub_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
        const now = new Date();
        const expiry = new Date(now.getTime() + machine.durationDays * 24 * 60 * 60 * 1000);

        const sub = {
          id: subId,
          userId: payment.userId,
          machineId: machine.id,
          machineName: machine.name,
          purchaseTransactionId: payment.id,
          purchasePrice: payment.amount,
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

        d.machineSubscriptions.push(sub);

        d.walletTransactions.push({
          id: `wtx_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
          userId: payment.userId,
          amount: -payment.amount,
          balanceAfter: wallet ? wallet.availableBalance : 0,
          type: "MACHINE_PURCHASE",
          status: "COMPLETED",
          reference: payment.reference,
          description: `Machine activation: ${machine.name} (${machine.durationDays} days)`,
          metadata: { subscriptionId: subId, machineId: machine.id, paymentId: payment.id },
          createdAt: new Date().toISOString(),
        });

        d.notifications.push({
          id: `notif_${uuidv4().slice(0, 8)}`,
          userId: payment.userId,
          title: "Machine Activated",
          message: `${machine.name} has been activated. Performance tracking and daily rewards are now enabled.`,
          type: "SUCCESS",
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }

      return { success: true, payment, message: "Payment verified and transaction executed successfully." };
    });
  }

  async getPaymentStatus(paymentId: string) {
    return db.payments.find((p: any) => p.id === paymentId) || null;
  }

  async handleWebhook(payload: any, signature?: string) {
    return { received: true };
  }
}

export const paymentProvider = new DevelopmentPaymentProvider();
