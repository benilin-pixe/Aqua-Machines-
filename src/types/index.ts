export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'PENDING' | 'PENDING_PAYMENT' | 'SUSPENDED';
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface Admin {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'primary_admin';
  createdAt: string;
}

export interface Machine {
  id: string;
  name: string;
  model?: string;
  price: number | null;
  durationDays: number;
  configuredDailyReward: number;
  configuredMonthlyReward: number;
  maxReward: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'SOLD_OUT' | 'ARCHIVED';
  image: string;
  purchaseAvailable: boolean;
  description: string;
  specifications?: string;
  waterCapacity?: string;
  category: 'STARTER' | 'COMMERCIAL' | 'INDUSTRIAL' | 'ENTERPRISE';
  returnsConfigured?: boolean;
  returnModelType?: 'ESTIMATE' | 'OPERATING_REVENUE_DISTRIBUTION' | 'VERIFIED_MODEL' | 'NONE';
  priceVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MachineOrder {
  id: string;
  orderReference: string;
  userId: string;
  userEmail: string;
  machineId: string;
  machineName: string;
  purchasePrice: number;
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  orderStatus: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: 'WALLET' | 'MOBILE_MONEY';
  termsAccepted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnTransaction {
  id: string;
  userId: string;
  subscriptionId: string;
  machineName: string;
  amount: number;
  type: 'DAILY_RETURN' | 'MONTHLY_RETURN' | 'PERFORMANCE_YIELD';
  status: 'CREDITED' | 'PENDING';
  reference: string;
  description: string;
  createdAt: string;
}

export interface Wallet {
  userId: string;
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  totalEarned: number;
  updatedAt: string;
}

export interface DailyEarning {
  date: string;
  day: string;
  earnings: number;
  cumulative: number;
  machineCount: number;
}

export interface Trial {
  id: string;
  userId: string;
  userEmail: string;
  machineId: string;
  machineName: string;
  subscriptionId: string;
  orderId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  durationHours: number;
  durationMs: number;
  activatedAt: string;
  expiresAt: string;
  cleanedUpAt: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

