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