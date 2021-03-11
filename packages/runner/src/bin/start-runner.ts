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
 * Start runner script. 
 * 
 * * Creates an instance of a runner. 
 * * Runs a sequence.
 * 
 * @param sequencePath - sequence file path
 * @param fifosPath - fifo files path
 */

const runner: Runner = new Runner(sequencePath, fifosPath);

runner.init();
runner.executeSequence();
