import { SessionConfigEntity } from "../../types";
import { sessionId } from "../../utils/sessionId";
import { createSessionDirIfNotExists, sessionConfigFile } from "../paths";
import DefaultFileConfig from "./defaultFileConfig";

// Session configuration represents configuration used internally
// that is stored and used through current shell session time that runs Cli.
export class SessionConfig extends DefaultFileConfig {
    constructor() {
        const defaultSessionConfig: SessionConfigEntity = {
            lastPackagePath: "",
            lastInstanceId: "",
            lastSequenceId: "",
            lastSpaceId: "",
            lastHubId: "",
            sessionId: sessionId()
        };

        super(sessionConfigFile, defaultSessionConfig);
    }
    getConfig(): SessionConfigEntity {
        return super.getConfig();
    }
    getDefaultConfig(): SessionConfigEntity {
        return super.getDefaultConfig();
    }
    writeConfig(config: any): boolean {
        createSessionDirIfNotExists();
        return super.writeConfig(config);
    }
    setLastPackagePath(lastPackagePath: string): boolean {
        return this.setConfigValue("lastPackagePath", lastPackagePath) as boolean;
    }
    setLastInstanceId(lastInstanceId: string): boolean {
        return this.setConfigValue("lastInstanceId", lastInstanceId) as boolean;
    }
    setLastSequenceId(lastSequenceId: string): boolean {
        return this.setConfigValue("lastSequenceId", lastSequenceId) as boolean;
    }
    setLastSpaceId(lastSpaceId: string): boolean {
        return this.setConfigValue("lastSpaceId", lastSpaceId) as boolean;
    }
    setLastHubId(lastHubId: string): boolean {
        return this.setConfigValue("lastHubId", lastHubId) as boolean;
    }
}
