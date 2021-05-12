import { PassThrough, Readable, Writable } from "stream";

export class DelayedStream {
    private _stream?: PassThrough;

    getStream() {
        if (typeof this._stream !== "undefined") {
            throw new Error("Double initialization, getStream() method can be called only once.");
        }

        this._stream = new PassThrough();
        return this._stream;
    }

    run(inputStream: Readable | Writable) {
        if (typeof this._stream !== "undefined") {
            if (inputStream instanceof Readable) {
                inputStream.pipe(this._stream);
            } else {
                this._stream.pipe(inputStream);
            }

            return;
        }

        throw new Error("Delayed stream not initialized.");
    }
}
