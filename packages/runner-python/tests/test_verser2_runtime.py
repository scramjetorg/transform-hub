from __future__ import annotations

import pytest

from runner_python.boot_config import Verser2RuntimeConfig
from runner_python.verser2_runtime import (
    PythonHubClient,
    PythonSequenceApiExposure,
    create_python_hub_client,
    create_python_sequence_guest,
    start_python_sequence_guest,
)


class FakeBroker:
    def __init__(self) -> None:
        self.connected = False
        self.closed = False
        self.requests = []

    async def connect(self) -> None:
        self.connected = True

    async def request(self, **kwargs):
        self.requests.append(kwargs)
        return {"status": 200}

    async def close(self) -> None:
        self.closed = True


class FakeGuest:
    def __init__(self) -> None:
        self.connected = False
        self.closed = False
        self.attached = []

    def attach(self, app):
        self.attached.append(app)
        return self

    async def connect(self) -> None:
        self.connected = True

    async def close(self) -> None:
        self.closed = True


def config(**overrides) -> Verser2RuntimeConfig:
    values = {
        "hostUrl": "https://verser2.example",
        "runnerGuestId": "runner.inst.guest",
        "runnerRouteDomain": "runner.inst.scramjet.internal",
        "hubBrokerId": "runner.inst.hub.broker",
        "hubTargetDomain": "sth.local.scramjet.internal",
        "tls": {"caFile": "/ca.pem", "certFile": "/client.crt", "keyFile": "/client.key", "passphrase": "secret"},
        "leaseAcquireTimeoutMs": 1234,
        "minWaitingStreams": 3,
        **overrides,
    }

    return Verser2RuntimeConfig(**values)


@pytest.mark.asyncio
async def test_create_python_hub_client_connects_broker_with_tls_options() -> None:
    calls = []
    broker = FakeBroker()

    def broker_factory(**kwargs):
        calls.append(kwargs)
        return broker

    hub = await create_python_hub_client(config(), broker_factory=broker_factory)

    assert hub is not None
    assert broker.connected is True
    assert calls == [{
        "host_url": "https://verser2.example",
        "broker_id": "runner.inst.hub.broker",
        "tls_ca_file": "/ca.pem",
        "tls_cert_file": "/client.crt",
        "tls_key_file": "/client.key",
        "tls_key_password": "secret",
    }]


@pytest.mark.asyncio
async def test_create_python_hub_client_returns_none_without_verser2_config() -> None:
    assert await create_python_hub_client(None, broker_factory=lambda **_: FakeBroker()) is None


@pytest.mark.asyncio
async def test_python_hub_client_routes_requests_to_sth_api_domain() -> None:
    broker = FakeBroker()
    client = PythonHubClient(broker, "sth.local.scramjet.internal")

    response = await client.post("/sequence", headers={"x-test": "1"}, body=b"payload")

    assert response == {"status": 200}
    assert broker.requests == [{
        "method": "POST",
        "url": "http://sth.local.scramjet.internal/api/v1/sequence",
        "headers": {"x-test": "1"},
        "body": b"payload",
    }]


@pytest.mark.asyncio
async def test_python_hub_client_closes_underlying_broker() -> None:
    broker = FakeBroker()
    client = PythonHubClient(broker, "sth.local.scramjet.internal")

    await client.close()

    assert broker.closed is True


def test_create_python_sequence_guest_uses_explicit_routed_domain_and_waiting_streams() -> None:
    calls = []
    app = object()

    def guest_factory(**kwargs):
        calls.append(kwargs)
        return "guest"

    guest = create_python_sequence_guest(config(), app, guest_factory=guest_factory)

    assert guest == "guest"
    assert calls == [{
        "host_url": "https://verser2.example",
        "guest_id": "runner.inst.guest",
        "app": app,
        "routed_domains": ["runner.inst.scramjet.internal"],
        "min_waiting_streams": 3,
        "tls_ca_file": "/ca.pem",
        "tls_cert_file": "/client.crt",
        "tls_key_file": "/client.key",
        "tls_key_password": "secret",
    }]


def test_create_python_sequence_guest_maps_pfx_passphrase() -> None:
    calls = []

    def guest_factory(**kwargs):
        calls.append(kwargs)
        return "guest"

    create_python_sequence_guest(
        config(tls={"caFile": "/ca.pem", "pfxFile": "/client.p12", "passphrase": "secret"}),
        object(),
        guest_factory=guest_factory,
    )

    assert calls[0]["tls_pfx_file"] == "/client.p12"
    assert calls[0]["tls_pfx_password"] == "secret"


def test_python_sequence_api_exposure_attaches_app_to_bound_guest() -> None:
    exposure = PythonSequenceApiExposure()
    first_app = object()
    second_app = object()
    guest = FakeGuest()

    assert exposure.attach(first_app) is first_app
    assert exposure.app is first_app

    exposure.bind_guest(guest)
    assert exposure.guest is guest
    assert guest.attached == [first_app]

    assert exposure.use(second_app) is second_app
    assert exposure.app is second_app
    assert guest.attached == [first_app, second_app]


@pytest.mark.asyncio
async def test_start_python_sequence_guest_connects_and_binds_exposure() -> None:
    calls = []
    exposure = PythonSequenceApiExposure()
    app = exposure.attach(object())
    guest = FakeGuest()

    def guest_factory(**kwargs):
        calls.append(kwargs)
        return guest

    started = await start_python_sequence_guest(config(), exposure, guest_factory=guest_factory)

    assert started is guest
    assert guest.connected is True
    assert exposure.guest is guest
    assert guest.attached == [app]
    assert calls[0]["app"] is app
    assert calls[0]["routed_domains"] == ["runner.inst.scramjet.internal"]


@pytest.mark.asyncio
async def test_start_python_sequence_guest_skips_without_config_or_exposure() -> None:
    exposure = PythonSequenceApiExposure()

    assert await start_python_sequence_guest(None, exposure, guest_factory=lambda **_: FakeGuest()) is None
    assert await start_python_sequence_guest(config(), None, guest_factory=lambda **_: FakeGuest()) is None
