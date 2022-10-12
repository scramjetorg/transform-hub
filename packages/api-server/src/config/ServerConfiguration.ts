import { FileBuilder, ReadOnlyConfig } from "@scramjet/utility";
import { ServerConfig } from "../types/ServerConfig";

export class ServerConfiguration extends ReadOnlyConfig<ServerConfig> {
    // eslint-disable-next-line complexity
    protected validateEntry(key: string, value: any): boolean | null {
        switch (key) {
            case "verbose":
                if (value === undefined) return null;
                if (typeof value === "boolean") return true;
                return false;
            case "server":
                return null;
            case "sslKeyPath":
            case "sslCertPath":
            {
                if (value === undefined) return null;
                if (typeof value !== "string") return false;
                const sslFile = FileBuilder(value);

                return sslFile.exists() && sslFile.isReadable();
            }
            case "router":
                return null;
            default:
                return true; // because ServerConfig can be an empty object
        }
    }
}
