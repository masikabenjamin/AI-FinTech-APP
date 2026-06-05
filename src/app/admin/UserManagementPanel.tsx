import React, { useState } from 'react';
import { UserProfile, Transaction, AuditLog, RBACRole } from '../../types';
import { updateUserProfile, createAuditLog } from '../../services/api';
import { 
  Search, 
  Filter, 
  User, 
  ShieldAlert, 
  CreditCard, 
  Smartphone, 
  History, 
  Eye, 
  EyeOff, 
  LockOpen, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { StatusBadge, RiskBadge } from '../../components/DesignSystem';

interface UserManagementPanelProps {
  users: UserProfile[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  activeOperator: UserProfile;
  darkMode?: boolean;
  onRefreshAll: () => void;
}

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({
  users,
  transactions,
  auditLogs,
  activeOperator,
  darkMode = false,
  onRefreshAll
}) => {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [kycFilter, setKycFilter] = useState<string>('ALL');
  const [cardFilter, setCardFilter] = useState<string>('ALL');

  // Active Selected User for Detail Panel
  const [selectedUserId, setSelectedUserId] = useState<string | null>(users[0]?.id || null);

  // Decryption/reveal state mapping: Record<userId_fieldId, boolean>
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  
  // Decryption validation overlay state
  const [activeRevealRequest, setActiveRevealRequest] = useState<{
    userId: string;
    fieldId: 'email' | 'card' | 'address';
    fieldName: string;
    originalValue: string;
  } | null>(null);
  const [revealReason, setRevealReason] = useState('');
  const [revealError, setRevealError] = useState<string | null>(null);

  // Administrative override values
  const [updatingUser, setUpdatingUser] = useState(false);
  const [overrideRemarks, setOverrideRemarks] = useState('');

  // Authorized roles check for sensitive unmasking
  const AUTHORIZED_DECRYPT_ROLES: RBACRole[] = ['Super Admin', 'Compliance Analyst', 'Risk Manager', 'Operations Officer'];
  const isAuthorizedToReveal = AUTHORIZED_DECRYPT_ROLES.includes(activeOperator.role);

  // Active selected user object
  const targetUser = users.find(u => u.id === selectedUserId);

  // Mocked associated devices for the UAT timeline
  const getMockDevices = (userId: string) => {
    const devices: Record<string, Array<{ name: string; type: string; ip: string; location: string; lastSeen: string }>> = {
      'usr-1': [
        { name: 'Apple iPhone 14 Pro', type: 'Mobile (iOS 17.4)', ip: '194.22.180.12', location: 'New York, USA', lastSeen: '10 mins ago' },
        { name: 'MacBook Pro 16"', type: 'Desktop (macOS Sonoma)', ip: '194.22.180.14', location: 'New York, USA', lastSeen: '1 hour ago' }
      ],
      'usr-2': [
        { name: 'Samsung Galaxy S23 Ultra', type: 'Mobile (Android 14)', ip: '82.115.15.220', location: 'London, UK', lastSeen: '3 mins ago' }
      ],
      'usr-3': [
        { name: 'Google Pixel 8 Pro', type: 'Mobile (Android 14)', ip: '201.55.91.44', location: 'Lagos, Nigeria', lastSeen: 'Just now' }
      ]
    };
    return devices[userId] || [
      { name: 'Generic Web Browser', type: 'Desktop (Chrome 125)', ip: '12.42.105.185', location: 'Paris, France', lastSeen: '2 hours ago' }
    ];
  };

  // Filter users based on query choices
  const filteredUsers = users.filter(user => {
    // Only search customer/admin profiles matching criteria
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = riskFilter === 'ALL' || user.riskTier === riskFilter;
    const matchesKyc = kycFilter === 'ALL' || user.kycStatus === kycFilter;
    const matchesCard = cardFilter === 'ALL' || user.cardStatus === cardFilter;

    return matchesSearch && matchesRisk && matchesKyc && matchesCard;
  });

  // Handle opening decryption overlay
  const handleRequestReveal = (userId: string, fieldId: 'email' | 'card' | 'address', fieldName: string, originalValue: string) => {
    setRevealReason('');
    setRevealError(null);
    setActiveRevealRequest({ userId, fieldId, fieldName, originalValue });
  };

  // Process reveal authorization check and log audit event
  const confirmReveal = async () => {
    if (!activeRevealRequest) return;
    
    if (!isAuthorizedToReveal) {
      setRevealError(`Unauthorised access validation blocked: Your role (${activeOperator.role}) lacks decryption permissions. Failed entry was logged.`);
      // Dispatch failed audit log to backend
      try {
        await createAuditLog({
          action: 'ACCESS_DENIED_SENSITIVE',
          details: `Role ${activeOperator.role} (${activeOperator.name}) attempted to unmask ${activeRevealRequest.fieldName} on user ${activeRevealRequest.userId} without necessary decryption keys. Status: BLOCKED.`,
          status: 'FAILURE'
        });
        onRefreshAll();
      } catch (err) {
        console.error('Audit recording failed', err);
      }
      return;
    }

    if (!revealReason.trim() || revealReason.trim().length < 6) {
      setRevealError('Mandatory auditable reason mapping must be at least 6 characters long.');
      return;
    }

    try {
      // Dispatch security audit log
      await createAuditLog({
        action: 'CONFIDENTIAL_UNMASK',
        details: `Operator unmasked high-security field [${activeRevealRequest.fieldName}] on client profile ${activeRevealRequest.userId}. Audit motivation recorded: "${revealReason}"`,
        status: 'SUCCESS'
      });
      
      // Update local reveal mapping state
      const key = `${activeRevealRequest.userId}_${activeRevealRequest.fieldId}`;
      setRevealedFields(prev => ({ ...prev, [key]: true }));
      setActiveRevealRequest(null);
      onRefreshAll();
    } catch (err: any) {
      setRevealError(err.message || 'Error publishing audit log parameters.');
    }
  };

  // Quick manual overrides: Risk level & Wallet card status
  const handleUpdateUserParameters = async (field: 'riskTier' | 'cardStatus', nextValue: any) => {
    if (!selectedUserId || !targetUser) return;
    if (activeOperator.role === 'Support Agent') {
      alert('🔒 Access Denied: Support Agents are restricted from modifying client financial configurations.');
      return;
    }

    if (!overrideRemarks.trim()) {
      alert('Please specify an operational check reason/remark code for user modifications.');
      return;
    }

    setUpdatingUser(true);
    try {
      await updateUserProfile(selectedUserId, { [field]: nextValue });
      // Clear logs and re-fetch status
      setOverrideRemarks('');
      onRefreshAll();
      alert(`User profile parameters modified successfully.`);
    } catch (err: any) {
      alert(err.message || 'Verification rejected.');
    } finally {
      setUpdatingUser(false);
    }
  };

  // Helpers to render confidential/masked variables
  const getMaskedValue = (userId: string, fieldId: 'email' | 'card' | 'address', rawValue: string) => {
    const revealedKey = `${userId}_${fieldId}`;
    if (revealedFields[revealedKey]) {
      return (
        <span className="font-bold text-emerald-400 font-mono text-xs select-all">
          {rawValue}
        </span>
      );
    }

    // Mask output depending on layout
    if (fieldId === 'email') {
      const parts = rawValue.split('@');
      if (parts.length === 2) {
        const name = parts[0];
        const maskedName = name[0] + '••••' + name[name.length - 1];
        return <span className="font-mono text-slate-500">{maskedName}@{parts[1]}</span>;
      }
    }

    if (fieldId === 'card') {
      return <span className="font-mono text-slate-500 bg-slate-905 px-1 rounded">•••• •••• •••• {rawValue.slice(-4)}</span>;
    }

    return <span className="italic text-slate-450">[CONFIDENTIAL AUDIT MASK - TS RULE]</span>;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 text-xs text-left">
      
      {/* LEFT COLUMN: Search filters & matching accounts list (Span 4) */}
      <div className="xl:col-span-4 flex flex-col gap-4">
        
        <div className={`p-4 rounded-3xl border transition-all ${
          darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          
          <div className="mb-4">
            <h5 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Account Directory
            </h5>
            <p className="text-[10.5px] text-slate-400 mt-0.5">
              Review and inspect compliance clearance of platform client assets.
            </p>
          </div>

          {/* Search bar input */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full font-mono pl-9 pr-3 py-2 text-[11px] rounded-xl border focus:outline-none focus:border-indigo-500 transition-all ${
                darkMode ? 'bg-slate-950 border-slate-805 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>

          {/* Expanded filters rows */}
          <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-850">
            <div>
              <span className="text-[9px] uppercase font-mono text-slate-400 block font-bold mb-1.5 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Risk Designation
              </span>
              <div className="flex flex-wrap gap-1">
                {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map(rt => (
                  <button
                    key={rt}
                    onClick={() => setRiskFilter(rt)}
                    className={`font-mono text-[9px] px-2 py-1 rounded transition-all cursor-pointer ${
                      riskFilter === rt 
                        ? 'bg-indigo-650 text-white font-bold' 
                        : darkMode ? 'bg-slate-950 text-slate-400 hover:bg-slate-850' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {rt}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[9px] uppercase font-mono text-slate-400 block font-bold mb-1.5">
                KYC Clear Status
              </span>
              <div className="flex flex-wrap gap-1">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'ESCALATED', 'PENDING_INFO'].map(ks => (
                  <button
                    key={ks}
                    onClick={() => setKycFilter(ks)}
                    className={`font-mono text-[9px] px-2 py-1 rounded transition-all cursor-pointer ${
                      kycFilter === ks 
                        ? 'bg-indigo-650 text-white font-bold' 
                        : darkMode ? 'bg-slate-950 text-slate-400 hover:bg-slate-850' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {ks === 'PENDING_INFO' ? 'NEED INFO' : ks}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[9px] uppercase font-mono text-slate-400 block font-bold mb-1.5">
                Wallet / Card Status
              </span>
              <div className="flex flex-wrap gap-1">
                {['ALL', 'ACTIVE', 'FROZEN', 'BLOCKED'].map(cs => (
                  <button
                    key={cs}
                    onClick={() => setCardFilter(cs)}
                    className={`font-mono text-[9px] px-2 py-1 rounded transition-all cursor-pointer ${
                      cardFilter === cs 
                        ? 'bg-indigo-650 text-white font-bold' 
                        : darkMode ? 'bg-slate-950 text-slate-400 hover:bg-slate-850' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cs}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* User profile selection list */}
        <div className={`p-4 rounded-3xl border transition-all grow overflow-y-auto max-h-[460px] ${
          darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="space-y-1.5">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-405 font-mono">
                No matching client profiles.
              </div>
            ) : (
              filteredUsers.map(user => {
                const isSelected = user.id === selectedUserId;
                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border flex items-center justify-between ${
                      isSelected
                        ? darkMode ? 'bg-indigo-950/40 border-indigo-500/50' : 'bg-indigo-50/70 border-indigo-200'
                        : darkMode ? 'bg-slate-900/10 border-transparent hover:bg-slate-90s/30' : 'bg-slate-50/40 border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-indigo-400' : 'bg-slate-205/60 text-indigo-600'}`}>
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <div className={`font-bold text-[11.5px] ${darkMode ? 'text-white' : 'text-slate-850'}`}>
                          {user.name}
                        </div>
                        <div className="text-[9.5px] text-slate-400 font-mono mt-0.5 flex gap-1 items-center">
                          <span className="font-bold uppercase tracking-wider">{user.id}</span>
                          <span>•</span>
                          <span>{user.role}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col gap-1 items-end">
                      <RiskBadge level={user.riskTier} />
                      <span className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded font-black border uppercase ${
                        user.kycStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        user.kycStatus === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        user.kycStatus === 'ESCALATED' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse' :
                        user.kycStatus === 'PENDING_INFO' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        'bg-rose-500/10 text-rose-450 border-rose-500/20'
                      }`}>
                        KYC: {user.kycStatus}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Selected user detailed dossier & auditing cockpit (Span 8) */}
      <div className="xl:col-span-8">
        
        {!targetUser ? (
          <div className={`p-12 text-center rounded-3xl border w-full flex flex-col justify-center items-center ${
            darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <User className="h-12 w-12 text-slate-400 mb-3 animate-bounce" />
            <span className="font-bold block text-sm">No Client Selected</span>
            <p className="text-slate-400 mt-1 max-w-sm">
              Please click a profile row in the directory list to examine credentials, review live device audits, and perform overrides.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Bento Card 1: Customer Profile Details Header */}
            <div className={`p-5 rounded-3xl border transition-all ${
              darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
            }`}>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-850 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-3xl bg-indigo-650 text-white font-bold flex items-center justify-center text-sm font-sans uppercase">
                    {targetUser.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <h4 className={`text-md font-sans font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{targetUser.name}</h4>
                    <div className="text-[10px] text-slate-450 font-mono mt-1 flex flex-wrap gap-2 items-center">
                      <span className="bg-slate-200/50 dark:bg-slate-950 px-1.5 py-0.5 rounded font-black text-indigo-400">{targetUser.id}</span>
                      <span>•</span>
                      <span>Assigned: {targetUser.role}</span>
                      <span>•</span>
                      <span>FICO Credit Score: <strong className="text-emerald-400">{targetUser.creditScore}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-start sm:items-end gap-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Current Ledger Balance</span>
                  <span className={`font-mono text-md font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    ${targetUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} {targetUser.currency}
                  </span>
                </div>
              </div>

              {/* Secure client details and Decryption/Unmask fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Visual Metadata Dossier */}
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-900">
                    <span className="text-slate-405">Security Risk designation:</span>
                    <RiskBadge level={targetUser.riskTier} />
                  </div>
                  
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-900">
                    <span className="text-slate-405">KYC Clearance designation:</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      targetUser.kycStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      targetUser.kycStatus === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      targetUser.kycStatus === 'ESCALATED' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse' :
                      targetUser.kycStatus === 'PENDING_INFO' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      'bg-rose-500/10 text-rose-450 border-rose-500/20'
                    }`}>
                      {targetUser.kycStatus}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-900">
                    <span className="text-slate-405">Cards/Wallet Blocked status:</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      targetUser.cardStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      targetUser.cardStatus === 'FROZEN' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-rose-500/10 text-rose-450 border-rose-500/20'
                    }`}>
                      {targetUser.cardStatus}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-900">
                    <span className="text-slate-405">Sovereign Saving Goal:</span>
                    <span className="text-slate-300">${targetUser.savingCurrent} / ${targetUser.savingGoal}</span>
                  </div>
                </div>

                {/* SENSITIVE MASKED DATA BOARD */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  darkMode ? 'bg-slate-950/60 border-slate-850' : 'bg-slate-50 border-slate-150'
                }`}>
                  <h6 className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-indigo-450" /> High-Security Compliance Decryptions
                  </h6>

                  {/* Masked Email */}
                  <div className="flex items-center justify-between gap-1 py-1 border-b border-slate-100 dark:border-slate-900 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Confidential Email Registry</span>
                      <div className="mt-1">{getMaskedValue(targetUser.id, 'email', targetUser.email)}</div>
                    </div>
                    {!revealedFields[`${targetUser.id}_email`] ? (
                      <button
                        onClick={() => handleRequestReveal(targetUser.id, 'email', 'Client Primary Email Address', targetUser.email)}
                        className="p-1 px-2 border border-indigo-500/30 text-[9.5px] hover:bg-slate-950 rounded text-indigo-450 transition-colors flex items-center gap-1 cursor-pointer font-extrabold uppercase font-mono"
                      >
                        <Eye className="h-3.5 w-3.5" /> Reveal
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const k = `${targetUser.id}_email`;
                          setRevealedFields(prev => ({ ...prev, [k]: false }));
                        }}
                        className="px-1.5 py-0.5 bg-slate-800 text-[9px] hover:bg-slate-900 rounded text-slate-400 transition-colors cursor-pointer"
                      >
                        Mask
                      </button>
                    )}
                  </div>

                  {/* Masked Card Number */}
                  <div className="flex items-center justify-between gap-1 py-1 border-b border-slate-100 dark:border-slate-900 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Master Sovereign Card Check</span>
                      <div className="mt-1">{getMaskedValue(targetUser.id, 'card', targetUser.cardNumber)}</div>
                    </div>
                    {!revealedFields[`${targetUser.id}_card`] ? (
                      <button
                        onClick={() => handleRequestReveal(targetUser.id, 'card', 'Physical Credit Card Registry', targetUser.cardNumber)}
                        className="p-1 px-2 border border-indigo-500/30 text-[9.5px] hover:bg-slate-950 rounded text-indigo-450 transition-colors flex items-center gap-1 cursor-pointer font-extrabold uppercase font-mono"
                      >
                        <Eye className="h-3.5 w-3.5" /> Reveal
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const k = `${targetUser.id}_card`;
                          setRevealedFields(prev => ({ ...prev, [k]: false }));
                        }}
                        className="px-1.5 py-0.5 bg-slate-800 text-[9px] hover:bg-slate-900 rounded text-slate-400 transition-colors cursor-pointer"
                      >
                        Mask
                      </button>
                    )}
                  </div>

                  {/* Masked Private Address */}
                  <div className="flex items-center justify-between gap-1 py-1 pb-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Residence Compliance Geocode</span>
                      <div className="mt-1">{getMaskedValue(targetUser.id, 'address', '710 Sovereign Trust Towers, London EC2N 1AR, United Kingdom')}</div>
                    </div>
                    {!revealedFields[`${targetUser.id}_address`] ? (
                      <button
                        onClick={() => handleRequestReveal(targetUser.id, 'address', 'Residence Compliance Geocode Address', '710 Sovereign Trust Towers, London EC2N 1AR, United Kingdom')}
                        className="p-1 px-2 border border-indigo-500/30 text-[9.5px] hover:bg-slate-950 rounded text-indigo-450 transition-colors flex items-center gap-1 cursor-pointer font-extrabold uppercase font-mono"
                      >
                        <Eye className="h-3.5 w-3.5" /> Reveal
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const k = `${targetUser.id}_address`;
                          setRevealedFields(prev => ({ ...prev, [k]: false }));
                        }}
                        className="px-1.5 py-0.5 bg-slate-800 text-[9px] hover:bg-slate-900 rounded text-slate-400 transition-colors cursor-pointer"
                      >
                        Mask
                      </button>
                    )}
                  </div>

                </div>

              </div>
            </div>

            {/* Bento Card 2: Override & Risk Parameters Management */}
            <div className={`p-5 rounded-3xl border transition-all ${
              darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h5 className={`font-sans font-bold text-sm mb-3 flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Sliders className="h-4.5 w-4.5 text-indigo-450 animate-spin" style={{ animationDuration: '6s' }} /> Client Parameter Overrides
              </h5>

              <div className="space-y-4">
                
                {/* Remarks Reason Input */}
                <div className="space-y-1">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase font-mono block">Auditing Reason Mapping Code (Mandatory for Operations Logs):</span>
                  <input
                    type="text"
                    value={overrideRemarks}
                    onChange={(e) => setOverrideRemarks(e.target.value)}
                    placeholder="E.g. Verified tax filings manually, overrides risks to LOW..."
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-indigo-500 ${
                      darkMode ? 'bg-slate-950 border-slate-805 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Risk Tier Modifiers */}
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block mb-2">Alter Operational Risk Tier</span>
                    <div className="flex gap-1.5">
                      {['LOW', 'MEDIUM', 'HIGH'].map(tier => {
                        const isCurrent = targetUser.riskTier === tier;
                        return (
                          <button
                            key={tier}
                            disabled={updatingUser}
                            onClick={() => handleUpdateUserParameters('riskTier', tier)}
                            className={`grow font-mono py-2 rounded-xl border font-bold transition-all text-[11px] cursor-pointer ${
                              isCurrent 
                                ? 'bg-indigo-650 text-white border-indigo-600 shadow-sm'
                                : darkMode ? 'bg-[#0f172a] hover:bg-slate-850 text-slate-300 border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {tier}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Wallet Lock modifiers */}
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block mb-2">Configure Card & Wallet Boundaries</span>
                    <div className="flex gap-1.5">
                      {['ACTIVE', 'FROZEN', 'BLOCKED'].map(status => {
                        const isCurrent = targetUser.cardStatus === status;
                        return (
                          <button
                            key={status}
                            disabled={updatingUser}
                            onClick={() => handleUpdateUserParameters('cardStatus', status)}
                            className={`grow font-mono py-2 rounded-xl border font-bold transition-all text-[11px] cursor-pointer ${
                              isCurrent 
                                ? 'bg-rose-600 text-white border-rose-500'
                                : darkMode ? 'bg-[#0f172a] hover:bg-slate-850 text-slate-300 border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Grid Layout 3: Live Associated Devices & Linked Audit Logs Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Device Check (Span 5) */}
              <div className={`lg:col-span-5 p-5 rounded-3xl border transition-all ${
                darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <h5 className={`font-sans font-bold text-sm mb-3.5 flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Smartphone className="h-4 w-4 text-indigo-400" /> Linked Client Devices ({getMockDevices(targetUser.id).length})
                </h5>

                <div className="space-y-3">
                  {getMockDevices(targetUser.id).map((device, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-2xl border flex items-start gap-2 ${
                        darkMode ? 'bg-slate-950/50 border-slate-850' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0 mt-0.5">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div className="grow min-w-0">
                        <div className={`font-bold font-mono text-[11px] truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{device.name}</div>
                        <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">{device.type}</div>
                        <div className="text-[9px] text-indigo-400 font-mono mt-1 flex justify-between">
                          <span>IP: {device.ip}</span>
                          <span>{device.location}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions list & Timeline audits (Span 7) */}
              <div className={`lg:col-span-7 p-5 rounded-3xl border transition-all ${
                darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <h5 className={`font-sans font-bold text-sm mb-3.5 flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <History className="h-4.5 w-4.5 text-indigo-400" /> Administrative Audit Timeline records
                </h5>

                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {auditLogs.filter(log => 
                    log.details.toLowerCase().includes(targetUser.name.toLowerCase()) || 
                    log.details.toLowerCase().includes(targetUser.id.toLowerCase()) ||
                    log.actor.toLowerCase().includes(targetUser.name.toLowerCase())
                  ).length === 0 ? (
                    <div className="py-12 text-center text-slate-405 font-mono text-[10.5px]">
                      No audit timeline recordings for this client file.
                    </div>
                  ) : (
                    auditLogs.filter(log => 
                      log.details.toLowerCase().includes(targetUser.name.toLowerCase()) || 
                      log.details.toLowerCase().includes(targetUser.id.toLowerCase()) ||
                      log.actor.toLowerCase().includes(targetUser.name.toLowerCase())
                    ).slice(0, 10).map(log => (
                      <div 
                        key={log.id}
                        className={`p-2.5 rounded-xl border leading-relaxed text-[10.5px] ${
                          log.status === 'FAILURE' 
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
                            : log.status === 'WARNING'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                              : darkMode ? 'bg-slate-950/60 border-slate-900 text-slate-350' : 'bg-slate-50 border-slate-100 text-slate-655'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1 mb-1.5">
                          <span>👤 ACTOR: {log.actor}</span>
                          <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="font-mono text-[10px] break-words">
                          <strong className="text-white">[{log.action}]</strong> {log.details}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Grid Layout 4: Recent client transfers and transaction registers */}
            <div className={`p-5 rounded-3xl border transition-all ${
              darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-205'
            }`}>
              <h5 className={`font-sans font-bold text-sm mb-3.5 flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <CreditCard className="h-4.5 w-4.5 text-indigo-400" /> Recent Client Transaction registers
              </h5>

              <div className="overflow-x-auto select-none">
                <table className="w-full text-left border-collapse font-sans text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-400 font-mono text-[9px] uppercase tracking-wider">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Transaction ID</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150/40 dark:divide-slate-850/50">
                    {transactions.filter(t => t.senderId === targetUser.id || t.receiverId === targetUser.id).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-405 font-mono">
                          No historical transfers recorded for this balance.
                        </td>
                      </tr>
                    ) : (
                      transactions.filter(t => t.senderId === targetUser.id || t.receiverId === targetUser.id).slice(0, 8).map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/10">
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                            {new Date(tx.date).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold tracking-tight text-indigo-400 uppercase">
                            {tx.id}
                          </td>
                          <td className="py-2.5 px-3 font-semibold">
                            {tx.description}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold underline text-[9.5px] uppercase">{tx.category}</span>
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                            tx.senderId === targetUser.id ? 'text-rose-450' : 'text-emerald-450'
                          }`}>
                            {tx.senderId === targetUser.id ? '-' : '+'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-[8.5px] font-mono font-bold px-2 py-0.3 rounded border ${
                              tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              tx.status === 'FLAGGED' ? 'bg-rose-500/10 text-rose-450 border-rose-500/20 animate-pulse' :
                              tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* SENSITIVE DECRYPTION OVERLAY VERIFICATION MODAL */}
      {activeRevealRequest && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`p-6 rounded-3xl border w-full max-w-md shadow-2xl relative animate-in zoom-in-95 ${
            darkMode ? 'bg-slate-900 border-slate-805 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h5 className="font-extrabold text-sm mb-2 flex items-center gap-1.5 font-sans">
              <ShieldAlert className="h-5 w-5 text-indigo-400" /> Mandatory Compliance Challenge
            </h5>

            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              You are attempting to decrypt user parameter: <strong className="text-white">[{activeRevealRequest.fieldName}]</strong>. Your administrative credentials will be checked.
            </p>

            <div className={`p-3 rounded-2xl border text-[10.5px] leading-relaxed mb-4 font-mono ${
              darkMode ? 'bg-slate-950/50 border-slate-850 text-slate-400' : 'bg-slate-50 border-slate-150 text-slate-700'
            }`}>
              <div className="flex justify-between">
                <span>Active Operator:</span>
                <span className="text-white font-bold">{activeOperator.name}</span>
              </div>
              <div className="flex justify-between mt-1.5">
                <span>Access Role clearance:</span>
                <span className="text-indigo-400 font-bold uppercase">{activeOperator.role}</span>
              </div>
              <div className="flex justify-between mt-1.5">
                <span>Database checksum:</span>
                <span className="text-emerald-450 font-bold">SECURED-AES-256</span>
              </div>
            </div>

            {revealError && (
              <div className="p-3 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-xl mb-4 leading-relaxed font-mono">
                {revealError}
              </div>
            )}

            {isAuthorizedToReveal ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Motivation Code for unmasking / check:</span>
                  <input
                    type="text"
                    required
                    value={revealReason}
                    onChange={(e) => setRevealReason(e.target.value)}
                    placeholder="E.g. Validating signature map on document..."
                    className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:border-indigo-500 ${
                      darkMode ? 'bg-slate-950 border-slate-805 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={confirmReveal}
                    className="grow py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs"
                  >
                    Authorize Decryption & Reveal
                  </button>
                  <button
                    onClick={() => setActiveRevealRequest(null)}
                    className={`grow py-2.5 rounded-xl font-bold transition-colors cursor-pointer text-xs ${
                      darkMode ? 'bg-[#0f172a] hover:bg-slate-850 text-slate-400 border border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-rose-450 font-bold leading-relaxed">
                  🔒 ACCESS BLOCK: Support Agents are strictly forbidden from viewing raw customer card numbers or private residence geocodes. Clicking close will record this unauthorized attempt.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmReveal}
                    className="grow py-2.5 bg-rose-600 hover:bg-rose-550 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs"
                  >
                    Dismiss attempt & Log Audit Fail
                  </button>
                  <button
                    onClick={() => setActiveRevealRequest(null)}
                    className={`grow py-2.5 rounded-xl font-bold transition-colors cursor-pointer text-xs ${
                      darkMode ? 'bg-[#0f172a] hover:bg-slate-850 text-slate-400 border border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
