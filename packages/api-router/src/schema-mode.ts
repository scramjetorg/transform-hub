import { RouteManifest } from "./manifest";

export type SchemaModule = {
    manifest?: RouteManifest;
    default?: RouteManifest | { collect(): RouteManifest };
    collect?: () => RouteManifest;
};

export function loadManifestFromSchemaModule(module: SchemaModule): RouteManifest {
    if (module.manifest) {
        return module.manifest;
    }

    if (module.collect) {
        return module.collect();
    }

    if (module.default && "collect" in module.default) {
        return module.default.collect();
    }

    if (module.default) {
        return module.default as RouteManifest;
    }

    throw new Error("Schema module does not export a route manifest");
}
