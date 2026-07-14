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
