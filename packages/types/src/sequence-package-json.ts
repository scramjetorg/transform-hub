import { InstanceArgs } from "./instance";

export type PortConfig = `${number}/${"tcp" | "udp"}`

export type SequencePackageJSONScramjetConfig = {
    ports?: PortConfig[] | null
}

export type SequencePackageJSONScramjetSection = {
    config?: SequencePackageJSONScramjetConfig | null
}

export type SequencePackageJSON = {
    name?: string | null
    version?: string | null
    main: string,
    engines?: Record<string, string> | null
    scramjet?: SequencePackageJSONScramjetSection | null // TODO: Unused value?
    description?: string
    author?: string
    keywords?: string[]
    args?: InstanceArgs
    exposePath?: string;
    exposeHost?: string;
    tags?: string[];
    repository?: {
        type: string;
        url: string;
        directory?: string;
    } | string;
}
