import { useState } from 'react';
import StatusPill from './StatusPill.jsx';

export default function SendPaymentForm({ accounts, onSubmitPayment }) {
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('25.00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);

  function handleSwap() {
    setFromAccountId(toAccountId);
    setToAccountId(fromAccountId);
  }

  function handleQuickAmount(val) {
    setAmount(val.toString());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fromAccountId || !toAccountId) {
      setError('Choose both a sender and recipient account.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setError('Sender and recipient accounts must be different.');
      return;
    }
    if (fromAccount && Number(fromAccount.balance) < Number(amount)) {
      setError(`Insufficient funds in sender account (Balance: ${Number(fromAccount.balance).toFixed(2)} ${fromAccount.currency}).`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const { submitted, settle } = onSubmitPayment({
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        currency: fromAccount?.currency || 'USD',
      });

      const submittedPayment = await submitted;
      setResult({ payment: submittedPayment, settled: false });

      const settledPayment = await settle;
      setResult({ payment: settledPayment, settled: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const presetAmounts = [10, 50, 100, 250, 500];

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>Send Payment</h2>
          <span className="card-subtitle">Transactional Outbox → Kafka → Double-Entry Ledger</span>
        </div>
        <span className="hint-pill">Async Settlement</span>
      </div>

      <form className="stacked" onSubmit={handleSubmit}>
        {error && <div className="error-banner">{error}</div>}

        <div className="field">
          <div className="field-header">
            <label>From Account (Sender)</label>
            {fromAccount && (
              <span className="field-hint">
                Available: <strong>{Number(fromAccount.balance).toFixed(2)} {fromAccount.currency}</strong>
              </span>
            )}
          </div>
          <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} required>
            <option value="">Select source wallet…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.ownerName} ({Number(a.balance).toFixed(2)} {a.currency})
              </option>
            ))}
          </select>
        </div>

        <div className="swap-row">
          <button
            type="button"
            className="swap-btn"
            onClick={handleSwap}
            disabled={!fromAccountId && !toAccountId}
            title="Swap Sender and Recipient"
          >
            ⇅ Swap
          </button>
        </div>

        <div className="field">
          <label>To Account (Recipient)</label>
          <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required>
            <option value="">Select destination wallet…</option>
            {accounts
              .filter((a) => a.id !== fromAccountId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.ownerName} ({Number(a.balance).toFixed(2)} {a.currency})
                </option>
              ))}
          </select>
        </div>

        <div className="field">
          <label>Transfer Amount ({fromAccount?.currency || 'USD'})</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <div className="preset-amounts">
            {presetAmounts.map((val) => (
              <button
                type="button"
                key={val}
                className={`preset-chip ${amount === val.toString() ? 'active' : ''}`}
                onClick={() => handleQuickAmount(val)}
              >
                ${val}
              </button>
            ))}
          </div>
        </div>

        <button className="primary" type="submit" disabled={submitting || accounts.length < 2}>
          {submitting ? 'Dispatching to Outbox…' : 'Execute Transfer'}
        </button>
      </form>

      {result && (
        <div className="settlement-preview">
          <div className="settlement-header">
            <span>Transaction: <code>{result.payment.id.slice(0, 8)}…</code></span>
            <StatusPill status={result.payment.status} />
          </div>
          <p className="settlement-text">
            {result.settled
              ? '✓ Settled through Kafka consumer into double-entry ledger.'
              : '⚡ Queued in Outbox table — streaming to Kafka...'}
          </p>
        </div>
      )}
    </div>
  );
}
