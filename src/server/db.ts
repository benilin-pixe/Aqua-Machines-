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

const defaultFundingAccounts = [
  { id: "fa_reserve", name: "Verified Platform Reserve Fund", availableBalance: 100000000, currency: "UGX" },
  { id: "fa_operating", name: "Business Operating Fund", availableBalance: 50000000, currency: "UGX" },
];

const defaultMachines = [
  {
    id: "mach_aqua_starter",
    name: "Aqua Starter",
    model: "AQ-STR-01",
    price: 0,
    durationDays: 2,
    configuredDailyReward: 1500,
    configuredMonthlyReward: 0,
    maxReward: 3000,
    status: "ACTIVE",
    image: "/src/assets/images/machine_aqua_starter_1791379626810.jpg",
    purchaseAvailable: true,
    description: "Complimentary starter trial unit. Experience verified daily water performance telemetry and platform reward accounting.",
    specifications: "Multi-stage sediment filtration, 24V booster pump, digital flow sensor, 100L/day capacity.",
    waterCapacity: "100 Liters / Day",
    category: "STARTER",
    returnsConfigured: true,
    returnModelType: "VERIFIED_MODEL",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mach_aqua_basic",
    name: "Aqua Basic",
    model: "AQ-BSC-02",
    price: 35000,
    durationDays: 30,
    configuredDailyReward: 1500,
    configuredMonthlyReward: 45000,
    maxReward: 45000,
    status: "ACTIVE",
    image: "/src/assets/images/machine_aqua_starter_1791379626810.jpg",
    purchaseAvailable: true,
    description: "Compact commercial water filtration unit suited for small retail kiosks and point-of-dispense monitoring.",
    specifications: "Dual carbon block filtration, UV sterilization lamp, stainless steel housing, 500L/day capacity.",
    waterCapacity: "500 Liters / Day",
    category: "COMMERCIAL",
    returnsConfigured: true,
    returnModelType: "OPERATING_REVENUE_DISTRIBUTION",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mach_aqua_plus",
    name: "Aqua Plus",
    model: "AQ-PLS-03",
    price: 70000,
    durationDays: 30,
    configuredDailyReward: 3000,
    configuredMonthlyReward: 90000,
    maxReward: 90000,
    status: "ACTIVE",
    image: "/src/assets/images/machine_aqua_pro_1791379641255.jpg",
    purchaseAvailable: true,
    description: "Multi-stage RO purification station with digital flow-metering and enhanced community water reward capacity.",
    specifications: "Reverse osmosis 5-stage membrane, auto-flush system, TDS digital display, 1,200L/day capacity.",
    waterCapacity: "1,200 Liters / Day",
    category: "COMMERCIAL",
    returnsConfigured: true,
    returnModelType: "OPERATING_REVENUE_DISTRIBUTION",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mach_aqua_pro",
    name: "Aqua Pro",
    model: "AQ-PRO-04",
    price: 120000,
    durationDays: 30,
    configuredDailyReward: 5000,
    configuredMonthlyReward: 150000,
    maxReward: 150000,
    status: "ACTIVE",
    image: "/src/assets/images/machine_aqua_pro_1791379641255.jpg",
    purchaseAvailable: true,
    description: "High-volume commercial mineralizer & alkaline dispenser with smart telemetry and continuous performance indexing.",
    specifications: "Commercial mineral injection cartridge, dual flow meters, remote GSM telemetry, 2,500L/day capacity.",
    waterCapacity: "2,500 Liters / Day",
    category: "COMMERCIAL",
    returnsConfigured: true,
    returnModelType: "VERIFIED_MODEL",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mach_aqua_premium",
    name: "Aqua Premium",
    model: "AQ-PRM-05",
    price: 200000,
    durationDays: 30,
    configuredDailyReward: 8000,
    configuredMonthlyReward: 240000,
    maxReward: 240000,
    status: "ACTIVE",
    image: "/src/assets/images/machine_aqua_pro_1791379641255.jpg",
    purchaseAvailable: true,
    description: "Dual-line industrial grade water processor with UV purification and high-throughput community distribution.",
    specifications: "Heavy-duty industrial RO membranes, dual UV chambers, stainless distribution manifold, 5,000L/day capacity.",
    waterCapacity: "5,000 Liters / Day",
    category: "INDUSTRIAL",
    returnsConfigured: true,
    returnModelType: "VERIFIED_MODEL",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mach_aqua_business",
    name: "Aqua Business",
    model: "AQ-BUS-06",
    price: 350000,
    durationDays: 30,
    configuredDailyReward: 14000,
    configuredMonthlyReward: 420000,
    maxReward: 420000,
    status: "ACTIVE",
    image: "/src/assets/images/machine_aqua_enterprise_1791379658283.jpg",
    purchaseAvailable: true,
    description: "Automated containerized water plant with remote telemetry and multi-village dispensing integration.",
    specifications: "Containerized treatment plant, PLC automated control panel, solar backup option, 10,000L/day capacity.",
    waterCapacity: "10,000 Liters / Day",
    category: "INDUSTRIAL",
    returnsConfigured: true,
    returnModelType: "VERIFIED_MODEL",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mach_aqua_enterprise",
    name: "Aqua Enterprise",
    model: "AQ-ENT-07",
    price: 500000,
    durationDays: 30,
    configuredDailyReward: 20000,
    configuredMonthlyReward: 600000,
    maxReward: 600000,
    status: "ACTIVE",
    image: "/src/assets/images/machine_aqua_enterprise_1791379658283.jpg",
    purchaseAvailable: true,
    description: "Municipal grade solar-assisted water purification station with heavy-duty pump telemetry and maximum reward indexing.",
    specifications: "Municipal scale treatment plant, solar PV integration, full telemetry dashboard, 25,000L/day capacity.",
    waterCapacity: "25,000 Liters / Day",
    category: "ENTERPRISE",
    returnsConfigured: true,
    returnModelType: "VERIFIED_MODEL",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

class Database {
  data: any;

  constructor() {
    this.data = this.loadData();
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
          machines: parsed.machines && parsed.machines.length >= 7 ? parsed.machines : defaultMachines,
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
          fundingAccounts: parsed.fundingAccounts && parsed.fundingAccounts.length > 0 ? parsed.fundingAccounts : defaultFundingAccounts,
          fundAllocations: parsed.fundAllocations || [],
          paymentSchedules: parsed.paymentSchedules || [],
          scheduledPaymentInstances: parsed.scheduledPaymentInstances || [],
          allocationApprovals: parsed.allocationApprovals || [],
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
    } catch (err) {
      console.error("Error saving database:", err);
    }
  }

  mutate(operation: (d: any) => any) {
    const result = operation(this.data);
    this.saveData();
    return result;
  }

  get users() { return this.data.users; }
  get admins() { return this.data.admins; }
  get adminSecrets() { return this.data.adminSecrets; }
  get userSecrets() { return this.data.userSecrets; }
  get wallets() { return this.data.wallets; }
  get machines() { return this.data.machines; }
  get machineSubscriptions() { return this.data.machineSubscriptions; }
  get machineOrders() { return this.data.machineOrders; }
  get returnTransactions() { return this.data.returnTransactions; }
  get walletTransactions() { return this.data.walletTransactions; }
  get rewardTransactions() { return this.data.rewardTransactions; }
  get withdrawals() { return this.data.withdrawals; }
  get payments() { return this.data.payments; }
  get notifications() { return this.data.notifications; }
  get siteSettings() { return this.data.siteSettings; }
  get auditLogs() { return this.data.auditLogs; }
  get supportTickets() { return this.data.supportTickets; }
  get fundingAccounts() { return this.data.fundingAccounts; }
  get fundAllocations() { return this.data.fundAllocations; }
  get paymentSchedules() { return this.data.paymentSchedules; }
  get scheduledPaymentInstances() { return this.data.scheduledPaymentInstances; }
  get allocationApprovals() { return this.data.allocationApprovals; }
}

export const db = new Database();
