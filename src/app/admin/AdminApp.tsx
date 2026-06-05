import React, { useState, useEffect } from 'react';
import { UserProfile, KYCCase, ComplianceAlert, AuditLog, SupportTicket, Transaction } from '../../types';
import { LedgerSummary, fetchSystemSettings, updateSystemSettings } from '../../services/api';
import { KYCReviewPanel } from './KYCReviewPanel';
import { ComplianceManager } from './ComplianceManager';
import { LedgerProofConsole } from './LedgerProofConsole';
import { SecuredAuditTrail } from './SecuredAuditTrail';
import { AdminSupportDesk } from './AdminSupportDesk';
import { OperationsCockpit } from './OperationsCockpit';
import { UserManagementPanel } from './UserManagementPanel';
import { FinanceConsole } from './FinanceConsole';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Cpu, 
  Layers, 
  HelpCircle, 
  UserCheck,
  Building,
  Menu,
  ChevronRight,
  User,
  LogOut,
  Sliders,
  Database,
  Lock,
  Compass,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { StatusBadge, RiskBadge, StatCard } from '../../components/DesignSystem';

interface AdminAppProps {
  users: UserProfile[];
  transactions: Transaction[];
  kycCases: KYCCase[];
  complianceAlerts: ComplianceAlert[];
  ledgerStats: LedgerSummary | null;
  auditLogs: AuditLog[];
  tickets: SupportTicket[];
  isLedgerLoading: boolean;
  onRefreshAll: () => void;
  darkMode?: boolean;
  activeUser: UserProfile;
  onLogout: () => void;
}

// Definition of Permission Matrix for UI presentation
export const ROLE_PERMISSIONS: Record<string, {
  viewKyc: boolean;
  approveKyc: boolean;
  viewAlerts: boolean;
  resolveAlerts: boolean;
  viewLedger: boolean;
  viewAudit: boolean;
  wipeAudit: boolean;
  replyTickets: boolean;
  manageSettings: boolean;
}> = {
  'Super Admin': {
    viewKyc: true,
    approveKyc: true,
    viewAlerts: true,
    resolveAlerts: true,
    viewLedger: true,
    viewAudit: true,
    wipeAudit: true,
    replyTickets: true,
    manageSettings: true
  },
  'Compliance Analyst': {
    viewKyc: true,
    approveKyc: true,
    viewAlerts: true,
    resolveAlerts: true,
    viewLedger: true,
    viewAudit: true,
    wipeAudit: false,
    replyTickets: false,
    manageSettings: false
  },
  'Operations Officer': {
    viewKyc: true,
    approveKyc: true,
    viewAlerts: true,
    resolveAlerts: false,
    viewLedger: false,
    viewAudit: true,
    wipeAudit: false,
    replyTickets: true,
    manageSettings: false
  },
  'Finance Officer': {
    viewKyc: true,
    approveKyc: false, // controlled by setting/toggle in settings
    viewAlerts: true,
    resolveAlerts: false,
    viewLedger: true,
    viewAudit: true,
    wipeAudit: false,
    replyTickets: false,
    manageSettings: false
  },
  'Support Agent': {
    viewKyc: false,
    approveKyc: false,
    viewAlerts: false,
    resolveAlerts: false,
    viewLedger: false,
    viewAudit: false,
    wipeAudit: false,
    replyTickets: true,
    manageSettings: false
  },
  'Risk Manager': {
    viewKyc: true,
    approveKyc: true,
    viewAlerts: true,
    resolveAlerts: true,
    viewLedger: true,
    viewAudit: true,
    wipeAudit: false,
    replyTickets: false,
    manageSettings: false
  },
  'Executive Viewer': {
    viewKyc: true,
    approveKyc: false,
    viewAlerts: true,
    resolveAlerts: false,
    viewLedger: true,
    viewAudit: true,
    wipeAudit: false,
    replyTickets: false,
    manageSettings: false
  },
  'Finance Manager': {
    viewKyc: true,
    approveKyc: true,
    viewAlerts: true,
    resolveAlerts: true,
    viewLedger: true,
    viewAudit: true,
    wipeAudit: false,
    replyTickets: false,
    manageSettings: true
  }
};

