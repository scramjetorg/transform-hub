import type { CommandDescriptor } from "@scramjet/config";
import { configCommand } from "./config";
import { hubCommand } from "./hub";
import { instanceCommand } from "./instance";
import { scopeCommand } from "./scope";
import { sequenceCommand } from "./sequence";
import { spaceCommand } from "./space";
import { topicCommand } from "./topic";
import { completionCommand } from "./completion";
import { utilCommand } from "./util";
import { initCommand } from "./init";
import { isDevelopment } from "../../utils/envs";
import { storeCommand } from "./store";
import { developerToolsCommand } from "./developerTools";
import { isLinuxOS } from "../helpers/isLinux";

export const commandDescriptors: CommandDescriptor[] = [
    configCommand,
    scopeCommand,
    spaceCommand,
    hubCommand,
    sequenceCommand,
    instanceCommand,
    topicCommand,
    initCommand,
    storeCommand,
    utilCommand,
    ...(isLinuxOS() ? [completionCommand] : []),
    ...(isDevelopment() ? [developerToolsCommand] : [])
];
