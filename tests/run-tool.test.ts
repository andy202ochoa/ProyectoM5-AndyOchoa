import { describe, it, expect } from "vitest";
import { runTool } from "../src/utils/run-tool.js";
import { httpError } from "./helpers.js";

describe("runTool", () => {
    it("devuelve el texto en formato MCP cuando todo sale bien", async () => {
        const result = await runTool("prueba", {}, async () => "hola");

        expect(result).toEqual({ content: [{ type: "text", text: "hola" }] });
    });

    it("convierte un 404 en un error legible marcado con isError", async () => {
        const result = await runTool("prueba", { repo: "mi-app" }, async () => {
            throw httpError(404);
        });

        expect(result.isError).toBe(true);
        expect(result.content[0]).toMatchObject({ type: "text" });
        expect(JSON.stringify(result.content)).toContain("mi-app");
    });

    it("no filtra el detalle técnico al LLM", async () => {
        const result = await runTool("prueba", {}, async () => {
            throw httpError(500, { message: "detalle-interno-secreto" });
        });

        expect(result.isError).toBe(true);
        expect(JSON.stringify(result.content)).not.toContain("detalle-interno-secreto");
    });

    it("un rate limit que no se puede esperar se explica al usuario", async () => {
        const error = httpError(429, { response: { headers: { "retry-after": "60" } } });

        const result = await runTool("prueba", {}, async () => {
            throw error;
        });

        expect(result.isError).toBe(true);
        expect(JSON.stringify(result.content)).toContain("límite de peticiones");
    });
});