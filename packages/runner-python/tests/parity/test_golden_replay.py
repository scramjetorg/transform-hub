from __future__ import annotations

import asyncio
import base64
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest


PACKAGE_ROOT = Path(__file__).resolve().parents[2]
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"
CONTROL_EOL = b"\r\n"
MONITORING_EOL = b"\r\n"
EXPECTED_EXIT_OVERRIDES = {
    "control-kill": 137,
    "stop-handler": 0,
}


def safe_close_fd(fd: int | None) -> None:
    if fd is None:
        return
    try:
        os.close(fd)
    except OSError:
        pass


def bind_child_fds(control_read_fd: int, monitor_write_fd: int) -> dict[int, int | None]:
    saved: dict[int, int | None] = {}

    for target_fd in (4, 5):
        try:
            saved[target_fd] = os.dup(target_fd)
        except OSError:
            saved[target_fd] = None

    os.dup2(control_read_fd, 4)
    os.dup2(monitor_write_fd, 5)
    return saved


def restore_child_fds(saved: dict[int, int | None]) -> None:
    for target_fd, backup_fd in saved.items():
        if backup_fd is None:
            safe_close_fd(target_fd)
            continue

        os.dup2(backup_fd, target_fd)
        os.close(backup_fd)


def get_fixture_scenarios() -> list[str]:
    scenarios = []
    for path in sorted(FIXTURES_DIR.iterdir()):
        if path.is_dir() and (path / "recorded.json").exists():
            scenarios.append(path.name)
    return scenarios


def decode_monitor_frame(raw: bytes) -> tuple[int, Any]:
    payload = raw.rstrip(MONITORING_EOL)
    return json.loads(payload.decode("utf-8"))


def normalize_monitor_frame(raw: bytes) -> bytes:
    code, payload = decode_monitor_frame(raw)
    if code == 3000:
        payload["payload"]["system"]["processPID"] = "<pid>"
    return json.dumps([code, payload], separators=(", ", ": ")).encode("utf-8") + MONITORING_EOL


