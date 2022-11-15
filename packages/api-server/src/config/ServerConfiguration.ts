import {
    booleanValidator,
    fileExistsValidator,
    optionalValidator,
    ReadOnlyConfig,
    SchemaValidator,
    stringValidator,
} from "@scramjet/utility";
import { ServerConfig } from "../types/ServerConfig";

const schemaValidator = new SchemaValidator({
    verbose: [optionalValidator, booleanValidator("Server verbose is not valid boolean value")],
    server: [optionalValidator],
    sslKeyPath: [
        optionalValidator,
        stringValidator("Server sslKeyPath is not valid string value"),
        fileExistsValidator("Server sslKeyPath file does not exists or is not readable"),
    ],
    sslCertPath: [
        optionalValidator,
        stringValidator("Server sslCertPath is not valid string value"),
        fileExistsValidator("Server sslCertPath file does not exists or is not readable"),
    ],
    router: [optionalValidator],
});

export class ServerConfiguration extends ReadOnlyConfig<ServerConfig> {
    get verbose() {
        return this.configuration.verbose;
    }
    get server() {
        return this.configuration.server;
    }
    get sslKeyPath() {
        return this.configuration.sslKeyPath;
    }
    get sslCertPath() {
        return this.configuration.sslCertPath;
    }
    get router() {
        return this.configuration.router;
    }
    get errors() {
        return schemaValidator.errors;
    }
    static get schemaValidator() {
        return schemaValidator;
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
