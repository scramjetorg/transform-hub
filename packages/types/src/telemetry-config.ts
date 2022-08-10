export type TelemetryAdaptersConfig = {
    loki?: {
        host: string,
        replaceTimestamp: boolean,
        interval?: number,
        labels: { [key: string]: string }
    }
}

export type TelemetryConfig = {
    status: "off" | "on" | "ask",
    adapter: "loki"
} & TelemetryAdaptersConfig;
