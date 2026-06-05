import React, { useState } from 'react';
import { submitKYC } from '../services/api';
import { UserProfile, KYCCase } from '../types';
import { 
  ShieldCheck, 
  User, 
  Smartphone, 
  FileText, 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  ChevronRight, 
  Info, 
  Upload, 
  RefreshCw,
  Sparkles,
  Fingerprint,
  RotateCcw,
  BookOpen
} from 'lucide-react';

interface EkycOnboardingWizardProps {
  user: UserProfile;
  darkMode?: boolean;
  onOnboardingComplete: (updatedUser: UserProfile) => void;
}

export const EkycOnboardingWizard: React.FC<EkycOnboardingWizardProps> = ({
  user,
  darkMode = false,
  onOnboardingComplete
}) => {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 8;

  // Step 2 variables: Contact simulation
  const [contactCode, setContactCode] = useState<string>('');
  const [contactVerified, setContactVerified] = useState<boolean>(false);
  const [isSendingCode, setIsSendingCode] = useState<boolean>(false);
  const [showCodeInput, setShowCodeInput] = useState<boolean>(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Step 3 variables: Personal Form
  const [legalName, setLegalName] = useState<string>(user.name || '');
  const [dob, setDob] = useState<string>('1994-04-12');
  const [country, setCountry] = useState<string>('United States');
  const [address, setAddress] = useState<string>('542 Pine Street, Suite 400, San Francisco, CA');
  const [occupation, setOccupation] = useState<string>('Sovereign Fund Analyst');
  const [sourceOfFunds, setSourceOfFunds] = useState<string>('Investment Discretion');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Step 4 variable: Document choice
  const [documentType, setDocumentType] = useState<'PASSPORT' | 'DRIVERS_LICENSE' | 'NATIONAL_ID'>('PASSPORT');

  // Step 5 variables: Upload preview & quality simulation
  const [docFileUploaded, setDocFileUploaded] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [isExtractingOcr, setIsExtractingOcr] = useState<boolean>(false);
  const [ocrData, setOcrData] = useState<any>(null);
  
  // Simulated outcome: 
  // 'APPROVED' (automatic approval)
  // 'PENDING' (blurry/unclear -> review queue)
  // 'REJECTED' (expired/expired ID -> reject)
  const [simulatedOutcome, setSimulatedOutcome] = useState<'APPROVED' | 'PENDING' | 'REJECTED'>('APPROVED');

  // Step 6 variables: Biometric face capture
  const [faceScanActive, setFaceScanActive] = useState<boolean>(false);
  const [faceScanComplete, setFaceScanComplete] = useState<boolean>(false);
  const [faceScanProgress, setFaceScanProgress] = useState<number>(0);

  // Submission results
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Helper validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!legalName.trim()) errors.legalName = 'Full legal identity name is required.';
    if (!dob) errors.dob = 'Date of birth is mandatory.';
    if (!country) errors.country = 'Sovereign nation citizenship must be declared.';
    if (!address.trim()) errors.address = 'Primary residential coordinates/address required.';
    if (!occupation.trim()) errors.occupation = 'Current job/occupation is required.';
    if (!sourceOfFunds) errors.sourceOfFunds = 'Sovereign origin of wealth must be selected.';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Simulate contact verification code dispatch
  const handleSendCode = () => {
    setIsSendingCode(true);
    setContactError(null);
    setTimeout(() => {
      setIsSendingCode(false);
      setShowCodeInput(true);
    }, 1000);
  };

  const handleVerifyCode = () => {
    setContactError(null);
    if (contactCode === '777888' || contactCode === '123456') {
      setContactVerified(true);
      setTimeout(() => {
        setStep(3);
      }, 800);
    } else {
      setContactError('Invalid configuration passcode. Use sandbox default: 777888');
    }
  };

  // Document upload simulation
  const handleSimulatedUpload = (outcome: 'APPROVED' | 'PENDING' | 'REJECTED') => {
    setSimulatedOutcome(outcome);
    setDocFileUploaded(true);
    let nameSuffix = 'passport_scan.jpg';
    if (documentType === 'DRIVERS_LICENSE') nameSuffix = 'driver_license_front.png';
    if (documentType === 'NATIONAL_ID') nameSuffix = 'national_id_card.png';
    setFileName(`usr-${user.id}_${nameSuffix}`);
    
    // Trigger simulated OCR data extraction
    setIsExtractingOcr(true);
    setTimeout(() => {
      setIsExtractingOcr(false);
      setOcrData({
        documentNumber: documentType === 'PASSPORT' 
          ? 'P-US-0938592-A' 
          : (documentType === 'DRIVERS_LICENSE' ? 'DL-CA-920491-9' : 'NAT-ID-88394-02'),
        fullName: legalName,
        dateOfBirth: dob,
        expiryDate: outcome === 'REJECTED' ? '2025-11-01 (EXPIRED)' : '2033-04-12',
        issuingCountry: country,
        confidenceScore: outcome === 'PENDING' ? '38.5% (BLURRY SCAN)' : '98.8% (CLEAN OPTICS)'
      });
    }, 1200);
  };

  // Face scanner loading
  const startFaceScanSim = () => {
    setFaceScanActive(true);
    setFaceScanProgress(0);
    let prg = 0;
    const interval = setInterval(() => {
      prg += 10;
      setFaceScanProgress(prg);
      if (prg >= 100) {
        clearInterval(interval);
        setFaceScanActive(false);
        setFaceScanComplete(true);
        setTimeout(() => {
          handleKYCFinalSubmission();
        }, 800);
      }
    }, 250);
  };

  // API Call to post data
  const handleKYCFinalSubmission = async () => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const payload = {
        legalName,
        dob,
        country,
        address,
        occupation,
        sourceOfFunds,
        documentType,
        simulatedOutcome
      };
      
      const res = await submitKYC(payload);
      setSubmissionResult(res);
      setStep(7);
    } catch (err: any) {
      setApiError(err.message || 'Failure during E-KYC persistence exchange.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`rounded-3xl p-5 select-none relative h-full flex flex-col justify-between ${
      darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'
    }`} id="onboarding-stepper-panel">
      
      {/* Top Banner indicating Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-[10.5px] font-mono text-slate-400">
          <span className="font-bold flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            SECURE ONBOARDING
          </span>
          <span>STEP {step} OF {totalSteps}</span>
        </div>
        
        {/* Flat Progress Pipeline */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden flex gap-0.5">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div 
              key={idx} 
              className={`h-full flex-1 rounded-sm transition-all duration-300 ${
                idx + 1 <= step 
                  ? 'bg-indigo-600' 
                  : 'bg-slate-300 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Screen Content Switcher */}
      <div className="grow flex flex-col justify-center min-h-[440px] py-1 text-slate-850 dark:text-slate-100">
        
        {/* STEP 1: WELCOME & BENEFITS */}
        {step === 1 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto h-16 w-16 bg-indigo-600/10 text-indigo-500 rounded-3xl flex items-center justify-center animate-bounce">
              <Sparkles className="h-8 w-8" />
            </div>
            
            <div className="space-y-1.5 mx-auto max-w-sm">
              <h3 className="text-lg font-bold tracking-tight">Unlock Sovereign Tiers</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Complete our legal compliance identity verification in under 3 minutes to unlock global double-entry cash vaults and asset transfers.
              </p>
            </div>

            <div className="text-left space-y-2 pt-2">
              <div className="flex gap-2.5 items-start p-2.5 rounded-xl bg-slate-50 dark:bg-slate-905/40 border border-slate-100 dark:border-slate-800">
                <span className="text-sm">🔒</span>
                <div>
                  <h5 className="font-bold text-[11px] leading-snug">IFRS-9 Double-Entry Assurance</h5>
                  <p className="text-[9.5px] text-slate-400">Balanced debit/credit ledger tracking guarantees safe custodial assets.</p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start p-2.5 rounded-xl bg-slate-50 dark:bg-slate-905/40 border border-slate-100 dark:border-slate-800">
                <span className="text-sm">💵</span>
                <div>
                  <h5 className="font-bold text-[11px] leading-snug">Instant Cash Funding</h5>
                  <p className="text-[9.5px] text-slate-400">Add cash up to $250,000.00 once verification completes.</p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start p-2.5 rounded-xl bg-slate-50 dark:bg-slate-905/40 border border-slate-100 dark:border-slate-800">
                <span className="text-sm">✈️</span>
                <div>
                  <h5 className="font-bold text-[11px] leading-snug">Sovereign Asset Transfers</h5>
                  <p className="text-[9.5px] text-slate-400">Seamless peer transfers with automatic algorithmic risk screening.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setStep(2)}
              id="onboard-start-btn"
              className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md cursor-pointer"
            >
              Start E-KYC Verified Flow <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* STEP 2: ACCOUNT REGISTRATION / CONTACT CODES */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-md font-bold flex items-center gap-1.5">
                <Smartphone className="h-4.5 w-4.5 text-indigo-500" />
                Contact Verification
              </h3>
              <p className="text-[11px] text-slate-400">
                Verify your client electronic coordinates to generate an authenticated session.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Registered Email Coordinate</label>
                <input 
                  type="email" 
                  disabled
                  value={user.email} 
                  className="w-full text-xs p-2.5 rounded-xl border bg-slate-100 dark:bg-slate-950/50 text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800"
                />
              </div>

              {!showCodeInput ? (
                <button 
                  onClick={handleSendCode}
                  id="onboard-send-code-btn"
                  disabled={isSendingCode}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSendingCode ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sending Session OTP Code...
                    </>
                  ) : (
                    'Generate Contact Verification Pin'
                  )}
                </button>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  <div className="p-2.5 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-550/20 text-indigo-600 dark:text-indigo-400 text-[10px] leading-relaxed">
                    🔑 <strong>APP Simulator code generated:</strong> Use verified sequence <strong>777888</strong> to authorize credentials immediately.
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Enter Verification One-Time Pin</label>
                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="7 7 7 8 8 8"
                      value={contactCode}
                      onChange={(e) => setContactCode(e.target.value)}
                      className={`w-full text-center tracking-widest text-md font-bold font-mono p-2 rounded-xl border focus:outline-none ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {contactError && (
                    <div className="p-2.5 text-[10.5px] font-semibold text-rose-500 bg-rose-500/10 rounded-xl flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {contactError}
                    </div>
                  )}

                  {contactVerified ? (
                    <div className="p-2.5 text-[10.5px] font-bold text-emerald-500 bg-emerald-500/10 rounded-xl flex items-center justify-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Pin Verified! Routing profile builder...
                    </div>
                  ) : (
                    <button 
                      onClick={handleVerifyCode}
                      id="onboard-verify-code-btn"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-550 text-white font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Audit Session Pin
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: PERSONAL PROFILE FORM */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="space-y-0.5">
              <h3 className="text-md font-bold flex items-center gap-1.5">
                <User className="h-4.5 w-4.5 text-indigo-500" />
                Legal Profile Builder
              </h3>
              <p className="text-[10.5px] text-slate-400">
                Supply verified passport-level credentials to satisfy strict international AML requirements.
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (validateForm()) setStep(4); }} className="space-y-2.5 pt-1.5">
              <div>
                <label className="text-[10px] font-bold block mb-0.5">Full Legal Identity Name</label>
                <input 
                  type="text" 
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className={`w-full text-xs px-3 py-1.5 rounded-lg border focus:outline-none ${
                    formErrors.legalName ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                  } ${darkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}
                />
                {formErrors.legalName && <span className="text-[9px] text-rose-500 block mt-0.5">{formErrors.legalName}</span>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold block mb-0.5">Date of Birth</label>
                  <input 
                    type="date" 
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={`w-full text-[11px] px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                      formErrors.dob ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                    } ${darkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}
                  />
                  {formErrors.dob && <span className="text-[9px] text-rose-500 block mt-0.5">{formErrors.dob}</span>}
                </div>

                <div>
                  <label className="text-[10px] font-bold block mb-0.5">Jurisdiction / Country</label>
                  <select 
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={`w-full text-[11px] px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                      darkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
                    } border-slate-200 dark:border-slate-800`}
                  >
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Germany">Germany</option>
                    <option value="Japan">Japan</option>
                    <option value="Nigeria">Nigeria</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold block mb-0.5">Residential Coordinates Address</label>
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / Apt / City / Postal"
                  className={`w-full text-xs px-3 py-1.5 rounded-lg border focus:outline-none ${
                    formErrors.address ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                  } ${darkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}
                />
                {formErrors.address && <span className="text-[9px] text-rose-500 block mt-0.5">{formErrors.address}</span>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold block mb-0.5">Primary Occupation</label>
                  <input 
                    type="text" 
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Manager"
                    className={`w-full text-xs px-3 py-1.5 rounded-lg border focus:outline-none ${
                      formErrors.occupation ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                    } ${darkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}
                  />
                  {formErrors.occupation && <span className="text-[9px] text-rose-500 block mt-0.5">{formErrors.occupation}</span>}
                </div>

                <div>
                  <label className="text-[10px] font-bold block mb-0.5">Source of Asset Capital</label>
                  <select 
                    value={sourceOfFunds}
                    onChange={(e) => setSourceOfFunds(e.target.value)}
                    className={`w-full text-[11px] px-2.5 py-1.5 bg-transparent rounded-lg border focus:outline-none ${
                      darkMode ? 'bg-slate-950 text-white font-semibold' : 'bg-white text-slate-900 font-semibold'
                    } border-slate-200 dark:border-slate-800`}
                  >
                    <option value="Salary / Earnings">Salary / Earnings</option>
                    <option value="Investment Discretion">Investment Discretion</option>
                    <option value="Inheritance Vault">Inheritance Vault</option>
                    <option value="Corporate Dividends">Corporate Dividends</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                id="onboard-submit-profile-btn"
                className="w-full mt-1.5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                Capture Legal Details <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 4: DOCUMENT TYPE SELECTION */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-md font-bold flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-indigo-500" />
                Select Identity Document
              </h3>
              <p className="text-[11px] text-slate-400">
                To guarantee absolute regulatory alignment, select which official sovereign certificate you want to scan.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div 
                onClick={() => setDocumentType('PASSPORT')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  documentType === 'PASSPORT' 
                    ? 'border-indigo-550 bg-indigo-500/5 dark:bg-indigo-500/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-350'
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <span className="text-xl">🗺️</span>
                  <div>
                    <h5 className="font-bold text-xs leading-none">International Passport</h5>
                    <p className="text-[10px] text-slate-450 mt-1">Accepts pages with clear biometric chip codes.</p>
                  </div>
                </div>
                {documentType === 'PASSPORT' && <CheckCircle className="h-4.5 w-4.5 text-indigo-500" />}
              </div>

              <div 
                onClick={() => setDocumentType('NATIONAL_ID')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  documentType === 'NATIONAL_ID' 
                    ? 'border-indigo-550 bg-indigo-500/5 dark:bg-indigo-500/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-350'
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <span className="text-xl">💳</span>
                  <div>
                    <h5 className="font-bold text-xs leading-none">National ID Badge</h5>
                    <p className="text-[10px] text-slate-450 mt-1">Requires double-sided state certificate snaps.</p>
                  </div>
                </div>
                {documentType === 'NATIONAL_ID' && <CheckCircle className="h-4.5 w-4.5 text-indigo-500" />}
              </div>

              <div 
                onClick={() => setDocumentType('DRIVERS_LICENSE')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  documentType === 'DRIVERS_LICENSE' 
                    ? 'border-indigo-550 bg-indigo-500/5 dark:bg-indigo-500/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-350'
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <span className="text-xl">🏎️</span>
                  <div>
                    <h5 className="font-bold text-xs leading-none">Driver's License</h5>
                    <p className="text-[10px] text-slate-450 mt-1">Accepts any state-issued driving permit authority card.</p>
                  </div>
                </div>
                {documentType === 'DRIVERS_LICENSE' && <CheckCircle className="h-4.5 w-4.5 text-indigo-500" />}
              </div>
            </div>

            <button 
              onClick={() => setStep(5)}
              id="onboard-select-doc-btn"
              className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              Continue to Capture Scanner <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* STEP 5: DOCUMENT PREVIEW & OCR EXTRACTION */}
        {step === 5 && (
          <div className="space-y-3.5 text-left">
            <div className="space-y-1">
              <h3 className="text-md font-bold flex items-center gap-1.5">
                <Upload className="h-4.5 w-4.5 text-indigo-500" />
                Document Capture & OCR
              </h3>
              <p className="text-[11px] text-slate-450 leading-normal">
                Upload a mock file or select which quality outcome to simulate for our automated AI check.
              </p>
            </div>

            {/* Simulated Upload Frame */}
            {!docFileUploaded ? (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-6 text-center select-none space-y-3">
                <Upload className="h-8 w-8 text-slate-400 mx-auto animate-pulse" />
                <div>
                  <h6 className="text-[11px] font-bold">Drag & Drop certificate files directly</h6>
                  <p className="text-[9.5px] text-slate-450 mt-1">Accepts high resolution scans (.jpg, .pdf, .png)</p>
                </div>
                
                <div className="flex flex-col gap-1.5 pt-2 max-w-[280px] mx-auto">
                  <span className="text-[9.5px] font-mono text-indigo-500 font-bold uppercase tracking-wider">Select APP Testing Case:</span>
                  
                  <button 
                    onClick={() => handleSimulatedUpload('APPROVED')}
                    id="sim-outcome-approved-btn"
                    className="py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-500/20 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                  >
                    🟢 Clear ID Card Scan (Auto-Approve)
                  </button>

                  <button 
                    onClick={() => handleSimulatedUpload('PENDING')}
                    id="sim-outcome-pending-btn"
                    className="py-1.5 bg-amber-600/10 hover:bg-amber-600 text-amber-600 hover:text-white border border-amber-500/20 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                  >
                    🟡 Blurry/Unclear Scan (Manual Audit Case)
                  </button>

                  <button 
                    onClick={() => handleSimulatedUpload('REJECTED')}
                    id="sim-outcome-rejected-btn"
                    className="py-1.5 bg-rose-600/10 hover:bg-rose-650 text-rose-600 hover:text-white border border-rose-500/20 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                  >
                    🔴 Expired/Flagged Scan (Auto-Reject)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* File uploaded indicator */}
                <div className="p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/15 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <div className="text-left">
                      <h6 className="text-[10.5px] font-bold leading-none truncate max-w-44">{fileName}</h6>
                      <p className="text-[9px] text-slate-450 mt-1 capitalize">{documentType.toLowerCase()} preview OK</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setDocFileUploaded(false)}
                    className="text-[9px] font-mono font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Delete [X]
                  </button>
                </div>

                {/* Simulated Lens Finder Viewport */}
                <div className="relative border-4 border-slate-900 rounded-xl overflow-hidden aspect-video bg-slate-950 flex flex-col justify-center items-center">
                  <div className="absolute top-2 left-2 border-t-2 border-l-2 border-white w-4 h-4" />
                  <div className="absolute top-2 right-2 border-t-2 border-r-2 border-white w-4 h-4" />
                  <div className="absolute bottom-2 left-2 border-b-2 border-l-2 border-white w-4 h-4" />
                  <div className="absolute bottom-2 right-2 border-b-2 border-r-2 border-white w-4 h-4" />

                  <span className="text-xl">🛡️</span>
                  <span className="text-[10px] font-mono font-semibold text-indigo-400 mt-2 block uppercase">
                    {documentType} EXTRACTION METADATA
                  </span>
                  
                  {isExtractingOcr && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 text-indigo-500 animate-spin" />
                      <span className="text-[9px] font-mono text-slate-400 animate-pulse">Running OCR Neural Net...</span>
                    </div>
                  )}
                </div>

                {ocrData && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-[9.5px] leading-snug font-mono text-slate-400">
                    <span className="text-indigo-500 font-bold block mb-1">=== AI OCR PARSING SUCCESS ===</span>
                    <p>• LEGAL NAME: <strong className="text-white">{ocrData.fullName}</strong></p>
                    <p>• DOCUMENT ID: <strong className="text-slate-300">{ocrData.documentNumber}</strong></p>
                    <p>• DOB: <strong className="text-slate-300">{ocrData.dateOfBirth}</strong></p>
                    <p>• EXPIRY DATE: <strong className="text-slate-300">{ocrData.expiryDate}</strong></p>
                    <p>• AI RECOGNITION: <strong className={`${simulatedOutcome === 'PENDING' ? 'text-amber-500' : 'text-emerald-500'}`}>{ocrData.confidenceScore}</strong></p>
                  </div>
                )}

                <button 
                  onClick={() => setStep(6)}
                  id="onboard-doc-verify-btn"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  Confirm Extracted Details <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: FACE BIO-LIVENESS VERIFICATION */}
        {step === 6 && (
          <div className="space-y-4 text-center">
            <div className="space-y-1 text-left">
              <h3 className="text-md font-bold flex items-center gap-1.5">
                <Camera className="h-4.5 w-4.5 text-indigo-500" />
                Liveness Facial Sweep
              </h3>
              <p className="text-[11px] text-slate-450">
                Execute a biometrics signature analysis to prevent deepfake, injection, or static synthetic bypasses.
              </p>
            </div>

            {/* Circular Camera frame */}
            <div className="relative h-44 w-44 rounded-full border-4 border-indigo-500/80 bg-slate-950 mx-auto flex flex-col justify-center items-center overflow-hidden shadow-indigo-950/40 shadow-inner">
              {faceScanActive && (
                <>
                  <div className="absolute top-0 bottom-0 left-0 right-0 border-y-2 border-indigo-500 animate-ping opacity-60" />
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-400 translate-y-[-50%] animate-pulse" />
                </>
              )}
              
              <User className="h-20 w-20 text-slate-700 animate-pulse" />
              
              {faceScanActive && (
                <div className="absolute inset-0 bg-indigo-950/60 flex flex-col justify-center items-center text-white">
                  <span className="text-md font-extrabold font-mono text-indigo-400">{faceScanProgress}%</span>
                  <span className="text-[8px] font-mono tracking-wider mt-1">SWEEPING FACIAL NODES...</span>
                </div>
              )}

              {faceScanComplete && (
                <div className="absolute inset-0 bg-emerald-950/85 flex flex-col justify-center items-center text-emerald-400">
                  <CheckCircle className="h-6 w-6" />
                  <span className="text-[9px] font-bold font-mono tracking-wider mt-1">LIVENESS OK</span>
                </div>
              )}
            </div>

            {/* Strict Regulatory Privacy Warning Notice */}
            <div className="p-3 bg-amber-500/5 text-amber-600 rounded-xl border border-amber-500/15 text-[9.5px] leading-relaxed text-left flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>
                <strong>Biometric Cryptographic Safety Statement:</strong> Facial sweeps check 3D node distances purely for active liveness. Captured assets are encoded, salted, and cleared from standard buffer inside 24 hours. No data is shared with third parties.
              </div>
            </div>

            {!faceScanComplete && (
              <button 
                onClick={startFaceScanSim}
                id="onboard-face-scan-btn"
                disabled={faceScanActive}
                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {faceScanActive ? 'Liveness Sweep Active...' : 'Lock Biometric Signature'}
              </button>
            )}

            {faceScanComplete && (
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 font-bold text-[10.5px] rounded-xl flex items-center justify-center gap-1.5 animate-bounce">
                <CheckCircle className="h-3.5 w-3.5" /> Biometrics Swept! Creating KYC record...
              </div>
            )}
          </div>
        )}

        {/* STEP 7: SCREENING RESULT */}
        {step === 7 && (
          <div className="space-y-4 text-center">
            
            {/* Approved View */}
            {simulatedOutcome === 'APPROVED' && (
              <div className="space-y-4">
                <div className="mx-auto h-16 w-16 bg-emerald-500/15 text-emerald-500 rounded-3xl flex items-center justify-center">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-md font-bold text-emerald-500">Identity Authenticated Automatically</h3>
                  <p className="text-[11px] text-slate-450 leading-relaxed px-2">
                    Congratulations! Your document signature matches central registries perfectly. Full access is granted.
                  </p>
                </div>
                
                <div className="p-3 bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-xl text-left text-[10px] space-y-1 font-mono text-slate-400">
                  <p>• CLIENT TIER: <strong className="text-indigo-400">Sovereign Wealth Platinum</strong></p>
                  <p>• LEDGER STANDARDS: <strong>IFRS-9 Double Entry Allowed</strong></p>
                  <p>• PEER TRANSFER CAP: <strong>$250,050.00 / day</strong></p>
                </div>
              </div>
            )}

            {/* Pending View */}
            {simulatedOutcome === 'PENDING' && (
              <div className="space-y-4">
                <div className="mx-auto h-16 w-16 bg-amber-500/15 text-amber-500 rounded-3xl flex items-center justify-center">
                  <AlertTriangle className="h-10 w-10 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-md font-bold text-amber-500">Manual Review Pending</h3>
                  <p className="text-[11px] text-slate-450 leading-relaxed px-4">
                    The uploaded credential image was slightly unclear or blurry.
                  </p>
                </div>

                <div className="p-3 bg-amber-500/5 text-amber-500 border border-amber-500/15 rounded-xl text-left text-[10px] space-y-1 leading-normal">
                  🔍 <strong>Manual Review Routing Node Triggered:</strong> A compliance case (ID: {submissionResult?.kycCase?.id || 'pending'}) has been logged. Compliance analysts will analyze details within 24 business hours.
                </div>
              </div>
            )}

            {/* Rejected View */}
            {simulatedOutcome === 'REJECTED' && (
              <div className="space-y-4">
                <div className="mx-auto h-16 w-16 bg-rose-500/15 text-rose-500 rounded-3xl flex items-center justify-center">
                  <XCircle className="h-10 w-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-md font-bold text-rose-500">Verification Rejected</h3>
                  <p className="text-[11px] text-rose-450 leading-relaxed px-4">
                     Expired credential scan detected. Automatic authentication flagged security constraints.
                  </p>
                </div>

                <div className="p-3 bg-rose-550/5 text-rose-500 border border-rose-500/15 rounded-xl text-left text-[10px] leading-normal font-sans">
                  <strong>Safe System Statement:</strong> We are unable to satisfy legal credentials at this time. Please make sure to upload non-expired, high-contrast, government-issued document pages. Contact the support desk to appeal.
                </div>
              </div>
            )}

            <button 
              onClick={() => setStep(8)}
              id="onboard-result-continue-btn"
              className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              Go to Final KYC Status Page <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* STEP 8: STATUS SUMMARY PAGE */}
        {step === 8 && (
          <div className="space-y-4 text-center">
            <h3 className="text-md font-bold tracking-tight">Your KYC Compliance Status</h3>
            
            <div className="p-5 rounded-2xl border flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-905 border-slate-100 dark:border-slate-800">
              {simulatedOutcome === 'APPROVED' ? (
                <>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-500 font-bold rounded-full text-[10px] font-mono tracking-wider">
                    ● APPROVED
                  </span>
                  <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed px-2">
                    E-KYC verified completely. You have unlocked standard sovereign peer-to-peer transfers, asset funding, and interest metrics.
                  </p>
                </>
              ) : simulatedOutcome === 'PENDING' ? (
                <>
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-500 font-bold rounded-full text-[10px] font-mono tracking-wider animate-pulse">
                    ● PENDING REVIEWS
                  </span>
                  <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed px-2">
                    Case is assigned in the compliance audit backoffice manual review queue. Accounts transfers remain frozen.
                  </p>
                </>
              ) : (
                <>
                  <span className="px-3 py-1 bg-rose-500/20 text-rose-550 font-bold rounded-full text-[10px] font-mono tracking-wider">
                    ● REJECTED
                  </span>
                  <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed px-2">
                    Credential failed automatic matching limits. Access remains restricted. Push support ticket or retry to resolve.
                  </p>
                </>
              )}
            </div>

            <div className="space-y-2 pt-2">
              {simulatedOutcome === 'APPROVED' ? (
                <button 
                  onClick={() => {
                    const finalUser = { ...user, kycStatus: 'APPROVED' as const };
                    // Complete flow by telling parent we updated state
                    onOnboardingComplete(finalUser);
                  }}
                  id="onboard-finish-redirect-btn"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Enter Unlocked Wallet Dashboard
                </button>
              ) : (
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setDocFileUploaded(false);
                      setOcrData(null);
                      setFaceScanComplete(false);
                      setStep(3); // Retry onboarding steps
                    }}
                    id="onboard-retry-btn"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Re-trigger E-KYC Onboarding
                  </button>
                  <button 
                    onClick={() => {
                      // Navigate back to view-only dashboard with locked gates
                      const tempUser = { ...user, kycStatus: simulatedOutcome === 'PENDING' ? 'PENDING' : 'REJECTED' as const };
                      onOnboardingComplete(tempUser);
                    }}
                    id="onboard-exit-blocked-btn"
                    className={`w-full py-2 rounded-xl text-xs font-bold border ${
                      darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    } cursor-pointer`}
                  >
                    Return to Locked Core View
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Persistent Bottom Regulatory Disclaimer Panel */}
      <div className="pt-2 text-[8.5px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 leading-normal font-mono select-none">
        Enterprise SEC Registered Custody Suite • Complies completely with FinCEN AML Directives
      </div>

    </div>
  );
};
