/**
 * Normalizes and validates an email address.
 * Returns { isValid: boolean, normalizedEmail: string, errorReason: string }
 */
const validateAndNormalizeEmail = (email) => {
  if (!email || typeof email !== "string") {
    return { isValid: false, normalizedEmail: "", errorReason: "Email is required" };
  }

  // 1. Trim whitespace
  const trimmed = email.trim();

  if (trimmed === "") {
    return { isValid: false, normalizedEmail: "", errorReason: "Email cannot be empty" };
  }

  // 6. Reject addresses longer than 254 characters
  if (trimmed.length > 254) {
    return { isValid: false, normalizedEmail: "", errorReason: "Email exceeds maximum length of 254 characters" };
  }

  // 3. Validate syntax (split local and domain parts)
  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return { isValid: false, normalizedEmail: "", errorReason: "Email must contain exactly one '@' character" };
  }

  const [localPart, domainPart] = parts;

  // 4. Reject empty local/domain parts
  if (!localPart || !domainPart) {
    return { isValid: false, normalizedEmail: "", errorReason: "Email local part and domain part cannot be empty" };
  }

  // 7. Reject local part longer than 64 characters
  if (localPart.length > 64) {
    return { isValid: false, normalizedEmail: "", errorReason: "Email local part exceeds 64 characters" };
  }

  // 8. Reject consecutive dots where invalid
  if (localPart.includes("..") || domainPart.includes("..")) {
    return { isValid: false, normalizedEmail: "", errorReason: "Email cannot contain consecutive dots" };
  }

  // 9. Reject leading/trailing dots in local part
  if (localPart.startsWith(".") || localPart.endsWith(".")) {
    return { isValid: false, normalizedEmail: "", errorReason: "Email local part cannot start or end with a dot" };
  }

  // 10. Validate local part characters
  const localRegex = /^[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~.]+$/;
  if (!localRegex.test(localPart)) {
    return { isValid: false, normalizedEmail: "", errorReason: "Email local part contains invalid characters" };
  }

  // 11. Validate domain structure
  if (domainPart.length < 3 || !domainPart.includes(".")) {
    return { isValid: false, normalizedEmail: "", errorReason: "Email domain structure is invalid" };
  }

  if (domainPart.startsWith(".") || domainPart.endsWith(".")) {
    return { isValid: false, normalizedEmail: "", errorReason: "Email domain cannot start or end with a dot" };
  }

  const domainParts = domainPart.split(".");
  const domainLabelRegex = /^[a-zA-Z0-9\-]+$/;
  for (const label of domainParts) {
    if (!label) {
      return { isValid: false, normalizedEmail: "", errorReason: "Email domain labels cannot be empty" };
    }
    if (!domainLabelRegex.test(label)) {
      return { isValid: false, normalizedEmail: "", errorReason: "Email domain contains invalid characters" };
    }
    if (label.startsWith("-") || label.endsWith("-")) {
      return { isValid: false, normalizedEmail: "", errorReason: "Email domain parts cannot start or end with a hyphen" };
    }
  }

  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) {
    return { isValid: false, normalizedEmail: "", errorReason: "Email top-level domain must be at least 2 characters" };
  }

  // 2. Normalize email to lowercase
  const normalized = `${localPart.toLowerCase()}@${domainPart.toLowerCase()}`;

  return {
    isValid: true,
    normalizedEmail: normalized,
    errorReason: ""
  };
};

module.exports = { validateAndNormalizeEmail };
