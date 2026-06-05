import { UserProfile, Transaction, KYCCase, ComplianceAlert, SupportTicket, AuditLog, CategoryBudget, SavingsGoal, ReminderSettings, UserCard, RewardOffer, RewardPoints, RewardTransaction } from '../../src/types';

import crypto from 'crypto';

export interface CredentialRecord {
  userId: string;
  email: string;
  passwordHash: string;
  salt: string;
  mfaSecret?: string; // e.g. '123456' for sandbox testing
  forgotPasswordToken?: string;
}

export interface Session {
  id: string;
  userId: string;
  role: string;
  mfaVerified: boolean;
  expiresAt: number;
}

// In-memory simulated database that persists changes during the session life-cycle
export class FintechStore {
  public users: UserProfile[] = [];
  public transactions: Transaction[] = [];
  public kycCases: KYCCase[] = [];
  public complianceAlerts: ComplianceAlert[] = [];
  public supportTickets: SupportTicket[] = [];
  public auditLogs: AuditLog[] = [];

  // New budgeting and savings states in Phase 9
  public budgets: CategoryBudget[] = [];
  public savingsGoals: SavingsGoal[] = [];
  public reminderSettings: ReminderSettings[] = [];

  // Card & Rewards Sandbox State in Phase 10
  public cards: UserCard[] = [];
  public rewardPoints: RewardPoints[] = [];
  public rewardOffers: RewardOffer[] = [];
  public rewardTransactions: RewardTransaction[] = [];

  // New Authentication & Permissions state
  public credentials: Map<string, CredentialRecord> = new Map();
  public sessions: Map<string, Session> = new Map();
  public allowFinanceOfficerKycApproval: boolean = false;

  constructor() {
    this.seed();
  }

  public hashPassword(password: string, salt: string): string {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
  }

