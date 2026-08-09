import type { ArgumentDescriptor, CommandDescriptor, OptionDescriptor } from "@scramjet/config";
import { CommandIterator } from "../../helpers/commandIterator";
import { CompWordsIterator } from "./compWordsIterator";
import { CommandCompleterDetails, CompleterParams } from "../../events/completerDetails";

export class CommandCompleter {
    private rootCommand: CommandDescriptor;

    constructor(cmd: CommandDescriptor) {
        this.rootCommand = new CommandIterator(cmd).root().command;
    }

    private commandMatch(cmdName: string, cmd: CommandDescriptor) {
        return cmd.name === cmdName || cmd.alias === cmdName;
    }

    private optionMatch(option: OptionDescriptor, name: string) {
        return `--${option.flag || option.name}` === name || (option.short ? `-${option.short}` === name : false);
    }

    private findCommandHorizontal = (cmdName: string, cmdIt: CommandIterator) => {
        for (; cmdIt.valid(); cmdIt.next()) {
            const cmd = cmdIt.command;

            if (this.commandMatch(cmdName, cmd)) return cmd;
        }
        return null;
    };

    private findLastKnownCommand = (commandIt: CommandIterator, compWordsIt: CompWordsIterator) => {
        let lastFound: CommandDescriptor | null = null;

        for (; compWordsIt.valid(); compWordsIt.next()) {
            const searchedCmdName = compWordsIt.word();

            const cmd = this.findCommandHorizontal(searchedCmdName, commandIt);

            if (!cmd) return null;
            lastFound = cmd;

            if (!commandIt.hasChildren()) {
                compWordsIt.next();
                break;
            }
            commandIt.firstChild();
        }
        return lastFound;
    };

    private getSubcommandsNames(command: CommandDescriptor, subcommandNameStart: string = "") {
        const subcommands: string[] = [];

        (command.children || []).forEach((cmd) => {
            const name = cmd.name;

            if (name.startsWith(subcommandNameStart)) subcommands.push(name);
        });
        return subcommands;
    }

    private getOptionsNames(command: CommandDescriptor, optionNameStart: string = "") {
        const optionFlags: string[] = [];

        (command.options || []).forEach((option: OptionDescriptor) => {
            const optFlag = `--${option.flag || option.name}`;

            if (optFlag && optFlag.startsWith(optionNameStart)) optionFlags.push(optFlag);
            if (option.short && `-${option.short}`.startsWith(optionNameStart)) optionFlags.push(`-${option.short}`);
        });
        return optionFlags;
    }

    private getCommandCompleterDetails(command: CommandDescriptor, argOrOptionName: string) {
        const completerDetails: CommandCompleterDetails = {};
        const meta = command.completerMeta || {};

        if (argOrOptionName in meta) {
            completerDetails[argOrOptionName] = meta[argOrOptionName];
        }

        if (!(argOrOptionName in completerDetails)) return null;

        return completerDetails[argOrOptionName];
    }

    private getFilteredCommandCompleterDetails(command: CommandDescriptor, argOrOptionName: string, valueStart: string = "") {
        const detail = this.getCommandCompleterDetails(command, argOrOptionName);

        if (Array.isArray(detail) && valueStart) {
            return detail.filter((det) => det.startsWith(valueStart));
        }
        return detail;
    }

    private findArgument(args: ArgumentDescriptor[], compWordsIt: CompWordsIterator) {
        for (const arg of args) {
            if (compWordsIt.wordsLeft() > 0) compWordsIt.next();
            else if (compWordsIt.wordsLeft() === 0) return arg;
            else break;
        }
        return null;
    }

    private hasOptionStart(name: string) {
        return name.startsWith("-");
    }

    private findOption(command: CommandDescriptor, optionName: string) {
        const cmdOptions: OptionDescriptor[] = command.options || [];
        const found = cmdOptions.find((opt) => this.optionMatch(opt, optionName));

        return found || null;
    }

    private filterMatchingChoices(choices: string[], matchingStart: string) {
        return choices.filter((choice) => choice.startsWith(matchingStart));
    }

    public complete(compWords: string[], compCword: number): CompleterParams {
        const cmdIt = new CommandIterator(this.rootCommand);
        const compWordsIt = new CompWordsIterator(compWords, compCword);
        const cursorWord = compWords[compCword];

        const cmd = this.findLastKnownCommand(cmdIt, compWordsIt);

        if (!cmd) return [];

        if (cmd.children && cmd.children.length > 0) return this.getSubcommandsNames(cmd, cursorWord);

        const cmdArgs: ArgumentDescriptor[] = cmd.arguments || [];
        const arg = this.findArgument(cmdArgs, compWordsIt);

        if (arg && (arg.required || !this.hasOptionStart(compWordsIt.word()))) {
            const choices: string[] | undefined = arg.choices as string[] | undefined;

            if (choices) return this.filterMatchingChoices(choices, compWordsIt.word());
            return this.getFilteredCommandCompleterDetails(cmd, arg.name, compWordsIt.word()) || [];
        }

        const currentWord = compWordsIt.cursor().word();

        if (this.hasOptionStart(currentWord)) return this.getOptionsNames(cmd, currentWord);

        const previousWord = compWordsIt.previous().word();

        if (this.hasOptionStart(previousWord)) {
            const option = this.findOption(cmd, previousWord);

            if (!option) return [];

            if (option.choices) return this.filterMatchingChoices([...option.choices], currentWord);
            return this.getFilteredCommandCompleterDetails(cmd, option.name, currentWord) || [];
        }

        return [];
    }
}
