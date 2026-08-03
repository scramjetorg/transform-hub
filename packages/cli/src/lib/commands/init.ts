import { cmd, type CommandDescriptor } from "@scramjet/config";
import { spawnSync } from "child_process";

export const initCommand: CommandDescriptor = cmd("init", (b) => {
    b
        .alias("i")
        .usage("[command] [options...]")
        .desc("Create all the necessary files and start working on your Sequence")
        .children(
            cmd("sequence", (c) => {
                c
                    .alias("seq")
                    .argument("[language]", "Choose the language to develop the sequence")
                    .argument("[type]", "Choose transformation type of the sequence")
                    .option("-p, --path <dir-path>", "Path to create sequence")
                    .desc("Create all the necessary files and start working on your Sequence")
                    .completer({ path: "dirnames" })
                    .action(async (language: string, type: string, options: Record<string, unknown>) => {
                        const path = options.path as string;
                        const lang = language || "js";
                        const typ = type || "transformer";
                        const args = `init scramjetorg/sequence ${lang}-${typ}`;

                        const result = spawnSync("npm", args.split(" "), { stdio: "inherit", cwd: path });
                        if (result.error) throw result.error;
                        if (result.signal || result.status !== 0) {
                            throw new Error(
                                `npm init exited unsuccessfully (status=${result.status ?? "null"}, signal=${result.signal ?? "null"})`
                            );
                        }
                    });
            })
        );
});
