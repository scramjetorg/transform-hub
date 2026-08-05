"use strict";

const { createServer } = require("node:net");
const test = require("ava").default;

test("server leak is reported by the supported runner", (t) => {
	createServer().listen(0);
	t.pass();
});
