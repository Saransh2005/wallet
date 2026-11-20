import { useCallback, useEffect, useState } from 'react';
import { api, pollPaymentUntilSettled } from './api.js';
import AccountsPanel from './components/AccountsPanel.jsx';
import SendPaymentForm from './components/SendPaymentForm.jsx';
import ActivityFeed from './components/ActivityFeed.jsx';
import LedgerDrawer from './components/LedgerDrawer.jsx';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const POLL_INTERVAL_MS = 3500;

export default function App() {
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendUp, setBackendUp] = useState(null);
  const [ledgerAccount, setLedgerAccount] = useState(null);
  const [toast, setToast] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const refreshAccounts = useCallback(async () => {
    const list = await api.listAccounts();
    setAccounts(list);
    return list;
  }, []);

  const refreshPayments = useCallback(async () => {
    const page = await api.listPayments({ page: 0, size: 25 });
    setPayments(page.content);
    return page.content;
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      await Promise.all([refreshAccounts(), refreshPayments()]);
      setBackendUp(true);
      return true;
    } catch (err) {
      setBackendUp(false);
      throw err;
    }
  }, [refreshAccounts, refreshPayments]);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      setLoading(true);
      setError(null);
      try {
        await refreshAll();
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialLoad();

    const interval = setInterval(() => {
      refreshAll().catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshAll]);

  async function handleCreateAccount(body) {
    await api.createAccount(body);
    await refreshAccounts();
    showToast(`Account "${body.ownerName}" created with ${body.initialBalance} ${body.currency}`, 'success');
  }

  async function handleSeedDemoData() {
    setSeeding(true);
    try {
      const demoAccounts = [
        { ownerName: 'Saransh Singh (Master Wallet)', currency: 'USD', initialBalance: 25000.0 },
        { ownerName: 'Alice Johnson', currency: 'USD', initialBalance: 5000.0 },
        { ownerName: 'Bob Miller', currency: 'USD', initialBalance: 3500.0 },
        { ownerName: 'Fintech Escrow Reserve', currency: 'USD', initialBalance: 50000.0 },
      ];
      for (const acc of demoAccounts) {
        await api.createAccount(acc);
      }
      await refreshAccounts();
      showToast('Successfully seeded 4 demo accounts!', 'success');
    } catch (err) {
      showToast(`Seeding failed: ${err.message}`, 'error');
    } finally {
      setSeeding(false);
    }
  }

  function handleSubmitPayment(body) {
    const idempotencyKey = crypto.randomUUID();
    const startTime = Date.now();
    showToast(`Submitting payment of ${body.amount} ${body.currency}…`, 'info');

    const submitted = api.submitPayment(body, idempotencyKey);

    const settle = submitted
      .then((payment) => pollPaymentUntilSettled(payment.id))
      .then(async (settledPayment) => {
        const duration = Date.now() - startTime;
        await Promise.all([refreshAccounts(), refreshPayments()]);
        if (settledPayment.status === 'COMPLETED') {
          showToast(`⚡ Payment settled successfully in ${duration}ms via Kafka!`, 'success');
        } else {
          showToast(`Payment ${settledPayment.status.toLowerCase()} after ${duration}ms`, 'warning');
        }
        return settledPayment;
      })
      .catch((err) => {
        showToast(`Payment failed: ${err.message}`, 'error');
        throw err;
      });

    return { submitted, settle };
  }

  const accountsById = Object.fromEntries(accounts.map((a) => [a.id, a]));

  // Computed metrics
  const totalBalance = accounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0);
  const completedCount = payments.filter((p) => p.status === 'COMPLETED').length;

  return (
    <div className="wallet-app-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="logo-badge">⚡</div>
          <div>
            <h1>Saransh Wallet</h1>
            <p className="brand-tagline">
              Distributed Payment Processing &amp; Double-Entry Ledger Engine
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="secondary-btn btn-seed"
            onClick={handleSeedDemoData}
            disabled={seeding || backendUp === false}
            title="Create sample accounts to quickly test transactions"
          >
            {seeding ? 'Seeding…' : '✨ Seed Demo Accounts'}
          </button>

          <span className="status-badge">
            <span className={`status-dot ${backendUp === null ? '' : backendUp ? 'up' : 'down'}`} />
            {backendUp === null ? 'Connecting…' : backendUp ? 'Live & Connected' : 'Backend Unreachable'}
          </span>
        </div>
      </header>

      {/* Metrics Banner */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Registered Accounts</div>
          <div className="metric-value">{accounts.length}</div>
          <div className="metric-sub">Multi-currency wallets</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">System Liquidity</div>
          <div className="metric-value">
            ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">Across all active accounts</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Settled Payments</div>
          <div className="metric-value">{completedCount}</div>
          <div className="metric-sub">Zero-loss Kafka pipeline</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Architecture</div>
          <div className="metric-value-tech">Kafka • Postgres • Redis</div>
          <div className="metric-sub">Outbox &amp; Idempotency active</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {backendUp === false && (
        <div className="error-banner">
          <strong>Cannot reach API at {BASE_URL}.</strong> Start the stack with{' '}
          <code>docker compose up -d</code> and <code>mvn spring-boot:run</code>.
        </div>
      )}

      {/* Main Panels Grid */}
      <div className="grid">
        <AccountsPanel
          accounts={accounts}
          loading={loading}
          onSelectAccount={setLedgerAccount}
          onCreateAccount={handleCreateAccount}
        />
        <SendPaymentForm accounts={accounts} onSubmitPayment={handleSubmitPayment} />
      </div>

      {/* Activity Feed */}
      <div style={{ marginTop: 28 }}>
        <ActivityFeed payments={payments} accountsById={accountsById} loading={loading} />
      </div>

      {/* Ledger Drawer Modal */}
      {ledgerAccount && <LedgerDrawer account={ledgerAccount} onClose={() => setLedgerAccount(null)} />}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <span>
            Crafted with ⚡ by <strong>Saransh Singh</strong> (<a href="https://github.com/Saransh2005/wallet" target="_blank" rel="noreferrer">@Saransh2005</a>)
          </span>
          <span className="footer-tags">
            Java 21 · Spring Boot 3 · Apache Kafka · Redis · PostgreSQL · React
          </span>
        </div>
      </footer>
    </div>
  );
}
