import argparse
import asyncio
import base64
import contextlib
import importlib.util
import json
import logging
import os
import re
import shutil
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
LEGACY_RUNNER_DIR = ROOT / "packages" / "python-runner"
LEGACY_PYPACKAGES_DIR = LEGACY_RUNNER_DIR / "__pypackages__"
FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures"
CONTROL_EOL = b"\r\n"
MONITORING_EOL = b"\r\n"
LOG_EOL = b"\n"
STABLE_VARIABLE_BYTES = ["timestamps", "pids", "sequence_paths"]
RAW_CHANNELS = ("OUT", "STDOUT", "STDERR", "HOST")
CHANNEL_ORDER = (
    "CONTROL",
    "IN",
    "STDOUT",
    "STDERR",
    "OUT",
    "MONITORING",
    "LOG",
    "HOST",
)

_MAGIC_SPEC = importlib.util.spec_from_file_location(
    "legacy_hardcoded_magic_values",
    LEGACY_RUNNER_DIR / "hardcoded_magic_values.py",
)
if _MAGIC_SPEC is None or _MAGIC_SPEC.loader is None:
    raise RuntimeError("Failed to load legacy hardcoded_magic_values.py")
_MAGIC_MODULE = importlib.util.module_from_spec(_MAGIC_SPEC)
_MAGIC_SPEC.loader.exec_module(_MAGIC_MODULE)
CC = _MAGIC_MODULE.CommunicationChannels
MSG = _MAGIC_MODULE.RunnerMessageCodes


def join_lines(*parts: str) -> str:
    return "\n".join(parts) + "\n"


def make_text_input_sequence() -> str:
    return join_lines(
        'requires = {"requires": "text-input", "contentType": "text/plain"}',
        "",
        "",
        "def split_lines(part, chunk):",
        '    return (part + chunk).split("\\n")',
        "",
        "",
        "def run(context, input_stream):",
        '    return input_stream.sequence(split_lines, "").map(lambda line: f"line:{line}|")',
    )


def make_binary_input_sequence() -> str:
    return join_lines(
        'requires = {"requires": "binary-input", "contentType": "application/octet-stream"}',
        'provides = {"provides": "binary-output", "contentType": "application/octet-stream"}',
        "",
        "",
        "def run(context, input_stream):",
        '    return input_stream.map(lambda chunk: b"BIN:" + chunk + b":END")',
    )


def make_ndjson_sequence() -> str:
    return join_lines(
        "import asyncio",
        "",
        'provides = {"provides": "events", "contentType": "application/x-ndjson"}',
        "",
        "",
        "async def run(context, input_stream):",
        '    yield {"step": 1, "value": "alpha"}',
        "    await asyncio.sleep(0.01)",
        '    yield {"step": 2, "value": "beta"}',
    )


def make_health_override_sequence() -> str:
    return join_lines(
        "import asyncio",
        "from scramjet.streams import Stream",
        "",
        "",
        "async def run(context, input_stream):",
        '    context.set_health_check(lambda: {"healthy": False, "reason": "fixture"})',
        "    await asyncio.sleep(1.2)",
        '    return Stream.read_from(["health-override-done"])',
    )


def make_topic_rename_sequence() -> str:
    return join_lines(
        "from scramjet.streams import Stream",
        "",
        'requires = {"requires": "topic-in-renamed", "contentType": "text/plain"}',
        'provides = {"provides": "topic-out-renamed", "contentType": "text/plain"}',
        "",
        "",
        "def run(context, input_stream):",
        '    return Stream.read_from(["topic-rename-ok"])',
    )


def make_async_generator_sequence() -> str:
    return join_lines(
        "import asyncio",
        "",
        "",
        "async def run(context, input_stream):",
        '    yield "chunk-1\\n"',
        "    await asyncio.sleep(0.05)",
        '    yield "chunk-2\\n"',
        "    await asyncio.sleep(0.05)",
        '    yield "chunk-3\\n"',
    )


