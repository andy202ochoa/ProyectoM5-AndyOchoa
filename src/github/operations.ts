import { getOctokit } from "./client.js";

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