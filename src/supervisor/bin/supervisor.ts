import server from "../lib/server";
let fs = require('fs');

const socket: string = process.argv[2];

if (fs.existsSync(socket)) {
    console.error("Socket file already exists. "+socket);
    process.exit(1);
}

server()
    .listen(socket, () => {
        console.log('listening on socket', socket);
    });
