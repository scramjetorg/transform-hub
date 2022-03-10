export type ConnectedSTHInfo = {
    id: string,
    info: { [key: string]: any },
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
