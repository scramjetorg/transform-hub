from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, BinaryIO


@dataclass(slots=True)
class ControlInput:
    stream: BinaryIO
    _buffer: bytearray = field(default_factory=bytearray)

    def fileno(self) -> int:
        return self.stream.fileno()

    def readable(self) -> bool:
        return self.stream.readable()

    def close(self) -> None:
        self.stream.close()

    def readline_crlf(self) -> bytes:
        while True:
            delimiter_index = self._buffer.find(b"\r\n")
            if delimiter_index != -1:
                line = bytes(self._buffer[:delimiter_index])
                del self._buffer[: delimiter_index + 2]
                return line

            chunk = self.stream.read(4096)
            if not chunk:
                raise EOFError("control stream closed before CRLF terminator")

            self._buffer.extend(chunk)

    def __getattr__(self, name: str) -> Any:
        return getattr(self.stream, name)


@dataclass(slots=True)
class MonitoringOutput:
    stream: BinaryIO

    def fileno(self) -> int:
        return self.stream.fileno()

    def writable(self) -> bool:
        return self.stream.writable()

    def close(self) -> None:
        self.stream.close()

    def flush(self) -> None:
        self.stream.flush()

    def write_frame(self, data: bytes) -> None:
        self.stream.write(data + b"\r\n")
        self.stream.flush()

    def __getattr__(self, name: str) -> Any:
        return getattr(self.stream, name)


@dataclass(slots=True)
class FdStreams:
    stdin: BinaryIO
    stdout: BinaryIO
    stderr: BinaryIO
    control_in: ControlInput
    monitoring_out: MonitoringOutput

    def readline_crlf(self) -> bytes:
        return self.control_in.readline_crlf()

    def write_frame(self, data: bytes) -> None:
        self.monitoring_out.write_frame(data)


def open_fd_streams() -> FdStreams:
    return FdStreams(
        stdin=os.fdopen(0, "rb"),
        stdout=os.fdopen(1, "wb"),
        stderr=os.fdopen(2, "wb"),
        control_in=ControlInput(os.fdopen(4, "rb", buffering=0)),
        monitoring_out=MonitoringOutput(os.fdopen(5, "wb", buffering=0)),
    )