def make_stop_handler_sequence() -> str:
    return join_lines(
        "import asyncio",
        "",
        "",
        "async def run(context, input_stream):",
        "    stopped = asyncio.Event()",
        "",
        "    async def on_stop(timeout, can_call_keepalive):",
        '        context.emit("stop-handler-ran", {"timeout": timeout, "canCallKeepalive": can_call_keepalive})',
        "        stopped.set()",
        "",
        "    context.set_stop_handler(on_stop)",
        '    context.emit("stop-handler-ready", {"registered": True})',
        "    await stopped.wait()",
    )


def make_event_emit_receive_sequence() -> str:
    return join_lines(
        "import asyncio",
        "from scramjet.streams import Stream",
        "",
        "",
        "async def run(context, input_stream):",
        "    received = asyncio.Event()",
        '    state = {"message": None}',
        "",
        "    def on_echo(message):",
        '        state["message"] = message',
        '        context.emit("event-received", {"message": message})',
        "        received.set()",
        "",
        '    context.on("echo", on_echo)',
        '    context.emit("sequence-started", {"status": "ready"})',
        "    await received.wait()",
        '    return Stream.read_from([f"received:{state[\'message\'][\'text\']}"])',
    )


def make_control_set_sequence() -> str:
    return join_lines(
        "import asyncio",
        "import logging",
        "from scramjet.streams import Stream",
        "",
        "",
        "async def run(context, input_stream):",
        '    context.emit("set-ready", {"level": context.logger.getEffectiveLevel()})',
        "    for _ in range(10):",
        "        if context.logger.isEnabledFor(logging.DEBUG):",
        '            return Stream.read_from(["debug-enabled"])',
        "        await asyncio.sleep(0.05)",
        '    return Stream.read_from(["debug-disabled"])',
    )


def make_control_kill_sequence() -> str:
    return join_lines(
        "import asyncio",
        "",
        "",
        "async def run(context, input_stream):",
        '    context.emit("kill-ready", {"status": "waiting"})',
        "    await asyncio.Event().wait()",
    )


def make_heartbeat_cadence_sequence() -> str:
    return join_lines(
        "import asyncio",
        "from scramjet.streams import Stream",
        "",
        "",
        "async def run(context, input_stream):",
        "    await asyncio.sleep(2.25)",
        '    return Stream.read_from(["heartbeat-done"])',
    )


