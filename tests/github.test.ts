import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidationError } from "../src/errors/index.js";
import { httpError } from "./helpers.js";

// El Octokit falso: cada método es una función espía que controlamos
const octokit = vi.hoisted(() => ({
    rest: {
        users: { getAuthenticated: vi.fn() },
        repos: {
            listForAuthenticatedUser: vi.fn(),
            createForAuthenticatedUser: vi.fn(),
            getContent: vi.fn(),
            createOrUpdateFileContents: vi.fn(),
        },
        issues: { create: vi.fn(), listForRepo: vi.fn() },
    },
}));

// Cuando operations.ts pida getOctokit(), recibirá el falso
vi.mock("../src/github/client.js", () => ({ getOctokit: () => octokit }));

import {
    listRepositories,
    createRepository,
    createIssue,
    createCommit,
    listIssues,
} from "../src/github/operations.js";

beforeEach(() => {
    vi.resetAllMocks();
});

describe("listRepositories", () => {
    it("devuelve solo los campos útiles de cada repo", async () => {
        octokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
            data: [
                {
                    full_name: "ana/mi-app",
                    private: true,
                    html_url: "https://github.com/ana/mi-app",
                    description: null,
                    language: "TypeScript",
                    stargazers_count: 99, // campo que no debe pasar
                },
            ],
        });

        const result = await listRepositories(10);

        expect(octokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
            per_page: 10,
            sort: "updated",
        });
        expect(result).toEqual([
            {
                name: "ana/mi-app",
                private: true,
                url: "https://github.com/ana/mi-app",
                description: null,
                language: "TypeScript",
            },
        ]);
    });
});

describe("createRepository", () => {
    it("crea el repo con README inicial y devuelve su URL", async () => {
        octokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({
            data: { full_name: "ana/mi-app", private: true, html_url: "https://github.com/ana/mi-app" },
        });

        const result = await createRepository({ name: "mi-app", description: "Demo", isPrivate: true });

        expect(octokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith(
            expect.objectContaining({ name: "mi-app", private: true, auto_init: true })
        );
        expect(result.url).toBe("https://github.com/ana/mi-app");
    });
});

describe("createIssue", () => {
    it("usa el usuario autenticado cuando no se indica owner", async () => {
        octokit.rest.users.getAuthenticated.mockResolvedValue({ data: { login: "ana" } });
        octokit.rest.issues.create.mockResolvedValue({
            data: { number: 7, title: "Bug", html_url: "https://github.com/ana/mi-app/issues/7" },
        });

        const result = await createIssue({ repo: "mi-app", title: "Bug" });

        expect(octokit.rest.issues.create).toHaveBeenCalledWith(
            expect.objectContaining({ owner: "ana", repo: "mi-app", title: "Bug" })
        );
        expect(result.repo).toBe("ana/mi-app");
        expect(result.number).toBe(7);
    });

    it("no consulta quién es el usuario si ya se indicó el owner", async () => {
        octokit.rest.issues.create.mockResolvedValue({
            data: { number: 1, title: "Idea", html_url: "u" },
        });

        await createIssue({ owner: "facebook", repo: "react", title: "Idea" });

        expect(octokit.rest.users.getAuthenticated).not.toHaveBeenCalled();
    });
});

describe("createCommit", () => {
    const params = { owner: "ana", repo: "mi-app", path: "notas/a.txt", content: "Hola", message: "Agrega nota" };
    const commitResponse = { data: { commit: { sha: "abcdef1234567", html_url: "https://github.com/c/1" } } };

    it("crea el archivo cuando no existe (404) y lo envía en base64", async () => {
        octokit.rest.repos.getContent.mockRejectedValue(httpError(404));
        octokit.rest.repos.createOrUpdateFileContents.mockResolvedValue(commitResponse);

        const result = await createCommit(params);

        const sent = octokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0];
        expect(sent.sha).toBeUndefined();
        expect(sent.content).toBe(Buffer.from("Hola").toString("base64"));
        expect(result.action).toBe("creado");
        expect(result.commitSha).toBe("abcdef1");
    });

    it("actualiza el archivo cuando ya existe, enviando su sha", async () => {
        octokit.rest.repos.getContent.mockResolvedValue({ data: { type: "file", sha: "sha-viejo" } });
        octokit.rest.repos.createOrUpdateFileContents.mockResolvedValue(commitResponse);

        const result = await createCommit(params);

        expect(octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
            expect.objectContaining({ sha: "sha-viejo" })
        );
        expect(result.action).toBe("actualizado");
    });

    it("no esconde errores que no sean 404 (credenciales inválidas)", async () => {
        octokit.rest.repos.getContent.mockRejectedValue(httpError(401));

        await expect(createCommit(params)).rejects.toMatchObject({ status: 401 });
        expect(octokit.rest.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
    });

    it("rechaza con ValidationError si la ruta es una carpeta", async () => {
        octokit.rest.repos.getContent.mockResolvedValue({ data: [{ type: "file", name: "x" }] });

        await expect(createCommit(params)).rejects.toBeInstanceOf(ValidationError);
    });
});

describe("listIssues", () => {
    it("descarta los pull requests y tolera datos incompletos", async () => {
        octokit.rest.issues.listForRepo.mockResolvedValue({
            data: [
                { number: 1, title: "Bug", user: { login: "ana" }, labels: [{ name: "bug" }], html_url: "u1" },
                { number: 2, title: "PR", user: { login: "luis" }, labels: [], html_url: "u2", pull_request: {} },
                { number: 3, title: "Idea", user: null, labels: ["mejora"], html_url: "u3" },
            ],
        });

        const result = await listIssues({ owner: "ana", repo: "mi-app" });

        expect(octokit.rest.issues.listForRepo).toHaveBeenCalledWith(
            expect.objectContaining({ state: "open" })
        );
        expect(result.issues.map((i) => i.number)).toEqual([1, 3]);
        expect(result.issues.map((i) => i.author)).toEqual(["ana", "desconocido"]);
        expect(result.issues.map((i) => i.labels)).toEqual([["bug"], ["mejora"]]);
    });
});