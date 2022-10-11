import { Server as HttpServer } from "http";
import { Server as HttpsServer } from "https";
import { CeroRouter } from "../lib/definitions";

export type ServerConfig = {
    verbose?: boolean;
    server?: HttpsServer | HttpServer;
    sslKeyPath?: string;
    sslCertPath?: string;
    router?: CeroRouter;
};