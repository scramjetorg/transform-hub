import { Response, ResponseStream } from "@scramjet/api-client";
import { Command } from "commander";

function display(type: "json" | "pretty" = "pretty", object: any) {
    switch (type) {
    case "json":
        console.log(JSON.stringify(object));
        break;
    default:
        console.dir(object);
        break;
    }
}

export async function displayObject(_program: Command, object: any) {
    display(_program.opts().format, object);
}

export async function displayStream(_program: Command, request: Promise<ResponseStream>): Promise<void> {

    try {
        const req = await request;

        req.data?.pipe(process.stdout);
        return new Promise((res, rej) => {
            req.data?.on("finish", res);
            req.data?.on("error", rej);
        });
    } catch (e) {
        console.error(e && e.stack || e);
        process.exitCode = e.exitCode || 1;
        return Promise.reject();
    }
}

export async function displayEntity(_program: Command, request: Promise<Response>): Promise<void> {
    // todo: different displays depending on _program.opts().format
    try {
        const req = await request;

        display(_program.opts().format, req.data);
    } catch (e) {
        console.error(e && e.stack || e);
        process.exitCode = e.exitCode || 1;
    }
}