SCENARIOS = {
    "happy-path": {
        "sequence": join_lines(
            "import asyncio",
            "",
            "",
            "async def run(context, input_stream):",
            '    yield "Hello, "',
            "    await asyncio.sleep(0.01)",
            '    yield "World!"',
        ),
        "summary": "Happy path async generator emits Hello, World! and exits cleanly.\nAssertions: OUT is Hello, World!; MONITORING includes PING, blank PANG, and at least one heartbeat; legacy runner does not emit SEQUENCE_STOPPED on normal completion.\n",
        "timeout": 6.0,
    },
    "throw-after-stdout": {
        "sequence": join_lines(
            "def run(context, input_stream):",
            '    print("stdout-before-boom")',
            '    raise Exception("boom")',
        ),
        "summary": "Synchronous exception after stdout shows crash ordering for stdio vs monitoring.\nAssertions: STDOUT contains stdout-before-boom before process exit; STDERR contains boom traceback; legacy runner exits 1 without SEQUENCE_STOPPED for this crash path.\n",
        "timeout": 6.0,
    },
    "text-input": {
        "sequence": make_text_input_sequence(),
        "summary": "text/plain input is decoded by the runner and split by the sequence into line-wise output.\nAssertions: host sends raw IN bytes alpha/beta/gamma; OUT contains line:alpha|line:beta|line:gamma|; MONITORING includes extra requires PANG for text-input.\n",
        "timeout": 6.0,
    },
    "binary-input": {
        "sequence": make_binary_input_sequence(),
        "summary": "application/octet-stream input stays binary and is forwarded without text line splitting.\nAssertions: IN contains a payload with embedded newline and non-UTF8 bytes; OUT wraps the exact binary payload with BIN:/:END; MONITORING includes requires/provides PANG frames for binary topics.\n",
        "timeout": 6.0,
    },
    "ndjson-output": {
        "sequence": make_ndjson_sequence(),
        "summary": "Dictionary output uses application/x-ndjson serialization on the legacy OUT channel.\nAssertions: OUT is newline-delimited JSON with two objects; MONITORING includes provides=events PANG after the blank handshake PANG.\n",
        "timeout": 6.0,
    },
    "health-override": {
        "sequence": make_health_override_sequence(),
        "summary": "Custom health callback changes heartbeat payloads after sequence startup.\nAssertions: later MONITORING heartbeat payloads contain healthy=false and reason=fixture; OUT ends with health-override-done.\n",
        "timeout": 8.0,
    },
    "topic-rename": {
        "sequence": make_topic_rename_sequence(),
        "summary": "Provides/requires metadata is surfaced through extra PANG frames with renamed topic identifiers.\nAssertions: MONITORING includes provides=topic-out-renamed and requires=topic-in-renamed PANG payloads; OUT contains topic-rename-ok.\n",
        "timeout": 6.0,
    },
    "async-generator": {
        "sequence": make_async_generator_sequence(),
        "summary": "Async generator output preserves ordered chunk bytes across multiple yields.\nAssertions: OUT concatenates chunk-1, chunk-2, and chunk-3 lines in order; MONITORING still shows normal PING/PANG/heartbeat flow.\n",
        "timeout": 6.0,
    },
    "stop-handler": {
        "sequence": make_stop_handler_sequence(),
        "summary": "STOP control awaits the registered stop handler before the legacy runner emits SEQUENCE_STOPPED.\nAssertions: CONTROL records a STOP frame after stop-handler-ready; MONITORING shows stop-handler-ran EVENT before SEQUENCE_STOPPED; exit code is 1 because legacy stop exits via sys.exit(1).\n",
        "timeout": 8.0,
    },
    "event-emit-receive": {
        "sequence": make_event_emit_receive_sequence(),
        "summary": "Sequence emits an event to the host and reacts to an EVENT control frame from the host.\nAssertions: MONITORING contains sequence-started and event-received EVENT frames; CONTROL records an echo EVENT send; OUT contains received:from-host.\n",
        "timeout": 8.0,
    },
    "control-set": {
        "sequence": make_control_set_sequence(),
        "summary": "SET control is recorded, but the legacy runner never awaits handle_set so behavior stays unchanged.\nAssertions: CONTROL records a SET logLevel=DEBUG frame; OUT remains debug-disabled; this fixture captures the preserved legacy SET bug.\n",
        "timeout": 8.0,
    },
    "control-kill": {
        "sequence": make_control_kill_sequence(),
        "summary": "KILL control terminates the legacy runner immediately without graceful stop messaging.\nAssertions: CONTROL records a KILL frame after kill-ready; process exits 1; legacy runner emits no SEQUENCE_STOPPED for immediate kill.\n",
        "timeout": 8.0,
    },
    "heartbeat-cadence": {
        "sequence": make_heartbeat_cadence_sequence(),
        "summary": "Long-running sequence shows the legacy heartbeat cadence at roughly one-second intervals.\nAssertions: MONITORING includes multiple heartbeat frames near 1s spacing by relative timestamps; OUT ends with heartbeat-done.\n",
        "timeout": 10.0,
    },
}

ALLOWED_CHILD_STDERR = {
    "throw-after-stdout": ("Exception: boom",),
    "stop-handler": ("Task exception was never retrieved", "SystemExit: 1"),
    "control-set": ("RuntimeWarning: coroutine 'Runner.handle_set' was never awaited",),
    "control-kill": ("Task exception was never retrieved", "SystemExit: 1"),
}


