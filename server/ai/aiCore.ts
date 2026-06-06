import store from '../data/store';

export interface AIModel {
  id: string;
  name: string;
  status: 'ACTIVE' | 'TRAINING' | 'OFFLINE' | 'DEGRADED';
  version: string;
  predictionCount: number;
  lastTrainingDate: string;
  accuracy: number;     // e.g. 0.965
  precision: number;    // e.g. 0.941
  recall: number;       // e.g. 0.912
  driftIndicator: 'NONE' | 'LOW' | 'HIGH';
  latencyMs: number;    // e.g. 14
}

export interface ThresholdSettings {
  id: string;
  fraudScoreThreshold: number;   // default 40
  casePriorityThreshold: number;  // default 70
}

export interface ThresholdChangeRequest {
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

export interface PredictionRecord {
  id: string;
  timestamp: string;
  modelId: string;
  modelName: string;
  inputReference: string; // e.g. 'tx-1' or 'kyc-2'
  modelOutput: string;
  confidence: number;     // e.g. 0.89 (89%)
  actionTaken: string;
}

export interface ChartDataPoint {
  month: string;
  actual?: number;
  forecast?: number;
  type: 'HISTORICAL' | 'FORECAST';
}

export interface UserGrowthDataPoint {
  month: string;
  activeUsers: number;
  churnRisk: number;
  type: 'HISTORICAL' | 'FORECAST';
}

export interface FraudAlertDataPoint {
  month: string;
  alertsCount: number;
  falsePositives: number;
  type: 'HISTORICAL' | 'FORECAST';
}

export class AICore {
  public models: AIModel[] = [];
  public thresholds: ThresholdSettings = {
    id: 'thr-default',
    fraudScoreThreshold: 40,
    casePriorityThreshold: 70
  };
  public changeRequests: ThresholdChangeRequest[] = [];
  public predictionLogs: PredictionRecord[] = [];

  constructor() {
    this.seedModels();
    this.seedPredictions();
    this.seedThresholdRequests();
  }

  private seedModels() {
    this.models = [
      {
        id: 'mdl-fraud-scoring',
        name: 'Fraud scoring',
        status: 'ACTIVE',
        version: 'v2.4.1',
        predictionCount: 3421,
        lastTrainingDate: '2026-05-18',
        accuracy: 0.965,
        precision: 0.941,
        recall: 0.912,
        driftIndicator: 'NONE',
        latencyMs: 14
      },
      {
        id: 'mdl-expense-cat',
        name: 'Expense categorisation',
        status: 'ACTIVE',
        version: 'v1.8.0',
        predictionCount: 14522,
        lastTrainingDate: '2026-04-20',
        accuracy: 0.924,
        precision: 0.910,
        recall: 0.902,
        driftIndicator: 'LOW',
        latencyMs: 8
      },
      {
        id: 'mdl-savings-rec',
        name: 'Savings recommendation',
        status: 'ACTIVE',
        version: 'v3.1.2',
        predictionCount: 890,
        lastTrainingDate: '2026-05-30',
        accuracy: 0.895,
        precision: 0.880,
        recall: 0.854,
        driftIndicator: 'NONE',
        latencyMs: 45
      },
      {
        id: 'mdl-ai-assistant',
        name: 'AI assistant',
        status: 'ACTIVE',
        version: 'v4.0.0-rc2',
        predictionCount: 19830,
        lastTrainingDate: '2026-06-01',
        accuracy: 0.978,
        precision: 0.965,
        recall: 0.959,
        driftIndicator: 'NONE',
        latencyMs: 120
      },
      {
        id: 'mdl-churn-pred',
        name: 'Churn prediction',
        status: 'ACTIVE',
        version: 'v1.1.0',
        predictionCount: 2045,
        lastTrainingDate: '2026-05-10',
        accuracy: 0.881,
        precision: 0.840,
        recall: 0.825,
        driftIndicator: 'HIGH',
        latencyMs: 32
      }
    ];
  }

