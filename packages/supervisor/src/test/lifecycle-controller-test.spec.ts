import test from "ava";
import { CSHClientMock } from "@scramjet/supervisor/src/mocks/supervisor-component-mocks";

test("Testing testing", async t => {

    console.log("Just fighting to keep my sanity at this point");
    console.log("Testing import works: " + CSHClientMock.name);
    t.pass();

});

