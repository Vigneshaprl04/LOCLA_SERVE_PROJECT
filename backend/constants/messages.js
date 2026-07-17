"use strict";

const MESSAGES = {
  SUCCESS: "Success",
  ERROR_SERVER: "Server error",
  PROVIDER_NOT_FOUND: "Provider not found",
  PROVIDER_OFFLINE: "Provider is currently offline",
  PROVIDER_NOT_VERIFIED: "Provider is not verified",
  PROVIDER_UNAVAILABLE: "Provider is currently unavailable",
  CATEGORY_MISMATCH: "Selected category does not match provider service category",
  CATEGORY_NOT_FOUND: "Service category not found",
  STATUS_REQUIRED: "is_online or status is required",
  STATUS_UPDATED: "Status updated successfully",
  UNAUTHORIZED: "Access denied",
  DB_ERROR: "Database error occurred"
};

module.exports = MESSAGES;
