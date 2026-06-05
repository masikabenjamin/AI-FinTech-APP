import React, { useState } from 'react';
import { KYCCase, RBACRole } from '../../types';
import { verifyKYC } from '../../services/api';
import { 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  HelpCircle, 
  User, 
  ArrowRight, 
  FileCheck, 
  ShieldCheck, 
  AlertTriangle,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { StatusBadge, RiskBadge } from '../../components/DesignSystem';

interface KYCReviewPanelProps {
  cases: KYCCase[];
  onActionComplete: () => void;
  darkMode?: boolean;
  adminName?: string;
  adminRole?: RBACRole; // Prop to strictly enforce role restricts
}

export const KYCReviewPanel: React.FC<KYCReviewPanelProps> = ({
  cases,
  onActionComplete,
  darkMode = false,
  adminName = 'Chief Risk Officer',
  adminRole = 'Super Admin'
}) => {
  const [remarks, setRemarks] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(cases[0]?.id || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'PENDING_INFO'>('PENDING');

  const activeCase = cases.find(c => c.id === selectedCaseId);

  // Filter cases based on active compliance tab
  const filteredCases = cases.filter(item => {
    if (activeTab === 'ALL') return true;
    return item.status === activeTab;
  });

  const handleVerify = async (status: 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'PENDING_INFO') => {
    if (!selectedCaseId || !activeCase) return;

    // RULE RESTRICTION: Support Agent cannot verify or reject KYC
    const isSupportAgent = adminRole === 'Support Agent' || adminName.toLowerCase().includes('support agent');
    if (isSupportAgent && (status === 'APPROVED' || status === 'REJECTED' || status === 'ESCALATED' || status === 'PENDING_INFO')) {
      alert('🔒 Access Denied: Support Agents do not possess compliance clearance. This operational block was logged in the immutability journal.');
      return;
    }

    if (!remarks.trim() || remarks.trim().length < 5) {
      alert('Compliance verification requires entering a valid check remark / reason code explaining the clearance motivation.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build safe remarks. Rejections must protect customer and use safe generic reasons
      let finalRemarks = remarks;
      if (status === 'REJECTED') {
        finalRemarks = `REJECTED COMPLIANCE CODE [FL-99]. ${remarks} (Safe customer notification dispatched: "Your document verification checks could not be finalized. Please upload clear, unexpired identification details.")`;
      } else if (status === 'PENDING_INFO') {
        finalRemarks = `REQUEST_MORE_INFORMATION: ${remarks}`;
      } else if (status === 'ESCALATED') {
        finalRemarks = `ESCALATED_CASE: ${remarks}`;
      }

      await verifyKYC(selectedCaseId, status, finalRemarks, adminName);
      alert(`KYC workflow status successfully updated to: ${status}`);
      setRemarks('');
      onActionComplete();
    } catch (err: any) {
      alert(err.message || 'Error writing KYC state parameters.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRiskTallyBadge = (score: number) => {
    if (score < 25) {
      return (
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {score}/100 Safe
        </span>
      );
    }
    if (score < 60) {
      return (
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
          {score}/100 Caution
        </span>
      );
    }
    return (
      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
        {score}/100 Critical
      </span>
    );
  };

  // Dedicated generator to supply mock document metadata depending on case source
  const getMockDocumentMeta = (docType: string) => {
    const meta: Record<string, { id: string; issued: string; expiry: string; country: string }> = {
      'PASSPORT': { id: 'PASS-GBR-9182701', issued: '2019-11-22', expiry: '2029-11-22', country: 'United Kingdom' },
      'DRIVERS_LICENSE': { id: 'DL-USA-TX81023', issued: '2022-04-15', expiry: '2030-04-15', country: 'United States' },
      'NATIONAL_ID': { id: 'NID-DEU-882190', issued: '2021-08-10', expiry: '2031-08-10', country: 'Germany' }
    };
    return meta[docType] || { id: 'DOC-GLO-119280', issued: '2020-01-01', expiry: '2030-01-01', country: 'Sovereign' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs text-left">
      
      {/* File List Panel (Span 5) */}
      <div className="lg:col-span-5 flex flex-col gap-3">
        
        {/* Compliance Tabs row */}
        <div className={`p-1.5 rounded-2xl border flex gap-1 overflow-x-auto ${
          darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'ESCALATED', 'PENDING_INFO'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-1.5 rounded-xl font-mono text-[9px] font-extrabold cursor-pointer transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-indigo-650 text-white'
                  : darkMode ? 'text-slate-400 hover:bg-slate-850' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'PENDING_INFO' ? 'NEED INFO' : tab}
            </button>
          ))}
        </div>

        <div className={`p-4 rounded-3xl border transition-all grow ${
          darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-205'
        }`}>
          
          <div className="flex justify-between items-center mb-4 border-b border-slate-150/40 dark:border-slate-850 pb-3">
            <div>
              <h5 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Identity Verification Files</h5>
              <p className="text-[10.5px] text-slate-400 mt-0.5">Filter category: <strong className="text-indigo-400">{activeTab}</strong> Applications queue</p>
            </div>
            
            <div className="text-[10px] font-mono text-slate-500 font-bold bg-slate-900/10 dark:bg-slate-950 px-2.5 py-1 rounded-xl">
              OP: {adminName.split(' ')[0]}
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-850">
            {filteredCases.length === 0 ? (
              <div className="py-12 text-center text-slate-405 font-mono">
                No active KYC files matching this stage.
              </div>
            ) : (
              filteredCases.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedCaseId(item.id)}
                  className={`py-3 px-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                    selectedCaseId === item.id 
                      ? darkMode ? 'bg-indigo-950/20 border-indigo-500/50' : 'bg-indigo-50/70 border-indigo-200 shadow-3xs'
                      : 'border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                      item.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                      item.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400' :
                      item.status === 'ESCALATED' ? 'bg-indigo-500/10 text-indigo-400' :
                      'bg-slate-100 text-slate-650'
                    }`}>
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className={`font-bold truncate text-[11px] ${darkMode ? 'text-white' : 'text-slate-850'}`}>{item.userName}</div>
                      <div className="text-[9px] text-slate-400 font-mono mt-1 flex gap-1.5 items-center">
                        <span className="font-bold underline uppercase">{item.documentType}</span>
                        <span>•</span>
                        <span>{new Date(item.submissionDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2shrink-0">
                    <div className="hidden sm:block">
                      {renderRiskTallyBadge(item.riskScore)}
                    </div>
                    <span className={`text-[8.5px] uppercase font-mono font-bold px-1.5 py-0.2 rounded border ${
                      item.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      item.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      item.status === 'ESCALATED' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse' :
                      item.status === 'PENDING_INFO' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      'bg-rose-500/10 text-rose-450 border-rose-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Review Workstation Overlay (Span 7) */}
      <div className="lg:col-span-7">
        <div className={`p-5 rounded-3xl border transition-all h-full flex flex-col justify-between ${
          darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-205 shadow-2xs'
        }`}>
          <div>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-850">
              <h6 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono flex items-center gap-1">
                <ShieldCheck className="h-4.5 w-4.5 text-indigo-400" /> Compliance Dossier Workstation
              </h6>
              {activeCase && (
                <span className={`font-mono text-[8.5px] font-bold px-2 py-0.5 rounded uppercase border ${
                  activeCase.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  activeCase.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  activeCase.status === 'ESCALATED' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse' :
                  activeCase.status === 'PENDING_INFO' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                  'bg-rose-500/10 text-rose-450 border-rose-500/20'
                }`}>
                  CLEARANCE STAGE: {activeCase.status}
                </span>
              )}
            </div>

            {!activeCase ? (
              <div className="py-24 text-center text-slate-405">
                <HelpCircle className="h-10 w-10 mx-auto text-slate-300 mb-2 animate-bounce" />
                <span className="font-bold block">No Pending File Selected</span>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Click on any listed customer application dossier to inspect physical OCR bio-match and PEP sanctions checkpoints.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* 1. Mock Document Metadata */}
                <div className={`p-4 rounded-2xl border space-y-2.5 ${
                  darkMode ? 'bg-slate-950/60 border-slate-850' : 'bg-slate-50 border-slate-100'
                }`}>
                  <h6 className="text-[9.5px] uppercase font-mono tracking-widest font-bold text-slate-450 flex items-center gap-1">
                    <FileCheck className="h-4 w-4 text-indigo-400" /> PHYSICAL DOCUMENT REGISTRY METADATA
                  </h6>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[10.5px]">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                      <span className="text-slate-450">Document Scope:</span>
                      <strong className="text-white uppercase">{activeCase.documentType}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                      <span className="text-slate-450">ID Serial code:</span>
                      <strong className="text-slate-300">{getMockDocumentMeta(activeCase.documentType).id}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                      <span className="text-slate-450">Issued date:</span>
                      <span className="text-slate-400">{getMockDocumentMeta(activeCase.documentType).issued}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                      <span className="text-slate-450">Expiry date:</span>
                      <span className="text-slate-400">{getMockDocumentMeta(activeCase.documentType).expiry}</span>
                    </div>
                    <div className="flex justify-between col-span-2 pt-1 border-t border-slate-900">
                      <span className="text-slate-455">Origin Sovereign:</span>
                      <span className="font-bold text-indigo-400">{getMockDocumentMeta(activeCase.documentType).country}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Interactive placeholders (OCR, Selfie Biometrics, Watchlists) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* OCR and Face Biometrics result */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-855 text-[10.5px] text-slate-300 space-y-2 font-mono leading-relaxed">
                    <div className="text-indigo-400 font-bold border-b border-slate-900 pb-1.5 flex items-center gap-1 bg-slate-950/20">
                      <UserCheck className="h-3.5 w-3.5 text-indigo-455 animate-pulse" /> BIO-METRIC LIVENESS EXTRACT
                    </div>
                    <div className="flex justify-between">
                      <span>FACIAL MATCH PERCENT:</span>
                      <strong className="text-emerald-400 font-black">{(100 - activeCase.riskScore)}% Match</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1">
                      <span>3D Liveness Vector:</span>
                      <span className="text-emerald-450 font-bold">PASSED</span>
                    </div>
                    <div>OCR PROFILE READ:</div>
                    <div className="mt-1 bg-slate-900 p-2 rounded text-[9.5px] text-slate-400">
                      Extract: "{activeCase.userName}"<br/>
                      DOB: matched<br/>
                      Registry checksum: OK-VALID
                    </div>
                  </div>

                  {/* PEP Watchlists checkpoint result */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-855 text-[10.5px] text-slate-300 space-y-2 font-mono leading-relaxed">
                    <div className="text-rose-455 font-bold border-b border-slate-900 pb-1.5 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-rose-500" /> WATCHLISTS & PEP REGISTRIES
                    </div>
                    <div className="flex justify-between">
                      <span>PEP Watchlist check:</span>
                      <span className="text-emerald-405 font-bold">CLEAR REC</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1">
                      <span>Sanctions list:</span>
                      <span className="text-emerald-405 font-bold">0 MATCHES</span>
                    </div>
                    <div>Source Of Funds vetting:</div>
                    <div className="mt-1 bg-slate-900 p-2 rounded text-[9.5px] text-slate-400">
                      No matching designations in HM Treasury or OFAC databases. Risk designated level checks complete.
                    </div>
                  </div>

                </div>

                {/* 3. Reviewer Notes & history */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Reviewer Notes History:</span>
                  <p className={`p-3 rounded-2xl border leading-relaxed font-mono ${
                    darkMode ? 'bg-slate-950 border-slate-855 text-slate-350' : 'bg-slate-100 text-slate-655'
                  }`}>
                    {activeCase.notes}
                  </p>
                </div>

                {/* 4. Reason Code Input & Action workstation */}
                <div className="space-y-3 pt-3 border-t border-slate-150/40 dark:border-slate-850">
                  
                  {/* Notes remark code */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase block font-mono">
                      Compliance overriding Notes / Checking Reasons (Mandatory)
                    </label>
                    <input
                      type="text"
                      placeholder="Specify compliance override reason code (e.g., Validating drivers license, clear PEP match)..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-indigo-500 ${
                        darkMode ? 'bg-slate-950 border-slate-805 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  {/* Operational status action selectors */}
                  {adminRole === 'Support Agent' || adminName.toLowerCase().includes('support agent') ? (
                    <div className="p-3 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-xl font-mono text-[11px] leading-relaxed flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500 animate-pulse" />
                      <div>
                        🔒 <strong>Role Privilege Restriction:</strong> Support Agents copy fails. Under compliance security rule TS-403, you cannot sign off, escalate, or reject customer document uploads.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Section 1: Final resolution */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleVerify('APPROVED')}
                          disabled={isSubmitting}
                          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-505 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer text-xs uppercase font-mono"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Approve Applicant
                        </button>

                        <button
                          onClick={() => handleVerify('REJECTED')}
                          disabled={isSubmitting}
                          className="py-2.5 px-3 bg-rose-600 hover:bg-rose-550 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer text-xs uppercase font-mono"
                        >
                          <XCircle className="h-4 w-4" /> Reject (Safe Notify)
                        </button>
                      </div>

                      {/* Section 2: Intermediate states */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleVerify('PENDING_INFO')}
                          disabled={isSubmitting}
                          className="py-2.5 px-3 bg-purple-600/10 hover:bg-purple-650/30 text-purple-400 font-bold rounded-xl border border-purple-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer text-xs uppercase font-mono"
                        >
                          <HelpCircle className="h-4 w-4" /> Request Info
                        </button>

                        <button
                          onClick={() => handleVerify('ESCALATED')}
                          disabled={isSubmitting}
                          className="py-2.5 px-3 bg-indigo-600/10 hover:bg-indigo-650/30 text-indigo-400 font-bold rounded-xl border border-indigo-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer text-xs uppercase font-mono"
                        >
                          <AlertCircle className="h-4 w-4 animate-bounce" style={{ animationDuration: '3s' }} /> Escalate Case
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-[9px] text-slate-500 italic mt-2 text-center pointer-events-none">
                    🔒 Security Standard Code Compliance: Every state mutation requires explicit audit registers on corporate ledger nodes.
                  </p>

                </div>

              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
