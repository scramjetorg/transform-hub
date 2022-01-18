import { COLORS } from "./colors";
import { LogEntry } from "@scramjet/types";

export const prettyPrint = (obj: LogEntry) => {
    return `${COLORS.FgGreen}${new Date(obj.ts!).toISOString()}${COLORS.Reset} ${COLORS.FgYellow}${obj.level?.padEnd(5)}${COLORS.Reset} ${obj.msg} ${(obj.data || []).length ? JSON.stringify(obj.data, null, 0) : ""}\n`;
};
