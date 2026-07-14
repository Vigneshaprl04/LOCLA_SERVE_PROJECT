/**
 * Validates a password against production strength policy.
 * Policy: Min 8, Max 128 characters, at least one uppercase letter,
 * one lowercase letter, one number, and one special character.
 * Returns { isValid: boolean, errorReason: string }
 */
const validatePasswordStrength = (password) => {
  if (!password || typeof password !== "string") {
    return { isValid: false, errorReason: "Password is required" };
  }

  if (password.length < 8) {
    return { isValid: false, errorReason: "Password must be at least 8 characters long" };
  }

  if (password.length > 128) {
    return { isValid: false, errorReason: "Password cannot exceed 128 characters" };
  }

  // Check lowercase
  if (!/[a-z]/.test(password)) {
    return { isValid: false, errorReason: "Password must contain at least one lowercase letter" };
  }

  // Check uppercase
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, errorReason: "Password must contain at least one uppercase letter" };
  }

  // Check number
  if (!/[0-9]/.test(password)) {
    return { isValid: false, errorReason: "Password must contain at least one number" };
  }

  // Check special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return { isValid: false, errorReason: "Password must contain at least one special character" };
  }

  return { isValid: true, errorReason: "" };
};

module.exports = { validatePasswordStrength };
