// Express backend server for TeachWise MVP

require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
let AbortControllerCtor = global.AbortController;
try {
  if (!AbortControllerCtor) {
    AbortControllerCtor = require('abort-controller');
  }
} catch (_) {
  // If not available, timeouts won't work; requests may take longer.
}
let Razorpay;

const app = express();
const REQ_TIMEOUT_MS = parseInt(process.env.OPENAI_REQ_TIMEOUT_MS || '60000', 10);
const PORT = process.env.PORT || 3001;

// Enhanced CORS for GoDaddy deployment
const corsOptions = {
  origin: [
    'https://mpaiapps.godaddysites.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/out')));

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access denied. No token provided.' 
    });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid or expired token.' 
    });
  }
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
let rootSupabase = null;
if (!supabaseUrl || !supabaseKey) {
  console.warn('WARNING: Missing Supabase configuration (SUPABASE_URL / SUPABASE_SERVICE_KEY)');
} else {
  rootSupabase = createClient(supabaseUrl, supabaseKey);
  (async () => {
    try {
      const { error } = await rootSupabase.from('users').select('id').limit(1);
      if (error) throw error;
      console.log('✓ Supabase connection verified');
    } catch (err) {
      console.error('✗ Supabase connection failed:', err.message || err);
      process.exit(1);
    }
  })();
}

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
console.warn('WARNING: Missing OPENAI_API_KEY in environment');
}

// Razorpay setup (India)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_AMOUNT_INR = parseInt(process.env.RAZORPAY_AMOUNT_INR || '400', 10); // default ₹400
let razorpay = null;
try {
  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    Razorpay = require('razorpay');
    razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    console.log('✓ Razorpay payment gateway configured');
  } else {
    console.warn('INFO: Razorpay not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)');
  }
} catch (e) {
  console.warn('INFO: Razorpay SDK not installed. Run `npm i razorpay` to enable.', e?.message || '');
}

// Nodemailer setup (optional): used to send quizzes to student emails
let nodemailer = null;
let mailTransport = null;
try {
  nodemailer = require('nodemailer');
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpHost && smtpUser && smtpPass) {
    mailTransport = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser, pass: smtpPass } });
  } else {
    // If no SMTP configured, create a Nodemailer test account (Ethereal) for dev/testing
    console.warn('INFO: SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS) - falling back to Nodemailer test account (dev only)');
    nodemailer.createTestAccount().then((acct) => {
      mailTransport = nodemailer.createTransport({ host: acct.smtp.host, port: acct.smtp.port, secure: acct.smtp.secure, auth: { user: acct.user, pass: acct.pass } });
      // store preview account creds lightly for debugging
      console.log('Nodemailer test account created. Preview emails at https://ethereal.email/messages (use credentials below to sign in)');
      console.log({ user: acct.user, pass: acct.pass });
    }).catch((err) => {
      console.warn('Failed to create Nodemailer test account:', err?.message || err);
    });
  }
} catch (e) {
  console.warn('INFO: nodemailer not installed. Run `npm i nodemailer` to enable email sending.');
}


app.get('/health', (req, res) => res.json({ ok: true }));

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'TeachWise AI Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      generate: '/generate',
      trialStatus: '/trial-status',
      isPremium: '/is-premium'
    }
  });
});

// Razorpay webhook - also needs raw body BEFORE express.json()
app.post('/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!RAZORPAY_KEY_SECRET) return res.status(200).send('ok');
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body; // Buffer
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if (signature !== expected) {
      console.warn('Razorpay webhook signature mismatch');
      return res.status(400).send('invalid signature');
    }
    const event = JSON.parse(body.toString('utf8'));
    console.log('Razorpay event:', event.event);
    
    // Handle successful payment
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const userEmail = payment.notes?.userEmail;
      const userId = payment.notes?.userId;
      const packageId = payment.notes?.packageId;
      const amountPaid = Math.floor(payment.amount / 100); // Convert paise to rupees
      
      // Process credit purchase
      if (userId && packageId) {
        const PaymentManager = require('./utils/payment');
        const paymentManager = new PaymentManager(stripe, razorpay);
        
        await paymentManager.processPaymentSuccess(userId, packageId, {
          paymentId: payment.id,
          orderId: payment.order_id,
          gateway: 'razorpay',
        });
        
        console.log(`Added credits for user ${userId} from package ${packageId}, amount: ₹${amountPaid}`);
      }
      
      // Legacy: Update user's paid amount
      if (userEmail) {
        const user = userTrials.get(userEmail.toLowerCase()) || { registeredAt: new Date(), paidAmount: 0 };
        user.paidAmount += amountPaid;
        userTrials.set(userEmail.toLowerCase(), user);
        
        console.log(`User ${userEmail} paid ₹${amountPaid}. Total: ₹${user.paidAmount}`);
      }
    }
    
    res.status(200).send('ok');
  } catch (e) {
    console.error('Razorpay webhook error', e);
    res.status(200).send('ok');
  }
});

// Standard JSON body parser for the rest
app.use(express.json());

// Create Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const { priceId = STRIPE_PRICE_ID, customer_email } = req.body || {};
    if (!priceId) return res.status(400).json({ error: 'Missing priceId' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email,
      allow_promotion_codes: true,
      success_url: `${req.headers.origin || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:3000'}/cancel`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: 'Stripe error', detail: err.message });
  }
});

// Razorpay: Create flexible payment order (user chooses amount)
app.post('/create-razorpay-order', async (req, res) => {
  try {
    if (!razorpay) return res.status(503).json({ error: 'Razorpay not configured' });
    const { amount, currency = 'INR', receipt = `rcpt_${Date.now()}`, userEmail } = req.body || {};
    
    // Validate minimum amount (₹100)
    const amountInRupees = parseInt(amount, 10);
    if (!amountInRupees || amountInRupees < 100) {
      return res.status(400).json({ error: 'Minimum amount is ₹100' });
    }
    
    const amountInPaise = amountInRupees * 100;
    const order = await razorpay.orders.create({ 
      amount: amountInPaise, 
      currency, 
      receipt, 
      payment_capture: 1,
      notes: { userEmail: userEmail || '' }
    });
    
    return res.json({ 
      provider: 'razorpay', 
      key: RAZORPAY_KEY_ID, 
      orderId: order.id, 
      amount: order.amount, 
      currency: order.currency,
      userEmail 
    });
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.status(500).json({ error: 'Razorpay error', detail: err.message });
  }
});


app.post('/generate-slides', async (req, res) => {
try {
const { lessonContent, grade = '7', subject = 'Science', topic = 'Photosynthesis', minutes = 45 } = req.body;

if (!lessonContent) {
return res.status(400).json({ error: 'Lesson content is required' });
}

// Build prompt for slide generation
const prompt = `Convert the following lesson plan into 5-7 PowerPoint-style slides for Class ${grade} ${subject} on "${topic}".

LESSON PLAN:
${lessonContent}

Create slides with this EXACT JSON structure:
{
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title Here",
      "content": [
        "• First bullet point",
        "• Second bullet point",
        "• Third bullet point"
      ],
      "speakerNotes": "What the teacher should say or additional context for this slide"
    }
  ]
}

Guidelines:
- Slide 1: Title slide with lesson topic and objectives
- Slides 2-5: Main content slides covering key concepts
- Slide 6: Assessment/Summary slide
- Slide 7 (optional): Homework/Next steps
- Keep bullet points concise (max 6 words per bullet)
- Include engaging speaker notes for teachers
- Use clear, student-friendly language

Return ONLY the JSON structure, no additional text.`;

const payload = {
model: 'gpt-4o-mini',
messages: [
{ role: 'system', content: 'You are an expert educational presentation designer. Convert lesson plans into structured slide presentations with clear titles, concise bullet points, and helpful speaker notes. Always return valid JSON format only.' },
{ role: 'user', content: prompt }
],
max_tokens: 900,
temperature: 0.1
};

const controller = AbortControllerCtor ? new AbortControllerCtor() : { abort: () => {}, signal: undefined };
const timeout = setTimeout(() => controller.abort(), REQ_TIMEOUT_MS);
let r;
try {
  r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify(payload),
    signal: controller.signal
  });
} catch (e) {
  if (e.name === 'AbortError') {
    return res.status(504).json({ error: 'OpenAI request timed out. Please try again.' });
  }
  throw e;
} finally {
  clearTimeout(timeout);
}

if (!r.ok) {
const txt = await r.text();
console.error('OpenAI error', r.status, txt);
return res.status(500).json({ error: 'OpenAI API error', detail: txt });
}

const data = await r.json();
const content = data.choices?.[0]?.message?.content || '';

try {
// Parse the JSON response
const slideData = JSON.parse(content);
res.json(slideData);
} catch (parseError) {
console.error('JSON parse error:', parseError);
res.status(500).json({ error: 'Invalid response format', detail: content });
}
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Server error', detail: err.message });
}
});

// Database helper functions for user persistence
async function getUserFromDB(email) {
  if (!rootSupabase) return null;
  
  try {
    const { data, error } = await rootSupabase
      .from('user_trials')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching user from DB:', error);
      return null;
    }
    
    if (data) {
      return {
        registeredAt: new Date(data.registered_at),
        paidAmount: data.paid_amount || 0,
        credits: data.credits || 0,
        ipAddress: data.ip_address || null,
        trialUsed: data.trial_used || false
      };
    }
    
    return null;
  } catch (err) {
    console.error('Database error fetching user:', err);
    return null;
  }
}

