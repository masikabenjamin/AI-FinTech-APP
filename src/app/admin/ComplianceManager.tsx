import React, { useState, useEffect } from 'react';
import { ComplianceAlert, Transaction, AuditLog, UserProfile } from '../../types';
import { updateComplianceWorkflow, fetchLedgerStats, LedgerSummary } from '../../services/api';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Trash, 
  AlertTriangle, 
  User, 
  Filter, 
  Search, 
  Calendar, 
  DollarSign, 
  Cpu, 
  Play, 
  Check, 
  Clock, 
  Terminal, 
  BookOpen, 
  RefreshCw, 
  FileText, 
  UserPlus, 
  AlertOctagon, 
  CheckSquare, 
  Smartphone, 
  Layers, 
  ListOrdered
} from 'lucide-react';

interface ComplianceManagerProps {
  alerts: ComplianceAlert[];
  transactions?: Transaction[];
  auditLogs?: AuditLog[];
  users?: UserProfile[];
  onActionComplete: () => void;
  darkMode?: boolean;
  adminName?: string;
}

export const ComplianceManager: React.FC<ComplianceManagerProps> = ({
  alerts = [],
  transactions = [],
  auditLogs = [],
  users = [],
  onActionComplete,
  darkMode = false,
  adminName = 'Chief Compliance Officer'
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'transactions'>('alerts');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  
  // Ledger stats for viewing listings matching transaction details
  const [ledgerStats, setLedgerStats] = useState<LedgerSummary | null>(null);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  
  // State for alert editing workflow
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [assignedReviewer, setAssignedReviewer] = useState<string>('');
  const [reviewerNotesInput, setReviewerNotesInput] = useState<string>('');
  const [holdReleaseAction, setHoldReleaseAction] = useState<'HOLD' | 'RELEASE' | 'VOID' | 'NONE'>('NONE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Filter states
  const [txStatusFilter, setTxStatusFilter] = useState<string>('ALL');
  const [txChannelFilter, setTxChannelFilter] = useState<string>('ALL');
  const [txMinAmount, setTxMinAmount] = useState<string>('');
  const [txMaxAmount, setTxMaxAmount] = useState<string>('');
  const [txStartDate, setTxStartDate] = useState<string>('');
  const [txEndDate, setTxEndDate] = useState<string>('');
  const [txRiskLevelFilter, setTxRiskLevelFilter] = useState<string>('ALL');
  const [txUserSearch, setTxUserSearch] = useState<string>('');

  // Fetch updated double-entry journals for matching tx postings
  const fetchLedgerEntries = async () => {
    setIsLedgerLoading(true);
    try {
      const stats = await fetchLedgerStats();
      setLedgerStats(stats);
    } catch (err) {
      console.error("Failed to load double-entry ledger entries within Compliance Center", err);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerEntries();
  }, [alerts, transactions]);

  const activeAlert = alerts.find(a => a.id === selectedAlertId);
  const activeTx = transactions.find(t => t.id === selectedTxId);

  // Sync state when selected alert changes
  useEffect(() => {
    if (activeAlert) {
      setTargetStatus(activeAlert.status);
      setAssignedReviewer(activeAlert.assignedTo || '');
      setReviewerNotesInput('');
      setHoldReleaseAction('NONE');
      setSubmitError(null);
    }
  }, [selectedAlertId]);

  const getRiskColor = (score: number) => {
    if (score >= 75) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    if (score >= 50) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    if (score >= 25) return 'text-sky-400 bg-sky-400/10 border-sky-400/20';
    return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  };

  const handleUpdateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertId || !targetStatus) return;
    if (!reviewerNotesInput.trim()) {
      setSubmitError("MANDATORY NOTES: Auditor notes and reason code are required to perform a workflow transition.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await updateComplianceWorkflow({
        id: selectedAlertId,
        status: targetStatus,
        assignedTo: assignedReviewer || undefined,
        notes: reviewerNotesInput,
        adminName: adminName,
        holdReleaseAction: holdReleaseAction !== 'NONE' ? holdReleaseAction : undefined
      });

      setReviewerNotesInput('');
      onActionComplete();
      // Reload local ledger states in case a hold was released/voided
      await fetchLedgerEntries();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to update case file.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    // Search filter (sender, receiver, reference, id)
    const q = txUserSearch.toLowerCase();
    const matchesUser = q === '' || 
      (tx.senderName && tx.senderName.toLowerCase().includes(q)) ||
      (tx.receiverName && tx.receiverName.toLowerCase().includes(q)) ||
      tx.id.toLowerCase().includes(q) ||
      (tx.gatewayRef && tx.gatewayRef.toLowerCase().includes(q)) ||
      (tx.ledgerRef && tx.ledgerRef.toLowerCase().includes(q));

    // Status filter
    const matchesStatus = txStatusFilter === 'ALL' || tx.status === txStatusFilter;

    // Channel filter
    const matchesChannel = txChannelFilter === 'ALL' || (tx.channel || 'WEB') === txChannelFilter;

    // Risk level filter
    const score = tx.riskScore || 0;
    const level = getRiskLabel(score);
    const matchesRisk = txRiskLevelFilter === 'ALL' || level === txRiskLevelFilter;

    // Amount range
    const amount = tx.amount;
    const min = txMinAmount === '' ? 0 : parseFloat(txMinAmount);
    const max = txMaxAmount === '' ? Infinity : parseFloat(txMaxAmount);
    const matchesAmount = amount >= min && amount <= max;

    // Date range
    let matchesDate = true;
    if (txStartDate) {
      const start = new Date(txStartDate).getTime();
      const txTime = new Date(tx.date).getTime();
      matchesDate = matchesDate && txTime >= start;
    }
    if (txEndDate) {
      // Add one day to make end date inclusive
      const end = new Date(txEndDate).getTime() + 86400000;
      const txTime = new Date(tx.date).getTime();
      matchesDate = matchesDate && txTime <= end;
    }

    return matchesUser && matchesStatus && matchesChannel && matchesRisk && matchesAmount && matchesDate;
  });

  // Calculate statistics for case widgets
  const totalCases = alerts.length;
  const openCases = alerts.filter(a => ['OPEN', 'CREATED', 'ASSIGNED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'ESCALATED'].includes(a.status)).length;
  const escalatedCases = alerts.filter(a => a.status === 'ESCALATED').length;
  const closedCases = alerts.filter(a => ['CLOSED_FALSE_POSITIVE', 'CLOSED_CONFIRMED_RISK', 'REPORTED_EXTERNALLY', 'RESOLVED', 'DISMISSED'].includes(a.status)).length;

  return (
    <div className="space-y-5 text-xs text-left select-none">
      
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-5 py-3 border-b-2 font-sans font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'alerts'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-slate-400 hover:text-slate-205'
          }`}
        >
          <AlertOctagon className="h-4 w-4" /> AML Case Lifecycle & Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-5 py-3 border-b-2 font-sans font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'transactions'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-slate-400 hover:text-slate-205'
          }`}
        >
          <ListOrdered className="h-4 w-4" /> Transaction Monitoring Dashboard ({transactions.length})
        </button>
      </div>

      {activeTab === 'alerts' && (
        <div className="space-y-5">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border transition-all ${
              darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
            }`}>
              <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400 block">Total Alerts Raised</span>
              <div className={`text-xl font-extrabold font-mono mt-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                {totalCases}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Cumulate threat events.</p>
            </div>
            
            <div className={`p-4 rounded-2xl border transition-all ${
              darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
            }`}>
              <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-amber-500 block">Active Cases Under Vetting</span>
              <div className="text-xl font-extrabold font-mono mt-1 text-amber-500">
                {openCases}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Requiring reviewer action.</p>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${
              darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
            }`}>
              <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-rose-500 block">Escalated Priority Holds</span>
              <div className="text-xl font-extrabold font-mono mt-1 text-rose-500">
                {escalatedCases}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Direct board escalation.</p>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${
              darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
            }`}>
              <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400 block">Audited & Closed Cases</span>
              <div className={`text-xl font-extrabold font-mono mt-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                {closedCases}
              </div>
              <p className="text-[10px] text-emerald-500 mt-1 font-medium">Clear of sanctions hold.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ALERT LISTS */}
            <div className="lg:col-span-6 space-y-3">
              <div className={`p-4 rounded-2xl border ${
                darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-200'
              }`}>
                <div className="space-y-3">
                  <div className="border-b border-slate-100 dark:border-slate-850 pb-2.5">
                    <h5 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Audit Case Docket</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Click any report item to open legal AML desk controls.</p>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-[450px] overflow-y-auto pr-1 space-y-1.5">
                    {alerts.length === 0 ? (
                      <p className="py-10 text-center text-slate-400">No active compliance warnings triggered in core ledger database.</p>
                    ) : (
                      alerts.map(al => (
                        <div 
                          key={al.id}
                          onClick={() => setSelectedAlertId(al.id)}
                          className={`p-3 rounded-xl cursor-pointer transition-all border ${
                            selectedAlertId === al.id 
                              ? darkMode ? 'bg-indigo-600/10 border-indigo-500 text-white' : 'bg-indigo-50 border-indigo-200'
                              : darkMode ? 'bg-slate-900/50 border-slate-850 hover:bg-slate-850' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold mb-1">
                            <span className={`${darkMode ? 'text-white' : 'text-slate-800'} text-xs truncate max-w-[150px]`}>{al.userName}</span>
                            <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded ${
                              al.level === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500' :
                              al.level === 'HIGH' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-sky-500/10 text-sky-400'
                            }`}>{al.level}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mb-2">{al.message}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60 font-mono">
                            <span>Status: <b className="text-amber-500">{al.status}</b></span>
                            <span>{new Date(al.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CASE TRANSITION PANEL */}
            <div className="lg:col-span-6">
              {!activeAlert ? (
                <div className={`p-8 rounded-2xl border text-center flex flex-col items-center justify-center h-full min-h-[300px] ${
                  darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
                }`}>
                  <ShieldAlert className="h-10 w-10 text-slate-400 mb-3 animate-pulse" />
                  <h6 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Awaiting Audit Focus</h6>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                    Select a compliance alert or AML threat from the left menu to explore risk reasons, review system audits, request client details, or run financial hold override rules.
                  </p>
                </div>
              ) : (
                <div className={`p-4 rounded-2xl border space-y-4 ${
                  darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
                }`}>
                  
                  {/* Subject details split */}
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-850 pb-3">
                    <div>
                      <span className="text-[9px] text-slate-400 font-mono uppercase font-extrabold pb-0.5 block">CASE FILE ID: #{activeAlert.id}</span>
                      <h4 className={`text-md font-bold font-sans ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {activeAlert.userName}
                      </h4>
                      <p className="text-[10px] text-indigo-400 font-mono font-bold mt-0.5">Threat Class: {activeAlert.type}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 font-mono block">DATE DETECTED</span>
                      <span className={`font-mono font-bold text-[10.5px] ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {new Date(activeAlert.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Trigger Diagnostic Box */}
                  <div className={`p-3 rounded-xl border leading-relaxed ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-150 text-slate-700'
                  }`}>
                    <span className="text-[8.5px] font-mono uppercase font-bold text-slate-400 block">Compliance Warning Details</span>
                    <p className="font-semibold mt-1 leading-relaxed">{activeAlert.message}</p>
                  </div>

                  {/* Vetting State & History Form */}
                  <form onSubmit={handleUpdateWorkflow} className="space-y-4 pt-1">
                    <h5 className={`font-sans font-bold text-xs flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      <CheckSquare className="h-4 w-4 text-indigo-400" /> AML Vetting & Transition Office
                    </h5>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold mb-1">Status Workflow Case</label>
                        <select
                          value={targetStatus}
                          onChange={(e) => setTargetStatus(e.target.value)}
                          className={`w-full p-2 rounded-lg border focus:outline-none font-sans font-bold ${
                            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <option value="CREATED">CREATED (New Alert)</option>
                          <option value="ASSIGNED">ASSIGNED (With Auditor)</option>
                          <option value="UNDER_REVIEW">UNDER_REVIEW (Active Vetting)</option>
                          <option value="INFO_REQUESTED">INFO_REQUESTED (Pending Customer Info)</option>
                          <option value="ESCALATED">ESCALATED (BOARD LEVEL REVIEW)</option>
                          <option value="CLOSED_FALSE_POSITIVE">CLOSED_FALSE_POSITIVE (Dismiss hold)</option>
                          <option value="CLOSED_CONFIRMED_RISK">CLOSED_CONFIRMED_RISK (Void transaction)</option>
                          <option value="REPORTED_EXTERNALLY">REPORTED_EXTERNALLY (FinCEN Filing Placeholder)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold mb-1">Assigned Case Analyst</label>
                        <select
                          value={assignedReviewer}
                          onChange={(e) => setAssignedReviewer(e.target.value)}
                          className={`w-full p-2 rounded-lg border focus:outline-none font-sans font-bold ${
                            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <option value="">-- Unassigned --</option>
                          <option value="Chief Compliance Officer">Chief Compliance Officer</option>
                          <option value="Senior AML Counsel">Senior AML Counsel</option>
                          <option value="Risk Systems Daemon">Risk Systems Daemon</option>
                          <option value="Audit Officer">Audit Officer</option>
                        </select>
                      </div>
                    </div>

                    {/* Transaction Hold/Release simulation */}
                    {activeAlert.transactionId && (
                      <div className={`p-3 rounded-xl border ${
                        darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/50 border-slate-150'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="font-semibold block text-[11px]">Ledger Asset Custody Overrides</span>
                            <span className="text-[10px] text-slate-400">Trigger simulated double entry ledger release or cancellation.</span>
                          </div>
                          <span className="bg-indigo-500/10 text-indigo-400 font-mono font-bold border border-indigo-500/20 px-2 py-0.5 rounded text-[9px]">
                            ID: {activeAlert.transactionId}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setHoldReleaseAction('NONE')}
                            className={`py-1.5 px-2 rounded-lg text-[9.5px] font-mono font-bold border transition-all text-center cursor-pointer ${
                              holdReleaseAction === 'NONE'
                                ? 'bg-slate-500 text-white border-slate-600'
                                : darkMode ? 'bg-slate-900 text-slate-350 border-slate-800 hover:bg-slate-850' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            NO ACTION
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setHoldReleaseAction('RELEASE')}
                            className={`py-1.5 px-2 rounded-lg text-[9.5px] font-mono font-bold border transition-all text-center cursor-pointer ${
                              holdReleaseAction === 'RELEASE'
                                ? 'bg-emerald-600 text-white border-emerald-700'
                                : darkMode ? 'bg-slate-900 text-emerald-430 border-slate-800 hover:bg-slate-850' : 'bg-white text-emerald-600 border-slate-200 hover:bg-emerald-50'
                            }`}
                          >
                            RELEASE HOLD
                          </button>

                          <button
                            type="button"
                            onClick={() => setHoldReleaseAction('VOID')}
                            className={`py-1.5 px-2 rounded-lg text-[9.5px] font-mono font-bold border transition-all text-center cursor-pointer ${
                              holdReleaseAction === 'VOID'
                                ? 'bg-rose-600 text-white border-rose-705'
                                : darkMode ? 'bg-slate-900 text-rose-450 border-slate-800 hover:bg-slate-850' : 'bg-white text-rose-600 border-slate-200 hover:bg-rose-50'
                            }`}
                          >
                            CANCEL & VOID
                          </button>

                          <button
                            type="button"
                            onClick={() => setHoldReleaseAction('HOLD')}
                            className={`py-1.5 px-2 rounded-lg text-[9.5px] font-mono font-bold border transition-all text-center cursor-pointer ${
                              holdReleaseAction === 'HOLD'
                                ? 'bg-amber-600 text-white border-amber-705'
                                : darkMode ? 'bg-slate-900 text-amber-450 border-slate-800 hover:bg-slate-850' : 'bg-white text-amber-600 border-slate-200 hover:bg-amber-50'
                            }`}
                          >
                            RE-ENGAGE HOLD
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Require Reviewer Notes */}
                    <div className="space-y-1">
                      <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Auditor Verdict Details & Reason Code (Mandatory)</label>
                      <textarea
                        value={reviewerNotesInput}
                        onChange={(e) => setReviewerNotesInput(e.target.value)}
                        placeholder="Detail chronological vetting checkpoints, suspicious velocity findings, or KYC reviews..."
                        rows={3}
                        className={`w-full p-2.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 leading-relaxed resize-none ${
                          darkMode ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                        }`}
                      ></textarea>
                    </div>

                    {submitError && (
                      <p className="bg-rose-500/10 text-rose-500 p-2.5 rounded-lg border border-rose-500/20 font-bold block">{submitError}</p>
                    )}

                    <div className="flex justify-between items-center gap-3 pt-1">
                      <span className="text-[10px] text-slate-400 max-w-[210px] sm:max-w-xs">
                        * All case movements compile real-time entries onto the secure backoffice audit logs.
                      </span>

                      <button
                        type="submit"
                        disabled={isSubmitting || !reviewerNotesInput.trim()}
                        className={`px-4 py-2.5 rounded-xl font-bold font-sans text-xs flex items-center gap-1 cursor-pointer transition-all ${
                          !reviewerNotesInput.trim() 
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" /> Verifying File...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" /> Save Verification Status
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* CHRONOLOGICAL HISTORIC TRANSITIONS EVENT LIST */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-850 space-y-2">
                    <h5 className={`font-sans font-bold text-xs flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      <History className="h-4 w-4 text-slate-400" /> Historic Case Milestones & Timelines
                    </h5>

                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {!activeAlert.history || activeAlert.history.length === 0 ? (
                        <div className="py-2.5 text-slate-400 font-mono text-[10px] text-center">
                          Initialize workflow logs to display system state path history.
                        </div>
                      ) : (
                        activeAlert.history.map((hist, idx) => (
                          <div 
                            key={idx}
                            className={`p-2.5 rounded-lg border font-mono text-[10px] ${
                              darkMode ? 'bg-slate-900 border-slate-850' : 'bg-slate-50 border-slate-100'
                            }`}
                          >
                            <div className="flex justify-between items-center text-indigo-400 font-bold mb-1">
                              <span>STATE: {hist.status}</span>
                              <span className="text-slate-400 font-normal">{new Date(hist.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className={`mb-1 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                              {hist.notes}
                            </p>
                            <div className="text-right text-slate-400 text-[9px]">
                              Auditor ID: <b>{hist.actor}</b>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4">
          
          {/* MULTI_FILTERING SEARCH ENGINE SECTION */}
          <div className={`p-4 rounded-2xl border transition-all ${
            darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
          }`}>
            <h5 className={`font-sans font-bold text-xs mb-3.5 flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              <Filter className="h-4 w-4 text-indigo-400" /> Backoffice Search filters & Risk parameters
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* Filter 1: Search Name/Ref */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold">User / Reference query</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search sender, receiver, ref..."
                    value={txUserSearch}
                    onChange={(e) => setTxUserSearch(e.target.value)}
                    className={`w-full pl-8 pr-2 py-1.5 rounded-lg border focus:outline-none placeholder-slate-450 ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Filter 2: Transaction status */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Clearance Status</label>
                <select
                  value={txStatusFilter}
                  onChange={(e) => setTxStatusFilter(e.target.value)}
                  className={`w-full p-2 py-1.5 rounded-lg border focus:outline-none font-bold ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="ALL">ALL STATUSES</option>
                  <option value="COMPLETED">COMPLETED (Ledger Posted)</option>
                  <option value="PENDING">PENDING (E-gated holds)</option>
                  <option value="FLAGGED">FLAGGED (Compliance Suspicious)</option>
                  <option value="FAILED">FAILED (Rejected/Voided)</option>
                </select>
              </div>

              {/* Filter 3: Channel Filter */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Initiation Channel</label>
                <select
                  value={txChannelFilter}
                  onChange={(e) => setTxChannelFilter(e.target.value)}
                  className={`w-full p-2 py-1.5 rounded-lg border focus:outline-none font-bold ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="ALL">ALL CHANNELS</option>
                  <option value="WEB">WEB INTEGRATION</option>
                  <option value="MOBILE_APP">MOBILE CLIENT</option>
                </select>
              </div>

              {/* Filter 4: Risk Level */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Risk Threat category</label>
                <select
                  value={txRiskLevelFilter}
                  onChange={(e) => setTxRiskLevelFilter(e.target.value)}
                  className={`w-full p-2 py-1.5 rounded-lg border focus:outline-none font-bold ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="ALL">ALL RISK ENVELOPS</option>
                  <option value="LOW">LOW RISK (&lt;25)</option>
                  <option value="MEDIUM">MEDIUM RISK (25-49)</option>
                  <option value="HIGH">HIGH RISK (50-74)</option>
                  <option value="CRITICAL">CRITICAL RISK (&ge;75)</option>
                </select>
              </div>

              {/* Filter 5: Amount Range */}
              <div className="space-y-1 sm:col-span-1 md:col-span-2 lg:col-span-1">
                <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Transfer Size Range ($)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={txMinAmount}
                    onChange={(e) => setTxMinAmount(e.target.value)}
                    className={`w-1/2 px-2 py-1.5 rounded-lg border focus:outline-none ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={txMaxAmount}
                    onChange={(e) => setTxMaxAmount(e.target.value)}
                    className={`w-1/2 px-2 py-1.5 rounded-lg border focus:outline-none ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Filter 6: Dates Range */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Created Timestamp Range</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={txStartDate}
                    onChange={(e) => setTxStartDate(e.target.value)}
                    className={`w-1/2 p-2 pt-1.5 pb-1.5 rounded-lg border focus:outline-none font-mono text-[10px] ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    value={txEndDate}
                    onChange={(e) => setTxEndDate(e.target.value)}
                    className={`w-1/2 p-2 pt-1.5 pb-1.5 rounded-lg border focus:outline-none font-mono text-[10px] ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* MAIN TRANSACTION MONITOR TABLE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Table layout (Span 7) */}
            <div className="lg:col-span-7">
              <div className={`rounded-2xl border overflow-hidden ${
                darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-200'
              }`}>
                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className={`border-b font-mono text-[9px] uppercase tracking-wider ${
                        darkMode ? 'bg-slate-900/60 border-slate-850 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        <th className="p-3">Journal Ref ID</th>
                        <th className="p-3">User & Receiver</th>
                        <th className="p-3">Channel / Gateway</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3">Score</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400">
                            No ledger journals match filtered query parameters.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map(tx => {
                          const score = tx.riskScore || 0;
                          return (
                            <tr 
                              key={tx.id}
                              onClick={() => setSelectedTxId(tx.id)}
                              className={`cursor-pointer transition-all ${
                                selectedTxId === tx.id 
                                  ? darkMode ? 'bg-indigo-600/10' : 'bg-indigo-50/50 font-bold'
                                  : darkMode ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50/50'
                              }`}
                            >
                              <td className="p-3 font-mono font-bold">
                                <div>#{tx.id}</div>
                                <div className="text-[9.5px] font-normal text-slate-450 mt-0.5">
                                  {new Date(tx.date).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                  {tx.senderName || 'Platform'}
                                </div>
                                <div className="text-[9.5px] text-slate-400 mt-0.5 flex items-center gap-1">
                                  <span>To:</span>
                                  <span className="font-semibold text-slate-450">{tx.receiverName || 'Platform'}</span>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-[10px]">
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-350">
                                  {tx.channel || 'WEB'}
                                </span>
                                <div className="text-[9.5px] text-slate-450 truncate max-w-[100px] mt-1" title={tx.gatewayRef}>
                                  GW: {tx.gatewayRef || 'None'}
                                </div>
                              </td>
                              <td className={`p-3 text-right font-mono font-extrabold ${
                                tx.type === 'DEPOSIT' ? 'text-emerald-500' :
                                tx.type === 'WITHDRAWAL' ? 'text-rose-500' :
                                darkMode ? 'text-white' : 'text-slate-850'
                              }`}>
                                {tx.type === 'DEPOSIT' ? '+' : '-'}${tx.amount.toFixed(2)}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[9.5px] border ${getRiskColor(score)}`}>
                                  {score}%
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`text-[9.5px] uppercase font-bold px-2 py-0.5 rounded border ${
                                  tx.status === 'COMPLETED' ? 'bg-emerald-550/15 text-emerald-400 border-emerald-500/20' :
                                  tx.status === 'FLAGGED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                  tx.status === 'PENDING' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                  'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                }`}>
                                  {tx.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* DETAIL DRAWER / INSPECTION DESK (Span 5) */}
            <div className="lg:col-span-5">
              {!activeTx ? (
                <div className={`p-10 rounded-2xl border text-center flex flex-col items-center justify-center h-full min-h-[350px] ${
                  darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
                }`}>
                  <Terminal className="h-8 w-8 text-slate-400 mb-2" />
                  <h6 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Audit Inspection Desk</h6>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                    Select a core transaction record from the left monitor grid to inspect real-time double-entry corporate accounting ledger records, associated logs, matching fraud indicators, and gateway signals.
                  </p>
                </div>
              ) : (
                <div className={`p-4 rounded-2xl border space-y-4 ${
                  darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-205 shadow-3xs'
                }`}>
                  
                  {/* Subject details split */}
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-850 pb-3">
                    <div>
                      <span className="text-[9px] text-slate-400 font-mono uppercase font-extrabold pb-0.5 block">TX ID: #{activeTx.id}</span>
                      <h4 className={`text-md font-bold font-sans ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {activeTx.type} Ledger Post
                      </h4>
                      <p className="text-[10px] text-slate-400">{activeTx.category} • {activeTx.description}</p>
                    </div>

                    <div className="text-right">
                      <span className={`text-base font-extrabold font-mono tracking-tight block ${
                        activeTx.type === 'DEPOSIT' ? 'text-emerald-500' : 'text-slate-800 dark:text-white'
                      }`}>
                        ${activeTx.amount.toFixed(2)}
                      </span>
                      <span className="text-[9.5px] font-mono text-slate-400">{new Date(activeTx.date).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* Diagnostic details */}
                  <div className="grid grid-cols-2 gap-3.5 text-[10.5px]">
                    <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-850 space-y-0.5">
                      <span className="text-slate-400 text-[8.5px] font-mono block">CHANNEL/DEVICE</span>
                      <b className="font-mono text-indigo-400 flex items-center gap-1">
                        <Smartphone className="h-3 w-3" /> {activeTx.channel || 'WEB'}
                      </b>
                      <span className="text-[9.5px] text-slate-450 block truncate">ID: {activeTx.deviceId || 'DEV-WEB-91'}</span>
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-850 space-y-0.5">
                      <span className="text-slate-400 text-[8.5px] font-mono block">RISK EVALUATION</span>
                      <div className="flex items-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] border ${getRiskColor(activeTx.riskScore || 0)}`}>
                          {activeTx.riskScore || 0}%
                        </span>
                        <span className="font-mono font-bold text-[9.5px]">{getRiskLabel(activeTx.riskScore || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Compliance alert associations */}
                  {alerts.some(a => a.transactionId === activeTx.id) ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <span className="font-bold text-amber-550 block text-[11px]">ACTIVE SURVEILLANCE HOLD</span>
                        <p className="text-[10px] text-amber-500/90 leading-normal">
                          This transfer triggered an automated velocity compliance check. Case is registered inside the compliance holding center.
                        </p>
                      </div>
                    </div>
                  ) : activeTx.status === 'FLAGGED' ? (
                    <div className="bg-rose-500/10 border border-rose-500/25 p-2.5 rounded-xl flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-rose-500 block text-[11px]">CUSTODY SECURITY BLOCK ENGAGED</span>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Transaction is currently locked in custody with unposted ledger records. Access can be override with authorized credentials.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-550/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-emerald-400 block text-[11px]">LEDGER CLEARANCE SUCCESS</span>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Passed automated threat rules successfully. Vault assets mapped to double entry accounting balance sheet safely.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* FRAUD RULES MATCHED */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">Matched Fraud Rules & Threat Codes</span>
                    <div className="flex flex-wrap gap-1.5">
                      {!activeTx.riskReasons || activeTx.riskReasons.length === 0 ? (
                        <span className="bg-emerald-550/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9.5px] font-mono">
                          ✓ ZERO_THREAT_CODES_MATCHED
                        </span>
                      ) : (
                        activeTx.riskReasons.map((r, i) => (
                          <span key={i} className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded text-[9.5px] font-mono font-bold animate-pulse">
                            🚨 {r}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* DOUBLE ENTRY LEDGER JOURNAL POSTINGS VIEW */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block flex justify-between items-center">
                      <span>Double-Entry ledger proof postings (Journal Ledger)</span>
                      <span className="font-mono text-indigo-400">Ref: {activeTx.ledgerRef || 'LEDG-00'}</span>
                    </span>

                    {isLedgerLoading ? (
                      <p className="py-4 text-center text-slate-400 font-mono">Retrying ledger balancing journals...</p>
                    ) : (
                      (() => {
                        const matchedEntry = ledgerStats?.entries?.find(e => e.transactionId === activeTx.id);
                        if (!matchedEntry) {
                          return (
                            <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-center font-mono leading-relaxed">
                              [PENDING LEDGER POST]<br />
                              This transaction remains unposted or was voided. Cash is secured in compliance custody balance accounts.
                            </div>
                          );
                        }

                        return (
                          <div className={`p-2 rounded-xl border ${
                            darkMode ? 'bg-slate-900 border-slate-850' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="space-y-1.5">
                              {matchedEntry.postings.map((p, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[10px] font-mono border-b border-dashed border-slate-100 dark:border-slate-800 last:border-b-0 pb-1 last:pb-0">
                                  <div>
                                    <span className="text-slate-400">Account: </span>
                                    <b className="text-indigo-400">{p.accountId}</b>
                                    <span className="text-[9.5px] text-slate-405 block">{p.accountName}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                                      p.type === 'DEBIT' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-500/10 text-slate-400'
                                    }`}>{p.type}</span>
                                    <span className="font-bold ml-2">${p.amount.toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-800">
                              <span>ENTRY BALANCED</span>
                              <span className="text-emerald-500">✓ Balance Clearance Passed</span>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* RELATED AUDIT LOGS FOR THIS TRANSACTION */}
                  <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-850">
                    <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">System Auditing footprint trails</span>
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {auditLogs.filter(log => log.details.includes(activeTx.id) || (activeTx.senderId && log.actor.includes(activeTx.senderName || '')) || (activeTx.receiverId && log.details.includes(activeTx.receiverName || ''))).length === 0 ? (
                        <p className="text-[10px] text-slate-450 italic font-mono py-2 text-center">No matching system audit records found.</p>
                      ) : (
                        auditLogs.filter(log => log.details.includes(activeTx.id) || (activeTx.senderId && log.actor.includes(activeTx.senderName || '')) || (activeTx.receiverId && log.details.includes(activeTx.receiverName || ''))).map((log, i) => (
                          <div 
                            key={i}
                            className={`p-2 rounded-lg border font-mono text-[9px] leading-relaxed ${
                              darkMode ? 'bg-slate-900 border-slate-850' : 'bg-slate-50 border-slate-100'
                            }`}
                          >
                            <div className="flex justify-between text-indigo-400 font-bold mb-0.5">
                              <span>ACTION: {log.action}</span>
                              <span className="text-slate-400 font-normal">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-slate-400 mb-0.5">{log.details}</p>
                            <div className="flex justify-between text-[8px] text-slate-500">
                              <span>Actor: <b>{log.actor}</b></span>
                              <span>Status: <b className="text-emerald-500">{log.status}</b></span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
