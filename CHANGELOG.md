# Changelog - LocalServe v2.0

All notable changes to the LocalServe platform will be documented in this file.

## [2.0.0-Phase2] - 2026-07-16

### Added
- **Production Payment Module**:
  - Integrated Razorpay Payment Gateway.
  - Added secure signature verification (mock/live modes) with idempotency.
  - Dynamic invoice generator with format `INV-YYYY-XXXXXX` ensuring unique sequence.
  - PDF generation engine using `pdfkit` (logo, layout, tax breakdowns).
- **Frontend Payment Checkout**:
  - Structured billing layout (Base amount, 18% GST, Grand Total).
  - Actions for Pay Now, Retry Payment, Cancel Payment, and Download Invoice.
  - Collapsible inline Payment History list.
- **Provider Dashboards**:
  - Earnings overview card displaying Today's, Weekly, Monthly, and Average job totals.
- **Admin Dashboards**:
  - Financial Overview cards showing platform-wide revenue.
  - Responsive pure CSS/HTML vertical trends and payment distribution progress bars.
- **Integration Tests**:
  - Automated suite `runPaymentTests.cjs` covering order creation, signature checking, failures, history, stats, and auth.

### Changed
- **Database Schema**:
  - Updated `runMigrations.js` to dynamically create `payments` and `payment_logs` tables.