def prepare_pyee_shim(temp_root: Path) -> Path:
    shim_root = temp_root / "shim"
    src = LEGACY_PYPACKAGES_DIR / "pyee"
    dst = shim_root / "pyee"
    shutil.copytree(src, dst)
    for path in dst.glob("*.py"):
        text = path.read_text()
        text = re.sub(r'TypeVar\(name="([^"]+)"\s*,', r'TypeVar("\\1",', text)
        path.write_text(text)
    return shim_root


def bootstrap_code(shim_root: Path, log_path: Path) -> str:
    return (
        "import asyncio\n"
        "import logging\n"
        "import sys\n"
        "_WRITERS = []\n"
        "_orig_open_connection = asyncio.open_connection\n"
        "async def _keep_writers(*args, **kwargs):\n"
        "    reader, writer = await _orig_open_connection(*args, **kwargs)\n"
        "    _WRITERS.append(writer)\n"
        "    return reader, writer\n"
        "asyncio.open_connection = _keep_writers\n"
        f"sys.path[:0] = {[str(shim_root), str(LEGACY_PYPACKAGES_DIR), str(LEGACY_RUNNER_DIR)]}\n"
        "import logging_setup\n"
        "_orig_logging_setup_init = logging_setup.LoggingSetup.__init__\n"
        "def _logging_setup_init(self, target, min_loglevel=logging.DEBUG):\n"
        "    return _orig_logging_setup_init(self, target, min_loglevel=logging.INFO)\n"
        "logging_setup.LoggingSetup.__init__ = _logging_setup_init\n"
        f"sys.argv = ['runner.py', {json.dumps(str(log_path))}]\n"
        "import runner\n"
    )


def channel_name_from_value(channel_value: str) -> str:
    for channel in CC:
        if channel.value == channel_value:
            return channel.name
    raise ValueError(f"Unknown channel value: {channel_value}")


def now_ms(loop: asyncio.AbstractEventLoop, started_at: float) -> int:
    return round((loop.time() - started_at) * 1000)


def encode_entry(raw: bytes, ts_ms: int, direction: str) -> dict:
    return {
        "direction": direction,
        "bytes_b64": base64.b64encode(raw).decode("ascii"),
        "ts_ms_relative": ts_ms,
    }


def json_bytes(data: object, suffix: bytes) -> bytes:
    return json.dumps(data, separators=(", ", ": ")).encode("utf-8") + suffix


def decode_monitor_frame(raw: bytes):
    payload = raw.rstrip(MONITORING_EOL)
    return json.loads(payload.decode("utf-8"))


def decode_log_frame(raw: bytes) -> dict:
    return json.loads(raw.rstrip(LOG_EOL).decode("utf-8"))


def normalize_sequence_paths(text: str, scenario_dir: Path) -> str:
    scenario_prefix = str(scenario_dir.resolve()) + os.sep
    normalized = text.replace(scenario_prefix, "")
    repo_prefix = str(ROOT.resolve()) + os.sep
    return normalized.replace(repo_prefix, "")


def sanitize_text_bytes(raw: bytes, scenario_dir: Path) -> bytes:
    text = raw.decode("utf-8", "replace")
    return normalize_sequence_paths(text, scenario_dir).encode("utf-8")


async def read_pipe(pipe: asyncio.StreamReader | None) -> str:
    if pipe is None:
        return ""
    return (await pipe.read()).decode("utf-8", "replace")


