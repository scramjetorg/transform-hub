import { development } from "@scramjet/sth-config";
import { PassThrough } from "stream";

// eslint-disable-next-line import/no-mutable-exports
let PtDebug;

if (development()) {
    PtDebug = class PtDebugDevelopment extends PassThrough {
        pause() {
            return super.pause();
        }
        resume() {
            return super.resume();
        }
        pipe<T extends NodeJS.WritableStream>(destination: T, options: { end?: boolean; }): T {
            return super.pipe(destination, options);
        }
    };
} else {
    PtDebug = PassThrough;
}

export default PtDebug;
