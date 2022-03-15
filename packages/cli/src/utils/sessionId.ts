import { readFileSync } from "fs";

export const sessionId = () => readFileSync("/proc/self/stat", { encoding: "utf-8" }).split(" ")[5];
