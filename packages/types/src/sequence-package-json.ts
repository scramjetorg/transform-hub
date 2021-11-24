
export type SequencePackageJSON = {
    name?: string | null
    version?: string | null
    main: string,
    engines?: Record<string, string> | null
    scramjet?: {
        // @TODO it's not used anywhere, we're using runtime config images instead
        image?: string | null
        config?: {
            ports: `${number}/${"tcp" | "udp"}`[]
          } | null
    } | null
}