def read_recorded(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def channel_bytes(recorded: dict[str, Any], channel: str, direction: str) -> list[bytes]:
    return [
        base64.b64decode(entry["bytes_b64"])
        for entry in recorded.get("channels", {}).get(channel, [])
        if entry["direction"] == direction
    ]


def monitoring_groups(frames: list[bytes]) -> tuple[list[bytes], list[bytes]]:
    normalized = [normalize_monitor_frame(frame) for frame in frames]
    heartbeats = []
    others = []
    for frame in normalized:
        code, _payload = decode_monitor_frame(frame)
        if code == 3001:
            heartbeats.append(frame)
        else:
            others.append(frame)
    return heartbeats, others


def write_replay_log(target: Path, scenario: str, observed: dict[str, Any]) -> None:
    payload = {
        "scenario": scenario,
        "returncode": observed["returncode"],
        "stdout_b64": base64.b64encode(observed["stdout"]).decode("ascii"),
        "stderr_b64": base64.b64encode(observed["stderr"]).decode("ascii"),
        "out_b64": base64.b64encode(observed["out"]).decode("ascii"),
        "monitoring_b64": [
            base64.b64encode(frame).decode("ascii")
            for frame in observed["monitoring"]
        ],
        "control_b64": [
            base64.b64encode(frame).decode("ascii")
            for frame in observed["control"]
        ],
        "input_b64": [
            base64.b64encode(frame).decode("ascii")
            for frame in observed["input"]
        ],
    }
    target.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


class RunnerHost:
    def __init__(self, scenario: str, instance_id: str) -> None:
        self.scenario = scenario
        self.instance_id = instance_id
        self.server: asyncio.base_events.Server | None = None
        self.port: int | None = None
        self._ready = asyncio.Event()
        self._connections: dict[str, tuple[asyncio.StreamReader, asyncio.StreamWriter]] = {}
        self.out_chunks: list[bytes] = []
        self.log_chunks: list[bytes] = []
        self.monitor_frames: list[bytes] = []
        self.control_frames: list[bytes] = []
        self.in_frames: list[bytes] = []
        self._tasks: list[asyncio.Task[None]] = []
        self.control_write_fd: int | None = None

    async def start(self) -> None:
        self.server = await asyncio.start_server(self._handle_client, "127.0.0.1", 0)
        self.port = self.server.sockets[0].getsockname()[1]

    async def _handle_client(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
    ) -> None:
        ident = await reader.readexactly(len(self.instance_id) + 2)
        channel_code = ident[-1:].decode("ascii")
        self._connections[channel_code] = (reader, writer)
        if len(self._connections) == 3:
            self._ready.set()

    async def wait_until_ready(self, timeout: float = 5.0) -> None:
        await asyncio.wait_for(self._ready.wait(), timeout=timeout)
        self._tasks = [
            asyncio.create_task(self._collect_channel("6", self.out_chunks)),
            asyncio.create_task(self._collect_channel("7", self.log_chunks)),
        ]

    async def _collect_channel(self, channel_code: str, target: list[bytes]) -> None:
        reader, _writer = self._connections[channel_code]
        while True:
            chunk = await reader.read(65536)
            if not chunk:
                return
            target.append(chunk)

    async def send_control(self, frame: bytes) -> None:
        self.control_frames.append(frame)
        assert self.control_write_fd is not None
        os.write(self.control_write_fd, frame)

    async def send_in(self, payload: bytes, close_after: bool) -> None:
        self.in_frames.append(payload)
        _reader, writer = self._connections["5"]
        writer.write(payload)
        await writer.drain()
        if close_after and writer.can_write_eof():
            writer.write_eof()
            await writer.drain()

    async def wait_for_monitor_code(self, code: int, timeout: float = 5.0) -> None:
        await self._wait_for(lambda: any(decode_monitor_frame(frame)[0] == code for frame in self.monitor_frames), timeout)

    async def wait_for_monitor_event(self, event_name: str, timeout: float = 5.0) -> None:
        def predicate() -> bool:
            for frame in self.monitor_frames:
                code, payload = decode_monitor_frame(frame)
                if code == 5001 and payload.get("eventName") == event_name:
                    return True
            return False

        await self._wait_for(predicate, timeout)

    async def _wait_for(self, predicate, timeout: float) -> None:
        deadline = asyncio.get_running_loop().time() + timeout
        while asyncio.get_running_loop().time() < deadline:
            if predicate():
                return
            await asyncio.sleep(0.01)
        raise TimeoutError(f"Timed out waiting for scenario={self.scenario}")

    async def finish(self) -> None:
        await asyncio.sleep(0.05)
        for task in self._tasks:
            task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        for _reader, writer in self._connections.values():
            writer.close()
        for _reader, writer in self._connections.values():
            await writer.wait_closed()
        if self.server is not None:
            self.server.close()
            await self.server.wait_closed()


class PipeCapture:
    def __init__(self) -> None:
        control_read_fd, control_write_fd = os.pipe()
        monitor_read_fd, monitor_write_fd = os.pipe()
        self.control_read_fd: int | None = control_read_fd
        self.control_write_fd: int | None = control_write_fd
        self.monitor_read_fd: int | None = monitor_read_fd
        self.monitor_write_fd: int | None = monitor_write_fd
        self.monitor_file = None
        self.monitor_frames: list[bytes] = []
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        assert self.monitor_read_fd is not None
        self.monitor_file = os.fdopen(self.monitor_read_fd, "rb", buffering=0)
        self._task = asyncio.create_task(self._collect_monitoring())

    async def _collect_monitoring(self) -> None:
        assert self.monitor_file is not None
        while True:
            frame = await asyncio.to_thread(self.monitor_file.readline)
            if not frame:
                return
            self.monitor_frames.append(frame)

    async def finish(self) -> None:
        safe_close_fd(self.control_write_fd)
        safe_close_fd(self.monitor_write_fd)
        if self._task is not None:
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)
        if self.monitor_file is not None:
            self.monitor_file.close()


async def orchestrate_scenario(scenario: str, host: RunnerHost, recorded: dict[str, Any]) -> None:
    control_frames = channel_bytes(recorded, "CONTROL", "host-send")
    await host.wait_for_monitor_code(3000)
    await host.send_control(control_frames[0])

    if scenario == "text-input":
        await host.send_in(channel_bytes(recorded, "IN", "host-send")[0], close_after=True)
        safe_close_fd(host.control_write_fd)
        host.control_write_fd = None
    elif scenario == "binary-input":
        await host.send_in(channel_bytes(recorded, "IN", "host-send")[0], close_after=True)
        safe_close_fd(host.control_write_fd)
        host.control_write_fd = None
    elif scenario == "stop-handler":
        await host.wait_for_monitor_event("stop-handler-ready")
        await host.send_control(control_frames[1])
        safe_close_fd(host.control_write_fd)
        host.control_write_fd = None
    elif scenario == "event-emit-receive":
        await host.wait_for_monitor_event("sequence-started")
        await host.send_control(control_frames[1])
        safe_close_fd(host.control_write_fd)
        host.control_write_fd = None
    elif scenario == "control-set":
        await host.wait_for_monitor_event("set-ready")
        await host.send_control(control_frames[1])
        safe_close_fd(host.control_write_fd)
        host.control_write_fd = None
    elif scenario == "control-kill":
        await host.wait_for_monitor_event("kill-ready")
        await host.send_control(control_frames[1])
        safe_close_fd(host.control_write_fd)
        host.control_write_fd = None
    else:
        safe_close_fd(host.control_write_fd)
        host.control_write_fd = None


