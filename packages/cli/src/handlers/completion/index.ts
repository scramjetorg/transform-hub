import { Command } from "commander";
import { dirname, resolve } from "path";
import { displayMessage } from "../../lib/output";
import { CompleterParams } from "../../events/completerDetails";
import { CommanderCompleter } from "./commanderCompleter";
import { runScript } from "../../helpers/runScript";

const requireFileNameDir = dirname(require.main!.filename);
// This should be relative to entry point from package.json/bin/si
const completionScriptsDir = resolve(requireFileNameDir, "../scripts/completion");
const completionInstallScript = resolve(completionScriptsDir, "install.sh");
const completionUninstallScript = resolve(completionScriptsDir, "uninstall.sh");

export class Completion {
    private static formatForSiScript(completerParams: CompleterParams) {
        if (Array.isArray(completerParams)) return `${completerParams.join(" ")}`;
        return `|${completerParams}`;
    }

    public static complete(command: Command) {
        const compWords = (process.env.COMP_WORDS || "").split(" ");
        const compCword = Number(process.env.COMP_CWORD);
        const comperly = new CommanderCompleter(command).complete(compWords, compCword);

        const siComperly = this.formatForSiScript(comperly);

        process.stdout.write(siComperly);
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
