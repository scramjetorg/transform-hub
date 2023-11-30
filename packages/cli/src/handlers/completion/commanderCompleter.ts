import { Argument, Command, Option } from "commander";
import { CommandIterator } from "../../helpers/commandIterator";
import { CompWordsIterator } from "./compWordsIterator";
import EventEmitter from "events";
import { CommandCompleterDetails, CompleterDetailsEvent, CompleterParams } from "../../events/completerDetails";

export class CommanderCompleter {
    private rootCommand: Command;

    constructor(cmd: Command) {
        this.rootCommand = new CommandIterator(cmd).root().command;
    }

    private commandMatch(cmdName: string, cmd: Command) {
        return cmd.name() === cmdName || cmd.alias() === cmdName;
    }

    private optionMatch(option: Option, name: string) {
        return option.long === name || option.short === name;
    }

    private findCommandHorizontal = (cmdName: string, cmdIt: CommandIterator) => {
        for (; cmdIt.valid(); cmdIt.next()) {
            const cmd = cmdIt.command;

            if (this.commandMatch(cmdName, cmd)) return cmd;
        }
        return null;
    };

    private findLastKnownCommand = (commandIt: CommandIterator, compWordsIt: CompWordsIterator) => {
        let lastFound: Command | null = null;

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

    private getSubcommandsNames(command: Command, subcommandNameStart: string = "") {
        const subcommands: string[] = [];

        command.commands.forEach((cmd) => {
            const name = cmd.name();

            if (name.startsWith(subcommandNameStart)) subcommands.push(name);
        });
        return subcommands;
    }

    private getOptionsNames(command: Command, optionNameStart: string = "") {
        const optionFlags: string[] = [];

        // @ts-ignore:
        command.options.forEach((option: Option) => {
            const optFlag = option.long || option.short || "";
            
            if (optFlag && optFlag.startsWith(optionNameStart)) optionFlags.push(optFlag);
        });
        return optionFlags;
    }

    private getCommandCompleterDetails(command: Command, argOrOptionName: string) {
        const emiter = command as unknown as EventEmitter;
        const completerDetails: CommandCompleterDetails = {};
        
        emiter.emit(CompleterDetailsEvent, completerDetails);

        if (!(argOrOptionName in completerDetails)) return null;

        return completerDetails[argOrOptionName];
    }

    private getFilteredCommandCompleterDetails(command: Command, argOrOptionName: string, valueStart: string = "") {
        const detail = this.getCommandCompleterDetails(command, argOrOptionName);
        
        if (Array.isArray(detail) && valueStart) {
            return detail.filter((det) => det.startsWith(valueStart));
        }
        return detail;
    }

    private findArgument(args: Argument[], compWordsIt: CompWordsIterator) {
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

    private findOption(command: Command, optionName: string) {
        // @ts-ignore
        const cmdOptions: Option[] = command.options;
        const found = cmdOptions.find((opt) => this.optionMatch(opt, optionName));

        return found || null;
    }

    private filterMatchingChoices(choices: string[], matchingStart: string) {
        return choices.filter((choice) => choice.startsWith(matchingStart));
    }

    // eslint-disable-next-line complexity
    public complete(compWords: string[], compCword: number): CompleterParams {
        const cmdIt = new CommandIterator(this.rootCommand);
        const compWordsIt = new CompWordsIterator(compWords, compCword);
        let cursorWord = compWords[compCword];

        const cmd = this.findLastKnownCommand(cmdIt, compWordsIt);
        // not found = wrong command name in compWords
        if (!cmd) return [];

        // have child commands = children are completer params (else left compWords are arguments or options of command)
        if (cmd.commands.length) return this.getSubcommandsNames(cmd, cursorWord);

        // @ts-ignore
        const cmdArgs: Argument[] = cmd._args;
        // we assume that required arguments are always declared first on list.
        const arg = this.findArgument(cmdArgs, compWordsIt);

        // compWord is required or optional argument = return argument value details if given
        if (arg && (arg.required || !this.hasOptionStart(compWordsIt.word()))) {
            // @ts-ignore
            const choices: string[] | undefined = arg.argChoices;
            if (choices) return this.filterMatchingChoices(choices, compWordsIt.word());
            return this.getFilteredCommandCompleterDetails(cmd, arg.name(), compWordsIt.word()) || [];
        }

        // compWord must be option or option value
        const currentWord = compWordsIt.cursor().word();

        //option value
        if (this.hasOptionStart(currentWord)) return this.getOptionsNames(cmd, currentWord);

        //maybe word is value of previous option
        const previousWord = compWordsIt.previous().word();

        if (this.hasOptionStart(previousWord)) {
            const option = this.findOption(cmd, previousWord);
            if (!option) return [];
            if (option.argChoices) return this.filterMatchingChoices(option.argChoices, currentWord);
            return this.getFilteredCommandCompleterDetails(cmd, option.name(), currentWord) || [];
        }

        return [];
    }
}
