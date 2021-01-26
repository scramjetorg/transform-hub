import {TransformApp} from "../wrapper";

export const app: TransformApp<number, {i: number, x: number}, [], {abc: number, from: number}> = 
    async function abc(source) {
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

