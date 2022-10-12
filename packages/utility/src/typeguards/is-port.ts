import { Port } from "@scramjet/types";

export const isPort = (port: number): port is Port => {
    return Number.isInteger(port) && port >= 0 && port <= 65535;
};
