import { describe, expect, it } from "vitest";
import { normalizeConfirmationCode } from "./confirmationCode";

describe("normalizeConfirmationCode", () => {
    it("removes whitespace copied around an OTP", () => {
        expect(normalizeConfirmationCode(" 306312\n")).toBe("306312");
    });

    it("rejects an empty or whitespace-only code", () => {
        expect(() => normalizeConfirmationCode("  \t")).toThrow(
            "Verification code is required."
        );
    });

    it("rejects non-string input", () => {
        expect(() => normalizeConfirmationCode(undefined)).toThrow(
            "Verification code is required."
        );
    });
});
