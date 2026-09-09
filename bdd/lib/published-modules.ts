import { resolvePublishedModule } from "./published-artifacts";

/** Load a public package entry through the verified-artifact resolver. */
export function publishedModule<T = Record<string, any>>(specifier: string): T {
    return require(resolvePublishedModule(specifier)) as T;
}

export function publishedSourceEntry(packageName: string, ...segments: string[]): string {
    return require.resolve(`${packageName}/${["src", ...segments].join("/")}`);
}
