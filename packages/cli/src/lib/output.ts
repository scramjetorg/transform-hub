import { Response } from "@scramjet/api-client";
import { Command } from "commander";

export async function displayEntitiy(_program: Command, request: Promise<Response>): Promise<void> {
    // todo: different displays depending on _program.opts().format

    try {
        const req = await request;

        console.log(req);
    } catch (e) {
        console.error(e && e.stack || e);
        process.exitCode = e.exitCode || 1;
    }
}
