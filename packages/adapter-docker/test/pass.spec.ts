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

import { isAlreadyGoneVolumeError } from "../src/docker-removal";

test("Docker volume remove accepts only already-gone 404 responses via predicate", async t => {
    t.true(isAlreadyGoneVolumeError({ statusCode: 404 }));
    t.false(isAlreadyGoneVolumeError({ statusCode: 304 }));
    t.false(isAlreadyGoneVolumeError({ statusCode: 403 }));
    t.false(isAlreadyGoneVolumeError({ statusCode: 500 }));
});

test("Docker volume remove propagates 304, 403, 500, and network errors as genuine failures", async t => {
    for (const error of [304, 403, 500, undefined]) {
        const failure = new Error(error === undefined ? "network" : `Docker ${error}`) as Error & { statusCode?: number };
        failure.statusCode = error;
        t.false(isAlreadyGoneVolumeError(failure), `expected ${error ?? "network"} to propagate`);
    }
});
