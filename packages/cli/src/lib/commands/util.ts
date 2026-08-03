import { prettyPrint } from "@scramjet/obj-logger";
import { StringStream } from "scramjet";
import { cmd, type CommandDescriptor } from "@scramjet/config";
import { displayStream } from "../output";

/**
 * Builds the `util` command descriptor tree.
 */
export const utilCommand: CommandDescriptor = cmd("util", (b) => {
    b
        .alias("u")
        .desc("Various utilities")
        .children(
            cmd("log-format", (c) => {
                c
                    .alias("lf")
                    .option("--no-color", "Do not colorize the values")
                    .desc("Colorizes and prints out nice colorful log files")
                    .action((options: Record<string, unknown>) => {
                        const color = options.color !== false;

                        const parser = prettyPrint({ colors: color });

                        const out = StringStream.from(process.stdin)
                            .lines()
                            .parse(x => {
                                try {
                                    return JSON.parse(x);
                                } catch {
                                    return undefined;
                                }
                            })
                            .stringify(parser);

                        return displayStream(out);
                    });
            })
        );
});
