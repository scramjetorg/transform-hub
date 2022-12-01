import { Duplex, DuplexOptions, Readable, Writable } from "stream";

export class DuplexStream extends Duplex {
    input: Readable;
    output: Writable;

    constructor(options: DuplexOptions, input: Readable, output: Writable) {
        super(options);
        this.input = input;
        this.output = output;

        this.input.setEncoding("utf8");
        this.input.on("data", (d) => {
            this.push(d);
        });

        this.input.on("close", () => this.destroy());
        this.output.on("close", () => this.destroy());

        this.input.resume();
    }

    _write(chunk: any, enc: any, next: Function) {
        if (this.output.writable) {
            this.output.write(chunk);
            this.resume();
        } else {
            this.output.on("drain", () => {
                this.output.write(chunk);
                this.resume();
            });
        }

        next();
    }

    _read() {
        this.input.resume();
    }
}
