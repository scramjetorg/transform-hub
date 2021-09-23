/* eslint-disable no-console */
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

export async function displayStream(
    _program: Command,
    request: Promise<ResponseStream>,
    output = process.stdout
): Promise<void> {
    try {
        const req = await request;

        req.data?.on("end", () => console.log("CLI: REQ END!"));
        output.on("end", () => console.log("CLI OUTPUT STREAM END!"));

        req.data?.pipe(output);
        return new Promise((res, rej) => req.data?.on("finish", res).on("error", rej));
    } catch (e: any) {
        console.error(e && e.stack || e);
        process.exitCode = e.exitCode || 1;
        return Promise.reject();
    }
}

export async function displayEntity(_program: Command, request: Promise<Response|void>): Promise<void> {
    // todo: different displays depending on _program.opts().format
    const req = await request;

    if (!req) return;
    display(_program.opts().format, req.data);
}