class HostCapture:
    def __init__(self, scenario: str, instance_id: str, scenario_dir: Path) -> None:
        self.scenario = scenario
        self.instance_id = instance_id
        self.scenario_dir = scenario_dir
        self.loop = asyncio.get_running_loop()
        self.started_at = self.loop.time()
        self.server = None
        self.port = None
        self._ready = asyncio.Event()
        self._connections = {}
        self._records = {name: [] for name in CHANNEL_ORDER}
        self._collector_tasks = []
        self.monitor_frames = []

    async def start(self) -> None:
        self.server = await asyncio.start_server(self._handle_client, "127.0.0.1", 0)
        self.port = self.server.sockets[0].getsockname()[1]

    async def wait_until_ready(self, timeout: float = 5.0) -> None:
        await asyncio.wait_for(self._ready.wait(), timeout=timeout)
        self._start_collectors()

    async def _handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        ident = await reader.readexactly(len(self.instance_id) + 1)
        channel = channel_name_from_value(ident[-1:].decode("utf-8"))
        self._connections[channel] = (reader, writer)
        if len(self._connections) == len(list(CC)):
            self._ready.set()

    def _start_collectors(self) -> None:
        if self._collector_tasks:
            return
        self._collector_tasks.extend([
            asyncio.create_task(self._collect_framed("MONITORING", MONITORING_EOL, self._capture_monitor_frame)),
            asyncio.create_task(self._collect_framed("LOG", LOG_EOL, self._sanitize_log_frame)),
        ])
        for channel in RAW_CHANNELS:
            self._collector_tasks.append(asyncio.create_task(self._collect_raw(channel)))

    async def _collect_framed(self, channel: str, delimiter: bytes, transform) -> None:
        reader, _writer = self._connections[channel]
        try:
            while True:
                raw = await reader.readuntil(delimiter)
                transformed = transform(raw)
                self._records[channel].append(encode_entry(transformed, now_ms(self.loop, self.started_at), "host-recv"))
        except (asyncio.IncompleteReadError, asyncio.LimitOverrunError):
            return

    async def _collect_raw(self, channel: str) -> None:
        reader, _writer = self._connections[channel]
        try:
            while True:
                raw = await reader.read(65536)
                if not raw:
                    return
                if channel == "STDERR":
                    raw = sanitize_text_bytes(raw, self.scenario_dir)
                self._records[channel].append(encode_entry(raw, now_ms(self.loop, self.started_at), "host-recv"))
        except ConnectionResetError:
            return

    def _capture_monitor_frame(self, raw: bytes) -> bytes:
        code, data = decode_monitor_frame(raw)
        self.monitor_frames.append((code, data, raw))
        return raw

    def _sanitize_log_frame(self, raw: bytes) -> bytes:
        payload = decode_log_frame(raw)
        if "msg" in payload and isinstance(payload["msg"], str):
            payload["msg"] = normalize_sequence_paths(payload["msg"], self.scenario_dir)
        return json.dumps(payload, separators=(", ", ": ")).encode("utf-8") + LOG_EOL

    async def send_control(self, code: int, data: object) -> None:
        raw = json_bytes([code, data], CONTROL_EOL)
        self._records["CONTROL"].append(encode_entry(raw, now_ms(self.loop, self.started_at), "host-send"))
        _reader, writer = self._connections["CONTROL"]
        writer.write(raw)
        await writer.drain()

    async def send_in(self, payload: bytes, *, close_after: bool) -> None:
        self._records["IN"].append(encode_entry(payload, now_ms(self.loop, self.started_at), "host-send"))
        _reader, writer = self._connections["IN"]
        writer.write(payload)
        await writer.drain()
        if close_after and writer.can_write_eof():
            writer.write_eof()
            await writer.drain()

    async def wait_for_monitor_code(self, code: int, *, count: int = 1, timeout: float = 5.0):
        async def predicate():
            return len([frame for frame in self.monitor_frames if frame[0] == code]) >= count

        await self._wait_for(predicate, timeout)

    async def wait_for_monitor_event(self, event_name: str, *, timeout: float = 5.0):
        async def predicate():
            for code, data, _raw in self.monitor_frames:
                if code == MSG.EVENT.value and data.get("eventName") == event_name:
                    return True
            return False

        await self._wait_for(predicate, timeout)

    async def _wait_for(self, predicate, timeout: float) -> None:
        deadline = self.loop.time() + timeout
        while self.loop.time() < deadline:
            if await predicate():
                return
            await asyncio.sleep(0.01)
        raise TimeoutError(f"Timed out waiting for scenario={self.scenario}")

    async def finish(self) -> None:
        await asyncio.sleep(0.05)
        for task in self._collector_tasks:
            task.cancel()
        if self._collector_tasks:
            with contextlib.suppress(asyncio.CancelledError):
                await asyncio.gather(*self._collector_tasks, return_exceptions=True)
        for _reader, writer in self._connections.values():
            writer.close()
        for _reader, writer in self._connections.values():
            with contextlib.suppress(Exception):
                await writer.wait_closed()
        self._coalesce_raw_channels()
        if self.server is not None:
            self.server.close()
            with contextlib.suppress(Exception):
                await self.server.wait_closed()
        await asyncio.sleep(0)

    def _coalesce_raw_channels(self) -> None:
        for channel in RAW_CHANNELS:
            recv_entries = [entry for entry in self._records[channel] if entry["direction"] == "host-recv"]
            if len(recv_entries) <= 1:
                continue
            first_ts = recv_entries[0]["ts_ms_relative"]
            combined = b"".join(base64.b64decode(entry["bytes_b64"]) for entry in recv_entries)
            self._records[channel] = [encode_entry(combined, first_ts, "host-recv")]

    def to_channels(self) -> dict:
        return {channel: self._records[channel] for channel in CHANNEL_ORDER if self._records[channel]}