  private seedPredictions() {
    this.predictionLogs = [
      {
        id: 'pred-1001',
        timestamp: '2026-06-04T12:30:15Z',
        modelId: 'mdl-fraud-scoring',
        modelName: 'Fraud scoring',
        inputReference: 'tx-1', // maps to realSarah tx
        modelOutput: 'Decision: FLAG (High amount vs user baseline)',
        confidence: 0.89,
        actionTaken: 'Flagged transaction, triggered Compliance Alert (VELOCITY_LIMIT)'
      },
      {
        id: 'pred-1002',
        timestamp: '2026-06-04T13:14:00Z',
        modelId: 'mdl-expense-cat',
        modelName: 'Expense categorisation',
        inputReference: 'tx-2',
        modelOutput: 'Label: Grocery & Dinning',
        confidence: 0.96,
        actionTaken: 'Auto-assigned categories budget mapping to Sarah Jenkins ledger'
      },
      {
        id: 'pred-1003',
        timestamp: '2026-06-04T14:45:22Z',
        modelId: 'mdl-savings-rec',
        modelName: 'Savings recommendation',
        inputReference: 'usr-3', // Amara Okafor
        modelOutput: 'Advice: Auto-split deposit to 3.5% Savings Vault',
        confidence: 0.82,
        actionTaken: 'Injected targeted promo slider on Customer dashboard UI'
      },
      {
        id: 'pred-1004',
        timestamp: '2026-06-05T01:10:05Z',
        modelId: 'mdl-ai-assistant',
        modelName: 'AI assistant',
        inputReference: 'usr-1',
        modelOutput: 'Formulated natural query on treasury compliance rules',
        confidence: 0.98,
        actionTaken: 'Consulted Gemini vector DB, piped response to active chat'
      },
      {
        id: 'pred-1005',
        timestamp: '2026-06-05T02:05:00Z',
        modelId: 'mdl-churn-pred',
        modelName: 'Churn prediction',
        inputReference: 'usr-4', // Carlos Ruiz (Frozen Card)
        modelOutput: 'Churn probability is 79% (Card is frozen and zero activity)',
        confidence: 0.84,
        actionTaken: 'Triggered support-desk ticket #card-care notification'
      },
      {
        id: 'pred-1006',
        timestamp: '2026-06-05T03:40:12Z',
        modelId: 'mdl-fraud-scoring',
        modelName: 'Fraud scoring',
        inputReference: 'tx-3',
        modelOutput: 'Decision: FLAG (KYC pending under high velocity transfer)',
        confidence: 0.76,
        actionTaken: 'MFA triggered and compliance status set to Review'
      },
      {
        id: 'pred-1007',
        timestamp: '2026-06-05T04:15:30Z',
        modelId: 'mdl-fraud-scoring',
        modelName: 'Fraud scoring',
        inputReference: 'kyc-1', // Real passport check
        modelOutput: 'Resolution: PASS (High-definition Passport edge checks verified)',
        confidence: 0.94,
        actionTaken: 'Pre-approved KYC review queue score rating to 94%'
      }
    ];
  }

  private seedThresholdRequests() {
    this.changeRequests = [
      {
        id: 'req-2001',
        settingName: 'fraudScoreThreshold',
        oldValue: 45,
        newValue: 40,
        proposedBy: 'Sarah Jenkins (Risk Manager)',
        proposedAt: '2026-06-03T10:00:00Z',
        status: 'APPROVED',
        approvedBy: 'Ben Masika (Super Admin)',
        approvedAt: '2026-06-03T11:30:00Z',
        notes: 'Tightening fraud rules to flag high-frequency small deposit loops.',
        auditorFeedback: 'Approved: verified ledger logs confirm slight increase in debit loop risk.'
      },
      {
        id: 'req-2002',
        settingName: 'casePriorityThreshold',
        oldValue: 75,
        newValue: 70,
        proposedBy: 'Sarah Jenkins (Risk Manager)',
        proposedAt: '2026-06-04T15:20:00Z',
        status: 'PENDING',
        notes: 'Lowering high priority alerts bar to trigger more active audits on KYC verification queues.'
      }
    ];
  }