async def run_scenario(tmp_path: Path, scenario: str, recorded: dict[str, Any]) -> dict[str, Any]:
    fixture_dir = FIXTURES_DIR / scenario
    instance_id = f"capture-{scenario}"
    host = RunnerHost(scenario, instance_id)
    pipes = PipeCapture()
    proc = None
    saved_child_fds: dict[int, int | None] | None = None

    await host.start()
    await pipes.start()
    host.control_write_fd = pipes.control_write_fd
    host.monitor_frames = pipes.monitor_frames

    boot_path = tmp_path / f"{scenario}-boot.json"
    boot_path.write_text(
        json.dumps(
            {
                "sequencePath": str(fixture_dir / "sequence" / "main.py"),
                "instanceId": instance_id,
                "instancesServerHost": "127.0.0.1",
                "instancesServerPort": host.port,
                "sequenceInfo": {"id": scenario},
                "logLevel": "INFO",
            }
        ),
        encoding="utf-8",
    )

    env = os.environ.copy()
    pythonpath_parts = [str(PACKAGE_ROOT / "src"), str(PACKAGE_ROOT / "__pypackages__")]
    existing_pythonpath = env.get("PYTHONPATH")
    if existing_pythonpath:
        pythonpath_parts.append(existing_pythonpath)
    env["PYTHONPATH"] = os.pathsep.join(pythonpath_parts)

    assert pipes.control_read_fd is not None
    assert pipes.monitor_write_fd is not None
    control_read_fd = pipes.control_read_fd
    monitor_write_fd = pipes.monitor_write_fd

    try:
        saved_child_fds = bind_child_fds(control_read_fd, monitor_write_fd)

        proc = await asyncio.create_subprocess_exec(
            sys.executable,
            "-m",
            "runner_python",
            str(boot_path),
            cwd=str(PACKAGE_ROOT),
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            pass_fds=(4, 5),
        )
        restore_child_fds(saved_child_fds)
        saved_child_fds = None

        safe_close_fd(control_read_fd)
        pipes.control_read_fd = None
        safe_close_fd(monitor_write_fd)
        pipes.monitor_write_fd = None

        try:
            await host.wait_until_ready()
            await orchestrate_scenario(scenario, host, recorded)
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=15)
            returncode = proc.returncode
        except Exception as exc:
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=1)
                returncode = proc.returncode
            except Exception:
                proc.kill()
                stdout, stderr = await proc.communicate()
                returncode = proc.returncode
            raise AssertionError(
                f"scenario={scenario} returncode={returncode} stdout={stdout!r} stderr={stderr!r}"
            ) from exc
    finally:
        if saved_child_fds is not None:
            restore_child_fds(saved_child_fds)

        await host.finish()
        await pipes.finish()

    return {
        "returncode": returncode,
        "stdout": stdout,
        "stderr": stderr,
        "out": b"".join(host.out_chunks),
        "monitoring": list(pipes.monitor_frames),
        "control": list(host.control_frames),
        "input": list(host.in_frames),
    }


@pytest.mark.asyncio
@pytest.mark.parametrize("scenario", get_fixture_scenarios())
async def test_golden_replay(tmp_path: Path, scenario: str) -> None:
    recorded = read_recorded(FIXTURES_DIR / scenario / "recorded.json")
    observed = await run_scenario(tmp_path, scenario, recorded)
    replay_log_path = tmp_path / f"{scenario}-replay.json"
    write_replay_log(replay_log_path, scenario, observed)

    expected_exit = EXPECTED_EXIT_OVERRIDES.get(scenario, recorded["exit_code"])
    assert observed["returncode"] == expected_exit
    assert replay_log_path.exists()

    assert observed["control"] == channel_bytes(recorded, "CONTROL", "host-send")
    assert observed["input"] == channel_bytes(recorded, "IN", "host-send")
    assert observed["out"] == b"".join(channel_bytes(recorded, "OUT", "host-recv"))

    recorded_heartbeats, recorded_other_monitoring = monitoring_groups(
        channel_bytes(recorded, "MONITORING", "host-recv")
    )
    observed_heartbeats, observed_other_monitoring = monitoring_groups(observed["monitoring"])

    assert observed_other_monitoring == recorded_other_monitoring
    assert observed_heartbeats == recorded_heartbeats

    expected_stdout = b"".join(channel_bytes(recorded, "STDOUT", "host-recv"))
    if expected_stdout:
        assert observed["stdout"] == expected_stdout
    else:
        assert observed["stdout"] == b""

    if scenario == "throw-after-stdout":
        assert b"boom" in observed["stderr"]
    else:
        assert observed["stderr"] == b""
