export type PortConfig = `${number}/${"tcp" | "udp"}`

export type SequencePackageJSONScramjetConfig = {
    ports?: PortConfig[] | null
}

export type SequencePackageJSONScramjetSection = {
    // @TODO it's not used anywhere, we're using runtime config images instead
    config?: SequencePackageJSONScramjetConfig | null
}

export type SequencePackageJSON = {
    name?: string | null
    version?: string | null
    main: string,
    engines?: Record<string, string> | null
    scramjet?: SequencePackageJSONScramjetSection | null
}
