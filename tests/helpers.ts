// Fabrica un error como los que lanza Octokit: un Error normal con un "status" añadido
export function httpError(status: number, extra: Record<string, unknown> = {}) {
    return Object.assign(new Error(`HTTP ${status}`), { status }, extra);
}