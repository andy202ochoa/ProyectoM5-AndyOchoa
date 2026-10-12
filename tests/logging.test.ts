import { describe, it, expect, afterEach, vi } from "vitest";
import { redact } from "../src/utils/logging.js";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("redact", () => {
    it("tapa tokens de GitHub por su formato", () => {
        const token = "ghp_" + "a".repeat(36);

        const result = redact(`Authorization: ${token}`);

        expect(result).not.toContain(token);
        expect(result).toContain("[REDACTED]");
    });

    it("tapa el valor exacto de GITHUB_TOKEN aunque no tenga un formato conocido", () => {
        vi.stubEnv("GITHUB_TOKEN", "token-con-formato-raro-123");

        const result = redact("error con token-con-formato-raro-123 dentro");

        expect(result).toBe("error con [REDACTED] dentro");
    });
});