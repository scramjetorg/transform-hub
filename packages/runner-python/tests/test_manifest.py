from __future__ import annotations

import asyncio
import json
import io
import logging
import os
from types import SimpleNamespace

import pytest

from runner_python.control_codec import ControlFrameDecoder
from runner_python.control_loop import (
    EVENT,
    KILL,
    MANIFEST_RESULT,
    SET,
    StartupControlReader,
    run_initializer_with_control,
)
from runner_python.fd_streams import ControlInput
from runner_python.handshake import READY
from runner_python.manifest import (
    MANIFEST_DECLARE,
    ManifestDeclarationClient,
    ManifestSequenceAPI,
    snapshot_declaration,
)
from runner_python.monitoring_codec import MonitoringWriter


class Writer:
    def __init__(self) -> None:
        self.frames = []

    def write_frame(self, code, payload) -> None:
        self.frames.append((code, payload))


def test_snapshot_preserves_schema_keywords_and_json_keys() -> None:
    declaration = {"input": {"schema": {"$ref": "urn:custom", "toJSON": 1, "__proto__": {"x": 1}}}}
    snapshot = snapshot_declaration(declaration)
    assert snapshot == declaration
    assert snapshot is not declaration


@pytest.mark.parametrize("invalid", [{"input": {"schema": (1,)}}, {"output": {"schema": {"x": float("nan")}}}])
def test_snapshot_rejects_non_json_values(invalid) -> None:
    with pytest.raises(ValueError):
        snapshot_declaration(invalid)


@pytest.mark.asyncio
async def test_declaration_waits_for_correlated_receipt_and_supports_repeated_calls() -> None:
    writer = Writer()
    client = ManifestDeclarationClient(writer)
    first = asyncio.create_task(client.declare({"input": {"schema": True}}))
    second = asyncio.create_task(client.declare({"output": {"description": "out"}}))
    await asyncio.sleep(0)
    request_one, request_two = (frame[1]["requestId"] for frame in writer.frames)
    receipt_two = {"instanceId": "i", "sequenceId": "s", "revision": "r2"}
    receipt_one = {"instanceId": "i", "sequenceId": "s", "revision": "r1"}
    assert client.handle_result({"requestId": request_two, "accepted": True, "receipt": receipt_two})
    assert client.handle_result({"requestId": request_one, "accepted": True, "receipt": receipt_one})
    assert await first == receipt_one
    assert await second == receipt_two
    assert all(code == MANIFEST_DECLARE for code, _ in writer.frames)


@pytest.mark.asyncio
async def test_pending_declaration_can_be_rejected_on_shutdown() -> None:
    client = ManifestDeclarationClient(Writer())
    call = asyncio.create_task(client.declare({}))
    await asyncio.sleep(0)
    client.reject_pending(EOFError("closed"))
    with pytest.raises(EOFError):
        await call


def test_topic_direction_is_preserved_as_any_string() -> None:
    topic = {"name": "events", "direction": "duplex", "schema": {"type": "object"}}
    writer = Writer()
    client = ManifestDeclarationClient(writer)
    snapshot = snapshot_declaration({"topics": [topic]})
    assert snapshot["topics"][0] == topic

    async def declare_and_capture():
        declaration = asyncio.create_task(client.declare({"topics": [topic]}))
        while not writer.frames:
            await asyncio.sleep(0)
        assert writer.frames[0][1]["declaration"]["topics"][0] == topic
        client.handle_result({
            "requestId": writer.frames[0][1]["requestId"],
            "accepted": True,
            "receipt": {"instanceId": "i", "sequenceId": "s", "revision": "r"},
        })
        await declaration

    asyncio.run(declare_and_capture())


def test_sequence_api_exposes_declare_without_an_asgi_handle() -> None:
    api = ManifestSequenceAPI(ManifestDeclarationClient(Writer()))
    assert callable(api.declare)


def test_manifest_api_facade_preserves_configured_asgi_attach_and_use() -> None:
    from runner_python.verser2_runtime import PythonSequenceApiExposure

    exposure = PythonSequenceApiExposure()
    api = ManifestSequenceAPI(ManifestDeclarationClient(Writer()), exposure)
    app = object()
    assert api.attach(app) is app
    assert api.app is app
    other_app = object()
    assert api.use(other_app) is other_app
    assert api.app is other_app


class PipeDecoder(ControlFrameDecoder):
    def __init__(self, control_input: ControlInput) -> None:
        super().__init__()
        self.control_input = control_input

    async def readline_crlf_async(self) -> bytes:
        return await self.control_input.readline_crlf_async()


def pipe_reader(writer):
    read_fd, write_fd = os.pipe()
    control_input = ControlInput(os.fdopen(read_fd, "rb", buffering=0))
    decoder = PipeDecoder(control_input)
    client = ManifestDeclarationClient(writer)
    reader = StartupControlReader(decoder, client)
    reader.start()
    return reader, client, control_input, write_fd


def write_frame(fd: int, code: int, payload) -> None:
    os.write(fd, json.dumps([code, payload], separators=(",", ":")).encode() + b"\r\n")


