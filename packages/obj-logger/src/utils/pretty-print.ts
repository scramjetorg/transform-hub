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

const colorLevel = (level: LogLevel = "INFO") => `${COLOR_MAP[level]}${level?.padEnd(5)}${COLORS.Reset}`;
const colorDate = (ts?: number) => ts ? `${COLORS.Dim}${new Date(ts).toISOString()}${COLORS.Reset}` : "";
const colorSource = (source?: string) => `${COLORS.FgMagenta}${source}${COLORS.Reset}`;
const colorData = (data: any) => `${COLORS.Dim}${(data || []).length ? JSON.stringify(data, null, 0) : ""}${COLORS.Reset}`;

export const prettyPrint = (opts: { colors?: boolean }) => opts.colors
    ? (obj: LogEntry) => {
        return `${colorDate(obj.ts)} ${colorLevel(obj.level)} ${colorSource(obj.from)} ${obj.msg} ${colorData(obj.data)}\n`;
    } : (obj: LogEntry) => {
        return `${obj.ts} ${obj.level} ${obj.from} ${obj.msg} ${(obj.data || []).length ? JSON.stringify(obj.data, null, 0) : ""}\n`;
    };

