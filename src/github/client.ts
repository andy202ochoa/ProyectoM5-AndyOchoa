import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Ruta del .env relativa a este archivo, no a donde se ejecute el programa
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

export function getOctokit(): Octokit {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error("Falta la variable de entorno GITHUB_TOKEN");
    }
    return new Octokit({ auth: token });
}