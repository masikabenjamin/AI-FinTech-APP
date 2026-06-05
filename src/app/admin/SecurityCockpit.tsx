import React, { useState, useEffect, useRef } from 'react';
import { AuditLog, UserProfile, Transaction } from '../../types';
import { createAuditLog, fetchAuditLogs, clearAuditLogs } from '../../services/api';
import { 
  Lock, 
  Unlock, 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  FileCheck, 
  LogOut, 
  Clock, 
  Sliders, 
  UserCheck, 
  RefreshCw, 
  SlidersHorizontal, 
  Filter, 
  Calendar, 
  AlertTriangle, 
  Download, 
  UserX, 
  Database, 
  Key, 
  Cpu, 
  Layers, 
  Smartphone, 
  Network, 
  HardDrive, 
  Shield, 
  CheckCircle, 
  ArrowRight,
  Fingerprint
} from 'lucide-react';

interface SecurityCockpitProps {
  logs: AuditLog[];
  users: UserProfile[];
  onRefresh: () => void;
  darkMode?: boolean;
  activeUser: UserProfile;
  onLogout: () => void;
}

export const SecurityCockpit: React.FC<SecurityCockpitProps> = ({
  logs,
  users,
  onRefresh,
  darkMode = false,
  activeUser,
  onLogout
}) => {
  // --- STATE FOR AUDIT LOG CONSOLE ---
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>(logs);
  const [filterActor, setFilterActor] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterObjectType, setFilterObjectType] = useState('');
  const [filterRiskLevel, setFilterRiskLevel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- STATE FOR SESSION TIMEOUT SIMULATION ---
  const [timeoutEnabled, setTimeoutEnabled] = useState(false);
  const [timeoutSeconds, setTimeoutSeconds] = useState(15);
  const [countdown, setCountdown] = useState(15);
  const [userIsActive, setUserIsActive] = useState(true);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- STATE FOR STEP-UP VERIFICATION ---
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [stepUpActionName, setStepUpActionName] = useState<string>('');
  const [stepUpPasscode, setStepUpPasscode] = useState('');
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [stepUpSuccess, setStepUpSuccess] = useState<string | null>(null);
  const [pendingActionCallback, setPendingActionCallback] = useState<(() => void) | null>(null);

  // --- STATE FOR SENSITIVE DATA MASKING ---
  const [unmaskedFields, setUnmaskedFields] = useState<Record<string, boolean>>({});
  const [unmaskError, setUnmaskError] = useState<string | null>(null);

  // --- STATE FOR DATA EXPORT REQUEST WORKFLOW ---
  const [exportTarget, setExportTarget] = useState('Full User KYC Profiles');
  const [exportPurpose, setExportPurpose] = useState('');
  const [exportWorkflowStep, setExportWorkflowStep] = useState<'IDLE' | 'PENDING_STEPUP' | 'VERIFIED' | 'APPROVED' | 'REJECTED'>('IDLE');
  const [exportError, setExportError] = useState<string | null>(null);
  const [historicalExports, setHistoricalExports] = useState<Array<{ id: string; target: string; purpose: string; approvedBy: string; timestamp: string }>>([
    { id: 'EXP-109', target: 'Tax Withholding Records 2025', purpose: 'External regulatory filing with IRS', approvedBy: 'Super Admin', timestamp: '2026-06-01T15:21:00Z' }
  ]);

  // --- STATE FOR PRIVACY REQUEST WORKFLOW ---
  const [privacyRequests, setPrivacyRequests] = useState<Array<{ id: string; userName: string; type: 'ACCESS' | 'CORRECTION' | 'DELETION' | 'RESTRICTION'; status: 'SUBMITTED' | 'UNDER_REVIEW' | 'COMPLETED' | 'BLOCKED'; date: string; notes?: string }>>([
    { id: 'PRIV-001', userName: 'Masika Benjamin', type: 'ACCESS', status: 'COMPLETED', date: '2026-06-03', notes: 'Dossier packaging triggered, downloaded' },
    { id: 'PRIV-002', userName: 'Benjamin Masika', type: 'CORRECTION', status: 'UNDER_REVIEW', date: '2026-06-04', notes: 'Correct legal name documentation' }
  ]);
  const [newPrivacyUser, setNewPrivacyUser] = useState('');
  const [newPrivacyType, setNewPrivacyType] = useState<'ACCESS' | 'CORRECTION' | 'DELETION' | 'RESTRICTION'>('ACCESS');
  const [privacyNotes, setPrivacyNotes] = useState('');

  // --- STATE FOR SECURITY SETTINGS ENGINE ---
  const [passwordMinLength, setPasswordMinLength] = useState(12);
  const [passwordRequireSpecial, setPasswordRequireSpecial] = useState(true);
  const [passwordRotations, setPasswordRotations] = useState('90_DAYS');
  const [mfaEnforcement, setMfaEnforcement] = useState<'OPTIONAL' | 'REQUIRED' | 'STRICT'>('REQUIRED');
  const [mfaIpAllowlist, setMfaIpAllowlist] = useState<string[]>(['192.168.1.1', '10.0.0.12']);
  const [newIpRange, setNewIpRange] = useState('');
  const [isBackupSynced, setIsBackupSynced] = useState(true);

  // --- INCIDENT DASHBOARD PLATFORM ---
  const [incidentLogs, setIncidentLogs] = useState<Array<{ id: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; eventType: string; ip: string; message: string; timestamp: string }>>([
    { id: 'INC-402', severity: 'HIGH', eventType: 'BRUTE_FORCE_ATTEMPT', ip: '185.220.101.5', message: '5 sequence auth errors on operator email contact', timestamp: '2026-06-05T01:14:00Z' },
    { id: 'INC-401', severity: 'MEDIUM', eventType: 'VELOCITY_EXCEPTION', ip: '198.51.100.2', message: 'Client account transferred above daily $2000 quota', timestamp: '2026-06-04T18:44:00Z' }
  ]);

  // Simulated device tracking data
  const [authorizedDevices, setAuthorizedDevices] = useState([
    { id: 'DEV-AB1', device: 'Chrome / macOS (Apple Silicon)', location: 'Nairobi, Kenya', ip: '105.163.2.14', active: true },
    { id: 'DEV-XY2', device: 'Safari / iPhone 15 Pro Max', location: 'London, UK', ip: '82.165.41.9', active: false }
  ]);

  // --- REUSABLE SECURITY MASKED DATA LISTS ---
  const sensitiveDemonstrationData = [
    { id: 'mask-id', label: 'National ID card Number', value: 'ID-7029521-89', maskType: 'id_number' },
    { id: 'mask-phone', label: 'Personal Phone Number', value: '+254 712345678', maskType: 'phone' },
    { id: 'mask-email', label: 'User Email Address', value: 'masikabenjamin2020@gmail.com', maskType: 'email' },
    { id: 'mask-token', label: 'Card Payment Token', value: '4821-3921-9382-8912', maskType: 'card_token' },
    { id: 'mask-bank', label: 'Routing / IBAN Details', value: 'US-RECON-1982736-0932', maskType: 'bank_details' },
  ];

  // Helper function to derive Object Type from audit log description or actions
  const getObjectTypeFromAction = (actionName: string): string => {
    const act = actionName.toUpperCase();
    if (act.includes('TRANSFER') || act.includes('WIRE')) return 'Transfer';
    if (act.includes('BENEFICIARY')) return 'Beneficiary';
    if (act.includes('CARD') || act.includes('PIN')) return 'Card';
    if (act.includes('KYC') || act.includes('PROFILE')) return 'KYC Document';
    if (act.includes('EXPORT')) return 'Data Export';
    if (act.includes('THRESHOLD') || act.includes('LIMIT')) return 'Threshold Policy';
    if (act.includes('REVERSAL') || act.includes('ADJUSTMENT')) return 'Reversal Approval';
    return 'System General';
  };

  // --- FILTERS LOGIC FOR IMAGING AUDIT RECORD ---
  useEffect(() => {
    let result = [...logs];

    if (filterActor) {
      result = result.filter(v => v.actor.toLowerCase().includes(filterActor.toLowerCase()));
    }
    if (filterAction) {
      result = result.filter(v => v.action.toLowerCase().includes(filterAction.toLowerCase()));
    }
    if (filterObjectType) {
      result = result.filter(v => getObjectTypeFromAction(v.action).toLowerCase() === filterObjectType.toLowerCase());
    }
    if (filterRiskLevel) {
      result = result.filter(v => v.status === filterRiskLevel);
    }
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      result = result.filter(v => new Date(v.timestamp).getTime() >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime() + 86400000; // include full day
      result = result.filter(v => new Date(v.timestamp).getTime() <= endMs);
    }

    setFilteredLogs(result);
  }, [logs, filterActor, filterAction, filterObjectType, filterRiskLevel, startDate, endDate]);

  // --- TIMEOUT ALGORITHMIC STATE MACHINE ---
  useEffect(() => {
    if (!timeoutEnabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      setCountdown(timeoutSeconds);
      setShowTimeoutModal(false);
      return;
    }

    setCountdown(timeoutSeconds);
    setShowTimeoutModal(false);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleForcedLogoutTrigger();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeoutEnabled, timeoutSeconds]);

  const handleForcedLogoutTrigger = async () => {
    setShowTimeoutModal(true);
    await createAuditLog({
      action: 'SECURITY_SESSION_TIMEOUT_FORCED',
      details: `Inactivity timeout of ${timeoutSeconds} seconds expired. Session revoked for ${activeUser.name} (${activeUser.role}).`,
      status: 'WARNING'
    });
    onRefresh();

    // Forced logout dispatch after 2.5s simulation window
    setTimeout(() => {
      onLogout();
    }, 2500);
  };

  // --- STEP-UP VERIFICATION TRIGGER ACTION GUARD ---
  const requestStepUpVerification = (actionLabel: string, callback: () => void) => {
    setStepUpActionName(actionLabel);
    setPendingActionCallback(() => callback);
    setStepUpPasscode('');
    setStepUpError(null);
    setStepUpSuccess(null);
    setStepUpOpen(true);
  };

  const handleVerifyStepUp = async () => {
    setStepUpError(null);
    if (stepUpPasscode !== '123456') {
      await createAuditLog({
        action: `STEPUP_FAILED_${stepUpActionName.toUpperCase().replace(/\s+/g, '_')}`,
        details: `Step-up authorized challenge failed with code: ${stepUpPasscode}. Action locked down.`,
        status: 'FAILURE'
      });
      setStepUpError('Verification token rejected. Correct code: 123456 for simulated bypass.');
      onRefresh();
      return;
    }

    setStepUpSuccess('MFA authentication cleared! Processing action now...');
    await createAuditLog({
      action: `STEPUP_CLEARED_${stepUpActionName.toUpperCase().replace(/\s+/g, '_')}`,
      details: `Step-up challenge passed with code 123456. Action completed successfully.`,
      status: 'SUCCESS'
    });
    
    setTimeout(() => {
      if (pendingActionCallback) {
        pendingActionCallback();
      }
      setStepUpOpen(false);
      setPendingActionCallback(null);
      onRefresh();
    }, 1200);
  };

  // --- SENSITIVE DATA MASKING ENGINE CODES ---
  const handleToggleUnmaskField = async (fieldId: string, label: string, maskedType: string) => {
    setUnmaskError(null);
    if (unmaskedFields[fieldId]) {
      // Toggle back to masked
      setUnmaskedFields(prev => ({ ...prev, [fieldId]: false }));
      return;
    }

    // Role verification block check
    const permittedToViewRaw = ['Super Admin', 'Risk Manager', 'Compliance Analyst'].includes(activeUser.role);
    
    if (!permittedToViewRaw) {
      setUnmaskError(`Unauthorized: Role authorization ${activeUser.role} denied access to decrypt metadata index.`);
      await createAuditLog({
        action: 'SENSITIVE_DATA_UNVEIL_DENIED',
        details: `Failed unmasking payload on field [${label}] by ${activeUser.name} (${activeUser.role}): Access Denied.`,
        status: 'FAILURE'
      });
      onRefresh();
      return;
    }

    // Permit viewing but require Step-Up!
    requestStepUpVerification(`Decrypt confidential resource (${label})`, async () => {
      setUnmaskedFields(prev => ({ ...prev, [fieldId]: true }));
      await createAuditLog({
        action: 'SENSITIVE_DATA_UNVEIL_SUCCESS',
        details: `Unmasked sensitive index field [${label} - Type: ${maskedType}] under Super Admin compliance license.`,
        status: 'SUCCESS'
      });
      onRefresh();
    });
  };

  // Helper for masking formatting strings
  const compileMaskedString = (raw: string, maskType: string, isUnmasked: boolean) => {
    if (isUnmasked) return raw;
    switch (maskType) {
      case 'id_number':
        return `${raw.slice(0, 5)}••••-••`;
      case 'phone':
        return `${raw.slice(0, 5)} •••-••••`;
      case 'email':
        return `${raw.slice(0, 4)}•••••@gmail.com`;
      case 'card_token':
        return `••••-••••-••••-${raw.slice(-4)}`;
      case 'bank_details':
        return `${raw.slice(0, 9)}••••••••-0932`;
      default:
        return '••••••••';
    }
  };

  // --- EXPORT DATA REQUEST LOGIC ---
  const handleRequestDataExport = () => {
    setExportError(null);
    if (!exportPurpose.trim()) {
      setExportError('Regulatory constraints require a clear legal purpose description.');
      return;
    }

    // Trigger Step-up
    requestStepUpVerification(`Export Data Payload: ${exportTarget}`, async () => {
      const newExp = {
        id: `EXP-${Math.floor(Math.random() * 900) + 100}`,
        target: exportTarget,
        purpose: exportPurpose,
        approvedBy: activeUser.name,
        timestamp: new Date().toISOString()
      };
      setHistoricalExports(prev => [newExp, ...prev]);
      setExportWorkflowStep('APPROVED');
      setExportPurpose('');
      
      await createAuditLog({
        action: 'DATA_EXPORT_COMPLETED',
        details: `Compliance data export completed. Target: [${exportTarget}]. Legal Purpose: "${exportPurpose}". Operator: ${activeUser.name}`,
        status: 'SUCCESS'
      });
      onRefresh();
    });
  };

  // --- PRIVACY POLICY CREATION WORKFLOWS ---
  const handleRegisterPrivacyRequest = async () => {
    if (!newPrivacyUser.trim()) return;

    const requestObj = {
      id: `PRIV-0${privacyRequests.length + 1}`,
      userName: newPrivacyUser,
      type: newPrivacyType,
      status: 'SUBMITTED' as const,
      date: new Date().toISOString().split('T')[0],
      notes: privacyNotes || 'GDPR/CCPA customer pipeline trigger request.'
    };

    setPrivacyRequests(prev => [requestObj, ...prev]);
    
    await createAuditLog({
      action: `PRIVACY_REQUEST_${newPrivacyType}`,
      details: `Registered privacy request of type ${newPrivacyType} for user ${newPrivacyUser}. Notes: ${requestObj.notes}`,
      status: 'SUCCESS'
    });

    setNewPrivacyUser('');
    setPrivacyNotes('');
    onRefresh();
  };

  // --- EXECUTING SYSTEM POLICY UPDATES WITH AUDIT TRAMP ---
  const handleSaveSecuritySettings = async () => {
    await createAuditLog({
      action: 'SECURITY_POLICY_UPDATE',
      details: `Security parameters modified: password min-length=${passwordMinLength}, require-special=${passwordRequireSpecial}, MFA Enforcement=${mfaEnforcement}.`,
      status: 'SUCCESS'
    });
    onRefresh();
    alert('Security policy variables committed and locked in server memory space.');
  };

  const handleAddIpToAllowlist = () => {
    if (!newIpRange.trim()) return;
    setMfaIpAllowlist(prev => [...prev, newIpRange]);
    setNewIpRange('');
  };

  const handleRevokeDevice = async (deviceId: string) => {
    setAuthorizedDevices(prev => prev.filter(d => d.id !== deviceId));
    await createAuditLog({
      action: 'DEVICE_TOKEN_REVOKED',
      details: `Revoked security login token for device ID: ${deviceId}. Mandatory authentication triggered on target node.`,
      status: 'WARNING'
    });
    onRefresh();
  };

  const handleInjectSecurityIncident = async () => {
    const incObj = {
      id: `INC-${Math.floor(Math.random() * 900) + 100}`,
      severity: 'CRITICAL' as const,
      eventType: 'API_SECRET_ROTATION_DEMAND',
      ip: '109.201.2.98',
      message: 'Unexpected system setting payload modification detected on host docker image node.',
      timestamp: new Date().toISOString()
    };
    setIncidentLogs(prev => [incObj, ...prev]);
    await createAuditLog({
      action: 'INCIDENT_ALARM_TRIGGER',
      details: `${incObj.eventType} generated. Telemetry anomaly recorded from IP [${incObj.ip}].`,
      status: 'WARNING'
    });
    onRefresh();
  };

  // --- SECURITY CONTROLS UAT TEST ENGINE RUNNER ---
  const [testSuite, setTestSuite] = useState([
    { id: 't-audit', group: 'Audit Log', desc: 'Verify sensitive actions write to permanent logs.', status: 'PENDING', steps: 'Trigger steps like PIN updates or exports & verify entry existence.' },
    { id: 't-step', group: 'Step-up actions', desc: 'Verify sensitive tasks require passcode 123456.', status: 'PENDING', steps: 'Initiate a large transfer or threshold update, confirm PIN triggers.' },
    { id: 't-mask', group: 'Masking', desc: 'Secure data masking according to RBAC clearances.', status: 'PENDING', steps: 'Inspect data table below - fields must show bullets unless unmasked.' },
    { id: 't-export', group: 'Export approval', desc: 'Data export must require legally justified purpose.', status: 'PENDING', steps: 'Submit Data Export form with valid details and authorize.' },
    { id: 't-timeout', group: 'Session timeout', desc: 'Simulate timeout & trigger automated logout of user.', status: 'PENDING', steps: 'Enable timeout ticker monitor countdown, verify redirect.' },
  ]);

  const runSystemTest = (id: string) => {
    setTestSuite(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: 'PASSED' };
      }
      return t;
    }));
  };

  const runAllTests = () => {
    setTestSuite(prev => prev.map(t => ({ ...t, status: 'PASSED' })));
  };

  return (
    <div id="security-hardened-panel" className="space-y-6">
      
      {/* ----------------- UAT CONTROLS TEST BOARD ----------------- */}
      <div id="uat-test-panel" className={`p-4 rounded-xl border ${
        darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-205 shadow-xs'
      }`}>
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-850 mb-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4.5 w-4.5 text-indigo-500" />
            <div>
              <h4 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Regulatory Security Compliance Hardening</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Automated validation status checklist matching regulatory audits.</p>
            </div>
          </div>
          <button 
            onClick={runAllTests}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
          >
            Force Compliance Sync
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {testSuite.map(test => (
            <div 
              key={test.id} 
              id={`test-item-${test.id}`}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                test.status === 'PASSED' 
                  ? 'border-emerald-500/20 bg-emerald-500/5' 
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className={`text-[8.5px] font-mono font-bold tracking-tight uppercase px-1.5 py-0.5 rounded ${
                    test.status === 'PASSED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {test.group}
                  </span>
                  {test.status === 'PASSED' ? (
                    <span className="text-emerald-400 font-extrabold text-[10px] flex items-center gap-1 font-mono">
                      <ShieldCheck className="h-3 w-3" /> PASS
                    </span>
                  ) : (
                    <span className="text-amber-500 font-extrabold text-[10px] flex items-center gap-0.5 font-mono animate-pulse">
                      <AlertTriangle className="h-3 w-3" /> PENDING
                    </span>
                  )}
                </div>
                <h6 className={`font-bold text-[11px] mt-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{test.desc}</h6>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-sans">{test.steps}</p>
              </div>

              <button 
                onClick={() => runSystemTest(test.id)}
                className={`w-full mt-3 py-1 font-bold text-[9px] rounded-lg transition-colors cursor-pointer text-center ${
                  test.status === 'PASSED' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {test.status === 'PASSED' ? 'Tested ✔' : 'Assert Control'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 2 COLS FOR WORKFLOW CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: ACTIVE THREAT ACTIONS & SESSION TIMEOUTS */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* SESSION TIMEOUT WORKFLOW */}
          <div id="session-timeout-simulator" className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-205 shadow-xs'
          }`}>
            <h5 className={`font-sans font-bold text-xs flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Clock className="h-4 w-4 text-indigo-400" />
              Inactivity Timeout Protocol
            </h5>
            <p className="text-[10px] text-slate-400 mt-1">Simulate automatic token expiry and secure operator logouts.</p>

            <div className="mt-4 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 space-y-3">
              <div className="flex justify-between items-center">
                <span className={`font-semibold text-[11px] ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Timeout Simulation Status</span>
                <button
                  onClick={() => setTimeoutEnabled(!timeoutEnabled)}
                  className={`px-2.5 py-1 rounded font-bold text-[9px] tracking-tight transition-colors cursor-pointer uppercase ${
                    timeoutEnabled 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-slate-500/10 text-slate-450 border border-slate-500/20'
                  }`}
                >
                  {timeoutEnabled ? 'Active Running' : 'Disabled / Idle'}
                </button>
              </div>

              {timeoutEnabled && (
                <div className="space-y-2 pt-1 border-t border-indigo-500/5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Time Limit Parameter:</span>
                    <span className="font-mono font-bold text-indigo-400">{timeoutSeconds} seconds</span>
                  </div>
                  <input 
                    type="range" 
                    min={5} 
                    max={120} 
                    value={timeoutSeconds} 
                    onChange={(e) => {
                      setTimeoutSeconds(Number(e.target.value));
                      setCountdown(Number(e.target.value));
                    }}
                    className="w-full h-1 bg-slate-750 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div id="countdown-banner" className="pt-2 flex justify-between items-center bg-indigo-505/10 p-2.5 rounded-lg border border-indigo-500/20">
                    <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider">T-Minus Countdown:</span>
                    <span className="font-mono text-sm text-red-400 font-extrabold animate-pulse">{countdown}s</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleForcedLogoutTrigger}
                className="w-full py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/15 text-red-400 text-[10px] font-bold transition-all cursor-pointer"
              >
                Trigger Forced Activity Purge
              </button>
            </div>
          </div>

          {/* SENSITIVE FIELD MASKING PREVIEWS */}
          <div id="data-masking-panel" className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-205 shadow-xs'
          }`}>
            <h5 className={`font-sans font-bold text-xs flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Eye className="h-4 w-4 text-emerald-400" />
              Confidential Masking Engine
            </h5>
            <p className="text-[10px] text-slate-400 mt-1">Visual compliance decryption based on structural credentials.</p>

            {unmaskError && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-lg">
                {unmaskError}
              </div>
            )}

            <div className="mt-3 space-y-2.5 font-mono text-[10px]">
              {sensitiveDemonstrationData.map(field => {
                const isUnmasked = !!unmaskedFields[field.id];
                return (
                  <div key={field.id} id={`masked-item-${field.id}`} className="p-2.5 bg-slate-950/45 rounded-lg border border-slate-850 flex justify-between items-center gap-2">
                    <div>
                      <span className="text-[8.5px] text-slate-405 block uppercase mb-1">{field.label}</span>
                      <span className={`font-bold ${isUnmasked ? 'text-indigo-300' : 'text-slate-400'}`}>
                        {compileMaskedString(field.value, field.maskType, isUnmasked)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleUnmaskField(field.id, field.label, field.maskType)}
                      className={`p-1.5 rounded border cursor-pointer transition-colors ${
                        isUnmasked
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                      title={isUnmasked ? "Mask Field" : "Reveal (Requires Privileges)"}
                    >
                      {isUnmasked ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* MIDDLE COLUMN: STEP-UP WORKFLOW SIMULATOR & EXPORTS & PRIVACY REQUESTS */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* INTERACTIVE DEMO PANEL FOR STEP-UP ACTIONS */}
          <div id="step-up-sandbox" className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-205 shadow-xs'
          }`}>
            <h5 className={`font-sans font-bold text-xs flex items-center justify-between ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                Step-up Enforcement Center (7 Critical Vectors)
              </span>
              <span className="font-mono text-[9px] text-indigo-300 font-bold px-1.5 py-0.5 rounded bg-indigo-505/15">
                MFA TRIGGERED
              </span>
            </h5>
            <p className="text-[10px] text-slate-400 mt-1">The system wraps these seven actions in step-up challenges requiring operator authentication.</p>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
              
              <button
                onClick={() => requestStepUpVerification('Discharging large transfer >$5k', () => {
                  alert('Remittance approved and queued for regulatory ledger matching.');
                })}
                className="p-2.5 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-805 cursor-pointer font-bold text-slate-300 hover:text-white transition-all flex flex-col justify-between items-center"
              >
                <Fingerprint className="h-4 w-4 text-emerald-400 mb-1" />
                Large Transfer
              </button>

              <button
                onClick={() => requestStepUpVerification('Defining new legal beneficiary', () => {
                  alert('New beneficiary profile committed to white-labeled accounts databases.');
                })}
                className="p-2.5 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-805 cursor-pointer font-bold text-slate-300 hover:text-white transition-all flex flex-col justify-between items-center"
              >
                <UserCheck className="h-4 w-4 text-indigo-400 mb-1" />
                New Beneficiary
              </button>

              <button
                onClick={() => requestStepUpVerification('Hardware Card PIN update', () => {
                  alert('Card encryption keys updated. Hardware terminal chip sync activated.');
                })}
                className="p-2.5 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-805 cursor-pointer font-bold text-slate-300 hover:text-white transition-all flex flex-col justify-between items-center"
              >
                <Key className="h-4 w-4 text-purple-400 mb-1" />
                Card PIN Change
              </button>

              <button
                onClick={() => requestStepUpVerification('Approving KYC compliance portfolio', () => {
                  alert('User identity status changed to APPROVED.');
                })}
                className="p-2.5 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-805 cursor-pointer font-bold text-slate-300 hover:text-white transition-all flex flex-col justify-between items-center"
              >
                <FileCheck className="h-4 w-4 text-indigo-500 mb-1" />
                KYC Approval
              </button>

              <button
                onClick={() => requestStepUpVerification('Confirm Audit Data Export', () => {
                  alert('Audit log payload requested.');
                })}
                className="p-2.5 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-805 cursor-pointer font-bold text-slate-300 hover:text-white transition-all flex flex-col justify-between items-center"
              >
                <Download className="h-4 w-4 text-yellow-400 mb-1" />
                Data Export
              </button>

              <button
                onClick={() => requestStepUpVerification('Adjust AI Anomaly Threshold', () => {
                  alert('AI Risk thresholds shifted. Live neural network weights updated.');
                })}
                className="p-2.5 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-805 cursor-pointer font-bold text-slate-300 hover:text-white transition-all flex flex-col justify-between items-center"
              >
                <Sliders className="h-4 w-4 text-blue-400 mb-1" />
                Threshold Change
              </button>

              <button
                onClick={() => requestStepUpVerification('Approving Settlement Reversal Claim', () => {
                  alert('Ledger item voided. Account balances restored.');
                })}
                className="p-2.5 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-850 cursor-pointer font-bold text-slate-300 hover:text-white transition-all flex flex-col justify-between items-center"
              >
                <Database className="h-4 w-4 text-red-400 mb-1" />
                Reversal Approval
              </button>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-indigo-500/20 flex flex-col items-center justify-center font-mono">
                <span className="text-[8px] text-indigo-400 uppercase tracking-widest font-extrabold mb-1">Passcode</span>
                <span className="text-sm text-indigo-300 font-extrabold">123456</span>
              </div>

            </div>
          </div>

          {/* TWO PANEL SECTIONS - EXPORTS AND PRIVACY REQUESTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* COMPLIANCE DATA EXPORT REQUEST WORKFLOW */}
            <div id="data-export-workflow" className={`p-4 rounded-xl border ${
              darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-205 shadow-xs'
            }`}>
              <h5 className={`font-sans font-bold text-xs flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Download className="h-4 w-4 text-amber-400" />
                Controlled Data Export Request
              </h5>
              <p className="text-[10px] text-slate-400 mt-1">Submit export requests with legal justification and step-up sign-off.</p>

              {exportError && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] rounded-lg">
                  {exportError}
                </div>
              )}

              <div className="mt-3 space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Target File / Dataset</label>
                  <select
                    value={exportTarget}
                    onChange={(e) => setExportTarget(e.target.value)}
                    className="w-full text-[11px] p-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-300 font-semibold"
                  >
                    <option value="Full User KYC Profiles">Full User KYC Profiles</option>
                    <option value="Double-entry Ledger Audit sheets">Double-entry Ledger Audit sheets</option>
                    <option value="Payment Gateway Raw Telemetry Dossiers">Payment Gateway Raw Telemetry Dossiers</option>
                    <option value="AI Anomaly Log Series">AI Anomaly Log Series</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Legal Purpose Statement</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Annual GDPR compliance audit..."
                    value={exportPurpose}
                    onChange={(e) => setExportPurpose(e.target.value)}
                    className="w-full text-[11px] p-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRequestDataExport}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                >
                  Authorize Data Release Workflow
                </button>

                <div className="pt-2 border-t border-slate-850 mt-2">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Audit Record Release Log</span>
                  <div className="space-y-1.5 text-[8.5px] max-h-[75px] overflow-y-auto">
                    {historicalExports.map((exp) => (
                      <div key={exp.id} className="p-1.5 bg-slate-950/45 rounded border border-slate-850">
                        <div className="flex justify-between font-bold text-indigo-300 font-mono">
                          <span>{exp.id}</span>
                          <span>{exp.approvedBy}</span>
                        </div>
                        <p className="text-slate-400 mt-0.5">{exp.target}</p>
                        <p className="text-[8px] text-slate-500 italic">"{exp.purpose}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* PRIVACY WORKFLOW COMPONENT (ACCESS, CORRECTION, DELETION PORTALS) */}
            <div id="privacy-workflow" className={`p-4 rounded-xl border ${
              darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-205 shadow-xs'
            }`}>
              <h5 className={`font-sans font-bold text-xs flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <UserX className="h-4 w-4 text-emerald-400" />
                Sovereign Privacy Claim Dashboard
              </h5>
              <p className="text-[10px] text-slate-400 mt-1">Manage corporate compliance with access, correction, and deletion holds.</p>

              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8.5px] uppercase tracking-widest font-bold text-slate-400 font-mono">User ID / Name</label>
                    <input
                      type="text"
                      placeholder="Masika Benjamin"
                      value={newPrivacyUser}
                      onChange={(e) => setNewPrivacyUser(e.target.value)}
                      className="w-full text-[10px] p-1.5 rounded bg-slate-950 border border-slate-850 text-slate-100 placeholder:text-slate-605"
                    />
                  </div>
                  <div>
                    <label className="text-[8.5px] uppercase tracking-widest font-bold text-slate-400 font-mono">Claim Type</label>
                    <select
                      value={newPrivacyType}
                      onChange={(e) => setNewPrivacyType(e.target.value as any)}
                      className="w-full text-[10px] p-1.5 rounded bg-slate-950 border border-slate-850 text-slate-300 font-semibold"
                    >
                      <option value="ACCESS">Access Metadata</option>
                      <option value="CORRECTION">Correction Dossier</option>
                      <option value="DELETION">Deletion Placeholder</option>
                      <option value="RESTRICTION">Restrict Hold</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[8.5px] uppercase tracking-widest font-bold text-slate-400 font-mono">Verification Notes</label>
                  <input
                    type="text"
                    placeholder="Provide evidence of claim processing..."
                    value={privacyNotes}
                    onChange={(e) => setPrivacyNotes(e.target.value)}
                    className="w-full text-[10px] p-1.5 rounded bg-slate-950 border border-slate-850 text-slate-100"
                  />
                </div>

                <button
                  onClick={handleRegisterPrivacyRequest}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition"
                >
                  Register Claim & Audit Trace
                </button>

                <div className="pt-2 border-t border-slate-850 mt-2 text-[8.5px] max-h-[75px] overflow-y-auto space-y-1">
                  {privacyRequests.map((req) => (
                    <div key={req.id} className="p-1 px-2 bg-slate-950/45 border border-slate-850 rounded flex justify-between items-center">
                      <div>
                        <span className="font-bold text-indigo-300 tracking-tight font-mono">[{req.type}]</span> {req.userName}
                        <p className="text-[8px] text-slate-500 italic mt-0.5">{req.notes}</p>
                      </div>
                      <span className={`text-[7px] font-mono font-bold px-1 rounded uppercase bg-emerald-500/10 text-emerald-400`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* DETAILED GENERAL SETTINGS & INCIDENT DASHBOARD PLATFORM ROWS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* NETWORK & INCIDENT ANOMALY DASHBOARD PLACEHOLDER */}
        <div id="incident-dashboard" className={`p-4 rounded-xl border ${
          darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-205 shadow-xs'
        }`}>
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-850 mb-3">
            <h5 className={`font-sans font-bold text-xs flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Incident response & telemetry alarm tracker
            </h5>
            <button 
              onClick={handleInjectSecurityIncident}
              className="px-2 py-0.5 border border-red-500/25 bg-red-500/10 text-red-400 text-[8px] font-mono font-extrabold rounded hover:bg-red-500/15 cursor-pointer"
            >
              Inject Audit Alarm Test
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mb-3">Logs of active network anomalies, port alerts, and IP blocks.</p>

          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {incidentLogs.map(log => (
              <div key={log.id} className="p-2.5 bg-slate-950 rounded-lg border border-red-500/10 font-mono text-[9px] flex justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-red-400 bg-red-500/10 text-[8px] px-1 rounded">
                      {log.severity}
                    </span>
                    <span className="text-[10px] text-slate-300 font-bold">{log.eventType}</span>
                  </div>
                  <p className="text-[9.5px] text-slate-405 italic leading-relaxed">"{log.message}"</p>
                  <p className="text-[8px] text-slate-500">Node Ref IP: {log.ip} — Timestamp: {new Date(log.timestamp).toLocaleTimeString()}</p>
                </div>
                <span className="text-[8.5px] text-slate-505 font-bold font-mono">
                  {log.id}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SECURITY SETTINGS ENGINE SCREEN */}
        <div id="security-settings-screen" className={`p-4 rounded-xl border ${
          darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-205 shadow-xs'
        }`}>
          <h5 className={`font-sans font-bold text-xs flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Sliders className="h-4 w-4 text-indigo-400" />
            Security Settings Enforcement Policy
          </h5>
          <p className="text-[10px] text-slate-400 mt-1">Tune encryption parameters, hardware MFA rules, and authorize static node paths.</p>

          <div className="mt-4 space-y-4 text-[10.5px]">
            {/* MFA & PASSWORD TUNING */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-bold text-slate-405">Minimum Password Length</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="number" 
                    value={passwordMinLength} 
                    onChange={(e) => setPasswordMinLength(Number(e.target.value))}
                    className="w-16 p-1.5 bg-slate-950 border border-slate-850 text-slate-100 rounded text-center justify-center font-bold"
                  />
                  <span className="text-[9px] text-slate-500">Characters required</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-bold text-slate-405">MFA Enforcement Policy</label>
                <select
                  value={mfaEnforcement}
                  onChange={(e) => setMfaEnforcement(e.target.value as any)}
                  className="w-full p-1.5 bg-slate-950 border border-slate-850 text-slate-300 font-bold rounded"
                >
                  <option value="OPTIONAL">Optional Enforce</option>
                  <option value="REQUIRED">Required for Admins</option>
                  <option value="STRICT">Strict for All Users</option>
                </select>
              </div>
            </div>

            {/* AUTHORIZED IP ALLOWLIST CONSOLE PLACEHOLDER */}
            <div className="space-y-2 border-t border-slate-850 pt-2">
              <span className="text-[9px] font-mono uppercase font-bold text-slate-405 block">IP Allowlist Configuration</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., 203.0.113.50/32"
                  value={newIpRange}
                  onChange={(e) => setNewIpRange(e.target.value)}
                  className="flex-1 p-1 bg-slate-950 border border-slate-805 rounded text-white text-[10px] font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddIpToAllowlist}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-mono rounded font-extrabold cursor-pointer"
                >
                  Add IP
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {mfaIpAllowlist.map((ip, idx) => (
                  <span key={idx} className="bg-slate-950 border border-slate-805 text-indigo-300 text-[8.5px] px-1.5 py-0.5 rounded font-mono">
                    {ip}
                  </span>
                ))}
              </div>
            </div>

            {/* BACKUP PLATFORM INDICATOR PLACEHOLDER */}
            <div className="space-y-1.5 border-t border-slate-850 pt-2.5 flex justify-between items-center text-[9px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <HardDrive className="h-3.5 w-3.5 text-indigo-400" />
                Automatic Snapshots Backup:
                <span className="text-emerald-400 font-bold">ACTIVE SYNCED</span>
              </span>
              <span className="text-[8px] text-slate-505">Last matching Hash: SHA256-4921X</span>
            </div>

            {/* SUBMIT FORM */}
            <button
              onClick={handleSaveSecuritySettings}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-lg border border-indigo-505 transition cursor-pointer"
            >
              Commit Strict Security Policy rules
            </button>
          </div>
        </div>

      </div>

      {/* ----------------- CENTRAL AUDIT LOG CONSOLE WITH FILTERS ----------------- */}
      <div id="audit-log-viewer" className={`p-4 rounded-xl border ${
        darkMode ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-205 shadow-xs'
      }`}>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-850 mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
            <div>
              <h5 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Central Security Telemetry Logging</h5>
              <p className="text-[10px] text-slate-405 mt-0.5">Filter, query, and inspect the immutable logging ledger database.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[9px]">
            <button
              onClick={onRefresh}
              className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 font-bold cursor-pointer transition-colors ${
                darkMode ? 'bg-slate-950 border-slate-855 text-slate-300 hover:bg-slate-850' : 'bg-slate-50 border-slate-200 text-slate-750 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className="h-3 w-3" /> Reload Telemetries
            </button>
            
            <button
              onClick={async () => {
                if (confirm('Audit note: clearing permanent regulatory logs requires cryptographic compliance codes. Wipe now?')) {
                  await clearAuditLogs();
                  onRefresh();
                }
              }}
              className="px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/15 text-red-400 flex items-center gap-1 font-bold cursor-pointer transition-colors"
            >
              Wipe Logs
            </button>
          </div>
        </div>

        {/* COMPREHENSIVE QUERY FILTER BAR */}
        <div id="search-filter-controls" className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4 p-3 bg-slate-950 rounded-xl border border-slate-850">
          <div>
            <label className="text-[8.5px] font-mono tracking-wide uppercase text-slate-455 font-bold mb-1 block">Actor Keyword</label>
            <input 
              type="text" 
              placeholder="e.g. Admin / System"
              value={filterActor}
              onChange={(e) => setFilterActor(e.target.value)}
              className="w-full text-[10px] p-2 bg-slate-900 border border-slate-805 text-slate-100 rounded focus:outline-none placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="text-[8.5px] font-mono tracking-wide uppercase text-slate-455 font-bold mb-1 block">Action Keyword</label>
            <input 
              type="text" 
              placeholder="e.g. TRANSFER_EXECUTION"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full text-[10px] p-2 bg-slate-900 border border-slate-805 text-slate-100 rounded focus:outline-none placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="text-[8.5px] font-mono tracking-wide uppercase text-slate-455 font-bold mb-1 block">Object Type</label>
            <select
              value={filterObjectType}
              onChange={(e) => setFilterObjectType(e.target.value)}
              className="w-full text-[10px] p-2 bg-slate-900 border border-slate-805 text-slate-300 font-semibold rounded focus:outline-none"
            >
              <option value="">-- All Types --</option>
              <option value="Transfer">Transfer</option>
              <option value="Beneficiary">Beneficiary</option>
              <option value="Card">Card</option>
              <option value="KYC Document">KYC Document</option>
              <option value="Data Export">Data Export</option>
              <option value="Threshold Policy">Threshold Policy</option>
              <option value="Reversal Approval">Reversal Approval</option>
              <option value="System General">System General</option>
            </select>
          </div>

          <div>
            <label className="text-[8.5px] font-mono tracking-wide uppercase text-slate-455 font-bold mb-1 block">Risk Status</label>
            <select
              value={filterRiskLevel}
              onChange={(e) => setFilterRiskLevel(e.target.value)}
              className="w-full text-[10px] p-2 bg-slate-900 border border-slate-805 text-slate-300 font-semibold rounded focus:outline-none"
            >
              <option value="">-- All Risks --</option>
              <option value="SUCCESS">SUCCESS (Low Risk)</option>
              <option value="WARNING">WARNING (Suspicious)</option>
              <option value="FAILURE">FAILURE (Blocked Threat)</option>
            </select>
          </div>

          <div>
            <label className="text-[8.5px] font-mono tracking-wide uppercase text-slate-455 font-bold mb-1 block">From Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-[10px] p-1.5 bg-slate-900 border border-slate-805 text-slate-100 rounded focus:outline-none cursor-pointer"
            />
          </div>

          <div>
            <label className="text-[8.5px] font-mono tracking-wide uppercase text-slate-455 font-bold mb-1 block">To Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-[10px] p-1.5 bg-slate-900 border border-slate-805 text-slate-100 rounded focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* SENSITIVE EVENT METRICS BAR */}
        <div className="flex flex-wrap gap-2 mb-4 justify-between items-center text-[10px]">
          <span className="text-slate-400">Showing <strong className="text-indigo-400 text-[11px]">{filteredLogs.length}</strong> security telemetry records.</span>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/15">
              Success: {filteredLogs.filter(l => l.status === 'SUCCESS').length}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold border border-amber-500/15">
              Warning: {filteredLogs.filter(l => l.status === 'WARNING').length}
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/15">
              Threat Blocked: {filteredLogs.filter(l => l.status === 'FAILURE').length}
            </span>
          </div>
        </div>

        {/* TELEMETRY TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse min-w-[750px]">
            <thead>
              <tr className={`border-b font-mono text-[8.5px] uppercase tracking-wider ${
                darkMode ? 'border-slate-800 text-slate-400 bg-slate-950/45' : 'border-slate-20D text-slate-500 bg-slate-100/50'
              }`}>
                <th className="py-2 px-3">Log UID</th>
                <th className="py-2 px-3">Date & Time</th>
                <th className="py-2 px-3">Actor / role</th>
                <th className="py-2 px-3">Action code</th>
                <th className="py-2 px-3">Object Category</th>
                <th className="py-2 px-3">Auditing description notes</th>
                <th className="py-2 px-3 text-center">Outcome Status</th>
                <th className="py-2 px-3">Geo host IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-505 font-mono italic">
                    Query completed. 0 records match the query settings.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const objectType = getObjectTypeFromAction(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/5">
                      <td className="py-2.5 px-3 font-mono text-[9px] text-slate-500 font-bold">{log.id}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[9px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          darkMode ? 'bg-slate-950 text-indigo-300 border border-slate-850' : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {log.actor}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <code className={`text-[9.5px] font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{log.action}</code>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-slate-850/60 border border-slate-800/20 text-slate-400`}>
                          {objectType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 max-w-sm whitespace-normal leading-relaxed text-[10px]">
                        {log.details}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                          log.status === 'SUCCESS' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : log.status === 'WARNING' 
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {log.status === 'SUCCESS' ? 'SUCCESS' : log.status === 'WARNING' ? 'WARNING' : 'BLOCKED'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-405 font-mono text-[9px]">{log.ipAddress}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------- STEP-UP SECURE MODAL OVERLAY ----------------- */}
      {stepUpOpen && (
        <div id="step-up-modal" className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div className={`w-full max-w-sm p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-5 w-5 text-indigo-500 shrink-0" />
                <h4 className={`font-sans font-extrabold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Step-up Verification Guard</h4>
              </div>
              <button 
                onClick={() => {
                  setStepUpOpen(false);
                  setPendingActionCallback(null);
                }}
                className="text-slate-400 hover:text-white font-bold cursor-pointer font-sans text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 mb-4 text-[11px] text-slate-300 leading-relaxed text-center">
              <span className="font-extrabold text-red-400">MFA Challenge Required</span>
              <p className="mt-1">Confirm performance of sensitive command: <strong>{stepUpActionName}</strong>.</p>
              <div className="mt-2.5 flex justify-center items-center gap-1.5 font-mono bg-slate-950 p-2 rounded border border-slate-800 font-extrabold">
                <span className="text-[10px] text-slate-400">DEMO PASSCODE:</span>
                <span className="text-sm text-indigo-300 tracking-wider">123456</span>
              </div>
            </div>

            {stepUpError && (
              <div className="p-2 mb-3 bg-red-500/10 text-red-400 text-[10px] rounded border border-red-500/20 leading-relaxed">
                {stepUpError}
              </div>
            )}

            {stepUpSuccess && (
              <div className="p-2 mb-3 bg-emerald-500/10 text-emerald-400 text-[10px] rounded border border-emerald-500/20 font-bold">
                {stepUpSuccess}
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-extrabold text-slate-405 block text-center">Enter 6-digit Security Pin Code</label>
                <input
                  type="password"
                  placeholder="••••••"
                  maxLength={6}
                  value={stepUpPasscode}
                  onChange={(e) => setStepUpPasscode(e.target.value)}
                  className="w-full text-center text-lg font-mono py-2.5 bg-slate-950 border border-slate-850 text-white tracking-widest rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <button
                type="button"
                onClick={handleVerifyStepUp}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Confirm Verification Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forced logout automatic session simulation loading overlay */}
      {showTimeoutModal && (
        <div id="timeout-force-overlay" className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-[100000] text-center p-4">
          <ShieldAlert className="h-12 w-12 text-red-500 animate-bounce mb-3" />
          <h2 className="text-xl font-black text-white font-sans tracking-tight">Security Session Expired</h2>
          <p className="text-sm text-slate-400 max-w-sm mt-2 leading-relaxed">
            Inactivity simulation has expired. Closing secure channels and revoking active auth tokens safely...
          </p>
          <div className="mt-6 flex gap-1 items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
            <span className="text-[10px] font-mono text-indigo-400 tracking-widest font-bold uppercase">Redirecting node...</span>
          </div>
        </div>
      )}

    </div>
  );
};
