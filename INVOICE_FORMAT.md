# LocalServe v2.0 - Phase 2 Invoice Structure

This document details the Invoice Format, numbering convention, calculations, and PDF layout structure.

## Numbering Convention
- **Format**: `INV-YYYY-XXXXXX`
  - `INV`: Hardcoded prefix.
  - `YYYY`: Year of payment completion (e.g. `2026`).
  - `XXXXXX`: 6-digit padded sequential index (starts at `000001` per calendar year).
- **Generator Security**: Created inside a transaction using row-level locking on database reads. Prevents duplicate numbers.

---

## Calculations & Tax Matrix
All bookings completed on LocalServe are subject to a **18% Goods and Services Tax (GST)**.
- **Base Amount ($A_{base}$)**: Calculated on the backend from the booking's `final_price` or `estimated_price`.
- **GST Amount ($A_{gst}$)**: Calculated strictly as:
  \[A_{gst} = A_{base} \times 0.18\]
- **Grand Total ($A_{total}$)**:
  \[A_{total} = A_{base} + A_{gst}\]

*Note: In compliance with payment security best practices, the backend never accepts or processes price calculations provided by the frontend. The amount submitted to the payment gateway is generated solely by the backend invoice engine.*

---

## PDF Document Design
Generated dynamically via `pdfkit` featuring:
1. **Typography & Styling**: Clean sans-serif formatting, custom headers, colored divider lines, and right-aligned transactional metadata.
2. **Branding**: Professional `LocalServe` company header with gray secondary sub-labeling.
3. **Structured Billing Grid**:
   - **Bill To**: Customer details (Name, Registered Email).
   - **Service Provider**: Assigned Partner details (Name, Service Category).
4. **Line-item Breakdown**:
   - Details of the job (description).
   - Booking reference ID.
   - Base Price column.
5. **Totals Section**: Clear right-aligned list showing Subtotal, 18% GST addition, and a bold blue Grand Total.
6. **Verification Footer**: Reference columns containing Payment Gateway provider, signature transaction method, and a thank you feedback sentence.
