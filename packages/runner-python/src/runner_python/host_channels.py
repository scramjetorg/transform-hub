from __future__ import annotations

import asyncio
import socket
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from runner_python.channel_codes import ChannelCode


class HostChannelConnectError(Exception):
    pass


@dataclass
class HostChannels:
    input_sock: socket.socket
    output_sock: socket.socket
    log_sock: socket.socket


def _get_boot_config_value(boot_config: object, field_name: str) -> object | None:
    if isinstance(boot_config, Mapping):
        return boot_config.get(field_name)

    return getattr(boot_config, field_name, None)


def _require_string(boot_config: object, field_name: str) -> str:
    value = _get_boot_config_value(boot_config, field_name)

    if not isinstance(value, str) or not value:
        raise HostChannelConnectError(
            f"boot config field '{field_name}' must be a non-empty string"
        )

    return value


def _require_port(boot_config: object, field_name: str) -> int:
    value = _get_boot_config_value(boot_config, field_name)

    if not isinstance(value, int) or value <= 0:
        raise HostChannelConnectError(
            f"boot config field '{field_name}' must be a positive integer"
        )

    return value


async def _resolve_addresses(host: str, port: int, timeout: float) -> list[Any]:
    loop = asyncio.get_running_loop()

    try:
        return await asyncio.wait_for(
            loop.getaddrinfo(host, port, type=socket.SOCK_STREAM),
            timeout=timeout,
        )
    except (asyncio.TimeoutError, OSError) as exc:
        raise HostChannelConnectError(f"Failed to connect host channels: {exc}") from exc


async def _connect_one(
    host: str,
    port: int,
    instance_id: str,
    code: ChannelCode,
    timeout: float,
    addr_infos: list[Any],
) -> socket.socket:
    loop = asyncio.get_running_loop()
    handshake = f"{instance_id}{code.value}".encode("ascii")
    last_error: Exception | None = None

    for family, socktype, proto, _, sockaddr in addr_infos:
        channel_socket = socket.socket(family=family, type=socktype, proto=proto)
        channel_socket.setblocking(False)

        try:
            await asyncio.wait_for(
                loop.sock_connect(channel_socket, sockaddr),
                timeout=timeout,
            )
            await asyncio.wait_for(
                loop.sock_sendall(channel_socket, handshake),
                timeout=timeout,
            )
            return channel_socket
        except (asyncio.TimeoutError, OSError) as exc:
            channel_socket.close()
            last_error = exc

    if last_error is not None:
        raise HostChannelConnectError(
            f"Failed to connect host channels: {last_error}"
        ) from last_error

    raise HostChannelConnectError(
        f"Failed to connect host channels: no address information for {host}:{port}"
    )


async def connect_host_channels(
    boot_config: object,
    timeout: float = 5.0,
) -> HostChannels:
    host = _require_string(boot_config, "instancesServerHost")
    port = _require_port(boot_config, "instancesServerPort")
    instance_id = _require_string(boot_config, "instanceId")
    addr_infos = await _resolve_addresses(host, port, timeout)
    opened_sockets: list[socket.socket] = []

    try:
        input_sock, output_sock, log_sock = await asyncio.gather(
            _connect_one(
                host=host,
                port=port,
                instance_id=instance_id,
                code=ChannelCode.IN,
                timeout=timeout,
                addr_infos=addr_infos,
            ),
            _connect_one(
                host=host,
                port=port,
                instance_id=instance_id,
                code=ChannelCode.OUT,
                timeout=timeout,
                addr_infos=addr_infos,
            ),
            _connect_one(
                host=host,
                port=port,
                instance_id=instance_id,
                code=ChannelCode.LOG,
                timeout=timeout,
                addr_infos=addr_infos,
            ),
        )
        opened_sockets.extend([input_sock, output_sock, log_sock])
    except HostChannelConnectError:
        for channel_socket in opened_sockets:
            channel_socket.close()
        raise

    return HostChannels(
        input_sock=input_sock,
        output_sock=output_sock,
        log_sock=log_sock,
    )
