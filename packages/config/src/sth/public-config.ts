import { PublicSTHConfiguration, STHConfiguration } from "@scramjet/api-types";
import { maskConfig } from "../..";
import { sthOutboundVerser2Options } from "../verser2-config";

export function toPublicSTHConfig(config: STHConfiguration): PublicSTHConfiguration {
    const { kubernetes: kubeFull, sequencesRoot: optionsSequencesRoot2, ...safe } = config;

    const { authConfigPath: optionsAuthConfigPath, sequencesRoot: optionsSequencesRoot, ...kubernetes } = kubeFull;
    const masked = maskConfig({ ...safe, kubernetes }, sthOutboundVerser2Options) as PublicSTHConfiguration;

    if (masked.platform?.apiKey) masked.platform.apiKey = "********";
    if (masked.couchdb?.pass) masked.couchdb.pass = "********";

    return masked;
}
