import { GoogleGenAI } from '@google/genai';
import store from './data/store';
import ledgerCore from './ledger/ledgerCore';

let aiClient: GoogleGenAI | null = null;

// Lazy client setup with professional telemetry headers
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      throw new Error('GEMINI_API_KEY is not configured or uses placeholder description');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. HELP CENTRE APPROVED KNOWLEDGE ARTICLES
const KNOWLEDGE_BASE = [
  {
    keywords: ['add money', 'top up', 'deposit money', 'funding source', 'how to add money'],
    answer: "To add money to your wallet, go to your 'Wallet' dashboard view and select 'Add Money'. Select a verified funding source (e.g. ACH bank account or simulated Visa), specify the transaction amount, and authorize. Simulated funds are credited instantly to your account liability."
  },
  {
    keywords: ['send money', 'how to send money', 'transfer money', 'peer transfer', 'perform transfer'],
    answer: "To send money, click on the 'Send' navigation tab at the bottom. Provide the recipient's registered email or wallet address, state the asset amount, select a ledger category (e.g., Dining, Shopping), and complete the multi-factor challenge to broadcast the transaction."
  },
  {
    keywords: ['kyc is pending', 'why kyc is pending', 'kyc status', 'verify identity', 'kyc check'],
    answer: "Your E-KYC application review typically takes 1 to 2 business days. Our compliance officers review identity document images manually to evaluate OCR matching integrity scores. During this pending state, outgoing transactions are held for asset protection."
  },
  {
    keywords: ['savings goal', 'how to set a savings goal', 'create goal', 'financial dynamic goal'],
    answer: "Under the 'Insights' or 'Budgeting' module, you can specify individual Savings Goals. Scroll to the Savings Goals section, click 'Add Goal', enter a goal name, target amount, and your compliance target deadline. Your progress tracks automatically."
  },
  {
    keywords: ['freeze card', 'how to freeze a card', 'how to freeze card', 'lock card', 'unfreeze card', 'card status'],
    answer: "To freeze your virtual or physical debit card, click on the 'Cards' tab to open the Sovereign Card Manager. Select your targeted card, then click 'Freeze Card'. This instantly blocks future transactions on that card. You can unfreeze it at any time."
  }
];

// Regulated financial/tax/legal advice check
function detectRegulatedAdviceRequest(prompt: string): boolean {
  const norm = prompt.toLowerCase();
  const keywords = [
    'invest', 'stock', 'crypto market', 'shares', 'buy', 'tax consult', 'tax advice', 
    'legal help', 'legal advice', 'credit decision', 'guaranteed return', 'guaranteed finance', 
    'financial returns', 'forex market', 'mortgage loan decision'
  ];
  return keywords.some(kw => norm.includes(kw));
}

// Sensitive issue triggering (fraud claims, account restrictions, identity disputes, failed payments, complaints)
function detectSensitiveIssue(prompt: string): boolean {
  const norm = prompt.toLowerCase();
  const keywords = [
    'fraud', 'scam', 'compromised', 'stolen', 'identity dispute', 'unauthorized', 
    'restricted', 'suspended', 'blocked account', 'failed payment', 'payment failed', 
    'chargeback', 'complaint', 'stolen card', 'lost my card'
  ];
  return keywords.some(kw => norm.includes(kw));
}

// Dynamic privacy data masking helper (masks Raw Card stats, SSNs, 16-digit card counts, PINs, bank accounts)
export function maskSensitiveData(payload: string): string {
  if (!payload) return '';
  
  // Mask typical Card sequences (13 to 19 digits)
  let result = payload.replace(/\b(?:\d[ -]*?){13,19}\b/g, (match) => {
    const cleanDigits = match.replace(/[\s-]/g, '');
    const last4 = cleanDigits.slice(-4);
    return `•••• •••• •••• ${last4}`;
  });

  // Mask PIN values "pin is 1234"
  result = result.replace(/(pin|cvv|cvc)[:\s=]+(\d{3,4})\b/ig, (match, prefix, digits) => {
    return `${prefix}: •••` + (digits.length === 4 ? '•' : '');
  });

  // Mask SSNs/National IDs
  result = result.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '•••-••-••••');

  return result;
}

