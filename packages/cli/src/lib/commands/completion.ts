import { CommandDefinition } from "../../types";
import { Completion } from "../../handlers/completion";
import { isCompletionScript } from "../../utils/envs";

export const completion: CommandDefinition = (program) => {
    const completionCmd = program.command("completion").addHelpCommand(false).description("Completion operations");

    if (isCompletionScript()) completionCmd.action(() => Completion.complete(program));

    completionCmd.command("install").description("Installs bash completion script").action(Completion.install);
    completionCmd.command("uninstall").description("Uninstalls bash completion script").action(Completion.uninstall);
};
