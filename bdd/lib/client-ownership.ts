/** Reuse a module-owned client; scenario cleanup must not replace or dispose it. */
export function reuseExternalClient<T>(current: T | undefined, create: () => T): T {
    return current || create();
}

export function externalClientForUrl<T extends { dispose?: () => void }>(
    current: T | undefined,
    currentUrl: string | undefined,
    requestedUrl: string,
    create: () => T
): { client: T; url: string } {
    if (current && currentUrl === requestedUrl) return { client: current, url: currentUrl };
    current?.dispose?.();
    return { client: create(), url: requestedUrl };
}

export function selectScenarioClient<T>(scenarioClient: T | undefined, externalClient: T | undefined): T | undefined {
    return scenarioClient || externalClient;
}

export function withSelectedClient<T, R>(
    scenarioClient: T | undefined,
    externalClient: T | undefined,
    operation: (client: T) => R
): R {
    const client = selectScenarioClient(scenarioClient, externalClient);
    if (!client) throw new Error("No HostClient is available");
    return operation(client);
}

export function disposeScenarioClient<T extends { dispose?: () => void }>(resources: { hostClient?: T }): void {
    const client = resources.hostClient;
    resources.hostClient = undefined;
    client?.dispose?.();
}
