import React from 'react';
import { UserProfile } from '../types';
import { Shield, User, RefreshCw, Layers } from 'lucide-react';
import { DESIGN_TOKENS } from '../styles/theme';

interface PersonaSwitcherProps {
  users: UserProfile[];
  activeUser: UserProfile | null;
  onSelectUser: (user: UserProfile) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export const PersonaSwitcher: React.FC<PersonaSwitcherProps> = ({
  users,
  activeUser,
  onSelectUser,
  isLoading,
  onRefresh
}) => {
  const customers = users.filter(u => u.role === 'customer');

  return (
    <div className="bg-slate-950 text-white rounded-3xl shadow-lg p-5 mb-6 border border-slate-800">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl text-white">
            <Layers className="h-5 w-5" id="persona-sec-icon" />
          </div>
          <div>
            <h4 className="font-sans font-bold tracking-tight text-white flex items-center gap-2">
              Enterprise Simulation Controls
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-mono select-none px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                Interactive UAT Board
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Toggle personas dynamically to test customer views, compliance approvals, and ledger limits.
            </p>
          </div>
        </div>

        {/* Info & Refresh Actions */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {isLoading && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin text-indigo-400" /> Syncing core...
            </span>
          )}
          <button
            onClick={onRefresh}
            title="Reload live database from memory store"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Resync Store
          </button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-900 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Active Workspace Persona Panel */}
        <div className="lg:col-span-5 bg-slate-900/60 rounded-2xl p-3.5 border border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-full ${activeUser?.role === 'admin' ? 'bg-indigo-950 text-indigo-300 border border-indigo-900/50' : 'bg-indigo-950 text-indigo-300 border border-indigo-900/50'}`}>
              {activeUser?.role === 'admin' ? (
                <Shield className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Active Persona Context</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                {activeUser?.name || 'Loading persona...'}
                <span className="text-[9px] px-1.5 py-0.5 rounded-md font-mono uppercase bg-indigo-600 text-white font-bold">
                  {activeUser?.role}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[9px] block text-slate-500 font-mono tracking-wider uppercase">KYC status</span>
            <span className={`text-xs font-bold uppercase mt-0.5 block ${
              activeUser?.kycStatus === 'APPROVED' ? 'text-emerald-400' :
              activeUser?.kycStatus === 'PENDING' ? 'text-amber-400' : 'text-rose-400'
            }`}>
              ● {activeUser?.kycStatus || 'UNKNOWN'}
            </span>
          </div>
        </div>

        {/* Selectors */}
        <div className="lg:col-span-7 flex flex-wrap gap-2 items-center justify-start lg:justify-end">
          <span className="text-xs text-slate-500 font-bold mr-1">Quick switcher:</span>
          
          {/* Admin Switcher */}
          <button
            onClick={() => {
              const rootCRO = users.find(u => u.role === 'customer') || {
                id: 'sys-admin',
                name: 'CRO Alex Wong (Admin)',
                email: 'cro.audit@platform.com',
                role: 'admin',
                balance: 0,
                kycStatus: 'APPROVED',
                riskTier: 'LOW',
              } as any;
              onSelectUser({ ...rootCRO, role: 'admin', name: 'CRO Alex Wong', email: 'cro.audit@platform.com' });
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeUser?.role === 'admin'
                ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-500/30'
                : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
            }`}
          >
            🛡️ Chief Risk Officer (Admin)
          </button>

          {/* Customer profiles list */}
          {customers.slice(0, 4).map(cust => (
            <button
              key={cust.id}
              onClick={() => onSelectUser(cust)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeUser?.id === cust.id
                  ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-500/30'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
              }`}
            >
              👤 {cust.name.split(' ')[0]} ({cust.kycStatus === 'PENDING' ? 'KYC Temp' : `$${Math.round(cust.balance / 1000)}k`})
            </button>
          ))}

          {/* More users count */}
          {customers.length > 4 && (
            <div className="text-[10px] text-slate-500 italic">
              + {customers.length - 4} more in database
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
