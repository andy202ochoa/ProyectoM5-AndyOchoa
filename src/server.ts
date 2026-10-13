import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerListRepositories } from "./tools/list-repositories.js";
import { registerCreateRepository } from "./tools/create-repository.js";
import { registerCreateIssue } from "./tools/create-issue.js";
import { registerCreateCommit } from "./tools/create-commit.js";
import { registerListIssues } from "./tools/list-issues.js";
import { logger } from "./utils/logging.js";

// 1. Crear el servidor
const server = new McpServer({
    name: "github-mcp-server",
    version: "1.0.0",
});
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
logger.info("Servidor MCP iniciado");