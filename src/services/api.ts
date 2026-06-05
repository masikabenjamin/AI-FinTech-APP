import { UserProfile, Transaction, KYCCase, ComplianceAlert, SupportTicket, AuditLog, CategoryBudget, SavingsGoal, ReminderSettings } from '../types';

const API_BASE = '/api';

export function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem('apex_session_token');
  const headers: Record<string, string> = {
    ...extra
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Session-ID'] = token;
  }
  return headers;
}

export async function fetchHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${API_BASE}/health`, {
    headers: getHeaders()
  });
  return res.json();
}

export async function resetSeedData(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/admin/reset-seed`, {
    method: 'POST',
    headers: getHeaders()
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to restore seed sandbox database.');
  }
  return res.json();
}

export async function fetchUsers(): Promise<UserProfile[]> {
  const res = await fetch(`${API_BASE}/users`, {
    headers: getHeaders()
  });
  return res.json();
}

export async function updateUser(id: string, payload: Partial<UserProfile>): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update user profile.');
  }
  return res.json();
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const res = await fetch(`${API_BASE}/transactions`, {
    headers: getHeaders()
  });
  return res.json();
}

export interface CreditTransferPayload {
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  senderId?: string;
  receiverId?: string;
  amount: number;
  description: string;
  category: string;
}

export interface CreditTransferResult {
  success?: boolean;
  warning?: string;
  error?: string;
  analysis: {
    decision: 'APPROVE' | 'FLAG' | 'REJECT';
    reason: string;
    alertsTriggered: string[];
    riskCategory: string;
  };
  transaction: Transaction;
}

export async function executeTransfer(payload: CreditTransferPayload): Promise<CreditTransferResult> {
  const res = await fetch(`${API_BASE}/transactions`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Transaction rejected by compliance security criteria.');
  }
  return data;
}

export async function fetchKYCCases(): Promise<KYCCase[]> {
  const res = await fetch(`${API_BASE}/kyc`, {
    headers: getHeaders()
  });
  return res.json();
}

export async function verifyKYC(id: string, status: 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'PENDING_INFO', notes: string, adminName: string): Promise<KYCCase> {
  const res = await fetch(`${API_BASE}/kyc/${id}/verify`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status, notes, adminName }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to audit KYC details.');
  }
  return res.json();
}

export async function fetchComplianceAlerts(): Promise<ComplianceAlert[]> {
  const res = await fetch(`${API_BASE}/compliance`, {
    headers: getHeaders()
  });
  return res.json();
}

export async function resolveComplianceAlert(id: string, action: 'APPROVE' | 'DISMISS', adminName: string): Promise<ComplianceAlert> {
  const res = await fetch(`${API_BASE}/compliance/${id}/resolve`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ action, adminName }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to dispatch compliance instruction.');
  }
  return res.json();
}

export async function updateComplianceWorkflow(params: {
  id: string;
  status: string;
  assignedTo?: string;
  notes: string;
  adminName?: string;
  holdReleaseAction?: 'HOLD' | 'RELEASE' | 'VOID' | 'NONE';
}): Promise<ComplianceAlert> {
  const { id, ...rest } = params;
  const res = await fetch(`${API_BASE}/compliance/${id}/update-workflow`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(rest),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to dispatch compliance workflow transition.');
  }
  return res.json();
}

export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const res = await fetch(`${API_BASE}/support`, {
    headers: getHeaders()
  });
  return res.json();
}

export async function createSupportTicket(userId: string, subject: string, message: string, category: string, priority: string): Promise<SupportTicket> {
  const res = await fetch(`${API_BASE}/support`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ userId, subject, message, category, priority }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit report help issue.');
  }
  return res.json();
}

export async function replyToTicket(id: string, senderName: string, senderRole: 'customer' | 'admin', text: string): Promise<SupportTicket> {
  const res = await fetch(`${API_BASE}/support/${id}/message`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ senderName, senderRole, text }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to publish chat message.');
  }
  return res.json();
}

export interface LedgerSummary {
  verdict: {
    isValid: boolean;
    difference: number;
    message: string;
  };
  entries: any[];
  stats: {
    platformReserves: number;
    platformLiabilities: number;
    netEquityRatio: string;
    reserveHealthPercent: string;
  };
}

