import React, { useState } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  ArrowLeft, 
  Building, 
  Wallet, 
  Coins, 
  Lock, 
  RefreshCw, 
  CheckCircle, 
  X, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  FileText 
} from 'lucide-react';
import { createFundingIntent, confirmFunding } from '../../services/api';
import { UserProfile, Transaction } from '../../types';

interface AddMoneyWizardProps {
  user: UserProfile;
  darkMode?: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
  onAddDynamicNotification?: (notif: { id: string; title: string; desc: string; time: string; type: 'success' | 'failure' | 'warn' }) => void;
}

export const AddMoneyWizard: React.FC<AddMoneyWizardProps> = ({
  user,
  darkMode = false,
  onClose,
  onRefreshData,
  onAddDynamicNotification
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [fundingSource, setFundingSource] = useState<'DEBIT_CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY'>('DEBIT_CARD');
  const [sourceDetails, setSourceDetails] = useState('');
  
  // Enter Amount
  const [amountInput, setAmountInput] = useState('');
  const [currency] = useState('USD');
  const [amountError, setAmountError] = useState('');
  
  // Payment intent details from API
  const [intentId, setIntentId] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [amount, setAmount] = useState(0);
  const [fee, setFee] = useState(0);
  const [totalDebit, setTotalDebit] = useState(0);
  const [expectedCredit, setExpectedCredit] = useState(0);
  
  // Confirmation state
  const [simulatedOutcome, setSimulatedOutcome] = useState<'SUCCESS' | 'FAILURE' | 'PENDING'>('SUCCESS');
  const [securityPin, setSecurityPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  // Processing status
  const [processingMessage, setProcessingMessage] = useState('Initiating secure vault clearance...');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Final receipt data
  const [finalTransaction, setFinalTransaction] = useState<Transaction | null>(null);
  const [receiptMessage, setReceiptMessage] = useState('');
  const [apiError, setApiError] = useState('');

  // 1. Funding limits config
  const LIMIT_MIN = 10;
  const LIMIT_MAX = 10000;

  // 2. Predefined mock sources
  const mockCards = [
    { id: 'card-1', label: `Personal Wallet (•••• ${user.cardNumber.slice(-4)})`, details: `Visa token matches card ending ${user.cardNumber.slice(-4)}` },
    { id: 'card-2', label: 'External Card (•••• 9901)', details: 'Mastercard token matching bank files' }
  ];

  const mockBanks = [
    { id: 'bank-1', label: 'Chase Checking (•••• 1083)', details: 'ACH Linked Chase account checking' },
    { id: 'bank-2', label: 'Wells Fargo Savings (•••• 7824)', details: 'ACH Wells Fargo savings reserve' }
  ];

  const mockMobileWallets = [
    { id: 'mob-1', label: 'Apple Pay (M-Token)', details: 'Secure wallet biometric signature' },
    { id: 'mob-2', label: 'Simulated Mobile Money Wallet', details: 'APP mobile provider token' }
  ];

  // Derive Fee preview on typing
  const getFeePreview = (val: number) => {
    if (fundingSource === 'DEBIT_CARD') return val * 0.015;
    if (fundingSource === 'MOBILE_MONEY') return val * 0.01;
    return 0; // BANK_TRANSFER is free
  };

  // Get selected sources list
  const getSourcesList = () => {
    if (fundingSource === 'DEBIT_CARD') return mockCards;
    if (fundingSource === 'BANK_TRANSFER') return mockBanks;
    return mockMobileWallets;
  };

  // Set default initial details on select
  const handleSelectSource = (src: 'DEBIT_CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY') => {
    setFundingSource(src);
    if (src === 'DEBIT_CARD') setSourceDetails(mockCards[0].label);
    else if (src === 'BANK_TRANSFER') setSourceDetails(mockBanks[0].label);
    else setSourceDetails(mockMobileWallets[0].label);
    setStep(2);
  };

  // Submit step 2 (Enter amount -> creates payment intent with risk check)
  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAmountError('');
    setApiError('');

    const parsedAmt = Number(amountInput);
    if (isNaN(parsedAmt) || parsedAmt < LIMIT_MIN) {
      setAmountError(`Minimum deposit limit is $${LIMIT_MIN.toFixed(2)} USD.`);
      return;
    }
    if (parsedAmt > LIMIT_MAX) {
      setAmountError(`Maximum single deposit limit is $${LIMIT_MAX.toFixed(2)} USD.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // API call to evaluate risk backend and generate intent
      const intent = await createFundingIntent({
        amount: parsedAmt,
        currency,
        fundingSource,
        sourceDetails
      });

      if (intent.success) {
        setIntentId(intent.intentId);
        setIdempotencyKey(intent.idempotencyKey);
        setAmount(intent.amount);
        setFee(intent.fee);
        setTotalDebit(intent.totalDebit);
        setExpectedCredit(intent.expectedCredit);
        setStep(3); // Go to Confirmation
      }
    } catch (err: any) {
      setAmountError(err.message || 'Payment intent could not be established.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit step 3 (simulates Gateway Webhook resolution)
  const handleConfirmSimulation = (outcome: 'SUCCESS' | 'FAILURE' | 'PENDING') => {
    setSimulatedOutcome(outcome);
    setStep(4); // Go to Pin input
  };

  // Submit step 4 (Security authorization PIN / MFA validation)
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setApiError('');

    if (!securityPin || securityPin.length < 4) {
      setPinError('Please enter a valid 4-digit security PIN.');
      return;
    }

    setIsSubmitting(true);
    setStep(5); // Show Processing screen immediately

    // Simulate stepping of high-quality loading processes
    const loadingDialogs = [
      'Performing subsecond KYC regulatory verification...',
      'Testing wallet velocity and risk limits...',
      'Securing checkout payment intent blocks...',
      'Awaiting gateway callback webhook answer...',
      'Finalizing balanced accounting ledger entries...'
    ];

    let dialIdx = 0;
    const interval = setInterval(() => {
      if (dialIdx < loadingDialogs.length) {
        setProcessingMessage(loadingDialogs[dialIdx]);
        dialIdx++;
      }
    }, 600);

    try {
      // Call backend confirm endpoint to execute balances additions & journal entry posts
      const res = await confirmFunding({
        intentId,
        idempotencyKey,
        pin: securityPin,
        simulatedOutcome
      });

      // Clear interval timer
      clearInterval(interval);
      setTimeout(() => {
        setIsSubmitting(false);
        setFinalTransaction(res.transaction);
        setReceiptMessage(res.message);
        
        // Push user notifications conditionally on completion
        if (onAddDynamicNotification) {
          if (res.transaction.status === 'COMPLETED') {
            onAddDynamicNotification({
              id: `dyn-nt-${Date.now()}`,
              title: 'Funding transaction approved',
              desc: `Deposited $${res.transaction.amount.toFixed(2)} USD via ${fundingSource}. Balance cleared!`,
              time: 'Just now',
              type: 'success'
            });
          } else if (res.transaction.status === 'PENDING') {
            onAddDynamicNotification({
              id: `dyn-nt-${Date.now()}`,
              title: 'Funding status pending settlement',
              desc: `Deposit transaction of $${res.transaction.amount.toFixed(2)} placed in settlement queue.`,
              time: 'Just now',
              type: 'warn'
             });
          } else {
            onAddDynamicNotification({
              id: `dyn-nt-${Date.now()}`,
              title: 'Funding deposit failed',
              desc: `Deposit transaction of $${res.transaction.amount.toFixed(2)} was rejected by payment gateway.`,
              time: 'Just now',
              type: 'failure'
             });
          }
        }

        if (onRefreshData) onRefreshData();
        setStep(6); // Show receipt
      }, 3000);

    } catch (err: any) {
      clearInterval(interval);
      setIsSubmitting(false);
      setStep(4); // Return to auth PIN screen with error
      setPinError(err.message || 'MFA/PIN transaction could not be processed.');
    }
  };

  const getSourceIcon = (src: 'DEBIT_CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY') => {
    switch(src) {
      case 'DEBIT_CARD': return <CreditCard className="h-5 w-5 text-indigo-400" />;
      case 'BANK_TRANSFER': return <Building className="h-5 w-5 text-emerald-400" />;
      case 'MOBILE_MONEY': return <Wallet className="h-5 w-5 text-amber-400" />;
    }
  };

  const getSourceFullLabel = (src: 'DEBIT_CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY') => {
    switch(src) {
      case 'DEBIT_CARD': return 'Visa/Mastercard Debit Card';
      case 'BANK_TRANSFER': return 'Sovereign Bank Wire (ACH)';
      case 'MOBILE_MONEY': return 'Mobile Money/Apple Wallet';
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  return (
    <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-3 select-none text-xs">
      <div className={`p-5 rounded-3xl w-full max-w-sm space-y-4 border relative overflow-hidden transition-all duration-350 ${
        darkMode ? 'bg-[#0b0f19] border-slate-800 text-white' : 'bg-white border-slate-205 text-slate-800'
      }`}>
        
        {/* PROGRESS STEP INDICATOR (Hidden on loading/receipt screen) */}
        {step < 5 && (
          <div className="w-full h-1 bg-slate-500/10 rounded-full overflow-hidden flex">
            <div className={`h-full bg-indigo-505 transition-all duration-300`} style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        )}

        {/* STEP 1: SELECT FUNDING SOURCE */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-sm flex items-center gap-2 uppercase tracking-wide">
                  <Coins className="h-5 w-5 text-indigo-505 shrink-0" /> Select Funding Source
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5 block text-left">Choose your verified sandbox funding gateway.</p>
              </div>
              <button onClick={onClose} aria-label="Close dialog" className="h-8 w-8 rounded-full bg-slate-500/10 flex items-center justify-center cursor-pointer hover:scale-105">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => handleSelectSource('DEBIT_CARD')}
                className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all tracking-tight cursor-pointer hover:scale-[1.01] ${
                  darkMode ? 'bg-slate-900 border-slate-800 hover:border-indigo-800' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                }`}
              >
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-4.5 w-4.5 text-indigo-400" />
                </div>
                <div className="space-y-0.5 shrink-1">
                  <span className="font-extrabold text-[11.5px] block">Debit Card (APP Token)</span>
                  <p className="text-[9.5px] text-slate-450 leading-relaxed">Direct clearing. 1.5% APP transaction fee applied.</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-450 ml-auto shrink-0 self-center" />
              </button>

              <button
                onClick={() => handleSelectSource('BANK_TRANSFER')}
                className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all tracking-tight cursor-pointer hover:scale-[1.01] ${
                  darkMode ? 'bg-slate-900 border-slate-800 hover:border-emerald-800' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                }`}
              >
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Building className="h-4.5 w-4.5 text-emerald-400" />
                </div>
                <div className="space-y-0.5 shrink-1">
                  <span className="font-extrabold text-[11.5px] block">Bank Account Transfer (ACH)</span>
                  <p className="text-[9.5px] text-slate-455 leading-relaxed">Simulated wire deposit. Free of fees.</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-450 ml-auto shrink-0 self-center" />
              </button>

              <button
                onClick={() => handleSelectSource('MOBILE_MONEY')}
                className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all tracking-tight cursor-pointer hover:scale-[1.01] ${
                  darkMode ? 'bg-slate-900 border-slate-800 hover:border-amber-800' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                }`}
              >
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Wallet className="h-4.5 w-4.5 text-amber-400" />
                </div>
                <div className="space-y-0.5 shrink-1">
                  <span className="font-extrabold text-[11.5px] block">Mobile Money / Digital Wallet</span>
                  <p className="text-[9.5px] text-slate-450 leading-relaxed">Apple Pay or local provider tokens. 1.0% fee.</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-450 ml-auto shrink-0 self-center" />
              </button>
            </div>
            
            <div className="p-3 bg-indigo-500/5 text-[9.5px] text-indigo-400 border border-indigo-500/10 rounded-2xl leading-relaxed text-left font-semibold">
              🔒 High-performance sandbox environment. No actual banking credentials or fiat money is linked or relocated.
            </div>
          </div>
        )}

        {/* STEP 2: ENTER AMOUNT */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 font-bold text-[10px] text-slate-500 hover:text-indigo-500 uppercase tracking-wider">
                <ArrowLeft className="h-3 w-3" /> Source
              </button>
              <span className="font-mono text-[9px] font-black uppercase text-slate-450">Limit controls verified</span>
            </div>

            <div className="space-y-2 text-left">
              <h4 className="font-extrabold text-[13px] uppercase">Deposit Limit Configuration</h4>
              <p className="text-[10px] text-slate-450 font-semibold">
                Amounts must follow system guidelines. (Min: <strong>$10.00</strong>, Max: <strong>$10,000.00</strong>)
              </p>
            </div>

            <form onSubmit={amountAmountChange => handleAmountSubmit(amountAmountChange)} className="space-y-4">
              <div className="text-left space-y-1">
                <label className="text-[9px] font-mono font-extrabold text-slate-450 block uppercase tracking-wider">Choose Specific Token</label>
                <select
                  value={sourceDetails}
                  onChange={(e) => setSourceDetails(e.target.value)}
                  className={`w-full py-2.5 px-3 font-semibold rounded-2xl border text-xs focus:ring-1 focus:outline-none ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-55 border-slate-200'
                  }`}
                >
                  {getSourcesList().map(s => (
                    <option key={s.id} value={s.label}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="text-left space-y-1">
                <label className="text-[9px] font-mono font-extrabold text-slate-450 block uppercase tracking-wider">DEPOSIT AMOUNT (USD)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-xs font-bold">$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    autoFocus
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      setAmountError('');
                    }}
                    className={`w-full font-mono font-extrabold pl-7 pr-12 py-3 rounded-2xl text-xs border focus:ring-1 focus:outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <span className="absolute right-3.5 top-3.5 text-[9px] font-mono font-bold text-slate-450">USD</span>
                </div>
                {amountError ? (
                  <p className="text-[9.5px] font-bold text-rose-500 font-mono mt-1 leading-normal">⚠️ {amountError}</p>
                ) : (
                  amountInput && !isNaN(Number(amountInput)) && Number(amountInput) > 0 && (
                    <div className="flex justify-between items-center text-[9px] text-slate-450 pt-1 font-semibold">
                      <span>Preview Fee (Standard):</span>
                      <span className="font-mono text-indigo-400 font-black">
                        +{formatCurrency(getFeePreview(Number(amountInput)))}
                      </span>
                    </div>
                  )
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !amountInput}
                className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold rounded-2xl text-xs tracking-wide cursor-pointer transition-colors"
              >
                {isSubmitting ? 'Evaluating compliance risk limits...' : 'Generate Secure Intent'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: CONFIRMATION SCREEN & WEBHOOK MODES */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <button onClick={() => setStep(2)} className="flex items-center gap-1 font-bold text-[10px] text-slate-500 hover:text-indigo-500 uppercase tracking-wider">
                <ArrowLeft className="h-3 w-3" /> Amount
              </button>
              <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-black tracking-normal">Intent Created</span>
            </div>

            <div className="text-left space-y-1">
              <h4 className="font-sans font-black text-sm uppercase">Confirmation Ledger Checkout</h4>
              <p className="text-[9.5px] text-slate-450 leading-relaxed">Perform checkout review and choose simulated gateway webhook responses to inspect system behavior.</p>
            </div>

            {/* Invoice checkout detail card */}
            <div className={`p-4 rounded-2xl border text-left font-mono text-[10px] leading-relaxed space-y-2 ${
              darkMode ? 'bg-slate-950/60 border-slate-900 text-slate-350' : 'bg-slate-50 border-slate-150 text-slate-700'
            }`}>
              <div className="flex justify-between items-center">
                <span>Selected Gateway:</span>
                <span className="font-bold flex items-center gap-1">
                  {getSourceIcon(fundingSource)}
                  {getSourceFullLabel(fundingSource)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-dashed border-slate-500/20">
                <span>Account token:</span>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{sourceDetails}</span>
              </div>

              <div className="flex justify-between items-center">
                <span>Deposit Principal:</span>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-dashed border-slate-500/20">
                <span>Clearing Agency Fee:</span>
                <span className="text-indigo-400 font-bold">+{formatCurrency(fee)}</span>
              </div>

              <div className="flex justify-between items-center text-[11.5px]">
                <span className="font-bold">Total Clearing Debit:</span>
                <span className="text-emerald-400 font-bold font-mono">{formatCurrency(totalDebit)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Wallet credit amount:</span>
                <span className="font-bold">{formatCurrency(expectedCredit)}</span>
              </div>
            </div>

            {/* Webhook Selector simulation */}
            <div className="space-y-2 text-left select-none">
              <label className="text-[9.5px] font-mono font-extrabold text-slate-450 block uppercase tracking-wider">Gateway Webhook Simulation Mode</label>
              
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSimulatedOutcome('SUCCESS')}
                  className={`py-2 px-1 rounded-xl font-bold font-sans text-[10px] text-center border cursor-pointer select-none transition-all ${
                    simulatedOutcome === 'SUCCESS'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500'
                      : darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  🟢 Successful
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedOutcome('PENDING')}
                  className={`py-2 px-1 rounded-xl font-bold font-sans text-[10px] text-center border cursor-pointer select-none transition-all ${
                    simulatedOutcome === 'PENDING'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 ring-1 ring-amber-500'
                      : darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  🟡 Pending Hold
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedOutcome('FAILURE')}
                  className={`py-2 px-1 rounded-xl font-bold font-sans text-[10px] text-center border cursor-pointer select-none transition-all ${
                    simulatedOutcome === 'FAILURE'
                      ? 'bg-rose-500/10 text-rose-450 border-rose-500/30 ring-1 ring-rose-500'
                      : darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  🔴 Fail Rejection
                </button>
              </div>
            </div>

            <button
              onClick={() => handleConfirmSimulation(simulatedOutcome)}
              className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold rounded-2xl text-xs tracking-wide cursor-pointer transition-colors"
            >
              Sign checkout & Continue
            </button>
          </div>
        )}

        {/* STEP 4: pin / AUTH CODE CONFIRMATION */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <button onClick={() => setStep(3)} className="flex items-center gap-1 font-bold text-[10px] text-slate-500 hover:text-indigo-500 uppercase tracking-wider">
                <ArrowLeft className="h-3 w-3" /> Webhook
              </button>
              <div className="text-[10px] text-indigo-400 font-semibold font-mono flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" /> E2E Encrypted
              </div>
            </div>

            <div className="text-left space-y-1">
              <h4 className="font-black text-sm uppercase">Enter Security Authentication Pin</h4>
              <p className="text-[9.5px] text-slate-450 leading-relaxed font-semibold">
                Submit your unique transaction PIN signature authorization key code to complete settlement. (APP passcode: <strong>1234</strong>)
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="text-left space-y-1">
                <label className="text-[9px] font-mono font-extrabold text-slate-450 block uppercase tracking-wider">MFA / TRANSACTION SECURITY PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="••••"
                  autoFocus
                  value={securityPin}
                  onChange={(e) => {
                    setSecurityPin(e.target.value);
                    setPinError('');
                  }}
                  className={`w-full text-center tracking-widest font-mono font-extrabold py-3.5 text-base rounded-2xl border focus:ring-1 focus:outline-none ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
                {pinError && (
                  <p className="text-[9.5px] font-bold text-rose-500 font-mono mt-1 text-center font-bold">⚠️ {pinError}</p>
                )}
              </div>

              <div className="p-3 bg-slate-500/10 text-[9.5px] font-semibold text-slate-400 border border-slate-500/10 rounded-2xl leading-normal text-left">
                ℹ️ Dynamic limits check is executed seamlessly upon pinning validation. Safe sandbox operations strictly prevent real balance impacts.
              </div>

              <button
                type="submit"
                disabled={isSubmitting || securityPin.length < 4}
                className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold rounded-2xl text-xs tracking-wide cursor-pointer transition-colors"
              >
                Perform Pin verification
              </button>
            </form>
          </div>
        )}

        {/* STEP 5: STATEFUL PROCESSING SCREEN */}
        {step === 5 && (
          <div className="py-12 flex flex-col items-center justify-center space-y-5 text-center">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border-4 border-slate-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-indigo-500 animate-spin" />
            </div>

            <div className="space-y-1 max-w-xs">
              <span className="text-[9px] uppercase font-mono tracking-widest font-extrabold text-indigo-400 animate-pulse">Compliance Network Node</span>
              <h4 className="font-extrabold text-xs">Simulating payment processing...</h4>
              <p className="text-[10px] text-slate-450 leading-relaxed font-mono font-bold mt-2 bg-slate-505/5 p-2 rounded-xl border border-slate-500/10 tracking-tight">
                {processingMessage}
              </p>
            </div>
          </div>
        )}

        {/* STEP 6: RECEIPT SUMMARY RECEIPT */}
        {step === 6 && finalTransaction && (
          <div className="space-y-4">
            <div className="py-2 flex flex-col items-center justify-center text-center space-y-2">
              {finalTransaction.status === 'COMPLETED' ? (
                <>
                  <div className="h-11 w-11 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h4 className="font-black text-sm uppercase tracking-wide text-emerald-400">Funding approved</h4>
                  <span className="text-[10px] text-slate-450 leading-relaxed max-w-xs">{receiptMessage}</span>
                </>
              ) : finalTransaction.status === 'PENDING' ? (
                <>
                  <div className="h-11 w-11 rounded-full bg-amber-500/15 flex items-center justify-center border border-amber-505/30">
                    <Clock className="h-6 w-6 text-amber-500 animate-pulse" />
                  </div>
                  <h4 className="font-black text-sm uppercase tracking-wide text-amber-500">Hold Pending Settlement</h4>
                  <span className="text-[10px] text-slate-450 leading-relaxed max-w-xs">{receiptMessage}</span>
                </>
              ) : (
                <>
                  <div className="h-11 w-11 rounded-full bg-rose-500/15 flex items-center justify-center border border-rose-500/30">
                    <XCircle className="h-6 w-6 text-rose-500" />
                  </div>
                  <h4 className="font-black text-sm uppercase tracking-wide text-rose-500 font-mono">Simulated gateway rejection</h4>
                  <span className="text-[10px] text-slate-450 leading-relaxed max-w-xs">{receiptMessage}</span>
                </>
              )}
            </div>

            {/* Receipt invoice detail map wrapper */}
            <div className={`p-4 rounded-3xl border text-left font-mono text-[9px] leading-relaxed space-y-1.5 ${
              darkMode ? 'bg-slate-950/70 border-slate-900 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex justify-between items-center text-[10.5px] border-b border-slate-500/15 pb-1.5 mb-1.5">
                <span className="font-bold uppercase tracking-widest text-[8.5px] text-slate-500">Official Settlement Voucher</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase font-sans ${
                  finalTransaction.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                  finalTransaction.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                  'bg-rose-500/10 text-rose-450 border border-rose-500/30'
                }`}>
                  {finalTransaction.status}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Voucher ID ref:</span>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{finalTransaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Gateway reference ID:</span>
                <span className={`font-bold font-sans select-all ${darkMode ? 'text-white-200' : 'text-slate-800'}`}>{finalTransaction.gatewayRef || 'UNRELEASED'}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-dashed border-slate-500/15">
                <span>Ledger journal ID:</span>
                <span className="text-indigo-400 font-bold select-all">{finalTransaction.ledgerRef || 'VOID'}</span>
              </div>

              <div className="flex justify-between">
                <span>Funding Source:</span>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{sourceDetails} ({fundingSource})</span>
              </div>
              <div className="flex justify-between">
                <span>Clearing date:</span>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{new Date(finalTransaction.date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-dashed border-slate-500/15">
                <span>Verification Pin audit:</span>
                <span className="text-emerald-500 shrink-0 font-extrabold flex items-center gap-0.5">
                  <ShieldCheck className="h-3 w-3" /> VERIFIED_OK
                </span>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-300">
                <span>Gross Settlement debit:</span>
                <span className={`font-bold ${darkMode ? 'text-slate-400' : 'text-slate-800'}`}>{formatCurrency(totalDebit)}</span>
              </div>
              <div className="flex justify-between items-center text-[11.5px] font-sans font-bold">
                <span className={darkMode ? 'text-white' : 'text-slate-900'}>Net wallet credit:</span>
                <span className={`font-mono ${finalTransaction.status === 'COMPLETED' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {finalTransaction.status === 'COMPLETED' ? `+${formatCurrency(expectedCredit)}` : '$0.00'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className={`w-full py-3 font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  darkMode ? 'bg-indigo-650 hover:bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <FileText className="h-4.5 w-4.5 shrink-0" /> Close Voucher Receipt
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