// Check if IP address has already been used for a trial
async function checkIPTrialUsed(ipAddress) {
  if (!rootSupabase || !ipAddress || ipAddress === 'unknown') return false;
  
  try {
    const { data, error } = await rootSupabase
      .from('user_trials')
      .select('email, trial_used')
      .eq('ip_address', ipAddress)
      .eq('trial_used', true)
      .limit(1);
    
    if (error) {
      console.error('Error checking IP trial status:', error);
      return false;
    }
    
    // If we found a record with this IP where trial was used, return true
    if (data && data.length > 0) {
      console.log(`⚠️ IP ${ipAddress} has already used trial (email: ${data[0].email})`);
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('Database error checking IP trial:', err);
    return false;
  }
}

async function saveUserToDB(email, userData) {
  if (!rootSupabase) {
    console.warn('⚠️ Supabase not configured - user data saved to memory only');
    return false;
  }
  
  try {
    const { error } = await rootSupabase
      .from('user_trials')
      .upsert({
        email: email.toLowerCase(),
        registered_at: userData.registeredAt.toISOString(),
        paid_amount: userData.paidAmount || 0,
        credits: userData.credits || 0,
        ip_address: userData.ipAddress || null,
        trial_used: userData.trialUsed || false,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('❌ Error saving user to Supabase:', error.message);
      return false;
    }
    
    console.log(`✅ User saved to Supabase: ${email.toLowerCase()}`);
    return true;
  } catch (err) {
    console.error('Database error saving user:', err);
    return false;
  }
}

// --- Login tracking DB functions ---
async function saveLoginEventToDB(email, ip, userAgent) {
  if (!rootSupabase) return false;
  
  try {
    const { error } = await rootSupabase
      .from('user_logins')
      .insert({
        email: email,
        login_time: new Date().toISOString(),
        ip_address: ip || 'unknown',
        user_agent: userAgent || 'unknown'
      });
    
    if (error) {
      console.error('Error saving login event to DB:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Database error saving login event:', err);
    return false;
  }
}

async function loadRecentLoginsFromDB(limit = 100, emailFilter = null) {
  if (!rootSupabase) return [];
  
  try {
    let query = rootSupabase
      .from('user_logins')
      .select('*')
      .order('login_time', { ascending: false })
      .limit(limit);
    
    if (emailFilter) {
      query = query.eq('email', emailFilter);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error loading logins from DB:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Database error loading logins:', err);
    return [];
  }
}

async function loadAllUsersFromDB() {
  if (!rootSupabase) return new Map();
  
  try {
    const { data, error } = await rootSupabase
      .from('user_trials')
      .select('*');
    
    if (error) {
      console.error('Error loading users from DB:', error);
      return new Map();
    }
    
    const userMap = new Map();
    if (data) {
      data.forEach(row => {
        userMap.set(row.email, {
          registeredAt: new Date(row.registered_at),
          paidAmount: row.paid_amount || 0,
          credits: row.credits || 0
        });
      });
    }
    
    return userMap;
  } catch (err) {
    console.error('Database error loading users:', err);
    return new Map();
  }
}

// Load processed transactions from DB into memory set
async function loadProcessedTransactionsFromDB() {
  if (!rootSupabase) return new Set();
  try {
    const { data, error } = await rootSupabase
      .from('processed_transactions')
      .select('transaction_id')
      .limit(1000);

    if (error) {
      console.error('Error loading processed transactions from DB:', error.message || error);
      return new Set();
    }

    const txSet = new Set();
    if (data && Array.isArray(data)) {
      data.forEach(row => {
        if (row.transaction_id) txSet.add(row.transaction_id);
      });
    }
    return txSet;
  } catch (err) {
    console.error('Database error loading processed transactions:', err);
    return new Set();
  }
}

// Save a processed transaction record to DB (idempotent)
async function saveProcessedTransactionToDB(transactionId, email, amount, planType) {
  if (!rootSupabase) return false;
  try {
    const payload = {
      transaction_id: transactionId,
      email: email.toLowerCase(),
      amount: amount,
      plan_type: planType || null,
      created_at: new Date().toISOString()
    };

    const { error } = await rootSupabase
      .from('processed_transactions')
      .upsert(payload, { onConflict: ['transaction_id'] });

    if (error) {
      console.error('Error saving processed transaction to DB:', error.message || error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Database error saving processed transaction:', err);
    return false;
  }
}

// Enhanced user management with database persistence
async function getUser(email) {
  const normalizedEmail = email.toLowerCase();
  
  // Try memory first (cache)
  let user = userTrials.get(normalizedEmail);
  
  // If not in memory, try database
  if (!user) {
    user = await getUserFromDB(normalizedEmail);
    if (user) {
      // Cache in memory
      userTrials.set(normalizedEmail, user);
    }
  }
  
  return user;
}

async function setUser(email, userData) {
  const normalizedEmail = email.toLowerCase();
  
  // Update memory cache
  userTrials.set(normalizedEmail, userData);
  
  // Persist to database
  await saveUserToDB(normalizedEmail, userData);
}

// In-memory user store for credit tracking (now with DB persistence)
// Load existing users from database on startup
const userTrials = new Map(); // email -> { registeredAt: Date, paidAmount: number, credits: number }

// Track processed UPI transactions to prevent duplicates
const processedTransactions = new Set(); // Set of transaction IDs

// In-memory store for user login events
const userLogins = []; // Array of { email, timestamp, ip, userAgent }

// Credit system constants
const CREDITS_CONFIG = {
  FREE_TRIAL_CREDITS: 100,           // 100 free credits for new users
  CREDITS_PER_GENERATE: 10,          // 10 credits deducted per generate click
  TRIAL_PERIOD_MINUTES: 20,          // 20-minute trial period
  PRICE_PER_CREDIT: 1,               // ₹1 per credit (₹100 = 100 credits)
};

// Initialize database on startup
async function initializeDatabase() {
  if (!rootSupabase) {
    console.warn('⚠️ Supabase not configured - using memory-only storage');
    return;
  }

  try {
    // Test if user_trials table exists by trying to query it
    const { error: testError } = await rootSupabase
      .from('user_trials')
      .select('email')
      .limit(1);
    
    if (testError && testError.code === 'PGRST205') {
      console.log('⚠️ user_trials table does not exist in Supabase');
      console.log('Please create the table manually in Supabase with this SQL:');
      console.log(`
CREATE TABLE user_trials (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_amount DECIMAL(10,2) DEFAULT 0,
  credits INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_trials_email ON user_trials(email);
      `);
      console.log('✓ Continuing with memory-only storage for now');
      return;
    } else {
      console.log('✓ Database table verified');
    }
    
    // Load existing users from database into memory cache
    const dbUsers = await loadAllUsersFromDB();
    console.log(`📁 Loaded ${dbUsers.size} users from database`);
    
    // Update in-memory cache
    dbUsers.forEach((userData, email) => {
      userTrials.set(email, userData);
    });

    // Load processed transactions into memory to maintain idempotency across restarts
    const dbTx = await loadProcessedTransactionsFromDB();
    console.log(`🔁 Loaded ${dbTx.size} processed transactions from database`);
    dbTx.forEach(t => processedTransactions.add(t));
    
  } catch (err) {
    console.error('Database initialization error:', err);
    console.log('✓ Continuing with memory-only storage');
    await createTableDirectly();
  }
}

async function createTableDirectly() {
  try {
    // Try direct table creation
    const { error } = await rootSupabase
      .from('user_trials')
      .select('email')
      .limit(1);
      
    if (error && error.code === '42P01') { // table does not exist
      console.log('Creating user_trials table...');
      // Table doesn't exist, but we can't create it via JS client
      // So we'll just proceed and let the user know
      console.warn('⚠️ Please create the user_trials table manually in Supabase Dashboard');
      console.log('SQL: CREATE TABLE user_trials (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), paid_amount DECIMAL(10,2) DEFAULT 0, credits INTEGER DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());');
    }
  } catch (err) {
    console.error('Direct table creation check failed:', err);
  }
}

// Initialize database on startup (non-blocking)
initializeDatabase();

// Helper function to check if trial period has expired (20 minutes)
function isTrialPeriodExpired(user) {
  if (!user || !user.registeredAt) return false;
  
  const twentyMinutesMs = CREDITS_CONFIG.TRIAL_PERIOD_MINUTES * 60 * 1000;
  const elapsed = new Date() - user.registeredAt;
  return elapsed > twentyMinutesMs;
}

// Helper function to check if user has credits remaining
function hasCreditsRemaining(email) {
  const user = userTrials.get(email.toLowerCase());
  if (!user) {
    // User doesn't exist - they'll get created with 100 credits
    return true;
  }
  
  // Check if trial period has expired
  if (isTrialPeriodExpired(user) && user.paidAmount === 0) {
    console.log(`Trial period expired for ${email} (20 minutes)`);
    return false;
  }
  
  // If user has paid any amount, check their credit balance
  const creditsLeft = user.credits || 0;
  console.log(`hasCreditsRemaining check for ${email}: ${creditsLeft} credits left`);
  return creditsLeft >= CREDITS_CONFIG.CREDITS_PER_GENERATE;
}

// Helper function to deduct credits (10 credits per generation)
async function deductCredit(email) {
  const user = userTrials.get(email.toLowerCase());
  if (!user) {
    console.log(`Cannot deduct credit - user ${email} not found`);
    return false;
  }
  
  // Check if trial has already been used
  if (user.trialUsed && user.paidAmount === 0) {
    console.log(`User ${email} trial has already been used`);
    return false;
  }
  
  // Check if trial period has expired for non-paying users
  if (isTrialPeriodExpired(user) && user.paidAmount === 0) {
    console.log(`User ${email} trial period has expired (${CREDITS_CONFIG.TRIAL_PERIOD_MINUTES} minutes)`);
    user.trialUsed = true;
    await setUser(email.toLowerCase(), user);
    return false;
  }
  
  // Deduct credits per generation
  if (user.credits >= CREDITS_CONFIG.CREDITS_PER_GENERATE) {
    user.credits -= CREDITS_CONFIG.CREDITS_PER_GENERATE;
    
    // Mark trial as used if credits run out for non-paying users
    if (user.credits < CREDITS_CONFIG.CREDITS_PER_GENERATE && user.paidAmount === 0) {
      user.trialUsed = true;
      console.log(`🔒 Trial marked as used for ${email} (credits exhausted)`);
    }
    
    userTrials.set(email.toLowerCase(), user);
    await setUser(email.toLowerCase(), user);
    console.log(`Deducted ${CREDITS_CONFIG.CREDITS_PER_GENERATE} credits from ${email}. Remaining: ${user.credits}`);
    return true;
  }
  
  console.log(`User ${email} has insufficient credits (needs ${CREDITS_CONFIG.CREDITS_PER_GENERATE}, has ${user.credits})`);
  
  // Mark trial as used when credits are insufficient
  if (user.paidAmount === 0 && !user.trialUsed) {
    user.trialUsed = true;
    await setUser(email.toLowerCase(), user);
    console.log(`🔒 Trial marked as used for ${email} (insufficient credits)`);
  }
  
  return false;
}

// Endpoint to check trial status (credit-based with 20-minute trial period)
app.get('/trial-status', async (req, res) => {
  const email = (req.query.email || '').toLowerCase();
  if (!email) return res.json({ trialExpired: false, isSubscribed: false, credits: 0 });
  
  // Capture login event
  const loginEvent = {
    email,
    timestamp: new Date(),
    ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  // Add to in-memory store (keep last 1000)
  userLogins.push(loginEvent);
  if (userLogins.length > 1000) userLogins.shift();
  
  // Save to DB asynchronously (don't wait)
  saveLoginEventToDB(email, loginEvent.ip, loginEvent.userAgent).catch(err => {
    console.error('Failed to save login event to DB:', err);
  });
  
  console.log(`📝 Login tracked: ${email} from ${loginEvent.ip}`);
  
  let user = await getUser(email);
  let isNewUser = false;
  
  // If user doesn't exist, check if they're eligible for a trial
  if (!user) {
    // Check if this IP has already used a trial
    const ipTrialUsed = await checkIPTrialUsed(loginEvent.ip);
    
    if (ipTrialUsed) {
      console.log(`🚫 Trial denied for ${email}: IP ${loginEvent.ip} already used a trial`);
      return res.json({ 
        trialExpired: true, 
        isSubscribed: false,
        paidAmount: 0,
        credits: 0,
        creditsLeft: 0,
        daysLeft: 0,
        minutesLeft: 0,
        trialPeriodMinutes: CREDITS_CONFIG.TRIAL_PERIOD_MINUTES,
        creditsPerGenerate: CREDITS_CONFIG.CREDITS_PER_GENERATE,
        maxGenerations: 0,
        message: 'Trial already used from this device/network. Please subscribe to continue.'
      });
    }
    
    console.log(`✅ Creating new user: ${email} with ${CREDITS_CONFIG.FREE_TRIAL_CREDITS} free credits (20-minute trial)`);
    user = { 
      registeredAt: new Date(), 
      paidAmount: 0,
      credits: CREDITS_CONFIG.FREE_TRIAL_CREDITS,
      ipAddress: loginEvent.ip,
      trialUsed: false // Will be set to true when trial expires or credits run out
    };
    await setUser(email, user);
    isNewUser = true;
  } else {
    // Existing user - check if they're trying from a different IP
    if (user.trialUsed && user.paidAmount === 0) {
      console.log(`🚫 Trial already used for email ${email}`);
      return res.json({ 
        trialExpired: true, 
        isSubscribed: false,
        paidAmount: 0,
        credits: 0,
        creditsLeft: 0,
        daysLeft: 0,
        minutesLeft: 0,
        trialPeriodMinutes: CREDITS_CONFIG.TRIAL_PERIOD_MINUTES,
        creditsPerGenerate: CREDITS_CONFIG.CREDITS_PER_GENERATE,
        maxGenerations: 0,
        message: 'Trial already used for this email. Please subscribe to continue.'
      });
    }
  }
  
  const isSubscribed = user.paidAmount > 0;
  const creditsLeft = user.credits || 0;
  
  // Calculate minutes left in trial period
  const trialPeriodExpired = isTrialPeriodExpired(user);
  const elapsed = (new Date() - user.registeredAt) / (60 * 1000); // minutes
  const minutesLeft = Math.max(0, Math.ceil(CREDITS_CONFIG.TRIAL_PERIOD_MINUTES - elapsed));
  
  // Trial is expired if either: no credits left OR trial period expired (for non-paying users)
  const trialExpired = (creditsLeft < CREDITS_CONFIG.CREDITS_PER_GENERATE || trialPeriodExpired) && !isSubscribed;
  
  // Mark trial as used if it has expired for non-paying users
  if (trialExpired && !isSubscribed && !user.trialUsed) {
    user.trialUsed = true;
    await setUser(email, user);
    console.log(`🔒 Trial marked as used for ${email} (expired)`);
  }
  
  console.log(`User ${email} - credits: ${creditsLeft}, minutes left: ${minutesLeft}, paid: ${isSubscribed}, expired: ${trialExpired}`);
  
  res.json({ 
    trialExpired, 
    isSubscribed,
    paidAmount: user.paidAmount,
    credits: creditsLeft,
    creditsLeft: creditsLeft,
    daysLeft: 0,
    minutesLeft: isSubscribed ? 999 : minutesLeft,
    trialPeriodMinutes: CREDITS_CONFIG.TRIAL_PERIOD_MINUTES,
    creditsPerGenerate: CREDITS_CONFIG.CREDITS_PER_GENERATE,
    maxGenerations: Math.floor(creditsLeft / CREDITS_CONFIG.CREDITS_PER_GENERATE)
  });
});

// Debug endpoint to clear all trial data (for testing)
app.post('/clear-trial-data', (req, res) => {
  const clearedCount = userTrials.size;
  userTrials.clear();
  console.log(`Cleared ${clearedCount} trial users`);
  res.json({ message: 'All trial data cleared successfully', clearedCount });
});

// Debug endpoint to list all users (for testing)
app.get('/debug/trial-users', (req, res) => {
  const users = [];
  userTrials.forEach((data, email) => {
    const daysElapsed = (new Date() - data.registeredAt) / (24 * 60 * 60 * 1000);
    const daysLeft = Math.max(0, Math.ceil(CREDITS_CONFIG.TRIAL_PERIOD_DAYS - daysElapsed));
    
    users.push({
      email,
      registeredAt: data.registeredAt,
      paidAmount: data.paidAmount,
      credits: data.credits || 0,
      creditsLeft: data.credits || 0,
      daysLeft: data.paidAmount > 0 ? 'Paid User' : daysLeft,
      maxGenerations: Math.floor((data.credits || 0) / CREDITS_CONFIG.CREDITS_PER_GENERATE)
    });
  });
  res.json({ 
    totalUsers: users.length, 
    users,
    pricing: {
      freeTrialCredits: CREDITS_CONFIG.FREE_TRIAL_CREDITS,
      creditsPerGenerate: CREDITS_CONFIG.CREDITS_PER_GENERATE,
      trialPeriodDays: CREDITS_CONFIG.TRIAL_PERIOD_DAYS,
      pricePerCredit: CREDITS_CONFIG.PRICE_PER_CREDIT
    }
  });
});

// Endpoint to purchase credits (₹100 = 100 credits)
app.post('/purchase-credits', (req, res) => {
  const { email, amount } = req.body;
  
  if (!email || !amount) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'Email and amount are required'
    });
  }
  
  const userEmail = email.toLowerCase();
  let user = userTrials.get(userEmail);
  
  // Create user if doesn't exist
  if (!user) {
    user = { 
      registeredAt: new Date(), 
      paidAmount: 0,
      credits: 0
    };
  }
  
  // Calculate credits: ₹1 = 1 credit
  const creditsToAdd = Math.floor(amount / CREDITS_CONFIG.PRICE_PER_CREDIT);
  
  user.credits = (user.credits || 0) + creditsToAdd;
  user.paidAmount = (user.paidAmount || 0) + amount;
  
  userTrials.set(userEmail, user);
  
  console.log(`User ${userEmail} purchased ${creditsToAdd} credits for ₹${amount}. Total credits: ${user.credits}`);
  
  res.json({
    success: true,
    email: userEmail,
    amountPaid: amount,
    creditsAdded: creditsToAdd,
    totalCredits: user.credits,
    message: `Successfully added ${creditsToAdd} credits to your account`
  });
});

// In-memory paid user store (temporary). Replace with DB in production.
const paidUsers = new Set();

// In-memory trial user store with registration timestamps
const trialUsers = new Map(); // email -> { registeredAt: Date, isExpired: boolean }

// Trial configuration
const TRIAL_DURATION_DAYS = 3;

// Helper function to check if trial is expired
function isTrialExpired(email) {
  const user = trialUsers.get(email.toLowerCase());
  if (!user) return false; // No trial started yet
  
  const now = new Date();
  const trialEnd = new Date(user.registeredAt);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);
  
  return now > trialEnd;
}

// Helper function to register a new trial user
function registerTrialUser(email) {
  const normalizedEmail = email.toLowerCase();
  if (!trialUsers.has(normalizedEmail)) {
    trialUsers.set(normalizedEmail, {
      registeredAt: new Date(),
      isExpired: false
    });
  }
}

// Middleware to check premium status (expects email in body or query)
function requirePremium(req, res, next) {
  const email = (req.body?.email || req.query?.email || '').toLowerCase();
  if (!email) return res.status(401).json({ error: 'Email required for premium check' });
  if (paidUsers.has(email)) return next();
  return res.status(402).json({ error: 'Premium required' });
}

// ===== PASSWORD RESET ENDPOINTS =====

// Request password reset - generates token and sends email
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // For this simple app, we'll allow password reset for any email
    // In production, you would check if user exists in your database
    
    // Generate reset token (6-digit code for simplicity)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    const expiresAt = new Date(now + 15 * 60 * 1000); // 15 minutes from now
    
    console.log(`🔐 Password reset requested for: ${normalizedEmail}, Token: ${resetToken}`);
    console.log(`⏰ Token expires at: ${expiresAt.toLocaleString()}`);

    
    // Save to database (if available)
    if (rootSupabase) {
      try {
        const { error } = await rootSupabase
          .from('password_resets')
          .insert([{
            email: normalizedEmail,
            token: resetToken,
            expires_at: expiresAt.toISOString()
          }]);
        
        if (error) {
          console.error('Error saving reset token to DB:', error);
          // Continue anyway - we'll show the token in dev mode
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue anyway
      }
    }
    
    // Send email with reset code
    if (mailTransport) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">TeachWise</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">🔐 Password Reset Request</p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello,</p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your TeachWise account. 
            </p>
            
            <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your Reset Code:</p>
              <p style="margin: 0; font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 5px; font-family: monospace;">
                ${resetToken}
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin: 20px 0;">
              ⏱️ This code will expire in <strong>15 minutes</strong>.
            </p>
            
            <p style="font-size: 14px; color: #666; margin: 20px 0;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
            
            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
              This is an automated message from TeachWise. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;
      
      try {
        await mailTransport.sendMail({
          from: '"TeachWise" <noreply@teachwise.com>',
          to: normalizedEmail,
          subject: '🔐 Password Reset Code - TeachWise',
          html: emailHtml
        });
        
        console.log(`📧 Password reset code sent to ${normalizedEmail}`);
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
      }
    }
    
    console.log(`✅ Reset token generated: ${resetToken} (expires in 15 minutes)`);
    
    res.json({
      success: true,
      message: 'Reset code sent! Check the backend console for the code.',
      // Always return token in dev/local mode (NODE_ENV is not 'production')
      resetToken: resetToken,
      devMode: true
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

// Verify reset token
app.post('/verify-reset-token', async (req, res) => {
  try {
    const { email, token } = req.body;
    
    if (!email || !token) {
      return res.status(400).json({
        success: false,
        error: 'Email and token are required'
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!rootSupabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }
    
    // Find the reset token
    const { data: resetRecord, error } = await rootSupabase
      .from('password_resets')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('token', token)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error verifying reset token:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify reset token'
      });
    }
    
    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset code'
      });
    }
    
    // Check if token is expired
    const now = Date.now();
    const expiresAt = new Date(resetRecord.expires_at).getTime();
    
    console.log(`⏰ Checking expiry: now=${new Date(now).toLocaleString()}, expires=${new Date(expiresAt).toLocaleString()}`);
    
    if (now > expiresAt) {
      console.log('❌ Token expired');
      return res.status(400).json({
        success: false,
        error: 'Reset code has expired. Please request a new one.'
      });
    }
    
    console.log('✅ Token is still valid');

    
    res.json({
      success: true,
      message: 'Reset code verified successfully'
    });
    
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify reset token'
    });
  }
});