export async function fetchLedgerStats(): Promise<LedgerSummary> {
  const res = await fetch(`${API_BASE}/ledger`, {
    headers: getHeaders()
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to fetch double-entry balanced ledger details.');
  }
  return res.json();
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/audit`, {
    headers: getHeaders()
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to download security logs.');
  }
  return res.json();
}

export async function clearAuditLogs(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/audit/clear`, { 
    method: 'POST',
    headers: getHeaders()
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Wipe blocked.');
  }
  return res.ok;
}

export async function askAI(prompt: string, contextUser?: string): Promise<{ text: string; isFallback: boolean }> {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prompt, contextUser }),
  });
  if (!res.ok) {
    throw new Error('AI Server is temporarily out of service. Check network console.');
  }
  return res.json();
}

// --- AUTH COMPLIANCE SYSTEM ACTIONS ---

export async function registerCustomer(name: string, email: string, password: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed.');
  return data;
}

export async function loginUser(email: string, password: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed.');
  return data;
}

export async function verifyMFA(sessionId: string, code: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/mfa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, code })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'MFA validation failed.');
  return data;
}

export async function logoutUser(): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: getHeaders()
  });
  localStorage.removeItem('apex_session_token');
  localStorage.removeItem('apex_session_user');
  return res.json();
}

export async function fetchActiveSession(): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/session`, {
    headers: getHeaders()
  });
  if (!res.ok) {
    throw new Error('Session resolved to void.');
  }
  return res.json();
}

export async function requestPasswordReset(email: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to request reset instructions.');
  return data;
}

export async function executePasswordReset(email: string, token: string, newPassword: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token, newPassword })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update credentials.');
  return data;
}

export async function updateSystemSettings(payload: { allowFinanceOfficerKycApproval: boolean }): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/settings`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed updating corporate setup.');
  return data;
}

export async function fetchSystemSettings(): Promise<{ allowFinanceOfficerKycApproval: boolean }> {
  const res = await fetch(`${API_BASE}/auth/settings`, {
    headers: getHeaders()
  });
  return res.json();
}

