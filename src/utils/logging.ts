type Level = "debug" | "info" | "warn" | "error";

const WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function currentLevel(): Level {
    const value = process.env.LOG_LEVEL?.toLowerCase();
    return value === "debug" || value === "info" || value === "warn" || value === "error"
        ? value
        : "info";
}

// Oculta tokens de GitHub antes de escribir cualquier cosa
export function redact(text: string): string {
    let result = text
        .replace(/(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g, "[REDACTED]")
        .replace(/github_pat_[A-Za-z0-9_]{20,}/g, "[REDACTED]");

    const token = process.env.GITHUB_TOKEN;
    if (token && token.length > 8) {
        result = result.split(token).join("[REDACTED]");
    }
    return result;
}

function log(level: Level, message: string, meta?: Record<string, unknown>): void {
    if (WEIGHT[level] < WEIGHT[currentLevel()]) return;

    const line =
        `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}` +
        (meta ? ` ${JSON.stringify(meta)}` : "");

    // stderr, NUNCA stdout: stdout es el canal del protocolo MCP
    console.error(redact(line));
}

export const logger = {
    debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
    info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
    error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};