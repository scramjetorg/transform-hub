export type GetConfigResponse = {
    config: {
        /**
        * Enables/disables colorized logs.
        */
        logColors: boolean;

        /**
        * MultiManager api base.
        */
        apiBase: string;

        /**
            * MultiManager server hostname
            */
        hostname: string;

        /**
        * Allow to connect Host providing id but hasn't been registered in Manager.
        */
        allowUnknownHosts: boolean;

        /**
        * Manager id.
        */
        id: string;

        /**
        * Port for server listening for incoming Host connections.
        */
        sthServerPort: number;

        /**
        * Host controller configuration.
        */
        sthController: {
            unhealthyTimeoutMs: number;
        }
    }
}
