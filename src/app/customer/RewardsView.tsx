import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Gift, 
  Users, 
  Coins, 
  AlertTriangle, 
  Check, 
  RefreshCw, 
  Sparkles, 
  ArrowUpRight, 
  Copy, 
  Share2,
  FileText
} from 'lucide-react';
import { UserProfile, RewardOffer, RewardTransaction } from '../../types';

interface RewardsViewProps {
  user: UserProfile;
  darkMode?: boolean;
  onRefreshData?: () => void;
}

export const RewardsView: React.FC<RewardsViewProps> = ({ user, darkMode = false, onRefreshData }) => {
  const [balance, setBalance] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string>('');
  const [referrals, setReferrals] = useState<Array<{ email: string; date: string; bonusPoints: number }>>([]);
  const [offers, setOffers] = useState<RewardOffer[]>([]);
  const [history, setHistory] = useState<RewardTransaction[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Referral Submission Form State
  const [referralEmail, setReferralEmail] = useState<string>('');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState<boolean>(false);
  const [claimReceipt, setClaimReceipt] = useState<{ couponCode: string; offer: RewardOffer } | null>(null);

  // Generate or retrieve a consistent device ID for sandbox device tracking
  const getSimulatedDeviceId = () => {
    let deviceId = localStorage.getItem('sandboxDeviceId');
    if (!deviceId) {
      deviceId = `dev-${Math.floor(1000 + Math.random() * 9000)}-safeguard`;
      localStorage.setItem('sandboxDeviceId', deviceId);
    }
    return deviceId;
  };

  const loadRewardsData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rewards', {
        headers: {
          'x-session-id': localStorage.getItem('sessionId') || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setReferralCode(data.referralCode);
        setReferrals(data.referralsClaimed || []);
        setOffers(data.offers || []);
        setHistory(data.history || []);
      } else {
        setError('Failed to fetch rewards details.');
      }
    } catch (err) {
      setError('Sovereign rewards gateway offline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewardsData();
  }, []);

  // Submit dynamic referral claim with device-abuse rules
  const handleReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!referralEmail || !referralEmail.includes('@')) {
      setError('Please supply a valid email for the referred colleague.');
      return;
    }

    setIsSubmittingReferral(true);
    const deviceId = getSimulatedDeviceId();

    try {
      const res = await fetch('/api/rewards/referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': localStorage.getItem('sessionId') || ''
        },
        body: JSON.stringify({
          email: referralEmail,
          deviceId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBalance(data.newBalance);
        setReferrals(data.referralsClaimed);
        setSuccess(`Referral recorded! Points have been credited to your balance (+1000 pts).`);
        setReferralEmail('');
        loadRewardsData(); // reload transactions log
        if (onRefreshData) onRefreshData();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to file referral.');
      }
    } catch (err) {
      setError('Network communication failed.');
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  // Submit points redemption flow
  const handleRedeemPoints = async (offer: RewardOffer) => {
    setError('');
    setSuccess('');
    setClaimReceipt(null);
    if (balance < offer.pointsCost) {
      setError(`Insufficient Points balance. This offer requires ${offer.pointsCost} pts (you have ${balance} pts).`);
      return;
    }

    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': localStorage.getItem('sessionId') || ''
        },
        body: JSON.stringify({ offerId: offer.id })
      });

      if (res.ok) {
        const data = await res.json();
        setBalance(data.newBalance);
        setSuccess(`Points successfully redeemed for ${offer.partnerName} coupon!`);
        setClaimReceipt({
          couponCode: data.couponCode,
          offer
        });
        loadRewardsData();
        if (onRefreshData) onRefreshData();
      } else {
        const err = await res.json();
        setError(err.error || 'Points redemption failed.');
      }
    } catch (err) {
      setError('Failed to contact points settlement core.');
    }
  };

  // Clear simulated device ID so the user can test the happy path again
  const handleResetDeviceAbuseSandbox = () => {
    const freshDeviceId = `dev-${Math.floor(1000 + Math.random() * 9000)}-safeguard`;
    localStorage.setItem('sandboxDeviceId', freshDeviceId);
    setSuccess(`Simulated terminal device signature reset to secret key: ${freshDeviceId}. You can submit another referral claim!`);
    setError('');
  };

  if (loading && balance === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-xs text-slate-400">Loading rewards ledger data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans animate-fade-in text-left">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`text-md font-extrabold flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Award className="h-4.5 w-4.5 text-indigo-505" />
            Sovereign Loyalty Program
          </h4>
          <p className="text-[10px] text-slate-400">Earn micro-yield and points on registered settlements.</p>
        </div>
        <button 
          onClick={loadRewardsData} 
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-red-105 border border-red-200 text-red-800 text-[11px] leading-relaxed flex items-start gap-1.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold flex items-center gap-1 text-red-950">Promotional Failure Flagged</span>
            <p className="text-[10px] leading-normal">{error}</p>
            {error.includes('Abuse Flag') && (
              <button
                onClick={handleResetDeviceAbuseSandbox}
                className="px-2 py-0.5 bg-red-800 text-white font-bold rounded text-[8px] tracking-wide uppercase hover:bg-red-750 font-mono transition inline-block mt-1"
              >
                🔄 Reset Device Terminal Finger
              </button>
            )}
          </div>
        </div>
      )}

      {success && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-800 text-[11px] leading-relaxed flex items-start gap-1.5 animate-pulse">
          <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Hero Points balance Display */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-2xl p-4 text-white relative overflow-hidden">
        <div className="absolute right-3 top-3 opacity-15">
          <Coins className="h-16 w-16" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <div className="text-[10px] uppercase font-mono text-indigo-200 tracking-wider">Earned Points Ledger Balance</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-white tracking-tight">{balance.toLocaleString()}</span>
            <span className="text-xs text-indigo-300 font-bold">PTS</span>
          </div>
          <div className="text-[9.5px] text-indigo-200/80 leading-relaxed font-mono">
            Equivalent Simulated Value: <strong>${(balance / 100).toFixed(2)} USD</strong>
          </div>
        </div>
      </div>

      {/* Points Receipt Voucher when redeemed */}
      {claimReceipt && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-250 rounded-xl space-y-3 animate-fade-in text-slate-800">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-emerald-700" />
            <div>
              <h5 className="text-[11.5px] font-bold text-emerald-950">Successful Redemption Receipt</h5>
              <span className="text-[8.5px] text-slate-400 font-mono">Sticker generated dynamically</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-emerald-200 p-3 text-center border-dashed relative">
            <div className="text-[9px] uppercase font-mono font-bold text-slate-400">Coupon Claim Code:</div>
            <div className="text-md font-extrabold font-mono text-indigo-600 select-all my-1.5 tracking-wider">
              {claimReceipt.couponCode}
            </div>
            <div className="text-[9px] text-slate-500 font-medium font-sans">
              Spendable Coupon at <strong>{claimReceipt.offer.partnerName}</strong> for: {claimReceipt.offer.description}
            </div>
          </div>
          <p className="text-[8.5px] text-emerald-800 leading-normal text-center font-mono">
            💡 Simply copy this promotional claim code to redeem the benefit.
          </p>
        </div>
      )}

      {/* Offers and loyalty programs */}
      <div className="space-y-2">
        <h5 className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 flex items-center gap-1 text-left">
          <Gift className="h-3.5 w-3.5" />
          Redeem Partner Offers & Loyalty programs
        </h5>

        <div className="grid grid-cols-2 gap-3 pb-1">
          {offers.map(offer => (
            <div 
              key={offer.id} 
              className={`p-3 rounded-xl border flex flex-col justify-between ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-105'
              } hover:border-slate-300 dark:hover:border-slate-700 transition space-y-2`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {offer.partnerName}
                  </span>
                  <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-1 py-0.5 rounded font-bold uppercase">
                    {offer.category}
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-450 dark:text-slate-400 mt-1 leading-snug">
                  {offer.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10.5px] font-extrabold font-mono text-slate-700 dark:text-slate-350">
                  {offer.pointsCost} <span className="text-[7.5px] font-bold text-slate-400">PTS</span>
                </span>
                
                <button
                  onClick={() => handleRedeemPoints(offer)}
                  disabled={balance < offer.pointsCost}
                  className={`px-2 py-1 text-[9px] font-extrabold rounded-lg select-none transition-all flex items-center gap-0.5 ${
                    balance >= offer.pointsCost
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>Redeem</span>
                  <ArrowUpRight className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral tracker and submit block */}
      <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'} space-y-3`}>
        <div className="flex justify-between items-center border-b border-dashed border-slate-205 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Referral Program Controls</span>
          </div>
          <span className="text-[9px] bg-slate-900 border text-white font-mono px-1.5 py-0.5 rounded font-bold uppercase">
            Promo Code
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border rounded-xl">
          <div className="space-y-0.5">
            <span className="text-[8px] uppercase font-mono text-slate-400 block font-bold">Your Unique Invite Code</span>
            <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-indigo-300">{referralCode}</span>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(referralCode);
              setSuccess('Invite code copied to clipboard!');
            }}
            className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 text-slate-500 dark:hover:bg-slate-850 dark:text-slate-300 text-[10px] font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer"
          >
            <Copy className="h-3 w-3" />
            <span>Copy invite code</span>
          </button>
        </div>

        {/* Form submission for refers */}
        <form onSubmit={handleReferralSubmit} className="space-y-1">
          <label className="text-[9.5px] uppercase tracking-wider text-slate-400 font-mono block">Simulate Referral Claim (Anti-Abuse Rule Sandbox)</label>
          <div className="flex gap-2">
            <input
              type="email"
              required
              placeholder="Friend's email (e.g. mike@test.com)"
              value={referralEmail}
              onChange={(e) => setReferralEmail(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 border text-slate-800 dark:text-white px-2 py-1.5 rounded-lg text-xs font-medium focus:outline-indigo-550"
            />
            <button
              type="submit"
              disabled={isSubmittingReferral}
              className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-[10px] rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
              id="submit-referral-claim"
            >
              <span>Refer Friend</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[8px] font-mono mt-1 text-slate-405 leading-normal">
            <span>Terminal Finger: {getSimulatedDeviceId().substring(0, 14)}...</span>
            <button
              type="button"
              onClick={handleResetDeviceAbuseSandbox}
              className="text-indigo-600 hover:underline cursor-pointer uppercase font-bold"
            >
              🔄 Change device
            </button>
          </div>
        </form>

        {/* Claim Tracker history */}
        <div className="space-y-1 border-t border-dashed border-slate-200 dark:border-slate-800/80 pt-2 text-left">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono block font-bold">Successfully Referred Friends</span>
          <div className="max-h-[90px] overflow-y-auto space-y-1">
            {referrals.length === 0 ? (
              <p className="text-[9px] text-slate-400 italic font-mono py-1">No promotional referrals successfully completed from this terminal account.</p>
            ) : (
              referrals.map((ref, idx) => (
                <div key={idx} className="flex justify-between items-center text-[9.5px] font-mono border-b dark:border-slate-900 pb-1 text-slate-550">
                  <span>{ref.email}</span>
                  <span className="text-emerald-600 font-bold">+{ref.bonusPoints} pts</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Loyalty History logs */}
      <div className="space-y-2 pt-1 text-left">
        <h5 className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          Loyalty Point Statement History
        </h5>

        <div className="max-h-[140px] overflow-y-auto space-y-1 pr-0.5">
          {history.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic shadow-2xs py-4 text-center">No points credit movements logged.</p>
          ) : (
            history.map((tx, idx) => (
              <div 
                key={idx} 
                className="p-2 rounded-xl border flex justify-between items-center bg-white dark:bg-slate-900 border-slate-105 dark:border-slate-800/60"
              >
                <div>
                  <div className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {tx.description}
                  </div>
                  <div className="text-[8.5px] text-slate-404 mt-0.5 font-mono">
                    {new Date(tx.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-[11px] font-mono font-extrabold ${tx.points > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points.toLocaleString()} PTS
                  </div>
                  <div className="text-[7px] bg-slate-100 dark:bg-slate-950 p-0.5 uppercase tracking-wide rounded text-[8px] font-bold">
                    {tx.type}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
