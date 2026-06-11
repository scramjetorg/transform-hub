import { ManagerConfiguration } from "@scramjet/types";

export const defaultConfig: ManagerConfiguration = {
    logColors: true,
    logLevel: "info",
    apiBase: "/api/v1",
    id: "cpm-manager",
    sthController: {
        unhealthyTimeoutMs: 61_000,
    }
};
