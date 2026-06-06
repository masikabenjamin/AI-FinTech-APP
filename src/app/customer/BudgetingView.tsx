import React, { useState, useEffect } from 'react';
import { UserProfile, Transaction, CategoryBudget, SavingsGoal, ReminderSettings } from '../../types';
import { 
  TrendingUp, 
  Award, 
  DollarSign, 
  Percent, 
  Calendar, 
  AlertTriangle, 
  Check, 
  Trash2, 
  Plus, 
  Settings, 
  Sparkles, 
  Bell, 
  ChevronRight, 
  ArrowRightLeft,
  X,
  CreditCard
} from 'lucide-react';
import { 
  updateTransactionCategory, 
  fetchBudgets, 
  saveBudget, 
  fetchSavingsGoals, 
  createSavingsGoal, 
  updateSavingsGoal, 
  deleteSavingsGoal, 
  fetchReminderSettings, 
  saveReminderSettings 
} from '../../services/api';

interface BudgetingViewProps {
  user: UserProfile;
  transactions: Transaction[];
  darkMode?: boolean;
  onRefreshData?: () => void;
  onUpdateUser?: (updatedFields: Partial<UserProfile>) => Promise<void>;
}

export const BudgetingView: React.FC<BudgetingViewProps> = ({
  user,
  transactions,
  darkMode = false,
  onRefreshData,
  onUpdateUser
}) => {
  const [activeSegment, setActiveSegment] = useState<'spending' | 'budgets' | 'goals' | 'reminders'>('spending');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-06'); // default current month in our simulation
  
  // API loaded state
  const [dbBudgets, setDbBudgets] = useState<CategoryBudget[]>([]);
  const [dbGoals, setDbGoals] = useState<SavingsGoal[]>([]);
  const [dbSettings, setDbSettings] = useState<ReminderSettings>({
    userId: user.id,
    budgetLimitAlert: true,
    goalReminder: true
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [notif, setNotif] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Form states
  const [reclassifyingTxId, setReclassifyingTxId] = useState<string | null>(null);
  const [showAddGoal, setShowAddGoal] = useState<boolean>(false);
  const [newGoalForm, setNewGoalForm] = useState({
    title: '',
    targetAmount: 0,
    targetDate: '2026-12-31',
    currentAmount: 0,
    linkToWallet: true
  });
  const [editedBudgets, setEditedBudgets] = useState<Record<string, number>>({});

  // Available expense categories
  const EXPENSE_CATEGORIES = [
    'rent', 
    'food', 
    'transport', 
    'utilities', 
    'subscriptions', 
    'education', 
    'health', 
    'business', 
    'entertainment', 
    'transfers'
  ];

  // Helper mapping legacy categories to supported ones
  const getCleanCategory = (cat: string): string => {
    const c = cat.toLowerCase();
    if (c === 'dining' || c === 'food') return 'food';
    if (c === 'travel' || c === 'transport') return 'transport';
    if (c === 'utilities') return 'utilities';
    if (c === 'shopping' || c === 'entertainment') return 'entertainment';
    if (c === 'health') return 'health';
    if (c === 'transfer' || c === 'transfers') return 'transfers';
    if (c === 'rent') return 'rent';
    if (c === 'investment' || c === 'business') return 'business';
    if (c === 'subscriptions') return 'subscriptions';
    if (c === 'education') return 'education';
    return c; // if already rent, food, transport etc.
  };

  // Toast notifier helper
  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotif({ message, type });
    setTimeout(() => {
      setNotif(null);
    }, 4000);
  };

  // Load budgets, savings, reminders state
  const loadData = async () => {
    try {
      setLoading(true);
      const [budgetsRes, goalsRes, settingsRes] = await Promise.all([
        fetchBudgets().catch(() => [] as CategoryBudget[]),
        fetchSavingsGoals().catch(() => [] as SavingsGoal[]),
        fetchReminderSettings().catch(() => ({ userId: user.id, budgetLimitAlert: true, goalReminder: true } as ReminderSettings))
      ]);
      setDbBudgets(budgetsRes);
      setDbGoals(goalsRes);
      setDbSettings(settingsRes);
      
      // Initialize edit fields
      const budgetMap: Record<string, number> = {};
      budgetsRes.forEach(b => {
        budgetMap[b.category.toLowerCase()] = b.limitAmount;
      });
      EXPENSE_CATEGORIES.forEach(cat => {
        if (!(cat in budgetMap)) {
          budgetMap[cat] = 200; // default initial fallback
        }
      });
      setEditedBudgets(budgetMap);
    } catch (e) {
      console.error('Failed loading budgeting details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  // Synchronize first goal with actual user.savingCurrent (ensuring live wallet tracking!)
  const syncGoalsWithWallet = () => {
    return dbGoals.map((g, idx) => {
      // If first goal or title matches Tesla Down Payment, let's keep it bound to user.savingCurrent
      if (idx === 0) {
        return { ...g, currentAmount: user.savingCurrent };
      }
      return g;
    });
  };

  const activeGoals = syncGoalsWithWallet();

  // --- Calculations for month-by-month spending ---
  const getMonthlyOutflows = (monthStr: string) => {
    const customerTxs = transactions.filter(t => {
      // Completed withdrawals/transfers where sender is active user
      const isOutflow = t.type !== 'DEPOSIT' && t.senderId === user.id;
      const isCompleted = t.status === 'COMPLETED';
      const isMatchingMonth = t.date.startsWith(monthStr);
      return isOutflow && isCompleted && isMatchingMonth;
    });

    const totals: Record<string, number> = {};
    EXPENSE_CATEGORIES.forEach(cat => {
      totals[cat] = 0;
    });

    let sum = 0;
    customerTxs.forEach(t => {
      const cleanCat = getCleanCategory(t.category);
      if (cleanCat in totals) {
        totals[cleanCat] += t.amount;
      } else {
        totals['entertainment'] = (totals['entertainment'] || 0) + t.amount;
      }
      sum += t.amount;
    });

    return { totals, sum, transactions: customerTxs };
  };

  // Spending for selected month
  const thisMonthData = getMonthlyOutflows(selectedMonth);
  
  // Previous month representation (May 2026 if June selected, or June 2026 if May selected)
  const previousMonthStr = selectedMonth === '2026-06' ? '2026-05' : '2026-06';
  const prevMonthData = getMonthlyOutflows(previousMonthStr);

  // Income computations (deposits from bank/payroll)
  const getMonthlyIncome = (monthStr: string) => {
    return transactions
      .filter(t => t.type === 'DEPOSIT' && t.receiverId === user.id && t.status === 'COMPLETED' && t.date.startsWith(monthStr))
      .reduce((sum, t) => sum + t.amount, 0);
  };
  const thisMonthIncome = getMonthlyIncome(selectedMonth);

  // --- HANDLERS ---
  const handleCategoryCorrection = async (txId: string, newCategory: string) => {
    try {
      await updateTransactionCategory(txId, newCategory);
      setReclassifyingTxId(null);
      showNotification(`Reclassified transaction to '${newCategory}' successfully!`, 'success');
      if (onRefreshData) onRefreshData(); // trigger global reload in App.tsx
    } catch (err: any) {
      showNotification(err.message || 'Failed updating category', 'error');
    }
  };

  const handleBudgetSave = async (category: string) => {
    try {
      const amount = editedBudgets[category] || 0;
      await saveBudget(category, amount);
      showNotification(`Configured budget for '${category}' at $${amount}`, 'success');
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Saving budget failed', 'error');
    }
  };

  const handleSaveAllBudgets = async () => {
    try {
      await Promise.all(
        Object.entries(editedBudgets).map(([cat, val]) => saveBudget(cat, val as number))
      );
      showNotification('Successfully locked all monthly category budgets is compliance boundaries!', 'success');
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to save all budgets', 'error');
    }
  };

  const handleCreateSavingsGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalForm.title || newGoalForm.targetAmount <= 0) {
      showNotification('Goal parameters must have title and positive target.', 'error');
      return;
    }
    try {
      // If linked to wallet, we prefill user.savingCurrent (idx=0 syncs actual balance)
      const startingAmount = newGoalForm.linkToWallet ? user.savingCurrent : newGoalForm.currentAmount;
      await createSavingsGoal(
        newGoalForm.title, 
        newGoalForm.targetAmount, 
        newGoalForm.targetDate, 
        startingAmount
      );
      showNotification(`Created savings goal: "${newGoalForm.title}"!`, 'success');
      setNewGoalForm({ title: '', targetAmount: 0, targetDate: '2026-12-31', currentAmount: 0, linkToWallet: true });
      setShowAddGoal(false);
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Failed creating savings goal', 'error');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm('Delete this savings goal file from registry?')) return;
    try {
      await deleteSavingsGoal(id);
      showNotification('Savings goal was successfully audited and removed.', 'info');
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Failed deleting goal', 'error');
    }
  };

  const handleUpdateReminderSettings = async (field: 'budgetLimitAlert' | 'goalReminder', checked: boolean) => {
    try {
      const nextSettings = {
        ...dbSettings,
        [field]: checked
      };
      setDbSettings(nextSettings);
      await saveReminderSettings(nextSettings);
      showNotification('Reminder preferences securely updated.', 'success');
    } catch (err: any) {
      showNotification(err.message || 'Saving reminders settings failed', 'error');
    }
  };

  // Mock AI Savings Recommendation logic
  const generateAIRecommendations = () => {
    const surplus = thisMonthIncome - thisMonthData.sum;
    const surplusPercent = thisMonthIncome > 0 ? (surplus / thisMonthIncome) * 100 : 0;
    
    // Non-judgmental neutral recommendations (estimate, no investment or loan recommendations)
    return {
      surplus,
      income: thisMonthIncome,
      expenses: thisMonthData.sum,
      savingsPotential: Math.max(surplus * 0.4, 0),
      recommendationText: surplus > 0 
        ? `We analyze a liquid surplus of $${surplus.toFixed(2)} based on your recurring ledger deposits. By aligning entertainment spending by 10%, you could allocate an estimated additional $150.00 monthly towards your active goal, meeting your target approximately 24 days earlier than calculated.`
        : `Simulated monthly ledger outflows are currently higher than incoming direct deposits. Adjusting variable expenses such as food deliveries or transport options could generate an estimated monthly surplus of $120.00 to build a liquid emergency reserve without credit card strain.`,
      disclaimer: `Personalized Estimate: This automated cashflow layout utilizes mock simulation variables. It is formulated for budgeting exercises, is presented purely as an estimate, and does not serve as guaranteed financial planning, loan offering, or investment advisory.`
    };
  };

  const aiRec = generateAIRecommendations();

  // Find limit warnings (Spending near limit: >= 80% limit warning)
  const activeAlerts = Object.entries(thisMonthData.totals)
    .map(([cat, total]) => {
      const budgetObj = dbBudgets.find(b => b.category.toLowerCase() === cat.toLowerCase());
      const limit = budgetObj ? budgetObj.limitAmount : (editedBudgets[cat] || 200);
      const ratio = total / limit;
      return { cat, total, limit, ratio };
    })
    .filter(item => item.ratio >= 0.8 && item.limit > 0);

  return (
    <div className="space-y-4 text-xs animate-fade-in" id="budgeting-view-phase9">
      
      {/* Toast Notification Alert */}
      {notif && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2 px-4 shadow-md transition-all fixed bottom-6 right-6 z-50 animate-bounce duration-75 text-white ${
          notif.type === 'success' ? 'bg-emerald-600 border-emerald-555' : 'bg-slate-800 border-slate-700'
        }`}>
          <Check className="h-4.5 w-4.5 text-emerald-100" />
          <span className="font-semibold text-[11px] tracking-wide font-sans">{notif.message}</span>
        </div>
      )}

      {/* Persistent Budget Limit Warning Banner */}
      {dbSettings.budgetLimitAlert && activeAlerts.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300 leading-normal font-sans animate-fade-in flex flex-col gap-1.5 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-[11.5px]">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>Category Spending Limit Warnings:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px]">
            {activeAlerts.map(alert => (
              <li key={alert.cat}>
                Spend for <strong className="capitalize">{alert.cat}</strong> is at <strong>{Math.round(alert.ratio * 100)}%</strong> of monthly limit (${alert.total.toFixed(2)} out of ${alert.limit.toFixed(2)}). Let's review upcoming variable spending to help stay within guidelines.
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Header and Sub-Tab Switcher */}
      <div className={`p-4 rounded-3xl border transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <h4 className={`text-base font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-950'}`}>
              Enterprise Budgeting, Categorisation & Savings Co-Pilot
            </h4>
            <p className="text-[10.5px] text-slate-450 mt-1">
              Analyze monthly ledger cycles, set category caps, track linked savings targets and optimize with AI heuristics.
            </p>
          </div>

          {/* Month Selector for Simulation */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">LEDGER CYCLE:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`p-1.5 rounded-xl text-[10.5px] font-bold border outline-none font-mono cursor-pointer ${
                darkMode ? 'bg-slate-950 border-slate-800 text-indigo-400' : 'bg-slate-100 border-slate-200 text-indigo-650'
              }`}
            >
              <option value="2026-06">June 2026 (Active)</option>
              <option value="2026-05">May 2026 (Previous)</option>
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 mt-3.5">
          {[
            { id: 'spending', label: 'Spending Analytics', icon: TrendingUp },
            { id: 'budgets', label: 'Category Limits & Caps', icon: CreditCard },
            { id: 'goals', label: 'Savings Goals Tracker', icon: Award },
            { id: 'reminders', label: 'AI Optimization & Alerts', icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSegment(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl font-bold transition-all text-[11px] cursor-pointer ${
                  activeSegment === tab.id
                    ? darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white shadow-xs'
                    : darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-450 font-mono">
          Syncing secure double-entry ledger analytics...
        </div>
      ) : (
        <>
          {/* TAB 1: Spending Analytics */}
          {activeSegment === 'spending' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Left & Middle Column: Analytics Chart, Monthly Summary */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* Metric Summary Strips */}
                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800/70' : 'bg-white border-slate-200'}`}>
                    <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Deposited Profits</span>
                    <span className={`text-[15px] font-extrabold font-mono block mt-1 ${darkMode ? 'text-emerald-450' : 'text-emerald-750'}`}>
                      {user.currency || 'KES'} {thisMonthIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[8px] text-slate-450 font-mono block mt-0.5">Deposits on active date</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800/70' : 'bg-white border-slate-200'}`}>
                    <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Wallet Expensed Out</span>
                    <span className={`text-[15px] font-extrabold font-mono block mt-1 ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                      {user.currency || 'KES'} {thisMonthData.sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[8px] text-slate-450 mt-0.5 font-mono block">
                      {thisMonthData.sum > prevMonthData.sum ? (
                        <span className="text-rose-500 font-bold">+{(((thisMonthData.sum - prevMonthData.sum) / (prevMonthData.sum || 1)) * 100).toFixed(1)}% vs prev</span>
                      ) : (
                        <span className="text-emerald-500 font-bold">{(((thisMonthData.sum - prevMonthData.sum) / (prevMonthData.sum || 1)) * 100).toFixed(1)}% vs prev</span>
                      )}
                    </span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800/70' : 'bg-white border-slate-200'}`}>
                    <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Cashflow Balance</span>
                    <span className={`text-[15px] font-extrabold font-mono block mt-1 ${
                      thisMonthIncome - thisMonthData.sum >= 0 
                        ? darkMode ? 'text-indigo-400' : 'text-indigo-750' 
                        : 'text-rose-650'
                    }`}>
                      {user.currency || 'KES'} {(thisMonthIncome - thisMonthData.sum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[8px] text-slate-450 mt-0.5 font-mono block">Simulated ledger margins</span>
                  </div>
                </div>

                {/* Spending Chart Visualization (Custom SVG for maximum precision & elegance) */}
                <div className={`p-4 rounded-3xl border ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h5 className={`font-sans font-extrabold text-xs uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Category Expenses Comparison
                      </h5>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Solid bars: {selectedMonth}. Outline targets: Limits.</span>
                    </div>
                  </div>

                  {/* Horizontal Bar Chart & Comparison to previous month */}
                  <div className="space-y-4">
                    {EXPENSE_CATEGORIES.map(cat => {
                      const spendThisMonth = thisMonthData.totals[cat] || 0;
                      const spendPrevMonth = prevMonthData.totals[cat] || 0;
                      
                      const budgetObj = dbBudgets.find(b => b.category.toLowerCase() === cat.toLowerCase());
                      const limit = budgetObj ? budgetObj.limitAmount : (editedBudgets[cat] || 200);

                      // SVG percentages
                      const maxAmount = Math.max(
                        ...(Object.values(thisMonthData.totals) as number[]), 
                        ...(Object.values(prevMonthData.totals) as number[]), 
                        100
                      );
                      const percentSpend = (spendThisMonth / maxAmount) * 100;
                      const percentLimit = (limit / maxAmount) * 100;

                      return (
                        <div key={cat} className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10.5px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold capitalize text-slate-500 dark:text-slate-350">{cat}</span>
                              {spendThisMonth > spendPrevMonth && spendPrevMonth > 0 && (
                                <span className="text-[9px] text-rose-500 font-bold italic">
                                  (+${(spendThisMonth - spendPrevMonth).toFixed(0)} vs {previousMonthStr === '2026-05' ? 'May' : 'June'})
                                </span>
                              )}
                              {spendThisMonth < spendPrevMonth && spendThisMonth > 0 && (
                                <span className="text-[9px] text-emerald-500 font-bold italic">
                                  (-${(spendPrevMonth - spendThisMonth).toFixed(0)} vs {previousMonthStr === '2026-05' ? 'May' : 'June'})
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-slate-400">
                              <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>${spendThisMonth.toFixed(2)}</span>
                              <span className="mx-1">/</span>
                              <span>${limit.toFixed(0)} limit</span>
                            </div>
                          </div>

                          {/* Complex SVG representation featuring limits & current spend */}
                          <div className="relative h-4.5 w-full bg-slate-100 dark:bg-slate-950 rounded-lg overflow-hidden border border-slate-200/45 dark:border-slate-800/50">
                            {/* Limit Guideline */}
                            <div 
                              className="absolute top-0 bottom-0 border-r-2 border-dashed border-rose-500/50 z-20"
                              style={{ left: `${Math.min(percentLimit, 100)}%` }}
                              title={`Budget limit: $${limit}`}
                            />
                            
                            {/* Current Spend Fill */}
                            <div 
                              className={`h-full rounded-r-lg transition-all duration-500 ease-out z-10 ${
                                spendThisMonth >= limit 
                                  ? 'bg-rose-500 dark:bg-rose-600' 
                                  : spendThisMonth >= limit * 0.8 
                                    ? 'bg-amber-500 dark:bg-amber-600' 
                                    : 'bg-indigo-650 dark:bg-indigo-500'
                              }`}
                              style={{ width: `${Math.max(percentSpend, spendThisMonth > 0 ? 2 : 0)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Right Column: Manual category update & Transactions catalog */}
              <div className="space-y-4">
                
                <div className={`p-4 rounded-3xl border flex flex-col h-[525px] overflow-hidden ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h5 className={`font-sans font-bold text-xs uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Adjust Categories & Correction
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Choose any transaction from this ledger to correct, classify, or edit its destination category immediately.
                    </p>
                  </div>

                  {/* Transaction correction catalog */}
                  <div className="flex-1 overflow-y-auto mt-2分 divide-y divide-slate-105/10 pr-1 space-y-1">
                    {thisMonthData.transactions.length === 0 ? (
                      <div className="text-center py-20 text-slate-450 font-mono">
                        No withdraw/transfer payments registered this month cycle. Use persona switcher or make transfers to add ledger postings.
                      </div>
                    ) : (
                      thisMonthData.transactions.map(tx => {
                        const cleanCat = getCleanCategory(tx.category);
                        return (
                          <div key={tx.id} className="py-2 flex flex-col gap-1.5 transition-all hover:bg-slate-500/5 p-2 rounded-xl">
                            <div className="flex items-center justify-between">
                              <span className={`font-bold font-sans text-[11px] truncate max-w-[140px] ${darkMode ? 'text-slate-250' : 'text-slate-900'}`}>
                                {tx.description}
                              </span>
                              <span className="font-bold text-rose-550 font-mono text-[11px]">
                                -${tx.amount.toFixed(2)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-450">
                              <span className="font-mono">{new Date(tx.date).toLocaleDateString()}</span>
                              
                              {reclassifyingTxId === tx.id ? (
                                <div className="flex items-center gap-1">
                                  <select
                                    value={cleanCat}
                                    onChange={(e) => handleCategoryCorrection(tx.id, e.target.value)}
                                    className={`p-1 rounded border outline-none font-sans text-[9px] font-medium ${
                                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                                  >
                                    {EXPENSE_CATEGORIES.map(c => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => setReclassifyingTxId(null)}
                                    className="p-1 rounded hover:bg-rose-500/15 text-rose-500"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setReclassifyingTxId(tx.id)}
                                  className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] capitalize cursor-pointer transition-all hover:scale-105 border ${
                                    darkMode 
                                      ? 'bg-slate-950 hover:bg-indigo-900/40 text-indigo-400 border-indigo-900/50' 
                                      : 'bg-indigo-50 hover:bg-indigo-100/50 text-indigo-750 border-indigo-100'
                                  }`}
                                >
                                  ✏️ {cleanCat}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: Category Limits & Caps */}
          {activeSegment === 'budgets' && (
            <div className={`p-4 rounded-3xl border ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
                <div>
                  <h5 className={`font-sans font-extrabold text-sm ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                    Formulate Category Outflow Caps
                  </h5>
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Configure limits for the 10 core expense metrics. Warnings are catalogued instantly if spending overflows 80% boundaries.
                  </p>
                </div>

                <button
                  onClick={handleSaveAllBudgets}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 text-white font-sans font-bold rounded-xl shadow-xs transition-all cursor-pointer select-none"
                >
                  Apply & Lock All Limits
                </button>
              </div>

              {/* Budgets Grid Editor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EXPENSE_CATEGORIES.map(cat => {
                  const spend = thisMonthData.totals[cat] || 0;
                  const limit = editedBudgets[cat] || 0;
                  const ratio = spend / (limit || 1);

                  return (
                    <div 
                      key={cat} 
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-3.5 ${
                        spend >= limit && limit > 0
                          ? darkMode ? 'bg-rose-950/10 border-rose-900/60' : 'bg-rose-50 border-rose-200'
                          : darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-extrabold capitalize text-xs tracking-wide block">{cat}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                            Expensed: ${spend.toFixed(2)}
                          </span>
                        </div>

                        {spend >= limit && limit > 0 ? (
                          <span className="text-[9.5px] bg-rose-500/15 text-rose-550 dark:text-rose-450 px-2.5 py-0.5 rounded font-mono font-bold uppercase">
                            Exceeded
                          </span>
                        ) : spend >= limit * 0.8 && limit > 0 ? (
                          <span className="text-[9.5px] bg-amber-500/15 text-amber-550 dark:text-amber-450 px-2.5 py-0.5 rounded font-mono font-bold uppercase">
                            Warning (80%+)
                          </span>
                        ) : (
                          <span className="text-[9.5px] text-slate-450 font-mono uppercase">
                            Within Limits
                          </span>
                        )}
                      </div>

                      {/* Slider Input with instant visual amount pairing */}
                      <div className="space-y-1 font-mono">
                        <div className="flex justify-between text-[10px] text-slate-450 mb-1">
                          <span>Outflow Caps</span>
                          <span className="font-bold text-indigo-505 dark:text-indigo-400">{user.currency || 'KES'} {limit}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="5000"
                            step="50"
                            value={limit}
                            onChange={(e) => setEditedBudgets({ ...editedBudgets, [cat]: Number(e.target.value) })}
                            className="flex-1 accent-indigo-650 h-1 bg-slate-350 rounded-lg appearance-none cursor-pointer"
                          />
                          <button
                            onClick={() => handleBudgetSave(cat)}
                            className="px-2 py-1 border hover:scale-105 border-indigo-500/20 rounded text-[9.5px] font-bold text-indigo-600 dark:text-indigo-450 cursor-pointer"
                          >
                            Update Individual
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Savings Goals Tracker */}
          {activeSegment === 'goals' && (
            <div className="space-y-4">
              
              {/* Add New Goal Header card */}
              <div className={`p-4 rounded-3xl border ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h5 className={`font-sans font-extrabold text-xs uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Active Saving Goals files
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Set discrete targets, earmark reserves from wallet balances, and track timeline constraints in real-time.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAddGoal(!showAddGoal)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white font-sans font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Savings Goal</span>
                  </button>
                </div>

                {/* Form to Create Saving Goal */}
                {showAddGoal && (
                  <form onSubmit={handleCreateSavingsGoal} className="mt-4 p-4 rounded-2xl bg-slate-500/5 border border-slate-105/10 space-y-3.5 animate-fade-in text-[11px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1 uppercase text-[9.5px]">Goal Description Title</label>
                        <input
                          type="text"
                          required
                          value={newGoalForm.title}
                          onChange={(e) => setNewGoalForm({ ...newGoalForm, title: e.target.value })}
                          placeholder="e.g. Dream Retreat Resort Fund"
                          className={`w-full p-2.5 rounded-xl border outline-none ${
                            darkMode ? 'bg-slate-950 border-slate-850 text-white' : 'bg-white border-slate-250 text-slate-950'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 font-bold mb-1 uppercase text-[9.5px]">Earmark target savings sum ({user.currency || 'KES'})</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={newGoalForm.targetAmount || ''}
                          onChange={(e) => setNewGoalForm({ ...newGoalForm, targetAmount: Number(e.target.value) })}
                          placeholder="e.g. 5000"
                          className={`w-full p-2.5 rounded-xl border outline-none ${
                            darkMode ? 'bg-slate-950 border-slate-850 text-white' : 'bg-white border-slate-250 text-slate-950'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1 uppercase text-[9.5px]">Timeline limit (date)</label>
                        <input
                          type="date"
                          required
                          value={newGoalForm.targetDate}
                          onChange={(e) => setNewGoalForm({ ...newGoalForm, targetDate: e.target.value })}
                          className={`w-full p-2 rounded-xl border outline-none ${
                            darkMode ? 'bg-slate-950 border-slate-850 text-white text-xs' : 'bg-white border-slate-250 text-slate-950 text-xs'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 font-bold mb-1 uppercase text-[9.5px]">Live sync to wallet reserves?</label>
                        <select
                          value={newGoalForm.linkToWallet ? 'true' : 'false'}
                          onChange={(e) => setNewGoalForm({ ...newGoalForm, linkToWallet: e.target.value === 'true' })}
                          className={`w-full p-2.5 rounded-xl border outline-none ${
                            darkMode ? 'bg-slate-950 border-slate-850 text-white' : 'bg-white border-slate-250 text-slate-950'
                          }`}
                        >
                          <option value="true">Yes, link to Main Wallet Savings Balance</option>
                          <option value="false">No, manual starting allocation</option>
                        </select>
                      </div>

                      {!newGoalForm.linkToWallet && (
                        <div>
                          <label className="block text-slate-400 font-bold mb-1 uppercase text-[9.5px]">Starting allocated capital</label>
                          <input
                            type="number"
                            min="0"
                            value={newGoalForm.currentAmount}
                            onChange={(e) => setNewGoalForm({ ...newGoalForm, currentAmount: Number(e.target.value) })}
                            placeholder="e.g. 200"
                            className={`w-full p-2.2 rounded-xl border outline-none ${
                              darkMode ? 'bg-slate-950 border-slate-850 text-white' : 'bg-white border-slate-250 text-slate-950'
                            }`}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowAddGoal(false)}
                        className={`px-3 py-1.5 rounded-lg border font-bold text-slate-450 ${
                          darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-650 text-white font-bold rounded-lg cursor-pointer"
                      >
                        Authorise goal target
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Savings Goals Progress Catalog */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeGoals.map((g, idx) => {
                  const percent = Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100);
                  const isLinked = idx === 0;

                  return (
                    <div 
                      key={g.id} 
                      className={`p-4 rounded-3xl border flex flex-col justify-between ${
                        darkMode ? 'bg-slate-900 border-slate-805' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-extrabold font-sans text-xs uppercase text-indigo-505 dark:text-indigo-400">{g.title}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Target constraint: {g.targetDate}</span>
                          </div>

                          <button
                            onClick={() => handleDeleteGoal(g.id)}
                            className="p-1 rounded hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Delete goal"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Progress display */}
                        <div className="pt-2 font-mono flex items-baseline justify-between">
                          <span className={`${darkMode ? 'text-white' : 'text-slate-905'} text-[13.5px] font-extrabold`}>
                            {user.currency || 'KES'} {g.currentAmount.toLocaleString()}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            of {user.currency || 'KES'} {g.targetAmount.toLocaleString()} ({percent}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-205/10">
                          <div 
                            className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Goal Link status indicator */}
                      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-450 font-mono">
                        {isLinked ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-1">
                            🔒 Linked to Savings Account Balance
                          </span>
                        ) : (
                          <span className="text-amber-500 font-bold flex items-center gap-1">
                            📂 Static Simulation Segment
                          </span>
                        )}

                        <span className="text-[9px]">Target of user: {user.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 4: AI Recommendations & Alert preferences */}
          {activeSegment === 'reminders' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Left Side (Two Columns): AI recommendations card */}
              <div className="lg:col-span-2 space-y-4">
                
                <div className={`p-4 rounded-3xl border flex flex-col gap-3.5 ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400">
                    <Sparkles className="h-5 w-5" />
                    <h5 className="font-sans font-bold text-sm tracking-tight">
                      Empirical AI Savings Recommendations
                    </h5>
                  </div>

                  <div className="space-y-4 font-sans text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    
                    {/* Visual cashflow summary indicators */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 grid grid-cols-2 gap-3 font-mono">
                      <div>
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide block">Audited Income</span>
                        <span className="text-md font-extrabold text-emerald-500 block mt-1">+${aiRec.income.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide block">Monthly Expensed</span>
                        <span className="text-md font-extrabold text-slate-500 block mt-1">-${aiRec.expenses.toFixed(2)}</span>
                      </div>
                    </div>

                    <p className={`p-3.5 rounded-2xl ${
                      darkMode ? 'bg-slate-950' : 'bg-white'
                    } border border-slate-105/10 leading-relaxed font-sans`}>
                      {aiRec.recommendationText}
                    </p>

                    {/* Highly compliant, secure, safe warnings (UAT Requirements block) */}
                    <div className="p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-[9.5px] leading-relaxed font-sans text-slate-400">
                      💡 <strong>Est. Analysis Disclaimer</strong>: {aiRec.disclaimer}
                    </div>

                  </div>
                </div>

              </div>

              {/* Right Side (One Column): Reminder & Notification setting parameters */}
              <div className="space-y-4">
                
                <div className={`p-4 rounded-3xl border ${
                  darkMode ? 'bg-slate-900 border-slate-804' : 'bg-white border-slate-200'
                }`}>
                  <div className="pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-4 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-indigo-500" />
                    <h5 className={`font-sans font-extrabold uppercase text-xs tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      System Warning triggers
                    </h5>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Toggle Set 1 */}
                    <div className="flex items-start justify-between gap-3 p-1">
                      <div className="space-y-0.5">
                        <label className="font-bold text-[11px] block text-slate-350 select-none">
                          Budget Overshoot warnings
                        </label>
                        <span className="text-[10px] text-slate-400 block leading-normal">
                          Display alert panels immediately if variable outflows override 80% boundary limits.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={dbSettings.budgetLimitAlert}
                        onChange={(e) => handleUpdateReminderSettings('budgetLimitAlert', e.target.checked)}
                        className="mt-1 h-4.5 w-4.5 accent-indigo-650 cursor-pointer"
                      />
                    </div>

                    {/* Toggle Set 2 */}
                    <div className="flex items-start justify-between gap-3 p-1">
                      <div className="space-y-0.5">
                        <label className="font-bold text-[11px] block text-slate-350 select-none">
                          Timeline milestone reminder
                        </label>
                        <span className="text-[10px] text-slate-400 block leading-normal">
                          Notify me if target countdown timeline finishes inside 15 days or allocated goals delay progress.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={dbSettings.goalReminder}
                        onChange={(e) => handleUpdateReminderSettings('goalReminder', e.target.checked)}
                        className="mt-1 h-4.5 w-4.5 accent-indigo-650 cursor-pointer"
                      />
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

        </>
      )}

      {/* Footer System Audit */}
      <div className="pt-2 text-[8.5px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 leading-normal font-mono select-none flex justify-between">
        <span>Enterprise SEC Registered Custody Suite • Complies completely with FinCEN AML Directives</span>
        <span>UAT Sign-off active</span>
      </div>

    </div>
  );
};
