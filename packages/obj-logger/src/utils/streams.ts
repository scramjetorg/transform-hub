import { Transform, TransformCallback, TransformOptions } from "stream";

export class JSONParserStream extends Transform {
    private _prev: string = "";
    parser: (line: string) => object;

    constructor({ parser, ...opts }: TransformOptions & { parser?: (line: string) => object } = {}) {
        super({ ...opts, readableObjectMode: true });
        this.parser = parser || JSON.parse;
    }

    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        const curr = `${this._prev}${chunk.toString("utf-8")}`;
        const items = curr.split("\n");

        this._prev = items.pop() || "";
        for (const line of items)
            this._handle(line);

        callback();
    }

    _flush(callback: TransformCallback): void {
        if (this._prev)
            this._handle(this._prev);

        callback();
    }

    private _handle(chunk: string) {
        try {
            this.push(this.parser(chunk));
        } catch (e: any) {
            this.emit("error", Object.assign(new Error("Cannot parse"), { originalMessage: e?.message, chunk, cause: e?.stack }));
        }
    }
}

export class JSONStringifierStream extends Transform {
    stringifier: (obj: object) => string;

    constructor({ stringifier, encoding, ...opts }: TransformOptions & { stringifier?: (obj: object) => string } = { encoding: "utf-8" }) {
        super({ ...opts, encoding, writableObjectMode: true });
        this.stringifier = stringifier || JSON.stringify;
    }

    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        this._handle(chunk);
        callback();
    }

    private _handle(chunk: any) {
        try {
            this.push(this.stringifier(chunk));
        } catch (e: any) {
            this.emit("error", Object.assign(new Error("Cannot stringify"), { originalMessage: e?.message, chunk, cause: e?.stack }));
        }
    }
}
