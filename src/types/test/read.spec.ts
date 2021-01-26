import {ReadableApp2} from "../wrapper";

export const app: ReadableApp2<{x: number}> = async function abc(_source, {test}: {test: number}) {
    const ref = this;

    const y = async function* () {
        let i:number = +ref.config.start + test;
        while(i-- > 0) {
            yield {x: i};
        }
    };

    return y;
};
