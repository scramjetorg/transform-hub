import {
    PortConfig,
    SequencePackageJSON,
    SequencePackageJSONScramjetConfig,
    SequencePackageJSONScramjetSection
} from "@scramjet/types";

import { Err, JsonDecoder, Ok } from "ts.data.json";

const enginesDecoder = JsonDecoder.dictionary(JsonDecoder.string, "EnginesDecoder");

const portDecoder = new JsonDecoder.Decoder<PortConfig>((val) => {
    const isValid = typeof val === "string" && (/^\d{3,5}\/(tcp|udp)$/).test(val);

    return isValid ? new Ok(val as PortConfig) : new Err("Invalid port format");
});

const configDecoder = JsonDecoder.object<SequencePackageJSONScramjetConfig>({
    ports: JsonDecoder.optional(JsonDecoder.array(portDecoder, "PortsDecoder"))
}, "ConfigDecoder");

const scramjetDecoder = JsonDecoder.object<SequencePackageJSONScramjetSection>({
    config: JsonDecoder.optional(configDecoder)
}, "ScramjetSectionDecoder");

type RepositoryObject = {
    type: string;
    url: string;
    directory?: string;
}

const repositoryDecoder = JsonDecoder.oneOf<string | RepositoryObject>([
    JsonDecoder.string,
    JsonDecoder.object<RepositoryObject>({
        type: JsonDecoder.string,
        url: JsonDecoder.string,
        directory: JsonDecoder.optional(JsonDecoder.string)
    }, "repositoryObjectDecoder")
], "repositoryDecoder");

export const sequencePackageJSONDecoder = JsonDecoder.object<SequencePackageJSON>({
    name: JsonDecoder.optional(JsonDecoder.string),
    version: JsonDecoder.optional(JsonDecoder.string),
    main: JsonDecoder.string,
    engines: JsonDecoder.optional(enginesDecoder),
    scramjet: JsonDecoder.optional(scramjetDecoder),
    description: JsonDecoder.optional(JsonDecoder.string),
    author: JsonDecoder.optional(JsonDecoder.string),
    keywords: JsonDecoder.optional(JsonDecoder.array(JsonDecoder.string, "keywordsDecoder")),
    repository: JsonDecoder.optional(repositoryDecoder),
    args: JsonDecoder.optional(JsonDecoder.array(JsonDecoder.succeed, "argsDecoder")),
}, "SequencePackageJSON");
