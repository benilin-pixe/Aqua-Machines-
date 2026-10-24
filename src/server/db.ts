import fs from "fs";
import path from "path";

const DB_DIR = path.resolve(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "database.json");

const defaultSettings = {
  registration_enabled: true,
  machine_purchases_enabled: true,
  withdrawals_enabled: true,
  maintenance_mode: false,
  maintenance_message: "AQUA MACHINES platform is undergoing scheduled maintenance. Services will resume shortly.",
  registration_fee: 10000,
  min_withdrawal: 10000,
  withdrawal_fee_percent: 2,
  support_phone: "+256 700 892 110",
  support_email: "support@aquamachines.tech",
  announcement_banner: "Aqua Machines Q3 Infrastructure & Water Lease Operations are now live. Verify your account to start.",
  platform_disabled: false,
};

import { ASSET_PRODUCTS } from "./../assets/products.ts";

const defaultFundingAccounts: any[] = [];

const defaultMachines = ASSET_PRODUCTS.map((prod) => ({
  ...prod,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

class Database {
  data: any;
  lastMtime: number = 0;

  constructor() {
    this.data = this.loadData();
    try {
      if (fs.existsSync(DB_FILE)) {
        this.lastMtime = fs.statSync(DB_FILE).mtimeMs;
      }
    } catch {}
  }

  checkReload() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const mtime = fs.statSync(DB_FILE).mtimeMs;
        if (mtime !== this.lastMtime) {
          this.data = this.loadData();
          this.lastMtime = mtime;
        }
      }
    } catch {}
  }

  loadData() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        return {
          users: parsed.users || [],
          admins: parsed.admins || [],
          adminSecrets: parsed.adminSecrets || {},
          userSecrets: parsed.userSecrets || {},
          wallets: parsed.wallets || [],
          machines: (() => {
            if (!parsed.machines || parsed.machines.length < 7) return defaultMachines;
            return defaultMachines.map((defM) => {
              const existing = parsed.machines.find((pm: any) => pm.id === defM.id);
              if (!existing) return defM;
              return {
                ...defM,
                ...existing,
                image: existing.image && existing.image.startsWith('/images/') ? existing.image : defM.image,
                model: existing.model || defM.model,
                specifications: existing.specifications || defM.specifications,
                waterCapacity: existing.waterCapacity || defM.waterCapacity,
                price: existing.price !== undefined ? existing.price : defM.price,
                priceVerified: existing.price !== null && existing.price !== undefined,
              };
            });
          })(),
          machineSubscriptions: parsed.machineSubscriptions || [],
          machineOrders: parsed.machineOrders || [],
          returnTransactions: parsed.returnTransactions || [],
          walletTransactions: parsed.walletTransactions || [],
          rewardTransactions: parsed.rewardTransactions || [],
          withdrawals: parsed.withdrawals || [],
          payments: parsed.payments || [],
          notifications: parsed.notifications || [],
          siteSettings: { ...defaultSettings, ...parsed.siteSettings || {} },
          auditLogs: parsed.auditLogs || [],
          supportTickets: parsed.supportTickets || [],
          fundingAccounts: parsed.fundingAccounts || [],
          fundAllocations: parsed.fundAllocations || [],
          paymentSchedules: parsed.paymentSchedules || [],
          scheduledPaymentInstances: parsed.scheduledPaymentInstances || [],
          allocationApprovals: parsed.allocationApprovals || [],
          trials: parsed.trials || [],
        };
      }
    } catch (err) {
      console.error("Error reading database file, initializing fresh DB:", err);
    }

    const freshDb = {
      users: [],
      admins: [],
      adminSecrets: {},
      userSecrets: {},
      wallets: [],
      machines: defaultMachines,
      machineSubscriptions: [],
      machineOrders: [],
      returnTransactions: [],
      walletTransactions: [],
      rewardTransactions: [],
      withdrawals: [],
      payments: [],
      notifications: [],
      siteSettings: defaultSettings,
      auditLogs: [],
      supportTickets: [],
      fundingAccounts: defaultFundingAccounts,
      fundAllocations: [],
      paymentSchedules: [],
      scheduledPaymentInstances: [],
      allocationApprovals: [],
      trials: [],
    };
    this.seedDefaults(freshDb);
    this.saveData(freshDb);
    return freshDb;
  }

  seedDefaults(db2: any) {
    db2.auditLogs.push({
      id: "aud_seed_01",
      adminId: "SYSTEM",
      adminEmail: "system@aquamachines.com",
      action: "SYSTEM_BOOTSTRAP",
      reason: "AQUA MACHINES platform initialized. Awaiting initial master administrator registration.",
      timestamp: new Date().toISOString(),
    });
  }

  saveData(dataToSave?: any) {
    try {
      const data = dataToSave || this.data;
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
      this.lastMtime = fs.statSync(DB_FILE).mtimeMs;
    } catch (err) {
      console.error("Error saving database:", err);
    }
  }

  mutate(operation: (d: any) => any) {
    this.checkReload();
    const result = operation(this.data);
    this.saveData();
    return result;
  }

  get users() { this.checkReload(); return this.data.users; }
  get admins() { this.checkReload(); return this.data.admins; }
  get adminSecrets() { this.checkReload(); return this.data.adminSecrets; }
  get userSecrets() { this.checkReload(); return this.data.userSecrets; }
  get wallets() { this.checkReload(); return this.data.wallets; }
  get machines() { this.checkReload(); return this.data.machines; }
  get machineSubscriptions() { this.checkReload(); return this.data.machineSubscriptions; }
  get machineOrders() { this.checkReload(); return this.data.machineOrders; }
  get returnTransactions() { this.checkReload(); return this.data.returnTransactions; }
  get walletTransactions() { this.checkReload(); return this.data.walletTransactions; }
  get rewardTransactions() { this.checkReload(); return this.data.rewardTransactions; }
  get withdrawals() { this.checkReload(); return this.data.withdrawals; }
  get payments() { this.checkReload(); return this.data.payments; }
  get notifications() { this.checkReload(); return this.data.notifications; }
  get siteSettings() { this.checkReload(); return this.data.siteSettings; }
  get auditLogs() { this.checkReload(); return this.data.auditLogs; }
  get supportTickets() { this.checkReload(); return this.data.supportTickets; }
  get fundingAccounts() { this.checkReload(); return this.data.fundingAccounts; }
  get fundAllocations() { this.checkReload(); return this.data.fundAllocations; }
  get paymentSchedules() { this.checkReload(); return this.data.paymentSchedules; }
  get scheduledPaymentInstances() { this.checkReload(); return this.data.scheduledPaymentInstances; }
  get allocationApprovals() { this.checkReload(); return this.data.allocationApprovals; }
  get trials() { this.checkReload(); return this.data.trials; }
}