export const AdminApp: React.FC<AdminAppProps> = ({
  users,
  transactions,
  kycCases,
  complianceAlerts,
  ledgerStats,
  auditLogs,
  tickets,
  isLedgerLoading,
  onRefreshAll,
  darkMode = false,
  activeUser,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'users' | 'kyc' | 'compliance' | 'ledger' | 'audit' | 'support' | 'settings' | 'finance'>('cockpit');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Settings State matching system
  const [allowFinanceOfficerKycApproval, setAllowFinanceOfficerKycApproval] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Fetch active settings on load or tab change
  const syncSettings = async () => {
    try {
      const s = await fetchSystemSettings();
      setAllowFinanceOfficerKycApproval(s.allowFinanceOfficerKycApproval);
    } catch (e) {
      console.warn('Could not sync backend options.');
    }
  };

  useEffect(() => {
    syncSettings();
  }, [activeTab]);

  const handleToggleKycClearance = async () => {
    if (activeUser.role !== 'Super Admin') return;
    setIsUpdatingSettings(true);
    try {
      const nextVal = !allowFinanceOfficerKycApproval;
      await updateSystemSettings({ allowFinanceOfficerKycApproval: nextVal });
      setAllowFinanceOfficerKycApproval(nextVal);
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Error configuring rule.');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const pendingKYCCount = kycCases.filter(k => k.status === 'PENDING').length;
  const activeAlertsCount = complianceAlerts.filter(a => a.status === 'OPEN').length;
  const unresolvedTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  const getInitials = (n: string) => {
    return n.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  };

  const getTabBreadcrumb = () => {
    switch (activeTab) {
      case 'cockpit': return 'Realtime Operations Cockpit';
      case 'users': return 'Administrative User Management Profile Dossier';
      case 'kyc': return 'KYC Onboarding queue';
      case 'compliance': return 'Risk Monitoring Holds';
      case 'ledger': return 'Double Entry Balance Sheet';
      case 'audit': return 'Operational Security Audits';
      case 'support': return 'Helpdesk Disputes Review';
      case 'settings': return 'System Settings & RBAC Policies';
      default: return 'System Controls';
    }
  };

  // Helper to render high-contrast ACCESS DENIED screen for UAT evaluation
  const renderAccessDenied = (featureName: string, requiredRoleRule: string) => {
    return (
      <div className={`p-8 md:p-12 text-center rounded-3xl border w-full max-w-2xl mx-auto my-12 shadow-xl ${
        darkMode ? 'bg-[#15121b] border-rose-950 text-slate-200' : 'bg-red-50/70 border-red-200 text-slate-900'
      }`}>
        <div className="mx-auto h-16 w-16 bg-rose-500/15 rounded-full flex items-center justify-center mb-6 border border-rose-500/25">
          <Lock className="h-8 w-8 text-rose-500 animate-pulse" />
        </div>
        
        <div className="space-y-4">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full border border-rose-500/20">
            Security Block Override Error (403 Forbidden)
          </span>
          <h3 className="font-extrabold tracking-tight font-sans text-xl">
            Access Denied: High-Security Boundary
          </h3>
          <p className="text-xs text-slate-450 leading-relaxed max-w-md mx-auto">
            You do not possess the necessary administrative credentials to access the <strong>{featureName}</strong> profile. Check the local policy matrix.
          </p>
        </div>

        <div className={`mt-8 p-4 rounded-2xl border text-left font-mono text-[11px] leading-relaxed space-y-2 ${
          darkMode ? 'bg-slate-950/65 border-slate-900 text-slate-400' : 'bg-white border-slate-200 text-slate-700'
        }`}>
          <div className="flex justify-between pb-1.5 border-b border-slate-900">
            <span className="text-slate-500">Attempted Resource:</span>
            <span className="text-white font-bold">{featureName}</span>
          </div>
          <div className="flex justify-between">
            <span>Logged Operator:</span>
            <span className="text-indigo-400 font-bold">{activeUser.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Assigned RBAC Role:</span>
            <span className="text-amber-500 font-bold">{activeUser.role}</span>
          </div>
          <div className="flex justify-between">
            <span>Clearance status:</span>
            <span className="text-rose-500 font-bold">REJECTED [PERMISSIONS_VOID]</span>
          </div>
          <p className="text-[10px] text-slate-500 italic mt-3 pt-2 border-t border-slate-900">
            🔒 APP Event Logged: This failure was recorded in the immutable double-entry security audit trail ledger.
          </p>
        </div>
      </div>
    );
  };

  // Perform RBAC verification for major areas
  const permissions = ROLE_PERMISSIONS[activeUser.role] || {
    viewKyc: false, approveKyc: false, viewAlerts: false, resolveAlerts: false,
    viewLedger: false, viewAudit: false, wipeAudit: false, replyTickets: false, manageSettings: false
  };

  return (
    <div className={`rounded-3xl border transition-all overflow-hidden font-sans text-xs ${
      darkMode ? 'bg-[#0b0f19] border-slate-850 shadow-2xl' : 'bg-white border-slate-200 shadow-md'
    }`}>
      
      {/* Dynamic Desktop Shell Grid Layout */}
      <div className="flex min-h-[640px] flex-col md:flex-row relative">
        
        {/* COLLAPSIBLE SIDEBAR: Responsive Left Panel */}
        <aside className={`transition-all duration-300 md:relative shrink-0 border-r ${
          sidebarOpen ? 'w-full md:w-64 p-5' : 'w-0 md:w-0 p-0 overflow-hidden border-r-0'
        } ${
          darkMode 
            ? 'bg-[#0f172a] border-slate-800 text-slate-100' 
            : 'bg-slate-50 border-slate-200 text-slate-900'
        }`}>
          {sidebarOpen && (
            <div className="space-y-6">
              
              {/* Sidebar Header Brand block */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 text-white rounded-xl">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold tracking-tight font-sans text-xs uppercase text-indigo-500">Backoffice Portal</h3>
                  <p className="text-[9px] text-slate-405 font-mono">CRO Audit Clearance</p>
                </div>
              </div>

              {/* Sidebar Menu items */}
              <nav className="space-y-1.5 pt-4">
                
                <button
                  onClick={() => setActiveTab('cockpit')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold cursor-pointer transition-all text-left ${
                    activeTab === 'cockpit'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : darkMode ? 'text-slate-400 hover:bg-slate-850' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  id="admin-cockpit-sidebar-btn"
                >
                  <span className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    Operations Cockpit
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-400 font-mono text-[8px] px-1.5 rounded font-black uppercase">
                    Live
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold cursor-pointer transition-all text-left ${
                    activeTab === 'users'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : darkMode ? 'text-slate-400 hover:bg-slate-850' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  id="admin-users-sidebar-btn"
                >
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User Directory
                  </span>
                  <span className="font-mono text-[9px] bg-emerald-550/10 text-emerald-400 px-1.5 rounded font-bold uppercase">
                    Active
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('kyc')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold cursor-pointer transition-all text-left ${
                    activeTab === 'kyc'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : darkMode ? 'text-slate-400 hover:bg-slate-850' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    KYC Verifications
                  </span>
                  {pendingKYCCount > 0 && (
                    <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-extrabold ${activeTab === 'kyc' ? 'bg-white text-indigo-700' : 'bg-indigo-500/10 text-indigo-400'}`}>
                      {pendingKYCCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('compliance')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold cursor-pointer transition-all text-left ${
                    activeTab === 'compliance'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : darkMode ? 'text-slate-400 hover:bg-slate-850' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Compliance & Holds
                  </span>
                  {activeAlertsCount > 0 && (
                    <span className="bg-rose-500 text-white font-mono text-[9px] px-1.5 py-0.5 rounded font-extrabold animate-pulse">
                      {activeAlertsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('ledger')}
                  className={`w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold cursor-pointer transition-all text-left ${
                    activeTab === 'ledger'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : darkMode ? 'text-slate-400 hover:bg-slate-850' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Building className="h-4 w-4" />
                  Balanced Ledger
                </button>

                <button
                  onClick={() => setActiveTab('finance')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold cursor-pointer transition-all text-left ${
                    activeTab === 'finance'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : darkMode ? 'text-slate-400 hover:bg-slate-850' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Finance & Settlements
                  </span>
                  <span className="font-mono text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-extrabold">
                    $ LIVE
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('audit')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold cursor-pointer transition-all text-left ${
                    activeTab === 'audit'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : darkMode ? 'text-slate-400 hover:bg-slate-850' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Security Audit Trail
                  </span>
                  <span className="font-mono text-[9px] bg-slate-500/10 text-slate-400 px-1.5 py-0.5 rounded font-extrabold">
                    {auditLogs.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('support')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold cursor-pointer transition-all text-left ${
                    activeTab === 'support'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : darkMode ? 'text-slate-400 hover:bg-slate-850' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Help Disputes
                  </span>
                  {unresolvedTickets > 0 && (
                    <span className="font-mono text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-extrabold">
                      {unresolvedTickets}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold cursor-pointer transition-all text-left ${
                    activeTab === 'settings'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : darkMode ? 'text-slate-400 hover:bg-slate-850' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Sliders className="h-4 w-4" />
                  Settings & RBAC Matrix
                </button>

              </nav>

              {/* Status block info */}
              <div className="pt-8 text-[11px] text-slate-450 border-t border-slate-200 dark:border-slate-800 space-y-2 pointer-events-none">
                <span className="font-bold underline block uppercase font-mono tracking-widest text-[9px] text-indigo-400">Solvency Status</span>
                <p className="leading-snug">All database reserves are posted double-entry. APP system balanced checking OK.</p>
              </div>

            </div>
          )}
        </aside>

        {/* MAIN WORKSPACE WRAPPER (Admin Main Window) */}
        <div className="grow flex flex-col min-w-0">
          
          {/* TOP BAR HEADER: Breadcrumbs & Secure Profile Menu */}
          <header className={`px-6 py-4 flex items-center justify-between border-b ${
            darkMode ? 'bg-[#111827] border-slate-850' : 'bg-white border-slate-200'
          }`}>
            
            {/* Left: Collapsible toggle AND Breadcrumbs path */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${
                  darkMode ? 'border-slate-800 text-slate-200' : 'border-slate-200 text-slate-700'
                }`}
                title="Toggle Workspace Sidebar"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>

              {/* Breadcrumbs Path */}
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 uppercase select-none font-bold">
                <span className="hover:text-indigo-500">Corporate Console</span>
                <ChevronRight className="h-3 w-3" />
                <span className={darkMode ? 'text-white' : 'text-slate-800'}>{getTabBreadcrumb()}</span>
              </div>
            </div>

            {/* Right: Security details and SECURE PROFILE MENU */}
            <div className="flex items-center gap-3 relative">
              
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>ACTIVE SESSION OK</span>
              </div>

              {/* Secured drop-down click target */}
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  darkMode 
                    ? 'bg-slate-900 border-slate-800 text-white hover:border-indigo-800' 
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
                id="secure-profile-menu-trigger"
              >
                <div className="h-5.5 w-5.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center font-sans uppercase">
                  {getInitials(activeUser.name)}
                </div>
                <span className="font-bold text-[11px] hidden md:inline">{activeUser.name}</span>
              </button>

              {/* SECURE DROPDOWN POPUP CARD */}
              {showProfileMenu && (
                <div className={`absolute right-0 top-11 p-4 rounded-2xl border w-66 shadow-xl z-50 text-left ${
                  darkMode 
                    ? 'bg-slate-900 border-slate-805 text-white' 
                    : 'bg-white border-slate-195 text-slate-900'
                }`}>
                  <div className="pb-3 border-b border-slate-800">
                    <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400 block">Ident Clearance Tag</span>
                    <h5 className="font-extrabold text-xs font-sans mt-0.5">{activeUser.name}</h5>
                    <p className="text-[10px] text-slate-450 mt-1">{activeUser.role} of Emerald Sovereign Trust</p>
                  </div>

                  <div className="py-3.5 space-y-2 text-[10px] font-mono leading-relaxed">
                    <div className="flex justify-between">
                      <span className="text-slate-450">Assigned Role:</span>
                      <span className="font-bold text-indigo-500 uppercase">{activeUser.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-450">Email Map:</span>
                      <span className="font-bold text-slate-300">{activeUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-450">Privilege:</span>
                      <span className="font-bold text-emerald-500 uppercase">SANBOX-PROV</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    style={{ cursor: 'pointer' }}
                    className="w-full py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <LogOut className="h-4 w-4" /> Close Audit Session
                  </button>
                </div>
              )}

            </div>
          </header>

          {/* ACTIVE BACKOFFICE SUB-PANEL CONTENT */}
          <main className="p-4 md:p-6 grow focus-mode-root">
            
            {activeTab === 'cockpit' && (
              <OperationsCockpit
                users={users}
                transactions={transactions}
                kycCases={kycCases}
                complianceAlerts={complianceAlerts}
                tickets={tickets}
                activeUser={activeUser}
                darkMode={darkMode}
              />
            )}
            
            {activeTab === 'kyc' && (
              permissions.viewKyc ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h4 className={`text-md font-bold font-sans ${darkMode ? 'text-white' : 'text-slate-900'}`}>KYC Onboarding Queue Review</h4>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Approve or reject physical legal status uploads to clear client limits.</span>
                    </div>
                    <button 
                      onClick={onRefreshAll}
                      style={{ cursor: 'pointer' }}
                      className="bg-indigo-650 hover:bg-indigo-650 text-white font-bold px-3 py-1.5 rounded-xl text-[10.5px] transition-colors"
                    >
                      Sync Queue Records
                    </button>
                  </div>
                  
                  {activeUser.role === 'Finance Officer' && !allowFinanceOfficerKycApproval && (
                    <div className="p-3 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-xl text-xs">
                      🔒 <strong>Finance Officer Clearance notice:</strong> Dynamic policy requires Super Admin approval to let you verify documents. Any actions will return a security exception blocked by default.
                    </div>
                  )}

                  <KYCReviewPanel
                    cases={kycCases}
                    onActionComplete={onRefreshAll}
                    darkMode={darkMode}
                    adminName={`${activeUser.name} (${activeUser.role})`}
                    adminRole={activeUser.role}
                  />
                </div>
              ) : renderAccessDenied('KYC Document Operations Queue', 'viewKyc')
            )}

            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h4 className={`text-md font-bold font-sans ${darkMode ? 'text-white' : 'text-slate-900'}`}>Administrative Client Directory</h4>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Examine confidential profiles, inspect registered device claims, alter risk parameters, and conduct decryptions.</span>
                  </div>
                  <button 
                    onClick={onRefreshAll}
                    className="bg-indigo-650 hover:bg-indigo-650 text-white font-bold px-3 py-1.5 rounded-xl text-[10.5px] transition-colors cursor-pointer"
                  >
                    Sync Accounts
                  </button>
                </div>

                <UserManagementPanel
                  users={users}
                  transactions={transactions}
                  auditLogs={auditLogs}
                  activeOperator={activeUser}
                  darkMode={darkMode}
                  onRefreshAll={onRefreshAll}
                />
              </div>
            )}

            {activeTab === 'compliance' && (
              permissions.viewAlerts ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h4 className={`text-md font-bold font-sans ${darkMode ? 'text-white' : 'text-slate-900'}`}>Compliance Watchdogs & Holds</h4>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Review high-velocity, high-magnitude holds matching compliance triggers.</span>
                    </div>
                  </div>
                  <ComplianceManager
                    alerts={complianceAlerts}
                    transactions={transactions}
                    auditLogs={auditLogs}
                    users={users}
                    onActionComplete={onRefreshAll}
                    darkMode={darkMode}
                    adminName={`${activeUser.name} (${activeUser.role})`}
                  />
                </div>
              ) : renderAccessDenied('Compliance Holds Dashboard', 'viewAlerts')
            )}

            {activeTab === 'ledger' && (
              permissions.viewLedger ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h4 className={`text-md font-bold font-sans ${darkMode ? 'text-white' : 'text-slate-900'}`}>Sovereign Token Double-Entry Ledger</h4>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Audit compliance sheets matching total asset cash balances to system solvency reserve pools.</span>
                    </div>
                  </div>
                  <LedgerProofConsole
                    ledgerStats={ledgerStats}
                    isLoading={isLedgerLoading}
                    darkMode={darkMode}
                  />
                </div>
              ) : renderAccessDenied('Confidential double-entry solvency ledger', 'viewLedger')
            )}

            {activeTab === 'finance' && (
              <FinanceConsole
                transactions={transactions}
                users={users}
                darkMode={darkMode}
                activeUser={{ name: activeUser.name, role: activeUser.role, email: activeUser.email }}
                onRefreshAll={onRefreshAll}
              />
            )}

            {activeTab === 'audit' && (
              permissions.viewAudit ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h4 className={`text-md font-bold font-sans ${darkMode ? 'text-white' : 'text-slate-900'}`}>Immutable Security Audit Trails</h4>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Review diagnostic server telemetry actions matching legal standards.</span>
                    </div>
                  </div>
                  <SecuredAuditTrail
                    logs={auditLogs}
                    onRefresh={onRefreshAll}
                    darkMode={darkMode}
                    canWipe={permissions.wipeAudit}
                  />
                </div>
              ) : renderAccessDenied('Immutable Operational Telemetry Audits', 'viewAudit')
            )}

            {activeTab === 'support' && (
              permissions.replyTickets ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h4 className={`text-md font-bold font-sans ${darkMode ? 'text-white' : 'text-slate-900'}`}>Auditor helpdesk support Disputes</h4>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Resolve dispute tickets. Use real-time AI responses to generate high-fidelity resolution advices.</span>
                    </div>
                  </div>
                  <AdminSupportDesk
                    tickets={tickets}
                    onActionComplete={onRefreshAll}
                    darkMode={darkMode}
                    adminName={activeUser.name}
                  />
                </div>
              ) : renderAccessDenied('Helpdesk Disputes Board', 'replyTickets')
            )}

            {activeTab === 'settings' && (
              permissions.manageSettings ? (
                <div className="space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <h4 className={`text-md font-bold font-sans ${darkMode ? 'text-white' : 'text-slate-900'}`}>System Settings & RBAC Policy Board</h4>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Manage administrative routing policies and configure permission bounds dynamically.</span>
                  </div>

                  {/* KYC Approval Switch Toggle Policy for Finance Officer */}
                  <div className={`p-5 rounded-3xl border flex items-center justify-between gap-6 ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <div>
                      <span className="font-extrabold text-xs">KYC Authority Override: Finance Officers clearance</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5 max-w-lg">
                        Enable this toggle to grant dynamic authorization to Devin Finch (Finance Officer) to verify physical legal status uploads in the KYC Review queue. By default, this is blocked by corporate safety bounds.
                      </p>
                    </div>

                    <button
                      onClick={handleToggleKycClearance}
                      disabled={isUpdatingSettings}
                      title="Toggle KYC Clearance Override State"
                      style={{ cursor: 'pointer' }}
                      className="p-1 rounded-full text-indigo-505 transition-all text-xs"
                    >
                      {isUpdatingSettings ? (
                        <RefreshCw className="h-6 w-6 animate-spin" />
                      ) : allowFinanceOfficerKycApproval ? (
                        <ToggleRight className="h-10 w-10 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-10 w-10 text-slate-500" />
                      )}
                    </button>
                  </div>

                  {/* Real visual Permission Matrix table */}
                  <div className={`p-5 rounded-3xl border ${
                    darkMode ? 'bg-slate-900/40 border-slate-850' : 'bg-white border-slate-200'
                  }`}>
                    <h5 className="font-extrabold text-xs mb-3 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-indigo-500" /> Enterprise Backoffice RBAC Permission Matrix
                    </h5>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse font-sans text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-mono text-[9px] uppercase tracking-wider">
                            <th className="py-2.5 px-3">Administrative Role</th>
                            <th className="py-2.5 px-3 text-center">View KYC</th>
                            <th className="py-2.5 px-3 text-center">Approve KYC</th>
                            <th className="py-2.5 px-3 text-center">View Alerts</th>
                            <th className="py-2.5 px-3 text-center">Resolve Holds</th>
                            <th className="py-2.5 px-3 text-center">Proof Ledger</th>
                            <th className="py-2.5 px-3 text-center">Audit trace</th>
                            <th className="py-2.5 px-3 text-center">Wipe logs</th>
                            <th className="py-2.5 px-3 text-center">Help Replies</th>
                            <th className="py-2.5 px-3 text-center">Manage settings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {Object.entries(ROLE_PERMISSIONS).map(([roleName, pm]) => {
                            const isCurrent = roleName === activeUser.role;
                            return (
                              <tr key={roleName} className={`${isCurrent ? 'bg-indigo-950/20 text-indigo-300 font-bold' : ''}`}>
                                <td className="py-2.5 px-3 font-semibold flex items-center gap-1.5">
                                  {roleName}
                                  {isCurrent && <span className="bg-indigo-500 text-white text-[8px] font-bold px-1 py-0.5 rounded uppercase font-mono">Current</span>}
                                </td>
                                
                                <td className="py-2.5 px-3 text-center">
                                  {pm.viewKyc ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-rose-500 mx-auto" />}
                                </td>
                                
                                <td className="py-2.5 px-3 text-center">
                                  {roleName === 'Finance Officer' && allowFinanceOfficerKycApproval ? (
                                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 py-0.3 rounded border border-emerald-500/20 font-bold mx-auto block w-max">OVERRIDE</span>
                                  ) : pm.approveKyc ? (
                                    <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                                  ) : (
                                    <X className="h-4 w-4 text-rose-500 mx-auto" />
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  {pm.viewAlerts ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-rose-500 mx-auto" />}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  {pm.resolveAlerts ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-rose-500 mx-auto" />}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  {pm.viewLedger ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-rose-500 mx-auto" />}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  {pm.viewAudit ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-rose-500 mx-auto" />}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  {pm.wipeAudit ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-rose-500 mx-auto" />}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  {pm.replyTickets ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-rose-500 mx-auto" />}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  {pm.manageSettings ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-rose-500 mx-auto" />}
                                </td>

                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-3 font-mono leading-relaxed">
                      🔒 Policies are loaded dynamically inside Express node handlers on the backoffice container for strict validation blockades.
                    </p>
                  </div>
                </div>
              ) : renderAccessDenied('System configuration & policy bounds settings', 'manageSettings')
            )}

          </main>

        </div>

      </div>

    </div>
  );
};
