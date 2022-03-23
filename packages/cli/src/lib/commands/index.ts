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
import { template } from "./template";

export const commands: CommandDefinition[] = [
    auth,
    scope,
    pack,
    host,
    hub,
    config,
    scope,
    sequence,
    space,
    instance,
    topic,
    template,
    // FIXME: completion not in draft
    completion,
];
