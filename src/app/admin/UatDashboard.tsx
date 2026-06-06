import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RefreshCw, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Lock, 
  Activity, 
  FileText, 
  Plus, 
  Trash2, 
  UserCheck, 
  HelpCircle, 
  Clock, 
  X, 
  Flame, 
  Award, 
  Building, 
  Check, 
  Copy, 
  BookOpen, 
  FileCheck 
} from 'lucide-react';
import { UserProfile, Transaction, KYCCase, SupportTicket, AuditLog } from '../../types';
import { resetSeedData } from '../../services/api';

interface UatDashboardProps {
  users: UserProfile[];
  transactions: Transaction[];
  kycCases: KYCCase[];
  tickets: SupportTicket[];
  auditLogs: AuditLog[];
  onRefreshAll: () => void;
  darkMode?: boolean;
  activeUser: UserProfile;
  onLogout: () => void;
}

interface TestScenario {
  id: string;
  category: string;
  title: string;
  description: string;
  expectedResult: string;
  status: 'PENDING' | 'PASSED' | 'FAILED';
  notes?: string;
  tester?: string;
}

interface DefectItem {
  id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In-Review' | 'Fixed' | 'Closed';
  reportedBy: string;
  category: string;
  targetFixDate?: string;
  riskAcceptedByBusiness?: boolean;
}

interface SignoffSlot {
  owner: string;
  title: string;
  name: string;
  status: 'PENDING' | 'SIGNED_OFF' | 'REJECTED';
  dateSigned?: string;
  remarks?: string;
}

