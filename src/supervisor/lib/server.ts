import { createServer, IncomingMessage, Server } from "http";

const makeServer: () => Server = () => {
    return createServer(function (message: IncomingMessage) {
        message.on('data', function (data) {
            console.log('data' + data.toString());
            message.socket.write('from server: ' + data.toString());
        });
        // message.on('connect', function (request, socket, head) {
        //     console.log('connected');
        //     // socket.write('hello world connected');
        //     // socket.end();
        // });
    })
    .on('error',(err:Error) => {
        console.error(err);
        process.exit(1); 
    })
};

export default makeServer;