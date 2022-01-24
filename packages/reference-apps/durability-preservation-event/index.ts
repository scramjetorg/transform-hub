import https from "https";

import { AppContext } from "@scramjet/types";
import { IncomingMessage } from "http";

const downloadFile = (url: string): Promise<number | undefined> => {
    return new Promise((resolve) => {
        https.get(url, (response: IncomingMessage) => {
            resolve(response.statusCode);
        });
    });
};

/**
 * @param this - this
 * @param _inputStream input stream
 * @param file url to download
 * @param interval time interval
 * @returns { Promise<void> } Promise
 *
 */
export = async function(this: AppContext<any, any>, _inputStream: any, file: string, interval: number) {
    return new Promise(resolve => {
        this.addStopHandler(resolve);

        setInterval(async () => {
            const statusCode = await downloadFile(file);

            const status = {
                statusCode,
                date: new Date().toISOString()
            };

            this.emit("status", status);
            this.logger.trace("Status", status);
        }, interval * 1000);
    });
}

