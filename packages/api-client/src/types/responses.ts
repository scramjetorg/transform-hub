export type InstanceResponse = {
    id: string,
    sequence: string
}

export type SequenceResponse = {
    id: string;
    config: {
        type: "docker" | "process",
        container?: {
            image: string,
            maxMem: number,
            exposePortsRange: [number, number],
            hostIp: string
        },
        name: string,
        version: string,
        engines: {
            [key: string]: string
        },
        config: any,
        entrypointPath: string,
        id: string
    },
    instances: string[]
}

export type LoadCheckResponse = any;
