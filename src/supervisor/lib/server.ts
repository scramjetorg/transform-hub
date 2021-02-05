import { createServer, IncomingMessage, Server } from "http";

const makeServer: (socket: string) => Server = () => {
    return createServer((message: IncomingMessage) => {
        message.on("data", (data) => {
            console.log("data" + data.toString());
            message.socket.write("from server: " + data.toString());
        });
    });
};

export default makeServer;