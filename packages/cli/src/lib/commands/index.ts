import { CommandDefinition } from "../../types";
import { config } from "./config";
import { hub } from "./hub";
import { instance } from "./instance";
import { scope } from "./scope";
import { sequence } from "./sequence";
import { space } from "./space";
import { topic } from "./topic";
import { completion } from "./completion";
import { util } from "./util";
import { init } from "./init";

export const commands: CommandDefinition[] = [
    scope,
    hub,
    config,
    scope,
    sequence,
    space,
    instance,
    topic,
    init,
    // TODO: completion check with version of draft 2.0
    completion,
    util
];