export async function askFinanceAssistant(prompt: string, contextUser?: string): Promise<{ text: string; isFallback: boolean }> {
  const usersCount = store.users.length;
  const txCount = store.transactions.length;
  const pendingKYC = store.kycCases.filter(k => k.status === 'PENDING').length;
  const openAlerts = store.complianceAlerts.filter(a => a.status === 'OPEN').length;
  const openTickets = store.supportTickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  const ledgerIntegrity = ledgerCore.verifyIntegrity();
  const totalUserLiabilities = ledgerCore.getTotalUserLiability();
  const reserves = ledgerCore.getPlatformReserves();

  const activeUserBrief = contextUser ? store.getUserById(contextUser) : null;
  const actorName = activeUserBrief ? activeUserBrief.name : 'GUEST';

  // Privacy sanitize input prompt
  const maskedPrompt = maskSensitiveData(prompt);

  // 2. CHECK REGULATED ADVICE LIMITS
  if (detectRegulatedAdviceRequest(maskedPrompt)) {
    const refusal = "As a compliant AI platform assistant, I am strictly prohibited from providing regulated legal, tax, investment, or credit approval decisions. For guidance on currency and regulatory matters, please consult with a qualified professional counselor or legal advisor.";
    
    store.logAudit(
      actorName,
      'AI_GUARD_REGULATED_ADVICE_REFUSAL',
      `Prompt: "${maskedPrompt.substring(0, 100)}..." -> AI refused regulated advice request.`,
      'SUCCESS',
      '127.0.0.1'
    );

    return { text: refusal, isFallback: true };
  }

  // 3. CHECK SENSITIVE ESCALATION ISSUES -> Auto Create Support Ticket
  if (detectSensitiveIssue(maskedPrompt) && activeUserBrief) {
    const ticketId = `tkt-ai-${Date.now()}`;
    const subject = `AI Escalation: Critical Billing/Compliance Investigation Request`;
    const message = `Automated escalation based on sensitive user dialogue trigger: "${maskedPrompt.substring(0, 160)}"`;

    const newTicket = {
      id: ticketId,
      userId: activeUserBrief.id,
      userName: activeUserBrief.name,
      subject,
      message,
      category: 'ACCOUNT_LOCK' as const,
      status: 'OPEN' as const,
      priority: 'HIGH' as const,
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-ai-${Date.now()}`,
          senderName: activeUserBrief.name,
          senderRole: 'customer' as const,
          text: `Hi Operations, I am experiencing an issue regarding my account restriction/payment failure/fraud. Prompt text: ${maskedPrompt}`,
          timestamp: new Date().toISOString()
        }
      ]
    };

    store.supportTickets.unshift(newTicket);
    
    // Log AI interaction with privacy masking to immutable audit logs
    store.logAudit(
      actorName,
      'AI_CRITICAL_SUPPORT_ESCALATION',
      `Auto-spawned high-risk ticket #${ticketId} based on sensitive inquiry. Log masked: "${maskedPrompt.substring(0, 100)}"`,
      'WARNING',
      '127.0.0.1'
    );

    const escalationResponse = `I have detected a sensitive inquiry related to fraud, account restrictions, or payment failures. For your absolute safety and strict regulatory compliance, I have escalated this conversation directly to human operations by automatically spawning Support Ticket #${ticketId}. An expert from our compliance and support squad will review your case and reach out via your ticketing dashboard inside 1 hour.`;
    return { text: escalationResponse, isFallback: true };
  }

  // 4. KNOWLEDGE BASE MATCHING ROUTE
  let matchingArticle = null;
  const lowerPrompt = maskedPrompt.toLowerCase();
  for (const article of KNOWLEDGE_BASE) {
    if (article.keywords.some(keyword => lowerPrompt.includes(keyword))) {
      matchingArticle = article.answer;
      break;
    }
  }

  // Define the core banking instructions & stat guidance
  const systemInstruction = `You are the lead Enterprise FinTech Auditor and AI Co-Pilot for the platform.
The user is interacting inside a APP Prototype (No real money movement).
Here are live stats of our ledger database system:
- Current Registered Persona Profiles: ${usersCount}
- Active Double-Entry Journal Postings: ${txCount}
- Pending KYC Applications: ${pendingKYC}
- Core Risk/Fraud Engine Compliance Alerts Open: ${openAlerts}
- Customer Support Inquiries Unresolved: ${openTickets}
- Platform Double-Entry Reserve Vault Balance: $${reserves.toFixed(2)} USD
- Total User Deposit Liability: $${totalUserLiabilities.toFixed(2)} USD
- Ledger Integrity: ${ledgerIntegrity.isValid ? 'VERIFIED HEALTHY (Balanced)' : 'WARNING: ' + ledgerIntegrity.message}

${activeUserBrief ? `The current active user acting is ${activeUserBrief.name} (${activeUserBrief.email}), balance: $${activeUserBrief.balance.toFixed(2)}, KYC Status: ${activeUserBrief.kycStatus}, Risk: ${activeUserBrief.riskTier}.` : 'No active context user selected.'}

Your goals:
1. Provide highly expert, precise financial audit feedback and answer queries strictly on facts.
2. If matching knowledge base text exists: Use it to answer! Here is custom knowledge text: "${matchingArticle || 'None matched'}".
3. NEVER provide regulated investment advisory, stock recommendations, tax consulting, credit approval verdicts or guaranteed financials.
4. MASK any fully rendered card records or raw IDs into •••• masks.
5. Keep answers concise, factual, and write a subtle disclaimer to make sure the user realizes all assets are completely simulated sandbox tokens.`;

  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: maskedPrompt,
      config: {
        systemInstruction,
        temperature: 0.5,
      }
    });

    const parsedResponse = maskSensitiveData(response.text || 'No response text received from model.');

    // Log the interaction with privacy masking applied
    store.logAudit(
      actorName,
      'AI_CONVERSATION_LOG',
      `Prompt: "${maskedPrompt.substring(0, 80)}" -> Response: "${parsedResponse.substring(0, 80)}" [MAPPED VIA GEMINI]`,
      'SUCCESS',
      '127.0.0.1'
    );

    return {
      text: parsedResponse,
      isFallback: false
    };
  } catch (error: any) {
    console.warn('Gemini API failed or skipped. Serving via approved locally structured knowledge hub. Reason:', error?.message);

    // Dynamic Mock Rulebot Answers matched to knowledge base
    let reply = `[Apex AI Copilot Help Desk]: `;

    if (matchingArticle) {
      reply += matchingArticle;
    } else if (lowerPrompt.includes('ledger') || lowerPrompt.includes('double') || lowerPrompt.includes('balancing')) {
      reply += `Our system operates on double-entry principles. Core reserves in the Vault currently sum to $${reserves.toFixed(2)} USD, paired against total user liability of $${totalUserLiabilities.toFixed(2)} USD. Ledger status: ${ledgerIntegrity.message}.`;
    } else if (lowerPrompt.includes('audit') || lowerPrompt.includes('log')) {
      reply += `All critical user events (limits modification, card freeze, reward redemptions) are immediately written to the Immutable Audit Trail. Admin role accounts have exclusive privileges to review these logs in the Support panel.`;
    } else {
      reply += `Welcome to the Sovereign Help Desk. I can provide instructions regarding adding funds, initiating peer transfers, current KYC processing queues, configuring budgeting goals, or locking your registered Visa card. Please note: This is a simulated demo workspace containing mock tokens for sandbox evaluation.`;
    }

    const parsedResponse = maskSensitiveData(reply);

    // Log interaction to system logs
    store.logAudit(
      actorName,
      'AI_CONVERSATION_LOG',
      `Prompt: "${maskedPrompt.substring(0, 80)}" -> Response: "${parsedResponse.substring(0, 80)}" [MAPPED VIA FALLBACK]`,
      'SUCCESS',
      '127.0.0.1'
    );

    return {
      text: parsedResponse,
      isFallback: true
    };
  }
}
