import React, { useState, useEffect } from 'react';
import { UserProfile, SupportTicket } from '../../types';
import { askAI, createSupportTicket, replyToTicket } from '../../services/api';
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  RefreshCw, 
  ChevronRight, 
  MousePointerClick, 
  MessageSquare, 
  FileText, 
  PlusCircle, 
  AlertTriangle 
} from 'lucide-react';

interface AICopilotViewProps {
  user: UserProfile;
  tickets: SupportTicket[];
  onRefreshTickets: () => void;
  darkMode?: boolean;
  isMiniLayout?: boolean;
  onClose?: () => void;
}

export const AICopilotView: React.FC<AICopilotViewProps> = ({
  user,
  tickets,
  onRefreshTickets,
  darkMode = false,
  isMiniLayout = false,
  onClose
}) => {
  // Mini Layout sub tab selector
  const [miniTab, setMiniTab] = useState<'chat' | 'tickets' | 'file'>('chat');

  // AI Assistant Chat Room states
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ id: string; role: 'user' | 'assistant' | 'error'; text: string; isFallback?: boolean }>>([
    {
      id: 'init-ai-msg',
      role: 'assistant',
      text: `Hello ${user.name}! I am your automated Sovereign FinTech Compliance Co-Pilot. I have live, privacy-masked access to our double-entry reserves ledger, risk triggers, and your profile verification attributes.

Ask me a question or click one of the quick suggestions below!`
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Suggested Questions List (Specified in Prompt)
  const SUGGESTED_QUESTIONS = [
    { label: "💳 Add Money", text: "How to add money" },
    { label: "📤 Send Money", text: "How to send money" },
    { label: "🔍 KYC Status", text: "Why KYC is pending" },
    { label: "🎯 Savings Goal", text: "How to set a savings goal" },
    { label: "❄️ Freeze Card", text: "How to freeze a card" },
  ];

  // Submit Tickets states
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'TRANSACTION' | 'ACCOUNT_LOCK' | 'CARD_ISSUE' | 'OTHER' | 'RISK_VAL'>('TRANSACTION');
  const [ticketPriority, setTicketPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Thread Selection states
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  // Submit dynamic AI query
  const handleQueryAI = async (queryText: string) => {
    if (!queryText.trim()) return;

    setChatHistory(prev => [...prev, {
      id: `u-msg-${Date.now()}`,
      role: 'user',
      text: queryText
    }]);

    setIsAiLoading(true);
    try {
      const response = await askAI(queryText, user.id);
      
      setChatHistory(prev => [...prev, {
        id: `ai-msg-${Date.now()}`,
        role: 'assistant',
        text: response.text,
        isFallback: response.isFallback
      }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, {
        id: `ai-err-${Date.now()}`,
        role: 'error',
        text: err?.message || 'Failure syncing communication with backoffice AI.'
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Chat input sender
  const handleSendAiMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    handleQueryAI(msg);
  };

  // Fast trigger for suggested questions
  const handleSuggestedClick = (text: string) => {
    handleQueryAI(text);
  };

  // Launch manually filed Ticket
  const handleLaunchTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    setIsSubmittingTicket(true);
    try {
      await createSupportTicket(
        user.id,
        ticketSubject.trim(),
        ticketMessage.trim(),
        ticketCategory,
        ticketPriority
      );
      setTicketSubject('');
      setTicketMessage('');
      setTicketSuccess(true);
      onRefreshTickets();
      setTimeout(() => {
        setTicketSuccess(false);
        if (isMiniLayout) {
          setMiniTab('tickets'); // auto redirect on success in mini overlay
        }
      }, 2000);
    } catch (err) {
      alert('Error dispatching support ticket feedback.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Auto-escalation tool - Spawns a prefilled support ticket using conversational context!
  const handleAutoEscalateChat = async () => {
    const recentTurns = chatHistory
      .slice(-3)
      .map(h => `[${h.role.toUpperCase()}]: ${h.text}`)
      .join('\n\n');

    setIsAiLoading(true);
    try {
      const ticketId = `tkt-auto-${Date.now()}`;
      await createSupportTicket(
        user.id,
        `Auto-Escalation: Chat Inquiry Dispute Record`,
        `User requested manual review from compliance agent. Conversation ledger attached below:\n\n${recentTurns}`,
        'OTHER',
        'HIGH'
      );
      
      setChatHistory(prev => [...prev, {
        id: `ai-escalated-${Date.now()}`,
        role: 'assistant',
        text: `⚡ Chat Escalation Solved! I have automatically gathered our conversation thread and filed human Support Ticket #${ticketId} (Priority: HIGH) in our central registry. A risk representative will manually examine this ledger immediately.`
      }]);
      onRefreshTickets();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Reply message inside ticket
  const handlePostTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicketId) return;

    setIsReplying(true);
    try {
      await replyToTicket(selectedTicketId, user.name, 'customer', replyText.trim());
      setReplyText('');
      onRefreshTickets();
    } catch (err) {
      alert('Error updating support ticket log.');
    } finally {
      setIsReplying(false);
    }
  };

  const getCategoryClass = (cat: string) => {
    switch (cat) {
      case 'TRANSACTION': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'ACCOUNT_LOCK': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'CARD_ISSUE': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'RISK_VAL': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const myTickets = tickets.filter(t => t.userId === user.id);

  // COMPACT MINI LAYOUT SCREEN ELEMENT
  if (isMiniLayout) {
    return (
      <div className="flex flex-col h-full font-sans text-left">
        {/* Compact Mini layout Navigation Tab Header */}
        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
          <button
            onClick={() => setMiniTab('chat')}
            className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
              miniTab === 'chat'
                ? 'bg-white dark:bg-slate-800 text-indigo-550 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            <MessageSquare className="h-3 w-3" />
            <span>AI Copilot Chat</span>
          </button>
          
          <button
            onClick={() => setMiniTab('tickets')}
            className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
              miniTab === 'tickets'
                ? 'bg-white dark:bg-slate-800 text-indigo-550 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            <FileText className="h-3 w-3" />
            <span>Open Tickets ({myTickets.length})</span>
          </button>

          <button
            onClick={() => setMiniTab('file')}
            className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
              miniTab === 'file'
                ? 'bg-white dark:bg-slate-800 text-indigo-550 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            <PlusCircle className="h-3 w-3" />
            <span>New File</span>
          </button>
        </div>

        {/* Content render container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs pb-16">
          {miniTab === 'chat' && (
            <div className="space-y-3">
              {/* Messages container */}
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-0.5">
                {chatHistory.map((item) => {
                  const isUser = item.role === 'user';
                  return (
                    <div 
                      key={item.id} 
                      className={`flex gap-2 max-w-[92%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 border text-[9px] font-bold ${
                        isUser 
                          ? 'bg-slate-200 border-slate-300 text-slate-800'
                          : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                      }`}>
                        {isUser ? 'U' : 'AI'}
                      </div>

                      <div className={`p-2.5 rounded-xl leading-relaxed ${
                        isUser 
                          ? 'bg-indigo-600 text-white font-medium' 
                          : item.role === 'error'
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
                          : darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-50 border border-slate-200'
                      }`}>
                        <p className="whitespace-pre-line text-[11px] font-medium leading-relaxed">{item.text}</p>
                        
                        {item.isFallback && (
                          <span className="text-[7.5px] font-mono uppercase inline-block mt-1 px-1 py-0.5 rounded border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 font-bold">
                            💡 Help Desk Approved Core
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isAiLoading && (
                  <div className="flex gap-2 items-center text-slate-400 font-mono text-[9.5px]">
                    <RefreshCw className="h-3 w-3 animate-spin text-indigo-400 shrink-0" />
                    <span>Resolving audit context ledger limits...</span>
                  </div>
                )}
              </div>

              {/* Interactive Quick-Launch Suggested Questions List */}
              <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                <span className="text-[8.5px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Suggested Quick Help:</span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      disabled={isAiLoading}
                      onClick={() => handleSuggestedClick(q.text)}
                      className="px-2 py-1 text-[9.5px] font-bold border rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:border-slate-800 hover:border-indigo-450 dark:hover:border-indigo-850 dark:text-slate-300 transition flex items-center gap-0.5 pointer-events-auto cursor-pointer"
                    >
                      <span>{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Escalation assist block inside chat */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-[9px] text-slate-405 font-mono">Confused or restricted?</span>
                <button
                  onClick={handleAutoEscalateChat}
                  disabled={isAiLoading || chatHistory.length < 2}
                  className="px-2 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/25 hover:bg-rose-500/15 rounded text-[9px] font-extrabold transition cursor-pointer"
                >
                  ⚡ Auto-Escalate Chat to Human Ticket
                </button>
              </div>

              {/* Chat Send input */}
              <form onSubmit={handleSendAiMessage} className="pt-2 border-t flex gap-1.5">
                <input
                  type="text"
                  placeholder="Ask about deposits, card lock status..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 w-full text-[11px] px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 bg-white dark:bg-slate-900 dark:border-slate-805"
                />
                <button
                  type="submit"
                  disabled={isAiLoading}
                  className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-[10px] px-3 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                >
                  Ask
                </button>
              </form>
            </div>
          )}

          {miniTab === 'tickets' && (
            <div className="space-y-4">
              <h6 className="text-[9.5px] uppercase font-mono tracking-wider text-slate-404 font-bold block">Your Active Human Case Files</h6>
              
              <div className="space-y-2">
                {myTickets.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-4">No human tickets filed. Tap the File tab to launch one.</p>
                ) : (
                  myTickets.map(tkt => (
                    <div 
                      key={tkt.id} 
                      className="border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-900 border-slate-150 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-[8.5px]">
                        <span className={`px-1.5 py-0.5 rounded border font-bold uppercase ${getCategoryClass(tkt.category)}`}>
                          #{tkt.id} • {tkt.category}
                        </span>
                        <span className="text-slate-450">
                          {new Date(tkt.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h6 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-1">{tkt.subject}</h6>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-200/40 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-mono">
                          Status: <strong className="text-amber-500 font-extrabold">{tkt.status}</strong>
                        </span>

                        <button
                          onClick={() => setSelectedTicketId(selectedTicketId === tkt.id ? null : tkt.id)}
                          className="text-[9px] font-bold text-indigo-505 hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          {selectedTicketId === tkt.id ? 'Hide Logs' : 'View Logs'}
                          <ChevronRight className={`h-3 w-3 transform ${selectedTicketId === tkt.id ? 'rotate-90' : ''}`} />
                        </button>
                      </div>

                      {selectedTicketId === tkt.id && (
                        <div className="mt-2 pt-2 border-t space-y-2 max-h-36 overflow-y-auto">
                          {tkt.messages.map(m => (
                            <div key={m.id} className="text-[9.5px] bg-white dark:bg-slate-950 p-1.5 rounded border border-dashed leading-relaxed">
                              <div className="flex justify-between font-bold text-indigo-400 text-[8.5px]">
                                <span>{m.senderName} ({m.senderRole})</span>
                              </div>
                              <p className="mt-0.5 font-medium text-slate-700 dark:text-slate-300">{m.text}</p>
                            </div>
                          ))}

                          <form onSubmit={handlePostTicketReply} className="flex gap-1.5 pt-1">
                            <input
                              type="text"
                              placeholder="Write reply..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="grow bg-white dark:bg-slate-950 border rounded p-1 text-[9.5px]"
                            />
                            <button
                              type="submit"
                              disabled={isReplying}
                              className="px-2 py-1 bg-indigo-600 text-white font-bold rounded text-[9px] cursor-pointer"
                            >
                              Send
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {miniTab === 'file' && (
            <div className="space-y-4">
              {ticketSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg">
                  Support ticket dispatch saved! Re-routing you...
                </div>
              )}

              <form onSubmit={handleLaunchTicket} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[8.5px] font-mono tracking-wider text-slate-400 uppercase">Sector</label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value as any)}
                      className="w-full bg-slate-100 dark:bg-slate-900 border text-[10px] rounded p-1.5"
                    >
                      <option value="TRANSACTION">Transaction Hold</option>
                      <option value="CARD_ISSUE">Debit Card Block</option>
                      <option value="ACCOUNT_LOCK">KYC Identity Restriction</option>
                      <option value="RISK_VAL">Large Sum Review</option>
                      <option value="OTHER">Other Matters</option>
                    </select>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8.5px] font-mono tracking-wider text-slate-400 uppercase">Severity</label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as any)}
                      className="w-full bg-slate-100 dark:bg-slate-900 border text-[10px] rounded p-1.5"
                    >
                      <option value="LOW">Low Interest</option>
                      <option value="MEDIUM">Middle Tier</option>
                      <option value="HIGH">Critical Escalation</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[8.5px] font-mono tracking-wider text-slate-400 uppercase block">Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief complaint title..."
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border text-[10.5px] rounded p-1.5"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[8.5px] font-mono tracking-wider text-slate-400 uppercase block">Explanation message</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Provide details about failed transfer..."
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border text-[10.5px] rounded p-1.5"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg tracking-wider transition cursor-pointer"
                >
                  Submit Human Ticket File
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // STANDARD DOUBLE COLUMNS LAYOUT FOR FULL SCREEN VIEW
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs animate-fade-in font-sans text-left">
      
      {/* LEFT: Live AI Compliance assistant (Span 3 Columns) */}
      <div className={`md:col-span-3 p-4 rounded-2xl border transition-all flex flex-col justify-between ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-205 shadow-2xs'
      }`}>
        <div>
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-850 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
              <div>
                <h5 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>COOP Compliance Advisor</h5>
                <p className="text-[10.5px] text-slate-400 mt-0.5">Factual double-accounting FinTech expert.</p>
              </div>
            </div>

            <span className="text-[8.5px] tracking-wide text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-xl uppercase font-mono">
              Live Core Sync
            </span>
          </div>

          {/* Quick interactive suggested helper questions */}
          <div className="mb-4 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-1.5 text-left">
            <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-slate-400 block flex items-center gap-1">
              <MousePointerClick className="h-3 w-3 text-indigo-400 animate-bounce" />
              Suggested Sandbox Questions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  disabled={isAiLoading}
                  onClick={() => handleSuggestedClick(q.text)}
                  className="px-2 py-1 text-[10px] font-bold border rounded-lg bg-white hover:bg-slate-150 dark:bg-slate-900 dark:border-slate-800 hover:border-indigo-500 hover:text-indigo-650 dark:hover:border-indigo-805 dark:text-slate-200 transition cursor-pointer select-none"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Log scroll area */}
          <div className="overflow-y-auto space-y-4 px-0.5 py-1 text-xs max-h-[300px] pr-1 border-b pb-4 dark:border-slate-850">
            {chatHistory.map((item) => {
              const isUser = item.role === 'user';
              return (
                <div 
                  key={item.id} 
                  className={`flex gap-2.5 max-w-[90%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border text-[10px] font-bold ${
                    isUser 
                      ? 'bg-slate-105 border-slate-300 text-slate-800'
                      : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                  }`}>
                    {isUser ? 'USER' : 'COOP'}
                  </div>

                  <div className={`p-3 rounded-xl leading-relaxed ${
                    isUser 
                      ? 'bg-indigo-600 text-white font-medium' 
                      : item.role === 'error'
                      ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
                      : darkMode ? 'bg-slate-950 border border-slate-850 text-slate-200' : 'bg-slate-50 border border-slate-150 text-slate-850'
                  }`}>
                    <p className="whitespace-pre-line text-[11px] leading-relaxed font-sans">{item.text}</p>
                    
                    {item.isFallback && (
                      <span className="text-[7.5px] font-mono uppercase inline-block mt-2 px-1 py-0.5 rounded border bg-indigo-500/15 border-indigo-500/25 text-indigo-405 font-bold">
                        💡 Help Center Guided Correctly
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {isAiLoading && (
              <div className="flex gap-2 items-center text-slate-400 font-mono text-[10.5px]">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400 shrink-0" />
                <span>Auditing dynamic customer parameters...</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic chat actions and form */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
            <span>Client ID: {user.id}</span>
            <button
              onClick={handleAutoEscalateChat}
              disabled={isAiLoading || chatHistory.length < 2}
              className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/15 text-rose-500 border border-rose-500/25 rounded text-[8px] font-black uppercase transition cursor-pointer"
            >
              ⚠️ Automatically File human Ticket from chat history
            </button>
          </div>

          <form onSubmit={handleSendAiMessage} className="flex gap-2">
            <input
              type="text"
              placeholder="Ask about daily bounds, pending transactions holds, freeze debit card..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 ${
                darkMode 
                  ? 'bg-slate-955 border-slate-805 text-white focus:ring-indigo-900' 
                  : 'bg-white border-slate-205 text-slate-900 focus:ring-indigo-100'
              }`}
            />
            <button
              type="submit"
              disabled={isAiLoading}
              className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold px-4 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 text-xs"
            >
              Ask AI
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT: Ticket dispatch and Threads (Span 2 Columns) */}
      <div className={`md:col-span-2 p-4 rounded-2xl border transition-all space-y-4.5 flex flex-col justify-between ${
        darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-205 shadow-2xs'
      }`}>
        <div className="space-y-4">
          <div>
            <h5 className={`font-sans font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Human Override Ticket Desk</h5>
            <p className="text-[10.5px] text-slate-405 mt-0.5">Request manual operations review of ledger accounts.</p>
          </div>

          {ticketSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] rounded-xl flex gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5 animate-bounce" />
              <span>Override record logged! Our security squad reviews reports instantly.</span>
            </div>
          )}

          <form onSubmit={handleLaunchTicket} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-450 uppercase block">Override Field</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value as any)}
                  className={`w-full text-xs p-2 rounded-lg border focus:outline-none cursor-pointer ${
                    darkMode ? 'bg-slate-950 border-slate-850 text-white' : 'bg-white border-slate-195 text-slate-800'
                  }`}
                >
                  <option value="TRANSACTION">Large transfer hold</option>
                  <option value="CARD_ISSUE">Lost / Stolen dispute</option>
                  <option value="ACCOUNT_LOCK">Verification audit fail</option>
                  <option value="OTHER">Other ledger override</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-455 uppercase block">Priority</label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value as any)}
                  className={`w-full text-xs p-2 rounded-lg border focus:outline-none cursor-pointer ${
                    darkMode ? 'bg-slate-950 border-slate-850 text-white' : 'bg-white border-slate-195 text-slate-800'
                  }`}
                >
                  <option value="LOW">Low Interest</option>
                  <option value="MEDIUM">Standard hold</option>
                  <option value="HIGH">CRITICAL OVERRIDE</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-455 uppercase block">Title of Dispute</label>
              <input
                type="text"
                required
                placeholder="Brief summary sentence..."
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                className={`w-full text-xs px-3 py-2 rounded-lg border focus:outline-none ${
                  darkMode ? 'bg-slate-955 border-slate-850 text-white' : 'bg-white border-slate-195 text-slate-800'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-455 uppercase block">Elaboration Description</label>
              <textarea
                required
                placeholder="Supply detailed reasons for manual override hold approval..."
                rows={2}
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                className={`w-full text-xs px-3 py-2 rounded-lg border focus:outline-none leading-relaxed ${
                  darkMode ? 'bg-slate-955 border-slate-850 text-white' : 'bg-white border-slate-195 text-slate-800'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingTicket}
              className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 hover:shadow-xs text-white font-bold rounded-xl transition text-xs cursor-pointer"
            >
              Submit Ticket File
            </button>
          </form>
        </div>

        {/* Existing tickets list */}
        <div className="pt-3 border-t border-slate-105 dark:border-slate-850 space-y-2 mt-4.5">
          <h6 className="text-[10px] uppercase font-mono tracking-wider text-slate-450 font-bold">Immutable Case Records Logs</h6>
          
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-0.5">
            {myTickets.length === 0 ? (
              <span className="text-[10px] text-slate-450 block text-center py-2">No active tickets submitted yet.</span>
            ) : (
              myTickets.map(tkt => (
                <div 
                  key={tkt.id} 
                  className={`border rounded-xl p-3 transition-colors ${
                    darkMode ? 'bg-slate-955/50 border-slate-850' : 'bg-slate-50 border-slate-150'
                  }`}
                >
                  <div className="flex justify-between items-center text-[9px]">
                    <span className={`px-1.5 py-0.5 rounded uppercase font-bold border ${getCategoryClass(tkt.category)}`}>
                      {tkt.category}
                    </span>
                    <span className="text-slate-455 font-mono">
                      {new Date(tkt.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h6 className={`text-xs font-bold mt-1 px-0.5 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{tkt.subject}</h6>
                  
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100/50 dark:border-slate-850">
                    <span className="text-[10px] text-slate-400">
                      Status: <span className={`font-semibold uppercase ${tkt.status === 'OPEN' ? 'text-amber-500' : 'text-emerald-500'}`}>{tkt.status}</span>
                    </span>
                    
                    <button
                      onClick={() => setSelectedTicketId(selectedTicketId === tkt.id ? null : tkt.id)}
                      className="text-[10px] font-bold text-indigo-400 flex items-center hover:underline cursor-pointer"
                    >
                      {selectedTicketId === tkt.id ? 'Hide thread' : 'Show thread'}
                      <ChevronRight className={`h-3.5 w-3.5 transform transition-transform ${selectedTicketId === tkt.id ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                  {/* Inline messages thread */}
                  {selectedTicketId === tkt.id && (
                    <div className="mt-3 pt-2 border-t border-slate-205 dark:border-slate-850 space-y-2.5">
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {tkt.messages.map(msg => (
                          <div key={msg.id} className="text-[10px] leading-relaxed">
                            <div className="flex justify-between font-bold text-slate-400">
                              <span>{msg.senderRole === 'customer' ? '👤' : '👷'} {msg.senderName}</span>
                              <span className="font-mono text-[8px]">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className={`p-2 rounded-lg border mt-1 font-semibold ${
                              darkMode ? 'bg-slate-900 border-slate-805 text-slate-300' : 'bg-white border-slate-150 text-slate-800'
                            }`}>
                              {msg.text}
                            </p>
                          </div>
                        ))}
                      </div>

                      <form onSubmit={handlePostTicketReply} className="flex gap-1.5 mt-2">
                        <input
                          type="text"
                          required
                          placeholder="Your reply explanation..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className={`w-full text-xs px-2 py-1.5 rounded-lg border focus:outline-none ${
                            darkMode ? 'bg-slate-955 border-slate-805 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={isReplying}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10.5px] font-bold px-3 rounded-lg cursor-pointer transition-all"
                        >
                          Reply
                        </button>
                      </form>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
