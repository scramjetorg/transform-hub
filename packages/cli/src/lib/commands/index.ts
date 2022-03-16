import { CommandDefinition } from "../../types";
import { config } from "./config";
import { create } from "./create";
import { host } from "./host";
import { hub } from "./hub";
import { instance } from "./instance";
import { pack } from "./pack";
import { scope } from "./scope";
import { sequence } from "./sequence";
import { space } from "./space";
import { topic } from "./topic";

export const commands: CommandDefinition[] = [
    pack,
    host,
    hub,
    config,
    create,
    scope,
    sequence,
    space,
    instance,
    topic
];
