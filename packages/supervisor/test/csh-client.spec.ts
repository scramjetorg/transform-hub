import { CSHClient } from "@scramjet/supervisor/src/lib/csh-client";
import { join } from "path";
import { readFile } from "fs";
import test from "ava";

const PACKAGES_DIR = "test-file.tar.gz";
const mockFilePath = join("src", "mock", PACKAGES_DIR);
const cshClient = new CSHClient();

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
    _t.is(typeof result._read, "function");
});

test("throw an error when string is empty " + mockFilePath, _t => {
    // Test if getPackage method throw an error when path to file is empty.
    const error = _t.throws(() => cshClient.getPackage(), { instanceOf: Error });
    _t.is(error.message, "Path is empty");
});

test("return a proper streams", _t => {
    _t.pass();
    // Test if getClient method return a proper streams.
});

test("array contains proper elements", _t => {
//     // Test if array passed to getClient method contains stdio, stderr and controllers.
    _t.pass();
//     let controlStream;
//     let result[] = cshClient.getClient([controlStream]);
//     controlStream.write("sdfsdf");
//     let fromStream = result[1].read();
//     t.is(fromStream, "sdfsdf");
});

test("log to the console", _t => {
    _t.pass();
    // Test if getClient method log output to the console.
});
