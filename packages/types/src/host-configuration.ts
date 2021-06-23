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
        hostname: string,
        port: number,
        apiBase: string;
        socketPath: string,
    }
}

export type PartialHostConfiguration = {
    [P in keyof HostConfiguration]?: Partial<HostConfiguration[P]>
}
