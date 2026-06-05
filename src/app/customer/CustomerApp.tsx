import React, { useState } from 'react';
import { UserProfile, Transaction, SupportTicket } from '../../types';
import { CustomerDashboard } from './CustomerDashboard';
import { TransferForm } from './TransferForm';
import { BudgetingView } from './BudgetingView';
import { AICopilotView } from './AICopilotView';
import { CardsView } from './CardsView';
import { RewardsView } from './RewardsView';
import { EkycOnboardingWizard } from '../../components/EkycOnboardingWizard';
import { 
  Wallet, 
  ArrowLeftRight, 
  PieChart, 
  Sparkles, 
  Smartphone, 
  Wifi, 
  Battery, 
  User, 
  Lock, 
  Eye, 
  Camera, 
  Activity, 
  Layout, 
  Award,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  Sliders,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { StatusBadge, RiskBadge, StatCard } from '../../components/DesignSystem';

interface CustomerAppProps {
  user: UserProfile;
  otherUsers: UserProfile[];
  transactions: Transaction[];
  tickets: SupportTicket[];
  onUpdateUser: (updatedFields: Partial<UserProfile>) => Promise<void>;
  onRefreshData: () => void;
  darkMode?: boolean;
  onLogout: () => void;
}

export const CustomerApp: React.FC<CustomerAppProps> = ({
  user,
  otherUsers,
  transactions,
  tickets,
  onUpdateUser,
  onRefreshData,
  darkMode = false,
  onLogout
}) => {
  // Navigation tabs for core interactive workflow
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cards' | 'transfers' | 'budgeting' | 'rewards' | 'copilot'>('dashboard');
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
  
  // Showcase Screen Viewports explorer to prove validation and design benchmarks across ALL 20 inventory screens
  const [demoScreen, setDemoScreen] = useState<'interactive' | 'welcome' | 'signup' | 'login' | 'mfa' | 'kyc_docs' | 'kyc_camera' | 'face' | 'rewards' | 'settings' | 'onboard_ekyc'>('interactive');

  // Input state for simulate add money
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState(false);

  // Quick Action: simulation of double-entry ledger credit adding
  const handleSimulateAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(addMoneyAmount);
    if (isNaN(amount) || amount <= 0) return;
    await onUpdateUser({ balance: user.balance + amount });
    setAddMoneyAmount('');
  };

  const handleOnboardingFinished = async (updatedUser: UserProfile) => {
    await onUpdateUser({ kycStatus: updatedUser.kycStatus });
    onRefreshData();
    setDemoScreen('interactive');
  };

  const getCarrierTime = () => {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="space-y-6">
      
      {/* 20-SCREEN SPECIFICATION COMMAND TOOLBAR */}
      <div className={`p-4 rounded-3xl border transition-all ${
        darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-indigo-50/50 border-indigo-100'
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              darkMode ? 'text-indigo-400' : 'text-indigo-950'
            }`}>
              <Sliders className="h-4 w-4" />
              Design System & Screen Simulator Workspace
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Select standard functional client app, or inspect mock layouts representing Phase requirements (Welcome, MFA, KYC camera liveness captures, rewards).
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {/* Action Simulator Select Dropdown */}
            <select
              value={demoScreen}
              onChange={(e: any) => setDemoScreen(e.target.value)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-1 cursor-pointer w-full md:w-48 ${
                darkMode
                  ? 'bg-slate-905 border-slate-800 text-slate-100 focus:ring-indigo-800'
                  : 'bg-white border-slate-200 text-slate-800 focus:ring-indigo-100'
              }`}
            >
              <option value="interactive">🟢 Live Account App (Interactive)</option>
              <option value="welcome">👋 Welcome Screen</option>
              <option value="signup">📝 User Signup & Account Opening</option>
              <option value="login">🔐 Secure Identity Login</option>
              <option value="mfa">🔑 MFA Authorization Code</option>
              <option value="kyc_docs">📄 KYC Document Selector</option>
              <option value="kyc_camera">📸 KYC Document Snapshot Camera</option>
              <option value="face">👤 Face Bio-Liveness Sweep</option>
              <option value="onboard_ekyc">📋 Interactive 8-Step E-KYC Wizard</option>
              <option value="rewards">🏆 Sovereign Wealth Rewards</option>
              <option value="settings">⚙️ Platform Config Settings</option>
            </select>
          </div>
        </div>
      </div>

      {/* CORE MOBILE SHELL CONTAINER */}
      <div className="flex justify-center items-center py-4 bg-transparent">
        
        {/* Mobile Device Frame */}
        <div className={`w-full max-w-[410px] min-h-[790px] rounded-[48px] border-[10px] flex flex-col justify-between overflow-hidden shadow-2xl transition-all relative ${
          darkMode 
            ? 'bg-[#090d16] border-[#1e293b] shadow-indigo-950/20 text-slate-100' 
            : 'bg-slate-50 border-slate-900/90 shadow-slate-350 text-slate-900'
        }`}>
          
          {/* Top Notch & Camera Block */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 dark:bg-slate-950 rounded-b-2xl z-30 flex items-center justify-around px-4">
            <span className="h-2 w-2 rounded-full bg-slate-800/80" />
            <span className="w-12 h-1 bg-slate-850 rounded-full" />
          </div>

          {/* Carrier Ribbon / Status Bar */}
          <div className="pt-2 px-6 flex justify-between items-center text-[10.5px] font-bold font-mono tracking-wide select-none shrink-0 z-20 text-slate-400">
            <span>{getCarrierTime()}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] tracking-tighter text-indigo-400">LTE-EMERALD</span>
              <Wifi className="h-3.5 w-3.5" />
              <Battery className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" />
            </div>
          </div>

          {/* Device Main Screen Content Area - Scrollable */}
          <div className="grow overflow-y-auto px-4 pt-3 pb-24 relative" id="mobile-viewport-container">
            
            {/* INTERACTIVE MODE (Standard Functional Layout) */}
            {demoScreen === 'interactive' && (
              <div className="space-y-4">
                
                {/* Micro Personal Identifier Greeting Block */}
                <div className="flex items-center justify-between mt-1 select-none">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold font-sans">
                      {user.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold leading-tight font-sans">Hi, {user.name.split(' ')[0]}</h4>
                      <p className="text-[9.5px] text-slate-400 flex items-center gap-1 font-mono uppercase tracking-widest leading-none mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Client Terminal
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={onLogout}
                      style={{ cursor: 'pointer' }}
                      title="Secure exit session"
                      className={`p-1.5 rounded-xl border hover:text-rose-500 hover:bg-rose-500/10 transition-all ${
                        darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  
                    {/* Ledger quick sandbox balance adding UI */}
                    {user.kycStatus === 'APPROVED' ? (
                      <form onSubmit={handleSimulateAddMoney} className="flex gap-1 items-center">
                        <input
                          type="number"
                          placeholder="Add $..."
                          value={addMoneyAmount}
                          onChange={(e) => setAddMoneyAmount(e.target.value)}
                          className={`text-[10px] w-14 font-mono px-2 py-1 rounded-lg border focus:outline-none ${
                            darkMode 
                              ? 'bg-slate-900 border-slate-800 text-slate-100' 
                              : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        />
                        <button 
                          type="submit"
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-505 text-white rounded-lg text-[9px] font-bold cursor-pointer shrink-0"
                        >
                          + Fund
                        </button>
                      </form>
                    ) : (
                      <span 
                        onClick={() => alert("KYC_GATE_LOCKED: Complete the 8-step E-KYC onboarding to unlock account balance funding. Click the warning banner to start onboarding.")}
                        className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-400 rounded-lg text-[9px] font-bold cursor-help flex items-center gap-1 shrink-0"
                      >
                        🔒 Fund Locked
                      </span>
                    )}
                  </div>
                </div>

                {/* PROMINENT COMPLIANCE AND ONBOARDING ALERT PANEL FOR NON-APPROVED SESSIONS */}
                {user.kycStatus !== 'APPROVED' && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-2.5 animate-pulse text-left">
                    <span className="text-md mt-0.5 animate-bounce">⚠️</span>
                    <div className="space-y-1">
                      <h5 className="font-extrabold text-[11.5px] text-amber-500 leading-none">Regulatory Limits Active</h5>
                      <p className="text-[9.5px] text-slate-400 leading-relaxed font-semibold">
                        Your identity profile is not approved (Status: <strong className="uppercase text-amber-400">{user.kycStatus}</strong>). Outbound transfers and balance updates are disabled. Complete compliance onboarding to unlock full access.
                      </p>
                      <button
                        onClick={() => setDemoScreen('onboard_ekyc')}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[9px] mt-1 shadow-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        Start 8-Step E-KYC Stepper <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Tab Render Outputs */}
                <div className="mt-2 text-xs">
                  {activeTab === 'dashboard' && (
                    <div className="space-y-4">
                      {/* Integrated Customer Dashboard Views */}
                      <CustomerDashboard
                        user={user}
                        transactions={transactions}
                        onUpdateUser={onUpdateUser}
                        onTriggerTransferTab={() => setActiveTab('transfers')}
                        onRefreshData={onRefreshData}
                        darkMode={darkMode}
                      />
                    </div>
                  )}

                  {activeTab === 'cards' && (
                    <div className="space-y-4">
                      <CardsView
                        user={user}
                        darkMode={darkMode}
                        onRefreshData={onRefreshData}
                      />
                    </div>
                  )}

                  {activeTab === 'transfers' && (
                    <div className="space-y-4">
                      <TransferForm
                        user={user}
                        otherUsers={otherUsers}
                        onTransactionLogged={() => {
                          onRefreshData();
                          setActiveTab('dashboard');
                        }}
                        darkMode={darkMode}
                      />
                    </div>
                  )}

                  {activeTab === 'budgeting' && (
                    <div className="space-y-4">
                      <BudgetingView
                        user={user}
                        transactions={transactions}
                        darkMode={darkMode}
                        onRefreshData={onRefreshData}
                        onUpdateUser={onUpdateUser}
                      />
                    </div>
                  )}

                  {activeTab === 'rewards' && (
                    <div className="space-y-4">
                      <RewardsView
                        user={user}
                        darkMode={darkMode}
                        onRefreshData={onRefreshData}
                      />
                    </div>
                  )}

                  {activeTab === 'copilot' && (
                    <div className="space-y-4">
                      <AICopilotView
                        user={user}
                        tickets={tickets}
                        onRefreshTickets={onRefreshData}
                        darkMode={darkMode}
                      />
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* MOCK SCREEN: WELCOME INTRO */}
            {demoScreen === 'welcome' && (
              <div className="py-8 text-center space-y-6">
                <div className="py-6 flex justify-center">
                  <div className="h-16 w-16 bg-indigo-600/10 text-indigo-500 rounded-3xl flex items-center justify-center bounce-item">
                    <Smartphone className="h-8 w-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] bg-indigo-55 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono font-bold">
                    Enterprise Digital Bank v2.0
                  </span>
                  <h3 className={`text-xl font-extrabold tracking-tight font-sans ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Sovereign Wealth Management
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Welcome to the global compliance-guaranteed electronic ledger. Experience standard-setting double-entry transaction clearing.
                  </p>
                </div>

                <div className="space-y-3.5 pt-6">
                  <button 
                    onClick={() => setDemoScreen('signup')}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Create Account Registry
                  </button>
                  <button 
                    onClick={() => setDemoScreen('login')}
                    className={`w-full py-3 rounded-2xl text-xs font-bold transition-all border ${
                      darkMode ? 'border-slate-800 text-slate-350 hover:bg-slate-900' : 'border-slate-200 text-slate-800 hover:bg-slate-50'
                    } cursor-pointer`}
                  >
                    Sign In Securely
                  </button>
                </div>

                <p className="text-[9.5px] text-slate-400 font-mono">
                  Standard APP Environment • IFRS-9 Grade
                </p>
              </div>
            )}

            {/* MOCK SCREEN: SIGNUP FORM */}
            {demoScreen === 'signup' && (
              <div className="space-y-4 py-3">
                <div className="space-y-1">
                  <h3 className={`text-md font-extrabold font-sans ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Open Wealth Ledger
                  </h3>
                  <p className="text-[11px] text-slate-400">Join the simulated double-entry accounting workspace.</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold block mb-1">Full Legal Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Sarah Jenkins" 
                      className={`w-full text-xs p-2.5 rounded-xl border ${
                        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold block mb-1">Electronic Mail Address</label>
                    <input 
                      type="email" 
                      placeholder="sarah.jenkins@emerald-wealth.org" 
                      className={`w-full text-xs p-2.5 rounded-xl border ${
                        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold block mb-1">Platform Account Role</label>
                    <select className={`w-full text-xs p-2.5 rounded-xl border ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <option>Customer Net Assets</option>
                      <option>Compliance Risk Officer (CRO)</option>
                    </select>
                  </div>
                  <div className="flex gap-2 items-center text-[10px] text-slate-400 py-1">
                    <input type="checkbox" defaultChecked />
                    <span>I agree to APP Sim rules and double-entry ledger audits.</span>
                  </div>

                  <button 
                    onClick={() => setDemoScreen('mfa')}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs mt-2 cursor-pointer"
                  >
                    Simulate Verification
                  </button>
                </div>
              </div>
            )}

            {/* MOCK SCREEN: SECURE LOGIN */}
            {demoScreen === 'login' && (
              <div className="space-y-4 py-6">
                <div className="text-center space-y-1">
                  <div className="h-11 w-11 bg-indigo-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h3 className={`text-md font-extrabold pt-2 font-sans ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Secure Identity Entry
                  </h3>
                  <p className="text-[11px] text-slate-400">Unlock compliance audited profile ledger.</p>
                </div>

                <div className="space-y-3 pt-4">
                  <div>
                    <label className="text-[11px] font-bold block mb-1">Corporate Client Email</label>
                    <input 
                      type="email" 
                      defaultValue="sarah.jenkins@emerald-wealth.com" 
                      className={`w-full text-xs p-2.5 rounded-xl border ${
                        darkMode ? 'bg-slate-900' : 'bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold block mb-1">Security PIN / Password</label>
                    <input 
                      type="password" 
                      defaultValue="••••••••••" 
                      className={`w-full text-xs p-2.5 rounded-xl border ${
                        darkMode ? 'bg-slate-900' : 'bg-white'
                      }`}
                    />
                  </div>

                  <button 
                    onClick={() => setDemoScreen('mfa')}
                    className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold pt-2 cursor-pointer"
                  >
                    Initialize Biometrics Pass
                  </button>
                </div>
              </div>
            )}

            {/* MOCK SCREEN: MFA AUTH */}
            {demoScreen === 'mfa' && (
              <div className="space-y-4 py-6 text-center">
                <div className="h-12 w-12 bg-amber-600/10 text-amber-500 rounded-3xl mx-auto flex items-center justify-center">
                  <Lock className="h-6 w-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className={`text-md font-extrabold font-sans pt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Multi-Factor MFA Audit
                  </h3>
                  <p className="text-[11px] text-slate-400 px-6">
                    We sent a transient mock validation code to your registered device. Enter pattern below.
                  </p>
                </div>

                <div className="max-w-[240px] mx-auto py-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="1 2 3 - 4 5"
                    className="w-full text-center tracking-widest text-lg font-bold font-mono py-2.5 border rounded-2xl bg-slate-900/5 dark:bg-slate-900 border-slate-350"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => {
                      setMfaSuccess(true);
                      setTimeout(() => {
                        setMfaSuccess(false);
                        setDemoScreen('kyc_docs');
                      }, 1100);
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Confirm One-Time Passcode
                  </button>
                  <p className="text-[10px] text-indigo-600 font-mono py-1">Resend code via mock Pager (30s remaining)</p>
                </div>

                {mfaSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 animate-bounce">
                    <CheckCircle2 className="h-4 w-4" /> Authority Code Verified. Redirecting...
                  </div>
                )}
              </div>
            )}

            {/* MOCK SCREEN: KYC DOCUMENTS */}
            {demoScreen === 'kyc_docs' && (
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <h3 className={`text-md font-extrabold font-sans ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Government Identity Registry
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    To comply with international AML laws (IFRS-9 / Basel III guidelines), select a certificate document.
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div onClick={() => setDemoScreen('kyc_camera')} className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    darkMode ? 'bg-slate-900 border-slate-800 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-500'
                  }`}>
                    <div className="h-8 w-8 bg-indigo-605/10 rounded-xl flex items-center justify-center text-indigo-500 font-bold">🗺️</div>
                    <div className="text-left">
                      <h4 className="text-xs font-bold leading-none">International Passport</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Recommended for fast AI text recognition</p>
                    </div>
                  </div>

                  <div onClick={() => setDemoScreen('kyc_camera')} className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    darkMode ? 'bg-slate-900 border-slate-800 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-500'
                  }`}>
                    <div className="h-8 w-8 bg-indigo-605/10 rounded-xl flex items-center justify-center text-indigo-500 font-bold">💳</div>
                    <div className="text-left">
                      <h4 className="text-xs font-bold leading-none">National Identity Badge</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Accepts double-sided high-contrast captures</p>
                    </div>
                  </div>

                  <div onClick={() => setDemoScreen('kyc_camera')} className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    darkMode ? 'bg-slate-900 border-slate-800 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-500'
                  }`}>
                    <div className="h-8 w-8 bg-indigo-605/10 rounded-xl flex items-center justify-center text-indigo-500 font-bold">🏎️</div>
                    <div className="text-left">
                      <h4 className="text-xs font-bold leading-none">Driver's License Permis</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Automated validation of micro-patterns</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/5 text-amber-500 rounded-2xl border border-amber-500/15 text-[10px] leading-relaxed select-none">
                  🔍 <strong>Active Audit Restraints:</strong> Your profile is currently restricted to $500.00 peer transfer cap until verified. Approve this client document from CRO view.
                </div>
              </div>
            )}

            {/* MOCK SCREEN: KYC CAMERA SNAPSHOT */}
            {demoScreen === 'kyc_camera' && (
              <div className="space-y-4 py-2 text-center">
                <div className="space-y-1 text-left">
                  <h3 className={`text-md font-extrabold font-sans mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Document Optics Capture
                  </h3>
                  <p className="text-[11px] text-slate-400">Position the document within the crop frame.</p>
                </div>

                {/* Simulated Lens Finder HUD */}
                <div className="relative border-4 border-indigo-500/80 rounded-2xl aspect-video bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute top-2 left-2 border-t-2 border-l-2 border-white w-4 h-4" />
                  <div className="absolute top-2 right-2 border-t-2 border-r-2 border-white w-4 h-4" />
                  <div className="absolute bottom-2 left-2 border-b-2 border-l-2 border-white w-4 h-4" />
                  <div className="absolute bottom-2 right-2 border-b-2 border-r-2 border-white w-4 h-4" />
                  
                  <div className="h-10 w-28 bg-slate-800/40 border border-slate-700/60 flex items-center justify-center text-[9px] font-bold text-slate-400 font-mono">
                    PASSPORT ID CARD
                  </div>

                  <span className="text-[9px] font-mono font-semibold text-emerald-400 mt-4 animate-pulse">
                    🟢 OPTICS STEADY • AUTOFOCUS ACTIVE
                  </span>
                </div>

                <div className="py-2">
                  <button 
                    onClick={() => setDemoScreen('face')}
                    className="h-14 w-14 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-slate-900 duration-200 mx-auto cursor-pointer"
                  >
                    <Camera className="h-7 w-7" />
                  </button>
                  <p className="text-[10px] text-slate-400 mt-2 font-semibold">Press trigger to record cryptographic keyframe analysis.</p>
                </div>
              </div>
            )}

            {/* MOCK SCREEN: FACE BIO-LIVENESS SWEEP */}
            {demoScreen === 'face' && (
              <div className="space-y-4 py-2 text-center">
                <div className="space-y-1 text-left">
                  <h3 className={`text-md font-extrabold font-sans mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Regulatory Biometrics
                  </h3>
                  <p className="text-[11px] text-slate-400">Look straight into the device lens to sweep biometric signatures.</p>
                </div>

                {/* Simulated Lens Finder HUD - Circular face frame */}
                <div className="relative h-48 w-48 rounded-full border-4 border-indigo-500/80 bg-slate-950 mx-auto flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-500 translate-y-[-50%] animate-ping" />
                  
                  <User className="h-24 w-24 text-slate-600" />

                  <span className="text-[8.5px] font-mono font-semibold text-indigo-400 mt-3 block animate-pulse">
                    SWEEPING BIO LIVENESS...
                  </span>
                </div>

                <div className="py-2">
                  <button 
                    onClick={() => {
                      alert('KYC document and bio liveness captured and posted to compliant audit ledger! Switching to dashboard mode.');
                      setDemoScreen('interactive');
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold leading-normal cursor-pointer"
                  >
                    Finish Verification Signature
                  </button>
                </div>
              </div>
            )}

            {/* MOCK SCREEN: REWARDS CATALOGUE */}
            {demoScreen === 'rewards' && (
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <h3 className={`text-md font-extrabold font-sans mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Emerald Rewards Portfolio
                  </h3>
                  <p className="text-[11px] text-slate-400">Premium cashbacks and simulated yields based on solvency ratios.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-105'}`}>
                    <span className="text-xl">🏆</span>
                    <h5 className="font-bold text-[11px] mt-1 text-slate-405">Capital Yield</h5>
                    <div className="text-sm font-extrabold text-blue-500 mt-1">4.85% APY</div>
                    <p className="text-[9px] text-slate-400 mt-1 scale-95 pointer-events-none">On balances &gt; $50k</p>
                  </div>

                  <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-105'}`}>
                    <span className="text-xl">💎</span>
                    <h5 className="font-bold text-[11px] mt-1 text-slate-405">Fee Cashback</h5>
                    <div className="text-sm font-extrabold text-indigo-500 mt-1">0.15% back</div>
                    <p className="text-[9px] text-slate-400 mt-1 scale-95 pointer-events-none">On posted global settlements</p>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/60 border-slate-200'}`}>
                  <h5 className="text-[11px] font-bold">Your Account Tier Progress</h5>
                  <div className="w-full bg-slate-300 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                    <div className="bg-indigo-650 h-full w-[82%]" />
                  </div>
                  <p className="text-[9.5px] text-slate-400 mt-1.5 leading-normal">
                    You have earned <strong>820,000 / 1,000,000</strong> points for the next Diamond Ledger Account tier.
                  </p>
                </div>
              </div>
            )}

            {/* MOCK SCREEN: CONFIG SETTINGS */}
            {demoScreen === 'settings' && (
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <h3 className={`text-md font-extrabold font-sans mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Platform Controls
                  </h3>
                  <p className="text-[11px] text-slate-400">Cryptographic audit keys and security settings.</p>
                </div>

                <div className={`divide-y divide-slate-100 dark:divide-slate-800 text-xs ${
                  darkMode ? 'bg-slate-900' : 'bg-white'
                } p-3 rounded-2xl border border-slate-200 dark:border-slate-800`}>
                  <div className="py-2.5 flex justify-between items-center bg-transparent">
                    <div>
                      <span className="font-bold block">Double-entry Auto Audits</span>
                      <p className="text-[9.5px] text-slate-400 mt-0.5 pointer-events-none">Verify ledger on each transaction</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </div>
                  
                  <div className="py-2.5 flex justify-between items-center bg-transparent">
                    <div>
                      <span className="font-bold block">Biometric Biokey Verification</span>
                      <p className="text-[9.5px] text-slate-400 mt-0.5 pointer-events-none">Face sweep check for withdrawals &gt; $10,000</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </div>

                  <div className="py-2.5 flex justify-between items-center bg-transparent">
                    <div>
                      <span className="font-bold block">Compliance Alerts Email</span>
                      <p className="text-[9.5px] text-slate-400 mt-0.5 pointer-events-none">Ping address on suspicious velocity holds</p>
                    </div>
                    <input type="checkbox" className="h-4 w-4" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setDemoScreen('interactive')}
                    className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold leading-none cursor-pointer"
                  >
                    Save Options
                  </button>
                </div>
              </div>
            )}

            {demoScreen === 'onboard_ekyc' && (
              <EkycOnboardingWizard
                user={user}
                darkMode={darkMode}
                onOnboardingComplete={handleOnboardingFinished}
              />
            )}

          </div>

          {/* Device Sticky Tab Navigation - Bottom Navigation */}
          {demoScreen === 'interactive' && (
            <div className={`absolute bottom-0 left-0 right-0 h-18 border-t flex items-center justify-around px-1 py-1 z-30 select-none ${
              darkMode 
                ? 'bg-[#0f172a] border-slate-800/80 text-slate-400 shadow-xl' 
                : 'bg-white border-slate-200 text-slate-500'
            }`}>
              
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex flex-col items-center gap-1 transition-all text-[8px] font-extrabold flex-1 cursor-pointer py-1 ${
                  activeTab === 'dashboard'
                    ? 'text-indigo-550 scale-103'
                    : 'text-slate-450 hover:text-indigo-400'
                }`}
              >
                <Wallet className="h-4.5 w-4.5" />
                <span>Wallet</span>
              </button>

              <button
                onClick={() => setActiveTab('cards')}
                className={`flex flex-col items-center gap-1 transition-all text-[8px] font-extrabold flex-1 cursor-pointer py-1 ${
                  activeTab === 'cards'
                    ? 'text-indigo-550 scale-103'
                    : 'text-slate-450 hover:text-indigo-400'
                }`}
              >
                <CreditCard className="h-4.5 w-4.5" />
                <span>Cards</span>
              </button>

              <button
                onClick={() => {
                  if (user.kycStatus === 'APPROVED') {
                    setActiveTab('transfers');
                  } else {
                    alert("KYC_GATE_LOCKED: Core asset transfers are gated until your E-KYC identity documentation receives approved status.");
                  }
                }}
                className={`flex flex-col items-center gap-1 transition-all text-[8px] font-extrabold flex-1 py-1 ${
                  user.kycStatus === 'APPROVED' ? 'cursor-pointer hover:text-indigo-550' : 'cursor-not-allowed opacity-40'
                } ${
                  activeTab === 'transfers' && user.kycStatus === 'APPROVED'
                    ? 'text-indigo-550 scale-103'
                    : 'text-slate-450'
                }`}
              >
                <ArrowLeftRight className="h-4.5 w-4.5" />
                <span>Send</span>
              </button>

              <button
                onClick={() => setActiveTab('budgeting')}
                className={`flex flex-col items-center gap-1 transition-all text-[8px] font-extrabold flex-1 cursor-pointer py-1 ${
                  activeTab === 'budgeting'
                    ? 'text-indigo-550 scale-103'
                    : 'text-slate-450 hover:text-indigo-400'
                }`}
              >
                <PieChart className="h-4.5 w-4.5" />
                <span>Insights</span>
              </button>

              <button
                onClick={() => setActiveTab('rewards')}
                className={`flex flex-col items-center gap-1 transition-all text-[8px] font-extrabold flex-1 cursor-pointer py-1 ${
                  activeTab === 'rewards'
                    ? 'text-indigo-550 scale-103'
                    : 'text-slate-450 hover:text-indigo-400'
                }`}
              >
                <Award className="h-4.5 w-4.5" />
                <span>Rewards</span>
              </button>

              <button
                onClick={() => setActiveTab('copilot')}
                className={`flex flex-col items-center gap-1 transition-all text-[8px] font-extrabold flex-1 cursor-pointer py-1 ${
                  activeTab === 'copilot'
                    ? 'text-indigo-550 scale-103'
                    : 'text-slate-450 hover:text-indigo-400'
                }`}
              >
                <Sparkles className="h-4.5 w-4.5" />
                <span>AI Agent</span>
              </button>

            </div>
          )}

          {/* Floating AI Assistant Widget - persistent FAB inside physical mobile device frame */}
          {demoScreen === 'interactive' && !isFloatingChatOpen && (
            <button
              onClick={() => setIsFloatingChatOpen(true)}
              className="absolute bottom-20 right-4 h-11 w-11 rounded-full bg-indigo-650 hover:bg-indigo-550 text-white shadow-xl flex flex-col items-center justify-center z-45 cursor-pointer border border-white/20 select-none hover:scale-105 active:scale-95 transition-all text-[8px] font-black"
              id="ai-floating-trigger"
            >
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
              <span className="font-sans leading-none mt-0.5 uppercase tracking-wide">Copilot</span>
            </button>
          )}

          {/* Floating AI Assistant Modal/Drawer overlay inside physical mobile device frame */}
          {isFloatingChatOpen && (
            <div 
              className="absolute inset-x-0 bottom-18 top-12 bg-slate-950/40 z-45 flex flex-col justify-end backdrop-blur-xs select-none"
              id="ai-floating-panel"
            >
              <div className={`h-[85%] rounded-t-2xl border-t flex flex-col overflow-hidden relative shadow-2xl ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                {/* Panel Header */}
                <div className="flex items-center justify-between p-3 border-b border-slate-150 dark:border-slate-850 shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-400 animate-bounce" />
                    <div>
                      <h5 className={`font-sans font-extrabold text-xs leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>COOP Instant Desk</h5>
                      <p className="text-[9.5px] text-slate-400">Compliance & Accounting Bot</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsFloatingChatOpen(false)}
                    className="px-2.5 py-1 text-[9px] font-black uppercase rounded-md cursor-pointer transition bg-rose-500/10 hover:bg-rose-500/15 text-rose-500 border border-rose-500/20"
                  >
                    Close
                  </button>
                </div>

                {/* AICopilotView content pane in compact/mini mode */}
                <div className="flex-1 overflow-hidden relative">
                  <AICopilotView
                    user={user}
                    tickets={tickets}
                    onRefreshTickets={onRefreshData}
                    darkMode={darkMode}
                    isMiniLayout={true}
                    onClose={() => setIsFloatingChatOpen(false)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Home Indicator Line */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-400/60 dark:bg-slate-700/60 rounded-full z-40 select-none pointer-events-none" />

        </div>

      </div>

    </div>
  );
};
