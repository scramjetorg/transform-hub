from __future__ import annotations

# pyright: reportMissingImports=false

import io
import os

import pytest

from runner_python.monitoring_codec import (
    MonitoringWriter,
    encode_monitoring_frame,
)


PING = 3000
MONITORING = 3001
PANG = 3012


class CountingStream(io.BytesIO):
    """BytesIO that records flush calls and the buffer length at each flush."""

    def __init__(self) -> None:
        super().__init__()
        self.flush_calls = 0
        self.flushed_lengths: list[int] = []

    def flush(self) -> None:  # type: ignore[override]
        self.flush_calls += 1
        self.flushed_lengths.append(self.tell())
        super().flush()


class FailingStream:
    def __init__(self, error: BaseException, fail_on: str = "write") -> None:
        self.error = error
        self.fail_on = fail_on
        self.calls = 0

    def write(self, _data: bytes) -> None:
        self.calls += 1
        if self.fail_on == "write":
            raise self.error

    def flush(self) -> None:
        self.calls += 1
        if self.fail_on == "flush":
            raise self.error


def test_encode_single_frame_format():
    assert encode_monitoring_frame(PING, {"id": "x"}) == b'[3000,{"id":"x"}]\r\n'


def test_encode_preserves_non_ascii_unicode_as_utf8():
    frame = encode_monitoring_frame(MONITORING, {"name": "zażółć"})
    assert frame == '[3001,{"name":"zażółć"}]\r\n'.encode("utf-8")


def test_encode_uses_no_whitespace_between_tokens():
    frame = encode_monitoring_frame(PANG, {"a": 1, "b": 2})
    assert b", " not in frame
    assert b": " not in frame
    assert frame == b'[3012,{"a":1,"b":2}]\r\n'


def test_writer_writes_encoded_bytes_and_flushes():
    stream = CountingStream()
    writer = MonitoringWriter(stream)

    writer.write_frame(PING, {"id": "x"})

    assert stream.getvalue() == b'[3000,{"id":"x"}]\r\n'
    assert stream.flush_calls == 1


def test_writer_flushes_after_each_write_no_aggregation():
    stream = CountingStream()
    writer = MonitoringWriter(stream)

    writer.write_frame(PING, {"id": "a"})
    writer.write_frame(PING, {"id": "b"})
    writer.write_frame(PING, {"id": "c"})

    assert stream.flush_calls == 3
    # Each flush observed an incrementing buffer length (no aggregation/delay).
    assert stream.flushed_lengths == sorted(stream.flushed_lengths)
    assert len(set(stream.flushed_lengths)) == 3


@pytest.mark.parametrize("error", [BrokenPipeError(), ConnectionResetError()])
@pytest.mark.parametrize("fail_on", ["write", "flush"])
def test_writer_preserves_closed_carrier_errors(error, fail_on):
    stream = FailingStream(error, fail_on)
    writer = MonitoringWriter(stream)

    with pytest.raises(type(error)):
        writer.write_frame(MONITORING, {"healthy": True})
    with pytest.raises(type(error)):
        writer.write_frame(MONITORING, {"healthy": True})

    # Codec writes remain strict; shutdown callers own the narrow suppression.
    assert stream.calls == (2 if fail_on == "write" else 4)


def test_writer_does_not_mask_unrelated_errors():
    stream = FailingStream(ValueError("bad monitoring payload"))
    writer = MonitoringWriter(stream)

    with pytest.raises(ValueError, match="bad monitoring payload"):
        writer.write_frame(MONITORING, {})


def test_writer_preserves_order_of_rapid_sequential_writes():
    stream = CountingStream()
    writer = MonitoringWriter(stream)

    for i in range(50):
        writer.write_frame(MONITORING, {"i": i})

    expected = b"".join(
        b'[3001,{"i":' + str(i).encode("ascii") + b"}]\r\n" for i in range(50)
    )
    assert stream.getvalue() == expected


def test_writer_flushes_immediately_readable_on_pipe():
    read_fd, write_fd = os.pipe()
    try:
        write_stream = os.fdopen(write_fd, "wb", buffering=0)
        writer = MonitoringWriter(write_stream)
        writer.write_frame(PING, {"id": "x"})

        data = os.read(read_fd, 1024)
        assert data == b'[3000,{"id":"x"}]\r\n'
    finally:
        try:
            write_stream.close()
        except Exception:
            pass
        os.close(read_fd)


@pytest.mark.parametrize(
    "code,payload,expected",
    [
        (PING, {"id": "x"}, b'[3000,{"id":"x"}]\r\n'),
        (MONITORING, {"healthy": True}, b'[3001,{"healthy":true}]\r\n'),
        (
            PANG,
            {"provides": "x", "requires": "y"},
            b'[3012,{"provides":"x","requires":"y"}]\r\n',
        ),
    ],
)
def test_byte_for_byte_parity_with_node_serializer(code, payload, expected):
    assert encode_monitoring_frame(code, payload) == expected
