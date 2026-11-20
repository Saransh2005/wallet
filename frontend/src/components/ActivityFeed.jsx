import { useState } from 'react';
import StatusPill from './StatusPill.jsx';

function shortId(id) {
  return id ? `${id.slice(0, 8)}…` : '';
}

function relativeTime(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(iso).toLocaleTimeString();
}

export default function ActivityFeed({ payments, accountsById, loading }) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyId = (id) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
    const fromName = accountsById[p.fromAccountId]?.ownerName || '';
    const toName = accountsById[p.toAccountId]?.ownerName || '';
    const matchesSearch =
      fromName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      toName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.amount.toString().includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>Real-Time Activity Feed</h2>
          <span className="card-subtitle">Live Kafka event stream &amp; audit history</span>
        </div>
        <div className="feed-header-controls">
          <div className="status-filters">
            {['ALL', 'COMPLETED', 'PENDING', 'FAILED'].map((st) => (
              <button
                key={st}
                className={`filter-btn ${filterStatus === st ? 'active' : ''}`}
                onClick={() => setFilterStatus(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {payments.length > 3 && (
        <div className="search-bar-wrapper" style={{ marginBottom: 12 }}>
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Filter payments by party, transaction ID, or amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {loading && payments.length === 0 ? (
        <div className="empty-state">Loading transactions from Kafka &amp; database…</div>
      ) : payments.length === 0 ? (
        <div className="empty-state">No payments submitted yet. Execute a transfer above to watch it settle live!</div>
      ) : (
        <div className="table-wrapper">
          <table className="activity">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Sender (From)</th>
                <th>Recipient (To)</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id}>
                  <td>
                    <button
                      className="tx-copy-btn"
                      onClick={() => handleCopyId(p.id)}
                      title={`Copy full ID: ${p.id}`}
                    >
                      {shortId(p.id)} {copiedId === p.id ? '✓' : '⧉'}
                    </button>
                  </td>
                  <td>
                    {accountsById[p.fromAccountId]?.ownerName ? (
                      <span className="account-tag">{accountsById[p.fromAccountId]?.ownerName}</span>
                    ) : (
                      <span className="mono">{shortId(p.fromAccountId)}</span>
                    )}
                  </td>
                  <td>
                    {accountsById[p.toAccountId]?.ownerName ? (
                      <span className="account-tag recipient">{accountsById[p.toAccountId]?.ownerName}</span>
                    ) : (
                      <span className="mono">{shortId(p.toAccountId)}</span>
                    )}
                  </td>
                  <td className="mono font-semibold">
                    {Number(p.amount).toFixed(2)} {p.currency}
                  </td>
                  <td>
                    <StatusPill status={p.status} />
                  </td>
                  <td className="text-muted" title={new Date(p.createdAt).toLocaleString()}>
                    {relativeTime(p.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPayments.length === 0 && payments.length > 0 && (
            <div className="empty-state">No transactions match current filters.</div>
          )}
        </div>
      )}
    </div>
  );
}
