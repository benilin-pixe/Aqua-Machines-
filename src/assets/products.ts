/**
 * Aqua Machines Product Assets & Catalog Definitions
 * Centralized repository of water machine models, technical specifications,
 * lease pricing, daily/monthly return rewards, and asset references.
 */

export interface ProductAssetItem {
  id: string;
  name: string;
  model: string;
  price: number;
  durationDays: number;
  configuredDailyReward: number;
  configuredMonthlyReward: number;
  maxReward: number;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  image: string;
  purchaseAvailable: boolean;
  priceVerified: boolean;
  description: string;
  specifications: string;
  waterCapacity: string;
  category: "STARTER" | "COMMERCIAL" | "INDUSTRIAL" | "ENTERPRISE";
  returnsConfigured: boolean;
  returnModelType: string;
}

export const ASSET_PRODUCTS: ProductAssetItem[] = [
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
    image: "/images/machine_starter_dispenser_1792756134226.jpg",
    purchaseAvailable: true,
    priceVerified: true,
    description: "Complimentary starter trial unit. Experience verified daily water performance telemetry and platform reward accounting.",
    specifications: "Multi-stage sediment filtration, 24V booster pump, digital flow sensor, 100L/day capacity.",
    waterCapacity: "100 Liters / Day",
    category: "STARTER",
    returnsConfigured: true,
    returnModelType: "VERIFIED_MODEL",
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
    image: "/images/machine_commercial_ro_1792756150015.jpg",
    purchaseAvailable: true,
    priceVerified: true,
    description: "Compact commercial water filtration unit suited for small retail kiosks and point-of-dispense monitoring.",
    specifications: "Dual carbon block filtration, UV sterilization lamp, stainless steel housing, 500L/day capacity.",
    waterCapacity: "500 Liters / Day",
    category: "COMMERCIAL",
    returnsConfigured: true,
    returnModelType: "OPERATING_REVENUE_DISTRIBUTION",
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
    image: "/images/machine_commercial_ro_1792756150015.jpg",
    purchaseAvailable: true,
    priceVerified: true,
    description: "Multi-stage RO purification station with digital flow-metering and enhanced community water reward capacity.",
    specifications: "Reverse osmosis 5-stage membrane, auto-flush system, TDS digital display, 1,200L/day capacity.",
    waterCapacity: "1,200 Liters / Day",
    category: "COMMERCIAL",
    returnsConfigured: true,
    returnModelType: "OPERATING_REVENUE_DISTRIBUTION",
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
    image: "/images/machine_commercial_ro_1792756150015.jpg",
    purchaseAvailable: true,
    priceVerified: true,
    description: "High-volume commercial mineralizer & alkaline dispenser with smart telemetry and continuous performance indexing.",
    specifications: "Commercial mineral injection cartridge, dual flow meters, remote GSM telemetry, 2,500L/day capacity.",
    waterCapacity: "2,500 Liters / Day",
    category: "COMMERCIAL",
    returnsConfigured: true,
    returnModelType: "VERIFIED_MODEL",
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
    image: "/images/machine_industrial_purifier_1792756164556.jpg",
    purchaseAvailable: true,
    priceVerified: true,
    description: "Dual-line industrial grade water processor with UV purification and high-throughput community distribution.",
    specifications: "Heavy-duty industrial RO membranes, dual UV chambers, stainless distribution manifold, 5,000L/day capacity.",
    waterCapacity: "5,000 Liters / Day",
    category: "INDUSTRIAL",
    returnsConfigured: true,
    returnModelType: "VERIFIED_MODEL",
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
    image: "/images/machine_industrial_purifier_1792756164556.jpg",
    purchaseAvailable: true,
    priceVerified: true,
    description: "Automated containerized water plant with remote telemetry and multi-village dispensing integration.",
    specifications: "Containerized treatment plant, PLC automated control panel, solar backup option, 10,000L/day capacity.",
    waterCapacity: "10,000 Liters / Day",
    category: "INDUSTRIAL",
    returnsConfigured: true,
    returnModelType: "VERIFIED_MODEL",
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
    image: "/images/machine_enterprise_station_1792756178346.jpg",
    purchaseAvailable: true,
    priceVerified: true,
    description: "Municipal grade solar-assisted water purification station with heavy-duty pump telemetry and maximum reward indexing.",
    specifications: "Municipal scale treatment plant, solar PV integration, full telemetry dashboard, 25,000L/day capacity.",
    waterCapacity: "25,000 Liters / Day",
    category: "ENTERPRISE",
    returnsConfigured: true,
    returnModelType: "VERIFIED_MODEL",
  },
];
