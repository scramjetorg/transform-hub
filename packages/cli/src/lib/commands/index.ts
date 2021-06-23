
import { CommandDefinition } from "../../types";
import { host } from "./host";
import { instance } from "./instance";
import { pack } from "./pack";
import { sequence } from "./sequence";


export const commands: CommandDefinition[] = [
    pack,
    host,
    sequence,
    instance
];
