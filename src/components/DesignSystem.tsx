import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  Info
} from 'lucide-react';

/* Global high-fidelity color presets for dark and light modes */
export type ThemeMode = 'light' | 'dark';

// Unified styling mapper based on theme selection
export const designStyles = (darkMode: boolean) => ({
  textPrimary: darkMode ? 'text-slate-105' : 'text-slate-900',
  textSecondary: darkMode ? 'text-slate-400' : 'text-slate-500',
  textMuted: darkMode ? 'text-slate-500' : 'text-slate-400',
  border: darkMode ? 'border-slate-800' : 'border-slate-200',
  cardBg: darkMode ? 'bg-[#0f172a] hover:bg-[#1e293b]' : 'bg-white hover:bg-slate-5 font-sans',
  bgMain: darkMode ? 'bg-[#0b0f19]' : 'bg-slate-50',
});

// 1. Status Badges Component with distinct state colours
interface StatusBadgeProps {
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'FLAGGED' | 'SUCCESS';
  darkMode?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, darkMode = false }) => {
  const normalized = status === 'SUCCESS' ? 'COMPLETED' : status;

  const styles = {
    COMPLETED: {
      light: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dark: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80',
      icon: <CheckCircle className="h-3 w-3 shrink-0" />,
      text: 'Settled'
    },
    PENDING: {
      light: 'bg-amber-50 text-amber-800 border-amber-200',
      dark: 'bg-amber-950/70 text-amber-300 border-amber-800/85',
      icon: <Clock className="h-3 w-3 animate-pulse shrink-0" />,
      text: 'Pending'
    },
    FLAGGED: {
      light: 'bg-rose-50 text-rose-800 border-rose-200',
      dark: 'bg-red-950/80 text-rose-300 border-red-800',
      icon: <ShieldAlert className="h-3 w-3 animate-bounce shrink-0" />,
      text: 'Flagged Audit'
    },
    FAILED: {
      light: 'bg-slate-100 text-slate-800 border-slate-200',
      dark: 'bg-slate-800 text-slate-300 border-slate-700',
      icon: <XCircle className="h-3 w-3 shrink-0" />,
      text: 'Failed'
    }
  };

  const choice = styles[normalized] || styles.PENDING;
  const themeClass = darkMode ? choice.dark : choice.light;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold border transition-colors ${themeClass}`}>
      {choice.icon}
      {choice.text}
    </span>
  );
};

// 2. Risk Tier Badges Component
interface RiskBadgeProps {
  tier: 'LOW' | 'MEDIUM' | 'HIGH';
  darkMode?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ tier, darkMode = false }) => {
  const styles = {
    LOW: {
      light: 'bg-slate-100 text-slate-700 border-slate-200',
      dark: 'bg-slate-800 text-slate-300 border-slate-700',
      label: 'Low Risk'
    },
    MEDIUM: {
      light: 'bg-amber-50 text-amber-700 border-amber-200',
      dark: 'bg-amber-950/75 text-amber-300 border-amber-800/50',
      label: 'Medium Risk'
    },
    HIGH: {
      light: 'bg-red-50 text-red-700 border-red-200',
      dark: 'bg-red-950/80 text-red-300 border-red-850',
      label: 'High Surveillance'
    }
  };

  const current = styles[tier] || styles.LOW;
  const bodyStyle = darkMode ? current.dark : current.light;

  return (
    <span className={`inline-flex items-center font-mono text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${bodyStyle}`}>
      {current.label}
    </span>
  );
};

// 3. Stat cards
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
  darkMode?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  isPositive = true,
  icon,
  darkMode = false
}) => {
  return (
    <div className={`p-5 rounded-3xl border transition-all ${
      darkMode 
        ? 'bg-[#151c2d] text-slate-100 border-slate-800' 
        : 'bg-white text-slate-900 border-slate-200/90 shadow-2xs'
    }`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-extrabold uppercase tracking-widest font-mono ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
          {label}
        </span>
        {icon && <div className={darkMode ? 'text-indigo-400' : 'text-indigo-600'}>{icon}</div>}
      </div>
      <div className="mt-2.5">
        <h3 className="text-xl font-extrabold tracking-tight font-sans">
          {value}
        </h3>
        {change && (
          <div className="flex items-center gap-1 mt-1 font-mono text-[10.5px]">
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            )}
            <span className={isPositive ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
              {change}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// 4. Forms & Input Validation Message
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  validationText?: string;
  darkMode?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  validationText,
  darkMode = false,
  ...props
}) => {
  return (
    <div className="space-y-1.5 w-full">
      <label className={`text-xs font-bold font-sans ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
        {label}
      </label>
      <input
        {...props}
        className={`w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border transition-all focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500 focus:ring-red-100 bg-red-50/20'
            : darkMode
            ? 'bg-slate-950 text-slate-100 border-slate-800 focus:border-indigo-500 focus:ring-indigo-950'
            : 'bg-white text-slate-900 border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
        }`}
      />
      {error ? (
        <p className="text-[10.5px] font-bold text-red-500 flex items-center gap-1 animate-pulse">
          <AlertTriangle className="h-3 w-3" /> {error}
        </p>
      ) : validationText ? (
        <p className={`text-[10.5px] font-semibold flex items-center gap-1 ${darkMode ? 'text-slate-400' : 'text-slate-450'}`}>
          <Info className="h-3 w-3" /> {validationText}
        </p>
      ) : null}
    </div>
  );
};

