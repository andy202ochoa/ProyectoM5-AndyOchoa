import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listRepositoriesSchema } from "../schemas/index.js";
import { listRepositories } from "../github/operations.js";
import { runTool } from "../utils/run-tool.js";

export function registerListRepositories(server: McpServer) {
    server.registerTool(
        "list_repositories",
        {
            description:
                "Lista los repositorios de GitHub del usuario autenticado, ordenados por actividad reciente. " +
                "Úsala cuando el usuario pida ver, listar o consultar sus repositorios. " +
                "No sirve para listar issues ni commits.",
            inputSchema: listRepositoriesSchema,
        },
        async ({ per_page }) =>
            runTool("list_repositories", {}, async () => {
                const repos = await listRepositories(per_page);

                return repos.length === 0
                    ? "No se encontraron repositorios."
                    : repos
                        .map(
                            (r) =>
                                `- ${r.name} (${r.private ? "privado" : "público"})` +
                                `${r.language ? ` [${r.language}]` : ""}` +
                                `${r.description ? `: ${r.description}` : ""}\n  ${r.url}`
                        )
                        .join("\n");
            })
    );
}