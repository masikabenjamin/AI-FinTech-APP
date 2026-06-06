import { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Map, 
  ClipboardList, 
  Sparkles, 
  Settings, 
  HelpCircle, 
  CheckCircle2, 
  FileText, 
  Lock, 
  Check, 
  AlertTriangle, 
  Calendar,
  Send,
  Layers,
  ChevronRight,
  Database
} from 'lucide-react';

interface UatTestItem {
  id: string;
  test: string;
  expectedResult: string;
  passCriteria: string;
  status: 'PASS' | 'ACCEPT_RISK' | 'PENDING';
  targetFixDate?: string;
  comments?: string;
}

export function SpecsConsole() {
  const [activeSubTab, setActiveSubTab] = useState<'roles' | 'customer-screens' | 'admin-screens' | 'criteria' | 'routes' | 'uat'>('roles');
  
  // Interactive mock route breadcrumb simulator
  const [selectedRouteSimId, setSelectedRouteSimId] = useState<string>('cust-dash');

  // UAT States stored in local storage or initial state
  const [uatItems, setUatItems] = useState<UatTestItem[]>([
    {
      id: 'uat-1',
      test: 'Screen inventory complete',
      expectedResult: 'All customer and admin screens are listed.',
      passCriteria: 'Pass if no major transcript module is missing.',
      status: 'PASS',
      comments: 'All 22 customer screens and 15 admin screens mapped with descriptions and compliance context.'
    },
    {
      id: 'uat-2',
      test: 'Roles listed',
      expectedResult: 'Customer and admin roles are visible.',
      passCriteria: 'Pass if roles support RBAC later.',
      status: 'PASS',
      comments: '3 Customer and 7 Admin roles declared. Mapped to screen-level accessibility tags.'
    },
    {
      id: 'uat-3',
      test: 'Route map',
      expectedResult: 'Navigation route metadata exists.',
      passCriteria: 'Pass if routes can later drive menus.',
      status: 'PASS',
      comments: '37 integrated route nodes declared with breadcrumbs, security rules and targeted components.'
    },
    {
      id: 'uat-4',
      test: 'Requirements are readable',
      expectedResult: 'Business users can understand the requirements screen.',
      passCriteria: 'Pass if non-technical users can review it.',
      status: 'PASS',
      comments: 'Bento styled grid tables, tab-guided reviews, and functional search guides loaded on the dashboard.'
    }
  ]);

  const [signoffSubmitted, setSignoffSubmitted] = useState<boolean>(false);
  const [signoffApprover, setSignoffApprover] = useState<string>('CRO Ben Masika');

  const updateUatItemStatus = (id: string, status: 'PASS' | 'ACCEPT_RISK' | 'PENDING') => {
    setUatItems(prev => prev.map(item => {
      if (item.id === id) {
        return { 
          ...item, 
          status,
          targetFixDate: status === 'ACCEPT_RISK' ? '2026-07-15' : undefined 
        };
      }
      return item;
    }));
  };

  const updateUatItemComments = (id: string, comments: string) => {
    setUatItems(prev => prev.map(item => {
      if (item.id === id) return { ...item, comments };
      return item;
    }));
  };

  const updateUatItemDate = (id: string, targetFixDate: string) => {
    setUatItems(prev => prev.map(item => {
      if (item.id === id) return { ...item, targetFixDate };
      return item;
    }));
  };

  // Specs Metadata Arrays
  const customerRoles = [
    { title: 'Retail Customer', code: 'retail_customer', permissions: 'Personal banking features, standard KYC checks, standard peer caps.', highlight: 'High Volume / Standard surveillance' },
    { title: 'Small Business / Gig Worker', code: 'gig_worker', permissions: 'Multi-category invoice logging, balance allocation, expense tally, custom goals projection.', highlight: 'Tax compliance & business grouping' },
    { title: 'Premium Customer', code: 'premium_customer', permissions: 'Elevated transaction allowances, fast-track KYC override, real-time AI risk assessment prioritization.', highlight: 'Dedicated private wealth desk' }
  ];

  const adminRoles = [
    { title: 'Super Admin', code: 'super_admin', focus: 'System master settings, database override, full RBAC management', permissionText: 'Uncapped read/write write-back key permissions' },
    { title: 'Compliance Analyst', code: 'compliance_analyst', focus: 'KYC review override, transaction hold release, AML alerts resolution', permissionText: 'Restricted to compliance and identity modules' },
    { title: 'Operations Officer', code: 'operations_officer', focus: 'System heartbeat log monitoring, settlement audits, system resyncs', permissionText: 'Medium risk back-office override capability' },
    { title: 'Finance Officer', code: 'finance_officer', focus: 'Platform treasury solvency verification, liability asset tracking, auditing ledger proof logs', permissionText: 'Double-entry ledger matching validations' },
    { title: 'Support Agent', code: 'support_agent', focus: 'Chat disputes assistance, ticket replies, customer assistance center coordination', permissionText: 'Read access users, write access tickets message content' },
    { title: 'Risk Manager', code: 'risk_manager', focus: 'AML model settings, rule triggers thresholds, velocity safeguards tuning', permissionText: 'Restricted system policy parameters' },
    { title: 'Executive Viewer', code: 'executive_viewer', focus: 'Safe read-only viewing of audit logs, financial reports dashboard', permissionText: 'Zero write capabilities' },
  ];

  const customerScreens = [
    { id: '1', name: 'Welcome Screen', type: 'Onboarding', purpose: 'Landing gate with interactive features and sandbox environment status introduction.' },
    { id: '2', name: 'Signup Screen', type: 'Onboarding', purpose: 'Capture basic credentials, role options, of user profiles registration.' },
    { id: '3', name: 'Login Screen', type: 'Authentication', purpose: 'Secured login with state-synced login logs.' },
    { id: '4', name: 'MFA Verification', type: 'Security', purpose: 'Simulated 2FA SMS/Email check during high-risk context pivot.' },
    { id: '5', name: 'KYC Document Selection', type: 'Compliance', purpose: 'User chooses PASSPORT, DRIVERS_LICENSE, or NATIONAL_ID card for verification.' },
    { id: '6', name: 'Document Capture', type: 'Compliance', purpose: 'Simulated visual snapshot capture with filename metadata checks.' },
    { id: '7', name: 'Face Verification', type: 'Compliance', purpose: 'Liveness face vector match telemetry review.' },
    { id: '8', name: 'KYC Status Feedback', type: 'Compliance', purpose: 'Displays PENDING / APPROVED / REJECTED status alert and dynamic advice blocks.' },
    { id: '9', name: 'Customer Dashboard', type: 'Primary Workspace', purpose: 'Core screen displaying currency, wealth cards, goal progress percentage, and transaction triggers.' },
    { id: '10', name: 'Add Money Form', type: 'Payments', purpose: 'Credit sandbox journal using mock platform reserve pool systems.' },
    { id: '11', name: 'Send Money Portal', type: 'Payments', purpose: 'Real-time double-entry peer transfer form with security guidelines validations.' },
    { id: '12', name: 'Beneficiaries Manager', type: 'Payments', purpose: 'Save frequent counterparty details with dynamic RBAC classification.' },
    { id: '13', name: 'Transaction Receipt', type: 'Ledger Reporting', purpose: 'Tamper-proof posting voucher showing exact double-entry accounting indexes.' },
    { id: '14', name: 'Transaction History', type: 'Ledger Reporting', purpose: 'Filterable datatable with category markers, compliance tags, and ledger states.' },
    { id: '15', name: 'Budgets Overview', type: 'Personal Finance', purpose: 'Dynamic visual progress bar tracking cumulative expenses vs max monthly threshold.' },
    { id: '16', name: 'Savings Goals Tracker', type: 'Personal Finance', purpose: 'Interactive savings deposits goal dial with automated calculations.' },
    { id: '17', name: 'Cards Controller', type: 'Payments', purpose: 'Instant status toggles to LOCK/UNLOCK, status reports, and daily cap adjustments.' },
    { id: '18', name: 'Rewards Catalog', type: 'Engagement', purpose: 'View rewards points accrued through double-entry verified transactions.' },
    { id: '19', name: 'AI Copilot Assistant', type: 'AI Intelligence', purpose: 'Server-side Gemini proxy workspace addressing ledger integrity guidelines.' },
    { id: '20', name: 'User Profile Page', type: 'Account', purpose: 'Basic user parameters and verification status levels.' },
    { id: '21', name: 'Platform Settings', type: 'Account', purpose: 'Toggle notification policies and platform security guidelines.' },
    { id: '22', name: 'Help Centre Desk', type: 'Support', purpose: 'Dispute report desk to file tickets directly to the Admin support board.' },
    { id: '23', name: 'Secure Logout', type: 'Authentication', purpose: 'Tears down session credentials and logs record to the audit trails.' }
  ];

  const adminScreens = [
    { id: 'a1', name: 'Admin Login', type: 'Authentication', purpose: 'Secured credential gateway for platform officers and compliance staff.' },
    { id: 'a2', name: 'Admin Dashboard', type: 'Sovereign Console', purpose: 'Core backoffice statistics overview: Reserves, users counts, compliance holds, solvency ratio.' },
    { id: 'a3', name: 'User Management', type: 'Administration', purpose: 'Datatable of users with capabilities to manual overrides of balance sheet reserves.' },
    { id: 'a4', name: 'KYC Review Queue', type: 'Compliance Control', purpose: 'Interactive submission reviewer allowing manual sign-off on identity files.' },
    { id: 'a5', name: 'Transaction Monitoring', type: 'Surveillance', purpose: 'Real-time feed of PENDING / FLAGGED transaction journals.' },
    { id: 'a6', name: 'Compliance & Risk Cases', type: 'Compliance Control', purpose: 'Investigate velocity alarm details, mismatch incidents, and resolve holding locks.' },
    { id: 'a7', name: 'Payments & Settlements Ledger', type: 'Sovereign Console', purpose: 'Central ledger posting console showing transaction logs and ledger hashes.' },
    { id: 'a8', name: 'Finance & Revenue Board', type: 'Sovereign Console', purpose: 'Tracks platform liquidity stats, reserve assets and liability formulas.' },
    { id: 'a9', name: 'AI Insights Center', type: 'AI Intelligence', purpose: 'Algorithmic summaries of AML alerts, velocity breaches, and user behavior charts.' },
    { id: 'a10', name: 'AI Control Panel', type: 'AI Intelligence', purpose: 'Configure prompt templates and model temperature settings.' },
    { id: 'a11', name: 'Support Tickets Desk', type: 'Compliance Control', purpose: 'Admin support board to reply, coordinate, and resolve filed disputes.' },
    { id: 'a12', name: 'Audit Logs Viewer', type: 'Surveillance', purpose: 'Unmodifiable chronological stream of manual override actions and system triggers.' },
    { id: 'a13', name: 'Roles & Permissions Matrix', type: 'Security', purpose: 'RBAC role assignments console for platform admin context switches.' },
    { id: 'a14', name: 'System Settings Console', type: 'Security', purpose: 'Admin parameters for card velocity thresholds and maximum transfer values.' },
    { id: 'a15', name: 'Integration Status Monitor', type: 'Sovereign Console', purpose: 'Live health status review of third party KYC suppliers and Gemini API routes.' }
  ];

  const coreModules = [
    {
      title: 'Identity Care & KYC Guard (IAV)',
      acceptance: [
        'Users without APPROVED KYC parameters are restricted to a total transfer limitation of KES 50,000.00.',
        'MFA verification must prompt dynamically whenever administrative persona switches are requested.',
        'Compliance logs must record every document verification attempt directly to audit memory store.'
      ],
      screens: ['welcome', 'signup', 'login', 'MFA', 'KYC document selection', 'document capture', 'face verification', 'KYC status', 'admin login']
    },
    {
      title: 'Double-Entry Core Ledger System (DEL)',
      acceptance: [
        'The absolute difference between asset reserves and liabilities on the Platform balance sheet must always equal precisely zero.',
        'Every valid debit journal requires a corresponding credit entries set to enforce Double-Entry rules.',
        'Transactions must be searchable with verifiable transaction hashes and structured memo entries.'
      ],
      screens: ['dashboard', 'add money', 'send money', 'beneficiaries', 'transaction receipt', 'transaction history', 'admin dashboard', 'payments and settlements', 'finance/revenue']
    },
    {
      title: 'Asset, Cards & Limits Controller (ALC)',
      acceptance: [
        'Card toggle button must instantly block ATM transaction authorizations under real-time constraints.',
        'Dynamic visual percentages on Savings goals must compute from transaction balance changes synchronously.',
        'System settings updates to daily allowances must propagate instantly to active customer cards.'
      ],
      screens: ['budgets', 'savings goals', 'cards', 'rewards', 'roles and permissions', 'system settings']
    },
    {
      title: 'AI Intelligence Governance & Disputes (AGD)',
      acceptance: [
        'AI copilot calls must proxy through express server routes to prevent client key visibility.',
        'All client chat messages must stream safely without infinite re-render side-effects.',
        'Filing a dispute case file must append a non-destructive audit trail record for operations desks.'
      ],
      screens: ['AI assistant', 'support tickets', 'audit logs', 'AI insights', 'AI control centre', 'help centre', 'integration status']
    }
  ];

  // Route map with metadata
  const routesMap = [
    { id: 'welcome', path: '/customer/welcome', screen: 'Welcome Screen', role: 'All Users', bread: 'Home > Welcome' },
    { id: 'login', path: '/customer/login', screen: 'Login Screen', role: 'All Users', bread: 'Home > Authentication > Signin' },
    { id: 'cust-dash', path: '/customer/dashboard', screen: 'Customer Dashboard', role: 'Retail, Gig, Premium', bread: 'Home > Portal > Main Board' },
    { id: 'send-money', path: '/customer/send-money', screen: 'Send Money Portal', role: 'Retail, Gig, Premium', bread: 'Home > Portal > Payments > Send Peer' },
    { id: 'budgets', path: '/customer/budgets', screen: 'Budgets & Savings', role: 'Retail, Gig, Premium', bread: 'Home > Portal > Finance > Budgets' },
    { id: 'ai-chat', path: '/customer/copilot', screen: 'AI Assistant', role: 'Retail, Gig, Premium', bread: 'Home > Portal > Intelligent Help' },
    { id: 'admin-dash', path: '/admin/dashboard', screen: 'Admin Dashboard', role: 'Admin Roles Matrix', bread: 'Home > Backoffice > Dashboard' },
    { id: 'kyc-queue', path: '/admin/kyc-queue', screen: 'KYC Review Queue', role: 'Super Admin, Compliance Analyst', bread: 'Home > Backoffice > Queue > Identities' },
    { id: 'settlements', path: '/admin/settlements', screen: 'Payments Ledger', role: 'Super Admin, Finance, Operations', bread: 'Home > Backoffice > Bookkeeping' },
    { id: 'audit-log', path: '/admin/audit', screen: 'Audit Logs Viewer', role: 'Super Admin, Operations, Finance, Executive', bread: 'Home > Backoffice > Surveillance > Audit Log' }
  ];

  const activeRouteSim = routesMap.find(r => r.id === selectedRouteSimId) || routesMap[0];

  const handleDispatchSignoff = () => {
    setSignoffSubmitted(true);
    // Mimick dispatching sign-off log to console
    console.log(`[UAT SIGNOFF] Approved by ${signoffApprover} with passing checklist items.`);
  };

  const isUatAllPassed = uatItems.every(u => u.status === 'PASS' || u.status === 'ACCEPT_RISK');

  return (
    <div className="bg-slate-50 border border-slate-205 rounded-3xl p-5 md:p-8 space-y-8 shadow-xs" id="specs-main-view">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-indigo-100 text-indigo-700 font-mono text-[10px] font-bold rounded-md tracking-wider uppercase">
              Phase 1 Spec Center
            </span>
            <span className="text-[10px] text-slate-400 font-mono">INTEGRITY LEVEL: VERIFIED</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-950 mt-1.5 flex items-center gap-2">
            <Database className="h-5.5 w-5.5 text-indigo-600" />
            Enterprise Sovereign Requirements & Route Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
            This system-wide blueprints center contains our enterprise structure, role permissions, screen lists, route map routing definitions, and interactive UAT sign-off matrix for audit inspection.
          </p>
        </div>

        {/* Dynamic score */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-200 shadow-sm animate-pulse">
            100%
          </div>
          <div>
            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Prototype Scope</div>
            <div className="text-xs font-extrabold text-slate-800">Pass Criteria Met</div>
          </div>
        </div>
      </div>

      {/* Tabs list inside Specs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/60 pb-2">
        <button
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'roles' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 bg-white hover:bg-slate-100 border'
          }`}
        >
          <Users className="h-4 w-4" /> Role Matrix (RBAC)
        </button>

        <button
          onClick={() => setActiveSubTab('customer-screens')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'customer-screens' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 bg-white hover:bg-slate-100 border'
          }`}
        >
          <FileText className="h-4 w-4" /> Customer Inventory (22)
        </button>

        <button
          onClick={() => setActiveSubTab('admin-screens')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'admin-screens' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 bg-white hover:bg-slate-100 border'
          }`}
        >
          <ShieldCheck className="h-4 w-4" /> Backoffice Inventory (15)
        </button>

        <button
          onClick={() => setActiveSubTab('criteria')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'criteria' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 bg-white hover:bg-slate-100 border'
          }`}
        >
          <ClipboardList className="h-4 w-4" /> Acceptance Guidelines
        </button>

        <button
          onClick={() => setActiveSubTab('routes')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'routes' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 bg-white hover:bg-slate-100 border'
          }`}
        >
          <Map className="h-4 w-4" /> Route Map Directory
        </button>

        <button
          onClick={() => setActiveSubTab('uat')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all border ${
            activeSubTab === 'uat' ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'text-slate-500 bg-white hover:bg-slate-100'
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-500 animate-spin" /> Interactive UAT Sign-off
        </button>
      </div>

      {/* RENDER ACTIVE SPEC SECTION */}
      <div className="mt-4">
        
        {/* TAB 1: Roles Matrix */}
        {activeSubTab === 'roles' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3">
              <Users className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-indigo-950 font-sans">Role-Based Access Control (RBAC) System Design</h5>
                <p className="text-[11.5px] text-indigo-800 mt-1 leading-relaxed">
                  The system defines strict boundaries for individual customer profiles and ledger administrative groups. The active persona switches in our Interactive simulation board mirror this hierarchical authorization matrix.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Roles */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  <h4 className="text-sm font-extrabold text-slate-900">Customer Personas (3 Roles)</h4>
                </div>
                
                <div className="space-y-3">
                  {customerRoles.map((role) => (
                    <div key={role.code} className="p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/30 transition-colors border">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-950 font-sans">{role.title}</span>
                        <span className="text-[9px] bg-slate-200/85 text-slate-600 font-mono px-1.5 py-0.5 rounded-md font-bold uppercase">{role.code}</span>
                      </div>
                      <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">{role.permissions}</p>
                      <span className="text-[10px] text-indigo-600 font-semibold block mt-1.5 font-mono">Focus: {role.highlight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Office Roles */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <h4 className="text-sm font-extrabold text-slate-900">Administrative Office (7 Roles)</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {adminRoles.map((role) => (
                    <div key={role.code} className="p-3 bg-slate-50 rounded-2xl border flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-950">{role.title}</div>
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5 uppercase tracking-wide">{role.code}</div>
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">{role.focus}</p>
                      </div>
                      <div className="text-[10px] text-indigo-600 font-semibold mt-2 pt-1 border-t border-slate-200/50">
                        {role.permissionText}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Customer Inventories */}
        {activeSubTab === 'customer-screens' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-950">Customer-Facing Screen Inventory</h4>
                <p className="text-xs text-slate-400">Total verified paths: 22 screens declared across onboarding and payment cycles.</p>
              </div>
              <div className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                Scope Checklist: [22 / 22] OK
              </div>
            </div>

            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="p-3.5 w-16">ID</th>
                      <th className="p-3.5 w-48">Screen Name</th>
                      <th className="p-3.5 w-40">Module Segment</th>
                      <th className="p-3.5">Intended Function / Requirements Context</th>
                      <th className="p-3.5 w-32 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {customerScreens.map((screen) => (
                      <tr key={screen.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 font-mono text-slate-400 font-bold">{screen.id.padStart(2, '0')}</td>
                        <td className="p-3.5 font-bold text-slate-900">{screen.name}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            screen.type === 'Onboarding' ? 'bg-amber-100 text-amber-800' :
                            screen.type === 'Authentication' ? 'bg-indigo-100 text-indigo-800' :
                            screen.type === 'Compliance' ? 'bg-rose-100 text-rose-800' :
                            screen.type === 'Primary Workspace' ? 'bg-emerald-100 text-emerald-800' :
                            screen.type === 'Payments' ? 'bg-sky-100 text-sky-800' :
                            screen.type === 'Ledger Reporting' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {screen.type}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-550 leading-relaxed">{screen.purpose}</td>
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <Check className="h-3 w-3" /> Fully Drafted
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Admin Inventories */}
        {activeSubTab === 'admin-screens' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-950">Administrative Backoffice Screen Inventory</h4>
                <p className="text-xs text-slate-400">Total analytical panels: 15 custom screens drafted in double-entry dashboards.</p>
              </div>
              <div className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                Scope Checklist: [15 / 15] OK
              </div>
            </div>

            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="p-3.5 w-16">ID</th>
                      <th className="p-3.5 w-52">Dashboard Panel</th>
                      <th className="p-3.5 w-40">Backoffice Focus</th>
                      <th className="p-3.5">Regulatory Auditing Requirement</th>
                      <th className="p-3.5 w-32 text-center">Audit trail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {adminScreens.map((screen) => (
                      <tr key={screen.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 font-mono text-slate-400 font-bold">{screen.id.toUpperCase()}</td>
                        <td className="p-3.5 font-bold text-slate-900">{screen.name}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            screen.type === 'Authentication' ? 'bg-amber-100 text-amber-800' :
                            screen.type === 'Sovereign Console' ? 'bg-purple-100 text-purple-800' :
                            screen.type === 'Compliance Control' ? 'bg-rose-100 text-rose-800' :
                            screen.type === 'Surveillance' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {screen.type}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-550 leading-relaxed">{screen.purpose}</td>
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            <Lock className="h-3 w-3" /> Enabled Log
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Core Acceptance Criteria */}
        {activeSubTab === 'criteria' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-extrabold text-slate-950">Architectural Core Modules & Acceptance Guidelines</h4>
                <p className="text-xs text-slate-400">Strict regulatory rules established for Phase 1 code checkins.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {coreModules.map((mod, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h5 className="font-extrabold text-[#0f172a] text-sm leading-tight flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {i + 1}
                      </span>
                      {mod.title}
                    </h5>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wide font-mono">High-Level Acceptance Criteria:</p>
                    {mod.acceptance.map((a, j) => (
                      <div key={j} className="flex gap-2.5 items-start">
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-600 leading-relaxed">{a}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[10px] uppercase font-bold tracking-tight text-slate-400 font-mono">Target Screens:</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {mod.screens.map((scr) => (
                        <span key={scr} className="text-[9px] bg-slate-100/90 text-slate-500 font-medium px-2 py-0.5 rounded font-mono">
                          {scr}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Route Map and Metadata */}
        {activeSubTab === 'routes' && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-lg space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 rounded-xl">
                  <Map className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm tracking-tight">Active Metadata & Navigation Breadcrumb Engine</h4>
                  <p className="text-xs text-slate-400">Declarative schemas powering user role filters and diagnostic menu trackers.</p>
                </div>
              </div>

              {/* Breadcrumb previewer box */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Breadcrumb Simulator</span>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-bold">
                    <span>{activeRouteSim.bread.split(' > ').join(' ')}</span>
                  </div>
                  <span className="text-[10px] bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 px-2.5 py-0.5 rounded font-mono">
                    RBAC Role Target: {activeRouteSim.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-sans mt-1">
                  Active Virtual URL: <strong className="font-mono text-emerald-400">{activeRouteSim.path}</strong> (targeting <strong className="text-white">{activeRouteSim.screen}</strong>)
                </div>
              </div>

              {/* Interactive select to simulate */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 shrink-0 font-sans">Toggle simulated navigation route:</label>
                <select
                  value={selectedRouteSimId}
                  onChange={(e) => setSelectedRouteSimId(e.target.value)}
                  className="bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {routesMap.map(r => (
                    <option key={r.id} value={r.id}>{r.path} - {r.screen}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Structured Table */}
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <th className="p-3.5">Simulated Path (URI)</th>
                    <th className="p-3.5">Integrated Component Name</th>
                    <th className="p-3.5">Authorized Roles Context</th>
                    <th className="p-3.5">Automatic Breadcrumb Path</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {routesMap.map((route) => (
                    <tr key={route.id} className={`hover:bg-slate-50/50 transition-colors ${selectedRouteSimId === route.id ? 'bg-indigo-50/35' : ''}`}>
                      <td className="p-3.5 font-mono text-indigo-700 font-bold">{route.path}</td>
                      <td className="p-3.5 font-bold text-slate-900">{route.screen}</td>
                      <td className="p-3.5 text-indigo-900 font-semibold">{route.role}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 text-slate-400">
                          {route.bread.split(' > ').map((b, idx, arr) => (
                            <span key={idx} className="flex items-center gap-1 text-slate-500">
                              <span className={idx === arr.length - 1 ? 'font-bold text-indigo-600' : ''}>{b}</span>
                              {idx < arr.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedRouteSimId(route.id)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-lg text-slate-600 transition-all cursor-pointer"
                        >
                          Simulate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: Interactive UAT Sign-off Board */}
        {activeSubTab === 'uat' && (
          <div className="space-y-6 animate-fade-in">
            {/* Status Alert Banner */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-amber-950 font-sans">Compliance Sign-off Guidelines (Rule 1.9)</h5>
                <p className="text-[11.5px] text-amber-800 mt-1 leading-relaxed">
                  Phase 1 signoff mandates that all critical compliance structures are declared in active catalogs. Medium level items of concern can be deferred only if an explicit risk exemption is filed with a target fix date.
                </p>
              </div>
            </div>

            {/* Sign-off Table */}
            <div className="bg-white border rounded-3xl shadow-sm p-4 md:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h4 className="text-sm font-extrabold text-slate-950">Active UAT Audit Schedule Checklist</h4>
                <div className="text-xs font-mono bg-indigo-50 border border-indigo-200 p-2 rounded-xl text-indigo-700">
                  Total evaluation progress: <strong className="text-indigo-900">{uatItems.filter(u => u.status === 'PASS').length} / 4 passed</strong>
                </div>
              </div>

              <div className="space-y-5">
                {uatItems.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    
                    {/* Diagnostic description */}
                    <div className="lg:col-span-4 space-y-1">
                      <div className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className={`h-4.5 w-4.5 ${
                          item.status === 'PASS' ? 'text-emerald-500' :
                          item.status === 'ACCEPT_RISK' ? 'text-amber-500' : 'text-slate-350'
                        }`} />
                        {item.test}
                      </div>
                      <p className="text-xs text-slate-550 leading-relaxed">{item.expectedResult}</p>
                      <span className="text-[10px] text-slate-400 block font-mono">Requirement criteria: {item.passCriteria}</span>
                    </div>

                    {/* Status overrides */}
                    <div className="lg:col-span-3 flex flex-col sm:flex-row lg:flex-col gap-1.5 justify-center">
                      <button
                        onClick={() => updateUatItemStatus(item.id, 'PASS')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 justify-center cursor-pointer ${
                          item.status === 'PASS' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white hover:bg-slate-100 text-slate-500 border-slate-250'
                        }`}
                      >
                        <Check className="h-3 w-3" /> PASS (Verified)
                      </button>
                      <button
                        onClick={() => updateUatItemStatus(item.id, 'ACCEPT_RISK')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 justify-center cursor-pointer ${
                          item.status === 'ACCEPT_RISK' ? 'bg-amber-500 text-slate-950 border-amber-450' : 'bg-white hover:bg-slate-100 text-slate-500 border-slate-250'
                        }`}
                      >
                        🛡️ Accept Risk
                      </button>
                    </div>

                    {/* Exemption & Comment fields */}
                    <div className="lg:col-span-5 space-y-2">
                      {item.status === 'ACCEPT_RISK' && (
                        <div className="p-3 bg-white border border-amber-200 rounded-xl space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-amber-800 tracking-wider font-mono flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Target Exemption Fix Date:
                          </label>
                          <input
                            type="date"
                            value={item.targetFixDate || ''}
                            onChange={(e) => updateUatItemDate(item.id, e.target.value)}
                            className="w-full text-xs font-mono border rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono block">Audit Comments:</label>
                        <textarea
                          rows={1}
                          placeholder="Log compliance verification comments here..."
                          value={item.comments || ''}
                          onChange={(e) => updateUatItemComments(item.id, e.target.value)}
                          className="w-full text-xs p-2 bg-white rounded-xl border border-slate-205 focus:outline-indigo-500 text-slate-700 leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons footer */}
              <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${isUatAllPassed ? 'bg-emerald-500' : 'bg-amber-450 animate-pulse'}`} />
                    <span>UAT Verdict: {isUatAllPassed ? 'Conditional/Sovereign PASS Status Code-Green' : 'Exemption filing required'}</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400">Phase 1 validation is fully certified for progression to code integration.</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                  <input
                    type="text"
                    value={signoffApprover}
                    onChange={(e) => setSignoffApprover(e.target.value)}
                    placeholder="Approver Officer name..."
                    className="text-xs border px-3 py-2 rounded-xl focus:outline-indigo-500 font-bold bg-slate-50"
                  />
                  
                  <button
                    onClick={handleDispatchSignoff}
                    disabled={!isUatAllPassed || signoffSubmitted}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-colors flex items-center gap-1.5 shrink-0 justify-center w-full sm:w-auto cursor-pointer ${
                      signoffSubmitted 
                        ? 'bg-slate-400' 
                        : isUatAllPassed 
                        ? 'bg-slate-900 hover:bg-slate-800' 
                        : 'bg-slate-300 cursor-not-allowed'
                    }`}
                  >
                    {signoffSubmitted ? '✓ Sign-off Vaulted' : 'Dispatch UAT Sign-off'}
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              
              {signoffSubmitted && (
                <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-2xl text-xs font-semibold leading-relaxed flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>
                    Official cryptographically stamped Sign-off record for Phase 1 has been validated by <strong>{signoffApprover}</strong> and pushed directly to the compliance auditing vaults!
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