// 5. Timeline Step Progress / Action Log
interface TimelineEvent {
  title: string;
  desc: string;
  time: string;
  status: 'COMPLETED' | 'PENDING' | 'ALERT';
}

export const Timeline: React.FC<{ events: TimelineEvent[]; darkMode?: boolean }> = ({ events, darkMode = false }) => {
  return (
    <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4 space-y-5 ml-4 text-xs">
      {events.map((e, idx) => (
        <div key={idx} className="relative">
          <span className={`absolute -left-[21px] mt-0.5 h-2.5 w-2.5 rounded-full ring-4 ${
            e.status === 'COMPLETED' ? 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-950' :
            e.status === 'ALERT' ? 'bg-rose-500 ring-rose-100 dark:ring-rose-950' : 'bg-amber-500 ring-amber-100 dark:ring-amber-950'
          }`} />
          <div className="flex justify-between items-start gap-2">
            <div>
              <span className={`font-bold block ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{e.title}</span>
              <p className={`text-[11px] leading-relaxed mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{e.desc}</p>
            </div>
            <span className={`text-[10px] font-mono shrink-0 ${darkMode ? 'text-slate-500' : 'text-slate-405'}`}>{e.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// 6. Loading Skeletons
export const LoadingSkeleton: React.FC<{ type?: 'card' | 'table' | 'feed'; darkMode?: boolean }> = ({
  type = 'card',
  darkMode = false
}) => {
  if (type === 'table') {
    return (
      <div className="space-y-3.5 animate-pulse w-full">
        <div className={`h-8 rounded-lg w-full ${darkMode ? 'bg-slate-850' : 'bg-slate-100'}`} />
        <div className={`h-12 rounded-xl w-full ${darkMode ? 'bg-slate-850' : 'bg-slate-100'}`} />
        <div className={`h-12 rounded-xl w-full ${darkMode ? 'bg-slate-850' : 'bg-slate-100'}`} />
        <div className={`h-12 rounded-xl w-full ${darkMode ? 'bg-slate-850' : 'bg-slate-100'}`} />
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-3xl border animate-pulse space-y-4 ${
      darkMode ? 'bg-[#151c2d] border-slate-800' : 'bg-white border-slate-200'
    }`}>
      <div className="flex gap-3 items-center">
        <div className={`h-10 w-10 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
        <div className="space-y-1.5 grow">
          <div className={`h-3.5 rounded-md w-1/3 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
          <div className={`h-2.5 rounded-md w-1/2 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
        </div>
      </div>
      <div className={`h-4 rounded-md w-2/3 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
    </div>
  );
};

// 7. Empty state component
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  darkMode?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  darkMode = false
}) => {
  return (
    <div className={`py-12 px-4 text-center rounded-3xl border border-dashed flex flex-col items-center justify-center space-y-2 ${
      darkMode ? 'border-slate-800 bg-[#0d1527]' : 'border-slate-200 bg-slate-50/50'
    }`}>
      {icon ? (
        <div className={`p-3 rounded-2xl ${darkMode ? 'bg-slate-905 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
          {icon}
        </div>
      ) : (
        <Clock className={`h-8 w-8 ${darkMode ? 'text-slate-600' : 'text-slate-350'}`} />
      )}
      <h4 className={`text-xs font-bold leading-none ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{title}</h4>
      <p className={`text-[11.5px] max-w-sm mx-auto leading-relaxed ${darkMode ? 'text-slate-450' : 'text-slate-500'}`}>{description}</p>
    </div>
  );
};
