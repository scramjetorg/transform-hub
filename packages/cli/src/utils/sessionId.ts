import { readFileSync } from "fs";
import * as os from "os";

export const sessionId = () => {
    if (os.platform() !== "linux") return "";

    return readFileSync("/proc/self/stat", { encoding: "utf-8" }).split(" ")[5];
};
