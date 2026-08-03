/**
 * API client factory and client contract types.
 */

export type ApiClientFactory<TClient, TUtils = unknown> = (apiBase: string, utils: TUtils) => TClient;
