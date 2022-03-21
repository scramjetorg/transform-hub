import { CommandDefinition } from "../../types";
import { setConfigValue } from "../config";

/**
 * Initializes `auth` command.
 *
 * @param {Command} program Commander object.
 */
export const auth: CommandDefinition = (program) => {
    const JWS_REGEX = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;

    const authCmd = program
        .command("auth [command]");

    /**
    * Command `si host version`
    * Get STH version number from package.json file
    * Log: version number
    */
    authCmd
        .command("set-token")
        .argument("<token>")
        .description("Set Platform auth token")
        .action(async (token: string) => {
            if (token.match(JWS_REGEX)) {
                setConfigValue("token", token);
            } else {
                // eslint-disable-next-line no-console
                console.error("Invalid token");
            }
        });
};
