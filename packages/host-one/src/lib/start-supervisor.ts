import { Logger } from "@scramjet/types";
import { spawn } from "child_process";
import { resolve } from "path";
import { close } from "@scramjet/logger";

async function startSupervisor(logger: Logger, socketPath: string) {

    if (!socketPath) {
        return Promise.reject(new Error("The path to socket is incorrect: " + socketPath));
    }

    // TODO: is it possible to rewrite this in such a way that it works with ts-node as well?
    // eslint-disable-next-line no-extra-parens
    const isTSNode = !!(process as any)[Symbol.for("ts-node.register.instance")];

    let supervisorPath = "../../../dist/supervisor/bin/supervisor.js";
    let executable = process.execPath;

    if (isTSNode) {
        supervisorPath = "../../../supervisor/src/bin/supervisor.ts";
        executable = "ts-node";
    }

    const path = resolve(__dirname, supervisorPath);
    const command: string[] = [path, socketPath];
    const supervisor = spawn(executable, command);

    logger.info("Supervisor spawned");

    supervisor.on("error", function(err) {
        // What do we want to do if a Supervisor child process emits error event?
        logger.error("Supervisor process " + supervisor.pid + " threw an error: " + err);
    });

    supervisor.on("exit", function(code: any, signal: any) {
        // Do we want to handle the Supervisor exit event and if so, how?
        logger.log("Supervisor process exited with code: " + code + ", signal: " + signal);
        close();
        setTimeout(() => {
            process.exit(code);
        }, 10);
    });

    supervisor.stdout.pipe(process.stdout);
    supervisor.stderr.pipe(process.stderr);

    return Promise.resolve(supervisor.pid);
}

export { startSupervisor };
