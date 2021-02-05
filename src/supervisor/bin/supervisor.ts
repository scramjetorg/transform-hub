import server from "../lib/server";

const fs = require("fs");
const socket: string = process.argv[2];

if (fs.existsSync(socket)) {
    console.error("Socket file already exists. " + socket);
    process.exit(1);
}

server(socket)
    .on("error", (err: Error) => {
        console.error(err);
        //TODO check process exitCode -  
        process.exit(1);
    })
    .listen(socket, () => {
        console.log("listening on socket", socket);
    });
