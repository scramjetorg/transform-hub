import { Server } from "http";
import { CeroConfig, CeroRouter, CeroRouterConfig, SequentialCeroRouter } from "./definitions";

const _cero = require("0http");

export const sequentialRouter: (config: CeroRouterConfig) => SequentialCeroRouter = require("0http/lib/router/sequential");
export const cero = <
    T extends Server = Server,
    S extends CeroRouter = CeroRouter
>(config?: CeroConfig<T, S>) => {
    return _cero(config) as {
        router: S;
        server: T;
    };
};

