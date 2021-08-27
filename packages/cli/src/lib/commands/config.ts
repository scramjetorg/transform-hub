import { CommandDefinition } from "../../types";
import { getConfig, setConfigValue } from "../config";
import { displayObject } from "../output";

export const config: CommandDefinition = (program) => {
    const configCmd = program
        .command("config [command]")
        .alias("c")
        .description("configuration file operations");

    configCmd.command("print")
        .alias("p")
        .description("print out the current config")
        .action(() => displayObject(program, getConfig()));

    configCmd.command("apiUrl <apiUrl>")
        .description("set the hub API url")
        .action((value) => setConfigValue("apiUrl", value));

    configCmd.command("logLevel <logLevel>")
        .description("set the hub API url")
        .action((value) => setConfigValue("log", value));

    // apiUrl: 'http://127.0.0.1:8000/api/v1',
    // logLevel: 'trace',
    // test: false
};
