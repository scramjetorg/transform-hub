import { Command } from "commander";

export type CommandDefinition = (program: Command) => void;
