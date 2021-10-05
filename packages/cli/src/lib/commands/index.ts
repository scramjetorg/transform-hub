
import { CommandDefinition } from "../../types";
import { config } from "./config";
import { host } from "./host";
import { instance } from "./instance";
import { pack } from "./pack";
import { sequence } from "./sequence";
import { topic } from "./topic";

export const commands: CommandDefinition[] = [
    pack,
    host,
    config,
    sequence,
    instance,
    topic
];
