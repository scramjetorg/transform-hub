from __future__ import annotations

# pyright: reportMissingImports=false

import asyncio
from dataclasses import dataclass, field
from typing import AsyncIterator

import pytest
import pytest_asyncio

pytest_plugins = ("pytest_asyncio",)


@dataclass
class RecordedHandshake:
    handshake: bytes
    channel_code: str


@dataclass
class FakeHostServer:
    host: str
    port: int
    connections: list[RecordedHandshake] = field(default_factory=list)
    _stop_event: asyncio.Event = field(default_factory=asyncio.Event, repr=False)

    @property
    def handshakes(self) -> list[bytes]:
        return [connection.handshake for connection in self.connections]

    async def wait_for_connections(self, count: int, timeout: float = 1.0) -> None:
        async def wait_for_count() -> None:
            while len(self.connections) < count:
                await asyncio.sleep(0.01)

        await asyncio.wait_for(wait_for_count(), timeout=timeout)


@pytest_asyncio.fixture
async def fake_host_server() -> AsyncIterator[FakeHostServer]:
    fake_host = FakeHostServer(host="127.0.0.1", port=0)

    async def handle_client(
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
    ) -> None:
        buffer = bytearray()

        try:
            while True:
                chunk = await reader.read(64)

                if not chunk:
                    break

                buffer.extend(chunk)

                if len(buffer) >= 37:
                    handshake = bytes(buffer)
                    message = handshake[:37]
                    fake_host.connections.append(
                        RecordedHandshake(
                            handshake=message,
                            channel_code=message[-1:].decode("ascii"),
                        )
                    )
                    break

            await fake_host._stop_event.wait()
        finally:
            writer.close()
            await writer.wait_closed()

    server = await asyncio.start_server(handle_client, host=fake_host.host, port=0)
    fake_host.port = server.sockets[0].getsockname()[1]

    try:
        yield fake_host
    finally:
        fake_host._stop_event.set()
        server.close()
        await server.wait_closed()
