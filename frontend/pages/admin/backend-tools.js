import { useState, useEffect } from 'react';

export default function BackendTools() {
  const [token, setToken] = useState('');
  const [sql, setSql] = useState('');
  const [output, setOutput] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [logins, setLogins] = useState([]);
  const [users, setUsers] = useState([]);
  const [loginFilter, setLoginFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [txForm, setTxForm] = useState({ transactionId: '', email: '', amount: '', planType: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [creditForm, setCreditForm] = useState({ email: '', credits: '', paidAmount: '', action: 'add' });
  const [pendingPayments, setPendingPayments] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Auto-load users when token is set
  useEffect(() => {
    if (token && users.length === 0) {
      listUsers();
    }
  }, [token]);

  const headers = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  async function fetchSql() {
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/admin/migration-sql', { headers: headers() });
      const j = await res.json();
      if (j.success) setSql(j.sql || '');
      else setOutput(JSON.stringify(j));
    } catch (err) {
      setOutput(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function runMigration() {
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/admin/run-migration', { method: 'POST', headers: headers() });
      const j = await res.json();
      setOutput(JSON.stringify(j, null, 2));
    } catch (err) {
      setOutput(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function reloadProcessed() {
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/admin/reload-processed-transactions', { method: 'POST', headers: headers() });
      const j = await res.json();
      setOutput(JSON.stringify(j, null, 2));
    } catch (err) {
      setOutput(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function listTransactions() {
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/admin/processed-transactions', { headers: headers() });
      const j = await res.json();
      if (j.success) setTransactions(j.transactions || []);
      else setOutput(JSON.stringify(j));
    } catch (err) {
      setOutput(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function addTransaction(e) {
    e.preventDefault();
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/admin/add-processed-transaction', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(txForm),
      });
      const j = await res.json();
      setOutput(JSON.stringify(j, null, 2));
    } catch (err) {
      setOutput(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function resetSignups() {
    if (!confirm('⚠️ DANGER: This will delete ALL user signups from memory and database. Are you sure?')) return;
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/admin/reset-signups', { method: 'POST', headers: headers() });
      const j = await res.json();
      setOutput(JSON.stringify(j, null, 2));
    } catch (err) {
      setOutput(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function resetLogins() {
    if (!confirm('⚠️ DANGER: This will delete ALL user logins from memory and database. Are you sure?')) return;
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/admin/reset-logins', { method: 'POST', headers: headers() });
      const j = await res.json();
      setOutput(JSON.stringify(j, null, 2));
    } catch (err) {
      setOutput(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function resetTransactions() {
    if (!confirm('⚠️ DANGER: This will delete ALL processed transactions from memory and database. Are you sure?')) return;
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/admin/reset-transactions', { method: 'POST', headers: headers() });
      const j = await res.json();
      setOutput(JSON.stringify(j, null, 2));
    } catch (err) {
      setOutput(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function resetAll() {
    if (!confirm('⚠️⚠️ EXTREME DANGER: This will delete ALL data (signups, logins, transactions) from memory and database. Are you ABSOLUTELY sure?')) return;
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/admin/reset-all', { method: 'POST', headers: headers() });
      const j = await res.json();
      setOutput(JSON.stringify(j, null, 2));
    } catch (err) {
      setOutput(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function listLogins() {
    setLoading(true);
    setOutput('');
    try {
      const url = `/api/admin/user-logins?limit=100${loginFilter ? `&email=${encodeURIComponent(loginFilter)}` : ''}`;
      const res = await fetch(url, { headers: headers() });
      const j = await res.json();
      if (j.success) setLogins(j.logins || []);
      else setOutput(JSON.stringify(j));
    } catch (err) {
      setOutput(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function listUsers() {
    setUsersLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/admin/users?limit=100', { headers: headers() });
      const j = await res.json();
      
      // Handle both response formats: {success: true, users: []} and {totalUsers: N, users: []}
      const userList = j.users || [];
      
      if (j.success === true || j.totalUsers !== undefined || userList.length > 0) {
        // Map the data to consistent format with new fields
        const mappedUsers = userList.map(u => ({
          email: u.email,
          registeredAt: u.registeredAt,
          credits: u.credits || 0,
          paidAmount: u.paidAmount || u.paid_amount || 0,
          isSubscribed: (u.paidAmount || u.paid_amount || 0) > 0 || u.isPaidUser || false,
          trialUsed: u.trialUsed || u.trial_used || false,
          ipAddress: u.ipAddress || u.ip_address || null
        }));
        
        setUsers(mappedUsers);
        if (mappedUsers.length === 0) {
          setOutput('No users found in database. Users will appear here after they sign up.');
        }
      } else {
        setOutput(JSON.stringify(j));
      }
    } catch (err) {
      setOutput('Error loading users: ' + String(err));
      console.error('Error loading users:', err);
    } finally {
      setUsersLoading(false);
    }
  }

  async function updateUserCredits(e) {
    e.preventDefault();
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/admin/update-credits', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          email: creditForm.email,
          credits: creditForm.credits ? parseInt(creditForm.credits) : undefined,
          paidAmount: creditForm.paidAmount ? parseInt(creditForm.paidAmount) : undefined,
          action: creditForm.action
        }),
      });
      const j = await res.json();
      
      if (j.success) {
        setOutput(`✅ Credits updated successfully!\n\n${JSON.stringify(j.user, null, 2)}`);
        // Refresh users list
        await listUsers();
        // Reset form
        setCreditForm({ email: '', credits: '', paidAmount: '', action: 'add' });
        setEditingUser(null);
      } else {
        setOutput(`❌ Error: ${j.error}\n\n${JSON.stringify(j, null, 2)}`);
      }
    } catch (err) {
      setOutput(`❌ Error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  function startEditingUser(user) {
    setEditingUser(user.email);
    setCreditForm({
      email: user.email,
      credits: user.credits.toString(),
      paidAmount: user.paidAmount.toString(),
      action: 'set'
    });
    // Scroll to form
    document.getElementById('credit-update-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function loadPendingPayments() {
    setPendingLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/admin/pending-payments', { headers: headers() });
      const j = await res.json();
      if (j.success) {
        setPendingPayments(j.pendingPayments || []);
        setOutput(`Loaded ${j.totalPending || 0} pending payment(s)`);
      } else {
        setOutput(JSON.stringify(j));
      }
    } catch (err) {
      setOutput('Error loading pending payments: ' + String(err));
    } finally {
      setPendingLoading(false);
    }
  }

  async function approvePayment(paymentId, email, amount) {
    if (!confirm(`Approve payment from ${email} for ₹${amount}? This will add credits to their account.`)) return;
    setPendingLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/admin/approve-payment', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ paymentId })
      });
      const j = await res.json();
      if (j.success) {
        setOutput(`✅ Payment approved! Added ${j.creditsAdded} credits to ${j.email}. Total: ${j.totalCredits}`);
        // Reload pending payments and users list
        loadPendingPayments();
        listUsers();
      } else {
        setOutput(JSON.stringify(j));
      }
    } catch (err) {
      setOutput('Error approving payment: ' + String(err));
    } finally {
      setPendingLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <h1>🛠️ Backend Admin Panel</h1>

      <div style={{ marginBottom: 24, padding: 16, background: '#f8f9fa', borderRadius: 8, border: '1px solid #dee2e6' }}>
        <label style={{ fontWeight: 'bold', marginBottom: 8, display: 'block' }}>🔑 Admin JWT Token:</label>
        <input 
          style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #ced4da', borderRadius: 4 }} 
          value={token} 
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your admin JWT token here to unlock features"
        />
        {!token && <p style={{ color: '#6c757d', fontSize: '13px', margin: '8px 0 0 0' }}>💡 Tip: Get your token from the admin login endpoint</p>}
        {token && <p style={{ color: '#28a745', fontSize: '13px', margin: '8px 0 0 0' }}>✅ Token set - features unlocked!</p>}
      </div>

      <div style={{ margin: '12px 0' }}>
        <button onClick={fetchSql} disabled={loading}>Load Migration SQL</button>
        <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(sql); }} disabled={!sql}>Copy SQL</button>
        <button onClick={runMigration} disabled={loading}>Run Migration (server-side)</button>
        <button onClick={reloadProcessed} disabled={loading}>Reload Processed Transactions</button>
        <button onClick={listTransactions} disabled={loading}>List Processed Transactions</button>
      </div>

      <div style={{ margin: '24px 0', padding: '12px', background: '#fff3cd', border: '2px solid #ff6b6b' }}>
        <h3 style={{ color: '#d63031', marginTop: 0 }}>⚠️ Danger Zone - Reset Data</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={resetSignups} disabled={loading} style={{ background: '#ff6b6b', color: 'white', border: 'none', padding: '8px 12px', cursor: 'pointer' }}>Reset All Signups</button>
          <button onClick={resetLogins} disabled={loading} style={{ background: '#ff6b6b', color: 'white', border: 'none', padding: '8px 12px', cursor: 'pointer' }}>Reset All Logins</button>
          <button onClick={resetTransactions} disabled={loading} style={{ background: '#ff6b6b', color: 'white', border: 'none', padding: '8px 12px', cursor: 'pointer' }}>Reset All Transactions</button>
          <button onClick={resetAll} disabled={loading} style={{ background: '#d63031', color: 'white', border: 'none', padding: '8px 12px', cursor: 'pointer', fontWeight: 'bold' }}>🚨 RESET EVERYTHING</button>
        </div>
        <p style={{ fontSize: '12px', color: '#856404', margin: '8px 0 0 0' }}>
          These actions are IRREVERSIBLE and will delete data from both memory and database.
        </p>
      </div>

      <div style={{ margin: '12px 0' }}>
        <h3>Migration SQL</h3>
        <textarea style={{ width: '100%', height: 160 }} value={sql} readOnly />
      </div>

      <div style={{ margin: '12px 0' }}>
        <h3>Add Processed Transaction</h3>
        <form onSubmit={addTransaction}>
          <div>
            <input placeholder="transactionId" value={txForm.transactionId} onChange={e => setTxForm({ ...txForm, transactionId: e.target.value })} />
          </div>
          <div>
            <input placeholder="email" value={txForm.email} onChange={e => setTxForm({ ...txForm, email: e.target.value })} />
          </div>
          <div>
            <input placeholder="amount" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} />
          </div>
          <div>
            <input placeholder="planType (optional)" value={txForm.planType} onChange={e => setTxForm({ ...txForm, planType: e.target.value })} />
          </div>
          <div style={{ marginTop: 8 }}>
            <button type="submit" disabled={loading}>Add</button>
          </div>
        </form>
      </div>

      <div style={{ margin: '12px 0' }}>
        <h3>Processed Transactions (recent)</h3>
        <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #ddd', padding: 8 }}>
          {transactions.length === 0 ? <div>No transactions loaded</div> : (
            <ul>
              {transactions.map(t => (
                <li key={t.transaction_id || t.id}>
                  <strong>{t.transaction_id}</strong> — {t.email} — {t.amount} — {t.plan_type} — {t.created_at}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div id="credit-update-section" style={{ margin: '24px 0', padding: 20, background: '#f0f8ff', borderRadius: 8, border: '2px solid #3b82f6' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
          💳 Manual Credit Update
          {editingUser && <span style={{ fontSize: '14px', color: '#059669', fontWeight: 'normal' }}>(Editing: {editingUser})</span>}
        </h3>
        <form onSubmit={updateUserCredits}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', color: '#374151' }}>Email:</label>
            <input 
              type="email"
              placeholder="user@example.com" 
              value={creditForm.email} 
              onChange={e => setCreditForm({ ...creditForm, email: e.target.value })}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4 }}
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', color: '#374151' }}>Credits:</label>
              <input 
                type="number"
                placeholder="100" 
                value={creditForm.credits} 
                onChange={e => setCreditForm({ ...creditForm, credits: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', color: '#374151' }}>Paid Amount (₹):</label>
              <input 
                type="number"
                placeholder="100" 
                value={creditForm.paidAmount} 
                onChange={e => setCreditForm({ ...creditForm, paidAmount: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4 }}
              />
            </div>
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', color: '#374151' }}>Action:</label>
            <select 
              value={creditForm.action} 
              onChange={e => setCreditForm({ ...creditForm, action: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4 }}
            >
              <option value="set">Set (Replace current value)</option>
              <option value="add">Add (Increase by amount)</option>
              <option value="subtract">Subtract (Decrease by amount)</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                background: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                padding: '10px 20px', 
                borderRadius: 6, 
                cursor: 'pointer', 
                fontWeight: 'bold',
                flex: 1
              }}
            >
              {loading ? 'Updating...' : '✅ Update Credits'}
            </button>
            {editingUser && (
              <button 
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setCreditForm({ email: '', credits: '', paidAmount: '', action: 'add' });
                }}
                style={{ 
                  background: '#6b7280', 
                  color: 'white', 
                  border: 'none', 
                  padding: '10px 20px', 
                  borderRadius: 6, 
                  cursor: 'pointer' 
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        <p style={{ fontSize: '12px', color: '#4b5563', margin: '12px 0 0 0', lineHeight: '1.5' }}>
          <strong>How to use:</strong><br/>
          • <strong>Set:</strong> Replace the current value with the entered amount<br/>
          • <strong>Add:</strong> Add the entered amount to current balance<br/>
          • <strong>Subtract:</strong> Remove the entered amount from current balance
        </p>
      </div>

      <div style={{ margin: '24px 0', padding: 20, background: '#fff9db', borderRadius: 8, border: '2px solid #fbbf24' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#92400e', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
          <span>⏳ Pending Payment Approvals</span>
          <button 
            onClick={loadPendingPayments} 
            disabled={pendingLoading}
            style={{
              background: '#fbbf24',
              color: '#78350f',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {pendingLoading ? '⏳ Loading...' : '🔄 Load Pending'}
          </button>
        </h3>
        
        <div style={{ background: 'white', borderRadius: 6, border: '1px solid #fbbf24', padding: 12 }}>
          <p style={{ fontSize: '13px', color: '#78350f', marginBottom: 12 }}>
            ℹ️ These payments have been submitted by users and are awaiting manual verification before credits are added.
          </p>
          
          {pendingPayments.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
              {pendingLoading ? 'Loading...' : 'No pending payments. Click "Load Pending" to check.'}
            </div>
          ) : (
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead style={{ background: '#fef3c7', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #fbbf24' }}>Email</th>
                    <th style={{ padding: 10, textAlign: 'center', borderBottom: '2px solid #fbbf24' }}>Amount</th>
                    <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #fbbf24' }}>Transaction ID</th>
                    <th style={{ padding: 10, textAlign: 'center', borderBottom: '2px solid #fbbf24' }}>Plan</th>
                    <th style={{ padding: 10, textAlign: 'center', borderBottom: '2px solid #fbbf24' }}>Submitted</th>
                    <th style={{ padding: 10, textAlign: 'center', borderBottom: '2px solid #fbbf24' }}>Status</th>
                    <th style={{ padding: 10, textAlign: 'center', borderBottom: '2px solid #fbbf24' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.map((payment, idx) => (
                    <tr key={payment.id} style={{ background: idx % 2 === 0 ? 'white' : '#fefce8' }}>
                      <td style={{ padding: 10, borderBottom: '1px solid #fde68a' }}>
                        <strong>{payment.email}</strong>
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #fde68a', textAlign: 'center', fontWeight: 'bold', color: '#059669' }}>
                        ₹{payment.amount}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #fde68a', fontFamily: 'monospace', fontSize: '13px' }}>
                        {payment.transaction_id}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #fde68a', textAlign: 'center' }}>
                        <span style={{ 
                          background: payment.plan_type === 'premium' ? '#8b5cf6' : '#3b82f6',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {payment.plan_type || 'basic'}
                        </span>
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #fde68a', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                        {new Date(payment.submitted_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #fde68a', textAlign: 'center' }}>
                        <span style={{
                          background: payment.status === 'pending' ? '#fbbf24' : payment.status === 'approved' ? '#10b981' : '#ef4444',
                          color: payment.status === 'pending' ? '#78350f' : 'white',
                          padding: '4px 10px',
                          borderRadius: 4,
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {payment.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #fde68a', textAlign: 'center' }}>
                        {payment.status === 'pending' && (
                          <button
                            onClick={() => approvePayment(payment.id, payment.email, payment.amount)}
                            disabled={pendingLoading}
                            style={{
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          >
                            ✅ Approve
                          </button>
                        )}
                        {payment.status === 'approved' && (
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>Already approved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div style={{ margin: '24px 0', padding: 20, background: 'white', borderRadius: 8, border: '1px solid #dee2e6', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            👥 All Users & Credits
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ padding: '6px 12px', background: '#e3f2fd', color: '#1976d2', borderRadius: 20, fontSize: '14px', fontWeight: 'bold' }}>
              Total: {users.length} users
            </span>
            <button 
              onClick={listUsers} 
              disabled={usersLoading || !token}
              style={{ 
                padding: '8px 16px', 
                background: usersLoading ? '#95a5a6' : '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4, 
                cursor: usersLoading || !token ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {usersLoading ? '⏳ Loading...' : '🔄 Refresh Users'}
            </button>
          </div>
        </div>
        
        {!token ? (
          <div style={{ padding: 40, textAlign: 'center', background: '#fff3cd', borderRadius: 8, border: '1px solid #ffc107' }}>
            <p style={{ fontSize: 16, color: '#856404', margin: 0 }}>
              🔒 Please paste your admin JWT token above to view users
            </p>
          </div>
        ) : usersLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 16, color: '#666', margin: 0 }}>⏳ Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: '#f8f9fa', borderRadius: 8 }}>
            <p style={{ fontSize: 16, color: '#666', margin: 0 }}>
              📭 No users found. Users will appear here after they sign up.
            </p>
          </div>
        ) : (
          <div style={{ maxHeight: 500, overflow: 'auto', border: '1px solid #dee2e6', borderRadius: 4 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'left', fontWeight: 'bold' }}>📧 Email</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>💰 Credits</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>💳 Paid</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>Status</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>🔒 Trial Used</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'left', fontWeight: 'bold' }}>🌐 IP Address</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'left', fontWeight: 'bold' }}>📅 Registered</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>⚙️ Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8f9fa', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#e3f2fd'} onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#f8f9fa'}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      <strong style={{ color: '#212529' }}>{u.email}</strong>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                      <span style={{ 
                        color: u.credits > 50 ? '#28a745' : u.credits > 0 ? '#ffc107' : '#dc3545', 
                        fontWeight: 'bold',
                        fontSize: '16px'
                      }}>
                        {u.credits || 0}
                      </span>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>
                      ₹{(u.paidAmount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                      {u.isSubscribed ? (
                        <span style={{ background: '#28a745', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: '12px', fontWeight: 'bold' }}>✓ PAID</span>
                      ) : (
                        <span style={{ background: '#6c757d', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: '12px', fontWeight: 'bold' }}>○ TRIAL</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                      {u.trialUsed ? (
                        <span style={{ background: '#dc3545', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: '12px', fontWeight: 'bold' }}>✗ USED</span>
                      ) : (
                        <span style={{ background: '#17a2b8', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: '12px', fontWeight: 'bold' }}>✓ ACTIVE</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6', fontSize: '13px', color: '#6c757d', fontFamily: 'monospace' }}>
                      {u.ipAddress || u.ip_address || 'N/A'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6', fontSize: '13px', color: '#6c757d' }}>
                      {new Date(u.registeredAt).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                      <button
                        onClick={() => startEditingUser(u)}
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        ✏️ Edit Credits
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ margin: '12px 0' }}>
        <h3>User Logins</h3>
        <div style={{ marginBottom: 8 }}>
          <input 
            placeholder="Filter by email (optional)" 
            value={loginFilter} 
            onChange={e => setLoginFilter(e.target.value)}
            style={{ marginRight: 8, padding: '4px 8px' }}
          />
          <button onClick={listLogins} disabled={loading}>Load Logins</button>
        </div>
        <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', padding: 8 }}>
          {logins.length === 0 ? <div>No logins loaded</div> : (
            <ul style={{ fontSize: '13px' }}>
              {logins.map((l, idx) => (
                <li key={l.id || idx}>
                  <strong>{l.email}</strong> — {l.login_time || new Date(l.timestamp).toISOString()} — IP: {l.ip_address || l.ip} — {(l.user_agent || l.userAgent || '').substring(0, 50)}...
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <h3>Output / Result</h3>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f7f7f7', padding: 12 }}>{output}</pre>
      </div>
    </div>
  );
}
