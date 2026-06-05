import store from '../data/store';
import { Transaction } from '../../src/types';

export interface SettlementRecord {
  id: string;
  date: string;
  amount: number;
  type: 'PAYOUT' | 'COLLECTION';
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  gatewayRef: string;
  ledgerRef?: string;
}

export interface GatewayRecord {
  gatewayRef: string;
  amount: number;
  date: string;
  status: 'SETTLED' | 'PENDING' | 'FAILED' | 'REVERSED';
  beneficiary: string;
}

export interface ReconciliationItem {
  transactionId?: string;
  gatewayRef: string;
  internalAmount: number | null;
  gatewayAmount: number;
  internalStatus: string | null;
  gatewayStatus: string;
  comparisonVerdict: 'MATCHED' | 'MISMATCHED_AMOUNT' | 'MISSING_IN_LEDGER' | 'MISSING_IN_GATEWAY' | 'FAILED_GATEWAY';
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

class FinanceCore {
  public settlements: SettlementRecord[] = [];
  public gatewayRecords: GatewayRecord[] = [];
  public adjustments: FinanceAdjustment[] = [];
  public reconciliationActive = false;
  
  // Chargebacks placeholder percentage
  public chargebacksPlaceholder = 950.00; // static mock value, easily adjustable

  constructor() {
    this.seedSettlements();
    this.seedGatewayRecords();
    this.seedMockAdjustments();
  }

  private seedSettlements() {
    this.settlements = [
      {
        id: 'set-1',
        date: '2026-06-02T18:00:00Z',
        amount: 15400.00,
        type: 'PAYOUT',
        status: 'COMPLETED',
        gatewayRef: 'GW-SET-A92B',
        ledgerRef: 'LDG-SET-001'
      },
      {
        id: 'set-2',
        date: '2026-06-03T18:00:00Z',
        amount: 8200.50,
        type: 'COLLECTION',
        status: 'COMPLETED',
        gatewayRef: 'GW-SET-C883',
        ledgerRef: 'LDG-SET-002'
      },
      {
        id: 'set-3',
        date: '2026-06-04T12:00:00Z',
        amount: 3200.00,
        type: 'PAYOUT',
        status: 'PENDING',
        gatewayRef: 'GW-SET-P102',
        ledgerRef: 'LDG-SET-003'
      },
      {
        id: 'set-4',
        date: '2026-06-01T09:15:00Z',
        amount: 1850.00,
        type: 'PAYOUT',
        status: 'FAILED',
        gatewayRef: 'GW-SET-F442',
        ledgerRef: 'LDG-SET-004'
      }
    ];
  }

  private seedGatewayRecords() {
    // We create custom mock receipts inside the gateway settlement file that align with some seeding data of store.ts
    this.gatewayRecords = [
      // 1. Matched perfectly
      { gatewayRef: 'GW-REF-SARAH-DEP', amount: 5000.00, date: '2026-06-01T10:14:00Z', status: 'SETTLED', beneficiary: 'Sarah Jenkins' },
      // 2. Mismatched amount
      { gatewayRef: 'GW-REF-MISMATCH', amount: 4850.00, date: '2026-06-02T12:15:00Z', status: 'SETTLED', beneficiary: 'Michael Vance' },
      // 3. Missing in ledger (gateway only has record)
      { gatewayRef: 'GW-REF-GATEWAY-ONLY', amount: 1250.00, date: '2026-06-03T15:22:00Z', status: 'SETTLED', beneficiary: 'Unknown Merchant Apex' },
      // 4. Failed gateway
      { gatewayRef: 'GW-REF-FAILED-GW', amount: 750.00, date: '2026-06-02T18:40:00Z', status: 'FAILED', beneficiary: 'Jessica Alba' },
      // 5. Normal transfers
      { gatewayRef: 'GW-REF-OK-TRF', amount: 450.00, date: '2026-06-04T08:32:00Z', status: 'SETTLED', beneficiary: 'Sarah Jenkins' }
    ];
  }

  private seedMockAdjustments() {
    this.adjustments = [
      {
        id: 'adj-101',
        transactionId: 'tx-2',
        proposedBy: 'Finch Devin',
        notes: 'Excess fee refund for premium customer. Proposed billing waive.',
        type: 'FEE_ADJUSTMENT',
        amount: 25.00,
        status: 'APPROVED',
        approvedBy: 'Super Admin',
        approvedAt: '2026-06-03T16:15:00Z',
        timestamp: '2026-06-03T14:10:00Z'
      },
      {
        id: 'adj-102',
        transactionId: 'tx-3',
        proposedBy: 'Finch Devin',
        notes: 'Duplicate wire charge reverse requested by client.',
        type: 'REVERSAL',
        amount: 220.00,
        status: 'PENDING_APPROVAL',
        timestamp: '2026-06-04T11:45:00Z'
      }
    ];
  }

