import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
    createRepositorySchema,
    createCommitSchema,
    createIssueSchema,
    listRepositoriesSchema,
} from "../src/schemas/index.js";

const createRepo = z.object(createRepositorySchema);
const createCommit = z.object(createCommitSchema);
const createIssue = z.object(createIssueSchema);
const listRepos = z.object(listRepositoriesSchema);

const base = { repo: "mi-app", content: "hola", message: "msg" };

describe("schema de create_repository", () => {
    it("acepta un nombre válido y deja el repo privado por defecto", () => {
        const result = createRepo.parse({ name: "mi-app-1" });
        expect(result.private).toBe(true);
    });

    it.each(["ab", "mi repo", "mi_repo!", "ñandú", "a".repeat(101)])(
        "rechaza el nombre inválido %j",
        (name) => {
            expect(createRepo.safeParse({ name }).success).toBe(false);
        }
    );

    it("muestra un mensaje claro en español cuando el nombre es muy corto", () => {
        const result = createRepo.safeParse({ name: "ab" });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain("al menos 3 caracteres");
        }
    });

    it("rechaza una descripción de más de 350 caracteres", () => {
        const result = createRepo.safeParse({ name: "mi-app", description: "x".repeat(351) });
        expect(result.success).toBe(false);
    });
});

describe("schema de create_commit", () => {
    it("acepta una ruta normal", () => {
        expect(createCommit.safeParse({ ...base, path: "src/index.ts" }).success).toBe(true);
    });

    it.each(["/src/index.ts", "src/utils/", "../secreto.txt", "src/../x.txt"])(
        "rechaza la ruta inválida %j",
        (path) => {
            expect(createCommit.safeParse({ ...base, path }).success).toBe(false);
        }
    );

    it("acepta '..' cuando es parte del nombre y no una subida de carpeta", () => {
        expect(createCommit.safeParse({ ...base, path: "notas..txt" }).success).toBe(true);
    });

    it("rechaza un mensaje de commit vacío", () => {
        expect(createCommit.safeParse({ ...base, path: "a.txt", message: "" }).success).toBe(false);
    });
});

describe("schema de create_issue", () => {
    it("acepta un issue sin owner ni body", () => {
        expect(createIssue.safeParse({ repo: "mi-app", title: "Bug" }).success).toBe(true);
    });

    it("rechaza un título vacío", () => {
        expect(createIssue.safeParse({ repo: "mi-app", title: "" }).success).toBe(false);
    });
});

describe("schema de list_repositories", () => {
    it("usa 30 por defecto", () => {
        expect(listRepos.parse({}).per_page).toBe(30);
    });

    it.each([0, 101, 1.5])("rechaza per_page = %s", (per_page) => {
        expect(listRepos.safeParse({ per_page }).success).toBe(false);
    });
});