// Reset password with token
app.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    
    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, token, and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!rootSupabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }
    
    // Verify the token again
    const { data: resetRecord, error: fetchError } = await rootSupabase
      .from('password_resets')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('token', token)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching reset token:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to process password reset'
      });
    }
    
    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset code'
      });
    }
    
    // Check expiration
    const now = Date.now();
    const expiresAt = new Date(resetRecord.expires_at).getTime();
    
    console.log(`⏰ Reset password - Checking expiry: now=${new Date(now).toLocaleString()}, expires=${new Date(expiresAt).toLocaleString()}`);
    
    if (now > expiresAt) {
      console.log('❌ Token expired during password reset');
      return res.status(400).json({
        success: false,
        error: 'Reset code has expired'
      });
    }

    
    // Mark token as used
    const { error: updateError } = await rootSupabase
      .from('password_resets')
      .update({ 
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', resetRecord.id);
    
    if (updateError) {
      console.error('Error updating reset token:', updateError);
    }
    
    // NOTE: In this simple app, passwords are stored in localStorage on the client side
    // In a real app, you would hash the password and store it in the database
    // For now, we'll just return success and let the client handle it
    
    console.log(`✅ Password reset successful for ${normalizedEmail}`);
    
    res.json({
      success: true,
      message: 'Password reset successfully! You can now login with your new password.'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

// Middleware to check premium status (expects email in body or query)
function requirePremium(req, res, next) {
  const email = (req.body?.email || req.query?.email || '').toLowerCase();
  if (!email) return res.status(401).json({ error: 'Email required for premium check' });
  if (paidUsers.has(email)) return next();
  return res.status(402).json({ error: 'Premium required' });
}

// Endpoint for frontend to check if current user is premium
app.get('/is-premium', (req, res) => {
  const email = (req.query.email || '').toLowerCase();
  if (!email) return res.json({ premium: false });
  return res.json({ premium: paidUsers.has(email) });
});

// ===== CREDITS SYSTEM API ENDPOINTS =====
const { CreditsManager, CREDIT_COSTS } = require('./utils/credits');

// Get user credits and tier info
app.get('/credits/balance', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check for monthly reset first
    await CreditsManager.checkMonthlyReset(userId);
    
    const creditsInfo = await CreditsManager.getUserCredits(userId);
    
    res.json({
      credits: creditsInfo.credits,
      tier: creditsInfo.tier,
      tierInfo: creditsInfo.tierInfo,
      creditCosts: CREDIT_COSTS
    });
  } catch (error) {
    console.error('Error getting credits balance:', error);
    res.status(500).json({ error: 'Failed to get credits balance' });
  }
});

// Check if user has enough credits for operation
app.get('/credits/check', async (req, res) => {
  try {
    const { userId, operationType } = req.query;
    if (!userId || !operationType) {
      return res.status(400).json({ error: 'User ID and operation type are required' });
    }

    const result = await CreditsManager.hasEnoughCredits(userId, operationType);
    res.json(result);
  } catch (error) {
    console.error('Error checking credits:', error);
    res.status(500).json({ error: 'Failed to check credits' });
  }
});

// Get credit transaction history
app.get('/credits/history', async (req, res) => {
  try {
    const userId = req.query.userId;
    const limit = parseInt(req.query.limit) || 50;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const history = await CreditsManager.getCreditHistory(userId, limit);
    res.json({ transactions: history });
  } catch (error) {
    console.error('Error getting credit history:', error);
    res.status(500).json({ error: 'Failed to get credit history' });
  }
});

// Get available credit packages
app.get('/credits/packages', async (req, res) => {
  try {
    const packages = await CreditsManager.getCreditPackages();
    res.json({ packages });
  } catch (error) {
    console.error('Error getting credit packages:', error);
    res.status(500).json({ error: 'Failed to get credit packages' });
  }
});

// Get subscription plans
app.get('/credits/plans', async (req, res) => {
  try {
    const plans = await CreditsManager.getSubscriptionPlans();
    res.json({ plans });
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    res.status(500).json({ error: 'Failed to get subscription plans' });
  }
});

// Add credits (for testing/admin use)
app.post('/credits/add', async (req, res) => {
  try {
    const { userId, amount, description, metadata } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ error: 'User ID and amount are required' });
    }

    const result = await CreditsManager.addCredits(
      userId, 
      amount, 
      'manual_add', 
      description || 'Manual credit addition',
      metadata
    );

    if (result.success) {
      res.json({ 
        success: true, 
        message: `Added ${amount} credits successfully`,
        creditsAdded: result.creditsAdded
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error adding credits:', error);
    res.status(500).json({ error: 'Failed to add credits' });
  }
});

// ===== END CREDITS API =====

// ===== PAYMENT API =====
const PaymentManager = require('./utils/payment');
const paymentManager = new PaymentManager(null, razorpay);

// Process UPI payment confirmation and add credits
app.post('/upi-payment-confirm', async (req, res) => {
  console.log('🔍 UPI Payment Confirmation Request Received:');
  console.log('📧 Headers:', req.headers);
  console.log('📦 Body:', req.body);
  
  try {
    const { email, amount, transactionId, planType } = req.body;
    
    console.log(`📋 Processing payment: ${email}, ₹${amount}, ${transactionId}, ${planType}`);
    
    if (!email || !amount || !transactionId) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields: email, amount, transactionId' 
      });
    }
    
    const userEmail = email.toLowerCase();
    const amountInRupees = parseInt(amount);
    const txId = transactionId.trim();
    
    // Validate transaction ID format (should be alphanumeric, min 8 chars)
    if (txId.length < 8) {
      return res.status(400).json({ 
        error: 'Invalid transaction ID. Transaction ID must be at least 8 characters long.' 
      });
    }
    
    // Check for obviously fake patterns
    const fakePatternsRegex = /^(test|fake|dummy|123+|abc+|xyz+|000+|111+|sample)/i;
    if (fakePatternsRegex.test(txId)) {
      console.log(`❌ Suspicious transaction ID detected: ${txId}`);
      return res.status(400).json({ 
        error: 'Invalid transaction ID. Please provide a valid payment transaction ID from your payment app.',
        details: 'Transaction ID appears to be a test/fake ID'
      });
    }
    
    // Validate amount (minimum ₹100)
    if (amountInRupees < 100) {
      return res.status(400).json({ 
        error: 'Minimum payment amount is ₹100' 
      });
    }
    
    // Check if transaction ID was already processed (in memory)
    if (processedTransactions.has(txId)) {
      return res.status(400).json({ 
        error: 'Transaction already processed',
        message: 'This payment has already been credited to your account'
      });
    }
    
    // Check if transaction ID already exists in database
    if (rootSupabase) {
      try {
        const { data: existingTx, error: txError } = await rootSupabase
          .from('processed_transactions')
          .select('*')
          .eq('transaction_id', txId)
          .maybeSingle(); // Use maybeSingle() instead of single() to avoid error when no record found
        
        if (existingTx) {
          console.log(`❌ Transaction ID already exists in database: ${txId}`);
          return res.status(400).json({ 
            error: 'Transaction already processed',
            message: 'This transaction ID has already been used. Each payment must have a unique transaction ID.',
            existingTransaction: {
              email: existingTx.email,
              amount: existingTx.amount,
              date: existingTx.created_at
            }
          });
        }
      } catch (dbCheckError) {
        console.warn('Failed to check transaction in database:', dbCheckError.message);
        // Continue anyway - we still have in-memory check
      }
    }
    
    // Get or create user
    let user = await getUser(userEmail);
    if (!user) {
      user = { 
        registeredAt: new Date(), 
        paidAmount: 0,
        credits: CREDITS_CONFIG.FREE_TRIAL_CREDITS
      };
    }
    
    // Calculate credits based on plan type or amount
    let creditsToAdd;
    if (planType === 'basic' && amountInRupees === 100) {
      creditsToAdd = 100; // Basic plan: 100 credits for ₹100
    } else if (planType === 'premium' && amountInRupees === 750) {
      creditsToAdd = 1000; // Premium plan: 1000 credits for ₹750
    } else {
      // Fallback: 1 rupee = 1 credit
      creditsToAdd = amountInRupees;
    }
    
    // Save payment as PENDING for admin review instead of auto-adding credits
    if (rootSupabase) {
      try {
        const { data: pendingPayment, error: pendingError } = await rootSupabase
          .from('pending_payments')
          .insert([{
            email: userEmail,
            amount: amountInRupees,
            transaction_id: txId,
            plan_type: planType,
            status: 'pending'
          }])
          .select()
          .single();
        
        if (pendingError) {
          console.error('Failed to save pending payment:', pendingError);
          throw pendingError;
        }
        
        console.log(`💰 Payment submission saved as PENDING: ${userEmail}, ₹${amountInRupees}, TxID: ${txId}`);
        
        // Return success but indicate it's pending review
        return res.json({
          success: true,
          message: 'Payment submitted successfully and is pending admin review',
          status: 'pending',
          email: userEmail,
          amountPaid: amountInRupees,
          creditsToAdd: creditsToAdd,
          transactionId: txId,
          note: 'Your payment will be verified by our admin team. Credits will be added to your account once approved.'
        });
        
      } catch (err) {
        console.error('Error saving pending payment:', err);
        return res.status(500).json({ 
          error: 'Failed to submit payment for review',
          details: err.message 
        });
      }
    } else {
      return res.status(500).json({ 
        error: 'Payment submission system not configured. Please contact support.' 
      });
    }
    
    /* OLD AUTO-APPROVE CODE - Now payments are pending for admin review
    // Update user credits and payment amount
    user.credits = (user.credits || 0) + creditsToAdd;
    user.paidAmount = (user.paidAmount || 0) + amountInRupees;
    
    // Save user data
    await setUser(userEmail, user);
    
    // Record transaction to prevent duplicate processing (in-memory)
    processedTransactions.add(txId);
    // Persist transaction record to DB so idempotency survives restarts
    try {
      await saveProcessedTransactionToDB(txId, userEmail, amountInRupees, planType);
    } catch (e) {
      console.warn('Failed to persist processed transaction to DB:', e?.message || e);
    }
    
    // Log payment confirmation
    console.log(`✅ UPI Payment confirmed: ${userEmail} paid ₹${amountInRupees}, TxID: ${txId}, added ${creditsToAdd} credits. Total credits: ${user.credits}`);
    
    // Send confirmation email if possible
    if (mailTransport) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0;">TeachWise</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">Payment Confirmed!</p>
            </div>
            
            <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear Teacher,</p>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Your payment has been successfully confirmed and processed!
              </p>
              
              <div style="background-color: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4F46E5;">
                <p style="margin: 0; font-size: 14px; color: #4F46E5; font-weight: bold;">PAYMENT DETAILS</p>
                <p style="margin: 10px 0 5px 0; font-size: 16px; color: #333;">
                  <strong>Amount Paid:</strong> ₹${amountInRupees}
                </p>
                <p style="margin: 5px 0; font-size: 16px; color: #333;">
                  <strong>Credits Added:</strong> ${creditsToAdd}
                </p>
                <p style="margin: 5px 0; font-size: 16px; color: #333;">
                  <strong>Total Credits:</strong> ${user.credits}
                </p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
                  Transaction ID: ${transactionId}
                </p>
              </div>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                You can now use TeachWise without any time restrictions. Each lesson generation uses 4 credits.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3000" 
                   style="display: inline-block; background-color: #4F46E5; color: white; padding: 15px 40px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Continue Teaching
                </a>
              </div>
              
              <p style="font-size: 16px; color: #333; text-align: center; margin-top: 30px;">
                <strong>Happy Teaching! 🎓</strong>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                This is an automated confirmation email. If you have any questions, please contact our support team.
              </p>
            </div>
          </div>
        `;

        await mailTransport.sendMail({
          from: '"TeachWise" <noreply@teachwise.com>',
          to: userEmail,
          subject: '✅ Payment Confirmed - Credits Added to Your Account!',
          html: emailHtml
        });

        console.log(`Payment confirmation email sent to ${userEmail}`);
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError);
      }
    }
    
    res.json({
      success: true,
      message: 'Payment confirmed and credits added successfully',
      email: userEmail,
      amountPaid: amountInRupees,
      creditsAdded: creditsToAdd,
      totalCredits: user.credits,
      transactionId: txId
    });
    */
    
  } catch (error) {
    console.error('Error processing UPI payment confirmation:', error);
    res.status(500).json({ 
      error: 'Failed to process payment confirmation',
      details: error.message 
    });
  }
});

