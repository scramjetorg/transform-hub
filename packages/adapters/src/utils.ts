import * as net from "net";

export class FreePortsFinder {
    static async getPorts(ports: number): Promise<number[]> {
        return Promise.all(
            new Array(ports).fill(undefined)
                .map(
                    (): Promise<net.Server> => new Promise((resolve, reject) => {
                        const server = net.createServer();

                        server.on("listening", () => {
                            resolve(server);
                        });

                        server.on("error", () => {
                            reject();
                        });

                        server.listen(0, "127.0.0.1");
                    })
                )
        ).then(
            (servers: net.Server[]) => Promise.all(
                servers.map(
                    (server: net.Server): Promise<number> => new Promise((resolve, reject) => {
                        if (server.address()) {
                            // eslint-disable-next-line no-extra-parens
                            const port = (server?.address() as net.AddressInfo).port;

                            server.on("close", () => {
                                resolve(port);
                            });

                            server.on("error", reject);

                            server.close();
                        }
                    })
                )
            )
        );
    }
}
