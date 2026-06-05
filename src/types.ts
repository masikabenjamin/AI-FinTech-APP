export type RBACRole = 'customer' | 'Super Admin' | 'Compliance Analyst' | 'Operations Officer' | 'Finance Officer' | 'Finance Manager' | 'Support Agent' | 'Risk Manager' | 'Executive Viewer';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: RBACRole;
  balance: number;
  currency: string;
  savingGoal: number;
  savingCurrent: number;
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'PENDING_INFO';
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH';
  cardNumber: string;
  cardStatus: 'ACTIVE' | 'FROZEN' | 'BLOCKED';
  cardLimit: number;
  creditScore: number;
}

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'FLAGGED' | 'FAILED';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  senderId?: string;
  senderName?: string;
  receiverId?: string;
  receiverName?: string;
  status: TransactionStatus;
  category: string;
  description: string;
  ledgerStatus: 'POSTED' | 'VOID_PENDING' | 'VOID';
  auditLogId?: string;
  gatewayRef?: string;
  ledgerRef?: string;
  channel?: string;
  riskScore?: number;
  riskReasons?: string[];
  deviceId?: string;
}

export interface KYCCase {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  documentType: 'PASSPORT' | 'DRIVERS_LICENSE' | 'NATIONAL_ID';
  submissionDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'PENDING_INFO';
  riskScore: number; // 0 to 100
  notes: string;
}

export interface ComplianceAlert {
  id: string;
  transactionId?: string;
  userId: string;
  userName: string;
  type: 'LARGE_TRANSFER' | 'VELOCITY_LIMIT' | 'HIGH_RISK_RECIPIENT' | 'KYC_MISMATCH' | 'SUSPICIOUS_VELOCITY' | 'HIGH_AMOUNT_VS_AVERAGE' | 'NEW_BENEFICIARY_HIGH_AMOUNT' | 'NEW_DEVICE_TRANSFER' | 'REPEATED_FAILED_ATTEMPTS' | 'VELOCITY_TOO_MANY_TRANSFERS';
  message: string;
  level: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'CREATED' | 'ASSIGNED' | 'UNDER_REVIEW' | 'INFO_REQUESTED' | 'ESCALATED' | 'CLOSED_FALSE_POSITIVE' | 'CLOSED_CONFIRMED_RISK' | 'REPORTED_EXTERNALLY';
  timestamp: string;
  assignedTo?: string;
  reviewerNotes?: string;
  reviewerName?: string;
  closedAt?: string;
  history?: Array<{
    timestamp: string;
    status: string;
    actor: string;
    notes: string;
  }>;
}

export interface TicketMessage {
  id: string;
  senderName: string;
  senderRole: 'customer' | 'admin' | 'ai';
  text: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  message: string;
  category: 'TRANSACTION' | 'ACCOUNT_LOCK' | 'CARD_ISSUE' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  messages: TicketMessage[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILURE';
  ipAddress: string;
}

export interface CategoryBudget {
  id: string;
  userId: string;
  category: string;
  limitAmount: number;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  createdAt: string;
}

export interface ReminderSettings {
  userId: string;
  budgetLimitAlert: boolean;
  goalReminder: boolean;
}

export interface UserCard {
  id: string;
  userId: string;
  type: 'PHYSICAL' | 'VIRTUAL';
  cardBrand: 'VISA' | 'MASTERCARD';
  cardNumberMasked: string;
  cardExpiryMasked: string;
  cardCvvMasked: string;
  status: 'ACTIVE' | 'FROZEN' | 'BLOCKED';
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
}

export interface RewardOffer {
  id: string;
  partnerName: string;
  description: string;
  pointsCost: number;
  couponCode: string;
  imageUrl?: string;
  category: 'CASHBACK' | 'SHOPPING' | 'TRAVEL' | 'ENTERTAINMENT';
}

export interface RewardPoints {
  userId: string;
  balance: number;
  referralCode: string;
  referralsClaimed: Array<{ email: string; date: string; bonusPoints: number }>;
}

export interface RewardTransaction {
  id: string;
  userId: string;
  date: string;
  points: number;
  type: 'EARND_SPEND' | 'EARND_REFERRAL' | 'REDEEMED';
  description: string;
}

