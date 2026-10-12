import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
    AuthenticationError,
    GitHubAPIError,
    NetworkError,
    ValidationError,
    getRetryAfterMs,
    isNetworkError,
    isRateLimitError,
    toAppError,
} from "../src/errors/index.js";
import { httpError } from "./helpers.js";

describe("toAppError: errores de GitHub", () => {
    it("404 con repo: el mensaje nombra el repositorio", () => {
        const result = toAppError(httpError(404), { repo: "mi-app" });

        expect(result).toBeInstanceOf(GitHubAPIError);
        expect((result as GitHubAPIError).status).toBe(404);
        expect(result.message).toContain('"mi-app" no fue encontrado');
    });

    it("404 sin repo: usa un mensaje genérico", () => {
        expect(toAppError(httpError(404)).message).toContain("recurso solicitado");
    });

    it("401 se convierte en AuthenticationError", () => {
        const result = toAppError(httpError(401));

        expect(result).toBeInstanceOf(AuthenticationError);
        expect(result.message).toContain("token");
    });

    it("403 normal es un problema de permisos", () => {
        const result = toAppError(httpError(403));

        expect(result).toBeInstanceOf(GitHubAPIError);
        expect(result.message).toContain("permisos");
    });

    it("403 con 0 peticiones restantes se trata como rate limit, no como permisos", () => {
        const error = httpError(403, { response: { headers: { "x-ratelimit-remaining": "0" } } });

        expect(toAppError(error).message).toContain("límite de peticiones");
    });

    it("422 por nombre duplicado explica que ya existe", () => {
        const error = httpError(422, {
            response: { data: { errors: [{ message: "name already exists on this account" }] } },
        });

        expect(toAppError(error).message).toContain("Ya existe un repositorio");
    });

    it("500 indica que GitHub tiene problemas", () => {
        expect(toAppError(httpError(500)).message).toContain("problemas temporales");
    });

    it("un error de conexión se convierte en NetworkError", () => {
        const cause = Object.assign(new Error("getaddrinfo ENOTFOUND api.github.com"), { code: "ENOTFOUND" });
        const error = Object.assign(new Error("fetch failed"), { cause });

        const result = toAppError(error);

        expect(result).toBeInstanceOf(NetworkError);
        expect(result.message).toContain("conectar");
    });

    it("un valor desconocido recibe un mensaje genérico", () => {
        const result = toAppError("algo raro");

        expect(result).toBeInstanceOf(GitHubAPIError);
        expect(result.message).toContain("inesperado");
    });
});

describe("toAppError: otros casos", () => {
    it("un ZodError se convierte en ValidationError con el mensaje de la regla", () => {
        const parsed = z.string().min(3, "Nombre demasiado corto").safeParse("a");
        if (parsed.success) throw new Error("la validación debía fallar");

        const result = toAppError(parsed.error);

        expect(result).toBeInstanceOf(ValidationError);
        expect(result.message).toContain("Nombre demasiado corto");
    });

    it("un AppError ya traducido se devuelve tal cual", () => {
        const original = new AuthenticationError("sin token");

        expect(toAppError(original)).toBe(original);
    });

    it("conserva el error original en cause", () => {
        const original = httpError(404);

        expect(toAppError(original, { repo: "a" }).cause).toBe(original);
    });

    it("cada tipo de error se identifica por su nombre de clase", () => {
        expect(new NetworkError("x").name).toBe("NetworkError");
        expect(new GitHubAPIError("x", 404).name).toBe("GitHubAPIError");
    });
});

describe("detectores de errores", () => {
    it("isRateLimitError: 429 sí, 403 con pistas sí, 403 sin pistas no, 404 no", () => {
        expect(isRateLimitError(httpError(429))).toBe(true);
        expect(isRateLimitError(httpError(403, { message: "API rate limit exceeded" }))).toBe(true);
        expect(isRateLimitError(httpError(403))).toBe(false);
        expect(isRateLimitError(httpError(404))).toBe(false);
    });

    it("isNetworkError: si GitHub respondió, no es un problema de red", () => {
        const error = Object.assign(new Error("network error"), { response: {} });

        expect(isNetworkError(error)).toBe(false);
    });

    it("getRetryAfterMs convierte segundos a milisegundos", () => {
        const error = httpError(429, { response: { headers: { "retry-after": "5" } } });

        expect(getRetryAfterMs(error)).toBe(5000);
        expect(getRetryAfterMs(httpError(429))).toBeUndefined();
    });
});