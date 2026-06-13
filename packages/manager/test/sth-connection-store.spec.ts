import test from "ava";
import { SthConnectionStore } from "../src/lib/sth-connection-store";
import { SthConnectionStoreErrors } from "@scramjet/types";
import { ISTHController, MRestAPI } from "@scramjet/types";

/**
 * Creates a minimal mock ISTHController with required fields.
 */
function mockController(
  id: string,
  overrides: Partial<{
    accessKey: string;
    selfHosted: boolean;
    verserConnection: { connected: boolean };
    getInfo: () => MRestAPI.ConnectedSTHInfo;
    disconnect: (reason: string) => void | Promise<void>;
  }> = {}
): ISTHController {
  const accessKey = overrides.accessKey ?? "";
  const selfHosted = overrides.selfHosted ?? true;
  const verserConnection = overrides.verserConnection ?? { connected: false };

  return {
    id,
    accessKey,
    selfHosted,
    verserConnection: verserConnection as any,
    getInfo: overrides.getInfo ?? (() => ({
      id,
      info: { created: undefined, lastConnected: undefined, lastDisconnected: undefined },
      healthy: true,
      selfHosted,
      isConnectionActive: false,
    })),
    disconnect: overrides.disconnect ?? (() => {}),
    // Satisfy the remaining ISTHController interface with no-ops
    logger: {} as any,
    healthy: true,
    isConnectionActive: false,
    networkInterfaces: [],
    disconnectReason: undefined,
    info: { created: undefined, lastConnected: undefined, lastDisconnected: undefined },
    created: undefined,
    disconnected: undefined,
    init: async () => {},
    disconnectAuditStream: () => {},
    getAuditStream: async () => ({} as any),
    reconnect: async () => {},
    main: () => {},
    sendId: () => {},
    getLoadStat: () => ({} as any),
    sendEvent: async () => {},
    createUpstreamTopicRequest: async () => ({} as any),
    createDownstreamTopicRequest: async () => ({} as any),
    dispose: () => {},
    auditStream: undefined,
    logStream: undefined,
    on: () => ({} as any),
    emit: () => false,
    addListener: () => ({} as any),
    removeListener: () => ({} as any),
    once: () => ({} as any),
    off: () => ({} as any),
    removeAllListeners: () => ({} as any),
    setMaxListeners: () => ({} as any),
    getMaxListeners: () => 0,
    listeners: () => [],
    rawListeners: () => [],
    listenerCount: () => 0,
    prependListener: () => ({} as any),
    prependOnceListener: () => ({} as any),
  } as unknown as ISTHController;
}

test("SthConnectionStore: list returns empty initially", (t) => {
  const store = new SthConnectionStore();
  t.deepEqual(store.list(), []);
});

test("SthConnectionStore: add stores a controller and list returns it", (t) => {
  const store = new SthConnectionStore();
  const ctrl = mockController("sth-1");

  store.add(ctrl);

  t.is(store.list().length, 1);
  t.is(store.list()[0].id, "sth-1");
});

test("SthConnectionStore: add multiple controllers", (t) => {
  const store = new SthConnectionStore();

  store.add(mockController("a"));
  store.add(mockController("b"));
  store.add(mockController("c"));

  t.is(store.list().length, 3);
});

test("SthConnectionStore: getById returns the correct controller", (t) => {
  const store = new SthConnectionStore();
  const ctrl = mockController("sth-1");

  store.add(ctrl);

  const result = store.getById("sth-1");
  t.not(result, undefined);
  t.is(result!.id, "sth-1");
});

test("SthConnectionStore: getById returns undefined for unknown id", (t) => {
  const store = new SthConnectionStore();

  t.is(store.getById("nonexistent"), undefined);
});

test("SthConnectionStore: getByAccessKey returns matching controllers", (t) => {
  const store = new SthConnectionStore();

  store.add(mockController("a", { accessKey: "key-1" }));
  store.add(mockController("b", { accessKey: "key-1" }));
  store.add(mockController("c", { accessKey: "key-2" }));

  const key1Results = store.getByAccessKey("key-1");
  t.is(key1Results.length, 2);
  t.true(key1Results.some((c) => c.id === "a"));
  t.true(key1Results.some((c) => c.id === "b"));

  const key2Results = store.getByAccessKey("key-2");
  t.is(key2Results.length, 1);
  t.is(key2Results[0].id, "c");

  const noResults = store.getByAccessKey("no-such-key");
  t.is(noResults.length, 0);
});

test("SthConnectionStore: forEach iterates all controllers", (t) => {
  const store = new SthConnectionStore();
  const ids = ["a", "b", "c"];

  ids.forEach((id) => store.add(mockController(id)));

  const visited: string[] = [];
  store.forEach((id, _ctrl) => visited.push(id));

  t.deepEqual(visited.sort(), ids);
});

