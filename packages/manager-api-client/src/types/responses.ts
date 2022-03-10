export type VersionResponse = {
    version: string;
};

export type HostResponse = {
    id: string;
    info: {
        created: string;
        remoteAddress: string;
        lastConnected: string;
    };
    healthy: boolean;
    isConnectionActive: boolean;
}