  public createSession(userId: string, role: string, mfaVerified: boolean): Session {
    const sessionId = `sess-${crypto.randomBytes(16).toString('hex')}`;
    const session: Session = {
      id: sessionId,
      userId,
      role,
      mfaVerified,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24, // 24 Hours duration
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  public getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
    return undefined;
  }

  public deleteSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  private seed() {
    // 1. Seed 10 Customer Users + 7 Administrative Roles
    this.users = [
      {
        id: 'usr-1',
        name: 'Sarah Jenkins',
        email: 'sarah.j@enterprise.com',
        role: 'customer',
        balance: 45280.50,
        currency: 'USD',
        savingGoal: 10000,
        savingCurrent: 3400,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        cardNumber: '•••• •••• •••• 4821',
        cardStatus: 'ACTIVE',
        cardLimit: 5000,
        creditScore: 780
      },
      {
        id: 'usr-2',
        name: 'Michael Chen',
        email: 'chen.m@techcorp.io',
        role: 'customer',
        balance: 124500.00,
        currency: 'USD',
        savingGoal: 50000,
        savingCurrent: 12000,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        cardNumber: '•••• •••• •••• 9921',
        cardStatus: 'ACTIVE',
        cardLimit: 15000,
        creditScore: 810
      },
      {
        id: 'usr-3',
        name: 'Amara Okafor',
        email: 'amara@designstudio.co',
        role: 'customer',
        balance: 8900.25,
        currency: 'USD',
        savingGoal: 5000,
        savingCurrent: 450,
        kycStatus: 'PENDING',
        riskTier: 'MEDIUM',
        cardNumber: '•••• •••• •••• 1083',
        cardStatus: 'ACTIVE',
        cardLimit: 2000,
        creditScore: 685
      },
      {
        id: 'usr-4',
        name: 'Carlos Ruiz',
        email: 'carlos.r@globalops.net',
        role: 'customer',
        balance: 3120.00,
        currency: 'USD',
        savingGoal: 2000,
        savingCurrent: 1500,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        cardNumber: '•••• •••• •••• 5543',
        cardStatus: 'FROZEN',
        cardLimit: 1000,
        creditScore: 720
      },
      {
        id: 'usr-5',
        name: 'Elena Rostova',
        email: 'elena.r@finadvise.eu',
        role: 'customer',
        balance: 620000.00,
        currency: 'USD',
        savingGoal: 200000,
        savingCurrent: 85000,
        kycStatus: 'APPROVED',
        riskTier: 'HIGH',
        cardNumber: '•••• •••• •••• 8871',
        cardStatus: 'ACTIVE',
        cardLimit: 50000,
        creditScore: 795
      },
      {
        id: 'usr-6',
        name: 'David Brown',
        email: 'dbrown@freelance.org',
        role: 'customer',
        balance: 1450.75,
        currency: 'USD',
        savingGoal: 1000,
        savingCurrent: 100,
        kycStatus: 'REJECTED',
        riskTier: 'HIGH',
        cardNumber: '•••• •••• •••• 2210',
        cardStatus: 'BLOCKED',
        cardLimit: 500,
        creditScore: 540
      },
      {
        id: 'usr-7',
        name: 'Yuki Tanaka',
        email: 'yuki.t@sunrise.jp',
        role: 'customer',
        balance: 93400.00,
        currency: 'USD',
        savingGoal: 15000,
        savingCurrent: 9000,
        kycStatus: 'PENDING',
        riskTier: 'LOW',
        cardNumber: '•••• •••• •••• 7741',
        cardStatus: 'ACTIVE',
        cardLimit: 10000,
        creditScore: 750
      },
      {
        id: 'usr-8',
        name: 'Zayn Malik',
        email: 'zayn@malikmusic.com',
        role: 'customer',
        balance: 12500.00,
        currency: 'USD',
        savingGoal: 2000,
        savingCurrent: 200,
        kycStatus: 'APPROVED',
        riskTier: 'MEDIUM',
        cardNumber: '•••• •••• •••• 3349',
        cardStatus: 'ACTIVE',
        cardLimit: 3000,
        creditScore: 695
      },
      {
        id: 'usr-9',
        name: 'Oliver Hansen',
        email: 'oliver@hansenholdings.dk',
        role: 'customer',
        balance: 850.00,
        currency: 'USD',
        savingGoal: 5000,
        savingCurrent: 0,
        kycStatus: 'PENDING',
        riskTier: 'MEDIUM',
        cardNumber: '•••• •••• •••• 9011',
        cardStatus: 'ACTIVE',
        cardLimit: 1500,
        creditScore: 620
      },
      {
        id: 'usr-10',
        name: 'Sofia Al-Mansoor',
        email: 'sofia@mansoor-equity.ae',
        role: 'customer',
        balance: 3100000.00,
        currency: 'USD',
        savingGoal: 1000000,
        savingCurrent: 500000,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        cardNumber: '•••• •••• •••• 0001',
        cardStatus: 'ACTIVE',
        cardLimit: 100000,
        creditScore: 840
      },
      {
        id: 'usr-super-admin',
        name: 'Alex Wong (Super Admin)',
        email: 'admin.super@apex.com',
        role: 'Super Admin',
        balance: 0,
        currency: 'USD',
        savingGoal: 0,
        savingCurrent: 0,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        cardNumber: '•••• •••• •••• 0002',
        cardStatus: 'ACTIVE',
        cardLimit: 0,
        creditScore: 850
      },
      {
        id: 'usr-compliance',
        name: 'Liam Vance (Analyst)',
        email: 'compliance.analyst@apex.com',
        role: 'Compliance Analyst',
        balance: 0,
        currency: 'USD',
        savingGoal: 0,
        savingCurrent: 0,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        cardNumber: '•••• •••• •••• 0003',
        cardStatus: 'ACTIVE',
        cardLimit: 0,
        creditScore: 850
      },
      {
        id: 'usr-ops',
        name: 'Beatrice Cobb (Ops)',
        email: 'ops.officer@apex.com',
        role: 'Operations Officer',
        balance: 0,
        currency: 'USD',
        savingGoal: 0,
        savingCurrent: 0,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        cardNumber: '•••• •••• •••• 0004',
        cardStatus: 'ACTIVE',
        cardLimit: 0,
        creditScore: 850
      },
      {
        id: 'usr-finance',
        name: 'Devin Finch (Finance)',
        email: 'finance.officer@apex.com',
        role: 'Finance Officer',
        balance: 0,
        currency: 'USD',
        savingGoal: 0,
        savingCurrent: 0,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        cardNumber: '•••• •••• •••• 0005',
        cardStatus: 'ACTIVE',
        cardLimit: 0,
        creditScore: 850
      },
      {
        id: 'usr-support',
        name: 'Gail Vance (Support)',
        email: 'support.agent@apex.com',
        role: 'Support Agent',
        balance: 0,
        currency: 'USD',
        savingGoal: 0,
        savingCurrent: 0,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        cardNumber: '•••• •••• •••• 0006',
        cardStatus: 'ACTIVE',
        cardLimit: 0,
        creditScore: 850
      },
      {
        id: 'usr-risk',
        name: 'Marcus Brody (Risk)',
        email: 'risk.manager@apex.com',
        role: 'Risk Manager',
        balance: 0,
        currency: 'USD',
        savingGoal: 0,
        savingCurrent: 0,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        cardNumber: '•••• •••• •••• 0007',
        cardStatus: 'ACTIVE',
        cardLimit: 0,
        creditScore: 850
      },
      {
        id: 'usr-exec',
        name: 'Victoria Vance (Exec)',
        email: 'exec.viewer@apex.com',
        role: 'Executive Viewer',
        balance: 0,
        currency: 'USD',
        savingGoal: 0,
        savingCurrent: 0,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        cardNumber: '•••• •••• •••• 0008',
        cardStatus: 'ACTIVE',
        cardLimit: 0,
        creditScore: 850
      }
    ];

    // Seed security credentials for all 17 initial accounts securely
    const defaultPasswords: Record<string, string> = {
      'usr-1': 'Sarah123!',
      'usr-2': 'Michael123!',
      'usr-3': 'Amara123!',
      'usr-4': 'Carlos123!',
      'usr-5': 'Elena123!',
      'usr-6': 'David123!',
      'usr-7': 'Yuki123!',
      'usr-8': 'Zayn123!',
      'usr-9': 'Oliver123!',
      'usr-10': 'Sofia123!',
      'usr-super-admin': 'SuperAdmin123!',
      'usr-compliance': 'Compliance123!',
      'usr-ops': 'Operations123!',
      'usr-finance': 'Finance123!',
      'usr-support': 'Support123!',
      'usr-risk': 'Risk123!',
      'usr-exec': 'Executive123!'
    };

    this.users.forEach(u => {
      const plainPassword = defaultPasswords[u.id] || 'Sandbox123!';
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = this.hashPassword(plainPassword, salt);
      this.credentials.set(u.email.toLowerCase(), {
        userId: u.id,
        email: u.email.toLowerCase(),
        passwordHash,
        salt,
        mfaSecret: u.role !== 'customer' ? '123456' : undefined
      });
    });

    // 2. Seed 15 Transactions
    this.transactions = [
      {
        id: 'tx-1',
        date: '2026-06-01T10:14:00Z',
        amount: 2500.00,
        type: 'DEPOSIT',
        senderName: 'Enterprise Payroll Corp',
        receiverId: 'usr-1',
        receiverName: 'Sarah Jenkins',
        status: 'COMPLETED',
        category: 'Income',
        description: 'Bi-weekly Direct Deposit Payroll',
        ledgerStatus: 'POSTED',
        auditLogId: 'audit-tx-1'
      },
      {
        id: 'tx-2',
        date: '2026-06-01T14:30:22Z',
        amount: 145.20,
        type: 'WITHDRAWAL',
        senderId: 'usr-1',
        senderName: 'Sarah Jenkins',
        status: 'COMPLETED',
        category: 'Utilities',
        description: 'Metropolitan Clean Energy - AutoPay',
        ledgerStatus: 'POSTED',
        auditLogId: 'audit-tx-2'
      },
      {
        id: 'tx-3',
        date: '2026-06-02T08:12:45Z',
        amount: 72.50,
        type: 'WITHDRAWAL',
        senderId: 'usr-1',
        senderName: 'Sarah Jenkins',
        status: 'COMPLETED',
        category: 'Dining',
        description: 'The Brass Bistro - Lunch meeting',
        ledgerStatus: 'POSTED',
        auditLogId: 'audit-tx-3'
      },
      {
        id: 'tx-4',
        date: '2026-06-02T19:05:10Z',
        amount: 12500.00,
        type: 'TRANSFER',
        senderId: 'usr-2',
        senderName: 'Michael Chen',
        receiverId: 'usr-5',
        receiverName: 'Elena Rostova',
        status: 'FLAGGED',
        category: 'Investment',
        description: 'Private Equity General Placement fund',
        ledgerStatus: 'VOID_PENDING',
        auditLogId: 'audit-tx-4'
      },
      {
        id: 'tx-5',
        date: '2026-05-29T11:45:00Z',
        amount: 50.00,
        type: 'WITHDRAWAL',
        senderId: 'usr-3',
        senderName: 'Amara Okafor',
        status: 'COMPLETED',
        category: 'Shopping',
        description: 'Target Store #2291',
        ledgerStatus: 'POSTED',
        auditLogId: 'audit-tx-5'
      },
      {
        id: 'tx-6',
        date: '2026-05-28T16:00:15Z',
        amount: 8500.00,
        type: 'TRANSFER',
        senderId: 'usr-5',
        senderName: 'Elena Rostova',
        receiverId: 'usr-6',
        receiverName: 'David Brown',
        status: 'COMPLETED',
        category: 'Transfer',
        description: 'Design Consulting retainer retainer fee',
        ledgerStatus: 'POSTED',
        auditLogId: 'audit-tx-6'
      },
      {
        id: 'tx-7',
        date: '2026-05-27T09:30:00Z',
        amount: 400.00,
        type: 'DEPOSIT',
        receiverId: 'usr-4',
        receiverName: 'Carlos Ruiz',
        status: 'COMPLETED',
        category: 'Income',
        description: 'Cash Deposit ATM #9392',
        ledgerStatus: 'POSTED',
        auditLogId: 'audit-tx-7'
      },
      {
        id: 'tx-8',
        date: '2026-06-02T22:35:00Z',
        amount: 5001.00,
        type: 'WITHDRAWAL',
        senderId: 'usr-6',
        senderName: 'David Brown',
        status: 'FAILED',
        category: 'Other',
        description: 'High Limit ATM Withdrawal Attempt',
        ledgerStatus: 'VOID',
        auditLogId: 'audit-tx-8'
      },
      {
        id: 'tx-9',
        date: '2026-05-25T14:15:00Z',
        amount: 15.45,
        type: 'WITHDRAWAL',
        senderId: 'usr-1',
        senderName: 'Sarah Jenkins',
        status: 'COMPLETED',
        category: 'Dining',
        description: 'Starbucks Coffee #4102',
        ledgerStatus: 'POSTED',
        auditLogId: 'audit-tx-9'
      },
      {
        id: 'tx-10',
        date: '2026-05-24T18:20:00Z',
        amount: 250.00,
        type: 'WITHDRAWAL',
        senderId: 'usr-2',
        senderName: 'Michael Chen',
        status: 'COMPLETED',
        category: 'Travel',
        description: 'Chevron Fueling Station',
        ledgerStatus: 'POSTED',
        auditLogId: 'audit-tx-10'
      },
      {
        id: 'tx-11',
        date: '2026-05-23T11:00:00Z',
        amount: 1200.00,
        type: 'TRANSFER',
        senderId: 'usr-1',
        senderName: 'Sarah Jenkins',
        receiverId: 'usr-4',
        receiverName: 'Carlos Ruiz',
        status: 'COMPLETED',
        category: 'Transfer',
        description: 'Rent reimbursement sharing',
        ledgerStatus: 'POSTED',
        auditLogId: 'audit-tx-11'
      },
      {
        id: 'tx-12',
        date: '2026-05-22T13:40:00Z',
        amount: 89.99,
        type: 'WITHDRAWAL',
        senderId: 'usr-8',
        senderName: 'Zayn Malik',
        status: 'COMPLETED',
        category: 'Shopping',
        description: 'Amazon.com Prime Direct',
        ledgerStatus: 'POSTED',
        auditLogId: 'audit-tx-12'
      },
      {
        id: 'tx-13',
        date: '2026-05-21T15:55:00Z',
        amount: 50.00,
        type: 'TRANSFER',
        senderId: 'usr-9',
        senderName: 'Oliver Hansen',
        receiverId: 'usr-1',
        receiverName: 'Sarah Jenkins',
        status: 'COMPLETED',
        category: 'Transfer',
        description: 'P2P Transfer dinner repayment',
        ledgerStatus: 'POSTED',
        auditLogId: 'audit-tx-13'
      },
      {
        id: 'tx-14',
        date: '2026-05-20T09:00:00Z',
        amount: 150000.00,
        type: 'DEPOSIT',
        receiverId: 'usr-10',
        receiverName: 'Sofia Al-Mansoor',
        status: 'COMPLETED',
        category: 'Investment',
        description: 'Inflow from Mansoor Capital Holdings',
        ledgerStatus: 'POSTED',
        auditLogId: 'audit-tx-14'
      },
      {
        id: 'tx-15',
        date: '2026-05-19T20:10:00Z',
        amount: 320.00,
        type: 'WITHDRAWAL',
        senderId: 'usr-1',
        senderName: 'Sarah Jenkins',
        status: 'COMPLETED',
        category: 'Health',
        description: 'City Dental Associates',
        ledgerStatus: 'POSTED',
        auditLogId: 'audit-tx-15'
      }
    ];

    // 3. Seed 6 KYC Cases including new statuses
    this.kycCases = [
      {
        id: 'kyc-1',
        userId: 'usr-3',
        userName: 'Amara Okafor',
        userEmail: 'amara@designstudio.co',
        documentType: 'PASSPORT',
        submissionDate: '2026-06-03T01:10:00Z',
        status: 'PENDING',
        riskScore: 42,
        notes: 'Document readable. Needs human confirmation on matching selfie/photo.'
      },
      {
        id: 'kyc-2',
        userId: 'usr-7',
        userName: 'Yuki Tanaka',
        userEmail: 'yuki.t@sunrise.jp',
        documentType: 'NATIONAL_ID',
        submissionDate: '2026-06-02T18:45:00Z',
        status: 'PENDING',
        riskScore: 12,
        notes: 'Ocr reading accurate. Low risk profile, flag check automated pass.'
      },
      {
        id: 'kyc-3',
        userId: 'usr-9',
        userName: 'Oliver Hansen',
        userEmail: 'oliver@hansenholdings.dk',
        documentType: 'DRIVERS_LICENSE',
        submissionDate: '2026-06-03T09:12:00Z',
        status: 'ESCALATED',
        riskScore: 68,
        notes: 'Address field does not perfectly align with home IP geolocation. Elevated to high-risk compliance investigation desk.'
      },
      {
        id: 'kyc-4',
        userId: 'usr-1',
        userName: 'Sarah Jenkins',
        userEmail: 'sarah.j@enterprise.com',
        documentType: 'PASSPORT',
        submissionDate: '2026-05-10T12:00:00Z',
        status: 'APPROVED',
        riskScore: 8,
        notes: 'Fully verified by automatic OCR and national registry cross-reference.'
      },
      {
        id: 'kyc-5',
        userId: 'usr-6',
        userName: 'David Brown',
        userEmail: 'dbrown@freelance.org',
        documentType: 'PASSPORT',
        submissionDate: '2026-05-15T16:30:00Z',
        status: 'REJECTED',
        riskScore: 92,
        notes: 'Document flagged as expired. Backup document requested but not received.'
      },
      {
        id: 'kyc-6',
        userId: 'usr-2',
        userName: 'Michael Chang',
        userEmail: 'michael@capitalflow.io',
        documentType: 'DRIVERS_LICENSE',
        submissionDate: '2026-06-01T14:20:00Z',
        status: 'PENDING_INFO',
        riskScore: 30,
        notes: 'Drivers license photo exhibits glare obscuring date of birth fields. Dispatched secure information update request.'
      }
    ];

    // 4. Seed 5 Compliance Alerts
    this.complianceAlerts = [
      {
        id: 'al-1',
        transactionId: 'tx-4',
        userId: 'usr-2',
        userName: 'Michael Chen',
        type: 'LARGE_TRANSFER',
        message: 'A single transfer exceeds $10,000 threshold ($12,500.00). Ledger transaction paused.',
        level: 'HIGH',
        status: 'OPEN',
        timestamp: '2026-06-02T19:05:10Z'
      },
      {
        id: 'al-2',
        userId: 'usr-6',
        userName: 'David Brown',
        type: 'KYC_MISMATCH',
        message: 'Rejected KYC user David Brown triggered multiple rapid withdrawal failures on card.',
        level: 'CRITICAL',
        status: 'OPEN',
        timestamp: '2026-06-02T22:40:00Z'
      },
      {
        id: 'al-3',
        transactionId: 'tx-14',
        userId: 'usr-10',
        userName:SofiaName(),
        type: 'LARGE_TRANSFER',
        message: 'Very large incoming inflow ($150,000.00) detected from external shell equity.',
        level: 'MEDIUM',
        status: 'RESOLVED',
        timestamp: '2026-05-20T09:05:00Z'
      },
      {
        id: 'al-4',
        userId: 'usr-3',
        userName: 'Amara Okafor',
        type: 'KYC_MISMATCH',
        message: 'High frequency automated P2P transfer queries while status remains PENDING.',
        level: 'MEDIUM',
        status: 'OPEN',
        timestamp: '2026-06-03T11:20:00Z'
      },
      {
        id: 'al-5',
        userId: 'usr-5',
        userName: 'Elena Rostova',
        type: 'HIGH_RISK_RECIPIENT',
        message: 'Large transfer to High Risk flagged recipient profile David Brown ($8,500.00).',
        level: 'HIGH',
        status: 'DISMISSED',
        timestamp: '2026-05-28T16:02:00Z'
      }
    ];

    function SofiaName(): string {
      return 'Sofia Al-Mansoor';
    }

    // 5. Seed 5 Support Tickets
    this.supportTickets = [
      {
        id: 'tkt-1',
        userId: 'usr-1',
        userName: 'Sarah Jenkins',
        subject: 'Inquiry regarding Flagged Transfer Status',
        message: 'Hi Support, I noticed a transaction with Michael Chen is showing flagged today for $12,500. Can you clarify how long the sandbox compliance check takes?',
        category: 'TRANSACTION',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        createdAt: '2026-06-03T08:15:00Z',
        messages: [
          {
            id: 'm-1',
            senderName: 'Sarah Jenkins',
            senderRole: 'customer',
            text: 'Hi Support, I noticed a transaction with Michael Chen is showing flagged today for $12,500. Can you clarify how long the sandbox compliance check takes?',
            timestamp: '2026-06-03T08:15:00Z'
          },
          {
            id: 'm-2',
            senderName: 'Compliance AI',
            senderRole: 'ai',
            text: 'Hello Sarah, your transaction with Michael Chen is currently in the secondary verification queue because it exceeds the standard $10,000 rule threshold. An administrator will review and resolve this shortly.',
            timestamp: '2026-06-03T08:16:10Z'
          }
        ]
      },
      {
        id: 'tkt-2',
        userId: 'usr-4',
        userName: 'Carlos Ruiz',
        subject: 'My debit card is Frozen, please help!',
        message: 'I was trying to use my card at the ATM and it was blocked or frozen. I did not request this frozen status, please unfreeze it.',
        category: 'CARD_ISSUE',
        status: 'OPEN',
        priority: 'HIGH',
        createdAt: '2026-06-02T11:45:00Z',
        messages: [
          {
            id: 'm-3',
            senderName: 'Carlos Ruiz',
            senderRole: 'customer',
            text: 'I was trying to use my card at the ATM and it was blocked or frozen. I did not request this frozen status, please unfreeze it.',
            timestamp: '2026-06-02T11:45:00Z'
          }
        ]
      },
      {
        id: 'tkt-3',
        userId: 'usr-6',
        userName: 'David Brown',
        subject: 'KYC Document upload failing constantly',
        message: 'I submitted my passport several times but it says Rejected expired. My passport is valid for another 4 months, why does your system say it is expired?',
        category: 'ACCOUNT_LOCK',
        status: 'OPEN',
        priority: 'HIGH',
        createdAt: '2026-06-01T15:20:00Z',
        messages: [
          {
            id: 'm-4',
            senderName: 'David Brown',
            senderRole: 'customer',
            text: 'I submitted my passport several times but it says Rejected expired. My passport is valid for another 4 months, why does your system say it is expired?',
            timestamp: '2026-06-01T15:20:00Z'
          }
        ]
      },
      {
        id: 'tkt-4',
        userId: 'usr-3',
        userName: 'Amara Okafor',
        subject: 'KYC Status stuck at PENDING',
        message: 'I completed my ID verification earlier today to raise my limits, but it is still showing as PENDING. Is there any paperwork missing?',
        category: 'ACCOUNT_LOCK',
        status: 'IN_PROGRESS',
        priority: 'LOW',
        createdAt: '2026-06-03T09:40:00Z',
        messages: [
          {
            id: 'm-5',
            senderName: 'Amara Okafor',
            senderRole: 'customer',
            text: 'I completed my ID verification earlier today to raise my limits, but it is still showing as PENDING. Is there any paperwork missing?',
            timestamp: '2026-06-03T09:40:00Z'
          },
          {
            id: 'm-6',
            senderName: 'Support Service',
            senderRole: 'admin',
            text: 'Hi Amara, your KYC case was received and is marked under medium risk due to manual check triggers. Our Operations team is analyzing this today and will update your account bounds soon.',
            timestamp: '2026-06-03T11:30:00Z'
          }
        ]
      },
      {
        id: 'tkt-5',
        userId: 'usr-8',
        userName: 'Zayn Malik',
        subject: 'General Question - APP limits explanation',
        message: 'Where can I read the total limits for the card and transfer? Can I increase it without KYC?',
        category: 'OTHER',
        status: 'CLOSED',
        priority: 'LOW',
        createdAt: '2026-05-25T10:00:00Z',
        messages: [
          {
            id: 'm-7',
            senderName: 'Zayn Malik',
            senderRole: 'customer',
            text: 'Where can I read the total limits for the card and transfer? Can I increase it without KYC?',
            timestamp: '2026-05-25T10:00:00Z'
          },
          {
            id: 'm-8',
            senderName: 'Support Service',
            senderRole: 'admin',
            text: 'Hello Zayn, cards on sandbox are limited to $3,000 maximum daily. KYC is strictly required to process transfers. This is a sandbox environment, no real money movement occurs.',
            timestamp: '2026-05-25T11:45:00Z'
          }
        ]
      }
    ];

    // 6. Seed initial audit logs documenting setup
    this.auditLogs = [
      {
        id: 'aud-setup-1',
        timestamp: '2026-06-03T00:00:00Z',
        actor: 'SYSTEM_DAEMON',
        action: 'BOOT_LEDGER_CORE',
        details: 'Double-entry ledger balances initialized successfully. Balanced asset-liability status checked.',
        status: 'SUCCESS',
        ipAddress: '127.0.0.1'
      },
      {
        id: 'aud-setup-2',
        timestamp: '2026-06-03T00:01:00Z',
        actor: 'SYSTEM_DAEMON',
        action: 'RISK_RULES_ENGAGED',
        details: 'Compliance engine deployed. Rules loaded: LARGE_TRANSFER (>=$10000), HIGH_RISK_RECIPIENT, KYC_LOCK.',
        status: 'SUCCESS',
        ipAddress: '127.0.0.1'
      },
      {
        id: 'aud-setup-3',
        timestamp: '2026-06-03T00:02:00Z',
        actor: 'ADMIN_INIT',
        action: 'SEED_CUSTOMER_DATABASE',
        details: 'Seeding mock databases with 10 user profiles, 15 historic ledger records, 5 active support files.',
        status: 'SUCCESS',
        ipAddress: '192.168.1.100'
      }
    ];

    // Seed budgeting, goals, and reminder settings in Phase 9
    this.budgets = [
      { id: 'b-1', userId: 'usr-1', category: 'rent', limitAmount: 1800 },
      { id: 'b-2', userId: 'usr-1', category: 'food', limitAmount: 600 },
      { id: 'b-3', userId: 'usr-1', category: 'transport', limitAmount: 250 },
      { id: 'b-4', userId: 'usr-1', category: 'utilities', limitAmount: 150 },
      { id: 'b-5', userId: 'usr-1', category: 'subscriptions', limitAmount: 80 },
      { id: 'b-6', userId: 'usr-1', category: 'education', limitAmount: 200 },
      { id: 'b-7', userId: 'usr-1', category: 'health', limitAmount: 400 },
      { id: 'b-8', userId: 'usr-1', category: 'business', limitAmount: 1000 },
      { id: 'b-9', userId: 'usr-1', category: 'entertainment', limitAmount: 300 },
      { id: 'b-10', userId: 'usr-1', category: 'transfers', limitAmount: 500 }
    ];

    this.savingsGoals = [
      { id: 'g-1', userId: 'usr-1', title: 'Tesla Down Payment', targetAmount: 10000, currentAmount: 3400, targetDate: '2026-12-31', createdAt: '2026-06-01T00:00:00Z' },
      { id: 'g-2', userId: 'usr-1', title: 'Hawaii Tour Fund', targetAmount: 4000, currentAmount: 1200, targetDate: '2026-08-15', createdAt: '2026-06-01T00:00:00Z' }
    ];

    this.reminderSettings = [
      { userId: 'usr-1', budgetLimitAlert: true, goalReminder: true }
    ];

    // Card and Rewards Seed Data for Phase 10
    this.cards = [
      {
        id: 'crd-1',
        userId: 'usr-1',
        type: 'PHYSICAL',
        cardBrand: 'VISA',
        cardNumberMasked: '•••• •••• •••• 4821',
        cardExpiryMasked: '12/••',
        cardCvvMasked: '•••',
        status: 'ACTIVE',
        dailyLimit: 2000,
        weeklyLimit: 5000,
        monthlyLimit: 15000
      },
      {
        id: 'crd-2',
        userId: 'usr-1',
        type: 'VIRTUAL',
        cardBrand: 'MASTERCARD',
        cardNumberMasked: '•••• •••• •••• 8912',
        cardExpiryMasked: '08/••',
        cardCvvMasked: '•••',
        status: 'ACTIVE',
        dailyLimit: 1000,
        weeklyLimit: 3000,
        monthlyLimit: 10000
      }
    ];

    this.rewardPoints = [
      {
        userId: 'usr-1',
        balance: 24500,
        referralCode: 'SARAH-APEX-88',
        referralsClaimed: [
          { email: 'bob.miller@example.com', date: '2026-06-01T10:00:00Z', bonusPoints: 1000 }
        ]
      }
    ];

    this.rewardOffers = [
      {
        id: 'off-1',
        partnerName: 'Starbucks Premium',
        description: '$10 Starbucks Gift Card',
        pointsCost: 1000,
        couponCode: 'COFFEE-SANDBOX-YUM',
        category: 'SHOPPING'
      },
      {
        id: 'off-2',
        partnerName: 'Sovereign Hotel Group',
        description: '20% Off Room Bookings',
        pointsCost: 5000,
        couponCode: 'ROOM-SOVEREIGN-HOTEL',
        category: 'TRAVEL'
      },
      {
        id: 'off-3',
        partnerName: 'Amazon Corporate',
        description: '$50 Shopping Credits',
        pointsCost: 5000,
        couponCode: 'AMZN-SANDBOX-CLAIM',
        category: 'SHOPPING'
      },
      {
        id: 'off-4',
        partnerName: 'Terminal Lounge',
        description: 'Airport VIP Lounge Entry',
        pointsCost: 3500,
        couponCode: 'LGN-SOVEREIGN-VIP',
        category: 'TRAVEL'
      }
    ];

    this.rewardTransactions = [
      {
        id: 'rtx-1',
        userId: 'usr-1',
        date: '2026-06-02T12:00:00Z',
        points: 150,
        type: 'EARND_SPEND',
        description: '10% Cashback Bonus on Dining (The Brass Bistro)'
      },
      {
        id: 'rtx-2',
        userId: 'usr-1',
        date: '2026-06-01T10:00:00Z',
        points: 1000,
        type: 'EARND_REFERRAL',
        description: 'Successful Referral: bob.miller@example.com'
      },
      {
        id: 'rtx-3',
        userId: 'usr-1',
        date: '2026-05-25T14:15:00Z',
        points: 15,
        type: 'EARND_SPEND',
        description: 'Points Accrual: Starbucks Coffee'
      }
    ];

    // Normalize transactions with custom Phase 14 monitoring parameters if not set
    this.transactions.forEach(t => {
      if (!t.channel) t.channel = 'WEB';
      if (!t.deviceId) t.deviceId = 'DEV-WEB-MAIN';
      if (!t.riskScore) t.riskScore = t.status === 'FLAGGED' ? 78 : (t.amount > 5000 ? 55 : (t.amount > 2000 ? 32 : 8));
      if (!t.riskReasons) t.riskReasons = t.status === 'FLAGGED' ? ['SUSPICIOUS_VELOCITY_CHECK', 'HIGH_RISK_RECIPIENT_SURVEILLANCE'] : (t.amount > 5000 ? ['LARGE_TRANSFER_SURVEILLANCE'] : []);
      if (!t.gatewayRef) t.gatewayRef = `GW-DEC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      if (!t.ledgerRef) t.ledgerRef = `LDG-ACT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    });
  }

  // Helper getters
  public getUserById(id: string): UserProfile | undefined {
    return this.users.find(u => u.id === id);
  }

  public reset() {
    this.users = [];
    this.transactions = [];
    this.kycCases = [];
    this.complianceAlerts = [];
    this.supportTickets = [];
    this.auditLogs = [];
    this.budgets = [];
    this.savingsGoals = [];
    this.reminderSettings = [];
    this.cards = [];
    this.rewardPoints = [];
    this.rewardOffers = [];
    this.rewardTransactions = [];
    this.credentials.clear();
    this.sessions.clear();
    this.allowFinanceOfficerKycApproval = false;
    this.seed();
    this.logAudit('Super Admin', 'SEED_RESET_SUCCESS', 'Seeded sandbox database restore completed successfully. All logs, KYC queues, ledger records, and customer accounts refreshed.', 'SUCCESS', '127.0.0.1');
  }

  public getTransactionById(id: string): Transaction | undefined {
    return this.transactions.find(t => t.id === id);
  }

  // Audit Logger
  public logAudit(actor: string, action: string, details: string, status: 'SUCCESS' | 'WARNING' | 'FAILURE', ip: string = '127.0.0.1') {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      details,
      status,
      ipAddress: ip
    };
    this.auditLogs.unshift(newLog);
    return newLog;
  }
}

// Single active database store instance
export default new FintechStore();
