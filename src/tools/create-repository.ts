import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRepositorySchema } from "../schemas/index.js";
import { createRepository } from "../github/operations.js";
import { runTool } from "../utils/run-tool.js";

export function registerCreateRepository(server: McpServer) {
    server.registerTool(
        "create_repository",
        {
            description:
                "Crea un nuevo repositorio en la cuenta de GitHub del usuario autenticado. " +
                "Úsala cuando el usuario pida crear, iniciar o abrir un repositorio nuevo. " +
                "Por defecto el repositorio es privado. " +
                "No la uses para repositorios que ya existen ni para crear issues.",
            inputSchema: createRepositorySchema,
        },
        async ({ name, description, private: isPrivate }) =>
            runTool("create_repository", {}, async () => {
                const repo = await createRepository({ name, description, isPrivate });

                return (
                    `Repositorio creado: ${repo.name} (${repo.private ? "privado" : "público"})\n` +
                    `URL: ${repo.url}`
                );
            })
    );
}