// Get pending payments (for admin verification)
app.get('/admin/pending-payments', authenticateAdmin, async (req, res) => {
  try {
    if (!rootSupabase) {
      return res.status(500).json({ 
        success: false,
        error: 'Database not configured' 
      });
    }
    
    const { data: payments, error } = await rootSupabase
      .from('pending_payments')
      .select('*')
      .order('submitted_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching pending payments:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch pending payments' 
      });
    }
    
    res.json({
      success: true,
      pendingPayments: payments || [],
      totalPending: payments?.filter(p => p.status === 'pending').length || 0
    });
  } catch (err) {
    console.error('Error in pending payments endpoint:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Approve pending payment and add credits (admin only)
app.post('/admin/approve-payment', authenticateAdmin, async (req, res) => {
  try {
    const { paymentId } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ 
        success: false,
        error: 'Payment ID is required' 
      });
    }
    
    if (!rootSupabase) {
      return res.status(500).json({ 
        success: false,
        error: 'Database not configured' 
      });
    }
    
    // Get the pending payment
    const { data: payment, error: fetchError } = await rootSupabase
      .from('pending_payments')
      .select('*')
      .eq('id', paymentId)
      .single();
    
    if (fetchError || !payment) {
      return res.status(404).json({ 
        success: false,
        error: 'Payment not found' 
      });
    }
    
    if (payment.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        error: `Payment already ${payment.status}` 
      });
    }
    
    // Calculate credits
    let creditsToAdd;
    if (payment.plan_type === 'basic' && payment.amount === 100) {
      creditsToAdd = 100;
    } else if (payment.plan_type === 'premium' && payment.amount === 750) {
      creditsToAdd = 1000;
    } else {
      creditsToAdd = payment.amount;
    }
    
    // Get or create user
    let user = await getUser(payment.email);
    if (!user) {
      user = { 
        registeredAt: new Date(), 
        paidAmount: 0,
        credits: CREDITS_CONFIG.FREE_TRIAL_CREDITS
      };
    }
    
    // Add credits
    user.credits = (user.credits || 0) + creditsToAdd;
    user.paidAmount = (user.paidAmount || 0) + payment.amount;
    await setUser(payment.email, user);
    
    // Mark as approved
    const { error: updateError } = await rootSupabase
      .from('pending_payments')
      .update({ 
        status: 'approved',
        reviewed_by: 'admin',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', paymentId);
    
    if (updateError) {
      console.error('Error updating payment status:', updateError);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to update payment status' 
      });
    }
    
    // Record in processed transactions
    processedTransactions.add(payment.transaction_id);
    try {
      await saveProcessedTransactionToDB(payment.transaction_id, payment.email, payment.amount, payment.plan_type);
    } catch (e) {
      console.warn('Failed to save to processed transactions:', e);
    }
    
    console.log(`✅ Payment APPROVED by admin: ${payment.email}, ₹${payment.amount}, +${creditsToAdd} credits`);
    
    res.json({
      success: true,
      message: 'Payment approved and credits added',
      email: payment.email,
      creditsAdded: creditsToAdd,
      totalCredits: user.credits
    });
    
  } catch (err) {
    console.error('Error approving payment:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to approve payment',
      details: err.message 
    });
  }
});

