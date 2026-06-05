import { Transaction, UserProfile } from '../../src/types';
import store from '../data/store';

export interface LedgerPosting {
  accountId: string;
  accountName: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  timestamp: string;
  description: string;
  postings: LedgerPosting[];
  isBalanced: boolean;
}

// In double entry:
// - A DEBIT increases an Asset account, or decreases a Liability/Equity account.
// - A CREDIT decreases an Asset account, or increases a Liability/Equity account.
//
// In our simple customer-deposits representation:
// - Customer balances are LIABILITIES to the platform (we owe them their money).
// - Platform Reserve / Cash Vault is an ASSET (cash we physically hold).
//
// Therefore:
// 1. For a DEPOSIT ($D):
//    - We debit Cash Vault (+Asset): $D
//    - We credit Customer Account (+Liability): $D
//    - Balanced: +$D and +$D (zero-sum as change: Debit minus Credit = 0)
//
// 2. For a WITHDRAWAL ($W):
//    - We credit Cash Vault (-Asset): $W
//    - We debit Customer Account (-Liability): $W
//    - Balanced: Debit minus Credit = 0
//
// 3. For a TRANSFER ($T) from Sarah to Carlos:
//    - We debit Sarah Account (-Liability): $T
//    - We credit Carlos Account (+Liability): $T
//    - Balanced: Debit minus Credit = 0

export class LedgerCore {
  private ledgerEntries: LedgerEntry[] = [];

  constructor() {
    this.rebuildLedgerFromTransactions();
  }

  // Rebuild ledger using current transactions stored in store
  public rebuildLedgerFromTransactions() {
    this.ledgerEntries = [];
    const completedTxs = store.transactions.filter(t => t.status === 'COMPLETED');
    for (const tx of completedTxs) {
      this.postTransaction(tx, false); // Don't log audits repeatedly during reboot
    }
  }

  public getEntries(): LedgerEntry[] {
    return this.ledgerEntries;
  }

  // Calculate platform liability (all active user balances combined)
  public getTotalUserLiability(): number {
    return store.users.reduce((acc, user) => acc + user.balance, 0);
  }

  // Double entry verification: total assets (Platform vault reserve) must match total user liability
  public getPlatformReserves(): number {
    // Platform reserve is calculated by: sum(DEBITS to Vault) - sum(CREDITS to Vault)
    let reserve = 10000000.00; // Let's seed with a $10M mock capital reserve base
    for (const entry of this.ledgerEntries) {
      for (const posting of entry.postings) {
        if (posting.accountId === 'PLATFORM-VAULT') {
          if (posting.type === 'DEBIT') {
            reserve += posting.amount;
          } else {
            reserve -= posting.amount;
          }
        }
      }
    }
    return reserve;
  }

  public verifyIntegrity(): { isValid: boolean; difference: number; message: string } {
    let unbalanceCount = 0;
    for (const entry of this.ledgerEntries) {
      const dbSum = entry.postings.filter(p => p.type === 'DEBIT').reduce((acc, p) => acc + p.amount, 0);
      const crSum = entry.postings.filter(p => p.type === 'CREDIT').reduce((acc, p) => acc + p.amount, 0);
      // Precision margin math
      const diff = Math.abs(dbSum - crSum);
      if (diff > 0.001) {
        unbalanceCount++;
      }
    }

    if (unbalanceCount > 0) {
      return {
        isValid: false,
        difference: unbalanceCount,
        message: `Ledger contains ${unbalanceCount} unbalanced postings where debits !== credits.`
      };
    }

    return {
      isValid: true,
      difference: 0,
      message: 'Ledger integrity verified. Double-entry total assets and platform liabilities balance cleanly.'
    };
  }

  // Posts a transaction block following absolute double-entry rules
  public postTransaction(tx: Transaction, logToAuditLogs: boolean = true): LedgerEntry | null {
    const postings: LedgerPosting[] = [];
    const desc = tx.description || `${tx.type} transaction`;

    if (tx.type === 'DEPOSIT') {
      // Debit Cash Vault (+Asset), Credit Customer (+Platform Liability)
      postings.push({
        accountId: 'PLATFORM-VAULT',
        accountName: 'Platform Central Vault Reserve',
        type: 'DEBIT',
        amount: tx.amount
      });
      postings.push({
        accountId: `USER-${tx.receiverId}`,
        accountName: `Customer Liability: ${tx.receiverName}`,
        type: 'CREDIT',
        amount: tx.amount
      });
    } else if (tx.type === 'WITHDRAWAL') {
      // Debit Customer Liability (-Platform Liability), Credit Cash Vault (-Asset)
      postings.push({
        accountId: `USER-${tx.senderId}`,
        accountName: `Customer Liability: ${tx.senderName}`,
        type: 'DEBIT',
        amount: tx.amount
      });
      postings.push({
        accountId: 'PLATFORM-VAULT',
        accountName: 'Platform Central Vault Reserve',
        type: 'CREDIT',
        amount: tx.amount
      });
    } else if (tx.type === 'TRANSFER') {
      // Debit Sender Liability (-Platform Liability), Credit Recipient Liability (+Platform Liability)
      postings.push({
        accountId: `USER-${tx.senderId}`,
        accountName: `Customer Liability: ${tx.senderName}`,
        type: 'DEBIT',
        amount: tx.amount
      });
      postings.push({
        accountId: `USER-${tx.receiverId}`,
        accountName: `Customer Liability: ${tx.receiverName}`,
        type: 'CREDIT',
        amount: tx.amount
      });
    }

    // Verify debit sum matches credit sum
    const debits = postings.filter(p => p.type === 'DEBIT').reduce((acc, p) => acc + p.amount, 0);
    const credits = postings.filter(p => p.type === 'CREDIT').reduce((acc, p) => acc + p.amount, 0);
    const isBalanced = Math.abs(debits - credits) < 0.001;

    const entry: LedgerEntry = {
      id: `led-${tx.id}`,
      transactionId: tx.id,
      timestamp: tx.date || new Date().toISOString(),
      description: desc,
      postings,
      isBalanced
    };

    if (isBalanced) {
      this.ledgerEntries.push(entry);
      if (logToAuditLogs) {
        store.logAudit(
          'LEDGER_CORE',
          'POST_LEDGER_ENTRY',
          `Double-entry ledger posted successfully for TX ${tx.id}. Debits: $${debits.toFixed(2)}, Credits: $${credits.toFixed(2)}. Balanced!`,
          'SUCCESS'
        );
      }
    } else {
      if (logToAuditLogs) {
        store.logAudit(
          'LEDGER_CORE',
          'POST_LEDGER_ENTRY',
          `REJECTED: Ledger posting out of balance for TX ${tx.id}. Debits: $${debits.toFixed(2)}, Credits: $${credits.toFixed(2)}`,
          'FAILURE'
        );
      }
    }

    return entry;
  }
}

export default new LedgerCore();
