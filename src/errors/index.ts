import { ZodError } from "zod";

// --- Los 4 tipos de error ---
//apperror es como un formato base para cada error que se va a usar en el servidor para que cada tipo de error tenga su propio tipo de formulario.

export class AppError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options);
        this.name = new.target.name;
    }
}

export class ValidationError extends AppError { }
export class AuthenticationError extends AppError { }
export class NetworkError extends AppError { }

export class GitHubAPIError extends AppError {
    readonly status?: number;
    constructor(message: string, status?: number, options?: { cause?: unknown }) {
        super(message, options);
        this.status = status;
    }
}

// --- Leer la forma de los errores de Octokit ---

interface HttpLikeError {
    status?: number;
    message?: string;
    code?: string;
    cause?: unknown;
    response?: {
        headers?: Record<string, string | number | undefined>;
        data?: {
            message?: string;
            errors?: Array<{ message?: string }>;
        };
    };
}

function asHttpError(error: unknown): HttpLikeError {
    return (typeof error === "object" && error !== null ? error : {}) as HttpLikeError;
}

export function isRateLimitError(error: unknown): boolean {
    const e = asHttpError(error);
    if (e.status === 429) return true;
    if (e.status === 403) {
        const remaining = e.response?.headers?.["x-ratelimit-remaining"];
        const text = `${e.message ?? ""} ${e.response?.data?.message ?? ""}`;
        return String(remaining) === "0" || /rate limit/i.test(text);
    }
    return false;
}

export function getRetryAfterMs(error: unknown): number | undefined {
    const raw = asHttpError(error).response?.headers?.["retry-after"];
    const seconds = Number(raw);
    return raw !== undefined && Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

const NETWORK_PATTERN = /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|network/i;

export function isNetworkError(error: unknown): boolean {
    const e = asHttpError(error);
    if (e.response) return false; // GitHub sí respondió: no es un problema de red
    const cause = asHttpError(e.cause);
    const text = `${e.message ?? ""} ${e.code ?? ""} ${cause.message ?? ""} ${cause.code ?? ""}`;
    return NETWORK_PATTERN.test(text);
}

function githubDetail(error: HttpLikeError): string {
    const details = error.response?.data?.errors?.map((x) => x.message).filter(Boolean);
    if (details?.length) return details.join("; ");
    return error.response?.data?.message ?? error.message ?? "datos inválidos";
}

// --- El traductor: cualquier error técnico → AppError con mensaje en lenguaje natural ---

export interface ErrorContext {
    repo?: string;
}

export function toAppError(error: unknown, context: ErrorContext = {}): AppError {
    if (error instanceof AppError) return error;

    if (error instanceof ZodError) {
        const detail = error.issues.map((i) => i.message).join("; ");
        return new ValidationError(`Los datos enviados no son válidos: ${detail}`, { cause: error });
    }

    const http = asHttpError(error);
    const status = http.status;
    const options = { cause: error };

    if (isRateLimitError(error)) {
        return new GitHubAPIError(
            "Se alcanzó el límite de peticiones de GitHub. Espera unos minutos e intenta de nuevo.",
            status,
            options
        );
    }

    if (isNetworkError(error)) {
        return new NetworkError(
            "No se pudo conectar con GitHub. Revisa tu conexión a internet e intenta de nuevo.",
            options
        );
    }

    if (status === 401) {
        return new AuthenticationError(
            "El token de GitHub no es válido o expiró. Genera uno nuevo y actualiza GITHUB_TOKEN.",
            options
        );
    }

    if (status === 403) {
        return new GitHubAPIError(
            "No tienes permisos para realizar esta acción. Verifica que tu token tenga los scopes necesarios y que tengas acceso al repositorio.",
            status,
            options
        );
    }

    if (status === 404) {
        const message = context.repo
            ? `El repositorio "${context.repo}" no fue encontrado. Verifica el nombre e intenta de nuevo. Si es privado, confirma que tu token tiene acceso.`
            : "El recurso solicitado no fue encontrado. Verifica los datos e intenta de nuevo.";
        return new GitHubAPIError(message, status, options);
    }

    if (status === 409) {
        return new GitHubAPIError(
            "Hubo un conflicto con el estado actual del repositorio (por ejemplo, el archivo cambió mientras se guardaba). Intenta de nuevo.",
            status,
            options
        );
    }

    if (status === 422) {
        const detail = githubDetail(http);
        const message = /already exists/i.test(detail)
            ? "Ya existe un repositorio con ese nombre en tu cuenta. Elige otro nombre."
            : `GitHub rechazó los datos enviados: ${detail}`;
        return new GitHubAPIError(message, status, options);
    }

    if (status !== undefined && status >= 500) {
        return new GitHubAPIError(
            "GitHub tiene problemas temporales. Intenta de nuevo en unos minutos.",
            status,
            options
        );
    }

    return new GitHubAPIError(
        "Ocurrió un error inesperado al ejecutar la operación. Revisa los logs del servidor para más detalles.",
        status,
        options
    );
}