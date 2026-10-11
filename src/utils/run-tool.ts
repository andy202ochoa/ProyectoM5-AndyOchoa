import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { GitHubAPIError, toAppError, type ErrorContext } from "../errors/index.js";
import { logger } from "./logging.js";
import { withRetry } from "./retry.js";

export async function runTool(
    toolName: string,
    context: ErrorContext,
    action: () => Promise<string>
): Promise<CallToolResult> {
    const startedAt = Date.now();
    logger.info(`Tool "${toolName}" iniciada`);

    try {
        const text = await withRetry(action);
        logger.info(`Tool "${toolName}" completada`, { ms: Date.now() - startedAt });
        return { content: [{ type: "text", text }] };
    } catch (error) {
        const appError = toAppError(error, context);

        logger.error(`Tool "${toolName}" falló`, {
            type: appError.name,
            status: appError instanceof GitHubAPIError ? appError.status : undefined,
            technical: error instanceof Error ? error.message : String(error),
        });

        return { isError: true, content: [{ type: "text", text: appError.message }] };
    }
}