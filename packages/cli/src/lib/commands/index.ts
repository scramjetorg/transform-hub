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
import { isDevelopment } from "../../utils/envs";
import { store } from "./store";
import { developerTools } from "./developerTools";
import { si } from "./si";

export const commands: CommandDefinition[] = [
    si,
    completion,
    config,
    scope,
    space,
    hub,
    sequence,
    instance,
    topic,
    init,
    store,
    util,
    isDevelopment() ? developerTools : () => { },
];
