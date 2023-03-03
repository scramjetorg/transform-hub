import { randomBytes, scryptSync } from "crypto";

export function generateSTHKey(daughterKey: string) {
    const sessionId = randomBytes(12).toString("base64") +
        daughterKey.substring(0, 16);

    return sessionId + scryptSync(sessionId, daughterKey, 96).toString("base64");
}
