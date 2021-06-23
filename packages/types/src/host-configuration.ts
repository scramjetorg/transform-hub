export type ContainerConfiguration = {
    image: string,
    maxMem: number
}

export type HostConfiguration = {
    docker: {
        prerunner: ContainerConfiguration,
        runner: ContainerConfiguration
    },
    host: {
        port: number,
        apiSocket: string,
        apiBase: string;
    }
}

export type PartialHostConfiguration = {
    [P in keyof HostConfiguration]?: HostConfiguration[P]
}