  // Generate 6-month Revenue Forecast (Estimates)
  public getRevenueSeries(): ChartDataPoint[] {
    return [
      { month: 'Jan 2026', actual: 120000, type: 'HISTORICAL' },
      { month: 'Feb 2026', actual: 128000, type: 'HISTORICAL' },
      { month: 'Mar 2026', actual: 135000, type: 'HISTORICAL' },
      { month: 'Apr 2026', actual: 141000, type: 'HISTORICAL' },
      { month: 'May 2026', actual: 152000, type: 'HISTORICAL' },
      { month: 'Jun 2026', actual: 158000, type: 'HISTORICAL' },
      { month: 'Jul 2026', forecast: 165000, type: 'FORECAST' },
      { month: 'Aug 2026', forecast: 172000, type: 'FORECAST' },
      { month: 'Sep 2026', forecast: 180000, type: 'FORECAST' },
      { month: 'Oct 2026', forecast: 188000, type: 'FORECAST' },
      { month: 'Nov 2026', forecast: 195000, type: 'FORECAST' },
      { month: 'Dec 2026', forecast: 205000, type: 'FORECAST' }
    ];
  }

  // Generate Payment Volume Forecast (Estimates in Millions)
  public getVolumeSeries(): ChartDataPoint[] {
    return [
      { month: 'Jan 2026', actual: 8.2, type: 'HISTORICAL' },
      { month: 'Feb 2026', actual: 8.5, type: 'HISTORICAL' },
      { month: 'Mar 2026', actual: 9.1, type: 'HISTORICAL' },
      { month: 'Apr 2026', actual: 9.4, type: 'HISTORICAL' },
      { month: 'May 2026', actual: 10.2, type: 'HISTORICAL' },
      { month: 'Jun 2026', actual: 10.8, type: 'HISTORICAL' },
      { month: 'Jul 2026', forecast: 11.3, type: 'FORECAST' },
      { month: 'Aug 2026', forecast: 11.9, type: 'FORECAST' },
      { month: 'Sep 2026', forecast: 12.5, type: 'FORECAST' },
      { month: 'Oct 2026', forecast: 13.1, type: 'FORECAST' },
      { month: 'Nov 2026', forecast: 13.8, type: 'FORECAST' },
      { month: 'Dec 2026', forecast: 14.5, type: 'FORECAST' }
    ];
  }

  // User growth and churn risk trend (Estimates)
  public getUserGrowthSeries(): UserGrowthDataPoint[] {
    return [
      { month: 'Jan 2026', activeUsers: 12000, churnRisk: 4.2, type: 'HISTORICAL' },
      { month: 'Feb 2026', activeUsers: 12500, churnRisk: 4.1, type: 'HISTORICAL' },
      { month: 'Mar 2026', activeUsers: 13200, churnRisk: 3.9, type: 'HISTORICAL' },
      { month: 'Apr 2026', activeUsers: 14000, churnRisk: 4.5, type: 'HISTORICAL' },
      { month: 'May 2026', activeUsers: 14800, churnRisk: 4.3, type: 'HISTORICAL' },
      { month: 'Jun 2026', activeUsers: 15500, churnRisk: 4.0, type: 'HISTORICAL' },
      { month: 'Jul 2026', activeUsers: 16100, churnRisk: 3.8, type: 'FORECAST' },
      { month: 'Aug 2026', activeUsers: 16800, churnRisk: 3.7, type: 'FORECAST' },
      { month: 'Sep 2026', activeUsers: 17500, churnRisk: 4.2, type: 'FORECAST' },
      { month: 'Oct 2026', activeUsers: 18200, churnRisk: 4.1, type: 'FORECAST' },
      { month: 'Nov 2026', activeUsers: 19000, churnRisk: 3.9, type: 'FORECAST' },
      { month: 'Dec 2026', activeUsers: 20000, churnRisk: 3.5, type: 'FORECAST' }
    ];
  }

