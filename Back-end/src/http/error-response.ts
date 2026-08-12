import type { Response } from "express";

type ErrorDetails = { status: number; code: string; message: string };

export function getApiError(error: unknown, fallback = "Request could not be completed."): ErrorDetails {
  const name = error instanceof Error ? error.name : "";
  const rawMessage = error instanceof Error ? error.message : "";
  const message = rawMessage.toLowerCase();

  if (name === "ResourceNotFoundException") {
    return { status: 503, code: "DEPENDENCY_RESOURCE_NOT_FOUND", message: "A required backend resource is unavailable. Please try again later." };
  }
  if (name === "AccessDeniedException") {
    return { status: 503, code: "DEPENDENCY_ACCESS_DENIED", message: "The backend is not authorized to access a required service." };
  }
  if (name === "UsernameExistsException" || message.includes("email already exists")) {
    return { status: 409, code: "EMAIL_ALREADY_REGISTERED", message: "This email is already registered. Please sign in instead." };
  }
  if (name === "AliasExistsException" || name === "EmailAlreadyRegisteredError" || message.includes("this email is already registered")) {
    return { status: 409, code: "EMAIL_ALREADY_REGISTERED", message: "This email is already registered. Please sign in instead." };
  }
  if (message.includes("callsign") && message.includes("taken")) {
    return { status: 409, code: "CALLSIGN_TAKEN", message: rawMessage || "This operative callsign is already taken." };
  }
  if (name === "UsernameChangeCooldownError" || message.includes("change your operative callsign once every 30 days")) {
    return { status: 429, code: "USERNAME_CHANGE_COOLDOWN", message: rawMessage };
  }
  if (name === "EmailDeletionCooldownError" || message.includes("recently deleted") || message.includes("deleted recently") || message.includes("wait 24 hours")) {
    return { status: 429, code: "EMAIL_DELETION_COOLDOWN", message: rawMessage || "This email belongs to an account deleted recently. You cannot register with this email for 24 hours." };
  }
  if (name === "UserNotConfirmedException" || message.includes("not verified")) {
    return { status: 403, code: "ACCOUNT_UNCONFIRMED", message: "This account is not verified. Please complete registration or sign up again." };
  }
  if (name === "CodeMismatchException" || message.includes("invalid verification code")) {
    return { status: 400, code: "INVALID_VERIFICATION_CODE", message: "The verification code is invalid." };
  }
  if (name === "ExpiredCodeException" || message.includes("code has expired")) {
    return { status: 400, code: "VERIFICATION_CODE_EXPIRED", message: "The verification code has expired. Please request a new code." };
  }
  if (name === "NotAuthorizedException" || message.includes("invalid email or password")) {
    return { status: 401, code: "INVALID_CREDENTIALS", message: "Invalid email or password." };
  }
  if (name === "InvalidPasswordException" || name === "InvalidParameterException") {
    return { status: 400, code: "INVALID_REQUEST", message: "The request contains invalid information." };
  }
  if (name === "UserNotFoundException" || message === "user not found.") {
    return { status: 404, code: "USER_NOT_FOUND", message: "User profile was not found." };
  }
  if (name === "MissingAccessTokenError") {
    return { status: 401, code: "MISSING_ACCESS_TOKEN", message: "Your authenticated session is required to delete the account." };
  }

  return { status: 500, code: "INTERNAL_ERROR", message: fallback };
}

export function sendApiError(res: Response, error: unknown, fallback: string) {
  const details = getApiError(error, fallback);
  return res.status(details.status).json({
    success: false,
    code: details.code,
    message: details.message,
    error: { code: details.code, message: details.message }
  });
}
