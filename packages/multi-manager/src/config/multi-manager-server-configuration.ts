import { ReadOnlyConfig, isApiVersion, isPort, isUrlPath } from "@scramjet/utility";
import { MultiManagerServerOptions } from "../types/multi-manager-types";
import { isIP } from "net";

export class MultiManagerServerConfig extends ReadOnlyConfig<MultiManagerServerOptions> {
    protected validateEntry(key: string, value: any): boolean | null {
        return MultiManagerServerConfig.validateEntry(key, value);
    }
    static validateEntry(key: string, value: any): boolean | null {
        switch (key) {
            case "apiBase":
                return isUrlPath(value);
            case "apiPort":
                return isPort(value);
            case "apiHost":
                return isIP(value) > 0;
            case "version":
                return isApiVersion(value);
            default:
                return false;
        }
    }
}