  // Fraud alert trend and false-positive placeholder (Estimates)
  public getFraudAlertSeries(): FraudAlertDataPoint[] {
    return [
      { month: 'Jan 2026', alertsCount: 82, falsePositives: 62, type: 'HISTORICAL' },
      { month: 'Feb 2026', alertsCount: 78, falsePositives: 60, type: 'HISTORICAL' },
      { month: 'Mar 2026', alertsCount: 95, falsePositives: 75, type: 'HISTORICAL' },
      { month: 'Apr 2026', alertsCount: 110, falsePositives: 90, type: 'HISTORICAL' },
      { month: 'May 2026', alertsCount: 105, falsePositives: 82, type: 'HISTORICAL' },
      { month: 'Jun 2026', alertsCount: 98, falsePositives: 78, type: 'HISTORICAL' },
      { month: 'Jul 2026', alertsCount: 94, falsePositives: 72, type: 'FORECAST' },
      { month: 'Aug 2026', alertsCount: 88, falsePositives: 68, type: 'FORECAST' },
      { month: 'Sep 2026', alertsCount: 85, falsePositives: 65, type: 'FORECAST' },
      { month: 'Oct 2026', alertsCount: 80, falsePositives: 60, type: 'FORECAST' },
      { month: 'Nov 2026', alertsCount: 75, falsePositives: 55, type: 'FORECAST' },
      { month: 'Dec 2026', alertsCount: 70, falsePositives: 52, type: 'FORECAST' }
    ];
  }

  // Recommended operational actions based on mock analytics
  public getRecommendedActions() {
    return [
      {
        id: 'act-1',
        title: 'Optimize Fraud Score Threshold based on False-Positive ratios',
        priority: 'HIGH',
        category: 'Risk Operations',
        benefit: 'Estimated to save support desks ~15h/week in manual false override requests',
        details: 'The fraud score false-positive rate has hovered at 78% for 4 consecutive months. Tuning the velocity scoring filter can save overhead.'
      },
      {
        id: 'act-2',
        title: 'Target churn-risk customers with customized Savings Recommendations',
        priority: 'MEDIUM',
        category: 'Customer Retention',
        benefit: 'Projected to lower year-end customer churn by up to 1.25%',
        details: 'Cross-correlating users whose debit profiles show a 30% drop month-over-month with high-interest promotional targets has been highly effective.'
      },
      {
        id: 'act-3',
        title: 'Update training dataset labels for Expense Categorization Classifier',
        priority: 'LOW',
        category: 'Ops Quality Control',
        benefit: 'Expands prediction accuracy from 92.4% to an estimated 95.8%',
        details: 'Minor dataset drift observed in utility categorization since the introduction of regional payment codes. Re-evaluate labels.'
      },
      {
        id: 'act-4',
        title: 'Enforce MFA validation for transactions score >= 60 on Suspicious Devices',
        priority: 'HIGH',
        category: 'Enterprise Security',
        benefit: 'Aims to prevent an estimated $25k in potential manual clawback actions monthly',
        details: 'Correlating prediction failures with geographical IP patterns shows high risk in cross-border browser profiles.'
      }
    ];
  }

  // Propose a setting change
  public proposeThresholdChange(settingName: 'fraudScoreThreshold' | 'casePriorityThreshold', newValue: number, proposerName: string, notes: string): ThresholdChangeRequest {
    const oldValue = settingName === 'fraudScoreThreshold' ? this.thresholds.fraudScoreThreshold : this.thresholds.casePriorityThreshold;
    const newRequest: ThresholdChangeRequest = {
      id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      settingName,
      oldValue,
      newValue,
      proposedBy: proposerName,
      proposedAt: new Date().toISOString(),
      status: 'PENDING',
      notes
    };
    this.changeRequests.unshift(newRequest);
    return newRequest;
  }

  // Approve a setting change
  public approveThresholdChange(requestId: string, approverName: string, action: 'APPROVED' | 'REJECTED', feedback: string): ThresholdChangeRequest | null {
    const req = this.changeRequests.find(r => r.id === requestId);
    if (!req) return null;

    if (req.status !== 'PENDING') {
      throw new Error('This threshold change request is already resolved.');
    }

    req.status = action;
    req.approvedBy = approverName;
    req.approvedAt = new Date().toISOString();
    req.auditorFeedback = feedback;

    if (action === 'APPROVED') {
      // Apply the change
      if (req.settingName === 'fraudScoreThreshold') {
        this.thresholds.fraudScoreThreshold = req.newValue;
        // Increment prediction counts or simulate model trigger info
        const model = this.models.find(m => m.id === 'mdl-fraud-scoring');
        if (model) model.predictionCount += 1;
      } else if (req.settingName === 'casePriorityThreshold') {
        this.thresholds.casePriorityThreshold = req.newValue;
      }
    }
    return req;
  }
}

export default new AICore();
