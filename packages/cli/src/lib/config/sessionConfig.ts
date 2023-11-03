import { ConfigFileDefault } from "@scramjet/utility";
import { SessionConfigEntity } from "../../types";
import { sessionId } from "../../utils/sessionId";
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
        return this.setEntry("lastPackagePath", lastPackagePath);
    }
    setLastInstanceId(lastInstanceId: string): boolean {
        return this.setEntry("lastInstanceId", lastInstanceId);
    }
    setLastSequenceId(lastSequenceId: string): boolean {
        return this.setEntry("lastSequenceId", lastSequenceId);
    }
    setLastSpaceId(lastSpaceId: string): boolean {
        return this.setEntry("lastSpaceId", lastSpaceId);
    }
    setLastHubId(lastHubId: string): boolean {
        return this.setEntry("lastHubId", lastHubId);
    }
    protected validateEntry(key: string): boolean | null {
        switch (key) {
            case "lastPackagePath":
            case "lastSpaceId":
            case "lastSequenceId":
            case "lastHubId":
            case "lastInstanceId":
            case "sessionId":
                return null;
            default:
                return false;
        }
    }
}
