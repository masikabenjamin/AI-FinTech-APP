import React from 'react';
import { AuditLog } from '../../types';
import { clearAuditLogs } from '../../services/api';
import { Lock, RefreshCw, Cpu } from 'lucide-react';

interface SecuredAuditTrailProps {
  logs: AuditLog[];
  onRefresh: () => void;
  darkMode?: boolean;
}

export const SecuredAuditTrail: React.FC<SecuredAuditTrailProps> = ({
  logs,
  onRefresh,
  darkMode = false
}) => {

  const handleClearLogs = async () => {
    if (confirm('Audit note: clearing permanent security logs requires admin authorization. Proceed in simulation?')) {
      await clearAuditLogs();
      onRefresh();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded font-mono text-[8.5px]">SOLVED</span>;
      case 'WARNING':
        return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold px-2 py-0.5 rounded font-mono text-[8.5px]">SUSPECTED</span>;
      default:
        return <span className="bg-rose-500/10 text-rose-450 border border-rose-500/20 font-bold px-2 py-0.5 rounded font-mono text-[8.5px]">CRITICAL</span>;
    }
  };

  return (
    <div className={`p-4 rounded-xl border transition-all text-xs ${
      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-205 shadow-2xs'
    }`}>
      
      {/* Header controls box */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-850 mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-4.5 w-4.5 text-indigo-405 animate-pulse" />
          <div>
            <h5 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Security Auditing ledger</h5>
            <p className="text-[11px] text-slate-400 mt-0.5">Live immutable telemetry tracking index.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <button
            onClick={onRefresh}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 font-bold cursor-pointer transition-colors ${
              darkMode ? 'bg-slate-950 border-slate-805 text-slate-300 hover:bg-slate-850' : 'bg-slate-50 border-slate-200 text-slate-750 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className="h-3 w-3" /> Reload
          </button>
          
          <button
            onClick={handleClearLogs}
            className="px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/15 text-red-400 flex items-center gap-1 font-bold cursor-pointer transition-colors"
          >
            Wipe
          </button>
        </div>
      </div>

      {/* Log list table layout */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border-collapse min-w-[700px]">
          <thead>
            <tr className={`border-b font-mono text-[8.5px] uppercase tracking-wider ${
              darkMode ? 'border-slate-800 text-slate-405 bg-slate-950/40' : 'border-slate-200 text-slate-505 bg-slate-50'
            }`}>
              <th className="py-2 px-3">Log index</th>
              <th className="py-2 px-3">Timestamp Index</th>
              <th className="py-2 px-3">Actor Role</th>
              <th className="py-2 px-3">Action Directive</th>
              <th className="py-2 px-3">Auditing Notes Description</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Client Hash IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-405">
                  Audit logs cleared. Acknowledged audit trace is active on backends.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/10">
                  <td className="py-2.5 px-3 font-mono text-[9px] text-slate-405 font-bold">{log.id}</td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[9px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-black ${
                      darkMode ? 'bg-slate-850 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                    }`}>
                      {log.actor}
                    </span>
                  </td>
                  <td className={`py-2.5 px-3 font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{log.action}</td>
                  <td className="py-2.5 px-3 text-slate-400 max-w-sm whitespace-normal leading-relaxed">
                    {log.details}
                  </td>
                  <td className="py-2.5 px-3">{getStatusBadge(log.status)}</td>
                  <td className="py-2.5 px-3 text-slate-405 font-mono text-[9px]">{log.ipAddress}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-[9px] text-slate-455 font-mono">
        <span className="flex items-center gap-1">
          <Lock className="h-3 w-3 text-indigo-400" /> Tamper-evident secure cryptographic sequence running actively.
        </span>
        <span>Audit v1.2</span>
      </div>

    </div>
  );
};