def normalize_record(record: dict) -> str:
    normalized = {
        "scenario": record["scenario"],
        "exit_code": record["exit_code"],
        "stable_byte_mask": record["stable_byte_mask"],
        "channels": {},
    }
    for channel, entries in record["channels"].items():
        normalized_entries = []
        for entry in entries:
            raw = base64.b64decode(entry["bytes_b64"])
            if channel == "MONITORING" and entry["direction"] == "host-recv":
                code, data = decode_monitor_frame(raw)
                if code == MSG.PING.value:
                    payload = data.get("payload", {})
                    system = payload.get("system", {})
                    if "processPID" in system:
                        system["processPID"] = "<pid>"
                raw = json.dumps([code, data], separators=(", ", ": ")).encode("utf-8") + MONITORING_EOL
            elif channel == "LOG" and entry["direction"] == "host-recv":
                payload = decode_log_frame(raw)
                payload["ts"] = 0
                if "msg" in payload and isinstance(payload["msg"], str):
                    payload["msg"] = re.sub(r"/[^']*/sequence/main.py", "sequence/main.py", payload["msg"])
                raw = json.dumps(payload, separators=(", ", ": ")).encode("utf-8") + LOG_EOL
            normalized_entries.append({
                "direction": entry["direction"],
                "bytes_b64": base64.b64encode(raw).decode("ascii"),
                "ts_ms_relative": 0,
            })
        normalized["channels"][channel] = normalized_entries
    return json.dumps(normalized, indent=2, sort_keys=True)


async def default_handshake(host: HostCapture) -> None:
    await host.wait_for_monitor_code(MSG.PING.value)
    await host.send_control(MSG.PONG.value, {"appConfig": {}, "args": [], "logLevel": "INFO"})
    await host.wait_for_monitor_code(MSG.PANG.value)


async def orchestrate(name: str, host: HostCapture) -> None:
    await default_handshake(host)
    if name == "text-input":
        await host.send_in(b"alpha\nbeta\ngamma", close_after=True)
    elif name == "binary-input":
        await host.send_in(b"\x00BIN\nPAYLOAD\xff", close_after=True)
    elif name == "stop-handler":
        await host.wait_for_monitor_event("stop-handler-ready")
        await host.send_control(MSG.STOP.value, {"timeout": 500, "canCallKeepalive": False})
    elif name == "event-emit-receive":
        await host.wait_for_monitor_event("sequence-started")
        await host.send_control(MSG.EVENT.value, {"eventName": "echo", "message": {"text": "from-host"}})
    elif name == "control-set":
        await host.wait_for_monitor_event("set-ready")
        await host.send_control(MSG.SET.value, {"logLevel": "DEBUG"})
    elif name == "control-kill":
        await host.wait_for_monitor_event("kill-ready")
        await host.send_control(MSG.KILL.value, {})


