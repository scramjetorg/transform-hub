import { K8SAdapterConfiguration } from "@scramjet/types";
import { JsonDecoder } from "ts.data.json";

export const adapterConfigDecoder = JsonDecoder.object<K8SAdapterConfiguration>({
    authConfigPath: JsonDecoder.optional(JsonDecoder.string),
    namespace: JsonDecoder.string,
    sthPodHost: JsonDecoder.string,
    runnerImage: JsonDecoder.string,
    sequencesRoot: JsonDecoder.string
}, "K8SAdapterConfiguration");
