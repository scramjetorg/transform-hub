import { PublicSTHConfiguration, STHConfiguration } from "@scramjet/api-types";
import { maskConfig } from "../mask-config";
import { sthOutboundVerser2Options } from "../verser2-config";

export function toPublicSTHConfig(config: STHConfiguration): PublicSTHConfiguration {
    const { kubernetes: kubeFull, sequencesRoot: optionsSequencesRoot2, ...safe } = config;

    const { authConfigPath: optionsAuthConfigPath, sequencesRoot: optionsSequencesRoot, ...kubernetes } = kubeFull;
    const masked = maskConfig({ ...safe, kubernetes }, sthOutboundVerser2Options) as PublicSTHConfiguration;

    if (masked.platform?.apiKey) masked.platform.apiKey = "********";
    if (masked.couchdb?.pass) masked.couchdb.pass = "********";
    if (masked.manager?.connectionBundle) {
        const bundle = masked.manager.connectionBundle;
        if (bundle.credentials) {
            bundle.credentials = Object.fromEntries(Object.keys(bundle.credentials).map((key: string) => [key, "********"]));
        }
        if (bundle.trust?.caPem) bundle.trust.caPem = "********";
    }

    return masked;
}
