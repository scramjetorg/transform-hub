export type ConnectedSTHInfoDetails = {
    created?: Date;
    lastConnected?: Date;
    lastDisconnected?: Date;
}

export type ConnectedSTHInfo = {
    id: string,
    info: ConnectedSTHInfoDetails,
    healthy: boolean,
    selfHosted: boolean,
    isConnectionActive: boolean,
    description?: string,
    tags?: Array<string> ,
    disconnectReason?: string;
};

export type HealthCheckInfo = {
    uptime: number;
    timestamp: number;
    modules: {
        [key: string]: boolean;
    };
}
