# Saransh Wallet Engine

A distributed digital wallet and ledger service built with Spring Boot, Apache Kafka, PostgreSQL, and Redis.

## Features

- **Asynchronous Settlement**: Transactions are received and acknowledged immediately, then settled through an event pipeline.
- **Double-Entry Bookkeeping**: Every balance movement produces corresponding debit and credit records.
- **Idempotent Processing**: Unique transaction keys prevent duplicate executions.
- **Ordered Ledger Execution**: Per-account event sequencing preserves account integrity.
- **Live Web Interface**: React dashboard to inspect accounts, trigger transfers, and view audit history.

## Architecture Overview

1. `POST /api/v1/payments` receives transfer requests with an idempotency key.
2. The initial transaction is stored in the database alongside an outbox event.
3. The outbox processor pushes events to Kafka topics.
4. Consumers process debits and credits with pessimistic locking on participating accounts.
5. Clients query payment status and account ledger entries via REST endpoints.

## Local Setup

### 1. Start Supporting Services
```bash
docker compose up -d
```

### 2. Start Backend Service
```bash
mvn spring-boot:run
```
Swagger UI: `http://localhost:8080/swagger-ui.html`

### 3. Start Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
Dashboard: `http://localhost:5173`

## Repository Owner
Maintained by Saransh Singh ([@Saransh2005](https://github.com/Saransh2005)).
