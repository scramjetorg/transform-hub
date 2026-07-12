"use strict";

module.exports = async function (_stream, ...args) {
    if (args[0] === "SEND_KEEPALIVE") {
        this.addStopHandler(() => {
            this.keepAlive(parseInt(args[1], 10));
        });
    }

    await new Promise(resolve => setTimeout(resolve, 60000));
};
