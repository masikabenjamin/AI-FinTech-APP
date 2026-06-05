import React, { useState } from 'react';
import { SupportTicket } from '../../types';
import { replyToTicket } from '../../services/api';
import { Mail, MessageSquare, Check, HelpCircle, ChevronRight } from 'lucide-react';

interface AdminSupportDeskProps {
  tickets: SupportTicket[];
  onActionComplete: () => void;
  darkMode?: boolean;
}

export const AdminSupportDesk: React.FC<AdminSupportDeskProps> = ({
  tickets,
  onActionComplete,
  darkMode = false
}) => {
  const [operatorName, setOperatorName] = useState('Operations Specialist');
  const [replyText, setReplyText] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  const handleReplyMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;

    setIsReplying(true);
    try {
      await replyToTicket(selectedTicketId, operatorName, 'admin', replyText.trim());
      setReplyText('');
      onActionComplete();
    } catch (err) {
      alert('Error dispatching back-office response.');
    } finally {
      setIsReplying(false);
    }
  };

  const getPriorityBadge = (pri: string) => {
    switch (pri) {
      case 'HIGH': 
        return <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded font-mono text-[8.5px] font-bold">HIGH</span>;
      case 'MEDIUM': 
        return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono text-[8.5px] font-bold">MEDIUM</span>;
      default: 
        return <span className="bg-slate-500/10 text-slate-400 border border-slate-550/20 px-1.5 py-0.5 rounded font-mono text-[8.5px] font-bold">LOW</span>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
      
      {/* Ticket inventory (Span 7) */}
      <div className="lg:col-span-7">
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-205'
        }`}>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-850 pb-3">
            <div>
              <h5 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Customer Disputes & Inquiries</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Audit files and operational help desks.</p>
            </div>
            
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className={`text-[10.5px] font-mono px-2.5 py-1.5 rounded-xl border focus:outline-none ${
                darkMode ? 'bg-slate-955 border-slate-805 text-white' : 'bg-slate-50 border-slate-205 text-slate-800'
              }`}
              placeholder="Staff initials..."
            />
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <p className="py-6 text-center text-slate-405">All customer support files clear!</p>
            ) : (
              tickets.map(tkt => (
                <div 
                  key={tkt.id}
                  onClick={() => setSelectedTicketId(tkt.id)}
                  className={`border rounded-xl p-3.5 cursor-pointer transition-all ${
                    selectedTicketId === tkt.id 
                      ? darkMode ? 'bg-slate-850/80 border-indigo-500/40 text-white' : 'bg-indigo-50/50 border-indigo-200 text-slate-900 shadow-2xs'
                      : darkMode ? 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/30 text-slate-400' : 'bg-white border-slate-150 hover:bg-slate-50/50 text-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-mono text-indigo-400 font-extrabold uppercase tracking-widest">{tkt.category}</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      {getPriorityBadge(tkt.priority)}
                      <span className={`h-2 w-2 rounded-full ${tkt.status === 'OPEN' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    </div>
                  </div>

                  <h6 className={`text-[12px] font-extrabold mt-2 ${selectedTicketId === tkt.id ? '' : darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {tkt.subject}
                  </h6>
                  
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100/50 dark:border-slate-850">
                    <span>Inquirer: <span className="font-bold underline">{tkt.userName}</span></span>
                    
                    <button className="text-indigo-400 hover:underline flex items-center font-bold font-mono text-[9px] gap-0.5">
                      Inspect Chat <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {/* Reply workstation (Span 5) */}
      <div className="lg:col-span-5">
        <div className={`p-4 rounded-2xl border transition-all h-full flex flex-col justify-between ${
          darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-205 shadow-2xs'
        }`}>
          <div>
            <h6 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono mb-4 flex items-center gap-1">
              <MessageSquare className="h-4 w-4 text-indigo-400 animate-pulse" /> Support Overrides
            </h6>

            {!activeTicket ? (
              <div className="py-12 text-center text-slate-405">
                <Mail className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <span className="font-bold block">Select dispute file card</span>
                <p className="text-[10.5px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Click any envelope inside the center grid to inspect history chat logs and reply.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Meta details */}
                <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-bold ${
                  darkMode ? 'bg-slate-950/65 border-slate-850' : 'bg-slate-50 border-slate-100'
                }`}>
                  <span className="text-slate-405">Customer Name:</span>
                  <span className={darkMode ? 'text-white' : 'text-slate-800'}>{activeTicket.userName}</span>
                </div>

                {/* Messages history thread */}
                <div className={`border p-3.5 rounded-xl space-y-3.5 max-h-[220px] overflow-y-auto ${
                  darkMode ? 'bg-slate-955/65 border-slate-850' : 'bg-slate-50 border-slate-150'
                }`}>
                  {activeTicket.messages.map(item => (
                    <div key={item.id} className="text-xs">
                      <div className="flex justify-between text-[9px] text-slate-450 font-bold">
                        <span className="flex items-center gap-1">
                          {item.senderRole === 'customer' ? '👤' : item.senderRole === 'ai' ? '🤖' : '👷'}
                          {item.senderName}
                        </span>
                        <span>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`px-2.5 py-1.5 rounded-xl border mt-1 leading-relaxed font-semibold ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-slate-305' : 'bg-white border-slate-150 text-slate-755'
                      }`}>
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleReplyMessage} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase block">Staff Response Box</label>
                    <textarea
                      placeholder="Write instructions or override answers..."
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className={`w-full text-xs px-3.5 py-2 rounded-xl border focus:outline-none focus:ring-1 ${
                        darkMode 
                          ? 'bg-slate-950 border-slate-805 text-white focus:ring-indigo-900' 
                          : 'bg-white border-slate-205 text-slate-800 focus:ring-indigo-100'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isReplying}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="h-4 w-4" /> Publish Resolution
                  </button>
                </form>

              </div>
            )}
          </div>

          <p className="text-[9.5px] text-slate-405 mt-4">
            * Warning details: Support overrides close disputes instantly and record trace history on immutable security tracks.
          </p>
        </div>
      </div>

    </div>
  );
};
