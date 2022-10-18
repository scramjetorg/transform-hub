import { Port } from "@scramjet/types";

export const isPort = (port: number | string): port is Port => {
    if (typeof port === "string") {
        port = parseInt(port, 10);
        if (isNaN(port)) return false;
    }
    return Number.isInteger(port) && port >= 0 && port <= 65535;
};
