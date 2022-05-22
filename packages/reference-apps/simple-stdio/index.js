const rl = require("node:readline");
const { PassThrough } = require("node:stream");

module.exports = async () => {
    const lines = new PassThrough();

    rl.createInterface(process.stdin, lines);
    for await (const line of lines) {
        process.stdout.write(">>> ");
        process.stdout.write(line);
    }

    await new Promise(res => setTimeout(res, 5e3));
};
