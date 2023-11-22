import { MonitoringServerConfig } from "@scramjet/types";
import { definedValidator, portValidator, ReadOnlyConfig, SchemaValidator } from "@scramjet/utility";

const schemaValidator = new SchemaValidator({
    port: [definedValidator("Monitoring port should be defined"), portValidator("Monitoring port is invalid")],
    path: [definedValidator("Path should be defined")],
    host: [definedValidator("Host should be defined")]
});

export class MonitoringServerConf extends ReadOnlyConfig<MonitoringServerConfig> {
    get port() {
        return this.configuration.port;
    }
    get host() {
        return this.configuration.host;
    }
    get path() {
        return this.configuration.path;
    }
    get errors() {
        return schemaValidator.errors;
    }
    get config() {
        return this.configuration;
    }

    validate(config: Record<string, any>): boolean {
        return schemaValidator.validate(config);
    }
    protected validateEntry(key: string, value: any): boolean | null {
        return schemaValidator.validateEntry(key, value);
    }
    static validateEntry(key: string, value: any): boolean | null {
        return schemaValidator.validateEntry(key, value);
    }
}