async def capture_scenario(name: str) -> dict:
    config = SCENARIOS[name]
    scenario_dir = FIXTURE_ROOT / name
    temp_root = Path(tempfile.mkdtemp(prefix=f"capture-{name}-"))
    shim_root = prepare_pyee_shim(temp_root)
    instance_id = f"capture-{name}"
    host = HostCapture(name, instance_id, scenario_dir)
    await host.start()

    log_path = temp_root / "runner.log"
    env = os.environ.copy()
    env.update({
        "SEQUENCE_PATH": "sequence/main.py",
        "INSTANCES_SERVER_PORT": str(host.port),
        "INSTANCES_SERVER_HOST": "127.0.0.1",
        "INSTANCE_ID": instance_id,
        "RUNNER_CONNECT_INFO": json.dumps({}),
        "SEQUENCE_INFO": json.dumps({"id": name}),
        "PYTHONPATH": os.pathsep.join([str(shim_root), str(LEGACY_PYPACKAGES_DIR), str(LEGACY_RUNNER_DIR)]),
    })
    proc = await asyncio.create_subprocess_exec(
        sys.executable,
        "-u",
        "-c",
        bootstrap_code(shim_root, log_path),
        cwd=str(scenario_dir),
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        await host.wait_until_ready()
        await orchestrate(name, host)
        exit_code = await asyncio.wait_for(proc.wait(), timeout=config["timeout"])
    except Exception:
        if proc.returncode is None:
            proc.kill()
            await proc.wait()
        stderr = await read_pipe(proc.stderr)
        raise RuntimeError(f"Scenario {name} failed. stderr={stderr}")
    finally:
        await host.finish()
        shutil.rmtree(temp_root, ignore_errors=True)

    stderr = await read_pipe(proc.stderr)
    stdout = await read_pipe(proc.stdout)
    if not child_stdio_is_expected(name, stdout, stderr):
        raise RuntimeError(f"Scenario {name} used child stdio unexpectedly. stdout={stdout!r} stderr={stderr!r}")
    return {
        "scenario": name,
        "exit_code": exit_code,
        "stable_byte_mask": {
            "variable_bytes": STABLE_VARIABLE_BYTES,
            "stable_output": True,
            "stable_monitoring_codes": True,
        },
        "channels": host.to_channels(),
    }


def write_record(name: str, record: dict) -> None:
    target = FIXTURE_ROOT / name / "recorded.json"
    target.write_text(json.dumps(record, indent=2) + "\n")


async def verify_stable(name: str) -> None:
    first = await capture_scenario(name)
    second = await capture_scenario(name)
    if normalize_record(first) != normalize_record(second):
        raise RuntimeError(f"Stable-byte verification failed for {name}")


def child_stdio_is_expected(name: str, stdout: str, stderr: str) -> bool:
    if stdout:
        return False
    allowed_tokens = ALLOWED_CHILD_STDERR.get(name)
    if not stderr:
        return True
    if allowed_tokens is None:
        return False
    return all(token in stderr for token in allowed_tokens)


async def async_main(args) -> None:
    scenario_names = args.scenarios or sorted(SCENARIOS)
    for name in scenario_names:
        if name not in SCENARIOS:
            raise SystemExit(f"Unknown scenario: {name}")
        if args.verify_stable:
            await verify_stable(name)
        record = await capture_scenario(name)
        if not args.no_write:
            write_record(name, record)


def main() -> None:
    parser = argparse.ArgumentParser(description="Capture legacy python-runner parity fixtures.")
    parser.add_argument("scenarios", nargs="*", help="Scenario names to capture. Defaults to all.")
    parser.add_argument("--verify-stable", action="store_true", help="Capture each scenario twice and compare normalized stable bytes.")
    parser.add_argument("--no-write", action="store_true", help="Do not write recorded.json files.")
    args = parser.parse_args()
    asyncio.run(async_main(args))


if __name__ == "__main__":
    main()
