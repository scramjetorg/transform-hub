export type TelemetryAdaptersConfig = {
    loki?: {
        host: string,
        replaceTimestamp: boolean,
        interval?: number,
        labels: { [key: string]: string }
    }
}

export type TelemetryConfig = {
    status: boolean,
    adapter: "loki"
} & TelemetryAdaptersConfig;
