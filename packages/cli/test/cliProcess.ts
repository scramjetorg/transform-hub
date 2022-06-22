import { resolve as pathResolve } from "path";
import { exec } from "child_process";

type CliResult = {code: number, error: any, stdout: string | Buffer, stderr: string | Buffer};

const cli = (args :string[] = [], env?: NodeJS.ProcessEnv):
    Promise<CliResult> => {
    return new Promise(resolve => {
        exec(`ts-node ${pathResolve("./src/bin/index.ts")} ${args.join(" ")}`,
            { env },
            (error, stdout, stderr) => {
                resolve({
                    code: error && error.code ? error.code : 0,
                    error,
                    stdout,
                    stderr });
            });
    });
};

export default cli;
