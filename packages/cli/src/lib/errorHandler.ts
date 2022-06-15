/* eslint-disable no-console */

import { ClientError } from "@scramjet/client-utils";
import { profileConfig } from "./config";
import { displayError, displayMessage, displayObject } from "./output";

async function jsonize(err: ClientError) {
    if (!err.toJSON) return undefined;

    return await err.toJSON().then((body) => body).catch(() => undefined);
}

const getExitCode = (_err: ClientError | Error) => 1;

export const errorHandler = async (err: Error) => {
    process.exitCode = getExitCode(err);
    const { log:{ format, debug } } = profileConfig.getConfig();

    if (err instanceof ClientError) {
        displayObject({
            error: true,
            code: err?.code,
            stack: debug ? err?.stack : undefined,
            message: err?.message,
            reason: err?.reason?.message,
            apiStatusCode: err?.status,
            apiError: await jsonize(err),
        }, format);
    } else if (err instanceof Error) {
        displayError(err);
        if (debug) displayMessage(err.stack as string);
    } else displayMessage(err);
    process.exit();
};