// Manual payment verification endpoint (for admin use)
app.post('/admin/verify-payment', authenticateAdmin, async (req, res) => {
  try {
    const { email, amount, transactionId, notes } = req.body;
    
    if (!email || !amount || !transactionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: email, amount, transactionId' 
      });
    }
    
    // Use the same logic as UPI payment confirmation
    const result = await fetch('http://localhost:3003/upi-payment-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, amount, transactionId, planType: 'manual' })
    });
    
    const data = await result.json();
    
    if (data.success) {
      console.log(`Admin ${req.admin.username} verified payment: ${email} - ₹${amount} - ${transactionId}`);
      res.json({
        success: true,
        message: `Payment verified and ${data.creditsAdded} credits added to ${email}`,
        data
      });
    } else {
      res.status(400).json({
        success: false,
        error: data.error || 'Payment verification failed'
      });
    }
    
  } catch (error) {
    console.error('Admin payment verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify payment' 
    });
  }
});

// Create Razorpay order for credit purchase
app.post('/payment/razorpay/order', async (req, res) => {
  try {
    const { userId, packageId } = req.body;

    if (!userId || !packageId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await paymentManager.createRazorpayOrder(userId, packageId);
    res.json(result);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify and process Razorpay payment
app.post('/payment/razorpay/verify', async (req, res) => {
  try {
    const { orderId, paymentId, signature, userId, packageId, email } = req.body;

    if (!orderId || !paymentId || !signature || !userId || !packageId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify signature
    const isValid = paymentManager.verifyRazorpaySignature(orderId, paymentId, signature);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Process payment and add credits
    const result = await paymentManager.processPaymentSuccess(userId, packageId, {
      orderId,
      paymentId,
      signature,
      gateway: 'razorpay',
    });

    // Send confirmation email after successful payment
    if (email && mailTransport) {
      try {
        const userEmail = email.toLowerCase();
        const user = userTrials.get(userEmail);
        const creditsAdded = 100; // ₹100 = 100 credits
        const totalCredits = user ? user.credits : 0;
        
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0;">TeachWise</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">Payment Received Successfully!</p>
            </div>
            
            <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear Teacher,</p>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                We have successfully received your payment of <strong>₹100</strong>. 
                Your account has been credited with <strong>100 credits</strong>.
              </p>
              
              <div style="background-color: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4F46E5;">
                <p style="margin: 0; font-size: 14px; color: #4F46E5; font-weight: bold;">YOUR CREDIT DETAILS</p>
                <p style="margin: 10px 0 5px 0; font-size: 16px; color: #333;">
                  <strong>Total Credits:</strong> ${totalCredits}
                </p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
                  Each lesson generation uses 4 credits
                </p>
              </div>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                <strong>Important Note:</strong><br>
                For every lesson you generate, <strong>4 credits</strong> will be deducted from your account.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3001" 
                   style="display: inline-block; background-color: #4F46E5; color: white; padding: 15px 40px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Get Back to TeachWise
                </a>
              </div>
              
              <p style="font-size: 16px; color: #333; text-align: center; margin-top: 30px;">
                <strong>Happy Teaching! 🎓</strong>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                This is an automated email. Please do not reply to this message.
              </p>
            </div>
          </div>
        `;

        const info = await mailTransport.sendMail({
          from: '"TeachWise" <noreply@teachwise.com>',
          to: userEmail,
          subject: '✅ Payment Received - Your Credits are Ready!',
          html: emailHtml
        });

        console.log(`Payment confirmation email sent to ${userEmail}`);
        
        // Log preview URL for test accounts
        if (nodemailer && typeof nodemailer.getTestMessageUrl === 'function') {
          const previewUrl = nodemailer.getTestMessageUrl(info);
          if (previewUrl) {
            console.log(`Preview email at: ${previewUrl}`);
          }
        }
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError);
        // Don't fail the payment verification if email fails
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Get payment configuration (public keys, etc.)
app.get('/payment/config', (req, res) => {
  res.json({
    razorpay: {
      enabled: !!razorpay,
      keyId: process.env.RAZORPAY_KEY_ID,
    },
  });
});

// ===== END PAYMENT API =====

// ===== TEST API ROUTES =====
// Test Supabase connection
app.get('/test/connection', async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        error: 'Missing Supabase configuration',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          keyLength: supabaseKey ? supabaseKey.length : 0
        }
      });
    }
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        details: error.message
      });
    }
    
    res.json({
      success: true,
      message: 'Supabase connection successful',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      details: error.message
    });
  }
});

// Test if credits tables exist
app.get('/test/tables', async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const tables = ['credit_transactions', 'credit_packages', 'subscription_plans', 'user_subscriptions'];
    const results = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count(*)')
          .limit(1);
        
        results[table] = {
          exists: !error,
          error: error ? error.message : null
        };
      } catch (err) {
        results[table] = {
          exists: false,
          error: err.message
        };
      }
    }
    
    res.json({
      success: true,
      tables: results,
      allTablesExist: Object.values(results).every(r => r.exists)
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Table test failed',
      details: error.message
    });
  }
});

app.post('/generate', async (req, res) => {
try {
const { type = 'lesson', grade = '7', subject = 'Science', topic = 'Photosynthesis', minutes = 45, weeks = 6, userId, email } = req.body;

  // ===== CREDITS SYSTEM CHECK =====
  const userEmail = (email || '').toLowerCase();
  
  if (userEmail) {
    // Check if user has credits remaining
    if (!hasCreditsRemaining(userEmail)) {
      const user = userTrials.get(userEmail);
      const creditsLeft = user ? user.credits : 0;
      const trialExpired = isTrialPeriodExpired(user);
      
      return res.status(402).json({ 
        error: 'Insufficient credits',
        credits: creditsLeft,
        creditsNeeded: CREDITS_CONFIG.CREDITS_PER_GENERATE,
        trialExpired: trialExpired,
        message: trialExpired 
          ? 'Your 20-minute trial period has ended. Please purchase credits to continue.'
          : `You need ${CREDITS_CONFIG.CREDITS_PER_GENERATE} credits per generation. You have ${creditsLeft} credits remaining. Purchase more to continue.`
      });
    }
    
    // Deduct 4 credits before processing
    const deducted = deductCredit(userEmail);
    if (!deducted) {
      const user = userTrials.get(userEmail);
      return res.status(402).json({ 
        error: 'Failed to deduct credits',
        credits: user ? user.credits : 0,
        creditsNeeded: CREDITS_CONFIG.CREDITS_PER_GENERATE,
        message: `Unable to process your request. You need ${CREDITS_CONFIG.CREDITS_PER_GENERATE} credits per generation.`
      });
    }
    
    // Get updated credits count
    const user = userTrials.get(userEmail);
    const creditsLeft = user ? user.credits : 0;
    console.log(`Processing generate request for ${userEmail}. ${CREDITS_CONFIG.CREDITS_PER_GENERATE} credits deducted. Remaining: ${creditsLeft}`);
  }
  // ===== END CREDITS SYSTEM =====

  // Legacy premium check (keeping for backward compatibility)
  if (req.body?.premiumOnly) {
    const checkEmail = (req.body?.email || '').toLowerCase();
    if (!checkEmail || !paidUsers.has(checkEmail)) {
      return res.status(402).json({ error: 'Premium required' });
    }
  }


// Build prompt with better formatting instructions
let prompt = '';
if (type === 'lesson') {
prompt = `Create a detailed ${minutes}-minute lesson plan for Class ${grade} ${subject} on the topic "${topic}". 

Format the response with clear structure using these sections:
🎯 LEARNING OBJECTIVES
📚 MATERIALS NEEDED
🔥 WARM-UP (5 minutes)
📖 MAIN ACTIVITY (${minutes - 15} minutes)
✅ ASSESSMENT (5 minutes)
🏠 HOMEWORK
💡 ADDITIONAL NOTES

Use bullet points, numbered lists, and clear headings. Keep each section well-organized and easy to read.`;
} else if (type === 'quiz') {
  prompt = `Create a well-formatted quiz with 10 multiple-choice questions for Class ${grade} ${subject} on the topic "${topic}".

IMPORTANT: Use this EXACT format for each question:

Question 1: [Question text here]
A) [First option]
B) [Second option]  
C) [Third option]
D) [Fourth option]

**Answer:** [Correct letter]
**Explanation:** [Brief explanation why this is correct]

[Leave blank line between questions]

Question 2: [Next question text]
A) [First option]
B) [Second option]
C) [Third option] 
D) [Fourth option]

**Answer:** [Correct letter]
**Explanation:** [Brief explanation]

Continue this pattern for all 10 questions. Use double line breaks between each question for proper spacing.`;
  // If client requested hideAnswers, instruct model to omit answers and explanations
  if (req.body?.hideAnswers) {
    prompt += "\n\nIMPORTANT: Do NOT include the answers or explanations in your output. Return only the questions and options.";
  }
} else if (type === 'presentation') {
  prompt = `Create a presentation slide deck for Class ${grade} ${subject} on the topic "${topic}" for a ${minutes}-minute presentation.

Format as a structured slide presentation with:

SLIDE 1: TITLE SLIDE
- Main title: [Topic name]
- Subtitle: Class ${grade} ${subject}
- Duration: ${minutes} minutes

SLIDE 2: OBJECTIVES
- What students will learn
- 3-4 clear learning objectives

SLIDE 3-6: MAIN CONTENT
- Key concepts broken into digestible slides
- Use bullet points (max 5 per slide)
- Include visual descriptions where helpful
- One main concept per slide

SLIDE 7: ACTIVITY/PRACTICE
- Interactive element or practice exercise
- Clear instructions for students

SLIDE 8: SUMMARY & NEXT STEPS
- Key takeaways
- What's coming next
- Questions for discussion

For each slide, provide:
- Slide title
- 3-5 bullet points of content
- Speaker notes (what teacher should say)

Format with clear headings and maintain consistent structure throughout.`;
} else {
  // Course outline mode: multi-week course plan
  if (type === 'course') {
    prompt = `Design a ${weeks}-week course content plan for Class ${grade} ${subject} focused on "${topic}".

Requirements:
- Provide a weekly breakdown (Week 1 .. Week ${weeks}) with learning objectives, key concepts, suggested activities, formative assessment ideas, and homework/extension tasks for each week.
- For each week include 3-5 lesson-level topics if appropriate, and an estimated total minutes per week (suggested range).
- Include recommended resources or materials and a brief note on differentiation strategies for struggling and advanced students.
- End with an assessment plan and suggested rubric criteria.

Format the response with clear headings and use bullet lists. Number each week clearly (e.g., "Week 1:").`; 
  } else {
    prompt = `Create well-structured educational content for Class ${grade} ${subject} on the topic "${topic}". Use clear headings, bullet points, and proper formatting for easy readability.`;
  }
}


// Token budget: larger for quizzes and courses
let maxTokens = 700;
if (type === 'quiz') maxTokens = 1400;
if (type === 'course') maxTokens = 2000;
if (type === 'presentation') maxTokens = 1200;
const payload = {
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'You are an expert educational assistant that creates well-formatted, structured lesson plans and quizzes. Always use proper headings, bullet points, numbered lists, and clear spacing to make content easy to read and professionally formatted.' },
    { role: 'user', content: prompt }
  ],
  max_tokens: maxTokens,
  temperature: 0.2
};

const controller = AbortControllerCtor ? new AbortControllerCtor() : { abort: () => {}, signal: undefined };
const timeout = setTimeout(() => controller.abort(), REQ_TIMEOUT_MS);
let r;
try {
  r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify(payload),
    signal: controller.signal
  });
} catch (e) {
  if (e.name === 'AbortError') {
    return res.status(504).json({ error: 'OpenAI request timed out. Please try again.' });
  }
  throw e;
} finally {
  clearTimeout(timeout);
}


if (!r.ok) {
const txt = await r.text();
console.error('OpenAI error', r.status, txt);
return res.status(500).json({ error: 'OpenAI API error', detail: txt });
}


const data = await r.json();
const content = data.choices?.[0]?.message?.content || JSON.stringify(data);
// If hideAnswers requested, remove answers/explanations from the model output
let output = content;
if (req.body?.hideAnswers) {
  try {
    // remove bolded Answer/Explanation lines (e.g. "**Answer:** D")
    output = output.replace(/\*\*Answer:\*\*.*(\r?\n)?/gi, '')
    output = output.replace(/\*\*Explanation:\*\*.*(\r?\n)?/gi, '')
    // remove plain Answer: X or Explanation: lines
    output = output.replace(/^\s*Answer:\s*[A-D]\s*$/gim, '')
    output = output.replace(/^\s*Explanation:\s*.*$/gim, '')
    // collapse multiple blank lines
    output = output.replace(/\n{3,}/g, '\n\n').trim()
  } catch (e) {
    console.warn('Error stripping answers:', e?.message || e)
    output = content
  }
}
// helper to escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
// Optionally send to student email (if requested). Send email first so we can return preview URL in response (dev-friendly).
let emailSent = false;
let previewUrl = null;
try {
  const studentEmail = req.body?.studentEmail;
  if (studentEmail && mailTransport) {
    const plain = output.replace(/\*\*/g, '');
    const info = await mailTransport.sendMail({
      from: process.env.SMTP_FROM || (process.env.SMTP_USER || 'noreply@example.com'),
      to: studentEmail,
      subject: `Quiz: ${topic} (Class ${grade} ${subject})`,
      text: plain,
      html: `<pre style="white-space:pre-wrap; font-family: inherit;">${escapeHtml(plain)}</pre>`
    });
    emailSent = true;
    console.log('Sent quiz to', studentEmail);
    if (nodemailer && typeof nodemailer.getTestMessageUrl === 'function') {
      try {
        previewUrl = nodemailer.getTestMessageUrl(info) || null;
        if (previewUrl) console.log('Preview URL:', previewUrl);
      } catch (e) {
        // ignore
      }
    }
  }
} catch (e) {
  console.warn('Failed to send quiz email:', e?.message || e);
}

// Respond with the generated output and optional email metadata
res.json({ result: output, emailSent, previewUrl });
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Server error', detail: err.message });
}
});

// ===== ADMIN PANEL ENDPOINTS =====

// Admin login endpoint
app.post('/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }
    
    // Check credentials against environment variables
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { username, isAdmin: true },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log(`Admin login successful: ${username}`);
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      expiresIn: '24h'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get current credits configuration
app.get('/admin/credits-config', authenticateAdmin, (req, res) => {
  res.json({
    success: true,
    config: CREDITS_CONFIG
  });
});

// Update credits per generate
app.post('/admin/update-credits-per-generate', authenticateAdmin, (req, res) => {
  try {
    const { creditsPerGenerate } = req.body;
    
    if (!creditsPerGenerate || creditsPerGenerate < 1 || creditsPerGenerate > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Credits per generate must be between 1 and 100' 
      });
    }
    
    CREDITS_CONFIG.CREDITS_PER_GENERATE = parseInt(creditsPerGenerate);
    
    console.log(`Admin: Updated credits per generate to ${CREDITS_CONFIG.CREDITS_PER_GENERATE}`);
    
    res.json({
      success: true,
      message: `Credits per generate updated to ${CREDITS_CONFIG.CREDITS_PER_GENERATE}`,
      config: CREDITS_CONFIG
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update configuration' });
  }
});

// Update free trial credits
app.post('/admin/update-trial-credits', authenticateAdmin, (req, res) => {
  try {
    const { trialCredits } = req.body;
    
    if (!trialCredits || trialCredits < 10 || trialCredits > 1000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Trial credits must be between 10 and 1000' 
      });
    }
    
    CREDITS_CONFIG.FREE_TRIAL_CREDITS = parseInt(trialCredits);
    
    console.log(`Admin: Updated trial credits to ${CREDITS_CONFIG.FREE_TRIAL_CREDITS}`);
    
    res.json({
      success: true,
      message: `Trial credits updated to ${CREDITS_CONFIG.FREE_TRIAL_CREDITS}`,
      config: CREDITS_CONFIG
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update configuration' });
  }
});

// Get all users and their credit status (admin)
app.get('/admin/users', authenticateAdmin, (req, res) => {
  const users = [];
  userTrials.forEach((data, email) => {
    const elapsed = (new Date() - data.registeredAt) / (24 * 60 * 60 * 1000); // days
    users.push({
      email,
      registeredAt: data.registeredAt,
      paidAmount: data.paidAmount,
      credits: data.credits || 0,
      daysElapsed: Math.round(elapsed * 100) / 100,
      isTrialExpired: isTrialPeriodExpired(data),
      isPaidUser: data.paidAmount > 0,
      trialUsed: data.trialUsed || false,
      ipAddress: data.ipAddress || null
    });
  });
  res.json({ 
    totalUsers: users.length, 
    users: users.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt)),
    config: CREDITS_CONFIG
  });
});

// Add credits to a specific user (admin)
app.post('/admin/add-credits', authenticateAdmin, async (req, res) => {
  try {
    const { email, credits } = req.body;
    
    if (!email || !credits || credits < 1 || credits > 1000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid email and credits (1-1000) required' 
      });
    }
    
    const user = await getUser(email.toLowerCase());
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    user.credits = (user.credits || 0) + parseInt(credits);
    await setUser(email.toLowerCase(), user);
    
    console.log(`Admin: Added ${credits} credits to ${email}. New balance: ${user.credits}`);
    
    res.json({
      success: true,
      message: `Added ${credits} credits to ${email}`,
      newBalance: user.credits
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add credits' });
  }
});

// Change admin password (admin)
app.post('/admin/change-password', authenticateAdmin, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }
    
    // Verify current password
    if (currentPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }
    
    // Update password in environment (Note: This only affects current session)
    process.env.ADMIN_PASSWORD = newPassword;
    
    console.log(`Admin password changed by: ${req.admin.username}`);
    
    res.json({
      success: true,
      message: 'Password changed successfully. Please note: This change only affects the current session. To make it permanent, update the .env file.',
      warning: 'Password change is temporary - update .env file for permanent change'
    });
  } catch (error) {
    console.error('Admin password change error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to change password' 
    });
  }
});

// Reset all users (admin) - clears all email IDs and user data
app.post('/admin/reset-users', authenticateAdmin, (req, res) => {
  try {
    const userCount = userTrials.size;
    
    // Clear all users
    userTrials.clear();
    
    console.log(`Admin ${req.admin.username} reset all user data. ${userCount} users removed.`);
    
    res.json({
      success: true,
      message: `Successfully reset all user data. ${userCount} users removed.`,
      removedCount: userCount
    });
  } catch (error) {
    console.error('Admin reset users error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset users' 
    });
  }
});

// Simple debug endpoint for admin panel testing (no auth required)
app.get('/debug/admin-users', (req, res) => {
  const users = [];
  userTrials.forEach((data, email) => {
    const elapsed = (new Date() - data.registeredAt) / (24 * 60 * 60 * 1000); // days
    users.push({
      email,
      registeredAt: data.registeredAt,
      paidAmount: data.paidAmount,
      credits: data.credits || 0,
      daysElapsed: Math.round(elapsed * 100) / 100,
      isTrialExpired: isTrialPeriodExpired(data),
      isPaidUser: data.paidAmount > 0
    });
  });
  res.json({ 
    success: true,
    totalUsers: users.length, 
    users: users.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt)),
    config: CREDITS_CONFIG,
    timestamp: new Date().toISOString()
  });
});

// Update user credits manually (admin only)
app.post('/admin/update-credits', authenticateAdmin, async (req, res) => {
  try {
    const { email, credits, paidAmount, action } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }
    
    const userEmail = email.toLowerCase().trim();
    
    // Get user from database
    let user = await getUserFromDB(userEmail);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    const oldCredits = user.credits || 0;
    const oldPaidAmount = user.paidAmount || 0;
    
    // Update based on action
    if (action === 'set') {
      // Set credits to exact value
      if (credits !== undefined && credits !== null) {
        user.credits = parseInt(credits);
      }
      if (paidAmount !== undefined && paidAmount !== null) {
        user.paidAmount = parseInt(paidAmount);
      }
    } else if (action === 'add') {
      // Add to existing credits
      if (credits !== undefined && credits !== null) {
        user.credits = (user.credits || 0) + parseInt(credits);
      }
      if (paidAmount !== undefined && paidAmount !== null) {
        user.paidAmount = (user.paidAmount || 0) + parseInt(paidAmount);
      }
    } else if (action === 'subtract') {
      // Subtract from existing credits
      if (credits !== undefined && credits !== null) {
        user.credits = Math.max(0, (user.credits || 0) - parseInt(credits));
      }
      if (paidAmount !== undefined && paidAmount !== null) {
        user.paidAmount = Math.max(0, (user.paidAmount || 0) - parseInt(paidAmount));
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid action. Use "set", "add", or "subtract"' 
      });
    }
    
    // Save updated user
    await setUser(userEmail, user);
    
    console.log(`✓ Admin updated credits for ${userEmail}: ${oldCredits} → ${user.credits}, paid: ${oldPaidAmount} → ${user.paidAmount}`);
    
    res.json({
      success: true,
      message: 'User credits updated successfully',
      user: {
        email: userEmail,
        credits: user.credits,
        paidAmount: user.paidAmount,
        oldCredits,
        oldPaidAmount
      }
    });
    
  } catch (err) {
    console.error('Update credits error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user credits',
      details: err.message 
    });
  }
});

// ===== END ADMIN PANEL =====

// Server startup for GoDaddy deployment
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/out', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TeachWise backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${corsOptions.origin.join(', ')}`);
});