export interface KYCSubmissionPayload {
  legalName: string;
  dob: string;
  country: string;
  address: string;
  occupation: string;
  sourceOfFunds: string;
  documentType: 'PASSPORT' | 'DRIVERS_LICENSE' | 'NATIONAL_ID';
  simulatedOutcome: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export async function submitKYC(payload: KYCSubmissionPayload): Promise<{ success: boolean; user: UserProfile; kycCase: KYCCase }> {
  const res = await fetch(`${API_BASE}/kyc/submit`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit digital KYC onboarding form.');
  return data;
}

export interface FundingIntentPayload {
  amount: number;
  currency: string;
  fundingSource: 'DEBIT_CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY';
  sourceDetails?: string;
}

export interface FundingIntentResult {
  success: boolean;
  intentId: string;
  idempotencyKey: string;
  amount: number;
  fee: number;
  totalDebit: number;
  expectedCredit: number;
  fundingSource: 'DEBIT_CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY';
  riskEvaluation: {
    passed: boolean;
    kycVerified: boolean;
    velocityLimitPass: boolean;
    deviceRecognized: boolean;
  };
}

export interface FundingConfirmPayload {
  intentId: string;
  idempotencyKey: string;
  pin: string;
  simulatedOutcome: 'SUCCESS' | 'FAILURE' | 'PENDING';
}

export interface FundingConfirmResult {
  success: boolean;
  transaction: Transaction;
  message: string;
}

export async function createFundingIntent(payload: FundingIntentPayload): Promise<FundingIntentResult> {
  const res = await fetch(`${API_BASE}/funding/intent`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Payment intent creation blocked.');
  return data;
}

export async function confirmFunding(payload: FundingConfirmPayload): Promise<FundingConfirmResult> {
  const res = await fetch(`${API_BASE}/funding/confirm`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Funding verification failed.');
  return data;
}

export async function updateTransactionCategory(id: string, category: string): Promise<any> {
  const res = await fetch(`${API_BASE}/transactions/${id}/category`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ category })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Category update failed');
  return data;
}

export async function fetchBudgets(): Promise<CategoryBudget[]> {
  const res = await fetch(`${API_BASE}/budgets`, {
    headers: getHeaders()
  });
  return res.json();
}

export async function saveBudget(category: string, limitAmount: number): Promise<any> {
  const res = await fetch(`${API_BASE}/budgets`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ category, limitAmount })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Saving budget failed');
  return data;
}

export async function fetchSavingsGoals(): Promise<SavingsGoal[]> {
  const res = await fetch(`${API_BASE}/savings-goals`, {
    headers: getHeaders()
  });
  return res.json();
}

export async function createSavingsGoal(title: string, targetAmount: number, targetDate: string, currentAmount?: number): Promise<any> {
  const res = await fetch(`${API_BASE}/savings-goals`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ title, targetAmount, targetDate, currentAmount })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Creating goal failed');
  return data;
}

export async function updateSavingsGoal(id: string, payload: Partial<SavingsGoal>): Promise<any> {
  const res = await fetch(`${API_BASE}/savings-goals/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Updating goal failed');
  return data;
}

export async function deleteSavingsGoal(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/savings-goals/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Deleting goal failed');
  return data;
}

export async function fetchReminderSettings(): Promise<ReminderSettings> {
  const res = await fetch(`${API_BASE}/budget-settings`, {
    headers: getHeaders()
  });
  return res.json();
}

export async function saveReminderSettings(settings: Partial<ReminderSettings>): Promise<any> {
  const res = await fetch(`${API_BASE}/budget-settings`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(settings)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Saving reminder settings failed');
  return data;
}

export async function updateUserProfile(id: string, payload: { riskTier?: 'LOW' | 'MEDIUM' | 'HIGH'; cardStatus?: 'ACTIVE' | 'FROZEN' | 'BLOCKED' }): Promise<any> {
  const res = await fetch(`${API_BASE}/users/${id}/update`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update user profile.');
  return data;
}

export async function createAuditLog(payload: { action: string; details: string; status?: 'SUCCESS' | 'WARNING' | 'FAILURE' }): Promise<any> {
  const res = await fetch(`${API_BASE}/audit/create`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to dispatch manual audit log.');
  return data;
}

// -------------------------------------------------------------
// CENTRAL FINANCE AND PAYMENT SETTLEMENT API MODULE
// -------------------------------------------------------------

export interface FinanceStats {
  settlements: {
    completed: { count: number; amount: number };
    pending: { count: number; amount: number };
    failed: { count: number; amount: number };
    gatewayStatus: string;
    reconciliationRate: number;
  };
  revenue: {
    transactionFees: number;
    grossRevenue: number;
    refunds: number;
    chargebacksPlaceholder: number;
    netRevenue: number;
  };
}

export interface ReconItem {
  transactionId?: string;
  gatewayRef: string;
  internalAmount: number | null;
  gatewayAmount: number;
  internalStatus: string | null;
  gatewayStatus: string;
  comparisonVerdict: 'MATCHED' | 'MISMATCHED_AMOUNT' | 'MISSING_IN_LEDGER' | 'MISSING_IN_GATEWAY' | 'FAILED_GATEWAY';
}

export interface ReconciliationPayload {
  items: ReconItem[];
  reconciliationActive: boolean;
  gatewayTotal: number;
  internalTotal: number;
}

export interface FinanceAdjustment {
  id: string;
  transactionId?: string;
  proposedBy: string;
  notes: string;
  type: 'REVERSAL' | 'FEE_ADJUSTMENT' | 'MANUAL_DEBIT' | 'MANUAL_CREDIT';
  amount: number;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  timestamp: string;
}

export interface FinanceException {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  amount: number;
  reference: string;
  user: string;
  timestamp: string;
  details: string;
}

export async function fetchFinanceStats(): Promise<FinanceStats> {
  const res = await fetch(`${API_BASE}/finance/stats`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to download settlements aggregated billing.');
  return data;
}

export async function fetchReconciliationData(): Promise<ReconciliationPayload> {
  const res = await fetch(`${API_BASE}/finance/reconciliation`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to download core reconciliation matrix.');
  return data;
}

export async function runReconciliationAudit(): Promise<any> {
  const res = await fetch(`${API_BASE}/finance/reconciliation/run`, {
    method: 'POST',
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Audit comparison failed.');
  return data;
}

export async function fetchExceptionReport(): Promise<FinanceException[]> {
  const res = await fetch(`${API_BASE}/finance/exceptions`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load exceptions checklist.');
  return data;
}

export async function fetchAdjustments(): Promise<FinanceAdjustment[]> {
  const res = await fetch(`${API_BASE}/finance/adjustments`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch adjustments docket.');
  return data;
}

export async function proposeAdjustment(payload: { transactionId?: string; type: string; amount: number; notes: string }): Promise<FinanceAdjustment> {
  const res = await fetch(`${API_BASE}/finance/adjustments/propose`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to propose adjustment.');
  return data;
}

export async function approveAdjustment(id: string, action: 'APPROVE' | 'REJECT', feedback?: string): Promise<FinanceAdjustment> {
  const res = await fetch(`${API_BASE}/finance/adjustments/${id}/approve`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ action, feedback })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Approving adjustment was blocked.');
  return data;
}

// -------------------------------------------------------------
// CENTRAL AI INSIGHTS & AI CONTROL CENTER API MODULE
// -------------------------------------------------------------

export interface AICoreModel {
  id: string;
  name: string;
  status: 'ACTIVE' | 'TRAINING' | 'OFFLINE' | 'DEGRADED';
  version: string;
  predictionCount: number;
  lastTrainingDate: string;
  accuracy: number;
  precision: number;
  recall: number;
  driftIndicator: 'NONE' | 'LOW' | 'HIGH';
  latencyMs: number;
}

export interface AIThresholdSettings {
  id: string;
  fraudScoreThreshold: number;
  casePriorityThreshold: number;
}

export interface AIThresholdChangeRequest {
  id: string;
  settingName: 'fraudScoreThreshold' | 'casePriorityThreshold';
  oldValue: number;
  newValue: number;
  proposedBy: string;
  proposedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  notes: string;
  auditorFeedback?: string;
}

export interface AIPredictionRecord {
  id: string;
  timestamp: string;
  modelId: string;
  modelName: string;
  inputReference: string;
  modelOutput: string;
  confidence: number;
  actionTaken: string;
}

export interface AIInsightsPayload {
  revenueSeries: Array<{ month: string; actual?: number; forecast?: number; type: 'HISTORICAL' | 'FORECAST' }>;
  volumeSeries: Array<{ month: string; actual?: number; forecast?: number; type: 'HISTORICAL' | 'FORECAST' }>;
  userGrowthSeries: Array<{ month: string; activeUsers: number; churnRisk: number; type: 'HISTORICAL' | 'FORECAST' }>;
  fraudAlertSeries: Array<{ month: string; alertsCount: number; falsePositives: number; type: 'HISTORICAL' | 'FORECAST' }>;
  recommendedActions: Array<{ id: string; title: string; priority: string; category: string; benefit: string; details: string }>;
}

export async function fetchAIInsights(): Promise<AIInsightsPayload> {
  const res = await fetch(`${API_BASE}/ai/insights`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch AI Insights dashboard statistics.');
  return data;
}

export async function fetchAIModels(): Promise<AICoreModel[]> {
  const res = await fetch(`${API_BASE}/ai/models`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch AI Models Registry.');
  return data;
}

export async function fetchAIThresholds(): Promise<{ thresholds: AIThresholdSettings; changeRequests: AIThresholdChangeRequest[] }> {
  const res = await fetch(`${API_BASE}/ai/thresholds`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch AI Threshold configuration.');
  return data;
}

export async function fetchAIPredictionLogs(): Promise<AIPredictionRecord[]> {
  const res = await fetch(`${API_BASE}/ai/predictions`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load Prediction system audit files.');
  return data;
}

export async function proposeAIThresholdChange(payload: { settingName: string; newValue: number; notes: string }): Promise<AIThresholdChangeRequest> {
  const res = await fetch(`${API_BASE}/ai/thresholds/propose`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to propose threshold update.');
  return data;
}

export async function approveAIThresholdChange(id: string, action: 'APPROVED' | 'REJECTED', feedback?: string): Promise<AIThresholdChangeRequest> {
  const res = await fetch(`${API_BASE}/ai/thresholds/${id}/approve`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ action, feedback })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Processing threshold approval request was blocked.');
  return data;
}


