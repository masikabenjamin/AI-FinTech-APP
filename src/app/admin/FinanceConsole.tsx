import React, { useState, useEffect } from 'react';
import { 
  fetchFinanceStats, 
  fetchReconciliationData, 
  runReconciliationAudit, 
  fetchExceptionReport, 
  fetchAdjustments, 
  proposeAdjustment, 
  approveAdjustment,
  FinanceStats,
  ReconItem,
  FinanceAdjustment,
  FinanceException
} from '../../services/api';
import { Transaction, UserProfile } from '../../types';
import { 
  Building2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldAlert, 
  FileText, 
  Check, 
  X, 
  DollarSign, 
  Clock, 
  History, 
  Sparkles, 
  Download, 
  ArrowRight,
  Calculator,
  UserCheck,
  Percent,
  Coins
} from 'lucide-react';

interface FinanceConsoleProps {
  transactions: Transaction[];
  users: UserProfile[];
  darkMode?: boolean;
  activeUser: { name: string; role: string; email: string };
  onRefreshAll: () => void;
}

export const FinanceConsole: React.FC<FinanceConsoleProps> = ({
  transactions = [],
  users = [],
  darkMode = false,
  activeUser,
  onRefreshAll
}) => {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [exceptions, setExceptions] = useState<FinanceException[]>([]);
  const [adjustments, setAdjustments] = useState<FinanceAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reversal propose state
  const [selectedTxForReversal, setSelectedTxForReversal] = useState<Transaction | null>(null);
  const [reversalReasonInput, setReversalReasonInput] = useState('');
  const [proposeSuccessMsg, setProposeSuccessMsg] = useState<string | null>(null);
  const [proposeErrorMsg, setProposeErrorMsg] = useState<string | null>(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);

  // Generic direct proposal (not linked to specific tx)
  const [directProposeOpen, setDirectProposeOpen] = useState(false);
  const [directType, setDirectType] = useState<'FEE_ADJUSTMENT' | 'MANUAL_DEBIT' | 'MANUAL_CREDIT'>('FEE_ADJUSTMENT');
  const [directAmount, setDirectAmount] = useState('');
  const [directNotes, setDirectNotes] = useState('');

  // Active view inside Finance (dashboard/reconciliation/exceptions/adjustments)
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'reconciliation' | 'exceptions' | 'adjustments'>('dashboard');

  // Load all finance files
  const loadFinanceData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [fStats, rData, eData, adjData] = await Promise.all([
        fetchFinanceStats(),
        fetchReconciliationData(),
        fetchExceptionReport(),
        fetchAdjustments()
      ]);
      setStats(fStats);
      setReconciliation(rData);
      setExceptions(eData);
      setAdjustments(adjData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sync backoffice corporate ledger assets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [transactions]);

  // Propose adjustment/reversal submission
  const handleProposeReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxForReversal) return;
    if (!reversalReasonInput.trim()) {
      setProposeErrorMsg('MANDATORY REASON CODE: Please supply a reason/auditing justification code.');
      return;
    }

    setSubmittingProposal(true);
    setProposeErrorMsg(null);
    setProposeSuccessMsg(null);

    try {
      await proposeAdjustment({
        transactionId: selectedTxForReversal.id,
        type: 'REVERSAL',
        amount: selectedTxForReversal.amount,
        notes: reversalReasonInput
      });

      setProposeSuccessMsg(`Success! Proposed $${selectedTxForReversal.amount.toFixed(2)} reversal for transaction #${selectedTxForReversal.id}. Awaiting Super Admin or Finance Manager verification signoff.`);
      setReversalReasonInput('');
      setSelectedTxForReversal(null);
      
      // Reload lists
      const [adjData, eData] = await Promise.all([fetchAdjustments(), fetchExceptionReport()]);
      setAdjustments(adjData);
      setExceptions(eData);
      onRefreshAll();
    } catch (err: any) {
      setProposeErrorMsg(err.message || 'Proposal was rejected by core gateway check.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleProposeDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(directAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setProposeErrorMsg('Invalid adjustment quantity.');
      return;
    }
    if (!directNotes.trim()) {
      setProposeErrorMsg('Auditing description notes are required.');
      return;
    }

    setSubmittingProposal(true);
    setProposeErrorMsg(null);
    setProposeSuccessMsg(null);

    try {
      await proposeAdjustment({
        type: directType,
        amount: parsedAmt,
        notes: directNotes
      });

      setProposeSuccessMsg(`Manual ledger adjust proposed successfully.`);
      setDirectAmount('');
      setDirectNotes('');
      setDirectProposeOpen(false);

      // Reload
      const [adjData, eData] = await Promise.all([fetchAdjustments(), fetchExceptionReport()]);
      setAdjustments(adjData);
      setExceptions(eData);
      onRefreshAll();
    } catch (err: any) {
      setProposeErrorMsg(err.message || 'Direct proposal rejected.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  // Run reconciliation audit compare loop
  const handleTriggerReconcile = async () => {
    try {
      await runReconciliationAudit();
      const rData = await fetchReconciliationData();
      setReconciliation(rData);
      // reload exceptions
      const eData = await fetchExceptionReport();
      setExceptions(eData);
      
      alert('✓ RECONCILIATION SUITE RUN COMPLETE: Core ledger balances matches successfully checked against Gateway settlement logs!');
      onRefreshAll();
      loadFinanceData();
    } catch (err: any) {
      alert(`Failure: ${err.message}`);
    }
  };

  // Approve adjustments workflow
  const handleResolveAdjustment = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const feedbackText = prompt(`Enter optional confirmation payload notes for ${action} of proposal #${id}:`);
    if (feedbackText === null) return; // cancel

    try {
      await approveAdjustment(id, action, feedbackText || undefined);
      alert(`Adjustment successfully updated to ${action} status.`);
      loadFinanceData();
      onRefreshAll();
    } catch (err: any) {
      alert(`❌ ERROR: ${err.message || 'Unauthorised role blocked by system.'}`);
    }
  };

  // Simulating exports placeholders
  const handleTriggerExport = (type: 'CSV' | 'PDF') => {
    alert(`SUCCESS: Packaging revenue ledger parameters onto high-fidelity [${type}] report schema. Download initialized for Apex_Treasury_Reconciled_${new Date().toISOString().split('T')[0]}.${type.toLowerCase()}`);
  };

  if (isLoading && !stats) {
    return (
      <div className="py-12 text-center text-slate-400 font-mono text-xs">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-indigo-400" />
        Syncing real-time corporate clearing logs...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-left select-none">
      
      {/* Top Title Bar with Operator Role Details */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
        darkMode ? 'bg-[#1e1b4b]/20 border-indigo-950/50' : 'bg-indigo-50/50 border-indigo-100'
      }`}>
        <div>
          <span className="font-mono text-[9px] uppercase tracking-wider font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            Treasury Clearance Level: {activeUser.role}
          </span>
          <h2 className={`font-sans font-extrabold text-base mt-1.5 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            Audit & Payment Settlement Center
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Real-time double-entry compliance reconciliations, merchant payout runs, dynamic exceptions logging, and manual refund control desk.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleTriggerExport('CSV')}
            className={`p-2 px-3.5 rounded-xl border font-sans font-bold text-[10.5px] cursor-pointer transition-all flex items-center gap-1.5 ${
              darkMode ? 'bg-slate-900 border-slate-850 text-slate-300 hover:bg-slate-850' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-3xs'
            }`}
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" /> Export CSV Sheet
          </button>
          
          <button
            onClick={() => handleTriggerExport('PDF')}
            className={`p-2 px-3 text-[10.5px] rounded-xl border font-sans font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              darkMode ? 'bg-slate-900 border-slate-850 text-slate-300 hover:bg-slate-850' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-3xs'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-indigo-400" /> Audit PDF Summary
          </button>

          <button
            onClick={loadFinanceData}
            className={`p-2 rounded-xl border cursor-pointer transition-all ${
              darkMode ? 'bg-slate-900 border-slate-850 text-slate-300 hover:bg-slate-850' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-3xs'
            }`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 font-bold block leading-relaxed font-mono">
          🚨 AUDIT ERROR: {errorMessage}
        </div>
      )}

      {/* Multi-Screen Dashboard View Selector (Sub-Tabs) */}
      <div className="flex border-b border-slate-200 dark:border-slate-850 pb-px">
        <button
          onClick={() => { setActiveSubTab('dashboard'); setProposeSuccessMsg(null); }}
          className={`px-5 py-3 border-b-2 font-sans font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'dashboard'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-slate-400 hover:text-slate-250'
          }`}
        >
          <TrendingUp className="h-4 w-4" /> Revenue & settlements
        </button>
        <button
          onClick={() => { setActiveSubTab('reconciliation'); setProposeSuccessMsg(null); }}
          className={`px-5 py-3 border-b-2 font-sans font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'reconciliation'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-slate-400 hover:text-slate-250'
          }`}
        >
          <Calculator className="h-4 w-4" /> Gateway Reconciliation ({reconciliation?.items?.length || 0})
        </button>
        <button
          onClick={() => { setActiveSubTab('exceptions'); setProposeSuccessMsg(null); }}
          className={`px-5 py-3 border-b-2 font-sans font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'exceptions'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-slate-400 hover:text-slate-250'
          }`}
        >
          <AlertTriangle className="h-4 w-4" /> Exception reports ({exceptions.length})
        </button>
        <button
          onClick={() => { setActiveSubTab('adjustments'); setProposeSuccessMsg(null); }}
          className={`px-5 py-3 border-b-2 font-sans font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'adjustments'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-slate-400 hover:text-slate-250'
          }`}
        >
          <History className="h-4 w-4" /> Reversals & adjustments ({adjustments.length})
        </button>
      </div>

      {proposeSuccessMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-xl font-bold flex items-start gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{proposeSuccessMsg}</span>
        </div>
      )}

      {/* SUB-VIEW 1: REVENUE AND SETTLEMENTS METRIC BOARDS */}
      {activeSubTab === 'dashboard' && stats && (
        <div className="space-y-6">
          
          {/* Revenue Board Row */}
          <div>
            <h3 className={`font-sans font-bold text-xs mb-3 flex items-center gap-1 text-slate-400 tracking-wider uppercase font-mono`}>
              <Coins className="h-3.5 w-3.5" /> Revenue & fees statement
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className={`p-4 rounded-2xl border transition-all ${
                darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
              }`}>
                <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400 block">Transaction Fees</span>
                <div className={`text-lg font-extrabold font-mono mt-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  ${stats.revenue.transactionFees.toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">1.5% clear-out rate.</p>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${
                darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
              }`}>
                <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-indigo-500 block">Gross Revenue</span>
                <div className="text-lg font-extrabold font-mono mt-1 text-indigo-500">
                  ${stats.revenue.grossRevenue.toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Fees + markup channels.</p>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${
                darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
              }`}>
                <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-rose-500 block">Refunds / reversed</span>
                <div className="text-lg font-extrabold font-mono mt-1 text-rose-500">
                  -${stats.revenue.refunds.toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Approved total clawbacks.</p>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${
                darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
              }`}>
                <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-amber-500 block">Chargeback holds</span>
                <div className="text-lg font-extrabold font-mono mt-1 text-amber-500">
                  -${stats.revenue.chargebacksPlaceholder.toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Temporary dispute safe.</p>
              </div>

              <div className={`p-4 rounded-2xl border border-dashed transition-all col-span-2 md:col-span-1 ${
                darkMode ? 'bg-indigo-950/20 border-indigo-500/20' : 'bg-emerald-50/20 border-emerald-500/25'
              }`}>
                <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-emerald-500 block">Net Revenue</span>
                <div className="text-xl font-black font-mono mt-1 text-emerald-500">
                  ${stats.revenue.netRevenue.toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Gross - Debits.</p>
              </div>
            </div>
          </div>

          {/* Settlements statistics */}
          <div>
            <h3 className={`font-sans font-bold text-xs mb-3 flex items-center gap-1 text-slate-400 tracking-wider uppercase font-mono`}>
              <Building2 className="h-3.5 w-3.5" /> Settlements & gateway statuses
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div className={`p-4 rounded-2xl border ${
                darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400">Completed Payouts</span>
                  <span className="p-1 px-1.5 text-[8px] bg-emerald-500/10 text-emerald-500 rounded font-bold font-mono">STABLE</span>
                </div>
                <div className={`text-md font-extrabold font-mono text-slate-800 dark:text-white`}>
                  {stats.settlements.completed.count} settled runs
                </div>
                <div className="mt-1 font-mono font-extrabold text-sm text-emerald-500">
                  ${stats.settlements.completed.amount.toFixed(2)}
                </div>
                <p className="text-[9.5px] text-slate-400 mt-1">Transferred from reservoir.</p>
              </div>

              <div className={`p-4 rounded-2xl border ${
                darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400">Pending Settlements</span>
                  <span className="p-1 px-1.5 text-[8px] bg-amber-500/10 text-amber-500 rounded font-bold font-mono">FLOWING</span>
                </div>
                <div className={`text-md font-extrabold font-mono text-slate-800 dark:text-white`}>
                  {stats.settlements.pending.count} queue items
                </div>
                <div className="mt-1 font-mono font-extrabold text-sm text-amber-500">
                  ${stats.settlements.pending.amount.toFixed(2)}
                </div>
                <p className="text-[9.5px] text-slate-400 mt-1">Clearing scheduled limits.</p>
              </div>

              <div className={`p-4 rounded-2xl border ${
                darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400">Failed payouts</span>
                  <span className="p-1 px-1.5 text-[8px] bg-rose-500/10 text-rose-500 rounded font-bold font-mono">CRITICAL WARNING</span>
                </div>
                <div className={`text-md font-extrabold font-mono text-slate-800 dark:text-white`}>
                  {stats.settlements.failed.count} rejected batches
                </div>
                <div className="mt-1 font-mono font-extrabold text-sm text-rose-500">
                  ${stats.settlements.failed.amount.toFixed(2)}
                </div>
                <p className="text-[9.5px] text-slate-400 mt-1">Check Exception board details.</p>
              </div>

              <div className={`p-4 rounded-2xl border ${
                darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400">Core gateway status</span>
                  <span className="p-1 px-1.5 text-[8px] bg-sky-500/10 text-sky-400 rounded font-bold font-mono">OPERATIONAL</span>
                </div>
                <div className={`text-md font-extrabold font-mono text-slate-800 dark:text-white`}>
                  Apex Exchange Gateway
                </div>
                <div className="mt-1 font-mono font-extrabold text-sm text-indigo-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Ping is normal
                </div>
                <p className="text-[9.5px] text-slate-400 mt-1">Reconciliation: <b className="text-white">{stats.settlements.reconciliationRate}%</b></p>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick interactive checklist: Manual reversals desk helper */}
            <div className={`p-4 rounded-2xl border ${
              darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-200'
            }`}>
              <div className="border-b border-slate-100 dark:border-slate-850 pb-2.5 mb-3">
                <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400">Ledger reverse dispatch desk</span>
                <h4 className={`text-sm font-extrabold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Initiate Manual Refund/Reversal File</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Select from active completed postings to schedule legal balancing voids.</p>
              </div>

              <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                {transactions.filter(t => t.status === 'COMPLETED').slice(0, 10).map(tx => (
                  <div 
                    key={tx.id}
                    onClick={() => {
                      setSelectedTxForReversal(tx);
                      setProposeSuccessMsg(null);
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                      selectedTxForReversal?.id === tx.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : darkMode ? 'bg-slate-900/50 border-slate-850 hover:bg-slate-850' : 'bg-slate-50 border-slate-150 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-mono text-[9px] text-slate-400 uppercase font-extrabold block">#{tx.id} • {tx.senderName || 'Merchant'}</span>
                      <p className={`font-semibold text-[11px] ${darkMode ? 'text-white' : 'text-slate-700'}`}>{tx.category} via {tx.channel || 'WEB'}</p>
                    </div>
                    <div className="text-right">
                      <b className="font-mono text-xs block text-slate-600 dark:text-slate-200">${tx.amount.toFixed(0)}</b>
                      <span className="text-[9.5px] text-indigo-400 font-bold font-sans">Propose Reverse</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick proposal setup */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
              darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-200 shadow-3xs'
            }`}>
              {selectedTxForReversal ? (
                <form onSubmit={handleProposeReversal} className="space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-850 pb-2.5">
                    <span className="text-[9px] uppercase font-mono font-bold text-amber-500 block">PROPOSAL PREPARATION</span>
                    <h4 className={`text-sm font-sans font-extrabold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      Reverse posting #{selectedTxForReversal.id}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Value: <b>${selectedTxForReversal.amount.toFixed(2)}</b>. Preserving original record.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-400 font-mono text-[9px] uppercase font-bold block">Auditor explanation & reason code (Mandatory)</label>
                    <textarea
                      required
                      value={reversalReasonInput}
                      onChange={(e) => setReversalReasonInput(e.target.value)}
                      placeholder="KYC mismatch, double charge warning path, customer dispute, account hack override code..."
                      rows={4}
                      className={`w-full p-2.5 rounded-xl border focus:outline-none resize-none leading-relaxed ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    ></textarea>
                  </div>

                  {proposeErrorMsg && (
                    <p className="p-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-bold block">{proposeErrorMsg}</p>
                  )}

                  <div className="flex justify-between items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTxForReversal(null)}
                      className={`px-3 py-2 rounded-lg border font-bold ${
                        darkMode ? 'border-slate-850 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Clear
                    </button>

                    <button
                      type="submit"
                      disabled={submittingProposal}
                      className="px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 font-bold font-sans flex items-center gap-1 cursor-pointer transition-all"
                    >
                      {submittingProposal ? 'Proposing...' : 'Submit Reversal Proposal'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-10 flex flex-col items-center justify-center my-auto">
                  <DollarSign className="h-10 w-10 text-slate-400 mb-3 animate-pulse" />
                  <h5 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Reversal Dispatch Desk</h5>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-normal">
                    Click any completed transaction in left ledger list to open reversal proposals. Original transaction logs will remain untouched; reversal ledger entries will be posted once approved.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* SUB-VIEW 2: RECONCILIATION MATRIC VIEW */}
      {activeSubTab === 'reconciliation' && reconciliation && (
        <div className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-205 shadow-3xs'}`}>
              <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400 block">Internal Ledger Total</span>
              <div className={`text-md font-extrabold font-mono mt-1 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                ${reconciliation.internalTotal.toFixed(2)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Matched sum of journals with gateway refs.</p>
            </div>

            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-205 shadow-3xs'}`}>
              <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400 block">Gateway Settlement total</span>
              <div className={`text-md font-extrabold font-mono mt-1 ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}>
                ${reconciliation.gatewayTotal.toFixed(2)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Combined sum of mock clearings file.</p>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              darkMode ? 'bg-[#0f172a] border-indigo-950/40' : 'bg-indigo-50/40 border-indigo-100 shadow-3xs'
            }`}>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-indigo-400 block">Clearance discrepancy</span>
                <div className={`text-md font-extrabold font-mono mt-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  ${Math.abs(reconciliation.internalTotal - reconciliation.gatewayTotal).toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Tolerance limit check: $0.00.</p>
              </div>

              <div>
                <button
                  onClick={handleTriggerReconcile}
                  className="p-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold font-sans text-white text-[10.5px] cursor-pointer transition-all flex items-center gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" /> Run Audit Loop
                </button>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${
            darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-200 shadow-3xs'
          }`}>
            <div className="p-3 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <h4 className={`font-sans font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-800'}`}>Audit Compare Matching Rows</h4>
              <span className="font-mono text-[9px] text-slate-400">Total Items: {reconciliation.items.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b font-mono text-[9.5px] uppercase tracking-wider ${
                    darkMode ? 'bg-slate-900/60 border-slate-850 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <th className="p-3">Reference / Index</th>
                    <th className="p-3">Internal ID</th>
                    <th className="p-3 text-right font-mono">Internal balance</th>
                    <th className="p-3 text-right font-mono">Gateway balance</th>
                    <th className="p-3">Comparison Verdict</th>
                    <th className="p-3 text-right">Action Desk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-mono">
                  {reconciliation.items.map((it: any, idx: number) => (
                    <tr key={idx} className={darkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'}>
                      <td className="p-3 font-bold truncate max-w-[120px]" title={it.gatewayRef}>
                        {it.gatewayRef}
                      </td>
                      <td className="p-3">
                        {it.transactionId ? (
                          <span className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded text-[10px]">
                            #{it.transactionId}
                          </span>
                        ) : '--'}
                      </td>
                      <td className="p-3 text-right font-extrabold text-slate-600 dark:text-slate-300">
                        {it.internalAmount !== null ? `$${it.internalAmount.toFixed(2)}` : '--'}
                      </td>
                      <td className="p-3 text-right font-extrabold text-slate-600 dark:text-slate-300">
                        ${it.gatewayAmount.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9.5px] ${
                          it.comparisonVerdict === 'MATCHED'
                            ? 'bg-emerald-500/10 text-emerald-550 border border-emerald-500/20'
                            : it.comparisonVerdict === 'MISMATCHED_AMOUNT'
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {it.comparisonVerdict}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {it.comparisonVerdict !== 'MATCHED' ? (
                          <button
                            onClick={() => {
                              setActiveSubTab('exceptions');
                              setProposeSuccessMsg(null);
                            }}
                            className="text-[10px] text-indigo-450 hover:underline cursor-pointer font-bold font-sans"
                          >
                            Investigate ➔
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-500 font-sans">✓ Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUB-VIEW 3: COMPREHENSIVE EXCEPTION REPORT */}
      {activeSubTab === 'exceptions' && (
        <div className="space-y-6">
          <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Internal Corporate ledger exceptions docket</h4>
            <p className="text-[10.5px] text-slate-400 mt-1 max-w-sm">
              Any mismatched transactions, failures, reverse entries or manually adjusted items are automatically flags onto this chronometer log.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {exceptions.length === 0 ? (
              <p className="p-12 text-center text-slate-400 font-mono">No exceptions flagged in current database checkpoint.</p>
            ) : (
              exceptions.map((ex) => (
                <div 
                  key={ex.id}
                  className={`p-3.5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5 transition-all ${
                    darkMode ? 'bg-slate-900/50 border-slate-850 hover:bg-slate-850' : 'bg-white border-slate-200 hover:border-indigo-200 shadow-3xs'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] border ${
                        ex.severity === 'HIGH' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                        ex.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        'bg-sky-500/10 text-sky-400 border-sky-500/20'
                      }`}>
                        {ex.severity} RISK
                      </span>

                      <span className="font-mono text-indigo-400 font-extrabold text-[10px]">
                        ID: {ex.id}
                      </span>
                    </div>

                    <h5 className={`font-sans font-extrabold text-xs mt-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      {ex.type}
                    </h5>

                    <p className={`text-[10px] pr-2 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {ex.details}
                    </p>

                    <div className="text-[9.5px] text-slate-400 font-mono">
                      Operator / Target: <b>{ex.user}</b> • Reference Reference: #{ex.reference}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-black block text-slate-600 dark:text-slate-200">
                      ${ex.amount.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-mono">{new Date(ex.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: REVERSAL AND MANUAL ADJUSTS PROPOSAL & APPROVAL STREAM */}
      {activeSubTab === 'adjustments' && (
        <div className="space-y-6">

          <div className="flex justify-between items-center">
            <h4 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Manual adjustments control panel</h4>
            <button
              onClick={() => {
                setDirectProposeOpen(true);
                setProposeSuccessMsg(null);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold font-sans text-white text-[10.5px] cursor-pointer"
            >
              Propose Manual Adjustment
            </button>
          </div>

          {/* Form modal or expand for propose manual adjustments offline */}
          {directProposeOpen && (
            <form onSubmit={handleProposeDirect} className={`p-4 rounded-2xl border space-y-4 ${
              darkMode ? 'bg-slate-900 border-slate-850' : 'bg-slate-50 border-slate-200 shadow-3xs'
            }`}>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-sans font-extrabold text-xs">Prepare ledger proposal</span>
                <button type="button" onClick={() => setDirectProposeOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold mb-1">Adjustment Type</label>
                  <select
                    value={directType}
                    onChange={(e: any) => setDirectType(e.target.value)}
                    className={`w-full p-2 rounded-lg border font-bold ${
                      darkMode ? 'bg-slate-950 border-slate-850 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="FEE_ADJUSTMENT">FEE_ADJUSTMENT (Waive fee)</option>
                    <option value="MANUAL_DEBIT">MANUAL_DEBIT (Subtract cash)</option>
                    <option value="MANUAL_CREDIT">MANUAL_CREDIT (Direct seed)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold mb-1">Adjustment Amount ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={directAmount}
                    onChange={(e) => setDirectAmount(e.target.value)}
                    className={`w-full p-2 rounded-lg border font-bold ${
                      darkMode ? 'bg-slate-950 border-slate-850 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                    placeholder="e.g. 50.00"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Auditor explanation notes & justification checklist</label>
                <textarea
                  required
                  rows={2}
                  value={directNotes}
                  onChange={(e) => setDirectNotes(e.target.value)}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode ? 'bg-slate-950 border-slate-850 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                  placeholder="Compliance instruction reference or double transfer reconciliation correction..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setDirectProposeOpen(false)}
                  className="px-3 py-1.5 rounded-lg border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 font-sans font-bold text-white"
                >
                  Propose Adjustment
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 gap-4">
            {adjustments.length === 0 ? (
              <p className="p-12 text-center text-slate-400 font-mono">No financial adjustments registered in archive queue.</p>
            ) : (
              adjustments.map((adj) => (
                <div 
                  key={adj.id}
                  className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                    darkMode ? 'bg-slate-900/50 border-slate-850' : 'bg-white border-slate-200 shadow-3xs'
                  }`}
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] border ${
                        adj.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-550 border-emerald-500/20' :
                        adj.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-505 border-rose-505/20' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        STATE: {adj.status}
                      </span>

                      <span className="font-mono text-indigo-400 font-extrabold text-[9px] uppercase">
                        Ref: {adj.id}
                      </span>

                      {adj.transactionId && (
                        <span className="font-mono text-slate-400 text-[9px] font-semibold bg-slate-500/10 px-1.5 py-0.5 rounded">
                          Target TX: #{adj.transactionId}
                        </span>
                      )}
                    </div>

                    <h5 className={`font-sans font-bold text-xs mt-1 uppercase ${darkMode ? 'text-white' : 'text-slate-850'}`}>
                      {adj.type} ADJUSTMENT
                    </h5>

                    <p className={`text-[11px] pr-2 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {adj.notes}
                    </p>

                    <div className="text-[9.5px] text-slate-400 pt-1 flex gap-2 flex-wrap font-mono">
                      <span>Proposer: <b>{adj.proposedBy}</b></span>
                      <span>• Timestamp: {new Date(adj.timestamp).toLocaleTimeString()}</span>
                      {adj.approvedBy && (
                        <span className="text-emerald-500 font-extrabold">Validated By: {adj.approvedBy}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end justify-between min-h-[70px]">
                    <div>
                      <span className="font-mono font-bold text-sm block dark:text-white">
                        ${adj.amount.toFixed(2)}
                      </span>
                    </div>

                    {adj.status === 'PENDING_APPROVAL' && (
                      <div className="flex gap-1.5 pt-2">
                        <button
                          onClick={() => handleResolveAdjustment(adj.id, 'REJECT')}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-550 text-white font-sans font-bold text-[10px] cursor-pointer flex items-center gap-1.5 transition-all shadow-3xs"
                        >
                          <X className="h-3 w-3" /> Reject
                        </button>
                        
                        <button
                          onClick={() => handleResolveAdjustment(adj.id, 'APPROVE')}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-550 text-white font-sans font-bold text-[10px] cursor-pointer flex items-center gap-1.5 transition-all shadow-3xs"
                        >
                          <Check className="h-3 w-3" /> Approve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
export default FinanceConsole;
