const { createInterface } = require("node:readline");

module.exports = async function(_input, nowait) {
    /**
     * @this {import("@scramjet/types").AppContext}
     */
    const lines = createInterface({ input: process.stdin });

    this.logger.info("Working...");
    for await (const line of lines) {
        this.logger.info("line", line);
        process.stdout.write(">>> ");
        process.stdout.write(line);
    }

    this.exitTimeout = 0;
    if (!nowait) await new Promise(res => setTimeout(res, 5e3));
};
