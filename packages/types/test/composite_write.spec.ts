import { Gen } from "../src";
// import { WriteSequence, WritableApp } from "../src/";
// import transform from "./lib/transform";

export const gen: Gen<{ x:number }, { y:number }> = function* () {
    let prev: { x: number; } | undefined = yield;

    while (prev) {
        prev = yield { y: prev.x + 199 };
    }
};
/*
export const app: WritableApp<{x: number}> =
    function abc(_source) {
        const sequence: WriteSequence<{x: number}> = [
            gen,
            function* () {
                let prev: { y: number; } | undefined = yield;

                while (prev) {
                    prev = yield { y: prev.y + 199 };
                }
            },
            function* () {
                let prev: { y: number; } | undefined = yield;

                while (prev) {
                    prev = yield { y: prev.y + 199 };
                }
            },
            transform,
            function* () {
                let prev: { z: number; } | undefined = yield;

                while (prev) {
                    prev = yield { x: prev.z + 199 };
                }
            }
        ];

        return sequence;
    };
*/
