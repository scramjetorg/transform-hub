import * as net from "net";
import * as dgram from "dgram";

/**
 * Provides methods to find free tcp/udp ports.
 */
export class FreePortsFinder {
    /**
     * Check if port is available for tcp.
     *
     * @param {number} port Port number.
     * @returns Promise resolving to true if port is available, false otherwise.
     */
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

    /**
     * Check if port is available for udp.
     *
     * @param {number} port Port number.
     * @returns Promise resolving to true if port is available, false otherwise.
     */
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

    /**
     * Finds desired amount of free ports in the given range. If there are not enough free ports, error is thrown.
     *
     * @param {number} portsCount How many ports to find.
     * @param {number} min Starting port number.
     * @param {number} max Ending port number.
     * @returns Promise resolving to array of free ports.
     */
    static async getPorts(portsCount: number, min: number, max: number): Promise<number[]> | never {
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
