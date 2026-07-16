# LocalServe v2.0 - Phase 2 Payment System HTTP APIs

This document maps all the payment endpoints, access rules, input structures, and output schemas.

## Overview of Endpoints

All endpoints are prefix-matched with `/api/payments`.

| Method | Endpoint | Allowed Role(s) | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/create-order` | `user` | Generate a Razorpay payment order for a booking. |
| **POST** | `/verify` | `user` | Verify the Razorpay payment signature & update database status. |
| **POST** | `/fail` | `user` | Report checkout payment failures. |
| **POST** | `/cancel` | `user` | Report payment cancellations. |
| **GET** | `/history` | `user`, `provider`, `admin` | Fetch user/provider/admin specific transaction history. |
| **GET** | `/invoice/:bookingId` | `user`, `provider`, `admin` | Fetch specific payment invoice JSON. |
| **GET** | `/invoice/:bookingId/pdf` | `user`, `provider`, `admin` | Download invoice statement as PDF. |
| **GET** | `/dashboard/provider` | `provider` | Fetch earnings indicators for partner dashboard. |
| **GET** | `/dashboard/admin` | `admin` | Fetch overall platform revenue stats for admin panel. |

---

## Detailed Payload Specifications

### 1. `POST /create-order`
Initiates the payment sequence for a booking. The amount is calculated strictly on the backend (including 18% GST).
* **Payload**:
  ```json
  {
    "booking_id": 42
  }
  ```
* **Success Response (201)**:
  ```json
  {
    "success": true,
    "message": "Payment order created successfully",
    "order": {
      "id": "order_LN1234567890",
      "amount": 23600,
      "currency": "INR"
    },
    "keyId": "rzp_test_xxxxxx"
  }
  ```

### 2. `POST /verify`
Verifies signature from Razorpay. Generates sequential invoice number on success.
* **Payload**:
  ```json
  {
    "razorpay_order_id": "order_LN1234567890",
    "razorpay_payment_id": "pay_xyz987654",
    "razorpay_signature": "abcdef123456...",
    "payment_method": "UPI"
  }
  ```
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Payment verified successfully",
    "invoiceNumber": "INV-2026-000001"
  }
  ```

### 3. `GET /history`
Retrieves past transactions.
* **Query Parameters**:
  - `filter` (optional): `today`, `last_7_days`, `this_month`, `all` (default)
  - `search` (optional): Search query matching Booking ID or Invoice Number.
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "payments": [
      {
        "id": 1,
        "booking_id": 42,
        "amount": "200.00",
        "gst_amount": "36.00",
        "total_amount": "236.00",
        "payment_status": "paid",
        "invoice_number": "INV-2026-000001",
        "paid_at": "2026-07-16T12:00:00.000Z"
      }
    ]
  }
  ```