@pytest.mark.asyncio
async def test_initializer_receives_real_pipe_reply_before_controls_are_activated() -> None:
    writer = Writer()
    reader, client, control_input, write_fd = pipe_reader(writer)
    try:
        async def initialize():
            receipt = await client.declare({"input": {"schema": True}})
            assert receipt["revision"] == "revision-1"
            return "initialized"

        initializing = asyncio.create_task(
            run_initializer_with_control(reader, initialize, SimpleNamespace(_kill_handlers=[]))
        )
        while not writer.frames:
            await asyncio.sleep(0)
        request_id = writer.frames[0][1]["requestId"]
        write_frame(write_fd, MANIFEST_RESULT, {
            "requestId": request_id,
            "accepted": True,
            "receipt": {"instanceId": "i", "sequenceId": "s", "revision": "revision-1"},
        })
        write_frame(write_fd, SET, {"appConfig": {"late": True}})
        write_frame(write_fd, EVENT, {"eventName": "late"})
        assert await initializing == "initialized"
        assert await reader.next_frame() == (SET, {"appConfig": {"late": True}})
        assert await reader.next_frame() == (EVENT, {"eventName": "late"})
    finally:
        await reader.close()
        control_input.close()
        os.close(write_fd)


@pytest.mark.asyncio
async def test_early_kill_dispatches_handlers_once_and_eof_closes_declaration_client() -> None:
    from runner_python import __main__ as runner_main

    writer = Writer()
    reader, client, control_input, write_fd = pipe_reader(writer)
    entered = asyncio.Event()
    kill_calls: list[str] = []
    sequence_context = SimpleNamespace(_kill_handlers=[])
    monitoring_stream = io.BytesIO()
    monitoring_writer = MonitoringWriter(monitoring_stream)

    async def initialize():
        sequence_context._kill_handlers.append(lambda: kill_calls.append("killed"))
        entered.set()
        await client.declare({})

    initializing = asyncio.create_task(
        runner_main._initialize_before_ready(reader, initialize, sequence_context)
    )
    try:
        await entered.wait()
        write_frame(write_fd, KILL, {})
        initialization_succeeded = await initializing
        if initialization_succeeded:
            monitoring_writer.write_frame(READY, {"state": "ready"})
        assert initialization_succeeded is False
        assert reader.early_kill.is_set()
        assert writer.frames[0][0] == MANIFEST_DECLARE
        assert reader._pump_task is not None and not reader._pump_task.done()
        assert kill_calls == ["killed"]
        assert all(
            json.loads(frame)[0] != READY
            for frame in monitoring_stream.getvalue().splitlines()
        )
    finally:
        await reader.close()
        assert reader._pump_task is not None and reader._pump_task.done()
        control_input.close()
        os.close(write_fd)

    writer = Writer()
    reader, client, control_input, write_fd = pipe_reader(writer)
    pending = asyncio.create_task(client.declare({}))
    try:
        await asyncio.sleep(0)
        os.close(write_fd)
        with pytest.raises(EOFError):
            await pending
        assert reader._pump_task is not None and reader._pump_task.done()
        frames_before_retry = list(writer.frames)
        with pytest.raises(EOFError, match="channel is closed"):
            await client.declare({})
        assert writer.frames == frames_before_retry
    finally:
        await reader.close()
        control_input.close()


@pytest.mark.asyncio
async def test_cancelling_blocked_pipe_reader_removes_reader_and_closes_owned_fd() -> None:
    writer = Writer()
    reader, _client, control_input, write_fd = pipe_reader(writer)
    fd = control_input.fileno()
    await asyncio.sleep(0)
    await reader.close()
    control_input.close()
    with pytest.raises(OSError):
        os.fstat(fd)
    os.close(write_fd)


@pytest.mark.asyncio
async def test_verser_runtime_without_exposure_keeps_manifest_api_and_ready_path(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from runner_python import __main__ as runner_main

    writer = Writer()
    client = ManifestDeclarationClient(writer)
    runtime = SimpleNamespace(runnerRouteDomain="route")
    exposure, api = runner_main._build_sequence_api(client, runtime, None)
    context = runner_main._build_sequence_context(
        MonitoringWriter(io.BytesIO()),
        logging.getLogger("manifest-no-asgi"),
        {},
        "INFO",
        api_exposure=api,
        instance_id="instance",
    )
    assert exposure is None
    assert callable(context.api.declare)

    async def fake_start_guest(config, api_exposure):
        assert config is runtime
        assert api_exposure is None
        return None

    monkeypatch.setattr(runner_main, "start_python_sequence_guest", fake_start_guest)
    guest, ready = await runner_main._start_sequence_guest_and_ready_payload(
        runtime, None, exposure
    )
    assert guest is None
    assert ready == {"state": "ready"}

    declaration = asyncio.create_task(context.api.declare({"input": {"description": "in"}}))
    while not writer.frames:
        await asyncio.sleep(0)
    client.handle_result({
        "requestId": writer.frames[-1][1]["requestId"],
        "accepted": True,
        "receipt": {"instanceId": "instance", "sequenceId": "sequence", "revision": "r1"},
    })
    assert (await declaration)["revision"] == "r1"
