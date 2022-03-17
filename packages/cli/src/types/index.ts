import { Command } from "commander-completion";

/**
 * CommandDefinition is an object from commander.js
 * program.opts() - show options
 * program.args - show arguments passed by user
 */
export type CommandDefinition = (program: Command) => void;
