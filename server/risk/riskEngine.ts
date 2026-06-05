import { Transaction, UserProfile, ComplianceAlert, TransactionStatus } from '../../src/types';
import store from '../data/store';

export interface RiskAnalysis {
  decision: 'APPROVE' | 'FLAG' | 'REJECT';
  reason: string;
  alertsTriggered: string[];
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  riskReasons: string[];
}

export class RiskEngine {
  // Evaluates a transaction attempt before committing it to the database
  public evaluateTransaction(params: {
    senderId?: string;
    receiverId?: string;
    amount: number;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
    description: string;
    deviceId?: string;
    channel?: string;
  }): RiskAnalysis {
    const alertsTriggered: string[] = [];
    const riskReasons: string[] = [];
    let decision: 'APPROVE' | 'FLAG' | 'REJECT' = 'APPROVE';
    let riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let cumulativeRiskScore = 10; // baseline risk score

    // Fetch sender and receiver profiles
    const sender = params.senderId ? store.getUserById(params.senderId) : null;
    const receiver = params.receiverId ? store.getUserById(params.receiverId) : null;

    // Retrieve sender's past completed transactions for historic profile mapping
    const pastUserTxs = sender
      ? store.transactions.filter(t => t.senderId === sender.id && t.status === 'COMPLETED')
      : [];

    // --- KYC ABSOLUTE GATE BLOCK (PRESERVED) ---
    if (sender && sender.kycStatus === 'REJECTED') {
      return {
        decision: 'REJECT',
        reason: `SENDER_KYC_REJECTED: User ${sender.name} is blocked due to document rejection.`,
        alertsTriggered: ['KYC_EXPIRED_OR_REJECTED'],
        riskCategory: 'CRITICAL',
        riskScore: 100,
        riskReasons: ['SENDER_KYC_REJECTED']
      };
    }

    // --- FRAUD/RISK RULE 1: High amount compared to user average ---
    if (sender && pastUserTxs.length >= 2) {
      const sum = pastUserTxs.reduce((acc, t) => acc + t.amount, 0);
      const avgAmount = sum / pastUserTxs.length;
      if (params.amount > avgAmount * 3 && params.amount > 1000) {
        cumulativeRiskScore += 25;
        riskReasons.push('HIGH_AMOUNT_VS_AVERAGE');
        alertsTriggered.push('VELOCITY_LIMIT');
      }
    }

    // --- FRAUD/RISK RULE 2: New beneficiary plus high amount ---
    if (sender && receiver && params.type === 'TRANSFER') {
      const hasSentToBefore = pastUserTxs.some(t => t.receiverId === receiver.id);
      if (!hasSentToBefore && params.amount >= 2000) {
        cumulativeRiskScore += 30;
        riskReasons.push('NEW_BENEFICIARY_HIGH_AMOUNT');
        alertsTriggered.push('HIGH_RISK_RECIPIENT');
      }
    }

    // --- FRAUD/RISK RULE 3: New device plus transfer ---
    if (sender && params.type === 'TRANSFER' && params.deviceId) {
      const hasUsedThisDevice = pastUserTxs.some(t => t.deviceId === params.deviceId);
      // Device is new if sender has transactions but none use this deviceId
      if (!hasUsedThisDevice && pastUserTxs.length > 0) {
        cumulativeRiskScore += 25;
        riskReasons.push('NEW_DEVICE_TRANSFER');
        alertsTriggered.push('VELOCITY_LIMIT');
      }
    }

    // --- FRAUD/RISK RULE 4: Repeated failed attempts ---
    if (sender) {
      const failedRecentTxs = store.transactions.filter(
        t => t.senderId === sender.id && t.status === 'FAILED'
      );
      if (failedRecentTxs.length >= 2) {
        cumulativeRiskScore += 35;
        riskReasons.push('REPEATED_FAILED_ATTEMPTS');
        alertsTriggered.push('VELOCITY_LIMIT');
      }
    }

    // --- FRAUD/RISK RULE 5: Too many transfers in a short period (Velocity check) ---
    if (sender && params.type === 'TRANSFER') {
      const recentTransfers = store.transactions.filter(
        t => t.senderId === sender.id && 
        t.type === 'TRANSFER' &&
        Date.now() - new Date(t.date).getTime() < 15 * 60 * 1000 // 15 mins window
      );
      if (recentTransfers.length >= 3) {
        cumulativeRiskScore += 30;
        riskReasons.push('VELOCITY_TOO_MANY_TRANSFERS');
        alertsTriggered.push('VELOCITY_LIMIT');
      }
    }

    // --- OTHER CORE SEEDED RULES ---
    // Rule: Over limit with pending KYC
    if (sender && sender.kycStatus === 'PENDING' && params.amount > 500) {
      cumulativeRiskScore += 20;
      riskReasons.push('KYC_PENDING_VELOCITY_LIMIT');
      alertsTriggered.push('KYC_MISMATCH');
    }

    // Rule: Absolute large transfer threshold (>= $10,000)
    if (params.amount >= 10000) {
      cumulativeRiskScore += 40;
      riskReasons.push('LARGE_TRANSFER_THRESHOLD');
      alertsTriggered.push('LARGE_TRANSFER');
    }

    // Rule: Transfer to High Risk Recipient profile
    if (receiver && receiver.riskTier === 'HIGH') {
      cumulativeRiskScore += 25;
      riskReasons.push('HIGH_RISK_RECIPIENT_WARNING');
      alertsTriggered.push('HIGH_RISK_RECIPIENT');
    }

    // Cap cumulative score at 100
    const finalRiskScore = Math.min(100, cumulativeRiskScore);

    // Apply risk categorizations
    if (finalRiskScore >= 75) {
      riskCategory = 'CRITICAL';
    } else if (finalRiskScore >= 50) {
      riskCategory = 'HIGH';
    } else if (finalRiskScore >= 25) {
      riskCategory = 'MEDIUM';
    } else {
      riskCategory = 'LOW';
    }

    // Auto flag if any security risks are critical/high or riskScore exceeds 40
    if (finalRiskScore >= 40) {
      decision = 'FLAG';
    }

    let reason = 'Transaction passed all automated enterprise risk criteria.';
    if (riskReasons.length > 0) {
      reason = `RISK ENGINE WARNING [SCORE: ${finalRiskScore}/100]: Flagged due to matching risk rules: ${riskReasons.join(', ')}.`;
    }

    return {
      decision,
      reason,
      alertsTriggered,
      riskCategory,
      riskScore: finalRiskScore,
      riskReasons
    };
  }

  // Create a compliance alert based on risk analysis
  public triggerComplianceAlert(txId: string, alertType: string, message: string, level: 'MEDIUM' | 'HIGH' | 'CRITICAL', userId: string, userName: string) {
    const alert: ComplianceAlert = {
      id: `al-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      transactionId: txId,
      userId,
      userName,
      type: alertType as any,
      message,
      level,
      status: 'OPEN',
      timestamp: new Date().toISOString()
    };
    store.complianceAlerts.unshift(alert);
    store.logAudit(
      'RISK_COMPLIANCE_ENGINE',
      'COMPLIANCE_ALERT_TRIGGERED',
      `Alert [${alertType}] generated for user ${userName}. Priority: ${level}. ${message}`,
      level === 'CRITICAL' ? 'FAILURE' : 'WARNING'
    );
    return alert;
  }
}

export default new RiskEngine();
