import { ReadableApp } from "../runner";
import transform from "./lib/transform";

export const app: ReadableApp<any, [{ test: number }], { start: number }> =
    function abc(_source, { test }) {
        const start = +(this.config.start || 0) || 0;
        const sequence = [
            function* () {
                let i: number = start + test;

                while (i-- > 0) {
                    yield { y: i };
                }
            },
            function* () {
                let prev: { y: number; } | undefined = yield;

                while (prev) {
                    prev = yield { x: prev.y + 199 };
                }
            },
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