  // Generate real-time reconciliation comparisons
  public performReconciliation(): ReconciliationItem[] {
    const internalTxs = store.transactions;
    const items: ReconciliationItem[] = [];

    // Map internal txs
    internalTxs.forEach(tx => {
      // Find matching gateway records by gatewayRef
      const matchedGw = this.gatewayRecords.find(g => g.gatewayRef === tx.gatewayRef);
      if (matchedGw) {
        if (matchedGw.amount === tx.amount) {
          items.push({
            transactionId: tx.id,
            gatewayRef: tx.gatewayRef || 'None',
            internalAmount: tx.amount,
            gatewayAmount: matchedGw.amount,
            internalStatus: tx.status,
            gatewayStatus: matchedGw.status,
            comparisonVerdict: 'MATCHED'
          });
        } else {
          items.push({
            transactionId: tx.id,
            gatewayRef: tx.gatewayRef || 'None',
            internalAmount: tx.amount,
            gatewayAmount: matchedGw.amount,
            internalStatus: tx.status,
            gatewayStatus: matchedGw.status,
            comparisonVerdict: 'MISMATCHED_AMOUNT'
          });
        }
      } else {
        // If internal has a gatewayRef but missing from current mock settlement batch
        if (tx.gatewayRef) {
          items.push({
            transactionId: tx.id,
            gatewayRef: tx.gatewayRef,
            internalAmount: tx.amount,
            gatewayAmount: 0,
            internalStatus: tx.status,
            gatewayStatus: 'MISSING_IN_GATEWAY',
            comparisonVerdict: 'MISSING_IN_GATEWAY'
          });
        }
      }
    });

    // Find any gateway records missing from internal ledger
    this.gatewayRecords.forEach(gw => {
      const matchedLedger = internalTxs.some(t => t.gatewayRef === gw.gatewayRef);
      if (!matchedLedger) {
        items.push({
          gatewayRef: gw.gatewayRef,
          internalAmount: null,
          gatewayAmount: gw.amount,
          internalStatus: null,
          gatewayStatus: gw.status,
          comparisonVerdict: 'MISSING_IN_LEDGER'
        });
      }
    });

    this.reconciliationActive = true;
    return items;
  }

  // Get finance exception list for adjustments dashboard reporting
  public getExceptions() {
    const internalTxs = store.transactions;
    const exceptions: any[] = [];

    // 1. Failed transactions
    internalTxs.filter(t => t.status === 'FAILED').forEach(t => {
      exceptions.push({
        id: `exc-tx-${t.id}`,
        type: 'FAILED_INTERNAL_TRANSACTION',
        severity: 'MEDIUM',
        amount: t.amount,
        reference: t.id,
        user: t.senderName || 'Unknown Partner',
        timestamp: t.date,
        details: `Internal state FAILED. Reason: Gate criteria or KYC check blocked.`
      });
    });

    // 2. Mismatched from gateway checks
    const comparisons = this.performReconciliation();
    comparisons.filter(c => c.comparisonVerdict !== 'MATCHED').forEach((c, idx) => {
      exceptions.push({
        id: `exc-recon-${idx}`,
        type: c.comparisonVerdict,
        severity: c.comparisonVerdict === 'MISMATCHED_AMOUNT' ? 'HIGH' : 'LOW',
        amount: c.internalAmount || c.gatewayAmount,
        reference: c.gatewayRef,
        user: 'Gateway Clearing Corp',
        timestamp: new Date().toISOString(),
        details: `Gateway Total: $${c.gatewayAmount}. Ledger Total: $${c.internalAmount || 0}. Status Diff: ${c.internalStatus} vs ${c.gatewayStatus}`
      });
    });

    // 3. Reversed or manually adjusted transactions
    this.adjustments.forEach(adj => {
      exceptions.push({
        id: `exc-adj-${adj.id}`,
        type: `ADJUSTMENT_${adj.type}`,
        severity: adj.status === 'PENDING_APPROVAL' ? 'MEDIUM' : 'LOW',
        amount: adj.amount,
        reference: adj.transactionId || adj.id,
        user: adj.proposedBy,
        timestamp: adj.timestamp,
        details: `Adjustment Status: ${adj.status}. Explanation: ${adj.notes}`
      });
    });

    return exceptions;
  }
}

export default new FinanceCore();
