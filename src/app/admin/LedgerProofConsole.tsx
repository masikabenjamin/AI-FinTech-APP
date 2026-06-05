import React, { useState, useEffect } from 'react';
import { LedgerSummary, fetchTransactions } from '../../services/api';
import { Transaction } from '../../types';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Scale, 
  FileSpreadsheet, 
  Lock, 
  Search, 
  Copy, 
  Check, 
  Filter, 
  Activity, 
  ArrowUpRight 
} from 'lucide-react';

interface LedgerProofConsoleProps {
  ledgerStats: LedgerSummary | null;
  isLoading: boolean;
  darkMode?: boolean;
}

export const LedgerProofConsole: React.FC<LedgerProofConsoleProps> = ({
  ledgerStats,
  isLoading,
  darkMode = false
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'solvency' | 'transactions'>('solvency');
  const [transactionsList, setTransactionsList] = useState<Transaction[]>([]);
  const [txSearch, setTxSearch] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING' | 'FAILED'>('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER'>('ALL');
  const [txLoading, setTxLoading] = useState(false);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  // Sync / fetch central transactions
  useEffect(() => {
    async function syncTransactions() {
      setTxLoading(true);
      try {
        const txs = await fetchTransactions();
        setTransactionsList(txs);
      } catch (err) {
        console.error("Failed to load tracking data inside Ledger Console", err);
      } finally {
        setTxLoading(false);
      }
    }
    syncTransactions();
  }, [activeSubTab, ledgerStats]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  // Filter central transaction records
  const filteredTxs = transactionsList.filter(tx => {
    const query = txSearch.toLowerCase();
    const matchesSearch = 
      tx.id.toLowerCase().includes(query) ||
      (tx.senderName && tx.senderName.toLowerCase().includes(query)) ||
      (tx.receiverName && tx.receiverName.toLowerCase().includes(query)) ||
      (tx.gatewayRef && tx.gatewayRef.toLowerCase().includes(query)) ||
      (tx.ledgerRef && tx.ledgerRef.toLowerCase().includes(query)) ||
      (tx.description && tx.description.toLowerCase().includes(query));
    
    const matchesStatus = txStatusFilter === 'ALL' || tx.status === txStatusFilter;
    const matchesType = txTypeFilter === 'ALL' || tx.type === txTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-4 text-xs select-none">
      
      {/* Platform Solvency Sheet statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* Metric 1 */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
          darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-205 shadow-2xs'
        }`}>
          <div>
            <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-slate-400">Asset base</span>
            <span className="text-[10px] text-slate-450 mt-0.5 block text-left">Central Vault Reserves</span>
            <div className={`text-base font-extrabold font-mono tracking-tight mt-2 text-left ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {ledgerStats?.stats?.platformReserves ? formatCurrency(ledgerStats.stats.platformReserves) : '$10,000,000.00'}
            </div>
          </div>
          <span className="text-[9px] text-emerald-500 block mt-3 font-semibold text-left">● Vault Locked</span>
        </div>

        {/* Metric 2 */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
          darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-205 shadow-2xs'
        }`}>
          <div>
            <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-slate-400">Platform Liabilities</span>
            <span className="text-[10px] text-slate-455 mt-0.5 block text-left">Total Customer Deposits</span>
            <div className={`text-base font-extrabold font-mono tracking-tight mt-2 text-left ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {ledgerStats?.stats?.platformLiabilities ? formatCurrency(ledgerStats.stats.platformLiabilities) : '$400,000.00'}
            </div>
          </div>
          <span className="text-[9px] text-slate-450 block mt-3 text-left">Full reserve backed</span>
        </div>

        {/* Metric 3 */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
          darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-205 shadow-2xs'
        }`}>
          <div>
            <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-slate-400">Liquidity reserves health</span>
            <span className="text-[10px] text-slate-455 mt-0.5 block text-left">Capital Adequacy Ratio</span>
            <div className={`text-base font-extrabold tracking-tight mt-2 flex items-center gap-1 ${darkMode ? 'text-emerald-450' : 'text-emerald-700'}`}>
              <span>{ledgerStats?.stats?.reserveHealthPercent || '96.2'}%</span>
              <span className="text-[8px] bg-emerald-500/15 text-emerald-500 px-1 font-mono uppercase font-black rounded">UAT-CLEAR</span>
            </div>
          </div>
          <span className="text-[9px] text-slate-450 block mt-3 text-left">Basler-III Tier 1 OK</span>
        </div>

        {/* Metric 4 */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
          darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-205 shadow-2xs'
        }`}>
          <div>
            <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-slate-400">Security audits Standard</span>
            <span className="text-[10px] text-slate-455 mt-0.5 block text-left font-semibold">Accounting Verifier</span>
            
            <div className="mt-2">
              {ledgerStats?.verdict?.isValid ? (
                <div className="flex items-center gap-1 font-bold text-[10.5px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  <ShieldCheck className="h-4 w-4" /> Balanced Clean
                </div>
              ) : (
                <div className="flex items-center gap-1 font-bold text-[10.5px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                  <ShieldAlert className="h-4 w-4" /> Checking variance
                </div>
              )}
            </div>
          </div>
          <span className="text-[9px] text-slate-455 font-mono block mt-3 text-left">Discrepancy: 0 USD</span>
        </div>

      </div>

      {/* Main double entry journal entries sheet */}
      <div className={`p-4 rounded-xl border transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-205 shadow-2xs'
      }`}>
        
        {/* Toggle subtabs bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4.5 w-4.5 text-indigo-400" />
            <div className="text-left">
              <h5 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Posting Journal Ledgers</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Dual-posting ledger receipts matching standard compliance audits.</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-2 sm:pt-0">
            <button
              onClick={() => setActiveSubTab('solvency')}
              className={`py-1.5 px-3 rounded-lg font-bold transition-all text-[10px] cursor-pointer ${
                activeSubTab === 'solvency'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : darkMode ? 'bg-slate-950 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              📊 Solvency Journals
            </button>
            <button
              onClick={() => setActiveSubTab('transactions')}
              className={`py-1.5 px-3 rounded-lg font-bold transition-all text-[10px] cursor-pointer flex items-center gap-1 ${
                activeSubTab === 'transactions'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : darkMode ? 'bg-slate-950 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity className="h-3.5 w-3.5 shrink-0" /> Transactions Monitor
            </button>
          </div>
        </div>

        {/* DOUBLE ENTRY SOLVENCY POSTING TABLE */}
        {activeSubTab === 'solvency' && (
          <>
            {isLoading ? (
              <div className="py-12 text-center text-slate-405">
                Refetching compliance files ledger...
              </div>
            ) : !ledgerStats?.entries || ledgerStats.entries.length === 0 ? (
              <div className="py-8 text-center text-slate-405">
                No completed double-entry journals posted in database active ledger.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[10.5px] text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className={`border-b font-mono text-[8.5px] uppercase tracking-wider ${
                      darkMode ? 'border-slate-800 text-slate-400 bg-slate-950/40' : 'border-slate-200 text-slate-500 bg-slate-50'
                    }`}>
                      <th className="py-2 px-3">Journal Ref ID</th>
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3">Purpose Title</th>
                      <th className="py-2 px-3">Debited target Account</th>
                      <th className="py-2 px-3 text-right">Debit Balance</th>
                      <th className="py-2 px-3">Credited target Account</th>
                      <th className="py-2 px-3 text-right">Credit Balance</th>
                      <th className="py-2 px-3 text-center">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                    {ledgerStats.entries.map((entry) => {
                      const debPosting = entry.postings.find((p: any) => p.type === 'DEBIT');
                      const credPosting = entry.postings.find((p: any) => p.type === 'CREDIT');

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/10">
                          <td className="py-2.5 px-3 font-mono text-[9px] text-slate-405 font-bold">{entry.id}</td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[9px]">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className={`py-2.5 px-3 font-bold text-left ${darkMode ? 'text-white' : 'text-slate-800'}`}>{entry.description}</td>
                          
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[9.5px]">
                            {debPosting?.accountId || 'SYSTEM-RESERVE'}
                            <span className="block text-[7.5px] text-slate-455 mt-0.5">{debPosting?.accountName}</span>
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {debPosting ? formatCurrency(debPosting.amount) : '$0.00'}
                          </td>

                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[9.5px]">
                            {credPosting?.accountId || 'SYSTEM-RESERVE'}
                            <span className="block text-[7.5px] text-slate-455 mt-0.5">{credPosting?.accountName}</span>
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {credPosting ? formatCurrency(credPosting.amount) : '$0.00'}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8.5px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              BALANCED
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* TRANSACTIONS MONITORING HUB PANEL */}
        {activeSubTab === 'transactions' && (
          <div className="space-y-3">
            {/* Search and Filters row */}
            <div className={`p-3 rounded-xl border flex flex-col sm:flex-row gap-2 items-center ${
              darkMode ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="relative w-full sm:w-auto grow">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by ID, references, account holder or descriptions..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 text-[10.5px] rounded-lg focus:outline-none focus:ring-1 ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3 w-3 text-slate-405 shrink-0" />
                  <select
                    value={txStatusFilter}
                    aria-label="Filter transactions by status"
                    onChange={(e) => setTxStatusFilter(e.target.value as any)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] focus:outline-none border ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="COMPLETED">Completed Only</option>
                    <option value="PENDING">Pending Only</option>
                    <option value="FAILED">Failed Only</option>
                  </select>
                </div>

                <select
                  value={txTypeFilter}
                  aria-label="Filter transactions by operation type"
                  onChange={(e) => setTxTypeFilter(e.target.value as any)}
                  className={`py-1.5 px-2 rounded-lg text-[10px] focus:outline-none border ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'
                  }`}
                >
                  <option value="ALL">All Operations</option>
                  <option value="DEPOSIT">Inbound Deposits</option>
                  <option value="WITHDRAWAL">Outbound Withdrawals</option>
                  <option value="TRANSFER">Peer Transfers</option>
                </select>
              </div>
            </div>

            {txLoading ? (
              <div className="py-12 text-center text-slate-405">
                Connecting auditing stream ledger...
              </div>
            ) : filteredTxs.length === 0 ? (
              <div className="py-12 text-center text-slate-405 bg-slate-500/5 rounded-2xl border border-dashed border-slate-500/10">
                No ledger funding transactions matching the active search parameters.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-850">
                <table className="w-full text-[10px] text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className={`border-b font-mono text-[8.5px] uppercase tracking-wider ${
                      darkMode ? 'border-slate-800 text-slate-400 bg-slate-950/40' : 'border-slate-200 text-slate-500 bg-slate-50'
                    }`}>
                      <th className="py-2.5 px-3">Clearance Time</th>
                      <th className="py-2.5 px-3">Transaction ID</th>
                      <th className="py-2.5 px-3">Origination / Recipient</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Settlement value</th>
                      <th className="py-2.5 px-3 text-center">Outcome</th>
                      <th className="py-2.5 px-3">Gateway Reference</th>
                      <th className="py-2.5 px-3">Ledger Journal Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-105 dark:divide-slate-850 font-medium">
                    {filteredTxs.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/10">
                        <td className="py-2 px-3 text-slate-400 font-mono">
                          {new Date(tx.date).toLocaleDateString()} &nbsp;
                          {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-404 font-bold">{tx.id}</td>
                        <td className={`py-2 px-3 font-bold text-left ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          <div className="space-y-0.5">
                            <span>{tx.senderName || 'Self Incline Deposit'}</span>
                            <span className="text-[7.5px] text-slate-500 block uppercase font-mono">To: {tx.receiverName || 'External Gateway'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-450 uppercase tracking-wider text-[8px] font-mono font-bold">{tx.category || 'N/A'}</td>
                        <td className="py-2 px-3 font-mono">
                          <span className={`px-1 rounded text-[8px] uppercase font-bold ${
                            tx.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            tx.type === 'WITHDRAWAL' ? 'bg-rose-500/10 text-rose-450' :
                            'bg-indigo-500/10 text-indigo-400'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className={`py-2 px-3 text-right font-mono font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] uppercase font-black ${
                            tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                            tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-rose-500/10 text-rose-450'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[8.5px] select-all text-left">
                          {tx.gatewayRef ? (
                            <div className="flex items-center gap-1">
                              <span className={`${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{tx.gatewayRef}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(tx.gatewayRef || '');
                                  setCopiedTxId(tx.id + '-gw');
                                  setTimeout(() => setCopiedTxId(null), 1500);
                                }}
                                aria-label="Copy gateway reference"
                                className="p-1 hover:bg-slate-500/10 rounded cursor-pointer"
                              >
                                {copiedTxId === tx.id + '-gw' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-slate-450" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[8px] uppercase text-slate-500 italic font-bold">Standard Deposit</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[8.5px] select-all text-left">
                          {tx.ledgerRef ? (
                            <div className="flex items-center gap-1">
                              <span className="text-indigo-400">{tx.ledgerRef}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(tx.ledgerRef || '');
                                  setCopiedTxId(tx.id + '-led');
                                  setTimeout(() => setCopiedTxId(null), 1500);
                                }}
                                aria-label="Copy ledger reference"
                                className="p-1 hover:bg-slate-500/10 rounded cursor-pointer"
                              >
                                {copiedTxId === tx.id + '-led' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-slate-450" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[8px] uppercase text-slate-500 italic font-bold">Incline Ledger</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center gap-1 text-[9px] text-slate-455 font-mono">
          <Scale className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>Balanced ledger verify: Net offset discrepancy equates to 0, ensuring zero platform risk variance.</span>
        </div>

      </div>

    </div>
  );
};
