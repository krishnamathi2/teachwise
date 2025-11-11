import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Admin panel state
  const [config, setConfig] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCreditsPerGenerate, setNewCreditsPerGenerate] = useState('');
  const [newTrialCredits, setNewTrialCredits] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Reset users state
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      fetchData(savedToken);
    }
  }, []);

  // Auto-refresh data every 10 seconds for live updates
  useEffect(() => {
    let intervalId;
    
    if (isAuthenticated && token && autoRefresh) {
      // Set up auto-refresh interval
      intervalId = setInterval(() => {
        fetchData(token);
      }, 10000); // Refresh every 10 seconds
    }
    
    // Cleanup interval on unmount or when authentication changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, token, autoRefresh]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();
      
      if (data.success) {
        const newToken = data.token;
        setToken(newToken);
        setIsAuthenticated(true);
        localStorage.setItem('adminToken', newToken);
        fetchData(newToken);
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('Connection error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken('');
    localStorage.removeItem('adminToken');
    setConfig(null);
    setUsers([]);
  };

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const fetchData = async (authToken = token) => {
    try {
      setLoading(true);
      
      // Fetch config
      const configResponse = await fetch('/api/admin/credits-config', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (configResponse.status === 401 || configResponse.status === 403) {
        handleLogout();
        return;
      }
      
      const configData = await configResponse.json();
      if (configData.success) {
        setConfig(configData.config);
        setNewCreditsPerGenerate(configData.config.CREDITS_PER_GENERATE);
        setNewTrialCredits(configData.config.FREE_TRIAL_CREDITS);
      }
      
      // Fetch users
      const usersResponse = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const usersData = await usersResponse.json();
      if (usersData.success) {
        setUsers(usersData.users || []);
      }
      
    } catch (err) {
      setError('Failed to fetch admin data');
      console.error(err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  const updateCreditsPerGenerate = async () => {
    try {
      const response = await fetch('/api/admin/update-credits-per-generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ creditsPerGenerate: newCreditsPerGenerate })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage(data.message);
        setConfig(data.config);
        setError('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update credits per generate');
    }
  };

  const updateTrialCredits = async () => {
    try {
      const response = await fetch('/api/admin/update-trial-credits', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ trialCredits: newTrialCredits })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage(data.message);
        setConfig(data.config);
        setError('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update trial credits');
    }
  };

  const addCreditsToUser = async (email, credits) => {
    try {
      const response = await fetch('/api/admin/add-credits', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email, credits })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage(data.message);
        fetchData(); // Refresh data
        setError('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to add credits');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    // Validate password length
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage(data.message);
        setError('');
        setShowPasswordChange(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        
        if (data.warning) {
          setMessage(data.message + ' ' + data.warning);
        }
      } else {
        setPasswordError(data.error);
      }
    } catch (err) {
      setPasswordError('Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Reset all users function
  const handleResetUsers = async () => {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL user email IDs and data. This action cannot be undone. Are you sure?')) {
      return;
    }
    
    try {
      setResetLoading(true);
      setError('');
      setMessage('');
      
      const response = await fetch('/api/admin/reset-users', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        setUsers([]); // Clear users immediately in UI
        setError('');
        await fetchData(); // Refresh all data
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to reset users');
    } finally {
      setResetLoading(false);
    }
  };

  // Login form
  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>Admin Login - TeachWise</title>
        </Head>
        
        <div className="login-container">
          <div className="login-card">
            <h1>🔐 Admin Login</h1>
            <p>Enter your credentials to access the TeachWise admin panel</p>
            
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                  required
                  placeholder="Enter admin username"
                />
              </div>
              
              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  required
                  placeholder="Enter admin password"
                />
              </div>
              
              {loginError && (
                <div className="login-error">
                  ❌ {loginError}
                </div>
              )}
              
              <button type="submit" disabled={loginLoading} className="login-btn">
                {loginLoading ? '🔄 Logging in...' : '🚀 Login'}
              </button>
            </form>
            
            <div className="login-footer">
              <a href="/" className="back-link">← Back to TeachWise</a>
            </div>
          </div>
        </div>

        <style jsx>{`
          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          }

          .login-card {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
            text-align: center;
          }

          .login-card h1 {
            margin: 0 0 10px 0;
            color: #1f2937;
            font-size: 28px;
          }

          .login-card p {
            margin: 0 0 30px 0;
            color: #6b7280;
            font-size: 14px;
          }

          .form-group {
            margin-bottom: 20px;
            text-align: left;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #374151;
          }

          .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.2s;
            box-sizing: border-box;
          }

          .form-group input:focus {
            outline: none;
            border-color: #3b82f6;
          }

          .login-error {
            background: #fee2e2;
            color: #991b1b;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
          }

          .login-btn {
            width: 100%;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 14px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          }

          .login-btn:hover:not(:disabled) {
            background: #2563eb;
          }

          .login-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }

          .login-footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }

          .back-link {
            color: #6b7280;
            text-decoration: none;
            font-size: 14px;
          }

          .back-link:hover {
            text-decoration: underline;
          }
        `}</style>
      </>
    );
  }

  // Admin panel (authenticated)
  if (loading && !config) {
    return (
      <div className="admin-loading">
        <h2>Loading Admin Panel...</h2>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>TeachWise Admin Panel</title>
      </Head>
      
      <div className="admin-panel">
        <header className="admin-header">
          <h1>🛠️ TeachWise Admin Panel</h1>
          <div className="header-controls">
            <div className="live-update-controls">
              <label className="auto-refresh-toggle">
                <input 
                  type="checkbox" 
                  checked={autoRefresh} 
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span>🔄 Auto-refresh</span>
              </label>
              {lastUpdated && (
                <span className="last-updated">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="auth-controls">
              <a href="/" className="back-link">← Back to App</a>
              <button 
                onClick={() => setShowPasswordChange(true)} 
                className="change-password-btn"
              >
                🔑 Change Password
              </button>
              <button onClick={handleLogout} className="logout-btn">🚪 Logout</button>
            </div>
          </div>
        </header>

        {/* Password Change Modal */}
        {showPasswordChange && (
          <div className="modal-overlay" onClick={() => setShowPasswordChange(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>🔑 Change Admin Password</h2>
                <button 
                  className="modal-close" 
                  onClick={() => setShowPasswordChange(false)}
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label>Current Password:</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    required
                    placeholder="Enter current password"
                  />
                </div>
                
                <div className="form-group">
                  <label>New Password:</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    required
                    placeholder="Enter new password (min 6 characters)"
                    minLength="6"
                  />
                </div>
                
                <div className="form-group">
                  <label>Confirm New Password:</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    required
                    placeholder="Confirm new password"
                    minLength="6"
                  />
                </div>
                
                {passwordError && (
                  <div className="password-error">
                    ❌ {passwordError}
                  </div>
                )}
                
                <div className="modal-actions">
                  <button 
                    type="button" 
                    onClick={() => setShowPasswordChange(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={passwordLoading}
                    className="submit-btn"
                  >
                    {passwordLoading ? '🔄 Changing...' : '🔑 Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {message && (
          <div className="admin-message success">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="admin-message error">
            ❌ {error}
          </div>
        )}

        <div className="admin-grid">
          {/* Credits Configuration */}
          <section className="admin-card">
            <h2>Credits Configuration</h2>
            {config && (
              <div className="config-display">
                <div className="config-item">
                  <strong>Current Credits per Generate:</strong> {config.CREDITS_PER_GENERATE}
                </div>
                <div className="config-item">
                  <strong>Free Trial Credits:</strong> {config.FREE_TRIAL_CREDITS}
                </div>
                <div className="config-item">
                  <strong>Trial Period:</strong> {config.TRIAL_PERIOD_DAYS} days
                </div>
                <div className="config-item">
                  <strong>Price per Credit:</strong> ₹{config.PRICE_PER_CREDIT}
                </div>
              </div>
            )}

            <div className="admin-controls">
              <div className="control-group">
                <label>Credits per Generate:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newCreditsPerGenerate}
                  onChange={(e) => setNewCreditsPerGenerate(e.target.value)}
                />
                <button onClick={updateCreditsPerGenerate} className="update-btn">
                  Update
                </button>
              </div>

              <div className="control-group">
                <label>Free Trial Credits:</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={newTrialCredits}
                  onChange={(e) => setNewTrialCredits(e.target.value)}
                />
                <button onClick={updateTrialCredits} className="update-btn">
                  Update
                </button>
              </div>
            </div>
          </section>

          {/* Users Management */}
          <section className="admin-card">
            <h2>Users Management</h2>
            <div className="users-stats">
              <div className="stat">
                <strong>Total Users:</strong> {users.length}
              </div>
              <div className="stat">
                <strong>Paid Users:</strong> {users.filter(u => u.isPaidUser).length}
              </div>
              <div className="stat">
                <strong>Trial Users:</strong> {users.filter(u => !u.isPaidUser).length}
              </div>
            </div>

            <div className="users-actions">
              <button 
                onClick={handleResetUsers} 
                className="reset-btn"
                disabled={resetLoading || users.length === 0}
              >
                {resetLoading ? '🔄 Resetting...' : '🗑️ Reset All Users'}
              </button>
              {users.length === 0 && (
                <p className="no-users-message">No users to reset</p>
              )}
            </div>

            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Credits</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={index}>
                      <td className="user-email">{user.email}</td>
                      <td className="user-credits">{user.credits}</td>
                      <td>{user.daysElapsed.toFixed(1)}</td>
                      <td>
                        {user.isPaidUser ? (
                          <span className="status paid">Paid (₹{user.paidAmount})</span>
                        ) : user.isTrialExpired ? (
                          <span className="status expired">Trial Expired</span>
                        ) : (
                          <span className="status active">Trial Active</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => addCreditsToUser(user.email, 50)}
                          className="add-credits-btn"
                          title="Add 50 credits"
                        >
                          +50 Credits
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <button onClick={() => fetchData()} className="refresh-btn">
          🔄 Refresh Data
        </button>
      </div>

      <style jsx>{`
        .admin-panel {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          background: #f8fafc;
          min-height: 100vh;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .admin-header h1 {
          margin: 0;
          color: #1f2937;
        }

        .header-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: flex-end;
        }

        .live-update-controls {
          display: flex;
          gap: 15px;
          align-items: center;
          font-size: 0.9rem;
        }

        .auto-refresh-toggle {
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          color: #374151;
        }

        .auto-refresh-toggle input[type="checkbox"] {
          margin: 0;
        }

        .last-updated {
          color: #6b7280;
          font-size: 0.8rem;
          font-style: italic;
        }

        .auth-controls {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .back-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .logout-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .logout-btn:hover {
          background: #dc2626;
        }

        .change-password-btn {
          background: #8b5cf6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
          margin-right: 10px;
        }

        .change-password-btn:hover {
          background: #7c3aed;
        }

        .admin-message {
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .admin-message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .admin-message.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .admin-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 30px;
          margin-bottom: 30px;
        }

        .admin-card {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .admin-card h2 {
          margin: 0 0 20px 0;
          color: #1f2937;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
        }

        .config-display {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .config-item {
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
        }

        .admin-controls {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .control-group label {
          min-width: 150px;
          font-weight: 500;
        }

        .control-group input {
          padding: 8px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          width: 100px;
        }

        .update-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .update-btn:hover {
          background: #2563eb;
        }

        .reset-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
          font-size: 14px;
        }

        .reset-btn:hover:not(:disabled) {
          background: #b91c1c;
        }

        .reset-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .users-actions {
          margin-bottom: 20px;
          padding: 15px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
        }

        .no-users-message {
          margin: 10px 0 0 0;
          color: #6b7280;
          font-style: italic;
          font-size: 14px;
        }

        .users-stats {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .stat {
          background: #f3f4f6;
          padding: 10px 15px;
          border-radius: 6px;
          font-size: 14px;
        }

        .users-table {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }

        .user-email {
          font-family: monospace;
          font-size: 12px;
        }

        .user-credits {
          font-weight: 600;
          color: #059669;
        }

        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status.paid {
          background: #d1fae5;
          color: #065f46;
        }

        .status.active {
          background: #dbeafe;
          color: #1e40af;
        }

        .status.expired {
          background: #fee2e2;
          color: #991b1b;
        }

        .add-credits-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        }

        .add-credits-btn:hover {
          background: #059669;
        }

        .refresh-btn {
          background: #6b7280;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          display: block;
          margin: 0 auto;
        }

        .refresh-btn:hover {
          background: #4b5563;
        }

        .admin-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          gap: 20px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-left: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          color: #1f2937;
          font-size: 20px;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #6b7280;
          padding: 5px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .modal-close:hover {
          background: #f3f4f6;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #374151;
        }

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .password-error {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .modal-actions {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
          margin-top: 25px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .cancel-btn {
          background: #6b7280;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .cancel-btn:hover {
          background: #4b5563;
        }

        .submit-btn {
          background: #8b5cf6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          background: #7c3aed;
        }

        .submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .admin-grid {
            grid-template-columns: 1fr;
          }
          
          .control-group {
            flex-direction: column;
            align-items: stretch;
          }
          
          .control-group label {
            min-width: auto;
          }
        }
      `}</style>
    </>
  );
}