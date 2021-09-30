import * as net from "net";

export class FreePortsFinder {
    static async checkPort(port: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const server = net.createServer();

            server.on("listening", () => {
                server.close();
                resolve(true);
            });

            server.on("error", (error: any) => {
                if (error.code === "EADDRINUSE") {
                    resolve(false);
                } else {
                    reject(error);
                }
            });

            server.listen(port, "127.0.0.1");
        });
    }

    static async getPorts(portsCount: number, min: number, max: number): Promise<number[]> {
        const ports = [];

        for (let port = min; port <= max; port++) {
            if (await this.checkPort(port)) {
                ports.push(port);

                if (ports.length === portsCount) {
                    return ports;
                }
            }
        }

        throw new Error(`The required number of ports could not be found. Found ${ports.length} of ${portsCount}.`);
    }
}
