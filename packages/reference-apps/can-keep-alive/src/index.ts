import { InertApp } from "@scramjet/types";

const mod = async function(_stream, ...args) {
    if (args[0] === "SEND_KEEPALIVE") {
        this.addStopHandler(() => {
            this.keepAlive(parseInt(args[1], 10));
        });
    }

    await new Promise(res => setTimeout(res, 60000));
} as InertApp;

export default mod;
