import test from "ava";
import { HostOne } from "../src/host-one";

test("Placeholder for test. Tests coming after the class gets OK", t => {
    let hostOne = new HostOne("sequencePath", "configPath");

    t.not(hostOne, null);
});
