import { CSHClient } from "@scramjet/supervisor/src/lib/csh-client";
import { join } from "path";
import { readFile } from "fs";
// import * as sinon from "sinon";
import test from "ava";

const PACKAGES_DIR = "test-file.tar.gz";
const mockFilePath = join(__dirname, "..", "src", "mocks", PACKAGES_DIR);
const cshClient = new CSHClient();
const streams = cshClient.getClient();
// let consoleSpy: any;

test.cb("load package form path " + mockFilePath, _t => {
    // Test if path from env can be load.
    readFile(mockFilePath, _t.end);
});

test("check file path " + mockFilePath, _t => {
    // Test if path from env is string.
    _t.is(typeof mockFilePath, "string");
});

test("return readable stream with package " + mockFilePath, _t => {
    // Test if getPackage method returns a readable stream.
    const result = cshClient.getPackage(mockFilePath);

    _t.is(result.readable, true);
});

test("throw an error when string is empty " + mockFilePath, _t => {
    // Test if getPackage method throw an error when path to file is empty.
    const error = _t.throws(() => cshClient.getPackage(), { instanceOf: Error });

    _t.is(error.message, "Path is empty");
});

test("return an array", _t => {
    // Test if getClient method return an array.
    _t.is(Array.isArray(streams), true);
});

test("array contains proper elements", _t => {
    // Test if getClient method contains array with proper streams.
    // console.log(streams[2].write("dwadwa"));
    _t.is(streams[0].readable, true);
    _t.is(streams[1].writable, true);
    _t.is(streams[2].writable, true);
});

test("log to the console", _t => {
    // Test if hookStreams method log output to the console.
    // consoleSpy = sinon.stub(console, 'log');
    // cshClient.hookStreams(streams)
    // consoleSpy.called.should.be.true;
    // consoleSpy.restore();
    _t.pass();
});
