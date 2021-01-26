import {ReadableStream, TransformApp2} from "../wrapper";

export const app: TransformApp2<number, {i: number, x: number}> = async function abc(
    source: ReadableStream<number>
) {
    const ref = this;
    
    const y = async function* () {
        let i:number = +(ref.config.from);
        for await (let x of source) {
            if (i-- <= 0) return;
            yield {i, x};
        }
    };

    return y;
};

