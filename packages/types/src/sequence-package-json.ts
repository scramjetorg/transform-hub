
export type SequencePackageJSON = {
    name?: string,
    version?: string,
    main: string,
    engines?: Record<string, string>
    scramjet?: {
        // @TODO it's not used anywhere, we're using runtime config images instead
        image?: string,
        config?: {
            ports: `${number}/${'tcp' | 'udp'}`[]
          }
    }
}

function isOptionalString(value: unknown): value is string | undefined {
    return typeof value === 'undefined' || typeof value === 'string'
}

function isValidPortsConfiguration(ports: unknown): ports is `${number}/${'tcp' | 'udp'}`[] {
    if (!Array.isArray(ports)) {
        return false;
    }

    return ports.every(entry => typeof entry === "string" && (/^\d{3,5}\/(tcp|udp)$/).test(entry));
}

// @TODO rewrite it using decoding library like https://github.com/joanllenas/ts.data.json
export function isValidSequencePackageJSON(value: unknown): value is SequencePackageJSON {
    if(typeof value !== 'object') {
        return false
    }
    
    const v = value as SequencePackageJSON
    
    const enginesAreValid = v.engines === undefined || (
        typeof v.engines === 'object'
        && Object.values(v.engines).every(val => typeof val === 'string'))

    const scramjetConfigIsValid = v.scramjet === undefined || (
        isOptionalString(v.scramjet.image)
        && (v.scramjet.config === undefined || (
            typeof v.scramjet.config.ports === 'object'
            && isValidPortsConfiguration(v.scramjet.config.ports)
        ))
    )

    return enginesAreValid
        && scramjetConfigIsValid
        && typeof v.main === 'string'
        && isOptionalString(v.name)
        && isOptionalString(v.version)    
}