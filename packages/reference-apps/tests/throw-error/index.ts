import { ReadableApp } from "@scramjet/types";

export = async function(_stream) {
    // eslint-disable-next-line no-console
    console.log("Throwing error is the meaning of my life");

    throw new Error("Hello from throw-error");
} as ReadableApp<any>;
