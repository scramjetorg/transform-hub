import type { CommandDescriptor } from "@scramjet/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { displayMessage } from "../../lib/output";
import { CompleterParams } from "../../events/completerDetails";
import { CommandCompleter } from "./commandCompleter";
import { runScript } from "../../helpers/runScript";

const completionScriptsDir = resolve(__dirname, "../../../scripts/completion");
const completionInstallScript = resolve(completionScriptsDir, "install.sh");
const completionUninstallScript = resolve(completionScriptsDir, "uninstall.sh");

export class Completion {
    private static formatForSiScript(completerParams: CompleterParams) {
        if (Array.isArray(completerParams)) return `${completerParams.join(" ")}`;
        return `|${completerParams}`;
    }

    public static complete(command: CommandDescriptor) {
        const compWords = (process.env.COMP_WORDS || "").split(" ");
        const compCword = Number(process.env.COMP_CWORD);
        const comperly = new CommandCompleter(command).complete(compWords, compCword);

        const siComperly = this.formatForSiScript(comperly);

        process.stdout.write(siComperly);
    }

    /** Print the shell integration script only; installation remains opt-in. */
    public static script() {
        process.stdout.write(readFileSync(resolve(completionScriptsDir, "si"), "utf8"));
    }

    public static async install() {
        await runScript(completionInstallScript);

        displayMessage("Scramjet CLI completion script installed. Please restart bash");
    }
    public static async uninstall() {
        await runScript(completionUninstallScript);

        displayMessage("Scramjet CLI completion script uninstalled. Please restart bash");
    }
}
