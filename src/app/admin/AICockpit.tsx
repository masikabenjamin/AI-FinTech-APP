import React, { useState, useEffect } from 'react';
import {
  fetchAIInsights,
  fetchAIModels,
  fetchAIThresholds,
  fetchAIPredictionLogs,
  proposeAIThresholdChange,
  approveAIThresholdChange,
  AICoreModel,
  AIThresholdSettings,
  AIThresholdChangeRequest,
  AIPredictionRecord,
  AIInsightsPayload
} from '../../services/api';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import {
  Brain,
  TrendingUp,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Activity,
  Award,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Check,
  X,
  FileText,
  Eye,
  Settings,
  Shield,
  ThumbsUp,
  Cpu
} from 'lucide-react';

interface AICockpitProps {
  darkMode?: boolean;
  activeUser: { name: string; role: string; email: string };
}

export const AICockpit: React.FC<AICockpitProps> = ({
  darkMode = false,
  activeUser
}) => {
  // Navigation: "insights" or "control"
  const [activeTab, setActiveTab] = useState<'insights' | 'control'>('insights');

  // Backend state
  const [insights, setInsights] = useState<AIInsightsPayload | null>(null);
  const [models, setModels] = useState<AICoreModel[]>([]);
  const [thresholds, setThresholds] = useState<AIThresholdSettings | null>(null);
  const [changeRequests, setChangeRequests] = useState<AIThresholdChangeRequest[]>([]);
  const [predictionLogs, setPredictionLogs] = useState<AIPredictionRecord[]>([]);

  // Page statuses
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Proposal form state
  const [proposalSetting, setProposalSetting] = useState<'fraudScoreThreshold' | 'casePriorityThreshold'>('fraudScoreThreshold');
  const [proposalValue, setProposalValue] = useState<number>(40);
  const [proposalNotes, setProposalNotes] = useState<string>('');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  // Action status (modal or slide indicators)
  const [isAuditingRequest, setIsAuditingRequest] = useState<string | null>(null);
  const [auditorFeedback, setAuditorFeedback] = useState<string>('');

  // Diagnostic filters
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [searchReferenceFilter, setSearchReferenceFilter] = useState<string>('');

  // Check if role is authorized to modify thresholds (Risk/Admin Only)
  const isAuthorizedToModify = ['Super Admin', 'Risk Manager', 'Compliance Analyst'].includes(activeUser.role);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [insPayload, modPayload, thrPayload, predPayload] = await Promise.all([
        fetchAIInsights(),
        fetchAIModels(),
        fetchAIThresholds(),
        fetchAIPredictionLogs()
      ]);
      setInsights(insPayload);
      setModels(modPayload);
      setThresholds(thrPayload.thresholds);
      setChangeRequests(thrPayload.changeRequests);
      setPredictionLogs(predPayload);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while loading AI Core parameters.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProposeChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!proposalNotes.trim()) {
      setErrorMessage('MANDATORY JUSTIFICATION: You must supply a reason code stating why the system parameters are being reconfigured.');
      return;
    }

    setIsSubmittingProposal(true);
    try {
      await proposeAIThresholdChange({
        settingName: proposalSetting,
        newValue: Number(proposalValue),
        notes: proposalNotes
      });
      setSuccessMessage(`Success! Proposed new ${proposalSetting} value of ${proposalValue}. Awaiting verification and signoff.`);
      setProposalNotes('');
      // Reload threshold config tab
      const thrPayload = await fetchAIThresholds();
      setThresholds(thrPayload.thresholds);
      setChangeRequests(thrPayload.changeRequests);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit threshold change proposal.');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const handleResolveRequest = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await approveAIThresholdChange(id, action, auditorFeedback || 'Validated via Risk Cockpit.');
      setSuccessMessage(`Successfully ${action.toLowerCase()} threshold proposal #${id}.`);
      setAuditorFeedback('');
      setIsAuditingRequest(null);
      
      // Reload all variables
      const thrPayload = await fetchAIThresholds();
      setThresholds(thrPayload.thresholds);
      setChangeRequests(thrPayload.changeRequests);
      
      // Reload models and insights as accuracy or metrics may update
      const [modPayload, insPayload] = await Promise.all([fetchAIModels(), fetchAIInsights()]);
      setModels(modPayload);
      setInsights(insPayload);
    } catch (err: any) {
      setErrorMessage(err.message || 'Approval was blocked by backend policy.');
    }
  };

  if (isLoading && !insights) {
    return (
      <div className="py-12 text-center text-slate-400 font-mono text-xs">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-indigo-400" />
        Loading AI predictive trends and model parameters...
      </div>
    );
  }

  // Filter logs
  const filteredPredictionLogs = predictionLogs.filter(log => {
    const matchesModel = modelFilter === 'all' || log.modelId === modelFilter;
    const matchesRef = log.inputReference.toLowerCase().includes(searchReferenceFilter.toLowerCase()) || 
                     log.modelName.toLowerCase().includes(searchReferenceFilter.toLowerCase()) ||
                     log.modelOutput.toLowerCase().includes(searchReferenceFilter.toLowerCase());
    return matchesModel && matchesRef;
  });

  return (
    <div className="space-y-6 text-xs text-left select-none">
      
      {/* Top Banner with Credentials Status */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
        darkMode ? 'bg-[#1e1b4b]/20 border-indigo-950/50' : 'bg-indigo-50/50 border-indigo-100'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-wider font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Clearance: {activeUser.role}
            </span>
            <span className={`font-mono text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border ${
              isAuthorizedToModify
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            }`}>
              {isAuthorizedToModify ? '✓ Threshold Write Access' : '🔒 Read-Only Credentials'}
            </span>
          </div>
          <h2 className={`font-sans font-extrabold text-base ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            AI Insights & Control Centre
          </h2>
          <p className="text-[10px] text-slate-400">
            Monitor deep learning accuracy metrics, manage high-priority compliance score thresholds, and track autonomous transaction classification logs.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadData}
            className={`p-2.5 rounded-xl border cursor-pointer hover:scale-105 transition-all flex items-center gap-1.5 ${
              darkMode ? 'bg-slate-900 border-slate-850 text-slate-300 hover:bg-slate-850' : 'bg-white border-slate-205 text-slate-600 hover:bg-slate-50 shadow-3xs'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5 text-indigo-400" /> Refresh Metrics
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl font-bold flex items-start gap-2 leading-relaxed">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span><b>AUDIT BLOCK:</b> {errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-bold flex items-start gap-2 leading-relaxed">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span><b>SUCCESS CONFIRMED:</b> {successMessage}</span>
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 dark:border-slate-850 pb-px">
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-5 py-3 border-b-2 font-sans font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'insights'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-slate-400 hover:text-slate-250'
          }`}
        >
          <TrendingUp className="h-4 w-4" /> AI Predictive Insights
        </button>
        <button
          onClick={() => setActiveTab('control')}
          className={`px-5 py-3 border-b-2 font-sans font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'control'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-slate-400 hover:text-slate-250'
          }`}
        >
          <Sliders className="h-4 w-4" /> Model Control Centre & Logs
        </button>
      </div>

      {/* VIEW A: AI PREDICTIVE INSIGHTS */}
      {activeTab === 'insights' && insights && (
        <div className="space-y-6">
          
          {/* Important Estimate Warning notice */}
          <div className="p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
            <p className="text-[10px] text-slate-400 leading-normal">
              <strong className="text-indigo-400">FINANCIAL COMPLIANCE DISCLAIMER:</strong> Chart forecast models represent predictive mathematical estimates based on linear regression, velocity momentum, and historical trend vectors. These indicators are <b className="text-white">estimates, not accounting facts</b> or audited ledger balances.
            </p>
          </div>

          {/* Row 1: Charts (Revenue Forecast & Payment Volume Forecast) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Revenue Forecast Chart */}
            <div className={`p-4 rounded-2xl border ${
              darkMode ? 'bg-slate-900/60 border-slate-850' : 'bg-white border-slate-200 shadow-3xs'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[9px] tracking-wider uppercase font-mono font-bold text-slate-400 block">6-Month Income Projection</span>
                  <h3 className={`font-sans font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    Corporate Revenue Forecast & Trend (KES)
                  </h3>
                </div>
                <span className="p-1 px-1.5 rounded bg-indigo-500/10 text-indigo-400 font-mono text-[9px] font-extrabold border border-indigo-500/20">
                  ESTIMATE MODEL
                </span>
              </div>

              {/* Chart box */}
              <div className="h-56 w-full -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={insights.revenueSeries} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#e2e8f0"} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={9} fontClassName="font-mono" />
                    <YAxis stroke="#64748b" fontSize={9} fontClassName="font-mono"
                      tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: '#3b82f6', color: darkMode ? '#ffffff' : '#000000', fontSize: '10px' }}
                      formatter={(value: any, name: string) => [`$${value.toLocaleString()}`, name === 'actual' ? 'Historical Actual' : 'Predictive Estimate']}
                    />
                    <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" name="Historical Actual" dataKey="actual" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorActual)" />
                    <Area type="monotone" name="Predictive Estimate" dataKey="forecast" stroke="#2563eb" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorForecast)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Volume Forecast Chart */}
            <div className={`p-4 rounded-2xl border ${
              darkMode ? 'bg-slate-900/60 border-slate-850' : 'bg-white border-slate-200 shadow-3xs'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[9px] tracking-wider uppercase font-mono font-bold text-slate-400 block">System Settled Totals</span>
                  <h3 className={`font-sans font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    Payment Volume Forecast Year-End ($M)
                  </h3>
                </div>
                <span className="p-1 px-1.5 rounded bg-sky-500/10 text-sky-400 font-mono text-[9px] font-extrabold border border-sky-500/20">
                  ESTIMATE MODEL
                </span>
              </div>

              {/* Chart box */}
              <div className="h-56 w-full -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={insights.volumeSeries} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#e2e8f0"} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={9} fontClassName="font-mono" />
                    <YAxis stroke="#64748b" fontSize={9} fontClassName="font-mono" tickFormatter={(v) => `$${v}M`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: '#3b82f6', color: darkMode ? '#ffffff' : '#000000', fontSize: '10px' }}
                      formatter={(value: any, name: string) => [`$${value}M`, name === 'actual' ? 'Historical Volume' : 'Predictive Projection']}
                    />
                    <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                    <Bar name="Historical Volume" dataKey="actual" barSize={14} fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Line name="Predictive Projection" dataKey="forecast" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Row 2: Charts (User Growth & Churn Trend AND Fraud Alert False-Positives) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* User Growth and Churn Risk Trend */}
            <div className={`p-4 rounded-2xl border ${
              darkMode ? 'bg-slate-900/60 border-slate-850' : 'bg-white border-slate-200 shadow-3xs'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[9px] tracking-wider uppercase font-mono font-bold text-slate-400 block">Growth Momentum & Attrition risk</span>
                  <h3 className={`font-sans font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    Active Customer Cohorts vs. Projected Churn Rate
                  </h3>
                </div>
                <span className="p-1 px-1.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-extrabold border border-emerald-500/20">
                  ESTIMATE MODEL
                </span>
              </div>

              {/* Chart box */}
              <div className="h-56 w-full -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={insights.userGrowthSeries} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#e2e8f0"} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={9} fontClassName="font-mono" />
                    <YAxis yAxisId="left" stroke="#10b981" fontSize={9} fontClassName="font-mono" tickFormatter={(v) => `${v / 1000}k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={9} fontClassName="font-mono" tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: '#3b82f6', color: darkMode ? '#ffffff' : '#000000', fontSize: '10px' }}
                    />
                    <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                    <Line yAxisId="left" type="monotone" name="Active Registers (Count)" dataKey="activeUsers" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 5 }} />
                    <Line yAxisId="right" type="monotone" name="Projected Churn Rate (%)" dataKey="churnRisk" stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fraud Alert Trend and False-Positive Indicator */}
            <div className={`p-4 rounded-2xl border ${
              darkMode ? 'bg-slate-900/60 border-slate-850' : 'bg-white border-slate-200 shadow-3xs'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[9px] tracking-wider uppercase font-mono font-bold text-slate-400 block">Security Ops Quality metrics</span>
                  <h3 className={`font-sans font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    Compliance Alert Volume vs False-Positives ratio
                  </h3>
                </div>
                <span className="p-1 px-1.5 rounded bg-amber-500/10 text-amber-500 font-mono text-[9px] font-extrabold border border-amber-500/20">
                  ESTIMATE MODEL
                </span>
              </div>

              {/* Chart box */}
              <div className="h-56 w-full -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={insights.fraudAlertSeries} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#e2e8f0"} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={9} fontClassName="font-mono" />
                    <YAxis stroke="#64748b" fontSize={9} fontClassName="font-mono" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: '#3b82f6', color: darkMode ? '#ffffff' : '#000000', fontSize: '10px' }}
                    />
                    <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" name="Total Triggered Alerts" dataKey="alertsCount" stroke="#f59e0b" strokeWidth={2} fill="#f59e0b" fillOpacity={0.1} />
                    <Area type="monotone" name="Confirmed False-Positives (Placeholder)" dataKey="falsePositives" stroke="#a8a29e" strokeWidth={1.5} strokeDasharray="5 5" fill="#a8a29e" fillOpacity={0.05} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Operational recommendations based on mock analytics */}
          <div className={`p-4 rounded-2xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-850' : 'bg-white border-slate-200'
          }`}>
            <h4 className={`font-sans font-extrabold text-xs mb-3 flex items-center gap-1 text-slate-400 tracking-wider uppercase font-mono`}>
              <Cpu className="h-3.5 w-3.5 mt-px text-indigo-400" /> RECOMMENDED OPERATIONAL ACTIONS (AI-ANALYZED)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.recommendedActions.map((act) => (
                <div 
                  key={act.id} 
                  className={`p-4 rounded-2xl border transition-all ${
                    darkMode ? 'bg-slate-950/60 border-slate-850 hover:bg-slate-850' : 'bg-slate-50/50 border-slate-205 hover:border-indigo-100 shadow-3xs'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[8.5px] uppercase border ${
                      act.priority === 'HIGH' 
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/15'
                        : act.priority === 'MEDIUM'
                        ? 'bg-amber-500/10 text-amber-550 border-amber-550/15'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/15'
                    }`}>
                      {act.priority} Priority
                    </span>
                    <span className="font-mono text-[9px] text-indigo-400 font-extrabold uppercase">
                      {act.category}
                    </span>
                  </div>

                  <h5 className={`font-sans font-extrabold text-xs mt-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    {act.title}
                  </h5>

                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {act.details}
                  </p>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-850 flex items-center gap-1.5 text-[9.5px] font-bold text-emerald-500">
                    <ThumbsUp className="h-3.5 w-3.5 text-emerald-400" /> Benefit Metrics: {act.benefit}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* VIEW B: AI CONTROL CENTRE & MODEL SETTINGS */}
      {activeTab === 'control' && thresholds && (
        <div className="space-y-6">

          {/* AI Model registries list */}
          <div>
            <h4 className={`font-sans font-bold text-xs mb-3 flex items-center gap-1 text-slate-400 tracking-wider uppercase font-mono`}>
              <Brain className="h-4 w-4 text-indigo-400" /> Active Enterprise AI Models Registry
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {models.map((md) => (
                <div 
                  key={md.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    darkMode ? 'bg-slate-900/60 border-slate-850' : 'bg-white border-slate-205'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-[9px] text-slate-400 uppercase font-bold">Ref: {md.id}</span>
                      <span className={`px-1.5 py-0.5 rounded font-mono font-extrabold text-[8.5px] border ${
                        md.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-550 border-emerald-500/20' :
                        md.status === 'DEGRADED' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {md.status}
                      </span>
                    </div>

                    <h5 className={`font-sans font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      {md.name}
                    </h5>

                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Version: {md.version} • Training: {new Date(md.lastTrainingDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Accuracy Matrix Placeholders */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 grid grid-cols-3 gap-1.5 text-center font-mono text-[9.5px]">
                    <div className="p-1 rounded bg-slate-500/5">
                      <span className="text-slate-400 text-[8px] uppercase block">Accuracy</span>
                      <b className="font-black text-slate-650 dark:text-slate-200">{(md.accuracy * 100).toFixed(1)}%</b>
                    </div>
                    <div className="p-1 rounded bg-slate-500/5">
                      <span className="text-slate-400 text-[8px] uppercase block">Precision</span>
                      <b className="font-black text-slate-650 dark:text-slate-200">{(md.precision * 100).toFixed(1)}%</b>
                    </div>
                    <div className="p-1 rounded bg-slate-500/5">
                      <span className="text-slate-400 text-[8px] uppercase block">Recall</span>
                      <b className="font-black text-slate-650 dark:text-slate-200">{(md.recall * 100).toFixed(1)}%</b>
                    </div>
                  </div>

                  {/* Latency and Drift status */}
                  <div className="mt-3 flex justify-between items-center text-[9px] font-mono text-slate-400">
                    <span>Predictions: <b>{md.predictionCount}</b></span>
                    <span>DRift: <b className={
                      md.driftIndicator === 'HIGH' ? 'text-rose-400' :
                      md.driftIndicator === 'LOW' ? 'text-amber-400' :
                      'text-emerald-400'
                    }>{md.driftIndicator}</b></span>
                    <span>Latency: <b>{md.latencyMs}ms</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Threshold management (Authorized ONLY or blocked) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Setting controller parameters form */}
            <div className={`p-4 rounded-2xl border ${
              darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-200 shadow-3xs'
            }`}>
              <div className="border-b border-slate-100 dark:border-slate-850 pb-2.5 mb-4">
                <span className="text-[9px] uppercase font-mono font-bold text-indigo-400 block">AI Security Controls</span>
                <h4 className={`text-xs font-sans font-extrabold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  System Compliance Parameters
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Set thresholds for automatic risk flagging and operational alert prioritization.
                </p>
              </div>

              {/* Display active values */}
              <div className="grid grid-cols-2 gap-4 mb-4 font-mono text-center">
                <div className="p-3 bg-slate-500/5 rounded-xl border border-slate-500/10">
                  <span className="text-slate-400 text-[8.5px] uppercase block">Active Fraud Flag score</span>
                  <div className={`text-xl font-black mt-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    {thresholds.fraudScoreThreshold}/100
                  </div>
                  <p className="text-[8.5px] text-slate-400 mt-1">Score to trigger FLAG decision.</p>
                </div>

                <div className="p-3 bg-slate-500/5 rounded-xl border border-slate-500/10">
                  <span className="text-slate-400 text-[8.5px] uppercase block">Case priority score threshold</span>
                  <div className={`text-xl font-black mt-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    {thresholds.casePriorityThreshold}/100
                  </div>
                  <p className="text-[8.5px] text-slate-400 mt-1">Score to flag CRITICAL alert risk.</p>
                </div>
              </div>

              {/* Form proposal */}
              <form onSubmit={handleProposeChange} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold mb-1">Target Parameter</label>
                    <select
                      value={proposalSetting}
                      onChange={(e: any) => {
                        setProposalSetting(e.target.value);
                        setProposalValue(e.target.value === 'fraudScoreThreshold' ? thresholds.fraudScoreThreshold : thresholds.casePriorityThreshold);
                      }}
                      className={`w-full p-2 rounded-lg border font-bold text-[10.5px] cursor-pointer ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-205 text-slate-705'
                      }`}
                    >
                      <option value="fraudScoreThreshold">Fraud Score Flag Threshold</option>
                      <option value="casePriorityThreshold">Case Priority High Score Threshold</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold mb-1">Proposed Value (0-100)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={proposalValue}
                      onChange={(e) => setProposalValue(Number(e.target.value))}
                      className={`w-full p-2 rounded-lg border font-mono font-bold text-[10.5px] ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-205 text-slate-705'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Auditor description & change justification code (Mandatory)</label>
                  <textarea
                    required
                    rows={3}
                    value={proposalNotes}
                    onChange={(e) => setProposalNotes(e.target.value)}
                    placeholder="Provide explanatory description notes for adjustments..."
                    className={`w-full p-2 text-[10.5px] rounded-lg border focus:outline-none resize-none leading-relaxed ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-650' : 'bg-white border-slate-205 text-slate-705'
                    }`}
                  ></textarea>
                </div>

                <div className="flex justify-between items-center bg-amber-500/5 p-2 rounded border border-amber-500/10 text-[9.5px] text-amber-500 text-left">
                  <span>🔒 Changes require verification review and audit logs logging.</span>
                </div>

                <div className="flex justify-end pt-1">
                  {isAuthorizedToModify ? (
                    <button
                      type="submit"
                      disabled={isSubmittingProposal}
                      className="px-4 py-2 font-sans font-bold text-white bg-indigo-600 hover:bg-indigo-505 rounded-xl cursor-pointer"
                    >
                      {isSubmittingProposal ? 'Proposing...' : 'Submit Threshold Change Proposal'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 font-sans font-bold text-slate-400 bg-slate-200 dark:bg-slate-850 rounded-xl cursor-not-allowed"
                    >
                      🔒 Non-Authorized Clearance level
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Change requests approval list */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
              darkMode ? 'bg-slate-900/60 border-slate-850' : 'bg-white border-slate-200 shadow-3xs'
            }`}>
              <div>
                <div className="border-b border-slate-100 dark:border-slate-850 pb-2.5 mb-3.5 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] uppercase font-mono font-bold text-slate-400 block">Pending authorizations</span>
                    <h4 className={`text-xs font-sans font-extrabold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      Threshold Reconfiguration Requests
                    </h4>
                  </div>
                  <span className="font-mono text-[9px] text-slate-450 bg-slate-500/10 px-1.5 py-0.5 rounded font-bold">
                    Total: {changeRequests.length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {changeRequests.map((req) => (
                    <div 
                      key={req.id}
                      className={`p-3 rounded-xl border flex flex-col justify-between gap-2 text-xs transition-all ${
                        req.status === 'APPROVED' ? 'bg-emerald-500/5 border-emerald-500/15' :
                        req.status === 'REJECTED' ? 'bg-rose-500/5 border-rose-500/15' :
                        'bg-amber-500/15 border-amber-500/20'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[9px] font-extrabold text-indigo-400 uppercase">#{req.id}</span>
                          <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[8.5px] border ${
                            req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-550 border-emerald-500/20' :
                            req.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                            'bg-amber-500/10 text-amber-550 border-amber-555/20 animate-pulse'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        <h5 className="font-sans font-bold text-[11px] mt-1.5 uppercase leading-normal">
                          {req.settingName === 'fraudScoreThreshold' ? 'Fraud Scoring' : 'Case Priority'} Threshold Re-calibration
                        </h5>
                        
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                          Path: Old value <b className="text-white">{req.oldValue}</b> ➔ Proposed Value <b className="text-indigo-400">{req.newValue}</b>
                        </p>

                        <p className={`text-[10px] mt-1.5 italic ${darkMode ? 'text-slate-350' : 'text-slate-600'}`}>
                          &quot;{req.notes}&quot;
                        </p>

                        <div className="text-[9.5px] text-slate-400 pt-1.5 font-mono">
                          Proposer: <b>{req.proposedBy}</b>
                          {req.approvedBy && (
                            <div className="text-emerald-550 font-bold mt-0.5">
                              Cleared: <b>{req.approvedBy}</b> • Comments: {req.auditorFeedback}
                            </div>
                          )}
                        </div>
                      </div>

                      {req.status === 'PENDING' && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                          <input
                            type="text"
                            value={isAuditingRequest === req.id ? auditorFeedback : ''}
                            onChange={(e) => {
                              setIsAuditingRequest(req.id);
                              setAuditorFeedback(e.target.value);
                            }}
                            placeholder="Enter approval confirmation rationale comments..."
                            className={`flex-1 p-1 px-2 rounded-lg border text-[10px] focus:outline-none ${
                              darkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-white border-slate-205 text-slate-800'
                            }`}
                          />
                          
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                if (isAuthorizedToModify) {
                                  handleResolveRequest(req.id, 'REJECTED');
                                } else {
                                  setErrorMessage('Access Denied: Only authorized risk/admin roles (such as Super Admin or Risk Manager) hold proper clearance validation levels to reject threshold re-calibrations.');
                                }
                              }}
                              className="p-1 px-2 bg-rose-600 hover:bg-rose-500 text-white font-sans font-bold rounded text-[9.5px] cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => {
                                if (isAuthorizedToModify) {
                                  handleResolveRequest(req.id, 'APPROVED');
                                } else {
                                  setErrorMessage('Access Denied: You must possess authorized administrative Risk/Admin clearance to signoff and approve core AI threshold overrides.');
                                }
                              }}
                              className="p-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold rounded text-[9.5px] cursor-pointer"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Autonomous prediction log table with traceability columns */}
          <div className={`rounded-2xl border overflow-hidden ${
            darkMode ? 'bg-[#0f172a] border-slate-850' : 'bg-white border-slate-200 shadow-3xs'
          }`}>
            <div className="p-3 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div>
                <h4 className={`font-sans font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  Autonomous Prediction Audit Stream log
                </h4>
                <p className="text-[9.5px] text-slate-400">
                  Tracing AI output decisions back to actual ledger transaction references or user cases.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  className={`p-1 px-2 text-[10px] rounded-lg border font-bold ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-804'
                  }`}
                >
                  <option value="all">All Models</option>
                  <option value="mdl-fraud-scoring">Fraud scoring</option>
                  <option value="mdl-expense-cat">Expense categorisation</option>
                  <option value="mdl-savings-rec">Savings recommendation</option>
                  <option value="mdl-ai-assistant">AI assistant</option>
                  <option value="mdl-churn-pred">Churn prediction</option>
                </select>

                <input
                  type="text"
                  placeholder="Filter references (e.g. tx-1)..."
                  value={searchReferenceFilter}
                  onChange={(e) => setSearchReferenceFilter(e.target.value)}
                  className={`p-1 px-2 text-[10px] rounded-lg border ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b font-mono text-[9px] uppercase tracking-wider ${
                    darkMode ? 'bg-slate-900/60 border-slate-850 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <th className="p-3">Prediction ID</th>
                    <th className="p-3">Model Source</th>
                    <th className="p-3">Target Reference</th>
                    <th className="p-3">Model Inference Details</th>
                    <th className="p-3 text-center">Confidence Score</th>
                    <th className="p-3">Autonomous Action Applied</th>
                    <th className="p-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-mono text-[10.5px]">
                  {filteredPredictionLogs.map((log) => (
                    <tr key={log.id} className={darkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'}>
                      <td className="p-3 font-bold text-slate-400">
                        {log.id}
                      </td>
                      <td className="p-3 font-sans font-bold">
                        {log.modelName}
                      </td>
                      <td className="p-3">
                        <span className="p-1 px-1.5 rounded bg-indigo-505/10 text-indigo-400 font-extrabold border border-indigo-500/15 text-[9.5px]">
                          {log.inputReference}
                        </span>
                      </td>
                      <td className="p-3 font-sans max-w-[200px] truncate" title={log.modelOutput}>
                        {log.modelOutput}
                      </td>
                      <td className="p-3 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded ${
                          log.confidence >= 0.90 
                            ? 'bg-emerald-500/10 text-emerald-550'
                            : log.confidence >= 0.80
                            ? 'bg-amber-500/10 text-amber-550'
                            : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {(log.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="p-3 font-sans text-slate-400 truncate max-w-[220px]" title={log.actionTaken}>
                        {log.actionTaken}
                      </td>
                      <td className="p-3 text-right text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
export default AICockpit;
