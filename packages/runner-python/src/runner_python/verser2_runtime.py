"""Verser2 runtime helpers for runner-python.

The public ``verser2_guest_python`` package owns transport behavior. This module
only translates Transform Hub boot-config fields into that package's Python API
and provides small, fakeable wrappers for sequence-facing hub requests and ASGI
Guest exposure.
"""

from __future__ import annotations

import inspect
import os
import tempfile
from collections.abc import Callable
from typing import Any

from runner_python.boot_config import Verser2RuntimeConfig


def _wrap_close_with_cleanup(handle: Any, cleanup: Callable[[], None]) -> Any:
    close = getattr(handle, "close", None)

    if callable(close):

        async def wrapped_close(*args: Any, **kwargs: Any) -> Any:
            try:
                result = close(*args, **kwargs)
                if inspect.isawaitable(result):
                    return await result
                return result
            finally:
                cleanup()

        setattr(handle, "close", wrapped_close)
    else:
        try:
            setattr(handle, "close", cleanup)
        except (AttributeError, TypeError):
            cleanup()

    return handle


def _tls_kwargs(config: Verser2RuntimeConfig) -> tuple[dict[str, Any], Callable[[], None], bool]:
    tls = config.tls or {}
    kwargs: dict[str, Any] = {}
    cleanup_paths: list[str] = []

    def cleanup() -> None:
        while cleanup_paths:
            path = cleanup_paths.pop()
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass

    ca = tls.get("ca")
    if isinstance(ca, str) and ca.strip():
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as ca_file:
            ca_file.write(ca)
            ca_file.flush()
            cleanup_paths.append(ca_file.name)
            kwargs["tls_ca_file"] = ca_file.name

    mapping = {
        "caFile": "tls_ca_file",
        "certFile": "tls_cert_file",
        "keyFile": "tls_key_file",
        "pfxFile": "tls_pfx_file",
    }

    for source, target in mapping.items():
        value = tls.get(source)
        if value and target not in kwargs:
            kwargs[target] = value

    passphrase = tls.get("passphrase")
    if passphrase:
        if "tls_key_file" in kwargs:
            kwargs["tls_key_password"] = passphrase
        if "tls_pfx_file" in kwargs:
            kwargs["tls_pfx_password"] = passphrase

    return kwargs, cleanup, bool(cleanup_paths)


class PythonHubClient:
    """Small sequence-facing STH API client backed by a verser2 Broker."""

    def __init__(self, broker: Any, target_domain: str | None) -> None:
        self._broker = broker
        self._target_domain = target_domain or "scramjet-host"

    async def close(self) -> None:
        close = getattr(self._broker, "close", None)
        if callable(close):
            result = close()
            if inspect.isawaitable(result):
                await result

    @property
    def api_base(self) -> str:
        return f"http://{self._target_domain}/api/v1"

    def _url(self, path: str) -> str:
        normalized = path if path.startswith("/") else f"/{path}"
        return f"{self.api_base}{normalized}"

    async def request(
        self,
        method: str,
        path: str,
        *,
        headers: dict[str, str] | None = None,
        body: bytes | None = None,
    ) -> Any:
        return await self._broker.request(
            method=method,
            url=self._url(path),
            headers=headers,
            body=body,
        )

    async def get(self, path: str, *, headers: dict[str, str] | None = None) -> Any:
        return await self.request("GET", path, headers=headers)

    async def post(
        self,
        path: str,
        *,
        headers: dict[str, str] | None = None,
        body: bytes | None = None,
    ) -> Any:
        return await self.request("POST", path, headers=headers, body=body)


class PythonSequenceApiExposure:
    """Sequence-facing ASGI exposure handle backed by a verser2 Guest."""

    def __init__(self) -> None:
        self._app: Any | None = None
        self._guest: Any | None = None

    @property
    def app(self) -> Any | None:
        return self._app

    @property
    def guest(self) -> Any | None:
        return self._guest

    def attach(self, app: Any) -> Any:
        self._app = app
        attach = getattr(self._guest, "attach", None)
        if callable(attach):
            attach(app)
        return app

    def use(self, app: Any) -> Any:
        return self.attach(app)

    def bind_guest(self, guest: Any) -> Any:
        self._guest = guest
        if self._app is not None:
            attach = getattr(guest, "attach", None)
            if callable(attach):
                attach(self._app)
        return guest


async def create_python_hub_client(
    config: Verser2RuntimeConfig | None,
    *,
    broker_factory: Callable[..., Any] | None = None,
) -> PythonHubClient | None:
    """Create and connect a Broker-backed hub client when verser2 is configured."""

    if config is None:
        return None

    if broker_factory is None:
        from verser2_guest_python import create_verser_broker as default_broker_factory  # type: ignore[import-not-found]
        factory = default_broker_factory
    else:
        factory = broker_factory

    tls_kwargs, cleanup_tls, has_tls_cleanup = _tls_kwargs(config)
    try:
        broker = factory(
            host_url=config.hostUrl,
            broker_id=config.hubBrokerId,
            **tls_kwargs,
        )
        if has_tls_cleanup:
            _wrap_close_with_cleanup(broker, cleanup_tls)
        await broker.connect()
    except Exception:
        cleanup_tls()
        raise
    return PythonHubClient(broker, config.hubTargetDomain)


def create_python_sequence_guest(
    config: Verser2RuntimeConfig,
    app: Any | None,
    *,
    guest_factory: Callable[..., Any] | None = None,
) -> Any:
    """Create a Python ASGI Guest with explicit route domains from boot config."""

    if guest_factory is None:
        from verser2_guest_python import create_verser_guest as default_guest_factory  # type: ignore[import-not-found]
        factory = default_guest_factory
    else:
        factory = guest_factory

    tls_kwargs, cleanup_tls, has_tls_cleanup = _tls_kwargs(config)
    try:
        guest = factory(
            host_url=config.hostUrl,
            guest_id=config.runnerGuestId,
            app=app,
            routed_domains=[config.runnerRouteDomain],
            min_waiting_streams=config.minWaitingStreams or 1,
            **tls_kwargs,
        )
        if has_tls_cleanup:
            return _wrap_close_with_cleanup(guest, cleanup_tls)
        return guest
    except Exception:
        cleanup_tls()
        raise


async def start_python_sequence_guest(
    config: Verser2RuntimeConfig | None,
    exposure: PythonSequenceApiExposure | None,
    *,
    guest_factory: Callable[..., Any] | None = None,
) -> Any | None:
    """Create, attach, and connect a sequence ASGI Guest when exposure is enabled."""

    if config is None or exposure is None:
        return None

    guest = create_python_sequence_guest(config, exposure.app, guest_factory=guest_factory)
    exposure.bind_guest(guest)
    try:
        await guest.connect()
    except Exception:
        close = getattr(guest, "close", None)
        if callable(close):
            result = close()
            if inspect.isawaitable(result):
                await result
        raise
    return guest