test("SthConnectionStore: map transforms controllers", (t) => {
  const store = new SthConnectionStore();
  store.add(mockController("a"));
  store.add(mockController("b"));

  const result = store.map((id, _ctrl) => id);
  t.deepEqual(result.sort(), ["a", "b"]);
});

test("SthConnectionStore: getSTHControllerInfo returns info for existing controller", (t) => {
  const store = new SthConnectionStore();
  const info: MRestAPI.ConnectedSTHInfo = {
    id: "sth-1",
    info: { created: new Date().toISOString(), lastConnected: undefined, lastDisconnected: undefined },
    healthy: true,
    selfHosted: true,
    isConnectionActive: false,
  };

  store.add(mockController("sth-1", { getInfo: () => info }));

  const result = store.getSTHControllerInfo("sth-1");
  t.not(result, undefined);
  t.is(result!.id, "sth-1");
});

test("SthConnectionStore: getSTHControllerInfo returns undefined for unknown id", (t) => {
  const store = new SthConnectionStore();
  t.is(store.getSTHControllerInfo("nonexistent"), undefined);
});

test("SthConnectionStore: getSTHControllersInfo returns all infos", (t) => {
  const store = new SthConnectionStore();

  store.add(mockController("a"));
  store.add(mockController("b"));

  const infos = store.getSTHControllersInfo();
  t.is(infos.length, 2);
  t.true(infos.some((i) => i.id === "a"));
  t.true(infos.some((i) => i.id === "b"));
});

test("SthConnectionStore: delete throws when id not provided", async (t) => {
  const store = new SthConnectionStore();

  const err = await t.throwsAsync(async () => store.delete("", false), { instanceOf: Error });
  t.is(err!.message, SthConnectionStoreErrors.ID_NOT_PROVIDED);
});

test("SthConnectionStore: delete throws when id not found", async (t) => {
  const store = new SthConnectionStore();

  const err = await t.throwsAsync(async () => store.delete("nonexistent", false), { instanceOf: Error });
  t.is(err!.message, SthConnectionStoreErrors.ID_NOT_FOUND);
});

test("SthConnectionStore: delete throws when native hub", async (t) => {
  const store = new SthConnectionStore();

  store.add(mockController("native-sth", { selfHosted: false }));

  const err = await t.throwsAsync(async () => store.delete("native-sth", false), { instanceOf: Error });
  t.is(err!.message, SthConnectionStoreErrors.NATIVE_HUB);
});

test("SthConnectionStore: delete throws when connected and not forced", async (t) => {
  const store = new SthConnectionStore();

  store.add(
    mockController("connected-sth", {
      selfHosted: true,
      verserConnection: { connected: true },
    })
  );

  const err = await t.throwsAsync(async () => store.delete("connected-sth", false), { instanceOf: Error });
  t.is(err!.message, SthConnectionStoreErrors.CONNECTED);
});

test("SthConnectionStore: delete with force disconnects and removes", async (t) => {
  const store = new SthConnectionStore();
  let disconnectCalled = false;
  let disconnectCompleted = false;

  store.add(
    mockController("force-sth", {
      selfHosted: true,
      verserConnection: { connected: true },
      disconnect: async (reason) => {
        disconnectCalled = true;
        t.is(reason, "id_drop");
        await Promise.resolve();
        disconnectCompleted = true;
      },
    })
  );

  await store.delete("force-sth", true);
  t.true(disconnectCalled);
  t.true(disconnectCompleted);
  t.is(store.getById("force-sth"), undefined);
});

test("SthConnectionStore: delete removes controller when disconnected", async (t) => {
  const store = new SthConnectionStore();

  store.add(mockController("disconnected-sth", { selfHosted: true, verserConnection: { connected: false } }));

  await store.delete("disconnected-sth", false);
  t.is(store.getById("disconnected-sth"), undefined);
});

test("SthConnectionStore: delete with force removes controller even when disconnect is already no-op", async (t) => {
  const store = new SthConnectionStore();
  let disconnectAttempts = 0;
  let disconnectCalled = false;

  const controller = mockController("force-reason-sth", {
    selfHosted: true,
    verserConnection: { connected: true },
    disconnect: (reason) => {
      disconnectAttempts++;

      if ((controller as any).disconnectReason) {
        return;
      }

        disconnectCalled = true;
        t.is(reason, "id_drop");
    },
  });

  store.add(controller);

  // Simulate a controller that already has a disconnectReason set
  // (e.g., from a previous disconnect attempt). In the real
  // STHController.disconnect(), this guard causes disconnect to be a
  // no-op. The store should still force-call disconnect and remove it.
  (controller as any).disconnectReason = "key_revoked";

  await store.delete("force-reason-sth", true);

  t.is(disconnectAttempts, 1, "disconnect should still be invoked for forced deletion");
  t.false(disconnectCalled, "mock disconnect should preserve the real disconnectReason no-op guard");
  t.is(store.getById("force-reason-sth"), undefined, "controller should be removed from store");
});