export const UatDashboard: React.FC<UatDashboardProps> = ({
  users,
  transactions,
  kycCases,
  tickets,
  auditLogs,
  onRefreshAll,
  darkMode = false,
  activeUser,
  onLogout
}) => {
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // 1. Defect State (Persisted in localStorage so changes are durable across reloads)
  const [defects, setDefects] = useState<DefectItem[]>(() => {
    const saved = localStorage.getItem('uat_defects');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      {
        id: 'DEF-101',
        title: 'MFA SMS Delay under peak throughput tests',
        description: 'Synthetic stress testing shows mock SMS carrier gateway experiences 2-3s delays. Risk category is acceptable for sandbox evaluation.',
        severity: 'Medium',
        status: 'Open',
        reportedBy: 'Compliance Analyst',
        category: 'Security Controls',
        targetFixDate: '2026-06-15',
        riskAcceptedByBusiness: true
      },
      {
        id: 'DEF-102',
        title: 'Customer card network transaction failure tracking',
        description: 'Failed debit triggers warning instead of immediate log during offline terminal state syncing.',
        severity: 'Low',
        status: 'Open',
        reportedBy: 'Support Agent Desk',
        category: 'Cards & Limits',
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('uat_defects', JSON.stringify(defects));
  }, [defects]);

  // 2. Scenario Checklist State
  const [scenarios, setScenarios] = useState<TestScenario[]>(() => {
    const saved = localStorage.getItem('uat_scenarios');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      {
        id: 'SC-01',
        category: 'Onboarding & KYC',
        title: 'Document Upload & Approval Check',
        description: 'Verify Amara Okafor (usr-3) uploads passport and is correctly queued as KYC PENDING. Test approval authority override options.',
        expectedResult: 'Status sets to APPROVED upon Super Admin action. Solvency limit expands to $50k core allowance.',
        status: 'PASSED',
        notes: 'Verified via KYC Review and settings policy toggle.',
        tester: 'Super Admin'
      },
      {
        id: 'SC-02',
        category: 'Add Money',
        title: 'Plaid Funding and ACH Verification',
        description: 'Test incoming ACH deposit simulations. Ensure the source bank registers correctly and the balances immediately update.',
        expectedResult: 'System ledger increments, audit log registers DEPOSIT transaction, state balances are updated.',
        status: 'PASSED',
        notes: 'Automatic validation through direct seed accounts.',
        tester: 'Finance Owner'
      },
      {
        id: 'SC-03',
        category: 'Transfers & Ledger',
        title: 'Domestic P2P Wire Simulation',
        description: 'Execute instant peer-to-peer wire from Sarah Jenkins to Carlos Ruiz. Check for compliance limits warnings on high values.',
        expectedResult: 'Symmetric dual double-entry debit of sender, credit of receiver. Balancing ledger checks show zero error residue.',
        status: 'PASSED',
        notes: 'Self-balancing tests past on transaction post.',
        tester: 'Technology Owner'
      },
      {
        id: 'SC-04',
        category: 'Budgeting & Alerts',
        title: 'Category Overdraft Realtime Alerts',
        description: 'Allocate restaurant budget cap and execute transaction pushing expenses beyond specified thresholds.',
        expectedResult: 'Web interface renders real-time budget overage notification badge. Transaction status remains APPROVED.',
        status: 'PASSED',
        notes: 'Works perfectly on client view charts.',
        tester: 'Business Owner'
      },
      {
        id: 'SC-05',
        category: 'Cards & Limits',
        title: 'Temporary Card Lockdown & Caps Override',
        description: 'Toggle lockdown active status on Carlos Ruiz debit card. Run fake payment simulation to verify block holds.',
        expectedResult: 'Gateway automatically rejects transaction with [GATEWAY_CARD_LOCKED] error code. Zero ledger change.',
        status: 'PASSED',
        notes: 'Card freeze and limits adjust verified.',
        tester: 'Support Owner'
      },
      {
        id: 'SC-06',
        category: 'Rewards Program',
        title: 'Cashback Calculations and Accruals',
        description: 'Verify card transactions accrue correct loyalty program points. Trigger redemptions matching active partner options.',
        expectedResult: 'Cashback points increment matches configured category multiplier (1x-3x). Redemption logged properly.',
        status: 'PASSED',
        notes: 'Sarah Jenkins rewards ledger is calculating correctly.',
        tester: 'Support Owner'
      },
      {
        id: 'SC-07',
        category: 'AI Assistant',
        title: 'Generative Financial Consulting Insights',
        description: 'Inquire with Gemini Advisor: Suggest an optimizer path for savings goal of $50k chen.m@techcorp.io profile.',
        expectedResult: 'Prompt responses generate precise, tailored tables with suggestions compiled from actual database history metrics.',
        status: 'PENDING',
        notes: 'Pending final visual verify on slow connections, but core LLM endpoint responds successfully.',
        tester: 'Technology Owner'
      },
      {
        id: 'SC-08',
        category: 'Admin Dashboard',
        title: 'Realtime Corporate Solvency Widgets',
        description: 'Assess admin panel telemetry metrics. Verify active users totals, current pending KYC cases, and system alerts counts align.',
        expectedResult: 'Counters exactly match live query lists counts inside memory. No ghost cache counts.',
        status: 'PASSED',
        notes: 'Interactive counters are fully synchronized.',
        tester: 'Super Admin'
      },
      {
        id: 'SC-09',
        category: 'Compliance Cases',
        title: 'Sanctions Blacklist & Holds Escalation',
        description: 'Synthesize heavy incoming transfer of $620k for high-risk user. Confirm compliance alert is triggered in compliance holds manager.',
        expectedResult: 'Alert details pop up under Compliance & Holds tab. Compliance Analylst can inspect, override hold, or approve/decline.',
        status: 'PASSED',
        notes: 'Compliance watchdogs triggered securely and holds are manageable.',
        tester: 'Compliance Owner'
      },
      {
        id: 'SC-10',
        category: 'Ledger Audit Integrity',
        title: 'Comprehensive Balance Sheet Recons',
        description: 'Validate standard ledger double-entry metrics. Compare system solvency reserves assets with sum of accounts user balances.',
        expectedResult: 'The total assets must balance with liabilities and capital. Solvency proof ledger matches green verified criteria.',
        status: 'PASSED',
        notes: 'Perfect parity verified in server ledger system.',
        tester: 'Finance Owner'
      },
      {
        id: 'SC-11',
        category: 'Disputes & Support',
        title: 'Support Ticket Assignment and AI Replies',
        description: 'Open a help ticket and write a resolution draft utilizing Gemini-driven smart templates to resolve disputes.',
        expectedResult: 'Gemini template auto-fills professional corporate letters addressing the client by name. Case updates to CLOSED.',
        status: 'PASSED',
        notes: 'Assistance suggestions saves minutes of manual writing.',
        tester: 'Support Owner'
      },
      {
        id: 'SC-12',
        category: 'Security & Auditing',
        title: 'Administrative Security Trails & Wipe Logs Prevention',
        description: 'Execute critical backoffice changes with non-admin operators. Check that immutable security log registers attempt in full.',
        expectedResult: 'Blocked events appear instantly in Security Audit trace logs with IP address and exact clearance exception context.',
        status: 'PASSED',
        notes: 'Secured audit record matches all legal audit requirements.',
        tester: 'Compliance Owner'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('uat_scenarios', JSON.stringify(scenarios));
  }, [scenarios]);

  // 3. Provider Simulator Status State
  const [providerStatuses, setProviderStatuses] = useState<Record<string, 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE'>>(() => {
    const saved = localStorage.getItem('uat_providers');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {
      kycProvider: 'OPERATIONAL',
      cardNetwork: 'OPERATIONAL',
      geminiProvider: 'OPERATIONAL',
      doubleEntryEngine: 'OPERATIONAL',
      smsGateway: 'OPERATIONAL',
      achProvider: 'OPERATIONAL'
    };
  });

  useEffect(() => {
    localStorage.setItem('uat_providers', JSON.stringify(providerStatuses));
  }, [providerStatuses]);

  // 4. UAT Signoff Table State
  const [signoffs, setSignoffs] = useState<SignoffSlot[]>(() => {
    const saved = localStorage.getItem('uat_signoffs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      { owner: 'Business Owner', title: 'Product & Ventures Manager', name: 'Victoria Vance', status: 'PENDING', remarks: '' },
      { owner: 'Compliance Owner', title: 'Chief Risk & AML Officer', name: 'Liam Vance', status: 'PENDING', remarks: '' },
      { owner: 'Finance Owner', title: 'VP Solvency & Capital Reserves', name: 'Devin Finch', status: 'PENDING', remarks: '' },
      { owner: 'Support Owner', title: 'Head of Retail Dispute Desk', name: 'Gail Vance', status: 'PENDING', remarks: '' },
      { owner: 'Technology Owner', title: 'Principal Software Architect', name: 'Ben Masika', status: 'PENDING', remarks: '' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('uat_signoffs', JSON.stringify(signoffs));
  }, [signoffs]);

  // 5. Dynamic Permission Matrix state for sandbox role selection
  const [selectedRoleForChecker, setSelectedRoleForChecker] = useState<string>('Super Admin');

  // New defect state values
  const [newDefectTitle, setNewDefectTitle] = useState('');
  const [newDefectDesc, setNewDefectDesc] = useState('');
  const [newDefectSeverity, setNewDefectSeverity] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('Medium');
  const [newDefectCategory, setNewDefectCategory] = useState('General System');

  // Trigger backend seed reset
  const handleDatabaseReset = async () => {
    if (!window.confirm('WARNING: If you proceed, the database will be cleared and the original seed records (including users, accounts, transactions, audit logs, and compliance alerts) will be completely restored. This is recommended to reset tests. Continue?')) {
      return;
    }
    setIsResetting(true);
    setSuccessBanner(null);
    setErrorBanner(null);
    try {
      const result = await resetSeedData();
      setSuccessBanner(result.message || 'The database has been fully restored to seed values.');
      onRefreshAll();
      // Reset checkboxes
      localStorage.removeItem('uat_defects');
      localStorage.removeItem('uat_scenarios');
      localStorage.removeItem('uat_providers');
      localStorage.removeItem('uat_signoffs');
      // trigger page reload state or local state reset
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setErrorBanner(err.message || 'Seed data restore failed.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleScenarioStatus = (id: string, nextStatus: 'PENDING' | 'PASSED' | 'FAILED') => {
    setScenarios(prev => prev.map(sc => {
      if (sc.id === id) {
        return {
          ...sc,
          status: nextStatus,
          tester: activeUser.name
        };
      }
      return sc;
    }));
  };

  const handleScenarioCommentsChange = (id: string, text: string) => {
    setScenarios(prev => prev.map(sc => {
      if (sc.id === id) {
        return { ...sc, notes: text };
      }
      return sc;
    }));
  };

  const handleAddDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDefectTitle.trim()) return;

    const newDef: DefectItem = {
      id: `DEF-${100 + defects.length + 1}`,
      title: newDefectTitle,
      description: newDefectDesc,
      severity: newDefectSeverity,
      status: 'Open',
      reportedBy: `${activeUser.name} (${activeUser.role})`,
      category: newDefectCategory,
      riskAcceptedByBusiness: false
    };

    setDefects(prev => [newDef, ...prev]);
    setNewDefectTitle('');
    setNewDefectDesc('');
    setSuccessBanner(`Logged defect ${newDef.id} in UAT issue queue.`);
  };

  const handleToggleDefectStatus = (id: string, nextStatus: 'Open' | 'In-Review' | 'Fixed' | 'Closed') => {
    setDefects(prev => prev.map(def => {
      if (def.id === id) {
        return { ...def, status: nextStatus };
      }
      return def;
    }));
  };

  const handleToggleRiskAccepted = (id: string, checked: boolean, rawTargetDate?: string) => {
    setDefects(prev => prev.map(def => {
      if (def.id === id) {
        return { 
          ...def, 
          riskAcceptedByBusiness: checked,
          targetFixDate: checked ? (rawTargetDate || def.targetFixDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0]) : undefined
        };
      }
      return def;
    }));
  };

  const handleUpdateDefectDate = (id: string, date: string) => {
    setDefects(prev => prev.map(def => {
      if (def.id === id) {
        return { ...def, targetFixDate: date };
      }
      return def;
    }));
  };

  const handleDeleteDefect = (id: string) => {
    setDefects(prev => prev.filter(def => def.id !== id));
  };

  const handleUpdateSignoff = (owner: string, status: 'PENDING' | 'SIGNED_OFF' | 'REJECTED', name: string, remarks: string) => {
    setSignoffs(prev => prev.map(so => {
      if (so.owner === owner) {
        return {
          ...so,
          status,
          name,
          remarks,
          dateSigned: status !== 'PENDING' ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return so;
    }));
  };

  const toggleProviderStatus = (key: string) => {
    setProviderStatuses(prev => {
      const curr = prev[key];
      const next: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE' = 
        curr === 'OPERATIONAL' ? 'DEGRADED' : curr === 'DEGRADED' ? 'OUTAGE' : 'OPERATIONAL';
      return { ...prev, [key]: next };
    });
  };

  // Calculate stats to drive the UAT gating
  const criticalDefectsCount = defects.filter(d => d.severity === 'Critical' && d.status !== 'Closed' && d.status !== 'Fixed').length;
  const highDefectsCount = defects.filter(d => d.severity === 'High' && d.status !== 'Closed' && d.status !== 'Fixed').length;
  const mediumDefectsUnaccepted = defects.filter(d => d.severity === 'Medium' && d.status !== 'Closed' && d.status !== 'Fixed' && !d.riskAcceptedByBusiness).length;
  const totalScenariosCount = scenarios.length;
  const passedScenariosCount = scenarios.filter(s => s.status === 'PASSED').length;
  const failedScenariosCount = scenarios.filter(s => s.status === 'FAILED').length;
  const pendingScenariosCount = scenarios.filter(s => s.status === 'PENDING').length;
  const completedSignoffs = signoffs.filter(s => s.status === 'SIGNED_OFF').length;

  // Signoff rule check
  const gateBlocksList: string[] = [];
  if (criticalDefectsCount > 0) {
    gateBlocksList.push(`${criticalDefectsCount} Active Critical severity defect(s) must be Fixed/Closed.`);
  }
  if (highDefectsCount > 0) {
    gateBlocksList.push(`${highDefectsCount} Active High severity defect(s) must be Fixed/Closed.`);
  }
  if (mediumDefectsUnaccepted > 0) {
    gateBlocksList.push(`${mediumDefectsUnaccepted} Active Medium severity defect(s) require Business Owner risk signoff and target fix date.`);
  }
  if (failedScenariosCount > 0) {
    gateBlocksList.push(`${failedScenariosCount} Test scenario(s) are currently marked as FAILED in execution list.`);
  }
  if (completedSignoffs < signoffs.length) {
    gateBlocksList.push(`${signoffs.length - completedSignoffs} required stakeholder stakeholder sign-off is pending.`);
  }

  const isGateCleared = gateBlocksList.length === 0;

  // Ledger self balancing check
  const calculateLedgerAudit = () => {
    // Collect stats from live user databases & transaction values
    const totalDeposited = transactions
      .filter(t => t.type === 'DEPOSIT' && t.status !== 'DECLINED')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawn = transactions
      .filter(t => t.type === 'WITHDRAWAL' && t.status !== 'DECLINED')
      .reduce((sum, t) => sum + t.amount, 0);

    const liveAssetSum = users
      .filter(u => u.role === 'customer')
      .reduce((sum, u) => sum + u.balance, 0);

    // Ledger Formula checks
    const solvencyReserveTarget = 6000000; // Base treasury cash limits in double entry system
    const systemResidualVariance = Math.abs(totalDeposited - totalWithdrawn - liveAssetSum);
    const hasPerfectParity = systemResidualVariance < 0.01;

    return {
      totalDeposited,
      totalWithdrawn,
      liveAssetSum,
      residual: systemResidualVariance,
      parity: hasPerfectParity,
      reserves: solvencyReserveTarget
    };
  };

  const ledgerResult = calculateLedgerAudit();

  const ROLE_POLICIES: Record<string, string[]> = {
    'Super Admin': ['Full Backoffice Control', 'Ledger Integrity Oversight', 'KYC Overrides', 'Wipe Permanent Audit Trails', 'Incident Action Holds'],
    'Compliance Analyst': ['View KYC files', 'Investigate Fraud Flag holds', 'Sanction matches analytics', 'Reject documents'],
    'Operations Officer': ['Approve standard KYC onboarding documents', 'Open support disputation tickets', 'Adjust customer flags'],
    'Finance Officer': ['Audit balance sheet ledgers', 'Execute system settlements', 'Verify manual client credits'],
    'Support Agent': ['Direct dispute queue reading', 'Gemini AI template replies generation', 'Ticket categorization'],
    'Risk Manager': ['Global watchlist monitoring', 'Override alerts holding parameters', 'Audit security event exceptions'],
    'Executive Viewer': ['Read-only workspace analysis across all departments']
  };

  // Seed credentials matrix lists to enable autofill & quick switches
  const seedUsersList = [
    { name: 'Ben Masika', email: 'admin.super@apex.com', pass: 'SuperAdmin123!', role: 'Super Admin', type: 'ADMIN' },
    { name: 'Liam Vance', email: 'compliance.analyst@apex.com', pass: 'Compliance123!', role: 'Compliance Analyst', type: 'ADMIN' },
    { name: 'Beatrice Cobb', email: 'ops.officer@apex.com', pass: 'Operations123!', role: 'Operations Officer', type: 'ADMIN' },
    { name: 'Devin Finch', email: 'finance.officer@apex.com', pass: 'Finance123!', role: 'Finance Officer', type: 'ADMIN' },
    { name: 'Gail Vance', email: 'support.agent@apex.com', pass: 'Support123!', role: 'Support Agent', type: 'ADMIN' },
    { name: 'Marcus Brody', email: 'risk.manager@apex.com', pass: 'Risk123!', role: 'Risk Manager', type: 'ADMIN' },
    { name: 'Victoria Vance', email: 'exec.viewer@apex.com', pass: 'Executive123!', role: 'Executive Viewer', type: 'ADMIN' },
    { name: 'Sarah Jenkins', email: 'sarah.j@enterprise.com', pass: 'Sarah123!', role: 'Customer', type: 'CUSTOMER' },
    { name: 'Michael Chen', email: 'chen.m@techcorp.io', pass: 'Michael123!', role: 'Customer', type: 'CUSTOMER' },
    { name: 'Elena Rostova', email: 'elena.r@finadvise.eu', pass: 'Elena123!', role: 'Customer', type: 'CUSTOMER' }
  ];

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSuccessBanner(`${label} copied to clipboard!`);
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  return (
    <div className={`space-y-6 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* HEADER BANNER */}
      <div className={`p-6 rounded-3xl border ${
        darkMode ? 'bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-950 border-indigo-900/50' : 'bg-gradient-to-r from-indigo-50via-slate-50 to-indigo-50 border-indigo-100'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono font-bold bg-indigo-500/15 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/25 tracking-wider">
              UAT Quality Assurance Control Center
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight font-sans">
              Phase 19 Quality Gate & Testing Console
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Immutable software integration signoffs metrics. Verify critical scenarios, track defect mitigation rules, audit ledger solvency balance sheets, and trigger mock database resets.
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleDatabaseReset}
              disabled={isResetting}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                isResetting 
                  ? 'bg-indigo-600/20 text-indigo-400' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95 shadow-md hover:shadow-indigo-500/20'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
              {isResetting ? 'Resetting Sandbox...' : 'Reset Seed Data'}
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {successBanner && (
          <div className="mt-4 p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs flex items-center gap-2 font-mono">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}
        {errorBanner && (
          <div className="mt-4 p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-xs flex items-center gap-2 font-mono">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}
      </div>

      {/* BENCHMARK GRID & METRIC SCORES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Metric Card 1: Gate Status Check */}
        <div className={`p-4 rounded-2xl border ${
          isGateCleared 
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
            : 'bg-amber-500/5 border-amber-500/20 text-amber-500'
        }`}>
          <span className="text-[9px] uppercase font-mono tracking-widest font-black block text-slate-400">Quality Gate Status</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-md font-extrabold tracking-tight font-sans">
              {isGateCleared ? '✅ PASSED' : '❌ BLOCKED'}
            </span>
            <FileCheck className="h-5 w-5" />
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">
            {isGateCleared ? 'All Critical & High defects resolved. Sign-off ready.' : `${gateBlocksList.length} outstanding blockade rules.`}
          </p>
        </div>

        {/* Metric Card 2: Defect Velocity */}
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[9px] uppercase font-mono tracking-widest font-black block text-slate-450">Defect Analytics</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-md font-extrabold tracking-tight font-sans">
              {defects.length} Active
            </span>
            <Flame className="h-5 w-5 text-rose-500" />
          </div>
          <div className="flex gap-2 mt-2 font-mono text-[9px]">
            <span className="bg-red-500/10 text-red-500 px-1.5 rounded">Crit: {criticalDefectsCount}</span>
            <span className="bg-orange-500/10 text-orange-400 px-1.5 rounded">High: {highDefectsCount}</span>
            <span className="bg-yellow-500/10 text-yellow-500 px-1.5 rounded">Med: {defects.filter(d => d.severity === 'Medium' && d.status !== 'Closed').length}</span>
          </div>
        </div>

        {/* Metric Card 3: Ledger Double Entry Integrity */}
        <div className={`p-4 rounded-2xl border ${
          ledgerResult.parity 
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/5 border-red-500/20 text-rose-400'
        }`}>
          <span className="text-[9px] uppercase font-mono tracking-widest font-black block text-slate-400">Ledger Balance Compliance</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-md font-extrabold tracking-tight font-sans">
              {ledgerResult.parity ? '⚖️ SOLVENT / MATCHED' : '⚠️ UNSOLVED VARIANCE'}
            </span>
            <Building className="h-5 w-5" />
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">
            Deviation residue variance: ${ledgerResult.residual.toFixed(4)}
          </p>
        </div>

        {/* Metric Card 4: Scenario Completion % */}
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[9px] uppercase font-mono tracking-widest font-black block text-slate-450">Scenario Parity Check</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-md font-extrabold tracking-tight font-sans">
              {Math.round((passedScenariosCount / totalScenariosCount) * 100)}% Pass
            </span>
            <Activity className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex justify-between items-center mt-2 text-[9px] font-mono text-slate-400">
            <span>Pass: {passedScenariosCount}</span>
            <span>Fail: {failedScenariosCount}</span>
            <span>Pend: {pendingScenariosCount}</span>
          </div>
        </div>

      </div>

      {/* PHASE SIGN OFF GATE CONDITIONS (CRITICAL INFORMATION BLOCK) */}
      {!isGateCleared && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold uppercase font-mono text-[10px]">
            <AlertTriangle className="h-4 w-4" />
            <span>PHASE SIGNOFF BLOCKED: INTEGRITY CRITERIA REMNANTS PENDING</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            According to development <strong>Phase Signoff Rules</strong>, software deployment is strictly frozen until all Critical and High-severity items are marked CLOSED. Medium-level parameters may bypass blockades only if risk is explicitly verified as ACCEPTED by the Business Owner in the defect console with an set target repair date.
          </p>
          <ul className="list-disc list-inside text-[10.5px] font-mono text-slate-400 pl-1 space-y-1">
            {gateBlocksList.map((block, i) => (
              <li key={i}>{block}</li>
            ))}
          </ul>
        </div>
      )}

      {isGateCleared && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold uppercase font-mono text-[10px]">
            <CheckCircle className="h-4 w-4 animate-bounce" />
            <span>CONGRATULATIONS: QUALITY GATE REQUIREMENTS COMPILED OK!</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            The platform complies fully with Phase 19 testing bounds. Clean self-balancing double-entry assets, zero high-severity issues, and completed stakeholder signoffs allow promotion to deployment staging.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: SCENARIO CHECKLISTS & MOCK PROVIDERS */}
        <div className="lg:col-span-2 space-y-6">

          {/* SECTION A: UAT SCENARIO TRACE CHECKLIST */}
          <div className={`p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="font-extrabold tracking-tight text-xs uppercase text-indigo-400">UAT Scenario Matrix</h3>
                  <p className="text-[10px] text-slate-400 font-mono">12 Integration checkpoints covering core features</p>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-md font-extrabold border border-indigo-900/30">
                {passedScenariosCount} / {totalScenariosCount} Passed
              </span>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {scenarios.map((sc) => (
                <div 
                  key={sc.id} 
                  className={`p-4 rounded-2xl border transition-all ${
                    sc.status === 'PASSED' 
                      ? 'bg-emerald-950/5 border-emerald-900/25' 
                      : sc.status === 'FAILED' 
                      ? 'bg-rose-950/5 border-rose-900/25'
                      : 'bg-slate-950/20 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20 uppercase tracking-wider font-bold">
                        {sc.id}
                      </span>
                      <div>
                        <span className="text-[9px] uppercase font-mono text-slate-400 block tracking-widest">{sc.category}</span>
                        <h4 className="font-extrabold text-[12px] text-white font-sans mt-0.5">
                          {sc.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleToggleScenarioStatus(sc.id, 'PENDING')}
                        className={`px-2 py-1 text-[9px] font-bold rounded-lg font-mono tracking-tight uppercase hover:bg-slate-800 cursor-pointer ${
                          sc.status === 'PENDING' ? 'bg-slate-850 text-slate-200 border border-slate-700' : 'text-slate-500'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleScenarioStatus(sc.id, 'PASSED')}
                        className={`px-2 py-1 text-[9px] font-bold rounded-lg font-mono tracking-tight uppercase hover:bg-emerald-950 hover:text-emerald-300 cursor-pointer ${
                          sc.status === 'PASSED' 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' 
                            : 'text-slate-500'
                        }`}
                      >
                        Pass
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleScenarioStatus(sc.id, 'FAILED')}
                        className={`px-2 py-1 text-[9px] font-bold rounded-lg font-mono tracking-tight uppercase hover:bg-rose-950 hover:text-rose-300 cursor-pointer ${
                          sc.status === 'FAILED' 
                            ? 'bg-rose-950 text-rose-400 border border-rose-900/50' 
                            : 'text-slate-500'
                        }`}
                      >
                        Fail
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-1.5">
                    <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                      <strong className="text-slate-450 uppercase text-[9px] tracking-wider block">Target Action Scenario:</strong>
                      {sc.description}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                      <strong className="text-slate-450 uppercase text-[9px] tracking-wider block">Expected Pass Result:</strong>
                      {sc.expectedResult}
                    </p>
                  </div>

                  {/* Notes input */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/40 flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">Tester logs:</span>
                    <input
                      type="text"
                      className="grow bg-slate-950 border border-slate-850 rounded-xl px-2 py-1 text-[10px] text-slate-200 focus:outline-hidden focus:border-indigo-500"
                      placeholder="Input diagnostic notes, e.g., 'API latency looks snappy...'"
                      value={sc.notes || ''}
                      onChange={(e) => handleScenarioCommentsChange(sc.id, e.target.value)}
                    />
                    {sc.tester && (
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-mono shrink-0 uppercase font-black">
                        By: {sc.tester.slice(0, 10)}
                      </span>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* SECTION B: LEDGER INTEGRITY BALANCE VERIFICATION */}
          <div className={`p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <Building className="h-5 w-5 text-indigo-400" />
              <div>
                <h3 className="font-extrabold tracking-tight text-xs uppercase text-indigo-400">Double-Entry Balance Auditor</h3>
                <p className="text-[10px] text-slate-400 font-mono">Sovereign double-entry sheet cash-level alignment proof</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl">
                <span className="text-[9px] text-slate-450 block uppercase font-mono font-bold">Total P2P Deposits Seeding</span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono block mt-1">
                  ${ledgerResult.totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl">
                <span className="text-[9px] text-slate-450 block uppercase font-mono font-bold">Less: Total Wire Withdrawals</span>
                <span className="text-sm font-extrabold text-indigo-300 font-mono block mt-1">
                  -${ledgerResult.totalWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl">
                <span className="text-[9px] text-slate-450 block uppercase font-mono font-bold">Active Customer Total Asset Balances</span>
                <span className="text-sm font-extrabold text-amber-500 font-mono block mt-1">
                  ${ledgerResult.liveAssetSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="space-y-1 text-left">
                <span className="font-bold text-[11px] text-white flex items-center gap-1.5 font-sans">
                  Variance check: <span className="text-indigo-400 font-mono font-black">${ledgerResult.residual.toFixed(6)} Deviation</span>
                </span>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Formula: [Deposits] - [Withdrawals] === Sum([Customer Accounts]). Live validation results:
                </p>
              </div>

              <span>
                {ledgerResult.parity ? (
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-3 py-1.5 rounded-full border border-emerald-500/20 font-mono tracking-wider font-extrabold uppercase">
                    ⚖️ PERFECT COMPLIANCE
                  </span>
                ) : (
                  <span className="bg-rose-500/10 text-rose-450 text-[10px] px-3 py-1.5 rounded-full border border-rose-500/20 font-mono tracking-wider font-extrabold uppercase">
                    ❌ RESIDUAL GAP detected
                  </span>
                )}
              </span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SANDBOX SWITCHES, DEFECT LOG, & SIGNOFFS */}
        <div className="space-y-6">

          {/* TESTING PORTAL: SANDBOX CREDENTIALS & AUTOFILLS */}
          <div className={`p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-800">
              <Users className="h-5 w-5 text-indigo-400" />
              <div>
                <h3 className="font-extrabold tracking-tight text-xs uppercase text-indigo-400">Tester Credentials Index</h3>
                <p className="text-[10px] text-slate-400 font-mono">Instant copy key inputs for UAT logins</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
              Copy variables below to enter and verify other roles boundaries.
            </p>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {seedUsersList.map((su, idx) => (
                <div key={idx} className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1 text-[10.5px]">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-white text-xs">{su.name}</span>
                    <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-550/20 px-1 rounded uppercase font-bold tracking-tight">
                      {su.role}
                    </span>
                  </div>
                  <div className="font-mono text-[9.5px] text-slate-400 space-y-0.5 mt-1">
                    <div className="flex justify-between items-center group">
                      <span>Email: <span className="text-slate-300 font-bold">{su.email}</span></span>
                      <button 
                        type="button" 
                        onClick={() => handleCopyToClipboard(su.email, `${su.name} Email`)}
                        className="text-slate-500 hover:text-white px-1 select-none"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center group">
                      <span>Pass: <span className="text-indigo-305 font-bold">{su.pass}</span></span>
                      <button 
                        type="button" 
                        onClick={() => handleCopyToClipboard(su.pass, `${su.name} Password`)}
                        className="text-slate-500 hover:text-white px-1 select-none"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MOCK PROVIDER SWING-STATUS SWITCHBOARD */}
          <div className={`p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-800">
              <Activity className="h-5 w-5 text-indigo-400 animate-pulse" />
              <div>
                <h3 className="font-extrabold tracking-tight text-xs uppercase text-indigo-400">Mock Provider Switchboard</h3>
                <p className="text-[10px] text-slate-400 font-mono">Test extreme system conditions / outages</p>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { key: 'kycProvider', label: 'KYC Document Carrier API' },
                { key: 'cardNetwork', label: 'Epay Global Card Network' },
                { key: 'geminiProvider', label: 'Google Gemini Pro LLM Endpoint' },
                { key: 'doubleEntryEngine', label: 'Double-Entry Reconciliation Ledger' },
                { key: 'smsGateway', label: 'Twilio Gateway Simulator' },
                { key: 'achProvider', label: 'Plaid Bank Direct Connect ACH' }
              ].map((p) => {
                const status = providerStatuses[p.key];
                return (
                  <div key={p.key} className="p-2 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between gap-3 text-[10.5px]">
                    <span className="font-mono text-slate-300 font-bold">{p.label}</span>
                    <button
                      type="button"
                      onClick={() => toggleProviderStatus(p.key)}
                      className={`px-2 py-1 rounded text-[8px] font-mono tracking-tight font-black uppercase cursor-pointer transition-all ${
                        status === 'OPERATIONAL'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25'
                          : status === 'DEGRADED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25'
                          : 'bg-rose-500/10 text-rose-450 border border-rose-500/20 hover:bg-rose-500/25'
                      }`}
                    >
                      {status}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ROLE VALIDATION MATRIX QUICK CHECKER */}
          <div className={`p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-800">
              <Lock className="h-5 w-5 text-indigo-400" />
              <div>
                <h3 className="font-extrabold tracking-tight text-xs uppercase text-indigo-400">RBAC Clearance Analyzer</h3>
                <p className="text-[10px] text-slate-400 font-mono">Verify role boundaries on sandbox limits</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] uppercase font-mono tracking-wider text-slate-450 block mb-1">Select Role Profile</label>
                <select
                  value={selectedRoleForChecker}
                  onChange={(e) => setSelectedRoleForChecker(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-2 text-[10.5px] font-mono text-white focus:outline-hidden"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Compliance Analyst">Compliance Analyst</option>
                  <option value="Operations Officer">Operations Officer</option>
                  <option value="Finance Officer">Finance Officer</option>
                  <option value="Support Agent">Support Agent</option>
                  <option value="Risk Manager">Risk Manager</option>
                  <option value="Executive Viewer">Executive Viewer</option>
                </select>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                <span className="text-[9px] font-mono uppercase bg-indigo-950/40 text-indigo-400 px-1.5 py-0.5 rounded font-black tracking-tight block">
                  Declared Powers Index
                </span>
                <ul className="space-y-1 text-[10px] font-mono text-slate-350 list-disc list-inside">
                  {(ROLE_POLICIES[selectedRoleForChecker] || []).map((power, i) => (
                    <li key={i} className="line-clamp-2">{power}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* LOWER GRID: DEFECT LOGGER & UAT SIGNOFF SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* SECTION 1: DEFECT LOGS TRACKER */}
        <div className={`p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-450" />
              <div>
                <h3 className="font-extrabold tracking-tight text-xs uppercase text-indigo-400">Defect Logs Console</h3>
                <p className="text-[10px] text-slate-400 font-mono">Track and mitigate active code bugs</p>
              </div>
            </div>
            
            <span className="text-[8px] bg-slate-950 px-2 py-1 border border-slate-850 text-slate-500 rounded font-bold uppercase tracking-widest leading-none font-mono">
              PROMPT RULE ACTIVE
            </span>
          </div>

          {/* Add Defect Form */}
          <form onSubmit={handleAddDefect} className="bg-slate-950 p-4 border border-slate-850 rounded-2xl mb-4 space-y-3">
            <span className="font-bold text-[11px] text-white font-sans block">File New Defect Report Case</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-mono uppercase text-slate-400 block mb-0.5">Defect Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Rewards point overflow..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-[10px] text-slate-200"
                  value={newDefectTitle}
                  onChange={(e) => setNewDefectTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[9px] font-mono uppercase text-slate-400 block mb-0.5">Category Class</label>
                <select
                  className="w-full bg-slate-920 border border-slate-800 rounded-xl px-2 py-1.5 text-[10px] text-slate-200 font-mono"
                  value={newDefectCategory}
                  onChange={(e) => setNewDefectCategory(e.target.value)}
                >
                  <option value="Onboarding & KYC">Onboarding & KYC</option>
                  <option value="Transfers & Wire">Transfers & Wire</option>
                  <option value="Ledger & Assets">Ledger & Assets</option>
                  <option value="Cards & Limits">Cards & Limits</option>
                  <option value="AI Assistant">AI Assistant</option>
                  <option value="Security Controls">Security Controls</option>
                  <option value="General System">General System</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-mono uppercase text-slate-400 block mb-0.5">Severity Level</label>
                <select
                  className="w-full bg-slate-920 border border-slate-800 rounded-xl px-2 py-1.5 text-[10px] text-slate-200 font-mono"
                  value={newDefectSeverity}
                  onChange={(e) => setNewDefectSeverity(e.target.value as any)}
                >
                  <option value="Critical">💀 Critical severity</option>
                  <option value="High">⚠️ High severity</option>
                  <option value="Medium">⚡ Medium severity</option>
                  <option value="Low">🌱 Low severity</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1 uppercase transition-all tracking-wider cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Post Defect Record
                </button>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-mono uppercase text-slate-400 block mb-0.5">Detailed Description</label>
              <textarea
                placeholder="Give exact steps to reproduce the exception..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-[10px] text-slate-200 min-h-[40px]"
                value={newDefectDesc}
                onChange={(e) => setNewDefectDesc(e.target.value)}
              />
            </div>
          </form>

          {/* Defects List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {defects.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic font-mono text-center py-6">No outstanding defects logged. Pristine QA sandbox!</p>
            ) : (
              defects.map((def) => (
                <div key={def.id} className="p-3 bg-slate-950 border border-slate-850 rounded-2xl relative space-y-2">
                  
                  {/* Defect Header */}
                  <div className="flex justify-between items-start gap-1">
                    <div>
                      <span className="text-[8px] px-1 py-0.2 bg-slate-800 border border-slate-700 text-slate-350 rounded font-mono font-bold">{def.id}</span>
                      <span className="text-[8px] text-slate-500 block font-mono mt-0.5">Reporter: {def.reportedBy}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[9px] font-mono">
                      <span className={`px-2 py-0.5 rounded font-black uppercase tracking-tight ${
                        def.severity === 'Critical' 
                          ? 'bg-rose-500/15 text-rose-500 font-extrabold shadow-sm' 
                          : def.severity === 'High' 
                          ? 'bg-orange-500/15 text-orange-400' 
                          : def.severity === 'Medium' 
                          ? 'bg-yellow-500/10 text-yellow-500' 
                          : 'bg-indigo-500/10 text-indigo-400'
                      }`}>
                        {def.severity}
                      </span>

                      {/* Status select dropdown */}
                      <select
                        value={def.status}
                        onChange={(e) => handleToggleDefectStatus(def.id, e.target.value as any)}
                        className="bg-slate-900 text-slate-300 font-mono text-[9px] uppercase border border-slate-800 rounded px-1.5 py-0.5 focus:outline-hidden"
                      >
                        <option value="Open">Open</option>
                        <option value="In-Review">In-Review</option>
                        <option value="Fixed">Fixed</option>
                        <option value="Closed">Closed</option>
                      </select>

                      {/* Delete */}
                      <button 
                        type="button" 
                        onClick={() => handleDeleteDefect(def.id)}
                        className="text-slate-500 hover:text-rose-450 p-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="space-y-1">
                    <span className="font-extrabold text-white text-[11px] block">{def.title}</span>
                    {def.description && (
                      <p className="text-[10px] text-slate-400 font-mono leading-normal italic">{def.description}</p>
                    )}
                  </div>

                  {/* Medium Defect Phase gating special exception handling */}
                  {def.severity === 'Medium' && (def.status !== 'Closed' && def.status !== 'Fixed') && (
                    <div className="mt-2 pt-2 border-t border-slate-850 font-mono text-[9.5px] space-y-2">
                      <div className="flex items-center justify-between text-yellow-500 bg-yellow-500/5 p-1 px-2 rounded">
                        <span>⚠️ MEDIUM SIGNOFF PARITY GATE EXCEPTION:</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={def.riskAcceptedByBusiness || false}
                            onChange={(e) => {
                              handleToggleRiskAccepted(def.id, e.target.checked);
                            }}
                            className="rounded border-slate-800 bg-slate-900 text-yellow-500 focus:ring-0 cursor-pointer h-3 w-3"
                          />
                          <span className="font-black text-[9px] uppercase">Accept Risk</span>
                        </label>
                      </div>

                      {def.riskAcceptedByBusiness && (
                        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                          <span className="text-slate-450 font-sans">Business Owner accepts risk. Repair deadline target date:</span>
                          <input
                            type="date"
                            value={def.targetFixDate || ''}
                            onChange={(e) => handleUpdateDefectDate(def.id, e.target.value)}
                            className="bg-slate-900 text-white text-[9.5px] font-mono border border-slate-800 rounded px-1.5 py-0.3 focus:outline-hidden"
                          />
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )))}
          </div>

        </div>

        {/* SECTION 2: STAKEHOLDER SIGN OFF MATRIX */}
        <div className={`p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="font-extrabold tracking-tight text-xs uppercase text-indigo-400">Formal UAT Signoff Matrix</h3>
              <p className="text-[10px] text-slate-400 font-mono">Enterprise stakeholders authorization signatures</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mb-4 leading-normal leading-relaxed">
            Record signatures to certify promotion readiness. Double click and select "SIGNED OFF" to register your compliance credentials below:
          </p>

          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
            {signoffs.map((so) => {
              return (
                <div key={so.owner} className="p-3 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <span className="text-[11px] font-sans font-black text-indigo-400 tracking-tight block uppercase">{so.owner}</span>
                      <span className="text-[9.5px] font-mono text-slate-450 block">{so.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={so.status}
                        onChange={(e) => handleUpdateSignoff(so.owner, e.target.value as any, so.name, so.remarks || '')}
                        className={`text-[9.5px] font-mono border rounded px-2 py-1 uppercase focus:outline-hidden cursor-pointer ${
                          so.status === 'SIGNED_OFF'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-900/50'
                            : so.status === 'REJECTED'
                            ? 'bg-rose-950 text-rose-400 border-rose-900/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="SIGNED_OFF">Signed Off</option>
                        <option value="REJECTED">Declined / Out</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-[9px] font-mono uppercase text-slate-450 block mb-0.5">Signing Official Name</label>
                      <input
                        type="text"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white"
                        value={so.name}
                        onChange={(e) => handleUpdateSignoff(so.owner, so.status, e.target.value, so.remarks || '')}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono uppercase text-slate-450 block mb-0.5">Signed Signature Date</label>
                      <input
                        type="text"
                        disabled
                        className="w-full bg-slate-920 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-500 font-mono"
                        value={so.dateSigned || 'NOT RECORDED'}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono uppercase text-slate-450 block mb-0.5">Reviewer Statement & Remarks</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-zinc-300"
                      placeholder="e.g., Checked document approval flows & transaction matching. Looks good."
                      value={so.remarks || ''}
                      onChange={(e) => handleUpdateSignoff(so.owner, so.status, so.name, e.target.value)}
                    />
                  </div>

                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
};
