import { createServer, IncomingMessage, Server } from "http";

/**
 * Creates an instance of a new http server. 
 * The server listens on a socket specified by unix path passed as an argument. 
 *
 * @example makeServer("/tmp/unix-socket.sock");
 * @param {string} socket The unix socket path which will be used for communication  
 * 
 * @returns {Server} New http server instance.
 */

const makeServer: (socketName: string) => Server = () => {
    return createServer((message: IncomingMessage) => {
        message.on("data", (data) => {
            console.log("data" + data.toString());
            message.socket.write("from server: " + data.toString());
        });
    });
};

export default makeServer;