import { COLORS } from "./colors";
import { LogEntry, LogLevel } from "@scramjet/types";

const COLOR_MAP: { [ key: string]: string } = {
    TRACE: COLORS.Dim,
    DEBUG: COLORS.FgBlue,
    INFO: COLORS.FgCyan,
    WARN: COLORS.FgYellow,
    ERROR: COLORS.FgRed,
    FATAL: COLORS.FgMagenta
};

const getColor = (level: LogLevel = "INFO") => `${COLOR_MAP[level]}${level?.padEnd(5)}${COLORS.Reset}`;

export const prettyPrint = (obj: LogEntry) => {
    return `${COLORS.Dim}${new Date(obj.ts!).toISOString()}${COLORS.Reset} ${getColor(obj.level)} ${obj.msg} ${COLORS.Dim}${(obj.data || []).length ? JSON.stringify(obj.data, null, 0) : ""}${COLORS.Reset}\n`;
};
