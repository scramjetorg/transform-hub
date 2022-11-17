/* eslint-disable no-console */

import { ClientError } from "@scramjet/client-utils";
import { displayFormat } from "../types";
import { profileManager } from "./config";
import { displayError, displayObject } from "./output";

async function jsonize(err: ClientError) {
    if (!err.toJSON) return undefined;

    return await err.toJSON().then((body) => body).catch(() => undefined);
}

const getExitCode = (_err: ClientError | Error) => 1;

const getLogParams = () => {
    let debug: boolean = false;
    let format: displayFormat = "pretty";

    try {
        const { log: { format: profileFormat, debug: profileDebug } } = profileManager.getProfileConfig().get();

        if (profileFormat) format = profileFormat;
        if (profileDebug) debug = profileDebug;
    } catch (error: any) {
        displayError(error, debug);
    }
    return { format, debug };
};

export const errorHandler = async (err: Error) => {
    process.exitCode = getExitCode(err);

    const { format, debug } = getLogParams();

    if (err instanceof ClientError) {
        if (debug)
            displayObject({
                error: true,
                code: err?.code,
                stack: err?.stack,
                message: err?.message,
                reason: err?.reason?.message,
                apiStatusCode: err?.status,
                apiError: await jsonize(err),
            }, format);
        else displayError(err.message);
    } else
        displayError(err, debug);

    process.exit(process.exitCode);
};
