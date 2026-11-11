const MINIMUM_BUN_VERSION = [1, 4, 2] as const;

export function assertSupportedBunVersion(version: string | undefined): void {
    const match = version?.match(/^(\d+)\.(\d+)\.(\d+)([-+].*)?$/);
    if (!match) {
        throw new Error(`runner-bun: Bun ${MINIMUM_BUN_VERSION.join(".")} or newer is required (found ${version ?? "unknown runtime"})`);
    }

    const actual = match.slice(1, 4).map(Number);
    const belowMinimum = actual[0] < MINIMUM_BUN_VERSION[0]
        || (actual[0] === MINIMUM_BUN_VERSION[0] && actual[1] < MINIMUM_BUN_VERSION[1])
        || (actual[0] === MINIMUM_BUN_VERSION[0] && actual[1] === MINIMUM_BUN_VERSION[1] && actual[2] < MINIMUM_BUN_VERSION[2])
        || (actual[0] === MINIMUM_BUN_VERSION[0] && actual[1] === MINIMUM_BUN_VERSION[1]
            && actual[2] === MINIMUM_BUN_VERSION[2] && match[4]?.startsWith("-") === true);
    if (belowMinimum) {
        throw new Error(`runner-bun: Bun ${MINIMUM_BUN_VERSION.join(".")} or newer is required (found ${version})`);
    }
}
