---
id: sequences-monitoring
slug: /sequences/monitoring
title: Health, logging, events, monitoring, and stop/kill behavior
---

# Health, logging, events, monitoring, and stop/kill behavior

## Health monitoring

Every sequence instance sends periodic health (MONITORING) frames to the host. The monitoring channel (defined as `MONITORING` in the `CommunicationChannel` enum) carries JSON frames with health data.

### Default monitoring payload

```json
[3001, {
  "healthy": true,
  "load": { "cpu": 0.25, "memory": 0.4 },
  "message": "running"
}]
```

### Custom monitoring handlers

Sequences can register custom monitoring handlers to add domain-specific health data:

```typescript
this.addMonitoringHandler((currentHealth) => {
  return {
    ...currentHealth,
    custom: { itemsProcessed: this.processedCount, lastError: this.lastError },
  };
});
```

The handler receives the monitoring data assembled by the runtime and returns augmented data.

### Monitoring rate

The host can change the monitoring interval by sending a `MONITORING_RATE` frame (code 4003) on the control channel with a payload specifying the new interval in milliseconds:

```json
[4003, { "interval": 5000 }]
```

## Logging

Sequences use `this.logger`, which implements `IObjectLogger` from `@scramjet/sequence-types`. The logger writes structured JSON objects to the LOG channel.

### Log methods

```typescript
this.logger.info("processing item", { id: item.id, size: item.size });
this.logger.warn("rate approaching limit", { currentRate });
this.logger.error("failed to process", { id: item.id, error: err.message });
this.logger.debug("received chunk", { bytes: chunk.length });
```

### Log levels

Supported levels: `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`. The log level threshold is set in the boot config (`logLevel` field) and can be overridden per-instance.

### Log output

Log entries are written as NDJSON to the LOG channel. Each entry includes the timestamp, level, message, and any additional structured data. The host aggregates log streams and makes them available through the API.

## Events

Sequences can emit events to the host using `this.emit()`:

```typescript
this.emit("user-action", { type: "login", userId: "abc123" });
```

Events are sent via the control channel as `EVENT` frames. They are recorded in the instance timeline and can trigger external actions through the Manager.

### Receiving events

Sequences can subscribe to events from the host or CLI using `this.on()`:

```typescript
this.on("config-update", (data) => {
  this.logger.info("config updated", data);
  // reinitialize with new config
});
```

## Stop behavior

When the host sends a `STOP` frame (code 4001), the runtime initiates graceful shutdown:

1. All registered stop handlers are called with `(timeout, canCallKeepalive)`
2. If a stop handler calls `this.keepAlive()`, the shutdown deadline extends
3. After all stop handlers resolve (or the exit timeout elapses), `SEQUENCE_STOPPED` is sent
4. The process exits with code 138 (STOPPED)

```typescript
this.addStopHandler((timeout, canCallKeepalive) => {
  this.logger.info("graceful stop requested, flushing...");
  await this.flushPendingWork();
  // optionally: this.keepAlive(5000) to extend the deadline
});
```

Python equivalent:

```python
def on_stop(timeout, can_call_keepalive):
    context.logger.info("graceful stop requested")
    await flush_pending_work()

context.add_stop_handler(on_stop)
```

## Kill behavior

When the host sends a `KILL` frame (code 4002), the runtime:

1. Calls all registered kill handlers (synchronous cleanup)
2. Sends `SEQUENCE_STOPPED` with an error indicator
3. Exits the process with exit code 137 (`RunnerExitCode.KILLED`)

```typescript
this.addKillHandler(() => {
  // synchronous cleanup — close file handles, release resources
  this.fileHandle.close();
});
```

If a `STOP` handler does not complete before the exit timeout, the runtime escalates to kill behavior automatically.

## Heartbeat and keepalive

- The runtime sends periodic `ALIVE` frames (code 3010) to indicate the sequence is responsive
- Sequences can call `this.keepAlive(ms)` to extend the shutdown deadline during graceful stop
- If the host does not receive monitoring frames within a configurable interval, it may declare the instance unhealthy

## Monitoring channel

The monitoring channel carries framed JSON messages. Both the outer runner (`start-runner.ts`) and the child runtime read and write to this channel.

### Channel lifecycle

1. **Startup**: The child runtime sends a `PING` frame with instance metadata
2. **Running**: The host responds with `PONG`; periodic `MONITORING` frames flow from child to host
3. **Stop initiated**: Host sends `STOP`; child runs stop handlers and sends `SEQUENCE_STOPPED`
4. **Kill initiated**: Host sends `KILL`; child runs kill handlers and exits
5. **Completion**: Child sends `SEQUENCE_COMPLETED` and exits cleanly

## Monitoring in Python

Python sequences use the same protocol. The `MonitoringWriter` class in `runner-python` handles encoding, and the Python heartbeat task (`run_heartbeat`) sends periodic monitoring frames. The Python `AppContext` supports `add_monitoring_handler`, `add_stop_handler`, and `add_kill_handler` with the same semantics as the Node.js AppContext.

## Structured output vs log vs monitoring

| Stream | Channel | Format | Purpose |
|--------|---------|--------|---------|
| Output | `OUT` | NDJSON or raw | Primary sequence output data |
| Log | `LOG` | NDJSON | Structured log entries |
| Monitoring | `MONITORING` | Framed JSON | Health, lifecycle, metadata |
| Control | `CONTROL` | Framed JSON | Commands (STOP, KILL, SET) |
