/**
 * Browser-safe replacements for Node built-ins reached through shared client
 * utilities. Browser fetch ignores the non-standard `agent` option; retaining
 * this no-op shape keeps the public client construction contract intact.
 */
export class Agent {
    destroy(): void {}
}

export const URL = globalThis.URL;
