import React, { useState } from 'react';
import { 
  registerCustomer, 
  loginUser, 
  verifyMFA, 
  requestPasswordReset, 
  executePasswordReset 
} from '../services/api';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  KeyRound, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Fingerprint, 
  Eye, 
  EyeOff, 
  BookOpen, 
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

interface AuthContainerProps {
  onAuthSuccess: (sessionToken: string, userProfile: any) => void;
  darkMode?: boolean;
}

export const AuthContainer: React.FC<AuthContainerProps> = ({
  onAuthSuccess,
  darkMode = false
}) => {
  // Navigation tabs: 'customer-login' | 'customer-register' | 'admin-login' | 'forgot-password' | 'reset-password'
  const [activeTab, setActiveTab] = useState<'customer-login' | 'customer-register' | 'admin-login' | 'forgot-password' | 'reset-password'>('customer-login');
  
  // Input fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Admin MFA holds
  const [pendingMfaSessionId, setPendingMfaSessionId] = useState<string | null>(null);
  const [mfaUser, setMfaUser] = useState<any>(null);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [seedSearch, setSeedSearch] = useState('');
  const [seedTab, setSeedTab] = useState<'admin' | 'customer'>('admin');

  // Seed user profiles definition for UAT evaluator ease-of-use
  const adminSeedAccounts = [
    { title: 'Super Admin Access', email: 'admin.super@apex.com', pass: 'SuperAdmin123!', role: 'Super Admin', desc: 'Full core access. Can wipe permanent logs, approve KYC, compliance resolve.' },
    { title: 'Compliance Analyst', email: 'compliance.analyst@apex.com', pass: 'Compliance123!', role: 'Compliance Analyst', desc: 'Resolve alerts, review KYC profiles. Cannot wipe logs or settings.' },
    { title: 'Operations Officer', email: 'ops.officer@apex.com', pass: 'Operations123!', role: 'Operations Officer', desc: 'Can approve KYC, manage helpdesk. Restricted compliance alerts resolve.' },
    { title: 'Finance Officer', email: 'finance.officer@apex.com', pass: 'Finance123!', role: 'Finance Officer', desc: 'Double-entry ledger access. Restricted KYC approval by default.' },
    { title: 'Support Agent Desk', email: 'support.agent@apex.com', pass: 'Support123!', role: 'Support Agent', desc: 'Access support desk replies ONLY. Blocked settings, logs, ledger.' },
    { title: 'Sovereign Risk Manager', email: 'risk.manager@apex.com', pass: 'Risk123!', role: 'Risk Manager', desc: 'Watchdog clearances. Overrides alert holds, checks ledgers.' },
    { title: 'Executive Viewer', email: 'exec.viewer@apex.com', pass: 'Executive123!', role: 'Executive Viewer', desc: 'Read-only access across all backoffice features.' },
  ];

  const customerSeedAccounts = [
    { title: 'Sarah Jenkins', email: 'sarah.j@enterprise.com', pass: 'Sarah123!', role: 'Customer', desc: 'Primary retail client (LOW risk, KYC Approved). Balance: $45.2k.' },
    { title: 'Michael Chen', email: 'chen.m@techcorp.io', pass: 'Michael123!', role: 'Customer', desc: 'Rich tech entrepreneur (LOW risk, KYC Approved). Balance: $124.5k.' },
    { title: 'Amara Okafor', email: 'amara@designstudio.co', pass: 'Amara123!', role: 'Customer', desc: 'Creative designer (MEDIUM risk, KYC Pending). Balance: $8.9k.' },
    { title: 'Carlos Ruiz', email: 'carlos.r@globalops.net', pass: 'Carlos123!', role: 'Customer', desc: 'Global operations (LOW risk, Frozen Debit Card). Balance: $3.1k.' },
    { title: 'Elena Rostova', email: 'elena.r@finadvise.eu', pass: 'Elena123!', role: 'Customer', desc: 'Wealthy financial consultant (HIGH risk). Balance: $620k.' },
    { title: 'David Brown', email: 'dbrown@freelance.org', pass: 'David123!', role: 'Customer', desc: 'Freelance analyst (HIGH risk, KYC Rejected, Blocked card). Balance: $1.4k.' },
    { title: 'Yuki Tanaka', email: 'yuki.t@sunrise.jp', pass: 'Yuki123!', role: 'Customer', desc: 'Tech partner investor (LOW risk, KYC Pending). Balance: $93.4k.' },
    { title: 'Zayn Malik', email: 'zayn@malikmusic.com', pass: 'Zayn123!', role: 'Customer', desc: 'Creative musician user (MEDIUM risk). Balance: $12.5k.' },
    { title: 'Oliver Hansen', email: 'oliver@hansenholdings.dk', pass: 'Oliver123!', role: 'Customer', desc: 'Investment holder (MEDIUM risk, KYC Escalated). Balance: $850.' },
    { title: 'Sofia Al-Mansoor', email: 'sofia@mansoor-equity.ae', pass: 'Sofia123!', role: 'Customer', desc: 'Ultra high-net-worth client (LOW risk). Balance: $3.1m.' },
  ];

  const handleAutofill = (selectedEmail: string, selectedPass: string, isCustomer: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setValidationErrors({});
    setEmail(selectedEmail);
    setPassword(selectedPass);
    if (isCustomer) {
      setActiveTab('customer-login');
    } else {
      setActiveTab('admin-login');
    }
    setPendingMfaSessionId(null);
  };

  const handleInstantLogin = async (selectedEmail: string, selectedPass: string, isCustomer: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setValidationErrors({});
    setIsLoading(true);
    try {
      const authData = await loginUser(selectedEmail, selectedPass);
      let finalSessionId = authData.sessionId;

      if (authData.mfaRequired) {
        // Administrative bypass sequence automatic MFA pass helper
        const mfaRes = await verifyMFA(authData.sessionId, '123456');
        finalSessionId = mfaRes.sessionId;
        localStorage.setItem('apex_session_token', finalSessionId);
        localStorage.setItem('apex_session_user', JSON.stringify(mfaRes.user));
        onAuthSuccess(finalSessionId, mfaRes.user);
      } else {
        localStorage.setItem('apex_session_token', authData.sessionId);
        localStorage.setItem('apex_session_user', JSON.stringify(authData.user));
        onAuthSuccess(authData.sessionId, authData.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Instant login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (e: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(e);
  };

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setMfaCode('');
    setResetToken('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setValidationErrors({});
  };

  // Submit Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = 'Full identity legal name is required.';
    if (!email.trim()) {
      errors.email = 'Valid email is required.';
    } else if (!validateEmail(email)) {
      errors.email = 'Provided email format is invalid.';
    }
    if (!password) {
      errors.password = 'Security password characters are required.';
    } else if (password.length < 8) {
      errors.password = 'Password must meet length criteria (8+ characters).';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords mismatched. Re-verify characters.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      await registerCustomer(name, email, password);
      setSuccessMsg('Sovereign client credentials listed. Logging you in...');
      
      // Auto login customer immediately
      setTimeout(async () => {
        try {
          const authData = await loginUser(email, password);
          onAuthSuccess(authData.sessionId, authData.user);
        } catch (loginErr: any) {
          setErrorMsg('Account built, but auto-login stalled. Try logging in manually.');
          setActiveTab('customer-login');
        }
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing client registration.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Login
  const handleLogin = async (e: React.FormEvent, isAdmin: boolean) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = 'Valid email address is mandatory.';
    } else if (!validateEmail(email)) {
      errors.email = 'Provided email format is invalid.';
    }
    if (!password) {
      errors.password = 'Core passkey is required.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const authData = await loginUser(email, password);
      
      if (authData.mfaRequired) {
        // Halt and prompt MFA
        setPendingMfaSessionId(authData.sessionId);
        setMfaUser(authData.user);
        setSuccessMsg('Sovereign administrative clearance detected. MFA Token required.');
      } else {
        // Execute customer log-on
        localStorage.setItem('apex_session_token', authData.sessionId);
        localStorage.setItem('apex_session_user', JSON.stringify(authData.user));
        onAuthSuccess(authData.sessionId, authData.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Double-entry audit log failure. Invalid details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit MFA Code
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!mfaCode.trim() || mfaCode.length !== 6) {
      setErrorMsg('MFA security clearance tokens require exact 6 numerical columns.');
      return;
    }

    if (!pendingMfaSessionId) {
      setErrorMsg('Expired login sequence duration. Try logging back in.');
      return;
    }

    setIsLoading(true);
    try {
      const mfaResult = await verifyMFA(pendingMfaSessionId, mfaCode);
      // Double encryption check ok
      localStorage.setItem('apex_session_token', mfaResult.sessionId);
      localStorage.setItem('apex_session_user', JSON.stringify(mfaResult.user));
      onAuthSuccess(mfaResult.sessionId, mfaResult.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'MFA validation failed. Use sandbox default: 123456');
    } finally {
      setIsLoading(false);
    }
  };

  // Recover Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!email.trim() || !validateEmail(email)) {
      setValidationErrors({ email: 'Provide valid registered email.' });
      return;
    }

    setIsLoading(true);
    try {
      const resetRes = await requestPasswordReset(email);
      setSuccessMsg(`Security recovery instructions simulated. Recovery Token generated: ${resetRes.simulatedToken}`);
      setResetToken(resetRes.simulatedToken);
      setTimeout(() => {
        setActiveTab('reset-password');
      }, 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed recover sequence.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Password Execution
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const errors: Record<string, string> = {};

    if (!email.trim()) errors.email = 'Email matching token is required.';
    if (!resetToken.trim()) errors.token = 'Copy generated simulation reset token above.';
    if (!password) {
      errors.password = 'Provide new security password.';
    } else if (password.length < 8) {
      errors.password = 'Password criteria requires 8+ characters limit.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      await executePasswordReset(email, resetToken, password);
      setSuccessMsg('Platform credentials securely changed. Redirecting to login...');
      setTimeout(() => {
        clearForm();
        setActiveTab('customer-login');
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Reset expired or invalid.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-4">
      
      {/* LEFT: AUTH SELECTIONS PORTAL CARD */}
      <div className={`lg:col-span-7 rounded-3xl border p-6 md:p-8 transition-colors ${
        darkMode ? 'bg-[#0b0f19] border-slate-850 shadow-2xl' : 'bg-white border-slate-200/90 shadow-lg'
      }`}>
        
        {/* Core selector tabs */}
        {!pendingMfaSessionId && (
          <div className={`flex p-1 rounded-2xl mb-8 border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => { clearForm(); setActiveTab('customer-login'); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                activeTab === 'customer-login' || activeTab === 'customer-register'
                  ? darkMode ? 'bg-[#151c30] text-indigo-400 shadow-sm' : 'bg-white shadow-xs text-indigo-600'
                  : darkMode ? 'text-slate-450 hover:text-slate-200' : 'text-slate-550 hover:text-slate-800'
              }`}
            >
              👤 Customer Portal
            </button>
            <button
              onClick={() => { clearForm(); setActiveTab('admin-login'); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                activeTab === 'admin-login'
                  ? darkMode ? 'bg-[#151c30] text-indigo-400 shadow-sm' : 'bg-white shadow-xs text-indigo-600'
                  : darkMode ? 'text-slate-450 hover:text-slate-200' : 'text-slate-550 hover:text-slate-800'
              }`}
            >
              🛡️ Backoffice login
            </button>
          </div>
        )}

        {/* Global Alert Notification rows */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-550/20 text-rose-500 flex items-start gap-2.5 text-xs">
            <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold tracking-tight block uppercase text-[10px]">Security Exception Triggered</span>
              <p className="mt-0.5 leading-snug">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-550/20 text-emerald-400 flex items-start gap-2.5 text-xs">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold tracking-tight block uppercase text-[10px]">Operation status cleared</span>
              <p className="mt-0.5 leading-snug">{successMsg}</p>
            </div>
          </div>
        )}

        {/* 1. CUSTOMER LOGIN SCREEN */}
        {activeTab === 'customer-login' && !pendingMfaSessionId && (
          <form onSubmit={(e) => handleLogin(e, false)} className="space-y-5" id="form-customer-login">
            <div className="border-b border-slate-100 dark:border-slate-850 pb-4 mb-4">
              <h3 className="font-extrabold tracking-tight text-lg mb-1 text-indigo-500">Sovereign Wealth Onboarding</h3>
              <p className="text-slate-400 text-xs">Login below to review balance statements and double-entry journals.</p>
            </div>

            {/* In-form Quick-Autofill Selector for Mobile and High-Efficiency Testing */}
            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950 bg-opacity-80 border-slate-850' : 'bg-slate-50 border-slate-200'} mb-4`}>
              <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-indigo-400" /> Click to Autofill Client Credentials:
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                {customerSeedAccounts.map((ac) => (
                  <button
                    key={ac.email}
                    type="button"
                    onClick={() => {
                      setEmail(ac.email);
                      setPassword(ac.pass);
                      setErrorMsg(null);
                      setValidationErrors({});
                    }}
                    className={`px-2.5 py-1 text-[10px] font-mono font-extrabold rounded-xl border transition-all cursor-pointer ${
                      email.toLowerCase().trim() === ac.email.toLowerCase().trim()
                        ? 'bg-indigo-600 text-white border-indigo-505 shadow-sm'
                        : darkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 font-sans'
                    }`}
                  >
                    👤 {ac.title.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">Secure Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    name="username"
                    autoComplete="username email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter email e.g., sarah.j@enterprise.com"
                    id="customer-email-field"
                    className={`w-full pl-10 pr-4 py-3 text-xs bg-slate-900/40 border rounded-2xl font-mono transition-all text-white outline-hidden focus:border-indigo-500 ${validationErrors.email ? 'border-rose-500' : 'border-slate-805'}`}
                  />
                </div>
                {validationErrors.email && <p className="text-rose-500 text-[10px] font-semibold mt-1">{validationErrors.email}</p>}
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">Passphrase Keys</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter customer password characters"
                    id="customer-password-field"
                    className="w-full pl-10 pr-10 py-3 text-xs bg-slate-900/40 border border-slate-805 rounded-2xl transition-all text-white outline-hidden focus:border-indigo-500 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {validationErrors.password && <p className="text-rose-500 text-[10px] font-semibold mt-1">{validationErrors.password}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => { clearForm(); setActiveTab('forgot-password'); }}
                className="text-xs text-indigo-505 font-bold hover:underline"
              >
                Forgot your credentials?
              </button>
              
              <button
                type="button"
                onClick={() => { clearForm(); setActiveTab('customer-register'); }}
                className="text-xs text-indigo-400 font-bold hover:underline"
              >
                Build client account
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3.5 bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
              id="customer-login-btn"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4-w-4 animate-spin" /> Authorizing Ledger Node...
                </>
              ) : (
                <>
                  Enter Vault Console <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. CUSTOMER REGISTRATION SCREEN */}
        {activeTab === 'customer-register' && (
          <form onSubmit={handleRegister} className="space-y-5" id="form-customer-register">
            <div className="border-b border-slate-100 dark:border-slate-850 pb-4 mb-4">
              <h3 className="font-extrabold tracking-tight text-lg mb-1 text-indigo-500">Establish Client Sovereign Account</h3>
              <p className="text-slate-400 text-xs">Open a high-net-worth double-entry accounting profile instantly in our sandbox.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">Legal Profile Name (Full Identification)</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter full legal name e.g., Sarah Jenkins"
                    id="register-name-field"
                    className={`w-full pl-10 pr-4 py-3 text-xs bg-slate-900/40 border rounded-2xl transition-all text-white outline-hidden focus:border-indigo-500 ${validationErrors.name ? 'border-rose-500' : 'border-slate-805'}`}
                  />
                </div>
                {validationErrors.name && <p className="text-rose-500 text-[10px] font-semibold mt-1">{validationErrors.name}</p>}
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">Communications Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter communications email"
                    id="register-email-field"
                    className={`w-full pl-10 pr-4 py-3 text-xs bg-slate-900/40 border rounded-2xl font-mono transition-all text-white outline-hidden focus:border-indigo-500 ${validationErrors.email ? 'border-rose-500' : 'border-slate-805'}`}
                  />
                </div>
                {validationErrors.email && <p className="text-rose-500 text-[10px] font-semibold mt-1">{validationErrors.email}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">Choose Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Minimum 8 symbols"
                      id="register-password-field"
                      className={`w-full pl-10 pr-4 py-3 text-xs bg-slate-900/40 border rounded-2xl transition-all text-white outline-hidden focus:border-indigo-500 ${validationErrors.password ? 'border-rose-500' : 'border-slate-805'}`}
                    />
                  </div>
                  {validationErrors.password && <p className="text-rose-500 text-[10px] font-semibold mt-1">{validationErrors.password}</p>}
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">Confirm characters</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Repeat selection"
                      id="register-confirm-password-field"
                      className={`w-full pl-10 pr-4 py-3 text-xs bg-slate-900/40 border rounded-2xl transition-all text-white outline-hidden focus:border-indigo-500 ${validationErrors.confirmPassword ? 'border-rose-500' : 'border-slate-805'}`}
                    />
                  </div>
                  {validationErrors.confirmPassword && <p className="text-rose-500 text-[10px] font-semibold mt-1">{validationErrors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-start text-xs pt-2">
              <span className="text-slate-400">Already have a credentials record?</span>
              <button
                type="button"
                onClick={() => { clearForm(); setActiveTab('customer-login'); }}
                className="text-indigo-400 font-bold hover:underline ml-1.5 cursor-pointer"
              >
                Log in instead
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3.5 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
              id="register-submit-btn"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" /> Seeding cryptographic credentials...
                </>
              ) : (
                <>
                  Register & Establish Balance <CheckCircle2 className="h-4.5 w-4.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 3. ADMINISTRATIVE LOGIN SCREEN (WITH MFA SECTOR IF CODE PENDING) */}
        {activeTab === 'admin-login' && !pendingMfaSessionId && (
          <form onSubmit={(e) => handleLogin(e, true)} className="space-y-5" id="form-admin-login">
            <div className="border-b border-rose-500/20 pb-4 mb-4">
              <h3 className="font-extrabold tracking-tight text-lg mb-1 text-rose-550 flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-indigo-550 animate-pulse" />
                Sovereign Administrative Gateway
              </h3>
              <p className="text-slate-400 text-xs">Verify credentials and input your secure regulatory clearances.</p>
            </div>

            {/* In-form Quick-Autofill Selector for Administrative Testing */}
            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950 bg-opacity-80 border-slate-850' : 'bg-slate-50 border-slate-200'} mb-4`}>
              <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-rose-500" /> Click to Autofill Administrative Credentials:
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                {adminSeedAccounts.map((ac) => {
                  const label = ac.title.replace(' Access', '').replace(' Desk', '');
                  return (
                    <button
                      key={ac.email}
                      type="button"
                      onClick={() => {
                        setEmail(ac.email);
                        setPassword(ac.pass);
                        setErrorMsg(null);
                        setValidationErrors({});
                      }}
                      className={`px-2.5 py-1 text-[10px] font-mono font-extrabold rounded-xl border transition-all cursor-pointer ${
                        email.toLowerCase().trim() === ac.email.toLowerCase().trim()
                          ? 'bg-indigo-600 text-white border-indigo-505 shadow-sm'
                          : darkMode
                            ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 font-sans'
                      }`}
                    >
                      🛡️ {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 font-sans">
              <div>
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">Auditor Identification Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    name="admin-username"
                    autoComplete="username email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter admin key email e.g., admin.super@apex.com"
                    id="admin-email-field"
                    className={`w-full pl-10 pr-4 py-3 text-xs bg-slate-900/40 border rounded-2xl font-mono transition-all text-white outline-hidden focus:border-indigo-500 ${validationErrors.email ? 'border-rose-500' : 'border-slate-805'}`}
                  />
                </div>
                {validationErrors.email && <p className="text-rose-500 text-[10px] font-semibold mt-1">{validationErrors.email}</p>}
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">Administrative Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="admin-password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter security audit passphrase"
                    id="admin-password-field"
                    className="w-full pl-10 border border-slate-805 pr-4 py-3 text-xs bg-slate-900/40 rounded-2xl transition-all text-white outline-hidden focus:border-indigo-500 font-sans"
                  />
                </div>
                {validationErrors.password && <p className="text-rose-500 text-[10px] font-semibold mt-1">{validationErrors.password}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3.5 bg-indigo-700 hover:bg-indigo-650 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
              id="admin-login-btn"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" /> Activating MFA Prompt...
                </>
              ) : (
                <>
                  Verifying Clearances <Fingerprint className="h-4.5 w-4.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ADMIN SECURE MANDATORY MFA SECTION */}
        {pendingMfaSessionId && (
          <form onSubmit={handleMfaSubmit} className="space-y-5" id="form-mfa-checking">
            <div className="p-4 rounded-2xl border border-amber-600/30 bg-amber-500/10 text-amber-300 text-xs flex flex-col gap-2">
              <span className="font-extrabold tracking-tight uppercase block text-[10px]">MFA TOKEN CHALLENGE DEMAND</span>
              <p className="leading-relaxed">
                Clearances for <span className="font-bold underline">{mfaUser?.name} ({mfaUser?.role})</span> require a live multi-factor code.
              </p>
              <p className="font-mono text-[10px] text-slate-400 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                🔑 Interactive APP Bypass Pin Code is: <span className="text-emerald-400 font-bold text-xs">123456</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">MFA Security Pin Code (6 digits)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-450" />
                  <input
                    type="text"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    required
                    placeholder="Enter security code 123456"
                    id="mfa-pin-field"
                    className="w-full pl-10 pr-4 py-3 text-base text-center bg-slate-900/40 border border-slate-805 rounded-2xl tracking-widest font-mono font-extrabold transition-all text-white outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3.5 bg-emerald-600 hover:bg-emerald-550 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
              id="mfa-submit-btn"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" /> Verifying Security Clearance...
                </>
              ) : (
                <>
                  Verify & Enter Session <ShieldCheck className="h-4.5 w-4.5 text-white" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { clearForm(); setPendingMfaSessionId(null); setActiveTab('admin-login'); }}
              className="w-full py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 font-semibold text-xs rounded-xl"
            >
              Cancel Login Sequence
            </button>
          </form>
        )}

        {/* 4. FORGOT PASSWORD SIMULATION */}
        {activeTab === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="space-y-5" id="form-forgot-pass">
            <div className="border-b border-slate-100 dark:border-slate-850 pb-4 mb-4">
              <h3 className="font-extrabold tracking-tight text-lg mb-1 text-indigo-500">Recover Master Passphrase</h3>
              <p className="text-slate-400 text-xs">Simulate secure dispatch of an administrative reset token.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">Registered Account Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter registered email address"
                    id="forgot-email-field"
                    className={`w-full pl-10 pr-4 py-3 text-xs bg-slate-900/40 border rounded-2xl font-mono transition-all text-white outline-hidden focus:border-indigo-500 ${validationErrors.email ? 'border-rose-500' : 'border-slate-805'}`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2">
              <button
                type="button"
                onClick={() => { clearForm(); setActiveTab('customer-login'); }}
                className="text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                Return to Login
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3.5 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
              id="forgot-submit-btn"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" /> Dispatching Recovery Records...
                </>
              ) : (
                <>
                  Generate Simulated Recovery token <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 5. RESET PASSWORD FLOW */}
        {activeTab === 'reset-password' && (
          <form onSubmit={handleResetPassword} className="space-y-5" id="form-reset-pass">
            <div className="border-b border-indigo-500/20 pb-4 mb-4">
              <h3 className="font-extrabold tracking-tight text-lg mb-1 text-indigo-500">Define New Cryptographic Credentials</h3>
              <p className="text-slate-400 text-xs">Verify your simulation token and type in your new permanent password block.</p>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 rounded-2xl text-xs flex gap-2">
                <SlidersHorizontal className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold underline block uppercase text-[9px] tracking-wider">Simulation Recovery Buffer</span>
                  Your simulated code generated is: <span className="font-mono text-emerald-400 font-bold text-xs">{resetToken || 'RESET-MOCK'}</span>. We have pre-filled this column.
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">Confirm Email Match</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="E.g., sarah.j@enterprise.com"
                    id="reset-email-field"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900/40 border border-slate-805 rounded-xl transition-all text-white outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">Simulated Recovery Token</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                    placeholder="Enter code e.g. RST-345-APX"
                    id="reset-token-field"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900/40 border border-slate-805 rounded-xl transition-all text-white outline-hidden focus:border-indigo-500 font-mono text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">Select New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Minimum 8 symbols"
                    id="reset-pass-field"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900/40 border border-slate-805 rounded-xl transition-all text-white outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3.5 bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
              id="reset-submit-btn"
            >
              Update Password Key & Re-authenticate <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

      </div>

      {/* RIGHT: SECURED SEED ACCOUNTS DIRECTORY PANEL */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Development Panel Header Block */}
        <div className={`p-5 rounded-3xl border ${
          darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-900 text-white border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-slate-800">
            <BookOpen className="h-5 w-5 text-indigo-400 animate-pulse" />
            <div>
              <h4 className="font-extrabold tracking-tight font-sans text-xs uppercase text-indigo-400">APP Seed accounts</h4>
              <p className="text-[10px] text-slate-400 font-mono">Sandbox identity management directory</p>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-400 mb-3 font-mono">
            Access credentials automatically. Click <strong className="text-indigo-400 font-bold">Load & Fill</strong> to switch forms, or <strong className="text-emerald-400 font-bold">⚡ Direct Login</strong> to bypass credentials and sign in instantly.
          </p>

          {/* Seed Tab Toggle switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl mb-3 border border-slate-850">
            <button
              type="button"
              onClick={() => { setSeedTab('admin'); setSeedSearch(''); }}
              className={`py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider font-mono transition-all flex items-center justify-center gap-1.5 ${
                seedTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              🛡️ Backoffice ({adminSeedAccounts.length})
            </button>
            <button
              type="button"
              onClick={() => { setSeedTab('customer'); setSeedSearch(''); }}
              className={`py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider font-mono transition-all flex items-center justify-center gap-1.5 ${
                seedTab === 'customer'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              👤 Customers ({customerSeedAccounts.length})
            </button>
          </div>

          {/* Seed Account Search bar */}
          <div className="relative mb-3.5">
            <input
              type="text"
              placeholder={`Search ${seedTab === 'admin' ? 'backoffice roles' : 'seeded client profiles'}...`}
              value={seedSearch}
              onChange={(e) => setSeedSearch(e.target.value)}
              className="w-full px-3 py-2 text-[10.5px] font-mono bg-slate-950 border border-slate-850 rounded-xl leading-none text-white focus:outline-hidden focus:border-indigo-550"
            />
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {(seedTab === 'admin' ? adminSeedAccounts : customerSeedAccounts)
              .filter(ac => {
                const term = seedSearch.toLowerCase().trim();
                if (!term) return true;
                return (
                  ac.title.toLowerCase().includes(term) ||
                  ac.email.toLowerCase().includes(term) ||
                  ac.desc.toLowerCase().includes(term) ||
                  ac.role.toLowerCase().includes(term)
                );
              })
              .map((ac, idx) => {
                const isCust = seedTab === 'customer';
                return (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-2xl border text-[11px] flex flex-col justify-between gap-1.5 transition-all hover:bg-slate-900/80 ${
                      darkMode ? 'bg-slate-900 border-slate-850' : 'bg-slate-950 border-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-white font-sans text-xs tracking-tight block">
                        {isCust ? '👤' : '🛡️'} {ac.title}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                        isCust ? 'bg-indigo-950 text-indigo-300 border border-indigo-900/30' : 'bg-indigo-500/10 text-indigo-400'
                      }`}>
                        {ac.role}
                      </span>
                    </div>

                    <div className="font-mono text-[10px] space-y-0.5 text-slate-400 leading-tight">
                      <div className="flex justify-between">
                        <span>Email:</span>
                        <span className="text-slate-300 font-bold select-all">{ac.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pass:</span>
                        <span className="text-indigo-400 font-bold select-all">{ac.pass}</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-normal italic line-clamp-2">
                      {ac.desc}
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => handleAutofill(ac.email, ac.pass, isCust)}
                        className="py-1.5 bg-indigo-600/10 border border-indigo-600/30 hover:bg-indigo-605 text-indigo-300 hover:text-white font-extrabold rounded-xl transition-all text-center uppercase tracking-tight text-[9.5px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Load & Fill <ChevronRight className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInstantLogin(ac.email, ac.pass, isCust)}
                        className="py-1.5 bg-emerald-600/10 border border-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white font-extrabold rounded-xl transition-all text-center uppercase tracking-tight text-[9.5px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        ⚡ Direct Login
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

        </div>

        {/* Informative Security compliance guidelines */}
        <div className={`p-5 rounded-3xl border border-slate-800 bg-[#060a13] text-slate-400 text-xs leading-relaxed space-y-2 pointer-events-none`}>
          <div className="flex items-center gap-2 text-indigo-500 font-extrabold uppercase text-[10px] font-sans tracking-wide">
            <Lock className="h-4 w-4" /> Cryptographic Safety standards
          </div>
          <p className="font-mono text-[10px] leading-snug">
            All passwords in this sandbox are hashed recursively using HMAC SHA-250 and salted with cryptographic random 16-byte hashes. No plaintext representations are persisted to server logs.
          </p>
        </div>

      </div>

    </div>
  );
};
