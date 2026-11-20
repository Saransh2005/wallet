import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function LedgerDrawer({ account, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getLedger(account.id, { page: 0, size: 50 })
      .then((page) => {
        if (!cancelled) setEntries(page.content);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account.id]);

  function exportCSV() {
    if (!entries.length) return;
    const header = ['Entry ID', 'Type', 'Amount', 'Balance After', 'Timestamp'];
    const rows = entries.map((e) => [
      e.id,
      e.entryType,
      Number(e.amount).toFixed(2),
      Number(e.balanceAfter).toFixed(2),
      new Date(e.createdAt).toISOString(),
    ]);
    const csvContent = [header, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${account.ownerName.toLowerCase().replace(/\s+/g, '-')}-${account.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalDebits = entries
    .filter((e) => e.entryType === 'DEBIT')
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const totalCredits = entries
    .filter((e) => e.entryType === 'CREDIT')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Audit Ledger: {account.ownerName}</h3>
            <span className="modal-subtitle">Immutable Double-Entry Financial Journal</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-account-bar">
          <div>
            <span className="mono text-muted" style={{ fontSize: 12 }}>
              Account ID: {account.id}
            </span>
          </div>
          <div className="modal-balance-badge">
            Current Balance: <strong>{Number(account.balance).toFixed(2)} {account.currency}</strong>
          </div>
        </div>

        {/* Audit Stats Banner */}
        {entries.length > 0 && (
          <div className="ledger-stats-banner">
            <div className="stat-pill debits">
              <span>Total Debits:</span>
              <strong>-${totalDebits.toFixed(2)} {account.currency}</strong>
            </div>
            <div className="stat-pill credits">
              <span>Total Credits:</span>
              <strong>+${totalCredits.toFixed(2)} {account.currency}</strong>
            </div>
            <button className="export-btn" onClick={exportCSV}>
              📥 Export CSV
            </button>
          </div>
        )}

        <div className="modal-body">
          {error && <div className="error-banner">{error}</div>}
          {loading ? (
            <div className="empty-state">Loading immutable ledger records…</div>
          ) : entries.length === 0 ? (
            <div className="empty-state">No ledger entries recorded for this account yet.</div>
          ) : (
            <table className="activity">
              <thead>
                <tr>
                  <th>Entry Type</th>
                  <th>Amount</th>
                  <th>Balance After</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className={`pill ${e.entryType.toLowerCase()}`}>
                        {e.entryType === 'DEBIT' ? '↓ DEBIT' : '↑ CREDIT'}
                      </span>
                    </td>
                    <td className={`mono ${e.entryType === 'DEBIT' ? 'text-danger' : 'text-success'}`}>
                      {e.entryType === 'DEBIT' ? '-' : '+'}
                      {Number(e.amount).toFixed(2)} {account.currency}
                    </td>
                    <td className="mono font-semibold">
                      {Number(e.balanceAfter).toFixed(2)} {account.currency}
                    </td>
                    <td className="text-muted">{new Date(e.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
