import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createCommitSchema } from "../schemas/index.js";
import { createCommit } from "../github/operations.js";
import { runTool } from "../utils/run-tool.js";

export function registerCreateCommit(server: McpServer) {
    server.registerTool(
        "create_commit",
        {
            description:
                "Hace un commit en un repositorio de GitHub que ya existe, creando un archivo nuevo o reemplazando el contenido de uno existente. " +
                "Úsala cuando el usuario pida subir, agregar, crear o modificar un archivo en un repositorio. " +
                "Si el archivo ya existe, su contenido se reemplaza por completo. " +
                "No sirve para crear repositorios, issues ni ramas.",
            inputSchema: createCommitSchema,
        },
        async ({ owner, repo, path, content, message, branch }) =>
            runTool("create_commit", { repo }, async () => {
                const result = await createCommit({ owner, repo, path, content, message, branch });

                return (
                    `Archivo ${result.action}: ${result.path} en ${result.repo}\n` +
                    `Commit ${result.commitSha}\nURL: ${result.url}`
                );
            })
    );
}