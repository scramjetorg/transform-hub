import { K8SAdapterConfiguration } from "@scramjet/types";
import { JsonDecoder } from "ts.data.json";

export const adapterConfigDecoder = JsonDecoder.object<K8SAdapterConfiguration>({
    authConfigPath: JsonDecoder.optional(JsonDecoder.string),
    namespace: JsonDecoder.string,
    sthPodHost: JsonDecoder.string,
    runnerImages: JsonDecoder.object({
        python3: JsonDecoder.string,
        node: JsonDecoder.string
    }, "K8SImagesDecoder"),
    sequencesRoot: JsonDecoder.string,
    timeout:  JsonDecoder.optional(JsonDecoder.string)
}, "K8SAdapterConfiguration");
