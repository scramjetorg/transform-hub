export type ConnectedSTHInfoDetails = {
    created?: string;
    lastConnected?: string;
    lastDisconnected?: string;
}

export type ConnectedSTHInfo = {
    id: string,
    info: ConnectedSTHInfoDetails,
    healthy: boolean,
    selfHosted: boolean,
    isConnectionActive: boolean,
    description?: string,
    tags?: string[],
    disconnectReason?: string;
};

export type HealthCheckInfo = {
    uptime: number;
    timestamp: number;
    modules: {
        [key: string]: boolean;
    };
}