export const db = new Database();

/**
 * Idempotent background and on-demand cleanup job for 48-hour free trials.
 * Inspects all active trials against current authoritative server timestamp.
 * Any trial where now >= expiresAt is transitioned to EXPIRED and deactivated.
 */
export function runTrialCleanupJob(): { cleanedCount: number; timestamp: string } {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  let cleanedCount = 0;

  db.mutate((d) => {
    if (!Array.isArray(d.trials)) {
      d.trials = [];
    }

    for (const trial of d.trials) {
      if (trial.status === 'ACTIVE' && new Date(trial.expiresAt).getTime() <= now) {
        trial.status = 'EXPIRED';
        trial.cleanedUpAt = nowIso;
        trial.updatedAt = nowIso;
        cleanedCount++;

        // Deactivate associated machine subscription if still active
        const sub = d.machineSubscriptions.find((s: any) => s.id === trial.subscriptionId || (s.userId === trial.userId && s.machineId === trial.machineId));
        if (sub && sub.status === 'ACTIVE') {
          sub.status = 'EXPIRED';
          sub.updatedAt = nowIso;
        }

        // Add idempotent audit log entry
        d.auditLogs.unshift({
          id: `aud_trial_expire_${Math.random().toString(36).substring(2, 10)}`,
          adminId: 'SYSTEM_SCHEDULER',
          adminEmail: 'system@aquamachines.tech',
          action: 'TRIAL_EXPIRED_CLEANUP',
          reason: `Automated 48-hour trial cleanup: Trial ${trial.id} for user ${trial.userEmail} expired and was deactivated.`,
          timestamp: nowIso,
        });
      }
    }
  });

  return { cleanedCount, timestamp: nowIso };
}

