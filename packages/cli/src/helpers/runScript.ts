import { existsSync } from "fs";
import { BashScriptError } from "../errors/bashScriptError";
import { ExecException, exec } from "child_process";

export const runScript = async (scriptPath: string) => {
    const scriptExist = existsSync(scriptPath);

    if (!scriptExist) throw Error(`Unable to find script ${scriptPath}`);

    return new Promise<void>((resolve, reject) => {
        const execCallback = (error: ExecException | null, _stdout: string, stderr: string) => {
            if (error) return reject(new BashScriptError(stderr, error.code));
            return resolve();
        };
        return exec(scriptPath, { encoding: "utf8" }, execCallback);
    })
}
