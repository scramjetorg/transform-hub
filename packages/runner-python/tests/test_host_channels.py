# pyright: reportMissingImports=false

import asyncio
import socket

import pytest

from runner_python.channel_codes import ChannelCode
from runner_python.host_channels import (
    HostChannelConnectError,
    HostChannels,
    connect_host_channels,
)


def make_boot_config(fake_host_server, **overrides):
    boot_config = {
        "instanceId": "instance-123",
        "instancesServerHost": fake_host_server.host,
        "instancesServerPort": fake_host_server.port,
    }
    boot_config.update(overrides)
    return boot_config


async def close_host_channels(host_channels: HostChannels) -> None:
    for channel_socket in (
        host_channels.input_sock,
        host_channels.output_sock,
        host_channels.log_sock,
    ):
        channel_socket.close()

    await asyncio.sleep(0)


@pytest.mark.asyncio
async def test_connect_host_channels_opens_three_sockets_and_sends_handshakes(
    fake_host_server,
):
    host_channels = await connect_host_channels(make_boot_config(fake_host_server))

    try:
        await fake_host_server.wait_for_connections(3)

        assert isinstance(host_channels, HostChannels)
        assert hasattr(host_channels, "input_sock")
        assert hasattr(host_channels, "output_sock")
        assert hasattr(host_channels, "log_sock")
        assert isinstance(host_channels.input_sock, socket.socket)
        assert isinstance(host_channels.output_sock, socket.socket)
        assert isinstance(host_channels.log_sock, socket.socket)
        assert [
            connection.channel_code for connection in fake_host_server.connections
        ] == [
            ChannelCode.IN.value,
            ChannelCode.OUT.value,
            ChannelCode.LOG.value,
        ]
        assert fake_host_server.handshakes == [
            b"instance-123\n5",
            b"instance-123\n6",
            b"instance-123\n7",
        ]
    finally:
        await close_host_channels(host_channels)


@pytest.mark.asyncio
async def test_connect_host_channels_never_opens_requests_channel(fake_host_server):
    host_channels = await connect_host_channels(make_boot_config(fake_host_server))

    try:
        await fake_host_server.wait_for_connections(3)
        await asyncio.sleep(0.05)

        assert len(fake_host_server.connections) == 3
    finally:
        await close_host_channels(host_channels)


@pytest.mark.asyncio
async def test_connect_host_channels_raises_named_error_on_connect_failure(
    unused_tcp_port,
):
    with pytest.raises(HostChannelConnectError, match="Failed to connect host channels"):
        await connect_host_channels(
            {
                "instanceId": "instance-123",
                "instancesServerHost": "127.0.0.1",
                "instancesServerPort": unused_tcp_port,
            },
            timeout=0.1,
        )
