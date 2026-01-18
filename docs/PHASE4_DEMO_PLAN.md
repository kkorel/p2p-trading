## Phase 4 Demo Plan (Manual Escrow)

1) Add settlement storage (SQLite table) and helper logic for idempotent state transitions.
2) Implement settlement API endpoints (initiate, confirm-funded, verify-outcome, confirm-payout, get, reset).
3) Update buyer UI to show a Payment & Settlement panel with stepper, receipts, and manual instructions.
4) Gate “Trade Confirmed” UI until escrow funded; show settlement progress and receipts.
5) Validate end-to-end demo flow and provide reset path for clean reruns.
