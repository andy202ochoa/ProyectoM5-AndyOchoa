import { getRetryAfterMs, isRateLimitError } from "../errors/index.js";
import { logger } from "./logging.js";

export interface RetryOptions {
    maxRetries?: number;   // reintentos extra, sin contar el primer intento
    baseDelayMs?: number;  // espera inicial
    maxDelayMs?: number;   // si hay que esperar más que esto, nos rendimos
    sleep?: (ms: number) => Promise<void>; // se puede reemplazar en los tests
}

const defaultSleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
    action: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 10_000, sleep = defaultSleep } = options;

    for (let attempt = 0; ; attempt++) {
        try {
            return await action();
        } catch (error) {
            // Solo reintentamos si es rate limiting y quedan intentos
            if (!isRateLimitError(error) || attempt >= maxRetries) throw error;

            // Si GitHub indica cuánto esperar, lo respetamos; si no, backoff exponencial: 1s, 2s, 4s...
            const delay = getRetryAfterMs(error) ?? baseDelayMs * 2 ** attempt;

            // Esperar demasiado haría que el cliente MCP se rinda: mejor avisar al usuario
            if (delay > maxDelayMs) throw error;

            logger.warn("Rate limit de GitHub, reintentando", { attempt: attempt + 1, waitMs: delay });
            await sleep(delay);
        }
    }
}