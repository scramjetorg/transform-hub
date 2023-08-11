import { ConfigService, development } from "@scramjet/sth-config";
import { PassThrough as OriginalPassThrough } from "stream";
import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { DataStream } from "scramjet";

// eslint-disable-next-line import/no-mutable-exports
let PassThrough: typeof OriginalPassThrough;

if (development()) {
    const config = ConfigService.getGlobal()?.getConfig();
    const logger = new ObjLogger(this);
    const prettyLog = new DataStream().map(prettyPrint({ colors: config?.logColors || true }));

    logger.addOutput(prettyLog);

    prettyLog.pipe(process.stdout);

    PassThrough = class PtDebugDevelopment extends OriginalPassThrough {
        pause() {
            logger.debug("PAUSE");
            return super.pause();
        }
        resume() {
            logger.debug("RESUME");
            return super.resume();
        }
        pipe<T extends NodeJS.WritableStream>(destination: T, options: { end?: boolean; }): T {
            logger.debug("PIPE");
            return super.pipe(destination, options);
        }
    };
} else {
    PassThrough = OriginalPassThrough;
}

export { PassThrough };
