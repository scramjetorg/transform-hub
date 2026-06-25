import { LogLevel } from "@scramjet/runtime-types";
import { LogLevelStrings } from "../constants";

export const isLogLevel = (lvl: string): lvl is LogLevel => {
    return (LogLevelStrings as string[]).includes(lvl);
};
