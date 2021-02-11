import server from "../lib/server";
const fs = require("fs");
const socketName: string = process.argv[2];

/**
 * Supervisor running script. 
 * Creates an instance of a new http server. 
 * The server provides read/write communication through named unix socket passed as a command-line argument.  
 * 
 * @returns
 * Script prints to stdout socket name.
 * If socket file exists or an error occured, exit code is returned.
 */

if (fs.existsSync(socketName)) {
    console.error("Socket file already exists. " + socketName);
    process.exit(1);
}

server(socketName)
    .on("error", (err: Error) => {
        console.error(err);
        //TODO check process exitCode -  
        process.exit(1);
    })
    .listen(socketName, () => {
        console.log("listening on socket", socketName);
    });
