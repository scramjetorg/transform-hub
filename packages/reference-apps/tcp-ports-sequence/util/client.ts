import { Logger } from "@scramjet/types";

const testServerConnection = (portNumber: number, message: string, logger: Logger) => {

    const net = require("net");
    const client = new net.Socket();

    client.connect({
        port: portNumber
    });

    client.on("connect", function() {
        logger.info("Client: connection established, port: " + client.localPort);
        client.write(message);
        client.end();
    });

};

export default testServerConnection;

