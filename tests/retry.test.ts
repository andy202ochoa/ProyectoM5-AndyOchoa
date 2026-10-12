import { describe, it, expect, vi } from "vitest";
import { withRetry } from "../src/utils/retry.js";
import { httpError } from "./helpers.js";

describe("withRetry", () => {
    it("si la acción funciona, no espera ni reintenta", async () => {
        const action = vi.fn().mockResolvedValue("ok");
        const sleep = vi.fn();

        expect(await withRetry(action, { sleep })).toBe("ok");
        expect(action).toHaveBeenCalledTimes(1);
        expect(sleep).not.toHaveBeenCalled();
    });

    it("reintenta con espera exponencial (1 s, 2 s) hasta que funciona", async () => {
        const action = vi
            .fn()
            .mockRejectedValueOnce(httpError(429))
            .mockRejectedValueOnce(httpError(429))
            .mockResolvedValue("ok");
        const sleep = vi.fn().mockResolvedValue(undefined);

        expect(await withRetry(action, { sleep })).toBe("ok");
        expect(action).toHaveBeenCalledTimes(3);
        expect(sleep.mock.calls).toEqual([[1000], [2000]]);
    });

    it("se rinde cuando se agotan los reintentos", async () => {
        const action = vi.fn().mockRejectedValue(httpError(429));
        const sleep = vi.fn().mockResolvedValue(undefined);

        await expect(withRetry(action, { maxRetries: 2, sleep })).rejects.toMatchObject({ status: 429 });
        expect(action).toHaveBeenCalledTimes(3); // 1 intento + 2 reintentos
    });

    it("no reintenta errores que no son de rate limit", async () => {
        const action = vi.fn().mockRejectedValue(httpError(404));
        const sleep = vi.fn();

        await expect(withRetry(action, { sleep })).rejects.toMatchObject({ status: 404 });
        expect(action).toHaveBeenCalledTimes(1);
        expect(sleep).not.toHaveBeenCalled();
    });

    it("respeta el retry-after de GitHub", async () => {
        const error = httpError(429, { response: { headers: { "retry-after": "3" } } });
        const action = vi.fn().mockRejectedValueOnce(error).mockResolvedValue("ok");
        const sleep = vi.fn().mockResolvedValue(undefined);

        await withRetry(action, { sleep });

        expect(sleep).toHaveBeenCalledWith(3000);
    });

    it("no espera si GitHub pide esperar más de lo razonable", async () => {
        const error = httpError(429, { response: { headers: { "retry-after": "60" } } });
        const action = vi.fn().mockRejectedValue(error);
        const sleep = vi.fn();

        await expect(withRetry(action, { sleep })).rejects.toMatchObject({ status: 429 });
        expect(sleep).not.toHaveBeenCalled();
    });
});