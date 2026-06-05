import React, { useState } from 'react';
import { UserProfile, Transaction } from '../../types';
import { executeTransfer } from '../../services/api';
import { ArrowRight, ShieldCheck, ShieldAlert, FileSearch, HelpCircle, Info } from 'lucide-react';

interface TransferFormProps {
  user: UserProfile;
  otherUsers: UserProfile[];
  onTransactionLogged: () => void;
  darkMode?: boolean;
}

export const TransferForm: React.FC<TransferFormProps> = ({
  user,
  otherUsers,
  onTransactionLogged,
  darkMode = false
}) => {
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Transfer');
  const [description, setDescription] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const transferRecipients = otherUsers.filter(u => u.id !== user.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setLastResult(null);

    const val = Number(amount);
    if (!recipientId) {
      setErrorText('Please select an authorized recipient profile.');
      return;
    }
    if (isNaN(val) || val <= 0) {
      setErrorText('Specify a valid positive remittance amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type: 'TRANSFER' as const,
        senderId: user.id,
        receiverId: recipientId,
        amount: val,
        description: description || `Outflow from ${user.name}`,
        category
      };

      const result = await executeTransfer(payload);
      setLastResult(result);
      
      // Reset inputs after success
      setAmount('');
      setDescription('');
      
      // Notify parent to refetch datasets
      onTransactionLogged();
    } catch (err: any) {
      console.error(err);
      setErrorText(err?.message || 'Transaction was rejected by sandbox regulatory guardrails.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      
      {/* 1. Remittance Card Layout */}
      <div className={`p-4 rounded-2xl border transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h5 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Journal Wire Transfer</h5>
            <p className="text-[10.5px] text-slate-400 mt-0.5">Automated double-entry sovereign clearing.</p>
          </div>
          <span className="text-[8.5px] font-mono tracking-wider font-extrabold uppercase px-1.5 py-0.5 bg-slate-500/15 text-slate-400 rounded">
            ISO C2
          </span>
        </div>

        {errorText && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] rounded-xl leading-relaxed flex gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Remittance Blocked:</span> {errorText}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Recipient Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans block">
              Authorized Counterparty
            </label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:ring-1 cursor-pointer font-semibold ${
                darkMode 
                  ? 'bg-slate-950 border-slate-850 text-slate-100 focus:ring-indigo-900' 
                  : 'bg-white border-slate-200 text-slate-800 focus:ring-indigo-100'
              }`}
            >
              <option value="">-- Choose recipient profile --</option>
              {transferRecipients.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} — Bal: ${r.balance.toLocaleString('en-US', { maxFractionDigits: 0 })}
                </option>
              ))}
            </select>
          </div>

          {/* Amount input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans block">
              Remittance Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono font-bold">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full text-xs font-mono pl-7 pr-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-850 text-slate-100 focus:ring-indigo-900' 
                    : 'bg-white border-slate-200 text-slate-800 focus:ring-indigo-100'
                }`}
              />
            </div>
            <span className="text-[9.5px] text-slate-400 flex items-center gap-1 mt-1 font-semibold">
              <Info className="h-3 w-3" /> Balance checking limit applies.
            </span>
          </div>

          {/* Sector choice */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans block">
              Sector Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:ring-1 cursor-pointer font-semibold ${
                darkMode 
                  ? 'bg-slate-950 border-slate-850 text-slate-100 focus:ring-indigo-900' 
                  : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-100'
              }`}
            >
              <option value="Transfer">P2P Peer Transfer</option>
              <option value="Utilities">Utilities & Energy</option>
              <option value="Dining">Dining & Food</option>
              <option value="Shopping">Shopping Outlets</option>
              <option value="Investment">Equity Investment</option>
              <option value="Travel">Tourism & Travel</option>
              <option value="Other">Miscellaneous Group</option>
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans block">
              Ledger Memorandum Entry
            </label>
            <input
              type="text"
              placeholder="Declare transfer mandate purpose..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 ${
                darkMode 
                  ? 'bg-slate-950 border-slate-850 text-slate-100 focus:ring-indigo-900' 
                  : 'bg-white border-slate-200 text-slate-800 focus:ring-indigo-100'
              }`}
            />
          </div>

          <div className={`p-3 rounded-xl border ${
            darkMode ? 'bg-slate-950/40 border-slate-850 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
          }`}>
            <label className="flex gap-2 items-start cursor-pointer text-[9.5px]">
              <input type="checkbox" required className="mt-0.5 rounded border-slate-350 text-indigo-650" />
              <span>Confirm clear double-entry authorization under penalty of voidance checks.</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
          >
            {isSubmitting ? 'Evaluating Risk Telemetry...' : 'Dispatch Wire Transfer'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* 2. Automated Diagnostics Result Display */}
      <div className={`p-4 rounded-2xl border transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        <h6 className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-1">
          <FileSearch className="h-4 w-4 text-indigo-400 animate-pulse" /> Real-time Compliance Logs
        </h6>

        {!lastResult ? (
          <div className="py-6 text-center text-slate-405">
            <HelpCircle className="h-8 w-8 mx-auto text-slate-300 mb-2" />
            <span className="font-bold block">Awaiting payment dispatch</span>
            <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto">
              Ready to sweep risk vectors. Test mock auto-hold checks here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-3 rounded-xl border leading-relaxed ${
              lastResult?.analysis?.decision === 'APPROVE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              'bg-amber-500/10 border-amber-500/20 text-amber-450'
            }`}>
              <div className="flex items-center gap-2">
                {lastResult?.analysis?.decision === 'APPROVE' ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                )}
                <span className="font-bold uppercase tracking-wider text-[10.5px]">
                  {lastResult?.analysis?.decision} Verdict Issued
                </span>
              </div>
              <p className="text-[11px] mt-1 text-slate-350">{lastResult?.analysis?.reason}</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl text-[9px] font-mono text-slate-350 overflow-x-auto whitespace-pre">
              {JSON.stringify({
                ledger_index: lastResult.transaction?.id,
                verdict: lastResult.analysis?.decision,
                audit_hash_stamp: 'IFRS-9 Double balanced',
                risk_tier: lastResult.analysis?.riskCategory
              }, null, 2)}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
