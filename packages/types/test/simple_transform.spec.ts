import { TransformApp } from "..";

export const app: TransformApp<number, {i: number, x: number}, [], {abc: number, from: number}> =
    async function abc(source) {
        const frm = this.config.from || 0;
        const y = async function* () {
            let i:number = +frm;

            for await (let x of source) {
                if (i-- <= 0) return;
                yield { i, x };
            }
        };

        return y;
    };

