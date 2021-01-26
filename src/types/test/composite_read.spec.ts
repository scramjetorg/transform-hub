import {ReadableApp} from "../wrapper";
import * as transform from "./lib/transform";


export const app: ReadableApp<{x: number}, [{test: number}], {start: number}> =
    async function abc(_source, {test}) {
        const ref = this;

        return [
            function* () {
                let i:number = ref.config.start + test;
                while(i-- > 0) {
                    yield {y: i};
                }
            }, 
            transform
        ];
    };
