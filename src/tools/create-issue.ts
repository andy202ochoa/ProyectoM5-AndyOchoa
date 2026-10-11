import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createIssueSchema } from "../schemas/index.js";
import { createIssue } from "../github/operations.js";
import { runTool } from "../utils/run-tool.js";

export function registerCreateIssue(server: McpServer) {
    server.registerTool(
        "create_issue",
        {
            description:
                "Abre un nuevo issue en un repositorio de GitHub que ya existe. " +
                "Úsala cuando el usuario pida crear, abrir o reportar un issue, bug o tarea en un repositorio. " +
                "Si el usuario no indica el dueño, se usa su propia cuenta. " +
                "No sirve para listar issues ni para crear repositorios.",
            inputSchema: createIssueSchema,
        },
        async ({ owner, repo, title, body }) =>
            runTool("create_issue", { repo }, async () => {
                const issue = await createIssue({ owner, repo, title, body });

                return `Issue #${issue.number} creado en ${issue.repo}: "${issue.title}"\nURL: ${issue.url}`;
            })
    );
}