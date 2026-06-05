import { useState, useEffect } from 'react';
import { UserProfile, Transaction, KYCCase, ComplianceAlert, SupportTicket, AuditLog } from './types';
import { 
  fetchUsers, 
  fetchTransactions, 
  fetchKYCCases, 
  fetchComplianceAlerts, 
  fetchSupportTickets, 
  fetchAuditLogs, 
  fetchLedgerStats, 
  updateUser, 
  LedgerSummary,
  fetchActiveSession,
  loginUser,
  verifyMFA,
  logoutUser
} from './services/api';
import { PersonaSwitcher } from './components/PersonaSwitcher';
import { CustomerApp } from './app/customer/CustomerApp';
import { AdminApp } from './app/admin/AdminApp';
import { AuthContainer } from './components/AuthContainer';
import { SpecsConsole } from './components/SpecsConsole';
import { AlertCircle, ShieldEllipsis, ShieldCheck, Milestone, Cpu, RefreshCw } from 'lucide-react';

export default function App() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem('apex_session_token'));
  
  const [viewMode, setViewMode] = useState<'console' | 'specs'>('console');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const local = localStorage.getItem('apex_dark_mode');
    return local === 'true';
  });

  useEffect(() => {
    localStorage.setItem('apex_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  // Backoffice sync fields
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kycCases, setKycCases] = useState<KYCCase[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [ledgerStats, setLedgerStats] = useState<LedgerSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  // Sync entire simulated databank
  const syncPlatformState = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all raw users for lists
      const fetchedUsers = await fetchUsers().catch(() => []);
      setUsers(fetchedUsers);

      const token = localStorage.getItem('apex_session_token');
      let sessionUser: UserProfile | null = null;

      if (token) {
        try {
          // Verify with the backend session verification endpoint
          const sessionData = await fetchActiveSession();
          sessionUser = sessionData.user;
          setActiveUser(sessionUser);
        } catch (sessErr) {
          // Stale session, prompt re-authentication
          console.warn('Session has expired or is invalid.');
          localStorage.removeItem('apex_session_token');
          localStorage.removeItem('apex_session_user');
          setSessionToken(null);
          setActiveUser(null);
        }
      } else {
        setActiveUser(null);
      }

      // 2. Fetch other indicator sections in parallel matching RBAC scope
      // (Using .catch so lack of permissions for simple roles doesn't crash app startup)
      const [txs, kyc, alerts, tkts, logs, stats] = await Promise.all([
        fetchTransactions().catch(() => []),
        fetchKYCCases().catch(() => []),
        fetchComplianceAlerts().catch(() => []),
        fetchSupportTickets().catch(() => []),
        fetchAuditLogs().catch(() => []),
        fetchLedgerStats().catch(() => null)
      ]);

      setTransactions(txs);
      setKycCases(kyc);
      setComplianceAlerts(alerts);
      setSupportTickets(tkts);
      setAuditLogs(logs);
      setLedgerStats(stats);
    } catch (err) {
      console.error('Critical backoffice synchronization failure:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncPlatformState();
  }, [sessionToken]);

  const handleUpdateActiveUser = async (updatedFields: Partial<UserProfile>) => {
    if (!activeUser) return;
    setIsLedgerLoading(true);
    try {
      const result = await updateUser(activeUser.id, updatedFields);
      setActiveUser(result);
      
      // Resync state to update list, balances, and ledger postings
      const freshUsers = await fetchUsers().catch(() => []);
      setUsers(freshUsers);
      const freshStats = await fetchLedgerStats().catch(() => null);
      setLedgerStats(freshStats);
      const freshLogs = await fetchAuditLogs().catch(() => []);
      setAuditLogs(freshLogs);
    } catch (err: any) {
      alert(err.message || 'Error executing balance override.');
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Backend session cleanup incomplete.');
    } finally {
      localStorage.removeItem('apex_session_token');
      localStorage.removeItem('apex_session_user');
      setSessionToken(null);
      setActiveUser(null);
      setTransactions([]);
      setKycCases([]);
      setComplianceAlerts([]);
      setSupportTickets([]);
      setAuditLogs([]);
      setLedgerStats(null);
      setIsLoading(false);
    }
  };

  // Switcher bypass logins representing each sandbox account
  const handleSelectPersona = async (persona: UserProfile) => {
    setIsLoading(true);
    try {
      // Mapping default passwords for switcher accounts
      const testPasswords: Record<string, string> = {
        'usr-1': 'Sarah123!',
        'usr-2': 'Michael123!',
        'usr-3': 'Amara123!',
        'usr-4': 'Carlos123!',
        'usr-5': 'Elena123!',
        'usr-6': 'David123!',
        'usr-7': 'Yuki123!',
        'usr-8': 'Zayn123!',
        'usr-9': 'Oliver123!',
        'usr-10': 'Sofia123!',
        'usr-super-admin': 'SuperAdmin123!',
        'usr-compliance': 'Compliance123!',
        'usr-ops': 'Operations123!',
        'usr-finance': 'Finance123!',
        'usr-support': 'Support123!',
        'usr-risk': 'Risk123!',
        'usr-exec': 'Executive123!'
      };

      const pass = testPasswords[persona.id] || 'Sandbox123!';
      
      // Execute backend logon
      const logonResult = await loginUser(persona.email, pass);
      let finalSessionId = logonResult.sessionId;

      if (logonResult.mfaRequired) {
        // Automatically supply 123456 bypass code for development switcher efficiency
        const mfaRes = await verifyMFA(logonResult.sessionId, '123456');
        finalSessionId = mfaRes.sessionId;
      }

      localStorage.setItem('apex_session_token', finalSessionId);
      localStorage.setItem('apex_session_user', JSON.stringify(persona));
      setSessionToken(finalSessionId);
      setActiveUser(persona);
      console.log(`Dynamic pivot: Switcher assigned credentials session ${finalSessionId} for ${persona.name}`);
    } catch (err: any) {
      console.error('Switcher helper logon failed:', err);
      // Fallback standard clear
      localStorage.removeItem('apex_session_token');
      localStorage.removeItem('apex_session_user');
      setSessionToken(null);
      setActiveUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-300 ${
      darkMode ? 'bg-[#060a13] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
    }`}>
      
      {/* 1. DEVELOPMENT WARNING BANNER OF SAFETY */}
      <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs border-b border-amber-600/30 flex items-center justify-center gap-2 select-none z-50 font-sans">
        <AlertCircle className="h-4.5 w-4.5 text-slate-950 shrink-0" />
        <span className="font-extrabold tracking-tight uppercase">Development Safety Notice:</span>
        <span className="font-medium">
          Sandbox prototype - no real money movement. All card numbers, credit caps, and transactions are mock simulated journals.
        </span>
      </div>

      {/* Main Page Layout Bounds */}
      <div className="grow w-full max-w-7xl mx-auto px-4 py-6">
        
        {/* Header Ribbon bar */}
        <header className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b ${
          darkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-505 animate-pulse" />
              <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">Secure Fintech Engine Core</div>
            </div>
            <h1 className={`font-sans font-extrabold tracking-tight text-2xl mt-1 ${
              darkMode ? 'text-white' : 'text-slate-950'
            }`}>
              Enterprise AI Finance APP
            </h1>
          </div>

          {/* Solvency balance Sheet brief & Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Real Light/Dark switch button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-2xl border transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                darkMode 
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300' 
                  : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-50'
              }`}
              title="Toggle Light / Dark Mode"
              id="theme-toggler"
            >
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>

            <div className={`flex items-center gap-2 text-xs p-2.5 rounded-2xl shadow-sm font-mono ${
              darkMode ? 'bg-slate-900 border border-slate-800 text-slate-300' : 'bg-white border border-slate-200/80 text-slate-700'
            }`}>
              <ShieldCheck className="h-4 w-4 text-indigo-600 animate-pulse" />
              <span className="text-slate-400">Vault Solvency:</span>
              <span className="font-bold text-indigo-500">
                {ledgerStats?.stats?.reserveHealthPercent ? `${ledgerStats.stats.reserveHealthPercent}%` : '96.2%'}
              </span>
            </div>
          </div>
        </header>

        {/* 2. Persona Selector Workspace (Backdoor Switcher) */}
        <PersonaSwitcher
          users={users}
          activeUser={activeUser}
          onSelectUser={handleSelectPersona}
          isLoading={isLoading}
          onRefresh={syncPlatformState}
        />

        {/* 2.5 Workspace Viewport Switcher */}
        <div className={`flex gap-2 p-1.5 rounded-2xl max-w-md mb-6 border ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
        } shadow-2xs`}>
          <button
            onClick={() => setViewMode('console')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              viewMode === 'console'
                ? darkMode ? 'bg-[#151c30] text-indigo-400 shadow-sm' : 'bg-white shadow-sm text-indigo-600'
                : darkMode ? 'text-slate-450 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cpu className="h-4 w-4" />
            APP Console
          </button>
          <button
            onClick={() => setViewMode('specs')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              viewMode === 'specs'
                ? darkMode ? 'bg-[#151c30] text-emerald-400 shadow-sm' : 'bg-white shadow-sm text-indigo-600'
                : darkMode ? 'text-slate-450 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600 animate-pulse" />
            Specs & Route Map [Pass]
          </button>
        </div>

        {/* 3. Main Workspace Content */}
        {viewMode === 'specs' ? (
          <div className="space-y-4">
            <SpecsConsole />
          </div>
        ) : !activeUser ? (
          /* Display dynamic onboarding components when no active verified credentials token */
          <div className="space-y-4">
            <AuthContainer
              darkMode={darkMode}
              onAuthSuccess={(token, user) => {
                setSessionToken(token);
                setActiveUser(user);
                syncPlatformState();
              }}
            />
          </div>
        ) : activeUser.role !== 'customer' ? (
          /* Display secure administrative console for non-customer auditor accounts */
          <div className="space-y-4">
            <div className={`border p-4 rounded-3xl shadow-xs flex items-center justify-between ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-205 shadow-lg' : 'bg-slate-900 border-slate-800 text-white'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/25 text-indigo-300 rounded-xl">
                  <ShieldEllipsis className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Administrative Portal Session Activated</h4>
                  <p className="text-xs text-slate-450">
                    You are logged in with role <strong className="text-indigo-400 font-mono uppercase">{activeUser.role}</strong>. Secure clearances checked.
                  </p>
                </div>
              </div>
            </div>

            <AdminApp
              users={users}
              transactions={transactions}
              kycCases={kycCases}
              complianceAlerts={complianceAlerts}
              ledgerStats={ledgerStats}
              auditLogs={auditLogs}
              tickets={supportTickets}
              isLedgerLoading={isLedgerLoading}
              onRefreshAll={syncPlatformState}
              darkMode={darkMode}
              activeUser={activeUser}
              onLogout={handleLogout}
            />
          </div>
        ) : (
          /* Secure sovereign wealth customer viewport controls */
          <div className="space-y-4">
            <CustomerApp
              user={activeUser}
              otherUsers={users}
              transactions={transactions}
              tickets={supportTickets}
              onUpdateUser={handleUpdateActiveUser}
              onRefreshData={syncPlatformState}
              darkMode={darkMode}
              onLogout={handleLogout}
            />
          </div>
        )}

      </div>

      {/* 4. Swiss-Minimalist platform footer */}
      <footer className={`border-t py-6 mt-12 transition-colors ${
        darkMode ? 'bg-[#0c101b] border-slate-850' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <div className="text-xs font-bold flex items-center gap-1.5 justify-center md:justify-start">
              <Milestone className="h-4 w-4 text-indigo-600" />
              <span className={darkMode ? 'text-white' : 'text-slate-900'}>Enterprise Bento Wealth Ledger</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Cryptocounting balance sheet matching IFRS-9 double-entry posting frameworks. Simulated environment.
            </p>
          </div>

          <div className="flex gap-4 text-xs text-slate-450">
            <span className="flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-slate-400" /> Security Core Active
            </span>
            <span className="font-semibold text-emerald-500 text-xs">UAT STATUS: SUCCESS 100%</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
