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
import { isDevelopment } from "../../utils/isDevelopment";
import { globalConfig } from "../config";

const isProductionEnv = globalConfig.isProductionEnv(globalConfig.getEnv());

export const commands: CommandDefinition[] = [
    hub,
    config,
    isProductionEnv ? scope : () => {},
    isProductionEnv ? space : () => {},
    sequence,
    instance,
    topic,
    // waiting for working implementation
    isDevelopment() ? init : () => {},
    completion,
    util
];
