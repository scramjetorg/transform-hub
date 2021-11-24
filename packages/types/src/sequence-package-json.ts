
export type SequencePackageJSON = {
    name?: string,
    version?: string,
    main: string,
    engines?: Record<string, string>
    scramjet?: {
        // @TODO it's not used anywhere, we're using runtime config images instead
        image?: string,
        config?: {
            ports: `${number}/${"tcp" | "udp"}`[]
          }
    }
}
