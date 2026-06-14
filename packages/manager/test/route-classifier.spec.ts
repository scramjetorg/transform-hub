import test from "ava";
import { classifyManagerRoute } from "../src/lib/route-classifier";

test("classifyManagerRoute follows explicit STH read routes with target metadata", t => {
    const decision = classifyManagerRoute("GET", "/api/v1/sth/sth-1/config?verbose=1");

    t.is(decision.kind, "follow");
    t.is(decision.family, "host-state-read");
    t.deepEqual(decision.target, {
        sthId: "sth-1",
        routeDomain: "sth.sth-1.scramjet.internal",
        targetPath: "/config"
    });
});

test("classifyManagerRoute treats state-changing single-owner STH routes as follow-safe", t => {
    const decision = classifyManagerRoute("POST", "/api/v1/sth/sth-1/sequence/seq-1/start");

    t.is(decision.kind, "follow");
    t.is(decision.family, "host-sequence-write");
    t.is(decision.target?.sthId, "sth-1");
    t.is(decision.target?.targetPath, "/sequence/seq-1/start");
});

test("classifyManagerRoute keeps Manager-owned route families out of follow forwarding", t => {
    t.is(classifyManagerRoute("GET", "/api/v1/sth/sth-1/info").kind, "manager-owned");
    t.is(classifyManagerRoute("DELETE", "/api/v1/sth/sth-1").kind, "manager-owned");
    t.is(classifyManagerRoute("GET", "/api/v1/s3/package.tar.gz").kind, "manager-owned");
    t.is(classifyManagerRoute("POST", "/api/v1/disconnect").kind, "manager-owned");
});

test("classifyManagerRoute classifies topic routes as Manager multiplex regardless of method", t => {
    const readDecision = classifyManagerRoute("GET", "/api/v1/topic/orders");
    const writeDecision = classifyManagerRoute("POST", "/api/v1/topic/orders");

    t.is(readDecision.kind, "manager-multiplex");
    t.is(writeDecision.kind, "manager-multiplex");
    t.is(readDecision.target?.topicName, "orders");
    t.is(writeDecision.target?.topicName, "orders");
});

test("classifyManagerRoute uses action semantics instead of HTTP method alone", t => {
    const followPost = classifyManagerRoute("POST", "/api/v1/sth/sth-1/sequence/seq-1/start");
    const managerOwnedPost = classifyManagerRoute("POST", "/api/v1/disconnect");
    const multiplexPost = classifyManagerRoute("POST", "/api/v1/topic/orders");

    t.is(followPost.kind, "follow");
    t.is(managerOwnedPost.kind, "manager-owned");
    t.is(multiplexPost.kind, "manager-multiplex");
});

test("classifyManagerRoute marks explicit duplex routes unsupported until dedicated protocols exist", t => {
    const platformDecision = classifyManagerRoute("POST", "/api/v1/sth/sth-1/platform");
    const inoutDecision = classifyManagerRoute("POST", "/api/v1/sth/sth-1/instance/inst-1/inout");

    t.is(platformDecision.kind, "unsupported-bidirectional");
    t.is(platformDecision.family, "host-platform");
    t.is(inoutDecision.kind, "unsupported-bidirectional");
    t.is(inoutDecision.family, "instance-inout");
});

test("classifyManagerRoute follows RPC and instance single-owner routes", t => {
    const rpcDecision = classifyManagerRoute("POST", "/api/v1/rpc/foo");
    const instanceDecision = classifyManagerRoute("GET", "/api/v1/sth/sth-1/instance/inst-1/health");
    const controlDecision = classifyManagerRoute("POST", "/api/v1/sth/sth-1/instance/inst-1/_stop");

    t.is(rpcDecision.kind, "follow");
    t.is(rpcDecision.family, "host-rpc");
    t.is(instanceDecision.kind, "follow");
    t.is(instanceDecision.family, "instance-read");
    t.is(instanceDecision.target?.instanceId, "inst-1");
    t.is(controlDecision.kind, "follow");
    t.is(controlDecision.family, "instance-control");
});
