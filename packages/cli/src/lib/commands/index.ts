
import { CommandDefinition } from "../../types";
import { auth } from "./auth";
import { config } from "./config";
import { host } from "./host";
import { hub } from "./hub";
import { instance } from "./instance";
import { pack } from "./pack";
import { scope } from "./scope";
import { sequence } from "./sequence";
import { space } from "./space";
import { topic } from "./topic";
import { completion } from "./completion";

export const commands: CommandDefinition[] = [
    auth,
    pack,
    host,
    hub,
    config,
    scope,
    sequence,
    space,
    instance,
    topic,
    completion
];
