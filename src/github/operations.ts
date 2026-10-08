import type { Octokit } from "@octokit/rest";
import { getOctokit } from "./client.js";

// Si no se indica dueño, usamos el usuario dueño del token
async function resolveOwner(octokit: Octokit, owner?: string): Promise<string> {
    if (owner) return owner;
    const { data } = await octokit.rest.users.getAuthenticated();
    return data.login;
}

export async function listRepositories(perPage = 30) {
    const octokit = getOctokit();

    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: perPage,
        sort: "updated",
    });

    return data.map((repo) => ({
        name: repo.full_name,
        private: repo.private,
        url: repo.html_url,
        description: repo.description,
        language: repo.language,
    }));
}

export async function createRepository(params: {
    name: string;
    description?: string;
    isPrivate: boolean;
}) {
    const octokit = getOctokit();

    const { data } = await octokit.rest.repos.createForAuthenticatedUser({
        name: params.name,
        description: params.description,
        private: params.isPrivate,
        auto_init: true,
    });

    return {
        name: data.full_name,
        private: data.private,
        url: data.html_url,
    };
}

export async function createIssue(params: {
    owner?: string;
    repo: string;
    title: string;
    body?: string;
}) {
    const octokit = getOctokit();
    const owner = await resolveOwner(octokit, params.owner);

    const { data } = await octokit.rest.issues.create({
        owner,
        repo: params.repo,
        title: params.title,
        body: params.body,
    });

    return {
        repo: `${owner}/${params.repo}`,
        number: data.number,
        title: data.title,
        url: data.html_url,
    };
}
export async function createCommit(params: {
    owner?: string;
    repo: string;
    path: string;
    content: string;
    message: string;
    branch?: string;
}) {
    const octokit = getOctokit();
    const owner = await resolveOwner(octokit, params.owner);

    // 1. ¿El archivo ya existe? Si existe, necesitamos su sha para actualizarlo.
    let sha: string | undefined;
    try {
        const { data: existing } = await octokit.rest.repos.getContent({
            owner,
            repo: params.repo,
            path: params.path,
            ref: params.branch,
        });

        if (Array.isArray(existing) || existing.type !== "file") {
            throw new Error(`La ruta "${params.path}" es una carpeta, no un archivo.`);
        }
        sha = existing.sha;
    } catch (error) {
        // Un 404 aquí solo significa que el archivo no existe todavía: lo vamos a crear
        if ((error as { status?: number }).status !== 404) {
            throw error;
        }
    }

    // 2. Crear o actualizar el archivo (esto genera el commit)
    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo: params.repo,
        path: params.path,
        message: params.message,
        content: Buffer.from(params.content, "utf-8").toString("base64"),
        branch: params.branch,
        sha,
    });

    return {
        repo: `${owner}/${params.repo}`,
        path: params.path,
        action: sha ? "actualizado" : "creado",
        commitSha: data.commit.sha?.slice(0, 7),
        url: data.commit.html_url,
    };
}

export async function listIssues(params: {
    owner?: string;
    repo: string;
    perPage?: number;
}) {
    const octokit = getOctokit();
    const owner = await resolveOwner(octokit, params.owner);

    const { data } = await octokit.rest.issues.listForRepo({
        owner,
        repo: params.repo,
        state: "open",
        per_page: params.perPage ?? 30,
    });

    // GitHub trata los pull requests como un tipo de issue: los filtramos
    const issues = data
        .filter((item) => !item.pull_request)
        .map((issue) => ({
            number: issue.number,
            title: issue.title,
            author: issue.user?.login ?? "desconocido",
            labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")),
            url: issue.html_url,
        }));

    return { repo: `${owner}/${params.repo}`, issues };
}