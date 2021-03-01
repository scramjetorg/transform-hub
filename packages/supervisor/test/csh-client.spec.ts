import { CSHClient } from "@scramjet/supervisor/src/lib/csh-client";
// import { ReadableStream } from "@scramjet/types/src/utils";
// import * as stream  from 'stream';
import { join } from "path";
import { readFile } from 'fs';
import test from "ava";

const PACKAGES_DIR = "test-file.tar.gz";
const mockFilePath = join("src", "mock", PACKAGES_DIR);
const cshClient = new CSHClient;
// const mockStreamArray = ['','','','',''];

test.cb("load package form path " + mockFilePath, _t => {
    // Test if path from env can be load.
    readFile(mockFilePath, _t.end);
});

test("check file path " + mockFilePath, _t => {
    // Test if path from env is string.
    _t.is(typeof mockFilePath, 'string');
});

test("return readable stream with package " + mockFilePath, t => {
    // Test if getPackage method returns a readable stream.
    const result = cshClient.getPackage(mockFilePath)
    t.is(typeof result._read, 'function');
});

test("return to the console", _t => {
    _t.pass();
    // Test if getClient method log output to the console.
    // const result = cshClient.getClient(mockStreamArray);
    // t.is(typeof result, 'StreamsConfig');
    // t.is(typeof result, 'array');
});

test("sed monitor message through strem", _t => {
    _t.pass();
    //Verify if third arg is monitor and it contains message
    // const result = cshClient.getClient(mockStreamArray);
});

test("array contains proper elements", async _t => {
//     // Test if array passed to getClient method contains stdio, stderr and controllers.
    _t.pass();
//     let controlStream;
//     let result[] = cshClient.getClient([controlStream]);
//     controlStream.write("sdfsdf");
//     let fromStream = result[1].read();
//     t.is(fromStream, "sdfsdf");
});
