"use strict";

module.exports = async function (_stream, kbytes, timeout) {
    this.logger.info("Sequence called with: ", kbytes, timeout);
    this.on("test-event", () => this.emit("test-event-response", "message from sequence"));

    let count = 0;
    while (count < Number(kbytes)) {
        const hasSpace = process.stdout.write(Buffer.alloc(1024, 0xdeadbeef));

        if (!hasSpace) {
            this.emit("test-event-response", "message from sequence");
            await new Promise(resolve => setTimeout(resolve, Number(timeout)));
        }

        count++;
    }
};