module.exports = app;

// --- ADMIN: migration & processed transactions management endpoints ---
const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// Get migration SQL (requires admin)
app.get('/admin/migration-sql', authenticateAdmin, (req, res) => {
  try {
    const sqlPath = path.join(__dirname, 'migrations', 'create_processed_transactions.sql');
    if (!fs.existsSync(sqlPath)) return res.status(404).json({ success: false, error: 'Migration file not found' });
    const sql = fs.readFileSync(sqlPath, 'utf8');
    res.json({ success: true, sql });
  } catch (err) {
    console.error('Error reading migration SQL:', err);
    res.status(500).json({ success: false, error: 'Failed to read migration SQL' });
  }
});

// Run migration using psql if DATABASE_URL present on server
app.post('/admin/run-migration', authenticateAdmin, async (req, res) => {
  try {
    const sqlPath = path.join(__dirname, 'migrations', 'create_processed_transactions.sql');
    if (!fs.existsSync(sqlPath)) return res.status(404).json({ success: false, error: 'Migration file not found' });

    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
    if (!dbUrl) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      return res.status(400).json({ success: false, error: 'DATABASE_URL not configured on server. Run the SQL manually.', sql });
    }

    // Execute psql command
    try {
      const cmd = `psql "${dbUrl}" -f "${sqlPath}"`;
      const { stdout, stderr } = await exec(cmd, { timeout: 120000 });
      return res.json({ success: true, stdout, stderr });
    } catch (execErr) {
      console.error('Migration execution failed:', execErr);
      return res.status(500).json({ success: false, error: 'Failed to execute migration via psql', detail: execErr.message });
    }
  } catch (err) {
    console.error('Run migration error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Reload processed transactions from DB into memory
app.post('/admin/reload-processed-transactions', authenticateAdmin, async (req, res) => {
  try {
    if (!rootSupabase) return res.status(400).json({ success: false, error: 'Supabase not configured' });
    const txSet = await loadProcessedTransactionsFromDB();
    processedTransactions.clear();
    txSet.forEach(t => processedTransactions.add(t));
    res.json({ success: true, message: `Loaded ${txSet.size} transactions` });
  } catch (err) {
    console.error('Reload processed transactions error:', err);
    res.status(500).json({ success: false, error: 'Failed to reload processed transactions' });
  }
});

// List processed transactions (recent)
app.get('/admin/processed-transactions', authenticateAdmin, async (req, res) => {
  try {
    if (!rootSupabase) return res.status(400).json({ success: false, error: 'Supabase not configured' });
    const limit = parseInt(req.query.limit || '100', 10);
    const { data, error } = await rootSupabase
      .from('processed_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, transactions: data || [] });
  } catch (err) {
    console.error('List processed transactions error:', err);
    res.status(500).json({ success: false, error: 'Failed to list processed transactions' });
  }
});

// Admin: manually add a processed transaction record
app.post('/admin/add-processed-transaction', authenticateAdmin, async (req, res) => {
  try {
    const { transactionId, email, amount, planType } = req.body || {};
    if (!transactionId || !email || !amount) return res.status(400).json({ success: false, error: 'transactionId, email, and amount required' });
    // Save to DB
    const saved = await saveProcessedTransactionToDB(transactionId, email, amount, planType || 'manual');
    if (!saved) return res.status(500).json({ success: false, error: 'Failed to save transaction' });
    processedTransactions.add(transactionId);
    res.json({ success: true, message: 'Transaction recorded' });
  } catch (err) {
    console.error('Add processed transaction error:', err);
    res.status(500).json({ success: false, error: 'Failed to add processed transaction' });
  }
});

// --- ADMIN: Reset/Clear data endpoints ---

// Reset all user signups (clear user_trials)
app.post('/admin/reset-signups', authenticateAdmin, async (req, res) => {
  try {
    // Clear in-memory
    userTrials.clear();
    
    // Clear from DB if configured
    if (rootSupabase) {
      const { error } = await rootSupabase
        .from('user_trials')
        .delete()
        .neq('email', ''); // Delete all rows
      
      if (error) {
        console.error('Error clearing user_trials from DB:', error);
        return res.status(500).json({ success: false, error: 'Failed to clear user_trials from database', detail: error.message });
      }
    }
    
    console.log('✓ All user signups reset');
    res.json({ success: true, message: 'All user signups cleared from memory and database' });
  } catch (err) {
    console.error('Reset signups error:', err);
    res.status(500).json({ success: false, error: 'Failed to reset signups' });
  }
});

// Reset all user logins (clear user_logins)
app.post('/admin/reset-logins', authenticateAdmin, async (req, res) => {
  try {
    // Clear in-memory
    userLogins.length = 0;
    
    // Clear from DB if configured
    if (rootSupabase) {
      const { error } = await rootSupabase
        .from('user_logins')
        .delete()
        .neq('email', ''); // Delete all rows
      
      if (error) {
        console.error('Error clearing user_logins from DB:', error);
        return res.status(500).json({ success: false, error: 'Failed to clear user_logins from database', detail: error.message });
      }
    }
    
    console.log('✓ All user logins reset');
    res.json({ success: true, message: 'All user logins cleared from memory and database' });
  } catch (err) {
    console.error('Reset logins error:', err);
    res.status(500).json({ success: false, error: 'Failed to reset logins' });
  }
});

// Reset all processed transactions
app.post('/admin/reset-transactions', authenticateAdmin, async (req, res) => {
  try {
    // Clear in-memory
    processedTransactions.clear();
    
    // Clear from DB if configured
    if (rootSupabase) {
      const { error } = await rootSupabase
        .from('processed_transactions')
        .delete()
        .neq('transaction_id', ''); // Delete all rows
      
      if (error) {
        console.error('Error clearing processed_transactions from DB:', error);
        return res.status(500).json({ success: false, error: 'Failed to clear processed_transactions from database', detail: error.message });
      }
    }
    
    console.log('✓ All processed transactions reset');
    res.json({ success: true, message: 'All processed transactions cleared from memory and database' });
  } catch (err) {
    console.error('Reset transactions error:', err);
    res.status(500).json({ success: false, error: 'Failed to reset transactions' });
  }
});

// Reset ALL data (signups + logins + transactions)
app.post('/admin/reset-all', authenticateAdmin, async (req, res) => {
  try {
    const results = { signups: false, logins: false, transactions: false };
    const errors = [];
    
    // Clear in-memory
    userTrials.clear();
    userLogins.length = 0;
    processedTransactions.clear();
    
    // Clear from DB if configured
    if (rootSupabase) {
      // Clear user_trials
      const { error: e1 } = await rootSupabase.from('user_trials').delete().neq('email', '');
      if (e1) errors.push(`user_trials: ${e1.message}`);
      else results.signups = true;
      
      // Clear user_logins
      const { error: e2 } = await rootSupabase.from('user_logins').delete().neq('email', '');
      if (e2) errors.push(`user_logins: ${e2.message}`);
      else results.logins = true;
      
      // Clear processed_transactions
      const { error: e3 } = await rootSupabase.from('processed_transactions').delete().neq('transaction_id', '');
      if (e3) errors.push(`processed_transactions: ${e3.message}`);
      else results.transactions = true;
    } else {
      results.signups = true;
      results.logins = true;
      results.transactions = true;
    }
    
    console.log('✓ All data reset:', results);
    
    if (errors.length > 0) {
      return res.status(207).json({ 
        success: false, 
        message: 'Partial reset completed', 
        results, 
        errors 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'All data cleared from memory and database', 
      results 
    });
  } catch (err) {
    console.error('Reset all error:', err);
    res.status(500).json({ success: false, error: 'Failed to reset all data' });
  }
});

// --- ADMIN: View user logins ---
app.get('/admin/user-logins', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const emailFilter = req.query.email || null;
    
    // Try to get from DB first, fallback to in-memory
    let logins = [];
    
    if (rootSupabase) {
      logins = await loadRecentLoginsFromDB(limit, emailFilter);
    }
    
    // If DB returns nothing or not configured, use in-memory
    if (logins.length === 0 && userLogins.length > 0) {
      logins = userLogins
        .filter(l => !emailFilter || l.email === emailFilter)
        .slice(-limit)
        .reverse();
    }
    
    res.json({ 
      success: true, 
      logins,
      count: logins.length,
      source: logins.length > 0 && logins[0].id ? 'database' : 'memory'
    });
  } catch (err) {
    console.error('Get user logins error:', err);
    res.status(500).json({ success: false, error: 'Failed to get user logins' });
  }
});

// --- ADMIN: View all users ---
app.get('/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    
    let users = [];
    
    // Try to get from DB first
    if (rootSupabase) {
      const { data, error } = await rootSupabase
        .from('user_trials')
        .select('*')
        .order('registered_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error loading users from DB:', error);
      } else {
        users = (data || []).map(u => ({
          email: u.email,
          registeredAt: u.registered_at,
          credits: u.credits || 0,
          paidAmount: u.paid_amount || 0,
          isSubscribed: (u.paid_amount || 0) > 0,
          trialUsed: u.trial_used || false,
          ipAddress: u.ip_address || null
        }));
      }
    }
    
    // Fallback to in-memory if DB empty or failed
    if (users.length === 0 && userTrials.size > 0) {
      users = Array.from(userTrials.entries()).map(([email, userData]) => ({
        email,
        registeredAt: userData.registeredAt,
        credits: userData.credits || 0,
        paidAmount: userData.paidAmount || 0,
        isSubscribed: (userData.paidAmount || 0) > 0,
        trialUsed: userData.trialUsed || false,
        ipAddress: userData.ipAddress || null
      }));
    }
    
    res.json({ 
      success: true, 
      users,
      count: users.length,
      source: users.length > 0 && users[0].registeredAt instanceof Date ? 'memory' : 'database'
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
});