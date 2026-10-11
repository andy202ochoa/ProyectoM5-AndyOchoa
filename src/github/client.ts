import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AuthenticationError } from "../errors/index.js";

// Ruta del .env relativa a este archivo, no a donde se ejecute el programa
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

export function getOctokit(): Octokit {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        throw new AuthenticationError(
            "No se encontró el token de GitHub. Define GITHUB_TOKEN en tu archivo .env o en la configuración del servidor MCP."
        );
    }
    return new Octokit({ auth: token });
}