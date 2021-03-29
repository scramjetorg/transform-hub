import { spawn } from "child_process";
import { resolve } from "path";

async function startSupervisor(socketPath: string) {

    if (!socketPath) {
        return Promise.reject(new Error("The path to socket is incorrect: " + socketPath));
    }

    // TODO: is it possible to rewrite this in such a way that it works with ts-node as well?
    const path = resolve(__dirname, "../../../../dist/supervisor/bin/supervisor.js");
    const command: string[] = [path, socketPath];
    const supervisor = spawn(process.execPath, command);

    supervisor.on("error", function(err) {
        // What do we want to do if a Supervisor child process emits error event?
        console.error("Supervisor process " + supervisor.pid + " threw an error: " + err);
    });

    supervisor.on("exit", function(code: any, signal: any) {
        // Do we want to handle the Supervisor exit event and if so, how?
        console.log("Supervisor process exited with code: " + code + ", signal: " + signal);
    });

    return Promise.resolve(supervisor.pid);
}

export { startSupervisor };
