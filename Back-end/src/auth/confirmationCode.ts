/**
 * Confirmation codes are commonly copied from email with surrounding
 * whitespace. Cognito rejects that whitespace before validating the code.
 */
export function normalizeConfirmationCode(code: unknown): string {
    if (typeof code !== "string") {
        throw new Error("Verification code is required.");
    }

    const normalizedCode = code.trim();

    if (!normalizedCode) {
        throw new Error("Verification code is required.");
    }

    return normalizedCode;
}
