import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { registerListRepositories } from "./tools/list-repositories.js";
import { registerCreateRepository } from "./tools/create-repository.js";
import { registerCreateIssue } from "./tools/create-issue.js";
import { registerCreateCommit } from "./tools/create-commit.js";
import { registerListIssues } from "./tools/list-issues.js";

// 1. Crear el servidor
const server = new McpServer({
    name: "github-mcp-server",
    version: "1.0.0",
});

// 2. Registrar una tool de prueba
server.registerTool(
    "saludar",
    {
        description: "Saluda a una persona por su nombre. Úsala para probar que el servidor funciona.",
        inputSchema: {
            nombre: z.string().min(1).describe("Nombre de la persona a saludar"),
        },
    },
    async ({ nombre }) => {
        return {
            content: [{ type: "text", text: `¡Hola, ${nombre}! El servidor MCP funciona.` }],
        };
    }
);

// Registrar tools
registerListRepositories(server);
registerCreateRepository(server);
registerCreateIssue(server);
registerCreateCommit(server);
registerListIssues(server);


// 3. Conectar el servidor por stdio
const transport = new StdioServerTransport();
await server.connect(transport);

// Los logs van a stderr: stdout está reservado para el protocolo
console.error("Servidor MCP iniciado");