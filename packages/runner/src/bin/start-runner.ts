import { Runner } from "../runner";
const fs = require("fs");

const sequencePath: string = process.argv[2];
const fifosPath: string = process.argv[3];

if (!fs.existsSync(fifosPath)) {
    console.error("Incorrect run argument: fifo path (" + fifosPath +") does not exists. ");
    process.exit(1);
}

if (!fs.existsSync(sequencePath)) {
    console.error("Incorrect run argument: sequence path (" + sequencePath +") does not exists. ");
    process.exit(1);
}

/**
 * Runner running script. 
 * 
 * * Creates an instance of runner. 
 * * Run sequence.
 */

let runner: Runner = new Runner(sequencePath, fifosPath);

runner.init();
// // runner.executeSequence();
