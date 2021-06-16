import { Command } from "commander";
import { startHost } from "@scramjet/host";
import { version } from "../../package.json";
import { commands } from "../lib/commands/index";

const program: Command = new Command() as Command;

for (const command of Object.values(commands))
    command(program);

const options = program
    .version(version)
    .option("-L, --log-level <level>", "Specify log level", "debug")
    .option("-S, --socket-location", "TCP socket location")
    .option("-E, --identify-existing", "Index existing volumes as sequences", false)
    .parse(process.argv)
    .opts()
;

startHost({}, options.socketLocation as string, {
    identifyExisting: options.identifyExisting as boolean
})
    .catch(e => {
        console.error(e.stack);
        process.exitCode = e.exitCode || 1;
        process.exit();
    });

