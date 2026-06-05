import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Key, 
  AlertTriangle, 
  Check, 
  RefreshCw, 
  Sliders, 
  FileText,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { UserProfile, UserCard, Transaction } from '../../types';

interface CardsViewProps {
  user: UserProfile;
  darkMode?: boolean;
  onRefreshData?: () => void;
}

export const CardsView: React.FC<CardsViewProps> = ({ user, darkMode = false, onRefreshData }) => {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [statement, setStatement] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string>('');
  
  // Spend limit details state
  const [dailyLimit, setDailyLimit] = useState<number>(1000);
  const [weeklyLimit, setWeeklyLimit] = useState<number>(3000);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(10000);
  
  // Pin adjustment details state
  const [newPin, setNewPin] = useState<string>('');
  
  // MFA simulation drawer/modal configuration
  const [mfaType, setMfaType] = useState<'LIMIT' | 'PIN' | null>(null);
  const [mfaCode, setMfaCode] = useState<string>('');
  const [mfaError, setMfaError] = useState<string>('');

  const [showFullCard, setShowFullCard] = useState<boolean>(false);

  // Fetch user cards on page load
  const loadCardsData = async () => {
    setLoading(true);
    setActionError('');
    try {
      const res = await fetch('/api/cards', {
        headers: {
          'x-session-id': localStorage.getItem('sessionId') || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCards(data);
        if (data.length > 0) {
          // Keep current selection or default to first card
          const currentSelect = data.find((c: UserCard) => c.id === selectedCardId) || data[0];
          setSelectedCardId(currentSelect.id);
          setDailyLimit(currentSelect.dailyLimit);
          setWeeklyLimit(currentSelect.weeklyLimit);
          setMonthlyLimit(currentSelect.monthlyLimit);
          fetchStatement(currentSelect.id);
        }
      } else {
        setActionError('Failed to fetch card holdings from sovereign registry.');
      }
    } catch (err) {
      setActionError('Network interface offline.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatement = async (cardId: string) => {
    try {
      const res = await fetch(`/api/cards/${cardId}/statement`, {
        headers: {
          'x-session-id': localStorage.getItem('sessionId') || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStatement(data);
      }
    } catch (err) {
      console.error('Failed to fetch card statements', err);
    }
  };

  useEffect(() => {
    loadCardsData();
  }, []);

  const handleCardSelect = (cardId: string) => {
    setSelectedCardId(cardId);
    const card = cards.find(c => c.id === cardId);
    if (card) {
      setDailyLimit(card.dailyLimit);
      setWeeklyLimit(card.weeklyLimit);
      setMonthlyLimit(card.monthlyLimit);
      fetchStatement(cardId);
    }
    setActionSuccess('');
    setActionError('');
  };

  // Lock / Unlock toggle
  const toggleCardStatus = async (cardId: string, currentStatus: string) => {
    setActionError('');
    setActionSuccess('');
    const nextStatus = currentStatus === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    try {
      const res = await fetch(`/api/cards/${cardId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': localStorage.getItem('sessionId') || ''
        },
        body: JSON.stringify({ status: nextStatus })
      });
      
      if (res.ok) {
        const result = await res.json();
        setCards(prev => prev.map(c => c.id === cardId ? result.card : c));
        setActionSuccess(`Card successfully ${nextStatus === 'FROZEN' ? 'frozen' : 'reactivated'}! Safe status logged to immutable audit records.`);
        if (onRefreshData) onRefreshData();
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to sync card freeze directive.');
      }
    } catch (err) {
      setActionError('Network exception committing status changes.');
    }
  };

  // Launch MFA validation for PIN or LIMIT action
  const requestMfaPrompt = (type: 'LIMIT' | 'PIN') => {
    setActionError('');
    setActionSuccess('');
    setMfaType(type);
    setMfaCode('');
    setMfaError('');
    if (type === 'PIN' && (!newPin || newPin.length !== 4 || isNaN(Number(newPin)))) {
      setActionError('Please supply a standard 4-digit PIN before submitting MFA checks.');
      setMfaType(null);
    }
  };

  // Handle actual submission of MFA and hitting the secured server route
  const handleVerifyMfaAction = async () => {
    setMfaError('');
    if (mfaCode !== '123456') {
      setMfaError('Simulated multi-factor validation failed. Type 123456');
      return;
    }

    try {
      if (mfaType === 'LIMIT') {
        const res = await fetch(`/api/cards/${selectedCardId}/limits`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': localStorage.getItem('sessionId') || ''
          },
          body: JSON.stringify({
            dailyLimit,
            weeklyLimit,
            monthlyLimit,
            mfaCode
          })
        });

        if (res.ok) {
          const result = await res.json();
          setCards(prev => prev.map(c => c.id === selectedCardId ? result.card : c));
          setActionSuccess('Card spend boundaries securely modified and broadcast to processing networks.');
          setMfaType(null);
          if (onRefreshData) onRefreshData();
        } else {
          const err = await res.json();
          setMfaError(err.error || 'Limit correction failed.');
        }
      } else if (mfaType === 'PIN') {
        const res = await fetch(`/api/cards/${selectedCardId}/pin-change`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': localStorage.getItem('sessionId') || ''
          },
          body: JSON.stringify({
            newPin,
            mfaCode
          })
        });

        if (res.ok) {
          setActionSuccess('Security PIN change recorded! Stored securely using hashing standards.');
          setNewPin('');
          setMfaType(null);
          if (onRefreshData) onRefreshData();
        } else {
          const err = await res.json();
          setMfaError(err.error || 'PIN update rejected.');
        }
      }
    } catch (err) {
      setMfaError('Error dispatching crypto authorization payload.');
    }
  };

  const activeCard = cards.find(c => c.id === selectedCardId);

  if (loading && cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-xs text-slate-400">Querying central bank card vaults...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans animate-fade-in text-left">
      {/* Top Banner section */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`text-md font-extrabold flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <CreditCard className="h-4.5 w-4.5 text-indigo-505" />
            Sovereign Card Manager
          </h4>
          <p className="text-[10px] text-slate-400">Sandbox controls for multi-asset card accounts.</p>
        </div>
        <button 
          onClick={loadCardsData} 
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {actionError && (
        <div className="p-2.5 rounded-xl bg-red-105 border border-red-200 text-red-800 text-[11px] leading-relaxed flex items-start gap-1.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-800 text-[11px] leading-relaxed flex items-start gap-1.5">
          <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Select card tabs (Physical vs Virtual) */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardSelect(card.id)}
            className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
              selectedCardId === card.id
                ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {card.type === 'PHYSICAL' ? '💳 Physical Visa' : '⚡ Virtual Mastercard'}
          </button>
        ))}
      </div>

      {activeCard && (
        <>
          {/* Card Presentation Canvas */}
          <div className="relative">
            <div className={`relative overflow-hidden rounded-2xl p-4 text-white shadow-md transition-all duration-300 ${
              activeCard.status === 'ACTIVE' 
                ? 'bg-gradient-to-br from-[#1e1b4b] via-[#311b92] to-[#0f0926] ring-1 ring-white/10' 
                : 'bg-gradient-to-br from-slate-900 to-zinc-950 opacity-90 ring-1 ring-red-500/20'
            }`}>
              
              {/* Status Ribbon overlay */}
              {activeCard.status !== 'ACTIVE' && (
                <div className="absolute top-2 right-2 bg-red-600 text-white font-mono text-[8px] font-bold px-2 py-0.5 rounded shadow">
                  ❄️ FROZEN
                </div>
              )}

              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-indigo-300 font-bold block">{activeCard.type} CARD</span>
                  <span className="text-xs font-mono font-bold tracking-tight text-slate-100">Apex Trust</span>
                </div>
                <span className="text-md font-extrabold">
                  {activeCard.cardBrand === 'VISA' ? 'Visa' : 'Mastercard'}
                </span>
              </div>

              {/* Number Presentation */}
              <div className="my-5 flex items-center justify-between font-mono text-xs tracking-wider">
                <span>{showFullCard ? '4532 8901 3348 4821' : activeCard.cardNumberMasked}</span>
                <button 
                  onClick={() => setShowFullCard(!showFullCard)}
                  className="p-1 hover:bg-white/10 rounded text-slate-300 transition"
                  id="view-card-toggle"
                >
                  {showFullCard ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="flex justify-between items-end text-slate-300">
                <div>
                  <span className="text-[6.5px] uppercase tracking-wider block">Expiry / CVV</span>
                  <span className="text-[10px] font-mono font-bold">{showFullCard ? '12/30 • 491' : `${activeCard.cardExpiryMasked} • ${activeCard.cardCvvMasked}`}</span>
                </div>
                <div className="text-right">
                  <span className="text-[6.5px] uppercase tracking-wider block">Spend Limits Limit</span>
                  <span className="text-[10px] font-mono font-extrabold">${activeCard.dailyLimit} daily</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Matrix Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => toggleCardStatus(activeCard.id, activeCard.status)}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-[10.5px] font-bold transition-all cursor-pointer ${
                activeCard.status === 'ACTIVE'
                  ? 'bg-slate-50 border-slate-205 text-slate-600 hover:bg-slate-100 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-300'
                  : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
              }`}
            >
              {activeCard.status === 'ACTIVE' ? (
                <>
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Freeze Card</span>
                </>
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5 text-amber-600 animate-bounce" />
                  <span>Unfreeze Card</span>
                </>
              )}
            </button>

            <button
              disabled={activeCard.status !== 'ACTIVE'}
              onClick={() => requestMfaPrompt('PIN')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-[10.5px] font-bold transition-all ${
                activeCard.status === 'ACTIVE'
                  ? 'bg-slate-50 border-slate-250 text-slate-600 hover:bg-slate-100 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-300 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed text-slate-400 bg-slate-100'
              }`}
            >
              <Key className="h-3.5 w-3.5 text-indigo-500" />
              <span>Change PIN</span>
            </button>
          </div>

          {/* spend limits and PIN update inputs */}
          <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'} space-y-3`}>
            <div className="flex items-center gap-1.5 border-b border-dashed border-slate-205 dark:border-slate-800 pb-2">
              <Sliders className="h-3.5 w-3.5 text-indigo-500" />
              <h5 className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Sovereign Limits Regulation</h5>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">Daily Limit</label>
                <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border px-1.5 py-1">
                  <span className="text-[10px] text-slate-405 font-mono mr-0.5">$</span>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    disabled={activeCard.status !== 'ACTIVE'}
                    className="w-full text-[10px] font-mono border-none focus:outline-none p-0 bg-transparent text-slate-850 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">Weekly Limit</label>
                <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border px-1.5 py-1">
                  <span className="text-[10px] text-slate-405 font-mono mr-0.5">$</span>
                  <input
                    type="number"
                    value={weeklyLimit}
                    onChange={(e) => setWeeklyLimit(Number(e.target.value))}
                    disabled={activeCard.status !== 'ACTIVE'}
                    className="w-full text-[10px] font-mono border-none focus:outline-none p-0 bg-transparent text-slate-850 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">Monthly Limit</label>
                <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border px-1.5 py-1">
                  <span className="text-[10px] text-slate-405 font-mono mr-0.5">$</span>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                    disabled={activeCard.status !== 'ACTIVE'}
                    className="w-full text-[10px] font-mono border-none focus:outline-none p-0 bg-transparent text-slate-850 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => requestMfaPrompt('LIMIT')}
                  disabled={activeCard.status !== 'ACTIVE'}
                  className={`w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 ${
                    activeCard.status === 'ACTIVE' ? 'cursor-pointer shadow-xs' : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span>Apply Limits</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Input PIN drawer block */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-850/80 my-1">
              <label className="text-[9px] uppercase tracking-wider text-slate-400 font-mono block mb-1">Set New 4-Digit Security PIN</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  disabled={activeCard.status !== 'ACTIVE'}
                  className="flex-1 text-center bg-white dark:bg-slate-900 border text-slate-800 dark:text-white rounded-lg p-1 text-xs font-mono font-bold tracking-widest focus:outline-indigo-500"
                />
                <button
                  onClick={() => requestMfaPrompt('PIN')}
                  disabled={activeCard.status !== 'ACTIVE' || !newPin || newPin.length !== 4}
                  className={`px-3 py-1 bg-slate-900 dark:bg-indigo-950 text-white dark:text-indigo-200 border dark:border-indigo-800 border-slate-800 font-bold text-[10px] rounded-lg transition ${
                    activeCard.status === 'ACTIVE' && newPin?.length === 4 ? 'hover:bg-slate-800 cursor-pointer' : 'opacity-30 cursor-not-allowed'
                  }`}
                >
                  Change PIN
                </button>
              </div>
            </div>
          </div>

          {/* MFA Simulation Dialog Box overlay inside card module */}
          {mfaType && (
            <div className="p-3 bg-indigo-50/95 dark:bg-[#1a1c2e]/98 border border-indigo-200/80 dark:border-indigo-850/80 rounded-xl space-y-3 animate-fade-in shadow-lg">
              <div className="flex items-start gap-2">
                <Lock className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h6 className="text-[11px] font-bold text-indigo-950 dark:text-indigo-300">Sovereign MFA Authorization Token</h6>
                  <p className="text-[9.5px] text-indigo-800/80 dark:text-slate-400">
                    A multi-factor validation passcode is required to authorize the {mfaType === 'PIN' ? 'PIN change request' : 'limits modification'} on this account.
                  </p>
                </div>
              </div>

              {mfaError && <p className="text-[9.5px] text-red-600 font-bold">{mfaError}</p>}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter MFA Code (Use 123456)"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-950 border px-2.5 py-1 text-xs rounded-lg font-mono text-center tracking-widest text-slate-900 dark:text-white"
                />
                <button
                  onClick={handleVerifyMfaAction}
                  className="px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-[10px] rounded-lg transition"
                >
                  Verify
                </button>
                <button
                  onClick={() => setMfaType(null)}
                  className="px-2 py-1 hover:bg-slate-200 text-slate-500 font-bold text-[10px] rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[8.5px] text-slate-405 text-center font-mono">💡 Type 123456 to pass the simulated auth checks.</p>
            </div>
          )}

          {/* Card Statement Log section */}
          <div className="space-y-2 pt-2">
            <h5 className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 flex items-center gap-1 text-left">
              <FileText className="h-3.5 w-3.5" />
              Card Statement Logs
            </h5>

            <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-0.5">
              {statement.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic py-4 text-center">No transactions have been swiped using this card.</p>
              ) : (
                statement.map(tx => (
                  <div 
                    key={tx.id} 
                    className={`p-2 rounded-xl border flex justify-between items-center bg-white dark:bg-slate-900 border-slate-105 dark:border-slate-800/60`}
                  >
                    <div>
                      <div className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {tx.description}
                      </div>
                      <div className="text-[8.5px] text-slate-400 mt-0.5 font-mono">
                        {new Date(tx.date).toLocaleDateString()} • {tx.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[11px] font-mono font-extrabold ${tx.status === 'FAILED' ? 'text-slate-400 line-through' : 'text-rose-500'}`}>
                        -${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[7.5px] font-mono text-slate-400">
                        {tx.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
