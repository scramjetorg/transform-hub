import test from "ava";
import { isAlreadyGoneContainerError } from "../src/docker-removal";

test("Passing test", (t) => {
    t.pass();
});

test("Docker container cleanup accepts only already-gone 304/404 responses", async t => {
    t.true(isAlreadyGoneContainerError({ statusCode: 304 }));
    t.true(isAlreadyGoneContainerError({ statusCode: 404 }));
    t.false(isAlreadyGoneContainerError({ statusCode: 403 }));
    t.false(isAlreadyGoneContainerError({ statusCode: 500 }));
});

test("Docker container cleanup propagates genuine failures", async t => {
    for (const error of [403, 500, undefined]) {
        const failure = new Error(error === undefined ? "network" : `Docker ${error}`) as Error & { statusCode?: number };
        failure.statusCode = error;
        t.false(isAlreadyGoneContainerError(failure));
    }
});
