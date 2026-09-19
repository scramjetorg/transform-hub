type OwnedRunnerContainer = {
    stop: (options: { t: number }) => Promise<unknown>;
    kill: () => Promise<unknown>;
};

function isDockerNotFound(error: unknown): boolean {
    return typeof error === "object" && error !== null && (error as { statusCode?: unknown }).statusCode === 404;
}

export async function stopAutoRemoveRunnerContainer(container: OwnedRunnerContainer): Promise<void> {
    try {
        await container.stop({ t: 10 });
    } catch (error) {
        if (isDockerNotFound(error)) return;

        try {
            await container.kill();
        } catch (killError) {
            if (isDockerNotFound(killError)) return;
            throw killError;
        }

        throw error;
    }
}
