import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listIssuesSchema } from "../schemas/index.js";
import { listIssues } from "../github/operations.js";
import { runTool } from "../utils/run-tool.js";

export function registerListIssues(server: McpServer) {
    server.registerTool(
        "list_issues",
        {
            description:
                "Lista los issues abiertos de un repositorio de GitHub específico. " +
                "Úsala cuando el usuario pida ver, listar o consultar los issues, bugs o tareas pendientes de un repositorio. " +
                "Si el usuario no indica el dueño, se usa su propia cuenta. " +
                "No sirve para crear issues ni para listar repositorios.",
            inputSchema: listIssuesSchema,
        },
        async ({ owner, repo, per_page }) =>
            runTool("list_issues", { repo }, async () => {
                const result = await listIssues({ owner, repo, perPage: per_page });

                return result.issues.length === 0
                    ? `No hay issues abiertos en ${result.repo}.`
                    : `Issues abiertos en ${result.repo}:\n` +
                    result.issues
                        .map(
                            (i) =>
                                `- #${i.number} ${i.title} (por ${i.author})` +
                                `${i.labels.length ? ` [${i.labels.join(", ")}]` : ""}\n  ${i.url}`
                        )
                        .join("\n");
            })
    );
}