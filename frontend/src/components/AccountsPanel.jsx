import { useState } from 'react';

function formatMoney(value, currency) {
  const n = Number(value);
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default function AccountsPanel({ accounts, loading, onSelectAccount, onCreateAccount }) {
  const [showForm, setShowForm] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [initialBalance, setInitialBalance] = useState('1000.00');
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ownerName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreateAccount({ ownerName: ownerName.trim(), currency, initialBalance: Number(initialBalance) });
      setOwnerName('');
      setInitialBalance('1000.00');
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredAccounts = accounts.filter(
    (a) =>
      a.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>Accounts ({accounts.length})</h2>
          <span className="card-subtitle">Wallets &amp; Real-time Balances</span>
        </div>
        <button className="primary-sm-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New Account'}
        </button>
      </div>

      {showForm && (
        <form className="stacked form-elevated" onSubmit={handleSubmit} style={{ marginBottom: 18 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Create New Wallet</h3>
          {error && <div className="error-banner">{error}</div>}
          <div className="field">
            <label>Wallet Owner Name</label>
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
              placeholder="e.g. Saransh Singh, Alice, Corporate Reserve"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Currency</label>
              <div className="currency-selector">
                {['USD', 'EUR', 'INR', 'GBP'].map((curr) => (
                  <button
                    type="button"
                    key={curr}
                    className={`currency-pill ${currency === curr ? 'active' : ''}`}
                    onClick={() => setCurrency(curr)}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Initial Balance</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                required
              />
            </div>
          </div>
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating Wallet…' : 'Create Wallet'}
          </button>
        </form>
      )}

      {accounts.length > 5 && (
        <div className="search-bar-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search accounts by name or currency..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {loading && accounts.length === 0 ? (
        <div className="empty-state">Loading accounts from ledger…</div>
      ) : accounts.length === 0 ? (
        <div className="empty-state">
          <p>No accounts yet.</p>
          <p className="empty-hint">Click <strong>+ New Account</strong> or <strong>✨ Seed Demo Accounts</strong> to get started.</p>
        </div>
      ) : (
        <ul className="account-list">
          {filteredAccounts.map((a) => (
            <li key={a.id} className="account-item">
              <div className="account-info">
                <div className="account-owner">
                  <span className="account-avatar">{a.ownerName.charAt(0).toUpperCase()}</span>
                  <div>
                    <span className="owner-title">{a.ownerName}</span>
                    <span className="account-id-chip">{a.id.slice(0, 8)}…</span>
                  </div>
                </div>
              </div>
              <div className="account-actions">
                <div className="account-balance">{formatMoney(a.balance, a.currency)}</div>
                <button
                  className="link ledger-btn"
                  onClick={() => onSelectAccount(a)}
                  title="Inspect Double-Entry Audit Trail"
                >
                  View Ledger ↗
                </button>
              </div>
            </li>
          ))}
          {filteredAccounts.length === 0 && accounts.length > 0 && (
            <div className="empty-state">No matching accounts found for "{searchTerm}".</div>
          )}
        </ul>
      )}
    </div>
  );
}
