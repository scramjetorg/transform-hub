export type ApiClientFactory<TClient, TUtils = unknown> = (apiBase: string, utils: TUtils) => TClient;
