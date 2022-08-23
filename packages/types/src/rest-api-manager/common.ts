export type ConnectedSTHInfoDetails = {
    created?: Date;
    lastConnected?: Date;
    lastDisconnected?: Date;
}

export type ConnectedSTHInfo = {
    id: string,
    info: ConnectedSTHInfoDetails,
    healthy: boolean,
    isConnectionActive: boolean
};

export type HealthCheckInfo = {
    uptime: number,
    timestamp: number,
    modules: {
        [key: string]: boolean
    }
}
