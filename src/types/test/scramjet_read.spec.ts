import {ReadableApp} from "../wrapper";

export const app: ReadableApp<{x: number}, [{test: number}]> =
    async function abc(_source, {test}) {
        const ref = this;

        const y = async function*() {
            let i:number = +ref.config.start + test;
            while(i-- > 0) {
                yield {x: i};
            }
        };

        return y;
    };
