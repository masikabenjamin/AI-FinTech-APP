import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Imports from our backend architecture
import store from './server/data/store';
import ledgerCore from './server/ledger/ledgerCore';
import riskEngine from './server/risk/riskEngine';
import auditLogger from './server/audit/auditLogger';
import financeCore from './server/finance/financeCore';
import { askFinanceAssistant } from './server/gemini';
import { Transaction, UserProfile, KYCCase, SavingsGoal } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Read the body parse settings
  app.use(express.json());

  // Logging API inquiries for transparency
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API ${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });

  // --- AUTH COMPLIANCE HELPERS & ENDPOINTS ---
  const getSessionFromReq = (req: any) => {
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '') : req.headers['x-session-id'];
    if (!sessionId) return null;
    return store.getSession(sessionId as string);
  };

  const getActiveUserFromReq = (req: any) => {
    const sess = getSessionFromReq(req);
    if (!sess) return null;
    return store.getUserById(sess.userId);
  };

  // 1. Health Probe & Platform details
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'Enterprise AI FinTech APP',
      timestamp: new Date().toISOString()
    });
  });

  // Register customer
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please supply a robust customer name, email address, and secure password.' });
    }

    const emailKey = email.toLowerCase().trim();
    if (store.credentials.has(emailKey)) {
      return res.status(400).json({ error: 'An account with this email address has already registered on our sovereign trust.' });
    }

    const newUserId = `usr-reg-${Date.now()}`;
    const newUser: UserProfile = {
      id: newUserId,
      name,
      email: emailKey,
      role: 'customer',
      balance: 1000.00, // starting balance for registration testing
      currency: 'USD',
      savingGoal: 0,
      savingCurrent: 0,
      kycStatus: 'PENDING',
      riskTier: 'LOW',
      cardNumber: `•••• •••• •••• ${Math.floor(1000 + Math.random() * 9000)}`,
      cardStatus: 'ACTIVE',
      cardLimit: 1000,
      creditScore: 650
    };

    store.users.splice(10, 0, newUser); // insert customer in the list

    // Save secure credential record containing salt and hashing
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = store.hashPassword(password, salt);

    store.credentials.set(emailKey, {
      userId: newUserId,
      email: emailKey,
      passwordHash,
      salt
    });

    store.logAudit(
      name, 
      'CUSTOMER_REGISTER_SUCCESS', 
      `Customer registered account details successfully. ID: ${newUserId}`, 
      'SUCCESS', 
      req.ip || '127.0.0.1'
    );

    res.status(201).json({ success: true, message: 'Customer registration successful.' });
  });

  // Login credentials check
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Provide both email and login password characters.' });
    }

    const emailKey = email.toLowerCase().trim();
    const cred = store.credentials.get(emailKey);
    if (!cred) {
      store.logAudit('GUEST', 'LOGIN_FAILURE', `Failed login attempt for nonexistent account: ${emailKey}`, 'FAILURE', req.ip || '127.0.0.1');
      return res.status(401).json({ error: 'Invalid login credentials.' });
    }

    const computedHash = store.hashPassword(password, cred.salt);
    if (computedHash !== cred.passwordHash) {
      const user = store.getUserById(cred.userId);
      const name = user ? user.name : 'Unknown User';
      store.logAudit(name, 'LOGIN_FAILURE', `Invalid security password attempt for ${emailKey}`, 'FAILURE', req.ip || '127.0.0.1');
      return res.status(401).json({ error: 'Invalid login credentials.' });
    }

    const user = store.getUserById(cred.userId)!;

    // Checks if administrator requires mandatory MFA check
    if (user.role !== 'customer') {
      // Create temporary session requiring MFA validation
      const tempSess = store.createSession(user.id, user.role, false);
      store.logAudit(user.name, 'MFA_REQUIRED', `Administrative credentials entered. Prompting MFA verification for ${user.role} workspace.`, 'WARNING', req.ip || '127.0.0.1');
      return res.json({
        mfaRequired: true,
        sessionId: tempSess.id,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    }

    // Direct customer session setup
    const sess = store.createSession(user.id, user.role, true);
    store.logAudit(user.name, 'LOGIN_SUCCESS', `Customer logged in successfully to platform.`, 'SUCCESS', req.ip || '127.0.0.1');
    res.json({
      sessionId: sess.id,
      user
    });
  });

  // Validate admin MFA code (mock code: 123456)
  app.post('/api/auth/mfa', (req, res) => {
    const { sessionId, code } = req.body;
    if (!sessionId || !code) {
      return res.status(400).json({ error: 'Session identifier and security MFA code are necessary.' });
    }

    const sess = store.sessions.get(sessionId);
    if (!sess) {
      return res.status(401).json({ error: 'Session has expired or is invalid.' });
    }

    const user = store.getUserById(sess.userId)!;

    if (code !== '123456') {
      store.logAudit(user.name, 'MFA_VERIFICATION_FAILED', `Incorrect MFA authorization token code ${code} submitted.`, 'FAILURE', req.ip || '127.0.0.1');
      return res.status(400).json({ error: 'The MFA numeric validation code is invalid. APP code is 123456.' });
    }

    sess.mfaVerified = true;
    store.logAudit(user.name, 'MFA_VERIFICATION_SUCCESS', `MFA verified. Session authorized for ${user.role} workspace.`, 'SUCCESS', req.ip || '127.0.0.1');

    res.json({
      sessionId: sess.id,
      user
    });
  });

  // Logouts
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '') : req.headers['x-session-id'];
    if (sessionId) {
      const sess = store.sessions.get(sessionId as string);
      if (sess) {
        const user = store.getUserById(sess.userId);
        if (user) {
          store.logAudit(user.name, 'LOGOUT', `User exited portal and wiped session.`, 'SUCCESS', String(req.ip || '127.0.0.1'));
        }
        store.deleteSession(sessionId as string);
      }
    }
    res.json({ success: true, message: 'Session terminated.' });
  });

  app.get('/api/auth/session', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      return res.status(401).json({ error: 'No active session or session expired.' });
    }
    const user = store.getUserById(sess.userId);
    if (!user) {
      return res.status(404).json({ error: 'Profile not found.' });
    }
    res.json({ session: sess, user });
  });

  // Password recovery simulation (Forgot Password)
  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Please submit a robust email address.' });
    }
    const emailKey = email.toLowerCase().trim();
    const cred = store.credentials.get(emailKey);
    if (!cred) {
      return res.json({ success: true, message: 'If email exists in ledger database, instrucions were dispatched.', simulatedToken: 'RESET-MOCK-992' });
    }
    
    const user = store.getUserById(cred.userId)!;
    const simToken = `RST-${Math.floor(100+Math.random()*900)}-APX`;
    cred.forgotPasswordToken = simToken;

    store.logAudit(user.name, 'FORGOT_PASSWORD_REQUEST', `Dispatched reset token simulation link to email matching files.`, 'SUCCESS', req.ip || '127.0.0.1');
    res.json({
      success: true,
      message: 'Simulated password reset instructions generated.',
      simulatedToken: simToken
    });
  });

  // Reset Password using token
  app.post('/api/auth/reset-password', (req, res) => {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'Missing reset credentials or token.' });
    }

    const emailKey = email.toLowerCase().trim();
    const cred = store.credentials.get(emailKey);
    if (!cred || cred.forgotPasswordToken !== token) {
      return res.status(400).json({ error: 'The reset verification code matches none of the system files.' });
    }

    const user = store.getUserById(cred.userId)!;
    const nextSalt = crypto.randomBytes(16).toString('hex');
    cred.passwordHash = store.hashPassword(newPassword, nextSalt);
    cred.salt = nextSalt;
    delete cred.forgotPasswordToken;

    store.logAudit(user.name, 'PASSWORD_RESET_SUCCESS', `Customer successfully changed password and refreshed encryption bounds.`, 'SUCCESS', req.ip || '127.0.0.1');
    res.json({ success: true, message: 'Your password was securely updated. Try logging in.' });
  });

  // Settings modification (Super Admin configuration portal)
  app.put('/api/auth/settings', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess || sess.role !== 'Super Admin') {
      const user = sess ? store.getUserById(sess.userId) : null;
      store.logAudit(user ? user.name : 'GUEST', 'ACCESS_DENIED_SETTINGS', `Access denied: Settings changes require Super Admin clearance.`, 'FAILURE', req.ip || '127.0.0.1');
      return res.status(403).json({ error: 'Access Denied: Only Super Admins can update system configurations.' });
    }

    const { allowFinanceOfficerKycApproval } = req.body;
    if (allowFinanceOfficerKycApproval !== undefined) {
      store.allowFinanceOfficerKycApproval = Boolean(allowFinanceOfficerKycApproval);
      store.logAudit('Alex Wong (Super Admin)', 'SYSTEM_SETTINGS_UPDATE', `Modified config: allowFinanceOfficerKycApproval toggled to ${store.allowFinanceOfficerKycApproval}`, 'SUCCESS', req.ip || '127.0.0.1');
    }

    res.json({
      allowFinanceOfficerKycApproval: store.allowFinanceOfficerKycApproval
    });
  });

  app.get('/api/auth/settings', (req, res) => {
    res.json({
      allowFinanceOfficerKycApproval: store.allowFinanceOfficerKycApproval
    });
  });

  // 2. Fetch User Personas list
  app.get('/api/users', (req, res) => {
    res.json(store.users);
  });

  app.get('/api/users/:id', (req, res) => {
    const user = store.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    res.json(user);
  });

  // 3. Update User profile characteristics (e.g., limits, savings objectives, freeze card)
  app.put('/api/users/:id', (req, res) => {
    const user = store.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const { balance, savingGoal, savingCurrent, cardStatus, cardLimit, creditScore } = req.body;

    if (balance !== undefined) user.balance = Number(balance);
    if (savingGoal !== undefined) user.savingGoal = Number(savingGoal);
    if (savingCurrent !== undefined) user.savingCurrent = Number(savingCurrent);
    if (cardStatus !== undefined) user.cardStatus = cardStatus;
    if (cardLimit !== undefined) user.cardLimit = Number(cardLimit);
    if (creditScore !== undefined) user.creditScore = Number(creditScore);

    auditLogger.log(
      'ADMIN_ACTION',
      'UPDATE_USER_PROFILE',
      `Manual adjustment saved for profile ${user.name} (${user.id}). Params modified.`,
      'SUCCESS'
    );

    res.json(user);
  });

  // 4. Ledger transactions & history
  app.get('/api/transactions', (req, res) => {
    res.json(store.transactions);
  });

  // --- BUDGETS, EXPENSE CATEGORIES & SAVINGS GOALS (PHASE 9) ---

  // 1. Update Transaction Category (Manual Correction)
  app.put('/api/transactions/:id/category', (req, res) => {
    const { id } = req.params;
    const { category } = req.body;
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    const tx = store.transactions.find(t => t.id === id);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    const oldCat = tx.category;
    tx.category = category;
    
    // Log audit
    const activeUser = getActiveUserFromReq(req);
    store.logAudit(
      activeUser ? activeUser.name : 'System',
      'TRANSACTION_RECLASSIFIED',
      `Reclassified transaction ${id} from '${oldCat}' to '${category}'`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );
    
    res.json({ success: true, transaction: tx });
  });

  // 2. Fetch budgets
  app.get('/api/budgets', (req, res) => {
    const user = getActiveUserFromReq(req);
    const userId = user ? user.id : 'usr-1';
    
    // If no budgets exist for this user, seed default budgets
    let userBudgets = store.budgets.filter(b => b.userId === userId);
    if (userBudgets.length === 0) {
      const defaultCategories = ['rent', 'food', 'transport', 'utilities', 'subscriptions', 'education', 'health', 'business', 'entertainment', 'transfers'];
      const defaultLimits: Record<string, number> = {
        rent: 1800, food: 600, transport: 250, utilities: 150, subscriptions: 80,
        education: 200, health: 400, business: 1000, entertainment: 300, transfers: 500
      };
      
      defaultCategories.forEach((cat, idx) => {
        store.budgets.push({
          id: `b-${userId}-${idx + 1}`,
          userId,
          category: cat,
          limitAmount: defaultLimits[cat] || 200
        });
      });
      userBudgets = store.budgets.filter(b => b.userId === userId);
    }
    
    res.json(userBudgets);
  });

  // 3. Create or Edit category budget
  app.post('/api/budgets', (req, res) => {
    const user = getActiveUserFromReq(req);
    const userId = user ? user.id : 'usr-1';
    const { category, limitAmount } = req.body;
    
    if (!category || limitAmount === undefined) {
      return res.status(400).json({ error: 'Category and limitAmount are required' });
    }
    
    let budget = store.budgets.find(b => b.userId === userId && b.category.toLowerCase() === category.toLowerCase());
    if (budget) {
      budget.limitAmount = Number(limitAmount);
    } else {
      budget = {
        id: `b-${userId}-${Date.now()}`,
        userId,
        category: category.toLowerCase(),
        limitAmount: Number(limitAmount)
      };
      store.budgets.push(budget);
    }
    
    // Log audit
    store.logAudit(
      user ? user.name : 'System',
      'BUDGET_RECONFIGURED',
      `Set budget for '${category}' to $${limitAmount}`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );
    
    res.json({ success: true, budget });
  });

  // 4. Get savings goals
  app.get('/api/savings-goals', (req, res) => {
    const user = getActiveUserFromReq(req);
    const userId = user ? user.id : 'usr-1';
    
    // Seed some general goals if none exist yet for usr1
    let userGoals = store.savingsGoals.filter(g => g.userId === userId);
    if (userGoals.length === 0 && userId === 'usr-1') {
      store.savingsGoals.push({
        id: 'g-1',
        userId: 'usr-1',
        title: 'Tesla Down Payment',
        targetAmount: 10000,
        currentAmount: 3400,
        targetDate: '2026-12-31',
        createdAt: new Date().toISOString()
      });
      store.savingsGoals.push({
        id: 'g-2',
        userId: 'usr-1',
        title: 'Hawaii Tour Fund',
        targetAmount: 4000,
        currentAmount: 1200,
        targetDate: '2026-08-15',
        createdAt: new Date().toISOString()
      });
      userGoals = store.savingsGoals.filter(g => g.userId === userId);
    }
    
    res.json(userGoals);
  });

  // 5. Create a savings goal
  app.post('/api/savings-goals', (req, res) => {
    const user = getActiveUserFromReq(req);
    const userId = user ? user.id : 'usr-1';
    const { title, targetAmount, targetDate, currentAmount } = req.body;
    
    if (!title || !targetAmount || !targetDate) {
      return res.status(400).json({ error: 'Title, targetAmount, and targetDate are required' });
    }
    
    const newGoal: SavingsGoal = {
      id: `g-${userId}-${Date.now()}`,
      userId,
      title,
      targetAmount: Number(targetAmount),
      currentAmount: currentAmount !== undefined ? Number(currentAmount) : 0,
      targetDate,
      createdAt: new Date().toISOString()
    };
    
    store.savingsGoals.push(newGoal);
    
    // Log audit
    store.logAudit(
      user ? user.name : 'System',
      'SAVINGS_GOAL_CREATED',
      `Created savings goal: '${title}' with target $${targetAmount}`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );
    
    res.json({ success: true, goal: newGoal });
  });

  // 6. Edit a savings goal
  app.put('/api/savings-goals/:id', (req, res) => {
    const { id } = req.params;
    const { title, targetAmount, targetDate, currentAmount } = req.body;
    
    const goal = store.savingsGoals.find(g => g.id === id);
    if (!goal) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }
    
    if (title) goal.title = title;
    if (targetAmount !== undefined) goal.targetAmount = Number(targetAmount);
    if (targetDate) goal.targetDate = targetDate;
    if (currentAmount !== undefined) goal.currentAmount = Number(currentAmount);
    
    const user = getActiveUserFromReq(req);
    // Log audit
    store.logAudit(
      user ? user.name : 'System',
      'SAVINGS_GOAL_UPDATED',
      `Updated savings goal: '${goal.title}'`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );
    
    res.json({ success: true, goal });
  });

  // 7. Delete a savings goal
  app.delete('/api/savings-goals/:id', (req, res) => {
    const { id } = req.params;
    const idx = store.savingsGoals.findIndex(g => g.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }
    
    const deleted = store.savingsGoals.splice(idx, 1)[0];
    const user = getActiveUserFromReq(req);
    // Log audit
    store.logAudit(
      user ? user.name : 'System',
      'SAVINGS_GOAL_DELETED',
      `Deleted savings goal: '${deleted.title}'`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );
    
    res.json({ success: true, goal: deleted });
  });

  // 8. Get reminder settings
  app.get('/api/budget-settings', (req, res) => {
    const user = getActiveUserFromReq(req);
    const userId = user ? user.id : 'usr-1';
    
    let settings = store.reminderSettings.find(s => s.userId === userId);
    if (!settings) {
      settings = { userId, budgetLimitAlert: true, goalReminder: true };
      store.reminderSettings.push(settings);
    }
    
    res.json(settings);
  });

  // 9. Update reminder settings
  app.put('/api/budget-settings', (req, res) => {
    const user = getActiveUserFromReq(req);
    const userId = user ? user.id : 'usr-1';
    const { budgetLimitAlert, goalReminder } = req.body;
    
    let settings = store.reminderSettings.find(s => s.userId === userId);
    if (!settings) {
      settings = { userId, budgetLimitAlert: true, goalReminder: true };
      store.reminderSettings.push(settings);
    }
    
    if (budgetLimitAlert !== undefined) settings.budgetLimitAlert = Boolean(budgetLimitAlert);
    if (goalReminder !== undefined) settings.goalReminder = Boolean(goalReminder);
    
    res.json({ success: true, settings });
  });

  // --- ADD MONEY FUNDING SANDBOX WORKFLOW ---

  // 1. Create funding payment intent with risk checking
  app.post('/api/funding/intent', (req, res) => {
    const user = getActiveUserFromReq(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Active user session is mandatory.' });
    }

    const { amount, currency, fundingSource, sourceDetails } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid calculation context: Specify positive amount value.' });
    }

    const amt = Number(amount);

    // Backend Gating 1: KYC status MUST be approved (Phase 5/6/7 rule)
    if (user.kycStatus !== 'APPROVED') {
      return res.status(403).json({
        error: `KYC_GATE_LOCKED: Complete the electronic KYC documentation and reach APPROVED status before initiating transfers or deposits. Current Status: ${user.kycStatus}`
      });
    }

    // Backend Risk Check 1: Amount Limit check
    if (amt < 10) {
      return res.status(400).json({ error: `LIMIT_CONTROL_REJECTED: Funding amount is below transaction minimum limit of $10.00 USD.` });
    }
    if (amt > 10000) {
      return res.status(400).json({ error: `LIMIT_CONTROL_REJECTED: Funding amount exceeds maximum single sandbox transaction limit of $10,000.00 USD.` });
    }

    // Backend Risk Check 2: Velocity check (no more than 3 transactions in 5 minutes map)
    const recentTxs = store.transactions.filter(
      t => (t.senderId === user.id || t.receiverId === user.id) &&
      (new Date().getTime() - new Date(t.date).getTime()) < 300000 // 5 minutes
    );
    const velocityLimitPass = recentTxs.length < 3;

    // Backend Risk Check 3: Device check simulation (e.g. mock a trusted device verification)
    const deviceRecognized = true;

    // Fees configuration
    let calculatedFee = 0;
    if (fundingSource === 'DEBIT_CARD') {
      calculatedFee = Number((amt * 0.015).toFixed(2));
    } else if (fundingSource === 'MOBILE_MONEY') {
      calculatedFee = Number((amt * 0.01).toFixed(2));
    } // BANK_TRANSFER is free (calculatedFee = 0)

    const totalDebit = Number((amt + calculatedFee).toFixed(2));
    const expectedCredit = amt;

    const idempotencyKey = crypto.randomUUID();
    const intentId = `pmt-intent-${crypto.randomBytes(8).toString('hex')}`;

    res.json({
      success: true,
      intentId,
      idempotencyKey,
      amount: amt,
      fee: calculatedFee,
      totalDebit,
      expectedCredit,
      fundingSource,
      sourceDetails: sourceDetails || 'Standard Token Placeholder',
      riskEvaluation: {
        passed: velocityLimitPass,
        kycVerified: true,
        velocityLimitPass,
        deviceRecognized
      }
    });
  });

  // 2. Confirm payment intent and simulate webhook / sandbox billing settlement
  app.post('/api/funding/confirm', (req, res) => {
    const user = getActiveUserFromReq(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Active user session is mandatory.' });
    }

    const { intentId, idempotencyKey, pin, simulatedOutcome, amount, fundingSource, fee } = req.body;

    // 1. PIN or mfa security validation simulation
    if (pin !== '1234' && pin !== '123456') {
      store.logAudit(
        user.name,
        'FUNDING_PIN_VERIFICATION_FAILED',
        `Add Money security check failed. Incorrect transaction security pin verification code provided.`,
        'FAILURE',
        req.ip || '127.0.0.1'
      );
      return res.status(400).json({ error: 'TRANS_PIN_INVALID: The security PIN or transaction verification token is invalid. Use sandbox default code "1234".' });
    }

    const amt = Number(amount);
    const finalCredit = amt;

    const gatewayReference = `gw-ref-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const ledgerReference = `led-ref-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    // Determine simulation results
    if (simulatedOutcome === 'FAILURE') {
      // Create a FAILED transaction
      const failedId = `tx-funding-fail-${Date.now()}`;
      const failTx: Transaction = {
        id: failedId,
        date: new Date().toISOString(),
        amount: amt,
        type: 'DEPOSIT',
        senderName: `Gateway: ${fundingSource}`,
        receiverId: user.id,
        receiverName: user.name,
        status: 'FAILED',
        category: 'Income',
        description: `Add Money via ${fundingSource === 'DEBIT_CARD' ? 'Debit Card' : fundingSource === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Mobile Money'} (Failed)`,
        ledgerStatus: 'VOID',
        gatewayRef: gatewayReference,
        ledgerRef: ledgerReference
      };

      store.transactions.unshift(failTx);

      // Write failure audit log
      store.logAudit(
        user.name,
        'FUNDING_TRANSACTION_FAILURE',
        `Add Money request of $${amt.toFixed(2)} via ${fundingSource} simulated Gateway REJECTION. Gateway Ref: ${gatewayReference}. Wallet not credited.`,
        'FAILURE',
        req.ip || '127.0.0.1'
      );

      return res.json({
        success: false,
        transaction: failTx,
        message: 'APP gateway simulation resolved as REJECTED. Ledger transaction marked as FAILED.'
      });
    }

    if (simulatedOutcome === 'PENDING') {
      // Create a PENDING transaction
      const pendingId = `tx-funding-pend-${Date.now()}`;
      const pendingTx: Transaction = {
        id: pendingId,
        date: new Date().toISOString(),
        amount: amt,
        type: 'DEPOSIT',
        senderName: `Gateway: ${fundingSource}`,
        receiverId: user.id,
        receiverName: user.name,
        status: 'PENDING',
        category: 'Income',
        description: `Add Money via ${fundingSource === 'DEBIT_CARD' ? 'Debit Card' : fundingSource === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Mobile Money'} (Pending Settlement)`,
        ledgerStatus: 'VOID_PENDING',
        gatewayRef: gatewayReference,
        ledgerRef: ledgerReference
      };

      store.transactions.unshift(pendingTx);

      // Write pending audit log
      store.logAudit(
        user.name,
        'FUNDING_TRANSACTION_PENDING',
        `Payment gateway generated pending webhook status for $${amt.toFixed(2)} via ${fundingSource}. Gateway Ref: ${gatewayReference}. Settlement of ledger remains suspended.`,
        'WARNING',
        req.ip || '127.0.0.1'
      );

      return res.json({
        success: true,
        transaction: pendingTx,
        message: 'APP payment gateway returned a PENDING webhook response. Ledger postings are on temporary compliance hold.'
      });
    }

    // --- SUCCESS OUTCOME ---
    // 1. Credit wallet
    user.balance = Number((user.balance + finalCredit).toFixed(2));

    // 2. Create completed deposit transaction mapping reference numbers
    const successId = `tx-funding-ok-${Date.now()}`;
    const successTx: Transaction = {
      id: successId,
      date: new Date().toISOString(),
      amount: amt,
      type: 'DEPOSIT',
      senderName: `Gateway: ${fundingSource}`,
      receiverId: user.id,
      receiverName: user.name,
      status: 'COMPLETED',
      category: 'Income',
      description: `Funded via ${fundingSource === 'DEBIT_CARD' ? 'Debit Card' : fundingSource === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Mobile Money'}`,
      ledgerStatus: 'POSTED',
      gatewayRef: gatewayReference,
      ledgerRef: ledgerReference
    };

    store.transactions.unshift(successTx);

    // 3. Post double entry journal entries
    ledgerCore.postTransaction(successTx, true);

    // 4. Log immutable audit trail log
    store.logAudit(
      user.name,
      'FUNDING_TRANSACTION_SUCCESS',
      `Deposited $${amt.toFixed(2)} USD via ${fundingSource} successfully. Account credited. Gateway Ref: ${gatewayReference}, Ledger Ref: ${ledgerReference}, Idempotency Key: ${idempotencyKey}`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );

    return res.json({
      success: true,
      transaction: successTx,
      message: 'Direct posting settlement success. APP payment webhook successfully received. Wallet balance credited.'
    });
  });

  // 5. Create / Execute peer transfers
  app.post('/api/transactions', (req, res) => {
    const { type, senderId, receiverId, amount, description, category } = req.body;

    if (!type || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid transaction parameters. Fields "type" and positive "amount" are mandatory.' });
    }

    const value = Number(amount);
    const sender = senderId ? store.getUserById(senderId) : null;
    const receiver = receiverId ? store.getUserById(receiverId) : null;

    // MANDATORY KYC STATUS GATING CHECKS (Phase 5 rules)
    const activeCustomer = sender || receiver;
    if (activeCustomer && activeCustomer.role === 'customer' && activeCustomer.kycStatus !== 'APPROVED') {
      return res.status(403).json({
        error: `KYC_GATE_LOCKED: Complete the electronic KYC documentation and reach APPROVED status before initiating transfers or deposits. Current Status: ${activeCustomer.kycStatus}`
      });
    }

    const senderName = sender ? sender.name : 'Platform System Pool';
    const receiverName = receiver ? receiver.name : 'Platform Settlement System';

    // A. Sufficiency check for debit operations
    if (type !== 'DEPOSIT' && sender) {
      if (sender.balance < value) {
        auditLogger.log(
          sender.name,
          'INIT_TRANSACTION_FAILED',
          `Insufficient balance for ${type} attempt: $${value} requested but reserve has only $${sender.balance}.`,
          'FAILURE'
        );
        return res.status(400).json({ error: `Insufficient cash vault holdings. Sarah has $${sender.balance.toFixed(2)}, attempt failed.` });
      }
    }

    // B. Risk Core Verification
    const analysis = riskEngine.evaluateTransaction({
      senderId,
      receiverId,
      amount: value,
      type,
      description: description || 'No purpose declared',
      deviceId: req.body.deviceId || 'DEV-WEB-91',
      channel: req.body.channel || 'WEB'
    });

    const txId = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const tx: Transaction = {
      id: txId,
      date: new Date().toISOString(),
      amount: value,
      type,
      senderId,
      senderName,
      receiverId,
      receiverName,
      status: 'PENDING',
	  category: category || 'Other',
      description: description || 'No details provided',
      ledgerStatus: 'VOID_PENDING',
      channel: req.body.channel || 'WEB',
      deviceId: req.body.deviceId || 'DEV-WEB-91',
      riskScore: analysis.riskScore,
      riskReasons: analysis.riskReasons,
      gatewayRef: `GW-REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      ledgerRef: `LDG-REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    };

    // Handle DECISION - REJECT
    if (analysis.decision === 'REJECT') {
      tx.status = 'FAILED';
      tx.ledgerStatus = 'VOID';
      store.transactions.unshift(tx);

      auditLogger.log(
        senderName,
        'TX_RISK_REJECTED',
        `Transaction of $${value} blocked. Decision rule error: ${analysis.reason}`,
        'FAILURE'
      );

      return res.status(400).json({
        error: 'Secured compliance block engaged.',
        analysis,
        transaction: tx
      });
    }

    // Handle DECISION - FLAG (Pending reviews)
    if (analysis.decision === 'FLAG') {
      tx.status = 'FLAGGED';
      tx.ledgerStatus = 'VOID_PENDING';
      store.transactions.unshift(tx);

      // Trigger automatic alerts of compliance
      for (const alertCode of analysis.alertsTriggered) {
        riskEngine.triggerComplianceAlert(
          txId,
          alertCode,
          analysis.reason,
          analysis.riskCategory === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          senderId || receiverId || 'SYSTEM',
          senderName || receiverName
        );
      }

      auditLogger.log(
        senderName,
        'TX_RISK_FLAGGED',
        `Compliance custody hold. Transaction of $${value} captured under surveillance. Reason: ${analysis.reason}`,
        'WARNING'
      );

      return res.status(200).json({
        warning: 'Surveillance hold triggered.',
        analysis,
        transaction: tx
      });
    }

    // Handle DECISION - APPROVE (Ledger cleared successfully)
    if (analysis.decision === 'APPROVE') {
      // Execute live balances adjustments
      if (sender && (type === 'WITHDRAWAL' || type === 'TRANSFER')) {
        sender.balance -= value;
      }
      if (receiver && (type === 'DEPOSIT' || type === 'TRANSFER')) {
        receiver.balance += value;
      }

      tx.status = 'COMPLETED';
      tx.ledgerStatus = 'POSTED';
      store.transactions.unshift(tx);

      // Post standard double entry journals
      ledgerCore.postTransaction(tx, true);

      auditLogger.log(
        senderName,
        'TX_EXECUTION_COMPLETED',
        `Journal clearing success. Pushed $${value} to double entry accounting ledger system.`,
        'SUCCESS'
      );

      return res.json({
        success: true,
        analysis,
        transaction: tx
      });
    }

    res.status(500).json({ error: 'Unrecognized decision outcome.' });
  });

  // 6. Support system
  app.get('/api/support', (req, res) => {
    res.json(store.supportTickets);
  });

  app.post('/api/support', (req, res) => {
    const { userId, subject, message, category, priority } = req.body;
    if (!userId || !subject || !message) {
      return res.status(400).json({ error: 'Mandatory fields subject, message or author mismatch.' });
    }

    const user = store.getUserById(userId);
    const userName = user ? user.name : 'Unknown User';

    const newTicket = {
      id: `tkt-${Date.now()}`,
      userId,
      userName,
      subject,
      message,
      category: category || 'OTHER',
      status: 'OPEN' as const,
      priority: priority || 'MEDIUM',
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderName: userName,
          senderRole: 'customer' as const,
          text: message,
          timestamp: new Date().toISOString()
        }
      ]
    };

    store.supportTickets.unshift(newTicket);
    auditLogger.log(userName, 'CREATE_SUPPORT_TICKET', `Customer launched new support report: "${subject}"`, 'SUCCESS');
    res.json(newTicket);
  });

  // Reply message inside ticket
  app.post('/api/support/:id/message', (req, res) => {
    const { senderName, senderRole, text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Message body cannot be empty.' });
    }

    if (senderRole === 'admin') {
      const sess = getSessionFromReq(req);
      if (!sess) {
        return res.status(401).json({ error: 'Unauthorized: Session is missing or has expired.' });
      }
      if (sess.role !== 'Super Admin' && sess.role !== 'Support Agent' && sess.role !== 'Operations Officer' && sess.role !== 'Compliance Analyst' && sess.role !== 'Risk Manager') {
        const callerName = store.getUserById(sess.userId)?.name || 'Unknown Operator';
        store.logAudit(
          callerName,
          'ACCESS_DENIED_SUPPORT_REPLY',
          `Support response blocked: Role ${sess.role} lacks core helpdesk privileges.`,
          'FAILURE',
          req.ip || '127.0.0.1'
        );
        return res.status(403).json({ error: `Access Denied: Role ${sess.role} does not have support overrides privileges.` });
      }
    }

    const ticket = store.supportTickets.find(t => t.id === req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Support file not found.' });
    }

    const newMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      senderName: senderName || 'Operator',
      senderRole: senderRole || 'admin',
      text,
      timestamp: new Date().toISOString()
    };

    ticket.messages.push(newMessage);
    ticket.status = senderRole === 'customer' ? 'IN_PROGRESS' : 'CLOSED';

    auditLogger.log(
      senderName || 'Staff member',
      'REPLY_SUPPORT_TICKET',
      `Message posted on ticket ${ticket.id}. Status set to: ${ticket.status}`,
      'SUCCESS'
    );

    // If client requested or customer sent, auto reply with AI copilot after 1 second
    if (senderRole === 'customer') {
      setTimeout(async () => {
        const query = `Customer wrote the following support request under category ${ticket.category}: "${text}". Please write a helpful response in matching context.`;
        try {
          const aiResponse = await askFinanceAssistant(query, ticket.userId);
          ticket.messages.push({
            id: `msg-ai-${Date.now()}`,
            senderName: 'Compliance AI Agent',
            senderRole: 'ai',
            text: aiResponse.text,
            timestamp: new Date().toISOString()
          });
          ticket.status = 'IN_PROGRESS';
        } catch (err) {
          console.error(err);
        }
      }, 100);
    }

    res.json(ticket);
  });

  // 7. KYC compliance admin routes
  app.get('/api/kyc', (req, res) => {
    res.json(store.kycCases);
  });

  // Submit customer KYC onboarding sequence
  app.post('/api/kyc/submit', (req, res) => {
    const user = getActiveUserFromReq(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: No active session found.' });
    }

    const { 
      legalName, 
      dob, 
      country, 
      address, 
      occupation, 
      sourceOfFunds, 
      documentType, 
      simulatedOutcome 
    } = req.body;

    if (!legalName || !dob || !country || !address || !documentType || !simulatedOutcome) {
      return res.status(400).json({ error: 'Missing mandatory E-KYC onboarding variables.' });
    }

    // Update customer status based on simulation outcome
    let finalStatus: 'APPROVED' | 'PENDING' | 'REJECTED' = 'PENDING';
    if (simulatedOutcome === 'APPROVED') finalStatus = 'APPROVED';
    if (simulatedOutcome === 'REJECTED') finalStatus = 'REJECTED';

    const nextCaseId = `kyc-${Date.now()}`;
    const newCase: KYCCase = {
      id: nextCaseId,
      userId: user.id,
      userName: legalName,
      userEmail: user.email,
      documentType: documentType as 'PASSPORT' | 'DRIVERS_LICENSE' | 'NATIONAL_ID',
      submissionDate: new Date().toISOString(),
      status: finalStatus,
      riskScore: simulatedOutcome === 'APPROVED' ? 8 : (simulatedOutcome === 'REJECTED' ? 95 : 55),
      notes: simulatedOutcome === 'APPROVED' 
        ? 'Automatic verification passed. OCR matches identity databases.' 
        : (simulatedOutcome === 'REJECTED' 
            ? 'Automatic check failed. Document is expired or flagged in fraud database.' 
            : 'Blurry document text. Placed in review queue for compliance clearance.')
    };

    // Update user profile properties
    user.kycStatus = finalStatus;
    
    // Log details as audits
    store.logAudit(
      user.name,
      'KYC_SUBMISSION',
      `Onboarding E-KYC credentials submitted. Legal Name: ${legalName}, DOB: ${dob}, Country: ${country}, Occupation: ${occupation}, Source: ${sourceOfFunds}, Document: ${documentType}`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );

    if (finalStatus === 'APPROVED') {
      store.logAudit(
        'SYSTEM_OCR',
        'KYC_APPROVED',
        `Sovereign customer ${legalName} identity was APPROVED automatically via pattern recognition.`,
        'SUCCESS',
        req.ip || '127.0.0.1'
      );
    } else if (finalStatus === 'REJECTED') {
      store.logAudit(
        'SYSTEM_OCR',
        'KYC_REJECTED',
        `Verification flagged expired document. Reject customer ${legalName} session. Status: REJECTED.`,
        'WARNING',
        req.ip || '127.0.0.1'
      );
    } else {
      store.logAudit(
        'SYSTEM_ROUTING',
        'KYC_ROUTED_TO_MANUAL',
        `Onboarding application for ${legalName} has been routed to manual review queue due to unclear document scan simulation. Status: PENDING.`,
        'WARNING',
        req.ip || '127.0.0.1'
      );
    }

    // Insert into the database
    store.kycCases.unshift(newCase);

    res.json({ success: true, user, kycCase: newCase });
  });

  app.post('/api/kyc/:id/verify', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      return res.status(401).json({ error: 'Unauthorized: Session is missing or has expired.' });
    }

    if (sess.role !== 'Super Admin' && sess.role !== 'Compliance Analyst' && sess.role !== 'Operations Officer' && sess.role !== 'Risk Manager') {
      if (sess.role === 'Finance Officer') {
        if (!store.allowFinanceOfficerKycApproval) {
          store.logAudit(
            'Devin Finch (Finance)',
            'ACCESS_DENIED_KYC',
            `Denied KYC verification: Finance Officer does not have approval clearance unless explicitly enabled by Super Admin settings.`,
            'FAILURE',
            req.ip || '127.0.0.1'
          );
          return res.status(403).json({ error: 'Access Denied: Finance Officer lacks approval clearance unless explicitly enabled by Super Admin settings.' });
        }
      } else {
        const callerName = store.getUserById(sess.userId)?.name || 'Unknown Operator';
        store.logAudit(
          callerName,
          'ACCESS_DENIED_KYC',
          `Denied KYC verification: Role ${sess.role} does not have clearance.`,
          'FAILURE',
          req.ip || '127.0.0.1'
        );
        return res.status(403).json({ error: `Access Denied: Role ${sess.role} lacks manual clearance to verify customer KYC documents.` });
      }
    }

    const kyc = store.kycCases.find(k => k.id === req.params.id);
    if (!kyc) {
      return res.status(404).json({ error: 'KYC application file not found.' });
    }

    const { status, notes, adminName } = req.body;
    if (!status || (status !== 'APPROVED' && status !== 'REJECTED' && status !== 'ESCALATED' && status !== 'PENDING_INFO')) {
      return res.status(400).json({ error: 'Valid verification status required (APPROVED, REJECTED, ESCALATED, or PENDING_INFO).' });
    }

    kyc.status = status;
    kyc.notes = notes || kyc.notes;

    // Update user's profile status mapping
    const user = store.getUserById(kyc.userId);
    if (user) {
      user.kycStatus = status;
    }

    auditLogger.log(
      adminName || 'Chief Risk Officer',
      'RESOLVE_KYC_CASE',
      `KYC submission file ${kyc.id} for ${kyc.userName} was manually ${status}. Notes: "${notes || 'None'}"`,
      status === 'APPROVED' ? 'SUCCESS' : 'WARNING'
    );

    res.json(kyc);
  });

  // 8. Compliance alerts
  app.get('/api/compliance', (req, res) => {
    res.json(store.complianceAlerts);
  });

  app.post('/api/compliance/:id/update-workflow', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      return res.status(401).json({ error: 'Unauthorized: Session is missing or has expired.' });
    }

    if (sess.role !== 'Super Admin' && sess.role !== 'Compliance Analyst' && sess.role !== 'Risk Manager') {
      const callerName = store.getUserById(sess.userId)?.name || 'Unknown Operator';
      store.logAudit(
        callerName,
        'ACCESS_DENIED_COMPLIANCE_WORKFLOW',
        `Access Log Blocked: User with role ${sess.role} tried to update AML compliance case workflow.`,
        'FAILURE',
        req.ip || '127.0.0.1'
      );
      return res.status(403).json({ error: `Access Denied: Role ${sess.role} does not have compliance authorities.` });
    }

    const alert = store.complianceAlerts.find(a => a.id === req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Compliance warning document not found.' });
    }

    const { status, assignedTo, notes, adminName, holdReleaseAction } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Missing target workflow status.' });
    }
    if (!notes || notes.trim() === '') {
      return res.status(400).json({ error: 'Compliance case decisions require notes/reason code.' });
    }

    const operatorName = adminName || store.getUserById(sess.userId)?.name || 'Risk Reviewer';
    const previousStatus = alert.status;

    // Update status
    alert.status = status;
    if (assignedTo !== undefined) {
      alert.assignedTo = assignedTo;
    }
    alert.reviewerNotes = notes;
    alert.reviewerName = operatorName;

    if (status === 'CLOSED_FALSE_POSITIVE' || status === 'CLOSED_CONFIRMED_RISK') {
      alert.closedAt = new Date().toISOString();
    }

    // Initialize history if missing
    if (!alert.history) {
      alert.history = [];
      alert.history.push({
        timestamp: alert.timestamp,
        status: previousStatus,
        actor: 'SYSTEM',
        notes: 'Compliance case opened by enterprise risk engine.'
      });
    }

    alert.history.push({
      timestamp: new Date().toISOString(),
      status: status,
      actor: operatorName,
      notes: notes
    });

    // Handle transaction hold/release simulation
    if (alert.transactionId) {
      const tx = store.getTransactionById(alert.transactionId);
      if (tx) {
        if (holdReleaseAction === 'RELEASE') {
          if (tx.status === 'FLAGGED' || tx.status === 'PENDING') {
            const value = tx.amount;
            const sender = tx.senderId ? store.getUserById(tx.senderId) : null;
            const receiver = tx.receiverId ? store.getUserById(tx.receiverId) : null;

            if (sender && (tx.type === 'WITHDRAWAL' || tx.type === 'TRANSFER')) {
              sender.balance -= value;
            }
            if (receiver && (tx.type === 'DEPOSIT' || tx.type === 'TRANSFER')) {
              receiver.balance += value;
            }

            tx.status = 'COMPLETED';
            tx.ledgerStatus = 'POSTED';
            // Post matching double entry ledger entry
            ledgerCore.postTransaction(tx, true);

            store.logAudit(
              operatorName,
              'COMPLIANCE_HOLD_RELEASED',
              `Manual override released hold on transaction ${tx.id} of $${value}. Ledger balanced. Notes: ${notes}`,
              'SUCCESS',
              req.ip || '127.0.0.1'
            );
          }
        } else if (holdReleaseAction === 'VOID') {
          if (tx.status === 'FLAGGED' || tx.status === 'PENDING') {
            tx.status = 'FAILED';
            tx.ledgerStatus = 'VOID';

            store.logAudit(
              operatorName,
              'COMPLIANCE_HOLD_VOIDED',
              `Manual override cancelled transaction ${tx.id} for $${tx.amount}. Hold voided. Notes: ${notes}`,
              'WARNING',
              req.ip || '127.0.0.1'
            );
          }
        } else if (holdReleaseAction === 'HOLD') {
          tx.status = 'FLAGGED';
          tx.ledgerStatus = 'VOID_PENDING';

          store.logAudit(
            operatorName,
            'COMPLIANCE_HOLD_RE-ENGAGED',
            `Manual override updated transaction ${tx.id} to FLAGGED compliance custody. Notes: ${notes}`,
            'WARNING',
            req.ip || '127.0.0.1'
          );
        }
      }
    }

    // Direct audit logging
    store.logAudit(
      operatorName,
      'AML_CASE_TRANSITION',
      `AML case ${alert.id} status changed from ${previousStatus} to ${status}. Details: ${notes}`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );

    res.json(alert);
  });

  app.post('/api/compliance/:id/resolve', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      return res.status(401).json({ error: 'Unauthorized: Session is missing or has expired.' });
    }

    if (sess.role !== 'Super Admin' && sess.role !== 'Compliance Analyst' && sess.role !== 'Risk Manager') {
      const callerName = store.getUserById(sess.userId)?.name || 'Unknown Operator';
      store.logAudit(
        callerName,
        'ACCESS_DENIED_COMPLIANCE_RESOLVE',
        `Access Log Blocked: User with role ${sess.role} tried to resolve alert hold.`,
        'FAILURE',
        req.ip || '127.0.0.1'
      );
      return res.status(403).json({ error: `Access Denied: Role ${sess.role} does not have authority to override risk compliance holds.` });
    }

    const alert = store.complianceAlerts.find(a => a.id === req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Compliance warning document not found.' });
    }

    const { action, notes, adminName } = req.body; // action: 'APPROVE' (settles transaction) or 'DISMISS' (voids transaction)
    if (!action || (action !== 'APPROVE' && action !== 'DISMISS')) {
      return res.status(400).json({ error: 'Specify clear action resolution: "APPROVE" or "DISMISS".' });
    }

    alert.status = action === 'APPROVE' ? 'RESOLVED' : 'DISMISSED';

    // If related transaction is present, resolve its lifecycle state
    if (alert.transactionId) {
      const tx = store.getTransactionById(alert.transactionId);
      if (tx && tx.status === 'FLAGGED') {
        if (action === 'APPROVE') {
          // Clear holding state and subtract/add actual balances
          const value = tx.amount;
          const sender = tx.senderId ? store.getUserById(tx.senderId) : null;
          const receiver = tx.receiverId ? store.getUserById(tx.receiverId) : null;

          if (sender && (tx.type === 'WITHDRAWAL' || tx.type === 'TRANSFER')) {
            sender.balance -= value;
          }
          if (receiver && (tx.type === 'DEPOSIT' || tx.type === 'TRANSFER')) {
            receiver.balance += value;
          }

          tx.status = 'COMPLETED';
          tx.ledgerStatus = 'POSTED';

          // Post matching ledger entry
          ledgerCore.postTransaction(tx, true);

          auditLogger.log(
            adminName || 'Risk Operator',
            'RESOLVE_COMPLIANCE_ALERT',
            `Approved flagged transfer ${tx.id} for $${value}. Released funds from holding block.`,
            'SUCCESS'
          );
        } else {
          // Cancel flagged transfer completely
          tx.status = 'FAILED';
          tx.ledgerStatus = 'VOID';

          auditLogger.log(
            adminName || 'Risk Operator',
            'RESOLVE_COMPLIANCE_ALERT',
            `Cancelled and voided flagged transfer ${tx.id} for $${tx.amount.toFixed(2)}. Return void state.`,
            'WARNING'
          );
        }
      }
    } else {
      auditLogger.log(
        adminName || 'Risk Operator',
        'RESOLVE_COMPLIANCE_ALERT',
        `Risk alert ID ${alert.id} resolved manually as ${alert.status}. Notes: "${notes || 'No notes'}"`,
        'SUCCESS'
      );
    }

    res.json(alert);
  });

  // 9. Central Accounting Journals/Proof
  app.get('/api/ledger', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      return res.status(401).json({ error: 'Unauthorized: Active backoffice session is mandatory.' });
    }

    if (sess.role !== 'Super Admin' && sess.role !== 'Finance Officer' && sess.role !== 'Risk Manager' && sess.role !== 'Compliance Analyst' && sess.role !== 'Executive Viewer') {
      const callerName = store.getUserById(sess.userId)?.name || 'Unknown Operator';
      store.logAudit(
        callerName,
        'ACCESS_DENIED_LEDGER_VIEW',
        `Solvency audit clearance blocked: Role ${sess.role} lacks permission to inspect double-entry corporate holdings.`,
        'FAILURE',
        req.ip || '127.0.0.1'
      );
      return res.status(403).json({ error: 'Access Denied: You do not have permissions to view double-entry platform solvency ledgers.' });
    }

    // Sync current balance journals
    ledgerCore.rebuildLedgerFromTransactions();

    const integrityResult = ledgerCore.verifyIntegrity();
    const platformReserves = ledgerCore.getPlatformReserves();
    const platformLiabilities = ledgerCore.getTotalUserLiability();

    res.json({
      verdict: integrityResult,
      entries: ledgerCore.getEntries(),
      stats: {
        platformReserves,
        platformLiabilities,
        netEquityRatio: (platformReserves / platformLiabilities).toFixed(2),
        reserveHealthPercent: Math.min(((platformReserves - platformLiabilities) / platformLiabilities) * 100, 100).toFixed(1)
      }
    });
  });

  // central backend endpoints for Payments, Settlements, Reconciliation and Finance Revenue modules
  app.get('/api/finance/stats', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      return res.status(401).json({ error: 'Unauthorized: Backoffice credentials required.' });
    }

    const permittedRoles = ['Super Admin', 'Finance Officer', 'Finance Manager', 'Risk Manager', 'Executive Viewer'];
    if (!permittedRoles.includes(sess.role)) {
      return res.status(403).json({ error: 'Access Denied: Lacking clearance to view settlements/fees data.' });
    }

    // Settlements aggregations
    const completedSettlements = financeCore.settlements.filter(s => s.status === 'COMPLETED');
    const pendingSettlements = financeCore.settlements.filter(s => s.status === 'PENDING');
    const failedSettlements = financeCore.settlements.filter(s => s.status === 'FAILED');

    const totalSettlementsAmount = financeCore.settlements.reduce((acc, s) => acc + s.amount, 0);
    const completedAmount = completedSettlements.reduce((acc, s) => acc + s.amount, 0);
    const pendingAmount = pendingSettlements.reduce((acc, s) => acc + s.amount, 0);
    const failedAmount = failedSettlements.reduce((acc, s) => acc + s.amount, 0);

    // Compute transaction fees & revenue from stored transactions
    // fee = 1.5% of completed transaction amounts
    const completedTxs = store.transactions.filter(t => t.status === 'COMPLETED');
    const transactionFees = completedTxs.reduce((acc, t) => acc + (t.amount * 0.015), 0);
    
    // For gross revenue we use transaction fees plus some markup from subscriptions or interest
    const grossRevenue = transactionFees * 1.5;

    // Refunds are calculated as the total of approved REVERSAL type adjustments
    const approvedRefunds = financeCore.adjustments
      .filter(a => a.status === 'APPROVED' && a.type === 'REVERSAL')
      .reduce((acc, a) => acc + a.amount, 0);

    const chargebacksPlaceholder = financeCore.chargebacksPlaceholder;
    const netRevenue = Math.max(0, grossRevenue - approvedRefunds - chargebacksPlaceholder);

    // Reconciliation rate calculation matching total comparisons
    const comparisons = financeCore.performReconciliation();
    const matchedCount = comparisons.filter(c => c.comparisonVerdict === 'MATCHED').length;
    const reconRate = comparisons.length > 0 ? (matchedCount / comparisons.length) * 100 : 92.5;

    res.json({
      settlements: {
        completed: { count: completedSettlements.length, amount: completedAmount },
        pending: { count: pendingSettlements.length, amount: pendingAmount },
        failed: { count: failedSettlements.length, amount: failedAmount },
        gatewayStatus: 'OPERATIONAL',
        reconciliationRate: parseFloat(reconRate.toFixed(1))
      },
      revenue: {
        transactionFees: parseFloat(transactionFees.toFixed(2)),
        grossRevenue: parseFloat(grossRevenue.toFixed(2)),
        refunds: parseFloat(approvedRefunds.toFixed(2)),
        chargebacksPlaceholder: parseFloat(chargebacksPlaceholder.toFixed(2)),
        netRevenue: parseFloat(netRevenue.toFixed(2))
      }
    });
  });

  app.get('/api/finance/reconciliation', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) return res.status(401).json({ error: 'Unauthorized.' });

    const permittedRoles = ['Super Admin', 'Finance Officer', 'Finance Manager', 'Risk Manager', 'Executive Viewer'];
    if (!permittedRoles.includes(sess.role)) {
      return res.status(403).json({ error: 'Access Denied.' });
    }

    const items = financeCore.performReconciliation();
    res.json({
      items,
      reconciliationActive: financeCore.reconciliationActive,
      gatewayTotal: financeCore.gatewayRecords.reduce((acc, r) => acc + r.amount, 0),
      internalTotal: store.transactions.filter(t => t.gatewayRef).reduce((acc, t) => acc + t.amount, 0)
    });
  });

  app.post('/api/finance/reconciliation/run', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) return res.status(401).json({ error: 'Unauthorized (No Session)' });

    if (sess.role !== 'Finance Officer' && sess.role !== 'Super Admin' && sess.role !== 'Finance Manager' && sess.role !== 'Risk Manager') {
      return res.status(403).json({ error: 'Access Denied: Unauthorised role cannot trigger ledger comparisons.' });
    }

    const items = financeCore.performReconciliation();
    const operatorName = store.getUserById(sess.userId)?.name || 'Finance Specialist';

    store.logAudit(
      operatorName,
      'FINANCE_RECONCILIATION_RUN',
      `Manual reconciliation suite ran successfully comparing internal balances vs mock central clearing file. Resolution rate: ${((items.filter(i => i.comparisonVerdict === 'MATCHED').length / items.length) * 100).toFixed(1)}%`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );

    res.json({ success: true, items });
  });

  app.get('/api/finance/exceptions', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) return res.status(401).json({ error: 'Unauthorized.' });

    const permittedRoles = ['Super Admin', 'Finance Officer', 'Finance Manager', 'Risk Manager', 'Executive Viewer'];
    if (!permittedRoles.includes(sess.role)) return res.status(403).json({ error: 'Access Denied.' });

    res.json(financeCore.getExceptions());
  });

  app.get('/api/finance/adjustments', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) return res.status(401).json({ error: 'Unauthorized.' });

    const permittedRoles = ['Super Admin', 'Finance Officer', 'Finance Manager', 'Risk Manager', 'Executive Viewer'];
    if (!permittedRoles.includes(sess.role)) return res.status(403).json({ error: 'Access Denied.' });

    res.json(financeCore.adjustments);
  });

  app.post('/api/finance/adjustments/propose', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) return res.status(401).json({ error: 'Unauthorized.' });

    const { transactionId, type, amount, notes } = req.body;
    if (!type || !amount || !notes || notes.trim() === '') {
      return res.status(450).json({ error: 'Please provide type, amount, and explanatory notes/reason codes.' });
    }

    const permittedRoles = ['Super Admin', 'Finance Officer', 'Finance Manager', 'Risk Manager'];
    if (!permittedRoles.includes(sess.role)) {
      return res.status(403).json({ error: 'Access Denied: Role is unauthorised to propose financial ledger adjustments.' });
    }

    const operatorName = store.getUserById(sess.userId)?.name || 'Finance Proposer';

    const newAdjustment: any = {
      id: `adj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      transactionId,
      proposedBy: `${operatorName} (${sess.role})`,
      notes,
      type,
      amount: parseFloat(amount),
      status: 'PENDING_APPROVAL',
      timestamp: new Date().toISOString()
    };

    financeCore.adjustments.unshift(newAdjustment);

    store.logAudit(
      operatorName,
      'FINANCE_ADJUSTMENT_PROPOSED',
      `Proposed ${type} of $${parseFloat(amount).toFixed(2)} on reference ${transactionId || 'None'}. Reason: ${notes}`,
      'WARNING',
      req.ip || '127.0.0.1'
    );

    res.json(newAdjustment);
  });

  app.post('/api/finance/adjustments/:id/approve', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) return res.status(401).json({ error: 'Unauthorized.' });

    const { action, feedback } = req.body;
    if (!action) return res.status(400).json({ error: 'Action parameter (APPROVE/REJECT) is required.' });

    // CRITICAL RBAC ENFORCEMENT: ONLY Super Admin or Finance Manager can approve adjustments/reversals
    if (sess.role !== 'Super Admin' && sess.role !== 'Finance Manager') {
      const operatorName = store.getUserById(sess.userId)?.name || 'Unauthorised user';
      store.logAudit(
        operatorName,
        'FINANCE_APPROVAL_DENIED',
        `Access Log Blocked: User with role ${sess.role} attempted to authorize financial ledger adjustments without proper clearance level.`,
        'FAILURE',
        req.ip || '127.0.0.1'
      );
      return res.status(403).json({ error: 'Access Denied: Only Super Admin or Finance Manager roles hold central authorization clearance to clear ledger adjustments and reversals.' });
    }

    const adj = financeCore.adjustments.find(a => a.id === req.params.id);
    if (!adj) return res.status(404).json({ error: 'Adjustment request file not found.' });

    if (adj.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Adjustment request is already resolved.' });
    }

    const approverName = store.getUserById(sess.userId)?.name || 'Finance Approver';

    if (action === 'REJECT') {
      adj.status = 'REJECTED';
      adj.approvedBy = `${approverName} (${sess.role})`;
      adj.approvedAt = new Date().toISOString();
      adj.notes += ` [REJECTED FEEDBACK: ${feedback || 'Rejected'}]`;

      store.logAudit(
        approverName,
        'FINANCE_ADJUSTMENT_REJECTED',
        `Rejected ${adj.type} adjustment ${adj.id} of $${adj.amount.toFixed(2)}. Feedback: ${feedback || 'None'}`,
        'WARNING',
        req.ip || '127.0.0.1'
      );

      return res.json(adj);
    }

    // Action is APPROVE
    adj.status = 'APPROVED';
    adj.approvedBy = `${approverName} (${sess.role})`;
    adj.approvedAt = new Date().toISOString();
    adj.notes += ` [APPROVED SYSTEM CLEARANCE: ${feedback || 'No additional comment'}]`;

    // Process Ledger Impact for approved transaction REVERSAL
    if (adj.type === 'REVERSAL' && adj.transactionId) {
      const originalTx = store.getTransactionById(adj.transactionId);
      if (originalTx) {
        // Build reversal transaction preserving original transaction
        const revTxId = `tx-rev-${Math.floor(Date.now() / 1000)}`;
        const reversalTx: Transaction = {
          id: revTxId,
          date: new Date().toISOString(),
          amount: originalTx.amount,
          type: originalTx.type, // matching original type to balance ledger postings
          senderId: originalTx.receiverId, // flipped
          senderName: originalTx.receiverName,
          receiverId: originalTx.senderId, // flipped
          receiverName: originalTx.senderName,
          status: 'COMPLETED',
          category: 'Reversal',
          description: `REVERSAL OF JOURNAL #{${originalTx.id}}: ${adj.notes}`,
          ledgerStatus: 'POSTED',
          channel: originalTx.channel || 'WEB',
          deviceId: 'SYSTEM-REVERSAL-ENGINE',
          riskScore: 0,
          riskReasons: ['REVERSAL_LEDGER_POSTING'],
          gatewayRef: `GW-REV-${originalTx.gatewayRef || 'UNKNOWN'}`,
          ledgerRef: `LDG-REV-${originalTx.ledgerRef || 'UNKNOWN'}`
        };

        // Inject original ledger status as VOID/REVERSED but keeping the transaction in list, then push the reversal entry
        originalTx.ledgerStatus = 'VOID';
        store.transactions.unshift(reversalTx);

        // Account balancing: Update physical User profiles
        const value = originalTx.amount;
        if (originalTx.type === 'TRANSFER') {
          const originalSender = originalTx.senderId ? store.getUserById(originalTx.senderId) : null;
          const originalReceiver = originalTx.receiverId ? store.getUserById(originalTx.receiverId) : null;

          if (originalSender) originalSender.balance += value; // refund sender
          if (originalReceiver) originalReceiver.balance -= value; // clawback recipient

        } else if (originalTx.type === 'DEPOSIT') {
          const originalReceiver = originalTx.receiverId ? store.getUserById(originalTx.receiverId) : null;
          if (originalReceiver) originalReceiver.balance -= value; // clawback deposit

        } else if (originalTx.type === 'WITHDRAWAL') {
          const originalSender = originalTx.senderId ? store.getUserById(originalTx.senderId) : null;
          if (originalSender) originalSender.balance += value; // refund withdrawal
        }

        // Post the reversal double-entry ledger entry
        ledgerCore.postTransaction(reversalTx, true);

        store.logAudit(
          approverName,
          'FINANCE_REVERSAL_POSTED',
          `Manual reversal transaction ${revTxId} ($${value.toFixed(2)}) posted successfully reversing original journal ${originalTx.id}. User balances balanced out in real time.`,
          'SUCCESS',
          req.ip || '127.0.0.1'
        );
      }
    } else {
      // General Adjustment or Fee Waiver Audit Log
      store.logAudit(
        approverName,
        'FINANCE_FEE_ADJUSTMENT_COMPLETED',
        `Approved ${adj.type} of amount $${adj.amount.toFixed(2)} with description: ${adj.notes}`,
        'SUCCESS',
        req.ip || '127.0.0.1'
      );
    }

    res.json(adj);
  });

  // 10. Audit ledger history logs
  app.get('/api/audit', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      return res.status(401).json({ error: 'Unauthorized: Log in to inspect telemetry files.' });
    }

    if (sess.role === 'Support Agent' || sess.role === 'customer') {
      const callerName = store.getUserById(sess.userId)?.name || 'Unknown Operator';
      store.logAudit(
        callerName,
        'ACCESS_DENIED_AUDIT_VIEW',
        `Audit tracking logs blocked: Role ${sess.role} lacks credentials to inspect immutable system telemetry.`,
        'FAILURE',
        req.ip || '127.0.0.1'
      );
      return res.status(403).json({ error: 'Access Denied: This role lacks credentials to inspect immutable system telemetry.' });
    }

    res.json(auditLogger.getLogs());
  });

  // Admin user update endpoint for Phase 13 user detail changes
  app.post('/api/users/:id/update', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      return res.status(401).json({ error: 'Unauthorized: Session is missing or has expired.' });
    }
    const user = store.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    const { riskTier, cardStatus } = req.body;
    const oldTier = user.riskTier;
    const oldStatus = user.cardStatus;
    
    if (riskTier) user.riskTier = riskTier;
    if (cardStatus) user.cardStatus = cardStatus;
    
    const callerName = store.getUserById(sess.userId)?.name || 'Unknown Operator';
    store.logAudit(
      callerName,
      'USER_PROFILE_UPDATE',
      `Manual audit change on client ${user.name} (${user.id}): Risk tier changed from ${oldTier} to ${user.riskTier}, card/wallet status from ${oldStatus} to ${user.cardStatus}`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );
    res.json({ success: true, user });
  });

  // Admin manual audit creation endpoint for sensitive field reveal events
  app.post('/api/audit/create', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      return res.status(401).json({ error: 'Unauthorized: Session is missing or has expired.' });
    }
    const { action, details, status } = req.body;
    const callerName = store.getUserById(sess.userId)?.name || 'Unknown Operator';
    const log = store.logAudit(
      callerName,
      action || 'SENSITIVE_DATA_UNVEIL',
      details || 'Unveiled confidential record fields.',
      status || 'SUCCESS',
      req.ip || '127.0.0.1'
    );
    res.json({ success: true, log });
  });

  // --- CARD MANAGEMENT & SANDBOX ENDPOINTS (Phase 10) ---

  const deviceIdClaims = new Set<string>();

  app.get('/api/cards', (req, res) => {
    const user = getActiveUserFromReq(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Session is expired or missing.' });
    }

    let userCards = store.cards.filter(c => c.userId === user.id);

    if (userCards.length === 0) {
      const physicalCard: any = {
        id: `crd-phys-${Date.now()}`,
        userId: user.id,
        type: 'PHYSICAL',
        cardBrand: 'VISA',
        cardNumberMasked: user.cardNumber || `•••• •••• •••• 4821`,
        cardExpiryMasked: '12/••',
        cardCvvMasked: '•••',
        status: user.cardStatus || 'ACTIVE',
        dailyLimit: user.cardLimit || 2000,
        weeklyLimit: (user.cardLimit || 2000) * 3,
        monthlyLimit: (user.cardLimit || 2000) * 8
      };

      const virtualCard: any = {
        id: `crd-virt-${Date.now()}`,
        userId: user.id,
        type: 'VIRTUAL',
        cardBrand: 'MASTERCARD',
        cardNumberMasked: `•••• •••• •••• 8912`,
        cardExpiryMasked: '08/••',
        cardCvvMasked: '•••',
        status: 'ACTIVE',
        dailyLimit: 1000,
        weeklyLimit: 3000,
        monthlyLimit: 10000
      };

      store.cards.push(physicalCard, virtualCard);
      userCards = [physicalCard, virtualCard];
    }

    res.json(userCards);
  });

  app.put('/api/cards/:cardId/status', (req, res) => {
    const user = getActiveUserFromReq(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Session expired.' });
    }

    const { status } = req.body;
    if (!status || !['ACTIVE', 'FROZEN', 'BLOCKED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid card status provided.' });
    }

    const card = store.cards.find(c => c.id === req.params.cardId && c.userId === user.id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found.' });
    }

    const oldStatus = card.status;
    card.status = status;

    if (card.type === 'PHYSICAL') {
      user.cardStatus = status;
    }

    store.logAudit(
      user.name,
      'CARD_STATUS_UPDATE',
      `Card ${card.type} status changed from ${oldStatus} to ${status} (Card ID: ${card.id})`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );

    res.json({ success: true, card });
  });

  app.put('/api/cards/:cardId/limits', (req, res) => {
    const user = getActiveUserFromReq(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Session expired.' });
    }

    const { dailyLimit, weeklyLimit, monthlyLimit, mfaCode } = req.body;
    if (mfaCode !== '123456') {
      return res.status(400).json({ error: 'Simulated MFA Code verification failed.' });
    }

    if (dailyLimit === undefined || weeklyLimit === undefined || monthlyLimit === undefined) {
      return res.status(400).json({ error: 'Missing spending limit parameters.' });
    }

    const card = store.cards.find(c => c.id === req.params.cardId && c.userId === user.id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found.' });
    }

    card.dailyLimit = Number(dailyLimit);
    card.weeklyLimit = Number(weeklyLimit);
    card.monthlyLimit = Number(monthlyLimit);

    if (card.type === 'PHYSICAL') {
      user.cardLimit = Number(dailyLimit);
    }

    store.logAudit(
      user.name,
      'CARD_LIMITS_CHANGED',
      `Card spending limits adjusted. Daily: $${dailyLimit}, Weekly: $${weeklyLimit}, Monthly: $${monthlyLimit} (Card ID: ${card.id})`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );

    res.json({ success: true, card });
  });

  app.post('/api/cards/:cardId/pin-change', (req, res) => {
    const user = getActiveUserFromReq(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Session expired.' });
    }

    const { newPin, mfaCode } = req.body;
    if (mfaCode !== '123456') {
      return res.status(400).json({ error: 'Simulated MFA Code verification failed.' });
    }

    if (!newPin || newPin.length !== 4 || isNaN(Number(newPin))) {
      return res.status(400).json({ error: 'PIN must be a 4-digit number.' });
    }

    const card = store.cards.find(c => c.id === req.params.cardId && c.userId === user.id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found.' });
    }

    store.logAudit(
      user.name,
      'CARD_PIN_CHANGE',
      `PIN update successfully verified with secure multi-factor authentication (Card ID: ${card.id})`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );

    res.json({ success: true, message: 'Card PIN successfully changed with simulated MFA authorization' });
  });

  app.get('/api/cards/:cardId/statement', (req, res) => {
    const user = getActiveUserFromReq(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Session expired.' });
    }

    const card = store.cards.find(c => c.id === req.params.cardId && c.userId === user.id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found.' });
    }

    const cardTransactions = store.transactions.filter(tx => 
      (tx.senderId === user.id && tx.type === 'WITHDRAWAL') ||
      (tx.category && ['Utilities', 'Dining', 'Shopping', 'Travel', 'Health', 'Other'].includes(tx.category) && tx.senderId === user.id)
    );

    res.json(cardTransactions);
  });

  // --- REWARDS SYSTEM ENDPOINTS (Phase 10) ---

  app.get('/api/rewards', (req, res) => {
    const user = getActiveUserFromReq(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    let userReward = store.rewardPoints.find(r => r.userId === user.id);
    if (!userReward) {
      const initialReward: any = {
        userId: user.id,
        balance: 1250,
        referralCode: `${user.name.split(' ')[0].toUpperCase()}-APEX-${Math.floor(10 + Math.random() * 89)}`,
        referralsClaimed: []
      };
      store.rewardPoints.push(initialReward);
      userReward = initialReward;
    }

    const history = store.rewardTransactions.filter(rt => rt.userId === user.id);
    const offers = store.rewardOffers;

    res.json({
      balance: userReward.balance,
      referralCode: userReward.referralCode,
      referralsClaimed: userReward.referralsClaimed,
      offers,
      history
    });
  });

  app.post('/api/rewards/redeem', (req, res) => {
    const user = getActiveUserFromReq(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { offerId } = req.body;
    const offer = store.rewardOffers.find(o => o.id === offerId);
    if (!offer) {
      return res.status(404).json({ error: 'Reward offer not found.' });
    }

    const userReward = store.rewardPoints.find(r => r.userId === user.id);
    if (!userReward || userReward.balance < offer.pointsCost) {
      return res.status(400).json({ error: 'Insufficient rewards points balance.' });
    }

    userReward.balance -= offer.pointsCost;

    const rtx: any = {
      id: `rtx-claim-${Date.now()}`,
      userId: user.id,
      date: new Date().toISOString(),
      points: -offer.pointsCost,
      type: 'REDEEMED',
      description: `Redeemed: ${offer.partnerName} (${offer.description})`
    };
    store.rewardTransactions.unshift(rtx);

    store.logAudit(
      user.name,
      'REWARD_REDEMPTION',
      `Redeemed ${offer.pointsCost} reward points for ${offer.partnerName} coupon ${offer.couponCode}`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );

    res.json({
      success: true,
      couponCode: offer.couponCode,
      newBalance: userReward.balance,
      transaction: rtx
    });
  });

  app.post('/api/rewards/referral', (req, res) => {
    const user = getActiveUserFromReq(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { email, deviceId } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid referee email address.' });
    }

    if (!deviceId) {
      return res.status(400).json({ error: 'Unique device parameters are required for compliance profiling.' });
    }

    if (deviceIdClaims.has(deviceId)) {
      const breachId = `al-abu-${Date.now()}`;
      store.complianceAlerts.unshift({
        id: breachId,
        userId: user.id,
        userName: user.name,
        type: 'VELOCITY_LIMIT',
        message: `Abusive Referral Pattern: Profile ${user.name} attempted multiple claims using device finger ${deviceId}. Closed referral channel.`,
        level: 'CRITICAL',
        status: 'OPEN',
        timestamp: new Date().toISOString()
      });

      store.logAudit(
        user.name,
        'PROMOTIONAL_REFERRAL_ABUSE',
        `Device ${deviceId} locked: Repeated referral claims from same terminal. Created Compliance hold on credit channels.`,
        'FAILURE',
        req.ip || '127.0.0.1'
      );

      return res.status(429).json({ 
        error: 'Abuse Flag: Duplicate referral submission detected from this terminal. To enforce promotion safety guidelines, this device has been restricted.' 
      });
    }

    deviceIdClaims.add(deviceId);

    let userReward = store.rewardPoints.find(r => r.userId === user.id);
    if (!userReward) {
      userReward = {
        userId: user.id,
        balance: 1000,
        referralCode: `${user.name.split(' ')[0].toUpperCase()}-APEX-99`,
        referralsClaimed: []
      };
      store.rewardPoints.push(userReward);
    }

    const pointsBonus = 1000;
    userReward.balance += pointsBonus;
    userReward.referralsClaimed.push({
      email,
      date: new Date().toISOString(),
      bonusPoints: pointsBonus
    });

    const rtx: any = {
      id: `rtx-ref-${Date.now()}`,
      userId: user.id,
      date: new Date().toISOString(),
      points: pointsBonus,
      type: 'EARND_REFERRAL',
      description: `Referred Friend: ${email}`
    };
    store.rewardTransactions.unshift(rtx);

    store.logAudit(
      user.name,
      'PROMOTIONAL_REFERRAL_GRANTED',
      `Referred friend ${email}. Credited +${pointsBonus} bonus points using device finger ${deviceId}`,
      'SUCCESS',
      req.ip || '127.0.0.1'
    );

    res.json({
      success: true,
      pointsAdded: pointsBonus,
      newBalance: userReward.balance,
      referralsClaimed: userReward.referralsClaimed
    });
  });

  // 11. AI finance advisor route (GenAI key integration)
  app.post('/api/ai/chat', async (req, res) => {
    const { prompt, contextUser } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt argument is required.' });
    }

    try {
      const result = await askFinanceAssistant(prompt, contextUser);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failure talking to internal assistant.' });
    }
  });

  app.post('/api/audit/clear', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess || sess.role !== 'Super Admin') {
      const callerName = sess ? (store.getUserById(sess.userId)?.name || 'Unknown Admin') : 'GUEST';
      store.logAudit(
        callerName,
        'ACCESS_DENIED_AUDIT_CLEAR',
        `Wipe attempt on audit journals blocked. Privilege level ${sess ? sess.role : 'None'}`,
        'FAILURE',
        req.ip || '127.0.0.1'
      );
      return res.status(403).json({ error: 'Access Denied: Clearing permanent logs strictly requires Super Admin clearance.' });
    }

    auditLogger.clearLogs();
    res.json({ success: true, message: 'Logs cleared.' });
  });

  // 12. Vite integration setup for development vs production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Dev-Mode] Vite compilation engine mounted.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`  FinTech Server active on node running on port ${PORT}!`);
    console.log(`  Serving environment behind reverse container proxies`);
    console.log(`===============================================`);
  });
}

startServer();
