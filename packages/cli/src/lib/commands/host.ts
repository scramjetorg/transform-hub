import { Readable } from "stream";
import { CommandDefinition } from "../../types";
import { getHostClient } from "../common";
import { displayEntity, displayStream } from "../output";

/**
 * Initializes `host` command.
 *
 * @param {Command} program Commander object.
 */
export const host: CommandDefinition = (program) => {
    const hostCmd = program
        .command("host [command]")
        .description("something");

    /**
    * Command `si host version`
    * Get STH version number from package.json file
    * Log: version number
    */
    hostCmd
        .command("version")
        .description("get version")
        .action(async () => displayEntity(program, getHostClient(program).getVersion()));

    /**
    * Command `si host logs`
    * Show whole logs from host
    * Not fully implemented
    * Current log: status 500
    * Desired log: object in format
    *
    */
    hostCmd
        .command("logs")
        .description("show all instances logs")
        .action(async () => displayStream(program, getHostClient(program).getLogStream<Readable>()));

    /**
    * Command `si host load`
    * Log: avgLoad, currentLoad, memFree, memUsed, fsSize
    */
    hostCmd
        .command("load")
        .description("show load")
        .action(async () => displayEntity(program, getHostClient(program).getLoadCheck()));
};
