import { ConfigFileDefault } from "@scramjet/config";
import { SessionConfigEntity } from "../../types";
import { sessionId } from "../../utils/sessionId";
import isUUID from "validator/lib/isUUID";
import { sessionConfigFile } from "../paths";

// Session configuration represents configuration used internally
// that is stored and used through current shell session time that runs Cli.
export class SessionConfig extends ConfigFileDefault<SessionConfigEntity> {
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

    get lastPackagePath() { return this.get().lastPackagePath; }
    get lastInstanceId() { return this.get().lastInstanceId; }
    get lastSequenceId() { return this.get().lastSequenceId; }
    get lastSpaceId() { return this.get().lastSpaceId; }
    get lastHubId() { return this.get().lastHubId; }
    get sessionId() { return this.get().sessionId; }

    setLastPackagePath(lastPackagePath: string): boolean {
        return this.setEntry("lastPackagePath", lastPackagePath) as boolean;
    }
    setLastInstanceId(lastInstanceId: string): boolean {
        return this.setEntry("lastInstanceId", lastInstanceId) as boolean;
    }
    setLastSequenceId(lastSequenceId: string): boolean {
        return this.setEntry("lastSequenceId", lastSequenceId) as boolean;
    }
    setLastSpaceId(lastSpaceId: string): boolean {
        return this.setEntry("lastSpaceId", lastSpaceId) as boolean;
    }
    setLastHubId(lastHubId: string): boolean {
        return this.setEntry("lastHubId", lastHubId) as boolean;
    }
    protected validateEntry(key: string, value: any): boolean | null {
        switch (key) {
            case "lastPackagePath":
                return null;
            case "lastInstanceId":
            case "lastSequenceId":
            case "lastSpaceId":
            case "lastHubId": {
                return isUUID(value, 4);
            }
            case "sessionId":
                return null;
            default:
                return false;
        }
    }
}
