import { CommandDefinition, isProductionEnv } from "../../types";
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
import { profileConfig } from "../config";

const isProdEnv = isProductionEnv(profileConfig.getEnv());

export const commands: CommandDefinition[] = [
    hub,
    config,
    isProdEnv ? scope : () => {},
    isProdEnv ? space : () => {},
    sequence,
    instance,
    topic,
    // waiting for working implementation
    isDevelopment() ? init : () => {},
    completion,
    util
];
