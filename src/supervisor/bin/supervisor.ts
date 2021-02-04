import server from "../lib/server";
let fs = require('fs');

const socket: string = process.argv[2];

console.log("before listen" + socket);

fs.accessSync(socket, fs.constants.W_OK | fs.constants.R_OK);
try {
    if (fs.existsSync(socket)) {
        //TODO file exists
    }
} catch (err) {
    console.error(err)
}

server()
    .listen(socket, () => {
        console.log('listening on socket', socket);
    });
