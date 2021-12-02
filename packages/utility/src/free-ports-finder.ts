import * as net from "net";
import * as dgram from "dgram";

export class FreePortsFinder {
    static async checkTCPPort(port: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const server = net.createServer();

            server
                .on("listening", () => {
                    server.close();
                    resolve(true);
                })
                .on("error", (error: any) => {
                    if (error.code === "EADDRINUSE") {
                        resolve(false);
                    } else {
                        reject(error);
                    }
                })
                .listen(port);
        });
    }

    static async checkUDPPort(port: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const server = dgram.createSocket("udp4");

            server
                .on("listening", () => {
                    server.close();
                    resolve(true);
                })
                .on("error", (error: any) => {
                    if (error.code === "EADDRINUSE") {
                        resolve(false);
                    } else {
                        reject(error);
                    }
                })
                .bind(port);
        });
    }

    static async getPorts(portsCount: number, min: number, max: number): Promise<number[]> {
        const ports = [];

        for (let port = min; port <= max; port++) {
            if (await this.checkTCPPort(port) && await this.checkUDPPort(port)) {
                ports.push(port);

                if (ports.length === portsCount) {
                    return ports;
                }
            }
        }

        throw new Error(`The required number of ports could not be found. Found ${ports.length} of ${portsCount}.`);
    }
}
